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
function buildChromeFolderList(nodes, list) {
  nodes.forEach(n => {
    if (n.url) return; // skip bookmarks, only folders
    list.push({ id: n.id, title: n.title });
    if (n.children) buildChromeFolderList(n.children, list);
  });
}

function loadChromeFoldersIntoSelect() {
  const sel = document.getElementById('chrome-folders-select');
  if (!sel || !chrome.bookmarks) return;
  chrome.bookmarks.getTree((nodes) => {
    const list = [];
    buildChromeFolderList(nodes, list);
    sel.innerHTML = '';
    list.forEach(f => {
      const opt = document.createElement('option'); opt.value = f.id; opt.textContent = f.title || f.id; sel.appendChild(opt);
    });
  });
}

// import all bookmark nodes (type=bookmark) under a chrome bookmark folder id
function collectChromeBookmarks(node, out) {
  if (!node) return;
  if (node.url) out.push({ title: node.title, url: node.url });
  if (node.children) node.children.forEach(c => collectChromeBookmarks(c, out));
}

document.getElementById('import-chrome').addEventListener('click', async () => {
  const sel = document.getElementById('chrome-folders-select');
  if (!sel || !sel.value) return alert('Select a Chrome folder to import');
  const chromeFolderId = sel.value;
  const statusEl = document.getElementById('import-status');
  statusEl.textContent = 'Importing...';
  // fetch chrome folder node
  chrome.bookmarks.getSubTree(chromeFolderId, async (nodes) => {
    if (!nodes || nodes.length === 0) { statusEl.textContent = 'No nodes found'; return; }
    const root = nodes[0];
    const collected = [];
    collectChromeBookmarks(root, collected);
    if (collected.length === 0) { statusEl.textContent = 'No bookmarks to import in selected folder.'; return; }
    // create a new private folder with chrome folder name
    const chromeFolderName = root.title || 'Imported';
    const res = await new Promise(r => chrome.storage.local.get(['privateFolders', 'privateFolderNextId', 'privateBookmarks', 'privateNextId'], r));
    const folders = res.privateFolders || [];
    const nextFolderId = res.privateFolderNextId || (folders.length + 1);
    const newFolderId = String(nextFolderId);
    folders.push({ id: newFolderId, name: chromeFolderName });
    const privateBookmarks = res.privateBookmarks || [];
    let nextBmId = res.privateNextId || (privateBookmarks.length + 1);
    collected.forEach(b => {
      privateBookmarks.push({ id: String(nextBmId++), title: b.title, url: b.url, folderId: newFolderId });
    });
    await new Promise(r => chrome.storage.local.set({ privateFolders: folders, privateFolderNextId: nextFolderId + 1, privateBookmarks, privateNextId: nextBmId }, r));
    statusEl.textContent = `Imported ${collected.length} bookmarks into folder "${chromeFolderName}"`;
    loadBookmarks();
  });
});

// export private bookmarks into a Chrome-compatible bookmarks HTML and trigger download
document.getElementById('export-html').addEventListener('click', async () => {
  const res = await new Promise(r => chrome.storage.local.get(['privateBookmarks', 'privateFolders'], r));
  const bms = res.privateBookmarks || [];
  const folders = res.privateFolders || [{ id: '1', name: 'Default' }];
  // build HTML
  let html = '<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>Bookmarks</TITLE>\n<H1>Bookmarks</H1>\n<DL><p>\n';
  folders.forEach(folder => {
    html += `<DT><H3>${folder.name}</H3>\n<DL><p>\n`;
    bms.filter(b => (b.folderId || '1') === folder.id).forEach(b => {
      const added = new Date().toISOString();
      html += `<DT><A HREF="${b.url}">${b.title || b.url}</A>\n`;
    });
    html += '</DL><p>\n';
  });
  html += '</DL><p>\n';
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'private-bookmarks.html'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});

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

// render folders list with rename/delete controls
async function loadFoldersUI() {
  const el = document.getElementById('folders-list');
  if (!el) return;
  const res = await new Promise(r => chrome.storage.local.get(['privateFolders'], r));
  const folders = res.privateFolders || [{ id: '1', name: 'Default' }];
  el.innerHTML = '';
  folders.forEach(f => {
    const row = document.createElement('div');
    row.className = 'folder-row';
    row.innerHTML = `<span class="folder-name">${f.name}</span>
      <button data-id="${f.id}" class="rename-folder">Rename</button>
      <button data-id="${f.id}" class="delete-folder">Delete</button>`;
    el.appendChild(row);
  });
}

