---
name: project-memory
description: Udržuje paměť projektu Data Backup Studio – aktualizuje CHANGELOG.md, docs/ROADMAP.md a zakládá ADR v docs/decisions/. Použij na konci každého úkolu, který mění kód nebo dokumentaci, při dokončení fáze roadmapy, při architektonickém rozhodnutí nebo když uživatel řekne „zapiš changelog“, „ulož stav“, „co jsme udělali“.
---

# Paměť projektu

## Na konci každého úkolu
1. **CHANGELOG.md → `[Unreleased]`** – přidej odrážky do správné sekce:
   `Přidáno` · `Změněno` · `Opraveno` · `Odstraněno` · `Bezpečnost`.
   Piš pro člověka, co se změnilo z pohledu uživatele/vývojáře, ne výpis souborů.
2. Aktualizuj podsekci **`### Další krok`** – 1–3 odrážky, kde má příští sezení navázat
   (včetně rozpracovaných věcí a známých problémů).
3. **docs/ROADMAP.md** – odškrtni hotové `[x]`, rozpracované `[~]`, nové úkoly doplň do fáze.
4. Pokud padlo zásadní rozhodnutí (nová závislost, změna architektury, formátu dat, bezpečnosti)
   → založ ADR (viz níže) a přidej řádek do tabulky v `docs/decisions/README.md`.

## Příklad zápisu
```markdown
## [Unreleased]
### Přidáno
- Obrazovka „Disky“: seznam registrovaných disků s aktuálním písmenem a stavem připojení.
### Opraveno
- Resolver disků ignoroval svazky bez písmene (připojené do složky).
### Další krok
- Registrace disku: zápis značkového souboru + test na disku bez práv zápisu.
```

## ADR
Soubor `docs/decisions/NNNN-kratky-nazev.md` (další volné číslo), šablona v
`docs/decisions/README.md`. Stará ADR se nepřepisují – nové ADR uvede „Nahrazuje NNNN“.

## Vydání verze
Při release přejmenuj `[Unreleased]` na `[X.Y.Z] – RRRR-MM-DD`, nad ním založ prázdné
`[Unreleased]`. Verzi drž shodnou v `package.json`, `src-tauri/Cargo.toml`, `tauri.conf.json`.
