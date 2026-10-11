use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::validate_name;
use crate::CoreResult;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, specta::Type)]
#[serde(transparent)]
#[specta(transparent)]
pub struct JobGroupId(pub Uuid);

impl JobGroupId {
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }
}

impl Default for JobGroupId {
    fn default() -> Self {
        Self::new()
    }
}

/// Named folder of jobs on the Jobs page (e.g. the backup disk name).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct JobGroup {
    pub id: JobGroupId,
    pub name: String,
    /// Lower values appear first. Gaps are fine; UI may renumber on reorder later.
    pub sort_order: u32,
}

pub const MAX_JOB_GROUPS: usize = 64;

pub fn validate_group_name(name: &str) -> CoreResult<String> {
    validate_name(name)
}
