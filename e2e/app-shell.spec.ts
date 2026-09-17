import { test, expect } from '@playwright/test';

test.describe('Nexus shell', () => {
  test('shows the Speed Dial grid and can open add-site form', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Быстрый доступ' })).toBeVisible();
    // The grid is scoped to the selected project, so assert it against the
    // current workspace summary rather than a hard-coded seed size.
    const shown = await page.locator('.site-card').count();
    expect(shown).toBeGreaterThan(0);
    await expect(page.locator('.workspace-head p')).toContainText(String(shown));
    await page.getByRole('button', { name: /Добавить сайт/ }).first().click();
    await expect(page.getByRole('heading', { name: 'Добавить сайт' })).toBeVisible();
  });

  test('production navigation hides unfinished sections and tile opens update recent history', async ({ page }) => {
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

    await expect(page.getByRole('button', { name: 'Загрузки' })).toHaveCount(0);
    const firstTile = page.locator('.site-card').first();
    const title = (await firstTile.locator('h3').textContent())?.trim();
    expect(title).toBeTruthy();

    await firstTile.click();
    await expect.poll(() => page.evaluate(() => (window as typeof window & { __nexusLastOpen?: unknown[] }).__nexusLastOpen)).toBeTruthy();
    const opened = await page.evaluate(() => (window as typeof window & { __nexusLastOpen?: unknown[] }).__nexusLastOpen);
    expect(opened?.[1]).toBe('_blank');
    expect(opened?.[2]).toBe('noopener,noreferrer');

    const recentTopNav = page.locator('.ref-tabs').getByRole('button', { name: 'Недавние' });
    if (await recentTopNav.isVisible()) {
      await recentTopNav.click();
    } else {
      await page.getByRole('button', { name: 'Разделы' }).click();
      await page.locator('.mobile-sections-card').getByRole('button', { name: 'Недавние', exact: true }).click();
    }
    await expect(page.locator('.history-item').filter({ hasText: title! })).toBeVisible();
  });

  test('calendar is an overlay and closes with Escape', async ({ page }) => {
    await page.goto('/');
    // Desktop opens it from the sidebar clock, mobile from the compact card.
    await page.locator('[data-calendar-trigger]:visible').first().click();
    await expect(page.getByRole('dialog', { name: 'Календарь' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Календарь' })).toBeHidden();
  });

  test('settings changes persist after returning to the app', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Настройки' }).click();
    await expect(page.getByRole('heading', { name: 'Настройки приложения' })).toBeVisible();
    await page.getByRole('button', { name: 'Плитки сайтов' }).click();
    await page.getByRole('button', { name: 'Neumorphic' }).click();
    await page.getByRole('button', { name: 'Сохранить изменения' }).click();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-tile-preset', 'neumorphic');
  });

  test('search engine setting drives the command-center web search action', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Настройки' }).click();
    await page.getByRole('button', { name: 'Поиск', exact: true }).click();
    await page.getByLabel('Поисковая система').selectOption('Яндекс');
    await page.getByRole('button', { name: 'Сохранить изменения' }).click();

    await page.keyboard.press('Control+K');
    await page.getByPlaceholder('Что вы хотите сделать?').fill('Nexus Speed Dial');
    await expect(page.getByRole('button', { name: /Искать в Яндекс/ })).toBeVisible();
  });

  test('mobile keeps the clock, the weather and the calendar in one compact card', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'The compact card replaces the sidebar footer below 680px.');
    await page.goto('/');
    const card = page.locator('.mobile-timecard');
    await expect(card).toBeVisible();
    await expect(card).toContainText(/\d{1,2}:\d{2}/);
    await expect(card.locator('.mobile-timecard-weather')).toBeVisible();
    await card.click();
    await expect(page.getByRole('dialog', { name: 'Календарь' })).toBeVisible();
    await card.click();
    await expect(page.getByRole('dialog', { name: 'Календарь' })).toBeHidden();
  });

  test('mobile replaces the persistent sidebar with sections sheet', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Mobile navigation behavior is only valid for the mobile project.');
    await page.goto('/');
    await expect(page.locator('.sidebar')).toBeHidden();
    await page.getByRole('button', { name: 'Разделы' }).click();
    await expect(page.getByText('Разделы и проекты')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Загрузки' })).toHaveCount(0);
  });
});
