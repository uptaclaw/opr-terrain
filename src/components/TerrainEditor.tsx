import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { analyzeTerrainLayout } from '../terrain/generateTerrainLayout';
import type { TerrainLayout, TerrainPiece, TerrainShapeKind } from '../terrain/types';
import { useUndoRedoHistory } from '../hooks/useUndoRedoHistory';
import {
  constrainTerrainPiecePosition,
  createTerrainPieceFromTemplate,
  isPiecePlacementValid,
  moveTerrainPiece,
  replaceTerrainPiece,
  rotateTerrainPiece,
} from '../terrain/editor';
import { TableCanvas, TABLE_SCENE_MARGIN } from './TableCanvas';
import { TerrainLibrarySidebar, TERRAIN_LIBRARY_MIME_TYPE } from './TerrainLibrarySidebar';
import { AutoPlacementGenerator } from './AutoPlacementGenerator';

interface TerrainEditorProps {
  widthInches: number;
  heightInches: number;
  deploymentDepthInches: number;
  initialPieces: TerrainPiece[];
}

interface ContextMenuState {
  pieceId: string;
  clientX: number;
  clientY: number;
}

interface DragSession {
  pieceId: string;
  originalPieces: TerrainPiece[];
  originalPosition: {
    x: number;
    y: number;
  };
  pointerOffset: {
    x: number;
    y: number;
  };
  lastValidPosition: {
    x: number;
    y: number;
  };
}

interface TerrainLibraryDropPayload {
  templateId: string;
  shapeKind?: TerrainShapeKind;
}

const quarterLabels = ['NW', 'NE', 'SW', 'SE'] as const;

const textEntryInputTypes = new Set(['email', 'number', 'password', 'search', 'tel', 'text', 'url']);

const isTextEntryTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable || target instanceof HTMLTextAreaElement) {
    return true;
  }

  return target instanceof HTMLInputElement && textEntryInputTypes.has(target.type);
};

const arePositionsEqual = (
  left: { x: number; y: number },
  right: { x: number; y: number },
) => left.x === right.x && left.y === right.y;

const isTerrainLibraryDrag = (dataTransfer: DataTransfer | null) =>
  Boolean(dataTransfer && Array.from(dataTransfer.types ?? []).includes(TERRAIN_LIBRARY_MIME_TYPE));

const parseLibraryDropPayload = (dataTransfer: DataTransfer | null): TerrainLibraryDropPayload | null => {
  if (!dataTransfer) {
    return null;
  }

  const rawPayload = dataTransfer.getData(TERRAIN_LIBRARY_MIME_TYPE);

  if (!rawPayload) {
    return null;
  }

  try {
    return JSON.parse(rawPayload) as TerrainLibraryDropPayload;
  } catch {
    return null;
  }
};

