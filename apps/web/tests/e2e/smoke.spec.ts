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

  // Rotation panel (#42, #51): three strategies, at most one current, five headings each,
  // and the stated gap about water between crops.
  const strategies = page.locator('.rotation .rcard');
  await expect(strategies).toHaveCount(3);
  expect(await page.locator('.rotation .rcard--current').count()).toBeLessThanOrEqual(1);
  for (const card of await strategies.all()) {
    await expect(card.locator('h3')).toHaveCount(5);
  }
  await expect(page.locator('.rotation')).toContainText('The model does not carry water between crops.');

  expect(pageErrors, `uncaught errors: ${pageErrors.join(' | ')}`).toEqual([]);
});
