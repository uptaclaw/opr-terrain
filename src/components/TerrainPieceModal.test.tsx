import { fireEvent, render, screen } from '@testing-library/react';
import { TerrainPieceModal } from './TerrainPieceModal';
import { terrainCatalog } from '../data/terrainCatalog';
import type { TerrainTemplate } from '../types/layout';

describe('TerrainPieceModal', () => {
  it('reinitializes the form when reopened for a different record or create mode', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    const ruins = terrainCatalog.find((piece) => piece.id === 'ruins');
    const forest = terrainCatalog.find((piece) => piece.id === 'forest');

    expect(ruins).toBeDefined();
    expect(forest).toBeDefined();

    const { rerender } = render(
      <TerrainPieceModal
        isOpen
        onClose={onClose}
        onSave={onSave}
        initialData={ruins}
        mode="edit"
      />,
    );

    expect(screen.getByLabelText(/name/i)).toHaveValue('Ruins');
    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: 'Ruins Scratch' },
    });
    expect(screen.getByLabelText(/name/i)).toHaveValue('Ruins Scratch');

    rerender(
      <TerrainPieceModal
        isOpen={false}
        onClose={onClose}
        onSave={onSave}
        initialData={ruins}
        mode="edit"
      />,
    );
    rerender(
      <TerrainPieceModal
        isOpen
        onClose={onClose}
        onSave={onSave}
        initialData={forest}
        mode="edit"
      />,
    );

    expect(screen.getByLabelText(/name/i)).toHaveValue('Forest');
    expect(screen.getByLabelText(/width/i)).toHaveValue(9);
    expect(screen.getByLabelText(/height/i)).toHaveValue(7);

    rerender(
      <TerrainPieceModal
        isOpen={false}
        onClose={onClose}
        onSave={onSave}
        initialData={forest}
        mode="edit"
      />,
    );
    rerender(
      <TerrainPieceModal
        isOpen
        onClose={onClose}
        onSave={onSave}
        mode="create"
      />,
    );

    expect(screen.getByLabelText(/name/i)).toHaveValue('');
    expect(screen.getByLabelText(/width/i)).toHaveValue(6);
    expect(screen.getByLabelText(/height/i)).toHaveValue(6);
  });

  it('preserves existing traits and default rotation when saving edited pieces', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    const template: TerrainTemplate = {
      id: 'mystery-ridge',
      name: 'Mystery Ridge',
      shape: 'rect',
      fill: '#123456',
      stroke: '#abcdef',
      width: 8,
      height: 4,
      defaultRotation: 33,
      traits: [
        { id: 'open-los', label: 'Open line of sight', category: 'los', active: true },
        { id: 'passable', label: 'Passable obstacle', category: 'movement', active: true },
        { id: 'mystery-trait', label: 'Mystery trait', category: 'cover', active: false },
      ],
    };

    render(
      <TerrainPieceModal
        isOpen
        onClose={onClose}
        onSave={onSave}
        initialData={template}
        mode="edit"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Mystery Ridge',
        defaultRotation: 33,
        traits: expect.arrayContaining([
          expect.objectContaining({ id: 'open-los', active: true }),
          expect.objectContaining({ id: 'passable', active: true }),
          expect.objectContaining({ id: 'mystery-trait', active: false }),
        ]),
      }),
    );
    expect(onClose).toHaveBeenCalled();
  });
});
