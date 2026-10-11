use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::{BackupMode, JobId};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, specta::Type)]
#[serde(transparent)]
#[specta(transparent)]
pub struct RunId(pub Uuid);

impl RunId {
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }
}

impl Default for RunId {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum RunStatus {
    Done,
    Cancelled,
    Failed,
}

/// One finished (or failed / cancelled) backup run as shown in the history list.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct RunSummary {
    pub id: RunId,
    pub job_id: JobId,
    /// Name at the time of the run – the job may have been renamed or deleted since.
    pub job_name: String,
    pub mode: BackupMode,
    pub status: RunStatus,
    #[specta(type = specta_typescript::Number)]
    pub started_at_ms: u64,
    #[specta(type = specta_typescript::Number)]
    pub finished_at_ms: u64,
    pub copied: u32,
    pub updated: u32,
    pub deleted: u32,
    pub dirs_created: u32,
    #[specta(type = specta_typescript::Number)]
    pub bytes_copied: u64,
    pub error_count: u32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct RunDetail {
    pub run: RunSummary,
    pub errors: Vec<String>,
}
