use serde::{Deserialize, Serialize};

use super::VolumeId;
use crate::{CoreError, CoreResult};

/// Folder on a volume, independent of the drive letter it currently has.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct Location {
    pub volume_id: VolumeId,
    /// Normalized path relative to the volume root: `Zaloha\Fotky`, empty for the root itself.
    pub rel_path: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PathProblem {
    ForbiddenCharacter,
    ParentReference,
    TrailingDotOrSpace,
    ReservedName,
    TooLong,
    TargetIsRoot,
    InsideAppFolder,
}

/// Longest relative path we accept; with a `\\?\X:\` prefix it stays below the 32 767 limit.
pub const MAX_REL_PATH_CHARS: usize = 4096;

const FORBIDDEN: &[char] = &['<', '>', ':', '"', '|', '?', '*'];
const RESERVED: &[&str] = &[
    "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8",
    "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
];

/// Normalizes a user-supplied relative path to `a\b\c` form and rejects anything Windows
/// cannot store or that could escape the volume root (`..`, drive prefixes, reserved names).
pub fn normalize_rel_path(input: &str) -> CoreResult<String> {
    let invalid = |reason| Err(CoreError::InvalidPath(reason));
    let mut parts = Vec::new();
    for part in input.split(['\\', '/']).filter(|p| !p.is_empty()) {
        if part == "." || part == ".." {
            return invalid(PathProblem::ParentReference);
        }
        if part
            .chars()
            .any(|c| c.is_control() || FORBIDDEN.contains(&c))
        {
            return invalid(PathProblem::ForbiddenCharacter);
        }
        if part.ends_with(['.', ' ']) {
            return invalid(PathProblem::TrailingDotOrSpace);
        }
        let stem = part.split('.').next().unwrap_or(part).trim_end();
        if RESERVED.iter().any(|r| r.eq_ignore_ascii_case(stem)) {
            return invalid(PathProblem::ReservedName);
        }
        parts.push(part);
    }
    let path = parts.join("\\");
    if path.chars().count() > MAX_REL_PATH_CHARS {
        return invalid(PathProblem::TooLong);
    }
    Ok(path)
}

fn components(path: &str) -> impl Iterator<Item = String> + '_ {
    path.split('\\')
        .filter(|p| !p.is_empty())
        .map(str::to_lowercase)
}

/// `true` when `inner` is `outer` itself or lies inside it (Windows paths are case-insensitive).
pub fn rel_path_contains(outer: &str, inner: &str) -> bool {
    let mut inner = components(inner);
    components(outer).all(|o| inner.next().is_some_and(|i| i == o))
}

impl Location {
    /// `true` when one location lies inside the other on the same volume.
    pub fn overlaps(&self, other: &Self) -> bool {
        self.volume_id == other.volume_id
            && (rel_path_contains(&self.rel_path, &other.rel_path)
                || rel_path_contains(&other.rel_path, &self.rel_path))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn problem(input: &str) -> Option<PathProblem> {
        match normalize_rel_path(input) {
            Err(CoreError::InvalidPath(p)) => Some(p),
            _ => None,
        }
    }

    #[test]
    fn normalizes_separators() {
        assert_eq!(
            normalize_rel_path(r"/Zaloha//Fotky\Dovolená Šumava\").ok(),
            Some(r"Zaloha\Fotky\Dovolená Šumava".into())
        );
        assert_eq!(normalize_rel_path("").ok(), Some(String::new()));
    }

    #[test]
    fn rejects_escapes_and_invalid_names() {
        assert_eq!(
            problem(r"Zaloha\..\Windows"),
            Some(PathProblem::ParentReference)
        );
        assert_eq!(problem(r"C:\Fotky"), Some(PathProblem::ForbiddenCharacter));
        assert_eq!(problem("Fotky?"), Some(PathProblem::ForbiddenCharacter));
        assert_eq!(problem(r"Fotky.\a"), Some(PathProblem::TrailingDotOrSpace));
        assert_eq!(problem(r"Zaloha\nul.txt"), Some(PathProblem::ReservedName));
        assert_eq!(
            problem(&"a".repeat(MAX_REL_PATH_CHARS + 1)),
            Some(PathProblem::TooLong)
        );
    }

    #[test]
    fn containment_is_component_wise_and_case_insensitive() {
        assert!(rel_path_contains(r"Zaloha", r"zaloha\Fotky"));
        assert!(rel_path_contains("", r"Zaloha"));
        assert!(rel_path_contains(r"Zaloha", r"Zaloha"));
        assert!(!rel_path_contains(r"Zaloha\Fotky", r"Zaloha"));
        assert!(!rel_path_contains(r"Zaloha", r"Zaloha 2"));
    }

    #[test]
    fn overlap_requires_same_volume() {
        let a = VolumeId::new();
        let at = |volume_id, rel: &str| Location {
            volume_id,
            rel_path: rel.into(),
        };
        assert!(at(a, "Data").overlaps(&at(a, r"Data\Zaloha")));
        assert!(!at(a, "Data").overlaps(&at(VolumeId::new(), "Data")));
        assert!(!at(a, "Data").overlaps(&at(a, "Fotky")));
    }
}
