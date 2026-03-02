// src/components/productos/modales/ProductoModal.jsx
import React, { useEffect, useRef, useState } from "react";
import chatApi from "../../../api/chatcenter";
import Swal from "sweetalert2";

/* ─────────────────────────────────────────────────────────────
   Defaults
───────────────────────────────────────────────────────────── */
const EMPTY_FORM = {
  nombre: "",
  descripcion: "",
  tipo: "",
  precio: "",
  duracion: "",
  id_categoria: "",
  imagen: null,
  video: null,
  nombre_upsell: "",
  descripcion_upsell: "",
  precio_upsell: "",
  imagen_upsell: null,
  combos_producto: [
    { cantidad: "", precio: "" },
    { cantidad: "", precio: "" },
    { cantidad: "", precio: "" },
  ],
  /* campos catálogo — agrupados al final */
  es_privado: "", // "" | "0" | "1"   — FIX: nombre correcto del campo en BD
  material: "",
  landing_url: "",
};

const normalizaTipo = (t) => {
  const s = String(t || "")
    .toLowerCase()
    .trim();
  if (!s) return "";
  return s.startsWith("ser") ? "servicio" : "producto";
};

const normalizeCombos = (v) => {
  if (!v) return EMPTY_FORM.combos_producto;
  let arr = v;
  if (typeof v === "string") {
    try {
      arr = JSON.parse(v);
    } catch {
      arr = [];
    }
  }
  if (!Array.isArray(arr)) return EMPTY_FORM.combos_producto;
  const filled = [...arr];
  while (filled.length < 3) filled.push({ cantidad: "", precio: "" });
  return filled;
};

/* ─────────────────────────────────────────────────────────────
   Small UI atoms
───────────────────────────────────────────────────────────── */
const Lbl = ({ children, required }) => (
  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
    {children}
    {required && <span className="text-red-400 ml-0.5">*</span>}
  </label>
);

const Inp = ({ className = "", ...props }) => (
  <input
    {...props}
    className={`w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none
      transition focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white ${className}`}
  />
);

const Sel = ({ children, className = "", ...props }) => (
  <select
    {...props}
    className={`w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none
      transition focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white ${className}`}
  >
    {children}
  </select>
);

/* section heading */
const SecHead = ({ icon, title }) => (
  <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 mb-4">
    <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#171931]">
      <i className={`bx ${icon} text-white text-sm`} />
    </div>
    <span className="text-sm font-bold text-slate-700">{title}</span>
  </div>
);

/* dropzone */
const DropZone = ({
  dropRef,
  onDrop,
  onDragOver,
  onDragLeave,
  onPick,
  accept,
  icon,
  hint,
  preview,
  onRemove,
}) => (
  <div>
    <div
      ref={dropRef}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center cursor-pointer
        hover:border-indigo-300 hover:bg-slate-50 transition-colors"
    >
      <div className="flex flex-col items-center gap-2">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
          <i className={`bx ${icon} text-2xl`} />
        </div>
        <p className="text-sm text-slate-600">
          Arrastra aquí o{" "}
          <label className="text-indigo-600 font-semibold cursor-pointer hover:underline">
            selecciona{" "}
            <input
              type="file"
              accept={accept}
              className="hidden"
              onChange={(e) => onPick(e.target.files?.[0])}
            />
          </label>
        </p>
        <p className="text-xs text-slate-400">{hint}</p>
      </div>
    </div>
    {preview && (
      <div className="relative mt-2">
        {preview}
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-2 right-2 bg-white/90 hover:bg-white border border-slate-200
            text-slate-600 text-xs px-2.5 py-1 rounded-lg shadow-sm transition-colors"
        >
          Quitar
        </button>
      </div>
    )}
  </div>
);

