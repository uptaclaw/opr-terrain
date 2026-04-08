import type { TerrainPiece, TerrainPoint, TerrainShape } from './types';

const EPSILON = 1e-6;
const DEFAULT_CIRCLE_SEGMENTS = 32;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const rotatePoint = (point: TerrainPoint, degrees: number): TerrainPoint => {
  if (Math.abs(degrees) < EPSILON) {
    return point;
  }

  const radians = toRadians(degrees);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  };
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

const getPolygonArea = (points: readonly TerrainPoint[]) => {
  if (points.length < 3) {
    return 0;
  }

  let area = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]!;
    const next = points[(index + 1) % points.length]!;
    area += current.x * next.y - next.x * current.y;
  }

  return Math.abs(area) / 2;
};

export const getShapeArea = (shape: TerrainShape): number => {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius * shape.radius;
    case 'rectangle':
      return shape.width * shape.height;
    case 'polygon':
      return getPolygonArea(shape.points);
  }
};

const buildCirclePolygon = (radius: number, segments = DEFAULT_CIRCLE_SEGMENTS): TerrainPoint[] =>
  Array.from({ length: segments }, (_, index) => {
    const angle = (Math.PI * 2 * index) / segments;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  });

const buildRectanglePolygon = (width: number, height: number): TerrainPoint[] => [
  { x: -width / 2, y: -height / 2 },
  { x: width / 2, y: -height / 2 },
  { x: width / 2, y: height / 2 },
  { x: -width / 2, y: height / 2 },
];

const getLocalShapePolygon = (shape: TerrainShape): TerrainPoint[] => {
  switch (shape.kind) {
    case 'circle':
      return buildCirclePolygon(shape.radius);
    case 'rectangle':
      return buildRectanglePolygon(shape.width, shape.height);
    case 'polygon':
      return [...shape.points];
  }
};

export const getPiecePolygon = (piece: TerrainPiece): TerrainPoint[] =>
  getLocalShapePolygon(piece.shape).map((point) => {
    const rotated = rotatePoint(point, piece.rotation);
    return {
      x: rotated.x + piece.x,
      y: rotated.y + piece.y,
    };
  });

const pointInPolygon = (point: TerrainPoint, polygon: readonly TerrainPoint[]) => {
  let inside = false;

  for (
    let index = 0, previousIndex = polygon.length - 1;
    index < polygon.length;
    previousIndex = index, index += 1
  ) {
    const current = polygon[index]!;
    const previous = polygon[previousIndex]!;
    const intersects =
      current.y > point.y !== previous.y > point.y &&
      point.x < ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y + EPSILON) + current.x;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
};

const orientation = (a: TerrainPoint, b: TerrainPoint, c: TerrainPoint) =>
  (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);

const onSegment = (a: TerrainPoint, b: TerrainPoint, c: TerrainPoint) =>
  Math.min(a.x, c.x) - EPSILON <= b.x &&
  b.x <= Math.max(a.x, c.x) + EPSILON &&
  Math.min(a.y, c.y) - EPSILON <= b.y &&
  b.y <= Math.max(a.y, c.y) + EPSILON;

const segmentsIntersect = (a1: TerrainPoint, a2: TerrainPoint, b1: TerrainPoint, b2: TerrainPoint) => {
  const o1 = orientation(a1, a2, b1);
  const o2 = orientation(a1, a2, b2);
  const o3 = orientation(b1, b2, a1);
  const o4 = orientation(b1, b2, a2);

  if (
    ((o1 > EPSILON && o2 < -EPSILON) || (o1 < -EPSILON && o2 > EPSILON)) &&
    ((o3 > EPSILON && o4 < -EPSILON) || (o3 < -EPSILON && o4 > EPSILON))
  ) {
    return true;
  }

  if (Math.abs(o1) <= EPSILON && onSegment(a1, b1, a2)) return true;
  if (Math.abs(o2) <= EPSILON && onSegment(a1, b2, a2)) return true;
  if (Math.abs(o3) <= EPSILON && onSegment(b1, a1, b2)) return true;
  if (Math.abs(o4) <= EPSILON && onSegment(b1, a2, b2)) return true;

  return false;
};

