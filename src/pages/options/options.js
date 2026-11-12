const tr = (key, vars) => globalThis.I18n.t(key, vars);

const languageSelect = document.getElementById('ui-language');
if (languageSelect) {
  languageSelect.value = globalThis.I18n.getPreference();
  languageSelect.addEventListener('change', () => {
    globalThis.I18n.setLanguage(languageSelect.value);
    window.location.reload();
  });
}

document.getElementById('set-password').addEventListener('click', async () => {
  const newPw = document.getElementById('new-password').value;
  if (!newPw) {
    document.getElementById('status').textContent = tr('options.enterPasswordToSet');
    return;
  }
  const passwordHash = await globalThis.db.getPasswordHash();
  if (passwordHash) {
    const current = await _modal.showTextPrompt(
      tr('options.currentPasswordChangePrompt'),
      ''
    );
    if (current == null) return; // cancelled
    const verification = await globalThis.AppUtils.verifyPassword(current, passwordHash);
    if (!verification.ok) {
      document.getElementById('status').textContent = tr(
        'options.currentIncorrectChange'
      );
      return;
    }
  }
  const hash = await globalThis.AppUtils.hashPassword(newPw);
  await globalThis.db.setPasswordHash(hash);
  document.getElementById('new-password').value = '';
  document.getElementById('status').textContent = tr('options.passwordChanged');
});

document.getElementById('clear-password').addEventListener('click', async () => {
  const confirmed = await _modal.showConfirm(tr('options.confirmClearPassword'));
  if (!confirmed) return;
  const passwordHash = await globalThis.db.getPasswordHash();
  if (passwordHash) {
    const current = await _modal.showTextPrompt(
      tr('options.currentPasswordClearPrompt'),
      ''
    );
    if (current == null) return; // cancelled
    const verification = await globalThis.AppUtils.verifyPassword(current, passwordHash);
    if (!verification.ok) {
      document.getElementById('status').textContent = tr('options.currentIncorrectClear');
      return;
    }
  }
  await globalThis.db.deletePasswordHash();
  document.getElementById('status').textContent = tr('options.passwordCleared');
});

