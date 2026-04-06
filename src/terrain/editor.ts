import { getTemplateById } from './catalog';
import { piecesOverlap } from './generateTerrainLayout';
import type { TerrainPiece, TerrainShape, TerrainShapeKind } from './types';

const DEFAULT_COLLISION_BUFFER = 0.8;
const DEFAULT_GRID_SIZE = 1;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const buildTerrainPieceId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `terrain-${crypto.randomUUID()}`;
  }

  return `terrain-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
};

export const getShapeCollisionRadius = (shape: TerrainShape) => {
  if (shape.kind === 'circle') {
    return shape.radius;
  }

  if (shape.kind === 'rectangle') {
    return Math.hypot(shape.width / 2, shape.height / 2);
  }

  return shape.points.reduce((largest, point) => Math.max(largest, Math.hypot(point.x, point.y)), 0);
};

export const normalizeRotation = (rotation: number) => ((rotation % 360) + 360) % 360;

export const snapCoordinateToGrid = (value: number, gridSize = DEFAULT_GRID_SIZE) =>
  Math.round(value / gridSize) * gridSize;

export const createTerrainPieceFromTemplate = (
  templateId: string,
  shapeKind?: TerrainShapeKind,
  random: () => number = Math.random,
): TerrainPiece => {
  const template = getTemplateById(templateId);
  const resolvedShapeKind = shapeKind ?? template.shapeKinds[0]!;
  const shape = template.buildShape(resolvedShapeKind, random);

  return {
    id: buildTerrainPieceId(),
    templateId: template.id,
    name: template.name,
    color: template.color,
    traits: template.traits,
    x: 0,
    y: 0,
    rotation: 0,
    shape,
    collisionRadius: getShapeCollisionRadius(shape),
  };
};

export const moveTerrainPiece = (piece: TerrainPiece, x: number, y: number): TerrainPiece => ({
  ...piece,
  x,
  y,
});

export const rotateTerrainPiece = (piece: TerrainPiece, deltaDegrees = 90): TerrainPiece => {
  if (piece.shape.kind === 'circle') {
    return piece;
  }

  return {
    ...piece,
    rotation: normalizeRotation(piece.rotation + deltaDegrees),
  };
};

export const replaceTerrainPiece = (
  pieces: readonly TerrainPiece[],
  nextPiece: TerrainPiece,
): TerrainPiece[] => pieces.map((piece) => (piece.id === nextPiece.id ? nextPiece : piece));

export const isPieceWithinTable = (
  piece: TerrainPiece,
  widthInches: number,
  heightInches: number,
) => {
  const radius = piece.collisionRadius;

  return (
    piece.x - radius >= 0 &&
    piece.x + radius <= widthInches &&
    piece.y - radius >= 0 &&
    piece.y + radius <= heightInches
  );
};

export const constrainTerrainPiecePosition = (
  piece: TerrainPiece,
  x: number,
  y: number,
  widthInches: number,
  heightInches: number,
  snapToGrid = false,
  gridSize = DEFAULT_GRID_SIZE,
) => {
  const nextX = snapToGrid ? snapCoordinateToGrid(x, gridSize) : x;
  const nextY = snapToGrid ? snapCoordinateToGrid(y, gridSize) : y;
  const radius = piece.collisionRadius;
  const minX = radius;
  const maxX = Math.max(radius, widthInches - radius);
  const minY = radius;
  const maxY = Math.max(radius, heightInches - radius);

  return {
    x: clamp(nextX, minX, maxX),
    y: clamp(nextY, minY, maxY),
  };
};

export const isPiecePlacementValid = (
  candidate: TerrainPiece,
  existingPieces: readonly TerrainPiece[],
  widthInches: number,
  heightInches: number,
  ignorePieceId?: string,
  collisionBufferInches = DEFAULT_COLLISION_BUFFER,
) => {
  if (!isPieceWithinTable(candidate, widthInches, heightInches)) {
    return false;
  }

  return !existingPieces.some(
    (piece) => piece.id !== ignorePieceId && piecesOverlap(candidate, piece, collisionBufferInches),
  );
};
