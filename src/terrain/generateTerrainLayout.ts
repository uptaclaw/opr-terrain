import {
  DEFAULT_DEPLOYMENT_DEPTH_INCHES,
  DEFAULT_TABLE_HEIGHT_INCHES,
  DEFAULT_TABLE_WIDTH_INCHES,
  getDeploymentOrientation,
} from '../table/tableGeometry';
import {
  getTemplateById,
  mandatoryTerrainSelections,
  pickShapeKind,
  pickWeightedTemplate,
  randomRotation,
} from './catalog';
import type {
  GenerateTerrainLayoutOptions,
  PlacementConfig,
  TerrainLayout,
  TerrainLayoutAnalysis,
  TerrainPiece,
  TerrainPoint,
  TerrainShape,
  TerrainShapeKind,
} from './types';
import {
  getClusterCenter,
  getLaneCenter,
  getMirroredPosition,
  getPlacementDensityMultiplier,
  getQuarterIndex as getQuarterIndexUtil,
} from './placementStrategies';
import { buildOPRTerrainSelection, validateOPRLayout } from './oprPlacement';
import { generateOPRCompliantLayout } from './zonePlacement';

const DEFAULT_WIDTH = DEFAULT_TABLE_WIDTH_INCHES;
const DEFAULT_HEIGHT = DEFAULT_TABLE_HEIGHT_INCHES;
const DEFAULT_DEPLOYMENT_DEPTH = DEFAULT_DEPLOYMENT_DEPTH_INCHES;
const DEFAULT_MIN_PIECES = 10;
const DEFAULT_MAX_PIECES = 15;
const DEFAULT_COLLISION_BUFFER = 3.0; // OPR guideline: 3" minimum gap
const DEFAULT_MAX_ATTEMPTS_PER_PIECE = 360;
const DEFAULT_MAX_LAYOUT_ATTEMPTS = 100;
const DEPLOYMENT_CENTER_CLEARANCE = 4.5;
const QUARTER_BOUNDARY_EPSILON = 0.01;

type QuarterIndex = 0 | 1 | 2 | 3;
type SymmetryAxis = 'vertical' | 'horizontal';
type MirroredPlacementStrategy = 'symmetrical' | 'balanced-coverage';

interface PositionedPieceSpec {
  templateId: string;
  shapeKind: TerrainShapeKind;
}

interface PlacementBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface PlacementAssignment {
  piece: TerrainPiece;
  preferredQuarter: QuarterIndex | null;
  index: number;
}

interface AsymmetricContext {
  denseSide: 'left' | 'right';
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

const createDefaultRandom = () => {
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const buffer = new Uint32Array(1);

    return () => {
      globalThis.crypto.getRandomValues(buffer);
      return buffer[0]! / 0x1_0000_0000;
    };
  }

  let state = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;

  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
};

const normalizeRotation = (rotation: number) => ((rotation % 360) + 360) % 360;

const getMirroredRotation = (rotation: number, axis: SymmetryAxis) =>
  axis === 'vertical' ? normalizeRotation(180 - rotation) : normalizeRotation(-rotation);

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

const getQuarterIndex = getQuarterIndexUtil;

