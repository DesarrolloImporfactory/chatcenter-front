import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
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

const fmtNumero = (n) =>
  Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtMonto = (monto, moneda) =>
  `${String(moneda || "usd").toUpperCase()} ${fmtNumero(monto)}`;

const plural = (n, singular, pluralTxt) =>
  `${n || 0} ${n === 1 ? singular : pluralTxt}`;

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

/**
 * Tarjeta de dinero: una cifra por moneda. Una cuenta puede cobrar en USD y
 * en MXN a la vez, y sumarlos en un solo número no significa nada, así que
 * cada moneda va en su propia línea con su conteo al lado.
 * `items` = [{ moneda, monto, n }]; `unidad` = ["pagado", "pagados"].
 */
function TarjetaMontos({ titulo, items, unidad, color, monedaVacia }) {
  const lista = items.length
    ? items
    : [{ moneda: monedaVacia || "usd", monto: 0, n: 0 }];
  const varias = lista.length > 1;
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
        {titulo}
      </p>
      {varias ? (
        <ul className="mt-1 space-y-1">
          {lista.map((it) => (
            <li
              key={it.moneda}
              className="flex items-baseline justify-between gap-2"
            >
              <span className={`text-lg font-extrabold leading-tight ${color}`}>
                <span className="text-[11px] font-semibold text-gray-400 mr-1 align-middle">
                  {String(it.moneda).toUpperCase()}
                </span>
                {fmtNumero(it.monto)}
              </span>
              <span className="text-[11px] text-gray-500 whitespace-nowrap">
                {plural(it.n, unidad[0], unidad[1])}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <p className={`text-2xl font-extrabold mt-1 ${color}`}>
            {fmtMonto(lista[0].monto, lista[0].moneda)}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {plural(lista[0].n, unidad[0], unidad[1])}
          </p>
        </>
      )}
    </div>
  );
}

/**
 * Acciones disponibles para un cobro según su estado. Las usan el menú de
 * tres puntos (escritorio) y la fila de botones de la tarjeta (móvil), así
 * las dos vistas ofrecen exactamente lo mismo.
 */
function accionesDe(row, { ocupado, copiar, verificar, anular }) {
  const lista = [
    {
      key: "copiar",
      label: "Copiar enlace de pago",
      icon: "bx-link",
      onClick: () => copiar(row.url_pago),
    },
  ];
  if (row.estado === "pendiente") {
    lista.push({
      key: "verificar",
      label: ocupado === row.id ? "Consultando…" : "¿Ya pagó?",
      icon: "bx-refresh",
      disabled: ocupado === row.id,
      onClick: () => verificar(row),
    });
  }
  if (row.estado === "pagado" && row.url_pdf) {
    lista.push({
      key: "recibo",
      label: "Ver recibo",
      icon: "bxs-file-pdf",
      href: row.url_pdf,
    });
  }
  if (row.estado === "pendiente") {
    lista.push({
      key: "anular",
      label: "Anular cobro",
      icon: "bxs-x-circle",
      peligro: true,
      disabled: ocupado === row.id,
      onClick: () => anular(row),
    });
  }
  return lista;
}

/**
 * Menú de tres puntos que se pinta en un portal con position: fixed. La
 * tabla vive dentro de un contenedor con overflow-x-auto y un menú absoluto
 * quedaba recortado/escondido debajo de la tabla; con el portal flota sobre
 * todo y se acomoda arriba cuando no cabe abajo.
 */
function MenuAcciones({ acciones }) {
  const [abierto, setAbierto] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const ANCHO = 208;

  const cerrar = useCallback(() => setAbierto(false), []);

  useLayoutEffect(() => {
    if (!abierto || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const alto = menuRef.current?.offsetHeight || 0;
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const cabeAbajo = r.bottom + 6 + alto <= vh - 8;
    const top = cabeAbajo ? r.bottom + 6 : Math.max(8, r.top - 6 - alto);
    const left = Math.max(8, Math.min(r.right - ANCHO, vw - ANCHO - 8));
    setPos({ top, left });
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    const onDown = (e) => {
      if (
        btnRef.current?.contains(e.target) ||
        menuRef.current?.contains(e.target)
      )
        return;
      cerrar();
    };
    const onKey = (e) => e.key === "Escape" && cerrar();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", cerrar, true);
    window.addEventListener("resize", cerrar);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", cerrar, true);
      window.removeEventListener("resize", cerrar);
    };
  }, [abierto, cerrar]);

  const itemCls = (a) =>
    `flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs hover:bg-slate-50 disabled:opacity-50 ${
      a.peligro ? "text-red-600 hover:bg-red-50" : "text-slate-700"
    }`;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-200/60 transition"
        title="Más acciones"
        aria-label="Más acciones"
        aria-haspopup="menu"
        aria-expanded={abierto}
      >
        <i className="bx bx-dots-vertical-rounded text-[18px]" />
      </button>
      {abierto &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: "fixed",
              top: pos?.top ?? -9999,
              left: pos?.left ?? -9999,
              width: ANCHO,
              zIndex: 1000,
            }}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg ring-1 ring-slate-900/5"
          >
            {acciones.map((a, i) => (
              <React.Fragment key={a.key}>
                {a.peligro && i > 0 && (
                  <div className="my-1 h-px bg-slate-100" />
                )}
                {a.href ? (
                  <a
                    href={a.href}
                    target="_blank"
                    rel="noreferrer"
                    role="menuitem"
                    className={itemCls(a)}
                    onClick={cerrar}
                  >
                    <i className={`bx ${a.icon} text-sm text-slate-500`} />
                    {a.label}
                  </a>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={a.disabled}
                    className={itemCls(a)}
                    onClick={() => {
                      cerrar();
                      a.onClick();
                    }}
                  >
                    <i
                      className={`bx ${a.icon} text-sm ${a.peligro ? "" : "text-slate-500"}`}
                    />
                    {a.label}
                  </button>
                )}
              </React.Fragment>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

/** Botón redondo verde que abre el chat del contacto (acción primaria). */
function BotonChat({ row }) {
  return (
    <button
      type="button"
      disabled={!row.id_cliente_chat_center}
      onClick={() =>
        window.open(
          `/chat/${row.id_cliente_chat_center}`,
          "_blank",
          "noopener,noreferrer",
        )
      }
      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200 transition disabled:opacity-40"
      title="Abrir chat"
      aria-label="Abrir chat"
    >
      <i className="bx bxs-chat text-[18px]" />
    </button>
  );
}

/** Chip de estado con la fecha del cambio debajo (pagado / anulado). */
function ChipEstado({ row }) {
  const ui = ESTADO[row.estado] || ESTADO.pendiente;
  const fecha =
    row.estado === "pagado"
      ? row.pagado_at
      : row.estado === "anulado"
        ? row.anulado_at
        : null;
  return (
    <div>
      <span
        className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${ui.cls}`}
      >
        <i className={`bx ${ui.icon}`} />
        {ui.label}
      </span>
      {fecha && (
        <div className="text-[11px] text-gray-500 mt-0.5">{fmtFecha(fecha)}</div>
      )}
    </div>
  );
}

export default function HistorialCobrosStripe({
  id_configuracion,
  moneda = "usd",
}) {
  const [estado, setEstado] = useState("");
  const [monedaFiltro, setMonedaFiltro] = useState("");
  const [desde, setDesde] = useState(haceDias(30));
  const [hasta, setHasta] = useState(hoy());
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [page, setPage] = useState(1);
  const LIMIT = 15;

  const [rows, setRows] = useState([]);
  const [totales, setTotales] = useState(null);
  // Monedas que la cuenta ha usado alguna vez (viene del back sin filtro).
  const [monedas, setMonedas] = useState([]);
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
          moneda: monedaFiltro || undefined,
          desde: desde || undefined,
          hasta: hasta || undefined,
          q: qDebounced || undefined,
          page,
          limit: LIMIT,
        },
      });
      setRows(res?.data?.data || []);
      setTotales(res?.data?.totales || null);
      if (Array.isArray(res?.data?.monedas)) setMonedas(res.data.monedas);
    } catch {
      setRows([]);
      setTotales(null);
    } finally {
      setLoading(false);
    }
  }, [id_configuracion, estado, monedaFiltro, desde, hasta, qDebounced, page]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    setPage(1);
  }, [estado, monedaFiltro, desde, hasta, qDebounced]);

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
  const porMoneda = Array.isArray(t.por_moneda) ? t.por_moneda : [];
  const monedaVacia = monedaFiltro || moneda;
  // Las tarjetas de dinero solo listan monedas con movimiento en ese estado.
  const cobrado = porMoneda
    .filter((m) => m.pagados > 0 || m.monto_pagado > 0)
    .map((m) => ({ moneda: m.moneda, monto: m.monto_pagado, n: m.pagados }));
  const porCobrar = porMoneda
    .filter((m) => m.pendientes > 0 || m.monto_pendiente > 0)
    .map((m) => ({
      moneda: m.moneda,
      monto: m.monto_pendiente,
      n: m.pendientes,
    }));
  const variasMonedas = monedas.length > 1;

  return (
    <div className="space-y-5">
      {/* Selector de moneda: solo si la cuenta cobra en más de una. Filtra
          tarjetas y tabla a la vez; "Todas" muestra cada moneda por separado. */}
      {variasMonedas && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="text-xs font-semibold text-gray-600">Moneda</span>
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            {["", ...monedas].map((m) => {
              const activo = monedaFiltro === m;
              return (
                <button
                  key={m || "todas"}
                  type="button"
                  onClick={() => setMonedaFiltro(m)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                    activo
                      ? "bg-[#171931] text-white shadow-sm"
                      : "text-gray-600 hover:bg-white"
                  }`}
                >
                  {m ? m.toUpperCase() : "Todas"}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Totales del filtro */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <TarjetaMontos
          titulo="Cobrado"
          items={cobrado}
          unidad={["cobro pagado", "cobros pagados"]}
          color="text-emerald-700"
          monedaVacia={monedaVacia}
        />
        <TarjetaMontos
          titulo="Por cobrar"
          items={porCobrar}
          unidad={["pendiente", "pendientes"]}
          color="text-amber-700"
          monedaVacia={monedaVacia}
        />
        <Tarjeta
          titulo="Enlaces enviados"
          valor={t.total || 0}
          sub={plural(t.anulados, "anulado", "anulados")}
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
                setMonedaFiltro("");
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

      {/* Listado: tarjetas en móvil, tabla desde md. Las dos usan los
          mismos helpers (ChipEstado, BotonChat, accionesDe) para que no se
          desincronicen. */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        {loading && rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-gray-500">Cargando…</div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-gray-500">
            No hay cobros con ese filtro. Los asesores los crean desde el
            botón + del chat.
          </div>
        ) : (
          <>
            {/* Móvil: una tarjeta por cobro con las acciones a la vista */}
            <ul className="md:hidden divide-y divide-gray-100">
              {rows.map((r) => {
                const nombre =
                  [r.nombre_cliente, r.apellido_cliente]
                    .filter(Boolean)
                    .join(" ") || "—";
                const acciones = accionesDe(r, {
                  ocupado,
                  copiar,
                  verificar,
                  anular,
                });
                return (
                  <li key={r.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-800 truncate">
                          {nombre}
                        </div>
                        <div className="text-xs text-gray-500">
                          {r.celular_cliente || ""}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-extrabold text-gray-900 whitespace-nowrap">
                          {fmtMonto(r.monto, r.moneda)}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {fmtFecha(r.created_at)}
                        </div>
                      </div>
                    </div>

                    {r.concepto && (
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {r.concepto}
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-3">
                      <ChipEstado row={r} />
                      <span className="text-xs text-gray-500 truncate">
                        {r.origen === "bot" ? "Bot" : r.asesor || "—"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <BotonChat row={r} />
                      {acciones.map((a) =>
                        a.href ? (
                          <a
                            key={a.key}
                            href={a.href}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 h-9 px-3 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <i className={`bx ${a.icon} text-sm`} />
                            {a.label}
                          </a>
                        ) : (
                          <button
                            key={a.key}
                            type="button"
                            disabled={a.disabled}
                            onClick={a.onClick}
                            className={`inline-flex items-center gap-1 h-9 px-3 rounded-full border text-xs font-semibold disabled:opacity-50 ${
                              a.peligro
                                ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <i className={`bx ${a.icon} text-sm`} />
                            {a.label}
                          </button>
                        ),
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Escritorio: tabla. "Motivo" y "Enviado por" solo desde lg
                para que en tablet no se apriete. */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">
                      Fecha
                    </th>
                    <th className="text-left px-4 py-2.5 font-semibold">
                      Cliente
                    </th>
                    <th className="hidden lg:table-cell text-left px-4 py-2.5 font-semibold">
                      Motivo
                    </th>
                    <th className="text-right px-4 py-2.5 font-semibold">
                      Monto
                    </th>
                    <th className="text-left px-4 py-2.5 font-semibold">
                      Estado
                    </th>
                    <th className="hidden lg:table-cell text-left px-4 py-2.5 font-semibold whitespace-nowrap">
                      Enviado por
                    </th>
                    <th className="text-right px-4 py-2.5 font-semibold">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const nombre =
                      [r.nombre_cliente, r.apellido_cliente]
                        .filter(Boolean)
                        .join(" ") || "—";
                    const acciones = accionesDe(r, {
                      ocupado,
                      copiar,
                      verificar,
                      anular,
                    });
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
                          {/* En tablet, motivo y asesor se muestran aquí
                              porque sus columnas están ocultas */}
                          <div className="lg:hidden text-xs text-gray-500 mt-0.5 max-w-[220px] truncate">
                            {r.concepto}
                            {r.concepto ? " · " : ""}
                            {r.origen === "bot" ? "Bot" : r.asesor || "—"}
                          </div>
                        </td>
                        <td
                          className="hidden lg:table-cell px-4 py-2.5 text-gray-700 max-w-[260px] truncate"
                          title={r.concepto}
                        >
                          {r.concepto}
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-gray-900 whitespace-nowrap">
                          {variasMonedas ? (
                            <>
                              <span className="inline-block text-[10px] font-semibold text-gray-500 bg-gray-100 rounded px-1.5 py-0.5 mr-1.5 align-middle">
                                {String(r.moneda || "usd").toUpperCase()}
                              </span>
                              {fmtNumero(r.monto)}
                            </>
                          ) : (
                            fmtMonto(r.monto, r.moneda)
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <ChipEstado row={r} />
                        </td>
                        <td className="hidden lg:table-cell px-4 py-2.5 text-gray-700">
                          {r.origen === "bot" ? "Bot" : r.asesor || "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-end gap-2">
                            <BotonChat row={r} />
                            <MenuAcciones acciones={acciones} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

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
