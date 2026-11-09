import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import chatApi from "../../../api/chatcenter";
import { Aviso, Campo, Etiqueta, DOMINIO_DROPI, PAISES, TOKENS, btnChico, btnPrimario, btnSuave, fmtFecha, haceCuanto, input, nombrePais, select, textoError } from "../ui";

/* ═══════════════════════════════════════════════════════════════════════
   Cuentas de mapeo: las cuentas de Dropi (correo + token de integración)
   con las que ImporKiller lee el catálogo de cada país. Solo super admin.

   - El token se manda una sola vez al guardar; el back lo cifra y nunca lo
     devuelve (la lista trae solo los 4 últimos caracteres).
   - «Probar» lee una página chica del catálogo con ese token desde el
     servidor (la IP está en la lista blanca de Dropi): sirve antes de
     guardar (pais + token) y para una cuenta ya guardada (id).
   - Si un país tiene varias cuentas activas, el recolector las turna.
   ═══════════════════════════════════════════════════════════════════════ */

const PAISES_CUENTA = PAISES.filter((p) => p.code !== "QA");

const vacio = (pais) => ({ pais, correo: "", etiqueta: "", token: "" });

function estadoDe(c) {
  if (Number(c.activa) !== 1) return { tono: "slate", texto: "Inactiva", icono: "bx-pause-circle" };
  const fallo = c.ultimo_error_en && (!c.ultimo_ok || new Date(c.ultimo_error_en) > new Date(c.ultimo_ok));
  if (fallo) return { tono: "rose", texto: "Con error", icono: "bx-error-circle" };
  if (c.ultimo_ok) return { tono: "emerald", texto: "Funciona", icono: "bx-check-circle" };
  return { tono: "amber", texto: "Sin probar", icono: "bx-time-five" };
}

