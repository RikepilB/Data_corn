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
