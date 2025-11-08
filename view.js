async function sha256(text) {
  if (!text) return '';
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2,'0')).join('');
}

function getFolderId() {
  return new Promise((res) => chrome.storage.local.get(['privateFolderId'], r => res(r.privateFolderId)));
}

function getPasswordHash() {
  return new Promise(res => chrome.storage.local.get(['passwordHash'], r => res(r.passwordHash)));
}

async function loadBookmarks() {
  const listEl = document.getElementById('bookmarks-list');
  listEl.textContent = 'Loading...';
  const res = await new Promise(r => chrome.storage.local.get(['privateBookmarks'], r));
  const nodes = res.privateBookmarks || [];
  listEl.innerHTML = '';
  if (!nodes || nodes.length === 0) { listEl.textContent = 'No bookmarks'; return; }
  nodes.forEach(n => {
    const row = document.createElement('div');
    row.className = 'bm-row';
    row.innerHTML = `<a class="bm-link" href="${n.url || '#'}" target="_blank">${n.title || n.url}</a>
      <button data-id="${n.id}" class="edit">Edit</button>
      <button data-id="${n.id}" class="del">Delete</button>`;
    listEl.appendChild(row);
  });
}

document.getElementById('unlock').addEventListener('click', async () => {
  const pw = document.getElementById('pw').value;
  const stored = await getPasswordHash();
  if (!stored) {
    // no password set -> allow
    document.getElementById('auth').style.display = 'none';
    document.getElementById('content').style.display = 'block';
    loadBookmarks();
    return;
  }
  const hash = await sha256(pw);
  if (hash === stored) {
    document.getElementById('auth').style.display = 'none';
    document.getElementById('content').style.display = 'block';
    loadBookmarks();
  } else alert('Wrong password');
});

// delegate edit/delete
document.getElementById('bookmarks-list').addEventListener('click', (e) => {
  const id = e.target.getAttribute('data-id');
  if (!id) return;
  if (e.target.classList.contains('del')) {
    if (!confirm('Delete bookmark?')) return;
    (async () => {
      const { privateBookmarks = [] } = await new Promise(r => chrome.storage.local.get(['privateBookmarks'], r));
      const idx = privateBookmarks.findIndex(b => b.id === id);
      if (idx >= 0) {
        privateBookmarks.splice(idx, 1);
        await new Promise(r => chrome.storage.local.set({ privateBookmarks }, r));
        loadBookmarks();
      }
    })();
  } else if (e.target.classList.contains('edit')) {
    (async () => {
      const newTitle = prompt('New title');
      const newUrl = prompt('New URL (leave blank to keep)');
      const { privateBookmarks = [] } = await new Promise(r => chrome.storage.local.get(['privateBookmarks'], r));
      const bm = privateBookmarks.find(b => b.id === id);
      if (!bm) return alert('Bookmark not found');
      if (newTitle != null) bm.title = newTitle;
      if (newUrl) bm.url = newUrl;
      await new Promise(r => chrome.storage.local.set({ privateBookmarks }, r));
      loadBookmarks();
    })();
  }
});

// initial check
(async function(){
  const stored = await getPasswordHash();
  const authMsg = document.getElementById('auth-msg');
  if (!stored) {
    authMsg.textContent = 'No password set — click Unlock to view.';
  } else {
    authMsg.textContent = 'Enter password to view.';
  }
})();
