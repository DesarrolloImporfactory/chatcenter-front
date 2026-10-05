import { useEffect, useRef, useState } from "react";
import chatApi from "../../api/chatcenter";
import { useSocket } from "../../context/SocketProvider";

/**
 * Teléfono de Zadarma integrado (telefonía por saldo).
 *
 * Carga el widget WebRTC oficial de Zadarma pero lo mantiene OCULTO: su
 * teléfono flotante no encaja con la app. En su lugar, este componente
 * expone `window.telefoniaZadarma` (llamar, colgar, silenciar) y pinta su
 * propio panel de llamada, con el mismo estilo que el de WhatsApp. El widget
 * queda debajo solo para el audio y la señalización SIP.
 *
 * Se carga BAJO DEMANDA (2026-10-05): solo cuando el asesor pulsa "Con saldo
 * (celular)" se pide GET /telefonia/widget (que le asigna una extensión de
 * la central) y se registra el teléfono. Antes se cargaba al abrir el chat
 * para todo el mundo y, con 2 extensiones y decenas de asesores, saltaba
 * "no quedan extensiones" a gente que nunca iba a llamar. Mientras está
 * registrado manda un latido cada 5 min para conservar la extensión; si el
 * back se la recicla a otro asesor (TELEFONIA_EXTENSION_LIBERADA) se
 * desregistra y la próxima llamada vuelve a prepararse.
 *
 * Métodos del widget usados (widget-api.min.js): apiWidget.call(numero),
 * .answer(), .finishCall(), .micSwitch('on'|'off'). Estados: se toman
 * envolviendo los métodos de la interfaz (zdrmWPhI): ringing, startTimer
 * (contestó), finishCall (terminó).
 */
const SCRIPTS = [
  "https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-lib.js?sub_v=1",
  "https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-fn.js?sub_v=1",
];
const RENOVAR_MS = 12 * 3600 * 1000;
const CSS_OCULTAR = `
  .zdrm-webphone-wrapper, .zdrm-phone, [class^="zdrm-webphone-"][class*="zdrm-fixed"] { display: none !important; }
`;

function cargarScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = false;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    document.head.appendChild(s);
  });
}

