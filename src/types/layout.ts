import type { PlacementConfig } from '../terrain/types';
import type { OPRValidation } from '../terrain/types';

export type TerrainTraitCategory = 'cover' | 'movement' | 'los';

export type TerrainShape = 'rect' | 'ellipse' | 'diamond';

export interface TerrainTrait {
  id: string;
  label: string;
  category: TerrainTraitCategory;
  active: boolean;
}

export interface TerrainPiece {
  id: string;
  templateId: string;
  name: string;
  shape: TerrainShape;
  fill: string;
  stroke: string;
  width: number;
  height: number;
  x: number;
  y: number;
  rotation: number;
  traits: TerrainTrait[];
}

export interface TableSettings {
  widthInches: number;
  heightInches: number;
  deploymentDepthInches: number;
  title: string;
}

export interface LayoutState {
  version: 1;
  table: TableSettings;
  pieces: TerrainPiece[];
  placementConfig?: PlacementConfig;
  customTemplates?: TerrainTemplate[];
  oprValidation?: OPRValidation;
}

export interface SavedLayoutRecord {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  layout: LayoutState;
}

export interface TerrainTemplate {
  id: string;
  name: string;
  shape: TerrainShape;
  fill: string;
  stroke: string;
  width: number;
  height: number;
  defaultRotation?: number;
  traits: Array<Omit<TerrainTrait, 'active'> & { active?: boolean }>;
}
