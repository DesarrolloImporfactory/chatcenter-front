import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import chatApi from "../../api/chatcenter";
import SeguimientosTab from "../../components/admin/dashboard/seguimientos/SeguimientosTab";
import { COHORTE_UI, ESTADO_CASO, money, fmtFecha, fmtFechaHora, num, irAlChatExpertos } from "./recuperacionUtils";

const ESTADO_CUENTA = {
  activo: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  suspendido: "bg-rose-50 text-rose-700 ring-rose-200",
  vencido: "bg-orange-50 text-orange-700 ring-orange-200",
  cancelado: "bg-slate-100 text-slate-700 ring-slate-200",
  inactivo: "bg-slate-100 text-slate-600 ring-slate-200",
};

function Dato({ label, children }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-sm text-slate-800">{children ?? "—"}</div>
    </div>
  );
}

/**
 * Ficha del cliente para los asesores de recuperación: datos de la cuenta,
 * casos (abiertos y cerrados) y el historial de seguimientos con su
 * formulario. No usa el drawer del panel de usuarios porque ese endpoint
 * exige gestor_clientes.
 */
async function abrirChatExpertos(id_usuario) {
  try {
    const { data } = await chatApi.post(`recuperacion/casos/${id_usuario}/abrir-chat-expertos`, {});
    const d = data.data;
    irAlChatExpertos(d);
  } catch (e) {
    toast.error(e?.response?.data?.message || "No se pudo abrir el chat desde Expertos");
  }
}

