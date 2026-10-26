import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import chatApi from "../../api/chatcenter";
import { money2, fmtFecha, fmtFechaHora, inicialesDe } from "./recuperacionUtils";

/**
 * Registro de pagos recibidos fuera de Stripe (solo super admin).
 *
 * El registro en sí se hace desde la ficha del cliente (botón «Registrar pago
 * fuera de Stripe»). Esta vista es el libro: qué se cobró a mano, a quién,
 * con qué comprobante y qué pasó en Stripe. Trae un buscador porque el
 * cliente que paga por transferencia suele estar ACTIVO (su factura rebotó
 * pero la cuenta sigue) y no aparece en el embudo.
 */
const ACCION = {
  saldada: { label: "Factura saldada en Stripe", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  anuladas: { label: "Facturas anuladas", cls: "bg-slate-100 text-slate-700 ring-slate-200" },
  sin_factura: { label: "Sin factura (acceso a mano)", cls: "bg-violet-50 text-violet-700 ring-violet-200" },
  error: { label: "Stripe falló: revisar", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
};

const METODO = { transferencia: "Transferencia", efectivo: "Efectivo", otro: "Otro" };

export default function PagosManualesRecuperacion({ onAbrirCliente }) {
  const [pagos, setPagos] = useState(null);
  const [rebotados, setRebotados] = useState(null);
  const [rebotadosError, setRebotadosError] = useState(null);
  const [verMuertos, setVerMuertos] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [clientes, setClientes] = useState([]);
  const [buscando, setBuscando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const { data: r } = await chatApi.get("recuperacion/pagos-manuales", { params: { limit: 200 } });
      setPagos(r.data || []);
    } catch (e) {
      toast.error(e?.response?.data?.message || "No se pudieron cargar los pagos manuales");
      setPagos([]);
    }
  }, []);

  // A quién le rebotó el cobro, leído de Stripe en vivo (tarda unos segundos).
  const cargarRebotados = useCallback(async (fresh = false) => {
    setRebotadosError(null);
    if (fresh) setRebotados(null);
    try {
      const { data: r } = await chatApi.get("recuperacion/pagos-manuales/rebotados", {
        params: fresh ? { fresh: 1 } : {},
        silentError: true,
      });
      setRebotados(r.data);
    } catch (e) {
      setRebotadosError(e?.response?.data?.message || "No se pudo consultar Stripe");
      setRebotados({ filas: [], resumen: {} });
    }
  }, []);

  useEffect(() => {
    cargar();
    cargarRebotados();
  }, [cargar, cargarRebotados]);

  const [filtro, setFiltro] = useState("");
  const q = filtro.trim().toLowerCase();
  const rebotadosVisibles = (rebotados?.filas || []).filter(
    (f) =>
      (verMuertos || !f.sub_muerta) &&
      (!q || `${f.empresa || ""} ${f.email || ""} ${f.whatsapp || ""}`.toLowerCase().includes(q)),
  );
  const muertos = (rebotados?.filas || []).filter((f) => f.sub_muerta).length;

  const etiquetaFactura = (x) => {
    if (x.es_manual) return "manual (creada en Stripe)";
    if (x.es_de_suscripcion_bd) return "de su suscripción actual";
    if (x.sub_muerta) return "de una suscripción anterior, ya cancelada";
    return "de otra suscripción suya";
  };

  // Buscador de clientes (cualquier cuenta, esté o no en el embudo).
  useEffect(() => {
    const q = busqueda.trim();
    if (q.length < 3) {
      setClientes([]);
      return undefined;
    }
    let vivo = true;
    setBuscando(true);
    const t = setTimeout(async () => {
      try {
        const { data: r } = await chatApi.get("recuperacion/casos/buscar", { params: { q } });
        if (vivo) setClientes(r.data || []);
      } catch (_) {
        if (vivo) setClientes([]);
      } finally {
        if (vivo) setBuscando(false);
      }
    }, 400);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [busqueda]);

  const totales = useMemo(() => {
    const lista = pagos || [];
    const mes = new Date();
    mes.setDate(1);
    mes.setHours(0, 0, 0, 0);
    return {
      n: lista.length,
      total: lista.reduce((a, p) => a + Number(p.monto || 0), 0),
      mes: lista.filter((p) => new Date(p.created_at) >= mes).reduce((a, p) => a + Number(p.monto || 0), 0),
      errores: lista.filter((p) => p.stripe_accion === "error").length,
      sinComprobante: lista.filter((p) => !p.comprobante_url).length,
    };
  }, [pagos]);

  return (
    <div className="space-y-4">
      {/* ── A quién le rebotó el cobro ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-rose-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-rose-100 bg-rose-50/60 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm font-bold text-rose-900 inline-flex items-center gap-1.5">
              <i className="bx bx-error-circle" /> Clientes a los que Stripe no les pudo cobrar
            </div>
            <p className="text-[11px] text-rose-800/80 leading-snug mt-0.5">
              Leído de Stripe ahora mismo. Son a quienes hay que escribirles para ofrecerles pagar por transferencia: escríbele, y cuando
              te mande el comprobante abre su ficha y registra el pago.
              {rebotados?.modo === "test" && <b> Stripe en modo TEST.</b>}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <div className="relative">
              <i className="bx bx-search absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Buscar en esta lista…"
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-rose-200 bg-white outline-none focus:border-rose-400 w-56"
              />
            </div>
            {muertos > 0 && (
              <label className="inline-flex items-center gap-1.5 text-slate-600 cursor-pointer" title="Facturas de suscripciones ya canceladas: Stripe agotó los reintentos y nadie las pagará solas">
                <input type="checkbox" checked={verMuertos} onChange={(e) => setVerMuertos(e.target.checked)} className="accent-rose-600" />
                Ver también deuda muerta ({muertos})
              </label>
            )}
            <button onClick={() => cargarRebotados(true)} className="font-semibold text-rose-700 hover:underline">
              <i className="bx bx-refresh" /> Releer Stripe
            </button>
          </div>
        </div>

        {rebotados === null ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            <i className="bx bx-loader-alt bx-spin text-2xl block mb-1" /> Consultando las facturas abiertas en Stripe…
          </div>
        ) : rebotadosError ? (
          <div className="py-6 px-4 text-xs text-rose-700">{rebotadosError}</div>
        ) : rebotadosVisibles.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            <i className="bx bx-check-circle text-emerald-500 text-2xl block mb-1" />
            Nadie con cobro rebotado ahora mismo.
            {muertos > 0 && !verMuertos && <span className="block text-xs text-slate-400 mt-1">Hay {muertos} con deuda muerta (suscripción cancelada).</span>}
          </div>
        ) : (
          <div className="overflow-auto max-h-[30rem]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold">Cliente</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Contacto</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Qué debe</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Cuenta hoy</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rebotadosVisibles.map((f) => (
                  <tr key={f.customer_id || f.email} className={`align-top ${f.sub_muerta ? "opacity-60" : "hover:bg-rose-50/30"}`}>
                    <td className="px-4 py-3">
                      {f.id_usuario ? (
                        <button onClick={() => onAbrirCliente?.(f.id_usuario)} className="font-semibold text-slate-900 hover:text-cyan-700 text-left">
                          {f.empresa || f.email}
                        </button>
                      ) : (
                        <span className="font-semibold text-slate-700">{f.empresa || f.email || f.customer_id}</span>
                      )}
                      <div className="text-[11px] text-slate-500">
                        {f.email}
                        {f.nombre_plan && <> · {f.nombre_plan}</>}
                        {!f.id_usuario && <span className="text-orange-600"> · sin cuenta en ImporChat</span>}
                      </div>
                      {f.ultimo_pago_manual && (
                        <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                          Ya registró un pago manual el {fmtFecha(f.ultimo_pago_manual)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {f.whatsapp_url ? (
                        <a href={f.whatsapp_url} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline inline-flex items-center gap-1 font-semibold">
                          <i className="bxl bxl-whatsapp" /> {f.whatsapp}
                        </a>
                      ) : (
                        <span className="text-amber-700">Sin número</span>
                      )}
                      {f.telefono_fuente === "conexion" && <div className="text-[10px] text-amber-700">Es el número de su bot</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      {f.monto_total > 0 && <b className="tabular-nums text-slate-900">{money2(f.monto_total)}</b>}
                      {f.facturas.map((x) => (
                        <div key={x.id} className="text-[11px] text-slate-500">
                          {money2(x.monto)} · {x.status === "open" ? "abierta" : "incobrable"} · {etiquetaFactura(x)}
                          {x.intentos > 0 && <> · {x.intentos} intento{x.intentos === 1 ? "" : "s"}</>}
                          {x.proximo_intento ? <> · Stripe reintenta {fmtFechaHora(x.proximo_intento)}</> : x.status === "open" && <> · Stripe ya no reintenta</>}
                        </div>
                      ))}
                      {verMuertos &&
                        (f.facturas_muertas || []).map((x) => (
                          <div key={x.id} className="text-[11px] text-slate-400 line-through decoration-slate-300">
                            {money2(x.monto)} · {etiquetaFactura(x)} · {x.intentos} intento{x.intentos === 1 ? "" : "s"} · deuda muerta
                          </div>
                        ))}
                      {!verMuertos && f.monto_muerto > 0 && (
                        <div className="text-[10px] text-slate-400">+ {money2(f.monto_muerto)} de suscripciones anteriores canceladas (deuda muerta)</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {f.estado ? (
                        <>
                          cuenta <b>{f.estado}</b>
                          {f.stripe_status && <> · Stripe {f.stripe_status}</>}
                          <div className="text-slate-500">renueva {fmtFecha(f.fecha_renovacion)}</div>
                        </>
                      ) : (
                        "—"
                      )}
                      {f.id_usuario && (
                        <div className={`text-[10px] font-semibold mt-0.5 ${f.cohorte ? "text-rose-700" : "text-slate-400"}`}>
                          {f.cohorte ? `En el embudo: ${f.cohorte_label}` : "No está en el embudo"}
                        </div>
                      )}
                      {f.sub_muerta && <div className="text-[10px] text-rose-700 font-semibold">Solo deuda muerta: nadie la pagará sola</div>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {f.id_usuario && (
                        <button
                          onClick={() => onAbrirCliente?.(f.id_usuario)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-cyan-600 text-white hover:bg-cyan-700"
                        >
                          <i className="bx bx-receipt" /> Registrar pago
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="text-sm font-bold text-slate-800">Registrar un pago recibido por transferencia o efectivo</div>
        <p className="text-xs text-slate-500 mt-1">
          Busca al cliente y abre su ficha: ahí está el botón <b>«Registrar pago fuera de Stripe»</b>. El registro guarda el comprobante,
          salda la factura abierta en Stripe (para que no siga reintentando la tarjeta) y deja la cuenta al día. El mes siguiente Stripe
          vuelve a cobrar la tarjeta por el camino normal.
        </p>
        <div className="relative mt-3 max-w-xl">
          <i className="bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Correo, empresa o WhatsApp del cliente…"
            className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 outline-none focus:border-cyan-400"
          />
          {buscando && <i className="bx bx-loader-alt bx-spin absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />}
        </div>
        {busqueda.trim().length >= 3 && !buscando && (
          <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 max-w-xl overflow-hidden">
            {clientes.length === 0 && <li className="px-3 py-3 text-xs text-slate-500">Ningún cliente coincide.</li>}
            {clientes.slice(0, 8).map((c) => (
              <li key={c.id_usuario}>
                <button
                  onClick={() => onAbrirCliente?.(c.id_usuario)}
                  className="w-full text-left px-3 py-2.5 hover:bg-cyan-50/60 flex items-center gap-3"
                >
                  <span className="h-8 w-8 rounded-full bg-slate-800 text-white text-[11px] font-bold grid place-items-center shrink-0">
                    {inicialesDe(c.empresa || c.email)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-800 truncate">{c.empresa || c.email}</span>
                    <span className="block text-[11px] text-slate-500 truncate">
                      {c.email} · {c.nombre_plan || "sin plan"} · cuenta {c.estado}
                      {c.stripe_status && <> · Stripe {c.stripe_status}</>} · renueva {fmtFecha(c.fecha_renovacion)}
                    </span>
                  </span>
                  <i className="bx bx-chevron-right text-slate-400" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Pagos registrados", v: totales.n, hint: `${money2(totales.total)} en total` },
          { label: "Este mes", v: money2(totales.mes), hint: "Recibido fuera de Stripe" },
          { label: "Stripe falló", v: totales.errores, hint: "Facturas por saldar a mano", rojo: totales.errores > 0 },
          { label: "Sin comprobante", v: totales.sinComprobante, hint: "Pagos sin archivo adjunto", rojo: totales.sinComprobante > 0 },
        ].map((k) => (
          <div key={k.label} className="rounded-xl bg-white border border-slate-200 p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{k.label}</div>
            <div className={`text-xl font-extrabold tabular-nums mt-0.5 ${k.rojo ? "text-rose-600" : "text-slate-900"}`}>{k.v}</div>
            <div className="text-[11px] text-slate-500">{k.hint}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="text-sm font-bold text-slate-800">Últimos pagos fuera de Stripe</div>
          <button onClick={cargar} className="text-xs font-semibold text-cyan-700 hover:underline">
            <i className="bx bx-refresh" /> Actualizar
          </button>
        </div>
        {pagos === null ? (
          <div className="py-10 text-center text-slate-400">
            <i className="bx bx-loader-alt bx-spin text-2xl" />
          </div>
        ) : pagos.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">Todavía no se registró ningún pago fuera de Stripe.</div>
        ) : (
          <div className="overflow-auto max-h-[36rem]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold">Cliente</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Pago</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Monto</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Stripe</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Registró</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Comprobante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagos.map((p) => {
                  const a = ACCION[p.stripe_accion] || ACCION.sin_factura;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 align-top">
                      <td className="px-4 py-3">
                        <button onClick={() => onAbrirCliente?.(p.id_usuario)} className="font-semibold text-slate-900 hover:text-cyan-700 text-left">
                          {p.empresa || p.email}
                        </button>
                        <div className="text-[11px] text-slate-500">
                          {p.email} · {p.nombre_plan || "sin plan"} · cuenta {p.estado}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                        {METODO[p.metodo] || p.metodo} · {fmtFecha(p.fecha_pago || p.created_at)}
                        {p.referencia && <div className="text-slate-500">Ref. {p.referencia}</div>}
                        {p.nota && <div className="text-slate-500 italic max-w-[16rem] whitespace-normal">{p.nota}</div>}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800 tabular-nums whitespace-nowrap">{money2(p.monto)}</td>
                      <td className="px-4 py-3 text-xs">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ring-1 ${a.cls}`}>{a.label}</span>
                        {p.stripe_invoice_id && <div className="text-[10px] text-slate-400 mt-1 break-all">{p.stripe_invoice_id}</div>}
                        {p.acceso_hasta && <div className="text-[11px] text-slate-600 mt-1">Acceso hasta {fmtFecha(p.acceso_hasta)}</div>}
                        {p.stripe_detalle && <div className="text-[10px] text-slate-500 mt-1 max-w-[16rem]">{p.stripe_detalle}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                        {p.registrado_por_nombre || "—"}
                        <div className="text-slate-400">{fmtFechaHora(p.created_at)}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p.comprobante_url ? (
                          <a
                            href={p.comprobante_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-cyan-200 text-cyan-700 hover:bg-cyan-50"
                          >
                            <i className="bx bx-receipt" /> Ver
                          </a>
                        ) : (
                          <span className="text-[11px] text-orange-600 font-semibold">Sin comprobante</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
