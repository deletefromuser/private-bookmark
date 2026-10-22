# AGENTS.md

## Project
Chrome MV3 extension (vanilla JS, Bootstrap CDN) that stores private bookmarks and visit history in SQLite WASM. Source files live at the repo root; the loadable extension is built into `build/`.

## Commands
- `npm install`
- `npm start` — Parcel watch into `build/`
- `npm run build` — bundle HTML/JS/CSS, then copy `manifest.json` and `icons/*` into `build/`
- Load `build/` via `chrome://extensions` → Developer mode → Load unpacked.
- No tests, lint, or typecheck are configured. `npm test` intentionally fails; verify manually using the README checklist.
- Delete `build/` before a clean build; Parcel does not remove old hashed chunks.

## Architecture
- `background.js` is the service worker. It owns SQLite, handles `QUERY`, `QUERY_PARAMS`, and `MIGRATE_DB`, creates the schema, and performs history monitoring.
- `db.js` never opens SQLite directly. It sends `chrome.runtime` messages to the background and flattens result blocks into objects, exposed as `globalThis.db`.
- Pages: `popup.*` (add/monitor/open), `view.*` (password-protected bookmarks), `options.*` (settings, folders, import/export, backup), `history.*` (visit history), `sql.*` (SQL console opened from Options).
- `modal.js` must load before page scripts; it provides async `_modal.showConfirm` / `showTextPrompt` used everywhere.
- Every background `exec()` call re-initializes SQLite, registers the IDB VFS, and opens DB `test` from scratch. Avoid large/frequent queries.
- Schema and indexes are defined only in `createSchema()` in `background.js`; there are no migration files. Updates to schema must be added there.
- Legacy `chrome.storage.local` data is migrated automatically when the worker starts, gated by `db_migrated_v1` in the SQLite `settings` table.

## Data and SQL
- Real table is `visit_history` (snake_case). README references to `visitHistory` / extension storage are stale; trust the code.
- Most SQL is built by interpolating escaped strings (`'` doubled). `db.queryWithParams` is not real parameter binding: the background naively replaces each `?` in order, so a `?` inside a literal breaks it. Preserve the existing escaping pattern.
- Options "backup/restore" is a JSON dump of all tables, not a raw SQLite file. Bookmark export is Netscape HTML.

## Gotchas
- Use the vendored root `wa-sqlite/` directory via relative imports in `background.js`. The `@vlcn.io/wa-sqlite` npm dependency is unused, and `lib/wa-sqlite/` is empty.
- `manifest.json` CSP requires `'wasm-unsafe-eval'` for SQLite WASM; removing it breaks the extension.
- Password hashes are unsalted SHA-256 in `settings.passwordHash`. A recovery master password `tomhawk001` is hardcoded in `options.js` and `history.js`; README says to replace it before distribution.
- History monitoring intentionally deletes matching URLs from Chrome's native history after recording a visit. Debounce is per-URL, 5s, in `background.js`.
- `manifest.json` version is a date string (e.g. `20260102`) and is independent of `package.json`; bump it manually for releases.
- Known bug: moving a bookmark to another folder in `view.js` appends a trailing space to `folderId`.
