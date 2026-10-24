import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../i18n.js', import.meta.url), 'utf8');
const context = vm.createContext({ console });
vm.runInContext(source, context, { filename: 'i18n.js' });
const { I18n } = context;

const htmlFiles = readdirSync(new URL('..', import.meta.url))
  .filter((name) => name.endsWith('.html'))
  .map((name) => ({
    name,
    source: readFileSync(new URL(`../${name}`, import.meta.url), 'utf8'),
  }));

const jsFiles = readdirSync(new URL('..', import.meta.url))
  .filter((name) => name.endsWith('.js') && name !== 'i18n.js')
  .map((name) => ({
    name,
    source: readFileSync(new URL(`../${name}`, import.meta.url), 'utf8'),
  }));

function collectMatches(source, pattern) {
  const matches = new Set();
  for (const match of source.matchAll(pattern)) matches.add(match[1]);
  return matches;
}

test('normalizes supported and unsupported languages', () => {
  assert.equal(I18n.normalizeLanguage('ja'), 'ja');
  assert.equal(I18n.normalizeLanguage('ja-JP'), 'ja');
  assert.equal(I18n.normalizeLanguage('JA_jp'), 'ja');
  assert.equal(I18n.normalizeLanguage('zh-CN'), 'zh-CN');
  assert.equal(I18n.normalizeLanguage('zh_TW'), 'zh-CN');
  assert.equal(I18n.normalizeLanguage('zh-Hant'), 'zh-CN');
  assert.equal(I18n.normalizeLanguage('en-US'), 'en');
  assert.equal(I18n.normalizeLanguage('fr-FR'), null);
  assert.equal(I18n.normalizeLanguage(''), null);
});

test('translates and interpolates catalog messages', () => {
  assert.equal(I18n.translate('ja', 'popup.add'), '追加');
  assert.equal(I18n.translate('zh-CN', 'popup.add'), '添加');
  assert.equal(
    I18n.translate('zh-CN', 'common.pageInfo', { start: 1, end: 20, total: 100 }),
    '第 1-20 条，共 100 条'
  );
  assert.equal(
    I18n.translate('ja', 'common.pageInfo', { start: 1, end: 20, total: 100 }),
    '100 件中 1-20 件'
  );
  assert.equal(
    I18n.translate('en', 'common.pageInfo', { start: 1, end: 20, total: 100 }),
    '1-20 of 100'
  );
});

test('falls back to English for unsupported languages and missing variables', () => {
  assert.equal(I18n.translate('fr', 'popup.add'), 'Add');
  assert.equal(I18n.translate('ja', 'missing.key'), 'missing.key');
  assert.equal(
    I18n.translate('en', 'common.pageInfo', { start: 1, end: 20 }),
    '1-20 of {total}'
  );
});

test('all catalogs share the English key set and have values', () => {
  const englishKeys = Object.keys(I18n.messages.en).sort();
  for (const language of ['ja', 'zh-CN']) {
    assert.deepEqual(Object.keys(I18n.messages[language]).sort(), englishKeys);
    for (const [key, value] of Object.entries(I18n.messages[language])) {
      assert.equal(typeof value, 'string', `${language}:${key} should be a string`);
      assert.ok(value.trim().length > 0, `${language}:${key} should not be empty`);
    }
  }
});

test('every data-i18n key in HTML exists in the catalog', () => {
  const keys = new Set();
  for (const file of htmlFiles) {
    for (const key of collectMatches(
      file.source,
      /data-i18n(?:-placeholder|-title|-aria-label)?="([^"]+)"/g
    )) {
      keys.add(key);
    }
  }
  for (const key of keys) {
    assert.ok(key in I18n.messages.en, `missing HTML translation key: ${key}`);
  }
});

test('every translation key referenced by page scripts exists', () => {
  const keys = new Set();
  for (const file of jsFiles) {
    for (const key of collectMatches(file.source, /\btr\(\s*'([^']+)'/g)) {
      keys.add(key);
    }
    for (const key of collectMatches(file.source, /\bI18n\??\.t\(\s*'([^']+)'/g)) {
      keys.add(key);
    }
    for (const key of collectMatches(file.source, /\btranslateMessage\(\s*'([^']+)'/g)) {
      keys.add(key);
    }
  }
  for (const key of keys) {
    assert.ok(key in I18n.messages.en, `missing script translation key: ${key}`);
  }
});
