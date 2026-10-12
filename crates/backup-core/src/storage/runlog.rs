use std::fs::{self, File, OpenOptions};
use std::io::{BufWriter, Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};

use crate::domain::{BackupMode, Job, RunId, now_ms};
use crate::engine::{RunPhase, RunResult};
use crate::{CoreError, CoreResult};

pub const LOGS_DIR: &str = "logs";
pub const KEEP_LOGS: usize = 80;
const MAX_READ_BYTES: u64 = 200_000;

/// One text file per backup run, named `{run_id}.log` under `logs/` in the app config dir.
pub struct RunLog {
    writer: BufWriter<File>,
}

impl RunLog {
    pub fn create(config_dir: &Path, id: RunId, job: &Job) -> CoreResult<Self> {
        let dir = config_dir.join(LOGS_DIR);
        fs::create_dir_all(&dir).map_err(|e| CoreError::io(&dir, e))?;
        let path = run_log_path(config_dir, id);
        let file = OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(true)
            .open(&path)
            .map_err(|e| CoreError::io(&path, e))?;
        let mut writer = BufWriter::new(file);
        let mode = match job.mode {
            BackupMode::Mirror => "Zrcadlo",
            BackupMode::Update => "Aktualizace",
        };
        writeln!(
            writer,
            "Data Backup Studio – záznam běhu\núloha: {}\nrežim: {}\nzahájeno: {}\n",
            job.name,
            mode,
            utc_stamp(now_ms())
        )
        .map_err(|e| CoreError::io(&path, e))?;
        Ok(Self { writer })
    }

    pub fn line(&mut self, text: &str) {
        let _ = writeln!(self.writer, "{text}");
    }

    pub fn finish(&mut self, result: &RunResult) {
        let status = match result.phase {
            RunPhase::Done if result.errors.is_empty() => "hotovo".to_string(),
            RunPhase::Done => format!("hotovo ({} souborů se nepodařilo)", result.errors.len()),
            RunPhase::Cancelled => "zrušeno".into(),
            RunPhase::Failed | RunPhase::Copying | RunPhase::Deleting => "selhalo".into(),
        };
        let _ = writeln!(
            self.writer,
            "\nstav: {status}\nzkopírováno: {}  aktualizováno: {}  smazáno: {}  složek: {}  bytů: {}\ndokončeno: {}",
            result.copied,
            result.updated,
            result.deleted,
            result.dirs_created,
            result.bytes_copied,
            utc_stamp(now_ms())
        );
        let _ = self.writer.flush();
    }

    pub fn fail(&mut self, message: &str) {
        self.line(&format!("selhání  {message}"));
        let _ = writeln!(
            self.writer,
            "\nstav: selhalo\ndokončeno: {}",
            utc_stamp(now_ms())
        );
        let _ = self.writer.flush();
    }
}

pub fn read_log(config_dir: &Path, id: RunId) -> CoreResult<Option<String>> {
    let path = run_log_path(config_dir, id);
    let mut file = match File::open(&path) {
        Ok(file) => file,
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(err) => return Err(CoreError::io(&path, err)),
    };
    let len = file.metadata().map_err(|e| CoreError::io(&path, e))?.len();
    if len > MAX_READ_BYTES {
        file.seek(SeekFrom::End(-(MAX_READ_BYTES as i64)))
            .map_err(|e| CoreError::io(&path, e))?;
        let mut tail = String::new();
        file.read_to_string(&mut tail)
            .map_err(|e| CoreError::io(&path, e))?;
        if let Some(cut) = tail.find('\n') {
            tail = tail[cut + 1..].to_owned();
        }
        Ok(Some(format!(
            "… začátek záznamu je zkrácený ({len} B).\n{tail}"
        )))
    } else {
        let mut text = String::new();
        file.read_to_string(&mut text)
            .map_err(|e| CoreError::io(&path, e))?;
        Ok(Some(text))
    }
}

