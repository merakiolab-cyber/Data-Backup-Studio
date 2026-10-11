//! Integration tests: Mirror keeps an exact imprint; Update never deletes; empty source is safe.
#![allow(clippy::unwrap_used, clippy::expect_used)]

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, SystemTime};

use backup_core::CoreError;
use backup_core::domain::{BackupMode, Job, JobId, Location, VolumeId, VolumeMarker};
use backup_core::engine::{self, RunPhase};
use backup_core::storage::Config;
use backup_core::volumes::{BusKind, DriveKind, LiveVolume};
use filetime::{FileTime, set_file_mtime};
use tempfile::TempDir;

struct World {
    _tmp: TempDir,
    source_root: PathBuf,
    target_root: PathBuf,
    config: Config,
    live: Vec<LiveVolume>,
    job_id: JobId,
}

fn write_file(path: &Path, bytes: &[u8], secs: u64) {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).unwrap();
    }
    fs::write(path, bytes).unwrap();
    set_file_mtime(
        path,
        FileTime::from_system_time(SystemTime::UNIX_EPOCH + Duration::from_secs(secs)),
    )
    .unwrap();
}

fn world(mode: BackupMode) -> World {
    let tmp = TempDir::new().unwrap();
    let source_mount = tmp.path().join("src_vol");
    let target_mount = tmp.path().join("dst_vol");
    fs::create_dir_all(source_mount.join("Fotky")).unwrap();
    fs::create_dir_all(&target_mount).unwrap();

    let source_id = VolumeId::new();
    let target_id = VolumeId::new();
    let job_id = JobId::new();

    let live = vec![
        LiveVolume {
            guid_path: r"\\?\Volume{src-demo}\".into(),
            mount_point: format!("{}\\", source_mount.display()),
            label: "Data".into(),
            serial: 0x2222_0000,
            file_system: "NTFS".into(),
            drive_kind: DriveKind::Fixed,
            bus: BusKind::Sata,
            model: Some("Internal".into()),
            total_bytes: 500_000_000_000,
            free_bytes: 200_000_000_000,
            is_system: false,
            is_external: false,
            marker: None,
        },
        LiveVolume {
            guid_path: r"\\?\Volume{dst-demo}\".into(),
            mount_point: format!("{}\\", target_mount.display()),
            label: "Zaloha".into(),
            serial: 0x1234_ABCD,
            file_system: "NTFS".into(),
            drive_kind: DriveKind::Fixed,
            bus: BusKind::Usb,
            model: Some("WD Elements 25A2".into()),
            total_bytes: 2_000_000_000_000,
            free_bytes: 1_000_000_000_000,
            is_system: false,
            is_external: true,
            marker: Some(VolumeMarker {
                version: VolumeMarker::VERSION,
                id: target_id,
                name: "WD Elements 2 TB".into(),
                created_at_ms: 0,
            }),
        },
    ];

    let mut config = Config::default();
    config.sources.push(backup_core::domain::SourceVolume {
        id: source_id,
        name: "Data".into(),
        serial: 0x2222_0000,
        guid_path: live[0].guid_path.clone(),
    });
    config.volumes.push(backup_core::domain::RegisteredVolume {
        id: target_id,
        name: "WD Elements 2 TB".into(),
        serial: 0x1234_ABCD,
        guid_path: live[1].guid_path.clone(),
        file_system: "NTFS".into(),
        model: Some("WD Elements 25A2".into()),
        total_bytes: 2_000_000_000_000,
        registered_at_ms: 0,
    });
    config.jobs.push(Job {
        id: job_id,
        name: "Fotky".into(),
        source: Location {
            volume_id: source_id,
            rel_path: "Fotky".into(),
        },
        target: Location {
            volume_id: target_id,
            rel_path: r"Zaloha\Fotky".into(),
        },
        mode,
        excludes: Vec::new(),
        group_id: None,
        created_at_ms: 0,
        updated_at_ms: 0,
    });

    World {
        source_root: source_mount.join("Fotky"),
        target_root: target_mount.join("Zaloha").join("Fotky"),
        _tmp: tmp,
        config,
        live,
        job_id,
    }
}

