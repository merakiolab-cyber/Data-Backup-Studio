use std::collections::VecDeque;
use std::fs;
use std::io::{self, Read, Write};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, AtomicU32, AtomicU64, Ordering};
use std::thread;
use std::time::{Duration, Instant};

/// Bytes between cancel checks during a single-file copy (keeps cancel responsive for large photos).
const COPY_CHUNK_BYTES: usize = 1024 * 1024;

use filetime::{FileTime, set_file_mtime};
use serde::{Deserialize, Serialize};

use super::pathutil::long_path;
use super::plan::{Plan, PlanAction, PlanActionKind};
use super::scan::abs_under;
use super::settings::PARTIAL_SUFFIX;
use crate::{CoreError, CoreResult};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct RunProgress {
    pub phase: RunPhase,
    pub current_path: Option<String>,
    pub done_actions: u32,
    pub total_actions: u32,
    #[specta(type = specta_typescript::Number)]
    pub bytes_done: u64,
    #[specta(type = specta_typescript::Number)]
    pub bytes_total: u64,
    pub errors: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum RunPhase {
    Copying,
    Deleting,
    Done,
    Cancelled,
    /// Run aborted before finishing (not used when only individual files fail).
    Failed,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct RunResult {
    pub phase: RunPhase,
    pub copied: u32,
    pub updated: u32,
    pub deleted: u32,
    pub dirs_created: u32,
    #[specta(type = specta_typescript::Number)]
    pub bytes_copied: u64,
    pub errors: Vec<String>,
}

pub struct ExecuteOptions {
    pub workers: u32,
    pub verify_copies: bool,
}

/// Executes a plan. Copy/Update/CreateDir first; Mirror deletes only afterwards.
pub fn execute_plan(
    source_root: &Path,
    target_root: &Path,
    plan: &Plan,
    cancel: &AtomicBool,
    on_progress: impl Fn(RunProgress) + Send + Sync,
    on_log: impl Fn(&str) + Send + Sync,
    options: ExecuteOptions,
) -> CoreResult<RunResult> {
    fs::create_dir_all(long_path(target_root)).map_err(|e| CoreError::io(target_root, e))?;

    if plan.actions.is_empty() {
        on_log("kontrola  zdroj a cíl jsou shodné");
    }

    let (copy_actions, delete_actions): (Vec<_>, Vec<_>) = plan
        .actions
        .iter()
        .partition(|a| a.kind != PlanActionKind::Delete);

    // Delete deepest paths first so files go before their parent dirs.
    let mut delete_actions = delete_actions;
    delete_actions.sort_by_key(|a| std::cmp::Reverse(a.rel_path.len()));

    let total_actions = u32::try_from(plan.actions.len()).unwrap_or(u32::MAX);
    let bytes_total = plan.summary.bytes_to_copy;
    let mut done_actions = 0_u32;
    let mut bytes_done = 0_u64;
    let mut result = RunResult {
        phase: RunPhase::Copying,
        copied: 0,
        updated: 0,
        deleted: 0,
        dirs_created: 0,
        bytes_copied: 0,
        errors: Vec::new(),
    };

    let last_emit = Mutex::new(Instant::now() - Duration::from_secs(1));
    let emit = |phase: RunPhase,
                current: Option<String>,
                done: u32,
                bytes: u64,
                errors: u32,
                force: bool| {
        let mut last = last_emit
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        if force || last.elapsed() >= Duration::from_millis(100) {
            *last = Instant::now();
            drop(last);
            on_progress(RunProgress {
                phase,
                current_path: current,
                done_actions: done,
                total_actions,
                bytes_done: bytes,
                bytes_total,
                errors,
            });
        }
    };

    let workers = options.workers.clamp(1, 8) as usize;
    let runtime = CopyRuntime {
        source_root,
        target_root,
        cancel,
        emit: &emit,
        on_log: &on_log,
        verify: options.verify_copies,
    };
    if workers > 1 {
        let copied = copy_parallel(
            &runtime,
            &copy_actions,
            workers,
            &mut result,
            &mut done_actions,
            &mut bytes_done,
        );
        if copied == CopyOutcome::Cancelled {
            emit(
                RunPhase::Cancelled,
                None,
                done_actions,
                bytes_done,
                result.errors.len() as u32,
                true,
            );
            return Ok(result);
        }
    } else {
        for action in &copy_actions {
            if cancel.load(Ordering::Relaxed) {
                result.phase = RunPhase::Cancelled;
                emit(
                    RunPhase::Cancelled,
                    None,
                    done_actions,
                    bytes_done,
                    result.errors.len() as u32,
                    true,
                );
                return Ok(result);
            }

            emit(
                RunPhase::Copying,
                Some(action.rel_path.clone()),
                done_actions,
                bytes_done,
                result.errors.len() as u32,
                false,
            );

            match apply_copy_action(
                runtime.source_root,
                runtime.target_root,
                action,
                runtime.cancel,
                runtime.verify,
            ) {
                Ok(()) => {
                    on_log(&log_action(
                        action.kind,
                        &action.rel_path,
                        action.bytes,
                        runtime.verify,
                    ));
                    match action.kind {
                        PlanActionKind::CreateDir => result.dirs_created += 1,
                        PlanActionKind::Copy => {
                            result.copied += 1;
                            result.bytes_copied += action.bytes;
                            bytes_done += action.bytes;
                        }
                        PlanActionKind::Update => {
                            result.updated += 1;
                            result.bytes_copied += action.bytes;
                            bytes_done += action.bytes;
                        }
                        PlanActionKind::Delete => {}
                    }
                }
                Err(CoreError::Cancelled) => {
                    result.phase = RunPhase::Cancelled;
                    emit(
                        RunPhase::Cancelled,
                        None,
                        done_actions,
                        bytes_done,
                        result.errors.len() as u32,
                        true,
                    );
                    return Ok(result);
                }
                Err(err) => {
                    let message = err.to_string();
                    on_log(&log_error(&action.rel_path, &message));
                    result.errors.push(message);
                }
            }
            done_actions += 1;
        }
    }

    // Deletes run only after the copy phase (Mirror safety invariant).
    for action in &delete_actions {
        if cancel.load(Ordering::Relaxed) {
            result.phase = RunPhase::Cancelled;
            emit(
                RunPhase::Cancelled,
                None,
                done_actions,
                bytes_done,
                result.errors.len() as u32,
                true,
            );
            return Ok(result);
        }

        emit(
            RunPhase::Deleting,
            Some(action.rel_path.clone()),
            done_actions,
            bytes_done,
            result.errors.len() as u32,
            false,
        );

        match apply_delete_action(target_root, action) {
            Ok(()) => {
                on_log(&log_action(
                    action.kind,
                    &action.rel_path,
                    action.bytes,
                    false,
                ));
                result.deleted += 1;
            }
            Err(err) => {
                let message = err.to_string();
                on_log(&log_error(&action.rel_path, &message));
                result.errors.push(message);
            }
        }
        done_actions += 1;
    }

    // Individual file I/O errors are collected in `errors`; the run still completed.
    result.phase = RunPhase::Done;
    emit(
        result.phase,
        None,
        done_actions,
        bytes_done,
        result.errors.len() as u32,
        true,
    );
    Ok(result)
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum CopyOutcome {
    Finished,
    Cancelled,
}

struct CopyRuntime<'a> {
    source_root: &'a Path,
    target_root: &'a Path,
    cancel: &'a AtomicBool,
    emit: &'a (dyn Fn(RunPhase, Option<String>, u32, u64, u32, bool) + Sync),
    on_log: &'a (dyn Fn(&str) + Sync),
    verify: bool,
}

fn copy_parallel(
    runtime: &CopyRuntime<'_>,
    copy_actions: &[&PlanAction],
    workers: usize,
    result: &mut RunResult,
    done_actions: &mut u32,
    bytes_done: &mut u64,
) -> CopyOutcome {
    let queue = Mutex::new(VecDeque::from_iter(copy_actions.iter().copied()));
    let copied = AtomicU32::new(0);
    let updated = AtomicU32::new(0);
    let dirs = AtomicU32::new(0);
    let bytes = AtomicU64::new(0);
    let done = AtomicU32::new(*done_actions);
    let cancelled = AtomicBool::new(false);
    let errors = Mutex::new(Vec::new());

    thread::scope(|scope| {
        for _ in 0..workers {
            scope.spawn(|| {
                loop {
                    if runtime.cancel.load(Ordering::Relaxed) || cancelled.load(Ordering::Relaxed) {
                        cancelled.store(true, Ordering::Relaxed);
                        queue
                            .lock()
                            .unwrap_or_else(std::sync::PoisonError::into_inner)
                            .clear();
                        break;
                    }
                    let action = {
                        let mut queue = queue
                            .lock()
                            .unwrap_or_else(std::sync::PoisonError::into_inner);
                        queue.pop_front()
                    };
                    let Some(action) = action else {
                        break;
                    };
                    (runtime.emit)(
                        RunPhase::Copying,
                        Some(action.rel_path.clone()),
                        done.load(Ordering::Relaxed),
                        bytes.load(Ordering::Relaxed),
                        errors
                            .lock()
                            .unwrap_or_else(std::sync::PoisonError::into_inner)
                            .len() as u32,
                        false,
                    );
                    match apply_copy_action(
                        runtime.source_root,
                        runtime.target_root,
                        action,
                        runtime.cancel,
                        runtime.verify,
                    ) {
                        Ok(()) => {
                            (runtime.on_log)(&log_action(
                                action.kind,
                                &action.rel_path,
                                action.bytes,
                                runtime.verify,
                            ));
                            match action.kind {
                                PlanActionKind::CreateDir => {
                                    dirs.fetch_add(1, Ordering::Relaxed);
                                }
                                PlanActionKind::Copy => {
                                    copied.fetch_add(1, Ordering::Relaxed);
                                    bytes.fetch_add(action.bytes, Ordering::Relaxed);
                                }
                                PlanActionKind::Update => {
                                    updated.fetch_add(1, Ordering::Relaxed);
                                    bytes.fetch_add(action.bytes, Ordering::Relaxed);
                                }
                                PlanActionKind::Delete => {}
                            }
                        }
                        Err(CoreError::Cancelled) => {
                            cancelled.store(true, Ordering::Relaxed);
                            queue
                                .lock()
                                .unwrap_or_else(std::sync::PoisonError::into_inner)
                                .clear();
                            break;
                        }
                        Err(err) => {
                            let message = err.to_string();
                            (runtime.on_log)(&log_error(&action.rel_path, &message));
                            errors
                                .lock()
                                .unwrap_or_else(std::sync::PoisonError::into_inner)
                                .push(message);
                        }
                    }
                    done.fetch_add(1, Ordering::Relaxed);
                }
            });
        }
    });

    result.copied = copied.load(Ordering::Relaxed);
    result.updated = updated.load(Ordering::Relaxed);
    result.dirs_created = dirs.load(Ordering::Relaxed);
    result.bytes_copied = bytes.load(Ordering::Relaxed);
    *bytes_done = result.bytes_copied;
    *done_actions = done.load(Ordering::Relaxed);
    result.errors = errors
        .into_inner()
        .unwrap_or_else(std::sync::PoisonError::into_inner);
    if cancelled.load(Ordering::Relaxed) || runtime.cancel.load(Ordering::Relaxed) {
        result.phase = RunPhase::Cancelled;
        CopyOutcome::Cancelled
    } else {
        CopyOutcome::Finished
    }
}

fn apply_copy_action(
    source_root: &Path,
    target_root: &Path,
    action: &PlanAction,
    cancel: &AtomicBool,
    verify: bool,
) -> CoreResult<()> {
    match action.kind {
        PlanActionKind::CreateDir => {
            let dest = abs_under(target_root, &action.rel_path);
            fs::create_dir_all(&dest).map_err(|e| CoreError::io(dest, e))
        }
        PlanActionKind::Copy | PlanActionKind::Update => {
            copy_atomic(source_root, target_root, &action.rel_path, cancel, verify)
        }
        PlanActionKind::Delete => Ok(()),
    }
}

fn copy_atomic(
    source_root: &Path,
    target_root: &Path,
    rel_path: &str,
    cancel: &AtomicBool,
    verify: bool,
) -> CoreResult<()> {
    let src = abs_under(source_root, rel_path);
    let dest = abs_under(target_root, rel_path);
    let partial = partial_path(&dest);

    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|e| CoreError::io(parent, e))?;
    }

    if cancel.load(Ordering::Relaxed) {
        return Err(CoreError::Cancelled);
    }

    // Remove a leftover partial from a previous interrupted run.
    let _ = fs::remove_file(&partial);

    if let Err(err) = copy_cancellable(&src, &partial, cancel) {
        let _ = fs::remove_file(&partial);
        return Err(err);
    }

    if cancel.load(Ordering::Relaxed) {
        let _ = fs::remove_file(&partial);
        return Err(CoreError::Cancelled);
    }

    if verify && let Err(err) = verify_copy(&src, &partial, rel_path) {
        let _ = fs::remove_file(&partial);
        return Err(err);
    }

    let meta = fs::metadata(&src).map_err(|e| CoreError::io(&src, e))?;
    if let Ok(mtime) = meta.modified() {
        let _ = set_file_mtime(&partial, FileTime::from_system_time(mtime));
    }

    if dest.exists() {
        fs::remove_file(&dest).map_err(|e| {
            let _ = fs::remove_file(&partial);
            CoreError::io(&dest, e)
        })?;
    }

    fs::rename(&partial, &dest).map_err(|e| {
        let _ = fs::remove_file(&partial);
        CoreError::io(&dest, e)
    })?;
    Ok(())
}

