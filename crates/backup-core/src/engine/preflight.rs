use std::path::PathBuf;

use crate::domain::{Job, Location, normalize_rel_path};
use crate::engine::pathutil::join_volume;
use crate::storage::Config;
use crate::volumes::{LiveVolume, VolumeStatus, resolve, resolve_source};
use crate::{CoreError, CoreResult};

#[derive(Debug, Clone)]
pub struct ResolvedJob {
    pub source_root: PathBuf,
    pub target_root: PathBuf,
    pub target_free_bytes: u64,
}

/// Absolute folder for a stored location. Disconnected / needs-confirm disks are rejected.
pub fn resolve_location(
    config: &Config,
    live: &[LiveVolume],
    location: &Location,
) -> CoreResult<PathBuf> {
    let location = Location {
        rel_path: normalize_rel_path(&location.rel_path)?,
        volume_id: location.volume_id,
    };
    Ok(resolve_endpoint(config, live, &location)?.0)
}

/// Resolves both endpoints to absolute folders. Disconnected / needs-confirm disks are rejected.
pub fn resolve_job(config: &Config, live: &[LiveVolume], job: &Job) -> CoreResult<ResolvedJob> {
    let (source_root, _) = resolve_endpoint(config, live, &job.source)?;
    let (target_root, free) = resolve_endpoint(config, live, &job.target)?;
    if !source_root.is_dir() {
        return Err(CoreError::FolderNotFound { path: source_root });
    }
    Ok(ResolvedJob {
        source_root,
        target_root,
        target_free_bytes: free,
    })
}

fn resolve_endpoint(
    config: &Config,
    live: &[LiveVolume],
    location: &Location,
) -> CoreResult<(PathBuf, u64)> {
    if let Some(target) = config.volumes.iter().find(|v| v.id == location.volume_id) {
        let resolution = resolve(target, live);
        return match resolution.status() {
            VolumeStatus::Connected => {
                let mounted = resolution.live().ok_or(CoreError::EndpointDisconnected)?;
                Ok((
                    join_volume(&mounted.mount_point, &location.rel_path),
                    mounted.free_bytes,
                ))
            }
            VolumeStatus::NeedsConfirmation { .. } => Err(CoreError::EndpointNeedsConfirmation),
            VolumeStatus::Disconnected => Err(CoreError::EndpointDisconnected),
        };
    }

    if let Some(source) = config.sources.iter().find(|v| v.id == location.volume_id) {
        let mounted = resolve_source(source, live).ok_or(CoreError::EndpointDisconnected)?;
        return Ok((
            join_volume(&mounted.mount_point, &location.rel_path),
            mounted.free_bytes,
        ));
    }

    Err(CoreError::VolumeNotRegistered)
}
