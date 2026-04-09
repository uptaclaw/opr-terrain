import { getPieceHalfExtents, normalizeRotation } from './pieceBounds';

describe('piece bounds helpers', () => {
  it('normalizes rotations into the signed 180° range', () => {
    expect(normalizeRotation(270)).toBe(-90);
    expect(normalizeRotation(-225)).toBe(135);
    expect(normalizeRotation(180)).toBe(-180);
  });

  it('computes true half extents for arbitrarily rotated rectangles', () => {
    const bounds = getPieceHalfExtents({
      shape: 'rect',
      width: 12,
      height: 4,
      rotation: 45,
    });

    expect(bounds.halfWidth).toBeCloseTo(4 * Math.SQRT2, 5);
    expect(bounds.halfHeight).toBeCloseTo(4 * Math.SQRT2, 5);
  });

  it('computes rendered half extents for rotated diamonds from their actual points', () => {
    const bounds = getPieceHalfExtents({
      shape: 'diamond',
      width: 12,
      height: 4,
      rotation: 45,
    });

    expect(bounds.halfWidth).toBeCloseTo(3 * Math.SQRT2, 5);
    expect(bounds.halfHeight).toBeCloseTo(3 * Math.SQRT2, 5);
  });

  it('computes rendered half extents for rotated ellipses', () => {
    const bounds = getPieceHalfExtents({
      shape: 'ellipse',
      width: 12,
      height: 4,
      rotation: 45,
    });

    expect(bounds.halfWidth).toBeCloseTo(Math.sqrt(20), 5);
    expect(bounds.halfHeight).toBeCloseTo(Math.sqrt(20), 5);
  });
});
