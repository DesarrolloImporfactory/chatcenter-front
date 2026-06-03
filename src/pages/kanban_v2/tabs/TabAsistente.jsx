// Tab Asistente — ver/editar prompt del asistente OpenAI + modelo
import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import chatApi from "../../../api/chatcenter";
import { Card, Btn, Pill, Spinner } from "../componentes/ui";
import { PROMPTS_DISPONIBLES } from "../promptsV2";

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

const MODELOS = ["gpt-4o-mini", "gpt-4o", "gpt-4.1", "gpt-3.5-turbo"];

export default function TabAsistente({ columna, onAfterUpdate }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState(null);
  const [form, setForm] = useState({
    nombre: "",
    instrucciones: "",
    modelo: "gpt-4o-mini",
  });

  const cargarAsistente = async () => {
    if (!columna?.id) return;
    setLoading(true);
    try {
      const { data } = await chatApi.post("/kanban_columnas/obtener_asistente", {
        id: columna.id,
      });
      if (data?.success) {
        const a = data.data || {};
        setInfo(a);
        setForm({
          nombre: a.nombre || columna.nombre || "",
          instrucciones: a.instrucciones || "",
          modelo: a.modelo || "gpt-4o-mini",
        });
      }
    } catch (e) {
      Toast.fire({ icon: "error", title: "No se pudo cargar el asistente" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarAsistente();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columna?.id]);

  const guardar = async () => {
    if (!form.instrucciones.trim()) {
      Toast.fire({ icon: "warning", title: "Las instrucciones no pueden estar vacías" });
      return;
    }
    const r = await Swal.fire({
      title: "¿Guardar cambios en el asistente?",
      html: `Se actualiza en <strong>OpenAI Platform</strong> + BD local.<br/>El cambio aplica inmediato a todas las pruebas y mensajes que entren a esta columna.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, guardar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#10b981",
    });
    if (!r.isConfirmed) return;

    setSaving(true);
    try {
      await chatApi.post("/kanban_columnas/actualizar_asistente", {
        id: columna.id,
        nombre: form.nombre,
        instrucciones: form.instrucciones,
        modelo: form.modelo,
        // Preservar valores actuales de la columna (el back hace UPDATE
        // con estos campos, y si no se envian quedan null violando NOT NULL).
        activa_ia: columna.activa_ia ?? 1,
        max_tokens: columna.max_tokens ?? 1900,
      });
      Toast.fire({ icon: "success", title: "Asistente actualizado" });
      await cargarAsistente();
      onAfterUpdate?.();
    } catch (e) {
      Toast.fire({
        icon: "error",
        title: e?.response?.data?.message || "Error guardando",
      });
    } finally {
      setSaving(false);
    }
  };

  const cargarPreset = (preset) => {
    Swal.fire({
      title: `¿Cargar prompt "${preset.label}"?`,
      text: "Esto reemplaza las instrucciones actuales (sin guardar todavía).",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, cargar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#3b82f6",
    }).then((r) => {
      if (r.isConfirmed) {
        setForm((prev) => ({ ...prev, instrucciones: preset.content }));
        Toast.fire({
          icon: "info",
          title: "Prompt cargado en el editor — recuerda guardar",
        });
      }
    });
  };

  if (!columna) {
    return (
      <Card>
        <p className="text-gray-500 text-sm">Selecciona una columna primero.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info del asistente */}
      <Card title="Asistente OpenAI" icon="bx bx-bot">
        {loading ? (
          <div className="text-gray-500 text-sm">
            <Spinner /> Cargando info del asistente...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500 block text-xs">assistant_id</span>
              <span className="font-mono text-gray-800 text-xs break-all">
                {columna.assistant_id || "—"}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block text-xs">vector_store_id</span>
              <span className="font-mono text-gray-800 text-xs break-all">
                {columna.vector_store_id || "—"}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block text-xs">file_search</span>
              <Pill color={info?.archivos_count ? "emerald" : "gray"}>
                {info?.archivos_count || 0} archivos
              </Pill>
            </div>
          </div>
        )}
      </Card>

      {/* Presets de prompts */}
      <Card title="Cargar prompt recomendado" icon="bx bx-bookmark">
        <p className="text-sm text-gray-600 mb-3">
          Estos prompts ya están adaptados al schema V2. Cárgalos para reemplazar
          las instrucciones del editor (debes guardar después).
        </p>
        <div className="space-y-2">
          {PROMPTS_DISPONIBLES.map((preset) => (
            <div
              key={preset.id}
              className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/40 transition"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="font-medium text-gray-800">{preset.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {preset.descripcion}
                  </div>
                </div>
                <Btn
                  variant="primary"
                  size="sm"
                  icon="bx bx-download"
                  onClick={() => cargarPreset(preset)}
                >
                  Cargar
                </Btn>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Editor de prompt + modelo */}
      <Card
        title="Instrucciones del asistente"
        icon="bx bx-edit-alt"
        action={
          <Btn
            variant="success"
            icon="bx bx-save"
            loading={saving}
            onClick={guardar}
          >
            Guardar en OpenAI
          </Btn>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Nombre del asistente
            </label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Modelo
            </label>
            <select
              value={form.modelo}
              onChange={(e) => setForm({ ...form, modelo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
            >
              {MODELOS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="block text-xs font-medium text-gray-600 mb-1">
          Instrucciones (system prompt)
        </label>
        <textarea
          rows={26}
          value={form.instrucciones}
          onChange={(e) => setForm({ ...form, instrucciones: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-xs leading-relaxed"
          placeholder="Pega aquí las instrucciones que recibe el modelo en cada run..."
        />
        <div className="mt-2 flex justify-between text-xs text-gray-500">
          <span>{form.instrucciones.length} caracteres</span>
          <span className="italic">
            Tip: con V2, evita reglas tipo "[tag]:true". El JSON sale del schema.
          </span>
        </div>
      </Card>
    </div>
  );
}
