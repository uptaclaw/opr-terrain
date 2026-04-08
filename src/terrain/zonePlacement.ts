/**
 * Zone-based terrain placement for OPR compliance
 * 
 * This algorithm divides the table into zones and strategically places terrain
 * to ensure max gap ≤6", coverage ≥50%, and blocked edge-to-edge sightlines.
 */

import type { TerrainPiece, TerrainShapeKind } from './types';
import { getTemplateById } from './catalog';
import { createPiece } from './generateTerrainLayout';
import { validateOPRLayout, type OPRValidation } from './oprPlacement';

interface Zone {
  id: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  occupied: boolean;
  piece?: TerrainPiece;
}

interface ZonePlacementResult {
  pieces: TerrainPiece[];
  oprValidation: OPRValidation;
  success: boolean;
}

/**
 * Create a grid of zones for the table
 * Uses ~6" zones to ensure max gap ≤6" when each zone has terrain
 */
const createZoneGrid = (
  tableWidthInches: number,
  tableHeightInches: number,
  zoneSize: number = 6,
): Zone[] => {
  const zones: Zone[] = [];
  const cols = Math.ceil(tableWidthInches / zoneSize);
  const rows = Math.ceil(tableHeightInches / zoneSize);

  let zoneId = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const minX = col * zoneSize;
      const minY = row * zoneSize;
      const maxX = Math.min(minX + zoneSize, tableWidthInches);
      const maxY = Math.min(minY + zoneSize, tableHeightInches);
      
      zones.push({
        id: zoneId++,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
        width: maxX - minX,
        height: maxY - minY,
        minX,
        maxX,
        minY,
        maxY,
        occupied: false,
      });
    }
  }

  return zones;
};

/**
 * Check if two pieces overlap (including collision buffer)
 */
const piecesOverlap = (
  piece1: TerrainPiece,
  piece2: TerrainPiece,
  collisionBufferInches: number,
): boolean => {
  const distance = Math.hypot(piece1.x - piece2.x, piece1.y - piece2.y);
  const minDistance = piece1.collisionRadius + piece2.collisionRadius + collisionBufferInches;
  return distance < minDistance;
};

/**
 * Check if a piece would collide with deployment zones
 */
const collidesWithDeployment = (
  piece: TerrainPiece,
  tableWidthInches: number,
  tableHeightInches: number,
  deploymentDepthInches: number,
): boolean => {
  const radius = piece.collisionRadius;
  
  // Top deployment zone
  if (piece.y - radius < deploymentDepthInches) return true;
  
  // Bottom deployment zone
  if (piece.y + radius > tableHeightInches - deploymentDepthInches) return true;
  
  return false;
};

/**
 * Try to place a piece in a zone, respecting collision and deployment constraints
 */
const tryPlaceInZone = (
  zone: Zone,
  pieceSpec: { templateId: string; shapeKind: TerrainShapeKind },
  pieceIndex: number,
  placedPieces: TerrainPiece[],
  tableWidthInches: number,
  tableHeightInches: number,
  deploymentDepthInches: number,
  collisionBufferInches: number,
  random: () => number,
  maxAttempts: number = 20,
): TerrainPiece | null => {
  const template = getTemplateById(pieceSpec.templateId);
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Create piece at zone center with some randomization
    const offsetX = (random() - 0.5) * zone.width * 0.6; // Use 60% of zone width
    const offsetY = (random() - 0.5) * zone.height * 0.6;
    
    const piece = createPiece(pieceSpec, pieceIndex, random);
    piece.x = Math.max(
      piece.collisionRadius,
      Math.min(tableWidthInches - piece.collisionRadius, zone.centerX + offsetX)
    );
    piece.y = Math.max(
      piece.collisionRadius,
      Math.min(tableHeightInches - piece.collisionRadius, zone.centerY + offsetY)
    );
    
    // Check deployment zone collision
    if (collidesWithDeployment(piece, tableWidthInches, tableHeightInches, deploymentDepthInches)) {
      continue;
    }
    
    // Check collisions with already placed pieces
    let hasCollision = false;
    for (const otherPiece of placedPieces) {
      if (piecesOverlap(piece, otherPiece, collisionBufferInches)) {
        hasCollision = true;
        break;
      }
    }
    
    if (!hasCollision) {
      return piece;
    }
  }
  
  return null;
};

/**
 * Select zones to fill based on OPR requirements:
 * - Block edge-to-edge sightlines (fill center zones)
 * - Ensure good coverage (distribute across table)
 * - Maintain spacing (avoid adjacent zones when possible)
 */
