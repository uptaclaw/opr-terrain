import type { TerrainPreset, TerrainTrait } from '../types/terrain';

/**
 * Pre-defined terrain presets matching common OPR:AoF terrain types.
 */
export const TERRAIN_PRESETS: TerrainPreset[] = [
  {
    id: 'forest',
    name: 'Forest / Woods',
    description: 'Dense vegetation providing cover and slowing movement',
    traits: ['SOFT_COVER', 'DIFFICULT'] as TerrainTrait[],
    color: '#22c55e',
    shapeOptions: [
      {
        kind: 'circle',
        label: 'Small (4")',
        dimensions: { diameter: 4 },
      },
      {
        kind: 'circle',
        label: 'Medium (6")',
        dimensions: { diameter: 6 },
      },
      {
        kind: 'circle',
        label: 'Large (8")',
        dimensions: { diameter: 8 },
      },
    ],
  },
  {
    id: 'hill',
    name: 'Hill',
    description: 'Elevated terrain granting height advantage',
    traits: ['ELEVATED'] as TerrainTrait[],
    color: '#a16207',
    shapeOptions: [
      {
        kind: 'circle',
        label: 'Small (5")',
        dimensions: { diameter: 5 },
      },
      {
        kind: 'circle',
        label: 'Medium (7")',
        dimensions: { diameter: 7 },
      },
      {
        kind: 'circle',
        label: 'Large (10")',
        dimensions: { diameter: 10 },
      },
    ],
  },
  {
    id: 'building',
    name: 'Building / Ruins',
    description: 'Solid structure providing strong cover and blocking sight',
    traits: ['HARD_COVER', 'DIFFICULT', 'LOS_BLOCKING'] as TerrainTrait[],
    color: '#64748b',
    shapeOptions: [
      {
        kind: 'rectangle',
        label: 'Small (3×3")',
        dimensions: { width: 3, height: 3 },
      },
      {
        kind: 'rectangle',
        label: 'Medium (5×4")',
        dimensions: { width: 5, height: 4 },
      },
      {
        kind: 'rectangle',
        label: 'Large (6×6")',
        dimensions: { width: 6, height: 6 },
      },
      {
        kind: 'rectangle',
        label: 'Long (8×4")',
        dimensions: { width: 8, height: 4 },
      },
    ],
  },
  {
    id: 'wall',
    name: 'Wall / Fence',
    description: 'Linear barrier providing light cover',
    traits: ['SOFT_COVER'] as TerrainTrait[],
    color: '#78716c',
    shapeOptions: [
      {
        kind: 'rectangle',
        label: 'Short (4×0.5")',
        dimensions: { width: 4, height: 0.5 },
      },
      {
        kind: 'rectangle',
        label: 'Medium (6×0.5")',
        dimensions: { width: 6, height: 0.5 },
      },
      {
        kind: 'rectangle',
        label: 'Long (8×0.5")',
        dimensions: { width: 8, height: 0.5 },
      },
    ],
  },
  {
    id: 'water',
    name: 'Water / River',
    description: 'Hazardous liquid terrain',
    traits: ['DANGEROUS'] as TerrainTrait[],
    color: '#0ea5e9',
    shapeOptions: [
      {
        kind: 'rectangle',
        label: 'Stream (6×2")',
        dimensions: { width: 6, height: 2 },
      },
      {
        kind: 'rectangle',
        label: 'River (8×3")',
        dimensions: { width: 8, height: 3 },
      },
      {
        kind: 'circle',
        label: 'Pool (5")',
        dimensions: { diameter: 5 },
      },
    ],
  },
  {
    id: 'rocky-outcrop',
    name: 'Rocky Outcrop',
    description: 'Impassable rock formation blocking sight and movement',
    traits: ['HARD_COVER', 'IMPASSABLE', 'LOS_BLOCKING'] as TerrainTrait[],
    color: '#57534e',
    shapeOptions: [
      {
        kind: 'circle',
        label: 'Small (2")',
        dimensions: { diameter: 2 },
      },
      {
        kind: 'circle',
        label: 'Medium (3")',
        dimensions: { diameter: 3 },
      },
      {
        kind: 'rectangle',
        label: 'Large (4×3")',
        dimensions: { width: 4, height: 3 },
      },
    ],
  },
  {
    id: 'hedge',
    name: 'Hedge / Bushes',
    description: 'Low vegetation providing concealment',
    traits: ['SOFT_COVER'] as TerrainTrait[],
    color: '#15803d',
    shapeOptions: [
      {
        kind: 'rectangle',
        label: 'Short (4×1")',
        dimensions: { width: 4, height: 1 },
      },
      {
        kind: 'rectangle',
        label: 'Medium (6×1")',
        dimensions: { width: 6, height: 1 },
      },
      {
        kind: 'circle',
        label: 'Cluster (3")',
        dimensions: { diameter: 3 },
      },
    ],
  },
];

/**
 * Human-readable labels for terrain traits.
 */
export const TRAIT_LABELS: Record<TerrainTrait, string> = {
  SOFT_COVER: 'Soft Cover',
  HARD_COVER: 'Hard Cover',
  DIFFICULT: 'Difficult',
  DANGEROUS: 'Dangerous',
  IMPASSABLE: 'Impassable',
  ELEVATED: 'Elevated',
  LOS_BLOCKING: 'LoS Blocking',
};

/**
 * Short descriptions for terrain traits (for tooltips).
 */
export const TRAIT_DESCRIPTIONS: Record<TerrainTrait, string> = {
  SOFT_COVER: '+1 to Defense rolls',
  HARD_COVER: '+2 to Defense rolls',
  DIFFICULT: 'Double movement distance',
  DANGEROUS: 'Dangerous terrain test required',
  IMPASSABLE: 'Units cannot move through',
  ELEVATED: 'Height advantage for units on top',
  LOS_BLOCKING: 'Blocks line of sight',
};