export default function CuentasDropi({ pais: paisInicial = "EC", onClose, onCambio }) {
  const [cuentas, setCuentas] = useState([]);
  const [resumen, setResumen] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState(paisInicial === "QA" ? "EC" : paisInicial);
  const [form, setForm] = useState(vacio(paisInicial === "QA" ? "EC" : paisInicial));
  const [verToken, setVerToken] = useState(false);
  const [prueba, setPrueba] = useState(null); // { ok, texto }
  const [ocupado, setOcupado] = useState(""); // 'probar' | 'guardar' | `fila-<id>-<accion>`
  const [msg, setMsg] = useState(null);
  const [confirmar, setConfirmar] = useState(null); // id a eliminar (segundo clic)

  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      const { data } = await chatApi.get("/espia/cuentas");
      setCuentas(data?.data?.cuentas || []);
      setResumen(data?.data?.resumen || {});
    } catch (err) {
      setError(textoError(err));
    } finally {
      setCargando(false);
    }
  };
  useEffect(() => {
    cargar();
  }, []);

  const avisar = (tipo, texto) => {
    setMsg({ tipo, texto });
    if (tipo === "ok") setTimeout(() => setMsg((m) => (m?.texto === texto ? null : m)), 6000);
  };
  const cambio = () => {
    cargar();
    onCambio?.();
  };

  const lista = useMemo(() => cuentas.filter((c) => c.pais === filtro), [cuentas, filtro]);

  const probarNueva = async () => {
    if (!form.token.trim()) return setPrueba({ ok: false, texto: "Pega primero el token." });
    setOcupado("probar");
    setPrueba(null);
    try {
      const { data } = await chatApi.post("/espia/cuentas/probar", { pais: form.pais, token: form.token.trim() });
      const r = data?.data || {};
      setPrueba(
        r.ok
          ? {
              ok: true,
              texto: `Dropi respondió en ${Math.round((r.ms || 0) / 100) / 10} s con ${r.productos} productos${r.ejemplo?.nombre ? ` (p. ej. «${r.ejemplo.nombre}»${r.ejemplo.proveedor ? ` de ${r.ejemplo.proveedor}` : ""})` : ""}. Puedes guardar.`,
              detalle: r.ejemplo?.campos_proveedor?.length ? `Campos del proveedor que manda Dropi: ${r.ejemplo.campos_proveedor.join(", ")}` : null,
            }
          : { ok: false, texto: r.error || "Dropi no respondió." },
      );
    } catch (err) {
      setPrueba({ ok: false, texto: textoError(err) });
    } finally {
      setOcupado("");
    }
  };

  const guardar = async (e) => {
    e?.preventDefault?.();
    setOcupado("guardar");
    setMsg(null);
    try {
      const { data } = await chatApi.post("/espia/cuentas", { pais: form.pais, correo: form.correo.trim(), etiqueta: form.etiqueta.trim(), token: form.token.trim() });
      const r = data?.data || {};
      avisar("ok", r.creada ? `Cuenta ${r.cuenta?.correo} registrada para ${nombrePais(form.pais)}. El recolector la usa en la próxima foto.` : `Token de ${r.cuenta?.correo} reemplazado.`);
      setForm(vacio(form.pais));
      setPrueba(null);
      setVerToken(false);
      setFiltro(form.pais);
      cambio();
    } catch (err) {
      avisar("error", textoError(err));
    } finally {
      setOcupado("");
    }
  };

  const accionFila = async (c, accion) => {
    setOcupado(`fila-${c.id}-${accion}`);
    setMsg(null);
    try {
      if (accion === "probar") {
        const { data } = await chatApi.post("/espia/cuentas/probar", { id: c.id });
        const r = data?.data || {};
        avisar(r.ok ? "ok" : "error", r.ok ? `${c.correo}: Dropi respondió con ${r.productos} productos en ${Math.round((r.ms || 0) / 100) / 10} s.` : `${c.correo}: ${r.error}`);
      } else if (accion === "activar" || accion === "desactivar") {
        await chatApi.patch(`/espia/cuentas/${c.id}`, { activa: accion === "activar" });
        avisar("ok", accion === "activar" ? `${c.correo} vuelve a entrar en el turno.` : `${c.correo} queda fuera del turno (no se borra).`);
      } else if (accion === "eliminar") {
        if (confirmar !== c.id) {
          setConfirmar(c.id);
          setTimeout(() => setConfirmar((v) => (v === c.id ? null : v)), 5000);
          return;
        }
        await chatApi.delete(`/espia/cuentas/${c.id}`);
        setConfirmar(null);
        avisar("ok", `${c.correo} eliminada.`);
      }
      cambio();
    } catch (err) {
      avisar("error", textoError(err));
    } finally {
      setOcupado("");
    }
  };

  const res = resumen[filtro] || {};
  const bandera = PAISES_CUENTA.find((p) => p.code === filtro)?.bandera || "";

  return createPortal(
    <AnimatePresence>
      <motion.div key="fondo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9000] flex items-start justify-center overflow-y-auto px-3 py-4 sm:items-center sm:px-6" style={{ background: "rgba(3,7,18,0.62)", backdropFilter: "blur(8px)" }} onClick={onClose}>
        <motion.div
          key="cuentas"
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Cuentas de mapeo"
          className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[26px] bg-white shadow-[0_50px_140px_-30px_rgba(0,0,0,0.8)] ring-1 ring-black/5"
        >
          <button type="button" onClick={onClose} className="absolute right-4 top-4 z-20 grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 hover:text-slate-900" aria-label="Cerrar">
            <i className="bx bx-x text-2xl" />
          </button>

          <header className="border-b border-slate-100 px-5 pb-4 pt-6 sm:px-7">
            <div className="flex items-center gap-3 pr-10">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#0B1426] text-sky-300">
                <i className="bx bx-key text-[24px]" />
              </span>
              <div className="min-w-0">
                <h2 className="text-[20px] font-extrabold leading-tight text-slate-900">Cuentas de mapeo</h2>
                <p className="mt-0.5 text-[13px] text-slate-600">Cuentas de Dropi con las que ImporKiller fotografía el catálogo de cada país. El token se guarda cifrado y no vuelve a mostrarse.</p>
              </div>
            </div>
            <div role="radiogroup" aria-label="País" className="mt-4 inline-flex flex-wrap rounded-2xl border border-slate-200 bg-slate-50 p-1">
              {PAISES_CUENTA.map((p) => {
                const activo = p.code === filtro;
                const r = resumen[p.code] || {};
                return (
                  <button key={p.code} type="button" role="radio" aria-checked={activo} onClick={() => setFiltro(p.code)} className={`relative inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold transition ${activo ? "bg-[#0B1426] text-white shadow" : "text-slate-600 hover:text-slate-900"}`}>
                    <span className="text-base leading-none">{p.bandera}</span>
                    {p.nombre}
                    <span className={`rounded-md px-1.5 py-0.5 text-[11px] ${activo ? "bg-white/15 text-white" : Number(r.activas) > 0 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{Number(r.activas) || 0}</span>
                  </button>
                );
              })}
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
            {msg ? (
              <Aviso tipo={msg.tipo} className="mb-4">
                {msg.texto}
              </Aviso>
            ) : null}

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
              {/* ── Lista ── */}
              <section>
                <div className="flex items-end justify-between gap-2">
                  <h3 className="text-[13px] font-extrabold uppercase tracking-wide text-slate-500">
                    {bandera} {nombrePais(filtro)} · {lista.length} {lista.length === 1 ? "cuenta" : "cuentas"}
                  </h3>
                  <button type="button" className={`${btnChico} ${btnSuave}`} onClick={cargar} disabled={cargando}>
                    <i className={`bx bx-refresh ${cargando ? "animate-spin" : ""}`} /> Refrescar
                  </button>
                </div>

                {error ? (
                  <Aviso tipo="error" className="mt-3">
                    {error}
                  </Aviso>
                ) : null}

                {!cargando && !error && lista.length === 0 ? (
                  <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-[13px] text-slate-600">
                    {res.respaldo ? (
                      <>
                        <b className="text-slate-800">Sin cuentas registradas.</b> Mientras tanto {nombrePais(filtro)} se sigue leyendo con la integración Dropi de la configuración {res.respaldo} de ChatCenter. Registra una cuenta a la derecha para dejar de depender de ella.
                      </>
                    ) : (
                      <>
                        <b className="text-slate-800">{nombrePais(filtro)} todavía no se mapea.</b> Registra a la derecha el correo y el token de una cuenta de Dropi {nombrePais(filtro)} y el recolector empieza en la próxima foto automática.
                      </>
                    )}
                  </div>
                ) : null}

                <ul className="mt-3 space-y-2.5">
                  {lista.map((c) => {
                    const est = estadoDe(c);
                    const ocup = (a) => ocupado === `fila-${c.id}-${a}`;
                    const activa = Number(c.activa) === 1;
                    return (
                      <li key={c.id} className={`rounded-2xl border p-3.5 ${activa ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50 opacity-80"}`}>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <b className="truncate text-[14px] text-slate-900">{c.correo}</b>
                              <Etiqueta tono={est.tono}>
                                <i className={`bx ${est.icono}`} /> {est.texto}
                              </Etiqueta>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-slate-500">
                              {c.etiqueta ? <span className="text-slate-700">{c.etiqueta}</span> : null}
                              <span className="font-mono">token ····{c.token_last4 || "????"}</span>
                              <span title={c.ultimo_uso ? fmtFecha(c.ultimo_uso) : ""}>uso: {c.ultimo_uso ? haceCuanto(c.ultimo_uso) : "nunca"}</span>
                              <span>{Number(c.pasadas) || 0} fotos completas</span>
                            </div>
                            {est.tono === "rose" && c.ultimo_error ? (
                              <p className="mt-1.5 rounded-lg bg-rose-50 px-2 py-1 text-[12px] text-rose-700" title={fmtFecha(c.ultimo_error_en)}>
                                {c.ultimo_error}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-1.5">
                            <button type="button" className={`${btnChico} ${btnSuave}`} onClick={() => accionFila(c, "probar")} disabled={!!ocupado} title="Lee una página chica del catálogo con este token">
                              <i className={`bx ${ocup("probar") ? "bx-loader-alt animate-spin" : "bx-test-tube"}`} /> Probar
                            </button>
                            <button type="button" className={`${btnChico} ${btnSuave}`} onClick={() => accionFila(c, activa ? "desactivar" : "activar")} disabled={!!ocupado} title={activa ? "Sacarla del turno sin borrarla" : "Volver a usarla"}>
                              <i className={`bx ${ocup("activar") || ocup("desactivar") ? "bx-loader-alt animate-spin" : activa ? "bx-pause" : "bx-play"}`} /> {activa ? "Pausar" : "Activar"}
                            </button>
                            <button type="button" className={`${btnChico} ${confirmar === c.id ? "bg-rose-600 text-white hover:bg-rose-700" : btnSuave}`} onClick={() => accionFila(c, "eliminar")} disabled={!!ocupado} title="Borra la cuenta y su token">
                              <i className={`bx ${ocup("eliminar") ? "bx-loader-alt animate-spin" : "bx-trash"}`} /> {confirmar === c.id ? "¿Seguro? Eliminar" : "Eliminar"}
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>

              {/* ── Formulario ── */}
              <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <h3 className="text-[13px] font-extrabold uppercase tracking-wide text-slate-500">Agregar cuenta</h3>
                <form onSubmit={guardar} className="mt-3 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Campo label="País de la cuenta">
                      <select className={select} value={form.pais} onChange={(e) => { setForm((f) => ({ ...f, pais: e.target.value })); setPrueba(null); }}>
                        {PAISES_CUENTA.map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.nombre} ({DOMINIO_DROPI[p.code]})
                          </option>
                        ))}
                      </select>
                    </Campo>
                    <Campo label="Etiqueta (opcional)">
                      <input className={input} value={form.etiqueta} onChange={(e) => setForm((f) => ({ ...f, etiqueta: e.target.value }))} placeholder="Global Outlet, Tienda 2…" maxLength={120} />
                    </Campo>
                  </div>
                  <Campo label="Correo con el que entra a Dropi">
                    <input className={input} type="email" value={form.correo} onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))} placeholder="cuenta@correo.com" autoComplete="off" required />
                  </Campo>
                  <Campo label="Token de integración">
                    <div className="relative">
                      <textarea
                        className={`${input} h-24 resize-none py-2 pr-11 font-mono text-[12px] leading-5 ${verToken ? "" : "[-webkit-text-security:disc]"}`}
                        value={form.token}
                        onChange={(e) => { setForm((f) => ({ ...f, token: e.target.value })); setPrueba(null); }}
                        placeholder="Pega aquí el token generado en Dropi"
                        autoComplete="off"
                        spellCheck={false}
                        required
                      />
                      <button type="button" className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-200" onClick={() => setVerToken((v) => !v)} aria-label={verToken ? "Ocultar token" : "Mostrar token"}>
                        <i className={`bx ${verToken ? "bx-hide" : "bx-show"}`} />
                      </button>
                    </div>
                  </Campo>
                  <p className="text-[12px] leading-5 text-slate-500">
                    En Dropi, con esa cuenta: <b>Integraciones</b> → crear una integración → copiar el <b>token</b>. Es el mismo token que un cliente pega al conectar Dropi en ChatCenter. Solo sirve para leer el catálogo de ese país.
                  </p>

                  {prueba ? (
                    <Aviso tipo={prueba.ok ? "ok" : "error"}>
                      {prueba.texto}
                      {prueba.detalle ? <span className="mt-1 block text-[11px] opacity-80">{prueba.detalle}</span> : null}
                    </Aviso>
                  ) : null}

                  <div className="flex flex-wrap justify-end gap-2 pt-1">
                    <button type="button" className={btnSuave} onClick={probarNueva} disabled={!!ocupado || !form.token.trim()} title="Lee una página chica del catálogo con este token antes de guardarlo">
                      <i className={`bx ${ocupado === "probar" ? "bx-loader-alt animate-spin" : "bx-test-tube"}`} /> Probar token
                    </button>
                    <button type="submit" className={btnPrimario} disabled={!!ocupado || !form.correo.trim() || !form.token.trim()}>
                      <i className={`bx ${ocupado === "guardar" ? "bx-loader-alt animate-spin" : "bx-save"}`} /> Guardar cuenta
                    </button>
                  </div>
                </form>
              </section>
            </div>

            <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-[12.5px] leading-5 text-slate-600 md:grid-cols-3">
              <div>
                <b className="text-slate-800">Turno.</b> Si un país tiene varias cuentas activas, cada foto usa la que lleva más tiempo sin usarse; la que falló va al final hasta que vuelva a responder.
              </div>
              <div>
                <b className="text-slate-800">Seguridad.</b> El token se cifra con la misma llave que las integraciones de los clientes y nunca vuelve al navegador. Solo super administradores entran aquí.
              </div>
              <div>
                <b className="text-slate-800">Horario.</b> Fotos automáticas dos veces al día: EC 02:15 y 12:15, MX 02:52 y 12:52, CO 04:05 y 14:05 (hora local). Un país sin cuenta activa no se fotografía.
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${TOKENS.sky}, ${TOKENS.cyan})` }} />
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
