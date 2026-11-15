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

  // The results navigation stays at the top of the panel and fits the screen on one line:
  // Back (to the details) first, then the two secondary ways out, new field and start over.
  const nav = page.locator('.results__nav');
  await expect(nav.getByRole('button')).toHaveCount(3);
  await expect(nav.getByRole('button').first()).toHaveText('Back');
  const box = await nav.boundingBox();
  const width = page.viewportSize()!.width;
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(width);
  expect(box!.height).toBeLessThan(70);

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

  // "Back" opens the form; while nothing changed, → shows the same results again
  // without a new run.
  await nav.getByRole('button', { name: 'Back to the details' }).click();
  await page.getByRole('button', { name: 'Back to the results' }).click();
  await expect(nav).toBeVisible();
  await expect(page.locator('.results .tag--warn')).toHaveCount(0);

  // The browser's Back button is the same Back: from the results to the details, without
  // leaving the site or losing ?mock=1.
  await page.goBack();
  await expect(page.getByRole('button', { name: 'See results' })).toBeVisible();
  expect(page.url()).toContain('?mock=1');
  await page.getByRole('button', { name: 'Back to the results' }).click();
  await expect(nav).toBeVisible();

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

// Help from the live-demo feedback: questions, suggestions and support in one dialog. The globe card
// has a Help link too, so the button is looked up inside the top bar.
test('help opens from the top bar, switches tabs and closes with Escape', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  await page.goto('/?mock=1');

  const helpButton = page.locator('.topbar').getByRole('button', { name: 'Help', exact: true });
  await expect(helpButton).toBeInViewport({ ratio: 1 });
  await helpButton.click();
  const dialog = page.getByRole('dialog', { name: 'Help', exact: true });
  await expect(dialog).toBeVisible();
  const questions = dialog.getByRole('tab', { name: 'Questions', exact: true });
  await expect(questions).toHaveAttribute('aria-selected', 'true');
  await expect(dialog.getByRole('tabpanel', { name: 'Questions', exact: true })).toContainText('Is this a forecast?');

  await dialog.getByRole('tab', { name: 'Suggestions', exact: true }).click();
  const suggestions = dialog.getByRole('tabpanel', { name: 'Suggestions', exact: true });
  await expect(suggestions).toBeVisible();
  // GitHub until the team sets SUPPORT_EMAIL (ui/common/contact.ts), then an e-mail
  const link = suggestions.getByRole('link', { name: /^Send a suggestion (on GitHub|by email)/ });
  await expect(link).toHaveAttribute('href', /^(https:\/\/github\.com\/RikepilB\/Data_corn\/issues\/new\?title=|mailto:)/);
  if ((await link.getAttribute('href'))!.startsWith('https:')) {
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener');
  }

  // Arrow keys move along the tabs (roving tabindex); Home goes back to the first one.
  await page.keyboard.press('ArrowRight');
  await expect(dialog.getByRole('tab', { name: 'Support', exact: true })).toBeFocused();
  await expect(dialog.getByRole('tabpanel', { name: 'Support', exact: true })).toContainText('device and browser');
  await page.keyboard.press('Home');
  await expect(questions).toBeFocused();
  await expect(questions).toHaveAttribute('aria-selected', 'true');

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(pageErrors, `uncaught errors: ${pageErrors.join(' | ')}`).toEqual([]);
});

// A field drawn by hand: one "Back" on every step, to the screen before, and nothing entered is
// lost by going back and forward again.
test('Back goes one step back and keeps the work', async ({ page, context }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 41.2, longitude: -97.5 });
  await page.goto('/?mock=1');

  const back = page.locator('.backbtn');
  const example = page.getByRole('button', { name: 'See an example' });
  const close = page.getByRole('button', { name: 'Close field' });
  const submit = page.getByRole('button', { name: 'See results' });
  const corners = page.locator('.draw-bar__info .muted');
  const rm = page.locator('.stepper output');

  // Draw step, nothing tapped yet: Undo and Close field cannot act, Back returns to the globe.
  await page.getByRole('button', { name: 'Go to my location' }).click();
  await expect(corners).toHaveText('0 corners', { timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled();
  await expect(close).toBeDisabled();
  await expect(back).toHaveCount(1);
  await expect(back).toHaveText('Back');
  await expect(back).toHaveAccessibleName('Back to the globe');
  await back.click();
  await expect(example).toBeVisible({ timeout: 15_000 });

  // Draw a field and reach the details.
  await page.getByRole('button', { name: 'Go to my location' }).click();
  await expect(corners).toHaveText('0 corners', { timeout: 30_000 });
  const { width, height } = page.viewportSize()!;
  const [x0, x1, y0, y1] = width >= 900 ? [0.3, 0.5, 0.3, 0.5] : [0.3, 0.7, 0.18, 0.3];
  for (const [fx, fy] of [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ]) {
    await page.mouse.click(width * fx!, height * fy!);
    await page.waitForTimeout(300);
  }
  await expect(corners).toHaveText('4 corners');
  await close.click();
  await expect(submit).toBeVisible({ timeout: 45_000 });

  // Details: Back returns to the drawing with the corners kept; closing the same field again
  // returns to the details as they were, without reading the field again.
  await page.getByRole('button', { name: 'More days' }).click();
  const chosen = await rm.textContent();
  await expect(back).toHaveCount(1);
  await expect(back).toHaveText('Back');
  await expect(back).toHaveAccessibleName('Back to the field');
  await back.click();
  await expect(corners).toHaveText('4 corners');
  await close.click();
  await expect(submit).toBeVisible({ timeout: 1_000 });
  await expect(rm).toHaveText(chosen!);

  // Results: Back returns to the details as entered; forward shows the same results at once.
  await submit.click();
  const verdict = page.locator('.verdict__text');
  await expect(verdict).toBeVisible({ timeout: 45_000 });
  const text = await verdict.textContent();
  await expect(back).toHaveCount(1);
  await expect(back).toHaveText('Back');
  await expect(back).toHaveAccessibleName('Back to the details');
  await back.click();
  await expect(rm).toHaveText(chosen!);
  await page.getByRole('button', { name: 'Back to the results' }).click();
  await expect(verdict).toHaveText(text!, { timeout: 1_000 });

  // The browser's Back button walks the same steps: details, drawing (corners kept), globe.
  await page.goBack();
  await expect(rm).toHaveText(chosen!);
  await page.goBack();
  await expect(corners).toHaveText('4 corners');
  await page.goBack();
  await expect(example).toBeVisible({ timeout: 15_000 });
  expect(page.url()).toContain('?mock=1');

  expect(pageErrors, `uncaught errors: ${pageErrors.join(' | ')}`).toEqual([]);
});
