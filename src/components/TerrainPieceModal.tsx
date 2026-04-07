import { useEffect, useMemo, useState } from 'react';
import type { TerrainShape, TerrainTemplate, TerrainTrait } from '../types/layout';

export interface PieceFormData {
  name: string;
  shape: TerrainShape;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  traits: TerrainTrait[];
  defaultRotation?: number;
}

interface TerrainPieceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PieceFormData) => void;
  initialData?: TerrainTemplate;
  mode: 'create' | 'edit';
}

interface ModalFormState {
  name: string;
  shape: TerrainShape;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  selectedTraits: Set<string>;
}

const DEFAULT_FILL = '#475569';
const DEFAULT_STROKE = '#f8fafc';
const DEFAULT_WIDTH = 6;
const DEFAULT_HEIGHT = 6;
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

const DEFAULT_TRAITS: Array<Omit<TerrainTrait, 'active'>> = [
  { id: 'light-cover', label: 'Light cover', category: 'cover' },
  { id: 'heavy-cover', label: 'Heavy cover', category: 'cover' },
  { id: 'difficult-ground', label: 'Difficult ground', category: 'movement' },
  { id: 'dangerous', label: 'Dangerous terrain', category: 'movement' },
  { id: 'rough-ground', label: 'Rough ground', category: 'movement' },
  { id: 'impassable', label: 'Impassable', category: 'movement' },
  { id: 'passable', label: 'Passable obstacle', category: 'movement' },
  { id: 'elevated', label: 'Elevated position', category: 'movement' },
  { id: 'blocks-los', label: 'Blocks line of sight', category: 'los' },
  { id: 'obscuring', label: 'Obscures line of sight', category: 'los' },
  { id: 'partial-los', label: 'Partial line of sight block', category: 'los' },
  { id: 'open-los', label: 'Open line of sight', category: 'los' },
];

const clampDimension = (value: number, fallback: number) => {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(2, Math.min(24, value));
};

const buildFormState = (template?: TerrainTemplate): ModalFormState => ({
  name: template?.name ?? '',
  shape: template?.shape ?? 'rect',
  width: template?.width ?? DEFAULT_WIDTH,
  height: template?.height ?? DEFAULT_HEIGHT,
  fill: template?.fill ?? DEFAULT_FILL,
  stroke: template?.stroke ?? DEFAULT_STROKE,
  selectedTraits: new Set(template?.traits.filter((trait) => trait.active ?? true).map((trait) => trait.id) ?? []),
});

