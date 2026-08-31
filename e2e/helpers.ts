import type { Page } from '@playwright/test';

export async function mockWeather(page: Page) {
  await page.route('https://geocoding-api.open-meteo.com/**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ results: [{ name: 'Минск', latitude: 53.9, longitude: 27.5667 }] }),
  }));
  await page.route('https://api.open-meteo.com/**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      current: { temperature_2m: 21, apparent_temperature: 20, relative_humidity_2m: 58, weather_code: 2, wind_speed_10m: 8 },
      hourly: {
        time: ['2026-08-31T12:00','2026-08-31T13:00','2026-08-31T14:00','2026-08-31T15:00','2026-08-31T16:00','2026-08-31T17:00'],
        temperature_2m: [21,22,22,21,20,19], weather_code: [2,2,1,1,2,3],
      },
      daily: {
        time: ['2026-08-31','2026-09-01','2026-09-02','2026-09-03','2026-09-04'],
        temperature_2m_max: [23,24,22,21,20], temperature_2m_min: [14,15,13,12,11], weather_code: [2,1,3,61,2],
      },
    }),
  }));
}

export async function resetApp(page: Page) {
  await page.clock.setFixedTime(new Date('2026-08-31T12:00:00+03:00'));
  await mockWeather(page);
  await page.route('https://www.google.com/s2/favicons**', route => route.abort());
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}
