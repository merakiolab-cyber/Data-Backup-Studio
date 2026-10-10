use serde::Serialize;

/// Error returned to the frontend. Messages are user-facing (Czech); details go to the log.
#[derive(Debug, thiserror::Error, Serialize, specta::Type)]
#[serde(tag = "kind", content = "message")]
pub enum AppError {
    #[error("{0}")]
    Internal(String),
}

impl From<backup_core::CoreError> for AppError {
    fn from(err: backup_core::CoreError) -> Self {
        Self::Internal(err.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
