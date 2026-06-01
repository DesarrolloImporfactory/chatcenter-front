import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import chatApi from "../../../../api/chatcenter";
import Section from "../shared/Section";
import CopyBtn from "../shared/CopyBtn";
import { fmtDate, mesLabel, decode } from "../utils";
import DrawerDetalle from "../../usuarios/DrawerDetalle";

function MesSelect({ value, onChange }) {
  const opciones = useMemo(() => {
    const arr = [];
    const d = new Date();
    for (let i = 0; i < 12; i++) {
      const dd = new Date(d.getFullYear(), d.getMonth() - i, 1);
      arr.push(
        `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}`,
      );
    }
    return arr;
  }, []);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-cyan-500"
    >
      {opciones.map((o) => (
        <option key={o} value={o}>
          {mesLabel(o)}
        </option>
      ))}
    </select>
  );
}

export default function CancelacionesTable({ rows, mesCancel, setMesCancel }) {
  // Drawer detalle
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleData, setDetalleData] = useState(null);
  const [detalleLoading, setDetalleLoading] = useState(false);

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

  return (
    <Section
      icon="bx-user-minus"
      title="Cancelaciones del mes"
      subtitle={`${rows.length} cliente${rows.length !== 1 ? "s" : ""} en ${mesLabel(mesCancel)}`}
    >
      <div className="flex justify-end mb-3">
        <MesSelect value={mesCancel} onChange={setMesCancel} />
      </div>
      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <i className="bx bx-check-shield text-4xl text-emerald-300" />
          <p className="mt-2 text-sm text-slate-500">
            Sin cancelaciones este mes.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Cliente / Contacto</th>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-center">Días vivido</th>
                <th className="px-4 py-3 text-center">Tipo</th>
                <th className="px-4 py-3 text-left">Motivo</th>
                <th className="px-4 py-3 text-center">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((c) => (
                <tr
                  key={c.id_usuario}
                  onClick={() => abrirDetalle(c.id_usuario)}
                  className="hover:bg-cyan-50/40 cursor-pointer transition"
                >
                  <td className="px-4 py-3 min-w-[280px]">
                    <div className="font-bold text-slate-900">
                      {decode(c.empresa)}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
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
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {c.nombre_plan ? (
                      <>
                        <div className="font-semibold text-slate-700">
                          {c.nombre_plan}
                        </div>
                        <div className="text-slate-400 font-mono">
                          ${c.precio_plan}
                        </div>
                      </>
                    ) : (
                      <span className="text-slate-400 italic">sin plan</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`font-mono font-bold text-base ${
                        c.dias_de_vida < 30
                          ? "text-rose-600"
                          : c.dias_de_vida < 90
                            ? "text-amber-600"
                            : "text-slate-600"
                      }`}
                    >
                      {c.dias_de_vida}d
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.cancel_at_period_end === 1 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                        <i className="bx bx-time" /> Programada
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 ring-1 ring-rose-200">
                        <i className="bx bx-x-circle" /> Cancelada
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {c.motivo_cancelacion ? (
                      <div>
                        <div className="font-semibold text-slate-700">
                          {c.motivo_cancelacion}
                        </div>
                        {c.motivo_detalle && (
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">
                            {c.motivo_detalle}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">
                        Sin registrar — click para gestionar
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-slate-500 font-mono">
                    {fmtDate(c.canceled_at || c.cancel_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Drawer detalle con tabs Detalle + Seguimientos */}
      {detalleOpen && (
        <DrawerDetalle
          loading={detalleLoading}
          data={detalleData}
          onClose={() => setDetalleOpen(false)}
        />
      )}
    </Section>
  );
}