// Initialize status
// Initialize status
(async function initOptionsStatus() {
  try {
    const passwordHash = await globalThis.db.getPasswordHash();
    const status = document.getElementById('status');
    if (passwordHash) {
      status.textContent = tr('options.passwordIsSet');
    } else {
      status.textContent = tr('options.noPasswordSet');
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
  if (!folders || folders.length === 0) {
    folders = [{ id: '1', name: tr('common.defaultFolder') }];
  }
  const { escapeHtml } = globalThis.AppUtils;
  el.innerHTML = '';
  for (const f of folders) {
    const row = document.createElement('div');
    row.className = 'folder-row';
    row.innerHTML = `<span class="folder-name">${escapeHtml(f.name)}</span>
      <button data-id="${escapeHtml(f.id)}" class="rename-folder btn btn-primary me-2">${tr('options.renameFolder')}</button>
      <button data-id="${escapeHtml(f.id)}" class="delete-folder btn btn-danger me-2">${tr('options.deleteFolder')}</button>`;
    el.appendChild(row);
  }
}

// ------------------ History Monitoring: monitoredDomains ------------------
async function loadMonitoredDomainsUI() {
  const domainsWithPatterns = (await db.getMonitoredDomainsWithPatterns()) || [];
  const container = document.getElementById('monitored-domains-list');
  container.innerHTML = '';
  for (const entry of domainsWithPatterns) {
    const id = entry.id;
    const domain = entry.domain;
    const pattern = entry.urlPattern || '';

    const badge = document.createElement('span');
    badge.className = 'badge bg-secondary me-1 mb-1 d-inline-flex align-items-center';
    badge.textContent = pattern ? `${domain} (${pattern})` : domain;
    if (pattern) {
      badge.title = `URL Pattern: ${pattern}`;
    }

    const edit = document.createElement('button');
    edit.className = 'btn btn-sm btn-outline-primary me-1';
    edit.innerHTML = '<i class="bi bi-pencil"></i>';
    edit.title = 'Edit URL pattern';
    edit.addEventListener('click', async () => {
      const newPattern = await globalThis._modal.showTextPrompt(
        tr('options.editDomainPatternPrompt', { domain }),
        pattern || ''
      );
      if (newPattern == null) return; // cancelled
      await db.updateMonitoredDomain(id, newPattern);
      loadMonitoredDomainsUI();
    });

    const del = document.createElement('button');
    del.className = 'btn-close btn-close-black ms-2';
    del.style.opacity = '0.8';
    del.title = 'Remove domain';
    del.addEventListener('click', async () => {
      const ok = await globalThis._modal.showConfirm(
        tr('options.removeDomainConfirm', { domain })
      );
      if (!ok) return;
      await db.deleteMonitoredDomain(id);
      loadMonitoredDomainsUI();
    });

    const wrapper = document.createElement('span');
    wrapper.appendChild(badge);
    wrapper.appendChild(edit);
    wrapper.appendChild(del);
    container.appendChild(wrapper);
  }
}

document.getElementById('add-monitored-domain')?.addEventListener('click', async () => {
  const input = document.getElementById('new-monitored-domain');
  const domain = input.value.trim();
  if (!domain) return;

  // Show modal to add/edit domain with URL pattern
  const pattern = await globalThis._modal.showTextPrompt(
    tr('options.addDomainPatternPrompt'),
    '', // default empty pattern
    `${tr('options.domainLabel')}: ${domain}`
  );

  if (pattern == null) return; // cancelled

  // Check if exact domain+pattern combination already exists
  const exists = await db.checkDomainPatternExists(domain, pattern);
  if (exists) {
    document.getElementById('status').textContent = tr(
      'popup.domainPatternAlreadyMonitored',
      { domain, pattern }
    );
    return;
  }

  const result = await db.addMonitoredDomain(domain, pattern);
  if (result.duplicate) {
    document.getElementById('status').textContent = tr(
      'popup.domainPatternAlreadyMonitored',
      { domain, pattern }
    );
    return;
  }
  input.value = '';
  loadMonitoredDomainsUI();
});

document
  .getElementById('clear-monitored-domains')
  ?.addEventListener('click', async () => {
    const ok = await globalThis._modal.showConfirm(tr('options.clearDomainsConfirm'));
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
    if (status) status.textContent = tr('options.exportPreparing');
    const settings = await db.query('SELECT k,v FROM settings;');
    const folders = await db.query('SELECT id,name FROM folders;');
    const bookmarks = await db.query(
      'SELECT id,title,url,folderId,added FROM bookmarks;'
    );
    const monitored = await db.query(
      'SELECT domain, url_pattern FROM monitored_domains;'
    );
    const visit_history = await db.query(
      'SELECT id,url,title,domain,timestamp FROM visit_history;'
    );
    const out = {
      settings,
      folders,
      bookmarks,
      monitored,
      visit_history,
      exported_at: Date.now(),
    };
    const blob = new Blob([JSON.stringify(out, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `private-bookmark-db-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    if (status) status.textContent = tr('options.exported');
  } catch (e) {
    console.error('Export failed', e);
    if (status) status.textContent = tr('options.exportFailed', { error: String(e) });
  }
});

document.getElementById('import-db')?.addEventListener('click', async () => {
  const status = document.getElementById('backup-status');
  try {
    const input = document.getElementById('import-db-file');
    if (!input || !input.files || input.files.length === 0) {
      if (status) status.textContent = tr('options.selectJsonFirst');
      return;
    }
    const file = input.files[0];
    const text = await file.text();
    let obj;
    try {
      obj = JSON.parse(text);
    } catch (e) {
      if (status) status.textContent = tr('options.invalidJson');
      return;
    }
    const isObject = (value) =>
      typeof value === 'object' && value !== null && !Array.isArray(value);
    if (
      !isObject(obj) ||
      !Array.isArray(obj.settings) ||
      !Array.isArray(obj.folders) ||
      !Array.isArray(obj.bookmarks)
    ) {
      if (status) status.textContent = tr('options.missingTables');
      return;
    }
    const monitored = Array.isArray(obj.monitored) ? obj.monitored : [];
    const visitHistory = Array.isArray(obj.visit_history) ? obj.visit_history : [];
    const allRows = [
      ...obj.settings,
      ...obj.folders,
      ...obj.bookmarks,
      ...monitored,
      ...visitHistory,
    ];
    if (allRows.some((row) => !isObject(row))) {
      if (status) status.textContent = tr('options.invalidRows');
      return;
    }
    const confirmed = await globalThis._modal.showConfirm(tr('options.restoreConfirm'));
    if (!confirmed) return;
    if (status) status.textContent = tr('options.restoring');
    const esc = (value) => String(value ?? '').replaceAll("'", "''");
    const statements = [
      'BEGIN;',
      'DELETE FROM settings;',
      'DELETE FROM folders;',
      'DELETE FROM bookmarks;',
      'DELETE FROM monitored_domains;',
      'DELETE FROM visit_history;',
    ];
    try {
      for (const s of obj.settings) {
        statements.push(`INSERT INTO settings(k,v) VALUES('${esc(s.k)}','${esc(s.v)}');`);
      }
      for (const f of obj.folders) {
        statements.push(
          `INSERT INTO folders(id,name) VALUES('${esc(f.id)}','${esc(f.name)}');`
        );
      }
      for (const b of obj.bookmarks) {
        const added = Number(b.added) || Date.now();
        statements.push(
          `INSERT INTO bookmarks(id,title,url,folderId,added) VALUES('${esc(b.id)}','${esc(b.title)}','${esc(b.url)}','${esc(b.folderId || '1')}', ${added});`
        );
      }
      for (const m of monitored) {
        const urlPattern = m.url_pattern || '';
        statements.push(
          `INSERT INTO monitored_domains(domain, url_pattern) VALUES('${esc(m.domain)}', '${esc(urlPattern)}');`
        );
      }
      for (const h of visitHistory) {
        const ts = Number(h.timestamp) || Date.now();
        statements.push(
          `INSERT INTO visit_history(id,url,title,domain,timestamp) VALUES('${esc(h.id)}','${esc(h.url)}','${esc(h.title)}','${esc(h.domain)}', ${ts});`
        );
      }
      statements.push('COMMIT;');
      await db.runBatch(statements);
      if (status) status.textContent = tr('options.restored');
      loadFoldersUI();
      loadMonitoredDomainsUI();
    } catch (e) {
      try {
        await db.run('ROLLBACK;');
      } catch (rollbackError) {
        console.warn('Restore rollback failed', rollbackError);
      }
      throw e;
    }
  } catch (e) {
    console.error('Restore failed', e);
    const status = document.getElementById('backup-status');
    if (status) status.textContent = tr('options.restoreFailed', { error: String(e) });
  }
});

// Open SQL console in a new tab
document.getElementById('open-sql-console')?.addEventListener('click', () => {
  try {
    window.open(chrome.runtime.getURL('pages/sql/sql.html'), '_blank');
  } catch (e) {
    console.warn('Open SQL console failed', e);
  }
});

// Open Add Bookmark page in a new tab
document.getElementById('open-add-page')?.addEventListener('click', () => {
  try {
    window.open(chrome.runtime.getURL('pages/add/add.html'), '_blank');
  } catch (e) {
    console.warn('Open add page failed', e);
  }
});

// Open visit history viewer moved to popup

document.getElementById('clear-visit-history')?.addEventListener('click', async () => {
  const ok = await globalThis._modal.showConfirm(tr('options.clearHistoryConfirm'));
  if (!ok) return;
  await db.run('DELETE FROM visit_history;');
});

document.getElementById('export-visit-history')?.addEventListener('click', async () => {
  const total = await db.countVisitHistory();
  const data = total ? await db.getVisitHistoryPage(total, 0) : [];
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
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
  const folder = folders.find((f) => f.id === folderId);
  if (!folder) return alert(tr('options.folderNotFound'));
  const { escapeHtml } = globalThis.AppUtils;
  const promptDiv = document.createElement('div');
  promptDiv.className = 'folder-delete-prompt';
  const otherFolders = folders.filter((f) => f.id !== folderId);
  let moveSelectHtml = '<select id="delete-move-target" class="form-select mb-2">';
  for (const f of otherFolders) {
    moveSelectHtml += `<option value="${escapeHtml(f.id)}">${escapeHtml(f.name)}</option>`;
  }
  moveSelectHtml += '</select>';
  promptDiv.innerHTML = `<div>${tr('options.deleteFolderPrompt', { folder: escapeHtml(folder.name) })}</div>
    <label><input type="radio" name="del-action" value="delete" checked> ${tr('options.deleteBookmarksOption')}</label><br>
    <label><input type="radio" name="del-action" value="move"> ${tr('options.moveBookmarksOption')} ${otherFolders.length ? moveSelectHtml : `<em>${tr('options.noOtherFolder')}</em>`}</label>
    <div><button id="del-confirm" class="btn btn-danger me-2">${tr('options.confirm')}</button> <button id="del-cancel" class="btn btn-secondary me-2">${tr('common.cancel')}</button></div>`;
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
  document.getElementById('del-cancel').addEventListener('click', () => {
    promptDiv.remove();
    loadFoldersUI();
  });
  document.getElementById('del-confirm').addEventListener('click', async () => {
    const action = promptDiv.querySelector('input[name="del-action"]:checked').value;
    if (action === 'delete') {
      const fid = String(folderId).replaceAll("'", "''");
      await db.run(`DELETE FROM bookmarks WHERE folderId='${fid}';`);
      await db.run(`DELETE FROM folders WHERE id='${fid}';`);
    } else {
      const sel = document.getElementById('delete-move-target');
      if (!sel || !sel.value) return alert(tr('options.noTargetFolder'));
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
  if (!name) return alert(tr('options.folderNameRequired'));
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
      const f = folders.find((x) => x.id === id);
      if (!f) {
        await _modal.showConfirm(tr('options.folderNotFound'));
        return;
      }
      const newName = await _modal.showTextPrompt(
        tr('options.newFolderNamePrompt'),
        f.name
      );
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
      const opt = document.createElement('option');
      opt.value = f.id;
      opt.textContent = f.title || f.id;
      sel.appendChild(opt);
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
  if (!sel || !sel.value) return alert(tr('options.importSelectFolder'));
  const chromeFolderId = sel.value;
  const statusEl = document.getElementById('import-status');
  if (statusEl) statusEl.textContent = tr('options.importing');
  chrome.bookmarks.getSubTree(chromeFolderId, async (nodes) => {
    if (!nodes || nodes.length === 0) {
      if (statusEl) statusEl.textContent = tr('options.noNodes');
      return;
    }
    const root = nodes[0];
    const collected = [];
    collectChromeBookmarks(root, collected);
    if (collected.length === 0) {
      if (statusEl) statusEl.textContent = tr('options.noBookmarksToImport');
      return;
    }
    const chromeFolderName = root.title || tr('options.importedFolderName');
    // create a new folder and add bookmarks into it
    const folder = await db.addFolder({ name: chromeFolderName });
    await db.addBookmarks(
      collected.map((b) => ({
        title: b.title,
        url: b.url,
        folderId: folder.id,
        added: b.dateAdded ? Number(b.dateAdded) : Date.now(),
      }))
    );
    if (statusEl)
      statusEl.textContent = tr('options.importedCount', {
        count: collected.length,
        folder: chromeFolderName,
      });
    await loadFoldersUI();
    await loadChromeFoldersIntoSelect();
  });
});

document.getElementById('export-html')?.addEventListener('click', async () => {
  const bms = await db.getBookmarks();
  let folders = await db.getFolders();
  if (!folders || folders.length === 0) {
    folders = [{ id: '1', name: tr('common.defaultFolder') }];
  }
  const { escapeHtml } = globalThis.AppUtils;
  let html =
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>Bookmarks</TITLE>\n<H1>Bookmarks</H1>\n<DL><p>\n';
  for (const folder of folders) {
    html += `<DT><H3>${escapeHtml(folder.name)}</H3>\n<DL><p>\n`;
    const items = bms.filter((b) => (b.folderId || '1') === folder.id);
    for (const b of items) {
      const title = b.title || b.url;
      html += `<DT><A HREF="${escapeHtml(b.url)}">${escapeHtml(title)}</A>\n`;
    }
    html += '</DL><p>\n';
  }
  html += '</DL><p>\n';
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'private-bookmarks.html';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

// initialize folder UI on options page
loadFoldersUI();
loadChromeFoldersIntoSelect();
