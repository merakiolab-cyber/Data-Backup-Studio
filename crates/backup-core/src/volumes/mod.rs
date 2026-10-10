//! Volume enumeration and identity: which disks are connected and which of them we know.

pub mod marker;
pub mod registry;
mod resolve;
mod win;

use serde::Serialize;

use crate::CoreResult;
use crate::domain::VolumeMarker;

pub use resolve::{
    ConfirmReason, RegisteredVolumeView, Resolution, VolumeStatus, VolumesOverview, overview,
    resolve, resolve_source,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum DriveKind {
    Fixed,
    Removable,
    Optical,
    Ram,
    Unknown,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum BusKind {
    Usb,
    Sata,
    Nvme,
    Sd,
    Other,
    Unknown,
}

/// A volume currently mounted on this PC.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct LiveVolume {
    /// `\\?\Volume{GUID}\`
    pub guid_path: String,
    /// Root path such as `E:\` (may also be a folder mount point).
    pub mount_point: String,
    pub label: String,
    pub serial: u32,
    pub file_system: String,
    pub drive_kind: DriveKind,
    pub bus: BusKind,
    /// Vendor and product reported by the device, e.g. `WD Elements 25A2`.
    pub model: Option<String>,
    #[specta(type = specta_typescript::Number)]
    pub total_bytes: u64,
    #[specta(type = specta_typescript::Number)]
    pub free_bytes: u64,
    /// Volume containing the Windows directory.
    pub is_system: bool,
    pub is_external: bool,
    pub marker: Option<VolumeMarker>,
}

/// Lists all mounted, ready volumes together with their identity marker (if any).
pub fn enumerate() -> CoreResult<Vec<LiveVolume>> {
    let mut volumes = win::enumerate()?;
    for volume in &mut volumes {
        volume.marker = marker::read(std::path::Path::new(&volume.mount_point))
            .ok()
            .flatten();
    }
    Ok(volumes)
}

pub(crate) use win::set_hidden;
