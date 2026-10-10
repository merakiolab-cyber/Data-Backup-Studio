//! Operations on the list of registered target volumes.

use std::path::Path;

use super::{ConfirmReason, LiveVolume, Resolution, marker, resolve};
use crate::domain::{RegisteredVolume, VolumeId, VolumeMarker, now_ms, validate_volume_name};
use crate::{CoreError, CoreResult};

/// Registers a mounted volume as a backup target and writes its identity marker.
///
/// A volume that already carries a marker (registered earlier or on another PC) keeps its identity.
pub fn register(
    volumes: &mut Vec<RegisteredVolume>,
    live: &LiveVolume,
    name: &str,
) -> CoreResult<RegisteredVolume> {
    let name = validate_volume_name(name)?;
    if live.is_system {
        return Err(CoreError::SystemVolume);
    }
    if let Some(existing) = live
        .marker
        .as_ref()
        .and_then(|m| volumes.iter().find(|v| v.id == m.id))
    {
        return Err(CoreError::VolumeAlreadyRegistered {
            name: existing.name.clone(),
        });
    }

    let marker = VolumeMarker {
        version: VolumeMarker::VERSION,
        id: live.marker.as_ref().map_or_else(VolumeId::new, |m| m.id),
        name: name.clone(),
        created_at_ms: live
            .marker
            .as_ref()
            .map_or_else(now_ms, |m| m.created_at_ms),
    };
    marker::write(Path::new(&live.mount_point), &marker)?;

    let registered = RegisteredVolume {
        id: marker.id,
        name,
        serial: live.serial,
        guid_path: live.guid_path.clone(),
        file_system: live.file_system.clone(),
        model: live.model.clone(),
        total_bytes: live.total_bytes,
        registered_at_ms: now_ms(),
    };
    volumes.push(registered.clone());
    Ok(registered)
}

/// Renames a registered volume; the marker is updated too when the volume is connected.
pub fn rename(
    volumes: &mut [RegisteredVolume],
    id: VolumeId,
    name: &str,
    live: &[LiveVolume],
) -> CoreResult<()> {
    let name = validate_volume_name(name)?;
    let volume = find_mut(volumes, id)?;
    volume.name = name;

    if let Resolution::Connected(mounted) = resolve(volume, live)
        && let Some(mut existing) = mounted.marker.clone()
    {
        existing.name = volume.name.clone();
        // The marker name is informational only; a failed update must not block the rename.
        let _ = marker::write(Path::new(&mounted.mount_point), &existing);
    }
    Ok(())
}

pub fn unregister(
    volumes: &mut Vec<RegisteredVolume>,
    id: VolumeId,
) -> CoreResult<RegisteredVolume> {
    let index = volumes
        .iter()
        .position(|v| v.id == id)
        .ok_or(CoreError::VolumeNotRegistered)?;
    Ok(volumes.remove(index))
}

/// Accepts the currently matched volume as the registered one: rewrites the marker and
/// refreshes the stored serial number and GUID path.
pub fn confirm(
    volumes: &mut [RegisteredVolume],
    id: VolumeId,
    live: &[LiveVolume],
) -> CoreResult<()> {
    let volume = find_mut(volumes, id)?;
    let mounted = match resolve(volume, live) {
        Resolution::Connected(_) => return Ok(()),
        Resolution::Disconnected => return Err(CoreError::VolumeNotConnected),
        Resolution::NeedsConfirmation(_, ConfirmReason::Duplicate) => {
            return Err(CoreError::AmbiguousVolume);
        }
        Resolution::NeedsConfirmation(mounted, _) => mounted,
    };

    let marker = VolumeMarker {
        version: VolumeMarker::VERSION,
        id: volume.id,
        name: volume.name.clone(),
        created_at_ms: mounted
            .marker
            .as_ref()
            .map_or_else(now_ms, |m| m.created_at_ms),
    };
    marker::write(Path::new(&mounted.mount_point), &marker)?;

    volume.serial = mounted.serial;
    volume.guid_path = mounted.guid_path.clone();
    volume.file_system = mounted.file_system.clone();
    volume.total_bytes = mounted.total_bytes;
    Ok(())
}

