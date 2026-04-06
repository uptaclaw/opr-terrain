import type { TerrainPiece, TerrainTrait } from '../types/layout';

export type TerrainSummaryCategoryId =
  | 'impassable'
  | 'hard-cover'
  | 'soft-cover'
  | 'difficult'
  | 'dangerous'
  | 'elevated'
  | 'los-blocking';

export interface TerrainSummaryDefinition {
  id: TerrainSummaryCategoryId;
  label: string;
  detail: string;
}

export interface TerrainSummaryStat extends TerrainSummaryDefinition {
  count: number;
  percentage: number;
}

export interface TerrainSummary {
  totalPieces: number;
  stats: TerrainSummaryStat[];
}

export const TERRAIN_SUMMARY_DEFINITIONS: TerrainSummaryDefinition[] = [
  {
    id: 'impassable',
    label: 'Impassable',
    detail: 'Units cannot move through it.',
  },
  {
    id: 'hard-cover',
    label: 'Hard Cover',
    detail: '+2 Defense when targeted through or in it.',
  },
  {
    id: 'soft-cover',
    label: 'Soft Cover',
    detail: '+1 Defense when targeted through or in it.',
  },
  {
    id: 'difficult',
    label: 'Difficult',
    detail: 'Movement through it counts double.',
  },
  {
    id: 'dangerous',
    label: 'Dangerous',
    detail: 'Moving through it requires a terrain test.',
  },
  {
    id: 'elevated',
    label: 'Elevated',
    detail: 'Units on top gain height advantage.',
  },
  {
    id: 'los-blocking',
    label: 'LoS Blocking',
    detail: 'Blocks or meaningfully obstructs line of sight.',
  },
];

const normalizeValue = (value: string) => value.trim().toLowerCase();

const includesAny = (value: string, snippets: string[]) => snippets.some((snippet) => value.includes(snippet));

export const getTerrainSummaryCategory = (trait: TerrainTrait): TerrainSummaryCategoryId | null => {
  const normalizedId = normalizeValue(trait.id);
  const normalizedLabel = normalizeValue(trait.label);

  if (normalizedId === 'impassable' || includesAny(normalizedLabel, ['impassable'])) {
    return 'impassable';
  }

  if (
    includesAny(normalizedId, ['hard-cover', 'heavy-cover']) ||
    includesAny(normalizedLabel, ['hard cover', 'heavy cover'])
  ) {
    return 'hard-cover';
  }

  if (
    includesAny(normalizedId, ['soft-cover', 'light-cover']) ||
    includesAny(normalizedLabel, ['soft cover', 'light cover'])
  ) {
    return 'soft-cover';
  }

  if (
    includesAny(normalizedId, ['difficult', 'difficult-ground', 'rough-ground']) ||
    includesAny(normalizedLabel, ['difficult', 'rough ground'])
  ) {
    return 'difficult';
  }

  if (normalizedId === 'dangerous' || includesAny(normalizedLabel, ['dangerous'])) {
    return 'dangerous';
  }

  if (normalizedId === 'elevated' || includesAny(normalizedLabel, ['elevated'])) {
    return 'elevated';
  }

  if (
    includesAny(normalizedId, ['los-blocking', 'blocks-los', 'partial-los', 'obscuring']) ||
    ((normalizedLabel.includes('line of sight') || normalizedLabel.includes('los')) &&
      !normalizedLabel.includes('open'))
  ) {
    return 'los-blocking';
  }

  return null;
};

export const calculateTerrainSummary = (pieces: TerrainPiece[]): TerrainSummary => {
  const pieceIdsByCategory = new Map<TerrainSummaryCategoryId, Set<string>>(
    TERRAIN_SUMMARY_DEFINITIONS.map((definition) => [definition.id, new Set<string>()]),
  );

  pieces.forEach((piece) => {
    const categoriesForPiece = new Set<TerrainSummaryCategoryId>();

    piece.traits.forEach((trait) => {
      if (!trait.active) {
        return;
      }

      const category = getTerrainSummaryCategory(trait);

      if (category) {
        categoriesForPiece.add(category);
      }
    });

    categoriesForPiece.forEach((category) => {
      pieceIdsByCategory.get(category)?.add(piece.id);
    });
  });

  const totalPieces = pieces.length;

  return {
    totalPieces,
    stats: TERRAIN_SUMMARY_DEFINITIONS.map((definition) => {
      const count = pieceIdsByCategory.get(definition.id)?.size ?? 0;

      return {
        ...definition,
        count,
        percentage: totalPieces === 0 ? 0 : Math.round((count / totalPieces) * 100),
      };
    }),
  };
};
