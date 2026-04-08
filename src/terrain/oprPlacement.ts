/**
 * OPR Age of Fantasy terrain placement guidelines (Rulebook page 12)
 */

import type { TerrainPiece, TerrainTrait, TerrainShapeKind } from './types';
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
 * Calculate table coverage percentage based on terrain piece areas
 */
export const calculateCoveragePercent = (
  pieces: readonly TerrainPiece[],
  tableWidthInches: number,
  tableHeightInches: number,
): number => {
  const tableArea = tableWidthInches * tableHeightInches;
  
  // Estimate area based on collision radius (approximation)
  const totalTerrainArea = pieces.reduce((sum, piece) => {
    return sum + Math.PI * piece.collisionRadius * piece.collisionRadius;
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
  // Create a simple grid to find largest empty areas
  const gridSize = 1; // 1 inch cells
  const cols = Math.ceil(tableWidthInches / gridSize);
  const rows = Math.ceil(tableHeightInches / gridSize);
  
  // Mark cells occupied by terrain
  const occupied = new Set<string>();
  
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
          occupied.add(`${col},${row}`);
        }
      }
    }
  }
  
  // Find largest contiguous empty area
  let maxGap = 0;
  
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      if (!occupied.has(`${col},${row}`)) {
        // BFS to find size of this empty region
        const queue: Array<[number, number]> = [[col, row]];
        const visited = new Set<string>([`${col},${row}`]);
        let area = 0;
        
        while (queue.length > 0) {
          const [c, r] = queue.shift()!;
          area++;
          
          // Check 4 neighbors
          for (const [dc, dr] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
            const nc = c + dc;
            const nr = r + dr;
            const key = `${nc},${nr}`;
            
            if (nc >= 0 && nc < cols && nr >= 0 && nr < rows && !visited.has(key) && !occupied.has(key)) {
              visited.add(key);
              queue.push([nc, nr]);
            }
          }
        }
        
        // Convert area to approximate diameter
        const diameter = Math.sqrt(area) * gridSize;
        maxGap = Math.max(maxGap, diameter);
      }
    }
  }
  
  return maxGap;
};

/**
 * Check if there's a clear line of sight from edge to edge
 * Tests several points along each edge
 */
export const hasEdgeToEdgeSightline = (
  pieces: readonly TerrainPiece[],
  tableWidthInches: number,
  tableHeightInches: number,
): boolean => {
  const losBlockers = pieces.filter(p => hasTrait(p, 'LoS Blocking'));
  
  if (losBlockers.length === 0) return true;
  
  const testPoints = 5; // Test points along each edge
  
  // Test horizontal sightlines (left to right)
  for (let i = 0; i < testPoints; i++) {
    const y = (tableHeightInches / (testPoints - 1)) * i;
    let blocked = false;
    
    for (const piece of losBlockers) {
      // Check if line from (0, y) to (width, y) intersects piece
      if (Math.abs(piece.y - y) <= piece.collisionRadius) {
        blocked = true;
        break;
      }
    }
    
    if (!blocked) return true; // Found unblocked sightline
  }
  
  // Test vertical sightlines (top to bottom)
  for (let i = 0; i < testPoints; i++) {
    const x = (tableWidthInches / (testPoints - 1)) * i;
    let blocked = false;
    
    for (const piece of losBlockers) {
      // Check if line from (x, 0) to (x, height) intersects piece
      if (Math.abs(piece.x - x) <= piece.collisionRadius) {
        blocked = true;
        break;
      }
    }
    
    if (!blocked) return true; // Found unblocked sightline
  }
  
  return false; // All tested sightlines are blocked
};

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
  
  // Add exactly 2 dangerous pieces
  for (let i = 0; i < dangerousCount && selections.length < targetCount; i++) {
    selections.push(pickTemplate(dangerousTemplates));
  }
  
  // Track what we need
  let losBlockingAdded = selections.filter(s => {
    const t = getTemplateById(s.templateId);
    return t.traits.includes('LoS Blocking');
  }).length;
  
  let coverAdded = selections.filter(s => {
    const t = getTemplateById(s.templateId);
    return t.traits.includes('Soft Cover') || t.traits.includes('Hard Cover');
  }).length;
  
  let difficultAdded = selections.filter(s => {
    const t = getTemplateById(s.templateId);
    return t.traits.includes('Difficult');
  }).length;
  
  // Prioritize LoS blocking (50% requirement)
  while (losBlockingAdded < minLosBlocking && selections.length < targetCount) {
    selections.push(pickTemplate(losBlockingTemplates));
    losBlockingAdded++;
  }
  
  // Add cover pieces (33% requirement)
  while (coverAdded < minCover && selections.length < targetCount) {
    const template = coverTemplates[Math.floor(random() * coverTemplates.length)]!;
    const shapeKind = template.shapeKinds[Math.floor(random() * template.shapeKinds.length)]!;
    selections.push({ templateId: template.id, shapeKind });
    coverAdded++;
  }
  
  // Add difficult terrain (33% requirement)
  while (difficultAdded < minDifficult && selections.length < targetCount) {
    const template = difficultTemplates[Math.floor(random() * difficultTemplates.length)]!;
    const shapeKind = template.shapeKinds[Math.floor(random() * template.shapeKinds.length)]!;
    selections.push({ templateId: template.id, shapeKind });
    difficultAdded++;
  }
  
  // Fill remaining with random weighted selection
  while (selections.length < targetCount) {
    const totalWeight = terrainCatalog.reduce((sum, t) => sum + t.weight, 0);
    let roll = random() * totalWeight;
    
    for (const template of terrainCatalog) {
      roll -= template.weight;
      if (roll <= 0) {
        const shapeKind = template.shapeKinds[Math.floor(random() * template.shapeKinds.length)]!;
        selections.push({ templateId: template.id, shapeKind });
        break;
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
