import React from "react";

export default function DropshipperClientPanel(props) {
  const {
    selectedChat,
    DEFAULT_AVATAR,

    // toggles superiores
    isOpen,
    setIsOpen,
    isOpenNovedades,
    setIsOpenNovedades,
    isOpenMiniCal,
    setIsOpenMiniCal,
    handleToggleCalendar,

    activar_cotizacion,
    isCotizacionesOpen,
    handleToggleCotizaciones,
    loadingCotizaciones,
    cotizacionesData,
    Cotizador,

    // ... (todo lo demás)
    MiniCalendario,
  } = props;

  return (
    <>
      <div className="flex items-start justify-center overflow-y-auto h-full pt-2 md:pt-4 custom-scrollbar">
        <div className="w-full max-w-3xl mx-auto">
          {/* ===== Header cliente (avatar+datos) ===== */}
          <div className="mb-8 px-6 py-6 bg-transparent text-white rounded-2xl shadow-xl border border-violet-500 neon-border opacity-0 animate-fadeInOnce delay-[100ms]">
            <div className="w-full bg-[#162c4a] rounded-xl shadow-lg px-6 py-5 flex flex-col gap-4 animate-fadeInOnce">
              <img
                key={selectedChat?.psid || selectedChat?.id}
                src={selectedChat?.imagePath || DEFAULT_AVATAR}
                alt="Avatar"
                className="h-12 w-12 rounded-full object-cover bg-white block mx-auto"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = DEFAULT_AVATAR;
                }}
              />

              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-6 text-white/90">
                <div className="flex items-center gap-3">
                  <i className="bx bx-id-card text-2xl text-violet-300"></i>
                  <div>
                    <p className="text-xs text-white/60">Nombre</p>
                    <p className="text-sm font-semibold">
                      {selectedChat?.nombre_cliente || "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <i className="bx bx-phone-call text-2xl text-violet-300"></i>
                  <div>
                    <p className="text-xs text-white/60">Teléfono</p>
                    <p className="text-sm font-semibold">
                      {selectedChat?.celular_cliente || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===== Botonera superior (órdenes/novedades/calendario/cotizaciones) ===== */}
          <div className="grid grid-cols-2 gap-3 mb-4 opacity-0 animate-slideInRightOnce delay-[0ms]">
            {/* Órdenes */}
            <button
              className={`group w-full flex items-center justify-center gap-3 px-5 py-3 rounded-lg text-sm font-semibold uppercase tracking-wide transition-all duration-300 border-2 ${
                isOpen
                  ? "bg-[#1e3a5f] border-blue-400"
                  : "bg-[#162c4a] border-transparent hover:border-blue-300"
              }`}
              onClick={() => {
                setIsOpen((prev) => !prev);
                setIsOpenNovedades(false);
                setIsOpenMiniCal(false);
              }}
            >
              <i
                className={`bx bx-package text-xl ${isOpen ? "glow-yellow" : "text-yellow-300"}`}
              />
              <span className="text-white">Órdenes</span>
            </button>

            {/* Novedades */}
            <button
              className={`group w-full flex items-center justify-center gap-3 px-5 py-3 rounded-lg text-sm font-semibold uppercase tracking-wide transition-all duration-300 border-2 ${
                isOpenNovedades
                  ? "bg-[#1e3a5f] border-blue-400"
                  : "bg-[#162c4a] border-transparent hover:border-blue-300"
              }`}
              onClick={() => {
                setIsOpenNovedades((prev) => !prev);
                setIsOpen(false);
                setIsOpenMiniCal(false);
              }}
            >
              <i
                className={`bx bx-bell text-xl ${isOpenNovedades ? "glow-yellow" : "text-yellow-300"}`}
              />
              <span className="text-white">Novedades</span>
            </button>

            {/* Calendario */}
            <button
              className={`group w-full flex items-center justify-center gap-3 px-5 py-3 rounded-lg text-sm font-semibold uppercase tracking-wide transition-all duration-300 border-2 ${
                isOpenMiniCal
                  ? "bg-[#1e3a5f] border-blue-400"
                  : "bg-[#162c4a] border-transparent hover:border-blue-300"
              } ${props.isCotizacionesOpen ? "" : "col-span-2"}`}
              onClick={handleToggleCalendar}
            >
              <i
                className={`bx bx-calendar text-xl ${isOpenMiniCal ? "glow-yellow" : "text-yellow-300"}`}
              />
              <span className="text-white">Calendario</span>
            </button>

            {/* Cotizaciones */}
            {activar_cotizacion == 1 && (
              <button
                className={`group w-full flex items-center justify-center gap-3 px-5 py-3 rounded-lg text-sm font-semibold uppercase tracking-wide transition-all duration-300 border-2 ${
                  isCotizacionesOpen
                    ? "bg-[#1e3a5f] border-blue-400"
                    : "bg-[#162c4a] border-transparent hover:border-blue-300"
                }`}
                onClick={handleToggleCotizaciones}
              >
                <i
                  className={`bx bx-file-blank text-xl ${isCotizacionesOpen ? "glow-yellow" : "text-green-300"}`}
                />
                <span className="text-white">Cotizaciones</span>
              </button>
            )}
          </div>

          <div
            className={`transition-all duration-300 ease-in-out transform origin-top ${
              isCotizacionesOpen
                ? "opacity-100 scale-100 max-h-[1000px] pointer-events-auto"
                : "opacity-0 scale-95 max-h-0 overflow-hidden pointer-events-none"
            } bg-[#12172e] rounded-lg shadow-md mb-4`}
          >
            <Cotizador
              loadingCotizaciones={loadingCotizaciones}
              cotizacionesData={cotizacionesData}
            />
          </div>

          {isOpenMiniCal && (
            <div className="bg-transparent rounded-lg shadow-md">
              <div className="p-3">
                <div className="rounded-lg shadow-md bg-white text-slate-900">
                  <MiniCalendario />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
