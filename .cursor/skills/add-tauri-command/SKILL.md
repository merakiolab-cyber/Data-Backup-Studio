---
name: add-tauri-command
description: Postup přidání nové funkce napříč vrstvami Data Backup Studio – logika v backup-core, Tauri příkaz, generované TS bindings přes tauri-specta, React hook a testy. Použij při přidávání nového příkazu, endpointu backendu, události nebo když UI potřebuje nová data z Rustu.
---

# Přidání příkazu (Rust → UI)

```
Postup:
- [ ] 1. Logika v crates/backup-core
- [ ] 2. Test v core
- [ ] 3. Tauri příkaz v src-tauri/src/commands/<oblast>.rs
- [ ] 4. Registrace v builderu specta + vygenerování bindings
- [ ] 5. Hook ve src/features/<feature>/api.ts
- [ ] 6. pnpm check + cargo test --workspace
```

1. **Core**: čistá funkce/metoda vracející `Result<T, CoreError>`. Typy pro UI derivují
   `Serialize, Deserialize, specta::Type`.
2. **Test**: unit test nebo integrační test v `crates/backup-core/tests/` (FS jen v `TempDir`).
3. **Příkaz**: tenký wrapper, blokující I/O přes `spawn_blocking`, chyba → `AppError`.
   Validuj vstupy (viz rule `tauri-security`).
4. **Registrace**: přidej do `collect_commands![…]` v `specta_builder()` v `src-tauri/src/lib.rs`.
   Spusť `cargo test -p data-backup-studio` – test `export_typescript_bindings` přegeneruje
   `src/lib/bindings.ts` (soubor needituj ručně, commituj ho).
5. **Hook**: `useQuery` pro čtení, `useMutation` + `invalidateQueries` pro zápis.
   Výsledek příkazu převeď přes `unwrap()` z `src/lib/result.ts`:
   `queryFn: async () => unwrap(await commands.listVolumes())`.
6. **Události** (průběh): typ události derivuje `specta::Type` + `tauri_specta::Event`,
   emituj max ~10×/s, na frontendu odběr s úklidem.

Na konci aplikuj skill `project-memory`.
