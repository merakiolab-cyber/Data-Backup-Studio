use backup_core::CoreError;
use backup_core::domain::{RegisteredVolume, VolumeId};
use backup_core::jobs;
use backup_core::volumes::{self, VolumesOverview, registry};
use tauri::State;

use super::blocking;
use crate::error::AppResult;
use crate::state::AppState;

#[tauri::command]
#[specta::specta]
pub async fn list_volumes(state: State<'_, AppState>) -> AppResult<VolumesOverview> {
    let state = state.inner().clone();
    blocking(state.locale(), move || {
        let live = state.list_live()?;
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
    blocking(state.locale(), move || {
        let live = volumes::enumerate()?;
        let volume = live
            .iter()
            .find(|v| v.guid_path == guid_path)
            .ok_or(CoreError::VolumeNotConnected)?;
        let mut store = state.config()?;
        let registered = store.update(|c| registry::register(&mut c.volumes, volume, &name))?;
        state.invalidate_live();
        Ok(registered)
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
    blocking(state.locale(), move || {
        let live = volumes::enumerate()?;
        let mut store = state.config()?;
        store.update(|c| registry::rename(&mut c.volumes, id, &name, &live))?;
        state.invalidate_live();
        Ok(())
    })
    .await
}

#[tauri::command]
#[specta::specta]
pub async fn unregister_volume(state: State<'_, AppState>, id: VolumeId) -> AppResult<()> {
    let state = state.inner().clone();
    blocking(state.locale(), move || {
        let mut store = state.config()?;
        store.update(|c| jobs::unregister_volume(c, id))?;
        state.invalidate_live();
        Ok(())
    })
    .await
}

#[tauri::command]
#[specta::specta]
pub async fn confirm_volume(state: State<'_, AppState>, id: VolumeId) -> AppResult<()> {
    let state = state.inner().clone();
    blocking(state.locale(), move || {
        let live = volumes::enumerate()?;
        let mut store = state.config()?;
        store.update(|c| registry::confirm(&mut c.volumes, id, &live))?;
        state.invalidate_live();
        Ok(())
    })
    .await
}

#[tauri::command]
#[specta::specta]
pub async fn reorder_volumes(
    state: State<'_, AppState>,
    ordered_ids: Vec<VolumeId>,
) -> AppResult<()> {
    let state = state.inner().clone();
    blocking(state.locale(), move || {
        let mut store = state.config()?;
        store.update(|c| registry::reorder(&mut c.volumes, &ordered_ids))?;
        Ok(())
    })
    .await
}