const getQuarterCounts = (
  pieces: readonly TerrainPiece[],
  widthInches: number,
  heightInches: number,
): [number, number, number, number] => {
  const counts: [number, number, number, number] = [0, 0, 0, 0];

  pieces.forEach((piece) => {
    const quarterIndex = getQuarterIndex(piece.x, piece.y, widthInches, heightInches);
    counts[quarterIndex] += 1;
  });

  return counts;
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

const buildPieceSpecs = (pieceCount: number, random: () => number, useOPRGuidelines = true): PositionedPieceSpec[] => {
  if (useOPRGuidelines) {
    // Use OPR-compliant selection that ensures trait distribution
    return buildOPRTerrainSelection(pieceCount, random);
  }
  
  // Legacy behavior
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

const applyCoverPriority = (pieceSpecs: PositionedPieceSpec[]) => {
  pieceSpecs.sort((left, right) => {
    const templateA = getTemplateById(left.templateId);
    const templateB = getTemplateById(right.templateId);
    const aPriority = templateA.traits.some(
      (trait) => trait === 'Soft Cover' || trait === 'Hard Cover' || trait === 'LoS Blocking',
    )
      ? 1
      : 0;
    const bPriority = templateB.traits.some(
      (trait) => trait === 'Soft Cover' || trait === 'Hard Cover' || trait === 'LoS Blocking',
    )
      ? 1
      : 0;

    return bPriority - aPriority;
  });
};

export const createPiece = (
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

const getSourceHalfBounds = (
  axis: SymmetryAxis,
  widthInches: number,
  heightInches: number,
  placementRadius: number,
): PlacementBounds =>
  axis === 'vertical'
    ? {
        minX: placementRadius,
        maxX: Math.min(widthInches / 2 - QUARTER_BOUNDARY_EPSILON, widthInches - placementRadius),
        minY: placementRadius,
        maxY: heightInches - placementRadius,
      }
    : {
        minX: placementRadius,
        maxX: widthInches - placementRadius,
        minY: placementRadius,
        maxY: Math.min(heightInches / 2 - QUARTER_BOUNDARY_EPSILON, heightInches - placementRadius),
      };

const getSourceQuarterIndices = (axis: SymmetryAxis): readonly [QuarterIndex, QuarterIndex] =>
  axis === 'vertical' ? [0, 2] : [0, 1];

const getMirroredQuarterIndex = (quarterIndex: QuarterIndex, axis: SymmetryAxis): QuarterIndex =>
  axis === 'vertical'
    ? ((quarterIndex % 2 === 0 ? quarterIndex + 1 : quarterIndex - 1) as QuarterIndex)
    : ((quarterIndex < 2 ? quarterIndex + 2 : quarterIndex - 2) as QuarterIndex);

const buildMirroredQuarterTargets = (
  pairCount: number,
  axis: SymmetryAxis,
  random: () => number,
): [number, number, number, number] => {
  const sourceQuarters = getSourceQuarterIndices(axis);
  const sourceTargets = new Map<QuarterIndex, number>(
    sourceQuarters.map((quarterIndex) => [quarterIndex, Math.floor(pairCount / sourceQuarters.length)]),
  );
  const remainder = pairCount % sourceQuarters.length;
  const remainderOrder = shuffle([...sourceQuarters], random);

  for (let index = 0; index < remainder; index += 1) {
    const quarterIndex = remainderOrder[index]!;
    sourceTargets.set(quarterIndex, (sourceTargets.get(quarterIndex) ?? 0) + 1);
  }

  const targets: [number, number, number, number] = [0, 0, 0, 0];

  sourceQuarters.forEach((quarterIndex) => {
    const count = sourceTargets.get(quarterIndex) ?? 0;
    targets[quarterIndex] = count;
    targets[getMirroredQuarterIndex(quarterIndex, axis)] = count;
  });

  return targets;
};

const buildMirroredSourceQuarterSequence = (
  quarterTargets: [number, number, number, number],
  axis: SymmetryAxis,
  random: () => number,
): QuarterIndex[] => {
  const quarterSlots: QuarterIndex[] = [];

  getSourceQuarterIndices(axis).forEach((quarterIndex) => {
    for (let count = 0; count < quarterTargets[quarterIndex]; count += 1) {
      quarterSlots.push(quarterIndex);
    }
  });

  return shuffle(quarterSlots, random);
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
  clearanceMultiplier = 1,
) => {
  const placementRadius = getPlacementRadius(piece, collisionBufferInches);
  const requiredDistance = DEPLOYMENT_CENTER_CLEARANCE * clearanceMultiplier + Math.min(placementRadius, 4.5);

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
  placementConfig?: PlacementConfig,
) => {
  if (isOutsideTable(candidate, x, y, widthInches, heightInches, collisionBufferInches)) {
    return false;
  }

  const deploymentClearanceMultiplier = placementConfig?.deploymentZoneSafety === false ? 0.5 : 1;

  if (
    collidesWithDeploymentClearance(
      candidate,
      x,
      y,
      widthInches,
      heightInches,
      deploymentDepthInches,
      collisionBufferInches,
      deploymentClearanceMultiplier,
    )
  ) {
    return false;
  }

  return !placedPieces.some((piece) => piecesOverlap({ ...candidate, x, y }, piece, collisionBufferInches));
};

const tryPlacePieceWithinBounds = (
  piece: TerrainPiece,
  bounds: PlacementBounds,
  placedPieces: readonly TerrainPiece[],
  widthInches: number,
  heightInches: number,
  deploymentDepthInches: number,
  collisionBufferInches: number,
  maxAttemptsPerPiece: number,
  random: () => number,
  placementConfig?: PlacementConfig,
): TerrainPiece | null => {
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
        placementConfig,
      )
    ) {
      return { ...piece, x, y };
    }
  }

  return null;
};

