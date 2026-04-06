import { describe, expect, it } from 'vitest';
import {
  getClusterCenter,
  getLaneCenter,
  getMirroredPosition,
  getPlacementDensityMultiplier,
  getQuarterIndex,
  getStrategyDescription,
} from './placementStrategies';

describe('placementStrategies', () => {
  describe('getQuarterIndex', () => {
    it('returns correct quarter indices for a 48×72 table', () => {
      expect(getQuarterIndex(12, 18, 48, 72)).toBe(0); // NW
      expect(getQuarterIndex(36, 18, 48, 72)).toBe(1); // NE
      expect(getQuarterIndex(12, 54, 48, 72)).toBe(2); // SW
      expect(getQuarterIndex(36, 54, 48, 72)).toBe(3); // SE
    });

    it('handles edge cases at boundaries', () => {
      expect(getQuarterIndex(24, 36, 48, 72)).toBe(3); // exactly at center - both >= midpoint
      expect(getQuarterIndex(0, 0, 48, 72)).toBe(0); // corner
      expect(getQuarterIndex(48, 72, 48, 72)).toBe(3); // opposite corner
    });
  });

  describe('getMirroredPosition', () => {
    it('mirrors vertically across the center line', () => {
      const mirrored = getMirroredPosition(12, 36, 48, 72, 'vertical');
      expect(mirrored.x).toBe(36); // 48 - 12
      expect(mirrored.y).toBe(36); // unchanged
    });

    it('mirrors horizontally across the center line', () => {
      const mirrored = getMirroredPosition(24, 18, 48, 72, 'horizontal');
      expect(mirrored.x).toBe(24); // unchanged
      expect(mirrored.y).toBe(54); // 72 - 18
    });

    it('handles center positions', () => {
      const verticalMirror = getMirroredPosition(24, 36, 48, 72, 'vertical');
      expect(verticalMirror.x).toBe(24); // stays at center
      
      const horizontalMirror = getMirroredPosition(24, 36, 48, 72, 'horizontal');
      expect(horizontalMirror.y).toBe(36); // stays at center
    });
  });

  describe('getClusterCenter', () => {
    it('returns distinct centers for multiple clusters', () => {
      const random = () => 0.5;
      const cluster0 = getClusterCenter(0, 3, 48, 72, random);
      const cluster1 = getClusterCenter(1, 3, 48, 72, random);
      const cluster2 = getClusterCenter(2, 3, 48, 72, random);

      // Clusters should be in different areas
      expect(cluster0.x).not.toBe(cluster1.x);
      expect(cluster1.x).not.toBe(cluster2.x);
      
      // All should be within table bounds
      expect(cluster0.x).toBeGreaterThan(0);
      expect(cluster0.x).toBeLessThan(48);
      expect(cluster1.y).toBeGreaterThan(0);
      expect(cluster2.y).toBeLessThan(72);
    });

    it('distributes clusters evenly across the table', () => {
      const random = () => 0.5;
      const clusterCount = 4;
      const clusters = Array.from({ length: clusterCount }, (_, i) =>
        getClusterCenter(i, clusterCount, 48, 72, random)
      );

      // With 4 clusters, expect 2×2 grid pattern
      const xValues = clusters.map(c => c.x);
      const yValues = clusters.map(c => c.y);
      
      // Should have multiple distinct x and y values
      const uniqueXValues = new Set(xValues.map(x => Math.round(x)));
      const uniqueYValues = new Set(yValues.map(y => Math.round(y)));
      
      expect(uniqueXValues.size).toBeGreaterThan(1);
      expect(uniqueYValues.size).toBeGreaterThan(1);
    });
  });

  describe('getLaneCenter', () => {
    it('creates vertical lanes for portrait tables', () => {
      const lane0 = getLaneCenter(0, 3, 48, 72);
      const lane1 = getLaneCenter(1, 3, 48, 72);
      const lane2 = getLaneCenter(2, 3, 48, 72);

      // All lanes should be centered vertically
      expect(lane0.y).toBe(36);
      expect(lane1.y).toBe(36);
      expect(lane2.y).toBe(36);

      // Lanes should be spaced horizontally
      expect(lane0.x).toBeLessThan(lane1.x);
      expect(lane1.x).toBeLessThan(lane2.x);
      
      // First and last lane should be away from edges
      expect(lane0.x).toBeGreaterThan(0);
      expect(lane2.x).toBeLessThan(48);
    });

    it('creates horizontal lanes for landscape tables', () => {
      const lane0 = getLaneCenter(0, 3, 72, 48);
      const lane1 = getLaneCenter(1, 3, 72, 48);
      const lane2 = getLaneCenter(2, 3, 72, 48);

      // All lanes should be centered horizontally
      expect(lane0.x).toBe(36);
      expect(lane1.x).toBe(36);
      expect(lane2.x).toBe(36);

      // Lanes should be spaced vertically
      expect(lane0.y).toBeLessThan(lane1.y);
      expect(lane1.y).toBeLessThan(lane2.y);
    });
  });

  describe('getPlacementDensityMultiplier', () => {
    it('returns correct multipliers for each density level', () => {
      expect(getPlacementDensityMultiplier('sparse')).toBe(0.75);
      expect(getPlacementDensityMultiplier('balanced')).toBe(1.0);
      expect(getPlacementDensityMultiplier('dense')).toBe(1.25);
    });
  });

  describe('getStrategyDescription', () => {
    it('returns descriptions for all strategies', () => {
      const strategies = [
        'random',
        'balanced-coverage',
        'symmetrical',
        'asymmetric',
        'clustered-zones',
        'los-blocking-lanes',
      ] as const;

      strategies.forEach((strategy) => {
        const description = getStrategyDescription(strategy);
        expect(description).toBeTruthy();
        expect(description.length).toBeGreaterThan(10);
      });
    });
  });
});
