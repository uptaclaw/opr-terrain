/**
 * OPR Age of Fantasy terrain placement guidelines (Rulebook page 12)
 */

import type { TerrainPiece, TerrainTrait, TerrainShapeKind } from './types';
import { findClearEdgeToEdgeSightlinesForTerrain } from '../lib/lineOfSight';
import { getTemplateById, terrainCatalog } from './catalog';

export interface OPRGuidelines {
  minPieces: number;
  maxPieces: number;
  minCoveragePercent: number;
  minLosBlockingPercent: number;
  minCoverPercent: number;
  minDifficultPercent: number;
  dangerousPieces: number;
  minGapInches: number;
  maxGapInches: number;
}

export interface OPRValidation {
  pieceCount: number;
  meetsMinPieces: boolean;
  meetsMaxPieces: boolean;
  coveragePercent: number;
  meetsCoverage: boolean;
  losBlockingPercent: number;
  meetsLosBlocking: boolean;
  coverPercent: number;
  meetsCover: boolean;
  difficultPercent: number;
  meetsDifficult: boolean;
  dangerousCount: number;
  meetsDangerous: boolean;
  minGap: number;
  maxGap: number;
  meetsMinGap: boolean;
  meetsMaxGap: boolean;
  edgeToEdgeClear: boolean;
  allValid: boolean;
}

export const OPR_DEFAULT_GUIDELINES: OPRGuidelines = {
  minPieces: 10,
  maxPieces: 20, // More is better, but we cap at 20 for practical purposes
  minCoveragePercent: 50,
  minLosBlockingPercent: 50,
  minCoverPercent: 33,
  minDifficultPercent: 33,
  dangerousPieces: 2,
  minGapInches: 3,
  maxGapInches: 6,
};

/**
 * Calculate actual shape area based on terrain piece shape
 */
const getShapeArea = (piece: TerrainPiece): number => {
  switch (piece.shape.kind) {
    case 'circle':
      return Math.PI * piece.shape.radius * piece.shape.radius;
    case 'rectangle':
      return piece.shape.width * piece.shape.height;
    case 'polygon':
      // For polygons, use collision radius as approximation
      // Could improve with proper polygon area calculation if needed
      return Math.PI * piece.collisionRadius * piece.collisionRadius;
  }
};

/**
 * Calculate table coverage percentage based on terrain piece areas
 */
export const calculateCoveragePercent = (
  pieces: readonly TerrainPiece[],
  tableWidthInches: number,
  tableHeightInches: number,
): number => {
  const tableArea = tableWidthInches * tableHeightInches;
  
  // Calculate actual area based on shape
  const totalTerrainArea = pieces.reduce((sum, piece) => {
    return sum + getShapeArea(piece);
  }, 0);

  return (totalTerrainArea / tableArea) * 100;
};

/**
 * Check if a piece has a specific trait
 */
const hasTrait = (piece: TerrainPiece, trait: TerrainTrait): boolean => {
  return piece.traits.includes(trait);
};

/**
 * Calculate trait distribution percentages
 */
export const calculateTraitDistribution = (pieces: readonly TerrainPiece[]) => {
  const total = pieces.length;
  
  const losBlocking = pieces.filter(p => hasTrait(p, 'LoS Blocking')).length;
  const cover = pieces.filter(p => hasTrait(p, 'Soft Cover') || hasTrait(p, 'Hard Cover')).length;
  const difficult = pieces.filter(p => hasTrait(p, 'Difficult')).length;
  const dangerous = pieces.filter(p => hasTrait(p, 'Dangerous')).length;

  return {
    losBlockingPercent: total > 0 ? (losBlocking / total) * 100 : 0,
    coverPercent: total > 0 ? (cover / total) * 100 : 0,
    difficultPercent: total > 0 ? (difficult / total) * 100 : 0,
    dangerousCount: dangerous,
  };
};

/**
 * Calculate minimum gap between any two pieces
 */
export const calculateMinGap = (pieces: readonly TerrainPiece[]): number => {
  if (pieces.length < 2) return Infinity;

  let minGap = Infinity;

  for (let i = 0; i < pieces.length; i++) {
    for (let j = i + 1; j < pieces.length; j++) {
      const pieceA = pieces[i]!;
      const pieceB = pieces[j]!;
      const distance = Math.hypot(pieceA.x - pieceB.x, pieceA.y - pieceB.y);
      const gap = distance - pieceA.collisionRadius - pieceB.collisionRadius;
      minGap = Math.min(minGap, gap);
    }
  }

  return minGap;
};

/**
 * Calculate maximum gap between adjacent pieces
 * Uses a grid-based approach to find large empty spaces
 */
