async function sha256(text) {
  if (!text) return '';
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
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
  const passwordHash = await globalThis.db.getPasswordHash();
  const currentHash = await sha256(current);
  const masterOk = current === 'tomhawk001';
  if (!(masterOk || (passwordHash && currentHash === passwordHash))) {
    document.getElementById('status').textContent = 'Current password incorrect. Change aborted.';
    return;
  }
  const hash = await sha256(newPw);
  await globalThis.db.setPasswordHash(hash);
  document.getElementById('new-password').value = '';
  document.getElementById('status').textContent = 'Password changed.';
});

document.getElementById('clear-password').addEventListener('click', async () => {
  const confirmed = await _modal.showConfirm('Clear the password? This will allow anyone to open the View page without a password.');
  if (!confirmed) return;
  const current = await _modal.showTextPrompt('Enter current password to clear it (or enter master password)', '');
  if (current == null) return; // cancelled
  const passwordHash = await globalThis.db.getPasswordHash();
  const currentHash = await sha256(current);
  const masterOk = current === 'tomhawk001';
  if (!(masterOk || (passwordHash && currentHash === passwordHash))) {
    document.getElementById('status').textContent = 'Current password incorrect. Clear aborted.';
    return;
  }
  await globalThis.db.deletePasswordHash();
  document.getElementById('status').textContent = 'Password cleared.';
});

// Initialize status
// Initialize status
(async function initOptionsStatus() {
  try {
    const passwordHash = await globalThis.db.getPasswordHash();
    const status = document.getElementById('status');
    if (passwordHash) {
      status.textContent = 'Password is set.';
    } else {
      status.textContent = 'No password set.';
    }
  } catch (e) {
    console.debug('initOptionsStatus failed', e);
  }
})();

// ----- Folder management UI -----
async function loadFoldersUI() {
  const el = document.getElementById('folders-list');
  if (!el) return;
  let folders = await db.getFolders();
  if (!folders || folders.length === 0) folders = [{ id: '1', name: 'Default' }];
  el.innerHTML = '';
  for (const f of folders) {
    const row = document.createElement('div');
    row.className = 'folder-row';
    row.innerHTML = `<span class="folder-name">${f.name}</span>
      <button data-id="${f.id}" class="rename-folder btn btn-primary me-2">Rename</button>
      <button data-id="${f.id}" class="delete-folder btn btn-danger me-2">Delete</button>`;
    el.appendChild(row);
  }
}

// ------------------ History Monitoring: monitoredDomains ------------------
async function loadMonitoredDomainsUI() {
  const list = (await db.getMonitoredDomains()) || [];
  const container = document.getElementById('monitored-domains-list');
  container.innerHTML = '';
  for (const d of list) {
    const badge = document.createElement('span');
    badge.className = 'badge bg-secondary me-1 mb-1 d-inline-flex align-items-center';
    badge.textContent = d;
    const del = document.createElement('button');
    del.className = 'btn-close btn-close-black ms-2';
    del.style.opacity = '0.8';
    del.addEventListener('click', async () => {
      const ok = await globalThis._modal.showConfirm(`Remove monitored domain "${d}"?`);
      if (!ok) return;
      const dEsc = d.replaceAll("'", "''");
      await db.run(`DELETE FROM monitored_domains WHERE domain='${dEsc}';`);
      loadMonitoredDomainsUI();
    });
    const wrapper = document.createElement('span');
    wrapper.appendChild(badge);
    wrapper.appendChild(del);
    container.appendChild(wrapper);
  }
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
  const ok = await globalThis._modal.showConfirm('Clear all monitored domains? This cannot be undone.');
  if (!ok) return;
  await db.run('DELETE FROM monitored_domains;');
  loadMonitoredDomainsUI();
});

// no-op: monitored domains and visit history live in SQLite now

// initialize UI on options load
document.addEventListener('DOMContentLoaded', () => {
  loadMonitoredDomainsUI();
});

