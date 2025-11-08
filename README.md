Private Bookmark - Chrome MV3 Extension

Overview
--------
This extension stores private bookmarks inside the extension using `chrome.storage.local` instead of the browser's bookmarks API. It provides a compact popup for adding bookmarks and a full `view.html` page for listing, editing, and deleting them. The view page can be password-protected.

Key changes in this version
--------------------------
- Bookmarks are stored in `chrome.storage.local` under the key `privateBookmarks` (array of { id, title, url }). A `privateNextId` counter is used to generate simple ids.
- Password management moved to an Options page (`options.html` / `options.js`). The password is stored as a SHA-256 hash in `passwordHash`.
- Changing or clearing the password requires entering the current password or the fixed master password `tomhawk001` (built-in master password — consider replacing/removing for production).
- The popup no longer shows the bookmark list. It provides:
	- Add Bookmark form (title + URL)
	- Add Current Tab button (disabled automatically if the current tab URL is already saved)
	- Open Options and Open View Page buttons
	- A short non-intrusive status message on successful add
- The extension sets a badge (green star) via `chrome.action.setBadgeText` when the current tab is already bookmarked.

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