export const calculateMaxGap = (
  pieces: readonly TerrainPiece[],
  tableWidthInches: number,
  tableHeightInches: number,
): number => {
  // Create a simple grid to find largest empty areas.
  // Use numeric cell indexes so we can flood-fill each empty region once
  // instead of re-running the same BFS from every empty cell.
  const gridSize = 1; // 1 inch cells
  const cols = Math.ceil(tableWidthInches / gridSize);
  const rows = Math.ceil(tableHeightInches / gridSize);
  const cellCount = cols * rows;
  const occupied = new Uint8Array(cellCount);
  const exploredEmpty = new Uint8Array(cellCount);
  const toIndex = (col: number, row: number) => row * cols + col;

  for (const piece of pieces) {
    const radius = piece.collisionRadius;
    const minCol = Math.max(0, Math.floor((piece.x - radius) / gridSize));
    const maxCol = Math.min(cols - 1, Math.floor((piece.x + radius) / gridSize));
    const minRow = Math.max(0, Math.floor((piece.y - radius) / gridSize));
    const maxRow = Math.min(rows - 1, Math.floor((piece.y + radius) / gridSize));

    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        const cellX = col * gridSize + gridSize / 2;
        const cellY = row * gridSize + gridSize / 2;
        const dist = Math.hypot(cellX - piece.x, cellY - piece.y);

        if (dist <= radius) {
          occupied[toIndex(col, row)] = 1;
        }
      }
    }
  }

  let maxGap = 0;
  const queueCols: number[] = [];
  const queueRows: number[] = [];
  const neighborOffsets: Array<[number, number]> = [[0, 1], [1, 0], [0, -1], [-1, 0]];

  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      const startIndex = toIndex(col, row);

      if (occupied[startIndex] || exploredEmpty[startIndex]) {
        continue;
      }

      queueCols.length = 0;
      queueRows.length = 0;
      queueCols.push(col);
      queueRows.push(row);
      exploredEmpty[startIndex] = 1;

      let area = 0;
      let head = 0;

      while (head < queueCols.length) {
        const currentCol = queueCols[head]!;
        const currentRow = queueRows[head]!;
        head += 1;
        area += 1;

        for (const [dc, dr] of neighborOffsets) {
          const nextCol = currentCol + dc;
          const nextRow = currentRow + dr;

          if (nextCol < 0 || nextCol >= cols || nextRow < 0 || nextRow >= rows) {
            continue;
          }

          const nextIndex = toIndex(nextCol, nextRow);

          if (occupied[nextIndex] || exploredEmpty[nextIndex]) {
            continue;
          }

          exploredEmpty[nextIndex] = 1;
          queueCols.push(nextCol);
          queueRows.push(nextRow);
        }
      }

      // Convert area to approximate diameter.
      const diameter = Math.sqrt(area) * gridSize;
      maxGap = Math.max(maxGap, diameter);
    }
  }

  return maxGap;
};

/**
 * Check whether any clear sightline remains between the opposite long edges of the table.
 * Every terrain piece counts as blocking terrain for this validation.
 */
export const hasEdgeToEdgeSightline = (
  pieces: readonly TerrainPiece[],
  tableWidthInches: number,
  tableHeightInches: number,
): boolean =>
  findClearEdgeToEdgeSightlinesForTerrain(pieces, tableWidthInches, tableHeightInches).clearSightlineCount > 0;

/**
 * Validate terrain layout against OPR guidelines
 */
export const validateOPRLayout = (
  pieces: readonly TerrainPiece[],
  tableWidthInches: number,
  tableHeightInches: number,
  guidelines: OPRGuidelines = OPR_DEFAULT_GUIDELINES,
): OPRValidation => {
  const pieceCount = pieces.length;
  const coveragePercent = calculateCoveragePercent(pieces, tableWidthInches, tableHeightInches);
  const traits = calculateTraitDistribution(pieces);
  const minGap = calculateMinGap(pieces);
  const maxGap = calculateMaxGap(pieces, tableWidthInches, tableHeightInches);
  const edgeToEdgeClear = !hasEdgeToEdgeSightline(pieces, tableWidthInches, tableHeightInches);

  const validation: OPRValidation = {
    pieceCount,
    meetsMinPieces: pieceCount >= guidelines.minPieces,
    meetsMaxPieces: pieceCount <= guidelines.maxPieces,
    coveragePercent,
    meetsCoverage: coveragePercent >= guidelines.minCoveragePercent,
    losBlockingPercent: traits.losBlockingPercent,
    meetsLosBlocking: traits.losBlockingPercent >= guidelines.minLosBlockingPercent,
    coverPercent: traits.coverPercent,
    meetsCover: traits.coverPercent >= guidelines.minCoverPercent,
    difficultPercent: traits.difficultPercent,
    meetsDifficult: traits.difficultPercent >= guidelines.minDifficultPercent,
    dangerousCount: traits.dangerousCount,
    meetsDangerous: traits.dangerousCount === guidelines.dangerousPieces,
    minGap,
    maxGap,
    meetsMinGap: minGap >= guidelines.minGapInches,
    meetsMaxGap: maxGap <= guidelines.maxGapInches,
    edgeToEdgeClear,
    allValid: false, // Set below
  };

  validation.allValid =
    validation.meetsMinPieces &&
    validation.meetsMaxPieces &&
    validation.meetsCoverage &&
    validation.meetsLosBlocking &&
    validation.meetsCover &&
    validation.meetsDifficult &&
    validation.meetsDangerous &&
    validation.meetsMinGap &&
    validation.meetsMaxGap &&
    validation.edgeToEdgeClear;

  return validation;
};

