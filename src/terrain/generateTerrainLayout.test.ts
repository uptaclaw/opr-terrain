import { analyzeTerrainLayout, generateTerrainLayout } from './generateTerrainLayout';

const mulberry32 = (seed: number) => {
  let value = seed >>> 0;

  return () => {
    value += 0x6d2b79f5;
    let result = Math.imul(value ^ (value >>> 15), value | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
};

const layoutSignature = (seed: number) => {
  const layout = generateTerrainLayout({ pieceCount: 16, random: mulberry32(seed) });

  return layout.pieces
    .map(
      (piece) =>
        `${piece.templateId}:${piece.shape.kind}:${piece.x.toFixed(1)}:${piece.y.toFixed(1)}:${piece.rotation}`,
    )
    .join('|');
};

describe('generateTerrainLayout', () => {
  it('builds balanced non-overlapping layouts that keep deployment centers open', () => {
    for (let seed = 1; seed <= 10; seed += 1) {
      const layout = generateTerrainLayout({ pieceCount: 18, random: mulberry32(seed) });
      const analysis = analyzeTerrainLayout(layout);

      expect(layout.pieces).toHaveLength(18);
      expect(layout.widthInches).toBe(48);
      expect(layout.heightInches).toBe(72);
      expect(Math.max(...analysis.quarterCounts)).toBeLessThanOrEqual(5);
      expect(analysis.overlaps).toHaveLength(0);
      expect(analysis.deploymentCenterIntrusions).toHaveLength(0);
      expect(analysis.shapeCounts.circle).toBeGreaterThan(0);
      expect(analysis.shapeCounts.rectangle).toBeGreaterThan(0);
      expect(analysis.shapeCounts.polygon).toBeGreaterThan(0);
      expect(Object.keys(analysis.templateCounts).length).toBeGreaterThanOrEqual(5);
    }
  });

  it('changes the generated layout when the random seed changes', () => {
    expect(layoutSignature(7)).not.toBe(layoutSignature(8));
  });
});
