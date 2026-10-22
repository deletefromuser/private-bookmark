// background service worker: create a private folder on install
// background service worker: create a private bookmarks container on install
chrome.runtime.onInstalled.addListener(() => {
  createSchema();
});

// History monitoring: when user navigates to a monitored domain, record in visitHistory and remove from native history
const recentSeen = new Map(); // url -> timestamp
const DEBOUNCE_MS = 5000;

async function handlePossibleVisit(url, title) {
  if (!url) return;
  let parsed;
  try {
    parsed = new URL(url);
  } catch (e) {
    console.warn('handlePossibleVisit parse failed', e);
    return;
  }
  const domain = parsed.hostname.replace(/^www\./, '');
  if (!(await isDomainMonitored(domain))) return;
  const now = Date.now();
  const last = recentSeen.get(url) || 0;
  if (now - last < DEBOUNCE_MS) return; // skip duplicates
  recentSeen.set(url, now);
  // prefer explicit title, then history, then tab title
  let finalTitle = title || '';
  if (!finalTitle) finalTitle = await fetchTitleFromHistory(url);
  if (!finalTitle) finalTitle = await getTabTitleForUrl(url);
  const id = esc(String(Date.now()) + Math.random().toString(36).slice(2, 8));
  const urlEsc = esc(url);
  const titleEsc = esc(finalTitle);
  const domainEsc = esc(domain);
  try {
    await exec(
      `INSERT OR REPLACE INTO visit_history(id,url,title,domain,timestamp) VALUES('${id}','${urlEsc}','${titleEsc}','${domainEsc}', ${now});`
    );
  } catch (e) {
    console.warn('Failed to insert visit_history', e);
  }
  try {
    chrome.history.deleteUrl({ url });
  } catch (e) {
    console.warn('Failed to delete native history url', e);
  }
}

// Attempt automatic migration at startup (safe: routine checks for a migration flag)
(async () => {
  try {
    await migrateLocalStorageToSQLite();
  } catch (e) {
    console.error('Automatic migration failed', e);
  }
})();

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
    setTimeout(() => {
      handlePossibleVisit(tab.url, tab.title);
    }, 2000);
  }
});

chrome.runtime.onMessage.addListener((data, sender, sendResponse) => {
  if (data.action === 'QUERY') {
    exec(data.payload.sql)
      .then((result) => {
        sendResponse({ status: 'success', action: 'QUERY', data: result });
      })
      .catch((err) => {
        sendResponse({ status: 'error', action: 'QUERY', message: String(err) });
      });
  } else if (data.action === 'MIGRATE_DB') {
    // run migration and reply when done
    migrateLocalStorageToSQLite()
      .then(() => {
        exec('select * from visit_history')
          .then(() => {
            sendResponse({ status: 'success', action: 'MIGRATE_DB' });
          })
          .catch((err) => {
            sendResponse({ status: 'error', action: 'QUERY', message: String(err) });
          });
      })
      .catch((err) => {
        sendResponse({ status: 'error', action: 'MIGRATE_DB', message: String(err) });
      });
  } else if (data.action === 'QUERY_PARAMS') {
    const { sql, params } = data.payload || {};
    execParams(sql, params)
      .then((result) =>
        sendResponse({ status: 'success', action: 'QUERY_PARAMS', data: result })
      )
      .catch((err) =>
        sendResponse({ status: 'error', action: 'QUERY_PARAMS', message: String(err) })
      );
    return true;
  } else {
    sendResponse({ status: 'error', action: 'unknown action' });
  }
  return true;
});

// (removed unused helper)

import SQLiteESMFactory from './wa-sqlite/dist/wa-sqlite-async.mjs';
import * as SQLite from './wa-sqlite/src/sqlite-api.js';
import { IDBBatchAtomicVFS as MyVFS } from './wa-sqlite/src/examples/IDBBatchAtomicVFS.js';

let databasePromise = null;
let queryQueue = Promise.resolve();

async function openDatabase() {
  const module = await SQLiteESMFactory();
  const sqlite3 = SQLite.Factory(module);
  const vfs = await MyVFS.create('hello', module);
  // @ts-ignore
  sqlite3.vfs_register(vfs, true);
  const db = await sqlite3.open_v2('test');
  return { sqlite3, db };
}

