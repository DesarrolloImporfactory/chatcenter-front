import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import chatApi from "../../api/chatcenter";
import { fmt$, fmtNum, fmtPct, fmtDiaCorto } from "./utils";

/* ═════════════════════════════════════════════════════════════════
   «¿Cuánto ganaste de verdad?»: lo que le queda al vendedor en el
   bolsillo, no lo que facturó. Cascada desde lo entregado hasta el
   neto (producto, fletes, devoluciones, publicidad, otros), la
   proyección de lo que está en camino, punto de equilibrio, serie
   diaria y ganancia por anuncio y por producto.
   Datos: POST dropi_integrations/dashboard/rentabilidad
   ═════════════════════════════════════════════════════════════════ */

const FILAS = 8;

const FUENTE = {
  meta: { t: "Meta Ads", c: "bg-sky-50 text-sky-700 ring-sky-200" },
  manual: { t: "gasto manual", c: "bg-amber-50 text-amber-700 ring-amber-200" },
  ninguna: { t: "sin datos", c: "bg-slate-100 text-slate-500 ring-slate-200" },
};

const colorNeto = (v) => (Number(v) < 0 ? "text-rose-600" : "text-emerald-600");

/* Neto si de lo que va en camino se entrega la fracción s (el resto vuelve
   y cuesta su flete). Sirve para el total, cada día y cada producto: el back
   manda neto de caja, flete del courier (que ya se restó), ganancia y flete
   de lo en camino. */
const simular = (x, s) =>
  Number(x.neto || 0) +
  Number(x.flete_courier || 0) +
  s * Number(x.ganancia_camino || 0) -
  (1 - s) * Number(x.flete_camino || 0);

/* Barra del simulador: arrastrar el % de entrega de lo que va en camino. */
function Simulador({ valor, onChange, real, equilibrio }) {
  const pct = Math.round(valor * 100);
  const marca = (v) => `${Math.min(100, Math.max(0, v))}%`;
  return (
    <div className="mt-4 rounded-xl bg-white/5 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-white/50">Simula tus entregas</p>
        <p className="dv2-num text-[18px] font-black text-white">{pct}%</p>
      </div>
      <div className="relative mt-2 h-6">
        {equilibrio != null && equilibrio > 0 && equilibrio < 1 && (
          <div
            className="pointer-events-none absolute top-0 h-6 w-0.5 bg-amber-300"
            style={{ left: marca(equilibrio * 100) }}
            title="Desde aquí ya no pierdes"
          />
        )}
        {real != null && (
          <div
            className="pointer-events-none absolute top-0 h-6 w-0.5 bg-white/40"
            style={{ left: marca(real) }}
            title="Tu efectividad real (90 días)"
          />
        )}
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={pct}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
          className="absolute inset-x-0 top-1/2 w-full -translate-y-1/2 cursor-pointer accent-emerald-400"
          aria-label="Porcentaje de entrega de lo que va en camino"
        />
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-white/60">
        {real != null && (
          <button onClick={() => onChange(real / 100)} className="font-bold text-white/80 underline-offset-2 hover:underline">
            ● tu real: {fmtPct(real, 0)}
          </button>
        )}
        {equilibrio != null && (
          <span className="text-amber-200">
            {equilibrio <= 0
              ? "▲ ya ganas aunque no se entregue nada más"
              : equilibrio >= 1
                ? "▲ pierdes aunque se entregue todo"
                : `▲ desde ${fmtPct(equilibrio * 100, 0)} ya no pierdes`}
          </span>
        )}
      </div>
    </div>
  );
}

