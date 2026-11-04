import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import chatApi from "../../api/chatcenter";
import { Estilos, SelloMeta } from "../landingHome/ui";
import { LOGO_BLANCO } from "../landingHome/data";
import { temaDe } from "./tema";

/* ═══════════════════════════════════════════════════════════════════════
   /agendar — agenda pública de implementación (reemplaza a Calendly).

   Tres pasos, uno a la vez, como una agenda de reservas:
     1. Día   → calendario del mes completo; solo se pueden tocar los días
                con cupos. Se puede pasar de mes mientras haya cupos.
     2. Hora  → los huecos de ese día (mañana / tarde).
     3. Datos → nombre, correo y WhatsApp. Confirma.
   Al terminar, la pantalla de confirmación con el Meet y el botón para
   agregar al calendario propio.

   La reunión queda en la agenda del asesor de ImporChat (el back reparte).
   El cliente recibe la invitación de Google con el Meet, la confirmación
   por WhatsApp y el recordatorio una hora antes.

   Rutas:
     /agendar          → agenda principal de ImporChat (modal de arranque, /home)
     /agendar/:slug    → agenda de una cuenta (Calendario → Agenda pública)

   Entradas por la URL:
     origen = modal | home | enlace   (de dónde vino, para medir; solo principal)
     u      = id de la cuenta de ImporChat cuando viene del modal de arranque
              (así el modal no vuelve a salir hasta pasada la cita)
     nombre, email, tel, cc            prellenan el formulario

   Los huecos vienen del back en UTC y se pintan en la zona horaria del
   navegador: alguien en México ve sus horas, no las de Ecuador.
   ═══════════════════════════════════════════════════════════════════════ */

const PAISES = [
  { code: "+593", name: "Ecuador", tz: ["America/Guayaquil"] },
  { code: "+57", name: "Colombia", tz: ["America/Bogota"] },
  { code: "+52", name: "México", tz: ["America/Mexico_City", "America/Monterrey", "America/Cancun", "America/Tijuana", "America/Merida", "America/Chihuahua", "America/Hermosillo", "America/Mazatlan"] },
  { code: "+51", name: "Perú", tz: ["America/Lima"] },
  { code: "+56", name: "Chile", tz: ["America/Santiago"] },
  { code: "+54", name: "Argentina", tz: ["America/Argentina/Buenos_Aires", "America/Buenos_Aires"] },
  { code: "+502", name: "Guatemala", tz: ["America/Guatemala"] },
  { code: "+507", name: "Panamá", tz: ["America/Panama"] },
  { code: "+506", name: "Costa Rica", tz: ["America/Costa_Rica"] },
  { code: "+591", name: "Bolivia", tz: ["America/La_Paz"] },
  { code: "+595", name: "Paraguay", tz: ["America/Asuncion"] },
  { code: "+598", name: "Uruguay", tz: ["America/Montevideo"] },
  { code: "+58", name: "Venezuela", tz: ["America/Caracas"] },
  { code: "+1", name: "USA", tz: [] },
  { code: "+34", name: "España", tz: ["Europe/Madrid"] },
];

const TZ = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Guayaquil";
  } catch {
    return "America/Guayaquil";
  }
})();

const fmt = (iso, opts) =>
  new Intl.DateTimeFormat("es", { timeZone: TZ, ...opts }).format(iso instanceof Date ? iso : new Date(iso));

/* Clave de día en la zona del visitante (aaaa-mm-dd), sirve igual para un ISO
   del back que para una fecha local del calendario del mes. */
const claveDia = (v) => {
  const d = v instanceof Date ? v : new Date(v);
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
  const g = (t) => p.find((x) => x.type === t)?.value;
  return `${g("year")}-${g("month")}-${g("day")}`;
};
const hora = (iso) => fmt(iso, { hour: "2-digit", minute: "2-digit", hour12: false });
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/* Nombre legible de la zona del visitante ("Ciudad de México"), para que sepa
   en qué hora está viendo los cupos. */
const nombreZona = () => {
  const parte = TZ.split("/").pop() || TZ;
  return parte.replace(/_/g, " ");
};

const paisPorZona = () => PAISES.find((p) => p.tz.includes(TZ)) || PAISES[0];

const DIAS_SEMANA = ["L", "M", "X", "J", "V", "S", "D"];

/* Celdas del mes (lunes a domingo) con huecos al inicio para alinear. */
function celdasDelMes(anio, mes) {
  const primero = new Date(anio, mes, 1);
  const offset = (primero.getDay() + 6) % 7; // lunes = 0
  const total = new Date(anio, mes + 1, 0).getDate();
  const celdas = [];
  for (let i = 0; i < offset; i++) celdas.push(null);
  for (let d = 1; d <= total; d++) celdas.push(new Date(anio, mes, d));
  while (celdas.length % 7) celdas.push(null);
  return celdas;
}

