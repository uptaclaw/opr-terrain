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

const DEFAULT_TEST_PIECE_COUNT = 12;
const DEFAULT_TEST_TIMEOUT = 30000;

const layoutSignature = (seed: number) => {
  const layout = generateTerrainLayout({ pieceCount: DEFAULT_TEST_PIECE_COUNT, random: mulberry32(seed) });

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
    for (let seed = 1; seed <= 5; seed += 1) {
      const layout = generateTerrainLayout({
        pieceCount: DEFAULT_TEST_PIECE_COUNT,
        random: mulberry32(seed),
        placementConfig: { strategy: 'balanced-coverage' },
      });
      const analysis = analyzeTerrainLayout(layout);
      const nonZeroShapeKinds = Object.values(analysis.shapeCounts).filter((count) => count > 0);

      expect(layout.pieces).toHaveLength(DEFAULT_TEST_PIECE_COUNT);
      expect(layout.widthInches).toBe(48);
      expect(layout.heightInches).toBe(72);
      expect(Math.max(...analysis.quarterCounts)).toBeLessThanOrEqual(4);
      expect(analysis.overlaps).toHaveLength(0);
      expect(analysis.deploymentCenterIntrusions).toHaveLength(0);
      expect(nonZeroShapeKinds.length).toBeGreaterThanOrEqual(2);
      expect(Object.keys(analysis.templateCounts).length).toBeGreaterThanOrEqual(3);
    }
  }, DEFAULT_TEST_TIMEOUT);

  it('changes the generated layout when the random seed changes', () => {
    expect(layoutSignature(7)).not.toBe(layoutSignature(8));
  }, DEFAULT_TEST_TIMEOUT);

  it('generates different layouts with each call when no random function is provided', () => {
    const layout1 = generateTerrainLayout({ pieceCount: DEFAULT_TEST_PIECE_COUNT });
    const layout2 = generateTerrainLayout({ pieceCount: DEFAULT_TEST_PIECE_COUNT });
    const signature1 = layout1.pieces.map((piece) => `${piece.x.toFixed(1)},${piece.y.toFixed(1)}`).join('|');
    const signature2 = layout2.pieces.map((piece) => `${piece.x.toFixed(1)},${piece.y.toFixed(1)}`).join('|');

    expect(signature1).not.toBe(signature2);
  }, DEFAULT_TEST_TIMEOUT);

  it('applies density multipliers correctly', () => {
    const basePieceCount = 8; // Reduced from 12 for larger pieces
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
  }, DEFAULT_TEST_TIMEOUT);

  it('generates layouts with different strategies', () => {
    const strategies = [
      'random',
      'balanced-coverage',
      'symmetrical',
      'asymmetric',
      'clustered-zones',
      'los-blocking-lanes',
    ] as const;
    const seeds = [7, 21, 42, 84, 100, 123, 999]; // More seeds for retries

    strategies.forEach((strategy) => {
      let layout: ReturnType<typeof generateTerrainLayout> | null = null;
      let lastError: unknown = null;

      for (const seed of seeds) {
        try {
          layout = generateTerrainLayout({
            pieceCount: 6, // Reduced to 6 for difficult strategies with larger pieces
            random: mulberry32(seed),
            placementConfig: { strategy },
          });
          break;
        } catch (error) {
          lastError = error;
        }
      }

      if (!layout) {
        throw lastError instanceof Error ? lastError : new Error(`Strategy ${strategy} failed to generate a layout.`);
      }

      expect(layout.pieces.length).toBeGreaterThan(0);
      expect(layout.placementConfig?.strategy).toBe(strategy);
      expect(analyzeTerrainLayout(layout).overlaps).toHaveLength(0);
    });
  }, DEFAULT_TEST_TIMEOUT);

  it('random strategy does not enforce quarter balance', () => {
    const quarterDistributions = Array.from({ length: 8 }, (_, index) => {
      const layout = generateTerrainLayout({
        pieceCount: DEFAULT_TEST_PIECE_COUNT,
        random: mulberry32(index + 1),
        placementConfig: { strategy: 'random' },
      });
      const analysis = analyzeTerrainLayout(layout);

      expect(analysis.overlaps).toHaveLength(0);
      return analysis.quarterCounts;
    });

    expect(
      quarterDistributions.some((quarterCounts) => Math.max(...quarterCounts) - Math.min(...quarterCounts) > 1),
    ).toBe(true);
  }, DEFAULT_TEST_TIMEOUT);

  it('symmetrical strategy creates guaranteed mirrored pairs with matching shapes', () => {
    const layout = generateTerrainLayout({
      pieceCount: 8, // Reduced from 12 for larger pieces
      widthInches: 48,
      heightInches: 72,
      random: mulberry32(42),
      placementConfig: { strategy: 'symmetrical' },
    });

    expect(layout.placementConfig?.strategy).toBe('symmetrical');
    expect(analyzeTerrainLayout(layout).overlaps).toHaveLength(0);
    expectVerticalMirroredPairs(layout);
  }, DEFAULT_TEST_TIMEOUT);

  it('asymmetric strategy creates an intentionally unbalanced layout', () => {
    let foundAsymmetric = false;

    for (let seed = 40; seed < 46; seed += 1) {
      const layout = generateTerrainLayout({
        pieceCount: 8, // Reduced from 10 for larger pieces
        widthInches: 48,
        heightInches: 72,
        random: mulberry32(seed),
        placementConfig: { strategy: 'asymmetric' },
      });
      const averageX = layout.pieces.reduce((sum, piece) => sum + piece.x, 0) / layout.pieces.length;

      expect(analyzeTerrainLayout(layout).overlaps).toHaveLength(0);

      if (Math.abs(averageX - layout.widthInches / 2) > 1.5) {
        foundAsymmetric = true;
        break;
      }
    }

    expect(foundAsymmetric).toBe(true);
  }, DEFAULT_TEST_TIMEOUT);

  it('forceSymmetry changes balanced coverage into a mirrored layout', () => {
    const balancedLayout = generateTerrainLayout({
      pieceCount: 8, // Reduced from 12 for larger pieces
      widthInches: 48,
      heightInches: 72,
      random: mulberry32(42),
      placementConfig: { strategy: 'balanced-coverage' },
    });
    const mirroredBalancedLayout = generateTerrainLayout({
      pieceCount: 8, // Reduced from 12 for larger pieces
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
  }, DEFAULT_TEST_TIMEOUT);

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
