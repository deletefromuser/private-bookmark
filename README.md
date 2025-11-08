Private Bookmark - Chrome MV3 Extension

Features:
- Create a private bookmark folder on install
- Add bookmark, add current tab
- Edit / delete bookmarks
- View page protected by password (SHA-256 of password stored in local storage)

Install:
1. Open chrome://extensions
2. Enable Developer mode
3. Click "Load unpacked" and select this folder

Usage:
- Click the extension icon to open the popup. Set a password (optional), add bookmarks or add the current tab.
- Click "Open View Page" to open the full view; enter the password if set.

Notes & assumptions:
- Password is stored as SHA-256 in chrome.storage.local for demonstration purposes. Use platform-level protection for real secrets.
- This is a minimal demo. Improvements: better UI, secure password management, encrypt bookmark URLs, move password management to background for security.
