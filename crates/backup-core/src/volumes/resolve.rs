//! Pure matching of registered volumes against currently mounted ones.

use serde::Serialize;

use super::LiveVolume;
use crate::domain::{RegisteredVolume, SourceVolume};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum ConfirmReason {
    /// Marker matches but the serial number differs (disk was cloned or marker copied).
    SerialChanged,
    /// Serial matches but the marker is gone (deleted or folder cleaned up).
    MarkerMissing,
    /// More than one connected volume carries this identity.
    Duplicate,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, specta::Type)]
#[serde(tag = "state", rename_all = "camelCase")]
pub enum VolumeStatus {
    Connected,
    NeedsConfirmation { reason: ConfirmReason },
    Disconnected,
}

#[derive(Debug, PartialEq, Eq)]
pub enum Resolution<'a> {
    Connected(&'a LiveVolume),
    NeedsConfirmation(&'a LiveVolume, ConfirmReason),
    Disconnected,
}

impl<'a> Resolution<'a> {
    pub fn status(&self) -> VolumeStatus {
        match self {
            Self::Connected(_) => VolumeStatus::Connected,
            Self::NeedsConfirmation(_, reason) => {
                VolumeStatus::NeedsConfirmation { reason: *reason }
            }
            Self::Disconnected => VolumeStatus::Disconnected,
        }
    }

    pub fn live(&self) -> Option<&'a LiveVolume> {
        match self {
            Self::Connected(v) | Self::NeedsConfirmation(v, _) => Some(v),
            Self::Disconnected => None,
        }
    }
}

/// Finds the mounted volume for a registered one: marker UUID first, serial number as fallback.
pub fn resolve<'a>(registered: &RegisteredVolume, live: &'a [LiveVolume]) -> Resolution<'a> {
    let mut by_marker = live
        .iter()
        .filter(|v| v.marker.as_ref().is_some_and(|m| m.id == registered.id));

    if let Some(first) = by_marker.next() {
        if by_marker.next().is_some() {
            return Resolution::NeedsConfirmation(first, ConfirmReason::Duplicate);
        }
        return if first.serial == registered.serial {
            Resolution::Connected(first)
        } else {
            Resolution::NeedsConfirmation(first, ConfirmReason::SerialChanged)
        };
    }

    live.iter()
        .find(|v| v.marker.is_none() && v.serial == registered.serial)
        .map_or(Resolution::Disconnected, |v| {
            Resolution::NeedsConfirmation(v, ConfirmReason::MarkerMissing)
        })
}

/// Finds a source volume: GUID path first, then a serial number that matches exactly one volume.
pub fn resolve_source<'a>(source: &SourceVolume, live: &'a [LiveVolume]) -> Option<&'a LiveVolume> {
    if let Some(volume) = live.iter().find(|v| v.guid_path == source.guid_path) {
        return Some(volume);
    }
    let mut by_serial = live.iter().filter(|v| v.serial == source.serial);
    match (by_serial.next(), by_serial.next()) {
        (Some(volume), None) => Some(volume),
        _ => None,
    }
}

#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct RegisteredVolumeView {
    pub volume: RegisteredVolume,
    pub status: VolumeStatus,
    pub live: Option<LiveVolume>,
}

#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct VolumesOverview {
    pub registered: Vec<RegisteredVolumeView>,
    /// Mounted volumes not matched to any registered volume.
    pub available: Vec<LiveVolume>,
}

