import { useMemo } from 'react';
import type { TerrainPiece } from '../types/layout';
import { validateOPRTerrain, type ValidationStatus } from '../lib/oprValidation';

interface OPRValidationDashboardProps {
  pieces: TerrainPiece[];
  tableWidthInches: number;
  tableHeightInches: number;
}

const statusIcons: Record<ValidationStatus, string> = {
  good: '✓',
  warning: '⚠️',
  fail: '✗',
};

const statusColors: Record<ValidationStatus, string> = {
  good: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100',
  warning: 'border-amber-400/30 bg-amber-500/10 text-amber-100',
  fail: 'border-rose-400/30 bg-rose-500/10 text-rose-100',
};

const statusBadgeColors: Record<ValidationStatus, string> = {
  good: 'bg-emerald-400/20 text-emerald-100 ring-emerald-400/30',
  warning: 'bg-amber-400/20 text-amber-100 ring-amber-400/30',
  fail: 'bg-rose-400/20 text-rose-100 ring-rose-400/30',
};

const overallStatusLabels: Record<ValidationStatus, string> = {
  good: 'All checks passed',
  warning: 'Some warnings',
  fail: 'Issues detected',
};

export function OPRValidationDashboard({
  pieces,
  tableWidthInches,
  tableHeightInches,
}: OPRValidationDashboardProps) {
  const validation = useMemo(
    () => validateOPRTerrain(pieces, tableWidthInches, tableHeightInches),
    [pieces, tableWidthInches, tableHeightInches]
  );

  return (
    <section
      data-testid="opr-validation-dashboard"
      className="screen-only mt-6 rounded-3xl border border-white/10 bg-slate-950/40 p-4 sm:p-5"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-base font-semibold text-white sm:text-lg">OPR Validation Dashboard</h3>
          <p className="mt-1 text-sm text-slate-300">
            Real-time validation against OPR Age of Fantasy terrain recommendations (page 12).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ring-inset ${statusBadgeColors[validation.overallStatus]}`}
          >
            <span className="text-lg leading-none">{statusIcons[validation.overallStatus]}</span>
            {overallStatusLabels[validation.overallStatus]}
          </span>
          <span className="rounded-full border border-white/10 bg-slate-900/80 px-3 py-1 text-xs font-semibold text-slate-200">
            {validation.passedCount}/{validation.totalCount} passed
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {validation.metrics.map((metric) => (
          <article
            key={metric.id}
            data-testid={`validation-metric-${metric.id}`}
            className={`rounded-2xl border p-4 transition ${statusColors[metric.status]}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-white">{metric.label}</h4>
                <p className="mt-2 text-lg font-bold text-white">
                  {metric.message}
                </p>
              </div>
              <span className="text-2xl leading-none" aria-label={metric.status}>
                {statusIcons[metric.status]}
              </span>
            </div>

            {metric.targetValue !== undefined && (
              <div className="mt-3">
                <div className="flex items-center justify-between gap-2 text-xs text-slate-300">
                  <span>Target: {metric.targetValue}{metric.unit === '%' ? '%' : `+ ${metric.unit}`}</span>
                  <span>
                    {metric.currentValue}{metric.unit}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-900/60">
                  <div
                    className={`h-full transition-all duration-300 ${
                      metric.status === 'good'
                        ? 'bg-emerald-400'
                        : metric.status === 'warning'
                        ? 'bg-amber-400'
                        : 'bg-rose-400'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        metric.unit === '%'
                          ? (metric.currentValue / (metric.targetValue || 1)) * 100
                          : (metric.currentValue / (metric.targetValue || 1)) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {metric.suggestion && (
              <p className="mt-3 rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2 text-xs leading-relaxed text-slate-200">
                💡 {metric.suggestion}
              </p>
            )}
          </article>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="text-lg leading-none text-cyan-300">ℹ️</span>
          <div className="flex-1 text-sm text-cyan-50">
            <p className="font-semibold text-cyan-200">OPR Age of Fantasy Guidelines (Page 12)</p>
            <ul className="mt-2 space-y-1 text-xs leading-relaxed text-cyan-50/90">
              <li>• 10-15 terrain pieces recommended</li>
              <li>• ≥50% table coverage if placed edge-to-edge</li>
              <li>• ≥50% should block line of sight</li>
              <li>• ≥33% should provide cover</li>
              <li>• ≥33% should be difficult terrain</li>
              <li>• At least 2 pieces should be dangerous terrain</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
