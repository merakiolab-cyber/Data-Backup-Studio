# Data Backup Studio

Offline desktopová aplikace pro Windows na zálohování složek z disků počítače na externí USB disky.

- **Pravidla nastavíš jednou** – co, kam a jakým režimem (Zrcadlo / Aktualizace).
- **Nezáleží na písmenu disku** – USB disk se pozná podle vlastní identity, i když je jednou `F:` a jindy `G:`.
- **Soubory 1:1** – záloha je běžná složka, otevřeš ji i bez aplikace.
- **Bezpečné** – náhled před spuštěním, pojistky proti nechtěnému smazání, žádná síť.

## Dokumentace
- [Architektura a stack](docs/ARCHITECTURE.md)
- [Roadmapa](docs/ROADMAP.md)
- [UI/UX zásady](docs/UI-UX.md)
- [Rozhodnutí (ADR)](docs/decisions/README.md)
- [Changelog](CHANGELOG.md)

## Vývoj
Požadavky: Windows 10/11, Rust stable, Node.js 22+, pnpm, WebView2.

```powershell
pnpm install
pnpm tauri dev      # spuštění ve vývojovém režimu
pnpm check          # lint + typy + clippy + rustfmt
pnpm test           # testy frontendu
cargo test --workspace
```

Postup vytvoření offline instalátoru: `.cursor/skills/release-offline/SKILL.md`.
