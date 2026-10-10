//! Fictional fixtures shared by unit tests. Never use real user paths or serial numbers here.

use crate::domain::{RegisteredVolume, VolumeId, VolumeMarker};
use crate::volumes::{BusKind, DriveKind, LiveVolume};

pub fn live(guid: &str, mount: &str, serial: u32, marker: Option<VolumeId>) -> LiveVolume {
    LiveVolume {
        guid_path: format!(r"\\?\Volume{{{guid}}}\"),
        mount_point: mount.into(),
        label: "Záloha".into(),
        serial,
        file_system: "NTFS".into(),
        drive_kind: DriveKind::Fixed,
        bus: BusKind::Usb,
        model: Some("WD Elements 25A2".into()),
        total_bytes: 2_000_000_000_000,
        free_bytes: 1_000_000_000_000,
        is_system: false,
        is_external: true,
        marker: marker.map(|id| VolumeMarker {
            version: VolumeMarker::VERSION,
            id,
            name: "WD Elements 2 TB".into(),
            created_at_ms: 0,
        }),
    }
}

pub fn registered(id: VolumeId, serial: u32) -> RegisteredVolume {
    RegisteredVolume {
        id,
        name: "WD Elements 2 TB".into(),
        serial,
        guid_path: r"\\?\Volume{0000}\".into(),
        file_system: "NTFS".into(),
        model: None,
        total_bytes: 2_000_000_000_000,
        registered_at_ms: 0,
    }
}
