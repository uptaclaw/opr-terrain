import { calculateTerrainSummary, getTerrainSummaryCategory } from './terrainSummary';
import type { TerrainPiece, TerrainTrait } from '../types/layout';

const createTrait = (overrides: Partial<TerrainTrait> = {}): TerrainTrait => ({
  id: 'trait',
  label: 'Trait',
  category: 'movement',
  active: true,
  ...overrides,
});

const createPiece = (id: string, traits: TerrainTrait[]): TerrainPiece => ({
  id,
  templateId: 'custom',
  name: `Piece ${id}`,
  shape: 'rect',
  fill: '#475569',
  stroke: '#f8fafc',
  width: 6,
  height: 4,
  x: 12,
  y: 12,
  rotation: 0,
  traits,
});

describe('terrainSummary', () => {
  it('maps legacy layout trait labels into the seven summary buckets', () => {
    expect(getTerrainSummaryCategory(createTrait({ id: 'heavy-cover', label: 'Heavy cover', category: 'cover' }))).toBe(
      'hard-cover',
    );
    expect(getTerrainSummaryCategory(createTrait({ id: 'light-cover', label: 'Light cover', category: 'cover' }))).toBe(
      'soft-cover',
    );
    expect(
      getTerrainSummaryCategory(
        createTrait({ id: 'difficult-ground', label: 'Difficult ground', category: 'movement' }),
      ),
    ).toBe('difficult');
    expect(getTerrainSummaryCategory(createTrait({ id: 'rough-ground', label: 'Rough ground', category: 'movement' }))).toBe(
      'difficult',
    );
    expect(getTerrainSummaryCategory(createTrait({ id: 'dangerous', label: 'Dangerous', category: 'movement' }))).toBe(
      'dangerous',
    );
    expect(getTerrainSummaryCategory(createTrait({ id: 'impassable', label: 'Impassable walls', category: 'movement' }))).toBe(
      'impassable',
    );
    expect(getTerrainSummaryCategory(createTrait({ id: 'elevated', label: 'Elevated position', category: 'movement' }))).toBe(
      'elevated',
    );
    expect(
      getTerrainSummaryCategory(
        createTrait({ id: 'obscuring', label: 'Obscures line of sight', category: 'los' }),
      ),
    ).toBe('los-blocking');
    expect(
      getTerrainSummaryCategory(
        createTrait({ id: 'open-los', label: 'Open line of sight', category: 'los' }),
      ),
    ).toBeNull();
  });

  it('counts each piece once per category, ignores inactive traits, and keeps percentages tied to total pieces', () => {
    const summary = calculateTerrainSummary([
      createPiece('ruins', [
        createTrait({ id: 'heavy-cover', label: 'Heavy cover', category: 'cover' }),
        createTrait({ id: 'difficult-ground', label: 'Difficult ground', category: 'movement' }),
        createTrait({ id: 'blocks-los', label: 'Blocks line of sight', category: 'los' }),
        createTrait({ id: 'obscuring', label: 'Obscures line of sight', category: 'los' }),
      ]),
      createPiece('forest', [
        createTrait({ id: 'light-cover', label: 'Light cover', category: 'cover' }),
        createTrait({ id: 'rough-ground', label: 'Rough ground', category: 'movement' }),
        createTrait({ id: 'dangerous', label: 'Dangerous', category: 'movement' }),
      ]),
      createPiece('bunker', [
        createTrait({ id: 'impassable', label: 'Impassable walls', category: 'movement' }),
        createTrait({ id: 'heavy-cover', label: 'Heavy cover', category: 'cover' }),
      ]),
      createPiece('hill', [
        createTrait({ id: 'elevated', label: 'Elevated position', category: 'movement' }),
        createTrait({ id: 'light-cover', label: 'Light cover', category: 'cover', active: false }),
      ]),
    ]);

    expect(summary.totalPieces).toBe(4);
    expect(summary.stats).toEqual([
      expect.objectContaining({ id: 'impassable', count: 1, percentage: 25 }),
      expect.objectContaining({ id: 'hard-cover', count: 2, percentage: 50 }),
      expect.objectContaining({ id: 'soft-cover', count: 1, percentage: 25 }),
      expect.objectContaining({ id: 'difficult', count: 2, percentage: 50 }),
      expect.objectContaining({ id: 'dangerous', count: 1, percentage: 25 }),
      expect.objectContaining({ id: 'elevated', count: 1, percentage: 25 }),
      expect.objectContaining({ id: 'los-blocking', count: 1, percentage: 25 }),
    ]);
  });

  it('returns zeroed stats when there are no terrain pieces', () => {
    const summary = calculateTerrainSummary([]);

    expect(summary.totalPieces).toBe(0);
    expect(summary.stats.every((stat) => stat.count === 0 && stat.percentage === 0)).toBe(true);
  });
});
