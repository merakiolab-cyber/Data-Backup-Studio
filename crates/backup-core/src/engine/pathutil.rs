use std::path::{Path, PathBuf};

/// Joins a volume mount point (`G:\` or `C:\Mnt\Disk\`) with a volume-relative path.
pub fn join_volume(mount_point: &str, rel_path: &str) -> PathBuf {
    let mut path = mount_point.to_owned();
    if !path.ends_with(['\\', '/']) {
        path.push('\\');
    }
    if !rel_path.is_empty() {
        path.push_str(rel_path);
    }
    PathBuf::from(path)
}

/// Prefixes `\\?\` so Windows accepts paths longer than 260 characters.
pub fn long_path(path: &Path) -> PathBuf {
    let s = path.to_string_lossy();
    if s.starts_with(r"\\?\") {
        return path.to_path_buf();
    }
    if let Some(rest) = s.strip_prefix(r"\\") {
        PathBuf::from(format!(r"\\?\UNC\{rest}"))
    } else {
        PathBuf::from(format!(r"\\?\{s}"))
    }
}

/// Relative path using backslashes, suitable for display and for joining under a root.
pub fn rel_display(path: &Path) -> String {
    path.components()
        .filter_map(|c| c.as_os_str().to_str())
        .collect::<Vec<_>>()
        .join("\\")
}

/// Forward-slash form for glob matching.
pub fn rel_glob(path: &Path) -> String {
    path.components()
        .filter_map(|c| c.as_os_str().to_str())
        .collect::<Vec<_>>()
        .join("/")
}

#[cfg(windows)]
pub fn is_reparse_point(meta: &std::fs::Metadata) -> bool {
    use std::os::windows::fs::MetadataExt;
    const FILE_ATTRIBUTE_REPARSE_POINT: u32 = 0x400;
    meta.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT != 0
}

#[cfg(not(windows))]
pub fn is_reparse_point(meta: &std::fs::Metadata) -> bool {
    meta.file_type().is_symlink()
}
