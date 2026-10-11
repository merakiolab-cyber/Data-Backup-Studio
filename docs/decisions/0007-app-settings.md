# 0007 – Nastavení enginu v config.json
- Stav: Přijato
- Datum: 2026-10-11

## Kontext
Tolerance mtime, práh mazání Zrcadla a počet souběžných kopií byly konstanty. Uživatel potřebuje
je přizpůsobit disku (USB HDD vs. SSD) a exportovat konfiguraci bez historie běhů.

## Rozhodnutí
- Schéma `config.json` v3 přidává `settings` (`copyParallelism` 1–8, `mtimeToleranceSecs` 0–10,
  `deleteThresholdPercent` 5–80). Starší soubory se doplní výchozími hodnotami.
- Export/import zapisuje jen konfiguraci (úlohy, disky, nastavení). `history.db` a `logs/`
  zůstávají v APPDATA.
- Žádné písmeno disku v exportu.

## Důsledky
- Starší build odmítne v3 místo tichého zahození nastavení.
- Paralelní kopírování čte `copyParallelism`; mazání v Zrcadle zůstává až po kopiích.
