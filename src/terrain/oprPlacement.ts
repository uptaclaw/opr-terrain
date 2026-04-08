/**
 * OPR Age of Fantasy terrain placement guidelines (Rulebook page 12)
 */

import type { TerrainPiece, TerrainShapeKind, TerrainTrait } from './types';
import { getTemplateById, terrainCatalog } from './catalog';
import { distanceBetweenPieces, distancePointToPiece, getShapeArea, segmentIntersectsPiece } from './geometry';

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
  maxPieces: 20,
  minCoveragePercent: 50,
  minLosBlockingPercent: 50,
  minCoverPercent: 33,
  minDifficultPercent: 33,
  dangerousPieces: 2,
  minGapInches: 3,
  maxGapInches: 6,
};

/**
 * Calculate table coverage percentage based on actual terrain piece areas.
 */
export const calculateCoveragePercent = (
  pieces: readonly TerrainPiece[],
  tableWidthInches: number,
  tableHeightInches: number,
): number => {
  const tableArea = tableWidthInches * tableHeightInches;
  const totalTerrainArea = pieces.reduce((sum, piece) => sum + getShapeArea(piece.shape), 0);

  return (totalTerrainArea / tableArea) * 100;
};

/**
 * Check if a piece has a specific trait.
 */
const hasTrait = (piece: TerrainPiece, trait: TerrainTrait): boolean => piece.traits.includes(trait);

/**
 * Calculate trait distribution percentages.
 */
export const calculateTraitDistribution = (pieces: readonly TerrainPiece[]) => {
  const total = pieces.length;

  const losBlocking = pieces.filter((piece) => hasTrait(piece, 'LoS Blocking')).length;
  const cover = pieces.filter((piece) => hasTrait(piece, 'Soft Cover') || hasTrait(piece, 'Hard Cover')).length;
  const difficult = pieces.filter((piece) => hasTrait(piece, 'Difficult')).length;
  const dangerous = pieces.filter((piece) => hasTrait(piece, 'Dangerous')).length;

  return {
    losBlockingPercent: total > 0 ? (losBlocking / total) * 100 : 0,
    coverPercent: total > 0 ? (cover / total) * 100 : 0,
    difficultPercent: total > 0 ? (difficult / total) * 100 : 0,
    dangerousCount: dangerous,
  };
};

/**
 * Calculate the minimum edge-to-edge gap between any two pieces.
 */
export const calculateMinGap = (pieces: readonly TerrainPiece[]): number => {
  if (pieces.length < 2) {
    return Infinity;
  }

  let minGap = Infinity;

  for (let index = 0; index < pieces.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < pieces.length; otherIndex += 1) {
      minGap = Math.min(minGap, distanceBetweenPieces(pieces[index]!, pieces[otherIndex]!));
    }
  }

  return minGap;
};

/**
 * Calculate maximum open gap on the table by sampling points and measuring
 * the nearest distance to any terrain piece. The widest gap is twice the
 * maximum clearance from an empty point to the nearest terrain edge.
 */
export const calculateMaxGap = (
  pieces: readonly TerrainPiece[],
  tableWidthInches: number,
  tableHeightInches: number,
): number => {
  if (pieces.length === 0) {
    return Math.max(tableWidthInches, tableHeightInches);
  }

  const sampleStep = 1;
  let maxClearance = 0;

  for (let x = 0; x <= tableWidthInches; x += sampleStep) {
    for (let y = 0; y <= tableHeightInches; y += sampleStep) {
      let nearestTerrain = Infinity;

      for (const piece of pieces) {
        nearestTerrain = Math.min(nearestTerrain, distancePointToPiece({ x, y }, piece));
      }

      maxClearance = Math.max(maxClearance, nearestTerrain);
    }
  }

  return maxClearance * 2;
};

/**
 * Check if there is an uninterrupted edge-to-edge sightline through the main
 * play lanes of the table. Lanes are sampled at the midpoint of each 12" wide
 * column and 18" tall row, which matches the OPR reference spacing bands.
 */
