export default function Header() {
  return (
    <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl p-4 mb-4 border border-slate-700/50 shadow-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src="/isotipo-colores.webp" 
            alt="RRHH Ingenia" 
            className="w-10 h-10 object-contain"
          />
          <div>
            <h1 className="text-2xl font-bold text-white">
              SQL → Laravel Migrations
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">
              Soporte para MySQL, SQL Server y PostgreSQL
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-slate-500 text-xs">
            © 2025 RRHH INGENIA
          </div>
        </div>
      </div>
    </div>
  );
}
