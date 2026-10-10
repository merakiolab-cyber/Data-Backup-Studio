//! Diagnostics: prints mounted volumes as JSON. Run: `cargo run -p backup-core --example list_volumes`

fn main() {
    match backup_core::volumes::enumerate() {
        Ok(volumes) => match serde_json::to_string_pretty(&volumes) {
            Ok(json) => println!("{json}"),
            Err(err) => eprintln!("{err}"),
        },
        Err(err) => eprintln!("{err}"),
    }
}
