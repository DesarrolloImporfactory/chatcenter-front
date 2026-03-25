// TabAsistente.jsx
// ─────────────────────────────────────────────────────────────
// Maneja todo su estado internamente.
// NO llama cargarColumnas() del padre en ningún caso.
// Solo notifica al padre cuando se CREA un asistente nuevo
// (para que el sidebar muestre el badge IA) vía onAssistantCreado(assistant_id).
//
// Uso en KanbanConfig:
//   {tabActiva === "asistente" && (
//     <TabAsistente
//       columnaId={columnaActiva}
//       columnaActiva_ia={columnaSeleccionada?.activa_ia}
//       columnaMax_tokens={columnaSeleccionada?.max_tokens}
//       onAssistantCreado={(assistant_id) => {
//         // Solo actualiza el campo en la columna local — sin petición al servidor
//         setColumnas((prev) =>
//           prev.map((c) => c.id === columnaActiva ? { ...c, assistant_id } : c)
//         );
//       }}
//     />
//   )}
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import chatApi from "../../../api/chatcenter"; // ajusta tu ruta

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3500,
  timerProgressBar: true,
});

const MODELOS = [
  {
    value: "gpt-4o",
    label: "GPT-4o",
    desc: "Más potente y preciso",
    color: "#6366f1",
  },
  {
    value: "gpt-4o-mini",
    label: "GPT-4o mini",
    desc: "Rápido y económico",
    color: "#10b981",
  },
  {
    value: "gpt-3.5-turbo",
    label: "GPT-3.5 Turbo",
    desc: "Básico, muy económico",
    color: "#f59e0b",
  },
];

const FORMATOS_VALIDOS = "PDF, DOCX, TXT, CSV, JSON, MD, XLSX, PPTX, HTML";

function formatBytes(b) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

