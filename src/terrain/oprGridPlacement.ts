import { getDeploymentOrientation } from '../table/tableGeometry';
import { getTemplateById } from './catalog';
import { getShapeCollisionRadius } from './geometry';
import type { PlacementConfig, TerrainPiece, TerrainShape, TerrainShapeKind } from './types';

interface SlotCell {
  row: number;
  col: number;
}

interface SlotGroup {
  id: string;
  rowStart: number;
  colStart: number;
  rowSpan: number;
  colSpan: number;
  reserved: boolean;
}

interface GroupAssignment {
  templateId: string;
  shapeKind: TerrainShapeKind;
}

interface PairCandidate {
  cells: [SlotCell, SlotCell];
  orientation: 'horizontal' | 'vertical';
  quarter: number;
  score: number;
}

const REFERENCE_SLOT_WIDTH = 12;
const REFERENCE_SLOT_HEIGHT = 18;

const shuffle = <T,>(items: readonly T[], random: () => number): T[] => {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex]!, copy[index]!];
  }

  return copy;
};

const buildSlotGrid = (widthInches: number, heightInches: number, targetPieceCount: number) => {
  let columns = Math.max(2, Math.round(widthInches / REFERENCE_SLOT_WIDTH));
  let rows = Math.max(2, Math.round(heightInches / REFERENCE_SLOT_HEIGHT));

  while (
    columns * rows < targetPieceCount ||
    columns * rows - targetPieceCount > Math.floor((columns * rows) / 2)
  ) {
    const cellWidth = widthInches / columns;
    const cellHeight = heightInches / rows;

    if (cellWidth >= cellHeight) {
      columns += 1;
    } else {
      rows += 1;
    }
  }

  return {
    columns,
    rows,
    cellWidth: widthInches / columns,
    cellHeight: heightInches / rows,
  };
};

const buildReservedCells = (rows: number, columns: number, targetPieceCount: number): SlotCell[] => {
  const reservedCount = Math.min(rows, columns, targetPieceCount);
  const reserved: SlotCell[] = [];

  for (let index = 0; index < reservedCount; index += 1) {
    reserved.push({
      row: index,
      col: Math.round((index * (columns - 1)) / Math.max(reservedCount - 1, 1)),
    });
  }

  return reserved;
};

const getQuarterIndex = (cell: SlotCell, rows: number, columns: number) => {
  const column = cell.col < columns / 2 ? 0 : 1;
  const row = cell.row < rows / 2 ? 0 : 1;
  return row * 2 + column;
};

const getDeploymentCenters = (
  widthInches: number,
  heightInches: number,
  deploymentDepthInches: number,
) => {
  const orientation = getDeploymentOrientation(widthInches, heightInches);

  return orientation === 'vertical'
    ? [
        { x: deploymentDepthInches / 2, y: heightInches / 2 },
        { x: widthInches - deploymentDepthInches / 2, y: heightInches / 2 },
      ]
    : [
        { x: widthInches / 2, y: deploymentDepthInches / 2 },
        { x: widthInches / 2, y: heightInches - deploymentDepthInches / 2 },
      ];
};

const groupInterferesWithDeployment = (
  group: SlotGroup,
  cellWidth: number,
  cellHeight: number,
  widthInches: number,
  heightInches: number,
  deploymentDepthInches: number,
  gapInches: number,
  deploymentZoneSafety: boolean,
) => {
  if (!deploymentZoneSafety) {
    return false;
  }

  const centerX = cellWidth * (group.colStart + group.colSpan / 2);
  const centerY = cellHeight * (group.rowStart + group.rowSpan / 2);
  const shapeWidth = Math.max(1, group.colSpan * cellWidth - gapInches);
  const shapeHeight = Math.max(1, group.rowSpan * cellHeight - gapInches);
  const collisionRadius = Math.hypot(shapeWidth / 2, shapeHeight / 2);
  const requiredDistance = 4.5 + Math.min(collisionRadius + gapInches / 2, 4.5);

  return getDeploymentCenters(widthInches, heightInches, deploymentDepthInches).some(
    (center) => Math.hypot(center.x - centerX, center.y - centerY) < requiredDistance,
  );
};

