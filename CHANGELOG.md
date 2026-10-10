# Changelog

Formát podle [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/), verzování [SemVer](https://semver.org/lang/cs/).
Sekce `[Unreleased]` slouží jako paměť rozpracované práce – AI i člověk ji čtou jako první.

## [Unreleased]

### Přidáno
- Kostra aplikace (fáze 1): Tauri 2.12 + React 19 + TypeScript 7 (strict) + Vite 8, pnpm 12.
- Cargo workspace: `crates/backup-core` (logika bez Tauri) a `src-tauri` (tenký shell).
- Typově bezpečné volání backendu přes tauri-specta; `src/lib/bindings.ts` generuje
  `cargo test --workspace` i `pnpm tauri dev`. Ukázkový příkaz `app_info` (verze v Nastavení).
- Material 3 téma pro MUI 9 (seed indigo `#3D5AFE`, světlý/tmavý/systémový režim),
  Navigation Rail, prázdné obrazovky Přehled, Disky, Historie, Nastavení (přepínač vzhledu funguje).
- Ikona aplikace (`src-tauri/icons/app-icon.svg` → vygenerované ikony pro Windows).
- Windows manifest (Common Controls v6, podpora cest > 260 znaků, PerMonitorV2 DPI) linkovaný
  do aplikace i testů – bez něj testy s Tauri padají na `STATUS_ENTRYPOINT_NOT_FOUND`.
- Kontroly `pnpm check` (Biome, tsc, rustfmt, clippy `-D warnings`), testy Vitest + cargo test.
- Bezpečnost: CSP bez externích zdrojů, `freezePrototype`, capabilities jen `core:default`
  a `dialog:allow-open`; NSIS instalátor s offline WebView2, instalace pro aktuálního uživatele.
- Pravidlo a fáze 7 roadmapy pro budoucí zveřejnění repa na GitHubu bez osobních dat.
- Základ repozitáře: architektura, roadmapa, UI/UX zásady, ADR 0001–0003, Cursor rules a skills.

### Poznámky
- Vite dev server běží na portu **1427** (1420 obsazuje jiný projekt).

### Další krok
- Fáze 2 – enumerace svazků přes Win32 API (`crates/backup-core/src/volumes/`),
  registrace cílového disku značkovým souborem a obrazovka „Disky“.
