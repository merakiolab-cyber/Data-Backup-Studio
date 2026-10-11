# UI / UX – design systém

Moderní, čistý, minimalistický **pastelový „soft“ styl** postavený na komponentách MUI
s vlastními tokeny (rozhodnutí: [ADR 0004](decisions/0004-visual-style.md)). Jazyk UI: čeština
(výchozí), v Nastavení lze přepnout na angličtinu ([ADR 0009](decisions/0009-ui-locale.md)).

## Zásady
1. **Jedna hlavní akce na obrazovce** – na přehledu je to „Spustit“.
2. **Stav na první pohled** – u každé úlohy je vidět: disk připojen/nepřipojen, poslední běh, výsledek.
3. **Bezpečí před rychlostí** – destruktivní akce (mazání v Zrcadle) vždy s náhledem a potvrzením.
4. **Žádný technický šum** – uživatel vidí název disku („WD Černý 2 TB“), písmeno jen jako doplněk.
5. **Klávesnice a přístupnost** – fokus viditelný, kontrast WCAG AA, ovládání bez myši.

## Rozvržení
- Pozadí: jemný přechod mint → levandule přes celé okno.
- Vlevo úzký **sidebar**: tučné geometrické logo (vrstvené D, bez kruhu), pill skupina kulatých ikonových odkazů
  (Přehled · Úlohy · Disky · Historie) s tooltipem a červeným badge počtu, dole Nastavení.
- Titulek obrazovky na pozadí, obsah na velkém bílém listu (zaoblení 32 px, na celou šířku okna).
- Mřížka 8 px, karty 24–28 px, tlačítka a chipy pill. Minimální velikost okna 960×640.
- Mřížky karet (`cardGridSx` v `layout.ts`): šířka vždy 100 %; sloupce 1 → 2 → 3 → 4 podle okna
  (Úlohy, Disky, Přehled, volba režimu).

## Obrazovky
| Obrazovka | Obsah |
|---|---|
| Přehled | Dlaždice; zelené **Spustit vše**; tabulka **Stáří záloh** (úloha, disk, naposledy, pill stáří, tečky běhů); Statistiky |
| Úlohy (`#/ulohy`) | V záhlaví vedle sebe zelené „Spustit vše“ a „Nová úloha“; skupiny se plynule sbalí; klik na dlaždici ji označí (mint); výběr skupiny i všech úloh; přesun přetažením, „Přesunout do“, nebo skupinou v editoru |
| Editor úlohy | Název, zdroj (výběr složky), cíl (registrovaný disk + složka), režim (přepínač), vyloučení (chips) |
| Náhled plánu | Souhrn: ponechat / kopírovat / aktualizovat / smazat (počty, objem), rozbalitelný seznam, „Spustit“ |
| Běh | Dialog s průběhem (rychlost, ETA, soubor), **Minimalizovat** → lišta dole (`ActiveRunBar`); „Zrušit“ reaguje i uprostřed velkého souboru; další úlohy do fronty (ADR 0010) |
| Disky | Karty cílových disků (mint = připojený, lemon = potřebuje ověřit, bílá = nepřipojený); od dvou disků **přetažením** změníš pořadí zobrazení; seznam externích a interních disků s „Registrovat“ |
| Historie | Seznam běhů, filtr podle úlohy; detail běhu (4K layout, filtry akcí v textovém logu, **Zobrazit ve složce** u souborového záznamu) |
| Nastavení | Téma, jazyk (cs/en), souběžné kopie, tolerance času, práh mazání, ověření kopií, export/import konfigurace, složka dat a logů |

## Barvy a typografie
- Tokeny v `src/app/theme/tokens.ts`, v komponentách přes `ds(theme)`; světlá i tmavá varianta.
- Pastely: mint `#8FF2AA` (OK), lemon `#F1F47F` (pozor), lilac `#D4BDF4`, peach `#F6A88E`, sky `#AEE3F4`.
  Text na pastelu tmavý inkoust `#121417`. Hlavní CTA = černé pill tlačítko.
- Stav vždy ikonou + textem, ne jen barvou.
- Písmo **Urbanist Variable** přes `@fontsource-variable` (offline). Velká čísla smíšenou vahou
  (`SplitValue`: „**1**,2 TB“, „**1**/3“).
- Ikony: **lucide-react**, tenká linka 1.6, v kulatých bublinách (`IconBubble`).

## Pohyb
Mikroanimace jsou čisté CSS (`keyframes` z MUI), bez knihovny. Tokeny a pomocníci v
`src/app/theme/motion.ts`:
- Délky: stisk 120 ms, hover 200 ms, nástup 420 ms, počítání čísel 700 ms. Křivky `ease.standard`,
  `ease.emphasized`, `ease.spring` (lehký překmit pro ikony a chipy).
- `enter(delay)` – nástup obsahu (fade + posun nahoru), hlavička a list stránky přes `Page`.
- `stagger(step)` – postupný nástup dětí mřížky/seznamu (max 12 kroků).
- `hoverLift(shadowRaised)` – karta se při hoveru zvedne o 3 px a dostane výraznější stín.
- Tlačítka se při stisku zmenší (0,96, ikonová 0,9); CTA se při hoveru zvedne.
- Velká čísla dopočítávají (`useCountUp`, `SplitValue animate`), pruh kapacity se naplní,
  „Připojeno“ / „Připraveno“ jemně pulzuje, obnovení disků točí ikonou, dialogy a chipy naskočí.

Pravidla:
- Nástupové animace vždy `animation-fill-mode: backwards`, nikdy `both` – konečný stav animace
  by přebil `transform` z hoveru.
- Výsledná hodnota nesmí záviset na `requestAnimationFrame` (v minimalizovaném okně se zastaví) –
  `useCountUp` má časovou pojistku, pruh kapacity startuje časovačem.
- `prefers-reduced-motion: reduce` vypne v `CssBaseline` všechny animace a přechody; čísla se
  zobrazí rovnou konečná. Animace jsou jen ozdoba, nikdy nenesou informaci.

## Texty (mikrocopy)
- Tykání, krátce, slovesem: „Spustit zálohu“, „Registrovat disk“.
- Chyby říkají, co se stalo a co dělat: „Disk ‚WD Černý‘ není připojen. Připoj ho a zkus to znovu.“

## Náhled v prohlížeči
`pnpm dev` otevřený v běžném prohlížeči (mimo Tauri) načte DEV-only `src/dev/demoIpc.ts`
se smyšlenými disky – slouží k vizuální kontrole a snímkům. Do produkčního buildu se nedostane.
