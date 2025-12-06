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
    // append to visitHistory; prefer title from native history before it's deleted
    let finalTitle = title || '';
    try {
      // try to find a matching history item for this exact URL
      const historyItems = await new Promise(r => chrome.history.search({ text: url, maxResults: 10 }, r));
      // console.log(JSON.stringify(historyItems.map(item => item.title)));
      // chrome.history.search({"maxResults":10}).then(list => {console.log(JSON.stringify());});
      if (historyItems && historyItems.length > 0 && historyItems[0].title) {
        finalTitle = historyItems[0].title;
      }
    } catch (e) {
      // ignore and fall back to tabs
    }
    if (!finalTitle) {
      try {
        const tabs = await new Promise(r => chrome.tabs.query({ url }, r));
        if (tabs && tabs.length > 0 && tabs[0].title) finalTitle = tabs[0].title;
      } catch (e) {
        // ignore
      }
    }
    const h = await new Promise(r => chrome.storage.local.get(['visitHistory'], r));
    const current = h.visitHistory || [];
    const entry = { id: String(Date.now()) + Math.random().toString(36).slice(2, 8), url, title: finalTitle, domain, timestamp: now };
    current.push(entry);
    await chrome.storage.local.set({ visitHistory: current });
    // remove from native history
    try {
      // delete the URL from native history after we've read its title
      chrome.history.deleteUrl({ url });
    } catch (e) { console.warn('Failed to delete native history url', e); }
  } catch (e) {
    console.warn('handlePossibleVisit parse failed', e);
  }
}

// listen for navigations completed (fires when the document finishes loading)
chrome.webNavigation?.onCompleted?.addListener((details) => {
  if (details && details.url && details.frameId === 0) {
    // console.log("triggered web navigation");
    // pass empty title; handlePossibleVisit will query the tab title if needed
    handlePossibleVisit(details.url, '');
  }
});

// fallback: tabs.onUpdated detect URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab && tab.url) {
    // console.log("triggered tab update");
    setTimeout(() => {
      handlePossibleVisit(tab.url, tab.title);
    }, 2000);
  }
});


chrome.runtime.onMessage.addListener((data, sender, sendResponse) => {
  console.log(data);
  if (data.action === 'QUERY') {
    exec(data.payload.sql).then(result => {
      console.log(result);
      sendResponse({ status: 'success', action: 'QUERY', data: result });
    });
  }
  return true;
});

// async function handleMsg(sendResponse, data) {
//   await exec(data.payload.sql).then(result => {
//     console.log(result);
//     sendResponse({ status: 'success', action: 'QUERY', data: result });
//   });
// };

import SQLiteESMFactory from './wa-sqlite/dist/wa-sqlite-async.mjs';
import * as SQLite from './wa-sqlite/src/sqlite-api.js';
import { IDBBatchAtomicVFS as MyVFS } from './wa-sqlite/src/examples/IDBBatchAtomicVFS.js';

async function exec(sql) {
  // Initialize SQLite.
  const module = await SQLiteESMFactory();
  const sqlite3 = SQLite.Factory(module);

  // Register a custom file system.
  const vfs = await MyVFS.create('hello', module);
  // @ts-ignore
  sqlite3.vfs_register(vfs, true);

  // Open the database.
  const db = await sqlite3.open_v2('test');
  const results = [];
  await sqlite3.exec(db, sql, (row, columns) => {
    if (columns != results.at(-1)?.columns) {
      results.push({ columns, rows: [] });
    }
    results.at(-1).rows.push(row);
  });
  return results;
}

