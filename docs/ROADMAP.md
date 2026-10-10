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
- [ ] Ruční test se skutečnými USB disky (registrace, přepojení do jiného portu → jiné písmeno)
- [ ] Později: místo pollingu reagovat na `WM_DEVICECHANGE` (nebudit spící USB disky)

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

## Fáze 7 – Zveřejnění na GitHubu (portfolio)
Až bude aplikace hotová a odladěná.
- [ ] Audit historie gitu na osobní data (`git log -p`, hledání cest, jmen disků, sériových čísel)
- [ ] Rozhodnout e-mail autora commitů (veřejný vs. GitHub `noreply`), případně přepsat historii
- [ ] Ověřit, že konfigurace a historie běhů jsou jen v `%APPDATA%`, nikdy v repu
- [ ] LICENSE (předběžně MIT), README v angličtině + screenshoty s fiktivními daty
- [ ] GitHub Actions: `pnpm check`, testy, build instalátoru
- [ ] Release na GitHubu s instalátorem a SHA256

## Nápady na později
- Automatické spuštění po připojení disku
- Plánovač (denně/týdně)
- Verzování přepsaných/smazaných souborů
- VSS snapshoty pro zamčené soubory (vyžaduje admin)
