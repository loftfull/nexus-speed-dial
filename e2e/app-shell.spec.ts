import { test, expect } from '@playwright/test';

test.describe('Nexus shell', () => {
  test('shows the project grid and can open the add-site form', async ({ page }) => {
    await page.goto('/');
    // The category tabs name the scope, so the page itself carries only the count.
    await expect(page.locator('.nx-head p')).not.toBeEmpty();
    const shown = await page.locator('.nx-tile').count();
    expect(shown).toBeGreaterThan(0);
    await expect(page.locator('.nx-head p')).toContainText(String(shown));

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
    await page.locator('.nx-quick').getByRole('button', { name: 'Добавить сайт' }).click();
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

  test('category tabs scope the grid and switch between all sites and groups', async ({ page }) => {
    await page.goto('/');
    const tabs = page.locator('.nx-cats-tabs');
    await expect(tabs.getByRole('tab', { name: 'Все' })).toHaveAttribute('aria-selected', 'true');

    const all = await page.locator('.nx-tile').count();
    await tabs.getByRole('tab', { name: 'Соцсети' }).click();
    await expect(page.locator('.nx-cats-tabs').getByRole('tab', { name: 'Соцсети' })).toHaveAttribute('aria-selected', 'true');
    const scoped = await page.locator('.nx-tile').count();
    expect(scoped).toBeGreaterThan(0);
    expect(scoped).toBeLessThan(all);
    await expect(page.locator('.nx-group')).toHaveCount(0);

    await page.getByRole('button', { name: 'Группы категории' }).click();
    const blocks = page.locator('.nx-group');
    expect(await blocks.count()).toBeGreaterThan(1);
    expect(await page.locator('.nx-group .nx-tile').count()).toBe(scoped);

    // The chosen view mode survives a reload.
    await page.reload();
    await expect(page.locator('.nx-group').first()).toBeVisible();
  });

  test('a tile opens in a new tab and lands in the recent section', async ({ page }) => {
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

    await page.locator('.nx-quick').getByRole('button', { name: 'Недавние' }).click();
    await expect(page.locator('.nx-tile-name').filter({ hasText: title! }).first()).toBeVisible();
  });

  test('tile actions hide behind a menu and move a site to the trash', async ({ page }) => {
    await page.goto('/');
    const first = page.locator('.nx-tile').first();
    const title = (await first.locator('.nx-tile-name').textContent())?.trim();
    const before = await page.locator('.nx-tile').count();

    await expect(page.getByRole('menu')).toHaveCount(0);
    await first.getByRole('button', { name: /Действия для/ }).click();
    await first.getByRole('menuitem', { name: 'Удалить' }).click();
    await expect(page.locator('.nx-tile')).toHaveCount(before - 1);

    // Sections live in the quick-access panel now.
    await page.locator('.nx-quick').getByRole('button', { name: 'Корзина' }).click();
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

    await settings.getByLabel('Тема').selectOption('dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await settings.getByRole('button', { name: 'Плитки' }).click();
    const address = settings.getByRole('switch', { name: 'Адрес' });
    await address.click();
    await expect(address).toHaveAttribute('aria-checked', 'true');
    // На узком экране состав подписи задаёт мобильная раскладка, а не этот переключатель.
    const wide = testInfo.project.name !== 'mobile';
    if (wide) await expect(page.locator('.nx-tile-sub').first()).toBeVisible();

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    if (wide) await expect(page.locator('.nx-tile-sub').first()).toBeVisible();
  });

  test('search engine setting drives what the palette opens', async ({ page }) => {
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

    await page.locator('.nx-quick').getByRole('button', { name: 'Поиск и команды' }).click();
    const field = page.getByRole('combobox', { name: 'Поиск по всем закладкам и командам' });
    await field.fill('как сверстать сетку');
    await page.getByRole('option', { name: /Искать/ }).click();
    const opened = await page.evaluate(() => (window as typeof window & { __nexusLastOpen?: unknown[] }).__nexusLastOpen);
    expect(String(opened?.[0])).toContain('yandex');
  });

  test('the search window exists only on call: Ctrl K and the panel button', async ({ page }) => {
    await page.goto('/');
    // Нигде на странице нет постоянного поля поиска — только вызов.
    await expect(page.getByRole('combobox', { name: 'Поиск по всем закладкам и командам' })).toHaveCount(0);
    await expect(page.locator('.nx-quick input')).toHaveCount(0);
    await expect(page.locator('.nx-palette')).toHaveCount(0);

    await page.keyboard.press('Control+k');
    const field = page.getByRole('combobox', { name: 'Поиск по всем закладкам и командам' });
    await expect(field).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('.nx-palette')).toHaveCount(0);

    await page.locator('.nx-quick').getByRole('button', { name: 'Поиск и команды' }).click();
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
    const first = page.getByRole('option').first();
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
      for (const el of document.querySelectorAll('.nx-mobile-top, .nx-cats > *, .nx-head')) {
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

    // Худший случай: самое длинное имя проекта и выбранная категория,
    // из-за которой в строке появляется ещё одна кнопка.
    for (let step = 0; step < 6; step += 1) {
      const name = await page.locator('.nx-project-chip b').textContent();
      if (name?.includes('Развлеч')) break;
      await page.locator('.nx-project-chip').click();
      await page.waitForTimeout(340);
    }
    await page.locator('.nx-cats-tabs .nx-cat').nth(1).click();
    const worst = await measure();
    expect(worst.first).toBeLessThan(worst.height * 0.25);
    expect(worst.scrollWidth).toBe(worst.inner);
  });

  test('mobile puts the arrangement switcher next to the project button', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Переключатель раскладки живёт только на узком экране.');
    await page.goto('/');
    const chip = page.locator('.nx-project-chip');
    const views = page.getByRole('group', { name: 'Вид сетки на узком экране' });
    const chipBox = (await chip.boundingBox())!;
    const viewsBox = (await views.boundingBox())!;
    // Одна строка: вертикальные центры совпадают, а по горизонтали не пересекаются.
    expect(Math.abs((chipBox.y + chipBox.height / 2) - (viewsBox.y + viewsBox.height / 2))).toBeLessThan(6);
    expect(viewsBox.x).toBeGreaterThan(chipBox.x + chipBox.width);

    // Вне «Быстрого доступа» строки категорий нет, но переключатель остаётся.
    await page.locator('.nx-quick').getByRole('button', { name: 'Корзина' }).click();
    await expect(page.locator('.nx-cats')).toHaveCount(0);
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
    await page.locator('.nx-cats-tabs .nx-cat').nth(1).click();
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

  test('the favourites strip stays the same in every project and opens a site', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'На узком экране полосы нет: там дорога высота.');
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
    const bar = page.getByRole('region', { name: 'Избранное во всех проектах' });
    // Figma и Notion отмечены звездой и лежат в «Работе», а открыт проект «Дом».
    await expect(bar.getByRole('button', { name: /Figma/ })).toBeVisible();
    await expect(page.locator('.nx-tile', { hasText: 'Figma' })).toHaveCount(0);

    // Полоса не зависит от того, какое дерево открыто.
    await page.getByRole('button', { name: 'Проект «Покупки»' }).first().click();
    await expect(bar.getByRole('button', { name: /Figma/ })).toBeVisible();

    await bar.getByRole('button', { name: /Figma/ }).click();
    const opened = await page.evaluate(() => (window as typeof window & { __nexusLastOpen?: unknown[] }).__nexusLastOpen);
    expect(String(opened?.[0])).toContain('figma.com');
  });

  test('the favourites strip obeys its three settings', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'На узком экране полосы нет.');
    await page.goto('/');
    const bar = page.getByRole('region', { name: 'Избранное во всех проектах' });
    await expect(bar).toBeVisible();
    const chip = bar.getByRole('button').first();
    await expect(chip).toContainText('Figma');

    await page.getByRole('button', { name: 'Настройки' }).first().click();
    const settings = page.locator('.nx-settings');
    await settings.getByRole('button', { name: 'Панели', exact: true }).click();
    await settings.getByRole('switch', { name: 'Названия на полосе' }).click();
    await expect(chip).not.toContainText('Figma');

    await settings.getByRole('switch', { name: 'Полоса избранного' }).click();
    await expect(bar).toHaveCount(0);
    // Выключенная полоса гасит свои настройки, а не оставляет их мёртвыми.
    await expect(settings.getByRole('switch', { name: 'Названия на полосе' })).toBeDisabled();
    await expect(settings.getByLabel('Сколько показывать')).toBeDisabled();
  });

  test('the quick-access panel and the dock are separate and never share the bar', async ({ page }) => {
    await page.goto('/');
    const quick = page.locator('.nx-quick');
    const dock = page.locator('.nx-dock');
    await expect(quick).toHaveClass(/open/);
    await expect(dock).not.toHaveClass(/open/);

    // The half-hidden handle at the bottom edge calls the dock and folds the quick panel away.
    const handle = page.getByRole('button', { name: 'Показать док-панель' });
    const handleBox = (await handle.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(handleBox.y).toBeLessThan(viewport.height);
    expect(handleBox.y + handleBox.height).toBeGreaterThan(viewport.height);

    await handle.click();
    await expect(dock).toHaveClass(/open/);
    await expect(quick).not.toHaveClass(/open/);
    await page.getByRole('button', { name: 'Скрыть док-панель' }).click();
    await expect(dock).not.toHaveClass(/open/);

    // The quick-access panel has its own separate toggle: in the side window on
    // desktop, in the compact header below 900px.
    const quickToggle = page.getByRole('button', { name: 'Панель быстрого доступа' }).first();
    await quickToggle.click();
    await expect(quick).toHaveClass(/open/);
    await quickToggle.click();
    await expect(quick).not.toHaveClass(/open/);
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
    await page.getByRole('button', { name: 'Показать док-панель' }).click();
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
    const when = page.locator('.nx-when');
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

  test('the explorer tree opens a project, then its category, then folds back', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'The side panel is replaced by the sections sheet below 900px.');
    await page.goto('/');
    const tree = page.locator('.nx-panel');
    // Collapsed: only project names are listed.
    await expect(tree.locator('.nx-tree-children')).toHaveCount(0);

    await tree.getByRole('button', { name: 'Дом' }).click();
    await expect(tree.getByRole('button', { name: 'Соцсети' })).toBeVisible();

    await tree.getByRole('button', { name: 'Соцсети' }).click();
    await expect(tree.getByRole('button', { name: 'Чаты' })).toBeVisible();

    // A group narrows the grid to its own sites.
    const all = await page.locator('.nx-tile').count();
    await tree.getByRole('button', { name: 'Чаты' }).click();
    const scoped = await page.locator('.nx-tile').count();
    expect(scoped).toBeGreaterThan(0);
    expect(scoped).toBeLessThan(all);

    // Pressing the project again folds the whole branch away.
    await tree.getByRole('button', { name: 'Дом' }).click();
    await expect(tree.locator('.nx-tree-children')).toHaveCount(0);
  });

  test('the project name appears once on the page, in the switcher and not as a heading', async ({ page }) => {
    await page.goto('/');
    const chip = page.locator('[data-project-switch]');
    const project = (await chip.locator('b').textContent())!.trim();
    expect(project).toBeTruthy();
    // The switcher is the only place the main area names the project: no heading,
    // no repeat in the subtitle.
    await expect(page.locator('.nx-head h1')).toHaveCount(0);
    await expect(page.locator('.nx-head p')).toContainText('Все сайты');
    await expect(page.locator('.nx-head')).not.toContainText(project);
    expect(await page.locator('.nx-main').getByText(project, { exact: true }).count()).toBe(1);
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
    await expect(page.getByText('Разделы и проекты')).toBeVisible();
    await page.locator('.mobile-sections-card').getByRole('button', { name: 'Заметки', exact: true }).click();
    await expect(page.locator('.nx-head h1')).toHaveText('Заметки');
  });

  test('project creation uses the Nexus dialog instead of window.prompt', async ({ page }) => {
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

    const sidebarAddProject = page.locator('.nx-panel').getByRole('button', { name: 'Добавить проект' }).first();
    if (await sidebarAddProject.isVisible()) {
      await sidebarAddProject.click();
    } else {
      await page.getByRole('button', { name: 'Разделы' }).click();
      await page.locator('.mobile-sections-card').getByRole('button', { name: 'Добавить проект' }).click();
    }
    const dialog = page.getByRole('dialog', { name: 'Новый проект' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('textbox', { name: 'Название проекта' }).fill('Проект E2E');
    await dialog.getByRole('button', { name: 'Создать' }).click();

    const sidebarProject = page.locator('.nx-panel').getByRole('button', { name: 'Проект «Проект E2E»' });
    if (await sidebarProject.isVisible()) {
      await expect(sidebarProject).toBeVisible();
    } else {
      await page.getByRole('button', { name: 'Разделы' }).click();
      await expect(page.locator('.mobile-sections-card').getByRole('button', { name: 'Проект «Проект E2E»' })).toBeVisible();
    }
    expect(await page.evaluate(() => (window as typeof window & { __nexusNativePrompt?: boolean }).__nexusNativePrompt)).toBeFalsy();
  });

  test('trash clearing uses the Nexus destructive dialog instead of window.confirm', async ({ page }) => {
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
    await page.locator('.nx-quick').getByRole('button', { name: 'Корзина' }).click();
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
    await page.getByLabel('Фон').selectOption('mint');
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

  // ── проводник ──────────────────────────────────────────────────────────
  test('the selected project and category get a coloured icon, not just a highlight', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'The explorer lives in the side window.');
    await page.goto('/');
    const project = page.locator('.nx-panel .nx-tree-row', { hasText: 'Работа' }).first();
    await project.click();

    const tint = await project.evaluate(el => getComputedStyle(el).getPropertyValue('--nx-node').trim());
    expect(tint).toMatch(/^#[0-9a-f]{6}$/i);
    const iconColour = await project.locator('svg').nth(1).evaluate(el => getComputedStyle(el).color);
    const muted = await page.locator('.nx-panel .nx-tree-row:not(.on) svg').first().evaluate(el => getComputedStyle(el).color);
    expect(iconColour).not.toBe(muted);

    const category = page.locator('.nx-panel .nx-tree-row', { hasText: 'Инструменты' }).first();
    await category.click();
    await expect(category).toHaveClass(/ on/);
    const categoryIcon = await category.locator('svg').nth(1).evaluate(el => getComputedStyle(el).color);
    expect(categoryIcon).not.toBe(muted);
  });

  test('the explorer keeps a single branch open', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'The explorer lives in the side window.');
    await page.goto('/');
    await page.getByRole('button', { name: 'Проект «Дом»' }).click();
    await expect(page.getByRole('button', { name: 'Категория «Соцсети»' })).toBeVisible();
    await page.getByRole('button', { name: 'Проект «Работа»' }).click();
    // Opening another project folds the first one away instead of stacking branches.
    await expect(page.getByRole('button', { name: 'Категория «Соцсети»' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Категория «Инструменты»' })).toBeVisible();
  });

  // ── кнопка проекта ─────────────────────────────────────────────────────
  test('the project button before «Все» steps through the projects', async ({ page }, testInfo) => {
    await page.goto('/');
    const chip = page.locator('[data-project-switch]');
    const tabs = page.locator('.nx-cats-tabs');
    // It stands before the first tab.
    const chipBox = (await chip.boundingBox())!;
    const allTab = (await tabs.getByRole('tab', { name: 'Все' }).boundingBox())!;
    // Wide: left of the tab. Narrow: the tabs wrap to their own line, so above it.
    if (Math.abs(chipBox.y - allTab.y) < 6) expect(chipBox.x + chipBox.width).toBeLessThanOrEqual(allTab.x + 1);
    else expect(chipBox.y).toBeLessThan(allTab.y);

    const first = (await chip.locator('b').textContent())!.trim();
    const firstTabs = (await tabs.textContent())!;
    await chip.click();
    await expect.poll(async () => (await chip.locator('b').textContent())!.trim()).not.toBe(first);
    const second = (await chip.locator('b').textContent())!.trim();
    // Everything tied to the project follows: the tabs above the grid and, on a
    // wide screen, the branch the side window has open.
    expect((await tabs.textContent())!).not.toBe(firstTabs);
    if (testInfo.project.name !== 'mobile') {
      await expect(page.locator('.nx-panel .nx-tree-row.on').first()).toContainText(second);
    }
  });

  // ── мобильные раскладки ────────────────────────────────────────────────
  const columns = (page: import('@playwright/test').Page) =>
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
      '--nx-tile-focus-width', '--nx-tile-drag-opacity', '--nx-tile-easing', '--nx-tile-load']
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

  test('каждый из девяти готовых видов даёт свою плитку', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Узкий экран ведёт свою раскладку.');
    await page.goto('/');
    await openTiles(page);
    const presets = page.locator('.nx-preset');
    await expect(presets).toHaveCount(9);

    const seen = new Set<string>();
    for (let index = 0; index < 9; index += 1) {
      await presets.nth(index).click();
      await page.waitForTimeout(60);
      seen.add(await tileFingerprint(page));
    }
    // Девять разных отпечатков: ни один готовый вид не повторяет другой.
    expect(seen.size).toBe(9);
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
});
