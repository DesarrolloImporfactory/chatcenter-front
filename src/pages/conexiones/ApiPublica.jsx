import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";
import CopyBtn from "../../components/admin/dashboard/shared/CopyBtn";

/* ─────────────────────────────────────────────────────────────
   API para desarrolladores. Dos pestañas:
   · Mis llaves — crear (con permisos), ver y revocar.
   · Documentación — la espec completa copiable + endpoints.
   ───────────────────────────────────────────────────────────── */

// Mismo host que el API del panel, pero bajo /api/public/v1
const BASE_PUBLICA = String(chatApi.defaults.baseURL || "")
  .replace(/\/+$/, "")
  .replace(/\/api\/v1$/, "/api/public/v1");

/* Permisos de escritura que puede llevar una llave. La lectura va siempre. */
const SCOPES_ESCRITURA = [
  {
    scope: "bot:write",
    icon: "bx-bot",
    titulo: "Editar el bot",
    desc: "Leer y modificar los prompts de cada columna del kanban.",
  },
  {
    scope: "flujos:write",
    icon: "bx-git-branch",
    titulo: "Editar flujos",
    desc: "Modificar las secuencias de remarketing de cada etapa.",
  },
  {
    scope: "plantillas:write",
    icon: "bx-message-square-detail",
    titulo: "Editar plantillas",
    desc: "Crear/editar atajos del chat y plantillas de WhatsApp.",
  },
  {
    scope: "mensajes:write",
    icon: "bx-send",
    titulo: "Enviar mensajes",
    desc: "Enviar plantillas aprobadas (incluso a números que nunca escribieron) y fotos/videos a chats abiertos.",
  },
];

const METODO_BADGE = {
  GET: "text-emerald-700 bg-emerald-50 border-emerald-200",
  PUT: "text-amber-700 bg-amber-50 border-amber-200",
  POST: "text-sky-700 bg-sky-50 border-sky-200",
  DELETE: "text-rose-700 bg-rose-50 border-rose-200",
};

const ENDPOINTS = [
  {
    path: "/ping",
    titulo: "Verificar la llave",
    desc: "Confirma que la llave funciona y a qué conexión apunta.",
    rango: false,
  },
  {
    path: "/todo",
    titulo: "Todo de una vez",
    desc: "Resumen + Dropi + Anuncios + Tablero en una sola llamada. Lo más eficiente para sincronizar.",
    rango: true,
    destacado: true,
  },
  {
    path: "/resumen",
    titulo: "Resumen del periodo",
    desc: "Los KPIs del dashboard: ventas y pedidos netos, facturación, ganancia, tasa de entrega, conversaciones, % de confirmación y carritos abandonados.",
    rango: true,
  },
  {
    path: "/dropi",
    titulo: "Operación Dropi",
    desc: "Estado de los pedidos, productos vendidos y serie día por día.",
    rango: true,
  },
  {
    path: "/ads",
    titulo: "Anuncios Meta",
    desc: "Embudo publicitario y atribución anuncio → orden: gasto, ROAS, CPA.",
    rango: true,
  },
  {
    path: "/tablero",
    titulo: "Tablero en vivo",
    desc: "Cuántos clientes hay ahora en cada columna del kanban.",
    rango: false,
  },
];

/* Endpoints de configuración, agrupados por recurso para que la doc se lea
   como "qué puedes administrar" y no como una lista plana. */
