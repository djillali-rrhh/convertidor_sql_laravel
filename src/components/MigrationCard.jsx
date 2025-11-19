import { Eye, EyeOff, Copy, Check, Trash2 } from 'lucide-react';

export default function MigrationCard({
  migration,
  expandedId,
  setExpandedId,
  copiedId,
  handleCopy,
  handleDelete,
  highlightText,
  searchTerm
}) {
  return (
    <div className="bg-slate-950/80 rounded-lg p-3 border border-slate-700/50 hover:border-blue-700/50 transition-all group">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
            {highlightText(migration.tableName, searchTerm)}
          </span>
          <p className="text-xs text-slate-500 mt-0.5">create_{migration.tableName}_table.php</p>
        </div>
        
        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setExpandedId(expandedId === migration.id ? null : migration.id)}
            className="bg-slate-700 hover:bg-slate-600 text-white p-1.5 rounded text-xs transition-all"
            title={expandedId === migration.id ? "Contraer" : "Expandir"}
          >
            {expandedId === migration.id ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </button>
          
          <button
            onClick={() => handleCopy(migration)}
            className="bg-blue-700 hover:bg-blue-600 text-white p-1.5 rounded text-xs transition-all"
            title="Copiar código"
          >
            {copiedId === migration.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </button>
          
          <button
            onClick={() => handleDelete(migration.id)}
            className="bg-red-700 hover:bg-red-600 text-white p-1.5 rounded text-xs transition-all"
            title="Eliminar"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
      
      <pre className={`text-yellow-300 text-xs overflow-x-auto whitespace-pre-wrap ${expandedId === migration.id ? '' : 'max-h-24 overflow-hidden'}`}>
        <code>{highlightText(expandedId === migration.id ? migration.fullMigration : migration.code, searchTerm)}</code>
      </pre>
      
      {copiedId === migration.id && (
        <p className="text-green-400 text-xs mt-2 flex items-center gap-1">
          <Check className="w-3 h-3" /> Código copiado al portapapeles
        </p>
      )}
    </div>
  );
}
