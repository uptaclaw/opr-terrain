import { normalizeLayout } from '../lib/layout';
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

const normalizeRotation = (rotation: number) => ((rotation % 360) + 360) % 360;

const expectVerticalMirroredPairs = (layout: ReturnType<typeof generateTerrainLayout>) => {
  const sourcePieces = layout.pieces.filter((piece) => !piece.id.endsWith('-mirror'));
  const mirroredPieces = layout.pieces.filter((piece) => piece.id.endsWith('-mirror'));

  expect(sourcePieces).toHaveLength(mirroredPieces.length);
  expect(sourcePieces.length * 2).toBe(layout.pieces.length);

  sourcePieces.forEach((sourcePiece) => {
    const mirroredPiece = layout.pieces.find((piece) => piece.id === `${sourcePiece.id}-mirror`);

    expect(mirroredPiece).toBeDefined();
    expect(mirroredPiece?.templateId).toBe(sourcePiece.templateId);
    expect(mirroredPiece?.shape.kind).toBe(sourcePiece.shape.kind);
    expect(mirroredPiece?.x).toBeCloseTo(layout.widthInches - sourcePiece.x, 6);
    expect(mirroredPiece?.y).toBeCloseTo(sourcePiece.y, 6);
    expect(mirroredPiece?.rotation).toBe(
      sourcePiece.shape.kind === 'circle' ? 0 : normalizeRotation(180 - sourcePiece.rotation),
    );

    if (sourcePiece.shape.kind === 'circle' && mirroredPiece?.shape.kind === 'circle') {
      expect(mirroredPiece.shape.radius).toBe(sourcePiece.shape.radius);
    }

    if (sourcePiece.shape.kind === 'rectangle' && mirroredPiece?.shape.kind === 'rectangle') {
      expect(mirroredPiece.shape.width).toBe(sourcePiece.shape.width);
      expect(mirroredPiece.shape.height).toBe(sourcePiece.shape.height);
    }

    if (sourcePiece.shape.kind === 'polygon' && mirroredPiece?.shape.kind === 'polygon') {
      expect(mirroredPiece.shape.points).toEqual(
        sourcePiece.shape.points.map((point) => ({ x: -point.x, y: point.y })),
      );
    }
  });
};

describe('generateTerrainLayout', () => {
  it('builds balanced non-overlapping layouts that keep deployment centers open', () => {
    for (let seed = 1; seed <= 10; seed += 1) {
      const layout = generateTerrainLayout({
        pieceCount: 18,
        random: mulberry32(seed),
        placementConfig: { strategy: 'balanced-coverage' },
      });
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
    const layout1 = generateTerrainLayout({ pieceCount: 16 });
    const layout2 = generateTerrainLayout({ pieceCount: 16 });
    const signature1 = layout1.pieces.map((piece) => `${piece.x.toFixed(1)},${piece.y.toFixed(1)}`).join('|');
    const signature2 = layout2.pieces.map((piece) => `${piece.x.toFixed(1)},${piece.y.toFixed(1)}`).join('|');

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
      expect(analyzeTerrainLayout(layout).overlaps).toHaveLength(0);
    });
  });

  it('random strategy does not enforce quarter balance', () => {
    const quarterDistributions = Array.from({ length: 12 }, (_, index) => {
      const layout = generateTerrainLayout({
        pieceCount: 16,
        random: mulberry32(index + 1),
        placementConfig: { strategy: 'random' },
      });

      expect(analyzeTerrainLayout(layout).overlaps).toHaveLength(0);
      return analyzeTerrainLayout(layout).quarterCounts;
    });

    expect(
      quarterDistributions.some((quarterCounts) => Math.max(...quarterCounts) - Math.min(...quarterCounts) > 1),
    ).toBe(true);
  });

  it('symmetrical strategy creates guaranteed mirrored pairs with matching shapes', () => {
    const layout = generateTerrainLayout({
      pieceCount: 16,
      widthInches: 48,
      heightInches: 72,
      random: mulberry32(42),
      placementConfig: { strategy: 'symmetrical' },
    });

    expect(layout.placementConfig?.strategy).toBe('symmetrical');
    expect(analyzeTerrainLayout(layout).overlaps).toHaveLength(0);
    expectVerticalMirroredPairs(layout);
  });

  it('asymmetric strategy creates an intentionally unbalanced layout', () => {
    let foundAsymmetric = false;

    for (let seed = 40; seed < 50; seed += 1) {
      const layout = generateTerrainLayout({
        pieceCount: 16,
        widthInches: 48,
        heightInches: 72,
        random: mulberry32(seed),
        placementConfig: { strategy: 'asymmetric' },
      });
      const leftCount = layout.pieces.filter((piece) => piece.x < layout.widthInches / 2).length;
      const rightCount = layout.pieces.filter((piece) => piece.x >= layout.widthInches / 2).length;

      expect(analyzeTerrainLayout(layout).overlaps).toHaveLength(0);

      if (Math.abs(leftCount - rightCount) > 2) {
        foundAsymmetric = true;
        break;
      }
    }

    expect(foundAsymmetric).toBe(true);
  });

  it('forceSymmetry changes balanced coverage into a mirrored layout', () => {
    const balancedLayout = generateTerrainLayout({
      pieceCount: 16,
      widthInches: 48,
      heightInches: 72,
      random: mulberry32(42),
      placementConfig: { strategy: 'balanced-coverage' },
    });
    const mirroredBalancedLayout = generateTerrainLayout({
      pieceCount: 16,
      widthInches: 48,
      heightInches: 72,
      random: mulberry32(42),
      placementConfig: {
        strategy: 'balanced-coverage',
        forceSymmetry: true,
      },
    });

    expect(balancedLayout.pieces.some((piece) => piece.id.endsWith('-mirror'))).toBe(false);
    expect(mirroredBalancedLayout.placementConfig?.forceSymmetry).toBe(true);
    expect(analyzeTerrainLayout(mirroredBalancedLayout).overlaps).toHaveLength(0);
    expectVerticalMirroredPairs(mirroredBalancedLayout);

    const mirroredCounts = analyzeTerrainLayout(mirroredBalancedLayout).quarterCounts;
    expect(Math.max(...mirroredCounts) - Math.min(...mirroredCounts)).toBeLessThanOrEqual(1);
  });

  it('normalizeLayout preserves placementConfig through save/load', () => {
    const layoutWithConfig = {
      version: 1,
      table: {
        widthInches: 48,
        heightInches: 72,
        deploymentDepthInches: 12,
        title: 'Test Layout',
      },
      pieces: [],
      placementConfig: {
        strategy: 'symmetrical',
        density: 'dense',
        prioritizeCover: true,
        deploymentZoneSafety: false,
        forceSymmetry: true,
      },
    };

    const normalized = normalizeLayout(layoutWithConfig);

    expect(normalized).not.toBeNull();
    expect(normalized?.placementConfig).toBeDefined();
    expect(normalized?.placementConfig?.strategy).toBe('symmetrical');
    expect(normalized?.placementConfig?.density).toBe('dense');
    expect(normalized?.placementConfig?.prioritizeCover).toBe(true);
    expect(normalized?.placementConfig?.deploymentZoneSafety).toBe(false);
    expect(normalized?.placementConfig?.forceSymmetry).toBe(true);
  });
});
