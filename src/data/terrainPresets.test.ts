import { describe, it, expect } from 'vitest';
import { TerrainTrait } from '../types/terrain';
import { TERRAIN_PRESETS, TRAIT_LABELS, TRAIT_DESCRIPTIONS } from '../data/terrainPresets';

describe('Terrain Data Model', () => {
  it('should define all terrain traits', () => {
    expect(TerrainTrait.SoftCover).toBe('SOFT_COVER');
    expect(TerrainTrait.HardCover).toBe('HARD_COVER');
    expect(TerrainTrait.Difficult).toBe('DIFFICULT');
    expect(TerrainTrait.Dangerous).toBe('DANGEROUS');
    expect(TerrainTrait.Impassable).toBe('IMPASSABLE');
    expect(TerrainTrait.Elevated).toBe('ELEVATED');
    expect(TerrainTrait.LoSBlocking).toBe('LOS_BLOCKING');
  });

  it('should have labels for all traits', () => {
    expect(TRAIT_LABELS[TerrainTrait.SoftCover]).toBe('Soft Cover');
    expect(TRAIT_LABELS[TerrainTrait.HardCover]).toBe('Hard Cover');
    expect(TRAIT_LABELS[TerrainTrait.Difficult]).toBe('Difficult');
    expect(TRAIT_LABELS[TerrainTrait.Dangerous]).toBe('Dangerous');
    expect(TRAIT_LABELS[TerrainTrait.Impassable]).toBe('Impassable');
    expect(TRAIT_LABELS[TerrainTrait.Elevated]).toBe('Elevated');
    expect(TRAIT_LABELS[TerrainTrait.LoSBlocking]).toBe('LoS Blocking');
  });

  it('should have descriptions for all traits', () => {
    expect(TRAIT_DESCRIPTIONS[TerrainTrait.SoftCover]).toBe('+1 to Defense rolls');
    expect(TRAIT_DESCRIPTIONS[TerrainTrait.HardCover]).toBe('+2 to Defense rolls');
    expect(TRAIT_DESCRIPTIONS[TerrainTrait.Difficult]).toBe('Double movement distance');
    expect(TRAIT_DESCRIPTIONS[TerrainTrait.Dangerous]).toBe('Dangerous terrain test required');
    expect(TRAIT_DESCRIPTIONS[TerrainTrait.Impassable]).toBe('Units cannot move through');
    expect(TRAIT_DESCRIPTIONS[TerrainTrait.Elevated]).toBe('Height advantage for units on top');
    expect(TRAIT_DESCRIPTIONS[TerrainTrait.LoSBlocking]).toBe('Blocks line of sight');
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
    expect(forest?.traits).toContain(TerrainTrait.SoftCover);
    expect(forest?.traits).toContain(TerrainTrait.Difficult);
    expect(forest?.traits.length).toBe(2);
  });

  it('should have correct traits for Hill preset', () => {
    const hill = TERRAIN_PRESETS.find((p) => p.id === 'hill');
    expect(hill).toBeDefined();
    expect(hill?.traits).toContain(TerrainTrait.Elevated);
    expect(hill?.traits.length).toBe(1);
  });

  it('should have correct traits for Building/Ruins preset', () => {
    const building = TERRAIN_PRESETS.find((p) => p.id === 'building');
    expect(building).toBeDefined();
    expect(building?.traits).toContain(TerrainTrait.HardCover);
    expect(building?.traits).toContain(TerrainTrait.Difficult);
    expect(building?.traits).toContain(TerrainTrait.LoSBlocking);
    expect(building?.traits.length).toBe(3);
  });

  it('should have correct traits for Wall/Fence preset', () => {
    const wall = TERRAIN_PRESETS.find((p) => p.id === 'wall');
    expect(wall).toBeDefined();
    expect(wall?.traits).toContain(TerrainTrait.SoftCover);
    expect(wall?.traits.length).toBe(1);
  });

  it('should have correct traits for Water/River preset', () => {
    const water = TERRAIN_PRESETS.find((p) => p.id === 'water');
    expect(water).toBeDefined();
    expect(water?.traits).toContain(TerrainTrait.Dangerous);
    expect(water?.traits.length).toBe(1);
  });

  it('should have correct traits for Rocky Outcrop preset', () => {
    const rocky = TERRAIN_PRESETS.find((p) => p.id === 'rocky-outcrop');
    expect(rocky).toBeDefined();
    expect(rocky?.traits).toContain(TerrainTrait.HardCover);
    expect(rocky?.traits).toContain(TerrainTrait.Impassable);
    expect(rocky?.traits).toContain(TerrainTrait.LoSBlocking);
    expect(rocky?.traits.length).toBe(3);
  });

  it('should have correct traits for Hedge/Bushes preset', () => {
    const hedge = TERRAIN_PRESETS.find((p) => p.id === 'hedge');
    expect(hedge).toBeDefined();
    expect(hedge?.traits).toContain(TerrainTrait.SoftCover);
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
          expect(option.dimensions.width).toBeGreaterThan(0);
          expect(option.dimensions.height).toBeGreaterThan(0);
        } else if (option.kind === 'circle') {
          expect(option.dimensions.diameter).toBeGreaterThan(0);
        }
      });
    });
  });
});
