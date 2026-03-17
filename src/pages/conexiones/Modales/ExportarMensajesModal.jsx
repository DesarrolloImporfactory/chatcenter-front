import React, { useState, useMemo } from "react";
import Swal from "sweetalert2";
import chatApi from "../../../api/chatcenter";

const ExportarMensajesModal = ({
  conexiones = [], // lista completa de configuraciones
  preselected = null, // config preseleccionada (opcional)
  onClose,
}) => {
  const [selectedId, setSelectedId] = useState(preselected?.id || "");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [descargando, setDescargando] = useState(false);

  const selectedConfig = useMemo(
    () => conexiones.find((c) => c.id === Number(selectedId)) || null,
    [conexiones, selectedId],
  );

  const handleDescargar = async () => {
    if (!selectedId) {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "warning",
        title: "Selecciona una conexión",
        showConfirmButton: false,
        timer: 2000,
      });
      return;
    }

    try {
      setDescargando(true);

      const response = await chatApi.post(
        "configuraciones/exportar_mensajes_xlsx",
        {
          id_configuracion: Number(selectedId),
          fecha_inicio: fechaInicio || undefined,
          fecha_fin: fechaFin || undefined,
        },
        {
          responseType: "blob",
          timeout: 300000,
        },
      );

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const nombre =
        selectedConfig?.nombre_configuracion?.replace(/\s+/g, "_") ||
        selectedId;
      const rango =
        fechaInicio || fechaFin
          ? `_${fechaInicio || "inicio"}_a_${fechaFin || "hoy"}`
          : "_completo";
      link.download = `mensajes_${nombre}${rango}.xlsx`;

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Reporte descargado",
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true,
      });

      onClose();
    } catch (err) {
      console.error("Error al exportar:", err);

      if (err?.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          Swal.fire("Error", json.message || "No se pudo exportar.", "error");
          return;
        } catch {}
      }

      Swal.fire(
        "Error",
        err?.response?.data?.message || "No se pudo generar el reporte.",
        "error",
      );
    } finally {
      setDescargando(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[80] bg-slate-950/60 backdrop-blur-[6px]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[81] grid place-items-center px-4">
        <div
          className="w-full max-w-lg rounded-2xl bg-white overflow-hidden ring-1 ring-slate-200 shadow-[0_32px_80px_rgba(2,6,23,.35)] animate-[sheetIn_.22s_ease-out]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header con gradiente */}
          <div className="bg-[#171931] px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 grid place-items-center ring-1 ring-indigo-400/30">
                  <i className="bx bx-spreadsheet text-xl text-indigo-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Exportar mensajes
                  </h3>
                  <p className="text-[13px] text-white/60">
                    Descarga el historial en formato Excel
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg grid place-items-center text-white/50 hover:text-white hover:bg-white/10 transition"
              >
                <i className="bx bx-x text-xl" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5">
            {/* Selector de conexión */}
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-2">
                Conexión
              </label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-slate-50/50 
                focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 focus:bg-white
                outline-none text-sm text-slate-800 transition"
              >
                <option value="">Selecciona una conexión…</option>
                {conexiones.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre_configuracion} — {c.telefono || "Sin teléfono"}
                  </option>
                ))}
              </select>
            </div>

            {/* Rango de fechas */}
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-2">
                Rango de fechas{" "}
                <span className="text-slate-400 font-normal text-xs">
                  (opcional)
                </span>
              </label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <div className="text-[11px] font-medium text-slate-500 mb-1 uppercase tracking-wider">
                    Desde
                  </div>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 
                    focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 focus:bg-white
                    outline-none text-sm transition"
                  />
                </div>
                <div className="flex items-end pb-3 text-slate-300">
                  <i className="bx bx-right-arrow-alt text-lg" />
                </div>
                <div className="flex-1">
                  <div className="text-[11px] font-medium text-slate-500 mb-1 uppercase tracking-wider">
                    Hasta
                  </div>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 
                    focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 focus:bg-white
                    outline-none text-sm transition"
                  />
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-200 px-4 py-3">
              <i className="bx bx-info-circle text-lg text-slate-400 mt-0.5 shrink-0" />
              <span className="text-[13px] leading-5 text-slate-600">
                Sin fechas se exportan <strong>todos los mensajes</strong>. Este
                proceso podría tardar unos segundos
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleDescargar}
              disabled={descargando || !selectedId}
              className={[
                "inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition",
                descargando || !selectedId
                  ? "bg-slate-300 cursor-not-allowed"
                  : "bg-[#171931] hover:bg-[#1e2142] active:scale-[0.98]",
              ].join(" ")}
            >
              {descargando ? (
                <>
                  <i className="bx bx-loader-alt animate-spin text-lg" />
                  Generando…
                </>
              ) : (
                <>
                  <i className="bx bx-download text-lg" />
                  Descargar Excel
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ExportarMensajesModal;
