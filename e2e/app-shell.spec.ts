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

  test('a tile shows its monogram and never a pending site icon', async ({ page }) => {
    await page.goto('/');
    const mark = page.locator('.nx-mark').first();
    await expect(mark).not.toBeEmpty();
    // The icon is hidden until it has loaded. A CSS display rule can silently
    // override the hidden attribute, and then the browser paints its
    // broken-image placeholder over the monogram, so assert the computed value.
    const display = await mark.evaluate(element => {
      const probe = document.createElement('img');
      probe.hidden = true;
      element.appendChild(probe);
      const value = getComputedStyle(probe).display;
      probe.remove();
      return value;
    });
    expect(display).toBe('none');
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

  test('search engine setting drives what the dock search opens', async ({ page }) => {
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

    await page.locator('.nx-quick').getByRole('button', { name: 'Поиск по закладкам' }).click();
    const field = page.getByLabel('Поиск по закладкам или адрес');
    await field.fill('Nexus Speed Dial');
    await field.press('Enter');
    const opened = await page.evaluate(() => (window as typeof window & { __nexusLastOpen?: unknown[] }).__nexusLastOpen);
    expect(String(opened?.[0])).toContain('yandex');
  });

  test('the bookmark search unfolds out of the quick-access panel', async ({ page }) => {
    await page.goto('/');
    // No standing search field anywhere on the page: only the panel button.
    await expect(page.getByLabel('Поиск по закладкам или адрес')).toHaveCount(0);
    const quick = page.locator('.nx-quick');
    await expect(quick.locator('input')).toHaveCount(0);

    const total = await page.locator('.nx-tile').count();
    await quick.getByRole('button', { name: 'Поиск по закладкам' }).click();
    const field = quick.getByLabel('Поиск по закладкам или адрес');
    await expect(field).toBeFocused();
    await field.fill('Telegram');
    await expect(page.locator('.nx-tile')).toHaveCount(1);

    await field.press('Escape');
    await expect(quick.locator('input')).toHaveCount(0);
    await expect(page.locator('.nx-tile')).toHaveCount(total);
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
    for (const label of ['Общие', 'Оформление', 'Плитки', 'Боковое окно', 'Мобильная версия',
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
    await openSettings(page, 'Боковое окно');
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
      return nodes.length + ':' + nodes.map(node => getComputedStyle(node).display + '|' + getComputedStyle(node).width).join(',');
    };
    const rootStyle = getComputedStyle(root);
    // Параметры наведения и нажатия живут в переменных: их читают правила :hover/:active.
    const vars = ['--nx-tile-lift', '--nx-tile-hover-scale', '--nx-tile-glow', '--nx-tile-press-scale',
      '--nx-tile-focus-width', '--nx-tile-drag-opacity', '--nx-tile-easing', '--nx-tile-load']
      .map(name => name + '=' + rootStyle.getPropertyValue(name).trim()).join(';');
    const tileStyle = getComputedStyle(tile);
    const gridStyle = getComputedStyle(grid);
    return [
      gridStyle.gridTemplateColumns, gridStyle.gap,
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
    const blur = page.getByLabel('Размытие фона');
    await expect(blur).toBeDisabled();
    await expect(page.locator('.nx-cell.off', { hasText: 'Размытие фона' })).toContainText('прозрачной подложке');

    // Прозрачная подложка включает его обратно.
    await page.getByLabel('Подложка').selectOption('translucent');
    await expect(blur).toBeEnabled();
  });

  test('образцы показывают наведение и нажатие отдельно от обычного состояния', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Узкий экран ведёт свою раскладку.');
    await page.goto('/');
    await openTiles(page);
    // Берём вид с заметной реакцией, чтобы состояния расходились наверняка.
    await page.getByRole('button', { name: 'Готовый вид «Приподнятый»' }).click();

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
    for (const fold of ['Общие', 'Оформление', 'Боковое окно', 'Мобильная версия', 'Поиск', 'Погода', 'Приватность']) {
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
