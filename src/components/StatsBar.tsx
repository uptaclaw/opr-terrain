import { useMemo, useState } from 'react';
import type { TerrainPiece } from '../types/layout';
import type { OPRValidation } from '../terrain/types';
import type { EdgeToEdgeSightlineResult } from '../lib/lineOfSight';
import { calculateTableCoveragePercent } from '../lib/tableCoverage';
import { getPrintLegendTraitText } from '../lib/printLegend';
import { ValidationItem } from './OPRValidationDisplay';
import { Modal } from './Modal';

export type LosCheckState =
  | { status: 'idle' }
  | { status: 'stale' }
  | { status: 'loading' }
  | { status: 'done'; result: EdgeToEdgeSightlineResult };

interface StatsBarProps {
  screenLegend: string;
  pieceCount: number;
  deploymentDepthInches: number;
  pieces: TerrainPiece[];
  tableWidthInches: number;
  tableHeightInches: number;
  validation: OPRValidation | undefined;
  losCheckState: LosCheckState;
  onRunLosCheck: () => void;
  onClearLosCheck: () => void;
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

export function StatsBar({
  screenLegend,
  pieceCount,
  deploymentDepthInches,
  pieces,
  tableWidthInches,
  tableHeightInches,
  validation,
  losCheckState,
  onRunLosCheck,
  onClearLosCheck,
}: StatsBarProps) {
  const [oprModalOpen, setOprModalOpen] = useState(false);
  const [legendModalOpen, setLegendModalOpen] = useState(false);
  const [losEnabled, setLosEnabled] = useState(false);

  const coveragePercent = useMemo(
    () => calculateTableCoveragePercent(pieces, tableWidthInches, tableHeightInches),
    [pieces, tableWidthInches, tableHeightInches]
  );

  const legendEntries = useMemo(() => buildLegendEntries(pieces), [pieces]);

  const formatInches = (inches: number) => {
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;
    if (feet > 0 && remainingInches === 0) {
      return `${feet}'`;
    }
    if (feet > 0) {
      return `${feet}' ${remainingInches}"`;
    }
    return `${inches}"`;
  };

  const handleLosToggle = () => {
    if (losEnabled) {
      setLosEnabled(false);
      onClearLosCheck();
    } else {
      setLosEnabled(true);
      onRunLosCheck();
    }
  };

  const losCheckResult = losCheckState.status === 'done' ? losCheckState.result : null;
  const validationPassCount = validation
    ? [
        validation.meetsMinPieces && validation.meetsMaxPieces,
        validation.meetsCoverage,
        validation.meetsLosBlocking,
        validation.meetsCover,
        validation.meetsDifficult,
        validation.meetsDangerous,
        validation.meetsMinGap,
        validation.meetsMaxGap,
        validation.edgeToEdgeClear,
      ].filter(Boolean).length
    : 0;

  return (
    <>
      <div data-testid="stats-bar" className="mb-4 flex flex-wrap items-center gap-3">
        {/* Table dimensions badge */}
        <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-2.5">
          <p className="text-sm font-semibold text-white">{screenLegend}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            {pieceCount} pieces · deployment depth {formatInches(deploymentDepthInches)}
          </p>
        </div>

        {/* Table coverage badge */}
        <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-2.5">
          <p className="text-xs text-slate-400">Table Coverage</p>
          <p
            className={`mt-0.5 text-sm font-semibold ${
              coveragePercent >= 25
                ? 'text-emerald-100'
                : coveragePercent > 0
                ? 'text-amber-100'
                : 'text-slate-300'
            }`}
          >
            {coveragePercent.toFixed(0)}%
          </p>
        </div>

        {/* OPR Validation summary badge */}
        {validation && (
          <button
            type="button"
            onClick={() => setOprModalOpen(true)}
            className={`cursor-pointer rounded-2xl border px-4 py-2.5 transition hover:scale-105 hover:brightness-125 ${
              validation.allValid
                ? 'border-emerald-400/25 bg-emerald-500/10'
                : 'border-amber-400/25 bg-amber-500/10'
            }`}
          >
            <p className="text-xs text-slate-400">OPR Guidelines</p>
            <p
              className={`mt-0.5 text-sm font-semibold ${
                validation.allValid ? 'text-emerald-100' : 'text-amber-100'
              }`}
            >
              {validation.allValid ? '✓' : '⚠'} {validationPassCount}/9 checks
            </p>
          </button>
        )}

        {/* Summary legend badge */}
        <button
          type="button"
          onClick={() => setLegendModalOpen(true)}
          className="cursor-pointer rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-2.5 transition hover:scale-105 hover:brightness-125"
        >
          <p className="text-xs text-slate-400">Terrain Types</p>
          <p className="mt-0.5 text-sm font-semibold text-white">
            {legendEntries.length} {legendEntries.length === 1 ? 'type' : 'types'}
          </p>
        </button>

        {/* LoS Check toggle */}
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-2.5">
          <div>
            <p className="text-xs text-slate-400">LoS Check</p>
            <div className="mt-0.5 flex items-center gap-2">
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={losEnabled}
                  onChange={handleLosToggle}
                  disabled={losCheckState.status === 'loading'}
                  className="peer sr-only"
                  data-testid="los-toggle"
                />
                <div className="peer h-6 w-11 rounded-full bg-slate-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-rose-400 peer-checked:after:translate-x-full peer-checked:after:border-white peer-disabled:cursor-not-allowed peer-disabled:opacity-50"></div>
              </label>
              {losCheckState.status === 'loading' && (
                <span className="text-xs text-cyan-100">Checking...</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* OPR Validation Modal */}
      <Modal
        open={oprModalOpen}
        onClose={() => setOprModalOpen(false)}
        title="OPR Guidelines Validation"
      >
        {validation && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-slate-300">
                Based on Age of Fantasy rulebook page 12
              </p>
              <div
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  validation.allValid
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {validation.allValid ? 'Compliant' : 'Review Needed'}
              </div>
            </div>

            <div className="space-y-2">
              <ValidationItem
                label="Piece Count"
                value={`${validation.pieceCount} pieces`}
                requirement="10-15 pieces"
                isValid={validation.meetsMinPieces && validation.meetsMaxPieces}
              />

              <ValidationItem
                label="Table Coverage"
                value={`${validation.coveragePercent.toFixed(0)}%`}
                requirement="≥50% coverage potential"
                isValid={validation.meetsCoverage}
              />

              <ValidationItem
                label="LoS Blocking"
                value={`${validation.losBlockingPercent.toFixed(0)}%`}
                requirement="≥50% block line of sight"
                isValid={validation.meetsLosBlocking}
              />

              <ValidationItem
                label="Cover Terrain"
                value={`${validation.coverPercent.toFixed(0)}%`}
                requirement="≥33% provide cover"
                isValid={validation.meetsCover}
              />

              <ValidationItem
                label="Difficult Terrain"
                value={`${validation.difficultPercent.toFixed(0)}%`}
                requirement="≥33% difficult terrain"
                isValid={validation.meetsDifficult}
              />

              <ValidationItem
                label="Dangerous Terrain"
                value={`${validation.dangerousCount} pieces`}
                requirement="Exactly 2 pieces"
                isValid={validation.meetsDangerous}
              />

              <ValidationItem
                label="Minimum Gap"
                value={`${validation.minGap.toFixed(1)}"`}
                requirement='≥3" between pieces'
                isValid={validation.meetsMinGap}
              />

              <ValidationItem
                label="Maximum Gap"
                value={`${validation.maxGap.toFixed(1)}"`}
                requirement='≤6" no large gaps'
                isValid={validation.meetsMaxGap}
              />

              <ValidationItem
                label="Edge Sightlines"
                value={validation.edgeToEdgeClear ? 'Blocked' : 'Clear'}
                requirement="No clear edge-to-edge LoS"
                isValid={validation.edgeToEdgeClear}
              />
            </div>

            {!validation.allValid && (
              <div className="mt-4 rounded-lg border border-amber-400/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
                <strong>Tip:</strong> Try regenerating with different settings or manually adjust terrain
                placement to meet OPR guidelines.
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Summary Legend Modal */}
      <Modal
        open={legendModalOpen}
        onClose={() => setLegendModalOpen(false)}
        title="Summary Legend"
      >
        <div>
          <p className="mb-4 text-sm text-slate-300">
            Compact terrain reference showing the names and key traits on the current board.
          </p>

          {legendEntries.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/10 px-4 py-3 text-sm text-slate-400">
              Add terrain from the library to populate the legend.
            </p>
          ) : (
            <div className="space-y-2">
              {legendEntries.map((entry) => (
                <article
                  key={entry.key}
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
        </div>
      </Modal>
    </>
  );
}
