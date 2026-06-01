import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import chatApi from "../../../api/chatcenter";
import CopyBtn from "./shared/CopyBtn";
import { decode, fmtDate } from "./utils";
import DrawerDetalle from "../usuarios/DrawerDetalle";

export default function ClienteListDrawer({
  categoria,
  titulo,
  color,
  onClose,
}) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  // Drawer detalle anidado
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleData, setDetalleData] = useState(null);
  const [detalleLoading, setDetalleLoading] = useState(false);

  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && !detalleOpen && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose, detalleOpen]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await chatApi.get(
          `admin_dashboard/clientes_por_categoria?categoria=${categoria}&limit=200`,
        );
        setRows(data.data || []);
      } catch {
        toast.error("Error cargando lista");
      } finally {
        setLoading(false);
      }
    })();
  }, [categoria]);

  const abrirDetalle = async (id_usuario) => {
    setDetalleOpen(true);
    setDetalleLoading(true);
    setDetalleData(null);
    try {
      const { data } = await chatApi.get(
        `admin_usuarios/detalle/${id_usuario}`,
      );
      setDetalleData(data.data);
    } catch {
      toast.error("No se pudo cargar el detalle");
      setDetalleOpen(false);
    } finally {
      setDetalleLoading(false);
    }
  };

  const headerCls =
    {
      emerald: "from-emerald-600 to-emerald-700",
      cyan: "from-cyan-600 to-cyan-700",
      amber: "from-amber-600 to-amber-700",
      violet: "from-violet-600 to-violet-700",
      sky: "from-sky-600 to-sky-700",
      pink: "from-pink-600 to-pink-700",
      slate: "from-slate-700 to-slate-800",
      orange: "from-orange-600 to-orange-700",
      rose: "from-rose-600 to-rose-700",
    }[color] || "from-slate-700 to-slate-800";

  return (
    <>
      <div className="fixed inset-0 z-50" role="dialog">
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <aside className="absolute top-0 right-0 h-full w-full max-w-3xl bg-slate-50 shadow-2xl flex flex-col overflow-hidden">
          <div
            className={`bg-gradient-to-br ${headerCls} text-white px-5 py-4 flex items-start justify-between shadow-md flex-shrink-0`}
          >
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold uppercase tracking-wider opacity-80">
                Lista de clientes
              </div>
              <h2 className="text-xl font-extrabold mt-1 truncate">{titulo}</h2>
              <div className="text-xs opacity-80 mt-1">
                {loading
                  ? "Cargando…"
                  : `${rows.length} cliente${rows.length !== 1 ? "s" : ""} encontrado${rows.length !== 1 ? "s" : ""}`}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 transition"
            >
              <i className="bx bx-x text-2xl" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="text-center py-16 text-slate-400">
                <i className="bx bx-loader-alt bx-spin text-4xl" />
                <p className="mt-2 text-sm">Cargando…</p>
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <i className="bx bx-search-alt text-4xl" />
                <p className="mt-2 text-sm">
                  No hay clientes en esta categoría
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {rows.map((c) => (
                  <div
                    key={c.id_usuario}
                    onClick={() => abrirDetalle(c.id_usuario)}
                    className="bg-white rounded-lg border border-slate-200 p-3 hover:shadow-md hover:border-cyan-300 cursor-pointer transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                          {decode(c.empresa)}
                          {c.permanente === 1 && (
                            <i
                              className="bx bxs-crown text-violet-500"
                              title="Cortesía VIP"
                            />
                          )}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 min-w-0 mt-0.5">
                          <i className="bx bx-envelope text-slate-400 flex-shrink-0" />
                          <span className="truncate">{c.email}</span>
                          <CopyBtn text={c.email} label="Email copiado" />
                        </div>
                        {c.telefono_principal && (
                          <div className="text-xs text-slate-600 flex items-center gap-1.5 mt-1">
                            <i className="bx bx-phone text-slate-400 flex-shrink-0" />
                            <span className="font-mono">
                              {c.telefono_principal}
                            </span>
                            <CopyBtn
                              text={c.telefono_principal}
                              label="Teléfono copiado"
                            />
                          </div>
                        )}
                        <div className="flex items-center flex-wrap gap-2 mt-2">
                          {c.nombre_plan && (
                            <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                              {c.nombre_plan} · ${c.precio_plan}
                              {c.id_plan === 21 && (
                                <span className="text-amber-600 ml-1">
                                  (periodo variable)
                                </span>
                              )}
                            </span>
                          )}
                          {c.stripe_subscription_status && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                c.stripe_subscription_status === "active"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : c.stripe_subscription_status === "trialing"
                                    ? "bg-cyan-100 text-cyan-700"
                                    : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              Stripe: {c.stripe_subscription_status}
                            </span>
                          )}
                          {c.cancel_at_period_end === 1 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                              ⚠ Cancel. programada
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {c.dias_para_vencer != null && c.fecha_renovacion && (
                          <div>
                            <div
                              className={`text-lg font-extrabold font-mono ${
                                c.dias_para_vencer < 0
                                  ? "text-rose-600"
                                  : c.dias_para_vencer <= 7
                                    ? "text-amber-600"
                                    : c.dias_para_vencer <= 30
                                      ? "text-cyan-600"
                                      : "text-slate-600"
                              }`}
                            >
                              {c.dias_para_vencer < 0
                                ? `${Math.abs(c.dias_para_vencer)}d`
                                : `${c.dias_para_vencer}d`}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {c.dias_para_vencer < 0
                                ? "vencido"
                                : "para vencer"}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                              {fmtDate(c.fecha_renovacion)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                      <span>
                        ID #{c.id_usuario} · Inicio: {fmtDate(c.fecha_inicio)}
                      </span>
                      {c.ultimo_mensaje && (
                        <span>
                          <i className="bx bx-message-rounded-dots" /> Últ.
                          mensaje: {fmtDate(c.ultimo_mensaje)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-slate-200 text-center text-xs text-slate-500">
              <i className="bx bx-info-circle" /> Click en cualquier cliente
              para abrir su ficha completa con seguimientos
            </div>
          </div>
        </aside>
      </div>

      {/* Drawer anidado: detalle del cliente con tabs Detalle + Seguimientos */}
      {detalleOpen && (
        <DrawerDetalle
          loading={detalleLoading}
          data={detalleData}
          onClose={() => setDetalleOpen(false)}
        />
      )}
    </>
  );
}
