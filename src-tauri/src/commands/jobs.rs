use backup_core::domain::{Job, JobGroup, JobGroupId, JobId};
use backup_core::jobs::{self, JobInput, JobsOverview, LocatedFolder};
use backup_core::volumes;
use tauri::State;

use super::blocking;
use crate::error::AppResult;
use crate::state::AppState;

#[tauri::command]
#[specta::specta]
pub async fn list_jobs(state: State<'_, AppState>) -> AppResult<JobsOverview> {
    let state = state.inner().clone();
    blocking(state.locale(), move || {
        let live = state.list_live()?;
        let store = state.config()?;
        Ok(jobs::overview(store.config(), &live))
    })
    .await
}

/// `path` comes from the folder dialog; it is resolved to a volume + relative path and never stored.
#[tauri::command]
#[specta::specta]
pub async fn locate_folder(state: State<'_, AppState>, path: String) -> AppResult<LocatedFolder> {
    let state = state.inner().clone();
    blocking(state.locale(), move || {
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
    blocking(state.locale(), move || {
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
    blocking(state.locale(), move || {
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
    blocking(state.locale(), move || {
        let mut store = state.config()?;
        Ok(store.update(|c| jobs::delete(c, id))?)
    })
    .await
}

#[tauri::command]
#[specta::specta]
pub async fn create_job_group(
    state: State<'_, AppState>,
    name: String,
    job_ids: Vec<JobId>,
) -> AppResult<JobGroup> {
    let state = state.inner().clone();
    blocking(state.locale(), move || {
        let mut store = state.config()?;
        Ok(store.update(|c| jobs::create_group(c, name, &job_ids))?)
    })
    .await
}

#[tauri::command]
#[specta::specta]
pub async fn rename_job_group(
    state: State<'_, AppState>,
    id: JobGroupId,
    name: String,
) -> AppResult<JobGroup> {
    let state = state.inner().clone();
    blocking(state.locale(), move || {
        let mut store = state.config()?;
        Ok(store.update(|c| jobs::rename_group(c, id, name))?)
    })
    .await
}

#[tauri::command]
#[specta::specta]
pub async fn delete_job_group(state: State<'_, AppState>, id: JobGroupId) -> AppResult<()> {
    let state = state.inner().clone();
    blocking(state.locale(), move || {
        let mut store = state.config()?;
        Ok(store.update(|c| jobs::delete_group(c, id))?)
    })
    .await
}

#[tauri::command]
#[specta::specta]
pub async fn set_jobs_group(
    state: State<'_, AppState>,
    job_ids: Vec<JobId>,
    group_id: Option<JobGroupId>,
) -> AppResult<()> {
    let state = state.inner().clone();
    blocking(state.locale(), move || {
        let mut store = state.config()?;
        Ok(store.update(|c| jobs::set_jobs_group(c, &job_ids, group_id))?)
    })
    .await
}
