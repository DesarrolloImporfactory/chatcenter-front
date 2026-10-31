import { useId } from "react";
import { TOKENS, fmtDia, fmtNum } from "../ui";

/* ═══════════════════════════════════════════════════════════════════════
   Gráficos chicos en SVG, sin librerías.
     · Sparkline  → línea con área degradada (tendencias de 30 días).
     · BarrasSVG  → barras por día con tooltip nativo (historial de ventas).
     · Delta      → variación «7 d vs 7 d anteriores» con flecha y color.
     · BarraStock → barra horizontal proporcional.
   ═══════════════════════════════════════════════════════════════════════ */

export function Sparkline({ serie, campo = "anuncios_activos", ancho = 120, alto = 32, color = TOKENS.sky, grosor = 2, relleno = true, className = "" }) {
  const id = useId().replace(/:/g, "");
  const valores = (serie || []).map((p) => Number(p?.[campo]) || 0);
  if (valores.length < 2) {
    return (
      <div className={`flex items-center text-[11px] text-slate-300 ${className}`} style={{ width: ancho, height: alto }}>
        —
      </div>
    );
  }
  const max = Math.max(1, ...valores);
  const min = Math.min(...valores);
  const rango = Math.max(1, max - min);
  const pad = grosor;
  const px = (i) => pad + (i / (valores.length - 1)) * (ancho - pad * 2);
  const py = (v) => alto - pad - ((v - min) / rango) * (alto - pad * 2);
  const puntos = valores.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`);
  const linea = puntos.join(" ");
  const area = `${px(0).toFixed(1)},${alto} ${linea} ${px(valores.length - 1).toFixed(1)},${alto}`;
  const ultimo = valores[valores.length - 1];
  const primero = valores[0];
  const sube = ultimo >= primero;
  const c = color === "auto" ? (sube ? TOKENS.verde : TOKENS.rosa) : color;
  return (
    <svg width={ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`} className={className} role="img" aria-label={`Tendencia: de ${fmtNum(primero)} a ${fmtNum(ultimo)}`}>
      <defs>
        <linearGradient id={`g${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.35" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      {relleno ? <polygon points={area} fill={`url(#g${id})`} /> : null}
      <polyline points={linea} fill="none" stroke={c} strokeWidth={grosor} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={px(valores.length - 1)} cy={py(ultimo)} r={grosor + 0.5} fill={c} />
    </svg>
  );
}

export function BarrasSVG({ serie, campo = "unidades", alto = 88, color = TOKENS.sky, colorReab = TOKENS.ambar, vacio = "Sin datos todavía", ejes = true }) {
  const datos = serie || [];
  const valores = datos.map((p) => Number(p?.[campo]) || 0);
  if (!datos.length) return <div className="text-xs text-slate-400">{vacio}</div>;
  const max = Math.max(1, ...valores);
  const n = datos.length;
  const ancho = 100; // porcentaje: el SVG se estira al contenedor
  const gap = n > 40 ? 0.4 : 1.2;
  const w = (ancho - gap * (n - 1)) / n;
  return (
    <div>
      <svg viewBox={`0 0 ${ancho} ${alto}`} preserveAspectRatio="none" className="block w-full" style={{ height: alto }} role="img" aria-label="Ventas por día">
        {datos.map((p, i) => {
          const v = valores[i];
          const h = v ? Math.max(1.5, (v / max) * (alto - 4)) : 1;
          const x = i * (w + gap);
          return (
            <g key={p.fecha || i}>
              <rect x={x} y={alto - h} width={w} height={h} rx={w > 2 ? 0.8 : 0} fill={v ? (p.reabastecido ? colorReab : color) : "#e2e8f0"} opacity={v ? 1 : 0.9}>
                <title>{`${fmtDia(p.fecha)}: ${fmtNum(v)}${p.reabastecido ? " · reabastecido" : ""}`}</title>
              </rect>
            </g>
          );
        })}
      </svg>
      {ejes ? (
        <div className="mt-1 flex justify-between text-[10px] text-slate-400">
          <span>{fmtDia(datos[0]?.fecha)}</span>
          <span className="font-semibold text-slate-500">máx. {fmtNum(max)}/día</span>
          <span>{fmtDia(datos[n - 1]?.fecha)}</span>
        </div>
      ) : null}
    </div>
  );
}

/* Variación entre dos periodos. Sin periodo previo no inventa porcentaje:
   muestra «nuevo» si hay ventas y «—» si no. */
