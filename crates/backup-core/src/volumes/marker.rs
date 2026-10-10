//! Identity marker stored on every registered target: `<root>\.databackupstudio\volume.json`.

use std::fs;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};

pub use crate::domain::MARKER_DIR;
use crate::domain::VolumeMarker;
use crate::{CoreError, CoreResult};

const MARKER_FILE: &str = "volume.json";

pub fn marker_path(root: &Path) -> PathBuf {
    root.join(MARKER_DIR).join(MARKER_FILE)
}

/// Returns `Ok(None)` when the volume has no marker.
pub fn read(root: &Path) -> CoreResult<Option<VolumeMarker>> {
    let path = marker_path(root);
    match fs::read(&path) {
        Ok(bytes) => serde_json::from_slice(&bytes)
            .map(Some)
            .map_err(|e| CoreError::json(&path, e)),
        Err(e) if e.kind() == ErrorKind::NotFound => Ok(None),
        Err(e) => Err(CoreError::io(&path, e)),
    }
}

/// Writes the marker atomically (temp file + rename) and hides the marker directory.
pub fn write(root: &Path, marker: &VolumeMarker) -> CoreResult<()> {
    let dir = root.join(MARKER_DIR);
    fs::create_dir_all(&dir).map_err(|e| CoreError::io(&dir, e))?;
    super::set_hidden(&dir);

    let path = marker_path(root);
    let tmp = path.with_extension("json.tmp");
    let json = serde_json::to_vec_pretty(marker).map_err(|e| CoreError::json(&path, e))?;
    fs::write(&tmp, json).map_err(|e| CoreError::io(&tmp, e))?;
    fs::rename(&tmp, &path).map_err(|e| CoreError::io(&path, e))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::VolumeId;

    fn sample() -> VolumeMarker {
        VolumeMarker {
            version: VolumeMarker::VERSION,
            id: VolumeId::new(),
            name: "WD Elements 2 TB".into(),
            created_at_ms: 1_700_000_000_000,
        }
    }

    #[test]
    fn missing_marker_is_none() {
        let dir = tempfile::tempdir().unwrap();
        assert_eq!(read(dir.path()).unwrap(), None);
    }

    #[test]
    fn write_then_read_roundtrip() {
        let dir = tempfile::tempdir().unwrap();
        let marker = sample();
        write(dir.path(), &marker).unwrap();
        assert_eq!(read(dir.path()).unwrap(), Some(marker));
        assert!(!marker_path(dir.path()).with_extension("json.tmp").exists());
    }

    #[test]
    fn overwrite_replaces_name() {
        let dir = tempfile::tempdir().unwrap();
        let mut marker = sample();
        write(dir.path(), &marker).unwrap();
        marker.name = "Záloha Fotky".into();
        write(dir.path(), &marker).unwrap();
        assert_eq!(
            read(dir.path()).unwrap().map(|m| m.name),
            Some("Záloha Fotky".into())
        );
    }

    #[test]
    fn corrupt_marker_is_error() {
        let dir = tempfile::tempdir().unwrap();
        fs::create_dir_all(dir.path().join(MARKER_DIR)).unwrap();
        fs::write(marker_path(dir.path()), b"not json").unwrap();
        assert!(matches!(read(dir.path()), Err(CoreError::Json { .. })));
    }
}
