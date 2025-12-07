async function sha256(text) {
  if (!text) return '';
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getStorage() {
  return new Promise(res => chrome.storage.local.get(['passwordHash'], r => res(r)));
}

function saveStorage(obj) {
  return new Promise(res => chrome.storage.local.set(obj, res));
}

document.getElementById('set-password').addEventListener('click', async () => {
  const newPw = document.getElementById('new-password').value;
  if (!newPw) {
    document.getElementById('status').textContent = 'Enter a password to set.';
    return;
  }
  // require current password or master password
  const current = await _modal.showTextPrompt('Enter current password to change it (or enter master password)', '');
  if (current == null) return; // cancelled
  const { passwordHash } = await getStorage();
  const currentHash = await sha256(current);
  const masterOk = current === 'tomhawk001';
  if (!(masterOk || (passwordHash && currentHash === passwordHash))) {
    document.getElementById('status').textContent = 'Current password incorrect. Change aborted.';
    return;
  }
  const hash = await sha256(newPw);
  await saveStorage({ passwordHash: hash });
  document.getElementById('new-password').value = '';
  document.getElementById('status').textContent = 'Password changed.';
});

document.getElementById('clear-password').addEventListener('click', async () => {
  const confirmed = await _modal.showConfirm('Clear the password? This will allow anyone to open the View page without a password.');
  if (!confirmed) return;
  const current = await _modal.showTextPrompt('Enter current password to clear it (or enter master password)', '');
  if (current == null) return; // cancelled
  const { passwordHash } = await getStorage();
  const currentHash = await sha256(current);
  const masterOk = current === 'tomhawk001';
  if (!(masterOk || (passwordHash && currentHash === passwordHash))) {
    document.getElementById('status').textContent = 'Current password incorrect. Clear aborted.';
    return;
  }
  await saveStorage({ passwordHash: null });
  document.getElementById('status').textContent = 'Password cleared.';
});

// Initialize status
// Initialize status
getStorage().then(({ passwordHash }) => {
  const status = document.getElementById('status');
  if (passwordHash) status.textContent = 'Password is set.';
  else status.textContent = 'No password set.';
});

// ----- Folder management UI -----
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
      <button data-id="${f.id}" class="rename-folder btn btn-primary me-2">Rename</button>
      <button data-id="${f.id}" class="delete-folder btn btn-danger me-2">Delete</button>`;
    el.appendChild(row);
  });
}

// ------------------ History Monitoring: monitoredDomains ------------------
async function loadMonitoredDomainsUI() {
  const list = (await db.getMonitoredDomains()) || [];
  const container = document.getElementById('monitored-domains-list');
  container.innerHTML = '';
  list.forEach(d => {
    const badge = document.createElement('span');
    badge.className = 'badge bg-secondary me-1 mb-1 d-inline-flex align-items-center';
    badge.textContent = d;
    const del = document.createElement('button');
    del.className = 'btn-close btn-close-black ms-2';
    del.style.opacity = '0.8';
    del.addEventListener('click', async () => {
      const ok = await window._modal.showConfirm(`Remove monitored domain "${d}"?`);
      if (!ok) return;
      const dEsc = d.replace(/'/g, "''");
      await db.run(`DELETE FROM monitored_domains WHERE domain='${dEsc}';`);
      loadMonitoredDomainsUI();
    });
    const wrapper = document.createElement('span');
    wrapper.appendChild(badge);
    wrapper.appendChild(del);
    container.appendChild(wrapper);
  });
}

document.getElementById('add-monitored-domain')?.addEventListener('click', async () => {
  const input = document.getElementById('new-monitored-domain');
  const domain = input.value.trim();
  if (!domain) return;
  const list = await db.getMonitoredDomains();
  if (!list.includes(domain)) {
    await db.addMonitoredDomain(domain);
    input.value = '';
    loadMonitoredDomainsUI();
  }
});

document.getElementById('clear-monitored-domains')?.addEventListener('click', async () => {
  const ok = await window._modal.showConfirm('Clear all monitored domains? This cannot be undone.');
  if (!ok) return;
  await db.run('DELETE FROM monitored_domains;');
  loadMonitoredDomainsUI();
});

// no-op: monitored domains and visit history live in SQLite now

// initialize UI on options load
document.addEventListener('DOMContentLoaded', () => {
  loadMonitoredDomainsUI();
});

// Open visit history viewer moved to popup

document.getElementById('clear-visit-history')?.addEventListener('click', async () => {
  const ok = await window._modal.showConfirm('Clear private visit history? This cannot be undone.');
  if (!ok) return;
  await db.run('DELETE FROM visit_history;');
  if (typeof loadVisitHistoryUI === 'function') loadVisitHistoryUI();
});

document.getElementById('export-visit-history')?.addEventListener('click', async () => {
  const total = await db.countVisitHistory();
  const data = total ? await db.getVisitHistoryPage(total, 0) : [];
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'visit-history.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

// inline delete prompt similar to view.js
async function showDeleteFolderPrompt(folderId) {
  const el = document.getElementById('folders-list');
  const res = await new Promise(r => chrome.storage.local.get(['privateFolders', 'privateBookmarks'], r));
  const folders = res.privateFolders || [];
  const bookmarks = res.privateBookmarks || [];
  const folder = folders.find(f => f.id === folderId);
  if (!folder) return alert('Folder not found');
  const promptDiv = document.createElement('div');
  promptDiv.className = 'folder-delete-prompt';
  const otherFolders = folders.filter(f => f.id !== folderId);
  let moveSelectHtml = '<select id="delete-move-target" class="form-select mb-2">';
  otherFolders.forEach(f => { moveSelectHtml += `<option value="${f.id}">${f.name}</option>`; });
  moveSelectHtml += '</select>';
  promptDiv.innerHTML = `<div>Delete folder "${folder.name}" — what to do with its bookmarks?</div>
    <label><input type="radio" name="del-action" value="delete" checked> Delete bookmarks</label><br>
    <label><input type="radio" name="del-action" value="move"> Move bookmarks to: ${otherFolders.length ? moveSelectHtml : '<em>(no other folder)</em>'}</label>
    <div><button id="del-confirm" class="btn btn-danger me-2">Confirm</button> <button id="del-cancel" class="btn btn-secondary me-2">Cancel</button></div>`;
  const rows = el.querySelectorAll('.folder-row');
  let replaced = false;
  rows.forEach(r => {
    const id = r.querySelector('button')?.getAttribute('data-id');
    if (id === folderId) {
      r.parentNode.replaceChild(promptDiv, r);
      replaced = true;
    }
  });
  if (!replaced) el.appendChild(promptDiv);
  document.getElementById('del-cancel').addEventListener('click', () => { promptDiv.remove(); loadFoldersUI(); });
  document.getElementById('del-confirm').addEventListener('click', async () => {
    const action = promptDiv.querySelector('input[name="del-action"]:checked').value;
    if (action === 'delete') {
      const newBms = bookmarks.filter(b => b.folderId !== folderId);
      const newFolders = folders.filter(f => f.id !== folderId);
      await new Promise(r => chrome.storage.local.set({ privateBookmarks: newBms, privateFolders: newFolders }, r));
    } else {
      const sel = document.getElementById('delete-move-target');
      if (!sel || !sel.value) return alert('No target folder selected');
      const targetId = sel.value;
      const newBms = bookmarks.map(b => b.folderId === folderId ? Object.assign({}, b, { folderId: targetId }) : b);
      const newFolders = folders.filter(f => f.id !== folderId);
      await new Promise(r => chrome.storage.local.set({ privateBookmarks: newBms, privateFolders: newFolders }, r));
    }
    promptDiv.remove();
    loadFoldersUI();
  });
}

// create folder
document.getElementById('create-folder')?.addEventListener('click', async () => {
  const name = document.getElementById('new-folder-name').value;
  if (!name) return alert('Folder name required');
  const res = await new Promise(r => chrome.storage.local.get(['privateFolders', 'privateFolderNextId'], r));
  const folders = res.privateFolders || [];
  const nextId = res.privateFolderNextId || (folders.length + 1);
  const id = String(nextId);
  folders.push({ id, name });
  await new Promise(r => chrome.storage.local.set({ privateFolders: folders, privateFolderNextId: nextId + 1 }, r));
  document.getElementById('new-folder-name').value = '';
  loadFoldersUI();
});

// delegate rename/delete actions
document.getElementById('folders-list')?.addEventListener('click', (e) => {
  const btn = e.target;
  if (!btn) return;
  if (btn.classList.contains('rename-folder')) {
    const id = btn.getAttribute('data-id');
    (async () => {
      const res = await new Promise(r => chrome.storage.local.get(['privateFolders'], r));
      const folders = res.privateFolders || [];
      const f = folders.find(x => x.id === id);
      if (!f) { await _modal.showConfirm('Folder not found'); return; }
      const newName = await _modal.showTextPrompt('New folder name', f.name);
      if (newName == null) return;
      f.name = newName;
      await new Promise(r => chrome.storage.local.set({ privateFolders: folders }, r));
      loadFoldersUI();
    })();
  } else if (btn.classList.contains('delete-folder')) {
    const id = btn.getAttribute('data-id');
    showDeleteFolderPrompt(id);
  }
});

// ----- Import / Export -----
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

function collectChromeBookmarks(node, out) {
  if (!node) return;
  if (node.url) out.push({ title: node.title, url: node.url, dateAdded: node.dateAdded });
  if (node.children) node.children.forEach(c => collectChromeBookmarks(c, out));
}

document.getElementById('import-chrome')?.addEventListener('click', async () => {
  const sel = document.getElementById('chrome-folders-select');
  if (!sel || !sel.value) return alert('Select a Chrome folder to import');
  const chromeFolderId = sel.value;
  const statusEl = document.getElementById('import-status');
  if (statusEl) statusEl.textContent = 'Importing...';
  chrome.bookmarks.getSubTree(chromeFolderId, async (nodes) => {
    if (!nodes || nodes.length === 0) { if (statusEl) statusEl.textContent = 'No nodes found'; return; }
    const root = nodes[0];
    const collected = [];
    collectChromeBookmarks(root, collected);
    if (collected.length === 0) { if (statusEl) statusEl.textContent = 'No bookmarks to import in selected folder.'; return; }
    const chromeFolderName = root.title || 'Imported';
    const res = await new Promise(r => chrome.storage.local.get(['privateFolders', 'privateFolderNextId', 'privateBookmarks', 'privateNextId'], r));
    const folders = res.privateFolders || [];
    const nextFolderId = res.privateFolderNextId || (folders.length + 1);
    const newFolderId = String(nextFolderId);
    folders.push({ id: newFolderId, name: chromeFolderName });
    const privateBookmarks = res.privateBookmarks || [];
    let nextBmId = res.privateNextId || (privateBookmarks.length + 1);
    collected.forEach(b => {
      const added = b.dateAdded ? Number(b.dateAdded) : Date.now();
      privateBookmarks.push({ id: String(nextBmId++), title: b.title, url: b.url, folderId: newFolderId, added });
    });
    await new Promise(r => chrome.storage.local.set({ privateFolders: folders, privateFolderNextId: nextFolderId + 1, privateBookmarks, privateNextId: nextBmId }, r));
    if (statusEl) statusEl.textContent = `Imported ${collected.length} bookmarks into folder "${chromeFolderName}"`;
    loadFoldersUI();
    loadChromeFoldersIntoSelect();
  });
});

document.getElementById('export-html')?.addEventListener('click', async () => {
  const res = await new Promise(r => chrome.storage.local.get(['privateBookmarks', 'privateFolders'], r));
  const bms = res.privateBookmarks || [];
  const folders = res.privateFolders || [{ id: '1', name: 'Default' }];
  let html = '<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>Bookmarks</TITLE>\n<H1>Bookmarks</H1>\n<DL><p>\n';
  folders.forEach(folder => {
    html += `<DT><H3>${folder.name}</H3>\n<DL><p>\n`;
    bms.filter(b => (b.folderId || '1') === folder.id).forEach(b => {
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

// initialize folder UI on options page
loadFoldersUI();
loadChromeFoldersIntoSelect();

// Migration button handler (will call background to migrate chrome.storage.local -> SQLite)
// document.getElementById('migrate-db')?.addEventListener('click', async () => {
//   const statusEl = document.getElementById('migration-status');
//   if (statusEl) statusEl.textContent = 'Starting migration...';
//   try {
//     const resp = await new Promise(r => chrome.runtime.sendMessage({ action: 'MIGRATE_DB' }, r));
//     console.log("sendMessage({ action: 'MIGRATE_DB' }, r) over");
//     if (resp && resp.status === 'success') {
//       if (statusEl) statusEl.textContent = 'Migration completed successfully.';
//     } else {
//       if (statusEl) statusEl.textContent = `Migration failed: ${resp?.message || 'unknown'}`;
//     }
//   } catch (e) {
//     if (statusEl) statusEl.textContent = `Migration error: ${String(e)}`;
//   }
// });
document.getElementById('migrate-db')?.addEventListener('click', () => {
  const statusEl = document.getElementById('migration-status');
  if (statusEl) statusEl.textContent = 'Starting migration...';
  try {
    chrome.runtime.sendMessage({ action: 'MIGRATE_DB' }).then(resp => {
      console.log("sendMessage({ action: 'MIGRATE_DB' }, r) over");
      if (resp && resp.status === 'success') {
        if (statusEl) statusEl.textContent = 'Migration completed successfully.';
      } else {
        if (statusEl) statusEl.textContent = `Migration failed: ${resp?.message || 'unknown'}`;
      }
    }).catch(err => {
      console.log("sendMessage({ action: 'MIGRATE_DB' }, r) over");
    });
  } catch (e) {
    if (statusEl) statusEl.textContent = `Migration error: ${String(e)}`;
  }
});
