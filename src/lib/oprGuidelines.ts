/**
 * OPR Age of Fantasy terrain setup guidelines extracted from the official rulebook.
 * 
 * These guidelines are based on the OPR Age of Fantasy rules (docs/opr-age-of-fantasy-rules.pdf)
 * and represent recommended best practices for competitive and balanced gameplay.
 */

export interface OPRGuideline {
  id: string;
  category: 'density' | 'cover' | 'los' | 'deployment' | 'balance';
  label: string;
  description: string;
  minValue?: number;
  maxValue?: number;
  targetValue?: number;
  unit?: string;
}

/**
 * Official OPR terrain setup guidelines
 */
export const OPR_GUIDELINES: OPRGuideline[] = [
  {
    id: 'terrain-density',
    category: 'density',
    label: 'Terrain Density',
    description: 'Recommended terrain coverage of the table surface',
    minValue: 20,
    targetValue: 30,
    maxValue: 40,
    unit: '%',
  },
  {
    id: 'los-blockers',
    category: 'los',
    label: 'LoS Blocking Pieces',
    description: 'Number of terrain pieces that block line of sight (typically 4-6 for standard 48x48" table)',
    minValue: 4,
    targetValue: 5,
    maxValue: 6,
    unit: 'pieces',
  },
  {
    id: 'cover-balance',
    category: 'cover',
    label: 'Cover Balance',
    description: 'Mix of Soft Cover and Hard Cover pieces for tactical variety',
    minValue: 0.3,
    targetValue: 0.5,
    maxValue: 0.7,
    unit: 'ratio',
  },
  {
    id: 'deployment-clear',
    category: 'deployment',
    label: 'Deployment Zone Clarity',
    description: 'Deployment zones should not be heavily obstructed (max 1-2 small pieces)',
    minValue: 0,
    targetValue: 1,
    maxValue: 2,
    unit: 'pieces',
  },
  {
    id: 'center-contested',
    category: 'balance',
    label: 'Center Table Balance',
    description: 'Center 12" circle should have tactical terrain but not be completely blocked',
    minValue: 1,
    targetValue: 2,
    maxValue: 3,
    unit: 'pieces',
  },
];

/**
 * Calculate the total area covered by terrain pieces
 */
export function calculateTerrainCoverage(
  pieces: Array<{ width: number; height: number }>,
  tableWidth: number,
  tableHeight: number,
): number {
  const tableArea = tableWidth * tableHeight;
  const terrainArea = pieces.reduce((sum, piece) => sum + piece.width * piece.height, 0);
  return (terrainArea / tableArea) * 100;
}

/**
 * Count pieces with specific trait
 */
export function countPiecesWithTrait(
  pieces: Array<{ traits: Array<{ id: string; active: boolean }> }>,
  traitId: string,
): number {
  return pieces.filter((piece) => piece.traits.some((trait) => trait.id === traitId && trait.active)).length;
}

/**
 * Count pieces in deployment zones
 */
export function countPiecesInDeploymentZones(
  pieces: Array<{ x: number; y: number }>,
  tableHeight: number,
  deploymentDepth: number,
): number {
  return pieces.filter((piece) => piece.y <= deploymentDepth || piece.y >= tableHeight - deploymentDepth).length;
}

/**
 * Count pieces in center circle
 */
export function countPiecesInCenter(
  pieces: Array<{ x: number; y: number }>,
  tableWidth: number,
  tableHeight: number,
  radiusInches: number = 12,
): number {
  const centerX = tableWidth / 2;
  const centerY = tableHeight / 2;
  
  return pieces.filter((piece) => {
    const dx = piece.x - centerX;
    const dy = piece.y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= radiusInches;
  }).length;
}

/**
 * Calculate cover balance (ratio of soft to total cover pieces)
 */
export function calculateCoverBalance(
  pieces: Array<{ traits: Array<{ id: string; active: boolean }> }>,
): number {
  const softCoverCount = countPiecesWithTrait(pieces, 'light-cover');
  const hardCoverCount = countPiecesWithTrait(pieces, 'heavy-cover');
  const totalCover = softCoverCount + hardCoverCount;
  
  if (totalCover === 0) return 0;
  
  return softCoverCount / totalCover;
}

export type ValidationStatus = 'good' | 'warning' | 'poor';

export interface ValidationResult {
  guideline: OPRGuideline;
  value: number;
  status: ValidationStatus;
  message: string;
  suggestion?: string;
}

/**
 * Determine validation status based on guideline thresholds
 */
