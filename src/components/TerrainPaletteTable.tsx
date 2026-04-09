import { useState, useMemo } from 'react';
import type { TerrainTemplate } from '../types/layout';
import { TerrainPieceModal, type PieceFormData } from './TerrainPieceModal';
import type { CustomPieceDefinition } from '../lib/customPieces';

export const TERRAIN_LIBRARY_MIME_TYPE = 'application/x-opr-terrain-template';

interface TerrainPaletteTableProps {
  presets: TerrainTemplate[];
  customPieces: CustomPieceDefinition[];
  onAddCustom: (data: PieceFormData) => void;
  onEditPiece: (id: string, data: PieceFormData) => void;
  onDeleteCustom: (id: string) => void;
  onDuplicatePiece: (id: string) => TerrainTemplate | null;
  onAddPieceToLayout?: (templateId: string) => void;
}

type CombinedPiece = TerrainTemplate & {
  isCustom?: boolean;
};

const getShapeLabel = (shape: TerrainTemplate['shape']): string => {
  switch (shape) {
    case 'rect':
      return 'Rectangle';
    case 'ellipse':
      return 'Circle/Ellipse';
    case 'diamond':
      return 'Diamond';
    default:
      return shape;
  }
};

const getSizeLabel = (piece: TerrainTemplate): string => {
  if (piece.shape === 'ellipse' && piece.width === piece.height) {
    return `${piece.width}″ ⌀`;
  }
  return `${piece.width}″ × ${piece.height}″`;
};

const buildPayload = (piece: TerrainTemplate) =>
  JSON.stringify({
    templateId: piece.id,
    shape: piece.shape,
  });

type ModalMode = 'create' | 'edit' | 'duplicate';

export function TerrainPaletteTable({
  presets,
  customPieces,
  onAddCustom,
  onEditPiece,
  onDeleteCustom,
  onDuplicatePiece,
  onAddPieceToLayout,
}: TerrainPaletteTableProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPiece, setEditingPiece] = useState<TerrainTemplate | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [searchQuery, setSearchQuery] = useState('');

  const allPieces: CombinedPiece[] = useMemo(() => {
    return [...presets, ...customPieces];
  }, [presets, customPieces]);

  const filteredPieces = useMemo(() => {
    if (!searchQuery.trim()) {
      return allPieces;
    }

    const query = searchQuery.toLowerCase();
    return allPieces.filter((piece) => {
      const nameMatch = piece.name.toLowerCase().includes(query);
      const traitMatch = piece.traits.some((trait) => trait.label.toLowerCase().includes(query));
      return nameMatch || traitMatch;
    });
  }, [allPieces, searchQuery]);

  const handleDragStart = (piece: TerrainTemplate) => (event: React.DragEvent<HTMLTableRowElement>) => {
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData(TERRAIN_LIBRARY_MIME_TYPE, buildPayload(piece));
    event.dataTransfer.setData('text/plain', piece.name);
  };

  const handleDragEnd = () => {
    // No-op: drag state management removed
  };

  const handleEdit = (piece: TerrainTemplate) => {
    setEditingPiece(piece);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleModalSave = (data: PieceFormData) => {
    if (modalMode === 'edit' && editingPiece) {
      onEditPiece(editingPiece.id, data);
    } else {
      onAddCustom(data);
    }

    setEditingPiece(null);
    setModalMode('create');
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingPiece(null);
    setModalMode('create');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this custom terrain piece?')) {
      onDeleteCustom(id);
    }
  };

  return (
    <aside
      data-testid="terrain-library-panel"
      className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-cyan-950/20"
    >
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-cyan-300/80">Terrain Library</p>
        <h2 className="text-xl font-semibold text-white">Drag pieces onto the table</h2>
        <p className="text-sm text-slate-300">
          Every row can be dragged from the table to place a new terrain piece on the board.
        </p>
      </div>

      {/* Search and Add Button */}
      <div className="mt-5 flex gap-3">
        <input
          type="text"
          placeholder="Search by name or trait..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
        />
        <button
          onClick={() => {
            setEditingPiece(null);
            setModalMode('create');
            setIsModalOpen(true);
          }}
          className="whitespace-nowrap rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-600"
        >
          + Add Custom
        </button>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="pb-2 font-semibold text-slate-300">Name</th>
              <th className="pb-2 font-semibold text-slate-300">Size</th>
              <th className="pb-2 font-semibold text-slate-300">Shape</th>
              <th className="pb-2 font-semibold text-slate-300">Traits</th>
              <th className="pb-2 font-semibold text-slate-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredPieces.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  {searchQuery ? 'No matching terrain pieces found.' : 'No terrain pieces available.'}
                </td>
              </tr>
            ) : (
              filteredPieces.map((piece) => (
                <tr
                  key={piece.id}
                  draggable
                  onDragStart={handleDragStart(piece)}
                  onDragEnd={handleDragEnd}
                  className="group cursor-grab transition hover:bg-slate-800/40 active:cursor-grabbing"
                  data-testid={`library-item-${piece.id}`}
                >
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-6 w-6 flex-shrink-0 rounded border border-white/15"
                        style={{ backgroundColor: piece.fill }}
                        aria-hidden="true"
                      />
                      <span className="font-medium text-white">
                        {piece.name}
                        {piece.isCustom && (
                          <span className="ml-1.5 text-xs text-cyan-400">(Custom)</span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 text-slate-300">{getSizeLabel(piece)}</td>
                  <td className="py-3 text-slate-300">{getShapeLabel(piece.shape)}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-1">
                      {piece.traits
                        .filter((t) => t.active ?? true)
                        .map((trait) => (
                          <span
                            key={trait.id}
                            className="rounded-full border border-white/10 bg-slate-800/60 px-2 py-0.5 text-xs text-slate-200"
                          >
                            {trait.label}
                          </span>
                        ))}
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                      {onAddPieceToLayout && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddPieceToLayout(piece.id);
                          }}
                          className="rounded-lg border border-cyan-400/30 bg-cyan-950/40 px-2 py-1 text-xs text-cyan-200 transition hover:bg-cyan-950/60"
                          title="Add to layout"
                        >
                          Add
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(piece);
                        }}
                        className="rounded-lg border border-white/10 bg-slate-800 px-2 py-1 text-xs text-white transition hover:bg-slate-700"
                        title="Edit"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const duplicated = onDuplicatePiece(piece.id);
                          if (duplicated) {
                            setEditingPiece(duplicated);
                            setModalMode('duplicate');
                            setIsModalOpen(true);
                          }
                        }}
                        className="rounded-lg border border-white/10 bg-slate-800 px-2 py-1 text-xs text-white transition hover:bg-slate-700"
                        title="Duplicate"
                      >
                        Duplicate
                      </button>
                      {piece.isCustom && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(piece.id);
                          }}
                          className="rounded-lg border border-red-500/30 bg-red-950/40 px-2 py-1 text-xs text-red-400 transition hover:bg-red-950/60"
                          title="Delete"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <TerrainPieceModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        initialData={editingPiece ?? undefined}
        mode={modalMode === 'edit' ? 'edit' : 'create'}
      />
    </aside>
  );
}
