import React, { useEffect, useState } from "react";
import chatApi from "../../../api/chatcenter";
import Swal from "sweetalert2";

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */
const parseSettings = (settings_json) => {
  if (!settings_json) return null;
  try {
    return typeof settings_json === "string"
      ? JSON.parse(settings_json)
      : settings_json;
  } catch {
    return null;
  }
};

const buildSettingsPayload = (form) => ({
  fields: {
    show_nombre: !!form.show_nombre,
    show_precio: !!form.show_precio,
    show_precio_proveedor: !!form.show_precio_proveedor,
    show_imagen: !!form.show_imagen,
    show_categoria: !!form.show_categoria,
    show_descripcion: !!form.show_descripcion,
    show_stock: !!form.show_stock,
    show_external_id: !!form.show_external_id,
    show_landing_url: !!form.show_landing_url,
    show_material: !!form.show_material,
  },
  password_privados: form.password_privados?.trim() || null,
});

const VISIBILIDAD_OPTIONS = [
  {
    value: "PUBLIC_ONLY",
    label: "Solo públicos",
    icon: "bx-world",
    desc: "Solo productos marcados como públicos",
  },
  {
    value: "PRIVATE_ONLY",
    label: "Solo privados",
    icon: "bx-lock",
    desc: "Solo productos marcados como privados",
  },
  {
    value: "BOTH",
    label: "Públicos + privados",
    icon: "bx-infinite",
    desc: "Muestra todos los productos",
  },
];

const CAMPOS_FIELDS = [
  {
    key: "show_nombre",
    label: "Nombre del producto",
    icon: "bx-purchase-tag",
    desc: "Muestra el nombre",
  },
  {
    key: "show_precio",
    label: "Precio",
    icon: "bx-dollar-circle",
    desc: "Muestra el precio",
  },
  {
    key: "show_precio_proveedor",
    label: "Precio proveedor",
    icon: "bx-purchase-tag-alt",
    desc: "Muestra el costo del proveedor",
  },
  {
    key: "show_imagen",
    label: "Imagen",
    icon: "bx-image-alt",
    desc: "Muestra la foto del producto",
  },
  {
    key: "show_categoria",
    label: "Categoría",
    icon: "bx-category-alt",
    desc: "Muestra la categoría",
  },
  {
    key: "show_descripcion",
    label: "Descripción",
    icon: "bx-align-left",
    desc: "Muestra la descripción completa",
  },
  {
    key: "show_stock",
    label: "Stock disponible",
    icon: "bx-box",
    desc: "Muestra las unidades en stock",
  },
  {
    key: "show_external_id",
    label: "ID externo (Dropi)",
    icon: "bx-barcode",
    desc: "Muestra el ID del producto en Dropi",
  },
  {
    key: "show_landing_url",
    label: "Enlace / Landing",
    icon: "bx-link-external",
    desc: "Muestra botón con el enlace externo del producto",
  },
  {
    key: "show_material",
    label: "Material / Ficha técnica",
    icon: "bx-file",
    desc: "Muestra botón con el enlace a la ficha técnica",
  },
];

const DEFAULT_FORM = {
  nombre_interno: "",
  titulo_publico: "",
  descripcion_publica: "",
  modo_visibilidad: "BOTH",
  show_nombre: true,
  show_precio: true,
  show_precio_proveedor: false,
  show_imagen: true,
  show_categoria: true,
  show_descripcion: true,
  show_stock: true,
  show_external_id: true,
  show_landing_url: true,
  show_material: true,
  password_privados: "",
  productIds: [],
};

