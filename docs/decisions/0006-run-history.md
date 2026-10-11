# 0006 – Historie běhů v SQLite
- Stav: Přijato
- Datum: 2026-10-11

## Kontext
Po každé záloze potřebujeme vědět, kdy běžela, jak dopadla a které soubory selhaly.
Souborové logy přijdou později; Přehled a karty úloh potřebují rychlý souhrn.

## Rozhodnutí
- Úložiště `history.db` (SQLite, `rusqlite` s feature `bundled`) jen v
  `%APPDATA%\app.databackupstudio\`, vedle `config.json`. Do repozitáře se nedostane.
- Ukládáme souhrn běhu (identifikátor úlohy, název v okamžiku běhu, režim, počty,
  zkopírované byty, stav) a texty chyb. Žádné písmeno disku ani absolutní cesta.
- Zápis po `run_job`: úspěch / zrušení / selhání enginu i předčasné chyby (prázdný zdroj,
  odpojený disk). Selhání zápisu historie nesmí zrušit výsledek zálohy.

## Důsledky
- Historie přežije smazání nebo přejmenování úlohy (název je snímek).
- SQLite je přibalené – žádná systémová knihovna, aplikace zůstává offline.
- Textové logy běhů jsou v `logs\{run_id}.log` (rotace na 80 souborů); souhrn zůstává v SQLite.
