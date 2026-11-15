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

  // The PDF downloads, and a link to the same file stays for browsers that ignore the
  // download (iPhone Safari, browsers inside apps).
  const download = page.waitForEvent('download', { timeout: 45_000 });
  await page.getByRole('button', { name: 'Download full report (PDF)' }).click();
  expect((await download).suggestedFilename()).toMatch(/^data-corn_.*\.pdf$/);
  await expect(page.getByRole('link', { name: 'open it here' })).toHaveAttribute('href', /^blob:/);

  // "Change details" opens the form; while nothing changed, → shows the same results again
  // without a new run.
  await nav.getByRole('button', { name: 'Change details' }).click();
  await page.getByRole('button', { name: 'Back to the results' }).click();
  await expect(nav).toBeVisible();
  await expect(page.locator('.results .tag--warn')).toHaveCount(0);

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

// "Go to my location" (the first button of the app). The position only moves the map.
const NEBRASKA = { latitude: 40.88, longitude: -98 };

test.describe('go to my location, permission granted', () => {
  test.use({ geolocation: { ...NEBRASKA, accuracy: 20 }, permissions: ['geolocation'] });

  test('a precise position flies to the field and opens the draw step', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    await page.goto('/?mock=1');
    await page.getByRole('button', { name: 'Go to my location' }).click();

    await expect(page.locator('.app')).toHaveClass(/step-draw/, { timeout: 20_000 });
    await expect(page.locator('.draw-hint')).toContainText('Tap the corners of your field');
    await expect(page.locator('.draw-bar__note')).toHaveCount(0);

    // Back to the globe: the first panel returns with its three choices.
    await page.getByRole('button', { name: 'Back to the globe' }).click();
    await expect(page.getByRole('button', { name: 'Go to my location' })).toBeEnabled({ timeout: 15_000 });
    expect(pageErrors, `uncaught errors: ${pageErrors.join(' | ')}`).toEqual([]);
  });
});

test.describe('go to my location, approximate position', () => {
  // Desktop browsers locate by Wi-Fi or IP: kilometres off, so it is not shown as the field.
  test.use({ geolocation: { ...NEBRASKA, accuracy: 5000 }, permissions: ['geolocation'] });

  test('opens the draw step and says the location is approximate', async ({ page }) => {
    await page.goto('/?mock=1');
    await page.getByRole('button', { name: 'Go to my location' }).click();

    await expect(page.locator('.app')).toHaveClass(/step-draw/, { timeout: 20_000 });
    await expect(page.locator('.draw-bar__note')).toContainText('approximate location');
  });
});

test.describe('go to my location, permission denied', () => {
  test.use({ permissions: [] });

  test('says why, and the search still reaches the draw step', async ({ page }) => {
    await page.goto('/?mock=1');
    await page.getByRole('button', { name: 'Go to my location' }).click();

    await expect(page.locator('.search__note')).toContainText('Location is blocked for this site');
    // Typed coordinates need no network.
    await page.getByLabel('Search a place').fill('40.88, -98');
    await page.getByLabel('Search a place').press('Enter');
    await page.getByRole('button', { name: '40.8800, -98.0000' }).click();

    await expect(page.locator('.app')).toHaveClass(/step-draw/, { timeout: 20_000 });
    await expect(page.locator('.draw-bar__note')).toHaveCount(0);
  });
});
