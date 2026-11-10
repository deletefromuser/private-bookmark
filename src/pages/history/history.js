const tr = (key, vars) => globalThis.I18n.t(key, vars);

async function loadHistory() {
  // pagination params
  const pageSize = (globalThis.__hist_page_size = globalThis.__hist_page_size || 20);
  const pageIndex = (globalThis.__hist_page_index = globalThis.__hist_page_index || 0);
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

  const whereSql = wheres.length ? 'WHERE ' + wheres.join(' AND ') : '';

  // read from SQLite via db helper (paged) with filters
  // query with params (add LIMIT/OFFSET as parameters)
  const selectSql = `SELECT id, url, title, domain, timestamp FROM visit_history ${whereSql} ORDER BY timestamp DESC LIMIT ? OFFSET ?;`;
  const selectParams = params.slice();
  selectParams.push(Number(pageSize), Number(offset));
  const list = await globalThis.db.queryWithParams(selectSql, selectParams);
  const container = document.getElementById('history-list');
  container.innerHTML = '';
  if (list.length === 0) {
    const p = document.createElement('p');
    p.className = 'text-muted';
    p.textContent = tr('history.noVisits');
    container.appendChild(p);
    updateHistPageInfo(pageIndex, pageSize, 0);
    return;
  }
  const ul = document.createElement('ul');
  ul.className = 'list-group';
  // show newest first
  list.forEach((e) => {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-start';
    const left = document.createElement('div');
    left.className = 'ms-2 me-auto';
    const title = document.createElement('a');
    title.href = globalThis.AppUtils.safeUrl(e.url);
    title.target = '_blank';
    title.rel = 'noopener noreferrer';
    title.textContent = e.title || e.url;
    title.className = 'fw-bold';
    left.appendChild(title);
    const small = document.createElement('div');
    small.className = 'small text-muted';
    small.textContent = `${e.domain} — ${new Date(e.timestamp).toLocaleString(globalThis.I18n.getLanguage())}`;
    left.appendChild(small);
    li.appendChild(left);
    // delete button
    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-sm btn-danger ms-2';
    delBtn.textContent = tr('common.delete');
    delBtn.addEventListener('click', async () => {
      const ok = await globalThis._modal.showConfirm(tr('history.confirmDeleteEntry'));
      if (!ok) return;
      try {
        await globalThis.db.deleteHistory(e.id);
      } catch (err) {
        console.warn('Failed to delete history entry', err);
      }
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
  const total = cntRes && cntRes[0] && cntRes[0].cnt ? Number(cntRes[0].cnt) : 0;
  updateHistPageInfo(pageIndex, pageSize, total);
}

function updateHistPageInfo(pageIndex, pageSize, total) {
  const info = document.getElementById('hist-page-info');
  const page = globalThis.AppUtils.getPageInfo(pageIndex, pageSize, total);
  if (info) info.textContent = tr('common.pageInfo', page);
  const prev = document.getElementById('hist-prev');
  const next = document.getElementById('hist-next');
  if (prev) prev.disabled = !page.hasPrev;
  if (next) next.disabled = !page.hasNext;
  renderPageButtons(pageIndex, pageSize, total);
}

function renderPageButtons(pageIndex, pageSize, total) {
  const container = document.getElementById('hist-pages');
  if (!container) return;
  container.innerHTML = '';
  const totalPages = Math.max(
    1,
    Math.ceil(Math.max(0, Number(total) || 0) / Math.max(1, Number(pageSize) || 1))
  );
  const index = Math.max(0, Math.min(Number(pageIndex) || 0, totalPages - 1));
  if (totalPages <= 1) return;
  const maxShown = 5;
  let start, end;
  if (totalPages <= maxShown) {
    start = 1;
    end = totalPages;
  } else {
    const half = Math.floor(maxShown / 2);
    start = Math.max(2, index - half + 1);
    end = Math.min(totalPages - 1, index + half);
    if (end - start < maxShown - 2) {
      if (start === 2) end = Math.min(totalPages - 1, start + maxShown - 3);
      else start = Math.max(2, end - maxShown + 3);
    }
  }
  if (start > 2) {
    container.appendChild(pageBtn(1, index));
    if (start > 3) container.appendChild(pageEllipsis());
  }
  for (let p = start; p <= end; p++) {
    container.appendChild(pageBtn(p, index));
  }
  if (end < totalPages - 1) {
    if (end < totalPages - 2) container.appendChild(pageEllipsis());
    container.appendChild(pageBtn(totalPages, index));
  }
}

function pageBtn(page, currentIndex) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className =
    'btn btn-sm' +
    (page - 1 === currentIndex ? ' btn-primary' : ' btn-outline-secondary');
  btn.textContent = String(page);
  if (page - 1 === currentIndex) btn.setAttribute('aria-current', 'page');
  btn.addEventListener('click', () => {
    globalThis.__hist_page_index = page - 1;
    loadHistory();
  });
  return btn;
}

function pageEllipsis() {
  const span = document.createElement('span');
  span.className = 'text-muted small align-self-center';
  span.textContent = '…';
  return span;
}

function showUnlockError(msg) {
  const authMsg = document.getElementById('auth-msg');
  if (authMsg) {
    authMsg.textContent = msg;
    authMsg.style.color = 'red';
  }
}

document.getElementById('unlock')?.addEventListener('click', async () => {
  const pw = document.getElementById('pw').value || '';
  const result = await globalThis.AppUtils.authenticate(pw);
  if (!result.ok) return showUnlockError(result.error);
  document.getElementById('auth').style.display = 'none';
  document.getElementById('content').style.display = 'block';
  loadHistory();
});

document.getElementById('close')?.addEventListener('click', () => window.close());
document.addEventListener('DOMContentLoaded', () => {
  const pwInput = document.getElementById('pw');
  if (pwInput) {
    pwInput.focus();
    pwInput.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') document.getElementById('unlock').click();
    });
  }
  document.getElementById('refresh-history')?.addEventListener('click', () => {
    try {
      loadHistory();
    } catch (e) {
      console.warn('Refresh history failed', e);
    }
  });
  document.getElementById('hist-prev')?.addEventListener('click', () => {
    globalThis.__hist_page_index = Math.max(0, (globalThis.__hist_page_index || 0) - 1);
    loadHistory();
  });
  document.getElementById('hist-next')?.addEventListener('click', () => {
    globalThis.__hist_page_index = (globalThis.__hist_page_index || 0) + 1;
    loadHistory();
  });
  document.getElementById('search-run')?.addEventListener('click', () => {
    globalThis.__hist_page_index = 0;
    loadHistory();
  });
  document.getElementById('search-clear')?.addEventListener('click', () => {
    const t = document.getElementById('search-title');
    if (t) {
      t.value = '';
    }
    const u = document.getElementById('search-url');
    if (u) {
      u.value = '';
    }
    const s = document.getElementById('search-start');
    if (s) {
      s.value = '';
    }
    const e = document.getElementById('search-end');
    if (e) {
      e.value = '';
    }
    globalThis.__hist_page_index = 0;
    loadHistory();
  });
});
