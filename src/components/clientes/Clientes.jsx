// /src/pages/Clientes.jsx (Premium/Formal UI - GoHighLevel vibe)
import { useEffect, useMemo, useRef, useState } from "react";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";
import io from "socket.io-client";
import { jwtDecode } from "jwt-decode";
import Select from "react-select";

/* =================== Helpers SweetAlert2 =================== */
const swalConfirm = async (title, text, confirmText = "Sí, continuar") => {
  const res = await Swal.fire({
    title,
    text,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: "Cancelar",
    reverseButtons: true,
    focusCancel: true,
  });
  return res.isConfirmed;
};
const swalToast = (title, icon = "success") =>
  Swal.fire({
    toast: true,
    position: "top-end",
    icon,
    title,
    showConfirmButton: false,
    timer: 2200,
    timerProgressBar: true,
  });
const swalError = (title = "Ocurrió un error", text) =>
  Swal.fire({ icon: "error", title, text });
const swalInfo = (title, text) =>
  Swal.fire({ icon: "info", title, text, confirmButtonText: "Entendido" });
const swalLoading = (title = "Procesando...") => {
  Swal.fire({
    title,
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });
};
const swalClose = () => Swal.close();

/* =================== Utils =================== */
const fmtDate = (d) => {
  if (!d) return "-";
  const x = new Date(d);
  return isNaN(+x) ? "-" : x.toLocaleDateString();
};
const fmtTime = (d) => {
  if (!d) return "-";
  const x = new Date(d);
  return isNaN(+x)
    ? "-"
    : x.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};
