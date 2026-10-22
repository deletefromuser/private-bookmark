(function (global) {
  const HTML_ESCAPES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
  }

  function safeUrl(value) {
    try {
      const url = new URL(String(value));
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return url.href;
      }
    } catch (e) {
      // Leave invalid URLs unusable.
    }
    return '#';
  }

  function stripSqlNoise(sql) {
    let out = '';
    for (let i = 0; i < sql.length; ) {
      const ch = sql[i];
      const next = sql[i + 1];
      if (ch === '-' && next === '-') {
        i += 2;
        while (i < sql.length && sql[i] !== '\n') i++;
        out += ' ';
        continue;
      }
      if (ch === '/' && next === '*') {
        i += 2;
        while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) i++;
        i += 2;
        out += ' ';
        continue;
      }
      if (ch === "'" || ch === '"' || ch === '`') {
        const quote = ch;
        i++;
        while (i < sql.length) {
          if (sql[i] === quote) {
            if (sql[i + 1] === quote) {
              i += 2;
              continue;
            }
            i++;
            break;
          }
          i++;
        }
        out += ' ';
        continue;
      }
      if (ch === '[') {
        i++;
        while (i < sql.length && sql[i] !== ']') i++;
        i++;
        out += ' ';
        continue;
      }
      out += ch;
      i++;
    }
    return out;
  }

  function isDestructiveSql(sql) {
    const clean = stripSqlNoise(String(sql ?? ''));
    const statements = clean
      .split(';')
      .map((statement) => statement.trim())
      .filter(Boolean);
    const dangerous =
      /\b(INSERT|UPDATE|DELETE|REPLACE|DROP|ALTER|CREATE|VACUUM|REINDEX|ATTACH|DETACH)\b/i;
    return statements.some((statement) => dangerous.test(statement));
  }

  global.AppUtils = { escapeHtml, safeUrl, isDestructiveSql };
})(globalThis);
