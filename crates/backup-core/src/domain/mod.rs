//! Pure domain types. No I/O and no Win32 calls here.

mod job;
mod location;
mod volume;

pub use job::{BackupMode, Job, JobId, JobSpec, MAX_EXCLUDES, validate_excludes};
pub use location::{Location, PathProblem, normalize_rel_path, rel_path_contains};
pub use volume::{
    MARKER_DIR, MAX_NAME_CHARS, RegisteredVolume, SourceVolume, VolumeId, VolumeMarker,
    validate_name,
};

/// Current time as milliseconds since the Unix epoch.
pub fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_or(0, |d| u64::try_from(d.as_millis()).unwrap_or(u64::MAX))
}
