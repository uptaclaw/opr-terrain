import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AutoPlacementGenerator } from './AutoPlacementGenerator';
import type { PlacementConfig, TerrainLayout } from '../terrain/types';

describe('AutoPlacementGenerator', () => {
  it('initializes with default config when no initialConfig is provided', () => {
    render(
      <AutoPlacementGenerator
        widthInches={48}
        heightInches={72}
        deploymentDepthInches={12}
        onLayoutGenerated={() => {}}
      />,
    );

    // Default strategy is "Random"
    const strategySelect = screen.getByRole('combobox') as HTMLSelectElement;
    expect(strategySelect.value).toBe('random');

    // Default density is "Balanced"
    const balancedButton = screen.getByRole('button', { name: /Balanced/i });
    expect(balancedButton).toHaveClass('border-cyan-400/60');

    // Default piece range follows OPR guidance for a 4'x6' table
    const pieceCountSlider = screen.getByRole('slider') as HTMLInputElement;
    expect(pieceCountSlider.min).toBe('10');
    expect(pieceCountSlider.max).toBe('15');
    expect(Number(pieceCountSlider.value)).toBeGreaterThanOrEqual(10);
    expect(Number(pieceCountSlider.value)).toBeLessThanOrEqual(15);

    expect(screen.getByRole('button', { name: /generate.*re-generate terrain/i })).toBeInTheDocument();
  });

  it('restores UI state from initialConfig prop', () => {
    const savedConfig: PlacementConfig = {
      strategy: 'symmetrical',
      density: 'dense',
      prioritizeCover: true,
      deploymentZoneSafety: false,
      forceSymmetry: false,
    };

    render(
      <AutoPlacementGenerator
        widthInches={48}
        heightInches={72}
        deploymentDepthInches={12}
        onLayoutGenerated={() => {}}
        initialConfig={savedConfig}
      />,
    );

    // Strategy should be restored
    const strategySelect = screen.getByRole('combobox') as HTMLSelectElement;
    expect(strategySelect.value).toBe('symmetrical');

    // Density should be restored
    const denseButton = screen.getByRole('button', { name: /Dense/i });
    expect(denseButton).toHaveClass('border-cyan-400/60');

    // Checkboxes should be restored
    const prioritizeCoverCheckbox = screen.getByRole('checkbox', { name: /Prioritize Cover/i }) as HTMLInputElement;
    expect(prioritizeCoverCheckbox.checked).toBe(true);

    const deploymentZoneSafetyCheckbox = screen.getByRole('checkbox', {
      name: /Deployment Zone Safety/i,
    }) as HTMLInputElement;
    expect(deploymentZoneSafetyCheckbox.checked).toBe(false);
  });

  it('updates UI when initialConfig prop changes (simulating layout load)', () => {
    const initialConfig: PlacementConfig = {
      strategy: 'random',
      density: 'balanced',
      prioritizeCover: false,
      deploymentZoneSafety: true,
      forceSymmetry: false,
    };

    const { rerender } = render(
      <AutoPlacementGenerator
        widthInches={48}
        heightInches={72}
        deploymentDepthInches={12}
        onLayoutGenerated={() => {}}
        initialConfig={initialConfig}
      />,
    );

    // Initial state
    let strategySelect = screen.getByRole('combobox') as HTMLSelectElement;
    expect(strategySelect.value).toBe('random');

    // Simulate loading a different saved layout
    const loadedConfig: PlacementConfig = {
      strategy: 'clustered-zones',
      density: 'sparse',
      prioritizeCover: true,
      deploymentZoneSafety: false,
      forceSymmetry: false,
    };

    rerender(
      <AutoPlacementGenerator
        widthInches={48}
        heightInches={72}
        deploymentDepthInches={12}
        onLayoutGenerated={() => {}}
        initialConfig={loadedConfig}
      />,
    );

    // UI should update to match the new config
    strategySelect = screen.getByRole('combobox') as HTMLSelectElement;
    expect(strategySelect.value).toBe('clustered-zones');

    const sparseButton = screen.getByRole('button', { name: /Sparse/i });
    expect(sparseButton).toHaveClass('border-cyan-400/60');

    const prioritizeCoverCheckbox = screen.getByRole('checkbox', { name: /Prioritize Cover/i }) as HTMLInputElement;
    expect(prioritizeCoverCheckbox.checked).toBe(true);
  });

  it('generates different layouts on multiple clicks (randomization test)', () => {
    const generatedLayouts: TerrainLayout[] = [];
    const onLayoutGenerated = vi.fn((layout: TerrainLayout) => {
      generatedLayouts.push(layout);
    });

    const { rerender } = render(
      <AutoPlacementGenerator
        widthInches={48}
        heightInches={72}
        deploymentDepthInches={12}
        onLayoutGenerated={onLayoutGenerated}
      />,
    );

    // Simulate clicking the generate button multiple times
    const generateButton = screen.getByRole('button', { name: /generate.*re-generate terrain/i });
    
    // Click 3 times
    generateButton.click();
    rerender(
      <AutoPlacementGenerator
        widthInches={48}
        heightInches={72}
        deploymentDepthInches={12}
        onLayoutGenerated={onLayoutGenerated}
      />,
    );
    
    generateButton.click();
    rerender(
      <AutoPlacementGenerator
        widthInches={48}
        heightInches={72}
        deploymentDepthInches={12}
        onLayoutGenerated={onLayoutGenerated}
      />,
    );
    
    generateButton.click();

    // Should have been called 3 times
    expect(onLayoutGenerated).toHaveBeenCalledTimes(3);
    expect(generatedLayouts.length).toBe(3);

    // Each layout should have pieces
    generatedLayouts.forEach(layout => {
      expect(layout.pieces.length).toBeGreaterThanOrEqual(10);
      expect(layout.pieces.length).toBeLessThanOrEqual(15);
    });

    // Layouts should be different (check positions)
    const positions1 = generatedLayouts[0]!.pieces.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).sort().join('|');
    const positions2 = generatedLayouts[1]!.pieces.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).sort().join('|');
    const positions3 = generatedLayouts[2]!.pieces.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).sort().join('|');

    // At least two of the three should be different
    const allSame = positions1 === positions2 && positions2 === positions3;
    expect(allSame).toBe(false);
  });

  it('meets OPR trait distribution requirements', () => {
    let generatedLayout: TerrainLayout | null = null;
    const onLayoutGenerated = vi.fn((layout: TerrainLayout) => {
      generatedLayout = layout;
    });

    render(
      <AutoPlacementGenerator
        widthInches={48}
        heightInches={72}
        deploymentDepthInches={12}
        onLayoutGenerated={onLayoutGenerated}
      />,
    );

    const generateButton = screen.getByRole('button', { name: /generate.*re-generate terrain/i });
    generateButton.click();

    expect(onLayoutGenerated).toHaveBeenCalled();
    expect(generatedLayout).not.toBeNull();

    if (generatedLayout) {
      // Check piece count
      expect(generatedLayout.pieces.length).toBeGreaterThanOrEqual(10);
      expect(generatedLayout.pieces.length).toBeLessThanOrEqual(15);

      // Check trait distribution
      const losBlockingCount = generatedLayout.pieces.filter(p => 
        p.traits.includes('LoS Blocking')
      ).length;
      
      const coverCount = generatedLayout.pieces.filter(p => 
        p.traits.includes('Soft Cover') || p.traits.includes('Hard Cover')
      ).length;
      
      const difficultCount = generatedLayout.pieces.filter(p => 
        p.traits.includes('Difficult')
      ).length;
      
      const dangerousCount = generatedLayout.pieces.filter(p => 
        p.traits.includes('Dangerous')
      ).length;

      const totalPieces = generatedLayout.pieces.length;

      // OPR requirements:
      // ≥50% LoS Blocking
      expect(losBlockingCount / totalPieces).toBeGreaterThanOrEqual(0.5);
      
      // ≥33% Cover
      expect(coverCount / totalPieces).toBeGreaterThanOrEqual(0.33);
      
      // ≥33% Difficult
      expect(difficultCount / totalPieces).toBeGreaterThanOrEqual(0.33);
      
      // Exactly 2 Dangerous
      expect(dangerousCount).toBe(2);

      // Check validation object
      expect(generatedLayout.oprValidation).toBeDefined();
      expect(generatedLayout.oprValidation?.meetsLosBlocking).toBe(true);
      expect(generatedLayout.oprValidation?.meetsCover).toBe(true);
      expect(generatedLayout.oprValidation?.meetsDifficult).toBe(true);
      expect(generatedLayout.oprValidation?.meetsDangerous).toBe(true);
    }
  });
});