const buildPairCandidate = (
  left: SlotCell,
  right: SlotCell,
  rows: number,
  columns: number,
  cellWidth: number,
  cellHeight: number,
  widthInches: number,
  heightInches: number,
  deploymentDepthInches: number,
  gapInches: number,
  placementConfig: PlacementConfig | undefined,
  selectedPairs: readonly PairCandidate[],
  random: () => number,
): PairCandidate | null => {
  const rowStart = Math.min(left.row, right.row);
  const colStart = Math.min(left.col, right.col);
  const rowSpan = Math.abs(left.row - right.row) + 1;
  const colSpan = Math.abs(left.col - right.col) + 1;
  const orientation = rowSpan > colSpan ? 'vertical' : 'horizontal';
  const group: SlotGroup = {
    id: `${rowStart}-${colStart}`,
    rowStart,
    colStart,
    rowSpan,
    colSpan,
    reserved: false,
  };

  if (
    groupInterferesWithDeployment(
      group,
      cellWidth,
      cellHeight,
      widthInches,
      heightInches,
      deploymentDepthInches,
      gapInches,
      placementConfig?.deploymentZoneSafety !== false,
    )
  ) {
    return null;
  }

  const quarter = getQuarterIndex(left, rows, columns);
  const sameQuarter = quarter === getQuarterIndex(right, rows, columns);
  const center = {
    x: (left.col + right.col + 1) * (cellWidth / 2),
    y: (left.row + right.row + 1) * (cellHeight / 2),
  };
  const distanceFromCenter = Math.hypot(center.x - widthInches / 2, center.y - heightInches / 2);
  const strategy = placementConfig?.strategy || 'random';
  let score = random();

  if (strategy === 'balanced-coverage') {
    const quarterPairs = selectedPairs.filter((candidate) => candidate.quarter === quarter).length;
    score += sameQuarter ? 12 : -6;
    score -= quarterPairs * 4;
  } else if (strategy === 'clustered-zones') {
    const clusterBonus = selectedPairs.reduce((bonus, candidate) => {
      const candidateCenter = {
        x: (candidate.cells[0].col + candidate.cells[1].col + 1) * (cellWidth / 2),
        y: (candidate.cells[0].row + candidate.cells[1].row + 1) * (cellHeight / 2),
      };
      return bonus + Math.max(0, 12 - Math.hypot(candidateCenter.x - center.x, candidateCenter.y - center.y));
    }, 0);
    score += clusterBonus;
  } else if (strategy === 'los-blocking-lanes') {
    const lanePreference =
      orientation === 'vertical'
        ? Math.max(0, columns / 2 - Math.abs(colStart + colSpan / 2 - columns / 2))
        : Math.max(0, rows / 2 - Math.abs(rowStart + rowSpan / 2 - rows / 2));
    score += lanePreference * 6;
  } else {
    score -= distanceFromCenter * 0.01;
  }

  return {
    cells: [left, right],
    orientation,
    quarter,
    score,
  };
};

