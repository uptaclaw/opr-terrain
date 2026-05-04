import { expect, type Locator, type Page } from '@playwright/test';

const TABLE_SCENE_MARGIN = {
  top: 4,
  right: 4,
  bottom: 7,
  left: 7,
} as const;

const DEFAULT_TABLE = {
  widthInches: 72,
  heightInches: 48,
} as const;

type TablePoint = {
  x: number;
  y: number;
};

type TableSize = {
  widthInches: number;
  heightInches: number;
};

type LayoutPieceData = {
  id: string;
  name: string;
  templateId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

export class LayoutStudioPage {
  readonly page: Page;
  readonly interactiveCanvas: Locator;
  readonly interactiveDropzone: Locator;

  constructor(page: Page) {
    this.page = page;
    this.interactiveCanvas = page.getByTestId('table-canvas-svg').first();
    this.interactiveDropzone = page.getByTestId('table-canvas-dropzone').first();
  }

  async goto(hash?: string) {
    await this.page.goto(`./${hash ? '#' + hash : ''}`);
    await expect(
      this.page.getByRole('heading', { name: /layout persistence, export & sharing/i }),
    ).toBeVisible();
    await expect(this.interactiveCanvas).toBeVisible();
  }

  layoutPieceByName(name: string) {
    return this.interactiveCanvas.locator(
      `[data-testid="layout-terrain-piece"][data-piece-name="${name}"]`,
    ).first();
  }

  savedLayoutCard(name: string) {
    return this.page.locator('article').filter({ has: this.page.getByText(name, { exact: true }) }).first();
  }

  async pieceCount() {
    return this.interactiveCanvas.locator('[data-testid="layout-terrain-piece"]').count();
  }

  async getPieceDataByName(name: string): Promise<LayoutPieceData> {
    const piece = this.layoutPieceByName(name);
    await expect(piece).toBeVisible();

    return piece.evaluate((element) => ({
      id: element.getAttribute('data-piece-id') || '',
      name: element.getAttribute('data-piece-name') || '',
      templateId: element.getAttribute('data-piece-template-id') || '',
      x: Number(element.getAttribute('data-piece-x') || '0'),
      y: Number(element.getAttribute('data-piece-y') || '0'),
      width: Number(element.getAttribute('data-piece-width') || '0'),
      height: Number(element.getAttribute('data-piece-height') || '0'),
      rotation: Number(element.getAttribute('data-piece-rotation') || '0'),
    }));
  }

  async getLayoutSignature() {
    const pieces = await this.interactiveCanvas
      .locator('[data-testid="layout-terrain-piece"]')
      .evaluateAll((elements) =>
        elements
          .map((element) => ({
            templateId: element.getAttribute('data-piece-template-id') || '',
            name: element.getAttribute('data-piece-name') || '',
            x: Number(element.getAttribute('data-piece-x') || '0'),
            y: Number(element.getAttribute('data-piece-y') || '0'),
            rotation: Number(element.getAttribute('data-piece-rotation') || '0'),
          }))
          .sort((left, right) => `${left.name}-${left.x}-${left.y}`.localeCompare(`${right.name}-${right.x}-${right.y}`)),
      );

    return JSON.stringify(pieces);
  }

  async dragLibraryItemToCanvas(templateId: string, point: TablePoint, tableSize: TableSize = DEFAULT_TABLE) {
    const dataTransfer = await this.page.evaluateHandle(() => new DataTransfer());
    const clientPoint = await this.toClientPoint(point, tableSize);
    const libraryItem = this.page.getByTestId(`library-item-${templateId}`);

    await libraryItem.dispatchEvent('dragstart', { dataTransfer });
    await this.interactiveDropzone.dispatchEvent('dragover', {
      dataTransfer,
      clientX: clientPoint.x,
      clientY: clientPoint.y,
    });
    await this.interactiveDropzone.dispatchEvent('drop', {
      dataTransfer,
      clientX: clientPoint.x,
      clientY: clientPoint.y,
    });
    await libraryItem.dispatchEvent('dragend', { dataTransfer });
  }

  async selectPiece(name: string) {
    await this.layoutPieceByName(name).click();
  }

  async rotateSelectedPieceTo(name: string, point: TablePoint, tableSize: TableSize = DEFAULT_TABLE) {
    const handle = this.interactiveCanvas.getByTestId('rotation-handle');
    await expect(handle).toBeVisible();

    const handleBox = await handle.boundingBox();

    if (!handleBox) {
      throw new Error('Rotation handle is not visible.');
    }

    await this.getPieceDataByName(name);
    const endPoint = await this.toClientPoint(point, tableSize);

    await this.page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(endPoint.x, endPoint.y, { steps: 12 });
    await this.page.mouse.up();
  }

  async copyShareUrl() {
    await this.page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await this.page.getByRole('button', { name: /copy share url/i }).click();
    await expect(this.page.getByText(/shareable url copied to the clipboard/i)).toBeVisible();

    const clipboardText = await this.page.evaluate(async () => {
      try {
        return await navigator.clipboard.readText();
      } catch {
        return '';
      }
    });

    return clipboardText || this.page.url();
  }

  async toClientPoint(point: TablePoint, tableSize: TableSize = DEFAULT_TABLE) {
    const box = await this.interactiveCanvas.boundingBox();

    if (!box) {
      throw new Error('Interactive canvas is not visible.');
    }

    const sceneWidth = TABLE_SCENE_MARGIN.left + tableSize.widthInches + TABLE_SCENE_MARGIN.right;
    const sceneHeight = TABLE_SCENE_MARGIN.top + tableSize.heightInches + TABLE_SCENE_MARGIN.bottom;
    const sceneX = TABLE_SCENE_MARGIN.left + point.x;
    const sceneY = TABLE_SCENE_MARGIN.top + tableSize.heightInches - point.y;

    return {
      x: box.x + (sceneX / sceneWidth) * box.width,
      y: box.y + (sceneY / sceneHeight) * box.height,
    };
  }
}
