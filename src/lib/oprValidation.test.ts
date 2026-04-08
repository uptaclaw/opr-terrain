import { validateOPRTerrain } from './oprValidation';
import type { TerrainPiece, TerrainTrait } from '../types/layout';

const createTrait = (overrides: Partial<TerrainTrait> = {}): TerrainTrait => ({
  id: 'trait',
  label: 'Trait',
  category: 'movement',
  active: true,
  ...overrides,
});

const createPiece = (id: string, traits: TerrainTrait[], overrides: Partial<TerrainPiece> = {}): TerrainPiece => ({
  id,
  templateId: 'custom',
  name: `Piece ${id}`,
  shape: 'rect',
  fill: '#475569',
  stroke: '#f8fafc',
  width: 6,
  height: 4,
  x: 12,
  y: 12,
  rotation: 0,
  traits,
  ...overrides,
});

describe('oprValidation', () => {
  describe('validateOPRTerrain', () => {
    it('validates piece count within recommended range (10-15)', () => {
      const pieces = Array.from({ length: 12 }, (_, i) =>
        createPiece(`piece-${i}`, [])
      );

      const result = validateOPRTerrain(pieces, 48, 48);
      const quantityMetric = result.metrics.find((m) => m.id === 'quantity');

      expect(quantityMetric).toBeDefined();
      expect(quantityMetric?.status).toBe('good');
      expect(quantityMetric?.currentValue).toBe(12);
    });

    it('warns when piece count is below minimum (sparse)', () => {
      const pieces = Array.from({ length: 7 }, (_, i) =>
        createPiece(`piece-${i}`, [])
      );

      const result = validateOPRTerrain(pieces, 48, 48);
      const quantityMetric = result.metrics.find((m) => m.id === 'quantity');

      expect(quantityMetric?.status).toBe('warning');
      expect(quantityMetric?.currentValue).toBe(7);
      expect(quantityMetric?.suggestion).toContain('Add 3 more pieces');
    });

    it('provides informational warning when piece count exceeds maximum (dense)', () => {
      const pieces = Array.from({ length: 18 }, (_, i) =>
        createPiece(`piece-${i}`, [])
      );

      const result = validateOPRTerrain(pieces, 48, 48);
      const quantityMetric = result.metrics.find((m) => m.id === 'quantity');

      expect(quantityMetric?.status).toBe('warning');
      expect(quantityMetric?.currentValue).toBe(18);
      expect(quantityMetric?.suggestion).toContain('Dense terrain is fine');
    });

    it('calculates coverage percentage correctly for rectangular pieces', () => {
      // 4x4 table = 16 sq in
      // 4 pieces of 2x2 = 16 sq in total = 100% coverage
      const pieces = Array.from({ length: 4 }, (_, i) =>
        createPiece(`piece-${i}`, [], { width: 2, height: 2 })
      );

      const result = validateOPRTerrain(pieces, 4, 4);
      const coverageMetric = result.metrics.find((m) => m.id === 'coverage');

      expect(coverageMetric?.currentValue).toBe(100);
      expect(coverageMetric?.status).toBe('good');
    });

    it('validates LoS blocking percentage meets 50% requirement', () => {
      const pieces = [
        createPiece('1', [createTrait({ id: 'los-blocking', label: 'LoS Blocking', category: 'los' })]),
        createPiece('2', [createTrait({ id: 'los-blocking', label: 'LoS Blocking', category: 'los' })]),
        createPiece('3', [createTrait({ id: 'los-blocking', label: 'LoS Blocking', category: 'los' })]),
        createPiece('4', [createTrait({ id: 'los-blocking', label: 'LoS Blocking', category: 'los' })]),
        createPiece('5', [createTrait({ id: 'los-blocking', label: 'LoS Blocking', category: 'los' })]),
        createPiece('6', [createTrait({ id: 'los-blocking', label: 'LoS Blocking', category: 'los' })]),
        createPiece('7', []),
        createPiece('8', []),
        createPiece('9', []),
        createPiece('10', []),
      ];

      const result = validateOPRTerrain(pieces, 48, 48);
      const losMetric = result.metrics.find((m) => m.id === 'los-blocking');

      expect(losMetric?.currentValue).toBe(60); // 6/10 = 60%
      expect(losMetric?.status).toBe('good');
    });

    it('warns when LoS blocking is below 50%', () => {
      const pieces = [
        createPiece('1', [createTrait({ id: 'los-blocking', label: 'LoS Blocking', category: 'los' })]),
        createPiece('2', [createTrait({ id: 'los-blocking', label: 'LoS Blocking', category: 'los' })]),
        createPiece('3', []),
        createPiece('4', []),
        createPiece('5', []),
        createPiece('6', []),
        createPiece('7', []),
        createPiece('8', []),
        createPiece('9', []),
        createPiece('10', []),
      ];

      const result = validateOPRTerrain(pieces, 48, 48);
      const losMetric = result.metrics.find((m) => m.id === 'los-blocking');

      expect(losMetric?.currentValue).toBe(20); // 2/10 = 20%
      expect(losMetric?.status).toBe('fail');
      expect(losMetric?.suggestion).toContain('Add LoS Blocking trait to 3 more pieces');
    });

    it('validates cover distribution meets 33% requirement', () => {
      const pieces = [
        createPiece('1', [createTrait({ id: 'hard-cover', label: 'Hard Cover', category: 'cover' })]),
        createPiece('2', [createTrait({ id: 'soft-cover', label: 'Soft Cover', category: 'cover' })]),
        createPiece('3', [createTrait({ id: 'hard-cover', label: 'Hard Cover', category: 'cover' })]),
        createPiece('4', [createTrait({ id: 'soft-cover', label: 'Soft Cover', category: 'cover' })]),
        createPiece('5', []),
        createPiece('6', []),
        createPiece('7', []),
        createPiece('8', []),
        createPiece('9', []),
        createPiece('10', []),
      ];

      const result = validateOPRTerrain(pieces, 48, 48);
      const coverMetric = result.metrics.find((m) => m.id === 'cover');

      expect(coverMetric?.currentValue).toBe(40); // 4/10 = 40%
      expect(coverMetric?.status).toBe('good');
    });

    it('validates difficult terrain meets 33% requirement', () => {
      const pieces = [
        createPiece('1', [createTrait({ id: 'difficult', label: 'Difficult', category: 'movement' })]),
        createPiece('2', [createTrait({ id: 'difficult', label: 'Difficult', category: 'movement' })]),
        createPiece('3', [createTrait({ id: 'difficult', label: 'Difficult', category: 'movement' })]),
        createPiece('4', [createTrait({ id: 'difficult', label: 'Difficult', category: 'movement' })]),
        createPiece('5', []),
        createPiece('6', []),
        createPiece('7', []),
        createPiece('8', []),
        createPiece('9', []),
        createPiece('10', []),
      ];

      const result = validateOPRTerrain(pieces, 48, 48);
      const difficultMetric = result.metrics.find((m) => m.id === 'difficult');

      expect(difficultMetric?.currentValue).toBe(40); // 4/10 = 40%
      expect(difficultMetric?.status).toBe('good');
    });

    it('validates dangerous terrain count requirement (2 pieces)', () => {
      const pieces = [
        createPiece('1', [createTrait({ id: 'dangerous', label: 'Dangerous', category: 'movement' })]),
        createPiece('2', [createTrait({ id: 'dangerous', label: 'Dangerous', category: 'movement' })]),
        createPiece('3', []),
        createPiece('4', []),
        createPiece('5', []),
        createPiece('6', []),
        createPiece('7', []),
        createPiece('8', []),
        createPiece('9', []),
        createPiece('10', []),
      ];

      const result = validateOPRTerrain(pieces, 48, 48);
      const dangerousMetric = result.metrics.find((m) => m.id === 'dangerous');

      expect(dangerousMetric?.currentValue).toBe(2);
      expect(dangerousMetric?.status).toBe('good');
    });

    it('warns when dangerous terrain count is below 2', () => {
      const pieces = Array.from({ length: 10 }, (_, i) => createPiece(`piece-${i}`, []));

      const result = validateOPRTerrain(pieces, 48, 48);
      const dangerousMetric = result.metrics.find((m) => m.id === 'dangerous');

      expect(dangerousMetric?.currentValue).toBe(0);
      expect(dangerousMetric?.status).toBe('warning');
      expect(dangerousMetric?.suggestion).toContain('Add Dangerous trait to 2 more pieces');
    });

    it('ignores inactive traits when calculating percentages', () => {
      const pieces = [
        createPiece('1', [
          createTrait({ id: 'los-blocking', label: 'LoS Blocking', category: 'los' }),
        ]),
        createPiece('2', [
          createTrait({ id: 'los-blocking', label: 'LoS Blocking', category: 'los', active: false }),
        ]),
        createPiece('3', []),
        createPiece('4', []),
        createPiece('5', []),
        createPiece('6', []),
        createPiece('7', []),
        createPiece('8', []),
        createPiece('9', []),
        createPiece('10', []),
      ];

      const result = validateOPRTerrain(pieces, 48, 48);
      const losMetric = result.metrics.find((m) => m.id === 'los-blocking');

      expect(losMetric?.currentValue).toBe(10); // Only 1/10 active = 10%
      expect(losMetric?.status).toBe('fail');
    });

    it('handles empty terrain layouts gracefully', () => {
      const result = validateOPRTerrain([], 48, 48);

      expect(result.metrics).toHaveLength(6);
      expect(result.passedCount).toBe(0);
      expect(result.overallStatus).toBe('fail');
    });

    it('calculates overall status correctly', () => {
      // All good - use larger pieces to meet coverage requirement
      const goodPieces = [
        createPiece('1', [
          createTrait({ id: 'los-blocking', label: 'LoS Blocking', category: 'los' }),
          createTrait({ id: 'hard-cover', label: 'Hard Cover', category: 'cover' }),
          createTrait({ id: 'difficult', label: 'Difficult', category: 'movement' }),
        ], { width: 12, height: 10 }),
        createPiece('2', [
          createTrait({ id: 'los-blocking', label: 'LoS Blocking', category: 'los' }),
          createTrait({ id: 'soft-cover', label: 'Soft Cover', category: 'cover' }),
          createTrait({ id: 'difficult', label: 'Difficult', category: 'movement' }),
        ], { width: 12, height: 10 }),
        createPiece('3', [
          createTrait({ id: 'los-blocking', label: 'LoS Blocking', category: 'los' }),
          createTrait({ id: 'hard-cover', label: 'Hard Cover', category: 'cover' }),
          createTrait({ id: 'difficult', label: 'Difficult', category: 'movement' }),
        ], { width: 12, height: 10 }),
        createPiece('4', [
          createTrait({ id: 'los-blocking', label: 'LoS Blocking', category: 'los' }),
          createTrait({ id: 'soft-cover', label: 'Soft Cover', category: 'cover' }),
          createTrait({ id: 'difficult', label: 'Difficult', category: 'movement' }),
        ], { width: 12, height: 10 }),
        createPiece('5', [
          createTrait({ id: 'los-blocking', label: 'LoS Blocking', category: 'los' }),
          createTrait({ id: 'hard-cover', label: 'Hard Cover', category: 'cover' }),
          createTrait({ id: 'dangerous', label: 'Dangerous', category: 'movement' }),
        ], { width: 12, height: 10 }),
        createPiece('6', [
          createTrait({ id: 'los-blocking', label: 'LoS Blocking', category: 'los' }),
          createTrait({ id: 'soft-cover', label: 'Soft Cover', category: 'cover' }),
          createTrait({ id: 'dangerous', label: 'Dangerous', category: 'movement' }),
        ], { width: 12, height: 10 }),
        createPiece('7', [createTrait({ id: 'hard-cover', label: 'Hard Cover', category: 'cover' })], { width: 12, height: 10 }),
        createPiece('8', [createTrait({ id: 'soft-cover', label: 'Soft Cover', category: 'cover' })], { width: 12, height: 10 }),
        createPiece('9', [], { width: 12, height: 10 }),
        createPiece('10', [], { width: 12, height: 10 }),
      ];

      const goodResult = validateOPRTerrain(goodPieces, 48, 48);
      // All checks should now pass
      expect(goodResult.passedCount).toBe(6);
      expect(goodResult.overallStatus).toBe('good');
    });
  });
});
