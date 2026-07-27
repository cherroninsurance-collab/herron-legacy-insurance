# LIVING WORD — Offline ESV Discipleship App

*"Go therefore and make disciples of all nations…" (Matthew 28:19)*

A 100% offline-capable, installable Bible teaching app built to serve the Great
Commission: sharing the Gospel, making disciples, and planting local churches —
in places with no internet, no app store, and no electricity beyond a phone.

Full architecture & theology of design: **[docs/DESIGN.md](docs/DESIGN.md)**

## What's here

| Path | Module | Contents |
|------|--------|----------|
| `index.html` | 1, 3 | App shell: splash rig, reader, tabs |
| `js/splash.js` | 1 | WebGL volumetric god-rays + 3D holographic Bible opening |
| `css/liquid-glass.css` | 3 | Complete liquid-glass design token sheet |
| `js/pageflip.js` | 3 | Spring-physics page turn (k=170, c=24) + canonical `FLIP_LUT_39` |
| `data/curriculum.json` | 2 | Dual-track Christ-centered curriculum (Lambs / Disciples) |
| `js/games.js` | 4 | Verse Builder · Great Timeline · Shepherd's Path · constellation · DBS journal |
| `data/schema.sql` | 5 | Canonical SQLite schema (Room / Core Data parity) |
| `js/db.js` | 5 | IndexedDB offline engine (PWA mirror of the schema) |
| `sw.js` | 5 | Cache-first service worker — zero network after first load |
| `tools/import-esv.mjs` | 2, 5 | Licensed ESV → offline bundle compiler |

## ⚠️ ESV licensing (read first)

The ESV® Bible is **© 2001 Crossway**. The full text may not be redistributed in
an app without a license: <https://www.crossway.org/permissions/>.

- This repo ships a small **public-domain KJV development seed** so everything
  runs and can be demoed legally.
- After signing with Crossway, run `node tools/import-esv.mjs <licensed.json>`
  to compile `data/bible.json` (all 31,102 verses). The app and service worker
  pick it up automatically — no code changes.

## Instant preview (no server)

`node tools/build-preview.mjs` compiles the entire app — styles, modules,
Scripture seed, curriculum — into a single self-contained `preview.html`
(≈112 KB, zero external requests). Open it anywhere, or share the one file
phone-to-phone (Bluetooth, WhatsApp, SD card) where nothing else reaches.

## Run locally

```bash
cd bible-app
npx http-server -p 8080     # any static server works; ES modules need http://
# open http://localhost:8080
```

## Deploy & package for the field

1. **Web / PWA:** the folder is pure static files — it deploys on this repo's
   Netlify site as-is (`/bible-app/`). One visit fully precaches the app;
   afterwards it works with airplane mode on, and "Add to Home Screen" installs it.
2. **Android APK (side-loadable, no store, no internet):**
   ```bash
   npm i -D @capacitor/core @capacitor/cli @capacitor/android
   npx cap init living-word org.livingword.app --web-dir bible-app
   npx cap add android && npx cap sync
   cd android && ./gradlew assembleRelease   # sign, then distribute the APK
   ```
   Copy the APK by SD card, USB-OTG, or phone-to-phone share — zero connectivity needed.
3. **Hotspot distribution:** any phone running a pocket static-file server +
   Wi-Fi hotspot can hand the PWA to nearby devices with no internet at all.
4. **Native builds:** implement `data/schema.sql` directly in Room (Android) or
   Core Data (iOS); `tools/import-esv.mjs --sql` emits the matching seed dump.

No telemetry, no accounts, no analytics. Everything stays on the device.
