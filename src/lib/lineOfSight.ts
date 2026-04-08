import type { TerrainPiece as LayoutTerrainPiece } from '../types/layout';
import type { TerrainPiece as GeneratedTerrainPiece } from '../terrain/types';

export interface SightlinePoint {
  x: number;
  y: number;
}

export interface SightlineSegment {
  start: SightlinePoint;
  end: SightlinePoint;
}

export interface EdgeToEdgeSightlineResult {
  edgeOrientation: 'vertical' | 'horizontal';
  edgePointCount: number;
  totalSightlines: number;
  clearSightlines: SightlineSegment[];
  clearSightlineCount: number;
  allSightlinesBlocked: boolean;
}

type EllipseObstacle = {
  kind: 'ellipse';
  center: SightlinePoint;
  rotation: number;
  radiusX: number;
  radiusY: number;
};

type PolygonObstacle = {
  kind: 'polygon';
  center: SightlinePoint;
  rotation: number;
  points: SightlinePoint[];
};

type LineOfSightObstacle = EllipseObstacle | PolygonObstacle;

const EPSILON = 1e-9;

const degreesToRadians = (degrees: number) => (degrees * Math.PI) / 180;

const rotatePoint = (point: SightlinePoint, radians: number): SightlinePoint => ({
  x: point.x * Math.cos(radians) - point.y * Math.sin(radians),
  y: point.x * Math.sin(radians) + point.y * Math.cos(radians),
});

const toLocalPoint = (point: SightlinePoint, center: SightlinePoint, rotation: number): SightlinePoint =>
  rotatePoint(
    {
      x: point.x - center.x,
      y: point.y - center.y,
    },
    degreesToRadians(-rotation),
  );

const buildEdgePointSamples = (edgeLength: number) => {
  const wholeInches = Math.floor(edgeLength);
  const samples = Array.from({ length: wholeInches + 1 }, (_, index) => index);

  if (Math.abs(samples[samples.length - 1]! - edgeLength) > EPSILON) {
    samples.push(edgeLength);
  }

  return samples;
};

const crossProduct = (start: SightlinePoint, end: SightlinePoint, point: SightlinePoint) =>
  (end.x - start.x) * (point.y - start.y) - (end.y - start.y) * (point.x - start.x);

const pointOnSegment = (point: SightlinePoint, start: SightlinePoint, end: SightlinePoint) =>
  Math.abs(crossProduct(start, end, point)) <= EPSILON &&
  point.x >= Math.min(start.x, end.x) - EPSILON &&
  point.x <= Math.max(start.x, end.x) + EPSILON &&
  point.y >= Math.min(start.y, end.y) - EPSILON &&
  point.y <= Math.max(start.y, end.y) + EPSILON;

const orientation = (start: SightlinePoint, end: SightlinePoint, point: SightlinePoint) => {
  const cross = crossProduct(start, end, point);

  if (Math.abs(cross) <= EPSILON) {
    return 0;
  }

  return cross > 0 ? 1 : -1;
};

const segmentsIntersect = (
  firstStart: SightlinePoint,
  firstEnd: SightlinePoint,
  secondStart: SightlinePoint,
  secondEnd: SightlinePoint,
) => {
  const firstOrientation = orientation(firstStart, firstEnd, secondStart);
  const secondOrientation = orientation(firstStart, firstEnd, secondEnd);
  const thirdOrientation = orientation(secondStart, secondEnd, firstStart);
  const fourthOrientation = orientation(secondStart, secondEnd, firstEnd);

  if (firstOrientation === 0 && pointOnSegment(secondStart, firstStart, firstEnd)) {
    return true;
  }

  if (secondOrientation === 0 && pointOnSegment(secondEnd, firstStart, firstEnd)) {
    return true;
  }

  if (thirdOrientation === 0 && pointOnSegment(firstStart, secondStart, secondEnd)) {
    return true;
  }

  if (fourthOrientation === 0 && pointOnSegment(firstEnd, secondStart, secondEnd)) {
    return true;
  }

  return firstOrientation !== secondOrientation && thirdOrientation !== fourthOrientation;
};

