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

/* Tokens en corto (12 k, 1,4 M): el número exacto va en el title. */
const tokCorto = (v) => {
  const n = Number(v) || 0;
  if (n >= 1e6) return `${(n / 1e6).toLocaleString("es-EC", { maximumFractionDigits: 1 })} M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)} k`;
  return String(n);
};

const FILAS_POR_PAGINA = 14;

/* Dónde ver el uso oficial de cada proveedor. */
const USO_OFICIAL = {
  openai: { texto: "platform.openai.com/usage", url: "https://platform.openai.com/usage" },
  claude: {
    texto: "console.anthropic.com/settings/usage",
    url: "https://console.anthropic.com/settings/usage",
  },
};

/* `proveedores` = { openai: bool, claude: bool }: qué llaves tiene guardadas la
   cuenta. Con las dos aparece el filtro OpenAI / Claude; también aparece si en
   el período hubo respuestas de los dos (p. ej. cambió de proveedor y luego
   borró una llave). Sin el filtro, para ver cuánto le costó Claude tendría
   que dejar el bot respondiendo con Claude. */
export default function ConsumoAsistente({ idConfiguracion, proveedores = {} }) {
  const [dias, setDias] = useState(30);
  // "" = todos | "openai" | "claude"
  const [proveedor, setProveedor] = useState("");
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  // Paginación del detalle por día: 90 días de golpe era un scroll infinito.
  const [pagina, setPagina] = useState(0);
  // «Volver a cargar» tras un fallo (p. ej. el backend reiniciándose).
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!idConfiguracion) return;
    let vivo = true;
    setCargando(true);
    setError(null);
    chatApi
      .post(
        "/consumo_ia/resumen",
        { id_configuracion: idConfiguracion, dias, proveedor: proveedor || undefined },
        { silentError: true },
      )
      .then(({ data: r }) => {
        if (!vivo) return;
        setData(r?.data || null);
        setPagina(0);
      })
      .catch((e) => {
        if (!vivo) return;
        console.error("[ConsumoAsistente] no se pudo cargar el consumo:", e);
        setError(e?.response?.data?.message || "No se pudo cargar el consumo.");
      })
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, [idConfiguracion, dias, proveedor, intento]);

  // dias = 0 es «solo hoy» (desde las 00:00).
  const textoPeriodo = dias === 0 ? "hoy" : `en los últimos ${dias} días`;
  const etiquetaPeriodo = dias === 0 ? "hoy" : `${dias} días`;

  const t = data?.totales || {};
  const totalRespuestas = (t.msgs_ia || 0) + (t.msgs_sin_ia || 0);
  const pctSinIA = totalRespuestas ? Math.round(((t.msgs_sin_ia || 0) / totalRespuestas) * 100) : 0;

  const pp = data?.por_proveedor || {};
  const mostrarFiltro =
    Boolean(proveedores.openai && proveedores.claude) ||
    Boolean((pp.openai || 0) > 0 && (pp.claude || 0) > 0) ||
    Boolean(proveedor);
  const etiquetaProveedor =
    proveedor === "claude" ? "Claude" : proveedor === "openai" ? "OpenAI" : "";
  // Nota al pie: con el filtro se enlaza el panel de ese proveedor; sin filtro,
  // el de OpenAI y, si hubo respuestas con Claude, también el de Anthropic.
  const enlacesUso =
    proveedor === "claude"
      ? [USO_OFICIAL.claude]
      : proveedor === "openai" || !(pp.claude > 0)
        ? [USO_OFICIAL.openai]
        : [USO_OFICIAL.openai, USO_OFICIAL.claude];

  return (
    <div id="consumo-asistente" className="bg-white border rounded-2xl shadow-sm p-6 mt-4 scroll-mt-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 grid place-items-center">
            <i className="bx bx-line-chart text-2xl text-indigo-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Detalle día por día</h3>
            <p className="text-sm text-gray-500">
              Cuántas respuestas salieron con IA
              {etiquetaProveedor ? (
                <>
                  {" "}
                  <b className="text-gray-700">de {etiquetaProveedor}</b>
                </>
              ) : null}
              , cuántas sin IA y cuánto costaron{" "}
              <b className="text-gray-700">{textoPeriodo}</b>
              {dias === 0
                ? "."
                : " (acumulado del período, no por día — el detalle diario está en la tabla)."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap self-start">
          {mostrarFiltro && (
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
              {[
                { v: "", txt: "Todos" },
                { v: "openai", txt: "OpenAI" },
                { v: "claude", txt: "Claude" },
              ].map((o) => (
                <button
                  key={o.v || "todos"}
                  type="button"
                  onClick={() => setProveedor(o.v)}
                  title={
                    o.v && typeof pp[o.v] === "number"
                      ? `${num(pp[o.v])} respuestas con ${o.txt} en el período`
                      : undefined
                  }
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    proveedor === o.v
                      ? "bg-white shadow text-slate-900"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {o.txt}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            {[0, 7, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDias(d)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  dias === d ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {d === 0 ? "Hoy" : `${d} días`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error ? (
        /* Sin datos no es un error para el cliente: se muestra como vacío y
           se deja volver a cargar. El detalle técnico queda en consola. */
        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center">
          <i className="bx bx-bar-chart-alt-2 text-3xl text-slate-300" />
          <div className="mt-1 text-sm font-semibold text-slate-600">
            Todavía no hay información de consumo disponible
          </div>
          <div className="mt-0.5 text-[12px] text-slate-400">
            Cuando el asistente responda, el detalle de respuestas y costo
            aparece aquí.
          </div>
          <button
            type="button"
            onClick={() => setIntento((i) => i + 1)}
            className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-indigo-600 hover:underline"
          >
            <i className="bx bx-refresh" /> Volver a cargar
          </button>
        </div>
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
                Costo estimado · {etiquetaPeriodo}
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{usd(t.costo_usd)}</div>
              <div className="text-[11.5px] text-slate-500">
                ≈ {usd(t.costo_promedio_ia_usd, 4)} por respuesta con IA
              </div>
              {/* El remarketing con IA es una llamada al modelo por cada
                  recordatorio: va dentro del total y se muestra aparte porque
                  suele ser la parte más grande del gasto. */}
              {t.msgs_remarketing > 0 && (
                <div className="mt-1 text-[11.5px] text-rose-700">
                  Incluye {usd(t.costo_remarketing_usd)} de {num(t.msgs_remarketing)}{" "}
                  recordatorios de remarketing con IA
                  {t.msgs_remarketing_estimados > 0 ? " (estimado)" : ""}
                </div>
              )}
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
              // La barra de costo se mide contra el día más caro del período.
              const maxCosto = Math.max(
                ...data.dias.map((d) => Number(d.costo_usd) || 0),
                0.0001,
              );
              const ahora = new Date();
              const hoyISO = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;
              return (
                <>
                  <div className="mt-4 overflow-x-auto overflow-y-auto max-h-[520px] rounded-2xl border border-slate-200">
                    <table className="w-full text-[13px]">
                      <thead className="bg-slate-50 text-slate-500 sticky top-0 z-10 text-[11px] uppercase tracking-wide">
                        <tr>
                          <th className="text-left px-4 py-2.5 font-bold">Día</th>
                          <th className="text-left px-4 py-2.5 font-bold min-w-[220px]">
                            Respuestas a clientes
                          </th>
                          <th className="text-left px-4 py-2.5 font-bold">
                            Recordatorios con IA
                          </th>
                          <th className="text-left px-4 py-2.5 font-bold">
                            Lo que leyó y escribió la IA
                          </th>
                          <th className="text-left px-4 py-2.5 font-bold min-w-[220px]">
                            Costo del día
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibles.map((d) => {
                          const esHoy = d.dia === hoyISO;
                          const respuestas = (d.msgs_ia || 0) + (d.msgs_sin_ia || 0);
                          const pSin = respuestas
                            ? ((d.msgs_sin_ia || 0) / respuestas) * 100
                            : 0;
                          const costo = Number(d.costo_usd) || 0;
                          const rmk = Math.min(costo, Number(d.costo_remarketing_usd) || 0);
                          const ancho = costo > 0 ? Math.max(3, (costo / maxCosto) * 100) : 0;
                          return (
                            <tr
                              key={d.dia}
                              className={`border-t border-slate-100 transition-colors hover:bg-slate-50/70 ${
                                esHoy ? "bg-indigo-50/40" : ""
                              }`}
                            >
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-800 capitalize">
                                    {fechaCorta(d.dia)}
                                  </span>
                                  {esHoy && (
                                    <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                      Hoy
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Con IA vs sin IA, en una sola barra */}
                              <td className="px-4 py-3">
                                {respuestas > 0 ? (
                                  <>
                                    <div className="flex h-2 w-full max-w-[240px] overflow-hidden rounded-full bg-slate-100">
                                      <div
                                        className="bg-indigo-500"
                                        style={{ width: `${100 - pSin}%` }}
                                      />
                                      <div
                                        className="bg-emerald-400"
                                        style={{ width: `${pSin}%` }}
                                      />
                                    </div>
                                    <div className="mt-1 text-[12px] text-slate-500 tabular-nums whitespace-nowrap">
                                      <b className="text-slate-800">{num(d.msgs_ia)}</b> con IA
                                      <span className="text-slate-300"> · </span>
                                      <b className="text-emerald-700">{num(d.msgs_sin_ia)}</b>{" "}
                                      sin IA
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>

                              <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                                {d.msgs_remarketing ? (
                                  <>
                                    <div className="font-semibold text-slate-800">
                                      {num(d.msgs_remarketing)}
                                    </div>
                                    <div className="text-[12px] text-rose-600">
                                      {usd(d.costo_remarketing_usd)}
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>

                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1 text-[11px] font-semibold tabular-nums">
                                  <span
                                    className="rounded-md bg-slate-100 text-slate-600 px-1.5 py-0.5"
                                    title={`${num(d.tk_entrada)} tokens de entrada`}
                                  >
                                    Entrada {tokCorto(d.tk_entrada)}
                                  </span>
                                  <span
                                    className="rounded-md bg-sky-50 text-sky-700 px-1.5 py-0.5"
                                    title={`${num(d.tk_cache)} tokens leídos de caché (hasta 10 veces más baratos)`}
                                  >
                                    Caché {tokCorto(d.tk_cache)}
                                  </span>
                                  <span
                                    className="rounded-md bg-amber-50 text-amber-700 px-1.5 py-0.5"
                                    title={`${num(d.tk_salida)} tokens de salida`}
                                  >
                                    Salida {tokCorto(d.tk_salida)}
                                  </span>
                                </div>
                              </td>

                              {/* Costo: barra proporcional al día más caro */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="h-2.5 flex-1 min-w-[90px] rounded-full bg-slate-100 overflow-hidden">
                                    <div
                                      className="h-full flex rounded-full overflow-hidden"
                                      style={{ width: `${ancho}%` }}
                                      title={`Respuestas ${usd(costo - rmk)} · recordatorios ${usd(rmk)}`}
                                    >
                                      <div className="bg-indigo-500 flex-1" />
                                      <div
                                        className="bg-rose-400"
                                        style={{
                                          width: `${costo > 0 ? (rmk / costo) * 100 : 0}%`,
                                        }}
                                      />
                                    </div>
                                  </div>
                                  <span className="w-[64px] text-right text-[14px] font-bold text-slate-900 tabular-nums">
                                    {usd(costo, costo < 1 ? 3 : 2)}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="sticky bottom-0 bg-[#171931] text-white">
                        <tr>
                          <td className="px-4 py-2.5 font-bold whitespace-nowrap">
                            Total {etiquetaPeriodo}
                          </td>
                          <td className="px-4 py-2.5 tabular-nums whitespace-nowrap text-[12.5px]">
                            <b>{num(t.msgs_ia)}</b> con IA
                            <span className="text-white/40"> · </span>
                            <b className="text-emerald-300">{num(t.msgs_sin_ia)}</b> sin IA
                          </td>
                          <td className="px-4 py-2.5 tabular-nums whitespace-nowrap text-[12.5px]">
                            <b>{num(t.msgs_remarketing)}</b>
                            <span className="text-white/40"> · </span>
                            <span className="text-rose-300">
                              {usd(t.costo_remarketing_usd)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 tabular-nums whitespace-nowrap text-[12.5px] text-white/70">
                            {tokCorto(t.tokens)} tokens
                          </td>
                          <td className="px-4 py-2.5 text-right text-[15px] font-extrabold tabular-nums">
                            {usd(t.costo_usd)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
                      Respuestas con IA
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
                      Respuestas sin IA (gratis)
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-rose-400" />
                      Recordatorios de remarketing con IA
                    </span>
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
              Sin respuestas del asistente {textoPeriodo}.
            </div>
          )}

          <p className="mt-3 text-[11.5px] text-slate-400 leading-snug">
            {data.nota} {data.nota_remarketing ? `${data.nota_remarketing} ` : ""}Modelo de referencia para las estimaciones:{" "}
            <b className="text-slate-600">{data.modelo_referencia}</b> (precios
            revisados {data.precios_actualizados}). El detalle oficial de uso está en{" "}
            {enlacesUso.map((u, i) => (
              <React.Fragment key={u.url}>
                {i > 0 ? " y " : ""}
                <a
                  href={u.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline"
                >
                  {u.texto}
                </a>
              </React.Fragment>
            ))}
            .
          </p>
        </>
      ) : null}
    </div>
  );
}
