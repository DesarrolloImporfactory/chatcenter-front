import React, { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";
import PageHeader from "../../pages/Header/pageHeader";
import EditorColumnas from "./EditorColumnas";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.parentNode.style.zIndex = 99999;
  },
});

const ICONOS_DISPONIBLES = [
  "bx bx-layout",
  "bx bx-store",
  "bx bx-cart",
  "bx bx-bot",
  "bx bx-package",
  "bx bx-calendar",
  "bx bx-star",
  "bx bx-rocket",
  "bx bxl-whatsapp",
  "bx bx-trophy",
  "bx bx-flag",
  "bx bxs-bolt",
];

const COLORES_DISPONIBLES = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#22d3ee",
  "#25d366",
  "#0ea5e9",
];

const PLANTILLA_VACIA_BASE = {
  columnas: [
    {
      nombre: "Contacto Inicial",
      estado_db: "contacto_inicial",
      color_fondo: "#EFF6FF",
      color_texto: "#1D4ED8",
      icono: "bx bx-phone",
      orden: 1,
      activo: 1,
      es_estado_final: 0,
      es_principal: 1,
      es_dropi_principal: 0,
      activa_ia: 0,
      max_tokens: 1900,
      instrucciones: null,
      modelo: "gpt-4o-mini",
      acciones: [],
    },
  ],
};

