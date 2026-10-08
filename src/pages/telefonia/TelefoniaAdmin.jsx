import { useCallback, useEffect, useState } from "react";
import chatApi from "../../api/chatcenter";
import LlamadasResumen from "../../components/dashboard/LlamadasResumen";

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

/* ── Historial de llamadas de una conexión ─────────────────────────────
   El mismo panel que ve el administrador de la conexión en su dashboard
   (filtro de fechas, tarjetas, comparación por asesor, tabla con
   seguimiento), más la columna "Salió con". */
function HistorialModal({ cuenta, onClose }) {
  return (
    <Modal
      titulo={`Llamadas de #${cuenta.id_configuracion} ${cuenta.nombre_configuracion || ""}`}
      subtitulo={'"Salió con" es el número que Zadarma reporta haber enviado en cada llamada'}
      onClose={onClose}
      ancho="max-w-6xl"
    >
      <div className="overflow-auto px-5 py-4">
        <LlamadasResumen
          configId={cuenta.id_configuracion}
          endpoint="/telefonia/admin/historial"
          mostrarSalioCon
          ocultarSiInactiva={false}
          enMarco={false}
          porPagina={12}
        />
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
  /* Saldo compartido (2026-10-08): un dueño con varias conexiones no tiene
     que repartir el saldo entre ellas; esta conexión puede usar la bolsa de
     otra conexión del mismo dueño (titular). Las recargas y los consumos
     se asientan en la titular; el precio por minuto es el de la titular. */
  const titularActual = Number(cuenta?.id_configuracion_saldo) || null;
  const [titular, setTitular] = useState(titularActual ? String(titularActual) : "");
  const [compartibles, setCompartibles] = useState(null); // { data, seguidoras }
  useEffect(() => {
    let vigente = true;
    chatApi
      .get("/telefonia/costo", { params: { id_configuracion: conexion.id } })
      .then(({ data }) => vigente && setCosto(data?.data || null))
      .catch(() => vigente && setCosto(null));
    chatApi
      .get("/telefonia/cuenta/compartibles", { params: { id_configuracion: conexion.id } })
      .then(({ data }) => vigente && setCompartibles({ data: data?.data || [], seguidoras: Number(data?.seguidoras) || 0 }))
      .catch(() => vigente && setCompartibles({ data: [], seguidoras: 0 }));
    return () => {
      vigente = false;
    };
  }, [conexion.id]);
  const comparte = !!titularActual;
  const titularInfo = comparte ? compartibles?.data?.find((c) => Number(c.id) === titularActual) || null : null;
  /* Lo elegido en el selector (guardado o todavía no) y si cambió respecto a
     lo guardado: con eso se decide qué se enseña y qué botón va al pie. */
  const elegido = titular ? compartibles?.data?.find((c) => Number(c.id) === Number(titular)) || null : null;
  const pendiente = (titular || "") !== (titularActual ? String(titularActual) : "");
  const guardarCompartir = async () => {
    setOcupado(true);
    setMsg(null);
    try {
      const { data } = await chatApi.post("/telefonia/cuenta", { id_configuracion: conexion.id, id_configuracion_saldo: titular ? Number(titular) : null, activo: true });
      const t = data?.data?.compartido?.trasladado_centavos || 0;
      onDone(
        titular
          ? `#${conexion.id} ahora usa el saldo de #${titular}${t ? ` (se trasladaron ${fmtUSD(t)} que tenía propios)` : ""}. Las llamadas de las dos descuentan de la misma bolsa.`
          : `#${conexion.id} vuelve a tener saldo propio (arranca en cero: cárgale).`,
      );
      onClose();
    } catch (err) {
      setMsg({ tipo: "error", texto: err?.response?.data?.message || "No se pudo guardar" });
    } finally {
      setOcupado(false);
    }
  };

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
      onDone(null);
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
      /* Se cierra y el aviso va en la página: si el modal quedara abierto
         con el monto escrito, recalcularía la cobertura como si fuera a
         cargar OTRA vez lo mismo y mostraría "no se puede cargar" justo
         después de haber cargado. */
      const bolsa = data?.data?.id_configuracion_saldo;
      const tarifaBolsa = Number(data?.data?.tarifa_centavos_min) || tarifaC;
      onDone(
        bolsa
          ? `Saldo cargado a la bolsa compartida de #${bolsa} (la usa #${conexion.id}): ahora tiene ${fmtUSD(data?.data?.saldo_centavos)} (${Math.floor((data?.data?.saldo_centavos || 0) / tarifaBolsa)} min a ${fmtUSD(tarifaBolsa)}).`
          : `Saldo cargado a #${conexion.id}: ahora tiene ${fmtUSD(data?.data?.saldo_centavos)} (${Math.floor((data?.data?.saldo_centavos || 0) / tarifaC)} min a ${fmtUSD(tarifaC)}).`,
      );
      onClose();
    } catch (err) {
      setMsg({ tipo: "error", texto: err?.response?.data?.message || "No se pudo recargar" });
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Modal
      titulo={`#${conexion.id} ${conexion.nombre_configuracion || ""}`}
      subtitulo={`${tel(conexion.telefono)}${cuenta ? (comparte ? ` · usa el saldo de #${titularActual}: ${fmtUSD(cuenta.saldo_centavos)}` : ` · saldo actual ${fmtUSD(cuenta.saldo_centavos)}`) : " · todavía sin telefonía"}`}
      onClose={onClose}
    >
      <div className="space-y-4 px-5 py-4">
        <div>
          <label htmlFor="tel-titular" className="block text-xs font-semibold text-slate-600">De dónde sale el saldo</label>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Si el dueño tiene varias conexiones, pueden usar una sola bolsa: las llamadas de todas descuentan del mismo saldo y no hay que repartirlo.
          </p>
          <div className="mt-1 flex gap-2">
            <select
              id="tel-titular"
              className={input}
              value={titular}
              onChange={(e) => setTitular(e.target.value)}
              disabled={!compartibles || compartibles.seguidoras > 0}
            >
              <option value="">Saldo propio de esta conexión</option>
              {(compartibles?.data || []).map((c) => (
                <option key={c.id} value={c.id}>
                  Compartir el saldo de #{c.id} {c.nombre_configuracion || ""} ({fmtUSD(c.saldo_centavos)}, {fmtUSD(c.tarifa_centavos_min)}/min)
                </option>
              ))}
            </select>
          </div>
          {compartibles && compartibles.seguidoras > 0 ? (
            <div className="mt-1 text-[11px] text-sky-700">Otras {compartibles.seguidoras} conexión(es) usan el saldo de esta: es la titular de la bolsa y no puede compartir de otra.</div>
          ) : compartibles && !compartibles.data.length && !comparte ? (
            <div className="mt-1 text-[11px] text-slate-400">El dueño no tiene otra conexión con telefonía. Dale saldo a la otra primero y luego comparte desde aquí.</div>
          ) : null}
          {comparte && compartibles && !titularInfo ? (
            <div className="mt-1 text-[11px] text-amber-700">La titular #{titularActual} ya no aparece entre las compartibles; vuelve a saldo propio o elige otra.</div>
          ) : null}
        </div>

        {/* Con una titular elegida no hay nada más que decidir: ni precio ni
            recarga (son de la bolsa). Solo se enseña qué va a usar. */}
        {titular ? (
          <div className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-900">
            {elegido ? (
              <>
                Usará el saldo de <b>#{elegido.id} {elegido.nombre_configuracion || ""}</b>: <b>{fmtUSD(elegido.saldo_centavos)}</b> (unos {elegido.tarifa_centavos_min > 0 ? Math.floor(elegido.saldo_centavos / elegido.tarifa_centavos_min) : 0} min a {fmtUSD(elegido.tarifa_centavos_min)}/min).
                {" "}Las recargas y el precio se manejan en #{elegido.id}; las dos conexiones descuentan de ahí.
              </>
            ) : (
              <>Usará el saldo de #{titular}.</>
            )}
          </div>
        ) : null}

        {titular || pendiente ? null : (
        <div>
          <label htmlFor="tel-tarifa" className="block text-xs font-semibold text-slate-600">Precio por minuto a celulares de su país (USD)</label>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Define el margen. Cada llamada se descuenta por lo que costó de verdad en Zadarma con ese margen, vaya al país que vaya: al costo, el saldo de la conexión y el de Zadarma bajan a la par.
          </p>
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
        )}

        {titular || pendiente ? null : (
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
        )}

        {msg ? <Aviso tipo={msg.tipo}>{msg.texto}</Aviso> : null}
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-3">
        {pendiente ? (
          /* Cambió de dónde sale el saldo: un solo botón, sin precio ni monto. */
          <button type="button" onClick={guardarCompartir} disabled={ocupado || !compartibles || compartibles.seguidoras > 0} className={btnPrimario}>
            <i className="bx bx-link" /> {titular ? `Usar el saldo de #${titular}` : "Volver a saldo propio"}
          </button>
        ) : titular ? (
          <button type="button" onClick={onClose} className={btnSuave}>Cerrar</button>
        ) : (
          <>
            <button type="button" onClick={guardarPrecio} disabled={ocupado || tarifaC <= 0} className={btnSuave}>Guardar solo el precio</button>
            <button type="button" onClick={cargar} disabled={ocupado || excede || recargaC <= 0 || tarifaC <= 0} className={btnPrimario}>
              <i className="bx bx-plus-circle" /> Cargar {fmtUSD(recargaC)}
            </button>
          </>
        )}
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
  /* Apagar quita el botón Llamar del chat Y devuelve el saldo, para que esa
     conexión deje de comprometer saldo de Zadarma. Se pide dos clics: el
     primero arma el botón (muestra cuánto se quita), el segundo apaga.
     Encender la deja activa en cero: luego se le carga saldo. */
  const [apagando, setApagando] = useState(null);
  const [msgLista, setMsgLista] = useState(null);
  const terminado = (texto) => {
    if (texto) setMsgLista({ tipo: "ok", texto });
    cargarTodo();
  };
  const alternar = async (c) => {
    if (Number(c.activo) !== 1) {
      await chatApi.post("/telefonia/cuenta", { id_configuracion: c.id_configuracion, activo: true });
      terminado(`#${c.id_configuracion} encendida. Cárgale saldo para que pueda llamar.`);
      return;
    }
    // Sin saldo propio no hay nada que devolver: se apaga de una. (Una que
    // comparte muestra el saldo de la titular, pero ese no es suyo.)
    if (Number(c.saldo_centavos) <= 0 || c.id_configuracion_saldo) {
      await chatApi.post("/telefonia/cuenta", { id_configuracion: c.id_configuracion, activo: false });
      terminado(`#${c.id_configuracion} apagada.`);
      return;
    }
    if (apagando !== c.id_configuracion) {
      setApagando(c.id_configuracion);
      setTimeout(() => setApagando((a) => (a === c.id_configuracion ? null : a)), 4000);
      return;
    }
    setApagando(null);
    await chatApi.post("/telefonia/apagar", { id_configuracion: c.id_configuracion });
    terminado(`#${c.id_configuracion} apagada y ${fmtUSD(c.saldo_centavos)} devueltos a la cobertura de Zadarma.`);
  };
  /* Una conexión apagada y en cero solo estorba en la lista. Quitarla borra
     su fila de saldo; el historial de llamadas se conserva. */
  const quitar = async (c) => {
    await chatApi.post("/telefonia/cuenta/quitar", { id_configuracion: c.id_configuracion });
    terminado(`#${c.id_configuracion} quitada de la lista.`);
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

          {msgLista ? <Aviso tipo={msgLista.tipo}>{msgLista.texto}</Aviso> : null}
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
                        {c.id_configuracion_saldo ? (
                          <div className="mt-0.5 inline-block rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800" title={`Las llamadas de #${c.id_configuracion} descuentan del saldo de #${c.id_configuracion_saldo}`}>
                            <i className="bx bx-link" /> comparte con #{c.id_configuracion_saldo} {c.nombre_titular || ""}
                          </div>
                        ) : Number(c.seguidoras) > 0 ? (
                          <div className="mt-0.5 inline-block rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800" title="Otras conexiones del mismo dueño descuentan de este saldo">
                            <i className="bx bx-link" /> lo usan {c.seguidoras} conexión(es) más
                          </div>
                        ) : null}
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
                          <button
                            type="button"
                            onClick={() => alternar(c)}
                            className={`${btn} px-2 py-1 text-xs ${apagando === c.id_configuracion ? "bg-rose-600 text-white hover:bg-rose-700" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
                            title={Number(c.activo) !== 1 ? (c.id_configuracion_saldo ? "Vuelve a activar la telefonía; usa el saldo compartido" : "Vuelve a activar la telefonía; luego cárgale saldo") : c.saldo_centavos > 0 && !c.id_configuracion_saldo ? "Quita el botón Llamar del chat y devuelve el saldo a la cobertura de Zadarma" : "Quita el botón Llamar del chat (el saldo compartido sigue en la titular)"}
                          >
                            {Number(c.activo) !== 1 ? "Encender" : apagando === c.id_configuracion ? `¿Apagar y devolver ${fmtUSD(c.saldo_centavos)}?` : "Apagar"}
                          </button>
                          {Number(c.activo) !== 1 && Number(c.saldo_centavos) <= 0 ? (
                            <button type="button" onClick={() => quitar(c)} className={`${btnSuave} px-2 py-1 text-xs`} title="Borra la fila de saldo; el historial de llamadas se conserva">
                              Quitar
                            </button>
                          ) : null}
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

      {saldoDe ? <SaldoModal conexion={saldoDe.conexion} cuenta={saldoDe.cuenta} resumen={resumen} onClose={() => setSaldoDe(null)} onDone={terminado} /> : null}
      {hist ? <HistorialModal cuenta={hist} onClose={() => setHist(null)} /> : null}
    </div>
  );
}
