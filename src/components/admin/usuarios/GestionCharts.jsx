import { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  LabelList,
} from "recharts";
import chatApi from "../../../api/chatcenter";
import { fmtNumber } from "./helpers";

/* ═══════════════════════════════════════════════════════════
   Paleta categórica — validada para daltonismo sobre fondo claro
   (peor par adyacente ΔE 9.2 deutan / 27.6 visión normal).
   El orden es fijo: cada serie conserva su color aunque se filtre,
   para que el ojo no tenga que reaprender el gráfico.
   ═══════════════════════════════════════════════════════════ */
const SERIE = {
  contactados: "#2a78d6", // azul
  no_contesto: "#eb6834", // naranja
  recuperados: "#1baf7a", // aqua
};
const NEUTRO = "#64748b";
const GRID = "#e2e8f0";

const MES_CORTO = (ym) => {
  if (!ym) return "";
  const [y, m] = String(ym).split("-");
  const nombres = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];
  return `${nombres[Number(m) - 1] || m} ${String(y).slice(2)}`;
};

const ETIQUETA_RESULTADO = {
  sin_resultado: "Sin resultado",
  contactado_exitoso: "Contactado",
  no_contesto: "No contestó",
  numero_invalido: "Número inválido",
  interesado: "Interesado",
  no_interesado: "No interesado",
  retenido: "Retenido",
  convertido: "Convertido",
  cancelado: "Canceló",
  programar_seguimiento: "Reagendado",
  otro: "Otro",
};

const ETIQUETA_TIPO = {
  llamada: "Llamada",
  whatsapp: "WhatsApp",
  email: "Email",
  reunion: "Reunión",
  nota_interna: "Nota interna",
  cancelacion: "Cancelación",
  retencion: "Retención",
  onboarding: "Onboarding",
  otro: "Otro",
};

/* ── Piezas base ─────────────────────────────────────────── */

