use backup_core::CoreError;
use backup_core::domain::{RegisteredVolume, VolumeId};
use backup_core::volumes::{self, VolumesOverview, registry};
use tauri::State;

use super::blocking;
use crate::error::AppResult;
use crate::state::AppState;

#[tauri::command]
#[specta::specta]
pub async fn list_volumes(state: State<'_, AppState>) -> AppResult<VolumesOverview> {
    let state = state.inner().clone();
    blocking(move || {
        let live = volumes::enumerate()?;
        let store = state.config()?;
        Ok(volumes::overview(&store.config().volumes, live))
    })
    .await
}

/// `guid_path` identifies the volume; it is looked up in a fresh enumeration, never trusted as a path.
#[tauri::command]
#[specta::specta]
pub async fn register_volume(
    state: State<'_, AppState>,
    guid_path: String,
    name: String,
) -> AppResult<RegisteredVolume> {
    let state = state.inner().clone();
    blocking(move || {
        let live = volumes::enumerate()?;
        let volume = live
            .iter()
            .find(|v| v.guid_path == guid_path)
            .ok_or(CoreError::VolumeNotConnected)?;
        let mut store = state.config()?;
        Ok(store.update(|c| registry::register(&mut c.volumes, volume, &name))?)
    })
    .await
}

#[tauri::command]
#[specta::specta]
pub async fn rename_volume(
    state: State<'_, AppState>,
    id: VolumeId,
    name: String,
) -> AppResult<()> {
    let state = state.inner().clone();
    blocking(move || {
        let live = volumes::enumerate()?;
        let mut store = state.config()?;
        Ok(store.update(|c| registry::rename(&mut c.volumes, id, &name, &live))?)
    })
    .await
}

#[tauri::command]
#[specta::specta]
pub async fn unregister_volume(state: State<'_, AppState>, id: VolumeId) -> AppResult<()> {
    let state = state.inner().clone();
    blocking(move || {
        let mut store = state.config()?;
        store.update(|c| registry::unregister(&mut c.volumes, id).map(drop))?;
        Ok(())
    })
    .await
}

#[tauri::command]
#[specta::specta]
pub async fn confirm_volume(state: State<'_, AppState>, id: VolumeId) -> AppResult<()> {
    let state = state.inner().clone();
    blocking(move || {
        let live = volumes::enumerate()?;
        let mut store = state.config()?;
        Ok(store.update(|c| registry::confirm(&mut c.volumes, id, &live))?)
    })
    .await
}
