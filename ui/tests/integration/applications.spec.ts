import { expect, request, test } from '@playwright/test';

const API_BASE = 'http://localhost:8000/api/v1';

async function createApp(
  apiContext: Awaited<ReturnType<typeof request.newContext>>,
  name: string,
): Promise<string> {
  const res = await apiContext.post(`${API_BASE}/applications`, {
    data: { name, comments: 'Integration test app' },
  });
  const body = (await res.json()) as { id: string };
  return body.id;
}

async function deleteApp(
  apiContext: Awaited<ReturnType<typeof request.newContext>>,
  id: string,
): Promise<void> {
  await apiContext.delete(`${API_BASE}/applications/${id}`);
}

test.describe('Applications', () => {
  let apiContext: Awaited<ReturnType<typeof request.newContext>>;
  const createdIds: string[] = [];

  test.beforeAll(async () => {
    apiContext = await request.newContext({ baseURL: API_BASE });
  });

  test.afterAll(async () => {
    for (const id of createdIds) {
      await deleteApp(apiContext, id).catch(() => undefined);
    }
    await apiContext.dispose();
  });

  test('list view shows applications', async ({ page }) => {
    const id = await createApp(apiContext, `list-test-${Date.now()}`);
    createdIds.push(id);

    await page.goto('/');
    await expect(page.locator('app-root').locator('app-list')).toBeVisible();
  });

  test('expand application shows configuration section with add icon', async ({ page }) => {
    const name = `expand-test-${Date.now()}`;
    const id = await createApp(apiContext, name);
    createdIds.push(id);

    await page.goto('/');

    // Find the app name button in shadow DOM
    const appNameBtn = page.locator('app-list').locator('pierce/.app-name-btn', { hasText: name });
    await expect(appNameBtn).toBeVisible();
    await appNameBtn.click();

    // Config section should appear with add-config button
    const addConfigBtn = page.locator('app-list').locator('pierce/.add-config');
    await expect(addConfigBtn).toBeVisible();
  });

  test('add application via form', async ({ page }) => {
    const name = `add-test-${Date.now()}`;

    await page.goto('/');

    // Click add-app button
    await page.locator('app-list').locator('pierce/.add-app').click();

    // Fill form
    const nameInput = page.locator('app-form').locator('pierce/#name');
    await nameInput.fill(name);
    await page.locator('app-form').locator('pierce/button[type="submit"]').click();

    // Should return to list and show new app
    const appNameBtn = page.locator('app-list').locator('pierce/.app-name-btn', { hasText: name });
    await expect(appNameBtn).toBeVisible();

    // Clean up — find and delete the created app
    const res = await apiContext.get(`${API_BASE}/applications`);
    const apps = (await res.json()) as Array<{ id: string; name: string }>;
    const created = apps.find((a) => a.name === name);
    if (created) createdIds.push(created.id);
  });

  test('edit application name', async ({ page }) => {
    const originalName = `edit-test-${Date.now()}`;
    const updatedName = `${originalName}-updated`;
    const id = await createApp(apiContext, originalName);
    createdIds.push(id);

    await page.goto('/');

    // Click edit button for this app
    const appItem = page.locator('app-list').locator('pierce/.app-item').filter({
      has: page.locator('pierce/.app-name-btn', { hasText: originalName }),
    });
    await appItem.locator('pierce/.edit-app').click();

    // Update name
    const nameInput = page.locator('app-form').locator('pierce/#name');
    await nameInput.fill(updatedName);
    await page.locator('app-form').locator('pierce/button[type="submit"]').click();

    // Should show updated name in list
    await expect(
      page.locator('app-list').locator('pierce/.app-name-btn', { hasText: updatedName }),
    ).toBeVisible();
  });

  test('delete application', async ({ page }) => {
    const name = `delete-test-${Date.now()}`;
    const id = await createApp(apiContext, name);
    // Don't add to createdIds — we're deleting it in the test

    await page.goto('/');

    const appItem = page.locator('app-list').locator('pierce/.app-item').filter({
      has: page.locator('pierce/.app-name-btn', { hasText: name }),
    });
    await appItem.locator('pierce/.edit-app').click();

    // Click delete
    await page.locator('app-form').locator('pierce/.delete-btn').click();

    // Confirm in dialog
    const confirmBtn = page.locator('app-form').locator('pierce/confirm-dialog').locator('pierce/.confirm-btn');
    await confirmBtn.click();

    // App should no longer appear in list
    await expect(
      page.locator('app-list').locator('pierce/.app-name-btn', { hasText: name }),
    ).not.toBeVisible();
  });

  test('duplicate name shows conflict error', async ({ page }) => {
    const name = `dup-test-${Date.now()}`;
    const id = await createApp(apiContext, name);
    createdIds.push(id);

    await page.goto('/');
    await page.locator('app-list').locator('pierce/.add-app').click();

    const nameInput = page.locator('app-form').locator('pierce/#name');
    await nameInput.fill(name);
    await page.locator('app-form').locator('pierce/button[type="submit"]').click();

    // Should show error
    await expect(page.locator('app-form').locator('pierce/.api-error')).toContainText('already exists');
  });
});