const tryPlacePieceWithinQuarter = (
  piece: TerrainPiece,
  preferredQuarter: QuarterIndex,
  placedPieces: readonly TerrainPiece[],
  widthInches: number,
  heightInches: number,
  deploymentDepthInches: number,
  collisionBufferInches: number,
  maxAttemptsPerPiece: number,
  random: () => number,
  placementConfig?: PlacementConfig,
): TerrainPiece | null => {
  const placementRadius = getPlacementRadius(piece, collisionBufferInches);
  const bounds = getQuarterBounds(preferredQuarter, widthInches, heightInches, placementRadius);

  return tryPlacePieceWithinBounds(
    piece,
    bounds,
    placedPieces,
    widthInches,
    heightInches,
    deploymentDepthInches,
    collisionBufferInches,
    maxAttemptsPerPiece,
    random,
    placementConfig,
  );
};

const getMirroredShape = (shape: TerrainShape, axis: SymmetryAxis): TerrainShape => {
  if (shape.kind === 'circle') {
    return { ...shape };
  }

  if (shape.kind === 'rectangle') {
    return { ...shape };
  }

  return {
    kind: 'polygon',
    points: shape.points.map((point) =>
      axis === 'vertical' ? { x: -point.x, y: point.y } : { x: point.x, y: -point.y },
    ),
  };
};

const createMirroredPiece = (
  sourcePiece: TerrainPiece,
  widthInches: number,
  heightInches: number,
  axis: SymmetryAxis,
): TerrainPiece => {
  const mirroredPosition = getMirroredPosition(sourcePiece.x, sourcePiece.y, widthInches, heightInches, axis);

  return {
    ...sourcePiece,
    id: `${sourcePiece.id}-mirror`,
    x: mirroredPosition.x,
    y: mirroredPosition.y,
    rotation: sourcePiece.shape.kind === 'circle' ? 0 : getMirroredRotation(sourcePiece.rotation, axis),
    shape: getMirroredShape(sourcePiece.shape, axis),
  };
};

const getSymmetryAxis = (widthInches: number, heightInches: number): SymmetryAxis =>
  getDeploymentOrientation(widthInches, heightInches) === 'vertical' ? 'vertical' : 'horizontal';

const getSymmetricShapeKind = (selection: PositionedPieceSpec): TerrainShapeKind => {
  const template = getTemplateById(selection.templateId);

  if (template.shapeKinds.includes('circle')) {
    return 'circle';
  }

  if (template.shapeKinds.includes('rectangle')) {
    return 'rectangle';
  }

  return selection.shapeKind;
};

