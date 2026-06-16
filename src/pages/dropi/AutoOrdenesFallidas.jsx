import React, { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";

/* Motivos legibles por paso_fallo (solo aplica a estado 'fallida') */
const REASONS = {
  producto: {
    label: "Producto no encontrado o sin stock",
    hint: "Verifica que el producto esté vinculado a Dropi y tenga stock.",
    tone: "red",
    fields: ["producto"],
  },
  producto_detalle: {
    label: "No se pudo leer el producto en Dropi",
    hint: "Pudo ser un límite temporal de peticiones. Reintenta en un momento.",
    tone: "blue",
    fields: [],
  },
  provincia: {
    label: "La provincia no coincide",
    hint: "Corrige la provincia según el catálogo de Dropi.",
    tone: "amber",
    fields: ["provincia"],
  },
  ciudad: {
    label: "La ciudad no coincide",
    hint: "Corrige la ciudad (revisa tildes y nombre exacto).",
    tone: "amber",
    fields: ["ciudad", "provincia"],
  },
  remitente: {
    label: "No se pudo resolver la bodega de origen",
    hint: "El producto no tiene bodega/ciudad de origen en Dropi.",
    tone: "red",
    fields: [],
  },
  precio: {
    label: "Precio inválido o menor al costo",
    hint: "Corrige el precio total que cobrarás al cliente.",
    tone: "amber",
    fields: ["precio"],
  },
  cotizacion: {
    label: "Sin transportadoras para esa ruta",
    hint: "Revisa la ciudad de destino; puede no tener cobertura.",
    tone: "amber",
    fields: ["ciudad", "provincia"],
  },
  create: {
    label: "Error al crear la orden en Dropi",
    hint: "Revisa teléfono, nombre y dirección del cliente.",
    tone: "red",
    fields: ["telefono", "nombre", "direccion"],
  },
};

const PENDIENTE = {
  label: "Pendiente de subir",
  hint: "Completa producto, precio y ciudad, y crea la orden en Dropi.",
  tone: "gray",
  fields: ["producto", "precio", "provincia", "ciudad"],
};

const reasonOf = (item) => {
  if (item.estado === "pendiente") return PENDIENTE;
  return (
    REASONS[item.paso_fallo] || {
      label: item.paso_fallo || "No se pudo crear la orden",
      hint: "Revisa los datos y vuelve a intentar.",
      tone: "red",
      fields: [],
    }
  );
};

const TONE_CLASSES = {
  red: "bg-rose-50 text-rose-700 border-rose-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  blue: "bg-sky-50 text-sky-700 border-sky-200",
  gray: "bg-slate-50 text-slate-600 border-slate-200",
};

const FIELD_DEFS = [
  { key: "nombre", label: "Nombre", icon: "bx-user", col: 1 },
  { key: "telefono", label: "Teléfono", icon: "bx-phone", col: 1 },
  { key: "provincia", label: "Provincia", icon: "bx-map", col: 1 },
  { key: "ciudad", label: "Ciudad", icon: "bx-map-pin", col: 1 },
  { key: "direccion", label: "Dirección", icon: "bx-home", col: 2 },
  { key: "producto", label: "Producto", icon: "bx-package", col: 1 },
  { key: "precio", label: "Precio total", icon: "bx-dollar", col: 1 },
  { key: "cantidad", label: "Cantidad", icon: "bx-hash", col: 1 },
];

// Garantiza un form completo con las 8 llaves (esto evita campos en blanco)
const formFromItem = (it) => ({
  nombre: it.datos?.nombre ?? "",
  telefono: it.datos?.telefono ?? it.telefono ?? "",
  provincia: it.datos?.provincia ?? "",
  ciudad: it.datos?.ciudad ?? "",
  direccion: it.datos?.direccion ?? "",
  producto: it.datos?.producto ?? "",
  precio: it.datos?.precio ?? "",
  cantidad: it.datos?.cantidad ?? "1",
});

const keyOf = (it) => it.id_log || `cli-${it.id_cliente}`;

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3500,
  timerProgressBar: true,
});

