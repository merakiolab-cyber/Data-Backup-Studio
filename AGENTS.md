# AGENTS.md – kontext pro AI asistenta

**Data Backup Studio** – offline desktop aplikace (Windows) pro zálohování složek z interních
disků na externí USB disky. Alternativa ke Cobian Reflectoru, která řeší měnící se písmena disků.

## Než začneš pracovat
1. Přečti `CHANGELOG.md` (sekce `[Unreleased]` = rozpracovaný stav) a `docs/ROADMAP.md`.
2. Pro architekturu `docs/ARCHITECTURE.md`, pro UI `docs/UI-UX.md`, rozhodnutí v `docs/decisions/`.
3. Dodržuj pravidla v `.cursor/rules/`.

## Stack
Tauri 2 · Rust (`crates/backup-core` = logika, `src-tauri` = tenký shell) · React 19 + TS strict +
Vite · MUI (Material 3 téma) · TanStack Query + Zustand · tauri-specta · Biome · pnpm.

## Příkazy
| Účel | Příkaz |
|---|---|
| Vývoj | `pnpm tauri dev` (Vite na portu 1427) |
| Kontroly (lint, typy, clippy, fmt) | `pnpm check` |
| Automatické opravy formátu | `pnpm format` |
| Testy | `pnpm test` (Vitest) · `cargo test --workspace` (zároveň přegeneruje `src/lib/bindings.ts`) |
| Release build | viz skill `.cursor/skills/release-offline` |

## Po dokončení každé změny
Použij skill `.cursor/skills/project-memory`: aktualizuj `CHANGELOG.md`, `docs/ROADMAP.md`
a při zásadním rozhodnutí přidej ADR.

## Neporušitelné zásady
- Nikdy neukládat cesty s písmenem disku – vždy `Location { volume_id, rel_path }`.
- Engine nesmí smazat data v cíli, pokud je zdroj prázdný/nedostupný.
- Žádné síťové požadavky, CDN ani telemetrie – aplikace je 100 % offline.
- UI texty česky, kód/identifikátory/commity anglicky.
