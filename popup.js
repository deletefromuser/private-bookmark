// 发送查询命令
async function runQuery(sql) {
  return chrome.runtime.sendMessage({
    action: 'QUERY',
    payload: { sql: sql }
  }).then(response => {
    if (response.status === 'success' && response.action === 'QUERY') {
      console.log("查询结果:", response.data);
    }
  });
}

async function sha256(text) {
  if (!text) return '';
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Storage-backed bookmarks helpers
function getStorage() {
  return new Promise(res => chrome.storage.local.get(['privateBookmarks', 'privateNextId', 'passwordHash'], r => res(r)));
}

function saveStorage(obj) {
  return new Promise(res => chrome.storage.local.set(obj, res));
}

async function addBookmark(title, url, folderId) {
  if (!url) return alert('URL required');
  return await window.db.addBookmark({ title: title || url, url, folderId: folderId || '1', added: Date.now() });
}

function normalizeUrl(u) {
  try {
    const parsed = new URL(u);
    // drop hash, keep origin + pathname + search
    let path = parsed.pathname || '/';
    // remove trailing slash for comparison
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    return parsed.origin + path + (parsed.search || '');
  } catch (e) {
    // fallback: strip hash and trailing slash
    let s = String(u).split('#')[0];
    if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
    return s;
  }
}

// load folders into the popup select (db-backed)
async function loadFoldersIntoSelect() {
  const sel = document.getElementById('folder-select');
  if (!sel) return;
  sel.innerHTML = '';
  const folders = await window.db.getFolders();
  (folders || [{ id: '1', name: 'Default' }]).forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = f.name;
    sel.appendChild(opt);
  });
}

async function isUrlBookmarked(url) {
  if (!url) return false;
  const found = await window.db.findBookmarkByUrl(url);
  return !!found;
}

async function updateCurrentTabState() {
  const addCurrentBtn = document.getElementById('add-current');
  const setBadge = (text, color) => {
    try {
      if (color !== undefined) chrome.action.setBadgeBackgroundColor({ color });
      chrome.action.setBadgeText({ text });
    } catch (err) {
      console.warn('Failed to set badge', err);
    }
  };

  const tabs = await new Promise(r => chrome.tabs.query({ active: true, currentWindow: true }, r));
  if (!tabs || tabs.length === 0) {
    if (addCurrentBtn) addCurrentBtn.disabled = false;
    setBadge('');
    return;
  }
  const t = tabs[0];
  const bookmarked = await isUrlBookmarked(t.url);
  if (bookmarked) {
    if (addCurrentBtn) addCurrentBtn.disabled = true;
    setBadge('★', '#4CAF50');
  } else {
    if (addCurrentBtn) addCurrentBtn.disabled = false;
    setBadge('');
  }
}

async function addCurrentTab() {
  const tabs = await new Promise(r => chrome.tabs.query({ active: true, currentWindow: true }, r));
  if (!tabs || tabs.length === 0) return;
  const t = tabs[0];
  const addBtn = document.getElementById('add-bookmark');
  const addCurrentBtn = document.getElementById('add-current');
  addBtn.disabled = true;
  addCurrentBtn.disabled = true;
  try {
    const sel = document.getElementById('folder-select');
    const folderId = sel ? sel.value : undefined;
    await addBookmark(t.title, t.url, folderId);
    showStatus('Bookmark added');
  } catch (err) {
    console.warn('Add current failed', err);
  } finally {
    addBtn.disabled = false;
    addCurrentBtn.disabled = false;
    updateCurrentTabState();
  }
}

// Password UI moved to Options page; provide helper to open it from popup
document.getElementById('open-options')?.addEventListener('click', () => {
  if (chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage();
  else chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
});

// bookmark list UI removed from popup; edit/delete handled in view.html

document.getElementById('add-bookmark').addEventListener('click', () => {
  const title = document.getElementById('title').value;
  const url = document.getElementById('url').value;
  if (!url) return alert('URL required');
  const addBtn = document.getElementById('add-bookmark');
  const addCurrentBtn = document.getElementById('add-current');
  addBtn.disabled = true;
  addCurrentBtn.disabled = true;
  const folderId = document.getElementById('folder-select')?.value;
  addBookmark(title, url, folderId).then(() => showStatus('Bookmark added')).catch(err => console.warn('Add failed', err)).finally(() => {
    addBtn.disabled = false;
    addCurrentBtn.disabled = false;
    updateCurrentTabState();
  });
  document.getElementById('title').value = '';
  document.getElementById('url').value = '';
});

document.getElementById('add-current').addEventListener('click', addCurrentTab);

document.getElementById('add-current-domain')?.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) return showStatus('No active tab URL');
  const url = new URL(tab.url);
  const domain = url.hostname.replace(/^www\./, '');
  const list = await window.db.getMonitoredDomains();
  if (!list.includes(domain)) {
    await window.db.addMonitoredDomain(domain);
    showStatus('Domain added to monitored list');
  } else showStatus('Domain is already monitored');
});

document.getElementById('open-view').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('view.html') });

  // 示例：插入数据
runQuery("CREATE TABLE IF NOT EXISTS t(x PRIMARY KEY, y)").then(response => {
    
  });
runQuery("INSERT OR REPLACE INTO t VALUES ('good', 'bad1'), ('hot', 'cold'), ('up', 'down')").then(item => {});

// 示例：查询所有数据
runQuery("SELECT * FROM t").then(item => {});
});

document.getElementById('open-history-viewer')?.addEventListener('click', async () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
});

// initial: popup only provides add/current/options/view functionality

// small status helper
function showStatus(msg, timeout = 2500) {
  const el = document.getElementById('status');
  if (!el) return;
  el.textContent = msg;
  setTimeout(() => { if (el.textContent === msg) el.textContent = ''; }, timeout);
}

// initialize current-tab state when popup opens
try { updateCurrentTabState(); } catch (e) { /* non-fatal */ }
// load folders for folder select
loadFoldersIntoSelect();
// (showStatus is defined above)
