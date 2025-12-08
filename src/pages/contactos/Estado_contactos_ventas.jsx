import React, { useEffect, useState, useMemo } from "react";
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

function PreviewContent({
  tipo,
  texto,
  ruta,
  rutaRaw,
  replyRef,
  replyAuthor,
  isOpen,
}) {
  // ---- helpers ----
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

  // ---- UBICACIÓN ----
  const renderLocation = () => {
    try {
      const json = JSON.parse(texto || "{}");
      let { latitude, longitude, longitud } = json;
      if (longitude === undefined && longitud !== undefined) {
        longitude = longitud;
      }
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
    } catch (error) {
      console.error("Error al parsear la ubicación:", error);
      return (
        <div className="text-[13px] text-slate-600">
          Error al mostrar la ubicación.
        </div>
      );
    }
  };

  // ---- RAMAS ----

  // AUDIO
  if (tipo === "audio") {
    const src = rutaRaw || ruta;
    return (
      <div>
        <Quote />
        <PreviewAudioPlayer src={src} />
      </div>
    );
  }

  // IMAGEN / STICKER
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

  // VIDEO
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

  // DOCUMENTO
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

  // UBICACIÓN
  if (tipo === "location") {
    return (
      <div>
        <Quote />
        {renderLocation()}
      </div>
    );
  }

  // TEXTO / TEMPLATE (render simple; si quieres expansión de {{}} hazlo fuera)
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
  IA_VENTAS: {
    key: "IA_VENTAS",
    label: "IA VENTAS",
    bg: "#e8f5e9",
  },
  GENERAR_GUIA: {
    key: "GENERAR_GUIA",
    label: "GENERAR GUIA",
    bg: "#fff8e1",
  },
  SEGUIMIENTO: {
    key: "SEGUIMIENTO",
    label: "SEGUIMIENTO",
    bg: "#ede7f6",
  },
  CANCELADO: {
    key: "CANCELADO",
    label: "CANCELADO",
    bg: "#f08585ff",
  },
};

