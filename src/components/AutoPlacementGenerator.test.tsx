import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AutoPlacementGenerator } from './AutoPlacementGenerator';
import type { PlacementConfig } from '../terrain/types';

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
});
