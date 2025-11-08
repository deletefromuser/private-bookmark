// background service worker: create a private folder on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['privateFolderId'], (res) => {
    if (!res.privateFolderId) {
      chrome.bookmarks.create({ title: 'Private Bookmarks' }, (node) => {
        if (chrome.runtime.lastError) {
          console.warn('Bookmarks create error', chrome.runtime.lastError);
          return;
        }
        chrome.storage.local.set({ privateFolderId: node.id });
      });
    }
  });
});
