# 0010 – Běh zálohy jako app-wide session (minimalizace + fronta)
- Stav: Přijato
- Datum: 2026-10-11

## Kontext
Modal dialog blokoval práci v aplikaci během dlouhé zálohy. Zrušení přes `fs::copy`
navíc nedokázalo přerušit velký soubor. Uživatel potřebuje aplikaci používat během běhu
a spouštět další úlohy, aniž by běžely dvě kopie najednou (USB thrashing).

## Rozhodnutí
- Stav běhu drží `RunSessionProvider` (React context) v kořeni aplikace – přežije navigaci
  a minimalizaci dialogu.
- Dialog lze **minimalizovat** na lištu dole (`ActiveRunBar`); backend běh pokračuje.
- Na backendu zůstává **jeden aktivní běh** (`AppState` run slot). Další úlohy se řadí do
  fronty ve frontendu a spouští se postupně (náhled → potvrzení → běh).
- Kopírování v enginu jde po 1 MB blocích s kontrolou `cancel` – zrušení reaguje i uprostřed
  velkého souboru; `.dbs-partial` se uklidí.

## Důsledky
- UI zůstává použitelné během zálohy; lišta ukazuje průběh, zrušení a počet čekajících úloh.
- Souběžné zálohy na disk nejsou podporované (záměrně).
- Testy enginu pokrývají zrušení uprostřed velké kopie.
