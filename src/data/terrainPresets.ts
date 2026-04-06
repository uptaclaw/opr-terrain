import type { TerrainPreset, TerrainTrait, Position } from '../types/terrain';

/**
 * Predefined irregular polygon shapes for terrain.
 * Coordinates are normalized around origin for scaling.
 */
const FOREST_IRREGULAR: Position[] = [
  { x: -1.05, y: -0.45 },
  { x: -0.45, y: -1.05 },
  { x: 0.4, y: -0.9 },
  { x: 1.05, y: -0.3 },
  { x: 0.85, y: 0.6 },
  { x: 0.15, y: 1.05 },
  { x: -0.8, y: 0.8 },
  { x: -1.2, y: 0.05 },
];

const HILL_IRREGULAR: Position[] = [
  { x: -1.1, y: -0.2 },
  { x: -0.6, y: -1 },
  { x: 0.3, y: -1.05 },
  { x: 1.15, y: -0.35 },
  { x: 0.95, y: 0.45 },
  { x: 0.35, y: 1.1 },
  { x: -0.55, y: 0.95 },
  { x: -1.15, y: 0.35 },
];

const BUILDING_L_SHAPE: Position[] = [
  { x: 0, y: 0 },
  { x: 3, y: 0 },
  { x: 3, y: 2 },
  { x: 1.5, y: 2 },
  { x: 1.5, y: 4 },
  { x: 0, y: 4 },
];

const WATER_STRIP: Position[] = [
  { x: -1.4, y: -0.45 },
  { x: -0.6, y: -0.75 },
  { x: 0.2, y: -0.55 },
  { x: 1.3, y: -0.2 },
  { x: 1.45, y: 0.35 },
  { x: 0.45, y: 0.75 },
  { x: -0.55, y: 0.55 },
  { x: -1.35, y: 0.2 },
];

const ROCKY_OUTCROP_IRREGULAR: Position[] = [
  { x: -1.05, y: -0.55 },
  { x: -0.15, y: -1.15 },
  { x: 0.95, y: -0.7 },
  { x: 1.1, y: 0.1 },
  { x: 0.45, y: 0.95 },
  { x: -0.55, y: 1.05 },
  { x: -1.15, y: 0.3 },
];

const HEDGE_CURVED: Position[] = [
  { x: -1.35, y: -0.25 },
  { x: -0.55, y: -0.8 },
  { x: 0.35, y: -0.65 },
  { x: 1.35, y: -0.15 },
  { x: 1.1, y: 0.65 },
  { x: 0.15, y: 0.8 },
  { x: -0.8, y: 0.55 },
  { x: -1.45, y: 0.15 },
];

/**
 * Helper to scale a polygon template.
 */
const scalePolygon = (template: Position[], scaleX: number, scaleY: number): Position[] =>
  template.map((p) => ({ x: p.x * scaleX, y: p.y * scaleY }));

/**
 * Pre-defined terrain presets matching common OPR:AoF terrain types.
 */
