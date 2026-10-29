import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";

/* ============================================================
   Saldos por cobrar — qué debe el negocio a sus referidores
   ============================================================

   La pantalla de solicitudes solo muestra lo que alguien YA pidió. Esta
   responde dos preguntas que no tenían dónde mirarse:
   · ¿Cuánto debo tener en reserva? Lo disponible (lo pueden pedir hoy) más lo
     reservado en solicitudes abiertas. Lo pendiente madura a los N días.
   · ¿Los clientes usan el programa? Cuántos generaron su enlace, cuántos
     trajeron a alguien y cuántos de verdad están cobrando.
   ============================================================ */

const money = (cent) =>
  `$${((Number(cent) || 0) / 100).toLocaleString("es-EC", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fecha = (v) => {
  if (!v) return "—";
  const d = new Date(String(v).replace(" ", "T"));
  return isNaN(d)
    ? String(v)
    : d.toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
};

const PREF = { credito: "Crédito en su factura", transferencia: "Transferencia" };

const FILTROS = [
  { k: "saldo", label: "Con saldo" },
  { k: "referidos", label: "Con referidos" },
  { k: "todos", label: "Todos los que abrieron Referidos" },
];

const Kpi = ({ label, valor, detalle, color, icon }) => (
  <div className="rounded-2xl bg-white border border-slate-200 p-4">
    <div className="flex items-start justify-between gap-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 leading-tight">{label}</p>
      {icon && <i className={`bx ${icon} text-base text-slate-300`} />}
    </div>
    <p className="text-[1.6rem] font-bold mt-1 tabular-nums leading-none" style={{ color: color || "#1E293B" }}>
      {valor}
    </p>
    {detalle && <p className="text-[11px] text-slate-500 mt-1.5 leading-tight">{detalle}</p>}
  </div>
);

const Monto = ({ cent, fuerte, apagado }) => (
  <span className={`tabular-nums ${fuerte ? "font-bold text-slate-800" : apagado ? "text-slate-400" : "text-slate-700"}`}>
    {Number(cent) > 0 || !apagado ? money(cent) : "—"}
  </span>
);

export default function SaldosReferidoresAdmin() {
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("saldo");
  const [busqueda, setBusqueda] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data: res } = await chatApi.get("referidos/admin/saldos");
      setData(res.data);
    } catch (e) {
      Swal.fire("No se pudo cargar", e?.response?.data?.message || "Inténtalo de nuevo en unos minutos.", "error");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const filas = data?.filas || [];
  const t = data?.totales || {};

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return filas.filter((f) => {
      if (filtro === "saldo" && f.disponible_cent + f.pendiente_cent + f.reservado_cent <= 0) return false;
      if (filtro === "referidos" && f.referidos_total <= 0) return false;
      if (!q) return true;
      return `${f.nombre || ""} ${f.email_propietario || ""} ${f.whatsapp_lead || ""} ${f.codigo_referido || ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [filas, filtro, busqueda]);

  // Si el filtro por defecto queda vacío, no tiene sentido mostrar una tabla
  // vacía con 277 filas escondidas detrás: se abre el siguiente.
  useEffect(() => {
    if (!data) return;
    if (filtro === "saldo" && !filas.some((f) => f.disponible_cent + f.pendiente_cent + f.reservado_cent > 0)) {
      setFiltro("referidos");
    }
  }, [data, filas, filtro]);

  if (cargando) {
    return (
      <div className="p-3 md:p-5 space-y-4 animate-pulse">
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl p-4 bg-white border border-slate-200 h-24" />
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 h-72" />
      </div>
    );
  }

  return (
    <div className="p-3 md:p-5 space-y-4">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Debo tener en reserva"
          valor={money(t.reserva_cent)}
          detalle={`${money(t.disponible_cent)} disponible sin pedir + ${money(t.reservado_cent)} en solicitudes abiertas`}
          color="#4F46E5"
          icon="bx-wallet"
        />
        <Kpi
          label="Por madurar"
          valor={money(t.pendiente_cent)}
          detalle={`Comisiones en retención de ${data?.reglas?.dias_retencion ?? 30} días; después pasan a disponibles`}
          color="#EA580C"
          icon="bx-hourglass"
        />
        <Kpi
          label="Pagado histórico"
          valor={money(t.pagado_cent)}
          detalle={`${money(t.ganado_cent)} ganado en total por ${t.con_saldo ?? 0} referidor${t.con_saldo === 1 ? "" : "es"} con saldo`}
          icon="bx-check-double"
        />
        <Kpi
          label="Usan el programa"
          valor={`${t.con_referidos ?? 0} / ${t.con_codigo ?? 0}`}
          detalle={`${t.con_referidos ?? 0} trajeron a alguien (${t.referidos_total ?? 0} referidos) de ${t.con_codigo ?? 0} que generaron su enlace`}
          color="#0E7490"
          icon="bx-group"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-2 px-3 pt-2 border-b border-slate-200">
          {FILTROS.map((f) => (
            <button
              key={f.k}
              onClick={() => setFiltro(f.k)}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition whitespace-nowrap ${
                filtro === f.k ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {f.label}
            </button>
          ))}
          <div className="relative ml-auto mb-2">
            <i className="bx bx-search absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre, correo, WhatsApp o código…"
              className="pl-8 pr-3 py-1.5 text-[12px] rounded-lg border border-slate-200 bg-white outline-none focus:border-indigo-400 w-64"
            />
          </div>
        </div>

        {visibles.length === 0 ? (
          <div className="p-14 text-center">
            <i className="bx bx-coin-stack text-4xl text-slate-300 block mb-2" />
            <p className="text-sm font-medium text-slate-600">
              {busqueda ? "Ningún referidor coincide con la búsqueda" : "Nadie en este grupo todavía"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {filtro === "saldo"
                ? "Aquí aparecen los referidores a los que ya se les debe algo, lo hayan pedido o no."
                : "Prueba con otro filtro o búsqueda."}
            </p>
          </div>
        ) : (
          <div className="overflow-auto max-h-[36rem]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Referidor</th>
                  <th className="text-right px-4 py-3 font-semibold">Referidos</th>
                  <th className="text-right px-4 py-3 font-semibold" title="Ya pueden pedirlo; nadie lo ha solicitado">
                    Disponible
                  </th>
                  <th className="text-right px-4 py-3 font-semibold" title="Reservado en una solicitud de transferencia abierta">
                    En solicitud
                  </th>
                  <th className="text-right px-4 py-3 font-semibold" title="En retención; pasa a disponible al madurar">
                    Por madurar
                  </th>
                  <th className="text-right px-4 py-3 font-semibold">Pagado</th>
                  <th className="text-left px-4 py-3 font-semibold">Cobra por</th>
                  <th className="text-left px-4 py-3 font-semibold">Última comisión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibles.map((f) => {
                  const porCobrar = f.disponible_cent + f.reservado_cent;
                  return (
                    <tr key={f.id_usuario} className="hover:bg-slate-50/70 align-top">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-9 h-9 rounded-full grid place-items-center text-[11px] font-bold text-white shrink-0 ${
                              porCobrar > 0 ? "bg-[#4F46E5]" : "bg-slate-300"
                            }`}
                          >
                            {(f.nombre || "?").slice(0, 2).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-800 truncate">{f.nombre || `Usuario ${f.id_usuario}`}</p>
                            <p className="text-[11px] text-slate-400 truncate">{f.email_propietario}</p>
                            {f.codigo_referido && <p className="text-[10px] text-slate-400 font-mono">{f.codigo_referido}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700 whitespace-nowrap">
                        {f.referidos_total}
                        <span className="block text-[10px] text-slate-400">{f.referidos_activos} pagando</span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Monto cent={f.disponible_cent} fuerte={f.disponible_cent > 0} apagado />
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Monto cent={f.reservado_cent} apagado />
                        {f.solicitudes_pendientes > 0 && (
                          <span className="block text-[10px] text-orange-600 font-semibold">
                            {f.solicitudes_pendientes} solicitud{f.solicitudes_pendientes === 1 ? "" : "es"} por resolver
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Monto cent={f.pendiente_cent} apagado />
                        {f.pendiente_cent > 0 && f.proxima_disponible && (
                          <span className="block text-[10px] text-slate-400">desde {fecha(f.proxima_disponible)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Monto cent={f.pagado_cent} apagado />
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{PREF[f.referidos_pago_pref] || "Crédito en su factura"}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {fecha(f.ultima_comision)}
                        {f.comisiones_n > 0 && (
                          <span className="block text-[10px] text-slate-400">
                            {f.comisiones_n} comisión{f.comisiones_n === 1 ? "" : "es"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 text-[12px] font-semibold text-slate-700 sticky bottom-0">
                <tr>
                  <td className="px-4 py-2.5">
                    {visibles.length} referidor{visibles.length === 1 ? "" : "es"} en el filtro
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{visibles.reduce((a, f) => a + f.referidos_total, 0)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{money(visibles.reduce((a, f) => a + f.disponible_cent, 0))}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{money(visibles.reduce((a, f) => a + f.reservado_cent, 0))}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{money(visibles.reduce((a, f) => a + f.pendiente_cent, 0))}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{money(visibles.reduce((a, f) => a + f.pagado_cent, 0))}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-400 px-1">
        Mínimo para pedir transferencia: {money(data?.reglas?.umbral_transferencia_cent)}. Debajo de eso el referidor solo puede usar
        su saldo como crédito en su propia factura, que igual es dinero que se deja de cobrar.
      </p>
    </div>
  );
}
