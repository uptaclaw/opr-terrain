import { fireEvent, render, screen } from '@testing-library/react';
import { TerrainEditor } from './TerrainEditor';
import { TABLE_SCENE_MARGIN } from './TableCanvas';
import type { TerrainPiece } from '../terrain/types';

const baseWallPiece: TerrainPiece = {
  id: 'wall-1',
  templateId: 'wall',
  name: 'Wall',
  color: '#94a3b8',
  traits: ['Soft Cover'],
  x: 10,
  y: 10,
  rotation: 0,
  collisionRadius: Math.hypot(4, 1),
  shape: {
    kind: 'rectangle',
    width: 8,
    height: 2,
  },
};

const blockerWallPiece: TerrainPiece = {
  ...baseWallPiece,
  id: 'wall-2',
  x: 26,
  y: 10,
};

const clientPoint = (tableX: number, tableY: number) => ({
  clientX: (TABLE_SCENE_MARGIN.left + tableX) * 10,
  clientY: (TABLE_SCENE_MARGIN.top + tableY) * 10,
});

const createDataTransfer = () => {
  const store = new Map<string, string>();

  const dataTransfer = {
    dropEffect: 'none',
    effectAllowed: 'all',
    files: [],
    items: [],
    types: [] as string[],
    clearData(format?: string) {
      if (format) {
        store.delete(format);
      } else {
        store.clear();
      }

      dataTransfer.types = [...store.keys()];
    },
    getData(format: string) {
      return store.get(format) ?? '';
    },
    setData(format: string, data: string) {
      store.set(format, data);
      dataTransfer.types = [...store.keys()];
    },
    setDragImage() {},
  };

  return dataTransfer as unknown as DataTransfer;
};

const dispatchDragEvent = (
  element: Element,
  type: 'dragover' | 'drop',
  dataTransfer: DataTransfer,
  point: { clientX: number; clientY: number },
) => {
  const event = new Event(type, { bubbles: true, cancelable: true });

  Object.defineProperties(event, {
    dataTransfer: {
      value: dataTransfer,
    },
    clientX: {
      value: point.clientX,
    },
    clientY: {
      value: point.clientY,
    },
  });

  fireEvent(element, event);
};

const selectPiece = (container: HTMLElement, pieceId: string, x: number, y: number) => {
  const hitbox = container.querySelector(
    `[data-testid="terrain-piece-hitbox"][data-piece-id="${pieceId}"]`,
  ) as SVGCircleElement;

  fireEvent.mouseDown(hitbox, { button: 0, ...clientPoint(x, y) });
  fireEvent.mouseUp(window, clientPoint(x, y));
};

const getPiece = (container: HTMLElement, pieceId: string) =>
  container.querySelector(`[data-testid="terrain-piece"][data-piece-id="${pieceId}"]`);

