import { describe, expect, it } from 'vitest';
import { isAllowedNexusSenderUrl } from './originPolicy.js';

describe('extension origin policy', () => {
  it('allows local Nexus development origins with arbitrary ports', () => {
    expect(isAllowedNexusSenderUrl('http://localhost:4173/')).toBe(true);
    expect(isAllowedNexusSenderUrl('http://127.0.0.1:5173/settings')).toBe(true);
    expect(isAllowedNexusSenderUrl('https://localhost:8443/')).toBe(true);
  });

  it('allows the known hosted Nexus production path', () => {
    expect(isAllowedNexusSenderUrl('https://loftfull.github.io/nexus-speed-dial/')).toBe(true);
    expect(isAllowedNexusSenderUrl('https://loftfull.github.io/nexus-speed-dial/settings')).toBe(true);
  });

  it('rejects wildcard preview hosts, lookalikes, insecure remote and non-web origins', () => {
    expect(isAllowedNexusSenderUrl('https://demo.e2b.app/')).toBe(false);
    expect(isAllowedNexusSenderUrl('https://evil-e2b.app/')).toBe(false);
    expect(isAllowedNexusSenderUrl('https://e2b.app.evil.example/')).toBe(false);
    expect(isAllowedNexusSenderUrl('https://loftfull.github.io/another-project/')).toBe(false);
    expect(isAllowedNexusSenderUrl('http://loftfull.github.io/nexus-speed-dial/')).toBe(false);
    expect(isAllowedNexusSenderUrl('chrome-extension://abcdefghijklmnopabcdefghijklmnop/')).toBe(false);
    expect(isAllowedNexusSenderUrl('not a url')).toBe(false);
  });
});
