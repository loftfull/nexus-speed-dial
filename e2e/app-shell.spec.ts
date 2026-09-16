import { test, expect } from '@playwright/test';

test.describe('Nexus shell', () => {
  test('shows the Speed Dial grid and can open add-site form', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Быстрый доступ' })).toBeVisible();
    await expect(page.locator('.site-card')).toHaveCount(12);
    await page.getByRole('button', { name: /Добавить сайт/ }).first().click();
    await expect(page.getByRole('heading', { name: 'Добавить сайт' })).toBeVisible();
  });

  test('calendar is an overlay and closes with Escape', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Открыть календарь' }).click();
    await expect(page.getByRole('dialog', { name: 'Календарь' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Календарь' })).toBeHidden();
  });

  test('settings changes persist after returning to the app', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Настройки' }).click();
    await page.getByRole('button', { name: 'Плитки сайтов' }).click();
    await page.getByRole('button', { name: 'Neumorphic' }).click();
    await page.getByRole('button', { name: 'Сохранить изменения' }).click();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-tile-preset', 'neumorphic');
  });

  test('mobile replaces the persistent sidebar with sections sheet', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.sidebar')).toBeHidden();
    await page.getByRole('button', { name: 'Разделы' }).click();
    await expect(page.getByText('Разделы и проекты')).toBeVisible();
  });
});
