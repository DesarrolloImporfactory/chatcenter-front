import { Fragment, useEffect, useState } from "react";
import chatApi from "../../api/chatcenter";
import { fmt$, fmtNum, fmtPct } from "./utils";

/* ═════════════════════════════════════════════════════════════════
   Efectividad por ciudad y transportadora («Reportes PRO» del curso
   Master eCom, clase 6/9): de los pedidos Dropi del vendedor, cuánto
   se entrega y cuánto deja cada ciudad, contra la tasa del mercado en
   esa misma ciudad, con ⭐ de 1 a 3. Encima, «Analizar con IA» pide
   3–5 acciones con la llave de IA del propio negocio.
   Datos: POST dropi_integrations/dashboard/efectividad(-ia)
   ═════════════════════════════════════════════════════════════════ */

const FILAS_INICIALES = 10;

const TIPO_ACCION = {
  confirmar: { icono: "bx-phone-call", t: "Confirmar" },
  cambiar_transportadora: { icono: "bx-transfer", t: "Transportadora" },
  pausar_ciudad: { icono: "bx-pause-circle", t: "Pausar ciudad" },
  precio: { icono: "bx-purchase-tag", t: "Precio" },
  otro: { icono: "bx-bulb", t: "Acción" },
};

const PRIORIDAD = {
  alta: "bg-rose-50 text-rose-700 ring-rose-200",
  media: "bg-amber-50 text-amber-700 ring-amber-200",
  baja: "bg-slate-100 text-slate-600 ring-slate-200",
};

function colorEfectividad(v, umbrales) {
  if (v == null) return "text-slate-400";
  if (v >= umbrales.tres) return "text-emerald-600";
  if (v >= umbrales.dos) return "text-amber-600";
  return "text-rose-600";
}

function Estrellas({ n, enCurso = false }) {
  if (n == null) {
    return <span className="text-[10.5px] font-medium text-slate-400">{enCurso ? "aún en camino" : "pocos datos"}</span>;
  }
  return (
    <span className="whitespace-nowrap text-[13px] leading-none" title={`${n} de 3`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={i <= n ? "text-amber-400" : "text-slate-200"}>
          ★
        </span>
      ))}
    </span>
  );
}

/* % de entrega del vendedor y, debajo, el del mercado con la diferencia.
   Mientras la fila tenga mucho en camino se muestra lo entregado sobre todo
   lo vivo, en gris y sin compararlo con el mercado (sería injusto); cerrada,
   la efectividad final con su color y la diferencia. */
function CeldaEntrega({ fila, umbrales }) {
  const m = fila.mercado_efectividad;
  const cerrada = fila.cerrada !== false;
  const valor = cerrada ? (fila.efectividad_final ?? fila.efectividad) : fila.efectividad;
  const dif = cerrada && valor != null && m != null ? valor - m : null;
  return (
    <div className="leading-tight">
      <span
        className={`dv2-num text-[13px] font-extrabold ${cerrada ? colorEfectividad(valor, umbrales) : "text-slate-500"}`}
        title={cerrada ? undefined : `${fila.entregadas} entregados de ${fila.entregadas + fila.devoluciones + fila.en_curso}; el resto sigue en camino`}
      >
        {fmtPct(valor)}
      </span>
      {!cerrada && (
        <p className="dv2-num text-[10.5px] text-slate-400">
          {fmtNum(fila.entregadas)} de {fmtNum(fila.entregadas + fila.devoluciones + fila.en_curso)} hasta hoy
        </p>
      )}
      {m != null && (
        <p className="dv2-num text-[10.5px] text-slate-400">
          mercado {fmtPct(m, 0)}
          {dif != null && Math.abs(dif) >= 1 && (
            <span className={dif < 0 ? "ml-1 font-bold text-rose-500" : "ml-1 font-bold text-emerald-500"}>
              {dif > 0 ? "+" : ""}
              {Math.round(dif)}
            </span>
          )}
        </p>
      )}
    </div>
  );
}

