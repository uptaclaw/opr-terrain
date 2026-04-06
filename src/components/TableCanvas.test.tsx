import { render, screen } from '@testing-library/react';
import { TableCanvas } from './TableCanvas';

describe('TableCanvas', () => {
  it('renders the default table labels and deployment zones', () => {
    render(<TableCanvas />);

    expect(screen.getByRole('img', { name: /game table canvas/i })).toBeInTheDocument();
    expect(screen.getByText('Width: 48"')).toBeInTheDocument();
    expect(screen.getByText('Height: 48"')).toBeInTheDocument();
    expect(screen.getByTestId('deployment-zone-left')).toBeInTheDocument();
    expect(screen.getByTestId('deployment-zone-right')).toBeInTheDocument();
  });

  it('keeps a responsive aspect ratio wrapper', () => {
    render(<TableCanvas widthInches={60} heightInches={44} />);

    expect(screen.getByTestId('table-canvas-frame')).toHaveStyle({
      aspectRatio: '71 / 55',
    });
  });
});
