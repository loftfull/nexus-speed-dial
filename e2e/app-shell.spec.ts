import { test, expect, type Page, type TestInfo } from '@playwright/test';

/**
 * Разделы живут в боковой панели на широком экране и в выдвижном листе на
 * узком. Помощник прячет эту разницу, чтобы проверки говорили о поведении,
 * а не о том, где сейчас нарисована кнопка.
 */
async function openSection(page: Page, info: TestInfo, name: string) {
  if (info.project.name !== 'mobile') {
    await page.locator('.nx-nav').getByRole('button', { name, exact: true }).click();
    return;
  }
  await page.getByRole('button', { name: 'Разделы' }).click();
  await page.locator('.mobile-sections-card').getByRole('button', { name, exact: true }).click();
}

/** Кнопка вызова поиска: в верхней строке на широком, в шапке на узком. */
function paletteButton(page: Page, info: TestInfo) {
  const host = info.project.name !== 'mobile' ? '.nx-topbar' : '.nx-mobile-top';
  return page.locator(host).getByRole('button', { name: 'Поиск и команды' });
}

test.describe('Nexus shell', () => {
  test('shows the project grid and can open the add-site form', async ({ page }, testInfo) => {
    await page.goto('/');
    const shown = await page.locator('.nx-tile').count();
    expect(shown).toBeGreaterThan(0);
    // Счётчик стоит в заголовке содержимого, а он живёт только на широком
    // экране: на телефоне эта строка стоила бы одной плитки первого экрана.
    if (testInfo.project.name !== 'mobile') {
      await expect(page.locator('.nx-content-title p')).toContainText(String(shown));
    }

    await page.getByRole('button', { name: 'Добавить сайт' }).first().click();
    await expect(page.getByRole('heading', { name: 'Добавить сайт' })).toBeVisible();
  });

  test('keeps the exact destination after add, reload and open', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Exact destination persistence is covered once in Chromium desktop.');

    await page.addInitScript(() => {
      Object.defineProperty(window, 'open', {
        configurable: true,
        writable: true,
        value: (...args: unknown[]) => {
          (window as typeof window & { __nexusLastOpen?: unknown[] }).__nexusLastOpen = args;
          return null;
        },
      });
    });

    await page.goto('/');
    await page.getByRole('button', { name: 'Добавить сайт' }).first().click();
    await page.getByLabel('Название').fill('GitHub issue 123');
    await page.getByLabel('Адрес сайта').fill('https://github.com/openai/openai/issues/123?tab=readme#top');
    await page.locator('.site-form').getByRole('button', { name: 'Добавить сайт' }).click();

    const destination = 'https://github.com/openai/openai/issues/123?tab=readme#top';
    await expect.poll(() => page.evaluate(title => {
      const sites = JSON.parse(localStorage.getItem('nexus-sites') || '[]') as Array<{ title?: string; url?: string }>;
      return sites.find(site => site.title === title)?.url;
    }, 'GitHub issue 123')).toBe(destination);

    await page.reload();
    await page.getByRole('button', { name: 'Открыть «GitHub issue 123»' }).click();
    const opened = await page.evaluate(() => (window as typeof window & { __nexusLastOpen?: unknown[] }).__nexusLastOpen);
    expect(opened?.[0]).toBe(destination);
  });

  test('a pending site icon is invisible but still loads', async ({ page }) => {
    await page.goto('/');
    const mark = page.locator('.nx-mark').first();
    await expect(mark).toBeVisible();
    // Прятать незагруженную картинку через display:none нельзя: браузер тогда
    // её не загружает и на плитке навсегда остаётся буква. Она должна быть
    // прозрачной, но оставаться в раскладке.
    const probe = await mark.evaluate(element => {
      const image = document.createElement('img');
      element.appendChild(image);
      const style = getComputedStyle(image);
      const value = { display: style.display, opacity: style.opacity };
      image.remove();
      return value;
    });
    expect(probe.display).not.toBe('none');
    expect(probe.opacity).toBe('0');
  });

  test('tiles carry real brand marks, not letters', async ({ page }) => {
    // Иконки с самих сайтов отключаем: знак обязан найтись локально, иначе
    // проверка прошла бы за счёт сети и скрыла бы неверный путь к набору.
    await page.route('https://**', route => route.abort());
    await page.goto('/');

    // Набор отдаётся рядом с приложением и по базовому пути сборки.
    const index = await page.evaluate(async () => {
      // Относительно самой страницы: так адрес верен и в корне, и в подкаталоге.
      const response = await fetch(new URL('brands/index.txt', location.href));
      const text = await response.text();
      return { status: response.status, size: text.length, looksLikeIndex: text.includes('\t') };
    });
    expect(index.status, 'указатель фирменных знаков должен отдаваться').toBe(200);
    // Подстраховка от подмены на index.html, который сервер отдаёт на неизвестный путь.
    expect(index.looksLikeIndex, 'по адресу должен лежать указатель, а не страница').toBe(true);
    expect(index.size).toBeGreaterThan(10_000);

    await expect(page.locator('.nx-main .nx-mark.brand img.ready').first()).toBeVisible();
    const marks = await page.locator('.nx-main .nx-tile .nx-mark').evaluateAll(nodes => nodes.map(node => {
      const image = node.querySelector('img');
      return { brand: node.classList.contains('brand'), src: image?.getAttribute('src') ?? null };
    }));
    // Адрес зависит от базового пути сборки, поэтому сверяем по хвосту, а не по корню.
    const branded = marks.filter(mark => mark.brand && /\/brands\/[a-z0-9.-]+\.svg$/.test(mark.src ?? ''));
    // Большинство известных сайтов получает свой векторный знак.
    expect(branded.length).toBeGreaterThanOrEqual(Math.ceil(marks.length / 2));
  });

  test('a site without a brand mark still gets a designed plate', async ({ page }) => {
    await page.route('https://**', route => route.abort());
    await page.goto('/');
    const plain = page.locator('.nx-main .nx-tile .nx-mark:not(.brand)').first();
    if (await plain.count() === 0) test.skip(true, 'Все сайты этого проекта получили фирменный знак.');
    // Подложка — градиент, а не плоская заливка.
    const style = await plain.evaluate(node => {
      const computed = getComputedStyle(node);
      return { image: computed.backgroundImage, shadow: computed.boxShadow };
    });
    expect(style.image).toContain('gradient');
    expect(style.shadow).not.toBe('none');
    // На плите либо загруженная иконка сайта, либо монограмма — но не пустота.
    await expect.poll(() => plain.evaluate(node => {
      const image = node.querySelector('img');
      const text = node.querySelector('.nx-mark-text')?.textContent?.trim() ?? '';
      return (image?.classList.contains('ready') ?? false) || text.length > 0;
    })).toBe(true);
  });

  test('the add-site dialog is a centred card and closes with Escape', async ({ page }) => {
    await page.goto('/');
    await page.locator('.nx-dock').getByRole('button', { name: 'Добавить сайт' }).click();
    const form = page.locator('.site-form');
    await expect(form).toBeVisible();

    // It is a card, not a full-width band: its layout lived in a stylesheet that
    // was deleted once already, and nothing noticed.
    const viewport = page.viewportSize()!;
    const box = (await form.boundingBox())!;
    expect(box.width).toBeLessThanOrEqual(520);
    expect(box.x).toBeGreaterThanOrEqual(8);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width - 8);
    expect(await form.evaluate(el => getComputedStyle(el).boxShadow)).not.toBe('none');

    await page.keyboard.press('Escape');
    await expect(form).toHaveCount(0);
  });

  test('category tabs scope the grid and switch between all sites and groups', async ({ page }, testInfo) => {
    await page.goto('/');
    const tabs = page.locator('.nx-carousel-row');
    await expect(tabs.getByRole('button', { name: 'Все' })).toHaveAttribute('aria-current', 'true');

    const all = await page.locator('.nx-tile').count();
    await tabs.getByRole('button', { name: 'Соцсети' }).click();
    await expect(page.locator('.nx-carousel-row').getByRole('button', { name: 'Соцсети' })).toHaveAttribute('aria-current', 'true');
    const scoped = await page.locator('.nx-tile').count();
    expect(scoped).toBeGreaterThan(0);
    expect(scoped).toBeLessThan(all);
    await expect(page.locator('.nx-group')).toHaveCount(0);

    test.skip(testInfo.project.name === 'mobile', 'Сегмент вида живёт в заголовке содержимого на широком экране.');
    await page.getByRole('button', { name: 'По группам' }).click();
    const blocks = page.locator('.nx-group');
    expect(await blocks.count()).toBeGreaterThan(1);
    expect(await page.locator('.nx-group .nx-tile').count()).toBe(scoped);

    // The chosen view mode survives a reload.
    await page.reload();
    await expect(page.locator('.nx-group').first()).toBeVisible();
  });

  test('a tile opens in a new tab and lands in the recent section', async ({ page }, testInfo) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'open', {
        configurable: true,
        writable: true,
        value: (...args: unknown[]) => {
          (window as typeof window & { __nexusLastOpen?: unknown[] }).__nexusLastOpen = args;
          return null;
        },
      });
    });
    await page.goto('/');

    // Sections that carry no product behaviour are not offered anywhere.
    await expect(page.getByRole('button', { name: 'Загрузки' })).toHaveCount(0);

    const first = page.locator('.nx-tile').first();
    const title = (await first.locator('.nx-tile-name').textContent())?.trim();
    expect(title).toBeTruthy();
    await first.getByRole('button', { name: `Открыть «${title}»` }).click();

    const opened = await page.evaluate(() => (window as typeof window & { __nexusLastOpen?: unknown[] }).__nexusLastOpen);
    expect(opened?.[1]).toBe('_blank');
    expect(opened?.[2]).toBe('noopener,noreferrer');

    await openSection(page, testInfo, 'Недавние');
    await expect(page.locator('.nx-tile-name').filter({ hasText: title! }).first()).toBeVisible();
  });

  test('tile actions hide behind a menu and move a site to the trash', async ({ page }, testInfo) => {
    await page.goto('/');
    const first = page.locator('.nx-tile').first();
    const title = (await first.locator('.nx-tile-name').textContent())?.trim();
    const before = await page.locator('.nx-tile').count();

    await expect(page.getByRole('menu')).toHaveCount(0);
    await first.getByRole('button', { name: /Действия для/ }).click();
    await first.getByRole('menuitem', { name: 'Удалить' }).click();
    await expect(page.locator('.nx-tile')).toHaveCount(before - 1);

    // Sections live in the quick-access panel now.
    await openSection(page, testInfo, 'Корзина');
    await expect(page.locator('.nx-tile-name').filter({ hasText: title! }).first()).toBeVisible();
  });

  test('calendar is an overlay and closes with Escape', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-calendar-trigger]:visible').first().click();
    await expect(page.getByRole('dialog', { name: 'Календарь' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Календарь' })).toBeHidden();
  });

  test('the compact settings panel applies changes on the page behind it', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Настройки' }).first().click();
    const settings = page.locator('.nx-settings');
    await expect(settings).toBeVisible();
    // The panel is not modal: the grid stays visible and keeps working next to it.
    await expect(page.locator('.nx-tile').first()).toBeVisible();

    // Кнопка в доке открывает настройки на «Общих», поэтому «Оформление»
    // раскрывается явно — раньше оно было развёрнуто по умолчанию.
    await settings.getByRole('button', { name: 'Оформление' }).click();
    await settings.getByLabel('Тема').selectOption('dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await settings.getByRole('button', { name: 'Плитки' }).click();
    const address = settings.getByRole('switch', { name: 'Адрес' });
    // Адрес показан по умолчанию, поэтому проверяем переключатель в обе стороны.
    const wide = testInfo.project.name !== 'mobile';
    await expect(address).toHaveAttribute('aria-checked', 'true');
    await address.click();
    await expect(address).toHaveAttribute('aria-checked', 'false');
    // На узком экране состав подписи задаёт мобильная раскладка, а не этот переключатель.
    if (wide) await expect(page.locator('.nx-tile-sub').first()).toBeHidden();
    await address.click();
    await expect(address).toHaveAttribute('aria-checked', 'true');
    if (wide) await expect(page.locator('.nx-tile-sub').first()).toBeVisible();

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    if (wide) await expect(page.locator('.nx-tile-sub').first()).toBeVisible();
  });

  test('search engine setting drives what the palette opens', async ({ page }, testInfo) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'open', {
        configurable: true, writable: true,
        value: (...args: unknown[]) => {
          (window as typeof window & { __nexusLastOpen?: unknown[] }).__nexusLastOpen = args;
          return null;
        },
      });
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'Настройки' }).first().click();
    const settings = page.locator('.nx-settings');
    await settings.getByRole('button', { name: 'Поиск', exact: true }).click();
    await settings.getByLabel('Поисковая система').selectOption('Яндекс');
    await settings.getByRole('button', { name: 'Закрыть настройки' }).click();

    await paletteButton(page, testInfo).click();
    const field = page.getByRole('combobox', { name: 'Поиск по всем закладкам и командам' });
    await field.fill('как сверстать сетку');
    await page.getByRole('option', { name: /Искать/ }).click();
    const opened = await page.evaluate(() => (window as typeof window & { __nexusLastOpen?: unknown[] }).__nexusLastOpen);
    expect(String(opened?.[0])).toContain('yandex');
  });

  test('the search window exists only on call: Ctrl K and the panel button', async ({ page }, testInfo) => {
    await page.goto('/');
    // Нигде на странице нет постоянного поля поиска — только вызов.
    await expect(page.getByRole('combobox', { name: 'Поиск по всем закладкам и командам' })).toHaveCount(0);
    await expect(page.locator('.nx-topbar input')).toHaveCount(0);
    await expect(page.locator('.nx-palette')).toHaveCount(0);

    await page.keyboard.press('Control+k');
    const field = page.getByRole('combobox', { name: 'Поиск по всем закладкам и командам' });
    await expect(field).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('.nx-palette')).toHaveCount(0);

    await paletteButton(page, testInfo).click();
    await expect(field).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('.nx-palette')).toHaveCount(0);
  });

  test('the palette finds a site outside the open project and opens it', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'open', {
        configurable: true, writable: true,
        value: (...args: unknown[]) => {
          (window as typeof window & { __nexusLastOpen?: unknown[] }).__nexusLastOpen = args;
          return null;
        },
      });
    });
    await page.goto('/');
    // Стартовый проект — «Дом», Wildberries лежит в «Покупках» и на странице не виден.
    await expect(page.locator('.nx-tile', { hasText: 'Wildberries' })).toHaveCount(0);

    await page.keyboard.press('Control+k');
    await page.getByRole('combobox', { name: 'Поиск по всем закладкам и командам' }).fill('wildberries');
    // Именно в палитре: у списка сортировки над сеткой тоже есть option,
    // и без привязки первым находился «По названию».
    const first = page.locator('.nx-palette').getByRole('option').first();
    await expect(first).toContainText('Wildberries');
    await expect(first).toContainText('Покупки → Магазины');
    await page.keyboard.press('Enter');

    const opened = await page.evaluate(() => (window as typeof window & { __nexusLastOpen?: unknown[] }).__nexusLastOpen);
    expect(String(opened?.[0])).toContain('wildberries.ru');
    await expect(page.locator('.nx-palette')).toHaveCount(0);
  });

  test('the palette filters the grid only when asked to', async ({ page }) => {
    await page.goto('/');
    const total = await page.locator('.nx-tile').count();
    expect(total).toBeGreaterThan(1);

    await page.keyboard.press('Control+k');
    await page.getByRole('combobox', { name: 'Поиск по всем закладкам и командам' }).fill('Telegram');
    // Набор текста сам по себе сетку не трогает.
    await expect(page.locator('.nx-tile')).toHaveCount(total);
    await page.getByRole('option', { name: /Отфильтровать сетку/ }).click();
    await expect(page.locator('.nx-tile')).toHaveCount(1);

    await page.keyboard.press('Control+k');
    await page.getByRole('option', { name: 'Сбросить фильтр сетки Сейчас: «Telegram»' }).click();
    await expect(page.locator('.nx-tile')).toHaveCount(total);
  });

  test('mobile keeps the chrome above the grid within its budget', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Бюджет хрома касается узкого экрана.');
    await page.goto('/');
    await page.waitForSelector('.nx-grid');

    const measure = () => page.evaluate(() => {
      const tile = document.querySelector('.nx-main .nx-tile')!.getBoundingClientRect();
      const rows = new Set<number>();
      for (const el of document.querySelectorAll('.nx-mobile-top, .nx-carousel, .nx-content-head, .nx-chips, .nx-head')) {
        const r = el.getBoundingClientRect();
        if (r.height && r.top < tile.top) rows.add(Math.round(r.top));
      }
      return { first: Math.round(tile.top), height: innerHeight, rows: rows.size,
        scrollWidth: document.documentElement.scrollWidth, inner: innerWidth };
    });

    const start = await measure();
    // Было 273 px — 32 % экрана; держим ниже четверти и без горизонтальной прокрутки.
    expect(start.first).toBeLessThan(start.height * 0.25);
    expect(start.scrollWidth).toBe(start.inner);

    // Худший случай: самая длинная категория из ленты. Пространство на узком
    // экране меняют из листа разделов, а не из строки над сеткой, поэтому
    // здесь проверяется то, что действительно стоит над плитками.
    const cards = page.locator('.nx-carousel-row .nx-cat-card');
    await cards.nth(await cards.count() - 2).click();
    const worst = await measure();
    expect(worst.first).toBeLessThan(worst.height * 0.25);
    expect(worst.scrollWidth).toBe(worst.inner);
  });

  test('на узком экране переключатель раскладки идёт под лентой категорий', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Переключатель раскладки живёт только на узком экране.');
    await page.goto('/');
    const views = page.getByRole('group', { name: 'Вид сетки на узком экране' });
    const carousel = page.locator('.nx-carousel');
    const viewsBox = (await views.boundingBox())!;
    const carouselBox = (await carousel.boundingBox())!;
    // Переключатель идёт под лентой категорий, а не занимает отдельную
    // строку выше неё: на 390 px каждая строка сверху — минус одна плитка.
    expect(viewsBox.y).toBeGreaterThanOrEqual(carouselBox.y + carouselBox.height - 2);

    // Вне «Быстрого доступа» строки категорий нет, но переключатель остаётся.
    await openSection(page, testInfo, 'Корзина');
    await expect(page.locator('.nx-carousel')).toHaveCount(0);
    await expect(views).toBeVisible();
    // Заголовок раздела на узком экране остаётся, исчезает только строка со счётчиком.
    await expect(page.getByRole('heading', { name: 'Корзина' })).toBeVisible();
  });

  test('the grid is one tab stop and the arrows walk it', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.nx-grid');

    const focus = () => page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      const tiles = [...document.querySelectorAll('.nx-main .nx-grid .nx-tile')];
      const tile = el?.closest('.nx-tile');
      return {
        label: el?.getAttribute('aria-label') ?? '',
        index: tile ? tiles.indexOf(tile) : -1,
        tabbable: document.querySelectorAll('.nx-main .nx-grid [tabindex="0"]').length,
        scrollTop: Math.round(document.querySelector('.nx-main-scroll')!.scrollTop),
      };
    });

    // Первая остановка табуляции — ссылка к сайтам, и она показывается.
    await page.keyboard.press('Tab');
    const skip = page.locator('.nx-skip');
    await expect(skip).toBeFocused();
    await expect(skip).toHaveText('Перейти к сайтам');
    await expect.poll(async () => Math.round((await skip.boundingBox())!.y)).toBeGreaterThan(0);

    await page.keyboard.press('Enter');
    const first = await focus();
    expect(first.index).toBe(0);
    // Вся сетка — одна остановка: открыть и меню активной плитки, не больше.
    expect(first.tabbable).toBe(2);

    await page.keyboard.press('ArrowRight');
    expect((await focus()).index).toBe(1);
    await page.keyboard.press('ArrowLeft');
    expect((await focus()).index).toBe(0);

    // Шаг вниз — ровно на строку, сколько бы колонок ни вышло при этой ширине.
    const columns = await page.evaluate(() => {
      const tiles = [...document.querySelectorAll('.nx-main .nx-grid .nx-tile')];
      const top = Math.round(tiles[0].getBoundingClientRect().top);
      return tiles.filter(t => Math.round(t.getBoundingClientRect().top) === top).length;
    });
    await page.keyboard.press('ArrowDown');
    expect((await focus()).index).toBe(columns);
    await page.keyboard.press('ArrowUp');
    expect((await focus()).index).toBe(0);

    const total = await page.locator('.nx-main .nx-grid .nx-tile').count();
    await page.keyboard.press('End');
    expect((await focus()).index).toBe(total - 1);
    await page.keyboard.press('Home');
    const back = await focus();
    expect(back.index).toBe(0);
    // Стрелка в край не прокручивает страницу вместо перехода.
    const before = back.scrollTop;
    await page.keyboard.press('ArrowUp');
    const stayed = await focus();
    expect(stayed.index).toBe(0);
    expect(stayed.scrollTop).toBe(before);

    // Tab из плитки ведёт к её меню, следующий Tab уводит из сетки.
    await page.keyboard.press('Tab');
    expect((await focus()).label).toContain('Действия для');
    await page.keyboard.press('Tab');
    expect((await focus()).index).toBe(-1);
  });

  test('the grid keeps a single tab stop after the list changes', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Вкладки категорий на узком экране в отдельной строке, шаги те же.');
    await page.goto('/');
    await page.waitForSelector('.nx-grid');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await page.keyboard.press('End');
    const last = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
    expect(last).toContain('Открыть');

    // Сужаем список: бегущий фокус должен переехать на существующую плитку.
    await page.locator('.nx-carousel-row .nx-cat-card').nth(1).click();
    await expect.poll(() => page.locator('.nx-main .nx-grid [tabindex="0"]').count()).toBe(2);
    const survivors = await page.locator('.nx-main .nx-grid .nx-tile').count();
    expect(survivors).toBeGreaterThan(0);
    await page.locator('.nx-main .nx-grid .nx-tile button.nx-tile-face').first().focus();
    await page.keyboard.press('End');
    const index = await page.evaluate(() => {
      const tiles = [...document.querySelectorAll('.nx-main .nx-grid .nx-tile')];
      return tiles.indexOf(document.activeElement!.closest('.nx-tile')!);
    });
    expect(index).toBe(survivors - 1);
  });

  test('every empty state carries its own icon and a next step', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Путь по разделам на узком экране другой, состояния те же.');
    await page.goto('/');
    await page.waitForSelector('.nx-grid');

    const shape = () => page.evaluate(() => {
      const empty = document.querySelector('.nx-empty');
      if (!empty) return null;
      const icon = empty.querySelector('svg');
      const action = empty.querySelector('.nx-empty-action');
      return {
        title: empty.querySelector('b')?.textContent ?? '',
        // Иконки собраны из одинаковой разметки, поэтому различаем их по пути.
        path: icon?.querySelector('path')?.getAttribute('d')?.slice(0, 40) ?? '',
        action: action?.textContent?.trim() ?? '',
      };
    });

    await openSection(page, testInfo, 'Корзина');
    const trash = (await shape())!;
    expect(trash.title).toBe('Корзина пуста');
    expect(trash.action).toBe('К сайтам');

    await openSection(page, testInfo, 'Недавние');
    const recent = (await shape())!;
    expect(recent.title).toBe('Пока ничего не открывали');
    expect(recent.action).toBe('К сайтам');
    // Иконка у каждого состояния своя, а не одна лупа на все.
    expect(recent.path).not.toBe(trash.path);

    // Кнопка возвращает в «Быстрый доступ», а не просто нарисована.
    await page.locator('.nx-empty-action').click();
    await expect(page.locator('.nx-main .nx-tile').first()).toBeVisible();

    // Пустой поиск по сетке: своя иконка, и кнопка действительно снимает фильтр.
    await page.keyboard.press('Control+k');
    await page.getByRole('combobox', { name: 'Поиск по всем закладкам и командам' }).fill('щщщ');
    await page.getByRole('option', { name: /Отфильтровать сетку/ }).click();
    const missing = (await shape())!;
    expect(missing.title).toBe('Ничего не найдено');
    expect(missing.path).not.toBe(trash.path);
    expect(missing.path).not.toBe(recent.path);
    expect(missing.action).toBe('Сбросить фильтр');
    await page.locator('.nx-empty-action').click();
    await expect(page.locator('.nx-main .nx-tile').first()).toBeVisible();
  });

  test('a session saves the sites on screen and opens them all back', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Узкий экран ведёт свою раскладку.');
    await page.addInitScript(() => {
      Object.defineProperty(window, 'open', {
        configurable: true, writable: true,
        value: (...args: unknown[]) => {
          const store = window as typeof window & { __opened?: string[] };
          (store.__opened ??= []).push(String(args[0]));
          return null;
        },
      });
    });
    await page.goto('/');
    await page.waitForSelector('.nx-grid');
    const total = await page.locator('.nx-main .nx-tile').count();

    await openSection(page, testInfo, 'Сессии');
    // Пустое состояние предлагает действие, а не просто сообщает о пустоте.
    const save = page.getByRole('button', { name: /Сохранить текущие сайты/ });
    await expect(save).toBeVisible();
    await save.click();
    await page.getByLabel('Название сессии').fill('Утро понедельника');
    await page.locator('.nx-action-dialog').getByRole('button', { name: 'Сохранить' }).click();

    const card = page.locator('.nx-session').first();
    await expect(card.locator('b')).toHaveText('Утро понедельника');
    // Сессия помнит проект и число сайтов.
    await expect(card.locator('.nx-session-name span')).toContainText('Дом');
    await expect(card.locator('.nx-session-mark')).toHaveCount(total);

    // Много вкладок разом — заметное действие, поэтому приложение переспрашивает.
    await card.getByRole('button', { name: 'Открыть' }).click();
    const confirm = page.locator('.nx-action-dialog');
    await expect(confirm).toContainText('Открыть');
    await confirm.getByRole('button', { name: 'Открыть все' }).click();
    const opened = await page.evaluate(() => (window as typeof window & { __opened?: string[] }).__opened ?? []);
    expect(opened.length).toBe(total);

    // Переименование и удаление доходят до списка.
    await card.getByRole('button', { name: 'Переименовать' }).click();
    const field = page.getByLabel('Название сессии');
    await field.fill('Вечерний набор');
    await page.locator('.nx-action-dialog').getByRole('button', { name: 'Сохранить' }).click();
    await expect(page.locator('.nx-session b')).toHaveText('Вечерний набор');

    await page.locator('.nx-session').first().getByRole('button', { name: 'Удалить' }).click();
    await expect(page.locator('.nx-session')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Сохранить текущие сайты/ })).toBeVisible();
  });

  test('the palette can save a session too', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Узкий экран ведёт свою раскладку.');
    await page.goto('/');
    await page.waitForSelector('.nx-grid');
    await page.keyboard.press('Control+k');
    await page.getByRole('combobox', { name: 'Поиск по всем закладкам и командам' }).fill('сессия');
    await page.getByRole('option', { name: /Сохранить сессию/ }).click();
    await page.getByLabel('Название сессии').fill('Из палитры');
    await page.locator('.nx-action-dialog').getByRole('button', { name: 'Сохранить' }).click();
    await openSection(page, testInfo, 'Сессии');
    await expect(page.locator('.nx-session b')).toHaveText('Из палитры');
  });

  test('избранное живёт в доке, а не отдельной полосой над сеткой', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Док на узком экране свой.');
    await page.goto('/');

    // Полосы избранного над сеткой больше нет: её роль взял док, куда сайты
    // перетаскивают мышью. Две полосы под одну задачу — лишняя высота.
    await expect(page.locator('.nx-favbar')).toHaveCount(0);
    await expect(page.locator('.nx-dock')).toHaveClass(/open/);
  });

  test('нижняя панель одна: док открыт сразу и складывается язычком', async ({ page }) => {
    await page.goto('/');
    const dock = page.locator('.nx-dock');
    // Панели быстрого доступа больше нет: разделы переехали в боковое окно,
    // и держать внизу две полосы значило бы дважды тратить одну и ту же высоту.
    await expect(page.locator('.nx-quick')).toHaveCount(0);
    await expect(dock).toHaveClass(/open/);

    // Язычок наполовину утоплен за нижнюю кромку — он зовёт, но не мешает.
    const handle = page.getByRole('button', { name: 'Скрыть док-панель' });
    const box = (await handle.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.y).toBeLessThan(viewport.height);
    expect(box.y + box.height).toBeGreaterThan(viewport.height);

    await handle.click();
    await expect(dock).not.toHaveClass(/open/);
    await page.getByRole('button', { name: 'Показать док-панель' }).click();
    await expect(dock).toHaveClass(/open/);
  });

  test('the side panel collapses to icons and remembers it', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'The side panel is replaced by the sections sheet below 900px.');
    await page.goto('/');
    const panel = page.locator('.nx-panel');
    const wide = (await panel.boundingBox())!.width;
    await page.getByRole('button', { name: 'Свернуть боковое окно' }).click();
    await expect(page.locator('.nx-root')).toHaveClass(/panel-collapsed/);
    await expect.poll(async () => (await panel.boundingBox())!.width).toBeLessThan(wide);
    await page.reload();
    await expect(page.locator('.nx-root')).toHaveClass(/panel-collapsed/);
  });

  test('a site is dragged onto the dock and removed from it again', async ({ page }) => {
    await page.goto('/');
    // Док открыт с самого начала — отдельно звать его больше не нужно.
    const dock = page.locator('.nx-dock');
    await expect(dock.locator('.nx-dock-pin')).toHaveCount(0);

    const tile = page.locator('.nx-tile').first();
    const title = (await tile.locator('.nx-tile-name').textContent())!.trim();
    // Synthesised HTML5 drag: Playwright's mouse-driven dragTo does not always
    // turn into a native drag in headless Chromium, and this exercises the same
    // dragstart/dragover/drop handlers the browser would call.
    await page.evaluate(() => {
      const source = document.querySelector('.nx-tile')!;
      const target = document.querySelector('.nx-dock')!;
      const dataTransfer = new DataTransfer();
      source.dispatchEvent(new DragEvent('dragstart', { dataTransfer, bubbles: true }));
      target.dispatchEvent(new DragEvent('dragover', { dataTransfer, bubbles: true, cancelable: true }));
      target.dispatchEvent(new DragEvent('drop', { dataTransfer, bubbles: true, cancelable: true }));
    });
    await expect(dock.locator('.nx-dock-pin')).toHaveCount(1);
    await expect(dock.getByRole('button', { name: `Открыть «${title}»` })).toBeVisible();

    // The pin survives a reload.
    await page.reload();
    await expect(page.locator('.nx-dock').locator('.nx-dock-pin')).toHaveCount(1);

    // The delete button turns each pin into a remove target.
    await page.getByRole('button', { name: 'Удалить иконку сайта из док-панели' }).click();
    await page.getByRole('button', { name: `Убрать «${title}» из док-панели` }).click();
    await expect(page.locator('.nx-dock').locator('.nx-dock-pin')).toHaveCount(0);
  });

  test('the date opens the calendar and the temperature opens a five-day forecast', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'The compact card replaces the side panel below 900px.');
    await page.route('https://api.open-meteo.com/**', route => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        current: { temperature_2m: 18, weather_code: 2, relative_humidity_2m: 54, wind_speed_10m: 6 },
        daily: {
          time: ['2026-09-18', '2026-09-19', '2026-09-20', '2026-09-21', '2026-09-22'],
          temperature_2m_max: [20, 17, 15, 19, 22], temperature_2m_min: [11, 9, 8, 10, 13],
          weather_code: [2, 3, 61, 1, 0],
        },
      }),
    }));
    await page.goto('/');
    const when = page.locator('.nx-dock');
    await expect(when).toContainText(/\d{1,2}:\d{2}/);
    // The row carries no calendar icon of its own any more.
    await expect(when.locator('[data-calendar-trigger]')).toHaveCount(1);

    await when.locator('[data-calendar-trigger]').click();
    await expect(page.getByRole('dialog', { name: 'Календарь' })).toBeVisible();

    await when.locator('[data-forecast-trigger]').click();
    await expect(page.getByRole('dialog', { name: 'Календарь' })).toBeHidden();
    const forecast = page.getByRole('dialog', { name: 'Прогноз погоды на 5 дней' });
    await expect(forecast).toBeVisible();
    await expect(forecast.locator('li')).toHaveCount(5);
    await expect(forecast.locator('li').first()).toContainText('Сегодня');
  });

  test('цепочка крошек уводит вглубь и сужает сетку', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Крошки живут на широком экране.');
    await page.goto('/');

    // Дерева в панели больше нет: иерархию показывает сама рабочая область.
    await expect(page.locator('.nx-tree-children')).toHaveCount(0);
    const all = await page.locator('.nx-tile').count();

    // Второе звено — категория. Список соседей раскрывается прямо из звена.
    await page.locator('.nx-crumb-btn').nth(1).click();
    await page.getByRole('option', { name: /Соцсети/ }).click();
    await expect(page.locator('.nx-content-title h1')).toHaveText('Соцсети');
    const inCategory = await page.locator('.nx-tile').count();
    expect(inCategory).toBeLessThan(all);

    // Третье звено появляется только на глубине и сужает выборку ещё раз.
    await page.locator('.nx-crumb-btn').nth(2).click();
    await page.getByRole('option', { name: /Чаты/ }).click();
    const inGroup = await page.locator('.nx-tile').count();
    expect(inGroup).toBeGreaterThan(0);
    expect(inGroup).toBeLessThan(inCategory);

    // «Все категории» возвращает к полному списку пространства.
    await page.locator('.nx-crumb-btn').nth(1).click();
    await page.getByRole('option', { name: 'Все категории' }).click();
    await expect.poll(() => page.locator('.nx-tile').count()).toBe(all);
  });

  test('имя пространства названо один раз — в цепочке крошек', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Крошки живут на широком экране.');
    await page.goto('/');
    const crumb = page.locator('.nx-crumb-btn').first();
    const space = (await crumb.locator('b').textContent())!.trim();
    expect(space).toBeTruthy();

    // Заголовок содержимого говорит о выборке, а не повторяет пространство.
    await expect(page.locator('.nx-content-title h1')).toContainText('Все сайты');
    await expect(page.locator('.nx-content-head')).not.toContainText(space);
    expect(await page.locator('.nx-main').getByText(space, { exact: true }).count()).toBe(1);
  });

  test('mobile keeps the clock, the weather and the calendar in one compact card', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'The compact card replaces the project panel below 900px.');
    await page.goto('/');
    const card = page.locator('.nx-mobile-card');
    await expect(card).toBeVisible();
    await expect(card).toContainText(/\d{1,2}:\d{2}/);
    await expect(card.locator('.nx-mobile-weather')).toBeVisible();
    // Same split as the side window: the date opens the calendar, the temperature the forecast.
    await card.locator('[data-calendar-trigger]').click();
    await expect(page.getByRole('dialog', { name: 'Календарь' })).toBeVisible();
    await card.locator('[data-forecast-trigger]').click();
    await expect(page.getByRole('dialog', { name: 'Прогноз погоды на 5 дней' })).toBeVisible();
  });

  test('mobile replaces the project panel with the sections sheet', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Mobile navigation only applies to the mobile project.');
    await page.goto('/');
    await expect(page.locator('.nx-panel')).toBeHidden();
    await expect(page.locator('.nx-rail')).toBeHidden();
    await page.getByRole('button', { name: 'Разделы' }).click();
    await expect(page.getByText(/Разделы и (проекты|пространства)/)).toBeVisible();
    await page.locator('.mobile-sections-card').getByRole('button', { name: 'Заметки', exact: true }).click();
    await expect(page.locator('.nx-head h1')).toHaveText('Заметки');
  });

  test('project creation uses the Nexus dialog instead of window.prompt', async ({ page }, testInfo) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'prompt', {
        configurable: true,
        writable: true,
        value: () => {
          (window as typeof window & { __nexusNativePrompt?: boolean }).__nexusNativePrompt = true;
          return null;
        },
      });
    });
    await page.goto('/');

    // Ветвление по ширине прогона, а не по isVisible(): та не ждёт появления
    // элемента и на медленной первой отрисовке уводила десктоп в мобильную ветку.
    if (testInfo.project.name !== 'mobile') {
      await page.locator('.nx-panel').getByRole('button', { name: 'Добавить пространство' }).first().click();
    } else {
      await page.getByRole('button', { name: 'Разделы' }).click();
      await page.locator('.mobile-sections-card').getByRole('button', { name: 'Добавить пространство' }).click();
    }
    const dialog = page.getByRole('dialog', { name: 'Новый проект' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('textbox', { name: 'Название проекта' }).fill('Проект E2E');
    await dialog.getByRole('button', { name: 'Создать' }).click();

    if (testInfo.project.name !== 'mobile') {
      await expect(page.locator('.nx-panel').getByRole('button', { name: 'Пространство «Проект E2E»' })).toBeVisible();
    } else {
      await page.getByRole('button', { name: 'Разделы' }).click();
      await expect(page.locator('.mobile-sections-card').getByRole('button', { name: /Проект E2E/ })).toBeVisible();
    }
    expect(await page.evaluate(() => (window as typeof window & { __nexusNativePrompt?: boolean }).__nexusNativePrompt)).toBeFalsy();
  });

  test('trash clearing uses the Nexus destructive dialog instead of window.confirm', async ({ page }, testInfo) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'confirm', {
        configurable: true,
        writable: true,
        value: () => {
          (window as typeof window & { __nexusNativeConfirm?: boolean }).__nexusNativeConfirm = true;
          return false;
        },
      });
    });
    await page.goto('/');

    const first = page.locator('.nx-tile').first();
    await first.getByRole('button', { name: /Действия для/ }).click();
    await first.getByRole('menuitem', { name: 'Удалить' }).click();
    await openSection(page, testInfo, 'Корзина');
    await page.getByRole('button', { name: 'Очистить корзину' }).click();

    const dialog = page.getByRole('dialog', { name: 'Очистить корзину?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Очистить' }).click();
    await expect(page.getByText('Корзина пуста')).toBeVisible();
    expect(await page.evaluate(() => (window as typeof window & { __nexusNativeConfirm?: boolean }).__nexusNativeConfirm)).toBeFalsy();
  });


  // ── настройки ──────────────────────────────────────────────────────────
  const openSettings = async (page: import('@playwright/test').Page, fold: string) => {
    await page.getByRole('button', { name: 'Настройки' }).last().click();
    const head = page.locator('.nx-fold-head', { hasText: new RegExp(`^${fold}$`) });
    // One fold is open from the start, so only click the ones that are still shut.
    if (await head.getAttribute('aria-expanded') !== 'true') await head.click();
    await expect(head).toHaveAttribute('aria-expanded', 'true');
  };

  test('the accordion carries every settings section again', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Настройки' }).last().click();
    const heads = page.locator('.nx-settings .nx-fold-head');
    await expect(heads).toHaveCount(10);
    for (const label of ['Общие', 'Оформление', 'Плитки', 'Панели', 'Мобильная версия',
      'Поиск', 'Погода', 'Приватность', 'Горячие клавиши', 'Данные']) {
      await expect(heads.filter({ hasText: new RegExp(`^${label}$`) })).toHaveCount(1);
    }
  });

  test('the compact switch really tightens the page behind the settings', async ({ page }) => {
    await page.goto('/');
    const scroll = page.locator('.nx-main-scroll');
    const before = await scroll.evaluate(el => parseFloat(getComputedStyle(el).paddingTop));
    await openSettings(page, 'Общие');
    await page.getByRole('switch', { name: 'Компактный интерфейс' }).click();
    await expect(page.locator('.nx-root')).toHaveClass(/compact/);
    await expect.poll(() => scroll.evaluate(el => parseFloat(getComputedStyle(el).paddingTop))).toBeLessThan(before);
  });

  test('the side window width follows its setting', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'The side window is hidden below 900px.');
    await page.goto('/');
    const panel = page.locator('.nx-panel');
    const before = (await panel.boundingBox())!.width;
    await openSettings(page, 'Панели');
    await page.getByLabel('Ширина окна').selectOption('340px');
    await expect.poll(async () => (await panel.boundingBox())!.width).toBeGreaterThan(before);
  });

  test('the wallpaper choice repaints the workspace', async ({ page }) => {
    await page.goto('/');
    const root = page.locator('.nx-root');
    const before = await root.evaluate(el => getComputedStyle(el).backgroundImage);
    await openSettings(page, 'Оформление');
    // exact: в разделе есть и «Фон» (список обоев), и «Осветление фона»
    // (ползунок вуали для своего снимка) — поиск по подстроке ловит оба.
    await page.getByLabel('Фон', { exact: true }).selectOption('mint');
    await expect(page.locator('html')).toHaveAttribute('data-wallpaper', 'mint');
    await expect.poll(() => root.evaluate(el => getComputedStyle(el).backgroundImage)).not.toBe(before);
  });

  test('the tile mode setting rebuilds the grid', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'A narrow screen follows its own three arrangements.');
    await page.goto('/');
    await openSettings(page, 'Плитки');
    await page.getByLabel('Раскладка').selectOption('list');
    await expect(page.locator('.nx-grid')).toHaveClass(/layout-list/);
    // A list row puts the icon beside the text; the address follows its own switch.
    const tile = page.locator('.nx-tile').first();
    await expect(tile.locator('.nx-tile-face')).toHaveCSS('flex-direction', 'row');
    await expect(tile.locator('.nx-tile-sub')).toBeVisible();
    await page.getByRole('switch', { name: 'Адрес' }).click();
    await expect(tile.locator('.nx-tile-sub')).toBeHidden();
    await page.getByRole('switch', { name: 'Адрес' }).click();
    await expect(tile.locator('.nx-tile-sub')).toBeVisible();
  });

  test('resetting a section puts its controls back', async ({ page }) => {
    await page.goto('/');
    await openSettings(page, 'Общие');
    const toggle = page.getByRole('switch', { name: 'Компактный интерфейс' });
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await page.getByRole('button', { name: /Сбросить раздел «Общие»/ }).click();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await expect(page.locator('.nx-root')).not.toHaveClass(/compact/);
  });

  // ── боковая панель ─────────────────────────────────────────────────────
  test('выбранное пространство получает цветную иконку, а не только подсветку', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Панель живёт на широком экране.');
    await page.goto('/');
    const space = page.locator('.nx-panel .nx-link', { hasText: 'Работа' }).first();
    await space.click();

    const tint = await space.evaluate(el => getComputedStyle(el).getPropertyValue('--nx-node').trim());
    expect(tint).toMatch(/^#[0-9a-f]{6}$/i);
    const iconColour = await space.locator('svg').first().evaluate(el => getComputedStyle(el).color);
    const muted = await page.locator('.nx-panel .nx-link:not(.on) svg').first().evaluate(el => getComputedStyle(el).color);
    expect(iconColour).not.toBe(muted);
  });

  test('категории лежат в карусели и активна ровно одна', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Карусель живёт на широком экране.');
    await page.goto('/');

    // Дерева в панели нет: категории показывает карусель, и выбранной может
    // быть только одна — стопки раскрытых веток, как в проводнике, больше нет.
    const cards = page.locator('.nx-carousel-row .nx-cat-card');
    await expect(cards.filter({ has: page.locator('[aria-current="true"]') })).toHaveCount(0);
    await expect(page.locator('.nx-carousel-row .nx-cat-card.on')).toHaveCount(1);

    await cards.nth(1).click();
    await expect(page.locator('.nx-carousel-row .nx-cat-card.on')).toHaveCount(1);
    const name = (await cards.nth(1).locator('span').textContent())!.trim();
    await expect(page.locator('.nx-content-title h1')).toHaveText(name);
  });

  test('смена пространства перестраивает карусель категорий', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Крошки и карусель живут на широком экране.');
    await page.goto('/');
    const crumb = page.locator('.nx-crumb-btn').first();
    const carousel = page.locator('.nx-carousel-row');

    const first = (await crumb.locator('b').textContent())!.trim();
    const firstCategories = (await carousel.textContent())!;

    // Соседние пространства раскрываются прямо из первого звена цепочки.
    await crumb.click();
    const other = page.getByRole('option').filter({ hasNotText: first }).first();
    await other.click();

    await expect.poll(async () => (await crumb.locator('b').textContent())!.trim()).not.toBe(first);
    // За пространством следует всё, что от него зависит: набор категорий другой.
    expect((await carousel.textContent())!).not.toBe(firstCategories);
  });

  const columns = (page: Page) =>
    page.locator('.nx-grid').first().evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);

  test('mobile opens as a two-column table and switches to rows and icons', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'These three arrangements belong to the narrow screen.');
    await page.goto('/');
    await expect(page.locator('.nx-grid')).toHaveClass(/layout-table/);
    expect(await columns(page)).toBe(2);
    // The table keeps a short description under the name.
    await expect(page.locator('.nx-tile').first().locator('.nx-tile-desc')).toBeVisible();

    await page.getByRole('button', { name: 'Строки с подробным описанием' }).click();
    await expect(page.locator('.nx-grid')).toHaveClass(/layout-row/);
    expect(await columns(page)).toBe(1);
    const row = page.locator('.nx-tile').first();
    await expect(row.locator('.nx-tile-desc')).toBeVisible();
    await expect(row.locator('.nx-tile-sub')).toBeVisible();

    await page.getByRole('button', { name: 'Иконки в четыре столбца' }).click();
    await expect(page.locator('.nx-grid')).toHaveClass(/layout-icon/);
    expect(await columns(page)).toBe(4);
    const icon = page.locator('.nx-tile').first();
    await expect(icon.locator('.nx-tile-name')).toBeVisible();
    await expect(icon.locator('.nx-tile-desc')).toHaveCount(0);
  });

  test('the mobile default view comes from the settings', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'The default only applies to the narrow screen.');
    await page.goto('/');
    await page.getByRole('button', { name: 'Настройки' }).last().click();
    await page.locator('.nx-fold-head', { hasText: /^Мобильная версия$/ }).click();
    await page.locator('.nx-cell-pick', { hasText: 'Иконки' }).click();
    await page.getByRole('button', { name: 'Закрыть настройки' }).click();
    await expect(page.locator('.nx-grid')).toHaveClass(/layout-icon/);

    await page.reload();
    await expect(page.locator('.nx-grid')).toHaveClass(/layout-icon/);
  });

  // ── раздел «Плитки»: ни одного контрола без видимого действия ──────────
  /** Отпечаток того, как плитка выглядит прямо сейчас на главной странице. */
  const tileFingerprint = (page: import('@playwright/test').Page) => page.evaluate(() => {
    const root = document.querySelector('.nx-root') as HTMLElement;
    const grid = document.querySelector('.nx-main .nx-grid') as HTMLElement;
    const tile = document.querySelector('.nx-main .nx-tile') as HTMLElement;
    // Значок и звезда есть не у каждого сайта, поэтому смотрим на всю сетку сразу,
    // иначе проверка была бы слепа к этим переключателям.
    const part = (selector: string) => {
      const nodes = Array.from(document.querySelectorAll('.nx-main .nx-tile ' + selector));
      if (!nodes.length) return 'нет';
      return nodes.length + ':' + nodes.map(node => {
        const style = getComputedStyle(node);
        return style.display + '|' + style.width + '|' + style.borderRadius;
      }).join(',');
    };
    const rootStyle = getComputedStyle(root);
    // Параметры наведения и нажатия живут в переменных: их читают правила :hover/:active.
    const vars = ['--nx-tile-lift', '--nx-tile-hover-scale', '--nx-tile-shadow-hover', '--nx-tile-press-scale',
      '--nx-tile-focus-width', '--nx-tile-drag-opacity', '--nx-tile-easing', '--nx-tile-load',
      // Материалы: размытие видно только под стеклом, слой состояния — под курсором.
      '--nx-tile-blur', '--nx-tile-state', '--nx-tile-state-press']
      .map(name => name + '=' + rootStyle.getPropertyValue(name).trim()).join(';');
    const tileStyle = getComputedStyle(tile);
    const gridStyle = getComputedStyle(grid);
    // Геометрия первой плитки ловит то, что не видно в отдельном свойстве:
    // пропорция меняет высоту, прижатие сдвигает всю сетку внутри свободного места.
    const box = tile.getBoundingClientRect();
    return [
      gridStyle.gridTemplateColumns, gridStyle.gap, gridStyle.alignContent,
      tileStyle.aspectRatio, Math.round(box.top) + 'x' + Math.round(box.height),
      tileStyle.borderRadius, tileStyle.backgroundColor, tileStyle.backgroundImage,
      tileStyle.boxShadow, tileStyle.minHeight, tileStyle.borderTopWidth, tileStyle.borderTopColor,
      tileStyle.transitionDuration, tileStyle.fontFamily, tileStyle.backdropFilter,
      tileStyle.animationName, tileStyle.textAlign, tileStyle.alignItems, tileStyle.color,
      part('.nx-mark'), part('.nx-mark img'), part('.nx-tile-name'), part('.nx-tile-desc'), part('.nx-tile-sub'),
      part('.nx-tile-cat'), part('.nx-tile-star'),
      vars,
    ].join(' // ');
  });

  const openTiles = async (page: import('@playwright/test').Page) => {
    await page.getByRole('button', { name: 'Настройки' }).last().click();
    const head = page.locator('.nx-fold-head', { hasText: /^Плитки$/ });
    if (await head.getAttribute('aria-expanded') !== 'true') await head.click();
    await expect(head).toHaveAttribute('aria-expanded', 'true');
  };

  test('каждый из пятнадцати готовых видов даёт свою плитку', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Узкий экран ведёт свою раскладку.');
    await page.goto('/');
    await openTiles(page);
    const presets = page.locator('.nx-preset');
    await expect(presets).toHaveCount(15);

    const seen = new Set<string>();
    for (let index = 0; index < 15; index += 1) {
      await presets.nth(index).click();
      await page.waitForTimeout(60);
      seen.add(await tileFingerprint(page));
    }
    // Пятнадцать разных отпечатков: ни один готовый вид не повторяет другой.
    expect(seen.size).toBe(15);
  });

  test('глубина держится на кромке, а не на размытой тени', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Узкий экран ведёт свою раскладку.');
    await page.goto('/');
    await openTiles(page);
    const tile = page.locator('.nx-main .nx-tile').first();
    const shadow = () => tile.evaluate(el => getComputedStyle(el).boxShadow);

    // «Ступень» — приём Linear, Raycast и Resend: кромка есть, тени нет вовсе.
    await page.locator('.nx-preset', { hasText: 'Ступень' }).first().click();
    await page.waitForTimeout(80);
    const ladder = await shadow();
    expect(ladder).toContain('inset');
    // Ни одного слоя со смещением: всё, что есть, — внутреннее кольцо.
    expect(ladder.split('inset').filter(part => /\d+px \d+px/.test(part) && !part.includes('0px 0px')).length).toBe(0);

    // Наведение усиливает кромку — у Linear наведённая карточка встаёт на ступень выше.
    const restAlpha = Number((ladder.match(/[\d.]+\)/g) ?? ['0)'])[0].slice(0, -1));
    await tile.hover();
    await page.waitForTimeout(200);
    const hoveredAlpha = Number((((await shadow()).match(/[\d.]+\)/g)) ?? ['0)'])[0].slice(0, -1));
    expect(hoveredAlpha).toBeGreaterThan(restAlpha);

    // «Студия» — приём Vercel: несколько мелких смещений плюс та же кромка.
    await page.mouse.move(0, 0);
    await page.locator('.nx-preset', { hasText: 'Студия' }).first().click();
    await page.waitForTimeout(80);
    const studio = await shadow();
    expect(studio).toContain('inset');
    expect((studio.match(/rgba\(/g) ?? []).length).toBeGreaterThanOrEqual(4);
  });

  test('клавиши и цифры набраны как в дорогих интерфейсах', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.nx-grid');
    // Счётчики в проводнике — табличными цифрами, чтобы не прыгали.
    const counter = page.locator('.nx-link i').first();
    if (await counter.count()) {
      expect(await counter.evaluate(el => getComputedStyle(el).fontVariantNumeric)).toContain('tabular-nums');
    }
    await page.keyboard.press('Control+k');
    const key = page.locator('.nx-palette-kbd').first();
    await expect(key).toBeVisible();
    const look = await key.evaluate(el => {
      const style = getComputedStyle(el);
      return { image: style.backgroundImage, shadow: style.boxShadow, numeric: style.fontVariantNumeric };
    });
    // Клавиша — с гранью: лёгкий градиент и кромка, как у Raycast.
    expect(look.image).toContain('gradient');
    expect(look.shadow).toContain('inset');
    expect(look.numeric).toContain('tabular-nums');
  });

  test('стекло, рельеф и Material доходят до экрана, а не только до настроек', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Узкий экран ведёт свою раскладку.');
    await page.goto('/');
    await openTiles(page);
    const pick = (label: string) => page.locator('.nx-preset', { hasText: label }).first().click();
    const tile = page.locator('.nx-main .nx-tile').first();

    // Стекло: размытие того, что за плиткой, в рекомендованной полосе 8–16 px.
    await pick('Стекло');
    await page.waitForTimeout(80);
    const glass = await tile.evaluate(el => {
      const style = getComputedStyle(el);
      const prefixed = (style as unknown as Record<string, string>).webkitBackdropFilter;
      const blur = style.backdropFilter && style.backdropFilter !== 'none' ? style.backdropFilter : prefixed;
      return { blur, bg: style.backgroundColor };
    });
    expect(glass.blur).toMatch(/blur\((8|9|1[0-6])px\)/);
    // Подложка полупрозрачная, иначе размывать было бы нечего.
    expect(glass.bg).toMatch(/rgba|\/\s*0?\.\d+/);

    // Рельеф: две зеркальные тени — сдвиги одной противоположны другой.
    await pick('Рельеф');
    await page.waitForTimeout(80);
    const relief = await tile.evaluate(el => getComputedStyle(el).boxShadow);
    const offsets = [...relief.matchAll(/(-?\d+(?:\.\d+)?)px (-?\d+(?:\.\d+)?)px/g)].map(m => [Number(m[1]), Number(m[2])]);
    expect(offsets.length).toBeGreaterThanOrEqual(2);
    expect(offsets.some(([x, y]) => x > 0 && y > 0)).toBe(true);
    expect(offsets.some(([x, y]) => x < 0 && y < 0)).toBe(true);

    // Material: слой состояния появляется под курсором — цвет содержимого
    // с прозрачностью 8 %, как в спецификации, и 10 % при нажатии.
    await pick('Material');
    await page.waitForTimeout(80);
    const layer = () => tile.evaluate(el => getComputedStyle(el, '::after').backgroundColor);
    const alpha = (value: string) => {
      const parts = value.match(/[\d.]+/g) ?? [];
      return parts.length >= 4 ? Number(parts[3]) : 0;
    };
    const rest = await layer();
    expect(alpha(rest)).toBe(0);
    await tile.hover();
    await page.waitForTimeout(220);
    expect(alpha(await layer())).toBeCloseTo(0.08, 2);
    await page.mouse.down();
    await page.waitForTimeout(220);
    const pressed = alpha(await layer());
    await page.mouse.up();
    expect(pressed).toBeCloseTo(0.1, 2);
  });

  test('ни один контрол раздела «Плитки» не остаётся без действия', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Узкий экран ведёт свою раскладку.');
    test.slow();
    await page.goto('/');
    // Отмечаем сайт звездой: без звезды на экране переключатель нечем проверить.
    const first = page.locator('.nx-main .nx-tile').first();
    await first.getByRole('button', { name: /^Действия для/ }).click();
    await page.getByRole('menuitem', { name: 'В избранное' }).click();
    await expect(page.locator('.nx-main .nx-tile-star')).toHaveCount(1);

    await openTiles(page);
    const section = page.locator('.nx-settings .nx-fold.open .nx-fold-body');
    const dead: string[] = [];

    const sliders = section.locator('input[type="range"]:not([disabled])');
    for (let index = 0; index < await sliders.count(); index += 1) {
      const slider = sliders.nth(index);
      const label = (await slider.getAttribute('aria-label'))!;
      const before = await tileFingerprint(page);
      const [min, max, value] = await slider.evaluate((el: HTMLInputElement) => [el.min, el.max, el.value]);
      // Уводим ползунок к дальнему краю, чтобы изменение точно было заметным.
      const target = Math.abs(Number(value) - Number(min)) > Math.abs(Number(value) - Number(max)) ? min : max;
      await slider.fill(target);
      await page.waitForTimeout(40);
      if (await tileFingerprint(page) === before) dead.push(`ползунок «${label}»`);
      await slider.fill(value);
    }

    const selects = section.locator('select:not([disabled])');
    for (let index = 0; index < await selects.count(); index += 1) {
      const select = selects.nth(index);
      const label = (await select.getAttribute('aria-label'))!;
      const before = await tileFingerprint(page);
      const [current, options] = await select.evaluate((el: HTMLSelectElement) =>
        [el.value, Array.from(el.options).map(option => option.value)] as const);
      const other = options.find(option => option !== current)!;
      await select.selectOption(other);
      await page.waitForTimeout(40);
      if (await tileFingerprint(page) === before) dead.push(`список «${label}»`);
      await select.selectOption(current);
    }

    const switches = section.getByRole('switch');
    for (let index = 0; index < await switches.count(); index += 1) {
      const toggle = switches.nth(index);
      const label = (await toggle.getAttribute('aria-label'))!;
      const before = await tileFingerprint(page);
      await toggle.click();
      await page.waitForTimeout(40);
      if (await tileFingerprint(page) === before) dead.push(`переключатель «${label}»`);
      await toggle.click();
    }

    expect(dead, 'контролы без видимого действия').toEqual([]);
    // И заодно: раздел действительно наполнен, а не пуст.
    expect(await sliders.count() + await selects.count() + await switches.count()).toBeGreaterThan(24);
  });

  test('погашенный контрол объясняет, почему он сейчас ничего не изменит', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Узкий экран ведёт свою раскладку.');
    await page.goto('/');
    await openTiles(page);
    // Тень выключена — её числовые параметры гаснут и объясняют причину.
    await page.getByLabel('Тень', { exact: true }).selectOption('none');
    const depth = page.getByLabel('Глубина тени');
    await expect(depth).toBeDisabled();
    await expect(page.locator('.nx-cell.off', { hasText: 'Глубина тени' })).toContainText('Тень выключена');

    // Вернули тень — контрол снова работает.
    await page.getByLabel('Тень', { exact: true }).selectOption('soft');
    await expect(depth).toBeEnabled();
  });

  test('образцы показывают наведение и нажатие отдельно от обычного состояния', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Узкий экран ведёт свою раскладку.');
    await page.goto('/');
    await openTiles(page);
    // Берём вид с заметной реакцией, чтобы состояния расходились наверняка.
    await page.getByRole('button', { name: 'Готовый вид «Парящий»' }).click();

    const transforms = await page.locator('.nx-sample-stage .nx-tile').evaluateAll(
      nodes => nodes.map(node => getComputedStyle(node).transform));
    expect(transforms).toHaveLength(3);
    expect(new Set(transforms).size).toBe(3);
  });

  test('раздел «Плитки» выложен ровно в три столбца', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'На узком экране панель занимает всю ширину.');
    await page.goto('/');
    await openTiles(page);
    const grids = page.locator('.nx-settings .nx-triples, .nx-settings .nx-presets, .nx-settings .nx-samples');
    expect(await grids.count()).toBeGreaterThan(3);
    for (let index = 0; index < await grids.count(); index += 1) {
      const columns = await grids.nth(index).evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
      expect(columns).toBe(3);
    }
    // Число ячеек в каждой группе кратно трём, поэтому строки не рвутся.
    const groups = page.locator('.nx-settings .nx-triples');
    for (let index = 0; index < await groups.count(); index += 1) {
      expect(await groups.nth(index).locator(':scope > *').count() % 3).toBe(0);
    }
  });

  test('у каждого контрола настроек есть своя иконка', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Настройки' }).last().click();
    for (const fold of ['Общие', 'Оформление', 'Панели', 'Мобильная версия', 'Поиск', 'Погода', 'Приватность']) {
      const head = page.locator('.nx-fold-head', { hasText: new RegExp(`^${fold}$`) });
      if (await head.getAttribute('aria-expanded') !== 'true') await head.click();
      const cells = page.locator('.nx-fold.open .nx-cell');
      const count = await cells.count();
      expect(count % 3, `${fold}: число ячеек кратно трём`).toBe(0);
      for (let index = 0; index < count; index += 1) {
        await expect(cells.nth(index).locator('.nx-cell-top svg')).toHaveCount(1);
      }
      await head.click();
    }
  });

  /**
   * Перенесено с прежней доски проектов (коммиты d4dfda5 и 7b8f7b7).
   *
   * Предмет тех проверок исчез вместе с доской, но требования пережили смену
   * раскладки: на плотном пространстве навигация обязана оставаться
   * проходимой, а кнопка — не обещать того, чего не делает. Проверяются они
   * теперь на боковой панели и карусели.
   */
  test('двадцать пространств и двести сорок сайтов не ломают навигацию', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Плотное пространство проверяем на широком экране.');

    await page.addInitScript(() => {
      const projects = Array.from({ length: 20 }, (_, index) => ({
        id: `stress-project-${index}`,
        name: index === 19 ? 'Очень длинное название последнего пространства' : `Пространство ${index + 1}`,
        color: `hsl(${(index * 37) % 360} 62% 52%)`,
        icon: String(index + 1),
        siteIds: [], createdAt: index, updatedAt: index,
      }));
      const categories = projects.flatMap((project, index) => (
        Array.from({ length: 12 }, (_, inner) => ({
          id: `stress-category-${index}-${inner}`,
          name: `Категория ${index + 1}.${inner + 1}`,
          projectId: project.id,
        }))
      ));
      const sites = categories.flatMap((category, index) => (
        Array.from({ length: 1 }, (_, inner) => ({
          id: `stress-site-${index}-${inner}`,
          title: `Сайт ${index + 1}.${inner + 1}`,
          desc: 'Проверка плотного рабочего пространства',
          domain: `site-${index}-${inner}.example`,
          url: `https://site-${index}-${inner}.example/path`,
          color: '#2f6fe4', icon: 'С',
          category: category.name, categoryId: category.id,
        }))
      ));
      localStorage.setItem('nexus-projects', JSON.stringify(projects));
      localStorage.setItem('nexus-categories', JSON.stringify(categories));
      localStorage.setItem('nexus-groups', JSON.stringify([]));
      localStorage.setItem('nexus-sites', JSON.stringify(sites));
      localStorage.removeItem('nexus-active-project');
      localStorage.removeItem('nexus-active-category');
    });

    await page.goto('/');

    // Панель не растягивается на двадцать строк: видно горстку и «Ещё».
    const spaces = page.locator('.nx-panel .nx-section').first().locator('.nx-link');
    expect(await spaces.count()).toBeLessThanOrEqual(8);
    await page.locator('.nx-panel').getByRole('button', { name: /Ещё \d+/ }).click();
    await expect.poll(() => spaces.count()).toBeGreaterThan(19);

    // Карусель остаётся одной строкой и прокручивается, а не переносится.
    const row = page.locator('.nx-carousel-row');
    const geometry = await row.evaluate(element => {
      const cards = [...element.querySelectorAll<HTMLElement>('.nx-cat-card')];
      const rows = new Set(cards.map(card => Math.round(card.getBoundingClientRect().top)));
      return { rows: rows.size, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth,
        height: Math.round(element.getBoundingClientRect().height) };
    });
    expect(geometry.rows).toBe(1);
    expect(geometry.scrollWidth).toBeGreaterThan(geometry.clientWidth);
    expect(geometry.height).toBeLessThan(190);

    // И страница при этом не едет вбок.
    const overflow = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: innerWidth }));
    expect(overflow.scroll).toBe(overflow.inner);
  });

  test('ни одна кнопка не обещает того, чего не делает', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Смысл контролов достаточно проверить на широком экране.');
    await page.goto('/');

    // «Действия с проектом» открывало форму добавления сайта — такого
    // обещания на экране больше нет вовсе.
    await expect(page.getByRole('button', { name: 'Действия с проектом' })).toHaveCount(0);
    // «Справки» нет, пока нет раздела помощи: кнопка без действия хуже её отсутствия.
    await expect(page.locator('.nx-panel').getByRole('button', { name: 'Справка' })).toHaveCount(0);

    // А то, что обещано, — делается: инструмент ведёт в свой раздел настроек.
    await page.locator('.nx-panel').getByRole('button', { name: 'Резервная копия' }).click();
    await expect(page.locator('.nx-settings')).toBeVisible();
    await expect(page.locator('.nx-settings').getByRole('button', { name: 'Экспорт данных' })).toBeVisible();
  });

  test('на плитках стоят фирменные знаки, а не буквы', async ({ page }) => {
    await page.goto('/');

    // Указатель знаков грузится отдельным запросом и уже однажды не доезжал
    // до съёмки эталона: в принятый снимок попали монограммы. Здесь то же
    // самое проверяется на живом экране и на всех трёх ширинах сразу.
    await expect(page.locator('.nx-grid .nx-mark')).toHaveCount(9);

    // Сверяется не число, а поимённый список тех, кто остался без знака: когда
    // проверка краснеет, видно, какой сайт споткнулся, а не просто
    // «ожидалось 8, получено 6».
    const census = () => page.locator('.nx-grid .nx-tile').evaluateAll(tiles => tiles.map(tile => {
      const mark = tile.querySelector('.nx-mark');
      const image = mark?.querySelector('img') as HTMLImageElement | null;
      return {
        name: tile.querySelector('.nx-tile-name')?.textContent ?? '?',
        settled: Boolean(mark?.classList.contains('brand') && mark.classList.contains('filled')),
        state: mark?.className ?? 'без марки',
        picture: image
          ? `${image.getAttribute('src')} complete=${image.complete} natural=${image.naturalWidth}`
          : 'без картинки',
      };
    }));

    // Восемь из девяти демонстрационных сайтов имеют знак. Девятый —
    // «Яндекс»: в наборе simple-icons остался только Yandex Cloud, поэтому
    // ya.ru показывает запасную марку, и это верное поведение, а не сбой.
    await expect
      .poll(async () => (await census()).filter(row => !row.settled).map(row => row.name), { timeout: 10_000 })
      .toEqual(['Яндекс']);

    // Полный расклад уходит в журнал прогона: по нему видно, какой адрес
    // подставлен каждой марке и дошла ли картинка.
    for (const row of await census()) console.log(`${row.name} [${row.state}] ${row.picture}`);
  });
});
