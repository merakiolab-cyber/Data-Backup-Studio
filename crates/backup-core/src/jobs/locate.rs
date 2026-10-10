//! Turns a folder picked in the system dialog into a volume + relative path.

use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;

use super::SourceRef;
use crate::domain::{Location, MAX_NAME_CHARS, VolumeId, normalize_rel_path};
use crate::storage::Config;
use crate::volumes::LiveVolume;
use crate::{CoreError, CoreResult};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct LocatedFolder {
    /// How to use the folder as a job source.
    pub source: SourceRef,
    /// Registered target volume the folder lies on, if any.
    pub target_id: Option<VolumeId>,
    pub volume_name: String,
    pub rel_path: String,
    /// Current absolute path, for display only – never stored.
    pub path: String,
}

/// Finds the mounted volume holding `path`. Symlinks and junctions are resolved first, so the
/// result always points at the real folder.
pub fn locate(path: &str, live: &[LiveVolume], config: &Config) -> CoreResult<LocatedFolder> {
    let not_found = || CoreError::FolderNotFound {
        path: PathBuf::from(path),
    };
    let canonical = fs::canonicalize(Path::new(path)).map_err(|_| not_found())?;
    if !canonical.is_dir() {
        return Err(not_found());
    }
    let canonical = canonical.to_str().ok_or_else(not_found)?;
    if canonical.starts_with(r"\\?\UNC\") {
        return Err(CoreError::FolderNotOnVolume {
            path: PathBuf::from(path),
        });
    }
    let canonical = canonical.strip_prefix(r"\\?\").unwrap_or(canonical);
    locate_path(canonical, live, config)
}

pub(super) fn locate_path(
    path: &str,
    live: &[LiveVolume],
    config: &Config,
) -> CoreResult<LocatedFolder> {
    let (volume, rest) = live
        .iter()
        .filter_map(|v| strip_mount_point(path, &v.mount_point).map(|rest| (v, rest)))
        .max_by_key(|(v, _)| v.mount_point.len())
        .ok_or_else(|| CoreError::FolderNotOnVolume {
            path: PathBuf::from(path),
        })?;
    let rel_path = normalize_rel_path(rest)?;

    let target = volume
        .marker
        .as_ref()
        .and_then(|m| config.volumes.iter().find(|v| v.id == m.id));
    let known_id = known_volume_id(config, volume);
    let volume_name = target
        .map(|t| t.name.clone())
        .or_else(|| {
            config
                .sources
                .iter()
                .find(|s| Some(s.id) == known_id)
                .map(|s| s.name.clone())
        })
        .unwrap_or_else(|| default_volume_name(volume));

    let source = match known_id {
        Some(volume_id) => SourceRef::Known {
            location: Location {
                volume_id,
                rel_path: rel_path.clone(),
            },
        },
        None => SourceRef::New {
            guid_path: volume.guid_path.clone(),
            rel_path: rel_path.clone(),
        },
    };

    Ok(LocatedFolder {
        source,
        target_id: target.map(|t| t.id),
        volume_name,
        rel_path,
        path: path.to_owned(),
    })
}

/// Registered target (by marker) or remembered source (by GUID, then unique serial) for a volume.
pub(super) fn known_volume_id(config: &Config, volume: &LiveVolume) -> Option<VolumeId> {
    if let Some(marker) = &volume.marker
        && config.volumes.iter().any(|v| v.id == marker.id)
    {
        return Some(marker.id);
    }
    if let Some(source) = config
        .sources
        .iter()
        .find(|s| s.guid_path == volume.guid_path)
    {
        return Some(source.id);
    }
    let mut by_serial = config.sources.iter().filter(|s| s.serial == volume.serial);
    match (by_serial.next(), by_serial.next()) {
        (Some(source), None) => Some(source.id),
        _ => None,
    }
}

/// Label, then model, then drive letter (`D:`).
pub(super) fn default_volume_name(volume: &LiveVolume) -> String {
    let name = [
        volume.label.trim(),
        volume.model.as_deref().unwrap_or("").trim(),
    ]
    .into_iter()
    .find(|s| !s.is_empty())
    .unwrap_or_else(|| volume.mount_point.trim_end_matches('\\'));
    name.chars().take(MAX_NAME_CHARS).collect()
}

/// Remainder of `path` below `mount_point` (`G:\` or a folder mount such as `C:\Mnt\Disk\`).
fn strip_mount_point<'a>(path: &'a str, mount_point: &str) -> Option<&'a str> {
    let mount = mount_point.trim_end_matches('\\');
    if mount.is_empty() {
        return None;
    }
    let head = path.get(..mount.len())?;
    if head.to_lowercase() != mount.to_lowercase() {
        return None;
    }
    let rest = &path[mount.len()..];
    if rest.is_empty() {
        Some(rest)
    } else {
        rest.strip_prefix('\\')
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::SourceVolume;
    use crate::test_support::{live, registered};

    #[test]
    fn longest_mount_point_wins() {
        let volumes = [
            live("c", r"C:\", 1, None),
            live("m", r"C:\Mnt\Disk\", 2, None),
        ];
        let found = locate_path(r"C:\Mnt\Disk\Fotky", &volumes, &Config::default()).unwrap();
        assert_eq!(found.rel_path, "Fotky");
        assert_eq!(
            found.source,
            SourceRef::New {
                guid_path: volumes[1].guid_path.clone(),
                rel_path: "Fotky".into()
            }
        );
        assert!(
            locate_path(r"C:\Mnt\Diskette", &volumes, &Config::default())
                .is_ok_and(|f| f.rel_path == r"Mnt\Diskette")
        );
    }

    #[test]
    fn folder_on_registered_target_is_known() {
        let id = VolumeId::new();
        let config = Config {
            volumes: vec![registered(id, 0x1234_ABCD)],
            ..Config::default()
        };
        let volumes = [live("g", r"G:\", 0x1234_ABCD, Some(id))];
        let found = locate_path(r"g:\Zaloha", &volumes, &config).unwrap();
        assert_eq!(found.target_id, Some(id));
        assert_eq!(found.volume_name, "WD Elements 2 TB");
        assert!(matches!(found.source, SourceRef::Known { .. }));
    }

    #[test]
    fn remembered_source_is_found_after_guid_change() {
        let source = SourceVolume {
            id: VolumeId::new(),
            name: "Data".into(),
            serial: 0x2222_0000,
            guid_path: "old".into(),
        };
        let config = Config {
            sources: vec![source.clone()],
            ..Config::default()
        };
        let volumes = [live("new", r"D:\", 0x2222_0000, None)];
        let found = locate_path(r"D:\", &volumes, &config).unwrap();
        assert_eq!(found.rel_path, "");
        assert_eq!(found.volume_name, "Data");
        assert_eq!(
            found.source,
            SourceRef::Known {
                location: Location {
                    volume_id: source.id,
                    rel_path: String::new()
                }
            }
        );
    }

    #[test]
    fn path_outside_volumes_is_rejected() {
        let volumes = [live("c", r"C:\", 1, None)];
        assert!(matches!(
            locate_path(r"Z:\Fotky", &volumes, &Config::default()),
            Err(CoreError::FolderNotOnVolume { .. })
        ));
    }

    #[test]
    fn locate_resolves_real_folder() {
        let dir = tempfile::tempdir().unwrap();
        let folder = dir.path().join("Dovolená Šumava");
        fs::create_dir(&folder).unwrap();
        let canonical = fs::canonicalize(dir.path()).unwrap();
        let root = canonical
            .to_str()
            .unwrap()
            .trim_start_matches(r"\\?\")
            .to_owned();
        let volumes = [live("t", &format!(r"{root}\"), 1, None)];

        let found = locate(folder.to_str().unwrap(), &volumes, &Config::default()).unwrap();
        assert_eq!(found.rel_path, "Dovolená Šumava");
        assert!(matches!(
            locate(&format!(r"{root}\missing"), &volumes, &Config::default()),
            Err(CoreError::FolderNotFound { .. })
        ));
    }
}
