import { cloneLayout, createDefaultLayout } from '../data/terrainCatalog';
import type { PlacementConfig } from '../terrain/types';
import type { LayoutState, SavedLayoutRecord, TableSettings, TerrainPiece, TerrainTrait } from '../types/layout';

export const WORKING_LAYOUT_STORAGE_KEY = 'opr-terrain.working-layout.v1';
export const SAVED_LAYOUTS_STORAGE_KEY = 'opr-terrain.saved-layouts.v1';

const DEFAULT_LAYOUT = createDefaultLayout();

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const coerceNumber = (value: unknown, fallback: number, min = 0, max = Number.POSITIVE_INFINITY) => {
  const parsed = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
};

const coerceString = (value: unknown, fallback: string) =>
  typeof value === 'string' && value.trim().length > 0 ? value : fallback;

const normalizeTrait = (value: unknown): TerrainTrait | null => {
  if (!isObject(value)) {
    return null;
  }

  const category = value.category;

  if (category !== 'cover' && category !== 'movement' && category !== 'los') {
    return null;
  }

  return {
    id: coerceString(value.id, 'trait'),
    label: coerceString(value.label, 'Trait'),
    category,
    active: Boolean(value.active),
  };
};

const normalizePiece = (value: unknown): TerrainPiece | null => {
  if (!isObject(value)) {
    return null;
  }

  const shape = value.shape;

  if (shape !== 'rect' && shape !== 'ellipse' && shape !== 'diamond') {
    return null;
  }

  const rawTraits = Array.isArray(value.traits) ? value.traits : [];
  const traits = rawTraits.map(normalizeTrait).filter((trait): trait is TerrainTrait => trait !== null);

  return {
    id: coerceString(value.id, `piece-${Math.random().toString(36).slice(2, 8)}`),
    templateId: coerceString(value.templateId, 'custom'),
    name: coerceString(value.name, 'Terrain piece'),
    shape,
    fill: coerceString(value.fill, '#475569'),
    stroke: coerceString(value.stroke, '#f8fafc'),
    width: coerceNumber(value.width, 6, 1.5, 24),
    height: coerceNumber(value.height, 6, 1.5, 24),
    x: coerceNumber(value.x, 24, 0, 96),
    y: coerceNumber(value.y, 24, 0, 96),
    rotation: coerceNumber(value.rotation, 0, -180, 180),
    traits,
  };
};

