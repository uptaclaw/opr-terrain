import { expect, test } from '@playwright/test';
import { LayoutStudioPage } from '../pages/layoutStudioPage';

test('copy share URL reconstructs the same layout in a fresh browser context', async ({ page, browser }) => {
  const studio = new LayoutStudioPage(page);

  await studio.goto();
  await studio.dragLibraryItemToCanvas('bunker', { x: 34, y: 28 });

  const originalSignature = await studio.getLayoutSignature();
  const sharedUrl = await studio.copyShareUrl();

  const sharedContext = await browser.newContext();
  const sharedPage = await sharedContext.newPage();
  const sharedStudio = new LayoutStudioPage(sharedPage);

  await sharedPage.goto(sharedUrl);
  await expect(sharedPage.getByRole('heading', { name: /layout studio/i })).toBeVisible();

  const sharedSignature = await sharedStudio.getLayoutSignature();

  expect(sharedSignature).toBe(originalSignature);

  await sharedContext.close();
});