function getValidationStatus(
  value: number,
  guideline: OPRGuideline,
): ValidationStatus {
  if (guideline.minValue !== undefined && guideline.maxValue !== undefined) {
    if (value >= guideline.minValue && value <= guideline.maxValue) {
      return 'good';
    }
    if (
      value >= guideline.minValue * 0.7 &&
      value <= guideline.maxValue * 1.3
    ) {
      return 'warning';
    }
    return 'poor';
  }
  
  if (guideline.targetValue !== undefined) {
    const deviation = Math.abs(value - guideline.targetValue) / guideline.targetValue;
    if (deviation <= 0.2) return 'good';
    if (deviation <= 0.5) return 'warning';
    return 'poor';
  }
  
  return 'good';
}

/**
 * Generate human-readable message for validation result
 */
function getValidationMessage(
  value: number,
  guideline: OPRGuideline,
  status: ValidationStatus,
): string {
  const formattedValue = guideline.unit === '%' 
    ? `${value.toFixed(1)}${guideline.unit}`
    : guideline.unit === 'ratio'
    ? `${(value * 100).toFixed(0)}%`
    : `${Math.round(value)} ${guideline.unit}`;
  
  if (status === 'good') {
    return `${formattedValue} - within recommended range`;
  }
  
  if (guideline.minValue !== undefined && guideline.maxValue !== undefined) {
    const targetRange = guideline.unit === '%'
      ? `${guideline.minValue}-${guideline.maxValue}${guideline.unit}`
      : guideline.unit === 'ratio'
      ? `${(guideline.minValue * 100).toFixed(0)}-${(guideline.maxValue * 100).toFixed(0)}%`
      : `${guideline.minValue}-${guideline.maxValue} ${guideline.unit}`;
    
    return `${formattedValue} - recommended range: ${targetRange}`;
  }
  
  return formattedValue;
}

/**
 * Generate actionable suggestion based on validation result
 */
function getValidationSuggestion(
  value: number,
  guideline: OPRGuideline,
  status: ValidationStatus,
): string | undefined {
  if (status === 'good') return undefined;
  
  switch (guideline.id) {
    case 'terrain-density':
      if (value < (guideline.minValue ?? 0)) {
        return 'Add 2-3 more terrain pieces to increase table coverage';
      }
      return 'Consider removing some terrain to avoid overcrowding';
    
    case 'los-blockers':
      if (value < (guideline.minValue ?? 0)) {
        return 'Add more LoS Blocking terrain to create tactical depth';
      }
      return 'Too many LoS blockers may slow down the game';
    
    case 'cover-balance':
      if (value < 0.3) {
        return 'Add more Soft Cover pieces for better balance';
      }
      if (value > 0.7) {
        return 'Add more Hard Cover pieces for better balance';
      }
      return 'Aim for a 50/50 mix of Soft and Hard Cover';
    
    case 'deployment-clear':
      if (value > (guideline.maxValue ?? 2)) {
        return 'Move terrain away from deployment zones for clearer setup';
      }
      return undefined;
    
    case 'center-contested':
      if (value < (guideline.minValue ?? 1)) {
        return 'Add 1-2 pieces near the center for objective play';
      }
      if (value > (guideline.maxValue ?? 3)) {
        return 'Center may be too congested - consider repositioning';
      }
      return undefined;
    
    default:
      return undefined;
  }
}

/**
 * Validate terrain layout against OPR guidelines
 */
export function validateLayout(
  pieces: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    traits: Array<{ id: string; active: boolean }>;
  }>,
  tableWidth: number,
  tableHeight: number,
  deploymentDepth: number,
): ValidationResult[] {
  const results: ValidationResult[] = [];
  
  for (const guideline of OPR_GUIDELINES) {
    let value = 0;
    
    switch (guideline.id) {
      case 'terrain-density':
        value = calculateTerrainCoverage(pieces, tableWidth, tableHeight);
        break;
      
      case 'los-blockers':
        value = countPiecesWithTrait(pieces, 'blocks-los');
        break;
      
      case 'cover-balance':
        value = calculateCoverBalance(pieces);
        break;
      
      case 'deployment-clear':
        value = countPiecesInDeploymentZones(pieces, tableHeight, deploymentDepth);
        break;
      
      case 'center-contested':
        value = countPiecesInCenter(pieces, tableWidth, tableHeight);
        break;
    }
    
    const status = getValidationStatus(value, guideline);
    const message = getValidationMessage(value, guideline, status);
    const suggestion = getValidationSuggestion(value, guideline, status);
    
    results.push({
      guideline,
      value,
      status,
      message,
      suggestion,
    });
  }
  
  return results;
}

/**
 * Calculate overall layout quality score (0-100)
 */
export function calculateOverallScore(results: ValidationResult[]): number {
  if (results.length === 0) return 0;
  
  const statusScores: Record<ValidationStatus, number> = {
    good: 100,
    warning: 60,
    poor: 20,
  };
  
  const totalScore = results.reduce((sum, result) => sum + statusScores[result.status], 0);
  return Math.round(totalScore / results.length);
}
