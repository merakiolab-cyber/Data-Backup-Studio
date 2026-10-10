---
name: release-offline
description: Sestavení a archivace offline release Data Backup Studio – kontroly, audit závislostí, bump verze, NSIS instalátor s přibaleným WebView2, portable exe a archiv pro budoucí offline build. Použij, když uživatel chce vydat verzi, udělat build, instalátor, release nebo zálohovat aplikaci pro offline použití.
---

# Offline release

```
Postup:
- [ ] 1. Kontroly a testy
- [ ] 2. Audit závislostí
- [ ] 3. Bump verze + CHANGELOG
- [ ] 4. Build
- [ ] 5. Archivace
- [ ] 6. Git tag
```

1. `pnpm check` · `pnpm test` · `cargo test --workspace` – vše musí projít.
2. `cargo audit` a `pnpm audit --prod` – kritické nálezy řeš před vydáním.
3. Verze `X.Y.Z` shodně v `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`;
   v `CHANGELOG.md` přejmenuj `[Unreleased]` na `[X.Y.Z] – RRRR-MM-DD` (skill `project-memory`).
4. `pnpm tauri build`. V `tauri.conf.json` musí být
   `bundle.windows.webviewInstallMode.type = "offlineInstaller"` a target `nsis`.
5. Do `releases/X.Y.Z/` zkopíruj:
   - instalátor z `target/release/bundle/nsis/*.exe`,
   - portable `target/release/data-backup-studio.exe`,
   - `SHA256SUMS.txt` (`Get-FileHash -Algorithm SHA256`),
   - volitelně zdrojový archiv s `cargo vendor` (`vendor/` + `.cargo/config.toml`) pro build bez internetu.
   Doporuč uživateli kopii `releases/X.Y.Z/` i na každý zálohovací disk.
6. `git commit -m "chore(release): vX.Y.Z"` a `git tag vX.Y.Z`.
