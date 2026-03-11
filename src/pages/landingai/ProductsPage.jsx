import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* ══════════════════════════════════════════════════════════════════
   PRODUCTOS PAGE
   ══════════════════════════════════════════════════════════════════ */
const ProductosPage = () => {
  const navigate = useNavigate();
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    marca: "",
    moneda: "USD",
    precio_unitario: "",
  });

  // ── Portada image state ──
  const [portadaFile, setPortadaFile] = useState(null);
  const [portadaPreview, setPortadaPreview] = useState(null);
  const portadaInputRef = useRef(null);

  const fetchProductos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await chatApi.get("gemini/productos");
      if (res.data?.isSuccess) setProductos(res.data.data || []);
    } catch {
      /* silencioso */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProductos();
  }, [fetchProductos]);

  const resetForm = () => {
    setForm({
      nombre: "",
      descripcion: "",
      marca: "",
      moneda: "USD",
      precio_unitario: "",
    });
    setEditingProduct(null);
    setPortadaFile(null);
    if (portadaPreview && portadaPreview.startsWith("blob:")) {
      URL.revokeObjectURL(portadaPreview);
    }
    setPortadaPreview(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (p) => {
    setForm({
      nombre: p.nombre || "",
      descripcion: p.descripcion || "",
      marca: p.marca || "",
      moneda: p.moneda || "USD",
      precio_unitario: p.precio_unitario || "",
    });
    setEditingProduct(p);
    setPortadaFile(null);
    setPortadaPreview(p.imagen_portada || null);
    setShowModal(true);
  };

  const handlePortadaChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (portadaPreview && portadaPreview.startsWith("blob:")) {
      URL.revokeObjectURL(portadaPreview);
    }
    setPortadaFile(file);
    setPortadaPreview(URL.createObjectURL(file));
  };

  const removePortada = () => {
    if (portadaPreview && portadaPreview.startsWith("blob:")) {
      URL.revokeObjectURL(portadaPreview);
    }
    setPortadaFile(null);
    setPortadaPreview(null);
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) {
      return Toast.fire({ icon: "error", title: "El nombre es requerido" });
    }

    setSaving(true);

    try {
      let productoId = editingProduct?.id;

      // 1. Crear o actualizar producto
      if (editingProduct) {
        await chatApi.put(`gemini/productos/${editingProduct.id}`, form);
      } else {
        const createRes = await chatApi.post("gemini/productos", form);
        productoId = createRes.data?.data?.id;
      }

      // 2. Si hay archivo nuevo de portada, subirlo
      if (portadaFile && productoId) {
        const fd = new FormData();
        fd.append("imagen_portada", portadaFile);

        await chatApi.patch(
          `gemini/productos/${productoId}/portada-upload`,
          fd,
          { headers: { "Content-Type": "multipart/form-data" } },
        );
      }
      // 3. Si se removió la portada existente (editando y preview es null)
      else if (
        editingProduct &&
        editingProduct.imagen_portada &&
        !portadaPreview
      ) {
        await chatApi.patch(`gemini/productos/${productoId}/portada`, {
          image_url: null,
        });
      }

      Toast.fire({
        icon: "success",
        title: editingProduct ? "Producto actualizado" : "Producto creado",
      });
      setShowModal(false);
      resetForm();
      fetchProductos();
    } catch (err) {
      Toast.fire({
        icon: "error",
        title: err?.response?.data?.message || "Error al guardar",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p) => {
    const result = await Swal.fire({
      title: "¿Eliminar producto?",
      text: `"${p.nombre}" será eliminado. Las imágenes generadas se conservarán.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!result.isConfirmed) return;
    try {
      await chatApi.delete(`gemini/productos/${p.id}`);
      Toast.fire({ icon: "success", title: "Producto eliminado" });
      fetchProductos();
    } catch {
      Toast.fire({ icon: "error", title: "Error al eliminar" });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* ══════════ HEADER ══════════ */}
      <div className="bg-[#0f1129] relative overflow-hidden rounded-3xl">
        <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-600/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/15 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/4" />

        <div className="relative px-5 sm:px-8 py-5 sm:py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-3"
                style={{
                  background: "rgba(99,102,241,0.1)",
                  border: "1px solid rgba(99,102,241,0.2)",
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                <span
                  className="text-[10px] font-bold uppercase"
                  style={{ color: "#a5b4fc", letterSpacing: "0.08em" }}
                >
                  Catálogo de Productos
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none">
                Tus productos
                <span
                  className="block mt-0.5"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, #a5b4fc, #93c5fd, #67e8f9)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  para landing pages
                </span>
              </h1>
              <p
                className="mt-2 text-sm"
                style={{ color: "rgba(255,255,255,0.4)", maxWidth: "480px" }}
              >
                Organiza tus productos y genera landings segmentadas. Cada
                producto agrupa sus propias imágenes.
              </p>
            </div>

            <button
              onClick={openCreate}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition active:scale-95"
              style={{
                background: "rgba(99,102,241,0.15)",
                border: "1px solid rgba(99,102,241,0.3)",
                color: "#a5b4fc",
              }}
            >
              <i className="bx bx-plus text-sm" />
              Nuevo producto
            </button>
          </div>
        </div>
      </div>

      {/* ══════════ BODY ══════════ */}
      <div className="pt-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 gap-4">
            <div
              className="w-12 h-12 rounded-2xl grid place-items-center"
              style={{ background: "rgba(99,102,241,0.08)" }}
            >
              <svg
                className="animate-spin w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="#6366f1"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="#6366f1"
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-400">
              Cargando productos…
            </p>
          </div>
        ) : productos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 gap-4">
            <div
              className="w-20 h-20 rounded-3xl grid place-items-center"
              style={{ background: "#f1f5f9", border: "2px dashed #d1d5db" }}
            >
              <i className="bx bx-package text-3xl text-gray-300" />
            </div>
            <p className="text-sm font-bold text-gray-500">
              Aún no tienes productos
            </p>
            <p className="text-xs text-gray-400">
              Crea tu primer producto para segmentar tus landing pages
            </p>
            <button
              onClick={openCreate}
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition active:scale-95"
              style={{ background: "#0f1129" }}
            >
              <i className="bx bx-plus text-sm" />
              Crear producto
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {productos.map((p) => (
              <div
                key={p.id}
                className="group rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg"
                style={{ background: "white", border: "1px solid #e2e8f0" }}
              >
                {/* Portada */}
                <div
                  className="relative h-36 overflow-hidden cursor-pointer"
                  onClick={() => navigate(`/insta_landing_productos/${p.id}`)}
                  style={{
                    background: p.imagen_portada ? "transparent" : "#f1f5f9",
                  }}
                >
                  {p.imagen_portada ? (
                    <img
                      src={p.imagen_portada}
                      alt={p.nombre}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <i className="bx bx-package text-4xl text-gray-300" />
                    </div>
                  )}

                  {/* Badge generaciones */}
                  <div
                    className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold"
                    style={{
                      background: "rgba(15,17,41,0.75)",
                      backdropFilter: "blur(4px)",
                      color: "#a5b4fc",
                    }}
                  >
                    <i className="bx bx-image text-xs" />
                    {p.total_generaciones}
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-gray-800 truncate">
                        {p.nombre}
                      </h3>
                      {p.marca && (
                        <p className="text-[11px] text-gray-400 font-medium">
                          {p.marca}
                        </p>
                      )}
                    </div>
                    {p.precio_unitario && (
                      <span
                        className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-lg"
                        style={{
                          background: "rgba(99,102,241,0.06)",
                          color: "#6366f1",
                        }}
                      >
                        {p.moneda === "USD" ? "$" : p.moneda}{" "}
                        {p.precio_unitario}
                      </span>
                    )}
                  </div>

                  {p.descripcion && (
                    <p className="text-[11px] text-gray-400 line-clamp-2 mb-3">
                      {p.descripcion}
                    </p>
                  )}

                  <div
                    className="flex items-center justify-between pt-2"
                    style={{ borderTop: "1px solid #f1f5f9" }}
                  >
                    <span className="text-[10px] text-gray-400">
                      {formatDate(p.created_at)}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(p)}
                        className="w-7 h-7 rounded-lg grid place-items-center transition hover:bg-gray-100"
                        title="Editar"
                      >
                        <i className="bx bx-edit-alt text-sm text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="w-7 h-7 rounded-lg grid place-items-center transition hover:bg-red-50"
                        title="Eliminar"
                      >
                        <i className="bx bx-trash text-sm text-gray-400 hover:text-red-500" />
                      </button>
                      <button
                        onClick={() =>
                          navigate(`/insta_landing_productos/${p.id}`)
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition hover:bg-gray-50"
                        style={{ color: "#6366f1" }}
                      >
                        Ver
                        <i className="bx bx-right-arrow-alt text-sm" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Add card */}
            <button
              onClick={openCreate}
              className="rounded-2xl flex flex-col items-center justify-center py-12 gap-3 transition hover:bg-white hover:shadow-md"
              style={{ border: "2px dashed #d1d5db", minHeight: "200px" }}
            >
              <div
                className="w-12 h-12 rounded-2xl grid place-items-center"
                style={{ background: "rgba(99,102,241,0.06)" }}
              >
                <i
                  className="bx bx-plus text-xl"
                  style={{ color: "#a5b4fc" }}
                />
              </div>
              <span className="text-xs font-bold text-gray-400">
                Nuevo producto
              </span>
            </button>
          </div>
        )}
      </div>

      {/* ══════════ MODAL ══════════ */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: "rgba(15,17,41,0.5)",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => {
            setShowModal(false);
            resetForm();
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl overflow-hidden"
            style={{ background: "white" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Portada area at top of modal ── */}
            <div
              className="relative h-32 group cursor-pointer"
              style={{ background: "#f1f5f9" }}
              onClick={() => portadaInputRef.current?.click()}
            >
              {portadaPreview ? (
                <>
                  <img
                    src={portadaPreview}
                    alt="Portada"
                    className="w-full h-full object-cover"
                  />
                  {/* Hover overlay */}
                  <div
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ background: "rgba(15,17,41,0.5)" }}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          portadaInputRef.current?.click();
                        }}
                        className="w-9 h-9 rounded-xl grid place-items-center transition hover:scale-105"
                        style={{
                          background: "rgba(255,255,255,0.9)",
                          backdropFilter: "blur(4px)",
                        }}
                        title="Cambiar imagen"
                      >
                        <i className="bx bx-image-add text-base text-gray-600" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removePortada();
                        }}
                        className="w-9 h-9 rounded-xl grid place-items-center transition hover:scale-105"
                        style={{
                          background: "rgba(239,68,68,0.9)",
                        }}
                        title="Quitar portada"
                      >
                        <i className="bx bx-trash text-base text-white" />
                      </button>
                    </div>
                  </div>
                  {/* Badge */}
                  <div
                    className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg text-[9px] font-bold flex items-center gap-1"
                    style={{
                      background: "rgba(15,17,41,0.7)",
                      backdropFilter: "blur(4px)",
                      color: "white",
                    }}
                  >
                    <i className="bx bx-star text-[9px]" />
                    Portada
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 transition group-hover:bg-gray-100">
                  <div
                    className="w-11 h-11 rounded-xl grid place-items-center"
                    style={{ background: "rgba(99,102,241,0.06)" }}
                  >
                    <i
                      className="bx bx-image-add text-xl"
                      style={{ color: "#a5b4fc" }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] font-semibold text-gray-500">
                      Agregar imagen de portada
                    </p>
                    <p className="text-[10px] text-gray-400">
                      Opcional · Clic para subir
                    </p>
                  </div>
                </div>
              )}
              <input
                ref={portadaInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePortadaChange}
              />
            </div>

            {/* ── Form ── */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-gray-800">
                  {editingProduct ? "Editar producto" : "Nuevo producto"}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="w-8 h-8 rounded-lg grid place-items-center hover:bg-gray-100 transition"
                >
                  <i className="bx bx-x text-lg text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Nombre */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">
                    Nombre del producto *
                  </label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(e) =>
                      setForm({ ...form, nombre: e.target.value })
                    }
                    placeholder="Ej: Faja reductora térmica"
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition"
                    style={{
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                    onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">
                    Descripción
                  </label>
                  <textarea
                    value={form.descripcion}
                    onChange={(e) =>
                      setForm({ ...form, descripcion: e.target.value })
                    }
                    placeholder="Descripción del producto para contexto de la IA…"
                    rows={3}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none resize-none transition"
                    style={{
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                    onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                  />
                </div>

                {/* Marca + Moneda */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">
                      Marca
                    </label>
                    <input
                      type="text"
                      value={form.marca}
                      onChange={(e) =>
                        setForm({ ...form, marca: e.target.value })
                      }
                      placeholder="Ej: ThermoFit"
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition"
                      style={{
                        border: "1px solid #e2e8f0",
                        background: "#f8fafc",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                      onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">
                      Moneda
                    </label>
                    <select
                      value={form.moneda}
                      onChange={(e) =>
                        setForm({ ...form, moneda: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition"
                      style={{
                        border: "1px solid #e2e8f0",
                        background: "#f8fafc",
                      }}
                    >
                      <option value="USD">USD</option>
                      <option value="COP">COP</option>
                      <option value="MXN">MXN</option>
                      <option value="PEN">PEN</option>
                      <option value="BRL">BRL</option>
                    </select>
                  </div>
                </div>

                {/* Precio */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">
                    Precio unitario
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.precio_unitario}
                    onChange={(e) =>
                      setForm({ ...form, precio_unitario: e.target.value })
                    }
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition"
                    style={{
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                    onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition hover:bg-gray-50 disabled:opacity-50"
                  style={{ border: "1px solid #e2e8f0", color: "#64748b" }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition active:scale-[0.97] disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  style={{ background: "#0f1129" }}
                >
                  {saving && (
                    <svg
                      className="animate-spin w-3.5 h-3.5"
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
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>
                  )}
                  {editingProduct ? "Guardar cambios" : "Crear producto"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductosPage;
