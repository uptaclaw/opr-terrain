import { expect, test } from '@playwright/test';
import { LayoutStudioPage } from '../pages/layoutStudioPage';

test('uses the landscape table layout with legend left, library right, and a simplified print legend', async ({ page }) => {
  const studio = new LayoutStudioPage(page);

  await studio.goto();

  await expect(page.getByText(/6' × 4'/i).first()).toBeVisible();
  await expect(page.getByTestId('screen-left-column').getByRole('heading', { name: /terrain summary legend/i })).toBeVisible();
  await expect(page.getByTestId('screen-right-column').getByText(/terrain library/i)).toBeVisible();

  await expect(studio.interactiveCanvas.getByTestId('deployment-zone-top')).toBeVisible();
  await expect(studio.interactiveCanvas.getByTestId('deployment-zone-bottom')).toBeVisible();
  await expect(studio.interactiveCanvas.getByTestId('deployment-zone-left')).toHaveCount(0);
  await expect(studio.interactiveCanvas.getByTestId('deployment-zone-right')).toHaveCount(0);

  const printLegend = page.getByTestId('print-legend');
  await expect(printLegend).toContainText('Central Ruins');
  await expect(printLegend).toContainText('Heavy Cover • Difficult • LoS Blocking');
  await expect(printLegend).not.toContainText(/x\s+36/i);
  await expect(printLegend).not.toContainText(/8"\s*×\s*6"/i);
});
