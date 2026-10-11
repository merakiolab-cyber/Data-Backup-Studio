# Data Backup Studio

[English README](README.en.md) · [Instalátor v1.0.0](https://github.com/merakiolab-cyber/data-backup-studio/releases/tag/v1.0.0)

Offline desktopová aplikace pro Windows na zálohování složek z disků počítače na externí USB disky.

- **Pravidla nastavíš jednou** – co, kam a jakým režimem (Zrcadlo / Aktualizace).
- **Nezáleží na písmenu disku** – USB disk se pozná podle vlastní identity, i když je jednou `F:` a jindy `G:`.
- **Soubory 1:1** – záloha je běžná složka, otevřeš ji i bez aplikace.
- **Bezpečné** – náhled před spuštěním, pojistky proti nechtěnému smazání, žádná síť.

![Přehled Data Backup Studio: dlaždice disků a úloh, karta Statistiky](assets/abckup-preview.png)

## Jak začít

1. **Zaregistruj cílový USB disk** na obrazovce Disky. Do kořene se zapíše skrytá značka, podle které disk poznáme i po změně písmene.
2. **Vytvoř úlohu** – vyber zdrojovou složku, cílový disk a složku, režim (Zrcadlo = přesný otisk včetně mazání; Aktualizace = jen nové a změněné, nic se nemaže). Existující soubory v cíli Zrcadlo nepřepisuje, pokud mají stejnou velikost a čas.
3. **Spusť zálohu** z Přehledu nebo z karty úlohy. Nejdřív uvidíš náhled (co se ponechá / zkopíruje / smaže), teprve potom běh. Běh jde minimalizovat a během něj používat aplikaci; další úlohy se řadí do fronty.

Konfigurace a historie běhů jsou jen v `%APPDATA%\app.databackupstudio\` (úlohy, disky, `history.db`, logy). Na zálohovacím disku je jen běžná kopie složek a značka `.databackupstudio`.

Licence: [MIT](LICENSE).

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