function getDatabase() {
  if (!databasePromise) {
    databasePromise = openDatabase().catch((err) => {
      databasePromise = null;
      throw err;
    });
  }
  return databasePromise;
}

async function closeDatabase() {
  if (!databasePromise) return;
  const pending = databasePromise;
  databasePromise = null;
  try {
    const { sqlite3, db } = await pending;
    await sqlite3.close(db);
  } catch (err) {
    console.warn('Failed to close SQLite connection', err);
  }
}

function enqueue(operation) {
  const next = queryQueue.then(operation, operation);
  queryQueue = next.catch(() => {});
  return next;
}

function exec(sql) {
  return enqueue(async () => {
    const { sqlite3, db } = await getDatabase();
    const results = [];
    await sqlite3.exec(db, sql, (row, columns) => {
      if (columns != results.at(-1)?.columns) {
        results.push({ columns, rows: [] });
      }
      results.at(-1).rows.push(row);
    });
    return results;
  });
}

function execParams(sql, params) {
  return enqueue(async () => {
    const { sqlite3, db } = await getDatabase();
    const results = [];
    const bindings = Array.isArray(params) ? params : [];
    for await (const stmt of sqlite3.statements(db, sql)) {
      const expected = sqlite3.bind_parameter_count(stmt);
      if (expected !== bindings.length) {
        throw new Error(
          `Expected ${expected} SQL parameters but received ${bindings.length}`
        );
      }
      if (bindings.length > 0) {
        sqlite3.bind_collection(stmt, bindings);
      }
      let columns = null;
      const rows = [];
      while ((await sqlite3.step(stmt)) === SQLite.SQLITE_ROW) {
        if (!columns) columns = sqlite3.column_names(stmt);
        rows.push(sqlite3.row(stmt));
      }
      if (columns) results.push({ columns, rows });
    }
    return results;
  });
}

chrome.runtime.onSuspend?.addListener(() => {
  closeDatabase();
});

// Create DB schema if not present
async function createSchema() {
  const stmts = [
    `PRAGMA journal_mode = WAL;`,
    `CREATE TABLE IF NOT EXISTS settings(k TEXT PRIMARY KEY, v TEXT);`,
    `CREATE TABLE IF NOT EXISTS folders(id TEXT PRIMARY KEY, name TEXT);`,
    `CREATE TABLE IF NOT EXISTS bookmarks(id TEXT PRIMARY KEY, title TEXT, url TEXT, folderId TEXT, added INTEGER);`,
    `CREATE INDEX IF NOT EXISTS idx_bookmarks_url ON bookmarks(url);`,
    `CREATE INDEX IF NOT EXISTS idx_bookmarks_folder ON bookmarks(folderId);`,
    `CREATE TABLE IF NOT EXISTS monitored_domains(domain TEXT PRIMARY KEY);`,
    `CREATE TABLE IF NOT EXISTS visit_history(id TEXT PRIMARY KEY, url TEXT, title TEXT, domain TEXT, timestamp INTEGER);`,
    `CREATE INDEX IF NOT EXISTS idx_history_domain ON visit_history(domain);`,
    `CREATE INDEX IF NOT EXISTS idx_history_timestamp ON visit_history(timestamp)`,
  ];
  for (const s of stmts) {
    await exec(s);
  }
}

function esc(v) {
  if (v === null || v === undefined) return '';
  return String(v).replaceAll("'", "''");
}

// helper: check if domain is in monitored_domains table
async function isDomainMonitored(domain) {
  try {
    const rows = await exec(
      `SELECT domain FROM monitored_domains WHERE domain='${esc(domain)}' LIMIT 1;`
    );
    // rows is an array of blocks; check if any rows exist
    for (const b of rows || []) {
      if (Array.isArray(b.rows) && b.rows.length > 0) return true;
    }
    return false;
  } catch (e) {
    console.warn('isDomainMonitored query failed', e);
    return false;
  }
}

// helper: try to get title from history for exact URL
async function fetchTitleFromHistory(url) {
  try {
    const items = await new Promise((r) => chrome.history.search({ text: url, maxResults: 10 }, r));
    if (items && items.length > 0 && items[0].title) return items[0].title;
  } catch (e) {
    console.debug('fetchTitleFromHistory failure', e);
  }
  return '';
}

