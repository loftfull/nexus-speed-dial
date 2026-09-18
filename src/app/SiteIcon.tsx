import React, { useEffect, useMemo, useState } from 'react';
import { loadBrandIndex, lookupBrand, brandMarkUrl, siteIconCandidates, type BrandIndex } from '../domain/brandMark';
import { brandPlate, markPalette } from '../domain/markPalette';

/** Монограмма: одна буква для одного слова, две — для составного названия. */
export function monogram(title: string): string {
  const words = title.trim().split(/[\s_.\-—]+/).filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Один общий указатель на всё приложение. Хук держит его в состоянии, чтобы
 * плитки перерисовались, как только он подгрузится.
 */
function useBrandIndex(): BrandIndex | null {
  const [index, setIndex] = useState<BrandIndex | null>(null);
  useEffect(() => {
    let alive = true;
    loadBrandIndex().then(value => { if (alive) setIndex(value); });
    return () => { alive = false; };
  }, []);
  return index;
}

export type SiteIconProps = {
  title: string;
  domain: string;
  /** Цвет, выбранный для сайта в форме добавления. */
  color?: string;
  /**
   * Показывать ли логотипы вообще. Выключено — остаётся монограмма, и ни
   * фирменный знак, ни запрос к сайту не используются.
   */
  logos?: boolean;
  className?: string;
};

/**
 * Марка сайта в трёх уровнях, от лучшего к запасному:
 *
 * 1. векторный фирменный знак из собранного набора — чёткий на любом размере,
 *    не требует сети и ничего никому не сообщает;
 * 2. иконка с самого сайта, начиная с крупного apple-touch-icon;
 * 3. монограмма на градиентной подложке.
 */
export function SiteIcon({ title, domain, color, logos = true, className = 'nx-mark' }: SiteIconProps) {
  const index = useBrandIndex();
  const brand = useMemo(() => (logos && index ? lookupBrand(index, domain) : null), [logos, index, domain]);

  const candidates = useMemo(() => (logos ? siteIconCandidates(domain) : []), [logos, domain]);
  const [step, setStep] = useState(0);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setStep(0); setLoaded(false); }, [domain, logos, brand?.slug]);

  const palette = brand ? brandPlate(brand.hex) : markPalette(domain, color);
  const source = brand ? brandMarkUrl(brand.slug) : candidates[step];
  const style = {
    '--nx-mark-from': palette.from,
    '--nx-mark-to': palette.to,
    '--nx-mark-ink': palette.ink,
    '--nx-mark-glow': palette.glow,
  } as React.CSSProperties;

  return (
    <span className={className + (brand ? ' brand' : '') + (loaded ? ' filled' : '')} style={style} aria-hidden="true">
      {source && (
        <img
          key={source}
          src={source}
          alt=""
          decoding="async"
          // Картинку нельзя прятать через display:none — браузер тогда её просто
          // не загружает, и на плитке навсегда остаётся буква. Поэтому пока
          // изображение не готово, оно прозрачное, но всё равно загружается.
          className={loaded ? 'ready' : ''}
          onLoad={() => setLoaded(true)}
          // Не загрузилось — пробуем следующий адрес, а когда они кончились,
          // остаётся монограмма: битая картинка на экран не попадает никогда.
          onError={() => { setLoaded(false); setStep(value => value + 1); }}
        />
      )}
      {!loaded && <span className="nx-mark-text">{monogram(title)}</span>}
    </span>
  );
}
