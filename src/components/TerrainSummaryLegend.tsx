import { useMemo } from 'react';
import {
  calculateTerrainSummary,
  type TerrainSummaryCategoryId,
} from '../lib/terrainSummary';
import type { TerrainPiece } from '../types/layout';

interface TerrainSummaryLegendProps {
  pieces: TerrainPiece[];
}

const accentClasses: Record<TerrainSummaryCategoryId, string> = {
  impassable: 'border-rose-400/20 bg-rose-500/5',
  'hard-cover': 'border-emerald-400/20 bg-emerald-500/5',
  'soft-cover': 'border-sky-400/20 bg-sky-500/5',
  difficult: 'border-amber-400/20 bg-amber-500/5',
  dangerous: 'border-fuchsia-400/20 bg-fuchsia-500/5',
  elevated: 'border-orange-400/20 bg-orange-500/5',
  'los-blocking': 'border-cyan-400/20 bg-cyan-500/5',
};

const formatPieceCount = (count: number) => `${count} piece${count === 1 ? '' : 's'}`;
const formatPercentage = (percentage: number) => `${percentage}%`;

export function TerrainSummaryLegend({ pieces }: TerrainSummaryLegendProps) {
  const summary = useMemo(() => calculateTerrainSummary(pieces), [pieces]);

  return (
    <section data-testid="terrain-summary" className="screen-only mt-5 rounded-3xl border border-white/10 bg-slate-950/40 p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-base font-semibold text-white sm:text-lg">Terrain summary legend</h3>
          <p className="mt-1 text-sm text-slate-300">
            Counts are based on active traits across the current table layout.
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full border border-white/10 bg-slate-900/80 px-3 py-1 text-xs font-semibold text-slate-200">
          {formatPieceCount(summary.totalPieces)} total
        </span>
      </div>

      <p className="mt-3 text-xs leading-6 text-slate-400">
        A single piece can appear in multiple rows when it has multiple active traits, so the
        percentages are based on total terrain pieces and can add up to more than 100%. Similar
        labels are grouped into these buckets too, like Heavy/Light cover, rough ground, and
        obscuring or partial line-of-sight blockers.
      </p>

      {summary.totalPieces === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-white/10 px-4 py-3 text-sm text-slate-400">
          Add terrain from the palette to populate the summary.
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        {summary.stats.map((stat) => (
          <article
            key={stat.id}
            data-testid={`terrain-summary-${stat.id}`}
            className={`rounded-2xl border p-4 ${accentClasses[stat.id]}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-white">{stat.label}</h4>
                <p className="mt-1 text-xs leading-5 text-slate-400">{stat.detail}</p>
              </div>
              <span className="rounded-full border border-white/10 bg-slate-950/70 px-2.5 py-1 text-xs font-semibold text-cyan-100">
                {formatPercentage(stat.percentage)}
              </span>
            </div>

            <div className="mt-4 flex items-end justify-between gap-3">
              <p className="text-base font-semibold text-slate-100">{formatPieceCount(stat.count)}</p>
              <p className="text-xs text-slate-400">of {summary.totalPieces} total</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
