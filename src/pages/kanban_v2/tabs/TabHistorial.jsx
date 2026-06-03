// Tab Historial — pedidos extraídos por V2
import React, { useState, useEffect, useCallback } from "react";
import chatApi from "../../../api/chatcenter";
import { Card, Btn, Pill, EmptyState, Spinner } from "../componentes/ui";

const ACCION_COLOR = {
  generar_guia: "emerald",
  cancelar: "rose",
  escalar_asesor: "amber",
  ninguna: "gray",
};

export default function TabHistorial({ id_configuracion, columnaActiva }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    solo_generar_guia: false,
    scope: "columna", // "columna" | "config"
    limit: 20,
  });

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const body = {
        id_configuracion,
        limit: filtros.limit,
        solo_generar_guia: filtros.solo_generar_guia,
      };
      if (filtros.scope === "columna" && columnaActiva) {
        body.id_kanban_columna = columnaActiva;
      }
      const { data } = await chatApi.post("/kanban_ia_v2/pedidos_recientes", body);
      setRows(data?.data || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [id_configuracion, columnaActiva, filtros]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <div className="space-y-4">
      <Card title="Filtros" icon="bx bx-filter-alt">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Alcance
            </label>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                className={`flex-1 px-3 py-1.5 text-xs rounded-md font-medium ${
                  filtros.scope === "columna"
                    ? "bg-white shadow text-gray-800"
                    : "text-gray-600"
                }`}
                onClick={() => setFiltros({ ...filtros, scope: "columna" })}
              >
                Solo esta columna
              </button>
              <button
                className={`flex-1 px-3 py-1.5 text-xs rounded-md font-medium ${
                  filtros.scope === "config"
                    ? "bg-white shadow text-gray-800"
                    : "text-gray-600"
                }`}
                onClick={() => setFiltros({ ...filtros, scope: "config" })}
              >
                Toda la configuración
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Filtrar acción
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filtros.solo_generar_guia}
                onChange={(e) =>
                  setFiltros({ ...filtros, solo_generar_guia: e.target.checked })
                }
                className="rounded"
              />
              Solo "generar_guia"
            </label>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Cantidad
            </label>
            <select
              value={filtros.limit}
              onChange={(e) =>
                setFiltros({ ...filtros, limit: parseInt(e.target.value, 10) })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="10">Últimos 10</option>
              <option value="20">Últimos 20</option>
              <option value="50">Últimos 50</option>
              <option value="100">Últimos 100</option>
            </select>
          </div>
        </div>
      </Card>

      <Card
        title={`Pedidos extraídos por V2 (${rows.length})`}
        icon="bx bx-history"
        action={
          <button
            onClick={cargar}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
          >
            <i className="bx bx-refresh" />
            Refrescar
          </button>
        }
      >
        {loading && (
          <div className="text-gray-500 text-sm py-4">
            <Spinner /> Cargando pedidos...
          </div>
        )}
        {!loading && rows.length === 0 && (
          <EmptyState
            icon="bx bx-package"
            title="Sin pedidos aún"
            description="Cuando V2 extraiga información de un cliente, aparecerá aquí."
          />
        )}
        {!loading && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                  <th className="px-2 py-2 font-medium">Fecha</th>
                  <th className="px-2 py-2 font-medium">Cliente</th>
                  <th className="px-2 py-2 font-medium">Acción</th>
                  <th className="px-2 py-2 font-medium">Producto</th>
                  <th className="px-2 py-2 font-medium">Total</th>
                  <th className="px-2 py-2 font-medium">Pedido</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const p = r.pedido_json || {};
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-2 py-2 text-xs text-gray-600 whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                      <td className="px-2 py-2">
                        <div className="font-medium text-gray-800">
                          {r.nombre_cliente || "—"}
                        </div>
                        <div className="text-xs text-gray-500">
                          <code>{r.telefono || "—"}</code>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <Pill color={ACCION_COLOR[r.accion] || "gray"}>
                          {r.accion}
                        </Pill>
                      </td>
                      <td className="px-2 py-2 text-sm">
                        {p.producto || "—"}
                        {p.cantidad ? (
                          <span className="text-xs text-gray-500"> × {p.cantidad}</span>
                        ) : null}
                      </td>
                      <td className="px-2 py-2 font-mono text-sm">
                        {p.total != null ? `$${p.total}` : "—"}
                      </td>
                      <td className="px-2 py-2">
                        <details className="text-xs">
                          <summary className="text-blue-600 cursor-pointer hover:underline">
                            ver detalle
                          </summary>
                          <pre className="mt-1 bg-gray-900 text-emerald-300 p-2 rounded text-xs overflow-x-auto max-w-md">
                            {JSON.stringify(p, null, 2)}
                          </pre>
                        </details>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
