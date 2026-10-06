import { useCallback, useEffect, useMemo, useState } from "react";
import chatApi from "../../api/chatcenter";
import TablaLlamadas, { seguimientoDe } from "../telefonia/TablaLlamadas";
import { RESULTADOS } from "../telefonia/ResumenLlamadaIA";

/**
 * Panel de llamadas telefónicas de una conexión.
 *
 * Se usa en dos lugares con los mismos datos y la misma forma:
 *   - Dashboard de atención de la conexión (administrador / administrador
 *     limitado): GET /telefonia/historial.
 *   - Historial de /telefonia (super admin): GET /telefonia/admin/historial,
 *     con la columna "Salió con".
 *
 * Tiene su PROPIO filtro de fechas (Hoy, Ayer, 7 días, 30 días o un rango),
 * independiente del resto del dashboard: lo normal es mirar "hoy" y comparar
 * con "ayer". Todo lo de abajo responde a ese período: las tarjetas, la
 * comparación por asesor y la tabla (components/telefonia/TablaLlamadas).
 *
 * En el dashboard solo aparece si la conexión tiene telefonía por saldo o
 * ya hizo llamadas (ocultarSiInactiva).
 */
const fmtUSD = (c) => `$${(Number(c || 0) / 100).toFixed(2)}`;
const fmtMin = (seg) => {
  const m = Math.round((Number(seg) || 0) / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`;
};
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const hace = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return ymd(d);
};
const PERIODOS = [
  { k: "hoy", txt: "Hoy", rango: () => [hace(0), hace(0)] },
  { k: "ayer", txt: "Ayer", rango: () => [hace(1), hace(1)] },
  { k: "7", txt: "7 días", rango: () => [hace(6), hace(0)] },
  { k: "30", txt: "30 días", rango: () => [hace(29), hace(0)] },
];

function Tile({ icon, color, label, value, sub, alerta }) {
  return (
    <div className={`rounded-xl border p-3 ${alerta ? "border-rose-200 bg-rose-50/60" : "border-slate-200 bg-white"}`}>
      <div className="mb-1 flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-md" style={{ background: `${color}15` }}>
          <i className={`bx ${icon} text-sm`} style={{ color }} />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      </div>
      <div className={`text-xl font-extrabold leading-none ${alerta ? "text-rose-700" : "text-slate-900"}`}>{value}</div>
      {sub ? <div className="mt-1 text-[11px] text-slate-500">{sub}</div> : null}
    </div>
  );
}

export default function LlamadasResumen({
  configId,
  endpoint = "/telefonia/historial",
  mostrarSalioCon = false,
  ocultarSiInactiva = true,
  enMarco = true,
  porPagina = 10,
  refrescoMs = 60_000,
}) {
  const [periodo, setPeriodo] = useState("hoy");
  const [rango, setRango] = useState(() => PERIODOS[0].rango());
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [desde, hasta] = rango;

  const cargar = useCallback(async () => {
    if (!configId) return;
    setCargando(true);
    try {
      const { data } = await chatApi.get(endpoint, { params: { id_configuracion: configId, desde, hasta, limit: 1000 } });
      setDatos({ llamadas: data?.data || [], resumen: data?.resumen || null });
    } catch {
      setDatos((d) => d || { llamadas: [], resumen: null });
    } finally {
      setCargando(false);
    }
  }, [configId, endpoint, desde, hasta]);

  useEffect(() => {
    cargar();
  }, [cargar]);
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") cargar();
    }, refrescoMs);
    return () => clearInterval(id);
  }, [cargar, refrescoMs]);

  const elegir = (p) => {
    setPeriodo(p.k);
    setRango(p.rango());
  };

  const r = datos?.resumen;
  const llamadas = useMemo(() => datos?.llamadas || [], [datos]);
  const seg = useMemo(() => {
    const c = { pendiente: 0, resuelta: 0, escalada: 0 };
    llamadas.forEach((l) => {
      const s = seguimientoDe(l);
      if (s) c[s] += 1;
    });
    return c;
  }, [llamadas]);
  const porAsesor = useMemo(
    () =>
      (r?.por_asesor || []).map((a) => {
        const suyas = llamadas.filter((l) => String(l.id_sub_usuario) === String(a.id_sub_usuario));
        const notas = suyas.filter((l) => l.estado === "answered" && l.ia_analisis?.resultado !== "no_contesto" && l.ia_analisis?.calidad_atencion).map((l) => Number(l.ia_analisis.calidad_atencion));
        const cuenta = (res) => suyas.filter((l) => l.ia_analisis?.resultado === res).length;
        return {
          ...a,
          nota: notas.length ? (notas.reduce((x, y) => x + y, 0) / notas.length).toFixed(1) : null,
          ventas: cuenta("venta_cerrada"),
          pendientes_pago: cuenta("pendiente_pago"),
          revisar: suyas.filter((l) => seguimientoDe(l) === "pendiente").length,
        };
      }),
    [r, llamadas],
  );

  // En el dashboard: sin telefonía contratada y sin llamadas nunca, no existe.
  if (!datos) return null;
  if (ocultarSiInactiva && !r?.activo && llamadas.length === 0 && periodo === "hoy") return null;

  const minutosDisponibles = r?.saldo_centavos != null && r?.tarifa_centavos_min ? Math.floor(r.saldo_centavos / r.tarifa_centavos_min) : null;
  const resultados = Object.entries(r?.resultados || {}).sort((a, b) => b[1] - a[1]);
  const etiquetaPeriodo = periodo === "rango" ? `${desde} a ${hasta}` : PERIODOS.find((p) => p.k === periodo)?.txt.toLowerCase();

  const cuerpo = (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-600 to-sky-700 shadow-sm">
            <i className="bx bx-phone-call text-base text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-slate-700">LLAMADAS TELEFÓNICAS</h3>
            <p className="text-xs text-slate-400">
              {r?.activo ? (
                <>Saldo <b className="text-slate-600">{fmtUSD(r.saldo_centavos)}</b>{minutosDisponibles != null ? <> · unos {minutosDisponibles} min a {fmtUSD(r.tarifa_centavos_min)}/min</> : null}</>
              ) : (
                "Telefonía apagada para esta conexión."
              )}
              {cargando ? " · actualizando…" : ""}
            </p>
          </div>
        </div>
        {/* Filtro de fechas propio de esta sección */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 text-xs font-bold">
            {PERIODOS.map((p) => (
              <button key={p.k} type="button" onClick={() => elegir(p)} className={`h-9 border-l border-slate-300 px-3 first:border-l-0 ${periodo === p.k ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}>
                {p.txt}
              </button>
            ))}
          </div>
          <div className={`flex items-center gap-1 rounded-lg border px-2 text-xs ${periodo === "rango" ? "border-slate-900" : "border-slate-300"}`}>
            <input
              type="date"
              value={desde}
              max={hasta}
              onChange={(e) => {
                if (!e.target.value) return;
                setPeriodo("rango");
                setRango([e.target.value, hasta < e.target.value ? e.target.value : hasta]);
              }}
              className="h-9 bg-transparent text-slate-700 outline-none"
              aria-label="Desde"
            />
            <span className="text-slate-400">a</span>
            <input
              type="date"
              value={hasta}
              min={desde}
              max={hace(0)}
              onChange={(e) => {
                if (!e.target.value) return;
                setPeriodo("rango");
                setRango([desde > e.target.value ? e.target.value : desde, e.target.value]);
              }}
              className="h-9 bg-transparent text-slate-700 outline-none"
              aria-label="Hasta"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Tile icon="bx-phone-outgoing" color="#0369a1" label="Llamadas" value={r?.llamadas ?? 0} sub={etiquetaPeriodo} />
        <Tile icon="bx-phone-call" color="#059669" label="Contestadas" value={r?.contestadas ?? 0} sub={r?.llamadas ? `${Math.round((r.contestadas / r.llamadas) * 100)}% de las llamadas` : "—"} />
        <Tile icon="bx-time-five" color="#7c3aed" label="Minutos" value={fmtMin(r?.segundos)} sub={r?.contestadas ? `promedio ${Math.round(r.segundos / r.contestadas)} s` : "—"} />
        <Tile icon="bx-dollar-circle" color="#b45309" label="Gastado" value={fmtUSD(r?.costo_centavos)} sub="descontado del saldo" />
        <Tile
          icon="bxs-flag-alt"
          color="#be123c"
          label="Para revisar"
          value={seg.pendiente}
          sub={seg.resuelta || seg.escalada ? `${seg.resuelta} resueltas · ${seg.escalada} escaladas` : seg.pendiente ? "atención baja, cliente molesto o reclamo" : "ninguna con alerta"}
          alerta={seg.pendiente > 0}
        />
      </div>

      {resultados.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400">Conversaciones según la IA:</span>
          {resultados.map(([k, n]) => {
            const [txt, cls] = RESULTADOS[k] || RESULTADOS.otro;
            return <span key={k} className={`rounded-full px-2 py-0.5 font-bold ${cls}`}>{n} {txt.toLowerCase()}</span>;
          })}
        </div>
      ) : null}

      {porAsesor.length > 0 ? (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-3 py-2">Asesor</th>
                <th className="px-3 py-2">Llamadas</th>
                <th className="px-3 py-2">Contestadas</th>
                <th className="px-3 py-2">Minutos</th>
                <th className="px-3 py-2">Gasto</th>
                <th className="px-3 py-2">Ventas</th>
                <th className="px-3 py-2">Pend. de pago</th>
                <th className="px-3 py-2">Atención (IA)</th>
                <th className="px-3 py-2">Para revisar</th>
              </tr>
            </thead>
            <tbody>
              {porAsesor.map((a) => (
                <tr key={a.id_sub_usuario} className="border-t border-slate-100">
                  <td className="px-3 py-1.5 font-semibold text-slate-800">{a.asesor}</td>
                  <td className="px-3 py-1.5">{a.llamadas}</td>
                  <td className="px-3 py-1.5">{a.contestadas} <span className="text-slate-400">({a.llamadas ? Math.round((a.contestadas / a.llamadas) * 100) : 0}%)</span></td>
                  <td className="px-3 py-1.5">{fmtMin(a.segundos)}</td>
                  <td className="px-3 py-1.5">{fmtUSD(a.costo_centavos)}</td>
                  <td className="px-3 py-1.5">{a.ventas ? <b className="text-emerald-700">{a.ventas}</b> : <span className="text-slate-300">0</span>}</td>
                  <td className="px-3 py-1.5">{a.pendientes_pago ? <b className="text-lime-700">{a.pendientes_pago}</b> : <span className="text-slate-300">0</span>}</td>
                  <td className="px-3 py-1.5">{a.nota ? <span className="text-amber-600">★ {a.nota}</span> : <span className="text-slate-300">—</span>}</td>
                  <td className="px-3 py-1.5">{a.revisar ? <span className="font-bold text-rose-700"><i className="bx bxs-flag-alt" /> {a.revisar}</span> : <span className="text-slate-300">0</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="mt-4">
        <TablaLlamadas llamadas={llamadas} porPagina={porPagina} mostrarSalioCon={mostrarSalioCon} cargando={cargando} claveReset={`${desde}|${hasta}`} onSeguimiento={cargar} />
      </div>
    </>
  );

  return enMarco ? <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">{cuerpo}</div> : cuerpo;
}
