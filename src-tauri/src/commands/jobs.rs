use backup_core::domain::{Job, JobId};
use backup_core::jobs::{self, JobInput, JobView, LocatedFolder};
use backup_core::volumes;
use tauri::State;

use super::blocking;
use crate::error::AppResult;
use crate::state::AppState;

#[tauri::command]
#[specta::specta]
pub async fn list_jobs(state: State<'_, AppState>) -> AppResult<Vec<JobView>> {
    let state = state.inner().clone();
    blocking(move || {
        let live = volumes::enumerate()?;
        let store = state.config()?;
        Ok(jobs::views(store.config(), &live))
    })
    .await
}

/// `path` comes from the folder dialog; it is resolved to a volume + relative path and never stored.
#[tauri::command]
#[specta::specta]
pub async fn locate_folder(state: State<'_, AppState>, path: String) -> AppResult<LocatedFolder> {
    let state = state.inner().clone();
    blocking(move || {
        let live = volumes::enumerate()?;
        let store = state.config()?;
        Ok(jobs::locate(&path, &live, store.config())?)
    })
    .await
}

#[tauri::command]
#[specta::specta]
pub async fn create_job(state: State<'_, AppState>, input: JobInput) -> AppResult<Job> {
    let state = state.inner().clone();
    blocking(move || {
        let live = volumes::enumerate()?;
        let mut store = state.config()?;
        Ok(store.update(|c| jobs::create(c, input, &live))?)
    })
    .await
}

#[tauri::command]
#[specta::specta]
pub async fn update_job(state: State<'_, AppState>, id: JobId, input: JobInput) -> AppResult<Job> {
    let state = state.inner().clone();
    blocking(move || {
        let live = volumes::enumerate()?;
        let mut store = state.config()?;
        Ok(store.update(|c| jobs::update(c, id, input, &live))?)
    })
    .await
}

#[tauri::command]
#[specta::specta]
pub async fn delete_job(state: State<'_, AppState>, id: JobId) -> AppResult<()> {
    let state = state.inner().clone();
    blocking(move || {
        let mut store = state.config()?;
        Ok(store.update(|c| jobs::delete(c, id))?)
    })
    .await
}
