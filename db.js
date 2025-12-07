// Lightweight DB helper using background QUERY message (wa-sqlite executed in background)
const db = (function () {
  async function rawQuery(sql) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage({ action: 'QUERY', payload: { sql } }, (resp) => {
          if (!resp) return reject(new Error('No response from background'));
          if (resp.status !== 'success') return reject(new Error(resp.message || 'Query failed'));
          // resp.data is an array of result blocks { columns, rows }
          const out = [];
          for (const block of resp.data || []) {
            const cols = block.columns || [];
            for (const r of block.rows || []) {
              const obj = {};
              for (let i = 0; i < cols.length; i++) obj[cols[i]] = r[i];
              out.push(obj);
            }
          }
          resolve(out);
        });
      } catch (e) { reject(e); }
    });
  }

  async function run(sql) {
    // for statements that don't return rows
    await rawQuery(sql);
  }

  // Convenience methods
  return {
    query: rawQuery,
    run,
    async getBookmarks() {
      return rawQuery('SELECT id, title, url, folderId, added FROM bookmarks');
    },
    async addBookmark({ id, title, url, folderId, added }) {
      const iid = id ? id : String(Date.now()) + Math.random().toString(36).slice(2,8);
      const t = (title || '').replace(/'/g, "''");
      const u = (url || '').replace(/'/g, "''");
      const f = (folderId || '1').replace(/'/g, "''");
      const a = Number(added) || Date.now();
      await run(`INSERT OR REPLACE INTO bookmarks(id,title,url,folderId,added) VALUES('${iid}','${t}','${u}','${f}', ${a});`);
      return { id: iid, title, url, folderId: f, added: a };
    },
    async getFolders() {
      return rawQuery('SELECT id, name FROM folders');
    },
    async addFolder({ id, name }) {
      const iid = id ? id : String(Date.now()) + Math.random().toString(36).slice(2,8);
      const n = (name || '').replace(/'/g, "''");
      await run(`INSERT OR REPLACE INTO folders(id,name) VALUES('${iid}','${n}');`);
      return { id: iid, name };
    },
    async getMonitoredDomains() {
      return (await rawQuery('SELECT domain FROM monitored_domains')).map(r => r.domain);
    },
    async addMonitoredDomain(domain) {
      const d = (domain || '').replace(/'/g, "''");
      await run(`INSERT OR REPLACE INTO monitored_domains(domain) VALUES('${d}');`);
    },
    async getVisitHistory(limit = 100) {
      const rows = await rawQuery(`SELECT id, url, title, domain, timestamp FROM visit_history ORDER BY timestamp DESC LIMIT ${Number(limit)};`);
      return rows;
    },
    async addVisitHistory({ id, url, title, domain, timestamp }) {
      const iid = id ? id : String(Date.now()) + Math.random().toString(36).slice(2,8);
      const u = (url || '').replace(/'/g, "''");
      const t = (title || '').replace(/'/g, "''");
      const d = (domain || '').replace(/'/g, "''");
      const ts = Number(timestamp) || Date.now();
      await run(`INSERT OR REPLACE INTO visit_history(id,url,title,domain,timestamp) VALUES('${iid}','${u}','${t}','${d}', ${ts});`);
      return { id: iid, url, title, domain, timestamp: ts };
    }
  };
})();

// expose globally
window.db = db;