fn run(world: &World, confirm: bool) -> backup_core::engine::RunResult {
    let cancel = AtomicBool::new(false);
    engine::run_job(
        &world.config,
        &world.live,
        world.job_id,
        confirm,
        &cancel,
        |_| {},
        |_| {},
    )
    .unwrap()
}

#[test]
fn mirror_first_run_copies_everything_then_keeps_exact_imprint() {
    let w = world(BackupMode::Mirror);
    write_file(&w.source_root.join("a.txt"), b"aaa", 100);
    write_file(&w.source_root.join("Album").join("b.jpg"), b"bb", 110);

    let first = run(&w, false);
    assert_eq!(first.phase, RunPhase::Done);
    assert_eq!(first.copied, 2);
    assert_eq!(fs::read(w.target_root.join("a.txt")).unwrap(), b"aaa");
    assert_eq!(
        fs::read(w.target_root.join("Album").join("b.jpg")).unwrap(),
        b"bb"
    );

    // Change, add, remove – next Mirror run must leave an exact imprint.
    write_file(&w.source_root.join("a.txt"), b"AAA!", 200);
    write_file(&w.source_root.join("new.txt"), b"new", 210);
    fs::remove_file(w.source_root.join("Album").join("b.jpg")).unwrap();

    // Deleting 1 of 2 target files exceeds the 20 % threshold – confirm explicitly.
    let second = run(&w, true);
    assert_eq!(second.phase, RunPhase::Done);
    assert_eq!(second.updated, 1);
    assert_eq!(second.copied, 1);
    assert_eq!(second.deleted, 1);
    assert_eq!(fs::read(w.target_root.join("a.txt")).unwrap(), b"AAA!");
    assert_eq!(fs::read(w.target_root.join("new.txt")).unwrap(), b"new");
    assert!(!w.target_root.join("Album").join("b.jpg").exists());
}

#[test]
fn mirror_adopts_existing_target_without_recopying() {
    let w = world(BackupMode::Mirror);
    write_file(&w.source_root.join("keep.txt"), b"same", 100);
    write_file(&w.source_root.join("new.txt"), b"fresh", 110);
    write_file(&w.source_root.join("changed.txt"), b"NEW", 200);
    fs::create_dir_all(&w.target_root).unwrap();
    write_file(&w.target_root.join("keep.txt"), b"same", 100);
    write_file(&w.target_root.join("changed.txt"), b"old", 50);
    write_file(&w.target_root.join("stale.txt"), b"gone", 10);

    let plan = engine::plan_job(&w.config, &w.live, w.job_id).unwrap();
    assert_eq!(plan.summary.copy, 1);
    assert_eq!(plan.summary.update, 1);
    assert_eq!(plan.summary.delete, 1);

    let result = run(&w, true);
    assert_eq!(result.phase, RunPhase::Done);
    assert_eq!(result.copied, 1);
    assert_eq!(result.updated, 1);
    assert_eq!(result.deleted, 1);
    assert_eq!(fs::read(w.target_root.join("keep.txt")).unwrap(), b"same");
    assert_eq!(fs::read(w.target_root.join("new.txt")).unwrap(), b"fresh");
    assert_eq!(fs::read(w.target_root.join("changed.txt")).unwrap(), b"NEW");
    assert!(!w.target_root.join("stale.txt").exists());
}

#[test]
fn update_mode_keeps_files_removed_from_source() {
    let w = world(BackupMode::Update);
    write_file(&w.source_root.join("keep.txt"), b"k", 10);
    write_file(&w.source_root.join("gone.txt"), b"g", 10);
    run(&w, false);
    fs::remove_file(w.source_root.join("gone.txt")).unwrap();

    let result = run(&w, false);
    assert_eq!(result.deleted, 0);
    assert!(w.target_root.join("gone.txt").exists());
}