describe('TerrainEditor', () => {
  const getBoundingClientRectSpy = vi.spyOn(SVGSVGElement.prototype, 'getBoundingClientRect');

  beforeEach(() => {
    getBoundingClientRectSpy.mockReturnValue(
      DOMRect.fromRect({
        x: 0,
        y: 0,
        width: 590,
        height: 590,
      }),
    );
  });

  afterEach(() => {
    getBoundingClientRectSpy.mockReset();
  });

  afterAll(() => {
    getBoundingClientRectSpy.mockRestore();
  });

  it('deletes the selected piece and supports undo/redo keyboard shortcuts', () => {
    const { container } = render(
      <TerrainEditor
        widthInches={48}
        heightInches={48}
        deploymentDepthInches={12}
        initialPieces={[baseWallPiece]}
      />,
    );

    selectPiece(container, 'wall-1', 10, 10);

    fireEvent.keyDown(window, { key: 'Delete' });
    expect(screen.queryAllByTestId('terrain-piece')).toHaveLength(0);

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(screen.getAllByTestId('terrain-piece')).toHaveLength(1);

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });
    expect(screen.queryAllByTestId('terrain-piece')).toHaveLength(0);
  });

  it('rotates the selected piece from the rotation handle and can undo the change', () => {
    const { container } = render(
      <TerrainEditor
        widthInches={48}
        heightInches={48}
        deploymentDepthInches={12}
        initialPieces={[baseWallPiece]}
      />,
    );

    selectPiece(container, 'wall-1', 10, 10);

    fireEvent.mouseDown(screen.getByTestId('rotation-handle'), { button: 0 });

    expect(getPiece(container, 'wall-1')).toHaveAttribute('data-piece-rotation', '90');

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });

    expect(getPiece(container, 'wall-1')).toHaveAttribute('data-piece-rotation', '0');
  });

  it('moves pieces to valid positions and blocks overlapping drags', () => {
    const { container } = render(
      <TerrainEditor
        widthInches={48}
        heightInches={48}
        deploymentDepthInches={12}
        initialPieces={[baseWallPiece, blockerWallPiece]}
      />,
    );

    const firstHitbox = () =>
      container.querySelector(
        '[data-testid="terrain-piece-hitbox"][data-piece-id="wall-1"]',
      ) as SVGCircleElement;

    fireEvent.mouseDown(firstHitbox(), { button: 0, ...clientPoint(10, 10) });
    fireEvent.mouseMove(window, clientPoint(16, 10));
    fireEvent.mouseUp(window, clientPoint(16, 10));

    expect(getPiece(container, 'wall-1')).toHaveAttribute('data-piece-x', '16');

    fireEvent.mouseDown(firstHitbox(), { button: 0, ...clientPoint(16, 10) });
    fireEvent.mouseMove(window, clientPoint(26, 10));
    fireEvent.mouseUp(window, clientPoint(26, 10));

    expect(getPiece(container, 'wall-1')).toHaveAttribute('data-piece-x', '16');
  });

  it('snaps newly dropped library pieces to the 1-inch grid by default', () => {
    const { container } = render(
      <TerrainEditor
        widthInches={48}
        heightInches={48}
        deploymentDepthInches={12}
        initialPieces={[]}
      />,
    );

    const libraryItem = screen.getByTestId('library-item-wall');
    const dropzone = screen.getByTestId('table-canvas-dropzone');
    const dataTransfer = createDataTransfer();

    fireEvent.dragStart(libraryItem, { dataTransfer });
    dispatchDragEvent(dropzone, 'dragover', dataTransfer, clientPoint(11.4, 13.6));
    dispatchDragEvent(dropzone, 'drop', dataTransfer, clientPoint(11.4, 13.6));

    const placedPiece = container.querySelector('[data-testid="terrain-piece"]');

    expect(Number(placedPiece?.getAttribute('data-piece-x'))).toBe(11);
    expect(Number(placedPiece?.getAttribute('data-piece-y'))).toBe(14);
  });

  it('allows free placement when snap-to-grid is turned off', () => {
    const { container } = render(
      <TerrainEditor
        widthInches={48}
        heightInches={48}
        deploymentDepthInches={12}
        initialPieces={[]}
      />,
    );

    fireEvent.click(screen.getByTestId('snap-toggle'));

    const libraryItem = screen.getByTestId('library-item-wall');
    const dropzone = screen.getByTestId('table-canvas-dropzone');
    const dataTransfer = createDataTransfer();

    fireEvent.dragStart(libraryItem, { dataTransfer });
    dispatchDragEvent(dropzone, 'dragover', dataTransfer, clientPoint(11.4, 13.6));
    dispatchDragEvent(dropzone, 'drop', dataTransfer, clientPoint(11.4, 13.6));

    const placedPiece = container.querySelector('[data-testid="terrain-piece"]');

    expect(Number(placedPiece?.getAttribute('data-piece-x'))).toBeCloseTo(11.4, 3);
    expect(Number(placedPiece?.getAttribute('data-piece-y'))).toBeCloseTo(13.6, 3);
  });
});
