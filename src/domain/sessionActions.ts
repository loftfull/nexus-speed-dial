import type { BrowserSession, SiteRecord } from './types';
import { resolveSiteUrl } from './siteOpen';

export type SessionRestoreItem = {
  site: SiteRecord;
  url: string;
};

function resolveSessionSite(reference: string, sites: SiteRecord[]): SiteRecord | undefined {
  return sites.find(site =>
    site.id === reference || site.domain === reference || site.title === reference,
  );
}

export function createSessionRestorePlan(
  session: BrowserSession,
  sites: SiteRecord[],
): SessionRestoreItem[] {
  return session.siteIds.flatMap(reference => {
    const site = resolveSessionSite(reference, sites);
    return site ? [{ site, url: resolveSiteUrl(site) }] : [];
  });
}
