//! Backup jobs stored in the config: create, edit, delete and the view shown in the UI.

mod locate;

use serde::{Deserialize, Serialize};

pub use locate::{LocatedFolder, locate};

use crate::domain::{
    BackupMode, Job, JobId, JobSpec, Location, SourceVolume, VolumeId, now_ms, validate_name,
};
use crate::storage::Config;
use crate::volumes::{LiveVolume, VolumeStatus, registry, resolve, resolve_source};
use crate::{CoreError, CoreResult};

/// How the editor refers to the source folder.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum SourceRef {
    /// Folder on a volume the app already knows (registered target or remembered source).
    #[serde(rename_all = "camelCase")]
    Known { location: Location },
    /// Folder on a mounted volume seen for the first time; it is remembered when the job is saved.
    #[serde(rename_all = "camelCase")]
    New { guid_path: String, rel_path: String },
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct JobInput {
    pub name: String,
    pub source: SourceRef,
    pub target: Location,
    pub mode: BackupMode,
    pub excludes: Vec<String>,
}

/// One side of a job as shown in the UI.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct EndpointView {
    pub volume_name: String,
    pub status: VolumeStatus,
    /// Current full path such as `G:\Zaloha\Fotky`, only while the volume is connected.
    pub path: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct JobView {
    pub job: Job,
    pub source: EndpointView,
    pub target: EndpointView,
}

pub fn create(config: &mut Config, input: JobInput, live: &[LiveVolume]) -> CoreResult<Job> {
    let spec = prepare(config, input, live, None)?;
    let now = now_ms();
    let job = Job {
        id: JobId::new(),
        name: spec.name,
        source: spec.source,
        target: spec.target,
        mode: spec.mode,
        excludes: spec.excludes,
        created_at_ms: now,
        updated_at_ms: now,
    };
    config.jobs.push(job.clone());
    Ok(job)
}

pub fn update(
    config: &mut Config,
    id: JobId,
    input: JobInput,
    live: &[LiveVolume],
) -> CoreResult<Job> {
    let spec = prepare(config, input, live, Some(id))?;
    let job = config
        .jobs
        .iter_mut()
        .find(|j| j.id == id)
        .ok_or(CoreError::JobNotFound)?;
    job.name = spec.name;
    job.source = spec.source;
    job.target = spec.target;
    job.mode = spec.mode;
    job.excludes = spec.excludes;
    job.updated_at_ms = now_ms();
    let job = job.clone();
    forget_unused_sources(config);
    Ok(job)
}

pub fn delete(config: &mut Config, id: JobId) -> CoreResult<()> {
    let index = config
        .jobs
        .iter()
        .position(|j| j.id == id)
        .ok_or(CoreError::JobNotFound)?;
    config.jobs.remove(index);
    forget_unused_sources(config);
    Ok(())
}

/// Removes a registered target unless a job still reads from or writes to it.
pub fn unregister_volume(config: &mut Config, id: VolumeId) -> CoreResult<()> {
    let jobs = config
        .jobs
        .iter()
        .filter(|j| j.source.volume_id == id || j.target.volume_id == id)
        .count();
    if jobs > 0 {
        return Err(CoreError::VolumeInUse { jobs });
    }
    registry::unregister(&mut config.volumes, id).map(drop)
}

pub fn views(config: &Config, live: &[LiveVolume]) -> Vec<JobView> {
    config
        .jobs
        .iter()
        .map(|job| JobView {
            job: job.clone(),
            source: endpoint(config, &job.source, live),
            target: endpoint(config, &job.target, live),
        })
        .collect()
}

