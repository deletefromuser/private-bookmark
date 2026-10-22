import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../shared.js', import.meta.url), 'utf8');
const context = vm.createContext({
  console,
  crypto: globalThis.crypto,
  TextEncoder,
  URL,
});
vm.runInContext(source, context, { filename: 'shared.js' });
const { AppUtils } = context;
const plain = (value) => JSON.parse(JSON.stringify(value));

test('escapeHtml escapes markup and quotes', () => {
  assert.equal(
    AppUtils.escapeHtml(`<a href="x">'&'</a>`),
    '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;'
  );
  assert.equal(AppUtils.escapeHtml(null), '');
});

test('safeUrl only permits http and https', () => {
  assert.equal(AppUtils.safeUrl('javascript:alert(1)'), '#');
  assert.equal(AppUtils.safeUrl('data:text/html,test'), '#');
  assert.equal(AppUtils.safeUrl('not a url'), '#');
  assert.match(AppUtils.safeUrl('https://example.com/a?b=1'), /^https:\/\/example\.com/);
  assert.match(AppUtils.safeUrl('http://example.com'), /^http:\/\/example\.com/);
});

test('isDestructiveSql detects statements outside literals and comments', () => {
  assert.equal(AppUtils.isDestructiveSql('SELECT 1;'), false);
  assert.equal(AppUtils.isDestructiveSql("SELECT '-- not a comment';"), false);
  assert.equal(AppUtils.isDestructiveSql('SELECT 1; -- DROP TABLE bookmarks'), false);
  assert.equal(AppUtils.isDestructiveSql('SELECT 1; DROP TABLE bookmarks;'), true);
  assert.equal(
    AppUtils.isDestructiveSql('WITH x AS (SELECT 1) DELETE FROM bookmarks;'),
    true
  );
  assert.equal(AppUtils.isDestructiveSql('/* DELETE */ SELECT 1'), false);
});

test('getPageInfo handles empty, middle, and out-of-range pages', () => {
  assert.deepEqual(plain(AppUtils.getPageInfo(0, 20, 0)), {
    pageIndex: 0,
    start: 0,
    end: 0,
    total: 0,
    hasPrev: false,
    hasNext: false,
  });

  assert.deepEqual(plain(AppUtils.getPageInfo(1, 20, 45)), {
    pageIndex: 1,
    start: 21,
    end: 40,
    total: 45,
    hasPrev: true,
    hasNext: true,
  });

  assert.deepEqual(plain(AppUtils.getPageInfo(99, 20, 45)), {
    pageIndex: 2,
    start: 41,
    end: 45,
    total: 45,
    hasPrev: true,
    hasNext: false,
  });

  assert.equal(AppUtils.getPageInfo(-1, 20, 45).pageIndex, 0);
});

test('PBKDF2 password hashes verify and reject wrong passwords', async () => {
  const hash = await AppUtils.hashPassword('correct horse battery staple');
  assert.match(hash, /^pbkdf2\$210000\$[0-9a-f]{32}\$[0-9a-f]{64}$/);

  const good = await AppUtils.verifyPassword('correct horse battery staple', hash);
  assert.deepEqual(plain(good), { ok: true, needsUpgrade: false });

  const bad = await AppUtils.verifyPassword('wrong password', hash);
  assert.deepEqual(plain(bad), { ok: false, needsUpgrade: false });
});

test('legacy SHA-256 hashes verify and request an upgrade', async () => {
  const legacy = await AppUtils.sha256Hex('legacy password');
  assert.match(legacy, /^[0-9a-f]{64}$/);

  const good = await AppUtils.verifyPassword('legacy password', legacy);
  assert.deepEqual(plain(good), { ok: true, needsUpgrade: true });

  const bad = await AppUtils.verifyPassword('nope', legacy);
  assert.deepEqual(plain(bad), { ok: false, needsUpgrade: false });
});