const fmtDateTime = (d) => {
  if (!d) return "-";
  const x = new Date(d);
  return isNaN(+x)
    ? "-"
    : `${x.toLocaleDateString()} ${x.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
};
const timeAgo = (d) => {
  if (!d) return "-";
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (!isFinite(s)) return "-";
  const abs = Math.abs(s);
  const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
  if (abs < 60) return rtf.format(-Math.round(s), "second");
  const m = abs / 60;
  if (m < 60) return rtf.format(-Math.round(m), "minute");
  const h = m / 60;
  if (h < 24) return rtf.format(-Math.round(h), "hour");
  const d2 = h / 24;
  if (d2 < 30) return rtf.format(-Math.round(d2), "day");
  const mo = d2 / 30;
  if (mo < 12) return rtf.format(-Math.round(mo), "month");
  const y = mo / 12;
  return rtf.format(-Math.round(y), "year");
};

// admite id_cliente_chat_center como posible ID (combina ambos)
const getId = (r) =>
  r?.id ?? r?.id_cliente_chat_center ?? r?._id ?? r?.id_cliente ?? null;

const initials = (n, a) => {
  const s = `${n || ""} ${a || ""}`.trim();
  const i = s
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return i || "?";
};
function safeCSV(v) {
  if (v == null) return "";
  const s = String(v).replace(/"/g, '""');
  return /,|\n/.test(s) ? `"${s}"` : s;
}

/* Normaliza fila -> llaves del front (combina ids) */
function mapRow(row) {
  return {
    id: row.id ?? row.id_cliente_chat_center,
    nombre: row.nombre_cliente || "",
    apellido: row.apellido_cliente || "",
    email: row.email_cliente || "",
    telefono: row.celular_cliente || "",
    createdAt: row.created_at,
    ultima_actividad: row.updated_at,
    estado: row.estado_cliente,
    id_etiqueta: row.id_etiqueta ?? null,
    id_plataforma: row.id_plataforma ?? null,
    id_configuracion: row.id_configuracion ?? null,
    chat_cerrado: row.chat_cerrado ?? 0,
    bot_openia: row.bot_openia ?? 1,
    uid_cliente: row.uid_cliente || "",
    telefono_limpio: row.telefono_limpio || "",
    mensajes_por_dia_cliente: row.mensajes_por_dia_cliente ?? 0,
    pedido_confirmado: row.pedido_confirmado ?? 0,
    imagePath: row.imagePath || "",
    etiquetas: Array.isArray(row.etiquetas) ? row.etiquetas : [],
    _raw: row,
  };
}

/* ====== UI pequeños ====== */
function Chip({ children, color }) {
  const style = color
    ? { backgroundColor: `${color}14`, color, borderColor: `${color}2a` }
    : {};
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ring-slate-200 text-slate-700"
      style={style}
    >
      {children}
    </span>
  );
}
function SortButton({ label, active, dir = "asc", onClick, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`group inline-flex items-center gap-1 text-[11px] font-semibold tracking-wide text-slate-600 hover:text-slate-800 transition-colors ${className}`}
      title="Ordenar"
    >
      {label}
      <span
        className={`bx ${dir === "asc" ? "bx-chevron-up" : "bx-chevron-down"
          } text-[16px] text-slate-400 group-hover:text-slate-600 ${active ? "!text-slate-700" : ""
          }`}
      />
    </button>
  );
}
function ColumnsDropdown({ state, setState }) {
  return (
    <details className="relative">
      <summary className="list-none inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
        Columnas <i className="bx bx-chevron-down text-slate-600" />
      </summary>

      <div className="absolute right-200 z-30 mt-2 w-56 rounded-md border border-slate-200 bg-white p-2 shadow-lg ring-1 ring-black/5">
        {Object.keys(state).map((k) => (
          <label
            key={k}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-800 hover:bg-slate-50"
          >
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-400 text-blue-600 focus:ring-2 focus:ring-blue-500/40"
              checked={state[k]}
              onChange={() => setState((s) => ({ ...s, [k]: !s[k] }))}
            />
            <span className="capitalize">{k.replace(/_/g, " ")}</span>
          </label>
        ))}
      </div>
    </details>
  );
}

/* Tooltip minimal, formal */
function Tooltip({ label, children }) {
  return (
    <div className="relative inline-flex items-center group">
      {children}
      <div className="pointer-events-none absolute top-full left-1/2 z-50 hidden -translate-x-1/2 pt-2 group-hover:block transition-all duration-150 ease-out opacity-0 translate-y-0.5 group-hover:opacity-100 group-hover:translate-y-0">
        <div className="mx-auto h-2 w-2 -mb-1 rotate-45 bg-slate-900/95 shadow" />
        <div className="rounded-md bg-slate-900/95 px-2.5 py-1 text-xs font-medium text-white shadow">
          {label}
        </div>
      </div>
    </div>
  );
}

/* Select simple para filtro de Tags */
function TagSelect({ options, value, onChange, disabled, unavailable }) {
  return (
    <select
      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      title={
        unavailable
          ? "Catálogo de etiquetas no disponible"
          : "Filtrar por etiqueta"
      }
    >
      <option value="">Etiquetas (todas)</option>
      {options.map((o) => (
        <option key={o.id_etiqueta} value={o.id_etiqueta}>
          {o.nombre_etiqueta}
        </option>
      ))}
    </select>
  );
}

/* ===== Modales base (suaves) ===== */
function BaseModal({ open, title, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] transition-opacity animate-[backdropIn_180ms_ease-out_forwards]"
        onClick={onClose}
      />
      {/* Card */}
      <div className="absolute left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg bg-white shadow-xl ring-1 ring-slate-900/5 opacity-0 translate-y-1 animate-[modalPop_180ms_cubic-bezier(0.2,0.8,0.2,1)_forwards]">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <button
            className="rounded p-2 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <i className="bx bx-x text-xl text-slate-600" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-5 py-3">
          {footer}
        </div>
      </div>

      <style>{`
        @keyframes modalPop { to { opacity:1; transform: translate(-50%, -50%) translateY(0); } }
        @keyframes backdropIn { from { opacity:0 } to { opacity:1 } }
      `}</style>
    </div>
  );
}

/* Modal de selección de etiquetas desde catálogo */
function ModalTags({ open, title, onClose, catalogo, onApply, disabled }) {
  const [seleccion, setSeleccion] = useState([]);
  useEffect(() => {
    if (open) setSeleccion([]);
  }, [open]);
  return (
    <BaseModal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <button
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 transition"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            disabled={disabled || !seleccion.length}
            onClick={async () => {
              try {
                swalLoading("Aplicando etiquetas...");
                await onApply(seleccion.map(Number));
                swalClose();
                swalToast("Cambios aplicados");
                onClose();
              } catch (e) {
                swalClose();
                swalError("No se pudo aplicar", e?.message);
              }
            }}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-60 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
          >
            Aplicar
          </button>
        </>
      }
    >
      {!Array.isArray(catalogo) ? (
        <div className="p-2 text-sm text-slate-500">Cargando catálogo…</div>
      ) : catalogo.length === 0 ? (
        <div className="p-2 text-sm text-slate-500">Sin etiquetas</div>
      ) : (
        <div className="max-h-72 overflow-auto rounded-md border border-slate-200 p-2 bg-white">
          {catalogo.map((t) => (
            <label
              key={t.id_etiqueta}
              className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-slate-50 text-sm text-slate-800"
            >
              <input
                type="checkbox"
                className="h-4 w-4 text-blue-600"
                checked={seleccion.includes(t.id_etiqueta)}
                onChange={(e) =>
                  setSeleccion((prev) =>
                    e.target.checked
                      ? [...prev, t.id_etiqueta]
                      : prev.filter((x) => x !== t.id_etiqueta)
                  )
                }
              />
              <Chip color={t.color_etiqueta}>{t.nombre_etiqueta}</Chip>
            </label>
          ))}
          <p className="mt-2 text-xs text-slate-500">
            Se aplicará a los clientes seleccionados.
          </p>
        </div>
      )}
    </BaseModal>
  );
}

/* Modal crear etiquetas */
function ModalCrearEtiqueta({ open, onClose, onCreate }) {
  const [nombres, setNombres] = useState("");
  const [color, setColor] = useState("");
  return (
    <BaseModal
      open={open}
      title="Crear etiqueta(s)"
      onClose={onClose}
      footer={
        <>
          <button
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 transition"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            onClick={async () => {
              const lista = nombres
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              if (!lista.length) {
                swalInfo("Falta información", "Escribe al menos un nombre");
                return;
              }
              try {
                swalLoading("Creando etiqueta(s)...");
                await onCreate(lista, color || undefined);
                swalClose();
                swalToast("Etiqueta(s) creadas");
                onClose();
              } catch (e) {
                swalClose();
                swalError("No se pudo crear", e?.message);
              }
            }}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
          >
            Crear
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-700">
            Nombre(s)
          </label>
          <input
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200/60 outline-none transition"
            placeholder="vip, follow-up, clientes-2025"
            value={nombres}
            onChange={(e) => setNombres(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">
            Separa por comas para crear varias.
          </p>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-700">
            Color (opcional)
          </label>
          <input
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200/60 outline-none transition"
            placeholder="#1677FF"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>
      </div>
    </BaseModal>
  );
}

/* =========================== Vista principal =========================== */
export default function Clientes() {
  /** Estilos “glass/premium” + foco accesible */
  const customSelectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: 44,
      borderRadius: 12,
      paddingLeft: 6,
      paddingRight: 6,
      backgroundColor: "rgba(255,255,255,0.9)",
      backdropFilter: "saturate(1.2) blur(6px)",
      borderColor: state.isFocused ? "#3b82f6" : "#e2e8f0",
      boxShadow: state.isFocused
        ? "0 0 0 3px rgba(59,130,246,.25)"
        : "0 1px 2px rgba(2,6,23,.06)",
      ":hover": {
        borderColor: state.isFocused ? "#3b82f6" : "#94a3b8",
      },
      cursor: "text",
    }),
    valueContainer: (base) => ({
      ...base,
      padding: "0 4px",
      gap: 6,
    }),
    placeholder: (base) => ({
      ...base,
      color: "#94a3b8",
    }),
    singleValue: (base) => ({
      ...base,
      color: "#0f172a",
      fontWeight: 500,
    }),
    input: (base) => ({
      ...base,
      color: "#0f172a",
    }),
    indicatorsContainer: (base) => ({
      ...base,
      gap: 6,
    }),
    indicatorSeparator: () => ({ display: "none" }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 9999, // por si el modal tiene overflow/oculta
    }),
    menu: (base) => ({
      ...base,
      borderRadius: 14,
      marginTop: 8,
      padding: 4,
      backgroundColor: "rgba(255,255,255,.92)",
      backdropFilter: "saturate(1.2) blur(8px)",
      border: "1px solid rgba(226,232,240,.9)",
      boxShadow: "0 20px 40px rgba(2,6,23,.12)",
    }),
    menuList: (base) => ({
      ...base,
      maxHeight: 260,
      padding: 4,
    }),
    option: (base, state) => ({
      ...base,
      borderRadius: 10,
      padding: "10px 12px",
      color: state.isDisabled
        ? "#94a3b8"
        : state.isSelected
          ? "#0b1324"
          : "#0f172a",
      backgroundColor: state.isSelected
        ? "#DBEAFE"
        : state.isFocused
          ? "#F1F5F9"
          : "transparent",
      ":active": {
        backgroundColor: state.isSelected ? "#DBEAFE" : "#E2E8F0",
      },
    }),
    noOptionsMessage: (base) => ({
      ...base,
      padding: 12,
      color: "#64748b",
    }),
  };
  /* diseño selects */

  /* primera carga socket  */
  const [dataAdmin, setDataAdmin] = useState(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [userData, setUserData] = useState(null);
  const socketRef = useRef(null);
  const [nombre_encargado_global, setNombre_encargado_global] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token"); // Leemos el token
    if (token) {
      const decoded = jwtDecode(token); // Decodificamos con jwt-decode

      setNombre_encargado_global(decoded.nombre_encargado);

      // Verificamos si el token ha expirado
      if (decoded.exp < Date.now() / 1000) {
        localStorage.clear(); // Elimina todo
        // Si ha expirado, redirigimos al login
        window.location.href = "/login";
      }

      setUserData(decoded); // Guardamos los datos en el estado

      // Conectar al servidor de WebSockets
      const socket = io(import.meta.env.VITE_socket, {
        transports: ["websocket", "polling"],
        secure: true,
      });

      socket.on("connect", () => {
        console.log("Conectado al servidor de WebSockets");
        socketRef.current = socket;
        setIsSocketConnected(true);
      });

      socket.on("disconnect", () => {
        console.log("Desconectado del servidor de WebSockets");
        setIsSocketConnected(false);
      });
    } else {
      window.location.href = "/login"; // Si no hay token, redirigir al login
    }

    // Limpiar al desmontar
    return () => {
      if (socketRef.current) {
        socketRef.current.off("DATA_ADMIN_RESPONSE");
        socketRef.current.disconnect();
      }
    };
  }, []); // Esto se ejecutará solo una vez cuando el componente se monte

  useEffect(() => {
    // Asegúrate de que el socket esté conectado antes de emitir
    if (isSocketConnected && socketRef.current) {
      const id_configuracion = localStorage.getItem("id_configuracion");

      // Llamada al socket para obtener los datos
      socketRef.current.emit("GET_DATA_ADMIN", id_configuracion);

      socketRef.current.on("DATA_ADMIN_RESPONSE", (data) => {
        setDataAdmin(data);

        if (data.metodo_pago === 0) {
          Swal.fire({
            icon: "error",
            title: "Problema con el método de pago",
            text: "Tu cuenta de WhatsApp tiene problemas con el método de pago. Debes resolverlo en Business Manager para continuar.",
            allowOutsideClick: false,
            allowEscapeKey: false,
            allowEnterKey: true,
            confirmButtonText: "OK",
          }).then(() => {
            window.location.href = "/canal-conexiones";
          });
        }

        // Cargar templates (suponiendo que tienes la función definida)
        cargarTemplates(data);
      });
    }

    // Limpiar el evento cuando el componente se desmonte
    return () => {
      if (socketRef.current) {
        socketRef.current.off("DATA_ADMIN_RESPONSE");
      }
    };
  }, [isSocketConnected]);

  const [templates, setTemplates] = useState([]);
  const [templateText, setTemplateText] = useState("");
  const [placeholders, setPlaceholders] = useState([]);
  const [placeholderValues, setPlaceholderValues] = useState({}); // Guardar los valores de cada placeholder
  const [templateName, setTemplateName] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("es");

  // ✅ template listo para enviar (nombre + destinatario + placeholders completos)
  const allPlaceholdersFilled = placeholders.every(
    (ph) => (placeholderValues[ph] || "").trim().length > 0
  );
  const templateReady =
    Boolean(templateName) &&
    (placeholders.length === 0 || allPlaceholdersFilled);

  const cargarTemplates = async (data) => {
    console.log(data);
    const wabaId = data.id_whatsapp;
    const accessToken = data.token;

    try {
      const response = await fetch(
        `https://graph.facebook.com/v17.0/${wabaId}/message_templates`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error al obtener templates: ${response.statusText}`);
      }

      const data = await response.json();
      // Filtrar los templates que están aprobados
      const templatesAprobados = data.data.filter(
        (template) => template.status === "APPROVED"
      );

      // Guardamos solo los templates aprobados en el estado
      setTemplates(templatesAprobados);
    } catch (error) {
      console.error("Error al cargar los templates:", error);
    }
  };

  // Manejar la selección del template, extraer el texto, placeholders y el idioma
  const handleTemplateSelect = (event) => {
    const selectedTemplateName = event.target.value;
    setTemplateName(selectedTemplateName);

    const selectedTemplate = templates.find(
      (template) => template.name === selectedTemplateName
    );

    if (selectedTemplate) {
      const templateBodyComponent = selectedTemplate.components.find(
        (comp) => comp.type === "BODY"
      );

      if (templateBodyComponent && templateBodyComponent.text) {
        const templateText = templateBodyComponent.text;
        setTemplateText(templateText);

        // Extraer placeholders en formato {{1}}, {{2}}, etc.
        const extractedPlaceholders = [
          ...templateText.matchAll(/{{(.*?)}}/g),
        ].map((match) => match[1]);

        // Crear un estado inicial vacío para cada placeholder
        const initialPlaceholderValues = {};
        extractedPlaceholders.forEach((placeholder) => {
          initialPlaceholderValues[placeholder] = "";
        });

        setPlaceholders(extractedPlaceholders);
        setPlaceholderValues(initialPlaceholderValues); // Guardar placeholders vacíos para su edición
      } else {
        setTemplateText("Este template no tiene un cuerpo definido.");
        setPlaceholders([]);
        setPlaceholderValues({});
      }

      const templateLanguage = selectedTemplate.language || "es";
      setSelectedLanguage(templateLanguage);
    }
  };

  // Función para manejar cambios en el textarea
  const handleTextareaChange = (event) => {
    setTemplateText(event.target.value);
  };

  // Función para manejar cambios en los inputs de los placeholders
  const handlePlaceholderChange = (placeholder, value) => {
    setPlaceholderValues((prevValues) => ({
      ...prevValues,
      [placeholder]: value,
    }));
  };

  const generarObjetoPlaceholders = (placeholders, placeholderValues) => {
    // Crear un objeto con claves y valores
    const resultado = {};

    placeholders.forEach((placeholder) => {
      resultado[placeholder] =
        placeholderValues[placeholder] || `{{${placeholder}}}`;
    });

    return resultado;
  };

  const agregar_mensaje_enviado = async (
    texto_mensaje,
    tipo_mensaje,
    ruta_archivo,
    telefono_recibe,
    mid_mensaje,
    id_recibe,
    id_configuracion,
    telefono_configuracion,
    wamid,
    template_name,
    language_code
  ) => {
    try {
      const response = await chatApi.post(
        "/clientes_chat_center/agregarMensajeEnviado",
        {
          texto_mensaje,
          tipo_mensaje,
          mid_mensaje,
          id_recibe,
          ruta_archivo,
          telefono_recibe,
          id_configuracion,
          telefono_configuracion,
          responsable: nombre_encargado_global,
          id_wamid_mensaje: wamid,
          template_name: template_name,
          language_code: language_code,
        }
      );

      let respuesta = response.data;

      if (respuesta.status != 200) {
        console.log("Error en la respuesta del servidor: " + respuesta);
      }
    } catch (error) {
      console.error("Error al guardar el mensaje:", error);
      alert("Ocurrió un error al guardar el mensaje. Inténtalo de nuevo.");
    }
  };

  const calcularDelay = (cantidad) => {
    if (cantidad <= 50) return 3000; // 2s
    if (cantidad <= 200) return 6000; // 4s
    if (cantidad <= 500) return 10000; // 6s
    return 20000; // 10s si es más de 500
  };


  // Función para enviar el template a WhatsApp
  const enviarTemplateMasivo = async () => {
    const fromPhoneNumberId = dataAdmin.id_telefono;
    const accessToken = dataAdmin.token;

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const delay = calcularDelay(selected.length);

    // Arrays para acumular los resultados
    let exitosos = [];
    let fallidos = [];

    // Mostrar cargando
    Swal.fire({
      title: "Enviando mensajes...",
      html: "Por favor espera mientras enviamos los mensajes.",
      didOpen: () => {
        Swal.showLoading();
      },
    });

    // Iterar sobre los IDs seleccionados
    for (let i = 0; i < selected.length; i++) {
      const recipientId = selected[i];

      // Filtrar el item correspondiente al id
      const recipient = items.find((item) => item.id === recipientId);

      if (!recipient) {
        console.log(`Usuario con id ${recipientId} no encontrado.`);
        fallidos.push(`ID: ${recipientId}`); // Agregar a los fallidos
        continue; // Si no se encuentra el usuario, se omite este ID
      }

      const recipientPhone = recipient.telefono_limpio; // Obtener el teléfono limpio
      if (!recipientPhone) {
        console.log(
          `El teléfono del usuario ${recipientId} no está disponible.`
        );
        fallidos.push(`ID: ${recipientId}, Teléfono no disponible`); // Agregar a los fallidos
        continue; // Si no hay teléfono, se omite este usuario
      }

      // Construir el cuerpo del mensaje para la API de WhatsApp
      const body = {
        messaging_product: "whatsapp",
        to: recipientPhone,
        type: "template",
        template: {
          name: templateName,
          language: { code: selectedLanguage },
          components: [
            {
              type: "body",
              parameters: placeholders.map((placeholder) => {
                let value =
                  placeholderValues[placeholder] || `{{${placeholder}}}`;

                // Si el placeholder es '{nombre}', reemplazarlo con recipient.nombre
                if (placeholderValues[placeholder] === "{nombre}") {
                  value =
                    recipient.nombre || `{{${placeholderValues[placeholder]}}}`;
                } else if (placeholderValues[placeholder] === "{direccion}") {
                  console.log(recipient._raw.direccion)
                  value =
                    recipient._raw.direccion || `{{${placeholderValues[placeholder]}}}`;
                } else if (placeholderValues[placeholder] === "{productos}") {
                  value =
                    recipient._raw.productos || `{{${placeholderValues[placeholder]}}}`;
                }

                return {
                  type: "text",
                  text: value,
                };
              }),
            },
          ],
        },
      };

      try {
        const response = await fetch(
          `https://graph.facebook.com/v19.0/${fromPhoneNumberId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          }
        );

        if (!response.ok) {
          throw new Error(
            `Error al enviar template a ${recipientPhone}: ${response.statusText}`
          );
        }

        const data = await response.json();

        // Extraer el wamid de la respuesta
        const wamid = data?.messages?.[0]?.id || null;

        // Agregar a la lista de exitosos
        exitosos.push(`ID: ${recipientId}, Teléfono: ${recipientPhone}`);

        // Ejecutar tu lógica de agregar mensaje enviado
        let id_recibe = recipientId;
        let mid_mensaje = dataAdmin.id_telefono;
        let telefono_configuracion = dataAdmin.telefono;
        let ruta_archivo = generarObjetoPlaceholders(
          placeholders,
          Object.keys(placeholderValues).reduce((acc, key) => {
            acc[key] =
              placeholderValues[key] === "{nombre}"
                ? recipient.nombre || "{nombre}"
                : placeholderValues[key] === "{direccion}"
                  ? recipient._raw.direccion || "{direccion}"
                  : placeholderValues[key] === "{productos}"
                    ? recipient._raw.productos || "{productos}"
                    : placeholderValues[key];

            return acc;
          }, {})
        );

        let id_configuracion = localStorage.getItem("id_configuracion");

        agregar_mensaje_enviado(
          templateText,
          "text",
          JSON.stringify(ruta_archivo),
          recipientPhone,
          mid_mensaje,
          id_recibe,
          id_configuracion,
          telefono_configuracion,
          wamid,
          templateName,
          selectedLanguage
        );

        // No es necesario mostrar cada éxito en un toast, puedes hacerlo de forma global al final
        // Toast.fire({
        //   icon: "success",
        //   title: `Mensaje enviado correctamente a ${recipientPhone}`,
        // });
      } catch (error) {
        console.error(
          `Error al enviar el template a ${recipientPhone}:`,
          error
        );
        fallidos.push(
          `ID: ${recipientId}, Teléfono: ${recipientPhone} - Error: ${error.message}`
        );
      }

      // ⏳ Aplicar delay basado en cantidad
      await sleep(delay);
    }

    // Cerrar el cargador
    Swal.close();

    // Mostrar el resultado en un Toast o SweetAlert
    if (exitosos.length > 0) {
      Swal.fire({
        icon: "success",
        title: "Mensajes enviados correctamente",
        text: `Enviados a: ${exitosos.join(", ")}`,
      });
    }

    if (fallidos.length > 0) {
      Swal.fire({
        icon: "error",
        title: "Errores al enviar mensajes",
        text: `Fallaron los envíos a: ${fallidos.join(", ")}`,
      });
    }

    // Aquí puedes agregar lógica para manejar el socket si lo necesitas
    // cargar_socket();
  };

  /* masivos fin */

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // densidad
  const [density, setDensity] = useState("compacta");
  const rowPad =
    density === "compacta" ? "py-2" : density === "media" ? "py-2.5" : "py-3";
  const headPad =
    density === "compacta" ? "py-2" : density === "media" ? "py-2.5" : "py-3";

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(undefined);

  const [pageSize, setPageSize] = useState(20);
  const LIMIT = pageSize;

  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("todos");

  // 🔹 Filtro por etiqueta (viene del backend, no de las filas)
  const [idEtiquetaFiltro, setIdEtiquetaFiltro] = useState("");
  const [opcionesFiltroEtiquetas, setOpcionesFiltroEtiquetas] = useState([]);

  const [orden, setOrden] = useState("recientes");

  const [selected, setSelected] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // Modales de etiquetas
  const [modalToggleOpen, setModalToggleOpen] = useState(false);
  const [modalAsignarOpen, setModalAsignarOpen] = useState(false);
  const [modalQuitarOpen, setModalQuitarOpen] = useState(false);
  const [modalCrearEtiquetaOpen, setModalCrearEtiquetaOpen] = useState(false);
  const [isModalOpenMasivo, setIsModalOpenMasivo] = useState(false);

  // Otros modales
  const [modalSMS, setModalSMS] = useState({ open: false, msg: "" });
  const [modalEmail, setModalEmail] = useState({
    open: false,
    subject: "",
    body: "",
  });
  const [modalReview, setModalReview] = useState({
    open: false,
    channel: "whatsapp",
    link: "",
  });

  const openModalMasivos = () => {
    setIsModalOpenMasivo(true);
  };

  // Función para cerrar el modal
  const closeModal = () => {
    setIsModalOpenMasivo(false);
    resetNumeroModalState();
  };

  const resetNumeroModalState = () => {
    setTemplateName("");
    setTemplateText("");
    setPlaceholders([]);
    setPlaceholderValues({});
  };

  // columnas visibles
  const [cols, setCols] = useState({
    name: true,
    phone: true,
    email: true,
    created: true,
    last_activity: true,
    tags: true,
  });

  // Catálogo por configuración (para chips y modales)
  const [catalogosPorCfg, setCatalogosPorCfg] = useState({}); // { [cfgId]: [{id_etiqueta,nombre_etiqueta,color_etiqueta}] }
  const [idConfigForTags, setIdConfigForTags] = useState(null);

  /* Helpers busqueda de telefono */
  function normalizePhone(s = "") {
    return String(s).replace(/\D/g, "");
  }
  function isPhoneQuery(q = "") {
    const onlyDigits = normalizePhone(q);
    return /^[\d\s()+-]*$/.test(q) && onlyDigits.length >= 5;
  }

  /* Helpers búsqueda por nombre/apellido (tolerante a acentos y símbolos) */
  function normalizeHumanText(s = "") {
    return String(s)
      .normalize("NFD") // separa diacríticos
      .replace(/[\u0300-\u036f]/g, "") // quita diacríticos
      .toLowerCase()
      .replace(/[^a-z0-9\s]+/gi, " ") // símbolos -> espacio
      .replace(/\s+/g, " ") // colapsa espacios
      .trim();
  }

  function matchesFullName(cliente, qRaw) {
    if (!qRaw) return true;
    const full = normalizeHumanText(
      `${cliente.nombre || ""} ${cliente.apellido || ""}`
    );
    const qn = normalizeHumanText(qRaw);
    if (!qn) return true;
    const parts = qn.split(" ");
    // AND de todas las palabras: cada token del query debe estar en el nombre completo
    return parts.every((p) => full.includes(p));
  }

  /* ===== Helpers de catálogo ===== */
  function crearMapaCatalogo(cfgId, catsRef) {
    const arr = (catsRef || catalogosPorCfg)[cfgId] || [];
    const m = new Map();
    for (const t of arr) m.set(Number(t.id_etiqueta), t);
    return m;
  }
  async function cargarCatalogosSiFaltan(cfgs) {
    const faltantes = (cfgs || []).filter((id) => catalogosPorCfg[id] == null);
    if (!faltantes.length) return { ...catalogosPorCfg };
    const nuevo = { ...catalogosPorCfg };
    for (const cfgId of faltantes) {
      try {
        const { data } = await chatApi.post(
          "/etiquetas_chat_center/obtenerEtiquetas",
          {
            id_configuracion: Number(cfgId),
          }
        );
        const arr = Array.isArray(data?.etiquetas) ? data.etiquetas : [];
        nuevo[cfgId] = arr;
      } catch (e) {
        console.error("CATALOGO:", e?.response?.data || e.message);
        nuevo[cfgId] = [];
      }
    }
    setCatalogosPorCfg(nuevo);
    return nuevo;
  }

  // 🔹 Cargar opciones reales del select "Etiquetas (todas)"
  async function cargarOpcionesFiltroEtiquetas() {
    try {
      const { data } = await chatApi.post(
        "/etiquetas_chat_center/etiquetas_existentes",
        {
          id_configuracion: localStorage.getItem("id_configuracion"),
        }
      );
      const arr = Array.isArray(data?.etiquetas) ? data.etiquetas : [];
      setOpcionesFiltroEtiquetas(arr);
    } catch (e) {
      console.warn(
        "No se pudieron cargar etiquetas existentes:",
        e?.response?.data || e.message
      );
      setOpcionesFiltroEtiquetas([]);
    }
  }

  // Adjunta etiquetas asignadas a cada cliente
  async function anexarEtiquetasAsignadas(clientes, catsRef) {
    if (!clientes?.length) return clientes;
    const out = [...clientes];

    await Promise.all(
      out.map(async (c, i) => {
        const id = getId(c);
        if (!id) return;

        try {
          const { data } = await chatApi.post(
            "/etiquetas_asignadas/obtenerEtiquetasAsignadas",
            { id_cliente_chat_center: id }
          );

          const arr = Array.isArray(data?.etiquetasAsignadas)
            ? data.etiquetasAsignadas
            : [];

          const mapa = crearMapaCatalogo(c.id_configuracion, catsRef);

          const mapped = arr
            .map((e) => {
              const idE = Number(e.id_etiqueta ?? e.id ?? e.etiqueta_id);
              if (!idE) return null;
              const info = mapa.get(idE);
              return {
                id: idE,
                nombre: e.nombre_etiqueta || info?.nombre_etiqueta || `#${idE}`,
                color: e.color_etiqueta || info?.color_etiqueta,
              };
            })
            .filter(Boolean);

          out[i] = { ...c, etiquetas: mapped };
        } catch (err) {
          console.warn(
            "No se pudieron traer etiquetas asignadas:",
            id,
            err?.response?.data || err?.message
          );
          out[i] = { ...c, etiquetas: [] };
        }
      })
    );

    return out;
  }

  /* ====== LISTAR (normal o por etiqueta) ====== */
  // Reemplaza TU función apiList por esta versión (solo difiere en cómo arma q / filtros)
  async function apiList(p = 1, replace = false) {
    setLoading(true);
    try {
      const phoneLike = isPhoneQuery(q);
      const qPhone = phoneLike ? normalizePhone(q) : undefined;

      // --- NUEVO: preparar tokens cuando es búsqueda por nombre/apellido
      let qForBackend = undefined;
      let qOriginal = q;
      let tokens = [];
      if (!phoneLike && qOriginal?.trim()) {
        // tokens “humanos” para filtrar en el front
        const qn = normalizeHumanText(qOriginal);
        tokens = qn ? qn.split(" ") : [];
        // token “ancla” crudo (sin normalizar) para maximizar coincidencias del backend
        const rawTokens = qOriginal.trim().split(/\s+/);
        const anchorRaw =
          rawTokens.length > 1
            ? rawTokens.slice().sort((a, b) => b.length - a.length)[0] // el más largo
            : rawTokens[0];
        qForBackend = anchorRaw || qOriginal;
      }

      const paramsBase = {
        page: p,
        limit: LIMIT,
        sort: orden,
        q: qOriginal
          ? phoneLike
            ? qPhone
            : qForBackend // ⬅️ mandamos el token ancla cuando hay varias palabras
          : undefined,
        estado: estado !== "todos" ? estado : undefined,
        search_mode: phoneLike ? "phone" : "name",
        phone: phoneLike ? qPhone : undefined,
        id_configuracion: localStorage.getItem("id_configuracion"),
      };

      let data;
      if (idEtiquetaFiltro) {
        const { data: resp } = await chatApi.get(
          "/clientes_chat_center/listar_por_etiqueta",
          {
            params: { ...paramsBase, ids: String(idEtiquetaFiltro) },
          }
        );
        data = resp;
      } else {
        const { data: resp } = await chatApi.get(
          "/clientes_chat_center/listar",
          {
            params: paramsBase,
          }
        );
        data = resp;
      }

      const rows = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : [];
      const mapped = rows.map(mapRow);

      // Filtro final en front:
      let mappedFiltered = mapped;

      if (phoneLike) {
        // Búsqueda por teléfono (igual que antes)
        mappedFiltered = mapped.filter((c) => {
          const t1 = normalizePhone(c.telefono || "");
          const t2 = normalizePhone(c.telefono_limpio || "");
          return t1.includes(qPhone) || t2.includes(qPhone);
        });
      } else if (qOriginal?.trim()) {
        // AND por tokens sobre nombre completo (tolerante a acentos/símbolos)
        mappedFiltered = mapped.filter((c) => matchesFullName(c, qOriginal));
      }

      const tot = data?.total ?? undefined;

      const cfgs = Array.from(
        new Set(mappedFiltered.map((r) => r.id_configuracion).filter(Boolean))
      );
      if (!idConfigForTags && cfgs.length) setIdConfigForTags(cfgs[0]);
      const cats = await cargarCatalogosSiFaltan(cfgs);

      const withTags = await anexarEtiquetasAsignadas(mappedFiltered, cats);

      setItems((prev) => (replace ? withTags : [...prev, ...withTags]));
      setPage(p);

      const effectiveTotalKnown = typeof tot === "number" && !phoneLike;
      setHasMore(
        effectiveTotalKnown ? p * LIMIT < tot : withTags.length === LIMIT
      );
      setTotal(effectiveTotalKnown ? tot : undefined);
    } catch (e) {
      swalError(
        "No se pudo listar clientes",
        e?.response?.data?.message || e.message
      );
    } finally {
      setLoading(false);
    }
  }

  /* ===== Toggle/Asignar/Quitar etiquetas ===== */
  function clienteTieneEtiqueta(cliente, idEtiqueta) {
    const tid = Number(idEtiqueta);
    if (Array.isArray(cliente.etiquetas) && cliente.etiquetas.length) {
      return cliente.etiquetas.some((t) => Number(t.id ?? t) === tid);
    }
    if (cliente.id_etiqueta) return Number(cliente.id_etiqueta) === tid;
    return false;
  }
  async function aplicarToggle(idC, idE, cfg) {
    await chatApi.post("/etiquetas_chat_center/toggleAsignacionEtiqueta", {
      id_cliente_chat_center: idC,
      id_etiqueta: Number(idE),
      id_configuracion: Number(cfg),
    });
  }
  async function aplicarPares(pares) {
    for (const { idC, idE, cfg } of pares) {
      await aplicarToggle(idC, idE, cfg);
    }
  }

  async function toggleEtiquetas(idsClientes, idsEtiquetas) {
    const pares = [];
    for (const idC of idsClientes) {
      const c = items.find((x) => getId(x) === idC);
      const cfg = c?.id_configuracion ?? idConfigForTags;
      if (!cfg) continue;
      for (const idE of idsEtiquetas) pares.push({ idC, idE, cfg });
    }
    if (!pares.length) throw new Error("Nada por aplicar");
    await aplicarPares(pares);
    await refrescarEtiquetasDeClientes(idsClientes);
    await cargarOpcionesFiltroEtiquetas();
  }
  async function asignarEtiquetas(idsClientes, idsEtiquetas) {
    const pares = [];
    for (const idC of idsClientes) {
      const c = items.find((x) => getId(x) === idC);
      const cfg = c?.id_configuracion ?? idConfigForTags;
      if (!cfg) continue;
      for (const idE of idsEtiquetas) {
        if (!clienteTieneEtiqueta(c, idE)) pares.push({ idC, idE, cfg });
      }
    }
    if (!pares.length) throw new Error("Nada por asignar");
    await aplicarPares(pares);
    await refrescarEtiquetasDeClientes(idsClientes);
    await cargarOpcionesFiltroEtiquetas();
  }
  async function quitarEtiquetas(idsClientes, idsEtiquetas) {
    const pares = [];
    for (const idC of idsClientes) {
      const c = items.find((x) => getId(x) === idC);
      const cfg = c?.id_configuracion ?? idConfigForTags;
      if (!cfg) continue;
      for (const idE of idsEtiquetas) {
        if (clienteTieneEtiqueta(c, idE)) pares.push({ idC, idE, cfg });
      }
    }
    if (!pares.length) throw new Error("Nada por quitar");
    await aplicarPares(pares);
    await refrescarEtiquetasDeClientes(idsClientes);
    await cargarOpcionesFiltroEtiquetas();
  }

  /* ===== Crear / Eliminar del catálogo ===== */
  async function crearEtiquetas(lista, color) {
    let cfg = idConfigForTags;
    if (!cfg) {
      const first = items[0];
      cfg = first?.id_configuracion;
    }
    if (!cfg) {
      await swalInfo(
        "No disponible",
        "No hay id_configuracion para crear etiquetas."
      );
      return;
    }
    for (const nombre_etiqueta of lista) {
      await chatApi.post("/etiquetas_chat_center/agregarEtiqueta", {
        nombre_etiqueta,
        color_etiqueta: color,
        id_configuracion: Number(cfg),
      });
    }
    try {
      const { data } = await chatApi.post(
        "/etiquetas_chat_center/obtenerEtiquetas",
        {
          id_configuracion: Number(cfg),
        }
      );
      const arr = Array.isArray(data?.etiquetas) ? data.etiquetas : [];
      setCatalogosPorCfg((prev) => ({ ...prev, [Number(cfg)]: arr }));
    } catch (e) {
      console.error(
        "REFRESH CATALOGO POST-CREAR:",
        e?.response?.data || e.message
      );
    }
    await apiList(1, true);
    await cargarOpcionesFiltroEtiquetas();
  }

  async function eliminarEtiquetasCatalogo(idsEtiquetas) {
    for (const idE of idsEtiquetas) {
      await chatApi.delete(`/etiquetas_chat_center/eliminarEtiqueta/${idE}`);
    }
    const cfgs = Array.from(
      new Set(items.map((r) => r.id_configuracion).filter(Boolean))
    );
    await cargarCatalogosSiFaltan(cfgs);
    await apiList(page, true);
    await cargarOpcionesFiltroEtiquetas();
  }

  /* ===== Refresh fino de etiquetas ===== */
  async function refrescarEtiquetasDeClientes(idsClientes) {
    const cfgs = Array.from(
      new Set(items.map((c) => c.id_configuracion).filter(Boolean))
    );
    const cats = await cargarCatalogosSiFaltan(cfgs);

    const clon = [...items];
    await Promise.all(
      clon.map(async (c, i) => {
        const id = getId(c);
        if (!idsClientes.includes(id)) return;
        try {
          const { data } = await chatApi.post(
            "/etiquetas_asignadas/obtenerEtiquetasAsignadas",
            { id_cliente_chat_center: id }
          );
          const arr = Array.isArray(data?.etiquetasAsignadas)
            ? data.etiquetasAsignadas
            : [];
          const mapa = crearMapaCatalogo(c.id_configuracion, cats);
          const mapped = arr
            .map((e) => {
              const idE = Number(e.id_etiqueta ?? e.id ?? e.etiqueta_id);
              if (!idE) return null;
              const info = mapa.get(idE);
              return {
                id: idE,
                nombre: e.nombre_etiqueta || info?.nombre_etiqueta || `#${idE}`,
                color: e.color_etiqueta || info?.color_etiqueta,
              };
            })
            .filter(Boolean);
          clon[i] = { ...c, etiquetas: mapped };
        } catch (e) {
          console.warn("REFRESH TAGS:", id, e?.response?.data || e.message);
        }
      })
    );
    setItems(clon);
  }

  /* ===== Botones: abrir modales garantizando catálogo ===== */
  async function ensureCatalogAndOpen(which) {
    let cfg = null;
    if (selected.length) {
      const counts = new Map();
      for (const idC of selected) {
        const c = items.find((x) => getId(x) === idC);
        if (!c?.id_configuracion) continue;
        counts.set(
          c.id_configuracion,
          (counts.get(c.id_configuracion) || 0) + 1
        );
      }
      if (counts.size)
        cfg = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0][0];
    }
    if (!cfg) cfg = items[0]?.id_configuracion || idConfigForTags;
    if (!cfg) {
      await swalInfo(
        "Sin datos",
        "No hay clientes para determinar id_configuracion."
      );
      return;
    }
    setIdConfigForTags(cfg);
    await cargarCatalogosSiFaltan([cfg]);

    if (which === "toggle") setModalToggleOpen(true);
    if (which === "asignar") setModalAsignarOpen(true);
    if (which === "quitar") setModalQuitarOpen(true);
    if (which === "crear") setModalCrearEtiquetaOpen(true);
  }

  /* ===== Efectos ===== */
  useEffect(() => {
    cargarOpcionesFiltroEtiquetas();
  }, []);

  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);

    const id = setTimeout(() => {
      apiList(1, true);
    }, 250);

    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, estado, orden, pageSize, idEtiquetaFiltro]);

  /* Scroll infinito */
  function onScroll(e) {
    if (loading || !hasMore) return;
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 16)
      apiList(page + 1);
  }

  /* Selección */
  const allSelected = useMemo(() => {
    const ids = items.map(getId).filter(Boolean);
    return ids.length > 0 && ids.every((id) => selected.includes(id));
  }, [items, selected]);
  const toggleSelectAll = (v) =>
    setSelected(v ? items.map(getId).filter(Boolean) : []);
  const toggleSelect = (id) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  /* ======= CRUD cliente ======= */
  async function apiCreate(c) {
    const payload = {
      id_plataforma: c.id_plataforma || null,
      id_configuracion: c.id_configuracion || null,
      id_etiqueta: c.id_etiqueta || null,
      uid_cliente: c.uid_cliente || "",
      nombre_cliente: c.nombre,
      apellido_cliente: c.apellido,
      email_cliente: c.email,
      celular_cliente: c.telefono,
      imagePath: c.imagePath || "",
      mensajes_por_dia_cliente: c.mensajes_por_dia_cliente ?? 0,
      estado_cliente: c.estado ?? 1,
      chat_cerrado: c.chat_cerrado ?? 0,
      bot_openia: c.bot_openia ?? 1,
      pedido_confirmado: c.pedido_confirmado ?? 0,
    };
    const { data } = await chatApi.post(
      "/clientes_chat_center/agregar",
      payload
    );
    return mapRow(data?.data || data);
  }
  async function apiUpdate(id, c) {
    const payload = {
      id_plataforma: c.id_plataforma || null,
      id_configuracion: c.id_configuracion || null,
      id_etiqueta: c.id_etiqueta || null,
      uid_cliente: c.uid_cliente || "",
      nombre_cliente: c.nombre,
      apellido_cliente: c.apellido,
      email_cliente: c.email,
      celular_cliente: c.telefono,
      imagePath: c.imagePath || "",
      mensajes_por_dia_cliente: c.mensajes_por_dia_cliente ?? 0,
      estado_cliente: c.estado ?? 1,
      chat_cerrado: c.chat_cerrado ?? 0,
      bot_openia: c.bot_openia ?? 1,
      pedido_confirmado: c.pedido_confirmado ?? 0,
    };
    const { data } = await chatApi.put(
      `/clientes_chat_center/actualizar/${id}`,
      payload
    );
    return mapRow(data?.data || data);
  }
  async function apiDelete(id) {
    await chatApi.delete(`/clientes_chat_center/eliminar/${id}`);
  }

  async function onSave() {
    try {
      if (!editing?.nombre && !editing?.telefono && !editing?.email) {
        await swalInfo(
          "Datos incompletos",
          "Ingresa al menos nombre, teléfono o email"
        );
        return;
      }
      const id = getId(editing);
      swalLoading(id ? "Actualizando cliente..." : "Creando cliente...");
      if (id) {
        const updated = await apiUpdate(id, editing);
        setItems((prev) => prev.map((x) => (getId(x) === id ? updated : x)));
      } else {
        const created = await apiCreate(editing);
        setItems((prev) => [created, ...prev]);
      }
      setDrawerOpen(false);
      setEditing(null);
      await apiList(page, true);
      swalClose();
      swalToast("Guardado correctamente");
      await cargarOpcionesFiltroEtiquetas();
    } catch (e) {
      console.error("SAVE:", e?.response?.data || e.message);
      swalClose();
      swalError("No se pudo guardar", e?.response?.data?.message || e.message);
    }
  }

  async function onDeleteSelected() {
    if (!selected.length) return;
    const ok = await swalConfirm(
      "Eliminar clientes",
      `¿Eliminar ${selected.length} cliente(s) seleccionados?`
    );
    if (!ok) return;

    try {
      swalLoading("Eliminando...");
      try {
        await chatApi.post(`/clientes_chat_center/eliminar`, { ids: selected });
      } catch {
        for (const id of selected) await apiDelete(id);
      }
      setItems((prev) => prev.filter((x) => !selected.includes(getId(x))));
      setSelected([]);
      swalClose();
      swalToast("Eliminados");
      await cargarOpcionesFiltroEtiquetas();
    } catch (e) {
      swalClose();
      swalError("No se pudo eliminar", e?.message);
    }
  }

  /* Exportar/Importar */
  function exportCSV() {
    const headers = [
      "Nombre",
      "Apellido",
      "Email",
      "Telefono",
      "Estado",
      "IdEtiqueta",
      "Creado",
      "UltActividad",
      "Tags",
    ];
    const csv = [headers.join(",")];
    for (const c of items) {
      csv.push(
        [
          safeCSV(c.nombre),
          safeCSV(c.apellido),
          safeCSV(c.email),
          safeCSV(c.telefono),
          safeCSV(c.estado ? "1" : "0"),
          safeCSV(c.id_etiqueta ?? ""),
          safeCSV(c.createdAt || ""),
          safeCSV(c.ultima_actividad || ""),
        ].join(",")
      );
    }
    const blob = new Blob([csv.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `clientes_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    swalToast("CSV exportado");
  }
  async function importCSV(file) {
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (!lines.length) {
        await swalInfo("CSV vacío", "El archivo no contiene filas.");
        return;
      }
      const [headerLine, ...rows] = lines;
      const headers = headerLine.split(",").map((h) => h.trim().toLowerCase());
      const idx = {
        nombre: headers.indexOf("nombre"),
        apellido: headers.indexOf("apellido"),
        email: headers.indexOf("email"),
        telefono: headers.indexOf("telefono"),
        estado: headers.indexOf("estado"),
        id_etiqueta: headers.indexOf("idetiqueta"),
      };
      swalLoading("Importando...");
      for (const line of rows) {
        const cols = line.split(",");
        const payload = {
          nombre_cliente: idx.nombre >= 0 ? cols[idx.nombre] : "",
          apellido_cliente: idx.apellido >= 0 ? cols[idx.apellido] : "",
          email_cliente: idx.email >= 0 ? cols[idx.email] : "",
          celular_cliente: idx.telefono >= 0 ? cols[idx.telefono] : "",
          estado_cliente: idx.estado >= 0 ? Number(cols[idx.estado] || 1) : 1,
          id_etiqueta:
            idx.id_etiqueta >= 0 ? cols[idx.id_etiqueta] || null : null,
        };
        if (
          !payload.nombre_cliente &&
          !payload.celular_cliente &&
          !payload.email_cliente
        )
          continue;
        await chatApi.post("/clientes_chat_center/agregar", payload);
      }
      await apiList(1, true);
      swalClose();
      swalToast("Importación completada");
      await cargarOpcionesFiltroEtiquetas();
    } catch (e) {
      console.error("IMPORT:", e?.response?.data || e.message);
      swalClose();
      swalError("Error importando CSV", e?.message);
    }
  }

  /* =================== Render =================== */
  const fileRef = useRef(null);

  return (
    <div className="flex h-[calc(100vh-48px)] flex-col rounded-xl border border-slate-200 bg-white text-slate-800">
      {/* ====== Topbar ====== */}
      <div className="sticky top-0 z-40 flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2">
        <div className="ml-auto flex items-center gap-2">
          {/* Envio de masivos */}
          <Tooltip label="Envio mensaje masivo">
            <button
              className="rounded-md border border-slate-200 bg-white p-2 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition disabled:opacity-50"
              onClick={() => openModalMasivos()}
              disabled={!selected.length}
              aria-label="Envio mensaje masivo"
            >
              <i
                className={`bx bxs-message-add text-[18px] ${!selected.length ? "text-slate-700" : "text-green-500"
                  } `}
              />
            </button>
          </Tooltip>
          {/* TAGS */}
          <Tooltip label="Asignar etiquetas">
            <button
              className="rounded-md border border-slate-200 bg-white p-2 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition disabled:opacity-50"
              onClick={() => ensureCatalogAndOpen("asignar")}
              disabled={!selected.length}
              aria-label="Asignar etiquetas"
            >
              <i className="bx bxs-purchase-tag-alt text-[18px] text-slate-700" />
            </button>
          </Tooltip>
          <Tooltip label="Remover etiquetas">
            <button
              className="rounded-md border border-slate-200 bg-white p-2 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition disabled:opacity-50"
              onClick={() => ensureCatalogAndOpen("quitar")}
              disabled={!selected.length}
              aria-label="Remover etiquetas"
            >
              <i className="bx bxs-minus-circle text-[18px] text-slate-700" />
            </button>
          </Tooltip>
          <Tooltip label="Crear etiqueta">
            <button
              className="rounded-md border border-slate-200 bg-white p-2 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition"
              onClick={() => ensureCatalogAndOpen("crear")}
              aria-label="Crear etiqueta"
            >
              <i className="bx bxs-plus-circle text-[18px] text-slate-700" />
            </button>
          </Tooltip>

          {/* Import / Export */}
          <Tooltip label="Importar CSV">
            <button
              className="rounded-md border border-slate-200 bg-white p-2 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition"
              aria-label="Importar CSV"
              onClick={() => fileRef.current?.click()}
            >
              <i className="bx bx-upload text-[18px] text-slate-700" />
            </button>
          </Tooltip>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) =>
              e.target.files?.[0] && importCSV(e.target.files[0])
            }
          />
          <Tooltip label="Exportar CSV">
            <button
              className="rounded-md border border-slate-200 bg-white p-2 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition"
              aria-label="Exportar CSV"
              onClick={exportCSV}
            >
              <i className="bx bx-download text-[18px] text-slate-700" />
            </button>
          </Tooltip>

          {/* Eliminar */}
          <Tooltip label="Eliminar">
            <button
              disabled={!selected.length}
              onClick={onDeleteSelected}
              className="rounded-md border border-slate-200 bg-white p-2 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition disabled:opacity-50"
              aria-label="Eliminar seleccionados"
            >
              <i className="bx bxs-trash-alt text-[18px] text-slate-700" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Modal */}
      {isModalOpenMasivo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-md shadow-lg max-h-[70vh] overflow-y-auto">
            <h2 className="text-xl font-semibold">Enviar mensaje masivo</h2>
            <form className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
              <h4 className="font-semibold text-base text-slate-900">
                Enviar template
              </h4>

              <Select
                id="lista_templates"
                options={templates.map((t) => ({
                  value: t.name,
                  label: t.name,
                }))}
                placeholder="Seleccione un template"
                onChange={(opcion) =>
                  handleTemplateSelect({
                    target: { value: opcion ? opcion.value : "" },
                  })
                }
                isClearable
                styles={customSelectStyles}
                classNamePrefix="react-select"
              />

              <div>
                <label
                  htmlFor="template_textarea"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Vista previa
                </label>
                <textarea
                  id="template_textarea"
                  rows="8"
                  value={templateText}
                  readOnly
                  onChange={handleTextareaChange}
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-800 outline-none
                           focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              {placeholders.map((ph) => (
                <div key={ph}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {`Valor para {{${ph}}}`}
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm text-slate-800 outline-none
                             focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    value={placeholderValues[ph] || ""}
                    onChange={(e) =>
                      handlePlaceholderChange(ph, e.target.value)
                    }
                  />
                </div>
              ))}

              <div className="flex justify-between items-center">
                {!templateReady && (
                  <p className="text-xs text-slate-500">
                    Completa todos los campos del template para enviar.
                  </p>
                )}
                <button
                  type="button"
                  onClick={enviarTemplateMasivo}
                  disabled={!templateReady}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm focus-visible:outline-none focus-visible:ring-4
                      ${templateReady
                      ? "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-200"
                      : "bg-slate-200 text-slate-500 cursor-not-allowed"
                    }`}
                >
                  <i className="bx bx-send" />
                  Enviar template
                </button>
              </div>
            </form>
            <div className="mt-4 flex justify-end">
              <button
                onClick={closeModal}
                className="bg-red-500 text-white px-4 py-2 rounded-md"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== Subtoolbar ====== */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3">
        <ColumnsDropdown state={cols} setState={setCols} />

        <div className="relative flex-1 min-w-[240px] max-w-[520px]">
          <i className="bx bx-search absolute left-3 top-2.5 text-slate-500" />
          <input
            className="w-full rounded-md border border-slate-200 bg-white px-9 py-2 text-sm text-slate-800 outline-none ring-1 ring-transparent transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200/60"
            placeholder="Buscar..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="text-slate-600">
            Total {typeof total === "number" ? total : "—"} | Página {page} de{" "}
            {typeof total === "number"
              ? Math.max(1, Math.ceil(total / LIMIT))
              : "—"}
          </span>
          <div className="flex items-center gap-1">
            <label className="text-slate-500">Tamaño:</label>
            <select
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              {[10, 20, 25, 50, 100, 200, 500].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center">
            <button
              className="rounded-l-md border border-slate-200 px-2 py-1 hover:bg-slate-50"
              disabled={page <= 1}
              onClick={() => apiList(page - 1, true)}
              title="Anterior"
            >
              <i className="bx bx-chevron-left" />
            </button>
            <button
              className="rounded-r-md border border-slate-200 px-2 py-1 hover:bg-slate-50"
              disabled={!hasMore}
              onClick={() => apiList(page + 1, true)}
              title="Siguiente"
            >
              <i className="bx bx-chevron-right" />
            </button>
          </div>
        </div>
      </div>

      {/* ====== Filtros ====== */}
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2 text-xs">
        <div className="flex items-center gap-2">
          {["todos", "1", "0"].map((e) => (
            <button
              key={e}
              onClick={() => setEstado(e)}
              className={`rounded-full border px-3 py-1 transition
                ${estado === e
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                }`}
            >
              {e === "todos" ? "Todos" : e === "1" ? "Activo" : "Inactivo"}
            </button>
          ))}
        </div>

        <div className="ml-2 flex items-center gap-2">
          <TagSelect
            options={opcionesFiltroEtiquetas}
            value={idEtiquetaFiltro}
            onChange={setIdEtiquetaFiltro}
            disabled={false}
            unavailable={false}
          />

          <select
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm"
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            title="Orden"
          >
            <option value="recientes">Más recientes</option>
            <option value="antiguos">Más antiguos</option>
            <option value="actividad_desc">Actividad (desc)</option>
            <option value="actividad_asc">Actividad (asc)</option>
          </select>

          <select
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm"
            value={density}
            onChange={(e) => setDensity(e.target.value)}
            title="Densidad"
          >
            <option value="compacta">Compacta</option>
            <option value="media">Media</option>
            <option value="amplia">Amplia</option>
          </select>

          <button
            onClick={() => {
              setQ("");
              setEstado("todos");
              setIdEtiquetaFiltro("");
              setOrden("recientes");
            }}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-600 hover:bg-slate-50 transition"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* ====== Tabla ====== */}
      <div onScroll={onScroll} className="flex-1 overflow-auto">
        <table className="min-w-full table-fixed border-separate border-spacing-0">
          <thead
            className={`sticky top-0 z-20 bg-white ${headPad} border-b border-slate-200`}
          >
            <tr className="[&>th]:border-b [&>th]:px-3 [&>th]:text-slate-600">
              <th className="w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                />
              </th>

              {cols.name && (
                <th className="text-left">
                  <SortButton
                    label="Nombre"
                    active={/recientes|antiguos/.test(orden)}
                    dir={orden === "antiguos" ? "asc" : "desc"}
                    onClick={() =>
                      setOrden((o) =>
                        o === "recientes" ? "antiguos" : "recientes"
                      )
                    }
                  />
                </th>
              )}
              {cols.phone && (
                <th className="w-56 text-left">
                  <SortButton
                    label="Teléfono"
                    active={false}
                    onClick={() => { }}
                    className="text-slate-500"
                  />
                </th>
              )}
              {cols.email && (
                <th className="w-72 text-left">
                  <SortButton
                    label="Email"
                    active={false}
                    onClick={() => { }}
                    className="text-slate-500"
                  />
                </th>
              )}
              {cols.created && (
                <th className="w-40 text-left">
                  <SortButton
                    label="Creado"
                    active={/recientes|antiguos/.test(orden)}
                    dir={orden === "antiguos" ? "asc" : "desc"}
                    onClick={() =>
                      setOrden((o) =>
                        o === "recientes" ? "antiguos" : "recientes"
                      )
                    }
                  />
                </th>
              )}
              {cols.last_activity && (
                <th className="w-48 text-left">
                  <SortButton
                    label="Última actividad"
                    active={/actividad_/.test(orden)}
                    dir={orden === "actividad_asc" ? "asc" : "desc"}
                    onClick={() =>
                      setOrden((o) =>
                        o === "actividad_desc"
                          ? "actividad_asc"
                          : "actividad_desc"
                      )
                    }
                  />
                </th>
              )}
              {cols.tags && <th className="w-48 text-left">Tags</th>}
              <th className="w-10" />
            </tr>
          </thead>

          <tbody className="[&>tr:nth-child(even)]:bg-slate-50/20">
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={9} className="py-16">
                  <div className="mx-auto max-w-md text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-slate-200">
                      <i className="bx bx-user-circle text-2xl text-slate-500" />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-800">
                      Sin clientes
                    </h4>
                    <p className="mt-1 text-sm text-slate-500">
                      Aún no hay registros que coincidan con tu
                      búsqueda/filtros.
                    </p>
                    <button
                      className="mt-4 rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
                      onClick={() => {
                        setEditing({});
                        setDrawerOpen(true);
                      }}
                    >
                      Crear cliente
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {loading &&
              items.length === 0 &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr
                  key={`sk-${i}`}
                  className={`[&>td]:border-b [&>td]:px-3 ${rowPad}`}
                >
                  <td>
                    <div className="h-4 w-4 rounded bg-slate-200 animate-pulse" />
                  </td>
                  <td colSpan={5}>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-200 animate-pulse" />
                      <div className="h-3 w-1/3 rounded bg-slate-200 animate-pulse" />
                    </div>
                  </td>
                  <td>
                    <div className="h-3 w-24 rounded bg-slate-200 animate-pulse" />
                  </td>
                </tr>
              ))}

            {items.map((c, idx) => {
              const id = getId(c) ?? idx;
              const nombre =
                `${c.nombre || ""} ${c.apellido || ""}`.trim() || "Sin nombre";
              return (
                <tr
                  key={id}
                  className={`hover:bg-slate-50/60 [&>td]:border-b [&>td]:px-3 ${rowPad} transition-colors`}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(id)}
                      onChange={() => toggleSelect(id)}
                    />
                  </td>

                  {cols.name && (
                    <td className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
                          {initials(c.nombre, c.apellido)}
                        </div>
                        <div className="min-w-0">
                          <button
                            className="block truncate font-medium text-slate-900 hover:underline"
                            onClick={() => {
                              setEditing(c);
                              setDrawerOpen(true);
                            }}
                          >
                            {nombre}
                          </button>
                          <div className="truncate text-xs text-slate-500">
                            ID {id}
                          </div>
                        </div>
                      </div>
                    </td>
                  )}

                  {cols.phone && (
                    <td className="min-w-0">
                      <div className="flex items-center gap-2 truncate text-sm text-slate-700">
                        <i className="bx bx-phone" />
                        <span className="truncate">{c.telefono || "-"}</span>
                      </div>
                    </td>
                  )}

                  {cols.email && (
                    <td className="min-w-0">
                      <div className="flex items-center gap-2 truncate text-sm text-slate-700">
                        <i className="bx bx-envelope" />
                        <span className="truncate">{c.email || "-"}</span>
                      </div>
                    </td>
                  )}

                  {cols.created && (
                    <td className="text-sm text-slate-700">
                      <div>{fmtDate(c.createdAt)}</div>
                      <div className="text-xs text-slate-500">
                        {fmtTime(c.createdAt)}
                      </div>
                    </td>
                  )}

                  {cols.last_activity && (
                    <td className="text-sm text-slate-700">
                      <div className="flex items-center gap-2">
                        <i className="bx bx-time-five text-slate-500" />
                        <span>{timeAgo(c.ultima_actividad)}</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {fmtDateTime(c.ultima_actividad)}
                      </div>
                    </td>
                  )}

                  {cols.tags && (
                    <td className="min-w-0">
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(c.etiquetas) && c.etiquetas.length ? (
                          c.etiquetas.map((t, i) => (
                            <Chip key={i} color={t.color}>
                              {t.nombre}
                            </Chip>
                          ))
                        ) : (
                          <span className="text-slate-400 italic">
                            Sin etiquetas
                          </span>
                        )}
                      </div>
                    </td>
                  )}

                  <td className="text-right">
                    <div className="relative inline-block text-left">
                      <details>
                        <summary className="list-none inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50">
                          <span>⋯</span>
                        </summary>
                        <div className="absolute right-0 z-10 mt-2 w-48 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                          <button
                            className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                            onClick={() => {
                              setEditing(c);
                              setDrawerOpen(true);
                            }}
                          >
                            Editar
                          </button>
                          <button
                            className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                            onClick={async () => {
                              if (!selected.includes(id))
                                setSelected((prev) => [...prev, id]);
                              setIdConfigForTags(
                                c.id_configuracion || idConfigForTags
                              );
                              await ensureCatalogAndOpen("toggle");
                            }}
                            title="Etiquetas"
                          >
                            Etiquetas…
                          </button>
                          <button
                            className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                            onClick={async () => {
                              const ok = await swalConfirm(
                                "Eliminar cliente",
                                "¿Seguro que deseas eliminarlo?"
                              );
                              if (!ok) return;
                              try {
                                swalLoading("Eliminando...");
                                await apiDelete(id);
                                setItems((prev) =>
                                  prev.filter((x) => getId(x) !== id)
                                );
                                swalClose();
                                swalToast("Cliente eliminado");
                                await cargarOpcionesFiltroEtiquetas();
                              } catch (e) {
                                swalClose();
                                swalError("No se pudo eliminar", e?.message);
                              }
                            }}
                          >
                            Eliminar
                          </button>
                        </div>
                      </details>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {loading && items.length > 0 && (
          <div className="flex items-center justify-center py-4 text-sm text-slate-500">
            Cargando…
          </div>
        )}
        {!hasMore && items.length > 0 && (
          <div className="flex items-center justify-center py-4 text-xs text-slate-400">
            No hay más resultados
          </div>
        )}
      </div>

      {/* ===== Drawer crear/editar ===== */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] animate-[backdropIn_180ms_ease-out_forwards]"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-xl ring-1 ring-slate-900/5 translate-x-full animate-[drawerIn_200ms_cubic-bezier(0.2,0.8,0.2,1)_forwards]">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <h3 className="text-sm font-semibold text-slate-900">
                {editing && getId(editing) ? "Editar cliente" : "Nuevo cliente"}
              </h3>
              <button
                className="rounded p-2 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                onClick={() => setDrawerOpen(false)}
                aria-label="Cerrar panel"
              >
                <i className="bx bx-x text-xl text-slate-600" />
              </button>
            </div>
            <div className="h-[calc(100%-108px)] overflow-y-auto px-5 py-3">
              <ClienteForm value={editing} onChange={setEditing} />
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-5 py-3">
              <button
                onClick={() => setDrawerOpen(false)}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={onSave}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
              >
                Guardar
              </button>
            </div>
          </div>
          <style>{`
            @keyframes drawerIn { to { transform: translateX(0); } }
          `}</style>
        </div>
      )}

      {/* ===== Modales de etiquetas ===== */}
      <ModalTags
        open={modalToggleOpen}
        title="Toggle etiquetas"
        onClose={() => setModalToggleOpen(false)}
        catalogo={catalogosPorCfg[idConfigForTags]}
        disabled={!selected.length}
        onApply={async (idsEtiquetas) => {
          if (!selected.length) throw new Error("Selecciona clientes");
          await toggleEtiquetas(selected, idsEtiquetas);
        }}
      />
      <ModalTags
        open={modalAsignarOpen}
        title="Asignar etiquetas"
        onClose={() => setModalAsignarOpen(false)}
        catalogo={catalogosPorCfg[idConfigForTags]}
        disabled={!selected.length}
        onApply={async (idsEtiquetas) => {
          if (!selected.length) throw new Error("Selecciona clientes");
          await asignarEtiquetas(selected, idsEtiquetas);
        }}
      />
      <ModalTags
        open={modalQuitarOpen}
        title="Quitar etiquetas"
        onClose={() => setModalQuitarOpen(false)}
        catalogo={catalogosPorCfg[idConfigForTags]}
        disabled={!selected.length}
        onApply={async (idsEtiquetas) => {
          if (!selected.length) throw new Error("Selecciona clientes");
          await quitarEtiquetas(selected, idsEtiquetas);
        }}
      />
      <ModalCrearEtiqueta
        open={modalCrearEtiquetaOpen}
        onClose={() => setModalCrearEtiquetaOpen(false)}
        onCreate={crearEtiquetas}
      />

      {/* ===== Modales: SMS / Email / Reseña ===== */}
      <BaseModal
        open={modalSMS.open}
        title="Enviar SMS"
        onClose={() => setModalSMS({ open: false, msg: "" })}
        footer={
          <>
            <button
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 transition"
              onClick={() => setModalSMS({ open: false, msg: "" })}
            >
              Cancelar
            </button>
            <button
              disabled={!selected.length}
              onClick={async () => {
                const msg = modalSMS.msg;
                if (!msg.trim()) {
                  await swalInfo(
                    "Falta mensaje",
                    "Escribe el contenido del SMS"
                  );
                  return;
                }
                try {
                  swalLoading("Enviando SMS...");
                  await chatApi.post("/clientes_chat_center/sms/enviar", {
                    ids: selected,
                    mensaje: msg.trim(),
                  });
                  swalClose();
                  swalToast("SMS enviado");
                  setModalSMS({ open: false, msg: "" });
                } catch {
                  swalClose();
                  swalInfo("Pendiente", "Función de backend pendiente");
                }
              }}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-60 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
            >
              Enviar
            </button>
          </>
        }
      >
        <p className="mb-2 text-sm text-slate-600">
          Mensaje a {!selected.length ? 0 : selected.length} cliente(s).
        </p>
        <textarea
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200/60 outline-none transition"
          rows={5}
          placeholder="Tu mensaje SMS…"
          value={modalSMS.msg}
          onChange={(e) => setModalSMS({ open: true, msg: e.target.value })}
        />
      </BaseModal>

      <BaseModal
        open={modalEmail.open}
        title="Enviar Email"
        onClose={() => setModalEmail({ open: false, subject: "", body: "" })}
        footer={
          <>
            <button
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 transition"
              onClick={() =>
                setModalEmail({ open: false, subject: "", body: "" })
              }
            >
              Cancelar
            </button>
            <button
              disabled={!selected.length}
              onClick={async () => {
                const { subject, body } = modalEmail;
                if (!subject.trim()) {
                  await swalInfo(
                    "Asunto requerido",
                    "Escribe un asunto para el email"
                  );
                  return;
                }
                if (!body.trim()) {
                  await swalInfo(
                    "Cuerpo requerido",
                    "Escribe el contenido del email"
                  );
                  return;
                }
                try {
                  swalLoading("Enviando email...");
                  await chatApi.post("/clientes_chat_center/email/enviar", {
                    ids: selected,
                    subject: subject.trim(),
                    body: body.trim(),
                  });
                  swalClose();
                  swalToast("Email enviado");
                  setModalEmail({ open: false, subject: "", body: "" });
                } catch {
                  swalClose();
                  swalInfo("Pendiente", "Función de backend pendiente");
                }
              }}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-60 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
            >
              Enviar
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <input
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200/60 outline-none transition"
            placeholder="Asunto"
            value={modalEmail.subject}
            onChange={(e) =>
              setModalEmail((s) => ({ ...s, subject: e.target.value }))
            }
          />
        </div>
        <div className="space-y-3 mt-3">
          <textarea
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200/60 outline-none transition"
            rows={8}
            placeholder="Contenido del email…"
            value={modalEmail.body}
            onChange={(e) =>
              setModalEmail((s) => ({ ...s, body: e.target.value }))
            }
          />
        </div>
      </BaseModal>

      <BaseModal
        open={modalReview.open}
        title="Enviar solicitud de reseña"
        onClose={() =>
          setModalReview({ open: false, channel: "whatsapp", link: "" })
        }
        footer={
          <>
            <button
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 transition"
              onClick={() =>
                setModalReview({ open: false, channel: "whatsapp", link: "" })
              }
            >
              Cancelar
            </button>
            <button
              disabled={!selected.length}
              onClick={async () => {
                const { channel, link } = modalReview;
                if (!link.trim()) {
                  await swalInfo(
                    "Enlace requerido",
                    "Coloca el enlace de reseña"
                  );
                  return;
                }
                try {
                  swalLoading("Enviando solicitud...");
                  await chatApi.post("/clientes_chat_center/resenas/enviar", {
                    ids: selected,
                    channel,
                    link: link.trim(),
                  });
                  swalClose();
                  swalToast("Solicitud enviada");
                  setModalReview({
                    open: false,
                    channel: "whatsapp",
                    link: "",
                  });
                } catch {
                  swalClose();
                  swalInfo("Pendiente", "Función de backend pendiente");
                }
              }}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-60 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
            >
              Enviar
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-700">Canal</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200/60 outline-none transition"
              value={modalReview.channel}
              onChange={(e) =>
                setModalReview((s) => ({ ...s, channel: e.target.value }))
              }
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700">
              Enlace de reseña
            </label>
            <input
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200/60 outline-none transition"
              placeholder="https://g.page/r/XXXXX"
              value={modalReview.link}
              onChange={(e) =>
                setModalReview((s) => ({ ...s, link: e.target.value }))
              }
            />
          </div>
          <p className="text-xs text-slate-500">
            Se enviará a {!selected.length ? 0 : selected.length} cliente(s).
          </p>
        </div>
      </BaseModal>
    </div>
  );
}

/* ===== Formulario ===== */
function ClienteForm({ value, onChange }) {
  const v = value || {};
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-slate-700">Nombre</label>
          <input
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200/60 outline-none transition"
            value={v.nombre || ""}
            onChange={(e) => onChange({ ...v, nombre: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-700">Apellido</label>
          <input
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200/60 outline-none transition"
            value={v.apellido || ""}
            onChange={(e) => onChange({ ...v, apellido: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-slate-700">Email</label>
          <input
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200/60 outline-none transition"
            value={v.email || ""}
            onChange={(e) => onChange({ ...v, email: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-700">Celular</label>
          <input
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200/60 outline-none transition"
            value={v.telefono || ""}
            onChange={(e) => onChange({ ...v, telefono: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="text-xs font-medium text-slate-700">Estado</label>
          <select
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200/60 outline-none transition"
            value={v.estado ?? 1}
            onChange={(e) => onChange({ ...v, estado: Number(e.target.value) })}
          >
            <option value={1}>Activo</option>
            <option value={0}>Inactivo</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-700">
            Id Etiqueta
          </label>
          <input
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200/60 outline-none transition"
            value={v.id_etiqueta || ""}
            onChange={(e) => onChange({ ...v, id_etiqueta: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-700">
            Id Configuración
          </label>
          <input
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200/60 outline-none transition"
            value={v.id_configuracion || ""}
            onChange={(e) =>
              onChange({ ...v, id_configuracion: e.target.value })
            }
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="text-xs font-medium text-slate-700">
            Chat cerrado
          </label>
          <select
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200/60 outline-none transition"
            value={v.chat_cerrado ?? 0}
            onChange={(e) =>
              onChange({ ...v, chat_cerrado: Number(e.target.value) })
            }
          >
            <option value={0}>No</option>
            <option value={1}>Sí</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-700">
            Bot OpenIA
          </label>
          <select
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200/60 outline-none transition"
            value={v.bot_openia ?? 1}
            onChange={(e) =>
              onChange({ ...v, bot_openia: Number(e.target.value) })
            }
          >
            <option value={1}>Activo</option>
            <option value={0}>Inactivo</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-700">
            UID Cliente
          </label>
          <input
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200/60 outline-none transition"
            value={v.uid_cliente || ""}
            onChange={(e) => onChange({ ...v, uid_cliente: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-700">
          Imagen (URL)
        </label>
        <input
          className="mt-1 w-full rounded-md border border-slate-200 bg白 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200/60 outline-none transition"
          value={v.imagePath || ""}
          onChange={(e) => onChange({ ...v, imagePath: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-slate-700">
            Mensajes por día
          </label>
          <input
            type="number"
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200/60 outline-none transition"
            value={v.mensajes_por_dia_cliente ?? 0}
            onChange={(e) =>
              onChange({
                ...v,
                mensajes_por_dia_cliente: Number(e.target.value),
              })
            }
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-700">
            Pedido confirmado
          </label>
          <select
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200/60 outline-none transition"
            value={v.pedido_confirmado ?? 0}
            onChange={(e) =>
              onChange({ ...v, pedido_confirmado: Number(e.target.value) })
            }
          >
            <option value={0}>No</option>
            <option value={1}>Sí</option>
          </select>
        </div>
      </div>
    </div>
  );
}
