# 0004 – Pastelový „soft“ vizuální styl místo čistého Material 3
- Stav: Přijato
- Datum: 2026-10-10

## Kontext
První verze UI používala Material Design 3 (seed indigo, Navigation Rail, ikony MUI Rounded).
Uživatel ji vyhodnotil jako „nic moc“ a dodal inspiraci: pastelové obrazovky s jemným
mint → levandulovým přechodem pozadí, velkými zaoblenými bílými listy a kartami, kulatými
ikonovými tlačítky s tenkou linkou, pastelovými bloky, velkými čísly a černým pill tlačítkem.

## Rozhodnutí
- MUI zůstává jako knihovna komponent (přístupnost, dialogy, menu, formuláře), ale vzhled
  určuje vlastní sada tokenů `palette.ds` (`src/app/theme/tokens.ts`) přístupná přes `ds(theme)`.
- Pozadí: přechod mint → levandule; obsah na velkém bílém listu (32 px), karty 24–28 px.
- Pastelové bloky nesou význam: mint = připojeno / OK, lemon = čeká na akci, ostatní doplňkové.
- Písmo **Urbanist Variable** (`@fontsource-variable/urbanist`, offline).
- Ikony **lucide-react** (tenká linka 1.6) místo `@mui/icons-material`.
- Navigace: úzký sidebar s logem a pill skupinou kulatých ikonových odkazů s tooltipem a badge.
- Světlý i tmavý režim zůstávají (tmavý = grafitové listy, pastely ztlumené).

## Důsledky
- Komponenty nesmí používat natvrdo psané barvy; vše přes tokeny.
- Zaoblení v `sx` se píše v px řetězcích (číslo MUI násobí `shape.borderRadius`).
- `@mui/icons-material` a Roboto byly z projektu odebrány.
- Pro vizuální kontrolu bez Tauri existuje DEV-only demo režim (`src/dev/demoIpc.ts`).
