import type { TerrainShapeKind, TerrainTrait } from '../terrain/types';

export interface TerrainLibraryItem {
  templateId: string;
  name: string;
  color: string;
  traits: TerrainTrait[];
  shapeKind: TerrainShapeKind;
  description: string;
}

export const TERRAIN_LIBRARY: TerrainLibraryItem[] = [
  {
    templateId: 'forest',
    name: 'Forest',
    color: '#2f855a',
    traits: ['Soft Cover', 'Difficult'],
    shapeKind: 'circle',
    description: 'Soft cover and difficult ground for infantry lanes.',
  },
  {
    templateId: 'ruins',
    name: 'Ruins',
    color: '#8b6b4f',
    traits: ['Hard Cover', 'Difficult', 'LoS Blocking'],
    shapeKind: 'rectangle',
    description: 'Dense hard cover with line-of-sight blocking walls.',
  },
  {
    templateId: 'hill',
    name: 'Hill',
    color: '#b9a06a',
    traits: ['Elevated'],
    shapeKind: 'circle',
    description: 'Elevated firing position with a broad footprint.',
  },
  {
    templateId: 'wall',
    name: 'Wall',
    color: '#94a3b8',
    traits: ['Soft Cover'],
    shapeKind: 'rectangle',
    description: 'Long linear barrier that can be rotated into firing lanes.',
  },
  {
    templateId: 'marsh',
    name: 'Marsh',
    color: '#2563eb',
    traits: ['Dangerous', 'Difficult'],
    shapeKind: 'polygon',
    description: 'Hazardous bog that slows movement and punishes bad routes.',
  },
  {
    templateId: 'outcrop',
    name: 'Outcrop',
    color: '#64748b',
    traits: ['Hard Cover', 'Impassable', 'LoS Blocking'],
    shapeKind: 'polygon',
    description: 'Chunky impassable rock that blocks sightlines.',
  },
  {
    templateId: 'hedge',
    name: 'Hedge',
    color: '#65a30d',
    traits: ['Soft Cover'],
    shapeKind: 'rectangle',
    description: 'Flexible light cover for sculpting movement channels.',
  },
];
