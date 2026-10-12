import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  COTIZACION_CONFIGS_HABILITADAS,
  getCotizacionesDelChat,
  pedirCotizacion,
  responderCotizacion,
  REGLAS_COTIZACION_DEFAULT,
} from "../../services/imporsuit";

/**
 * «Solicitud de cotización» en el panel derecho del chat (línea de Expertos).
 * Pedido 2026-10-12, partes 1 y 2:
 *  1. El asesor carga la solicitud AQUÍ, desplegada dentro del panel (como
 *     «Nueva orden»), sin ventana emergente, y le llega a pricing enlazada al
 *     chat: el cliente no se escribe, sale del chat.
 *  2. Debajo ve cómo va cada solicitud de este cliente (estado, cuánto lleva)
 *     y contesta ahí mismo el dato que pida pricing.
 *
 * Todo contra la API de Imporsuit (Cotizachat); el backend de ImporChat no
 * se toca. Países, tipos, tope de productos y reglas de tiempo vienen en
 * data.reglas: nada de eso está escrito fijo. El bloque solo se muestra en
 * COTIZACION_CONFIGS_HABILITADAS porque el token de Imporsuit va en el bundle.
 */

const REFRESCO_MS = 60000;

const ESTADO_UI = {
  nueva: "border-sky-400/30 bg-sky-500/15 text-sky-200",
  proceso: "border-violet-400/30 bg-violet-500/15 text-violet-200",
  falta: "border-amber-400/40 bg-amber-500/20 text-amber-100",
  respondida: "border-cyan-400/30 bg-cyan-500/15 text-cyan-200",
  lista: "border-emerald-400/30 bg-emerald-500/15 text-emerald-200",
  cerrada: "border-white/10 bg-white/5 text-white/60",
};

const inputCls =
  "w-full rounded-[7px] border border-white/[0.08] bg-white/[0.05] px-2.5 py-1.5 text-[12px] text-white placeholder:text-white/30 outline-none focus:border-violet-400/50 focus:bg-white/[0.08]";
const labelCls = "block text-[9px] font-semibold uppercase tracking-[0.18em] text-white/40 mb-1";

const productoVacio = () => ({ producto: "", precio: "", unidades_caja: "", cbm_caja: "", cantidad: "", cajas: "" });

const esEntero = (v) => /^\d+$/.test(String(v).trim());
const cbmValido = (v) => {
  const n = Number(String(v).trim().replace(",", "."));
  return Number.isFinite(n) && n > 0;
};

