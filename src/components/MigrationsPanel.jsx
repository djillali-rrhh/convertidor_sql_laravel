import { Download, FileText, Search, AlertCircle, CheckCircle2 } from 'lucide-react';
import SearchBar from './SearchBar';
import MigrationCard from './MigrationCard';

export default function MigrationsPanel({
  migrations,
  error,
  success,
  searchTermRight,
  setSearchTermRight,
  showSearchRight,
  setShowSearchRight,
  expandedId,
  setExpandedId,
  copiedId,
  handleCopy,
  handleDelete,
  handleDownload,
  highlightText,
  setActiveSection,
  rightSectionRef,
  searchInputRightRef
}) {
  return (
    <div 
      ref={rightSectionRef}
      onFocus={() => setActiveSection('right')}
      onClick={() => setActiveSection('right')}
      className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 shadow-xl"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Download className="w-5 h-5 text-green-400" />
          Migraciones Laravel
        </h2>

        <div className="flex gap-2">
          {migrations.length > 0 && (
            <>
              <button
                onClick={() => {
                  setShowSearchRight(!showSearchRight);
                  if (!showSearchRight) {
                    setTimeout(() => searchInputRightRef.current?.focus(), 100);
                  }
                }}
                className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2"
                title="Buscar (Ctrl+F)"
              >
                <Search className="w-4 h-4" />
              </button>
              
              <button
                onClick={handleDownload}
                className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2 shadow-lg hover:shadow-green-900/50"
              >
                <Download className="w-4 h-4" />
                <span className="hidden md:inline">Descargar ZIP</span>
              </button>
            </>
          )}
        </div>
      </div>

      <SearchBar
        show={showSearchRight && migrations.length > 0}
        searchTerm={searchTermRight}
        setSearchTerm={setSearchTermRight}
        onClose={() => setShowSearchRight(false)}
        placeholder="Buscar en migraciones..."
        inputRef={searchInputRightRef}
      />

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
            <MigrationCard
              key={m.id}
              migration={m}
              expandedId={expandedId}
              setExpandedId={setExpandedId}
              copiedId={copiedId}
              handleCopy={handleCopy}
              handleDelete={handleDelete}
              highlightText={highlightText}
              searchTerm={searchTermRight}
            />
          ))
        )}
      </div>
    </div>
  );
}
