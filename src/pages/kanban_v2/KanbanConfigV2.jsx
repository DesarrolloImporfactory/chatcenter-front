// ═══════════════════════════════════════════════════════════════
// KanbanConfigV2.jsx
// Pagina dedicada para configurar el flujo Kanban V2 (Structured
// Outputs). Diseno con tabs:
//   - Resumen   (estado + mapeo de acciones)
//   - Asistente (prompt + modelo, vivo en OpenAI)
//   - Schema    (JSON Schema, visual + editor)
//   - Probar    (test bench + reset cliente + chat preview)
//   - Historial (pedidos extraidos por V2)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";
import PageHeader from "../Header/pageHeader";

import { Card, Btn, Pill, StatusBadge, Spinner } from "./componentes/ui";
import TabResumen from "./tabs/TabResumen";
import TabAsistente from "./tabs/TabAsistente";
import TabSchema from "./tabs/TabSchema";
import TabProbar from "./tabs/TabProbar";
import TabHistorial from "./tabs/TabHistorial";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.parentNode.style.zIndex = 99999;
  },
});

const safeJson = (v) => {
  if (!v) return null;
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
};

const TABS = [
  { id: "resumen", label: "Resumen", icon: "bx bx-stats" },
  { id: "asistente", label: "Asistente", icon: "bx bx-bot" },
  { id: "schema", label: "Schema", icon: "bx bx-code-curly" },
  { id: "probar", label: "Probar", icon: "bx bx-play-circle" },
  { id: "historial", label: "Historial", icon: "bx bx-history" },
];

