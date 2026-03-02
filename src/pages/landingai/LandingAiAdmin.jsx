import React, { useState, useEffect, useCallback, useRef } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

const LandingAiAdmin = () => {
  const [templates, setTemplates] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterEtapa, setFilterEtapa] = useState("all");

  // ── Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nombre: "",
    id_etapa: "",
    descripcion: "",
    orden: 0,
  });
  const [formFile, setFormFile] = useState(null);
  const [formPreview, setFormPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  const fileRef = useRef(null);

  // ── Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await chatApi.get("gemini/admin/templates");
      if (res.data?.data) {
        setTemplates(res.data.data.templates || []);
        setEtapas(res.data.data.etapas || []);
      }
    } catch {
      Toast.fire({ icon: "error", title: "Error cargando datos" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Filter
  const filtered =
    filterEtapa === "all"
      ? templates
      : filterEtapa === "none"
        ? templates.filter((t) => !t.id_etapa)
        : templates.filter((t) => t.id_etapa === Number(filterEtapa));

  // ── Open form
  const openCreate = () => {
    setEditingId(null);
    setFormData({ nombre: "", id_etapa: "", descripcion: "", orden: 0 });
    setFormFile(null);
    setFormPreview(null);
    setShowForm(true);
  };

  const openEdit = (t) => {
    setEditingId(t.id);
    setFormData({
      nombre: t.nombre,
      id_etapa: t.id_etapa || "",
      descripcion: t.descripcion || "",
      orden: t.orden || 0,
    });
    setFormFile(null);
    setFormPreview(t.src_url);
    setShowForm(true);
  };

  // ── File change
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormFile(file);
    const reader = new FileReader();
    reader.onload = () => setFormPreview(reader.result);
    reader.readAsDataURL(file);
  };

  // ── Save
  const handleSave = async () => {
    if (!formData.nombre.trim()) {
      return Toast.fire({ icon: "warning", title: "El nombre es requerido" });
    }
    if (!editingId && !formFile) {
      return Toast.fire({ icon: "warning", title: "Debes subir una imagen" });
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("nombre", formData.nombre.trim());
      fd.append("descripcion", formData.descripcion.trim());
      fd.append("id_etapa", formData.id_etapa || "");
      fd.append("orden", String(formData.orden));

      if (formFile) {
        fd.append("imagen", formFile);
      }

      if (editingId) {
        await chatApi.put(`gemini/admin/templates/${editingId}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        Toast.fire({ icon: "success", title: "Template actualizado" });
      } else {
        await chatApi.post("gemini/admin/templates", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        Toast.fire({ icon: "success", title: "Template creado" });
      }

      setShowForm(false);
      fetchData();
    } catch (err) {
      Toast.fire({
        icon: "error",
        title: err?.response?.data?.message || "Error al guardar",
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle active
  const toggleActive = async (t) => {
    try {
      await chatApi.put(`gemini/admin/templates/${t.id}`, {
        activo: t.activo ? 0 : 1,
      });
      fetchData();
      Toast.fire({
        icon: "success",
        title: t.activo ? "Desactivado" : "Activado",
      });
    } catch {
      Toast.fire({ icon: "error", title: "Error" });
    }
  };

  // ── Delete
  const handleDelete = async (t) => {
    const result = await Swal.fire({
      title: "¿Eliminar template?",
      text: `"${t.nombre}" será eliminado permanentemente.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonText: "Cancelar",
      confirmButtonText: "Sí, eliminar",
    });

    if (!result.isConfirmed) return;

    try {
      await chatApi.delete(`gemini/admin/templates/${t.id}`);
      fetchData();
      Toast.fire({ icon: "success", title: "Eliminado" });
    } catch {
      Toast.fire({ icon: "error", title: "Error al eliminar" });
    }
  };

  const getEtapaName = (id) =>
    etapas.find((e) => e.id === id)?.nombre || "Sin asignar";

  return (
    <div className="min-h-screen bg-gray-50/50 p-5">
      {/* ══════════ HEADER ══════════ */}
      <div className="bg-[#171931] rounded-2xl p-6 mb-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 grid place-items-center">
              <i className="bx bx-cog text-xl text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">
                Administrador de Templates
              </h1>
              <p className="text-xs text-white/50 mt-0.5">
                {templates.length} template{templates.length !== 1 ? "s" : ""} ·{" "}
                {etapas.length} secciones
              </p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition"
          >
            <i className="bx bx-plus text-sm" /> Nuevo Template
          </button>
        </div>
      </div>

      {/* ══════════ FILTERS ══════════ */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterEtapa("all")}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            filterEtapa === "all"
              ? "bg-indigo-600 text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          Todos ({templates.length})
        </button>
        {etapas.map((e) => {
          const count = templates.filter((t) => t.id_etapa === e.id).length;
          return (
            <button
              key={e.id}
              onClick={() => setFilterEtapa(String(e.id))}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filterEtapa === String(e.id)
                  ? "bg-indigo-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {e.nombre} ({count})
            </button>
          );
        })}
        <button
          onClick={() => setFilterEtapa("none")}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            filterEtapa === "none"
              ? "bg-gray-700 text-white"
              : "bg-white border border-gray-200 text-gray-400 hover:bg-gray-50"
          }`}
        >
          Sin asignar ({templates.filter((t) => !t.id_etapa).length})
        </button>
      </div>

      {/* ══════════ GRID ══════════ */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg
            className="animate-spin w-6 h-6 text-indigo-500"
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
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 grid place-items-center">
            <i className="bx bx-image text-3xl text-gray-300" />
          </div>
          <p className="text-sm text-gray-400 font-medium">
            No hay templates en esta categoría
          </p>
          <button
            onClick={openCreate}
            className="text-xs text-indigo-600 font-bold underline"
          >
            Crear uno nuevo →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((t) => (
            <div
              key={t.id}
              className={`rounded-xl border overflow-hidden bg-white transition ${
                t.activo ? "border-gray-200" : "border-gray-200 opacity-50"
              }`}
            >
              {/* Image */}
              <div className="relative" style={{ paddingBottom: "130%" }}>
                <img
                  src={t.src_url}
                  alt={t.nombre}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />

                {/* Status badge */}
                <div className="absolute top-2 left-2">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                      t.activo
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-500 text-white"
                    }`}
                  >
                    {t.activo ? "ACTIVO" : "INACTIVO"}
                  </span>
                </div>

                {/* Etapa badge */}
                {t.etapa && (
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[9px] font-bold">
                      {t.etapa.nombre}
                    </span>
                  </div>
                )}

                {!t.id_etapa && (
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-bold">
                      SIN SECCIÓN
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="text-xs font-bold text-gray-800 truncate">
                  {t.nombre}
                </p>
                {t.descripcion && (
                  <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                    {t.descripcion}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1.5 mt-3">
                  <button
                    onClick={() => openEdit(t)}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border border-gray-200 text-[10px] font-semibold text-gray-600 hover:bg-gray-50 transition"
                  >
                    <i className="bx bx-edit-alt text-xs" /> Editar
                  </button>
                  <button
                    onClick={() => toggleActive(t)}
                    className={`px-2 py-1.5 rounded-lg border text-[10px] font-semibold transition ${
                      t.activo
                        ? "border-amber-200 text-amber-600 hover:bg-amber-50"
                        : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                    }`}
                  >
                    <i
                      className={`bx ${t.activo ? "bx-hide" : "bx-show"} text-xs`}
                    />
                  </button>
                  <button
                    onClick={() => handleDelete(t)}
                    className="px-2 py-1.5 rounded-lg border border-rose-200 text-rose-500 text-[10px] font-semibold hover:bg-rose-50 transition"
                  >
                    <i className="bx bx-trash text-xs" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════ FORM MODAL ══════════ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !saving && setShowForm(false)}
          />

          <div className="relative bg-white rounded-2xl border border-gray-200 w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 grid place-items-center">
                  <i
                    className={`bx ${editingId ? "bx-edit" : "bx-plus"} text-sm text-indigo-600`}
                  />
                </div>
                <h3 className="text-sm font-bold text-gray-900">
                  {editingId ? "Editar Template" : "Nuevo Template"}
                </h3>
              </div>
              <button
                onClick={() => !saving && setShowForm(false)}
                className="w-7 h-7 rounded-lg border border-gray-200 grid place-items-center text-gray-400 hover:text-gray-600 transition"
              >
                <i className="bx bx-x text-base" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
              {/* Image upload */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Imagen del template{" "}
                  {!editingId && <span className="text-rose-500">*</span>}
                </label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-300 bg-gray-50 hover:bg-indigo-50/30 transition cursor-pointer p-4 text-center"
                >
                  {formPreview ? (
                    <div className="relative">
                      <img
                        src={formPreview}
                        alt="Preview"
                        className="w-full max-h-48 object-contain rounded-lg"
                      />
                      <p className="text-[10px] text-gray-400 mt-2">
                        Clic para cambiar imagen
                      </p>
                    </div>
                  ) : (
                    <div className="py-4">
                      <i className="bx bx-cloud-upload text-2xl text-indigo-400" />
                      <p className="text-xs font-semibold text-gray-600 mt-1">
                        Haz clic para subir imagen
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        PNG, JPG, WEBP
                      </p>
                    </div>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Nombre <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                  placeholder="Ej: Hero Premium Deportivo"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Etapa */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Sección de Landing
                </label>
                <select
                  value={formData.id_etapa}
                  onChange={(e) =>
                    setFormData({ ...formData, id_etapa: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  <option value="">— Sin asignar —</option>
                  {etapas.map((e) => (
                    <option key={e.id} value={e.id}>
                      {String(e.orden).padStart(2, "0")}. {e.nombre}
                      {e.es_obligatoria ? " ★ Recomendada" : " (Opcional)"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Descripción{" "}
                  <span className="font-normal text-gray-400 normal-case">
                    (opcional)
                  </span>
                </label>
                <input
                  type="text"
                  value={formData.descripcion}
                  onChange={(e) =>
                    setFormData({ ...formData, descripcion: e.target.value })
                  }
                  placeholder="Ej: Estilo premium con tonos dorados"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Order */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Orden
                </label>
                <input
                  type="number"
                  value={formData.orden}
                  onChange={(e) =>
                    setFormData({ ...formData, orden: Number(e.target.value) })
                  }
                  className="w-24 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                onClick={() => !saving && setShowForm(false)}
                disabled={saving}
                className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {saving ? (
                  <>
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
                    Guardando...
                  </>
                ) : (
                  <>
                    <i className="bx bx-check text-sm" />
                    {editingId ? "Actualizar" : "Crear Template"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingAiAdmin;