const ENDPOINTS_CONFIG = [
  {
    grupo: "bot",
    metodo: "GET",
    path: "/bot",
    scope: "read",
    desc: "Columnas del kanban con su prompt (instrucciones) y si el asistente de ventas está activo.",
  },
  {
    grupo: "bot",
    metodo: "PUT",
    path: "/bot/columnas/:id",
    scope: "bot:write",
    desc: "Reemplaza el prompt de una columna. Devuelve el prompt anterior (respaldo) y rechaza textos que pierdan los tags de acción.",
    body: `{ "instrucciones": "AGENTE Alex..." }`,
  },
  {
    grupo: "flujos",
    metodo: "GET",
    path: "/flujos",
    scope: "read",
    desc: "Etapas del tablero + secuencias de remarketing por columna.",
  },
  {
    grupo: "flujos",
    metodo: "PUT",
    path: "/flujos/remarketing/:estado",
    scope: "flujos:write",
    desc: "Reemplaza la secuencia completa de esa columna (1 a 5 pasos).",
    body: `{ "secuencias": [{ "tiempo_espera_minutos": 240, "nombre_template": "recordatorio_1", "metodo_dentro_24h": "ia", "prompt_ia": "...", "estado_destino": "pendiente_confirmacion" }] }`,
  },
  {
    grupo: "rapidas",
    metodo: "GET",
    path: "/respuestas-rapidas",
    scope: "read",
    desc: "Atajos del chat (respuestas rápidas).",
  },
  {
    grupo: "rapidas",
    metodo: "POST",
    path: "/respuestas-rapidas",
    scope: "plantillas:write",
    desc: "Crea un atajo de texto.",
    body: `{ "atajo": "envio_gratis", "mensaje": "El envío es gratis y pagas al recibir" }`,
  },
  {
    grupo: "rapidas",
    metodo: "PUT",
    path: "/respuestas-rapidas/:id",
    scope: "plantillas:write",
    desc: "Edita el mensaje de un atajo de texto.",
    body: `{ "mensaje": "Nuevo texto" }`,
  },
  {
    grupo: "rapidas",
    metodo: "DELETE",
    path: "/respuestas-rapidas/:id",
    scope: "plantillas:write",
    desc: "Elimina un atajo.",
  },
  {
    grupo: "mensajes",
    metodo: "GET",
    path: "/conversaciones?telefono=573001234567",
    scope: "read",
    desc: "Busca la conversación por teléfono (cualquier formato). Devuelve chat_id, columna del kanban y si está dentro de la ventana de 24h.",
  },
  {
    grupo: "mensajes",
    metodo: "GET",
    path: "/conversaciones/:chat_id/mensajes",
    scope: "read",
    desc: "Mensajes del chat (paginados con ?limit y ?antes_de_id). Las notas de voz traen el campo `transcripcion` cuando el bot la generó al recibirlas.",
  },
  {
    grupo: "mensajes",
    metodo: "POST",
    path: "/mensajes/plantilla",
    scope: "mensajes:write",
    desc: "Envía una plantilla aprobada por Meta a cualquier número — si nunca escribió, crea el chat. Soporta imagen en el header (header_media_url) y variables que desbordan a los botones URL dinámicos.",
    body: `{ "telefono": "573001234567", "nombre_template": "confirmacion_pedido", "template_parameters": ["Daniel", "PED-1042"], "header_media_url": "https://cdn.midominio.com/banner.jpg", "nombre": "Daniel" }`,
  },
  {
    grupo: "mensajes",
    metodo: "POST",
    path: "/mensajes/media",
    scope: "mensajes:write",
    desc: "Envía foto o video (URL https pública) a un chat dentro de la ventana de 24h. Fuera de ventana Meta solo acepta plantillas.",
    body: `{ "chat_id": 12345, "tipo": "image", "url": "https://cdn.midominio.com/producto.jpg", "caption": "Así se ve en rojo" }`,
  },
  {
    grupo: "meta",
    metodo: "GET",
    path: "/plantillas-meta",
    scope: "read",
    desc: "Plantillas de WhatsApp de la cuenta con su estado de aprobación.",
  },
  {
    grupo: "meta",
    metodo: "POST",
    path: "/plantillas-meta",
    scope: "plantillas:write",
    desc: "Crea una plantilla en Meta (texto y botones; las de imagen/video van por el panel). La aprobación la decide Meta.",
    body: `{ "name": "recordatorio_pago", "language": "es", "category": "UTILITY", "components": [{ "type": "BODY", "text": "Hola {{1}}, tu pedido está listo.", "example": { "body_text": [["Daniel"]] } }] }`,
  },
];

const GRUPOS_CONFIG = [
  {
    id: "bot",
    icon: "bx-bot",
    titulo: "Bot / IA",
    desc: "Los prompts que gobiernan al asistente en cada columna.",
    scope: "bot:write",
  },
  {
    id: "flujos",
    icon: "bx-git-branch",
    titulo: "Flujos",
    desc: "Las secuencias de remarketing de cada etapa del tablero.",
    scope: "flujos:write",
  },
  {
    id: "rapidas",
    icon: "bx-message-square-dots",
    titulo: "Respuestas rápidas",
    desc: "Los atajos de texto que usa el equipo en el chat.",
    scope: "plantillas:write",
  },
  {
    id: "meta",
    icon: "bxl-whatsapp",
    titulo: "Plantillas de WhatsApp",
    desc: "Las plantillas aprobadas por Meta de la cuenta.",
    scope: "plantillas:write",
  },
  {
    id: "mensajes",
    icon: "bx-send",
    titulo: "Mensajería",
    desc: "Buscar chats por teléfono, leer mensajes (con transcripción de audios) y enviar plantillas o media.",
    scope: "mensajes:write",
  },
];

/* Especificación completa en texto: el cliente la copia y se la pasa a su
   desarrollador (o la pega en su IA) sin transcribir nada. */
