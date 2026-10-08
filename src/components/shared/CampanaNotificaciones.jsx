import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";

/* Campana de notificaciones internas (encabezado general y cabecera del chat).

   Genérica: pinta lo que mande el back en /notificaciones (título, mensaje,
   url de destino y datos). Hoy solo llegan "novedad Dropi requiere asesor";
   para un tipo nuevo basta con agregarlo a TIPOS si quiere ícono propio.

   El contador se refresca cada minuto y al volver a la pestaña. No es tiempo
   real a propósito: el canal principal del socket no identifica al usuario. */

const INTERVALO_MS = 60 * 1000;
const ANCHO_PANEL = 380;
const MARGEN = 8;
const POR_PAGINA = 15;

const TIPOS = {
  novedad_dropi: { icono: "bx-error-circle", color: "bg-amber-50 text-amber-600" },
};
const TIPO_DEFECTO = { icono: "bx-bell", color: "bg-slate-100 text-slate-500" };

const hace = (s) => {
  const ms = Date.now() - new Date(s).getTime();
  if (!Number.isFinite(ms) || ms < 60000) return "ahora";
  const min = Math.floor(ms / 60000);
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "ayer" : `hace ${d} d`;
};

const idConfiguracionActual = () => {
  const v = parseInt(localStorage.getItem("id_configuracion"), 10);
  return Number.isFinite(v) && v > 0 ? v : null;
};

