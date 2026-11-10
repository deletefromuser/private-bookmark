import { chromium, type BrowserContext, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

const BUILD_DIR = path.resolve(__dirname, '..', '..', 'build');

/**
 * Derive the deterministic Chrome extension ID from the manifest's `key` field.
 *
 * Chrome computes the extension ID as:
 *   1. Decode the base64-encoded SubjectPublicKeyInfo (SPKI) public key.
 *   2. SHA-256 hash the DER bytes.
 *   3. Take the first 16 bytes of the hash.
 *   4. Map each nibble to a character: 0->'a', 1->'b', ..., 15->'p'.
 */
export function computeExtensionId(keyPem: string): string {
  const der = Buffer.from(keyPem, 'base64');
  const hash = crypto.createHash('sha256').update(der).digest();
  const nibbles = hash.subarray(0, 16);
  return Array.from(nibbles, byte => {
    const high = (byte >> 4) & 0xf;
    const low = byte & 0xf;
    return String.fromCharCode(97 + high) + String.fromCharCode(97 + low);
  }).join('');
}

/**
 * Read the extension ID from build/manifest.json using the embedded `key`.
 */
export function getExtensionId(): string {
  const manifestPath = path.join(BUILD_DIR, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!manifest.key) {
    throw new Error(
      'manifest.json is missing "key" field. A key is required for deterministic extension ID.'
    );
  }
  return computeExtensionId(manifest.key);
}

export interface ExtensionFixture {
  context: BrowserContext;
  extensionId: string;
}

/**
 * Launch Chromium with the unpacked extension loaded into a persistent profile.
 */
export async function launchWithExtension(): Promise<ExtensionFixture> {
  const extensionId = getExtensionId();
  const userDataDir = path.resolve(__dirname, '..', '..', '.playwright-user-data');
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    args: [
      `--disable-extensions-except=${BUILD_DIR}`,
      `--load-extension=${BUILD_DIR}`,
      '--allow-file-access-from-files',
    ],
  });

  // Wait for the extension's background service worker to initialize.
  const serviceWorkers = context.serviceWorkers();
  if (serviceWorkers.length === 0) {
    // Give it a moment to start up
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  return { context, extensionId };
}

/**
 * Build a chrome-extension:// URL for a given page path.
 */
export function extensionUrl(extensionId: string, pagePath: string): string {
  return `chrome-extension://${extensionId}/${pagePath}`;
}

/**
 * Unlock a password-protected extension page (view / history / sql console).
 */
export async function unlockPage(page: Page, password: string = ''): Promise<void> {
  await page.waitForSelector('#auth', { state: 'visible', timeout: 10000 });
  await page.fill('#pw', password);
  await page.click('#unlock');
  await page.waitForSelector('#content', { state: 'visible', timeout: 10000 });
}

/**
 * Open an extension page by asking the background service worker to create a
 * tab via chrome.tabs.create(). This works because the extension has the
 * "tabs" permission and chrome.tabs.create() can create tabs with
 * chrome-extension:// URLs (unlike page.goto() from a regular context).
 */
export async function openExtensionPage(
  context: BrowserContext,
  extensionId: string,
  pagePath: string,
): Promise<Page> {
  const serviceWorkers = context.serviceWorkers();
  if (serviceWorkers.length === 0) {
    throw new Error(
      'Extension service worker not found. The extension may not have loaded.'
    );
  }

  const url = extensionUrl(extensionId, pagePath);

  // Use chrome.tabs.create from the service worker context to open the page.
  await serviceWorkers[0].evaluate(targetUrl => {
    chrome.tabs.create({ url: targetUrl });
  }, url);

  // Wait for the new tab/page to open
  const [newPage] = await Promise.all([
    context.waitForEvent('page'),
    new Promise(resolve => setTimeout(resolve, 1000)),
  ]);

  await newPage.waitForLoadState({ timeout: 15000 });
  return newPage;
}