const tryPlaceCenterPiece = (
  piece: TerrainPiece,
  axis: SymmetryAxis,
  placedPieces: readonly TerrainPiece[],
  widthInches: number,
  heightInches: number,
  deploymentDepthInches: number,
  collisionBufferInches: number,
  maxAttemptsPerPiece: number,
  random: () => number,
  placementConfig?: PlacementConfig,
): TerrainPiece | null => {
  if (piece.shape.kind === 'polygon') {
    return null;
  }

  const centeredPiece = {
    ...piece,
    rotation: 0,
  };
  const placementRadius = getPlacementRadius(centeredPiece, collisionBufferInches);

  for (let attempt = 0; attempt < maxAttemptsPerPiece; attempt += 1) {
    const x = axis === 'vertical' ? widthInches / 2 : randomBetween(placementRadius, widthInches - placementRadius, random);
    const y = axis === 'horizontal' ? heightInches / 2 : randomBetween(placementRadius, heightInches - placementRadius, random);

    if (
      isPlacementValid(
        centeredPiece,
        x,
        y,
        placedPieces,
        widthInches,
        heightInches,
        deploymentDepthInches,
        collisionBufferInches,
        placementConfig,
      )
    ) {
      return { ...centeredPiece, x, y };
    }
  }

  return null;
};

const generateMirroredLayoutAttempt = (
  strategy: MirroredPlacementStrategy,
  targetPieceCount: number,
  widthInches: number,
  heightInches: number,
  deploymentDepthInches: number,
  collisionBufferInches: number,
  maxAttemptsPerPiece: number,
  random: () => number,
  placementConfig?: PlacementConfig,
) => {
  const axis = getSymmetryAxis(widthInches, heightInches);
  const pairCount = Math.floor(targetPieceCount / 2);
  const hasCenterPiece = targetPieceCount % 2 === 1;
  const sourceSpecCount = pairCount + (hasCenterPiece ? 1 : 0);
  const pieceSpecs = buildPieceSpecs(sourceSpecCount, random);

  if (placementConfig?.prioritizeCover) {
    applyCoverPriority(pieceSpecs);
  }

  const centerSelection = hasCenterPiece
    ? {
        ...pieceSpecs[pieceSpecs.length - 1]!,
        shapeKind: getSymmetricShapeKind(pieceSpecs[pieceSpecs.length - 1]!),
      }
    : null;
  const pairSelections = hasCenterPiece ? pieceSpecs.slice(0, -1) : pieceSpecs;
  const sourcePieces = pairSelections.map((selection, index) => createPiece(selection, index, random));
  const centerPiece = centerSelection ? createPiece(centerSelection, sourcePieces.length, random) : null;
  const sourceHalfBounds = getSourceHalfBounds(axis, widthInches, heightInches, 0);
  const quarterTargets =
    strategy === 'balanced-coverage'
      ? buildMirroredQuarterTargets(pairCount, axis, random)
      : ([0, 0, 0, 0] as [number, number, number, number]);
  const sourceQuarterSequence =
    strategy === 'balanced-coverage' ? buildMirroredSourceQuarterSequence(quarterTargets, axis, random) : [];
  const sourceAssignments: PlacementAssignment[] = sourcePieces.map((piece, index) => ({
    piece,
    preferredQuarter: strategy === 'balanced-coverage' ? sourceQuarterSequence[index] ?? null : null,
    index,
  }));

  sourceAssignments.sort((left, right) => {
    if (left.preferredQuarter !== null && right.preferredQuarter !== null) {
      return left.preferredQuarter - right.preferredQuarter || right.piece.collisionRadius - left.piece.collisionRadius;
    }

    return right.piece.collisionRadius - left.piece.collisionRadius;
  });

  const placedSourceById = new Map<string, TerrainPiece>();

  for (const assignment of sourceAssignments) {
    const placedSource =
      assignment.preferredQuarter !== null
        ? tryPlacePieceWithinQuarter(
            assignment.piece,
            assignment.preferredQuarter,
            [...placedSourceById.values()],
            widthInches,
            heightInches,
            deploymentDepthInches,
            collisionBufferInches,
            maxAttemptsPerPiece,
            random,
            placementConfig,
          )
        : tryPlacePieceWithinBounds(
            assignment.piece,
            {
              ...sourceHalfBounds,
              minX: Math.max(sourceHalfBounds.minX, getPlacementRadius(assignment.piece, collisionBufferInches)),
              maxX: Math.min(sourceHalfBounds.maxX, widthInches - getPlacementRadius(assignment.piece, collisionBufferInches)),
              minY: Math.max(sourceHalfBounds.minY, getPlacementRadius(assignment.piece, collisionBufferInches)),
              maxY: Math.min(sourceHalfBounds.maxY, heightInches - getPlacementRadius(assignment.piece, collisionBufferInches)),
            },
            [...placedSourceById.values()],
            widthInches,
            heightInches,
            deploymentDepthInches,
            collisionBufferInches,
            maxAttemptsPerPiece,
            random,
            placementConfig,
          );

    if (!placedSource) {
      return null;
    }

    placedSourceById.set(placedSource.id, placedSource);
  }

  const placedPieces: TerrainPiece[] = [...placedSourceById.values()];
  const orderedPieces: TerrainPiece[] = [];

  for (const sourcePiece of sourcePieces) {
    const placedSourcePiece = placedSourceById.get(sourcePiece.id);

    if (!placedSourcePiece) {
      return null;
    }

    const mirroredPiece = createMirroredPiece(placedSourcePiece, widthInches, heightInches, axis);

    if (
      !isPlacementValid(
        mirroredPiece,
        mirroredPiece.x,
        mirroredPiece.y,
        placedPieces,
        widthInches,
        heightInches,
        deploymentDepthInches,
        collisionBufferInches,
        placementConfig,
      )
    ) {
      return null;
    }

    placedPieces.push(mirroredPiece);
    orderedPieces.push(placedSourcePiece, mirroredPiece);
  }

  if (centerPiece) {
    const placedCenterPiece = tryPlaceCenterPiece(
      centerPiece,
      axis,
      placedPieces,
      widthInches,
      heightInches,
      deploymentDepthInches,
      collisionBufferInches,
      maxAttemptsPerPiece,
      random,
      placementConfig,
    );

    if (!placedCenterPiece) {
      return null;
    }

    placedPieces.push(placedCenterPiece);
    orderedPieces.push(placedCenterPiece);
  }

  return {
    quarterTargets: getQuarterCounts(orderedPieces, widthInches, heightInches),
    pieces: orderedPieces,
  };
};

