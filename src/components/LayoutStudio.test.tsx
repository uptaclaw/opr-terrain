import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { LayoutStudio } from './LayoutStudio';
import { TABLE_SCENE_MARGIN } from './TableCanvas';
import { TERRAIN_LIBRARY_MIME_TYPE } from './TerrainPaletteTable';
import { createDefaultLayout, createTerrainPiece, terrainCatalog } from '../data/terrainCatalog';
import { CUSTOM_PIECES_STORAGE_KEY, PRESET_OVERRIDES_STORAGE_KEY } from '../lib/customPieces';
import { encodeLayoutHash } from '../lib/layout';
import type { TerrainTemplate } from '../types/layout';

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

const getCustomLibraryRows = () =>
  screen
    .getAllByTestId(/^library-item-/)
    .filter((row) => within(row).queryByRole('button', { name: /delete/i }));

describe('LayoutStudio', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(window.history.state, '', '/');

    vi.spyOn(SVGSVGElement.prototype, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({
        x: 0,
        y: 0,
        width: 830,
        height: 590,
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('saves named layouts to localStorage and reloads them after remount', () => {
    const view = render(<LayoutStudio />);

    fireEvent.change(screen.getByLabelText(/saved layout name/i), {
      target: { value: 'Practice Match' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save current layout/i }));

    expect(screen.getByText('Practice Match')).toBeInTheDocument();

    view.unmount();
    render(<LayoutStudio />);

    expect(screen.getByText('Practice Match')).toBeInTheDocument();
  });

  it('shows a warning instead of crashing when browser storage writes fail', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage disabled');
    });

    expect(() => render(<LayoutStudio />)).not.toThrow();
    expect(screen.getByRole('alert')).toHaveTextContent(/browser storage is unavailable/i);

    fireEvent.change(screen.getByLabelText(/saved layout name/i), {
      target: { value: 'Practice Match' },
    });

    expect(() => fireEvent.click(screen.getByRole('button', { name: /save current layout/i }))).not.toThrow();
    expect(screen.getByText('Practice Match')).toBeInTheDocument();
    expect(screen.getByText(/saved layout "Practice Match" for this tab/i)).toBeInTheDocument();
  });

  it('keeps the full share URL out of the header while copy still uses it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText,
      },
    });

    render(<LayoutStudio />);

    const currentHash = window.location.hash.slice(1);

    expect(currentHash.length).toBeGreaterThan(0);
    expect(screen.queryByText((content) => content.includes(currentHash))).not.toBeInTheDocument();
    expect(screen.getByText(/use copy share url to grab the full link/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /copy share url/i }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(window.location.toString());
    });

    expect(screen.getByText(/shareable URL copied to the clipboard/i)).toBeInTheDocument();
  });

  it('renders a compact print legend with terrain names and simplified traits only', () => {
    render(<LayoutStudio />);

    const printLegend = screen.getByTestId('print-legend');
    const centralRuinsItems = within(printLegend).getAllByText(/central ruins/i);

    expect(screen.getByRole('heading', { name: /terrain legend/i })).toBeInTheDocument();
    expect(centralRuinsItems.length).toBeGreaterThan(0);
    expect(within(printLegend).getByText(/heavy cover • difficult • los blocking/i)).toBeInTheDocument();
    expect(within(printLegend).queryByText(/x\s+36(\.0)?\s*\/\s*y\s+24(\.0)?/i)).not.toBeInTheDocument();
    expect(within(printLegend).queryByText(/8"\s*×\s*6"/i)).not.toBeInTheDocument();
    expect(screen.getByText(/print preview/i)).toBeInTheDocument();
  });

  it('places the summary legend in the left column and the terrain library in the right column', () => {
    render(<LayoutStudio />);

    const leftColumn = screen.getByTestId('screen-left-column');
    const rightColumn = screen.getByTestId('screen-right-column');

    expect(within(leftColumn).getByRole('heading', { name: /terrain summary legend/i })).toBeInTheDocument();
    expect(within(rightColumn).getByText(/terrain library/i)).toBeInTheDocument();
    expect(within(rightColumn).getByText(/drag pieces onto the table/i)).toBeInTheDocument();
  });

  it('removes the selected piece panel and shows an on-canvas rotation handle after selection', () => {
    render(<LayoutStudio />);

    expect(screen.queryByText(/^piece inspector$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^selected piece$/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('rotation-handle')).not.toBeInTheDocument();

    const [interactiveCanvas] = screen.getAllByTestId('table-canvas-svg');
    const centralRuins = interactiveCanvas.querySelector(
      '[data-testid="layout-terrain-piece"][data-piece-name="Central Ruins"]',
    ) as SVGElement;

    fireEvent.click(centralRuins);

    expect(screen.getByTestId('rotation-handle')).toBeInTheDocument();
    expect(screen.queryByText(/^selected piece$/i)).not.toBeInTheDocument();
  });

  it('rotates clockwise when the on-canvas handle is dragged from top to right', async () => {
    render(<LayoutStudio />);

    const [interactiveCanvas] = screen.getAllByTestId('table-canvas-svg');
    const centralRuins = interactiveCanvas.querySelector(
      '[data-testid="layout-terrain-piece"][data-piece-name="Central Ruins"]',
    ) as SVGElement;
    const defaultLayout = createDefaultLayout();
    const selectedPiece = defaultLayout.pieces.find((piece) => piece.name === 'Central Ruins');

    expect(selectedPiece).toBeDefined();

    fireEvent.click(centralRuins);

    const handle = screen.getByTestId('rotation-handle');
    const handleOffset = Math.max(selectedPiece!.width, selectedPiece!.height) / 2 + 2.4;
    const startPoint = clientPoint(
      selectedPiece!.x,
      defaultLayout.table.heightInches - selectedPiece!.y - handleOffset,
    );
    const endPoint = clientPoint(selectedPiece!.x + handleOffset, defaultLayout.table.heightInches - selectedPiece!.y);

    fireEvent.mouseDown(handle, {
      button: 0,
      ...startPoint,
    });
    fireEvent.mouseMove(window, endPoint);

    await waitFor(() => {
      const rotatedPiece = interactiveCanvas.querySelector(
        '[data-testid="layout-terrain-piece"][data-piece-name="Central Ruins"]',
      ) as SVGElement;
      const rotatedRotation = Number(rotatedPiece.getAttribute('data-piece-rotation'));

      expect(rotatedRotation).toBeGreaterThan(70);
      expect(rotatedRotation).toBeLessThan(110);
    });

    fireEvent.mouseUp(window, endPoint);

    expect(screen.getByText(/terrain rotation updated/i)).toBeInTheDocument();
  });

  it('rotates counterclockwise when the on-canvas handle is dragged from top to left', async () => {
    render(<LayoutStudio />);

    const [interactiveCanvas] = screen.getAllByTestId('table-canvas-svg');
    const centralRuins = interactiveCanvas.querySelector(
      '[data-testid="layout-terrain-piece"][data-piece-name="Central Ruins"]',
    ) as SVGElement;
    const defaultLayout = createDefaultLayout();
    const selectedPiece = defaultLayout.pieces.find((piece) => piece.name === 'Central Ruins');

    expect(selectedPiece).toBeDefined();

    fireEvent.click(centralRuins);

    const handle = screen.getByTestId('rotation-handle');
    const handleOffset = Math.max(selectedPiece!.width, selectedPiece!.height) / 2 + 2.4;
    const startPoint = clientPoint(
      selectedPiece!.x,
      defaultLayout.table.heightInches - selectedPiece!.y - handleOffset,
    );
    const endPoint = clientPoint(selectedPiece!.x - handleOffset, defaultLayout.table.heightInches - selectedPiece!.y);

    fireEvent.mouseDown(handle, {
      button: 0,
      ...startPoint,
    });
    fireEvent.mouseMove(window, endPoint);

    await waitFor(() => {
      const rotatedPiece = interactiveCanvas.querySelector(
        '[data-testid="layout-terrain-piece"][data-piece-name="Central Ruins"]',
      ) as SVGElement;
      const rotatedRotation = Number(rotatedPiece.getAttribute('data-piece-rotation'));

      expect(rotatedRotation).toBeLessThan(-70);
      expect(rotatedRotation).toBeGreaterThan(-110);
    });

    fireEvent.mouseUp(window, endPoint);

    expect(screen.getByText(/terrain rotation updated/i)).toBeInTheDocument();
  });

  it('renders the terrain summary legend and updates it when terrain is added to the layout', () => {
    render(<LayoutStudio />);

    expect(screen.getByRole('heading', { name: /terrain summary legend/i })).toBeInTheDocument();
    expect(screen.getByTestId('terrain-summary-impassable')).toHaveTextContent('1 piece');
    expect(screen.getByTestId('terrain-summary-hard-cover')).toHaveTextContent('2 pieces');
    expect(screen.getByTestId('terrain-summary-soft-cover')).toHaveTextContent('4 pieces');
    expect(screen.getByTestId('terrain-summary-difficult')).toHaveTextContent('3 pieces');
    expect(screen.getByTestId('terrain-summary-dangerous')).toHaveTextContent('0 pieces');
    expect(screen.getByTestId('terrain-summary-elevated')).toHaveTextContent('1 piece');
    expect(screen.getByTestId('terrain-summary-los-blocking')).toHaveTextContent('4 pieces');

    const bunkerRow = screen.getByTestId('library-item-bunker');
    fireEvent.click(within(bunkerRow).getByRole('button', { name: /add/i }));

    expect(screen.getByTestId('terrain-summary-impassable')).toHaveTextContent('2 pieces');
    expect(screen.getByTestId('terrain-summary-hard-cover')).toHaveTextContent('3 pieces');
    expect(screen.getByTestId('terrain-summary-los-blocking')).toHaveTextContent('5 pieces');
  });

  it('converts and renders a default generated layout through the shipped LayoutStudio path', async () => {
    render(<LayoutStudio />);

    expect(() => {
      fireEvent.click(screen.getByRole('button', { name: /generate layout/i }));
    }).not.toThrow();

    const statusMessage = await screen.findByText(/generated \d+ terrain pieces using random strategy/i, {}, {
      timeout: 15000,
    });
    const generatedCount = Number(statusMessage.textContent?.match(/Generated (\d+) terrain pieces/i)?.[1] ?? '0');

    expect(generatedCount).toBeGreaterThanOrEqual(10);
    expect(generatedCount).toBeLessThanOrEqual(15);

    const [interactiveCanvas] = screen.getAllByTestId('table-canvas-svg');
    expect(interactiveCanvas.querySelectorAll('[data-testid="layout-terrain-piece"]')).toHaveLength(generatedCount);
  }, 15000);

  it('hydrates shared custom templates from the URL on initial load', () => {
    const sharedTemplate: TerrainTemplate = {
      id: 'shared-spire',
      name: 'Shared Spire',
      shape: 'diamond',
      fill: '#123456',
      stroke: '#abcdef',
      width: 8,
      height: 6,
      defaultRotation: 0,
      traits: [{ id: 'blocks-los', label: 'Blocks line of sight', category: 'los', active: true }],
    };
    const sharedLayout = createDefaultLayout();
    sharedLayout.pieces = [...sharedLayout.pieces, createTerrainPiece(sharedTemplate, { x: 18, y: 28 })];
    sharedLayout.customTemplates = [sharedTemplate];

    window.history.replaceState(window.history.state, '', `/#${encodeLayoutHash(sharedLayout)}`);

    render(<LayoutStudio />);

    expect(screen.getByTestId('library-item-shared-spire')).toBeInTheDocument();
    expect(within(screen.getByTestId('library-item-shared-spire')).getByText('Shared Spire')).toBeInTheDocument();
  });

  it('adds terrain pieces to the canvas when rows are dragged from the palette', () => {
    render(<LayoutStudio />);

    const [interactiveCanvas] = screen.getAllByTestId('table-canvas-svg');
    const [dropzone] = screen.getAllByTestId('table-canvas-dropzone');
    const initialPieceCount = interactiveCanvas.querySelectorAll('[data-testid="layout-terrain-piece"]').length;
    const libraryItem = screen.getByTestId('library-item-ruins');
    const { dataTransfer, setPhase } = createDataTransfer({
      hideCustomPayloadDuringDragOver: true,
    });

    fireEvent.dragStart(libraryItem, { dataTransfer });
    setPhase('dragover');
    const dragOverEvent = dispatchDragEvent(dropzone, 'dragover', dataTransfer, clientPoint(16, 20));

    expect(dragOverEvent.defaultPrevented).toBe(true);

    setPhase('drop');
    dispatchDragEvent(dropzone, 'drop', dataTransfer, clientPoint(16, 20));
    setPhase(null);

    expect(interactiveCanvas.querySelectorAll('[data-testid="layout-terrain-piece"]')).toHaveLength(initialPieceCount + 1);
    expect(interactiveCanvas.querySelector('[data-testid="layout-terrain-piece"][data-piece-name="Ruins"]')).toBeInTheDocument();
    expect(screen.getByText(/added ruins terrain/i)).toBeInTheDocument();
  });

  it('persists preset overrides and reapplies them after remount', () => {
    const firstView = render(<LayoutStudio />);
    const barricadeRow = screen.getByTestId('library-item-barricade');

    fireEvent.click(within(barricadeRow).getByRole('button', { name: /edit/i }));
    fireEvent.change(screen.getByLabelText(/^name$/i), {
      target: { value: 'Barricade Deluxe' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    expect(screen.getByText(/updated preset: barricade deluxe/i)).toBeInTheDocument();
    expect(window.localStorage.getItem(PRESET_OVERRIDES_STORAGE_KEY)).toContain('Barricade Deluxe');

    firstView.unmount();

    const { container } = render(<LayoutStudio />);
    const reloadedBarricadeRow = screen.getByTestId('library-item-barricade');

    expect(within(reloadedBarricadeRow).getByText('Barricade Deluxe')).toBeInTheDocument();

    fireEvent.click(within(reloadedBarricadeRow).getByRole('button', { name: /add/i }));

    expect(
      container.querySelector(
        '[data-testid="layout-terrain-piece"][data-piece-name="Barricade Deluxe"][data-piece-template-id="barricade"][data-piece-rotation="18"]',
      ),
    ).toBeInTheDocument();
  });

  it('opens duplicate as a draft and only persists it after save', () => {
    render(<LayoutStudio />);
    const barricadeRow = screen.getByTestId('library-item-barricade');
    const initialCustomPieceCount = getCustomLibraryRows().length;

    fireEvent.click(within(barricadeRow).getByRole('button', { name: /duplicate/i }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByDisplayValue('Barricade (Copy)')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('7')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('2.5')).toBeInTheDocument();
    expect(getCustomLibraryRows()).toHaveLength(initialCustomPieceCount);
    expect(window.localStorage.getItem(CUSTOM_PIECES_STORAGE_KEY)).toBeNull();

    fireEvent.change(within(dialog).getByLabelText(/^name$/i), {
      target: { value: 'My Custom Barricade' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /^create$/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(getCustomLibraryRows()).toHaveLength(initialCustomPieceCount + 1);

    const duplicatedRow = getCustomLibraryRows().find((row) => within(row).queryByText('My Custom Barricade'));

    expect(duplicatedRow).toBeDefined();
    expect(within(duplicatedRow!).getByText('My Custom Barricade')).toBeInTheDocument();
    expect(window.localStorage.getItem(CUSTOM_PIECES_STORAGE_KEY)).toContain('My Custom Barricade');
  });

  it('allows canceling a duplicate draft without creating a custom piece', () => {
    render(<LayoutStudio />);
    const craterRow = screen.getByTestId('library-item-crater');
    const initialCustomPieceCount = getCustomLibraryRows().length;

    fireEvent.click(within(craterRow).getByRole('button', { name: /duplicate/i }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByDisplayValue('Crater (Copy)')).toBeInTheDocument();
    expect(getCustomLibraryRows()).toHaveLength(initialCustomPieceCount);

    fireEvent.click(within(dialog).getByRole('button', { name: /cancel/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(getCustomLibraryRows()).toHaveLength(initialCustomPieceCount);
    expect(window.localStorage.getItem(CUSTOM_PIECES_STORAGE_KEY)).toBeNull();
  });

  it('runs the LoS check on demand, draws clear sightlines, and clears them again', async () => {
    const openLayout = createDefaultLayout();
    openLayout.table = {
      ...openLayout.table,
      widthInches: 24,
      heightInches: 24,
      deploymentDepthInches: 6,
      title: 'Open Table',
    };
    openLayout.pieces = [];
    window.history.replaceState(window.history.state, '', `/#${encodeLayoutHash(openLayout)}`);

    render(<LayoutStudio />);

    fireEvent.click(screen.getByRole('button', { name: /check line of sight/i }));

    expect(screen.getByRole('button', { name: /checking line of sight/i })).toBeDisabled();
    expect(await screen.findByText(/found 625 clear sightlines/i)).toBeInTheDocument();

    const [interactiveCanvas] = screen.getAllByTestId('table-canvas-svg');
    expect(interactiveCanvas.querySelectorAll('[data-testid="los-clear-sightline"]')).toHaveLength(625);

    fireEvent.click(screen.getByRole('button', { name: /clear los check/i }));

    await waitFor(() => {
      expect(interactiveCanvas.querySelectorAll('[data-testid="los-clear-sightline"]')).toHaveLength(0);
    });
  });

  it('shows a success message when every long-edge sightline is blocked', async () => {
    const blockedLayout = createDefaultLayout();
    blockedLayout.table = {
      ...blockedLayout.table,
      widthInches: 24,
      heightInches: 24,
      deploymentDepthInches: 6,
      title: 'Blocked Table',
    };
    blockedLayout.pieces = [
      createTerrainPiece(terrainCatalog[0], { x: 12, y: 12 }, {
        name: 'Center Wall',
        shape: 'rect',
        width: 2,
        height: 24,
        rotation: 0,
      }),
    ];
    window.history.replaceState(window.history.state, '', `/#${encodeLayoutHash(blockedLayout)}`);

    render(<LayoutStudio />);

    fireEvent.click(screen.getByRole('button', { name: /check line of sight/i }));

    expect(await screen.findByText(/no edge-to-edge sightlines across 625 lines checked/i)).toBeInTheDocument();

    const [interactiveCanvas] = screen.getAllByTestId('table-canvas-svg');
    expect(interactiveCanvas.querySelectorAll('[data-testid="los-clear-sightline"]')).toHaveLength(0);
  });
});
