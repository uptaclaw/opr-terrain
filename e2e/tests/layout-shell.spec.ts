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
  const autoPlacement = page.getByTestId('auto-placement-panel');
  const losPanel = page.getByTestId('los-check-panel');
  const summary = page.getByTestId('terrain-summary');
  const library = page.getByTestId('terrain-library-panel');
  const printSheet = page.getByTestId('print-sheet');
  const printLegend = page.getByTestId('print-terrain-legend');

  await expect(autoPlacement).toBeVisible();
  await expect(losPanel).toBeVisible();
  await expect(summary).toBeVisible();
  await expect(library).toBeVisible();
  await expect(printLegend).toBeVisible();

  const mapPanelBox = requireBox(await mapPanel.boundingBox(), 'map panel');
  const libraryBox = requireBox(await library.boundingBox(), 'terrain library');
  const autoPlacementBox = requireBox(await autoPlacement.boundingBox(), 'auto placement panel');
  const losPanelBox = requireBox(await losPanel.boundingBox(), 'LoS panel');
  const summaryBox = requireBox(await summary.boundingBox(), 'summary legend');
  const printSheetBox = requireBox(await printSheet.boundingBox(), 'print sheet');

  expect(libraryBox.y).toBeGreaterThan(mapPanelBox.y + mapPanelBox.height - 1);
  expect(libraryBox.x).toBeLessThan(autoPlacementBox.x);

  expect(autoPlacementBox.x).toBeGreaterThan(mapPanelBox.x + mapPanelBox.width - 1);
  expect(losPanelBox.x).toBeGreaterThan(mapPanelBox.x + mapPanelBox.width - 1);
  expect(summaryBox.x).toBeGreaterThan(mapPanelBox.x + mapPanelBox.width - 1);

  expect(losPanelBox.y).toBeGreaterThan(autoPlacementBox.y + autoPlacementBox.height - 1);
  expect(summaryBox.y).toBeGreaterThan(losPanelBox.y + losPanelBox.height - 1);

  expect(printSheetBox.y).toBeGreaterThan(
    Math.max(libraryBox.y + libraryBox.height, summaryBox.y + summaryBox.height) - 1,
  );

  await expect(summary).toContainText('Central Ruins');
  await expect(summary).toContainText('Cover • Difficult • LoS Blocking');
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
  const autoPlacement = page.getByTestId('auto-placement-panel');
  const losPanel = page.getByTestId('los-check-panel');
  const summary = page.getByTestId('terrain-summary');
  const library = page.getByTestId('terrain-library-panel');
  const printSheet = page.getByTestId('print-sheet');

  const mapPanelBox = requireBox(await mapPanel.boundingBox(), 'map panel');
  const libraryBox = requireBox(await library.boundingBox(), 'terrain library');
  const autoPlacementBox = requireBox(await autoPlacement.boundingBox(), 'auto placement panel');
  const losPanelBox = requireBox(await losPanel.boundingBox(), 'LoS panel');
  const summaryBox = requireBox(await summary.boundingBox(), 'summary legend');
  const printSheetBox = requireBox(await printSheet.boundingBox(), 'print sheet');

  expect(libraryBox.y).toBeGreaterThan(mapPanelBox.y + mapPanelBox.height - 1);
  expect(autoPlacementBox.y).toBeGreaterThan(libraryBox.y + libraryBox.height - 1);
  expect(losPanelBox.y).toBeGreaterThan(autoPlacementBox.y + autoPlacementBox.height - 1);
  expect(summaryBox.y).toBeGreaterThan(losPanelBox.y + losPanelBox.height - 1);
  expect(printSheetBox.y).toBeGreaterThan(summaryBox.y + summaryBox.height - 1);

  expect(autoPlacementBox.x).toBeLessThan(mapPanelBox.x + 24);
  expect(summaryBox.x).toBeLessThan(mapPanelBox.x + 24);
});