fn apply_delete_action(target_root: &Path, action: &PlanAction) -> CoreResult<()> {
    let dest = abs_under(target_root, &action.rel_path);
    ensure_inside_root(target_root, &dest)?;

    if !dest.exists() {
        return Ok(());
    }

    let meta = fs::symlink_metadata(&dest).map_err(|e| CoreError::io(&dest, e))?;
    if meta.is_dir() {
        // Only remove empty dirs left after files were deleted; ignore non-empty leftovers.
        match fs::remove_dir(&dest) {
            Ok(()) => Ok(()),
            Err(e) if e.kind() == std::io::ErrorKind::DirectoryNotEmpty => Ok(()),
            Err(e) => Err(CoreError::io(dest, e)),
        }
    } else {
        fs::remove_file(&dest).map_err(|e| CoreError::io(dest, e))
    }
}

fn log_action(kind: PlanActionKind, rel_path: &str, bytes: u64, verified: bool) -> String {
    let verb = match kind {
        PlanActionKind::Copy => "kopie",
        PlanActionKind::Update => "aktualizace",
        PlanActionKind::Delete => "smazat",
        PlanActionKind::CreateDir => "složka",
    };
    let check = if verified && matches!(kind, PlanActionKind::Copy | PlanActionKind::Update) {
        "  ověřeno"
    } else {
        ""
    };
    if bytes > 0 {
        format!("{verb}  {rel_path}  {bytes}{check}")
    } else {
        format!("{verb}  {rel_path}{check}")
    }
}

