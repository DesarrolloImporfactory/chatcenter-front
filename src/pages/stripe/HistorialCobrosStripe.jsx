import React, { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";

/**
 * Integraciones → Stripe → pestaña "Cobros".
 *
 * Historial de todos los enlaces de pago de la cuenta: quién lo envió, a qué
 * cliente, cuánto, y si está pagado, pendiente o anulado, con totales arriba.
 * Es la vista del dueño: le dice cuánto se cobró, cuánto falta y qué asesores
 * usan la herramienta. El backend refresca los pendientes recientes contra
 * Stripe antes de responder.
 */

const ESTADO = {
  pendiente: {
    label: "Pendiente",
    cls: "bg-amber-50 text-amber-800 border-amber-200",
    icon: "bx-time-five",
  },
  pagado: {
    label: "Pagado",
    cls: "bg-emerald-50 text-emerald-800 border-emerald-200",
    icon: "bx-check-circle",
  },
  anulado: {
    label: "Anulado",
    cls: "bg-slate-100 text-slate-600 border-slate-200",
    icon: "bx-x-circle",
  },
};

const fmtMonto = (monto, moneda) =>
  `${String(moneda || "usd").toUpperCase()} ${Number(monto || 0).toFixed(2)}`;

const fmtFecha = (d) => {
  if (!d) return "—";
  const f = new Date(d);
  return Number.isNaN(f.getTime())
    ? "—"
    : f.toLocaleString([], {
        day: "2-digit",
        month: "short",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
};

const hoy = () => new Date().toISOString().slice(0, 10);
const haceDias = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const toast = (title, icon = "success") =>
  Swal.fire({
    toast: true,
    position: "top-end",
    icon,
    title,
    timer: 2500,
    showConfirmButton: false,
    timerProgressBar: true,
  });

function Tarjeta({ titulo, valor, sub, color }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
        {titulo}
      </p>
      <p className={`text-2xl font-extrabold mt-1 ${color || "text-gray-900"}`}>
        {valor}
      </p>
      {sub ? <p className="text-xs text-gray-500 mt-0.5">{sub}</p> : null}
    </div>
  );
}

export default function HistorialCobrosStripe({
  id_configuracion,
  moneda = "usd",
}) {
  const [estado, setEstado] = useState("");
  const [desde, setDesde] = useState(haceDias(30));
  const [hasta, setHasta] = useState(hoy());
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [page, setPage] = useState(1);
  const LIMIT = 15;

  const [rows, setRows] = useState([]);
  const [totales, setTotales] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ocupado, setOcupado] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  const cargar = useCallback(async () => {
    if (!id_configuracion) return;
    setLoading(true);
    try {
      const res = await chatApi.get("enlaces_pago/historial", {
        params: {
          id_configuracion,
          estado: estado || undefined,
          desde: desde || undefined,
          hasta: hasta || undefined,
          q: qDebounced || undefined,
          page,
          limit: LIMIT,
        },
      });
      setRows(res?.data?.data || []);
      setTotales(res?.data?.totales || null);
    } catch {
      setRows([]);
      setTotales(null);
    } finally {
      setLoading(false);
    }
  }, [id_configuracion, estado, desde, hasta, qDebounced, page]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    setPage(1);
  }, [estado, desde, hasta, qDebounced]);

  // Cierra el menú de tres puntos (<details>) de la fila antes de actuar.
  const cerrarMenu = (e) => {
    const d = e?.currentTarget?.closest?.("details");
    if (d) d.removeAttribute("open");
  };

  const copiar = (url) => {
    if (url && navigator?.clipboard)
      navigator.clipboard.writeText(url).catch(() => {});
    toast("Enlace copiado");
  };

  const verificar = async (row) => {
    setOcupado(row.id);
    try {
      const res = await chatApi.post(`enlaces_pago/${row.id}/refrescar`);
      const est = res?.data?.data?.estado;
      toast(
        est === "pagado" ? "¡Ya está pagado!" : "Todavía no hay pago",
        est === "pagado" ? "success" : "info",
      );
      cargar();
    } catch {
      toast("No se pudo consultar", "error");
    } finally {
      setOcupado(null);
    }
  };

  const anular = async (row) => {
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "¿Anular este cobro?",
      text: `${row.nombre_cliente || "El cliente"} ya no podrá pagar ${fmtMonto(row.monto, row.moneda)} con ese enlace.`,
      showCancelButton: true,
      confirmButtonText: "Sí, anular",
      cancelButtonText: "Volver",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#171931",
    });
    if (!isConfirmed) return;
    setOcupado(row.id);
    try {
      await chatApi.post(`enlaces_pago/${row.id}/anular`);
      toast("Cobro anulado");
      cargar();
    } catch {
      toast("No se pudo anular", "error");
    } finally {
      setOcupado(null);
    }
  };

  const t = totales || {};
  const totalPaginas = Math.max(1, Math.ceil((t.total || 0) / LIMIT));
  const monedaTot = rows[0]?.moneda || moneda;

  return (
    <div className="space-y-5">
      {/* Totales del filtro */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tarjeta
          titulo="Cobrado"
          valor={fmtMonto(t.monto_pagado, monedaTot)}
          sub={`${t.pagados || 0} cobro${t.pagados === 1 ? "" : "s"} pagado${t.pagados === 1 ? "" : "s"}`}
          color="text-emerald-700"
        />
        <Tarjeta
          titulo="Por cobrar"
          valor={fmtMonto(t.monto_pendiente, monedaTot)}
          sub={`${t.pendientes || 0} pendiente${t.pendientes === 1 ? "" : "s"}`}
          color="text-amber-700"
        />
        <Tarjeta
          titulo="Enlaces enviados"
          valor={t.total || 0}
          sub={`${t.anulados || 0} anulado${t.anulados === 1 ? "" : "s"}`}
        />
        <Tarjeta
          titulo="Asesores que cobran"
          valor={t.asesores || 0}
          sub="en el período elegido"
        />
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-4">
            <label className="text-xs font-semibold text-gray-600">
              Buscar
            </label>
            <input
              type="text"
              name="historial_cobros_q"
              autoComplete="off"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cliente, teléfono, motivo o asesor"
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/25 focus:border-[#1d4ed8] focus:bg-white"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-gray-600">
              Estado
            </label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/25 focus:border-[#1d4ed8] focus:bg-white"
            >
              <option value="">Todos</option>
              <option value="pendiente">Pendientes</option>
              <option value="pagado">Pagados</option>
              <option value="anulado">Anulados</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-gray-600">Desde</label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/25 focus:border-[#1d4ed8] focus:bg-white"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-gray-600">Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/25 focus:border-[#1d4ed8] focus:bg-white"
            />
          </div>
          <div className="md:col-span-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setEstado("");
                setDesde(haceDias(30));
                setHasta(hoy());
                setQ("");
              }}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 font-medium hover:bg-gray-100"
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={cargar}
              disabled={loading}
              className="flex-1 px-3 py-2 rounded-lg bg-[#171931] text-white text-sm font-semibold hover:opacity-95 disabled:opacity-60"
            >
              {loading ? "…" : "Actualizar"}
            </button>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold">Fecha</th>
                <th className="text-left px-4 py-2.5 font-semibold">Cliente</th>
                <th className="text-left px-4 py-2.5 font-semibold">Motivo</th>
                <th className="text-right px-4 py-2.5 font-semibold">Monto</th>
                <th className="text-left px-4 py-2.5 font-semibold">Estado</th>
                <th className="text-left px-4 py-2.5 font-semibold">
                  Enviado por
                </th>
                <th className="text-right px-4 py-2.5 font-semibold">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    Cargando…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No hay cobros con ese filtro. Los asesores los crean desde
                    el botón + del chat.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const ui = ESTADO[r.estado] || ESTADO.pendiente;
                  const nombre =
                    [r.nombre_cliente, r.apellido_cliente]
                      .filter(Boolean)
                      .join(" ") || "—";
                  return (
                    <tr key={r.id} className="border-t hover:bg-gray-50/60">
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                        {fmtFecha(r.created_at)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-gray-800">
                          {nombre}
                        </div>
                        <div className="text-xs text-gray-500">
                          {r.celular_cliente || ""}
                        </div>
                      </td>
                      <td
                        className="px-4 py-2.5 text-gray-700 max-w-[260px] truncate"
                        title={r.concepto}
                      >
                        {r.concepto}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-gray-900 whitespace-nowrap">
                        {fmtMonto(r.monto, r.moneda)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${ui.cls}`}
                        >
                          <i className={`bx ${ui.icon}`} />
                          {ui.label}
                        </span>
                        {r.estado === "pagado" && (
                          <div className="text-[11px] text-gray-500 mt-0.5">
                            {fmtFecha(r.pagado_at)}
                          </div>
                        )}
                        {r.estado === "anulado" && (
                          <div className="text-[11px] text-gray-500 mt-0.5">
                            {fmtFecha(r.anulado_at)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-gray-700">
                        {r.origen === "bot" ? "Bot" : r.asesor || "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        {/* Mismos botones que la tabla de contactos: chat
                            verde como acción primaria y un menú de tres
                            puntos con el resto. */}
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              r.id_cliente_chat_center &&
                              window.open(
                                `/chat/${r.id_cliente_chat_center}`,
                                "_blank",
                                "noopener,noreferrer",
                              )
                            }
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200 transition"
                            title="Abrir chat"
                            aria-label="Abrir chat"
                          >
                            <i className="bx bxs-chat text-[18px]" />
                          </button>

                          <div className="relative">
                            <details className="group">
                              <summary
                                className="list-none inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-200/60 transition"
                                title="Más acciones"
                                aria-label="Más acciones"
                              >
                                <i className="bx bx-dots-vertical-rounded text-[18px]" />
                              </summary>

                              <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg ring-1 ring-slate-900/5">
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                                  onClick={(e) => {
                                    cerrarMenu(e);
                                    copiar(r.url_pago);
                                  }}
                                >
                                  <i className="bx bx-link text-sm text-slate-500" />
                                  Copiar enlace de pago
                                </button>

                                {r.estado === "pendiente" && (
                                  <button
                                    type="button"
                                    disabled={ocupado === r.id}
                                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                    onClick={(e) => {
                                      cerrarMenu(e);
                                      verificar(r);
                                    }}
                                  >
                                    <i className="bx bx-refresh text-sm text-slate-500" />
                                    {ocupado === r.id
                                      ? "Consultando…"
                                      : "¿Ya pagó?"}
                                  </button>
                                )}

                                {r.estado === "pagado" && r.url_pdf && (
                                  <a
                                    href={r.url_pdf}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                                    onClick={cerrarMenu}
                                  >
                                    <i className="bx bxs-file-pdf text-sm text-slate-500" />
                                    Ver recibo
                                  </a>
                                )}

                                {r.estado === "pendiente" && (
                                  <>
                                    <div className="my-1 h-px bg-slate-100" />
                                    <button
                                      type="button"
                                      disabled={ocupado === r.id}
                                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                                      onClick={(e) => {
                                        cerrarMenu(e);
                                        anular(r);
                                      }}
                                    >
                                      <i className="bx bxs-x-circle text-sm" />
                                      Anular cobro
                                    </button>
                                  </>
                                )}
                              </div>
                            </details>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación: 15 por página, siempre visible, con el total real */}
        {rows.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3 border-t text-sm text-gray-600">
            <span>
              Mostrando {(page - 1) * LIMIT + 1}–
              {Math.min(page * LIMIT, t.total || 0)} de {t.total || 0} cobros
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40"
                title="Página anterior"
                aria-label="Página anterior"
              >
                <i className="bx bx-chevron-left text-[18px]" />
              </button>
              <span className="font-semibold text-gray-800">
                Página {page} de {totalPaginas}
              </span>
              <button
                type="button"
                disabled={page >= totalPaginas || loading}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40"
                title="Página siguiente"
                aria-label="Página siguiente"
              >
                <i className="bx bx-chevron-right text-[18px]" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