function FilaTabla({ fila, nombre, umbrales, sub = false, abierta, onClick }) {
  const expandible = Boolean(onClick);
  return (
    <tr
      onClick={onClick}
      className={`border-t border-slate-100 ${sub ? "bg-slate-50/70" : ""} ${
        expandible ? "cursor-pointer hover:bg-slate-50" : ""
      }`}
    >
      <td className={`py-2.5 pr-3 ${sub ? "pl-7" : "pl-1"}`}>
        <div className="flex items-center gap-1.5">
          {expandible && (
            <i className={`bx ${abierta ? "bx-chevron-down" : "bx-chevron-right"} text-base text-slate-400`} />
          )}
          <span className={`truncate ${sub ? "text-[12px] text-slate-600" : "text-[12.5px] font-bold text-slate-800"}`}>
            {nombre}
          </span>
        </div>
      </td>
      <td className="dv2-num px-3 text-right text-[12.5px] font-semibold text-slate-700">
        {fmtNum(fila.pedidos)}
        {fila.en_curso > 0 && (
          <p className="text-[10.5px] font-normal text-slate-400">{fmtNum(fila.en_curso)} en curso</p>
        )}
      </td>
      <td className="px-3 text-right">
        <CeldaEntrega fila={fila} umbrales={umbrales} />
      </td>
      <td className="dv2-num px-3 text-right text-[12.5px] text-slate-600">{fmtPct(fila.devolucion_pct)}</td>
      <td className="dv2-num px-3 text-right text-[12.5px] text-slate-700">{fmt$(fila.venta)}</td>
      <td
        className={`dv2-num px-3 text-right text-[12.5px] font-bold ${
          fila.utilidad < 0 ? "text-rose-600" : "text-slate-900"
        }`}
      >
        {fmt$(fila.utilidad)}
        {fila.margen != null && <p className="text-[10.5px] font-normal text-slate-400">{fmtPct(fila.margen, 0)} margen</p>}
      </td>
      <td className="py-2.5 pl-3 pr-1 text-right">
        <Estrellas n={fila.estrellas} enCurso={fila.cerrada === false} />
      </td>
    </tr>
  );
}