export default function CotizacionChatSection({ selectedChat, idConfiguracion }) {
  const habilitado = COTIZACION_CONFIGS_HABILITADAS.includes(Number(idConfiguracion));
  const chatId = selectedChat?.id || null;

  const [abierto, setAbierto] = useState(false);
  const [reglas, setReglas] = useState(REGLAS_COTIZACION_DEFAULT);
  const [pedidos, setPedidos] = useState(null); // null = aún no cargó
  const [cargando, setCargando] = useState(false);
  const [errorCarga, setErrorCarga] = useState("");

  // Formulario
  const [tipo, setTipo] = useState("grupal");
  const [pais, setPais] = useState("");
  const [productos, setProductos] = useState([productoVacio()]);
  const [nota, setNota] = useState("");
  const [errores, setErrores] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState("");
  const [errorEnvio, setErrorEnvio] = useState("");
  const enviandoRef = useRef(false);

  // Respuestas a pricing, por pedido (sobreviven a los refrescos)
  const [respuestas, setRespuestas] = useState({});
  const [respondiendo, setRespondiendo] = useState({});
  const [errorRespuesta, setErrorRespuesta] = useState({});

  const abortRef = useRef(null);

  const cargar = useCallback(
    async (silencioso = false) => {
      if (!chatId) return;
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      if (!silencioso) setCargando(true);
      try {
        const r = await getCotizacionesDelChat(chatId, { signal: ctrl.signal });
        if (ctrl.signal.aborted) return;
        setPedidos(r.pedidos);
        setReglas(r.reglas);
        setErrorCarga("");
      } catch (e) {
        if (ctrl.signal.aborted || e?.name === "CanceledError" || e?.name === "AbortError") return;
        setErrorCarga(e?.message || "No se pudieron cargar las solicitudes.");
        if (pedidos === null) setPedidos([]);
      } finally {
        if (!ctrl.signal.aborted) setCargando(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chatId],
  );

  // Al cambiar de chat: se cierra y se limpia todo lo que es de ese cliente
  useEffect(() => {
    setAbierto(false);
    setPedidos(null);
    setErrorCarga("");
    setExito("");
    setErrorEnvio("");
    setErrores([]);
    setRespuestas({});
    setErrorRespuesta({});
    return () => abortRef.current?.abort();
  }, [chatId]);

  // Con el bloque abierto: carga, refresco cada minuto y al volver a la pestaña
  useEffect(() => {
    if (!abierto || !chatId) return undefined;
    cargar();
    const t = setInterval(() => cargar(true), REFRESCO_MS);
    const onVisible = () => document.visibilityState === "visible" && cargar(true);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [abierto, chatId, cargar]);

  const paises = useMemo(() => Object.entries(reglas.paises || {}), [reglas]);
  const tipos = useMemo(() => Object.entries(reglas.tipos || REGLAS_COTIZACION_DEFAULT.tipos), [reglas]);
  const maxProductos = Number(reglas.max_productos) || 8;
  const esCajas = tipo === "cajas";

  if (!habilitado || !selectedChat) return null;

  /* ── Formulario ── */
  const setProducto = (i, campo, valor) =>
    setProductos((arr) => arr.map((p, j) => (j === i ? { ...p, [campo]: valor } : p)));
  const agregarProducto = () => productos.length < maxProductos && setProductos((arr) => [...arr, productoVacio()]);
  const quitarProducto = (i) => setProductos((arr) => (arr.length > 1 ? arr.filter((_, j) => j !== i) : arr));

  const validar = () => {
    const errs = [];
    if (!pais) errs.push("Falta el país al que va la carga.");
    productos.forEach((p, i) => {
      const n = `Producto ${i + 1}`;
      if (!p.producto.trim()) errs.push(`${n}: falta el nombre${esCajas ? " o código" : ""}.`);
      if (esCajas) {
        if (!esEntero(p.cajas) || Number(p.cajas) < 1) errs.push(`${n}: cuántas cajas debe ser un número entero, mínimo 1.`);
      } else {
        if (!p.precio.trim()) errs.push(`${n}: falta el precio del proveedor.`);
        if (!esEntero(p.unidades_caja) || Number(p.unidades_caja) < 1) errs.push(`${n}: las unidades por caja deben ser un número entero.`);
        if (!cbmValido(p.cbm_caja)) errs.push(`${n}: el CBM de la caja debe ser mayor a cero.`);
      }
    });
    return errs;
  };

  const enviar = async () => {
    if (enviandoRef.current) return; // dos toques seguidos = una sola solicitud
    setExito("");
    setErrorEnvio("");
    const errs = validar();
    setErrores(errs);
    if (errs.length) return;
    enviandoRef.current = true;
    setEnviando(true);
    try {
      const body = esCajas
        ? productos.map((p) => ({ producto: p.producto.trim(), cajas: Number(p.cajas) }))
        : productos.map((p) => ({
            producto: p.producto.trim(),
            precio: p.precio.trim(),
            unidades_caja: Number(p.unidades_caja),
            cbm_caja: p.cbm_caja.trim(),
            ...(p.cantidad.trim() ? { cantidad: p.cantidad.trim() } : {}),
          }));
      const r = await pedirCotizacion({ chatId, pais, tipo, productos: body, nota });
      const meta = r?.data?.reglas?.meta || reglas.meta || "30 min";
      if (r?.data?.reglas) setReglas((prev) => ({ ...prev, ...r.data.reglas }));
      setExito(`Solicitud enviada a pricing. Tiene ${meta} para responder.`);
      setProductos([productoVacio()]);
      setNota("");
      setPais("");
      setTipo("grupal");
      cargar(true);
    } catch (e) {
      setErrorEnvio(e?.message || "No se pudo enviar. Vuelve a intentar.");
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  };

  /* ── Responder a pricing ── */
  const responder = async (pedido) => {
    const texto = String(respuestas[pedido.id] || "").trim();
    if (!texto) {
      setErrorRespuesta((m) => ({ ...m, [pedido.id]: "Escribe el dato que pidió pricing" }));
      return;
    }
    setErrorRespuesta((m) => ({ ...m, [pedido.id]: "" }));
    setRespondiendo((m) => ({ ...m, [pedido.id]: true }));
    try {
      const r = await responderCotizacion({ chatId, id: pedido.id, respuesta: texto });
      if (r.pedidos) setPedidos(r.pedidos);
      else cargar(true);
      if (r.reglas) setReglas(r.reglas);
      setRespuestas((m) => ({ ...m, [pedido.id]: "" }));
    } catch (e) {
      setErrorRespuesta((m) => ({ ...m, [pedido.id]: e?.message || "No se pudo enviar. Vuelve a intentar." }));
    } finally {
      setRespondiendo((m) => ({ ...m, [pedido.id]: false }));
    }
  };

  const abiertas = (pedidos || []).filter((p) => p.manos && p.manos !== "nadie").length;

  return (
    <div className="mx-1 mb-3 mt-1 rounded-xl border border-white/[0.06] bg-white/[0.04]">
      {/* Barra: igual a las otras secciones de Imporsuit, pero despliega en el panel */}
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-white/[0.04] rounded-xl"
      >
        <span className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-amber-400/20 bg-amber-500/10">
            <i className="bx bx-calculator text-[16px] text-amber-300" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-[8px] font-semibold uppercase tracking-[0.22em] text-white/35">Imporsuit · pricing</span>
            <span className="text-[12px] font-bold uppercase tracking-wide text-white">Solicitud de cotización</span>
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          {abiertas > 0 && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-200" title="Solicitudes abiertas">
              {abiertas}
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-lg border border-amber-400/25 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-200">
            {abierto ? "Cerrar" : "Abrir"} <i className={`bx ${abierto ? "bx-chevron-up" : "bx-chevron-down"} text-[14px]`} />
          </span>
        </span>
      </button>

      {abierto && (
        <div className="border-t border-white/[0.06] px-3 pb-3 pt-3 space-y-4">
          {/* ── Formulario ── */}
          <div className="space-y-3">
            <div>
              <span className={labelCls}>Qué cotización es</span>
              <div className="flex gap-1.5">
                {tipos.map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setTipo(k)}
                    className={`flex-1 rounded-[7px] border px-2 py-1.5 text-[11px] font-semibold transition ${
                      tipo === k ? "border-amber-400/50 bg-amber-500/20 text-amber-100" : "border-white/[0.08] bg-white/[0.03] text-white/60 hover:bg-white/[0.07]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className={labelCls}>A qué país va la carga</span>
              <select value={pais} onChange={(e) => setPais(e.target.value)} className={`${inputCls} ${!pais ? "text-white/40" : ""}`}>
                <option value="" className="text-slate-900">Elige el país</option>
                {paises.map(([k, label]) => (
                  <option key={k} value={k} className="text-slate-900">{label}</option>
                ))}
              </select>
            </div>

            {productos.map((p, i) => (
              <div key={i} className="rounded-[9px] border border-white/[0.07] bg-white/[0.02] p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Producto {i + 1}</span>
                  {productos.length > 1 && (
                    <button type="button" onClick={() => quitarProducto(i)} className="text-white/35 hover:text-rose-300" title="Quitar producto">
                      <i className="bx bx-trash text-[14px]" />
                    </button>
                  )}
                </div>
                <div>
                  <span className={labelCls}>{esCajas ? "Producto (nombre o código en Ideas de productos)" : "Producto"}</span>
                  <input value={p.producto} onChange={(e) => setProducto(i, "producto", e.target.value)} placeholder={esCajas ? "SETS-56 set de cocina" : "Silla plegable"} className={inputCls} />
                </div>
                {esCajas ? (
                  <div>
                    <span className={labelCls}>Cuántas cajas</span>
                    <input value={p.cajas} onChange={(e) => setProducto(i, "cajas", e.target.value)} inputMode="numeric" placeholder="3" className={inputCls} />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className={labelCls}>Precio del proveedor</span>
                        <input value={p.precio} onChange={(e) => setProducto(i, "precio", e.target.value)} placeholder="39 RMB" className={inputCls} />
                      </div>
                      <div>
                        <span className={labelCls}>Unidades por caja</span>
                        <input value={p.unidades_caja} onChange={(e) => setProducto(i, "unidades_caja", e.target.value)} inputMode="numeric" placeholder="6" className={inputCls} />
                      </div>
                      <div>
                        <span className={labelCls}>CBM de la caja</span>
                        <input value={p.cbm_caja} onChange={(e) => setProducto(i, "cbm_caja", e.target.value)} inputMode="decimal" placeholder="0,11" className={inputCls} />
                      </div>
                      <div>
                        <span className={labelCls}>Cuánto quiere (opcional)</span>
                        <input value={p.cantidad} onChange={(e) => setProducto(i, "cantidad", e.target.value)} placeholder="10 cajas" className={inputCls} />
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}

            {productos.length < maxProductos && (
              <button type="button" onClick={agregarProducto} className="w-full rounded-[7px] border border-dashed border-white/15 px-2 py-1.5 text-[11px] font-semibold text-white/60 hover:bg-white/[0.05] hover:text-white">
                <i className="bx bx-plus" /> Otro producto
              </button>
            )}

            <div>
              <span className={labelCls}>Nota para pricing (opcional)</span>
              <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} placeholder="Primera carga, cliente nuevo" className={`${inputCls} resize-y`} />
            </div>

            {errores.length > 0 && (
              <ul className="rounded-[7px] border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200 space-y-0.5">
                {errores.map((e) => <li key={e}>• {e}</li>)}
              </ul>
            )}
            {errorEnvio && (
              <div className="rounded-[7px] border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">{errorEnvio}</div>
            )}
            {exito && (
              <div className="rounded-[7px] border border-emerald-400/30 bg-emerald-500/15 px-3 py-2 text-[11px] text-emerald-100"><i className="bx bx-check-circle" /> {exito}</div>
            )}

            <button
              type="button"
              onClick={enviar}
              disabled={enviando}
              className="w-full rounded-[7px] border border-amber-400/30 bg-amber-500/20 px-3 py-2 text-[12px] font-bold text-amber-100 transition hover:bg-amber-500/30 disabled:opacity-50"
            >
              <i className={`bx ${enviando ? "bx-loader-alt bx-spin" : "bx-send"}`} /> {enviando ? "Enviando…" : "Enviar a pricing"}
            </button>
            <p className="text-[10px] text-white/35 leading-snug">
              Pricing tiene {reglas.meta} para responder, {reglas.dias}. El cliente sale de este chat: no hay que escribir sus datos.
            </p>
          </div>

          {/* ── Solicitudes de este cliente ── */}
          <div className="border-t border-white/[0.06] pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Solicitudes de este cliente</span>
              <button type="button" onClick={() => cargar()} className="text-white/40 hover:text-white" title="Actualizar">
                <i className={`bx bx-refresh text-[16px] ${cargando ? "bx-spin" : ""}`} />
              </button>
            </div>
            {reglas.cierre_hoy && (
              <div className="mb-2 rounded-[7px] border border-amber-400/30 bg-amber-500/15 px-3 py-2 text-[11px] text-amber-100">
                <i className="bx bx-time-five" /> Hoy se cierran todas: contesta hoy lo que te pida pricing.
              </div>
            )}
            {errorCarga && <div className="mb-2 text-[11px] text-rose-300">{errorCarga}</div>}
            {pedidos === null && cargando && <p className="text-[11px] text-white/40">Cargando…</p>}
            {pedidos !== null && pedidos.length === 0 && !errorCarga && (
              <p className="text-[11px] text-white/45">Este cliente no tiene solicitudes de cotización.</p>
            )}
            <div className="space-y-2">
              {(pedidos || []).map((p) => (
                <Pedido
                  key={p.id}
                  p={p}
                  reglas={reglas}
                  respuesta={respuestas[p.id] || ""}
                  setRespuesta={(v) => setRespuestas((m) => ({ ...m, [p.id]: v }))}
                  enviando={!!respondiendo[p.id]}
                  error={errorRespuesta[p.id] || ""}
                  onResponder={() => responder(p)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Pedido({ p, reglas, respuesta, setRespuesta, enviando, error, onResponder }) {
  const [detalle, setDetalle] = useState(false);
  const terminado = p.manos === "nadie" || ["lista", "cerrada"].includes(p.estado);
  const fueraDeTiempo = !!p.vencida;
  const cls = ESTADO_UI[p.estado] || ESTADO_UI.cerrada;
  return (
    <div className={`rounded-[9px] border p-2.5 ${fueraDeTiempo && !terminado ? "border-rose-400/40 bg-rose-500/10" : "border-white/[0.07] bg-white/[0.02]"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[12px] font-semibold text-white truncate" title={p.titulo}>{p.titulo}</div>
          <div className="text-[10px] text-white/40 mt-0.5">
            {p.pidio ? `Pidió ${p.pidio}` : ""}{p.lo_tiene ? ` · lo tiene ${p.lo_tiene}` : ""}{p.creado ? ` · ${p.creado}` : ""}
          </div>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${cls}`}>{p.estado_texto || p.estado}</span>
      </div>

      <div className="mt-1.5 flex items-center gap-2 text-[11px]">
        {terminado ? (
          <span className={fueraDeTiempo ? "text-rose-300 font-semibold" : "text-white/50"}>
            {fueraDeTiempo ? "Salió fuera de tiempo" : `Resuelta en ${p.lleva || "—"}`}
          </span>
        ) : fueraDeTiempo ? (
          <span className="font-bold text-rose-300"><i className="bx bx-alarm-exclamation" /> Fuera de tiempo · lleva {p.lleva}</span>
        ) : (
          <span className={p.por_vencer ? "text-amber-200 font-semibold" : "text-white/60"}>
            Lleva {p.lleva || "0 min"} de {reglas.meta}
          </span>
        )}
      </div>

      {p.detalle && (
        <button type="button" onClick={() => setDetalle((v) => !v)} className="mt-1 text-[10px] text-white/40 hover:text-white/70">
          {detalle ? "Ocultar detalle" : "Ver detalle"}
        </button>
      )}
      {detalle && <pre className="mt-1 whitespace-pre-wrap font-sans text-[10px] text-white/55 bg-white/[0.03] rounded p-2">{p.detalle}</pre>}

      {/* Falta un dato: pricing pregunta y el asesor contesta aquí */}
      {p.estado === "falta" && (
        <div className="mt-2 rounded-[7px] border border-amber-400/30 bg-amber-500/10 p-2.5 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-200">Pricing necesita un dato:</div>
          <p className="text-[12px] text-amber-50 whitespace-pre-wrap">{p.nota_pricing || "—"}</p>
          {p.respuesta && <p className="text-[10px] text-white/50">Tu última respuesta: {p.respuesta}</p>}
          {p.puede_responder && (
            <>
              <textarea
                value={respuesta}
                onChange={(e) => setRespuesta(e.target.value)}
                rows={2}
                placeholder="Escribe aquí el dato que te pidió"
                className={`${inputCls} resize-y`}
              />
              {error && <div className="text-[11px] text-rose-300">{error}</div>}
              <button
                type="button"
                onClick={onResponder}
                disabled={enviando}
                className="w-full rounded-[7px] border border-amber-400/40 bg-amber-500/25 px-3 py-1.5 text-[11px] font-bold text-amber-50 hover:bg-amber-500/35 disabled:opacity-50"
              >
                <i className={`bx ${enviando ? "bx-loader-alt bx-spin" : "bx-reply"}`} /> {enviando ? "Enviando…" : "Responder a pricing"}
              </button>
            </>
          )}
        </div>
      )}

      {p.estado === "respondida" && p.respuesta && (
        <div className="mt-2 text-[11px] text-cyan-100/80"><i className="bx bx-reply" /> Respondiste: {p.respuesta}. Pricing lo está revisando.</div>
      )}

      {p.estado === "lista" && (
        <div className="mt-2 rounded-[7px] border border-emerald-400/30 bg-emerald-500/10 p-2.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">Lista</div>
          <p className="text-[12px] text-emerald-50 whitespace-pre-wrap select-all">{p.nota_pricing || "Sin nota de pricing"}</p>
          <p className="mt-1 text-[10px] text-white/40">Este es el dato para enviarle al cliente.</p>
        </div>
      )}

      {p.estado === "cerrada" && (
        <div className="mt-2 rounded-[7px] border border-white/10 bg-white/5 p-2.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/50">Cerrada sin cotizar:</div>
          <p className="text-[12px] text-white/80 whitespace-pre-wrap">{p.nota_pricing || "Sin motivo registrado"}</p>
        </div>
      )}

      {["nueva", "proceso"].includes(p.estado) && p.nota_pricing && (
        <p className="mt-1.5 text-[11px] text-white/60 whitespace-pre-wrap">{p.nota_pricing}</p>
      )}
    </div>
  );
}
