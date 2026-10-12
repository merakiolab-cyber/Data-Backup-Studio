use std::path::Path;
use std::str::FromStr;
use std::sync::{Arc, Mutex};

use rusqlite::{Connection, OptionalExtension, params};
use uuid::Uuid;

use crate::domain::{BackupMode, Job, JobId, RunDetail, RunId, RunStatus, RunSummary, now_ms};
use crate::engine::{RunPhase, RunResult};
use crate::{CoreError, CoreResult};

pub const HISTORY_FILE: &str = "history.db";
const LIST_LIMIT: usize = 200;

/// SQLite store for backup runs. Lives next to `config.json` in the app config dir.
#[derive(Clone)]
pub struct HistoryStore {
    inner: Arc<Mutex<Connection>>,
}

impl HistoryStore {
    pub fn open(dir: &Path) -> CoreResult<Self> {
        std::fs::create_dir_all(dir).map_err(|e| CoreError::io(dir, e))?;
        let path = dir.join(HISTORY_FILE);
        let conn = Connection::open(&path).map_err(|e| db(&path, e))?;
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA foreign_keys = ON;
             CREATE TABLE IF NOT EXISTS runs (
               id TEXT PRIMARY KEY,
               job_id TEXT NOT NULL,
               job_name TEXT NOT NULL,
               mode TEXT NOT NULL,
               status TEXT NOT NULL,
               started_at_ms INTEGER NOT NULL,
               finished_at_ms INTEGER NOT NULL,
               copied INTEGER NOT NULL,
               updated INTEGER NOT NULL,
               deleted INTEGER NOT NULL,
               dirs_created INTEGER NOT NULL,
               bytes_copied INTEGER NOT NULL,
               error_count INTEGER NOT NULL
             );
             CREATE INDEX IF NOT EXISTS runs_started ON runs (started_at_ms DESC);
             CREATE INDEX IF NOT EXISTS runs_job ON runs (job_id, started_at_ms DESC);
             CREATE TABLE IF NOT EXISTS run_errors (
               id INTEGER PRIMARY KEY AUTOINCREMENT,
               run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
               message TEXT NOT NULL
             );",
        )
        .map_err(|e| db(&path, e))?;
        Ok(Self {
            inner: Arc::new(Mutex::new(conn)),
        })
    }

    fn lock(&self) -> CoreResult<std::sync::MutexGuard<'_, Connection>> {
        self.inner
            .lock()
            .map_err(|_| CoreError::Database("history database is locked".into()))
    }

    /// Records a finished engine result (done / cancelled). File-level errors stay in `errors`
    /// with status `Done`. Use [`Self::record_failure`] when the run never completed.
    pub fn record_result(
        &self,
        id: RunId,
        job: &Job,
        started_at_ms: u64,
        result: &RunResult,
    ) -> CoreResult<RunId> {
        let status = match result.phase {
            RunPhase::Done => RunStatus::Done,
            RunPhase::Cancelled => RunStatus::Cancelled,
            RunPhase::Failed | RunPhase::Copying | RunPhase::Deleting => RunStatus::Failed,
        };
        self.insert(
            id,
            RunWrite {
                job_id: job.id,
                job_name: job.name.clone(),
                mode: job.mode,
                status,
                started_at_ms,
                finished_at_ms: now_ms(),
                copied: result.copied,
                updated: result.updated,
                deleted: result.deleted,
                dirs_created: result.dirs_created,
                bytes_copied: result.bytes_copied,
                errors: result.errors.clone(),
            },
        )
    }

    /// Records a run that never started copying (preflight / planning error).
    pub fn record_failure(
        &self,
        id: RunId,
        job: &Job,
        started_at_ms: u64,
        message: String,
    ) -> CoreResult<RunId> {
        self.insert(
            id,
            RunWrite {
                job_id: job.id,
                job_name: job.name.clone(),
                mode: job.mode,
                status: RunStatus::Failed,
                started_at_ms,
                finished_at_ms: now_ms(),
                copied: 0,
                updated: 0,
                deleted: 0,
                dirs_created: 0,
                bytes_copied: 0,
                errors: vec![message],
            },
        )
    }

    fn insert(&self, id: RunId, row: RunWrite) -> CoreResult<RunId> {
        let conn = self.lock()?;
        conn.execute(
            "INSERT INTO runs (
               id, job_id, job_name, mode, status, started_at_ms, finished_at_ms,
               copied, updated, deleted, dirs_created, bytes_copied, error_count
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                id.0.to_string(),
                row.job_id.0.to_string(),
                row.job_name,
                mode_sql(row.mode),
                status_sql(row.status),
                row.started_at_ms as i64,
                row.finished_at_ms as i64,
                row.copied,
                row.updated,
                row.deleted,
                row.dirs_created,
                row.bytes_copied as i64,
                row.errors.len() as i64,
            ],
        )
        .map_err(|e| CoreError::Database(e.to_string()))?;
        for message in &row.errors {
            conn.execute(
                "INSERT INTO run_errors (run_id, message) VALUES (?1, ?2)",
                params![id.0.to_string(), message],
            )
            .map_err(|e| CoreError::Database(e.to_string()))?;
        }
        Ok(id)
    }

    pub fn list(&self, job_id: Option<JobId>) -> CoreResult<Vec<RunSummary>> {
        let conn = self.lock()?;
        let mut rows = Vec::new();
        if let Some(job_id) = job_id {
            let mut stmt = conn
                .prepare(
                    "SELECT id, job_id, job_name, mode, status, started_at_ms, finished_at_ms,
                            copied, updated, deleted, dirs_created, bytes_copied, error_count
                     FROM runs WHERE job_id = ?1
                     ORDER BY started_at_ms DESC LIMIT ?2",
                )
                .map_err(|e| CoreError::Database(e.to_string()))?;
            let mapped = stmt
                .query_map(
                    params![job_id.0.to_string(), LIST_LIMIT as i64],
                    map_summary,
                )
                .map_err(|e| CoreError::Database(e.to_string()))?;
            for row in mapped {
                rows.push(row.map_err(|e| CoreError::Database(e.to_string()))?);
            }
        } else {
            let mut stmt = conn
                .prepare(
                    "SELECT id, job_id, job_name, mode, status, started_at_ms, finished_at_ms,
                            copied, updated, deleted, dirs_created, bytes_copied, error_count
                     FROM runs ORDER BY started_at_ms DESC LIMIT ?1",
                )
                .map_err(|e| CoreError::Database(e.to_string()))?;
            let mapped = stmt
                .query_map(params![LIST_LIMIT as i64], map_summary)
                .map_err(|e| CoreError::Database(e.to_string()))?;
            for row in mapped {
                rows.push(row.map_err(|e| CoreError::Database(e.to_string()))?);
            }
        }
        Ok(rows)
    }

    pub fn latest(&self) -> CoreResult<Option<RunSummary>> {
        Ok(self.list(None)?.into_iter().next())
    }

    pub fn get(&self, id: RunId) -> CoreResult<RunDetail> {
        let conn = self.lock()?;
        let run = conn
            .query_row(
                "SELECT id, job_id, job_name, mode, status, started_at_ms, finished_at_ms,
                        copied, updated, deleted, dirs_created, bytes_copied, error_count
                 FROM runs WHERE id = ?1",
                params![id.0.to_string()],
                map_summary,
            )
            .optional()
            .map_err(|e| CoreError::Database(e.to_string()))?
            .ok_or(CoreError::RunNotFound)?;
        let mut stmt = conn
            .prepare("SELECT message FROM run_errors WHERE run_id = ?1 ORDER BY id")
            .map_err(|e| CoreError::Database(e.to_string()))?;
        let mapped = stmt
            .query_map(params![id.0.to_string()], |row| row.get(0))
            .map_err(|e| CoreError::Database(e.to_string()))?;
        let mut errors = Vec::new();
        for row in mapped {
            errors.push(row.map_err(|e| CoreError::Database(e.to_string()))?);
        }
        Ok(RunDetail { run, errors })
    }
}

