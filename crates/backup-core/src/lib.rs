//! Core of Data Backup Studio: domain model, volume identity, sync engine and storage.
//!
//! This crate has no dependency on Tauri so it can be tested in isolation.

pub mod domain;
pub mod error;
pub mod jobs;
pub mod storage;
pub mod volumes;

#[cfg(test)]
mod test_support;

pub use error::{CoreError, CoreResult};

/// Version of the core library, shown in the UI.
pub const VERSION: &str = env!("CARGO_PKG_VERSION");

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn version_is_semver() {
        assert_eq!(VERSION.split('.').count(), 3);
    }
}
