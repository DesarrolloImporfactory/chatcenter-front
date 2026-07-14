import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import PageShell from "../../components/layout/PageShell";
import { listarAuditoria, ACCIONES_AUDITORIA } from "../../services/imporsuit";

/**
 * Auditoría de la Cartera Imporsuit — vista admin global.
 *
 * Lista QUIÉN (qué subusuario/agente de chatcenter) hizo cada acción sobre la
 * cartera de un cliente desde el panel del chat: crear cliente, generar cartera,
 * agregar deuda, registrar pago, eliminar deuda (éxitos y fallos). Solo lectura.
 *
 * Acceso: super_administrador (el backend usa token compartido, así que el gate
 * es en el front).
 */

const RESULTADOS = [
  { value: "", label: "Todos" },
  { value: "ok", label: "Éxitos" },
  { value: "error", label: "Fallos" },
];
const PAGE_SIZES = [25, 50, 100];

const COLOR_CLS = {
  indigo: "bg-indigo-100 text-indigo-700",
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  green: "bg-green-100 text-green-700",
  red: "bg-red-100 text-red-700",
  gray: "bg-gray-100 text-gray-600",
};

const fmtFecha = (s) => {
  if (!s) return "—";
  const d = new Date(String(s).replace(" ", "T"));
  return isNaN(d)
    ? s
    : d.toLocaleString("es-EC", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
};

const parseDetalle = (raw) => {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export default function AuditoriaCarteraView() {
  const navigate = useNavigate();
  const userRole = localStorage.getItem("user_role");
  const isSuperAdmin = userRole === "super_administrador";

  // Data
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Paginación
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Filtros
  const [accion, setAccion] = useState("");
  const [resultado, setResultado] = useState("");
  const [search, setSearch] = useState("");
  const [searchDebounce, setSearchDebounce] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  // Detalle (modal)
  const [detalleRow, setDetalleRow] = useState(null);

  // Gate por rol (redirige si no es super admin).
  useEffect(() => {
    if (!isSuperAdmin) navigate("/chatboard");
  }, [isSuperAdmin, navigate]);

  // Debounce búsqueda
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounce(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const filtros = useMemo(
    () => ({
      accion: accion || undefined,
      resultado: resultado || undefined,
      search: searchDebounce || undefined,
      desde: desde || undefined,
      hasta: hasta || undefined,
    }),
    [accion, resultado, searchDebounce, desde, hasta],
  );

  const fetchData = useCallback(async () => {
    if (!isSuperAdmin) return;
    setLoading(true);
    try {
      const res = await listarAuditoria({ ...filtros, page, limit });
      setRows(res.data);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (e) {
      toast.error(e?.message || "Error al cargar la auditoría");
    } finally {
      setLoading(false);
    }
  }, [filtros, page, limit, isSuperAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset a página 1 cuando cambian filtros o tamaño.
  useEffect(() => {
    setPage(1);
  }, [filtros, limit]);

  const limpiarFiltros = () => {
    setAccion("");
    setResultado("");
    setSearch("");
    setDesde("");
    setHasta("");
  };

  if (!isSuperAdmin) return null;

  return (
    <PageShell>
    <div className="bg-slate-50 px-4 py-6 md:px-8 min-h-[82vh]">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-[#0B1426] md:text-3xl">
              Auditoría de Cartera
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Quién hizo cada acción en la cartera de Imporsuit desde el chat
              (crear cliente, generar cartera, deudas y pagos).
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            <i className={`bx bx-refresh text-lg ${loading ? "bx-spin" : ""}`} />
            Actualizar
          </button>
        </div>

        {/* Filtros */}
        <div className="mt-5 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-6">
          <label className="flex flex-col text-xs font-semibold text-slate-500 lg:col-span-2">
            Buscar (cliente / agente)
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="correo o nombre…"
              className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800 outline-none focus:border-blue-500"
            />
          </label>
          <label className="flex flex-col text-xs font-semibold text-slate-500">
            Acción
            <select
              value={accion}
              onChange={(e) => setAccion(e.target.value)}
              className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="">Todas</option>
              {Object.entries(ACCIONES_AUDITORIA).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-xs font-semibold text-slate-500">
            Resultado
            <select
              value={resultado}
              onChange={(e) => setResultado(e.target.value)}
              className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800 outline-none focus:border-blue-500"
            >
              {RESULTADOS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-xs font-semibold text-slate-500">
            Desde
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800 outline-none focus:border-blue-500"
            />
          </label>
          <label className="flex flex-col text-xs font-semibold text-slate-500">
            Hasta
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800 outline-none focus:border-blue-500"
            />
          </label>
        </div>

        {/* Tabla */}
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <p className="text-sm font-semibold text-slate-600">
              {loading ? "Cargando…" : `${total} registro${total === 1 ? "" : "s"}`}
            </p>
            <button
              onClick={limpiarFiltros}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Limpiar filtros
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#0B1426] text-left text-xs uppercase tracking-wide text-white">
                <tr>
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 font-semibold">Agente</th>
                  <th className="px-4 py-3 font-semibold">Acción</th>
                  <th className="px-4 py-3 font-semibold">Cliente</th>
                  <th className="px-4 py-3 font-semibold">Resultado</th>
                  <th className="px-4 py-3 font-semibold text-right">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                      Sin registros para estos filtros.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const meta =
                      ACCIONES_AUDITORIA[r.accion] || {
                        label: r.accion,
                        icon: "bx-dots-horizontal-rounded",
                        color: "gray",
                      };
                    const esError = r.resultado === "error";
                    return (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                          {fmtFecha(r.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">
                            {r.actor_nombre || "—"}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {r.actor_id_sub_usuario
                              ? `sub #${r.actor_id_sub_usuario}`
                              : r.actor_id_usuario
                                ? `usuario #${r.actor_id_usuario}`
                                : "sin id"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                              COLOR_CLS[meta.color] || COLOR_CLS.gray
                            }`}
                          >
                            <i className={`bx ${meta.icon}`} />
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {r.correo_cliente || (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                              esError
                                ? "bg-red-100 text-red-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                            title={r.mensaje || ""}
                          >
                            {esError ? "Error" : "OK"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setDetalleRow(r)}
                            className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100"
                          >
                            Ver
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Paginador */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Filas:</span>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs"
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-md border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                ← Anterior
              </button>
              <span className="text-xs text-slate-500">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-md border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Siguiente →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal detalle */}
      {detalleRow && (
        <DetalleModal row={detalleRow} onClose={() => setDetalleRow(null)} />
      )}
    </div>
    </PageShell>
  );
}

function DetalleModal({ row, onClose }) {
  const detalle = parseDetalle(row.detalle);
  const meta =
    ACCIONES_AUDITORIA[row.accion] || { label: row.accion, icon: "bx-info-circle" };

  return (
    <>
      <div
        className="fixed inset-0 z-[90] bg-black/40"
        onClick={onClose}
        role="presentation"
      />
      <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 sm:items-center">
        <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
          <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
              <i className={`bx ${meta.icon} text-blue-600`} />
              {meta.label}
            </h3>
            <button
              onClick={onClose}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              ✕
            </button>
          </header>

          <div className="max-h-[75vh] space-y-4 overflow-y-auto px-5 py-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Info label="Fecha" value={fmtFecha(row.created_at)} />
              <Info
                label="Resultado"
                value={
                  <span
                    className={
                      row.resultado === "error"
                        ? "font-bold text-red-600"
                        : "font-bold text-emerald-600"
                    }
                  >
                    {row.resultado === "error" ? "Error" : "OK"}
                    {row.status_code ? ` (${row.status_code})` : ""}
                  </span>
                }
              />
              <Info label="Agente" value={row.actor_nombre || "—"} />
              <Info
                label="ID subusuario / usuario"
                value={`${row.actor_id_sub_usuario ?? "—"} / ${row.actor_id_usuario ?? "—"}`}
              />
              <Info label="Email agente" value={row.actor_email || "—"} />
              <Info label="Rol" value={row.actor_rol || "—"} />
              <Info label="Cliente" value={row.correo_cliente || "—"} />
              <Info label="Config" value={row.id_configuracion ?? "—"} />
              {row.id_cartera && <Info label="Cartera (uuid)" value={row.id_cartera} />}
              {row.id_cpp && <Info label="Deuda (id_cpp)" value={row.id_cpp} />}
              <Info label="IP" value={row.ip_address || "—"} />
            </div>

            {row.mensaje && (
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-slate-600">
                <span className="font-semibold">Mensaje:</span> {row.mensaje}
              </div>
            )}

            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Parámetros de la acción
              </p>
              <pre className="max-h-64 overflow-auto rounded-lg bg-[#0B1426] p-3 text-[12px] leading-relaxed text-emerald-100">
                {detalle ? JSON.stringify(detalle, null, 2) : "—"}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 break-words text-slate-800">{value}</p>
    </div>
  );
}