const KanbanConfigV2 = () => {
  const [id_configuracion] = useState(() =>
    parseInt(localStorage.getItem("id_configuracion"), 10)
  );

  const [columnas, setColumnas] = useState([]);
  const [columnaActiva, setColumnaActiva] = useState(null);
  const [v2Config, setV2Config] = useState(null);
  const [loadingCols, setLoadingCols] = useState(false);
  const [loadingCfg, setLoadingCfg] = useState(false);
  const [accionMap, setAccionMap] = useState({});

  const [activeTab, setActiveTab] = useState("resumen");

  // ─── Cargar columnas ────────────────────────────────────────
  const cargarColumnas = useCallback(async () => {
    setLoadingCols(true);
    try {
      const { data } = await chatApi.post("/kanban_columnas/listar", {
        id_configuracion,
      });
      if (data?.success) {
        const all = data.data || [];
        setColumnas(all);
        const conIa = all.filter((c) => c.activa_ia && c.assistant_id);
        if (conIa.length && !columnaActiva) setColumnaActiva(conIa[0].id);
      }
    } catch {
      Toast.fire({ icon: "error", title: "Error cargando columnas" });
    } finally {
      setLoadingCols(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id_configuracion]);

  useEffect(() => {
    cargarColumnas();
  }, [cargarColumnas]);

  // ─── Cargar config V2 al cambiar columna ───────────────────
  const cargarConfigV2 = useCallback(
    async (id_kanban_columna) => {
      if (!id_kanban_columna) return;
      setLoadingCfg(true);
      try {
        const { data } = await chatApi.post("/kanban_ia_v2/config/obtener", {
          id_configuracion,
          id_kanban_columna,
        });
        const cfg = data?.data || null;
        setV2Config(cfg);
        setAccionMap(cfg?.accion_map || {});
      } catch {
        setV2Config(null);
        setAccionMap({});
      } finally {
        setLoadingCfg(false);
      }
    },
    [id_configuracion]
  );

  useEffect(() => {
    if (columnaActiva) cargarConfigV2(columnaActiva);
  }, [columnaActiva, cargarConfigV2]);

  // ─── Acciones derivadas ────────────────────────────────────
  const columnasConIA = useMemo(
    () => columnas.filter((c) => c.activa_ia && c.assistant_id),
    [columnas]
  );

  const colActivaObj = useMemo(
    () => columnas.find((c) => c.id === columnaActiva) || null,
    [columnas, columnaActiva]
  );

  const v2Activo = !!(v2Config && v2Config.activo);
  const schema = useMemo(() => safeJson(v2Config?.response_schema), [v2Config]);
  const enumAcciones =
    schema?.schema?.properties?.accion?.enum?.filter((a) => a !== "ninguna") || [];

  const estadosDisponibles = useMemo(
    () =>
      columnas
        .filter((c) => c.activo)
        .map((c) => ({ value: c.estado_db, label: c.nombre })),
    [columnas]
  );

  // ─── Acciones globales ─────────────────────────────────────
  const handleCargarSeedSara = async () => {
    const result = await Swal.fire({
      title: "¿Cargar schema seed de Sara?",
      text:
        "Esto inicializa V2 para esta columna con el schema y mapeo por defecto de Imporshop. Si ya había config V2, se sobreescribe.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, cargar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#3b82f6",
    });
    if (!result.isConfirmed) return;

    try {
      await chatApi.post("/kanban_ia_v2/config/usar_seed_sara", {
        id_configuracion,
        id_kanban_columna: columnaActiva,
        accion_map: {
          generar_guia: "generar_guia",
          cancelar: "cancelados",
          escalar_asesor: "asesor",
        },
      });
      Toast.fire({ icon: "success", title: "Seed Sara cargado" });
      await cargarConfigV2(columnaActiva);
    } catch (err) {
      Toast.fire({
        icon: "error",
        title: err?.response?.data?.message || "Error al cargar seed",
      });
    }
  };

  const handleToggleV2 = async (nextValue) => {
    if (!v2Config) {
      Toast.fire({
        icon: "info",
        title: 'Carga primero el "seed Sara" para inicializar V2',
      });
      return;
    }
    try {
      await chatApi.post("/kanban_ia_v2/config/guardar", {
        id_configuracion,
        id_kanban_columna: columnaActiva,
        response_schema: schema,
        accion_map: accionMap,
        modelo: v2Config.modelo,
        activo: nextValue ? 1 : 0,
      });
      Toast.fire({
        icon: "success",
        title: nextValue ? "V2 activado" : "V2 desactivado",
      });
      await cargarConfigV2(columnaActiva);
    } catch (err) {
      Toast.fire({
        icon: "error",
        title: err?.response?.data?.message || "Error guardando",
      });
    }
  };

  const handleGuardarMapeo = async () => {
    if (!schema) {
      Toast.fire({ icon: "error", title: "No hay schema cargado" });
      return;
    }
    try {
      await chatApi.post("/kanban_ia_v2/config/guardar", {
        id_configuracion,
        id_kanban_columna: columnaActiva,
        response_schema: schema,
        accion_map: accionMap,
        modelo: v2Config?.modelo || null,
        activo: v2Config?.activo ?? 1,
      });
      Toast.fire({ icon: "success", title: "Mapeo guardado" });
      await cargarConfigV2(columnaActiva);
    } catch (err) {
      Toast.fire({
        icon: "error",
        title: err?.response?.data?.message || "Error guardando mapeo",
      });
    }
  };

  const handleEliminarV2 = async () => {
    const r = await Swal.fire({
      title: "¿Eliminar config V2 de esta columna?",
      text:
        "La columna volverá a usar V1 (parsing de texto). La config V2 quedará como activo=0.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, desactivar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#ef4444",
    });
    if (!r.isConfirmed) return;
    try {
      await chatApi.post("/kanban_ia_v2/config/eliminar", {
        id_configuracion,
        id_kanban_columna: columnaActiva,
      });
      Toast.fire({ icon: "success", title: "V2 desactivado" });
      await cargarConfigV2(columnaActiva);
    } catch (err) {
      Toast.fire({
        icon: "error",
        title: err?.response?.data?.message || "Error eliminando",
      });
    }
  };

  // ═════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Configurar agentes V2 (Structured)"
        subtitle="Configuración aislada para Kanban con JSON garantizado. No afecta V1."
      />

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* ── Selector de columna ─────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Columna a configurar
              </label>
              <select
                value={columnaActiva || ""}
                onChange={(e) =>
                  setColumnaActiva(parseInt(e.target.value, 10))
                }
                className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loadingCols}
              >
                {columnasConIA.length === 0 && (
                  <option value="">— Sin columnas con IA activa —</option>
                )}
                {columnasConIA.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({c.estado_db})
                  </option>
                ))}
              </select>
              {colActivaObj && (
                <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-3">
                  <span>
                    <i className="bx bx-bot mr-1" />
                    assistant:{" "}
                    <code className="bg-gray-100 px-1 rounded">
                      {colActivaObj.assistant_id}
                    </code>
                  </span>
                  <span>
                    <i className="bx bx-book mr-1" />
                    vector_store:{" "}
                    <code className="bg-gray-100 px-1 rounded">
                      {colActivaObj.vector_store_id || "—"}
                    </code>
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              {!loadingCfg && <StatusBadge active={v2Activo} />}
              {loadingCfg && (
                <span className="text-xs text-gray-500">
                  <Spinner /> Cargando...
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-700 bg-blue-50/40"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <i className={tab.icon} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-5 bg-gray-50/40">
            {!columnaActiva && !loadingCols && (
              <div className="text-center py-16 text-gray-500">
                <i className="bx bx-info-circle text-5xl text-gray-300" />
                <p className="mt-2">
                  Selecciona una columna con IA activa para configurar V2.
                </p>
              </div>
            )}

            {columnaActiva && activeTab === "resumen" && (
              <TabResumen
                v2Config={v2Config}
                schema={schema}
                accionMap={accionMap}
                setAccionMap={setAccionMap}
                enumAcciones={enumAcciones}
                estadosDisponibles={estadosDisponibles}
                v2Activo={v2Activo}
                onToggleV2={handleToggleV2}
                onCargarSeed={handleCargarSeedSara}
                onGuardarMapeo={handleGuardarMapeo}
                onEliminarV2={handleEliminarV2}
                loadingCfg={loadingCfg}
              />
            )}

            {columnaActiva && activeTab === "asistente" && (
              <TabAsistente columna={colActivaObj} />
            )}

            {columnaActiva && activeTab === "schema" && (
              <TabSchema
                v2Config={v2Config}
                schema={schema}
                accionMap={accionMap}
                columnaActiva={columnaActiva}
                id_configuracion={id_configuracion}
                onAfterSave={() => cargarConfigV2(columnaActiva)}
                onCargarSeed={handleCargarSeedSara}
              />
            )}

            {columnaActiva && activeTab === "probar" && (
              <TabProbar
                v2Activo={v2Activo}
                v2Config={v2Config}
                colActivaObj={colActivaObj}
                estadosDisponibles={estadosDisponibles}
                id_configuracion={id_configuracion}
              />
            )}

            {columnaActiva && activeTab === "historial" && (
              <TabHistorial
                id_configuracion={id_configuracion}
                columnaActiva={columnaActiva}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KanbanConfigV2;