fn prepare(
    config: &mut Config,
    input: JobInput,
    live: &[LiveVolume],
    editing: Option<JobId>,
) -> CoreResult<JobSpec> {
    // Validate the name before a new source volume may be remembered.
    validate_name(&input.name)?;
    let source = source_location(config, input.source, live)?;
    let spec = JobSpec {
        name: input.name,
        source,
        target: input.target,
        mode: input.mode,
        excludes: input.excludes,
    }
    .validate()?;

    if !config.volumes.iter().any(|v| v.id == spec.target.volume_id) {
        return Err(CoreError::VolumeNotRegistered);
    }
    // Two jobs writing into the same folder would overwrite (or, in Mirror, delete) each other's files.
    if let Some(other) = config
        .jobs
        .iter()
        .find(|j| Some(j.id) != editing && j.target.overlaps(&spec.target))
    {
        return Err(CoreError::TargetInUse {
            name: other.name.clone(),
        });
    }
    Ok(spec)
}

fn source_location(
    config: &mut Config,
    source: SourceRef,
    live: &[LiveVolume],
) -> CoreResult<Location> {
    match source {
        SourceRef::Known { location } => {
            let known = config.volumes.iter().any(|v| v.id == location.volume_id)
                || config.sources.iter().any(|v| v.id == location.volume_id);
            if known {
                Ok(location)
            } else {
                Err(CoreError::VolumeNotRegistered)
            }
        }
        SourceRef::New {
            guid_path,
            rel_path,
        } => {
            let volume = live
                .iter()
                .find(|v| v.guid_path == guid_path)
                .ok_or(CoreError::VolumeNotConnected)?;
            Ok(Location {
                volume_id: remember_volume(config, volume),
                rel_path,
            })
        }
    }
}

/// Id of a mounted volume: a registered target by its marker, a remembered source, or a new source.
fn remember_volume(config: &mut Config, volume: &LiveVolume) -> VolumeId {
    if let Some(id) = locate::known_volume_id(config, volume) {
        return id;
    }
    let source = SourceVolume {
        id: VolumeId::new(),
        name: locate::default_volume_name(volume),
        serial: volume.serial,
        guid_path: volume.guid_path.clone(),
    };
    let id = source.id;
    config.sources.push(source);
    id
}

fn forget_unused_sources(config: &mut Config) {
    let jobs = &config.jobs;
    config
        .sources
        .retain(|s| jobs.iter().any(|j| j.source.volume_id == s.id));
}

fn endpoint(config: &Config, location: &Location, live: &[LiveVolume]) -> EndpointView {
    let (volume_name, status, mounted) =
        if let Some(target) = config.volumes.iter().find(|v| v.id == location.volume_id) {
            let resolution = resolve(target, live);
            let status = resolution.status();
            let mounted = matches!(status, VolumeStatus::Connected)
                .then(|| resolution.live())
                .flatten();
            (target.name.clone(), status, mounted)
        } else if let Some(source) = config.sources.iter().find(|v| v.id == location.volume_id) {
            let mounted = resolve_source(source, live);
            let status = if mounted.is_some() {
                VolumeStatus::Connected
            } else {
                VolumeStatus::Disconnected
            };
            (source.name.clone(), status, mounted)
        } else {
            (String::new(), VolumeStatus::Disconnected, None)
        };

    EndpointView {
        volume_name,
        status,
        path: mounted.map(|v| join_path(&v.mount_point, &location.rel_path)),
    }
}

