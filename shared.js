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
    for (let i = 0; i < sql.length;) {
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

  const PBKDF2_ITERATIONS = 210000;
  const PBKDF2_SALT_BYTES = 16;
  const PBKDF2_KEY_BITS = 256;

  function bytesToHex(bytes) {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function hexToBytes(hex) {
    if (hex.length % 2 !== 0) return null;
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      const value = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
      if (Number.isNaN(value)) return null;
      bytes[i] = value;
    }
    return bytes;
  }

  function timingSafeEqual(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
  }

  async function sha256Hex(text) {
    const data = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return bytesToHex(new Uint8Array(digest));
  }

  async function derivePasswordBits(password, salt, iterations) {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations,
        hash: 'SHA-256',
      },
      key,
      PBKDF2_KEY_BITS
    );
    return new Uint8Array(bits);
  }

  async function hashPassword(password) {
    const salt = crypto.getRandomValues(new Uint8Array(PBKDF2_SALT_BYTES));
    const hash = await derivePasswordBits(password, salt, PBKDF2_ITERATIONS);
    return `pbkdf2$${PBKDF2_ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(hash)}`;
  }

  async function verifyPassword(password, stored) {
    if (!stored || typeof stored !== 'string') {
      return { ok: false, needsUpgrade: false };
    }
    if (stored.startsWith('pbkdf2$')) {
      const parts = stored.split('$');
      if (parts.length !== 4) return { ok: false, needsUpgrade: false };
      const iterations = Number(parts[1]);
      const salt = hexToBytes(parts[2]);
      const expected = hexToBytes(parts[3]);
      if (!Number.isInteger(iterations) || iterations <= 0 || !salt || !expected) {
        return { ok: false, needsUpgrade: false };
      }
      const actual = await derivePasswordBits(password, salt, iterations);
      const ok = timingSafeEqual(actual, expected);
      return {
        ok,
        needsUpgrade: ok && iterations < PBKDF2_ITERATIONS,
      };
    }
    if (/^[0-9a-f]{64}$/i.test(stored)) {
      const actual = hexToBytes(await sha256Hex(password));
      const expected = hexToBytes(stored);
      const ok = timingSafeEqual(actual, expected);
      return {
        ok,
        needsUpgrade: ok,
      };
    }
    return { ok: false, needsUpgrade: false };
  }

  function getPageInfo(pageIndex, pageSize, total) {
    const size = Math.max(1, Number(pageSize) || 1);
    const count = Math.max(0, Number(total) || 0);
    const lastPage = count === 0 ? 0 : Math.max(0, Math.ceil(count / size) - 1);
    const index = Math.min(Math.max(0, Number(pageIndex) || 0), lastPage);
    const start = count === 0 ? 0 : index * size + 1;
    const end = Math.min(count, (index + 1) * size);
    return {
      pageIndex: index,
      start,
      end,
      total: count,
      hasPrev: index > 0,
      hasNext: end < count,
    };
  }

  async function authenticate(
    password,
    {
      allowWhenUnset = false,
      missingPasswordMessage = 'No password set — set one in Options',
    } = {}
  ) {
    const stored = await globalThis.db.getPasswordHash();
    if (!stored) {
      return allowWhenUnset ? { ok: true } : { ok: false, error: missingPasswordMessage };
    }
    if (!password) return { ok: false, error: 'Password required' };
    const verification = await verifyPassword(password, stored);
    if (!verification.ok) return { ok: false, error: 'Wrong password' };
    if (verification.needsUpgrade) {
      await globalThis.db.setPasswordHash(await hashPassword(password));
    }
    return { ok: true };
  }

  global.AppUtils = {
    escapeHtml,
    safeUrl,
    isDestructiveSql,
    getPageInfo,
    sha256Hex,
    hashPassword,
    verifyPassword,
    authenticate,
  };
})(globalThis);
