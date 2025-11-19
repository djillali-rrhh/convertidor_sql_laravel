import { Database } from 'lucide-react';

const databases = [
  { 
    id: 'mysql', 
    name: 'MySQL', 
    color: 'from-orange-600 to-orange-800',
    hoverColor: 'hover:from-orange-700 hover:to-orange-900',
    borderColor: 'border-orange-500/50',
    textColor: 'text-orange-400'
  },
  { 
    id: 'sqlserver', 
    name: 'SQL Server', 
    color: 'from-blue-600 to-blue-800',
    hoverColor: 'hover:from-blue-700 hover:to-blue-900',
    borderColor: 'border-blue-500/50',
    textColor: 'text-blue-400'
  },
  { 
    id: 'postgresql', 
    name: 'PostgreSQL', 
    color: 'from-indigo-600 to-indigo-800',
    hoverColor: 'hover:from-indigo-700 hover:to-indigo-900',
    borderColor: 'border-indigo-500/50',
    textColor: 'text-indigo-400'
  }
];

export default function DatabaseSelector({ selectedDb, onSelectDb }) {
  return (
    <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 mb-6 border border-slate-700/50 shadow-xl">
      <div className="flex items-center gap-3 mb-4">
        <Database className="w-6 h-6 text-purple-400" />
        <h2 className="text-xl font-semibold text-white">
          Selecciona tu base de datos
        </h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {databases.map((db) => (
          <button
            key={db.id}
            onClick={() => onSelectDb(db.id)}
            className={`
              relative p-6 rounded-xl border-2 transition-all transform
              ${selectedDb === db.id 
                ? `bg-gradient-to-r ${db.color} ${db.borderColor} scale-105 shadow-lg` 
                : `bg-slate-800/50 border-slate-700 ${db.hoverColor} hover:scale-102`
              }
            `}
          >
            <div className="flex flex-col items-center gap-3">
              <Database className={`w-12 h-12 ${selectedDb === db.id ? 'text-white' : db.textColor}`} />
              <span className={`font-semibold text-lg ${selectedDb === db.id ? 'text-white' : 'text-slate-300'}`}>
                {db.name}
              </span>
            </div>
            
            {selectedDb === db.id && (
              <div className="absolute top-2 right-2 bg-white rounded-full p-1">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
      
      <p className="text-slate-400 text-sm mt-4 text-center">
        Convierte tus tablas de {databases.find(db => db.id === selectedDb)?.name || 'tu base de datos'} a migraciones Laravel
      </p>
    </div>
  );
}
