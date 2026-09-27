import { test, expect, type Page } from '@playwright/test';

async function seedOverflowingCarousel(page: Page, activeCategoryId: string | null = null) {
  await page.addInitScript(({ activeCategoryId }) => {
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
    localStorage.setItem('nexus-active-project', JSON.stringify('stress-project'));
    if (activeCategoryId) localStorage.setItem('nexus-active-category', JSON.stringify(activeCategoryId));
    else localStorage.removeItem('nexus-active-category');
  }, { activeCategoryId });
}

test.describe('Category carousel boundaries', () => {
  test('disables arrows that cannot move the overflowing carousel', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Mobile uses the compact navigation surface.');
    await seedOverflowingCarousel(page);

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

  test.fixme('reveals a persisted active category that starts beyond the viewport', async ({ page }, testInfo) => {
    // Quarantined in https://github.com/loftfull/nexus-speed-dial/issues/1.
    // Keep the executable scenario here so the delegated fix can turn it back into blocking coverage.
    test.skip(testInfo.project.name === 'mobile', 'Mobile uses the compact navigation surface.');
    await seedOverflowingCarousel(page, 'stress-category-13');

    await page.goto('/');

    const row = page.locator('.nx-carousel-row');
    const active = row.locator('.nx-cat-card.on');

    await expect(active).toContainText('Очень длинная последняя категория');
    await expect.poll(async () => {
      const [rowBox, activeBox] = await Promise.all([row.boundingBox(), active.boundingBox()]);
      if (!rowBox || !activeBox) return false;
      return activeBox.x >= rowBox.x - 1
        && activeBox.x + activeBox.width <= rowBox.x + rowBox.width + 1;
    }).toBe(true);

    await expect(page.getByRole('button', { name: 'Левее' })).toBeEnabled();
  });
});
