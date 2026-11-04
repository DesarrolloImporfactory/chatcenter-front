import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import { toast } from "react-hot-toast";
import chatApi from "../../api/chatcenter";
import { temaDe, esColor, FONDO_INICIAL, ACENTO_INICIAL } from "../agendar/tema";

/**
 * PanelAgendaPublica — configuración de la agenda pública de una cuenta.
 *
 * Lo usa cada negocio desde Calendario → «Agenda pública» (modo "cuenta",
 * endpoints /agenda_publica/mi/*) y el super admin para la agenda principal
 * de ImporChat (/administrador-agenda, modo "admin", endpoints /admin/*).
 *
 * Distribución: arriba el enlace con su estado y la vista previa; a la
 * izquierda lo que configura la cita (horario, cómo es, confirmación por
 * WhatsApp); a la derecha quién atiende y la cuenta de Google de la agenda;
 * abajo las últimas reservas. Los cambios de configuración se guardan con una
 * sola barra que aparece cuando hay algo pendiente.
 */

const DIAS = [
  { v: 1, l: "Lun" },
  { v: 2, l: "Mar" },
  { v: 3, l: "Mié" },
  { v: 4, l: "Jue" },
  { v: 5, l: "Vie" },
  { v: 6, l: "Sáb" },
  { v: 0, l: "Dom" },
];

const ZONAS = [
  "America/Guayaquil",
  "America/Bogota",
  "America/Lima",
  "America/Mexico_City",
  "America/Santiago",
  "America/Argentina/Buenos_Aires",
  "America/Guatemala",
  "America/Panama",
  "America/Costa_Rica",
  "Europe/Madrid",
];

const ORIGEN_LABEL = { modal: "Modal de arranque", home: "Landing /home", enlace: "Enlace" };

const ESTADO_PLANTILLA = {
  APPROVED: { l: "Aprobada", c: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  PENDING: { l: "Pendiente", c: "bg-amber-50 text-amber-700 ring-amber-200" },
  REJECTED: { l: "Rechazada", c: "bg-rose-50 text-rose-600 ring-rose-200" },
  PAUSED: { l: "Pausada", c: "bg-slate-100 text-slate-600 ring-slate-200" },
  DISABLED: { l: "Deshabilitada", c: "bg-slate-100 text-slate-600 ring-slate-200" },
};

export const Tarjeta = ({ titulo, sub, icono, children, accion, className = "" }) => (
  <section className={`rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm ${className}`}>
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div className="flex items-start gap-3">
        {icono && (
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-[17px] text-slate-600">
            <i className={`bx ${icono}`} />
          </span>
        )}
        <div>
          <h2 className="text-[15px] font-bold text-slate-800">{titulo}</h2>
          {sub && <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-500">{sub}</p>}
        </div>
      </div>
      {accion}
    </header>
    <div className="px-5 py-4">{children}</div>
  </section>
);

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50 disabled:text-slate-500";
const btnDark =
  "inline-flex items-center gap-2 rounded-lg bg-[#0B1426] px-4 py-2 text-sm font-bold text-white hover:bg-[#162A4A] disabled:opacity-60";
const btnLight =
  "inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60";

const Etiqueta = ({ children }) => (
  <span className="mb-1 block text-[12.5px] font-semibold text-slate-600">{children}</span>
);

/* Fondos y acentos sugeridos en «Apariencia»; el primero de cada lista es el
   de ImporChat (lo que sale si no eligen nada). */
const FONDOS_SUGERIDOS = [FONDO_INICIAL, "#0f172a", "#052e16", "#1e1b4b", "#3b0a1a", "#111111", "#ffffff", "#f1f5f9", "#fef3c7", "#ecfdf5"];
const ACENTOS_SUGERIDOS = [ACENTO_INICIAL, "#25D366", "#2563eb", "#8b5cf6", "#ec4899", "#f97316", "#facc15", "#14b8a6"];

/* Selector de color: cuadro que abre el picker del navegador, hexadecimal a
   mano, sugerencias y «Restablecer» (vuelve al color de ImporChat). */
const ColorCampo = ({ label, hint, valor, porDefecto, sugeridos, disabled, onChange }) => {
  const actual = esColor(valor) ? valor : porDefecto;
  return (
    <div>
      <Etiqueta>{label}</Etiqueta>
      <div className="flex flex-wrap items-center gap-2">
        <label
          className={`relative h-9 w-9 shrink-0 overflow-hidden rounded-lg ring-1 ring-slate-300 ${disabled ? "opacity-60" : "cursor-pointer"}`}
          style={{ background: actual }}
          title="Elegir color"
        >
          <input type="color" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" value={actual} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
        </label>
        <input
          className={`${inputCls} w-28 font-mono uppercase`}
          value={valor || ""}
          placeholder={porDefecto}
          maxLength={7}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} en hexadecimal`}
        />
        <div className="flex flex-wrap gap-1.5">
          {sugeridos.map((c) => (
            <button
              key={c}
              type="button"
              disabled={disabled}
              title={c}
              onClick={() => onChange(c === porDefecto ? "" : c)}
              className={`h-6 w-6 rounded-full ring-2 ring-offset-1 transition ${actual.toLowerCase() === c.toLowerCase() ? "ring-sky-500" : "ring-transparent hover:ring-slate-300"}`}
              style={{ background: c, boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.12)" }}
            />
          ))}
        </div>
        {valor && !disabled && (
          <button type="button" onClick={() => onChange("")} className="text-[12px] font-semibold text-slate-500 hover:text-slate-800">
            Restablecer
          </button>
        )}
      </div>
      {hint && <span className="mt-1 block text-[12px] text-slate-500">{hint}</span>}
    </div>
  );
};

/* Muestra en vivo de la cabecera y de las horas con los colores elegidos,
   para no tener que guardar y abrir la vista previa por cada cambio. */
const MuestraTema = ({ config, negocio }) => {
  const t = temaDe(config);
  const velo = t.claro ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.1)";
  const borde = t.claro ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.14)";
  const tinta2 = t.vars["--agp-tinta-2"];
  const nombre = negocio || "Tu negocio";
  return (
    <div className="rounded-xl p-4 ring-1 ring-slate-200" style={{ background: t.fondo, color: t.vars["--agp-tinta"] }}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[13px] font-extrabold" style={{ background: velo, boxShadow: `inset 0 0 0 1px ${borde}` }}>
            {nombre.trim().charAt(0).toUpperCase()}
          </span>
          <span className="truncate text-[13px] font-bold">{nombre}</span>
        </span>
        {config.principal ? (
          <span className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ background: velo, boxShadow: `inset 0 0 0 1px ${borde}` }}>
            Meta Business Partner
          </span>
        ) : config.insignia ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ background: velo, boxShadow: `inset 0 0 0 1px ${borde}` }}>
            <i className="bx bxs-badge-check text-[13px]" style={{ color: t.acento }} /> {config.insignia}
          </span>
        ) : null}
      </div>
      <div className="mt-3 text-[17px] font-extrabold leading-tight">
        {config.titulo || "Agenda tu cita"}
        {!config.principal && (
          <span className="block" style={{ color: t.claro ? `color-mix(in srgb, ${t.acento} 80%, #0f172a)` : t.acento }}>
            con {nombre}.
          </span>
        )}
      </div>
      <div className="mt-1 text-[12px]" style={{ color: tinta2 }}>
        Elige el horario que mejor te quede.
      </div>
      <div className="mt-3 flex gap-1.5">
        {["09:00", "10:00", "11:00", "12:00"].map((h, i) => (
          <span
            key={h}
            className="rounded-md px-2.5 py-1 text-[11px] font-bold"
            style={i === 1 ? { background: t.acento, color: t.vars["--agp-sobre-acento"] } : { background: velo, boxShadow: `inset 0 0 0 1px ${borde}` }}
          >
            {h}
          </span>
        ))}
      </div>
    </div>
  );
};