const especCompleta = () =>
  [
    `# API ImporChat — especificación para integrar`,
    ``,
    `Base URL: ${BASE_PUBLICA}`,
    `Autenticación: header "Authorization: Bearer <API_KEY>" en cada petición.`,
    `La llave define la conexión: nunca se envía id_configuracion.`,
    `Límite: 60 peticiones/minuto por llave. Respuestas en JSON.`,
    `Permisos por llave (scopes): read (todos los GET), bot:write, flujos:write, plantillas:write, mensajes:write. Sin el scope, la escritura responde 403.`,
    ``,
    `## Métricas (GET, scope read)`,
    ...ENDPOINTS.map(
      (e) =>
        `- GET ${e.path}${e.rango ? " (acepta ?from=YYYY-MM-DD&until=YYYY-MM-DD)" : ""} — ${e.titulo}: ${e.desc}`,
    ),
    ``,
    `## Configuración (lectura y escritura)`,
    ...ENDPOINTS_CONFIG.map((e) =>
      [
        `- ${e.metodo} ${e.path} (scope ${e.scope}) — ${e.desc}`,
        e.body ? `  Body: ${e.body}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    ),
    ``,
    `## Notas`,
    `- Toda escritura queda auditada con el valor anterior (reversible por soporte). Los envíos también se auditan (plantilla, número, wamid).`,
    `- Envíos: máximo 20 por minuto por llave. Fuera de la ventana de 24h (el cliente no escribe hace más de 24h) Meta solo acepta plantillas aprobadas: /mensajes/media responde 422 y hay que usar /mensajes/plantilla.`,
    `- Teléfonos: se aceptan con o sin código de país (se completa con el país de la conexión). GET /conversaciones los encuentra en cualquier formato.`,
    `- Transcripción de audios: se genera al RECIBIR la nota de voz, solo en chats con el bot activo. Audios anteriores o de chats con bot apagado vienen con transcripcion = null.`,
    `- 429/500: reintentar con espera exponencial. 400/401/403: corregir la petición o pedir una llave con el scope.`,
  ].join("\n");

/* Nombre legible de un recurso auditado. */
const recursoLegible = (recurso = "", accion = "") => {
  if (accion === "revert") {
    const m = recurso.match(/#(\d+)/);
    return `Reversión del cambio ${m ? `#${m[1]}` : ""}`.trim();
  }
  let m = recurso.match(/^bot\.columna\.(\d+)$/);
  if (m) return `Prompt de la columna #${m[1]}`;
  m = recurso.match(/^flujos\.remarketing\.(.+)$/);
  if (m) return `Remarketing de "${m[1]}"`;
  m = recurso.match(/^rapidas\.(.+)$/);
  if (m) return `Respuesta rápida "${m[1]}"`;
  m = recurso.match(/^plantillas_meta\.(.+)$/);
  if (m) return `Plantilla de WhatsApp "${m[1]}"`;
  m = recurso.match(/^mensajes\.plantilla\.(.+)$/);
  if (m) return `Plantilla enviada al ${m[1]}`;
  m = recurso.match(/^mensajes\.media\.(\d+)$/);
  if (m) return `Foto/video al chat #${m[1]}`;
  return recurso;
};

const ACCION_BADGE = {
  update: "text-amber-700 bg-amber-50 border-amber-200",
  create: "text-sky-700 bg-sky-50 border-sky-200",
  delete: "text-rose-700 bg-rose-50 border-rose-200",
  revert: "text-emerald-700 bg-emerald-50 border-emerald-200",
  send: "text-indigo-700 bg-indigo-50 border-indigo-200",
  send_error: "text-rose-700 bg-rose-50 border-rose-200",
};

const ACCION_LABEL = {
  update: "editó",
  create: "creó",
  delete: "eliminó",
  revert: "reversión",
  send: "envió",
  send_error: "envío fallido",
};

const fmtFecha = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("es-EC", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
};

/* Bloque de código con botón de copiar */
function Snippet({ code, lang = "bash", maxH = null }) {
  return (
    <div className="relative group">
      <pre
        className="bg-slate-900 text-slate-100 rounded-lg p-3 pr-10 text-[12px] leading-relaxed overflow-x-auto"
        style={maxH ? { maxHeight: maxH, overflowY: "auto" } : undefined}
      >
        <code>{code}</code>
      </pre>
      <div className="absolute top-2 right-2 opacity-70 group-hover:opacity-100 transition">
        <CopyBtn text={code} label={`${lang} copiado`} />
      </div>
    </div>
  );
}

export default function ApiPublica() {
  const idConfiguracion = useMemo(
    () => Number(localStorage.getItem("id_configuracion")) || null,
    [],
  );

  const [tab, setTab] = useState("llaves");
  const [keys, setKeys] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [creandoAbierto, setCreandoAbierto] = useState(false);
  const [scopesSel, setScopesSel] = useState([]);
  // Llave recién creada: única vez que se ve completa
  const [keyNueva, setKeyNueva] = useState(null);
  // Endpoint de configuración expandido en la doc
  const [endpointAbierto, setEndpointAbierto] = useState(null);
  // Actividad (auditoría de escrituras de los CRMs conectados)
  const [actividad, setActividad] = useState([]);
  const [cargandoAct, setCargandoAct] = useState(false);
  const [detalleAct, setDetalleAct] = useState(null); // { id, previo, nuevo… }
  const [revirtiendo, setRevirtiendo] = useState(false);

  const cargar = useCallback(async () => {
    if (!idConfiguracion) return setCargando(false);
    setCargando(true);
    try {
      const { data } = await chatApi.get("/api_keys", {
        params: { id_configuracion: idConfiguracion },
      });
      setKeys(data?.data || []);
    } catch (_) {
      setKeys([]);
    } finally {
      setCargando(false);
    }
  }, [idConfiguracion]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const crear = async (e) => {
    e?.preventDefault();
    const n = nombre.trim();
    if (!n) return toast.error("Ponle un nombre para identificarla");
    setCreando(true);
    try {
      const { data } = await chatApi.post("/api_keys", {
        id_configuracion: idConfiguracion,
        nombre: n,
        scopes: ["read", ...scopesSel],
      });
      setKeyNueva(data?.data || null);
      setNombre("");
      setScopesSel([]);
      setCreandoAbierto(false);
      cargar();
    } finally {
      setCreando(false);
    }
  };

  const revocar = async (k) => {
    const r = await Swal.fire({
      icon: "warning",
      title: "¿Revocar esta llave?",
      html: `<b>${k.nombre}</b><br/>Quien la esté usando dejará de recibir datos de inmediato. No se puede deshacer.`,
      showCancelButton: true,
      confirmButtonText: "Sí, revocar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
    });
    if (!r.isConfirmed) return;
    await chatApi.post("/api_keys/revocar", {
      id: k.id,
      id_configuracion: idConfiguracion,
    });
    toast.success("Llave revocada");
    cargar();
  };

  const cargarActividad = useCallback(async () => {
    if (!idConfiguracion) return;
    setCargandoAct(true);
    setDetalleAct(null);
    try {
      const { data } = await chatApi.get("/api_keys/auditoria", {
        params: { id_configuracion: idConfiguracion },
      });
      setActividad(data?.data || []);
    } catch (_) {
      setActividad([]);
    } finally {
      setCargandoAct(false);
    }
  }, [idConfiguracion]);

  useEffect(() => {
    if (tab === "actividad") cargarActividad();
  }, [tab, cargarActividad]);

  const verDetalleAct = async (id) => {
    if (detalleAct?.id === id) return setDetalleAct(null);
    try {
      const { data } = await chatApi.get("/api_keys/auditoria", {
        params: { id_configuracion: idConfiguracion, id },
      });
      setDetalleAct(data?.data || null);
    } catch (_) {
      toast.error("No se pudo cargar el detalle");
    }
  };

  const revertirAct = async (fila) => {
    const r = await Swal.fire({
      icon: "warning",
      title: "¿Deshacer este cambio?",
      html: `Se restaura <b>${recursoLegible(fila.recurso, fila.accion)}</b> al estado que tenía ANTES de que ${fila.llave || "el sistema externo"} lo tocara.<br/><br/>La reversión también queda registrada — puedes volver a cualquier punto.`,
      showCancelButton: true,
      confirmButtonText: "Sí, deshacer",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#d97706",
    });
    if (!r.isConfirmed) return;
    setRevirtiendo(true);
    try {
      const { data } = await chatApi.post("/api_keys/auditoria/revertir", {
        id_configuracion: idConfiguracion,
        id: fila.id,
      });
      toast.success(data?.message || "Cambio revertido");
      cargarActividad();
    } catch (e) {
      toast.error(e?.response?.data?.message || "No se pudo revertir");
    } finally {
      setRevirtiendo(false);
    }
  };

  const toggleScope = (scope) =>
    setScopesSel((prev) =>
      prev.includes(scope)
        ? prev.filter((x) => x !== scope)
        : [...prev, scope],
    );

  return (
    <div className="w-full px-3 md:px-6 py-5 space-y-4">
      {/* ══ Header ══ */}
      <div className="rounded-2xl bg-[#171931] text-white p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-white/10 flex items-center justify-center">
            <i className="bx bx-code-curly text-2xl" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold leading-tight">
              API para desarrolladores
            </h1>
            <p className="text-[13px] text-white/60">
              Conecta tu ERP, CRM o dashboard: lee tus métricas y administra tu
              bot desde tu propio sistema.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5">
            <code className="text-[11.5px] text-white/80 truncate max-w-[240px]">
              {BASE_PUBLICA}
            </code>
            <CopyBtn text={BASE_PUBLICA} label="URL base copiada" />
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-5 flex gap-1.5">
          {[
            { id: "llaves", icon: "bx-key", label: "Mis llaves" },
            { id: "docs", icon: "bx-book-open", label: "Documentación" },
            { id: "actividad", icon: "bx-history", label: "Actividad" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-semibold transition ${
                tab === t.id
                  ? "bg-white text-[#171931]"
                  : "bg-white/10 text-white/70 hover:bg-white/15"
              }`}
            >
              <i className={`bx ${t.icon}`} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══ TAB LLAVES ══ */}
      {tab === "llaves" && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="px-4 md:px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-800">Mis llaves</h2>
              <p className="text-[12px] text-slate-500">
                Cada llave identifica a un sistema. Se ve completa una sola
                vez, al crearla.
              </p>
            </div>
            {!creandoAbierto && (
              <button
                onClick={() => setCreandoAbierto(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-3.5 py-2 transition"
              >
                <i className="bx bx-plus" /> Nueva llave
              </button>
            )}
          </div>

          <div className="p-4 md:p-5">
            {/* Llave recién creada */}
            {keyNueva && (
              <div className="mb-4 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4">
                <p className="text-sm font-bold text-emerald-800">
                  <i className="bx bx-check-circle" /> Llave creada — cópiala
                  ahora
                </p>
                <p className="text-[12px] text-emerald-700 mb-2">
                  Por seguridad no se puede volver a ver completa.
                </p>
                <div className="flex items-center gap-2 bg-white border border-emerald-200 rounded-lg px-3 py-2">
                  <code className="text-[12px] text-slate-800 break-all flex-1">
                    {keyNueva.api_key}
                  </code>
                  <CopyBtn text={keyNueva.api_key} label="Llave copiada" />
                </div>
                {keyNueva.scopes && keyNueva.scopes !== "read" && (
                  <p className="mt-2 text-[11.5px] text-emerald-700">
                    Permisos: <b>{keyNueva.scopes}</b>
                  </p>
                )}
                <button
                  onClick={() => setKeyNueva(null)}
                  className="mt-3 text-[12px] text-emerald-700 hover:text-emerald-900 font-medium"
                >
                  Ya la guardé, ocultar
                </button>
              </div>
            )}

            {/* Crear */}
            {creandoAbierto && (
              <form
                onSubmit={crear}
                className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">
                  1 · ¿Quién va a usar esta llave?
                </label>
                <input
                  autoFocus
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: CRM Guardian, ERP de la tienda…"
                  maxLength={120}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-800/20 focus:border-slate-400"
                />

                <p className="mt-4 mb-1.5 text-[12px] font-semibold text-slate-700">
                  2 · ¿Qué puede hacer?{" "}
                  <span className="font-normal text-slate-400">
                    — leer métricas y configuración va siempre incluido
                  </span>
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {SCOPES_ESCRITURA.map((s) => {
                    const on = scopesSel.includes(s.scope);
                    return (
                      <button
                        key={s.scope}
                        type="button"
                        onClick={() => toggleScope(s.scope)}
                        className={`rounded-xl border p-3 text-left transition ${
                          on
                            ? "border-amber-400 bg-amber-50 ring-2 ring-amber-200"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <i
                            className={`bx ${s.icon} text-xl ${on ? "text-amber-600" : "text-slate-400"}`}
                          />
                          <i
                            className={`bx ${on ? "bxs-check-circle text-amber-500" : "bx-circle text-slate-300"} text-lg`}
                          />
                        </div>
                        <p className="mt-1.5 text-[12.5px] font-bold text-slate-800">
                          {s.titulo}
                        </p>
                        <p className="text-[11px] text-slate-500 leading-snug">
                          {s.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
                {scopesSel.length > 0 && (
                  <p className="mt-2.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[11.5px] text-amber-800">
                    <i className="bx bx-shield-quarter" /> Esta llave podrá{" "}
                    <b>modificar</b> tu configuración. Entrégasela solo a un
                    sistema de confianza — cada cambio queda auditado con el
                    valor anterior.
                  </p>
                )}

                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={creando || !idConfiguracion}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2 disabled:opacity-50 transition"
                  >
                    <i
                      className={`bx ${creando ? "bx-loader-alt bx-spin" : "bx-key"}`}
                    />
                    Crear llave
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreandoAbierto(false);
                      setScopesSel([]);
                    }}
                    className="text-[13px] text-slate-500 hover:text-slate-700 px-2"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {/* Listado */}
            {cargando ? (
              <div className="space-y-2">
                {[0, 1].map((i) => (
                  <div
                    key={i}
                    className="h-[58px] rounded-lg bg-slate-100 animate-pulse"
                  />
                ))}
              </div>
            ) : keys.length === 0 ? (
              !creandoAbierto && (
                <div className="text-center py-10 px-4">
                  <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <i className="bx bx-key text-3xl text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800">
                    Aún no has creado ninguna llave
                  </p>
                  <p className="text-[13px] text-slate-500 mt-1 max-w-sm mx-auto">
                    Crea una y entrégasela a tu desarrollador junto con la
                    documentación.
                  </p>
                  <button
                    onClick={() => setCreandoAbierto(true)}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2.5 transition"
                  >
                    <i className="bx bx-plus text-lg" />
                    Crear mi primera llave
                  </button>
                </div>
              )
            ) : (
              <div className="space-y-2">
                {keys.map((k) => {
                  const escrituras = String(k.scopes || "read")
                    .split(",")
                    .map((s) => s.trim())
                    .filter((s) => s && s !== "read");
                  return (
                    <div
                      key={k.id}
                      className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 transition ${
                        k.activo
                          ? "border-slate-200 bg-white hover:border-slate-300"
                          : "border-slate-200 bg-slate-50 opacity-70"
                      }`}
                    >
                      <span
                        className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                          k.activo ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                        title={k.activo ? "Activa" : "Revocada"}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-slate-800 truncate">
                            {k.nombre}
                          </p>
                          <code className="text-[11px] text-slate-500 bg-slate-100 rounded px-1.5 py-[1px]">
                            {k.key_prefix}…
                          </code>
                          {escrituras.length ? (
                            escrituras.map((s) => (
                              <span
                                key={s}
                                title="Puede escribir en este recurso"
                                className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-[1px]"
                              >
                                <i className="bx bx-edit-alt" />
                                {s.replace(":write", "")}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-500 bg-slate-100 rounded px-1.5 py-[1px]">
                              solo lectura
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {k.activo ? (
                            Number(k.usos) > 0 ? (
                              <>
                                <b className="text-slate-700">{k.usos}</b>{" "}
                                consultas · última {fmtFecha(k.last_used_at)}
                              </>
                            ) : (
                              <span className="text-amber-600">
                                <i className="bx bx-time-five" /> Sin usar
                                todavía
                              </span>
                            )
                          ) : (
                            `Revocada · alcanzó ${k.usos} consultas`
                          )}
                        </p>
                      </div>
                      {k.activo && (
                        <button
                          onClick={() => revocar(k)}
                          className="shrink-0 text-[12px] font-medium text-slate-500 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition"
                        >
                          Revocar
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ══ TAB ACTIVIDAD — qué cambiaron los CRMs conectados y deshacer ══ */}
      {tab === "actividad" && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="px-4 md:px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-800">
                Actividad de tus sistemas conectados
              </h2>
              <p className="text-[12px] text-slate-500">
                Cada cambio que hace un CRM externo queda registrado con el
                valor anterior — puedes deshacerlo con un clic.
              </p>
            </div>
            <button
              onClick={cargarActividad}
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-500 hover:text-slate-800"
            >
              <i className="bx bx-refresh" /> Actualizar
            </button>
          </div>

          <div className="p-4 md:p-5">
            {cargandoAct ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-[52px] rounded-lg bg-slate-100 animate-pulse"
                  />
                ))}
              </div>
            ) : actividad.length === 0 ? (
              <div className="text-center py-10 px-4">
                <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <i className="bx bx-history text-3xl text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  Sin cambios registrados todavía
                </p>
                <p className="text-[13px] text-slate-500 mt-1 max-w-md mx-auto">
                  Cuando un sistema con permisos de escritura edite tu bot, tus
                  flujos o tus plantillas, aparecerá aquí con la opción de
                  deshacerlo.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {actividad.map((a) => {
                  const abierto = detalleAct?.id === a.id;
                  const esRevert = a.accion === "revert";
                  return (
                    <div
                      key={a.id}
                      className="rounded-xl border border-slate-200 overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => verDetalleAct(a.id)}
                        className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition ${abierto ? "bg-slate-50" : "hover:bg-slate-50"}`}
                      >
                        <span
                          className={`text-[10px] font-bold border rounded px-1.5 py-[1px] shrink-0 ${ACCION_BADGE[a.accion] || ACCION_BADGE.update}`}
                        >
                          {ACCION_LABEL[a.accion] || a.accion}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-slate-800 truncate">
                            {recursoLegible(a.recurso, a.accion)}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {fmtFecha(a.created_at)} ·{" "}
                            {esRevert
                              ? "deshecho desde el panel"
                              : `por ${a.llave || "sistema externo"}`}
                          </p>
                        </div>
                        <i
                          className={`bx bx-chevron-${abierto ? "up" : "down"} text-slate-400`}
                        />
                      </button>

                      {abierto && detalleAct && (
                        <div className="border-t border-slate-100 bg-slate-50 px-3.5 py-3">
                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <p className="text-[10.5px] font-bold uppercase tracking-wide text-slate-400 mb-1">
                                Antes (lo que se restauraría)
                              </p>
                              <pre className="bg-white border border-slate-200 rounded-lg p-2 text-[11px] text-slate-700 overflow-auto max-h-44 whitespace-pre-wrap break-words">
                                {detalleAct.previo
                                  ? JSON.stringify(detalleAct.previo, null, 2)
                                  : "(nada)"}
                              </pre>
                            </div>
                            <div>
                              <p className="text-[10.5px] font-bold uppercase tracking-wide text-slate-400 mb-1">
                                Después (lo que escribió)
                              </p>
                              <pre className="bg-white border border-slate-200 rounded-lg p-2 text-[11px] text-slate-700 overflow-auto max-h-44 whitespace-pre-wrap break-words">
                                {detalleAct.nuevo
                                  ? JSON.stringify(detalleAct.nuevo, null, 2)
                                  : "(nada)"}
                              </pre>
                            </div>
                          </div>
                          {!esRevert && a.reversible ? (
                            <button
                              type="button"
                              disabled={revirtiendo}
                              onClick={() => revertirAct(a)}
                              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[13px] font-semibold px-3.5 py-2 disabled:opacity-50 transition"
                            >
                              <i
                                className={`bx ${revirtiendo ? "bx-loader-alt bx-spin" : "bx-undo"}`}
                              />
                              Deshacer este cambio
                            </button>
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ══ TAB DOCUMENTACIÓN ══ */}
      {tab === "docs" && (
        <div className="space-y-4">
          {/* La acción principal: copiar la espec y entregarla. El botón es
              explícito y siempre visible — nada de aparecer al hover. */}
          <section className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/60 p-4 md:p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <i className="bx bx-export text-xl text-indigo-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800">
                  Entrégale esto a tu desarrollador
                </p>
                <p className="text-[12.5px] text-slate-600">
                  La especificación completa: URL base, autenticación y todos
                  los endpoints con sus cuerpos. También puedes pegarla en una
                  IA.
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(especCompleta());
                    toast.success("Especificación copiada");
                  } catch (_) {
                    toast.error("No se pudo copiar");
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 transition"
              >
                <i className="bx bx-copy" />
                Copiar especificación
              </button>
            </div>
            <div className="mt-3">
              <Snippet lang="especificación" code={especCompleta()} maxH={160} />
            </div>
          </section>

          {/* Dos columnas que EMPACAN (cada una es su propia pila): nada de
              huecos por celdas de grid con alturas distintas. */}
          <div className="grid gap-4 xl:grid-cols-2 items-start">
            {/* ── Columna izquierda ── */}
            <div className="flex flex-col gap-4 min-w-0">
              {/* Autenticación */}
              <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5">
                <h3 className="text-sm font-bold text-slate-800 mb-1">
                  <i className="bx bx-lock-alt text-slate-400" /> Autenticación
                </h3>
                <p className="text-[13px] text-slate-600 mb-2">
                  La llave va en el encabezado de cada petición y define la
                  conexión — no se envía ningún id.
                </p>
                <Snippet
                  code={`curl -H "Authorization: Bearer TU_LLAVE" \\\n  "${BASE_PUBLICA}/ping"`}
                />
                <p className="text-[12px] text-slate-500 mt-2">
                  <b>Nunca</b> pongas la llave en el navegador ni en una app
                  móvil. Límite: 60 consultas por minuto.
                </p>
              </section>

              {/* Métricas */}
              <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5">
                <h3 className="text-sm font-bold text-slate-800 mb-1">
                  <i className="bx bx-bar-chart-alt-2 text-slate-400" />{" "}
                  Métricas
                  <span className="ml-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-[1px]">
                    GET · lectura
                  </span>
                </h3>
                <p className="text-[13px] text-slate-600 mb-3">
                  Los que aceptan rango usan{" "}
                  <code className="text-[12px]">
                    ?from=2026-07-01&amp;until=2026-07-20
                  </code>
                  ; sin rango toman los últimos 30 días.
                </p>
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                  {ENDPOINTS.map((e) => (
                    <div
                      key={e.path}
                      className={`flex items-start gap-3 px-3.5 py-2.5 ${e.destacado ? "bg-violet-50/60" : "bg-white"}`}
                    >
                      <code className="text-[13px] font-bold text-slate-800 shrink-0 w-24">
                        {e.path}
                      </code>
                      <p className="text-[12px] text-slate-600 min-w-0 flex-1">
                        <b>{e.titulo}.</b> {e.desc}{" "}
                        {e.rango && (
                          <span className="text-[10px] text-slate-400">
                            (acepta rango)
                          </span>
                        )}
                        {e.destacado && (
                          <span className="ml-1 text-[10px] font-bold text-violet-700 bg-violet-100 rounded px-1.5 py-[1px]">
                            RECOMENDADO
                          </span>
                        )}
                      </p>
                      <CopyBtn
                        text={`${BASE_PUBLICA}${e.path}`}
                        label="URL copiada"
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* Ejemplo + notas */}
              <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5">
                <h3 className="text-sm font-bold text-slate-800 mb-1">
                  <i className="bx bx-code-alt text-slate-400" /> Ejemplo en
                  código
                </h3>
                <Snippet
                  lang="js"
                  code={`const BASE = "${BASE_PUBLICA}";

const r = await fetch(\`\${BASE}/resumen?from=2026-07-01&until=2026-07-20\`, {
  headers: { Authorization: \`Bearer \${process.env.IMPORCHAT_API_KEY}\` },
});
const data = await r.json();

console.log(data.ventas.pedidos);              // 175
console.log(data.conversaciones.pct_confirmacion); // 63.9`}
                />
                <ul className="mt-4 space-y-2 text-[12.5px] text-slate-600">
                  <li className="flex gap-2">
                    <i className="bx bx-message-dots text-slate-400 mt-[2px]" />
                    <span>
                      <b>Conversaciones</b> son personas que <b>escribieron</b>;
                      los contactos importados no cuentan.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <i className="bx bx-error-circle text-slate-400 mt-[2px]" />
                    <span>
                      Un porcentaje en <code>null</code> es "sin dato", no
                      cero.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <i className="bx bx-time-five text-slate-400 mt-[2px]" />
                    <span>
                      Guarda los resultados unos minutos de tu lado: consultar
                      cada 5–15 minutos es suficiente.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <i className="bx bx-refresh text-slate-400 mt-[2px]" />
                    <span>
                      <code>429/500</code>: reintenta con 1s, 2s, 4s.{" "}
                      <code>400/401/403</code>: corrige la petición, la llave o
                      el permiso.
                    </span>
                  </li>
                </ul>
              </section>
            </div>

            {/* ── Columna derecha: Configuración agrupada por recurso ── */}
            <div className="flex flex-col gap-4 min-w-0">
              <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5">
                <h3 className="text-sm font-bold text-slate-800 mb-1">
                  <i className="bx bx-slider-alt text-slate-400" />{" "}
                  Configuración
                  <span className="ml-2 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-[1px]">
                    lectura + escritura
                  </span>
                </h3>
                <p className="text-[13px] text-slate-600">
                  Para que un CRM externo administre tu bot. Cada recurso dice
                  qué permiso necesita para escribir, y{" "}
                  <b>cada cambio queda auditado</b> con el valor anterior.
                </p>
              </section>

              {GRUPOS_CONFIG.map((g) => (
                <section
                  key={g.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/60">
                    <div className="h-9 w-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                      <i className={`bx ${g.icon} text-lg text-slate-600`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-bold text-slate-800">
                        {g.titulo}
                      </p>
                      <p className="text-[11.5px] text-slate-500 truncate">
                        {g.desc}
                      </p>
                    </div>
                    <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-[1px]">
                      <i className="bx bx-edit-alt" />
                      editar: {g.scope.replace(":write", "")}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {ENDPOINTS_CONFIG.filter((e) => e.grupo === g.id).map(
                      (e) => {
                        const id = `${e.metodo} ${e.path}`;
                        const abierto = endpointAbierto === id;
                        return (
                          <div key={id}>
                            <button
                              type="button"
                              onClick={() =>
                                setEndpointAbierto(abierto ? null : id)
                              }
                              className={`flex w-full items-center gap-2 px-4 py-2.5 text-left transition ${abierto ? "bg-slate-50" : "hover:bg-slate-50"}`}
                            >
                              <span
                                className={`text-[10px] font-bold border rounded px-1.5 py-[1px] shrink-0 w-14 text-center ${METODO_BADGE[e.metodo]}`}
                              >
                                {e.metodo}
                              </span>
                              <code className="text-[12.5px] font-semibold text-slate-800 truncate flex-1">
                                {e.path}
                              </code>
                              {e.scope === "read" ? (
                                <span className="shrink-0 text-[10px] text-slate-400">
                                  lectura
                                </span>
                              ) : (
                                <i
                                  className="bx bx-edit-alt text-amber-500"
                                  title="Requiere permiso de escritura"
                                />
                              )}
                              <i
                                className={`bx bx-chevron-${abierto ? "up" : "down"} text-slate-400`}
                              />
                            </button>
                            {abierto && (
                              <div className="bg-slate-50 px-4 pb-3">
                                <p className="text-[12px] text-slate-600 pt-1">
                                  {e.desc}
                                </p>
                                {e.body && (
                                  <div className="mt-2">
                                    <p className="text-[10.5px] font-bold uppercase tracking-wide text-slate-400 mb-1">
                                      Cuerpo de ejemplo
                                    </p>
                                    <Snippet lang="body" code={e.body} />
                                  </div>
                                )}
                                <div className="mt-2 flex items-center gap-2">
                                  <code className="text-[11px] text-slate-500 truncate">
                                    {BASE_PUBLICA}
                                    {e.path}
                                  </code>
                                  <CopyBtn
                                    text={`${BASE_PUBLICA}${e.path}`}
                                    label="URL copiada"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      },
                    )}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