export function TerrainPieceModal({ isOpen, onClose, onSave, initialData, mode }: TerrainPieceModalProps) {
  const [formState, setFormState] = useState<ModalFormState>(() => buildFormState(initialData));

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFormState(buildFormState(initialData));
  }, [initialData, isOpen, mode]);

  const traitOptions = useMemo(() => {
    const merged = new Map<string, Omit<TerrainTrait, 'active'>>();

    DEFAULT_TRAITS.forEach((trait) => {
      merged.set(trait.id, trait);
    });

    initialData?.traits.forEach((trait) => {
      merged.set(trait.id, {
        id: trait.id,
        label: trait.label,
        category: trait.category,
      });
    });

    return [...merged.values()];
  }, [initialData]);

  const { name, shape, width, height, fill, stroke, selectedTraits } = formState;
  const previewFill = HEX_COLOR_REGEX.test(fill) ? fill : DEFAULT_FILL;
  const previewStroke = HEX_COLOR_REGEX.test(stroke) ? stroke : DEFAULT_STROKE;

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const traits: TerrainTrait[] = traitOptions.map((trait) => ({
      ...trait,
      active: selectedTraits.has(trait.id),
    }));

    onSave({
      name: name.trim(),
      shape,
      width: clampDimension(width, initialData?.width ?? DEFAULT_WIDTH),
      height: clampDimension(height, initialData?.height ?? DEFAULT_HEIGHT),
      fill: previewFill,
      stroke: previewStroke,
      traits,
      defaultRotation: initialData?.defaultRotation ?? 0,
    });

    onClose();
  };

  const setWidth = (nextWidth: number) => {
    setFormState((current) => ({
      ...current,
      width: nextWidth,
    }));
  };

  const setHeight = (nextHeight: number) => {
    setFormState((current) => ({
      ...current,
      height: nextHeight,
    }));
  };

  const toggleTrait = (traitId: string) => {
    setFormState((current) => {
      const nextSelectedTraits = new Set(current.selectedTraits);

      if (nextSelectedTraits.has(traitId)) {
        nextSelectedTraits.delete(traitId);
      } else {
        nextSelectedTraits.add(traitId);
      }

      return {
        ...current,
        selectedTraits: nextSelectedTraits,
      };
    });
  };

  const displaySize = shape === 'ellipse' && width === height ? `${width}″ diameter` : `${width}″ × ${height}″`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="terrain-piece-modal-title"
        className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 id="terrain-piece-modal-title" className="mb-6 text-2xl font-semibold text-white">
          {mode === 'create' ? 'Add Custom Terrain' : 'Edit Terrain Piece'}
        </h2>

        <div className="grid gap-6 md:grid-cols-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="piece-name" className="mb-1.5 block text-sm font-medium text-slate-200">
                Name
              </label>
              <input
                id="piece-name"
                type="text"
                value={name}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                required
                className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                placeholder="e.g., Ruined Building"
              />
            </div>

            <div>
              <label htmlFor="piece-shape" className="mb-1.5 block text-sm font-medium text-slate-200">
                Shape
              </label>
              <select
                id="piece-shape"
                value={shape}
                onChange={(event) => {
                  const nextShape = event.target.value as TerrainShape;

                  setFormState((current) => ({
                    ...current,
                    shape: nextShape,
                    ...(nextShape === 'ellipse' ? { height: current.width } : {}),
                  }));
                }}
                className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
              >
                <option value="rect">Rectangle</option>
                <option value="ellipse">Circle / Ellipse</option>
                <option value="diamond">Diamond</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="piece-width" className="mb-1.5 block text-sm font-medium text-slate-200">
                  Width
                </label>
                <input
                  id="piece-width"
                  type="number"
                  min="2"
                  max="24"
                  step="0.5"
                  value={width}
                  onChange={(event) => {
                    const nextWidth = Number.parseFloat(event.target.value);
                    if (Number.isFinite(nextWidth)) {
                      setWidth(nextWidth);
                    }
                  }}
                  className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                />
              </div>
              <div>
                <label htmlFor="piece-height" className="mb-1.5 block text-sm font-medium text-slate-200">
                  Height
                </label>
                <input
                  id="piece-height"
                  type="number"
                  min="2"
                  max="24"
                  step="0.5"
                  value={height}
                  onChange={(event) => {
                    const nextHeight = Number.parseFloat(event.target.value);
                    if (Number.isFinite(nextHeight)) {
                      setHeight(nextHeight);
                    }
                  }}
                  className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                />
              </div>
            </div>

            <div>
              <label htmlFor="piece-color" className="mb-1.5 block text-sm font-medium text-slate-200">
                Color
              </label>
              <div className="flex gap-2">
                <input
                  id="piece-color"
                  type="color"
                  value={previewFill}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      fill: event.target.value,
                    }))
                  }
                  className="h-10 w-20 cursor-pointer rounded-lg border border-white/10 bg-slate-950"
                />
                <input
                  type="text"
                  value={fill}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      fill: event.target.value,
                    }))
                  }
                  className="flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 font-mono text-sm text-white focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                  placeholder="#475569"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">Traits</label>
              <div className="space-y-2">
                {traitOptions.map((trait) => (
                  <label
                    key={trait.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 transition hover:bg-slate-800"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTraits.has(trait.id)}
                      onChange={() => toggleTrait(trait.id)}
                      className="h-4 w-4 cursor-pointer rounded border-white/20 bg-slate-900 text-cyan-500 focus:ring-2 focus:ring-cyan-400/20"
                    />
                    <span className="text-sm text-slate-200">{trait.label}</span>
                    <span className="ml-auto text-xs text-slate-500">{trait.category}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-white/10 bg-slate-800 px-4 py-2 font-medium text-white transition hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className="flex-1 rounded-lg bg-cyan-500 px-4 py-2 font-medium text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mode === 'create' ? 'Create' : 'Save'}
              </button>
            </div>
          </form>

          <div className="flex flex-col rounded-xl border border-white/10 bg-slate-950 p-4">
            <p className="mb-3 text-sm font-medium text-slate-300">Preview</p>
            <div className="flex flex-1 items-center justify-center">
              <svg viewBox="0 0 100 100" className="h-48 w-48">
                {shape === 'rect' && (
                  <rect
                    x={50 - (width / Math.max(height, 1)) * 30}
                    y={50 - 30}
                    width={(width / Math.max(height, 1)) * 60}
                    height={60}
                    fill={previewFill}
                    stroke={previewStroke}
                    strokeWidth="2"
                    rx="4"
                  />
                )}
                {shape === 'ellipse' && (
                  <ellipse
                    cx={50}
                    cy={50}
                    rx={(width / Math.max(width, height, 1)) * 35}
                    ry={(height / Math.max(width, height, 1)) * 35}
                    fill={previewFill}
                    stroke={previewStroke}
                    strokeWidth="2"
                  />
                )}
                {shape === 'diamond' && (
                  <path
                    d={`M 50,${50 - 35} L ${50 + (width / Math.max(height, 1)) * 35},50 L 50,${50 + 35} L ${50 - (width / Math.max(height, 1)) * 35},50 Z`}
                    fill={previewFill}
                    stroke={previewStroke}
                    strokeWidth="2"
                  />
                )}
              </svg>
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-sm text-slate-300">
                <span className="font-medium">Size:</span> {displaySize}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Array.from(selectedTraits).map((traitId) => {
                  const trait = traitOptions.find((entry) => entry.id === traitId);
                  return trait ? (
                    <span
                      key={traitId}
                      className="rounded-full border border-white/10 bg-slate-800/80 px-2 py-0.5 text-xs text-slate-200"
                    >
                      {trait.label}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
