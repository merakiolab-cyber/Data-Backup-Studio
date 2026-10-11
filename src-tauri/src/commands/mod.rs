pub mod app;
pub mod history;
pub mod jobs;
pub mod run;
pub mod settings;
pub mod volumes;

use backup_core::domain::UiLocale;

use crate::error::{AppError, AppResult, ShellKind, with_locale};

/// Runs blocking I/O off the async runtime so the UI thread never waits on disks.
async fn blocking<T, F>(locale: UiLocale, work: F) -> AppResult<T>
where
    T: Send + 'static,
    F: FnOnce() -> AppResult<T> + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(move || with_locale(locale, work))
        .await
        .map_err(|err| AppError::shell(ShellKind::TaskJoin, locale, Some(&err.to_string())))?
}
