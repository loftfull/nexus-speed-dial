import { test, expect } from '@playwright/test';

test.describe('Nexus shell', () => {
  test('shows the project grid and can open the add-site form', async ({ page }) => {
    await page.goto('/');
    // The heading names the selected project, or the selected category.
    await expect(page.locator('.nx-head h1')).not.toBeEmpty();
    const shown = await page.locator('.nx-tile').count();
    expect(shown).toBeGreaterThan(0);
    await expect(page.locator('.nx-head p')).toContainText(String(shown));

    await page.getByRole('button', { name: 'Добавить сайт' }).first().click();
    await expect(page.getByRole('heading', { name: 'Добавить сайт' })).toBeVisible();
  });

  test('category tabs scope the grid and switch between all sites and groups', async ({ page }) => {
    await page.goto('/');
    const tabs = page.locator('.nx-cats-tabs');
    await expect(tabs.getByRole('tab', { name: 'Все' })).toHaveAttribute('aria-selected', 'true');

    const all = await page.locator('.nx-tile').count();
    await tabs.getByRole('tab', { name: 'Соцсети' }).click();
    await expect(page.locator('.nx-head h1')).toHaveText('Соцсети');
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

    await page.locator('.nx-dock').getByRole('button', { name: 'Недавние' }).click();
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

    await page.locator('.nx-dock').getByRole('button', { name: 'Быстрый доступ' }).click();
    // The trash lives in the project panel on desktop and in the sections sheet on mobile.
    const panelTrash = page.locator('.nx-panel').getByRole('button', { name: 'Корзина' });
    if (await panelTrash.isVisible()) {
      await panelTrash.click();
    } else {
      await page.getByRole('button', { name: 'Разделы' }).click();
      await page.locator('.mobile-sections-card').getByRole('button', { name: 'Корзина', exact: true }).click();
    }
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
    await page.locator('.nx-dock').getByRole('button', { name: 'Настройки' }).click();
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

  test('search engine setting drives what the omnibox opens', async ({ page }) => {
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
    await page.locator('.nx-dock').getByRole('button', { name: 'Настройки' }).click();
    const settings = page.locator('.nx-settings');
    await settings.getByRole('button', { name: 'Поиск', exact: true }).click();
    await settings.getByLabel('Поисковая система').selectOption('Яндекс');
    await settings.getByRole('button', { name: 'Закрыть настройки' }).click();

    await page.getByLabel('Запрос или адрес').fill('Nexus Speed Dial');
    await page.getByLabel('Запрос или адрес').press('Enter');
    const opened = await page.evaluate(() => (window as typeof window & { __nexusLastOpen?: unknown[] }).__nexusLastOpen);
    expect(String(opened?.[0])).toContain('yandex');
  });

  test('the bookmark search unfolds out of the quick-access dock', async ({ page }) => {
    await page.goto('/');
    // No standing search field anywhere on the page.
    await expect(page.getByLabel('Поиск по закладкам')).toHaveCount(1);
    const dock = page.locator('.nx-dock');
    await expect(dock.locator('input')).toHaveCount(0);

    const total = await page.locator('.nx-tile').count();
    await dock.getByRole('button', { name: 'Поиск по закладкам' }).click();
    const field = dock.getByLabel('Поиск по закладкам');
    await expect(field).toBeFocused();
    await field.fill('Telegram');
    await expect(page.locator('.nx-tile')).toHaveCount(1);

    await field.press('Escape');
    await expect(dock.locator('input')).toHaveCount(0);
    await expect(page.locator('.nx-tile')).toHaveCount(total);
  });

  test('the dock unfolds from the side panel and both panels collapse to icons', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'The side panel is replaced by the sections sheet below 900px.');
    await page.goto('/');
    const dock = page.locator('.nx-dock');
    await expect(dock).toHaveClass(/open/);

    // The launcher sits opposite the dock, at the same height.
    const launcher = page.getByRole('button', { name: 'Свернуть панель быстрого доступа' });
    const launcherBox = await launcher.boundingBox();
    const dockBox = await dock.boundingBox();
    expect(Math.abs((launcherBox!.y + launcherBox!.height / 2) - (dockBox!.y + dockBox!.height / 2))).toBeLessThan(6);

    await launcher.click();
    await expect(dock).not.toHaveClass(/open/);
    await page.getByRole('button', { name: 'Развернуть панель быстрого доступа' }).click();
    await expect(dock).toHaveClass(/open/);

    // The side panel collapses to icons and remembers the choice.
    const panel = page.locator('.nx-panel');
    const wide = (await panel.boundingBox())!.width;
    await page.getByRole('button', { name: 'Свернуть боковое окно' }).click();
    await expect(page.locator('.nx-root')).toHaveClass(/panel-collapsed/);
    await expect.poll(async () => (await panel.boundingBox())!.width).toBeLessThan(wide);
    await page.reload();
    await expect(page.locator('.nx-root')).toHaveClass(/panel-collapsed/);
  });

  test('the clock, the weather and the calendar sit at the bottom of the side panel', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'The compact card replaces the side panel below 900px.');
    await page.goto('/');
    const foot = page.locator('.nx-panel-foot');
    await expect(foot.locator('.nx-clock')).toContainText(/\d{1,2}:\d{2}/);
    await expect(foot.locator('.nx-weather')).toBeVisible();
    await foot.locator('[data-calendar-trigger]').click();
    await expect(page.getByRole('dialog', { name: 'Календарь' })).toBeVisible();
  });

  test('mobile keeps the clock, the weather and the calendar in one compact card', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'The compact card replaces the project panel below 900px.');
    await page.goto('/');
    const card = page.locator('.nx-mobile-card');
    await expect(card).toBeVisible();
    await expect(card).toContainText(/\d{1,2}:\d{2}/);
    await expect(card.locator('.nx-mobile-weather')).toBeVisible();
    await card.getByRole('button', { name: 'Открыть календарь' }).click();
    await expect(page.getByRole('dialog', { name: 'Календарь' })).toBeVisible();
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
