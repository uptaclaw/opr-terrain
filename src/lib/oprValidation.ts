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
 * Determine validation status based on value comparison
 */
const getStatus = (
  current: number,
  target: number,
  type: 'min' | 'range' | 'exact' | 'minPercent'
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
  
  if (type === 'minPercent') {
    // For percentage requirements (≥50%, ≥33%)
    if (current >= target) {
      return 'good';
    }
    if (current >= target * 0.66) {
      return 'warning';
    }
    return 'fail';
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
  const coverageStatus = getStatus(coverage, RECOMMENDED_COVERAGE_PERCENT, 'minPercent');
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
  const losStatus = getStatus(losBlockingPercent, RECOMMENDED_LOS_BLOCKING_PERCENT, 'minPercent');
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
  const coverStatus = getStatus(coverPercent, RECOMMENDED_COVER_PERCENT, 'minPercent');
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
  const difficultStatus = getStatus(difficultPercent, RECOMMENDED_DIFFICULT_PERCENT, 'minPercent');
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
