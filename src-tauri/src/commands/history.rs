use backup_core::domain::{JobId, RunDetail, RunId, RunSummary};
use backup_core::storage::{read_log, run_log_path};
use tauri::State;

use super::app;
use super::blocking;
use crate::error::{AppError, AppResult, ShellKind, current_locale};
use crate::state::AppState;

#[tauri::command]
#[specta::specta]
pub async fn list_runs(
    state: State<'_, AppState>,
    job_id: Option<JobId>,
) -> AppResult<Vec<RunSummary>> {
    let state = state.inner().clone();
    blocking(state.locale(), move || Ok(state.history().list(job_id)?)).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_run(state: State<'_, AppState>, id: RunId) -> AppResult<RunDetail> {
    let state = state.inner().clone();
    blocking(state.locale(), move || Ok(state.history().get(id)?)).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_run_log(state: State<'_, AppState>, id: RunId) -> AppResult<Option<String>> {
    let state = state.inner().clone();
    blocking(state.locale(), move || Ok(read_log(state.data_dir(), id)?)).await
}

/// Opens `%APPDATA%\app.databackupstudio\logs\{run_id}.log` in Explorer (file selected).
#[tauri::command]
#[specta::specta]
pub async fn open_run_log(state: State<'_, AppState>, id: RunId) -> AppResult<()> {
    let state = state.inner().clone();
    blocking(state.locale(), move || {
        let path = run_log_path(state.data_dir(), id);
        if !path.is_file() {
            return Err(AppError::shell(
                ShellKind::RunLogMissing,
                current_locale(),
                None,
            ));
        }
        app::reveal_in_explorer(&path)
    })
    .await
}