const Campo = ({ label, hint, children, error }) => (
  <label className="block">
    <span className="mb-1.5 flex flex-wrap items-baseline gap-x-2">
      <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-slate-400">{label}</span>
      {hint && <span className="text-[12px] text-slate-500">{hint}</span>}
    </span>
    {children}
    {error && <span className="mt-1 block text-[12px] text-rose-300">{error}</span>}
  </label>
);

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-[15px] text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-300/60 focus:bg-white/[0.08]";

const PASOS = [
  { n: 1, label: "Día", icon: "bx-calendar" },
  { n: 2, label: "Hora", icon: "bx-time-five" },
  { n: 3, label: "Tus datos", icon: "bx-user" },
];

/* Apariencia por negocio (fondo y acento de tema.js). La página está escrita
   con las clases oscuras de la landing (text-white, bg-white/10, cyan-300…);
   en vez de reescribir cada una, estas reglas las redirigen a las variables
   --agp-* del tema: con el azul y el cyan de siempre se ve igual que antes,
   y con un fondo claro los grises se invierten para que el texto se lea.
   Todo cuelga de .agp para no tocar el resto de la app. */
const EstilosTema = () => (
  <style>{`
    .agp { background: var(--agp-fondo); color: var(--agp-tinta); }
    .agp .text-white { color: var(--agp-tinta); }
    .agp .text-slate-300 { color: var(--agp-tinta-2); }
    .agp .text-slate-400 { color: var(--agp-tinta-3); }
    .agp .text-slate-500, .agp .placeholder\\:text-slate-500::placeholder { color: var(--agp-tinta-4); }
    .agp .text-slate-600 { color: var(--agp-tinta-5); }
    .agp .bg-white\\/10, .agp .bg-white\\/\\[0\\.08\\], .agp .focus\\:bg-white\\/\\[0\\.08\\]:focus { background-color: rgba(var(--agp-velo), 0.08); }
    .agp .bg-white\\/\\[0\\.05\\], .agp .bg-white\\/\\[0\\.06\\] { background-color: rgba(var(--agp-velo), 0.05); }
    .agp .hover\\:bg-white\\/10:hover, .agp .hover\\:bg-white\\/15:hover { background-color: rgba(var(--agp-velo), 0.13); }
    .agp .ring-white\\/10 { --tw-ring-color: rgba(var(--agp-velo), 0.1); }
    .agp .ring-white\\/15 { --tw-ring-color: rgba(var(--agp-velo), 0.16); }
    .agp .ring-white { --tw-ring-color: var(--agp-tinta); }
    .agp .border-white\\/10 { border-color: rgba(var(--agp-velo), 0.12); }
    .agp .bg-white { background-color: var(--agp-tinta); }
    .agp .hover\\:bg-slate-100:hover { background-color: color-mix(in srgb, var(--agp-tinta) 88%, var(--agp-fondo)); }
    .agp .text-\\[\\#0B1426\\] { color: var(--agp-sobre-tinta); }
    .agp .bg-\\[\\#0B1426\\] { background-color: var(--agp-sobre-tinta); }
    .agp .text-cyan-300, .agp .text-sky-300 { color: var(--agp-acento); }
    .agp .text-cyan-200, .agp .text-cyan-100 { color: color-mix(in srgb, var(--agp-acento) 72%, var(--agp-tinta)); }
    .agp .bg-cyan-300 { background-color: var(--agp-acento); }
    .agp .text-\\[\\#06111f\\] { color: var(--agp-sobre-acento); }
    .agp .bg-cyan-300\\/12, .agp .bg-cyan-300\\/15, .agp .bg-cyan-300\\/20 { background-color: color-mix(in srgb, var(--agp-acento) 15%, transparent); }
    .agp .hover\\:bg-cyan-300\\/20:hover, .agp .hover\\:bg-cyan-300\\/25:hover { background-color: color-mix(in srgb, var(--agp-acento) 26%, transparent); }
    .agp .bg-cyan-300\\/50 { background-color: color-mix(in srgb, var(--agp-acento) 50%, transparent); }
    .agp .ring-cyan-300\\/30, .agp .ring-cyan-300\\/35 { --tw-ring-color: color-mix(in srgb, var(--agp-acento) 38%, transparent); }
    .agp .hover\\:ring-cyan-300\\/50:hover { --tw-ring-color: color-mix(in srgb, var(--agp-acento) 55%, transparent); }
    .agp .ring-cyan-200, .agp .hover\\:ring-cyan-200:hover { --tw-ring-color: var(--agp-acento); }
    .agp .focus\\:border-cyan-300\\/60:focus { border-color: color-mix(in srgb, var(--agp-acento) 60%, transparent); }
    .agp option { background-color: var(--agp-tarjeta); color: var(--agp-tinta); }
    .agp .agp-tarjeta { background: radial-gradient(110% 80% at 0% 0%, color-mix(in srgb, var(--agp-acento) 20%, transparent) 0%, transparent 55%), var(--agp-tarjeta); }
    .agp .agp-tarjeta-ok { background: radial-gradient(90% 70% at 50% 0%, rgba(37,211,102,0.16) 0%, transparent 60%), var(--agp-tarjeta); }
    .agp.claro .agp-tarjeta, .agp.claro .agp-tarjeta-ok { box-shadow: 0 18px 50px rgba(15,23,42,0.08); }
    .agp .agp-degradado { background-image: linear-gradient(90deg, #25D366 0%, var(--agp-acento) 100%); }
    .agp.claro .agp-degradado { background-image: linear-gradient(90deg, #15803d 0%, color-mix(in srgb, var(--agp-acento) 80%, #0f172a) 100%); }
    .agp .agp-boton {
      color: var(--agp-sobre-acento);
      background: linear-gradient(135deg, color-mix(in srgb, var(--agp-acento) 72%, #ffffff), var(--agp-acento) 55%, color-mix(in srgb, var(--agp-acento) 78%, #000000));
      box-shadow: 0 0 0 1px color-mix(in srgb, var(--agp-acento) 35%, transparent), 0 12px 40px color-mix(in srgb, var(--agp-acento) 32%, transparent);
    }
    .agp.claro .text-emerald-200 { color: #047857; }
    .agp.claro .text-emerald-300 { color: #059669; }
    .agp.claro .text-rose-200, .agp.claro .text-rose-300 { color: #be123c; }
  `}</style>
);

