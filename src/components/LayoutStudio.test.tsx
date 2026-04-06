import { fireEvent, render, screen } from '@testing-library/react';
import { LayoutStudio } from './LayoutStudio';

describe('LayoutStudio', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(window.history.state, '', '/');
  });

  it('saves named layouts to localStorage and reloads them after remount', () => {
    const view = render(<LayoutStudio />);

    fireEvent.change(screen.getByLabelText(/saved layout name/i), {
      target: { value: 'Practice Match' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save current layout/i }));

    expect(screen.getByText('Practice Match')).toBeInTheDocument();

    view.unmount();
    render(<LayoutStudio />);

    expect(screen.getByText('Practice Match')).toBeInTheDocument();
  });

  it('renders a print legend with terrain piece names and active traits', () => {
    render(<LayoutStudio />);

    expect(screen.getByRole('heading', { name: /terrain legend/i })).toBeInTheDocument();
    expect(screen.getAllByText(/central ruins/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/heavy cover/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/print preview/i)).toBeInTheDocument();
  });
});
