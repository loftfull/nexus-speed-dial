const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);
const PRODUCTION_HOST = 'loftfull.github.io';
const PRODUCTION_PATH = '/nexus-speed-dial';

export function isAllowedNexusSenderUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if ((url.protocol === 'http:' || url.protocol === 'https:') && LOCAL_HOSTS.has(url.hostname)) {
    return true;
  }

  if (url.protocol !== 'https:' || url.hostname !== PRODUCTION_HOST) {
    return false;
  }

  return url.pathname === PRODUCTION_PATH || url.pathname.startsWith(`${PRODUCTION_PATH}/`);
}
