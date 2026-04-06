import type {
  CSSProperties,
  DragEvent as ReactDragEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  Ref,
} from 'react';
import { getDeploymentOrientation } from '../table/tableGeometry';
import { TERRAIN_TRAIT_SHORT_LABELS, type TerrainPiece as EditorTerrainPiece } from '../terrain/types';
import type { TerrainPiece as LayoutTerrainPiece } from '../types/layout';

export { getDeploymentOrientation } from '../table/tableGeometry';

export interface TableCanvasProps {
  widthInches?: number;
  heightInches?: number;
  deploymentDepthInches?: number;
  title?: string;
  pieces?: LayoutTerrainPiece[];
  terrainPieces?: EditorTerrainPiece[];
  selectedPieceId?: string | null;
  className?: string;
  cleanOutput?: boolean;
  svgRef?: Ref<SVGSVGElement>;
  draggingPieceId?: string | null;
  libraryDragActive?: boolean;
  onCanvasMouseDown?: (event: ReactMouseEvent<SVGSVGElement>) => void;
  onCanvasDragOver?: (event: ReactDragEvent<HTMLDivElement>) => void;
  onCanvasDrop?: (event: ReactDragEvent<HTMLDivElement>) => void;
  onPieceMouseDown?: (pieceId: string, event: ReactMouseEvent<SVGGElement>) => void;
  onPieceContextMenu?: (pieceId: string, event: ReactMouseEvent<SVGGElement>) => void;
  onRotateHandleMouseDown?: (pieceId: string, event: ReactMouseEvent<SVGGElement>) => void;
  onPiecePointerDown?: (pieceId: string, event: ReactPointerEvent<SVGGElement>) => void;
  onPieceSelect?: (pieceId: string) => void;
}

export const TABLE_SCENE_MARGIN = {
  top: 4,
  right: 4,
  bottom: 7,
  left: 7,
} as const;

export const SCENE_MARGIN = TABLE_SCENE_MARGIN;

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

const TERRAIN_STROKE = '#e2e8f0';
const TERRAIN_LABEL_OUTLINE = '#020617';
const SELECTION_STROKE = '#22d3ee';
const DRAGGING_STROKE = '#f8fafc';

interface EditorGeometryStyle {
  fill: string;
  fillOpacity: number;
  stroke: string;
  strokeWidth: number;
  strokeOpacity: number;
  strokeDasharray?: string;
  pointerEvents?: 'none' | 'all';
}

interface EditorGeometryInteractionProps {
  dataTestId?: string;
  dataPieceId?: string;
  onMouseDown?: (event: ReactMouseEvent<SVGElement>) => void;
  onContextMenu?: (event: ReactMouseEvent<SVGElement>) => void;
}

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

export const getSceneSize = (widthInches: number, heightInches: number) => ({
  sceneWidth: TABLE_SCENE_MARGIN.left + widthInches + TABLE_SCENE_MARGIN.right,
  sceneHeight: TABLE_SCENE_MARGIN.top + heightInches + TABLE_SCENE_MARGIN.bottom,
});

const renderEditorPieceGeometry = (
  piece: EditorTerrainPiece,
  centerX: number,
  centerY: number,
  style: EditorGeometryStyle,
  dataShapeKind?: EditorTerrainPiece['shape']['kind'],
  interactionProps?: EditorGeometryInteractionProps,
) => {
  if (piece.shape.kind === 'circle') {
    return (
      <circle
        data-testid={interactionProps?.dataTestId}
        data-piece-id={interactionProps?.dataPieceId}
        data-shape-kind={dataShapeKind}
        cx={centerX}
        cy={centerY}
        r={piece.shape.radius}
        fill={style.fill}
        fillOpacity={style.fillOpacity}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        strokeOpacity={style.strokeOpacity}
        strokeDasharray={style.strokeDasharray}
        pointerEvents={style.pointerEvents}
        onMouseDown={interactionProps?.onMouseDown}
        onContextMenu={interactionProps?.onContextMenu}
      />
    );
  }

  if (piece.shape.kind === 'rectangle') {
    return (
      <rect
        data-testid={interactionProps?.dataTestId}
        data-piece-id={interactionProps?.dataPieceId}
        data-shape-kind={dataShapeKind}
        x={centerX - piece.shape.width / 2}
        y={centerY - piece.shape.height / 2}
        width={piece.shape.width}
        height={piece.shape.height}
        rx={0.35}
        transform={`rotate(${piece.rotation} ${centerX} ${centerY})`}
        fill={style.fill}
        fillOpacity={style.fillOpacity}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        strokeOpacity={style.strokeOpacity}
        strokeDasharray={style.strokeDasharray}
        pointerEvents={style.pointerEvents}
        onMouseDown={interactionProps?.onMouseDown}
        onContextMenu={interactionProps?.onContextMenu}
      />
    );
  }

  const points = piece.shape.points.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <polygon
      data-testid={interactionProps?.dataTestId}
      data-piece-id={interactionProps?.dataPieceId}
      data-shape-kind={dataShapeKind}
      points={points}
      transform={`translate(${centerX} ${centerY}) rotate(${piece.rotation})`}
      fill={style.fill}
      fillOpacity={style.fillOpacity}
      stroke={style.stroke}
      strokeWidth={style.strokeWidth}
      strokeOpacity={style.strokeOpacity}
      strokeDasharray={style.strokeDasharray}
      pointerEvents={style.pointerEvents}
      onMouseDown={interactionProps?.onMouseDown}
      onContextMenu={interactionProps?.onContextMenu}
    />
  );
};

