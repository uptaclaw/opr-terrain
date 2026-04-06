import type { TerrainPiece, TerrainPoint } from './types';

export type PlacementStrategy =
  | 'random'
  | 'balanced-coverage'
  | 'symmetrical'
  | 'asymmetric'
  | 'clustered-zones'
  | 'los-blocking-lanes';

export type PlacementDensity = 'sparse' | 'balanced' | 'dense';

export interface PlacementConfig {
  strategy: PlacementStrategy;
  density?: PlacementDensity;
  prioritizeCover?: boolean;
  deploymentZoneSafety?: boolean;
  forceSymmetry?: boolean;
}

export interface PlacementContext {
  widthInches: number;
  heightInches: number;
  deploymentDepthInches: number;
  collisionBufferInches: number;
  random: () => number;
}

export interface PlacementConstraints {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

type QuarterIndex = 0 | 1 | 2 | 3;

export const getQuarterIndex = (
  x: number,
  y: number,
  widthInches: number,
  heightInches: number,
): QuarterIndex => {
  const column = x < widthInches / 2 ? 0 : 1;
  const row = y < heightInches / 2 ? 0 : 1;
  return (row * 2 + column) as QuarterIndex;
};

export const getMirroredPosition = (
  x: number,
  y: number,
  widthInches: number,
  heightInches: number,
  axis: 'vertical' | 'horizontal',
): TerrainPoint => {
  if (axis === 'vertical') {
    return { x: widthInches - x, y };
  }
  return { x, y: heightInches - y };
};

export const getClusterCenter = (
  clusterIndex: number,
  clusterCount: number,
  widthInches: number,
  heightInches: number,
  random: () => number,
): TerrainPoint => {
  const cols = Math.ceil(Math.sqrt(clusterCount));
  const rows = Math.ceil(clusterCount / cols);
  const col = clusterIndex % cols;
  const row = Math.floor(clusterIndex / cols);
  
  const cellWidth = widthInches / cols;
  const cellHeight = heightInches / rows;
  
  const baseX = cellWidth * (col + 0.5);
  const baseY = cellHeight * (row + 0.5);
  
  // Add some randomness within the cell
  const offsetX = (random() - 0.5) * cellWidth * 0.3;
  const offsetY = (random() - 0.5) * cellHeight * 0.3;
  
  return {
    x: baseX + offsetX,
    y: baseY + offsetY,
  };
};

export const getLaneCenter = (
  laneIndex: number,
  laneCount: number,
  widthInches: number,
  heightInches: number,
): TerrainPoint => {
  const isVertical = widthInches < heightInches;
  
  if (isVertical) {
    // Lanes run vertically
    const spacing = widthInches / (laneCount + 1);
    return {
      x: spacing * (laneIndex + 1),
      y: heightInches / 2,
    };
  } else {
    // Lanes run horizontally
    const spacing = heightInches / (laneCount + 1);
    return {
      x: widthInches / 2,
      y: spacing * (laneIndex + 1),
    };
  }
};

export const getPlacementDensityMultiplier = (density: PlacementDensity): number => {
  switch (density) {
    case 'sparse':
      return 0.75;
    case 'dense':
      return 1.25;
    case 'balanced':
    default:
      return 1.0;
  }
};

export const shouldPrioritizePiece = (
  piece: TerrainPiece,
  prioritizeCover: boolean,
): boolean => {
  if (!prioritizeCover) {
    return false;
  }
  
  return piece.traits.some(
    (trait) => trait === 'Soft Cover' || trait === 'Hard Cover' || trait === 'LoS Blocking'
  );
};

export const getStrategyDescription = (strategy: PlacementStrategy): string => {
  switch (strategy) {
    case 'random':
      return 'Pure random placement with collision detection';
    case 'balanced-coverage':
      return 'Even distribution across all table quadrants';
    case 'symmetrical':
      return 'Mirror terrain placement for competitive balance';
    case 'asymmetric':
      return 'Intentionally unbalanced for narrative scenarios';
    case 'clustered-zones':
      return 'Create distinct terrain zones rather than even scatter';
    case 'los-blocking-lanes':
      return 'Prioritize meaningful sight-line corridors and cover routes';
    default:
      return 'Unknown strategy';
  }
};
