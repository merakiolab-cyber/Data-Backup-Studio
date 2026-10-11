# 0011 – Skupiny úloh v konfiguraci (schéma v4)
- Stav: Přijato
- Datum: 2026-10-11

## Kontext
Uživatel má více záložních disků a chce na stránce Úlohy přehledně oddělit úlohy
podle cílového disku (nebo jiného jména). Bez skupin se seznam rychle plní.

## Rozhodnutí
- `config.json` schéma **v4** přidává `groups: JobGroup[]` a volitelné `job.groupId`.
- Skupina má jen `id`, `name`, `sortOrder` – žádné písmeno disku ani cesta.
- Sbalení/rozbalení skupin je čistě UI (`localStorage`), neperzistuje se do konfigurace.
- API: `create_job_group` / `rename_job_group` / `delete_job_group` / `set_jobs_group`;
  `list_jobs` vrací `JobsOverview { groups, jobs }`.
- Smazání skupiny úlohy neodstraní – jen zruší přiřazení.

## Důsledky
- Starší buildy odmítnou novější `config.json` (stejně jako u v3).
- Export/import přenáší skupiny; import kontroluje orphan `groupId` a názvy.
- UI: klik na dlaždici označí úlohu (mint), checkbox jen při hoveru; skupiny jsou sbalitelné.
