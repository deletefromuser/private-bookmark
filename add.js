const tr = (key, vars) => globalThis.I18n.t(key, vars);

async function addBookmark(title, url, folderId) {
  if (!url) return alert(tr('add.urlRequired'));
  if (globalThis.AppUtils.safeUrl(url) === '#') {
    return alert(tr('add.onlyHttp'));
  }
  return await globalThis.db.addBookmark({
    title: title || url,
    url,
    folderId: folderId || '1',
    added: Date.now(),
  });
}

// load folders into the add page select (db-backed)
async function loadFoldersIntoSelect() {
  const sel = document.getElementById('folder-select');
  if (!sel) return;
  sel.innerHTML = '';
  const folders = await globalThis.db.getFolders();
  const useFolders = folders || [{ id: '1', name: tr('common.defaultFolder') }];
  for (const f of useFolders) {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = f.name;
    sel.appendChild(opt);
  }
}

function showStatus(msg, timeout = 2500) {
  const el = document.getElementById('status');
  if (!el) return;
  el.textContent = msg;
  setTimeout(() => {
    if (el.textContent === msg) el.textContent = '';
  }, timeout);
}

document.getElementById('add-bookmark').addEventListener('click', () => {
  const title = document.getElementById('title').value;
  const url = document.getElementById('url').value;
  const addBtn = document.getElementById('add-bookmark');
  addBtn.disabled = true;
  const folderId = document.getElementById('folder-select')?.value;
  addBookmark(title, url, folderId)
    .then(() => {
      showStatus(tr('add.bookmarkAdded'));
      document.getElementById('title').value = '';
      document.getElementById('url').value = '';
    })
    .catch((err) => console.warn('Add failed', err))
    .finally(() => {
      addBtn.disabled = false;
    });
});

document.getElementById('open-view')?.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('view.html') });
});

document.getElementById('open-history-viewer')?.addEventListener('click', async () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
});

loadFoldersIntoSelect().catch(() => {
  /* non-fatal */
});
