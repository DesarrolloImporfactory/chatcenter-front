import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";
import FormSeguimiento from "../../components/admin/dashboard/seguimientos/FormSeguimiento";
import { TIPO_MAP, RESULTADOS } from "../../components/admin/dashboard/seguimientos/constants";
import DrawerClienteRecuperacion from "./DrawerClienteRecuperacion";
import ResultadosRecuperacion from "./ResultadosRecuperacion";
import AsesoresRecuperacion from "./AsesoresRecuperacion";
import AutomatizacionesRecuperacion from "./AutomatizacionesRecuperacion";
import PagosManualesRecuperacion from "./PagosManualesRecuperacion";
import {
  COHORTE_UI,
  ESTADO_CASO,
  money,
  num,
  fmtFecha,
  fmtFechaCorta,
  fmtFechaHora,
  relDias,
  inicialesDe,
  irAlChatExpertos,
} from "./recuperacionUtils";

const RESULTADO_LABEL = Object.fromEntries(RESULTADOS.map((r) => [r.value, r.label]));

const VISTAS = [
  { id: "embudo", label: "Embudo", icon: "bx-filter-alt" },
  { id: "agenda", label: "Agenda", icon: "bx-calendar-check" },
  { id: "automatizaciones", label: "Automatizaciones", icon: "bx-bot" },
  { id: "resultados", label: "Resultados", icon: "bx-trophy" },
  { id: "pagos", label: "Pagos manuales", icon: "bx-receipt", soloSuper: true },
  { id: "asesores", label: "Asesores", icon: "bx-user-pin", soloSuper: true },
];

const ASIGNACION = [
  { id: "todos", label: "Todos" },
  { id: "mios", label: "Mis casos" },
  { id: "sin", label: "Sin asignar" },
];

// Texto corto de la situación según la cohorte ("Se va en 3 días").
const VERBO_COHORTE = {
  cancelacion_programada: "Se va",
  pago_rebotado: "Venció",
  vencido: "Venció",
  cancelado_reciente: "Canceló",
  en_prueba: "Prueba termina",
  sin_tarjeta: "Acceso termina",
};

/**
 * Abre el chat del cliente en la conexión de Expertos: el back lo crea como
 * contacto ahí (si no existe) y se entra por /abrir-chat, que fija la
 * conexión y abre la conversación en una pestaña nueva.
 */
async function abrirChatExpertos(f) {
  try {
    const { data } = await chatApi.post(`recuperacion/casos/${f.id_usuario}/abrir-chat-expertos`, {});
    const d = data.data;
    irAlChatExpertos(d);
  } catch (e) {
    toast.error(e?.response?.data?.message || "No se pudo abrir el chat desde Expertos");
  }
}

function Kpi({ icon, label, value, hint, accent = "slate", onClick, activo }) {
  const acc = {
    slate: "bg-slate-100 text-slate-700",
    rose: "bg-rose-50 text-rose-700",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    cyan: "bg-cyan-50 text-cyan-700",
    violet: "bg-violet-50 text-violet-700",
  }[accent];
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`bg-white rounded-xl border p-3 md:p-4 shadow-sm text-left transition min-w-0 ${
        onClick ? "hover:shadow-md" : ""
      } ${activo ? "border-cyan-500 ring-2 ring-cyan-200" : "border-slate-200"}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`h-9 w-9 md:h-10 md:w-10 shrink-0 rounded-lg flex items-center justify-center ${acc}`}>
          <i className={`bx ${icon} text-xl`} />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">{label}</div>
          <div className="text-xl md:text-2xl font-extrabold text-slate-900 leading-tight">{value}</div>
          {hint && <div className="text-[11px] text-slate-500 truncate">{hint}</div>}
        </div>
      </div>
    </Tag>
  );
}

/** Número del cliente con su origen explicado (personal vs el de su conexión). */
function Telefono({ f, compacto = false }) {
  if (!f.whatsapp_digits) {
    return (
      <div className="text-[11px] text-amber-700 inline-flex items-center gap-1">
        <i className="bx bx-phone-off" /> Sin número: ni WhatsApp personal ni conexión activa
      </div>
    );
  }
  const personal = f.telefono_fuente === "personal";
  return (
    <div className="min-w-0">
      <a
        href={f.whatsapp_url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline font-semibold"
        title="Abrir en WhatsApp Web"
      >
        <i className="bxl bxl-whatsapp text-sm" /> {f.whatsapp}
      </a>
      <div
        className={`text-[10px] leading-tight ${personal ? "text-slate-500" : "text-amber-700"}`}
        title={
          personal
            ? "Número personal que el dueño registró al crear su cuenta."
            : `No registró número personal. Este es el de su conexión de ImporChat (${f.conexion_nombre || "su bot"}): sirve para llamar; un mensaje desde Expertos a un número de bot puede no entregarse.`
        }
      >
        {personal ? "WhatsApp personal del dueño" : `Nº de su conexión (bot${f.conexion_nombre && !compacto ? `: ${f.conexion_nombre}` : ""})`}
      </div>
      {f.numero_compartido && (
        <div
          title={f.numero_compartido.texto}
          className={`mt-1 inline-flex items-start gap-1 px-1.5 py-0.5 rounded text-[10px] leading-tight font-semibold ring-1 max-w-full ${
            f.numero_compartido.no_molestar ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-amber-50 text-amber-800 ring-amber-200"
          }`}
        >
          <i className={`bx ${f.numero_compartido.no_molestar ? "bx-block" : "bx-group"} text-xs shrink-0 mt-px`} />
          <span className={compacto ? "line-clamp-2" : ""}>
            {f.numero_compartido.no_molestar ? "No contactar: " : ""}
            {f.numero_compartido.texto}
          </span>
        </div>
      )}
    </div>
  );
}

/** Contestó una automatización y el último seguimiento registrado es anterior a esa respuesta (o no hay). */
function respondioSinSeguimiento(f) {
  const r = f.automatizacion?.respondio_en;
  if (!r) return false;
  const s = f.ultimo_seguimiento?.fecha;
  return !s || new Date(s) < new Date(r);
}

/** Sin seguimiento manual, pero sí le salió una automatización: no es «nunca contactado». */
function ContactoAutomatico({ a }) {
  return (
    <div className="min-w-0">
      <div className="inline-flex items-center gap-1 text-cyan-700 font-semibold">
        <i className="bx bx-bot" /> Solo automatización
      </div>
      <div className="text-slate-500 truncate" title={`${a.secuencia} · Paso ${a.paso}${a.titulo ? ` · ${a.titulo}` : ""}`}>
        Paso {a.paso}{a.titulo ? ` · ${a.titulo}` : ""} · {a.estado === "encolado" ? "en cola" : fmtFechaCorta(a.fecha)}
      </div>
      {a.respondio_en ? (
        <>
          <div className="text-emerald-700 font-semibold">Respondió {fmtFechaCorta(a.respondio_en)}: falta seguimiento manual</div>
          {a.respuesta_texto && (
            <div className="text-slate-600 italic truncate" title={a.respuesta_texto}>
              «{a.respuesta_texto}»
            </div>
          )}
        </>
      ) : (
        <div className="text-slate-400">Sin respuesta · sin seguimiento manual</div>
      )}
    </div>
  );
}

function BadgeCohorte({ id, cohortes }) {
  const c = cohortes.find((x) => x.id === id);
  const ui = COHORTE_UI[id] || COHORTE_UI.manual;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ring-1 ${ui.cls}`}>
      <i className={`bx ${c?.icon || "bx-flag"}`} /> {c?.label || id}
    </span>
  );
}