// show inline prompt to delete folder: choose delete bookmarks or move them
async function showDeleteFolderPrompt(folderId) {
  const el = document.getElementById('folders-list');
  const res = await new Promise(r => chrome.storage.local.get(['privateFolders', 'privateBookmarks'], r));
  const folders = res.privateFolders || [];
  const bookmarks = res.privateBookmarks || [];
  const folder = folders.find(f => f.id === folderId);
  if (!folder) return alert('Folder not found');
  // build prompt UI
  const promptDiv = document.createElement('div');
  promptDiv.className = 'folder-delete-prompt';
  // other folders for move target
  const otherFolders = folders.filter(f => f.id !== folderId);
  let moveSelectHtml = '<select id="delete-move-target">';
  otherFolders.forEach(f => { moveSelectHtml += `<option value="${f.id}">${f.name}</option>`; });
  moveSelectHtml += '</select>';
  promptDiv.innerHTML = `<div>Delete folder "${folder.name}" — what to do with its bookmarks?</div>
    <label><input type="radio" name="del-action" value="delete" checked> Delete bookmarks</label>
    <label><input type="radio" name="del-action" value="move"> Move bookmarks to: ${otherFolders.length? moveSelectHtml : '<em>(no other folder)</em>'}</label>
    <div><button id="del-confirm">Confirm</button> <button id="del-cancel">Cancel</button></div>`;
  // replace folder row with prompt
  // find the folder row
  const rows = el.querySelectorAll('.folder-row');
  let replaced = false;
  rows.forEach(r => {
    const id = r.querySelector('button')?.getAttribute('data-id');
    if (id === folderId) {
      r.parentNode.replaceChild(promptDiv, r);
      replaced = true;
    }
  });
  if (!replaced) { el.appendChild(promptDiv); }

  document.getElementById('del-cancel').addEventListener('click', () => {
    promptDiv.remove();
    loadFoldersUI();
  });
  document.getElementById('del-confirm').addEventListener('click', async () => {
    const action = promptDiv.querySelector('input[name="del-action"]:checked').value;
    if (action === 'delete') {
      // remove bookmarks in this folder
      const newBms = bookmarks.filter(b => b.folderId !== folderId);
      const newFolders = folders.filter(f => f.id !== folderId);
      await new Promise(r => chrome.storage.local.set({ privateBookmarks: newBms, privateFolders: newFolders }, r));
    } else {
      // move bookmarks to selected target
      const sel = document.getElementById('delete-move-target');
      if (!sel || !sel.value) return alert('No target folder selected');
      const targetId = sel.value;
      const newBms = bookmarks.map(b => b.folderId === folderId ? Object.assign({}, b, { folderId: targetId }) : b);
      const newFolders = folders.filter(f => f.id !== folderId);
      await new Promise(r => chrome.storage.local.set({ privateBookmarks: newBms, privateFolders: newFolders }, r));
    }
    promptDiv.remove();
    loadFoldersUI();
    loadBookmarks();
    loadChromeFoldersIntoSelect();
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

// create folder
document.getElementById('create-folder').addEventListener('click', async () => {
  const name = document.getElementById('new-folder-name').value;
  if (!name) return alert('Folder name required');
  const res = await new Promise(r => chrome.storage.local.get(['privateFolders', 'privateFolderNextId'], r));
  const folders = res.privateFolders || [];
  const nextId = res.privateFolderNextId || (folders.length + 1);
  const id = String(nextId);
  folders.push({ id, name });
  await new Promise(r => chrome.storage.local.set({ privateFolders: folders, privateFolderNextId: nextId + 1 }, r));
  document.getElementById('new-folder-name').value = '';
  loadBookmarks();
  loadFoldersUI();
});

// delegate rename/delete actions for folders
document.getElementById('folders-list').addEventListener('click', (e) => {
  const btn = e.target;
  if (!btn) return;
  if (btn.classList.contains('rename-folder')) {
    const id = btn.getAttribute('data-id');
    (async () => {
      const res = await new Promise(r => chrome.storage.local.get(['privateFolders'], r));
      const folders = res.privateFolders || [];
      const f = folders.find(x => x.id === id);
      if (!f) return alert('Folder not found');
      const newName = prompt('New folder name', f.name);
      if (newName == null) return;
      f.name = newName;
      await new Promise(r => chrome.storage.local.set({ privateFolders: folders }, r));
      loadFoldersUI();
      loadBookmarks();
      loadChromeFoldersIntoSelect();
    })();
  } else if (btn.classList.contains('delete-folder')) {
    const id = btn.getAttribute('data-id');
    showDeleteFolderPrompt(id);
  }
});
