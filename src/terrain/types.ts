/**
 * Canonical terrain model shared by terrain generation, rendering, and preset/library UI.
 */
export type TerrainTrait =
  | 'Soft Cover'
  | 'Hard Cover'
  | 'Difficult'
  | 'Dangerous'
  | 'Impassable'
  | 'Elevated'
  | 'LoS Blocking';

export interface TerrainPoint {
  x: number;
  y: number;
}

export type TerrainShape =
  | {
      kind: 'circle';
      radius: number;
    }
  | {
      kind: 'rectangle';
      width: number;
      height: number;
    }
  | {
      kind: 'polygon';
      points: TerrainPoint[];
    };

export type TerrainShapeKind = TerrainShape['kind'];

export interface TerrainPiece {
  id: string;
  templateId: string;
  name: string;
  color: string;
  traits: TerrainTrait[];
  x: number;
  y: number;
  rotation: number;
  shape: TerrainShape;
  collisionRadius: number;
}

/**
 * Selectable preset shape/size option for the terrain library.
 */
export type ShapeOption = TerrainShape & {
  label: string;
};

/**
 * Named terrain preset with pre-selected trait combinations.
 */
export interface TerrainPreset {
  id: string;
  name: string;
  description: string;
  traits: TerrainTrait[];
  shapeOptions: ShapeOption[];
  color: string;
  icon?: string;
}

export type PlacementStrategy =
  | 'random'
  | 'balanced-coverage'
  | 'symmetrical'
  | 'asymmetric'
  | 'clustered-zones'
  | 'los-blocking-lanes';

export type PlacementDensity = 'sparse' | 'balanced' | 'dense';

export interface PlacementConfig {
  strategy?: PlacementStrategy;
  density?: PlacementDensity;
  prioritizeCover?: boolean;
  deploymentZoneSafety?: boolean;
  forceSymmetry?: boolean;
}

export interface GenerateTerrainLayoutOptions {
  widthInches?: number;
  heightInches?: number;
  deploymentDepthInches?: number;
  minPieces?: number;
  maxPieces?: number;
  pieceCount?: number;
  collisionBufferInches?: number;
  maxAttemptsPerPiece?: number;
  maxLayoutAttempts?: number;
  random?: () => number;
  placementConfig?: PlacementConfig;
  enforceOPRGuidelines?: boolean;
}

export interface TerrainLayout {
  widthInches: number;
  heightInches: number;
  deploymentDepthInches: number;
  targetPieceCount: number;
  quarterTargets: [number, number, number, number];
  pieces: TerrainPiece[];
  placementConfig?: PlacementConfig;
  oprValidation?: OPRValidation;
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

export interface TerrainLayoutAnalysis {
  quarterCounts: [number, number, number, number];
  shapeCounts: Record<TerrainShapeKind, number>;
  templateCounts: Record<string, number>;
  overlaps: Array<[string, string]>;
  deploymentCenterIntrusions: string[];
}

export const TERRAIN_TRAIT_SHORT_LABELS: Record<TerrainTrait, string> = {
  'Soft Cover': 'SC',
  'Hard Cover': 'HC',
  Difficult: 'Dif',
  Dangerous: 'Dan',
  Impassable: 'Imp',
  Elevated: 'Ele',
  'LoS Blocking': 'LoS',
};
