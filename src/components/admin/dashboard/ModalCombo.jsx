import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import chatApi from "../../../api/chatcenter";
import { money0, money2, fmtDate } from "./utils";

/**
 * Activar un combo vendido por fuera (Combo Implementación: $297, 6 meses de
 * ImporChat e ImporKiller) a un correo. Primero se revisa qué pasaría con esa
 * cuenta y recién después se confirma: el back decide igual en los dos pasos
 * (services/combos.service.js).
 */

const CASOS = {
  sub_viva: {
    titulo: "Tiene suscripción activa",
    texto:
      "Se actualiza su suscripción: prueba gratis hasta la fecha indicada y el complemento agregado. Conserva su tarjeta y lo demás.",
    cls: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    icon: "bx-check-shield",
  },
  con_tarjeta: {
    titulo: "Sin suscripción, con tarjeta guardada",
    texto:
      "Se crea la suscripción con la prueba gratis usando la tarjeta que ya tiene.",
    cls: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    icon: "bx-credit-card",
  },
  sin_tarjeta: {
    titulo: "Sin tarjeta registrada",
    texto:
      "Entra de inmediato con el plan y el complemento. La tarjeta se le pide al crear su primera conexión.",
    cls: "bg-amber-50 text-amber-800 ring-amber-200",
    icon: "bx-time-five",
  },
  sin_cuenta: {
    titulo: "Todavía no tiene cuenta",
    texto:
      "El combo queda guardado para este correo y se activa solo cuando se registre.",
    cls: "bg-cyan-50 text-cyan-800 ring-cyan-200",
    icon: "bx-user-plus",
  },
  permanente: {
    titulo: "Cuenta permanente",
    texto: "Ya tiene acceso sin cobro. No hay nada que activar.",
    cls: "bg-slate-100 text-slate-700 ring-slate-200",
    icon: "bx-infinite",
  },
};

