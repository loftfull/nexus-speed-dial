import { describe, expect, it } from 'vitest';
import { seedSites } from './seed';

describe('first-run seed content', () => {
  it('does not pretend to have live unread notification counts', () => {
    expect(seedSites.filter(site => 'badge' in site)).toEqual([]);
  });
});
