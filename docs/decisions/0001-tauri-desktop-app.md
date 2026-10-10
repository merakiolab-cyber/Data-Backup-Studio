# 0001 – Desktop aplikace v Tauri 2
- Stav: Přijato
- Datum: 2026-10-10

## Kontext
Aplikace musí být trvale dostupná offline na Windows PC, rychlá, s moderním UI a s přímým
přístupem k souborovému systému a informacím o svazcích (sériové číslo, GUID).

## Rozhodnutí
Tauri 2: Rust backend + React/TypeScript frontend ve WebView2. Žádný lokální server.

Zvažované alternativy:
- **Webová aplikace + lokální server** – prohlížeč nemá přístup k FS ani svazkům, server by otevíral port.
- **Electron** – stejný model UI, ale instalátor ~100 MB a vyšší RAM; Node backend pomalejší pro I/O.
- **.NET WPF/WinUI** – nativní, ale pomalejší vývoj moderního UI, .NET SDK není nainstalováno.

## Důsledky
- Malý instalátor, nízká spotřeba, vysoký výkon enginu.
- Vývoj ve dvou jazycích (Rust + TS); rozhraní mezi nimi typované přes `tauri-specta`.
- Závislost na WebView2 – řešeno přibalením offline instalátoru WebView2.
