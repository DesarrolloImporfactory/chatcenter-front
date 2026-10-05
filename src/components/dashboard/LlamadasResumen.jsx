import { useCallback, useEffect, useState } from "react";
import chatApi from "../../api/chatcenter";
import TablaLlamadas, { necesitaRevision } from "../telefonia/TablaLlamadas";
import { RESULTADOS } from "../telefonia/ResumenLlamadaIA";

/**
 * Bloque "Llamadas telefónicas" del dashboard de atención de una conexión.
 *
 * Es la vista del administrador del negocio (no del super admin): cuántas
 * llamadas hizo su equipo en el período, cuántas se contestaron, minutos,
 * gasto y cuántas pide revisar la IA; comparación por asesor; y la tabla
 * paginada con filtros (components/telefonia/TablaLlamadas). Solo aparece si
 * la conexión tiene telefonía por saldo (o ya hizo llamadas).
 *
 * Datos: GET /telefonia/historial?id_configuracion&desde&hasta (sesión del
 * administrador; el back valida que la conexión sea de su cuenta).
 */
const fmtUSD = (c) => `$${(Number(c || 0) / 100).toFixed(2)}`;
const fmtMin = (seg) => {
  const m = Math.round((Number(seg) || 0) / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`;
};

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

export default function LlamadasResumen({ configId, from, to, refrescoMs = 60_000 }) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    if (!configId) return;
    setCargando(true);
    try {
      const { data } = await chatApi.get("/telefonia/historial", {
        params: { id_configuracion: configId, desde: from, hasta: to, limit: 500 },
      });
      setDatos({ llamadas: data?.data || [], resumen: data?.resumen || null });
    } catch {
      setDatos(null);
    } finally {
      setCargando(false);
    }
  }, [configId, from, to]);

  useEffect(() => {
    cargar();
  }, [cargar]);
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") cargar();
    }, refrescoMs);
    return () => clearInterval(id);
  }, [cargar, refrescoMs]);

  const r = datos?.resumen;
  const llamadas = datos?.llamadas || [];
  if (!datos || (!r?.activo && llamadas.length === 0)) return null;

  const revisar = llamadas.filter(necesitaRevision).length;
  const minutosDisponibles = r?.saldo_centavos != null && r?.tarifa_centavos_min ? Math.floor(r.saldo_centavos / r.tarifa_centavos_min) : null;
  const resultados = Object.entries(r?.resultados || {}).sort((a, b) => b[1] - a[1]);
  const porAsesor = (r?.por_asesor || []).map((a) => ({
    ...a,
    revisar: llamadas.filter((l) => String(l.id_sub_usuario) === String(a.id_sub_usuario) && necesitaRevision(l)).length,
    nota: (() => {
      const notas = llamadas.filter((l) => String(l.id_sub_usuario) === String(a.id_sub_usuario) && l.ia_analisis?.calidad_atencion).map((l) => Number(l.ia_analisis.calidad_atencion));
      return notas.length ? (notas.reduce((x, y) => x + y, 0) / notas.length).toFixed(1) : null;
    })(),
  }));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-600 to-sky-700 shadow-sm">
            <i className="bx bx-phone-call text-base text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-slate-700">LLAMADAS TELEFÓNICAS</h3>
            <p className="text-xs text-slate-400">
              Llamadas al celular desde el chat. Cada una queda grabada y la IA la resume y califica la atención; las marcadas con bandera conviene escucharlas.
            </p>
          </div>
        </div>
        {r?.activo ? (
          <div className="text-xs text-slate-500">
            Saldo <b className="text-slate-800">{fmtUSD(r.saldo_centavos)}</b>
            {minutosDisponibles != null ? <> · unos <b className="text-slate-800">{minutosDisponibles} min</b> a {fmtUSD(r.tarifa_centavos_min)}/min</> : null}
          </div>
        ) : (
          <div className="text-xs text-amber-700">Telefonía apagada para esta conexión.</div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Tile icon="bx-phone-outgoing" color="#0369a1" label="Llamadas" value={r?.llamadas ?? 0} sub={cargando ? "actualizando…" : "en el período"} />
        <Tile icon="bx-phone-call" color="#059669" label="Contestadas" value={r?.contestadas ?? 0} sub={r?.llamadas ? `${Math.round((r.contestadas / r.llamadas) * 100)}% de las llamadas` : "—"} />
        <Tile icon="bx-time-five" color="#7c3aed" label="Minutos" value={fmtMin(r?.segundos)} sub={r?.contestadas ? `promedio ${Math.round(r.segundos / r.contestadas)} s` : "—"} />
        <Tile icon="bx-dollar-circle" color="#b45309" label="Gastado" value={fmtUSD(r?.costo_centavos)} sub="descontado del saldo" />
        <Tile icon="bxs-flag-alt" color="#be123c" label="Para revisar" value={revisar} sub={revisar ? "atención baja, cliente molesto o reclamo" : "ninguna con alerta"} alerta={revisar > 0} />
      </div>

      {resultados.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400">Según la IA:</span>
          {resultados.map(([k, n]) => {
            const [txt, cls] = RESULTADOS[k] || RESULTADOS.otro;
            return <span key={k} className={`rounded-full px-2 py-0.5 font-bold ${cls}`}>{n} {txt.toLowerCase()}</span>;
          })}
        </div>
      ) : null}

      {porAsesor.length > 1 ? (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-3 py-2">Asesor</th>
                <th className="px-3 py-2">Llamadas</th>
                <th className="px-3 py-2">Contestadas</th>
                <th className="px-3 py-2">Minutos</th>
                <th className="px-3 py-2">Gasto</th>
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
                  <td className="px-3 py-1.5">{a.nota ? <span className="text-amber-600">★ {a.nota}</span> : <span className="text-slate-300">—</span>}</td>
                  <td className="px-3 py-1.5">{a.revisar ? <span className="font-bold text-rose-700"><i className="bx bxs-flag-alt" /> {a.revisar}</span> : <span className="text-slate-300">0</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="mt-4">
        <TablaLlamadas llamadas={llamadas} porPagina={10} cargando={cargando} />
      </div>
    </div>
  );
}
