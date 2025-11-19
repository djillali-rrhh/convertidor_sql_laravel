import { Search, X } from 'lucide-react';

export default function SearchBar({ 
  show, 
  searchTerm, 
  setSearchTerm, 
  onClose, 
  placeholder,
  inputRef 
}) {
  if (!show) return null;

  return (
    <div className="mb-4 flex items-center gap-2 bg-slate-800 p-2 rounded-lg border border-slate-700">
      <Search className="w-4 h-4 text-slate-400" />
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-white text-sm focus:outline-none"
      />
      {searchTerm && (
        <button
          onClick={() => setSearchTerm('')}
          className="text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      <button
        onClick={onClose}
        className="text-slate-400 hover:text-white"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