export function Delta({ actual, previo, chico = false, title }) {
  const a = Number(actual) || 0;
  const p = Number(previo) || 0;
  const base = `inline-flex items-center gap-0.5 rounded-md font-bold ${chico ? "px-1 py-0.5 text-[10px]" : "px-1.5 py-0.5 text-[11px]"}`;
  if (!p) {
    if (!a) return <span className={`${base} text-slate-300`}>—</span>;
    return (
      <span className={`${base} bg-sky-50 text-sky-700`} title={title || "Sin ventas la semana anterior"}>
        <i className="bx bx-sparkles" /> nuevo
      </span>
    );
  }
  const pct = Math.round(((a - p) / p) * 100);
  if (pct === 0) {
    return (
      <span className={`${base} bg-slate-100 text-slate-500`} title={title || `Igual que la semana anterior (${fmtNum(p)})`}>
        <i className="bx bx-minus" /> 0 %
      </span>
    );
  }
  const sube = pct > 0;
  return (
    <span className={`${base} ${sube ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`} title={title || `Semana anterior: ${fmtNum(p)}`}>
      <i className={`bx ${sube ? "bx-up-arrow-alt" : "bx-down-arrow-alt"}`} />
      {sube ? "+" : ""}
      {fmtNum(Math.min(Math.abs(pct), 999))}
      {Math.abs(pct) > 999 ? "+" : ""} %
    </span>
  );
}

export function BarraStock({ valor, max, className = "" }) {
  const v = Number(valor) || 0;
  const m = Math.max(1, Number(max) || 1);
  const pct = Math.max(0, Math.min(100, Math.round((v / m) * 100)));
  const tono = v <= 0 ? "bg-rose-400" : v < 20 ? "bg-amber-400" : "bg-gradient-to-r from-sky-500 to-cyan-400";
  return (
    <div className={`min-w-[88px] ${className}`} title={`Stock: ${fmtNum(v)}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className={`text-sm font-bold ${v <= 0 ? "text-rose-600" : "text-slate-800"}`}>{fmtNum(v)}</span>
        {v <= 0 ? <span className="text-[10px] font-bold uppercase text-rose-500">agotado</span> : null}
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tono}`} style={{ width: `${Math.max(v > 0 ? 4 : 0, pct)}%` }} />
      </div>
    </div>
  );
}

/* Gráfica grande de línea + área con eje de fechas, al ancho del contenedor.
   serie: [{ fecha, <campo> }], ya ordenada y continua (un punto por día). */
export function GraficaLinea({ serie, campo = "unidades", alto = 220, color = TOKENS.sky, etiqueta = "ventas" }) {
  const id = useId().replace(/:/g, "");
  const datos = serie || [];
  const valores = datos.map((p) => Number(p?.[campo]) || 0);
  const n = valores.length;
  if (n < 2) return null;
  const W = 1000;
  const H = alto;
  const padY = 10;
  const max = Math.max(1, ...valores);
  const px = (i) => (i / (n - 1)) * W;
  const py = (v) => H - padY - (v / max) * (H - padY * 2);
  const linea = valores.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(" ");
  const area = `0,${H} ${linea} ${W},${H}`;
  const ticks = Math.min(6, n);
  const idxTicks = Array.from({ length: ticks }, (_, i) => Math.round((i / (ticks - 1)) * (n - 1)));
  const niveles = [0.25, 0.5, 0.75];
  return (
    <div className="w-full">
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block w-full" style={{ height: H }} role="img" aria-label={`Evolución de ${etiqueta}`}>
          <defs>
            <linearGradient id={`gl${id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.32" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {niveles.map((f) => (
            <line key={f} x1="0" x2={W} y1={py(max * f)} y2={py(max * f)} stroke="#e2e8f0" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray="4 4" />
          ))}
          {idxTicks.map((i) => (
            <line key={`t${i}`} x1={px(i)} x2={px(i)} y1={padY} y2={H} stroke="#f1f5f9" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          <polygon points={area} fill={`url(#gl${id})`} />
          <polyline points={linea} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
          {datos.map((p, i) => (
            <rect key={p.fecha || i} x={px(i) - W / n / 2} y={0} width={W / n} height={H} fill="transparent">
              <title>{`${fmtDia(p.fecha)}: ${fmtNum(valores[i])} ${etiqueta}${p.reabastecido ? " · reabastecido" : ""}`}</title>
            </rect>
          ))}
        </svg>
        <span className="pointer-events-none absolute left-1 top-0 text-[10px] font-bold text-slate-400">máx. {fmtNum(max)}</span>
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        {idxTicks.map((i) => (
          <span key={i}>{fmtDia(datos[i]?.fecha)}</span>
        ))}
      </div>
    </div>
  );
}

/* Serie de 7 barras mini para una fila: recibe cualquier arreglo de números. */
export function MiniBarras({ valores, alto = 22, ancho = 56, color = TOKENS.sky }) {
  const vs = (valores || []).map((v) => Number(v) || 0);
  if (!vs.length) return null;
  const max = Math.max(1, ...vs);
  const gap = 2;
  const w = (ancho - gap * (vs.length - 1)) / vs.length;
  return (
    <svg width={ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`} aria-hidden="true">
      {vs.map((v, i) => {
        const h = v ? Math.max(2, (v / max) * alto) : 2;
        return <rect key={i} x={i * (w + gap)} y={alto - h} width={w} height={h} rx={1} fill={v ? color : "#e2e8f0"} />;
      })}
    </svg>
  );
}
