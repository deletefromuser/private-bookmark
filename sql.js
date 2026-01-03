// SQL console script: runs SQL entered in the textarea and shows results
let lastResults = null;

function isDestructive(sql) {
    if (!sql) return false;
    const s = sql.trim().toUpperCase();
    return /^(DELETE|UPDATE|INSERT|DROP|ALTER|REPLACE)\b/.test(s);
}

function renderResults(res, container) {
    container.innerHTML = '';
    if (!res || res.length === 0) {
        const p = document.createElement('p');
        p.className = 'text-muted';
        p.textContent = '(no rows)';
        container.appendChild(p);
        return;
    }
    // Build table from keys of first row
    const table = document.createElement('table');
    table.className = 'table table-sm table-striped';
    const thead = document.createElement('thead');
    const tr = document.createElement('tr');
    const cols = Object.keys(res[0]);
    for (const c of cols) {
        const th = document.createElement('th'); th.textContent = c; tr.appendChild(th);
    }
    thead.appendChild(tr);
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const row of res) {
        const tr2 = document.createElement('tr');
        for (const c of cols) {
            const td = document.createElement('td'); td.textContent = row[c] == null ? '' : String(row[c]); tr2.appendChild(td);
        }
        tbody.appendChild(tr2);
    }
    table.appendChild(tbody);
    container.appendChild(table);
}

async function runSql() {
    const sql = document.getElementById('sql-input')?.value || '';
    const status = document.getElementById('sql-status');
    const container = document.getElementById('sql-results');
    if (!sql) {
        if (status) status.textContent = 'Enter SQL to run';
        return;
    }
    try {
        if (isDestructive(sql)) {
            const ok = await globalThis._modal.showConfirm('This statement looks destructive. Continue?');
            if (!ok) {
                if (status) status.textContent = 'Cancelled';
                return;
            }
        }
        if (status) status.textContent = 'Running...';
        // Decide whether to use parameterized runner or simple query
        // For convenience, we use the raw query path. If multiple statements are provided, db.query will return blocks.
        const res = await globalThis.db.query(sql);
        renderResults(res, container);
        if (status) status.textContent = `Returned ${res.length} rows`;
    } catch (e) {
        console.error('SQL failed', e);
        if (status) status.textContent = `Error: ${String(e)}`;
    }
}

function flattenQueryBlocks(res) {
    const out = [];
    for (const block of res || []) {
        const cols = block.columns || [];
        for (const r of block.rows || []) {
            const obj = {};
            for (let i = 0; i < cols.length; i++) obj[cols[i]] = r[i];
            out.push(obj);
        }
    }
    return out;
}

function clearSql() {
    const input = document.getElementById('sql-input'); if (input) input.value = '';
    const container = document.getElementById('sql-results'); if (container) container.innerHTML = '';
    const status = document.getElementById('sql-status'); if (status) status.textContent = '';
    lastResults = null;
}

function exportLastResults() {
    if (!lastResults) { alert('No results to export'); return; }
    const blob = new Blob([JSON.stringify(lastResults, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `sql-results-${Date.now()}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

// wire events
globalThis.addEventListener('DOMContentLoaded', () => {
    document.getElementById('sql-run')?.addEventListener('click', runSql);
    document.getElementById('sql-clear')?.addEventListener('click', clearSql);
    document.getElementById('sql-export')?.addEventListener('click', exportLastResults);
});
