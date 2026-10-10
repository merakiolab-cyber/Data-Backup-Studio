fn main() {
    // The manifest is linked into every binary (including test harnesses), otherwise tests that
    // link Tauri crash on Windows with STATUS_ENTRYPOINT_NOT_FOUND (missing Common Controls v6).
    let windows = tauri_build::WindowsAttributes::new_without_app_manifest();
    if let Err(err) =
        tauri_build::try_build(tauri_build::Attributes::new().windows_attributes(windows))
    {
        panic!("tauri-build failed: {err:#}");
    }

    let manifest =
        std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("windows-app-manifest.xml");
    println!("cargo:rerun-if-changed={}", manifest.display());
    println!("cargo:rustc-link-arg=/MANIFEST:EMBED");
    println!("cargo:rustc-link-arg=/MANIFESTINPUT:{}", manifest.display());
}
