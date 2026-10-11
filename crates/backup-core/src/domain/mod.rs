//! Pure domain types. No I/O and no Win32 calls here.

mod group;
mod job;
mod location;
mod run;
mod settings;
mod volume;

pub use group::{JobGroup, JobGroupId, MAX_JOB_GROUPS, validate_group_name};
pub use job::{BackupMode, Job, JobId, JobSpec, MAX_EXCLUDES, validate_excludes};
pub use location::{Location, PathProblem, normalize_rel_path, rel_path_contains};
pub use run::{RunDetail, RunId, RunStatus, RunSummary};
pub use settings::{
    AppSettings, MAX_COPY_PARALLELISM, MAX_DELETE_THRESHOLD_PERCENT, MAX_MTIME_TOLERANCE_SECS,
    MIN_COPY_PARALLELISM, MIN_DELETE_THRESHOLD_PERCENT, MIN_MTIME_TOLERANCE_SECS, SettingsProblem,
    UiLocale,
};
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
