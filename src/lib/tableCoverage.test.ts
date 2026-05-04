import { describe, it, expect } from 'vitest';
import { calculateTableCoveragePercent } from './tableCoverage';
import type { TerrainPiece, TerrainTrait } from '../types/layout';

const createTrait = (overrides: Partial<TerrainTrait> = {}): TerrainTrait => ({
  id: 'trait',
  label: 'Trait',
  category: 'movement',
  active: true,
  ...overrides,
});

const createPiece = (overrides: Partial<TerrainPiece> = {}): TerrainPiece => ({
  id: 'piece',
  templateId: 'custom',
  name: 'Piece',
  shape: 'rect',
  fill: '#475569',
  stroke: '#f8fafc',
  width: 6,
  height: 4,
  x: 12,
  y: 12,
  rotation: 0,
  traits: [],
  ...overrides,
});

describe('calculateTableCoveragePercent', () => {
  it('returns 0% for an empty board with no terrain pieces', () => {
    const coverage = calculateTableCoveragePercent([], 48, 72);
    expect(coverage).toBe(0);
  });

  it('calculates coverage for a single rectangular piece', () => {
    const piece = createPiece({ width: 6, height: 4, shape: 'rect' });
    const coverage = calculateTableCoveragePercent([piece], 48, 72);
    
    // Area: 6 * 4 = 24
    // Table area: 48 * 72 = 3456
    // Coverage: (24 / 3456) * 100 ≈ 0.694%
    expect(coverage).toBeCloseTo(0.694, 2);
  });

  it('calculates coverage for a single ellipse piece', () => {
    const piece = createPiece({ width: 6, height: 4, shape: 'ellipse' });
    const coverage = calculateTableCoveragePercent([piece], 48, 72);
    
    // Area: π * (6/2) * (4/2) = π * 3 * 2 ≈ 18.85
    // Table area: 48 * 72 = 3456
    // Coverage: (18.85 / 3456) * 100 ≈ 0.545%
    expect(coverage).toBeCloseTo(0.545, 2);
  });

  it('calculates coverage for a single diamond piece', () => {
    const piece = createPiece({ width: 6, height: 4, shape: 'diamond' });
    const coverage = calculateTableCoveragePercent([piece], 48, 72);
    
    // Area: (6 * 4) / 2 = 12
    // Table area: 48 * 72 = 3456
    // Coverage: (12 / 3456) * 100 ≈ 0.347%
    expect(coverage).toBeCloseTo(0.347, 2);
  });

  it('sums areas for multiple pieces of the same shape', () => {
    const pieces = [
      createPiece({ id: 'rect1', width: 6, height: 4, shape: 'rect' }),
      createPiece({ id: 'rect2', width: 8, height: 6, shape: 'rect' }),
      createPiece({ id: 'rect3', width: 4, height: 4, shape: 'rect' }),
    ];
    const coverage = calculateTableCoveragePercent(pieces, 48, 72);
    
    // Total area: (6*4) + (8*6) + (4*4) = 24 + 48 + 16 = 88
    // Table area: 48 * 72 = 3456
    // Coverage: (88 / 3456) * 100 ≈ 2.546%
    expect(coverage).toBeCloseTo(2.546, 2);
  });

  it('sums areas for mixed shapes', () => {
    const pieces = [
      createPiece({ id: 'rect', width: 6, height: 4, shape: 'rect' }),
      createPiece({ id: 'ellipse', width: 6, height: 4, shape: 'ellipse' }),
      createPiece({ id: 'diamond', width: 6, height: 4, shape: 'diamond' }),
    ];
    const coverage = calculateTableCoveragePercent(pieces, 48, 72);
    
    // Rect area: 6 * 4 = 24
    // Ellipse area: π * 3 * 2 ≈ 18.85
    // Diamond area: (6 * 4) / 2 = 12
    // Total: 24 + 18.85 + 12 ≈ 54.85
    // Table area: 48 * 72 = 3456
    // Coverage: (54.85 / 3456) * 100 ≈ 1.587%
    expect(coverage).toBeCloseTo(1.587, 2);
  });

  it('clamps coverage to 100% when pieces exceed table area', () => {
    const pieces = [
      createPiece({ id: 'huge1', width: 48, height: 72, shape: 'rect' }),
      createPiece({ id: 'huge2', width: 24, height: 36, shape: 'rect' }),
    ];
    const coverage = calculateTableCoveragePercent(pieces, 48, 72);
    
    // Total area: (48*72) + (24*36) = 3456 + 864 = 4320
    // Table area: 48 * 72 = 3456
    // Raw coverage: (4320 / 3456) * 100 ≈ 125%
    // Clamped: 100%
    expect(coverage).toBe(100);
  });

  it('returns 0% for a zero-dimension table without division by zero', () => {
    const piece = createPiece({ width: 6, height: 4, shape: 'rect' });
    const coverage = calculateTableCoveragePercent([piece], 0, 0);
    
    // Table area: 0
    // Should return 0 without throwing
    expect(coverage).toBe(0);
  });

  it('handles partial zero-dimension table (width is zero)', () => {
    const piece = createPiece({ width: 6, height: 4, shape: 'rect' });
    const coverage = calculateTableCoveragePercent([piece], 0, 72);
    
    // Table area: 0 * 72 = 0
    // Should return 0 without throwing
    expect(coverage).toBe(0);
  });

  it('handles partial zero-dimension table (height is zero)', () => {
    const piece = createPiece({ width: 6, height: 4, shape: 'rect' });
    const coverage = calculateTableCoveragePercent([piece], 48, 0);
    
    // Table area: 48 * 0 = 0
    // Should return 0 without throwing
    expect(coverage).toBe(0);
  });

  it('ignores piece position and rotation when calculating area', () => {
    const piece1 = createPiece({ 
      width: 6, 
      height: 4, 
      shape: 'rect',
      x: 0,
      y: 0,
      rotation: 0,
    });
    const piece2 = createPiece({ 
      width: 6, 
      height: 4, 
      shape: 'rect',
      x: 100,
      y: 200,
      rotation: 45,
    });
    
    const coverage1 = calculateTableCoveragePercent([piece1], 48, 72);
    const coverage2 = calculateTableCoveragePercent([piece2], 48, 72);
    
    // Both should have the same coverage regardless of position/rotation
    expect(coverage1).toBe(coverage2);
  });

  it('handles very small pieces with tiny coverage percentages', () => {
    const piece = createPiece({ width: 0.5, height: 0.5, shape: 'rect' });
    const coverage = calculateTableCoveragePercent([piece], 48, 72);
    
    // Area: 0.5 * 0.5 = 0.25
    // Table area: 48 * 72 = 3456
    // Coverage: (0.25 / 3456) * 100 ≈ 0.0072%
    expect(coverage).toBeCloseTo(0.0072, 4);
  });

  it('calculates realistic 25% coverage scenario', () => {
    // Standard 4x6 table (48" x 72") with typical terrain
    const pieces = [
      createPiece({ id: 'ruin1', width: 12, height: 8, shape: 'rect' }),
      createPiece({ id: 'ruin2', width: 10, height: 10, shape: 'rect' }),
      createPiece({ id: 'forest1', width: 14, height: 10, shape: 'ellipse' }),
      createPiece({ id: 'forest2', width: 12, height: 12, shape: 'ellipse' }),
      createPiece({ id: 'hill', width: 16, height: 12, shape: 'ellipse' }),
      createPiece({ id: 'crater', width: 8, height: 6, shape: 'diamond' }),
    ];
    const coverage = calculateTableCoveragePercent(pieces, 48, 72);
    
    // Rect areas: (12*8) + (10*10) = 96 + 100 = 196
    // Ellipse areas: π*(14/2)*(10/2) + π*(12/2)*(12/2) + π*(16/2)*(12/2)
    //              = π*7*5 + π*6*6 + π*8*6
    //              = π*(35 + 36 + 48) = π*119 ≈ 373.85
    // Diamond area: (8*6)/2 = 24
    // Total: 196 + 373.85 + 24 ≈ 593.85
    // Table area: 3456
    // Coverage: (593.85 / 3456) * 100 ≈ 17.18%
    expect(coverage).toBeCloseTo(17.18, 1);
  });
});
