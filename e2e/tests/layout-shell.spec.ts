import { expect, test } from '@playwright/test';
import { LayoutStudioPage } from '../pages/layoutStudioPage';

type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const requireBox = (box: Box | null, name: string): Box => {
  if (!box) {
    throw new Error(`Expected ${name} to be visible.`);
  }

  return box;
};

test('desktop layout keeps map and library full-width with print preview below', async ({ page }) => {
  const studio = new LayoutStudioPage(page);

  await studio.goto();

  const mapPanel = page.getByTestId('interactive-map-panel');
  const statsBar = page.getByTestId('stats-bar');
  const library = page.getByTestId('terrain-library-panel');
  const printSheet = page.getByTestId('print-sheet');
  const printLegend = page.getByTestId('print-terrain-legend');

  await expect(statsBar).toBeVisible();
  await expect(library).toBeVisible();
  await expect(printLegend).toBeVisible();

  const mapPanelBox = requireBox(await mapPanel.boundingBox(), 'map panel');
  const statsBarBox = requireBox(await statsBar.boundingBox(), 'stats bar');
  const libraryBox = requireBox(await library.boundingBox(), 'terrain library');
  const printSheetBox = requireBox(await printSheet.boundingBox(), 'print sheet');

  // StatsBar is inside the map panel, at the top
  expect(statsBarBox.y).toBeGreaterThanOrEqual(mapPanelBox.y);
  expect(statsBarBox.y).toBeLessThan(mapPanelBox.y + mapPanelBox.height);

  // Library is below the map, full width (no sidebar)
  expect(libraryBox.y).toBeGreaterThan(mapPanelBox.y + mapPanelBox.height - 1);

  // Print sheet is below the library
  expect(printSheetBox.y).toBeGreaterThan(libraryBox.y + libraryBox.height - 1);

  // Auto-placement split button is in the stats bar
  const generateButton = statsBar.getByRole('button', { name: /^generate$|^re-generate$/i });
  await expect(generateButton).toBeVisible();

  // Settings gear opens the auto-placement modal
  const settingsButton = statsBar.getByRole('button', { name: /auto placement settings/i });
  await settingsButton.click();

  const autoPlacementModal = page.getByRole('dialog');
  await expect(autoPlacementModal).toBeVisible();
  await expect(autoPlacementModal).toContainText('Placement Strategy');
  await page.keyboard.press('Escape');

  // Terrain legend content is accessible via the "Terrain Types" modal
  const terrainTypesButton = statsBar.getByRole('button', { name: /terrain types/i });
  await terrainTypesButton.click();

  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible();
  await expect(modal).toContainText('Central Ruins');
  await expect(modal).toContainText('Cover • Difficult • LoS Blocking');
  await page.keyboard.press('Escape');

  // Print legend still renders correctly
  await expect(printLegend).toContainText('Central Ruins');
  await expect(printLegend).toContainText('Cover • Difficult • LoS Blocking');

  const printLegendText = (await printLegend.textContent()) ?? '';

  expect(printLegendText).not.toMatch(/\bx\s*\d/iu);
  expect(printLegendText).not.toContain('″');
});

test('tablet layout stacks the map, library, and print preview vertically', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 1600 });

  const studio = new LayoutStudioPage(page);

  await studio.goto();

  const mapPanel = page.getByTestId('interactive-map-panel');
  const statsBar = page.getByTestId('stats-bar');
  const library = page.getByTestId('terrain-library-panel');
  const printSheet = page.getByTestId('print-sheet');

  const mapPanelBox = requireBox(await mapPanel.boundingBox(), 'map panel');
  const statsBarBox = requireBox(await statsBar.boundingBox(), 'stats bar');
  const libraryBox = requireBox(await library.boundingBox(), 'terrain library');
  const printSheetBox = requireBox(await printSheet.boundingBox(), 'print sheet');

  // StatsBar is inside the map panel
  expect(statsBarBox.y).toBeGreaterThanOrEqual(mapPanelBox.y);

  // Vertical stacking: map → library → print
  expect(libraryBox.y).toBeGreaterThan(mapPanelBox.y + mapPanelBox.height - 1);
  expect(printSheetBox.y).toBeGreaterThan(libraryBox.y + libraryBox.height - 1);

  // Auto-placement split button is accessible in the stats bar
  const generateButton = statsBar.getByRole('button', { name: /^generate$|^re-generate$/i });
  await expect(generateButton).toBeVisible();
});
