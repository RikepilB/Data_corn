import { type Page, expect, test } from '@playwright/test';

// What must never break in front of judges: the page opens, the example reaches the
// results, the disclaimer is visible, there is no login, and nothing throws.

async function exampleToResults(page: Page, { waitForGlobe }: { waitForGlobe: boolean }) {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  await page.goto('/?mock=1');

  await expect(page.getByRole('heading', { name: 'Your field, seen from space' })).toBeVisible();
  await expect(page.locator('input[type=password]')).toHaveCount(0);

  // The map fills the screen (MapLibre's CSS once collapsed it to 0 px in the build).
  const viewport = page.viewportSize()!;
  const mapBox = await page.locator('.mapwrap .map').boundingBox();
  expect(mapBox?.height).toBe(viewport.height);

  if (waitForGlobe) {
    // Let the map load and ease the globe beside the card, as a person would see it.
    await expect(page.locator('.maplibregl-canvas')).toBeVisible();
    await page.waitForTimeout(2_000);
  }

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
}

// Tapped right away, before the map has loaded: the flight must wait, not get lost.
test('the example tapped right away reaches the results', async ({ page }) => {
  await exampleToResults(page, { waitForGlobe: false });
});

// Tapped once the globe has settled: framing the field must fit beside the panel.
test('the example tapped after the globe settles reaches the results', async ({ page }) => {
  await exampleToResults(page, { waitForGlobe: true });
});
