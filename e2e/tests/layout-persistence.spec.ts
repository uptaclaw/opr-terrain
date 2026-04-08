import { expect, test } from '@playwright/test';
import { LayoutStudioPage } from '../pages/layoutStudioPage';

test('saved layouts survive reloads and can be loaded back after resetting the board', async ({ page }) => {
  const studio = new LayoutStudioPage(page);

  await studio.goto();
  await studio.dragLibraryItemToCanvas('bunker', { x: 34, y: 28 });

  const savedPiece = await studio.getPieceDataByName('Bunker');

  await page.getByLabel(/saved layout name/i).fill('E2E Practice Layout');
  await page.getByRole('button', { name: /save current layout/i }).click();
  await expect(page.getByText(/saved layout "E2E Practice Layout"/i)).toBeVisible();

  await page.reload();
  await expect(studio.savedLayoutCard('E2E Practice Layout')).toBeVisible();
  await expect(studio.layoutPieceByName('Bunker')).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: /reset sample/i }).click();
  await expect(studio.layoutPieceByName('Bunker')).toHaveCount(0);

  await studio.savedLayoutCard('E2E Practice Layout').getByRole('button', { name: /load/i }).click();

  const restoredPiece = await studio.getPieceDataByName('Bunker');

  expect(restoredPiece.x).toBeCloseTo(savedPiece.x, 1);
  expect(restoredPiece.y).toBeCloseTo(savedPiece.y, 1);
  expect(restoredPiece.width).toBe(savedPiece.width);
  expect(restoredPiece.height).toBe(savedPiece.height);
});
