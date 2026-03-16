import React, { useState, useEffect, useRef, useMemo } from "react";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const fmt = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const fmtFull = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toInputDate = (d) => {
  if (!d) return "";
  const date = new Date(d);
  return date.toISOString().slice(0, 16);
};

const StatusDot = ({ active }) => (
  <span
    className={`inline-block w-2 h-2 rounded-full ${active ? "bg-emerald-500" : "bg-slate-300"}`}
  />
);

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
const CodigosPromoAdmin = () => {
  const [codigos, setCodigos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterActivo, setFilterActivo] = useState("todos"); // todos | activos | inactivos

  // Modal create/edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    codigo: "",
    descripcion: "",
    imagenes_regalo: 25,
    angulos_regalo: 10,
    max_usos: 100,
    activo: true,
    fecha_inicio: "",
    fecha_fin: "",
    redirect_on_exhaust: "",
  });
  const [saving, setSaving] = useState(false);

  // Detail panel
  const [detailCodigo, setDetailCodigo] = useState(null);
  const [canjes, setCanjes] = useState([]);
  const [loadingCanjes, setLoadingCanjes] = useState(false);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  // ─── Fetch codes ───
  const fetchCodigos = async () => {
    setLoading(true);
    try {
      const { data } = await chatApi.get("stripe_plan/codigos-promo", {
        headers,
      });
      setCodigos(data?.data || []);
    } catch (e) {
      console.warn("Error fetching codigos:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCodigos();
  }, []);

  // ─── Fetch canjes for detail ───
  const fetchCanjes = async (id_codigo) => {
    setLoadingCanjes(true);
    try {
      const { data } = await chatApi.get(
        `stripe_plan/codigos-promo/${id_codigo}/canjes`,
        { headers },
      );
      setCanjes(data?.data || []);
    } catch (e) {
      console.warn("Error fetching canjes:", e);
      setCanjes([]);
    } finally {
      setLoadingCanjes(false);
    }
  };

  // ─── Filtered list ───
  const filtered = useMemo(() => {
    let list = codigos;
    if (filterActivo === "activos") list = list.filter((c) => c.activo);
    if (filterActivo === "inactivos") list = list.filter((c) => !c.activo);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.codigo?.toLowerCase().includes(s) ||
          c.descripcion?.toLowerCase().includes(s),
      );
    }
    return list;
  }, [codigos, filterActivo, search]);

  // ─── Open create modal ───
  const openCreate = () => {
    setEditingId(null);
    setForm({
      codigo: "",
      descripcion: "",
      imagenes_regalo: 25,
      angulos_regalo: 10,
      max_usos: 100,
      activo: true,
      fecha_inicio: "",
      fecha_fin: "",
      redirect_on_exhaust: "",
    });
    setModalOpen(true);
  };

  // ─── Open edit modal ───
  const openEdit = (c) => {
    setEditingId(c.id_codigo);
    setForm({
      codigo: c.codigo || "",
      descripcion: c.descripcion || "",
      imagenes_regalo: c.imagenes_regalo ?? 25,
      angulos_regalo: c.angulos_regalo ?? 10,
      max_usos: c.max_usos ?? 100,
      activo: Boolean(c.activo),
      fecha_inicio: toInputDate(c.fecha_inicio),
      fecha_fin: toInputDate(c.fecha_fin),
      redirect_on_exhaust: c.redirect_on_exhaust || "",
    });
    setModalOpen(true);
  };

  // ─── Save (create or update) ───
  const handleSave = async () => {
    if (!form.codigo.trim()) {
      await Swal.fire("Error", "El código es obligatorio.", "warning");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        codigo: form.codigo.trim().toUpperCase(),
        imagenes_regalo: Number(form.imagenes_regalo),
        angulos_regalo: Number(form.angulos_regalo),
        max_usos: Number(form.max_usos),
        activo: form.activo ? 1 : 0,
        fecha_inicio: form.fecha_inicio || null,
        fecha_fin: form.fecha_fin || null,
        redirect_on_exhaust: form.redirect_on_exhaust.trim() || null,
      };

      if (editingId) {
        await chatApi.put(`stripe_plan/codigos-promo/${editingId}`, payload, {
          headers,
        });
      } else {
        await chatApi.post("stripe_plan/codigos-promo", payload, { headers });
      }

      setModalOpen(false);
      await fetchCodigos();

      // If detail is open for this code, refresh
      if (detailCodigo && detailCodigo.id_codigo === editingId) {
        const updated = codigos.find((c) => c.id_codigo === editingId);
        if (updated) setDetailCodigo({ ...updated, ...payload });
      }
    } catch (e) {
      await Swal.fire(
        "Error",
        e?.response?.data?.message || "No se pudo guardar.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  // ─── Toggle active ───
  const toggleActivo = async (c) => {
    try {
      await chatApi.put(
        `stripe_plan/codigos-promo/${c.id_codigo}`,
        { activo: c.activo ? 0 : 1 },
        { headers },
      );
      await fetchCodigos();
    } catch (e) {
      await Swal.fire("Error", "No se pudo actualizar.", "error");
    }
  };

  // ─── Delete ───
  const handleDelete = async (c) => {
    const hasCanjes = Number(c.total_canjes || c.usos_actuales || 0) > 0;

    const result = await Swal.fire({
      title: `Eliminar "${c.codigo}"`,
      html: hasCanjes
        ? `<p class="text-sm text-gray-600">Este código tiene <b>${c.usos_actuales}</b> canjes. Solo se puede <b>desactivar</b>.</p>`
        : `<p class="text-sm text-gray-600">¿Eliminar permanentemente o solo desactivar?</p>`,
      icon: "warning",
      showCancelButton: true,
      showDenyButton: !hasCanjes,
      confirmButtonText: "Desactivar",
      denyButtonText: "Eliminar permanente",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#F59E0B",
      denyButtonColor: "#EF4444",
    });

    if (result.isConfirmed) {
      // Soft delete
      await chatApi.delete(`stripe_plan/codigos-promo/${c.id_codigo}`, {
        headers,
        data: { hard: false },
      });
      if (detailCodigo?.id_codigo === c.id_codigo) setDetailCodigo(null);
      await fetchCodigos();
    } else if (result.isDenied && !hasCanjes) {
      // Hard delete
      await chatApi.delete(`stripe_plan/codigos-promo/${c.id_codigo}`, {
        headers,
        data: { hard: true },
      });
      if (detailCodigo?.id_codigo === c.id_codigo) setDetailCodigo(null);
      await fetchCodigos();
    }
  };

  // ─── Open detail ───
  const openDetail = (c) => {
    setDetailCodigo(c);
    fetchCanjes(c.id_codigo);
  };

  // ─── Copy code ───
  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Código copiado",
      showConfirmButton: false,
      timer: 1500,
    });
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen">
      {/* ── Header bar ── */}
      <div className="bg-white border-b border-slate-200 px-5 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#0B1426]">
              Códigos Promocionales
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Crea y gestiona códigos que regalan imágenes y ángulos AI a tus
              clientes
            </p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:shadow-lg active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #F59E0B 0%, #F97316 100%)",
            }}
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nuevo código
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar código..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-amber-400 transition"
            />
          </div>
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {[
              { key: "todos", label: "Todos" },
              { key: "activos", label: "Activos" },
              { key: "inactivos", label: "Inactivos" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterActivo(f.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  filterActivo === f.key
                    ? "bg-white text-[#0B1426] shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-400">
            {filtered.length} código{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* ── Content: Table + Detail ── */}
      <div className="flex flex-col lg:flex-row">
        {/* Table */}
        <div
          className={`flex-1 p-4 transition-all ${detailCodigo ? "lg:pr-0" : ""}`}
        >
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-white rounded-xl animate-pulse border border-slate-100"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-amber-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                >
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                  <line x1="7" y1="7" x2="7.01" y2="7" />
                </svg>
              </div>
              <p className="text-sm text-slate-500 font-medium">
                {search
                  ? "No se encontraron códigos"
                  : "Aún no hay códigos promocionales"}
              </p>
              {!search && (
                <button
                  onClick={openCreate}
                  className="mt-3 text-sm font-semibold text-amber-600 hover:text-amber-700"
                >
                  Crear el primero →
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((c) => {
                const isSelected = detailCodigo?.id_codigo === c.id_codigo;
                const progress =
                  c.max_usos > 0
                    ? Math.min(100, ((c.usos_actuales || 0) / c.max_usos) * 100)
                    : 0;
                const isExpired =
                  c.fecha_fin && new Date(c.fecha_fin) < new Date();

                return (
                  <div
                    key={c.id_codigo}
                    onClick={() => openDetail(c)}
                    className={`bg-white rounded-xl border px-4 py-3 cursor-pointer transition-all hover:shadow-md ${
                      isSelected
                        ? "border-amber-400 shadow-md ring-1 ring-amber-200"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Code badge */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusDot active={c.activo && !isExpired} />
                          <span
                            className="text-sm font-bold text-[#0B1426] tracking-wider cursor-pointer hover:text-amber-600 transition"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyCode(c.codigo);
                            }}
                            title="Click para copiar"
                          >
                            {c.codigo}
                          </span>
                          {isExpired && (
                            <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                              EXPIRADO
                            </span>
                          )}
                          {!c.activo && !isExpired && (
                            <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              INACTIVO
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          {c.descripcion || "Sin descripción"}
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="hidden sm:flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-xs font-bold text-[#0B1426]">
                            {c.imagenes_regalo}
                          </p>
                          <p className="text-[9px] text-slate-400">imgs</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-bold text-[#0B1426]">
                            {c.angulos_regalo}
                          </p>
                          <p className="text-[9px] text-slate-400">áng</p>
                        </div>
                        <div className="text-center min-w-[60px]">
                          <p className="text-xs font-bold text-[#0B1426]">
                            {c.usos_actuales || 0}
                            {c.max_usos > 0 ? `/${c.max_usos}` : ""}
                          </p>
                          <p className="text-[9px] text-slate-400">canjes</p>
                          {c.max_usos > 0 && (
                            <div className="w-full h-1 bg-slate-100 rounded-full mt-0.5 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${progress}%`,
                                  background:
                                    progress >= 90
                                      ? "#EF4444"
                                      : progress >= 70
                                        ? "#F59E0B"
                                        : "#10B981",
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(c);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="Editar"
                        >
                          <svg
                            className="w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleActivo(c);
                          }}
                          className={`p-1.5 rounded-lg transition ${
                            c.activo
                              ? "text-emerald-500 hover:bg-emerald-50"
                              : "text-slate-400 hover:bg-slate-100"
                          }`}
                          title={c.activo ? "Desactivar" : "Activar"}
                        >
                          <svg
                            className="w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          >
                            {c.activo ? (
                              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1 8.618 3.04A12.02 12.02 0 0 1 12 21.944a12.02 12.02 0 0 1-8.618-15.96" />
                            ) : (
                              <>
                                <circle cx="12" cy="12" r="10" />
                                <path d="M15 9l-6 6M9 9l6 6" />
                              </>
                            )}
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(c);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                          title="Eliminar"
                        >
                          <svg
                            className="w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          >
                            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Detail panel ── */}
        {detailCodigo && (
          <div className="w-full lg:w-[380px] shrink-0 p-4 lg:pl-2">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-20">
              {/* Header */}
              <div
                className="px-5 py-4 relative"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(245,158,11,0.06), rgba(249,115,22,0.03))",
                }}
              >
                <button
                  onClick={() => setDetailCodigo(null)}
                  className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/60 transition"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
                <div className="flex items-center gap-2 mb-2">
                  <StatusDot active={detailCodigo.activo} />
                  <span className="text-lg font-extrabold text-[#0B1426] tracking-wider">
                    {detailCodigo.codigo}
                  </span>
                  <button
                    onClick={() => copyCode(detailCodigo.codigo)}
                    className="p-1 rounded text-slate-400 hover:text-amber-600 transition"
                    title="Copiar"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  {detailCodigo.descripcion || "Sin descripción"}
                </p>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-px bg-slate-100">
                <div className="bg-white px-4 py-3 text-center">
                  <p className="text-xl font-extrabold text-amber-600">
                    {detailCodigo.imagenes_regalo}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Imágenes
                  </p>
                </div>
                <div className="bg-white px-4 py-3 text-center">
                  <p className="text-xl font-extrabold text-amber-600">
                    {detailCodigo.angulos_regalo}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Ángulos AI
                  </p>
                </div>
                <div className="bg-white px-4 py-3 text-center">
                  <p className="text-xl font-extrabold text-[#0B1426]">
                    {detailCodigo.usos_actuales || 0}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Canjes usados
                  </p>
                </div>
                <div className="bg-white px-4 py-3 text-center">
                  <p className="text-xl font-extrabold text-[#0B1426]">
                    {detailCodigo.max_usos > 0 ? detailCodigo.max_usos : "∞"}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Límite usos
                  </p>
                </div>
              </div>

              {/* Details */}
              <div className="px-5 py-4 space-y-2.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Estado</span>
                  <span
                    className={`font-semibold ${detailCodigo.activo ? "text-emerald-600" : "text-slate-400"}`}
                  >
                    {detailCodigo.activo ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Válido desde</span>
                  <span className="font-medium text-slate-700">
                    {fmt(detailCodigo.fecha_inicio)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Válido hasta</span>
                  <span className="font-medium text-slate-700">
                    {fmt(detailCodigo.fecha_fin)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Al agotarse</span>
                  <span className="font-medium text-slate-700 text-right max-w-[180px] truncate">
                    {detailCodigo.redirect_on_exhaust ? (
                      <a
                        href={detailCodigo.redirect_on_exhaust}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Link custom ↗
                      </a>
                    ) : (
                      "Stripe checkout"
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Creado</span>
                  <span className="font-medium text-slate-700">
                    {fmt(detailCodigo.created_at)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="px-5 pb-3 flex gap-2">
                <button
                  onClick={() => openEdit(detailCodigo)}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                >
                  Editar
                </button>
                <button
                  onClick={() => toggleActivo(detailCodigo)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${
                    detailCodigo.activo
                      ? "bg-red-50 text-red-600 hover:bg-red-100"
                      : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                  }`}
                >
                  {detailCodigo.activo ? "Desactivar" : "Activar"}
                </button>
              </div>

              {/* Canjes list */}
              <div className="border-t border-slate-100 px-5 py-4">
                <h4 className="text-xs font-bold text-[#0B1426] mb-3">
                  Canjes ({canjes.length})
                </h4>
                {loadingCanjes ? (
                  <div className="flex items-center gap-2 py-4 justify-center">
                    <svg
                      className="w-4 h-4 animate-spin text-amber-500"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        opacity="0.25"
                      />
                      <path
                        d="M21 12a9 9 0 0 0-9-9"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="text-xs text-slate-400">Cargando...</span>
                  </div>
                ) : canjes.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-3">
                    Nadie ha canjeado este código aún
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {canjes.map((cj) => (
                      <div
                        key={cj.id_canje}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-700 truncate">
                            {cj.email_propietario || `User #${cj.id_usuario}`}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {fmtFull(cj.fecha_canje)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500 shrink-0">
                          <span>{cj.imagenes_otorgadas} img</span>
                          <span>·</span>
                          <span>{cj.angulos_otorgados} áng</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          MODAL: Create / Edit
         ══════════════════════════════════════════════ */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          onClick={() => setModalOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative w-[92%] max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "modalSlideUp 0.25s ease-out" }}
          >
            <div
              className="h-1 w-full"
              style={{
                background:
                  "linear-gradient(90deg, #F59E0B 0%, #F97316 50%, #EF4444 100%)",
              }}
            />

            <div className="p-6">
              <button
                onClick={() => setModalOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>

              <h3 className="text-lg font-bold text-[#0B1426] mb-5">
                {editingId ? "Editar código" : "Nuevo código promocional"}
              </h3>

              <div className="space-y-4">
                {/* Código */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Código *
                  </label>
                  <input
                    type="text"
                    value={form.codigo}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        codigo: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="LANZA25"
                    maxLength={50}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold tracking-wider uppercase outline-none focus:border-amber-400 transition"
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Descripción
                  </label>
                  <input
                    type="text"
                    value={form.descripcion}
                    onChange={(e) =>
                      setForm({ ...form, descripcion: e.target.value })
                    }
                    placeholder="Nota interna sobre este código"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-amber-400 transition"
                  />
                </div>

                {/* Imágenes + Ángulos */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Imágenes a regalar
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.imagenes_regalo}
                      onChange={(e) =>
                        setForm({ ...form, imagenes_regalo: e.target.value })
                      }
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-amber-400 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Ángulos AI a regalar
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.angulos_regalo}
                      onChange={(e) =>
                        setForm({ ...form, angulos_regalo: e.target.value })
                      }
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-amber-400 transition"
                    />
                  </div>
                </div>

                {/* Max usos + Activo */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Límite de usos
                      <span className="text-[10px] text-slate-400 ml-1">
                        (0 = ilimitado)
                      </span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.max_usos}
                      onChange={(e) =>
                        setForm({ ...form, max_usos: e.target.value })
                      }
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-amber-400 transition"
                    />
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div
                        onClick={() =>
                          setForm({ ...form, activo: !form.activo })
                        }
                        className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${form.activo ? "bg-emerald-500" : "bg-slate-300"}`}
                      >
                        <div
                          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.activo ? "translate-x-5" : "translate-x-0.5"}`}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-600">
                        {form.activo ? "Activo" : "Inactivo"}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Fechas */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Válido desde
                      <span className="text-[10px] text-slate-400 ml-1">
                        (opcional)
                      </span>
                    </label>
                    <input
                      type="datetime-local"
                      value={form.fecha_inicio}
                      onChange={(e) =>
                        setForm({ ...form, fecha_inicio: e.target.value })
                      }
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-amber-400 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Válido hasta
                      <span className="text-[10px] text-slate-400 ml-1">
                        (opcional)
                      </span>
                    </label>
                    <input
                      type="datetime-local"
                      value={form.fecha_fin}
                      onChange={(e) =>
                        setForm({ ...form, fecha_fin: e.target.value })
                      }
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-amber-400 transition"
                    />
                  </div>
                </div>

                {/* Redirect on exhaust */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    URL al agotarse
                    <span className="text-[10px] text-slate-400 ml-1">
                      (vacío = Stripe checkout)
                    </span>
                  </label>
                  <input
                    type="url"
                    value={form.redirect_on_exhaust}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        redirect_on_exhaust: e.target.value,
                      })
                    }
                    placeholder="https://wa.me/593999..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-amber-400 transition"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Si pones una URL, cuando se agoten los recursos del cliente
                    será redirigido ahí en vez de al pago de Stripe.
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-60"
                  style={{
                    background:
                      "linear-gradient(135deg, #F59E0B 0%, #F97316 100%)",
                  }}
                >
                  {saving
                    ? "Guardando..."
                    : editingId
                      ? "Guardar cambios"
                      : "Crear código"}
                </button>
              </div>
            </div>
          </div>

          <style>{`
            @keyframes modalSlideUp {
              from { opacity: 0; transform: translateY(16px) scale(0.97); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default CodigosPromoAdmin;
