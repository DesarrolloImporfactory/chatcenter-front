import { Fragment, useCallback, useEffect, useState } from "react";
import chatApi from "../../api/chatcenter";
import { ResumenIACelda, DetalleIA } from "../../components/telefonia/ResumenLlamadaIA";

/**
 * /telefonia — Telefonía por saldo con Zadarma (solo super administrador).
 *
 * Tres pasos, de izquierda a derecha, y abajo la tabla de conexiones con
 * saldo. Cada paso muestra si ya está hecho:
 *   1. Vincular la cuenta maestra de Zadarma (llaves; la secreta se cifra).
 *   2. Instalar: registrar nuestro webhook en Zadarma y encender grabación.
 *   3. Dar saldo a una conexión: cuánto, a qué precio por minuto y con qué
 *      número sale.
 */
const fmtUSD = (c) => `$${(Number(c || 0) / 100).toFixed(2)}`;
const tel = (t) => (t ? `+${String(t).replace(/^\+/, "")}` : "—");

const input =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const btn =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50";

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

/**
 * Historial de llamadas de una conexión, paginado. La columna "Salió con"
 * es el número que Zadarma reporta haber enviado en esa llamada (no el que
 * intentamos poner): ante una queja de "me llamaron de un número raro" es
 * el dato para comparar. Si la operadora del destino lo reemplazó por uno
 * de pasarela, eso no lo reporta nadie y aquí se verá el enviado.
 */
