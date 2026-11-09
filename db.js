// Lightweight DB helper using background QUERY message (wa-sqlite executed in background)
const db = (function () {
  function flattenBlocks(data) {
    const out = [];
    for (const block of data || []) {
      const cols = block.columns || [];
      for (const row of block.rows || []) {
        const obj = {};
        for (let i = 0; i < cols.length; i++) obj[cols[i]] = row[i];
        out.push(obj);
      }
    }
    return out;
  }

  function sendDbMessage(message) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(message, (resp) => {
          const runtimeError = chrome.runtime.lastError;
          if (runtimeError) {
            return reject(new Error(runtimeError.message));
          }
          if (!resp) {
            return reject(
              new Error(
                globalThis.I18n?.t('db.noResponse') || 'No response from background'
              )
            );
          }
          if (resp.status !== 'success') {
            return reject(
              new Error(
                resp.message || globalThis.I18n?.t('db.queryFailed') || 'Query failed'
              )
            );
          }
          resolve(resp.data);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  async function rawQuery(sql) {
    const data = await sendDbMessage({ action: 'QUERY', payload: { sql } });
    return flattenBlocks(data);
  }

  async function rawQueryWithParams(sql, params) {
    const data = await sendDbMessage({
      action: 'QUERY_PARAMS',
      payload: { sql, params },
    });
    return flattenBlocks(data);
  }

  async function run(sql) {
    // for statements that don't return rows
    await rawQuery(sql);
  }

  async function runBatch(statements) {
    const sql = (statements || []).filter(Boolean).join('\n');
    if (sql.trim()) await rawQuery(sql);
  }

  // Convenience methods
  return {
    query: rawQuery,
    queryWithParams: rawQueryWithParams,
    run,
    runBatch,
    async getPasswordHash() {
      const result = await rawQuery(`SELECT v FROM settings WHERE k = 'passwordHash';`);
      if (result && result.length > 0) {
        return result[0].v;
      } else {
        return null;
      }
    },
    async setPasswordHash(passwordHash) {
      await run(
        `INSERT OR REPLACE INTO settings(k, v) VALUES('passwordHash', '${passwordHash}');`
      );
    },
    async deletePasswordHash() {
      await run(`DELETE FROM settings WHERE k = 'passwordHash';`);
    },
    async deleteBookmark(id) {
      const iid = String(id).replaceAll("'", "''");
      await run(`DELETE FROM bookmarks WHERE id='${iid}';`);
    },
    async deleteHistory(id) {
      const iid = String(id).replaceAll("'", "''");
      await run(`DELETE FROM visit_history WHERE id='${iid}';`);
    },
    async getBookmarks() {
      return rawQuery('SELECT id, title, url, folderId, added FROM bookmarks');
    },
    async getBookmarksPage(limit = 50, offset = 0) {
      return rawQuery(
        `SELECT id, title, url, folderId, added FROM bookmarks ORDER BY added DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)};`
      );
    },
    async countBookmarks() {
      const r = await rawQuery(`SELECT COUNT(1) as cnt FROM bookmarks;`);
      return r[0] && r[0].cnt ? Number(r[0].cnt) : 0;
    },
    async addBookmark({ id, title, url, folderId, added }) {
      const iid = id || String(Date.now()) + Math.random().toString(36).slice(2, 8);
      const t = (title || '').replaceAll("'", "''");
      const u = (url || '').replaceAll("'", "''");
      const f = (folderId || '1').replaceAll("'", "''");
      const a = Number(added) || Date.now();
      await run(
        `INSERT OR REPLACE INTO bookmarks(id,title,url,folderId,added) VALUES('${iid}','${t}','${u}','${f}', ${a});`
      );
      return { id: iid, title, url, folderId: f, added: a };
    },
    async addBookmarks(items) {
      const statements = ['BEGIN;'];
      const inserted = [];
      for (const item of items || []) {
        const iid =
          item.id || String(Date.now()) + Math.random().toString(36).slice(2, 8);
        const title = item.title || '';
        const url = item.url || '';
        const folderId = item.folderId || '1';
        const added = Number(item.added) || Date.now();
        const iidEsc = String(iid).replaceAll("'", "''");
        const t = String(title).replaceAll("'", "''");
        const u = String(url).replaceAll("'", "''");
        const f = String(folderId).replaceAll("'", "''");
        statements.push(
          `INSERT OR REPLACE INTO bookmarks(id,title,url,folderId,added) VALUES('${iidEsc}','${t}','${u}','${f}', ${added});`
        );
        inserted.push({ id: iid, title, url, folderId, added });
      }
      statements.push('COMMIT;');
      await runBatch(statements);
      return inserted;
    },
    async findBookmarkByUrl(url) {
      const u = (url || '').replaceAll("'", "''");
      const r = await rawQuery(
        `SELECT id, title, url, folderId, added FROM bookmarks WHERE url='${u}' LIMIT 1;`
      );
      return r[0] || null;
    },
    async getFolders() {
      return rawQuery('SELECT id, name FROM folders');
    },
    async addFolder({ id, name }) {
      const iid = id || String(Date.now()) + Math.random().toString(36).slice(2, 8);
      const n = (name || '').replaceAll("'", "''");
      await run(`INSERT OR REPLACE INTO folders(id,name) VALUES('${iid}','${n}');`);
      return { id: iid, name };
    },
    async getMonitoredDomains() {
      return (await rawQuery('SELECT domain FROM monitored_domains')).map(
        (r) => r.domain
      );
    },
    async getMonitoredDomainsWithPatterns() {
      const results = await rawQuery('SELECT id, domain, url_pattern FROM monitored_domains');
      return results.map(r => ({
        id: r.id,
        domain: r.domain,
        urlPattern: r.url_pattern || ''
      }));
    },
    async checkDomainPatternExists(domain, urlPattern = '') {
      const d = (domain || '').replaceAll("'", "''");
      const p = (urlPattern || '').replaceAll("'", "''");
      const results = await rawQuery(`SELECT id FROM monitored_domains WHERE domain = '${d}' AND url_pattern = '${p}'`);
      return results.length > 0;
    },
    async addMonitoredDomain(domain, urlPattern = '') {
      const d = (domain || '').replaceAll("'", "''");
      const p = (urlPattern || '').replaceAll("'", "''");
      // Check for duplicate domain+pattern combination
      const exists = await this.checkDomainPatternExists(d, p);
      if (exists) return { id: null, duplicate: true };
      await run(`INSERT INTO monitored_domains(domain, url_pattern) VALUES('${d}', '${p}');`);
      const results = await rawQuery(`SELECT id FROM monitored_domains WHERE domain = '${d}' AND url_pattern = '${p}' ORDER BY id DESC LIMIT 1`);
      return { id: results[0]?.id || null, duplicate: false };
    },
    async updateMonitoredDomain(id, urlPattern) {
      const iid = Number(id);
      const p = (urlPattern || '').replaceAll("'", "''");
      await run(`UPDATE monitored_domains SET url_pattern = '${p}' WHERE id = ${iid};`);
    },
    async deleteMonitoredDomain(id) {
      const iid = Number(id);
      await run(`DELETE FROM monitored_domains WHERE id = ${iid};`);
    },
    async getVisitHistory(limit = 100) {
      const rows = await rawQuery(
        `SELECT id, url, title, domain, timestamp FROM visit_history ORDER BY timestamp DESC LIMIT ${Number(limit)};`
      );
      return rows;
    },
    async getVisitHistoryPage(limit = 100, offset = 0) {
      const rows = await rawQuery(
        `SELECT id, url, title, domain, timestamp FROM visit_history ORDER BY timestamp DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)};`
      );
      return rows;
    },
    async countVisitHistory() {
      const r = await rawQuery(`SELECT COUNT(1) as cnt FROM visit_history;`);
      return r[0] && r[0].cnt ? Number(r[0].cnt) : 0;
    },
    async addVisitHistory({ id, url, title, domain, timestamp }) {
      const iid = id || String(Date.now()) + Math.random().toString(36).slice(2, 8);
      const u = (url || '').replaceAll("'", "''");
      const t = (title || '').replaceAll("'", "''");
      const d = (domain || '').replaceAll("'", "''");
      const ts = Number(timestamp) || Date.now();
      await run(
        `INSERT OR REPLACE INTO visit_history(id,url,title,domain,timestamp) VALUES('${iid}','${u}','${t}','${d}', ${ts});`
      );
      return { id: iid, url, title, domain, timestamp: ts };
    },
  };
})();

// expose globally
globalThis.db = db;
