import type { LayoutState, TerrainPiece, TerrainTemplate } from '../types/layout';

const DEFAULT_TABLE = {
  widthInches: 48,
  heightInches: 48,
  deploymentDepthInches: 12,
  title: 'OPR Terrain Layout',
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
    createTerrainPiece(terrainCatalog[0], { x: 24, y: 25 }, { name: 'Central Ruins' }),
    createTerrainPiece(terrainCatalog[1], { x: 15, y: 37 }, { name: 'North Woods' }),
    createTerrainPiece(terrainCatalog[2], { x: 37, y: 34 }, { name: 'East Hill' }),
    createTerrainPiece(terrainCatalog[3], { x: 25, y: 16 }, { name: 'Midfield Barricade', rotation: 28 }),
    createTerrainPiece(terrainCatalog[4], { x: 10, y: 13 }, { name: 'West Bunker' }),
    createTerrainPiece(terrainCatalog[5], { x: 38, y: 14 }, { name: 'South Crater', rotation: 12 }),
  ],
});

export const getTerrainTemplate = (templateId: string) =>
  terrainCatalog.find((template) => template.id === templateId);
