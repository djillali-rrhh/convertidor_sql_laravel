import { useState } from 'react';
import { Upload, Download, FileText, AlertCircle, CheckCircle2, Wand2, Copy, Check, Trash2, Eye, EyeOff } from 'lucide-react';
import JSZip from "jszip";
import { saveAs } from "file-saver";

// =========================================================
//  IMPORTAR LA FUNCIÓN DE CONVERSIÓN DESDE UTILS
// =========================================================
import { sqlToLaravelMigration } from './utils/sqlToLaravelMigration';

// =========================================================
//  COMPONENTE PRINCIPAL
// =========================================================

export default function App() {
  const [sqlInput, setSqlInput] = useState('');
  const [migrations, setMigrations] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  // --------------------------------
  // CONVERTIR SQL → MIGRATIONS usando la función importada
  // --------------------------------
  const handleConvert = () => {
    setError('');
    setSuccess('');
    setMigrations([]);

    if (!sqlInput.trim()) {
      setError('Por favor ingresa código SQL');
      return;
    }

    const statements = sqlInput
      .split(/(?=CREATE\s+TABLE)/i)
      .filter(s => s.trim().length > 0);

    const results = [];

    statements.forEach((stmt, idx) => {
      try {
        const fullMigration = sqlToLaravelMigration(stmt);
        const tableMatch = stmt.match(/CREATE\s+TABLE\s+\[?(\w+)\]?/i);
        const tableName = tableMatch ? tableMatch[1] : `table_${idx + 1}`;
        const schemaMatch = fullMigration.match(/Schema::create\('.*?',[\s\S]*?^\s*}\);/m);
        const code = schemaMatch ? schemaMatch[0] : fullMigration;

        results.push({
          id: idx,
          tableName: tableName,
          code: code,
          fullMigration: fullMigration
        });
      } catch (e) {
        console.error('Error al convertir SQL:', e);
        setError(`Error al procesar tabla ${idx + 1}: ${e.message}`);
      }
    });

    if (results.length === 0) {
      setError("No se pudo convertir ninguna sentencia SQL.");
    } else {
      setMigrations(results);
      setSuccess(`✓ ${results.length} migración${results.length > 1 ? 'es' : ''} generada${results.length > 1 ? 's' : ''} correctamente`);
    }
  };

  // --------------------------------
  // Copiar código individual
  // --------------------------------
  const handleCopy = (migration) => {
    navigator.clipboard.writeText(migration.fullMigration);
    setCopiedId(migration.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // --------------------------------
  // Eliminar migración individual
  // --------------------------------
  const handleDelete = (id) => {
    setMigrations(migrations.filter(m => m.id !== id));
    if (migrations.length === 1) {
      setSuccess('');
    }
  };

  // --------------------------------
  // Limpiar todo
  // --------------------------------
  const handleClear = () => {
    setSqlInput('');
    setMigrations([]);
    setError('');
    setSuccess('');
  };

  // --------------------------------
  // Cargar archivo .sql
  // --------------------------------
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setSqlInput(event.target.result);
      reader.readAsText(file);
    }
  };

  // --------------------------------
  // Descargar ZIP
  // --------------------------------
  const handleDownload = async () => {
    if (migrations.length === 0) return;

    try {
      const zip = new JSZip();
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "_");
      const folder = zip.folder(`laravel_migrations_${timestamp}`);

      migrations.forEach((m, idx) => {
        const migrationName = `${timestamp}_${String(idx + 1).padStart(6, "0")}_create_${m.tableName}_table`;
        folder.file(`${migrationName}.php`, m.fullMigration);
      });

      const zipFile = await zip.generateAsync({ type: "blob" });
      saveAs(zipFile, `migrations_${timestamp}.zip`);
      setSuccess('✓ Archivo ZIP descargado correctamente');
    } catch (err) {
      setError('Error al generar el ZIP: ' + err.message);
    }
  };

  // =========================================================
  //  UI
  // =========================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-7xl w-full mx-auto">

        {/* Header mejorado */}
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 md:p-8 mb-6 border border-slate-700/50 shadow-2xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <img 
                src="/isotipo-colores.webp" 
                alt="RRHH Ingenia" 
                className="w-14 h-14 md:w-16 md:h-16 object-contain"
              />
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">
                  SQL Server → Laravel
                </h1>
              </div>
            </div>
            
            <div className="text-center md:text-right">
              <p className="text-slate-300 text-sm md:text-base mb-1">
                Convierte tus tablas SQL Server a migraciones Laravel
              </p>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        {migrations.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-900/30 backdrop-blur rounded-xl p-4 border border-blue-800/40">
              <p className="text-blue-300 text-xs uppercase tracking-wide mb-1">Migraciones</p>
              <p className="text-white text-2xl font-bold">{migrations.length}</p>
            </div>
            <div className="bg-green-900/30 backdrop-blur rounded-xl p-4 border border-green-800/40">
              <p className="text-green-300 text-xs uppercase tracking-wide mb-1">Tablas</p>
              <p className="text-white text-2xl font-bold">{migrations.length}</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700/40">
              <p className="text-slate-300 text-xs uppercase tracking-wide mb-1">Líneas SQL</p>
              <p className="text-white text-2xl font-bold">{sqlInput.split('\n').length}</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700/40">
              <p className="text-slate-300 text-xs uppercase tracking-wide mb-1">Estado</p>
              <p className="text-green-400 text-sm font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Listo
              </p>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Panel Izquierdo */}
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-400" />
                SQL Server
              </h2>

              <div className="flex gap-2">
                <label className="cursor-pointer bg-blue-700 hover:bg-blue-800 text-white px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 shadow-lg hover:shadow-blue-900/50">
                  <FileText className="w-4 h-4" />
                  <span className="hidden md:inline">Cargar</span>
                  <input type="file" accept=".sql,.txt" onChange={handleFileUpload} className="hidden" />
                </label>
                
                {sqlInput && (
                  <button
                    onClick={handleClear}
                    className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <textarea
              value={sqlInput}
              onChange={(e) => setSqlInput(e.target.value)}
              placeholder="-- Pega aquí tus sentencias CREATE TABLE&#10;&#10;CREATE TABLE usuarios (&#10;    id INT IDENTITY(1,1) PRIMARY KEY,&#10;    nombre NVARCHAR(100) NOT NULL,&#10;    email NVARCHAR(255) UNIQUE,&#10;    activo BIT DEFAULT (1)&#10;);"
              className="w-full h-96 bg-slate-950 text-green-400 font-mono text-sm p-4 rounded-xl border border-slate-700 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 resize-none shadow-inner"
            />

            <button
              onClick={handleConvert}
              disabled={!sqlInput.trim()}
              className="w-full mt-4 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30"
            >
              <Wand2 className="w-5 h-5" />
              Convertir a Laravel
            </button>
          </div>

          {/* Panel Derecho */}
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Download className="w-5 h-5 text-green-400" />
                Migraciones Laravel
              </h2>

              {migrations.length > 0 && (
                <button
                  onClick={handleDownload}
                  className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2 shadow-lg hover:shadow-green-900/50"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden md:inline">Descargar ZIP</span>
                </button>
              )}
            </div>

            {error && (
              <div className="mb-4 bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-xl flex items-start gap-3 animate-pulse">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 bg-green-500/20 border border-green-500/50 text-green-200 p-4 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{success}</span>
              </div>
            )}

            <div className="space-y-3 h-96 overflow-y-auto pr-2 custom-scrollbar">
              {migrations.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500">
                  <div className="text-center">
                    <FileText className="w-20 h-20 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium">Sin migraciones</p>
                    <p className="text-sm text-slate-600 mt-2">Convierte tu SQL para ver los resultados</p>
                  </div>
                </div>
              ) : (
                migrations.map((m) => (
                  <div key={m.id} className="bg-slate-950/80 rounded-xl p-4 border border-slate-700/50 hover:border-blue-700/50 transition-all group">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                          {m.tableName}
                        </span>
                        <p className="text-xs text-slate-500 mt-0.5">create_{m.tableName}_table.php</p>
                      </div>
                      
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                          className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg text-xs transition-all"
                          title={expandedId === m.id ? "Contraer" : "Expandir"}
                        >
                          {expandedId === m.id ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                        
                        <button
                          onClick={() => handleCopy(m)}
                          className="bg-blue-700 hover:bg-blue-600 text-white p-2 rounded-lg text-xs transition-all"
                          title="Copiar código"
                        >
                          {copiedId === m.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                        
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="bg-red-700 hover:bg-red-600 text-white p-2 rounded-lg text-xs transition-all"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    
                    <pre className={`text-yellow-300 text-xs overflow-x-auto whitespace-pre-wrap ${expandedId === m.id ? '' : 'max-h-32 overflow-hidden'}`}>
                      <code>{expandedId === m.id ? m.fullMigration : m.code}</code>
                    </pre>
                    
                    {copiedId === m.id && (
                      <p className="text-green-400 text-xs mt-2 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Código copiado al portapapeles
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-slate-500 text-sm">
          <p>© 2025 RRHH INGENIA • Herramienta de conversión SQL Server a Laravel</p>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.7);
        }
      `}</style>
    </div>
  );
}