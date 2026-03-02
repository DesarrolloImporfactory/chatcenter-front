import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";
import Header from "../Header/pageHeader";
import CatalogoModal from "./modales/CatalogoModal";

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */
const buildPublicUrl = (slug) => `${window.location.origin}/catalogo/${slug}`;

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const el = document.createElement("input");
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  }
  Swal.fire({
    icon: "success",
    title: "Enlace copiado",
    text,
    timer: 1200,
    showConfirmButton: false,
  });
};

const MODO_META = {
  PUBLIC_ONLY: {
    label: "Solo públicos",
    dot: "bg-sky-400",
    badge: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  },
  PRIVATE_ONLY: {
    label: "Solo privados",
    dot: "bg-rose-400",
    badge: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  },
  BOTH: {
    label: "Públicos + privados",
    dot: "bg-emerald-400",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  },
};

/* ─────────────────────────────────────────────────────────────
   Main
───────────────────────────────────────────────────────────── */
const CatalogosView = () => {
  const navigate = useNavigate();
  const idc = Number(localStorage.getItem("id_configuracion"));

  const [loading, setLoading] = useState(true);
  const [catalogos, setCatalogos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  /* Fetch */
  const fetchAll = async () => {
    if (!idc) {
      Swal.fire({ icon: "error", title: "Sin configuración" });
      ["id_configuracion", "tipo_configuracion", "id_plataforma_conf"].forEach(
        (k) => localStorage.removeItem(k),
      );
      navigate("/conexiones");
      return;
    }
    try {
      setLoading(true);
      const [catRes, prodRes] = await Promise.all([
        chatApi.post("/catalogos/listarCatalogos", { id_configuracion: idc }),
        chatApi.post("/productos/listarProductos", { id_configuracion: idc }),
      ]);
      setCatalogos(catRes.data?.data || []);
      setProductos(prodRes.data?.data || []);
    } catch {
      Swal.fire({ icon: "error", title: "Error al cargar datos" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []); // eslint-disable-line

  /* Filtro */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return catalogos;
    return catalogos.filter(
      (c) =>
        (c.nombre_interno || "").toLowerCase().includes(q) ||
        (c.titulo_publico || "").toLowerCase().includes(q) ||
        (c.slug || "").toLowerCase().includes(q),
    );
  }, [catalogos, search]);

  /* Delete */
  const handleDelete = async (item) => {
    const { isConfirmed } = await Swal.fire({
      title: "¿Eliminar catálogo?",
      text: item.nombre_interno,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#ef4444",
    });
    if (!isConfirmed) return;
    try {
      await chatApi.delete("/catalogos/eliminarCatalogo", {
        data: { id_configuracion: idc, id_catalogo: item.id },
      });
      Swal.fire({
        icon: "success",
        title: "Eliminado",
        timer: 1200,
        showConfirmButton: false,
      });
      fetchAll();
    } catch {
      Swal.fire({ icon: "error", title: "No se pudo eliminar" });
    }
  };

  /* Modal */
  const openCreate = () => {
    setEditingItem(null);
    setModalOpen(true);
  };
  const openEdit = (c) => {
    setEditingItem(c);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
  };

  /* Header */
  const headerActions = (
    <div className="flex gap-2">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-lg font-medium border border-white/20 transition-colors text-sm"
      >
        <i className="bx bx-left-arrow-alt text-base" />
        Volver
      </button>
      <button
        onClick={openCreate}
        className="inline-flex items-center gap-2 bg-white text-indigo-700 hover:bg-indigo-50
          px-3.5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
      >
        <i className="bx bx-plus text-base" />
        Nuevo catálogo
      </button>
    </div>
  );

  const headerStats = [
    { label: "Catálogos", value: catalogos.length },
    { label: "Productos disponibles", value: productos.length },
  ];

  /* ── RENDER ── */
  return (
    <div className="min-h-screen bg-slate-50 w-full">
      <div className="mx-auto w-[98%] xl:w-[97%] 2xl:w-[96%] m-3 md:m-6 bg-white rounded-2xl ring-1 ring-slate-200 flex flex-col min-h-[82vh] overflow-hidden">
        <Header
          title="Catálogos"
          subtitle="Crea catálogos públicos o privados, elige los productos y personaliza qué campos se muestran."
          actions={headerActions}
          stats={headerStats}
          className="bg-[#171931]"
        />

        {/* Toolbar */}
        {/* <div className="px-5 py-3.5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <i className="bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
              <input
                type="text"
                placeholder="Buscar catálogos…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none transition"
              />
            </div>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1"
              >
                <i className="bx bx-x" />
                Limpiar
              </button>
            )}
            <div className="ml-auto text-xs text-slate-400">
              {filtered.length} de {catalogos.length} catálogos
            </div>
          </div>
        </div> */}

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Skeleton */}
          {loading && (
            <div className="p-5 space-y-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-14 rounded-xl bg-slate-100 animate-pulse"
                />
              ))}
            </div>
          )}

          {/* Empty */}
          {!loading && filtered.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center py-20 gap-5">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <i className="bx bx-book-open text-3xl text-indigo-300" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-slate-700 text-sm">
                  {search ? "Sin resultados" : "Aún no tienes catálogos"}
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  {search
                    ? "Prueba con otros términos."
                    : "Crea tu primer catálogo y comparte el enlace con tus clientes."}
                </p>
              </div>
              {!search && (
                <button
                  onClick={openCreate}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-5 py-2.5 rounded-xl font-semibold transition-colors"
                >
                  Crear primer catálogo
                </button>
              )}
            </div>
          )}

          {/* Table */}
          {!loading && filtered.length > 0 && (
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-12">
                      #
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Catálogo
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Visibilidad
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Enlace público
                    </th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, idx) => {
                    const meta =
                      MODO_META[c.modo_visibilidad] || MODO_META.BOTH;
                    const pubUrl = buildPublicUrl(c.slug);
                    return (
                      <tr
                        key={c.id}
                        className={`border-b border-slate-50 hover:bg-indigo-50/30 transition-colors ${idx % 2 === 0 ? "" : "bg-slate-50/40"}`}
                      >
                        {/* ID */}
                        <td className="px-5 py-4 text-xs text-slate-400 font-mono">
                          {c.id}
                        </td>

                        {/* Nombre */}
                        <td className="px-5 py-4">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <i className="bx bx-book-content text-indigo-500 text-sm" />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-800 text-sm">
                                {c.nombre_interno}
                              </div>
                              {c.titulo_publico ? (
                                <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                  <i className="bx bx-world text-xs" />
                                  {c.titulo_publico}
                                </div>
                              ) : (
                                <div className="text-xs text-slate-300 mt-0.5 italic">
                                  Sin título público
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Visibilidad */}
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.badge}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${meta.dot}`}
                            />
                            {meta.label}
                          </span>
                        </td>

                        {/* Enlace */}
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md truncate max-w-[180px] inline-block">
                                {c.slug}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => copyText(pubUrl)}
                                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 text-slate-500 transition-colors"
                              >
                                <i className="bx bx-copy text-xs" />
                                Copiar
                              </button>
                              <a
                                href={pubUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 text-slate-500 transition-colors"
                              >
                                <i className="bx bx-link-external text-xs" />
                                Abrir
                              </a>
                            </div>
                          </div>
                        </td>

                        {/* Acciones */}
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openEdit(c)}
                              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 font-medium transition-colors"
                            >
                              <i className="bx bx-edit-alt text-sm" />
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(c)}
                              className="inline-flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg border border-transparent hover:border-red-200 hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <i className="bx bx-trash text-sm" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <CatalogoModal
        open={modalOpen}
        onClose={closeModal}
        editingItem={editingItem}
        idc={idc}
        productos={productos}
        onSaved={fetchAll}
      />
    </div>
  );
};

export default CatalogosView;
