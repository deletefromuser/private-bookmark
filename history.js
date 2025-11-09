// Load and render private visitHistory
async function loadHistory() {
  const res = await chrome.storage.local.get({ visitHistory: [] });
  const list = res.visitHistory || [];
  const container = document.getElementById('history-list');
  container.innerHTML = '';
  if (list.length === 0) {
    const p = document.createElement('p');
    p.className = 'text-muted';
    p.textContent = '(no visits recorded yet)';
    container.appendChild(p);
    return;
  }
  const ul = document.createElement('ul');
  ul.className = 'list-group';
  // show newest first
  list.slice().reverse().forEach(e => {
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
    ul.appendChild(li);
  });
  container.appendChild(ul);
}

document.getElementById('close')?.addEventListener('click', () => window.close());
document.addEventListener('DOMContentLoaded', loadHistory);
