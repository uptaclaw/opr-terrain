import type {
  LayoutState,
  TerrainPiece,
  TerrainShape as LayoutTerrainShape,
  TerrainTemplate,
  TerrainTrait,
} from '../types/layout';
import type {
  TerrainPiece as GeneratedTerrainPiece,
  TerrainShape as GeneratedTerrainShape,
  TerrainTrait as GeneratedTerrainTrait,
} from '../terrain/types';
import {
  DEFAULT_DEPLOYMENT_DEPTH_INCHES,
  DEFAULT_TABLE_HEIGHT_INCHES,
  DEFAULT_TABLE_TITLE,
  DEFAULT_TABLE_WIDTH_INCHES,
} from '../table/tableGeometry';

const DEFAULT_TABLE = {
  widthInches: DEFAULT_TABLE_WIDTH_INCHES,
  heightInches: DEFAULT_TABLE_HEIGHT_INCHES,
  deploymentDepthInches: DEFAULT_DEPLOYMENT_DEPTH_INCHES,
  title: DEFAULT_TABLE_TITLE,
} as const;

export const terrainCatalog: TerrainTemplate[] = [
  {
    id: 'ruins',
    name: 'Ruins',
    shape: 'rect',
    fill: '#7c3aed',
    stroke: '#ede9fe',
    width: 8,
    height: 6,
    traits: [
      { id: 'heavy-cover', label: 'Heavy cover', category: 'cover', active: true },
      { id: 'difficult-ground', label: 'Difficult ground', category: 'movement', active: true },
      { id: 'blocks-los', label: 'Blocks line of sight', category: 'los', active: true },
    ],
  },
  {
    id: 'forest',
    name: 'Forest',
    shape: 'ellipse',
    fill: '#16a34a',
    stroke: '#dcfce7',
    width: 9,
    height: 7,
    traits: [
      { id: 'light-cover', label: 'Light cover', category: 'cover', active: true },
      { id: 'difficult-ground', label: 'Difficult ground', category: 'movement', active: true },
      { id: 'obscuring', label: 'Obscures line of sight', category: 'los', active: true },
    ],
  },
  {
    id: 'hill',
    name: 'Hill',
    shape: 'ellipse',
    fill: '#d97706',
    stroke: '#ffedd5',
    width: 10,
    height: 7,
    traits: [
      { id: 'light-cover', label: 'Light cover', category: 'cover', active: true },
      { id: 'elevated', label: 'Elevated position', category: 'movement', active: true },
      { id: 'open-los', label: 'Open line of sight', category: 'los', active: true },
    ],
  },
  {
    id: 'barricade',
    name: 'Barricade',
    shape: 'rect',
    fill: '#f59e0b',
    stroke: '#fef3c7',
    width: 7,
    height: 2.5,
    defaultRotation: 18,
    traits: [
      { id: 'light-cover', label: 'Light cover', category: 'cover', active: true },
      { id: 'passable', label: 'Passable obstacle', category: 'movement', active: true },
      { id: 'partial-los', label: 'Partial line of sight block', category: 'los', active: true },
    ],
  },
  {
    id: 'bunker',
    name: 'Bunker',
    shape: 'rect',
    fill: '#475569',
    stroke: '#f8fafc',
    width: 6,
    height: 4,
    traits: [
      { id: 'heavy-cover', label: 'Heavy cover', category: 'cover', active: true },
      { id: 'impassable', label: 'Impassable walls', category: 'movement', active: true },
      { id: 'blocks-los', label: 'Blocks line of sight', category: 'los', active: true },
    ],
  },
  {
    id: 'crater',
    name: 'Crater',
    shape: 'diamond',
    fill: '#0f766e',
    stroke: '#99f6e4',
    width: 6,
    height: 5,
    traits: [
      { id: 'light-cover', label: 'Light cover', category: 'cover', active: true },
      { id: 'rough-ground', label: 'Rough ground', category: 'movement', active: true },
      { id: 'open-los', label: 'Open line of sight', category: 'los', active: false },
    ],
  },
];

