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

  // History monitoring: when user navigates to a monitored domain, record in visitHistory and remove from native history
  const recentSeen = new Map(); // url -> timestamp
  const DEBOUNCE_MS = 5000;

  async function handlePossibleVisit(url, title) {
    if (!url) return;
    try {
      const parsed = new URL(url);
      const domain = parsed.hostname.replace(/^www\./, '');
      const res = await chrome.storage.local.get({ monitoredDomains: [] });
      const list = res.monitoredDomains || [];
      if (!list.includes(domain)) return;
      const now = Date.now();
      const last = recentSeen.get(url) || 0;
      if (now - last < DEBOUNCE_MS) return; // skip duplicates
      recentSeen.set(url, now);
      // append to visitHistory; if title not provided, try to fetch from tabs
      let finalTitle = title || '';
      if (!finalTitle) {
        try {
          // try to find a matching tab title
          const tabs = await new Promise(r => chrome.tabs.query({ url }, r));
          if (tabs && tabs.length > 0 && tabs[0].title) finalTitle = tabs[0].title;
        } catch (e) {
          // ignore
        }
      }
      const h = await new Promise(r => chrome.storage.local.get(['visitHistory'], r));
      const current = h.visitHistory || [];
      const entry = { id: String(Date.now()) + Math.random().toString(36).slice(2,8), url, title: finalTitle, domain, timestamp: now };
      current.push(entry);
      await chrome.storage.local.set({ visitHistory: current });
      // remove from native history
      try {  chrome.history.search({"maxResults":5}).then(list => {console.log(JSON.stringify());}); chrome.history.deleteUrl({ url }); } catch (e) { console.warn('Failed to delete native history url', e); }
    } catch (e) {
      console.warn('handlePossibleVisit parse failed', e);
    }
  }

  // listen for navigations completed (fires when the document finishes loading)
  chrome.webNavigation?.onCompleted?.addListener((details) => {
    if (details && details.url && details.frameId === 0) {
      // pass empty title; handlePossibleVisit will query the tab title if needed
      handlePossibleVisit(details.url, '');
    }
  });

  // fallback: tabs.onUpdated detect URL changes
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab && tab.url) {
      handlePossibleVisit(tab.url, tab.title);
    }
  });