export const hasEdgeToEdgeSightline = (
  pieces: readonly TerrainPiece[],
  tableWidthInches: number,
  tableHeightInches: number,
): boolean => {
  const losBlockers = pieces.filter((piece) => hasTrait(piece, 'LoS Blocking'));

  if (losBlockers.length === 0) {
    return true;
  }

  const sampleColumns = Math.max(2, Math.round(tableWidthInches / 12));
  const sampleRows = Math.max(2, Math.round(tableHeightInches / 18));

  for (let row = 0; row < sampleRows; row += 1) {
    const y = (tableHeightInches / sampleRows) * (row + 0.5);
    const blocked = losBlockers.some((piece) =>
      segmentIntersectsPiece({ x: 0, y }, { x: tableWidthInches, y }, piece),
    );

    if (!blocked) {
      return true;
    }
  }

  for (let column = 0; column < sampleColumns; column += 1) {
    const x = (tableWidthInches / sampleColumns) * (column + 0.5);
    const blocked = losBlockers.some((piece) =>
      segmentIntersectsPiece({ x, y: 0 }, { x, y: tableHeightInches }, piece),
    );

    if (!blocked) {
      return true;
    }
  }

  return false;
};

/**
 * Validate terrain layout against OPR guidelines.
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
    allValid: false,
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
 * Build terrain selection following OPR trait requirements.
 */
export const buildOPRTerrainSelection = (
  targetCount: number,
  random: () => number,
): Array<{ templateId: string; shapeKind: TerrainShapeKind }> => {
  const selections: Array<{ templateId: string; shapeKind: TerrainShapeKind }> = [];

  const minLosBlocking = Math.ceil(targetCount * 0.5);
  const minCover = Math.ceil(targetCount * 0.33);
  const minDifficult = Math.ceil(targetCount * 0.33);
  const dangerousCount = 2;

  const losBlockingTemplates = terrainCatalog.filter((template) => template.traits.includes('LoS Blocking'));
  const coverTemplates = terrainCatalog.filter(
    (template) => template.traits.includes('Soft Cover') || template.traits.includes('Hard Cover'),
  );
  const difficultTemplates = terrainCatalog.filter((template) => template.traits.includes('Difficult'));
  const dangerousTemplates = terrainCatalog.filter((template) => template.traits.includes('Dangerous'));

  const pickTemplate = (templates: typeof terrainCatalog) => {
    const template = templates[Math.floor(random() * templates.length)]!;
    const shapeKind = template.shapeKinds[Math.floor(random() * template.shapeKinds.length)]!;
    return { templateId: template.id, shapeKind };
  };

  const recountTraits = () => {
    const losBlocking = selections.filter((selection) => {
      const template = getTemplateById(selection.templateId);
      return template.traits.includes('LoS Blocking');
    }).length;

    const cover = selections.filter((selection) => {
      const template = getTemplateById(selection.templateId);
      return template.traits.includes('Soft Cover') || template.traits.includes('Hard Cover');
    }).length;

    const difficult = selections.filter((selection) => {
      const template = getTemplateById(selection.templateId);
      return template.traits.includes('Difficult');
    }).length;

    const dangerous = selections.filter((selection) => {
      const template = getTemplateById(selection.templateId);
      return template.traits.includes('Dangerous');
    }).length;

    return { losBlocking, cover, difficult, dangerous };
  };

  for (let index = 0; index < dangerousCount && selections.length < targetCount; index += 1) {
    selections.push(pickTemplate(dangerousTemplates));
  }

  while (selections.length < targetCount) {
    const counts = recountTraits();
    const nonDangerousTemplates = terrainCatalog.filter((template) => !template.traits.includes('Dangerous'));

    if (counts.losBlocking < minLosBlocking && losBlockingTemplates.length > 0) {
      const safeLosBlocking = losBlockingTemplates.filter(
        (template) => !template.traits.includes('Dangerous') || counts.dangerous < dangerousCount,
      );
      selections.push(pickTemplate(safeLosBlocking.length > 0 ? safeLosBlocking : losBlockingTemplates));
    } else if (counts.cover < minCover && coverTemplates.length > 0) {
      const safeCover = coverTemplates.filter(
        (template) => !template.traits.includes('Dangerous') || counts.dangerous < dangerousCount,
      );
      selections.push(pickTemplate(safeCover.length > 0 ? safeCover : coverTemplates));
    } else if (counts.difficult < minDifficult && difficultTemplates.length > 0) {
      const safeDifficult = difficultTemplates.filter(
        (template) => !template.traits.includes('Dangerous') || counts.dangerous < dangerousCount,
      );
      selections.push(pickTemplate(safeDifficult.length > 0 ? safeDifficult : difficultTemplates));
    } else {
      const eligibleTemplates = counts.dangerous >= dangerousCount ? nonDangerousTemplates : terrainCatalog;
      const totalWeight = eligibleTemplates.reduce((sum, template) => sum + template.weight, 0);
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

  for (let index = selections.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [selections[index], selections[swapIndex]] = [selections[swapIndex]!, selections[index]!];
  }

  return selections.slice(0, targetCount);
};
