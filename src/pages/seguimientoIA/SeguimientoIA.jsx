import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  IA_AGENTES_HABILITADOS,
  analizarCotizacionIA,
  asignarmeChat,
  descartarCotizacionIA,
  getActorChatcenter,
  getBandejaIA,
  restaurarCotizacionIA,
} from "../../services/imporsuit";

/** Motivos rápidos para descartar (se pueden editar). Mismos que en Imporsuit. */
const MOTIVOS_DESCARTE = [
  "Compró con otro proveedor",
  "El cliente desistió de la compra",
  "Cotización duplicada o de prueba",
  "Ya se cerró por otro lado",
  "No es un cliente real",
];
import {
  Aviso,
  MOTIVOS,
  Resultado,
  SITUACIONES,
} from "../../components/imporsuit/AnalisisIAImporsuitSection";

/**
 * «Seguimiento IA» dentro de ImporChat (pedido 2026-09-25) — la bandeja de
 * trabajo de Johan.
 *
 * Todas las cotizaciones sin respuesta (más de 3 días sin cerrarse; las
 * anuladas no entran) de todos los asesores, con el análisis de la IA: por qué no se cerró y cómo
 * recuperarla. Desde cada una se va directo al chat del cliente en la línea
 * 265; si el chat lo atiende otro asesor, Johan se lo puede asignar (lo hace
 * la transferencia normal del socket, que deja el historial y el aviso).
 *
 * Es la misma bandeja que «Seguimiento IA» de Imporsuit (React y legacy),
 * servida por Carterachat/ia_bandeja. El cron de la noche hace los análisis;
 * el botón es para los que faltan o fallaron.
 */

const FILTROS_INICIALES = {
  dias: 90,
  search: "",
  id_asesor: "",
  tipo: "",
  estado_ia: "",
  situacion: "",
  motivo: "",
  recuperar: "",
  descartadas: "",
  orden: "",
  page: 1,
  limit: 20,
};

const INTERVALO_SONDEO_MS = 5000;
const MAX_SONDEOS = 40;

