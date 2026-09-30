import React, { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";

/* Novedades Dropi pendientes por solucionar.
   Consulta EN VIVO a Dropi (no al cache): el back pide /orders/myorders con
   haveIncidenceProcesamiento=true. Por ahora es de solo lectura; el botón de
   solventar llega cuando tengamos el endpoint de solución de Dropi. */

const PAGE_SIZE = 20;

const fmtFecha = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const fmtMonto = (v) =>
  v === null || v === undefined || v === "" ? "—" : `$${Number(v).toFixed(2)}`;

const errMsg = (error, def) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  def;

function DetalleNovedad({ idConfiguracion, novedad, onClose }) {
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

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/30"
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-4">
          <div>
            <p className="text-xs text-gray-500">Orden {novedad.order_id}</p>
            <h2 className="text-base font-semibold text-gray-900">
              {novedad.novedad || "Novedad"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
            title="Cerrar"
          >
            <i className="bx bx-x text-xl" />
          </button>
        </div>

        {cargando ? (
          <p className="p-5 text-sm text-gray-500">Cargando detalle…</p>
        ) : !detalle ? (
          <p className="p-5 text-sm text-gray-500">Sin detalle.</p>
        ) : (
          <div className="space-y-5 p-5 text-sm">
            <section className="grid grid-cols-2 gap-3">
              <Dato label="Transportadora" valor={detalle.transportadora} />
              <Dato label="Guía" valor={detalle.guia} />
              <Dato
                label="Método de solución"
                valor={detalle.metodo_solucion}
              />
              <Dato label="Estado" valor={detalle.status} />
              <Dato label="Cliente" valor={detalle.cliente?.nombre} />
              <Dato label="Teléfono" valor={detalle.cliente?.telefono} />
              <Dato
                label="Dirección"
                valor={[
                  detalle.cliente?.direccion,
                  detalle.cliente?.ciudad,
                  detalle.cliente?.provincia,
                ]
                  .filter(Boolean)
                  .join(", ")}
                ancho
              />
            </section>

            <section>
              <h3 className="mb-2 font-semibold text-gray-800">
                Gestiones de la novedad
              </h3>
              {detalle.gestiones?.length ? (
                <ul className="space-y-2">
                  {detalle.gestiones.map((g) => (
                    <li
                      key={g.id}
                      className="rounded-lg border border-gray-200 p-3"
                    >
                      <p className="font-medium text-gray-900">
                        {g.novedad || g.comentario || "—"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {fmtFecha(g.created_at)}
                      </p>
                      <p className="mt-1">
                        <span className="text-gray-500">Solución: </span>
                        {g.solucion || (
                          <span className="text-amber-600">Sin solucionar</span>
                        )}
                      </p>
                      {g.aclaracion && (
                        <p>
                          <span className="text-gray-500">Aclaración: </span>
                          {g.aclaracion}
                        </p>
                      )}
                      {g.observacion && (
                        <p>
                          <span className="text-gray-500">Observación: </span>
                          {g.observacion}
                        </p>
                      )}
                      {g.fecha_solucion && (
                        <p className="text-xs text-gray-500">
                          Solucionada el {fmtFecha(g.fecha_solucion)}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">Sin gestiones registradas.</p>
              )}
            </section>

            <section>
              <h3 className="mb-2 font-semibold text-gray-800">
                Historial de estados
              </h3>
              <ol className="space-y-1 border-l-2 border-gray-200 pl-3">
                {(detalle.estados || []).map((e, i) => (
                  <li key={`${e.status}-${i}`}>
                    <span className="font-medium text-gray-800">
                      {e.status}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      {fmtFecha(e.created_at)}
                    </span>
                    {e.novedad && (
                      <p className="text-xs text-amber-700">{e.novedad}</p>
                    )}
                  </li>
                ))}
              </ol>
            </section>

            <section>
              <button
                type="button"
                onClick={() => setVerJson((v) => !v)}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                {verJson ? "Ocultar respuesta completa" : "Ver respuesta completa"}
              </button>
              {verJson && (
                <pre className="mt-2 max-h-96 overflow-auto rounded-lg bg-gray-900 p-3 text-[11px] text-gray-100">
                  {JSON.stringify(detalle, null, 2)}
                </pre>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function Dato({ label, valor, ancho = false }) {
  return (
    <div className={ancho ? "col-span-2" : ""}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium text-gray-900">{valor || "—"}</p>
    </div>
  );
}

export default function NovedadesDropi() {
  const [idConfiguracion, setIdConfiguracion] = useState(null);
  const [novedades, setNovedades] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [seleccionada, setSeleccionada] = useState(null);

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

  const abrirChat = (n) => {
    if (!n.chat_id_cliente) return;
    window.open(`/chat/${n.chat_id_cliente}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Novedades Dropi
          </h1>
          <p className="text-sm text-gray-500">
            Pedidos con novedad pendiente por solucionar, consultados en vivo a
            Dropi.
          </p>
        </div>
        <button
          type="button"
          onClick={cargar}
          disabled={cargando}
          className="inline-flex items-center gap-2 rounded-xl bg-[#171931] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          <i className={`bx bx-refresh ${cargando ? "bx-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">Orden / guía</th>
              <th className="px-3 py-2">Novedad</th>
              <th className="px-3 py-2">Transportadora</th>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Productos</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Agente</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cargando && !novedades.length ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                  Cargando novedades…
                </td>
              </tr>
            ) : !novedades.length ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                  No hay novedades pendientes.
                </td>
              </tr>
            ) : (
              novedades.map((n) => (
                <tr key={n.order_id} className="align-top hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <p className="font-medium text-gray-900">{n.order_id}</p>
                    <p className="text-xs text-gray-500">{n.guia || "—"}</p>
                  </td>
                  <td className="max-w-xs px-3 py-2">
                    <p className="text-amber-700">{n.novedad || "—"}</p>
                    <p className="text-xs text-gray-500">
                      {fmtFecha(n.updated_at)}
                    </p>
                  </td>
                  <td className="px-3 py-2">
                    <p>{n.transportadora || "—"}</p>
                    {n.metodo_solucion && (
                      <p className="text-xs text-gray-500">
                        Solución: {n.metodo_solucion}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <p>{n.cliente?.nombre || "—"}</p>
                    <p className="text-xs text-gray-500">
                      {n.cliente?.telefono || ""}
                      {n.cliente?.ciudad ? ` · ${n.cliente.ciudad}` : ""}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {(n.productos || []).map((p, i) => (
                      <p key={i}>
                        {p.cantidad}× {p.nombre}
                      </p>
                    ))}
                  </td>
                  <td className="px-3 py-2">{fmtMonto(n.total)}</td>
                  <td className="px-3 py-2 text-xs">{n.agent_assigned}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setSeleccionada(n)}
                      className="mr-1 rounded-lg border border-gray-200 px-2 py-1 text-xs hover:bg-gray-100"
                    >
                      Ver detalle
                    </button>
                    <button
                      type="button"
                      onClick={() => abrirChat(n)}
                      disabled={!n.has_chat || !n.chat_id_cliente}
                      title={
                        n.has_chat ? "Abrir chat" : "Sin conversación en ChatCenter"
                      }
                      className="rounded-lg border border-gray-200 px-2 py-1 text-xs hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <i className="bx bx-message-rounded-dots" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 text-sm">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1 || cargando}
          className="rounded-lg border border-gray-200 px-3 py-1 disabled:opacity-40"
        >
          Anterior
        </button>
        <span className="text-gray-500">Página {page}</span>
        <button
          type="button"
          onClick={() => setPage((p) => p + 1)}
          disabled={!hasMore || cargando}
          className="rounded-lg border border-gray-200 px-3 py-1 disabled:opacity-40"
        >
          Siguiente
        </button>
      </div>

      {seleccionada && (
        <DetalleNovedad
          idConfiguracion={idConfiguracion}
          novedad={seleccionada}
          onClose={() => setSeleccionada(null)}
        />
      )}
    </div>
  );
}