const renderEditorTerrainLabel = (piece: EditorTerrainPiece, centerX: number, centerY: number) => {
  const traitBadges = piece.traits.map((trait) => TERRAIN_TRAIT_SHORT_LABELS[trait]).join(' • ');

  return (
    <text
      x={centerX}
      y={centerY}
      fill="#f8fafc"
      fontSize={0.95}
      fontWeight={700}
      textAnchor="middle"
      dominantBaseline="middle"
      paintOrder="stroke"
      stroke={TERRAIN_LABEL_OUTLINE}
      strokeWidth={0.22}
      strokeLinejoin="round"
      pointerEvents="none"
    >
      <tspan x={centerX} dy="-0.45em">
        {piece.name}
      </tspan>
      <tspan x={centerX} dy="1.2em" fontSize={0.72} fontWeight={600}>
        {traitBadges}
      </tspan>
    </text>
  );
};

const getLayoutPieceLabelSize = (piece: LayoutTerrainPiece) =>
  Math.max(0.7, Math.min(1.15, Math.min(piece.width, piece.height) * 0.16));

const getLayoutPieceActiveTraitsSummary = (piece: LayoutTerrainPiece) =>
  piece.traits
    .filter((trait) => trait.active)
    .map((trait) => trait.label)
    .join(', ');

const renderLayoutPieceShape = (piece: LayoutTerrainPiece) => {
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

  return (
    <rect
      x={-piece.width / 2}
      y={-piece.height / 2}
      width={piece.width}
      height={piece.height}
      rx={0.75}
    />
  );
};

