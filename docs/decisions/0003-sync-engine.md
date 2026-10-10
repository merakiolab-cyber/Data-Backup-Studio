# 0003 – Vlastní synchronizační engine, soubory 1:1
- Stav: Přijato
- Datum: 2026-10-10

## Kontext
Potřebné režimy: Zrcadlo a Aktualizace. Záloha musí být čitelná i bez aplikace.
Robocopy by šlo obalit, ale nedává strukturovaný průběh, náhled plánu ani vlastní pojistky.

## Rozhodnutí
Engine v `crates/backup-core`: scan → diff → plán → (náhled) → execute.
- Porovnání podle velikosti a mtime s tolerancí 2 s; volitelné ověření blake3.
- Kopie přes dočasný `.dbs-partial` + atomický rename.
- Mazání jen v režimu Zrcadlo, až po kopírování, s pojistkami (prázdný zdroj, práh mazání).
- Symlinky/junctiony se nenásledují.

## Důsledky
- Plná kontrola nad bezpečností a UX (náhled, průběh, zrušení).
- Engine je nutné důkladně testovat – integrační testy na dočasných složkách jsou povinné.
