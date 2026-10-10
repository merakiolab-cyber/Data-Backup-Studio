//! Pure domain types. No I/O and no Win32 calls here.

mod volume;

pub use volume::{RegisteredVolume, VolumeId, VolumeMarker, validate_volume_name};

/// Current time as milliseconds since the Unix epoch.
pub fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_or(0, |d| u64::try_from(d.as_millis()).unwrap_or(u64::MAX))
}
