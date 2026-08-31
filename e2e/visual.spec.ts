import { expect, test } from '@playwright/test';
import { resetApp } from './helpers';

test('desktop main glass reference', async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 1024 });
  await resetApp(page);
  await expect(page).toHaveScreenshot('desktop-main.png', { fullPage: true, animations: 'disabled' });
});

test('desktop tile settings glass reference', async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 1024 });
  await resetApp(page);
  await page.getByRole('button', { name: 'Настройки' }).click();
  await page.getByRole('button', { name: 'Открыть' }).click();
  await expect(page.getByTestId('tile-settings-panel')).toBeVisible();
  await expect(page).toHaveScreenshot('desktop-tile-settings.png', { fullPage: true, animations: 'disabled' });
});

test('tablet main glass reference', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 820 });
  await resetApp(page);
  await expect(page).toHaveScreenshot('tablet-main.png', { fullPage: true, animations: 'disabled' });
});

test('mobile main glass reference', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await resetApp(page);
  await expect(page).toHaveScreenshot('mobile-main.png', { fullPage: true, animations: 'disabled' });
});
