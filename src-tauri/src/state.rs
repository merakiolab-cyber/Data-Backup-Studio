use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, MutexGuard};
use std::time::{Duration, Instant};

use backup_core::domain::UiLocale;
use backup_core::storage::{ConfigStore, HistoryStore};
use backup_core::volumes::{self, LiveVolume};

use crate::error::{AppError, AppResult, ShellKind, current_locale};

const LIVE_CACHE_TTL: Duration = Duration::from_millis(1200);

struct LiveSnapshot {
    at: Instant,
    volumes: Vec<LiveVolume>,
}

pub struct RunSlot {
    pub cancel: Arc<AtomicBool>,
    pub running: bool,
}

#[derive(Clone)]
pub struct AppState {
    data_dir: PathBuf,
    config: Arc<Mutex<ConfigStore>>,
    history: HistoryStore,
    live: Arc<Mutex<Option<LiveSnapshot>>>,
    pub(crate) run: Arc<Mutex<RunSlot>>,
}

impl AppState {
    pub fn new(data_dir: PathBuf, store: ConfigStore, history: HistoryStore) -> Self {
        Self {
            data_dir,
            config: Arc::new(Mutex::new(store)),
            history,
            live: Arc::new(Mutex::new(None)),
            run: Arc::new(Mutex::new(RunSlot {
                cancel: Arc::new(AtomicBool::new(false)),
                running: false,
            })),
        }
    }

    pub fn data_dir(&self) -> &PathBuf {
        &self.data_dir
    }

    pub fn locale(&self) -> UiLocale {
        self.config
            .lock()
            .ok()
            .map(|store| store.config().settings.locale)
            .unwrap_or_else(current_locale)
    }

    pub fn config(&self) -> AppResult<MutexGuard<'_, ConfigStore>> {
        self.config
            .lock()
            .map_err(|_| AppError::shell(ShellKind::ConfigLocked, current_locale(), None))
    }

    pub fn history(&self) -> &HistoryStore {
        &self.history
    }

    /// Shared live-volume list for UI polling. Mutations and backup runs enumerate fresh.
    pub fn list_live(&self) -> AppResult<Vec<LiveVolume>> {
        if let Ok(guard) = self.live.lock()
            && let Some(snapshot) = guard.as_ref()
            && snapshot.at.elapsed() < LIVE_CACHE_TTL
        {
            return Ok(snapshot.volumes.clone());
        }
        let volumes = volumes::enumerate()?;
        if let Ok(mut guard) = self.live.lock() {
            *guard = Some(LiveSnapshot {
                at: Instant::now(),
                volumes: volumes.clone(),
            });
        }
        Ok(volumes)
    }

    pub fn invalidate_live(&self) {
        if let Ok(mut guard) = self.live.lock() {
            *guard = None;
        }
    }

    pub fn begin_run(&self) -> AppResult<Arc<AtomicBool>> {
        let locale = self.locale();
        let mut run = self
            .run
            .lock()
            .map_err(|_| AppError::shell(ShellKind::RunLocked, locale, None))?;
        if run.running {
            return Err(AppError::shell(ShellKind::RunBusy, locale, None));
        }
        run.cancel.store(false, Ordering::Relaxed);
        run.running = true;
        Ok(run.cancel.clone())
    }

    pub fn end_run(&self) {
        if let Ok(mut run) = self.run.lock() {
            run.running = false;
        }
    }

    pub fn request_cancel(&self) {
        if let Ok(run) = self.run.lock() {
            run.cancel.store(true, Ordering::Relaxed);
        }
    }
}
