import React, { useEffect, useState, useMemo } from "react";
import Swal from "sweetalert2";
import Select, { components } from "react-select";
import { useNavigate, Link, useLocation } from "react-router-dom";
import chatApi from "../../api/chatcenter";

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

const KANBAN_COLUMNS = {
  CONTACTO_INICIAL: {
    key: "CONTACTO_INICIAL",
    label: "CONTACTO INICIAL",
    bg: "#e3f2fd",
  },
  PLATAFORMAS_Y_CLASES: {
    key: "PLATAFORMAS_Y_CLASES",
    label: "PLATAFORMAS Y CLASES",
    bg: "#e8f5e9",
  },
  PRODUCTOS_Y_PROVEEDORES: {
    key: "PRODUCTOS_Y_PROVEEDORES",
    label: "PRODUCTOS Y PROVEEDORES",
    bg: "#fff8e1",
  },
  VENTAS: {
    key: "VENTAS",
    label: "VENTAS",
    bg: "#fce4ec",
  },
  ASESOR: {
    key: "ASESOR",
    label: "ASESOR",
    bg: "#ede7f6",
  },
};

const Estado_contactos = () => {
  const navigate = useNavigate();
  const [id_configuracion, setId_configuracion] = useState(null);
  const [idPlataformaConf, setIdPlataformaConf] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [boardData, setBoardData] = useState({
    CONTACTO_INICIAL: [],
    PLATAFORMAS_Y_CLASES: [],
    PRODUCTOS_Y_PROVEEDORES: [],
    VENTAS: [],
    ASESOR: [],
  });

  const [searchTerms, setSearchTerms] = useState({
    CONTACTO_INICIAL: "",
    PLATAFORMAS_Y_CLASES: "",
    PRODUCTOS_Y_PROVEEDORES: "",
    VENTAS: "",
    ASESOR: "",
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
        // { CONTACTO_INICIAL: [...], PLATAFORMAS_Y_CLASES: [...], ... }
        const boardFromApi = data.data;

        const nextBoard = {
          CONTACTO_INICIAL: boardFromApi.CONTACTO_INICIAL || [],
          PLATAFORMAS_Y_CLASES: boardFromApi.PLATAFORMAS_Y_CLASES || [],
          PRODUCTOS_Y_PROVEEDORES: boardFromApi.PRODUCTOS_Y_PROVEEDORES || [],
          VENTAS: boardFromApi.VENTAS || [],
          ASESOR: boardFromApi.ASESOR || [],
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

    const telefono = "+"+contacto.telefono_limpio || null;

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
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{nombreCompleto}</div>

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

        {/* Animación hover */}
        <style>{`
        .kanban-btn-abrir:hover {
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 6px 14px rgba(46,139,255,0.45);
        }
        .kanban-btn-abrir:active {
          transform: scale(0.97);
        }
      `}</style>
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
            <div
              key={column.key}
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
                  listaFiltrada.map((contacto) => renderContactCard(contacto))
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
            </div>
          );
        })}
      </div>

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
    </div>
  );
};

export default Estado_contactos;
