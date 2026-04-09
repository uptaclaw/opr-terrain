import { expect, test } from '@playwright/test';
import { LayoutStudioPage } from '../pages/layoutStudioPage';

test('places the map and library in left column, controls in right sidebar, and keeps the print legend compact below the map', async ({ page }) => {
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

  // New layout: Map and Library should be in the same column (left)
  // Summary should be in the right sidebar
  expect(mapBox.x).toBeLessThan(summaryBox.x);
  expect(libraryBox.x).toBeLessThan(summaryBox.x);
  
  // Library should be below the map in the left column
  expect(libraryBox.y).toBeGreaterThan(mapBox.y + mapBox.height - 1);
  
  // Print legend should be below the print map
  expect(printLegendBox.y).toBeGreaterThan(printMapBox.y + printMapBox.height - 1);

  await expect(printLegend).toContainText('Central Ruins');
  await expect(printLegend).toContainText('Cover • Difficult • LoS Blocking');

  const legendText = (await printLegend.textContent()) ?? '';

  expect(legendText).not.toMatch(/\bx\s*\d/iu);
  expect(legendText).not.toContain('″');
});
