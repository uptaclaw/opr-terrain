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

  it('generates different layouts with each call when no random function is provided', () => {
    // Test proper randomization by generating without providing a random function
    const layout1 = generateTerrainLayout({ pieceCount: 16 });
    const layout2 = generateTerrainLayout({ pieceCount: 16 });

    // Layouts should be different (at least some pieces in different positions)
    const signature1 = layout1.pieces
      .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join('|');
    const signature2 = layout2.pieces
      .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join('|');

    expect(signature1).not.toBe(signature2);
  });

  it('applies density multipliers correctly', () => {
    const basePieceCount = 16;
    
    const sparseLayout = generateTerrainLayout({
      pieceCount: basePieceCount,
      random: mulberry32(42),
      placementConfig: { density: 'sparse' },
    });
    
    const denseLayout = generateTerrainLayout({
      pieceCount: basePieceCount,
      random: mulberry32(42),
      placementConfig: { density: 'dense' },
    });

    // Sparse should have fewer pieces than dense
    expect(sparseLayout.pieces.length).toBeLessThan(denseLayout.pieces.length);
  });

  it('generates layouts with different strategies', () => {
    const strategies = [
      'random',
      'balanced-coverage',
      'symmetrical',
      'asymmetric',
      'clustered-zones',
      'los-blocking-lanes',
    ] as const;

    strategies.forEach((strategy) => {
      const layout = generateTerrainLayout({
        pieceCount: 16,
        random: mulberry32(42),
        placementConfig: { strategy },
      });

      expect(layout.pieces.length).toBeGreaterThan(0);
      expect(layout.placementConfig?.strategy).toBe(strategy);
    });
  });
});