export function TableCanvas({
  widthInches = 48,
  heightInches = 72,
  deploymentDepthInches = 12,
  title,
  pieces,
  terrainPieces,
  selectedPieceId = null,
  className = '',
  cleanOutput = false,
  svgRef,
  draggingPieceId = null,
  libraryDragActive = false,
  onCanvasMouseDown,
  onCanvasDragOver,
  onCanvasDrop,
  onPieceMouseDown,
  onPieceContextMenu,
  onRotateHandleMouseDown,
  onPiecePointerDown,
  onPieceSelect,
}: TableCanvasProps) {
  const editorMode = pieces === undefined && terrainPieces !== undefined;
  const tableX = TABLE_SCENE_MARGIN.left;
  const tableY = TABLE_SCENE_MARGIN.top;
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
  const defaultTitle = `${formatTableMeasure(widthInches)} × ${formatTableMeasure(heightInches)} table`;
  const tableTitle = title?.trim().length ? title : defaultTitle;
  const orderedLayoutPieces = selectedPieceId
    ? [
        ...(pieces ?? []).filter((piece) => piece.id !== selectedPieceId),
        ...(pieces ?? []).filter((piece) => piece.id === selectedPieceId),
      ]
    : (pieces ?? []);
  const selectedEditorPiece = (terrainPieces ?? []).find((piece) => piece.id === selectedPieceId) ?? null;

  return (
    <div
      data-testid="table-canvas-frame"
      className={`mx-auto w-full ${className}`.trim()}
      style={frameStyle}
    >
      <div
        data-testid="table-canvas-dropzone"
        className="h-full w-full"
        onDragOver={onCanvasDragOver}
        onDrop={onCanvasDrop}
      >
        <svg
          ref={svgRef}
          data-testid="table-canvas-svg"
          className="h-full w-full"
          viewBox={`0 0 ${sceneWidth} ${sceneHeight}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Game table canvas"
          onMouseDown={onCanvasMouseDown}
        >
          <title>{tableTitle}</title>
          <desc>
            Responsive wargaming table canvas with a 1-inch grid, deployment zones, and terrain
            pieces positioned to scale.
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
          </g>

          {editorMode
            ? (terrainPieces ?? []).map((piece) => {
                const centerX = tableX + piece.x;
                const centerY = tableY + piece.y;
                const isSelected = piece.id === selectedPieceId;
                const isDragging = piece.id === draggingPieceId;
                const outlineStroke = isDragging ? DRAGGING_STROKE : SELECTION_STROKE;

                const handlePieceMouseDown = (event: ReactMouseEvent<SVGElement>) => {
                  event.stopPropagation();
                  onPieceMouseDown?.(piece.id, event as unknown as ReactMouseEvent<SVGGElement>);
                };

                const handlePieceContextMenu = (event: ReactMouseEvent<SVGElement>) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onPieceContextMenu?.(piece.id, event as unknown as ReactMouseEvent<SVGGElement>);
                };

                return (
                  <g
                    key={piece.id}
                    data-testid="terrain-piece"
                    data-piece-id={piece.id}
                    data-piece-x={piece.x}
                    data-piece-y={piece.y}
                    data-piece-rotation={piece.rotation}
                    style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                  >
                    <title>{`${piece.name}: ${piece.traits.join(', ')}`}</title>

                    {renderEditorPieceGeometry(
                      piece,
                      centerX,
                      centerY,
                      {
                        fill: '#ffffff',
                        fillOpacity: 0,
                        stroke: 'none',
                        strokeWidth: 0,
                        strokeOpacity: 0,
                        pointerEvents: 'all',
                      },
                      piece.shape.kind,
                      {
                        dataTestId: 'terrain-piece-hit-target',
                        dataPieceId: piece.id,
                        onMouseDown: handlePieceMouseDown,
                        onContextMenu: handlePieceContextMenu,
                      },
                    )}

                    {isSelected
                      ? renderEditorPieceGeometry(piece, centerX, centerY, {
                          fill: 'none',
                          fillOpacity: 1,
                          stroke: outlineStroke,
                          strokeWidth: 0.45,
                          strokeOpacity: 0.95,
                          strokeDasharray: isDragging ? '0.9 0.6' : undefined,
                          pointerEvents: 'none',
                        })
                      : null}

                    {renderEditorPieceGeometry(
                      piece,
                      centerX,
                      centerY,
                      {
                        fill: piece.color,
                        fillOpacity: 0.8,
                        stroke: TERRAIN_STROKE,
                        strokeWidth: 0.18,
                        strokeOpacity: 0.85,
                        pointerEvents: 'none',
                      },
                      piece.shape.kind,
                    )}
                    {renderEditorTerrainLabel(piece, centerX, centerY)}
                  </g>
                );
              })
            : orderedLayoutPieces.map((piece) => {
                const pieceX = tableX + piece.x;
                const pieceY = tableY + heightInches - piece.y;
                const isSelected = piece.id === selectedPieceId;
                const activeTraitsSummary = getLayoutPieceActiveTraitsSummary(piece);

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

                    <g
                      fill={piece.fill}
                      fillOpacity={cleanOutput ? 0.88 : 0.72}
                      stroke={piece.stroke}
                      strokeWidth={0.2}
                    >
                      {renderLayoutPieceShape(piece)}
                    </g>

                    <text
                      x={0}
                      y={0.22}
                      fill={colors.pieceText}
                      fontSize={getLayoutPieceLabelSize(piece)}
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

          {editorMode && selectedEditorPiece && selectedEditorPiece.shape.kind !== 'circle' ? (
            (() => {
              const centerX = tableX + selectedEditorPiece.x;
              const centerY = tableY + selectedEditorPiece.y;
              const handleX = centerX;
              const handleY = Math.max(tableY + 1.2, centerY - selectedEditorPiece.collisionRadius - 1.7);

              return (
                <g>
                  <line
                    x1={centerX}
                    y1={centerY - selectedEditorPiece.collisionRadius * 0.75}
                    x2={handleX}
                    y2={handleY + 0.55}
                    stroke={SELECTION_STROKE}
                    strokeOpacity={0.8}
                    strokeWidth={0.18}
                    pointerEvents="none"
                  />
                  <g
                    data-testid="rotation-handle"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onRotateHandleMouseDown?.(
                        selectedEditorPiece.id,
                        event as unknown as ReactMouseEvent<SVGGElement>,
                      );
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle
                      cx={handleX}
                      cy={handleY}
                      r={0.95}
                      fill="#0f172a"
                      stroke={SELECTION_STROKE}
                      strokeWidth={0.25}
                    />
                    <text
                      x={handleX}
                      y={handleY + 0.05}
                      fill="#cffafe"
                      fontSize={1.1}
                      fontWeight={700}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      pointerEvents="none"
                    >
                      ↻
                    </text>
                  </g>
                </g>
              );
            })()
          ) : null}

          {editorMode && libraryDragActive ? (
            <g pointerEvents="none">
              <rect
                x={tableX}
                y={tableY}
                width={widthInches}
                height={heightInches}
                rx={0.6}
                fill={SELECTION_STROKE}
                fillOpacity={0.08}
                stroke={SELECTION_STROKE}
                strokeWidth={0.22}
                strokeDasharray="1 0.7"
                strokeOpacity={0.8}
              />
              <text
                x={tableX + widthInches / 2}
                y={tableY + heightInches / 2}
                fill="#cffafe"
                fontSize={1.25}
                fontWeight={700}
                textAnchor="middle"
              >
                Drop terrain here to place it
              </text>
            </g>
          ) : null}

          <g aria-hidden="true">
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
                  <text x={x} y={xAxisY + 1.8} fill={colors.label} fontSize={1.15} textAnchor={textAnchor}>
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
                  <text x={yAxisX - 0.8} y={y + 0.35} fill={colors.label} fontSize={1.15} textAnchor="end">
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
    </div>
  );
}