const buildPairs = (
  rows: number,
  columns: number,
  cellWidth: number,
  cellHeight: number,
  widthInches: number,
  heightInches: number,
  deploymentDepthInches: number,
  targetPieceCount: number,
  gapInches: number,
  placementConfig: PlacementConfig | undefined,
  random: () => number,
) => {
  const reservedCells = buildReservedCells(rows, columns, targetPieceCount);
  const reservedKeys = new Set(reservedCells.map((cell) => `${cell.row}:${cell.col}`));
  const availableCells: SlotCell[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const key = `${row}:${column}`;
      if (!reservedKeys.has(key)) {
        availableCells.push({ row, col: column });
      }
    }
  }

  const pairCount = rows * columns - targetPieceCount;
  const usedKeys = new Set<string>();
  const pairs: PairCandidate[] = [];

  while (pairs.length < pairCount) {
    const candidates: PairCandidate[] = [];

    for (const cell of availableCells) {
      const cellKey = `${cell.row}:${cell.col}`;
      if (usedKeys.has(cellKey)) {
        continue;
      }

      const right: SlotCell = { row: cell.row, col: cell.col + 1 };
      if (
        right.col < columns &&
        !reservedKeys.has(`${right.row}:${right.col}`) &&
        !usedKeys.has(`${right.row}:${right.col}`)
      ) {
        const candidate = buildPairCandidate(
          cell,
          right,
          rows,
          columns,
          cellWidth,
          cellHeight,
          widthInches,
          heightInches,
          deploymentDepthInches,
          gapInches,
          placementConfig,
          pairs,
          random,
        );

        if (candidate) {
          candidates.push(candidate);
        }
      }

      const below: SlotCell = { row: cell.row + 1, col: cell.col };
      if (
        below.row < rows &&
        !reservedKeys.has(`${below.row}:${below.col}`) &&
        !usedKeys.has(`${below.row}:${below.col}`)
      ) {
        const candidate = buildPairCandidate(
          cell,
          below,
          rows,
          columns,
          cellWidth,
          cellHeight,
          widthInches,
          heightInches,
          deploymentDepthInches,
          gapInches,
          placementConfig,
          pairs,
          random,
        );

        if (candidate) {
          candidates.push(candidate);
        }
      }
    }

    if (candidates.length === 0) {
      return null;
    }

    const nextPair = shuffle(candidates, random).sort((left, right) => right.score - left.score)[0]!;
    usedKeys.add(`${nextPair.cells[0].row}:${nextPair.cells[0].col}`);
    usedKeys.add(`${nextPair.cells[1].row}:${nextPair.cells[1].col}`);
    pairs.push(nextPair);
  }

  return {
    reservedCells,
    pairs,
    usedKeys,
  };
};

const buildGroups = (
  rows: number,
  columns: number,
  reservedCells: readonly SlotCell[],
  pairs: readonly PairCandidate[],
  usedKeys: ReadonlySet<string>,
): SlotGroup[] => {
  const groups: SlotGroup[] = reservedCells.map((cell, index) => ({
    id: `reserved-${index}`,
    rowStart: cell.row,
    colStart: cell.col,
    rowSpan: 1,
    colSpan: 1,
    reserved: true,
  }));

  pairs.forEach((pair, index) => {
    const rowStart = Math.min(pair.cells[0].row, pair.cells[1].row);
    const colStart = Math.min(pair.cells[0].col, pair.cells[1].col);
    groups.push({
      id: `pair-${index}`,
      rowStart,
      colStart,
      rowSpan: Math.abs(pair.cells[0].row - pair.cells[1].row) + 1,
      colSpan: Math.abs(pair.cells[0].col - pair.cells[1].col) + 1,
      reserved: false,
    });
  });

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const key = `${row}:${column}`;
      if (usedKeys.has(key) || reservedCells.some((cell) => cell.row === row && cell.col === column)) {
        continue;
      }

      groups.push({
        id: `single-${row}-${column}`,
        rowStart: row,
        colStart: column,
        rowSpan: 1,
        colSpan: 1,
        reserved: false,
      });
    }
  }

  return groups.sort((left, right) => left.rowStart - right.rowStart || left.colStart - right.colStart);
};

const scalePolygonToBounds = (
  shape: TerrainShape & { kind: 'polygon' },
  targetWidth: number,
  targetHeight: number,
): TerrainShape => {
  const xs = shape.points.map((point) => point.x);
  const ys = shape.points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = Math.max(1e-6, maxX - minX);
  const height = Math.max(1e-6, maxY - minY);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  return {
    kind: 'polygon',
    points: shape.points.map((point) => ({
      x: ((point.x - centerX) / width) * targetWidth,
      y: ((point.y - centerY) / height) * targetHeight,
    })),
  };
};

const buildScaledShape = (
  templateId: string,
  shapeKind: TerrainShapeKind,
  targetWidth: number,
  targetHeight: number,
  random: () => number,
): TerrainShape => {
  const template = getTemplateById(templateId);
  const baseShape = template.buildShape(shapeKind, random);

  if (baseShape.kind === 'rectangle') {
    return {
      kind: 'rectangle',
      width: targetWidth,
      height: targetHeight,
    };
  }

  if (baseShape.kind === 'circle') {
    return {
      kind: 'circle',
      radius: Math.min(targetWidth, targetHeight) / 2,
    };
  }

  return scalePolygonToBounds(baseShape, targetWidth, targetHeight);
};

