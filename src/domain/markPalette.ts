/**
 * Подложка марки сайта.
 *
 * Плоский цветной квадрат с буквой выглядит дёшево, поэтому подложка — это
 * всегда мягкий градиент с внутренним бликом. Цвет берётся из выбранного для
 * сайта, а если его нет — выводится из домена, чтобы один и тот же сайт всегда
 * получал один и тот же оттенок.
 */

export type MarkPalette = { from: string; to: string; ink: string; glow: string };

/** Устойчивое число из строки. Одна строка — всегда один и тот же результат. */
export function hashHue(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 360_000;
  }
  return hash % 360;
}

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Переводит #rgb или #rrggbb в три канала 0…255. */
export function toRgb(hex: string): [number, number, number] | null {
  const match = HEX.exec(hex.trim());
  if (!match) return null;
  let body = match[1];
  if (body.length === 3) body = body.split('').map(char => char + char).join('');
  return [0, 2, 4].map(at => parseInt(body.slice(at, at + 2), 16)) as [number, number, number];
}

/** Относительная яркость по WCAG: нужна, чтобы выбрать цвет буквы. */
export function luminance([red, green, blue]: [number, number, number]): number {
  const channel = (value: number) => {
    const part = value / 255;
    return part <= 0.03928 ? part / 12.92 : ((part + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

function shift([red, green, blue]: [number, number, number], amount: number): string {
  const move = (value: number) => Math.max(0, Math.min(255, Math.round(value + amount)));
  return `rgb(${move(red)}, ${move(green)}, ${move(blue)})`;
}

/**
 * Палитра подложки. `color` — цвет, выбранный для сайта; если он не задан или
 * записан не шестнадцатеричным числом, оттенок выводится из домена.
 */
export function markPalette(domain: string, color?: string): MarkPalette {
  const rgb = color ? toRgb(color) : null;
  if (rgb) {
    const light = luminance(rgb);
    return {
      from: shift(rgb, 26),
      to: shift(rgb, -22),
      ink: light > 0.55 ? 'rgba(16,22,32,.86)' : '#ffffff',
      glow: `rgba(${rgb.join(',')},.34)`,
    };
  }
  const hue = hashHue(domain || 'nexus');
  return {
    from: `hsl(${hue} 68% 60%)`,
    to: `hsl(${(hue + 26) % 360} 64% 46%)`,
    ink: '#ffffff',
    glow: `hsl(${hue} 64% 52% / .34)`,
  };
}

/** Подложка под фирменный знак: тот же цвет, но приглушённый до плитки. */
export function brandPlate(hex: string): MarkPalette {
  const rgb = toRgb(hex) ?? [120, 130, 150];
  return {
    from: `color-mix(in srgb, rgb(${rgb.join(',')}) 16%, #ffffff)`,
    to: `color-mix(in srgb, rgb(${rgb.join(',')}) 26%, #ffffff)`,
    ink: luminance(rgb) > 0.55 ? 'rgba(16,22,32,.86)' : '#ffffff',
    glow: `rgba(${rgb.join(',')},.28)`,
  };
}
