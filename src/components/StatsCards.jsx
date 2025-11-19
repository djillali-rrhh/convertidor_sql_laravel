import { CheckCircle2 } from 'lucide-react';

export default function StatsCards({ migrations, sqlInput }) {
  if (migrations.length === 0) return null;

  return (
    <div className="grid grid-cols-4 gap-3 mb-4">
      <div className="bg-blue-900/30 backdrop-blur rounded-lg p-3 border border-blue-800/40">
        <p className="text-blue-300 text-xs uppercase tracking-wide mb-0.5">Migraciones</p>
        <p className="text-white text-xl font-bold">{migrations.length}</p>
      </div>
      <div className="bg-green-900/30 backdrop-blur rounded-lg p-3 border border-green-800/40">
        <p className="text-green-300 text-xs uppercase tracking-wide mb-0.5">Tablas</p>
        <p className="text-white text-xl font-bold">{migrations.length}</p>
      </div>
      <div className="bg-slate-800/50 backdrop-blur rounded-lg p-3 border border-slate-700/40">
        <p className="text-slate-300 text-xs uppercase tracking-wide mb-0.5">Líneas SQL</p>
        <p className="text-white text-xl font-bold">{sqlInput.split('\n').length}</p>
      </div>
      <div className="bg-slate-800/50 backdrop-blur rounded-lg p-3 border border-slate-700/40">
        <p className="text-slate-300 text-xs uppercase tracking-wide mb-0.5">Estado</p>
        <p className="text-green-400 text-xs font-semibold flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Listo
        </p>
      </div>
    </div>
  );
}
