import { useState } from 'react';
import type { SavedLayout } from '../utils/layoutStorage';
import { deleteLayout, getAllLayouts, renameLayout } from '../utils/layoutStorage';

export interface LayoutPickerProps {
  onLoad: (layout: SavedLayout) => void;
  onSave: () => void;
  currentLayoutName?: string;
}

export function LayoutPicker({ onLoad, onSave, currentLayoutName }: LayoutPickerProps) {
  const [layouts, setLayouts] = useState<SavedLayout[]>(() => getAllLayouts());
  const [editingName, setEditingName] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const refreshLayouts = () => {
    setLayouts(getAllLayouts());
  };

  const handleDelete = (name: string) => {
    if (confirm(`Delete layout "${name}"?`)) {
      deleteLayout(name);
      refreshLayouts();
    }
  };

  const handleRename = (oldName: string) => {
    if (!newName.trim()) {
      setEditingName(null);
      return;
    }

    if (renameLayout(oldName, newName.trim())) {
      refreshLayouts();
      setEditingName(null);
      setNewName('');
    }
  };

  const startRename = (name: string) => {
    setEditingName(name);
    setNewName(name);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-white">Saved Layouts</h3>
        <button
          type="button"
          onClick={() => {
            onSave();
            refreshLayouts();
          }}
          className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          Save Current
        </button>
      </div>

      {layouts.length === 0 ? (
        <p className="text-sm text-slate-400">No saved layouts yet</p>
      ) : (
        <ul className="space-y-2">
          {layouts.map((saved) => (
            <li
              key={saved.name}
              className="rounded-xl border border-white/10 bg-slate-950/60 p-3"
            >
              {editingName === saved.name ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(saved.name);
                      if (e.key === 'Escape') setEditingName(null);
                    }}
                    className="flex-1 rounded border border-white/20 bg-slate-900 px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => handleRename(saved.name)}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingName(null)}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">{saved.name}</p>
                        {currentLayoutName === saved.name && (
                          <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-xs font-semibold text-cyan-300">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {saved.layout.pieces.length} pieces • {new Date(saved.savedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onLoad(saved)}
                      className="text-xs font-semibold text-cyan-400 hover:text-cyan-300"
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      onClick={() => startRename(saved.name)}
                      className="text-xs font-semibold text-slate-400 hover:text-slate-300"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(saved.name)}
                      className="text-xs font-semibold text-rose-400 hover:text-rose-300"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