const tryPlacePiece = (
  piece: TerrainPiece,
  preferredQuarter: QuarterIndex | null,
  placedPieces: readonly TerrainPiece[],
  widthInches: number,
  heightInches: number,
  deploymentDepthInches: number,
  collisionBufferInches: number,
  maxAttemptsPerPiece: number,
  random: () => number,
  placementConfig?: PlacementConfig,
  pieceIndex?: number,
  totalPieces?: number,
  asymmetricContext?: AsymmetricContext,
): TerrainPiece | null => {
  const placementRadius = getPlacementRadius(piece, collisionBufferInches);
  const strategy = placementConfig?.strategy || 'random';

  if (strategy === 'clustered-zones' && pieceIndex !== undefined && totalPieces !== undefined) {
    const clusterCount = totalPieces > 12 ? 4 : 3;
    const clusterIndex = Math.floor((pieceIndex / totalPieces) * clusterCount);
    const clusterCenter = getClusterCenter(clusterIndex, clusterCount, widthInches, heightInches, random);
    const clusterRadius = Math.min(widthInches, heightInches) * 0.15;

    for (let attempt = 0; attempt < maxAttemptsPerPiece; attempt += 1) {
      const angle = random() * Math.PI * 2;
      const distance = random() * clusterRadius;
      const x = clusterCenter.x + Math.cos(angle) * distance;
      const y = clusterCenter.y + Math.sin(angle) * distance;

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
          placementConfig,
        )
      ) {
        return { ...piece, x, y };
      }
    }

    return null;
  }

  if (strategy === 'los-blocking-lanes' && pieceIndex !== undefined) {
    const laneCount = 3;
    const laneIndex = pieceIndex % laneCount;
    const laneCenter = getLaneCenter(laneIndex, laneCount, widthInches, heightInches);
    const laneWidth = Math.min(widthInches, heightInches) * 0.25;

    for (let attempt = 0; attempt < maxAttemptsPerPiece; attempt += 1) {
      const isVerticalTable = widthInches < heightInches;
      const alongLaneOffset =
        random() * (isVerticalTable ? heightInches : widthInches) * 0.6 -
        (isVerticalTable ? heightInches : widthInches) * 0.3;
      const acrossLaneOffset = (random() - 0.5) * laneWidth;
      const x = isVerticalTable ? laneCenter.x + acrossLaneOffset : laneCenter.x + alongLaneOffset;
      const y = isVerticalTable ? laneCenter.y + alongLaneOffset : laneCenter.y + acrossLaneOffset;

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
          placementConfig,
        )
      ) {
        return { ...piece, x, y };
      }
    }

    return null;
  }

  if (strategy === 'asymmetric' && pieceIndex !== undefined && totalPieces !== undefined && asymmetricContext) {
    const isDensePiece = pieceIndex < Math.floor(totalPieces * 0.66);

    let boundsMinX: number;
    let boundsMaxX: number;

    if (isDensePiece) {
      if (asymmetricContext.denseSide === 'left') {
        boundsMinX = placementRadius;
        boundsMaxX = widthInches * 0.55;
      } else {
        boundsMinX = widthInches * 0.45;
        boundsMaxX = widthInches - placementRadius;
      }
    } else if (asymmetricContext.denseSide === 'left') {
      boundsMinX = widthInches * 0.6;
      boundsMaxX = widthInches - placementRadius;
    } else {
      boundsMinX = placementRadius;
      boundsMaxX = widthInches * 0.4;
    }

    return tryPlacePieceWithinBounds(
      piece,
      {
        minX: boundsMinX,
        maxX: boundsMaxX,
        minY: placementRadius,
        maxY: heightInches - placementRadius,
      },
      placedPieces,
      widthInches,
      heightInches,
      deploymentDepthInches,
      collisionBufferInches,
      maxAttemptsPerPiece,
      random,
      placementConfig,
    );
  }

  if (strategy === 'random') {
    return tryPlacePieceWithinBounds(
      piece,
      {
        minX: placementRadius,
        maxX: widthInches - placementRadius,
        minY: placementRadius,
        maxY: heightInches - placementRadius,
      },
      placedPieces,
      widthInches,
      heightInches,
      deploymentDepthInches,
      collisionBufferInches,
      maxAttemptsPerPiece,
      random,
      placementConfig,
    );
  }

  if (preferredQuarter === null) {
    return null;
  }

  return tryPlacePieceWithinQuarter(
    piece,
    preferredQuarter,
    placedPieces,
    widthInches,
    heightInches,
    deploymentDepthInches,
    collisionBufferInches,
    maxAttemptsPerPiece,
    random,
    placementConfig,
  );
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
    placementConfig,
  } = options;

  const random = options.random ?? createDefaultRandom();
  const densityMultiplier = getPlacementDensityMultiplier(placementConfig?.density || 'balanced');
  let targetPieceCount = pieceCount ?? randomInteger(minPieces, maxPieces, random);
  targetPieceCount = Math.round(targetPieceCount * densityMultiplier);
  targetPieceCount = Math.max(1, Math.min(20, targetPieceCount));

  if (targetPieceCount < 1) {
    throw new Error('Terrain layout must request at least one piece.');
  }

  if (targetPieceCount > 20) {
    throw new Error('Terrain layout generator supports up to 20 pieces while keeping quarter balance.');
  }

  // Try zone-based OPR-compliant placement first
  const pieceSpecs = buildPieceSpecs(targetPieceCount, random);
  const zoneResult = generateOPRCompliantLayout(
    pieceSpecs,
    widthInches,
    heightInches,
    deploymentDepthInches,
    collisionBufferInches,
    random,
    maxLayoutAttempts,
  );

  if (zoneResult && zoneResult.success) {
    // Zone placement succeeded and is OPR-compliant
    return {
      widthInches,
      heightInches,
      deploymentDepthInches,
      targetPieceCount,
      quarterTargets: [0, 0, 0, 0] as [number, number, number, number],
      pieces: zoneResult.pieces,
      placementConfig,
      oprValidation: zoneResult.oprValidation,
    };
  }

  // Fallback to original placement strategies if zone placement fails
  for (let layoutAttempt = 0; layoutAttempt < maxLayoutAttempts; layoutAttempt += 1) {
    const strategy = placementConfig?.strategy || 'random';
    const useMirroredPlacement =
      strategy === 'symmetrical' || (strategy === 'balanced-coverage' && placementConfig?.forceSymmetry);

    if (useMirroredPlacement) {
      const mirroredLayout = generateMirroredLayoutAttempt(
        strategy === 'symmetrical' ? 'symmetrical' : 'balanced-coverage',
        targetPieceCount,
        widthInches,
        heightInches,
        deploymentDepthInches,
        collisionBufferInches,
        maxAttemptsPerPiece,
        random,
        placementConfig,
      );

      if (mirroredLayout) {
        const oprValidation = validateOPRLayout(
          mirroredLayout.pieces,
          widthInches,
          heightInches
        );
        return {
          widthInches,
          heightInches,
          deploymentDepthInches,
          targetPieceCount,
          quarterTargets: mirroredLayout.quarterTargets,
          pieces: mirroredLayout.pieces,
          placementConfig,
          oprValidation,
        };
      }

      continue;
    }

    const useQuarterPlacement = strategy === 'balanced-coverage';
    const quarterTargets = useQuarterPlacement
      ? buildQuarterTargets(targetPieceCount, random)
      : ([0, 0, 0, 0] as [number, number, number, number]);
    const quarterSequence = useQuarterPlacement ? buildQuarterSequence(quarterTargets, random) : [];
    const fallbackPieceSpecs = buildPieceSpecs(targetPieceCount, random);

    if (placementConfig?.prioritizeCover) {
      applyCoverPriority(fallbackPieceSpecs);
    }

    const assignments = fallbackPieceSpecs
      .map((pieceSpec, index) => ({
        piece: createPiece(pieceSpec, index, random),
        preferredQuarter: useQuarterPlacement ? (quarterSequence[index] ?? 0) : null,
        index,
      }))
      .sort((left, right) => {
        if (left.preferredQuarter !== null && right.preferredQuarter !== null) {
          return left.preferredQuarter - right.preferredQuarter || right.piece.collisionRadius - left.piece.collisionRadius;
        }

        return right.piece.collisionRadius - left.piece.collisionRadius;
      });

    const asymmetricContext: AsymmetricContext | undefined =
      strategy === 'asymmetric' ? { denseSide: random() > 0.5 ? 'left' : 'right' } : undefined;
    const placedPieces: TerrainPiece[] = [];
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
        placementConfig,
        assignment.index,
        targetPieceCount,
        asymmetricContext,
      );

      if (!placedPiece) {
        failedPlacement = true;
        break;
      }

      placedPieces.push(placedPiece);
    }

    if (!failedPlacement) {
      const oprValidation = validateOPRLayout(
        placedPieces,
        widthInches,
        heightInches
      );
      return {
        widthInches,
        heightInches,
        deploymentDepthInches,
        targetPieceCount,
        quarterTargets,
        pieces: placedPieces,
        placementConfig,
        oprValidation,
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