type NormalizedTableResult = {
  table: TableSettings;
  legacyScaleFrom?: {
    widthInches: number;
    heightInches: number;
  };
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const scalePieceToTable = (
  piece: TerrainPiece,
  fromTable: { widthInches: number; heightInches: number },
  toTable: TableSettings,
): TerrainPiece => ({
  ...piece,
  x: clamp((piece.x / fromTable.widthInches) * toTable.widthInches, piece.width / 2, toTable.widthInches - piece.width / 2),
  y: clamp((piece.y / fromTable.heightInches) * toTable.heightInches, piece.height / 2, toTable.heightInches - piece.height / 2),
});

const normalizeTable = (value: unknown): NormalizedTableResult => {
  const source = isObject(value) ? value : {};
  const widthInches = coerceNumber(source.widthInches, DEFAULT_LAYOUT.table.widthInches, 24, 72);
  const heightInches = coerceNumber(source.heightInches, DEFAULT_LAYOUT.table.heightInches, 24, 72);
  const baseTable: TableSettings = {
    widthInches,
    heightInches,
    deploymentDepthInches: coerceNumber(
      source.deploymentDepthInches,
      DEFAULT_LAYOUT.table.deploymentDepthInches,
      6,
      24,
    ),
    title: coerceString(source.title, DEFAULT_LAYOUT.table.title),
  };

  if (widthInches === 48 && (heightInches === 48 || heightInches === 72)) {
    return {
      table: {
        ...baseTable,
        widthInches: DEFAULT_LAYOUT.table.widthInches,
        heightInches: DEFAULT_LAYOUT.table.heightInches,
      },
      legacyScaleFrom: {
        widthInches,
        heightInches,
      },
    };
  }

  return {
    table: baseTable,
  };
};

const normalizePlacementConfig = (value: unknown): PlacementConfig | undefined => {
  if (!isObject(value)) {
    return undefined;
  }

  const strategy = value.strategy;
  const density = value.density;

  return {
    ...(strategy === 'random' ||
      strategy === 'balanced-coverage' ||
      strategy === 'symmetrical' ||
      strategy === 'asymmetric' ||
      strategy === 'clustered-zones' ||
      strategy === 'los-blocking-lanes'
      ? { strategy }
      : {}),
    ...(density === 'sparse' || density === 'balanced' || density === 'dense' ? { density } : {}),
    ...(typeof value.prioritizeCover === 'boolean' ? { prioritizeCover: value.prioritizeCover } : {}),
    ...(typeof value.deploymentZoneSafety === 'boolean'
      ? { deploymentZoneSafety: value.deploymentZoneSafety }
      : {}),
    ...(typeof value.forceSymmetry === 'boolean' ? { forceSymmetry: value.forceSymmetry } : {}),
  };
};

const normalizeTemplate = (value: unknown): import('../types/layout').TerrainTemplate | null => {
  if (!isObject(value)) {
    return null;
  }

  const shape = value.shape;
  if (shape !== 'rect' && shape !== 'ellipse' && shape !== 'diamond') {
    return null;
  }

  const rawTraits = Array.isArray(value.traits) ? value.traits : [];
  const traits = rawTraits.map((t) => {
    if (!isObject(t)) {
      return null;
    }
    return {
      id: coerceString(t.id, 'trait'),
      label: coerceString(t.label, 'Trait'),
      category: t.category === 'cover' || t.category === 'movement' || t.category === 'los' ? t.category : 'cover',
      ...(typeof t.active === 'boolean' ? { active: t.active } : {}),
    };
  }).filter((t): t is Omit<TerrainTrait, 'active'> & { active?: boolean } => t !== null);

  return {
    id: coerceString(value.id, `template-${Math.random().toString(36).slice(2, 8)}`),
    name: coerceString(value.name, 'Template'),
    shape,
    fill: coerceString(value.fill, '#475569'),
    stroke: coerceString(value.stroke, '#f8fafc'),
    width: coerceNumber(value.width, 6, 1.5, 24),
    height: coerceNumber(value.height, 6, 1.5, 24),
    defaultRotation: typeof value.defaultRotation === 'number' ? value.defaultRotation : undefined,
    traits,
  };
};

export const normalizeLayout = (value: unknown): LayoutState | null => {
  if (!isObject(value)) {
    return null;
  }

  const normalizedTable = normalizeTable(value.table);
  const pieces = Array.isArray(value.pieces)
    ? value.pieces
        .map(normalizePiece)
        .filter((piece): piece is TerrainPiece => piece !== null)
        .map((piece) =>
          normalizedTable.legacyScaleFrom
            ? scalePieceToTable(piece, normalizedTable.legacyScaleFrom, normalizedTable.table)
            : piece,
        )
    : [];

  const placementConfig = normalizePlacementConfig(value.placementConfig);

  const customTemplates = Array.isArray(value.customTemplates)
    ? value.customTemplates.map(normalizeTemplate).filter((t): t is import('../types/layout').TerrainTemplate => t !== null)
    : undefined;

  return {
    version: 1,
    table: normalizedTable.table,
    pieces,
    ...(placementConfig && Object.keys(placementConfig).length > 0 ? { placementConfig } : {}),
    ...(customTemplates && customTemplates.length > 0 ? { customTemplates } : {}),
  };
};

const normalizeSavedLayout = (value: unknown): SavedLayoutRecord | null => {
  if (!isObject(value)) {
    return null;
  }

  const layout = normalizeLayout(value.layout);

  if (!layout) {
    return null;
  }

  return {
    id: coerceString(value.id, `layout-${Math.random().toString(36).slice(2, 8)}`),
    name: coerceString(value.name, 'Saved layout'),
    createdAt: coerceString(value.createdAt, new Date(0).toISOString()),
    updatedAt: coerceString(value.updatedAt, new Date(0).toISOString()),
    layout,
  };
};

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const writeStorageJson = (key: string, value: unknown) => {
  if (!canUseStorage()) {
    return false;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

export const loadWorkingLayout = (): LayoutState | null => {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(WORKING_LAYOUT_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    return normalizeLayout(JSON.parse(raw));
  } catch {
    return null;
  }
};

export const persistWorkingLayout = (layout: LayoutState) => writeStorageJson(WORKING_LAYOUT_STORAGE_KEY, layout);

export const loadSavedLayouts = (): SavedLayoutRecord[] => {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(SAVED_LAYOUTS_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(normalizeSavedLayout)
      .filter((layout): layout is SavedLayoutRecord => layout !== null)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  } catch {
    return [];
  }
};

export const persistSavedLayouts = (layouts: SavedLayoutRecord[]) => writeStorageJson(SAVED_LAYOUTS_STORAGE_KEY, layouts);

const encodeBase64Url = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
};

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return new TextDecoder().decode(bytes);
};

export const encodeLayoutHash = (layout: LayoutState) => encodeBase64Url(JSON.stringify(layout));

export const decodeLayoutHash = (hash: string): LayoutState | null => {
  const value = hash.startsWith('#') ? hash.slice(1) : hash;

  if (!value) {
    return null;
  }

  try {
    return normalizeLayout(JSON.parse(decodeBase64Url(value)));
  } catch {
    return null;
  }
};

export const createShareUrl = (layout: LayoutState) => {
  if (typeof window === 'undefined') {
    return `#${encodeLayoutHash(layout)}`;
  }

  const url = new URL(window.location.href);
  url.hash = encodeLayoutHash(layout);
  return url.toString();
};

export const getInitialLayout = (): LayoutState => {
  if (typeof window !== 'undefined') {
    const fromHash = decodeLayoutHash(window.location.hash);

    if (fromHash) {
      return fromHash;
    }
  }

  return loadWorkingLayout() ?? cloneLayout(DEFAULT_LAYOUT);
};

export const cloneLayoutState = (layout: LayoutState) => cloneLayout(layout);