const pointInPolygon = (point: SightlinePoint, polygon: readonly SightlinePoint[]) => {
  if (polygon.length < 3) {
    return false;
  }

  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index]!;
    const next = polygon[(index + 1) % polygon.length]!;

    if (pointOnSegment(point, current, next)) {
      return true;
    }
  }

  let inside = false;

  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index]!;
    const next = polygon[(index + 1) % polygon.length]!;
    const spansY = (current.y > point.y) !== (next.y > point.y);

    if (!spansY) {
      continue;
    }

    const intersectionX = ((next.x - current.x) * (point.y - current.y)) / (next.y - current.y) + current.x;

    if (point.x < intersectionX) {
      inside = !inside;
    }
  }

  return inside;
};

const pointInEllipse = (point: SightlinePoint, radiusX: number, radiusY: number) => {
  if (radiusX <= 0 || radiusY <= 0) {
    return false;
  }

  const normalizedDistance = (point.x * point.x) / (radiusX * radiusX) + (point.y * point.y) / (radiusY * radiusY);
  return normalizedDistance <= 1 + EPSILON;
};

const segmentIntersectsEllipse = (segment: SightlineSegment, radiusX: number, radiusY: number) => {
  if (pointInEllipse(segment.start, radiusX, radiusY) || pointInEllipse(segment.end, radiusX, radiusY)) {
    return true;
  }

  const deltaX = segment.end.x - segment.start.x;
  const deltaY = segment.end.y - segment.start.y;
  const a = (deltaX * deltaX) / (radiusX * radiusX) + (deltaY * deltaY) / (radiusY * radiusY);

  if (Math.abs(a) <= EPSILON) {
    return false;
  }

  const b =
    (2 * segment.start.x * deltaX) / (radiusX * radiusX) +
    (2 * segment.start.y * deltaY) / (radiusY * radiusY);
  const c =
    (segment.start.x * segment.start.x) / (radiusX * radiusX) +
    (segment.start.y * segment.start.y) / (radiusY * radiusY) -
    1;
  const discriminant = b * b - 4 * a * c;

  if (discriminant < -EPSILON) {
    return false;
  }

  const root = Math.sqrt(Math.max(0, discriminant));
  const nearT = (-b - root) / (2 * a);
  const farT = (-b + root) / (2 * a);

  return nearT <= 1 + EPSILON && farT >= -EPSILON;
};

const segmentIntersectsPolygon = (segment: SightlineSegment, polygon: readonly SightlinePoint[]) => {
  if (polygon.length < 3) {
    return false;
  }

  if (pointInPolygon(segment.start, polygon) || pointInPolygon(segment.end, polygon)) {
    return true;
  }

  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index]!;
    const next = polygon[(index + 1) % polygon.length]!;

    if (segmentsIntersect(segment.start, segment.end, current, next)) {
      return true;
    }
  }

  return false;
};

const lineIntersectsObstacle = (segment: SightlineSegment, obstacle: LineOfSightObstacle) => {
  const localSegment: SightlineSegment = {
    start: toLocalPoint(segment.start, obstacle.center, obstacle.rotation),
    end: toLocalPoint(segment.end, obstacle.center, obstacle.rotation),
  };

  if (obstacle.kind === 'ellipse') {
    return segmentIntersectsEllipse(localSegment, obstacle.radiusX, obstacle.radiusY);
  }

  return segmentIntersectsPolygon(localSegment, obstacle.points);
};

const buildRectanglePoints = (width: number, height: number): SightlinePoint[] => [
  { x: -width / 2, y: -height / 2 },
  { x: width / 2, y: -height / 2 },
  { x: width / 2, y: height / 2 },
  { x: -width / 2, y: height / 2 },
];

const buildDiamondPoints = (width: number, height: number): SightlinePoint[] => [
  { x: 0, y: -height / 2 },
  { x: width / 2, y: 0 },
  { x: 0, y: height / 2 },
  { x: -width / 2, y: 0 },
];

const layoutPieceToObstacle = (piece: LayoutTerrainPiece): LineOfSightObstacle => {
  const center = { x: piece.x, y: piece.y };

  if (piece.shape === 'ellipse') {
    return {
      kind: 'ellipse',
      center,
      rotation: piece.rotation,
      radiusX: piece.width / 2,
      radiusY: piece.height / 2,
    };
  }

  return {
    kind: 'polygon',
    center,
    rotation: piece.rotation,
    points: piece.shape === 'diamond' ? buildDiamondPoints(piece.width, piece.height) : buildRectanglePoints(piece.width, piece.height),
  };
};

