import type { TerrainPiece } from '../types/layout';
import { getTerrainSummaryCategory, type TerrainSummaryCategoryId } from './terrainSummary';

const PRINT_LEGEND_TRAIT_ORDER: TerrainSummaryCategoryId[] = [
  'hard-cover',
  'soft-cover',
  'difficult',
  'dangerous',
  'impassable',
  'elevated',
  'los-blocking',
];

const PRINT_LEGEND_TRAIT_LABELS: Partial<Record<TerrainSummaryCategoryId, string>> = {
  'hard-cover': 'Cover',
  'soft-cover': 'Cover',
  difficult: 'Difficult',
  dangerous: 'Dangerous',
  impassable: 'Impassable',
  elevated: 'Elevated',
  'los-blocking': 'LoS Blocking',
};

export const getPrintLegendTraitLabels = (piece: TerrainPiece) => {
  const categories = new Set<TerrainSummaryCategoryId>();

  piece.traits.forEach((trait) => {
    if (!trait.active) {
      return;
    }

    const category = getTerrainSummaryCategory(trait);

    if (category) {
      categories.add(category);
    }
  });

  const labels = PRINT_LEGEND_TRAIT_ORDER.flatMap((category) => {
    if (!categories.has(category)) {
      return [];
    }

    const label = PRINT_LEGEND_TRAIT_LABELS[category];
    return label ? [label] : [];
  });

  return [...new Set(labels)];
};

export const getPrintLegendTraitText = (piece: TerrainPiece) => {
  const labels = getPrintLegendTraitLabels(piece);
  return labels.length > 0 ? labels.join(' • ') : 'No key traits';
};
