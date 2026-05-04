import { useState, useEffect } from 'react';
import { calculateTableCoveragePercent } from '../lib/tableCoverage';
import type { TerrainPiece } from '../types/layout';

interface TableCoverageIndicatorProps {
  pieces: TerrainPiece[];
  tableWidthInches: number;
  tableHeightInches: number;
}

export function TableCoverageIndicator({
  pieces,
  tableWidthInches,
  tableHeightInches,
}: TableCoverageIndicatorProps) {
  const [coverage, setCoverage] = useState<number>(0);

  const calculateCoverage = () => {
    const percent = calculateTableCoveragePercent(pieces, tableWidthInches, tableHeightInches);
    setCoverage(percent);
  };

  // Calculate on first render and when dependencies change
  useEffect(() => {
    calculateCoverage();
  }, [pieces, tableWidthInches, tableHeightInches]);

  // Determine color based on coverage percentage
  const getCoverageColorClasses = (percent: number) => {
    if (percent === 0) {
      return 'bg-slate-500/20 text-slate-300 border-slate-400/25';
    }
    if (percent < 25) {
      return 'bg-amber-500/20 text-amber-300 border-amber-400/25';
    }
    return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/25';
  };

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Table Coverage</h2>
          <p className="mt-1 text-sm text-slate-300">
            Total area covered by terrain pieces
          </p>
        </div>
        <div
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${getCoverageColorClasses(coverage)}`}
        >
          {coverage.toFixed(1)}%
        </div>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={calculateCoverage}
          className="w-full rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/25 hover:text-white"
        >
          Recalculate Coverage
        </button>
      </div>

      <div className="mt-3 rounded-lg border border-white/5 bg-slate-950/30 px-3 py-2">
        <p className="text-xs text-slate-400">
          Simple area sum — does not account for overlapping pieces
        </p>
      </div>
    </section>
  );
}
