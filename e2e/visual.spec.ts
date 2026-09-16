import { test, expect } from '@playwright/test';

test.describe('Nexus visual baselines', () => {
  test('desktop home', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveScreenshot('desktop-home.png', { fullPage: true });
  });

  test('desktop settings', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Настройки' }).click();
    await expect(page).toHaveScreenshot('desktop-tile-settings.png', { fullPage: true });
  });

  test('desktop calendar overlay', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Открыть календарь' }).click();
    await expect(page).toHaveScreenshot('desktop-calendar-popover.png', { fullPage: true });
  });

  test('mobile home', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveScreenshot('mobile-home.png', { fullPage: true });
  });

  test('mobile settings', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Настройки' }).click();
    await expect(page).toHaveScreenshot('mobile-tile-settings.png', { fullPage: true });
  });
});
