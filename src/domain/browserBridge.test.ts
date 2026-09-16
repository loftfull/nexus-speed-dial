import { describe, expect, it } from 'vitest';
import type { SiteRecord } from './types';
import {
  checkBrowserExtension,
  isSupportedBrowserImportUrl,
  normalizeBrowserTabs,
  prepareBrowserImport,
  requestBrowserTabs,
  type BrowserRuntime,
} from './browserBridge';

const EXTENSION_ID = 'abcdefghijklmnopabcdefghijklmnop';

function site(overrides: Partial<SiteRecord> = {}): SiteRecord {
  return {
    title: 'GitHub',
    desc: 'Код',
    domain: 'github.com',
    color: '#24292f',
    icon: 'G',
    category: 'Работа',
    ...overrides,
  };
}

describe('browserBridge', () => {
  it('normalizes browser tabs and removes duplicate URLs', () => {
    const tabs = normalizeBrowserTabs([
      { id: 1, windowId: 1, title: 'Example', url: 'https://example.com/a', active: true, pinned: false, index: 0 },
      { id: 2, windowId: 1, title: 'Duplicate', url: 'https://example.com/a', active: false, pinned: false, index: 1 },
      { id: 3, windowId: 1, title: 'FTP', url: 'ftp://files.example.com/pub', active: false, pinned: false, index: 2 },
      { id: 4, windowId: 1, title: 'Chrome settings', url: 'chrome://settings', active: false, pinned: false, index: 3 },
      { id: 5, windowId: 1, title: 'Broken', url: 'not a url', active: false, pinned: false, index: 4 },
    ]);

    expect(tabs.map(tab => tab.url)).toEqual([
      'https://example.com/a',
      'ftp://files.example.com/pub',
    ]);
    expect(isSupportedBrowserImportUrl(tabs[0].url)).toBe(true);
    expect(isSupportedBrowserImportUrl(tabs[1].url)).toBe(false);
  });

  it('reuses existing domains, collapses multiple pages from one domain and keeps site titles unique', () => {
    const plan = prepareBrowserImport([
      { id: 1, windowId: 1, title: 'GitHub issue', url: 'https://github.com/loftfull/nexus-speed-dial/issues/1', active: false, pinned: false, index: 0 },
      { id: 2, windowId: 1, title: 'GitHub', url: 'https://example.com/a', active: false, pinned: false, index: 1 },
      { id: 3, windowId: 1, title: 'Second page', url: 'https://example.com/b', active: false, pinned: false, index: 2 },
      { id: 4, windowId: 1, title: 'FTP', url: 'ftp://files.example.com/pub', active: false, pinned: false, index: 3 },
    ], [site()]);

    expect(plan.newSites).toHaveLength(1);
    expect(plan.newSites[0]).toMatchObject({ title: 'GitHub (2)', domain: 'example.com' });
    expect(plan.siteIds).toEqual(['GitHub', 'GitHub (2)']);
    expect(plan.existingDomainMatches).toBe(1);
    expect(plan.collapsedTabCount).toBe(1);
    expect(plan.unsupportedCount).toBe(1);
  });

  it('checks the extension with an explicit ping request', async () => {
    const runtime: BrowserRuntime = {
      sendMessage: (_extensionId, message, callback) => callback({
        type: 'NEXUS_PONG',
        requestId: message.requestId,
      }),
    };

    await expect(checkBrowserExtension(EXTENSION_ID, runtime)).resolves.toBeUndefined();
  });

  it('rejects a ping response that contains an extension error', async () => {
    const runtime: BrowserRuntime = {
      sendMessage: (_extensionId, message, callback) => callback({
        type: 'NEXUS_PONG',
        requestId: message.requestId,
        error: 'Origin is not allowed',
      }),
    };

    await expect(checkBrowserExtension(EXTENSION_ID, runtime)).rejects.toThrow('Origin is not allowed');
  });

  it('requests and validates an open-tabs response', async () => {
    const runtime: BrowserRuntime = {
      sendMessage: (_extensionId, message, callback) => callback({
        type: 'NEXUS_TABS_RESPONSE',
        requestId: message.requestId,
        tabs: [
          { id: 1, windowId: 1, title: 'Example', url: 'https://example.com', active: true, pinned: false, index: 0 },
        ],
      }),
    };

    await expect(requestBrowserTabs(EXTENSION_ID, runtime)).resolves.toEqual([
      expect.objectContaining({ title: 'Example', url: 'https://example.com/' }),
    ]);
  });
});
