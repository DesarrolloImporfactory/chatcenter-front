// Marco estándar de las vistas de MainLayout_conexiones (mismo look que
// Conexiones/Usuarios/Departamentos): fondo degradado + tarjeta blanca a
// ancho completo. Usar `pad` cuando la vista no trae un hero full-bleed
// propio; si trae hero (header navy), dejarlo como primer hijo sin padding
// para que quede pegado al borde superior de la tarjeta.
const PageShell = ({ children, pad = false, className = "" }) => (
  <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-3 pr-8">
    <div
      className={`mx-auto w-[100%] m-3 md:m-6 bg-white rounded-2xl shadow-xl ring-1 ring-slate-200/70 min-h-[82vh] overflow-hidden ${
        pad ? "p-4 md:p-6" : ""
      } ${className}`}
    >
      {children}
    </div>
  </div>
);

export default PageShell;
