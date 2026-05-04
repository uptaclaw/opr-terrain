import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  cloneLayout,
  convertGeneratedTerrainPieceToLayoutPiece,
  createDefaultLayout,
  createTerrainPiece,
  getTerrainTemplate,
  terrainCatalog,
} from '../data/terrainCatalog';
import {
  createShareUrl,
  decodeLayoutHash,
  encodeLayoutHash,
  getInitialLayout,
  loadSavedLayouts,
  persistSavedLayouts,
  persistWorkingLayout,
} from '../lib/layout';
import {
  addCustomPiece,
  deleteCustomPiece,
  loadCustomPieces,
  loadPresetOverrides,
  persistCustomPieces,
  persistPresetOverrides,
  updateCustomPiece,
  type CustomPieceDefinition,
} from '../lib/customPieces';
import {
  findClearEdgeToEdgeSightlinesForLayout,
  type EdgeToEdgeSightlineResult,
} from '../lib/lineOfSight';
import type { LayoutState, SavedLayoutRecord, TerrainPiece, TerrainTemplate } from '../types/layout';
import { formatInches, formatTableMeasure, getSceneSize, TABLE_SCENE_MARGIN, TableCanvas } from './TableCanvas';
import { TERRAIN_LIBRARY_MIME_TYPE, TerrainPaletteTable } from './TerrainPaletteTable';
import type { PieceFormData } from './TerrainPieceModal';
import { AutoPlacementGenerator } from './AutoPlacementGenerator';
import { TerrainSummaryLegend } from './TerrainSummaryLegend';
import { OPRValidationDisplay } from './OPRValidationDisplay';
import { TableCoverageIndicator } from './TableCoverageIndicator';
import type { TerrainLayout } from '../terrain/types';
import { getPieceHalfExtents, normalizeRotation } from '../lib/pieceBounds';
import { getPrintLegendTraitText } from '../lib/printLegend';

type DragState = {
  pieceId: string;
  startSceneX: number;
  startSceneY: number;
  startPieceX: number;
  startPieceY: number;
};

type RotationSession = {
  pieceId: string;
  originalLayout: LayoutState;
  startAngle: number;
  originalRotation: number;
  latestRotation: number;
};

type LosCheckState =
  | { status: 'idle' }
  | { status: 'stale' }
  | { status: 'loading' }
  | { status: 'done'; result: EdgeToEdgeSightlineResult };

const formatUpdatedAt = (value: string) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const sortSavedLayouts = (layouts: SavedLayoutRecord[]) =>
  [...layouts].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

const createId = () => globalThis.crypto?.randomUUID?.() ?? `layout-${Math.random().toString(36).slice(2, 10)}`;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getClockwiseAngle = (deltaX: number, deltaY: number) => (-Math.atan2(deltaY, deltaX) * 180) / Math.PI;

const clampPieceToTable = (piece: TerrainPiece, layout: LayoutState) => {
  const width = clamp(piece.width, 2, 24);
  const height = clamp(piece.height, 2, 24);
  const rotation = normalizeRotation(piece.rotation);
  const { halfWidth, halfHeight } = getPieceHalfExtents({ ...piece, width, height, rotation });

  return {
    ...piece,
    width,
    height,
    x: clamp(piece.x, halfWidth, Math.max(halfWidth, layout.table.widthInches - halfWidth)),
    y: clamp(piece.y, halfHeight, Math.max(halfHeight, layout.table.heightInches - halfHeight)),
    rotation,
  };
};

const getSuggestedPosition = (pieceCount: number, layout: LayoutState) => {
  const columns = 3;
  const spacingX = layout.table.widthInches / (columns + 1);
  const spacingY = layout.table.heightInches / (columns + 1);
  const column = pieceCount % columns;
  const row = Math.floor(pieceCount / columns) % columns;

  return {
    x: Math.round(spacingX * (column + 1)),
    y: Math.round(spacingY * (row + 1)),
  };
};

const updateHash = (layout: LayoutState) => {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  url.hash = encodeLayoutHash(layout);
  window.history.replaceState(window.history.state, '', url);
};

const STORAGE_WARNING_MESSAGE =
  'Browser storage is unavailable. Draft and named layouts still work in this tab, but they will not persist after refresh.';

type TerrainLibraryDropPayload = {
  templateId: string;
};

type InitialStudioState = {
  layout: LayoutState;
  customPieces: CustomPieceDefinition[];
  presetOverrides: Map<string, TerrainTemplate>;
  shouldPersistHydratedCustomPieces: boolean;
};

const isTerrainLibraryDrag = (dataTransfer: DataTransfer | null) =>
  Boolean(dataTransfer && Array.from(dataTransfer.types ?? []).includes(TERRAIN_LIBRARY_MIME_TYPE));

const parseLibraryDropPayload = (dataTransfer: DataTransfer | null): TerrainLibraryDropPayload | null => {
  if (!dataTransfer) {
    return null;
  }

  const rawPayload = dataTransfer.getData(TERRAIN_LIBRARY_MIME_TYPE);

  if (!rawPayload) {
    return null;
  }

  try {
    return JSON.parse(rawPayload) as TerrainLibraryDropPayload;
  } catch {
    return null;
  }
};

const serializeTemplateForComparison = (template: TerrainTemplate) =>
  JSON.stringify({
    name: template.name,
    shape: template.shape,
    fill: template.fill,
    stroke: template.stroke,
    width: template.width,
    height: template.height,
    defaultRotation: template.defaultRotation ?? 0,
    traits: template.traits.map((trait) => ({
      id: trait.id,
      label: trait.label,
      category: trait.category,
      active: trait.active ?? true,
    })),
  });

const areTemplateContentsEqual = (left: TerrainTemplate, right: TerrainTemplate) =>
  serializeTemplateForComparison(left) === serializeTemplateForComparison(right);

const buildImportedTemplateId = (originalId: string, usedIds: Set<string>) => {
  let candidate = `url-${originalId}`;
  let suffix = 2;

  while (usedIds.has(candidate)) {
    candidate = `url-${originalId}-${suffix}`;
    suffix += 1;
  }

  return candidate;
};

const toTemplate = ({ isCustom: _isCustom, ...template }: CustomPieceDefinition): TerrainTemplate => template;

const createDuplicateDraft = (template: TerrainTemplate): TerrainTemplate => ({
  ...template,
  name: `${template.name} (Copy)`,
  traits: template.traits.map((trait) => ({ ...trait })),
});

