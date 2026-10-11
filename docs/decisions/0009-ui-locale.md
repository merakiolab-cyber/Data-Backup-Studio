# 0009 – Jazyk UI (čeština / angličtina)
- Stav: Přijato
- Datum: 2026-10-11

## Kontext
Aplikace byla jen česky. Pro uživatele i veřejné portfolio je potřeba přepnout celé UI
do angličtiny, bez nové závislosti a bez změny schématu `config.json`.

## Rozhodnutí
- Dva typované katalogy (`cs`, `en`) ve frontendu. Žádný i18next ani custom backend.
- `AppSettings.locale` (`cs` | `en`) v `config.json` se `#[serde(default)]` – starší soubory
  zůstanou čeština, schéma zůstává v3.
- Okamžité přepnutí přes `localStorage` (`dbs-locale`) + `I18nProvider`; persistuje se
  spolu s ostatním nastavením (export/import ho nese).
- Téma zůstává v MUI `useColorScheme`, ne v konfiguraci.
- `AppError` se skládá na hranici Tauri podle `AppSettings.locale` (thread-local při `spawn_blocking`).
- Textové logy běhů (`logs/*.log`) zůstávají česky – diagnostický soubor, ne UI.

## Důsledky
- Výchozí jazyk je čeština. Texty v kódu UI jdou jen přes katalog.
- Chyby v UI (alert, dialog) sledují aktuální jazyk. Starší záznamy v historii drží jazyk
  v okamžiku běhu.
