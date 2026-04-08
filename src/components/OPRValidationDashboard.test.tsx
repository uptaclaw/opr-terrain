import { render, screen } from '@testing-library/react';
import { OPRValidationDashboard } from './OPRValidationDashboard';
import type { TerrainPiece, TerrainTrait } from '../types/layout';

const createTrait = (overrides: Partial<TerrainTrait> = {}): TerrainTrait => ({
  id: 'trait',
  label: 'Trait',
  category: 'movement',
  active: true,
  ...overrides,
});

const createPiece = (id: string, traits: TerrainTrait[], overrides: Partial<TerrainPiece> = {}): TerrainPiece => ({
  id,
  templateId: 'custom',
  name: `Piece ${id}`,
  shape: 'rect',
  fill: '#475569',
  stroke: '#f8fafc',
  width: 6,
  height: 4,
  x: 12,
  y: 12,
  rotation: 0,
  traits,
  ...overrides,
});

const createGridPiece = (
  id: string,
  x: number,
  y: number,
  traits: TerrainTrait[] = [],
  overrides: Partial<TerrainPiece> = {}
): TerrainPiece => createPiece(id, traits, { x, y, ...overrides });

const createLoSBlockingTrait = () =>
  createTrait({ id: 'los-blocking', label: 'LoS Blocking', category: 'los' });

const createHardCoverTrait = () =>
  createTrait({ id: 'hard-cover', label: 'Hard Cover', category: 'cover' });

const createSoftCoverTrait = () =>
  createTrait({ id: 'soft-cover', label: 'Soft Cover', category: 'cover' });

const createDifficultTrait = () =>
  createTrait({ id: 'difficult', label: 'Difficult', category: 'movement' });

const createDangerousTrait = () =>
  createTrait({ id: 'dangerous', label: 'Dangerous', category: 'movement' });

const createPerfectLayoutPieces = (): TerrainPiece[] => {
  const columnPositions = [8, 24, 40];
  const rowPositions = [5, 17, 29, 41];
  let pieceIndex = 0;

  return rowPositions.flatMap((y) =>
    columnPositions.map((x) => {
      pieceIndex += 1;

      const traits: TerrainTrait[] = [createLoSBlockingTrait()];

      if (pieceIndex <= 4) {
        traits.push(pieceIndex % 2 === 0 ? createSoftCoverTrait() : createHardCoverTrait());
        traits.push(createDifficultTrait());
      }

      if (pieceIndex <= 2) {
        traits.push(createDangerousTrait());
      }

      return createGridPiece(`${pieceIndex}`, x, y, traits, { width: 10, height: 10 });
    })
  );
};

