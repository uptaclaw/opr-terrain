import { useState } from 'react';
import { TerrainEditor } from './components/TerrainEditor';
import { generateTerrainLayout } from './terrain/generateTerrainLayout';
import type { TerrainPiece } from './terrain/types';

const TABLE_WIDTH = 48;
const TABLE_HEIGHT = 48;
const DEPLOYMENT_DEPTH = 12;
const MIN_PIECES = 15;
const MAX_PIECES = 20;

const buildStarterLayout = (): TerrainPiece[] =>
  generateTerrainLayout({
    widthInches: TABLE_WIDTH,
    heightInches: TABLE_HEIGHT,
    deploymentDepthInches: DEPLOYMENT_DEPTH,
    minPieces: MIN_PIECES,
    maxPieces: MAX_PIECES,
  }).pieces;

function App() {
  const [editorVersion, setEditorVersion] = useState(0);
  const [initialPieces, setInitialPieces] = useState<TerrainPiece[]>(() => buildStarterLayout());
  const [error, setError] = useState<string | null>(null);

  const handleGenerateStarterLayout = () => {
    try {
      setInitialPieces(buildStarterLayout());
      setEditorVersion((currentVersion) => currentVersion + 1);
      setError(null);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : 'Unable to generate a starter terrain layout.',
      );
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex min-h-screen max-w-[110rem] flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-5xl space-y-2">
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-300/80">OPR Terrain</p>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">
              Interactive drag-and-drop terrain editor
            </h1>
            <p className="text-sm text-slate-300 sm:text-base">
              Reposition terrain directly on the canvas, drag fresh pieces from the library, rotate
              selections, delete with the keyboard, and undo or redo every edit.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleGenerateStarterLayout}
              className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              Generate starter layout
            </button>
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-rose-400/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <TerrainEditor
          key={editorVersion}
          widthInches={TABLE_WIDTH}
          heightInches={TABLE_HEIGHT}
          deploymentDepthInches={DEPLOYMENT_DEPTH}
          initialPieces={initialPieces}
        />
      </div>
    </main>
  );
}

export default App;
