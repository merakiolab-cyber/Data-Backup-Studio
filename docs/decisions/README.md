# Architektonická rozhodnutí (ADR)

Každé zásadní rozhodnutí = jeden soubor `NNNN-kratky-nazev.md` podle šablony níže.
Rozhodnutí se nepřepisují – když se změní, vznikne nové ADR se stavem „Nahrazuje NNNN“.

| # | Rozhodnutí | Stav |
|---|---|---|
| [0001](0001-tauri-desktop-app.md) | Desktop aplikace v Tauri 2 místo webové aplikace | Přijato |
| [0002](0002-volume-identity.md) | Identifikace disků nezávislá na písmenu jednotky | Přijato |
| [0003](0003-sync-engine.md) | Vlastní synchronizační engine v Rustu, soubory 1:1 | Přijato |
| [0004](0004-visual-style.md) | Pastelový „soft“ vizuální styl místo čistého Material 3 | Přijato |

## Šablona

```markdown
# NNNN – Název
- Stav: Navrženo | Přijato | Nahrazeno (NNNN)
- Datum: RRRR-MM-DD

## Kontext
## Rozhodnutí
## Důsledky
```
