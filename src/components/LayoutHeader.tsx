import { useState } from 'react';
import type { SavedLayoutRecord } from '../types/layout';

type LayoutHeaderProps = {
  layoutTitle: string;
  onLayoutTitleChange: (title: string) => void;
  onSaveLayout: (name: string) => void;
  savedLayouts: SavedLayoutRecord[];
  onLoadLayout: (layout: SavedLayoutRecord) => void;
  onRenameLayout: (layout: SavedLayoutRecord) => void;
  onDeleteLayout: (layout: SavedLayoutRecord) => void;
  activeSavedLayoutId: string | null;
  onCopyShareUrl: () => void;
  onExportPng: () => void;
  onPrint: () => void;
  onResetLayout: () => void;
  isExporting: boolean;
};

const formatUpdatedAt = (value: string) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

export function LayoutHeader({
  layoutTitle,
  onLayoutTitleChange,
  onSaveLayout,
  savedLayouts,
  onLoadLayout,
  onRenameLayout,
  onDeleteLayout,
  activeSavedLayoutId,
  onCopyShareUrl,
  onExportPng,
  onPrint,
  onResetLayout,
  isExporting,
}: LayoutHeaderProps) {
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [layoutNameInput, setLayoutNameInput] = useState('');

  const handleSaveClick = () => {
    setShowSaveDialog(true);
    const activeLayout = savedLayouts.find((l) => l.id === activeSavedLayoutId);
    setLayoutNameInput(activeLayout?.name ?? '');
  };

  const handleSaveConfirm = () => {
    const name = layoutNameInput.trim();
    if (!name) {
      return;
    }
    onSaveLayout(name);
    setShowSaveDialog(false);
    setLayoutNameInput('');
  };

  const handleLoadClick = (layout: SavedLayoutRecord) => {
    onLoadLayout(layout);
    setShowLoadModal(false);
  };

  return (
    <>
      <header className="screen-only flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-cyan-950/20">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-300/80">OPR Terrain</p>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">Layout Studio</h1>
            <p className="max-w-3xl text-sm text-slate-300 sm:text-base">
              Create, save, and share terrain layouts for tabletop wargaming
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSaveClick}
              className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
            >
              Save Layout
            </button>
            <button
              type="button"
              onClick={() => setShowLoadModal(true)}
              className="rounded-full border border-emerald-400/40 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300 hover:text-white"
            >
              Load Layout
            </button>
            <button
              type="button"
              onClick={onCopyShareUrl}
              className="rounded-full border border-cyan-400/40 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300 hover:text-white"
            >
              Copy Share URL
            </button>
            <button
              type="button"
              onClick={onExportPng}
              disabled={isExporting}
              className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isExporting ? 'Exporting…' : 'Export PNG'}
            </button>
            <button
              type="button"
              onClick={onPrint}
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/30 hover:bg-white/5"
            >
              Print
            </button>
            <button
              type="button"
              onClick={onResetLayout}
              className="rounded-full border border-rose-400/25 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:border-rose-300/40 hover:bg-rose-500/10"
            >
              Reset
            </button>
          </div>
        </div>

        <label className="flex flex-col gap-2 text-sm text-slate-200">
          Layout title
          <input
            type="text"
            value={layoutTitle}
            onChange={(event) => onLayoutTitleChange(event.target.value)}
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-base text-white outline-none ring-0 transition placeholder:text-slate-500 focus:border-cyan-400/50"
            placeholder="Name this battlefield"
          />
        </label>
      </header>

      {/* Save Layout Dialog */}
      {showSaveDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowSaveDialog(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-white">Save Layout</h2>
            <p className="mt-2 text-sm text-slate-300">
              Enter a name for this layout. It will be saved to browser storage.
            </p>

            <label className="mt-4 flex flex-col gap-2 text-sm text-slate-200">
              Layout name
              <input
                type="text"
                value={layoutNameInput}
                onChange={(e) => setLayoutNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveConfirm();
                  }
                }}
                className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/50"
                placeholder="e.g., Tournament Round 2"
                autoFocus
              />
            </label>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleSaveConfirm}
                disabled={!layoutNameInput.trim()}
                className="flex-1 rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSaveDialog(false);
                  setLayoutNameInput('');
                }}
                className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/25"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Layout Modal */}
      {showLoadModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowLoadModal(false)}
        >
          <div
            className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Load Saved Layout</h2>
                <p className="mt-2 text-sm text-slate-300">
                  Select a layout to load. Your current work will be replaced.
                </p>
              </div>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-300">
                {savedLayouts.length} saved
              </span>
            </div>

            <div className="mt-6 max-h-[60vh] space-y-3 overflow-y-auto">
              {savedLayouts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-400">
                  No saved layouts yet. Save your current layout to see it here.
                </div>
              ) : (
                savedLayouts.map((savedLayout) => {
                  const isActive = savedLayout.id === activeSavedLayoutId;

                  return (
                    <article
                      key={savedLayout.id}
                      className={`rounded-2xl border p-4 transition ${
                        isActive
                          ? 'border-cyan-400/60 bg-cyan-400/10'
                          : 'border-white/10 bg-slate-950/40 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-white">{savedLayout.name}</h3>
                          <p className="mt-1 text-xs text-slate-400">
                            Updated {formatUpdatedAt(savedLayout.updatedAt)} · {savedLayout.layout.pieces.length} pieces
                          </p>
                        </div>
                        {isActive && (
                          <span className="rounded-full bg-cyan-400/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-200">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => handleLoadClick(savedLayout)}
                          className="rounded-full border border-white/10 px-3 py-1.5 text-slate-100 transition hover:border-cyan-300 hover:text-white"
                        >
                          Load
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onRenameLayout(savedLayout);
                          }}
                          className="rounded-full border border-white/10 px-3 py-1.5 text-slate-300 transition hover:border-white/25 hover:text-white"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteLayout(savedLayout);
                          }}
                          className="rounded-full border border-rose-400/20 px-3 py-1.5 text-rose-200 transition hover:border-rose-300/40 hover:bg-rose-500/10"
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowLoadModal(false)}
                className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/25"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
