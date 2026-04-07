import type { TerrainTemplate } from '../types/layout';

export const CUSTOM_PIECES_STORAGE_KEY = 'opr-terrain.custom-pieces.v1';

const createId = () => globalThis.crypto?.randomUUID?.() ?? `custom-${Math.random().toString(36).slice(2, 10)}`;

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export interface CustomPieceDefinition extends TerrainTemplate {
  isCustom: true;
}

const normalizeCustomPiece = (value: unknown): CustomPieceDefinition | null => {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const obj = value as Record<string, unknown>;

  if (typeof obj.id !== 'string' || typeof obj.name !== 'string') {
    return null;
  }

  const shape = obj.shape;
  if (shape !== 'rect' && shape !== 'ellipse' && shape !== 'diamond') {
    return null;
  }

  const traits = Array.isArray(obj.traits) ? obj.traits : [];

  return {
    id: obj.id,
    name: obj.name,
    shape,
    fill: typeof obj.fill === 'string' ? obj.fill : '#475569',
    stroke: typeof obj.stroke === 'string' ? obj.stroke : '#f8fafc',
    width: typeof obj.width === 'number' ? obj.width : 6,
    height: typeof obj.height === 'number' ? obj.height : 6,
    defaultRotation: typeof obj.defaultRotation === 'number' ? obj.defaultRotation : 0,
    traits,
    isCustom: true,
  };
};

export const loadCustomPieces = (): CustomPieceDefinition[] => {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(CUSTOM_PIECES_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(normalizeCustomPiece)
      .filter((piece): piece is CustomPieceDefinition => piece !== null);
  } catch {
    return [];
  }
};

export const persistCustomPieces = (pieces: CustomPieceDefinition[]): boolean => {
  if (!canUseStorage()) {
    return false;
  }

  try {
    window.localStorage.setItem(CUSTOM_PIECES_STORAGE_KEY, JSON.stringify(pieces));
    return true;
  } catch (error) {
    console.error('Failed to save custom terrain pieces to localStorage:', error);
    return false;
  }
};

export const addCustomPiece = (piece: Omit<TerrainTemplate, 'id'>): CustomPieceDefinition => {
  const newPiece: CustomPieceDefinition = {
    ...piece,
    id: createId(),
    isCustom: true,
  };

  const existing = loadCustomPieces();
  persistCustomPieces([...existing, newPiece]);

  return newPiece;
};

export const updateCustomPiece = (id: string, updates: Partial<TerrainTemplate>): boolean => {
  const existing = loadCustomPieces();
  const index = existing.findIndex((piece) => piece.id === id);

  if (index === -1) {
    return false;
  }

  existing[index] = { ...existing[index], ...updates, isCustom: true };
  return persistCustomPieces(existing);
};

export const deleteCustomPiece = (id: string): boolean => {
  const existing = loadCustomPieces();
  const filtered = existing.filter((piece) => piece.id !== id);

  if (filtered.length === existing.length) {
    return false;
  }

  return persistCustomPieces(filtered);
};

export const duplicateCustomPiece = (id: string): CustomPieceDefinition | null => {
  const existing = loadCustomPieces();
  const piece = existing.find((p) => p.id === id);

  if (!piece) {
    return null;
  }

  const duplicate: CustomPieceDefinition = {
    ...piece,
    id: createId(),
    name: `${piece.name} (Copy)`,
    isCustom: true,
  };

  persistCustomPieces([...existing, duplicate]);
  return duplicate;
};
