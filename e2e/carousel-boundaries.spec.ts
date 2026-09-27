import { test, expect } from '@playwright/test';

test.describe('Category carousel boundaries', () => {
  test('disables arrows that cannot move the overflowing carousel', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Mobile uses the compact navigation surface.');

    await page.addInitScript(() => {
      const projects = [{
        id: 'stress-project',
        name: 'Большое пространство',
        color: '#2f6fe4',
        icon: 'Б',
        siteIds: [],
        createdAt: 1,
        updatedAt: 1,
      }];
      const categories = Array.from({ length: 14 }, (_, index) => ({
        id: `stress-category-${index}`,
        name: index === 13 ? 'Очень длинная последняя категория' : `Категория ${index + 1}`,
        projectId: 'stress-project',
      }));
      const sites = categories.map((category, index) => ({
        id: `stress-site-${index}`,
        title: `Сайт ${index + 1}`,
        desc: 'Проверка переполненной карусели',
        domain: `stress-${index}.example`,
        url: `https://stress-${index}.example/path`,
        color: '#2f6fe4',
        icon: 'С',
        category: category.name,
        categoryId: category.id,
      }));

      localStorage.setItem('nexus-projects', JSON.stringify(projects));
      localStorage.setItem('nexus-categories', JSON.stringify(categories));
      localStorage.setItem('nexus-groups', JSON.stringify([]));
      localStorage.setItem('nexus-sites', JSON.stringify(sites));
      localStorage.setItem('nexus-active-project', 'stress-project');
      localStorage.removeItem('nexus-active-category');
    });

    await page.goto('/');

    const row = page.locator('.nx-carousel-row');
    const left = page.getByRole('button', { name: 'Левее' });
    const right = page.getByRole('button', { name: 'Правее' });

    await expect(row).toBeVisible();
    await expect(left).toBeVisible();
    await expect(right).toBeVisible();

    await expect(left).toBeDisabled();
    await expect(right).toBeEnabled();

    await right.click();
    await expect.poll(() => row.evaluate(node => node.scrollLeft)).toBeGreaterThan(0);
    await expect(left).toBeEnabled();

    await row.evaluate(node => {
      node.scrollLeft = node.scrollWidth;
      node.dispatchEvent(new Event('scroll'));
    });

    await expect(right).toBeDisabled();
    await expect(left).toBeEnabled();
  });
});