struct RunWrite {
    job_id: JobId,
    job_name: String,
    mode: BackupMode,
    status: RunStatus,
    started_at_ms: u64,
    finished_at_ms: u64,
    copied: u32,
    updated: u32,
    deleted: u32,
    dirs_created: u32,
    bytes_copied: u64,
    errors: Vec<String>,
}

fn map_summary(row: &rusqlite::Row<'_>) -> rusqlite::Result<RunSummary> {
    Ok(RunSummary {
        id: RunId(parse_uuid(&row.get::<_, String>(0)?)?),
        job_id: JobId(parse_uuid(&row.get::<_, String>(1)?)?),
        job_name: row.get(2)?,
        mode: parse_mode(&row.get::<_, String>(3)?)?,
        status: parse_status(&row.get::<_, String>(4)?)?,
        started_at_ms: row.get::<_, i64>(5)? as u64,
        finished_at_ms: row.get::<_, i64>(6)? as u64,
        copied: row.get::<_, i64>(7)? as u32,
        updated: row.get::<_, i64>(8)? as u32,
        deleted: row.get::<_, i64>(9)? as u32,
        dirs_created: row.get::<_, i64>(10)? as u32,
        bytes_copied: row.get::<_, i64>(11)? as u64,
        error_count: row.get::<_, i64>(12)? as u32,
    })
}

