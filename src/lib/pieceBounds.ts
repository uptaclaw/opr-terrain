import type { TerrainPiece } from '../types/layout';

type PieceGeometry = Pick<TerrainPiece, 'shape' | 'width' | 'height' | 'rotation'>;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export const normalizeRotation = (rotation: number) => ((((rotation + 180) % 360) + 360) % 360) - 180;

export const getPieceHalfExtents = (piece: PieceGeometry) => {
  const rotation = toRadians(normalizeRotation(piece.rotation));
  const cos = Math.abs(Math.cos(rotation));
  const sin = Math.abs(Math.sin(rotation));

  if (piece.shape === 'ellipse') {
    const radiusX = piece.width / 2;
    const radiusY = piece.height / 2;

    return {
      halfWidth: Math.hypot(radiusX * cos, radiusY * sin),
      halfHeight: Math.hypot(radiusX * sin, radiusY * cos),
    };
  }

  if (piece.shape === 'diamond') {
    return {
      halfWidth: Math.max((piece.width * cos) / 2, (piece.height * sin) / 2),
      halfHeight: Math.max((piece.width * sin) / 2, (piece.height * cos) / 2),
    };
  }

  return {
    halfWidth: (piece.width * cos + piece.height * sin) / 2,
    halfHeight: (piece.width * sin + piece.height * cos) / 2,
  };
};
