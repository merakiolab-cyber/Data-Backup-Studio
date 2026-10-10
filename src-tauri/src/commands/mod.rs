pub mod app;
pub mod jobs;
pub mod volumes;

use crate::error::{AppError, AppResult};

/// Runs blocking I/O off the async runtime so the UI thread never waits on disks.
async fn blocking<T, F>(work: F) -> AppResult<T>
where
    T: Send + 'static,
    F: FnOnce() -> AppResult<T> + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(work)
        .await
        .map_err(|err| AppError::Internal(format!("Interní chyba úlohy: {err}")))?
}
