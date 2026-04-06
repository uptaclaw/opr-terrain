import { TableCanvas } from './components/TableCanvas';

function App() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-300/80">OPR Terrain</p>
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">
            Project scaffolding &amp; table canvas
          </h1>
          <p className="max-w-3xl text-sm text-slate-300 sm:text-base">
            Responsive SVG table canvas with 1-inch grid squares, dimension axes, and
            deployment zones.
          </p>
        </header>

        <section className="flex flex-1 items-center justify-center rounded-3xl border border-white/10 bg-slate-900/60 p-3 shadow-2xl shadow-cyan-950/30 sm:p-6">
          <TableCanvas />
        </section>
      </div>
    </main>
  );
}

export default App;
