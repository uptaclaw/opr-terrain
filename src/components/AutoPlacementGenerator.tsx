import { useState } from 'react';
import { generateTerrainLayout } from '../terrain/generateTerrainLayout';
import { getStrategyDescription } from '../terrain/placementStrategies';
import type {
  PlacementConfig,
  PlacementDensity,
  PlacementStrategy,
  TerrainLayout,
} from '../terrain/types';

interface AutoPlacementGeneratorProps {
  widthInches: number;
  heightInches: number;
  deploymentDepthInches: number;
  onLayoutGenerated: (layout: TerrainLayout) => void;
}

const STRATEGY_OPTIONS: Array<{ value: PlacementStrategy; label: string }> = [
  { value: 'random', label: 'Random' },
  { value: 'balanced-coverage', label: 'Balanced Coverage' },
  { value: 'symmetrical', label: 'Symmetrical (Competitive)' },
  { value: 'asymmetric', label: 'Narrative/Asymmetric' },
  { value: 'clustered-zones', label: 'Clustered Zones' },
  { value: 'los-blocking-lanes', label: 'LoS Blocking Lanes' },
];

const DENSITY_OPTIONS: Array<{ value: PlacementDensity; label: string }> = [
  { value: 'sparse', label: 'Sparse' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'dense', label: 'Dense' },
];

export function AutoPlacementGenerator({
  widthInches,
  heightInches,
  deploymentDepthInches,
  onLayoutGenerated,
}: AutoPlacementGeneratorProps) {
  const [placementConfig, setPlacementConfig] = useState<PlacementConfig>({
    strategy: 'random',
    density: 'balanced',
    prioritizeCover: false,
    deploymentZoneSafety: true,
    forceSymmetry: false,
  });
  const [targetPieceCount, setTargetPieceCount] = useState<number>(16);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = () => {
    setIsGenerating(true);
    setError(null);

    try {
      // Generate with proper random seeding using Date.now()
      const layout = generateTerrainLayout({
        widthInches,
        heightInches,
        deploymentDepthInches,
        pieceCount: targetPieceCount,
        placementConfig,
        // Don't provide a random function - let it use Date.now() for proper seeding
      });

      onLayoutGenerated(layout);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate layout');
    } finally {
      setIsGenerating(false);
    }
  };

  const currentStrategyDescription = getStrategyDescription(placementConfig.strategy || 'random');

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Auto-Placement Generator</h2>
          <p className="mt-1 text-sm text-slate-300">
            Configure and generate terrain layouts with different strategies
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-200">Placement Strategy</label>
          <select
            value={placementConfig.strategy || 'random'}
            onChange={(e) =>
              setPlacementConfig((prev) => ({
                ...prev,
                strategy: e.target.value as PlacementStrategy,
              }))
            }
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-400/50"
          >
            {STRATEGY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-400">{currentStrategyDescription}</p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-200">
            Terrain Density
          </label>
          <div className="flex gap-2">
            {DENSITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setPlacementConfig((prev) => ({
                    ...prev,
                    density: option.value,
                  }))
                }
                className={`flex-1 rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                  placementConfig.density === option.value
                    ? 'border-cyan-400/60 bg-cyan-400/10 text-cyan-100'
                    : 'border-white/10 bg-slate-950/40 text-slate-300 hover:border-white/20'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-200">
            Piece Count: {targetPieceCount}
          </label>
          <input
            type="range"
            min={10}
            max={20}
            step={1}
            value={targetPieceCount}
            onChange={(e) => setTargetPieceCount(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-slate-400">
            <span>10 pieces</span>
            <span>20 pieces</span>
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
            <div>
              <div className="text-sm font-medium text-white">Prioritize Cover</div>
              <div className="text-xs text-slate-400">
                Emphasize cover pieces over obstacles
              </div>
            </div>
            <input
              type="checkbox"
              checked={placementConfig.prioritizeCover || false}
              onChange={(e) =>
                setPlacementConfig((prev) => ({
                  ...prev,
                  prioritizeCover: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-cyan-400 focus:ring-cyan-300"
            />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
            <div>
              <div className="text-sm font-medium text-white">Deployment Zone Safety</div>
              <div className="text-xs text-slate-400">
                Keep deployment zones relatively open
              </div>
            </div>
            <input
              type="checkbox"
              checked={placementConfig.deploymentZoneSafety !== false}
              onChange={(e) =>
                setPlacementConfig((prev) => ({
                  ...prev,
                  deploymentZoneSafety: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-cyan-400 focus:ring-cyan-300"
            />
          </label>

          {placementConfig.strategy === 'balanced-coverage' && (
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
              <div>
                <div className="text-sm font-medium text-white">Force Symmetry</div>
                <div className="text-xs text-slate-400">
                  Make balanced coverage symmetrical
                </div>
              </div>
              <input
                type="checkbox"
                checked={placementConfig.forceSymmetry || false}
                onChange={(e) =>
                  setPlacementConfig((prev) => ({
                    ...prev,
                    forceSymmetry: e.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-cyan-400 focus:ring-cyan-300"
              />
            </label>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex-1 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating ? 'Generating...' : 'Generate Layout'}
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="rounded-2xl border border-cyan-400/40 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            title="Re-generate with same settings"
          >
            🔄
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-400/30 bg-rose-950/20 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}
      </div>
    </section>
  );
}
