import type { TerrainPoint, TerrainShape, TerrainShapeKind, TerrainTrait } from './types';

export interface TerrainTemplate {
  id: string;
  name: string;
  color: string;
  traits: TerrainTrait[];
  weight: number;
  shapeKinds: TerrainShapeKind[];
  buildShape: (shapeKind: TerrainShapeKind, random: () => number) => TerrainShape;
}

const randomBetween = (min: number, max: number, random: () => number) =>
  min + (max - min) * random();

const randomInteger = (min: number, max: number, random: () => number) =>
  Math.floor(randomBetween(min, max + 1, random));

const pickOne = <T,>(items: readonly T[], random: () => number) =>
  items[Math.floor(random() * items.length)] ?? items[0];

const scalePolygon = (
  points: readonly TerrainPoint[],
  scaleX: number,
  scaleY: number,
  random: () => number,
  jitter = 0.14,
): TerrainPoint[] =>
  points.map((point) => ({
    x: point.x * scaleX * (1 + randomBetween(-jitter, jitter, random)),
    y: point.y * scaleY * (1 + randomBetween(-jitter, jitter, random)),
  }));

const BROAD_POLYGONS: readonly TerrainPoint[][] = [
  [
    { x: -1.05, y: -0.45 },
    { x: -0.45, y: -1.05 },
    { x: 0.4, y: -0.9 },
    { x: 1.05, y: -0.3 },
    { x: 0.85, y: 0.6 },
    { x: 0.15, y: 1.05 },
    { x: -0.8, y: 0.8 },
    { x: -1.2, y: 0.05 },
  ],
  [
    { x: -1.1, y: -0.2 },
    { x: -0.6, y: -1 },
    { x: 0.3, y: -1.05 },
    { x: 1.15, y: -0.35 },
    { x: 0.95, y: 0.45 },
    { x: 0.35, y: 1.1 },
    { x: -0.55, y: 0.95 },
    { x: -1.15, y: 0.35 },
  ],
];

const OUTCROP_POLYGONS: readonly TerrainPoint[][] = [
  [
    { x: -1.05, y: -0.55 },
    { x: -0.15, y: -1.15 },
    { x: 0.95, y: -0.7 },
    { x: 1.1, y: 0.1 },
    { x: 0.45, y: 0.95 },
    { x: -0.55, y: 1.05 },
    { x: -1.15, y: 0.3 },
  ],
  [
    { x: -0.95, y: -0.25 },
    { x: -0.35, y: -1.1 },
    { x: 0.55, y: -1 },
    { x: 1.15, y: -0.1 },
    { x: 0.85, y: 0.9 },
    { x: -0.1, y: 1.05 },
    { x: -1.05, y: 0.45 },
  ],
];

const STRIP_POLYGONS: readonly TerrainPoint[][] = [
  [
    { x: -1.4, y: -0.45 },
    { x: -0.6, y: -0.75 },
    { x: 0.2, y: -0.55 },
    { x: 1.3, y: -0.2 },
    { x: 1.45, y: 0.35 },
    { x: 0.45, y: 0.75 },
    { x: -0.55, y: 0.55 },
    { x: -1.35, y: 0.2 },
  ],
  [
    { x: -1.35, y: -0.25 },
    { x: -0.55, y: -0.8 },
    { x: 0.35, y: -0.65 },
    { x: 1.35, y: -0.15 },
    { x: 1.1, y: 0.65 },
    { x: 0.15, y: 0.8 },
    { x: -0.8, y: 0.55 },
    { x: -1.45, y: 0.15 },
  ],
];

const buildBroadPolygon = (
  random: () => number,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
): TerrainShape => ({
  kind: 'polygon',
  points: scalePolygon(
    pickOne(BROAD_POLYGONS, random),
    randomBetween(minX, maxX, random),
    randomBetween(minY, maxY, random),
    random,
  ),
});

const buildOutcropPolygon = (random: () => number): TerrainShape => ({
  kind: 'polygon',
  points: scalePolygon(
    pickOne(OUTCROP_POLYGONS, random),
    randomBetween(2, 3, random),
    randomBetween(2, 3, random),
    random,
  ),
});

const buildOutcropPolygonMedium = (random: () => number): TerrainShape => ({
  kind: 'polygon',
  points: scalePolygon(
    pickOne(OUTCROP_POLYGONS, random),
    randomBetween(3.5, 5.5, random),
    randomBetween(3.5, 5.5, random),
    random,
  ),
});

const buildStripPolygon = (
  random: () => number,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
): TerrainShape => ({
  kind: 'polygon',
  points: scalePolygon(
    pickOne(STRIP_POLYGONS, random),
    randomBetween(minX, maxX, random),
    randomBetween(minY, maxY, random),
    random,
    0.1,
  ),
});

const circle = (minRadius: number, maxRadius: number, random: () => number): TerrainShape => ({
  kind: 'circle',
  radius: randomBetween(minRadius, maxRadius, random),
});

