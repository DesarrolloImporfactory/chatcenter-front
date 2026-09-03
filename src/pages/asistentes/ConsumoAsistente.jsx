// src/pages/asistentes/ConsumoAsistente.jsx
// Consumo del asistente por día: respuestas con IA, respuestas sin IA (mensaje
// fijo y respuestas rápidas del wizard), tokens y costo estimado en USD.
// El costo es una ESTIMACIÓN con los precios públicos de OpenAI; la factura
// real es la de la cuenta de OpenAI del negocio.
import React, { useEffect, useState } from "react";
import chatApi from "../../api/chatcenter";

const usd = (v, dec = 2) =>
  `$${(Number(v) || 0).toLocaleString("en-US", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  })}`;
const num = (v) => (Number(v) || 0).toLocaleString("es-EC");
const fechaCorta = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("es-EC", { weekday: "short", day: "2-digit", month: "short" });
};

const FILAS_POR_PAGINA = 14;

export default function ConsumoAsistente({ idConfiguracion }) {
  const [dias, setDias] = useState(30);
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  // Paginación del detalle por día: 90 días de golpe era un scroll infinito.
  const [pagina, setPagina] = useState(0);

  useEffect(() => {
    if (!idConfiguracion) return;
    let vivo = true;
    setCargando(true);
    setError(null);
    chatApi
      .post(
        "/consumo_ia/resumen",
        { id_configuracion: idConfiguracion, dias },
        { silentError: true },
      )
      .then(({ data: r }) => {
        if (!vivo) return;
        setData(r?.data || null);
        setPagina(0);
      })
      .catch((e) => vivo && setError(e?.response?.data?.message || "No se pudo cargar el consumo."))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, [idConfiguracion, dias]);

  const t = data?.totales || {};
  const totalRespuestas = (t.msgs_ia || 0) + (t.msgs_sin_ia || 0);
  const pctSinIA = totalRespuestas ? Math.round(((t.msgs_sin_ia || 0) / totalRespuestas) * 100) : 0;

  return (
    <div className="bg-white border rounded-2xl shadow-sm p-6 mt-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 grid place-items-center">
            <i className="bx bx-line-chart text-2xl text-indigo-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Consumo del asistente</h3>
            <p className="text-sm text-gray-500">
              Cuántas respuestas salieron con IA, cuántas sin IA y cuánto costaron{" "}
              <b className="text-gray-700">en los últimos {dias} días</b> (acumulado
              del período, no por día — el detalle diario está en la tabla).
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 self-start">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDias(d)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                dias === d ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {d} días
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="text-sm text-rose-600">{error}</div>
      ) : cargando && !data ? (
        <div className="h-28 rounded-xl bg-slate-100 animate-pulse" />
      ) : data ? (
        <>
          {data.rango_incompleto && data.medicion_desde && (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-[12.5px] text-amber-800 leading-relaxed">
              <i className="bx bx-info-circle mr-1" />
              El registro detallado de consumo está disponible desde el{" "}
              <b>{fechaCorta(data.medicion_desde)}</b>. OpenAI no entrega el
              histórico por conversación hacia atrás, así que el tramo anterior
              a esa fecha no aparece aquí y el consumo real de este período fue
              mayor al mostrado. Desde esa fecha en adelante, la medición es
              completa.
            </div>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 px-4 py-3">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">
                Respuestas con IA
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{num(t.msgs_ia)}</div>
              <div className="text-[11.5px] text-slate-500">{num(t.tokens)} tokens</div>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3">
              <div className="text-[11px] uppercase tracking-wide text-emerald-700 font-semibold">
                Respuestas sin IA
              </div>
              <div className="text-2xl font-bold text-emerald-800 mt-1">{num(t.msgs_sin_ia)}</div>
              <div className="text-[11.5px] text-emerald-700">
                {num(t.msgs_fijo)} mensaje fijo · {num(t.msgs_rapida)} rápidas · {pctSinIA}% del total
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 px-4 py-3">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">
                Costo estimado · {dias} días
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{usd(t.costo_usd)}</div>
              <div className="text-[11.5px] text-slate-500">
                ≈ {usd(t.costo_promedio_ia_usd, 4)} por respuesta con IA
              </div>
              {/* Desglose por tipo de gasto: la caché cuesta ~10x menos que la
                  entrada normal — acá se ve dónde se va la plata de verdad. */}
              <div className="mt-2 flex flex-wrap gap-1.5 text-[10.5px] font-semibold">
                <span className="rounded-md bg-slate-100 text-slate-600 px-2 py-0.5">
                  Entrada {usd(t.costo_entrada_usd)}
                </span>
                <span className="rounded-md bg-sky-50 text-sky-700 px-2 py-0.5">
                  Caché {usd(t.costo_cache_usd)}
                </span>
                <span className="rounded-md bg-amber-50 text-amber-700 px-2 py-0.5">
                  Salida {usd(t.costo_salida_usd)}
                </span>
              </div>
            </div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 px-4 py-3">
              <div className="text-[11px] uppercase tracking-wide text-indigo-700 font-semibold">
                Ahorro estimado
              </div>
              <div className="text-2xl font-bold text-indigo-900 mt-1">
                {usd(t.ahorro_estimado_usd)}
              </div>
              <div className="text-[11.5px] text-indigo-700">
                lo que habrían costado con IA las respuestas sin IA
              </div>
            </div>
          </div>

          {data.dias?.length ? (
            (() => {
              const totalPaginas = Math.max(
                1,
                Math.ceil(data.dias.length / FILAS_POR_PAGINA),
              );
              const pag = Math.min(pagina, totalPaginas - 1);
              const visibles = data.dias.slice(
                pag * FILAS_POR_PAGINA,
                (pag + 1) * FILAS_POR_PAGINA,
              );
              return (
                <>
                  <div className="mt-4 overflow-x-auto overflow-y-auto max-h-[420px] rounded-xl border border-slate-200">
                    <table className="w-full text-[13px]">
                      <thead className="bg-slate-50 text-slate-500 sticky top-0 z-10">
                        <tr>
                          <th className="text-left px-4 py-2 font-semibold">Día</th>
                          <th className="text-right px-4 py-2 font-semibold">Con IA</th>
                          <th className="text-right px-4 py-2 font-semibold">Sin IA</th>
                          <th className="text-right px-4 py-2 font-semibold">Entrada</th>
                          <th className="text-right px-4 py-2 font-semibold">Caché</th>
                          <th className="text-right px-4 py-2 font-semibold">Salida</th>
                          <th className="text-right px-4 py-2 font-semibold">Costo est.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibles.map((d) => (
                          <tr key={d.dia} className="border-t border-slate-100">
                            <td className="px-4 py-2 text-slate-700 capitalize whitespace-nowrap">
                              {fechaCorta(d.dia)}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums">
                              {num(d.msgs_ia)}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums text-emerald-700">
                              {num(d.msgs_sin_ia)}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums text-slate-600">
                              {num(d.tk_entrada)}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums text-sky-700">
                              {num(d.tk_cache)}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums text-amber-700">
                              {num(d.tk_salida)}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums font-medium">
                              {usd(d.costo_usd, 3)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {totalPaginas > 1 && (
                    <div className="mt-2 flex items-center justify-between text-[12px] text-slate-500">
                      <span>
                        Página {pag + 1} de {totalPaginas} · {data.dias.length} días
                      </span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          disabled={pag === 0}
                          onClick={() => setPagina(pag - 1)}
                          className="rounded-lg border border-slate-200 px-3 py-1 font-semibold disabled:opacity-40 hover:bg-slate-50"
                        >
                          ← Anteriores
                        </button>
                        <button
                          type="button"
                          disabled={pag >= totalPaginas - 1}
                          onClick={() => setPagina(pag + 1)}
                          className="rounded-lg border border-slate-200 px-3 py-1 font-semibold disabled:opacity-40 hover:bg-slate-50"
                        >
                          Siguientes →
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()
          ) : (
            <div className="mt-4 text-sm text-slate-500">
              Sin respuestas del asistente en los últimos {dias} días.
            </div>
          )}

          <p className="mt-3 text-[11.5px] text-slate-400 leading-snug">
            {data.nota} Modelo de referencia para las estimaciones:{" "}
            <b className="text-slate-600">{data.modelo_referencia}</b> (precios de OpenAI
            revisados {data.precios_actualizados}). El detalle oficial de uso está en{" "}
            <a
              href="https://platform.openai.com/usage"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline"
            >
              platform.openai.com/usage
            </a>
            .
          </p>
        </>
      ) : null}
    </div>
  );
}
