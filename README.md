# Private Bookmark - Chrome MV3 Extension

Overview
--------
Private Bookmark stores bookmarks and a private visit history inside the extension using `chrome.storage.local`. This extension prioritizes local, private storage for bookmarks and limited history monitoring for user-selected domains.

Structure
---------
- Popup: quick-add UI and shortcuts (add current tab, open view or options).
- View page: password-protected bookmark viewer and editor (`view.html` / `view.js`).
- Options page: settings, folders, import/export, monitored domains, and private visit history management (`options.html` / `options.js`).
- Background service worker: initialization and history monitoring (`background.js`).

Key features
------------
- Private bookmarks stored in `chrome.storage.local` under `privateBookmarks` with fields: { id, title, url, folderId, added }.
- Folder support for organizing private bookmarks.
- Import from Chrome bookmarks (requires `bookmarks` permission) and export to an HTML file.
- Password-protected viewer: password hash stored under `passwordHash` (SHA-256). Changing/clearing requires the current password or the developer recovery master password (remove or replace for production).
- Private Visit History: monitor selected domains, record visits to `visitHistory` in extension storage, and remove the visited URL from the browser's native history.
- History Viewer: a password-protected viewer (`history.html` / `history.js`) to inspect and manage recorded visits (refresh and delete entries supported).
- Non-blocking modal helpers (`modal.js`) replace blocking prompts for better UX.
- Bootstrap 5 + Google Noto fonts for styling and CJK support.

Permissions
-----------
- `storage` — persist bookmarks, folders, password hash, monitored domains, and private visit history.
- `tabs` — read current tab URL/title for quick-add and monitoring helpers.
- `bookmarks` — import from Chrome's bookmark tree.
- `history` — read native history titles (before removal) and remove visited URLs from browser history when recording private visit entries.

Security considerations
-----------------------
- Passwords are hashed with SHA-256 and stored locally. This is not a secure secret storage for production use; consider OS-level secure storage or user-key encryption for serious deployments.
- The extension contains a developer master password (`tomhawk001`) for recovery during development. Remove or replace this before any public distribution.
- The extension reads from and deletes entries in the browser history when a monitored domain is visited. Ensure users understand this behavior when enabling domain monitoring.

How history monitoring works
---------------------------
- Users add domains to the "Monitored domains" list on the Options page.
- The background worker listens for completed navigations. When a page on a monitored domain finishes loading, the worker:
	- Looks up the browser's native history to find the title for that URL (if present).
	- If no native history title is available, it attempts to read the active tab's title.
	- Saves a private visit entry to `visitHistory`: { id, url, title, domain, timestamp }.
	- Deletes the URL from the browser's native history via `chrome.history.deleteUrl`.

History Viewer
--------------
- The History Viewer (`history.html`) is password-protected and requires the same password as the main bookmark viewer.
- It lists recorded visits newest-first, shows title/domain/timestamp, and provides these actions:
	- Click title: open the URL in a new tab.
	- Refresh: re-read `visitHistory` from storage.
	- Delete: remove a single history entry (with confirmation).

UI/Usage
--------
- Popup:
	- Add a bookmark or add the current tab.
	- Monitor the current domain (adds it to Monitored domains in Options).
	- Open View Page (bookmark viewer) or Open Options.
	- Open History Viewer (opens password prompt then the viewer on success).

- View Page:
	- Requires password to unlock each time.
	- Shows bookmarks grouped by folder and includes a Refresh button to reload the list.

- Options Page:
	- Manage password and folders.
	- Import and export bookmarks.
	- Manage Monitored domains (per-domain delete with confirmation).
	- View the private visit history list and export or clear it.

Testing checklist
-----------------
1. Load the extension unpacked in `chrome://extensions` (Developer mode).
2. Ensure permissions include `storage`, `tabs`, `bookmarks`, and `history`.
3. Add a domain to Monitored domains in Options.
4. Visit a page on that domain and wait for it to fully load. Confirm an entry appears in Private Visit History and the same URL is removed from the browser's native history.
5. Open History Viewer via Popup -> Open History Viewer, unlock with your password, and verify refresh and delete operations.
6. Test import/export flows and folder management in Options.

Development notes
-----------------
- The background service worker uses `webNavigation.onCompleted` and `tabs.onUpdated` fallback to detect completed page loads.
- The code tries to read native history titles (via `chrome.history.search`) before deleting the URL so the private visit entry preserves the browser's title.
- For single-page apps that update titles after load, consider adding a short delay before recording or listening for subsequent `tabs.onUpdated` title changes and updating `visitHistory`.

Contributing
------------
Pull requests are welcome. Please include tests for storage helpers or a small manual test plan for UI changes.

License
-------
MIT
