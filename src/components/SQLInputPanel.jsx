import { Upload, FileText, Trash2, Search, Wand2 } from 'lucide-react';
import SearchBar from './SearchBar';

export default function SQLInputPanel({
  sqlInput,
  setSqlInput,
  searchTermLeft,
  setSearchTermLeft,
  showSearchLeft,
  setShowSearchLeft,
  handleFileUpload,
  handleClear,
  handleConvert,
  highlightText,
  setActiveSection,
  leftSectionRef,
  searchInputLeftRef
}) {
  return (
    <div 
      ref={leftSectionRef}
      onFocus={() => setActiveSection('left')}
      onClick={() => setActiveSection('left')}
      className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 shadow-xl"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Upload className="w-5 h-5 text-blue-400" />
          SQL Server
        </h2>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowSearchLeft(!showSearchLeft);
              if (!showSearchLeft) {
                setTimeout(() => searchInputLeftRef.current?.focus(), 100);
              }
            }}
            className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2"
            title="Buscar (Ctrl+F)"
          >
            <Search className="w-4 h-4" />
          </button>
          
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

      <SearchBar
        show={showSearchLeft}
        searchTerm={searchTermLeft}
        setSearchTerm={setSearchTermLeft}
        onClose={() => setShowSearchLeft(false)}
        placeholder="Buscar en SQL..."
        inputRef={searchInputLeftRef}
      />

      <div className="w-full h-96 bg-slate-950 text-green-400 font-mono text-sm p-4 rounded-xl border border-slate-700 overflow-auto">
        {searchTermLeft ? (
          <pre className="whitespace-pre-wrap">{highlightText(sqlInput, searchTermLeft)}</pre>
        ) : (
          <textarea
            value={sqlInput}
            onChange={(e) => setSqlInput(e.target.value)}
            placeholder="-- Pega aquí tus sentencias CREATE TABLE&#10;&#10;CREATE TABLE usuarios (&#10;    id INT IDENTITY(1,1) PRIMARY KEY,&#10;    nombre NVARCHAR(100) NOT NULL,&#10;    email NVARCHAR(255) UNIQUE,&#10;    activo BIT DEFAULT (1)&#10;);"
            className="w-full h-full bg-transparent text-green-400 font-mono text-sm focus:outline-none resize-none"
          />
        )}
      </div>

      <button
        onClick={handleConvert}
        disabled={!sqlInput.trim()}
        className="w-full mt-4 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30"
      >
        <Wand2 className="w-5 h-5" />
        Convertir a Laravel
      </button>
    </div>
  );
}
