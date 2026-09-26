import React, { useEffect, useMemo, useRef, useState } from 'react';
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

  // Пока указатель не пришёл, запасные адреса не строятся вовсе. Иначе первый
  // же кадр уходил запросом на сам сайт — даже когда знак лежит рядом, в
  // собранном наборе: открытие вкладки сообщало девяти чужим серверам, что
  // пользователь её открыл, и локальные знаки вставали в очередь за этими
  // запросами. Указатель локальный и приходит быстро, а при ошибке сети он
  // отдаётся пустым — значит запасной уровень всё равно включается.
  const candidates = useMemo(
    () => (logos && index ? siteIconCandidates(domain) : []),
    [logos, index, domain],
  );
  const [step, setStep] = useState(0);
  const [loaded, setLoaded] = useState(false);
  // Файл знака может не отдаться — например, в урезанной сборке предпросмотра.
  // Тогда знак отбрасывается и работают следующие уровни, а не монограмма сразу.
  const [brandFailed, setBrandFailed] = useState(false);
  useEffect(() => { setStep(0); setLoaded(false); setBrandFailed(false); }, [domain, logos, brand?.slug]);

  const imageRef = useRef<HTMLImageElement | null>(null);

  const mark = brandFailed ? null : brand;
  const palette = mark ? brandPlate(mark.hex) : markPalette(domain, color);
  const source = mark ? brandMarkUrl(mark.slug) : candidates[step];
  const failImage = () => {
    setLoaded(false);
    if (mark) { setBrandFailed(true); return; }
    setStep(value => value + 1);
  };

  /**
   * Готовность картинки нельзя выводить из одного события load: его можно не
   * успеть поймать. Файл знака лежит рядом с приложением и отдаётся мгновенно,
   * поэтому загрузка успевает завершиться раньше, чем обработчик навешен, —
   * и марка навсегда остаётся буквой при полностью загруженной картинке.
   * Проверка по элементу в момент монтирования закрывала только половину
   * случая: если в этот миг картинка ещё не готова, а событие потом потеряно,
   * состояние снова застревает. Так и вышло на WebKit после того, как рядом
   * появились файлы гарнитур и порядок загрузки сместился.
   *
   * Поэтому готовность спрашивается у самого изображения: decode() разрешается,
   * когда картинка раскодирована и годна к показу, и отвергается при неудаче —
   * независимо от того, поймано событие или нет.
   */
  useEffect(() => {
    const node = imageRef.current;
    if (!node || !source || loaded) return;
    let alive = true;
    // Эффект ловит только пропущенный успех. Неудачу он не объявляет: для неё
    // есть onError и отказ decode(), а вот пара «complete истинно, ширина
    // нулевая» бывает и у картинки, которая просто не начинала грузиться, —
    // в jsdom так выглядит любой <img> без src. Эта ветка однажды и увела
    // знак не туда: прогон 323 показал, что после ошибки адрес остался
    // прежним, хотя должен был перейти на запасной. Воспроизвести падение
    // на месте не удалось, поэтому неоднозначная ветка снята целиком, а не
    // подправлена наугад.
    const succeed = () => { if (alive && node.complete && node.naturalWidth > 0) setLoaded(true); };
    succeed();
    node.decode?.().then(succeed, () => { if (alive) failImage(); });
    return () => { alive = false; };
    // failImage пересоздаётся каждый раз и в зависимости не годится: она
    // читает только mark, а он меняется вместе с source.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, loaded]);

  const style = {
    '--nx-mark-from': palette.from,
    '--nx-mark-to': palette.to,
    '--nx-mark-ink': palette.ink,
    '--nx-mark-glow': palette.glow,
  } as React.CSSProperties;

  return (
    <span className={className + (mark ? ' brand' : '') + (loaded ? ' filled' : '')} style={style} aria-hidden="true">
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
          ref={imageRef}
          onLoad={() => setLoaded(true)}
          // Не загрузилось — пробуем следующий адрес, а когда они кончились,
          // остаётся монограмма: битая картинка на экран не попадает никогда.
          onError={failImage}
        />
      )}
      {!loaded && <span className="nx-mark-text">{monogram(title)}</span>}
    </span>
  );
}