const fmtFecha = (iso, tz) => {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es", {
      timeZone: tz || "America/Guayaquil",
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

/* Última cita que cabe con ese horario y duración: lo que el dueño necesita
   ver para entender por qué nadie puede agendar "a las 5". */
const ultimaCita = (inicio, fin, dur) => {
  const [hi, mi] = String(inicio || "00:00").split(":").map(Number);
  const [hf, mf] = String(fin || "00:00").split(":").map(Number);
  const d = Number(dur) || 0;
  const ultimo = hf * 60 + mf - d;
  if (!d || ultimo < hi * 60 + mi) return null;
  const h = Math.floor(ultimo / 60);
  const m = ultimo % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const nombreZona = (tz) =>
  ({
    "America/Guayaquil": "Ecuador",
    "America/Bogota": "Colombia",
    "America/Lima": "Perú",
    "America/Mexico_City": "México",
    "America/Santiago": "Chile",
    "America/Argentina/Buenos_Aires": "Argentina",
    "America/Guatemala": "Guatemala",
    "America/Panama": "Panamá",
    "America/Costa_Rica": "Costa Rica",
    "Europe/Madrid": "España",
  })[tz] || tz;

/* Texto de WhatsApp con negritas (*x*), cursivas (_x_) y variables
   reemplazadas por valores de ejemplo, para que se vea como le llegará. */
const renderWhatsapp = (texto, valores) => {
  const conValores = String(texto || "").replace(/\{\{(\d+)\}\}/g, (_, n) => valores[Number(n)] ?? `{{${n}}}`);
  const partes = conValores.split(/(\*[^*\n]+\*|_[^_\n]+_)/g);
  return partes.map((p, i) => {
    if (/^\*[^*\n]+\*$/.test(p)) return <b key={i}>{p.slice(1, -1)}</b>;
    if (/^_[^_\n]+_$/.test(p)) return <i key={i}>{p.slice(1, -1)}</i>;
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
};

const EstadoGoogle = ({ a }) => {
  if (!a.google_vinculado)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
        <i className="bx bx-minus-circle" /> Sin Google
      </span>
    );
  if (a.google_calendario === false)
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200"
        title="Al vincular no aceptó el permiso de calendario: debe volver a vincular Google desde Calendario y aceptar todos los permisos"
      >
        <i className="bx bx-error" /> {a.google_email} · sin permiso de calendario
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
      <i className="bx bx-check-circle" /> {a.google_email}
    </span>
  );
};

/* Vista previa de la página pública dentro del panel (iframe con ?previa=1:
   se ve aunque la agenda esté apagada y no deja reservar). */
const VistaPrevia = ({ url, onCerrar }) => {
  const [ancho, setAncho] = useState("desktop");
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onCerrar]);
  return (
    <div className="fixed inset-0 z-[1200] flex flex-col bg-slate-900/80 backdrop-blur-sm" onClick={onCerrar}>
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-cyan-300/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-cyan-200 ring-1 ring-cyan-300/40">
            Vista previa
          </span>
          <span className="hidden text-[13px] text-slate-300 sm:inline">Así ve tu agenda quien abre el enlace. Aquí no se reservan citas.</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden overflow-hidden rounded-lg bg-white/10 text-[12px] font-bold md:flex">
            {[
              ["desktop", "bx-desktop", "Computador"],
              ["mobile", "bx-mobile-alt", "Celular"],
            ].map(([v, ic, l]) => (
              <button key={v} onClick={() => setAncho(v)} className={`flex items-center gap-1 px-3 py-1.5 ${ancho === v ? "bg-white text-slate-900" : "text-white hover:bg-white/10"}`}>
                <i className={`bx ${ic}`} /> {l}
              </button>
            ))}
          </div>
          <a href={url.replace("?previa=1", "")} target="_blank" rel="noreferrer" className="rounded-lg bg-white/10 px-3 py-1.5 text-[12px] font-bold hover:bg-white/20">
            <i className="bx bx-link-external" /> Abrir en pestaña
          </a>
          <button onClick={onCerrar} className="rounded-lg bg-white/10 px-3 py-1.5 text-[12px] font-bold hover:bg-white/20">
            <i className="bx bx-x" /> Cerrar
          </button>
        </div>
      </div>
      <div className="flex flex-1 items-start justify-center overflow-hidden px-4 pb-4" onClick={(e) => e.stopPropagation()}>
        <iframe
          title="Vista previa de la agenda"
          src={url}
          className="h-full rounded-xl bg-[#06111f] shadow-2xl ring-1 ring-white/10 transition-all"
          style={{ width: ancho === "mobile" ? 400 : "100%", maxWidth: 1280 }}
        />
      </div>
    </div>
  );
};

