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

async function listBookmarks() {
  const listEl = document.getElementById('bookmarks-list');
  listEl.textContent = 'Loading...';
  const folderId = await getFolderId();
  if (!folderId) {
    listEl.textContent = 'No private folder found.';
    return;
  }
  chrome.bookmarks.getChildren(folderId, (nodes) => {
    listEl.innerHTML = '';
    if (!nodes || nodes.length === 0) {
      listEl.textContent = 'No bookmarks yet.';
      return;
    }
    nodes.forEach(n => {
      const row = document.createElement('div');
      row.className = 'bm-row';
      row.innerHTML = `<a class="bm-link" href="#" data-id="${n.id}">${n.title || n.url}</a>
        <button data-id="${n.id}" class="edit">Edit</button>
        <button data-id="${n.id}" class="del">Delete</button>`;
      listEl.appendChild(row);
    });
  });
}

async function addBookmark(title, url) {
  const folderId = await getFolderId();
  if (!folderId) return alert('Private folder not found.');
  chrome.bookmarks.create({ parentId: folderId, title: title || url, url }, () => listBookmarks());
}

async function addCurrentTab() {
  const tabs = await new Promise(r => chrome.tabs.query({ active: true, currentWindow: true }, r));
  if (!tabs || tabs.length === 0) return;
  const t = tabs[0];
  addBookmark(t.title, t.url);
}

function setPasswordFromInput() {
  const pw = document.getElementById('new-password').value;
  if (!pw) return alert('Enter a password to set.');
  sha256(pw).then(hash => {
    chrome.storage.local.set({ passwordHash: hash }, () => {
      document.getElementById('new-password').value = '';
      alert('Password set.');
    });
  });
}

function wireListHandlers() {
  document.getElementById('bookmarks-list').addEventListener('click', (e) => {
    const id = e.target.getAttribute('data-id');
    if (!id) return;
    if (e.target.classList.contains('del')) {
      if (confirm('Delete bookmark?')) chrome.bookmarks.remove(id, () => listBookmarks());
    } else if (e.target.classList.contains('edit')) {
      const newTitle = prompt('New title');
      const newUrl = prompt('New URL (leave blank to keep)');
      const changes = {};
      if (newTitle != null) changes.title = newTitle;
      if (newUrl) changes.url = newUrl;
      chrome.bookmarks.update(id, changes, () => listBookmarks());
    } else if (e.target.classList.contains('bm-link') || e.target.classList.contains('bm-link')) {
      // noop
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

document.getElementById('set-password').addEventListener('click', setPasswordFromInput);

document.getElementById('open-view').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('view.html') });
});

// delegate clicks for open link
document.getElementById('bookmarks-list').addEventListener('click', (e) => {
  if (e.target && e.target.matches('a.bm-link')) {
    const id = e.target.getAttribute('data-id');
    chrome.bookmarks.get(id, (nodes) => {
      if (nodes && nodes[0] && nodes[0].url) chrome.tabs.create({ url: nodes[0].url });
    });
  }
});

// initial
wireListHandlers();
listBookmarks();
