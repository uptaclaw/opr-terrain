import { expect, test } from '@playwright/test';
import { LayoutStudioPage } from '../pages/layoutStudioPage';

test('places map and library on the left, stacks controls on the right, and keeps the print legend below the map', async ({ page }) => {
  const studio = new LayoutStudioPage(page);

  await studio.goto();

  const autoPlacement = page.getByTestId('auto-placement-panel');
  const losCheck = page.getByTestId('los-check-panel');
  const summary = page.getByTestId('terrain-summary');
  const library = page.getByTestId('terrain-library-panel');
  const printMap = page.getByTestId('print-map');
  const printLegend = page.getByTestId('print-terrain-legend');

  await expect(autoPlacement).toBeVisible();
  await expect(losCheck).toBeVisible();
  await expect(summary).toBeVisible();
  await expect(library).toBeVisible();
  await expect(printLegend).toBeVisible();
  await expect(page.getByText(/live share link/i)).toHaveCount(0);

  const autoPlacementBox = await autoPlacement.boundingBox();
  const losCheckBox = await losCheck.boundingBox();
  const summaryBox = await summary.boundingBox();
  const mapBox = await studio.interactiveCanvas.boundingBox();
  const libraryBox = await library.boundingBox();
  const printMapBox = await printMap.boundingBox();
  const printLegendBox = await printLegend.boundingBox();

  if (!autoPlacementBox || !losCheckBox || !summaryBox || !mapBox || !libraryBox || !printMapBox || !printLegendBox) {
    throw new Error('Expected visible layout panels and print preview boxes.');
  }

  expect(mapBox.x).toBeLessThan(autoPlacementBox.x);
  expect(libraryBox.x).toBeLessThan(autoPlacementBox.x);
  expect(libraryBox.y).toBeGreaterThan(mapBox.y + mapBox.height - 1);
  expect(autoPlacementBox.y).toBeLessThan(losCheckBox.y);
  expect(losCheckBox.y).toBeLessThan(summaryBox.y);
  expect(printMapBox.y).toBeGreaterThan(libraryBox.y + libraryBox.height - 1);
  expect(printLegendBox.y).toBeGreaterThan(printMapBox.y + printMapBox.height - 1);

  await expect(summary).toContainText('Central Ruins');
  await expect(summary).toContainText('Cover • Difficult • LoS Blocking');
  await expect(printLegend).toContainText('Central Ruins');
  await expect(printLegend).toContainText('Cover • Difficult • LoS Blocking');

  const legendText = (await printLegend.textContent()) ?? '';

  expect(legendText).not.toMatch(/\bx\s*\d/iu);
  expect(legendText).not.toContain('″');
});
