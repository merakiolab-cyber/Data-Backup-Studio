# 0002 – Identifikace disků nezávislá na písmenu jednotky
- Stav: Přijato
- Datum: 2026-10-10

## Kontext
Windows přiděluje USB diskům písmena podle pořadí připojení, takže pravidlo „zálohuj na F:“
po čase míří na jiný disk nebo nikam (hlavní problém s Cobian Reflectorem).

## Rozhodnutí
Cesty se ukládají jako `Location { volume_id, rel_path }`. Disk se při každém spuštění dohledá:
1. značkový soubor `\.databackupstudio\volume.json` s UUID (cílové disky),
2. sériové číslo svazku (zdroje i fallback pro cíle),
3. GUID svazku (stabilní na tomto PC).

Nesoulad identifikátorů (např. naklonovaný disk) = varování a potvrzení uživatelem.

## Důsledky
- Pravidla fungují bez ohledu na pořadí připojení disků.
- Registrace cílového disku zapisuje malou skrytou složku do jeho kořene.
- Přeformátovaný disk je nutné znovu zaregistrovat (záměrné – jde o „nový“ disk).
