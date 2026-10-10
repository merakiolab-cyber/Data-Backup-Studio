use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{CoreError, CoreResult};

/// Stable identity of a registered volume, independent of its drive letter.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, specta::Type)]
#[serde(transparent)]
#[specta(transparent)]
pub struct VolumeId(pub Uuid);

impl VolumeId {
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }
}

impl Default for VolumeId {
    fn default() -> Self {
        Self::new()
    }
}

/// A backup target volume remembered by the application.
///
/// Byte counts and timestamps are exported to TypeScript as `number`; they stay far below 2^53
/// (9 PB / year 287 396), so the precision loss specta warns about cannot happen.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct RegisteredVolume {
    pub id: VolumeId,
    pub name: String,
    /// Volume serial number at registration time (changes only when reformatted).
    pub serial: u32,
    /// `\\?\Volume{GUID}\` path, stable on this PC.
    pub guid_path: String,
    pub file_system: String,
    pub model: Option<String>,
    #[specta(type = specta_typescript::Number)]
    pub total_bytes: u64,
    #[specta(type = specta_typescript::Number)]
    pub registered_at_ms: u64,
}

/// Content of `<root>\.databackupstudio\volume.json` written to every registered target.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct VolumeMarker {
    pub version: u32,
    pub id: VolumeId,
    pub name: String,
    #[specta(type = specta_typescript::Number)]
    pub created_at_ms: u64,
}

impl VolumeMarker {
    pub const VERSION: u32 = 1;
}

pub const MAX_NAME_CHARS: usize = 64;

/// Trims the name and checks it is 1–64 characters without control characters.
pub fn validate_volume_name(name: &str) -> CoreResult<String> {
    let name = name.trim();
    if name.is_empty() {
        return Err(CoreError::InvalidName("name is empty"));
    }
    if name.chars().count() > MAX_NAME_CHARS {
        return Err(CoreError::InvalidName("name is too long"));
    }
    if name.chars().any(char::is_control) {
        return Err(CoreError::InvalidName("name contains control characters"));
    }
    Ok(name.to_owned())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn name_is_trimmed() {
        assert_eq!(
            validate_volume_name("  WD Elements 2 TB ").ok(),
            Some("WD Elements 2 TB".into())
        );
    }

    #[test]
    fn rejects_invalid_names() {
        assert!(validate_volume_name("   ").is_err());
        assert!(validate_volume_name(&"x".repeat(MAX_NAME_CHARS + 1)).is_err());
        assert!(validate_volume_name("bad\nname").is_err());
    }

    #[test]
    fn accepts_diacritics_up_to_limit() {
        assert!(validate_volume_name(&"č".repeat(MAX_NAME_CHARS)).is_ok());
    }
}
