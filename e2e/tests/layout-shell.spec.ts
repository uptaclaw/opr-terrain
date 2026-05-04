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

test('desktop layout keeps map/library on the left, sidebar controls on the right, and print preview below', async ({ page }) => {
  const studio = new LayoutStudioPage(page);

  await studio.goto();

  const mapPanel = page.getByTestId('interactive-map-panel');
  const statsBar = page.getByTestId('stats-bar');
  const autoPlacement = page.getByTestId('auto-placement-panel');
  const library = page.getByTestId('terrain-library-panel');
  const printSheet = page.getByTestId('print-sheet');
  const printLegend = page.getByTestId('print-terrain-legend');

  await expect(statsBar).toBeVisible();
  await expect(autoPlacement).toBeVisible();
  await expect(library).toBeVisible();
  await expect(printLegend).toBeVisible();

  const mapPanelBox = requireBox(await mapPanel.boundingBox(), 'map panel');
  const statsBarBox = requireBox(await statsBar.boundingBox(), 'stats bar');
  const libraryBox = requireBox(await library.boundingBox(), 'terrain library');
  const autoPlacementBox = requireBox(await autoPlacement.boundingBox(), 'auto placement panel');
  const printSheetBox = requireBox(await printSheet.boundingBox(), 'print sheet');

  // StatsBar is inside the map panel, at the top
  expect(statsBarBox.y).toBeGreaterThanOrEqual(mapPanelBox.y);
  expect(statsBarBox.y).toBeLessThan(mapPanelBox.y + mapPanelBox.height);

  // Library is below the map
  expect(libraryBox.y).toBeGreaterThan(mapPanelBox.y + mapPanelBox.height - 1);
  expect(libraryBox.x).toBeLessThan(autoPlacementBox.x);

  // Auto-placement panel is to the right of the map
  expect(autoPlacementBox.x).toBeGreaterThan(mapPanelBox.x + mapPanelBox.width - 1);

  // Print sheet is below everything
  expect(printSheetBox.y).toBeGreaterThan(libraryBox.y + libraryBox.height - 1);

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

test('tablet layout stacks the map, library, sidebar panels, and print preview vertically', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 1600 });

  const studio = new LayoutStudioPage(page);

  await studio.goto();

  const mapPanel = page.getByTestId('interactive-map-panel');
  const statsBar = page.getByTestId('stats-bar');
  const autoPlacement = page.getByTestId('auto-placement-panel');
  const library = page.getByTestId('terrain-library-panel');
  const printSheet = page.getByTestId('print-sheet');

  const mapPanelBox = requireBox(await mapPanel.boundingBox(), 'map panel');
  const statsBarBox = requireBox(await statsBar.boundingBox(), 'stats bar');
  const libraryBox = requireBox(await library.boundingBox(), 'terrain library');
  const autoPlacementBox = requireBox(await autoPlacement.boundingBox(), 'auto placement panel');
  const printSheetBox = requireBox(await printSheet.boundingBox(), 'print sheet');

  // StatsBar is inside the map panel
  expect(statsBarBox.y).toBeGreaterThanOrEqual(mapPanelBox.y);

  // Vertical stacking: map → library → auto-placement → print
  expect(libraryBox.y).toBeGreaterThan(mapPanelBox.y + mapPanelBox.height - 1);
  expect(autoPlacementBox.y).toBeGreaterThan(libraryBox.y + libraryBox.height - 1);
  expect(printSheetBox.y).toBeGreaterThan(autoPlacementBox.y + autoPlacementBox.height - 1);

  // Panels stay left-aligned in tablet layout
  expect(autoPlacementBox.x).toBeLessThan(mapPanelBox.x + 24);
});