const fmt = (seg) => {
  const s = Math.max(0, Math.floor(seg));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

function Cronometro({ desde }) {
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="tabular-nums">{fmt((ahora - desde) / 1000)}</span>;
}

const iniciales = (nombre) => {
  const partes = String(nombre || "").trim().split(/\s+/);
  if (!partes[0]) return "?";
  return ((partes[0][0] || "") + (partes[1]?.[0] || "")).toUpperCase();
};

export default function WidgetZadarma() {
  const [llamada, setLlamada] = useState(null); // { numero, nombre, fase, inicio, error }
  const [silenciado, setSilenciado] = useState(false);
  const iniciadoRef = useRef(false);
  const idCfgRef = useRef(null);
  const limpiezaRef = useRef(null);

  /* ── Ocultar el teléfono de Zadarma con CSS desde antes de que exista ── */
  useEffect(() => {
    if (document.getElementById("zadarma-oculto-css")) return;
    const st = document.createElement("style");
    st.id = "zadarma-oculto-css";
    st.textContent = CSS_OCULTAR;
    document.head.appendChild(st);
  }, []);

  /* ── Estados del widget → nuestro panel ── */
  const engancharEstados = () => {
    const w = window.zdrmWPhI;
    if (!w || w.__imporchat) return;
    w.__imporchat = true;
    const envolver = (nombre, fase) => {
      const orig = typeof w[nombre] === "function" ? w[nombre].bind(w) : null;
      w[nombre] = (...args) => {
        setLlamada((a) => {
          if (!a) return a;
          if (fase === "en_curso") return { ...a, fase, inicio: Date.now() };
          if (fase === "finalizada") {
            clearTimeout(limpiezaRef.current);
            limpiezaRef.current = setTimeout(() => setLlamada(null), 4000);
            return { ...a, fase };
          }
          return { ...a, fase };
        });
        return orig ? orig(...args) : undefined;
      };
    };
    envolver("ringing", "timbrando");
    envolver("startTimer", "en_curso");
    envolver("finishCall", "finalizada");
  };

  /* ── API para el botón de la cabecera ── */
  useEffect(() => {
    window.telefoniaZadarma = {
      listo: () => !!(window.zdrmWPhI && window.zdrmWPhI.apiWidget),
      llamar: (numero, meta = {}) => {
        const api = window.zdrmWPhI?.apiWidget;
        if (!api) throw new Error("El teléfono todavía no está listo. Espera unos segundos y vuelve a intentar.");
        engancharEstados();
        clearTimeout(limpiezaRef.current);
        setSilenciado(false);
        setLlamada({ numero, nombre: meta.nombre || "", fase: "llamando", inicio: null, error: "" });
        /* Siempre con "+": sin él, el widget toma el número como nacional y
           le antepone el país de la cuenta. Así "593962803007" salía como
           593593962803007 y Zadarma lo rechazaba ("no ha podido
           realizarse"). Con el "+" lo marca tal cual, en internacional. */
        const internacional = `+${String(numero).replace(/\D/g, "")}`;
        const r = api.call(internacional);
        if (typeof r === "string") {
          // el widget devuelve texto de error cuando no puede marcar
          setLlamada((a) => (a ? { ...a, fase: "finalizada", error: r } : a));
          limpiezaRef.current = setTimeout(() => setLlamada(null), 6000);
          throw new Error(r);
        }
      },
      colgar: () => {
        try {
          const api = window.zdrmWPhI?.apiWidget;
          if (api) {
            if (typeof api.cancel === "function") api.cancel();
            api.finishCall();
          }
        } catch {
          /* nada */
        }
        setLlamada((a) => (a ? { ...a, fase: "finalizada" } : a));
        clearTimeout(limpiezaRef.current);
        limpiezaRef.current = setTimeout(() => setLlamada(null), 3000);
      },
      silenciar: (on) => {
        try {
          /* Ojo con el widget: micSwitch("on") SILENCIA el micrófono y
             micSwitch("off") lo vuelve a activar (widget-api.min.js:
             "on" → mediaControl(local, mute)). Está al revés de lo que
             sugiere el nombre; el primer intento lo llamaba invertido y el
             botón no hacía nada. setParams deja el estado igual que el
             botón propio del widget. */
          window.zdrmWPhI?.setParams?.("zdrmMicMute", !!on);
          window.zdrmWPhI?.apiWidget?.micSwitch(on ? "on" : "off");
          setSilenciado(!!on);
        } catch {
          /* nada */
        }
      },
    };
    return () => {
      delete window.telefoniaZadarma;
    };
  }, []);

  /* ── Preparar el teléfono bajo demanda ──
     Pide la llave y la extensión al back, carga los scripts de Zadarma una
     sola vez y registra. Si ya está registrado con la misma extensión, no
     hace nada. Si la extensión cambió (la anterior se recicló), vuelve a
     construir el widget con la nueva. */
  const sipRef = useRef(null);
  const preparandoRef = useRef(null);
  const preparar = async () => {
    if (preparandoRef.current) return preparandoRef.current;
    preparandoRef.current = (async () => {
      const idCfg = Number(localStorage.getItem("id_configuracion")) || null;
      if (!idCfg) throw new Error("No hay una conexión abierta.");
      const { data } = await chatApi.get("/telefonia/widget", { params: { id_configuracion: idCfg } });
      const d = data?.data || {};
      if (!d.activo || !d.key || !d.sip) {
        throw new Error(d.motivo || "Esta conexión no tiene telefonía por saldo.");
      }
      for (const src of SCRIPTS) await cargarScript(src);
      if (typeof window.zadarmaWidgetFn !== "function") throw new Error("No se pudo cargar el teléfono de Zadarma.");
      if (iniciadoRef.current && sipRef.current === d.sip) {
        try {
          window.zdrmWPhI?.apiWidget?.reg?.();
        } catch {
          /* nada */
        }
        return d;
      }
      if (iniciadoRef.current) {
        // Extensión distinta: se desregistra la vieja y se reconstruye.
        try {
          window.zdrmWPhI?.apiWidget?.unreg?.();
        } catch {
          /* nada */
        }
        document.querySelectorAll(".zdrm-webphone-wrapper, .zdrm-phone").forEach((n) => n.remove());
        if (window.zdrmWPhI) window.zdrmWPhI.__imporchat = false;
      }
      window.zadarmaWidgetFn(d.key, d.sip, "rounded", "es", true, { right: "10px", bottom: "5px" });
      iniciadoRef.current = true;
      sipRef.current = d.sip;
      idCfgRef.current = idCfg;
      setTimeout(engancharEstados, 1500);
      console.log("[telefonia] teléfono listo (oculto), extensión", d.extension);
      // El widget tarda un momento en registrar la extensión.
      await new Promise((r) => setTimeout(r, 1500));
      return d;
    })();
    try {
      return await preparandoRef.current;
    } finally {
      preparandoRef.current = null;
    }
  };
  useEffect(() => {
    if (window.telefoniaZadarma) window.telefoniaZadarma.preparar = preparar;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Latido: mientras el teléfono esté registrado, cada 5 min se avisa al
     back que sigue en uso (conserva la extensión y renueva la llave). ── */
  useEffect(() => {
    const id = setInterval(() => {
      if (!iniciadoRef.current || document.visibilityState !== "visible") return;
      const idCfg = idCfgRef.current;
      if (idCfg) chatApi.get("/telefonia/widget", { params: { id_configuracion: idCfg } }).catch(() => {});
    }, 5 * 60_000);
    return () => clearInterval(id);
  }, []);

  /* ── El back recicló mi extensión a otro asesor: me desregistro. ── */
  const { socket } = useSocket() || {};
  useEffect(() => {
    if (!socket) return undefined;
    const h = () => {
      if (!iniciadoRef.current) return;
      try {
        window.zdrmWPhI?.apiWidget?.unreg?.();
      } catch {
        /* nada */
      }
      sipRef.current = null;
      console.log("[telefonia] la extensión se asignó a otro asesor; se volverá a preparar al llamar");
    };
    socket.on("TELEFONIA_EXTENSION_LIBERADA", h);
    return () => socket.off("TELEFONIA_EXTENSION_LIBERADA", h);
  }, [socket]);

  if (!llamada) return null;

  const { fase } = llamada;
  const enCurso = fase === "en_curso";
  const borde = enCurso ? "border-sky-500" : fase === "finalizada" ? "border-slate-200" : "border-sky-300 ring-4 ring-sky-100";
  const texto =
    fase === "llamando"
      ? "Marcando…"
      : fase === "timbrando"
        ? "Timbrando…"
        : enCurso
          ? "En llamada"
          : llamada.error || "Llamada finalizada";

  return (
    <div className={`fixed bottom-24 right-4 z-[90] w-[300px] rounded-2xl border bg-white p-4 shadow-2xl ${borde}`} role="dialog">
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <div className={`h-12 w-12 rounded-full grid place-items-center text-sm font-bold text-white bg-gradient-to-br from-sky-500 to-sky-700 ${fase === "llamando" || fase === "timbrando" ? "animate-pulse" : ""}`}>
            {iniciales(llamada.nombre || llamada.numero)}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-sky-500 ring-2 ring-white">
            <i className="bx bx-mobile-alt text-[11px] text-white" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-slate-900">{llamada.nombre || `+${llamada.numero}`}</div>
          <div className="truncate text-xs text-slate-500">+{llamada.numero} · llamada por saldo</div>
          <div className={`mt-0.5 text-[11px] font-semibold ${enCurso ? "text-sky-700" : "text-slate-600"}`}>
            <i className={`bx ${enCurso ? "bx-phone" : fase === "finalizada" ? "bx-phone-off" : "bx-phone-outgoing bx-tada"}`} /> {texto}
            {enCurso && llamada.inicio ? <> · <Cronometro desde={llamada.inicio} /></> : null}
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        {fase !== "finalizada" ? (
          <>
            <button type="button" onClick={() => window.telefoniaZadarma?.silenciar(!silenciado)} className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold ${silenciado ? "border-amber-300 bg-amber-50 text-amber-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
              <i className={`bx ${silenciado ? "bx-microphone-off" : "bx-microphone"} text-base`} /> {silenciado ? "Activar micro" : "Silenciar"}
            </button>
            <button type="button" onClick={() => window.telefoniaZadarma?.colgar()} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-sm font-bold text-white hover:bg-rose-700">
              <i className="bx bx-phone-off text-base" /> Colgar
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setLlamada(null)} className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Cerrar
          </button>
        )}
      </div>
    </div>
  );
}
