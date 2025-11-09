// background service worker: create a private folder on install
// background service worker: create a private bookmarks container on install
chrome.runtime.onInstalled.addListener(() => {
  // we'll store bookmarks in chrome.storage.local under key `privateBookmarks`
  chrome.storage.local.get(['privateBookmarks', 'privateFolders'], (res) => {
    if (!res.privateBookmarks) {
      // initialize with an empty array and a simple nextId counter
      // also initialize folders with a default folder
      chrome.storage.local.set({ privateBookmarks: [], privateNextId: 1, privateFolders: [{ id: '1', name: 'Default' }], privateFolderNextId: 2 });
    } else if (!res.privateFolders) {
      chrome.storage.local.set({ privateFolders: [{ id: '1', name: 'Default' }], privateFolderNextId: 2 });
    }
  });
});