const rectangle = (
  minWidth: number,
  maxWidth: number,
  minHeight: number,
  maxHeight: number,
  random: () => number,
): TerrainShape => ({
  kind: 'rectangle',
  width: randomBetween(minWidth, maxWidth, random),
  height: randomBetween(minHeight, maxHeight, random),
});

export const terrainCatalog: readonly TerrainTemplate[] = [
  {
    id: 'forest',
    name: 'Forest',
    color: '#2f855a',
    traits: ['Soft Cover', 'Difficult'],
    weight: 3,
    shapeKinds: ['circle', 'polygon'],
    buildShape: (shapeKind, random) =>
      shapeKind === 'circle'
        ? circle(4.5, 7.0, random)
        : buildBroadPolygon(random, 4.8, 7.0, 4.5, 6.5),
  },
  {
    id: 'ruins',
    name: 'Ruins',
    color: '#8b6b4f',
    traits: ['Hard Cover', 'Difficult', 'LoS Blocking'],
    weight: 3,
    shapeKinds: ['rectangle', 'polygon'],
    buildShape: (shapeKind, random) =>
      shapeKind === 'rectangle'
        ? rectangle(6.5, 9.5, 5.5, 8.0, random)
        : buildBroadPolygon(random, 4.5, 6.5, 4.0, 6.0),
  },
  {
    id: 'hill',
    name: 'Hill',
    color: '#b9a06a',
    traits: ['Elevated'],
    weight: 2,
    shapeKinds: ['circle', 'polygon'],
    buildShape: (shapeKind, random) =>
      shapeKind === 'circle'
        ? circle(5.5, 7.5, random)
        : buildBroadPolygon(random, 5.5, 8.0, 5.0, 7.0),
  },
  {
    id: 'wall',
    name: 'Wall',
    color: '#94a3b8',
    traits: ['Soft Cover'],
    weight: 2,
    shapeKinds: ['rectangle'],
    buildShape: (_shapeKind, random) => rectangle(9.0, 13.0, 2.0, 2.8, random),
  },
  {
    id: 'marsh',
    name: 'Marsh',
    color: '#2563eb',
    traits: ['Dangerous', 'Difficult'],
    weight: 2,
    shapeKinds: ['polygon', 'rectangle'],
    buildShape: (shapeKind, random) =>
      shapeKind === 'rectangle'
        ? rectangle(8.0, 11.0, 3.5, 5.5, random)
        : buildStripPolygon(random, 5.5, 8.0, 2.5, 4.5),
  },
  {
    id: 'outcrop',
    name: 'Outcrop',
    color: '#64748b',
    traits: ['Hard Cover', 'Impassable', 'LoS Blocking'],
    weight: 2,
    shapeKinds: ['polygon', 'circle'],
    buildShape: (shapeKind, random) =>
      shapeKind === 'circle' ? circle(3.5, 5.5, random) : buildOutcropPolygonMedium(random),
  },
  {
    id: 'hedge',
    name: 'Hedge',
    color: '#65a30d',
    traits: ['Soft Cover'],
    weight: 2,
    shapeKinds: ['rectangle', 'polygon'],
    buildShape: (shapeKind, random) =>
      shapeKind === 'rectangle'
        ? rectangle(7.5, 11.0, 2.2, 3.5, random)
        : buildStripPolygon(random, 5.0, 7.0, 1.8, 3.2),
  },
] as const;

export const getTemplateById = (templateId: string) => {
  const template = terrainCatalog.find((entry) => entry.id === templateId);

  if (!template) {
    throw new Error(`Unknown terrain template: ${templateId}`);
  }

  return template;
};

export const pickWeightedTemplate = (random: () => number) => {
  const totalWeight = terrainCatalog.reduce((sum, template) => sum + template.weight, 0);
  let roll = randomBetween(0, totalWeight, random);

  for (const template of terrainCatalog) {
    roll -= template.weight;

    if (roll <= 0) {
      return template;
    }
  }

  return terrainCatalog[terrainCatalog.length - 1];
};

export const pickShapeKind = (template: TerrainTemplate, random: () => number): TerrainShapeKind =>
  pickOne(template.shapeKinds, random);

export const mandatoryTerrainSelections = [
  { templateId: 'forest', shapeKind: 'circle' },
  { templateId: 'ruins', shapeKind: 'rectangle' },
  { templateId: 'outcrop', shapeKind: 'polygon' },
  { templateId: 'hill', shapeKind: 'circle' },
  { templateId: 'marsh', shapeKind: 'polygon' },
  { templateId: 'hedge', shapeKind: 'rectangle' },
  { templateId: 'wall', shapeKind: 'rectangle' },
] satisfies ReadonlyArray<{ templateId: string; shapeKind: TerrainShapeKind }>;

export const randomRotation = (templateId: string, random: () => number) => {
  if (templateId === 'wall' || templateId === 'hedge') {
    const step = randomInteger(0, 11, random);
    return step * 15;
  }

  return Math.round(randomBetween(0, 359, random));
};