const selectAssignments = (groups: readonly SlotGroup[], random: () => number) => {
  const blockerTarget = Math.ceil(groups.length * 0.5);
  const assignments = new Map<string, GroupAssignment>();
  const blockers = new Set<string>();
  const danger = new Set<string>();

  const reservedBlockers = groups.filter((group) => group.reserved);
  reservedBlockers.forEach((group) => blockers.add(group.id));

  const additionalBlockersNeeded = Math.max(0, blockerTarget - blockers.size);
  const blockerCandidates = shuffle(
    groups.filter((group) => !blockers.has(group.id)),
    random,
  )
    .sort((left, right) => right.rowSpan * right.colSpan - left.rowSpan * left.colSpan)
    .slice(0, additionalBlockersNeeded);

  blockerCandidates.forEach((group) => blockers.add(group.id));

  const dangerCandidates = shuffle(
    groups.filter((group) => !blockers.has(group.id)),
    random,
  )
    .sort((left, right) => right.rowSpan + right.colSpan - (left.rowSpan + left.colSpan))
    .slice(0, 2);

  dangerCandidates.forEach((group) => danger.add(group.id));

  for (const group of groups) {
    if (danger.has(group.id)) {
      assignments.set(group.id, { templateId: 'marsh', shapeKind: 'rectangle' });
      continue;
    }

    if (blockers.has(group.id)) {
      assignments.set(group.id, { templateId: 'ruins', shapeKind: 'rectangle' });
      continue;
    }

    assignments.set(group.id, {
      templateId: random() > 0.5 ? 'wall' : 'hedge',
      shapeKind: 'rectangle',
    });
  }

  return assignments;
};

const createPieceFromGroup = (
  group: SlotGroup,
  assignment: GroupAssignment,
  index: number,
  cellWidth: number,
  cellHeight: number,
  gapInches: number,
  random: () => number,
): TerrainPiece => {
  const template = getTemplateById(assignment.templateId);
  const shapeWidth = Math.max(1, group.colSpan * cellWidth - gapInches);
  const shapeHeight = Math.max(1, group.rowSpan * cellHeight - gapInches);
  const shape = buildScaledShape(assignment.templateId, assignment.shapeKind, shapeWidth, shapeHeight, random);
  const x = cellWidth * (group.colStart + group.colSpan / 2);
  const y = cellHeight * (group.rowStart + group.rowSpan / 2);

  return {
    id: `terrain-${index + 1}-${Math.round(random() * 1_000_000_000)}`,
    templateId: template.id,
    name: template.name,
    color: template.color,
    traits: template.traits,
    x,
    y,
    rotation: 0,
    shape,
    collisionRadius: getShapeCollisionRadius(shape),
  };
};

export const generateOPRGridLayout = ({
  widthInches,
  heightInches,
  deploymentDepthInches,
  targetPieceCount,
  gapInches,
  placementConfig,
  random,
}: {
  widthInches: number;
  heightInches: number;
  deploymentDepthInches: number;
  targetPieceCount: number;
  gapInches: number;
  placementConfig?: PlacementConfig;
  random: () => number;
}): TerrainPiece[] | null => {
  const { columns, rows, cellWidth, cellHeight } = buildSlotGrid(widthInches, heightInches, targetPieceCount);
  const pairPlan = buildPairs(
    rows,
    columns,
    cellWidth,
    cellHeight,
    widthInches,
    heightInches,
    deploymentDepthInches,
    targetPieceCount,
    gapInches,
    placementConfig,
    random,
  );

  if (!pairPlan) {
    return null;
  }

  const groups = buildGroups(rows, columns, pairPlan.reservedCells, pairPlan.pairs, pairPlan.usedKeys);
  const assignments = selectAssignments(groups, random);

  return groups.map((group, index) =>
    createPieceFromGroup(group, assignments.get(group.id)!, index, cellWidth, cellHeight, gapInches, random),
  );
};