const ESTADOS = {
  aplicado: { label: "Activado", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  pendiente_tarjeta: { label: "Falta tarjeta", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  pendiente_cuenta: { label: "Falta registrarse", cls: "bg-cyan-50 text-cyan-700 ring-cyan-200" },
  anulado: { label: "Anulado", cls: "bg-slate-100 text-slate-500 ring-slate-200" },
};

function Dato({ label, children }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="text-sm font-semibold text-slate-900">{children}</div>
    </div>
  );
}

export default function ModalCombo({ onClose }) {
  const [catalogo, setCatalogo] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [otorgados, setOtorgados] = useState([]);
  const [clave, setClave] = useState("implementacion_297");
  const [email, setEmail] = useState("");
  const [idPlan, setIdPlan] = useState("");
  const [desde, setDesde] = useState("hoy");
  const [previa, setPrevia] = useState(null);
  const [revisando, setRevisando] = useState(false);
  const [activando, setActivando] = useState(false);
  const [repetir, setRepetir] = useState(false);

  const combo = catalogo.find((c) => c.clave === clave) || null;

  const cargar = useCallback(async () => {
    try {
      const { data } = await chatApi.get("admin_usuarios/combos");
      setCatalogo(data.data.catalogo || []);
      setPlanes(data.data.planes || []);
      setOtorgados(data.data.otorgados || []);
    } catch (e) {
      toast.error(
        e?.response?.data?.message || "No se pudieron cargar los combos",
      );
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cuerpo = (extra = {}) => ({
    clave,
    email: email.trim().toLowerCase(),
    desde,
    ...(idPlan ? { id_plan: Number(idPlan) } : {}),
    ...extra,
  });

  const revisar = async (opciones = {}) => {
    if (!email.trim()) {
      toast.error("Escribe el correo del cliente");
      return;
    }
    setRevisando(true);
    try {
      const { data } = await chatApi.post(
        "admin_usuarios/combos/previa",
        cuerpo(opciones),
      );
      setPrevia(data.data);
      setRepetir(false);
    } catch (e) {
      setPrevia(null);
      toast.error(e?.response?.data?.message || "No se pudo revisar la cuenta");
    } finally {
      setRevisando(false);
    }
  };

  // Cambiar plan o forma de contar vuelve a pedir la vista previa: la fecha y
  // el cobro posterior dependen de eso.
  const cambiarOpcion = (campo, valor) => {
    if (campo === "plan") setIdPlan(valor);
    else setDesde(valor);
    if (!previa) return;
    revisar(
      campo === "plan"
        ? { id_plan: valor ? Number(valor) : undefined }
        : { desde: valor },
    );
  };

  const activar = async () => {
    setActivando(true);
    try {
      const { data } = await chatApi.post(
        "admin_usuarios/combos/otorgar",
        cuerpo({ repetir }),
      );
      toast.success(data.message || "Combo activado");
      setPrevia(null);
      setEmail("");
      setIdPlan("");
      setDesde("hoy");
      await cargar();
    } catch (e) {
      toast.error(e?.response?.data?.message || "No se pudo activar el combo");
    } finally {
      setActivando(false);
    }
  };

  const anular = async (id) => {
    try {
      await chatApi.post("admin_usuarios/combos/anular", { id });
      toast.success("Combo anulado");
      await cargar();
    } catch (e) {
      toast.error(e?.response?.data?.message || "No se pudo anular");
    }
  };

  const caso = previa ? CASOS[previa.caso] : null;
  const yaOtorgado = (previa?.previos || []).length > 0;
  const pendientePrevio = (previa?.previos || []).some(
    (p) => p.estado !== "aplicado",
  );
  const puedeActivar =
    previa &&
    previa.caso !== "permanente" &&
    !pendientePrevio &&
    (!yaOtorgado || repetir);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-start justify-center overflow-y-auto p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-cyan-700">
              <i className="bx bx-gift" /> Combos
            </div>
            <h2 className="mt-0.5 text-xl font-extrabold text-slate-900">
              Activar combo a un cliente
            </h2>
            <p className="text-sm text-slate-500">
              Para quien ya pagó el combo por fuera de la plataforma.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-2xl leading-none"
            aria-label="Cerrar"
          >
            <i className="bx bx-x" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {combo && (
            <div className="rounded-xl bg-slate-900 text-white px-4 py-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="font-extrabold">{combo.nombre}</div>
                <div className="text-sm font-bold text-cyan-300">
                  {money0(combo.precio)} · pago único
                </div>
              </div>
              <ul className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs text-white/80">
                {combo.incluye.map((t) => (
                  <li key={t} className="flex items-start gap-1.5">
                    <i className="bx bx-check text-cyan-300 text-sm" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {catalogo.length > 1 && (
            <select
              value={clave}
              onChange={(e) => {
                setClave(e.target.value);
                setPrevia(null);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              {catalogo.map((c) => (
                <option key={c.clave} value={c.clave}>
                  {c.nombre} · {money0(c.precio)}
                </option>
              ))}
            </select>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              revisar();
            }}
            className="flex gap-2 flex-wrap"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setPrevia(null);
              }}
              placeholder="Correo con el que compró"
              className="flex-1 min-w-[220px] px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <button
              type="submit"
              disabled={revisando}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 disabled:opacity-50"
            >
              <i
                className={`bx ${revisando ? "bx-loader-alt bx-spin" : "bx-search"}`}
              />
              Revisar cuenta
            </button>
          </form>

          {previa && caso && (
            <div className="space-y-4">
              <div
                className={`rounded-xl ring-1 px-4 py-3 flex items-start gap-3 ${caso.cls}`}
              >
                <i className={`bx ${caso.icon} text-2xl`} />
                <div>
                  <div className="font-bold">{caso.titulo}</div>
                  <div className="text-sm opacity-90">{caso.texto}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Dato label="Cuenta">
                  {previa.cuenta
                    ? `${previa.cuenta.nombre || "Sin nombre"} (#${previa.cuenta.id_usuario})`
                    : "No existe"}
                </Dato>
                <Dato label="Plan actual">
                  {previa.cuenta?.plan_actual || "—"}
                </Dato>
                <Dato label="Tarjeta">
                  {previa.tarjeta
                    ? `${previa.tarjeta.marca} ${previa.tarjeta.ultimos4}`
                    : "Sin tarjeta"}
                </Dato>
                <Dato label="Hoy tiene cubierto hasta">
                  {previa.cubierto_hasta ? fmtDate(previa.cubierto_hasta) : "—"}
                </Dato>
                <Dato label="Gratis hasta">
                  {previa.gratis_hasta
                    ? fmtDate(previa.gratis_hasta)
                    : `${previa.combo.meses} meses desde que registre la tarjeta`}
                </Dato>
                <Dato label="Después paga">
                  {money2(previa.cobro_mensual_despues)}/mes
                </Dato>
              </div>

              {previa.caso !== "permanente" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">
                      Plan que se le deja
                    </span>
                    <select
                      value={idPlan}
                      onChange={(e) => cambiarOpcion("plan", e.target.value)}
                      disabled={revisando}
                      className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                    >
                      <option value="">
                        Automático: {previa.plan.nombre} (
                        {money0(previa.plan.precio)}/mes)
                      </option>
                      {planes.map((p) => (
                        <option key={p.id_plan} value={p.id_plan}>
                          {p.nombre_plan} · {money0(p.precio_plan)}/mes
                        </option>
                      ))}
                    </select>
                  </label>
                  {previa.caso === "sub_viva" && previa.cubierto_hasta && (
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-600">
                        Los {previa.combo.meses} meses cuentan
                      </span>
                      <select
                        value={desde}
                        onChange={(e) => cambiarOpcion("desde", e.target.value)}
                        disabled={revisando}
                        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                      >
                        <option value="hoy">Desde hoy</option>
                        <option value="sumar">
                          Sumados a lo que ya tiene cubierto
                        </option>
                      </select>
                    </label>
                  )}
                </div>
              )}

              {previa.avisos?.length > 0 && (
                <ul className="space-y-1.5">
                  {previa.avisos.map((a) => (
                    <li
                      key={a}
                      className="text-xs bg-amber-50 text-amber-900 ring-1 ring-amber-200 rounded-lg px-3 py-2 flex items-start gap-2"
                    >
                      <i className="bx bx-info-circle text-sm mt-0.5" />
                      {a}
                    </li>
                  ))}
                </ul>
              )}

              {yaOtorgado && !pendientePrevio && (
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={repetir}
                    onChange={(e) => setRepetir(e.target.checked)}
                  />
                  Ya se le otorgó antes; quiero activarlo otra vez.
                </label>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setPrevia(null)}
                  className="px-4 py-2 rounded-lg bg-white text-slate-700 ring-1 ring-slate-200 font-semibold text-sm hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={activar}
                  disabled={!puedeActivar || activando || revisando}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-white font-semibold text-sm hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i
                    className={`bx ${activando ? "bx-loader-alt bx-spin" : "bx-gift"}`}
                  />
                  {activando ? "Activando…" : "Activar combo"}
                </button>
              </div>
            </div>
          )}

          <div>
            <div className="text-sm font-bold text-slate-900 mb-2">
              Combos activados ({otorgados.length})
            </div>
            {otorgados.length === 0 ? (
              <p className="text-sm text-slate-500">
                Todavía no se ha activado ninguno.
              </p>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-xs min-w-[620px]">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <th className="px-3 py-2 font-bold">Cliente</th>
                      <th className="px-3 py-2 font-bold">Estado</th>
                      <th className="px-3 py-2 font-bold">Plan</th>
                      <th className="px-3 py-2 font-bold">Gratis hasta</th>
                      <th className="px-3 py-2 font-bold">Activó</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {otorgados.map((o) => {
                      const est = ESTADOS[o.estado] || ESTADOS.anulado;
                      return (
                        <tr key={o.id}>
                          <td className="px-3 py-2">
                            <div className="font-semibold text-slate-900">
                              {o.cuenta_nombre || o.email}
                            </div>
                            {o.cuenta_nombre && (
                              <div className="text-slate-500">{o.email}</div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded font-bold ring-1 ${est.cls}`}
                            >
                              {est.label}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {o.nombre_plan || "—"}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {o.estado === "aplicado"
                              ? fmtDate(o.gratis_hasta)
                              : "—"}
                          </td>
                          <td className="px-3 py-2 text-slate-500">
                            {o.otorgado_por_nombre || "—"}
                            <div>{fmtDate(o.created_at)}</div>
                          </td>
                          <td className="px-3 py-2 text-right">
                            {(o.estado === "pendiente_cuenta" ||
                              o.estado === "pendiente_tarjeta") && (
                              <button
                                onClick={() => anular(o.id)}
                                className="font-semibold text-rose-600 hover:text-rose-800"
                              >
                                Anular
                              </button>
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
      </div>
    </div>
  );
}