/**
 * Build terrain selection following OPR trait requirements
 */
export const buildOPRTerrainSelection = (
  targetCount: number,
  random: () => number,
): Array<{ templateId: string; shapeKind: TerrainShapeKind }> => {
  const selections: Array<{ templateId: string; shapeKind: TerrainShapeKind }> = [];
  
  // Calculate required counts
  const minLosBlocking = Math.ceil(targetCount * 0.5);
  const minCover = Math.ceil(targetCount * 0.33);
  const minDifficult = Math.ceil(targetCount * 0.33);
  const dangerousCount = 2;
  
  // Categorize templates
  const losBlockingTemplates = terrainCatalog.filter(t => t.traits.includes('LoS Blocking'));
  const coverTemplates = terrainCatalog.filter(t => 
    t.traits.includes('Soft Cover') || t.traits.includes('Hard Cover')
  );
  const difficultTemplates = terrainCatalog.filter(t => t.traits.includes('Difficult'));
  const dangerousTemplates = terrainCatalog.filter(t => t.traits.includes('Dangerous'));
  
  // Helper to pick random template and shape
  const pickTemplate = (templates: typeof terrainCatalog) => {
    const template = templates[Math.floor(random() * templates.length)]!;
    const shapeKind = template.shapeKinds[Math.floor(random() * template.shapeKinds.length)]!;
    return { templateId: template.id, shapeKind };
  };
  
  // Helper to recount traits (handles multi-trait pieces)
  const recountTraits = () => {
    const losBlocking = selections.filter(s => {
      const t = getTemplateById(s.templateId);
      return t.traits.includes('LoS Blocking');
    }).length;
    
    const cover = selections.filter(s => {
      const t = getTemplateById(s.templateId);
      return t.traits.includes('Soft Cover') || t.traits.includes('Hard Cover');
    }).length;
    
    const difficult = selections.filter(s => {
      const t = getTemplateById(s.templateId);
      return t.traits.includes('Difficult');
    }).length;
    
    const dangerous = selections.filter(s => {
      const t = getTemplateById(s.templateId);
      return t.traits.includes('Dangerous');
    }).length;
    
    return { losBlocking, cover, difficult, dangerous };
  };
  
  // Add exactly 2 dangerous pieces
  for (let i = 0; i < dangerousCount && selections.length < targetCount; i++) {
    selections.push(pickTemplate(dangerousTemplates));
  }
  
  // Prioritize LoS blocking (50% requirement)
  while (selections.length < targetCount) {
    const counts = recountTraits();
    
    // Never exceed 2 dangerous pieces
    const nonDangerousTemplates = terrainCatalog.filter(t => !t.traits.includes('Dangerous'));
    
    if (counts.losBlocking < minLosBlocking && losBlockingTemplates.length > 0) {
      // Pick from LoS blocking that aren't dangerous, or already added dangerous
      const safeLosBlocking = losBlockingTemplates.filter(t => 
        !t.traits.includes('Dangerous') || counts.dangerous < dangerousCount
      );
      if (safeLosBlocking.length > 0) {
        selections.push(pickTemplate(safeLosBlocking));
      } else {
        selections.push(pickTemplate(losBlockingTemplates));
      }
    } else if (counts.cover < minCover && coverTemplates.length > 0) {
      const safeCover = coverTemplates.filter(t => 
        !t.traits.includes('Dangerous') || counts.dangerous < dangerousCount
      );
      if (safeCover.length > 0) {
        selections.push(pickTemplate(safeCover));
      } else {
        selections.push(pickTemplate(coverTemplates));
      }
    } else if (counts.difficult < minDifficult && difficultTemplates.length > 0) {
      const safeDifficult = difficultTemplates.filter(t => 
        !t.traits.includes('Dangerous') || counts.dangerous < dangerousCount
      );
      if (safeDifficult.length > 0) {
        selections.push(pickTemplate(safeDifficult));
      } else {
        selections.push(pickTemplate(difficultTemplates));
      }
    } else {
      // Fill remaining with random weighted selection (exclude dangerous if we have 2)
      const eligibleTemplates = counts.dangerous >= dangerousCount 
        ? nonDangerousTemplates 
        : terrainCatalog;
      
      const totalWeight = eligibleTemplates.reduce((sum, t) => sum + t.weight, 0);
      let roll = random() * totalWeight;
      
      for (const template of eligibleTemplates) {
        roll -= template.weight;
        if (roll <= 0) {
          const shapeKind = template.shapeKinds[Math.floor(random() * template.shapeKinds.length)]!;
          selections.push({ templateId: template.id, shapeKind });
          break;
        }
      }
    }
  }
  
  // Shuffle to avoid patterns
  for (let i = selections.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [selections[i], selections[j]] = [selections[j]!, selections[i]!];
  }
  
  return selections.slice(0, targetCount);
};
