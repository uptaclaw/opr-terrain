import { useEffect, useMemo, useState } from 'react';
import { TableCanvas } from './components/TableCanvas';
import { TerrainLibrary } from './components/TerrainLibrary';
import { LayoutPicker } from './components/LayoutPicker';
import { PrintView } from './components/PrintView';
import { analyzeTerrainLayout, generateTerrainLayout } from './terrain/generateTerrainLayout';
import type { TerrainLayout } from './terrain/types';
import { saveLayout } from './utils/layoutStorage';
import { exportLayoutToPNG } from './utils/exportPNG';
import { serializeLayoutToURL, deserializeLayoutFromURL } from './utils/urlSerializer';

const TABLE_WIDTH = 48;
const TABLE_HEIGHT = 48;
const DEPLOYMENT_DEPTH = 12;
const MIN_PIECES = 15;
const MAX_PIECES = 20;

const buildLayout = (): TerrainLayout =>
  generateTerrainLayout({
    widthInches: TABLE_WIDTH,
    heightInches: TABLE_HEIGHT,
    deploymentDepthInches: DEPLOYMENT_DEPTH,
    minPieces: MIN_PIECES,
    maxPieces: MAX_PIECES,
  });

const quarterLabels = ['NW', 'NE', 'SW', 'SE'] as const;

