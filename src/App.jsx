import { useState } from 'react';
import { Upload, Download, FileText, AlertCircle, CheckCircle2, Wand2 } from 'lucide-react';

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
        // Usamos la función importada
        const fullMigration = sqlToLaravelMigration(stmt);
        
        // Extraer el nombre de la tabla
        const tableMatch = stmt.match(/CREATE\s+TABLE\s+\[?(\w+)\]?/i);
        const tableName = tableMatch ? tableMatch[1] : `table_${idx + 1}`;

        // Extraer solo el código del Schema::create
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
      setSuccess(`Se convirtieron ${results.length} migración(es)`);
    }
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
      const JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm')).default;
      const { saveAs } = await import('https://cdn.jsdelivr.net/npm/file-saver@2.0.5/+esm');

      const zip = new JSZip();
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "_");

      const folder = zip.folder(`laravel_migrations_${timestamp}`);

      migrations.forEach((m, idx) => {
        const migrationName = `${timestamp}_${String(idx + 1).padStart(6, "0")}_create_${m.tableName}_table`;
        folder.file(`${migrationName}.php`, m.fullMigration);
      });

      const zipFile = await zip.generateAsync({ type: "blob" });
      saveAs(zipFile, `migrations_${timestamp}.zip`);
    } catch (err) {
      setError('Error al generar el ZIP: ' + err.message);
    }
  };

  // =========================================================
  //  UI
  // =========================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <FileText className="w-12 h-12 text-purple-400" />
            <h1 className="text-4xl font-bold text-white">SQL Server → Laravel</h1>
          </div>
          <p className="text-purple-200 text-lg">Convierte CREATE TABLE de SQL Server a Migraciones de Laravel</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Panel Izquierdo */}
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-purple-500/30">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Upload className="w-5 h-5" />
                SQL Server (Entrada)
              </h2>

              <label className="cursor-pointer bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Cargar .sql
                <input type="file" accept=".sql,.txt" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            <textarea
              value={sqlInput}
              onChange={(e) => setSqlInput(e.target.value)}
              placeholder="CREATE TABLE usuarios (&#10;    id INT IDENTITY(1,1) PRIMARY KEY,&#10;    nombre NVARCHAR(100) NOT NULL,&#10;    email NVARCHAR(255) UNIQUE,&#10;    activo BIT DEFAULT (1)&#10;);"
              className="w-full h-96 bg-slate-900 text-green-400 font-mono text-sm p-4 rounded-lg border border-slate-700 focus:border-purple-500 focus:outline-none resize-none"
            />

            <button
              onClick={handleConvert}
              className="w-full mt-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 rounded-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2"
            >
              <Wand2 className="w-5 h-5" />
              Convertir a Laravel
            </button>
          </div>

          {/* Panel Derecho */}
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-purple-500/30">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Download className="w-5 h-5" />
                Laravel Migrations (Salida)
              </h2>

              {migrations.length > 0 && (
                <button
                  onClick={handleDownload}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Descargar ZIP
                </button>
              )}
            </div>

            {error && (
              <div className="mb-4 bg-red-500/20 border border-red-500 text-red-200 p-4 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 bg-green-500/20 border border-green-500 text-green-200 p-4 rounded-lg flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            <div className="space-y-4 h-96 overflow-y-auto">
              {migrations.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500">
                  <div className="text-center">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>Las migraciones aparecerán aquí</p>
                  </div>
                </div>
              ) : (
                migrations.map((m) => (
                  <div key={m.id} className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                    <div className="mb-2">
                      <span className="text-xs font-semibold text-purple-400 uppercase">create_{m.tableName}_table</span>
                    </div>
                    <pre className="text-yellow-300 text-xs overflow-x-auto whitespace-pre-wrap">
                      <code>{m.code}</code>
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}