/// Copies `src` → `dest` in chunks so cancel can stop mid-file (std::fs::copy cannot).
fn copy_cancellable(src: &Path, dest: &Path, cancel: &AtomicBool) -> CoreResult<()> {
    let mut reader = fs::File::open(src).map_err(|e| CoreError::io(src, e))?;
    let mut writer = fs::File::create(dest).map_err(|e| CoreError::io(dest, e))?;
    let mut buf = vec![0_u8; COPY_CHUNK_BYTES];
    loop {
        if cancel.load(Ordering::Relaxed) {
            return Err(CoreError::Cancelled);
        }
        let read = reader.read(&mut buf).map_err(|e| CoreError::io(src, e))?;
        if read == 0 {
            break;
        }
        writer
            .write_all(&buf[..read])
            .map_err(|e| CoreError::io(dest, e))?;
    }
    writer.flush().map_err(|e| CoreError::io(dest, e))?;
    Ok(())
}

fn verify_copy(src: &Path, dest: &Path, rel_path: &str) -> CoreResult<()> {
    if hash_file(src)? == hash_file(dest)? {
        Ok(())
    } else {
        Err(CoreError::VerifyFailed {
            path: rel_path.to_string(),
        })
    }
}

fn hash_file(path: &Path) -> CoreResult<blake3::Hash> {
    let mut file = fs::File::open(path).map_err(|e| CoreError::io(path, e))?;
    let mut hasher = blake3::Hasher::new();
    io::copy(&mut file, &mut hasher).map_err(|e| CoreError::io(path, e))?;
    Ok(hasher.finalize())
}