/// Keeps the newest `keep` log files; older ones are deleted.
pub fn prune_logs(config_dir: &Path, keep: usize) -> CoreResult<()> {
    let dir = config_dir.join(LOGS_DIR);
    if !dir.exists() {
        return Ok(());
    }
    let mut files: Vec<(std::time::SystemTime, PathBuf)> = Vec::new();
    for entry in fs::read_dir(&dir).map_err(|e| CoreError::io(&dir, e))? {
        let entry = entry.map_err(|e| CoreError::io(&dir, e))?;
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("log") {
            continue;
        }
        let modified = entry
            .metadata()
            .and_then(|m| m.modified())
            .unwrap_or(std::time::SystemTime::UNIX_EPOCH);
        files.push((modified, path));
    }
    files.sort_by(|a, b| b.0.cmp(&a.0));
    for (_, path) in files.into_iter().skip(keep) {
        let _ = fs::remove_file(path);
    }
    Ok(())
}

pub fn run_log_path(config_dir: &Path, id: RunId) -> PathBuf {
    config_dir.join(LOGS_DIR).join(format!("{}.log", id.0))
}

fn utc_stamp(ms: u64) -> String {
    let secs = ms / 1000;
    let days = secs / 86_400;
    let tod = secs % 86_400;
    let (year, month, day) = civil_from_days(days);
    format!(
        "{year:04}-{month:02}-{day:02} {:02}:{:02}:{:02} UTC",
        tod / 3600,
        (tod / 60) % 60,
        tod % 60
    )
}

/// Howard Hinnant's civil-from-days (UTC), days since 1970-01-01.
fn civil_from_days(days: u64) -> (i32, u32, u32) {
    let z = i64::try_from(days).unwrap_or(i64::MAX) + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = y + i64::from(m <= 2);
    (year as i32, m as u32, d as u32)
}

#[cfg(test)]
#[allow(clippy::expect_used, clippy::unwrap_used)]
mod tests {
    use super::*;
    use crate::domain::{JobId, Location, VolumeId};

    fn job() -> Job {
        Job {
            id: JobId::new(),
            name: "Fotky".into(),
            source: Location {
                volume_id: VolumeId::new(),
                rel_path: "Fotky".into(),
            },
            target: Location {
                volume_id: VolumeId::new(),
                rel_path: r"Zaloha\Fotky".into(),
            },
            mode: BackupMode::Mirror,
            excludes: Vec::new(),
            group_id: None,
            created_at_ms: 0,
            updated_at_ms: 0,
        }
    }

    #[test]
    fn writes_reads_and_prunes_logs() {
        let dir = tempfile::tempdir().expect("temp");
        let id = RunId::new();
        let mut log = RunLog::create(dir.path(), id, &job()).expect("create");
        log.line(r"kopie  Album\nova.jpg  2000");
        log.finish(&RunResult {
            phase: RunPhase::Done,
            copied: 1,
            updated: 0,
            deleted: 0,
            dirs_created: 0,
            bytes_copied: 2_000,
            errors: Vec::new(),
        });
        drop(log);

        let text = read_log(dir.path(), id).expect("read").expect("present");
        assert!(text.contains("úloha: Fotky"));
        assert!(text.contains(r"kopie  Album\nova.jpg  2000"));
        assert!(text.contains("stav: hotovo"));

        for _ in 0..5 {
            let extra = RunId::new();
            let mut other = RunLog::create(dir.path(), extra, &job()).expect("extra");
            other.line("kopie  x");
            let _ = other.writer.flush();
        }
        prune_logs(dir.path(), 3).expect("prune");
        let left: Vec<_> = fs::read_dir(dir.path().join(LOGS_DIR))
            .unwrap()
            .filter_map(|e| e.ok())
            .collect();
        assert_eq!(left.len(), 3);
        assert!(read_log(dir.path(), id).expect("old").is_none());
    }

    #[test]
    fn utc_stamp_is_stable() {
        assert_eq!(utc_stamp(0), "1970-01-01 00:00:00 UTC");
        assert_eq!(utc_stamp(1_609_459_200_000), "2021-01-01 00:00:00 UTC");
    }
}
