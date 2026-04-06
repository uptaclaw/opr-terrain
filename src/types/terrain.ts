/**
 * Terrain trait flags based on OPR:AoF rules.
 * Multiple traits can be combined on a single terrain piece.
 */
export type TerrainTrait =
  | 'Soft Cover'
  | 'Hard Cover'
  | 'Difficult'
  | 'Dangerous'
  | 'Impassable'
  | 'Elevated'
  | 'LoS Blocking';

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
 * Discriminated union of terrain shapes.
 * Uses shape-specific fields for type safety and compatibility.
 */
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
      points: Position[];
    };

/**
 * A placed terrain piece on the table.
 * Compatible with existing terrain layout generator.
 */
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
 * Shape option within a preset (pre-defined dimensions).
 */
export type ShapeOption =
  | {
      kind: 'circle';
      label: string;
      radius: number;
    }
  | {
      kind: 'rectangle';
      label: string;
      width: number;
      height: number;
    }
  | {
      kind: 'polygon';
      label: string;
      points: Position[];
    };

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

/**
 * Short labels for terrain traits.
 */
export const TERRAIN_TRAIT_SHORT_LABELS: Record<TerrainTrait, string> = {
  'Soft Cover': 'SC',
  'Hard Cover': 'HC',
  Difficult: 'Dif',
  Dangerous: 'Dan',
  Impassable: 'Imp',
  Elevated: 'Ele',
  'LoS Blocking': 'LoS',
};
