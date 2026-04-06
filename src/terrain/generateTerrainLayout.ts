import { getDeploymentOrientation } from '../table/tableGeometry';
import {
  getTemplateById,
  mandatoryTerrainSelections,
  pickShapeKind,
  pickWeightedTemplate,
  randomRotation,
} from './catalog';
import type {
  GenerateTerrainLayoutOptions,
  TerrainLayout,
  TerrainLayoutAnalysis,
  TerrainPiece,
  TerrainPoint,
  TerrainShape,
  TerrainShapeKind,
} from './types';

const DEFAULT_WIDTH = 48;
const DEFAULT_HEIGHT = 72;
const DEFAULT_DEPLOYMENT_DEPTH = 12;
const DEFAULT_MIN_PIECES = 15;
const DEFAULT_MAX_PIECES = 20;
const DEFAULT_COLLISION_BUFFER = 0.8;
const DEFAULT_MAX_ATTEMPTS_PER_PIECE = 360;
const DEFAULT_MAX_LAYOUT_ATTEMPTS = 100;
const DEPLOYMENT_CENTER_CLEARANCE = 4.5;

type QuarterIndex = 0 | 1 | 2 | 3;

interface PositionedPieceSpec {
  templateId: string;
  shapeKind: TerrainShapeKind;
}

const randomBetween = (min: number, max: number, random: () => number) =>
  min + (max - min) * random();

const randomInteger = (min: number, max: number, random: () => number) =>
  Math.floor(randomBetween(min, max + 1, random));

const shuffle = <T,>(items: readonly T[], random: () => number): T[] => {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex]!, copy[index]!];
  }

  return copy;
};

const getShapeCollisionRadius = (shape: TerrainShape) => {
  if (shape.kind === 'circle') {
    return shape.radius;
  }

  if (shape.kind === 'rectangle') {
    return Math.hypot(shape.width / 2, shape.height / 2);
  }

  return shape.points.reduce((largest, point) => Math.max(largest, Math.hypot(point.x, point.y)), 0);
};

const getPlacementRadius = (piece: TerrainPiece, collisionBufferInches: number) =>
  piece.collisionRadius + collisionBufferInches / 2;

const getQuarterIndex = (
  x: number,
  y: number,
  widthInches: number,
  heightInches: number,
): QuarterIndex => {
  const column = x < widthInches / 2 ? 0 : 1;
  const row = y < heightInches / 2 ? 0 : 1;

  return (row * 2 + column) as QuarterIndex;
};

const buildQuarterTargets = (pieceCount: number, random: () => number): [number, number, number, number] => {
  const base = Math.floor(pieceCount / 4);
  const remainder = pieceCount % 4;
  const targets: [number, number, number, number] = [base, base, base, base];
  const quarterOrder = shuffle([0, 1, 2, 3] as const, random);

  for (let index = 0; index < remainder; index += 1) {
    targets[quarterOrder[index]!] += 1;
  }

  return targets;
};

const buildQuarterSequence = (
  quarterTargets: [number, number, number, number],
  random: () => number,
): QuarterIndex[] => {
  const quarterSlots: QuarterIndex[] = [];

  quarterTargets.forEach((target, quarterIndex) => {
    for (let count = 0; count < target; count += 1) {
      quarterSlots.push(quarterIndex as QuarterIndex);
    }
  });

  return shuffle(quarterSlots, random);
};

const buildPieceSpecs = (pieceCount: number, random: () => number): PositionedPieceSpec[] => {
  const selections: PositionedPieceSpec[] = mandatoryTerrainSelections
    .slice(0, Math.min(pieceCount, mandatoryTerrainSelections.length))
    .map((selection) => ({ ...selection }));

  while (selections.length < pieceCount) {
    const template = pickWeightedTemplate(random);
    selections.push({
      templateId: template.id,
      shapeKind: pickShapeKind(template, random),
    });
  }

  return shuffle(selections, random);
};

const createPiece = (
  selection: PositionedPieceSpec,
  index: number,
  random: () => number,
): TerrainPiece => {
  const template = getTemplateById(selection.templateId);
  const shape = template.buildShape(selection.shapeKind, random);

  return {
    id: `terrain-${index + 1}-${Math.round(random() * 1_000_000_000)}`,
    templateId: template.id,
    name: template.name,
    color: template.color,
    traits: template.traits,
    x: 0,
    y: 0,
    rotation: shape.kind === 'circle' ? 0 : randomRotation(template.id, random),
    shape,
    collisionRadius: getShapeCollisionRadius(shape),
  };
};

const QUARTER_BOUNDARY_EPSILON = 0.01;