const hydrateCustomTemplatesFromLayout = (
  layout: LayoutState,
  existingCustomPieces: CustomPieceDefinition[],
): { layout: LayoutState; customPieces: CustomPieceDefinition[]; didChange: boolean } => {
  if (!layout.customTemplates?.length) {
    return {
      layout,
      customPieces: existingCustomPieces,
      didChange: false,
    };
  }

  const mergedCustomPieces = [...existingCustomPieces];
  const usedIds = new Set(mergedCustomPieces.map((piece) => piece.id));
  const templateIdRemap = new Map<string, string>();

  const hydratedTemplates = layout.customTemplates.map((template) => {
    const existingPiece = mergedCustomPieces.find((piece) => piece.id === template.id);

    if (!existingPiece) {
      const importedPiece: CustomPieceDefinition = {
        ...template,
        isCustom: true,
      };
      mergedCustomPieces.push(importedPiece);
      usedIds.add(importedPiece.id);
      return importedPiece;
    }

    if (areTemplateContentsEqual(existingPiece, template)) {
      return existingPiece;
    }

    const existingImportedPiece = mergedCustomPieces.find(
      (piece) => piece.id.startsWith(`url-${template.id}`) && areTemplateContentsEqual(piece, template),
    );

    if (existingImportedPiece) {
      templateIdRemap.set(template.id, existingImportedPiece.id);
      return existingImportedPiece;
    }

    const importedId = buildImportedTemplateId(template.id, usedIds);
    const importedPiece: CustomPieceDefinition = {
      ...template,
      id: importedId,
      name: `${template.name} (from URL)`,
      isCustom: true,
    };

    mergedCustomPieces.push(importedPiece);
    usedIds.add(importedId);
    templateIdRemap.set(template.id, importedId);
    return importedPiece;
  });

  const nextLayout: LayoutState = {
    ...layout,
    pieces:
      templateIdRemap.size > 0
        ? layout.pieces.map((piece) => {
            const remappedTemplateId = templateIdRemap.get(piece.templateId);

            if (!remappedTemplateId) {
              return piece;
            }

            return {
              ...piece,
              templateId: remappedTemplateId,
            };
          })
        : layout.pieces,
    customTemplates: hydratedTemplates.map(toTemplate),
  };

  return {
    layout: nextLayout,
    customPieces: mergedCustomPieces,
    didChange: mergedCustomPieces.length !== existingCustomPieces.length || templateIdRemap.size > 0,
  };
};

const buildLayoutWithCustomTemplates = (layout: LayoutState, customPieces: CustomPieceDefinition[]): LayoutState => {
  const customTemplatesInUse = customPieces.filter((customPiece) =>
    layout.pieces.some((piece) => piece.templateId === customPiece.id),
  );

  if (customTemplatesInUse.length === 0) {
    const { customTemplates: _unusedCustomTemplates, ...layoutWithoutCustomTemplates } = layout;
    return layoutWithoutCustomTemplates;
  }

  return {
    ...layout,
    customTemplates: customTemplatesInUse.map(toTemplate),
  };
};

const createInitialStudioState = (): InitialStudioState => {
  const initialLayout = getInitialLayout();
  const storedCustomPieces = loadCustomPieces();
  const hydratedState = hydrateCustomTemplatesFromLayout(initialLayout, storedCustomPieces);

  return {
    layout: hydratedState.layout,
    customPieces: hydratedState.customPieces,
    presetOverrides: loadPresetOverrides(),
    shouldPersistHydratedCustomPieces: hydratedState.didChange,
  };
};