export default function SeguimientoIA() {
  const navigate = useNavigate();
  const actor = getActorChatcenter();
  const habilitado = IA_AGENTES_HABILITADOS.includes(Number(actor.id_sub_usuario));

  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [busqueda, setBusqueda] = useState("");
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [abiertas, setAbiertas] = useState({});
  const [analizando, setAnalizando] = useState({});
  const [asesores, setAsesores] = useState([]);
  const vivo = useRef(true);

  useEffect(() => {
    if (!habilitado) navigate("/chat", { replace: true });
  }, [habilitado, navigate]);

  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  const cargar = useCallback(
    async (signal) => {
      setCargando(true);
      setError("");
      try {
        const r = await getBandejaIA(filtros, { signal });
        if (!vivo.current) return r;
        setDatos(r);
        if (!filtros.id_asesor && r.asesores?.length) setAsesores(r.asesores);
        return r;
      } catch (e) {
        if (e?.name !== "CanceledError" && vivo.current) setError(e.message || "No se pudo cargar la bandeja.");
        return null;
      } finally {
        if (vivo.current) setCargando(false);
      }
    },
    [filtros],
  );

  useEffect(() => {
    if (!habilitado) return undefined;
    const ctrl = new AbortController();
    cargar(ctrl.signal);
    return () => ctrl.abort();
  }, [cargar, habilitado]);

  // Búsqueda con debounce.
  useEffect(() => {
    const t = setTimeout(() => {
      setFiltros((f) => (f.search === busqueda ? f : { ...f, search: busqueda, page: 1 }));
    }, 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  const aplicar = (cambios) => setFiltros((f) => ({ ...f, page: 1, ...cambios }));

  const marcar = (clave, on) =>
    setAnalizando((a) => {
      const b = { ...a };
      if (on) b[clave] = true;
      else delete b[clave];
      return b;
    });

  async function sondear(clave) {
    for (let i = 0; i < MAX_SONDEOS && vivo.current; i += 1) {
      await new Promise((r) => setTimeout(r, INTERVALO_SONDEO_MS));
      const r = await cargar();
      const fila = r?.data?.find((x) => `${x.tipo}:${x.id}` === clave);
      if (!fila || fila.estado_ia !== "procesando") break;
    }
    if (vivo.current) marcar(clave, false);
  }

  async function analizar(cot) {
    const clave = `${cot.tipo}:${cot.id}`;
    marcar(clave, true);
    try {
      const a = await analizarCotizacionIA({ tipo: cot.tipo, id: cot.id });
      if (a?.estado === "procesando") {
        sondear(clave);
        return;
      }
      await cargar();
      if (vivo.current) setAbiertas((x) => ({ ...x, [clave]: true }));
      marcar(clave, false);
    } catch (e) {
      // Timeout o corte: el back termina igual, se sondea.
      if (!e.payload && (!e.status || e.status >= 500)) {
        sondear(clave);
        return;
      }
      marcar(clave, false);
      Swal.fire("No se pudo analizar", e.message || "", "error");
    }
  }

  async function descartar(cot) {
    const chips = MOTIVOS_DESCARTE.map(
      (m) =>
        `<button type="button" data-motivo="${escapar(m)}" style="border:1px solid #e2e8f0;background:#f8fafc;border-radius:6px;padding:3px 8px;font-size:11px;font-weight:600;color:#334155;cursor:pointer">${escapar(m)}</button>`,
    ).join("");
    const r = await Swal.fire({
      title: `Descartar ${escapar(cot.codigo || `#${cot.id}`)}`,
      html: `<p style="margin:0 0 10px;color:#64748b;font-size:13px;text-align:left">${escapar(
        cot.cliente || "Cliente",
      )} · asesor ${escapar(cot.asesor || "—")}. Sale del seguimiento; se ve en «Descartadas» y se puede restaurar.</p>
             <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px">${chips}</div>`,
      input: "textarea",
      inputPlaceholder: "Por qué sale del seguimiento…",
      inputAttributes: { maxlength: "500" },
      showCancelButton: true,
      confirmButtonText: "Descartar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
      didOpen: (popup) =>
        popup.querySelectorAll("[data-motivo]").forEach((b) =>
          b.addEventListener("click", () => {
            Swal.getInput().value = b.dataset.motivo;
          }),
        ),
      preConfirm: async (motivo) => {
        if (!motivo || motivo.trim().length < 3) {
          Swal.showValidationMessage("Escribe el motivo del descarte");
          return false;
        }
        try {
          await descartarCotizacionIA({ tipo: cot.tipo, id: cot.id, motivo: motivo.trim() });
          return true;
        } catch (e) {
          Swal.showValidationMessage(e.message || "No se pudo descartar");
          return false;
        }
      },
    });
    if (r.isConfirmed) cargar();
  }

  async function restaurar(cot) {
    try {
      await restaurarCotizacionIA({ tipo: cot.tipo, id: cot.id });
      cargar();
    } catch (e) {
      Swal.fire("No se pudo restaurar", e.message || "", "error");
    }
  }

  async function irAlChat(cot) {
    const chat = cot.chat;
    if (!chat) return;
    const linea = datos?.linea ?? 265;
    const esMio = chat.id_encargado == null || String(chat.id_encargado) === String(actor.id_sub_usuario);

    if (!esMio) {
      const r = await Swal.fire({
        icon: "question",
        title: "¿Asignarte este chat?",
        html: `El chat de <b>${escapar(cot.cliente || "este cliente")}</b> lo atiende <b>${escapar(
          chat.encargado || "otro asesor",
        )}</b>.<br>Para escribirle tienes que asignártelo: quedará en tu bandeja y se avisa en el chat.`,
        showCancelButton: true,
        confirmButtonText: "Asignármelo y abrir",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#7c3aed",
      });
      if (!r.isConfirmed) return;
      if (!datos?.departamento_agente) {
        Swal.fire("No se pudo asignar", "No estás en ningún departamento de esta línea.", "error");
        return;
      }
      try {
        await asignarmeChat({
          idCliente: chat.id,
          idConfiguracion: linea,
          idDepartamento: datos.departamento_agente,
          motivo: `Seguimiento IA de la cotización ${cot.codigo || `#${cot.id}`}`,
        });
      } catch (e) {
        Swal.fire(
          "No se pudo asignar",
          e?.response?.data?.message || e.message || "El servidor rechazó la transferencia.",
          "error",
        );
        return;
      }
    }

    // El chat abre en la línea de la cotización (como PendingQueue).
    localStorage.setItem("id_configuracion", String(linea));
    navigate(`/chat/${chat.id}`);
  }

  if (!habilitado) return null;

  const c = datos?.conteos ?? {};
  const sit = c.situacion ?? {};
  const est = c.estado_ia ?? {};
  const kpis = [
    { label: "Atascadas", valor: datos?.total_alcance ?? 0, ayuda: `Últimos ${filtros.dias} días`, tono: "text-slate-900", filtro: { estado_ia: "", situacion: "", recuperar: "" } },
    { label: "Sin analizar", valor: est.sin ?? 0, ayuda: `El cron las toma esta noche${est.error ? ` · ${est.error} fallaron` : ""}`, tono: "text-slate-600", filtro: { estado_ia: "sin", situacion: "", recuperar: "" } },
    { label: "Recuperables (alta)", valor: c.probabilidad_recuperar?.alta ?? 0, ayuda: "Vale la pena retomarlas hoy", tono: "text-sky-700", filtro: { estado_ia: "listo", situacion: "", recuperar: "alta" } },
    { label: "Ventas perdidas", valor: sit.no_cerrada ?? 0, ayuda: "No se cerraron de verdad", tono: "text-amber-700", filtro: { estado_ia: "listo", situacion: "no_cerrada", recuperar: "" } },
    { label: "Cerradas sin actualizar", valor: sit.cerrada_no_reflejada ?? 0, ayuda: "Se pagaron: corregir el estado", tono: "text-emerald-700", filtro: { estado_ia: "listo", situacion: "cerrada_no_reflejada", recuperar: "" } },
  ];
  const kpiActivo = (k) => Object.entries(k.filtro).every(([key, v]) => String(filtros[key] ?? "") === String(v));

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-3 md:p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-extrabold text-[#0B1426]">
              <i className="bx bx-brain text-violet-600" />
              Seguimiento IA de cotizaciones
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              Las cotizaciones que llevan más de 3 días sin respuesta del cliente, de todos los asesores, con lo que dice la IA del
              chat: por qué no se cerró y cómo recuperarla. Desde cada una vas directo al chat del cliente.
            </p>
          </div>
          <button
            type="button"
            onClick={() => cargar()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <i className={`bx bx-refresh ${cargando ? "bx-spin" : ""}`} /> Actualizar
          </button>
        </header>

        <div>
          <button
            type="button"
            onClick={() => aplicar({ descartadas: filtros.descartadas === "1" ? "" : "1" })}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition ${
              filtros.descartadas === "1"
                ? "border-rose-300 bg-rose-50 text-rose-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <i className="bx bx-archive" />
            {filtros.descartadas === "1"
              ? "Viendo las descartadas · volver al seguimiento"
              : `Descartadas (${datos?.total_descartadas ?? 0})`}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {kpis.map((k) => (
            <button
              key={k.label}
              type="button"
              onClick={() => aplicar(k.filtro)}
              className={`rounded-xl border p-3 text-left shadow-sm transition ${
                kpiActivo(k) ? "border-violet-400 bg-violet-50" : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{k.label}</p>
              <p className={`mt-1 text-2xl font-black tabular-nums ${k.tono}`}>{k.valor}</p>
              <p className="text-[10px] text-slate-400">{k.ayuda}</p>
            </button>
          ))}
        </div>

        <div className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2">
            <i className="bx bx-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por cliente o código…"
              className={`${INPUT} pl-9`}
            />
          </div>
          <select value={filtros.id_asesor} onChange={(e) => aplicar({ id_asesor: e.target.value })} className={INPUT}>
            <option value="">Todos los asesores</option>
            {asesores.map((a) => (
              <option key={a.id_asesor} value={a.id_asesor}>
                {a.asesor}
              </option>
            ))}
          </select>
          <select value={filtros.tipo} onChange={(e) => aplicar({ tipo: e.target.value })} className={INPUT}>
            <option value="">Grupal, cajas y externas</option>
            <option value="grupal">Carga grupal</option>
            <option value="directa">Cajas / externas</option>
          </select>
          <select value={filtros.estado_ia} onChange={(e) => aplicar({ estado_ia: e.target.value })} className={INPUT}>
            <option value="">Cualquier estado del análisis</option>
            <option value="listo">Analizadas</option>
            <option value="sin">Sin analizar</option>
            <option value="error">Falló el análisis</option>
            <option value="procesando">Analizándose</option>
          </select>
          <select value={filtros.situacion} onChange={(e) => aplicar({ situacion: e.target.value })} className={INPUT}>
            <option value="">Cualquier situación</option>
            {Object.entries(SITUACIONES).map(([k, v]) => (
              <option key={k} value={k}>
                {v[0]}
              </option>
            ))}
          </select>
          <select value={filtros.motivo} onChange={(e) => aplicar({ motivo: e.target.value })} className={INPUT}>
            <option value="">Cualquier motivo</option>
            {Object.entries(MOTIVOS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select value={filtros.dias} onChange={(e) => aplicar({ dias: Number(e.target.value) })} className={INPUT}>
            <option value={30}>Últimos 30 días</option>
            <option value={60}>Últimos 60 días</option>
            <option value={90}>Últimos 90 días</option>
            <option value={180}>Últimos 180 días</option>
          </select>
          <select value={filtros.orden} onChange={(e) => aplicar({ orden: e.target.value })} className={INPUT}>
            <option value="">Más recientes primero</option>
            <option value="antiguas">Más viejas primero</option>
          </select>
        </div>

        {error && <Aviso tono="err">{error}</Aviso>}

        <div className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${cargando && datos ? "opacity-60" : ""}`}>
          {!datos && cargando ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : (datos?.data ?? []).length === 0 ? (
            <p className="p-10 text-center text-sm text-slate-500">No hay cotizaciones con estos filtros.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {datos.data.map((cot) => {
                const clave = `${cot.tipo}:${cot.id}`;
                return (
                  <Fila
                    key={clave}
                    cot={cot}
                    miId={actor.id_sub_usuario}
                    abierta={!!abiertas[clave]}
                    analizando={!!analizando[clave]}
                    onToggle={() => setAbiertas((a) => ({ ...a, [clave]: !a[clave] }))}
                    onAnalizar={() => analizar(cot)}
                    onChat={() => irAlChat(cot)}
                    onDescartar={() => descartar(cot)}
                    onRestaurar={() => restaurar(cot)}
                  />
                );
              })}
            </ul>
          )}
          {datos?.total_paginas > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
              <span>
                Página {datos.pagina} de {datos.total_paginas} · {datos.total} cotizaciones
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  disabled={datos.pagina <= 1}
                  onClick={() => setFiltros((f) => ({ ...f, page: datos.pagina - 1 }))}
                  className="rounded-md border border-slate-200 px-2.5 py-1 font-semibold disabled:opacity-40"
                >
                  <i className="bx bx-chevron-left" /> Anterior
                </button>
                <button
                  type="button"
                  disabled={datos.pagina >= datos.total_paginas}
                  onClick={() => setFiltros((f) => ({ ...f, page: datos.pagina + 1 }))}
                  className="rounded-md border border-slate-200 px-2.5 py-1 font-semibold disabled:opacity-40"
                >
                  Siguiente <i className="bx bx-chevron-right" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const INPUT =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-violet-400 focus:outline-none";

const ESTADOS_IA = {
  sin: ["Sin analizar", "border-slate-200 bg-slate-50 text-slate-600", "bx-time"],
  procesando: ["Analizando…", "border-violet-300 bg-violet-50 text-violet-700", "bx-loader-alt bx-spin"],
  error: ["Falló el análisis", "border-rose-300 bg-rose-50 text-rose-700", "bx-error"],
};

function Fila({ cot, miId, abierta, analizando, onToggle, onAnalizar, onChat, onDescartar, onRestaurar }) {
  const a = cot.analisis;
  const descarte = cot.descarte;
  const r = a?.estado === "listo" ? a.resultado : null;
  const tipo = cot.tipo === "grupal" ? "Grupal" : cot.modo === "cajas" ? "Cajas" : "Externa";
  const recuperable = r?.probabilidad_recuperar === "alta";
  const estadoIa = analizando ? ESTADOS_IA.procesando : ESTADOS_IA[cot.estado_ia];
  const sit = r ? SITUACIONES[r.situacion] || SITUACIONES.sin_informacion : null;
  const chat = cot.chat;
  const chatMio = chat && (chat.id_encargado == null || String(chat.id_encargado) === String(miId));

  return (
    <li className={recuperable ? "border-l-4 border-l-sky-400" : ""}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-900">
            <span className="font-mono font-bold text-sky-700">{cot.codigo || `#${cot.id}`}</span>
            <span className="text-slate-400"> · {tipo} · </span>
            <span className="font-semibold">{cot.cliente || "Cliente"}</span>
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Asesor {cot.asesor || "—"} · creada {String(cot.fecha_creacion || "").slice(0, 10)} · estado {cot.estado}
            {chat && (
              <>
                {" · "}
                <span className={chatMio ? "font-semibold text-emerald-700" : ""}>
                  {chat.id_encargado == null ? "chat sin asignar" : chatMio ? "chat tuyo" : `chat de ${chat.encargado}`}
                </span>
              </>
            )}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {r ? (
              <>
                <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${sit[1]}`}>{sit[0]}</span>
                <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                  {MOTIVOS[r.motivo_principal] || r.motivo_principal}
                </span>
                {recuperable && (
                  <span className="inline-flex rounded-md border border-sky-300 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
                    Recuperable
                  </span>
                )}
              </>
            ) : (
              estadoIa && (
                <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${estadoIa[1]}`}>
                  <i className={`bx ${estadoIa[2]}`} /> {estadoIa[0]}
                </span>
              )
            )}
          </div>
          {descarte && (
            <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs text-rose-800">
              <i className="bx bx-archive mr-1" />
              Descartada{descarte.por ? ` por ${descarte.por}` : ""} el {String(descarte.fecha || "").slice(0, 10)}:{" "}
              <strong>{descarte.motivo}</strong>
            </p>
          )}
          {r && !abierta && <p className="mt-2 line-clamp-2 text-xs text-slate-500">{r.resumen}</p>}
          {!r && cot.estado_ia === "error" && cot.error && <p className="mt-2 text-xs text-rose-600">{cot.error}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {chat ? (
            <button
              type="button"
              onClick={onChat}
              title={chatMio ? "Abrir el chat" : `Lo atiende ${chat.encargado}: te lo asignas y se abre`}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
            >
              <i className="bx bxl-whatsapp" /> {chatMio ? "Ir al chat" : "Asignarme e ir"}
            </button>
          ) : (
            <span className="text-[11px] text-slate-400">Sin chat en la 265</span>
          )}
          {r && (
            <button
              type="button"
              onClick={onToggle}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <i className={`bx ${abierta ? "bx-chevron-up" : "bx-chevron-down"}`} /> {abierta ? "Ocultar" : "Ver análisis"}
            </button>
          )}
          {descarte ? (
            <button
              type="button"
              onClick={onRestaurar}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
            >
              <i className="bx bx-undo" /> Restaurar
            </button>
          ) : (
            <button
              type="button"
              onClick={onDescartar}
              title="Sacarla del seguimiento, con el motivo"
              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
            >
              <i className="bx bx-archive-in" /> Descartar
            </button>
          )}
          {!descarte && !analizando && cot.estado_ia !== "procesando" && (
            <button
              type="button"
              onClick={onAnalizar}
              title={r ? "Vuelve a leer el chat. Si no hay mensajes nuevos, el resultado es el mismo." : "Analizar ahora"}
              className="inline-flex items-center gap-1 rounded-lg border border-violet-300 bg-violet-50 px-2.5 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-100"
            >
              <i className={`bx ${r ? "bx-refresh" : cot.estado_ia === "error" ? "bx-revision" : "bx-brain"}`} />
              {r ? "Volver a analizar" : cot.estado_ia === "error" ? "Reintentar" : "Analizar"}
            </button>
          )}
        </div>
      </div>

      {analizando && (
        <div className="mx-4 mb-3 flex items-center gap-2 rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-800">
          <i className="bx bx-loader-alt bx-spin text-base" />
          Leyendo el chat y escuchando los audios… suele tardar entre 10 segundos y 1 minuto.
        </div>
      )}

      {r && abierta && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
          <Resultado analisis={a} r={r} />
        </div>
      )}
    </li>
  );
}

function escapar(s) {
  return String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}
