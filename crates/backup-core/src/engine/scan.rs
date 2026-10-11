use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

use globset::{Glob, GlobSet, GlobSetBuilder};
use jwalk::WalkDir;

use super::pathutil::{is_reparse_point, long_path, rel_display, rel_glob};
use crate::{CoreError, CoreResult};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FileEntry {
    pub rel_path: String,
    pub size: u64,
    pub mtime: SystemTime,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DirEntry {
    pub rel_path: String,
}

#[derive(Debug, Default, Clone)]
pub struct TreeIndex {
    pub files: BTreeMap<String, FileEntry>,
    pub dirs: BTreeMap<String, DirEntry>,
}

impl TreeIndex {
    pub fn file_count(&self) -> usize {
        self.files.len()
    }
}

/// Walks `root` without following reparse points. `excludes` are globs relative to `root`.
pub fn scan_tree(root: &Path, excludes: &[String]) -> CoreResult<TreeIndex> {
    let root = long_path(root);
    if !root.exists() {
        return Err(CoreError::FolderNotFound { path: root });
    }
    if !root.is_dir() {
        return Err(CoreError::SourceUnavailable);
    }

    let exclude_set = build_excludes(excludes)?;
    let mut index = TreeIndex::default();

    for entry in WalkDir::new(&root)
        .follow_links(false)
        .skip_hidden(false)
        .into_iter()
    {
        let entry = match entry {
            Ok(e) => e,
            Err(err) => {
                let path = err.path().map_or_else(|| root.clone(), Path::to_path_buf);
                return Err(CoreError::io(path, std::io::Error::other(err.to_string())));
            }
        };

        let abs = entry.path();
        if abs == root {
            continue;
        }

        let meta = match entry.metadata() {
            Ok(m) => m,
            Err(err) => {
                return Err(CoreError::io(&abs, std::io::Error::other(err.to_string())));
            }
        };

        // Never follow or copy junctions / symlinks (loops and escape outside the folder).
        if is_reparse_point(&meta) {
            continue;
        }

        let rel = match abs.strip_prefix(&root) {
            Ok(r) => r,
            Err(_) => continue,
        };
        let rel_key = rel_display(rel);
        if rel_key.is_empty() {
            continue;
        }

        if exclude_set.is_match(rel_glob(rel)) {
            continue;
        }

        if meta.is_dir() {
            index
                .dirs
                .insert(rel_key.clone(), DirEntry { rel_path: rel_key });
            continue;
        }

        if !meta.is_file() {
            continue;
        }

        let mtime = meta.modified().unwrap_or(SystemTime::UNIX_EPOCH);
        index.files.insert(
            rel_key.clone(),
            FileEntry {
                rel_path: rel_key,
                size: meta.len(),
                mtime,
            },
        );
    }

    Ok(index)
}

fn build_excludes(patterns: &[String]) -> CoreResult<GlobSet> {
    let mut builder = GlobSetBuilder::new();
    for pattern in patterns {
        let glob = Glob::new(pattern).map_err(|_| CoreError::InvalidExclude {
            pattern: pattern.clone(),
        })?;
        builder.add(glob);
    }
    builder.build().map_err(|_| CoreError::InvalidExclude {
        pattern: String::new(),
    })
}

/// Absolute path of a file/dir under `root` for a plan relative path.
pub fn abs_under(root: &Path, rel_path: &str) -> PathBuf {
    if rel_path.is_empty() {
        long_path(root)
    } else {
        long_path(&root.join(rel_path))
    }
}