export const TERRAIN_PRESETS: TerrainPreset[] = [
  {
    id: 'forest',
    name: 'Forest / Woods',
    description: 'Dense vegetation providing cover and slowing movement',
    traits: ['Soft Cover', 'Difficult'],
    color: '#22c55e',
    shapeOptions: [
      {
        kind: 'circle',
        label: 'Small (4")',
        radius: 2,
      },
      {
        kind: 'circle',
        label: 'Medium (6")',
        radius: 3,
      },
      {
        kind: 'circle',
        label: 'Large (8")',
        radius: 4,
      },
      {
        kind: 'polygon',
        label: 'Irregular (6")',
        points: scalePolygon(FOREST_IRREGULAR, 3, 3),
      },
      {
        kind: 'polygon',
        label: 'Irregular (8")',
        points: scalePolygon(FOREST_IRREGULAR, 4, 4),
      },
    ],
  },
  {
    id: 'hill',
    name: 'Hill',
    description: 'Elevated terrain granting height advantage',
    traits: ['Elevated'],
    color: '#a16207',
    shapeOptions: [
      {
        kind: 'circle',
        label: 'Small oval (5")',
        radius: 2.5,
      },
      {
        kind: 'circle',
        label: 'Medium oval (7")',
        radius: 3.5,
      },
      {
        kind: 'circle',
        label: 'Large oval (10")',
        radius: 5,
      },
      {
        kind: 'polygon',
        label: 'Irregular (6")',
        points: scalePolygon(HILL_IRREGULAR, 3, 3),
      },
      {
        kind: 'polygon',
        label: 'Irregular (8")',
        points: scalePolygon(HILL_IRREGULAR, 4, 4),
      },
    ],
  },
  {
    id: 'building',
    name: 'Building / Ruins',
    description: 'Solid structure providing strong cover and blocking sight',
    traits: ['Hard Cover', 'Difficult', 'LoS Blocking'],
    color: '#64748b',
    shapeOptions: [
      {
        kind: 'rectangle',
        label: 'Small (3×3")',
        width: 3,
        height: 3,
      },
      {
        kind: 'rectangle',
        label: 'Medium (5×4")',
        width: 5,
        height: 4,
      },
      {
        kind: 'rectangle',
        label: 'Large (6×6")',
        width: 6,
        height: 6,
      },
      {
        kind: 'rectangle',
        label: 'Long (8×4")',
        width: 8,
        height: 4,
      },
      {
        kind: 'polygon',
        label: 'L-shape (4×4")',
        points: BUILDING_L_SHAPE,
      },
    ],
  },
  {
    id: 'wall',
    name: 'Wall / Fence',
    description: 'Linear barrier providing light cover',
    traits: ['Soft Cover'],
    color: '#78716c',
    shapeOptions: [
      {
        kind: 'rectangle',
        label: 'Short (4×0.5")',
        width: 4,
        height: 0.5,
      },
      {
        kind: 'rectangle',
        label: 'Medium (6×0.5")',
        width: 6,
        height: 0.5,
      },
      {
        kind: 'rectangle',
        label: 'Long (8×0.5")',
        width: 8,
        height: 0.5,
      },
    ],
  },
  {
    id: 'water',
    name: 'Water / River',
    description: 'Hazardous liquid terrain',
    traits: ['Dangerous'],
    color: '#0ea5e9',
    shapeOptions: [
      {
        kind: 'rectangle',
        label: 'Stream (6×2")',
        width: 6,
        height: 2,
      },
      {
        kind: 'rectangle',
        label: 'River (8×3")',
        width: 8,
        height: 3,
      },
      {
        kind: 'circle',
        label: 'Pool (5")',
        radius: 2.5,
      },
      {
        kind: 'polygon',
        label: 'Irregular strip (8")',
        points: scalePolygon(WATER_STRIP, 4, 2),
      },
    ],
  },
  {
    id: 'rocky-outcrop',
    name: 'Rocky Outcrop',
    description: 'Impassable rock formation blocking sight and movement',
    traits: ['Hard Cover', 'Impassable', 'LoS Blocking'],
    color: '#57534e',
    shapeOptions: [
      {
        kind: 'circle',
        label: 'Small (2")',
        radius: 1,
      },
      {
        kind: 'circle',
        label: 'Medium (3")',
        radius: 1.5,
      },
      {
        kind: 'rectangle',
        label: 'Large (4×3")',
        width: 4,
        height: 3,
      },
      {
        kind: 'polygon',
        label: 'Small irregular',
        points: scalePolygon(ROCKY_OUTCROP_IRREGULAR, 1.5, 1.5),
      },
    ],
  },
  {
    id: 'hedge',
    name: 'Hedge / Bushes',
    description: 'Low vegetation providing concealment',
    traits: ['Soft Cover'],
    color: '#15803d',
    shapeOptions: [
      {
        kind: 'rectangle',
        label: 'Short (4×1")',
        width: 4,
        height: 1,
      },
      {
        kind: 'rectangle',
        label: 'Medium (6×1")',
        width: 6,
        height: 1,
      },
      {
        kind: 'circle',
        label: 'Cluster (3")',
        radius: 1.5,
      },
      {
        kind: 'polygon',
        label: 'Curved (6")',
        points: scalePolygon(HEDGE_CURVED, 3, 1.2),
      },
    ],
  },
];

/**
 * Human-readable labels for terrain traits.
 */
export const TRAIT_LABELS: Record<TerrainTrait, string> = {
  'Soft Cover': 'Soft Cover',
  'Hard Cover': 'Hard Cover',
  Difficult: 'Difficult',
  Dangerous: 'Dangerous',
  Impassable: 'Impassable',
  Elevated: 'Elevated',
  'LoS Blocking': 'LoS Blocking',
};

/**
 * Exact trait descriptions from OPR:AoF rules.
 */
export const TRAIT_DESCRIPTIONS: Record<TerrainTrait, string> = {
  'Soft Cover': '+1 to Defense rolls when targeted through/in this terrain',
  'Hard Cover': '+2 to Defense rolls when targeted through/in this terrain',
  Difficult: 'Counts as double distance for movement',
  Dangerous: 'Units moving through must take dangerous terrain tests',
  Impassable: 'Units cannot move through',
  Elevated: 'Units on top gain height advantage',
  'LoS Blocking': 'Completely blocks line of sight',
};
