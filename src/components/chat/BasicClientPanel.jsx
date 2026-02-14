import React from "react";

export default function BasicClientPanel({
  selectedChat,
  DEFAULT_AVATAR,
  isOpenMiniCal,
  handleToggleCalendar,
  activar_cotizacion,
  isCotizacionesOpen,
  handleToggleCotizaciones,
  loadingCotizaciones,
  cotizacionesData,
  Cotizador,
  MiniCalendario,
  openEditContact,
}) {
  return (
    <div className="flex items-start justify-center overflow-y-auto h-full md:h-[750px] pt-2 md:pt-4 custom-scrollbar">
      <div className="w-full max-w-3xl mx-auto">
        {/* Info cliente */}
        <div className="mb-8 px-6 py-6 bg-transparent text-white rounded-2xl shadow-xl border border-violet-500 neon-border">
          <div className="mb-6">
            <div className="relative rounded-2xl border border-white/10 bg-[#0b1222] shadow-xl overflow-hidden">
              {/* Top strip */}
              <div className="px-5 py-4 bg-[#162c4a]">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <img
                      src={selectedChat?.imagePath || DEFAULT_AVATAR}
                      alt="Avatar"
                      className="h-12 w-12 rounded-full object-cover bg-white/10 border border-white/10"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = DEFAULT_AVATAR;
                      }}
                    />
                  </div>

                  {/* Nombre + meta */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-semibold text-base truncate">
                        {selectedChat?.nombre_cliente || "Cliente sin nombre"}
                      </p>
                      <span className="text-[11px] text-white/40">
                        {selectedChat?.psid
                          ? `PSID ${selectedChat.psid}`
                          : `ID ${selectedChat?.id ?? "N/A"}`}
                      </span>
                    </div>

                    {/* Subline */}
                    <p className="text-xs text-white/55 truncate mt-0.5">
                      {selectedChat?.email_cliente || "Sin email registrado"}
                    </p>
                    {/* Botón lápiz pro */}
                    <button
                      type="button"
                      onClick={openEditContact}
                      className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white/80 hover:bg-white/10 hover:text-white transition"
                      title="Editar contacto"
                    >
                      <i className="bx bx-pencil text-base" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom grid info (mismo estilo / misma familia de color) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-white/10 bg-[#0f1b33]">
                {/* Teléfono */}
                <div className="px-5 py-4">
                  <p className="text-[11px] text-white/45">Teléfono</p>

                  <div className="mt-1 flex items-center justify-between gap-3">
                    <p className="text-sm text-white/90 font-medium truncate">
                      {selectedChat?.celular_cliente ||
                        "Sin teléfono registrado"}
                    </p>

                    <button
                      type="button"
                      className="shrink-0 p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition"
                      onClick={() => {
                        const v = selectedChat?.celular_cliente || "";
                        if (!v) return;
                        navigator.clipboard?.writeText(String(v));
                      }}
                      title="Copiar teléfono"
                    >
                      <i className="bx bx-copy-alt text-base text-white/70" />
                    </button>
                  </div>
                </div>

                {/* Email */}
                <div className="px-5 py-4">
                  <p className="text-[11px] text-white/45">Email</p>

                  <div className="mt-1 flex items-center justify-between gap-3">
                    <p className="text-sm text-white/90 font-medium truncate">
                      {selectedChat?.email_cliente || "Sin email registrado"}
                    </p>

                    <button
                      type="button"
                      className="shrink-0 p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition"
                      onClick={() => {
                        const v = selectedChat?.email_cliente || "";
                        if (!v) return;
                        navigator.clipboard?.writeText(String(v));
                      }}
                      title="Copiar email"
                    >
                      <i className="bx bx-copy-alt text-base text-white/70" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="grid grid-cols-2 gap-3 mb-4 opacity-0 animate-slideInRightOnce delay-[0ms]">
          <button
            className={`group col-span-2 w-full flex items-center justify-center gap-3 px-5 py-3 rounded-lg text-sm font-semibold uppercase tracking-wide transition-all duration-300 border-2 ${
              isOpenMiniCal
                ? "bg-[#1e3a5f] border-blue-400"
                : "bg-[#162c4a] border-transparent hover:border-blue-300"
            }`}
            onClick={handleToggleCalendar}
          >
            <i
              className={`bx bx-calendar text-xl ${
                isOpenMiniCal
                  ? "glow-yellow"
                  : "text-yellow-300 group-hover:text-yellow-200"
              }`}
            ></i>
            <span className="text-white">Calendario</span>
          </button>

          {activar_cotizacion == 1 && (
            <button
              className={`group w-full flex items-center col-span-2 justify-center gap-3 px-5 py-3 rounded-lg text-sm font-semibold uppercase tracking-wide transition-all duration-300 border-2 ${
                isCotizacionesOpen
                  ? "bg-[#1e3a5f] border-blue-400"
                  : "bg-[#162c4a] border-transparent hover:border-blue-300"
              }`}
              onClick={handleToggleCotizaciones}
            >
              <i
                className={`bx bx-file-blank text-xl transition-all duration-300 ${
                  isCotizacionesOpen
                    ? "glow-yellow"
                    : "text-green-300 group-hover:text-green-200"
                }`}
              ></i>
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
  );
}
