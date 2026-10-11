# 0008 – Volitelné ověření kopií (blake3)
- Stav: Přijato
- Datum: 2026-10-11

## Kontext
Kopírování přes `.dbs-partial` + rename chrání před nedokončeným zápisem, ale neodhalí
tichou chybu disku (špatný sektor, přerušený USB přenos). ARCHITECTURE počítala s volitelným
hashem.

## Rozhodnutí
- Závislost `blake3` (nejrychlejší kryptografický hash, bez extra features).
- Nastavení `verifyCopies` (výchozí vypnuto) v `settings`. Schéma zůstává v3 – chybějící pole
  se doplní výchozí hodnotou (`#[serde(default)]`).
- Po zápisu `.dbs-partial` a před přejmenováním se porovná hash zdroje a kopie. Nesoulad
  smaže partial a soubor v cíli se nezapíše.

## Důsledky
- Zapnuté ověření čte každý zkopírovaný soubor dvakrát – vhodné na nespolehlivé USB.
- Mazání v Zrcadle pořád až po kopiích; ověření se týká jen Copy/Update.