const terrainPieceToObstacle = (piece: GeneratedTerrainPiece): LineOfSightObstacle => {
  const center = { x: piece.x, y: piece.y };

  switch (piece.shape.kind) {
    case 'circle':
      return {
        kind: 'ellipse',
        center,
        rotation: piece.rotation,
        radiusX: piece.shape.radius,
        radiusY: piece.shape.radius,
      };
    case 'rectangle':
      return {
        kind: 'polygon',
        center,
        rotation: piece.rotation,
        points: buildRectanglePoints(piece.shape.width, piece.shape.height),
      };
    case 'polygon':
    default:
      return {
        kind: 'polygon',
        center,
        rotation: piece.rotation,
        points: piece.shape.points.map((point) => ({ x: point.x, y: point.y })),
      };
  }
};

const analyzeEdgeToEdgeSightlines = (
  obstacles: readonly LineOfSightObstacle[],
  tableWidthInches: number,
  tableHeightInches: number,
): EdgeToEdgeSightlineResult => {
  const edgeOrientation = tableHeightInches >= tableWidthInches ? 'vertical' : 'horizontal';
  const edgePointCount = buildEdgePointSamples(
    edgeOrientation === 'vertical' ? tableHeightInches : tableWidthInches,
  );
  const clearSightlines: SightlineSegment[] = [];

  for (const startCoordinate of edgePointCount) {
    for (const endCoordinate of edgePointCount) {
      const sightline: SightlineSegment =
        edgeOrientation === 'vertical'
          ? {
              start: { x: 0, y: startCoordinate },
              end: { x: tableWidthInches, y: endCoordinate },
            }
          : {
              start: { x: startCoordinate, y: 0 },
              end: { x: endCoordinate, y: tableHeightInches },
            };

      const blocked = obstacles.some((obstacle) => lineIntersectsObstacle(sightline, obstacle));

      if (!blocked) {
        clearSightlines.push(sightline);
      }
    }
  }

  return {
    edgeOrientation,
    edgePointCount: edgePointCount.length,
    totalSightlines: edgePointCount.length * edgePointCount.length,
    clearSightlines,
    clearSightlineCount: clearSightlines.length,
    allSightlinesBlocked: clearSightlines.length === 0,
  };
};

export const lineIntersectsLayoutPiece = (segment: SightlineSegment, piece: LayoutTerrainPiece) =>
  lineIntersectsObstacle(segment, layoutPieceToObstacle(piece));

export const lineIntersectsTerrainPiece = (segment: SightlineSegment, piece: GeneratedTerrainPiece) =>
  lineIntersectsObstacle(segment, terrainPieceToObstacle(piece));

export const findClearEdgeToEdgeSightlinesForLayout = (
  pieces: readonly LayoutTerrainPiece[],
  tableWidthInches: number,
  tableHeightInches: number,
) => analyzeEdgeToEdgeSightlines(pieces.map(layoutPieceToObstacle), tableWidthInches, tableHeightInches);

export const hasClearEdgeToEdgeSightlineForLayout = (
  pieces: readonly LayoutTerrainPiece[],
  tableWidthInches: number,
  tableHeightInches: number,
) => findClearEdgeToEdgeSightlinesForLayout(pieces, tableWidthInches, tableHeightInches).clearSightlineCount > 0;

export const findClearEdgeToEdgeSightlinesForTerrain = (
  pieces: readonly GeneratedTerrainPiece[],
  tableWidthInches: number,
  tableHeightInches: number,
) => analyzeEdgeToEdgeSightlines(pieces.map(terrainPieceToObstacle), tableWidthInches, tableHeightInches);

export const hasClearEdgeToEdgeSightlineForTerrain = (
  pieces: readonly GeneratedTerrainPiece[],
  tableWidthInches: number,
  tableHeightInches: number,
) => findClearEdgeToEdgeSightlinesForTerrain(pieces, tableWidthInches, tableHeightInches).clearSightlineCount > 0;
