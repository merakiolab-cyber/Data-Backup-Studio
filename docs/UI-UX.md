# UI / UX – design systém

Moderní, čistý, minimalistický **Material Design 3** (MUI s vlastním tématem). Jazyk UI: čeština.

## Zásady
1. **Jedna hlavní akce na obrazovce** – na přehledu je to „Spustit“.
2. **Stav na první pohled** – u každé úlohy je vidět: disk připojen/nepřipojen, poslední běh, výsledek.
3. **Bezpečí před rychlostí** – destruktivní akce (mazání v Zrcadle) vždy s náhledem a potvrzením.
4. **Žádný technický šum** – uživatel vidí název disku („WD Černý 2 TB“), písmeno jen jako doplněk.
5. **Klávesnice a přístupnost** – fokus viditelný, kontrast WCAG AA, ovládání bez myši.

## Rozvržení
- Vlevo **Navigation Rail**: Přehled · Disky · Historie · Nastavení.
- Obsah ve sloupci max. ~1100 px, mřížka 8 px, zaoblení 12–16 px (M3).
- Minimální velikost okna 960×640.

## Obrazovky
| Obrazovka | Obsah |
|---|---|
| Přehled | Karty úloh (název, zdroj → cíl, režim, stav disků, poslední běh), FAB „Nová úloha“, tlačítko „Spustit vše“ |
| Editor úlohy | Název, zdroj (výběr složky), cíl (výběr registrovaného disku + složky), režim (segmented button), vyloučení (chips) |
| Náhled plánu | Souhrn: kopírovat / aktualizovat / smazat (počty, objem), rozbalitelný seznam, „Spustit“ |
| Běh | Lineární průběh, rychlost, ETA, aktuální soubor, „Zrušit“ |
| Disky | Seznam registrovaných disků se stavem a aktuálním písmenem, „Registrovat disk“ |
| Historie | Tabulka běhů, filtr podle úlohy, detail chyb |
| Nastavení | Téma (systém/světlé/tmavé), počet souběžných kopií, tolerance času, práh mazání, export/import |

## Barvy a typografie
- Barvy generované z jedné seed barvy (M3 tonal palette), výchozí seed `#3D5AFE` (indigo).
- Sémantické barvy: úspěch (zelená), varování (jantarová), chyba (červená) – vždy doplněné ikonou, ne jen barvou.
- Písmo **Roboto Flex** přes `@fontsource` (offline). Typografická škála M3 (Display/Headline/Title/Body/Label).
- Ikony: Material Symbols Rounded (`@mui/icons-material`, varianta Rounded).

## Pohyb
- Krátké přechody 150–250 ms, easing M3 „emphasized“. Respektovat `prefers-reduced-motion`.

## Texty (mikrocopy)
- Tykání, krátce, slovesem: „Spustit zálohu“, „Registrovat disk“.
- Chyby říkají, co se stalo a co dělat: „Disk ‚WD Černý‘ není připojen. Připoj ho a zkus to znovu.“
