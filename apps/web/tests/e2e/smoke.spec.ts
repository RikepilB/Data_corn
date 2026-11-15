import { type Page, expect, test } from '@playwright/test';

// What must never break in front of judges: the page opens, the example reaches the
// results, the disclaimer is visible, there is no login, and nothing throws.

async function exampleToResults(page: Page, { waitForGlobe }: { waitForGlobe: boolean }) {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  await page.goto('/?mock=1');

  await expect(page.getByRole('heading', { name: 'Your field, seen from space' })).toBeVisible();
  await expect(page.locator('input[type=password]')).toHaveCount(0);
  // The Zones layer belongs to a field's results; the globe only has the climate layers.
  await expect(page.getByRole('radio', { name: 'Rain' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Zones' })).toHaveCount(0);

  // The map fills the screen (MapLibre's CSS once collapsed it to 0 px in the build).
  const viewport = page.viewportSize()!;
  const mapBox = await page.locator('.mapwrap .map').boundingBox();
  expect(mapBox?.height).toBe(viewport.height);

  if (waitForGlobe) {
    // Let the map load and ease the globe beside the card, as a person would see it.
    await expect(page.locator('.maplibregl-canvas')).toBeVisible();
    await page.waitForTimeout(2_000);
  }

  // About: how it works, limits and credits open in a dialog and close with Escape (#60).
  await page.getByRole('button', { name: 'About' }).click();
  await expect(page.getByRole('dialog', { name: 'About Data Corn' })).toContainText('scenarios, not forecasts');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.getByRole('button', { name: 'See an example' }).click();

  // Mock describe takes about 4 s after the camera flight.
  const submit = page.getByRole('button', { name: 'See results' });
  await expect(submit).toBeVisible({ timeout: 45_000 });
  await submit.click();

  await expect(page.locator('.disclaimer')).toContainText('does not replace their judgment', {
    timeout: 45_000,
  });
  await expect(page.locator('input[type=password]')).toHaveCount(0);

  // The example shows the real report computed in advance, not the invented sample numbers,
  // so the results carry no "Sample data" tag.
  await expect(page.locator('.results .tag--warn')).toHaveCount(0);

  // The results navigation stays at the top of the panel and fits the screen:
  // change details, new field, start over.
  const nav = page.locator('.results__nav');
  await expect(nav.getByRole('button')).toHaveCount(3);
  const box = await nav.boundingBox();
  const width = page.viewportSize()!.width;
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(width);

  // Rotation panel (#42, #51): three strategies, at most one current, five headings each,
  // and the stated gap about water between crops.
  const strategies = page.locator('.rotation .rcard');
  await expect(strategies).toHaveCount(3);
  expect(await page.locator('.rotation .rcard--current').count()).toBeLessThanOrEqual(1);
  for (const card of await strategies.all()) {
    await expect(card.locator('h3')).toHaveCount(5);
  }
  await expect(page.locator('.rotation')).toContainText('The model does not carry water between crops.');

  // The Zones chip exists only when the report carries a zone map. The invented sample report does;
  // the real report computed in advance has none until Earth Engine runs, so the chip must be
  // absent then. When it is there, it turns the layer on, with a legend in words.
  const zones = page.getByRole('radio', { name: 'Zones' });
  if (await zones.count()) {
    await zones.click();
    await expect(zones).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('.legend--zones')).toContainText('Less green');
    await expect(page.locator('.legend--zones')).toContainText('Greener');
  }

  // "Start over" goes back to the globe, where the example can be opened again.
  await nav.getByRole('button', { name: 'Start over' }).click();
  await expect(page.getByRole('button', { name: 'See an example' })).toBeVisible({ timeout: 15_000 });

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
