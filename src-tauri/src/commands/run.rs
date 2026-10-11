use backup_core::CoreError;
use backup_core::domain::{JobId, RunId, now_ms};
use backup_core::engine::{self, PlanView, RunProgress, RunResult};
use backup_core::storage::{KEEP_LOGS, RunLog, prune_logs};
use backup_core::volumes;
use serde::Serialize;
use std::sync::Mutex;
use tauri::{AppHandle, State};
use tauri_specta::Event;

use super::blocking;
use crate::error::{AppError, AppResult};
use crate::state::AppState;

/// Progress of the active backup run; emitted up to ~10 times per second.
#[derive(Debug, Clone, Serialize, specta::Type, Event)]
#[serde(rename_all = "camelCase")]
pub struct RunProgressEvent {
    pub progress: RunProgress,
}

#[tauri::command]
#[specta::specta]
pub async fn preview_job(state: State<'_, AppState>, id: JobId) -> AppResult<PlanView> {
    let state = state.inner().clone();
    blocking(state.locale(), move || {
        let live = volumes::enumerate()?;
        let config = state.config()?.config().clone();
        Ok(engine::plan_job(&config, &live, id)?)
    })
    .await
}

#[tauri::command]
#[specta::specta]
pub async fn run_job(
    app: AppHandle,
    state: State<'_, AppState>,
    id: JobId,
    confirm_delete_over_threshold: bool,
) -> AppResult<RunResult> {
    let state = state.inner().clone();
    let cancel = state.begin_run()?;
    let worker = state.clone();
    let result = blocking(state.locale(), move || {
        let live = volumes::enumerate()?;
        let config = worker.config()?.config().clone();
        let job = config.jobs.iter().find(|job| job.id == id).cloned();
        let started_at_ms = now_ms();
        let run_id = RunId::new();
        let data_dir = worker.data_dir().clone();
        let log = Mutex::new(
            job.as_ref()
                .and_then(|job| RunLog::create(&data_dir, run_id, job).ok()),
        );
        match engine::run_job(
            &config,
            &live,
            id,
            confirm_delete_over_threshold,
            &cancel,
            |progress| {
                let _ = RunProgressEvent { progress }.emit(&app);
            },
            |line| {
                if let Ok(mut guard) = log.lock()
                    && let Some(file) = guard.as_mut()
                {
                    file.line(line);
                }
            },
        ) {
            Ok(outcome) => {
                if let Ok(mut guard) = log.lock()
                    && let Some(file) = guard.as_mut()
                {
                    file.finish(&outcome);
                }
                if let Some(job) = &job
                    && let Err(err) =
                        worker
                            .history()
                            .record_result(run_id, job, started_at_ms, &outcome)
                {
                    eprintln!("[history] {err}");
                }
                if let Err(err) = prune_logs(&data_dir, KEEP_LOGS) {
                    eprintln!("[history] {err}");
                }
                Ok(outcome)
            }
            Err(err) => {
                let skip = matches!(err, CoreError::JobNotFound);
                let app_err = AppError::from(err);
                if let Ok(mut guard) = log.lock()
                    && let Some(file) = guard.as_mut()
                {
                    file.fail(&app_err.to_string());
                }
                if !skip
                    && let Some(job) = &job
                    && let Err(hist) = worker.history().record_failure(
                        run_id,
                        job,
                        started_at_ms,
                        app_err.to_string(),
                    )
                {
                    eprintln!("[history] {hist}");
                }
                if let Err(err) = prune_logs(&data_dir, KEEP_LOGS) {
                    eprintln!("[history] {err}");
                }
                Err(app_err)
            }
        }
    })
    .await;
    state.end_run();
    result
}

#[tauri::command]
#[specta::specta]
pub async fn cancel_run(state: State<'_, AppState>) -> AppResult<()> {
    state.request_cancel();
    Ok(())
}
