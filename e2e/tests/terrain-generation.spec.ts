import { expect, test } from '@playwright/test';
import { LayoutStudioPage } from '../pages/layoutStudioPage';

test('re-generating terrain produces full layouts and changes the arrangement', async ({ page }) => {
  const studio = new LayoutStudioPage(page);

  await studio.goto();

  const initialSignature = await studio.getLayoutSignature();

  await page.getByRole('button', { name: /re-generate terrain/i }).click();
  await expect(page.getByText(/generated \d+ terrain pieces using/i)).toBeVisible();

  const firstCount = await studio.pieceCount();
  const firstSignature = await studio.getLayoutSignature();

  expect(firstCount).toBeGreaterThanOrEqual(10);
  expect(firstCount).toBeLessThanOrEqual(15);
  expect(firstSignature).not.toBe(initialSignature);

  await page.getByRole('button', { name: /re-generate terrain/i }).click();
  await expect.poll(async () => studio.getLayoutSignature()).not.toBe(firstSignature);

  const secondCount = await studio.pieceCount();
  const secondSignature = await studio.getLayoutSignature();

  expect(secondCount).toBeGreaterThanOrEqual(10);
  expect(secondCount).toBeLessThanOrEqual(15);
  expect(secondSignature).not.toBe(firstSignature);
});