fn log_error(rel_path: &str, message: &str) -> String {
    format!("chyba  {rel_path}  {message}")
}

fn partial_path(dest: &Path) -> PathBuf {
    let mut os = dest.as_os_str().to_owned();
    os.push(PARTIAL_SUFFIX);
    PathBuf::from(os)
}

/// Refuse to delete anything that is not strictly under the resolved target root.
fn ensure_inside_root(root: &Path, path: &Path) -> CoreResult<()> {
    let root = long_path(root);
    let path = long_path(path);
    let root_canon = fs::canonicalize(&root).unwrap_or(root);
    let path_canon = fs::canonicalize(&path).unwrap_or(path);
    if path_canon == root_canon || path_canon.starts_with(&root_canon) {
        Ok(())
    } else {
        Err(CoreError::io(
            path_canon,
            std::io::Error::new(
                std::io::ErrorKind::PermissionDenied,
                "delete path escaped target root",
            ),
        ))
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used)]
mod tests {
    use super::*;

    #[test]
    fn hashes_match_only_for_identical_bytes() {
        let dir = tempfile::tempdir().unwrap();
        let a = dir.path().join("a.bin");
        let b = dir.path().join("b.bin");
        fs::write(&a, b"same-length-aa").unwrap();
        fs::write(&b, b"same-length-bb").unwrap();
        assert_eq!(hash_file(&a).unwrap(), hash_file(&a).unwrap());
        assert_ne!(hash_file(&a).unwrap(), hash_file(&b).unwrap());
        assert!(verify_copy(&a, &b, "b.bin").is_err());
        fs::write(&b, b"same-length-aa").unwrap();
        assert!(verify_copy(&a, &b, "b.bin").is_ok());
    }
}
