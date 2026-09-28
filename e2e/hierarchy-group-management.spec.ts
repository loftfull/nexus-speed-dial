import { test, expect } from '@playwright/test';

test.describe('Hierarchy group management', () => {
  test('deleting a group keeps its sites and Undo restores the assignment', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Hierarchy management is proven once on the desktop shell.');

    await page.goto('/');

    const categoryCrumb = page.getByRole('button', { name: /^Категория:/ });
    await categoryCrumb.click();
    await page.getByRole('option', { name: /Соцсети/ }).click();

    const groupCrumb = page.getByRole('button', { name: /^Группа:/ });
    await groupCrumb.click();
    await page.getByRole('option', { name: /Чаты/ }).click();
    await expect(page.getByRole('button', { name: 'Группа: Чаты' })).toBeVisible();

    const before = await page.evaluate(() => {
      const groups = JSON.parse(localStorage.getItem('nexus-groups') || '[]') as Array<{ id: string; name: string }>;
      const sites = JSON.parse(localStorage.getItem('nexus-sites') || '[]') as Array<{ id?: string; groupId?: string }>;
      const group = groups.find(item => item.name === 'Чаты');
      if (!group) throw new Error('Seed group Чаты not found');
      return {
        group,
        siteIds: sites.filter(site => site.groupId === group.id).map(site => site.id).filter(Boolean),
      };
    });
    expect(before.siteIds.length).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Группа: Чаты' }).click();
    const remove = page.getByRole('button', { name: 'Удалить группу «Чаты»' });
    await expect(remove).toBeVisible();
    await remove.click();

    const dialog = page.getByRole('dialog', { name: 'Удалить группу «Чаты»?' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Сайты останутся в категории');
    await dialog.getByRole('button', { name: 'Удалить группу' }).click();

    await expect(page.getByRole('button', { name: 'Группа: Все группы' })).toBeVisible();
    await expect.poll(() => page.evaluate(({ groupId, siteIds }) => {
      const groups = JSON.parse(localStorage.getItem('nexus-groups') || '[]') as Array<{ id: string }>;
      const sites = JSON.parse(localStorage.getItem('nexus-sites') || '[]') as Array<{ id?: string; groupId?: string }>;
      return {
        groupExists: groups.some(group => group.id === groupId),
        detached: siteIds.every(id => sites.find(site => site.id === id)?.groupId == null),
      };
    }, { groupId: before.group.id, siteIds: before.siteIds })).toEqual({ groupExists: false, detached: true });

    const undo = page.getByRole('button', { name: 'Отменить удаление группы' });
    await expect(undo).toBeVisible();
    await undo.click();

    await expect.poll(() => page.evaluate(({ groupId, siteIds }) => {
      const groups = JSON.parse(localStorage.getItem('nexus-groups') || '[]') as Array<{ id: string }>;
      const sites = JSON.parse(localStorage.getItem('nexus-sites') || '[]') as Array<{ id?: string; groupId?: string }>;
      return {
        groupExists: groups.some(group => group.id === groupId),
        restored: siteIds.every(id => sites.find(site => site.id === id)?.groupId === groupId),
      };
    }, { groupId: before.group.id, siteIds: before.siteIds })).toEqual({ groupExists: true, restored: true });
  });
});
