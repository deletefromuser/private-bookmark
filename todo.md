# TODO — Project Review (2026-10-22)

## P0 — Security & data integrity

- [x] **Fix migration flag mismatch.** `background.js:252-258` checks `db_migrated_v1` in `chrome.storage.local`, but `background.js:329` writes it to the SQLite `settings` table. Fresh installs never set the checked flag, so migration re-runs on every service-worker start; if legacy keys remain, they re-import and can overwrite newer bookmarks, password hash, monitored domains, and history. Read/write the flag in one place and delete legacy `chrome.storage.local` keys after success.
- [x] **Remove secret logging.** Plaintext password at `history.js:145`; password hash at `db.js:68`; message payloads/query results at `background.js:77,81,268`, `db.js:20`, and `history.js:61`.
- [x] **Fix stored XSS.** `view.js:43-54` injects bookmark title/URL via `innerHTML`; `options.js:89-91,333-336` does the same with folder names. Titles can originate from web pages or Chrome imports. Build DOM nodes with `textContent`, escape attributes, and reject non-`http(s)` URLs.
- [x] **Remove the `tomhawk001` master password** at `options.js:27,53` and `history.js:144`.
- [x] **Make restore safe.** `options.js:196-276` deletes all tables without confirmation and without a transaction (`BEGIN`/`COMMIT` are commented out). Add confirmation, validate the imported structure/types, and restore in one transaction.
- [x] **Harden the SQL console.** `sql.js:4-8` only checks the first keyword, so `SELECT 1; DROP TABLE bookmarks;`, comments, and `WITH ... DELETE` bypass the warning. Detect every statement or add a read-only execution mode.
- [ ] **Replace unsalted SHA-256 passwords** with salted PBKDF2 via WebCrypto; centralize hashing and migrate existing hashes.

## P1 — Correctness & performance

- [ ] **Add the `webNavigation` permission** (`manifest.json`) or remove `background.js:60`. The listener currently silently never runs because the API is unavailable.
- [ ] **Reuse one SQLite connection.** `background.js:148-168` reloads the WASM module, creates a VFS, opens the DB, and never closes it for every message. Use a singleton connection plus a query queue, and close on shutdown.
- [ ] **Check the migration flag before `createSchema()`.** `background.js:236-258` runs ~10 full SQLite initializations on every worker wake before deciding migration is unnecessary.
- [ ] **Use real SQLite parameter binding.** `background.js:107-135` and `db.js:29-54` naively replace `?` placeholders in order; `?` inside literals or search values breaks queries, and `null` becomes `''`. `wa-sqlite` exposes real bind APIs.
- [ ] **Batch import/restore/migration writes.** `options.js:221-260` and `background.js:286-326` send one worker message per row; each message reopens SQLite. Use one transaction/batch.
- [ ] **Fix folder move bug.** `view.js:159` appends a trailing space to `folderId`, so moved bookmarks disappear from folder grouping.
- [ ] **Fix manifest version.** `20260102` exceeds Chrome's documented 0–65535 per-part limit. Use a dotted date such as `2026.10.22` and add `version_name`.
- [ ] **Handle runtime messaging failures.** `db.js:6-53` ignores `chrome.runtime.lastError`, so promises can hang if the worker is unavailable.
- [ ] **Fix empty bookmark pagination.** `view.js:61-71` displays `1-0 of 0`.
- [ ] **Fix `MIGRATE_DB` response handling.** `background.js:88-106` can call `sendResponse` twice and does not await the nested query.

## P2 — Maintainability, privacy & docs

- [ ] **Vendor Bootstrap/Noto locally.** Every page currently loads CSS/fonts from jsDelivr/Google, leaking requests from a privacy-focused extension and breaking offline use.
- [ ] **Deduplicate shared logic.** `sha256` is copied in `popup.js`, `view.js`, `options.js`, and `history.js`; unlock/auth logic is duplicated in `view.js` and `history.js`.
- [ ] **Remove unused code/deps.** `@vlcn.io/wa-sqlite` (`package.json:22`) and empty `lib/wa-sqlite/` are unused; actual code imports vendored root `wa-sqlite/`.
- [ ] **Clean the build.** Replace the `*.js` Parcel entry glob with explicit entries and delete `build/` before building; stale hashed chunks accumulate. Commit `package-lock.json` instead of ignoring it (`.gitignore:5`).
- [ ] **Update `README.md` and `AGENTS.md`.** Document loading `build/`, the real `visit_history` schema, JSON backup format, the missing permission, and correct migration-flag behavior. The current AGENTS claim that migration is gated by the SQLite flag is inaccurate.
- [ ] **Remove dead/unimplemented code.** `sql.js:77-88` `flattenQueryBlocks`, `modal.js:75-120` `showForm`, and the `loadVisitHistoryUI` reference / empty visit-history list in `options.js`.
- [ ] **Add minimal verification.** Add `node:test` coverage for escaping/URL/pagination helpers plus ESLint/Prettier and CI; `npm test` currently fails by design.
- [ ] **Add schema versioning** via `PRAGMA user_version` instead of editing `createSchema()` alone.
- [ ] **Align metadata.** `package.json` says ISC while `LICENSE` is MIT; clean the README-derived package description.
