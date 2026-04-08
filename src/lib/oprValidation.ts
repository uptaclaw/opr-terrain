import type { TerrainPiece } from '../types/layout';
import { getTerrainSummaryCategory } from './terrainSummary';

export type ValidationStatus = 'good' | 'warning' | 'fail';

export interface ValidationMetric {
  id: string;
  label: string;
  status: ValidationStatus;
  currentValue: number;
  targetValue?: number;
  unit: string;
  message: string;
  suggestion?: string;
}

export interface OPRValidationResult {
  metrics: ValidationMetric[];
  passedCount: number;
  totalCount: number;
  overallStatus: ValidationStatus;
}

const RECOMMENDED_MIN_PIECES = 10;
const RECOMMENDED_MAX_PIECES = 15;
const RECOMMENDED_COVERAGE_PERCENT = 50;
const RECOMMENDED_LOS_BLOCKING_PERCENT = 50;
const RECOMMENDED_COVER_PERCENT = 33;
const RECOMMENDED_DIFFICULT_PERCENT = 33;
const RECOMMENDED_DANGEROUS_COUNT = 2;
const MAX_GAP_INCHES = 6;
const MIN_MOVEMENT_GAP_INCHES = 3;

/**
 * Calculate the total area of all terrain pieces
 */
const calculateTerrainArea = (pieces: TerrainPiece[]): number => {
  return pieces.reduce((total, piece) => {
    // Approximate area for different shapes
    if (piece.shape === 'ellipse') {
      // Area of ellipse: π * (width/2) * (height/2)
      return total + Math.PI * (piece.width / 2) * (piece.height / 2);
    } else if (piece.shape === 'diamond') {
      // Area of diamond: (width * height) / 2
      return total + (piece.width * piece.height) / 2;
    } else {
      // Rectangle
      return total + piece.width * piece.height;
    }
  }, 0);
};

/**
 * Calculate coverage percentage (terrain area vs table area)
 */
const calculateCoverage = (pieces: TerrainPiece[], tableWidthInches: number, tableHeightInches: number): number => {
  const tableArea = tableWidthInches * tableHeightInches;
  const terrainArea = calculateTerrainArea(pieces);
  
  if (tableArea === 0) return 0;
  
  return Math.round((terrainArea / tableArea) * 100);
};

/**
 * Count pieces with specific trait categories
 */
const countPiecesWithTrait = (
  pieces: TerrainPiece[],
  traitIds: string[]
): number => {
  const uniquePieceIds = new Set<string>();
  
  pieces.forEach((piece) => {
    piece.traits.forEach((trait) => {
      if (!trait.active) return;
      
      const category = getTerrainSummaryCategory(trait);
      if (category && traitIds.includes(category)) {
        uniquePieceIds.add(piece.id);
      }
    });
  });
  
  return uniquePieceIds.size;
};

/**
 * Calculate percentage of pieces with a specific trait
 */
const calculateTraitPercentage = (
  pieces: TerrainPiece[],
  traitIds: string[]
): number => {
  if (pieces.length === 0) return 0;
  
  const count = countPiecesWithTrait(pieces, traitIds);
  return Math.round((count / pieces.length) * 100);
};

/**
 * Calculate the minimum distance between a piece and all other pieces
 */
const calculateMinDistanceBetweenPieces = (pieces: TerrainPiece[]): number => {
  if (pieces.length < 2) return Infinity;
  
  let minDistance = Infinity;
  
  for (let i = 0; i < pieces.length; i++) {
    for (let j = i + 1; j < pieces.length; j++) {
      const p1 = pieces[i];
      const p2 = pieces[j];
      
      // Calculate edge-to-edge distance (approximation for axis-aligned rectangles)
      const dx = Math.max(0, Math.abs(p1.x - p2.x) - (p1.width + p2.width) / 2);
      const dy = Math.max(0, Math.abs(p1.y - p2.y) - (p1.height + p2.height) / 2);
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      minDistance = Math.min(minDistance, distance);
    }
  }
  
  return minDistance;
};

/**
 * Detect gaps >6" and edge-to-edge table sightlines
 */
