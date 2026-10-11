use backup_core::domain::AppSettings;
use tauri::State;

use super::blocking;
use crate::error::AppResult;
use crate::state::AppState;

#[tauri::command]
#[specta::specta]
pub async fn get_settings(state: State<'_, AppState>) -> AppResult<AppSettings> {
    let state = state.inner().clone();
    blocking(state.locale(), move || {
        Ok(state.config()?.config().settings.clone())
    })
    .await
}

#[tauri::command]
#[specta::specta]
pub async fn update_settings(
    state: State<'_, AppState>,
    settings: AppSettings,
) -> AppResult<AppSettings> {
    let state = state.inner().clone();
    blocking(state.locale(), move || {
        let settings = settings.validate()?;
        let mut store = state.config()?;
        store.update(|config| {
            config.settings = settings.clone();
            Ok(())
        })?;
        Ok(settings)
    })
    .await
}

/// `path` comes from the save dialog. The file contains jobs, disks and settings – no drive letters.
#[tauri::command]
#[specta::specta]
pub async fn export_config(state: State<'_, AppState>, path: String) -> AppResult<()> {
    let state = state.inner().clone();
    blocking(state.locale(), move || {
        Ok(state.config()?.export_to(std::path::Path::new(&path))?)
    })
    .await
}

/// `path` comes from the open dialog. Replaces jobs, disks and settings; history stays in place.
#[tauri::command]
#[specta::specta]
pub async fn import_config(state: State<'_, AppState>, path: String) -> AppResult<AppSettings> {
    let state = state.inner().clone();
    blocking(state.locale(), move || {
        let mut store = state.config()?;
        store.import_from(std::path::Path::new(&path))?;
        let settings = store.config().settings.clone();
        drop(store);
        state.invalidate_live();
        Ok(settings)
    })
    .await
}
