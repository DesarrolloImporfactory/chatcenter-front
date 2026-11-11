import { useCallback, useEffect, useRef, useState } from "react";
import chatApi from "../../api/chatcenter";
import { fmt$, fmtNum, fmtDiaCorto } from "./utils";

/* ═════════════════════════════════════════════════════════════════
   «Cobros de Dropi para reclamar»: revisa la cartera de Dropi guía por
   guía (los movimientos que trae cada orden) y marca lo que Dropi cobró
   de más: fletes cobrados dos veces, flete en una orden entregada,
   ganancia que no entró, cobros en canceladas. Es todo el historial de
   la cuenta, no el periodo del filtro.
   El servidor sincroniza solo mientras quedan guías por revisar; aquí se
   consulta cada POLL_MS para mover el contador.
   Datos: POST dropi_integrations/dashboard/cartera (+ /cartera/marcar)
   ═════════════════════════════════════════════════════════════════ */

const POLL_MS = 10000;
const FILAS = 8;

const TIPO = {
  cobro_repetido: "Cobro repetido",
  flete_de_mas: "Flete de más en devolución",
  flete_en_entregada: "Flete en orden entregada",
  ganancia_no_pagada: "Ganancia no pagada",
  cobro_en_cancelada: "Cobro en orden cancelada",
};

const ESTADO = {
  pendiente: { t: "Por reclamar", c: "bg-rose-50 text-rose-700 ring-rose-200" },
  reclamado: { t: "Reclamado", c: "bg-amber-50 text-amber-700 ring-amber-200" },
  devuelto: { t: "Devuelto", c: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  descartado: { t: "Descartado", c: "bg-slate-100 text-slate-500 ring-slate-200" },
};

const FILTROS = [
  { k: "pendiente", t: "Por reclamar" },
  { k: "reclamado", t: "Reclamados" },
  { k: "devuelto", t: "Devueltos" },
  { k: "descartado", t: "Descartados" },
  { k: "todos", t: "Todos" },
];

const textoReclamo = (r) => {
  const movs = r.hallazgos.map((h) => h.movimientos).filter(Boolean).join(", ");
  const que = r.hallazgos.map((h) => h.detalle).join(". ");
  return (
    `Hola, equipo Dropi. En la orden ${r.dropi_order_id}` +
    (r.guia ? ` (guía ${r.guia}${r.transportadora ? `, ${r.transportadora}` : ""})` : "") +
    `, estado ${r.status}: ${que}.` +
    (movs ? ` Movimientos de cartera: ${movs}.` : "") +
    ` Solicito la devolución de ${fmt$(r.monto_reclamo)} a mi cartera. Gracias.`
  );
};

function Contador({ guias }) {
  const { finales, revisadas, sincronizando, en_cola, pendientes } = guias;
  const pct = finales > 0 ? Math.min(100, Math.round((revisadas / finales) * 100)) : 100;
  const listo = !sincronizando && revisadas >= finales;
  const pausado = !sincronizando && pendientes > 0;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Guías revisadas</p>
        {listo ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
            <i className="bx bx-check-circle" /> al día
          </span>
        ) : pausado ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600">
            <i className="bx bx-pause-circle" /> en pausa
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
            </span>
            {en_cola ? "en cola" : "sincronizando"}
          </span>
        )}
      </div>
      <p className="dv2-num mt-1 text-[22px] font-extrabold text-slate-900">
        {fmtNum(revisadas)} <span className="text-[13px] font-semibold text-slate-400">de {fmtNum(finales)}</span>
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-700 ${listo ? "bg-emerald-500" : "bg-indigo-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-slate-400">
        {listo
          ? `Guías de los últimos ${guias.dias_historia || 180} días. Las nuevas se revisan solas cuando llegan a entregada, devuelta o cancelada.`
          : pausado
            ? "Dropi no respondió. La revisión sigue sola la próxima vez que abras este panel."
            : "Se revisa una guía a la vez para no saturar Dropi; sigue aunque cierres esta pantalla."}
      </p>
    </div>
  );
}

function Tarjeta({ titulo, valor, sub, tono }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">{titulo}</p>
      <p className={`dv2-num mt-1 text-[22px] font-extrabold ${tono}`}>{valor}</p>
      <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>
    </div>
  );
}

