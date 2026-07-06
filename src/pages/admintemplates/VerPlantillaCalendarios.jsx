import React, { useState, useEffect, useMemo } from "react";
import chatApi from "../../api/chatcenter";

const VerPlantillaCalendarios = ({ onClose, setStatusMessage }) => {
  const [seleccionada, setSeleccionada] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [plantillasMeta, setPlantillasMeta] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  const id_configuracion = localStorage.getItem("id_configuracion");

  useEffect(() => {
    const fetchTemplatesMeta = async () => {
      try {
        setFetching(true);

        // 1. Traemos todas las plantillas de Meta
        const resp = await chatApi.post(
          "/whatsapp_managment/obtenerTemplatesWhatsapp",
          { id_configuracion: id_configuracion },
        );

        const metaList = resp.data?.data || [];

        // 2. Convertimos al formato que la UI espera
        const templates = metaList.map((tpl) => ({
          id_template: tpl.id,
          nombre: tpl.name,
          categoria: tpl.category || null,
          idioma: tpl.language || null,
        }));

        setPlantillasMeta(templates);

        // 3. Leemos la configuración actual para marcar la seleccionada
        const configResp = await chatApi.post(
          "/whatsapp_managment/obtenerConfiguracion",
          { id_configuracion: id_configuracion },
        );

        console.log("CONFIG COMPLETA:", configResp.data.config);
        console.log(
          "VALOR CALENDARIO:",
          configResp.data.config?.template_notificar_calendario,
        );

        // ✅ FIX: leer la columna correcta (calendario, no guías)
        if (
          configResp.data.success &&
          configResp.data.config?.template_notificar_calendario
        ) {
          setSeleccionada(configResp.data.config.template_notificar_calendario);
        }
      } catch (err) {
        console.error("Error al obtener templates de Meta:", err);
        setStatusMessage({
          type: "error",
          text: "Error al conectar con Meta o el servidor.",
        });
      } finally {
        setFetching(false);
      }
    };

    fetchTemplatesMeta();
  }, [id_configuracion]);

  const plantillasFiltradas = useMemo(() => {
    if (!busqueda.trim()) return plantillasMeta;
    const q = busqueda.toLowerCase();
    return plantillasMeta.filter(
      (t) =>
        (t.nombre || "").toLowerCase().includes(q) ||
        (t.categoria || "").toLowerCase().includes(q) ||
        (t.idioma || "").toLowerCase().includes(q),
    );
  }, [busqueda, plantillasMeta]);

  const handleGuardar = async () => {
    if (!seleccionada) {
      setStatusMessage({
        type: "error",
        text: "Selecciona una plantilla para continuar.",
      });
      return;
    }

    try {
      setLoading(true);

      const resp = await chatApi.put(
        "/whatsapp_managment/editarConfiguracionCalendario",
        {
          id_template_whatsapp: seleccionada,
          id_configuracion: id_configuracion,
        },
      );

      if (resp.data.success) {
        setStatusMessage({
          type: "success",
          text: resp.data.message || "Configuración actualizada correctamente.",
        });
        onClose();
      } else {
        setStatusMessage({
          type: "info",
          text:
            resp.data.message ||
            "La plantilla ya estaba asignada como principal.",
        });
      }
    } catch (error) {
      console.error("Error al guardar configuración:", error);
      setStatusMessage({
        type: "error",
        text: "Error al conectar con el servidor.",
      });
    } finally {
      setLoading(false);
    }
  };

  const badgeCategoria = (cat) => {
    const c = (cat || "").toUpperCase();
    if (c === "MARKETING") return "bg-yellow-100 text-yellow-800";
    if (c === "UTILITY") return "bg-blue-100 text-blue-800";
    return "bg-gray-100 text-gray-600";
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-[fadeIn_.15s_ease-out]">
        {/* Header */}
        <div className="bg-teal-600 px-6 py-4 flex items-start justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-white text-base font-semibold leading-tight">
                Notificación de Calendario
              </h2>
              <p className="text-white/80 text-xs mt-0.5">
                Plantilla que se enviará para notificar la reunión agendada
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-xl leading-none ml-2"
            title="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Buscador */}
          <div className="flex items-center gap-2 border rounded-xl px-3 py-2 mb-4 bg-gray-50 focus-within:ring-2 focus-within:ring-teal-500">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="#9ca3af" strokeWidth="2" />
              <path
                d="M21 21l-4.3-4.3"
                stroke="#9ca3af"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar plantilla por nombre, categoría o idioma…"
              className="outline-none bg-transparent text-sm w-full"
            />
          </div>

          {/* Lista */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {/* Skeleton de carga */}
            {fetching &&
              [1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 bg-gray-100 rounded-xl animate-pulse"
                />
              ))}

            {/* Empty state */}
            {!fetching && plantillasFiltradas.length === 0 && (
              <div className="py-10 text-center text-gray-500 text-sm">
                {plantillasMeta.length === 0
                  ? "No hay plantillas disponibles en tu portafolio de Meta."
                  : `No se encontraron resultados para "${busqueda}".`}
              </div>
            )}

            {/* Opciones */}
            {!fetching &&
              plantillasFiltradas.map((r) => {
                const activa = seleccionada === r.nombre;
                return (
                  <label
                    key={r.id_template}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition
                      ${
                        activa
                          ? "border-teal-500 bg-teal-50 ring-1 ring-teal-500"
                          : "border-gray-200 bg-white hover:bg-gray-50"
                      }`}
                  >
                    <input
                      type="radio"
                      name="plantilla"
                      value={r.nombre}
                      checked={activa}
                      onChange={() => setSeleccionada(r.nombre)}
                      className="sr-only"
                    />
                    {/* Check custom */}
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition
                        ${
                          activa
                            ? "border-teal-600 bg-teal-600"
                            : "border-gray-300 bg-white"
                        }`}
                    >
                      {activa && (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M20 6L9 17l-5-5"
                            stroke="#fff"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-800 truncate">
                        {r.nombre}
                      </div>
                      {(r.categoria || r.idioma) && (
                        <div className="mt-1 flex items-center gap-2">
                          {r.categoria && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full ${badgeCategoria(
                                r.categoria,
                              )}`}
                            >
                              {r.categoria}
                            </span>
                          )}
                          {r.idioma && (
                            <span className="text-[10px] text-gray-400 uppercase">
                              {r.idioma}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between gap-2">
          <div className="text-xs text-gray-500 truncate">
            {seleccionada ? (
              <>
                Seleccionada:{" "}
                <span className="font-medium text-gray-700">
                  {seleccionada}
                </span>
              </>
            ) : (
              "Ninguna plantilla seleccionada"
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleGuardar}
              disabled={loading || fetching || !seleccionada}
            >
              {loading ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerPlantillaCalendarios;
