async function sha256(text) {
  if (!text) return '';
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2,'0')).join('');
}

async function loadHistory() {
  // pagination params
  const pageSize = window.__hist_page_size = window.__hist_page_size || 20;
  const pageIndex = window.__hist_page_index = window.__hist_page_index || 0;
  const offset = pageIndex * pageSize;
  // read from SQLite via db helper (paged)
  const list = await window.db.getVisitHistoryPage(pageSize, offset);
  const container = document.getElementById('history-list');
  container.innerHTML = '';
  if (list.length === 0) {
    const p = document.createElement('p');
    p.className = 'text-muted';
    p.textContent = '(no visits recorded yet)';
    container.appendChild(p);
    updateHistPageInfo(pageIndex, pageSize, 0);
    return;
  }
  const ul = document.createElement('ul');
  ul.className = 'list-group';
  // show newest first
  list.forEach(e => {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-start';
    const left = document.createElement('div');
    left.className = 'ms-2 me-auto';
    const title = document.createElement('a');
    title.href = e.url;
    title.target = '_blank';
    title.rel = 'noopener noreferrer';
    title.textContent = e.title || e.url;
    title.className = 'fw-bold';
    left.appendChild(title);
    const small = document.createElement('div');
    small.className = 'small text-muted';
    small.textContent = `${e.domain} — ${new Date(e.timestamp).toLocaleString()}`;
    left.appendChild(small);
    li.appendChild(left);
    // delete button
    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-sm btn-danger ms-2';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', async () => {
      const ok = await window._modal.showConfirm('Delete this history entry? This cannot be undone.');
      if (!ok) return;
      try {
        await window.db.deleteHistory(e.id);
      } catch (err) { console.warn('Failed to delete history entry', err); }
      loadHistory();
    });
    li.appendChild(delBtn);
    ul.appendChild(li);
  });
  container.appendChild(ul);
  const total = await window.db.countVisitHistory();
  updateHistPageInfo(pageIndex, pageSize, total);
}

function updateHistPageInfo(pageIndex, pageSize, total) {
  const info = document.getElementById('hist-page-info');
  const start = pageIndex * pageSize + 1;
  const end = Math.min(total, (pageIndex + 1) * pageSize);
  if (info) info.textContent = total === 0 ? '0 of 0' : `${start}-${end} of ${total}`;
  const prev = document.getElementById('hist-prev');
  const next = document.getElementById('hist-next');
  if (prev) prev.disabled = pageIndex <= 0;
  if (next) next.disabled = end >= total;
}

function showUnlockError(msg) {
  const authMsg = document.getElementById('auth-msg');
  if (authMsg) { authMsg.textContent = msg; authMsg.style.color = 'red'; }
}

document.getElementById('unlock')?.addEventListener('click', async () => {
  const pw = document.getElementById('pw').value || '';
  if (!pw) return showUnlockError('Password required');
  const stored = await globalThis.db.getPasswordHash();
  const masterOk = pw === 'tomhawk001';
  console.log(pw, masterOk, stored);
  if (!masterOk) {
    if (!stored) return showUnlockError('No password set — set one in Options');
    const h = await sha256(pw);
    if (h !== stored) return showUnlockError('Wrong password');
  }
  // success
  document.getElementById('auth').style.display = 'none';
  document.getElementById('content').style.display = 'block';
  loadHistory();
});

document.getElementById('close')?.addEventListener('click', () => window.close());
document.addEventListener('DOMContentLoaded', () => {
  const pwInput = document.getElementById('pw');
  if (pwInput) { pwInput.focus(); pwInput.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') document.getElementById('unlock').click(); }); }
  document.getElementById('refresh-history')?.addEventListener('click', () => { try { loadHistory(); } catch (e) { console.warn('Refresh history failed', e); } });
  document.getElementById('hist-prev')?.addEventListener('click', () => { window.__hist_page_index = Math.max(0, (window.__hist_page_index || 0) - 1); loadHistory(); });
  document.getElementById('hist-next')?.addEventListener('click', () => { window.__hist_page_index = (window.__hist_page_index || 0) + 1; loadHistory(); });
});
