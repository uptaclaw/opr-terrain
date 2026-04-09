import { useMemo } from 'react';
import { getPrintLegendTraitText } from '../lib/printLegend';
import type { TerrainPiece } from '../types/layout';

interface TerrainSummaryLegendProps {
  pieces: TerrainPiece[];
  className?: string;
}

type SummaryLegendEntry = {
  key: string;
  name: string;
  traitsText: string;
  count: number;
  fill: string;
  shape: TerrainPiece['shape'];
};

const swatchShapeClasses: Record<TerrainPiece['shape'], string> = {
  rect: 'rounded-[4px]',
  ellipse: 'rounded-full',
  diamond: 'rotate-45 rounded-[3px]',
};

const formatPieceCount = (count: number) => `${count} piece${count === 1 ? '' : 's'}`;

const buildLegendEntries = (pieces: TerrainPiece[]): SummaryLegendEntry[] => {
  const grouped = new Map<string, SummaryLegendEntry>();

  [...pieces]
    .sort((left, right) => left.name.localeCompare(right.name))
    .forEach((piece) => {
      const traitsText = getPrintLegendTraitText(piece);
      const key = `${piece.name}::${traitsText}`;
      const existingEntry = grouped.get(key);

      if (existingEntry) {
        existingEntry.count += 1;
        return;
      }

      grouped.set(key, {
        key,
        name: piece.name,
        traitsText,
        count: 1,
        fill: piece.fill,
        shape: piece.shape,
      });
    });

  return [...grouped.values()];
};

export function TerrainSummaryLegend({ pieces, className = '' }: TerrainSummaryLegendProps) {
  const legendEntries = useMemo(() => buildLegendEntries(pieces), [pieces]);

  return (
    <section
      data-testid="terrain-summary"
      className={`screen-only rounded-3xl border border-white/10 bg-slate-950/40 p-4 sm:p-5 ${className}`.trim()}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white sm:text-lg">Summary legend</h3>
          <p className="mt-1 text-sm text-slate-300">
            Compact terrain reference showing the names and key traits on the current board.
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full border border-white/10 bg-slate-900/80 px-3 py-1 text-xs font-semibold text-slate-200">
          {formatPieceCount(pieces.length)}
        </span>
      </div>

      {legendEntries.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-white/10 px-4 py-3 text-sm text-slate-400">
          Add terrain from the library to populate the legend.
        </p>
      ) : (
        <div className="mt-4 max-h-[24rem] space-y-2 overflow-auto pr-1">
          {legendEntries.map((entry) => (
            <article
              key={entry.key}
              data-testid="terrain-summary-entry"
              className="rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-1 flex h-3.5 w-3.5 flex-none items-center justify-center" aria-hidden="true">
                    <span
                      className={`block h-3.5 w-3.5 border border-white/25 ${swatchShapeClasses[entry.shape]}`}
                      style={{ backgroundColor: entry.fill }}
                    />
                  </span>

                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-semibold text-white">{entry.name}</h4>
                    <p className="mt-1 text-xs leading-5 text-slate-300">{entry.traitsText}</p>
                  </div>
                </div>

                {entry.count > 1 ? (
                  <span className="rounded-full border border-white/10 bg-slate-950/70 px-2.5 py-1 text-[11px] font-semibold text-cyan-100">
                    {entry.count}×
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
