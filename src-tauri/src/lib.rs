mod commands;
mod device_watch;
mod error;
mod state;

use backup_core::storage::{ConfigStore, HistoryStore};
use tauri::Manager;
use tauri_specta::{Builder, collect_commands, collect_events};

use crate::commands::run::RunProgressEvent;
use crate::device_watch::VolumesChangedEvent;
use crate::state::AppState;

const BINDINGS_PATH: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../src/lib/bindings.ts");

fn specta_builder() -> Builder<tauri::Wry> {
    Builder::<tauri::Wry>::new()
        .commands(collect_commands![
            commands::app::app_info,
            commands::app::open_location,
            commands::app::open_data_dir,
            commands::volumes::list_volumes,
            commands::volumes::register_volume,
            commands::volumes::rename_volume,
            commands::volumes::unregister_volume,
            commands::volumes::confirm_volume,
            commands::volumes::reorder_volumes,
            commands::jobs::list_jobs,
            commands::jobs::locate_folder,
            commands::jobs::create_job,
            commands::jobs::update_job,
            commands::jobs::delete_job,
            commands::jobs::create_job_group,
            commands::jobs::rename_job_group,
            commands::jobs::delete_job_group,
            commands::jobs::set_jobs_group,
            commands::run::preview_job,
            commands::run::run_job,
            commands::run::cancel_run,
            commands::history::list_runs,
            commands::history::get_run,
            commands::history::get_run_log,
            commands::history::open_run_log,
            commands::settings::get_settings,
            commands::settings::update_settings,
            commands::settings::export_config,
            commands::settings::import_config,
        ])
        .events(collect_events![RunProgressEvent, VolumesChangedEvent])
}

fn export_bindings(builder: &Builder<tauri::Wry>) -> Result<(), String> {
    builder
        .export(specta_typescript::Typescript::default(), BINDINGS_PATH)
        .map_err(|err| err.to_string())
}

pub fn run() {
    let builder = specta_builder();

    #[cfg(debug_assertions)]
    if let Err(err) = export_bindings(&builder) {
        eprintln!("Failed to export TypeScript bindings: {err}");
    }

    let result = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(builder.invoke_handler())
        .setup(move |app| {
            builder.mount_events(app);
            let config_dir = app.path().app_config_dir()?;
            app.manage(AppState::new(
                config_dir.clone(),
                ConfigStore::open(&config_dir)?,
                HistoryStore::open(&config_dir)?,
            ));
            device_watch::start(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!());

    if let Err(err) = result {
        eprintln!("Failed to run Data Backup Studio: {err}");
        std::process::exit(1);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Keeps `src/lib/bindings.ts` in sync; run `cargo test --workspace` after changing commands.
    #[test]
    fn export_typescript_bindings() {
        assert_eq!(export_bindings(&specta_builder()), Ok(()));
    }
}
