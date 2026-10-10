# Changelog

Formát podle [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/), verzování [SemVer](https://semver.org/lang/cs/).
Sekce `[Unreleased]` slouží jako paměť rozpracované práce – AI i člověk ji čtou jako první.

## [Unreleased]

### Přidáno
- **Disky (fáze 2)**: aplikace načte připojené disky z Windows včetně sběrnice (USB/SATA/NVMe),
  modelu, sériového čísla a volného místa. Disk jde zaregistrovat jako cílový – do jeho kořene
  se zapíše skrytá značka `.databackupstudio\volume.json` a disk je pak rozpoznán pod jakýmkoli písmenem.
- Stav registrovaného disku: připojený (s aktuálním písmenem), nepřipojený, nebo „potřebuje ověřit“
  (změněné sériové číslo, chybějící značka, dva disky se stejnou identitou) s tlačítkem „Potvrdit disk“.
- Přejmenování a odebrání disku z aplikace (data na disku zůstávají).
- Konfigurace `config.json` v `%APPDATA%\app.databackupstudio\` s transakčním atomickým zápisem a zálohou `.bak`.
- Diagnostický příklad `cargo run -p backup-core --example list_volumes`.
- Testy: 25 v jádře (resolver, značka, registr, konfigurace), frontend testy obrazovky Disky a formátování velikostí.
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
- Aplikace spuštěná AI agentem běží v izolovaném prostředí a okno není vidět – vizuální kontrolu
  dělá uživatel přes `pnpm tauri dev`.

### Další krok
- Ruční test fáze 2 se skutečnými USB disky (registrace, přepojení → jiné písmeno, stav se nezmění).
- Fáze 3 – úlohy: doména `Job`/`Location`, uložení do `config.json`, editor úlohy a přehled.
