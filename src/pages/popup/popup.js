const tr = (key, vars) => globalThis.I18n.t(key, vars);

async function isUrlBookmarked(url) {
  if (!url) return false;
  const found = await globalThis.db.findBookmarkByUrl(url);
  return !!found;
}

async function loadFoldersIntoAddCurrentSelect() {
  const sel = document.getElementById('add-current-folder-select');
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

async function updateCurrentTabState() {
  const addCurrentBtn = document.getElementById('add-current');
  const setBadge = (text, color) => {
    try {
      if (color !== undefined) chrome.action.setBadgeBackgroundColor({ color });
      chrome.action.setBadgeText({ text });
    } catch (err) {
      console.warn('Failed to set badge', err);
    }
  };

  const tabs = await new Promise((r) =>
    chrome.tabs.query({ active: true, currentWindow: true }, r)
  );
  if (!tabs || tabs.length === 0) {
    if (addCurrentBtn) addCurrentBtn.disabled = false;
    setBadge('');
    return;
  }
  const t = tabs[0];
  const bookmarked = await isUrlBookmarked(t.url);
  if (bookmarked) {
    if (addCurrentBtn) addCurrentBtn.disabled = true;
    setBadge('★', '#4CAF50');
  } else {
    if (addCurrentBtn) addCurrentBtn.disabled = false;
    setBadge('');
  }
}

async function addCurrentTab() {
  const tabs = await new Promise((r) =>
    chrome.tabs.query({ active: true, currentWindow: true }, r)
  );
  if (!tabs || tabs.length === 0) return;
  const t = tabs[0];
  const addCurrentBtn = document.getElementById('add-current');
  addCurrentBtn.disabled = true;
  try {
    const sel = document.getElementById('add-current-folder-select');
    const folderId = sel ? sel.value : undefined;
    await globalThis.db.addBookmark({
      title: t.title || t.url,
      url: t.url,
      folderId: folderId || '1',
      added: Date.now(),
    });
    showStatus(tr('popup.bookmarkAdded'));
  } catch (err) {
    console.warn('Add current failed', err);
  } finally {
    addCurrentBtn.disabled = false;
    updateCurrentTabState();
  }
}

// bookmark list UI removed from popup; edit/delete handled in view.html

document.getElementById('add-current').addEventListener('click', addCurrentTab);

document.getElementById('add-current-domain')?.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) return showStatus(tr('popup.noActiveTabUrl'));
  const url = new URL(tab.url);
  const domain = url.hostname.replace(/^www\./, '');
  const currentUrl = tab.url;

  // Show modal to add domain with URL pattern
  const pattern = await globalThis._modal.showTextPrompt(
    tr('popup.addDomainWithPattern'),
    currentUrl,
    `${tr('popup.domainLabel')}: ${domain}`
  );

  if (pattern == null) return; // cancelled

  // Check if exact domain+pattern combination already exists
  const exists = await globalThis.db.checkDomainPatternExists(domain, pattern);
  if (exists) {
    showStatus(tr('popup.domainPatternAlreadyMonitored', { domain, pattern }));
    return;
  }

  const result = await globalThis.db.addMonitoredDomain(domain, pattern);
  if (result.duplicate) {
    showStatus(tr('popup.domainPatternAlreadyMonitored', { domain, pattern }));
    return;
  }
  showStatus(tr('popup.domainAddedWithPattern', { domain, pattern }));
});

document.getElementById('open-view').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('view.html') });
});

document.getElementById('open-history-viewer')?.addEventListener('click', async () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
});

// small status helper
function showStatus(msg, timeout = 2500) {
  const el = document.getElementById('status');
  if (!el) return;
  el.textContent = msg;
  setTimeout(() => {
    if (el.textContent === msg) el.textContent = '';
  }, timeout);
}

// initialize current-tab state when popup opens
updateCurrentTabState().catch(() => {
  /* non-fatal */
});
// load folders for add-current folder select
loadFoldersIntoAddCurrentSelect().catch(() => {
  /* non-fatal */
});
