# Roadmapa

Živý dokument. Po dokončení úkolu ho odškrtni a zapiš změnu do `CHANGELOG.md`.
Stav: `[ ]` čeká · `[~]` rozpracováno · `[x]` hotovo

## Fáze 0 – Základ repozitáře
- [x] Architektura, stack, roadmapa, UI/UX zásady, ADR
- [x] Cursor rules + skills, AGENTS.md, CHANGELOG
- [x] Git, `.gitignore`, `.editorconfig`, `.gitattributes`

## Fáze 1 – Kostra aplikace
- [ ] Scaffold Tauri 2 + React + TS + Vite (pnpm)
- [ ] Cargo workspace: `crates/backup-core` + `src-tauri`
- [ ] Biome, clippy, rustfmt, skripty `pnpm check` / `pnpm test`
- [ ] MUI téma (M3 barvy, světlý/tmavý), navigační rail, prázdné obrazovky
- [ ] `tauri-specta` – generované TS bindings
- [ ] Minimální capabilities + CSP

## Fáze 2 – Disky (identita svazků)
- [ ] Enumerace svazků (písmeno, jmenovka, sériové č., GUID, velikost, volné místo, typ)
- [ ] Registrace cílového disku (značkový soubor `.databackupstudio/volume.json`)
- [ ] Resolver `VolumeRef → aktuální písmeno` + varování při nesouladu
- [ ] Obrazovka „Disky“ s živým stavem připojení

## Fáze 3 – Úlohy (pravidla)
- [ ] Doména `Job`, `Location`, validace
- [ ] Úložiště `config.json` (atomický zápis, verze schématu)
- [ ] Editor úlohy: zdroj, cíl, režim, vyloučení
- [ ] Přehled úloh (karty se stavem disků a posledním během)

## Fáze 4 – Engine
- [ ] Scan (jwalk) + filtry (globset)
- [ ] Diff → plán, tolerance mtime
- [ ] Náhled plánu (dry-run) v UI
- [ ] Execute: `.dbs-partial` + rename, mtime, paralelismus, zrušení
- [ ] Pojistky Zrcadla (prázdný zdroj, práh mazání)
- [ ] Průběh přes události (rychlost, ETA, aktuální soubor)
- [ ] Integrační testy enginu

## Fáze 5 – Historie a diagnostika
- [ ] `history.db` (SQLite) – běhy, chyby
- [ ] Obrazovka „Historie“ s detailem chyb
- [ ] Logy do souborů s rotací

## Fáze 6 – Dotažení a release
- [ ] Nastavení (téma, počet vláken, tolerance, práh mazání), export/import konfigurace
- [ ] „Spustit vše“ (sekvenčně, jen úlohy s připojenými disky)
- [ ] Volitelné ověření kopií (blake3)
- [ ] NSIS instalátor s offline WebView2 + portable exe
- [ ] v1.0.0

## Nápady na později
- Automatické spuštění po připojení disku
- Plánovač (denně/týdně)
- Verzování přepsaných/smazaných souborů
- VSS snapshoty pro zamčené soubory (vyžaduje admin)