/* ─────────────────────────────────────────────────────────────
   ProductSelector
───────────────────────────────────────────────────────────── */
const ProductSelector = ({ productos, productIds, onChange }) => {
  const [search, setSearch] = useState("");

  const filtered = productos.filter((p) =>
    search.trim()
      ? (p.nombre || "").toLowerCase().includes(search.trim().toLowerCase())
      : true,
  );

  const toggle = (pid) =>
    onChange(
      productIds.includes(pid)
        ? productIds.filter((x) => x !== pid)
        : [...productIds, pid],
    );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold">
            {productIds.length}
          </span>
          Productos seleccionados
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onChange(productos.map((p) => p.id))}
            className="px-2.5 py-1 text-xs rounded-md border border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => onChange([])}
            className="px-2.5 py-1 text-xs rounded-md border border-slate-200 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
          >
            Limpiar
          </button>
        </div>
      </div>

      <div className="relative mb-2">
        <i className="bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
        <input
          type="text"
          placeholder="Buscar productos…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none"
        />
      </div>

      <div className="flex-1 border border-slate-200 rounded-xl overflow-hidden">
        <div className="max-h-[42vh] overflow-auto divide-y divide-slate-50">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              Sin productos
            </div>
          ) : (
            filtered.map((p) => {
              const checked = productIds.includes(p.id);
              const priv = Number(p.es_privado) === 1;
              return (
                <label
                  key={p.id}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${checked ? "bg-indigo-50/60" : "hover:bg-slate-50"}`}
                >
                  <div
                    className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${checked ? "bg-indigo-600 border-indigo-600" : "border-slate-300"}`}
                  >
                    {checked && (
                      <i className="bx bx-check text-white text-xs" />
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(p.id)}
                    className="sr-only"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-slate-800 truncate">
                      {p.nombre}
                    </div>
                    <div className="flex items-center flex-wrap gap-1.5 mt-0.5">
                      <span className="text-xs text-slate-400">#{p.id}</span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${priv ? "bg-rose-50 text-rose-600" : "bg-sky-50 text-sky-600"}`}
                      >
                        {priv ? "Privado" : "Público"}
                      </span>
                      {p.precio != null && (
                        <span className="text-xs text-emerald-600 font-medium">
                          ${Number(p.precio).toFixed(2)}
                        </span>
                      )}
                      {p.stock != null && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5 ${
                            Number(p.stock) > 0
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          <i className="bx bx-box" style={{ fontSize: 9 }} />
                          {Number(p.stock) > 0 ? `${p.stock} uds` : "Sin stock"}
                        </span>
                      )}
                      {p.external_id != null && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-orange-50 text-orange-500 flex items-center gap-0.5">
                          <i
                            className="bx bx-barcode"
                            style={{ fontSize: 9 }}
                          />
                          Dropi #{p.external_id}
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   MAIN: CatalogoModal
───────────────────────────────────────────────────────────── */
const CatalogoModal = ({
  open,
  onClose,
  editingItem,
  idc,
  productos,
  onSaved,
}) => {
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [showPass, setShowPass] = useState(false);

  /* ── Cargar detalle al editar ── */
  useEffect(() => {
    if (!open) return;
    if (!editingItem) {
      setForm({ ...DEFAULT_FORM });
      setStep(1);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const { data } = await chatApi.post("/catalogos/obtenerCatalogo", {
          id_configuracion: idc,
          id_catalogo: editingItem.id,
        });
        const cat = data?.data?.catalogo || editingItem;
        const items = Array.isArray(data?.data?.items) ? data.data.items : [];
        const settings = parseSettings(cat.settings_json);

        setForm({
          nombre_interno: cat.nombre_interno || "",
          titulo_publico: cat.titulo_publico || "",
          descripcion_publica: cat.descripcion_publica || "",
          modo_visibilidad: cat.modo_visibilidad || "BOTH",
          show_nombre: settings?.fields?.show_nombre ?? true,
          show_precio: settings?.fields?.show_precio ?? true,
          show_precio_proveedor:
            settings?.fields?.show_precio_proveedor ?? false,
          show_imagen: settings?.fields?.show_imagen ?? true,
          show_categoria: settings?.fields?.show_categoria ?? true,
          show_descripcion: settings?.fields?.show_descripcion ?? true,
          show_stock: settings?.fields?.show_stock ?? true,
          show_external_id: settings?.fields?.show_external_id ?? true,
          show_landing_url: settings?.fields?.show_landing_url ?? true,
          show_material: settings?.fields?.show_material ?? true,
          password_privados: settings?.password_privados ?? "",
          productIds: items.map((it) => it.id_producto),
        });
        setStep(1);
      } catch {
        Swal.fire({ icon: "error", title: "Error al cargar catálogo" });
        onClose();
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingItem]);

  /* ── Guardar ── */
  const handleSave = async () => {
    if (!form.nombre_interno.trim()) {
      setStep(1);
      Swal.fire({ icon: "warning", title: "Ingresa el nombre interno" });
      return;
    }
    if (!form.productIds.length) {
      setStep(3);
      Swal.fire({ icon: "warning", title: "Selecciona al menos 1 producto" });
      return;
    }

    setSaving(true);
    try {
      let catalogoId = editingItem?.id;

      if (catalogoId) {
        await chatApi.post("/catalogos/actualizarCatalogo", {
          id_configuracion: idc,
          id_catalogo: catalogoId,
          nombre_interno: form.nombre_interno.trim(),
          titulo_publico: form.titulo_publico?.trim() || null,
          descripcion_publica: form.descripcion_publica?.trim() || null,
          modo_visibilidad: form.modo_visibilidad,
        });
      } else {
        const { data } = await chatApi.post("/catalogos/crearCatalogo", {
          id_configuracion: idc,
          nombre_interno: form.nombre_interno.trim(),
          titulo_publico: form.titulo_publico?.trim() || null,
          descripcion_publica: form.descripcion_publica?.trim() || null,
          modo_visibilidad: form.modo_visibilidad,
        });
        catalogoId = data?.data?.id;
        if (!catalogoId) throw new Error("No se obtuvo ID del catálogo");
      }

      await chatApi.post("/catalogos/guardarSettingsCatalogo", {
        id_configuracion: idc,
        id_catalogo: catalogoId,
        settings: buildSettingsPayload(form),
      });

      await chatApi.post("/catalogos/guardarItemsCatalogo", {
        id_configuracion: idc,
        id_catalogo: catalogoId,
        items: form.productIds.map((id_producto, idx) => ({
          id_producto,
          orden: idx,
        })),
      });

      Swal.fire({
        icon: "success",
        title: editingItem ? "Catálogo actualizado" : "Catálogo creado",
        timer: 1400,
        showConfirmButton: false,
      });
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Error al guardar",
        text: err?.response?.data?.message || "Intenta de nuevo.",
      });
    } finally {
      setSaving(false);
    }
  };

  const STEPS = [
    { n: 1, label: "Información", icon: "bx-info-circle" },
    { n: 2, label: "Campos", icon: "bx-toggle-left" },
    { n: 3, label: "Productos", icon: "bx-package" },
  ];

  const hayPrivados = productos.some(
    (p) => Number(p.es_privado) === 1 && form.productIds.includes(p.id),
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
        style={{ animation: "fadeSlideUp .22s ease" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {editingItem ? "Editar catálogo" : "Nuevo catálogo"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {editingItem
                ? `Modificando: ${editingItem.nombre_interno}`
                : "Configura el catálogo y asigna productos"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <i className="bx bx-x text-2xl" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/60 px-6">
          {STEPS.map((s) => (
            <button
              key={s.n}
              type="button"
              onClick={() => setStep(s.n)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                step === s.n
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <i className={`bx ${s.icon} text-base`} />
              {s.label}
              {s.n === 3 && form.productIds.length > 0 && (
                <span className="ml-1 bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {form.productIds.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-slate-500">
              <svg
                className="animate-spin w-5 h-5 text-indigo-600"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              Cargando catálogo…
            </div>
          ) : (
            <>
              {/* ── STEP 1: Información — full width ── */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                        Nombre interno <span className="text-red-500">*</span>
                      </label>
                      <input
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition"
                        placeholder="Ej. Catálogo Marzo — Clientes VIP"
                        value={form.nombre_interno}
                        onChange={(e) =>
                          setForm({ ...form, nombre_interno: e.target.value })
                        }
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        Solo visible en el panel de administración.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                        Título público
                      </label>
                      <input
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition"
                        placeholder="Ej. Catálogo de productos disponibles"
                        value={form.titulo_publico}
                        onChange={(e) =>
                          setForm({ ...form, titulo_publico: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                        Descripción pública
                      </label>
                      <textarea
                        rows={3}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none resize-none transition"
                        placeholder="Ej. Escríbenos para solicitar productos."
                        value={form.descripcion_publica}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            descripcion_publica: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Visibilidad */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
                      Qué productos mostrar
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {VISIBILIDAD_OPTIONS.map((opt) => {
                        const active = form.modo_visibilidad === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                              setForm({ ...form, modo_visibilidad: opt.value })
                            }
                            className={`flex flex-col items-start gap-1 p-4 rounded-xl border-2 text-sm font-medium transition-all text-left ${
                              active
                                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1 ${active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}
                            >
                              <i className={`bx ${opt.icon} text-lg`} />
                            </div>
                            <span className="font-semibold">{opt.label}</span>
                            <span
                              className={`text-xs font-normal ${active ? "text-indigo-500" : "text-slate-400"}`}
                            >
                              {opt.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 2: Campos — full width grid ── */}
              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <p className="text-sm text-slate-500 mb-4">
                      Elige qué campos se mostrarán en la landing pública del
                      catálogo.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {CAMPOS_FIELDS.map(({ key, label, icon, desc }) => {
                        const active = !!form[key];
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() =>
                              setForm({ ...form, [key]: !form[key] })
                            }
                            className={`flex items-center gap-4 p-4 rounded-xl border-2 text-sm font-medium transition-all text-left ${
                              active
                                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                : "border-slate-200 text-slate-600 hover:border-slate-300"
                            }`}
                          >
                            <div
                              className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}
                            >
                              <i className={`bx ${icon} text-xl`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold">{label}</div>
                              <div
                                className={`text-xs font-normal mt-0.5 ${active ? "text-indigo-500" : "text-slate-400"}`}
                              >
                                {desc}
                              </div>
                            </div>
                            <div
                              className={`w-10 h-5 rounded-full transition-all flex-shrink-0 relative ${active ? "bg-indigo-500" : "bg-slate-200"}`}
                            >
                              <div
                                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${active ? "translate-x-5" : "translate-x-0.5"}`}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Contraseña para privados */}
                  <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <i className="bx bx-lock-alt text-amber-600 text-lg" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-800">
                          Contraseña para productos privados
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Si hay productos privados en este catálogo, el
                          visitante deberá ingresar esta contraseña para verlos.
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type={showPass ? "text" : "password"}
                        className="w-full border border-amber-200 bg-white rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none transition pr-10"
                        placeholder="Dejar vacío si no necesitas protección"
                        value={form.password_privados}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            password_privados: e.target.value,
                          })
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <i
                          className={`bx ${showPass ? "bx-hide" : "bx-show"} text-lg`}
                        />
                      </button>
                    </div>
                    {hayPrivados && !form.password_privados?.trim() && (
                      <p className="text-xs text-amber-600 mt-2 flex items-center gap-1.5">
                        <i className="bx bx-info-circle" />
                        Tienes productos privados seleccionados sin contraseña —
                        cualquiera podrá verlos.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ── STEP 3: Productos ── */}
              {step === 3 && (
                <ProductSelector
                  productos={productos}
                  productIds={form.productIds}
                  onChange={(ids) => setForm({ ...form, productIds: ids })}
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between gap-3">
          <div className="flex gap-1">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className={`h-1.5 w-8 rounded-full transition-colors ${step === s.n ? "bg-indigo-600" : "bg-slate-200"}`}
              />
            ))}
          </div>
          <div className="flex gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-4 py-2.5 text-sm border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Anterior
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="px-5 py-2.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                Siguiente <i className="bx bx-right-arrow-alt text-base" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl font-semibold transition-colors flex items-center gap-2 shadow-md shadow-indigo-200"
              >
                {saving ? (
                  <>
                    <svg
                      className="animate-spin w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Guardando…
                  </>
                ) : (
                  <>
                    <i className="bx bx-save text-base" />
                    {editingItem ? "Actualizar" : "Crear catálogo"}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(18px) scale(.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default CatalogoModal;
