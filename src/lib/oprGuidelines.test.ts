import { describe, expect, it } from 'vitest';
import {
  calculateCoverBalance,
  calculateOverallScore,
  calculateTerrainCoverage,
  countPiecesInCenter,
  countPiecesInDeploymentZones,
  countPiecesWithTrait,
  OPR_GUIDELINES,
  validateLayout,
} from './oprGuidelines';

describe('calculateTerrainCoverage', () => {
  it('calculates percentage of table covered by terrain', () => {
    const pieces = [
      { width: 8, height: 6 }, // 48 sq in
      { width: 9, height: 7 }, // 63 sq in
    ];
    const coverage = calculateTerrainCoverage(pieces, 48, 48); // 2304 sq in table
    
    // (48 + 63) / 2304 = 0.0482 = 4.82%
    expect(coverage).toBeCloseTo(4.82, 1);
  });

  it('returns 0 for empty table', () => {
    const coverage = calculateTerrainCoverage([], 48, 48);
    expect(coverage).toBe(0);
  });
});

describe('countPiecesWithTrait', () => {
  it('counts pieces with active trait', () => {
    const pieces = [
      {
        traits: [
          { id: 'heavy-cover', active: true },
          { id: 'blocks-los', active: true },
        ],
      },
      {
        traits: [
          { id: 'light-cover', active: true },
          { id: 'blocks-los', active: false },
        ],
      },
      {
        traits: [
          { id: 'heavy-cover', active: true },
        ],
      },
    ];

    expect(countPiecesWithTrait(pieces, 'heavy-cover')).toBe(2);
    expect(countPiecesWithTrait(pieces, 'light-cover')).toBe(1);
    expect(countPiecesWithTrait(pieces, 'blocks-los')).toBe(1);
  });

  it('returns 0 when no pieces have the trait', () => {
    const pieces = [
      { traits: [{ id: 'light-cover', active: true }] },
    ];

    expect(countPiecesWithTrait(pieces, 'heavy-cover')).toBe(0);
  });
});

describe('countPiecesInDeploymentZones', () => {
  it('counts pieces in deployment zones', () => {
    const pieces = [
      { x: 24, y: 10 }, // In deployment zone (y <= 12)
      { x: 24, y: 24 }, // Center, not in zone
      { x: 24, y: 38 }, // In deployment zone (y >= 36)
      { x: 12, y: 5 },  // In deployment zone
    ];

    const count = countPiecesInDeploymentZones(pieces, 48, 12);
    expect(count).toBe(3);
  });
});

describe('countPiecesInCenter', () => {
  it('counts pieces within center circle', () => {
    const pieces = [
      { x: 24, y: 24 }, // Exact center
      { x: 30, y: 24 }, // 6 inches from center
      { x: 36, y: 24 }, // 12 inches from center (on edge)
      { x: 40, y: 24 }, // 16 inches from center (outside)
    ];

    const count = countPiecesInCenter(pieces, 48, 48, 12);
    expect(count).toBe(3); // First three are within 12"
  });
});

describe('calculateCoverBalance', () => {
  it('calculates ratio of light to total cover', () => {
    const pieces = [
      { traits: [{ id: 'light-cover', active: true }] },
      { traits: [{ id: 'heavy-cover', active: true }] },
      { traits: [{ id: 'light-cover', active: true }] },
    ];

    const balance = calculateCoverBalance(pieces);
    expect(balance).toBeCloseTo(0.667, 2); // 2 light / 3 total = 0.667
  });

  it('returns 0 when no cover pieces exist', () => {
    const pieces = [
      { traits: [{ id: 'difficult-ground', active: true }] },
    ];

    const balance = calculateCoverBalance(pieces);
    expect(balance).toBe(0);
  });
});

describe('validateLayout', () => {
  it('validates a balanced layout', () => {
    const pieces = [
      {
        x: 24, y: 24, width: 8, height: 6,
        traits: [
          { id: 'heavy-cover', active: true },
          { id: 'blocks-los', active: true },
        ],
      },
      {
        x: 15, y: 37, width: 9, height: 7,
        traits: [
          { id: 'light-cover', active: true },
        ],
      },
      {
        x: 37, y: 34, width: 10, height: 7,
        traits: [
          { id: 'light-cover', active: true },
        ],
      },
      {
        x: 25, y: 16, width: 7, height: 2.5,
        traits: [
          { id: 'light-cover', active: true },
        ],
      },
      {
        x: 10, y: 13, width: 6, height: 4,
        traits: [
          { id: 'heavy-cover', active: true },
          { id: 'blocks-los', active: true },
        ],
      },
    ];

    const results = validateLayout(pieces, 48, 48, 12);

    expect(results).toHaveLength(OPR_GUIDELINES.length);
    expect(results.every((r) => r.status)).toBeTruthy();
  });

  it('detects poor terrain density', () => {
    const pieces = [
      {
        x: 24, y: 24, width: 3, height: 3,
        traits: [{ id: 'light-cover', active: true }],
      },
    ];

    const results = validateLayout(pieces, 48, 48, 12);
    const densityResult = results.find((r) => r.guideline.id === 'terrain-density');

    expect(densityResult?.status).toBe('poor');
    expect(densityResult?.suggestion).toBeDefined();
  });

  it('detects missing LoS blockers', () => {
    const pieces = [
      {
        x: 24, y: 24, width: 8, height: 6,
        traits: [{ id: 'light-cover', active: true }],
      },
      {
        x: 15, y: 37, width: 9, height: 7,
        traits: [{ id: 'light-cover', active: true }],
      },
    ];

    const results = validateLayout(pieces, 48, 48, 12);
    const losResult = results.find((r) => r.guideline.id === 'los-blockers');

    expect(losResult?.status).not.toBe('good');
    expect(losResult?.value).toBe(0);
  });
});

describe('calculateOverallScore', () => {
  it('calculates average score from validation results', () => {
    const results = [
      {
        guideline: OPR_GUIDELINES[0],
        value: 25,
        status: 'good' as const,
        message: 'Test',
      },
      {
        guideline: OPR_GUIDELINES[1],
        value: 4,
        status: 'warning' as const,
        message: 'Test',
      },
      {
        guideline: OPR_GUIDELINES[2],
        value: 0.5,
        status: 'good' as const,
        message: 'Test',
      },
    ];

    const score = calculateOverallScore(results);
    
    // (100 + 60 + 100) / 3 = 86.67 → rounds to 87
    expect(score).toBe(87);
  });

  it('returns 0 for empty results', () => {
    const score = calculateOverallScore([]);
    expect(score).toBe(0);
  });
});
