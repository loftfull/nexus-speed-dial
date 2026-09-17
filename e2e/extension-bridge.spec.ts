import { chromium, expect, test, type BrowserContext } from '@playwright/test';
import { mkdtemp, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

let extensionDir = '';

async function prepareExtension() {
  const source = path.resolve('extension');
  const target = await mkdtemp(path.join(tmpdir(), 'nexus-extension-e2e-'));
  await Promise.all([
    copyFile(path.join(source, 'background.js'), path.join(target, 'background.js')),
    copyFile(path.join(source, 'originPolicy.js'), path.join(target, 'originPolicy.js')),
    copyFile(path.join(source, 'manifest.dev.json'), path.join(target, 'manifest.json')),
  ]);
  return target;
}

async function launchExtensionContext(): Promise<{ context: BrowserContext; extensionId: string }> {
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    args: [
      `--disable-extensions-except=${extensionDir}`,
      `--load-extension=${extensionDir}`,
    ],
  });

  let [serviceWorker] = context.serviceWorkers();
  if (!serviceWorker) serviceWorker = await context.waitForEvent('serviceworker');
  const extensionId = new URL(serviceWorker.url()).host;
  return { context, extensionId };
}

async function sendExternalMessage(page: import('@playwright/test').Page, extensionId: string, message: object) {
  return page.evaluate(({ id, payload }) => new Promise((resolve, reject) => {
    const runtime = (globalThis as typeof globalThis & {
      chrome?: {
        runtime?: {
          lastError?: { message?: string };
          sendMessage?: (extensionId: string, message: object, callback: (response?: unknown) => void) => void;
        };
      };
    }).chrome?.runtime;

    if (!runtime?.sendMessage) {
      reject(new Error('chrome.runtime.sendMessage is unavailable on the allowed web origin'));
      return;
    }

    runtime.sendMessage(id, payload, response => {
      const messageText = runtime.lastError?.message;
      if (messageText) {
        reject(new Error(messageText));
        return;
      }
      resolve(response);
    });
  }), { id: extensionId, payload: message });
}

test.describe('Nexus Workspace Bridge', () => {
  test.skip(({ }, testInfo) => testInfo.project.name !== 'desktop', 'Chromium extension E2E runs once on desktop.');

  test.beforeAll(async () => {
    extensionDir = await prepareExtension();
  });

  test.afterAll(async () => {
    if (extensionDir) await rm(extensionDir, { recursive: true, force: true });
  });

  test('allowed Nexus origin can ping the real MV3 service worker', async () => {
    const { context, extensionId } = await launchExtensionContext();
    try {
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:4173');
      const response = await sendExternalMessage(page, extensionId, {
        type: 'NEXUS_PING',
        requestId: 'e2e-ping',
      });
      expect(response).toEqual({ type: 'NEXUS_PONG', requestId: 'e2e-ping' });
    } finally {
      await context.close();
    }
  });

  test('allowed Nexus origin can request real open HTTP tabs', async () => {
    const { context, extensionId } = await launchExtensionContext();
    try {
      const requester = await context.newPage();
      const visibleTab = await context.newPage();
      await requester.goto('http://127.0.0.1:4173');
      await visibleTab.goto('http://127.0.0.1:4173/?bridge-probe=1');

      const response = await sendExternalMessage(requester, extensionId, {
        type: 'NEXUS_REQUEST_TABS',
        requestId: 'e2e-tabs',
      }) as { type?: string; requestId?: string; tabs?: Array<{ url?: string }> };

      expect(response.type).toBe('NEXUS_TABS_RESPONSE');
      expect(response.requestId).toBe('e2e-tabs');
      expect(response.tabs?.some(tab => tab.url === 'http://127.0.0.1:4173/?bridge-probe=1')).toBe(true);
    } finally {
      await context.close();
    }
  });
});