function App() {
  const [layout, setLayout] = useState<TerrainLayout>(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#layout=')) {
      const deserialized = deserializeLayoutFromURL(hash);
      if (deserialized) return deserialized;
    }
    return buildLayout();
  });
  const [error, setError] = useState<string | null>(null);
  const [currentLayoutName, setCurrentLayoutName] = useState<string>();
  const [showPrintView, setShowPrintView] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState('');

  const analysis = useMemo(() => analyzeTerrainLayout(layout), [layout]);
  const terrainMix = useMemo(
    () =>
      Object.entries(analysis.templateCounts)
        .sort((left, right) => right[1] - left[1])
        .map(([templateId, count]) => ({
          templateId,
          count,
          label: templateId.charAt(0).toUpperCase() + templateId.slice(1),
        })),
    [analysis.templateCounts],
  );

  useEffect(() => {
    const hashUrl = serializeLayoutToURL(layout);
    window.history.replaceState(null, '', hashUrl);
  }, [layout]);

  const handleGenerate = () => {
    try {
      setLayout(buildLayout());
      setError(null);
      setCurrentLayoutName(undefined);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : 'Unable to generate a terrain layout.',
      );
    }
  };

  const handleSaveLayout = () => {
    if (!saveName.trim()) {
      alert('Please enter a layout name');
      return;
    }
    saveLayout(saveName.trim(), layout);
    setCurrentLayoutName(saveName.trim());
    setSaveDialogOpen(false);
    setSaveName('');
  };

  const handleExportPNG = async () => {
    try {
      await exportLayoutToPNG(layout, `terrain-layout-${Date.now()}.png`);
    } catch (exportError) {
      alert('Failed to export PNG: ' + (exportError instanceof Error ? exportError.message : 'Unknown error'));
    }
  };

  const handleCopyShareURL = () => {
    const url = window.location.origin + window.location.pathname + serializeLayoutToURL(layout);
    navigator.clipboard.writeText(url).then(
      () => alert('Shareable URL copied to clipboard!'),
      () => alert('Failed to copy URL to clipboard'),
    );
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl space-y-2">
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-300/80">OPR Terrain</p>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">
              Terrain library &amp; auto-placement engine
            </h1>
            <p className="text-sm text-slate-300 sm:text-base">
              Browse trait-based terrain presets in the sidebar or reroll a 15-20 piece
              layout with balanced quarter coverage, deployment-zone breathing room, and
              non-overlapping placement.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              Generate
            </button>
            <button
              type="button"
              onClick={() => setSaveDialogOpen(true)}
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleExportPNG}
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              Export PNG
            </button>
            <button
              type="button"
              onClick={handleCopyShareURL}
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              Share URL
            </button>
            <button
              type="button"
              onClick={() => setShowPrintView(true)}
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              Print
            </button>
            <p className="text-sm text-slate-300">
              Current layout: <span className="font-semibold text-white">{layout.pieces.length}</span>{' '}
              pieces
              {currentLayoutName && (
                <span className="ml-2 text-cyan-300">({currentLayoutName})</span>
              )}
            </p>
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-rose-400/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)_20rem]">
          <TerrainLibrary />

          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-3 shadow-2xl shadow-cyan-950/30 sm:p-6">
            <TableCanvas
              widthInches={TABLE_WIDTH}
              heightInches={TABLE_HEIGHT}
              deploymentDepthInches={DEPLOYMENT_DEPTH}
              terrainPieces={layout.pieces}
            />
          </div>

          <aside className="flex flex-col gap-4">
            <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <LayoutPicker
                onLoad={(saved) => {
                  setLayout(saved.layout);
                  setCurrentLayoutName(saved.name);
                  setError(null);
                }}
                onSave={() => setSaveDialogOpen(true)}
                currentLayoutName={currentLayoutName}
              />
            </section>
            <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <h2 className="text-lg font-semibold text-white">Validation snapshot</h2>
              <ul className="mt-4 space-y-3 text-sm text-slate-200">
                <li className="flex items-start justify-between gap-3">
                  <span>Collision checks</span>
                  <span className="font-semibold text-emerald-300">
                    {analysis.overlaps.length === 0 ? 'Clear' : `${analysis.overlaps.length} overlap(s)`}
                  </span>
                </li>
                <li className="flex items-start justify-between gap-3">
                  <span>Deployment centers</span>
                  <span className="font-semibold text-emerald-300">
                    {analysis.deploymentCenterIntrusions.length === 0
                      ? 'Clear'
                      : `${analysis.deploymentCenterIntrusions.length} blocked`}
                  </span>
                </li>
                <li className="flex items-start justify-between gap-3">
                  <span>Shape mix</span>
                  <span className="font-semibold text-white">
                    {analysis.shapeCounts.circle} circles / {analysis.shapeCounts.rectangle} rectangles /{' '}
                    {analysis.shapeCounts.polygon} polygons
                  </span>
                </li>
                <li className="space-y-2">
                  <span className="block text-slate-300">Quarter balance</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {analysis.quarterCounts.map((count, index) => (
                      <div
                        key={quarterLabels[index]}
                        className="rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2"
                      >
                        <div className="text-slate-400">{quarterLabels[index]}</div>
                        <div className="mt-1 text-base font-semibold text-white">{count}</div>
                      </div>
                    ))}
                  </div>
                </li>
              </ul>
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <h2 className="text-lg font-semibold text-white">Terrain mix</h2>
              <p className="mt-2 text-sm text-slate-300">
                Each reroll shuffles piece types, shapes, positions, and rotations.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-200">
                {terrainMix.map((entry) => (
                  <li key={entry.templateId} className="flex items-center justify-between gap-3">
                    <span>{entry.label}</span>
                    <span className="rounded-full border border-white/10 bg-slate-950/60 px-2.5 py-1 text-xs font-semibold text-cyan-200">
                      ×{entry.count}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </section>
      </div>

      {saveDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-white">Save Layout</h2>
            <p className="mt-2 text-sm text-slate-300">
              Give this layout a name so you can load it later.
            </p>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveLayout();
                if (e.key === 'Escape') setSaveDialogOpen(false);
              }}
              placeholder="e.g., Tournament Setup 1"
              className="mt-4 w-full rounded-lg border border-white/20 bg-slate-950 px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              autoFocus
            />
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSaveDialogOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white focus:outline-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveLayout}
                className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showPrintView && (
        <PrintView layout={layout} onClose={() => setShowPrintView(false)} />
      )}
    </main>
  );
}

export default App;
