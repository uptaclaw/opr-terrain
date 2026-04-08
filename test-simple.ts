import { generateTerrainLayout } from './src/terrain/generateTerrainLayout';

const mulberry32 = (seed: number) => {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = Math.imul(value ^ (value >>> 15), value | 1);
    result = Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4_294_967_296;
  };
};

// Test with a single seed
console.log('Testing zone-based OPR placement with seed 42...\n');

const layout = generateTerrainLayout({
  widthInches: 72,
  heightInches: 48,
  pieceCount: 12,
  random: mulberry32(42),
  maxLayoutAttempts: 5, // Limit attempts for testing
});

const v = layout.oprValidation;

console.log(`Pieces: ${v.pieceCount}`);
console.log(`Coverage: ${v.coveragePercent.toFixed(1)}% (need ≥50%): ${v.meetsCoverage ? '✓' : '✗'}`);
console.log(`Min gap: ${v.minGap.toFixed(1)}" (need ≥3"): ${v.meetsMinGap ? '✓' : '✗'}`);
console.log(`Max gap: ${v.maxGap.toFixed(1)}" (need ≤6"): ${v.meetsMaxGap ? '✓' : '✗'}`);
console.log(`LoS blocking: ${v.losBlockingPercent.toFixed(0)}% (need ≥50%): ${v.meetsLosBlocking ? '✓' : '✗'}`);
console.log(`Edge-to-edge blocked: ${v.edgeToEdgeClear ? '✓' : '✗'}`);
console.log(`\nALL VALID: ${v.allValid ? '✓✓✓ PASS' : '✗✗✗ FAIL'}`);
