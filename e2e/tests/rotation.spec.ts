import { expect, test } from '@playwright/test';
import { LayoutStudioPage } from '../pages/layoutStudioPage';

test('selecting terrain shows an on-canvas rotation handle and no selected-piece panel', async ({ page }) => {
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

  expect(after.rotation).not.toBe(before.rotation);
  expect(Math.abs(after.rotation)).toBeGreaterThan(45);
});