fn join_path(mount_point: &str, rel_path: &str) -> String {
    let mut path = mount_point.to_owned();
    if !path.ends_with('\\') {
        path.push('\\');
    }
    path.push_str(rel_path);
    path
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::{live, registered};

    struct Fixture {
        config: Config,
        live: Vec<LiveVolume>,
        target: VolumeId,
    }

    /// Internal `D:` without a marker and a registered USB target mounted as `G:`.
    fn fixture() -> Fixture {
        let target = VolumeId::new();
        let mut usb = registered(target, 0x1234_ABCD);
        usb.guid_path = live("usb", "", 0, None).guid_path;
        let mut data = live("data", r"D:\", 0x2222_0000, None);
        data.label = "Data".into();
        data.is_external = false;
        Fixture {
            config: Config {
                volumes: vec![usb],
                ..Config::default()
            },
            live: vec![data, live("usb", r"G:\", 0x1234_ABCD, Some(target))],
            target,
        }
    }

    fn input(f: &Fixture, source: &str, target: &str) -> JobInput {
        JobInput {
            name: "Fotky".into(),
            source: SourceRef::New {
                guid_path: f.live[0].guid_path.clone(),
                rel_path: source.into(),
            },
            target: Location {
                volume_id: f.target,
                rel_path: target.into(),
            },
            mode: BackupMode::Mirror,
            excludes: vec!["*.tmp".into()],
        }
    }

    fn add(f: &mut Fixture, source: &str, target: &str) -> CoreResult<Job> {
        let input = input(f, source, target);
        create(&mut f.config, input, &f.live)
    }

    #[test]
    fn create_remembers_source_volume_once() {
        let mut f = fixture();
        let first = add(&mut f, "Fotky", r"Zaloha\Fotky").unwrap();
        let second = add(&mut f, "Hudba", r"Zaloha\Hudba").unwrap();

        assert_eq!(f.config.sources.len(), 1);
        assert_eq!(f.config.sources[0].name, "Data");
        assert_eq!(first.source.volume_id, second.source.volume_id);
        assert_eq!(f.config.jobs.len(), 2);
    }

    #[test]
    fn view_shows_current_paths() {
        let mut f = fixture();
        add(&mut f, "Fotky", r"Zaloha\Fotky").unwrap();

        let view = &views(&f.config, &f.live)[0];
        assert_eq!(view.source.path.as_deref(), Some(r"D:\Fotky"));
        assert_eq!(view.target.path.as_deref(), Some(r"G:\Zaloha\Fotky"));
        assert_eq!(view.target.volume_name, "WD Elements 2 TB");

        let unplugged = views(&f.config, &f.live[..1]);
        assert_eq!(unplugged[0].target.status, VolumeStatus::Disconnected);
        assert_eq!(unplugged[0].target.path, None);
    }

    #[test]
    fn target_folders_of_two_jobs_must_not_overlap() {
        let mut f = fixture();
        add(&mut f, "Fotky", "Zaloha").unwrap();
        let result = add(&mut f, "Hudba", r"zaloha\Hudba");
        assert!(matches!(result, Err(CoreError::TargetInUse { .. })));
    }

    #[test]
    fn editing_a_job_may_keep_its_own_target() {
        let mut f = fixture();
        let job = add(&mut f, "Fotky", "Zaloha").unwrap();
        let mut edited = input(&f, "Fotky", r"Zaloha\Nove");
        edited.name = "Fotky 2".into();
        let updated = update(&mut f.config, job.id, edited, &f.live).unwrap();
        assert_eq!(updated.name, "Fotky 2");
        assert_eq!(updated.created_at_ms, job.created_at_ms);
    }

    #[test]
    fn unknown_target_is_rejected() {
        let mut f = fixture();
        let mut bad = input(&f, "Fotky", "Zaloha");
        bad.target.volume_id = VolumeId::new();
        assert!(matches!(
            create(&mut f.config, bad, &f.live),
            Err(CoreError::VolumeNotRegistered)
        ));
    }

    #[test]
    fn delete_forgets_unused_source_volume() {
        let mut f = fixture();
        let job = add(&mut f, "Fotky", "Zaloha").unwrap();
        delete(&mut f.config, job.id).unwrap();
        assert!(f.config.jobs.is_empty());
        assert!(f.config.sources.is_empty());
        assert!(matches!(
            delete(&mut f.config, job.id),
            Err(CoreError::JobNotFound)
        ));
    }

    #[test]
    fn volume_used_by_job_cannot_be_unregistered() {
        let mut f = fixture();
        let job = add(&mut f, "Fotky", "Zaloha").unwrap();
        assert!(matches!(
            unregister_volume(&mut f.config, f.target),
            Err(CoreError::VolumeInUse { jobs: 1 })
        ));
        delete(&mut f.config, job.id).unwrap();
        unregister_volume(&mut f.config, f.target).unwrap();
        assert!(f.config.volumes.is_empty());
    }
}
