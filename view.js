async function sha256(text) {
  if (!text) return '';
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// load chrome bookmark folders into select
// ...existing code...

async function loadBookmarks() {
  const listEl = document.getElementById('bookmarks-list');
  listEl.textContent = 'Loading...';
  // pagination params
  const pageSize = (window.__bm_page_size = window.__bm_page_size || 20);
  const pageIndex = (window.__bm_page_index = window.__bm_page_index || 0); // zero-based
  const offset = pageIndex * pageSize;

  // load folders and bookmarks page
  const folders = await window.db.getFolders();
  const nodes = await window.db.getBookmarksPage(pageSize, offset);
  const total = await window.db.countBookmarks();

  listEl.innerHTML = '';
  if (!nodes || nodes.length === 0) {
    listEl.textContent = 'No bookmarks';
    updateBmPageInfo(pageIndex, pageSize, total);
    return;
  }

  // group bookmarks by folderId for display
  const folderMap = {};
  (folders || []).forEach((f) => {
    folderMap[f.id] = f.name;
  });
  // render list (flat) with move/select and controls
  nodes.forEach((n) => {
    const row = document.createElement('div');
    row.className = 'bm-row';
    const folderSelectHtml =
      `<select data-id="${n.id}" class="move-select form-select mb-2">` +
      (folders || [])
        .map((f) => `<option value="${f.id}" ${f.id === (n.folderId || '1') ? 'selected' : ''}>${f.name}</option>`)
        .join('') +
      `</select>`;
    const added = n.added ? new Date(Number(n.added)).toLocaleString() : '';
    const addedHtml = added ? `<span class="bm-added">${added}</span>` : '';
    row.innerHTML = `<a class="bm-link" href="${n.url || '#'}" target="_blank">${n.title || n.url}</a> ${addedHtml}
      ${folderSelectHtml}
      <button data-id="${n.id}" class="edit btn btn-primary me-2">Edit</button>
      <button data-id="${n.id}" class="del btn btn-danger me-2">Delete</button><hr>`;
    listEl.appendChild(row);
  });

  updateBmPageInfo(pageIndex, pageSize, total);
}

function updateBmPageInfo(pageIndex, pageSize, total) {
  const info = document.getElementById('bm-page-info');
  const start = pageIndex * pageSize + 1;
  const end = Math.min(total, (pageIndex + 1) * pageSize);
  if (info) info.textContent = `${start}-${end} of ${total}`;
  // toggle prev/next
  const prev = document.getElementById('bm-prev');
  const next = document.getElementById('bm-next');
  if (prev) prev.disabled = pageIndex <= 0;
  if (next) next.disabled = end >= total;
}

// Refresh button handler - call loadBookmarks when clicked
document.getElementById('refresh-bookmarks')?.addEventListener('click', () => {
  try {
    loadBookmarks();
  } catch (e) {
    console.warn('Refresh bookmarks failed', e);
  }
});

// folder and import/export UI moved to options page

document.getElementById('unlock').addEventListener('click', async () => {
  const pw = document.getElementById('pw').value;
  const stored = await globalThis.db.getPasswordHash();
  if (!stored) {
    // no password set -> allow
    document.getElementById('auth').style.display = 'none';
    document.getElementById('content').style.display = 'block';
    loadBookmarks();
    return;
  }
  const hash = await sha256(pw);
  if (!pw) return showUnlockError('Password required');
  if (hash === stored) {
    document.getElementById('auth').style.display = 'none';
    document.getElementById('content').style.display = 'block';
    loadBookmarks();
  } else alert('Wrong password');
});

// delegate edit/delete
document.getElementById('bookmarks-list').addEventListener('click', (e) => {
  const id = e.target.getAttribute && e.target.getAttribute('data-id');
  if (!id) return;
  if (e.target.classList.contains('del')) {
    // non-blocking confirm
    _modal.showConfirm('Delete bookmark?').then(async (ok) => {
      if (!ok) return;
      await window.db.deleteBookmark(id);
      loadBookmarks();
    });
  } else if (e.target.classList.contains('edit')) {
    (async () => {
      const newTitle = await _modal.showTextPrompt('New title', '');
      if (newTitle === null) return; // cancelled
      const newUrl = await _modal.showTextPrompt('New URL (leave blank to keep)', '');
      // update via SQL
      try {
        const t = (newTitle || '').replace(/'/g, "''");
        const u = (newUrl || '').replace(/'/g, "''");
        let sql = `UPDATE bookmarks SET title='${t}'`;
        if (newUrl) sql += `, url='${u}'`;
        sql += ` WHERE id='${String(id).replace(/'/g, "''")}';`;
        await window.db.run(sql);
      } catch (err) {
        console.warn('Failed to update bookmark', err);
      }
      loadBookmarks();
    })();
  }
});

// handle move-to-folder select changes
document.getElementById('bookmarks-list').addEventListener('change', (e) => {
  if (!e.target || !e.target.classList.contains('move-select')) return;
  const id = e.target.getAttribute && e.target.getAttribute('data-id');
  const newFolderId = e.target.value;
  (async () => {
    try {
      await window.db.run(
        `UPDATE bookmarks SET folderId='${String(newFolderId).replace(/'/g, "''")} ' WHERE id='${String(id).replace(/'/g, "''")}';`
      );
    } catch (err) {
      console.warn('Failed to move bookmark', err);
    }
    loadBookmarks();
  })();
});

// pagination handlers
document.getElementById('bm-prev')?.addEventListener('click', () => {
  window.__bm_page_index = Math.max(
    0,
    (window.__bm_page_index || 0) - 1
  );
  loadBookmarks();
});
document.getElementById('bm-next')?.addEventListener('click', () => {
  window.__bm_page_index = (window.__bm_page_index || 0) + 1;
  loadBookmarks();
});

// initial check
(async function () {
  const stored = await globalThis.db.getPasswordHash();
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