const PlantillasGlobalesAdmin = () => {
  const [plantillas, setPlantillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroBusqueda, setFiltroBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("activas");

  // Modal crear/editar metadata
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("crear");
  const [formMeta, setFormMeta] = useState({
    id: null,
    nombre: "",
    descripcion: "",
    icono: "bx bx-layout",
    color: "#6366f1",
  });
  const [guardando, setGuardando] = useState(false);

  // Editor de columnas (full-screen modal de Entrega 3)
  const [editorPlantillaId, setEditorPlantillaId] = useState(null);

  // ── Cargar lista ────────────────────────────────────────
  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await chatApi.post("/kanban_plantillas_admin/listar", {
        incluir_inactivas: true,
      });
      if (data?.success) setPlantillas(data.data || []);
    } catch (err) {
      const msg =
        err?.response?.data?.message || "Error cargando plantillas globales";
      Swal.fire({ icon: "error", title: msg, confirmButtonColor: "#ef4444" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // ── Filtros ────────────────────────────────────────────
  const plantillasFiltradas = plantillas.filter((p) => {
    if (filtroEstado === "activas" && !p.activo) return false;
    if (filtroEstado === "inactivas" && p.activo) return false;

    if (filtroBusqueda.trim()) {
      const q = filtroBusqueda.trim().toLowerCase();
      return (
        p.nombre.toLowerCase().includes(q) ||
        (p.descripcion || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalActivas = plantillas.filter((p) => p.activo).length;
  const totalInactivas = plantillas.filter((p) => !p.activo).length;

  // ── Modal metadata ─────────────────────────────────────
  const abrirCrear = () => {
    setModalMode("crear");
    setFormMeta({
      id: null,
      nombre: "",
      descripcion: "",
      icono: "bx bx-layout",
      color: "#6366f1",
    });
    setModalOpen(true);
  };

  const abrirEditar = (p) => {
    setModalMode("editar");
    setFormMeta({
      id: p.id,
      nombre: p.nombre,
      descripcion: p.descripcion || "",
      icono: p.icono || "bx bx-layout",
      color: p.color || "#6366f1",
    });
    setModalOpen(true);
  };

  const guardar = async () => {
    if (!formMeta.nombre.trim()) {
      Toast.fire({ icon: "warning", title: "El nombre es obligatorio" });
      return;
    }
    setGuardando(true);
    try {
      if (modalMode === "crear") {
        await chatApi.post("/kanban_plantillas_admin/crear", {
          nombre: formMeta.nombre.trim(),
          descripcion: formMeta.descripcion.trim() || null,
          icono: formMeta.icono,
          color: formMeta.color,
          data: PLANTILLA_VACIA_BASE,
        });
        Toast.fire({ icon: "success", title: "Plantilla creada" });
      } else {
        await chatApi.post("/kanban_plantillas_admin/actualizar_metadata", {
          id: formMeta.id,
          nombre: formMeta.nombre.trim(),
          descripcion: formMeta.descripcion.trim() || null,
          icono: formMeta.icono,
          color: formMeta.color,
        });
        Toast.fire({ icon: "success", title: "Metadata actualizada" });
      }
      setModalOpen(false);
      cargar();
    } catch (err) {
      const msg = err?.response?.data?.message || "Error al guardar";
      Swal.fire({ icon: "error", title: msg, confirmButtonColor: "#ef4444" });
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (p) => {
    const res = await Swal.fire({
      title: `¿Desactivar "${p.nombre}"?`,
      html: `La plantilla quedará oculta para los clientes pero los datos se conservan. Puedes restaurarla después.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Sí, desactivar",
      cancelButtonText: "Cancelar",
    });
    if (!res.isConfirmed) return;
    try {
      await chatApi.post("/kanban_plantillas_admin/eliminar", { id: p.id });
      Toast.fire({ icon: "success", title: "Plantilla desactivada" });
      cargar();
    } catch (err) {
      const msg = err?.response?.data?.message || "Error al desactivar";
      Swal.fire({ icon: "error", title: msg, confirmButtonColor: "#ef4444" });
    }
  };

  const restaurar = async (p) => {
    try {
      await chatApi.post("/kanban_plantillas_admin/restaurar", { id: p.id });
      Toast.fire({ icon: "success", title: "Plantilla restaurada" });
      cargar();
    } catch (err) {
      const msg = err?.response?.data?.message || "Error al restaurar";
      Swal.fire({ icon: "error", title: msg, confirmButtonColor: "#ef4444" });
    }
  };

  const eliminarDefinitivo = async (p) => {
    const paso1 = await Swal.fire({
      title: "¿Eliminar PERMANENTEMENTE?",
      html: `Esta acción no se puede deshacer. Solo funciona si <strong>ninguna config</strong> está usando la plantilla.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Continuar",
      cancelButtonText: "Cancelar",
    });
    if (!paso1.isConfirmed) return;

    const paso2 = await Swal.fire({
      title: "Confirmación final",
      html: `Escribe <strong>${p.nombre}</strong> exactamente para confirmar`,
      input: "text",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Eliminar para siempre",
      cancelButtonText: "Cancelar",
      preConfirm: (valor) => {
        if (valor !== p.nombre) {
          Swal.showValidationMessage(`Debes escribir: ${p.nombre}`);
          return false;
        }
        return true;
      },
    });
    if (!paso2.isConfirmed) return;

    try {
      await chatApi.post("/kanban_plantillas_admin/eliminar_definitivo", {
        id: p.id,
      });
      Toast.fire({ icon: "success", title: "Plantilla eliminada" });
      cargar();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "No se pudo eliminar (puede estar en uso)";
      Swal.fire({ icon: "error", title: msg, confirmButtonColor: "#ef4444" });
    }
  };

  const duplicar = async (p) => {
    const res = await Swal.fire({
      title: "Duplicar plantilla",
      input: "text",
      inputLabel: "Nombre para la copia",
      inputValue: `${p.nombre} (copia)`,
      showCancelButton: true,
      confirmButtonColor: "#6366f1",
      confirmButtonText: "Duplicar",
      cancelButtonText: "Cancelar",
    });
    if (!res.isConfirmed) return;
    try {
      await chatApi.post("/kanban_plantillas_admin/duplicar", {
        id: p.id,
        nombre_nuevo: res.value,
      });
      Toast.fire({ icon: "success", title: "Plantilla duplicada" });
      cargar();
    } catch (err) {
      const msg = err?.response?.data?.message || "Error al duplicar";
      Swal.fire({ icon: "error", title: msg, confirmButtonColor: "#ef4444" });
    }
  };

  const verUso = async (p) => {
    try {
      const { data } = await chatApi.post("/kanban_plantillas_admin/uso", {
        id: p.id,
      });
      const total = data?.data?.total || 0;
      const configs = data?.data?.configuraciones || [];

      const html = total
        ? `<div style="text-align:left;max-height:300px;overflow:auto">
             <div style="font-weight:700;margin-bottom:8px">${total} configuración(es) usan esta plantilla:</div>
             ${configs
               .map(
                 (c) =>
                   `<div style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:.85rem">
                      <strong>#${c.id}</strong> — ${c.nombre_configuracion || "(sin nombre)"} ${c.telefono ? `<span style=\"color:#64748b\">· ${c.telefono}</span>` : ""}
                    </div>`,
               )
               .join("")}
           </div>`
        : `<p>Ninguna configuración está usando esta plantilla actualmente.</p>`;

      Swal.fire({
        title: `Uso de "${p.nombre}"`,
        html,
        confirmButtonColor: "#6366f1",
        width: 520,
      });
    } catch (err) {
      const msg = err?.response?.data?.message || "Error al consultar uso";
      Swal.fire({ icon: "error", title: msg });
    }
  };

  // ⬇️ Editor de columnas — abre el modal full-screen (Entrega 3)
  const editarColumnas = (p) => {
    setEditorPlantillaId(p.id);
  };

  return (
    <div
      style={{ padding: 24, fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      <PageHeader
        tone="dark"
        icon={
          <i
            className="bx bx-globe"
            style={{ fontSize: 20, color: "#fbbf24" }}
          />
        }
        title="Plantillas Globales"
        subtitle="Administra las plantillas de Kanban disponibles para todos los clientes."
        actions={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={cargar}
              disabled={loading}
              className="h-9 inline-flex items-center gap-1.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 hover:border-white/25 text-white/90 text-xs font-semibold transition flex-shrink-0 whitespace-nowrap disabled:opacity-50"
            >
              <i
                className={`bx bx-refresh text-sm ${loading ? "bx-spin" : ""}`}
              />
              Recargar
            </button>
            <button
              onClick={abrirCrear}
              className="h-9 inline-flex items-center gap-1.5 px-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-[#171931] font-bold text-xs shadow-lg shadow-cyan-500/20 transition flex-shrink-0 whitespace-nowrap"
            >
              <i className="bx bx-plus text-base" /> Nueva plantilla
            </button>
          </div>
        }
      />

      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 16,
          padding: "12px 16px",
          background: "#fff",
          border: "1px solid rgba(0,0,0,.07)",
          borderRadius: 14,
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
          <i
            className="bx bx-search"
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#94a3b8",
              fontSize: "1rem",
            }}
          />
          <input
            type="text"
            placeholder="Buscar por nombre o descripción..."
            value={filtroBusqueda}
            onChange={(e) => setFiltroBusqueda(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px 9px 38px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,.12)",
              fontSize: "0.85rem",
              outline: "none",
              background: "#fafafa",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          {[
            { key: "activas", label: `Activas (${totalActivas})` },
            { key: "inactivas", label: `Inactivas (${totalInactivas})` },
            { key: "todas", label: "Todas" },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setFiltroEstado(opt.key)}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                border: "1px solid",
                borderColor:
                  filtroEstado === opt.key ? "#6366f1" : "rgba(0,0,0,.1)",
                background: filtroEstado === opt.key ? "#eef2ff" : "#fff",
                color: filtroEstado === opt.key ? "#4338ca" : "#64748b",
                fontWeight: filtroEstado === opt.key ? 700 : 500,
                fontSize: "0.78rem",
                cursor: "pointer",
                transition: "all .12s",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 0",
            color: "#94a3b8",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <i
            className="bx bx-loader-alt bx-spin"
            style={{ fontSize: "2.2rem" }}
          />
          <span>Cargando plantillas...</span>
        </div>
      )}

      {/* Empty */}
      {!loading && plantillasFiltradas.length === 0 && (
        <div
          style={{
            background: "#fff",
            border: "2px dashed #e5e7eb",
            borderRadius: 18,
            padding: "60px 20px",
            textAlign: "center",
            color: "#94a3b8",
          }}
        >
          <i
            className="bx bx-folder-open"
            style={{ fontSize: "3rem", display: "block", marginBottom: 12 }}
          />
          <div style={{ fontWeight: 700, fontSize: "1rem", color: "#374151" }}>
            {filtroBusqueda || filtroEstado !== "activas"
              ? "Sin resultados"
              : "No hay plantillas globales"}
          </div>
          <div style={{ fontSize: "0.85rem", marginTop: 6 }}>
            {filtroBusqueda || filtroEstado !== "activas"
              ? "Ajusta los filtros para ver más resultados."
              : "Crea la primera plantilla para que tus clientes puedan usarla."}
          </div>
          {!filtroBusqueda && filtroEstado === "activas" && (
            <button
              onClick={abrirCrear}
              style={{
                marginTop: 18,
                padding: "10px 20px",
                borderRadius: 12,
                border: "none",
                background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                color: "#fff",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: "pointer",
                boxShadow: "0 3px 10px rgba(99,102,241,.3)",
              }}
            >
              <i className="bx bx-plus" /> Crear primera plantilla
            </button>
          )}
        </div>
      )}

      {/* Grid de plantillas */}
      {!loading && plantillasFiltradas.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: 16,
          }}
        >
          {plantillasFiltradas.map((p) => (
            <PlantillaCard
              key={p.id}
              plantilla={p}
              onEditar={() => abrirEditar(p)}
              onEditarColumnas={() => editarColumnas(p)}
              onEliminar={() => eliminar(p)}
              onRestaurar={() => restaurar(p)}
              onEliminarDef={() => eliminarDefinitivo(p)}
              onDuplicar={() => duplicar(p)}
              onVerUso={() => verUso(p)}
            />
          ))}
        </div>
      )}

      {/* Modal crear/editar metadata */}
      {modalOpen && (
        <ModalMetadata
          mode={modalMode}
          form={formMeta}
          setForm={setFormMeta}
          guardando={guardando}
          onCancel={() => setModalOpen(false)}
          onGuardar={guardar}
        />
      )}

      {/* Editor full-screen de columnas (Entrega 3) */}
      {editorPlantillaId && (
        <EditorColumnas
          plantillaId={editorPlantillaId}
          onClose={() => setEditorPlantillaId(null)}
          onSaved={cargar}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// PlantillaCard
// ─────────────────────────────────────────────────────────────
const PlantillaCard = ({
  plantilla,
  onEditar,
  onEditarColumnas,
  onEliminar,
  onRestaurar,
  onEliminarDef,
  onDuplicar,
  onVerUso,
}) => {
  const inactiva = !plantilla.activo;

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        border: `1.5px solid ${inactiva ? "#fecaca" : "rgba(0,0,0,.07)"}`,
        boxShadow: "0 2px 12px rgba(0,0,0,.05)",
        overflow: "hidden",
        opacity: inactiva ? 0.75 : 1,
        transition: "all .15s",
      }}
    >
      <div
        style={{
          padding: "16px 18px",
          borderBottom: "1px solid rgba(0,0,0,.05)",
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          background: inactiva
            ? "linear-gradient(135deg,#fef2f2,#fff)"
            : `linear-gradient(135deg,${plantilla.color}10,#fff)`,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: `${plantilla.color}25`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <i
            className={plantilla.icono || "bx bx-layout"}
            style={{ color: plantilla.color, fontSize: "1.4rem" }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: "1rem",
              color: "#0f172a",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {plantilla.nombre}
            </span>
            {inactiva && (
              <span
                style={{
                  fontSize: ".62rem",
                  fontWeight: 700,
                  background: "#fee2e2",
                  color: "#dc2626",
                  borderRadius: 999,
                  padding: "2px 7px",
                  flexShrink: 0,
                }}
              >
                INACTIVA
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "#64748b",
              marginTop: 2,
              fontFamily: "monospace",
            }}
          >
            #{plantilla.id} · creado{" "}
            {new Date(plantilla.created_at).toLocaleDateString("es-EC")}
          </div>
          {plantilla.descripcion && (
            <span
              title={plantilla.descripcion}
              style={{ display: "block", marginTop: 8, cursor: "help" }}
            >
              <div
                style={{
                  fontSize: ".82rem",
                  color: "#475569",
                  lineHeight: 1.4,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {plantilla.descripcion}
              </div>
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: "14px 18px" }}>
        <div
          style={{
            display: "flex",
            gap: 14,
            fontSize: ".75rem",
            color: "#64748b",
            marginBottom: 10,
          }}
        >
          <span>
            <i className="bx bx-columns" style={{ marginRight: 4 }} />
            <strong style={{ color: "#0f172a" }}>
              {plantilla.total_columnas}
            </strong>{" "}
            columna(s)
          </span>
          <span>
            <i className="bx bx-bot" style={{ marginRight: 4 }} />
            <strong style={{ color: "#0f172a" }}>
              {plantilla.columnas_ia}
            </strong>{" "}
            con IA
          </span>
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {(plantilla.columnas_preview || []).slice(0, 8).map((c, i) => (
            <span
              key={i}
              title={`${c.nombre} (${c.estado_db})`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 8px",
                borderRadius: 999,
                background: c.color_fondo,
                color: c.color_texto,
                fontSize: ".7rem",
                fontWeight: 600,
                border: `1px solid ${c.color_texto}33`,
                maxWidth: 140,
              }}
            >
              <i
                className={c.icono || "bx bx-circle"}
                style={{ fontSize: 11 }}
              />
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {c.nombre}
              </span>
              {c.activa_ia && (
                <i
                  className="bx bx-bot"
                  style={{ fontSize: 10, color: "#16a34a" }}
                  title="Con IA"
                />
              )}
            </span>
          ))}
          {plantilla.columnas_preview &&
            plantilla.columnas_preview.length > 8 && (
              <span
                style={{
                  padding: "3px 8px",
                  borderRadius: 999,
                  background: "#f1f5f9",
                  color: "#64748b",
                  fontSize: ".7rem",
                  fontWeight: 600,
                }}
              >
                +{plantilla.columnas_preview.length - 8}
              </span>
            )}
        </div>
      </div>

      <div
        style={{
          padding: "10px 14px",
          borderTop: "1px solid rgba(0,0,0,.05)",
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          background: "#fafbff",
        }}
      >
        <button
          onClick={onEditarColumnas}
          title="Editar columnas y prompts"
          style={btnAccion("#6366f1")}
        >
          <i className="bx bx-edit-alt" /> Columnas
        </button>
        <button
          onClick={onEditar}
          title="Editar nombre, descripción, icono, color"
          style={btnAccion("#64748b")}
        >
          <i className="bx bx-cog" /> Metadata
        </button>
        <button
          onClick={onVerUso}
          title="Ver qué configs usan esta plantilla"
          style={btnAccion("#0891b2")}
        >
          <i className="bx bx-info-circle" /> Uso
        </button>
        <button
          onClick={onDuplicar}
          title="Duplicar plantilla"
          style={btnAccion("#8b5cf6")}
        >
          <i className="bx bx-copy" /> Duplicar
        </button>

        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {!plantilla.activo ? (
            <>
              <button
                onClick={onRestaurar}
                title="Restaurar"
                style={btnAccion("#16a34a")}
              >
                <i className="bx bx-revision" /> Restaurar
              </button>
              <button
                onClick={onEliminarDef}
                title="Eliminar permanentemente"
                style={{ ...btnAccion("#dc2626"), background: "#fee2e2" }}
              >
                <i className="bx bx-trash" />
              </button>
            </>
          ) : (
            <button
              onClick={onEliminar}
              title="Desactivar (soft delete)"
              style={btnAccion("#ef4444")}
            >
              <i className="bx bx-archive-in" /> Desactivar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// ModalMetadata
// ─────────────────────────────────────────────────────────────
const ModalMetadata = ({
  mode,
  form,
  setForm,
  guardando,
  onCancel,
  onGuardar,
}) => {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,10,20,.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !guardando) onCancel();
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          width: "100%",
          maxWidth: 480,
          boxShadow: "0 32px 80px rgba(0,0,0,.22)",
          overflow: "hidden",
        }}
      >
        <div style={{ background: "rgb(23,25,49)", padding: "18px 22px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: `${form.color}30`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <i
                  className={form.icono}
                  style={{ fontSize: 18, color: form.color }}
                />
              </div>
              <div>
                <div
                  style={{
                    fontSize: ".65rem",
                    color: "rgba(255,255,255,.4)",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: ".07em",
                  }}
                >
                  {mode === "crear" ? "Crear" : "Editar"}
                </div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: ".95rem",
                    fontWeight: 700,
                    color: "#fff",
                    lineHeight: 1.2,
                  }}
                >
                  {mode === "crear"
                    ? "Nueva plantilla global"
                    : "Editar metadata"}
                </h2>
              </div>
            </div>
            <button
              onClick={onCancel}
              disabled={guardando}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,.15)",
                background: "rgba(255,255,255,.08)",
                color: "rgba(255,255,255,.7)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i className="bx bx-x" style={{ fontSize: 16 }} />
            </button>
          </div>
          {mode === "crear" && (
            <p
              style={{
                margin: "8px 0 0",
                fontSize: ".74rem",
                color: "rgba(255,255,255,.45)",
              }}
            >
              Se creará con una columna inicial. Después podrás agregar más
              desde "Columnas".
            </p>
          )}
        </div>

        <div
          style={{
            padding: "20px 22px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div>
            <label style={lblM}>Nombre *</label>
            <input
              style={inpM}
              placeholder="Ej: Asistente E-commerce COD"
              value={form.nombre}
              onChange={(e) =>
                setForm((p) => ({ ...p, nombre: e.target.value }))
              }
              autoFocus
              maxLength={255}
            />
          </div>
          <div>
            <label style={lblM}>
              Descripción{" "}
              <span style={{ fontWeight: 400, color: "#94a3b8" }}>
                (opcional)
              </span>
            </label>
            <textarea
              style={{ ...inpM, resize: "none" }}
              rows={3}
              placeholder="Para qué tipo de tienda o flujo..."
              value={form.descripcion}
              onChange={(e) =>
                setForm((p) => ({ ...p, descripcion: e.target.value }))
              }
            />
          </div>
          <div>
            <label style={lblM}>Icono</label>
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                marginTop: 6,
              }}
            >
              {ICONOS_DISPONIBLES.map((ic) => (
                <button
                  key={ic}
                  onClick={() => setForm((p) => ({ ...p, icono: ic }))}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 9,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border:
                      form.icono === ic
                        ? `2px solid ${form.color}`
                        : "1px solid rgba(0,0,0,.1)",
                    background:
                      form.icono === ic ? `${form.color}15` : "#fafafa",
                    cursor: "pointer",
                  }}
                >
                  <i
                    className={ic}
                    style={{
                      fontSize: "1.1rem",
                      color: form.icono === ic ? form.color : "#374151",
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={lblM}>Color</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {COLORES_DISPONIBLES.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm((p) => ({ ...p, color: c }))}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 9,
                    background: c,
                    border:
                      form.color === c
                        ? "3px solid #0f172a"
                        : "2px solid transparent",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 6,
            }}
          >
            <button onClick={onCancel} disabled={guardando} style={btnSec}>
              Cancelar
            </button>
            <button onClick={onGuardar} disabled={guardando} style={btnPrim}>
              {guardando ? (
                <>
                  <i className="bx bx-loader-alt bx-spin" /> Guardando...
                </>
              ) : mode === "crear" ? (
                <>
                  <i className="bx bx-plus" /> Crear
                </>
              ) : (
                <>
                  <i className="bx bx-save" /> Guardar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Estilos
// ─────────────────────────────────────────────────────────────
const lblM = {
  display: "block",
  fontSize: ".78rem",
  fontWeight: 700,
  color: "#374151",
  marginBottom: 5,
};
const inpM = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,.12)",
  fontSize: ".85rem",
  outline: "none",
  background: "#fafafa",
  color: "#1e293b",
  boxSizing: "border-box",
  fontFamily: "inherit",
};
const btnPrim = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "9px 18px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg,#6366f1,#4f46e5)",
  color: "#fff",
  fontWeight: 700,
  fontSize: ".85rem",
  cursor: "pointer",
  boxShadow: "0 3px 10px rgba(99,102,241,.3)",
};
const btnSec = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "9px 16px",
  borderRadius: 12,
  border: "1.5px solid rgba(0,0,0,.1)",
  background: "#fff",
  color: "#374151",
  fontWeight: 600,
  fontSize: ".85rem",
  cursor: "pointer",
};
const btnAccion = (color) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "6px 11px",
  borderRadius: 9,
  border: `1px solid ${color}30`,
  background: `${color}10`,
  color,
  fontSize: ".74rem",
  fontWeight: 600,
  cursor: "pointer",
  transition: "all .12s",
});

export default PlantillasGlobalesAdmin;
