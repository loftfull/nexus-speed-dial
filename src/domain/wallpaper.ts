/**
 * Своё изображение фоном.
 *
 * Картинка живёт в отдельном ключе хранилища, а не внутри настроек
 * оформления: иначе она попадала бы в каждый экспорт резервной копии и
 * раздувала бы файл на сотни килобайт при том, что восстанавливать обои на
 * другой машине никто не просил.
 *
 * Перед сохранением снимок уменьшается: исходный файл с телефона легко
 * весит 6 МБ, а в localStorage помещается около пяти на всё приложение.
 */

import { browserStorage, readStorage, writeStorage, type StorageAdapter } from './storage';

export const WALLPAPER_KEY = 'nexus-wallpaper';

/** Во сколько раз ужать, чтобы длинная сторона не превышала предела. */
export function fitWithin(width: number, height: number, max: number): [number, number] {
  const longest = Math.max(width, height);
  if (longest <= max || longest === 0) return [Math.round(width), Math.round(height)];
  const scale = max / longest;
  return [Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale))];
}

/** Длина data-URL в байтах: base64 несёт 3 байта на каждые 4 символа. */
export function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return 0;
  const body = dataUrl.slice(comma + 1);
  const padding = body.endsWith('==') ? 2 : body.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((body.length * 3) / 4) - padding);
}

export type ShrinkOptions = { maxSide?: number; quality?: number; budgetBytes?: number };

/**
 * Уменьшает изображение до разумного размера и отдаёт data-URL.
 *
 * Если после первого прохода снимок всё ещё не влезает в отведённый бюджет,
 * качество и сторона понижаются ещё дважды — лучше чуть более мягкая
 * картинка, чем отказ сохранить выбранные пользователем обои.
 */
export async function shrinkImage(file: Blob, options: ShrinkOptions = {}): Promise<string> {
  const { maxSide = 2200, quality = 0.76, budgetBytes = 900_000 } = options;
  const bitmap = await loadBitmap(file);
  let side = maxSide;
  let grade = quality;
  let best = '';
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const [width, height] = fitWithin(bitmap.width, bitmap.height, side);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('canvas недоступен');
    context.drawImage(bitmap as CanvasImageSource, 0, 0, width, height);
    best = canvas.toDataURL('image/jpeg', grade);
    if (dataUrlBytes(best) <= budgetBytes) break;
    side = Math.round(side * 0.72);
    grade = Math.max(0.5, grade - 0.1);
  }
  return best;
}

type Sized = { width: number; height: number };

async function loadBitmap(file: Blob): Promise<Sized> {
  if (typeof createImageBitmap === 'function') return createImageBitmap(file);
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('не удалось прочитать изображение')); };
    image.src = url;
  });
}

/** Значение для css-переменной: пустая строка, если обоев нет. */
export function wallpaperVar(dataUrl: string | null): string {
  return dataUrl ? `url("${dataUrl}")` : '';
}

/**
 * Чтение, запись и применение обоев держатся здесь, а не в компоненте: обои
 * ставятся из настроек, а применяются к корню документа, и без общего места
 * это превратилось бы в проброс строки на полмегабайта через всё дерево.
 */
export function readWallpaperPhoto(storage: StorageAdapter = browserStorage): string | null {
  const value = readStorage<string | null>(WALLPAPER_KEY, null, storage);
  return typeof value === 'string' && value.startsWith('data:image/') ? value : null;
}

export function applyWallpaperPhoto(dataUrl: string | null, root?: HTMLElement): void {
  const target = root ?? (typeof document === 'undefined' ? null : document.documentElement);
  if (!target) return;
  const value = wallpaperVar(dataUrl);
  if (value) target.style.setProperty('--nx-wall-photo', value);
  else target.style.removeProperty('--nx-wall-photo');
}

/** Возвращает false, когда снимок не поместился в хранилище. */
export function saveWallpaperPhoto(dataUrl: string | null, storage: StorageAdapter = browserStorage): boolean {
  if (dataUrl === null) {
    try { storage.removeItem(WALLPAPER_KEY); } catch { /* хранилище недоступно — обои просто не сохранятся */ }
    applyWallpaperPhoto(null);
    return true;
  }
  const stored = writeStorage(WALLPAPER_KEY, dataUrl, storage);
  if (stored) applyWallpaperPhoto(dataUrl);
  return stored;
}
