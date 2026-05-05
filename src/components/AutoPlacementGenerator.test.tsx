import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AutoPlacementGenerator } from './AutoPlacementGenerator';
import { generateTerrainLayout } from '../terrain/generateTerrainLayout';
import type { GenerateTerrainLayoutOptions, PlacementConfig, TerrainLayout } from '../terrain/types';

vi.mock('../terrain/generateTerrainLayout', () => ({
  generateTerrainLayout: vi.fn(),
}));

const mockedGenerateTerrainLayout = vi.mocked(generateTerrainLayout);

const createMockLayout = (): TerrainLayout => ({
  widthInches: 48,
  heightInches: 72,
  deploymentDepthInches: 12,
  targetPieceCount: 12,
  quarterTargets: [3, 3, 3, 3],
  pieces: [],
});

afterEach(() => {
  mockedGenerateTerrainLayout.mockReset();
  vi.restoreAllMocks();
});

describe('AutoPlacementGenerator', () => {
  it('initializes with default config when no initialConfig is provided', () => {
    render(
      <AutoPlacementGenerator
        widthInches={48}
        heightInches={72}
        deploymentDepthInches={12}
        onLayoutGenerated={() => {}}
        open={true}
        onClose={() => {}}
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

    expect(screen.getByRole('button', { name: /generate layout/i })).toBeInTheDocument();
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
        open={true}
        onClose={() => {}}
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
        open={true}
        onClose={() => {}}
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
        open={true}
        onClose={() => {}}
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

  it('uses a fresh random seed for rapid re-generation clicks', () => {
    const randomSignatures: string[] = [];
    mockedGenerateTerrainLayout.mockImplementation((options: GenerateTerrainLayoutOptions = {}) => {
      expect(options.random).toBeTypeOf('function');

      randomSignatures.push(
        [options.random!(), options.random!(), options.random!()]
          .map((value) => value.toFixed(8))
          .join('|'),
      );

      return createMockLayout();
    });

    vi.spyOn(Date, 'now').mockReturnValue(1_716_099_200_000);
    vi.spyOn(Math, 'random').mockReturnValue(0.5).mockReturnValueOnce(0.111111111).mockReturnValueOnce(0.222222222);

    const onLayoutGenerated = vi.fn();

    render(
      <AutoPlacementGenerator
        widthInches={48}
        heightInches={72}
        deploymentDepthInches={12}
        onLayoutGenerated={onLayoutGenerated}
        hasExistingPieces
        open={true}
        onClose={() => {}}
      />,
    );

    const regenerateButton = screen.getByRole('button', { name: /re-generate terrain/i });
    fireEvent.click(regenerateButton);
    fireEvent.click(regenerateButton);

    expect(mockedGenerateTerrainLayout).toHaveBeenCalledTimes(2);
    expect(onLayoutGenerated).toHaveBeenCalledTimes(2);
    expect(randomSignatures).toHaveLength(2);
    expect(randomSignatures[0]).not.toBe(randomSignatures[1]);
  });
});
