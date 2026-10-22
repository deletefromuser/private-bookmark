# AGENTS.md

## Project
Chrome MV3 extension (vanilla JS, locally bundled Bootstrap) that stores private bookmarks and visit history in SQLite WASM. Source files live at the repo root; the loadable extension is built into `build/`.

## Commands
- `npm install`
- `npm start` - Parcel watch of explicit entries into `build/`
- `npm run build` - deletes `build/`, bundles explicit HTML/JS entries, then copies `manifest.json` and `icons/*`
- `npm run clean` - remove `build/`
- Load `build/` via `chrome://extensions` -> Developer mode -> Load unpacked.
- `npm test` - `node:test` coverage for shared helpers in `test/`
- `npm run lint` - ESLint with flat config
- `npm run format` / `npm run format:check` - Prettier
- CI runs `npm test`, `npm run lint`, and `npm run build`.
- `package-lock.json` is committed. Keep it in sync with `package.json`.

## Architecture
- `background.js` is the service worker. It owns SQLite, handles `QUERY`, `QUERY_PARAMS`, and `MIGRATE_DB`, creates the schema, and performs history monitoring.
- SQLite is opened once through a cached promise. All queries are serialized through a promise queue and the connection is closed on `chrome.runtime.onSuspend`.
- `QUERY_PARAMS` uses real prepared statements and `bind_collection`. Most convenience helpers in `db.js` still interpolate escaped strings (`'` doubled).
- `db.js` never opens SQLite directly. It sends `chrome.runtime` messages to the background, checks `chrome.runtime.lastError`, and flattens result blocks into objects, exposed as `globalThis.db`.
- Pages: `popup.*` (add/monitor/open), `view.*` (password-protected bookmarks), `options.*` (settings, folders, import/export, backup), `history.*` (visit history), `sql.*` (SQL console opened from Options).
- `shared.js` must load before page scripts; it provides `AppUtils` escaping, URL safety, destructive SQL detection, PBKDF2 password functions, and `authenticate`.
- `modal.js` must load before page scripts; it provides async `_modal.showConfirm` / `showTextPrompt` used everywhere.
- Schema and indexes are defined in `createSchema()` in `background.js`. Schema upgrades use `PRAGMA user_version` and the `SCHEMA_VERSION` constant; add a version-gated migration block when changing the schema.
- Legacy `chrome.storage.local` data is migrated automatically when the worker starts. The `db_migrated_v1` setting in the SQLite `settings` table is checked before importing legacy data, so completed installs skip that work.

## Data and SQL
- Real table is `visit_history` (snake_case): `id, url, title, domain, timestamp`. The `bookmarks` table uses `folderId` camelCase.
- `db.queryWithParams` is real parameter binding. `?` characters inside string literals are safe.
- Most convenience SQL still uses interpolated, escaped strings. Preserve the existing escaping pattern or migrate the helper to `queryWithParams`.
- Options backup/restore is a JSON dump of all tables, not a raw SQLite file. Restore is validated, confirmed, and transactional. Bookmark export is Netscape HTML.
- Password hashes use salted PBKDF2-SHA-256 (`210000` iterations). Legacy 64-character SHA-256 hashes are accepted and upgraded on successful login. There is no master password.

## Gotchas
- Use the vendored root `wa-sqlite/` directory via relative imports in `background.js`. Do not add `@vlcn.io/wa-sqlite`.
- `manifest.json` CSP requires `'wasm-unsafe-eval'` for SQLite WASM; removing it breaks the extension.
- `manifest.json` uses a dotted `version` plus a human-readable `version_name`; bump both manually for releases. It is independent of `package.json`.
- Bootstrap and Noto Sans JP are imported locally in `styles.css`; do not reintroduce CDN links.
- History monitoring requires `webNavigation` and intentionally deletes matching URLs from Chrome's native history after recording a visit. Debounce is per-URL, 5s, in `background.js`.
- The password gates the viewer UI only; SQLite data is not encrypted at rest.
- Build entries are explicit in `package.json`. Add new pages or standalone workers there instead of restoring a `*.js` glob.
