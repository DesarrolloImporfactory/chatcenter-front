import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import chatApi from "../../api/chatcenter";
import { RESULTADOS, MOTIVOS_CANCELACION } from "../../components/admin/dashboard/seguimientos/constants";
import { ESTADO_CASO, COHORTE_UI, money, num, fmtFechaCorta, fmtFechaHora, inicialesDe } from "./recuperacionUtils";

const RESULTADO_LABEL = Object.fromEntries(RESULTADOS.map((r) => [r.value, r.label]));
const MOTIVO_LABEL = Object.fromEntries(MOTIVOS_CANCELACION.map((m) => [m.value, m.label]));
const PERIODOS = [7, 30, 60, 90];

function Tarjeta({ label, value, hint, tono = "slate" }) {
  const t = {
    slate: "border-slate-200",
    emerald: "border-emerald-300",
    rose: "border-rose-300",
    cyan: "border-cyan-300",
  }[tono];
  return (
    <div className={`bg-white rounded-xl border p-4 shadow-sm ${t}`}>
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-2xl font-extrabold text-slate-900 mt-1">{value}</div>
      {hint && <div className="text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

/**
 * Cómo va el trabajo de recuperación: casos cerrados en el periodo
 * (recuperados vs perdidos, dinero), rendimiento por asesor, serie semanal,
 * motivos de cancelación y resultados de las conversaciones.
 */
export default function ResultadosRecuperacion({ onAbrirCliente }) {
  const [dias, setDias] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let vivo = true;
    setLoading(true);
    chatApi
      .get("recuperacion/resultados", { params: { dias } })
      .then(({ data: r }) => vivo && setData(r.data))
      .catch((e) => toast.error(e?.response?.data?.message || "No se pudieron cargar los resultados"))
      .finally(() => vivo && setLoading(false));
    return () => {
      vivo = false;
    };
  }, [dias]);

  const t = data?.totales;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-slate-600">Periodo:</span>
        {PERIODOS.map((p) => (
          <button
            key={p}
            onClick={() => setDias(p)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold ring-1 ${
              dias === p ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-100"
            }`}
          >
            Últimos {p} días
          </button>
        ))}
        {loading && <i className="bx bx-loader-alt bx-spin text-cyan-600 ml-2" />}
      </div>

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
            <Tarjeta label="Casos abiertos hoy" value={num(t.abierto)} hint="Clientes en el embudo ahora" />
            <Tarjeta label="Recuperados" value={num(t.recuperado)} hint={`${money(t.monto_recuperado)}/mes que se quedan`} tono="emerald" />
            <Tarjeta label="Llegaron a pagar" value={num(t.pagaron)} hint="Cerraron con Stripe activo" tono="emerald" />
            <Tarjeta label="Empezaron prueba" value={num(t.a_prueba)} hint="Capturaron tarjeta y entraron al trial" tono="cyan" />
            <Tarjeta label="Perdidos" value={num(t.perdido)} hint={`${money(t.monto_perdido)}/mes que se fueron`} tono="rose" />
            <Tarjeta
              label="Tasa de recuperación"
              value={t.tasa_recuperacion == null ? "—" : `${t.tasa_recuperacion}%`}
              hint="Recuperados / (recuperados + perdidos)"
              tono="cyan"
            />
            <Tarjeta label="Descartados" value={num(t.descartado)} hint="Cerrados a mano sin resultado" />
          </div>

          {/* Conversión por situación de entrada: responde "de los que estaban
              en prueba / sin tarjeta, cuántos llegaron a pagar". */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="text-sm font-bold text-slate-800">Qué pasó con cada tipo de cliente</div>
              <p className="text-xs text-slate-500">
                Casos cerrados en el periodo según cómo entraron al embudo. «Llegaron a pagar» = quedaron con Stripe activo;
                «Empezaron prueba» = capturaron tarjeta y entraron al trial.
              </p>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="text-left px-3 py-2">Entró como</th>
                  <th className="text-right px-3 py-2">Abiertos hoy</th>
                  <th className="text-right px-3 py-2">Llegaron a pagar</th>
                  <th className="text-right px-3 py-2">Empezaron prueba</th>
                  <th className="text-right px-3 py-2">Recuperados</th>
                  <th className="text-right px-3 py-2">Perdidos</th>
                  <th className="text-right px-3 py-2">Conversión</th>
                  <th className="text-right px-3 py-2">$ /mes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data.por_cohorte || []).map((c) => {
                  const cerrados = c.recuperados + c.perdidos;
                  const ui = COHORTE_UI[c.cohorte] || COHORTE_UI.manual;
                  return (
                    <tr key={c.cohorte} className="hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ring-1 ${ui.cls}`}>{c.label}</span>
                      </td>
                      <td className="px-3 py-2 text-right">{num(c.abiertos)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-emerald-700">{num(c.pagaron)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-cyan-700">{num(c.a_prueba)}</td>
                      <td className="px-3 py-2 text-right">{num(c.recuperados)}</td>
                      <td className="px-3 py-2 text-right text-rose-600">{num(c.perdidos)}</td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {cerrados ? `${Math.round((c.recuperados / cerrados) * 100)}%` : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">{money(c.monto_recuperado)}</td>
                    </tr>
                  );
                })}
                {!data.por_cohorte?.length && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-slate-500">Todavía no hay casos.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="text-sm font-bold text-slate-800 mb-3">Cierres por semana (últimas 12)</div>
              <div className="h-64">
                {data.serie.length === 0 ? (
                  <p className="text-sm text-slate-500">Todavía no hay casos cerrados. Los primeros se cerrarán solos cuando los clientes del embudo cambien de estado.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.serie.map((s) => ({ ...s, eje: fmtFechaCorta(s.semana) }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="eje" tick={{ fontSize: 11, fill: "#64748B" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#64748B" }} allowDecimals={false} width={32} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="recuperados" name="Recuperados" fill="#10B981" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="perdidos" name="Perdidos" fill="#F43F5E" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
              <div>
                <div className="text-sm font-bold text-slate-800 mb-2">Por qué se van</div>
                {data.motivos.length === 0 ? (
                  <p className="text-xs text-slate-500">Sin motivos registrados en el periodo. Se capturan al registrar un seguimiento de tipo cancelación o retención.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {data.motivos.map((m) => (
                      <li key={m.motivo}>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-700 font-semibold">{MOTIVO_LABEL[m.motivo] || m.motivo}</span>
                          <span className="text-slate-500">{num(m.n)}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded">
                          <div className="h-1.5 bg-rose-400 rounded" style={{ width: `${(m.n / data.motivos[0].n) * 100}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <div className="text-sm font-bold text-slate-800 mb-2">Resultado de las conversaciones</div>
                {data.resultados.length === 0 ? (
                  <p className="text-xs text-slate-500">Sin seguimientos en el periodo.</p>
                ) : (
                  <ul className="text-xs space-y-1">
                    {data.resultados.map((r) => (
                      <li key={r.resultado} className="flex justify-between">
                        <span className="text-slate-700">{RESULTADO_LABEL[r.resultado] || r.resultado}</span>
                        <span className="font-semibold text-slate-900">{num(r.n)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="text-sm font-bold text-slate-800">Trabajo por asesor</div>
              <p className="text-xs text-slate-500">Casos cerrados en el periodo según quién los tenía asignados, y seguimientos que cada quien registró.</p>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="text-left px-3 py-2">Asesor</th>
                  <th className="text-right px-3 py-2">Abiertos</th>
                  <th className="text-right px-3 py-2">Seguimientos</th>
                  <th className="text-right px-3 py-2">Conversó</th>
                  <th className="text-right px-3 py-2">No contestó</th>
                  <th className="text-right px-3 py-2">Promesas</th>
                  <th className="text-right px-3 py-2">Recuperados</th>
                  <th className="text-right px-3 py-2">Perdidos</th>
                  <th className="text-right px-3 py-2">$ recuperado/mes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.asesores.map((a) => (
                  <tr key={a.id_sub_usuario ?? "sin"} className={a.id_sub_usuario == null ? "bg-slate-50/60" : "hover:bg-slate-50"}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="h-7 w-7 rounded-full bg-cyan-100 text-cyan-800 text-[10px] font-bold flex items-center justify-center">
                          {a.id_sub_usuario == null ? "—" : inicialesDe(a.nombre)}
                        </span>
                        <span className="font-semibold text-slate-800">{a.nombre}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">{num(a.abiertos)}</td>
                    <td className="px-3 py-2 text-right">{num(a.seguimientos)}</td>
                    <td className="px-3 py-2 text-right text-emerald-700">{num(a.conversaciones)}</td>
                    <td className="px-3 py-2 text-right text-slate-500">{num(a.no_contesto)}</td>
                    <td className="px-3 py-2 text-right">{num(a.promesas)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-emerald-700">{num(a.recuperados)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-rose-600">{num(a.perdidos)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-900">{money(a.monto_recuperado)}</td>
                  </tr>
                ))}
                {!data.asesores.length && (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-slate-500">Sin actividad en el periodo.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
            <div className="px-4 py-3 border-b border-slate-100 text-sm font-bold text-slate-800">Últimos casos cerrados</div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="text-left px-3 py-2">Cliente</th>
                  <th className="text-left px-3 py-2">Entró por</th>
                  <th className="text-left px-3 py-2">Resultado</th>
                  <th className="text-left px-3 py-2">Asesor</th>
                  <th className="text-right px-3 py-2">Plan</th>
                  <th className="text-left px-3 py-2">Cerrado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recientes.map((c) => {
                  const est = ESTADO_CASO[c.estado] || ESTADO_CASO.descartado;
                  const ui = COHORTE_UI[c.cohorte] || COHORTE_UI.manual;
                  return (
                    <tr key={c.id_caso} className="hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <button onClick={() => onAbrirCliente?.(c.id_usuario)} className="font-semibold text-slate-900 hover:text-cyan-700 text-left">
                          {c.empresa || c.email}
                        </button>
                        <div className="text-xs text-slate-500">{c.email}</div>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ring-1 ${ui.cls}`}>{c.cohorte.replace(/_/g, " ")}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ring-1 ${est.cls}`}>{est.label}</span>
                        {c.cierre_motivo && <div className="text-[11px] text-slate-500 italic">{c.cierre_motivo}</div>}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700">
                        {c.asignado_a_nombre || <span className="text-slate-400">sin asignar</span>}
                        {/* Cuánto se trabajó el caso: con 0 seguimientos un «perdido»
                            no es un cliente que se resistió, es uno que nadie llamó. */}
                        <div className={`text-[11px] ${Number(c.seguimientos_caso) === 0 ? "text-rose-700 font-semibold" : "text-slate-500"}`}>
                          {num(c.seguimientos_caso)} seguimiento(s)
                          {Number(c.automatizaciones_enviadas) > 0 && <> · {num(c.automatizaciones_enviadas)} automático(s)</>}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-xs">{c.monto_plan != null ? `${money(c.monto_plan)}/mes` : "—"}</td>
                      <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">
                        {fmtFechaHora(c.cerrado_en)}
                        <div className="text-slate-400">por {c.cerrado_por || "—"}</div>
                      </td>
                    </tr>
                  );
                })}
                {!data.recientes.length && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-slate-500">Aún no hay casos cerrados en el periodo.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