const analyzeSpacing = (
  pieces: TerrainPiece[],
  tableWidthInches: number,
  tableHeightInches: number
): { largeGaps: number; edgeSightlines: boolean; hasMovementGaps: boolean } => {
  if (pieces.length === 0) {
    return { largeGaps: 0, edgeSightlines: true, hasMovementGaps: false };
  }
  
  // Count gaps >6" between adjacent pieces
  let largeGaps = 0;
  
  for (let i = 0; i < pieces.length; i++) {
    for (let j = i + 1; j < pieces.length; j++) {
      const p1 = pieces[i];
      const p2 = pieces[j];
      
      // Calculate edge-to-edge distance
      const dx = Math.max(0, Math.abs(p1.x - p2.x) - (p1.width + p2.width) / 2);
      const dy = Math.max(0, Math.abs(p1.y - p2.y) - (p1.height + p2.height) / 2);
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > MAX_GAP_INCHES) {
        largeGaps++;
      }
    }
  }
  
  // Check for edge-to-edge sightlines (simplified: check if table edges are reasonably covered)
  // A piece "covers" an edge if it's within 12" of that edge
  const edgeMargin = 12;
  const hasTopEdgeCoverage = pieces.some(p => p.y - p.height / 2 < edgeMargin);
  const hasBottomEdgeCoverage = pieces.some(p => p.y + p.height / 2 > tableHeightInches - edgeMargin);
  const hasLeftEdgeCoverage = pieces.some(p => p.x - p.width / 2 < edgeMargin);
  const hasRightEdgeCoverage = pieces.some(p => p.x + p.width / 2 > tableWidthInches - edgeMargin);
  
  // Only flag if multiple edges are completely uncovered
  const uncoveredEdges = [
    !hasTopEdgeCoverage,
    !hasBottomEdgeCoverage,
    !hasLeftEdgeCoverage,
    !hasRightEdgeCoverage
  ].filter(Boolean).length;
  
  const edgeSightlines = uncoveredEdges >= 2;
  
  // Check if there are gaps ≥3" for large unit movement
  const hasMovementGaps = pieces.length < 2 || calculateMinDistanceBetweenPieces(pieces) >= MIN_MOVEMENT_GAP_INCHES;
  
  return { largeGaps, edgeSightlines, hasMovementGaps };
};

/**
 * Determine validation status based on value comparison
 */
const getStatus = (
  current: number,
  target: number,
  type: 'min' | 'range' | 'exact' | 'losBlocking' | 'coverage' | 'cover' | 'difficult' | 'spacing'
): ValidationStatus => {
  if (type === 'range') {
    // For piece count range (10-15)
    if (current >= RECOMMENDED_MIN_PIECES && current <= RECOMMENDED_MAX_PIECES) {
      return 'good';
    }
    if (current < RECOMMENDED_MIN_PIECES) {
      return 'warning';
    }
    return 'warning'; // More than 15 is informational
  }
  
  if (type === 'min' || type === 'exact') {
    // For exact counts (dangerous terrain = 2)
    if (current >= target) {
      return 'good';
    }
    return 'warning';
  }
  
  // LoS Blocking: fail if below target, warn if below but close
  if (type === 'losBlocking') {
    if (current >= target) {
      return 'good';
    }
    if (current > target * 0.66) {
      return 'warning';
    }
    return 'fail';
  }
  
  // Coverage, Cover, Difficult: warn if below target (not fail)
  if (type === 'coverage' || type === 'cover' || type === 'difficult') {
    if (current >= target) {
      return 'good';
    }
    return 'warning';
  }
  
  // Spacing: custom logic
  if (type === 'spacing') {
    // current represents a composite score (0 = all issues, 100 = perfect)
    if (current >= 100) {
      return 'good';
    }
    return 'warning';
  }
  
  return 'fail';
};

/**
 * Validate terrain layout against OPR Age of Fantasy recommendations
 */
