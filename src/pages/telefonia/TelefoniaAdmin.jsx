import { Fragment, useCallback, useEffect, useState } from "react";
import chatApi from "../../api/chatcenter";
import { ResumenIACelda, DetalleIA } from "../../components/telefonia/ResumenLlamadaIA";

/**
 * /telefonia — Telefonía por saldo con Zadarma. Solo super administrador y
 * es GLOBAL (todas las cuentas, todas las conexiones).
 *
 * Qué hay:
 *   - Cabecera: saldo en Zadarma, lo vendido a clientes y lo que esos minutos
 *     costarían (cobertura), llamadas y análisis con IA.
 *   - Conexiones con saldo (lo principal): buscar una conexión y darle saldo
 *     en un modal (precio por minuto con el costo real al lado, candado si
 *     Zadarma no cubre), recargar, apagar, ver el historial con grabación y
 *     resumen de IA.
 *   - Configuración de Imporfactory, a un lado: cuenta de Zadarma, avisos
 *     (webhook) y central, como lista de estados.
 *
 * Decisiones (2026-10-02): el número de salida ya no se configura aquí
 * (Zadarma solo respalda los números comprados; el CallerID se deja en el SIP
 * de la central), y el análisis con IA usa la llave de OpenAI de cada
 * conexión (/asistentes), no una llave maestra.
 */
