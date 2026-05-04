import type { TerrainPiece } from '../types/layout';

/**
 * Calculate the total area coverage percentage for terrain pieces on a table.
 * 
 * This is a simple sum of all piece areas - it does NOT account for overlapping pieces.
 * The result is clamped to 0-100% range.
 * 
 * @param pieces - Array of terrain pieces to calculate coverage for
 * @param tableWidthInches - Table width in inches
 * @param tableHeightInches - Table height in inches
 * @returns Coverage percentage (0-100)
 */
export function calculateTableCoveragePercent(
  pieces: TerrainPiece[],
  tableWidthInches: number,
  tableHeightInches: number
): number {
  if (tableWidthInches <= 0 || tableHeightInches <= 0) {
    return 0;
  }

  const tableArea = tableWidthInches * tableHeightInches;
  
  const totalPieceArea = pieces.reduce((sum, piece) => {
    let area = 0;
    
    switch (piece.shape) {
      case 'rect':
        area = piece.width * piece.height;
        break;
      case 'ellipse':
        area = Math.PI * (piece.width / 2) * (piece.height / 2);
        break;
      case 'diamond':
        area = (piece.width * piece.height) / 2;
        break;
    }
    
    return sum + area;
  }, 0);

  const rawPercent = (totalPieceArea / tableArea) * 100;
  
  // Clamp to 0-100 range (overlapping pieces could push raw sum over 100)
  return Math.max(0, Math.min(100, rawPercent));
}
