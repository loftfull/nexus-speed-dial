/**
 * Собирает фирменные знаки сайтов из пакета simple-icons.
 *
 * На выходе два артефакта в public/brands:
 *   index.txt   — компактный указатель «домен → знак», грузится один раз лениво;
 *   <slug>.svg  — сам знак; браузер забирает только те, что показаны на экране.
 *
 * Знаки распространяются по CC0-1.0, но сами логотипы остаются товарными
 * знаками владельцев: они используются здесь только чтобы обозначить ссылку
 * на соответствующий сайт. Подробности — node_modules/simple-icons/DISCLAIMER.md.
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const icons = require('simple-icons');

const OUT = path.resolve('public/brands');

/** Поддомены документации и пресс-центров ведут на тот же бренд. */
const SERVICE_PREFIX = /^(www|developer|developers|about|brand|branding|design|help|support|docs|press|newsroom|partner|partners|business|company|corporate|static|assets|media|my|app|web|get|info)\./;

function hostOf(source) {
  try {
    let host = new URL(source).hostname.toLowerCase();
    while (SERVICE_PREFIX.test(host)) host = host.replace(SERVICE_PREFIX, '');
    return host.includes('.') ? host : '';
  } catch {
    return '';
  }
}

/**
 * Домены, которые не выводятся из адреса бренд-ресурса.
 * Список ручной и намеренно короткий: сюда попадает только то, что реально
 * встречается в закладках и что автоматика определяет неверно.
 */
const EXTRA = {
  // Знаков Яндекса, LinkedIn, Microsoft, Amazon, Сбера, Т-Банка, Ozon,
  // Wildberries, Avito, Stepik, Rutube, Дзена и Canva в наборе нет: владельцы
  // просили их убрать. Для таких сайтов работают следующие уровни — иконка с
  // самого сайта, а затем монограмма.
  youtube: ['youtube.com', 'youtu.be', 'm.youtube.com', 'music.youtube.com'],
  google: ['google.com', 'google.ru', 'www.google.com'],
  googledrive: ['drive.google.com'],
  googledocs: ['docs.google.com'],
  googlesheets: ['sheets.google.com'],
  googlemaps: ['maps.google.com'],
  gmail: ['mail.google.com', 'gmail.com'],
  googlecalendar: ['calendar.google.com'],
  googlephotos: ['photos.google.com'],
  googletranslate: ['translate.google.com'],
  youtubemusic: ['music.youtube.com'],
  whatsapp: ['whatsapp.com', 'web.whatsapp.com'],
  telegram: ['telegram.org', 'web.telegram.org', 't.me'],
  spotify: ['spotify.com', 'open.spotify.com'],
  vk: ['vk.com', 'vk.ru'],
  notion: ['notion.so', 'notion.com'],
  figma: ['figma.com'],
  github: ['github.com', 'gist.github.com'],
  gitlab: ['gitlab.com'],
  x: ['x.com', 'twitter.com'],
  instagram: ['instagram.com'],
  facebook: ['facebook.com', 'fb.com'],
  reddit: ['reddit.com'],
  wikipedia: ['wikipedia.org', 'ru.wikipedia.org', 'en.wikipedia.org'],
  stackoverflow: ['stackoverflow.com'],
  claude: ['claude.ai'],
  anthropic: ['anthropic.com'],
  netflix: ['netflix.com'],
  twitch: ['twitch.tv'],
  discord: ['discord.com', 'discord.gg'],
  trello: ['trello.com'],
  dribbble: ['dribbble.com'],
  behance: ['behance.net'],
  pinterest: ['pinterest.com', 'pinterest.ru'],
  aliexpress: ['aliexpress.com', 'aliexpress.ru'],
  coursera: ['coursera.org'],
  duolingo: ['duolingo.com'],
  habr: ['habr.com'],
  kinopoisk: ['kinopoisk.ru'],
  maildotru: ['mail.ru'],
  apple: ['apple.com'],
  obsidian: ['obsidian.md'],
  miro: ['miro.com'],
  vercel: ['vercel.com'],
  cloudflare: ['cloudflare.com'],
  npm: ['npmjs.com'],
  medium: ['medium.com'],
  substack: ['substack.com'],
  soundcloud: ['soundcloud.com'],
  deezer: ['deezer.com'],
  imdb: ['imdb.com'],
  bookingdotcom: ['booking.com'],
  airbnb: ['airbnb.com'],
  aeroflot: ['aeroflot.ru'],
  paypal: ['paypal.com'],
  stripe: ['stripe.com'],
};

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const byDomain = new Map();
  const used = new Map();

  const claim = (domain, icon) => {
    if (!domain || byDomain.has(domain)) return;
    byDomain.set(domain, icon.slug);
    used.set(icon.slug, icon);
  };

  const list = Object.values(icons).filter(icon => icon && icon.path && icon.slug);

  // Ручной список идёт первым: он побеждает автоматические догадки.
  for (const icon of list) for (const domain of EXTRA[icon.slug] ?? []) claim(domain, icon);
  for (const icon of list) claim(hostOf(icon.source), icon);
  for (const icon of list) if (/^[a-z0-9]+$/.test(icon.slug)) claim(`${icon.slug}.com`, icon);

  const files = [];
  for (const [slug, icon] of used) {
    files.push(writeFile(
      path.join(OUT, `${slug}.svg`),
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#${icon.hex}">`
      + `<title>${icon.title.replace(/[<>&]/g, '')}</title><path d="${icon.path}"/></svg>\n`,
    ));
  }
  await Promise.all(files);

  // Формат строки: домен<таб>знак<таб>цвет. Разбирается в одну строку кода.
  const lines = [...byDomain.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([domain, slug]) => `${domain}\t${slug}\t${used.get(slug).hex}`);
  await writeFile(path.join(OUT, 'index.txt'), lines.join('\n') + '\n');

  const bytes = lines.reduce((sum, line) => sum + line.length + 1, 0);
  console.log(`Фирменные знаки: ${used.size} файлов, ${byDomain.size} доменов, указатель ${(bytes / 1024).toFixed(0)} КБ`);

  // Набор simple-icons меняется от версии к версии: часть знаков удаляют по
  // просьбе владельцев. Печатаем ручные записи, для которых знака больше нет,
  // чтобы список не превращался в молчаливую ложь.
  const known = new Set(list.map(icon => icon.slug));
  const missing = Object.keys(EXTRA).filter(slug => !known.has(slug));
  if (missing.length) console.log(`Нет знака для ручных записей: ${missing.join(', ')}`);
}

main();
