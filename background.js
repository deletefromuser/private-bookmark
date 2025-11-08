// background service worker: create a private folder on install
// background service worker: create a private bookmarks container on install
chrome.runtime.onInstalled.addListener(() => {
  // we'll store bookmarks in chrome.storage.local under key `privateBookmarks`
  chrome.storage.local.get(['privateBookmarks'], (res) => {
    if (!res.privateBookmarks) {
      // initialize with an empty array and a simple nextId counter
      chrome.storage.local.set({ privateBookmarks: [], privateNextId: 1 });
    }
  });
});