fn find_mut(volumes: &mut [RegisteredVolume], id: VolumeId) -> CoreResult<&mut RegisteredVolume> {
    volumes
        .iter_mut()
        .find(|v| v.id == id)
        .ok_or(CoreError::VolumeNotRegistered)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::live;

    fn mounted_at(dir: &tempfile::TempDir, serial: u32) -> LiveVolume {
        let mut volume = live("t", "", serial, None);
        volume.mount_point = dir.path().to_string_lossy().into_owned();
        volume
    }

    #[test]
    fn register_writes_marker_and_stores_volume() {
        let dir = tempfile::tempdir().unwrap();
        let volume = mounted_at(&dir, 0x1234_ABCD);
        let mut volumes = Vec::new();

        let registered = register(&mut volumes, &volume, " WD Elements ").unwrap();

        assert_eq!(registered.name, "WD Elements");
        assert_eq!(volumes.len(), 1);
        let marker = marker::read(dir.path()).unwrap().unwrap();
        assert_eq!(marker.id, registered.id);
    }

    #[test]
    fn register_adopts_existing_marker_identity() {
        let dir = tempfile::tempdir().unwrap();
        let mut volume = mounted_at(&dir, 0x1234_ABCD);
        let first = register(&mut Vec::new(), &volume, "Disk A").unwrap();
        volume.marker = marker::read(dir.path()).unwrap();

        let mut volumes = Vec::new();
        let second = register(&mut volumes, &volume, "Disk A znovu").unwrap();
        assert_eq!(second.id, first.id);
    }

    #[test]
    fn register_rejects_duplicate_and_system_volume() {
        let dir = tempfile::tempdir().unwrap();
        let mut volume = mounted_at(&dir, 0x1234_ABCD);
        let mut volumes = Vec::new();
        register(&mut volumes, &volume, "Disk A").unwrap();
        volume.marker = marker::read(dir.path()).unwrap();

        assert!(matches!(
            register(&mut volumes, &volume, "Disk B"),
            Err(CoreError::VolumeAlreadyRegistered { .. })
        ));

        let mut system = mounted_at(&dir, 1);
        system.is_system = true;
        assert!(matches!(
            register(&mut volumes, &system, "C"),
            Err(CoreError::SystemVolume)
        ));
    }

    #[test]
    fn rename_updates_config_and_marker() {
        let dir = tempfile::tempdir().unwrap();
        let mut volume = mounted_at(&dir, 0x1234_ABCD);
        let mut volumes = Vec::new();
        let registered = register(&mut volumes, &volume, "Disk A").unwrap();
        volume.marker = marker::read(dir.path()).unwrap();

        rename(
            &mut volumes,
            registered.id,
            "Fotky 2 TB",
            std::slice::from_ref(&volume),
        )
        .unwrap();

        assert_eq!(volumes[0].name, "Fotky 2 TB");
        assert_eq!(
            marker::read(dir.path()).unwrap().map(|m| m.name),
            Some("Fotky 2 TB".into())
        );
    }

    #[test]
    fn confirm_rewrites_missing_marker() {
        let dir = tempfile::tempdir().unwrap();
        let mut volume = mounted_at(&dir, 0x1234_ABCD);
        let mut volumes = Vec::new();
        let registered = register(&mut volumes, &volume, "Disk A").unwrap();
        std::fs::remove_dir_all(dir.path().join(marker::MARKER_DIR)).unwrap();
        volume.marker = None;

        confirm(&mut volumes, registered.id, std::slice::from_ref(&volume)).unwrap();

        assert_eq!(
            marker::read(dir.path()).unwrap().map(|m| m.id),
            Some(registered.id)
        );
    }

    #[test]
    fn unregister_removes_volume() {
        let dir = tempfile::tempdir().unwrap();
        let volume = mounted_at(&dir, 0x1234_ABCD);
        let mut volumes = Vec::new();
        let registered = register(&mut volumes, &volume, "Disk A").unwrap();

        unregister(&mut volumes, registered.id).unwrap();
        assert!(volumes.is_empty());
        assert!(matches!(
            unregister(&mut volumes, registered.id),
            Err(CoreError::VolumeNotRegistered)
        ));
    }
}