function Card({ title, subtitle, children, className = "" }) {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 p-4 shadow-sm ${className}`}
    >
      <div className="mb-3">
        <h4 className="text-sm font-bold text-slate-900">{title}</h4>
        {subtitle && (
          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

/** Número protagonista. Cuando el dato es UNO, un gráfico estorba. */
function Tile({ valor, label, hint, tono = "slate" }) {
  const tonos = {
    slate: "text-slate-900",
    rose: "text-rose-600",
    amber: "text-amber-600",
    emerald: "text-emerald-600",
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className={`text-3xl font-black leading-none ${tonos[tono]}`}>
        {valor}
      </div>
      <div className="text-xs font-semibold text-slate-700 mt-1.5">{label}</div>
      {hint && (
        <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
          {hint}
        </div>
      )}
    </div>
  );
}

function TooltipBox({ active, payload, label, sufijo = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-lg shadow-lg ring-1 ring-slate-200 p-2.5 text-xs">
      {label && (
        <div className="font-bold text-slate-900 mb-1">
          {typeof label === "string" && label.includes("-")
            ? MES_CORTO(label)
            : label}
        </div>
      )}
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-slate-600">
          <span
            className="w-2 h-2 rounded-sm flex-shrink-0"
            style={{ background: p.color || p.fill }}
          />
          <span className="flex-1">{p.name}</span>
          <b className="text-slate-900">
            {fmtNumber(p.value)}
            {sufijo}
          </b>
        </div>
      ))}
    </div>
  );
}

/** Barras horizontales: la forma correcta cuando las etiquetas son texto. */
function BarrasHorizontales({ data, dataKey, nameKey, color = NEUTRO, alto }) {
  if (!data?.length) {
    return (
      <div className="h-32 flex items-center justify-center text-xs text-slate-400">
        Sin datos en el periodo
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={alto || data.length * 34 + 20}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 44, left: 0, bottom: 0 }}
        barCategoryGap={6}
      >
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey={nameKey}
          width={120}
          tick={{ fontSize: 11, fill: "#475569" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={<TooltipBox />}
          cursor={{ fill: "rgba(148,163,184,.12)" }}
        />
        <Bar dataKey={dataKey} fill={color} radius={[0, 4, 4, 0]} barSize={16}>
          {/* Etiqueta directa: el contraste del aqua sobre blanco queda
              bajo 3:1, así que el número visible es obligatorio, no adorno. */}
          <LabelList
            dataKey={dataKey}
            position="right"
            style={{ fontSize: 11, fill: "#334155", fontWeight: 700 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ── Componente principal ────────────────────────────────── */

export default function GestionCharts() {
  const [meses, setMeses] = useState(6);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  // Abierto por defecto: el panel es el resumen de gestión, lo primero que
  // debe ver quien entra. Se puede plegar, pero esconderlo de entrada
  // equivale a que no exista. Las 7 consultas son agregaciones sobre una
  // tabla chica, así que no compensaba ahorrárselas.
  const [abierto, setAbierto] = useState(true);

  useEffect(() => {
    if (!abierto) return;
    let vivo = true;
    setLoading(true);
    chatApi
      .get(`admin_usuarios/metricas_gestion?meses=${meses}`)
      .then((r) => {
        if (vivo) setData(r.data?.data || null);
      })
      .catch(() => vivo && setData(null))
      .finally(() => vivo && setLoading(false));
    return () => {
      vivo = false;
    };
  }, [meses, abierto]);

  const evolucion = useMemo(
    () =>
      (data?.evolucion || []).map((d) => ({
        ...d,
        total: Number(d.total) || 0,
        contactados: Number(d.contactados) || 0,
        no_contesto: Number(d.no_contesto) || 0,
        recuperados: Number(d.recuperados) || 0,
        clientes_tocados: Number(d.clientes_tocados) || 0,
      })),
    [data],
  );

  const embudo = useMemo(
    () =>
      (data?.embudo || []).map((d) => ({
        nombre: ETIQUETA_RESULTADO[d.resultado] || d.resultado,
        total: Number(d.total) || 0,
      })),
    [data],
  );

  const canales = useMemo(
    () =>
      (data?.canales || []).map((d) => ({
        nombre: ETIQUETA_TIPO[d.tipo] || d.tipo,
        total: Number(d.total) || 0,
      })),
    [data],
  );

  const motivos = useMemo(
    () =>
      (data?.motivos || []).map((d) => ({
        nombre: d.motivo,
        total: Number(d.total) || 0,
      })),
    [data],
  );

  const enRiesgo = Number(data?.cobertura?.en_riesgo) || 0;
  const contactados30 = Number(data?.cobertura?.contactados_30d) || 0;
  const pctCobertura = enRiesgo
    ? Math.round((contactados30 / enRiesgo) * 100)
    : null;

  const agenda = data?.agenda || {};
  const vencidos = Number(agenda.vencidos) || 0;

  return (
    <div className="mb-5">
      {/* Cabecera plegable: el asesor entra a trabajar la tabla, no a mirar
          gráficos. Se abre bajo demanda y así no cuesta una consulta por carga. */}
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 transition"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <i className="bx bx-line-chart text-lg text-indigo-600" />
          Gestión y retención
          {vencidos > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700">
              {vencidos} vencidos
            </span>
          )}
        </span>
        <i
          className={`bx text-slate-400 text-lg ${abierto ? "bx-chevron-up" : "bx-chevron-down"}`}
        />
      </button>

      {!abierto ? null : loading ? (
        <div className="mt-3 h-56 rounded-xl bg-slate-100 animate-pulse" />
      ) : !data ? (
        <div className="mt-3 p-4 text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
          No se pudieron cargar las métricas.
        </div>
      ) : (
        <div className="mt-3 space-y-4">
          {/* Selector de periodo — un solo control, arriba de todo */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Periodo:</span>
            {[3, 6, 12].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMeses(m)}
                className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition ${
                  meses === m
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {m} meses
              </button>
            ))}
          </div>

          {/* ── Lo accionable primero: números, no gráficos ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Tile
              valor={
                pctCobertura === null ? "—" : `${contactados30}/${enRiesgo}`
              }
              label="Cancelaciones atendidas"
              hint={
                pctCobertura === null
                  ? "Nadie con cancelación programada"
                  : `${pctCobertura}% de los que se están yendo fue contactado en 30 días`
              }
              tono={
                pctCobertura === null
                  ? "slate"
                  : pctCobertura >= 70
                    ? "emerald"
                    : "rose"
              }
            />
            <Tile
              valor={fmtNumber(vencidos)}
              label="Compromisos vencidos"
              hint="Seguimientos con fecha de próximo contacto ya pasada"
              tono={vencidos > 0 ? "rose" : "emerald"}
            />
            <Tile
              valor={fmtNumber(agenda.hoy || 0)}
              label="Para contactar hoy"
              tono="amber"
            />
            <Tile
              valor={fmtNumber(agenda.proximos_7d || 0)}
              label="Próximos 7 días"
            />
          </div>

          {/* ── Evolución: la única serie temporal ── */}
          <Card
            title="Evolución del contacto"
            subtitle="Cuántos seguimientos se registran cada mes y en qué terminan"
          >
            {evolucion.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-xs text-slate-400">
                Sin seguimientos registrados en el periodo
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart
                  data={evolucion}
                  margin={{ top: 8, right: 16, left: -18, bottom: 0 }}
                >
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis
                    dataKey="mes"
                    tickFormatter={MES_CORTO}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<TooltipBox />} />
                  <Legend
                    iconType="plainline"
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  />
                  <Line
                    name="Contactados"
                    dataKey="contactados"
                    stroke={SERIE.contactados}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    name="No contestó"
                    dataKey="no_contesto"
                    stroke={SERIE.no_contesto}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    name="Recuperados"
                    dataKey="recuperados"
                    stroke={SERIE.recuperados}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card
              title="En qué terminan los contactos"
              subtitle="Resultado registrado en cada seguimiento"
            >
              <BarrasHorizontales
                data={embudo}
                dataKey="total"
                nameKey="nombre"
                color={SERIE.contactados}
              />
            </Card>

            <Card title="Canal usado" subtitle="Por dónde se contacta">
              <BarrasHorizontales
                data={canales}
                dataKey="total"
                nameKey="nombre"
                color={NEUTRO}
              />
            </Card>
          </div>

          {motivos.length > 0 && (
            <Card
              title="Motivos de cancelación"
              subtitle="Lo que dicen los que se van — el insumo para arreglar el producto"
            >
              <BarrasHorizontales
                data={motivos}
                dataKey="total"
                nameKey="nombre"
                color={SERIE.no_contesto}
              />
            </Card>
          )}

          {/* ── Asesores: tabla, no gráfico. Son pocas filas y varias
              medidas a la vez; una tabla se lee mejor que 4 barras. ── */}
          <Card
            title="Desempeño por asesor"
            subtitle="Mide lo que se REGISTRA. Si alguien contacta y no anota, aparece igual que si no hubiera trabajado."
          >
            {!data.asesores?.length ? (
              <div className="text-xs text-slate-400 py-6 text-center">
                Sin seguimientos registrados en el periodo
              </div>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-xs min-w-[560px]">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-200">
                      <th className="text-left font-semibold py-2 px-1">
                        Asesor
                      </th>
                      <th className="text-right font-semibold py-2 px-1">
                        Seguim.
                      </th>
                      <th className="text-right font-semibold py-2 px-1">
                        Clientes
                      </th>
                      <th className="text-right font-semibold py-2 px-1">
                        Contactados
                      </th>
                      <th className="text-right font-semibold py-2 px-1">
                        Recuperados
                      </th>
                      <th className="text-right font-semibold py-2 px-1">
                        Vencidos
                      </th>
                      <th className="text-right font-semibold py-2 px-1">
                        Último
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.asesores.map((a) => {
                      const venc = Number(a.compromisos_vencidos) || 0;
                      return (
                        <tr key={a.asesor || "—"}>
                          <td className="py-2 px-1 font-semibold text-slate-800">
                            {a.asesor || "Sin nombre"}
                          </td>
                          <td className="py-2 px-1 text-right text-slate-700">
                            {fmtNumber(a.seguimientos)}
                          </td>
                          <td className="py-2 px-1 text-right text-slate-700">
                            {fmtNumber(a.clientes)}
                          </td>
                          <td className="py-2 px-1 text-right text-slate-700">
                            {fmtNumber(a.contactados)}
                          </td>
                          <td className="py-2 px-1 text-right font-bold text-emerald-600">
                            {fmtNumber(a.recuperados)}
                          </td>
                          <td
                            className={`py-2 px-1 text-right font-bold ${venc > 0 ? "text-rose-600" : "text-slate-400"}`}
                          >
                            {fmtNumber(venc)}
                          </td>
                          <td className="py-2 px-1 text-right text-slate-500">
                            {a.ultimo
                              ? new Date(a.ultimo).toLocaleDateString("es-EC", {
                                  day: "2-digit",
                                  month: "short",
                                })
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
