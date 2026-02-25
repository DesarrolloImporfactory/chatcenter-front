import { useEffect, useMemo, useRef, useState } from "react";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";
import io from "socket.io-client";
import { jwtDecode } from "jwt-decode";
import Select from "react-select";
import * as XLSX from "xlsx";
import ImportarXlsxModal from "../clientes/modales/ImportarXlsxModal";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../pages/Header/pageHeader";
import Programados from "./Programados";
import NuevoContacto from "./modales/NuevoContacto";
import EnviarTemplateMasivo from "./modales/EnviarTemplateMasivo";
import TablaContactos from "./TablaContactos";

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

//chat_id primero (id_cliente_chat_center)
const getId = (r) =>
  r?.id_cliente_chat_center ?? r?.id ?? r?._id ?? r?.id_cliente ?? null;

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

function getDisplayContact(c) {
  const phone = String(c?.telefono_limpio || c?.telefono || "").trim();
  if (phone) return phone;

  const ext = String(c?.external_id || c?._raw?.external_id || "").trim();
  if (ext) return ext;

  const page = String(c?.page_id || c?._raw?.page_id || "").trim();
  if (page) return page;

  const conv = String(
    c?.conversation_id || c?._raw?.conversation_id || "",
  ).trim();
  if (conv) return conv;

  return "-";
}