const distancePointToSegment = (point: TerrainPoint, start: TerrainPoint, end: TerrainPoint) => {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;

  if (lengthSquared <= EPSILON) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const t = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) / lengthSquared),
  );
  const projectedX = start.x + t * deltaX;
  const projectedY = start.y + t * deltaY;

  return Math.hypot(point.x - projectedX, point.y - projectedY);
};

const distanceSegmentToSegment = (
  a1: TerrainPoint,
  a2: TerrainPoint,
  b1: TerrainPoint,
  b2: TerrainPoint,
) => {
  if (segmentsIntersect(a1, a2, b1, b2)) {
    return 0;
  }

  return Math.min(
    distancePointToSegment(a1, b1, b2),
    distancePointToSegment(a2, b1, b2),
    distancePointToSegment(b1, a1, a2),
    distancePointToSegment(b2, a1, a2),
  );
};

const polygonsIntersect = (left: readonly TerrainPoint[], right: readonly TerrainPoint[]) => {
  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    const leftStart = left[leftIndex]!;
    const leftEnd = left[(leftIndex + 1) % left.length]!;

    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      const rightStart = right[rightIndex]!;
      const rightEnd = right[(rightIndex + 1) % right.length]!;

      if (segmentsIntersect(leftStart, leftEnd, rightStart, rightEnd)) {
        return true;
      }
    }
  }

  return pointInPolygon(left[0]!, right) || pointInPolygon(right[0]!, left);
};

export const distanceBetweenPieces = (left: TerrainPiece, right: TerrainPiece) => {
  const leftPolygon = getPiecePolygon(left);
  const rightPolygon = getPiecePolygon(right);

  if (polygonsIntersect(leftPolygon, rightPolygon)) {
    return 0;
  }

  let minDistance = Infinity;

  for (let leftIndex = 0; leftIndex < leftPolygon.length; leftIndex += 1) {
    const leftStart = leftPolygon[leftIndex]!;
    const leftEnd = leftPolygon[(leftIndex + 1) % leftPolygon.length]!;

    for (let rightIndex = 0; rightIndex < rightPolygon.length; rightIndex += 1) {
      const rightStart = rightPolygon[rightIndex]!;
      const rightEnd = rightPolygon[(rightIndex + 1) % rightPolygon.length]!;
      minDistance = Math.min(minDistance, distanceSegmentToSegment(leftStart, leftEnd, rightStart, rightEnd));
    }
  }

  return minDistance;
};

const toLocalPoint = (point: TerrainPoint, piece: TerrainPiece): TerrainPoint =>
  rotatePoint({ x: point.x - piece.x, y: point.y - piece.y }, -piece.rotation);

export const distancePointToPiece = (point: TerrainPoint, piece: TerrainPiece) => {
  if (piece.shape.kind === 'circle') {
    return Math.max(0, Math.hypot(point.x - piece.x, point.y - piece.y) - piece.shape.radius);
  }

  const localPoint = toLocalPoint(point, piece);

  if (piece.shape.kind === 'rectangle') {
    const dx = Math.max(0, Math.abs(localPoint.x) - piece.shape.width / 2);
    const dy = Math.max(0, Math.abs(localPoint.y) - piece.shape.height / 2);
    return Math.hypot(dx, dy);
  }

  if (pointInPolygon(localPoint, piece.shape.points)) {
    return 0;
  }

  let minDistance = Infinity;

  for (let index = 0; index < piece.shape.points.length; index += 1) {
    const start = piece.shape.points[index]!;
    const end = piece.shape.points[(index + 1) % piece.shape.points.length]!;
    minDistance = Math.min(minDistance, distancePointToSegment(localPoint, start, end));
  }

  return minDistance;
};

export const segmentIntersectsPiece = (start: TerrainPoint, end: TerrainPoint, piece: TerrainPiece) => {
  if (piece.shape.kind === 'circle') {
    return distancePointToSegment({ x: piece.x, y: piece.y }, start, end) <= piece.shape.radius + EPSILON;
  }

  const polygon = getPiecePolygon(piece);

  for (let index = 0; index < polygon.length; index += 1) {
    const edgeStart = polygon[index]!;
    const edgeEnd = polygon[(index + 1) % polygon.length]!;

    if (segmentsIntersect(start, end, edgeStart, edgeEnd)) {
      return true;
    }
  }

  return pointInPolygon(start, polygon) || pointInPolygon(end, polygon);
};