export default function DrawerClienteRecuperacion({ id_usuario, permisos, expertos, onClose, onCambio }) {
  const [ficha, setFicha] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let vivo = true;
    setLoading(true);
    chatApi
      .get(`recuperacion/cliente/${id_usuario}`)
      .then(({ data }) => vivo && setFicha(data.data))
      .catch((e) => toast.error(e?.response?.data?.message || "No se pudo cargar la ficha"))
      .finally(() => vivo && setLoading(false));
    return () => {
      vivo = false;
    };
  }, [id_usuario]);

  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const casoAbierto = ficha?.casos?.find((c) => c.estado === "abierto") || null;

  return (
    <div className="fixed inset-0 z-[55] flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="relative h-full w-full max-w-2xl bg-slate-50 shadow-2xl flex flex-col overflow-hidden">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white px-5 py-4 flex items-start justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-wider opacity-70">Cliente #{id_usuario}</div>
            <h2 className="text-lg font-extrabold truncate">{ficha?.empresa || ficha?.email || "Cargando…"}</h2>
            {ficha?.email && <div className="text-xs opacity-80">{ficha.email}</div>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10">
            <i className="bx bx-x text-2xl" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && (
            <div className="py-10 text-center text-slate-400">
              <i className="bx bx-loader-alt bx-spin text-3xl" />
            </div>
          )}

          {ficha && (
            <>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ring-1 ${ESTADO_CUENTA[ficha.estado] || ESTADO_CUENTA.inactivo}`}>
                    Cuenta {ficha.estado}
                  </span>
                  {ficha.stripe_status && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold ring-1 bg-slate-100 text-slate-700 ring-slate-200">
                      Stripe: {ficha.stripe_status}
                    </span>
                  )}
                  {Number(ficha.cancel_at_period_end) === 1 && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold ring-1 bg-amber-50 text-amber-700 ring-amber-200">
                      Cancelación programada {ficha.cancel_at ? fmtFecha(ficha.cancel_at) : ""}
                    </span>
                  )}
                  {Number(ficha.permanente) === 1 && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold ring-1 bg-violet-50 text-violet-700 ring-violet-200">
                      Cortesía permanente
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Dato label="Plan">
                    {ficha.nombre_plan || "—"}
                    {ficha.precio_plan != null && <span className="text-slate-500"> · {money(ficha.precio_plan)}/mes</span>}
                  </Dato>
                  <Dato label="Renovación">{fmtFecha(ficha.fecha_renovacion)}</Dato>
                  <Dato label="Cliente desde">{fmtFecha(ficha.fecha_inicio || ficha.registrado_en)}</Dato>
                  <Dato label="Conexiones activas">{num(ficha.conexiones_activas)}</Dato>
                  <Dato label="Subusuarios">{num(ficha.subusuarios)}</Dato>
                  <Dato label={ficha.telefono_fuente === "conexion" ? "Nº de su conexión (bot)" : "WhatsApp personal"}>
                    {ficha.whatsapp_url ? (
                      <>
                        <a href={ficha.whatsapp_url} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline inline-flex items-center gap-1">
                          <i className="bxl bxl-whatsapp" /> {ficha.whatsapp}
                        </a>
                        {ficha.telefono_fuente === "conexion" && (
                          <div className="text-[11px] text-amber-700 leading-tight">
                            No registró número personal. Este es el de su conexión «{ficha.conexion_nombre || "ImporChat"}»: sirve para llamar; un mensaje desde Expertos a un bot puede no llegar.
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-amber-700">Sin número: ni personal ni conexión activa</span>
                    )}
                  </Dato>
                </div>
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <button
                    onClick={() => abrirChatExpertos(id_usuario)}
                    disabled={!expertos?.disponible || !ficha.whatsapp_digits}
                    title={
                      !ficha.whatsapp_digits
                        ? "El cliente no tiene número"
                        : expertos?.disponible
                          ? `Abrir la conversación en «${expertos.nombre}»`
                          : expertos?.motivo || "No disponible"
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <i className="bxl bxl-whatsapp" /> Abrir chat desde Expertos
                  </button>
                  {expertos && !expertos.disponible && (
                    <span className="text-[11px] text-slate-500">{expertos.motivo}</span>
                  )}
                </div>
                {permisos?.es_super && ficha.id_costumer && (
                  <a
                    href={`https://dashboard.stripe.com/customers/${ficha.id_costumer}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-cyan-700"
                  >
                    Ver en Stripe <i className="bx bx-link-external" />
                  </a>
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="text-sm font-bold text-slate-800 mb-2">Casos de recuperación</div>
                {!ficha.casos?.length ? (
                  <p className="text-xs text-slate-500">Este cliente no ha estado en el embudo.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {ficha.casos.map((c) => {
                      const est = ESTADO_CASO[c.estado] || ESTADO_CASO.abierto;
                      const ui = COHORTE_UI[c.cohorte] || COHORTE_UI.manual;
                      return (
                        <li key={c.id_caso} className="text-xs flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ring-1 ${est.cls}`}>{est.label}</span>
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ring-1 ${ui.cls}`}>{c.cohorte.replace(/_/g, " ")}</span>
                          <span className="text-slate-600">
                            abierto {fmtFechaHora(c.abierto_en)}
                            {c.cerrado_en && ` · cerrado ${fmtFechaHora(c.cerrado_en)} por ${c.cerrado_por || "—"}`}
                          </span>
                          {c.asignado_a_nombre && <span className="text-slate-500">· {c.asignado_a_nombre}</span>}
                          {c.monto_plan != null && <span className="text-slate-500">· {money(c.monto_plan)}/mes</span>}
                          {c.cierre_motivo && <span className="text-slate-500 italic">· {c.cierre_motivo}</span>}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {casoAbierto && (
                  <p className="mt-2 text-[11px] text-slate-500">
                    El caso se cierra solo como «recuperado» cuando el cliente vuelve a estar activo, o como
                    «perdido» si queda cancelado. También puedes cerrarlo desde la tabla.
                  </p>
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <SeguimientosTab id_usuario={id_usuario} />
              </div>
            </>
          )}
        </div>
        <div className="border-t border-slate-200 bg-white px-4 py-2 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Los seguimientos que registres aquí se ven también en el panel interno.</span>
          <button onClick={() => { onCambio?.(); onClose(); }} className="font-semibold text-cyan-700 hover:underline">
            Cerrar y actualizar
          </button>
        </div>
      </aside>
    </div>
  );
}