function HistorialModal({ cuenta, onClose }) {
  const [page, setPage] = useState(1);
  const [datos, setDatos] = useState({ data: [], total: 0, limit: 20 });
  const [cargando, setCargando] = useState(false);
  const [escuchando, setEscuchando] = useState(null); // id de la llamada con el reproductor abierto
  const [detalle, setDetalle] = useState(null); // id de la llamada con el análisis IA desplegado
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
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);
  const paginas = Math.max(1, Math.ceil(datos.total / datos.limit));
  const salieron = new Map();
  datos.data.forEach((l) => {
    if (l.caller_id) salieron.set(l.caller_id, (salieron.get(l.caller_id) || 0) + 1);
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Llamadas de #{cuenta.id_configuracion} {cuenta.nombre_configuracion || ""}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {datos.total} llamada{datos.total === 1 ? "" : "s"} · saldo {fmtUSD(cuenta.saldo_centavos)} · número configurado {tel(cuenta.caller_id)}
              {salieron.size > 0 ? (
                <>
                  {" "}· en esta página salieron con {[...salieron.entries()].map(([n, c]) => `${tel(n)} (${c})`).join(", ")}
                </>
              ) : null}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Cerrar">
            <i className="bx bx-x text-2xl" />
          </button>
        </div>
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
                    <tr className="border-t border-slate-100">
                      <td className="px-4 py-2 whitespace-nowrap">{fmtFecha(l.inicio_at)}</td>
                      <td className="px-4 py-2">{l.asesor || `Asesor ${l.id_sub_usuario}`} <span className="text-xs text-slate-400">ext {l.extension}</span></td>
                      <td className="px-4 py-2">
                        <div className="font-medium text-slate-800">{l.cliente || "—"}</div>
                        <div className="text-xs text-slate-500">{tel(l.telefono_cliente)}</div>
                      </td>
                      <td className="px-4 py-2 font-semibold">
                        {l.caller_id ? tel(l.caller_id) : <span className="font-normal text-slate-400" title="Zadarma no reportó el número enviado (llamada anterior a esta función o aún en curso)">sin dato</span>}
                      </td>
                      <td className={`px-4 py-2 font-semibold ${cls}`}>{txt}{l.disposition && !ESTADOS[l.estado] ? ` (${l.disposition})` : ""}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{l.estado === "answered" ? fmtSeg(l.duracion_seg) : "—"}</td>
                      <td className="px-4 py-2">{l.costo_centavos ? fmtUSD(l.costo_centavos) : "—"}</td>
                      <td className="px-4 py-2">
                        {l.grabacion_url ? (
                          /* Reproductor en la misma fila: el enlace de Zadarma
                             viene como descarga, así que un <a> bajaba el
                             archivo al PC. El <audio> lo reproduce en línea sin
                             guardar nada; "descargar" queda para quien lo quiera. */
                          escuchando === l.id ? (
                            <div className="flex items-center gap-2">
                              <audio controls autoPlay src={l.grabacion_url} className="h-8 w-56" />
                              <a href={l.grabacion_url} download className="text-xs text-slate-500 hover:underline" title="Guardar el archivo en tu PC">descargar</a>
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
                      <td className="px-4 py-2 max-w-xs">
                        <ResumenIACelda l={l} abierto={detalle === l.id} onToggle={() => setDetalle((d) => (d === l.id ? null : l.id))} />
                      </td>
                    </tr>
                    {detalle === l.id && l.ia_estado === "listo" ? (
                      <tr className="bg-slate-50">
                        <td colSpan="9" className="px-4 py-3">
                          <DetalleIA l={l} />
                        </td>
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
            <button type="button" disabled={page <= 1 || cargando} onClick={() => setPage((p) => p - 1)} className={`${btn} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>
              <i className="bx bx-chevron-left" /> Anterior
            </button>
            <button type="button" disabled={page >= paginas || cargando} onClick={() => setPage((p) => p + 1)} className={`${btn} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>
              Siguiente <i className="bx bx-chevron-right" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Llave de OpenAI con la que se transcriben y resumen las llamadas. Es la
 * llave de Imporfactory (el análisis va incluido en el minuto); sin ella se
 * usa la del negocio y, si tampoco hay, la llamada queda "sin analizar".
 */
function AnalisisIACard() {
  const [ia, setIa] = useState(null);
  const [key, setKey] = useState("");
  const [msg, setMsg] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [editar, setEditar] = useState(false);
  const cargar = useCallback(async () => {
    try {
      const { data } = await chatApi.get("/telefonia/ia");
      setIa(data?.data || null);
    } catch {
      setIa(null);
    }
  }, []);
  useEffect(() => {
    cargar();
  }, [cargar]);
  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setMsg(null);
    try {
      const { data } = await chatApi.post("/telefonia/ia", { api_key: key });
      setIa(data?.data || null);
      setKey("");
      setEditar(false);
      setMsg({ tipo: "ok", texto: "Llave guardada y probada contra OpenAI. Las llamadas pendientes se están analizando." });
    } catch (err) {
      setMsg({ tipo: "error", texto: err?.response?.data?.message || "No se pudo guardar" });
    } finally {
      setGuardando(false);
    }
  };
  const activar = async (activo) => {
    const { data } = await chatApi.post("/telefonia/ia/activar", { activo });
    setIa(data?.data || null);
  };
  const reanalizar = async () => {
    setMsg(null);
    try {
      const { data } = await chatApi.post("/telefonia/ia/reanalizar", {});
      setMsg({ tipo: "ok", texto: `Reintentadas ${data?.data?.intentadas || 0}, listas ${data?.data?.listas || 0}.` });
      cargar();
    } catch (err) {
      setMsg({ tipo: "error", texto: err?.response?.data?.message || "No se pudo reanalizar" });
    }
  };
  const pendientes = (ia?.analisis?.sin_llave || 0) + (ia?.analisis?.con_error || 0);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">
            <i className="bx bx-brain mr-1 text-indigo-600" /> Análisis de llamadas con IA
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Cada grabación se transcribe y se resume: qué se habló, en qué quedó, objeciones, siguiente paso y una nota
            de cómo atendió el asesor. El resumen aparece en el chat del cliente y en el dashboard de la conexión. Cuesta
            alrededor de <b>$0.004 por minuto</b> de llamada (transcripción con {ia?.modelo_transcripcion || "gpt-4o-mini-transcribe"} y resumen con{" "}
            {ia?.modelo_resumen || "gpt-5-mini"}).
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Analizadas</div>
            <div className="font-bold">{ia?.analisis?.listas ?? "—"}</div>
          </div>
          <div className={`rounded-lg px-3 py-2 ${pendientes ? "bg-amber-50" : "bg-slate-50"}`}>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Pendientes</div>
            <div className="font-bold">{ia ? pendientes : "—"}</div>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Gastado en OpenAI</div>
            <div className="font-bold">{ia ? fmtUSD(ia.analisis?.costo_centavos) : "—"}</div>
          </div>
        </div>
      </div>

      {ia?.configurada && !editar ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${ia.activo ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
            {ia.activo ? "Encendido" : "Apagado"}
          </span>
          <span className="text-slate-600">
            Llave de OpenAI <code className="font-mono">sk-····{ia.api_key_last4}</code>
            {ia.updated_at ? ` · guardada el ${new Date(ia.updated_at).toLocaleString("es-EC")}` : ""}
          </span>
          <button type="button" onClick={() => setEditar(true)} className={`${btn} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>
            Cambiar llave
          </button>
          <button type="button" onClick={() => activar(!ia.activo)} className={`${btn} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>
            {ia.activo ? "Apagar análisis" : "Encender análisis"}
          </button>
          {pendientes ? (
            <button type="button" onClick={reanalizar} className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`}>
              <i className="bx bx-refresh" /> Analizar {pendientes} pendiente{pendientes === 1 ? "" : "s"}
            </button>
          ) : null}
        </div>
      ) : (
        <form onSubmit={guardar} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1 text-xs font-semibold text-slate-600">
            Llave de OpenAI de Imporfactory
            <input id="ia-key" className={`${input} mt-1 font-mono`} value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-proj-…" autoComplete="off" />
            <span className="mt-1 block font-normal text-slate-500">
              Se guarda cifrada. Sin llave propia, se usa la llave de OpenAI de cada conexión; si tampoco hay, la llamada queda sin analizar.
            </span>
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={guardando || !key.trim()} className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`}>
              {guardando ? "Probando…" : "Guardar llave"}
            </button>
            {ia?.configurada ? (
              <button type="button" onClick={() => setEditar(false)} className={`${btn} border border-slate-300 bg-white text-slate-700`}>
                Cancelar
              </button>
            ) : null}
          </div>
        </form>
      )}
      {msg ? <Aviso tipo={msg.tipo}>{msg.texto}</Aviso> : null}
    </section>
  );
}

function Aviso({ tipo = "info", children }) {
  const cls =
    tipo === "ok"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : tipo === "error"
        ? "bg-rose-50 text-rose-700 border-rose-200"
        : "bg-sky-50 text-sky-800 border-sky-200";
  return <div className={`mt-3 rounded-lg border px-3 py-2 text-sm ${cls}`}>{children}</div>;
}

function Paso({ n, titulo, hecho, children }) {
  return (
    <section className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-extrabold ${
            hecho ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600"
          }`}
        >
          {hecho ? <i className="bx bx-check text-xl" /> : n}
        </span>
        <div>
          <h2 className="text-base font-extrabold text-slate-900">{titulo}</h2>
          <div className={`text-xs font-semibold ${hecho ? "text-emerald-600" : "text-slate-400"}`}>
            {hecho ? "Listo" : "Pendiente"}
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}

export default function TelefoniaAdmin() {
  /* ── Paso 1: cuenta maestra ── */
  const [maestra, setMaestra] = useState(null);
  const [form, setForm] = useState({ user_key: "", secret: "" });
  const [msg1, setMsg1] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [editarLlaves, setEditarLlaves] = useState(false);

  const cargarMaestra = useCallback(async () => {
    try {
      const { data } = await chatApi.get("/telefonia/maestra");
      setMaestra(data?.data || { configurada: false });
    } catch (err) {
      setMaestra({ configurada: false, error: err?.response?.data?.message || "No se pudo consultar" });
    }
  }, []);

  /* ── Paso 3 / central ── */
  const [diag, setDiag] = useState(null);
  const cargarDiagnostico = useCallback(async () => {
    try {
      const { data } = await chatApi.get("/telefonia/diagnostico");
      setDiag(data?.data || null);
    } catch {
      setDiag(null);
    }
  }, []);

  const [cuentas, setCuentas] = useState([]);
  const [resumen, setResumen] = useState(null); // cobertura: vendido vs saldo Zadarma
  const cargarCuentas = useCallback(async () => {
    try {
      const { data } = await chatApi.get("/telefonia/cuentas");
      setCuentas(data?.data || []);
      setResumen(data?.resumen || null);
    } catch {
      setCuentas([]);
      setResumen(null);
    }
  }, []);

  useEffect(() => {
    cargarMaestra();
    cargarDiagnostico();
    cargarCuentas();
  }, [cargarMaestra, cargarDiagnostico, cargarCuentas]);

  const guardarLlaves = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setMsg1(null);
    try {
      const { data } = await chatApi.post("/telefonia/maestra", form);
      const b = data?.data?.balance;
      setMsg1({ tipo: "ok", texto: `Cuenta vinculada. Saldo en Zadarma: ${b?.balance} ${b?.currency || ""}` });
      setForm({ user_key: "", secret: "" });
      cargarMaestra();
      cargarDiagnostico();
    } catch (err) {
      setMsg1({ tipo: "error", texto: err?.response?.data?.message || "Zadarma no aceptó las llaves" });
    } finally {
      setGuardando(false);
    }
  };

  /* ── Paso 2: instalación ── */
  const [instalando, setInstalando] = useState(false);
  const [msg2, setMsg2] = useState(null);
  const [urlWebhook, setUrlWebhook] = useState("https://chat.imporfactory.app/api/v1/telefonia/webhook");
  const instalar = async () => {
    setInstalando(true);
    setMsg2(null);
    try {
      const { data } = await chatApi.post("/telefonia/instalar", { url: urlWebhook });
      const g = data?.data?.grabacion || {};
      const enc = (g.encendidas || []).join(", ");
      const err = (g.errores || []).join(" · ");
      setMsg2({
        tipo: err && !enc ? "error" : "ok",
        texto: `Zadarma ya nos avisa de cada llamada. Grabación encendida en: ${enc || "ninguna"}${err ? `. Fallaron: ${err}` : ""}.`,
      });
      cargarMaestra();
    } catch (err) {
      setMsg2({ tipo: "error", texto: err?.response?.data?.message || "No se pudo instalar" });
    } finally {
      setInstalando(false);
    }
  };

  /* ── Paso 3: saldo por conexión ── */
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState([]);
  const [sel, setSel] = useState(null);
  const [recarga, setRecarga] = useState({ dolares: "10", tarifa: "0.40", caller_id: "" });
  const [hist, setHist] = useState(null); // conexión cuyo historial de llamadas está abierto
  const [msg3, setMsg3] = useState(null);
  const [numero, setNumero] = useState(null); // { verificado, detalle } del número de salida
  const [comprobando, setComprobando] = useState(false);
  const [costo, setCosto] = useState(null); // costo real de Zadarma por minuto para el país de la conexión

  useEffect(() => {
    if (!sel) {
      setCosto(null);
      return undefined;
    }
    let vigente = true;
    chatApi
      .get("/telefonia/costo", { params: { id_configuracion: sel.id } })
      .then(({ data }) => vigente && setCosto(data?.data || null))
      .catch(() => vigente && setCosto(null));
    return () => {
      vigente = false;
    };
  }, [sel]);

  const tarifaC = Math.round(Number(recarga.tarifa || 0) * 100);
  const costoC = costo?.centavos_min || 0;
  const margenPct = tarifaC > 0 && costoC ? Math.round(((tarifaC - costoC) / tarifaC) * 100) : null;
  const recargaC = Math.round(Number(recarga.dolares || 0) * 100);
  const costoTrasRecarga =
    resumen && costoC && tarifaC > 0 ? resumen.costo_pendiente_centavos + (recargaC / tarifaC) * costoC : null;
  const excedeZadarma =
    costoTrasRecarga != null && resumen?.saldo_zadarma_centavos != null && costoTrasRecarga > resumen.saldo_zadarma_centavos;

  const comprobarNumero = async () => {
    if (!sel || !recarga.caller_id) return;
    setComprobando(true);
    try {
      const { data } = await chatApi.post("/telefonia/cuenta/comprobar-numero", { id_configuracion: sel.id, numero: recarga.caller_id });
      setNumero(data?.data || null);
      cargarCuentas();
    } catch (err) {
      setNumero({ verificado: false, detalle: err?.response?.data?.message || "No se pudo comprobar" });
    } finally {
      setComprobando(false);
    }
  };

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

  const elegir = (c) => {
    setSel(c);
    setQ("");
    setResultados([]);
    const existente = cuentas.find((x) => Number(x.id_configuracion) === Number(c.id));
    setRecarga({
      dolares: "10",
      tarifa: existente ? (existente.tarifa_centavos_min / 100).toFixed(2) : "0.40",
      caller_id: existente?.caller_id || c.telefono || "",
    });
    setMsg3(null);
    setNumero(
      existente && existente.caller_id
        ? { verificado: Number(existente.numero_verificado) === 1, detalle: existente.numero_comprobado_at ? null : "Sin comprobar todavía" }
        : null,
    );
  };

  const guardarCuenta = async () => {
    if (!sel) return;
    setMsg3(null);
    try {
      const { data } = await chatApi.post("/telefonia/cuenta", {
        id_configuracion: sel.id,
        tarifa_centavos_min: Math.round(Number(recarga.tarifa) * 100),
        caller_id: recarga.caller_id,
        activo: true,
      });
      setNumero(data?.data?.numero || null);
      setMsg3({ tipo: "ok", texto: "Precio por minuto y número de salida guardados." });
      cargarCuentas();
    } catch (err) {
      setMsg3({ tipo: "error", texto: err?.response?.data?.message || "No se pudo guardar" });
    }
  };

  const recargarSaldo = async () => {
    if (!sel) return;
    setMsg3(null);
    try {
      const { data } = await chatApi.post("/telefonia/recargar", {
        id_configuracion: sel.id,
        centavos: Math.round(Number(recarga.dolares) * 100),
        detalle: "Recarga desde /telefonia",
      });
      setMsg3({ tipo: "ok", texto: `Saldo cargado. La conexión ahora tiene ${fmtUSD(data?.data?.saldo_centavos)}.` });
      cargarCuentas();
    } catch (err) {
      setMsg3({ tipo: "error", texto: err?.response?.data?.message || "No se pudo recargar" });
    }
  };

  const vinculada = !!maestra?.configurada;
  const instalada = !!maestra?.webhook_url;
  const minutos = (dolares, tarifa) => {
    const t = Number(tarifa);
    return t > 0 ? Math.floor(Number(dolares || 0) / t) : 0;
  };

  return (
    <div className="w-full px-4 py-5 sm:px-6 space-y-5">
      {/* Cabecera */}
      <header className="rounded-2xl bg-[#0B1426] px-5 py-5 text-white sm:px-7">
        <div className="text-[11px] font-bold uppercase tracking-widest text-cyan-300">ImporChat · Telefonía por saldo</div>
        <h1 className="mt-1 text-2xl font-extrabold">Llamadas al celular con Zadarma</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          Imporfactory compra los minutos en su cuenta de Zadarma y se los vende a cada conexión como saldo. El asesor ve en
          el chat el botón <b className="text-white">Llamar al celular</b> y un teléfono flotante: al llamar, primero le suena
          ese teléfono, contesta, y Zadarma marca al cliente mostrándole el número de la tienda.
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="rounded-lg bg-white/10 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Cuenta Zadarma</div>
            <div className="font-bold">{vinculada ? "Vinculada" : "Sin vincular"}</div>
          </div>
          <div className="rounded-lg bg-white/10 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Saldo en Zadarma</div>
            <div className="font-bold">
              {maestra?.balance ? `${maestra.balance.balance} ${maestra.balance.currency}` : "—"}
            </div>
          </div>
          <div className="rounded-lg bg-white/10 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Plan de llamadas</div>
            <div className="font-bold">
              {diag?.plan?.nombre ? `${diag.plan.nombre === "Standard" ? "Estándar (por segundo)" : diag.plan.nombre}${diag.plan.activo ? "" : " · se activa al recargar"}` : "—"}
            </div>
          </div>
          <div className="rounded-lg bg-white/10 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Extensiones en la central</div>
            <div className="font-bold">{diag?.central?.numbers?.length ?? "—"}</div>
          </div>
          <div className="rounded-lg bg-white/10 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Vendido a clientes</div>
            <div className="font-bold">
              {resumen ? `${fmtUSD(resumen.asignado_centavos)} · ${resumen.minutos_vendidos} min · ${cuentas.length} conexiones` : cuentas.length}
            </div>
          </div>
          <div className={`rounded-lg px-3 py-2 ${resumen?.cubierto === false ? "bg-rose-500/30" : "bg-white/10"}`}>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Lo que esos minutos cuestan en Zadarma</div>
            <div className="font-bold">{resumen?.costo_pendiente_centavos != null ? fmtUSD(resumen.costo_pendiente_centavos) : "—"}</div>
          </div>
        </div>
        {resumen?.cubierto === false ? (
          <div className="mt-3 rounded-lg border border-rose-300 bg-rose-500/20 px-3 py-2 text-sm">
            <b>Saldo insuficiente en Zadarma.</b> Los minutos que ya vendiste costarían {fmtUSD(resumen.costo_pendiente_centavos)} y en Zadarma hay {fmtUSD(resumen.saldo_zadarma_centavos)}. Recarga en Zadarma antes de seguir asignando saldo.
          </div>
        ) : null}
      </header>

      {/* Tres pasos */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        {/* Paso 1 */}
        <Paso n={1} titulo="Vincular la cuenta de Zadarma" hecho={vinculada}>
          <p className="mb-3 text-sm text-slate-600">
            Entra a <b>my.zadarma.com → Configuración → Integraciones y API</b>, genera las dos llaves y pégalas aquí. Las
            probamos con Zadarma al guardar; la secreta queda cifrada en nuestra base.
          </p>
          {vinculada ? (
            <div className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Llave actual <code className="font-mono">{maestra.user_key}</code>
              {maestra.secret_last4 ? <> · secreta <code className="font-mono">····{maestra.secret_last4}</code></> : null}
              {maestra.balance_error ? <div className="mt-1 text-rose-600">Zadarma responde: {maestra.balance_error}</div> : null}
            </div>
          ) : null}
          {vinculada && !editarLlaves ? (
            <button type="button" onClick={() => setEditarLlaves(true)} className={`${btn} w-full border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>
              <i className="bx bx-edit-alt text-lg" /> Reemplazar llaves
            </button>
          ) : (
          <form onSubmit={guardarLlaves} className="space-y-3">
            <label className="block text-xs font-semibold text-slate-600">
              Llave de usuario
              <input id="tel-user-key" className={`${input} mt-1`} value={form.user_key} onChange={(e) => setForm((f) => ({ ...f, user_key: e.target.value }))} autoComplete="off" placeholder="20 caracteres" />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Llave secreta
              <input id="tel-secret" className={`${input} mt-1`} type="password" value={form.secret} onChange={(e) => setForm((f) => ({ ...f, secret: e.target.value }))} autoComplete="new-password" placeholder="20 caracteres" />
            </label>
            <button type="submit" disabled={guardando || !form.user_key || !form.secret} className={`${btn} w-full bg-indigo-600 text-white hover:bg-indigo-700`}>
              <i className={`bx ${guardando ? "bx-loader-alt bx-spin" : "bx-link"} text-lg`} />
              {vinculada ? "Guardar nuevas llaves" : "Vincular cuenta"}
            </button>
          </form>
          )}
          {msg1 ? <Aviso tipo={msg1.tipo}>{msg1.texto}</Aviso> : null}
        </Paso>

        {/* Paso 2 */}
        <Paso n={2} titulo="Instalar en Zadarma" hecho={instalada}>
          <p className="mb-3 text-sm text-slate-600">
            Con un clic le decimos a Zadarma a dónde avisarnos de cada llamada (para descontar el saldo y dejar el registro
            en el chat) y encendemos la grabación de la central.
          </p>
          <label className="mb-3 block text-xs font-semibold text-slate-600">
            Dirección pública a la que Zadarma nos avisa
            <input id="tel-webhook-url" className={`${input} mt-1`} value={urlWebhook} onChange={(e) => setUrlWebhook(e.target.value)} />
            <span className="mt-1 block font-normal text-slate-500">
              Debe ser un servidor publicado con esta versión del backend: Zadarma la comprueba antes de aceptarla. Con el backend en tu computador no funciona.
            </span>
          </label>
          <button type="button" onClick={instalar} disabled={instalando || !vinculada || !urlWebhook} className={`${btn} w-full bg-emerald-600 text-white hover:bg-emerald-700`}>
            <i className={`bx ${instalando ? "bx-loader-alt bx-spin" : "bx-plug"} text-lg`} />
            {instalada ? "Volver a instalar" : "Instalar"}
          </button>
          {instalada ? (
            <div className="mt-2 text-xs text-slate-500">
              Instalado{maestra.webhook_instalado_at ? ` el ${new Date(maestra.webhook_instalado_at).toLocaleString("es-EC")}` : ""}.
            </div>
          ) : null}
          {msg2 ? <Aviso tipo={msg2.tipo}>{msg2.texto}</Aviso> : null}

          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
            <div className="font-bold">Dos cosas que solo se hacen en Zadarma:</div>
            <ol className="mt-1 list-decimal space-y-1 pl-5">
              <li>
                En <b>Integraciones y API → widget WebRTC</b>, registra los dominios <code>chatcenter.imporfactory.app</code> y <code>localhost</code>. Sin esto el teléfono flotante no aparece.
              </li>
              <li>
                En <b>Mi PBX → Extensiones</b>, crea una extensión por cada asesor que vaya a llamar (100, 101, 102…). Se asignan solas al primer uso.
              </li>
            </ol>
          </div>

          {diag?.configurado ? (
            <div className="mt-4 text-sm text-slate-600">
              <div className="font-semibold text-slate-800">Central ahora</div>
              <div>Extensiones: {(diag.central?.numbers || []).join(", ") || diag.central?.error || "ninguna todavía"}</div>
              <div>
                Asignadas:{" "}
                {(diag.extensiones_asignadas || []).length
                  ? diag.extensiones_asignadas.map((e) => `${e.extension} → asesor ${e.id_sub_usuario}`).join(" · ")
                  : "ninguna todavía"}
              </div>
            </div>
          ) : null}
        </Paso>

        {/* Paso 3 */}
        <Paso n={3} titulo="Dar saldo a una conexión" hecho={cuentas.length > 0}>
          <p className="mb-3 text-sm text-slate-600">
            Busca la conexión del cliente, cárgale saldo y define a cuánto le vendes el minuto y con qué número salen sus
            llamadas. El número debe estar verificado en Zadarma como número propio.
          </p>
          <div className="relative">
            <input id="tel-buscar" className={input} placeholder="Buscar por id, nombre o teléfono…" value={q} onChange={(e) => setQ(e.target.value)} />
            {resultados.length ? (
              <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                {resultados.map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => elegir(c)} className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50">
                      <b>#{c.id}</b> {c.nombre_configuracion} <span className="text-slate-400">{tel(c.telefono)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {sel ? (
            <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3">
              <div className="text-sm font-bold text-slate-900">
                #{sel.id} {sel.nombre_configuracion} <span className="font-normal text-slate-500">{tel(sel.telefono)}</span>
              </div>
              <div className="mt-3 space-y-3">
                <label className="block text-xs font-semibold text-slate-600">
                  Precio por minuto que le cobras (USD)
                  <input className={`${input} mt-1`} value={recarga.tarifa} onChange={(e) => setRecarga((r) => ({ ...r, tarifa: e.target.value }))} inputMode="decimal" />
                </label>
                {!costoC ? (
                  <div className="text-[11px] text-slate-400">Consultando el costo real en Zadarma…</div>
                ) : (
                  <div className={`rounded-lg border px-3 py-2 text-xs ${tarifaC <= costoC ? "border-rose-300 bg-rose-50 text-rose-800" : margenPct < 20 ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
                    <b>Costo real en Zadarma: {fmtUSD(costoC)} por minuto</b> ({costo.descripcion}).{" "}
                    {tarifaC === costoC
                      ? "Al costo: no ganas ni pierdes. Es lo correcto para una conexión propia de Imporfactory."
                      : tarifaC < costoC
                        ? `No es rentable: a ${fmtUSD(tarifaC)} pierdes ${fmtUSD(costoC - tarifaC)} por cada minuto que hable este cliente.`
                        : `Ganas ${fmtUSD(tarifaC - costoC)} por minuto (margen ${margenPct}%).${margenPct < 20 ? " Es un margen bajo." : ""}`}
                    {tarifaC !== costoC ? (
                      <button
                        type="button"
                        onClick={() => setRecarga((r) => ({ ...r, tarifa: (costoC / 100).toFixed(2) }))}
                        className="ml-2 rounded-md border border-current px-2 py-0.5 font-semibold hover:bg-white/60"
                        title="Para conexiones propias (como la 242): se cobra exactamente lo que cuesta en Zadarma"
                      >
                        Usar el costo de Zadarma
                      </button>
                    ) : null}
                  </div>
                )}
                <label className="block text-xs font-semibold text-slate-600">
                  Número con el que salen sus llamadas
                  <input className={`${input} mt-1`} value={recarga.caller_id} onChange={(e) => { setRecarga((r) => ({ ...r, caller_id: e.target.value })); setNumero(null); }} placeholder="593999999999" />
                </label>
                <div className={`rounded-lg border px-3 py-2 text-xs ${numero?.verificado ? "border-emerald-200 bg-emerald-50 text-emerald-800" : numero ? "border-amber-200 bg-amber-50 text-amber-900" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold">
                      {numero?.verificado ? "Número verificado en Zadarma: las llamadas salen con él" : numero ? "Número sin verificar: las llamadas salen como desconocido" : "Aún no se ha comprobado este número"}
                    </span>
                    <button type="button" onClick={comprobarNumero} disabled={comprobando || !recarga.caller_id} className="rounded-md border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                      <i className={`bx ${comprobando ? "bx-loader-alt bx-spin" : "bx-refresh"}`} /> Comprobar
                    </button>
                  </div>
                  {numero && !numero.verificado ? (
                    <p className="mt-1">
                      Para verificarlo: en my.zadarma.com → Configuración → Conexión SIP → Identificador de llamada → Verificar número. Al dueño del número le llega un código por llamada o SMS; te lo dicta, lo escribes, y vuelves a pulsar Comprobar.
                    </p>
                  ) : null}
                </div>
                <button type="button" onClick={guardarCuenta} className={`${btn} w-full border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>
                  <i className="bx bx-save text-lg" /> Guardar precio y número
                </button>
                <label className="block text-xs font-semibold text-slate-600">
                  Cuánto saldo cargar (USD)
                  <input className={`${input} mt-1`} value={recarga.dolares} onChange={(e) => setRecarga((r) => ({ ...r, dolares: e.target.value }))} inputMode="decimal" />
                  <span className="mt-1 block font-normal text-slate-500">
                    Equivale a unos {minutos(recarga.dolares, recarga.tarifa)} minutos a {`$${Number(recarga.tarifa || 0).toFixed(2)}`} el minuto.
                  </span>
                </label>
                {excedeZadarma ? (
                  <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                    <b>No se puede cargar:</b> con esta recarga, los minutos vendidos costarían {fmtUSD(costoTrasRecarga)} en Zadarma y allá solo hay {fmtUSD(resumen.saldo_zadarma_centavos)}. El cliente vería saldo para llamar y la llamada se cortaría. Recarga primero en Zadarma o carga menos.
                  </div>
                ) : null}
                <button type="button" onClick={recargarSaldo} disabled={excedeZadarma || recargaC <= 0} className={`${btn} w-full bg-indigo-600 text-white hover:bg-indigo-700`}>
                  <i className="bx bx-plus-circle text-lg" /> Cargar {fmtUSD(recargaC)}
                </button>
              </div>
              {msg3 ? <Aviso tipo={msg3.tipo}>{msg3.texto}</Aviso> : null}
            </div>
          ) : (
            <div className="mt-3 text-xs text-slate-400">Elige una conexión del buscador o de la tabla de abajo.</div>
          )}
        </Paso>
      </div>

      <AnalisisIACard />

      {/* Tabla de conexiones con saldo */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-extrabold text-slate-900">Conexiones con saldo</h2>
        <p className="mb-3 text-sm text-slate-500">Toca una fila para recargarla o cambiar su precio y número.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Conexión</th>
                <th className="px-3 py-2">Saldo</th>
                <th className="px-3 py-2">Minutos aprox.</th>
                <th className="px-3 py-2">Precio/min</th>
                <th className="px-3 py-2">Margen</th>
                <th className="px-3 py-2">Sale con</th>
                <th className="px-3 py-2">Número</th>
                <th className="px-3 py-2">Llamadas</th>
                <th className="px-3 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {cuentas.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-3 py-6 text-center text-slate-400">Ninguna conexión tiene saldo todavía.</td>
                </tr>
              ) : (
                cuentas.map((c) => (
                  <tr
                    key={c.id_configuracion}
                    className="cursor-pointer border-t border-slate-100 hover:bg-indigo-50/40"
                    onClick={() => elegir({ id: c.id_configuracion, nombre_configuracion: c.nombre_configuracion, telefono: c.telefono })}
                  >
                    <td className="px-3 py-2">
                      <b>#{c.id_configuracion}</b> {c.nombre_configuracion || ""}
                    </td>
                    <td className="px-3 py-2 font-bold">{fmtUSD(c.saldo_centavos)}</td>
                    <td className="px-3 py-2">{Math.floor(c.saldo_centavos / c.tarifa_centavos_min)}</td>
                    <td className="px-3 py-2">{fmtUSD(c.tarifa_centavos_min)}</td>
                    <td className="px-3 py-2">
                      {c.margen_pct == null ? <span className="text-slate-400">—</span> : c.margen_pct <= 0 ? <span className="font-bold text-rose-700">pierdes {fmtUSD(c.costo_centavos_min - c.tarifa_centavos_min)}/min</span> : <span className={c.margen_pct < 20 ? "font-semibold text-amber-700" : "font-semibold text-emerald-700"}>{c.margen_pct}%</span>}
                    </td>
                    <td className="px-3 py-2">{tel(c.caller_id)}</td>
                    <td className="px-3 py-2">
                      {!c.caller_id ? <span className="text-slate-400">—</span> : Number(c.numero_verificado) === 1 ? <span className="font-semibold text-emerald-700">verificado</span> : c.numero_comprobado_at ? <span className="font-semibold text-amber-700">sin verificar</span> : <span className="text-slate-400">sin comprobar</span>}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setHist(c);
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                        title="Ver el historial de llamadas y con qué número salió cada una"
                      >
                        <i className="bx bx-history" /> {c.llamadas} · ver
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      {Number(c.activo) === 1 ? <span className="font-semibold text-emerald-700">activa</span> : <span className="text-slate-400">apagada</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {hist ? <HistorialModal cuenta={hist} onClose={() => setHist(null)} /> : null}
    </div>
  );
}
