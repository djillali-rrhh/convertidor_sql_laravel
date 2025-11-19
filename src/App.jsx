import { useState, useRef } from 'react';
import JSZip from "jszip";
import { saveAs } from "file-saver";

import { mysqlToLaravelMigration } from './utils/converters/mysqlConverter';
import { sqlserverToLaravelMigration } from './utils/converters/sqlserverConverter';
import { postgresqlToLaravelMigration } from './utils/converters/postgresqlConverter';
import { useSearch } from './hooks/useSearch';

import Header from './components/Header';
import DatabaseSelector from './components/DatabaseSelector';
import StatsCards from './components/StatsCards';
import SQLInputPanel from './components/SQLInputPanel';
import MigrationsPanel from './components/MigrationsPanel';

export default function App() {
  const [selectedDb, setSelectedDb] = useState('mysql');
  const [sqlInput, setSqlInput] = useState('');
  const [migrations, setMigrations] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  
  const leftSectionRef = useRef(null);
  const rightSectionRef = useRef(null);

  const {
    searchTermLeft,
    setSearchTermLeft,
    searchTermRight,
    setSearchTermRight,
    showSearchLeft,
    setShowSearchLeft,
    showSearchRight,
    setShowSearchRight,
    searchInputLeftRef,
    searchInputRightRef
  } = useSearch(activeSection);

  const converters = {
    mysql: mysqlToLaravelMigration,
    sqlserver: sqlserverToLaravelMigration,
    postgresql: postgresqlToLaravelMigration
  };

  const handleConvert = () => {
    setError('');
    setSuccess('');
    setMigrations([]);

    if (!sqlInput.trim()) {
      setError('Por favor ingresa código SQL');
      return;
    }

    const converter = converters[selectedDb];
    const statements = sqlInput
      .split(/(?=CREATE\s+TABLE)/i)
      .filter(s => s.trim().length > 0);

    const results = [];

    statements.forEach((stmt, idx) => {
      try {
        const fullMigration = converter(stmt);
        const tableMatch = stmt.match(/CREATE\s+TABLE\s+[\[`"]?(\w+)[\]`"]?/i);
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

  const handleCopy = (migration) => {
    navigator.clipboard.writeText(migration.fullMigration);
    setCopiedId(migration.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (id) => {
    setMigrations(migrations.filter(m => m.id !== id));
    if (migrations.length === 1) {
      setSuccess('');
    }
  };

  const handleClear = () => {
    setSqlInput('');
    setMigrations([]);
    setError('');
    setSuccess('');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setSqlInput(event.target.result);
      reader.readAsText(file);
    }
  };

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

  const highlightText = (text, searchTerm) => {
    if (!searchTerm.trim()) return text;

    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-400 text-slate-900 rounded px-0.5">
          {part}
        </mark>
      ) : part
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-7xl w-full mx-auto">
        <Header />
        
        <DatabaseSelector selectedDb={selectedDb} onSelectDb={setSelectedDb} />
        
        <StatsCards migrations={migrations} sqlInput={sqlInput} />

        <div className="grid lg:grid-cols-2 gap-6">
          <SQLInputPanel
            selectedDb={selectedDb}
            sqlInput={sqlInput}
            setSqlInput={setSqlInput}
            searchTermLeft={searchTermLeft}
            setSearchTermLeft={setSearchTermLeft}
            showSearchLeft={showSearchLeft}
            setShowSearchLeft={setShowSearchLeft}
            handleFileUpload={handleFileUpload}
            handleClear={handleClear}
            handleConvert={handleConvert}
            highlightText={highlightText}
            setActiveSection={setActiveSection}
            leftSectionRef={leftSectionRef}
            searchInputLeftRef={searchInputLeftRef}
          />

          <MigrationsPanel
            migrations={migrations}
            error={error}
            success={success}
            searchTermRight={searchTermRight}
            setSearchTermRight={setSearchTermRight}
            showSearchRight={showSearchRight}
            setShowSearchRight={setShowSearchRight}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
            copiedId={copiedId}
            handleCopy={handleCopy}
            handleDelete={handleDelete}
            handleDownload={handleDownload}
            highlightText={highlightText}
            setActiveSection={setActiveSection}
            rightSectionRef={rightSectionRef}
            searchInputRightRef={searchInputRightRef}
          />
        </div>

        <div className="mt-8 text-center text-slate-500 text-sm">
          <p>© 2025 RRHH INGENIA • Herramienta de conversión SQL a Laravel</p>
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
        mark {
          animation: highlight 0.3s ease-in-out;
        }
        @keyframes highlight {
          from {
            background-color: rgba(250, 204, 21, 0.3);
          }
          to {
            background-color: rgba(250, 204, 21, 1);
          }
        }
      `}</style>
    </div>
  );
}