export default function PanelAgendaPublica({ idConfiguracion = null, modo = "cuenta", onCargado }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [configBase, setConfigBase] = useState(null);
  const [asesores, setAsesores] = useState([]);
  const [guardando, setGuardando] = useState(null);
  const [plantillas, setPlantillas] = useState(null); // { estado, plantillas, error }
  const [previa, setPrevia] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(null);
  const [eleccionGoogle, setEleccionGoogle] = useState("");
  const popupRef = useRef(null);

  const base = modo === "admin" ? "agenda_publica/admin" : "agenda_publica/mi";
  const params = modo === "admin" ? {} : { id_configuracion: idConfiguracion };

  const cargar = useCallback(
    async (silencioso = false) => {
      if (modo !== "admin" && !idConfiguracion) return;
      if (!silencioso) setLoading(true);
      try {
        const { data: r } = await chatApi.get(`${base}/resumen`, { params });
        const d = r?.data || null;
        setData(d);
        setConfig(d?.config || null);
        setConfigBase(d?.config || null);
        setAsesores(d?.asesores || []);
        onCargado?.(d);
      } catch (e) {
        Swal.fire("Error", e?.response?.data?.message || "No se pudo cargar la agenda", "error");
      } finally {
        if (!silencioso) setLoading(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [base, idConfiguracion, modo],
  );

  useEffect(() => {
    cargar();
  }, [cargar]);

  /* Plantillas de Meta: se piden una vez por carga del panel. */
  useEffect(() => {
    if (!data) return;
    let vivo = true;
    chatApi
      .get(`${base}/plantillas`, { params })
      .then(({ data: r }) => vivo && setPlantillas(r?.data || { estado: "ERROR", plantillas: [] }))
      .catch((e) => vivo && setPlantillas({ estado: "ERROR", plantillas: [], error: e?.response?.data?.message || e.message }));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.cuenta?.id]);

  const puedeEditar = data?.puede_editar !== false;
  const enlacePublico = config?.slug ? `${window.location.origin}/agendar/${config.slug}` : `${window.location.origin}/agendar`;
  const enlaceVisible = config?.principal ? `${window.location.origin}/agendar` : enlacePublico;
  const urlPrevia = `${config?.principal ? `${window.location.origin}/agendar` : enlacePublico}?previa=1`;

  const diasSet = useMemo(() => new Set(String(config?.dias || "").split(",").map((d) => Number(d))), [config?.dias]);

  const CAMPOS_CONFIG = [
    "activo",
    "slug",
    "calendar_id",
    "duracion_min",
    "hora_inicio",
    "hora_fin",
    "dias",
    "anticipacion_horas",
    "dias_adelante",
    "time_zone",
    "titulo",
    "descripcion",
    "lugar",
    "insignia",
    "color_fondo",
    "color_acento",
    "plantilla_confirmacion",
  ];
  const hayCambios = useMemo(() => {
    if (!config || !configBase) return false;
    if (data?.nueva) return true;
    return CAMPOS_CONFIG.some((k) => String(config[k] ?? "") !== String(configBase[k] ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, configBase, data?.nueva]);

  const toggleDia = (v) => {
    const s = new Set(diasSet);
    if (s.has(v)) s.delete(v);
    else s.add(v);
    setConfig((c) => ({ ...c, dias: [...s].sort().join(",") }));
  };

  const guardarConfig = async () => {
    setGuardando("config");
    try {
      const body = {
        ...params,
        activo: !!Number(config.activo),
        slug: config.slug,
        calendar_id: Number(config.calendar_id) || undefined,
        duracion_min: Number(config.duracion_min),
        hora_inicio: config.hora_inicio,
        hora_fin: config.hora_fin,
        dias: config.dias,
        anticipacion_horas: Number(config.anticipacion_horas),
        dias_adelante: Number(config.dias_adelante),
        time_zone: config.time_zone,
        titulo: config.titulo,
        descripcion: config.descripcion || "",
        lugar: config.lugar || "",
        insignia: config.insignia || "",
        color_fondo: config.color_fondo || "",
        color_acento: config.color_acento || "",
        plantilla_confirmacion: config.plantilla_confirmacion || "",
      };
      const { data: r } = await chatApi.post(`${base}/config`, body);
      const nueva = r?.data || config;
      setConfig(nueva);
      setConfigBase(nueva);
      toast.success("Agenda guardada");
      if (data?.nueva) cargar(true);
    } catch (e) {
      Swal.fire("No se guardó", e?.response?.data?.message || "Revisa los datos", "error");
    } finally {
      setGuardando(null);
    }
  };

  const descartar = () => setConfig(configBase);

  const toggleAsesor = (id) => {
    setAsesores((lista) => lista.map((a) => (a.id_sub_usuario === id ? { ...a, en_lista: a.en_lista ? 0 : 1 } : a)));
  };

  const guardarAsesores = async () => {
    setGuardando("asesores");
    try {
      const lista = asesores
        .filter((a) => a.en_lista != null)
        .map((a, i) => ({ id_sub_usuario: a.id_sub_usuario, activo: !!a.en_lista, orden: i }));
      await chatApi.post(`${base}/asesores`, { ...params, asesores: lista });
      toast.success("Equipo actualizado");
      cargar(true);
    } catch (e) {
      Swal.fire("No se guardó", e?.response?.data?.message || "Revisa la lista", "error");
    } finally {
      setGuardando(null);
    }
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(enlaceVisible);
      toast.success("Enlace copiado");
    } catch {
      Swal.fire("Enlace", enlaceVisible, "info");
    }
  };

  /* ── Google de la agenda ── */
  const usarGoogle = async (link_id) => {
    setGoogleBusy("usar");
    try {
      const { data: r } = await chatApi.post(`${base}/google/usar`, { ...params, link_id: link_id || undefined });
      toast.success(`Las invitaciones saldrán desde ${r?.data?.email || "esa cuenta"}`);
      await cargar(true);
    } catch (e) {
      Swal.fire("No se pudo usar esa cuenta", e?.response?.data?.message || "Intenta de nuevo", "error");
    } finally {
      setGoogleBusy(null);
    }
  };

  const conectarGoogle = async () => {
    if (!config?.calendar_id) {
      Swal.fire("Calendario", "Primero elige el calendario donde caen las citas y guarda.", "info");
      return;
    }
    const ok = await Swal.fire({
      title: "Conectar una cuenta de Google",
      html:
        "Se abrirá Google para que inicies sesión con la cuenta desde la que quieres enviar las invitaciones " +
        "(por ejemplo la cuenta comercial del negocio).<br/><br/>" +
        "<b>Acepta todos los permisos</b>, incluido «ver y editar calendarios»; sin ese permiso las citas no llegan a Google.<br/><br/>" +
        "<span style='font-size:12.5px;color:#64748b'>Esa cuenta quedará como tu vínculo de Google en este calendario y reemplaza el que tengas ahora.</span>",
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "Continuar",
      cancelButtonText: "Cancelar",
    });
    if (!ok.isConfirmed) return;
    setGoogleBusy("conectar");
    try {
      const { data: r } = await chatApi.get("/google/auth-url", { params: { calendar_id: config.calendar_id } });
      const url = r?.url;
      if (!url) throw new Error("URL no recibida");
      const w = window.open(url, "gcalOAuthAgenda", "width=520,height=680");
      if (!w) {
        window.location.href = url;
        return;
      }
      popupRef.current = w;
      await new Promise((resolve) => {
        const t = setInterval(() => {
          if (w.closed) {
            clearInterval(t);
            resolve();
          }
        }, 600);
      });
      await usarGoogle(null); // el vínculo recién creado del sub-usuario de la sesión
    } catch (e) {
      Swal.fire("Google", e?.response?.data?.message || e.message || "No se pudo conectar", "error");
    } finally {
      setGoogleBusy(null);
    }
  };

  const importarGoogle = async () => {
    setGoogleBusy("importar");
    try {
      const { data: r } = await chatApi.post(`${base}/google/importar`, params);
      const d = r?.data || {};
      Swal.fire(
        "Reuniones traídas",
        `Entraron ${d.nuevas ?? 0} reuniones nuevas desde ${d.google_email || "Google"}. ` +
          `En el calendario hay ${d.futuras ?? 0} futuras de esa cuenta; la agenda pública ya no ofrece esas horas.`,
        "success",
      );
      cargar(true);
    } catch (e) {
      Swal.fire("No se pudo importar", e?.response?.data?.message || "Intenta de nuevo", "error");
    } finally {
      setGoogleBusy(null);
    }
  };

  const quitarGoogle = async () => {
    const ok = await Swal.fire({
      title: "¿Quitar la cuenta de Google de la agenda?",
      text: "Las nuevas citas volverán a salir desde el Google de la persona que atiende. Lo ya importado se queda en el calendario.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Quitar",
      cancelButtonText: "Cancelar",
    });
    if (!ok.isConfirmed) return;
    setGoogleBusy("quitar");
    try {
      await chatApi.post(`${base}/google/quitar`, params);
      cargar(true);
    } catch (e) {
      Swal.fire("Error", e?.response?.data?.message || "Intenta de nuevo", "error");
    } finally {
      setGoogleBusy(null);
    }
  };

  if (loading || !config) {
    return (
      <div className="py-16 text-center text-slate-500">
        <i className="bx bx-loader-alt bx-spin text-3xl" />
      </div>
    );
  }

  const enLista = asesores.filter((a) => a.en_lista != null);
  const fuera = asesores.filter((a) => a.en_lista == null && !a.suspendido);
  const activos = enLista.filter((a) => a.en_lista === 1);
  const reservas = data?.reservas || [];
  const tz = config?.time_zone;
  const ultima = ultimaCita(config.hora_inicio, config.hora_fin, config.duracion_min);
  const activa = !!Number(config.activo);
  const listaParaRecibir = activos.length > 0;
  const google = data?.google || { vinculo: null, opciones: [], mio: null };
  const vinculo = google.vinculo;
  const opcionesGoogle = (google.opciones || []).filter((o) => !vinculo || Number(o.id) !== Number(vinculo.id));

  /* Plantilla elegida y su vista previa con datos de ejemplo. */
  const listaPlantillas = plantillas?.plantillas || [];
  const plantillaSel = listaPlantillas.find((p) => p.name === config.plantilla_confirmacion) || null;
  const ejemplo = {
    1: "María",
    2: "lunes 10 de noviembre",
    3: `10:00 (hora de ${nombreZona(tz)})`,
    4: config.lugar || "https://meet.google.com/abc-defg-hij",
    5: activos[0]?.nombre || "Juan Pérez",
  };

  const estadoAgenda = !activa
    ? { l: "Agenda apagada", c: "bg-slate-100 text-slate-600 ring-slate-200", i: "bx-pause-circle" }
    : !listaParaRecibir
      ? { l: "Falta elegir quién atiende", c: "bg-amber-50 text-amber-700 ring-amber-200", i: "bx-error" }
      : { l: "Recibiendo reservas", c: "bg-emerald-50 text-emerald-700 ring-emerald-200", i: "bx-check-circle" };

  return (
    <div className="space-y-5 pb-24">
      {previa && <VistaPrevia url={urlPrevia} onCerrar={() => setPrevia(false)} />}

      {/* ── Enlace, estado y vista previa ── */}
      <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm">
        <div className="grid gap-5 px-5 py-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Tu enlace para agendar</span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${estadoAgenda.c}`}>
                <i className={`bx ${estadoAgenda.i}`} /> {estadoAgenda.l}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="max-w-full truncate rounded-lg bg-slate-100 px-3 py-2 text-[13px] text-slate-700">{enlaceVisible}</code>
              <button onClick={copiar} className={btnDark}>
                <i className="bx bx-copy" /> Copiar
              </button>
              <button onClick={() => setPrevia(true)} className={btnLight}>
                <i className="bx bx-show" /> Vista previa
              </button>
              <a href={enlaceVisible} target="_blank" rel="noreferrer" className={btnLight}>
                <i className="bx bx-link-external" /> Abrir
              </a>
            </div>
            {!config.principal && (
              <div className="mt-3 flex max-w-lg items-center overflow-hidden rounded-lg border border-slate-200 text-sm focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100">
                <span className="shrink-0 bg-slate-50 px-3 py-2 text-[13px] text-slate-500">{window.location.host}/agendar/</span>
                <input
                  className="w-full px-2 py-2 text-sm outline-none disabled:bg-slate-50"
                  value={config.slug || ""}
                  disabled={!puedeEditar}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 60) }))
                  }
                  placeholder="mi-negocio"
                  title="Letras, números y guiones. Si lo cambias, el enlace anterior deja de funcionar."
                />
              </div>
            )}
            <p className="mt-2 text-[12.5px] text-slate-500">
              Compártelo en WhatsApp, redes o tu web. Quien entre elige día y hora y la cita cae en{" "}
              <b className="text-slate-700">{data?.cuenta?.agenda || "tu calendario"}</b>.
            </p>
          </div>

          <label className={`flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 ring-1 ${activa ? "bg-emerald-50 ring-emerald-200" : "bg-slate-50 ring-slate-200"}`}>
            <span className={`relative inline-block h-6 w-11 rounded-full transition ${activa ? "bg-emerald-500" : "bg-slate-300"}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${activa ? "left-[22px]" : "left-0.5"}`} />
            </span>
            <input type="checkbox" className="sr-only" checked={activa} disabled={!puedeEditar} onChange={(e) => setConfig((c) => ({ ...c, activo: e.target.checked ? 1 : 0 }))} />
            <span>
              <span className="block text-sm font-bold text-slate-800">{activa ? "Agenda activa" : "Agenda apagada"}</span>
              <span className="block text-[12px] text-slate-500">{activa ? "El enlace recibe reservas" : "El enlace muestra «no disponible»"}</span>
            </span>
          </label>
        </div>
        {data?.nueva && (
          <div className="border-t border-sky-100 bg-sky-50 px-5 py-2.5 text-[12.5px] text-sky-800">
            <i className="bx bx-info-circle align-[-2px]" /> Todavía no has guardado tu agenda. Revisa el horario, elige quién atiende y pulsa «Guardar cambios» para activar el enlace.
          </div>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        {/* ══════════ Columna principal ══════════ */}
        <div className="space-y-5">
          {/* Horario */}
          <Tarjeta
            icono="bx-time-five"
            titulo="Horario y duración"
            sub="Las citas se ofrecen entre apertura y cierre, en tu zona horaria. La última cita termina a la hora de cierre."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block text-sm">
                <Etiqueta>Apertura</Etiqueta>
                <input type="time" className={inputCls} disabled={!puedeEditar} value={config.hora_inicio} onChange={(e) => setConfig((c) => ({ ...c, hora_inicio: e.target.value }))} />
              </label>
              <label className="block text-sm">
                <Etiqueta>Cierre</Etiqueta>
                <input type="time" className={inputCls} disabled={!puedeEditar} value={config.hora_fin} onChange={(e) => setConfig((c) => ({ ...c, hora_fin: e.target.value }))} />
              </label>
              <label className="block text-sm">
                <Etiqueta>Duración (minutos)</Etiqueta>
                <input type="number" min={10} max={240} step={5} className={inputCls} disabled={!puedeEditar} value={config.duracion_min} onChange={(e) => setConfig((c) => ({ ...c, duracion_min: e.target.value }))} />
              </label>
            </div>
            <div className={`mt-3 rounded-lg px-3 py-2 text-[12.5px] ring-1 ${ultima ? "bg-slate-50 text-slate-600 ring-slate-200" : "bg-rose-50 text-rose-700 ring-rose-200"}`}>
              {ultima ? (
                <>
                  <i className="bx bx-info-circle align-[-2px]" /> Primera cita a las <b className="text-slate-800">{config.hora_inicio}</b>, última a las{" "}
                  <b className="text-slate-800">{ultima}</b> (termina a las {config.hora_fin}). Nadie puede agendar después.
                </>
              ) : (
                <>
                  <i className="bx bx-error align-[-2px]" /> Entre apertura y cierre no cabe una cita de esa duración.
                </>
              )}
            </div>

            <div className="mt-5">
              <Etiqueta>Días de atención</Etiqueta>
              <div className="flex flex-wrap gap-2">
                {DIAS.map((d) => (
                  <button
                    key={d.v}
                    type="button"
                    disabled={!puedeEditar}
                    onClick={() => toggleDia(d.v)}
                    className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 transition ${diasSet.has(d.v) ? "bg-[#0B1426] text-white ring-[#0B1426]" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"}`}
                  >
                    {d.l}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <label className="block text-sm">
                <Etiqueta>Anticipación mínima (horas)</Etiqueta>
                <input type="number" min={0} max={168} className={inputCls} disabled={!puedeEditar} value={config.anticipacion_horas} onChange={(e) => setConfig((c) => ({ ...c, anticipacion_horas: e.target.value }))} />
                <span className="mt-1 block text-[12px] text-slate-500">No se ofrece nada antes de este tiempo desde ahora.</span>
              </label>
              <label className="block text-sm">
                <Etiqueta>Días hacia adelante</Etiqueta>
                <input type="number" min={1} max={60} className={inputCls} disabled={!puedeEditar} value={config.dias_adelante} onChange={(e) => setConfig((c) => ({ ...c, dias_adelante: e.target.value }))} />
                <span className="mt-1 block text-[12px] text-slate-500">Hasta cuándo se puede agendar.</span>
              </label>
              <label className="block text-sm">
                <Etiqueta>Zona horaria</Etiqueta>
                <select className={inputCls} disabled={!puedeEditar} value={config.time_zone} onChange={(e) => setConfig((c) => ({ ...c, time_zone: e.target.value }))}>
                  {[...new Set([config.time_zone, ...ZONAS])].map((z) => (
                    <option key={z} value={z}>
                      {nombreZona(z)} · {z}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </Tarjeta>

          {/* Cómo es la cita */}
          <Tarjeta icono="bx-calendar-event" titulo="Cómo es la cita" sub="Lo que ve quien agenda y lo que queda en el calendario.">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <Etiqueta>Título de la cita</Etiqueta>
                <input className={inputCls} disabled={!puedeEditar} value={config.titulo} onChange={(e) => setConfig((c) => ({ ...c, titulo: e.target.value }))} maxLength={120} placeholder="Consulta, asesoría, demostración…" />
                <span className="mt-1 block text-[12px] text-slate-500">Va en el calendario, en la invitación y en los avisos.</span>
              </label>
              <label className="block text-sm">
                <Etiqueta>Calendario donde caen las citas</Etiqueta>
                <select className={inputCls} disabled={!puedeEditar} value={config.calendar_id || ""} onChange={(e) => setConfig((c) => ({ ...c, calendar_id: e.target.value }))}>
                  {(data?.calendarios || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  {!(data?.calendarios || []).length && <option value="">Sin calendario activo</option>}
                </select>
              </label>
              <label className="block text-sm sm:col-span-2">
                <Etiqueta>Texto que ve quien agenda</Etiqueta>
                <textarea className={inputCls} rows={2} disabled={!puedeEditar} value={config.descripcion || ""} onChange={(e) => setConfig((c) => ({ ...c, descripcion: e.target.value }))} maxLength={1000} placeholder="Qué incluye la cita, qué debe traer la persona, cuánto cuesta…" />
              </label>
              <div className="sm:col-span-2">
                <Etiqueta>Dónde se atiende</Etiqueta>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={!puedeEditar}
                    onClick={() => setConfig((c) => ({ ...c, lugar: "" }))}
                    className={`flex items-start gap-3 rounded-xl px-4 py-3 text-left ring-1 transition ${!config.lugar ? "bg-sky-50 ring-sky-300" : "bg-white ring-slate-200 hover:bg-slate-50"}`}
                  >
                    <i className="bx bx-video mt-0.5 text-[18px] text-sky-600" />
                    <span>
                      <span className="block text-sm font-bold text-slate-800">Videollamada</span>
                      <span className="block text-[12px] text-slate-500">Se crea un Google Meet y el enlace va en la invitación.</span>
                    </span>
                  </button>
                  <div className={`flex items-start gap-3 rounded-xl px-4 py-3 ring-1 transition ${config.lugar ? "bg-sky-50 ring-sky-300" : "bg-white ring-slate-200"}`}>
                    <i className="bx bx-map mt-0.5 text-[18px] text-sky-600" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-slate-800">Presencial</span>
                      <input
                        className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[13px] outline-none focus:border-sky-400 disabled:bg-slate-50"
                        disabled={!puedeEditar}
                        value={config.lugar || ""}
                        onChange={(e) => setConfig((c) => ({ ...c, lugar: e.target.value }))}
                        maxLength={200}
                        placeholder="Dirección: Av. Principal 123, consultorio 4"
                      />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Tarjeta>

          {/* Apariencia: insignia de la cabecera y colores de la página */}
          <Tarjeta icono="bx-palette" titulo="Apariencia" sub="Cómo se ve tu página de agenda. Los colores de ImporChat salen si no eliges nada.">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="grid gap-4">
                <label className="block text-sm">
                  <Etiqueta>Insignia en la cabecera</Etiqueta>
                  <input
                    className={inputCls}
                    disabled={!puedeEditar || !!config.principal}
                    value={config.principal ? "Meta Business Partner" : config.insignia || ""}
                    onChange={(e) => setConfig((c) => ({ ...c, insignia: e.target.value }))}
                    maxLength={60}
                    placeholder="Agencia certificada, Atención 24/7, 10 años de experiencia…"
                  />
                  <span className="mt-1 block text-[12px] text-slate-500">
                    {config.principal
                      ? "La agenda principal de ImporChat lleva el sello de Meta Business Partner."
                      : "Texto corto arriba a la derecha, junto al nombre del negocio. Déjalo vacío para no mostrar nada."}
                  </span>
                </label>
                <ColorCampo
                  label="Color de fondo"
                  hint="Con un fondo claro el texto pasa solo a oscuro."
                  valor={config.color_fondo || ""}
                  porDefecto={FONDO_INICIAL}
                  sugeridos={FONDOS_SUGERIDOS}
                  disabled={!puedeEditar}
                  onChange={(v) => setConfig((c) => ({ ...c, color_fondo: v }))}
                />
                <ColorCampo
                  label="Color de acento"
                  hint="Botón de confirmar, horas elegidas y días con cupo."
                  valor={config.color_acento || ""}
                  porDefecto={ACENTO_INICIAL}
                  sugeridos={ACENTOS_SUGERIDOS}
                  disabled={!puedeEditar}
                  onChange={(v) => setConfig((c) => ({ ...c, color_acento: v }))}
                />
              </div>
              <div>
                <Etiqueta>Así se ve</Etiqueta>
                <MuestraTema config={config} negocio={data?.cuenta?.nombre} />
                <span className="mt-1 block text-[12px] text-slate-500">Guarda y abre «Vista previa» para verla completa.</span>
              </div>
            </div>
          </Tarjeta>

          {/* Confirmación por WhatsApp */}
          <Tarjeta
            icono="bxl-whatsapp"
            titulo="Confirmación por WhatsApp"
            sub="Al reservar, la persona recibe al instante un mensaje con los datos de su cita. Elige una plantilla de tu cuenta de Meta."
          >
            {data?.cuenta && !data.cuenta.whatsapp ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800 ring-1 ring-amber-200">Esta cuenta no tiene WhatsApp conectado: no se puede confirmar por este canal.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-[1fr_300px]">
                <div>
                  <Etiqueta>Plantilla</Etiqueta>
                  {plantillas === null ? (
                    <div className="text-sm text-slate-500">
                      <i className="bx bx-loader-alt bx-spin" /> Cargando tus plantillas de Meta…
                    </div>
                  ) : (
                    <>
                      <select
                        className={inputCls}
                        disabled={!puedeEditar}
                        value={config.plantilla_confirmacion || ""}
                        onChange={(e) => setConfig((c) => ({ ...c, plantilla_confirmacion: e.target.value }))}
                      >
                        <option value="">Sin confirmación por WhatsApp</option>
                        {config.plantilla_confirmacion && !plantillaSel && <option value={config.plantilla_confirmacion}>{config.plantilla_confirmacion} (no aparece en Meta)</option>}
                        {listaPlantillas.some((p) => p.compatible) && (
                          <optgroup label="Listas para confirmar (5 variables)">
                            {listaPlantillas
                              .filter((p) => p.compatible)
                              .map((p) => (
                                <option key={p.name} value={p.name}>
                                  {p.name} · {ESTADO_PLANTILLA[p.status]?.l || p.status}
                                </option>
                              ))}
                          </optgroup>
                        )}
                        {listaPlantillas.some((p) => !p.compatible) && (
                          <optgroup label="Otras plantillas de texto">
                            {listaPlantillas
                              .filter((p) => !p.compatible)
                              .map((p) => (
                                <option key={p.name} value={p.name}>
                                  {p.name} · {ESTADO_PLANTILLA[p.status]?.l || p.status} · {p.variables} variables
                                </option>
                              ))}
                          </optgroup>
                        )}
                      </select>
                      {plantillas.estado !== "OK" && (
                        <span className="mt-1 block text-[12px] text-rose-600">
                          {plantillas.estado === "SIN_WHATSAPP"
                            ? "La cuenta no tiene WhatsApp conectado."
                            : plantillas.estado === "TOKEN_INVALIDO"
                              ? "El token de Meta de la cuenta ya no sirve: vuelve a conectar WhatsApp."
                              : `No se pudieron leer las plantillas de Meta${plantillas.error ? `: ${plantillas.error}` : ""}.`}
                        </span>
                      )}
                    </>
                  )}
                  <p className="mt-3 text-[12px] leading-relaxed text-slate-500">
                    La plantilla debe tener 5 variables en este orden: <b>nombre</b>, <b>fecha</b>, <b>hora</b>, <b>lugar o enlace</b>, <b>quien atiende</b>. Puedes elegir una pendiente de
                    aprobación; se enviará cuando Meta la apruebe. Las plantillas se crean en la sección de plantillas de WhatsApp.
                  </p>
                  {plantillaSel && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
                      <span className={`rounded-full px-2 py-0.5 font-semibold ring-1 ${ESTADO_PLANTILLA[plantillaSel.status]?.c || "bg-slate-100 text-slate-600 ring-slate-200"}`}>{ESTADO_PLANTILLA[plantillaSel.status]?.l || plantillaSel.status}</span>
                      <span className="text-slate-500">
                        {plantillaSel.category} · {plantillaSel.language}
                      </span>
                      {!plantillaSel.compatible && (
                        <span className="rounded-full bg-rose-50 px-2 py-0.5 font-semibold text-rose-600 ring-1 ring-rose-200">
                          Tiene {plantillaSel.variables} variables, se esperan 5: el envío fallará
                        </span>
                      )}
                    </div>
                  )}
                  {data?.cuenta?.recordatorio_plantilla ? (
                    <p className="mt-3 text-[12px] text-slate-500">
                      <i className="bx bx-bell align-[-2px]" /> Además, el recordatorio sale {data.cuenta.recordatorio_horas || 1} h antes con la plantilla de recordatorio de la cuenta.
                    </p>
                  ) : (
                    <p className="mt-3 text-[12px] text-amber-700">
                      <i className="bx bx-bell-off align-[-2px]" /> La cuenta no tiene plantilla de recordatorio: configúrala en Calendario para avisar antes de la cita.
                    </p>
                  )}
                </div>

                {/* Vista previa estilo WhatsApp */}
                <div className="rounded-2xl bg-[#e5ddd5] p-3 ring-1 ring-slate-200">
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Así le llega</div>
                  {plantillaSel ? (
                    <div className="max-w-full rounded-lg rounded-tl-none bg-white px-3 py-2 text-[13px] leading-relaxed text-slate-800 shadow">
                      {plantillaSel.header && <div className="mb-1 font-bold">{renderWhatsapp(plantillaSel.header, ejemplo)}</div>}
                      <div className="whitespace-pre-wrap">{renderWhatsapp(plantillaSel.body, ejemplo)}</div>
                      {plantillaSel.footer && <div className="mt-1 text-[11.5px] text-slate-500">{plantillaSel.footer}</div>}
                      <div className="mt-1 text-right text-[10px] text-slate-400">10:02</div>
                    </div>
                  ) : (
                    <div className="rounded-lg bg-white/70 px-3 py-6 text-center text-[12.5px] text-slate-500">
                      {config.plantilla_confirmacion ? "No encontramos esa plantilla en Meta." : "Elige una plantilla para ver cómo le llega a la persona."}
                    </div>
                  )}
                </div>
              </div>
            )}
          </Tarjeta>
        </div>

        {/* ══════════ Columna lateral ══════════ */}
        <div className="space-y-5">
          {/* Quién atiende */}
          <Tarjeta
            icono="bx-group"
            titulo="Quién atiende"
            sub="Cada horario se ofrece si alguien activo está libre. La cita va a quien menos tiene en 30 días."
            accion={
              puedeEditar && (
                <button onClick={guardarAsesores} disabled={guardando === "asesores"} className={`${btnDark} px-3 py-1.5 text-[12.5px]`}>
                  {guardando === "asesores" ? "Guardando…" : "Guardar equipo"}
                </button>
              )
            }
          >
            {enLista.length === 0 && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800 ring-1 ring-amber-200">Nadie elegido todavía: la agenda no ofrece horarios hasta que agregues a alguien.</p>
            )}
            <div className="divide-y divide-slate-100">
              {enLista.map((a) => (
                <div key={a.id_sub_usuario} className="py-3">
                  <div className="flex items-center gap-2">
                    <label className="inline-flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                      <input type="checkbox" className="h-4 w-4 accent-sky-600" checked={a.en_lista === 1} disabled={!puedeEditar} onChange={() => toggleAsesor(a.id_sub_usuario)} />
                      <span className="truncate text-sm font-bold text-slate-800">{a.nombre}</span>
                      <span className="text-[10px] uppercase tracking-wide text-slate-400">{a.rol}</span>
                    </label>
                    {a.suspendido ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">suspendido</span> : null}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 pl-6">
                    <EstadoGoogle a={a} />
                    <span className="text-[11.5px] text-slate-500">
                      30 d: <b className="text-slate-700">{a.stats.ultimos_30d}</b> · próximas: <b className="text-slate-700">{a.stats.proximas}</b>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {puedeEditar && fuera.length > 0 && (
              <details className="mt-3" open={enLista.length === 0}>
                <summary className="cursor-pointer text-[13px] font-semibold text-sky-700">Agregar a alguien del equipo ({fuera.length})</summary>
                <div className="mt-2 grid gap-1">
                  {fuera.map((a) => (
                    <button
                      key={a.id_sub_usuario}
                      type="button"
                      onClick={() => setAsesores((l) => l.map((x) => (x.id_sub_usuario === a.id_sub_usuario ? { ...x, en_lista: 1 } : x)))}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50"
                    >
                      <span className="min-w-0 truncate">
                        <span className="font-semibold text-slate-800">{a.nombre}</span>
                        <span className="ml-2 text-[10px] uppercase text-slate-400">{a.rol}</span>
                      </span>
                      <i className="bx bx-plus text-slate-400" />
                    </button>
                  ))}
                </div>
              </details>
            )}
            <p className="mt-3 text-[12px] leading-relaxed text-slate-500">
              {vinculo
                ? "Las invitaciones salen desde la cuenta de Google de la agenda; quien atiende recibe la invitación en su correo."
                : "Para que la cita llegue a su Google Calendar y el cliente reciba la invitación, cada persona debe vincular Google desde Calendario en este calendario y aceptar el permiso de calendario."}
            </p>
          </Tarjeta>

          {/* Google de la agenda */}
          <Tarjeta
            icono="bxl-google"
            titulo="Cuenta de Google de la agenda"
            sub="Desde qué cuenta salen el evento y la invitación por correo. Útil para usar la cuenta comercial del negocio en vez del Google de cada persona."
          >
            {vinculo ? (
              <div>
                <div className="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-3 ring-1 ring-slate-200">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[18px] text-slate-700 ring-1 ring-slate-200">
                    <i className="bx bxl-google" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-slate-800">{vinculo.email}</div>
                    <div className="text-[12px] text-slate-500">Conectada por {vinculo.propietario || "—"}</div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {vinculo.permiso_calendario === false ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                          <i className="bx bx-error" /> Sin permiso de calendario: vuelve a conectarla
                        </span>
                      ) : vinculo.permiso_calendario === true ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                          <i className="bx bx-check-circle" /> Con permiso de calendario
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">Permiso sin verificar</span>
                      )}
                      {vinculo.sincronizado ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-200">
                          <i className="bx bx-sync" /> Sincroniza con el calendario
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">Aún no se han traído sus reuniones</span>
                      )}
                    </div>
                  </div>
                </div>
                {puedeEditar && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={importarGoogle} disabled={!!googleBusy} className={`${btnDark} px-3 py-1.5 text-[12.5px]`}>
                      <i className={`bx ${googleBusy === "importar" ? "bx-loader-alt bx-spin" : "bx-cloud-download"}`} /> Traer reuniones de Google
                    </button>
                    <button onClick={conectarGoogle} disabled={!!googleBusy} className={`${btnLight} px-3 py-1.5 text-[12.5px]`}>
                      <i className="bx bx-refresh" /> Conectar otra
                    </button>
                    <button onClick={quitarGoogle} disabled={!!googleBusy} className={`${btnLight} px-3 py-1.5 text-[12.5px] text-rose-600`}>
                      <i className="bx bx-unlink" /> Quitar
                    </button>
                  </div>
                )}
                <p className="mt-3 text-[12px] leading-relaxed text-slate-500">
                  «Traer reuniones» copia al calendario lo que ya existe en ese Google (últimos 90 días y todo lo futuro) y bloquea esas horas en la agenda pública. Después, lo nuevo entra solo.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-[13px] leading-relaxed text-slate-600">
                  Sin cuenta propia, cada cita sale desde el Google de la persona que la atiende. Si conectas una cuenta aquí, <b>todas</b> las invitaciones salen de ella y quien atiende entra como invitado.
                </p>
                {puedeEditar && (
                  <div className="mt-3 space-y-2">
                    <button onClick={conectarGoogle} disabled={!!googleBusy} className={`${btnDark} w-full justify-center`}>
                      <i className={`bx ${googleBusy ? "bx-loader-alt bx-spin" : "bxl-google"}`} /> Conectar Google Calendar
                    </button>
                    {opcionesGoogle.length > 0 && (
                      <div className="flex gap-2">
                        <select className={inputCls} value={eleccionGoogle} onChange={(e) => setEleccionGoogle(e.target.value)}>
                          <option value="">Usar una cuenta ya vinculada…</option>
                          {opcionesGoogle.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.email} · {o.propietario || "sin nombre"}
                            </option>
                          ))}
                        </select>
                        <button onClick={() => eleccionGoogle && usarGoogle(Number(eleccionGoogle))} disabled={!eleccionGoogle || !!googleBusy} className={`${btnLight} shrink-0`}>
                          Usar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </Tarjeta>
        </div>
      </div>

      {/* Reservas */}
      <Tarjeta icono="bx-list-check" titulo="Últimas reservas por este enlace" sub={`Horas en ${nombreZona(tz)}. Cancelar o completar se hace desde el calendario.`}>
        {reservas.length === 0 ? (
          <p className="text-sm text-slate-500">Todavía no hay reservas por este enlace.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="py-2 pr-3">Cita</th>
                  <th className="py-2 pr-3">Cliente</th>
                  <th className="py-2 pr-3">Contacto</th>
                  {config.principal && <th className="py-2 pr-3">Origen</th>}
                  <th className="py-2 pr-3">Atiende</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2 pr-3">Google</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reservas.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="py-2 pr-3 whitespace-nowrap font-semibold text-slate-800">{fmtFecha(r.inicio, tz)}</td>
                    <td className="py-2 pr-3 text-slate-800">
                      {r.nombre}
                      {r.id_usuario_cuenta ? <span className="ml-1 text-[11px] text-sky-600">cuenta {r.id_usuario_cuenta}</span> : null}
                    </td>
                    <td className="py-2 pr-3 text-slate-600">
                      +{r.telefono}
                      <span className="block text-[12px] text-slate-400">{r.email}</span>
                    </td>
                    {config.principal && <td className="py-2 pr-3 text-slate-600">{ORIGEN_LABEL[r.origen] || r.origen}</td>}
                    <td className="py-2 pr-3 text-slate-600">{r.asesor || r.id_sub_usuario}</td>
                    <td className="py-2 pr-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${r.status === "Cancelado" ? "bg-rose-50 text-rose-600" : r.status === "Completado" ? "bg-emerald-50 text-emerald-700" : "bg-sky-50 text-sky-700"}`}>
                        {r.status || "—"}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      {r.meeting_url ? (
                        <a href={r.meeting_url} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline">
                          Meet
                        </a>
                      ) : r.google_ok === 0 ? (
                        <span className="text-rose-600" title="No se pudo crear el evento en Google">
                          falló
                        </span>
                      ) : r.google_ok === 1 ? (
                        <span className="text-emerald-600">ok</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      {/* Barra de guardado: aparece solo cuando hay cambios de configuración */}
      {puedeEditar && hayCambios && (
        <div className="fixed inset-x-0 bottom-0 z-[900] px-4 pb-4">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-2xl bg-[#0B1426] px-5 py-3 text-white shadow-2xl ring-1 ring-white/10">
            <div className="text-[13px]">
              <i className="bx bx-edit-alt align-[-2px] text-cyan-300" /> {data?.nueva ? "Tu agenda todavía no está guardada." : "Tienes cambios sin guardar."}
            </div>
            <div className="flex items-center gap-2">
              {!data?.nueva && (
                <button onClick={descartar} disabled={guardando === "config"} className="rounded-lg px-3 py-2 text-[13px] font-bold text-slate-300 hover:bg-white/10">
                  Descartar
                </button>
              )}
              <button onClick={guardarConfig} disabled={guardando === "config"} className="rounded-lg bg-cyan-300 px-4 py-2 text-[13px] font-bold text-[#06111f] hover:bg-cyan-200 disabled:opacity-60">
                {guardando === "config" ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
