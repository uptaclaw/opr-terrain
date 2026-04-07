import { fireEvent, render, screen } from '@testing-library/react';
import { TerrainEditor } from './TerrainEditor';
import { TABLE_SCENE_MARGIN } from './TableCanvas';
import { TERRAIN_LIBRARY_MIME_TYPE } from './TerrainLibrarySidebar';
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

const createDataTransfer = (
  options: {
    hideCustomPayloadDuringDragOver?: boolean;
  } = {},
) => {
  const store = new Map<string, string>();
  let dragPhase: 'dragover' | 'drop' | null = null;

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
      if (
        options.hideCustomPayloadDuringDragOver &&
        dragPhase === 'dragover' &&
        format === TERRAIN_LIBRARY_MIME_TYPE
      ) {
        return '';
      }

      return store.get(format) ?? '';
    },
    setData(format: string, data: string) {
      store.set(format, data);
      dataTransfer.types = [...store.keys()];
    },
    setDragImage() {},
  };

  return {
    dataTransfer: dataTransfer as unknown as DataTransfer,
    setPhase(phase: 'dragover' | 'drop' | null) {
      dragPhase = phase;
    },
  };
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

  return event;
};

const selectPiece = (container: HTMLElement, pieceId: string, x: number, y: number) => {
  const hitTarget = container.querySelector(
    `[data-testid="terrain-piece-hit-target"][data-piece-id="${pieceId}"]`,
  ) as SVGElement;

  fireEvent.mouseDown(hitTarget, { button: 0, ...clientPoint(x, y) });
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
        heightInches={72}
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

  it('keeps delete and undo shortcuts working while the snap toggle checkbox has focus', () => {
    const { container } = render(
      <TerrainEditor
        widthInches={48}
        heightInches={72}
        deploymentDepthInches={12}
        initialPieces={[baseWallPiece]}
      />,
    );

    selectPiece(container, 'wall-1', 10, 10);

    const snapToggle = screen.getByTestId('snap-toggle');
    snapToggle.focus();

    fireEvent.keyDown(snapToggle, { key: 'Delete' });
    expect(screen.queryAllByTestId('terrain-piece')).toHaveLength(0);

    fireEvent.keyDown(snapToggle, { key: 'z', ctrlKey: true });
    expect(screen.getAllByTestId('terrain-piece')).toHaveLength(1);

    fireEvent.keyDown(snapToggle, { key: 'z', ctrlKey: true, shiftKey: true });
    expect(screen.queryAllByTestId('terrain-piece')).toHaveLength(0);
  });

  it('rotates the selected piece from the rotation handle and can undo the change', () => {
    const { container } = render(
      <TerrainEditor
        widthInches={48}
        heightInches={72}
        deploymentDepthInches={12}
        initialPieces={[baseWallPiece]}
      />,
    );

    selectPiece(container, 'wall-1', 10, 10);

    // Piece starts at rotation 0
    expect(getPiece(container, 'wall-1')).toHaveAttribute('data-piece-rotation', '0');

    // Get the rotation handle and drag it to create a rotation
    const rotationHandle = screen.getByTestId('rotation-handle');
    
    // Start drag on rotation handle
    fireEvent.mouseDown(rotationHandle, { button: 0, ...clientPoint(10, 5) });
    
    // Drag to the right to rotate the piece
    fireEvent.mouseMove(window, clientPoint(15, 10));
    
    // Finish the drag
    fireEvent.mouseUp(window, clientPoint(15, 10));

    // Rotation should have changed from initial 0
    const rotatedPiece = getPiece(container, 'wall-1');
    const rotation = Number(rotatedPiece.getAttribute('data-piece-rotation'));
    expect(rotation).not.toBe(0);
    expect(rotation).toBeGreaterThan(0);

    // Undo should restore to rotation 0
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });

    expect(getPiece(container, 'wall-1')).toHaveAttribute('data-piece-rotation', '0');
  });

  it('moves pieces to valid positions and blocks overlapping drags', () => {
    const { container } = render(
      <TerrainEditor
        widthInches={48}
        heightInches={72}
        deploymentDepthInches={12}
        initialPieces={[baseWallPiece, blockerWallPiece]}
      />,
    );

    const firstHitTarget = () =>
      container.querySelector(
        '[data-testid="terrain-piece-hit-target"][data-piece-id="wall-1"]',
      ) as SVGElement;

    fireEvent.mouseDown(firstHitTarget(), { button: 0, ...clientPoint(10, 10) });
    fireEvent.mouseMove(window, clientPoint(16, 10));
    fireEvent.mouseUp(window, clientPoint(16, 10));

    expect(getPiece(container, 'wall-1')).toHaveAttribute('data-piece-x', '16');

    fireEvent.mouseDown(firstHitTarget(), { button: 0, ...clientPoint(16, 10) });
    fireEvent.mouseMove(window, clientPoint(26, 10));
    fireEvent.mouseUp(window, clientPoint(26, 10));

    expect(getPiece(container, 'wall-1')).toHaveAttribute('data-piece-x', '16');
  });

  it('snaps newly dropped library pieces to the 1-inch grid by default', () => {
    const { container } = render(
      <TerrainEditor
        widthInches={48}
        heightInches={72}
        deploymentDepthInches={12}
        initialPieces={[]}
      />,
    );

    const libraryItem = screen.getByTestId('library-item-wall');
    const dropzone = screen.getByTestId('table-canvas-dropzone');
    const { dataTransfer, setPhase } = createDataTransfer();

    fireEvent.dragStart(libraryItem, { dataTransfer });
    setPhase('dragover');
    dispatchDragEvent(dropzone, 'dragover', dataTransfer, clientPoint(11.4, 13.6));
    setPhase('drop');
    dispatchDragEvent(dropzone, 'drop', dataTransfer, clientPoint(11.4, 13.6));
    setPhase(null);

    const placedPiece = container.querySelector('[data-testid="terrain-piece"]');

    expect(Number(placedPiece?.getAttribute('data-piece-x'))).toBe(11);
    expect(Number(placedPiece?.getAttribute('data-piece-y'))).toBe(14);
  });

  it('allows free placement when snap-to-grid is turned off', () => {
    const { container } = render(
      <TerrainEditor
        widthInches={48}
        heightInches={72}
        deploymentDepthInches={12}
        initialPieces={[]}
      />,
    );

    fireEvent.click(screen.getByTestId('snap-toggle'));

    const libraryItem = screen.getByTestId('library-item-wall');
    const dropzone = screen.getByTestId('table-canvas-dropzone');
    const { dataTransfer, setPhase } = createDataTransfer();

    fireEvent.dragStart(libraryItem, { dataTransfer });
    setPhase('dragover');
    dispatchDragEvent(dropzone, 'dragover', dataTransfer, clientPoint(11.4, 13.6));
    setPhase('drop');
    dispatchDragEvent(dropzone, 'drop', dataTransfer, clientPoint(11.4, 13.6));
    setPhase(null);

    const placedPiece = container.querySelector('[data-testid="terrain-piece"]');

    expect(Number(placedPiece?.getAttribute('data-piece-x'))).toBeCloseTo(11.4, 3);
    expect(Number(placedPiece?.getAttribute('data-piece-y'))).toBeCloseTo(13.6, 3);
  });

  it('accepts library drags during dragover even when browsers hide custom payload data until drop', () => {
    const { container } = render(
      <TerrainEditor
        widthInches={48}
        heightInches={72}
        deploymentDepthInches={12}
        initialPieces={[]}
      />,
    );

    const libraryItem = screen.getByTestId('library-item-wall');
    const dropzone = screen.getByTestId('table-canvas-dropzone');
    const { dataTransfer, setPhase } = createDataTransfer({
      hideCustomPayloadDuringDragOver: true,
    });

    fireEvent.dragStart(libraryItem, { dataTransfer });
    setPhase('dragover');
    const dragOverEvent = dispatchDragEvent(
      dropzone,
      'dragover',
      dataTransfer,
      clientPoint(11.4, 13.6),
    );

    expect(dragOverEvent.defaultPrevented).toBe(true);

    setPhase('drop');
    dispatchDragEvent(dropzone, 'drop', dataTransfer, clientPoint(11.4, 13.6));
    setPhase(null);

    expect(container.querySelectorAll('[data-testid="terrain-piece"]')).toHaveLength(1);
  });

  it('uses piece-shaped interaction targets instead of padded circular hitboxes', () => {
    const { container } = render(
      <TerrainEditor
        widthInches={48}
        heightInches={72}
        deploymentDepthInches={12}
        initialPieces={[baseWallPiece]}
      />,
    );

    const hitTarget = container.querySelector(
      '[data-testid="terrain-piece-hit-target"][data-piece-id="wall-1"]',
    );

    expect(hitTarget?.tagName.toLowerCase()).toBe('rect');
    expect(hitTarget).toHaveAttribute('width', '8');
    expect(hitTarget).toHaveAttribute('height', '2');
    expect(hitTarget).not.toHaveAttribute('r');
  });
});
