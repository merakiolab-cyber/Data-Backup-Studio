//! Sync engine: preflight → scan → plan → execute (Mirror = exact imprint of the source).

mod execute;
mod pathutil;
mod plan;
mod preflight;
mod scan;
mod settings;

use std::sync::atomic::AtomicBool;

use plan::Plan;

pub use execute::{RunPhase, RunProgress, RunResult};
pub use plan::{PlanActionKind, PlanActionView, PlanSummary, PlanView};
pub use preflight::resolve_location;

use crate::domain::JobId;
use crate::storage::Config;
use crate::volumes::LiveVolume;
use crate::{CoreError, CoreResult};

/// Builds a dry-run plan for the job without writing anything.
pub fn plan_job(config: &Config, live: &[LiveVolume], job_id: JobId) -> CoreResult<PlanView> {
    Ok(build_plan(config, live, job_id)?.to_view())
}

/// Runs the job. When the plan needs a delete-threshold confirmation, pass `confirm_delete_over_threshold`.
pub fn run_job(
    config: &Config,
    live: &[LiveVolume],
    job_id: JobId,
    confirm_delete_over_threshold: bool,
    cancel: &AtomicBool,
    on_progress: impl Fn(RunProgress) + Send + Sync,
    on_log: impl Fn(&str) + Send + Sync,
) -> CoreResult<RunResult> {
    let plan = build_plan(config, live, job_id)?;
    if plan.requires_delete_confirmation && !confirm_delete_over_threshold {
        return Err(CoreError::DeleteThresholdExceeded);
    }
    if plan.summary.bytes_to_copy > 0 {
        let resolved = preflight::resolve_job(
            config,
            live,
            config
                .jobs
                .iter()
                .find(|j| j.id == job_id)
                .ok_or(CoreError::JobNotFound)?,
        )?;
        if resolved.target_free_bytes < plan.summary.bytes_to_copy {
            return Err(CoreError::InsufficientSpace);
        }
    }

    let job = config
        .jobs
        .iter()
        .find(|j| j.id == job_id)
        .ok_or(CoreError::JobNotFound)?;
    let resolved = preflight::resolve_job(config, live, job)?;
    execute::execute_plan(
        &resolved.source_root,
        &resolved.target_root,
        &plan,
        cancel,
        on_progress,
        on_log,
        execute::ExecuteOptions {
            workers: config.settings.copy_parallelism,
            verify_copies: config.settings.verify_copies,
        },
    )
}

fn build_plan(config: &Config, live: &[LiveVolume], job_id: JobId) -> CoreResult<Plan> {
    let job = config
        .jobs
        .iter()
        .find(|j| j.id == job_id)
        .ok_or(CoreError::JobNotFound)?;
    let resolved = preflight::resolve_job(config, live, job)?;
    let source = scan::scan_tree(&resolved.source_root, &job.excludes).map_err(|err| {
        if matches!(err, CoreError::FolderNotFound { .. }) {
            CoreError::SourceUnavailable
        } else {
            err
        }
    })?;
    // Target may not exist yet (first full Mirror copy) – treat as empty tree.
    let target = if resolved.target_root.exists() {
        scan::scan_tree(&resolved.target_root, &[])?
    } else {
        scan::TreeIndex::default()
    };
    plan::build_plan(job, &source, &target, &config.settings)
}