const serializeLayoutForLosCache = (layout: LayoutState) =>
  JSON.stringify({
    widthInches: layout.table.widthInches,
    heightInches: layout.table.heightInches,
    pieces: [...layout.pieces]
      .map((piece) => ({
        id: piece.id,
        shape: piece.shape,
        width: piece.width,
        height: piece.height,
        x: piece.x,
        y: piece.y,
        rotation: piece.rotation,
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  });

export function LayoutStudio() {
  const [initialStudioState] = useState(createInitialStudioState);
  const [layout, setLayout] = useState<LayoutState>(initialStudioState.layout);
  const [savedLayouts, setSavedLayouts] = useState<SavedLayoutRecord[]>(() => loadSavedLayouts());
  const [customPieces, setCustomPieces] = useState<CustomPieceDefinition[]>(initialStudioState.customPieces);
  const [presetOverrides, setPresetOverrides] = useState<Map<string, TerrainTemplate>>(
    () => new Map(initialStudioState.presetOverrides),
  );
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [rotatingPieceId, setRotatingPieceId] = useState<string | null>(null);
  const [activeSavedLayoutId, setActiveSavedLayoutId] = useState<string | null>(null);
  const [layoutNameInput, setLayoutNameInput] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [saveModalInput, setSaveModalInput] = useState('');
  const [statusMessage, setStatusMessage] = useState(
    'Draft changes auto-save locally and update the share URL in the address bar.',
  );
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [libraryDragActive, setLibraryDragActive] = useState(false);
  const [losCheckState, setLosCheckState] = useState<LosCheckState>({ status: 'idle' });
  const svgRef = useRef<SVGSVGElement | null>(null);
  const cleanSvgRef = useRef<SVGSVGElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const rotationSessionRef = useRef<RotationSession | null>(null);
  const layoutRef = useRef(layout);
  const customPiecesRef = useRef(customPieces);
  const losCheckCacheRef = useRef<{ key: string; result: EdgeToEdgeSightlineResult } | null>(null);
  const losCheckRunIdRef = useRef(0);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    customPiecesRef.current = customPieces;
  }, [customPieces]);

  useEffect(() => {
    if (!initialStudioState.shouldPersistHydratedCustomPieces) {
      return;
    }

    if (!persistCustomPieces(initialStudioState.customPieces)) {
      setStorageWarning(STORAGE_WARNING_MESSAGE);
    }
  }, [initialStudioState]);

  useEffect(() => {
    setSelectedPieceId((current) => {
      if (current && layout.pieces.some((piece) => piece.id === current)) {
        return current;
      }

      return null;
    });
  }, [layout.pieces]);

  useEffect(() => {
    const layoutWithCustomTemplates = buildLayoutWithCustomTemplates(layout, customPieces);

    setStorageWarning(persistWorkingLayout(layoutWithCustomTemplates) ? null : STORAGE_WARNING_MESSAGE);
    updateHash(layoutWithCustomTemplates);
  }, [layout, customPieces]);

  useEffect(() => {
    const handleHashChange = () => {
      const fromHash = decodeLayoutHash(window.location.hash);

      if (!fromHash) {
        return;
      }

      const hydratedState = hydrateCustomTemplatesFromLayout(fromHash, customPiecesRef.current);

      setLayout(hydratedState.layout);
      setCustomPieces(hydratedState.customPieces);
      setActiveSavedLayoutId(null);
      setLayoutNameInput('');
      setStatusMessage('Loaded a shared layout from the URL.');

      if (hydratedState.didChange && !persistCustomPieces(hydratedState.customPieces)) {
        setStorageWarning(STORAGE_WARNING_MESSAGE);
      }
    };

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  useEffect(() => {
    const clearLibraryDrag = () => {
      setLibraryDragActive(false);
    };

    window.addEventListener('dragend', clearLibraryDrag);
    window.addEventListener('drop', clearLibraryDrag);

    return () => {
      window.removeEventListener('dragend', clearLibraryDrag);
      window.removeEventListener('drop', clearLibraryDrag);
    };
  }, []);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      const svgElement = svgRef.current;

      if (!dragState || !svgElement) {
        return;
      }

      const rect = svgElement.getBoundingClientRect();

      if (!rect.width || !rect.height) {
        return;
      }

      const { sceneWidth, sceneHeight } = getSceneSize(
        layoutRef.current.table.widthInches,
        layoutRef.current.table.heightInches,
      );

      const sceneX = ((event.clientX - rect.left) / rect.width) * sceneWidth;
      const sceneY = ((event.clientY - rect.top) / rect.height) * sceneHeight;
      const deltaX = sceneX - dragState.startSceneX;
      const deltaY = sceneY - dragState.startSceneY;

      setLayout((current) => ({
        ...current,
        pieces: current.pieces.map((piece) => {
          if (piece.id !== dragState.pieceId) {
            return piece;
          }

          return clampPieceToTable(
            {
              ...piece,
              x: dragState.startPieceX + deltaX,
              y: dragState.startPieceY - deltaY,
            },
            current,
          );
        }),
      }));
    };

    const handlePointerUp = () => {
      if (dragStateRef.current) {
        dragStateRef.current = null;
        setStatusMessage('Terrain position updated. Save it locally or share the current URL.');
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  useEffect(() => {
    if (!rotatingPieceId) {
      return undefined;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const rotationSession = rotationSessionRef.current;

      if (!rotationSession) {
        return;
      }

      const preview = getRotationPreview(rotationSession, event.clientX, event.clientY);

      if (!preview) {
        return;
      }

      rotationSession.latestRotation = preview.rotation;
      setLayout({
        ...rotationSession.originalLayout,
        pieces: rotationSession.originalLayout.pieces.map((piece) =>
          piece.id === rotationSession.pieceId
            ? clampPieceToTable(
                {
                  ...preview.activePiece,
                  rotation: preview.rotation,
                },
                rotationSession.originalLayout,
              )
            : piece,
        ),
      });
    };

    const finishRotation = (event: MouseEvent) => {
      const rotationSession = rotationSessionRef.current;

      if (!rotationSession) {
        return;
      }

      const preview = getRotationPreview(rotationSession, event.clientX, event.clientY);
      const finalRotation = preview?.rotation ?? rotationSession.latestRotation;

      rotationSessionRef.current = null;
      setRotatingPieceId(null);

      if (finalRotation === rotationSession.originalRotation) {
        setLayout(rotationSession.originalLayout);
        return;
      }

      setLayout({
        ...rotationSession.originalLayout,
        pieces: rotationSession.originalLayout.pieces.map((piece) =>
          piece.id === rotationSession.pieceId
            ? clampPieceToTable(
                {
                  ...(preview?.activePiece ?? piece),
                  rotation: finalRotation,
                },
                rotationSession.originalLayout,
              )
            : piece,
        ),
      });
      setStatusMessage('Terrain rotation updated. Save it locally or share the current URL.');
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', finishRotation);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', finishRotation);
    };
  }, [rotatingPieceId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      const rotationSession = rotationSessionRef.current;

      if (rotationSession) {
        setLayout(rotationSession.originalLayout);
        rotationSessionRef.current = null;
        setRotatingPieceId(null);
      }

      if (selectedPieceId) {
        setSelectedPieceId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedPieceId]);

  const selectedPiece = useMemo(
    () => layout.pieces.find((piece) => piece.id === selectedPieceId) ?? null,
    [layout.pieces, selectedPieceId],
  );

  const losCheckCacheKey = useMemo(() => serializeLayoutForLosCache(layout), [layout]);

  useEffect(() => {
    losCheckRunIdRef.current += 1;

    if (losCheckCacheRef.current && losCheckCacheRef.current.key !== losCheckCacheKey) {
      losCheckCacheRef.current = null;
    }

    setLosCheckState((current) => {
      if (current.status === 'done' || current.status === 'loading') {
        return { status: 'stale' };
      }

      return current;
    });
  }, [losCheckCacheKey]);

  const resolvedPresets = useMemo(
    () =>
      terrainCatalog.map((preset) => {
        const override = presetOverrides.get(preset.id);
        return override ? { ...preset, ...override } : preset;
      }),
    [presetOverrides],
  );

  const getTemplateById = (templateId: string) =>
    customPieces.find((piece) => piece.id === templateId) ?? resolvedPresets.find((piece) => piece.id === templateId);

  const getTableCoordinates = (clientX: number, clientY: number) => {
    const svgElement = svgRef.current;

    if (!svgElement) {
      return null;
    }

    const rect = svgElement.getBoundingClientRect();

    if (!rect.width || !rect.height) {
      return null;
    }

    const { sceneWidth, sceneHeight } = getSceneSize(
      layoutRef.current.table.widthInches,
      layoutRef.current.table.heightInches,
    );
    const sceneX = ((clientX - rect.left) / rect.width) * sceneWidth;
    const sceneY = ((clientY - rect.top) / rect.height) * sceneHeight;

    return {
      x: sceneX - TABLE_SCENE_MARGIN.left,
      y: layoutRef.current.table.heightInches - (sceneY - TABLE_SCENE_MARGIN.top),
    };
  };

  const getRotationPreview = (rotationSession: RotationSession, clientX: number, clientY: number) => {
    const activePiece = rotationSession.originalLayout.pieces.find((piece) => piece.id === rotationSession.pieceId);
    const pointer = getTableCoordinates(clientX, clientY);

    if (!activePiece || !pointer) {
      return null;
    }

    const deltaX = pointer.x - activePiece.x;
    const deltaY = pointer.y - activePiece.y;
    const currentAngle = getClockwiseAngle(deltaX, deltaY);
    const angleDelta = currentAngle - rotationSession.startAngle;

    return {
      activePiece,
      rotation: normalizeRotation(rotationSession.originalRotation + angleDelta),
    };
  };

  const shareUrl = useMemo(
    () => createShareUrl(buildLayoutWithCustomTemplates(layout, customPieces)),
    [layout, customPieces],
  );

  const printLegendEntries = useMemo(
    () =>
      [...layout.pieces]
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((piece) => ({
          piece,
          traitsText: getPrintLegendTraitText(piece),
        })),
    [layout.pieces],
  );

  const commitSavedLayouts = (nextLayouts: SavedLayoutRecord[]) => {
    const sortedLayouts = sortSavedLayouts(nextLayouts);
    const persisted = persistSavedLayouts(sortedLayouts);
    setStorageWarning(persisted ? null : STORAGE_WARNING_MESSAGE);
    setSavedLayouts(sortedLayouts);
    return persisted;
  };

  const updatePiece = (pieceId: string, updater: (piece: TerrainPiece) => TerrainPiece) => {
    setLayout((current) => ({
      ...current,
      pieces: current.pieces.map((piece) =>
        piece.id === pieceId ? clampPieceToTable(updater(piece), current) : piece,
      ),
    }));
  };

  const handleAddPiece = (templateId: string, position?: { x: number; y: number }) => {
    const template = getTemplateById(templateId);

    if (!template) {
      return;
    }

    let nextPieceId: string | null = null;

    setLayout((current) => {
      const nextPosition = position ?? getSuggestedPosition(current.pieces.length, current);
      const newPiece = clampPieceToTable(createTerrainPiece(template, nextPosition), current);
      nextPieceId = newPiece.id;
      return {
        ...current,
        pieces: [...current.pieces, newPiece],
      };
    });

    if (nextPieceId) {
      setSelectedPieceId(nextPieceId);
    }

    setStatusMessage(`Added ${template.name.toLowerCase()} terrain.`);
  };

  const handleCanvasDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
    if (!isTerrainLibraryDrag(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setLibraryDragActive(true);
  };

  const handleCanvasDrop = (event: ReactDragEvent<HTMLDivElement>) => {
    if (isTerrainLibraryDrag(event.dataTransfer)) {
      event.preventDefault();
    }

    setLibraryDragActive(false);

    const payload = parseLibraryDropPayload(event.dataTransfer);

    if (!payload) {
      return;
    }

    const dropPosition = getTableCoordinates(event.clientX, event.clientY);

    if (!dropPosition) {
      return;
    }

    handleAddPiece(payload.templateId, dropPosition);
  };

  const handleDuplicateSelectedPiece = () => {
    if (!selectedPiece) {
      return;
    }

    let duplicateId: string | null = null;

    setLayout((current) => {
      const original = current.pieces.find((piece) => piece.id === selectedPiece.id);

      if (!original) {
        return current;
      }

      const duplicate = clampPieceToTable(
        {
          ...JSON.parse(JSON.stringify(original)),
          id: createId(),
          name: `${original.name} Copy`,
          x: original.x + 3,
          y: original.y - 3,
        },
        current,
      );

      duplicateId = duplicate.id;

      return {
        ...current,
        pieces: [...current.pieces, duplicate],
      };
    });

    if (duplicateId) {
      setSelectedPieceId(duplicateId);
    }

    setStatusMessage('Duplicated selected terrain piece.');
  };

  const handleDeleteSelectedPiece = () => {
    if (!selectedPiece) {
      return;
    }

    const confirmed = window.confirm(`Delete "${selectedPiece.name}" from the layout?`);

    if (!confirmed) {
      return;
    }

    setLayout((current) => ({
      ...current,
      pieces: current.pieces.filter((piece) => piece.id !== selectedPiece.id),
    }));
    setStatusMessage(`Removed ${selectedPiece.name.toLowerCase()} from the layout.`);
  };

  const handleAddCustomPiece = (data: PieceFormData) => {
    const newCustomPiece = addCustomPiece(data);
    setCustomPieces((prev) => [...prev, newCustomPiece]);
    setStatusMessage(`Created custom terrain piece: ${data.name}`);
  };

  const handleEditPiece = (id: string, data: PieceFormData) => {
    const customPiece = customPieces.find((piece) => piece.id === id);

    if (customPiece) {
      updateCustomPiece(id, data);
      setCustomPieces((prev) => prev.map((piece) => (piece.id === id ? { ...piece, ...data, isCustom: true } : piece)));
      setStatusMessage(`Updated custom piece: ${data.name}`);
      return;
    }

    const presetTemplate = resolvedPresets.find((piece) => piece.id === id) ?? getTerrainTemplate(id);

    if (!presetTemplate) {
      return;
    }

    const nextPresetOverrides = new Map(presetOverrides);
    nextPresetOverrides.set(id, {
      ...presetTemplate,
      ...data,
      id,
      defaultRotation: data.defaultRotation ?? presetTemplate.defaultRotation,
      traits: data.traits,
    });

    const persisted = persistPresetOverrides(nextPresetOverrides.values());
    setPresetOverrides(nextPresetOverrides);

    if (!persisted) {
      setStorageWarning(STORAGE_WARNING_MESSAGE);
    }

    setStatusMessage(
      persisted
        ? `Updated preset: ${data.name}`
        : `Updated preset: ${data.name} for this tab, but browser storage is unavailable so it will not persist after refresh.`,
    );
  };

  const handleDeleteCustomPiece = (id: string) => {
    if (deleteCustomPiece(id)) {
      setCustomPieces((prev) => prev.filter((p) => p.id !== id));
      setStatusMessage('Deleted custom terrain piece.');
    }
  };

  const handleDuplicatePiece = (id: string): TerrainTemplate | null => {
    const sourcePiece =
      customPieces.find((piece) => piece.id === id) ?? resolvedPresets.find((piece) => piece.id === id);

    if (!sourcePiece) {
      return null;
    }

    return createDuplicateDraft(sourcePiece);
  };

  const handleResetLayout = () => {
    const confirmed = window.confirm('Reset the table to the default sample layout?');

    if (!confirmed) {
      return;
    }

    const nextLayout = createDefaultLayout();
    setLayout(nextLayout);
    setActiveSavedLayoutId(null);
    setLayoutNameInput('');
    setStatusMessage('Reset the working layout to the default terrain setup.');
  };

  const handleLayoutGenerated = (terrainLayout: TerrainLayout) => {
    const convertedPieces: TerrainPiece[] = terrainLayout.pieces.map(convertGeneratedTerrainPieceToLayoutPiece);

    setLayout((current) => ({
      ...current,
      pieces: convertedPieces,
      placementConfig: terrainLayout.placementConfig,
      oprValidation: terrainLayout.oprValidation,
    }));

    setActiveSavedLayoutId(null);
    setLayoutNameInput('');
    setStatusMessage(
      `Generated ${convertedPieces.length} terrain pieces using ${terrainLayout.placementConfig?.strategy || 'random'} strategy.`,
    );
  };

  const handleRunLosCheck = async () => {
    if (losCheckCacheRef.current?.key === losCheckCacheKey) {
      setLosCheckState({
        status: 'done',
        result: losCheckCacheRef.current.result,
      });
      return;
    }

    const runId = losCheckRunIdRef.current + 1;
    losCheckRunIdRef.current = runId;
    setLosCheckState({ status: 'loading' });

    await new Promise((resolve) => window.setTimeout(resolve, 0));

    if (losCheckRunIdRef.current !== runId) {
      return;
    }

    const result = findClearEdgeToEdgeSightlinesForLayout(
      layoutRef.current.pieces,
      layoutRef.current.table.widthInches,
      layoutRef.current.table.heightInches,
    );
    const cacheKey = serializeLayoutForLosCache(layoutRef.current);

    if (losCheckRunIdRef.current !== runId) {
      return;
    }

    losCheckCacheRef.current = {
      key: cacheKey,
      result,
    };
    setLosCheckState({ status: 'done', result });
  };

  const handleClearLosCheck = () => {
    losCheckRunIdRef.current += 1;
    setLosCheckState({ status: 'idle' });
  };

  const handleRotateHandleMouseDown = (pieceId: string, event: ReactMouseEvent<SVGGElement>) => {
    if (event.button !== 0) {
      return;
    }

    const piece = layoutRef.current.pieces.find((candidate) => candidate.id === pieceId);
    const pointer = getTableCoordinates(event.clientX, event.clientY);

    if (!piece || !pointer) {
      return;
    }

    const deltaX = pointer.x - piece.x;
    const deltaY = pointer.y - piece.y;
    const startAngle = getClockwiseAngle(deltaX, deltaY);

    rotationSessionRef.current = {
      pieceId,
      originalLayout: cloneLayout(layoutRef.current),
      startAngle,
      originalRotation: piece.rotation,
      latestRotation: piece.rotation,
    };
    setSelectedPieceId(pieceId);
    setRotatingPieceId(pieceId);
  };

  const handleCanvasMouseDown = (event: ReactMouseEvent<SVGSVGElement>) => {
    const target = event.target;

    if (target instanceof Element) {
      if (target.closest('[data-testid="layout-terrain-piece"]') || target.closest('[data-testid="rotation-handle"]')) {
        return;
      }
    }

    setSelectedPieceId(null);
  };

  const handlePiecePointerDown = (
    pieceId: string,
    event: ReactPointerEvent<SVGGElement>,
  ) => {
    event.preventDefault();
    const svgElement = svgRef.current;

    if (!svgElement) {
      return;
    }

    const rect = svgElement.getBoundingClientRect();

    if (!rect.width || !rect.height) {
      return;
    }

    const { sceneWidth, sceneHeight } = getSceneSize(layout.table.widthInches, layout.table.heightInches);
    const sceneX = ((event.clientX - rect.left) / rect.width) * sceneWidth;
    const sceneY = ((event.clientY - rect.top) / rect.height) * sceneHeight;
    const piece = layout.pieces.find((candidate) => candidate.id === pieceId);

    if (!piece) {
      return;
    }

    dragStateRef.current = {
      pieceId,
      startSceneX: sceneX,
      startSceneY: sceneY,
      startPieceX: piece.x,
      startPieceY: piece.y,
    };
    setSelectedPieceId(pieceId);
    setStatusMessage(
      piece.shape === 'ellipse'
        ? `Selected ${piece.name}. Drag it directly on the table to reposition it.`
        : `Selected ${piece.name}. Drag it directly on the table or use the on-canvas handle to rotate it.`,
    );
  };

  const handleSaveLayout = () => {
    const name = layoutNameInput.trim();

    if (!name) {
      setStatusMessage('Enter a layout name before saving.');
      return;
    }

    const now = new Date().toISOString();
    const existing = activeSavedLayoutId
      ? savedLayouts.find((savedLayout) => savedLayout.id === activeSavedLayoutId)
      : savedLayouts.find((savedLayout) => savedLayout.name.toLowerCase() === name.toLowerCase());

    if (existing) {
      const updatedLayouts = savedLayouts.map((savedLayout) =>
        savedLayout.id === existing.id
          ? {
              ...savedLayout,
              name,
              updatedAt: now,
              layout: cloneLayout(layout),
            }
          : savedLayout,
      );
      const persisted = commitSavedLayouts(updatedLayouts);
      setActiveSavedLayoutId(existing.id);
      setStatusMessage(
        persisted
          ? `Updated saved layout "${name}".`
          : `Updated saved layout "${name}" for this tab, but browser storage is unavailable so it will not persist after refresh.`,
      );
      return;
    }

    const newLayout: SavedLayoutRecord = {
      id: createId(),
      name,
      createdAt: now,
      updatedAt: now,
      layout: cloneLayout(layout),
    };

    const persisted = commitSavedLayouts([newLayout, ...savedLayouts]);
    setActiveSavedLayoutId(newLayout.id);
    setStatusMessage(
      persisted
        ? `Saved layout "${name}" to local storage.`
        : `Saved layout "${name}" for this tab, but browser storage is unavailable so it will not persist after refresh.`,
    );
  };

  const handleSaveLayoutFromModal = () => {
    const name = saveModalInput.trim();

    if (!name) {
      setStatusMessage('Enter a layout name before saving.');
      return;
    }

    const now = new Date().toISOString();
    const existing = savedLayouts.find((savedLayout) => savedLayout.name.toLowerCase() === name.toLowerCase());

    if (existing) {
      const confirmed = window.confirm(`A layout named "${name}" already exists. Overwrite it?`);
      if (!confirmed) {
        return;
      }

      const updatedLayouts = savedLayouts.map((savedLayout) =>
        savedLayout.id === existing.id
          ? {
              ...savedLayout,
              name,
              updatedAt: now,
              layout: cloneLayout(layout),
            }
          : savedLayout,
      );
      const persisted = commitSavedLayouts(updatedLayouts);
      setActiveSavedLayoutId(existing.id);
      setLayoutNameInput(name);
      setStatusMessage(
        persisted
          ? `Updated saved layout "${name}".`
          : `Updated saved layout "${name}" for this tab, but browser storage is unavailable so it will not persist after refresh.`,
      );
      setShowSaveModal(false);
      setSaveModalInput('');
      return;
    }

    const newLayout: SavedLayoutRecord = {
      id: createId(),
      name,
      createdAt: now,
      updatedAt: now,
      layout: cloneLayout(layout),
    };

    const persisted = commitSavedLayouts([newLayout, ...savedLayouts]);
    setActiveSavedLayoutId(newLayout.id);
    setLayoutNameInput(name);
    setStatusMessage(
      persisted
        ? `Saved layout "${name}" to local storage.`
        : `Saved layout "${name}" for this tab, but browser storage is unavailable so it will not persist after refresh.`,
    );
    setShowSaveModal(false);
    setSaveModalInput('');
  };

  const handleOpenSaveModal = () => {
    setSaveModalInput(layoutNameInput || '');
    setShowSaveModal(true);
  };

  const handleOpenLoadModal = () => {
    setShowLoadModal(true);
  };

  const handleLoadSavedLayout = (savedLayout: SavedLayoutRecord) => {
    setLayout(cloneLayout(savedLayout.layout));
    setActiveSavedLayoutId(savedLayout.id);
    setLayoutNameInput(savedLayout.name);
    setStatusMessage(`Loaded saved layout "${savedLayout.name}".`);
    setShowLoadModal(false);
  };

  const handleRenameSavedLayout = (savedLayout: SavedLayoutRecord) => {
    const nextName = window.prompt('Rename saved layout', savedLayout.name)?.trim();

    if (!nextName || nextName === savedLayout.name) {
      return;
    }

    const now = new Date().toISOString();
    const persisted = commitSavedLayouts(
      savedLayouts.map((layoutRecord) =>
        layoutRecord.id === savedLayout.id
          ? {
              ...layoutRecord,
              name: nextName,
              updatedAt: now,
            }
          : layoutRecord,
      ),
    );

    if (activeSavedLayoutId === savedLayout.id) {
      setLayoutNameInput(nextName);
    }

    setStatusMessage(
      persisted
        ? `Renamed saved layout to "${nextName}".`
        : `Renamed saved layout to "${nextName}" for this tab, but browser storage is unavailable so it will not persist after refresh.`,
    );
  };

  const handleDeleteSavedLayout = (savedLayout: SavedLayoutRecord) => {
    const confirmed = window.confirm(`Delete saved layout "${savedLayout.name}"?`);

    if (!confirmed) {
      return;
    }

    const persisted = commitSavedLayouts(savedLayouts.filter((layoutRecord) => layoutRecord.id !== savedLayout.id));

    if (activeSavedLayoutId === savedLayout.id) {
      setActiveSavedLayoutId(null);
      setLayoutNameInput('');
    }

    setStatusMessage(
      persisted
        ? `Deleted saved layout "${savedLayout.name}".`
        : `Deleted saved layout "${savedLayout.name}" for this tab, but browser storage is unavailable so the change will not persist after refresh.`,
    );
  };

  const handleCopyShareUrl = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setStatusMessage('Shareable URL copied to the clipboard.');
        return;
      }
    } catch {
      // Fall through to prompt fallback.
    }

    window.prompt('Copy this shareable URL', shareUrl);
    setStatusMessage('Shareable URL ready to copy.');
  };

  const handleExportPng = async () => {
    const svgElement = cleanSvgRef.current;

    if (!svgElement) {
      setStatusMessage('Export failed: no clean SVG preview is available yet.');
      return;
    }

    try {
      setIsExporting(true);
      const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
      const { sceneWidth, sceneHeight } = getSceneSize(layout.table.widthInches, layout.table.heightInches);
      const exportWidth = 1800;
      const exportHeight = Math.round((exportWidth / sceneWidth) * sceneHeight);
      clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clonedSvg.setAttribute('width', String(exportWidth));
      clonedSvg.setAttribute('height', String(exportHeight));
      clonedSvg.setAttribute('viewBox', `0 0 ${sceneWidth} ${sceneHeight}`);

      const serializer = new XMLSerializer();
      const svgMarkup = serializer.serializeToString(clonedSvg);
      const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const image = new Image();

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('Image load failed'));
        image.src = svgUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = exportWidth;
      canvas.height = exportHeight;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Canvas context unavailable');
      }

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, exportWidth, exportHeight);
      context.drawImage(image, 0, 0, exportWidth, exportHeight);

      const link = document.createElement('a');
      const safeTitle = layout.table.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      link.href = canvas.toDataURL('image/png');
      link.download = `${safeTitle || 'opr-terrain-layout'}.png`;
      link.click();

      URL.revokeObjectURL(svgUrl);
      setStatusMessage('PNG export downloaded.');
    } catch {
      setStatusMessage('PNG export failed. Try again after the preview finishes rendering.');
    } finally {
      setIsExporting(false);
    }
  };

  const losCheckResult = losCheckState.status === 'done' ? losCheckState.result : null;
  const activeLosSightlines = losCheckResult?.clearSightlines ?? [];

  const screenLegend = `
    ${formatTableMeasure(layout.table.widthInches)} × ${formatTableMeasure(layout.table.heightInches)}
  `
    .replace(/\s+/g, ' ')
    .trim();

  return (
    <div className="mx-auto flex min-h-screen max-w-screen-2xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="screen-only flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-cyan-950/20">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-300/80">OPR Terrain</p>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">Layout persistence, export &amp; sharing</h1>
            <p className="max-w-3xl text-sm text-slate-300 sm:text-base">
              Drag terrain around the table, save named layouts to local storage, copy a shareable
              URL, export a clean PNG, and print a legend-ready reference sheet.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/5 px-1 py-1">
              <button
                type="button"
                onClick={handleOpenSaveModal}
                className="rounded-full bg-cyan-400 px-4 py-1.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Save Layout
              </button>
              <button
                type="button"
                onClick={handleOpenLoadModal}
                className="rounded-full border border-cyan-400/40 px-4 py-1.5 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300 hover:text-white"
              >
                Load Layout
              </button>
            </div>
            <button
              type="button"
              onClick={handleExportPng}
              disabled={isExporting}
              className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isExporting ? 'Exporting…' : 'Export PNG'}
            </button>
            <button
              type="button"
              onClick={handleCopyShareUrl}
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/30 hover:bg-white/5"
            >
              Copy share URL
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/30 hover:bg-white/5"
            >
              Print layout
            </button>
            <button
              type="button"
              onClick={handleResetLayout}
              className="rounded-full border border-rose-400/25 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:border-rose-300/40 hover:bg-rose-500/10"
            >
              Reset sample
            </button>
          </div>
        </div>

        <label className="flex flex-col gap-2 text-sm text-slate-200">
          Layout title
          <input
            type="text"
            value={layout.table.title}
            onChange={(event) =>
              setLayout((current) => ({
                ...current,
                table: {
                  ...current.table,
                  title: event.target.value,
                },
              }))
            }
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-base text-white outline-none ring-0 transition placeholder:text-slate-500 focus:border-cyan-400/50"
            placeholder="Name this battlefield"
          />
        </label>

        <p className="text-sm text-emerald-300/90">{statusMessage}</p>
        {storageWarning ? (
          <p role="alert" className="text-sm text-amber-200/90">
            {storageWarning}
          </p>
        ) : null}
      </header>



      <section className="screen-only grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <section
            data-testid="interactive-map-panel"
            className="rounded-3xl border border-white/10 bg-slate-900/65 p-4 shadow-xl shadow-slate-950/20 sm:p-6 xl:flex xl:min-h-[36rem] xl:flex-col"
          >
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Map</h2>
                <p className="mt-1 text-sm text-slate-300">
                  Drag terrain from the library, click a piece to select it, reposition it, and
                  rotate non-round terrain with the on-canvas handle.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-right text-sm text-slate-200">
                <p className="font-semibold text-white">{screenLegend}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {layout.pieces.length} pieces · deployment depth {formatInches(layout.table.deploymentDepthInches)}
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 p-3 shadow-inner shadow-slate-950/30 sm:p-4 xl:flex-1">
              <TableCanvas
                widthInches={layout.table.widthInches}
                heightInches={layout.table.heightInches}
                deploymentDepthInches={layout.table.deploymentDepthInches}
                title={layout.table.title}
                pieces={layout.pieces}
                selectedPieceId={selectedPieceId}
                svgRef={svgRef}
                libraryDragActive={libraryDragActive}
                clearSightlines={activeLosSightlines}
                onCanvasMouseDown={handleCanvasMouseDown}
                onCanvasDragOver={handleCanvasDragOver}
                onCanvasDrop={handleCanvasDrop}
                onPiecePointerDown={handlePiecePointerDown}
                onPieceSelect={setSelectedPieceId}
                onRotateHandleMouseDown={handleRotateHandleMouseDown}
              />
            </div>

            <div className="mt-6 rounded-3xl border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
              Click a terrain piece to highlight it. Drag selected terrain to reposition it, and use
              the on-canvas rotation handle for non-round pieces.
            </div>
          </section>

          <TerrainPaletteTable
            presets={resolvedPresets}
            customPieces={customPieces}
            onAddCustom={handleAddCustomPiece}
            onEditPiece={handleEditPiece}
            onDeleteCustom={handleDeleteCustomPiece}
            onDuplicatePiece={handleDuplicatePiece}
            onAddPieceToLayout={handleAddPiece}
          />
        </div>

        <aside data-testid="studio-sidebar" className="flex flex-col gap-6 xl:w-[22rem] xl:max-w-[22rem]">
          <div className="flex flex-col gap-4">
            <AutoPlacementGenerator
              widthInches={layout.table.widthInches}
              heightInches={layout.table.heightInches}
              deploymentDepthInches={layout.table.deploymentDepthInches}
              onLayoutGenerated={handleLayoutGenerated}
              initialConfig={layout.placementConfig}
            />

            <OPRValidationDisplay validation={layout.oprValidation} />

            <TableCoverageIndicator
              pieces={layout.pieces}
              tableWidthInches={layout.table.widthInches}
              tableHeightInches={layout.table.heightInches}
            />
          </div>

          <section
            data-testid="los-check-panel"
            className="rounded-3xl border border-white/10 bg-slate-900/65 p-5 shadow-xl shadow-slate-950/20"
          >
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Edge-to-edge LoS check</h2>
                <p className="mt-1 text-sm text-slate-300">
                  Check every integer point along the opposite long edges. Any terrain piece counts
                  as blocking terrain.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleRunLosCheck}
                  disabled={losCheckState.status === 'loading'}
                  className="rounded-2xl bg-rose-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {losCheckState.status === 'loading' ? 'Checking line of sight…' : 'Check Line of Sight'}
                </button>
                <button
                  type="button"
                  onClick={handleClearLosCheck}
                  disabled={losCheckState.status !== 'done'}
                  className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear LoS Check
                </button>
              </div>

              {losCheckState.status === 'loading' ? (
                <div
                  role="status"
                  className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100"
                >
                  Checking every long-edge path… this can take a moment on dense boards.
                </div>
              ) : losCheckResult ? (
                losCheckResult.allSightlinesBlocked ? (
                  <div
                    role="status"
                    className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
                  >
                    ✓ No edge-to-edge sightlines across {losCheckResult.totalSightlines.toLocaleString()} lines checked.
                  </div>
                ) : (
                  <div
                    role="status"
                    className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
                  >
                    ✗ Found {losCheckResult.clearSightlineCount.toLocaleString()} clear sightlines. Red lines show every unblocked path.
                  </div>
                )
              ) : losCheckState.status === 'stale' ? (
                <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  Terrain changed since the last LoS check. Run it again to refresh the overlay.
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-300">
                  Runs on demand so the board stays snappy. Results stay cached until the terrain changes.
                </div>
              )}
            </div>
          </section>

          <TerrainSummaryLegend pieces={layout.pieces} className="mt-0" />
        </aside>
      </section>

      <section
        data-testid="print-sheet"
        className="print-sheet rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl shadow-slate-950/10 sm:p-6 lg:p-8 print:p-0 print:border-0 print:shadow-none"
      >
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between print:gap-2 print:pb-2 print:border-slate-300">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700 print:text-[10px] print:text-slate-900">Print preview</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950 print:mt-0.5 print:text-base print:font-bold">{layout.table.title}</h2>
            <p className="mt-2 text-sm text-slate-600 print:mt-0.5 print:text-[10px]">
              {formatTableMeasure(layout.table.widthInches)} × {formatTableMeasure(layout.table.heightInches)}
              {' '}table · deployment depth {formatInches(layout.table.deploymentDepthInches)}
            </p>
          </div>
          <div className="screen-only flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleExportPng}
              disabled={isExporting}
              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isExporting ? 'Exporting…' : 'Download clean PNG'}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
            >
              Print this sheet
            </button>
          </div>
        </div>

        <div className="mt-5 space-y-4 print:mt-2 print:space-y-2">
          <div
            data-testid="print-map"
            className="mx-auto overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 print:max-w-[7.5in] print:rounded-lg print:border-slate-300 print:p-1.5"
          >
            <TableCanvas
              widthInches={layout.table.widthInches}
              heightInches={layout.table.heightInches}
              deploymentDepthInches={layout.table.deploymentDepthInches}
              title={layout.table.title}
              pieces={layout.pieces}
              cleanOutput
            />
          </div>

          <section
            data-testid="print-terrain-legend"
            className="rounded-2xl border border-slate-300 bg-white px-4 py-4 text-black print:rounded-lg print:border-black print:px-2.5 print:py-2"
          >
            <div className="flex items-center justify-between gap-3 print:gap-2">
              <div>
                <h3 className="text-base font-bold tracking-[0.02em] text-black print:text-sm">Terrain legend</h3>
                <p className="mt-1 text-xs text-slate-700 print:mt-0.5 print:text-[10px] print:leading-tight">
                  Terrain name plus the key rules that matter at the table. Built for black-and-white printing.
                </p>
              </div>
              <span className="rounded-full border border-black bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-black print:px-2 print:py-0.5 print:text-[9px]">
                {printLegendEntries.length} pieces
              </span>
            </div>

            {printLegendEntries.length === 0 ? (
              <p className="mt-3 text-sm text-slate-700">No terrain pieces on the table.</p>
            ) : (
              <div className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3 print:mt-2 print:gap-x-2.5 print:gap-y-1.5 print:grid-cols-3">
                {printLegendEntries.map(({ piece, traitsText }) => (
                  <article
                    key={piece.id}
                    data-testid="print-legend-item"
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 print:rounded-md print:border-slate-400 print:px-2 print:py-1"
                  >
                    <h4 className="text-sm font-bold leading-tight text-black print:text-xs">{piece.name}</h4>
                    <p className="mt-0.5 text-xs leading-5 text-slate-700 print:text-[10px] print:leading-snug print:mt-0">{traitsText}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>

      <div className="pointer-events-none absolute -left-[9999px] top-0 w-[1200px] opacity-0" aria-hidden="true">
        <TableCanvas
          widthInches={layout.table.widthInches}
          heightInches={layout.table.heightInches}
          deploymentDepthInches={layout.table.deploymentDepthInches}
          title={layout.table.title}
          pieces={layout.pieces}
          cleanOutput
          svgRef={cleanSvgRef}
        />
      </div>

      {showSaveModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowSaveModal(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-white">Save Layout</h2>
            <p className="mt-2 text-sm text-slate-300">Enter a name for this layout</p>
            
            <label className="mt-4 flex flex-col gap-2 text-sm text-slate-200">
              Layout name
              <input
                type="text"
                value={saveModalInput}
                onChange={(event) => setSaveModalInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleSaveLayoutFromModal();
                  } else if (event.key === 'Escape') {
                    setShowSaveModal(false);
                  }
                }}
                autoFocus
                className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/50"
                placeholder="Tournament round 2"
              />
            </label>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleSaveLayoutFromModal}
                className="flex-1 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/25 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showLoadModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowLoadModal(false)}
        >
          <div
            className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Load Layout</h2>
                <p className="mt-1 text-sm text-slate-300">Choose a saved layout to load</p>
              </div>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-300">
                {savedLayouts.length} saved
              </span>
            </div>

            <div className="mt-4 max-h-[60vh] space-y-3 overflow-y-auto pr-2">
              {savedLayouts.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-400">
                  No saved layouts yet. Save your current layout to get started.
                </p>
              ) : (
                savedLayouts.map((savedLayout) => {
                  const isActive = savedLayout.id === activeSavedLayoutId;

                  return (
                    <article
                      key={savedLayout.id}
                      className={`rounded-2xl border p-4 transition ${
                        isActive
                          ? 'border-cyan-400/60 bg-cyan-400/10'
                          : 'border-white/10 bg-slate-950/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-white">{savedLayout.name}</h3>
                          <p className="mt-1 text-xs text-slate-400">
                            Updated {formatUpdatedAt(savedLayout.updatedAt)}
                          </p>
                        </div>
                        {isActive && (
                          <span className="rounded-full bg-cyan-400/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-200">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => handleLoadSavedLayout(savedLayout)}
                          className="rounded-full border border-white/10 px-3 py-1.5 text-slate-100 transition hover:border-cyan-300 hover:bg-cyan-400/10 hover:text-white"
                        >
                          Load
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleRenameSavedLayout(savedLayout);
                          }}
                          className="rounded-full border border-white/10 px-3 py-1.5 text-slate-300 transition hover:border-white/25 hover:text-white"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleDeleteSavedLayout(savedLayout);
                          }}
                          className="rounded-full border border-rose-400/20 px-3 py-1.5 text-rose-200 transition hover:border-rose-300/40 hover:bg-rose-500/10"
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowLoadModal(false)}
                className="rounded-2xl border border-white/10 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/25 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
