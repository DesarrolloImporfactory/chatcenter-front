import { useCallback, useEffect, useState } from "react";
import chatApi from "../../api/chatcenter";

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
  const cargarCuentas = useCallback(async () => {
    try {
      const { data } = await chatApi.get("/telefonia/cuentas");
      setCuentas(data?.data || []);
    } catch {
      setCuentas([]);
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
      const g = data?.data?.grabacion;
      setMsg2({ tipo: "ok", texto: `Zadarma ya nos avisa de cada llamada. Grabación: ${g?.error ? `no se pudo encender (${g.error})` : "encendida"}.` });
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
  const [msg3, setMsg3] = useState(null);

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
  };

  const guardarCuenta = async () => {
    if (!sel) return;
    setMsg3(null);
    try {
      await chatApi.post("/telefonia/cuenta", {
        id_configuracion: sel.id,
        tarifa_centavos_min: Math.round(Number(recarga.tarifa) * 100),
        caller_id: recarga.caller_id,
        activo: true,
      });
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
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Extensiones en la central</div>
            <div className="font-bold">{diag?.central?.numbers?.length ?? "—"}</div>
          </div>
          <div className="rounded-lg bg-white/10 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Conexiones con saldo</div>
            <div className="font-bold">{cuentas.length}</div>
          </div>
        </div>
      </header>

      {/* Tres pasos */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
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
              {vinculada ? "Reemplazar llaves" : "Vincular cuenta"}
            </button>
          </form>
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
                <label className="block text-xs font-semibold text-slate-600">
                  Número con el que salen sus llamadas
                  <input className={`${input} mt-1`} value={recarga.caller_id} onChange={(e) => setRecarga((r) => ({ ...r, caller_id: e.target.value }))} placeholder="593999999999" />
                </label>
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
                <button type="button" onClick={recargarSaldo} className={`${btn} w-full bg-indigo-600 text-white hover:bg-indigo-700`}>
                  <i className="bx bx-plus-circle text-lg" /> Cargar {fmtUSD(Math.round(Number(recarga.dolares || 0) * 100))}
                </button>
              </div>
              {msg3 ? <Aviso tipo={msg3.tipo}>{msg3.texto}</Aviso> : null}
            </div>
          ) : (
            <div className="mt-3 text-xs text-slate-400">Elige una conexión del buscador o de la tabla de abajo.</div>
          )}
        </Paso>
      </div>

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
                <th className="px-3 py-2">Sale con</th>
                <th className="px-3 py-2">Llamadas</th>
                <th className="px-3 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {cuentas.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-3 py-6 text-center text-slate-400">Ninguna conexión tiene saldo todavía.</td>
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
                    <td className="px-3 py-2">{tel(c.caller_id)}</td>
                    <td className="px-3 py-2">{c.llamadas}</td>
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
    </div>
  );
}
