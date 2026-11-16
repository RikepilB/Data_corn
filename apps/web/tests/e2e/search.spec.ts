// SI-assisted (Claude Code); reviewed by <name>
import { expect, test } from '@playwright/test';

// Typed coordinates never reach Nominatim, so this runs offline; the credit is the
// attribution the OpenStreetMap licence asks for next to the search results.
test('the place search credits OpenStreetMap under its results', async ({ page }) => {
  await page.goto('/?mock=1');
  await page.getByRole('button', { name: 'Search a place' }).click();
  await page.getByLabel('Search a place').fill('41.25, -96');
  await page.getByLabel('Search a place').press('Enter');

  await expect(page.getByRole('button', { name: '41.2500, -96.0000' })).toBeVisible();
  const credit = page.getByRole('link', { name: '© OpenStreetMap contributors' });
  await expect(credit).toBeVisible();
  await expect(credit).toHaveAttribute('href', 'https://www.openstreetmap.org/copyright');
});

// Nominatim is stubbed: these check what the person reads, not the service.
const NOMINATIM = '**/nominatim.openstreetmap.org/**';

test('a search that cannot reach the service says so, and a retry works', async ({ page }) => {
  let requests = 0;
  await page.route(NOMINATIM, async (route) => {
    requests += 1;
    if (requests === 1) await route.fulfill({ status: 429, body: 'Too Many Requests' });
    else
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ display_name: 'Lincoln, Nebraska, United States', lat: '40.8', lon: '-96.7' }]),
      });
  });
  await page.goto('/?mock=1');
  await page.getByRole('button', { name: 'Search a place' }).click();
  const box = page.getByLabel('Search a place');
  await box.fill('Lincoln, Nebraska');
  await box.press('Enter');
  await expect(page.getByRole('alert')).toContainText('The search did not work');
  await expect(page.locator('.search__results')).toHaveCount(0);

  await box.press('Enter');
  await expect(page.getByRole('button', { name: 'Lincoln, Nebraska, United States' })).toBeVisible();
  await expect(page.getByRole('link', { name: '© OpenStreetMap contributors' })).toBeVisible();
  // The same text again is answered from the last result, not asked again.
  await box.press('Enter');
  await expect(page.getByRole('button', { name: 'Lincoln, Nebraska, United States' })).toBeVisible();
  expect(requests).toBe(2);
});

test('no match and coordinates off the globe each get their own message', async ({ page }) => {
  let requests = 0;
  await page.route(NOMINATIM, async (route) => {
    requests += 1;
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await page.goto('/?mock=1');
  await page.getByRole('button', { name: 'Search a place' }).click();
  const box = page.getByLabel('Search a place');
  await box.fill('zzqqxxyy');
  await box.press('Enter');
  await expect(page.locator('.search__results')).toContainText('No results');

  await box.fill('95, 200');
  await box.press('Enter');
  await expect(page.getByRole('alert')).toContainText('out of range');
  // "lon lat" is read the right way round, without the network.
  await box.fill('-98.0 40.88');
  await box.press('Enter');
  await expect(page.getByRole('button', { name: '40.8800, -98.0000' })).toBeVisible();
  expect(requests).toBe(1);
});
