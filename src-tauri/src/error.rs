use backup_core::CoreError;
use serde::Serialize;

/// Error returned to the frontend. Messages are user-facing (Czech); details go to the log.
#[derive(Debug, thiserror::Error, Serialize, specta::Type)]
#[serde(tag = "kind", content = "message")]
pub enum AppError {
    #[error("{0}")]
    NotFound(String),
    #[error("{0}")]
    InvalidInput(String),
    #[error("{0}")]
    Conflict(String),
    #[error("{0}")]
    Io(String),
    #[error("{0}")]
    Internal(String),
}

impl From<CoreError> for AppError {
    fn from(err: CoreError) -> Self {
        eprintln!("[core] {err}");
        match err {
            CoreError::VolumeNotConnected => {
                Self::NotFound("Disk není připojený. Připoj ho a zkus to znovu.".into())
            }
            CoreError::VolumeNotRegistered => {
                Self::NotFound("Disk už není mezi registrovanými.".into())
            }
            CoreError::VolumeAlreadyRegistered { name } => {
                Self::Conflict(format!("Tento disk je už registrovaný jako „{name}“."))
            }
            CoreError::AmbiguousVolume => Self::Conflict(
                "Jsou připojené dva disky se stejnou identitou (třeba klon). Odpoj jeden z nich."
                    .into(),
            ),
            CoreError::SystemVolume => {
                Self::InvalidInput("Systémový disk nejde použít jako cíl zálohy.".into())
            }
            CoreError::InvalidName(_) => Self::InvalidInput("Název musí mít 1 až 64 znaků.".into()),
            CoreError::Io { path, source } => Self::Io(format!(
                "Nepodařilo se pracovat se souborem {}: {source}",
                path.display()
            )),
            CoreError::Json { path, .. } => {
                Self::Internal(format!("Soubor {} je poškozený.", path.display()))
            }
            CoreError::UnsupportedSchema { .. } => Self::Internal(
                "Konfigurace pochází z novější verze aplikace. Aktualizuj aplikaci.".into(),
            ),
            CoreError::Win32 { .. } => {
                Self::Internal("Windows nevrátily informace o discích.".into())
            }
        }
    }
}

pub type AppResult<T> = Result<T, AppError>;
