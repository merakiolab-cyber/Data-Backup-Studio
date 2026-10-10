# UI / UX – design systém

Moderní, čistý, minimalistický **pastelový „soft“ styl** postavený na komponentách MUI
s vlastními tokeny (rozhodnutí: [ADR 0004](decisions/0004-visual-style.md)). Jazyk UI: čeština.

## Zásady
1. **Jedna hlavní akce na obrazovce** – na přehledu je to „Spustit“.
2. **Stav na první pohled** – u každé úlohy je vidět: disk připojen/nepřipojen, poslední běh, výsledek.
3. **Bezpečí před rychlostí** – destruktivní akce (mazání v Zrcadle) vždy s náhledem a potvrzením.
4. **Žádný technický šum** – uživatel vidí název disku („WD Černý 2 TB“), písmeno jen jako doplněk.
5. **Klávesnice a přístupnost** – fokus viditelný, kontrast WCAG AA, ovládání bez myši.

## Rozvržení
- Pozadí: jemný přechod mint → levandule přes celé okno.
- Vlevo úzký **sidebar**: černé kulaté logo, pill skupina kulatých ikonových odkazů
  (Přehled · Disky · Historie) s tooltipem a červeným badge počtu, dole Nastavení.
- Titulek obrazovky na pozadí, obsah na velkém bílém listu (zaoblení 32 px, max. ~1120 px).
- Mřížka 8 px, karty 24–28 px, tlačítka a chipy pill. Minimální velikost okna 960×640.

## Obrazovky
| Obrazovka | Obsah |
|---|---|
| Přehled | Pastelové dlaždice (připojené disky, úlohy, poslední záloha), karty úloh, „Nová úloha“, „Spustit vše“ |
| Editor úlohy | Název, zdroj (výběr složky), cíl (registrovaný disk + složka), režim (přepínač), vyloučení (chips) |
| Náhled plánu | Souhrn: kopírovat / aktualizovat / smazat (počty, objem), rozbalitelný seznam, „Spustit“ |
| Běh | Lineární průběh, rychlost, ETA, aktuální soubor, „Zrušit“ |
| Disky | Karty cílových disků (mint = připojený, lemon = potřebuje ověřit, bílá = nepřipojený), seznam externích a interních disků s „Registrovat“ |
| Historie | Tabulka běhů, filtr podle úlohy, detail chyb |
| Nastavení | Téma (systém/světlé/tmavé), počet souběžných kopií, tolerance času, práh mazání, export/import |

## Barvy a typografie
- Tokeny v `src/app/theme/tokens.ts`, v komponentách přes `ds(theme)`; světlá i tmavá varianta.
- Pastely: mint `#8FF2AA` (OK), lemon `#F1F47F` (pozor), lilac `#D4BDF4`, peach `#F6A88E`, sky `#AEE3F4`.
  Text na pastelu tmavý inkoust `#121417`. Hlavní CTA = černé pill tlačítko.
- Stav vždy ikonou + textem, ne jen barvou.
- Písmo **Urbanist Variable** přes `@fontsource-variable` (offline). Velká čísla smíšenou vahou
  (`SplitValue`: „**1**,2 TB“, „**1**/3“).
- Ikony: **lucide-react**, tenká linka 1.6, v kulatých bublinách (`IconBubble`).

## Pohyb
- Krátké přechody 150–250 ms. Respektovat `prefers-reduced-motion`.

## Texty (mikrocopy)
- Tykání, krátce, slovesem: „Spustit zálohu“, „Registrovat disk“.
- Chyby říkají, co se stalo a co dělat: „Disk ‚WD Černý‘ není připojen. Připoj ho a zkus to znovu.“

## Náhled v prohlížeči
`pnpm dev` otevřený v běžném prohlížeči (mimo Tauri) načte DEV-only `src/dev/demoIpc.ts`
se smyšlenými disky – slouží k vizuální kontrole a snímkům. Do produkčního buildu se nedostane.
