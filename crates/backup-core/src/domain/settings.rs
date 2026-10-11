use serde::{Deserialize, Serialize};

use crate::{CoreError, CoreResult};

pub const MIN_COPY_PARALLELISM: u32 = 1;
pub const MAX_COPY_PARALLELISM: u32 = 8;
pub const MIN_MTIME_TOLERANCE_SECS: u32 = 0;
pub const MAX_MTIME_TOLERANCE_SECS: u32 = 10;
pub const MIN_DELETE_THRESHOLD_PERCENT: u32 = 5;
pub const MAX_DELETE_THRESHOLD_PERCENT: u32 = 80;

/// UI language stored in `config.json`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum UiLocale {
    #[default]
    Cs,
    En,
}

impl UiLocale {
    pub fn is_english(self) -> bool {
        matches!(self, Self::En)
    }
}

/// Why `AppSettings::validate` rejected a value. Translated at the UI boundary.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SettingsProblem {
    CopyParallelism,
    MtimeTolerance,
    DeleteThreshold,
}

/// User-tunable engine knobs stored in `config.json`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    /// How many files to copy at once (1 = sequential). USB HDD prefers 1–2, SSD more.
    pub copy_parallelism: u32,
    /// Size-equal files are treated as unchanged if their mtime differs by at most this many seconds.
    pub mtime_tolerance_secs: u32,
    /// Mirror asks for confirmation when it would delete more than this share of target files.
    pub delete_threshold_percent: u32,
    /// After writing `.dbs-partial`, compare source and copy with blake3 before rename.
    #[serde(default)]
    pub verify_copies: bool,
    /// Interface language. Missing value in older files becomes Czech.
    #[serde(default)]
    pub locale: UiLocale,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            copy_parallelism: 4,
            mtime_tolerance_secs: 2,
            delete_threshold_percent: 20,
            verify_copies: false,
            locale: UiLocale::Cs,
        }
    }
}

impl AppSettings {
    pub fn validate(self) -> CoreResult<Self> {
        if !(MIN_COPY_PARALLELISM..=MAX_COPY_PARALLELISM).contains(&self.copy_parallelism) {
            return Err(CoreError::InvalidSettings(SettingsProblem::CopyParallelism));
        }
        if !(MIN_MTIME_TOLERANCE_SECS..=MAX_MTIME_TOLERANCE_SECS)
            .contains(&self.mtime_tolerance_secs)
        {
            return Err(CoreError::InvalidSettings(SettingsProblem::MtimeTolerance));
        }
        if !(MIN_DELETE_THRESHOLD_PERCENT..=MAX_DELETE_THRESHOLD_PERCENT)
            .contains(&self.delete_threshold_percent)
        {
            return Err(CoreError::InvalidSettings(SettingsProblem::DeleteThreshold));
        }
        Ok(self)
    }

    pub fn delete_threshold_ratio(&self) -> f64 {
        f64::from(self.delete_threshold_percent) / 100.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_out_of_range_values() {
        assert!(
            AppSettings {
                copy_parallelism: 0,
                ..AppSettings::default()
            }
            .validate()
            .is_err()
        );
        assert!(
            AppSettings {
                delete_threshold_percent: 90,
                ..AppSettings::default()
            }
            .validate()
            .is_err()
        );
        assert!(AppSettings::default().validate().is_ok());
    }
}
