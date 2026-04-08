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

interface Interval {
  start: number;
  end: number;
}

interface PieceBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface AdjacentGapCandidate {
  axis: 'horizontal' | 'vertical';
  gap: number;
  overlap: number;
  pieceId: string;
  otherPieceId: string;
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
const MIN_ALIGNMENT_OVERLAP_INCHES = 1;
const SAMPLE_STEP_INCHES = 1;
const INTERVAL_MERGE_TOLERANCE = 0.01;

/**
 * Calculate the total area of all terrain pieces
 */
const calculateTerrainArea = (pieces: TerrainPiece[]): number => {
  return pieces.reduce((total, piece) => {
    if (piece.shape === 'ellipse') {
      return total + Math.PI * (piece.width / 2) * (piece.height / 2);
    }

    if (piece.shape === 'diamond') {
      return total + (piece.width * piece.height) / 2;
    }

    return total + piece.width * piece.height;
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

const pieceHasTraitCategory = (piece: TerrainPiece, traitIds: string[]): boolean => {
  return piece.traits.some((trait) => {
    if (!trait.active) return false;

    const category = getTerrainSummaryCategory(trait);
    return category ? traitIds.includes(category) : false;
  });
};

/**
 * Count pieces with specific trait categories
 */
const countPiecesWithTrait = (pieces: TerrainPiece[], traitIds: string[]): number => {
  return pieces.filter((piece) => pieceHasTraitCategory(piece, traitIds)).length;
};

/**
 * Calculate percentage of pieces with a specific trait
 */
const calculateTraitPercentage = (pieces: TerrainPiece[], traitIds: string[]): number => {
  if (pieces.length === 0) return 0;

  const count = countPiecesWithTrait(pieces, traitIds);
  return Math.round((count / pieces.length) * 100);
};

const getPieceBounds = (piece: TerrainPiece): PieceBounds => ({
  minX: piece.x - piece.width / 2,
  maxX: piece.x + piece.width / 2,
  minY: piece.y - piece.height / 2,
  maxY: piece.y + piece.height / 2,
});

const getProjectionOverlap = (startA: number, endA: number, startB: number, endB: number): number => {
  return Math.max(0, Math.min(endA, endB) - Math.max(startA, startB));
};

const isBetterGapCandidate = (
  candidate: AdjacentGapCandidate,
  current: AdjacentGapCandidate | null
): boolean => {
  if (!current) {
    return true;
  }

  if (candidate.gap !== current.gap) {
    return candidate.gap < current.gap;
  }

  return candidate.overlap > current.overlap;
};

/**
 * Approximate meaningful terrain corridors by only looking at nearest neighboring pieces
 * that actually share an overlapping projection on the perpendicular axis.
 */
const getAdjacentPieceGaps = (pieces: TerrainPiece[]): AdjacentGapCandidate[] => {
  if (pieces.length < 2) {
    return [];
  }

  const boundsById = new Map(pieces.map((piece) => [piece.id, getPieceBounds(piece)]));
  const uniqueGaps = new Map<string, AdjacentGapCandidate>();

  pieces.forEach((piece) => {
    const pieceBounds = boundsById.get(piece.id);

    if (!pieceBounds) {
      return;
    }

    let nearestRight: AdjacentGapCandidate | null = null;
    let nearestLeft: AdjacentGapCandidate | null = null;
    let nearestAbove: AdjacentGapCandidate | null = null;
    let nearestBelow: AdjacentGapCandidate | null = null;

    pieces.forEach((otherPiece) => {
      if (otherPiece.id === piece.id) {
        return;
      }

      const otherBounds = boundsById.get(otherPiece.id);

      if (!otherBounds) {
        return;
      }

      const verticalOverlap = getProjectionOverlap(
        pieceBounds.minY,
        pieceBounds.maxY,
        otherBounds.minY,
        otherBounds.maxY
      );

      if (verticalOverlap >= MIN_ALIGNMENT_OVERLAP_INCHES) {
        if (otherBounds.minX >= pieceBounds.maxX) {
          const candidate: AdjacentGapCandidate = {
            axis: 'horizontal',
            gap: otherBounds.minX - pieceBounds.maxX,
            overlap: verticalOverlap,
            pieceId: piece.id,
            otherPieceId: otherPiece.id,
          };

          if (isBetterGapCandidate(candidate, nearestRight)) {
            nearestRight = candidate;
          }
        }

        if (pieceBounds.minX >= otherBounds.maxX) {
          const candidate: AdjacentGapCandidate = {
            axis: 'horizontal',
            gap: pieceBounds.minX - otherBounds.maxX,
            overlap: verticalOverlap,
            pieceId: piece.id,
            otherPieceId: otherPiece.id,
          };

          if (isBetterGapCandidate(candidate, nearestLeft)) {
            nearestLeft = candidate;
          }
        }
      }

      const horizontalOverlap = getProjectionOverlap(
        pieceBounds.minX,
        pieceBounds.maxX,
        otherBounds.minX,
        otherBounds.maxX
      );

      if (horizontalOverlap >= MIN_ALIGNMENT_OVERLAP_INCHES) {
        if (otherBounds.minY >= pieceBounds.maxY) {
          const candidate: AdjacentGapCandidate = {
            axis: 'vertical',
            gap: otherBounds.minY - pieceBounds.maxY,
            overlap: horizontalOverlap,
            pieceId: piece.id,
            otherPieceId: otherPiece.id,
          };

          if (isBetterGapCandidate(candidate, nearestAbove)) {
            nearestAbove = candidate;
          }
        }

        if (pieceBounds.minY >= otherBounds.maxY) {
          const candidate: AdjacentGapCandidate = {
            axis: 'vertical',
            gap: pieceBounds.minY - otherBounds.maxY,
            overlap: horizontalOverlap,
            pieceId: piece.id,
            otherPieceId: otherPiece.id,
          };

          if (isBetterGapCandidate(candidate, nearestBelow)) {
            nearestBelow = candidate;
          }
        }
      }
    });

    const nearestCandidates = [nearestRight, nearestLeft, nearestAbove, nearestBelow].reduce<
      AdjacentGapCandidate[]
    >((candidates, candidate) => {
      if (candidate) {
        candidates.push(candidate);
      }

      return candidates;
    }, []);

    nearestCandidates.forEach((candidate) => {
      const sortedIds = [candidate.pieceId, candidate.otherPieceId].sort();
      const key = `${candidate.axis}:${sortedIds.join(':')}`;
      const existing = uniqueGaps.get(key) ?? null;

      if (isBetterGapCandidate(candidate, existing)) {
        uniqueGaps.set(key, candidate);
      }
    });
  });

  return Array.from(uniqueGaps.values());
};

const clampIntervalToTable = (interval: Interval, lineLength: number): Interval | null => {
  const start = Math.max(0, interval.start);
  const end = Math.min(lineLength, interval.end);

  if (end - start <= 0) {
    return null;
  }

  return { start, end };
};

const mergeIntervals = (intervals: Array<Interval | null>, lineLength: number): Interval[] => {
  const normalizedIntervals = intervals
    .map((interval) => (interval ? clampIntervalToTable(interval, lineLength) : null))
    .filter((interval): interval is Interval => interval !== null)
    .sort((left, right) => left.start - right.start);

  if (normalizedIntervals.length === 0) {
    return [];
  }

  return normalizedIntervals.reduce<Interval[]>((merged, interval) => {
    const current = merged[merged.length - 1];

    if (!current || interval.start > current.end + INTERVAL_MERGE_TOLERANCE) {
      merged.push({ ...interval });
      return merged;
    }

    current.end = Math.max(current.end, interval.end);
    return merged;
  }, []);
};

const getHorizontalIntervalAtSample = (piece: TerrainPiece, sampleY: number): Interval | null => {
  const halfWidth = piece.width / 2;
  const halfHeight = piece.height / 2;

  if (halfWidth <= 0 || halfHeight <= 0) {
    return null;
  }

  const offsetY = Math.abs(sampleY - piece.y);

  if (offsetY > halfHeight) {
    return null;
  }

  if (piece.shape === 'ellipse') {
    const normalizedY = offsetY / halfHeight;
    const radiusX = halfWidth * Math.sqrt(Math.max(0, 1 - normalizedY * normalizedY));

    return { start: piece.x - radiusX, end: piece.x + radiusX };
  }

  if (piece.shape === 'diamond') {
    const radiusX = halfWidth * Math.max(0, 1 - offsetY / halfHeight);

    return { start: piece.x - radiusX, end: piece.x + radiusX };
  }

  return { start: piece.x - halfWidth, end: piece.x + halfWidth };
};

const getVerticalIntervalAtSample = (piece: TerrainPiece, sampleX: number): Interval | null => {
  const halfWidth = piece.width / 2;
  const halfHeight = piece.height / 2;

  if (halfWidth <= 0 || halfHeight <= 0) {
    return null;
  }

  const offsetX = Math.abs(sampleX - piece.x);

  if (offsetX > halfWidth) {
    return null;
  }

  if (piece.shape === 'ellipse') {
    const normalizedX = offsetX / halfWidth;
    const radiusY = halfHeight * Math.sqrt(Math.max(0, 1 - normalizedX * normalizedX));

    return { start: piece.y - radiusY, end: piece.y + radiusY };
  }

  if (piece.shape === 'diamond') {
    const radiusY = halfHeight * Math.max(0, 1 - offsetX / halfWidth);

    return { start: piece.y - radiusY, end: piece.y + radiusY };
  }

  return { start: piece.y - halfHeight, end: piece.y + halfHeight };
};

/**
 * Approximate edge-to-edge fire lanes by looking for clear horizontal or vertical bands
 * with no LoS-blocking terrain crossing them.
 */
const getLongestClearBand = (
  pieces: TerrainPiece[],
  lineLength: number,
  bandLength: number,
  direction: 'horizontal' | 'vertical'
): number => {
  let currentBand = 0;
  let longestBand = 0;

  for (let sample = SAMPLE_STEP_INCHES / 2; sample < bandLength; sample += SAMPLE_STEP_INCHES) {
    const occupiedIntervals = mergeIntervals(
      pieces.map((piece) =>
        direction === 'horizontal'
          ? getHorizontalIntervalAtSample(piece, sample)
          : getVerticalIntervalAtSample(piece, sample)
      ),
      lineLength
    );

    if (occupiedIntervals.length === 0) {
      currentBand += SAMPLE_STEP_INCHES;
      longestBand = Math.max(longestBand, currentBand);
      continue;
    }

    currentBand = 0;
  }

  return longestBand;
};

/**
 * Detect gaps >6", edge-to-edge table sightlines, and whether there is at least one
 * meaningful 3" movement corridor for large units.
 */
const analyzeSpacing = (
  pieces: TerrainPiece[],
  tableWidthInches: number,
  tableHeightInches: number
): { largeGaps: number; edgeSightlines: boolean; hasMovementGaps: boolean } => {
  if (pieces.length === 0) {
    return { largeGaps: 0, edgeSightlines: true, hasMovementGaps: false };
  }

  const adjacentPieceGaps = getAdjacentPieceGaps(pieces);
  const largeGaps = adjacentPieceGaps.filter((gap) => gap.gap > MAX_GAP_INCHES).length;
  const hasMovementGaps = adjacentPieceGaps.some((gap) => gap.gap >= MIN_MOVEMENT_GAP_INCHES);

  const losBlockingPieces = pieces.filter((piece) => pieceHasTraitCategory(piece, ['los-blocking']));
  const longestHorizontalClearBand = getLongestClearBand(
    losBlockingPieces,
    tableWidthInches,
    tableHeightInches,
    'horizontal'
  );
  const longestVerticalClearBand = getLongestClearBand(
    losBlockingPieces,
    tableHeightInches,
    tableWidthInches,
    'vertical'
  );

  const edgeSightlines =
    longestHorizontalClearBand > MAX_GAP_INCHES || longestVerticalClearBand > MAX_GAP_INCHES;

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
    if (current >= RECOMMENDED_MIN_PIECES && current <= RECOMMENDED_MAX_PIECES) {
      return 'good';
    }

    return 'warning';
  }

  if (type === 'min' || type === 'exact') {
    if (current >= target) {
      return 'good';
    }

    return 'warning';
  }

  if (type === 'losBlocking') {
    if (current >= target) {
      return 'good';
    }

    if (current > target * 0.66) {
      return 'warning';
    }

    return 'fail';
  }

  if (type === 'coverage' || type === 'cover' || type === 'difficult') {
    if (current >= target) {
      return 'good';
    }

    return 'warning';
  }

  if (type === 'spacing') {
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
    quantitySuggestion = `Add ${RECOMMENDED_MIN_PIECES - pieceCount} more piece${
      RECOMMENDED_MIN_PIECES - pieceCount === 1 ? '' : 's'
    } to reach minimum`;
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
    message: `${coverage}% table coverage`,
    suggestion: coverageSuggestion,
  });

  // 3. LoS Blocking
  const losBlockingCount = countPiecesWithTrait(pieces, ['los-blocking']);
  const losBlockingPercent = calculateTraitPercentage(pieces, ['los-blocking']);
  const losStatus = getStatus(losBlockingPercent, RECOMMENDED_LOS_BLOCKING_PERCENT, 'losBlocking');
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
    message: `${losBlockingCount}/${pieceCount} pieces (${losBlockingPercent}%)`,
    suggestion: losSuggestion,
  });

