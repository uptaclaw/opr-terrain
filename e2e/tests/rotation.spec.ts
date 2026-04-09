import { expect, test } from '@playwright/test';
import { LayoutStudioPage } from '../pages/layoutStudioPage';

test('selecting terrain shows an on-canvas rotation handle and rotates clockwise when dragged to the right', async ({ page }) => {
  const studio = new LayoutStudioPage(page);

  await studio.goto();

  await expect(studio.interactiveCanvas.getByTestId('rotation-handle')).toHaveCount(0);
  await expect(page.getByText(/^selected piece$/i)).toHaveCount(0);

  await studio.selectPiece('Central Ruins');

  const before = await studio.getPieceDataByName('Central Ruins');

  await expect(studio.interactiveCanvas.getByTestId('rotation-handle')).toBeVisible();
  await expect(page.getByText(/^selected piece$/i)).toHaveCount(0);

  await studio.rotateSelectedPieceTo('Central Ruins', {
    x: Math.min(46, before.x + 10),
    y: before.y,
  });

  const after = await studio.getPieceDataByName('Central Ruins');

  expect(after.rotation).toBeGreaterThan(45);
  expect(after.rotation).toBeLessThan(135);
});

test('dragging the rotation handle to the left rotates counterclockwise', async ({ page }) => {
  const studio = new LayoutStudioPage(page);

  await studio.goto();
  await studio.selectPiece('Central Ruins');

  const before = await studio.getPieceDataByName('Central Ruins');

  await studio.rotateSelectedPieceTo('Central Ruins', {
    x: Math.max(2, before.x - 10),
    y: before.y,
  });

  const after = await studio.getPieceDataByName('Central Ruins');

  expect(after.rotation).toBeLessThan(-45);
  expect(after.rotation).toBeGreaterThan(-135);
});
