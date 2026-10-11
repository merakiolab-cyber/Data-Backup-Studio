use globset::Glob;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::{JobGroupId, Location, MARKER_DIR, PathProblem, normalize_rel_path, validate_name};
use crate::{CoreError, CoreResult};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, specta::Type)]
#[serde(transparent)]
#[specta(transparent)]
pub struct JobId(pub Uuid);

impl JobId {
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }
}

impl Default for JobId {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum BackupMode {
    /// Target becomes an exact copy of the source; files missing in the source are deleted.
    Mirror,
    /// Only new and changed files are copied; nothing in the target is ever deleted.
    Update,
}

/// A backup rule: which folder goes where and how.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct Job {
    pub id: JobId,
    pub name: String,
    pub source: Location,
    pub target: Location,
    pub mode: BackupMode,
    /// Glob patterns relative to the source folder, e.g. `**/node_modules/**`.
    pub excludes: Vec<String>,
    /// Optional named group on the Jobs page (e.g. backup disk name).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub group_id: Option<JobGroupId>,
    #[specta(type = specta_typescript::Number)]
    pub created_at_ms: u64,
    #[specta(type = specta_typescript::Number)]
    pub updated_at_ms: u64,
}

/// Editable part of a job after validation.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct JobSpec {
    pub name: String,
    pub source: Location,
    pub target: Location,
    pub mode: BackupMode,
    pub excludes: Vec<String>,
}

pub const MAX_EXCLUDES: usize = 64;
pub const MAX_EXCLUDE_CHARS: usize = 260;

impl JobSpec {
    /// Normalizes names, paths and patterns and checks the rules that need no other data.
    pub fn validate(self) -> CoreResult<Self> {
        let source = Location {
            rel_path: normalize_rel_path(&self.source.rel_path)?,
            ..self.source
        };
        let target = Location {
            rel_path: normalize_rel_path(&self.target.rel_path)?,
            ..self.target
        };
        // Mirroring into the volume root would delete everything else on the disk.
        let first = target.rel_path.split('\\').next().unwrap_or_default();
        if first.is_empty() {
            return Err(CoreError::InvalidPath(PathProblem::TargetIsRoot));
        }
        if first.eq_ignore_ascii_case(MARKER_DIR) {
            return Err(CoreError::InvalidPath(PathProblem::InsideAppFolder));
        }
        if source.overlaps(&target) {
            return Err(CoreError::SourceTargetOverlap);
        }
        Ok(Self {
            name: validate_name(&self.name)?,
            source,
            target,
            mode: self.mode,
            excludes: validate_excludes(self.excludes)?,
        })
    }
}

/// Trims, drops empty and duplicate patterns and checks the glob syntax.
pub fn validate_excludes(patterns: Vec<String>) -> CoreResult<Vec<String>> {
    let mut result: Vec<String> = Vec::new();
    for pattern in patterns {
        let pattern = pattern.trim();
        if pattern.is_empty() || result.iter().any(|p| p == pattern) {
            continue;
        }
        if pattern.chars().count() > MAX_EXCLUDE_CHARS
            || pattern.chars().any(char::is_control)
            || Glob::new(pattern).is_err()
        {
            return Err(CoreError::InvalidExclude {
                pattern: pattern.to_owned(),
            });
        }
        result.push(pattern.to_owned());
    }
    if result.len() > MAX_EXCLUDES {
        return Err(CoreError::TooManyExcludes);
    }
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::VolumeId;

    fn spec(source: &str, target: &str) -> JobSpec {
        let volume = VolumeId::new();
        JobSpec {
            name: " Fotky ".into(),
            source: Location {
                volume_id: volume,
                rel_path: source.into(),
            },
            target: Location {
                volume_id: VolumeId::new(),
                rel_path: target.into(),
            },
            mode: BackupMode::Mirror,
            excludes: vec![" *.tmp ".into(), String::new(), "*.tmp".into()],
        }
    }

    #[test]
    fn valid_spec_is_normalized() {
        let valid = spec("Fotky/", r"\Zaloha\Fotky").validate().unwrap();
        assert_eq!(valid.name, "Fotky");
        assert_eq!(valid.source.rel_path, "Fotky");
        assert_eq!(valid.target.rel_path, r"Zaloha\Fotky");
        assert_eq!(valid.excludes, vec!["*.tmp".to_owned()]);
    }

    #[test]
    fn target_root_and_app_folder_are_rejected() {
        assert!(matches!(
            spec("Fotky", r"\").validate(),
            Err(CoreError::InvalidPath(PathProblem::TargetIsRoot))
        ));
        assert!(matches!(
            spec("Fotky", r".DataBackupStudio\x").validate(),
            Err(CoreError::InvalidPath(PathProblem::InsideAppFolder))
        ));
    }

    #[test]
    fn overlapping_source_and_target_are_rejected() {
        let mut same_volume = spec("Data", r"Data\Zaloha");
        same_volume.target.volume_id = same_volume.source.volume_id;
        assert!(matches!(
            same_volume.validate(),
            Err(CoreError::SourceTargetOverlap)
        ));
    }

    #[test]
    fn invalid_glob_is_rejected() {
        assert!(matches!(
            validate_excludes(vec!["[abc".into()]),
            Err(CoreError::InvalidExclude { .. })
        ));
        assert!(matches!(
            validate_excludes((0..=MAX_EXCLUDES).map(|i| format!("*.{i}")).collect()),
            Err(CoreError::TooManyExcludes)
        ));
    }
}
