import { useMemo } from 'react';
import type { TerrainPiece } from '../types/layout';
import { getPrintLegendTraitText } from '../lib/printLegend';

interface TerrainSummaryLegendProps {
  pieces: TerrainPiece[];
  className?: string;
}

const formatPieceCount = (count: number) => `${count} piece${count === 1 ? '' : 's'}`;

export function TerrainSummaryLegend({ pieces, className = '' }: TerrainSummaryLegendProps) {
  const legendEntries = useMemo(
    () =>
      [...pieces]
        .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id))
        .map((piece) => ({
          piece,
          traitsText: getPrintLegendTraitText(piece),
        })),
    [pieces],
  );

  return (
    <section
      data-testid="terrain-summary"
      className={`screen-only rounded-3xl border border-white/10 bg-slate-900/65 p-5 shadow-xl shadow-slate-950/20 ${className}`.trim()}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Summary legend</h2>
          <p className="mt-1 text-sm text-slate-300">
            Terrain names plus the key traits players usually need mid-game.
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-xs font-semibold text-slate-200">
          {formatPieceCount(legendEntries.length)}
        </span>
      </div>

      {legendEntries.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-white/10 px-4 py-3 text-sm text-slate-400">
          Add terrain to the table to build the sidebar legend.
        </p>
      ) : (
        <div className="mt-4 max-h-[26rem] space-y-2 overflow-y-auto pr-1">
          {legendEntries.map(({ piece, traitsText }) => (
            <article
              key={piece.id}
              data-testid="terrain-summary-item"
              className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3"
            >
              <div className="flex items-start gap-3">
                <div
                  className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 rounded-full border border-white/15"
                  style={{ backgroundColor: piece.fill }}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-white">{piece.name}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-300">{traitsText}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