export const validateOPRTerrain = (
  pieces: TerrainPiece[],
  tableWidthInches: number,
  tableHeightInches: number
): OPRValidationResult => {
  const metrics: ValidationMetric[] = [];
  
  // 1. Terrain Quantity
  const pieceCount = pieces.length;
  const quantityStatus = getStatus(pieceCount, RECOMMENDED_MIN_PIECES, 'range');
  let quantityMessage = '';
  let quantitySuggestion: string | undefined;
  
  if (pieceCount >= RECOMMENDED_MIN_PIECES && pieceCount <= RECOMMENDED_MAX_PIECES) {
    quantityMessage = `${pieceCount} pieces (optimal range)`;
  } else if (pieceCount < RECOMMENDED_MIN_PIECES) {
    quantityMessage = `${pieceCount} pieces (sparse)`;
    quantitySuggestion = `Add ${RECOMMENDED_MIN_PIECES - pieceCount} more piece${RECOMMENDED_MIN_PIECES - pieceCount === 1 ? '' : 's'} to reach minimum`;
  } else {
    quantityMessage = `${pieceCount} pieces (dense)`;
    quantitySuggestion = 'Dense terrain is fine, but ensure movement corridors remain';
  }
  
  metrics.push({
    id: 'quantity',
    label: 'Terrain Quantity',
    status: quantityStatus,
    currentValue: pieceCount,
    targetValue: RECOMMENDED_MIN_PIECES,
    unit: 'pieces',
    message: quantityMessage,
    suggestion: quantitySuggestion,
  });
  
  // 2. Coverage Potential
  const coverage = calculateCoverage(pieces, tableWidthInches, tableHeightInches);
  const coverageStatus = getStatus(coverage, RECOMMENDED_COVERAGE_PERCENT, 'coverage');
  let coverageMessage = `${coverage}% table coverage`;
  let coverageSuggestion: string | undefined;
  
  if (coverage < RECOMMENDED_COVERAGE_PERCENT) {
    coverageSuggestion = `Add larger pieces or more terrain to reach ${RECOMMENDED_COVERAGE_PERCENT}% coverage`;
  }
  
  metrics.push({
    id: 'coverage',
    label: 'Coverage Potential',
    status: coverageStatus,
    currentValue: coverage,
    targetValue: RECOMMENDED_COVERAGE_PERCENT,
    unit: '%',
    message: coverageMessage,
    suggestion: coverageSuggestion,
  });
  
  // 3. LoS Blocking
  const losBlockingCount = countPiecesWithTrait(pieces, ['los-blocking']);
  const losBlockingPercent = calculateTraitPercentage(pieces, ['los-blocking']);
  const losStatus = getStatus(losBlockingPercent, RECOMMENDED_LOS_BLOCKING_PERCENT, 'losBlocking');
  let losMessage = `${losBlockingCount}/${pieceCount} pieces (${losBlockingPercent}%)`;
  let losSuggestion: string | undefined;
  
  if (losBlockingPercent < RECOMMENDED_LOS_BLOCKING_PERCENT && pieceCount > 0) {
    const needed = Math.ceil((RECOMMENDED_LOS_BLOCKING_PERCENT / 100) * pieceCount) - losBlockingCount;
    losSuggestion = `Add LoS Blocking trait to ${needed} more piece${needed === 1 ? '' : 's'}`;
  }
  
  metrics.push({
    id: 'los-blocking',
    label: 'LoS Blocking',
    status: losStatus,
    currentValue: losBlockingPercent,
    targetValue: RECOMMENDED_LOS_BLOCKING_PERCENT,
    unit: '%',
    message: losMessage,
    suggestion: losSuggestion,
  });
  
  // 4. Cover Distribution
  const coverCount = countPiecesWithTrait(pieces, ['hard-cover', 'soft-cover']);
  const coverPercent = calculateTraitPercentage(pieces, ['hard-cover', 'soft-cover']);
  const coverStatus = getStatus(coverPercent, RECOMMENDED_COVER_PERCENT, 'cover');
  let coverMessage = `${coverCount}/${pieceCount} pieces (${coverPercent}%)`;
  let coverSuggestion: string | undefined;
  
  if (coverPercent < RECOMMENDED_COVER_PERCENT && pieceCount > 0) {
    const needed = Math.ceil((RECOMMENDED_COVER_PERCENT / 100) * pieceCount) - coverCount;
    coverSuggestion = `Add Cover trait to ${needed} more piece${needed === 1 ? '' : 's'}`;
  }
  
  metrics.push({
    id: 'cover',
    label: 'Cover Distribution',
    status: coverStatus,
    currentValue: coverPercent,
    targetValue: RECOMMENDED_COVER_PERCENT,
    unit: '%',
    message: coverMessage,
    suggestion: coverSuggestion,
  });
  
  // 5. Difficult Terrain
  const difficultCount = countPiecesWithTrait(pieces, ['difficult']);
  const difficultPercent = calculateTraitPercentage(pieces, ['difficult']);
  const difficultStatus = getStatus(difficultPercent, RECOMMENDED_DIFFICULT_PERCENT, 'difficult');
  let difficultMessage = `${difficultCount}/${pieceCount} pieces (${difficultPercent}%)`;
  let difficultSuggestion: string | undefined;
  
  if (difficultPercent < RECOMMENDED_DIFFICULT_PERCENT && pieceCount > 0) {
    const needed = Math.ceil((RECOMMENDED_DIFFICULT_PERCENT / 100) * pieceCount) - difficultCount;
    difficultSuggestion = `Add Difficult trait to ${needed} more piece${needed === 1 ? '' : 's'}`;
  }
  
  metrics.push({
    id: 'difficult',
    label: 'Difficult Terrain',
    status: difficultStatus,
    currentValue: difficultPercent,
    targetValue: RECOMMENDED_DIFFICULT_PERCENT,
    unit: '%',
    message: difficultMessage,
    suggestion: difficultSuggestion,
  });
  
  // 6. Dangerous Terrain
  const dangerousCount = countPiecesWithTrait(pieces, ['dangerous']);
  const dangerousStatus = getStatus(dangerousCount, RECOMMENDED_DANGEROUS_COUNT, 'min');
  let dangerousMessage = `${dangerousCount} piece${dangerousCount === 1 ? '' : 's'}`;
  let dangerousSuggestion: string | undefined;
  
  if (dangerousCount < RECOMMENDED_DANGEROUS_COUNT) {
    dangerousSuggestion = `Add Dangerous trait to ${RECOMMENDED_DANGEROUS_COUNT - dangerousCount} more piece${RECOMMENDED_DANGEROUS_COUNT - dangerousCount === 1 ? '' : 's'}`;
  }
  
  metrics.push({
    id: 'dangerous',
    label: 'Dangerous Terrain',
    status: dangerousStatus,
    currentValue: dangerousCount,
    targetValue: RECOMMENDED_DANGEROUS_COUNT,
    unit: 'pieces',
    message: dangerousMessage,
    suggestion: dangerousSuggestion,
  });
  
  // 7. Spacing Analysis
  const spacingAnalysis = analyzeSpacing(pieces, tableWidthInches, tableHeightInches);
  const spacingIssues: string[] = [];
  
  if (spacingAnalysis.largeGaps > 0) {
    spacingIssues.push(`${spacingAnalysis.largeGaps} gap${spacingAnalysis.largeGaps === 1 ? '' : 's'} >6"`);
  }
  if (spacingAnalysis.edgeSightlines) {
    spacingIssues.push('edge sightline detected');
  }
  if (!spacingAnalysis.hasMovementGaps && pieceCount > 1) {
    spacingIssues.push('insufficient movement gaps (<3")');
  }
  
  // Composite score: 100 if no issues, 0 if all issues exist
  const spacingScore = spacingIssues.length === 0 ? 100 : 0;
  const spacingStatus = getStatus(spacingScore, 100, 'spacing');
  
  let spacingMessage = 'Good spacing';
  let spacingSuggestion: string | undefined;
  
  if (spacingIssues.length > 0) {
    spacingMessage = spacingIssues.join(', ');
    spacingSuggestion = 'Adjust terrain placement to eliminate large gaps and edge sightlines while maintaining movement corridors';
  }
  
  metrics.push({
    id: 'spacing',
    label: 'Spacing Analysis',
    status: spacingStatus,
    currentValue: spacingScore,
    targetValue: 100,
    unit: '',
    message: spacingMessage,
    suggestion: spacingSuggestion,
  });
  
  // Calculate overall status
  const passedCount = metrics.filter((m) => m.status === 'good').length;
  const totalCount = metrics.length;
  
  let overallStatus: ValidationStatus = 'good';
  if (metrics.some((m) => m.status === 'fail')) {
    overallStatus = 'fail';
  } else if (metrics.some((m) => m.status === 'warning')) {
    overallStatus = 'warning';
  }
  
  return {
    metrics,
    passedCount,
    totalCount,
    overallStatus,
  };
};