describe('OPRValidationDashboard', () => {
  it('renders the validation dashboard with all metrics', () => {
    const pieces = [
      createPiece('1', [createTrait({ id: 'los-blocking', label: 'LoS Blocking', category: 'los' })]),
      createPiece('2', [createTrait({ id: 'hard-cover', label: 'Hard Cover', category: 'cover' })]),
      createPiece('3', [createTrait({ id: 'difficult', label: 'Difficult', category: 'movement' })]),
      createPiece('4', [createTrait({ id: 'dangerous', label: 'Dangerous', category: 'movement' })]),
      createPiece('5', []),
      createPiece('6', []),
      createPiece('7', []),
      createPiece('8', []),
      createPiece('9', []),
      createPiece('10', []),
    ];

    render(<OPRValidationDashboard pieces={pieces} tableWidthInches={48} tableHeightInches={48} />);

    expect(screen.getByTestId('opr-validation-dashboard')).toBeInTheDocument();
    expect(screen.getByText('OPR Validation Dashboard')).toBeInTheDocument();
    
    // Check all 7 metric sections are rendered
    expect(screen.getByTestId('validation-metric-quantity')).toBeInTheDocument();
    expect(screen.getByTestId('validation-metric-coverage')).toBeInTheDocument();
    expect(screen.getByTestId('validation-metric-los-blocking')).toBeInTheDocument();
    expect(screen.getByTestId('validation-metric-cover')).toBeInTheDocument();
    expect(screen.getByTestId('validation-metric-difficult')).toBeInTheDocument();
    expect(screen.getByTestId('validation-metric-dangerous')).toBeInTheDocument();
    expect(screen.getByTestId('validation-metric-spacing')).toBeInTheDocument();
  });

  it('displays a perfect 7/7 result when every check passes', () => {
    render(
      <OPRValidationDashboard
        pieces={createPerfectLayoutPieces()}
        tableWidthInches={48}
        tableHeightInches={48}
      />
    );

    expect(screen.getByText('All checks passed')).toBeInTheDocument();
    expect(screen.getByText('7/7 passed')).toBeInTheDocument();
    expect(screen.getByTestId('validation-metric-spacing')).toHaveTextContent('Good spacing');
  });

  it('displays warning status when some checks fail', () => {
    const pieces = [
      createPiece('1', []),
      createPiece('2', []),
      createPiece('3', []),
    ];

    render(<OPRValidationDashboard pieces={pieces} tableWidthInches={48} tableHeightInches={48} />);

    // Should show warnings due to low piece count and missing traits
    expect(screen.getByText(/Some warnings|Issues detected/)).toBeInTheDocument();
  });

  it('displays suggestions when metrics do not meet requirements', () => {
    const pieces = [
      createPiece('1', []),
      createPiece('2', []),
      createPiece('3', []),
      createPiece('4', []),
      createPiece('5', []),
    ];

    render(<OPRValidationDashboard pieces={pieces} tableWidthInches={48} tableHeightInches={48} />);

    // Should have suggestions for improving the layout
    const suggestions = screen.getAllByText(/Add.*more piece/);
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it('handles empty terrain layout', () => {
    render(<OPRValidationDashboard pieces={[]} tableWidthInches={48} tableHeightInches={48} />);

    expect(screen.getByTestId('opr-validation-dashboard')).toBeInTheDocument();
    expect(screen.getByText('0/7 passed')).toBeInTheDocument();
  });

  it('displays OPR guidelines reference', () => {
    render(<OPRValidationDashboard pieces={[]} tableWidthInches={48} tableHeightInches={48} />);

    expect(screen.getByText('OPR Age of Fantasy Guidelines (Page 12)')).toBeInTheDocument();
    expect(screen.getByText(/10-15 terrain pieces/)).toBeInTheDocument();
    expect(screen.getByText(/≥50% table coverage/)).toBeInTheDocument();
    expect(screen.getByText(/≥50% should block line of sight/)).toBeInTheDocument();
    expect(screen.getByText(/≥33% should provide cover/)).toBeInTheDocument();
    expect(screen.getByText(/≥33% should be difficult terrain/)).toBeInTheDocument();
    expect(screen.getByText(/At least 2 pieces should be dangerous/)).toBeInTheDocument();
  });

  it('updates validation dynamically when pieces change', () => {
    const initialPieces = [
      createPiece('1', []),
      createPiece('2', []),
    ];

    const { rerender } = render(
      <OPRValidationDashboard pieces={initialPieces} tableWidthInches={48} tableHeightInches={48} />
    );

    expect(screen.getByTestId('validation-metric-quantity')).toHaveTextContent(/2 pieces/);

    const updatedPieces = [
      ...initialPieces,
      createPiece('3', [createTrait({ id: 'los-blocking', label: 'LoS Blocking', category: 'los' })]),
      createPiece('4', [createTrait({ id: 'hard-cover', label: 'Hard Cover', category: 'cover' })]),
      createPiece('5', [createTrait({ id: 'difficult', label: 'Difficult', category: 'movement' })]),
    ];

    rerender(<OPRValidationDashboard pieces={updatedPieces} tableWidthInches={48} tableHeightInches={48} />);

    expect(screen.getByTestId('validation-metric-quantity')).toHaveTextContent(/5 pieces/);
  });
});