const getQuarterBounds = (
  quarterIndex: QuarterIndex,
  widthInches: number,
  heightInches: number,
  placementRadius: number,
) => {
  const halfWidth = widthInches / 2;
  const halfHeight = heightInches / 2;
  const minX =
    quarterIndex % 2 === 0 ? placementRadius : Math.max(halfWidth, placementRadius);
  const maxX =
    quarterIndex % 2 === 0
      ? Math.min(halfWidth - QUARTER_BOUNDARY_EPSILON, widthInches - placementRadius)
      : widthInches - placementRadius;
  const minY = quarterIndex < 2 ? placementRadius : Math.max(halfHeight, placementRadius);
  const maxY =
    quarterIndex < 2
      ? Math.min(halfHeight - QUARTER_BOUNDARY_EPSILON, heightInches - placementRadius)
      : heightInches - placementRadius;

  return { minX, maxX, minY, maxY };
};

const getDeploymentCenters = (
  widthInches: number,
  heightInches: number,
  deploymentDepthInches: number,
): TerrainPoint[] => {
  const orientation = getDeploymentOrientation(widthInches, heightInches);

  return orientation === 'vertical'
    ? [
        { x: deploymentDepthInches / 2, y: heightInches / 2 },
        { x: widthInches - deploymentDepthInches / 2, y: heightInches / 2 },
      ]
    : [
        { x: widthInches / 2, y: deploymentDepthInches / 2 },
        { x: widthInches / 2, y: heightInches - deploymentDepthInches / 2 },
      ];
};

const isOutsideTable = (
  piece: TerrainPiece,
  x: number,
  y: number,
  widthInches: number,
  heightInches: number,
  collisionBufferInches: number,
) => {
  const placementRadius = getPlacementRadius(piece, collisionBufferInches);

  return (
    x - placementRadius < 0 ||
    x + placementRadius > widthInches ||
    y - placementRadius < 0 ||
    y + placementRadius > heightInches
  );
};

const collidesWithDeploymentClearance = (
  piece: TerrainPiece,
  x: number,
  y: number,
  widthInches: number,
  heightInches: number,
  deploymentDepthInches: number,
  collisionBufferInches: number,
) => {
  const placementRadius = getPlacementRadius(piece, collisionBufferInches);
  const requiredDistance = DEPLOYMENT_CENTER_CLEARANCE + Math.min(placementRadius, 4.5);

  return getDeploymentCenters(widthInches, heightInches, deploymentDepthInches).some((center) =>
    Math.hypot(center.x - x, center.y - y) < requiredDistance,
  );
};

export const piecesOverlap = (
  left: TerrainPiece,
  right: TerrainPiece,
  collisionBufferInches = DEFAULT_COLLISION_BUFFER,
) =>
  Math.hypot(left.x - right.x, left.y - right.y) <
  left.collisionRadius + right.collisionRadius + collisionBufferInches;

const isPlacementValid = (
  candidate: TerrainPiece,
  x: number,
  y: number,
  placedPieces: readonly TerrainPiece[],
  widthInches: number,
  heightInches: number,
  deploymentDepthInches: number,
  collisionBufferInches: number,
) => {
  if (isOutsideTable(candidate, x, y, widthInches, heightInches, collisionBufferInches)) {
    return false;
  }

  if (
    collidesWithDeploymentClearance(
      candidate,
      x,
      y,
      widthInches,
      heightInches,
      deploymentDepthInches,
      collisionBufferInches,
    )
  ) {
    return false;
  }

  return !placedPieces.some((piece) => piecesOverlap({ ...candidate, x, y }, piece, collisionBufferInches));
};

const tryPlacePiece = (
  piece: TerrainPiece,
  preferredQuarter: QuarterIndex,
  placedPieces: readonly TerrainPiece[],
  widthInches: number,
  heightInches: number,
  deploymentDepthInches: number,
  collisionBufferInches: number,
  maxAttemptsPerPiece: number,
  random: () => number,
): TerrainPiece | null => {
  const placementRadius = getPlacementRadius(piece, collisionBufferInches);
  const bounds = getQuarterBounds(preferredQuarter, widthInches, heightInches, placementRadius);

  if (bounds.minX > bounds.maxX || bounds.minY > bounds.maxY) {
    return null;
  }

  for (let attempt = 0; attempt < maxAttemptsPerPiece; attempt += 1) {
    const x = randomBetween(bounds.minX, bounds.maxX, random);
    const y = randomBetween(bounds.minY, bounds.maxY, random);

    if (
      isPlacementValid(
        piece,
        x,
        y,
        placedPieces,
        widthInches,
        heightInches,
        deploymentDepthInches,
        collisionBufferInches,
      )
    ) {
      return { ...piece, x, y };
    }
  }

  return null;
};

