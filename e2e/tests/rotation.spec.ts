import { expect, test } from '@playwright/test';
import { LayoutStudioPage } from '../pages/layoutStudioPage';
import { encodeLayoutHash } from '../utils/layoutHash';

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

test('migrates legacy portrait layouts with true rotated-bounds clamping', async ({ page }) => {
  const studio = new LayoutStudioPage(page);
  const legacyPortraitHash = encodeLayoutHash({
    version: 1,
    table: {
      widthInches: 48,
      heightInches: 72,
      deploymentDepthInches: 12,
      title: 'Portrait Edge Clamp',
    },
    pieces: [
      {
        id: 'edge-barricade',
        templateId: 'barricade',
        name: 'Edge Barricade',
        shape: 'rect',
        fill: '#111111',
        stroke: '#ffffff',
        width: 12,
        height: 4,
        x: 24,
        y: 2,
        rotation: 45,
        traits: [],
      },
    ],
  });

  await studio.goto(legacyPortraitHash);

  const migratedPiece = await studio.getPieceDataByName('Edge Barricade');

  expect(migratedPiece.rotation).toBe(-45);
  expect(migratedPiece.x).toBeCloseTo(4 * Math.SQRT2, 2);
  expect(migratedPiece.y).toBe(24);
});
