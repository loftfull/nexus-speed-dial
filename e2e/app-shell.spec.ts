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

  test('the compact settings panel applies changes on the page behind it', async ({ page }) => {
    await page.goto('/');
    await page.locator('.nx-quick').getByRole('button', { name: 'Настройки' }).click();
    const settings = page.locator('.nx-settings');
    await expect(settings).toBeVisible();
    // The panel is not modal: the grid stays visible and keeps working next to it.
    await expect(page.locator('.nx-tile').first()).toBeVisible();

    await settings.getByRole('button', { name: /Тёмная/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await settings.getByRole('button', { name: 'Плитки' }).click();
    await settings.getByRole('switch', { name: 'Адрес сайта' }).click();
    await expect(page.locator('.nx-tile-sub').first()).toBeVisible();

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('.nx-tile-sub').first()).toBeVisible();
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
    await page.locator('.nx-quick').getByRole('button', { name: 'Настройки' }).click();
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
    await page.getByRole('button', { name: 'Развернуть панель быстрого доступа' }).first().click();
    await expect(quick).toHaveClass(/open/);
    await quick.getByRole('button', { name: 'Свернуть панель быстрого доступа' }).click();
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

  test('the page does not repeat the project name that the side panel already shows', async ({ page }) => {
    await page.goto('/');
    const project = (await page.locator('.nx-panel .nx-link.on span').first().textContent())!.trim();
    expect(project).toBeTruthy();
    await expect(page.locator('.nx-head h1')).toHaveCount(0);
    await expect(page.locator('.nx-head p')).toContainText('Все сайты');
    await expect(page.locator('.nx-main')).not.toContainText(project);
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
});