pub fn overview(registered: &[RegisteredVolume], live: Vec<LiveVolume>) -> VolumesOverview {
    let mut used = vec![false; live.len()];
    let views = registered
        .iter()
        .map(|volume| {
            let resolution = resolve(volume, &live);
            let matched = resolution.live().cloned();
            if let Some(m) = &matched
                && let Some(i) = live.iter().position(|v| v.guid_path == m.guid_path)
            {
                used[i] = true;
            }
            RegisteredVolumeView {
                volume: volume.clone(),
                status: resolution.status(),
                live: matched,
            }
        })
        .collect();

    let available = live
        .into_iter()
        .zip(used)
        .filter_map(|(v, used)| (!used).then_some(v))
        .collect();

    VolumesOverview {
        registered: views,
        available,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::VolumeId;
    use crate::test_support::{live, registered};

    #[test]
    fn found_by_marker_regardless_of_letter() {
        let id = VolumeId::new();
        let volumes = [
            live("a", r"C:\", 0x1111_0000, None),
            live("b", r"G:\", 0x1234_ABCD, Some(id)),
        ];
        let resolution = resolve(&registered(id, 0x1234_ABCD), &volumes);
        assert_eq!(resolution, Resolution::Connected(&volumes[1]));
    }

    #[test]
    fn disconnected_when_absent() {
        let volumes = [live("a", r"C:\", 0x1111_0000, None)];
        assert_eq!(
            resolve(&registered(VolumeId::new(), 0x1234_ABCD), &volumes),
            Resolution::Disconnected
        );
    }

    #[test]
    fn serial_change_needs_confirmation() {
        let id = VolumeId::new();
        let volumes = [live("b", r"F:\", 0x9999_9999, Some(id))];
        assert_eq!(
            resolve(&registered(id, 0x1234_ABCD), &volumes),
            Resolution::NeedsConfirmation(&volumes[0], ConfirmReason::SerialChanged)
        );
    }

    #[test]
    fn missing_marker_with_same_serial_needs_confirmation() {
        let volumes = [live("b", r"F:\", 0x1234_ABCD, None)];
        assert_eq!(
            resolve(&registered(VolumeId::new(), 0x1234_ABCD), &volumes),
            Resolution::NeedsConfirmation(&volumes[0], ConfirmReason::MarkerMissing)
        );
    }

    #[test]
    fn same_serial_with_foreign_marker_is_not_a_match() {
        let volumes = [live("b", r"F:\", 0x1234_ABCD, Some(VolumeId::new()))];
        assert_eq!(
            resolve(&registered(VolumeId::new(), 0x1234_ABCD), &volumes),
            Resolution::Disconnected
        );
    }

    #[test]
    fn two_volumes_with_same_marker_are_duplicate() {
        let id = VolumeId::new();
        let volumes = [
            live("b", r"F:\", 0x1234_ABCD, Some(id)),
            live("c", r"G:\", 0x1234_ABCD, Some(id)),
        ];
        assert_eq!(
            resolve(&registered(id, 0x1234_ABCD), &volumes),
            Resolution::NeedsConfirmation(&volumes[0], ConfirmReason::Duplicate)
        );
    }

    #[test]
    fn source_found_by_guid_then_unique_serial() {
        let source = SourceVolume {
            id: VolumeId::new(),
            name: "Data".into(),
            serial: 0x2222_0000,
            guid_path: live("d", "", 0, None).guid_path,
        };
        let by_guid = [live("d", r"E:\", 0x9999_0000, None)];
        assert_eq!(resolve_source(&source, &by_guid), Some(&by_guid[0]));

        let by_serial = [live("x", r"D:\", 0x2222_0000, None)];
        assert_eq!(resolve_source(&source, &by_serial), Some(&by_serial[0]));

        let ambiguous = [
            live("x", r"D:\", 0x2222_0000, None),
            live("y", r"F:\", 0x2222_0000, None),
        ];
        assert_eq!(resolve_source(&source, &ambiguous), None);
    }

    #[test]
    fn overview_splits_registered_and_available() {
        let id = VolumeId::new();
        let volumes = vec![
            live("a", r"C:\", 0x1111_0000, None),
            live("b", r"G:\", 0x1234_ABCD, Some(id)),
        ];
        let result = overview(&[registered(id, 0x1234_ABCD)], volumes);
        assert_eq!(result.registered.len(), 1);
        assert_eq!(result.registered[0].status, VolumeStatus::Connected);
        assert_eq!(
            result.registered[0]
                .live
                .as_ref()
                .map(|v| v.mount_point.as_str()),
            Some(r"G:\")
        );
        assert_eq!(result.available.len(), 1);
        assert_eq!(result.available[0].mount_point, r"C:\");
    }
}
