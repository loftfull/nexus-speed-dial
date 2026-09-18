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

  test('settings changes persist after returning to the app', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Настройки' }).first().click();
    await expect(page.getByRole('heading', { name: 'Настройки приложения' })).toBeVisible();
    const settings = page.locator('.settings-page');
    await settings.getByRole('button', { name: 'Оформление' }).click();
    await settings.getByRole('button', { name: /Тёмная/ }).first().click();
    await settings.getByRole('button', { name: 'Сохранить изменения' }).click();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('search engine setting drives the command-center web search action', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Настройки' }).first().click();
    const settings = page.locator('.settings-page');
    await settings.getByRole('button', { name: 'Поиск', exact: true }).click();
    await settings.getByLabel('Поисковая система').selectOption('Яндекс');
    await settings.getByRole('button', { name: 'Сохранить изменения' }).click();

    await page.keyboard.press('Control+K');
    await page.getByPlaceholder('Что вы хотите сделать?').fill('Nexus Speed Dial');
    await expect(page.getByRole('button', { name: /Искать в Яндекс/ })).toBeVisible();
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
