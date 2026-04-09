import { describe, expect, it } from 'vitest';
import {
  findClearEdgeToEdgeSightlinesForLayout,
  findClearEdgeToEdgeSightlinesForTerrain,
  lineIntersectsLayoutPiece,
  lineIntersectsTerrainPiece,
  type SightlineSegment,
} from './lineOfSight';
import type { TerrainPiece as LayoutTerrainPiece } from '../types/layout';
import type { TerrainPiece as GeneratedTerrainPiece } from '../terrain/types';

const createLayoutPiece = (overrides: Partial<LayoutTerrainPiece> = {}): LayoutTerrainPiece => ({
  id: 'layout-piece',
  templateId: 'layout-piece',
  name: 'Layout Piece',
  shape: 'rect',
  fill: '#334155',
  stroke: '#e2e8f0',
  width: 8,
  height: 4,
  x: 12,
  y: 12,
  rotation: 0,
  traits: [],
  ...overrides,
});

const createTerrainPiece = (overrides: Partial<GeneratedTerrainPiece> = {}): GeneratedTerrainPiece => ({
  id: 'terrain-piece',
  templateId: 'terrain-piece',
  name: 'Terrain Piece',
  color: '#334155',
  traits: [],
  x: 12,
  y: 12,
  rotation: 0,
  shape: { kind: 'rectangle', width: 8, height: 4 },
  collisionRadius: Math.hypot(4, 2),
  ...overrides,
});

const horizontalSightline: SightlineSegment = {
  start: { x: 0, y: 12 },
  end: { x: 24, y: 12 },
};

describe('lineIntersectsLayoutPiece', () => {
  it('detects intersections against rotated rectangles', () => {
    const piece = createLayoutPiece({ rotation: 45 });

    expect(lineIntersectsLayoutPiece(horizontalSightline, piece)).toBe(true);
  });

  it('detects intersections against rotated ellipses', () => {
    const piece = createLayoutPiece({
      shape: 'ellipse',
      width: 10,
      height: 6,
      rotation: 30,
    });

    expect(lineIntersectsLayoutPiece(horizontalSightline, piece)).toBe(true);
  });

  it('detects intersections against diamonds', () => {
    const piece = createLayoutPiece({
      shape: 'diamond',
      width: 8,
      height: 8,
      rotation: 0,
    });

    expect(lineIntersectsLayoutPiece(horizontalSightline, piece)).toBe(true);
  });

  it('does not report an intersection when the line misses the piece', () => {
    const piece = createLayoutPiece({ y: 4 });

    expect(lineIntersectsLayoutPiece(horizontalSightline, piece)).toBe(false);
  });
});

describe('lineIntersectsTerrainPiece', () => {
  it('detects intersections against generated polygons', () => {
    const piece = createTerrainPiece({
      shape: {
        kind: 'polygon',
        points: [
          { x: -3, y: -2 },
          { x: 3, y: -2 },
          { x: 4, y: 1 },
          { x: 0, y: 4 },
          { x: -4, y: 1 },
        ],
      },
      collisionRadius: 4,
    });

    expect(lineIntersectsTerrainPiece(horizontalSightline, piece)).toBe(true);
  });
});

describe('edge-to-edge line of sight analysis', () => {
  it('checks every integer point on the long edges for landscape layout pieces', () => {
    const result = findClearEdgeToEdgeSightlinesForLayout([], 72, 48);

    expect(result.edgeOrientation).toBe('horizontal');
    expect(result.edgePointCount).toBe(73);
    expect(result.totalSightlines).toBe(73 * 73);
    expect(result.clearSightlineCount).toBe(73 * 73);
    expect(result.allSightlinesBlocked).toBe(false);
  });

  it('treats any full-height terrain piece as blocking every long-edge sightline', () => {
    const barrier = createLayoutPiece({
      width: 2,
      height: 24,
      x: 12,
      y: 12,
      traits: [{ id: 'open-los', label: 'Open line of sight', category: 'los', active: true }],
    });

    const result = findClearEdgeToEdgeSightlinesForLayout([barrier], 24, 24);

    expect(result.clearSightlineCount).toBe(0);
    expect(result.allSightlinesBlocked).toBe(true);
  });

  it('uses generated terrain geometry for the OPR validation helper', () => {
    const barrier = createTerrainPiece({
      traits: ['Elevated'],
      x: 24,
      y: 36,
      shape: { kind: 'rectangle', width: 4, height: 72 },
      collisionRadius: Math.hypot(2, 36),
    });

    const result = findClearEdgeToEdgeSightlinesForTerrain([barrier], 48, 72);

    expect(result.clearSightlineCount).toBe(0);
    expect(result.allSightlinesBlocked).toBe(true);
  });
});
