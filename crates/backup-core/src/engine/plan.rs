use std::time::{Duration, SystemTime};

use serde::{Deserialize, Serialize};

use super::scan::TreeIndex;
use super::settings::MAX_PLAN_ACTIONS_IN_VIEW;
use crate::domain::{AppSettings, BackupMode, Job, JobId};
use crate::{CoreError, CoreResult};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum PlanActionKind {
    CreateDir,
    Copy,
    Update,
    Delete,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PlanAction {
    pub kind: PlanActionKind,
    pub rel_path: String,
    pub bytes: u64,
    pub is_dir: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct PlanActionView {
    pub kind: PlanActionKind,
    pub rel_path: String,
    #[specta(type = specta_typescript::Number)]
    pub bytes: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct PlanSummary {
    pub create_dirs: u32,
    pub copy: u32,
    pub update: u32,
    pub delete: u32,
    #[specta(type = specta_typescript::Number)]
    pub bytes_to_copy: u64,
    #[specta(type = specta_typescript::Number)]
    pub bytes_to_delete: u64,
    pub target_files: u32,
    pub source_files: u32,
}

#[derive(Debug, Clone)]
pub struct Plan {
    pub job_id: JobId,
    pub job_name: String,
    pub mode: BackupMode,
    pub actions: Vec<PlanAction>,
    pub summary: PlanSummary,
    pub requires_delete_confirmation: bool,
    pub delete_threshold_percent: u32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct PlanView {
    pub job_id: JobId,
    pub job_name: String,
    pub mode: BackupMode,
    pub summary: PlanSummary,
    pub requires_delete_confirmation: bool,
    /// Snapshot of the setting used to decide whether confirmation is required.
    pub delete_threshold_percent: u32,
    pub actions: Vec<PlanActionView>,
    pub actions_truncated: bool,
}

impl Plan {
    pub fn to_view(&self) -> PlanView {
        let truncated = self.actions.len() > MAX_PLAN_ACTIONS_IN_VIEW;
        PlanView {
            job_id: self.job_id,
            job_name: self.job_name.clone(),
            mode: self.mode,
            summary: self.summary.clone(),
            requires_delete_confirmation: self.requires_delete_confirmation,
            delete_threshold_percent: self.delete_threshold_percent,
            actions: self
                .actions
                .iter()
                .take(MAX_PLAN_ACTIONS_IN_VIEW)
                .map(|a| PlanActionView {
                    kind: a.kind,
                    rel_path: a.rel_path.clone(),
                    bytes: a.bytes,
                })
                .collect(),
            actions_truncated: truncated,
        }
    }
}

/// Builds the sync plan. Mirror never emits Delete when the source has no files (empty-source guard).
pub fn build_plan(
    job: &Job,
    source: &TreeIndex,
    target: &TreeIndex,
    settings: &AppSettings,
) -> CoreResult<Plan> {
    // Empty / unavailable source must never produce deletes (Mirror would wipe the backup).
    if source.file_count() == 0 && target.file_count() > 0 {
        return Err(CoreError::SourceEmpty);
    }

    let mut actions = Vec::new();

    for dir in source.dirs.values() {
        if !target.dirs.contains_key(&dir.rel_path) {
            actions.push(PlanAction {
                kind: PlanActionKind::CreateDir,
                rel_path: dir.rel_path.clone(),
                bytes: 0,
                is_dir: true,
            });
        }
    }

    for file in source.files.values() {
        match target.files.get(&file.rel_path) {
            None => actions.push(PlanAction {
                kind: PlanActionKind::Copy,
                rel_path: file.rel_path.clone(),
                bytes: file.size,
                is_dir: false,
            }),
            Some(existing)
                if needs_update(
                    file.size,
                    file.mtime,
                    existing.size,
                    existing.mtime,
                    settings.mtime_tolerance_secs,
                ) =>
            {
                actions.push(PlanAction {
                    kind: PlanActionKind::Update,
                    rel_path: file.rel_path.clone(),
                    bytes: file.size,
                    is_dir: false,
                });
            }
            Some(_) => {}
        }
    }

    if job.mode == BackupMode::Mirror {
        for file in target.files.values() {
            if !source.files.contains_key(&file.rel_path) {
                actions.push(PlanAction {
                    kind: PlanActionKind::Delete,
                    rel_path: file.rel_path.clone(),
                    bytes: file.size,
                    is_dir: false,
                });
            }
        }
        // Remove target dirs that are gone from the source (deepest first at execute time).
        for dir in target.dirs.values() {
            if !source.dirs.contains_key(&dir.rel_path) {
                actions.push(PlanAction {
                    kind: PlanActionKind::Delete,
                    rel_path: dir.rel_path.clone(),
                    bytes: 0,
                    is_dir: true,
                });
            }
        }
    }

    let summary = summarize(&actions, source.file_count(), target.file_count());
    // Threshold is about files only – empty dirs do not trigger the confirmation dialog.
    let requires_delete_confirmation = job.mode == BackupMode::Mirror
        && summary.target_files > 0
        && f64::from(summary.delete)
            > f64::from(summary.target_files) * settings.delete_threshold_ratio();

    Ok(Plan {
        job_id: job.id,
        job_name: job.name.clone(),
        mode: job.mode,
        actions,
        summary,
        requires_delete_confirmation,
        delete_threshold_percent: settings.delete_threshold_percent,
    })
}

fn needs_update(
    src_size: u64,
    src_mtime: SystemTime,
    dst_size: u64,
    dst_mtime: SystemTime,
    tolerance_secs: u32,
) -> bool {
    if src_size != dst_size {
        return true;
    }
    let tolerance = Duration::from_secs(u64::from(tolerance_secs));
    match src_mtime.duration_since(dst_mtime) {
        Ok(delta) => delta > tolerance,
        Err(e) => e.duration() > tolerance,
    }
}

fn summarize(actions: &[PlanAction], source_files: usize, target_files: usize) -> PlanSummary {
    let mut summary = PlanSummary {
        create_dirs: 0,
        copy: 0,
        update: 0,
        delete: 0,
        bytes_to_copy: 0,
        bytes_to_delete: 0,
        target_files: u32::try_from(target_files).unwrap_or(u32::MAX),
        source_files: u32::try_from(source_files).unwrap_or(u32::MAX),
    };
    for action in actions {
        match action.kind {
            PlanActionKind::CreateDir => summary.create_dirs += 1,
            PlanActionKind::Copy => {
                summary.copy += 1;
                summary.bytes_to_copy += action.bytes;
            }
            PlanActionKind::Update => {
                summary.update += 1;
                summary.bytes_to_copy += action.bytes;
            }
            PlanActionKind::Delete if !action.is_dir => {
                summary.delete += 1;
                summary.bytes_to_delete += action.bytes;
            }
            PlanActionKind::Delete => {}
        }
    }
    summary
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::{Location, VolumeId};
    use crate::engine::scan::{DirEntry, FileEntry};
    use std::time::UNIX_EPOCH;

    fn job(mode: BackupMode) -> Job {
        Job {
            id: JobId::new(),
            name: "Fotky".into(),
            source: Location {
                volume_id: VolumeId::new(),
                rel_path: "Fotky".into(),
            },
            target: Location {
                volume_id: VolumeId::new(),
                rel_path: r"Zaloha\Fotky".into(),
            },
            mode,
            excludes: Vec::new(),
            group_id: None,
            created_at_ms: 0,
            updated_at_ms: 0,
        }
    }

    fn file(path: &str, size: u64, secs: u64) -> FileEntry {
        FileEntry {
            rel_path: path.into(),
            size,
            mtime: UNIX_EPOCH + Duration::from_secs(secs),
        }
    }

    #[test]
    fn mirror_plans_delete_of_removed_source_file() {
        let mut source = TreeIndex::default();
        source.files.insert("a.txt".into(), file("a.txt", 10, 100));
        let mut target = TreeIndex::default();
        target.files.insert("a.txt".into(), file("a.txt", 10, 100));
        target
            .files
            .insert("old.txt".into(), file("old.txt", 5, 50));

        let plan = build_plan(
            &job(BackupMode::Mirror),
            &source,
            &target,
            &AppSettings::default(),
        )
        .unwrap();
        assert_eq!(plan.summary.delete, 1);
        assert!(
            plan.actions
                .iter()
                .any(|a| a.kind == PlanActionKind::Delete && a.rel_path == "old.txt")
        );
    }

    #[test]
    fn update_mode_never_deletes() {
        let mut source = TreeIndex::default();
        source.files.insert("a.txt".into(), file("a.txt", 10, 100));
        let mut target = TreeIndex::default();
        target
            .files
            .insert("old.txt".into(), file("old.txt", 5, 50));

        let plan = build_plan(
            &job(BackupMode::Update),
            &source,
            &target,
            &AppSettings::default(),
        )
        .unwrap();
        assert_eq!(plan.summary.delete, 0);
        assert_eq!(plan.summary.copy, 1);
    }

    #[test]
    fn empty_source_with_target_files_is_refused() {
        let source = TreeIndex::default();
        let mut target = TreeIndex::default();
        target.files.insert("a.txt".into(), file("a.txt", 1, 1));
        assert!(matches!(
            build_plan(
                &job(BackupMode::Mirror),
                &source,
                &target,
                &AppSettings::default(),
            ),
            Err(CoreError::SourceEmpty)
        ));
    }

    #[test]
    fn matching_existing_files_are_skipped() {
        let mut source = TreeIndex::default();
        source
            .files
            .insert("keep.txt".into(), file("keep.txt", 10, 100));
        source
            .files
            .insert("new.txt".into(), file("new.txt", 4, 110));
        source
            .files
            .insert("changed.txt".into(), file("changed.txt", 8, 200));
        let mut target = TreeIndex::default();
        target
            .files
            .insert("keep.txt".into(), file("keep.txt", 10, 100));
        target
            .files
            .insert("changed.txt".into(), file("changed.txt", 8, 50));
        target
            .files
            .insert("gone.txt".into(), file("gone.txt", 2, 10));

        let plan = build_plan(
            &job(BackupMode::Mirror),
            &source,
            &target,
            &AppSettings::default(),
        )
        .unwrap();
        assert_eq!(plan.summary.copy, 1);
        assert_eq!(plan.summary.update, 1);
        assert_eq!(plan.summary.delete, 1);
        assert_eq!(plan.summary.source_files, 3);
        assert!(plan.actions.iter().all(|a| a.rel_path != "keep.txt"));
    }

    #[test]
    fn create_dir_when_missing_on_target() {
        let mut source = TreeIndex::default();
        source.dirs.insert(
            "Album".into(),
            DirEntry {
                rel_path: "Album".into(),
            },
        );
        source
            .files
            .insert(r"Album\x.jpg".into(), file(r"Album\x.jpg", 3, 10));
        let target = TreeIndex::default();
        let plan = build_plan(
            &job(BackupMode::Mirror),
            &source,
            &target,
            &AppSettings::default(),
        )
        .unwrap();
        assert_eq!(plan.summary.create_dirs, 1);
        assert_eq!(plan.summary.copy, 1);
    }
}
