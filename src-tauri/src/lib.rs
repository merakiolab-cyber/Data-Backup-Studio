mod commands;
mod error;
mod state;

use backup_core::storage::ConfigStore;
use tauri::Manager;
use tauri_specta::{Builder, collect_commands};

use crate::state::AppState;

const BINDINGS_PATH: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../src/lib/bindings.ts");

fn specta_builder() -> Builder<tauri::Wry> {
    Builder::<tauri::Wry>::new().commands(collect_commands![
        commands::app::app_info,
        commands::volumes::list_volumes,
        commands::volumes::register_volume,
        commands::volumes::rename_volume,
        commands::volumes::unregister_volume,
        commands::volumes::confirm_volume,
    ])
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
            app.manage(AppState::new(ConfigStore::open(&config_dir)?));
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
