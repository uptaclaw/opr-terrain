import { expect, test } from '@playwright/test';
import { LayoutStudioPage } from '../pages/layoutStudioPage';

test('places the map/library on the left, keeps a three-panel right sidebar, and keeps the print legend compact below the map', async ({ page }) => {
  const studio = new LayoutStudioPage(page);

  await studio.goto();

  const sidebar = page.getByTestId('layout-sidebar');
  const sidebarSections = sidebar.locator(':scope > section');
  const autoPlacement = page.getByTestId('auto-placement-panel');
  const losCheck = page.getByTestId('los-check-panel');
  const summary = page.getByTestId('terrain-summary');
  const library = page.getByTestId('terrain-library-panel');
  const printMap = page.getByTestId('print-map');
  const printLegend = page.getByTestId('print-terrain-legend');

  await expect(sidebar).toBeVisible();
  await expect(autoPlacement).toBeVisible();
  await expect(losCheck).toBeVisible();
  await expect(summary).toBeVisible();
  await expect(library).toBeVisible();
  await expect(printLegend).toBeVisible();
  await expect(sidebarSections).toHaveCount(3);
  await expect(sidebarSections.nth(0)).toHaveAttribute('data-testid', 'auto-placement-panel');
  await expect(sidebarSections.nth(1)).toHaveAttribute('data-testid', 'los-check-panel');
  await expect(sidebarSections.nth(2)).toHaveAttribute('data-testid', 'terrain-summary');
  await expect(page.getByRole('heading', { name: /opr guidelines validation/i })).toHaveCount(0);

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

  expect(mapBox.x).toBeLessThan(summaryBox.x);
  expect(libraryBox.x).toBeLessThan(summaryBox.x);
  expect(libraryBox.y).toBeGreaterThan(mapBox.y + mapBox.height - 1);
  expect(autoPlacementBox.y).toBeLessThan(losCheckBox.y);
  expect(losCheckBox.y).toBeLessThan(summaryBox.y);
  expect(printLegendBox.y).toBeGreaterThan(printMapBox.y + printMapBox.height - 1);

  await expect(printLegend).toContainText('Central Ruins');
  await expect(printLegend).toContainText('Cover • Difficult • LoS Blocking');

  const legendText = (await printLegend.textContent()) ?? '';

  expect(legendText).not.toMatch(/\bx\s*\d/iu);
  expect(legendText).not.toContain('″');
});
