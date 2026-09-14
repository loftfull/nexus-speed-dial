import { expect, test } from '@playwright/test';
import { resetApp } from './helpers';

test.beforeEach(async ({ page }) => { await resetApp(page); });

test('calendar opens as overlay without changing workspace width', async ({ page }) => {
  const shell = page.getByTestId('app-shell');
  const dateButton = page.getByTestId('date-button');
  const before = await shell.boundingBox();
  await dateButton.click();
  await expect(page.getByTestId('calendar-popover')).toBeVisible();
  const after = await shell.boundingBox();
  expect(before).not.toBeNull();
  expect(after).not.toBeNull();
  expect(Math.abs((before?.width ?? 0) - (after?.width ?? 0))).toBeLessThan(1);
  await dateButton.click();
  await expect(page.getByTestId('calendar-popover')).toBeHidden();
});

test('settings preferences apply immediately and persist after reload', async ({ page }) => {
  await page.getByTestId('settings-button').click();
  const panel = page.getByTestId('settings-panel');
  await expect(panel).toBeVisible();
  await panel.getByLabel('Тема').selectOption('dark');
  await panel.getByLabel('Плотность').selectOption('compact');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-density', 'compact');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-density', 'compact');
});

test('content modes remain scoped to the active space', async ({ page }) => {
  await page.getByRole('navigation', { name: 'Режим сайтов' }).getByRole('button', { name: 'Избранное' }).click();
  await expect(page.getByRole('link', { name: 'Telegram' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'GitHub' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Работа', exact: true }).click();
  await expect(page.getByRole('link', { name: 'GitHub' })).toBeVisible();
});

test('category tree filters the same workspace grid', async ({ page }) => {
  await page.getByRole('button', { name: /^Новости/ }).click();
  await expect(page.getByRole('link', { name: 'РБК' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Telegram' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Все сайты' }).click();
  await expect(page.getByRole('link', { name: 'Telegram' })).toBeVisible();
});

test('site can be added and survives reload', async ({ page }) => {
  await page.getByRole('button', { name: 'Добавить сайт' }).click();
  await page.getByRole('textbox', { name: 'Адрес', exact: true }).fill('example.com');
  await page.getByLabel('Название').fill('Example');
  await page.getByRole('contentinfo').getByRole('button', { name: 'Сохранить' }).click();
  await expect(page.getByRole('link', { name: 'Example' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('link', { name: 'Example' })).toBeVisible();
});

test('omnibox searches saved sites globally by default', async ({ page }) => {
  await page.getByLabel('Найти сайт или ввести адрес').fill('git');
  const suggestions = page.getByTestId('omnibox-suggestions');
  await expect(suggestions).toBeVisible();
  await expect(suggestions.getByRole('button', { name: /GitHub github\.com Работа/i })).toBeVisible();
});

test('mobile navigation uses one spaces and categories drawer', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.getByRole('button', { name: 'Открыть пространства и категории' }).click();
  await expect(page.getByText('Пространства и категории')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Добавить пространство' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Добавить категорию' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Все сайты' })).toBeVisible();
});

test('mobile status opens and closes the shared calendar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const calendarButton = page.getByRole('button', { name: 'Открыть календарь' });
  await calendarButton.click();
  await expect(page.getByTestId('calendar-popover')).toBeVisible();
  await calendarButton.click();
  await expect(page.getByTestId('calendar-popover')).toBeHidden();
});

test('backup import restores validated sites and user preferences', async ({ page }) => {
  await page.getByTestId('settings-button').click();
  const controls = page.getByTestId('data-controls');
  await expect(controls).toBeVisible();
  const payload = {
    schema: 'nexus-speed-dial', version: 1, exportedAt: '2026-09-07T12:00:00.000Z', data: {
      preferences: { theme:'dark', density:'compact', background:'clean', glassStrength:'strong', searchEngine:'yandex', globalSiteSearch:true, omniboxSuggestions:true },
      tileSettings: {},
      projects: [{ id: 'home', name: 'Дом', icon: 'home' }],
      categories: [],
      sites: [{ id:'imported', title:'Импорт', url:'https://example.com/', domain:'example.com', projectId:'home', favorite:false }],
      history: [], notes: [], weatherLocation: { mode: 'city', city: 'Минск' },
    },
  };
  await controls.locator('input[type="file"]').setInputFiles({ name: 'nexus.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(payload)) });
  await expect(page.getByRole('status')).toHaveText('Данные восстановлены');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Закрыть настройки' }).click();
  await expect(page.getByRole('link', { name: 'Импорт' })).toBeVisible();
});