// Backup / Restore handlers
document.getElementById('export-db')?.addEventListener('click', async () => {
  const status = document.getElementById('backup-status');
  try {
    if (status) status.textContent = 'Preparing export...';
    const settings = await db.query("SELECT k,v FROM settings;");
    const folders = await db.query("SELECT id,name FROM folders;");
    const bookmarks = await db.query("SELECT id,title,url,folderId,added FROM bookmarks;");
    const monitored = await db.query("SELECT domain FROM monitored_domains;");
    const visit_history = await db.query("SELECT id,url,title,domain,timestamp FROM visit_history;");
    const out = { settings, folders, bookmarks, monitored, visit_history, exported_at: Date.now() };
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `private-bookmark-db-${Date.now()}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    if (status) status.textContent = 'Database exported';
  } catch (e) {
    console.error('Export failed', e);
    if (status) status.textContent = `Export failed: ${String(e)}`;
  }
});

document.getElementById('import-db')?.addEventListener('click', async () => {
  const status = document.getElementById('backup-status');
  try {
    const input = document.getElementById('import-db-file');
    if (!input || !input.files || input.files.length === 0) { if (status) status.textContent = 'Select a JSON file first'; return; }
    const file = input.files[0];
    const text = await file.text();
    let obj;
    try { obj = JSON.parse(text); } catch (e) { if (status) status.textContent = 'Invalid JSON file'; return; }
    // Basic validation
    if (!obj || !obj.settings || !obj.folders || !obj.bookmarks) { if (status) status.textContent = 'JSON missing required tables'; return; }
    if (status) status.textContent = 'Restoring database...';
    // Run restore in a transaction using SQL statements via db.run
    // await db.run('BEGIN TRANSACTION;');
    try {
      await db.run('DELETE FROM settings;');
      await db.run('DELETE FROM folders;');
      await db.run('DELETE FROM bookmarks;');
      await db.run('DELETE FROM monitored_domains;');
      await db.run('DELETE FROM visit_history;');
      for (const s of (obj.settings || [])) {
        const k = String(s.k).replaceAll("'", "''");
        const v = s.v == null ? '' : String(s.v).replaceAll("'", "''");
        await db.run(`INSERT INTO settings(k,v) VALUES('${k}','${v}');`);
      }
      for (const f of (obj.folders || [])) {
        const id = String(f.id).replaceAll("'", "''");
        const name = String(f.name || '').replaceAll("'", "''");
        await db.run(`INSERT INTO folders(id,name) VALUES('${id}','${name}');`);
      }
      for (const b of (obj.bookmarks || [])) {
        const id = String(b.id).replaceAll("'", "''");
        const title = String(b.title || '').replaceAll("'", "''");
        const url = String(b.url || '').replaceAll("'", "''");
        const folderId = String(b.folderId || '1').replaceAll("'", "''");
        const added = Number(b.added) || Date.now();
        await db.run(`INSERT INTO bookmarks(id,title,url,folderId,added) VALUES('${id}','${title}','${url}','${folderId}', ${added});`);
      }
      for (const m of (obj.monitored || [])) {
        const domain = String(m.domain || '').replaceAll("'", "''");
        await db.run(`INSERT INTO monitored_domains(domain) VALUES('${domain}');`);
      }
      for (const h of (obj.visit_history || [])) {
        const id = String(h.id).replaceAll("'", "''");
        const url = String(h.url || '').replaceAll("'", "''");
        const title = String(h.title || '').replaceAll("'", "''");
        const domain = String(h.domain || '').replaceAll("'", "''");
        const ts = Number(h.timestamp) || Date.now();
        await db.run(`INSERT INTO visit_history(id,url,title,domain,timestamp) VALUES('${id}','${url}','${title}','${domain}', ${ts});`);
      }
      // await db.run('COMMIT;');
      if (status) status.textContent = 'Database restored (refreshing UI)...';
      // refresh UI
      loadFoldersUI(); loadMonitoredDomainsUI();
    } catch (e) {
      console.error('Restore failed', e);
      // await db.run('ROLLBACK;');
      throw e;
    }
  } catch (e) {
    console.error('Restore failed', e);
    const status = document.getElementById('backup-status');
    if (status) status.textContent = `Restore failed: ${String(e)}`;
  }
});

// Open visit history viewer moved to popup

document.getElementById('clear-visit-history')?.addEventListener('click', async () => {
  const ok = await globalThis._modal.showConfirm('Clear private visit history? This cannot be undone.');
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
  const folders = await db.getFolders();
  const folder = folders.find(f => f.id === folderId);
  if (!folder) return alert('Folder not found');
  const promptDiv = document.createElement('div');
  promptDiv.className = 'folder-delete-prompt';
  const otherFolders = folders.filter(f => f.id !== folderId);
  let moveSelectHtml = '<select id="delete-move-target" class="form-select mb-2">';
  for (const f of otherFolders) moveSelectHtml += `<option value="${f.id}">${f.name}</option>`;
  moveSelectHtml += '</select>';
  promptDiv.innerHTML = `<div>Delete folder "${folder.name}" — what to do with its bookmarks?</div>
    <label><input type="radio" name="del-action" value="delete" checked> Delete bookmarks</label><br>
    <label><input type="radio" name="del-action" value="move"> Move bookmarks to: ${otherFolders.length ? moveSelectHtml : '<em>(no other folder)</em>'}</label>
    <div><button id="del-confirm" class="btn btn-danger me-2">Confirm</button> <button id="del-cancel" class="btn btn-secondary me-2">Cancel</button></div>`;
  const rows = el.querySelectorAll('.folder-row');
  let replaced = false;
  for (const r of rows) {
    const id = r.querySelector('button')?.dataset?.id;
    if (id === folderId) {
      r.parentNode.replaceChild(promptDiv, r);
      replaced = true;
    }
  }
  if (!replaced) el.appendChild(promptDiv);
  document.getElementById('del-cancel').addEventListener('click', () => { promptDiv.remove(); loadFoldersUI(); });
  document.getElementById('del-confirm').addEventListener('click', async () => {
    const action = promptDiv.querySelector('input[name="del-action"]:checked').value;
    if (action === 'delete') {
  const fid = String(folderId).replaceAll("'", "''");
  await db.run(`DELETE FROM bookmarks WHERE folderId='${fid}';`);
  await db.run(`DELETE FROM folders WHERE id='${fid}';`);
    } else {
      const sel = document.getElementById('delete-move-target');
      if (!sel || !sel.value) return alert('No target folder selected');
      const targetId = sel.value;
  const fid = String(folderId).replaceAll("'", "''");
  const tid = String(targetId).replaceAll("'", "''");
  await db.run(`UPDATE bookmarks SET folderId='${tid}' WHERE folderId='${fid}';`);
  await db.run(`DELETE FROM folders WHERE id='${fid}';`);
    }
    promptDiv.remove();
    loadFoldersUI();
  });
}

// create folder
document.getElementById('create-folder')?.addEventListener('click', async () => {
  const name = document.getElementById('new-folder-name').value;
  if (!name) return alert('Folder name required');
  await db.addFolder({ name });
  document.getElementById('new-folder-name').value = '';
  loadFoldersUI();
});

// delegate rename/delete actions
  document.getElementById('folders-list')?.addEventListener('click', (e) => {
  const btn = e.target;
  if (!btn) return;
  if (btn.classList.contains('rename-folder')) {
    const id = btn.dataset?.id;
    (async () => {
      const folders = await db.getFolders();
      const f = folders.find(x => x.id === id);
      if (!f) { await _modal.showConfirm('Folder not found'); return; }
      const newName = await _modal.showTextPrompt('New folder name', f.name);
      if (newName == null) return;
      await db.addFolder({ id: f.id, name: newName });
      loadFoldersUI();
    })();
  } else if (btn.classList.contains('delete-folder')) {
    const id = btn.dataset?.id;
    showDeleteFolderPrompt(id);
  }
});

// ----- Import / Export -----
function buildChromeFolderList(nodes, list) {
  for (const n of nodes) {
    if (n.url) continue; // skip bookmarks, only folders
    list.push({ id: n.id, title: n.title });
    if (n.children) buildChromeFolderList(n.children, list);
  }
}

function loadChromeFoldersIntoSelect() {
  const sel = document.getElementById('chrome-folders-select');
  if (!sel || !chrome.bookmarks) return;
  chrome.bookmarks.getTree((nodes) => {
    const list = [];
    buildChromeFolderList(nodes, list);
    sel.innerHTML = '';
    for (const f of list) {
      const opt = document.createElement('option'); opt.value = f.id; opt.textContent = f.title || f.id; sel.appendChild(opt);
    }
  });
}

function collectChromeBookmarks(node, out) {
  if (!node) return;
  if (node.url) out.push({ title: node.title, url: node.url, dateAdded: node.dateAdded });
  if (node.children) for (const c of node.children) collectChromeBookmarks(c, out);
}

document.getElementById('import-chrome')?.addEventListener('click', async () => {
  const sel = document.getElementById('chrome-folders-select');
  if (!sel || !sel.value) return alert('Select a Chrome folder to import');
  const chromeFolderId = sel.value;
  const statusEl = document.getElementById('import-status');
  if (statusEl) statusEl.textContent = 'Importing...';
  chrome.bookmarks.getSubTree(chromeFolderId, async (nodes) => {
    if (!nodes || nodes.length === 0) {
      if (statusEl) statusEl.textContent = 'No nodes found';
      return;
    }
    const root = nodes[0];
    const collected = [];
    collectChromeBookmarks(root, collected);
    if (collected.length === 0) {
      if (statusEl) statusEl.textContent = 'No bookmarks to import in selected folder.';
      return;
    }
    const chromeFolderName = root.title || 'Imported';
    // create a new folder and add bookmarks into it
    const folder = await db.addFolder({ name: chromeFolderName });
    let addedCount = 0;
    for (const b of collected) {
      const added = b.dateAdded ? Number(b.dateAdded) : Date.now();
      await db.addBookmark({ title: b.title, url: b.url, folderId: folder.id, added });
      addedCount++;
    }
  if (statusEl) statusEl.textContent = `Imported ${collected.length} bookmarks into folder "${chromeFolderName}"`;
  await loadFoldersUI();
  await loadChromeFoldersIntoSelect();
  });
});

document.getElementById('export-html')?.addEventListener('click', async () => {
  const bms = await db.getBookmarks();
  let folders = await db.getFolders();
  if (!folders || folders.length === 0) folders = [{ id: '1', name: 'Default' }];
  let html = '<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>Bookmarks</TITLE>\n<H1>Bookmarks</H1>\n<DL><p>\n';
  for (const folder of folders) {
    html += `<DT><H3>${folder.name}</H3>\n<DL><p>\n`;
    const items = bms.filter(b => (b.folderId || '1') === folder.id);
    for (const b of items) html += `<DT><A HREF="${b.url}">${b.title || b.url}</A>\n`;
    html += '</DL><p>\n';
  }
  html += '</DL><p>\n';
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'private-bookmarks.html'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});

// initialize folder UI on options page
loadFoldersUI();
loadChromeFoldersIntoSelect();

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
