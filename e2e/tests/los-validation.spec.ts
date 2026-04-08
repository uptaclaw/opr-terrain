import { expect, test } from '@playwright/test';
import { LayoutStudioPage } from '../pages/layoutStudioPage';
import { encodeLayoutHash } from '../utils/layoutHash';

test('line-of-sight validation draws red sightlines and clears them again', async ({ page }) => {
  const studio = new LayoutStudioPage(page);
  const openBoardHash = encodeLayoutHash({
    version: 1,
    table: {
      widthInches: 24,
      heightInches: 24,
      deploymentDepthInches: 6,
      title: 'Open Table',
    },
    pieces: [],
  });

  await studio.goto(openBoardHash);

  await page.getByRole('button', { name: /check line of sight/i }).click();
  await expect(page.getByText(/found 625 clear sightlines/i)).toBeVisible();
  await expect(studio.interactiveCanvas.locator('[data-testid="los-clear-sightline"]')).toHaveCount(625);

  await page.getByRole('button', { name: /clear los check/i }).click();
  await expect(studio.interactiveCanvas.locator('[data-testid="los-clear-sightline"]')).toHaveCount(0);
});