const createId = () => globalThis.crypto?.randomUUID?.() ?? `piece-${Math.random().toString(36).slice(2, 10)}`;

export const cloneLayout = (layout: LayoutState): LayoutState =>
  JSON.parse(JSON.stringify(layout)) as LayoutState;

export const createTerrainPiece = (
  template: TerrainTemplate,
  position: { x: number; y: number },
  overrides: Partial<TerrainPiece> = {},
): TerrainPiece => ({
  id: createId(),
  templateId: template.id,
  name: template.name,
  shape: template.shape,
  fill: template.fill,
  stroke: template.stroke,
  width: template.width,
  height: template.height,
  x: position.x,
  y: position.y,
  rotation: template.defaultRotation ?? 0,
  traits: template.traits.map((trait) => ({
    id: trait.id,
    label: trait.label,
    category: trait.category,
    active: trait.active ?? true,
  })),
  ...overrides,
});

export const createDefaultLayout = (): LayoutState => ({
  version: 1,
  table: { ...DEFAULT_TABLE },
  pieces: [
    createTerrainPiece(terrainCatalog[0], { x: 36, y: 24 }, { name: 'Central Ruins' }),
    createTerrainPiece(terrainCatalog[1], { x: 22.5, y: 38 }, { name: 'North Woods' }),
    createTerrainPiece(terrainCatalog[2], { x: 54, y: 36.5 }, { name: 'East Hill' }),
    createTerrainPiece(terrainCatalog[3], { x: 36, y: 16 }, { name: 'Midfield Barricade', rotation: 28 }),
    createTerrainPiece(terrainCatalog[4], { x: 16.5, y: 12 }, { name: 'West Bunker' }),
    createTerrainPiece(terrainCatalog[5], { x: 55.5, y: 10 }, { name: 'South Crater', rotation: 12 }),
  ],
});

export const getTerrainTemplate = (templateId: string) =>
  terrainCatalog.find((template) => template.id === templateId);

const generatedTraitCategoryMap: Record<GeneratedTerrainTrait, TerrainTrait['category']> = {
  'Soft Cover': 'cover',
  'Hard Cover': 'cover',
  Difficult: 'movement',
  Dangerous: 'movement',
  Impassable: 'movement',
  Elevated: 'los',
  'LoS Blocking': 'los',
};

const getLayoutShapeFromGeneratedShape = (shape: GeneratedTerrainShape): LayoutTerrainShape => {
  switch (shape.kind) {
    case 'circle':
      return 'ellipse';
    case 'rectangle':
      return 'rect';
    case 'polygon':
    default:
      return 'diamond';
  }
};

const getLayoutDimensionsFromGeneratedShape = (shape: GeneratedTerrainShape) => {
  if (shape.kind === 'circle') {
    const diameter = shape.radius * 2;
    return { width: diameter, height: diameter };
  }

  if (shape.kind === 'rectangle') {
    return { width: shape.width, height: shape.height };
  }

  const xs = shape.points.map((point) => point.x);
  const ys = shape.points.map((point) => point.y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);

  return {
    width: Math.max(width, 2),
    height: Math.max(height, 2),
  };
};

export const convertGeneratedTerrainPieceToLayoutPiece = (
  terrainPiece: GeneratedTerrainPiece,
): TerrainPiece => {
  const { width, height } = getLayoutDimensionsFromGeneratedShape(terrainPiece.shape);

  return {
    id: terrainPiece.id,
    templateId: terrainPiece.templateId,
    name: terrainPiece.name,
    shape: getLayoutShapeFromGeneratedShape(terrainPiece.shape),
    fill: terrainPiece.color,
    stroke: terrainPiece.color,
    width,
    height,
    x: terrainPiece.x,
    y: terrainPiece.y,
    rotation: terrainPiece.rotation,
    traits: terrainPiece.traits.map((traitLabel, index) => ({
      id: `${terrainPiece.id}-trait-${index}`,
      label: traitLabel,
      category: generatedTraitCategoryMap[traitLabel],
      active: true,
    })),
  };
};
