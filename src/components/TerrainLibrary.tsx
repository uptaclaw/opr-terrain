import { useState } from 'react';
import type { ShapeOption, TerrainPreset, TerrainTrait } from '../terrain/types';
import { TERRAIN_PRESETS, TRAIT_LABELS, TRAIT_DESCRIPTIONS } from '../data/terrainPresets';

interface SelectedTerrain {
  preset: TerrainPreset;
  shapeOption: ShapeOption;
}

interface CustomTerrainBuilder {
  name: string;
  traits: Set<TerrainTrait>;
  shapeOption: ShapeOption | null;
}

const ALL_TRAITS: TerrainTrait[] = [
  'Soft Cover',
  'Hard Cover',
  'Difficult',
  'Dangerous',
  'Impassable',
  'Elevated',
  'LoS Blocking',
];

const SHAPE_ICON_MAP: Record<ShapeOption['kind'], string> = {
  rectangle: '▭',
  circle: '●',
  polygon: '▲',
};

const CUSTOM_SHAPE_OPTIONS: ShapeOption[] = [
  { kind: 'circle', label: 'Small circle (3")', radius: 1.5 },
  { kind: 'circle', label: 'Medium circle (5")', radius: 2.5 },
  { kind: 'circle', label: 'Large circle (7")', radius: 3.5 },
  { kind: 'rectangle', label: 'Small rect (3×3")', width: 3, height: 3 },
  { kind: 'rectangle', label: 'Medium rect (5×4")', width: 5, height: 4 },
  { kind: 'rectangle', label: 'Large rect (6×6")', width: 6, height: 6 },
  { kind: 'rectangle', label: 'Strip (8×2")', width: 8, height: 2 },
];

