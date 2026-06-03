// Tab Schema — ver/editar el JSON Schema usado en response_format
import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import chatApi from "../../../api/chatcenter";
import { Card, Btn, Pill, EmptyState } from "../componentes/ui";

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

export default function TabSchema({
  v2Config,
  schema,
  accionMap,
  columnaActiva,
  id_configuracion,
  onAfterSave,
  onCargarSeed,
}) {
  const [view, setView] = useState("visual"); // "visual" | "json"
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (schema) setJsonText(JSON.stringify(schema, null, 2));
  }, [schema]);

  const guardarSchema = async () => {
    setError(null);
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      setError("JSON inválido: " + e.message);
      return;
    }
    if (!parsed?.name || !parsed?.schema) {
      setError('Estructura inválida. Debe ser { name, strict?, schema }');
      return;
    }

    const r = await Swal.fire({
      title: "¿Guardar nuevo schema?",
      text: "Esto sobreescribe el schema actual de V2 para esta columna.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, guardar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#10b981",
    });
    if (!r.isConfirmed) return;

    setSaving(true);
    try {
      await chatApi.post("/kanban_ia_v2/config/guardar", {
        id_configuracion,
        id_kanban_columna: columnaActiva,
        response_schema: parsed,
        accion_map: accionMap || {},
        modelo: v2Config?.modelo,
        activo: v2Config?.activo ?? 1,
      });
      Toast.fire({ icon: "success", title: "Schema guardado" });
      onAfterSave?.();
    } catch (err) {
      Toast.fire({
        icon: "error",
        title: err?.response?.data?.message || "Error guardando schema",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!v2Config) {
    return (
      <Card>
        <EmptyState
          icon="bx bx-package"
          title="Sin schema cargado"
          description="Carga primero el schema seed de Sara para tener algo que editar."
          action={
            <Btn variant="primary" icon="bx bx-download" onClick={onCargarSeed}>
              Cargar seed Sara
            </Btn>
          }
        />
      </Card>
    );
  }

  // Vista visual: lista de campos del schema
  const props = schema?.schema?.properties || {};
  const required = new Set(schema?.schema?.required || []);

  return (
    <div className="space-y-6">
      <Card
        title={`Schema: ${schema?.name || "—"}`}
        icon="bx bx-code-curly"
        action={
          <div className="flex gap-2">
            <button
              className={`px-3 py-1 text-xs rounded-md font-medium ${
                view === "visual"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
              onClick={() => setView("visual")}
            >
              <i className="bx bx-list-ul mr-1" />
              Visual
            </button>
            <button
              className={`px-3 py-1 text-xs rounded-md font-medium ${
                view === "json"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
              onClick={() => setView("json")}
            >
              <i className="bx bx-code-alt mr-1" />
              JSON
            </button>
          </div>
        }
      >
        <div className="text-xs text-gray-600 mb-3 flex items-center gap-3 flex-wrap">
          <span>
            <strong>strict:</strong>{" "}
            <Pill color={schema?.strict ? "emerald" : "amber"}>
              {schema?.strict ? "true (JSON garantizado)" : "false (best-effort)"}
            </Pill>
          </span>
          <span>
            <strong>required:</strong> {required.size} campos
          </span>
        </div>

        {view === "visual" && (
          <div className="space-y-2">
            {Object.entries(props).map(([key, val]) => (
              <div
                key={key}
                className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <code className="font-mono font-semibold text-blue-700">
                      {key}
                    </code>
                    <span className="text-xs text-gray-500">
                      {Array.isArray(val.type) ? val.type.join(" | ") : val.type}
                    </span>
                    {val.enum && (
                      <Pill color="violet" icon="bx bx-list-ul">
                        enum
                      </Pill>
                    )}
                    {required.has(key) && (
                      <Pill color="rose">required</Pill>
                    )}
                  </div>
                </div>
                {val.description && (
                  <p className="text-xs text-gray-600 mt-1.5 italic">
                    {val.description}
                  </p>
                )}
                {val.enum && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {val.enum.map((e) => (
                      <code
                        key={e}
                        className="text-xs bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded border border-violet-200"
                      >
                        {String(e)}
                      </code>
                    ))}
                  </div>
                )}
                {val.properties && (
                  <details className="mt-2">
                    <summary className="text-xs text-blue-600 cursor-pointer hover:underline">
                      Ver subcampos ({Object.keys(val.properties).length})
                    </summary>
                    <div className="mt-2 ml-4 space-y-1 text-xs">
                      {Object.entries(val.properties).map(([k2, v2]) => (
                        <div key={k2} className="flex gap-2">
                          <code className="font-mono text-gray-700">{k2}</code>
                          <span className="text-gray-400">
                            {Array.isArray(v2.type) ? v2.type.join("|") : v2.type}
                          </span>
                          {v2.description && (
                            <span className="text-gray-500 italic truncate">
                              — {v2.description}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}

        {view === "json" && (
          <div>
            <textarea
              rows={26}
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setError(null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-xs leading-relaxed"
            />
            {error && (
              <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
                <i className="bx bx-error mr-1" />
                {error}
              </div>
            )}
            <div className="mt-3 flex justify-between items-center">
              <span className="text-xs text-gray-500">
                {jsonText.length} caracteres
              </span>
              <Btn
                variant="success"
                icon="bx bx-save"
                loading={saving}
                onClick={guardarSchema}
              >
                Guardar schema
              </Btn>
            </div>
          </div>
        )}
      </Card>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
        <i className="bx bx-info-circle mr-1" />
        Si rompes el schema sin querer, vuelve a cargar el seed Sara desde la
        pestaña <strong>Resumen</strong>.
      </div>
    </div>
  );
}
