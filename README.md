
Private Bookmark - Chrome MV3 Extension

Overview
--------
Private Bookmark stores bookmarks inside the extension using `chrome.storage.local` (local-first, private storage). This release adds folder support, import/export, and UX improvements. The extension uses a Popup for quick adds, a View page for browsing/editing bookmarks, and an Options page for settings and management.

Highlights
----------
- Storage: bookmarks are stored under `privateBookmarks` as objects { id, title, url, folderId, added } and a `privateFolders` array stores folder objects { id, name }.
- Added timestamp: bookmarks include an `added` numeric timestamp (ms since epoch). New bookmarks use Date.now(); imports preserve Chrome's `dateAdded` when present.
- Folders & management: folder creation, rename and delete (with move-or-delete options for contained bookmarks) are available on the Options page (`options.html` / `options.js`).
- Import / Export: options page supports importing from Chrome's bookmark tree (requires `bookmarks` permission) and exporting private bookmarks to a Chrome-compatible HTML file.
- Password: password handling is on the Options page. Passwords are hashed (SHA-256) and changing/clearing requires the current password or a developer recovery master password (remove/replace for production).
- UX: non-blocking in-page modals replace blocking window.prompt/confirm calls. Bootstrap 5 and Google Noto fonts are used for consistent styling and CJK-capable typography.

Install
-------
1. Open chrome://extensions
2. Enable Developer mode
3. Click "Load unpacked" and select this folder

How to use
----------
- Popup (quick add):
	- Add Title + URL or click Add Current Tab to save the active tab.
	- The Add Current Tab button is disabled when that URL is already saved.
	- Use Open Options to manage passwords, folders, and import/export.
	- Use Open View Page to browse and edit bookmarks (password-protected if set).

- Options page (management):
	- Create, rename, and delete folders. Deleting a folder prompts whether to delete bookmarks inside or move them to another folder.
	- Import bookmarks from a selected Chrome bookmark folder (preserves `dateAdded` where available).
	- Export private bookmarks to a Chrome-compatible HTML file (simple DL with folder grouping).
	- Set/clear password (change/clear requires current password or master password).

Storage schema
--------------
- `privateBookmarks`: array of { id: string, title: string, url: string, folderId: string, added: number }
- `privateNextId`: number (next id to use)
- `privateFolders`: array of { id: string, name: string }
- `privateFolderNextId`: number
- `passwordHash`: string (SHA-256 hex)

Security notes
--------------
- Passwords are stored as a SHA-256 hash in extension local storage. This is NOT a secure secret management approach for production — consider OS-level key stores or encrypting with a user-supplied key.
- A built-in master password exists for recovery in developer builds; remove or secure this in production.

Development & UI
----------------
- The UI uses Bootstrap 5 and Google Noto fonts for consistent, CJK-capable typography.
- Blocking native prompts were replaced with a small in-page modal helper (`modal.js`) which returns Promises.

Testing checklist
-----------------
1. Load the unpacked extension in Developer mode.
2. Add a bookmark via the popup or view page and confirm it appears in the View page with an "added" timestamp.
3. Create folders in Options, move bookmarks between folders, and test rename/delete flows (including move vs delete behavior).
4. Import a Chrome bookmark folder from Options (requires bookmarks permission) and verify `added` timestamps are preserved when possible.
5. Export the private bookmarks via Options and confirm download of a bookmarks HTML file.

Next steps / improvements
------------------------
- Replace the built-in master password recovery with a safer option (backup key, export/import of encrypted data).
- Improve deduplication and URL normalization.
- Add automated tests for storage helpers and import/export routines.

Contact
-------
This is a demo extension. If you want improvements or tests added, open an issue or request changes.

TODO
----
- Consider bundling fonts and Bootstrap locally to avoid CDN dependency.
- Add unit tests and end-to-end smoke tests for import/export flows.
- Optionally preserve folder trees from Chrome imports instead of flattening into a single folder.

Install
-------
1. Open chrome://extensions
2. Enable Developer mode
3. Click "Load unpacked" and select this folder

How to use
----------
- Popup (icon):
	- Use the Add form to save a bookmark.
	- Click Add Current Tab to save the active tab; the button is disabled when the current tab is already saved.
	- Click Open Options to manage the password.
	- Click Open View Page to see and edit saved bookmarks (password required if set).

- Options page:
	- Set or change the password. To change or clear, you'll be prompted for the current password or you can enter the master password `tomhawk001`.

Storage schema
--------------
- `privateBookmarks`: array of { id: string, title: string, url: string }
- `privateNextId`: number (next id to use)
- `passwordHash`: string (SHA-256 hex)

Security notes
--------------
- Passwords are stored as a SHA-256 hash in extension local storage. This is NOT a secure secret management approach for production — consider OS-level key stores or encrypting with a user-supplied key.
- A built-in master password (`tomhawk001`) exists in code to allow recovery; remove or secure this for real deployments.

Testing checklist
-----------------
1. Load unpacked extension in Developer mode.
2. Open a tab with a URL you want to save and click the extension. "Add Current Tab" should be enabled if not already saved.
3. Click Add Current Tab — it should disable while saving, then show "Bookmark added" and the button state should update.
4. Open a tab known to be saved — the popup should disable Add Current Tab and the badge should show a star.
5. Open Options and set/clear password; confirm change requires current password or master password.

Next steps / improvements
------------------------
- Use UUIDs instead of a numeric counter for bookmark ids.
- Replace the hard-coded master password with a safer recovery mechanism.
- Improve URL normalization (strip www, canonicalize trailing slashes, query param handling) to avoid duplicates.
- Add unit tests for storage helpers.

Contact
-------
This is a small demo. If you want improvements or tests added, open an issue or request changes.

TODO
----
- Add bookmark folder support in the private storage (create named folders, move bookmarks between folders).
- Implement import from Chrome bookmarks (map Chrome bookmarks into `privateBookmarks` and optionally into folders).
- Implement export to Chrome bookmarks/HTML so users can export their private bookmarks back into the browser or save a backup HTML file.
- Add UI in popup or view page to create/manage folders and to trigger import/export.
- Add unit tests for storage helpers and normalization logic.
