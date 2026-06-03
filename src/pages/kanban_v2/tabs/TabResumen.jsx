// Tab Resumen — estado V2, mapeo de acciones
import React from "react";
import { Card, Toggle, Pill, Btn, EmptyState } from "../componentes/ui";

const ACCION_META = {
  generar_guia: { label: "Generar guía", color: "emerald", icon: "bx bx-package" },
  cancelar: { label: "Cancelar", color: "rose", icon: "bx bx-x-circle" },
  escalar_asesor: { label: "Escalar a asesor", color: "amber", icon: "bx bx-user-voice" },
};

export default function TabResumen({
  v2Config,
  schema,
  accionMap,
  setAccionMap,
  enumAcciones,
  estadosDisponibles,
  v2Activo,
  onToggleV2,
  onCargarSeed,
  onGuardarMapeo,
  onEliminarV2,
  loadingCfg,
}) {
  // Detectar estados que no existen en el tablero
  const validEstados = new Set(estadosDisponibles.map((e) => e.value));

  return (
    <div className="space-y-6">
      {/* Card 1 — Estado V2 */}
      <Card
        title="Estado del flujo V2"
        icon="bx bx-toggle-right"
        action={
          v2Config && (
            <button
              onClick={onEliminarV2}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium"
            >
              Eliminar config V2
            </button>
          )
        }
      >
        {!v2Config && (
          <EmptyState
            icon="bx bx-package"
            title="Esta columna aún no tiene configuración V2"
            description="Carga el schema seed de Sara para inicializar."
            action={
              <Btn variant="primary" size="lg" icon="bx bx-download" onClick={onCargarSeed}>
                Cargar seed Sara (Imporshop)
              </Btn>
            }
          />
        )}

        {v2Config && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">V2 habilitado</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Cuando llegue un mensaje a esta columna, se procesa con
                  structured outputs. Si lo desactivas vuelve a V1.
                </p>
              </div>
              <Toggle checked={v2Activo} onChange={onToggleV2} disabled={loadingCfg} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-gray-100 text-sm">
              <div>
                <span className="text-gray-500 block text-xs">Schema</span>
                <span className="font-mono text-gray-800">{schema?.name || "—"}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">Modelo override</span>
                <span className="font-mono text-gray-800">
                  {v2Config?.modelo || "(default del assistant)"}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">Última actualización</span>
                <span className="font-mono text-gray-800 text-xs">
                  {v2Config?.updated_at
                    ? new Date(v2Config.updated_at).toLocaleString()
                    : "—"}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100">
              <button
                onClick={onCargarSeed}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
              >
                <i className="bx bx-refresh" />
                Re-cargar seed Sara (sobreescribe schema)
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Card 2 — Mapeo accion -> estado_db */}
      {v2Config && schema && (
        <Card
          title="Mapeo de acciones → cambio de estado"
          icon="bx bx-transfer-alt"
          action={
            <Btn variant="success" icon="bx bx-save" onClick={onGuardarMapeo}>
              Guardar mapeo
            </Btn>
          }
        >
          <p className="text-sm text-gray-600 mb-4">
            Cada vez que el modelo devuelva una de estas acciones, el cliente
            se moverá automáticamente al estado seleccionado.
          </p>

          {/* Warning si algún mapeo apunta a estado inexistente */}
          {enumAcciones.some((a) => accionMap[a] && !validEstados.has(accionMap[a])) && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-800 flex gap-2">
              <i className="bx bx-error text-lg shrink-0" />
              <div>
                <strong>Atención:</strong> uno o más mapeos apuntan a estados
                que <strong>no existen</strong> como columnas del tablero. Los
                clientes desaparecerán del kanban si se dispara esa acción.
              </div>
            </div>
          )}

          <div className="space-y-3">
            {enumAcciones.length === 0 && (
              <p className="text-sm text-gray-500 italic">
                El schema actual no define acciones.
              </p>
            )}

            {enumAcciones.map((accion) => {
              const meta = ACCION_META[accion] || {
                label: accion,
                color: "gray",
                icon: "bx bx-dot",
              };
              const target = accionMap[accion];
              const targetExists = !target || validEstados.has(target);
              return (
                <div
                  key={accion}
                  className={`flex flex-col md:flex-row md:items-center gap-3 p-3 rounded-lg border bg-${meta.color}-50 border-${meta.color}-200`}
                >
                  <div
                    className={`flex items-center gap-2 min-w-[180px] text-${meta.color}-700 font-medium`}
                  >
                    <i className={`${meta.icon} text-xl`} />
                    <span>{meta.label}</span>
                  </div>
                  <i className="bx bx-right-arrow-alt text-2xl text-gray-400 hidden md:inline" />
                  <div className="flex-1 flex flex-col gap-1">
                    <select
                      value={target || ""}
                      onChange={(e) =>
                        setAccionMap((prev) => ({
                          ...prev,
                          [accion]: e.target.value,
                        }))
                      }
                      className={`w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        targetExists ? "border-gray-300" : "border-rose-400"
                      }`}
                    >
                      <option value="">— No cambiar de estado —</option>
                      {estadosDisponibles.map((es) => (
                        <option key={es.value} value={es.value}>
                          {es.label}
                        </option>
                      ))}
                    </select>
                    {!targetExists && (
                      <span className="text-xs text-rose-600">
                        ⚠ "{target}" no existe como columna activa
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
            <i className="bx bx-info-circle mr-1" />
            La acción <code className="bg-blue-100 px-1 rounded">"ninguna"</code>{" "}
            no aparece aquí — significa que el modelo decidió no mover al
            cliente.
          </div>
        </Card>
      )}
    </div>
  );
}
