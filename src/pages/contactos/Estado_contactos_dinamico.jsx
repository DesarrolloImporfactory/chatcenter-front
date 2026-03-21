// Estado_contactos.jsx — versión con filtros integrados
// Cambios respecto a Estado_contactos_dinamico.jsx:
//   1. Importa KanbanFiltros
//   2. Estado `filtros` global
//   3. fetchContactos y loadMore pasan `filtros` al backend
//   4. Cuando cambia filtros → resetea board y recarga desde cero

import React, {
  useEffect,
  useRef,
  useMemo,
  useState,
  useCallback,
} from "react";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import chatApi from "../../api/chatcenter";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import KanbanFiltros from "../kanban/configuracion/KanbanFiltros";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (t) => {
    t.addEventListener("mouseenter", Swal.stopTimer);
    t.addEventListener("mouseleave", Swal.resumeTimer);
  },
});

// ── PreviewContent ─────────────────────────────────────────────
function PreviewContent({ tipo, texto, ruta, rutaRaw, replyRef, replyAuthor }) {
  const parseDocMeta = (raw) => {
    try {
      return JSON.parse(raw);
    } catch {
      return { ruta: raw, nombre: "Documento", size: 0, mimeType: "" };
    }
  };
  const Quote = () =>
    replyRef ? (
      <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white/90">
        <div className="flex">
          <div className="w-1.5 bg-slate-300/70" />
          <div className="flex-1 p-3">
            <div className="mb-1 text-[11px] font-semibold text-slate-600">
              <i className="bx bx-reply text-[14px] align-[-1px]" />{" "}
              Respondiendo a {replyAuthor || "mensaje"}
            </div>
            <div className="whitespace-pre-wrap break-words text-[13px] text-slate-700 line-clamp-6">
              {replyRef}
            </div>
          </div>
        </div>
      </div>
    ) : null;

  if (tipo === "audio")
    return (
      <div>
        <Quote />
        <audio controls src={rutaRaw || ruta} className="w-full" />
      </div>
    );
  if (tipo === "image" || tipo === "sticker")
    return (
      <div>
        <Quote />
        <img
          src={ruta}
          alt="Imagen"
          className="max-w-[480px] w-full h-auto rounded-xl border border-slate-200 shadow-sm"
        />
      </div>
    );
  if (tipo === "video")
    return (
      <div>
        <Quote />
        <video
          controls
          className="w-full max-w-[480px] rounded-xl border border-slate-200 shadow-sm"
          src={ruta}
        />
      </div>
    );
  if (tipo === "document") {
    const meta = parseDocMeta(ruta);
    const href = /^https?:\/\//.test(meta.ruta)
      ? meta.ruta
      : `https://new.imporsuitpro.com/${meta.ruta || ""}`;
    const sizeLabel = meta.size
      ? meta.size > 1048576
        ? `${(meta.size / 1048576).toFixed(2)} MB`
        : `${(meta.size / 1024).toFixed(0)} KB`
      : "";
    const ext = (
      meta.ruta?.split(".").pop() ||
      meta.mimeType?.split("/").pop() ||
      ""
    ).toUpperCase();
    return (
      <div>
        <Quote />
        <a
          className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white/80 shadow-sm hover:bg-slate-50 transition"
          href={href}
          target="_blank"
          rel="noreferrer"
        >
          <i className="bx bxs-file-blank text-2xl text-slate-600" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-slate-800">
              {meta.nombre || "Documento"}
            </div>
            <div className="text-[12px] text-slate-500">
              {[sizeLabel, ext].filter(Boolean).join(" • ")}
            </div>
          </div>
          <i className="bx bx-download text-xl text-blue-600" />
        </a>
      </div>
    );
  }
  return (
    <div>
      <Quote />
      <div
        style={{
          backdropFilter: "blur(14px)",
          background: "rgba(255,255,255,.55)",
          padding: "18px 20px",
          borderRadius: "18px",
          border: "1px solid rgba(255,255,255,0.4)",
          boxShadow: "0 8px 24px rgba(0,0,0,.12)",
          whiteSpace: "pre-wrap",
          fontSize: "15px",
          lineHeight: "1.65",
          color: "#1A1A1A",
        }}
      >
        {texto}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Estado_contactos (dinámico + filtros)
// ─────────────────────────────────────────────────────────────
const Estado_contactos = () => {
  const navigate = useNavigate();
  const [id_configuracion, setId_configuracion] = useState(null);

  const [kanbanColumnas, setKanbanColumnas] = useState([]);
  const [loadingColumnas, setLoadingColumnas] = useState(true);

  const [boardData, setBoardData] = useState({});
  const boardRef = useRef({});
  const [isLoading, setIsLoading] = useState(false);

  // ── filtros globales ──────────────────────────────────────
  const [filtros, setFiltros] = useState({
    id_encargado: null,
    bot_openia: null,
    fecha_desde: null,
    fecha_hasta: null,
  });

  // Remarketing
  const [showModalRemarketing, setShowModalRemarketing] = useState(false);
  const [plantillas, setPlantillas] = useState([]);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState("");
  const [tiempoRemarketing, setTiempoRemarketing] = useState("0");
  const [loadingPlantillas, setLoadingPlantillas] = useState(false);
  const [guardandoRemarketing, setGuardandoRemarketing] = useState(false);

  // Preview
  const [previewData, setPreviewData] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const scrollLockRef = useRef({});
  const searchTimersRef = useRef({});
  const LIMIT = 20;

  const busquedaGlobalTimerRef = useRef(null);

  const onBusquedaGlobal = useCallback(
    (value) => {
      if (busquedaGlobalTimerRef.current)
        clearTimeout(busquedaGlobalTimerRef.current);

      busquedaGlobalTimerRef.current = setTimeout(async () => {
        if (!id_configuracion || !kanbanColumnas.length) return;
        const columnKeys = kanbanColumnas.map((c) => c.estado_db);
        const searchObj = {};
        columnKeys.forEach((k) => {
          searchObj[k] = value;
        });

        setBoardData((prev) => {
          const next = { ...prev };
          columnKeys.forEach((k) => {
            next[k] = {
              ...next[k],
              items: [],
              cursor: null,
              hasMore: true,
              loading: true,
              search: value,
            };
          });
          return next;
        });

        try {
          const { data } = await chatApi.post(
            "/clientes_chat_center/listar_contactos_estado_dinamico",
            {
              id_configuracion,
              columnKeys,
              limit: LIMIT,
              cursors: {},
              search: searchObj,
              filtros,
            },
          );
          if (!data?.success || !data?.data) return;
          mergeColumnsResponse(data.data, columnKeys, { append: false });
        } catch {
          Toast.fire({ icon: "error", title: "Error buscando" });
        }
      }, 400);
    },
    [id_configuracion, kanbanColumnas, filtros],
  );

  // ── 1. Init id_configuracion ──────────────────────────────
  useEffect(() => {
    const idc = localStorage.getItem("id_configuracion");
    if (idc) setId_configuracion(parseInt(idc, 10));
  }, []);

  // ── 2. Cargar columnas ────────────────────────────────────
  const cargarColumnas = useCallback(async () => {
    if (!id_configuracion) return;
    setLoadingColumnas(true);
    try {
      const { data } = await chatApi.post("/kanban_columnas/listar", {
        id_configuracion,
      });
      if (data?.success)
        setKanbanColumnas((data.data || []).filter((c) => c.activo));
    } catch {
      Toast.fire({ icon: "error", title: "Error al cargar columnas" });
    } finally {
      setLoadingColumnas(false);
    }
  }, [id_configuracion]);

  useEffect(() => {
    cargarColumnas();
  }, [cargarColumnas]);

  // ── 3. Inicializar boardData al obtener columnas ──────────
  useEffect(() => {
    if (!kanbanColumnas.length) return;
    const initial = {};
    kanbanColumnas.forEach((col) => {
      initial[col.estado_db] = {
        items: [],
        cursor: null,
        hasMore: true,
        loading: false,
        search: "",
      };
    });
    setBoardData(initial);
  }, [kanbanColumnas]);

  useEffect(() => {
    boardRef.current = boardData;
  }, [boardData]);

  // ── 4. Fetch de contactos (reacciona a columnas O filtros) ─
  const fetchTodo = useCallback(async () => {
    if (!id_configuracion || !kanbanColumnas.length) return;
    const columnKeys = kanbanColumnas.map((c) => c.estado_db);

    setIsLoading(true);
    // reset items
    setBoardData((prev) => {
      const next = { ...prev };
      columnKeys.forEach((k) => {
        next[k] = {
          ...next[k],
          items: [],
          cursor: null,
          hasMore: true,
          loading: true,
        };
      });
      return next;
    });

    try {
      const { data } = await chatApi.post(
        "/clientes_chat_center/listar_contactos_estado_dinamico",
        {
          id_configuracion,
          columnKeys,
          limit: LIMIT,
          cursors: {},
          search: {},
          filtros, // ← pasa filtros
        },
      );
      if (!data?.success || !data?.data) {
        Toast.fire({
          icon: "error",
          title: "No se pudieron cargar los contactos",
        });
        return;
      }
      mergeColumnsResponse(data.data, columnKeys, { append: false });
    } catch {
      Toast.fire({ icon: "error", title: "Error al consultar contactos" });
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id_configuracion, kanbanColumnas, filtros]);

  // Ejecutar cuando cambian columnas o filtros
  useEffect(() => {
    fetchTodo();
  }, [fetchTodo]);

  // ── Helpers board ─────────────────────────────────────────
  const mergeColumnsResponse = (respData, keys, { append = false } = {}) => {
    setBoardData((prev) => {
      const next = { ...prev };
      keys.forEach((k) => {
        const col = respData?.[k];
        const items = col?.items || [];
        const page = col?.page || {};
        const prev_ = prev[k]?.items || [];
        let merged = append ? [...prev_, ...items] : items;
        const seen = new Set();
        merged = merged.filter((x) => {
          const id = String(x?.id);
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        next[k] = {
          ...prev[k],
          items,
          // ← conservar total previo en append, actualizar en carga fresca
          total:
            !append && col?.total !== undefined
              ? col.total
              : (prev[k]?.total ?? 0),
          cursor: page.next_cursor ?? null,
          hasMore: !!page.has_more,
          loading: false,
        };
      });
      return next;
    });
  };

  const loadMoreColumn = async (colKey) => {
    const col = boardRef.current?.[colKey];
    if (!col || col.loading || !col.hasMore) return;
    setBoardData((prev) => ({
      ...prev,
      [colKey]: { ...prev[colKey], loading: true },
    }));
    try {
      const { data } = await chatApi.post(
        "/clientes_chat_center/listar_contactos_estado_dinamico",
        {
          id_configuracion,
          columnKeys: [colKey],
          limit: LIMIT,
          cursors: { [colKey]: col.cursor || null },
          search: { [colKey]: col.search || "" },
          filtros,
        },
      );
      if (!data?.success || !data?.data) {
        setBoardData((p) => ({
          ...p,
          [colKey]: { ...p[colKey], loading: false },
        }));
        return;
      }
      mergeColumnsResponse(data.data, [colKey], { append: true });
    } catch {
      Toast.fire({ icon: "error", title: "Error cargando más" });
      setBoardData((p) => ({
        ...p,
        [colKey]: { ...p[colKey], loading: false },
      }));
    }
  };

  const onSearchChange = (colKey, value) => {
    setBoardData((prev) => ({
      ...prev,
      [colKey]: { ...prev[colKey], search: value },
    }));
    if (searchTimersRef.current[colKey])
      clearTimeout(searchTimersRef.current[colKey]);
    searchTimersRef.current[colKey] = setTimeout(async () => {
      try {
        setBoardData((p) => ({
          ...p,
          [colKey]: {
            ...p[colKey],
            items: [],
            cursor: null,
            hasMore: true,
            loading: true,
          },
        }));
        const { data } = await chatApi.post(
          "/clientes_chat_center/listar_contactos_estado_dinamico",
          {
            id_configuracion,
            columnKeys: [colKey],
            limit: LIMIT,
            cursors: { [colKey]: null },
            search: { [colKey]: value },
            filtros,
          },
        );
        if (!data?.success || !data?.data) return;
        mergeColumnsResponse(data.data, [colKey], { append: false });
      } catch {
        Toast.fire({ icon: "error", title: "Error buscando" });
        setBoardData((p) => ({
          ...p,
          [colKey]: { ...p[colKey], loading: false },
        }));
      }
    }, 350);
  };

  const onDragEnd = async (result) => {
    const { source, destination } = result;
    if (!destination) return;
    const s = source.droppableId,
      e = destination.droppableId;
    if (s === e && source.index === destination.index) return;
    const sList = Array.from(boardData[s]?.items || []);
    const eList = Array.from(boardData[e]?.items || []);
    if (s === e) {
      const [m] = sList.splice(source.index, 1);
      sList.splice(destination.index, 0, m);
      setBoardData((p) => ({ ...p, [s]: { ...p[s], items: sList } }));
      return;
    }
    const [moved] = sList.splice(source.index, 1);
    eList.splice(destination.index, 0, moved);
    setBoardData((p) => ({
      ...p,
      [s]: { ...p[s], items: sList },
      [e]: { ...p[e], items: eList },
    }));
    try {
      await chatApi.post("/clientes_chat_center/actualizar_estado_dinamico", {
        id_cliente: moved.id,
        nuevo_estado: e,
        id_configuracion,
      });
      Toast.fire({ icon: "success", title: "Estado actualizado" });
    } catch {
      Toast.fire({ icon: "error", title: "Error al actualizar estado" });
    }
  };

  // Remarketing
  const fetchPlantillas = async () => {
    if (!id_configuracion) return;
    setLoadingPlantillas(true);
    try {
      const res = await chatApi.post(
        "whatsapp_managment/obtenerTemplatesWhatsapp",
        { id_configuracion },
      );
      const raw = res.data?.data || [];
      setPlantillas(
        raw.filter((t, i, s) => i === s.findIndex((x) => x.id === t.id)),
      );
    } catch {
      setPlantillas([]);
    } finally {
      setLoadingPlantillas(false);
    }
  };

  const guardarRemarketing = async () => {
    if (!plantillaSeleccionada || tiempoRemarketing === "0") {
      Toast.fire({ icon: "warning", title: "Seleccione plantilla y tiempo" });
      return;
    }
    setGuardandoRemarketing(true);
    try {
      await chatApi.post("openai_assistants/configurar_remarketing", {
        id_configuracion,
        estado_contacto: "ia_ventas",
        tiempo_espera_horas: Number(tiempoRemarketing),
        nombre_template: plantillaSeleccionada,
        language_code: "es",
      });
      Toast.fire({ icon: "success", title: "Remarketing configurado" });
      setShowModalRemarketing(false);
    } catch {
      Toast.fire({ icon: "error", title: "Error al guardar" });
    } finally {
      setGuardandoRemarketing(false);
    }
  };

  // Preview
  const handlePreview = async (contacto) => {
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const { data } = await chatApi.post(
        "/clientes_chat_center/listar_ultimo_mensaje",
        { id_cliente: contacto.id, id_configuracion },
      );
      if (!data?.success || !Array.isArray(data.data) || !data.data.length) {
        Toast.fire({ icon: "error", title: "No hay mensajes aún" });
        return;
      }
      const msg = data.data[0];
      setPreviewData({
        tipo: msg.tipo_mensaje,
        texto: msg.texto_mensaje,
        ruta: msg.ruta_archivo,
        rutaRaw: msg.ruta_archivo,
        replyRef: null,
        replyAuthor: null,
      });
      setExpandedId(contacto.id);
    } catch {
      Toast.fire({ icon: "error", title: "Error API" });
    } finally {
      setPreviewLoading(false);
    }
  };

  const totalContactos = useMemo(
    () =>
      Object.values(boardData).reduce((a, c) => a + (c?.items?.length || 0), 0),
    [boardData],
  );

  // ── Render tarjeta ────────────────────────────────────────
  const renderContactCard = (contacto) => {
    const nombre =
      [contacto.nombre_cliente, contacto.apellido_cliente]
        .filter(Boolean)
        .join(" ") || "Sin nombre";
    const telefono = contacto.celular_cliente || null;
    const botColor = contacto.bot_openia === 1 ? "#2ECC71" : "#E74C3C";
    return (
      <div
        key={contacto.id}
        style={{
          backgroundColor: "#fff",
          borderRadius: 12,
          padding: "10px 12px",
          boxShadow: "0 4px 10px rgba(0,0,0,.08)",
          marginBottom: 10,
          fontSize: "0.85rem",
          border: "1px solid rgba(0,0,0,.04)",
          transition: "transform .12s,box-shadow .12s",
        }}
        className="kanban-contact-card"
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 4,
          }}
        >
          <span style={{ fontWeight: 600 }}>{nombre}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <i
              className="bx bx-bot"
              style={{ fontSize: "1.25rem", color: botColor }}
            />
            <i
              className="bx bx-show"
              style={{ fontSize: "1.2rem", color: "#555", cursor: "pointer" }}
              onClick={(e) => {
                e.stopPropagation();
                handlePreview(contacto);
              }}
              onMouseEnter={(e) => (e.target.style.color = "#111")}
              onMouseLeave={(e) => (e.target.style.color = "#555")}
            />
          </div>
        </div>
        {telefono && (
          <div
            style={{
              opacity: 0.9,
              marginBottom: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <i className="bx bx-mobile" style={{ fontSize: 14 }} />
              <span>{telefono}</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigator?.clipboard
                  ?.writeText(String(telefono))
                  .then(() =>
                    Toast.fire({ icon: "success", title: "Número copiado" }),
                  );
              }}
              style={{
                border: "none",
                background: "transparent",
                padding: "6px 8px",
                borderRadius: 10,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                color: "#9CA3AF",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(0,0,0,.06)";
                e.currentTarget.style.color = "#4B5563";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#9CA3AF";
              }}
            >
              <i className="bx bx-copy" style={{ fontSize: 18 }} />
            </button>
          </div>
        )}
        {contacto.estado_contacto && (
          <div
            style={{
              display: "inline-block",
              fontSize: "0.75rem",
              padding: "2px 8px",
              borderRadius: 999,
              backgroundColor: "#e3f2fd",
              color: "#0d47a1",
              marginBottom: 8,
            }}
          >
            {contacto.estado_contacto.replace(/_/g, " ").toUpperCase()}
          </div>
        )}
        <button
          onClick={() =>
            navigate(`/chat/${contacto.id}`, {
              state: {
                id_configuracion: Number(
                  localStorage.getItem("id_configuracion"),
                ),
              },
            })
          }
          style={{
            marginTop: 8,
            width: "100%",
            padding: "8px 14px",
            borderRadius: 10,
            border: "none",
            background: "linear-gradient(135deg,#2E8BFF,#6A5CFF)",
            color: "#fff",
            fontWeight: 600,
            fontSize: "0.85rem",
            cursor: "pointer",
            transition: "all .2s",
            boxShadow: "0 3px 8px rgba(46,139,255,.3)",
          }}
          className="kanban-btn-abrir"
        >
          Abrir
        </button>
        {expandedId === contacto.id && (
          <div
            style={{
              marginTop: 10,
              background: "#F8F9FF",
              borderRadius: 12,
              padding: 14,
              border: "1px solid rgba(0,0,0,.05)",
              animation: "expand .2s ease",
              minHeight: 80,
            }}
          >
            {previewLoading && (
              <div
                style={{
                  textAlign: "center",
                  padding: "25px 0",
                  opacity: 0.7,
                  fontSize: 13,
                }}
              >
                <i
                  className="bx bx-loader-alt bx-spin"
                  style={{ fontSize: 20 }}
                />
                <div>Cargando...</div>
              </div>
            )}
            {!previewLoading && previewData && (
              <>
                <PreviewContent
                  tipo={previewData.tipo}
                  texto={previewData.texto}
                  ruta={previewData.ruta}
                  rutaRaw={previewData.rutaRaw}
                  replyRef={previewData.replyRef}
                  replyAuthor={previewData.replyAuthor}
                />
                <div style={{ textAlign: "right", marginTop: 6 }}>
                  <span
                    style={{
                      fontSize: 12,
                      color: "#0D6EFD",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setExpandedId(null);
                      setPreviewData(null);
                    }}
                  >
                    Cerrar
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────
  if (loadingColumnas)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
          flexDirection: "column",
          gap: 12,
          color: "#888",
        }}
      >
        <i
          className="bx bx-loader-alt bx-spin"
          style={{ fontSize: "2.5rem" }}
        />
        <span>Cargando configuración del Kanban...</span>
      </div>
    );

  if (!kanbanColumnas.length)
    return (
      <div className="p-5">
        <div
          style={{ textAlign: "center", padding: "60px 20px", color: "#888" }}
        >
          <i
            className="bx bx-columns"
            style={{ fontSize: "3rem", marginBottom: 12 }}
          />
          <p style={{ fontSize: "1.1rem", fontWeight: 600 }}>
            No hay columnas configuradas
          </p>
          <p style={{ fontSize: "0.9rem", marginTop: 6 }}>
            Ve a <strong>Configuración → Kanban</strong> para crear las
            columnas.
          </p>
        </div>
      </div>
    );

  return (
    <div className="p-5">
      {/* Header */}
      <div
        style={{
          background: "#171931",
          borderRadius: 18,
          padding: "22px 26px",
          marginBottom: "1.8rem",
          boxShadow: "0 12px 28px rgba(0,0,0,.45)",
          border: "1px solid rgba(255,255,255,.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1.2rem" }}>
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 999,
              background: "linear-gradient(135deg,#2E8BFF,#6A5CFF)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: "1.5rem",
              boxShadow: "0 6px 20px rgba(46,139,255,.45)",
            }}
          >
            <i className="bx bx-bar-chart-alt-2" />
          </div>
          <div>
            <h1
              style={{
                fontSize: "1.9rem",
                fontWeight: 700,
                margin: 0,
                color: "#fff",
              }}
            >
              Distribución de estados contactos
            </h1>
            <p
              style={{ color: "#d3d3d3", margin: "6px 0 0", fontSize: "1rem" }}
            >
              Visualiza en qué etapa del proceso se encuentra cada contacto.
            </p>
          </div>
        </div>
        <div
          style={{
            textAlign: "right",
            fontSize: "0.9rem",
            minWidth: 130,
            color: "#fff",
          }}
        >
          <div
            style={{
              padding: "5px 12px",
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,.12)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 6,
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: 999,
                backgroundColor: "#4caf50",
              }}
            />
            <span style={{ fontWeight: 600 }}>Contactos activos</span>
          </div>
          <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>
            {totalContactos}
          </div>
        </div>
      </div>

      {/* ── Barra de filtros ──────────────────────────────── */}
      <KanbanFiltros
        id_configuracion={id_configuracion}
        onChange={(nuevosFiltros) => setFiltros(nuevosFiltros)}
        onSearch={onBusquedaGlobal}
      />

      {isLoading && (
        <div
          style={{
            marginBottom: "1rem",
            fontSize: "0.9rem",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 12px",
            borderRadius: 999,
            backgroundColor: "#e3f2fd",
            color: "#0d47a1",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: 999,
              backgroundColor: "#0d47a1",
              animation: "pulseDot 1s infinite ease-in-out",
            }}
          />
          Cargando contactos...
        </div>
      )}

      {/* ── Tablero ───────────────────────────────────────── */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${kanbanColumnas.length},minmax(220px,1fr))`,
            gap: "1rem",
            overflowX: "auto",
          }}
        >
          {kanbanColumnas.map((column) => {
            const colKey = column.estado_db;
            const items = boardData[colKey]?.items || [];
            const isColLoading = !!boardData[colKey]?.loading;
            const esIaVentas = colKey === "ia_ventas";

            return (
              <Droppable droppableId={colKey} key={colKey}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      backgroundColor: column.color_fondo,
                      borderRadius: 16,
                      padding: 12,
                      display: "flex",
                      flexDirection: "column",
                      maxHeight: "75vh",
                      boxShadow: "0 8px 18px rgba(0,0,0,.08)",
                      border: "1px solid rgba(0,0,0,.04)",
                    }}
                  >
                    {/* Header columna */}
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "0.95rem",
                        marginBottom: "0.5rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          color: column.color_texto,
                        }}
                      >
                        {column.icono && (
                          <i
                            className={column.icono}
                            style={{ fontSize: "1rem" }}
                          />
                        )}
                        <span>{column.nombre}</span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.8rem",
                            backgroundColor: "rgba(255,255,255,.9)",
                            borderRadius: 999,
                            padding: "3px 9px",
                            boxShadow: "0 2px 6px rgba(0,0,0,.08)",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            fontWeight: 700,
                          }}
                        >
                          {boardData[colKey]?.total ?? items.length}
                        </span>
                        {esIaVentas && (
                          <button
                            onClick={() => {
                              setShowModalRemarketing(true);
                              fetchPlantillas();
                            }}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              padding: "4px 10px",
                              borderRadius: 999,
                              border: "1px solid rgba(99,102,241,.3)",
                              background: "rgba(99,102,241,.08)",
                              color: "#4338ca",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <i
                              className="bx bx-time-five"
                              style={{ fontSize: 13 }}
                            />
                            Remarketing
                          </button>
                        )}
                      </div>
                    </div>

                    <input
                      type="text"
                      placeholder="Buscar..."
                      value={boardData[colKey]?.search || ""}
                      onChange={(e) => onSearchChange(colKey, e.target.value)}
                      style={{
                        padding: "6px 10px",
                        marginBottom: 8,
                        borderRadius: 8,
                        border: "1px solid rgba(0,0,0,.15)",
                        fontSize: "0.8rem",
                        outline: "none",
                      }}
                    />
                    <div
                      style={{
                        height: 1,
                        backgroundColor: "rgba(0,0,0,.06)",
                        marginBottom: 8,
                      }}
                    />

                    {/* Lista */}
                    <div
                      style={{ overflowY: "auto", paddingRight: 4 }}
                      onScroll={(e) => {
                        const el = e.currentTarget;
                        if (
                          el.scrollTop + el.clientHeight <
                          el.scrollHeight - 120
                        )
                          return;
                        if (scrollLockRef.current[colKey]) return;
                        scrollLockRef.current[colKey] = true;
                        loadMoreColumn(colKey).finally(() => {
                          setTimeout(() => {
                            scrollLockRef.current[colKey] = false;
                          }, 400);
                        });
                      }}
                    >
                      {items.length > 0 ? (
                        items.map((contacto, index) => (
                          <Draggable
                            key={contacto.id}
                            draggableId={String(contacto.id)}
                            index={index}
                          >
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                {renderContactCard(contacto)}
                              </div>
                            )}
                          </Draggable>
                        ))
                      ) : (
                        <div
                          style={{
                            fontSize: "0.8rem",
                            opacity: 0.7,
                            fontStyle: "italic",
                          }}
                        >
                          No se encontraron resultados.
                        </div>
                      )}
                      {isColLoading && (
                        <div
                          style={{
                            textAlign: "center",
                            padding: "10px 0",
                            opacity: 0.7,
                            fontSize: 12,
                          }}
                        >
                          <i
                            className="bx bx-loader-alt bx-spin"
                            style={{ fontSize: 16 }}
                          />{" "}
                          Cargando...
                        </div>
                      )}
                    </div>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>

      {/* Modal Remarketing */}
      {showModalRemarketing && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 border border-gray-100">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 grid place-items-center shrink-0">
                  <i className="bx bx-time-five text-xl text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Reenvío automático
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Configure cuándo y con qué plantilla se contactará
                    nuevamente a clientes sin respuesta.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModalRemarketing(false)}
                className="w-9 h-9 rounded-xl hover:bg-gray-100 transition grid place-items-center shrink-0"
              >
                <i className="bx bx-x text-2xl text-gray-600" />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tiempo de espera
              </label>
              <select
                value={tiempoRemarketing}
                onChange={(e) => setTiempoRemarketing(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="0">Seleccione un tiempo</option>
                <option value="1">1 hora</option>
                <option value="3">3 horas</option>
                <option value="5">5 horas</option>
                <option value="10">10 horas</option>
                <option value="20">20 horas</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plantilla
              </label>
              {loadingPlantillas ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                  <i className="bx bx-loader-alt bx-spin" /> Cargando...
                </div>
              ) : (
                <>
                  <select
                    value={plantillaSeleccionada}
                    onChange={(e) => setPlantillaSeleccionada(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Seleccione una plantilla</option>
                    {plantillas.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                        {t.status !== "APPROVED" ? " — No aprobada" : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <i className="bx bx-error-circle text-sm" /> Solo aprobadas
                    por Meta.
                  </p>
                </>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button
                onClick={() => setShowModalRemarketing(false)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 transition font-semibold text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={guardarRemarketing}
                disabled={guardandoRemarketing}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow transition font-semibold text-sm disabled:opacity-60 inline-flex items-center gap-2"
              >
                {guardandoRemarketing && (
                  <i className="bx bx-loader-alt bx-spin text-base" />
                )}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulseDot{0%{transform:scale(1);opacity:1}50%{transform:scale(1.6);opacity:.4}100%{transform:scale(1);opacity:1}}
        @keyframes expand{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
        .kanban-contact-card:hover{transform:translateY(-2px);box-shadow:0 8px 16px rgba(0,0,0,.12)}
        .kanban-btn-abrir:hover{transform:translateY(-2px) scale(1.03);box-shadow:0 6px 14px rgba(46,139,255,.45)}
        .kanban-btn-abrir:active{transform:scale(.97)}
      `}</style>
    </div>
  );
};

export default Estado_contactos;
