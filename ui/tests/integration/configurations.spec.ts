import { expect, request, test } from '@playwright/test';

const API_BASE = 'http://localhost:8000/api/v1';

type ApiContext = Awaited<ReturnType<typeof request.newContext>>;

async function createApp(apiContext: ApiContext, name: string): Promise<string> {
  const res = await apiContext.post(`${API_BASE}/applications`, {
    data: { name, comments: 'Integration test' },
  });
  const body = (await res.json()) as { id: string };
  return body.id;
}

async function createConfig(
  apiContext: ApiContext,
  appId: string,
  name: string,
): Promise<string> {
  const res = await apiContext.post(`${API_BASE}/configurations`, {
    data: { application_id: appId, name, config: { env: 'test' } },
  });
  const body = (await res.json()) as { id: string };
  return body.id;
}

async function deleteApp(apiContext: ApiContext, id: string): Promise<void> {
  await apiContext.delete(`${API_BASE}/applications/${id}`);
}

test.describe('Configurations', () => {
  let apiContext: ApiContext;
  const appIds: string[] = [];

  test.beforeAll(async () => {
    apiContext = await request.newContext({ baseURL: API_BASE });
  });

  test.afterAll(async () => {
    for (const id of appIds) {
      await deleteApp(apiContext, id).catch(() => undefined);
    }
    await apiContext.dispose();
  });

  test('expand application shows configurations', async ({ page }) => {
    const appName = `cfg-list-test-${Date.now()}`;
    const appId = await createApp(apiContext, appName);
    appIds.push(appId);
    await createConfig(apiContext, appId, 'my-config');

    await page.goto('/');

    const appNameBtn = page.locator('app-list').locator('pierce/.app-name-btn', { hasText: appName });
    await appNameBtn.click();

    await expect(
      page.locator('app-list').locator('pierce/.config-label', { hasText: 'my-config' }),
    ).toBeVisible();
  });

  test('add configuration via form', async ({ page }) => {
    const appName = `cfg-add-test-${Date.now()}`;
    const appId = await createApp(apiContext, appName);
    appIds.push(appId);

    await page.goto('/');

    // Expand app
    await page.locator('app-list').locator('pierce/.app-name-btn', { hasText: appName }).click();

    // Click add-config
    await page.locator('app-list').locator('pierce/.add-config').click();

    // Fill config form
    await page.locator('config-form').locator('pierce/#name').fill('new-config');
    await page.locator('config-form').locator('pierce/#config').fill('{"key": "value"}');
    await page.locator('config-form').locator('pierce/button[type="submit"]').click();

    // Should return to app form — navigate back to list
    await page.locator('app-form').locator('pierce/.back-btn').click();

    // Expand app again and check config appears
    await page.locator('app-list').locator('pierce/.app-name-btn', { hasText: appName }).click();
    await expect(
      page.locator('app-list').locator('pierce/.config-label', { hasText: 'new-config' }),
    ).toBeVisible();
  });

  test('edit configuration name', async ({ page }) => {
    const appName = `cfg-edit-test-${Date.now()}`;
    const appId = await createApp(apiContext, appName);
    appIds.push(appId);
    await createConfig(apiContext, appId, 'original-config');

    await page.goto('/');

    // Expand app
    await page.locator('app-list').locator('pierce/.app-name-btn', { hasText: appName }).click();

    // Click edit-config
    await page.locator('app-list').locator('pierce/.edit-config').click();

    // Update name
    const nameInput = page.locator('config-form').locator('pierce/#name');
    await nameInput.fill('updated-config');
    await page.locator('config-form').locator('pierce/button[type="submit"]').click();

    // Navigate back to list
    await page.locator('app-form').locator('pierce/.back-btn').click();

    // Expand app and check updated name
    await page.locator('app-list').locator('pierce/.app-name-btn', { hasText: appName }).click();
    await expect(
      page.locator('app-list').locator('pierce/.config-label', { hasText: 'updated-config' }),
    ).toBeVisible();
  });

  test('delete configuration', async ({ page }) => {
    const appName = `cfg-delete-test-${Date.now()}`;
    const appId = await createApp(apiContext, appName);
    appIds.push(appId);
    await createConfig(apiContext, appId, 'to-delete');

    await page.goto('/');

    // Expand app
    await page.locator('app-list').locator('pierce/.app-name-btn', { hasText: appName }).click();

    // Click edit-config
    await page.locator('app-list').locator('pierce/.edit-config').click();

    // Delete
    await page.locator('config-form').locator('pierce/.delete-btn').click();

    // Confirm
    const confirmBtn = page
      .locator('config-form')
      .locator('pierce/confirm-dialog')
      .locator('pierce/.confirm-btn');
    await confirmBtn.click();

    // Navigate back to list
    await page.locator('app-form').locator('pierce/.back-btn').click();

    // Expand app — config should be gone
    await page.locator('app-list').locator('pierce/.app-name-btn', { hasText: appName }).click();
    await expect(
      page.locator('app-list').locator('pierce/.config-label', { hasText: 'to-delete' }),
    ).not.toBeVisible();
  });

  test('invalid JSON in config field shows error', async ({ page }) => {
    const appName = `cfg-json-test-${Date.now()}`;
    const appId = await createApp(apiContext, appName);
    appIds.push(appId);

    await page.goto('/');

    // Expand and add config
    await page.locator('app-list').locator('pierce/.app-name-btn', { hasText: appName }).click();
    await page.locator('app-list').locator('pierce/.add-config').click();

    await page.locator('config-form').locator('pierce/#name').fill('bad-config');
    await page.locator('config-form').locator('pierce/#config').fill('not valid json');
    await page.locator('config-form').locator('pierce/button[type="submit"]').click();

    // Should show inline error
    const errors = page.locator('config-form').locator('pierce/.field-error');
    await expect(errors.filter({ hasText: 'Invalid JSON' })).toBeVisible();
  });

  test('duplicate configuration name shows conflict error', async ({ page }) => {
    const appName = `cfg-dup-test-${Date.now()}`;
    const appId = await createApp(apiContext, appName);
    appIds.push(appId);
    await createConfig(apiContext, appId, 'existing-config');

    await page.goto('/');

    // Expand and add config with same name
    await page.locator('app-list').locator('pierce/.app-name-btn', { hasText: appName }).click();
    await page.locator('app-list').locator('pierce/.add-config').click();

    await page.locator('config-form').locator('pierce/#name').fill('existing-config');
    await page.locator('config-form').locator('pierce/#config').fill('{}');
    await page.locator('config-form').locator('pierce/button[type="submit"]').click();

    await expect(page.locator('config-form').locator('pierce/.api-error')).toContainText(
      'already exists',
    );
  });
});
