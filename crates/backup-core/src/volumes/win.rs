//! Thin safe wrappers over the Win32 volume APIs. All `unsafe` code of the volumes module lives here.

use std::ffi::c_void;
use std::path::Path;

use windows::Win32::Foundation::{CloseHandle, MAX_PATH};
use windows::Win32::Storage::FileSystem::{
    CreateFileW, FILE_ATTRIBUTE_HIDDEN, FILE_FLAGS_AND_ATTRIBUTES, FILE_SHARE_READ,
    FILE_SHARE_WRITE, FindFirstVolumeW, FindNextVolumeW, FindVolumeClose, GetDiskFreeSpaceExW,
    GetDriveTypeW, GetFileAttributesW, GetVolumeInformationW, GetVolumePathNamesForVolumeNameW,
    INVALID_FILE_ATTRIBUTES, OPEN_EXISTING, SetFileAttributesW,
};
use windows::Win32::System::IO::DeviceIoControl;
use windows::Win32::System::Ioctl::{
    IOCTL_STORAGE_QUERY_PROPERTY, PropertyStandardQuery, STORAGE_DEVICE_DESCRIPTOR,
    STORAGE_PROPERTY_QUERY, StorageDeviceProperty,
};
use windows::Win32::System::SystemInformation::GetSystemWindowsDirectoryW;
use windows::core::PCWSTR;

use super::{BusKind, DriveKind, LiveVolume};
use crate::{CoreError, CoreResult};

pub(super) fn enumerate() -> CoreResult<Vec<LiveVolume>> {
    let system_root = system_drive_root();
    let mut name = [0u16; MAX_PATH as usize + 1];

    // SAFETY: `name` is a valid writable buffer for the duration of the call.
    let handle = unsafe { FindFirstVolumeW(&mut name) }.map_err(|source| CoreError::Win32 {
        operation: "FindFirstVolumeW",
        source,
    })?;

    let mut volumes = Vec::new();
    loop {
        if let Some(volume) = describe(&from_wide(&name), system_root.as_deref()) {
            volumes.push(volume);
        }
        // SAFETY: `handle` stays valid until `FindVolumeClose`; `name` is writable.
        if unsafe { FindNextVolumeW(handle, &mut name) }.is_err() {
            break;
        }
    }
    // SAFETY: `handle` came from `FindFirstVolumeW` and is closed exactly once.
    let _ = unsafe { FindVolumeClose(handle) };

    volumes.sort_by(|a, b| a.mount_point.cmp(&b.mount_point));
    Ok(volumes)
}

/// Returns `None` for volumes without a mount point or not ready (e.g. empty card reader).
fn describe(guid_path: &str, system_root: Option<&str>) -> Option<LiveVolume> {
    let mount_point = first_mount_point(guid_path)?;
    let root = wide(&mount_point);

    let mut label = [0u16; MAX_PATH as usize + 1];
    let mut file_system = [0u16; MAX_PATH as usize + 1];
    let mut serial = 0u32;
    // SAFETY: all buffers and out-pointers are valid for the duration of the call.
    unsafe {
        GetVolumeInformationW(
            PCWSTR(root.as_ptr()),
            Some(&mut label),
            Some(&mut serial),
            None,
            None,
            Some(&mut file_system),
        )
    }
    .ok()?;

    let (mut free_bytes, mut total_bytes) = (0u64, 0u64);
    // SAFETY: out-pointers are valid; failure leaves zeros which is acceptable.
    let _ = unsafe {
        GetDiskFreeSpaceExW(
            PCWSTR(root.as_ptr()),
            Some(&mut free_bytes),
            Some(&mut total_bytes),
            None,
        )
    };

    // SAFETY: `root` is a valid null-terminated path.
    let drive_kind = match unsafe { GetDriveTypeW(PCWSTR(root.as_ptr())) } {
        2 => DriveKind::Removable,
        3 => DriveKind::Fixed,
        5 => DriveKind::Optical,
        6 => DriveKind::Ram,
        _ => DriveKind::Unknown,
    };
    let (bus, model) = query_device(guid_path);
    let is_system = system_root.is_some_and(|sys| sys.eq_ignore_ascii_case(&mount_point));

    Some(LiveVolume {
        guid_path: guid_path.to_owned(),
        mount_point,
        label: from_wide(&label),
        serial,
        file_system: from_wide(&file_system),
        drive_kind,
        bus,
        model,
        total_bytes,
        free_bytes,
        is_system,
        is_external: !is_system && (bus == BusKind::Usb || drive_kind == DriveKind::Removable),
        marker: None,
    })
}

/// Prefers a drive-letter root (`E:\`) over folder mount points.
fn first_mount_point(guid_path: &str) -> Option<String> {
    let name = wide(guid_path);
    let mut buffer = [0u16; 2048];
    let mut len = 0u32;
    // SAFETY: `buffer` is writable and `len` is a valid out-pointer.
    unsafe { GetVolumePathNamesForVolumeNameW(PCWSTR(name.as_ptr()), Some(&mut buffer), &mut len) }
        .ok()?;

    let paths: Vec<String> = buffer
        .split(|&c| c == 0)
        .take_while(|s| !s.is_empty())
        .map(String::from_utf16_lossy)
        .collect();
    paths
        .iter()
        .find(|p| p.len() == 3 && p.ends_with(":\\"))
        .or_else(|| paths.first())
        .cloned()
}

