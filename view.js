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

// load chrome bookmark folders into select
// ...existing code...

async function loadBookmarks() {
  const listEl = document.getElementById('bookmarks-list');
  listEl.textContent = 'Loading...';
  const res = await new Promise(r => chrome.storage.local.get(['privateBookmarks', 'privateFolders'], r));
  const nodes = res.privateBookmarks || [];
  const folders = res.privateFolders || [{ id: '1', name: 'Default' }];
  listEl.innerHTML = '';
  if (!nodes || nodes.length === 0) { listEl.textContent = 'No bookmarks'; return; }
  // render grouped by folder
  folders.forEach(folder => {
    const heading = document.createElement('h3');
    heading.textContent = folder.name;
    listEl.appendChild(heading);
    const folderNodes = nodes.filter(n => (n.folderId || '1') === folder.id);
    if (folderNodes.length === 0) {
      const p = document.createElement('div'); p.textContent = 'No bookmarks in this folder.'; listEl.appendChild(p);
      return;
    }
    folderNodes.forEach(n => {
      const row = document.createElement('div');
      row.className = 'bm-row';
      // include a move-to-folder select
      const folderSelectHtml = `<select data-id="${n.id}" class="move-select">` +
        folders.map(f => `<option value="${f.id}" ${f.id=== (n.folderId||'1')? 'selected':''}>${f.name}</option>`).join('') +
        `</select>`;
      // format added time if present
      const added = n.added ? new Date(Number(n.added)).toLocaleString() : '';
      const addedHtml = added ? `<span class="bm-added">${added}</span>` : '';
      row.innerHTML = `<a class="bm-link" href="${n.url || '#'}" target="_blank">${n.title || n.url}</a> ${addedHtml}
        ${folderSelectHtml}
        <button data-id="${n.id}" class="edit">Edit</button>
        <button data-id="${n.id}" class="del">Delete</button>`;
      listEl.appendChild(row);
    });
  });
}

// folder and import/export UI moved to options page

document.getElementById('unlock').addEventListener('click', async () => {
  const pw = document.getElementById('pw').value;
  const stored = await getPasswordHash();
  if (!stored) {
    // no password set -> allow
    document.getElementById('auth').style.display = 'none';
    document.getElementById('content').style.display = 'block';
    loadBookmarks();
    loadFoldersUI();
    loadChromeFoldersIntoSelect();
    return;
  }
  const hash = await sha256(pw);
  if (hash === stored) {
    document.getElementById('auth').style.display = 'none';
    document.getElementById('content').style.display = 'block';
  loadBookmarks();
  loadFoldersUI();
  loadChromeFoldersIntoSelect();
  } else alert('Wrong password');
});

// delegate edit/delete
document.getElementById('bookmarks-list').addEventListener('click', (e) => {
  const id = e.target.getAttribute('data-id');
  if (!id) return;
  if (e.target.classList.contains('del')) {
    // non-blocking confirm
    _modal.showConfirm('Delete bookmark?').then(async (ok) => {
      if (!ok) return;
      const { privateBookmarks = [] } = await new Promise(r => chrome.storage.local.get(['privateBookmarks'], r));
      const idx = privateBookmarks.findIndex(b => b.id === id);
      if (idx >= 0) {
        privateBookmarks.splice(idx, 1);
        await new Promise(r => chrome.storage.local.set({ privateBookmarks }, r));
        loadBookmarks();
      }
    });
  } else if (e.target.classList.contains('edit')) {
    (async () => {
      const newTitle = await _modal.showTextPrompt('New title', '');
      if (newTitle === null) return; // cancelled
      const newUrl = await _modal.showTextPrompt('New URL (leave blank to keep)', '');
      const { privateBookmarks = [] } = await new Promise(r => chrome.storage.local.get(['privateBookmarks'], r));
      const bm = privateBookmarks.find(b => b.id === id);
      if (!bm) { _modal.showConfirm('Bookmark not found'); return; }
      if (newTitle != null) bm.title = newTitle;
      if (newUrl) bm.url = newUrl;
      await new Promise(r => chrome.storage.local.set({ privateBookmarks }, r));
      loadBookmarks();
    })();
  }
});

// handle move-to-folder select changes
document.getElementById('bookmarks-list').addEventListener('change', (e) => {
  if (!e.target || !e.target.classList.contains('move-select')) return;
  const id = e.target.getAttribute('data-id');
  const newFolderId = e.target.value;
  (async () => {
    const { privateBookmarks = [] } = await new Promise(r => chrome.storage.local.get(['privateBookmarks'], r));
    const bm = privateBookmarks.find(b => b.id === id);
    if (!bm) return alert('Bookmark not found');
    bm.folderId = newFolderId;
    await new Promise(r => chrome.storage.local.set({ privateBookmarks }, r));
    loadBookmarks();
  })();
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
  // focus password input for quick typing
  const pwInput = document.getElementById('pw');
  if (pwInput) {
    pwInput.focus();
    // submit on Enter
    pwInput.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') document.getElementById('unlock').click();
    });
  }
})();

// folder management moved to options page