export default function AutoOrdenesFallidas({
  id_configuracion,
  onOrderCreated,
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const [editingKey, setEditingKey] = useState(null);
  const [form, setForm] = useState({});
  const [submittingKey, setSubmittingKey] = useState(null);
  const [showDetalleKey, setShowDetalleKey] = useState(null);

  const fetchPendientes = useCallback(async () => {
    if (!id_configuracion) return;
    setLoading(true);
    try {
      const res = await chatApi.post(
        "dropi_integrations/auto-orders/pendientes",
        {
          id_configuracion,
          limit: 100,
          offset: 0,
        },
      );
      if (res?.data?.ok) {
        setItems(res.data.data || []);
        setTotal(res.data.total || 0);
      }
    } catch (_) {
      /* silencioso para el badge */
    } finally {
      setLoading(false);
    }
  }, [id_configuracion]);

  useEffect(() => {
    fetchPendientes();
  }, [fetchPendientes]);

  const openDrawer = () => {
    setOpen(true);
    fetchPendientes();
  };
  const closeDrawer = () => {
    setOpen(false);
    setEditingKey(null);
    setShowDetalleKey(null);
  };

  const startEdit = (it) => {
    setEditingKey(keyOf(it));
    setForm(formFromItem(it));
  };
  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (it, datosBot) => {
    const k = keyOf(it);
    setSubmittingKey(k);
    try {
      // con id_log → reintento sobre el log; sin id_log → creación manual
      const body = it.id_log
        ? { id_log: it.id_log, ...(datosBot ? { datosBot } : {}) }
        : {
            id_configuracion,
            id_cliente: it.id_cliente,
            datosBot,
            force: true,
          };

      const res = await chatApi.post(
        "dropi_integrations/orders/myorders/auto-order",
        body,
      );

      if (res?.data?.ok) {
        Toast.fire({
          icon: "success",
          title: `Orden creada en Dropi (#${res.data.orderId})`,
        });
        setItems((prev) => prev.filter((x) => keyOf(x) !== k));
        setTotal((t) => Math.max(0, t - 1));
        setEditingKey(null);
        onOrderCreated?.(res.data.orderId);
        return;
      }

      // siguió fallando → actualizamos motivo + id_log nuevo
      const nuevoIdLog = res?.data?.id_log || it.id_log;
      setItems((prev) =>
        prev.map((x) =>
          keyOf(x) === k
            ? {
                ...x,
                id_log: nuevoIdLog,
                estado: "fallida",
                paso_fallo: res?.data?.paso_fallo || x.paso_fallo,
                detalle: res?.data?.detalle || x.detalle,
                datos: datosBot ? { ...x.datos, ...datosBot } : x.datos,
              }
            : x,
        ),
      );
      if (editingKey === k && nuevoIdLog) setEditingKey(nuevoIdLog);
      Toast.fire({
        icon: "error",
        title: reasonOf({
          estado: "fallida",
          paso_fallo: res?.data?.paso_fallo,
        }).label,
      });
    } catch (e) {
      Toast.fire({
        icon: "error",
        title: e?.response?.data?.message || "Error al crear la orden",
      });
    } finally {
      setSubmittingKey(null);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openDrawer}
        className="relative inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition"
        title="Pedidos en 'generar guía' que aún no se subieron a Dropi"
      >
        <i className="bx bx-cloud-upload text-lg text-rose-500" />
        <span className="text-sm font-semibold text-gray-700">
          Pedidos sin subir
        </span>
        {total > 0 && (
          <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-xs font-bold">
            {total}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeDrawer}
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-gray-50 shadow-2xl flex flex-col animate-[slideIn_.25s_ease]">
            <div className="bg-[#171931] text-white p-5 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gradient-to-br from-indigo-500/30 to-violet-500/20 blur-2xl" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 grid place-items-center shadow-lg">
                    <i className="bx bx-cloud-upload text-2xl" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold leading-tight">
                      Pedidos sin subir a Dropi
                    </h2>
                    <p className="text-xs text-white/70 mt-0.5">
                      Clientes en "generar guía" sin orden creada.
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeDrawer}
                  className="w-9 h-9 rounded-xl hover:bg-white/10 grid place-items-center transition"
                >
                  <i className="bx bx-x text-2xl" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="text-center text-gray-500 py-16">
                  <i className="bx bx-loader-alt bx-spin text-3xl" />
                  <p className="mt-2 text-sm">Cargando pedidos...</p>
                </div>
              ) : items.length === 0 ? (
                <div className="text-center text-gray-500 py-16">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 grid place-items-center mx-auto mb-3">
                    <i className="bx bx-check-circle text-3xl text-emerald-500" />
                  </div>
                  <p className="font-semibold text-gray-700">Todo al día</p>
                  <p className="text-sm text-gray-400 mt-1">
                    No hay pedidos pendientes de subir a Dropi.
                  </p>
                </div>
              ) : (
                items.map((it) => {
                  const k = keyOf(it);
                  const r = reasonOf(it);
                  const isEditing = editingKey === k;
                  const isSubmitting = submittingKey === k;
                  const nombre = it.datos?.nombre || "Sin nombre";
                  const esPendiente = it.estado === "pendiente";

                  return (
                    <div
                      key={k}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 truncate">
                              {nombre}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                              <i className="bx bx-phone" />
                              {it.datos?.telefono ||
                                it.telefono ||
                                "Sin teléfono"}
                            </div>
                          </div>
                          <span
                            className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${TONE_CLASSES[r.tone]}`}
                          >
                            <i
                              className={`bx ${esPendiente ? "bx-time-five" : "bx-error-circle"}`}
                            />
                            {r.label}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 text-gray-600">
                            <i className="bx bx-package" />
                            {it.datos?.producto || "—"}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 text-gray-600">
                            <i className="bx bx-hash" />
                            {it.datos?.cantidad || "1"}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 text-gray-600">
                            <i className="bx bx-dollar" />
                            {it.datos?.precio || "—"}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 text-gray-600">
                            <i className="bx bx-map-pin" />
                            {it.datos?.ciudad || "—"}
                          </span>
                        </div>

                        <p className="mt-3 text-xs text-gray-500 flex items-start gap-1.5">
                          <i className="bx bx-bulb text-amber-500 mt-0.5" />
                          {r.hint}
                        </p>

                        {it.detalle && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setShowDetalleKey(
                                  showDetalleKey === k ? null : k,
                                )
                              }
                              className="mt-2 text-xs text-gray-400 hover:text-gray-600 inline-flex items-center gap-1"
                            >
                              <i
                                className={`bx bx-chevron-${showDetalleKey === k ? "up" : "down"}`}
                              />
                              Detalle técnico
                            </button>
                            {showDetalleKey === k && (
                              <pre className="mt-1 text-[11px] text-gray-500 bg-gray-50 rounded-lg p-2 whitespace-pre-wrap break-words">
                                {it.detalle}
                              </pre>
                            )}
                          </>
                        )}
                      </div>

                      {isEditing && (
                        <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-gray-50/50">
                          <div className="grid grid-cols-2 gap-3 mt-3">
                            {FIELD_DEFS.map((fd) => {
                              const highlight = r.fields.includes(fd.key);
                              return (
                                <div
                                  key={fd.key}
                                  className={fd.col === 2 ? "col-span-2" : ""}
                                >
                                  <label className="text-[11px] font-semibold text-gray-500 flex items-center gap-1 mb-1">
                                    <i className={`bx ${fd.icon}`} />
                                    {fd.label}
                                    {highlight && (
                                      <span className="text-rose-500">•</span>
                                    )}
                                  </label>
                                  <input
                                    type="text"
                                    value={form[fd.key] ?? ""}
                                    onChange={(e) =>
                                      setField(fd.key, e.target.value)
                                    }
                                    className={`w-full px-3 py-2 rounded-lg border text-sm text-gray-900 placeholder-gray-400 outline-none transition ${
                                      highlight
                                        ? "border-amber-300 bg-amber-50/40 focus:ring-2 focus:ring-amber-300"
                                        : "border-gray-200 bg-white focus:ring-2 focus:ring-[#171931]"
                                    }`}
                                  />
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex items-center gap-2 mt-4">
                            <button
                              onClick={() => submit(it, form)}
                              disabled={isSubmitting}
                              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold shadow hover:opacity-95 transition disabled:opacity-60"
                            >
                              {isSubmitting ? (
                                <i className="bx bx-loader-alt bx-spin text-base" />
                              ) : (
                                <i className="bx bx-cloud-upload text-base" />
                              )}
                              Crear orden en Dropi
                            </button>
                            <button
                              onClick={() => setEditingKey(null)}
                              disabled={isSubmitting}
                              className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-100 transition"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}

                      {!isEditing && (
                        <div className="px-4 pb-4 flex items-center gap-2">
                          <button
                            onClick={() => startEdit(it)}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#171931] text-white text-sm font-semibold hover:opacity-95 transition"
                          >
                            <i className="bx bx-edit-alt text-base" />
                            {esPendiente
                              ? "Completar y crear"
                              : "Corregir y crear"}
                          </button>
                          {!esPendiente && (
                            <button
                              onClick={() => submit(it, null)}
                              disabled={isSubmitting}
                              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition disabled:opacity-60"
                              title="Reintentar sin cambios (útil si fue un error temporal)"
                            >
                              {isSubmitting ? (
                                <i className="bx bx-loader-alt bx-spin text-base" />
                              ) : (
                                <i className="bx bx-refresh text-base" />
                              )}
                              Reintentar
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-white flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {total} pedido{total === 1 ? "" : "s"} pendiente
                {total === 1 ? "" : "s"}
              </span>
              <button
                onClick={fetchPendientes}
                className="text-xs font-semibold text-[#171931] inline-flex items-center gap-1 hover:opacity-80"
              >
                <i className="bx bx-refresh" />
                Actualizar
              </button>
            </div>
          </div>

          <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
        </div>
      )}
    </>
  );
}