  // 4. Cover Distribution
  const coverCount = countPiecesWithTrait(pieces, ['hard-cover', 'soft-cover']);
  const coverPercent = calculateTraitPercentage(pieces, ['hard-cover', 'soft-cover']);
  const coverStatus = getStatus(coverPercent, RECOMMENDED_COVER_PERCENT, 'cover');
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
    message: `${coverCount}/${pieceCount} pieces (${coverPercent}%)`,
    suggestion: coverSuggestion,
  });

  // 5. Difficult Terrain
  const difficultCount = countPiecesWithTrait(pieces, ['difficult']);
  const difficultPercent = calculateTraitPercentage(pieces, ['difficult']);
  const difficultStatus = getStatus(difficultPercent, RECOMMENDED_DIFFICULT_PERCENT, 'difficult');
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
    message: `${difficultCount}/${pieceCount} pieces (${difficultPercent}%)`,
    suggestion: difficultSuggestion,
  });

  // 6. Dangerous Terrain
  const dangerousCount = countPiecesWithTrait(pieces, ['dangerous']);
  const dangerousStatus = getStatus(dangerousCount, RECOMMENDED_DANGEROUS_COUNT, 'min');
  let dangerousSuggestion: string | undefined;

  if (dangerousCount < RECOMMENDED_DANGEROUS_COUNT) {
    dangerousSuggestion = `Add Dangerous trait to ${RECOMMENDED_DANGEROUS_COUNT - dangerousCount} more piece${
      RECOMMENDED_DANGEROUS_COUNT - dangerousCount === 1 ? '' : 's'
    }`;
  }

  metrics.push({
    id: 'dangerous',
    label: 'Dangerous Terrain',
    status: dangerousStatus,
    currentValue: dangerousCount,
    targetValue: RECOMMENDED_DANGEROUS_COUNT,
    unit: 'pieces',
    message: `${dangerousCount} piece${dangerousCount === 1 ? '' : 's'}`,
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
    spacingIssues.push('no 3"+ movement corridor');
  }

  const spacingChecksPassed = [
    spacingAnalysis.largeGaps === 0,
    !spacingAnalysis.edgeSightlines,
    spacingAnalysis.hasMovementGaps,
  ].filter(Boolean).length;
  const spacingScore = Math.round((spacingChecksPassed / 3) * 100);
  const spacingStatus = getStatus(spacingScore, 100, 'spacing');
  let spacingSuggestion: string | undefined;

  if (spacingIssues.length > 0) {
    spacingSuggestion =
      'Redistribute terrain so adjacent gaps stay at or below 6", keep at least one 3" corridor for large units, and use LoS blockers to break up long fire lanes';
  }

  metrics.push({
    id: 'spacing',
    label: 'Spacing Analysis',
    status: spacingStatus,
    currentValue: spacingScore,
    targetValue: 100,
    unit: '%',
    message: spacingIssues.length > 0 ? spacingIssues.join(', ') : 'Good spacing',
    suggestion: spacingSuggestion,
  });

  const passedCount = metrics.filter((metric) => metric.status === 'good').length;
  const totalCount = metrics.length;

  let overallStatus: ValidationStatus = 'good';
  if (metrics.some((metric) => metric.status === 'fail')) {
    overallStatus = 'fail';
  } else if (metrics.some((metric) => metric.status === 'warning')) {
    overallStatus = 'warning';
  }

  return {
    metrics,
    passedCount,
    totalCount,
    overallStatus,
  };
};
