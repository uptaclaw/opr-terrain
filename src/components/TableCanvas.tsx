import type { CSSProperties } from 'react';

export interface TableCanvasProps {
  widthInches?: number;
  heightInches?: number;
  deploymentDepthInches?: number;
  className?: string;
}

type DeploymentOrientation = 'horizontal' | 'vertical';

const SCENE_MARGIN = {
  top: 4,
  right: 4,
  bottom: 7,
  left: 7,
} as const;

const LABEL_COLOR = '#e2e8f0';
const AXIS_COLOR = '#94a3b8';
const TABLE_FILL = '#166534';
const TABLE_BORDER = '#f8fafc';
const DEPLOYMENT_FILL = '#38bdf8';
const GRID_MINOR = '#e2e8f0';
const GRID_MAJOR = '#cbd5e1';

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

const formatInches = (value: number) => `${value}\"`;

const formatTableMeasure = (value: number) => {
  if (value % 12 === 0) {
    return `${value / 12}'`;
  }

  return formatInches(value);
};

export const getDeploymentOrientation = (
  widthInches: number,
  heightInches: number,
): DeploymentOrientation => (widthInches >= heightInches ? 'vertical' : 'horizontal');

export function TableCanvas({
  widthInches = 48,
  heightInches = 48,
  deploymentDepthInches = 12,
  className = '',
}: TableCanvasProps) {
  const tableX = SCENE_MARGIN.left;
  const tableY = SCENE_MARGIN.top;
  const sceneWidth = SCENE_MARGIN.left + widthInches + SCENE_MARGIN.right;
  const sceneHeight = SCENE_MARGIN.top + heightInches + SCENE_MARGIN.bottom;
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
    maxHeight: 'calc(100vh - 12rem)',
    maxWidth: `min(100%, calc((100vh - 12rem) * ${ratio}))`,
  };

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
  const tableTitle = `${formatTableMeasure(widthInches)} × ${formatTableMeasure(heightInches)} table`;

  return (
    <div
      data-testid="table-canvas-frame"
      className={`mx-auto w-full ${className}`.trim()}
      style={frameStyle}
    >
      <svg
        className="h-full w-full"
        viewBox={`0 0 ${sceneWidth} ${sceneHeight}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Game table canvas"
      >
        <title>{tableTitle}</title>
        <desc>
          Responsive wargaming table canvas with 1-inch grid squares, dimension labels, and
          deployment zones shaded 12 inches from each short edge.
        </desc>

        <rect width={sceneWidth} height={sceneHeight} rx={1.5} fill="#020617" />

        <text
          x={sceneWidth / 2}
          y={2.25}
          fill={LABEL_COLOR}
          fontSize={1.6}
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
            fill={TABLE_FILL}
          />

          {zoneRects.map((zone) => (
            <rect
              key={zone.key}
              data-testid={`deployment-zone-${zone.key}`}
              x={zone.x}
              y={zone.y}
              width={zone.width}
              height={zone.height}
              fill={DEPLOYMENT_FILL}
              fillOpacity={0.18}
              stroke={DEPLOYMENT_FILL}
              strokeOpacity={0.4}
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
                stroke={isMajor ? GRID_MAJOR : GRID_MINOR}
                strokeOpacity={isMajor ? 0.28 : 0.14}
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
                stroke={isMajor ? GRID_MAJOR : GRID_MINOR}
                strokeOpacity={isMajor ? 0.28 : 0.14}
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
            stroke={TABLE_BORDER}
            strokeWidth={0.22}
            strokeOpacity={0.9}
          />
        </g>

        <g aria-label="x-axis">
          <line
            x1={tableX}
            y1={xAxisY}
            x2={tableX + widthInches}
            y2={xAxisY}
            stroke={AXIS_COLOR}
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
                  stroke={AXIS_COLOR}
                  strokeWidth={0.14}
                />
                <text
                  x={x}
                  y={xAxisY + 1.8}
                  fill={LABEL_COLOR}
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
            fill={LABEL_COLOR}
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
            stroke={AXIS_COLOR}
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
                  stroke={AXIS_COLOR}
                  strokeWidth={0.14}
                />
                <text
                  x={yAxisX - 0.8}
                  y={y + 0.35}
                  fill={LABEL_COLOR}
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
            fill={LABEL_COLOR}
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