const fmtUSD = (c) => `$${(Number(c || 0) / 100).toFixed(2)}`;
const tel = (t) => (t ? `+${String(t).replace(/^\+/, "")}` : "—");
const fmtFecha = (v) => {
  if (!v) return "—";
  const d = new Date(String(v).includes("T") ? v : `${String(v).replace(" ", "T")}-05:00`);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString("es-EC", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};
const fmtSeg = (s) => {
  const n = Number(s) || 0;
  return n < 60 ? `${n} s` : `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")} min`;
};
const ESTADOS = {
  answered: ["contestada", "text-emerald-700"],
  no_answer: ["no contestaron", "text-amber-700"],
  busy: ["ocupado", "text-amber-700"],
  cancel: ["colgó antes", "text-slate-500"],
  failed: ["falló", "text-rose-700"],
  ringing: ["timbrando", "text-sky-700"],
  pedida: ["marcando", "text-sky-700"],
};

const input =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const btn =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50";
const btnPrimario = `${btn} bg-indigo-600 text-white hover:bg-indigo-700`;
const btnSuave = `${btn} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`;

function Aviso({ tipo = "info", children }) {
  const cls =
    tipo === "ok"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : tipo === "error"
        ? "bg-rose-50 text-rose-700 border-rose-200"
        : "bg-sky-50 text-sky-800 border-sky-200";
  return <div className={`mt-3 rounded-lg border px-3 py-2 text-sm ${cls}`}>{children}</div>;
}

function Modal({ titulo, subtitulo, onClose, ancho = "max-w-lg", children }) {
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className={`flex max-h-[90vh] w-full ${ancho} flex-col rounded-2xl bg-white shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">{titulo}</h3>
            {subtitulo ? <p className="mt-0.5 text-xs text-slate-500">{subtitulo}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Cerrar">
            <i className="bx bx-x text-2xl" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── Historial de llamadas de una conexión ───────────────────────────── */
function HistorialModal({ cuenta, onClose }) {
  const [page, setPage] = useState(1);
  const [datos, setDatos] = useState({ data: [], total: 0, limit: 20 });
  const [cargando, setCargando] = useState(false);
  const [escuchando, setEscuchando] = useState(null);
  const [detalle, setDetalle] = useState(null);
  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setEscuchando(null);
    chatApi
      .get("/telefonia/admin/historial", { params: { id_configuracion: cuenta.id_configuracion, page, limit: 20 } })
      .then(({ data }) => vigente && setDatos({ data: data?.data || [], total: data?.total || 0, limit: data?.limit || 20 }))
      .catch(() => vigente && setDatos({ data: [], total: 0, limit: 20 }))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [cuenta.id_configuracion, page]);
  const paginas = Math.max(1, Math.ceil(datos.total / datos.limit));
  return (
    <Modal
      titulo={`Llamadas de #${cuenta.id_configuracion} ${cuenta.nombre_configuracion || ""}`}
      subtitulo={`${datos.total} llamada${datos.total === 1 ? "" : "s"} · saldo ${fmtUSD(cuenta.saldo_centavos)} · "Salió con" es el número que Zadarma reporta haber enviado en cada llamada`}
      onClose={onClose}
      ancho="max-w-6xl"
    >
      <div className="overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Asesor</th>
              <th className="px-4 py-2">Cliente</th>
              <th className="px-4 py-2">Salió con</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Duración</th>
              <th className="px-4 py-2">Costo</th>
              <th className="px-4 py-2">Grabación</th>
              <th className="px-4 py-2">Resumen IA</th>
            </tr>
          </thead>
          <tbody>
            {cargando && datos.data.length === 0 ? (
              <tr><td colSpan="9" className="px-4 py-8 text-center text-slate-400">Cargando…</td></tr>
            ) : datos.data.length === 0 ? (
              <tr><td colSpan="9" className="px-4 py-8 text-center text-slate-400">Esta conexión todavía no ha hecho llamadas.</td></tr>
            ) : (
              datos.data.map((l) => {
                const [txt, cls] = ESTADOS[l.estado] || [l.estado, "text-slate-600"];
                return (
                  <Fragment key={l.id}>
                    <tr className="border-t border-slate-100 align-top">
                      <td className="whitespace-nowrap px-4 py-2 text-xs">{fmtFecha(l.inicio_at)}</td>
                      <td className="px-4 py-2 text-xs">
                        {l.asesor || `Asesor ${l.id_sub_usuario}`} <span className="text-slate-400">ext {l.extension}</span>
                      </td>
                      <td className="px-4 py-2 text-xs">
                        <div className="font-medium text-slate-800">{l.cliente || "—"}</div>
                        <div className="text-slate-500">{tel(l.telefono_cliente)}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-xs font-semibold">
                        {l.caller_id ? tel(l.caller_id) : <span className="font-normal text-slate-400">sin dato</span>}
                      </td>
                      <td className={`whitespace-nowrap px-4 py-2 text-xs font-semibold ${cls}`}>{txt}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-xs">{l.estado === "answered" ? fmtSeg(l.duracion_seg) : "—"}</td>
                      <td className="px-4 py-2 text-xs">{l.costo_centavos ? fmtUSD(l.costo_centavos) : "—"}</td>
                      <td className="px-4 py-2 text-xs">
                        {l.grabacion_url ? (
                          escuchando === l.id ? (
                            <div className="flex items-center gap-2">
                              <audio controls autoPlay src={l.grabacion_url} className="h-8 w-52" />
                              <a href={l.grabacion_url} download className="text-slate-500 hover:underline" title="Guardar el archivo en tu PC">descargar</a>
                            </div>
                          ) : (
                            <button type="button" onClick={() => setEscuchando(l.id)} className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline">
                              <i className="bx bx-play-circle" /> escuchar
                            </button>
                          )
                        ) : Number(l.grabada) === 1 ? (
                          <span className="text-slate-400">procesando</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="max-w-xs px-4 py-2">
                        <ResumenIACelda l={l} abierto={detalle === l.id} onToggle={() => setDetalle((d) => (d === l.id ? null : l.id))} />
                      </td>
                    </tr>
                    {detalle === l.id && l.ia_estado === "listo" ? (
                      <tr className="bg-slate-50">
                        <td colSpan="9" className="px-4 py-3"><DetalleIA l={l} /></td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-sm">
        <span className="text-slate-500">Página {page} de {paginas}</span>
        <div className="flex gap-2">
          <button type="button" disabled={page <= 1 || cargando} onClick={() => setPage((p) => p - 1)} className={btnSuave}>
            <i className="bx bx-chevron-left" /> Anterior
          </button>
          <button type="button" disabled={page >= paginas || cargando} onClick={() => setPage((p) => p + 1)} className={btnSuave}>
            Siguiente <i className="bx bx-chevron-right" />
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Dar saldo / precio a una conexión ───────────────────────────────── */
function SaldoModal({ conexion, cuenta, resumen, onClose, onDone }) {
  const [tarifa, setTarifa] = useState(cuenta ? (cuenta.tarifa_centavos_min / 100).toFixed(2) : "0.40");
  const [dolares, setDolares] = useState("10");
  const [costo, setCosto] = useState(null);
  const [msg, setMsg] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => {
    let vigente = true;
    chatApi
      .get("/telefonia/costo", { params: { id_configuracion: conexion.id } })
      .then(({ data }) => vigente && setCosto(data?.data || null))
      .catch(() => vigente && setCosto(null));
    return () => {
      vigente = false;
    };
  }, [conexion.id]);

  const tarifaC = Math.round(Number(tarifa || 0) * 100);
  const costoC = costo?.centavos_min || 0;
  const recargaC = Math.round(Number(dolares || 0) * 100);
  const minutos = tarifaC > 0 ? Math.floor(recargaC / tarifaC) : 0;
  const costoNuevo = costoC && tarifaC > 0 ? (recargaC / tarifaC) * costoC : 0;
  const disponible = resumen?.saldo_zadarma_centavos != null ? resumen.saldo_zadarma_centavos - (resumen.costo_pendiente_centavos || 0) : null;
  const excede = disponible != null && costoNuevo > disponible;
  const maxRecarga = disponible != null && costoC && tarifaC > 0 ? Math.max(0, Math.floor((disponible / costoC) * tarifaC)) : null;

  const guardarPrecio = async () => {
    setOcupado(true);
    setMsg(null);
    try {
      await chatApi.post("/telefonia/cuenta", { id_configuracion: conexion.id, tarifa_centavos_min: tarifaC, activo: true });
      setMsg({ tipo: "ok", texto: `Precio guardado: ${fmtUSD(tarifaC)} por minuto.` });
      onDone();
    } catch (err) {
      setMsg({ tipo: "error", texto: err?.response?.data?.message || "No se pudo guardar" });
    } finally {
      setOcupado(false);
    }
  };
  const cargar = async () => {
    setOcupado(true);
    setMsg(null);
    try {
      // El precio se guarda junto con la recarga, para no exigir dos clics.
      await chatApi.post("/telefonia/cuenta", { id_configuracion: conexion.id, tarifa_centavos_min: tarifaC, activo: true });
      const { data } = await chatApi.post("/telefonia/recargar", { id_configuracion: conexion.id, centavos: recargaC, detalle: "Recarga desde /telefonia" });
      setMsg({ tipo: "ok", texto: `Saldo cargado. La conexión ahora tiene ${fmtUSD(data?.data?.saldo_centavos)} (${Math.floor((data?.data?.saldo_centavos || 0) / tarifaC)} min).` });
      onDone();
    } catch (err) {
      setMsg({ tipo: "error", texto: err?.response?.data?.message || "No se pudo recargar" });
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Modal
      titulo={`#${conexion.id} ${conexion.nombre_configuracion || ""}`}
      subtitulo={`${tel(conexion.telefono)}${cuenta ? ` · saldo actual ${fmtUSD(cuenta.saldo_centavos)}` : " · todavía sin telefonía"}`}
      onClose={onClose}
    >
      <div className="space-y-4 px-5 py-4">
        <div>
          <label htmlFor="tel-tarifa" className="block text-xs font-semibold text-slate-600">Precio por minuto que le cobras (USD)</label>
          <div className="mt-1 flex gap-2">
            <input id="tel-tarifa" className={input} value={tarifa} onChange={(e) => setTarifa(e.target.value)} inputMode="decimal" />
            {costoC ? (
              <button type="button" onClick={() => setTarifa((costoC / 100).toFixed(2))} className={`${btnSuave} whitespace-nowrap`} title="Para conexiones propias de Imporfactory: se cobra lo mismo que cuesta en Zadarma">
                Al costo
              </button>
            ) : null}
          </div>
          <div className={`mt-2 rounded-lg px-3 py-2 text-xs ${!costoC ? "bg-slate-50 text-slate-500" : tarifaC < costoC ? "bg-rose-50 text-rose-800" : tarifaC === costoC ? "bg-sky-50 text-sky-800" : "bg-emerald-50 text-emerald-800"}`}>
            {!costoC ? (
              "Consultando el costo real en Zadarma…"
            ) : (
              <>
                Zadarma cobra <b>{fmtUSD(costoC)}/min</b> ({costo.descripcion}).{" "}
                {tarifaC < costoC
                  ? `Pierdes ${fmtUSD(costoC - tarifaC)} por minuto.`
                  : tarifaC === costoC
                    ? "Al costo: ni ganas ni pierdes."
                    : `Ganas ${fmtUSD(tarifaC - costoC)} por minuto (margen ${Math.round(((tarifaC - costoC) / tarifaC) * 100)}%).`}
              </>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="tel-monto" className="block text-xs font-semibold text-slate-600">Saldo a cargar (USD)</label>
          <input id="tel-monto" className={`${input} mt-1`} value={dolares} onChange={(e) => setDolares(e.target.value)} inputMode="decimal" />
          <div className="mt-1 text-xs text-slate-500">
            Son unos <b>{minutos} minutos</b> a {fmtUSD(tarifaC)}. Le costarían {fmtUSD(costoNuevo)} a Imporfactory en Zadarma
            {disponible != null ? <>, donde quedan {fmtUSD(Math.max(0, disponible))} sin comprometer</> : null}.
          </div>
          {excede ? (
            <div className="mt-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              <b>No se puede cargar:</b> Zadarma no cubre estos minutos. {maxRecarga > 0 ? `Máximo ahora: ${fmtUSD(maxRecarga)}.` : "Recarga primero en Zadarma."}
            </div>
          ) : null}
        </div>

        {msg ? <Aviso tipo={msg.tipo}>{msg.texto}</Aviso> : null}
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-3">
        <button type="button" onClick={guardarPrecio} disabled={ocupado || tarifaC <= 0} className={btnSuave}>Guardar solo el precio</button>
        <button type="button" onClick={cargar} disabled={ocupado || excede || recargaC <= 0 || tarifaC <= 0} className={btnPrimario}>
          <i className="bx bx-plus-circle" /> Cargar {fmtUSD(recargaC)}
        </button>
      </div>
    </Modal>
  );
}

/* ── Fila de estado del panel de configuración ───────────────────────── */
function Estado({ ok, titulo, detalle, children }) {
  return (
    <div className="flex gap-3 border-t border-slate-100 py-3 first:border-t-0 first:pt-0">
      <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-sm ${ok ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
        <i className={`bx ${ok ? "bx-check" : "bx-time-five"}`} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-slate-900">{titulo}</div>
        {detalle ? <div className="text-xs text-slate-500">{detalle}</div> : null}
        {children}
      </div>
    </div>
  );
}

export default function TelefoniaAdmin() {
  const [maestra, setMaestra] = useState(null);
  const [diag, setDiag] = useState(null);
  const [cuentas, setCuentas] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [ia, setIa] = useState(null);

  const cargarTodo = useCallback(async () => {
    const [m, d, c, i] = await Promise.allSettled([
      chatApi.get("/telefonia/maestra"),
      chatApi.get("/telefonia/diagnostico"),
      chatApi.get("/telefonia/cuentas"),
      chatApi.get("/telefonia/ia"),
    ]);
    setMaestra(m.status === "fulfilled" ? m.value.data?.data || { configurada: false } : { configurada: false });
    setDiag(d.status === "fulfilled" ? d.value.data?.data || null : null);
    if (c.status === "fulfilled") {
      setCuentas(c.value.data?.data || []);
      setResumen(c.value.data?.resumen || null);
    }
    setIa(i.status === "fulfilled" ? i.value.data?.data || null : null);
  }, []);
  useEffect(() => {
    cargarTodo();
  }, [cargarTodo]);

  /* buscador */
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState([]);
  useEffect(() => {
    if (!q.trim()) {
      setResultados([]);
      return undefined;
    }
    const t = setTimeout(async () => {
      try {
        const { data } = await chatApi.get("/telefonia/conexiones", { params: { q } });
        setResultados(data?.data || []);
      } catch {
        setResultados([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  /* modales */
  const [saldoDe, setSaldoDe] = useState(null); // { conexion, cuenta }
  const [hist, setHist] = useState(null);
  const abrirSaldo = (conexion) => {
    const cuenta = cuentas.find((x) => Number(x.id_configuracion) === Number(conexion.id)) || null;
    setSaldoDe({ conexion, cuenta });
    setQ("");
    setResultados([]);
  };
  const alternar = async (c) => {
    await chatApi.post("/telefonia/cuenta", { id_configuracion: c.id_configuracion, activo: Number(c.activo) !== 1 });
    cargarTodo();
  };

  /* configuración de Imporfactory */
  const [form, setForm] = useState({ user_key: "", secret: "" });
  const [editarLlaves, setEditarLlaves] = useState(false);
  const [msgCfg, setMsgCfg] = useState(null);
  const [ocupadoCfg, setOcupadoCfg] = useState(false);
  const guardarLlaves = async (e) => {
    e.preventDefault();
    setOcupadoCfg(true);
    setMsgCfg(null);
    try {
      const { data } = await chatApi.post("/telefonia/maestra", form);
      const b = data?.data?.balance;
      setMsgCfg({ tipo: "ok", texto: `Cuenta vinculada. Saldo en Zadarma: ${b?.balance} ${b?.currency || ""}` });
      setForm({ user_key: "", secret: "" });
      setEditarLlaves(false);
      cargarTodo();
    } catch (err) {
      setMsgCfg({ tipo: "error", texto: err?.response?.data?.message || "Zadarma no aceptó las llaves" });
    } finally {
      setOcupadoCfg(false);
    }
  };
  const instalar = async () => {
    setOcupadoCfg(true);
    setMsgCfg(null);
    try {
      const { data } = await chatApi.post("/telefonia/instalar", { url: "https://chat.imporfactory.app/api/v1/telefonia/webhook" });
      const g = data?.data?.grabacion || {};
      const enc = (g.encendidas || []).join(", ");
      const err = (g.errores || []).join(" · ");
      setMsgCfg({ tipo: err && !enc ? "error" : "ok", texto: `Avisos instalados. Grabación encendida en: ${enc || "ninguna"}${err ? `. Fallaron: ${err}` : ""}.` });
      cargarTodo();
    } catch (err) {
      setMsgCfg({ tipo: "error", texto: err?.response?.data?.message || "No se pudo instalar" });
    } finally {
      setOcupadoCfg(false);
    }
  };
  const reanalizar = async () => {
    const { data } = await chatApi.post("/telefonia/ia/reanalizar", {});
    setMsgCfg({ tipo: "ok", texto: `IA: reintentadas ${data?.data?.intentadas || 0}, listas ${data?.data?.listas || 0}.` });
    cargarTodo();
  };

  const vinculada = !!maestra?.configurada;
  const instalada = !!maestra?.webhook_url;
  const totalLlamadas = cuentas.reduce((a, c) => a + Number(c.llamadas || 0), 0);
  const pendientesIA = (ia?.sin_llave || 0) + (ia?.con_error || 0);

  return (
    <div className="w-full space-y-4 px-4 py-5 sm:px-6">
      {/* Cabecera */}
      <header className="rounded-2xl bg-[#0B1426] px-5 py-4 text-white sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-cyan-300">ImporChat · Telefonía por saldo</div>
            <h1 className="mt-0.5 text-xl font-extrabold">Llamadas al celular desde el chat</h1>
            <p className="mt-1 max-w-2xl text-xs text-slate-300">
              Imporfactory compra los minutos en Zadarma y los vende a cada conexión como saldo. Cada llamada queda grabada y la IA la resume con la llave de OpenAI de esa conexión.
            </p>
          </div>
          <div className={`rounded-lg px-3 py-1.5 text-xs font-bold ${vinculada && instalada ? "bg-emerald-500/20 text-emerald-200" : "bg-amber-500/20 text-amber-200"}`}>
            {vinculada && instalada ? "Servicio operativo" : "Falta configurar"}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-lg bg-white/10 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Saldo en Zadarma</div>
            <div className="text-lg font-extrabold">{resumen?.saldo_zadarma_centavos != null ? fmtUSD(resumen.saldo_zadarma_centavos) : "—"}</div>
            <div className="text-[11px] text-slate-400">{diag?.plan?.nombre ? `plan ${diag.plan.nombre}${diag.plan.activo ? "" : " (inactivo)"}` : ""}</div>
          </div>
          <div className="rounded-lg bg-white/10 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Vendido a conexiones</div>
            <div className="text-lg font-extrabold">{resumen ? fmtUSD(resumen.asignado_centavos) : "—"}</div>
            <div className="text-[11px] text-slate-400">{resumen ? `${resumen.minutos_vendidos} min · ${cuentas.length} conexiones` : ""}</div>
          </div>
          <div className={`rounded-lg px-3 py-2 ${resumen?.cubierto === false ? "bg-rose-500/30" : "bg-white/10"}`}>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Costo de esos minutos</div>
            <div className="text-lg font-extrabold">{resumen?.costo_pendiente_centavos != null ? fmtUSD(resumen.costo_pendiente_centavos) : "—"}</div>
            <div className="text-[11px] text-slate-400">{resumen?.cubierto === false ? "Zadarma no lo cubre: recarga" : resumen?.cubierto ? "cubierto por el saldo" : ""}</div>
          </div>
          <div className="rounded-lg bg-white/10 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Llamadas · análisis IA</div>
            <div className="text-lg font-extrabold">{totalLlamadas} · {ia?.listas ?? "—"}</div>
            <div className="text-[11px] text-slate-400">{ia ? `${fmtUSD(ia.costo_centavos)} en OpenAI${pendientesIA ? ` · ${pendientesIA} sin analizar` : ""}` : ""}</div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        {/* Conexiones */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Conexiones con telefonía</h2>
              <p className="text-xs text-slate-500">Busca una conexión para darle saldo. En el chat de esa conexión aparece el botón Llamar.</p>
            </div>
            <div className="relative w-full sm:w-80">
              <input id="tel-buscar" className={input} placeholder="Buscar por id, nombre o teléfono…" value={q} onChange={(e) => setQ(e.target.value)} />
              {resultados.length ? (
                <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                  {resultados.map((c) => (
                    <li key={c.id}>
                      <button type="button" onClick={() => abrirSaldo(c)} className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50">
                        <b>#{c.id}</b> {c.nombre_configuracion} <span className="text-slate-400">{tel(c.telefono)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 pr-3">Conexión</th>
                  <th className="py-2 pr-3">Saldo</th>
                  <th className="py-2 pr-3">Precio/min</th>
                  <th className="py-2 pr-3">Llamadas</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2 pr-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cuentas.length === 0 ? (
                  <tr><td colSpan="6" className="py-8 text-center text-slate-400">Ninguna conexión tiene saldo todavía. Usa el buscador.</td></tr>
                ) : (
                  cuentas.map((c) => (
                    <tr key={c.id_configuracion} className="border-t border-slate-100">
                      <td className="py-2.5 pr-3">
                        <div className="font-bold text-slate-900">#{c.id_configuracion} {c.nombre_configuracion || ""}</div>
                        <div className="text-xs text-slate-400">{tel(c.telefono)}</div>
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="font-bold">{fmtUSD(c.saldo_centavos)}</div>
                        <div className="text-xs text-slate-400">{Math.floor(c.saldo_centavos / c.tarifa_centavos_min)} min</div>
                      </td>
                      <td className="py-2.5 pr-3">
                        <div>{fmtUSD(c.tarifa_centavos_min)}</div>
                        <div className="text-xs">
                          {c.margen_pct == null ? <span className="text-slate-400">—</span> : c.margen_pct < 0 ? <span className="font-semibold text-rose-700">pierdes {fmtUSD(c.costo_centavos_min - c.tarifa_centavos_min)}/min</span> : c.margen_pct === 0 ? <span className="font-semibold text-sky-700">al costo</span> : <span className={c.margen_pct < 20 ? "font-semibold text-amber-700" : "font-semibold text-emerald-700"}>margen {c.margen_pct}%</span>}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3">
                        <button type="button" onClick={() => setHist(c)} className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">
                          <i className="bx bx-history" /> {c.llamadas} · ver
                        </button>
                      </td>
                      <td className="py-2.5 pr-3">
                        {Number(c.activo) === 1 ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">activa</span> : <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600">apagada</span>}
                      </td>
                      <td className="py-2.5 pr-3 text-right">
                        <div className="inline-flex gap-1">
                          <button type="button" onClick={() => abrirSaldo({ id: c.id_configuracion, nombre_configuracion: c.nombre_configuracion, telefono: c.telefono })} className={`${btnSuave} px-2 py-1 text-xs`}>
                            <i className="bx bx-plus-circle" /> Saldo
                          </button>
                          <button type="button" onClick={() => alternar(c)} className={`${btnSuave} px-2 py-1 text-xs`} title={Number(c.activo) === 1 ? "Quita el botón Llamar del chat de esta conexión" : "Vuelve a mostrar el botón Llamar"}>
                            {Number(c.activo) === 1 ? "Apagar" : "Encender"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Configuración de Imporfactory */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-extrabold text-slate-900">Configuración de Imporfactory</h2>
          <p className="mb-3 text-xs text-slate-500">Se hace una sola vez. Vale para todas las conexiones.</p>

          <Estado ok={vinculada} titulo="Cuenta de Zadarma" detalle={vinculada ? `Llave ${maestra.user_key}${maestra.secret_last4 ? ` · secreta ····${maestra.secret_last4}` : ""}` : "Pega las llaves de Integraciones y API → Llaves de API."}>
            {vinculada && !editarLlaves ? (
              <button type="button" onClick={() => setEditarLlaves(true)} className="mt-1 text-xs font-semibold text-indigo-600 hover:underline">Cambiar llaves</button>
            ) : (
              <form onSubmit={guardarLlaves} className="mt-2 space-y-2">
                <input id="tel-user-key" className={input} placeholder="Llave de usuario (user key)" value={form.user_key} onChange={(e) => setForm((f) => ({ ...f, user_key: e.target.value }))} autoComplete="off" />
                <input id="tel-secret" className={input} type="password" placeholder="Llave secreta" value={form.secret} onChange={(e) => setForm((f) => ({ ...f, secret: e.target.value }))} autoComplete="off" />
                <div className="flex gap-2">
                  <button type="submit" disabled={ocupadoCfg || !form.user_key || !form.secret} className={`${btnPrimario} px-3 py-1.5 text-xs`}>Vincular</button>
                  {vinculada ? <button type="button" onClick={() => setEditarLlaves(false)} className={`${btnSuave} px-3 py-1.5 text-xs`}>Cancelar</button> : null}
                </div>
              </form>
            )}
          </Estado>

          <Estado ok={instalada} titulo="Avisos de Zadarma y grabación" detalle={instalada ? `Instalado el ${new Date(maestra.webhook_instalado_at).toLocaleString("es-EC")}. Zadarma nos avisa cada llamada y graba en todas las extensiones.` : "Registra nuestro webhook en Zadarma y enciende la grabación."}>
            <button type="button" onClick={instalar} disabled={!vinculada || ocupadoCfg} className="mt-1 text-xs font-semibold text-indigo-600 hover:underline disabled:opacity-50">
              {instalada ? "Volver a instalar (por ejemplo tras crear una extensión)" : "Instalar"}
            </button>
          </Estado>

          <Estado ok={(diag?.central?.numbers || []).length > 0} titulo="Central y extensiones" detalle={diag?.central?.numbers?.length ? `Extensiones ${diag.central.numbers.join(", ")}. Se asignan solas a cada asesor al abrir el chat.` : "Crea extensiones en Zadarma (Mi centralita → Extensiones), una por asesor."}>
            {(diag?.extensiones_asignadas || []).length ? (
              <div className="mt-1 text-xs text-slate-500">Asignadas: {diag.extensiones_asignadas.map((e) => `${e.extension} → asesor ${e.id_sub_usuario}`).join(" · ")}</div>
            ) : null}
          </Estado>

          <Estado ok={true} titulo="Número con el que salen las llamadas" detalle="Lo decide el CallerID del SIP de la central en Zadarma (Configuración → Ajustes SIP). Déjalo en un número comprado a Zadarma: es el único que se muestra siempre igual y con soporte." />

          <Estado ok={!pendientesIA} titulo="Análisis con IA" detalle={ia ? `${ia.listas} llamadas analizadas · ${fmtUSD(ia.costo_centavos)} en OpenAI. Usa la llave de OpenAI de cada conexión (/asistentes).` : "—"}>
            {pendientesIA ? (
              <button type="button" onClick={reanalizar} className="mt-1 text-xs font-semibold text-indigo-600 hover:underline">
                Reintentar {pendientesIA} sin analizar ({ia.sin_llave} sin llave, {ia.con_error} con error)
              </button>
            ) : null}
          </Estado>

          {msgCfg ? <Aviso tipo={msgCfg.tipo}>{msgCfg.texto}</Aviso> : null}
        </section>
      </div>

      {saldoDe ? <SaldoModal conexion={saldoDe.conexion} cuenta={saldoDe.cuenta} resumen={resumen} onClose={() => setSaldoDe(null)} onDone={cargarTodo} /> : null}
      {hist ? <HistorialModal cuenta={hist} onClose={() => setHist(null)} /> : null}
    </div>
  );
}
