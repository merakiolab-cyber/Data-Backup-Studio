use std::path::Path;
use std::process::Command;

use backup_core::domain::Location;
use backup_core::engine;
use backup_core::volumes;
use serde::Serialize;
use tauri::{AppHandle, Manager, State};

use super::blocking;
use crate::error::{AppError, AppResult, ShellKind, current_locale};
use crate::state::AppState;

#[derive(Debug, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub version: String,
    pub core_version: String,
    /// App config dir (`%APPDATA%\app.databackupstudio\`); logs live in `logs\`.
    pub data_dir: String,
}

#[tauri::command]
#[specta::specta]
pub fn app_info(app: AppHandle) -> AppResult<AppInfo> {
    let data_dir = app
        .path()
        .app_config_dir()
        .map_err(|err| AppError::Internal(err.to_string()))?
        .display()
        .to_string();
    Ok(AppInfo {
        version: env!("CARGO_PKG_VERSION").to_owned(),
        core_version: backup_core::VERSION.to_owned(),
        data_dir,
    })
}

/// Opens a stored location in Explorer. The path is resolved on the backend (no raw path from UI).
#[tauri::command]
#[specta::specta]
pub async fn open_location(state: State<'_, AppState>, location: Location) -> AppResult<()> {
    let state = state.inner().clone();
    blocking(state.locale(), move || {
        let live = volumes::enumerate()?;
        let store = state.config()?;
        let path = engine::resolve_location(store.config(), &live, &location)?;
        if !path.exists() {
            return Err(AppError::shell(
                ShellKind::FolderMissing,
                current_locale(),
                None,
            ));
        }
        open_in_explorer(&path)
    })
    .await
}

/// Opens the app data folder (`%APPDATA%\app.databackupstudio\`) in Explorer.
#[tauri::command]
#[specta::specta]
pub async fn open_data_dir(state: State<'_, AppState>) -> AppResult<()> {
    let state = state.inner().clone();
    let dir = state.data_dir().clone();
    blocking(state.locale(), move || {
        std::fs::create_dir_all(&dir).map_err(|err| {
            AppError::shell(
                ShellKind::DataDirCreate,
                current_locale(),
                Some(&err.to_string()),
            )
        })?;
        open_in_explorer(&dir)
    })
    .await
}

pub(crate) fn open_in_explorer(path: &Path) -> AppResult<()> {
    spawn_explorer(explorer_arg(path))
}

/// Opens Explorer with `path` selected (file or folder).
pub(crate) fn reveal_in_explorer(path: &Path) -> AppResult<()> {
    spawn_explorer(format!(r"/select,{}", explorer_arg(path)))
}

fn explorer_arg(path: &Path) -> String {
    let raw = path.to_string_lossy();
    let display = raw.strip_prefix(r"\\?\").unwrap_or(raw.as_ref());
    if display.contains(' ') {
        format!(r#""{display}""#)
    } else {
        display.to_owned()
    }
}

fn spawn_explorer(arg: String) -> AppResult<()> {
    Command::new("explorer").arg(arg).spawn().map_err(|err| {
        AppError::shell(
            ShellKind::ExplorerSpawn,
            current_locale(),
            Some(&err.to_string()),
        )
    })?;
    Ok(())
}
