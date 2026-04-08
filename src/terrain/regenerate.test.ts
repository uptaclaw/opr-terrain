import { describe, expect, it } from 'vitest';
import { generateTerrainLayout } from './generateTerrainLayout';
import type { TerrainLayout } from './types';

describe('Terrain re-generation with OPR trait distribution', () => {
  it('generates different layouts with different seeds', () => {
    const seed1 = ((Date.now() >>> 0) + Math.floor(Math.random() * 0xffffffff)) >>> 0;
    const seed2 = ((Date.now() >>> 0) + Math.floor(Math.random() * 0xffffffff)) >>> 0;

    const createSeededRandom = (seed: number) => {
      let state = seed >>> 0;
      return () => {
        state += 0x6d2b79f5;
        let result = Math.imul(state ^ (state >>> 15), state | 1);
        result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
        return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
      };
    };

    const layout1 = generateTerrainLayout({
      widthInches: 48,
      heightInches: 72,
      pieceCount: 12,
      random: createSeededRandom(seed1),
    });

    const layout2 = generateTerrainLayout({
      widthInches: 48,
      heightInches: 72,
      pieceCount: 12,
      random: createSeededRandom(seed2),
    });

    // Should generate same number of pieces
    expect(layout1.pieces.length).toBe(12);
    expect(layout2.pieces.length).toBe(12);

    // But positions should be different (extremely unlikely to match randomly)
    const positions1 = layout1.pieces.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).sort();
    const positions2 = layout2.pieces.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).sort();
    
    const matchingPositions = positions1.filter((pos, idx) => pos === positions2[idx]).length;
    
    // Allow at most 1 matching position out of 12 (could happen by chance)
    expect(matchingPositions).toBeLessThan(2);
  });

  it('generates 10-15 pieces for a 4x6 table', () => {
    const layout = generateTerrainLayout({
      widthInches: 48,
      heightInches: 72,
    });

    expect(layout.pieces.length).toBeGreaterThanOrEqual(10);
    expect(layout.pieces.length).toBeLessThanOrEqual(15);
  });

  it('meets OPR trait distribution requirements', () => {
    const layout = generateTerrainLayout({
      widthInches: 48,
      heightInches: 72,
      pieceCount: 12,
    });

    expect(layout.pieces.length).toBe(12);

    // Count traits
    const losBlockingCount = layout.pieces.filter(p => 
      p.traits.includes('LoS Blocking')
    ).length;
    
    const coverCount = layout.pieces.filter(p => 
      p.traits.includes('Soft Cover') || p.traits.includes('Hard Cover')
    ).length;
    
    const difficultCount = layout.pieces.filter(p => 
      p.traits.includes('Difficult')
    ).length;
    
    const dangerousCount = layout.pieces.filter(p => 
      p.traits.includes('Dangerous')
    ).length;

    // OPR requirements for 12 pieces:
    // ≥50% LoS Blocking = at least 6
    expect(losBlockingCount).toBeGreaterThanOrEqual(6);
    
    // ≥33% Cover = at least 4
    expect(coverCount).toBeGreaterThanOrEqual(4);
    
    // ≥33% Difficult = at least 4
    expect(difficultCount).toBeGreaterThanOrEqual(4);
    
    // Exactly 2 Dangerous
    expect(dangerousCount).toBe(2);
  });

  it('generates layouts with validation data', () => {
    const layout = generateTerrainLayout({
      widthInches: 48,
      heightInches: 72,
      pieceCount: 12,
    });

    expect(layout.oprValidation).toBeDefined();
    expect(layout.oprValidation?.pieceCount).toBe(12);
    expect(layout.oprValidation?.losBlockingPercent).toBeGreaterThanOrEqual(50);
    expect(layout.oprValidation?.coverPercent).toBeGreaterThanOrEqual(33);
    expect(layout.oprValidation?.difficultPercent).toBeGreaterThanOrEqual(33);
    expect(layout.oprValidation?.dangerousCount).toBe(2);
  });

  it('produces different terrain template selections on re-generation', () => {
    const layouts: TerrainLayout[] = [];
    
    for (let i = 0; i < 5; i++) {
      const seed = ((Date.now() >>> 0) + Math.floor(Math.random() * 0xffffffff) + i * 1000) >>> 0;
      const createSeededRandom = (seed: number) => {
        let state = seed >>> 0;
        return () => {
          state += 0x6d2b79f5;
          let result = Math.imul(state ^ (state >>> 15), state | 1);
          result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
          return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
        };
      };

      layouts.push(generateTerrainLayout({
        widthInches: 48,
        heightInches: 72,
        pieceCount: 10,
        random: createSeededRandom(seed),
      }));
    }

    // Check that we got variety in template IDs across 5 generations
    const allTemplateIds = layouts.flatMap(layout => 
      layout.pieces.map(p => p.templateId)
    );
    
    const uniqueTemplateIds = new Set(allTemplateIds);
    
    // With 5 layouts of 10 pieces each (50 pieces total),
    // we should have at least 5 different template types used
    expect(uniqueTemplateIds.size).toBeGreaterThanOrEqual(5);

    // Each layout should have some variation
    layouts.forEach(layout => {
      const templateIds = layout.pieces.map(p => p.templateId);
      const uniqueInLayout = new Set(templateIds);
      
      // Each layout should not be all the same piece
      expect(uniqueInLayout.size).toBeGreaterThan(1);
    });
  });
});
