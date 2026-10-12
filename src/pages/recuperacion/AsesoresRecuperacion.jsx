import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";
import { fmtFecha, inicialesDe } from "./recuperacionUtils";

/**
 * Quién ve /recuperacion (solo lo administra el super admin). Se agrega por
 * el correo del subusuario; si el correo tiene cuenta en varias empresas se
 * agregan todas. Los internos (super_administrador y gestor_clientes) entran
 * siempre y se listan solo para que se sepa.
 */
export default function AsesoresRecuperacion() {
  const [data, setData] = useState(null);
  const [email, setEmail] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const { data: r } = await chatApi.get("recuperacion/asesores");
      setData(r.data);
    } catch (e) {
      toast.error(e?.response?.data?.message || "No se pudieron cargar los asesores");
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const agregar = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setGuardando(true);
    try {
      const { data: r } = await chatApi.post("recuperacion/asesores", { email: email.trim() });
      toast.success(`Agregado: ${(r.data || []).map((s) => s.nombre_encargado || s.email).join(", ")}`);
      setEmail("");
      cargar();
    } catch (err) {
      toast.error(err?.response?.data?.message || "No se pudo agregar");
    } finally {
      setGuardando(false);
    }
  };

  const toggle = async (a) => {
    try {
      await chatApi.patch(`recuperacion/asesores/${a.id_sub_usuario}`, { activo: !a.activo });
      cargar();
    } catch (err) {
      toast.error(err?.response?.data?.message || "No se pudo cambiar");
    }
  };

  const quitar = async (a) => {
    const r = await Swal.fire({
      title: "¿Quitar acceso?",
      text: `${a.nombre || a.email} dejará de ver Recuperación de clientes. Sus seguimientos registrados se conservan.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e11d48",
      confirmButtonText: "Sí, quitar",
      cancelButtonText: "Cancelar",
    });
    if (!r.isConfirmed) return;
    try {
      await chatApi.delete(`recuperacion/asesores/${a.id_sub_usuario}`);
      toast.success("Acceso quitado");
      cargar();
    } catch (err) {
      toast.error(err?.response?.data?.message || "No se pudo quitar");
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="text-sm font-bold text-slate-800">Agregar asesor</div>
        <p className="text-xs text-slate-500 mb-3">
          Escribe el correo con el que el subusuario entra a ImporChat. No cambia su rol ni lo que ve en su
          propia cuenta: solo le abre esta pantalla y el historial de seguimientos.
        </p>
        <form onSubmit={agregar} className="flex items-center gap-2 flex-wrap">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@empresa.com"
            className="flex-1 min-w-[260px] px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <button
            type="submit"
            disabled={guardando || !email.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-semibold hover:bg-cyan-700 disabled:opacity-50"
          >
            <i className={`bx ${guardando ? "bx-loader-alt bx-spin" : "bx-user-plus"}`} /> Dar acceso
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <div className="px-4 py-3 border-b border-slate-100 text-sm font-bold text-slate-800">
          Asesores con acceso ({data?.elegidos?.length ?? 0})
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="text-left px-3 py-2">Asesor</th>
              <th className="text-left px-3 py-2">Cuenta donde trabaja</th>
              <th className="text-left px-3 py-2">Rol en su cuenta</th>
              <th className="text-left px-3 py-2">Desde</th>
              <th className="text-center px-3 py-2">Activo</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(data?.elegidos || []).map((a) => (
              <tr key={a.id_sub_usuario} className={a.activo ? "hover:bg-slate-50" : "opacity-60"}>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-8 w-8 rounded-full bg-cyan-100 text-cyan-800 text-[11px] font-bold flex items-center justify-center">
                      {inicialesDe(a.nombre)}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900">{a.nombre || "—"}</div>
                      <div className="text-xs text-slate-500">{a.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-xs text-slate-700">{a.cuenta || "—"}</td>
                <td className="px-3 py-2 text-xs text-slate-700">{a.rol || "—"}</td>
                <td className="px-3 py-2 text-xs text-slate-600">{fmtFecha(a.created_at)}</td>
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => toggle(a)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${a.activo ? "bg-emerald-500" : "bg-slate-300"}`}
                    title={a.activo ? "Desactivar" : "Activar"}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${a.activo ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => quitar(a)} className="p-1.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600" title="Quitar">
                    <i className="bx bx-trash" />
                  </button>
                </td>
              </tr>
            ))}
            {data && !data.elegidos.length && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-500">Todavía no has agregado asesores.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="text-sm font-bold text-slate-800">Entran siempre (equipo interno)</div>
          <p className="text-xs text-slate-500">Super administrador y gestores de clientes. Se administran desde los roles de subusuario.</p>
        </div>
        <ul className="divide-y divide-slate-100">
          {(data?.internos || []).map((i) => (
            <li key={i.id_sub_usuario} className="px-4 py-2 text-xs flex items-center justify-between">
              <span className="text-slate-800 font-semibold">{i.nombre || i.email}</span>
              <span className="text-slate-500">{i.email} · {i.rol}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
