import { describe, it, expect } from 'vitest';
import {
  buildOPRTerrainSelection,
  calculateCoveragePercent,
  calculateTraitDistribution,
  calculateMinGap,
  calculateMaxGap,
  hasEdgeToEdgeSightline,
  validateOPRLayout,
  OPR_DEFAULT_GUIDELINES,
} from './oprPlacement';
import { generateTerrainLayout } from './generateTerrainLayout';
import { terrainCatalog } from './catalog';
import type { TerrainPiece } from './types';

const mulberry32 = (seed: number) => {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = Math.imul(value ^ (value >>> 15), value | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
};

describe('buildOPRTerrainSelection', () => {
  it('generates correct number of pieces', () => {
    for (let count = 10; count <= 15; count++) {
      const selection = buildOPRTerrainSelection(count, mulberry32(42));
      expect(selection).toHaveLength(count);
    }
  });

  it('includes exactly 2 dangerous terrain pieces', () => {
    const selection = buildOPRTerrainSelection(12, mulberry32(42));
    const dangerousCount = selection.filter((s) => {
      const template = terrainCatalog.find(t => t.id === s.templateId);
      return template && template.traits.includes('Dangerous');
    }).length;
    expect(dangerousCount).toBe(2);
  });

  it('meets LoS blocking requirement (≥50%)', () => {
    const selection = buildOPRTerrainSelection(12, mulberry32(42));
    const losBlockingCount = selection.filter((s) => {
      const template = terrainCatalog.find(t => t.id === s.templateId);
      return template && template.traits.includes('LoS Blocking');
    }).length;
    expect(losBlockingCount).toBeGreaterThanOrEqual(6); // 50% of 12
  });
});

describe('calculateTraitDistribution', () => {
  it('correctly counts trait percentages', () => {
    const mockPieces: TerrainPiece[] = [
      {
        id: '1',
        templateId: 'ruins',
        name: 'Ruins',
        color: '#8b6b4f',
        traits: ['Hard Cover', 'Difficult', 'LoS Blocking'],
        x: 10,
        y: 10,
        rotation: 0,
        shape: { kind: 'rectangle', width: 4, height: 4 },
        collisionRadius: 3,
      },
      {
        id: '2',
        templateId: 'forest',
        name: 'Forest',
        color: '#2f855a',
        traits: ['Soft Cover', 'Difficult'],
        x: 20,
        y: 20,
        rotation: 0,
        shape: { kind: 'circle', radius: 3 },
        collisionRadius: 3,
      },
      {
        id: '3',
        templateId: 'hill',
        name: 'Hill',
        color: '#b9a06a',
        traits: ['Elevated'],
        x: 30,
        y: 30,
        rotation: 0,
        shape: { kind: 'circle', radius: 4 },
        collisionRadius: 4,
      },
      {
        id: '4',
        templateId: 'marsh',
        name: 'Marsh',
        color: '#2563eb',
        traits: ['Dangerous', 'Difficult'],
        x: 40,
        y: 40,
        rotation: 0,
        shape: { kind: 'polygon', points: [] },
        collisionRadius: 3,
      },
    ];

    const distribution = calculateTraitDistribution(mockPieces);

    expect(distribution.losBlockingPercent).toBe(25); // 1 of 4
    expect(distribution.coverPercent).toBe(50); // 2 of 4
    expect(distribution.difficultPercent).toBe(75); // 3 of 4
    expect(distribution.dangerousCount).toBe(1);
  });
});

describe('calculateMinGap', () => {
  it('calculates minimum gap between pieces', () => {
    const mockPieces: TerrainPiece[] = [
      {
        id: '1',
        templateId: 'forest',
        name: 'Forest',
        color: '#2f855a',
        traits: ['Soft Cover'],
        x: 10,
        y: 10,
        rotation: 0,
        shape: { kind: 'circle', radius: 3 },
        collisionRadius: 3,
      },
      {
        id: '2',
        templateId: 'forest',
        name: 'Forest',
        color: '#2f855a',
        traits: ['Soft Cover'],
        x: 20,
        y: 10,
        rotation: 0,
        shape: { kind: 'circle', radius: 3 },
        collisionRadius: 3,
      },
    ];

    const minGap = calculateMinGap(mockPieces);
    // Distance = 10, radii = 3 + 3 = 6, gap = 4
    expect(minGap).toBeCloseTo(4, 1);
  });
});

describe('hasEdgeToEdgeSightline', () => {
  it('detects clear sightlines on empty table', () => {
    const hasClear = hasEdgeToEdgeSightline([], 48, 72);
    expect(hasClear).toBe(true);
  });

  it('detects blocked sightlines with LoS blocking terrain', () => {
    // The validator samples the midpoint of each 12" x 18" play lane on a 4'x6' table:
    // rows at y = 9, 27, 45, 63 and columns at x = 6, 18, 30, 42.
    // Four blockers on the diagonal are enough to interrupt every sampled lane.
    const mockPieces: TerrainPiece[] = [
      {
        id: '1',
        templateId: 'ruins',
        name: 'Ruins',
        color: '#8b6b4f',
        traits: ['LoS Blocking'],
        x: 6,
        y: 9,
        rotation: 0,
        shape: { kind: 'circle', radius: 6 },
        collisionRadius: 6,
      },
      {
        id: '2',
        templateId: 'ruins',
        name: 'Ruins',
        color: '#8b6b4f',
        traits: ['LoS Blocking'],
        x: 18,
        y: 27,
        rotation: 0,
        shape: { kind: 'circle', radius: 6 },
        collisionRadius: 6,
      },
      {
        id: '3',
        templateId: 'ruins',
        name: 'Ruins',
        color: '#8b6b4f',
        traits: ['LoS Blocking'],
        x: 30,
        y: 45,
        rotation: 0,
        shape: { kind: 'circle', radius: 6 },
        collisionRadius: 6,
      },
      {
        id: '4',
        templateId: 'ruins',
        name: 'Ruins',
        color: '#8b6b4f',
        traits: ['LoS Blocking'],
        x: 42,
        y: 63,
        rotation: 0,
        shape: { kind: 'circle', radius: 6 },
        collisionRadius: 6,
      },
    ];

    const hasClear = hasEdgeToEdgeSightline(mockPieces, 48, 72);
    expect(hasClear).toBe(false);
  });
});

describe('validateOPRLayout', () => {
  it('validates a compliant layout', () => {
    const layout = generateTerrainLayout({
      pieceCount: 12,
      random: mulberry32(42),
      widthInches: 48,
      heightInches: 72,
    });

    const validation = validateOPRLayout(layout.pieces, 48, 72);

    expect(validation.pieceCount).toBe(12);
    expect(validation.meetsMinPieces).toBe(true);
    expect(validation.meetsMaxPieces).toBe(true);
    expect(validation.meetsCoverage).toBe(true);
    expect(validation.meetsLosBlocking).toBe(true);
    expect(validation.meetsCover).toBe(true);
    expect(validation.meetsDifficult).toBe(true);
    expect(validation.meetsDangerous).toBe(true);
    expect(validation.meetsMinGap).toBe(true);
    expect(validation.meetsMaxGap).toBe(true);
    expect(validation.edgeToEdgeClear).toBe(true);
    expect(validation.allValid).toBe(true);
  }, 20000);
});

describe('OPR-compliant layout generation', () => {
  it('generates layouts that meet all OPR guidelines', () => {
    for (let seed = 1; seed <= 5; seed++) {
      const layout = generateTerrainLayout({
        pieceCount: 12,
        random: mulberry32(seed),
        widthInches: 48,
        heightInches: 72,
        collisionBufferInches: 3.0,
      });

      expect(layout.oprValidation).toBeDefined();
      const validation = layout.oprValidation!;

      expect(validation.allValid).toBe(true);
      expect(validation.pieceCount).toBeGreaterThanOrEqual(OPR_DEFAULT_GUIDELINES.minPieces);
      expect(validation.pieceCount).toBeLessThanOrEqual(OPR_DEFAULT_GUIDELINES.maxPieces);
      expect(validation.coveragePercent).toBeGreaterThanOrEqual(OPR_DEFAULT_GUIDELINES.minCoveragePercent);
      expect(validation.losBlockingPercent).toBeGreaterThanOrEqual(OPR_DEFAULT_GUIDELINES.minLosBlockingPercent);
      expect(validation.coverPercent).toBeGreaterThanOrEqual(OPR_DEFAULT_GUIDELINES.minCoverPercent);
      expect(validation.difficultPercent).toBeGreaterThanOrEqual(OPR_DEFAULT_GUIDELINES.minDifficultPercent);
      expect(validation.dangerousCount).toBe(OPR_DEFAULT_GUIDELINES.dangerousPieces);
      expect(validation.minGap).toBeGreaterThanOrEqual(OPR_DEFAULT_GUIDELINES.minGapInches - 0.01);
      expect(validation.maxGap).toBeLessThanOrEqual(OPR_DEFAULT_GUIDELINES.maxGapInches);
      expect(validation.edgeToEdgeClear).toBe(true);
    }
  }, 40000);

  it('generates different layouts on each call', () => {
    const layout1 = generateTerrainLayout({ pieceCount: 12, widthInches: 48, heightInches: 72 });
    const layout2 = generateTerrainLayout({ pieceCount: 12, widthInches: 48, heightInches: 72 });

    const sig1 = layout1.pieces
      .map((piece) => `${piece.templateId}:${piece.x.toFixed(1)},${piece.y.toFixed(1)}`)
      .join('|');
    const sig2 = layout2.pieces
      .map((piece) => `${piece.templateId}:${piece.x.toFixed(1)},${piece.y.toFixed(1)}`)
      .join('|');

    expect(sig1).not.toBe(sig2);
  }, 25000);
});
