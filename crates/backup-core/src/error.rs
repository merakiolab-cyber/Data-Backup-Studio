use std::path::PathBuf;

/// Errors produced by the core library.
#[derive(Debug, thiserror::Error)]
pub enum CoreError {
    #[error("I/O error at {path}: {source}")]
    Io {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },

    #[error("Invalid JSON in {path}: {source}")]
    Json {
        path: PathBuf,
        #[source]
        source: serde_json::Error,
    },

    #[error("Win32 call {operation} failed: {source}")]
    Win32 {
        operation: &'static str,
        #[source]
        source: windows::core::Error,
    },

    #[error("Volume is not connected")]
    VolumeNotConnected,

    #[error("Volume is not registered")]
    VolumeNotRegistered,

    #[error("More than one connected volume carries the same identity")]
    AmbiguousVolume,

    #[error("Volume is already registered as '{name}'")]
    VolumeAlreadyRegistered { name: String },

    #[error("System volume cannot be used as a backup target")]
    SystemVolume,

    #[error("Invalid name: {0}")]
    InvalidName(&'static str),

    #[error("Unsupported config schema version {found}")]
    UnsupportedSchema { found: u32 },
}

impl CoreError {
    pub(crate) fn io(path: impl Into<PathBuf>, source: std::io::Error) -> Self {
        Self::Io {
            path: path.into(),
            source,
        }
    }

    pub(crate) fn json(path: impl Into<PathBuf>, source: serde_json::Error) -> Self {
        Self::Json {
            path: path.into(),
            source,
        }
    }
}

pub type CoreResult<T> = Result<T, CoreError>;
