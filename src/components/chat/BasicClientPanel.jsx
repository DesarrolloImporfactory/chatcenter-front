import React from "react";
import EtiquetasCustomSelect from "./EtiquetasCustomSelect";
import HistorialEncargados from "./HistorialEncargados";

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
  isGoogleLinked,
}) {
  return (
    <div className="flex items-start justify-center overflow-y-auto h-full md:h-[750px] pt-1 md:pt-2 custom-scrollbar">
      <div className="w-full max-w-2xl mx-auto">
        {/* Info cliente */}
        <div className="mb-4 px-3 py-3 bg-transparent text-white rounded-xl shadow-lg border border-violet-500 neon-border">
          <div className="mb-3">
            <div className="relative rounded-xl border border-white/10 bg-[#0b1222] shadow-lg overflow-visible">
              {/* Top strip */}
              <div className="px-3 py-2.5 bg-[#162c4a]">
                <div className="flex items-center gap-2.5">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <img
                      src={selectedChat?.imagePath || DEFAULT_AVATAR}
                      alt="Avatar"
                      className="h-9 w-9 rounded-full object-cover bg-white/10 border border-white/10"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = DEFAULT_AVATAR;
                      }}
                    />
                  </div>

                  {/* Nombre + meta */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-white font-semibold text-xs truncate">
                        {selectedChat?.nombre_cliente || "Cliente sin nombre"}
                      </p>
                      <span className="text-[9px] text-white/40">
                        {selectedChat?.psid
                          ? `PSID ${selectedChat.psid}`
                          : `ID ${selectedChat?.id ?? "N/A"}`}
                      </span>
                    </div>
                    <p className="text-[10px] text-white/55 truncate mt-0.5">
                      {selectedChat?.email_cliente || "Sin email registrado"}
                    </p>
                    {/* Botón editar */}
                    <button
                      type="button"
                      onClick={openEditContact}
                      className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[9px] text-white/80 hover:bg-white/10 hover:text-white transition"
                      title="Editar contacto"
                    >
                      <i className="bx bx-pencil text-xs" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Info grid (Teléfono + Email) */}
              <div className="grid grid-cols-2 divide-x divide-white/10 bg-[#0f1b33]">
                {/* Teléfono */}
                <div className="px-3 py-2">
                  <p className="text-[9px] text-white/45">Teléfono</p>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className="text-[11px] text-white/90 font-medium truncate">
                      {selectedChat?.celular_cliente || "Sin teléfono"}
                    </p>
                    <button
                      type="button"
                      className="shrink-0 p-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 transition"
                      onClick={() => {
                        const v = selectedChat?.celular_cliente || "";
                        if (!v) return;
                        navigator.clipboard?.writeText(String(v));
                      }}
                      title="Copiar teléfono"
                    >
                      <i className="bx bx-copy-alt text-xs text-white/70" />
                    </button>
                  </div>
                </div>

                {/* Email */}
                <div className="px-3 py-2">
                  <p className="text-[9px] text-white/45">Email</p>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className="text-[11px] text-white/90 font-medium truncate">
                      {selectedChat?.email_cliente || "Sin email"}
                    </p>
                    <button
                      type="button"
                      className="shrink-0 p-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 transition"
                      onClick={() => {
                        const v = selectedChat?.email_cliente || "";
                        if (!v) return;
                        navigator.clipboard?.writeText(String(v));
                      }}
                      title="Copiar email"
                    >
                      <i className="bx bx-copy-alt text-xs text-white/70" />
                    </button>
                  </div>
                </div>
              </div>

              <EtiquetasCustomSelect clienteId={selectedChat?.id} />
              <HistorialEncargados clienteId={selectedChat?.id} />
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="grid grid-cols-2 gap-1.5 mb-3 opacity-0 animate-slideInRightOnce delay-[0ms]">
          {isGoogleLinked && (
            <button
              className={`group col-span-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all duration-300 border ${
                isOpenMiniCal
                  ? "bg-[#1e3a5f] border-blue-400"
                  : "bg-[#162c4a] border-transparent hover:border-blue-300"
              }`}
              onClick={handleToggleCalendar}
            >
              <i
                className={`bx bx-calendar text-sm ${
                  isOpenMiniCal
                    ? "glow-yellow"
                    : "text-yellow-300 group-hover:text-yellow-200"
                }`}
              />
              <span className="text-white">Calendario</span>
            </button>
          )}

          {activar_cotizacion == 1 && (
            <button
              className={`group w-full flex items-center col-span-2 justify-center gap-2 px-3 py-2 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all duration-300 border ${
                isCotizacionesOpen
                  ? "bg-[#1e3a5f] border-blue-400"
                  : "bg-[#162c4a] border-transparent hover:border-blue-300"
              }`}
              onClick={handleToggleCotizaciones}
            >
              <i
                className={`bx bx-file-blank text-sm transition-all duration-300 ${
                  isCotizacionesOpen
                    ? "glow-yellow"
                    : "text-green-300 group-hover:text-green-200"
                }`}
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
          } bg-[#12172e] rounded-md shadow-md mb-3`}
        >
          <Cotizador
            loadingCotizaciones={loadingCotizaciones}
            cotizacionesData={cotizacionesData}
          />
        </div>

        {isOpenMiniCal && (
          <div className="bg-transparent rounded-md shadow-md">
            <div className="p-2">
              <div className="rounded-md shadow-md bg-white text-slate-900">
                <MiniCalendario />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
