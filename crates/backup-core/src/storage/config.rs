use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::domain::{
    AppSettings, Job, JobGroup, JobSpec, RegisteredVolume, SourceVolume, validate_group_name,
    validate_name,
};
use crate::{CoreError, CoreResult};

pub const CONFIG_FILE: &str = "config.json";
/// v4 added `groups` and optional `job.groupId`. Older builds refuse a newer file.
const SCHEMA_VERSION: u32 = 4;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    pub schema_version: u32,
    /// Registered backup targets.
    #[serde(default)]
    pub volumes: Vec<RegisteredVolume>,
    /// Volumes remembered because a job reads from them.
    #[serde(default)]
    pub sources: Vec<SourceVolume>,
    /// Named folders of jobs on the Jobs page.
    #[serde(default)]
    pub groups: Vec<JobGroup>,
    #[serde(default)]
    pub jobs: Vec<Job>,
    #[serde(default)]
    pub settings: AppSettings,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            schema_version: SCHEMA_VERSION,
            volumes: Vec::new(),
            sources: Vec::new(),
            groups: Vec::new(),
            jobs: Vec::new(),
            settings: AppSettings::default(),
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
            Ok(_) => read_config(&path)?,
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

    /// Writes the current config (no drive letters) to a user-chosen path.
    pub fn export_to(&self, path: &Path) -> CoreResult<()> {
        let json = serde_json::to_vec_pretty(&self.config).map_err(|e| CoreError::json(path, e))?;
        fs::write(path, json).map_err(|e| CoreError::io(path, e))
    }

    /// Replaces the in-app config with a previously exported file. History and logs stay put.
    pub fn import_from(&mut self, path: &Path) -> CoreResult<()> {
        let mut imported = read_config(path)?;
        sanitize_imported(&mut imported)?;
        save(&self.path, &imported)?;
        self.config = imported;
        Ok(())
    }
}

/// Same safety rules as creating a job in the editor. A crafted export cannot install
/// a Mirror target at the disk root or overlapping folders.
fn sanitize_imported(config: &mut Config) -> CoreResult<()> {
    config.settings = config.settings.clone().validate()?;
    for volume in &config.volumes {
        validate_name(&volume.name)?;
    }
    let groups = std::mem::take(&mut config.groups);
    for group in groups {
        let name = validate_group_name(&group.name)?;
        if config.groups.iter().any(|existing| existing.id == group.id) {
            continue;
        }
        config.groups.push(JobGroup {
            id: group.id,
            name,
            sort_order: group.sort_order,
        });
    }
    if config.groups.len() > crate::domain::MAX_JOB_GROUPS {
        return Err(CoreError::TooManyGroups);
    }
    let jobs = std::mem::take(&mut config.jobs);
    for job in jobs {
        let group_id = job
            .group_id
            .filter(|id| config.groups.iter().any(|g| g.id == *id));
        let spec = JobSpec {
            name: job.name,
            source: job.source,
            target: job.target,
            mode: job.mode,
            excludes: job.excludes,
        }
        .validate()?;
        if !config
            .volumes
            .iter()
            .any(|volume| volume.id == spec.target.volume_id)
        {
            return Err(CoreError::VolumeNotRegistered);
        }
        let source_known = config
            .volumes
            .iter()
            .any(|volume| volume.id == spec.source.volume_id)
            || config
                .sources
                .iter()
                .any(|volume| volume.id == spec.source.volume_id);
        if !source_known {
            return Err(CoreError::VolumeNotRegistered);
        }
        if let Some(other) = config
            .jobs
            .iter()
            .find(|existing| existing.target.overlaps(&spec.target))
        {
            return Err(CoreError::TargetInUse {
                name: other.name.clone(),
            });
        }
        config.jobs.push(Job {
            id: job.id,
            name: spec.name,
            source: spec.source,
            target: spec.target,
            mode: spec.mode,
            excludes: spec.excludes,
            group_id,
            created_at_ms: job.created_at_ms,
            updated_at_ms: job.updated_at_ms,
        });
    }
    config.sources.retain(|source| {
        config
            .jobs
            .iter()
            .any(|job| job.source.volume_id == source.id)
    });
    Ok(())
}

fn read_config(path: &Path) -> CoreResult<Config> {
    let bytes = fs::read(path).map_err(|e| CoreError::io(path, e))?;
    let mut config: Config =
        serde_json::from_slice(&bytes).map_err(|e| CoreError::json(path, e))?;
    if config.schema_version > SCHEMA_VERSION {
        return Err(CoreError::UnsupportedSchema {
            found: config.schema_version,
        });
    }
    config.schema_version = SCHEMA_VERSION;
    Ok(config)
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
    use crate::domain::{AppSettings, BackupMode, Job, JobId, Location, VolumeId};
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
    fn migrates_v1_without_jobs() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(
            dir.path().join(CONFIG_FILE),
            br#"{"schemaVersion": 1, "volumes": []}"#,
        )
        .unwrap();
        let store = ConfigStore::open(dir.path()).unwrap();
        assert_eq!(store.config(), &Config::default());
        assert_eq!(store.config().settings, AppSettings::default());
    }

    #[test]
    fn export_and_import_roundtrip() {
        let dir = tempfile::tempdir().unwrap();
        let mut store = ConfigStore::open(dir.path()).unwrap();
        store
            .update(|c| {
                c.settings.copy_parallelism = 2;
                c.settings.delete_threshold_percent = 30;
                Ok(())
            })
            .unwrap();
        let exported = dir.path().join("export.json");
        store.export_to(&exported).unwrap();

        let other_dir = tempfile::tempdir().unwrap();
        let mut other = ConfigStore::open(other_dir.path()).unwrap();
        other.import_from(&exported).unwrap();
        assert_eq!(other.config().settings.copy_parallelism, 2);
        assert_eq!(other.config().settings.delete_threshold_percent, 30);
    }

    #[test]
    fn import_rejects_mirror_into_volume_root() {
        let dir = tempfile::tempdir().unwrap();
        let target = VolumeId::new();
        let mut store = ConfigStore::open(dir.path()).unwrap();
        store
            .update(|config| {
                config.volumes.push(registered(target, 1));
                Ok(())
            })
            .unwrap();

        let crafted = dir.path().join("crafted.json");
        let mut bad = store.config().clone();
        bad.jobs.push(Job {
            id: JobId::new(),
            name: "Špatně".into(),
            source: Location {
                volume_id: target,
                rel_path: "Fotky".into(),
            },
            target: Location {
                volume_id: target,
                rel_path: String::new(),
            },
            mode: BackupMode::Mirror,
            excludes: Vec::new(),
            group_id: None,
            created_at_ms: 0,
            updated_at_ms: 0,
        });
        fs::write(&crafted, serde_json::to_vec(&bad).unwrap()).unwrap();

        let other_dir = tempfile::tempdir().unwrap();
        let mut other = ConfigStore::open(other_dir.path()).unwrap();
        assert!(other.import_from(&crafted).is_err());
        assert!(other.config().jobs.is_empty());
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
