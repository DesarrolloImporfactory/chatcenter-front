// src/pages/productos/modales/IdExternoProducto.jsx
// ID del producto en el proveedor (Dropi / Aliclik), editable sin reimportar.
//
// Cuando el proveedor deja sin stock un producto y lo vuelve a publicar con
// otro ID, el cliente tenía que reimportarlo y rehacer wizard, combos y
// anuncios solo porque el ID no se podía tocar. Acá cambia el ID en el mismo
// producto (el sync de stock, el auto-orden y el bot lo leen en vivo) y cada
// cambio queda en un historial con el ID original, quién lo cambió y cuándo.
//
// Los textos están pensados para el dueño de la tienda, no para nosotros:
// él conoce "el ID de Dropi" porque lo copia de ahí; no conoce "external_id"
// ni "verificado".
import React, { useEffect, useState } from "react";
import chatApi from "../../../api/chatcenter";
import Swal from "sweetalert2";

const ETIQUETA = { DROPI: "Dropi", ALICLIK: "Aliclik" };

const fmtFecha = (f) => {
  if (!f) return "";
  const d = new Date(f);
  if (Number.isNaN(d.getTime())) return String(f);
  return d.toLocaleString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function IdExternoProducto({ producto, onCambiado }) {
  const source = String(producto?.external_source || "").toUpperCase();
  const proveedor = ETIQUETA[source];

  const [idActual, setIdActual] = useState(producto?.external_id ?? null);
  const [editando, setEditando] = useState(false);
  const [nuevoId, setNuevoId] = useState("");
  const [motivo, setMotivo] = useState("");
  const [guardando, setGuardando] = useState(false);

  const [verCambios, setVerCambios] = useState(false);
  const [historial, setHistorial] = useState(null); // null = sin cargar
  const [cargandoHist, setCargandoHist] = useState(false);

  /* Si cambia el producto editado (o lo recargan), se parte de cero. */
  useEffect(() => {
    setIdActual(producto?.external_id ?? null);
    setEditando(false);
    setNuevoId("");
    setMotivo("");
    setHistorial(null);
    setVerCambios(false);
  }, [producto?.id, producto?.external_id]);

  if (!proveedor || idActual == null || !producto?.id) return null;

  const idConfiguracion = () =>
    parseInt(localStorage.getItem("id_configuracion"));

  const cargarHistorial = async () => {
    setCargandoHist(true);
    try {
      const { data } = await chatApi.post(
        "/productos/historialIdExterno",
        { id_configuracion: idConfiguracion(), id_producto: producto.id },
        { silentError: true },
      );
      setHistorial(data || { data: [] });
    } catch (err) {
      console.error(err);
      setHistorial({ data: [], error: true });
    } finally {
      setCargandoHist(false);
    }
  };

  const toggleCambios = () => {
    const abrir = !verCambios;
    setVerCambios(abrir);
    if (abrir && historial === null) cargarHistorial();
  };

  const cancelar = () => {
    setEditando(false);
    setNuevoId("");
    setMotivo("");
  };

  const guardar = async (forzar = false) => {
    const n = String(nuevoId).trim();
    if (!/^\d+$/.test(n)) {
      Swal.fire({
        icon: "warning",
        title: "Revisa el ID",
        text: `El ID de ${proveedor} solo tiene números. Ejemplo: 142847.`,
      });
      return;
    }
    if (Number(n) === Number(idActual)) {
      Swal.fire({
        icon: "info",
        title: "Es el mismo ID",
        text: `Este producto ya usa el ID ${n}.`,
      });
      return;
    }

    setGuardando(true);
    try {
      const { data } = await chatApi.post(
        "/productos/cambiarIdExterno",
        {
          id_configuracion: idConfiguracion(),
          id_producto: producto.id,
          external_id: Number(n),
          motivo: motivo.trim() || undefined,
          forzar,
        },
        { silentError: true },
      );

      setIdActual(Number(n));
      cancelar();
      // El historial cambió: se vuelve a pedir si está abierto.
      setHistorial(null);
      if (verCambios) cargarHistorial();

      const nombre = data?.nombre_proveedor
        ? ` (“${data.nombre_proveedor}”)`
        : "";
      await Swal.fire({
        icon: "success",
        title: "ID actualizado",
        html:
          `<p>Este producto ahora usa el ID <strong>${n}</strong> de ${proveedor}${nombre}. ` +
          `Tu configuración, el stock y los pedidos automáticos siguen funcionando con el nuevo ID.</p>` +
          `<p style="margin-top:10px;font-size:13px;color:#64748b">` +
          `Si el producto tiene variantes (talla, color) o combos con su propio ID de ${proveedor}, ` +
          `revísalos en este mismo formulario: esos no cambian solos.</p>`,
        confirmButtonText: "Entendido",
      });
      onCambiado?.(Number(n));
    } catch (err) {
      const r = err?.response?.data;
      if (r?.code === "ID_EXTERNO_NO_EXISTE") {
        const ok = await Swal.fire({
          icon: "warning",
          title: `Ese ID no está en ${proveedor}`,
          text: r.message,
          showCancelButton: true,
          confirmButtonText: "Guardar de todos modos",
          cancelButtonText: "Volver a revisar",
          reverseButtons: true,
        });
        if (ok.isConfirmed) return guardar(true);
        return;
      }
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "No se pudo actualizar el ID",
        text: r?.message || "Intenta de nuevo en un momento.",
      });
    } finally {
      setGuardando(false);
    }
  };

  const filas = Array.isArray(historial?.data) ? historial.data : [];

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50/60 px-3.5 py-3">
      {/* Cabecera: qué es y cuál es el ID actual */}
      <div className="flex flex-wrap items-center gap-2">
        <i className="bx bx-link text-lg text-orange-500" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-700">
            Producto de {proveedor}{" "}
            <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-orange-600 ring-1 ring-orange-200">
              ID {idActual}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Con este ID tomamos el stock y creamos tus pedidos en {proveedor}.
            Si {proveedor} volvió a publicar el producto con otro ID,
            actualízalo aquí y conservas todo lo que ya configuraste.
          </p>
        </div>
        {!editando && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setEditando(true);
                setNuevoId("");
              }}
              className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 transition"
            >
              Actualizar ID
            </button>
            <button
              type="button"
              onClick={toggleCambios}
              className="rounded-lg border border-orange-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-50 transition"
              title="Con qué ID se importó y cada vez que se cambió"
            >
              <i
                className={`bx ${verCambios ? "bx-chevron-up" : "bx-history"} align-middle`}
              />{" "}
              Ver cambios
            </button>
          </div>
        )}
      </div>

      {/* Edición */}
      {editando && (
        <div className="mt-3 rounded-lg border border-orange-100 bg-white p-3">
          <div className="grid gap-3 sm:grid-cols-[170px_1fr]">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nuevo ID de {proveedor}
              </label>
              <input
                autoFocus
                inputMode="numeric"
                placeholder="Ej. 142847"
                value={nuevoId}
                onChange={(e) =>
                  setNuevoId(e.target.value.replace(/\D/g, ""))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    guardar(false);
                  }
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ¿Por qué lo cambias?{" "}
                <span className="font-normal text-slate-400">(opcional)</span>
              </label>
              <input
                placeholder={`Ej. ${proveedor} publicó el producto de nuevo`}
                value={motivo}
                maxLength={255}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Comprobamos en {proveedor} que el ID exista antes de guardar. El ID
            actual ({idActual}) queda registrado en el historial de cambios.
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              disabled={guardando}
              onClick={cancelar}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={guardando || !nuevoId}
              onClick={() => guardar(false)}
              className="rounded-lg bg-orange-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-orange-600 transition disabled:opacity-50"
            >
              {guardando ? "Comprobando…" : "Guardar nuevo ID"}
            </button>
          </div>
        </div>
      )}

      {/* Historial de cambios */}
      {verCambios && (
        <div className="mt-3 rounded-lg border border-orange-100 bg-white">
          {cargandoHist || historial === null ? (
            <div className="px-3 py-2 text-xs text-slate-500">Cargando…</div>
          ) : historial.error ? (
            <div className="px-3 py-2 text-xs text-rose-600">
              No pudimos cargar el historial. Intenta de nuevo.
            </div>
          ) : historial.migracion_pendiente ? (
            <div className="px-3 py-2 text-xs text-amber-700">
              El historial no está disponible por ahora.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-1 px-3 py-2 border-b border-orange-100 text-xs">
                <span className="text-slate-500">
                  Se importó con el ID{" "}
                  <strong className="text-slate-700">
                    {historial.external_id_original ?? idActual}
                  </strong>
                </span>
                <span className="text-slate-400">
                  {filas.length
                    ? `${filas.length} cambio${filas.length === 1 ? "" : "s"}`
                    : "Todavía no se ha cambiado"}
                </span>
              </div>
              {filas.map((h) => (
                <div
                  key={h.id}
                  className="px-3 py-2 border-b border-orange-50 last:border-b-0 text-xs"
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-semibold text-slate-700">
                      {h.external_id_anterior ?? "—"}{" "}
                      <i className="bx bx-right-arrow-alt align-middle text-slate-400" />{" "}
                      {h.external_id_nuevo}
                    </span>
                    {h.nombre_proveedor && (
                      <span className="text-slate-500 truncate max-w-[260px]">
                        “{h.nombre_proveedor}”
                      </span>
                    )}
                    {!Number(h.verificado) && (
                      <span
                        className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200"
                        title={`No se pudo comprobar en ${proveedor} que ese ID existiera cuando se guardó`}
                      >
                        sin comprobar en {proveedor}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {fmtFecha(h.fecha)}
                    {h.usuario ? ` · ${h.usuario}` : ""}
                    {h.motivo ? ` · ${h.motivo}` : ""}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