export default function CobrosReclamar({ idConfiguracion, tick }) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState("pendiente");
  const [todos, setTodos] = useState(false);
  const [abierta, setAbierta] = useState(null);
  const [copiada, setCopiada] = useState(null);
  const [guardando, setGuardando] = useState(null);
  const timer = useRef(null);

  const cargar = useCallback(
    (silencioso = false) => {
      if (!silencioso) setCargando(true);
      return chatApi
        .post(
          "dropi_integrations/dashboard/cartera",
          { id_configuracion: idConfiguracion },
          { timeout: 60000, silentError: true },
        )
        .then((r) => {
          setDatos(r?.data?.data || null);
          setError("");
        })
        .catch((e) => !silencioso && setError(e?.response?.data?.message || "No se pudo revisar la cartera"))
        .finally(() => !silencioso && setCargando(false));
    },
    [idConfiguracion],
  );

  useEffect(() => {
    if (!idConfiguracion) return undefined;
    cargar();
    return undefined;
  }, [idConfiguracion, tick, cargar]);

  // Mientras el servidor sincroniza, refresca el contador sin parpadeo.
  const sincronizando = Boolean(datos?.guias?.sincronizando);
  useEffect(() => {
    clearInterval(timer.current);
    if (sincronizando) timer.current = setInterval(() => cargar(true), POLL_MS);
    return () => clearInterval(timer.current);
  }, [sincronizando, cargar]);

  const marcar = async (r, estado) => {
    setGuardando(r.dropi_order_id);
    try {
      await chatApi.post(
        "dropi_integrations/dashboard/cartera/marcar",
        { id_configuracion: idConfiguracion, dropi_order_id: r.dropi_order_id, estado },
        { silentError: true },
      );
      await cargar(true);
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudo guardar el cambio");
    } finally {
      setGuardando(null);
    }
  };

  const copiar = async (r) => {
    try {
      await navigator.clipboard.writeText(textoReclamo(r));
      setCopiada(r.dropi_order_id);
      setTimeout(() => setCopiada(null), 2000);
    } catch {
      setAbierta(r.dropi_order_id);
    }
  };

  if (cargando) {
    return (
      <div className="relative h-[200px] overflow-hidden rounded-xl bg-slate-100">
        <div className="absolute inset-0 animate-[dv2Sweep_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/80 to-transparent" />
      </div>
    );
  }
  if (error && !datos) {
    return <p className="rounded-2xl bg-rose-50 px-4 py-3 text-[12.5px] text-rose-700">{error}</p>;
  }
  if (!datos) return null;

  const { guias, totales, reclamos } = datos;
  if (guias.proveedor || guias.sin_integracion) {
    return (
      <div className="grid h-[120px] place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4">
        <div className="text-center">
          <i className="bx bx-info-circle text-3xl text-slate-300" />
          <p className="mt-1 text-[12px] font-medium text-slate-500">
            {guias.proveedor
              ? "Esta es una cuenta de proveedor en Dropi. La revisión de cobros es para cuentas de dropshipper."
              : "Conecta tu cuenta de Dropi para revisar tu cartera."}
          </p>
        </div>
      </div>
    );
  }
  const visibles = filtro === "todos" ? reclamos : reclamos.filter((r) => r.reclamo_estado === filtro);
  const filas = todos ? visibles : visibles.slice(0, FILAS);

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Contador guias={guias} />
        <Tarjeta
          titulo="Por reclamar"
          valor={fmt$(totales.pendiente.monto)}
          sub={`${fmtNum(totales.pendiente.ordenes)} guías con cobros de más`}
          tono={totales.pendiente.monto > 0 ? "text-rose-600" : "text-slate-900"}
        />
        <Tarjeta
          titulo="Recuperado"
          valor={fmt$(totales.devuelto.monto)}
          sub={`${fmt$(totales.reclamado.monto)} reclamados, esperando a Dropi`}
          tono={totales.devuelto.monto > 0 ? "text-emerald-600" : "text-slate-900"}
        />
      </div>

      {error && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {FILTROS.map((f) => (
          <button
            key={f.k}
            type="button"
            onClick={() => {
              setFiltro(f.k);
              setTodos(false);
            }}
            className={`rounded-full px-3 py-1 text-[11.5px] font-semibold transition ${
              filtro === f.k ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {f.t}
            {f.k !== "todos" && totales[f.k]?.ordenes ? ` · ${totales[f.k].ordenes}` : ""}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-slate-400">No depende del filtro de fechas</span>
      </div>

      {!filas.length ? (
        <div className="mt-3 grid h-[120px] place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60">
          <div className="text-center">
            <i className="bx bx-shield-quarter text-3xl text-slate-300" />
            <p className="mt-1 text-[12px] font-medium text-slate-500">
              {filtro === "pendiente"
                ? guias.revisadas < guias.finales
                  ? "Nada por reclamar en lo revisado hasta ahora"
                  : "Dropi no te cobró de más en ninguna guía"
                : "Nada en esta lista"}
            </p>
          </div>
        </div>
      ) : (
        <div className="dv2-scroll mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                <th className="pb-2 pr-2">Orden</th>
                <th className="pb-2 pr-2">Qué pasó</th>
                <th className="pb-2 pr-2 text-right">A reclamar</th>
                <th className="pb-2 pr-2">Estado</th>
                <th className="pb-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((r) => (
                <ReclamoFila
                  key={r.dropi_order_id}
                  r={r}
                  abierta={abierta === r.dropi_order_id}
                  onAbrir={() => setAbierta(abierta === r.dropi_order_id ? null : r.dropi_order_id)}
                  copiada={copiada === r.dropi_order_id}
                  onCopiar={() => copiar(r)}
                  guardando={guardando === r.dropi_order_id}
                  onMarcar={(e) => marcar(r, e)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {visibles.length > FILAS && (
        <button
          type="button"
          onClick={() => setTodos(!todos)}
          className="mt-2 text-[12px] font-semibold text-indigo-600 hover:text-indigo-800"
        >
          {todos ? "Ver menos" : `Ver las ${visibles.length}`}
        </button>
      )}
    </div>
  );
}

function ReclamoFila({ r, abierta, onAbrir, copiada, onCopiar, guardando, onMarcar }) {
  const est = ESTADO[r.reclamo_estado] || ESTADO.pendiente;
  return (
    <>
      <tr className="border-t border-slate-100 align-top">
        <td className="py-2 pr-2">
          <button type="button" onClick={onAbrir} className="text-left">
            <p className="dv2-num text-[12px] font-bold text-slate-800 hover:text-indigo-600">
              {r.dropi_order_id} <i className={`bx bx-chevron-${abierta ? "up" : "down"} text-slate-400`} />
            </p>
            <p className="text-[10.5px] text-slate-400">
              {r.status} · guía {r.guia || "—"}
            </p>
          </button>
        </td>
        <td className="max-w-[280px] py-2 pr-2">
          {r.hallazgos.map((h) => (
            <div key={h.tipo} className="mb-0.5">
              <p className="text-[12px] font-semibold text-slate-800">{TIPO[h.tipo] || h.tipo}</p>
              <p className="text-[10.5px] leading-snug text-slate-500">{h.detalle}</p>
            </div>
          ))}
        </td>
        <td className="dv2-num py-2 pr-2 text-right text-[13px] font-extrabold text-rose-600">{fmt$(r.monto_reclamo)}</td>
        <td className="py-2 pr-2">
          <span className={`inline-block rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1 ${est.c}`}>{est.t}</span>
        </td>
        <td className="py-2 text-right">
          <div className="flex flex-wrap justify-end gap-1">
            <button
              type="button"
              onClick={onCopiar}
              className="rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-700"
            >
              <i className={`bx ${copiada ? "bx-check" : "bx-copy"} mr-0.5`} />
              {copiada ? "Copiado" : "Copiar reclamo"}
            </button>
            <select
              value={r.reclamo_estado}
              disabled={guardando}
              onChange={(e) => onMarcar(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-[11px] text-slate-700 disabled:opacity-50"
              aria-label="Cambiar estado del reclamo"
            >
              {Object.entries(ESTADO).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.t}
                </option>
              ))}
            </select>
          </div>
        </td>
      </tr>
      {abierta && (
        <tr className="bg-slate-50/70">
          <td colSpan={5} className="px-3 py-2">
            <p className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Movimientos de cartera de esta orden</p>
            {r.movimientos.map((m) => (
              <p key={m.id} className="dv2-num text-[11.5px] text-slate-600">
                <span className="text-slate-400">{fmtDiaCorto(String(m.fecha || "").slice(0, 10))} · #{m.id}</span>{" "}
                <span className={m.tipo === "SALIDA" ? "font-semibold text-rose-600" : "font-semibold text-emerald-600"}>
                  {m.tipo === "SALIDA" ? "−" : "+"}
                  {fmt$(m.monto)}
                </span>{" "}
                {m.descripcion}
              </p>
            ))}
            <p className="mt-2 rounded-lg bg-white p-2 text-[11.5px] text-slate-600 ring-1 ring-slate-200">{textoReclamo(r)}</p>
          </td>
        </tr>
      )}
    </>
  );
}
