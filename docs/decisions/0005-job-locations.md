# 0005 – Umístění zdroje a cíle úlohy
- Stav: Přijato
- Datum: 2026-10-11

## Kontext
Úloha musí přežít změnu písmene disku (ADR 0002). Cíle mají značkový soubor, ale zdroje jsou
většinou interní disky (i systémový `C:`), na které aplikace nemá co zapisovat. Uživatel vybírá
složky systémovým dialogem, který vrací absolutní cestu s písmenem.

## Rozhodnutí
- Zdroj i cíl se ukládají jako `Location { volumeId, relPath }`; `relPath` je normalizovaná
  relativní cesta (`Zaloha\Fotky`) bez `..`, nepovolených znaků a vyhrazených jmen Windows.
- **Zdrojové disky** se pamatují v `config.sources` jako `SourceVolume { id, name, serial, guidPath }`.
  Nic se na ně nezapisuje; dohledávají se podle GUID svazku, při jeho změně podle sériového čísla
  (jen při jednoznačné shodě). Záznam vznikne až při uložení úlohy a zmizí s poslední úlohou, která ho používá.
- Složka na registrovaném cíli (podle značky) se použije pod ID cíle – i když slouží jako zdroj.
- Absolutní cesta z dialogu jde jen do příkazu `locate_folder`, který ji kanonizuje (vyřeší
  junctiony a symlinky), najde svazek s nejdelším přípojným bodem a vrátí `LocatedFolder`.
  Do konfigurace se nikdy neuloží.
- Cíl je vždy registrovaný disk a **nikdy jeho kořen** (Zrcadlo by smazalo vše ostatní, včetně značky)
  ani složka `.databackupstudio`.
- Zdroj a cíl se nesmí překrývat; cílové složky dvou úloh se nesmí překrývat (přepisovaly by si soubory).
- Registrovaný disk použitý v úloze nejde odebrat.
- Konfigurace přešla na schéma v2; v1 se načte (chybějící pole jsou prázdná), starší aplikace v2 odmítne.

## Důsledky
- UI pracuje jen s `Location`/`SourceRef`; plnou cestu zobrazí z `EndpointView.path`, když je disk připojený.
- Překryv se kontroluje podle ID svazku. Pokud by stejný fyzický disk existoval jako zdroj i cíl
  (zdroj zapamatovaný dřív, než byl disk registrovaný), odhalí to až preflight enginu (fáze 4)
  porovnáním skutečných cest.
- Vzory vyloučení se kontrolují `globset`em už při uložení; jejich význam (relativně ke zdroji) určí engine.
