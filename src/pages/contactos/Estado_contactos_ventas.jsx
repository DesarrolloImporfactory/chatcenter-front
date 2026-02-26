import React, { useEffect, useRef, useMemo, useState } from "react";
import Swal from "sweetalert2";
import Select, { components } from "react-select";
import { useNavigate, Link, useLocation } from "react-router-dom";
import chatApi from "../../api/chatcenter";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener("mouseenter", Swal.stopTimer);
    toast.addEventListener("mouseleave", Swal.resumeTimer);
  },
});

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

  const renderLocation = () => {
    try {
      const json = JSON.parse(texto || "{}");
      let { latitude, longitude, longitud } = json;
      if (longitude === undefined && longitud !== undefined)
        longitude = longitud;
      if (
        !Number.isFinite(Number(latitude)) ||
        !Number.isFinite(Number(longitude))
      ) {
        return (
          <div className="text-[13px] text-slate-600">
            No se pudo leer la ubicación.
          </div>
        );
      }
      const src = `https://www.google.com/maps/embed/v1/place?key=AIzaSyDGulcdBtz_Mydtmu432GtzJz82J_yb-rs&q=${latitude},${longitude}&zoom=15`;
      const link = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      return (
        <div className="w-full">
          <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
            <iframe
              title="Mapa de ubicación"
              width="100%"
              height="220"
              frameBorder="0"
              style={{ border: 0 }}
              src={src}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-blue-700 hover:underline"
          >
            <i className="bx bx-map-pin" /> Ver ubicación en Google Maps
          </a>
        </div>
      );
    } catch {
      return (
        <div className="text-[13px] text-slate-600">
          Error al mostrar la ubicación.
        </div>
      );
    }
  };

  if (tipo === "audio") {
    const src = rutaRaw || ruta;
    return (
      <div>
        <Quote />
        <audio controls src={src} className="w-full" />
      </div>
    );
  }
  if (tipo === "image" || tipo === "sticker") {
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
  }
  if (tipo === "video") {
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
  }
  if (tipo === "document") {
    const meta = parseDocMeta(ruta);
    const href = /^https?:\/\//.test(meta.ruta)
      ? meta.ruta
      : `https://new.imporsuitpro.com/${meta.ruta || ""}`;
    const sizeLabel = meta.size
      ? meta.size > 1024 * 1024
        ? `${(meta.size / 1024 / 1024).toFixed(2)} MB`
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
  if (tipo === "location") {
    return (
      <div>
        <Quote />
        {renderLocation()}
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

const KANBAN_COLUMNS = {
  CONTACTO_INICIAL: {
    key: "CONTACTO_INICIAL",
    label: "CONTACTO INICIAL",
    bg: "#e3f2fd",
  },
  IA_VENTAS: { key: "IA_VENTAS", label: "IA VENTAS", bg: "#e8f5e9" },
  GENERAR_GUIA: { key: "GENERAR_GUIA", label: "GENERAR GUIA", bg: "#fff8e1" },
  SEGUIMIENTO: { key: "SEGUIMIENTO", label: "SEGUIMIENTO", bg: "#ede7f6" },
  CANCELADO: { key: "CANCELADO", label: "CANCELADO", bg: "#fce4ec" },
};

const Estado_contactos = () => {
  const navigate = useNavigate();
  const [id_configuracion, setId_configuracion] = useState(null);
  const [idPlataformaConf, setIdPlataformaConf] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const COLUMNS_KEYS = Object.keys(KANBAN_COLUMNS);

  const makeInitialBoard = () =>
    COLUMNS_KEYS.reduce((acc, key) => {
      acc[key] = {
        items: [],
        cursor: null,
        hasMore: true,
        loading: false,
        search: "",
      };
      return acc;
    }, {});

  const [boardData, setBoardData] = useState(makeInitialBoard);
  const boardRef = useRef(boardData);

  useEffect(() => {
    boardRef.current = boardData;
  }, [boardData]);

  // —— Estado del modal de remarketing ——
  const [showModalRemarketing, setShowModalRemarketing] = useState(false);
  const [plantillas, setPlantillas] = useState([]);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState("");
  const [tiempoRemarketing, setTiempoRemarketing] = useState("0");
  const [loadingPlantillas, setLoadingPlantillas] = useState(false);
  const [guardandoRemarketing, setGuardandoRemarketing] = useState(false);

  const fetchPlantillas = async () => {
    if (!id_configuracion) return;
    setLoadingPlantillas(true);
    try {
      const res = await chatApi.post(
        "whatsapp_managment/obtenerTemplatesWhatsapp",
        { id_configuracion },
      );
      const data = res.data?.data || [];
      const unicas = data.filter(
        (tpl, index, self) => index === self.findIndex((t) => t.id === tpl.id),
      );
      setPlantillas(unicas);
    } catch (error) {
      console.error("Error cargando plantillas:", error);
      setPlantillas([]);
    } finally {
      setLoadingPlantillas(false);
    }
  };

  const handleAbrirRemarketing = () => {
    setShowModalRemarketing(true);
    fetchPlantillas();
  };

  const guardarRemarketing = async () => {
    if (!plantillaSeleccionada || tiempoRemarketing === "0") {
      Toast.fire({
        icon: "warning",
        title: "Seleccione una plantilla y un tiempo",
      });
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
      Toast.fire({
        icon: "success",
        title: "Remarketing configurado correctamente",
      });
      setShowModalRemarketing(false);
    } catch (error) {
      console.error(error);
      Toast.fire({ icon: "error", title: "Error al guardar la configuración" });
    } finally {
      setGuardandoRemarketing(false);
    }
  };
  // —— fin remarketing ——

  useEffect(() => {
    const idc = localStorage.getItem("id_configuracion");
    if (idc) setId_configuracion(parseInt(idc, 10));
    const idp = localStorage.getItem("id_plataforma_conf");
    if (idp === "null" || idp === null) {
      setIdPlataformaConf(null);
    } else {
      const parsed = Number.isNaN(parseInt(idp, 10)) ? null : parseInt(idp, 10);
      setIdPlataformaConf(parsed);
    }
  }, []);

  const LIMIT = 20;

  const mergeColumnsResponse = (respData, keys, { append = false } = {}) => {
    setBoardData((prev) => {
      const next = { ...prev };
      keys.forEach((k) => {
        const col = respData?.[k];
        const items = col?.items || [];
        const page = col?.page || {};
        const prevItems = prev[k]?.items || [];
        let merged = append ? [...prevItems, ...items] : items;
        const seen = new Set();
        merged = merged.filter((x) => {
          const id = String(x?.id);
          if (!id) return true;
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        next[k] = {
          ...prev[k],
          items: merged,
          cursor: page.next_cursor ?? null,
          hasMore: !!page.has_more,
          loading: false,
        };
      });
      return next;
    });
  };

  const setColumnsLoading = (keys, loading) => {
    setBoardData((prev) => {
      const next = { ...prev };
      keys.forEach((k) => {
        next[k] = { ...prev[k], loading };
      });
      return next;
    });
  };

  useEffect(() => {
    if (!id_configuracion) return;
    const fetchContactos = async () => {
      setIsLoading(true);
      setColumnsLoading(COLUMNS_KEYS, true);
      try {
        const { data } = await chatApi.post(
          "/clientes_chat_center/listar_contactos_estado",
          {
            id_configuracion,
            columnKeys: COLUMNS_KEYS,
            limit: LIMIT,
            cursors: {},
            search: {},
          },
        );
        if (!data?.success || !data?.data) {
          Toast.fire({
            icon: "error",
            title: "No se pudieron cargar los contactos",
          });
          return;
        }
        mergeColumnsResponse(data.data, COLUMNS_KEYS, { append: false });
      } catch (error) {
        console.error(error);
        Toast.fire({
          icon: "error",
          title: "Error al consultar la API de contactos",
        });
      } finally {
        setIsLoading(false);
        setColumnsLoading(COLUMNS_KEYS, false);
      }
    };
    fetchContactos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id_configuracion]);

  const totalContactos = useMemo(() => {
    return Object.values(boardData).reduce(
      (acc, col) => acc + (col?.items?.length || 0),
      0,
    );
  }, [boardData]);

  /* preview */
  const [previewData, setPreviewData] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const handlePreview = async (contacto) => {
    try {
      setPreviewLoading(true);
      setPreviewData(null);
      const { data } = await chatApi.post(
        "/clientes_chat_center/listar_ultimo_mensaje",
        {
          id_cliente: contacto.id,
          id_configuracion,
        },
      );
      if (
        !data ||
        !data.success ||
        !Array.isArray(data.data) ||
        data.data.length === 0
      ) {
        Toast.fire({ icon: "error", title: "No hay mensajes aún" });
        setPreviewLoading(false);
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
    } catch (error) {
      console.error(error);
      Toast.fire({ icon: "error", title: "Error API" });
    } finally {
      setPreviewLoading(false);
    }
  };

  const renderContactCard = (contacto) => {
    const nombreCompleto =
      [contacto.nombre_cliente, contacto.apellido_cliente]
        .filter(Boolean)
        .join(" ") || "Sin nombre";
    const telefono = contacto.telefono_limpio || null;
    const botColor = contacto.bot_openia === 1 ? "#2ECC71" : "#E74C3C";

    return (
      <div
        key={contacto.id}
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          padding: "10px 12px",
          boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
          marginBottom: "10px",
          fontSize: "0.85rem",
          border: "1px solid rgba(0,0,0,0.04)",
          transition: "transform 0.12s ease, box-shadow 0.12s ease",
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
          <span style={{ fontWeight: 600 }}>{nombreCompleto}</span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <i
              className="bx bx-bot"
              style={{ fontSize: "1.25rem", color: botColor }}
            />
            <i
              className="bx bx-show"
              title="Último mensaje recibido"
              style={{
                fontSize: "1.2rem",
                color: "#555",
                cursor: "pointer",
                transition: "all .2s ease",
              }}
              onClick={(e) => {
                e.stopPropagation();
                handlePreview(contacto);
                setExpandedId(contacto.id);
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
              <i className="bx bx-mobile" style={{ fontSize: "14px" }} />
              <span>{telefono}</span>
            </div>
            <button
              type="button"
              title="Copiar número"
              onClick={(e) => {
                e.stopPropagation();
                const value = String(telefono);
                if (navigator?.clipboard?.writeText) {
                  navigator.clipboard
                    .writeText(value)
                    .then(() =>
                      Toast.fire({ icon: "success", title: "Número copiado" }),
                    )
                    .catch(() =>
                      Toast.fire({ icon: "error", title: "No se pudo copiar" }),
                    );
                  return;
                }
                try {
                  const ta = document.createElement("textarea");
                  ta.value = value;
                  ta.style.position = "fixed";
                  ta.style.opacity = "0";
                  document.body.appendChild(ta);
                  ta.select();
                  document.execCommand("copy");
                  document.body.removeChild(ta);
                  Toast.fire({ icon: "success", title: "Número copiado" });
                } catch {
                  Toast.fire({ icon: "error", title: "No se pudo copiar" });
                }
              }}
              style={{
                border: "none",
                background: "transparent",
                padding: "6px 8px",
                borderRadius: "10px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all .15s ease",
                color: "#9CA3AF",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(0,0,0,0.06)";
                e.currentTarget.style.color = "#4B5563";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#9CA3AF";
              }}
            >
              <i className="bx bx-copy" style={{ fontSize: "18px" }} />
            </button>
          </div>
        )}

        {contacto.estado_contacto && (
          <div
            style={{
              display: "inline-block",
              fontSize: "0.75rem",
              padding: "2px 8px",
              borderRadius: "999px",
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
            borderRadius: "10px",
            border: "none",
            background: "linear-gradient(135deg, #2E8BFF, #6A5CFF)",
            color: "white",
            fontWeight: 600,
            fontSize: "0.85rem",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: "0 3px 8px rgba(46,139,255,0.3)",
          }}
          className="kanban-btn-abrir"
        >
          Abrir
        </button>

        {expandedId === contacto.id && (
          <div
            style={{
              marginTop: "10px",
              background: "#F8F9FF",
              borderRadius: "12px",
              padding: "14px",
              border: "1px solid rgba(0,0,0,.05)",
              animation: "expand .2s ease",
              minHeight: "80px",
            }}
          >
            {previewLoading && (
              <div
                style={{
                  textAlign: "center",
                  padding: "25px 0",
                  opacity: 0.7,
                  fontSize: "13px",
                }}
              >
                <i
                  className="bx bx-loader-alt bx-spin"
                  style={{ fontSize: "20px" }}
                />
                <div>Cargando mensaje...</div>
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
                <div style={{ textAlign: "right", marginTop: "6px" }}>
                  <span
                    style={{
                      fontSize: "12px",
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

  const searchTimersRef = React.useRef({});

  const onSearchChange = (colKey, value) => {
    setBoardData((prev) => ({
      ...prev,
      [colKey]: { ...prev[colKey], search: value },
    }));
    if (searchTimersRef.current[colKey])
      clearTimeout(searchTimersRef.current[colKey]);
    searchTimersRef.current[colKey] = setTimeout(async () => {
      try {
        setBoardData((prev) => ({
          ...prev,
          [colKey]: {
            ...prev[colKey],
            items: [],
            cursor: null,
            hasMore: true,
            loading: true,
          },
        }));
        const { data } = await chatApi.post(
          "/clientes_chat_center/listar_contactos_estado",
          {
            id_configuracion,
            columnKeys: [colKey],
            limit: LIMIT,
            cursors: { [colKey]: null },
            search: { [colKey]: value },
          },
        );
        if (!data?.success || !data?.data) return;
        mergeColumnsResponse(data.data, [colKey], { append: false });
      } catch (e) {
        console.error(e);
        Toast.fire({ icon: "error", title: "Error buscando" });
        setBoardData((prev) => ({
          ...prev,
          [colKey]: { ...prev[colKey], loading: false },
        }));
      }
    }, 350);
  };

  const scrollLockRef = useRef({});

  const loadMoreColumn = async (colKey) => {
    const col = boardRef.current?.[colKey];
    if (!col || col.loading || !col.hasMore) return;
    const cursor = col.cursor || null;
    const search = col.search || "";
    setBoardData((prev) => ({
      ...prev,
      [colKey]: { ...prev[colKey], loading: true },
    }));
    try {
      const { data } = await chatApi.post(
        "/clientes_chat_center/listar_contactos_estado",
        {
          id_configuracion,
          columnKeys: [colKey],
          limit: LIMIT,
          cursors: { [colKey]: cursor },
          search: { [colKey]: search },
        },
      );
      if (!data?.success || !data?.data) {
        setBoardData((prev) => ({
          ...prev,
          [colKey]: { ...prev[colKey], loading: false },
        }));
        return;
      }
      mergeColumnsResponse(data.data, [colKey], { append: true });
    } catch (e) {
      console.error(e);
      Toast.fire({ icon: "error", title: "Error cargando más" });
      setBoardData((prev) => ({
        ...prev,
        [colKey]: { ...prev[colKey], loading: false },
      }));
    }
  };

  const onDragEnd = async (result) => {
    const { source, destination } = result;
    if (!destination) return;
    const startCol = source.droppableId;
    const endCol = destination.droppableId;
    if (startCol === endCol && source.index === destination.index) return;

    const startList = Array.from(boardData[startCol]?.items || []);
    const endList = Array.from(boardData[endCol]?.items || []);

    if (startCol === endCol) {
      const [movedItem] = startList.splice(source.index, 1);
      startList.splice(destination.index, 0, movedItem);
      setBoardData((prev) => ({
        ...prev,
        [startCol]: { ...prev[startCol], items: startList },
      }));
      return;
    }

    const [movedItem] = startList.splice(source.index, 1);
    endList.splice(destination.index, 0, movedItem);
    setBoardData((prev) => ({
      ...prev,
      [startCol]: { ...prev[startCol], items: startList },
      [endCol]: { ...prev[endCol], items: endList },
    }));

    try {
      await chatApi.post("/clientes_chat_center/actualizar_estado", {
        id_cliente: movedItem.id,
        nuevo_estado: endCol,
        id_configuracion,
      });
      Toast.fire({ icon: "success", title: "Estado actualizado" });
    } catch (error) {
      console.error(error);
      Toast.fire({ icon: "error", title: "Error al actualizar estado" });
    }
  };

  return (
    <div className="p-5">
      {/* Encabezado */}
      <div
        style={{
          background: "#171931",
          borderRadius: "18px",
          padding: "22px 26px",
          marginBottom: "1.8rem",
          boxShadow: "0 12px 28px rgba(0,0,0,0.45)",
          border: "1px solid rgba(255,255,255,0.05)",
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
              borderRadius: "999px",
              background: "linear-gradient(135deg, #2E8BFF, #6A5CFF)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: "1.5rem",
              boxShadow: "0 6px 20px rgba(46,139,255,0.45)",
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
                letterSpacing: "0.03em",
                color: "#ffffff",
              }}
            >
              Distribución de estados contactos
            </h1>
            <p
              style={{
                color: "#d3d3d3",
                margin: "6px 0 0",
                fontSize: "1rem",
                letterSpacing: "0.01em",
              }}
            >
              Visualiza en qué etapa del proceso se encuentra cada contacto y
              prioriza tus seguimientos.
            </p>
          </div>
        </div>
        <div
          style={{
            textAlign: "right",
            fontSize: "0.9rem",
            minWidth: "130px",
            color: "#ffffff",
          }}
        >
          <div
            style={{
              padding: "5px 12px",
              borderRadius: "999px",
              backgroundColor: "rgba(255,255,255,0.12)",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "6px",
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "999px",
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

      {isLoading && (
        <div
          style={{
            marginBottom: "1rem",
            fontSize: "0.9rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 12px",
            borderRadius: "999px",
            backgroundColor: "#e3f2fd",
            color: "#0d47a1",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "999px",
              backgroundColor: "#0d47a1",
              animation: "pulseDot 1s infinite ease-in-out",
            }}
          />
          Cargando contactos...
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: "1rem",
          }}
        >
          {Object.values(KANBAN_COLUMNS).map((column) => {
            const colKey = column.key;
            const items = boardData[colKey]?.items || [];
            const isColLoading = !!boardData[colKey]?.loading;
            const isIaVentas = colKey === "IA_VENTAS";

            return (
              <Droppable droppableId={colKey} key={colKey}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      backgroundColor: column.bg,
                      borderRadius: "16px",
                      padding: "12px",
                      display: "flex",
                      flexDirection: "column",
                      maxHeight: "75vh",
                      boxShadow: "0 8px 18px rgba(0,0,0,0.08)",
                      border: "1px solid rgba(0,0,0,0.04)",
                    }}
                  >
                    {/* Header de columna */}
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
                      <span>{column.label}</span>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.8rem",
                            backgroundColor: "rgba(255,255,255,0.9)",
                            borderRadius: "999px",
                            padding: "3px 9px",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                          }}
                        >
                          {items.length}
                        </span>

                        {/* Botón de remarketing — solo en columna IA_VENTAS */}
                        {isIaVentas && (
                          <button
                            title="Configurar reenvío automático de mensaje"
                            onClick={handleAbrirRemarketing}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "4px 10px",
                              borderRadius: "999px",
                              border: "1px solid rgba(99,102,241,0.3)",
                              background: "rgba(99,102,241,0.08)",
                              color: "#4338ca",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                              whiteSpace: "nowrap",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background =
                                "rgba(99,102,241,0.18)";
                              e.currentTarget.style.borderColor =
                                "rgba(99,102,241,0.5)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background =
                                "rgba(99,102,241,0.08)";
                              e.currentTarget.style.borderColor =
                                "rgba(99,102,241,0.3)";
                            }}
                          >
                            <i
                              className="bx bx-time-five"
                              style={{ fontSize: "13px" }}
                            />
                            Remarketing
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Búsqueda */}
                    <input
                      type="text"
                      placeholder="Buscar..."
                      value={boardData[colKey]?.search || ""}
                      onChange={(e) => onSearchChange(colKey, e.target.value)}
                      style={{
                        padding: "6px 10px",
                        marginBottom: "8px",
                        borderRadius: "8px",
                        border: "1px solid rgba(0,0,0,0.15)",
                        fontSize: "0.8rem",
                        outline: "none",
                        transition: "all 0.15s ease",
                      }}
                      onFocus={(e) =>
                        (e.target.style.boxShadow = "0 0 6px rgba(0,0,0,0.15)")
                      }
                      onBlur={(e) => (e.target.style.boxShadow = "none")}
                    />

                    <div
                      style={{
                        height: 1,
                        backgroundColor: "rgba(0,0,0,0.06)",
                        marginBottom: "8px",
                      }}
                    />

                    {/* Lista */}
                    <div
                      style={{ overflowY: "auto", paddingRight: "4px" }}
                      onScroll={(e) => {
                        const el = e.currentTarget;
                        if (
                          el.scrollTop + el.clientHeight <
                          el.scrollHeight - 120
                        )
                          return;
                        if (scrollLockRef.current[column.key]) return;
                        scrollLockRef.current[column.key] = true;
                        loadMoreColumn(column.key).finally(() => {
                          setTimeout(() => {
                            scrollLockRef.current[column.key] = false;
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
                            fontSize: "12px",
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

      {/* ——— Modal de Remarketing ——— */}
      {showModalRemarketing && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 border border-gray-100">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 grid place-items-center shrink-0">
                  <i className="bx bx-time-five text-xl text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Reenvío automático de mensaje
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Configure cuándo y con qué plantilla se contactará
                    nuevamente a los clientes en etapa de IA Ventas que no han
                    respondido.
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

            {/* Aviso informativo */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
              <div className="flex items-start gap-2 text-sm text-indigo-800">
                <i className="bx bx-info-circle text-base mt-0.5 shrink-0" />
                <span>
                  Transcurrido el tiempo indicado, el sistema enviará
                  automáticamente la plantilla seleccionada al cliente si no ha
                  vuelto a escribir. Solo se procesarán plantillas aprobadas por
                  Meta.
                </span>
              </div>
            </div>

            {/* Tiempo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tiempo de espera antes del reenvío
              </label>
              <select
                value={tiempoRemarketing}
                onChange={(e) => setTiempoRemarketing(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              >
                <option value="0">Seleccione un tiempo</option>
                <option value="1">1 hora sin respuesta</option>
                <option value="3">3 horas sin respuesta</option>
                <option value="5">5 horas sin respuesta</option>
                <option value="10">10 horas sin respuesta</option>
                <option value="20">20 horas sin respuesta</option>
              </select>
            </div>

            {/* Plantilla */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plantilla de mensaje a enviar
              </label>
              {loadingPlantillas ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                  <i className="bx bx-loader-alt bx-spin text-base" />
                  Cargando plantillas...
                </div>
              ) : (
                <>
                  <select
                    value={plantillaSeleccionada}
                    onChange={(e) => setPlantillaSeleccionada(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  >
                    <option value="">Seleccione una plantilla</option>
                    {plantillas.map((tpl) => (
                      <option key={tpl.id} value={tpl.name}>
                        {tpl.name}
                        {tpl.status !== "APPROVED" ? " — No aprobada" : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <i className="bx bx-error-circle text-sm" />
                    Solo se enviará si la plantilla está aprobada por Meta.
                  </p>
                </>
              )}
            </div>

            {/* Acciones */}
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
                Guardar configuración
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulseDot {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.6); opacity: 0.4; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes expand {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .kanban-contact-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0,0,0,0.12);
        }
        .kanban-btn-abrir:hover {
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 6px 14px rgba(46,139,255,0.45);
        }
        .kanban-btn-abrir:active { transform: scale(0.97); }
      `}</style>
    </div>
  );
};

export default Estado_contactos;
