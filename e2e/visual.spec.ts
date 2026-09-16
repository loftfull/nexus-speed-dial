import { test, expect } from '@playwright/test';

test.describe('Nexus visual baselines', () => {
  test('desktop home', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Desktop baseline only.');
    await page.goto('/');
    await expect(page).toHaveScreenshot('desktop-home.png', { fullPage: true });
  });

  test('desktop settings', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Desktop baseline only.');
    await page.goto('/');
    await page.getByRole('button', { name: 'Настройки' }).click();
    await expect(page).toHaveScreenshot('desktop-settings.png', { fullPage: true });
  });

  test('desktop calendar overlay', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Desktop baseline only.');
    await page.goto('/');
    await page.getByRole('button', { name: 'Открыть календарь' }).click();
    await expect(page).toHaveScreenshot('desktop-calendar-popover.png', { fullPage: true });
  });

  test('mobile home', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Mobile baseline only.');
    await page.goto('/');
    await expect(page).toHaveScreenshot('mobile-home.png', { fullPage: true });
  });

  test('mobile settings', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Mobile baseline only.');
    await page.goto('/');
    await page.getByRole('button', { name: 'Разделы' }).click();
    await page.getByRole('button', { name: 'Настройки' }).click();
    await expect(page.getByRole('heading', { name: 'Настройки приложения' })).toBeVisible();
    await expect(page).toHaveScreenshot('mobile-settings.png', { fullPage: true });
  });
});
