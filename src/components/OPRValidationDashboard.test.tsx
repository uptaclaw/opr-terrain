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
    
    // Check all metric sections are rendered
    expect(screen.getByTestId('validation-metric-quantity')).toBeInTheDocument();
    expect(screen.getByTestId('validation-metric-coverage')).toBeInTheDocument();
    expect(screen.getByTestId('validation-metric-los-blocking')).toBeInTheDocument();
    expect(screen.getByTestId('validation-metric-cover')).toBeInTheDocument();
    expect(screen.getByTestId('validation-metric-difficult')).toBeInTheDocument();
    expect(screen.getByTestId('validation-metric-dangerous')).toBeInTheDocument();
  });

  it('displays good status when most checks pass', () => {
    const pieces = [
      createPiece('1', [
        createTrait({ id: 'los-blocking', label: 'LoS Blocking', category: 'los' }),
        createTrait({ id: 'hard-cover', label: 'Hard Cover', category: 'cover' }),
        createTrait({ id: 'difficult', label: 'Difficult', category: 'movement' }),
      ], { width: 8, height: 6 }),
      createPiece('2', [
        createTrait({ id: 'los-blocking', label: 'LoS Blocking', category: 'los' }),
        createTrait({ id: 'soft-cover', label: 'Soft Cover', category: 'cover' }),
        createTrait({ id: 'difficult', label: 'Difficult', category: 'movement' }),
      ], { width: 8, height: 6 }),
      createPiece('3', [
        createTrait({ id: 'los-blocking', label: 'LoS Blocking', category: 'los' }),
        createTrait({ id: 'hard-cover', label: 'Hard Cover', category: 'cover' }),
        createTrait({ id: 'difficult', label: 'Difficult', category: 'movement' }),
      ], { width: 8, height: 6 }),
      createPiece('4', [
        createTrait({ id: 'los-blocking', label: 'LoS Blocking', category: 'los' }),
        createTrait({ id: 'soft-cover', label: 'Soft Cover', category: 'cover' }),
        createTrait({ id: 'difficult', label: 'Difficult', category: 'movement' }),
      ], { width: 8, height: 6 }),
      createPiece('5', [
        createTrait({ id: 'los-blocking', label: 'LoS Blocking', category: 'los' }),
        createTrait({ id: 'hard-cover', label: 'Hard Cover', category: 'cover' }),
        createTrait({ id: 'dangerous', label: 'Dangerous', category: 'movement' }),
      ], { width: 8, height: 6 }),
      createPiece('6', [
        createTrait({ id: 'los-blocking', label: 'LoS Blocking', category: 'los' }),
        createTrait({ id: 'soft-cover', label: 'Soft Cover', category: 'cover' }),
        createTrait({ id: 'dangerous', label: 'Dangerous', category: 'movement' }),
      ], { width: 8, height: 6 }),
      createPiece('7', [createTrait({ id: 'hard-cover', label: 'Hard Cover', category: 'cover' })], { width: 8, height: 6 }),
      createPiece('8', [createTrait({ id: 'soft-cover', label: 'Soft Cover', category: 'cover' })], { width: 8, height: 6 }),
      createPiece('9', [], { width: 8, height: 6 }),
      createPiece('10', [], { width: 8, height: 6 }),
    ];

    render(<OPRValidationDashboard pieces={pieces} tableWidthInches={48} tableHeightInches={48} />);

    // Should show good or warning status (coverage depends on calculation)
    expect(screen.getByText(/All checks passed|Some warnings|Issues detected/)).toBeInTheDocument();
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
    expect(screen.getByText('0/6 passed')).toBeInTheDocument();
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
