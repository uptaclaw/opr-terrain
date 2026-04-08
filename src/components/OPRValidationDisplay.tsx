import type { OPRValidation } from '../terrain/types';

interface OPRValidationDisplayProps {
  validation: OPRValidation | undefined;
}

const ValidationItem = ({
  label,
  value,
  requirement,
  isValid,
}: {
  label: string;
  value: string;
  requirement: string;
  isValid: boolean;
}) => (
  <div className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-slate-950/30 px-3 py-2">
    <div className="flex-1">
      <div className="text-sm font-medium text-slate-200">{label}</div>
      <div className="text-xs text-slate-400">{requirement}</div>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold text-white">{value}</span>
      <span className={`text-lg ${isValid ? 'text-emerald-400' : 'text-rose-400'}`}>
        {isValid ? '✓' : '✗'}
      </span>
    </div>
  </div>
);

export function OPRValidationDisplay({ validation }: OPRValidationDisplayProps) {
  if (!validation) {
    return null;
  }

  const overallValid = validation.allValid;

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">OPR Guidelines Validation</h2>
          <p className="mt-1 text-sm text-slate-300">
            Based on Age of Fantasy rulebook page 12
          </p>
        </div>
        <div
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            overallValid
              ? 'bg-emerald-500/20 text-emerald-300'
              : 'bg-amber-500/20 text-amber-300'
          }`}
        >
          {overallValid ? 'Compliant' : 'Review Needed'}
        </div>
      </div>

      <div className="mt-4 space-y-2">
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

      {!overallValid && (
        <div className="mt-4 rounded-lg border border-amber-400/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
          <strong>Tip:</strong> Try regenerating with different settings or manually adjust terrain
          placement to meet OPR guidelines.
        </div>
      )}
    </section>
  );
}