const selectZonesToFill = (
  zones: Zone[],
  targetPieceCount: number,
  tableWidthInches: number,
  tableHeightInches: number,
  random: () => number,
): Zone[] => {
  const selectedZones: Zone[] = [];
  const cols = Math.ceil(tableWidthInches / 6);
  const rows = Math.ceil(tableHeightInches / 6);
  
  // Helper to get zone by row/col
  const getZone = (row: number, col: number): Zone | undefined => {
    if (row < 0 || row >= rows || col < 0 || col >= cols) return undefined;
    return zones[row * cols + col];
  };
  
  // Priority 1: Fill center zones to block edge-to-edge sightlines
  // Place LoS-blocking pieces along horizontal and vertical center lines
  const centerRow = Math.floor(rows / 2);
  const centerCol = Math.floor(cols / 2);
  
  // Add center zones first
  const centerZones: Zone[] = [];
  for (let col = 0; col < cols; col++) {
    const zone = getZone(centerRow, col);
    if (zone) centerZones.push(zone);
  }
  for (let row = 0; row < rows; row++) {
    if (row === centerRow) continue; // Already added
    const zone = getZone(row, centerCol);
    if (zone) centerZones.push(zone);
  }
  
  // Shuffle and take subset of center zones
  const shuffledCenter = centerZones.sort(() => random() - 0.5);
  const centerCount = Math.min(Math.ceil(targetPieceCount * 0.4), shuffledCenter.length);
  selectedZones.push(...shuffledCenter.slice(0, centerCount));
  
  // Priority 2: Fill remaining zones to ensure coverage and spacing
  const remainingZones = zones.filter(z => !selectedZones.includes(z));
  
  // Use a grid pattern to ensure max gap ≤6"
  // Every other zone should be filled to create a checkerboard-like pattern
  const checkerboardZones: Zone[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Checkerboard pattern: fill zones where (row + col) is even
      if ((row + col) % 2 === 0) {
        const zone = getZone(row, col);
        if (zone && !selectedZones.includes(zone)) {
          checkerboardZones.push(zone);
        }
      }
    }
  }
  
  // Add checkerboard zones
  const shuffledCheckerboard = checkerboardZones.sort(() => random() - 0.5);
  const neededCount = targetPieceCount - selectedZones.length;
  
  if (neededCount > 0) {
    selectedZones.push(...shuffledCheckerboard.slice(0, neededCount));
  }
  
  // If still need more, add random remaining zones
  if (selectedZones.length < targetPieceCount) {
    const stillRemaining = zones.filter(z => !selectedZones.includes(z));
    const shuffledRemaining = stillRemaining.sort(() => random() - 0.5);
    selectedZones.push(...shuffledRemaining.slice(0, targetPieceCount - selectedZones.length));
  }
  
  return selectedZones;
};

/**
 * Zone-based placement algorithm
 * 
 * Returns null if placement fails (couldn't place all pieces)
 */
export const generateZonePlacement = (
  pieceSpecs: Array<{ templateId: string; shapeKind: TerrainShapeKind }>,
  tableWidthInches: number,
  tableHeightInches: number,
  deploymentDepthInches: number,
  collisionBufferInches: number,
  random: () => number,
): ZonePlacementResult | null => {
  const zones = createZoneGrid(tableWidthInches, tableHeightInches);
  const selectedZones = selectZonesToFill(zones, pieceSpecs.length, tableWidthInches, tableHeightInches, random);
  
  // Sort pieceSpecs to place LoS-blocking pieces first (for center zones)
  const sortedSpecs = [...pieceSpecs].sort((a, b) => {
    const templateA = getTemplateById(a.templateId);
    const templateB = getTemplateById(b.templateId);
    const aBlocksLoS = templateA.traits.includes('LoS Blocking') ? 1 : 0;
    const bBlocksLoS = templateB.traits.includes('LoS Blocking') ? 1 : 0;
    return bBlocksLoS - aBlocksLoS; // LoS blocking first
  });
  
  const placedPieces: TerrainPiece[] = [];
  
  // Place pieces in selected zones
  for (let i = 0; i < sortedSpecs.length && i < selectedZones.length; i++) {
    const spec = sortedSpecs[i]!;
    const zone = selectedZones[i]!;
    
    const piece = tryPlaceInZone(
      zone,
      spec,
      i,
      placedPieces,
      tableWidthInches,
      tableHeightInches,
      deploymentDepthInches,
      collisionBufferInches,
      random,
    );
    
    if (!piece) {
      // Failed to place piece in this zone, try next zone
      // Find an unoccupied zone
      let placedSuccessfully = false;
      for (const fallbackZone of zones) {
        if (fallbackZone.occupied) continue;
        
        const fallbackPiece = tryPlaceInZone(
          fallbackZone,
          spec,
          i,
          placedPieces,
          tableWidthInches,
          tableHeightInches,
          deploymentDepthInches,
          collisionBufferInches,
          random,
        );
        
        if (fallbackPiece) {
          placedPieces.push(fallbackPiece);
          fallbackZone.occupied = true;
          fallbackZone.piece = fallbackPiece;
          placedSuccessfully = true;
          break;
        }
      }
      
      if (!placedSuccessfully) {
        // Could not place this piece anywhere
        return null;
      }
    } else {
      placedPieces.push(piece);
      zone.occupied = true;
      zone.piece = piece;
    }
  }
  
  const oprValidation = validateOPRLayout(placedPieces, tableWidthInches, tableHeightInches);
  
  return {
    pieces: placedPieces,
    oprValidation,
    success: oprValidation.allValid,
  };
};

/**
 * Generate zone-based placement with retries until OPR-compliant
 * 
 * Tries up to maxAttempts times to generate a compliant layout
 */
export const generateOPRCompliantLayout = (
  pieceSpecs: Array<{ templateId: string; shapeKind: TerrainShapeKind }>,
  tableWidthInches: number,
  tableHeightInches: number,
  deploymentDepthInches: number,
  collisionBufferInches: number,
  random: () => number,
  maxAttempts: number = 5, // Reduced from 10
): ZonePlacementResult | null => {
  let bestResult: ZonePlacementResult | null = null;
  let bestScore = -Infinity;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = generateZonePlacement(
      pieceSpecs,
      tableWidthInches,
      tableHeightInches,
      deploymentDepthInches,
      collisionBufferInches,
      random,
    );
    
    if (!result) continue;
    
    // If fully compliant, return immediately
    if (result.success) {
      return result;
    }
    
    // Otherwise, score partial compliance (lightweight scoring to avoid expensive validation)
    const validation = result.oprValidation;
    const score = 
      (validation.meetsMinPieces ? 1 : 0) +
      (validation.meetsLosBlocking ? 5 : 0) +
      (validation.meetsDangerous ? 2 : 0) +
      (validation.meetsMinGap ? 5 : 0);
    
    if (score > bestScore) {
      bestScore = score;
      bestResult = result;
    }
  }
  
  return bestResult;
};
