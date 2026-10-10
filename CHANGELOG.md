# Changelog

Formát podle [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/), verzování [SemVer](https://semver.org/lang/cs/).
Sekce `[Unreleased]` slouží jako paměť rozpracované práce – AI i člověk ji čtou jako první.

## [Unreleased]

### Přidáno – úlohy (fáze 3)
- **Zálohovací úlohy**: editor (`#/ulohy/nova`, `#/ulohy/:id`) v pěti krocích – zdroj přes systémový
  dialog, cílový disk + složka (s výběrem existující složky), režim Aktualizace/Zrcadlo, vzory vyloučení
  (s častými návrhy) a název (předvyplní se podle složky).
- Karty úloh na Přehledu: zdroj → cíl s aktuální cestou (`D:\Fotky` → `G:\Záloha\Fotky`), stav
  „Připraveno“ / „Disk nepřipojený“ / „Disk potřebuje ověřit“, úprava a smazání. „Spustit“ je zatím neaktivní (fáze 4).
- Jádro: `Location` + normalizace relativních cest, `Job`/`JobSpec` s validací, modul `jobs`
  (`locate`, create/update/delete, `JobView`), zdrojové disky bez značky (`SourceVolume`, GUID → sériové číslo).
- Pojistky: cíl nesmí být kořen disku ani `.databackupstudio`, zdroj a cíl se nesmí překrývat,
  cílové složky dvou úloh se nesmí překrývat, disk používaný úlohou nejde odebrat.
- Konfigurace schéma v2 (`jobs`, `sources`) s načtením v1. Závislost `globset` pro kontrolu vzorů.
- ADR 0005. Testy: 47 v jádře (+22), frontend 9 (formulář úlohy, karty na Přehledu).

### Změněno – navigace
- **Úlohy mají vlastní stránku** `#/ulohy` a položku v menu (mezi Přehledem a Disky). Editor
  se vrací na Úlohy. Přehled ukazuje jen dlaždice a Statistiky (bez úloh výzvu k první úloze).

### Přidáno – statistiky
- Karta **Statistiky** na Přehledu: celková kapacita cílových disků, volné místo na připojených,
  počet úloh podle režimu, počet vzorů vyloučení a pruh zaplnění každého cílového disku
  (mint / žlutá od 75 % / broskvová od 90 %, nepřipojené disky šrafovaně s kapacitou).
  Výpočet v `features/overview/stats.ts` s testy. Statistiky běhů záloh přibudou s historií (fáze 5).

### Přidáno – mikroanimace
- Nástup stránek a postupný nástup karet a seznamů, zvednutí karet při hoveru, stisk tlačítek,
  dopočítávání velkých čísel, plnění pruhu kapacity, pulz u stavu „Připojeno“ / „Připraveno“,
  točící se obnovení disků, naskočení dialogů, chipů a ikony zvoleného režimu, živější sidebar.
- Tokeny pohybu `src/app/theme/motion.ts` (délky, křivky, `enter`, `stagger`, `hoverLift`), stín
  `shadowRaised`, hook `useCountUp` (s testy). Čistě CSS, bez nové závislosti; `prefers-reduced-motion`
  vše vypne.

### Změněno
- Jemnější stíny karet.
- **Nový vzhled** (ADR 0004): pastelový „soft“ styl místo čistého Material 3 – přechod mint → levandule,
  velký bílý list s kartami, sidebar s kulatými ikonovými odkazy a badge, pastelové karty disků podle stavu,
  velká čísla smíšenou vahou, černé pill CTA. Písmo Urbanist, ikony lucide-react; tokeny `ds(theme)`.
  Odebrány `@mui/icons-material` a Roboto. Pravidlo `ui-material-design` → `ui-design-system`.

### Přidáno
- DEV-only demo režim `src/dev/demoIpc.ts`: `pnpm dev` v běžném prohlížeči ukáže smyšlené disky.
- **Disky (fáze 2)**: aplikace načte připojené disky z Windows včetně sběrnice (USB/SATA/NVMe),
  modelu, sériového čísla a volného místa. Disk jde zaregistrovat jako cílový – do jeho kořene
  se zapíše skrytá značka `.databackupstudio\volume.json` a disk je pak rozpoznán pod jakýmkoli písmenem.
- Stav registrovaného disku: připojený (s aktuálním písmenem), nepřipojený, nebo „potřebuje ověřit“
  (změněné sériové číslo, chybějící značka, dva disky se stejnou identitou) s tlačítkem „Potvrdit disk“.
- Přejmenování a odebrání disku z aplikace (data na disku zůstávají).
- Konfigurace `config.json` v `%APPDATA%\app.databackupstudio\` s transakčním atomickým zápisem a zálohou `.bak`.
- Diagnostický příklad `cargo run -p backup-core --example list_volumes`.
- Testy: 25 v jádře (resolver, značka, registr, konfigurace), frontend testy obrazovky Disky a formátování velikostí.
- Kostra aplikace (fáze 1): Tauri 2.12 + React 19 + TypeScript 7 (strict) + Vite 8, pnpm 12.
- Cargo workspace: `crates/backup-core` (logika bez Tauri) a `src-tauri` (tenký shell).
- Typově bezpečné volání backendu přes tauri-specta; `src/lib/bindings.ts` generuje
  `cargo test --workspace` i `pnpm tauri dev`. Ukázkový příkaz `app_info` (verze v Nastavení).
- Material 3 téma pro MUI 9 (seed indigo `#3D5AFE`, světlý/tmavý/systémový režim),
  Navigation Rail, prázdné obrazovky Přehled, Disky, Historie, Nastavení (přepínač vzhledu funguje).
- Ikona aplikace (`src-tauri/icons/app-icon.svg` → vygenerované ikony pro Windows).
- Windows manifest (Common Controls v6, podpora cest > 260 znaků, PerMonitorV2 DPI) linkovaný
  do aplikace i testů – bez něj testy s Tauri padají na `STATUS_ENTRYPOINT_NOT_FOUND`.
- Kontroly `pnpm check` (Biome, tsc, rustfmt, clippy `-D warnings`), testy Vitest + cargo test.
- Bezpečnost: CSP bez externích zdrojů, `freezePrototype`, capabilities jen `core:default`
  a `dialog:allow-open`; NSIS instalátor s offline WebView2, instalace pro aktuálního uživatele.
- Pravidlo a fáze 7 roadmapy pro budoucí zveřejnění repa na GitHubu bez osobních dat.
- Základ repozitáře: architektura, roadmapa, UI/UX zásady, ADR 0001–0003, Cursor rules a skills.

### Poznámky
- Vite dev server běží na portu **1427** (1420 obsazuje jiný projekt).
- Aplikace spuštěná AI agentem běží v izolovaném prostředí a okno není vidět – vizuální kontrolu
  dělá uživatel přes `pnpm tauri dev`, nebo agent headless snímky demo režimu (`pnpm dev` na jiném portu).
- Ruční test fáze 2 se skutečnými USB disky uživatel potvrdil (registrace funguje).

### Další krok
- Ruční test fáze 3 se skutečnými disky (vytvořit úlohu, přepojit USB, zkontrolovat cestu na kartě).
- Fáze 4 – engine: scan, plán (dry-run náhled), kopírování s pojistkami Zrcadla, průběh.