/* Normaliza fila -> llaves del front (id = chat_id) */
function mapRow(row) {
  const chatId = row.id_cliente_chat_center ?? row.id ?? null;
  const lastAt = row.ultimo_mensaje_at ?? row.updated_at ?? row.created_at;

  // 👇 NUEVO: ids externos típicos IG/MS
  const externalId =
    row.external_id ??
    row.external_mid ??
    row.mid ??
    row.psid ??
    row.ig_user_id ??
    row.fb_user_id ??
    "";

  const pageId = row.page_id ?? row.id_page ?? "";
  const convId =
    row.conversation_id ?? row.thread_id ?? row.id_conversation ?? "";

  // 👇 NUEVO: “contacto visible” para UI (WhatsApp o IG/MS)
  const telefonoLimpio = row.telefono_limpio || "";
  const telefono = row.celular_cliente || "";
  const display_contact =
    telefonoLimpio || telefono || externalId || pageId || convId || "";

  return {
    id: chatId,
    id_cliente_chat_center: chatId,

    nombre: row.nombre_cliente || "",
    apellido: row.apellido_cliente || "",
    email: row.email_cliente || "",
    telefono: telefono,
    telefono_limpio: telefonoLimpio,

    // ✅ NUEVOS
    external_id: externalId,
    page_id: pageId,
    conversation_id: convId,
    display_contact,

    createdAt: row.created_at,
    ultima_actividad: lastAt,

    ultimo_mensaje_at: row.ultimo_mensaje_at ?? null,
    ultimo_texto: row.ultimo_texto ?? "",
    ultimo_tipo_mensaje: row.ultimo_tipo_mensaje ?? "",
    ultimo_rol_mensaje: row.ultimo_rol_mensaje ?? null,
    ultimo_msg_id: row.ultimo_msg_id ?? null,

    estado: row.estado_cliente,
    id_etiqueta: row.id_etiqueta ?? null,
    id_plataforma: row.id_plataforma ?? null,
    id_configuracion: row.id_configuracion ?? null,
    chat_cerrado: row.chat_cerrado ?? 0,
    bot_openia: row.bot_openia ?? 1,
    uid_cliente: row.uid_cliente || "",
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
        className={`bx ${
          dir === "asc" ? "bx-chevron-up" : "bx-chevron-down"
        } text-[16px] text-slate-400 group-hover:text-slate-600 ${
          active ? "!text-slate-700" : ""
        }`}
      />
    </button>
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
      <div className="absolute left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-900/10 opacity-0 translate-y-1 animate-[modalPop_180ms_cubic-bezier(0.2,0.8,0.2,1)_forwards]">
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
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
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
                className="h-4 w-4 text-blue-600 rounded border-slate-300"
                checked={seleccion.includes(t.id_etiqueta)}
                onChange={(e) =>
                  setSeleccion((prev) =>
                    e.target.checked
                      ? [...prev, t.id_etiqueta]
                      : prev.filter((x) => x !== t.id_etiqueta),
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

const CHAT_ROUTE = "/chat";

/* =========================== Vista principal =========================== */
export default function Contactos() {
  const navigate = useNavigate();
  const openChatById = (cOrId) => {
    const chatId =
      typeof cOrId === "object"
        ? (cOrId?.id_cliente_chat_center ?? cOrId?.id)
        : cOrId;

    if (!chatId) return;

    navigate(`${CHAT_ROUTE}/${chatId}`, {
      state: {
        id_configuracion: Number(localStorage.getItem("id_configuracion")),
      },
    });
  };

  const [view, setView] = useState("contactos");

  const closeRowMenu = (ev) => {
    const details = ev.currentTarget.closest("details");
    if (details) details.removeAttribute("open");
  };

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
      zIndex: 9999,
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
  const [openImportXlsx, setOpenImportXlsx] = useState(false);
  const [headerDefaultAssetMasivo, setHeaderDefaultAssetMasivo] =
    useState(null);
  const [useDefaultHeaderAssetMasivo, setUseDefaultHeaderAssetMasivo] =
    useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = jwtDecode(token);

      setNombre_encargado_global(decoded.nombre_encargado);

      if (decoded.exp < Date.now() / 1000) {
        localStorage.clear();
        window.location.href = "/login";
      }

      setUserData(decoded);

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
      window.location.href = "/login";
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off("DATA_ADMIN_RESPONSE");
        socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (isSocketConnected && socketRef.current) {
      const id_configuracion = localStorage.getItem("id_configuracion");

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
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off("DATA_ADMIN_RESPONSE");
      }
    };
  }, [isSocketConnected]);

  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // cache por id_configuracion para no repetir llamadas
  const templatesCacheRef = useRef({});
  const [templateText, setTemplateText] = useState("");
  const [placeholders, setPlaceholders] = useState([]);
  const [placeholderValues, setPlaceholderValues] = useState({});
  const [templateName, setTemplateName] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("es");

  // ====== NUEVO: soporte HEADER (TEXT / IMAGE / VIDEO / DOCUMENT) ======
  const [headerRequired, setHeaderRequired] = useState(false);
  const [headerFormat, setHeaderFormat] = useState(null); // 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | null
  const [headerPlaceholders, setHeaderPlaceholders] = useState([]);
  const [headerPlaceholderValues, setHeaderPlaceholderValues] = useState({});
  const [headerFileMasivo, setHeaderFileMasivo] = useState(null);

  // (opcional pero recomendado si quiere también soportar botones URL como el 1 a 1)
  const [bodyPlaceholders, setBodyPlaceholders] = useState([]); // [{n,key}]
  const [urlButtons, setUrlButtons] = useState([]); // [{index,ph,key,label,base}]

  const allPlaceholdersFilled = placeholders.every(
    (ph) => (placeholderValues[ph] || "").trim().length > 0,
  );

  const allBodyPlaceholdersFilled = placeholders.every(
    (ph) => (placeholderValues[`body_${ph}`] || "").trim().length > 0,
  );

  const isHeaderText = headerRequired && headerFormat === "TEXT";
  const isHeaderMedia =
    headerRequired && ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerFormat);

  const allHeaderPlaceholdersFilled = headerPlaceholders.every(
    (ph) => (headerPlaceholderValues[ph] || "").trim().length > 0,
  );

  const headerTextReady = !isHeaderText || allHeaderPlaceholdersFilled;

  // ✅ Si hay header media, puede estar listo por archivo manual o por asset predeterminado
  const hasDefaultHeaderAssetMasivo =
    !!useDefaultHeaderAssetMasivo && !!headerDefaultAssetMasivo?.url;

  const headerMediaReady =
    !isHeaderMedia || Boolean(headerFileMasivo) || hasDefaultHeaderAssetMasivo;

  // ✅ Validación URL buttons (si existen)
  const allUrlButtonsFilled = urlButtons.every(
    (b) => (placeholderValues[b.key] || "").trim().length > 0,
  );

  const templateReady =
    Boolean(templateName) &&
    (placeholders.length === 0 || allBodyPlaceholdersFilled) &&
    allUrlButtonsFilled &&
    headerTextReady &&
    headerMediaReady;

  const abrirModalTemplates = async () => {
    const cfgId = Number(localStorage.getItem("id_configuracion"));
    if (!cfgId) return;

    // Si ya está en cache, no vuelve a consultar
    const cached = templatesCacheRef.current[cfgId];
    if (Array.isArray(cached)) {
      setTemplates(cached);
      return;
    }

    setLoadingTemplates(true);
    try {
      const { data } = await chatApi.post(
        "/whatsapp_managment/obtenerTemplatesWhatsapp",
        {
          id_configuracion: cfgId,
          limit: 100,
        },
      );

      const arr = Array.isArray(data?.templates)
        ? data.templates
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
            ? data
            : [];

      setTemplates(arr);
      templatesCacheRef.current[cfgId] = arr; // cache
    } catch (e) {
      console.error(
        "Error cargando templates:",
        e?.response?.data || e.message,
      );
      setTemplates([]);
      templatesCacheRef.current[cfgId] = []; // cache vacío para no spamear
    } finally {
      setLoadingTemplates(false);
    }
  };

  function PreviewFile({ url }) {
    if (!url) return null;

    const lower = String(url).toLowerCase();

    const isImage =
      lower.includes(".jpg") ||
      lower.includes(".jpeg") ||
      lower.includes(".png") ||
      lower.includes(".webp") ||
      lower.includes(".gif");

    const isVideo =
      lower.includes(".mp4") ||
      lower.includes(".webm") ||
      lower.includes(".mov");

    if (isImage) {
      return (
        <img
          src={url}
          alt="Adjunto predeterminado"
          className="max-h-48 rounded-lg border"
        />
      );
    }

    if (isVideo) {
      return (
        <video
          src={url}
          controls
          className="w-full max-h-60 rounded-lg border"
        />
      );
    }

    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs hover:bg-slate-50"
      >
        <i className="bx bx-link-external text-base" />
        Ver adjunto predeterminado
      </a>
    );
  }

  const handleTemplateSelect = (event) => {
    const selectedTemplateName = event.target.value;
    setTemplateName(selectedTemplateName);

    const selectedTemplate = templates.find(
      (t) => t.name === selectedTemplateName,
    );

    // ===== Reset general =====
    setTemplateText("");
    setPlaceholders([]);
    setBodyPlaceholders([]);
    setUrlButtons([]);
    setPlaceholderValues({});

    // Reset header
    setHeaderRequired(false);
    setHeaderFormat(null);
    setHeaderPlaceholders([]);
    setHeaderPlaceholderValues({});
    setHeaderFileMasivo(null);

    //  Reset asset predeterminado
    setHeaderDefaultAssetMasivo(null);
    setUseDefaultHeaderAssetMasivo(true);

    if (!selectedTemplate) return;

    // =========================
    // 0) HEADER
    // =========================
    const headerComp = selectedTemplate.components?.find(
      (c) => String(c.type || "").toUpperCase() === "HEADER",
    );

    if (headerComp) {
      const fmt = String(headerComp.format || "").toUpperCase(); // TEXT | IMAGE | VIDEO | DOCUMENT
      if (fmt) {
        setHeaderRequired(true);
        setHeaderFormat(fmt);

        // HEADER TEXT placeholders
        if (fmt === "TEXT") {
          const headerText = String(headerComp.text || "");
          const matches = [...headerText.matchAll(/{{(.*?)}}/g)].map((m) =>
            String(m[1]).trim(),
          );

          if (matches.length > 0) {
            const initialHeaderValues = {};
            matches.forEach((ph) => (initialHeaderValues[ph] = ""));
            setHeaderPlaceholders(matches);
            setHeaderPlaceholderValues(initialHeaderValues);
          } else {
            setHeaderPlaceholders([]);
            setHeaderPlaceholderValues({});
          }
        }

        // ✅ HEADER MEDIA: intentar detectar asset predeterminado (ejemplo de template)
        if (["IMAGE", "VIDEO", "DOCUMENT"].includes(fmt)) {
          // Ajustado para varias estructuras posibles del backend
          const ex =
            headerComp.example ||
            selectedTemplate.example ||
            selectedTemplate.examples ||
            null;

          // Intenta obtener URL desde distintas rutas comunes
          const possibleUrl =
            ex?.header_url ||
            ex?.url ||
            ex?.media_url ||
            ex?.header_handle_url ||
            ex?.header_example_url ||
            (Array.isArray(ex?.header_urls) ? ex.header_urls[0] : null) ||
            (Array.isArray(ex?.media_urls) ? ex.media_urls[0] : null) ||
            (Array.isArray(headerComp?.example?.header_handle)
              ? headerComp.example.header_handle[0]
              : null) ||
            (Array.isArray(headerComp?.example?.header_handles)
              ? headerComp.example.header_handles[0]
              : null) ||
            null;

          const possibleName =
            ex?.file_name ||
            ex?.name ||
            headerComp?.example?.file_name ||
            `Adjunto predeterminado (${fmt})`;

          if (possibleUrl) {
            setHeaderDefaultAssetMasivo({
              url: possibleUrl,
              name: possibleName,
              source: "template_example",
            });
            setUseDefaultHeaderAssetMasivo(true);
          }
        }
      }
    }

    // =========================
    // 1) BODY
    // =========================
    const bodyComp = selectedTemplate.components?.find(
      (c) => String(c.type || "").toUpperCase() === "BODY",
    );

    let extractedBody = [];
    if (bodyComp?.text) {
      const bodyText = String(bodyComp.text);
      setTemplateText(bodyText);

      extractedBody = [...bodyText.matchAll(/{{(.*?)}}/g)].map((m) =>
        String(m[1]).trim(),
      );

      // Compatibilidad con UI actual
      setPlaceholders(extractedBody);

      // Nuevo formato (body_1, body_2...)
      const bodyObjs = extractedBody.map((n) => ({ n, key: `body_${n}` }));
      setBodyPlaceholders(bodyObjs);
    } else {
      setTemplateText("Este template no tiene un cuerpo definido.");
    }

    // =========================
    // 2) BUTTONS (URL)
    // =========================
    const buttonsComp = selectedTemplate.components?.find(
      (c) => String(c.type || "").toUpperCase() === "BUTTONS",
    );

    let urlBtns = [];
    if (buttonsComp?.buttons?.length) {
      buttonsComp.buttons.forEach((btn, idx) => {
        const isUrl = String(btn.type || "").toUpperCase() === "URL";
        if (!isUrl) return;

        const urlText = String(btn.url || "");
        const matches = [...urlText.matchAll(/{{(.*?)}}/g)].map((m) =>
          String(m[1]).trim(),
        );

        matches.forEach((ph) => {
          urlBtns.push({
            index: String(idx),
            ph,
            key: `url_${idx}_${ph}`,
            label: btn.text || "URL",
            base: urlText,
          });
        });
      });
    }
    setUrlButtons(urlBtns);

    // =========================
    // 3) Inicializar placeholderValues (body + url)
    // =========================
    const initial = {};

    extractedBody.forEach((n) => {
      initial[`body_${n}`] = "";
    });

    urlBtns.forEach((b) => {
      initial[b.key] = "";
    });

    setPlaceholderValues(initial);

    // =========================
    // 4) Idioma
    // =========================
    const templateLanguage =
      selectedTemplate.language?.code ||
      selectedTemplate.language ||
      selectedTemplate?.languages?.[0]?.code ||
      "es";

    setSelectedLanguage(templateLanguage);
  };

  const handleTextareaChange = (event) => {
    setTemplateText(event.target.value);
  };

  const handlePlaceholderChange = (placeholder, value) => {
    setPlaceholderValues((prevValues) => ({
      ...prevValues,
      [placeholder]: value,
    }));
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
    language_code,
    meta_media_id,
    fileUrl,
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
          meta_media_id,
          fileUrl,
        },
      );

      let respuesta = response.data;

      if (respuesta.status !== 200) {
        console.log("Error en la respuesta del servidor: " + respuesta);
      }
    } catch (error) {
      console.error("Error al guardar el mensaje:", error);
      alert("Ocurrió un error al guardar el mensaje. Inténtalo de nuevo.");
    }
  };

  const calcularDelay = (cantidad) => {
    if (cantidad <= 50) return 3000;
    if (cantidad <= 200) return 6000;
    if (cantidad <= 500) return 10000;
    return 20000;
  };

  function resolverVariableMasiva(raw, recipient, placeholderFallback) {
    const v = String(raw || "").trim();

    // Si está vacío, que Meta reciba el placeholder real {{1}} (evita enviar vacío)
    if (!v) return `{{${placeholderFallback}}}`;

    // Variables rápidas
    if (v === "{nombre}")
      return recipient?.nombre || `{{${placeholderFallback}}}`;
    if (v === "{apellido}")
      return recipient?.apellido || `{{${placeholderFallback}}}`;
    if (v === "{direccion}")
      return recipient?._raw?.direccion || `{{${placeholderFallback}}}`;
    if (v === "{productos}")
      return recipient?._raw?.productos || `{{${placeholderFallback}}}`;

    // Texto fijo normal
    return v;
  }

  const enviarTemplateMasivo = async () => {
    if (!dataAdmin) {
      swalInfo(
        "Config pendiente",
        "No hay datos de configuración de WhatsApp cargados.",
      );
      return;
    }

    if (!selected || selected.length === 0) {
      swalInfo("Sin seleccionados", "Seleccione al menos un destinatario.");
      return;
    }

    if (!templateReady) {
      swalInfo(
        "Template incompleto",
        "Complete los campos requeridos del template antes de enviar.",
      );
      return;
    }

    const headerIsMedia =
      headerRequired && ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerFormat);

    const hasDefaultHeaderAssetMasivo =
      !!useDefaultHeaderAssetMasivo && !!headerDefaultAssetMasivo?.url;

    // ✅ Header media puede ser archivo manual o asset predeterminado
    if (headerIsMedia && !headerFileMasivo && !hasDefaultHeaderAssetMasivo) {
      swalInfo(
        "Header requerido",
        `Este template requiere un archivo de header (${headerFormat}) o usar el adjunto predeterminado.`,
      );
      return;
    }

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const delay = calcularDelay(selected.length);

    let exitosos = [];
    let fallidos = [];

    Swal.fire({
      title: "Enviando mensajes...",
      html: "Por favor espera mientras enviamos los mensajes.",
      didOpen: () => Swal.showLoading(),
      allowOutsideClick: false,
    });

    for (let i = 0; i < selected.length; i++) {
      const recipientId = selected[i];
      const recipient = items.find((item) => item.id === recipientId);

      if (!recipient) {
        fallidos.push(`ID: ${recipientId}`);
        continue;
      }

      const recipientPhone = recipient.telefono_limpio;
      if (!recipientPhone) {
        fallidos.push(`ID: ${recipientId}, Teléfono no disponible`);
        continue;
      }

      try {
        const id_configuracion = localStorage.getItem("id_configuracion");

        // ===== Construir COMPONENTS =====
        const components = [];

        // 1) HEADER TEXT
        if (headerRequired && headerFormat === "TEXT") {
          const headerParams = (headerPlaceholders || []).map((ph) => {
            const raw = headerPlaceholderValues[ph] || "";
            const value = resolverVariableMasiva(raw, recipient, ph);
            return { type: "text", text: String(value) };
          });

          // Si el template HEADER TEXT tiene placeholders, se envían
          // Si no tiene placeholders, no hace falta enviar header component
          if (headerParams.length > 0) {
            components.push({
              type: "header",
              parameters: headerParams,
            });
          }
        }

        // 2) BODY
        components.push({
          type: "body",
          parameters: (placeholders || []).map((ph) => {
            const key = `body_${ph}`;
            const raw = placeholderValues[key] || "";
            const value = resolverVariableMasiva(raw, recipient, ph);
            return { type: "text", text: String(value) };
          }),
        });

        // 3) BUTTONS URL
        if (urlButtons.length > 0) {
          // agrupar por index de botón
          const byIndex = new Map();

          urlButtons.forEach((b) => {
            if (!byIndex.has(b.index)) byIndex.set(b.index, []);
            byIndex.get(b.index).push(b);
          });

          for (const [index, btnPlaceholders] of byIndex.entries()) {
            const params = btnPlaceholders.map((b) => {
              const raw = placeholderValues[b.key] || "";
              const value = resolverVariableMasiva(raw, recipient, b.ph);
              return { type: "text", text: String(value) };
            });

            components.push({
              type: "button",
              sub_type: "url",
              index: String(index),
              parameters: params,
            });
          }
        }

        const body = {
          messaging_product: "whatsapp",
          to: recipientPhone,
          type: "template",
          template: {
            name: templateName,
            language: { code: selectedLanguage || "es" },
            components,
          },
        };

        let dataResp;

        // CASO 1: Usuario subió archivo manual => multipart
        if (headerIsMedia && headerFileMasivo) {
          const fd = new FormData();

          fd.append("id_configuracion", String(id_configuracion));
          fd.append("id_cliente_chat_center", String(recipientId));
          fd.append("body_json", JSON.stringify(body));
          fd.append("header_format", headerFormat);
          fd.append("header_file", headerFileMasivo);

          const { data } = await chatApi.post(
            "/whatsapp_managment/enviar_template_masivo",
            fd,
            { headers: { "Content-Type": "multipart/form-data" } },
          );

          dataResp = data;
        } else {
          // CASO 2: JSON (sin archivo manual; puede ir con asset predeterminado)
          const payload = {
            id_configuracion,
            id_cliente_chat_center: recipientId,
            body,

            // Fallbacks planos
            to: recipientPhone,
            template_name: templateName,
            language_code: selectedLanguage || "es",

            // asset predeterminado para header media
            header_default_asset:
              headerIsMedia && hasDefaultHeaderAssetMasivo
                ? {
                    enabled: true,
                    format: headerFormat, // IMAGE|VIDEO|DOCUMENT
                    url: headerDefaultAssetMasivo.url,
                    source:
                      headerDefaultAssetMasivo.source || "template_example",
                    name:
                      headerDefaultAssetMasivo.name ||
                      "Adjunto predeterminado del template",
                  }
                : null,
          };

          const { data } = await chatApi.post(
            "/whatsapp_managment/enviar_template_masivo",
            payload,
          );

          dataResp = data;
        }

        if (!dataResp || dataResp.success !== true) {
          const msg = dataResp?.message || "Meta rechazó el envío";
          throw new Error(msg);
        }

        const wamid =
          dataResp?.wamid ||
          dataResp?.messages?.[0]?.id ||
          dataResp?.data?.messages?.[0]?.id ||
          null;

        exitosos.push(`ID: ${recipientId}, Teléfono: ${recipientPhone}`);

        // ======== GUARDAR EN BD SOLO SI META OK ========
        try {
          let id_recibe = recipientId;
          let mid_mensaje = dataAdmin.id_telefono;
          let telefono_configuracion = dataAdmin.telefono;

          // placeholders BODY para BD
          const placeholdersObj = {};
          (placeholders || []).forEach((ph) => {
            const key = `body_${ph}`;
            placeholdersObj[ph] = resolverVariableMasiva(
              placeholderValues[key] || "",
              recipient,
              ph,
            );
          });

          // placeholders HEADER TEXT para BD (opcional)
          const headerPlaceholdersObj = {};
          (headerPlaceholders || []).forEach((ph) => {
            headerPlaceholdersObj[ph] = resolverVariableMasiva(
              headerPlaceholderValues[ph] || "",
              recipient,
              ph,
            );
          });

          // placeholders URL BUTTONS para BD (opcional)
          const urlButtonsObj = {};
          (urlButtons || []).forEach((b) => {
            urlButtonsObj[b.key] = resolverVariableMasiva(
              placeholderValues[b.key] || "",
              recipient,
              b.ph,
            );
          });

          const metaMediaId = dataResp?.meta_media_id || null;
          const fileUrl = dataResp?.fileUrl || null;

          const headerValueForDb = headerFileMasivo?.name
            ? String(headerFileMasivo.name).trim()
            : hasDefaultHeaderAssetMasivo
              ? String(
                  headerDefaultAssetMasivo?.name ||
                    "Adjunto predeterminado del template",
                ).trim()
              : "";

          const ruta_archivo = {
            placeholders: placeholdersObj,
            header: headerRequired
              ? {
                  format: headerFormat, // TEXT | IMAGE | VIDEO | DOCUMENT
                  placeholders:
                    headerFormat === "TEXT" ? headerPlaceholdersObj : null,
                  value: headerIsMedia ? headerValueForDb : null,
                  source:
                    headerIsMedia &&
                    hasDefaultHeaderAssetMasivo &&
                    !headerFileMasivo
                      ? "template_default"
                      : headerIsMedia && headerFileMasivo
                        ? "uploaded"
                        : "text",
                  fileUrl: fileUrl,
                  meta_media_id: metaMediaId,
                  mime: dataResp?.file_info?.mime || null,
                  size: dataResp?.file_info?.size || null,
                }
              : null,
            buttons_url: Object.keys(urlButtonsObj).length
              ? urlButtonsObj
              : null,
            template_name: templateName,
            language: selectedLanguage,
          };

          await agregar_mensaje_enviado(
            templateText,
            "template",
            JSON.stringify(ruta_archivo),
            recipientPhone,
            mid_mensaje,
            id_recibe,
            id_configuracion,
            telefono_configuracion,
            wamid,
            templateName,
            selectedLanguage,
            metaMediaId,
            fileUrl,
          );
        } catch (dbErr) {
          console.warn(
            "Meta OK, pero falló guardar en BD:",
            dbErr?.message || dbErr,
          );
        }
      } catch (error) {
        const msg =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "Error desconocido";

        fallidos.push(
          `ID: ${recipientId}, Teléfono: ${recipientPhone} - Error: ${msg}`,
        );
      }

      await sleep(delay);
    }

    Swal.close();

    if (exitosos.length > 0) {
      Swal.fire({
        icon: "success",
        title: "Mensajes enviados correctamente",
        text: `Enviados a: ${exitosos.join(", ")}`,
      });
      setIsModalOpenMasivo(false);
    }

    if (fallidos.length > 0) {
      Swal.fire({
        icon: "error",
        title: "Errores al enviar mensajes",
        text: `Fallaron los envíos a: ${fallidos.join(", ")}`,
      });
    }
  };

  /* masivos fin */

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(undefined);

  const [pageSize, setPageSize] = useState(21);
  const LIMIT = pageSize;

  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("todos");

  const [idEtiquetaFiltro, setIdEtiquetaFiltro] = useState("");
  const [opcionesFiltroEtiquetas, setOpcionesFiltroEtiquetas] = useState([]);

  const [orden, setOrden] = useState("recientes");

  const [selected, setSelected] = useState([]);

  const [modalToggleOpen, setModalToggleOpen] = useState(false);
  const [modalAsignarOpen, setModalAsignarOpen] = useState(false);
  const [modalQuitarOpen, setModalQuitarOpen] = useState(false);
  const [modalCrearEtiquetaOpen, setModalCrearEtiquetaOpen] = useState(false);
  const [isModalOpenMasivo, setIsModalOpenMasivo] = useState(false);
  const [isModalOpenNuevoContact, setIsModalOpenNuevoContact] = useState(false);

  const openModalMasivos = () => {
    setTimezoneProgramada(
      Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Guayaquil",
    );
    setIsModalOpenMasivo(true);
  };

  const resetProgramacionMasiva = () => {
    setProgramarMasivo(false);
    setFechaHoraProgramada("");
    setTimezoneProgramada(
      Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Guayaquil",
    );
  };

  const closeModal = () => {
    setIsModalOpenMasivo(false);
    resetNumeroModalState();
    resetProgramacionMasiva();
  };

  const openModalNuevoContact = () => {
    setIsModalOpenNuevoContact(true);
  };

  const closeModalNuevoContact = () => {
    setIsModalOpenNuevoContact(false);
  };

  const [nuevoTelefonoContacto, setNuevoTelefonoContacto] = useState("");
  const [nuevoNombreContacto, setNuevoNombreContacto] = useState("");
  const [nuevoApellidoContacto, setNuevoApellidoContacto] = useState("");

  const guardarNuevoContacto = async () => {
    const telefono = (nuevoTelefonoContacto || "").trim();
    const nombre = (nuevoNombreContacto || "").trim();
    const apellido = (nuevoApellidoContacto || "").trim();

    if (!telefono || !nombre || !apellido) {
      swalInfo("Faltan datos", "Completa teléfono, nombre y apellido.");
      return;
    }

    try {
      swalLoading("Guardando contacto...");

      const response = await chatApi.post(
        "/clientes_chat_center/agregarNumeroChat",
        { telefono, nombre, apellido, id_configuracion },
      );

      const data = response?.data;

      // ✅ OK (según tu API)
      if (data?.status === 200) {
        swalClose();
        swalToast(data?.message || "Número agregado correctamente", "success");

        setNuevoTelefonoContacto("");
        setNuevoNombreContacto("");
        setNuevoApellidoContacto("");
        closeModalNuevoContact();
        await apiList(1, true);
        return data;
      }

      // ⚠️ Respuesta inesperada
      swalClose();
      swalError(
        "No se pudo guardar",
        data?.message || "Respuesta inesperada del servidor.",
      );
      return;
    } catch (error) {
      swalClose();

      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Intenta nuevamente.";

      swalError("Ocurrió un error", msg);
      throw error;
    }
  };

  const resetNumeroModalState = () => {
    setTemplateName("");
    setTemplateText("");

    // body
    setPlaceholders([]);
    setBodyPlaceholders([]);
    setUrlButtons([]);
    setPlaceholderValues({});

    // idioma
    setSelectedLanguage("es");

    // header
    setHeaderRequired(false);
    setHeaderFormat(null);
    setHeaderPlaceholders([]);
    setHeaderPlaceholderValues({});
    setHeaderFileMasivo(null);

    //  asset predeterminado
    setHeaderDefaultAssetMasivo(null);
    setUseDefaultHeaderAssetMasivo(true);
  };

  const [cols, setCols] = useState({
    name: true,
    phone: true,
    email: true,
    created: true,
    last_activity: true,
    tags: true,
  });

  const [catalogosPorCfg, setCatalogosPorCfg] = useState({});
  const [idConfigForTags, setIdConfigForTags] = useState(null);

  function normalizePhone(s = "") {
    return String(s).replace(/\D/g, "");
  }
  function isPhoneQuery(qStr = "") {
    const onlyDigits = normalizePhone(qStr);
    return /^[\d\s()+-]*$/.test(qStr) && onlyDigits.length >= 5;
  }

  function normalizeHumanText(s = "") {
    return String(s)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]+/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function matchesFullName(cliente, qRaw) {
    if (!qRaw) return true;
    const full = normalizeHumanText(
      `${cliente.nombre || ""} ${cliente.apellido || ""}`,
    );
    const qn = normalizeHumanText(qRaw);
    if (!qn) return true;
    const parts = qn.split(" ");
    return parts.every((p) => full.includes(p));
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
          },
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

  async function cargarOpcionesFiltroEtiquetas() {
    try {
      const { data } = await chatApi.post(
        "/etiquetas_chat_center/etiquetas_existentes",
        {
          id_configuracion: localStorage.getItem("id_configuracion"),
        },
      );
      const arr = Array.isArray(data?.etiquetas) ? data.etiquetas : [];
      setOpcionesFiltroEtiquetas(arr);
    } catch (e) {
      console.warn(
        "No se pudieron cargar etiquetas existentes:",
        e?.response?.data || e.message,
      );
      setOpcionesFiltroEtiquetas([]);
    }
  }

  const id_configuracion = Number(localStorage.getItem("id_configuracion"));

  /**
   * NUEVO: Obtener etiquetas de muchos clientes usando el endpoint
   * clientes_chat_center/etiquetas/multiples para evitar N llamadas por cliente.
   */
  async function anexarEtiquetasAsignadas(clientes) {
    if (!clientes?.length) return clientes;
    const ids = clientes.map((c) => getId(c)).filter(Boolean);
    if (!ids.length) return clientes;

    try {
      const { data } = await chatApi.post(
        "clientes_chat_center/etiquetas/multiples",
        {
          ids,
          id_configuracion,
        },
      );
      const mapa = data?.etiquetas || {};

      return clientes.map((c) => {
        const id = getId(c);
        const raw = mapa[id] || mapa[String(id)] || [];
        const etiquetasLimpias = (Array.isArray(raw) ? raw : []).map((e) => ({
          id: e.id_etiqueta ?? e.id,
          nombre: e.nombre || e.nombre_etiqueta || `#${e.id_etiqueta}`,
          color: e.color || e.color_etiqueta,
        }));
        return { ...c, etiquetas: etiquetasLimpias };
      });
    } catch (err) {
      console.warn(
        "Error obteniendo etiquetas múltiples:",
        err?.response?.data || err.message,
      );
      return clientes.map((c) => ({ ...c, etiquetas: c.etiquetas || [] }));
    }
  }

  async function apiList(p = 1, replace = false) {
    setLoading(true);
    try {
      const phoneLike = isPhoneQuery(q);
      const qPhone = phoneLike ? normalizePhone(q) : undefined;

      let qForBackend = undefined;
      let qOriginal = q;
      let tokens = [];
      if (!phoneLike && qOriginal?.trim()) {
        const qn = normalizeHumanText(qOriginal);
        tokens = qn ? qn.split(" ") : [];

        const rawTokens = qOriginal.trim().split(/\s+/);
        const anchorRaw =
          rawTokens.length > 1
            ? rawTokens.slice().sort((a, b) => b.length - a.length)[0]
            : rawTokens[0];
        qForBackend = anchorRaw || qOriginal;
      }

      const paramsBase = {
        page: p,
        limit: LIMIT,
        sort: orden,
        q: qOriginal ? (phoneLike ? qPhone : qForBackend) : undefined,
        estado: estado !== "todos" ? estado : undefined,
        search_mode: phoneLike ? "phone" : "name",
        phone: phoneLike ? qPhone : undefined,
        id_configuracion: localStorage.getItem("id_configuracion"),
      };

      let dataResp;
      if (idEtiquetaFiltro) {
        const { data } = await chatApi.get(
          "/clientes_chat_center/listar_por_etiqueta",
          {
            params: { ...paramsBase, ids: String(idEtiquetaFiltro) },
          },
        );
        dataResp = data;
      } else {
        const { data } = await chatApi.get("/clientes_chat_center/listar", {
          params: paramsBase,
        });
        dataResp = data;
      }

      const rows = Array.isArray(dataResp?.data)
        ? dataResp.data
        : Array.isArray(dataResp)
          ? dataResp
          : [];
      const mapped = rows.map(mapRow);

      let mappedFiltered = mapped;

      if (phoneLike) {
        mappedFiltered = mapped.filter((c) => {
          const t1 = normalizePhone(c.telefono || "");
          const t2 = normalizePhone(c.telefono_limpio || "");
          return t1.includes(qPhone) || t2.includes(qPhone);
        });
      } else if (qOriginal?.trim()) {
        mappedFiltered = mapped.filter((c) => matchesFullName(c, qOriginal));
      }

      const tot = dataResp?.total ?? undefined;

      const cfgs = Array.from(
        new Set(mappedFiltered.map((r) => r.id_configuracion).filter(Boolean)),
      );
      if (!idConfigForTags && cfgs.length) setIdConfigForTags(cfgs[0]);
      await cargarCatalogosSiFaltan(cfgs);

      const withTags = await anexarEtiquetasAsignadas(mappedFiltered);

      setItems((prev) => (replace ? withTags : [...prev, ...withTags]));
      setPage(p);

      const effectiveTotalKnown = typeof tot === "number" && !phoneLike;
      setHasMore(
        effectiveTotalKnown ? p * LIMIT < tot : withTags.length === LIMIT,
      );
      setTotal(effectiveTotalKnown ? tot : undefined);
    } catch (e) {
      swalError(
        "No se pudo listar clientes",
        e?.response?.data?.message || e.message,
      );
    } finally {
      setLoading(false);
    }
  }

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

  async function crearEtiquetas(lista, color) {
    let cfg = idConfigForTags;
    if (!cfg) {
      const first = items[0];
      cfg = first?.id_configuracion;
    }
    if (!cfg) {
      await swalInfo(
        "No disponible",
        "No hay id_configuracion para crear etiquetas.",
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
        },
      );
      const arr = Array.isArray(data?.etiquetas) ? data.etiquetas : [];
      setCatalogosPorCfg((prev) => ({ ...prev, [Number(cfg)]: arr }));
    } catch (e) {
      console.error(
        "REFRESH CATALOGO POST-CREAR:",
        e?.response?.data || e.message,
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
      new Set(items.map((r) => r.id_configuracion).filter(Boolean)),
    );
    await cargarCatalogosSiFaltan(cfgs);
    await apiList(page, true);
    await cargarOpcionesFiltroEtiquetas();
  }

  /**
   * NUEVO: refrescar etiquetas de un subconjunto de clientes usando
   * clientes_chat_center/etiquetas/multiples en una sola llamada.
   */
  async function refrescarEtiquetasDeClientes(idsClientes) {
    if (!idsClientes?.length) return;
    try {
      const { data } = await chatApi.post(
        "clientes_chat_center/etiquetas/multiples",
        {
          ids: idsClientes,
          id_configuracion,
        },
      );
      const mapa = data?.etiquetas || {};

      setItems((prev) =>
        prev.map((c) => {
          const id = getId(c);
          if (!idsClientes.includes(id)) return c;
          const raw = mapa[id] || mapa[String(id)] || [];
          const etiquetasLimpias = (Array.isArray(raw) ? raw : []).map((e) => ({
            id: e.id_etiqueta ?? e.id,
            nombre: e.nombre || e.nombre_etiqueta || `#${e.id_etiqueta}`,
            color: e.color || e.color_etiqueta,
          }));
          return { ...c, etiquetas: etiquetasLimpias };
        }),
      );
    } catch (e) {
      console.warn("REFRESH TAGS múltiples:", e?.response?.data || e.message);
    }
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
          (counts.get(c.id_configuracion) || 0) + 1,
        );
      }
      if (counts.size)
        cfg = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0][0];
    }
    if (!cfg) cfg = items[0]?.id_configuracion || idConfigForTags;
    if (!cfg) {
      await swalInfo(
        "Sin datos",
        "No hay clientes para determinar id_configuracion.",
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

    const idTimeout = setTimeout(() => {
      apiList(1, true);
    }, 250);

    return () => clearTimeout(idTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, estado, orden, pageSize, idEtiquetaFiltro]);

  /* Selección */
  const allSelected = useMemo(() => {
    const ids = items.map(getId).filter(Boolean);
    return ids.length > 0 && ids.every((id) => selected.includes(id));
  }, [items, selected]);
  const toggleSelectAll = (v) =>
    setSelected(v ? items.map(getId).filter(Boolean) : []);
  const toggleSelect = (id) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  async function apiDelete(id) {
    await chatApi.delete(`/clientes_chat_center/eliminar/${id}`);
  }

  async function onDeleteSelected() {
    if (!selected.length) return;
    const ok = await swalConfirm(
      "Eliminar clientes",
      `¿Eliminar ${selected.length} cliente(s) seleccionados?`,
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

  /*Exportar XLSX */
  function exportXLSX() {
    if (!items.length) {
      swalInfo("Sin datos", "No hay clientes para exportar.");
      return;
    }

    const rows = items.map((c) => ({
      Nombre: c.nombre || "",
      Apellido: c.apellido || "",
      Email: c.email || "",
      Telefono: c.telefono || "",
      Estado: c.estado ? 1 : 0,
      IdEtiqueta: c.id_etiqueta ?? "",
      Creado: c.createdAt || "",
      UltActividad: c.ultima_actividad || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");
    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clientes_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    swalToast("XLSX exportado");
  }

  useEffect(() => {
    if (isModalOpenMasivo) {
      resetNumeroModalState();
    }
  }, [isModalOpenMasivo]);

  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (!headerFileMasivo) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(headerFileMasivo);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [headerFileMasivo]);

  const [programarMasivo, setProgramarMasivo] = useState(false);
  const [fechaHoraProgramada, setFechaHoraProgramada] = useState(""); // datetime-local
  const [timezoneProgramada, setTimezoneProgramada] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Guayaquil",
  );

  const formatearFechaProgramadaSQL = (value) => {
    if (!value) return null; // value = "2026-02-22T22:03"
    return `${value.replace("T", " ")}:00`;
  };

  const construirComponentsTemplateMasivo = (recipient) => {
    const components = [];

    // HEADER TEXT
    if (headerRequired && headerFormat === "TEXT") {
      const headerParams = (headerPlaceholders || []).map((ph) => {
        const raw = headerPlaceholderValues[ph] || "";
        const value = resolverVariableMasiva(raw, recipient, ph);
        return { type: "text", text: String(value) };
      });

      if (headerParams.length > 0) {
        components.push({
          type: "header",
          parameters: headerParams,
        });
      }
    }

    // BODY
    components.push({
      type: "body",
      parameters: (placeholders || []).map((ph) => {
        const key = `body_${ph}`;
        const raw = placeholderValues[key] || "";
        const value = resolverVariableMasiva(raw, recipient, ph);
        return { type: "text", text: String(value) };
      }),
    });

    // BUTTONS URL
    if (urlButtons.length > 0) {
      const byIndex = new Map();

      urlButtons.forEach((b) => {
        if (!byIndex.has(b.index)) byIndex.set(b.index, []);
        byIndex.get(b.index).push(b);
      });

      for (const [index, btnPlaceholders] of byIndex.entries()) {
        const params = btnPlaceholders.map((b) => {
          const raw = placeholderValues[b.key] || "";
          const value = resolverVariableMasiva(raw, recipient, b.ph);
          return { type: "text", text: String(value) };
        });

        components.push({
          type: "button",
          sub_type: "url",
          index: String(index),
          parameters: params,
        });
      }
    }

    return components;
  };

  const validarHeaderMasivoAntesDeEnviarOProgramar = () => {
    const headerIsMedia =
      headerRequired && ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerFormat);

    const hasDefaultHeaderAssetMasivo =
      !!useDefaultHeaderAssetMasivo && !!headerDefaultAssetMasivo?.url;

    if (headerIsMedia && !headerFileMasivo && !hasDefaultHeaderAssetMasivo) {
      swalInfo(
        "Header requerido",
        `Este template requiere un archivo de header (${headerFormat}) o usar el adjunto predeterminado.`,
      );
      return { ok: false, headerIsMedia, hasDefaultHeaderAssetMasivo };
    }

    return { ok: true, headerIsMedia, hasDefaultHeaderAssetMasivo };
  };

  const programarTemplateMasivo = async () => {
    try {
      if (!dataAdmin) {
        swalInfo(
          "Config pendiente",
          "No hay datos de configuración de WhatsApp cargados.",
        );
        return;
      }

      if (!selected || selected.length === 0) {
        swalInfo("Sin seleccionados", "Seleccione al menos un destinatario.");
        return;
      }

      if (!templateReady) {
        swalInfo(
          "Template incompleto",
          "Complete los campos requeridos del template antes de programar.",
        );
        return;
      }

      if (!fechaHoraProgramada) {
        swalInfo("Fecha y hora", "Seleccione fecha y hora para programar.");
        return;
      }

      if (!programarMasivo) {
        return enviarTemplateMasivo();
      }

      const fecha_programada = formatearFechaProgramadaSQL(fechaHoraProgramada);

      const { ok, headerIsMedia, hasDefaultHeaderAssetMasivo } =
        validarHeaderMasivoAntesDeEnviarOProgramar();

      if (!ok) return;

      // Validación básica frontend (evita programar vacío/fecha mala)
      const testDate = new Date(fechaHoraProgramada);
      if (Number.isNaN(testDate.getTime())) {
        swalInfo("Fecha inválida", "La fecha u hora no es válida.");
        return;
      }

      // (Opcional pero recomendado) evitar programar en pasado local
      if (testDate.getTime() < Date.now() - 30 * 1000) {
        const okPast = await Swal.fire({
          icon: "question",
          title: "Hora en el pasado",
          text: "La fecha/hora seleccionada parece estar en el pasado. ¿Desea continuar?",
          showCancelButton: true,
          confirmButtonText: "Sí, continuar",
          cancelButtonText: "Cancelar",
        });
        if (!okPast.isConfirmed) return;
      }

      const id_configuracion =
        Number(localStorage.getItem("id_configuracion")) || null;

      if (!id_configuracion) {
        swalInfo("Configuración", "No se encontró id_configuracion.");
        return;
      }

      Swal.fire({
        title: "Programando envío...",
        html: "Guardando lote para envío programado.",
        didOpen: () => Swal.showLoading(),
        allowOutsideClick: false,
      });

      // ========= Armar body_json base (igual que envío inmediato) =========
      // El backend puede extraer placeholders desde graphBody/body_json
      const recipientEjemplo =
        items.find((item) => item.id === selected[0]) || null;

      const componentsEjemplo = recipientEjemplo
        ? construirComponentsTemplateMasivo(recipientEjemplo)
        : [
            {
              type: "body",
              parameters: (placeholders || []).map((ph) => ({
                type: "text",
                text: String(placeholderValues[`body_${ph}`] || ""),
              })),
            },
          ];

      const body_json = {
        messaging_product: "whatsapp",
        to: recipientEjemplo?.telefono_limpio || "0000000000", // solo referencia para parseo backend
        type: "template",
        template: {
          name: templateName,
          language: { code: selectedLanguage || "es" },
          components: componentsEjemplo,
        },
      };

      // ========= Caso con archivo manual => multipart =========
      if (headerIsMedia && headerFileMasivo) {
        const fd = new FormData();

        fd.append("selected", JSON.stringify(selected));
        fd.append("id_configuracion", String(id_configuracion));
        if (userData?.id_usuario)
          fd.append("id_usuario", String(userData.id_usuario));

        // opcionales (backend igual revalida desde BD)
        if (dataAdmin?.telefono)
          fd.append("telefono_configuracion", String(dataAdmin.telefono));
        if (dataAdmin?.id_telefono)
          fd.append("business_phone_id", String(dataAdmin.id_telefono));
        if (dataAdmin?.waba_id) fd.append("waba_id", String(dataAdmin.waba_id));

        fd.append("nombre_template", String(templateName || ""));
        fd.append("language_code", String(selectedLanguage || "es"));

        fd.append("template_parameters", JSON.stringify([]));
        // Deje [] para que backend use graphBody/body_json si quiere extraer;
        // si prefiere enviar resuelto fijo para todos, aquí podría armar array simple.

        if (headerFormat) fd.append("header_format", String(headerFormat));

        // Si header TEXT, mandar valores base (no usualmente en media)
        if (headerFormat === "TEXT") {
          const hp = (headerPlaceholders || []).map(
            (ph) => headerPlaceholderValues[ph] || "",
          );
          fd.append("header_parameters", JSON.stringify(hp));
        }

        fd.append("fecha_programada", fecha_programada);
        fd.append("timezone", timezoneProgramada || "America/Guayaquil");

        fd.append(
          "meta",
          JSON.stringify({
            origen: "clientes_modal_masivo",
            totalSeleccionados: selected.length,
            modo: "programado",
          }),
        );

        fd.append("body_json", JSON.stringify(body_json));

        // archivo manual header
        fd.append("header_file", headerFileMasivo);

        const { data } = await chatApi.post(
          "/whatsapp_managment/programar_template_masivo",
          fd,
          { headers: { "Content-Type": "multipart/form-data" } },
        );

        Swal.close();

        if (!data?.ok) {
          throw new Error(data?.msg || "No se pudo programar el envío");
        }

        await Swal.fire({
          icon: "success",
          title: "Envío programado",
          html: `
    <div style="text-align:left;font-size:13px;line-height:1.4">
      <div><b>Lote:</b> ${data?.data?.uuid_lote || "-"}</div>
      <div><b>Programados:</b> ${data?.data?.total_programados ?? 0}</div>
      <div><b>Fecha:</b> ${data?.data?.fecha_programada || fecha_programada}</div>
      <div><b>Zona horaria:</b> ${data?.data?.timezone || timezoneProgramada}</div>
    </div>
  `,
          confirmButtonText: "OK",
        });

        closeModal(); // o setIsModalOpenMasivo(false)
        return;
      }

      // ========= Caso JSON (sin archivo manual; puede usar asset predeterminado) =========
      const payload = {
        selected,
        id_configuracion,
        id_usuario: userData?.id_usuario || null,

        // opcionales (backend prioriza DB)
        telefono_configuracion: dataAdmin?.telefono || null,
        business_phone_id: dataAdmin?.id_telefono || null,
        waba_id: dataAdmin?.waba_id || null,

        nombre_template: templateName,
        language_code: selectedLanguage || "es",

        // Si usted quiere que backend extraiga desde body_json, puede mandar []
        // Si quiere control fino explícito, mande los del primer recipient o valores fijos.
        template_parameters: [],

        header_format: headerFormat || null,
        header_parameters:
          headerFormat === "TEXT"
            ? (headerPlaceholders || []).map(
                (ph) => headerPlaceholderValues[ph] || "",
              )
            : null,

        // Si usa asset predeterminado en templates media
        header_default_asset:
          headerIsMedia && hasDefaultHeaderAssetMasivo
            ? {
                enabled: true,
                format: headerFormat,
                url: headerDefaultAssetMasivo.url,
                source: headerDefaultAssetMasivo.source || "template_example",
                name:
                  headerDefaultAssetMasivo.name ||
                  "Adjunto predeterminado del template",
              }
            : null,

        // Compatibilidad directa si backend usa estos planos
        header_media_url:
          headerIsMedia && hasDefaultHeaderAssetMasivo
            ? headerDefaultAssetMasivo.url
            : null,
        header_media_name:
          headerIsMedia && hasDefaultHeaderAssetMasivo
            ? headerDefaultAssetMasivo.name ||
              "Adjunto predeterminado del template"
            : null,

        fecha_programada,
        timezone: timezoneProgramada || "America/Guayaquil",

        meta: {
          origen: "clientes_modal_masivo",
          totalSeleccionados: selected.length,
          modo: "programado",
        },

        //Muy útil para que backend extraiga placeholders y header
        body_json: JSON.stringify(body_json),
      };

      const { data } = await chatApi.post(
        "/whatsapp_managment/programar_template_masivo",
        payload,
      );

      Swal.close();

      if (!data?.ok) {
        throw new Error(data?.msg || "No se pudo programar el envío");
      }

      await Swal.fire({
        icon: "success",
        title: "Envío programado",
        html: `
    <div style="text-align:left;font-size:13px;line-height:1.4">
      <div><b>Lote:</b> ${data?.data?.uuid_lote || "-"}</div>
      <div><b>Programados:</b> ${data?.data?.total_programados ?? 0}</div>
      <div><b>Fecha:</b> ${data?.data?.fecha_programada || fecha_programada}</div>
      <div><b>Zona horaria:</b> ${data?.data?.timezone || timezoneProgramada}</div>
    </div>
  `,
        confirmButtonText: "OK",
      });

      closeModal(); // o setIsModalOpenMasivo(false)
    } catch (err) {
      Swal.close();
      swalError(
        "No se pudo programar el envío",
        err?.response?.data?.msg || err?.response?.data?.error || err?.message,
      );
    }
  };

  const [activeTab, setActiveTab] = useState("contactos");

  return (
    <div className="flex h-[calc(100vh-48px)] flex-col rounded-xl border border-slate-200 bg-slate-50/70 text-slate-800 shadow-sm p-5">
      {/* ====== Header principal ====== */}
      <PageHeader
        title="Contactos y programación de envíos"
        subtitle="Gestiona tus contactos, etiquetas y envíos masivos por WhatsApp."
        icon={<i className="bx bx-user" />}
        actions={[
          {
            label: "Nuevo contacto",
            icon: <i className="bx bx-plus text-base" />,
            onClick: openModalNuevoContact,
            variant: "primary",
          },
          {
            label: "Envío masivo",
            icon: <i className="bx bxs-message-alt-detail text-base" />,
            onClick: openModalMasivos,
            disabled: !selected.length,
            variant: "success",
          },
          { type: "divider" },
          {
            label: "Importar XLSX",
            icon: <i className="bx bx-upload text-sm" />,
            onClick: () => setOpenImportXlsx(true),
            variant: "ghost",
            size: "sm",
          },
          {
            label: "Exportar XLSX",
            icon: <i className="bx bx-download text-sm" />,
            onClick: exportXLSX,
            variant: "ghost",
            size: "sm",
          },
        ]}
      />

      <div className="flex items-center gap-6 border-b border-slate-200 px-4 mt-4">
        <button
          onClick={() => setActiveTab("contactos")}
          className={`pb-3 text-sm font-medium transition ${
            activeTab === "contactos"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Contactos
        </button>

        <button
          onClick={() => setActiveTab("programados")}
          className={`pb-3 text-sm font-medium transition ${
            activeTab === "programados"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Mensajes Programados
        </button>
      </div>

      {activeTab === "contactos" && (
        <>
          {/* ====== Subtoolbar (buscador + columnas) ====== */}
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white/70 px-4 py-3 backdrop-blur-sm">
            <div className="relative flex-1 min-w-[240px] max-w-[520px]">
              <i className="bx bx-search absolute left-3 top-2.5 text-slate-500" />
              <input
                className="w-full rounded-md border border-slate-200 bg-white px-9 py-2 text-sm text-slate-800 outline-none ring-1 ring-transparent transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200/60"
                placeholder="Buscar por nombre, apellido o teléfono…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>

          {/* ====== Filtros ====== */}
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/80 px-4 py-2 text-xs">
            <div className="flex items-center gap-2">
              {["todos", "1", "0"].map((e) => (
                <button
                  key={e}
                  onClick={() => setEstado(e)}
                  className={`rounded-full border px-3 py-1 transition text-xs ${
                    estado === e
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  {e === "todos"
                    ? "Todos"
                    : e === "1"
                      ? "Activos"
                      : "Inactivos"}
                </button>
              ))}
            </div>

            <div className="ml-3 flex items-center gap-2">
              <TagSelect
                options={opcionesFiltroEtiquetas}
                value={idEtiquetaFiltro}
                onChange={setIdEtiquetaFiltro}
                disabled={false}
                unavailable={false}
              />

              <select
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                value={orden}
                onChange={(e) => setOrden(e.target.value)}
                title="Orden"
              >
                <option value="recientes">Más recientes</option>
                <option value="antiguos">Más antiguos</option>
                <option value="actividad_desc">Actividad (desc)</option>
                <option value="actividad_asc">Actividad (asc)</option>
              </select>

              <button
                onClick={() => {
                  setQ("");
                  setEstado("todos");
                  setIdEtiquetaFiltro("");
                  setOrden("recientes");
                }}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 transition"
              >
                <i className="bx bx-reset text-sm" />
                Limpiar
              </button>

              {/* TAGS acciones rápidas */}
              <div className="ml-4 flex items-center gap-1">
                <Tooltip label="Asignar etiquetas a seleccionados">
                  <button
                    className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                    onClick={() => ensureCatalogAndOpen("asignar")}
                    disabled={!selected.length}
                  >
                    <i className="bx bxs-purchase-tag-alt text-[16px]" />
                  </button>
                </Tooltip>
                <Tooltip label="Quitar etiquetas a seleccionados">
                  <button
                    className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                    onClick={() => ensureCatalogAndOpen("quitar")}
                    disabled={!selected.length}
                  >
                    <i className="bx bxs-minus-circle text-[16px]" />
                  </button>
                </Tooltip>
                <Tooltip label="Crear nueva etiqueta">
                  <button
                    className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    onClick={() => ensureCatalogAndOpen("crear")}
                  >
                    <i className="bx bxs-plus-circle text-[16px]" />
                  </button>
                </Tooltip>
              </div>

              {/* Eliminar */}
              <Tooltip label="Eliminar clientes seleccionados">
                <button
                  disabled={!selected.length}
                  onClick={onDeleteSelected}
                  className="ml-2 inline-flex items-center justify-center h-8 w-8 rounded-full border border-red-100 bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-40"
                >
                  <i className="bx bxs-trash-alt text-[16px]" />
                </button>
              </Tooltip>
            </div>
          </div>

          <TablaContactos
            items={items}
            selected={selected}
            toggleSelect={toggleSelect}
            allSelected={allSelected}
            toggleSelectAll={toggleSelectAll}
            cols={cols}
            SortButton={SortButton}
            orden={orden}
            loading={loading}
            hasMore={hasMore}
            getId={getId}
            initials={initials}
            getDisplayContact={getDisplayContact}
            fmtDate={fmtDate}
            fmtTime={fmtTime}
            timeAgo={timeAgo}
            fmtDateTime={fmtDateTime}
            openChatById={openChatById}
            closeRowMenu={closeRowMenu}
            setSelected={setSelected}
            setIdConfigForTags={setIdConfigForTags}
            ensureCatalogAndOpen={ensureCatalogAndOpen}
            Chip={Chip}
            swalToast={swalToast}
            swalConfirm={swalConfirm}
            swalClose={swalClose}
            swalError={swalError}
            swalLoading={swalLoading}
            idConfigForTags={idConfigForTags}
            setOrden={setOrden}
            cargarOpcionesFiltroEtiquetas={cargarOpcionesFiltroEtiquetas}
            apiDelete={apiDelete}
            mapRow={mapRow}
            setItems={setItems}
          />

          {/* ===== Footer de paginación (MOVIDO ABAJO) ===== */}
          <div className="flex items-center justify-between border-t border-slate-200 bg-white/80 px-4 py-2 text-xs">
            <span className="text-slate-600">
              {typeof total === "number"
                ? `Total ${total} clientes`
                : `Mostrando ${items.length}`}
              {items.length > 0 &&
                ` · Página ${page} de ${
                  typeof total === "number"
                    ? Math.max(1, Math.ceil(total / LIMIT))
                    : "—"
                }`}
            </span>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-slate-500">Tamaño</span>
                <select
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
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
                  className="rounded-l-md border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:opacity-40"
                  disabled={page <= 1 || loading}
                  onClick={() => apiList(page - 1, true)}
                  title="Anterior"
                >
                  <i className="bx bx-chevron-left" />
                </button>
                <button
                  className="rounded-r-md border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:opacity-40"
                  disabled={!hasMore || loading}
                  onClick={() => apiList(page + 1, true)}
                  title="Siguiente"
                >
                  <i className="bx bx-chevron-right" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === "programados" && <Programados />}

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
      <ImportarXlsxModal
        open={openImportXlsx}
        onClose={() => setOpenImportXlsx(false)}
        chatApi={chatApi}
        apiList={apiList}
        cargarOpcionesFiltroEtiquetas={cargarOpcionesFiltroEtiquetas}
      />
      <NuevoContacto
        isOpen={isModalOpenNuevoContact}
        closeModal={closeModalNuevoContact}
        nuevoTelefonoContacto={nuevoTelefonoContacto}
        setNuevoTelefonoContacto={setNuevoTelefonoContacto}
        nuevoNombreContacto={nuevoNombreContacto}
        setNuevoNombreContacto={setNuevoNombreContacto}
        nuevoApellidoContacto={nuevoApellidoContacto}
        setNuevoApellidoContacto={setNuevoApellidoContacto}
        guardarNuevoContacto={guardarNuevoContacto}
      />
      <EnviarTemplateMasivo
        isOpen={isModalOpenMasivo}
        closeModal={closeModal}
        selected={selected}
        templates={templates}
        headerRequired={headerRequired}
        headerFormat={headerFormat}
        headerPlaceholders={headerPlaceholders}
        headerPlaceholderValues={headerPlaceholderValues}
        setHeaderPlaceholderValues={setHeaderPlaceholderValues}
        headerDefaultAssetMasivo={headerDefaultAssetMasivo}
        headerFileMasivo={headerFileMasivo}
        setHeaderFileMasivo={setHeaderFileMasivo}
        useDefaultHeaderAssetMasivo={useDefaultHeaderAssetMasivo}
        setUseDefaultHeaderAssetMasivo={setUseDefaultHeaderAssetMasivo}
        previewUrl={previewUrl}
        programarMasivo={programarMasivo}
        fechaHoraProgramada={fechaHoraProgramada}
        timezoneProgramada={timezoneProgramada}
        setProgramarMasivo={setProgramarMasivo}
        setFechaHoraProgramada={setFechaHoraProgramada}
        setTimezoneProgramada={setTimezoneProgramada}
        loadingTemplates={loadingTemplates}
        customSelectStyles={customSelectStyles}
        templateText={templateText}
        handleTextareaChange={handleTextareaChange}
        handlePlaceholderChange={handlePlaceholderChange}
        placeholders={placeholders}
        placeholderValues={placeholderValues}
        templateReady={templateReady}
        enviarTemplateMasivo={enviarTemplateMasivo}
        programarTemplateMasivo={programarTemplateMasivo}
        abrirModalTemplates={abrirModalTemplates}
        handleTemplateSelect={handleTemplateSelect}
        PreviewFile={PreviewFile}
        swalToast={swalToast}
      />
    </div>
  );
}
