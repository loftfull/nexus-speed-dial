import { test, expect, type Page } from '@playwright/test';

const screenshotOptions = { maxDiffPixels: 250 } as const;

async function prepareVisualPage(page: Page) {
  await page.clock.setFixedTime(new Date('2026-09-16T09:30:00.000Z'));
  await page.route('https://api.open-meteo.com/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ current: { temperature_2m: 18, weather_code: 2 } }),
    });
  });
}

test.describe('Nexus visual baselines', () => {
  test('desktop home', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Desktop baseline only.');
    await prepareVisualPage(page);
    await page.goto('/');
    await expect(page).toHaveScreenshot('desktop-home.png', { ...screenshotOptions, fullPage: true });
  });

  test('desktop settings', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Desktop baseline only.');
    await prepareVisualPage(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Настройки' }).click();
    await expect(page).toHaveScreenshot('desktop-settings.png', { ...screenshotOptions, fullPage: true });
  });

  test('desktop calendar overlay', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Desktop baseline only.');
    await prepareVisualPage(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Открыть календарь' }).click();
    await expect(page).toHaveScreenshot('desktop-calendar-popover.png', { ...screenshotOptions, fullPage: true });
  });

  test('mobile home', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Mobile baseline only.');
    await prepareVisualPage(page);
    await page.goto('/');
    await expect(page).toHaveScreenshot('mobile-home.png', { ...screenshotOptions, fullPage: true });
  });

  test('mobile settings', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Mobile baseline only.');
    await prepareVisualPage(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Настройки' }).click();
    await expect(page.getByRole('heading', { name: 'Настройки приложения' })).toBeVisible();
    await expect(page).toHaveScreenshot('mobile-settings.png', screenshotOptions);
  });
});
