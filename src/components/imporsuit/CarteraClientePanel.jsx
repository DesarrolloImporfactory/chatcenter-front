import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import toast from "react-hot-toast";
import { PAQUETES, ESTADO_DEUDA } from "../../services/imporsuit";
import { useCarteraCliente, tieneCartera } from "./useCarteraCliente";
import { CrearUsuarioForm } from "./CrearUsuarioForm";
import { AgregarDeudaForm } from "./AgregarDeudaForm";
import { RegistrarPagoForm } from "./RegistrarPagoForm";

const MONEY = new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" });
const fmt$ = (n) => MONEY.format(Number(n ?? 0));
const fmtDate = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d) ? s : d.toLocaleDateString("es-EC", { year: "numeric", month: "short", day: "2-digit" });
};

/**
 * Mini-vista de cartera de Imporsuit para chatcenter.
 *
 * Permite, desde el chat: buscar un cliente por correo, crearlo si no existe,
 * asignarle paquetes/cursos, ver/crear su cartera y registrar deudas y pagos.
 *
 * Props:
 *  - correoInicial?: string  (ej. el email del cliente del chat)
 *  - onClose?: () => void    (opcional, si se monta como panel cerrable)
 */
export function CarteraClientePanel({ correoInicial = "", onClose }) {
  const {
    correo,
    setCorreo,
    cliente,
    existe,
    deudas,
    buscando,
    cargandoDeudas,
    error,
    buscar,
    recargar,
    asegurarCartera,
    eliminarDeudaById,
  } = useCarteraCliente(correoInicial);

  const [modal, setModal] = useState(null); // 'crear' | 'paquetes' | 'deuda' | { pago: deuda }
  const [generando, setGenerando] = useState(false);

  // Búsqueda automática al montar si llega un correo inicial.
  useEffect(() => {
    const email = (correoInicial || "").trim();
    if (email) buscar(email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onGenerarCartera = async () => {
    setGenerando(true);
    try {
      await asegurarCartera();
      toast.success("Cartera generada");
    } catch (e) {
      Swal.fire({ icon: "error", title: "No se pudo generar la cartera", text: e?.message ?? "" });
    } finally {
      setGenerando(false);
    }
  };

  const onEliminar = async (deuda) => {
    const c = await Swal.fire({
      icon: "warning",
      title: "¿Eliminar deuda?",
      text: deuda.concepto,
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!c.isConfirmed) return;
    try {
      await eliminarDeudaById(deuda.id_cpp);
      toast.success("Deuda eliminada");
    } catch (e) {
      Swal.fire({ icon: "error", title: "No se pudo eliminar", text: e?.message ?? "" });
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-gray-50 p-4 text-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Cartera del cliente</h2>
        {onClose && (
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700">✕</button>
        )}
      </div>

      {/* Buscador por correo */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          buscar();
        }}
        className="flex gap-2"
      >
        <input
          type="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          placeholder="correo@cliente.com"
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={buscando || !correo.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {buscando ? "Buscando…" : "Buscar"}
        </button>
      </form>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error.message || "Error al consultar."}
        </p>
      )}

      {/* No existe → crear */}
      {existe === false && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center">
          <p className="font-semibold text-gray-800">No hay usuario con ese correo.</p>
          <p className="mt-1 text-sm text-gray-500">Podés crearlo y asignarle paquetes y cursos.</p>
          <button onClick={() => setModal("crear")} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
            + Crear usuario
          </button>
        </div>
      )}

      {/* Existe → ficha + cartera */}
      {existe === true && cliente && (
        <>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-bold text-gray-800">{cliente.nombre_users}</p>
                <p className="text-sm text-gray-500">{cliente.email_users}</p>
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    Number(cliente.suspendido) === 1
                      ? "bg-red-100 text-red-600"
                      : "bg-emerald-100 text-emerald-600"
                  }`}
                >
                  {Number(cliente.suspendido) === 1 ? "Suspendido" : "Activo"}
                </span>
              </div>
              <button onClick={() => setModal("paquetes")} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100">
                Paquetes / cursos
              </button>
            </div>

            {/* Chips de paquetes activos */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {PAQUETES.filter((p) => Number(cliente[p.key]) === 1).map((p) => (
                <span key={p.key} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">{p.label}</span>
              ))}
              {PAQUETES.every((p) => Number(cliente[p.key]) !== 1) && (
                <span className="text-[11px] text-gray-400">Sin paquetes asignados</span>
              )}
            </div>
          </div>

          {/* Cartera */}
          {!tieneCartera(cliente) ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center">
              <p className="font-semibold text-gray-800">Este usuario no tiene cartera.</p>
              <button onClick={onGenerarCartera} disabled={generando} className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
                {generando ? "Generando…" : "Generar cartera"}
              </button>
            </div>
          ) : (
            <DeudasTable
              deudas={deudas}
              cargando={cargandoDeudas}
              onAgregar={() => setModal("deuda")}
              onPagar={(d) => setModal({ pago: d })}
              onEliminar={onEliminar}
            />
          )}
        </>
      )}

      {/* ── Modales ── */}
      {(modal === "crear" || modal === "paquetes") && (
        <CrearUsuarioForm
          correoInicial={correo}
          clienteExistente={modal === "paquetes" ? cliente : null}
          onClose={() => setModal(null)}
          onSaved={() => recargar()}
        />
      )}
      {modal === "deuda" && tieneCartera(cliente) && (
        <AgregarDeudaForm
          idCarteraUuid={cliente.id_cartera}
          onClose={() => setModal(null)}
          onSaved={() => recargar()}
        />
      )}
      {modal?.pago && (
        <RegistrarPagoForm
          deuda={modal.pago}
          onClose={() => setModal(null)}
          onSaved={() => recargar()}
        />
      )}
    </div>
  );
}

/* ── Lista de deudas (responsive, tarjetas) con filtro, orden y paginador ── */
const esImpaga = (d) => Number(d.monto_pendiente) > 0 || Number(d.estado) === 0;

const PAGE_SIZE = 5;

// Orden por fecha de creación: más reciente primero (tiebreak por id_cpp).
function porFechaCreacionDesc(a, b) {
  const fa = new Date(a.fecha_emision).getTime() || 0;
  const fb = new Date(b.fecha_emision).getTime() || 0;
  if (fb !== fa) return fb - fa;
  return Number(b.id_cpp) - Number(a.id_cpp);
}

function DeudasTable({ deudas, cargando, onAgregar, onPagar, onEliminar }) {
  const [openId, setOpenId] = useState(null);
  const [filtro, setFiltro] = useState(null); // null = automático
  const [page, setPage] = useState(1);

  const ordenadas = [...deudas].sort(porFechaCreacionDesc);
  const impagas = ordenadas.filter(esImpaga);
  const pagadas = ordenadas.filter((d) => !esImpaga(d));

  // Default: impagas si hay; si no, todas.
  const filtroEfectivo = filtro ?? (impagas.length > 0 ? "impagas" : "todas");
  const lista =
    filtroEfectivo === "impagas"
      ? impagas
      : filtroEfectivo === "pagadas"
        ? pagadas
        : ordenadas;

  const totalPages = Math.max(1, Math.ceil(lista.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = lista.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const cambiarFiltro = (f) => {
    setFiltro(f);
    setPage(1);
    setOpenId(null);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-2.5">
        <p className="text-sm font-semibold text-gray-700">
          {cargando
            ? "Cargando deudas…"
            : `${deudas.length} deuda${deudas.length === 1 ? "" : "s"}`}
        </p>
        <button
          onClick={onAgregar}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
        >
          + Agregar deuda
        </button>
      </div>

      {/* Filtro */}
      {deudas.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-gray-100 px-4 py-2">
          <FiltroBtn
            active={filtroEfectivo === "impagas"}
            disabled={impagas.length === 0}
            onClick={() => cambiarFiltro("impagas")}
          >
            Impagas ({impagas.length})
          </FiltroBtn>
          <FiltroBtn
            active={filtroEfectivo === "pagadas"}
            disabled={pagadas.length === 0}
            onClick={() => cambiarFiltro("pagadas")}
          >
            Pagadas ({pagadas.length})
          </FiltroBtn>
          <FiltroBtn
            active={filtroEfectivo === "todas"}
            onClick={() => cambiarFiltro("todas")}
          >
            Todas ({deudas.length})
          </FiltroBtn>
        </div>
      )}

      {/* Lista (página actual) */}
      {!cargando && lista.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-gray-400">
          {deudas.length === 0
            ? "Sin deudas registradas."
            : "No hay deudas en este filtro."}
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {pageItems.map((d) => {
            const pagos = Array.isArray(d.pagos)
              ? d.pagos.filter((p) => Number(p.monto_pagado) > 0)
              : [];
            const isOpen = openId === d.id_cpp;
            return (
              <DeudaCard
                key={d.id_cpp}
                d={d}
                pagos={pagos}
                isOpen={isOpen}
                onToggle={() => setOpenId(isOpen ? null : d.id_cpp)}
                onPagar={onPagar}
                onEliminar={onEliminar}
              />
            );
          })}
        </ul>
      )}

      {/* Paginador */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-4 py-2.5">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={pageSafe <= 1}
            className="rounded-md border border-gray-200 px-3 py-1 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            ← Anterior
          </button>
          <span className="text-xs text-gray-500">
            Página {pageSafe} de {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={pageSafe >= totalPages}
            className="rounded-md border border-gray-200 px-3 py-1 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}

function FiltroBtn({ active, disabled, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-3 py-1 text-[11px] font-bold transition ${
        active
          ? "bg-blue-600 text-white"
          : disabled
            ? "cursor-not-allowed bg-gray-100 text-gray-300"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {children}
    </button>
  );
}

function DeudaCard({ d, pagos, isOpen, onToggle, onPagar, onEliminar }) {
  const estadoTxt = ESTADO_DEUDA[Number(d.estado)] ?? "Pendiente";
  const estadoCls =
    Number(d.estado) === 1
      ? "bg-emerald-100 text-emerald-600"
      : Number(d.estado) === 2
        ? "bg-gray-100 text-gray-500"
        : "bg-amber-100 text-amber-700";
  const pendiente = Number(d.monto_pendiente);

  return (
    <li className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="break-words font-semibold text-gray-800">{d.concepto}</p>
          {d.launch_id ? (
            <p className="text-[11px] text-gray-400">Launch: {d.launch_id}</p>
          ) : null}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
            <span
              className={`rounded-full px-2 py-0.5 font-bold uppercase ${estadoCls}`}
            >
              {estadoTxt}
            </span>
            <span>Vence: {fmtDate(d.fecha_limite)}</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] uppercase tracking-wide text-gray-400">
            Pendiente
          </p>
          <p
            className={`font-mono text-sm font-bold ${
              pendiente > 0 ? "text-amber-600" : "text-emerald-600"
            }`}
          >
            {fmt$(pendiente)}
          </p>
        </div>
      </div>

      {/* Acciones */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {Number(d.estado) === 0 && (
          <button
            onClick={() => onPagar(d)}
            className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
          >
            <i className="bx bx-dollar" /> Pagar
          </button>
        )}
        {pagos.length > 0 && (
          <button
            onClick={onToggle}
            className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100"
          >
            Pagos ({pagos.length}) {isOpen ? "▲" : "▼"}
          </button>
        )}
        <button
          onClick={() => onEliminar(d)}
          className="ml-auto rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-600 hover:bg-red-100"
          title="Eliminar deuda"
        >
          🗑
        </button>
      </div>

      {/* Pagos expandidos */}
      {isOpen && pagos.length > 0 && (
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {pagos.map((p, i) => (
            <div
              key={i}
              className="rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-600">
                  {p.medio_pago || "—"}
                </span>
                <span className="font-mono font-bold text-emerald-600">
                  {fmt$(p.monto_pagado)}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-gray-400">
                {fmtDate(p.fecha_pago)}
                {p.referencia ? ` · ${p.referencia}` : ""}
              </div>
              {Array.isArray(p.imagenes) && p.imagenes.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {p.imagenes.map((url, ii) => (
                    <a
                      key={ii}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-blue-600 underline"
                    >
                      comprobante {ii + 1}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </li>
  );
}
