import { expect, test } from '@playwright/test';

// What must never break in front of judges: the page opens, the example reaches the
// results, the disclaimer is visible, there is no login, and nothing throws.

test('the example field goes from the globe to the results', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  await page.goto('/?mock=1');

  await expect(page.getByRole('heading', { name: 'Your field, seen from space' })).toBeVisible();
  await expect(page.locator('input[type=password]')).toHaveCount(0);

  // The map fills the screen (MapLibre's CSS once collapsed it to 0 px in the build).
  const viewport = page.viewportSize()!;
  const mapBox = await page.locator('.mapwrap .map').boundingBox();
  expect(mapBox?.height).toBe(viewport.height);

  // Tapped right away, before the map has loaded: the flight must wait, not get lost.
  await page.getByRole('button', { name: 'See an example' }).click();

  // Mock describe takes about 4 s after the camera flight.
  const submit = page.getByRole('button', { name: 'See results' });
  await expect(submit).toBeVisible({ timeout: 45_000 });
  await submit.click();

  await expect(page.locator('.disclaimer')).toContainText('does not replace their judgment', {
    timeout: 45_000,
  });
  await expect(page.locator('input[type=password]')).toHaveCount(0);

  expect(pageErrors, `uncaught errors: ${pageErrors.join(' | ')}`).toEqual([]);
});