function Skel({ className = "" }) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-slate-100 ${className}`}>
      <div className="absolute inset-0 animate-[dv2Sweep_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/80 to-transparent" />
    </div>
  );
}

/* Una fila de la cascada: barra proporcional a lo facturado. */
function PasoCascada({ etiqueta, valor, base, tipo, detalle, chip }) {
  const ancho = base > 0 ? Math.min(100, (Math.abs(valor) / base) * 100) : 0;
  const total = tipo === "total";
  const resta = tipo === "resta";
  const barra = total
    ? valor < 0
      ? "bg-rose-500"
      : "bg-emerald-500"
    : resta
      ? "bg-rose-200"
      : "bg-slate-800";
  return (
    <div className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 ${total ? "border-t border-slate-100 pt-2" : ""}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={`truncate text-[12px] ${total ? "font-extrabold text-slate-900" : "font-medium text-slate-600"}`}>
            {resta ? "− " : total ? "= " : ""}
            {etiqueta}
          </p>
          {chip}
        </div>
        <div className="mt-1 h-1.5 w-full rounded-full bg-slate-50">
          <div className={`h-1.5 rounded-full ${barra}`} style={{ width: `${Math.max(ancho, valor ? 1 : 0)}%` }} />
        </div>
        {detalle && <p className="mt-0.5 text-[10.5px] text-slate-400">{detalle}</p>}
      </div>
      <p
        className={`dv2-num text-right text-[13px] ${
          total ? `font-black ${colorNeto(valor)}` : resta ? "font-semibold text-rose-600" : "font-bold text-slate-900"
        }`}
      >
        {resta && valor ? "−" : ""}
        {fmt$(Math.abs(valor))}
      </p>
    </div>
  );
}

function Tarjeta({ titulo, valor, sub, tono = "text-slate-900", title }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3.5" title={title}>
      <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">{titulo}</p>
      <p className={`dv2-num mt-1 text-[20px] font-black leading-none ${tono}`}>{valor}</p>
      {sub && <p className="mt-1 text-[10.5px] leading-snug text-slate-500">{sub}</p>}
    </div>
  );
}

/* Barras del neto proyectado por día (verde gana, rojo pierde). */
function SerieNeto({ serie }) {
  const max = Math.max(1, ...serie.map((d) => Math.abs(d.neto_proyectado)));
  const hayNeg = serie.some((d) => d.neto_proyectado < 0);
  const alto = 84;
  const cero = hayNeg ? alto / 2 : alto;
  const escala = hayNeg ? alto / 2 : alto;
  return (
    <div>
      <div className="flex h-[84px] items-stretch gap-[3px]">
        {serie.map((d) => {
          const h = (Math.abs(d.neto_proyectado) / max) * escala;
          const neg = d.neto_proyectado < 0;
          return (
            <div
              key={d.dia}
              className="group relative flex-1"
              title={`${fmtDiaCorto(d.dia)} · ${fmtNum(d.pedidos)} pedidos · publicidad ${fmt$(d.publicidad)} · neto proyectado ${fmt$(d.neto_proyectado)}`}
            >
              <div
                className={`absolute left-0 right-0 rounded-[3px] ${neg ? "bg-rose-400" : "bg-emerald-400"} group-hover:opacity-80`}
                style={neg ? { top: cero, height: Math.max(h, 1) } : { top: cero - Math.max(h, 1), height: Math.max(h, 1) }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        <span>{fmtDiaCorto(serie[0]?.dia)}</span>
        <span>{fmtDiaCorto(serie[serie.length - 1]?.dia)}</span>
      </div>
    </div>
  );
}

function TablaAnuncios({ anuncios }) {
  const [todos, setTodos] = useState(false);
  const filas = todos ? anuncios.items : anuncios.items.slice(0, FILAS);
  if (!anuncios.items.length) {
    return <p className="py-6 text-center text-[12px] text-slate-400">Sin anuncios con gasto en el periodo.</p>;
  }
  return (
    <>
      <div className="dv2-scroll overflow-x-auto">
        <table className="w-full min-w-[520px] text-left">
          <thead>
            <tr className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
              <th className="pb-2 pr-2">Anuncio</th>
              <th className="pb-2 pr-2 text-right">Gasto</th>
              <th className="pb-2 pr-2 text-right">Pedidos</th>
              <th className="pb-2 pr-2 text-right">ROAS</th>
              <th className="pb-2 text-right">Te deja</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((a) => (
              <tr key={a.ad_id} className="border-t border-slate-100 align-top">
                <td className="max-w-[220px] py-2 pr-2">
                  <div className="flex items-center gap-2">
                    {a.miniatura ? (
                      <img src={a.miniatura} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" loading="lazy" />
                    ) : (
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100">
                        <i className="bx bxl-meta text-slate-400" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold text-slate-800" title={a.nombre}>
                        {a.nombre}
                      </p>
                      <p className="truncate text-[10.5px] text-slate-400" title={a.campana}>
                        {a.estado === "ACTIVE" ? "● activo · " : ""}
                        {a.campana}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="dv2-num py-2 pr-2 text-right text-[12px] text-slate-700">{fmt$(a.gasto)}</td>
                <td className="py-2 pr-2 text-right leading-tight">
                  <span className="dv2-num text-[12px] font-bold text-slate-800">{fmtNum(a.pedidos)}</span>
                  <p className="dv2-num text-[10.5px] text-slate-400">
                    {a.entregadas} ent · {a.devoluciones} dev · {a.en_camino} cam
                  </p>
                </td>
                <td className="dv2-num py-2 pr-2 text-right text-[12px] text-slate-700">{a.roas == null ? "—" : `${a.roas}x`}</td>
                <td className="py-2 text-right leading-tight">
                  <span className={`dv2-num text-[13px] font-extrabold ${colorNeto(a.neto_proyectado)}`}>{fmt$(a.neto_proyectado)}</span>
                  <p className="dv2-num text-[10.5px] text-slate-400" title="Lo que ya dejó con lo entregado hasta hoy">
                    hoy {fmt$(a.neto)}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {anuncios.items.length > FILAS && (
        <button onClick={() => setTodos((v) => !v)} className="mt-2 text-[12px] font-bold text-sky-700 hover:underline">
          {todos ? "Ver menos" : `Ver los ${anuncios.items.length}`}
        </button>
      )}
    </>
  );
}

function TablaProductos({ productos }) {
  const [todos, setTodos] = useState(false);
  const filas = todos ? productos : productos.slice(0, FILAS);
  if (!productos.length) {
    return <p className="py-6 text-center text-[12px] text-slate-400">Sin pedidos en el periodo.</p>;
  }
  return (
    <>
      <div className="dv2-scroll overflow-x-auto">
        <table className="w-full min-w-[420px] text-left">
          <thead>
            <tr className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
              <th className="pb-2 pr-2">Producto</th>
              <th className="pb-2 pr-2 text-right">Pedidos</th>
              <th className="pb-2 pr-2 text-right">Entrega</th>
              <th className="pb-2 text-right">Te deja</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((p) => (
              <tr key={p.producto} className="border-t border-slate-100 align-top">
                <td className="max-w-[220px] py-2 pr-2">
                  <p className="truncate text-[12px] font-semibold text-slate-800" title={p.producto}>
                    {p.producto}
                  </p>
                  <p className="dv2-num text-[10.5px] text-slate-400">facturado {fmt$(p.facturado)}</p>
                </td>
                <td className="py-2 pr-2 text-right leading-tight">
                  <span className="dv2-num text-[12px] font-bold text-slate-800">{fmtNum(p.pedidos)}</span>
                  <p className="dv2-num text-[10.5px] text-slate-400">{p.en_camino} en camino</p>
                </td>
                <td className="dv2-num py-2 pr-2 text-right text-[12px] text-slate-700">{fmtPct(p.efectividad, 0)}</td>
                <td className="py-2 text-right leading-tight">
                  <span className={`dv2-num text-[13px] font-extrabold ${colorNeto(p.neto_proyectado)}`}>{fmt$(p.neto_proyectado)}</span>
                  <p className="dv2-num text-[10.5px] text-slate-400">hoy {fmt$(p.neto)}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {productos.length > FILAS && (
        <button onClick={() => setTodos((v) => !v)} className="mt-2 text-[12px] font-bold text-sky-700 hover:underline">
          {todos ? "Ver menos" : `Ver los ${productos.length}`}
        </button>
      )}
    </>
  );
}

export default function RentabilidadReal({ idConfiguracion, from, to, tick }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [sim, setSim] = useState(null);

  useEffect(() => {
    if (!idConfiguracion) return undefined;
    let vivo = true;
    setCargando(true);
    setError(null);
    chatApi
      .post(
        "dropi_integrations/dashboard/rentabilidad",
        { id_configuracion: idConfiguracion, from, until: to },
        { timeout: 60000, silentError: true },
      )
      .then(({ data: r }) => {
        if (!vivo) return;
        setData(r?.data || null);
        // El simulador arranca en la efectividad real de la tienda.
        const ef = r?.data?.proyeccion?.efectividad_usada;
        setSim(ef != null ? ef / 100 : 0.75);
      })
      .catch((e) => vivo && setError(e?.response?.data?.message || "No se pudo calcular la rentabilidad."))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, [idConfiguracion, from, to, tick]);

  const c = data?.cascada;
  const k = data?.kpis;
  const p = data?.proyeccion;
  const ped = data?.pedidos;
  const fuente = FUENTE[data?.publicidad_fuente] || FUENTE.ninguna;
  const s = sim ?? 0.75;
  const serieConDatos = (data?.serie || []).length > 1;

  const vista = useMemo(() => {
    if (!data) return null;
    const cc = data.cascada;
    const pp = data.proyeccion;
    const kk = data.kpis;
    const tot = {
      neto: cc.neto,
      flete_courier: cc.flete_en_camino,
      ganancia_camino: pp.ganancia_en_camino,
      flete_camino: pp.flete_en_camino_total,
    };
    const neto = simular(tot, s);
    const den = Number(pp.ganancia_en_camino || 0) + Number(pp.flete_en_camino_total || 0);
    const equilibrio =
      pp.en_camino > 0 && den > 0
        ? (Number(pp.flete_en_camino_total || 0) - Number(cc.neto) - Number(cc.flete_en_camino || 0)) / den
        : null;
    const entregas = data.pedidos.entregadas + pp.en_camino * s;
    const pm = Number(kk.ganancia_media_entrega || 0);
    const fm = Number(kk.flete_medio_devolucion || 0);
    return {
      neto,
      equilibrio,
      porEntrega: entregas > 0 ? neto / entregas : null,
      serie: data.serie.map((d) => ({ ...d, neto_proyectado: simular(d, s) })),
      productos: (data.productos || [])
        .map((x) => ({ ...x, neto_proyectado: simular(x, s) }))
        .sort((a, b) => b.neto_proyectado - a.neto_proyectado),
      anuncios: data.anuncios && {
        ...data.anuncios,
        items: data.anuncios.items.map((a) => ({
          ...a,
          neto_proyectado: a.neto + a.en_camino * (s * pm - (1 - s) * fm),
        })),
      },
    };
  }, [data, s]);

  if (cargando && !data) {
    return (
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Skel className="h-[300px]" />
        <Skel className="h-[300px]" />
      </div>
    );
  }
  if (error) {
    return <p className="rounded-xl bg-rose-50 px-4 py-3 text-[12px] font-medium text-rose-700">{error}</p>;
  }
  if (!data || !ped?.total) {
    return <p className="py-8 text-center text-[12px] text-slate-400">Sin pedidos Dropi en este periodo.</p>;
  }

  const equilibrioOk = k.punto_equilibrio != null && ped.efectividad != null && ped.efectividad >= k.punto_equilibrio;

  return (
    <div className={`space-y-5 ${cargando ? "opacity-60 transition-opacity" : ""}`}>
      {/* ── neto + tarjetas ── */}
      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-2xl bg-slate-900 p-5 text-white">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/50">Te queda en el bolsillo</p>
          <p className={`dv2-num mt-1 text-[40px] font-black leading-none ${vista.neto < 0 ? "text-rose-300" : "text-emerald-300"}`}>
            {fmt$(vista.neto)}
          </p>
          {p.en_camino > 0 ? (
            <p className="mt-1 text-[12px] text-white/60">
              si se entrega el {Math.round(s * 100)}% de los {fmtNum(p.en_camino)} pedidos en camino · hoy en caja{" "}
              <span className={`dv2-num font-bold ${c.neto < 0 ? "text-rose-300" : "text-white"}`}>{fmt$(c.neto)}</span>
            </p>
          ) : (
            <p className="mt-1 text-[12px] text-white/60">
              todo el periodo ya se cerró · {fmtNum(ped.entregadas)} entregados · margen neto {fmtPct(k.margen_neto)}
            </p>
          )}
          {p.en_camino > 0 && (
            <Simulador valor={s} onChange={setSim} real={p.efectividad_usada} equilibrio={vista.equilibrio} />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Tarjeta
            titulo="Por cada entrega"
            valor={vista.porEntrega == null ? "—" : fmt$(vista.porEntrega)}
            sub="neto que te deja cada pedido entregado, ya restada la publicidad"
            tono={colorNeto(vista.porEntrega)}
          />
          <Tarjeta
            titulo="ROAS real"
            valor={k.roas_real == null ? "—" : `${k.roas_real}x`}
            sub={k.roas_real == null ? "sin gasto de publicidad cargado" : "facturado entregado ÷ publicidad"}
          />
          <Tarjeta
            titulo="Punto de equilibrio"
            valor={k.punto_equilibrio == null ? "—" : fmtPct(k.punto_equilibrio, 0)}
            sub={
              k.punto_equilibrio == null
                ? "aún no hay pedidos cerrados"
                : `de entrega para no perder · tú vas en ${fmtPct(ped.efectividad, 0)}`
            }
            tono={k.punto_equilibrio == null ? "text-slate-900" : equilibrioOk ? "text-emerald-600" : "text-rose-600"}
            title="Con tu ganancia media por entrega, el flete medio de una devolución y tu publicidad: el % de entrega con el que el neto queda en 0."
          />
          <Tarjeta
            titulo="Publicidad"
            valor={fmt$(c.publicidad)}
            sub={
              <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-bold ring-1 ${fuente.c}`}>
                {fuente.t}
                {data.impuesto_ads_pct > 0 ? ` + ${data.impuesto_ads_pct}% imp.` : ""}
              </span>
            }
          />
        </div>
      </div>

      {data.publicidad_fuente === "ninguna" && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-[12px] text-amber-800">
          <i className="bx bx-info-circle text-[16px]" />
          <span className="flex-1">
            Sin gasto de publicidad: este neto está inflado. Conecta tu cuenta de Meta Ads para restarlo solo.
          </span>
          <button
            onClick={() => navigate("/conexion-dashboard?view=ads")}
            className="rounded-lg bg-amber-600 px-3 py-1 text-[11.5px] font-bold text-white hover:bg-amber-700"
          >
            Conectar Meta
          </button>
        </div>
      )}
      {data.meta_error && (
        <p className="rounded-xl bg-amber-50 px-4 py-2 text-[11.5px] text-amber-800">
          Meta no respondió ({data.meta_error}); se usó {fuente.t}.
        </p>
      )}

      {/* ── cascada + serie ── */}
      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-2.5">
          <PasoCascada etiqueta="Facturado entregado" valor={c.facturado} base={c.facturado} detalle={`${fmtNum(ped.entregadas)} pedidos entregados`} />
          <PasoCascada etiqueta="Costo del producto" valor={c.costo_producto} base={c.facturado} tipo="resta" />
          <PasoCascada etiqueta="Flete de lo entregado" valor={c.flete_entregadas} base={c.facturado} tipo="resta" />
          <PasoCascada etiqueta="Ganancia Dropi" valor={c.ganancia_dropi} base={c.facturado} tipo="total" />
          <PasoCascada
            etiqueta="Flete de devoluciones"
            valor={c.flete_devoluciones}
            base={c.facturado}
            tipo="resta"
            detalle={`${fmtNum(ped.devoluciones)} devueltos: pagas ida y vuelta`}
          />
          <PasoCascada
            etiqueta="Flete de lo que va en camino"
            valor={c.flete_en_camino}
            base={c.facturado}
            tipo="resta"
            detalle={`${fmtNum(ped.en_courier)} con el courier: ya pagado, aún no cobrado`}
          />
          <PasoCascada
            etiqueta="Publicidad"
            valor={c.publicidad}
            base={c.facturado}
            tipo="resta"
            chip={<span className={`rounded-full px-1.5 py-0.5 text-[9.5px] font-bold ring-1 ${fuente.c}`}>{fuente.t}</span>}
          />
          {c.otros > 0 && <PasoCascada etiqueta="Otros gastos" valor={c.otros} base={c.facturado} tipo="resta" />}
          <PasoCascada etiqueta="Neto en tu bolsillo" valor={c.neto} base={c.facturado} tipo="total" />
        </div>

        <div>
          <p className="text-[12px] font-bold text-slate-700">Neto por día</p>
          <p className="mb-3 text-[11px] text-slate-400">
            Por fecha del pedido, con lo en camino entregado al {Math.round(s * 100)}%. Pasa el mouse por cada barra.
          </p>
          {serieConDatos ? (
            <SerieNeto serie={vista.serie} />
          ) : (
            <p className="py-6 text-center text-[12px] text-slate-400">Elige un rango de varios días para ver la serie.</p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3 text-[11px]">
            <div className="rounded-xl bg-slate-50 p-2.5">
              <p className="text-slate-400">Ganancia media por entrega</p>
              <p className="dv2-num text-[14px] font-extrabold text-slate-800">{fmt$(k.ganancia_media_entrega)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-2.5">
              <p className="text-slate-400">Te cuesta cada devolución</p>
              <p className="dv2-num text-[14px] font-extrabold text-rose-600">{fmt$(k.flete_medio_devolucion)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── por anuncio y por producto ── */}
      <div className="grid gap-5 xl:grid-cols-2">
        <div>
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <p className="text-[12px] font-bold text-slate-700">Cuánto te deja cada anuncio</p>
            {data.anuncios && (
              <p className="text-[10.5px] text-slate-400">
                {fmtPct(data.anuncios.pct_atribuidos, 0)} de los pedidos unidos a su anuncio
              </p>
            )}
          </div>
          {vista.anuncios ? (
            <TablaAnuncios anuncios={vista.anuncios} />
          ) : (
            <p className="rounded-xl bg-slate-50 py-6 text-center text-[12px] text-slate-400">
              {data.meta_conectada ? "Meta no devolvió los anuncios." : "Conecta Meta Ads para ver la ganancia por anuncio."}
            </p>
          )}
        </div>
        <div>
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <p className="text-[12px] font-bold text-slate-700">Cuánto te deja cada producto</p>
            <p className="text-[10.5px] text-slate-400">antes de publicidad</p>
          </div>
          <TablaProductos productos={vista.productos} />
        </div>
      </div>
    </div>
  );
}
