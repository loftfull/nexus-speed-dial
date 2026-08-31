import { expect, test } from '@playwright/test';
import { resetApp } from './helpers';

test.beforeEach(async ({ page }) => { await resetApp(page); });

test('calendar opens as overlay without changing workspace width', async ({ page }) => {
  const shell = page.getByTestId('app-shell');
  const before = await shell.boundingBox();
  await page.getByTestId('date-button').click();
  await expect(page.getByTestId('calendar-popover')).toBeVisible();
  const after = await shell.boundingBox();
  expect(before).not.toBeNull();
  expect(after).not.toBeNull();
  expect(Math.abs((before?.width ?? 0) - (after?.width ?? 0))).toBeLessThan(1);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('calendar-popover')).toBeHidden();
});

test('tile settings update CSS immediately and persist after reload', async ({ page }) => {
  await page.getByRole('button', { name: 'Настройки' }).click();
  await expect(page.getByRole('heading', { name: 'Настройки', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Открыть' }).click();
  await expect(page.getByTestId('tile-settings-panel')).toBeVisible();
  const radius = page.getByLabel('Радиус');
  await radius.evaluate((element) => {
    const input = element as HTMLInputElement;
    input.value = '24';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue('--tile-radius'))).toBe('24px');
  await page.reload();
  await expect.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue('--tile-radius'))).toBe('24px');
});

test('mobile navigation replaces persistent sidebar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.getByRole('button', { name: 'Открыть разделы' }).click();
  await expect(page.getByText('Разделы и категории')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Добавить категорию' })).toBeVisible();
});

test('dock opens dedicated sections', async ({ page }) => {
  for (const section of ['Избранное', 'Недавние', 'Загрузки', 'Заметки', 'Настройки'] as const) {
    await page.getByRole('button', { name: section }).click();
    await expect(page.getByRole('heading', { name: section, level: 1 })).toBeVisible();
  }
});

test('notes are stored and survive reload', async ({ page }) => {
  await page.getByRole('button', { name: 'Заметки' }).click();
  await page.getByRole('button', { name: 'Новая заметка' }).click();
  await page.getByPlaceholder('Заголовок').fill('Контрольный план');
  await page.getByPlaceholder('Текст заметки').fill('Проверить glass UI и release gate');
  await page.getByRole('button', { name: 'Сохранить' }).click();
  await expect(page.getByRole('heading', { name: 'Контрольный план', level: 3 })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Заметки' }).click();
  await expect(page.getByRole('heading', { name: 'Контрольный план', level: 3 })).toBeVisible();
});

test('omnibox shows local suggestions before web search', async ({ page }) => {
  await page.getByLabel('Введите запрос или адрес').fill('git');
  const suggestions = page.getByTestId('omnibox-suggestions');
  await expect(suggestions).toBeVisible();
  await expect(suggestions.getByText('GitHub')).toBeVisible();
});

test('backup import restores validated Nexus data', async ({ page }) => {
  await page.getByRole('button', { name: 'Настройки' }).click();
  const controls = page.getByTestId('data-controls');
  await expect(controls).toBeVisible();
  const payload = {
    schema: 'nexus-speed-dial', version: 1, exportedAt: '2026-08-31T12:00:00.000Z', data: {
      tileSettings: {},
      projects: [{ id: 'home', name: 'Дом', icon: 'home' }], categories: [], sites: [], history: [],
      notes: [{ id: 'imported', title: 'Импортировано', body: 'Резервная копия работает', projectId: 'home', createdAt: '2026-08-31T12:00:00.000Z', updatedAt: '2026-08-31T12:00:00.000Z' }],
      weatherLocation: { mode: 'city', city: 'Минск' },
    },
  };
  await controls.locator('input[type="file"]').setInputFiles({ name: 'nexus.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(payload)) });
  await expect(page.getByRole('status')).toHaveText('Данные восстановлены');
  await page.getByRole('button', { name: 'Заметки' }).click();
  await expect(page.getByRole('heading', { name: 'Импортировано', level: 3 })).toBeVisible();
});
