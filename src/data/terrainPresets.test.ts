import { describe, it, expect } from 'vitest';
import type { TerrainTrait } from '../terrain/types';
import { TERRAIN_PRESETS, TRAIT_LABELS, TRAIT_DESCRIPTIONS } from '../data/terrainPresets';

describe('Terrain Data Model', () => {
  it('should have labels for all traits', () => {
    expect(TRAIT_LABELS['Soft Cover']).toBe('Soft Cover');
    expect(TRAIT_LABELS['Hard Cover']).toBe('Hard Cover');
    expect(TRAIT_LABELS.Difficult).toBe('Difficult');
    expect(TRAIT_LABELS.Dangerous).toBe('Dangerous');
    expect(TRAIT_LABELS.Impassable).toBe('Impassable');
    expect(TRAIT_LABELS.Elevated).toBe('Elevated');
    expect(TRAIT_LABELS['LoS Blocking']).toBe('LoS Blocking');
  });

  it('should have exact OPR:AoF rule descriptions for all traits', () => {
    expect(TRAIT_DESCRIPTIONS['Soft Cover']).toBe(
      '+1 to Defense rolls when targeted through/in this terrain',
    );
    expect(TRAIT_DESCRIPTIONS['Hard Cover']).toBe(
      '+2 to Defense rolls when targeted through/in this terrain',
    );
    expect(TRAIT_DESCRIPTIONS.Difficult).toBe('Counts as double distance for movement');
    expect(TRAIT_DESCRIPTIONS.Dangerous).toBe(
      'Units moving through must take dangerous terrain tests',
    );
    expect(TRAIT_DESCRIPTIONS.Impassable).toBe('Units cannot move through');
    expect(TRAIT_DESCRIPTIONS.Elevated).toBe('Units on top gain height advantage');
    expect(TRAIT_DESCRIPTIONS['LoS Blocking']).toBe('Completely blocks line of sight');
  });
});

describe('Terrain Presets', () => {
  it('should include all required presets', () => {
    const presetIds = TERRAIN_PRESETS.map((p) => p.id);
    expect(presetIds).toContain('forest');
    expect(presetIds).toContain('hill');
    expect(presetIds).toContain('building');
    expect(presetIds).toContain('wall');
    expect(presetIds).toContain('water');
    expect(presetIds).toContain('rocky-outcrop');
    expect(presetIds).toContain('hedge');
  });

  it('should have correct traits for Forest/Woods preset', () => {
    const forest = TERRAIN_PRESETS.find((p) => p.id === 'forest');
    expect(forest).toBeDefined();
    expect(forest?.traits).toContain('Soft Cover' satisfies TerrainTrait);
    expect(forest?.traits).toContain('Difficult' satisfies TerrainTrait);
    expect(forest?.traits.length).toBe(2);
  });

  it('should have correct traits for Hill preset', () => {
    const hill = TERRAIN_PRESETS.find((p) => p.id === 'hill');
    expect(hill).toBeDefined();
    expect(hill?.traits).toContain('Elevated' satisfies TerrainTrait);
    expect(hill?.traits.length).toBe(1);
  });

  it('should have correct traits for Building/Ruins preset', () => {
    const building = TERRAIN_PRESETS.find((p) => p.id === 'building');
    expect(building).toBeDefined();
    expect(building?.traits).toContain('Hard Cover' satisfies TerrainTrait);
    expect(building?.traits).toContain('Difficult' satisfies TerrainTrait);
    expect(building?.traits).toContain('LoS Blocking' satisfies TerrainTrait);
    expect(building?.traits.length).toBe(3);
  });

  it('should have correct traits for Wall/Fence preset', () => {
    const wall = TERRAIN_PRESETS.find((p) => p.id === 'wall');
    expect(wall).toBeDefined();
    expect(wall?.traits).toContain('Soft Cover' satisfies TerrainTrait);
    expect(wall?.traits.length).toBe(1);
  });

  it('should have correct traits for Water/River preset', () => {
    const water = TERRAIN_PRESETS.find((p) => p.id === 'water');
    expect(water).toBeDefined();
    expect(water?.traits).toContain('Dangerous' satisfies TerrainTrait);
    expect(water?.traits.length).toBe(1);
  });

  it('should have correct traits for Rocky Outcrop preset', () => {
    const rocky = TERRAIN_PRESETS.find((p) => p.id === 'rocky-outcrop');
    expect(rocky).toBeDefined();
    expect(rocky?.traits).toContain('Hard Cover' satisfies TerrainTrait);
    expect(rocky?.traits).toContain('Impassable' satisfies TerrainTrait);
    expect(rocky?.traits).toContain('LoS Blocking' satisfies TerrainTrait);
    expect(rocky?.traits.length).toBe(3);
  });

  it('should have correct traits for Hedge/Bushes preset', () => {
    const hedge = TERRAIN_PRESETS.find((p) => p.id === 'hedge');
    expect(hedge).toBeDefined();
    expect(hedge?.traits).toContain('Soft Cover' satisfies TerrainTrait);
    expect(hedge?.traits.length).toBe(1);
  });

  it('should have shape options for all presets', () => {
    TERRAIN_PRESETS.forEach((preset) => {
      expect(preset.shapeOptions.length).toBeGreaterThan(0);
      preset.shapeOptions.forEach((option) => {
        expect(['rectangle', 'circle', 'polygon']).toContain(option.kind);
        expect(option.label).toBeTruthy();
      });
    });
  });

  it('should have valid dimensions for shape options', () => {
    TERRAIN_PRESETS.forEach((preset) => {
      preset.shapeOptions.forEach((option) => {
        if (option.kind === 'rectangle') {
          expect(option.width).toBeGreaterThan(0);
          expect(option.height).toBeGreaterThan(0);
        } else if (option.kind === 'circle') {
          expect(option.radius).toBeGreaterThan(0);
        } else if (option.kind === 'polygon') {
          expect(option.points.length).toBeGreaterThanOrEqual(3);
        }
      });
    });
  });

  it('should include polygon/irregular shape options as required', () => {
    const forest = TERRAIN_PRESETS.find((p) => p.id === 'forest');
    expect(forest?.shapeOptions.some((opt) => opt.kind === 'polygon')).toBe(true);

    const hill = TERRAIN_PRESETS.find((p) => p.id === 'hill');
    expect(hill?.shapeOptions.some((opt) => opt.kind === 'polygon')).toBe(true);

    const building = TERRAIN_PRESETS.find((p) => p.id === 'building');
    expect(building?.shapeOptions.some((opt) => opt.kind === 'polygon')).toBe(true);

    const water = TERRAIN_PRESETS.find((p) => p.id === 'water');
    expect(water?.shapeOptions.some((opt) => opt.kind === 'polygon')).toBe(true);

    const rocky = TERRAIN_PRESETS.find((p) => p.id === 'rocky-outcrop');
    expect(rocky?.shapeOptions.some((opt) => opt.kind === 'polygon')).toBe(true);

    const hedge = TERRAIN_PRESETS.find((p) => p.id === 'hedge');
    expect(hedge?.shapeOptions.some((opt) => opt.kind === 'polygon')).toBe(true);
  });
});
