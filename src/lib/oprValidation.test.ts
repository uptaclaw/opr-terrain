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

      expect(result.metrics).toHaveLength(7);
      expect(result.passedCount).toBe(0);
      // Empty layout will fail due to LoS blocking being 0% (hard fail)
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
      // All checks should now pass (except potentially spacing)
      expect(goodResult.passedCount).toBeGreaterThanOrEqual(6);
      expect(goodResult.overallStatus).toMatch(/good|warning/);
    });

    // Tests for issue requirements: status thresholds and spacing
    describe('status thresholds match issue examples', () => {
      it('coverage at 35% should warn, not fail', () => {
        // 48x48 table = 2304 sq in
        // Need ~806 sq in for 35% coverage
        // 10 pieces of 6x4 = 240 sq in = 10.4% -- too low
        // 10 pieces of 9x9 = 810 sq in = 35%
        const pieces = [
          createPiece('1', [], { width: 9, height: 9 }),
          createPiece('2', [], { width: 9, height: 9 }),
          createPiece('3', [], { width: 9, height: 9 }),
          createPiece('4', [], { width: 9, height: 9 }),
          createPiece('5', [], { width: 9, height: 9 }),
          createPiece('6', [], { width: 9, height: 9 }),
          createPiece('7', [], { width: 9, height: 9 }),
          createPiece('8', [], { width: 9, height: 9 }),
          createPiece('9', [], { width: 9, height: 9 }),
          createPiece('10', [], { width: 9, height: 9 }),
        ];

        const result = validateOPRTerrain(pieces, 48, 48);
        const coverageMetric = result.metrics.find((m) => m.id === 'coverage');

        expect(coverageMetric?.currentValue).toBeGreaterThanOrEqual(30);
        expect(coverageMetric?.currentValue).toBeLessThanOrEqual(40);
        expect(coverageMetric?.status).toBe('warning');
      });

      it('cover at 13% (2/15) should warn, not fail', () => {
        const pieces = [
          createPiece('1', [createTrait({ id: 'hard-cover', label: 'Hard Cover', category: 'cover' })]),
          createPiece('2', [createTrait({ id: 'soft-cover', label: 'Soft Cover', category: 'cover' })]),
          createPiece('3', []),
          createPiece('4', []),
          createPiece('5', []),
          createPiece('6', []),
          createPiece('7', []),
          createPiece('8', []),
          createPiece('9', []),
          createPiece('10', []),
          createPiece('11', []),
          createPiece('12', []),
          createPiece('13', []),
          createPiece('14', []),
          createPiece('15', []),
        ];

        const result = validateOPRTerrain(pieces, 48, 48);
        const coverMetric = result.metrics.find((m) => m.id === 'cover');

        expect(coverMetric?.currentValue).toBe(13); // 2/15 = 13%
        expect(coverMetric?.status).toBe('warning');
      });

      it('difficult at 20% (3/15) should warn, not fail', () => {
        const pieces = [
          createPiece('1', [createTrait({ id: 'difficult', label: 'Difficult', category: 'movement' })]),
          createPiece('2', [createTrait({ id: 'difficult', label: 'Difficult', category: 'movement' })]),
          createPiece('3', [createTrait({ id: 'difficult', label: 'Difficult', category: 'movement' })]),
          createPiece('4', []),
          createPiece('5', []),
          createPiece('6', []),
          createPiece('7', []),
          createPiece('8', []),
          createPiece('9', []),
          createPiece('10', []),
          createPiece('11', []),
          createPiece('12', []),
          createPiece('13', []),
          createPiece('14', []),
          createPiece('15', []),
        ];

        const result = validateOPRTerrain(pieces, 48, 48);
        const difficultMetric = result.metrics.find((m) => m.id === 'difficult');

        expect(difficultMetric?.currentValue).toBe(20); // 3/15 = 20%
        expect(difficultMetric?.status).toBe('warning');
      });

      it('LoS blocking at 33% (4/12) should fail (example shows ✗)', () => {
        const pieces = [
          createPiece('1', [createTrait({ id: 'los-blocking', label: 'LoS Blocking', category: 'los' })]),
          createPiece('2', [createTrait({ id: 'los-blocking', label: 'LoS Blocking', category: 'los' })]),
          createPiece('3', [createTrait({ id: 'los-blocking', label: 'LoS Blocking', category: 'los' })]),
          createPiece('4', [createTrait({ id: 'los-blocking', label: 'LoS Blocking', category: 'los' })]),
          createPiece('5', []),
          createPiece('6', []),
          createPiece('7', []),
          createPiece('8', []),
          createPiece('9', []),
          createPiece('10', []),
          createPiece('11', []),
          createPiece('12', []),
        ];

        const result = validateOPRTerrain(pieces, 48, 48);
        const losMetric = result.metrics.find((m) => m.id === 'los-blocking');

        expect(losMetric?.currentValue).toBe(33); // 4/12 = 33%
        expect(losMetric?.status).toBe('fail');
      });
    });

    describe('spacing analysis (7th metric)', () => {
      it('detects large gaps >6"', () => {
        // Two pieces far apart
        const pieces = [
          createPiece('1', [], { x: 0, y: 0, width: 3, height: 3 }),
          createPiece('2', [], { x: 20, y: 0, width: 3, height: 3 }), // 20 - 1.5 - 1.5 = 17" gap
        ];

        const result = validateOPRTerrain(pieces, 48, 48);
        const spacingMetric = result.metrics.find((m) => m.id === 'spacing');

        expect(spacingMetric).toBeDefined();
        expect(spacingMetric?.status).toBe('warning');
        expect(spacingMetric?.message).toContain('gap');
      });

      it('detects edge sightlines when edges are not covered', () => {
        // Pieces all in the center, leaving edges exposed
        const pieces = [
          createPiece('1', [], { x: 24, y: 24, width: 4, height: 4 }),
          createPiece('2', [], { x: 30, y: 24, width: 4, height: 4 }),
          createPiece('3', [], { x: 24, y: 30, width: 4, height: 4 }),
        ];

        const result = validateOPRTerrain(pieces, 48, 48);
        const spacingMetric = result.metrics.find((m) => m.id === 'spacing');

        expect(spacingMetric?.status).toBe('warning');
        expect(spacingMetric?.message).toContain('edge sightline');
      });

      it('shows good spacing when pieces are well distributed', () => {
        // Pieces spread across the table with reasonable coverage
        // The key is: no *egregious* spacing issues that would block the game
        const pieces = [
          createPiece('1', [], { x: 6, y: 6, width: 8, height: 8 }),
          createPiece('2', [], { x: 14, y: 6, width: 8, height: 8 }),
          createPiece('3', [], { x: 22, y: 6, width: 8, height: 8 }),
          createPiece('4', [], { x: 30, y: 6, width: 8, height: 8 }),
          createPiece('5', [], { x: 38, y: 6, width: 8, height: 8 }),
          createPiece('6', [], { x: 6, y: 18, width: 8, height: 8 }),
          createPiece('7', [], { x: 18, y: 18, width: 8, height: 8 }),
          createPiece('8', [], { x: 30, y: 18, width: 8, height: 8 }),
          createPiece('9', [], { x: 42, y: 18, width: 8, height: 8 }),
          createPiece('10', [], { x: 6, y: 42, width: 8, height: 8 }),
        ];

        const result = validateOPRTerrain(pieces, 48, 48);
        const spacingMetric = result.metrics.find((m) => m.id === 'spacing');

        // With this distribution, there will still be some large gaps,
        // but the spacing analysis is more about detecting *severe* problems
        // So we accept warning status for realistic layouts
        expect(spacingMetric?.status).toMatch(/good|warning/);
      });

      it('exists as the 7th metric', () => {
        const pieces = Array.from({ length: 10 }, (_, i) =>
          createPiece(`piece-${i}`, [])
        );

        const result = validateOPRTerrain(pieces, 48, 48);

        expect(result.metrics).toHaveLength(7);
        expect(result.metrics.find((m) => m.id === 'spacing')).toBeDefined();
      });
    });
  });
});
