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

  // Toggle LoS check ON via checkbox (force: true because input is sr-only behind styled toggle)
  const losToggle = page.getByTestId('los-toggle');
  await losToggle.check({ force: true });
  await expect(page.getByText(/clear paths found/i)).toBeVisible();
  await expect(studio.interactiveCanvas.locator('[data-testid="los-clear-sightline"]')).toHaveCount(625);

  // Toggle LoS check OFF
  await losToggle.uncheck({ force: true });
  await expect(studio.interactiveCanvas.locator('[data-testid="los-clear-sightline"]')).toHaveCount(0);
});