function PanelIA({ ia, error, cargando }) {
  if (cargando) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-[12.5px] text-indigo-700">
        <i className="bx bx-loader-alt animate-spin text-lg" />
        Analizando tus ciudades y transportadoras…
      </div>
    );
  }
  if (error) {
    return (
      <div className="mb-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12.5px] text-rose-700">
        <i className="bx bx-error-circle mt-0.5 text-lg" />
        {error}
      </div>
    );
  }
  if (!ia) return null;
  return (
    <div className="mb-4 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white p-4">
      <p className="flex items-start gap-2 text-[13px] font-semibold leading-snug text-slate-800">
        <i className="bx bxs-magic-wand mt-0.5 text-indigo-500" />
        {ia.resumen}
      </p>
      <ul className="mt-3 space-y-2">
        {ia.acciones.map((a, i) => {
          const tipo = TIPO_ACCION[a.tipo] || TIPO_ACCION.otro;
          return (
            <li key={i} className="flex gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-100">
              <i className={`bx ${tipo.icono} mt-0.5 text-xl text-indigo-500`} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ${
                      PRIORIDAD[a.prioridad] || PRIORIDAD.baja
                    }`}
                  >
                    {a.prioridad}
                  </span>
                  <span className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
                    {tipo.t} · {a.donde}
                  </span>
                </div>
                <p className="mt-1 text-[12.5px] font-bold text-slate-900">{a.accion}</p>
                <p className="text-[12px] text-slate-500">{a.motivo}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function EfectividadCiudades({ idConfiguracion, from, to, tick }) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [vista, setVista] = useState("ciudades");
  const [todas, setTodas] = useState(false);
  const [abierta, setAbierta] = useState(null);
  const [ia, setIa] = useState(null);
  const [iaError, setIaError] = useState("");
  const [iaCargando, setIaCargando] = useState(false);

  useEffect(() => {
    if (!idConfiguracion) return undefined;
    let vivo = true;
    setCargando(true);
    setError("");
    setIa(null);
    setIaError("");
    setAbierta(null);
    chatApi
      .post(
        "dropi_integrations/dashboard/efectividad",
        { id_configuracion: idConfiguracion, from, until: to },
        { timeout: 60000, silentError: true },
      )
      .then((r) => vivo && setDatos(r?.data?.data || null))
      .catch((e) => vivo && setError(e?.response?.data?.message || "No se pudo calcular la efectividad"))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, [idConfiguracion, from, to, tick]);

  const analizar = async () => {
    setIaCargando(true);
    setIaError("");
    try {
      const r = await chatApi.post(
        "dropi_integrations/dashboard/efectividad-ia",
        { id_configuracion: idConfiguracion, from, until: to },
        { timeout: 90000, silentError: true },
      );
      setIa(r?.data?.data || null);
    } catch (e) {
      setIaError(e?.response?.data?.message || "La IA no respondió. Intenta de nuevo.");
    } finally {
      setIaCargando(false);
    }
  };

  if (cargando) {
    return (
      <div className="relative h-[260px] overflow-hidden rounded-xl bg-slate-100">
        <div className="absolute inset-0 animate-[dv2Sweep_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/80 to-transparent" />
      </div>
    );
  }
  if (error) {
    return <p className="rounded-2xl bg-rose-50 px-4 py-3 text-[12.5px] text-rose-700">{error}</p>;
  }
  if (!datos?.ciudades?.length) {
    return (
      <div className="grid h-[180px] place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60">
        <div className="text-center">
          <i className="bx bx-map-pin text-3xl text-slate-300" />
          <p className="mt-1 text-[12px] font-medium text-slate-500">Sin pedidos Dropi con ciudad en el periodo</p>
        </div>
      </div>
    );
  }

  const umbrales = datos.umbrales;
  const lista = vista === "ciudades" ? datos.ciudades : datos.transportadoras;
  const visibles = todas ? lista : lista.slice(0, FILAS_INICIALES);
  const t = datos.totales;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full bg-slate-100 p-0.5">
          {[
            ["ciudades", `Ciudades (${datos.ciudades.length})`],
            ["transportadoras", `Transportadoras (${datos.transportadoras.length})`],
          ].map(([k, label]) => (
            <button
              key={k}
              onClick={() => {
                setVista(k);
                setTodas(false);
                setAbierta(null);
              }}
              className={`rounded-full px-3 py-1 text-[11.5px] font-bold transition ${
                vista === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="dv2-num text-[11.5px] text-slate-500">
          Total: <b className={t.cerrada === false ? "text-slate-700" : colorEfectividad(t.efectividad, umbrales)}>{fmtPct(t.efectividad)}</b> entregado
          {t.en_curso > 0 && <> ({fmtNum(t.entregadas)} de {fmtNum(t.entregadas + t.devoluciones + t.en_curso)}, {fmtNum(t.en_curso)} en camino)</>} ·{" "}
          <b className="text-slate-800">{fmt$(t.utilidad)}</b> de utilidad
        </p>
        <button
          onClick={analizar}
          disabled={iaCargando}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3.5 py-1.5 text-[11.5px] font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
        >
          <i className="bx bxs-magic-wand" />
          {ia ? "Volver a analizar" : "Analizar con IA"}
        </button>
      </div>

      <PanelIA ia={ia} error={iaError} cargando={iaCargando} />

      <div className="dv2-scroll overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="text-left text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
              <th className="pb-2 pl-1 pr-3">{vista === "ciudades" ? "Ciudad" : "Transportadora"}</th>
              <th className="px-3 pb-2 text-right">Pedidos</th>
              <th className="px-3 pb-2 text-right">Entregado</th>
              <th className="px-3 pb-2 text-right">Devolución</th>
              <th className="px-3 pb-2 text-right">Venta</th>
              <th className="px-3 pb-2 text-right">Utilidad</th>
              <th className="pb-2 pl-3 pr-1 text-right">Nota</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((f) => {
              const nombre = vista === "ciudades" ? f.ciudad : f.transportadora;
              const expandible = vista === "ciudades" && f.transportadoras?.length > 0;
              const abiertaEsta = abierta === nombre;
              return (
                <Fragment key={nombre}>
                  <FilaTabla
                    fila={f}
                    nombre={nombre}
                    umbrales={umbrales}
                    abierta={abiertaEsta}
                    onClick={expandible ? () => setAbierta(abiertaEsta ? null : nombre) : undefined}
                  />
                  {abiertaEsta &&
                    f.transportadoras.map((tr) => (
                      <FilaTabla
                        key={`${nombre}-${tr.transportadora}`}
                        fila={tr}
                        nombre={tr.transportadora}
                        umbrales={umbrales}
                        sub
                      />
                    ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
        {lista.length > FILAS_INICIALES && (
          <button onClick={() => setTodas((v) => !v)} className="font-bold text-slate-600 hover:underline">
            {todas ? "Ver menos" : `Ver las ${lista.length}`}
          </button>
        )}
        <span>
          Entregado = entregados ÷ (entregados + devueltos). Utilidad = ganancia de lo entregado − flete de las
          devoluciones.
        </span>
        <span>
          ★★★ desde {umbrales.tres}% y con utilidad · ★★ desde {umbrales.dos}% · nota con {datos.min_muestra}+ pedidos
          cerrados · mercado: últimos {datos.dias_mercado} días.
        </span>
      </div>
    </div>
  );
}
