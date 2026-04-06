import type { CSSProperties, PointerEvent, Ref } from 'react';
import type { TerrainPiece } from '../types/layout';

export interface TableCanvasProps {
  widthInches?: number;
  heightInches?: number;
  deploymentDepthInches?: number;
  title?: string;
  pieces?: TerrainPiece[];
  selectedPieceId?: string | null;
  className?: string;
  cleanOutput?: boolean;
  svgRef?: Ref<SVGSVGElement>;
  onPiecePointerDown?: (pieceId: string, event: PointerEvent<SVGGElement>) => void;
  onPieceSelect?: (pieceId: string) => void;
}

type DeploymentOrientation = 'horizontal' | 'vertical';

export const SCENE_MARGIN = {
  top: 4,
  right: 4,
  bottom: 7,
  left: 7,
} as const;

const SCREEN_COLORS = {
  label: '#e2e8f0',
  axis: '#94a3b8',
  tableFill: '#166534',
  tableBorder: '#f8fafc',
  deploymentFill: '#38bdf8',
  gridMinor: '#e2e8f0',
  gridMajor: '#cbd5e1',
  background: '#020617',
  pieceText: '#f8fafc',
  selection: '#f8fafc',
} as const;

const CLEAN_COLORS = {
  label: '#0f172a',
  axis: '#475569',
  tableFill: '#e8f7ef',
  tableBorder: '#0f172a',
  deploymentFill: '#0ea5e9',
  gridMinor: '#cbd5e1',
  gridMajor: '#94a3b8',
  background: '#ffffff',
  pieceText: '#0f172a',
  selection: '#2563eb',
} as const;

const buildAxisTicks = (dimension: number) => {
  const ticks = new Set<number>([0, dimension]);
  const interval = dimension <= 24 ? 6 : 12;

  for (let value = 0; value <= dimension; value += interval) {
    ticks.add(value);
  }

  return [...ticks].sort((a, b) => a - b);
};

const buildGridMarks = (dimension: number) => {
  const marks = new Set<number>([0, dimension]);

  for (let value = 0; value <= Math.floor(dimension); value += 1) {
    marks.add(value);
  }

  return [...marks].sort((a, b) => a - b);
};

export const formatInches = (value: number) => `${value}\"`;

export const formatTableMeasure = (value: number) => {
  if (value % 12 === 0) {
    return `${value / 12}'`;
  }

  return formatInches(value);
};

export const getDeploymentOrientation = (
  widthInches: number,
  heightInches: number,
): DeploymentOrientation => (widthInches >= heightInches ? 'vertical' : 'horizontal');

export const getSceneSize = (widthInches: number, heightInches: number) => ({
  sceneWidth: SCENE_MARGIN.left + widthInches + SCENE_MARGIN.right,
  sceneHeight: SCENE_MARGIN.top + heightInches + SCENE_MARGIN.bottom,
});

const getPieceLabelSize = (piece: TerrainPiece) =>
  Math.max(0.7, Math.min(1.15, Math.min(piece.width, piece.height) * 0.16));

const getActiveTraitsSummary = (piece: TerrainPiece) =>
  piece.traits
    .filter((trait) => trait.active)
    .map((trait) => trait.label)
    .join(', ');

const renderPieceShape = (piece: TerrainPiece) => {
  if (piece.shape === 'ellipse') {
    return <ellipse cx={0} cy={0} rx={piece.width / 2} ry={piece.height / 2} />;
  }

  if (piece.shape === 'diamond') {
    return (
      <polygon
        points={`0,${-piece.height / 2} ${piece.width / 2},0 0,${piece.height / 2} ${-piece.width / 2},0`}
      />
    );
  }

  return <rect x={-piece.width / 2} y={-piece.height / 2} width={piece.width} height={piece.height} rx={0.75} />;
};

