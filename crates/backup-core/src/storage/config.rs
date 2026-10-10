use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::domain::RegisteredVolume;
use crate::{CoreError, CoreResult};

pub const CONFIG_FILE: &str = "config.json";
const SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    pub schema_version: u32,
    #[serde(default)]
    pub volumes: Vec<RegisteredVolume>,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            schema_version: SCHEMA_VERSION,
            volumes: Vec::new(),
        }
    }
}

/// Loads and saves `config.json`. Every change is transactional: it is applied to a copy,
/// written atomically (with the previous file kept as `config.json.bak`) and only then kept in memory.
#[derive(Debug)]
pub struct ConfigStore {
    path: PathBuf,
    config: Config,
}

impl ConfigStore {
    pub fn open(dir: &Path) -> CoreResult<Self> {
        fs::create_dir_all(dir).map_err(|e| CoreError::io(dir, e))?;
        let path = dir.join(CONFIG_FILE);
        let config = match fs::read(&path) {
            Ok(bytes) => {
                let config: Config =
                    serde_json::from_slice(&bytes).map_err(|e| CoreError::json(&path, e))?;
                if config.schema_version > SCHEMA_VERSION {
                    return Err(CoreError::UnsupportedSchema {
                        found: config.schema_version,
                    });
                }
                config
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Config::default(),
            Err(e) => return Err(CoreError::io(&path, e)),
        };
        Ok(Self { path, config })
    }

    pub fn config(&self) -> &Config {
        &self.config
    }

    pub fn update<T>(
        &mut self,
        change: impl FnOnce(&mut Config) -> CoreResult<T>,
    ) -> CoreResult<T> {
        let mut next = self.config.clone();
        let result = change(&mut next)?;
        save(&self.path, &next)?;
        self.config = next;
        Ok(result)
    }
}

fn save(path: &Path, config: &Config) -> CoreResult<()> {
    let json = serde_json::to_vec_pretty(config).map_err(|e| CoreError::json(path, e))?;
    if path.exists() {
        let backup = path.with_extension("json.bak");
        fs::copy(path, &backup).map_err(|e| CoreError::io(&backup, e))?;
    }
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, json).map_err(|e| CoreError::io(&tmp, e))?;
    fs::rename(&tmp, path).map_err(|e| CoreError::io(path, e))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::VolumeId;
    use crate::test_support::registered;

    #[test]
    fn opens_empty_dir_with_defaults() {
        let dir = tempfile::tempdir().unwrap();
        let store = ConfigStore::open(dir.path()).unwrap();
        assert_eq!(store.config(), &Config::default());
    }

    #[test]
    fn update_persists_and_keeps_backup() {
        let dir = tempfile::tempdir().unwrap();
        let mut store = ConfigStore::open(dir.path()).unwrap();
        store
            .update(|c| {
                c.volumes.push(registered(VolumeId::new(), 1));
                Ok(())
            })
            .unwrap();
        store
            .update(|c| {
                c.volumes.push(registered(VolumeId::new(), 2));
                Ok(())
            })
            .unwrap();

        let reopened = ConfigStore::open(dir.path()).unwrap();
        assert_eq!(reopened.config().volumes.len(), 2);
        assert!(dir.path().join("config.json.bak").exists());
    }

    #[test]
    fn failed_update_changes_nothing() {
        let dir = tempfile::tempdir().unwrap();
        let mut store = ConfigStore::open(dir.path()).unwrap();
        let result: CoreResult<()> = store.update(|c| {
            c.volumes.push(registered(VolumeId::new(), 1));
            Err(CoreError::VolumeNotConnected)
        });
        assert!(result.is_err());
        assert!(store.config().volumes.is_empty());
        assert!(!dir.path().join(CONFIG_FILE).exists());
    }

    #[test]
    fn rejects_newer_schema() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join(CONFIG_FILE), br#"{"schemaVersion": 99}"#).unwrap();
        assert!(matches!(
            ConfigStore::open(dir.path()),
            Err(CoreError::UnsupportedSchema { found: 99 })
        ));
    }
}
