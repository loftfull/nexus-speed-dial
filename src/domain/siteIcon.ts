export function faviconUrlFor(url: string): string {
  return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(url)}&sz=128`;
}

export function faviconProviders(url: string): string[] {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    if (!/^https?:$/.test(parsed.protocol) || !parsed.hostname || !parsed.hostname.includes('.')) return [];
    const encoded = encodeURIComponent(url);
    return [
      `https://www.google.com/s2/favicons?domain_url=${encoded}&sz=128`,
      `https://icons.duckduckgo.com/ip3/${parsed.hostname}.ico`,
      `https://icon.horse/icon/${parsed.hostname}`,
    ];
  } catch {
    return [];
  }
}
