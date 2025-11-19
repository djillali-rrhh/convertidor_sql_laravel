export default function Header() {
  return (
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
              SQL → Laravel Migrations
            </h1>
          </div>
        </div>
        
        <div className="text-center md:text-right">
          <p className="text-slate-300 text-sm md:text-base mb-1">
            Soporte para MySQL, SQL Server y PostgreSQL
          </p>
        </div>
      </div>
    </div>
  );
}