#[test]
fn empty_source_does_not_wipe_target() {
    let w = world(BackupMode::Mirror);
    write_file(&w.source_root.join("only.txt"), b"x", 1);
    run(&w, false);
    fs::remove_file(w.source_root.join("only.txt")).unwrap();

    let err = engine::plan_job(&w.config, &w.live, w.job_id).unwrap_err();
    assert!(matches!(err, CoreError::SourceEmpty));
    assert!(w.target_root.join("only.txt").exists());
}

#[test]
fn cancel_leaves_no_partial_and_keeps_existing_target() {
    let w = world(BackupMode::Mirror);
    write_file(&w.source_root.join("ok.txt"), b"ok", 1);
    write_file(&w.source_root.join("big.bin"), &vec![7u8; 64 * 1024], 2);
    // Seed the target so we can prove it is not corrupted.
    fs::create_dir_all(&w.target_root).unwrap();
    write_file(&w.target_root.join("ok.txt"), b"old", 1);

    let cancel = AtomicBool::new(false);
    cancel.store(true, Ordering::Relaxed);
    let result =
        engine::run_job(&w.config, &w.live, w.job_id, false, &cancel, |_| {}, |_| {}).unwrap();
    assert_eq!(result.phase, RunPhase::Cancelled);

    let partials: Vec<_> = walkdir_partials(&w.target_root);
    assert!(partials.is_empty(), "leftover partials: {partials:?}");
    assert_eq!(fs::read(w.target_root.join("ok.txt")).unwrap(), b"old");
}

#[test]
fn cancel_stops_during_large_file_copy() {
    let mut w = world(BackupMode::Mirror);
    w.config.settings.copy_parallelism = 1;
    // Several MiB so cancel can land between chunks (1 MiB each).
    write_file(
        &w.source_root.join("big.bin"),
        &vec![7u8; 8 * 1024 * 1024],
        2,
    );

    let cancel = Arc::new(AtomicBool::new(false));
    let flag = cancel.clone();
    let result = engine::run_job(
        &w.config,
        &w.live,
        w.job_id,
        false,
        cancel.as_ref(),
        |progress| {
            if progress.phase == RunPhase::Copying && progress.current_path.is_some() {
                // Cancel after the first progress tick so we interrupt mid-file.
                flag.store(true, Ordering::Relaxed);
            }
        },
        |_| {},
    )
    .unwrap();
    assert_eq!(result.phase, RunPhase::Cancelled);
    let partials: Vec<_> = walkdir_partials(&w.target_root);
    assert!(partials.is_empty(), "leftover partials: {partials:?}");
    assert!(
        !w.target_root.join("big.bin").exists(),
        "cancelled mid-copy must not leave a finished destination"
    );
}

#[test]
fn verify_copies_accepts_matching_files() {
    let mut w = world(BackupMode::Mirror);
    w.config.settings.verify_copies = true;
    write_file(&w.source_root.join("a.txt"), b"hello-verify", 10);
    write_file(&w.source_root.join("Album").join("b.jpg"), b"bytes", 11);

    let result = run(&w, false);
    assert_eq!(result.phase, RunPhase::Done);
    assert_eq!(result.copied, 2);
    assert!(result.errors.is_empty());
    assert_eq!(
        fs::read(w.target_root.join("a.txt")).unwrap(),
        b"hello-verify"
    );
}

#[test]
fn exclude_patterns_skip_matching_source_files() {
    let mut w = world(BackupMode::Mirror);
    w.config.jobs[0].excludes = vec!["*.tmp".into()];
    write_file(&w.source_root.join("keep.txt"), b"k", 1);
    write_file(&w.source_root.join("junk.tmp"), b"j", 1);

    let plan = engine::plan_job(&w.config, &w.live, w.job_id).unwrap();
    assert_eq!(plan.summary.copy, 1);
    run(&w, false);
    assert!(w.target_root.join("keep.txt").exists());
    assert!(!w.target_root.join("junk.tmp").exists());
}

fn walkdir_partials(root: &Path) -> Vec<PathBuf> {
    let mut found = Vec::new();
    if !root.exists() {
        return found;
    }
    for entry in jwalk::WalkDir::new(root).into_iter().flatten() {
        if entry.file_name().to_string_lossy().contains(".dbs-partial") {
            found.push(entry.path());
        }
    }
    found
}