fn query_device(guid_path: &str) -> (BusKind, Option<String>) {
    let device = wide(guid_path.trim_end_matches('\\'));
    // SAFETY: `device` is a valid null-terminated path; zero access rights only allow queries.
    let handle = unsafe {
        CreateFileW(
            PCWSTR(device.as_ptr()),
            0,
            FILE_SHARE_READ | FILE_SHARE_WRITE,
            None,
            OPEN_EXISTING,
            FILE_FLAGS_AND_ATTRIBUTES(0),
            None,
        )
    };
    let Ok(handle) = handle else {
        return (BusKind::Unknown, None);
    };

    let query = STORAGE_PROPERTY_QUERY {
        PropertyId: StorageDeviceProperty,
        QueryType: PropertyStandardQuery,
        AdditionalParameters: [0],
    };
    // u64 storage keeps the buffer aligned for `STORAGE_DEVICE_DESCRIPTOR`.
    let mut buffer = [0u64; 128];
    let mut returned = 0u32;
    // SAFETY: input and output buffers are valid for the given sizes; handle is open.
    let result = unsafe {
        DeviceIoControl(
            handle,
            IOCTL_STORAGE_QUERY_PROPERTY,
            Some(std::ptr::from_ref(&query).cast::<c_void>()),
            size_of::<STORAGE_PROPERTY_QUERY>() as u32,
            Some(buffer.as_mut_ptr().cast::<c_void>()),
            size_of_val(&buffer) as u32,
            Some(&mut returned),
            None,
        )
    };
    // SAFETY: `handle` was opened above and is closed exactly once.
    let _ = unsafe { CloseHandle(handle) };

    let returned = (returned as usize).min(size_of_val(&buffer));
    if result.is_err() || returned < size_of::<STORAGE_DEVICE_DESCRIPTOR>() {
        return (BusKind::Unknown, None);
    }
    // SAFETY: the buffer is aligned, initialized and holds at least one descriptor.
    let descriptor = unsafe { &*buffer.as_ptr().cast::<STORAGE_DEVICE_DESCRIPTOR>() };
    // SAFETY: `returned` bytes of `buffer` were written by the driver.
    let bytes = unsafe { std::slice::from_raw_parts(buffer.as_ptr().cast::<u8>(), returned) };

    let bus = match descriptor.BusType.0 {
        7 => BusKind::Usb,
        11 => BusKind::Sata,
        17 => BusKind::Nvme,
        12 | 13 => BusKind::Sd,
        0 => BusKind::Unknown,
        _ => BusKind::Other,
    };
    let parts: Vec<String> = [descriptor.VendorIdOffset, descriptor.ProductIdOffset]
        .into_iter()
        .filter_map(|offset| ascii_at(bytes, offset as usize))
        .collect();
    let model = (!parts.is_empty()).then(|| parts.join(" "));
    (bus, model)
}

fn ascii_at(bytes: &[u8], offset: usize) -> Option<String> {
    if offset == 0 || offset >= bytes.len() {
        return None;
    }
    let raw = &bytes[offset..];
    let end = raw.iter().position(|&b| b == 0).unwrap_or(raw.len());
    let text = String::from_utf8_lossy(&raw[..end]).trim().to_owned();
    (!text.is_empty()).then_some(text)
}

fn system_drive_root() -> Option<String> {
    let mut buffer = [0u16; MAX_PATH as usize + 1];
    // SAFETY: `buffer` is writable for its full length.
    let len = unsafe { GetSystemWindowsDirectoryW(Some(&mut buffer)) } as usize;
    let dir = String::from_utf16_lossy(buffer.get(..len)?);
    dir.get(..3).map(str::to_owned)
}

/// Marks a file or directory as hidden (best effort).
pub(crate) fn set_hidden(path: &Path) {
    let path = wide(&path.to_string_lossy());
    // SAFETY: `path` is a valid null-terminated string.
    let attributes = unsafe { GetFileAttributesW(PCWSTR(path.as_ptr())) };
    if attributes == INVALID_FILE_ATTRIBUTES {
        return;
    }
    // SAFETY: `path` is a valid null-terminated string.
    let _ = unsafe {
        SetFileAttributesW(
            PCWSTR(path.as_ptr()),
            FILE_FLAGS_AND_ATTRIBUTES(attributes | FILE_ATTRIBUTE_HIDDEN.0),
        )
    };
}

fn wide(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

fn from_wide(buffer: &[u16]) -> String {
    let end = buffer.iter().position(|&c| c == 0).unwrap_or(buffer.len());
    String::from_utf16_lossy(&buffer[..end])
}
