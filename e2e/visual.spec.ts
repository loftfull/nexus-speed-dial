import { expect, test } from '@playwright/test';
import { resetApp } from './helpers';

test('desktop Pure Speed Dial reference', async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 1024 });
  await resetApp(page);
  await expect(page).toHaveScreenshot('desktop-main.png', { fullPage: true, animations: 'disabled' });
});

test('desktop user settings reference', async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 1024 });
  await resetApp(page);
  await page.getByTestId('settings-button').click();
  await expect(page.getByTestId('settings-panel')).toBeVisible();
  await expect(page).toHaveScreenshot('desktop-settings.png', { fullPage: true, animations: 'disabled' });
});

test('tablet Pure Speed Dial reference', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 820 });
  await resetApp(page);
  await expect(page).toHaveScreenshot('tablet-main.png', { fullPage: true, animations: 'disabled' });
});

test('mobile Pure Speed Dial reference', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await resetApp(page);
  await expect(page).toHaveScreenshot('mobile-main.png', { fullPage: true, animations: 'disabled' });
});

test('mobile spaces and categories drawer reference', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await resetApp(page);
  await page.getByRole('button', { name: 'Открыть пространства и категории' }).click();
  await expect(page).toHaveScreenshot('mobile-navigation.png', { animations: 'disabled' });
});
