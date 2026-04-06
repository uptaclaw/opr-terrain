import { useMemo } from 'react';
import type { TerrainPiece } from '../types/layout';
import {
  calculateOverallScore,
  validateLayout,
  type ValidationResult,
  type ValidationStatus,
} from '../lib/oprGuidelines';

interface OPRInsightsPanelProps {
  pieces: TerrainPiece[];
  tableWidthInches: number;
  tableHeightInches: number;
  deploymentDepthInches: number;
}

const statusConfig: Record<
  ValidationStatus,
  { icon: string; color: string; bgColor: string; borderColor: string }
> = {
  good: {
    icon: '✓',
    color: 'text-emerald-200',
    bgColor: 'bg-emerald-500/15',
    borderColor: 'border-emerald-400/40',
  },
  warning: {
    icon: '⚠',
    color: 'text-amber-200',
    bgColor: 'bg-amber-500/15',
    borderColor: 'border-amber-400/40',
  },
  poor: {
    icon: '✗',
    color: 'text-rose-200',
    bgColor: 'bg-rose-500/15',
    borderColor: 'border-rose-400/40',
  },
};

const getScoreConfig = (score: number) => {
  if (score >= 80) {
    return {
      label: 'Excellent',
      color: 'text-emerald-200',
      bgColor: 'bg-emerald-500/20',
      borderColor: 'border-emerald-400/50',
      icon: '✓',
    };
  }
  if (score >= 60) {
    return {
      label: 'Good',
      color: 'text-cyan-200',
      bgColor: 'bg-cyan-500/20',
      borderColor: 'border-cyan-400/50',
      icon: '~',
    };
  }
  if (score >= 40) {
    return {
      label: 'Fair',
      color: 'text-amber-200',
      bgColor: 'bg-amber-500/20',
      borderColor: 'border-amber-400/50',
      icon: '⚠',
    };
  }
  return {
    label: 'Needs Work',
    color: 'text-rose-200',
    bgColor: 'bg-rose-500/20',
    borderColor: 'border-rose-400/50',
    icon: '✗',
  };
};

export function OPRInsightsPanel({
  pieces,
  tableWidthInches,
  tableHeightInches,
  deploymentDepthInches,
}: OPRInsightsPanelProps) {
  const validationResults = useMemo(() => {
    return validateLayout(pieces, tableWidthInches, tableHeightInches, deploymentDepthInches);
  }, [pieces, tableWidthInches, tableHeightInches, deploymentDepthInches]);

  const overallScore = useMemo(() => {
    return calculateOverallScore(validationResults);
  }, [validationResults]);

  const scoreConfig = getScoreConfig(overallScore);

  const groupedResults = useMemo(() => {
    const groups: Record<string, ValidationResult[]> = {
      density: [],
      cover: [],
      los: [],
      deployment: [],
      balance: [],
    };

    validationResults.forEach((result) => {
      groups[result.guideline.category].push(result);
    });

    return groups;
  }, [validationResults]);

  if (pieces.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 bg-slate-900/40 p-6 text-center">
        <p className="text-sm text-slate-400">
          Add terrain pieces to see OPR setup recommendations
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <div
        className={`rounded-3xl border ${scoreConfig.borderColor} ${scoreConfig.bgColor} p-5 shadow-lg`}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              OPR Setup Quality
            </h3>
            <p className={`mt-2 text-3xl font-bold ${scoreConfig.color}`}>
              {overallScore}/100
            </p>
            <p className={`mt-1 text-sm font-medium ${scoreConfig.color}`}>
              {scoreConfig.label}
            </p>
          </div>
          <div className={`text-6xl ${scoreConfig.color} opacity-70`}>
            {scoreConfig.icon}
          </div>
        </div>
      </div>

      {/* Validation Results */}
      <div className="space-y-3">
        {Object.entries(groupedResults).map(([category, results]) => {
          if (results.length === 0) return null;

          return (
            <div key={category}>
              {results.map((result) => {
                const config = statusConfig[result.status];

                return (
                  <div
                    key={result.guideline.id}
                    className={`rounded-2xl border ${config.borderColor} ${config.bgColor} p-4`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`text-xl ${config.color} flex-shrink-0`}>
                        {config.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-white">
                          {result.guideline.label}
                        </h4>
                        <p className="mt-1 text-xs text-slate-300">
                          {result.message}
                        </p>
                        {result.suggestion && (
                          <p className={`mt-2 text-xs font-medium ${config.color}`}>
                            💡 {result.suggestion}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Guidelines Info */}
      <details className="group">
        <summary className="cursor-pointer rounded-2xl border border-white/10 bg-slate-900/40 px-4 py-3 text-sm text-slate-300 transition hover:border-white/20 hover:bg-slate-900/60">
          <span className="font-medium">About OPR Terrain Guidelines</span>
        </summary>
        <div className="mt-3 space-y-3 rounded-2xl border border-white/10 bg-slate-900/40 p-4 text-xs text-slate-300">
          <p>
            These recommendations are based on the{' '}
            <strong className="text-white">OPR Age of Fantasy</strong> rulebook
            and competitive play best practices.
          </p>
          <p>
            Guidelines are suggestions, not strict rules. Adjust based on your
            army composition, mission objectives, and play group preferences.
          </p>
          <div className="space-y-2 pt-2">
            <p className="font-semibold text-white">Guideline Categories:</p>
            <ul className="space-y-1 pl-4">
              <li>
                <strong>Terrain Density:</strong> Overall table coverage for
                tactical movement
              </li>
              <li>
                <strong>LoS Blocking:</strong> Pieces that block line of sight for
                ranged combat balance
              </li>
              <li>
                <strong>Cover Balance:</strong> Mix of Soft and Hard Cover for
                unit positioning variety
              </li>
              <li>
                <strong>Deployment Clarity:</strong> Clear zones for army
                deployment
              </li>
              <li>
                <strong>Center Balance:</strong> Contested center terrain for
                objective play
              </li>
            </ul>
          </div>
        </div>
      </details>
    </div>
  );
}
