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
}

pub type CoreResult<T> = Result<T, CoreError>;
