import React from "react";

const StepHome = ({
  bgTemplates,
  selectedConfig,
  onShowTemplateModal,
  onContinue,
}) => {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-gray-200 min-h-[400px]">
      {/* Real templates blurred behind */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5 p-3 opacity-40">
          {(bgTemplates.length > 0
            ? bgTemplates
            : Array.from({ length: 10 })
          ).map((t, i) => (
            <div
              key={t?.id || i}
              className="rounded-lg overflow-hidden aspect-[3/4]"
            >
              {t?.src_url ? (
                <img
                  src={t.src_url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-200 to-blue-200" />
              )}
            </div>
          ))}
        </div>
        <div className="absolute inset-0 backdrop-blur-md bg-white/60" />
      </div>

      {/* CTA Content */}
      <div className="relative flex flex-col items-center justify-center text-center py-16 px-6 min-h-[480px]">
        <h2 className="text-xl font-black text-gray-900 mb-2">
          Selecciona el template a utilizar
        </h2>
        <p className="text-sm text-gray-500 max-w-md mb-6 leading-relaxed">
          Elige un diseño de referencia y las secciones que necesitas. La IA
          generará cada sección con el estilo del template y las fotos de tu
          producto.
        </p>

        {/* Botón principal */}
        <button
          onClick={onShowTemplateModal}
          className="group relative inline-flex items-center gap-2.5 px-9 py-4 rounded-2xl bg-[#0f1129] text-white text-sm font-bold transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] shadow-xl shadow-[#0f1129]/30 hover:shadow-2xl hover:shadow-[#0f1129]/40"
        >
          <i className="bx bx-grid-alt text-lg transition-transform duration-300 group-hover:rotate-90" />
          Ver templates y secciones
          <i className="bx bx-right-arrow-alt text-lg opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
        </button>

        {selectedConfig && (
          <div className="mt-5 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white border border-indigo-200 shadow-sm">
            <img
              src={selectedConfig.template.src_url}
              alt=""
              className="w-10 h-10 rounded-lg object-cover border border-indigo-100"
            />
            <div className="text-left">
              <p className="text-xs font-bold text-indigo-700">
                {selectedConfig.template.nombre}
              </p>
              <p className="text-[10px] text-indigo-500">
                {selectedConfig.etapas.length} secciones
              </p>
            </div>

            {/* Botón continuar */}
            <button
              onClick={onContinue}
              className="group ml-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0f1129] text-white text-xs font-bold transition-all duration-300 hover:scale-[1.05] active:scale-[0.97] shadow-md hover:shadow-lg hover:shadow-[#0f1129]/30"
            >
              Continuar
              <i className="bx bx-right-arrow-alt text-sm transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StepHome;
