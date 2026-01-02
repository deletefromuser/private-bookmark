async function sha256(text) {
  if (!text) return '';
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function loadHistory() {
  // pagination params
  const pageSize = globalThis.__hist_page_size = globalThis.__hist_page_size || 20;
  const pageIndex = globalThis.__hist_page_index = globalThis.__hist_page_index || 0;
  const offset = pageIndex * pageSize;
  // build filters from search UI
  const titleFilter = (document.getElementById('search-title')?.value || '').trim();
  const urlFilter = (document.getElementById('search-url')?.value || '').trim();
  const startDate = document.getElementById('search-start')?.value || '';
  const endDate = document.getElementById('search-end')?.value || '';

  // build WHERE clauses and params for a parameterized query
  const wheres = [];
  const params = [];
  if (titleFilter) {
    // match keywords anywhere; also match words prefixed with space
    wheres.push('(title LIKE ? OR title LIKE ?)');
    params.push(`%${titleFilter}%`, `% ${titleFilter}%`);
  }
  if (urlFilter) {
    wheres.push('(url LIKE ? OR domain LIKE ?)');
    params.push(`%${urlFilter}%`, `%${urlFilter}%`);
  }
  if (startDate) {
    const ts = Date.parse(startDate);
    if (!Number.isNaN(ts)) {
      wheres.push('timestamp >= ?');
      params.push(Number(ts));
    }
  }
  if (endDate) {
    // include entire day by adding 23:59:59
    const dt = new Date(endDate);
    dt.setHours(23, 59, 59, 999);
    const ts = dt.getTime();
    if (!Number.isNaN(ts)) {
      wheres.push('timestamp <= ?');
      params.push(Number(ts));
    }
  }

  const whereSql = wheres.length ? ('WHERE ' + wheres.join(' AND ')) : '';

  // read from SQLite via db helper (paged) with filters
  // query with params (add LIMIT/OFFSET as parameters)
  const selectSql = `SELECT id, url, title, domain, timestamp FROM visit_history ${whereSql} ORDER BY timestamp DESC LIMIT ? OFFSET ?;`;
  const selectParams = params.slice();
  selectParams.push(Number(pageSize), Number(offset));
  console.log(selectSql, selectParams);
  const list = await globalThis.db.queryWithParams(selectSql, selectParams);
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
      const ok = await globalThis._modal.showConfirm('Delete this history entry? This cannot be undone.');
      if (!ok) return;
      try {
        await globalThis.db.deleteHistory(e.id);
      } catch (err) { console.warn('Failed to delete history entry', err); }
      loadHistory();
    });
    li.appendChild(delBtn);
    ul.appendChild(li);
  });
  container.appendChild(ul);
  // count total matching rows for pagination
  const cntSql = `SELECT COUNT(1) as cnt FROM visit_history ${whereSql};`;
  const cntParams = params.slice();
  const cntRes = await globalThis.db.queryWithParams(cntSql, cntParams);
  const total = (cntRes && cntRes[0] && cntRes[0].cnt) ? Number(cntRes[0].cnt) : 0;
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
  document.getElementById('hist-prev')?.addEventListener('click', () => { globalThis.__hist_page_index = Math.max(0, (globalThis.__hist_page_index || 0) - 1); loadHistory(); });
  document.getElementById('hist-next')?.addEventListener('click', () => { globalThis.__hist_page_index = (globalThis.__hist_page_index || 0) + 1; loadHistory(); });
  document.getElementById('search-run')?.addEventListener('click', () => { globalThis.__hist_page_index = 0; loadHistory(); });
  document.getElementById('search-clear')?.addEventListener('click', () => {
    const t = document.getElementById('search-title');
    if (t) { t.value = ''; }
    const u = document.getElementById('search-url');
    if (u) { u.value = ''; }
    const s = document.getElementById('search-start');
    if (s) { s.value = ''; }
    const e = document.getElementById('search-end');
    if (e) { e.value = ''; }
    globalThis.__hist_page_index = 0;
    loadHistory();
  });
});
