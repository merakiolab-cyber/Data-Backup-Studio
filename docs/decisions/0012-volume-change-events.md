# 0012 – Obnova disků přes WM_DEVICECHANGE
- Stav: Přijato
- Datum: 2026-10-11

## Kontext
UI dřív každé 4 s enumerovalo svazky, jen když bylo okno aktivní. Polling zbytečně budí
USB disky a stejně zpožďuje zobrazení nově připojeného disku až o několik sekund.

## Rozhodnutí
Skryté message-only okno v `src-tauri` poslouchá `WM_DEVICECHANGE` (`DBT_DEVICEARRIVAL`,
`DBT_DEVICEREMOVECOMPLETE`, `DBT_DEVNODES_CHANGED`). Po události se zruší cache enumerace
a frontend dostane `volumes-changed`; TanStack Query znovu načte disky (debounce 400 ms).
Při návratu do okna se seznam obnoví (`refetchOnWindowFocus`). Periodický poll odpadá.

## Důsledky
- Připojený USB disk se v UI objeví hned, ne až po intervalu.
- Enumerace běží jen po skutečné změně nebo po fokus okna – méně zbytečného I/O.
- Fallback bez události (vzácné) = obnovení po přepnutí okna.
