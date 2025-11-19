import { Database } from 'lucide-react';

const databases = [
  { 
    id: 'mysql', 
    name: 'MySQL', 
    color: 'from-orange-600 to-orange-800',
    hoverColor: 'hover:from-orange-700 hover:to-orange-900',
    borderColor: 'border-orange-500/50',
    textColor: 'text-orange-400',
    bgColor: 'bg-orange-900/20'
  },
  { 
    id: 'sqlserver', 
    name: 'SQL Server', 
    color: 'from-blue-600 to-blue-800',
    hoverColor: 'hover:from-blue-700 hover:to-blue-900',
    borderColor: 'border-blue-500/50',
    textColor: 'text-blue-400',
    bgColor: 'bg-blue-900/20'
  },
  { 
    id: 'postgresql', 
    name: 'PostgreSQL', 
    color: 'from-indigo-600 to-indigo-800',
    hoverColor: 'hover:from-indigo-700 hover:to-indigo-900',
    borderColor: 'border-indigo-500/50',
    textColor: 'text-indigo-400',
    bgColor: 'bg-indigo-900/20'
  }
];

export default function DatabaseSelector({ selectedDb, onSelectDb }) {
  const selectedDbInfo = databases.find(db => db.id === selectedDb);

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl p-4 mb-4 border border-slate-700/50 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-purple-400" />
          <h2 className="text-base font-semibold text-white">
            Base de datos origen
          </h2>
        </div>
        
        <div className="flex gap-2">
          {databases.map((db) => (
            <button
              key={db.id}
              onClick={() => onSelectDb(db.id)}
              className={`
                relative px-4 py-2 rounded-lg border transition-all flex items-center gap-2
                ${selectedDb === db.id 
                  ? `bg-gradient-to-r ${db.color} ${db.borderColor} shadow-md` 
                  : `${db.bgColor} border-slate-700 ${db.hoverColor} hover:border-slate-600`
                }
              `}
            >
              <Database className={`w-4 h-4 ${selectedDb === db.id ? 'text-white' : db.textColor}`} />
              <span className={`font-medium text-sm ${selectedDb === db.id ? 'text-white' : 'text-slate-300'}`}>
                {db.name}
              </span>
              
              {selectedDb === db.id && (
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