const Estado_contactos = () => {
  const navigate = useNavigate();
  const [id_configuracion, setId_configuracion] = useState(null);
  const [idPlataformaConf, setIdPlataformaConf] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [boardData, setBoardData] = useState({
    CONTACTO_INICIAL: [],
    IA_VENTAS: [],
    GENERAR_GUIA: [],
    SEGUIMIENTO: [],
    CANCELADO: [],
  });

  const [searchTerms, setSearchTerms] = useState({
    CONTACTO_INICIAL: "",
    IA_VENTAS: "",
    GENERAR_GUIA: "",
    SEGUIMIENTO: "",
    CANCELADO: "",
  });

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

  useEffect(() => {
    if (!id_configuracion) return;

    const fetchContactos = async () => {
      setIsLoading(true);
      try {
        const { data } = await chatApi.post(
          "/clientes_chat_center/listar_contactos_estado",
          { id_configuracion }
        );

        if (!data || !data.success || !data.data) {
          Toast.fire({
            icon: "error",
            title: "No se pudieron cargar los contactos",
          });
          setIsLoading(false);
          return;
        }

        // data.data ya es un objeto con las columnas:
        const boardFromApi = data.data;

        const nextBoard = {
          CONTACTO_INICIAL: boardFromApi.CONTACTO_INICIAL || [],
          IA_VENTAS: boardFromApi.IA_VENTAS || [],
          GENERAR_GUIA: boardFromApi.GENERAR_GUIA || [],
          SEGUIMIENTO: boardFromApi.SEGUIMIENTO || [],
          CANCELADO: boardFromApi.CANCELADO || [],
        };

        setBoardData(nextBoard);
      } catch (error) {
        console.error(error);
        Toast.fire({
          icon: "error",
          title: "Error al consultar la API de contactos",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchContactos();
  }, [id_configuracion]);

  const totalContactos = useMemo(() => {
    return Object.values(boardData).reduce(
      (acc, lista) => acc + (lista?.length || 0),
      0
    );
  }, [boardData]);

  const renderContactCard = (contacto) => {
    const nombreCompleto =
      [contacto.nombre_cliente, contacto.apellido_cliente]
        .filter(Boolean)
        .join(" ") || "Sin nombre";

    const telefono = contacto.telefono_limpio || null;

    const botColor = contacto.bot_openia === 1 ? "#2ECC71" : "#E74C3C"; // verde / rojo

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
        {/* fila nombre + BOT */}
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
            {/* BOT */}
            <i
              className="bx bx-bot"
              style={{
                fontSize: "1.25rem",
                color: botColor,
              }}
            ></i>

            {/* OJO */}
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
            ></i>
          </div>
        </div>

        {telefono && (
          <div style={{ opacity: 0.85, marginBottom: 6 }}>📱 {telefono}</div>
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

        {/* Botón Abrir */}
        <button
          onClick={() =>
            navigate(
              `/chat?phone=${encodeURIComponent(contacto.telefono_limpio)}`
            )
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

        <style>{`
        .kanban-btn-abrir:hover {
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 6px 14px rgba(46,139,255,0.45);
        }
        .kanban-btn-abrir:active {
          transform: scale(0.97);
        }
      `}</style>

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
                ></i>
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

                <div
                  style={{
                    textAlign: "right",
                    marginTop: "6px",
                  }}
                >
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

  const filterContacts = (lista, search) => {
    if (!search.trim()) return lista;

    const term = search.toLowerCase();

    return lista.filter((c) => {
      const nombre = c.nombre_cliente?.toLowerCase() || "";
      const apellido = c.apellido_cliente?.toLowerCase() || "";
      const telefono = c.telefono_limpio?.toLowerCase() || "";

      return (
        nombre.includes(term) ||
        apellido.includes(term) ||
        telefono.includes(term)
      );
    });
  };

  /* preview */
  const [previewVisible, setPreviewVisible] = useState(false);
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
        }
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

  /* preview */

  const onDragEnd = async (result) => {
    const { source, destination } = result;

    if (!destination) return;

    const startCol = source.droppableId;
    const endCol = destination.droppableId;

    // 🛑 Mismo índice y misma columna → NO HACER NADA
    if (startCol === endCol && source.index === destination.index) {
      return;
    }

    const startList = Array.from(boardData[startCol]);
    const endList = Array.from(boardData[endCol]);

    // Caso 1: 🟦 Mover dentro de la misma columna
    if (startCol === endCol) {
      const [movedItem] = startList.splice(source.index, 1);
      startList.splice(destination.index, 0, movedItem);

      setBoardData({
        ...boardData,
        [startCol]: startList,
      });

      return; // sin API porque no cambia el estado verdadero
    }

    // Caso 2: 🟩 Mover a otra columna
    const [movedItem] = startList.splice(source.index, 1);
    endList.splice(destination.index, 0, movedItem);

    setBoardData({
      ...boardData,
      [startCol]: startList,
      [endCol]: endList,
    });

    // API: actualizar estado del cliente
    try {
      await chatApi.post("/clientes_chat_center/actualizar_estado", {
        id_cliente: movedItem.id,
        nuevo_estado: endCol,
        id_configuracion,
      });

      Toast.fire({
        icon: "success",
        title: "Estado actualizado",
      });
    } catch (error) {
      console.error(error);
      Toast.fire({
        icon: "error",
        title: "Error al actualizar estado",
      });
    }
  };

  return (
    <div className="p-5">
      {/* Encabezado estilizado */}
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
        {/* ICONO + TÍTULO */}
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
            📊
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
              Visualiza de forma clara en qué etapa del proceso se encuentra
              cada contacto y prioriza tus seguimientos.
            </p>
          </div>
        </div>

        {/* TOTAL CONTACTOS */}
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
            ></span>
            <span style={{ fontWeight: 600 }}>Contactos activos</span>
          </div>

          <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>
            {totalContactos}
          </div>
        </div>
      </div>

      {/* Estado de carga */}
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
          ></span>
          Cargando contactos…
        </div>
      )}

      {/* Contenedor Kanban */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: "1rem",
          }}
        >
          {Object.values(KANBAN_COLUMNS).map((column) => {
            const listaOriginal = boardData[column.key] || [];
            const listaFiltrada = filterContacts(
              listaOriginal,
              searchTerms[column.key]
            );

            return (
              <Droppable droppableId={column.key} key={column.key}>
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
                    {/* Header */}
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
                      <span
                        style={{
                          fontSize: "0.8rem",
                          backgroundColor: "rgba(255,255,255,0.9)",
                          borderRadius: "999px",
                          padding: "3px 9px",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                        }}
                      >
                        {listaFiltrada.length}
                      </span>
                    </div>

                    {/* Input de búsqueda */}
                    <input
                      type="text"
                      placeholder="Buscar..."
                      value={searchTerms[column.key]}
                      onChange={(e) =>
                        setSearchTerms({
                          ...searchTerms,
                          [column.key]: e.target.value,
                        })
                      }
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

                    {/* Divider */}
                    <div
                      style={{
                        height: 1,
                        backgroundColor: "rgba(0,0,0,0.06)",
                        marginBottom: "8px",
                      }}
                    ></div>

                    {/* Lista filtrada */}
                    <div
                      style={{
                        overflowY: "auto",
                        paddingRight: "4px",
                      }}
                    >
                      {listaFiltrada.length > 0 ? (
                        listaFiltrada.map((contacto, index) => (
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
                    </div>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>

      {/* Pequeño estilo inline para animar el puntito (sin tocar CSS global) */}
      <style>{`
        @keyframes pulseDot {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.6); opacity: 0.4; }
          100% { transform: scale(1); opacity: 1; }
        }
        .kanban-contact-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0,0,0,0.12);
        }
      `}</style>

      <style>
        {`
@keyframes expand {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
`}
      </style>
    </div>
  );
};

export default Estado_contactos;
