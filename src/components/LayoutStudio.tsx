import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
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
import type { LayoutState, SavedLayoutRecord, TerrainPiece, TerrainTrait, TerrainTemplate } from '../types/layout';
import { formatInches, formatTableMeasure, getSceneSize, TABLE_SCENE_MARGIN, TableCanvas } from './TableCanvas';
import { TERRAIN_LIBRARY_MIME_TYPE, TerrainPaletteTable } from './TerrainPaletteTable';
import type { PieceFormData } from './TerrainPieceModal';
import { AutoPlacementGenerator } from './AutoPlacementGenerator';
import { TerrainSummaryLegend } from './TerrainSummaryLegend';
import type { TerrainLayout } from '../terrain/types';

type DragState = {
  pieceId: string;
  startSceneX: number;
  startSceneY: number;
  startPieceX: number;
  startPieceY: number;
};

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

const clampPieceToTable = (piece: TerrainPiece, layout: LayoutState) => {
  const width = clamp(piece.width, 2, 24);
  const height = clamp(piece.height, 2, 24);

  return {
    ...piece,
    width,
    height,
    x: clamp(piece.x, width / 2, layout.table.widthInches - width / 2),
    y: clamp(piece.y, height / 2, layout.table.heightInches - height / 2),
    rotation: clamp(piece.rotation, -180, 180),
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

const categoryLabels: Record<TerrainTrait['category'], string> = {
  cover: 'Cover',
  movement: 'Movement',
  los: 'LoS',
};

const categoryChipClasses: Record<TerrainTrait['category'], string> = {
  cover: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/30 print:bg-emerald-100 print:text-emerald-900 print:ring-emerald-200',
  movement:
    'bg-amber-500/15 text-amber-100 ring-amber-400/30 print:bg-amber-100 print:text-amber-900 print:ring-amber-200',
  los: 'bg-sky-500/15 text-sky-100 ring-sky-400/30 print:bg-sky-100 print:text-sky-900 print:ring-sky-200',
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

export function LayoutStudio() {
  const [initialStudioState] = useState(createInitialStudioState);
  const [layout, setLayout] = useState<LayoutState>(initialStudioState.layout);
  const [savedLayouts, setSavedLayouts] = useState<SavedLayoutRecord[]>(() => loadSavedLayouts());
  const [customPieces, setCustomPieces] = useState<CustomPieceDefinition[]>(initialStudioState.customPieces);
  const [presetOverrides, setPresetOverrides] = useState<Map<string, TerrainTemplate>>(
    () => new Map(initialStudioState.presetOverrides),
  );
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [activeSavedLayoutId, setActiveSavedLayoutId] = useState<string | null>(null);
  const [layoutNameInput, setLayoutNameInput] = useState('');
  const [statusMessage, setStatusMessage] = useState(
    'Draft changes auto-save locally and update the share URL in the address bar.',
  );
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [libraryDragActive, setLibraryDragActive] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const cleanSvgRef = useRef<SVGSVGElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const layoutRef = useRef(layout);
  const customPiecesRef = useRef(customPieces);

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

      return layout.pieces[0]?.id ?? null;
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

  const selectedPiece = useMemo(
    () => layout.pieces.find((piece) => piece.id === selectedPieceId) ?? null,
    [layout.pieces, selectedPieceId],
  );

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

  const getDropPosition = (clientX: number, clientY: number) => {
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

  const shareUrl = useMemo(
    () => createShareUrl(buildLayoutWithCustomTemplates(layout, customPieces)),
    [layout, customPieces],
  );

  const shareUrlPreview = useMemo(() => {
    try {
      const url = new URL(shareUrl);
      return `${url.origin}${url.pathname}#…`;
    } catch {
      return 'Share link ready to copy';
    }
  }, [shareUrl]);
  const legendPieces = useMemo(
    () => [...layout.pieces].sort((left, right) => left.name.localeCompare(right.name)),
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

    const dropPosition = getDropPosition(event.clientX, event.clientY);

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
    }));

    setActiveSavedLayoutId(null);
    setLayoutNameInput('');
    setStatusMessage(
      `Generated ${convertedPieces.length} terrain pieces using ${terrainLayout.placementConfig?.strategy || 'random'} strategy.`,
    );
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

  const handleLoadSavedLayout = (savedLayout: SavedLayoutRecord) => {
    setLayout(cloneLayout(savedLayout.layout));
    setActiveSavedLayoutId(savedLayout.id);
    setLayoutNameInput(savedLayout.name);
    setStatusMessage(`Loaded saved layout "${savedLayout.name}".`);
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
            <button
              type="button"
              onClick={handleExportPng}
              disabled={isExporting}
              className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isExporting ? 'Exporting…' : 'Export PNG'}
            </button>
            <button
              type="button"
              onClick={handleCopyShareUrl}
              className="rounded-full border border-cyan-400/40 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300 hover:text-white"
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

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] lg:items-end">
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

          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3 text-sm text-cyan-50">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-cyan-200">Live share link</p>
              <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-100">
                Ready
              </span>
            </div>
            <p className="mt-1 text-xs text-cyan-50/80">
              Use Copy share URL to grab the full link. The preview stays shortened so the header
              does not turn into a wall of hash text.
            </p>
            <p className="mt-3 truncate font-mono text-xs text-cyan-100/90">{shareUrlPreview}</p>
          </div>
        </div>

        <p className="text-sm text-emerald-300/90">{statusMessage}</p>
        {storageWarning ? (
          <p role="alert" className="text-sm text-amber-200/90">
            {storageWarning}
          </p>
        ) : null}
      </header>

      <section className="screen-only grid gap-6 xl:grid-cols-[minmax(18rem,20rem)_minmax(0,1fr)]">
        <aside className="flex flex-col gap-6">
          <AutoPlacementGenerator
            widthInches={layout.table.widthInches}
            heightInches={layout.table.heightInches}
            deploymentDepthInches={layout.table.deploymentDepthInches}
            onLayoutGenerated={handleLayoutGenerated}
            initialConfig={layout.placementConfig}
          />

          <section className="rounded-3xl border border-white/10 bg-slate-900/65 p-5 shadow-xl shadow-slate-950/20">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Named layouts</h2>
                <p className="mt-1 text-sm text-slate-300">
                  Save a local snapshot and reload it after refresh.
                </p>
              </div>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-300">
                {savedLayouts.length} saved
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <label className="flex flex-col gap-2 text-sm text-slate-200">
                Saved layout name
                <input
                  type="text"
                  value={layoutNameInput}
                  onChange={(event) => setLayoutNameInput(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/50"
                  placeholder="Tournament round 2"
                />
              </label>

              <button
                type="button"
                onClick={handleSaveLayout}
                className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                {activeSavedLayoutId ? 'Update current saved layout' : 'Save current layout'}
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {savedLayouts.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-slate-400">
                  No named layouts yet. Your working draft still auto-saves locally.
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
                        {isActive ? (
                          <span className="rounded-full bg-cyan-400/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-200">
                            Active
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => handleLoadSavedLayout(savedLayout)}
                          className="rounded-full border border-white/10 px-3 py-1.5 text-slate-100 transition hover:border-cyan-300 hover:text-white"
                        >
                          Load
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRenameSavedLayout(savedLayout)}
                          className="rounded-full border border-white/10 px-3 py-1.5 text-slate-300 transition hover:border-white/25 hover:text-white"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSavedLayout(savedLayout)}
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
        </aside>

        <section className="rounded-3xl border border-white/10 bg-slate-900/65 p-4 shadow-xl shadow-slate-950/20 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Interactive table</h2>
              <p className="mt-1 text-sm text-slate-300">
                Drag terrain directly on the board. Rename pieces, toggle traits, duplicate them,
                or remove them below the canvas instead of losing table width to a sidebar.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-right text-sm text-slate-200">
              <p className="font-semibold text-white">{screenLegend}</p>
              <p className="mt-1 text-xs text-slate-400">
                {layout.pieces.length} pieces · deployment depth {formatInches(layout.table.deploymentDepthInches)}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 p-3 shadow-inner shadow-slate-950/30 sm:p-4">
            <TableCanvas
              widthInches={layout.table.widthInches}
              heightInches={layout.table.heightInches}
              deploymentDepthInches={layout.table.deploymentDepthInches}
              title={layout.table.title}
              pieces={layout.pieces}
              selectedPieceId={selectedPieceId}
              svgRef={svgRef}
              libraryDragActive={libraryDragActive}
              onCanvasDragOver={handleCanvasDragOver}
              onCanvasDrop={handleCanvasDrop}
              onPiecePointerDown={handlePiecePointerDown}
              onPieceSelect={setSelectedPieceId}
            />
          </div>

          {selectedPiece ? (
            <section className="mt-6 rounded-3xl border border-white/10 bg-slate-950/40 p-5 shadow-lg shadow-slate-950/20">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-cyan-300/80">Selected piece</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-semibold text-white">{selectedPiece.name}</h3>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-300">
                      {selectedPiece.templateId}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">
                    Drag directly on the board to reposition it. Rotation stays on the canvas via
                    the in-place handle.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleDuplicateSelectedPiece}
                    className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/25 hover:text-white"
                  >
                    Duplicate piece
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteSelectedPiece}
                    className="rounded-full border border-rose-400/20 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:border-rose-300/40 hover:bg-rose-500/10"
                  >
                    Delete piece
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
                <label className="flex flex-col gap-2 text-sm text-slate-200">
                  Piece name
                  <input
                    type="text"
                    value={selectedPiece.name}
                    onChange={(event) =>
                      updatePiece(selectedPiece.id, (piece) => ({
                        ...piece,
                        name: event.target.value,
                      }))
                    }
                    className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/50"
                  />
                </label>

                <dl className="grid grid-cols-2 gap-3 text-sm text-slate-200 sm:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-3">
                    <dt className="text-xs uppercase tracking-wide text-slate-400">Position X</dt>
                    <dd className="mt-1 font-semibold text-white">{formatInches(selectedPiece.x)}</dd>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-3">
                    <dt className="text-xs uppercase tracking-wide text-slate-400">Position Y</dt>
                    <dd className="mt-1 font-semibold text-white">{formatInches(selectedPiece.y)}</dd>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-3">
                    <dt className="text-xs uppercase tracking-wide text-slate-400">Footprint</dt>
                    <dd className="mt-1 font-semibold text-white">
                      {formatInches(selectedPiece.width)} × {formatInches(selectedPiece.height)}
                    </dd>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-3">
                    <dt className="text-xs uppercase tracking-wide text-slate-400">Rotation</dt>
                    <dd className="mt-1 font-semibold text-white">{selectedPiece.rotation}°</dd>
                  </div>
                </dl>
              </div>

              <div className="mt-5">
                <h3 className="text-sm font-semibold text-white">Active terrain traits</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {selectedPiece.traits.map((trait) => (
                    <label
                      key={trait.id}
                      className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-100"
                    >
                      <input
                        type="checkbox"
                        checked={trait.active}
                        onChange={(event) =>
                          updatePiece(selectedPiece.id, (piece) => ({
                            ...piece,
                            traits: piece.traits.map((candidate) =>
                              candidate.id === trait.id
                                ? {
                                    ...candidate,
                                    active: event.target.checked,
                                  }
                                : candidate,
                            ),
                          }))
                        }
                        className="mt-0.5 h-4 w-4 rounded border-white/10 bg-slate-900 text-cyan-400"
                      />
                      <span>
                        <span className="block font-medium text-white">{trait.label}</span>
                        <span className="mt-1 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset text-slate-300 ring-white/10">
                          {categoryLabels[trait.category]}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </section>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
              Select a terrain piece on the table to rename it, toggle traits, duplicate it, or
              remove it.
            </div>
          )}

          <div className="mt-6">
            <TerrainSummaryLegend pieces={layout.pieces} />
          </div>
        </section>
      </section>

      <section className="print-sheet rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl shadow-slate-950/10 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">Print preview</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">{layout.table.title}</h2>
            <p className="mt-2 text-sm text-slate-600">
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

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.85fr)] xl:items-start">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <TableCanvas
              widthInches={layout.table.widthInches}
              heightInches={layout.table.heightInches}
              deploymentDepthInches={layout.table.deploymentDepthInches}
              title={layout.table.title}
              pieces={layout.pieces}
              cleanOutput
            />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Terrain legend</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Piece names plus the active cover, movement, and line-of-sight rules.
                </p>
              </div>
              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                {legendPieces.length} pieces
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {legendPieces.map((piece) => {
                const activeTraits = piece.traits.filter((trait) => trait.active);

                return (
                  <article key={piece.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-950">{piece.name}</h4>
                        <p className="mt-1 text-xs text-slate-500">
                          {piece.templateId} · x {piece.x.toFixed(1)} / y {piece.y.toFixed(1)} · {formatInches(piece.width)} × {formatInches(piece.height)}
                        </p>
                      </div>
                      <span
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border"
                        style={{ backgroundColor: piece.fill, borderColor: piece.stroke }}
                        aria-hidden="true"
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {activeTraits.length > 0 ? (
                        activeTraits.map((trait) => (
                          <span
                            key={`${piece.id}-${trait.id}`}
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${categoryChipClasses[trait.category]}`}
                          >
                            {categoryLabels[trait.category]} · {trait.label}
                          </span>
                        ))
                      ) : (
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
                          No active traits
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
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
    </div>
  );
}