// helper: try to get title from open tabs for exact URL
async function getTabTitleForUrl(url) {
  try {
    const tabs = await new Promise((r) => chrome.tabs.query({ url }, r));
    if (tabs && tabs.length > 0 && tabs[0].title) return tabs[0].title;
  } catch (e) {
    console.debug('getTabTitleForUrl failure', e);
  }
  return '';
}

async function isMigrationComplete() {
  try {
    const rows = await exec(
      `SELECT v FROM settings WHERE k = 'db_migrated_v1' LIMIT 1;`
    );
    return (rows || []).some((b) => Array.isArray(b.rows) && b.rows.length > 0);
  } catch (e) {
    return false;
  }
}

// Migrate from chrome.storage.local into SQLite tables. Runs once.
async function migrateLocalStorageToSQLite() {
  try {
    if (await isMigrationComplete()) {
      return;
    }

    await createSchema();

    const keys = await new Promise((r) =>
      chrome.storage.local.get(
        [
          'privateBookmarks',
          'privateFolders',
          'passwordHash',
          'monitoredDomains',
          'visitHistory',
          'privateNextId',
          'privateFolderNextId',
        ],
        r
      )
    );

    // Migrate settings/password and next ids
    if (keys.passwordHash) {
      await exec(
        `INSERT OR REPLACE INTO settings(k,v) VALUES('passwordHash', '${esc(keys.passwordHash)}');`
      );
    }
    if (keys.privateNextId !== undefined) {
      await exec(
        `INSERT OR REPLACE INTO settings(k,v) VALUES('privateNextId', '${String(keys.privateNextId)}');`
      );
    }
    if (keys.privateFolderNextId !== undefined) {
      await exec(
        `INSERT OR REPLACE INTO settings(k,v) VALUES('privateFolderNextId', '${String(keys.privateFolderNextId)}');`
      );
    }

    // folders
    const folders = Array.isArray(keys.privateFolders) ? keys.privateFolders : [];
    for (const f of folders) {
      const id = esc(f.id);
      const name = esc(f.name || '');
      await exec(`INSERT OR REPLACE INTO folders(id,name) VALUES('${id}','${name}');`);
    }

    // bookmarks
    const bms = Array.isArray(keys.privateBookmarks) ? keys.privateBookmarks : [];
    for (const b of bms) {
      const id = esc(b.id);
      const title = esc(b.title || '');
      const url = esc(b.url || '');
      const folderId = esc(b.folderId || '1');
      const added = Number(b.added) || Date.now();
      await exec(
        `INSERT OR REPLACE INTO bookmarks(id,title,url,folderId,added) VALUES('${id}','${title}','${url}','${folderId}', ${added});`
      );
    }

    // monitored domains
    const mons = Array.isArray(keys.monitoredDomains) ? keys.monitoredDomains : [];
    for (const d of mons) {
      await exec(`INSERT OR REPLACE INTO monitored_domains(domain) VALUES('${esc(d)}');`);
    }

    // visit history
    const hist = Array.isArray(keys.visitHistory) ? keys.visitHistory : [];
    for (const h of hist) {
      const id =
        esc(h.id || (String(Date.now()) + Math.random().toString(36).slice(2, 8)));
      const url = esc(h.url || '');
      const title = esc(h.title || '');
      const domain = esc(h.domain || '');
      const ts = Number(h.timestamp) || Date.now();
      await exec(
        `INSERT OR REPLACE INTO visit_history(id,url,title,domain,timestamp) VALUES('${id}','${url}','${title}','${domain}', ${ts});`
      );
    }

    // Set the flag in SQLite and remove legacy data so it cannot be re-imported.
    await exec(`INSERT OR REPLACE INTO settings(k,v) VALUES('db_migrated_v1','true');`);
    await new Promise((r) =>
      chrome.storage.local.remove(
        [
          'privateBookmarks',
          'privateFolders',
          'passwordHash',
          'monitoredDomains',
          'visitHistory',
          'privateNextId',
          'privateFolderNextId',
          'db_migrated_v1',
        ],
        r
      )
    );
  } catch (e) {
    console.error('Migration failed', e);
  }
}