// ─────────────────────────────────────────────────────────────
const TabAsistente = ({
  columnaId,
  columnaActiva_ia,
  columnaMax_tokens,
  onAssistantCreado,
  onColumnaActualizada,
  idConfiguracion, // ← agregar
  columnas, // ← agregar (para el select de estado destino)
}) => {
  // ── Datos del asistente (cargados una sola vez por columna) ─
  const [asistente, setAsistente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Formulario crear ─────────────────────────────────────
  const [modoCrear, setModoCrear] = useState(false);
  const [formCrear, setFormCrear] = useState({
    nombre: "",
    instrucciones: "",
    modelo: "gpt-4o-mini",
  });
  const [creando, setCreando] = useState(false);

  // ── Formulario editar ────────────────────────────────────
  const [formEditar, setFormEditar] = useState(null);
  const [guardando, setGuardando] = useState(false);

  // ── Toggles locales (no disparan recarga del padre) ──────
  const [activa_ia, setActiva_ia] = useState(columnaActiva_ia ?? 0);
  const [max_tokens, setMax_tokens] = useState(columnaMax_tokens || 500);

  // ── Archivos (estado completamente local) ────────────────
  const fileInputRef = useRef(null);
  const [archivos, setArchivos] = useState([]);
  const [subiendo, setSubiendo] = useState(false);
  const [errorArchivo, setErrorArchivo] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);

  // ── Cargar asistente solo cuando cambia la columna ───────
  // ¡NO recarga cuando se guarda — solo cuando cambia columnaId!
  useEffect(() => {
    if (!columnaId) return;
    // Resetear estado al cambiar de columna
    setAsistente(null);
    setFormEditar(null);
    setArchivos([]);
    setErrorArchivo(null);
    setModoCrear(false);
    setActiva_ia(columnaActiva_ia ?? 0);
    setMax_tokens(columnaMax_tokens || 500);
    cargarAsistente();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnaId]);

  // ── Sincronizar activa_ia desde props cuando cambia ──────────
  // (por ejemplo al recargar la página y cargar el valor de BD)
  useEffect(() => {
    setActiva_ia(columnaActiva_ia ?? 0);
  }, [columnaActiva_ia]);

  useEffect(() => {
    setMax_tokens(columnaMax_tokens || 500);
  }, [columnaMax_tokens]);

  const cargarAsistente = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await chatApi.post(
        "/kanban_columnas/obtener_asistente",
        { id: columnaId },
      );
      console.log("🔍 obtener_asistente response:", data);
      if (data?.success && data.data) {
        setAsistente(data.data);
        setArchivos(data.data.archivos || []);
        setFormEditar({
          nombre: data.data.nombre || "",
          instrucciones: data.data.instrucciones || "",
          modelo: data.data.modelo || "gpt-4o-mini",
        });
      } else {
        setAsistente(null);
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Error al cargar asistente",
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Crear asistente ──────────────────────────────────────
  const crearAsistente = async () => {
    if (!formCrear.instrucciones.trim()) {
      Toast.fire({
        icon: "warning",
        title: "Las instrucciones son obligatorias",
      });
      return;
    }
    setCreando(true);
    try {
      const { data } = await chatApi.post("/kanban_columnas/crear_asistente", {
        id: columnaId,
        nombre: formCrear.nombre,
        instrucciones: formCrear.instrucciones,
        modelo: formCrear.modelo,
      });
      if (data?.success) {
        Toast.fire({ icon: "success", title: "¡Asistente creado!" });
        setModoCrear(false);

        // Actualizar estado local directamente sin recargar
        const nuevoAsistente = {
          assistant_id: data.assistant_id,
          nombre: data.nombre,
          instrucciones: data.instrucciones,
          modelo: data.modelo,
          vector_store_id: null,
          archivos: [],
        };
        setAsistente(nuevoAsistente);
        setArchivos([]);
        setFormEditar({
          nombre: data.nombre,
          instrucciones: data.instrucciones,
          modelo: data.modelo,
        });

        // Notificar al padre SOLO para actualizar el badge del sidebar
        // El padre actualiza solo ese campo en su estado local — sin petición
        onAssistantCreado?.(data.assistant_id);
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err.message ||
        "Error al crear asistente";
      await Swal.fire({
        title: "Error al crear asistente",
        text: msg,
        icon: "error",
        confirmButtonColor: "#6366f1",
      });
    } finally {
      setCreando(false);
    }
  };

  // ── Guardar cambios del asistente ────────────────────────
  // No toca el padre en absoluto — todo queda en estado local
  const guardarAsistente = async () => {
    setGuardando(true);
    try {
      await chatApi.post("/kanban_columnas/actualizar_asistente", {
        id: columnaId,
        nombre: formEditar.nombre,
        instrucciones: formEditar.instrucciones,
        modelo: formEditar.modelo,
        activa_ia,
        max_tokens,
      });
      // Actualizar nombre/modelo en el estado local del asistente
      setAsistente((prev) => ({
        ...prev,
        nombre: formEditar.nombre,
        instrucciones: formEditar.instrucciones,
        modelo: formEditar.modelo,
      }));
      Toast.fire({ icon: "success", title: "Asistente actualizado" });
      // ✅ Notificar al padre para que actualice su estado local
      onColumnaActualizada?.({ activa_ia, max_tokens });
    } catch (err) {
      const msg =
        err?.response?.data?.message || err.message || "Error al actualizar";
      await Swal.fire({
        title: "Error al actualizar",
        text: msg,
        icon: "error",
        confirmButtonColor: "#6366f1",
      });
    } finally {
      setGuardando(false);
    }
  };

  // ── Subir archivo — actualiza lista local sin recargar ───
  const subirArchivo = async (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    e.target.value = "";
    setErrorArchivo(null);
    setSubiendo(true);

    const formData = new FormData();
    formData.append("file", archivo);
    formData.append("id", columnaId);

    try {
      const { data } = await chatApi.post(
        "/kanban_columnas/subir_archivo",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 120000,
        },
      );

      if (data?.success) {
        Toast.fire({
          icon: "success",
          title: `"${archivo.name}" subido y procesado`,
        });

        // Agregar directo a la lista local sin recargar nada
        const nuevoArchivo = {
          id: data.file_id,
          nombre: data.nombre || archivo.name,
          bytes: data.bytes || archivo.size,
          status: data.status || "completed",
        };
        setArchivos((prev) => [...prev, nuevoArchivo]);

        // Si se creó un nuevo vector store, actualizar en el asistente local
        if (data.vector_store_id && asistente) {
          setAsistente((prev) => ({
            ...prev,
            vector_store_id: data.vector_store_id,
          }));
        }
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message || err.message || "Error al subir archivo";
      setErrorArchivo(msg);
    } finally {
      setSubiendo(false);
    }
  };

  // ── Eliminar archivo — solo actualiza lista local ────────
  const eliminarArchivo = async (file_id, nombre) => {
    const res = await Swal.fire({
      title: "¿Eliminar archivo?",
      text: `Se eliminará "${nombre}" del asistente. Esta acción no se puede deshacer.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!res.isConfirmed) return;

    setEliminandoId(file_id);
    try {
      const { data } = await chatApi.post("/kanban_columnas/eliminar_archivo", {
        id: columnaId,
        file_id,
      });

      if (data?.success) {
        // Quitar del estado local directamente
        setArchivos((prev) => prev.filter((a) => a.id !== file_id));
        Toast.fire({ icon: "success", title: "Archivo eliminado" });
      } else if (data?.errores?.length) {
        await Swal.fire({
          title: "Advertencia al eliminar",
          text: data.errores.join("\n"),
          icon: "warning",
          confirmButtonColor: "#6366f1",
        });
        // Aún así, quitar de la lista local si fue removido del vector store
        setArchivos((prev) => prev.filter((a) => a.id !== file_id));
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err.message;
      Toast.fire({ icon: "error", title: msg });
    } finally {
      setEliminandoId(null);
    }
  };

  // ── Sección de Triggers de cambio de estado ──────────────────
  const [triggers, setTriggers] = useState([]);
  const [loadingTriggers, setLoadingTriggers] = useState(false);
  const [nuevoTrigger, setNuevoTrigger] = useState({
    trigger: "",
    estado_destino: "",
  });

  // Cargar triggers al montar / cambiar columna
  useEffect(() => {
    if (!columnaId) return;
    cargarTriggers();
  }, [columnaId]);

  const cargarTriggers = async () => {
    setLoadingTriggers(true);
    try {
      const res = await chatApi.post("/kanban_acciones/listar", {
        id_kanban_columna: columnaId,
      });
      const acciones = res.data.data || [];
      const soloTriggers = acciones.filter(
        (a) => a.tipo_accion === "cambiar_estado",
      );
      setTriggers(soloTriggers);
      // ← Detectar si tiene contexto_productos
      setTieneContextoProductos(
        acciones.some((a) => a.tipo_accion === "contexto_productos"),
      );
    } catch (err) {
      Toast.fire({ icon: "error", title: "Error al cargar triggers" });
    } finally {
      setLoadingTriggers(false);
    }
  };

  const sincronizarCatalogo = async () => {
    Swal.fire({
      title: "Sincronizando catálogo",
      html: "Por favor espere mientras se sincronizan todos los productos.<br><br><small style='color:#64748b'>Esto puede demorar un momento dependiendo de la cantidad de productos que posea.</small>",
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const { data } = await chatApi.post(
        "/kanban_columnas/sincronizar_catalogo",
        { id: columnaId },
        { timeout: 120000 }
      );
      if (data?.success) {
        setUltimaSync(new Date());
        Swal.fire({
          icon: "success",
          title: "¡Catálogo sincronizado!",
          text: `Se indexaron ${data.data.total_items} productos correctamente.`,
          confirmButtonColor: "#6366f1",
        });
      }
    } catch (err) {
      Swal.fire({
        icon: "warning",
        title: "Error al sincronizar",
        text:
          err?.response?.data?.message ||
          err.message ||
          "No se pudo sincronizar el catálogo.",
        confirmButtonColor: "#6366f1",
      });
    }
  };

  const agregarTrigger = async () => {
    if (!nuevoTrigger.trigger.trim() || !nuevoTrigger.estado_destino.trim()) {
      Toast.fire({
        icon: "warning",
        title: "Completa palabra clave y estado destino",
      });
      return;
    }
    try {
      await chatApi.post("/kanban_acciones/crear", {
        id_kanban_columna: columnaId,
        id_configuracion: idConfiguracion,
        tipo_accion: "cambiar_estado",
        config: JSON.stringify({
          trigger: `[${nuevoTrigger.trigger.trim()}]:true`,
          estado_destino: nuevoTrigger.estado_destino.trim(),
        }),
        activo: 1,
        orden: triggers.length + 1,
      });
      setNuevoTrigger({ trigger: "", estado_destino: "" });
      await cargarTriggers();
      Toast.fire({ icon: "success", title: "Trigger guardado" });
    } catch (err) {
      Toast.fire({ icon: "error", title: "Error al guardar trigger" });
    }
  };

  const eliminarTrigger = async (id) => {
    try {
      await chatApi.post("/kanban_acciones/eliminar", { id });
      await cargarTriggers();
      Toast.fire({ icon: "success", title: "Trigger eliminado" });
    } catch (err) {
      Toast.fire({ icon: "error", title: "Error al eliminar" });
    }
  };

  const [sincronizando, setSincronizando] = useState(false);
  const [ultimaSync, setUltimaSync] = useState(null);
  const [tieneContextoProductos, setTieneContextoProductos] = useState(false);

  const toggleContextoProductos = async () => {
    const nuevoValor = !tieneContextoProductos;
    try {
      if (nuevoValor) {
        await chatApi.post("/kanban_acciones/crear", {
          id_kanban_columna: columnaId,
          id_configuracion: idConfiguracion,
          tipo_accion: "contexto_productos",
          config: JSON.stringify({}),
          activo: 1,
          orden: 0,
        });
        setTieneContextoProductos(true);
        // Auto-sync con Swal
        await sincronizarCatalogo();
      } else {
        const res = await chatApi.post("/kanban_acciones/listar", {
          id_kanban_columna: columnaId,
        });
        const accion = (res.data.data || []).find(
          (a) => a.tipo_accion === "contexto_productos",
        );
        if (accion)
          await chatApi.post("/kanban_acciones/eliminar", { id: accion.id });
        setTieneContextoProductos(false);
        Toast.fire({ icon: "success", title: "Catálogo desactivado" });
      }
    } catch (err) {
      Toast.fire({ icon: "error", title: "Error al actualizar" });
    }
  };

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────
  if (loading)
    return (
      <div
        style={{
          padding: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          color: "#94a3b8",
        }}
      >
        <i
          className="bx bx-loader-alt bx-spin"
          style={{ fontSize: "1.5rem" }}
        />
        <span style={{ fontSize: "0.9rem" }}>Cargando asistente...</span>
      </div>
    );

  if (error)
    return (
      <div style={{ padding: 24 }}>
        <div
          style={{
            padding: "14px 18px",
            borderRadius: 12,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            fontSize: "0.88rem",
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
          }}
        >
          <i
            className="bx bx-error-circle"
            style={{ fontSize: "1.2rem", flexShrink: 0, marginTop: 1 }}
          />
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>
              Error al conectar con OpenAI
            </div>
            <div>{error}</div>
            <button
              onClick={cargarAsistente}
              style={{
                marginTop: 10,
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid #fca5a5",
                background: "#fff",
                color: "#b91c1c",
                fontWeight: 600,
                fontSize: "0.82rem",
                cursor: "pointer",
              }}
            >
              <i className="bx bx-refresh" style={{ marginRight: 5 }} />
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div style={{ padding: 24 }}>
      {/* Toggle IA (siempre visible) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px",
          borderRadius: 14,
          border: "1px solid rgba(0,0,0,.07)",
          background: activa_ia ? "rgba(99,102,241,.04)" : "#fafafa",
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: activa_ia ? "rgba(99,102,241,.12)" : "#f1f5f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <i
              className="bx bx-bot"
              style={{
                fontSize: "1.4rem",
                color: activa_ia ? "#6366f1" : "#94a3b8",
              }}
            />
          </div>
          <div>
            <div
              style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.95rem" }}
            >
              IA activa en esta columna
            </div>
            <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
              {activa_ia
                ? "El webhook responderá mensajes usando este asistente"
                : "Los mensajes no activarán la IA en esta etapa"}
            </div>
          </div>
        </div>
        <Toggle
          checked={!!activa_ia}
          onChange={async (v) => {
            const nuevoValor = v ? 1 : 0;
            setActiva_ia(nuevoValor);
            try {
              await chatApi.post("/kanban_columnas/actualizar_asistente", {
                id: columnaId,
                activa_ia: nuevoValor,
                max_tokens,
              });
              // Actualizar estado local del padre
              onColumnaActualizada?.({ activa_ia: nuevoValor, max_tokens });
            } catch (err) {
              // Revertir si falla
              setActiva_ia(v ? 0 : 1);
              Toast.fire({ icon: "error", title: "Error al guardar" });
            }
          }}
        />
      </div>

      {/* Sin asistente: botón crear */}
      {!asistente && !modoCrear && (
        <div
          style={{
            textAlign: "center",
            padding: "40px 20px",
            borderRadius: 16,
            border: "2px dashed #e2e8f0",
            background: "#fafbff",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: "rgba(99,102,241,.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 14px",
            }}
          >
            <i
              className="bx bx-bot"
              style={{ fontSize: "2rem", color: "#6366f1" }}
            />
          </div>
          <div
            style={{
              fontWeight: 800,
              fontSize: "1.05rem",
              color: "#0f172a",
              marginBottom: 6,
            }}
          >
            Sin asistente configurado
          </div>
          <div
            style={{
              fontSize: "0.85rem",
              color: "#64748b",
              maxWidth: 340,
              margin: "0 auto 20px",
            }}
          >
            Crea un asistente de OpenAI para esta columna y configura su
            comportamiento directamente aquí.
          </div>
          <button onClick={() => setModoCrear(true)} style={btnPrimario}>
            <i className="bx bx-plus" />
            Crear asistente
          </button>
        </div>
      )}

      {/* Formulario creación */}
      {!asistente && modoCrear && (
        <div
          style={{
            borderRadius: 16,
            border: "1px solid rgba(99,102,241,.2)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 20px",
              background: "rgba(99,102,241,.05)",
              borderBottom: "1px solid rgba(99,102,241,.1)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <i
              className="bx bx-plus-circle"
              style={{ color: "#6366f1", fontSize: "1.2rem" }}
            />
            <span style={{ fontWeight: 700, color: "#0f172a" }}>
              Nuevo asistente
            </span>
          </div>
          <div
            style={{
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div>
              <label style={lbl}>
                Nombre{" "}
                <span style={{ color: "#94a3b8", fontWeight: 400 }}>
                  (opcional — se genera automáticamente)
                </span>
              </label>
              <input
                value={formCrear.nombre}
                onChange={(e) =>
                  setFormCrear((p) => ({ ...p, nombre: e.target.value }))
                }
                style={inp}
                placeholder="Ej: Asistente de ventas"
              />
            </div>
            <div>
              <label style={lbl}>Modelo</label>
              <SelectorModelo
                valor={formCrear.modelo}
                onChange={(v) => setFormCrear((p) => ({ ...p, modelo: v }))}
              />
            </div>
            <div>
              <label style={lbl}>Instrucciones (prompt) *</label>
              <textarea
                value={formCrear.instrucciones}
                onChange={(e) =>
                  setFormCrear((p) => ({ ...p, instrucciones: e.target.value }))
                }
                rows={9}
                style={{ ...inp, resize: "vertical", lineHeight: 1.6 }}
                placeholder={`Eres un asistente de ventas de [empresa]. Ayuda al cliente a conocer los productos y guíalo hacia la compra.\n\nCuando el cliente confirme su pedido incluye en tu respuesta:\n[pedido_confirmado]: true\n\nResponde siempre en español, de forma amable y profesional.`}
              />
              <div
                style={{ fontSize: "0.73rem", color: "#94a3b8", marginTop: 4 }}
              >
                <i className="bx bx-info-circle" style={{ marginRight: 4 }} />
                Incluye los tags de las acciones configuradas, ej:{" "}
                <code>[pedido_confirmado]: true</code>
              </div>
            </div>
            <div
              style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}
            >
              <button onClick={() => setModoCrear(false)} style={btnSecundario}>
                Cancelar
              </button>
              <button
                onClick={crearAsistente}
                disabled={creando}
                style={btnPrimario}
              >
                {creando ? (
                  <>
                    <i className="bx bx-loader-alt bx-spin" />
                    Creando en OpenAI...
                  </>
                ) : (
                  <>
                    <i className="bx bx-check" />
                    Crear asistente
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Asistente existente: edición */}
      {asistente && formEditar && (
        <>
          {/* Badge asistente activo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "11px 16px",
              borderRadius: 12,
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              marginBottom: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <i
                className="bx bx-check-circle"
                style={{ color: "#16a34a", fontSize: "1.3rem" }}
              />
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    color: "#166534",
                  }}
                >
                  Asistente conectado
                </div>
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: "#15803d",
                    fontFamily: "monospace",
                  }}
                >
                  {asistente.assistant_id}
                </div>
              </div>
            </div>

            <a
              href={`https://platform.openai.com/assistants/${asistente.assistant_id}`}
              target="_blank"
              rel="noreferrer"
              style={{
                padding: "5px 11px",
                borderRadius: 8,
                border: "1px solid #86efac",
                background: "#fff",
                color: "#16a34a",
                fontSize: "0.78rem",
                fontWeight: 600,
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <i className="bx bx-link-external" />
              Ver en OpenAI
            </a>
          </div>

          {/* Nombre */}
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Nombre del asistente</label>
            <input
              value={formEditar.nombre}
              onChange={(e) =>
                setFormEditar((p) => ({ ...p, nombre: e.target.value }))
              }
              style={inp}
            />
          </div>

          {/* Modelo */}
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Modelo</label>
            <SelectorModelo
              valor={formEditar.modelo}
              onChange={(v) => setFormEditar((p) => ({ ...p, modelo: v }))}
            />
          </div>

          {/* Max tokens */}
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>
              Tokens máximos por respuesta:{" "}
              <strong style={{ color: "#4338ca" }}>{max_tokens}</strong>
            </label>
            <input
              type="range"
              min={100}
              max={2000}
              step={100}
              value={max_tokens}
              onChange={(e) => setMax_tokens(parseInt(e.target.value))}
              style={{ width: "100%", accentColor: "#6366f1", margin: "6px 0" }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.71rem",
                color: "#94a3b8",
              }}
            >
              <span>100 — rápido</span>
              <span>2000 — detallado</span>
            </div>
          </div>

          {/* Instrucciones */}
          <div style={{ marginBottom: 20 }}>
            <label style={lbl}>Instrucciones (prompt)</label>
            <textarea
              value={formEditar.instrucciones}
              onChange={(e) =>
                setFormEditar((p) => ({ ...p, instrucciones: e.target.value }))
              }
              rows={10}
              style={{ ...inp, resize: "vertical", lineHeight: 1.6 }}
            />
            <div
              style={{ fontSize: "0.73rem", color: "#94a3b8", marginTop: 4 }}
            >
              <i className="bx bx-info-circle" style={{ marginRight: 4 }} />
              Los cambios se guardan en tu base de datos y directamente en
              OpenAI.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: 28,
            }}
          >
            <button
              onClick={guardarAsistente}
              disabled={guardando}
              style={btnPrimario}
            >
              {guardando ? (
                <>
                  <i className="bx bx-loader-alt bx-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <i className="bx bx-save" />
                  Guardar cambios
                </>
              )}
            </button>
          </div>

          {/* ── Catálogo de productos ── */}
          <div
            style={{
              borderTop: "1px solid rgba(0,0,0,.06)",
              paddingTop: 22,
              marginTop: 4,
              marginBottom: 22,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: tieneContextoProductos
                      ? "rgba(99,102,241,.12)"
                      : "#f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <i
                    className="bx bx-package"
                    style={{
                      fontSize: "1.4rem",
                      color: tieneContextoProductos ? "#6366f1" : "#94a3b8",
                    }}
                  />
                </div>
                <div>
                  <div
                    style={{
                      fontWeight: 700,
                      color: "#0f172a",
                      fontSize: "0.95rem",
                    }}
                  >
                    Catálogo de productos
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                    {tieneContextoProductos
                      ? "El asistente consulta el catálogo actualizado"
                      : "Activa para que el asistente conozca tus productos"}
                  </div>
                </div>
              </div>
              <Toggle
                checked={tieneContextoProductos}
                onChange={toggleContextoProductos}
              />
            </div>

            {tieneContextoProductos && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 14,
                }}
              >
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  {ultimaSync
                    ? `Última sync: ${ultimaSync.toLocaleTimeString()}`
                    : "Sin sincronizar aún — presiona el botón para indexar"}
                </div>
                <button
                  onClick={sincronizarCatalogo}
                  disabled={sincronizando}
                  style={btnSecundario}
                >
                  {sincronizando ? (
                    <>
                      <i className="bx bx-loader-alt bx-spin" />{" "}
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <i className="bx bx-refresh" /> Sincronizar catálogo
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Archivos de conocimiento */}
          <div
            style={{ borderTop: "1px solid rgba(0,0,0,.06)", paddingTop: 22 }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    color: "#0f172a",
                  }}
                >
                  <i
                    className="bx bx-file"
                    style={{ marginRight: 7, color: "#6366f1" }}
                  />
                  Archivos de conocimiento
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#64748b",
                    marginTop: 2,
                  }}
                >
                  Formatos: {FORMATOS_VALIDOS}
                </div>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={subirArchivo}
                  style={{ display: "none" }}
                  accept=".pdf,.txt,.md,.html,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.json,.csv,.py,.js,.ts"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={subiendo}
                  style={btnSecundario}
                >
                  {subiendo ? (
                    <>
                      <i className="bx bx-loader-alt bx-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <i className="bx bx-upload" />
                      Subir archivo
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Indicador de subida */}
            {subiendo && (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: "rgba(99,102,241,.06)",
                  border: "1px dashed rgba(99,102,241,.3)",
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <i
                  className="bx bx-loader-alt bx-spin"
                  style={{ color: "#6366f1", fontSize: "1.2rem" }}
                />
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      color: "#4338ca",
                    }}
                  >
                    Procesando e indexando...
                  </div>
                  <div style={{ fontSize: "0.77rem", color: "#6366f1" }}>
                    OpenAI puede tardar hasta 30 segundos en indexar el
                    contenido.
                  </div>
                </div>
              </div>
            )}

            {/* Error de archivo */}
            {errorArchivo && (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  marginBottom: 12,
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <i
                  className="bx bx-error-circle"
                  style={{
                    color: "#dc2626",
                    fontSize: "1.2rem",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      color: "#b91c1c",
                      marginBottom: 3,
                    }}
                  >
                    No se pudo subir el archivo
                  </div>
                  <div style={{ fontSize: "0.83rem", color: "#dc2626" }}>
                    {errorArchivo}
                  </div>
                </div>
                <button
                  onClick={() => setErrorArchivo(null)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#dc2626",
                    padding: 0,
                    fontSize: "1.1rem",
                    lineHeight: 1,
                  }}
                >
                  <i className="bx bx-x" />
                </button>
              </div>
            )}

            {/* Lista archivos */}
            {archivos.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {archivos.map((archivo) => (
                  <div
                    key={archivo.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,.07)",
                      background: "#fafafa",
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: "rgba(99,102,241,.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <i
                        className="bx bxs-file-blank"
                        style={{ color: "#6366f1", fontSize: "1.2rem" }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "0.85rem",
                          color: "#0f172a",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {archivo.nombre}
                      </div>
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "#94a3b8",
                          marginTop: 2,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span>{formatBytes(archivo.bytes)}</span>
                        <span>·</span>
                        <span
                          style={{
                            color:
                              archivo.status === "completed"
                                ? "#16a34a"
                                : "#f59e0b",
                            fontWeight: 600,
                          }}
                        >
                          {archivo.status === "completed"
                            ? "✓ Indexado"
                            : archivo.status}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        eliminarArchivo(archivo.id, archivo.nombre)
                      }
                      disabled={eliminandoId === archivo.id}
                      title="Eliminar archivo"
                      style={{
                        background: "none",
                        border: "none",
                        cursor:
                          eliminandoId === archivo.id ? "wait" : "pointer",
                        color:
                          eliminandoId === archivo.id ? "#cbd5e1" : "#ef4444",
                        padding: 6,
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {eliminandoId === archivo.id ? (
                        <i
                          className="bx bx-loader-alt bx-spin"
                          style={{ fontSize: "1.1rem" }}
                        />
                      ) : (
                        <i
                          className="bx bx-trash"
                          style={{ fontSize: "1.1rem" }}
                        />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              !subiendo && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "24px 20px",
                    borderRadius: 12,
                    border: "2px dashed #e5e7eb",
                    color: "#94a3b8",
                  }}
                >
                  <i
                    className="bx bx-file"
                    style={{
                      fontSize: "1.8rem",
                      marginBottom: 6,
                      display: "block",
                    }}
                  />
                  <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                    Sin archivos de conocimiento
                  </div>
                  <div style={{ fontSize: "0.78rem", marginTop: 3 }}>
                    Sube documentos para que el asistente pueda consultarlos.
                  </div>
                </div>
              )
            )}
          </div>
          {/* ── Triggers de cambio de estado ── */}
          <div
            style={{
              borderTop: "1px solid rgba(0,0,0,.06)",
              paddingTop: 22,
              marginTop: 22,
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: "0.95rem",
                color: "#0f172a",
                marginBottom: 4,
              }}
            >
              <i
                className="bx bx-transfer-alt"
                style={{ marginRight: 7, color: "#6366f1" }}
              />
              Palabras clave → Cambio de estado
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "#64748b",
                marginBottom: 14,
              }}
            >
              Si la IA responde con esta palabra, el contacto cambia de columna
              automáticamente.
            </div>

            {/* Lista de triggers existentes */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginBottom: 14,
              }}
            >
              {loadingTriggers ? (
                <p style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                  Cargando...
                </p>
              ) : triggers.length === 0 ? (
                <p
                  style={{
                    fontSize: "0.8rem",
                    color: "#94a3b8",
                    fontStyle: "italic",
                  }}
                >
                  Sin triggers configurados
                </p>
              ) : (
                triggers.map((t) => {
                  const cfg =
                    typeof t.config === "string"
                      ? JSON.parse(t.config)
                      : t.config || {};
                  return (
                    <div
                      key={t.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: "1px solid rgba(0,0,0,.07)",
                        background: "#fafafa",
                      }}
                    >
                      {/* Palabra clave */}
                      <span
                        style={{
                          fontSize: "0.78rem",
                          fontFamily: "monospace",
                          background: "#ede9fe",
                          color: "#6d28d9",
                          padding: "3px 8px",
                          borderRadius: 6,
                          fontWeight: 700,
                        }}
                      >
                        {cfg.trigger}
                      </span>
                      <i
                        className="bx bx-right-arrow-alt"
                        style={{ color: "#94a3b8" }}
                      />
                      {/* Estado destino */}
                      <span
                        style={{
                          fontSize: "0.78rem",
                          fontFamily: "monospace",
                          background: "#dcfce7",
                          color: "#15803d",
                          padding: "3px 8px",
                          borderRadius: 6,
                          fontWeight: 700,
                        }}
                      >
                        {cfg.estado_destino}
                      </span>
                      <button
                        onClick={() => eliminarTrigger(t.id)}
                        style={{
                          marginLeft: "auto",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#ef4444",
                          padding: 4,
                        }}
                      >
                        <i
                          className="bx bx-trash"
                          style={{ fontSize: "1.1rem" }}
                        />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Formulario nuevo trigger */}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <label style={lbl}>Palabra clave</label>
                <input
                  type="text"
                  placeholder="ej: asesor"
                  value={nuevoTrigger.trigger}
                  onChange={(e) =>
                    setNuevoTrigger((p) => ({
                      ...p,
                      trigger: e.target.value.replace(/[\[\]:]/g, "").trim(),
                    }))
                  }
                  style={inp}
                />
                {/* ← SIN el preview aquí */}
              </div>
              <div style={{ flex: 1 }}>
                <label style={lbl}>Mover a columna</label>
                <select
                  value={nuevoTrigger.estado_destino}
                  onChange={(e) =>
                    setNuevoTrigger((p) => ({
                      ...p,
                      estado_destino: e.target.value,
                    }))
                  }
                  style={{ ...inp, cursor: "pointer" }}
                >
                  <option value="">Seleccionar columna...</option>
                  {(columnas || []).map((c) => (
                    <option key={c.id} value={c.estado_db}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <button onClick={agregarTrigger} style={btnPrimario}>
                <i className="bx bx-plus" /> Agregar
              </button>
            </div>

            {/* Preview FUERA del row — no desplaza nada */}
            {nuevoTrigger.trigger && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 6,
                }}
              >
                <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                  Tag para tu prompt:
                </span>
                <code
                  style={{
                    fontSize: "0.78rem",
                    background: "#ede9fe",
                    color: "#6d28d9",
                    padding: "2px 8px",
                    borderRadius: 6,
                    fontWeight: 700,
                  }}
                >
                  [{nuevoTrigger.trigger}]:true
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `[${nuevoTrigger.trigger}]:true`,
                    );
                    Toast.fire({ icon: "success", title: "¡Tag copiado!" });
                  }}
                  style={{
                    background: "none",
                    border: "1px solid #c4b5fd",
                    borderRadius: 6,
                    cursor: "pointer",
                    color: "#6d28d9",
                    padding: "2px 7px",
                    fontSize: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <i className="bx bx-copy" /> Copiar
                </button>
              </div>
            )}

            <div
              style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 8 }}
            >
              💡 Copia el tag y pégalo en el prompt del asistente...
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// SelectorModelo — reutilizable
// ─────────────────────────────────────────────────────────────
const SelectorModelo = ({ valor, onChange }) => (
  <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
    {MODELOS.map((m) => (
      <button
        key={m.value}
        onClick={() => onChange(m.value)}
        style={{
          flex: 1,
          padding: "10px 8px",
          borderRadius: 12,
          cursor: "pointer",
          border: `2px solid ${valor === m.value ? m.color : "rgba(0,0,0,.1)"}`,
          background: valor === m.value ? `${m.color}0d` : "#fafafa",
          transition: "all .12s",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: "0.85rem",
            color: valor === m.value ? m.color : "#374151",
          }}
        >
          {m.label}
        </div>
        <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 2 }}>
          {m.desc}
        </div>
      </button>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────
// Toggle switch
// ─────────────────────────────────────────────────────────────
const Toggle = ({ checked, onChange }) => (
  <div
    onClick={() => onChange(!checked)}
    style={{
      width: 46,
      height: 26,
      borderRadius: 999,
      cursor: "pointer",
      background: checked ? "#6366f1" : "#cbd5e1",
      position: "relative",
      transition: "background .2s",
      flexShrink: 0,
    }}
  >
    <div
      style={{
        position: "absolute",
        top: 3,
        left: checked ? 23 : 3,
        width: 20,
        height: 20,
        borderRadius: 999,
        background: "#fff",
        boxShadow: "0 2px 4px rgba(0,0,0,.2)",
        transition: "left .2s",
      }}
    />
  </div>
);

// Estilos
const lbl = {
  display: "block",
  fontSize: "0.8rem",
  fontWeight: 700,
  color: "#374151",
  marginBottom: 5,
};
const inp = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,.12)",
  fontSize: "0.85rem",
  outline: "none",
  background: "#fafafa",
  color: "#1e293b",
  boxSizing: "border-box",
};
const btnPrimario = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "9px 18px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg,#6366f1,#4f46e5)",
  color: "#fff",
  fontWeight: 700,
  fontSize: "0.875rem",
  cursor: "pointer",
  boxShadow: "0 3px 10px rgba(99,102,241,.3)",
};
const btnSecundario = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "9px 16px",
  borderRadius: 12,
  border: "1.5px solid rgba(0,0,0,.1)",
  background: "#fff",
  color: "#374151",
  fontWeight: 600,
  fontSize: "0.875rem",
  cursor: "pointer",
};

export default TabAsistente;