export default function AgendarPublico() {
  const [params] = useSearchParams();
  const { slug } = useParams();
  const origen = params.get("origen") || "enlace";
  const cuenta = params.get("u") || "";
  /* Vista previa desde el panel (Calendario → Agenda pública): se pinta la
     página aunque la agenda esté apagada y no se reserva nada. */
  const previa = params.get("previa") === "1";

  const [cargando, setCargando] = useState(true);
  const [info, setInfo] = useState(null);
  const [errorCarga, setErrorCarga] = useState(null);
  const [paso, setPaso] = useState(1);
  const [dia, setDia] = useState(null); // clave aaaa-mm-dd
  const [hueco, setHueco] = useState(null);
  const [mes, setMes] = useState(null); // { anio, mes }
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(null);
  const [errorForm, setErrorForm] = useState(null);

  const [form, setForm] = useState(() => ({
    nombre: params.get("nombre") || "",
    email: params.get("email") || "",
    cc: params.get("cc") || paisPorZona().code,
    telefono: params.get("tel") || "",
    nota: "",
  }));

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga(null);
    try {
      // silentError: el interceptor no muestra su toast; el error se pinta aquí.
      const { data } = await chatApi.get("agenda_publica/disponibilidad", { params: { a: slug || undefined, previa: previa ? 1 : undefined }, silentError: true });
      setInfo(data?.data || null);
    } catch (e) {
      setErrorCarga(
        e?.response?.status === 404
          ? "Esta agenda no existe o el enlace cambió."
          : e?.response?.data?.message || "No pudimos cargar la agenda. Intenta de nuevo.",
      );
    } finally {
      setCargando(false);
    }
  }, [slug]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  /* Principal: la de ImporChat (modal y /home). Cualquier otra es la agenda
     de un negocio que comparte su enlace: cambia el texto, no el flujo. */
  const principal = info ? info.principal !== false : !slug;
  const negocio = info?.negocio || "";
  const tema = useMemo(() => temaDe(info || {}), [info]);

  useEffect(() => {
    document.title = principal
      ? "Agenda tu implementación · ImporChat"
      : `${info?.titulo || "Agendar"}${negocio ? ` · ${negocio}` : ""}`;
  }, [principal, info?.titulo, negocio]);

  /* Huecos agrupados por día en la zona del visitante. */
  const dias = useMemo(() => {
    const mapa = new Map();
    for (const h of info?.huecos || []) {
      const k = claveDia(h.inicio);
      if (!mapa.has(k)) mapa.set(k, { clave: k, inicio: h.inicio, huecos: [] });
      mapa.get(k).huecos.push(h);
    }
    return mapa;
  }, [info]);

  const listaDias = useMemo(() => [...dias.values()].sort((a, b) => a.clave.localeCompare(b.clave)), [dias]);

  /* Meses navegables: del mes de hoy al mes del último cupo. */
  const limites = useMemo(() => {
    const hoy = new Date();
    const desde = { anio: hoy.getFullYear(), mes: hoy.getMonth() };
    const ultimo = listaDias.length ? new Date(listaDias[listaDias.length - 1].inicio) : hoy;
    const hasta = { anio: ultimo.getFullYear(), mes: ultimo.getMonth() };
    return { desde, hasta };
  }, [listaDias]);

  useEffect(() => {
    if (!mes && listaDias.length) {
      const p = new Date(listaDias[0].inicio);
      setMes({ anio: p.getFullYear(), mes: p.getMonth() });
    }
    if (dia && !dias.has(dia)) {
      setDia(null);
      setHueco(null);
      setPaso(1);
    }
  }, [listaDias, dias, dia, mes]);

  const idxMes = (m) => m.anio * 12 + m.mes;
  const puedeAtras = mes && idxMes(mes) > idxMes(limites.desde);
  const puedeAdelante = mes && idxMes(mes) < idxMes(limites.hasta);
  const moverMes = (delta) => setMes((m) => {
    const d = new Date(m.anio, m.mes + delta, 1);
    return { anio: d.getFullYear(), mes: d.getMonth() };
  });

  const diaActual = dia ? dias.get(dia) : null;
  const hoyClave = claveDia(new Date());

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const elegirDia = (clave) => {
    setDia(clave);
    setHueco(null);
    setPaso(2);
  };
  const elegirHora = (h) => {
    setHueco(h);
    setPaso(3);
  };
  const irA = (n) => {
    if (n === 1) setPaso(1);
    if (n === 2 && dia) setPaso(2);
    if (n === 3 && hueco) setPaso(3);
  };

  const reservar = async (e) => {
    e.preventDefault();
    if (enviando || !hueco) return;
    setErrorForm(null);
    if (previa) {
      setErrorForm("Esto es una vista previa: aquí no se reservan citas. Comparte el enlace real para recibir reservas.");
      return;
    }
    setEnviando(true);
    try {
      const { data } = await chatApi.post("agenda_publica/reservar", {
        slug: slug || undefined,
        nombre: form.nombre,
        email: form.email,
        codigo_pais: form.cc,
        telefono: form.telefono,
        inicio: hueco.inicio,
        origen,
        id_usuario_cuenta: cuenta || undefined,
        tz_cliente: TZ,
        nota: form.nota || undefined,
      }, { silentError: true });
      setListo(data?.data || null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const r = err?.response?.data;
      setErrorForm(r?.message || "No pudimos registrar la reserva. Intenta otra vez.");
      if (r?.code === "HUECO_OCUPADO") {
        setHueco(null);
        setPaso(2);
        cargar();
      }
    } finally {
      setEnviando(false);
    }
  };

  const enlaceCalendario = (c) => {
    const f = (iso) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const u = new URL("https://calendar.google.com/calendar/render");
    u.searchParams.set("action", "TEMPLATE");
    u.searchParams.set("text", `${info?.titulo || "Cita"}${negocio ? ` · ${negocio}` : ""}`);
    u.searchParams.set("dates", `${f(c.inicio)}/${f(c.fin)}`);
    if (c.lugar) u.searchParams.set("location", c.lugar);
    else if (c.meeting_url) u.searchParams.set("location", c.meeting_url);
    u.searchParams.set(
      "details",
      c.lugar ? `Lugar: ${c.lugar}` : c.meeting_url ? `Videollamada: ${c.meeting_url}` : "Videollamada por Google Meet",
    );
    return u.toString();
  };

  const resumenDia = diaActual ? cap(fmt(diaActual.inicio, { weekday: "long", day: "numeric", month: "long" })) : null;
  const duracion = info?.duracion_min || 60;
  const lugar = info?.lugar || null;

  /* Qué recibe la persona, según cómo atiende el negocio. */
  const bullets = principal
    ? [
        ["bx-calendar-check", "Eliges el día y la hora que mejor te quede."],
        ["bx-envelope", "Recibes la invitación en tu correo con el enlace de Google Meet."],
        ["bxl-whatsapp", "Te confirmamos por WhatsApp y te recordamos una hora antes."],
      ]
    : [
        ["bx-calendar-check", "Eliges el día y la hora que mejor te quede."],
        lugar
          ? ["bx-map", `Te esperamos en ${lugar}.`]
          : ["bx-envelope", "Recibes la invitación en tu correo con el enlace de la videollamada."],
        ["bxl-whatsapp", "Te confirmamos por WhatsApp y te recordamos antes de la cita."],
      ];

  return (
    <div className={`agp min-h-screen overflow-x-hidden antialiased text-white ${tema.claro ? "claro" : ""}`} style={tema.vars}>
      <Estilos />
      <EstilosTema />

      {previa && (
        <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-cyan-300 px-4 py-2 text-center text-[12.5px] font-bold text-[#06111f]">
          <i className="bx bx-show text-[16px]" /> Vista previa: así ve tu agenda quien abre el enlace. Aquí no se reservan citas.
        </div>
      )}

      {/* cabecera */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        {principal ? (
          <a href="/home" className="flex items-center">
            <img src={LOGO_BLANCO} alt="ImporChat" className="h-10 w-auto" />
          </a>
        ) : (
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-[17px] font-extrabold ring-1 ring-white/15">
              {(negocio || "A").trim().charAt(0).toUpperCase()}
            </span>
            <span className="text-[15px] font-bold">{negocio || "Agenda"}</span>
          </div>
        )}
        {/* La principal lleva el sello de Meta de ImporChat; cada negocio pone
            su propia insignia desde el panel (o ninguna). */}
        {principal ? (
          <SelloMeta compacto />
        ) : info?.insignia ? (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold ring-1 ring-white/15">
            <i className="bx bxs-badge-check text-[15px] text-cyan-300" /> {info.insignia}
          </span>
        ) : null}
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <AnimatePresence mode="wait">
          {listo ? (
            <Confirmacion key="ok" cita={listo.cita} repetida={listo.repetida} email={form.email} enlaceCalendario={enlaceCalendario} negocio={principal ? null : negocio} />
          ) : (
            <motion.div key="form" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="grid gap-8 lg:grid-cols-[0.85fr_1.35fr]">
                {/* ─── Izquierda: qué es + resumen de lo elegido ─── */}
                <section>
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-200">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                    {duracion} min · {lugar ? "presencial" : "videollamada"}{principal ? " · gratis" : ""}
                  </div>
                  {principal ? (
                    <h1 className="mt-5 text-[34px] font-extrabold leading-[1.05] tracking-tight sm:text-[42px]">
                      {origen === "home" ? "Agenda tu demo" : "Agenda tu implementación"}
                      <span className="agp-degradado block bg-clip-text text-transparent">
                        con un especialista.
                      </span>
                    </h1>
                  ) : (
                    <h1 className="mt-5 text-[34px] font-extrabold leading-[1.05] tracking-tight sm:text-[42px]">
                      {info?.titulo || "Agenda tu cita"}
                      {negocio && (
                        <span className="agp-degradado block bg-clip-text text-transparent">
                          con {negocio}.
                        </span>
                      )}
                    </h1>
                  )}
                  <p className="mt-4 max-w-[42ch] text-[15px] leading-7 text-slate-300">
                    {info?.descripcion ||
                      (principal
                        ? "Conectamos tu WhatsApp con la API oficial, activamos tu agente de IA y lo probamos con un chat real."
                        : "Elige el horario que mejor te quede y te confirmamos al instante.")}
                  </p>

                  <ul className="mt-7 space-y-3 text-[14px] text-slate-300">
                    {bullets.map(([icon, txt]) => (
                      <li key={icon} className="flex items-start gap-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.06] ring-1 ring-white/10">
                          <i className={`bx ${icon} text-[18px]`} style={{ color: "#25D366" }} />
                        </span>
                        <span className="pt-1">{txt}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Resumen de lo que lleva elegido */}
                  <AnimatePresence>
                    {diaActual && (
                      <motion.div
                        key="resumen"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-8 rounded-2xl bg-white/[0.05] p-4 ring-1 ring-white/10"
                      >
                        <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Tu reunión</div>
                        <div className="mt-2 flex items-start gap-3">
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cyan-300/15 text-cyan-200 ring-1 ring-cyan-300/30">
                            <i className="bx bx-calendar-event text-[22px]" />
                          </span>
                          <div className="min-w-0">
                            <div className="text-[15px] font-bold text-white">{resumenDia}</div>
                            <div className="text-[13px] text-slate-300">
                              {hueco ? `${hora(hueco.inicio)} – ${hora(hueco.fin)} · ${nombreZona()}` : "Falta elegir la hora"}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>

                {/* ─── Derecha: agenda por pasos ─── */}
                <section className="agp-tarjeta rounded-[26px] p-5 ring-1 ring-white/10 sm:p-7">
                  {cargando ? (
                    <div className="py-24 text-center text-slate-400">
                      <i className="bx bx-loader-alt bx-spin text-3xl text-cyan-300" />
                      <p className="mt-3 text-sm">Buscando horarios disponibles…</p>
                    </div>
                  ) : errorCarga ? (
                    <div className="py-16 text-center">
                      <p className="text-slate-300">{errorCarga}</p>
                      <button onClick={cargar} className="mt-4 rounded-full bg-white/10 px-5 py-2 text-sm font-bold hover:bg-white/15">
                        Reintentar
                      </button>
                    </div>
                  ) : !info?.activo || !listaDias.length ? (
                    <div className="py-16 text-center">
                      <i className="bx bx-calendar-x text-4xl text-slate-500" />
                      <p className="mt-3 text-slate-300">
                        {previa && !info?.activo
                          ? "La agenda no tiene calendario: elige uno en el panel y guarda."
                          : info?.activo
                            ? previa
                              ? "Con este horario no sale ningún cupo: revisa apertura, cierre, duración y días."
                              : "No quedan horarios libres en los próximos días."
                            : "La agenda no está disponible por ahora."}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        {principal ? "Escríbenos por WhatsApp y coordinamos contigo." : `Escríbele a ${negocio || "el negocio"} por WhatsApp y coordinan juntos.`}
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Pasos */}
                      <ol className="flex items-center gap-2">
                        {PASOS.map((p, i) => {
                          const hecho = p.n < paso;
                          const activo = p.n === paso;
                          const clickable = p.n === 1 || (p.n === 2 && dia) || (p.n === 3 && hueco);
                          return (
                            <React.Fragment key={p.n}>
                              {i > 0 && <span className={`h-px flex-1 ${hecho || activo ? "bg-cyan-300/50" : "bg-white/10"}`} />}
                              <li>
                                <button
                                  type="button"
                                  disabled={!clickable}
                                  onClick={() => irA(p.n)}
                                  className={`flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-[12px] font-bold transition ${
                                    activo
                                      ? "bg-white text-[#0B1426]"
                                      : hecho
                                        ? "bg-cyan-300/15 text-cyan-200 ring-1 ring-cyan-300/30 hover:bg-cyan-300/25"
                                        : "text-slate-500 ring-1 ring-white/10"
                                  } ${clickable ? "cursor-pointer" : "cursor-default"}`}
                                >
                                  <span
                                    className={`grid h-6 w-6 place-items-center rounded-full text-[11px] ${
                                      activo ? "bg-[#0B1426] text-white" : hecho ? "bg-cyan-300 text-[#06111f]" : "bg-white/10"
                                    }`}
                                  >
                                    {hecho ? <i className="bx bx-check text-[15px]" /> : p.n}
                                  </span>
                                  <span className="hidden sm:inline">{p.label}</span>
                                </button>
                              </li>
                            </React.Fragment>
                          );
                        })}
                      </ol>

                      <AnimatePresence mode="wait">
                        {/* ── Paso 1: día ── */}
                        {paso === 1 && mes && (
                          <motion.div key="p1" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }}>
                            <div className="mt-6 flex items-center justify-between gap-3">
                              <h2 className="text-[18px] font-extrabold">Elige el día</h2>
                              <span className="text-[11px] text-slate-500">Horas de {nombreZona()}</span>
                            </div>

                            <div className="mt-4 flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => moverMes(-1)}
                                disabled={!puedeAtras}
                                className="grid h-9 w-9 place-items-center rounded-full ring-1 ring-white/10 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                                aria-label="Mes anterior"
                              >
                                <i className="bx bx-chevron-left text-[22px]" />
                              </button>
                              <div className="text-[15px] font-bold">
                                {cap(new Date(mes.anio, mes.mes, 1).toLocaleDateString("es", { month: "long", year: "numeric" }))}
                              </div>
                              <button
                                type="button"
                                onClick={() => moverMes(1)}
                                disabled={!puedeAdelante}
                                className="grid h-9 w-9 place-items-center rounded-full ring-1 ring-white/10 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                                aria-label="Mes siguiente"
                              >
                                <i className="bx bx-chevron-right text-[22px]" />
                              </button>
                            </div>

                            <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase tracking-wide text-slate-500">
                              {DIAS_SEMANA.map((d, i) => (
                                <div key={i} className="py-1">{d}</div>
                              ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1.5">
                              {celdasDelMes(mes.anio, mes.mes).map((d, i) => {
                                if (!d) return <div key={`v${i}`} />;
                                const clave = claveDia(d);
                                const disponible = dias.has(clave);
                                const esHoy = clave === hoyClave;
                                const seleccionado = clave === dia;
                                return (
                                  <button
                                    key={clave}
                                    type="button"
                                    disabled={!disponible}
                                    onClick={() => elegirDia(clave)}
                                    className={`relative h-12 rounded-xl text-[15px] font-bold transition ${
                                      seleccionado
                                        ? "bg-white text-[#0B1426] ring-2 ring-white"
                                        : disponible
                                          ? "bg-cyan-300/12 text-cyan-100 ring-1 ring-cyan-300/35 hover:bg-cyan-300/25 hover:ring-cyan-200"
                                          : "text-slate-600"
                                    }`}
                                    aria-label={disponible ? `${clave}, con horarios` : clave}
                                  >
                                    {d.getDate()}
                                    {disponible && !seleccionado && (
                                      <span className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-cyan-300" />
                                    )}
                                    {esHoy && (
                                      <span className={`absolute right-1 top-1 text-[8px] font-extrabold uppercase ${seleccionado ? "text-sky-700" : "text-slate-400"}`}>hoy</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                            <p className="mt-4 text-center text-[12px] text-slate-500">
                              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-cyan-300 align-middle" /> Días con horarios disponibles · reunión de {duracion} min
                            </p>
                          </motion.div>
                        )}

                        {/* ── Paso 2: hora ── */}
                        {paso === 2 && diaActual && (
                          <motion.div key="p2" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }}>
                            <div className="mt-6 flex items-center justify-between gap-3">
                              <div>
                                <h2 className="text-[18px] font-extrabold">Elige la hora</h2>
                                <p className="text-[13px] text-slate-400">{resumenDia} · hora de {nombreZona()}</p>
                              </div>
                              <button type="button" onClick={() => setPaso(1)} className="text-[12px] font-bold text-cyan-300 hover:underline">
                                <i className="bx bx-chevron-left align-[-2px]" /> Cambiar día
                              </button>
                            </div>

                            {[
                              ["Mañana", diaActual.huecos.filter((h) => Number(hora(h.inicio).slice(0, 2)) < 12)],
                              ["Tarde", diaActual.huecos.filter((h) => Number(hora(h.inicio).slice(0, 2)) >= 12)],
                            ]
                              .filter(([, hs]) => hs.length)
                              .map(([titulo, hs]) => (
                                <div key={titulo} className="mt-5">
                                  <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{titulo}</div>
                                  <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                                    {hs.map((h) => (
                                      <button
                                        key={h.inicio}
                                        type="button"
                                        onClick={() => elegirHora(h)}
                                        className={`rounded-xl px-3 py-3 text-[15px] font-bold ring-1 transition ${
                                          hueco?.inicio === h.inicio
                                            ? "bg-cyan-300 text-[#06111f] ring-cyan-200"
                                            : "bg-white/[0.05] ring-white/10 hover:bg-cyan-300/20 hover:ring-cyan-300/50"
                                        }`}
                                      >
                                        {hora(h.inicio)}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                          </motion.div>
                        )}

                        {/* ── Paso 3: datos ── */}
                        {paso === 3 && hueco && (
                          <motion.form key="p3" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }} onSubmit={reservar}>
                            <div className="mt-6 flex items-center justify-between gap-3">
                              <div>
                                <h2 className="text-[18px] font-extrabold">Tus datos</h2>
                                <p className="text-[13px] text-slate-400">
                                  {resumenDia} · {hora(hueco.inicio)} – {hora(hueco.fin)}
                                </p>
                              </div>
                              <button type="button" onClick={() => setPaso(2)} className="text-[12px] font-bold text-cyan-300 hover:underline">
                                <i className="bx bx-chevron-left align-[-2px]" /> Cambiar hora
                              </button>
                            </div>

                            <div className="mt-5 grid gap-4">
                              <Campo label="Nombre completo">
                                <input className={inputCls} value={form.nombre} onChange={set("nombre")} placeholder="Nombre y apellido" required autoComplete="name" autoFocus />
                              </Campo>
                              <Campo label="Correo electrónico" hint="Te enviaremos la invitación con todos los detalles.">
                                <input className={inputCls} type="email" value={form.email} onChange={set("email")} placeholder="nombre@correo.com" required autoComplete="email" />
                              </Campo>
                              <Campo label="WhatsApp personal" hint="Te confirmaremos la cita y te avisaremos antes de la hora.">
                                <div className="flex gap-2">
                                  {/* El selector lleva su propio ancho: con `w-full` de inputCls
                                      se comía el campo del número. Sin banderas: en Windows el
                                      emoji no se dibuja y quedaba "EC +593". */}
                                  <select
                                    className="w-[150px] shrink-0 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3 text-[14px] text-white outline-none transition focus:border-cyan-300/60"
                                    value={form.cc}
                                    onChange={set("cc")}
                                    style={{ colorScheme: tema.claro ? "light" : "dark" }}
                                    aria-label="Código de país"
                                  >
                                    {PAISES.map((p) => (
                                      <option key={p.code} value={p.code}>
                                        {p.name} {p.code}
                                      </option>
                                    ))}
                                  </select>
                                  <input className={`${inputCls} min-w-0 flex-1`} type="tel" inputMode="tel" value={form.telefono} onChange={set("telefono")} placeholder="99 123 4567" required autoComplete="tel-national" />
                                </div>
                              </Campo>
                              <Campo label="Comentario" hint="Opcional.">
                                <input
                                  className={inputCls}
                                  value={form.nota}
                                  onChange={set("nota")}
                                  placeholder={principal ? "Qué vendes, en qué país, qué quieres automatizar…" : "Cuéntanos brevemente el motivo de la cita."}
                                  maxLength={300}
                                />
                              </Campo>
                            </div>

                            {errorForm && (
                              <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-[13px] text-rose-200">
                                <i className="bx bx-error-circle mr-1 align-[-2px]" /> {errorForm}
                              </div>
                            )}

                            <div className="mt-5">
                              <button
                                type="submit"
                                disabled={enviando}
                                className="agp-boton group relative inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold uppercase tracking-[0.08em] transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-70"
                              >
                                {previa ? "Vista previa (no reserva)" : enviando ? "Reservando…" : principal ? "Confirmar reunión" : "Confirmar cita"}
                                <span className="transition-transform group-hover:translate-x-0.5">→</span>
                              </button>
                              <p className="mt-3 text-center text-[12px] text-slate-500">
                                {principal ? "Sin costo. " : ""}Si necesitas cambiar la hora, responde el mensaje de confirmación y lo reprogramamos.
                              </p>
                            </div>
                          </motion.form>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </section>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!principal && (
          <p className="mt-10 text-center text-[12px] text-slate-500">
            Agenda con tecnología de{" "}
            <a href="/home" target="_blank" rel="noreferrer" className="font-bold text-slate-300 hover:text-white">
              ImporChat
            </a>
          </p>
        )}
      </main>
    </div>
  );
}

function Confirmacion({ cita, repetida, email, enlaceCalendario, negocio }) {
  if (!cita) return null;
  const presencial = !!cita.lugar;
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="agp-tarjeta-ok mx-auto max-w-2xl rounded-[26px] p-7 text-center ring-1 ring-white/10 sm:p-10"
    >
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-400/15 ring-1 ring-emerald-300/40">
        <i className="bx bx-check text-4xl text-emerald-300" />
      </span>
      <h1 className="mt-5 text-[30px] font-extrabold leading-tight sm:text-[36px]">
        {repetida ? "Ya tienes una cita agendada" : negocio ? "Cita agendada" : "Reunión agendada"}
      </h1>
      <p className="mt-3 text-[17px] text-white">
        {cap(fmt(cita.inicio, { weekday: "long", day: "numeric", month: "long" }))} · {hora(cita.inicio)} a {hora(cita.fin)}
        <span className="block text-[13px] text-slate-400">
          Hora de {nombreZona()}
          {cita.asesor ? ` · te atiende ${cita.asesor}` : ""}
          {negocio ? ` · ${negocio}` : ""}
        </span>
      </p>

      <div className="mx-auto mt-7 max-w-md space-y-3 text-left text-[14px] text-slate-300">
        {presencial && (
          <div className="flex items-start gap-3 rounded-xl bg-white/[0.05] px-4 py-3 ring-1 ring-white/10">
            <i className="bx bx-map mt-0.5 text-[20px] text-sky-300" />
            <span>
              Te esperamos en <b className="text-white">{cita.lugar}</b>.
            </span>
          </div>
        )}
        <div className="flex items-start gap-3 rounded-xl bg-white/[0.05] px-4 py-3 ring-1 ring-white/10">
          <i className="bx bx-envelope mt-0.5 text-[20px] text-sky-300" />
          <span>
            {cita.correo_enviado === false ? (
              presencial ? (
                "Te confirmaremos por WhatsApp con los detalles de la cita."
              ) : (
                "Te confirmaremos por WhatsApp con el enlace de la videollamada."
              )
            ) : (
              <>
                La invitación{presencial ? "" : " con el enlace de la videollamada"} va a <b className="text-white">{email}</b>. Si no la ves, revisa la carpeta de spam.
              </>
            )}
          </span>
        </div>
        <div className="flex items-start gap-3 rounded-xl bg-white/[0.05] px-4 py-3 ring-1 ring-white/10">
          <i className="bxl-whatsapp bx mt-0.5 text-[20px]" style={{ color: "#25D366" }} />
          <span>
            {cita.whatsapp_enviado
              ? "Te enviamos la confirmación a tu WhatsApp y te recordaremos antes de la hora. Si necesitas cambiar la cita, responde ese mensaje."
              : "Te recordaremos por WhatsApp antes de la hora. Si necesitas cambiar la cita, responde ese mensaje."}
          </span>
        </div>
      </div>

      <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
        {cita.meeting_url && !presencial && (
          <a href={cita.meeting_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-[#0B1426] hover:bg-slate-100">
            <i className="bx bx-video text-lg" /> Enlace de la videollamada
          </a>
        )}
        <a href={enlaceCalendario(cita)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 text-sm font-bold ring-1 ring-white/15 hover:bg-white/15">
          <i className="bx bx-calendar-plus text-lg" /> Agregar a mi calendario
        </a>
      </div>
    </motion.section>
  );
}
