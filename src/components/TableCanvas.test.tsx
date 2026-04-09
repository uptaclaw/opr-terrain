import { render, screen } from '@testing-library/react';
import { getSceneSize, TableCanvas } from './TableCanvas';
import type { TerrainPiece } from '../terrain/types';

const samplePieces: TerrainPiece[] = [
  {
    id: 'forest-1',
    templateId: 'forest',
    name: 'Forest',
    color: '#2f855a',
    traits: ['Soft Cover', 'Difficult'],
    x: 12,
    y: 12,
    rotation: 0,
    collisionRadius: 4,
    shape: {
      kind: 'circle',
      radius: 4,
    },
  },
  {
    id: 'wall-1',
    templateId: 'wall',
    name: 'Wall',
    color: '#94a3b8',
    traits: ['Soft Cover'],
    x: 24,
    y: 24,
    rotation: 45,
    collisionRadius: 4.15,
    shape: {
      kind: 'rectangle',
      width: 8,
      height: 2,
    },
  },
  {
    id: 'outcrop-1',
    templateId: 'outcrop',
    name: 'Outcrop',
    color: '#64748b',
    traits: ['Hard Cover', 'Impassable', 'LoS Blocking'],
    x: 36,
    y: 36,
    rotation: 18,
    collisionRadius: 3.9,
    shape: {
      kind: 'polygon',
      points: [
        { x: -3, y: -2 },
        { x: -1, y: -3.2 },
        { x: 2.8, y: -1.8 },
        { x: 3.2, y: 0.9 },
        { x: 0.4, y: 3.3 },
        { x: -2.7, y: 2.2 },
      ],
    },
  },
];

describe('TableCanvas', () => {
  it('renders the default 6×4 table geometry and deployment zones on the long edges', () => {
    render(<TableCanvas />);

    const svg = screen.getByTestId('table-canvas-svg');
    const topZone = screen.getByTestId('deployment-zone-top');
    const bottomZone = screen.getByTestId('deployment-zone-bottom');
    const { sceneWidth, sceneHeight } = getSceneSize(72, 48);

    expect(screen.getByRole('img', { name: /game table canvas/i })).toBeInTheDocument();
    expect(screen.getAllByText("6' × 4' table").length).toBeGreaterThan(0);
    expect(screen.getByText('Width: 72"')).toBeInTheDocument();
    expect(screen.getByText('Height: 48"')).toBeInTheDocument();
    expect(svg).toHaveAttribute('viewBox', `0 0 ${sceneWidth} ${sceneHeight}`);
    expect(topZone).toHaveAttribute('width', '72');
    expect(topZone).toHaveAttribute('height', '12');
    expect(bottomZone).toHaveAttribute('width', '72');
    expect(bottomZone).toHaveAttribute('height', '12');
  });

  it('switches deployment zones to the left and right when the long edge is vertical', () => {
    render(<TableCanvas widthInches={48} heightInches={72} />);

    expect(screen.getByTestId('deployment-zone-left')).toBeInTheDocument();
    expect(screen.getByTestId('deployment-zone-right')).toBeInTheDocument();
    expect(screen.queryByTestId('deployment-zone-top')).not.toBeInTheDocument();
    expect(screen.queryByTestId('deployment-zone-bottom')).not.toBeInTheDocument();
  });

  it('keeps a responsive aspect ratio wrapper', () => {
    render(<TableCanvas widthInches={60} heightInches={44} />);

    expect(screen.getByTestId('table-canvas-frame')).toHaveStyle({
      aspectRatio: '71 / 55',
    });
  });

  it('renders terrain circles, rectangles, polygons, and trait labels at table scale', () => {
    const { container } = render(<TableCanvas terrainPieces={samplePieces} />);

    expect(screen.getAllByTestId('terrain-piece')).toHaveLength(3);
    expect(screen.getByText('Forest')).toBeInTheDocument();
    expect(screen.getByText('SC • Dif')).toBeInTheDocument();
    expect(screen.getByText('HC • Imp • LoS')).toBeInTheDocument();

    const circle = container.querySelector('[data-shape-kind="circle"]');
    const rectangle = container.querySelector('[data-shape-kind="rectangle"]');
    const polygon = container.querySelector('[data-shape-kind="polygon"]');

    expect(circle).toHaveAttribute('r', '4');
    expect(rectangle).toHaveAttribute('width', '8');
    expect(rectangle).toHaveAttribute('height', '2');
    expect(polygon).toHaveAttribute('points', '-3,-2 -1,-3.2 2.8,-1.8 3.2,0.9 0.4,3.3 -2.7,2.2');
  });
});
