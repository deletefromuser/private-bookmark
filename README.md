# Private Bookmark - Chrome MV3 Extension

Overview
--------
Private Bookmark stores bookmarks and a private visit history inside the extension using an embedded SQLite database (WASM) managed by the background worker. The extension prioritizes local storage for bookmarks and limited history monitoring for user-selected domains.

Structure
---------
- Popup: quick-add UI and shortcuts (add current tab, open view or options).
- View page: password-protected bookmark viewer, editor, and paginated list (`view.html` / `view.js`).
- Options page: settings, folders, import/export, backup/restore, and monitored domains (`options.html` / `options.js`).
- History page: password-protected private visit history (`history.html` / `history.js`).
- SQL console: read-only queries and confirmed write statements (`sql.html` / `sql.js`).
- Background service worker: SQLite ownership and history monitoring (`background.js`).
- `db.js`: page-side messaging client that exposes `globalThis.db`.
- `shared.js`: escaping, URL safety, password hashing/verification, and unlock helpers.
- `modal.js`: async `_modal.showConfirm` / `showTextPrompt` dialogs.

Key features
------------
- Private bookmarks stored in the SQLite `bookmarks` table with fields: `{ id, title, url, folderId, added }`.
- Folder support for organizing bookmarks and moving bookmarks between folders.
- Import from Chrome bookmarks and export to Netscape HTML.
- Password-protected viewers. Passwords use salted PBKDF2-SHA-256 (`210000` iterations) and are stored in `settings.passwordHash`; legacy SHA-256 hashes are upgraded on successful login.
- Private visit history in the `visit_history` table: `{ id, url, title, domain, timestamp }`.
- Monitored domains: completed navigations are recorded and matching URLs are removed from Chrome's native history.
- JSON backup/restore for all tables. Restore requires confirmation, validates the backup shape, and runs in a transaction.
- Local Bootstrap 5 and Noto Sans JP assets bundled by Parcel; pages make no CDN requests.
- Non-blocking modal helpers replace blocking prompts.

Permissions
-----------
- `storage` - legacy `chrome.storage.local` migration; current data lives in SQLite.
- `tabs` - read current tab URL/title for quick-add and monitoring helpers.
- `bookmarks` - import from Chrome's bookmark tree.
- `history` - read native history titles and remove visited URLs when recording private visits.
- `webNavigation` - detect completed navigations for history monitoring.

Security considerations
-----------------------
- Password hashes use salted PBKDF2-SHA-256. There is no recovery master password; clearing the password requires the current password or local data reset.
- The password protects the viewer UI. It does not encrypt the SQLite database at rest.
- The extension reads from and deletes entries in Chrome history when a monitored domain is visited. Users should understand this behavior before enabling monitoring.
- Bookmarks, history, and settings remain local to the extension origin. Review the code before distributing a modified build.

How history monitoring works
----------------------------
- Users add domains to the monitored domains list on the Options page.
- The background worker listens for completed navigations through `webNavigation`, with a `tabs.onUpdated` fallback.
- For a monitored domain, the worker:
  - Looks up the native history title for the URL, falling back to the active tab title.
  - Saves a private `visit_history` entry.
  - Deletes the URL from Chrome's native history via `chrome.history.deleteUrl`.
- Repeat visits to the same URL are debounced per URL for 5 seconds.

UI/Usage
--------
- Popup:
  - Add a bookmark or add the current tab.
  - Monitor the current domain.
  - Open the bookmark viewer, history viewer, or options.
- View page:
  - Requires the password to unlock each time.
  - Shows a paginated bookmark list with edit, delete, and move-to-folder controls.
- Options page:
  - Manage the password, folders, and monitored domains.
  - Import Chrome bookmarks, export bookmarks to HTML, and back up/restore all tables as JSON.
  - Export or clear private visit history.
- History page:
  - Lists visits newest-first with refresh, delete, and pagination.
- SQL console:
  - Runs queries, warns before multi-statement or destructive SQL, and exports the last results as JSON.

Development
-----------
- Install dependencies: `npm install`
- Watch build: `npm start`
- Production build: `npm run build` (deletes `build/`, bundles explicit entries, then copies `manifest.json` and `icons/*`)
- Load `build/` via `chrome://extensions` -> Developer mode -> Load unpacked.
- `npm test` is not configured yet; verify changes manually with the checklist below.
- There is no lint or typecheck script configured.

Testing checklist
-----------------
1. Run `npm run build` and load `build/` unpacked in `chrome://extensions`.
2. Confirm permissions include `storage`, `tabs`, `bookmarks`, `history`, and `webNavigation`.
3. Add a domain to monitored domains in Options.
4. Visit a page on that domain, wait for it to load, and confirm an entry appears in Private Visit History and the URL is removed from native history.
5. Unlock the History page and verify refresh, delete, and pagination.
6. Test bookmark add/edit/delete, folder moves, and empty-list pagination.
7. Test Chrome bookmark import, HTML export, JSON backup, and restore.
8. Test password set/change/clear and confirm legacy hashes upgrade on login.
9. Open the SQL console and verify destructive statements require confirmation.

Contributing
------------
Pull requests are welcome. Include tests when available or a small manual test plan for UI changes.

License
-------
MIT
