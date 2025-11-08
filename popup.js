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

async function listBookmarks() {
  const listEl = document.getElementById('bookmarks-list');
  listEl.textContent = 'Loading...';
  const { privateBookmarks = [] } = await getStorage();
  listEl.innerHTML = '';
  if (!privateBookmarks || privateBookmarks.length === 0) {
    listEl.textContent = 'No bookmarks yet.';
    return;
  }
  privateBookmarks.forEach(n => {
    const row = document.createElement('div');
    row.className = 'bm-row';
    row.innerHTML = `<a class="bm-link" href="#" data-id="${n.id}">${n.title || n.url}</a>
      <button data-id="${n.id}" class="edit">Edit</button>
      <button data-id="${n.id}" class="del">Delete</button>`;
    listEl.appendChild(row);
  });
}

async function addBookmark(title, url) {
  if (!url) return alert('URL required');
  const { privateBookmarks = [], privateNextId = 1 } = await getStorage();
  const id = String(privateNextId);
  const bm = { id, title: title || url, url };
  privateBookmarks.push(bm);
  await saveStorage({ privateBookmarks, privateNextId: privateNextId + 1 });
  await listBookmarks();
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

function wireListHandlers() {
  document.getElementById('bookmarks-list').addEventListener('click', (e) => {
    const id = e.target.getAttribute('data-id');
    if (!id) return;
    if (e.target.classList.contains('del')) {
      if (!confirm('Delete bookmark?')) return;
      (async () => {
        const { privateBookmarks = [] } = await getStorage();
        const idx = privateBookmarks.findIndex(b => b.id === id);
        if (idx >= 0) {
          privateBookmarks.splice(idx, 1);
          await saveStorage({ privateBookmarks });
          await listBookmarks();
        }
      })();
    } else if (e.target.classList.contains('edit')) {
      (async () => {
        const newTitle = prompt('New title');
        const newUrl = prompt('New URL (leave blank to keep)');
        const { privateBookmarks = [] } = await getStorage();
        const bm = privateBookmarks.find(b => b.id === id);
        if (!bm) return alert('Bookmark not found');
        if (newTitle != null) bm.title = newTitle;
        if (newUrl) bm.url = newUrl;
        await saveStorage({ privateBookmarks });
        await listBookmarks();
      })();
    }
  });
}

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

// delegate clicks for open link
document.getElementById('bookmarks-list').addEventListener('click', (e) => {
  if (e.target && e.target.matches('a.bm-link')) {
    const id = e.target.getAttribute('data-id');
    (async () => {
      const { privateBookmarks = [] } = await getStorage();
      const bm = privateBookmarks.find(b => b.id === id);
      if (bm && bm.url) chrome.tabs.create({ url: bm.url });
    })();
  }
});

// initial
wireListHandlers();
listBookmarks();
