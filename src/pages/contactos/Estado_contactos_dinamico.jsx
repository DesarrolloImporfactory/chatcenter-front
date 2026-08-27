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

// Constantes para columna huérfanos
const ORPHANS_KEY = "__sin_clasificar";
const ORPHANS_COLUMN = {
  estado_db: ORPHANS_KEY,
  nombre: "Sin clasificar",
  color_fondo: "#FEF3C7",
  color_texto: "#92400E",
  icono: "bx bx-error-circle",
  _esVirtual: true,
};
const LS_VISIBLES = (cfg) => `kanban_columnas_visibles_${cfg}`;
const LS_HUERFANOS = (cfg) => `kanban_mostrar_huerfanos_${cfg}`;

// ── Helpers visuales de tarjeta ────────────────────────────────
const tiempoRelativo = (iso) => {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff) || diff < 60000) return "ahora";
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} d`;
  const mo = Math.floor(d / 30);
  return `${mo} mes${mo > 1 ? "es" : ""}`;
};

const inicialesDe = (nombre) => {
  const partes = String(nombre || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!partes.length) return "?";
  return (
    (partes[0][0] || "") + (partes.length > 1 ? partes[1][0] || "" : "")
  ).toUpperCase();
};

// Color estable por nombre (hash → hue), para que cada contacto tenga su tono
const colorAvatar = (nombre) => {
  const s = String(nombre || "?");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return `hsl(${h}, 60%, 45%)`;
};

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
    productos: [],
  });

  // Vista del tablero
  const [columnasVisibles, setColumnasVisibles] = useState(null);
  const [mostrarHuerfanos, setMostrarHuerfanos] = useState(true);

  // Remarketing
  const [showModalRemarketing, setShowModalRemarketing] = useState(false);
  const [plantillas, setPlantillas] = useState([]);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState("");
  const [tiempoRemarketing, setTiempoRemarketing] = useState("0");
  const [loadingPlantillas, setLoadingPlantillas] = useState(false);
  const [guardandoRemarketing, setGuardandoRemarketing] = useState(false);

  const scrollLockRef = useRef({});
  const LIMIT = 20;

  const getColumnKeysVisibles = useCallback(() => {
    if (!columnasVisibles) return kanbanColumnas.map((c) => c.estado_db);
    return kanbanColumnas
      .filter((c) => columnasVisibles.has(c.estado_db))
      .map((c) => c.estado_db);
  }, [kanbanColumnas, columnasVisibles]);

  const columnasParaRender = useMemo(() => {
    const visibles = columnasVisibles
      ? kanbanColumnas.filter((c) => columnasVisibles.has(c.estado_db))
      : kanbanColumnas;
    return mostrarHuerfanos ? [...visibles, ORPHANS_COLUMN] : visibles;
  }, [kanbanColumnas, columnasVisibles, mostrarHuerfanos]);

  // ⭐ El término de búsqueda vive acá; fetchTodo lo aplica junto con los filtros
  const [terminoBusqueda, setTerminoBusqueda] = useState("");

  // ── 1. Init id_configuracion ──────────────────────────────
  /* Al salir a /conexiones el menú puede dejar "null"/"undefined" como string
     en localStorage; parseInt lo vuelve NaN. Sin este guard la vista cargaba
     un tablero ajeno (columnas de plantillas globales de otra configuración).
     Mismo patrón que Chat.jsx / CategoriasView: avisar y mandar a /conexiones. */
  useEffect(() => {
    const idc = parseInt(localStorage.getItem("id_configuracion"), 10);
    if (!Number.isInteger(idc) || idc <= 0) {
      localStorage.removeItem("id_configuracion");
      localStorage.removeItem("tipo_configuracion");
      localStorage.removeItem("id_plataforma_conf");
      Swal.fire({
        icon: "warning",
        title: "No existe una configuración seleccionada",
        text: "Selecciona una conexión para ver el estado de tus contactos.",
        confirmButtonText: "Ir a conexiones",
        allowOutsideClick: false,
        allowEscapeKey: false,
      }).then(() => navigate("/conexiones"));
      return;
    }
    setId_configuracion(idc);
  }, [navigate]);

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

  // Cargar preferencias de vista desde localStorage
  useEffect(() => {
    if (!id_configuracion || !kanbanColumnas.length) return;

    try {
      const raw = localStorage.getItem(LS_VISIBLES(id_configuracion));
      if (raw) {
        const arr = JSON.parse(raw);
        const validas = arr.filter((k) =>
          kanbanColumnas.some((c) => c.estado_db === k),
        );
        if (validas.length > 0) {
          setColumnasVisibles(new Set(validas));
        } else {
          setColumnasVisibles(new Set(kanbanColumnas.map((c) => c.estado_db)));
        }
      } else {
        setColumnasVisibles(new Set(kanbanColumnas.map((c) => c.estado_db)));
      }
    } catch {
      setColumnasVisibles(new Set(kanbanColumnas.map((c) => c.estado_db)));
    }

    try {
      const raw = localStorage.getItem(LS_HUERFANOS(id_configuracion));
      if (raw !== null) setMostrarHuerfanos(raw === "1");
    } catch {}
  }, [id_configuracion, kanbanColumnas]);

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
    initial[ORPHANS_KEY] = {
      items: [],
      cursor: null,
      hasMore: true,
      loading: false,
      search: "",
    };
    setBoardData(initial);
  }, [kanbanColumnas]);

  useEffect(() => {
    boardRef.current = boardData;
  }, [boardData]);

  // ── 4. Fetch de contactos (reacciona a columnas O filtros) ─
  const fetchTodo = useCallback(async () => {
    if (!id_configuracion || !kanbanColumnas.length || !columnasVisibles)
      return;

    const columnKeys = getColumnKeysVisibles();
    const todasLasKeys = mostrarHuerfanos
      ? [...columnKeys, ORPHANS_KEY]
      : columnKeys;

    if (todasLasKeys.length === 0) return;

    setIsLoading(true);
    setBoardData((prev) => {
      const next = { ...prev };
      todasLasKeys.forEach((k) => {
        next[k] = {
          ...next[k],
          items: [],
          cursor: null,
          hasMore: true,
          loading: true,
          search: terminoBusqueda,
        };
      });
      return next;
    });

    const searchObj = {};
    todasLasKeys.forEach((k) => {
      searchObj[k] = terminoBusqueda;
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
          include_orphans: mostrarHuerfanos,
        },
      );
      if (!data?.success || !data?.data) {
        Toast.fire({
          icon: "error",
          title: "No se pudieron cargar los contactos",
        });
        return;
      }
      mergeColumnsResponse(data.data, todasLasKeys, { append: false });
    } catch {
      Toast.fire({ icon: "error", title: "Error al consultar contactos" });
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    id_configuracion,
    kanbanColumnas,
    filtros,
    columnasVisibles,
    mostrarHuerfanos,
    getColumnKeysVisibles,
    terminoBusqueda,
  ]);

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
          items: merged,
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

    const esHuerfano = colKey === ORPHANS_KEY;

    setBoardData((prev) => ({
      ...prev,
      [colKey]: { ...prev[colKey], loading: true },
    }));
    try {
      const { data } = await chatApi.post(
        "/clientes_chat_center/listar_contactos_estado_dinamico",
        {
          id_configuracion,
          columnKeys: esHuerfano ? [] : [colKey],
          limit: LIMIT,
          cursors: { [colKey]: col.cursor || null },
          search: { [colKey]: col.search || "" },
          filtros,
          include_orphans: esHuerfano,
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

  const onDragEnd = async (result) => {
    const { source, destination } = result;
    if (!destination) return;
    const s = source.droppableId,
      e = destination.droppableId;

    if (e === ORPHANS_KEY) {
      Toast.fire({
        icon: "warning",
        title: "No puedes mover contactos a 'Sin clasificar'",
      });
      return;
    }

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

  /* Total real por columna (viene del COUNT del backend), no lo cargado en
     pantalla: con paginación de 20 el conteo visible mentía. */
  const totalContactos = useMemo(
    () =>
      Object.values(boardData).reduce(
        (a, c) => a + (Number(c?.total) || 0),
        0,
      ),
    [boardData],
  );

  const handleColumnasVisiblesChange = useCallback(
    (nuevasKeys) => {
      if (!nuevasKeys || nuevasKeys.length === 0) {
        Toast.fire({
          icon: "warning",
          title: "Debes mantener al menos 1 columna visible",
        });
        return;
      }
      const nuevo = new Set(nuevasKeys);
      setColumnasVisibles(nuevo);
      try {
        localStorage.setItem(
          LS_VISIBLES(id_configuracion),
          JSON.stringify([...nuevo]),
        );
      } catch {}
    },
    [id_configuracion],
  );

  const handleMostrarHuerfanosChange = useCallback(
    (valor) => {
      setMostrarHuerfanos(valor);
      try {
        localStorage.setItem(LS_HUERFANOS(id_configuracion), valor ? "1" : "0");
      } catch {}
    },
    [id_configuracion],
  );

  // ── Render tarjeta ────────────────────────────────────────
  const renderContactCard = (contacto, colKey, isDragging = false) => {
    const esHuerfano = colKey === ORPHANS_KEY;
    const nombre =
      [contacto.nombre_cliente, contacto.apellido_cliente]
        .filter(Boolean)
        .join(" ") || "Sin nombre";
    const telefono = contacto.celular_cliente || null;
    const botOn = contacto.bot_openia === 1;
    const hace = tiempoRelativo(contacto.ultimo_mensaje_at);
    // ultimo_rol_mensaje: 0 = escribió el cliente, 1 = escribimos nosotros
    const ultimoDelCliente =
      contacto.ultimo_rol_mensaje !== null &&
      contacto.ultimo_rol_mensaje !== undefined
        ? String(contacto.ultimo_rol_mensaje) === "0"
        : null;
    const etiquetas = contacto.etiquetas || [];

    const btnCopiar = telefono && (
      <button
        type="button"
        className="kanban-copy"
        title="Copiar número"
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
          padding: 0,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          color: "#94a3b8",
        }}
      >
        <i className="bx bx-copy" style={{ fontSize: 13 }} />
      </button>
    );

    const tiempoSpan = hace ? (
      <span
        title={
          ultimoDelCliente === null
            ? "Tiempo desde el último mensaje de la conversación"
            : ultimoDelCliente
              ? "Último mensaje: del cliente"
              : "Último mensaje: tuyo"
        }
        style={{
          fontSize: "0.66rem",
          color: "#64748b",
          fontWeight: 600,
          background: "rgba(100,116,139,.09)",
          borderRadius: 6,
          padding: "2px 8px",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          maxWidth: "100%",
          overflow: "hidden",
          whiteSpace: "nowrap",
        }}
      >
        <i className="bx bx-time-five" style={{ fontSize: 11, flexShrink: 0 }} />
        {hace === "ahora"
          ? "Última actividad · ahora"
          : `Última actividad · hace ${hace}`}
      </span>
    ) : null;

    const btnAbrir = (
      <button
        onClick={(e) => {
          e.stopPropagation();
          window.open(
            `/chat/${contacto.id}`,
            "_blank",
            "noopener,noreferrer",
          );
        }}
        className="kanban-btn-abrir"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          width: "100%",
          padding: "6px 0",
          borderRadius: 8,
          border: "1px solid rgba(99,102,241,.3)",
          background: "rgba(99,102,241,.06)",
          color: "#4f46e5",
          fontWeight: 700,
          fontSize: "0.72rem",
          cursor: "pointer",
          transition: "all .15s",
        }}
      >
        Abrir
        <i className="bx bx-right-arrow-alt" style={{ fontSize: 13 }} />
      </button>
    );

    const badgeHuerfano = esHuerfano && (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: "0.68rem",
          padding: "2px 8px",
          borderRadius: 999,
          backgroundColor: "#FEF3C7",
          color: "#92400E",
          border: "1px solid rgba(245,158,11,.3)",
          marginTop: 8,
          fontWeight: 600,
        }}
        title="Este estado ya no existe en tus columnas activas"
      >
        <i className="bx bx-error-circle" style={{ fontSize: 12 }} />
        Estado:{" "}
        {contacto.estado_contacto && contacto.estado_contacto !== ""
          ? contacto.estado_contacto
          : "(sin estado)"}
      </div>
    );

    const chipsRow = (contacto.producto_ad || etiquetas.length > 0) && (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 4,
          marginTop: 8,
        }}
      >
        {contacto.producto_ad && (
          <span
            title={`Entró por un anuncio de: ${contacto.producto_ad}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              fontSize: "0.64rem",
              fontWeight: 700,
              color: "#6d28d9",
              background: "rgba(139,92,246,.08)",
              border: "1px solid rgba(139,92,246,.25)",
              borderRadius: 999,
              padding: "1px 7px",
              maxWidth: "100%",
            }}
          >
            <i
              className="bx bx-purchase-tag-alt"
              style={{ fontSize: 10, flexShrink: 0 }}
            />
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {contacto.producto_ad}
            </span>
          </span>
        )}
        {etiquetas.slice(0, 3).map((et, i) => (
          <span
            key={i}
            title={et.nombre}
            style={{
              fontSize: "0.64rem",
              fontWeight: 700,
              color: "#fff",
              background: et.color || "#94a3b8",
              borderRadius: 999,
              padding: "1px 8px",
              maxWidth: 90,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {et.nombre}
          </span>
        ))}
        {etiquetas.length > 3 && (
          <span
            title={etiquetas
              .slice(3)
              .map((e) => e.nombre)
              .join(", ")}
            style={{
              fontSize: "0.64rem",
              fontWeight: 700,
              color: "#64748b",
              background: "rgba(100,116,139,.12)",
              borderRadius: 999,
              padding: "1px 7px",
            }}
          >
            +{etiquetas.length - 3}
          </span>
        )}
      </div>
    );

    return (
      <div
        key={contacto.id}
        className="kanban-contact-card"
        style={{
          backgroundColor: "#fff",
          borderRadius: 12,
          padding: "10px 12px",
          marginBottom: 8,
          fontSize: "0.8rem",
          border: esHuerfano
            ? "1px solid rgba(245,158,11,.35)"
            : "1px solid rgba(15,23,42,.06)",
          boxShadow: isDragging
            ? "0 14px 30px rgba(79,70,229,.22)"
            : "0 1px 3px rgba(15,23,42,.06)",
          transform: isDragging ? "rotate(1.5deg)" : undefined,
          transition: "box-shadow .15s, transform .15s",
        }}
      >
        {/* Fila principal: avatar + nombre/teléfono + preview */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 999,
                background: colorAvatar(nombre),
                color: "#fff",
                display: "grid",
                placeItems: "center",
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: ".02em",
              }}
            >
              {inicialesDe(nombre)}
            </div>
            <span
              title={botOn ? "Bot activo" : "Bot inactivo"}
              style={{
                position: "absolute",
                right: -2,
                bottom: -2,
                width: 11,
                height: 11,
                borderRadius: 999,
                background: botOn ? "#22c55e" : "#ef4444",
                border: "2px solid #fff",
              }}
            />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 600,
                color: "#0f172a",
                fontSize: "0.82rem",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {nombre}
            </div>
            {telefono && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  color: "#64748b",
                  fontSize: "0.73rem",
                  marginTop: 1,
                }}
              >
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {telefono}
                </span>
                {btnCopiar}
              </div>
            )}
          </div>
        </div>

        {badgeHuerfano}
        {chipsRow}

        {/* Pie: actividad en su propia línea y Abrir a lo ancho — no
            desborda la columna y es cómodo en celular */}
        <div
          style={{
            marginTop: 8,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            alignItems: "flex-start",
          }}
        >
          {tiempoSpan}
          {btnAbrir}
        </div>
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

  // ─── Reemplaza SOLO el bloque "if (!kanbanColumnas.length) return ..." en Estado_contactos.jsx ───

  if (!kanbanColumnas.length)
    return (
      <div
        className="kanban-empty-root"
        style={{
          minHeight: "calc(100vh - 5rem)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 1.5rem",
          background: "#fff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ambient glows */}
        <div
          style={{
            position: "absolute",
            top: "-15%",
            left: "10%",
            width: 420,
            height: 420,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(99,102,241,.08) 0%, transparent 70%)",
            filter: "blur(80px)",
            pointerEvents: "none",
            animation: "emptyFloat 8s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-10%",
            right: "5%",
            width: 360,
            height: 360,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(59,130,246,.06) 0%, transparent 70%)",
            filter: "blur(70px)",
            pointerEvents: "none",
            animation: "emptyFloat 10s ease-in-out infinite reverse",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            maxWidth: 520,
            width: "100%",
            textAlign: "center",
            animation: "emptyFadeUp .8s cubic-bezier(.16,1,.3,1) both",
          }}
        >
          {/* Animated icon cluster */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 8,
              marginBottom: 32,
            }}
          >
            {[
              { icon: "bx-bot", delay: "0s", color: "#818CF8", bg: "#EEF2FF" },
              {
                icon: "bx-columns",
                delay: ".15s",
                color: "#60A5FA",
                bg: "#EFF6FF",
              },
              {
                icon: "bx-right-arrow-alt",
                delay: ".3s",
                color: "#34D399",
                bg: "#ECFDF5",
              },
              {
                icon: "bx-trophy",
                delay: ".45s",
                color: "#FBBF24",
                bg: "#FFFBEB",
              },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  background: item.bg,
                  border: `1px solid ${item.color}30`,
                  display: "grid",
                  placeItems: "center",
                  animation: `emptyPop .5s cubic-bezier(.16,1,.3,1) ${item.delay} both`,
                }}
              >
                <i
                  className={`bx ${item.icon}`}
                  style={{ fontSize: 24, color: item.color }}
                />
              </div>
            ))}
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
              fontWeight: 800,
              color: "#111827",
              margin: "0 0 12px",
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
            }}
          >
            Tu embudo de contactos
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, #4F46E5, #3B82F6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              está listo para crearse
            </span>
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: "clamp(.9rem, 2vw, 1.05rem)",
              color: "#9CA3AF",
              lineHeight: 1.7,
              margin: "0 auto 32px",
              maxWidth: 440,
            }}
          >
            Visualiza en qué etapa se encuentra cada cliente. Configura las
            columnas de tu Kanban, personaliza el prompt de tu IA y automatiza
            el flujo de atención.
          </p>

          {/* Steps preview */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 6,
              marginBottom: 36,
              flexWrap: "wrap",
            }}
          >
            {["Contacto Inicial", "Remarketing", "Asesor", "Cerrado"].map(
              (label, i) => (
                <div
                  key={i}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 999,
                    background: "#F3F4F6",
                    border: "1px solid #E5E7EB",
                    fontSize: 13,
                    color: "#6B7280",
                    fontWeight: 600,
                    animation: `emptySlideIn .4s cubic-bezier(.16,1,.3,1) ${0.6 + i * 0.1}s both`,
                  }}
                >
                  {i > 0 && (
                    <span style={{ marginRight: 6, opacity: 0.4 }}>→</span>
                  )}
                  {label}
                </div>
              ),
            )}
          </div>

          {/* CTA */}
          <button
            onClick={() => {
              window.location.href = "/kanban_config";
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 32px",
              borderRadius: 16,
              background: "linear-gradient(135deg, #4F46E5, #6366F1)",
              color: "#fff",
              fontSize: "1rem",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              boxShadow:
                "0 8px 32px rgba(99,102,241,.25), inset 0 1px 0 rgba(255,255,255,.15)",
              transition: "all .2s",
              animation: "emptyFadeUp .6s cubic-bezier(.16,1,.3,1) .7s both",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px) scale(1.03)";
              e.currentTarget.style.boxShadow =
                "0 12px 40px rgba(99,102,241,.4), inset 0 1px 0 rgba(255,255,255,.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow =
                "0 8px 32px rgba(99,102,241,.25), inset 0 1px 0 rgba(255,255,255,.15)";
            }}
            className="kanban-empty-cta"
          >
            <i className="bx bx-bot" style={{ fontSize: 22 }} />
            Configurar agentes
            <i
              className="bx bx-right-arrow-alt"
              style={{ fontSize: 20, opacity: 0.7 }}
            />
          </button>

          <p
            style={{
              fontSize: 13,
              color: "#9CA3AF",
              marginTop: 16,
              animation: "emptyFadeUp .5s cubic-bezier(.16,1,.3,1) .9s both",
            }}
          >
            Ve a{" "}
            <strong style={{ color: "#6B7280" }}>
              Agentes → Configurar agentes
            </strong>{" "}
            y descarga una plantilla Kanban recomendada o crea tu propio flujo.
          </p>
        </div>

        <style>{`
          @keyframes emptyFloat {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-20px) scale(1.05); }
          }
          @keyframes emptyFadeUp {
            from { opacity: 0; transform: translateY(24px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes emptyPop {
            from { opacity: 0; transform: scale(.5) translateY(12px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
          @keyframes emptySlideIn {
            from { opacity: 0; transform: translateX(-10px); }
            to { opacity: 1; transform: translateX(0); }
          }
        `}</style>
      </div>
    );

  return (
    <div style={{ width: 0, minWidth: "100%", maxWidth: "100%" }}>
      {/* ── Zona superior: header + filtros (contenido al viewport) ── */}
      <div className="p-5 pb-0">
        {/* Header */}
        <div
          style={{
            background: "#171931",
            borderRadius: 16,
            padding: "16px 22px",
            marginBottom: "0.9rem",
            boxShadow: "0 8px 20px rgba(0,0,0,.35)",
            border: "1px solid rgba(255,255,255,.05)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 999,
                background: "linear-gradient(135deg,#2E8BFF,#6A5CFF)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: "1.25rem",
                boxShadow: "0 5px 16px rgba(46,139,255,.45)",
              }}
            >
              <i className="bx bx-bar-chart-alt-2" />
            </div>
            <div>
              <h1
                style={{
                  fontSize: "1.35rem",
                  fontWeight: 700,
                  margin: 0,
                  color: "#fff",
                  letterSpacing: "-0.01em",
                  lineHeight: 1.2,
                }}
              >
                Estado de contactos
              </h1>
              <p
                style={{
                  color: "#cbd5e1",
                  margin: "3px 0 0",
                  fontSize: "0.82rem",
                }}
              >
                En qué etapa del proceso está cada contacto.
              </p>
            </div>
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "6px 14px",
              borderRadius: 999,
              background: "rgba(255,255,255,.12)",
              fontSize: "0.8rem",
              color: "#fff",
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                backgroundColor: "#4caf50",
              }}
            />
            {totalContactos} contactos
          </div>
        </div>

        {/* ── Barra de filtros ──────────────────────────────── */}
        <KanbanFiltros
          id_configuracion={id_configuracion}
          onChange={(nuevosFiltros) => setFiltros(nuevosFiltros)}
          onSearch={setTerminoBusqueda}
          buscando={isLoading}
          kanbanColumnas={kanbanColumnas}
          columnasVisibles={columnasVisibles}
          onColumnasVisiblesChange={handleColumnasVisiblesChange}
          mostrarHuerfanos={mostrarHuerfanos}
          onMostrarHuerfanosChange={handleMostrarHuerfanosChange}
        />

        {isLoading && (
          <div
            style={{
              marginBottom: "0.6rem",
              fontSize: "0.75rem",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "#6366f1",
              fontWeight: 600,
            }}
          >
            <i className="bx bx-loader-alt bx-spin" style={{ fontSize: 14 }} />
            Cargando contactos...
          </div>
        )}
      </div>

      {/* ── Zona inferior: tablero con scroll horizontal propio ── */}
      <div
        className="px-5 pb-5"
        style={{
          width: "100%",
          overflowX: "auto",
          minWidth: 0,
        }}
      >
        {/* ── Tablero ───────────────────────────────────────── */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${columnasParaRender.length},minmax(235px,1fr))`,
              gap: "0.75rem",
              overflowX: "auto",
            }}
          >
            {columnasParaRender.map((column) => {
              const colKey = column.estado_db;
              const items = boardData[colKey]?.items || [];
              const isColLoading = !!boardData[colKey]?.loading;
              const esIaVentas = colKey === "ia_ventas";
              const esHuerfano = colKey === ORPHANS_KEY;
              const accent = esHuerfano
                ? "#f59e0b"
                : column.color_texto || "#6366f1";
              const total = boardData[colKey]?.total ?? items.length;

              return (
                <Droppable droppableId={colKey} key={colKey}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={{
                        backgroundColor: "#F1F3F6",
                        borderRadius: 14,
                        padding: "0 8px 8px",
                        display: "flex",
                        flexDirection: "column",
                        maxHeight: "75vh",
                        border: esHuerfano
                          ? "1.5px dashed rgba(245,158,11,.55)"
                          : "1.5px solid rgba(148,163,184,.4)",
                        borderTop: esHuerfano
                          ? "3px solid rgba(245,158,11,.6)"
                          : `3px solid ${accent}`,
                      }}
                    >
                      {/* Header columna */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                          padding: "10px 4px 8px",
                        }}
                      >
                        {column.icono ? (
                          <i
                            className={column.icono}
                            style={{
                              fontSize: 14,
                              color: accent,
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 999,
                              background: accent,
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <span
                          style={{
                            flex: 1,
                            minWidth: 0,
                            fontWeight: 700,
                            fontSize: "0.82rem",
                            color: "#1e293b",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={column.nombre}
                        >
                          {column.nombre}
                        </span>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            backgroundColor:
                              column.color_fondo || "rgba(15,23,42,.06)",
                            color: accent,
                            borderRadius: 999,
                            padding: "1px 8px",
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {total}
                        </span>
                        {esIaVentas && (
                          <button
                            onClick={() => {
                              setShowModalRemarketing(true);
                              fetchPlantillas();
                            }}
                            title="Configurar remarketing"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: 4,
                              borderRadius: 8,
                              border: "1px solid rgba(99,102,241,.3)",
                              background: "rgba(99,102,241,.08)",
                              color: "#4338ca",
                              cursor: "pointer",
                              flexShrink: 0,
                            }}
                          >
                            <i
                              className="bx bx-time-five"
                              style={{ fontSize: 14 }}
                            />
                          </button>
                        )}
                      </div>

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
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                >
                                  {renderContactCard(
                                    contacto,
                                    colKey,
                                    snapshot.isDragging,
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ))
                        ) : (
                          !isColLoading && (
                            <div
                              style={{
                                border: "1.5px dashed rgba(100,116,139,.25)",
                                borderRadius: 10,
                                padding: "16px 8px",
                                textAlign: "center",
                                fontSize: "0.72rem",
                                color: "#94a3b8",
                              }}
                            >
                              <i
                                className="bx bx-inbox"
                                style={{
                                  fontSize: 18,
                                  display: "block",
                                  marginBottom: 2,
                                }}
                              />
                              Sin contactos
                            </div>
                          )
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
      </div>

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
        .kanban-contact-card:hover{box-shadow:0 6px 16px rgba(15,23,42,.10) !important;transform:translateY(-1px)}
        .kanban-copy{opacity:0;transition:opacity .12s}
        .kanban-contact-card:hover .kanban-copy{opacity:1}
        .kanban-btn-abrir:hover{background:#4f46e5 !important;color:#fff !important;border-color:#4f46e5 !important}
        .kanban-btn-abrir:active{transform:scale(.97)}
      `}</style>
    </div>
  );
};

export default Estado_contactos;
