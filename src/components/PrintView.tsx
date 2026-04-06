import { TableCanvas } from './TableCanvas';
import type { TerrainLayout } from '../terrain/types';

export interface PrintViewProps {
  layout: TerrainLayout;
  onClose: () => void;
}

export function PrintView({ layout, onClose }: PrintViewProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-white print:relative">
      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-slate-300 bg-white px-6 py-4">
        <h2 className="text-xl font-bold text-slate-900">Print Preview</h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            Print
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            Close
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            OPR Terrain Layout
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {layout.widthInches}" × {layout.heightInches}" table • {layout.pieces.length} terrain pieces
          </p>
        </div>

        <div className="mb-8 rounded-lg border border-slate-300 bg-slate-50 p-4">
          <TableCanvas
            widthInches={layout.widthInches}
            heightInches={layout.heightInches}
            deploymentDepthInches={layout.deploymentDepthInches}
            terrainPieces={layout.pieces}
          />
        </div>

        <div>
          <h2 className="mb-4 text-xl font-bold text-slate-900">Terrain Legend</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {layout.pieces.map((piece) => (
              <div
                key={piece.id}
                className="rounded-lg border border-slate-300 bg-white p-3"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="h-8 w-8 shrink-0 rounded"
                    style={{ backgroundColor: piece.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900">{piece.name}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {piece.traits.join(' • ')}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {piece.shape.kind === 'circle' && `${piece.shape.radius}" radius circle`}
                      {piece.shape.kind === 'rectangle' && `${piece.shape.width}" × ${piece.shape.height}" rectangle`}
                      {piece.shape.kind === 'polygon' && `${piece.shape.points.length}-point polygon`}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 border-t border-slate-300 pt-4 text-sm text-slate-500">
          <p>Generated with OPR Terrain Builder</p>
          <p className="mt-1">Printed on {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
}
