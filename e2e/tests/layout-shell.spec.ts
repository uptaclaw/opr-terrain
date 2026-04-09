import { expect, test } from '@playwright/test';
import { LayoutStudioPage } from '../pages/layoutStudioPage';

test('places the summary left, the library right, and keeps the print legend compact below the map', async ({ page }) => {
  const studio = new LayoutStudioPage(page);

  await studio.goto();

  const summary = page.getByTestId('terrain-summary');
  const library = page.getByTestId('terrain-library-panel');
  const printMap = page.getByTestId('print-map');
  const printLegend = page.getByTestId('print-terrain-legend');

  await expect(summary).toBeVisible();
  await expect(library).toBeVisible();
  await expect(printLegend).toBeVisible();

  const summaryBox = await summary.boundingBox();
  const mapBox = await studio.interactiveCanvas.boundingBox();
  const libraryBox = await library.boundingBox();
  const printMapBox = await printMap.boundingBox();
  const printLegendBox = await printLegend.boundingBox();

  if (!summaryBox || !mapBox || !libraryBox || !printMapBox || !printLegendBox) {
    throw new Error('Expected visible layout panels and print preview boxes.');
  }

  expect(summaryBox.x).toBeLessThan(mapBox.x);
  expect(mapBox.x).toBeLessThan(libraryBox.x);
  expect(printLegendBox.y).toBeGreaterThan(printMapBox.y + printMapBox.height - 1);

  await expect(printLegend).toContainText('Central Ruins');
  await expect(printLegend).toContainText('Cover • Difficult • LoS Blocking');

  const legendText = (await printLegend.textContent()) ?? '';

  expect(legendText).not.toMatch(/\bx\s*\d/iu);
  expect(legendText).not.toContain('″');
});
