# Architektonická rozhodnutí (ADR)

Každé zásadní rozhodnutí = jeden soubor `NNNN-kratky-nazev.md` podle šablony níže.
Rozhodnutí se nepřepisují – když se změní, vznikne nové ADR se stavem „Nahrazuje NNNN“.

| # | Rozhodnutí | Stav |
|---|---|---|
| [0001](0001-tauri-desktop-app.md) | Desktop aplikace v Tauri 2 místo webové aplikace | Přijato |
| [0002](0002-volume-identity.md) | Identifikace disků nezávislá na písmenu jednotky | Přijato |
| [0003](0003-sync-engine.md) | Vlastní synchronizační engine v Rustu, soubory 1:1 | Přijato |
| [0004](0004-visual-style.md) | Pastelový „soft“ vizuální styl místo čistého Material 3 | Přijato |
| [0005](0005-job-locations.md) | Umístění zdroje a cíle úlohy, zdrojové disky bez značky | Přijato |
| [0006](0006-run-history.md) | Historie běhů v SQLite (`history.db` v APPDATA) | Přijato |
| [0007](0007-app-settings.md) | Nastavení enginu v `config.json` v3, export/import | Přijato |
| [0008](0008-copy-verify-blake3.md) | Volitelné ověření kopií hashem blake3 | Přijato |
| [0009](0009-ui-locale.md) | Jazyk UI (cs/en) v nastavení, bez i18n knihovny | Přijato |
| [0010](0010-run-session-ui.md) | Běh jako app-wide session: minimalizace, fronta, rychlé zrušení | Přijato |
| [0011](0011-job-groups.md) | Skupiny úloh v `config.json` v4, sbalitelné sekce na stránce Úlohy | Přijato |
| [0012](0012-volume-change-events.md) | Obnova disků přes `WM_DEVICECHANGE` místo pollingu | Přijato |

## Šablona

```markdown
# NNNN – Název
- Stav: Navrženo | Přijato | Nahrazeno (NNNN)
- Datum: RRRR-MM-DD

## Kontext
## Rozhodnutí
## Důsledky
```