/* ─────────────────────────────────────────────────────────────
   MAIN
───────────────────────────────────────────────────────────── */
const ProductoModal = ({
  open,
  onClose,
  editingProduct,
  categorias,
  onSaved,
}) => {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [combosOpen, setCombosOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewVideo, setPreviewVideo] = useState(null);
  const [previewUpsell, setPreviewUpsell] = useState(null);

  const dropRef = useRef(null);
  const dropVideoRef = useRef(null);
  const dropUpsellRef = useRef(null);

  /* ── Populate on open ── */
  useEffect(() => {
    if (!open) return;
    if (editingProduct) {
      const p = editingProduct;

      /*
       * FIX es_privado:
       * El backend guarda como `es_privado` en BD.
       * Algunos responses legacy devuelven `is_private`.
       * Probamos ambos para compatibilidad.
       */
      const privRaw = p.es_privado ?? p.is_private;
      const privVal =
        privRaw === 1 || privRaw === true
          ? "1"
          : privRaw === 0 || privRaw === false
            ? "0"
            : "";

      setForm({
        nombre: p.nombre || "",
        descripcion: p.descripcion || "",
        tipo: normalizaTipo(p.tipo),
        precio: p.precio ?? "",
        duracion: p.duracion ?? "",
        id_categoria: p.id_categoria ?? "",
        imagen: null,
        video: null,
        nombre_upsell: p.nombre_upsell ?? "",
        descripcion_upsell: p.descripcion_upsell ?? "",
        precio_upsell: p.precio_upsell ?? "",
        imagen_upsell: null,
        combos_producto: normalizeCombos(p.combos_producto),
        es_privado: privVal,
        material: p.material ?? "",
        landing_url: p.landing_url ?? "",
      });

      setPreviewUrl(p.imagen_url || null);
      setPreviewVideo(p.video_url || null);
      setPreviewUpsell(p.imagen_upsell_url || null);

      /* abrir acordeón catálogo si ya tiene datos */
      if (privVal !== "" || p.material || p.landing_url) setCatalogOpen(true);
    } else {
      setForm({ ...EMPTY_FORM });
      setPreviewUrl(null);
      setPreviewVideo(null);
      setPreviewUpsell(null);
      setCatalogOpen(false);
    }
    setCombosOpen(false);
  }, [open, editingProduct]);

  const setF = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  /* ── File pickers ── */
  const makeDragHandlers = (ref) => ({
    onDragOver: (e) => {
      e.preventDefault();
      ref.current?.classList.add("border-indigo-400", "bg-indigo-50/40");
    },
    onDragLeave: () => {
      ref.current?.classList.remove("border-indigo-400", "bg-indigo-50/40");
    },
  });

  const pickImage = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setF("imagen", file);
  };
  const dropImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    pickImage(e.dataTransfer.files?.[0]);
    dropRef.current?.classList.remove("border-indigo-400", "bg-indigo-50/40");
  };

  const pickVideo = (file) => {
    if (!file || !file.type.startsWith("video/")) return;
    if (file.size > 50 * 1024 * 1024) {
      Swal.fire({
        icon: "warning",
        title: "Video demasiado grande",
        text: "Máx 50 MB.",
      });
      return;
    }
    if (previewVideo?.startsWith("blob:")) URL.revokeObjectURL(previewVideo);
    setPreviewVideo(URL.createObjectURL(file));
    setF("video", file);
  };
  const dropVideo = (e) => {
    e.preventDefault();
    e.stopPropagation();
    pickVideo(e.dataTransfer.files?.[0]);
    dropVideoRef.current?.classList.remove(
      "border-indigo-400",
      "bg-indigo-50/40",
    );
  };

  const pickUpsell = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (previewUpsell?.startsWith("blob:")) URL.revokeObjectURL(previewUpsell);
    setPreviewUpsell(URL.createObjectURL(file));
    setF("imagen_upsell", file);
  };
  const dropUpsell = (e) => {
    e.preventDefault();
    e.stopPropagation();
    pickUpsell(e.dataTransfer.files?.[0]);
    dropUpsellRef.current?.classList.remove(
      "border-indigo-400",
      "bg-indigo-50/40",
    );
  };

  /* ── Submit ── */
  const handleSave = async () => {
    if (!form.nombre.trim()) {
      Swal.fire({ icon: "warning", title: "Ingresa el nombre del producto" });
      return;
    }
    if (!form.tipo) {
      Swal.fire({ icon: "warning", title: "Selecciona el tipo" });
      return;
    }
    if (!form.precio) {
      Swal.fire({ icon: "warning", title: "Ingresa el precio" });
      return;
    }

    setSaving(true);
    try {
      const idc = parseInt(localStorage.getItem("id_configuracion"));
      const data = new FormData();

      Object.entries(form).forEach(([k, v]) => {
        if (k === "combos_producto") {
          data.append(k, JSON.stringify(v));
        } else if (v !== null && v !== undefined && v !== "") {
          /*
           * FIX: el campo en BD es `es_privado`.
           * Enviamos exactamente ese nombre al backend.
           * NO enviamos `is_private` (campo legacy incorrecto).
           */
          data.append(k, v);
        }
      });

      if (editingProduct) data.append("id_producto", editingProduct.id);
      else data.append("id_configuracion", idc);

      const url = editingProduct
        ? "/productos/actualizarProducto"
        : "/productos/agregarProducto";

      await chatApi.post(url, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      Swal.fire({
        icon: "success",
        title: editingProduct ? "Producto actualizado" : "Producto agregado",
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

  if (!open) return null;

  const imgHandlers = makeDragHandlers(dropRef);
  const videoHandlers = makeDragHandlers(dropVideoRef);
  const upsellHandlers = makeDragHandlers(dropUpsellRef);

  const wordCount = form.descripcion.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3"
      style={{ background: "rgba(5,7,20,.72)", backdropFilter: "blur(12px)" }}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className="w-full max-w-5xl max-h-[92vh] rounded-2xl overflow-hidden flex flex-col"
        style={{
          boxShadow: "0 24px 80px rgba(0,0,0,.55)",
          animation: "pmIn .22s cubic-bezier(.34,1.4,.64,1)",
        }}
      >
        {/* ═══════════ HEADER — todo azul, sin línea blanca ═══════════ */}
        <div className="flex items-center justify-between px-6 py-5 flex-shrink-0 bg-[#171931]">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#171931]"
              style={{
                background: "rgba(255,255,255,.12)",
                border: "1px solid rgba(255,255,255,.18)",
              }}
            >
              <i
                className={`bx ${editingProduct ? "bx-edit" : "bx-plus-circle"} text-white text-xl`}
              />
            </div>
            <div>
              <h2 className="text-white font-bold text-base leading-tight">
                {editingProduct ? "Editar producto" : "Agregar producto"}
              </h2>
              <p className="text-indigo-300 text-xs mt-0.5">
                {editingProduct
                  ? `ID #${editingProduct.id} · ${editingProduct.nombre}`
                  : "Completa los campos requeridos para crear el producto"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {editingProduct && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-indigo-300 bg-white/8 px-3 py-1.5 rounded-lg border border-white/10">
                <i className="bx bx-pencil text-xs" />
                Modo edición
              </div>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors text-white/60 hover:text-white hover:bg-white/12"
            >
              <i className="bx bx-x text-xl" />
            </button>
          </div>
        </div>

        {/* ═══════════ BODY — blanco ═══════════ */}
        <div className="flex-1 overflow-y-auto bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {/* ─── COLUMNA IZQUIERDA ─── */}
            <div className="p-6 space-y-6">
              {/* Información principal */}
              <div>
                <SecHead icon="bx-info-circle" title="Información principal" />
                <div className="space-y-4">
                  <div>
                    <Lbl required>Nombre</Lbl>
                    <Inp
                      placeholder="Ej. Plan Premium, Protector de colchón…"
                      value={form.nombre}
                      onChange={(e) => setF("nombre", e.target.value)}
                    />
                  </div>

                  <div>
                    <Lbl>Descripción</Lbl>
                    <textarea
                      rows={4}
                      placeholder="Detalle del producto o servicio…"
                      value={form.descripcion}
                      onChange={(e) => {
                        const words = e.target.value.trim().split(/\s+/);
                        if (words.length <= 200)
                          setF("descripcion", e.target.value);
                      }}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none
                        resize-y transition focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      {wordCount}/200 palabras
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Lbl required>Tipo</Lbl>
                      <Sel
                        value={form.tipo}
                        onChange={(e) => setF("tipo", e.target.value)}
                      >
                        <option value="">Selecciona</option>
                        <option value="producto">Producto</option>
                        <option value="servicio">Servicio</option>
                      </Sel>
                    </div>
                    <div>
                      <Lbl required>Precio</Lbl>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">
                          $
                        </span>
                        <Inp
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="pl-7"
                          value={form.precio}
                          onChange={(e) => setF("precio", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {form.tipo === "servicio" && (
                    <div>
                      <Lbl>Duración (horas)</Lbl>
                      <Sel
                        value={form.duracion}
                        onChange={(e) => setF("duracion", e.target.value)}
                      >
                        <option value="0">Selecciona duración</option>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>
                            {n} hora{n > 1 ? "s" : ""}
                          </option>
                        ))}
                      </Sel>
                    </div>
                  )}

                  <div>
                    <Lbl required>Categoría</Lbl>
                    <Sel
                      value={form.id_categoria}
                      onChange={(e) => setF("id_categoria", e.target.value)}
                    >
                      <option value="">Selecciona categoría</option>
                      {categorias.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </Sel>
                  </div>
                </div>
              </div>

              {/* Combos acordeón */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setCombosOpen(!combosOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <i className="bx bx-package text-slate-500" />
                    <span className="text-sm font-semibold text-slate-700">
                      Combos
                    </span>
                    <span className="text-xs text-slate-400 font-normal">
                      (opcional)
                    </span>
                  </div>
                  <i
                    className={`bx bx-chevron-${combosOpen ? "up" : "down"} text-slate-400 text-lg`}
                  />
                </button>

                {combosOpen && (
                  <div className="border-t border-slate-100 p-4 grid grid-cols-3 gap-3">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="border border-slate-100 rounded-xl p-3 space-y-2"
                      >
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                          Combo {i + 1}
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-1">
                            Cantidad
                          </div>
                          <Inp
                            type="number"
                            min="1"
                            placeholder="Ej. 2"
                            value={form.combos_producto?.[i]?.cantidad || ""}
                            onChange={(e) => {
                              const u = [...form.combos_producto];
                              u[i] = { ...u[i], cantidad: e.target.value };
                              setF("combos_producto", u);
                            }}
                          />
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-1">
                            Precio
                          </div>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                              $
                            </span>
                            <Inp
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              className="pl-6"
                              value={form.combos_producto?.[i]?.precio || ""}
                              onChange={(e) => {
                                const u = [...form.combos_producto];
                                u[i] = { ...u[i], precio: e.target.value };
                                setF("combos_producto", u);
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Imagen */}
              <div>
                <SecHead icon="bx-image-alt" title="Imagen del producto" />
                <DropZone
                  dropRef={dropRef}
                  onDrop={dropImage}
                  {...imgHandlers}
                  onPick={pickImage}
                  accept="image/*"
                  icon="bx-image-add"
                  hint="PNG, JPG, WEBP — máx. 5 MB"
                  preview={
                    previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full max-h-44 object-cover rounded-xl ring-1 ring-slate-200"
                      />
                    ) : null
                  }
                  onRemove={() => {
                    if (previewUrl?.startsWith("blob:"))
                      URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                    setF("imagen", null);
                  }}
                />
              </div>

              {/* ═══ ACORDEÓN LÓGICA CATÁLOGOS ═══ */}
              <div
                className="rounded-xl overflow-hidden"
                style={{ border: "1.5px solid #c7d2fe" }}
              >
                <button
                  type="button"
                  onClick={() => setCatalogOpen(!catalogOpen)}
                  className="w-full flex items-center justify-between px-4 py-3.5 transition-colors"
                  style={{ background: catalogOpen ? "#eef2ff" : "#f5f7ff" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-600">
                      <i className="bx bx-book-open text-white text-sm" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-indigo-700">
                        Catálogos
                      </div>
                      <div className="text-xs text-indigo-400 mt-0.5">
                        Visibilidad · Material · Enlace externo
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {form.es_privado === "1" && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                        Privado
                      </span>
                    )}
                    {form.es_privado === "0" && (
                      <span className="text-[10px] bg-sky-100 text-sky-700 font-bold px-2 py-0.5 rounded-full border border-sky-200">
                        Público
                      </span>
                    )}
                    <i
                      className={`bx bx-chevron-${catalogOpen ? "up" : "down"} text-indigo-400 text-lg`}
                    />
                  </div>
                </button>

                {catalogOpen && (
                  <div className="border-t border-indigo-100 p-5 space-y-5 bg-white">
                    {/* Visibilidad — cards selector */}
                    <div>
                      <Lbl>Visibilidad del producto en catálogos</Lbl>
                      <div className="grid grid-cols-3 gap-2 mt-1">
                        {[
                          {
                            val: "",
                            icon: "bx-minus-circle",
                            label: "Sin definir",
                            desc: "Heredar del catálogo",
                            dotColor: "#94a3b8",
                          },
                          {
                            val: "0",
                            icon: "bx-world",
                            label: "Público",
                            desc: "Visible para todos",
                            dotColor: "#38bdf8",
                          },
                          {
                            val: "1",
                            icon: "bx-lock",
                            label: "Privado",
                            desc: "Solo con contraseña",
                            dotColor: "#f59e0b",
                          },
                        ].map((opt) => {
                          const active = form.es_privado === opt.val;
                          return (
                            <button
                              key={opt.val}
                              type="button"
                              onClick={() => setF("es_privado", opt.val)}
                              className="flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all"
                              style={{
                                borderColor: active ? "#4f46e5" : "#e2e8f0",
                                background: active ? "#eef2ff" : "#fafafa",
                              }}
                            >
                              <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center mb-1.5"
                                style={{
                                  background: active ? "#e0e7ff" : "#f1f5f9",
                                }}
                              >
                                <i
                                  className={`bx ${opt.icon} text-sm`}
                                  style={{
                                    color: active ? "#4338ca" : "#94a3b8",
                                  }}
                                />
                              </div>
                              <span
                                className="text-xs font-bold"
                                style={{
                                  color: active ? "#3730a3" : "#475569",
                                }}
                              >
                                {opt.label}
                              </span>
                              <span
                                className="text-[10px] mt-0.5 leading-tight"
                                style={{
                                  color: active ? "#6366f1" : "#94a3b8",
                                }}
                              >
                                {opt.desc}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {form.es_privado === "1" && (
                        <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                          <i className="bx bx-lock-alt text-amber-500 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-amber-700 leading-relaxed">
                            Este producto solo aparecerá en catálogos que tengan
                            contraseña configurada y solo para usuarios que la
                            ingresen correctamente.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Material */}
                    <div>
                      <Lbl>
                        Material / ficha técnica{" "}
                        <span className="normal-case font-normal text-slate-400">
                          (opcional)
                        </span>
                      </Lbl>
                      <div className="relative">
                        <i className="bx bx-link absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                        <Inp
                          className="pl-9"
                          placeholder="https://drive.google.com/..."
                          value={form.material}
                          onChange={(e) => setF("material", e.target.value)}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Enlace a ficha técnica, Drive, Dropbox u otro recurso.
                      </p>
                    </div>

                    {/* Landing URL */}
                    <div>
                      <Lbl>
                        Enlace / Landing externa{" "}
                        <span className="normal-case font-normal text-slate-400">
                          (opcional)
                        </span>
                      </Lbl>
                      <div className="relative">
                        <i className="bx bx-globe absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                        <Inp
                          className="pl-9"
                          placeholder="https://tienda.proveedor.com/producto"
                          value={form.landing_url}
                          onChange={(e) => setF("landing_url", e.target.value)}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Si el proveedor ya tiene su propia página de producto.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              {/* ═══ FIN ACORDEÓN CATÁLOGOS ═══ */}
            </div>

            {/* ─── COLUMNA DERECHA ─── */}
            <div className="p-6 space-y-6">
              {/* Video */}
              <div>
                <SecHead icon="bx-video" title="Video del producto" />
                <DropZone
                  dropRef={dropVideoRef}
                  onDrop={dropVideo}
                  {...videoHandlers}
                  onPick={pickVideo}
                  accept="video/*"
                  icon="bx-video-plus"
                  hint="MP4, WEBM — máx. 50 MB (opcional)"
                  preview={
                    previewVideo ? (
                      <video
                        controls
                        src={previewVideo}
                        className="w-full max-h-44 rounded-xl ring-1 ring-slate-200"
                      />
                    ) : null
                  }
                  onRemove={() => {
                    if (previewVideo?.startsWith("blob:"))
                      URL.revokeObjectURL(previewVideo);
                    setPreviewVideo(null);
                    setF("video", null);
                  }}
                />
              </div>

              {/* Upsell */}
              <div>
                <SecHead icon="bx-trending-up" title="Upsell" />
                <div className="space-y-4">
                  <div>
                    <Lbl>Nombre del upsell</Lbl>
                    <Inp
                      placeholder="Ej. Soporte premium, Accesorio extra…"
                      value={form.nombre_upsell}
                      onChange={(e) => setF("nombre_upsell", e.target.value)}
                    />
                  </div>

                  <div>
                    <Lbl>Descripción del upsell</Lbl>
                    <textarea
                      rows={3}
                      placeholder="Beneficio adicional que ofreces…"
                      value={form.descripcion_upsell}
                      onChange={(e) =>
                        setF("descripcion_upsell", e.target.value)
                      }
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none
                        resize-none transition focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                    />
                  </div>

                  <div>
                    <Lbl>Precio del upsell</Lbl>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">
                        $
                      </span>
                      <Inp
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="pl-7"
                        value={form.precio_upsell}
                        onChange={(e) => setF("precio_upsell", e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Lbl>Imagen del upsell</Lbl>
                    <DropZone
                      dropRef={dropUpsellRef}
                      onDrop={dropUpsell}
                      {...upsellHandlers}
                      onPick={pickUpsell}
                      accept="image/*"
                      icon="bx-image-add"
                      hint="PNG, JPG, WEBP (opcional)"
                      preview={
                        previewUpsell ? (
                          <img
                            src={previewUpsell}
                            alt="Upsell preview"
                            className="w-full max-h-36 object-cover rounded-xl ring-1 ring-slate-200"
                          />
                        ) : null
                      }
                      onRemove={() => {
                        if (previewUpsell?.startsWith("blob:"))
                          URL.revokeObjectURL(previewUpsell);
                        setPreviewUpsell(null);
                        setF("imagen_upsell", null);
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════ FOOTER — todo azul ═══════════ */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0 gap-4 bg-[#171931]">
          <p className="text-indigo-300 text-xs hidden sm:block truncate">
            {editingProduct
              ? "Los cambios se aplicarán inmediatamente al guardar."
              : "El producto quedará disponible para catálogos y flujos de automatización."}
          </p>

          <div className="flex gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{
                border: "1.5px solid rgba(255,255,255,.25)",
                color: "rgba(255,255,255,.8)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,.1)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white
                disabled:opacity-60 transition-all"
              style={{
                background: "#4f46e5",
                boxShadow: "0 0 0 2px rgba(99,102,241,.45)",
              }}
              onMouseEnter={(e) => {
                if (!saving) e.currentTarget.style.background = "#4338ca";
              }}
              onMouseLeave={(e) => {
                if (!saving) e.currentTarget.style.background = "#4f46e5";
              }}
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
                  {editingProduct ? "Actualizar producto" : "Agregar producto"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pmIn {
          from { opacity:0; transform:scale(.96) translateY(14px); }
          to   { opacity:1; transform:scale(1)   translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default ProductoModal;