export function TableCanvas({
  widthInches = 48,
  heightInches = 48,
  deploymentDepthInches = 12,
  title,
  pieces = [],
  selectedPieceId,
  className = '',
  cleanOutput = false,
  svgRef,
  onPiecePointerDown,
  onPieceSelect,
}: TableCanvasProps) {
  const tableX = SCENE_MARGIN.left;
  const tableY = SCENE_MARGIN.top;
  const { sceneWidth, sceneHeight } = getSceneSize(widthInches, heightInches);
  const xAxisY = tableY + heightInches + 1.25;
  const yAxisX = tableX - 1.25;
  const deploymentOrientation = getDeploymentOrientation(widthInches, heightInches);
  const deploymentDepth = Math.min(
    deploymentDepthInches,
    deploymentOrientation === 'vertical' ? widthInches / 2 : heightInches / 2,
  );
  const ratio = sceneWidth / sceneHeight;
  const frameStyle: CSSProperties = {
    aspectRatio: `${sceneWidth} / ${sceneHeight}`,
    maxHeight: cleanOutput ? undefined : 'calc(100vh - 14rem)',
    maxWidth: cleanOutput ? '100%' : `min(100%, calc((100vh - 14rem) * ${ratio}))`,
  };

  const colors = cleanOutput ? CLEAN_COLORS : SCREEN_COLORS;
  const zoneRects =
    deploymentOrientation === 'vertical'
      ? [
          {
            key: 'left',
            x: tableX,
            y: tableY,
            width: deploymentDepth,
            height: heightInches,
          },
          {
            key: 'right',
            x: tableX + widthInches - deploymentDepth,
            y: tableY,
            width: deploymentDepth,
            height: heightInches,
          },
        ]
      : [
          {
            key: 'top',
            x: tableX,
            y: tableY,
            width: widthInches,
            height: deploymentDepth,
          },
          {
            key: 'bottom',
            x: tableX,
            y: tableY + heightInches - deploymentDepth,
            width: widthInches,
            height: deploymentDepth,
          },
        ];

  const xTicks = buildAxisTicks(widthInches);
  const yTicks = buildAxisTicks(heightInches);
  const xGridMarks = buildGridMarks(widthInches);
  const yGridMarks = buildGridMarks(heightInches);
  const tableTitle = title?.trim().length ? title : `${formatTableMeasure(widthInches)} × ${formatTableMeasure(heightInches)} table`;
  const terrainPieces = selectedPieceId
    ? [...pieces.filter((piece) => piece.id !== selectedPieceId), ...pieces.filter((piece) => piece.id === selectedPieceId)]
    : pieces;

  return (
    <div
      data-testid="table-canvas-frame"
      className={`mx-auto w-full ${className}`.trim()}
      style={frameStyle}
    >
      <svg
        ref={svgRef}
        className="h-full w-full"
        viewBox={`0 0 ${sceneWidth} ${sceneHeight}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Game table canvas"
      >
        <title>{tableTitle}</title>
        <desc>
          Responsive wargaming table canvas with 1-inch grid squares, dimension labels,
          deployment zones, and draggable terrain pieces.
        </desc>

        <rect width={sceneWidth} height={sceneHeight} rx={1.5} fill={colors.background} />

        <text
          x={sceneWidth / 2}
          y={2.1}
          fill={colors.label}
          fontSize={1.55}
          fontWeight={700}
          textAnchor="middle"
        >
          {tableTitle}
        </text>

        <g aria-hidden="true">
          <rect
            x={tableX}
            y={tableY}
            width={widthInches}
            height={heightInches}
            rx={0.6}
            fill={colors.tableFill}
          />

          {zoneRects.map((zone) => (
            <rect
              key={zone.key}
              data-testid={`deployment-zone-${zone.key}`}
              x={zone.x}
              y={zone.y}
              width={zone.width}
              height={zone.height}
              fill={colors.deploymentFill}
              fillOpacity={cleanOutput ? 0.12 : 0.18}
              stroke={colors.deploymentFill}
              strokeOpacity={cleanOutput ? 0.24 : 0.4}
              strokeWidth={0.18}
            />
          ))}

          {xGridMarks.map((value) => {
            const x = tableX + value;
            const isMajor = Number.isInteger(value) && value % 6 === 0;

            return (
              <line
                key={`x-grid-${value}`}
                x1={x}
                y1={tableY}
                x2={x}
                y2={tableY + heightInches}
                stroke={isMajor ? colors.gridMajor : colors.gridMinor}
                strokeOpacity={isMajor ? (cleanOutput ? 0.5 : 0.28) : cleanOutput ? 0.3 : 0.14}
                strokeWidth={isMajor ? 0.16 : 0.06}
              />
            );
          })}

          {yGridMarks.map((value) => {
            const y = tableY + value;
            const isMajor = Number.isInteger(value) && value % 6 === 0;

            return (
              <line
                key={`y-grid-${value}`}
                x1={tableX}
                y1={y}
                x2={tableX + widthInches}
                y2={y}
                stroke={isMajor ? colors.gridMajor : colors.gridMinor}
                strokeOpacity={isMajor ? (cleanOutput ? 0.5 : 0.28) : cleanOutput ? 0.3 : 0.14}
                strokeWidth={isMajor ? 0.16 : 0.06}
              />
            );
          })}

          <rect
            x={tableX}
            y={tableY}
            width={widthInches}
            height={heightInches}
            rx={0.6}
            fill="none"
            stroke={colors.tableBorder}
            strokeWidth={0.22}
            strokeOpacity={0.9}
          />
        </g>

        <g aria-label="terrain-pieces">
          {terrainPieces.map((piece) => {
            const pieceX = tableX + piece.x;
            const pieceY = tableY + heightInches - piece.y;
            const isSelected = piece.id === selectedPieceId;
            const activeTraitsSummary = getActiveTraitsSummary(piece);

            return (
              <g
                key={piece.id}
                transform={`translate(${pieceX} ${pieceY}) rotate(${piece.rotation})`}
                onPointerDown={
                  onPiecePointerDown
                    ? (event) => {
                        onPiecePointerDown(piece.id, event);
                      }
                    : undefined
                }
                onClick={
                  onPieceSelect
                    ? () => {
                        onPieceSelect(piece.id);
                      }
                    : undefined
                }
                style={onPiecePointerDown ? { cursor: cleanOutput ? 'default' : 'grab' } : undefined}
              >
                <title>
                  {piece.name}
                  {activeTraitsSummary ? ` — ${activeTraitsSummary}` : ''}
                </title>

                {isSelected && !cleanOutput ? (
                  <rect
                    x={-piece.width / 2 - 0.6}
                    y={-piece.height / 2 - 0.6}
                    width={piece.width + 1.2}
                    height={piece.height + 1.2}
                    rx={1}
                    fill="none"
                    stroke={colors.selection}
                    strokeDasharray="0.9 0.6"
                    strokeWidth={0.24}
                  />
                ) : null}

                <g fill={piece.fill} fillOpacity={cleanOutput ? 0.88 : 0.72} stroke={piece.stroke} strokeWidth={0.2}>
                  {renderPieceShape(piece)}
                </g>

                <text
                  x={0}
                  y={0.22}
                  fill={colors.pieceText}
                  fontSize={getPieceLabelSize(piece)}
                  fontWeight={700}
                  textAnchor="middle"
                  stroke={colors.background}
                  strokeWidth={0.08}
                  paintOrder="stroke"
                >
                  {piece.name}
                </text>
              </g>
            );
          })}
        </g>

        <g aria-label="x-axis">
          <line
            x1={tableX}
            y1={xAxisY}
            x2={tableX + widthInches}
            y2={xAxisY}
            stroke={colors.axis}
            strokeWidth={0.16}
          />

          {xTicks.map((value) => {
            const x = tableX + value;
            const textAnchor = value === 0 ? 'start' : value === widthInches ? 'end' : 'middle';

            return (
              <g key={`x-tick-${value}`}>
                <line
                  x1={x}
                  y1={xAxisY - 0.45}
                  x2={x}
                  y2={xAxisY + 0.45}
                  stroke={colors.axis}
                  strokeWidth={0.14}
                />
                <text
                  x={x}
                  y={xAxisY + 1.8}
                  fill={colors.label}
                  fontSize={1.15}
                  textAnchor={textAnchor}
                >
                  {formatInches(value)}
                </text>
              </g>
            );
          })}

          <text
            x={tableX + widthInches / 2}
            y={sceneHeight - 1}
            fill={colors.label}
            fontSize={1.35}
            fontWeight={600}
            textAnchor="middle"
          >
            Width: {formatInches(widthInches)}
          </text>
        </g>

        <g aria-label="y-axis">
          <line
            x1={yAxisX}
            y1={tableY}
            x2={yAxisX}
            y2={tableY + heightInches}
            stroke={colors.axis}
            strokeWidth={0.16}
          />

          {yTicks.map((value) => {
            const y = tableY + heightInches - value;

            return (
              <g key={`y-tick-${value}`}>
                <line
                  x1={yAxisX - 0.45}
                  y1={y}
                  x2={yAxisX + 0.45}
                  y2={y}
                  stroke={colors.axis}
                  strokeWidth={0.14}
                />
                <text
                  x={yAxisX - 0.8}
                  y={y + 0.35}
                  fill={colors.label}
                  fontSize={1.15}
                  textAnchor="end"
                >
                  {formatInches(value)}
                </text>
              </g>
            );
          })}

          <text
            transform={`translate(1.75 ${tableY + heightInches / 2}) rotate(-90)`}
            fill={colors.label}
            fontSize={1.35}
            fontWeight={600}
            textAnchor="middle"
          >
            Height: {formatInches(heightInches)}
          </text>
        </g>
      </svg>
    </div>
  );
}
