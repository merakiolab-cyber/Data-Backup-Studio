use std::sync::{Arc, Mutex, MutexGuard};

use backup_core::storage::ConfigStore;

use crate::error::{AppError, AppResult};

#[derive(Clone)]
pub struct AppState {
    config: Arc<Mutex<ConfigStore>>,
}

impl AppState {
    pub fn new(store: ConfigStore) -> Self {
        Self {
            config: Arc::new(Mutex::new(store)),
        }
    }

    pub fn config(&self) -> AppResult<MutexGuard<'_, ConfigStore>> {
        self.config
            .lock()
            .map_err(|_| AppError::Internal("Interní chyba: konfigurace je zamčená.".into()))
    }
}
