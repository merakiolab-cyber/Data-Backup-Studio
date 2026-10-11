# Roadmapa

Živý dokument. Po dokončení úkolu ho odškrtni a zapiš změnu do `CHANGELOG.md`.
Stav: `[ ]` čeká · `[~]` rozpracováno · `[x]` hotovo

## Fáze 0 – Základ repozitáře
- [x] Architektura, stack, roadmapa, UI/UX zásady, ADR
- [x] Cursor rules + skills, AGENTS.md, CHANGELOG
- [x] Git, `.gitignore`, `.editorconfig`, `.gitattributes`

## Fáze 1 – Kostra aplikace
- [x] Scaffold Tauri 2 + React + TS + Vite (pnpm)
- [x] Cargo workspace: `crates/backup-core` + `src-tauri`
- [x] Biome, clippy, rustfmt, skripty `pnpm check` / `pnpm test`
- [x] MUI téma (M3 barvy, světlý/tmavý), navigační rail, prázdné obrazovky
- [x] `tauri-specta` – generované TS bindings
- [x] Minimální capabilities + CSP
- [x] Windows manifest (Common Controls v6, long paths, DPI) pro aplikaci i testy

## Fáze 2 – Disky (identita svazků)
- [x] Enumerace svazků (písmeno, jmenovka, sériové č., GUID, velikost, volné místo, typ, sběrnice, model)
- [x] Registrace cílového disku (značkový soubor `.databackupstudio/volume.json`)
- [x] Resolver `VolumeRef → aktuální písmeno` + varování při nesouladu a potvrzení disku
- [x] Obrazovka „Disky“ s živým stavem připojení, přejmenování, odebrání
- [x] Ruční test se skutečnými USB disky (registrace, přepojení do jiného portu → jiné písmeno)
- [x] Místo pollingu reagovat na `WM_DEVICECHANGE` (nebudit spící USB disky; ADR 0012)

## Fáze 3 – Úlohy (pravidla)
- [x] Doména `Job`, `Location`, validace (cesty, překryvy, vzory vyloučení)
- [x] Úložiště `config.json` (atomický zápis, schéma v2 s migrací z v1)
- [x] Zdrojové disky bez značky (GUID + sériové číslo), výběr složky přes dialog → `locate_folder`
- [x] Editor úlohy: zdroj, cíl, režim, vyloučení, název
- [x] Přehled úloh (karty se stavem disků a posledním během) – samostatná stránka Úlohy v menu
- [x] Skupiny úloh (pojmenování podle záložního disku, sbalitelné sekce, schéma v4)
- [x] Karta Statistiky na Přehledu (disky, úlohy, počet záloh a zkopírovaný objem)
- [x] Ruční test se skutečnými disky (vytvořit úlohu, přepojit USB → cesta na kartě se změní)

## Fáze 4 – Engine
- [x] Scan (jwalk) + filtry (globset)
- [x] Diff → plán, tolerance mtime 2 s (existující cíl se přebírá, nekopíruje se znovu)
- [x] Náhled plánu (dry-run) v UI + Spustit na kartě úlohy
- [x] Execute: `.dbs-partial` + rename, mtime, zrušení i uprostřed souboru (1 MB bloky)
- [x] Pojistky Zrcadla (prázdný zdroj, práh mazání 20 %)
- [x] Průběh `run-progress` (fáze, soubor, byty, rychlost, ETA)
- [x] Integrační testy enginu (`tests/engine_mirror.rs`) včetně převzetí existujícího cíle
- [x] Paralelní kopírování (konfigurovatelný počet pracovníků)
- [x] Rychlost a ETA v UI průběhu
- [x] Minimalizace běhu + fronta dalších úloh (ADR 0010)

## Fáze 5 – Historie a diagnostika
- [x] `history.db` (SQLite) – běhy, chyby
- [x] Obrazovka „Historie“ s detailem chyb
- [x] Logy do souborů s rotací

## Fáze 6 – Dotažení a release
- [x] Nastavení (téma, jazyk cs/en, počet vláken, tolerance, práh mazání), export/import konfigurace
- [x] „Spustit vše“ / označené (sekvenčně, jen úlohy s připojenými disky)
- [x] Volitelné ověření kopií (blake3)
- [x] Otevření složek v Průzkumníku (úloha, data aplikace), Spustit na Přehledu
- [x] Kompletní audit bezpečnosti, čistoty a efektivity kódu (validace importu, cache enumerace, bez Zustand)
- [x] Úklid repa (nepoužívané ikony/konstanty, `.gitignore` pro `gen/`, bez `dist/` v pracovním stromu)
- [x] Zrcadlo přebírá existující zálohu (diff i při prvním běhu; vysvětlivky v UI)
- [x] NSIS instalátor s offline WebView2 + portable exe (`releases/0.1.0/`, mimo git)
- [x] v1.0.0 (2026-10-11 – tag `v1.0.0`, artefakty v `releases/1.0.0/` mimo git)

## Fáze 7 – Zveřejnění na GitHubu (portfolio)
Až bude aplikace hotová a odladěná.
- [x] Audit historie gitu na osobní data (2026-10-11: jen fiktivní `D:\Fotky`, `WD Elements 25A2`,
  `0x1234ABCD`; žádné `C:\Users\<jméno>` ani reálné sériové číslo)
- [x] Commit e-mail jen GitHub noreply (osobní e-mail v historii ani v dokumentaci není)
- [x] Konfigurace a historie běhů jen v `%APPDATA%` (v repu nejsou `config.json` / `history.db`;
  `.gitignore` má `*.db` a `releases/`)
- [x] LICENSE (MIT); README česky + screenshot s fiktivními daty
- [x] README v angličtině (`README.en.md`)
- [x] GitHub Actions: `pnpm check`, testy, `cargo test --workspace`; na `main`/`master` i `pnpm tauri build` (artefakty)
- [x] Release na GitHubu s instalátorem a SHA256
  (https://github.com/merakiolab-cyber/data-backup-studio/releases/tag/v1.0.0)

## Nápady na později
- Automatické spuštění po připojení disku
- Plánovač (denně/týdně)
- Verzování přepsaných/smazaných souborů
- VSS snapshoty pro zamčené soubory (vyžaduje admin)
