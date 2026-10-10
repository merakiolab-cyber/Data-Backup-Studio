use serde::Serialize;

use crate::error::AppResult;

#[derive(Debug, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub version: String,
    pub core_version: String,
}

#[tauri::command]
#[specta::specta]
pub fn app_info() -> AppResult<AppInfo> {
    Ok(AppInfo {
        version: env!("CARGO_PKG_VERSION").to_owned(),
        core_version: backup_core::VERSION.to_owned(),
    })
}