export default function CampanaNotificaciones() {
  const navigate = useNavigate();
  const ref = useRef(null);
  const panelRef = useRef(null);
  // Dónde se dibuja el panel (coordenadas de la ventana).
  const [pos, setPos] = useState(null);
  const [abierta, setAbierta] = useState(false);
  const [noLeidas, setNoLeidas] = useState(0);
  const [lista, setLista] = useState([]);
  const [hayMas, setHayMas] = useState(false);
  const [soloNoLeidas, setSoloNoLeidas] = useState(false);
  const [cargando, setCargando] = useState(false);

  /* Contador: silencioso. Si falla (sin red, sesión vencida) no molesta; el
     interceptor de chatApi ya se encarga de los casos que sí importan. */
  const cargarConteo = useCallback(async () => {
    try {
      const res = await chatApi.get("notificaciones/conteo", {
        params: { id_configuracion: idConfiguracionActual() || undefined },
      });
      setNoLeidas(Number(res?.data?.data?.no_leidas) || 0);
    } catch (_) {
      /* silencioso */
    }
  }, []);

  const cargarLista = useCallback(
    async ({ agregar = false, desde = 0 } = {}) => {
      setCargando(true);
      try {
        const res = await chatApi.get("notificaciones", {
          params: {
            id_configuracion: idConfiguracionActual() || undefined,
            solo_no_leidas: soloNoLeidas ? 1 : undefined,
            limit: POR_PAGINA,
            offset: desde || undefined,
          },
        });
        const d = res?.data?.data || {};
        const nuevas = Array.isArray(d.notificaciones) ? d.notificaciones : [];
        setLista((prev) => (agregar ? [...prev, ...nuevas] : nuevas));
        setHayMas(!!d.hayMas);
        setNoLeidas(Number(d.no_leidas) || 0);
      } catch (_) {
        /* silencioso */
      } finally {
        setCargando(false);
      }
    },
    [soloNoLeidas],
  );

  useEffect(() => {
    cargarConteo();
    const t = setInterval(cargarConteo, INTERVALO_MS);
    const alVolver = () => document.visibilityState === "visible" && cargarConteo();
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [cargarConteo]);

  useEffect(() => {
    if (abierta) cargarLista();
  }, [abierta, cargarLista]);

  useEffect(() => {
    if (!abierta) return undefined;
    const fuera = (e) => {
      if (ref.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setAbierta(false);
    };
    const esc = (e) => e.key === "Escape" && setAbierta(false);
    document.addEventListener("mousedown", fuera);
    window.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fuera);
      window.removeEventListener("keydown", esc);
    };
  }, [abierta]);

  /* El panel se dibuja en document.body con posición fija, no dentro del
     encabezado: en el chat la cabecera vive en la columna izquierda, que es
     angosta y recorta lo que se sale (el panel quedaba cortado). Se alinea al
     borde derecho de la campana y, si no cabe, se corre para quedar siempre
     dentro de la ventana. */
  const ubicar = useCallback(() => {
    const boton = ref.current?.getBoundingClientRect();
    if (!boton) return;
    const ancho = Math.min(ANCHO_PANEL, window.innerWidth - MARGEN * 2);
    const izquierda = Math.min(
      Math.max(boton.right - ancho, MARGEN),
      window.innerWidth - ancho - MARGEN,
    );
    const arriba = boton.bottom + MARGEN;
    setPos({
      left: izquierda,
      top: arriba,
      width: ancho,
      maxHeight: Math.max(240, window.innerHeight - arriba - MARGEN),
    });
  }, []);

  useLayoutEffect(() => {
    if (!abierta) return undefined;
    ubicar();
    window.addEventListener("resize", ubicar);
    window.addEventListener("scroll", ubicar, true);
    return () => {
      window.removeEventListener("resize", ubicar);
      window.removeEventListener("scroll", ubicar, true);
    };
  }, [abierta, ubicar]);

  const marcarVista = async (n) => {
    if (n.leida) return;
    setLista((prev) =>
      soloNoLeidas
        ? prev.filter((x) => x.id !== n.id)
        : prev.map((x) => (x.id === n.id ? { ...x, leida: true } : x)),
    );
    setNoLeidas((c) => Math.max(0, c - 1));
    try {
      await chatApi.patch(`notificaciones/${n.id}/leida`);
    } catch (_) {
      cargarConteo();
    }
  };

  const marcarTodas = async () => {
    setLista((prev) => (soloNoLeidas ? [] : prev.map((x) => ({ ...x, leida: true }))));
    setNoLeidas(0);
    try {
      await chatApi.post("notificaciones/leer-todas", {
        id_configuracion: idConfiguracionActual() || undefined,
      });
    } catch (_) {
      cargarConteo();
    }
  };

  const abrir = (n) => {
    marcarVista(n);
    if (!n.url) return;
    // La ruta de destino trabaja sobre la conexión elegida: si el aviso es de
    // otra cuenta, llevarlo ahí mostraría los datos de la cuenta equivocada.
    const actual = idConfiguracionActual();
    if (n.id_configuracion && actual && n.id_configuracion !== actual) {
      Swal.fire({
        icon: "info",
        title: "Es de otra conexión",
        text: `Este aviso pertenece a "${n.nombre_configuracion || "otra conexión"}". Entra a esa conexión para verlo.`,
        confirmButtonColor: "#171931",
      });
      return;
    }
    setAbierta(false);
    navigate(n.url);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-white/90 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
        aria-label={`Notificaciones${noLeidas ? `, ${noLeidas} sin ver` : ""}`}
        title="Notificaciones"
      >
        <i className={`bx ${noLeidas ? "bxs-bell" : "bx-bell"} text-2xl`} />
        {noLeidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-[20px] place-items-center rounded-full bg-rose-500 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-[#171931]">
            {noLeidas > 99 ? "99+" : noLeidas}
          </span>
        )}
      </button>

      {abierta &&
        pos &&
        createPortal(
        <div
          ref={panelRef}
          style={pos}
          className="fixed z-[1000] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left text-slate-800 shadow-2xl"
        >
          {/* Cabecera */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-extrabold text-slate-800">Notificaciones</p>
              <p className="text-[11px] text-slate-500">
                {noLeidas
                  ? `${noLeidas} sin ver`
                  : "Estás al día"}
              </p>
            </div>
            <button
              type="button"
              onClick={marcarTodas}
              disabled={!noLeidas}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#171931] transition hover:bg-slate-100 disabled:cursor-default disabled:text-slate-300 disabled:hover:bg-transparent"
            >
              <i className="bx bx-check-double text-base" />
              Marcar todas como vistas
            </button>
          </div>

          {/* Filtro */}
          <div className="flex gap-1.5 border-b border-slate-100 px-4 py-2">
            {[
              { v: false, label: "Todas" },
              { v: true, label: "Sin ver" },
            ].map((f) => (
              <button
                key={f.label}
                type="button"
                onClick={() => setSoloNoLeidas(f.v)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  soloNoLeidas === f.v
                    ? "bg-[#171931] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Lista */}
          <div className="min-h-0 flex-1 overflow-y-auto" style={{ maxHeight: 420 }}>
            {cargando && !lista.length ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : !lista.length ? (
              <div className="px-6 py-10 text-center">
                <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-slate-100">
                  <i className="bx bx-bell-off text-2xl text-slate-400" />
                </div>
                <p className="text-sm font-bold text-slate-700">
                  {soloNoLeidas ? "No tienes avisos sin ver" : "Sin notificaciones"}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Aquí aparecerán los avisos que necesiten tu atención.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {lista.map((n) => {
                  const t = TIPOS[n.tipo] || TIPO_DEFECTO;
                  const d = n.datos || {};
                  return (
                    <li
                      key={n.id}
                      className={`group relative flex gap-3 px-4 py-3 transition hover:bg-slate-50 ${
                        n.leida ? "" : "bg-sky-50/50"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => abrir(n)}
                        className="flex min-w-0 flex-1 gap-3 text-left"
                      >
                        <span
                          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${t.color}`}
                        >
                          <i className={`bx ${t.icono} text-lg`} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block text-[13px] leading-snug ${
                              n.leida ? "font-medium text-slate-700" : "font-bold text-slate-900"
                            }`}
                          >
                            {n.titulo}
                          </span>
                          {n.mensaje && (
                            <span className="mt-0.5 line-clamp-2 block text-xs text-slate-600">
                              {n.mensaje}
                            </span>
                          )}
                          <span className="mt-1.5 flex flex-wrap items-center gap-1">
                            {/* De quién es el chat: a quién le toca */}
                            {"encargado" in d && (
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                  d.encargado
                                    ? "bg-violet-100 text-violet-700"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                <i className="bx bx-user-circle" />
                                {d.encargado || "Sin encargado"}
                              </span>
                            )}
                            {d.cliente && (
                              <span className="inline-flex max-w-[150px] items-center gap-1 truncate rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                                <i className="bx bx-user" />
                                <span className="truncate">{d.cliente}</span>
                              </span>
                            )}
                            <span className="text-[11px] text-slate-400">
                              {hace(n.created_at)}
                            </span>
                          </span>
                        </span>
                      </button>

                      {n.leida ? (
                        <i
                          className="bx bx-check-double mt-1 shrink-0 text-base text-slate-300"
                          title="Vista"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => marcarVista(n)}
                          title="Marcar como vista"
                          className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-sky-500 transition hover:bg-sky-100"
                        >
                          <span className="h-2.5 w-2.5 rounded-full bg-sky-500 group-hover:hidden" />
                          <i className="bx bx-check hidden text-lg group-hover:block" />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {hayMas && (
              <button
                type="button"
                onClick={() => cargarLista({ agregar: true, desde: lista.length })}
                disabled={cargando}
                className="w-full border-t border-slate-100 py-2.5 text-xs font-semibold text-[#171931] transition hover:bg-slate-50 disabled:opacity-50"
              >
                {cargando ? "Cargando…" : "Ver más"}
              </button>
            )}
          </div>
        </div>,
          document.body,
        )}
    </div>
  );
}