fn parse_uuid(value: &str) -> rusqlite::Result<Uuid> {
    Uuid::from_str(value).map_err(|e| {
        rusqlite::Error::FromSqlConversionFailure(0, rusqlite::types::Type::Text, Box::new(e))
    })
}

fn mode_sql(mode: BackupMode) -> &'static str {
    match mode {
        BackupMode::Mirror => "mirror",
        BackupMode::Update => "update",
    }
}

fn status_sql(status: RunStatus) -> &'static str {
    match status {
        RunStatus::Done => "done",
        RunStatus::Cancelled => "cancelled",
        RunStatus::Failed => "failed",
    }
}

fn parse_mode(value: &str) -> rusqlite::Result<BackupMode> {
    match value {
        "mirror" => Ok(BackupMode::Mirror),
        "update" => Ok(BackupMode::Update),
        other => Err(bad_sql(other)),
    }
}

fn parse_status(value: &str) -> rusqlite::Result<RunStatus> {
    match value {
        "done" => Ok(RunStatus::Done),
        "cancelled" => Ok(RunStatus::Cancelled),
        "failed" => Ok(RunStatus::Failed),
        other => Err(bad_sql(other)),
    }
}

fn bad_sql(value: &str) -> rusqlite::Error {
    rusqlite::Error::FromSqlConversionFailure(
        0,
        rusqlite::types::Type::Text,
        Box::new(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            format!("unexpected history value {value}"),
        )),
    )
}

fn db(path: &Path, source: rusqlite::Error) -> CoreError {
    CoreError::Database(format!("{}: {source}", path.display()))
}

#[cfg(test)]
#[allow(clippy::expect_used, clippy::unwrap_used)]
mod tests {
    use super::*;
    use crate::domain::{Location, VolumeId};

    fn job(name: &str) -> Job {
        Job {
            id: JobId::new(),
            name: name.into(),
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
    fn records_and_lists_runs() {
        let dir = tempfile::tempdir().expect("temp dir");
        let store = HistoryStore::open(dir.path()).expect("open");
        let fotky = job("Fotky");
        let docs = job("Dokumenty");
        store
            .record_result(
                RunId::new(),
                &fotky,
                1_000,
                &RunResult {
                    phase: RunPhase::Done,
                    copied: 3,
                    updated: 1,
                    deleted: 0,
                    dirs_created: 1,
                    bytes_copied: 12_000,
                    errors: Vec::new(),
                },
            )
            .expect("record");
        store
            .record_failure(
                RunId::new(),
                &docs,
                2_000,
                "Cílový disk není připojený.".into(),
            )
            .expect("fail");

        let all = store.list(None).expect("list");
        assert_eq!(all.len(), 2);
        assert_eq!(all[0].job_name, "Dokumenty");
        assert_eq!(all[0].status, RunStatus::Failed);
        assert_eq!(all[1].job_name, "Fotky");
        assert_eq!(all[1].copied, 3);

        let only = store.list(Some(fotky.id)).expect("filter");
        assert_eq!(only.len(), 1);
        assert_eq!(only[0].job_name, "Fotky");

        let detail = store.get(all[0].id).expect("detail");
        assert_eq!(
            detail.errors,
            vec!["Cílový disk není připojený.".to_owned()]
        );
        assert_eq!(
            store.latest().expect("latest").map(|r| r.job_name),
            Some("Dokumenty".into())
        );
    }

    #[test]
    fn file_errors_still_count_as_done() {
        let dir = tempfile::tempdir().expect("temp dir");
        let store = HistoryStore::open(dir.path()).expect("open");
        let job = job("Fotky");
        let id = RunId::new();
        store
            .record_result(
                id,
                &job,
                1_000,
                &RunResult {
                    phase: RunPhase::Done,
                    copied: 0,
                    updated: 0,
                    deleted: 0,
                    dirs_created: 0,
                    bytes_copied: 0,
                    errors: vec!["I/O error at x: crc".into()],
                },
            )
            .expect("record");
        let summary = store.list(None).expect("list")[0].clone();
        assert_eq!(summary.status, RunStatus::Done);
        assert_eq!(summary.error_count, 1);
        let detail = store.get(id).expect("detail");
        assert_eq!(detail.errors.len(), 1);
    }
}
