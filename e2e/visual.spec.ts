import { test, expect, type Page } from '@playwright/test';

const screenshotOptions = { maxDiffPixels: 250 } as const;

/**
 * Знаки сайтов грузятся асинхронно, поэтому снимок ждёт, пока каждая картинка
 * либо станет готовой, либо отвалится к монограмме. Иначе эталон зависел бы
 * от того, успела ли сеть.
 */
async function settle(page: Page) {
  // .nx-board — раскладка «рабочий стол проектов», которая стала главной по
  // умолчанию: плиток на ней нет, и ожидание .nx-tile висело до таймаута на
  // каждом снимке домашнего экрана.
  await page.waitForSelector('.nx-tile, .nx-empty, .nx-board');
  // `complete` истинно и для картинки, которая не загрузилась, поэтому ждём
  // не её, а состояния самого знака: готовая картинка получает класс `ready`,
  // а неудачная исчезает совсем и остаётся монограмма. Пока есть знак с
  // неотрисованной картинкой, снимок делать рано.
  await page.waitForFunction(
    () => document.querySelectorAll('.nx-mark img:not(.ready), .nx-dock-mark img:not(.ready)').length === 0,
    undefined,
    { timeout: 10_000 },
  ).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
}

async function prepareVisualPage(page: Page) {
  await page.clock.setFixedTime(new Date('2026-09-16T09:30:00.000Z'));
  await page.route('https://api.open-meteo.com/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        current: { temperature_2m: 18, weather_code: 2, relative_humidity_2m: 54, wind_speed_10m: 6 },
        daily: { temperature_2m_max: [20], temperature_2m_min: [11] },
      }),
    });
  });
}

test.describe('Nexus visual baselines', () => {
  test('desktop home', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Desktop baseline only.');
    await prepareVisualPage(page);
    await page.goto('/');
    await settle(page);
    await expect(page).toHaveScreenshot('desktop-home.png', { ...screenshotOptions, fullPage: true });
  });

  test('desktop settings', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Desktop baseline only.');
    await prepareVisualPage(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Настройки' }).first().click();
    await expect(page.getByRole('heading', { name: 'Настройки' })).toBeVisible();
    await expect(page).toHaveScreenshot('desktop-settings.png', { ...screenshotOptions, fullPage: true });
  });

  test('desktop palette', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Desktop baseline only.');
    await prepareVisualPage(page);
    await page.goto('/');
    await settle(page);
    await page.keyboard.press('Control+k');
    await expect(page.getByRole('combobox', { name: 'Поиск по всем закладкам и командам' })).toBeFocused();
    // В палитре свои знаки сайтов: она тоже должна устояться.
    await settle(page);
    await expect(page).toHaveScreenshot('desktop-palette.png', { ...screenshotOptions, fullPage: true });
  });

  test('desktop home in the dark theme', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Desktop baseline only.');
    await page.addInitScript(() => {
      const raw = localStorage.getItem('nexus-appearance');
      const state = raw ? JSON.parse(raw) : { accent: '#2f7cf6', wallpaper: 'aurora' };
      localStorage.setItem('nexus-appearance', JSON.stringify({ ...state, theme: 'dark' }));
    });
    await prepareVisualPage(page);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await settle(page);
    await expect(page).toHaveScreenshot('desktop-home-dark.png', { ...screenshotOptions, fullPage: true });
  });

  test('desktop calendar overlay', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Desktop baseline only.');
    await prepareVisualPage(page);
    await page.goto('/');
    await page.locator('[data-calendar-trigger]:visible').first().click();
    await expect(page).toHaveScreenshot('desktop-calendar-popover.png', { ...screenshotOptions, fullPage: true });
  });

  test('mobile home', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Mobile baseline only.');
    await prepareVisualPage(page);
    await page.goto('/');
    await settle(page);
    await expect(page).toHaveScreenshot('mobile-home.png', { ...screenshotOptions, fullPage: true });
  });

  test('mobile settings', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Mobile baseline only.');
    await prepareVisualPage(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Настройки' }).first().click();
    await expect(page.getByRole('heading', { name: 'Настройки' })).toBeVisible();
    await expect(page).toHaveScreenshot('mobile-settings.png', screenshotOptions);
  });
});
