import { expect, test } from '@playwright/test';
import { LayoutStudioPage } from '../pages/layoutStudioPage';

test('drags terrain from the library onto the canvas with the expected footprint', async ({ page }) => {
  const studio = new LayoutStudioPage(page);

  await studio.goto();

  const initialCount = await studio.pieceCount();

  await studio.dragLibraryItemToCanvas('ruins', { x: 16, y: 20 });

  await expect(studio.layoutPieceByName('Ruins')).toBeVisible();
  await expect(studio.interactiveCanvas.locator('[data-testid="layout-terrain-piece"]')).toHaveCount(initialCount + 1);

  const placedPiece = await studio.getPieceDataByName('Ruins');

  expect(placedPiece.templateId).toBe('ruins');
  expect(placedPiece.x).toBeCloseTo(16, 1);
  expect(placedPiece.y).toBeCloseTo(20, 1);
  expect(placedPiece.width).toBe(8);
  expect(placedPiece.height).toBe(6);
});