export function TerrainEditor({
  widthInches,
  heightInches,
  deploymentDepthInches,
  initialPieces,
}: TerrainEditorProps) {
  const { present: committedPieces, commit, undo, redo, canUndo, canRedo } =
    useUndoRedoHistory(initialPieces);
  const [pieces, setPieces] = useState(initialPieces);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [draggingPieceId, setDraggingPieceId] = useState<string | null>(null);
  const [libraryDragActive, setLibraryDragActive] = useState(false);
  const [snapToGridEnabled, setSnapToGridEnabled] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragSessionRef = useRef<DragSession | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPieces(committedPieces);
  }, [committedPieces]);

  useEffect(() => {
    if (selectedPieceId && !pieces.some((piece) => piece.id === selectedPieceId)) {
      setSelectedPieceId(null);
      setContextMenu(null);
    }
  }, [pieces, selectedPieceId]);

  const toTableCoordinates = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;

      if (!svg) {
        return null;
      }

      const rect = svg.getBoundingClientRect();

      if (rect.width === 0 || rect.height === 0) {
        return null;
      }

      const sceneWidth = TABLE_SCENE_MARGIN.left + widthInches + TABLE_SCENE_MARGIN.right;
      const sceneHeight = TABLE_SCENE_MARGIN.top + heightInches + TABLE_SCENE_MARGIN.bottom;
      const sceneX = ((clientX - rect.left) / rect.width) * sceneWidth;
      const sceneY = ((clientY - rect.top) / rect.height) * sceneHeight;

      return {
        x: sceneX - TABLE_SCENE_MARGIN.left,
        y: sceneY - TABLE_SCENE_MARGIN.top,
      };
    },
    [heightInches, widthInches],
  );

  const commitPieces = useCallback(
    (nextPieces: TerrainPiece[], nextSelectedPieceId: string | null = selectedPieceId) => {
      commit(nextPieces);
      setPieces(nextPieces);
      setSelectedPieceId(nextSelectedPieceId);
      setContextMenu(null);
      setFeedback(null);
    },
    [commit, selectedPieceId],
  );

  const handleLayoutGenerated = useCallback(
    (layout: TerrainLayout) => {
      commitPieces(layout.pieces, null);
      setFeedback(`Generated ${layout.pieces.length} terrain pieces using ${layout.placementConfig?.strategy || 'random'} strategy.`);
    },
    [commitPieces],
  );

  const handleUndo = useCallback(() => {
    undo();
    setContextMenu(null);
    setFeedback(null);
  }, [undo]);

  const handleRedo = useCallback(() => {
    redo();
    setContextMenu(null);
    setFeedback(null);
  }, [redo]);

  const handleDeletePiece = useCallback(
    (pieceId: string | null) => {
      if (!pieceId) {
        return;
      }

      const pieceToDelete = pieces.find((piece) => piece.id === pieceId);

      if (!pieceToDelete) {
        return;
      }

      const nextPieces = pieces.filter((piece) => piece.id !== pieceId);
      commitPieces(nextPieces, null);
    },
    [commitPieces, pieces],
  );

  const handleRotatePiece = useCallback(
    (pieceId: string) => {
      const pieceToRotate = pieces.find((piece) => piece.id === pieceId);

      if (!pieceToRotate || pieceToRotate.shape.kind === 'circle') {
        return;
      }

      const rotatedPiece = rotateTerrainPiece(pieceToRotate, 90);
      const nextPieces = replaceTerrainPiece(pieces, rotatedPiece);
      commitPieces(nextPieces, pieceId);
    },
    [commitPieces, pieces],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTextEntryTarget(event.target)) {
        return;
      }

      const isUndoShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z';

      if (isUndoShortcut) {
        event.preventDefault();

        if (event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }

        return;
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedPieceId) {
        event.preventDefault();
        handleDeletePiece(selectedPieceId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleDeletePiece, handleRedo, handleUndo, selectedPieceId]);

  useEffect(() => {
    if (!contextMenu) {
      return undefined;
    }

    const handleMouseDown = (event: MouseEvent) => {
      if (contextMenuRef.current?.contains(event.target as Node)) {
        return;
      }

      setContextMenu(null);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenu(null);
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (!draggingPieceId) {
      return undefined;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const dragSession = dragSessionRef.current;

      if (!dragSession) {
        return;
      }

      const activePiece = dragSession.originalPieces.find((piece) => piece.id === dragSession.pieceId);
      const pointer = toTableCoordinates(event.clientX, event.clientY);

      if (!activePiece || !pointer) {
        return;
      }

      const constrainedPosition = constrainTerrainPiecePosition(
        activePiece,
        pointer.x - dragSession.pointerOffset.x,
        pointer.y - dragSession.pointerOffset.y,
        widthInches,
        heightInches,
        snapToGridEnabled,
      );
      const candidatePiece = moveTerrainPiece(activePiece, constrainedPosition.x, constrainedPosition.y);

      if (
        isPiecePlacementValid(
          candidatePiece,
          dragSession.originalPieces,
          widthInches,
          heightInches,
          dragSession.pieceId,
        )
      ) {
        dragSession.lastValidPosition = constrainedPosition;
        setPieces(replaceTerrainPiece(dragSession.originalPieces, candidatePiece));
      }
    };

    const finishDrag = () => {
      const dragSession = dragSessionRef.current;

      if (!dragSession) {
        return;
      }

      const activePiece = dragSession.originalPieces.find((piece) => piece.id === dragSession.pieceId);

      if (!activePiece) {
        dragSessionRef.current = null;
        setDraggingPieceId(null);
        return;
      }

      if (arePositionsEqual(dragSession.originalPosition, dragSession.lastValidPosition)) {
        setPieces(dragSession.originalPieces);
      } else {
        const movedPiece = moveTerrainPiece(
          activePiece,
          dragSession.lastValidPosition.x,
          dragSession.lastValidPosition.y,
        );
        const nextPieces = replaceTerrainPiece(dragSession.originalPieces, movedPiece);
        commitPieces(nextPieces, dragSession.pieceId);
      }

      dragSessionRef.current = null;
      setDraggingPieceId(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', finishDrag);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', finishDrag);
    };
  }, [commitPieces, draggingPieceId, heightInches, snapToGridEnabled, toTableCoordinates, widthInches]);

  const handlePieceMouseDown = useCallback(
    (pieceId: string, event: ReactMouseEvent<SVGGElement>) => {
      if (event.button !== 0) {
        return;
      }

      const piece = pieces.find((entry) => entry.id === pieceId);
      const pointer = toTableCoordinates(event.clientX, event.clientY);

      if (!piece || !pointer) {
        return;
      }

      setSelectedPieceId(pieceId);
      setContextMenu(null);
      setFeedback(null);
      dragSessionRef.current = {
        pieceId,
        originalPieces: pieces,
        originalPosition: {
          x: piece.x,
          y: piece.y,
        },
        pointerOffset: {
          x: pointer.x - piece.x,
          y: pointer.y - piece.y,
        },
        lastValidPosition: {
          x: piece.x,
          y: piece.y,
        },
      };
      setDraggingPieceId(pieceId);
    },
    [pieces, toTableCoordinates],
  );

  const handlePieceContextMenu = useCallback(
    (pieceId: string, event: ReactMouseEvent<SVGGElement>) => {
      setSelectedPieceId(pieceId);
      setContextMenu({
        pieceId,
        clientX: event.clientX,
        clientY: event.clientY,
      });
      setFeedback(null);
    },
    [],
  );

  const handleCanvasMouseDown = useCallback(() => {
    setSelectedPieceId(null);
    setContextMenu(null);
  }, []);

  const handleCanvasDragOver = useCallback((event: ReactDragEvent<HTMLDivElement>) => {
    if (!isTerrainLibraryDrag(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setLibraryDragActive(true);
  }, []);

  const handleCanvasDrop = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      if (isTerrainLibraryDrag(event.dataTransfer)) {
        event.preventDefault();
      }

      const payload = parseLibraryDropPayload(event.dataTransfer);
      setLibraryDragActive(false);

      if (!payload) {
        return;
      }

      const pointer = toTableCoordinates(event.clientX, event.clientY);

      if (!pointer) {
        return;
      }

      const newPiece = createTerrainPieceFromTemplate(payload.templateId, payload.shapeKind);
      const constrainedPosition = constrainTerrainPiecePosition(
        newPiece,
        pointer.x,
        pointer.y,
        widthInches,
        heightInches,
        snapToGridEnabled,
      );
      const positionedPiece = moveTerrainPiece(newPiece, constrainedPosition.x, constrainedPosition.y);

      if (!isPiecePlacementValid(positionedPiece, pieces, widthInches, heightInches)) {
        setSelectedPieceId(null);
        setContextMenu(null);
        setFeedback(`Cannot place ${positionedPiece.name} there — it overlaps another terrain piece.`);
        return;
      }

      const nextPieces = [...pieces, positionedPiece];
      commitPieces(nextPieces, positionedPiece.id);
    },
    [commitPieces, heightInches, pieces, snapToGridEnabled, toTableCoordinates, widthInches],
  );

  const analysis = useMemo(
    () =>
      analyzeTerrainLayout({
        widthInches,
        heightInches,
        deploymentDepthInches,
        targetPieceCount: pieces.length,
        quarterTargets: [0, 0, 0, 0],
        pieces,
      }),
    [deploymentDepthInches, heightInches, pieces, widthInches],
  );

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

  const selectedPiece = pieces.find((piece) => piece.id === selectedPieceId) ?? null;
  const contextMenuPiece = pieces.find((piece) => piece.id === contextMenu?.pieceId) ?? null;

  return (
    <>
      <section className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)_20rem]">
        <TerrainLibrarySidebar onDragStateChange={setLibraryDragActive} />

        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-3 shadow-2xl shadow-cyan-950/30 sm:p-6">
          <TableCanvas
            svgRef={svgRef}
            widthInches={widthInches}
            heightInches={heightInches}
            deploymentDepthInches={deploymentDepthInches}
            terrainPieces={pieces}
            selectedPieceId={selectedPieceId}
            draggingPieceId={draggingPieceId}
            libraryDragActive={libraryDragActive}
            onCanvasMouseDown={handleCanvasMouseDown}
            onCanvasDragOver={handleCanvasDragOver}
            onCanvasDrop={handleCanvasDrop}
            onPieceMouseDown={handlePieceMouseDown}
            onPieceContextMenu={handlePieceContextMenu}
            onRotateHandleMouseDown={(pieceId) => handleRotatePiece(pieceId)}
          />
        </div>

        <aside className="flex flex-col gap-4">
          <AutoPlacementGenerator
            widthInches={widthInches}
            heightInches={heightInches}
            deploymentDepthInches={deploymentDepthInches}
            onLayoutGenerated={handleLayoutGenerated}
          />

          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-cyan-300/80">Editor</p>
                <h2 className="mt-1 text-lg font-semibold text-white">Interactive controls</h2>
              </div>
              <span className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-xs font-semibold text-cyan-100">
                {pieces.length} piece{pieces.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                data-testid="undo-button"
                disabled={!canUndo}
                onClick={handleUndo}
                className="inline-flex flex-1 items-center justify-center rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/50 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Undo
              </button>
              <button
                type="button"
                data-testid="redo-button"
                disabled={!canRedo}
                onClick={handleRedo}
                className="inline-flex flex-1 items-center justify-center rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/50 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Redo
              </button>
            </div>

            <label className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
              <div>
                <div className="text-sm font-medium text-white">Snap to grid</div>
                <div className="text-xs text-slate-400">Locks movement and placement to 1-inch increments.</div>
              </div>
              <input
                data-testid="snap-toggle"
                type="checkbox"
                checked={snapToGridEnabled}
                onChange={(event) => setSnapToGridEnabled(event.target.checked)}
                className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-cyan-400 focus:ring-cyan-300"
              />
            </label>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-200">
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2">
                <dt className="text-xs uppercase tracking-wide text-slate-400">Collisions</dt>
                <dd className="mt-1 font-semibold text-emerald-300">
                  {analysis.overlaps.length === 0 ? 'Blocked cleanly' : `${analysis.overlaps.length} overlap(s)`}
                </dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2">
                <dt className="text-xs uppercase tracking-wide text-slate-400">Selection</dt>
                <dd className="mt-1 font-semibold text-white">
                  {selectedPiece ? selectedPiece.name : 'None'}
                </dd>
              </div>
            </dl>

            {selectedPiece ? (
              <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-950/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{selectedPiece.name}</h3>
                    <p className="mt-1 text-xs text-slate-400">
                      {selectedPiece.shape.kind} • x {selectedPiece.x.toFixed(1)} • y {selectedPiece.y.toFixed(1)}
                    </p>
                  </div>
                  <div
                    className="h-8 w-8 rounded-lg border border-white/15"
                    style={{ backgroundColor: selectedPiece.color }}
                    aria-hidden="true"
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-200">
                  {selectedPiece.traits.map((trait) => (
                    <span
                      key={trait}
                      className="rounded-full border border-white/10 bg-slate-900/80 px-2.5 py-1"
                    >
                      {trait}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleRotatePiece(selectedPiece.id)}
                    disabled={selectedPiece.shape.kind === 'circle'}
                    className="inline-flex items-center justify-center rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/50 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Rotate 90°
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePiece(selectedPiece.id)}
                    className="inline-flex items-center justify-center rounded-full border border-rose-400/30 bg-rose-950/30 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:border-rose-300/60 hover:text-white"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400">
                Click any piece to select it. Right-click for the quick menu, or use Delete to remove
                the current selection.
              </p>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
            <h2 className="text-lg font-semibold text-white">Shortcuts & workflow</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              <li>
                <span className="font-semibold text-white">Drag pieces</span> to move them without
                letting them overlap.
              </li>
              <li>
                <span className="font-semibold text-white">Drag from the library</span> to place new
                terrain on the table.
              </li>
              <li>
                <span className="font-semibold text-white">Ctrl+Z</span> undoes the last placement,
                move, rotation, or deletion.
              </li>
              <li>
                <span className="font-semibold text-white">Ctrl+Shift+Z</span> redoes the next change.
              </li>
            </ul>

            {feedback ? (
              <div
                data-testid="interaction-feedback"
                className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-100"
              >
                {feedback}
              </div>
            ) : null}
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
            <h2 className="text-lg font-semibold text-white">Layout snapshot</h2>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
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

      {contextMenu && contextMenuPiece ? (
        <div
          ref={contextMenuRef}
          data-testid="piece-context-menu"
          className="fixed z-50 min-w-44 rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-2xl shadow-black/50"
          style={{
            left: Math.max(12, contextMenu.clientX),
            top: Math.max(12, contextMenu.clientY),
          }}
        >
          <div className="px-3 py-2 text-xs uppercase tracking-[0.16em] text-slate-400">
            {contextMenuPiece.name}
          </div>
          {contextMenuPiece.shape.kind !== 'circle' ? (
            <button
              type="button"
              data-testid="context-rotate-button"
              onClick={() => handleRotatePiece(contextMenuPiece.id)}
              className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-white transition hover:bg-slate-800"
            >
              Rotate 90°
            </button>
          ) : null}
          <button
            type="button"
            data-testid="context-delete-button"
            onClick={() => handleDeletePiece(contextMenuPiece.id)}
            className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-rose-100 transition hover:bg-rose-950/40"
          >
            Delete
          </button>
        </div>
      ) : null}
    </>
  );
}