export function TerrainLibrary() {
  const [selectedTerrain, setSelectedTerrain] = useState<SelectedTerrain | null>(null);
  const [showCustomBuilder, setShowCustomBuilder] = useState(false);
  const [customTerrain, setCustomTerrain] = useState<CustomTerrainBuilder>({
    name: 'Custom Terrain',
    traits: new Set(),
    shapeOption: null,
  });

  const handlePresetSelect = (preset: TerrainPreset, shapeOption: ShapeOption) => {
    setSelectedTerrain({ preset, shapeOption });
    setShowCustomBuilder(false);
  };

  const toggleCustomTrait = (trait: TerrainTrait) => {
    setCustomTerrain((prev) => {
      const newTraits = new Set(prev.traits);
      if (newTraits.has(trait)) {
        newTraits.delete(trait);
      } else {
        newTraits.add(trait);
      }
      return { ...prev, traits: newTraits };
    });
  };

  const selectCustomShape = (shapeOption: ShapeOption) => {
    setCustomTerrain((prev) => ({ ...prev, shapeOption }));
  };

  const isSelected = (preset: TerrainPreset, shapeOption: ShapeOption) => {
    return (
      !showCustomBuilder &&
      selectedTerrain?.preset.id === preset.id &&
      selectedTerrain?.shapeOption === shapeOption
    );
  };

  const isCustomShapeSelected = (shapeOption: ShapeOption) => {
    return customTerrain.shapeOption === shapeOption;
  };

  const customTerrainReady = customTerrain.traits.size > 0 && customTerrain.shapeOption !== null;

  return (
    <aside
      className="flex w-80 flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/80 p-4 shadow-2xl"
      aria-label="Terrain Library"
    >
      <header className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-white">Terrain Library</h2>
        <p className="text-xs text-slate-400">Select terrain to place on the table</p>
      </header>

      <div className="flex flex-col gap-3 overflow-y-auto pr-2">
        {/* Terrain Presets */}
        {TERRAIN_PRESETS.map((preset) => (
          <div
            key={preset.id}
            className="flex flex-col gap-2 rounded-xl border border-white/5 bg-slate-800/40 p-3"
          >
            <div className="flex items-start gap-2">
              <div
                className="mt-0.5 h-4 w-4 flex-shrink-0 rounded"
                style={{ backgroundColor: preset.color }}
                aria-hidden="true"
              />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-white">{preset.name}</h3>
                <p className="mt-0.5 text-xs text-slate-400">{preset.description}</p>
              </div>
            </div>

            {/* Trait badges */}
            <div className="flex flex-wrap gap-1">
              {preset.traits.map((trait) => (
                <span
                  key={trait}
                  className="rounded-md bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-300"
                  title={TRAIT_DESCRIPTIONS[trait]}
                >
                  {TRAIT_LABELS[trait]}
                </span>
              ))}
            </div>

            {/* Shape options */}
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium text-slate-300">Shapes:</p>
              <div className="grid grid-cols-2 gap-1.5">
                {preset.shapeOptions.map((shapeOption, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePresetSelect(preset, shapeOption)}
                    className={`rounded-lg px-2.5 py-1.5 text-left text-xs transition-all ${
                      isSelected(preset, shapeOption)
                        ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40'
                        : 'bg-slate-700/40 text-slate-300 hover:bg-slate-700/60'
                    }`}
                  >
                    <span className="mr-1 opacity-60">{SHAPE_ICON_MAP[shapeOption.kind]}</span>
                    {shapeOption.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Custom Terrain Builder */}
        <div className="flex flex-col gap-2 rounded-xl border border-white/5 bg-slate-800/40 p-3">
          <button
            onClick={() => setShowCustomBuilder(!showCustomBuilder)}
            className="flex items-center justify-between text-left"
          >
            <div className="flex items-start gap-2">
              <div
                className="mt-0.5 h-4 w-4 flex-shrink-0 rounded bg-gradient-to-br from-purple-500 to-pink-500"
                aria-hidden="true"
              />
              <div>
                <h3 className="text-sm font-medium text-white">Custom Terrain</h3>
                <p className="text-xs text-slate-400">Build your own combination</p>
              </div>
            </div>
            <svg
              className={`h-4 w-4 text-slate-400 transition-transform ${
                showCustomBuilder ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showCustomBuilder && (
            <div className="mt-2 flex flex-col gap-3 border-t border-white/5 pt-3">
              <div>
                <label htmlFor="custom-name" className="block text-xs font-medium text-slate-300">
                  Name:
                </label>
                <input
                  id="custom-name"
                  type="text"
                  value={customTerrain.name}
                  onChange={(e) =>
                    setCustomTerrain((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-700/40 px-2.5 py-1.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400/40 focus:outline-none focus:ring-1 focus:ring-cyan-400/40"
                  placeholder="Enter terrain name"
                />
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-slate-300">Select Traits:</p>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_TRAITS.map((trait) => (
                    <button
                      key={trait}
                      onClick={() => toggleCustomTrait(trait)}
                      className={`rounded-md px-2 py-1 text-xs transition-all ${
                        customTerrain.traits.has(trait)
                          ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40'
                          : 'bg-slate-700/40 text-slate-400 hover:bg-slate-700/60'
                      }`}
                      title={TRAIT_DESCRIPTIONS[trait]}
                    >
                      {TRAIT_LABELS[trait]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-slate-300">Select Shape:</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {CUSTOM_SHAPE_OPTIONS.map((shapeOption, idx) => (
                    <button
                      key={idx}
                      onClick={() => selectCustomShape(shapeOption)}
                      className={`rounded-lg px-2.5 py-1.5 text-left text-xs transition-all ${
                        isCustomShapeSelected(shapeOption)
                          ? 'bg-purple-500/20 text-purple-200 ring-1 ring-purple-400/40'
                          : 'bg-slate-700/40 text-slate-300 hover:bg-slate-700/60'
                      }`}
                    >
                      <span className="mr-1 opacity-60">{SHAPE_ICON_MAP[shapeOption.kind]}</span>
                      {shapeOption.label}
                    </button>
                  ))}
                </div>
              </div>

              {!customTerrainReady && (
                <div className="rounded-lg bg-purple-500/5 p-2 text-xs text-purple-300/80">
                  <p className="font-medium">
                    Select {customTerrain.traits.size === 0 ? 'traits and' : ''} a shape to continue
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Selection indicator */}
      {selectedTerrain && !showCustomBuilder && (
        <div className="mt-auto rounded-lg bg-cyan-950/40 p-3 text-xs">
          <p className="font-medium text-cyan-200">Ready to place:</p>
          <p className="mt-1 text-cyan-300/80">
            {selectedTerrain.preset.name} — {selectedTerrain.shapeOption.label}
          </p>
        </div>
      )}

      {showCustomBuilder && customTerrainReady && (
        <div className="mt-auto rounded-lg bg-purple-950/40 p-3 text-xs">
          <p className="font-medium text-purple-200">Custom terrain ready:</p>
          <p className="mt-1 text-purple-300/80">
            {customTerrain.name} ({customTerrain.traits.size} trait
            {customTerrain.traits.size !== 1 ? 's' : ''}) — {customTerrain.shapeOption!.label}
          </p>
        </div>
      )}
    </aside>
  );
}
