# Changelog

Formát podle [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/), verzování [SemVer](https://semver.org/lang/cs/).
Sekce `[Unreleased]` slouží jako paměť rozpracované práce – AI i člověk ji čtou jako první.

## [Unreleased]

### Přidáno
- Disky se obnoví hned po **připojení / odpojení USB** (`WM_DEVICECHANGE`). Periodický poll
  každých 4 s odpadá. ADR 0012.

### Opraveno
- **Výběr úloh** reaguje na jedno kliknutí. Dříve i drobný pohyb myši spustil HTML5 drag
  a klik se zahodil (kartu bylo potřeba trefit dvakrát až třikrát).

### Změněno
- **Editor úlohy** je na celou šířku (zdroj \| cíl, pak režim \| název \| skupina, vyloučení
  dole). Dlouhé nápovědy u cíle a vzorů jsou za ikonou **?**.
- Počet úloh u skupiny skloňuje česky: **1 úloha**, **2 úlohy**, **10 úloh**.

### Další krok
- Nápady na později: auto-start po připojení disku, plánovač, verzování smazaných souborů.

## [1.0.0] – 2026-10-11

První stabilní release po ostrém testu na skutečných discích.

### Bezpečnost
- Import konfigurace teď prochází stejnou validací úloh jako editor (cíl nesmí být kořen
  disku, překryvy, vzory). Otevření složky normalizuje `rel_path` na backendu.

### Odstraněno
- Nepoužívané ikony z generátoru (`64x64.png`, `icon.png`) a mrtvé konstanty enginu
  (výchozí hodnoty teď žijí jen v `AppSettings`). Smazaný Vite `dist/` (mimo git).

### Opraveno
- **Přetahování úloh** ve Windows aplikaci. WebView2 jinak nativní drop sebere dřív, než
  ho dostane stránka (`dragDropEnabled: false`). V prohlížeči to fungovalo i předtím.
- **Zrušení běhu** zastaví i probíhající kopii velkého souboru (kopírování po 1 MB blocích
  s kontrolou zrušení). Dříve `fs::copy` doběhlo celý soubor.

### Přidáno
- **CI (GitHub Actions)** na Windows: `pnpm check`, Vitest, `cargo test --workspace`; po pushi na
  `main`/`master` navíc sestavení Tauri (NSIS + portable exe jako artefakty).
- Anglický **`README.en.md`** pro portfolio na GitHubu.
- **Historie – detail běhu:** tlačítko **Zobrazit ve složce** otevře soubor záznamu (`logs\{id}.log`)
  v Průzkumníku se souborem vybraným.
- Na stránce **Disky** jde **přetahováním karet** změnit pořadí registrovaných cílových disků
  (ukládá se do konfigurace).
- Na **Přehledu** tabulka **Stáří záloh** – u každé úlohy cílový disk, čas posledního běhu,
  barevné stáří (nedávno / dní / starší / nikdy / chyba) a tečky posledních běhů.
- Na stránce **Úlohy** jde označené úlohy **seskupit** (např. podle jména záložního disku).
  Skupiny jdou přejmenovat, zrušit a sbalit/rozbalit. Konfigurace schéma v4. ADR 0011.
- Běh zálohy jde **minimalizovat** – aplikaci můžeš dál používat, dole zůstane lišta s průběhem.
  Další úlohy se dají přidat do fronty (jedna po druhé, ne současně na disk). ADR 0010.

### Změněno
- **Detail běhu v Historii** – větší dialog (až ~1280×880 px), na širokém okně souhrn vlevo
  a celoplošný textový záznam vpravo; větší písmo logu pro 4K; filtry typů akcí v logu
  (přidáno, aktualizováno, smazáno, složky, selhání).
- **Responzivní mřížky karet** – obsah stránek na celou šířku okna; sloupce 1–4 podle šířky
  (Úlohy, Disky, Přehled, volba režimu).
- Sidebar má **tučné geometrické logo** (vrstvené D, silný zaoblený tah) bez kruhu.
- **Úlohy – výběr a karty.** Klik na dlaždici ji označí (lehce nazelenalé pozadí, bez checkboxu).
  Jde vybrat celou skupinu i všechny úlohy najednou. Počet úloh ve skupině je vpravo u menu.
  Karty jsou vzdušnější; skupiny se sbalují plynule. Zelené „Spustit vše“ je v záhlaví Úloh i Přehledu.
  Dlaždice poslední zálohy na Přehledu je zase růžová (peach).
  Úlohu přesuneš přetažením na skupinu,
  volbou „Přesunout do“, nebo skupinou v detailu úlohy.
- **Zrcadlo bere existující zálohu.** Soubory, které už v cíli sedí (stejná velikost a čas),
  se při prvním běhu nekopírují znovu – i když je dřív zapsal jiný program. Náhled ukáže,
  kolik se jich ponechá. Plná kopie je jen do prázdné složky. Vysvětlivka u režimu to
  říká přímo. Režim Aktualizace pořád nic nemaže; na převzetí staré zálohy použij Zrcadlo
  a před spuštěním zkontroluj náhled.
- Odebraný nepoužívaný Zustand. Seznam úloh se nepolluje zvlášť – obnoví se s disky
  (4 s, jen aktivní okno). Enumerace svazků se na ~1,2 s sdílí mezi Přehledem a Úlohami.

### Přidáno – jazyk
- V Nastavení jde přepnout **jazyk aplikace** (Čeština / English). Volba je v `config.json`
  a v exportu; okamžitě se projeví v celém UI. Chybějící hodnota ve starším souboru = čeština.
  Chyby z backendu (alert, dialog) jsou ve zvoleném jazyce. Textové logy běhů zůstávají česky.
  ADR 0009.

### Přidáno – dotažení produktu
- Na Přehledu je **Spustit vše** (připravené úlohy postupně). Bez registrovaného disku výzva na Disky.
- Na kartě úlohy jde **otevřít zdroj/cíl v Průzkumníku** a zkopírovat cestu. V Nastavení **Otevřít**
  složku dat a logů. Cestu skládá backend z `Location`, frontend ji neposílá.
- LICENSE (MIT) a README pro běžné použití (jak začít, kde leží data).

### Přidáno – nastavení (fáze 6)
- V Nastavení jde zvolit **souběžné kopie** (1–8), **toleranci času souboru**, **práh mazání**
  Zrcadla a volitelné **ověření kopií** (blake3 po zápisu, před přejmenováním). Hodnoty jsou
  v `config.json` (schéma v3). Export/import konfigurace (bez historie).
- Engine kopíruje soubory paralelně podle nastavení; mazání v Zrcadle pořád až po kopiích.
- Náhled Přehledu v README (`assets/abckup-preview.png`). ADR 0007, 0008.

### Přidáno – logy a průběh
- Každý běh má textový záznam v `%APPDATA%\…\logs\{id}.log` (relativní cesty). Starší soubory
  se mažou, zůstává 80 nejnovějších. Záznam je v detailu Historie; cesta ke složce v Nastavení.
- V dialogu běhu je **rychlost** a **ETA** (průměr od začátku, po krátkém náběhu).

### Přidáno – historie běhů (fáze 5)
- Každá záloha se zapíše do `history.db` v `%APPDATA%` (souhrn + chyby). Obrazovka **Historie**
  ukáže seznam, filtr podle úlohy a detail chyb. Selhané běhy mají odznak v menu.
- Dlaždice **Poslední záloha** na Přehledu, na kartě Statistiky počet záloh a zkopírovaný objem,
  na kartě úlohy poslední výsledek a čas.
- Příkazy `list_runs` / `get_run`. Závislost `rusqlite` (bundled). ADR 0006.

### Přidáno – hromadné spuštění
- Na stránce Úlohy jde karty **označit** (i všechny najednou). Tlačítko **Spustit vše** /
  **Spustit označené** pustí připravené úlohy postupně; každá má náhled a potvrzení. Úlohy
  bez připojeného disku se přeskočí.

### Přidáno – engine (fáze 4)
- **Spouštění zálohy**: tlačítko Spustit na kartě úlohy otevře náhled plánu (co se zkopíruje /
  aktualizuje / smaže), pak běh s průběhem a možností zrušit.
- Režim **Zrcadlo** je výchozí – první běh udělá plnou kopii, další udržují přesný otisk zdroje
  (včetně smazaných souborů v cíli). Aktualizace zůstává jako volitelný režim bez mazání.
- Jádro `engine/`: preflight, scan (`jwalk` + excludes), diff, execute (`.dbs-partial` + rename +
  mtime), pojistky (prázdný zdroj nic nesmaže, práh mazání 20 % vyžaduje potvrzení).
- Příkazy `preview_job` / `run_job` / `cancel_run`, událost `run-progress`. Závislosti `jwalk`,
  `filetime`. Integrační testy: otisk Zrcadla, Update nemaže, prázdný zdroj, zrušení, excludes.

### Přidáno – úlohy (fáze 3)
- **Zálohovací úlohy**: editor (`#/ulohy/nova`, `#/ulohy/:id`) v pěti krocích – zdroj přes systémový
  dialog, cílový disk + složka (s výběrem existující složky), režim Aktualizace/Zrcadlo, vzory vyloučení
  (s častými návrhy) a název (předvyplní se podle složky).
- Karty úloh (stránka Úlohy): zdroj → cíl s aktuální cestou (`D:\Fotky` → `G:\Záloha\Fotky`), stav
  „Připraveno“ / „Disk nepřipojený“ / „Disk potřebuje ověřit“, úprava a smazání.
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
- Počet úloh je u nadpisu sekce jako „Zálohovací úlohy (3)“, ne jako samostatné číslo vpravo.
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

### Přidáno – instalátor
- NSIS instalátor s offline WebView2 a portable `data-backup-studio.exe` v `releases/1.0.0/`
  (mimo git, ~210 MB kvůli přibalenému WebView2). Jazyky instalátoru: čeština a English.

### Poznámky
- Vite dev server běží na portu **1427** (1420 obsazuje jiný projekt).
- Aplikace spuštěná AI agentem běží v izolovaném prostředí a okno není vidět – vizuální kontrolu
  dělá uživatel přes `pnpm tauri dev`, nebo agent headless snímky demo režimu (`pnpm dev` na jiném portu).
- Ruční test fáze 2 se skutečnými USB disky uživatel potvrdil (registrace funguje).
- **Stav 2026-10-11 (večer) – shrnutí dnešní práce:**
  - Jazyk UI cs/en + lokalizované chyby backendu (ADR 0009).
  - Audit bezpečnosti/efektivity: validace importu, cache enumerace svazků, odebrán Zustand.
  - NSIS + portable v `releases/0.1.0/` (mimo git); oficiální v1.0 až po ostrém testu.
  - Úklid repa (ikony, mrtvé konstanty, `dist/`, `.gitignore` pro `src-tauri/gen/`).
  - Zrcadlo přebírá existující zálohu (např. `E:\Photos` → `H:\Photos` bez kopie od nuly).
  - Zrušení uprostřed velkého souboru; minimalizace běhu + fronta úloh (ADR 0010).
  - Fáze 0–6 hotové. Data jen v `%APPDATA%\app.databackupstudio\`.
