import { describe, expect, it } from 'vitest';
import { generateOPRGridLayout } from './oprGridPlacement';
import { validateOPRLayout } from './oprPlacement';

const mulberry32 = (seed: number) => {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = Math.imul(value ^ (value >>> 15), value | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
};

describe('generateOPRGridLayout', () => {
  it('produces directly OPR-compliant 4x6 layouts', () => {
    for (const seed of [1, 42, 99]) {
      const pieces = generateOPRGridLayout({
        widthInches: 48,
        heightInches: 72,
        deploymentDepthInches: 12,
        targetPieceCount: 12,
        gapInches: 3,
        random: mulberry32(seed),
      });

      expect(pieces).not.toBeNull();
      const validation = validateOPRLayout(pieces!, 48, 72);
      expect(validation.allValid).toBe(true);
    }
  });
});