export const generateTerrainLayout = (
  options: GenerateTerrainLayoutOptions = {},
): TerrainLayout => {
  const {
    widthInches = DEFAULT_WIDTH,
    heightInches = DEFAULT_HEIGHT,
    deploymentDepthInches = DEFAULT_DEPLOYMENT_DEPTH,
    minPieces = DEFAULT_MIN_PIECES,
    maxPieces = DEFAULT_MAX_PIECES,
    pieceCount,
    collisionBufferInches = DEFAULT_COLLISION_BUFFER,
    maxAttemptsPerPiece = DEFAULT_MAX_ATTEMPTS_PER_PIECE,
    maxLayoutAttempts = DEFAULT_MAX_LAYOUT_ATTEMPTS,
    random = Math.random,
  } = options;

  const targetPieceCount = pieceCount ?? randomInteger(minPieces, maxPieces, random);

  if (targetPieceCount < 1) {
    throw new Error('Terrain layout must request at least one piece.');
  }

  if (targetPieceCount > 20) {
    throw new Error('Terrain layout generator supports up to 20 pieces while keeping quarter balance.');
  }

  for (let layoutAttempt = 0; layoutAttempt < maxLayoutAttempts; layoutAttempt += 1) {
    const quarterTargets = buildQuarterTargets(targetPieceCount, random);
    const quarterSequence = buildQuarterSequence(quarterTargets, random);
    const pieceSpecs = buildPieceSpecs(targetPieceCount, random);
    const placedPieces: TerrainPiece[] = [];
    const assignments = pieceSpecs
      .map((pieceSpec, index) => ({
        piece: createPiece(pieceSpec, index, random),
        preferredQuarter: quarterSequence[index]!,
      }))
      .sort(
        (left, right) =>
          left.preferredQuarter - right.preferredQuarter ||
          right.piece.collisionRadius - left.piece.collisionRadius,
      );

    let failedPlacement = false;

    for (const assignment of assignments) {
      const placedPiece = tryPlacePiece(
        assignment.piece,
        assignment.preferredQuarter,
        placedPieces,
        widthInches,
        heightInches,
        deploymentDepthInches,
        collisionBufferInches,
        maxAttemptsPerPiece,
        random,
      );

      if (!placedPiece) {
        failedPlacement = true;
        break;
      }

      placedPieces.push(placedPiece);
    }

    if (!failedPlacement) {
      return {
        widthInches,
        heightInches,
        deploymentDepthInches,
        targetPieceCount,
        quarterTargets,
        pieces: placedPieces,
      };
    }
  }

  throw new Error('Unable to generate a valid terrain layout after repeated placement attempts.');
};

export const analyzeTerrainLayout = (
  layout: TerrainLayout,
  collisionBufferInches = DEFAULT_COLLISION_BUFFER,
): TerrainLayoutAnalysis => {
  const quarterCounts: [number, number, number, number] = [0, 0, 0, 0];
  const shapeCounts: Record<TerrainShapeKind, number> = {
    circle: 0,
    rectangle: 0,
    polygon: 0,
  };
  const templateCounts: Record<string, number> = {};
  const overlaps: Array<[string, string]> = [];
  const deploymentCenterIntrusions: string[] = [];

  layout.pieces.forEach((piece, pieceIndex) => {
    const quarterIndex = getQuarterIndex(piece.x, piece.y, layout.widthInches, layout.heightInches);
    quarterCounts[quarterIndex] += 1;
    shapeCounts[piece.shape.kind] += 1;
    templateCounts[piece.templateId] = (templateCounts[piece.templateId] ?? 0) + 1;

    if (
      collidesWithDeploymentClearance(
        piece,
        piece.x,
        piece.y,
        layout.widthInches,
        layout.heightInches,
        layout.deploymentDepthInches,
        collisionBufferInches,
      )
    ) {
      deploymentCenterIntrusions.push(piece.id);
    }

    for (let otherIndex = pieceIndex + 1; otherIndex < layout.pieces.length; otherIndex += 1) {
      const otherPiece = layout.pieces[otherIndex]!;

      if (piecesOverlap(piece, otherPiece, collisionBufferInches)) {
        overlaps.push([piece.id, otherPiece.id]);
      }
    }
  });

  return {
    quarterCounts,
    shapeCounts,
    templateCounts,
    overlaps,
    deploymentCenterIntrusions,
  };
};

export const getTerrainTraitLabel = (piece: TerrainPiece) => piece.traits.join(' • ');
