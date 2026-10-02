import React, { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";

/* Novedades Dropi pendientes por solucionar.
   Consulta EN VIVO a Dropi (no al cache): el back pide /orders/myorders con
   haveIncidenceProcesamiento=true. Por ahora es de solo lectura; el botón de
   solventar llega cuando tengamos el endpoint de solución de Dropi. */

const PAGE_SIZE = 20;

/* Color por transportadora (Ecuador). La que no esté acá sale en gris. */
const TRANSPORTADORAS = {
  GINTRACOM: "bg-sky-50 text-sky-700 border-sky-200",
  SERVIENTREGA: "bg-emerald-50 text-emerald-700 border-emerald-200",
  LAARCOURIER: "bg-rose-50 text-rose-700 border-rose-200",
  LAAR: "bg-rose-50 text-rose-700 border-rose-200",
  VELOCES: "bg-violet-50 text-violet-700 border-violet-200",
  URBANO: "bg-amber-50 text-amber-700 border-amber-200",
};
const claseTransportadora = (nombre) =>
  TRANSPORTADORAS[String(nombre || "").toUpperCase().replace(/\s+/g, "")] ||
  "bg-slate-50 text-slate-600 border-slate-200";

const fmtFecha = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString("es-EC", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/* "hace 3 h" / "hace 2 d": cuánto lleva la novedad sin gestionar. */
const hace = (s) => {
  if (!s) return null;
  const ms = Date.now() - new Date(s).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const h = Math.floor(ms / 3600000);
  if (h < 1) return "hace menos de 1 h";
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
};
const horasDesde = (s) =>
  s ? (Date.now() - new Date(s).getTime()) / 3600000 : 0;

const fmtMonto = (v) =>
  v === null || v === undefined || v === "" ? "—" : `$${Number(v).toFixed(2)}`;

const iniciales = (nombre) =>
  String(nombre || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

const errMsg = (error, def) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  def;

const copiar = (texto) => {
  if (!texto) return;
  navigator.clipboard?.writeText(String(texto)).then(() =>
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Copiado",
      showConfirmButton: false,
      timer: 1200,
    }),
  );
};

/* ───────────────────────── piezas pequeñas ───────────────────────── */

function BadgeTransportadora({ nombre }) {
  if (!nombre) return <span className="text-xs text-slate-400">—</span>;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${claseTransportadora(
        nombre,
      )}`}
    >
      <i className="bx bxs-truck text-sm" />
      {nombre}
    </span>
  );
}

function Kpi({ icono, color, valor, label }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className={`grid h-10 w-10 place-items-center rounded-xl ${color}`}>
        <i className={`bx ${icono} text-xl`} />
      </div>
      <div>
        <p className="text-xl font-extrabold leading-none text-slate-800">
          {valor}
        </p>
        <p className="mt-1 text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function Dato({ icono, label, valor, copiable = false }) {
  return (
    <div className="flex items-start gap-2.5">
      <i className={`bx ${icono} mt-0.5 text-lg text-slate-400`} />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <div className="flex items-center gap-1.5">
          <p className="break-words font-medium text-slate-800">
            {valor || "—"}
          </p>
          {copiable && valor && (
            <button
              type="button"
              onClick={() => copiar(valor)}
              title="Copiar"
              className="text-slate-400 transition hover:text-slate-700"
            >
              <i className="bx bx-copy" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FilaCargando() {
  return (
    <tr className="animate-pulse">
      {[140, 220, 110, 160, 160, 60, 90, 70].map((w, i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-3 rounded bg-slate-100" style={{ width: w }} />
          {i < 4 && (
            <div className="mt-2 h-2.5 w-16 rounded bg-slate-100" />
          )}
        </td>
      ))}
    </tr>
  );
}

/* ───────────────────────── panel de detalle ───────────────────────── */

function DetalleNovedad({ idConfiguracion, novedad, onClose, onAbrirChat }) {
  const [detalle, setDetalle] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [verJson, setVerJson] = useState(false);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    chatApi
      .post("dropi_integrations/novedades/detalle", {
        id_configuracion: idConfiguracion,
        order_id: novedad.order_id,
      })
      .then((res) => {
        if (!cancelado) setDetalle(res?.data?.data || null);
      })
      .catch((error) => {
        if (cancelado) return;
        Swal.fire({
          icon: "error",
          title: "Error",
          text: errMsg(error, "No se pudo cargar el detalle de la novedad."),
          confirmButtonColor: "#d33",
        });
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [idConfiguracion, novedad.order_id]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const d = detalle || novedad;
  const estados = [...(detalle?.estados || [])].reverse();

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-xl flex-col bg-slate-50 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="bg-[#171931] px-6 pb-5 pt-4 text-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/60">
              Orden #{novedad.order_id}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
              title="Cerrar (Esc)"
            >
              <i className="bx bx-x text-2xl" />
            </button>
          </div>
          <div className="mt-2 flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-400/20">
              <i className="bx bx-error text-2xl text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-snug">
                {novedad.novedad || "Novedad"}
              </h2>
              <p className="mt-1 text-xs text-white/60">
                Reportada {hace(novedad.updated_at) || "—"} ·{" "}
                {fmtFecha(novedad.updated_at)}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <BadgeTransportadora nombre={d.transportadora} />
            {d.metodo_solucion && (
              <span className="rounded-full border border-white/20 px-2.5 py-1 text-xs text-white/80">
                Solución por {d.metodo_solucion}
              </span>
            )}
            <button
              type="button"
              onClick={() => onAbrirChat(novedad)}
              disabled={!novedad.has_chat || !novedad.chat_id_cliente}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
            >
              <i className="bx bx-message-rounded-dots text-sm" />
              {novedad.has_chat ? "Abrir chat" : "Sin chat"}
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5 text-sm">
          {cargando ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-2xl bg-white"
                />
              ))}
            </div>
          ) : (
            <>
              {/* Cliente y envío */}
              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Cliente y envío
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Dato icono="bx-user" label="Cliente" valor={d.cliente?.nombre} />
                  <Dato
                    icono="bx-phone"
                    label="Teléfono"
                    valor={d.cliente?.telefono}
                    copiable
                  />
                  <Dato icono="bx-barcode" label="Guía" valor={d.guia} copiable />
                  <Dato icono="bx-dollar-circle" label="Total" valor={fmtMonto(d.total)} />
                  <div className="sm:col-span-2">
                    <Dato
                      icono="bx-map"
                      label="Dirección"
                      valor={[
                        d.cliente?.direccion,
                        d.cliente?.ciudad,
                        d.cliente?.provincia,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                      copiable
                    />
                  </div>
                </div>
                {d.productos?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
                    {d.productos.map((p, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700"
                      >
                        <i className="bx bx-package text-slate-400" />
                        {p.cantidad}× {p.nombre}
                      </span>
                    ))}
                  </div>
                )}
              </section>

              {/* Gestiones */}
              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Gestiones de la novedad
                </h3>
                {detalle?.gestiones?.length ? (
                  <ul className="space-y-2.5">
                    {detalle.gestiones.map((g) => {
                      const resuelta = !!g.solucion;
                      return (
                        <li
                          key={g.id}
                          className={`rounded-xl border-l-4 p-3 ${
                            resuelta
                              ? "border-emerald-400 bg-emerald-50/60"
                              : "border-amber-400 bg-amber-50/60"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-slate-800">
                              {g.novedad || g.comentario || "—"}
                            </p>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                resuelta
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {resuelta ? "Con solución" : "Sin solucionar"}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {fmtFecha(g.created_at)}
                          </p>
                          {g.solucion && (
                            <p className="mt-2">
                              <span className="text-slate-500">Solución: </span>
                              {g.solucion}
                            </p>
                          )}
                          {g.aclaracion && (
                            <p>
                              <span className="text-slate-500">Aclaración: </span>
                              {g.aclaracion}
                            </p>
                          )}
                          {g.observacion && (
                            <p>
                              <span className="text-slate-500">Observación: </span>
                              {g.observacion}
                            </p>
                          )}
                          {g.fecha_solucion && (
                            <p className="mt-1 text-xs text-slate-500">
                              Solucionada el {fmtFecha(g.fecha_solucion)}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-slate-500">Sin gestiones registradas.</p>
                )}
              </section>

              {/* Historial de estados (más reciente arriba) */}
              {estados.length > 0 && (
                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Recorrido del pedido
                  </h3>
                  <ol className="relative ml-2 border-l-2 border-slate-100">
                    {estados.map((e, i) => {
                      const esNovedad = /NOVEDAD/i.test(e.status || "");
                      return (
                        <li key={`${e.status}-${i}`} className="mb-4 ml-4 last:mb-0">
                          <span
                            className={`absolute -left-[7px] mt-1 h-3 w-3 rounded-full ring-4 ring-white ${
                              i === 0
                                ? esNovedad
                                  ? "bg-amber-500"
                                  : "bg-[#171931]"
                                : "bg-slate-300"
                            }`}
                          />
                          <p
                            className={`font-semibold ${
                              esNovedad ? "text-amber-700" : "text-slate-800"
                            }`}
                          >
                            {e.status}
                          </p>
                          <p className="text-xs text-slate-500">
                            {fmtFecha(e.created_at)}
                          </p>
                          {e.novedad && (
                            <p className="mt-0.5 text-xs text-amber-700">
                              {e.novedad}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </section>
              )}

              {/* Respuesta cruda, para revisar qué manda Dropi */}
              <section>
                <button
                  type="button"
                  onClick={() => setVerJson((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  <i className={`bx ${verJson ? "bx-chevron-up" : "bx-code-alt"}`} />
                  {verJson ? "Ocultar respuesta completa" : "Ver respuesta completa"}
                </button>
                {verJson && (
                  <pre className="mt-2 max-h-96 overflow-auto rounded-xl bg-slate-900 p-3 text-[11px] text-slate-100">
                    {JSON.stringify(detalle, null, 2)}
                  </pre>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── vista principal ───────────────────────── */

export default function NovedadesDropi() {
  const [idConfiguracion, setIdConfiguracion] = useState(null);
  const [novedades, setNovedades] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [seleccionada, setSeleccionada] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [transportadora, setTransportadora] = useState("");

  useEffect(() => {
    const idc = localStorage.getItem("id_configuracion");
    if (idc) setIdConfiguracion(parseInt(idc, 10));
  }, []);

  const cargar = useCallback(async () => {
    if (!idConfiguracion) return;
    setCargando(true);
    try {
      const res = await chatApi.post("dropi_integrations/novedades/pendientes", {
        id_configuracion: idConfiguracion,
        page,
        page_size: PAGE_SIZE,
      });
      const data = res?.data?.data || {};
      setNovedades(Array.isArray(data.novedades) ? data.novedades : []);
      setHasMore(!!data.hasMore);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: errMsg(error, "No se pudieron cargar las novedades."),
        confirmButtonColor: "#d33",
      });
    } finally {
      setCargando(false);
    }
  }, [idConfiguracion, page]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirChat = useCallback((n) => {
    if (!n?.chat_id_cliente) return;
    window.open(`/chat/${n.chat_id_cliente}`, "_blank", "noopener,noreferrer");
  }, []);
  const cerrarDetalle = useCallback(() => setSeleccionada(null), []);

  // Filtros sobre la página cargada (la consulta a Dropi no los soporta).
  const transportadoras = useMemo(
    () =>
      Array.from(
        new Set(novedades.map((n) => n.transportadora).filter(Boolean)),
      ).sort(),
    [novedades],
  );

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return novedades.filter((n) => {
      if (transportadora && n.transportadora !== transportadora) return false;
      if (!q) return true;
      return [
        n.order_id,
        n.guia,
        n.novedad,
        n.cliente?.nombre,
        n.cliente?.telefono,
        n.cliente?.ciudad,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [novedades, busqueda, transportadora]);

  const kpis = useMemo(
    () => ({
      total: novedades.length,
      conChat: novedades.filter((n) => n.has_chat).length,
      viejas: novedades.filter((n) => horasDesde(n.updated_at) >= 24).length,
    }),
    [novedades],
  );

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      {/* Encabezado */}
      <div className="mb-5 overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="h-1 bg-gradient-to-r from-amber-400 via-[#FF6B35] to-rose-500" />
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-50">
              <i className="bx bx-error-circle text-2xl text-amber-500" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-800">
                Novedades Dropi
              </h1>
              <p className="text-sm text-slate-500">
                Pedidos con novedad pendiente por solucionar, en vivo desde
                Dropi.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={cargar}
            disabled={cargando}
            className="inline-flex items-center gap-2 rounded-xl bg-[#171931] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          >
            <i className={`bx bx-refresh text-lg ${cargando ? "bx-spin" : ""}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi
          icono="bx-error"
          color="bg-amber-50 text-amber-500"
          valor={hasMore ? `${kpis.total}+` : kpis.total}
          label="Novedades pendientes"
        />
        <Kpi
          icono="bx-message-rounded-dots"
          color="bg-emerald-50 text-emerald-600"
          valor={kpis.conChat}
          label="Con conversación en ChatCenter"
        />
        <Kpi
          icono="bx-time-five"
          color="bg-rose-50 text-rose-500"
          valor={kpis.viejas}
          label="Llevan más de 24 h"
        />
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <i className="bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por cliente, teléfono, guía, ciudad o novedad…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-[#171931] focus:ring-2 focus:ring-[#171931]/10"
          />
        </div>
        {transportadoras.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {["", ...transportadoras].map((t) => (
              <button
                key={t || "todas"}
                type="button"
                onClick={() => setTransportadora(t)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  transportadora === t
                    ? "border-[#171931] bg-[#171931] text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {t || "Todas"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Pedido</th>
                <th className="px-4 py-3">Novedad</th>
                <th className="px-4 py-3">Transportadora</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Productos</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Agente</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cargando && !novedades.length ? (
                [1, 2, 3, 4, 5].map((i) => <FilaCargando key={i} />)
              ) : !visibles.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50">
                      <i
                        className={`bx ${
                          novedades.length ? "bx-search-alt" : "bx-check-circle"
                        } text-3xl text-emerald-500`}
                      />
                    </div>
                    <p className="font-bold text-slate-700">
                      {novedades.length
                        ? "Ninguna novedad coincide con el filtro"
                        : "No hay novedades pendientes"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {novedades.length
                        ? "Prueba con otra búsqueda o transportadora."
                        : "Todos tus pedidos con novedad ya están gestionados."}
                    </p>
                  </td>
                </tr>
              ) : (
                visibles.map((n) => {
                  const urgente = horasDesde(n.updated_at) >= 24;
                  return (
                    <tr
                      key={n.order_id}
                      onClick={() => setSeleccionada(n)}
                      className="cursor-pointer align-top transition hover:bg-slate-50"
                    >
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-slate-800">#{n.order_id}</p>
                        <p className="font-mono text-xs text-slate-500">
                          {n.guia || "Sin guía"}
                        </p>
                      </td>
                      <td className="max-w-[260px] px-4 py-3.5">
                        <p className="line-clamp-2 font-medium text-amber-700">
                          {n.novedad || "—"}
                        </p>
                        {hace(n.updated_at) && (
                          <span
                            className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              urgente
                                ? "bg-rose-50 text-rose-600"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            <i className="bx bx-time-five" />
                            {hace(n.updated_at)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <BadgeTransportadora nombre={n.transportadora} />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#171931]/5 text-xs font-bold text-[#171931]">
                            {iniciales(n.cliente?.nombre)}
                          </div>
                          <div className="min-w-0">
                            <p className="max-w-[170px] truncate font-medium text-slate-800">
                              {n.cliente?.nombre || "—"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {n.cliente?.telefono || ""}
                              {n.cliente?.ciudad ? ` · ${n.cliente.ciudad}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="max-w-[200px] space-y-0.5 text-xs text-slate-600">
                          {(n.productos || []).slice(0, 2).map((p, i) => (
                            <p key={i} className="truncate">
                              <span className="font-semibold text-slate-800">
                                {p.cantidad}×
                              </span>{" "}
                              {p.nombre}
                            </p>
                          ))}
                          {(n.productos || []).length > 2 && (
                            <p className="text-slate-400">
                              +{n.productos.length - 2} más
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-slate-800">
                        {fmtMonto(n.total)}
                      </td>
                      <td className="px-4 py-3.5">
                        {n.agent_assigned && n.agent_assigned !== "Sin agente" ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                            <i className="bx bx-user-circle text-base text-slate-400" />
                            {n.agent_assigned}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Sin agente</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              abrirChat(n);
                            }}
                            disabled={!n.has_chat || !n.chat_id_cliente}
                            title={
                              n.has_chat
                                ? "Abrir chat"
                                : "Sin conversación en ChatCenter"
                            }
                            className="grid h-9 w-9 place-items-center rounded-full bg-emerald-500 text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none"
                          >
                            <i className="bx bx-message-rounded-dots text-lg" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSeleccionada(n);
                            }}
                            title="Ver detalle"
                            className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                          >
                            <i className="bx bx-chevron-right text-xl" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm">
          <span className="text-slate-500">
            Página <span className="font-semibold text-slate-800">{page}</span>
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || cargando}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
            >
              <i className="bx bx-chevron-left" />
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore || cargando}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
            >
              Siguiente
              <i className="bx bx-chevron-right" />
            </button>
          </div>
        </div>
      </div>

      {seleccionada && (
        <DetalleNovedad
          idConfiguracion={idConfiguracion}
          novedad={seleccionada}
          onClose={cerrarDetalle}
          onAbrirChat={abrirChat}
        />
      )}
    </div>
  );
}