/** Botones de acción de un cliente (los mismos en tabla, tarjeta y agenda). */
function Acciones({ f, expertos, onRegistrar, onAbrir, onCerrar, mostrarCerrar = true }) {
  const puedeExpertos = expertos?.disponible && f.whatsapp_digits;
  // Chat de otro asesor: no se abre (el chat se lo negaría); se pide la transferencia.
  const ajeno = f.chat_expertos?.bloqueado ? f.chat_expertos.encargado_nombre || "otro asesor" : null;
  return (
    <div className="flex items-center gap-1 flex-wrap justify-end">
      {ajeno ? (
        <button
          onClick={() =>
            toast(`Este chat lo atiende ${ajeno}. Pídele que te lo transfiera para poder abrirlo.`, { duration: 5000 })
          }
          title={`Lo atiende ${ajeno}: pídele que te lo transfiera`}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg ring-1 ring-slate-300 bg-slate-50 text-slate-600 text-xs font-semibold hover:bg-slate-100 max-w-[180px]"
        >
          <i className="bx bx-lock-alt text-sm shrink-0" />
          <span className="truncate">Lo atiende {ajeno}</span>
        </button>
      ) : (
        <button
          onClick={() => abrirChatExpertos(f)}
          disabled={!puedeExpertos}
          title={
            !f.whatsapp_digits
              ? "El cliente no tiene número"
              : expertos?.disponible
                ? `Abrir la conversación en la conexión "${expertos.nombre}" (las automatizaciones saldrán de ahí)`
                : expertos?.motivo || "No disponible"
          }
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <i className="bxl bxl-whatsapp text-sm" /> Chat desde Expertos
        </button>
      )}
      <button
        onClick={onRegistrar}
        title="Registrar lo que hablaste"
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-semibold hover:bg-cyan-700"
      >
        <i className="bx bx-edit text-sm" /> Registrar
      </button>
      <button
        onClick={onAbrir}
        title="Ficha e historial"
        className="p-1.5 rounded-lg ring-1 ring-slate-200 text-slate-600 hover:bg-slate-100"
      >
        <i className="bx bx-id-card text-base" />
      </button>
      {mostrarCerrar && (
        <select
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) onCerrar(e.target.value);
            e.target.value = "";
          }}
          title="Cerrar el caso con un resultado"
          className="text-[11px] text-slate-600 border border-slate-200 rounded-lg px-1 py-1.5 bg-white"
        >
          <option value="">Cerrar…</option>
          <option value="recuperado">Recuperado</option>
          <option value="perdido">Perdido</option>
          <option value="descartado">Descartar</option>
        </select>
      )}
    </div>
  );
}

