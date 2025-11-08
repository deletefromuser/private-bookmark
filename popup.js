async function sha256(text) {
  if (!text) return '';
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2,'0')).join('');
}

// Storage-backed bookmarks helpers
function getStorage() {
  return new Promise(res => chrome.storage.local.get(['privateBookmarks', 'privateNextId', 'passwordHash'], r => res(r)));
}

function saveStorage(obj) {
  return new Promise(res => chrome.storage.local.set(obj, res));
}

async function addBookmark(title, url) {
  if (!url) return alert('URL required');
  const { privateBookmarks = [], privateNextId = 1 } = await getStorage();
  const id = String(privateNextId);
  const bm = { id, title: title || url, url };
  privateBookmarks.push(bm);
  await saveStorage({ privateBookmarks, privateNextId: privateNextId + 1 });
}

async function addCurrentTab() {
  const tabs = await new Promise(r => chrome.tabs.query({ active: true, currentWindow: true }, r));
  if (!tabs || tabs.length === 0) return;
  const t = tabs[0];
  addBookmark(t.title, t.url);
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
  addBookmark(title, url);
  document.getElementById('title').value = '';
  document.getElementById('url').value = '';
});

document.getElementById('add-current').addEventListener('click', addCurrentTab);


document.getElementById('open-view').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('view.html') });
});

// initial: popup only provides add/current/options/view functionality
