//! Persistent application data stored outside the repository (in the user's app config dir).

mod config;

pub use config::{CONFIG_FILE, Config, ConfigStore};