/** Quién lo tiene: avatar + nombre, o "Tomar caso"; el admin reasigna. */
function Asesor({ f, permisos, asignables, onTomar, onReasignar }) {
  if (f.caso?.asignado_a_id) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <span className="h-7 w-7 shrink-0 rounded-full bg-cyan-100 text-cyan-800 text-[10px] font-bold flex items-center justify-center">
          {inicialesDe(f.caso.asignado_a_nombre)}
        </span>
        <div className="min-w-0">
          <div className="font-semibold text-slate-800 text-xs truncate">{f.caso.es_mio ? "Tú" : f.caso.asignado_a_nombre}</div>
          {permisos.puede_asignar && (
            <select
              value={f.caso.asignado_a_id || ""}
              onChange={(e) => onReasignar(e.target.value)}
              className="text-[11px] text-slate-500 bg-transparent border-0 p-0 cursor-pointer"
              title="Reasignar"
            >
              <option value="">Liberar</option>
              {asignables.map((a) => (
                <option key={a.id_sub_usuario} value={a.id_sub_usuario}>{a.nombre}</option>
              ))}
            </select>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-start gap-1">
      <button onClick={onTomar} className="px-2.5 py-1 rounded-lg ring-1 ring-cyan-600 text-cyan-700 text-xs font-semibold hover:bg-cyan-50">
        Tomar caso
      </button>
      {permisos.puede_asignar && asignables.length > 0 && (
        <select
          defaultValue=""
          onChange={(e) => e.target.value && onReasignar(e.target.value)}
          className="text-[11px] text-slate-500 border border-slate-200 rounded px-1 py-0.5"
        >
          <option value="">Asignar a…</option>
          {asignables.map((a) => (
            <option key={a.id_sub_usuario} value={a.id_sub_usuario}>{a.nombre}</option>
          ))}
        </select>
      )}
    </div>
  );
}

/**
 * Panel completo de recuperación. Lo usan la página /recuperacion (asesores)
 * y la pestaña «Recuperación» del dashboard del super admin.
 */
export default function RecuperacionPanel({ onSinPermiso }) {
  const [vista, setVista] = useState("embudo");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sinPermiso, setSinPermiso] = useState(false);
  const [cohorte, setCohorte] = useState("");
  const [asignacion, setAsignacion] = useState("todos");
  const [soloSinContacto, setSoloSinContacto] = useState(false);
  const [soloCompartido, setSoloCompartido] = useState(false);
  // Respondió a una automatización y nadie le registró seguimiento después:
  // es el cliente que ya levantó la mano, por ahí se empieza.
  const [soloRespondieron, setSoloRespondieron] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [drawer, setDrawer] = useState(null); // id_usuario
  const [form, setForm] = useState(null); // fila
  // Paginado de verdad (no scroll infinito). La página se conserva al registrar
  // un seguimiento o tomar un caso: `cargar(true)` refresca datos sin tocarla.
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 25;
  const [ayuda, setAyuda] = useState(() => {
    try {
      return localStorage.getItem("recuperacion_ayuda_oculta") !== "1";
    } catch (_) {
      return true;
    }
  });

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    try {
      const { data: r } = await chatApi.get("recuperacion/embudo", { silentError: true });
      setData(r.data);
    } catch (e) {
      if (e?.response?.status === 403) {
        setSinPermiso(true);
        onSinPermiso?.();
      } else {
        toast.error(e?.response?.data?.message || "No se pudo cargar el embudo");
      }
    } finally {
      setLoading(false);
    }
  }, [onSinPermiso]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const ocultarAyuda = () => {
    setAyuda(false);
    try {
      localStorage.setItem("recuperacion_ayuda_oculta", "1");
    } catch (_) {
      /* sin storage */
    }
  };

  const permisos = data?.permisos || {};
  const expertos = data?.expertos || null;

  const filas = useMemo(() => {
    if (!data) return [];
    const q = busqueda.trim().toLowerCase();
    return data.filas.filter((f) => {
      if (cohorte && f.cohorte !== cohorte) return false;
      if (asignacion === "mios" && !f.caso?.es_mio) return false;
      if (asignacion === "sin" && f.caso?.asignado_a_id) return false;
      if (soloSinContacto && (f.ultimo_seguimiento || f.automatizacion)) return false;
      if (soloCompartido && !f.numero_compartido) return false;
      if (soloRespondieron && !respondioSinSeguimiento(f)) return false;
      if (!q) return true;
      return [f.empresa, f.email, f.whatsapp, f.nombre_plan, f.caso?.asignado_a_nombre]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [data, cohorte, asignacion, soloSinContacto, soloCompartido, soloRespondieron, busqueda]);

  // Solo un cambio de filtro vuelve a la primera página.
  useEffect(() => {
    setPagina(1);
  }, [cohorte, asignacion, soloSinContacto, soloCompartido, soloRespondieron, busqueda]);

  // Historial: el embudo solo lista casos ABIERTOS. Cuando el cliente ya se
  // fue (canceló, venció) desaparece de la lista y nadie sabía qué pasó con
  // él. Al buscar, el back devuelve también su último caso cerrado.
  const [historial, setHistorial] = useState([]);
  useEffect(() => {
    const q = busqueda.trim();
    if (q.length < 3) {
      setHistorial([]);
      return undefined;
    }
    let vivo = true;
    const t = setTimeout(async () => {
      try {
        const { data: r } = await chatApi.get("recuperacion/casos/buscar", { params: { q } });
        if (vivo) setHistorial((r.data || []).filter((h) => h.estado_caso !== "abierto"));
      } catch (_) {
        if (vivo) setHistorial([]);
      }
    }, 400);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [busqueda]);

  // Tabla «Trabajo por asesor» (se abre desde la tarjeta «Registrado hoy»).
  const [mostrarActividad, setMostrarActividad] = useState(false);

  const agenda = useMemo(() => {
    if (!data) return { vencidos: [], hoy: [], proximos: [], sinFecha: 0 };
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fin = new Date(hoy.getTime() + 86400000);
    const en7 = new Date(hoy.getTime() + 7 * 86400000);
    const out = { vencidos: [], hoy: [], proximos: [], sinFecha: 0 };
    for (const f of data.filas) {
      if (asignacion === "mios" && !f.caso?.es_mio) continue;
      if (!f.proximo_contacto) {
        out.sinFecha += 1;
        continue;
      }
      const d = new Date(f.proximo_contacto);
      if (d < hoy) out.vencidos.push(f);
      else if (d < fin) out.hoy.push(f);
      else if (d <= en7) out.proximos.push(f);
    }
    const porFecha = (a, b) => new Date(a.proximo_contacto) - new Date(b.proximo_contacto);
    out.vencidos.sort(porFecha);
    out.hoy.sort(porFecha);
    out.proximos.sort(porFecha);
    return out;
  }, [data, asignacion]);

  const tomar = async (f) => {
    try {
      await chatApi.post(`recuperacion/casos/${f.id_usuario}/asignar`, {});
      toast.success(`Caso de ${f.empresa || f.email} asignado a ti`);
      cargar(true);
    } catch (e) {
      toast.error(e?.response?.data?.message || "No se pudo tomar el caso");
    }
  };

  const reasignar = async (f, id_sub_usuario) => {
    try {
      await chatApi.post(`recuperacion/casos/${f.id_usuario}/asignar`, {
        id_sub_usuario: id_sub_usuario ? Number(id_sub_usuario) : null,
      });
      toast.success(id_sub_usuario ? "Caso reasignado" : "Caso liberado");
      cargar(true);
    } catch (e) {
      toast.error(e?.response?.data?.message || "No se pudo reasignar");
    }
  };

  const cerrar = async (f, estado) => {
    const titulos = {
      recuperado: "Marcar como recuperado",
      perdido: "Marcar como perdido",
      descartado: "Descartar el caso",
    };
    const r = await Swal.fire({
      title: titulos[estado],
      html: `<p style="font-size:14px;text-align:left">${f.empresa || f.email}</p>
             <p style="font-size:12px;color:#64748B;text-align:left;margin-top:6px">
             El sistema también cierra solo los casos cuando el cliente sale del embudo (vuelve a estar activo o queda
             cancelado). Usa esto cuando ya sepas el resultado. Si vuelve a entrar en riesgo se abre un caso nuevo.</p>`,
      input: "text",
      inputPlaceholder: "Motivo (opcional)",
      showCancelButton: true,
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: estado === "recuperado" ? "#059669" : estado === "perdido" ? "#e11d48" : "#475569",
    });
    if (!r.isConfirmed) return;
    try {
      await chatApi.post(`recuperacion/casos/${f.id_usuario}/cerrar`, { estado, motivo: r.value || null });
      toast.success("Caso cerrado");
      cargar(true);
    } catch (e) {
      toast.error(e?.response?.data?.message || "No se pudo cerrar el caso");
    }
  };

  if (sinPermiso) {
    return (
      <div className="py-20 text-center">
        <i className="bx bx-lock-alt text-5xl text-slate-300" />
        <p className="mt-3 text-slate-600 font-semibold">No tienes acceso a Recuperación de clientes.</p>
        <p className="text-sm text-slate-500">Pídele al super administrador que te agregue como asesor.</p>
      </div>
    );
  }

  const k = data?.kpis;
  const act = data?.actividad || {
    hoy: 0,
    semana: 0,
    mes: 0,
    asesores_activos_semana: 0,
    asesores_total: 0,
    sin_asignar: { abiertos: 0, sin_tocar: 0 },
    asesores: [],
  };
  const vistasVisibles = VISTAS.filter((v) => !v.soloSuper || permisos.puede_gestionar_asesores);
  const totalPaginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);
  const promesas = data ? data.filas.filter((f) => f.promesa_pago).length : 0;
  const accionesDe = (f) => ({
    f,
    expertos,
    onRegistrar: () => setForm(f),
    onAbrir: () => setDrawer(f.id_usuario),
    onCerrar: (estado) => cerrar(f, estado),
  });

  return (
    <div className="space-y-4 md:space-y-5 min-w-0">
      {/* Encabezado */}
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-cyan-700">
            <i className="bx bx-support" /> Área comercial
          </div>
          <h1 className="mt-1 text-xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Recuperación de clientes
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Clientes de ImporChat que están por irse o ya se fueron. Toma el caso, escríbele desde Expertos,
            registra lo que hablaron y el sistema marca solo si se recuperó.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!ayuda && (
            <button onClick={() => setAyuda(true)} className="px-3 py-2 rounded-lg ring-1 ring-slate-200 text-slate-600 text-sm hover:bg-slate-100">
              <i className="bx bx-help-circle" /> Cómo funciona
            </button>
          )}
          <button
            onClick={() => cargar()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 disabled:opacity-50"
          >
            <i className={`bx ${loading ? "bx-loader-alt bx-spin" : "bx-refresh"}`} /> <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </header>

      {ayuda && (
        <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 text-sm text-slate-700 relative">
          <button onClick={ocultarAyuda} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-700" title="Ocultar">
            <i className="bx bx-x text-xl" />
          </button>
          <div className="font-bold text-cyan-900 mb-2">Cómo se trabaja este embudo</div>
          <ol className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <li className="flex gap-2"><span className="h-6 w-6 shrink-0 rounded-full bg-cyan-600 text-white font-bold flex items-center justify-center">1</span><span><b>Toma el caso.</b> Así el equipo sabe que tú lo llevas. Empieza por «Pago rebotado»: son los que pagaban y la tarjeta falló.</span></li>
            <li className="flex gap-2"><span className="h-6 w-6 shrink-0 rounded-full bg-cyan-600 text-white font-bold flex items-center justify-center">2</span><span><b>Escríbele desde Expertos.</b> El botón verde abre la conversación en la conexión «{expertos?.nombre || "Soporte Expertos"}». Si prefieres, el número también abre WhatsApp Web.</span></li>
            <li className="flex gap-2"><span className="h-6 w-6 shrink-0 rounded-full bg-cyan-600 text-white font-bold flex items-center justify-center">3</span><span><b>Registra lo que pasó.</b> Si prometió pagar, elige «Prometió pagar» y pon la fecha: aparece en la Agenda y se marca vencida si no paga.</span></li>
            <li className="flex gap-2"><span className="h-6 w-6 shrink-0 rounded-full bg-cyan-600 text-white font-bold flex items-center justify-center">4</span><span><b>El resultado sale solo.</b> Cuando el cliente vuelve a estar activo el caso se cierra como recuperado; si queda cancelado, como perdido. En «Resultados» ves tu trabajo.</span></li>
          </ol>
          <p className="mt-2 text-[11px] text-slate-500">
            Sobre el número: el que se muestra es el <b>WhatsApp personal</b> que el dueño registró. Si no lo cargó, se muestra el
            número de <b>su conexión de ImporChat</b> (el bot), marcado en ámbar: sirve para llamar, pero un mensaje de Expertos a un número de bot puede no llegar.
          </p>
        </div>
      )}

      <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 -mx-1 px-1">
        {vistasVisibles.map((v) => (
          <button
            key={v.id}
            onClick={() => setVista(v.id)}
            className={`inline-flex items-center gap-1.5 px-3 md:px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition ${
              vista === v.id ? "border-cyan-600 text-cyan-700" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <i className={`bx ${v.icon} text-base`} />
            {v.label}
            {v.id === "agenda" && agenda.vencidos.length + agenda.hoy.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                {agenda.vencidos.length + agenda.hoy.length}
              </span>
            )}
          </button>
        ))}
      </nav>

      {vista === "resultados" && <ResultadosRecuperacion onAbrirCliente={(id) => setDrawer(id)} />}
      {vista === "automatizaciones" && <AutomatizacionesRecuperacion permisos={permisos} />}
      {vista === "asesores" && permisos.puede_gestionar_asesores && <AsesoresRecuperacion />}
      {vista === "pagos" && permisos.puede_gestionar_asesores && (
        <PagosManualesRecuperacion onAbrirCliente={(id) => setDrawer(id)} />
      )}

      {(vista === "embudo" || vista === "agenda") && loading && !data && (
        <div className="py-20 text-center text-slate-500">
          <i className="bx bx-loader-alt bx-spin text-4xl text-cyan-600" />
          <p className="mt-2 text-sm">Armando el embudo…</p>
        </div>
      )}

      {(vista === "embudo" || vista === "agenda") && data && (
        <div className={loading ? "opacity-60 pointer-events-none space-y-4 md:space-y-5" : "space-y-4 md:space-y-5"}>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 md:gap-3">
            <Kpi icon="bx-group" accent="rose" label="En riesgo" value={num(k.en_riesgo)} hint={`${money(k.mrr_en_riesgo)} / mes en juego`} />
            {/* Cuánto se está trabajando: seguimientos registrados. Sin esto el
                panel mostraba 1.000+ casos asignados y nadie veía que casi no
                había registros. */}
            <Kpi
              icon="bx-edit"
              accent={act.semana === 0 ? "rose" : "slate"}
              label="Registrado hoy"
              value={num(act.hoy)}
              hint={`${num(act.semana)} en 7 días · ${num(act.asesores_activos_semana)}/${num(act.asesores_total)} asesores activos`}
              onClick={() => setMostrarActividad((v) => !v)}
              activo={mostrarActividad}
            />
            <Kpi
              icon="bx-phone-off"
              accent="amber"
              label="Sin contactar"
              value={num(k.sin_contacto)}
              hint={k.solo_automatizacion ? `Ni seguimiento ni automatización · ${num(k.solo_automatizacion)} solo por automatización` : "Nadie les ha registrado nada"}
              onClick={() => { setVista("embudo"); setSoloSinContacto((v) => !v); }}
              activo={soloSinContacto}
            />
            <Kpi
              icon="bx-user-check"
              accent="cyan"
              label="Mis casos"
              value={num(k.mis_casos)}
              hint={`${num(k.sin_asignar)} sin asignar`}
              onClick={() => { setVista("embudo"); setAsignacion((a) => (a === "mios" ? "todos" : "mios")); }}
              activo={asignacion === "mios"}
            />
            <Kpi
              icon="bx-calendar-event"
              accent="violet"
              label="Para hoy"
              value={num(agenda.vencidos.length + agenda.hoy.length)}
              hint={`${num(agenda.vencidos.length)} atrasados`}
              onClick={() => setVista("agenda")}
              activo={vista === "agenda"}
            />
            <Kpi
              icon="bx-handshake"
              accent="emerald"
              label="Promesas de pago"
              value={num(promesas)}
              hint={promesas ? `${num(k.promesas_vencidas)} vencidas sin pagar` : "Se crean al registrar «Prometió pagar»"}
            />
          </div>

          {/* Trabajo por asesor: seguimientos registrados y casos sin tocar */}
          {mostrarActividad && (
            <div className="bg-white rounded-xl border border-slate-200 p-3 md:p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                <div className="text-sm font-bold text-slate-800">
                  Trabajo por asesor <span className="text-slate-400 font-normal text-xs">· seguimientos registrados</span>
                </div>
                <button onClick={() => setMostrarActividad(false)} className="text-xs font-semibold text-cyan-700 hover:underline">
                  Ocultar
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="text-left px-2 py-1.5">Asesor</th>
                      <th className="text-right px-2 py-1.5">Casos abiertos</th>
                      <th className="text-right px-2 py-1.5">Sin tocar</th>
                      <th className="text-right px-2 py-1.5">Hoy</th>
                      <th className="text-right px-2 py-1.5">7 días</th>
                      <th className="text-right px-2 py-1.5">30 días</th>
                      <th className="text-left px-2 py-1.5">Último registro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {act.asesores.map((a) => (
                      <tr key={a.id_sub_usuario} className={a.semana === 0 ? "bg-rose-50/40" : ""}>
                        <td className="px-2 py-1.5 font-semibold text-slate-800">
                          {a.nombre}
                          {!a.es_asesor && <span className="ml-1 text-[10px] text-slate-400 font-normal">(no está en la lista de asesores)</span>}
                        </td>
                        <td className="px-2 py-1.5 text-right">{num(a.abiertos)}</td>
                        <td className={`px-2 py-1.5 text-right ${a.sin_tocar ? "text-amber-700 font-semibold" : ""}`}>{num(a.sin_tocar)}</td>
                        <td className="px-2 py-1.5 text-right font-bold">{num(a.hoy)}</td>
                        <td className={`px-2 py-1.5 text-right font-bold ${a.semana === 0 ? "text-rose-700" : ""}`}>{num(a.semana)}</td>
                        <td className="px-2 py-1.5 text-right">{num(a.mes)}</td>
                        <td className="px-2 py-1.5 text-xs text-slate-600 whitespace-nowrap">
                          {a.ultimo ? fmtFechaHora(a.ultimo) : <span className="text-rose-700">Ninguno en 30 días</span>}
                        </td>
                      </tr>
                    ))}
                    {act.sin_asignar.abiertos > 0 && (
                      <tr className="text-slate-500">
                        <td className="px-2 py-1.5 italic">Sin asignar</td>
                        <td className="px-2 py-1.5 text-right">{num(act.sin_asignar.abiertos)}</td>
                        <td className="px-2 py-1.5 text-right">{num(act.sin_asignar.sin_tocar)}</td>
                        <td colSpan={4} />
                      </tr>
                    )}
                    {!act.asesores.length && (
                      <tr>
                        <td colSpan={7} className="px-2 py-6 text-center text-slate-500">No hay asesores en la lista.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                «Sin tocar» = casos asignados sin ningún seguimiento registrado desde que se abrieron. Solo cuenta lo que se guarda con
                «Registrar»: una conversación en el chat que no se registra no aparece aquí ni en Resultados.
              </p>
            </div>
          )}

          {/* Embudo por cohorte */}
          {vista === "embudo" && (
            <div className="bg-white rounded-xl border border-slate-200 p-3 md:p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-bold text-slate-800">Por qué están en riesgo <span className="text-slate-400 font-normal text-xs">· toca una para filtrar</span></div>
                {cohorte && (
                  <button onClick={() => setCohorte("")} className="text-xs font-semibold text-cyan-700 hover:underline">
                    Quitar filtro
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
                {data.cohortes.map((c) => {
                  const ui = COHORTE_UI[c.id] || COHORTE_UI.manual;
                  const activo = cohorte === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setCohorte(activo ? "" : c.id)}
                      title={c.descripcion}
                      className={`text-left rounded-lg p-2.5 md:p-3 ring-1 transition min-w-0 ${
                        activo ? "ring-2 ring-cyan-500 bg-cyan-50/40" : "ring-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`h-7 w-7 shrink-0 rounded-md flex items-center justify-center ring-1 ${ui.cls}`}>
                          <i className={`bx ${c.icon}`} />
                        </span>
                        <span className="text-xs font-bold text-slate-800 leading-tight">{c.label}</span>
                      </div>
                      {/* La explicación va escrita en la tarjeta, no solo en el
                          tooltip: el asesor tiene que saber qué significa cada
                          grupo sin adivinar. */}
                      <p className="mt-1.5 text-[11px] text-slate-500 leading-snug">{c.descripcion}</p>
                      <div className="mt-2 flex items-end justify-between">
                        <span className="text-xl md:text-2xl font-extrabold text-slate-900">{num(c.n)}</span>
                        <span className="text-[11px] text-slate-500">{money(c.monto)}/mes</span>
                      </div>
                      <div className="mt-2 h-1.5 bg-slate-100 rounded">
                        <div
                          className={`h-1.5 rounded ${ui.bar}`}
                          style={{ width: `${k.en_riesgo ? Math.max(3, (c.n / k.en_riesgo) * 100) : 0}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filtros + lista */}
          {vista === "embudo" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm min-w-0">
              <div className="flex items-center gap-2 flex-wrap p-3 border-b border-slate-100">
                {ASIGNACION.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAsignacion(a.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold ring-1 ${
                      asignacion === a.id ? "bg-cyan-600 text-white ring-cyan-600" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
                <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                  <input type="checkbox" checked={soloSinContacto} onChange={(e) => setSoloSinContacto(e.target.checked)} />
                  Solo sin contactar
                </label>
                <label
                  className="inline-flex items-center gap-1.5 text-xs text-slate-600"
                  title="Clientes cuyo WhatsApp también está en otra cuenta. En rojo: ya volvió con otra cuenta activa, no hay que contactarlo por esta."
                >
                  <input type="checkbox" checked={soloCompartido} onChange={(e) => setSoloCompartido(e.target.checked)} />
                  Mismo WhatsApp en otra cuenta
                  {data?.filas && (
                    <span className="text-slate-400">({data.filas.filter((f) => f.numero_compartido).length})</span>
                  )}
                </label>
                <label
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold"
                  title="El cliente contestó el mensaje automático y nadie le registró un seguimiento después. Ya levantó la mano: por aquí se empieza."
                >
                  <input type="checkbox" checked={soloRespondieron} onChange={(e) => setSoloRespondieron(e.target.checked)} />
                  Respondieron sin seguimiento
                  {data?.filas && (
                    <span className="text-emerald-600/70 font-normal">({data.filas.filter(respondioSinSeguimiento).length})</span>
                  )}
                </label>
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar empresa, email o teléfono"
                  className="w-full md:w-64 md:ml-auto px-3 py-1.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <span className="text-xs text-slate-500">{num(filas.length)} clientes</span>
              </div>

              {/* Tarjetas (móvil / tablet) */}
              <ul className="xl:hidden divide-y divide-slate-100">
                {visibles.map((f) => (
                  <li key={f.id_usuario} className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <button onClick={() => setDrawer(f.id_usuario)} className="font-semibold text-slate-900 hover:text-cyan-700 text-left text-sm">
                          {f.empresa || f.email || `Usuario ${f.id_usuario}`}
                        </button>
                        <div className="text-xs text-slate-500 truncate">{f.email}</div>
                      </div>
                      <BadgeCohorte id={f.cohorte} cohortes={data.cohortes} />
                    </div>
                    <Telefono f={f} compacto />
                    <div className="text-xs text-slate-600 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>
                        {VERBO_COHORTE[f.cohorte]} <b>{relDias(f.dias)}</b> · {fmtFechaCorta(f.fecha_clave)}
                      </span>
                      <span>{f.nombre_plan || "—"}{f.precio_plan != null ? ` · ${money(f.precio_plan)}/mes` : ""}</span>
                    </div>
                    <div className="text-xs">
                      {f.ultimo_seguimiento ? (
                        <span className="text-slate-700">
                          Último: {RESULTADO_LABEL[f.ultimo_seguimiento.resultado] || f.ultimo_seguimiento.tipo} · {fmtFechaCorta(f.ultimo_seguimiento.fecha)} · {f.ultimo_seguimiento.por || "—"}
                        </span>
                      ) : f.automatizacion ? (
                        <ContactoAutomatico a={f.automatizacion} />
                      ) : (
                        <span className="text-amber-700 font-semibold"><i className="bx bx-phone-off" /> Nunca contactado</span>
                      )}
                      {f.proximo_contacto && (
                        <div className={f.proximo_vencido ? "text-rose-600 font-semibold" : "text-slate-700"}>
                          {f.promesa_pago ? "🤝 Prometió pagar " : "Próximo contacto "}
                          {fmtFecha(f.proximo_contacto)}{f.proximo_vencido && " (atrasado)"}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <Asesor f={f} permisos={permisos} asignables={data.asignables || []} onTomar={() => tomar(f)} onReasignar={(id) => reasignar(f, id)} />
                      <Acciones {...accionesDe(f)} />
                    </div>
                  </li>
                ))}
                {!visibles.length && <li className="px-3 py-10 text-center text-slate-500">Nadie en riesgo con este filtro. 🎉</li>}
              </ul>

              {/* Tabla (pantallas grandes) */}
              <div className="hidden xl:block overflow-x-auto">
                <table className="w-full text-sm table-fixed">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="text-left px-3 py-2 w-[24%]">Cliente y número</th>
                      <th className="text-left px-3 py-2 w-[18%]">Situación y plan</th>
                      <th className="text-left px-3 py-2 w-[20%]">Seguimiento</th>
                      <th className="text-left px-3 py-2 w-[13%]">Asesor</th>
                      <th className="text-right px-3 py-2 w-[25%]">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibles.map((f) => {
                      const u = f.ultimo_seguimiento;
                      const urgente = f.dias != null && f.dias <= 3 && f.dias >= -3;
                      return (
                        <tr key={f.id_usuario} className="hover:bg-slate-50 align-top">
                          <td className="px-3 py-2.5 min-w-0">
                            <button onClick={() => setDrawer(f.id_usuario)} className="font-semibold text-slate-900 hover:text-cyan-700 text-left truncate max-w-full block">
                              {f.empresa || f.email || `Usuario ${f.id_usuario}`}
                            </button>
                            <div className="text-xs text-slate-500 truncate">{f.email}</div>
                            <div className="mt-1"><Telefono f={f} compacto /></div>
                          </td>
                          <td className="px-3 py-2.5 text-xs">
                            <BadgeCohorte id={f.cohorte} cohortes={data.cohortes} />
                            <div className={`mt-1 ${urgente ? "text-rose-600 font-semibold" : "text-slate-600"}`}>
                              {VERBO_COHORTE[f.cohorte]} {relDias(f.dias)} <span className="text-slate-400">· {fmtFechaCorta(f.fecha_clave)}</span>
                            </div>
                            <div className="text-slate-500 truncate">
                              {f.nombre_plan || "—"}{f.precio_plan != null ? ` · ${money(f.precio_plan)}/mes` : ""}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-xs">
                            {u ? (
                              <>
                                <div className="text-slate-800 truncate">
                                  <i className={`bx ${TIPO_MAP[u.tipo]?.icon || "bx-message"} mr-1 text-slate-500`} />
                                  {RESULTADO_LABEL[u.resultado] || TIPO_MAP[u.tipo]?.label || u.tipo}
                                </div>
                                <div className="text-slate-500 truncate">{fmtFechaCorta(u.fecha)} · {u.por || "—"} · {num(f.total_seguimientos)} en total</div>
                              </>
                            ) : f.automatizacion ? (
                              <ContactoAutomatico a={f.automatizacion} />
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-700 font-semibold"><i className="bx bx-phone-off" /> Nunca contactado</span>
                            )}
                            {f.proximo_contacto ? (
                              <div className={`mt-0.5 ${f.proximo_vencido ? "text-rose-600 font-semibold" : "text-slate-700"}`}>
                                {f.promesa_pago ? "🤝 Prometió pagar " : "Próximo "}{fmtFecha(f.proximo_contacto)}{f.proximo_vencido && " (atrasado)"}
                              </div>
                            ) : (
                              <div className="text-slate-400 mt-0.5">Sin próximo contacto</div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-xs">
                            <Asesor f={f} permisos={permisos} asignables={data.asignables || []} onTomar={() => tomar(f)} onReasignar={(id) => reasignar(f, id)} />
                          </td>
                          <td className="px-3 py-2.5">
                            <Acciones {...accionesDe(f)} />
                          </td>
                        </tr>
                      );
                    })}
                    {!visibles.length && (
                      <tr>
                        <td colSpan={5} className="px-3 py-10 text-center text-slate-500">Nadie en riesgo con este filtro. 🎉</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Paginador
                pagina={paginaActual}
                totalPaginas={totalPaginas}
                total={filas.length}
                porPagina={POR_PAGINA}
                onCambio={setPagina}
              />

              {/* Casos cerrados que coinciden con la búsqueda: el cliente ya no
                  está en riesgo (o ya se perdió) y por eso no sale arriba. */}
              {historial.length > 0 && (
                <div className="border-t border-slate-200 bg-slate-50/60 p-3">
                  <div className="text-xs font-bold text-slate-700 mb-2 inline-flex items-center gap-1">
                    <i className="bx bx-history" /> Historial: casos cerrados que coinciden con «{busqueda.trim()}»
                  </div>
                  <ul className="divide-y divide-slate-200">
                    {historial.map((h) => {
                      const est = ESTADO_CASO[h.estado_caso] || ESTADO_CASO.descartado;
                      const sinTrabajo = !!h.id_caso && h.seguimientos_caso === 0;
                      return (
                        <li key={h.id_usuario} className="py-2 flex flex-wrap items-start gap-x-5 gap-y-1 text-xs">
                          <div className="min-w-[180px]">
                            <button onClick={() => setDrawer(h.id_usuario)} className="font-semibold text-slate-900 hover:text-cyan-700 text-left text-sm">
                              {h.empresa || h.email || `Usuario ${h.id_usuario}`}
                            </button>
                            <div className="text-slate-500">{h.email}</div>
                          </div>
                          <div className="min-w-[220px]">
                            {h.id_caso ? (
                              <>
                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ring-1 ${est.cls}`}>{est.label}</span>
                                {h.estado_final_label && <span className="ml-1 text-slate-600 italic">{h.estado_final_label}</span>}
                                <div className="text-slate-500 mt-0.5">
                                  Entró por {h.cohorte_label} el {fmtFechaCorta(h.abierto_en)}
                                  {h.cerrado_en && (
                                    <>
                                      {" "}· cerrado {fmtFechaHora(h.cerrado_en)} por {h.cerrado_por || "—"}
                                    </>
                                  )}
                                </div>
                              </>
                            ) : (
                              <span className="text-slate-500">Nunca estuvo en el embudo</span>
                            )}
                          </div>
                          <div className="text-slate-600">
                            <div>
                              Asesor: <b>{h.asignado_a_nombre || "sin asignar"}</b>
                              {h.asignado_en && <> desde {fmtFechaCorta(h.asignado_en)}</>}
                            </div>
                            <div className={sinTrabajo ? "text-rose-700 font-semibold" : ""}>
                              {num(h.seguimientos_caso)} seguimiento(s) en el caso · {num(h.automatizaciones_enviadas)} mensaje(s) automático(s)
                            </div>
                          </div>
                          <div className="text-slate-500 ml-auto text-right">
                            Cuenta hoy: <b>{h.estado}</b>
                            {h.stripe_status && <> · Stripe {h.stripe_status}</>}
                            {h.canceled_at && <div>Pidió cancelar el {fmtFechaCorta(h.canceled_at)}</div>}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}

          {vista === "agenda" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                {ASIGNACION.filter((a) => a.id !== "sin").map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAsignacion(a.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold ring-1 ${
                      asignacion === a.id ? "bg-cyan-600 text-white ring-cyan-600" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
                <span className="text-xs text-slate-500">
                  {num(agenda.sinFecha)} en riesgo sin próximo contacto agendado
                </span>
              </div>
              {[
                { titulo: "Atrasados", icon: "bx-alarm-exclamation", tono: "rose", filas: agenda.vencidos, vacio: "Nada atrasado." },
                { titulo: "Para hoy", icon: "bx-calendar-event", tono: "amber", filas: agenda.hoy, vacio: "Nada agendado para hoy." },
                { titulo: "Próximos 7 días", icon: "bx-calendar", tono: "cyan", filas: agenda.proximos, vacio: "Sin contactos en la semana." },
              ].map((b) => (
                <BloqueAgenda key={b.titulo} {...b} cohortes={data.cohortes} accionesDe={accionesDe} />
              ))}
            </div>
          )}
        </div>
      )}

      {drawer && (
        <DrawerClienteRecuperacion
          id_usuario={drawer}
          permisos={permisos}
          expertos={expertos}
          onClose={() => setDrawer(null)}
          onCambio={() => cargar(true)}
        />
      )}
      {form && (
        <FormSeguimiento
          id_usuario={form.id_usuario}
          cliente_nombre={form.empresa || form.email}
          onClose={() => setForm(null)}
          onSaved={() => cargar(true)}
        />
      )}
    </div>
  );
}

function Paginador({ pagina, totalPaginas, total, porPagina, onCambio }) {
  if (total <= porPagina) {
    return (
      <div className="px-3 py-2 border-t border-slate-100 text-xs text-slate-500">
        {num(total)} cliente{total === 1 ? "" : "s"}
      </div>
    );
  }
  const desde = (pagina - 1) * porPagina + 1;
  const hasta = Math.min(pagina * porPagina, total);
  // Números cercanos a la página actual + primera y última
  const nums = new Set([1, totalPaginas, pagina - 1, pagina, pagina + 1].filter((n) => n >= 1 && n <= totalPaginas));
  const lista = [...nums].sort((a, b) => a - b);
  return (
    <div className="px-3 py-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-600">
      <span>
        Mostrando <b>{desde}–{hasta}</b> de <b>{num(total)}</b> clientes
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onCambio(Math.max(1, pagina - 1))}
          disabled={pagina === 1}
          className="px-2 py-1 rounded ring-1 ring-slate-200 hover:bg-slate-100 disabled:opacity-40"
        >
          <i className="bx bx-chevron-left" /> Anterior
        </button>
        {lista.map((n, i) => (
          <span key={n} className="flex items-center gap-1">
            {i > 0 && lista[i - 1] !== n - 1 && <span className="px-1 text-slate-400">…</span>}
            <button
              onClick={() => onCambio(n)}
              className={`min-w-[28px] px-2 py-1 rounded ring-1 ${
                n === pagina ? "bg-cyan-600 text-white ring-cyan-600 font-bold" : "ring-slate-200 hover:bg-slate-100"
              }`}
            >
              {n}
            </button>
          </span>
        ))}
        <button
          onClick={() => onCambio(Math.min(totalPaginas, pagina + 1))}
          disabled={pagina === totalPaginas}
          className="px-2 py-1 rounded ring-1 ring-slate-200 hover:bg-slate-100 disabled:opacity-40"
        >
          Siguiente <i className="bx bx-chevron-right" />
        </button>
      </div>
    </div>
  );
}

function BloqueAgenda({ titulo, icon, tono, filas, vacio, cohortes, accionesDe }) {
  const tonos = {
    rose: "text-rose-700 bg-rose-50 ring-rose-200",
    amber: "text-amber-700 bg-amber-50 ring-amber-200",
    cyan: "text-cyan-700 bg-cyan-50 ring-cyan-200",
  }[tono];
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
        <span className={`h-8 w-8 rounded-lg flex items-center justify-center ring-1 ${tonos}`}>
          <i className={`bx ${icon}`} />
        </span>
        <div className="text-sm font-bold text-slate-800">{titulo}</div>
        <span className="text-xs text-slate-500">({num(filas.length)})</span>
      </div>
      {filas.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-500">{vacio}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {filas.map((f) => {
            const acc = accionesDe(f);
            return (
              <li key={f.id_usuario} className="px-4 py-3 flex items-center gap-3 flex-wrap">
                <div className="min-w-[130px] text-xs">
                  <div className="font-bold text-slate-900">{fmtFecha(f.proximo_contacto)}</div>
                  <div className={f.promesa_pago ? "text-emerald-700 font-semibold" : "text-slate-500"}>
                    {f.promesa_pago ? "🤝 Promesa de pago" : "Contacto agendado"}
                  </div>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <button onClick={acc.onAbrir} className="font-semibold text-slate-900 hover:text-cyan-700 text-sm">
                    {f.empresa || f.email}
                  </button>
                  <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                    <BadgeCohorte id={f.cohorte} cohortes={cohortes} />
                    {f.ultimo_seguimiento?.asunto && <span>· {f.ultimo_seguimiento.asunto}</span>}
                    {f.caso?.asignado_a_nombre && <span>· {f.caso.es_mio ? "tuyo" : f.caso.asignado_a_nombre}</span>}
                  </div>
                  <div className="mt-0.5"><Telefono f={f} compacto /></div>
                </div>
                <Acciones {...acc} mostrarCerrar={false} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
