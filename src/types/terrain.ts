/**
 * Terrain trait flags based on OPR:AoF rules.
 * Multiple traits can be combined on a single terrain piece.
 */
export enum TerrainTrait {
  /** +1 to Defense rolls when targeted through/in this terrain */
  SoftCover = 'SOFT_COVER',
  /** +2 to Defense rolls when targeted through/in this terrain */
  HardCover = 'HARD_COVER',
  /** Counts as double distance for movement */
  Difficult = 'DIFFICULT',
  /** Units moving through must take dangerous terrain tests */
  Dangerous = 'DANGEROUS',
  /** Units cannot move through */
  Impassable = 'IMPASSABLE',
  /** Units on top gain height advantage */
  Elevated = 'ELEVATED',
  /** Completely blocks line of sight */
  LoSBlocking = 'LOS_BLOCKING',
}

/**
 * Shape type for terrain pieces.
 */
export type ShapeKind = 'rectangle' | 'circle' | 'polygon';

/**
 * Position on the table in inches.
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Geometric shape definition for terrain.
 */
export interface TerrainShape {
  kind: ShapeKind;
  /** Dimensions in inches (width for rectangle, diameter for circle) */
  dimensions: {
    width?: number;
    height?: number;
    diameter?: number;
  };
  /** Vertices for custom polygons (in local coordinates) */
  vertices?: Position[];
  /** Rotation angle in degrees */
  rotation: number;
}

/**
 * A placed terrain piece on the table.
 */
export interface TerrainPiece {
  id: string;
  /** Position on the table in inches */
  position: Position;
  /** Shape and dimensions */
  shape: TerrainShape;
  /** Set of terrain trait flags */
  traits: Set<TerrainTrait>;
  /** Display name */
  name: string;
  /** Display color (hex) */
  color: string;
}

/**
 * Shape option within a preset (pre-defined dimensions).
 */
export interface ShapeOption {
  kind: ShapeKind;
  label: string;
  dimensions: {
    width?: number;
    height?: number;
    diameter?: number;
  };
  /** Pre-defined vertices for irregular polygons */
  vertices?: Position[];
}

/**
 * Named terrain preset with pre-selected trait combinations.
 */
export interface TerrainPreset {
  id: string;
  name: string;
  description: string;
  traits: TerrainTrait[];
  /** Available shape options for this preset */
  shapeOptions: ShapeOption[];
  /** Default color */
  color: string;
  /** Icon identifier (for future icon system) */
  icon?: string;
}
