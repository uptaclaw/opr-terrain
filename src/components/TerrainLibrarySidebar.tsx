import { TERRAIN_LIBRARY, type TerrainLibraryItem } from '../data/terrainLibrary';

export const TERRAIN_LIBRARY_MIME_TYPE = 'application/x-opr-terrain-template';

interface TerrainLibrarySidebarProps {
  onDragStateChange?: (isDragging: boolean) => void;
}

const buildPayload = (item: TerrainLibraryItem) =>
  JSON.stringify({
    templateId: item.templateId,
    shapeKind: item.shapeKind,
  });

export function TerrainLibrarySidebar({ onDragStateChange }: TerrainLibrarySidebarProps) {
  const handleDragStart = (item: TerrainLibraryItem) => (event: React.DragEvent<HTMLDivElement>) => {
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData(TERRAIN_LIBRARY_MIME_TYPE, buildPayload(item));
    event.dataTransfer.setData('text/plain', item.name);
    onDragStateChange?.(true);
  };

  const handleDragEnd = () => {
    onDragStateChange?.(false);
  };

  return (
    <aside className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-cyan-950/20">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-cyan-300/80">Terrain Library</p>
        <h2 className="text-xl font-semibold text-white">Drag new pieces onto the table</h2>
        <p className="text-sm text-slate-300">
          Every card can be dragged from the sidebar to place a new terrain piece on the board.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        {TERRAIN_LIBRARY.map((item) => (
          <div
            key={item.templateId}
            draggable
            data-testid={`library-item-${item.templateId}`}
            onDragStart={handleDragStart(item)}
            onDragEnd={handleDragEnd}
            className="cursor-grab rounded-2xl border border-white/10 bg-slate-950/60 p-4 transition hover:border-cyan-400/60 hover:bg-slate-900 active:cursor-grabbing"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">{item.name}</h3>
                <p className="mt-1 text-xs text-slate-400">{item.description}</p>
              </div>
              <div
                className="mt-0.5 h-8 w-8 flex-shrink-0 rounded-lg border border-white/15"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-200">
              <span className="rounded-full border border-white/10 bg-slate-800/80 px-2.5 py-1 font-medium text-cyan-100">
                {item.shapeKind}
              </span>
              {item.traits.map((trait) => (
                <span
                  key={trait}
                  className="rounded-full border border-white/10 bg-slate-800/80 px-2.5 py-1"
                >
                  {trait}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
