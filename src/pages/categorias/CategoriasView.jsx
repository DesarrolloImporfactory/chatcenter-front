import React, { useEffect, useMemo, useState } from "react";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";

const SortHeader = ({ k, sort, onSort, children, align = "left" }) => (
  <th
    onClick={() => onSort(k)}
    className={`p-3 select-none cursor-pointer text-${align} font-semibold`}
    title="Ordenar"
    aria-sort={
      sort.key === k
        ? sort.dir === "asc"
          ? "ascending"
          : "descending"
        : "none"
    }
  >
    <span className="inline-flex items-center gap-1">
      {children}
      <svg
        className={`h-3 w-3 transition ${
          sort.key === k ? "opacity-100" : "opacity-30"
        }`}
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        {sort.key === k && sort.dir === "desc" ? (
          <path d="M14 12l-4 4-4-4h8z" />
        ) : (
          <path d="M6 8l4-4 4 4H6z" />
        )}
      </svg>
    </span>
  </th>
);

const HeaderStat = ({ label, value }) => (
  <div className="px-4 py-3 rounded-xl bg-white/30 backdrop-blur ring-1 ring-white/50 shadow-sm">
    <div className="text-xs uppercase tracking-wide text-white/80">{label}</div>
    <div className="text-lg font-semibold text-white">{value}</div>
  </div>
);

const CategoriasView = () => {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ nombre: "", descripcion: "" });
  const [editingId, setEditingId] = useState(null);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ key: "nombre", dir: "asc" });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const fetchCategorias = async () => {
    const idc = localStorage.getItem("id_configuracion");
    if (!idc) {
      setLoading(false);
      Swal.fire({
        icon: "error",
        title: "Falta configuración",
        text: "No se encontró el ID de configuración",
      });

      localStorage.removeItem("id_configuracion");
      localStorage.removeItem("id_plataforma_conf");
      navigate("/conexiones");
      return;
    }

    try {
      setLoading(true);
      const res = await chatApi.post("/categorias/listarCategorias", {
        id_configuracion: parseInt(idc),
      });
      setCategorias(res.data.data || []);
    } catch {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudieron cargar categorías",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategorias();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { nombre: form.nombre, descripcion: form.descripcion };
    const idc = parseInt(localStorage.getItem("id_configuracion"));
    try {
      if (editingId) {
        await chatApi.post("/categorias/actualizarCategoria", {
          id_categoria: editingId,
          ...payload,
        });
        Swal.fire({
          icon: "success",
          title: "Categoría actualizada",
          text: "Se ha actualizado exitosamente",
        });
      } else {
        await chatApi.post("/categorias/agregarCategoria", {
          id_configuracion: idc,
          ...payload,
        });
        Swal.fire({
          icon: "success",
          title: "Categoría agregada",
          text: "Se ha guardado correctamente",
        });
      }
      setModalOpen(false);
      setForm({ nombre: "", descripcion: "" });
      setEditingId(null);
      fetchCategorias();
    } catch {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo guardar la categoría",
      });
    }
  };

  const openModal = (cat = null) => {
    if (cat) {
      setEditingId(cat.id);
      setForm({ nombre: cat.nombre || "", descripcion: cat.descripcion || "" });
    } else {
      setEditingId(null);
      setForm({ nombre: "", descripcion: "" });
    }
    setModalOpen(true);
  };

  const handleDelete = async (cat) => {
    const result = await Swal.fire({
      title: "¿Eliminar categoría?",
      text: cat.nombre,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });
    if (result.isConfirmed) {
      try {
        await chatApi.delete("/categorias/eliminarCategoria", {
          data: { id_categoria: cat.id },
        });
        Swal.fire({
          icon: "success",
          title: "Categoría eliminada",
          text: cat.nombre,
          timer: 1500,
          showConfirmButton: false,
        });
        fetchCategorias();
      } catch {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudo eliminar la categoría",
        });
      }
    }
  };

  const handleSort = (key) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  };

  // --- filtros + sort + paginación ---
  const listaProcesada = useMemo(() => {
    const q = search.trim().toLowerCase();
    let data = [...categorias];
    if (q) {
      data = data.filter(
        (c) =>
          c?.nombre?.toLowerCase().includes(q) ||
          c?.descripcion?.toLowerCase().includes(q)
      );
    }

    data.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      const va = (a[sort.key] ?? "").toString().toLowerCase();
      const vb = (b[sort.key] ?? "").toString().toLowerCase();
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });

    return data;
  }, [categorias, search, sort]);

  const totalPages = Math.max(
    1,
    Math.ceil(listaProcesada.length / itemsPerPage)
  );
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return listaProcesada.slice(start, start + itemsPerPage);
  }, [listaProcesada, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, itemsPerPage]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100  px-3 md:px-6">
      <div className="mx-auto w-[98%] xl:w-[97%] 2xl:w-[96%] m-3 md:m-6 bg-white rounded-2xl shadow-xl ring-1 ring-slate-200/70 flex flex-col min-h-[82vh] overflow-hidden">
        {/* Header */}
        <header className="relative isolate overflow-hidden">
          <div className="bg-[#171931] p-6 md:p-7 flex flex-col gap-5 rounded-t-2xl">
            <div className="flex items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                  Categorías
                </h1>
                <p className="text-white/80 text-sm">
                  Organiza tu catálogo con claridad y estilo.
                </p>
              </div>
              <button
                onClick={() => openModal()}
                className="inline-flex items-center gap-2 bg-white text-indigo-700 hover:bg-indigo-50 active:bg-indigo-100 px-4 py-2.5 rounded-lg font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M11 11V5a1 1 0 1 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6z" />
                </svg>
                Agregar
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <HeaderStat label="Total categorías" value={categorias.length} />
              <HeaderStat label="En esta vista" value={listaProcesada.length} />
              <HeaderStat
                label="Página"
                value={`${currentPage}/${totalPages}`}
              />
              <HeaderStat label="Resultados/página" value={6} />
            </div>
          </div>
        </header>

        {/* Controles */}
        <div className="p-6 border-b border-slate-100 bg-white">
          <div className="flex items-stretch gap-3">
            <div className="relative w-full">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M12.9 14.32a8 8 0 1 1 1.41-1.41l3.39 3.38a1 1 0 0 1-1.42 1.42l-3.38-3.39zM14 8a6 6 0 1 0-12 0 6 6 0 0 0 12 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Buscar por nombre o descripción…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="p-6 space-y-2 animate-pulse">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-md" />
              ))}
            </div>
          ) : listaProcesada.length === 0 ? (
            <div className="flex-1 p-10 text-center flex flex-col items-center justify-center gap-4">
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-slate-400"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M21 19l-5.6-5.6a7 7 0 1 0-2 2L19 21l2-2zM5 10a5 5 0 1 1 10 0A5 5 0 0 1 5 10z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">
                  Sin resultados
                </h3>
                <p className="text-slate-500">
                  Ajusta la búsqueda o crea tu primera categoría.
                </p>
              </div>
              <button
                onClick={() => openModal()}
                className="inline-flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2.5 rounded-lg shadow-sm transition"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M11 11V5a1 1 0 1 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6z" />
                </svg>
                Agregar categoría
              </button>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-auto">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr className="text-slate-600">
                      <SortHeader
                        k="id"
                        sort={sort}
                        onSort={handleSort}
                        align="left"
                      >
                        ID
                      </SortHeader>
                      <SortHeader
                        k="nombre"
                        sort={sort}
                        onSort={handleSort}
                        align="left"
                      >
                        Nombre
                      </SortHeader>
                      <SortHeader
                        k="descripcion"
                        sort={sort}
                        onSort={handleSort}
                        align="left"
                      >
                        Descripción
                      </SortHeader>
                      <th className="p-3 text-center font-semibold">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginated.map((cat) => (
                      <tr key={cat.id} className="hover:bg-slate-50/60">
                        <td className="p-3 text-slate-500">{cat.id}</td>
                        <td className="p-3">
                          <div className="font-medium text-slate-800">
                            {cat.nombre}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-slate-600 max-w-[640px] line-clamp-2">
                            {cat.descripcion || "—"}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openModal(cat)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700"
                              title="Editar"
                            >
                              <svg
                                className="w-4 h-4"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" />
                              </svg>
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(cat)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                              title="Eliminar"
                            >
                              <svg
                                className="w-4 h-4"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M9 3a1 1 0 0 0-1 1v1H4a1 1 0 1 0 0 2h1v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7h1a1 1 0 1 0 0-2h-4V4a1 1 0 0 0-1-1H9zm2 4a1 1 0 1 0-2 0v10a1 1 0 1 0 2 0V7zm6 0a1 1 0 1 0-2 0v10a1 1 0 1 0 2 0V7z" />
                              </svg>
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              <div className="border-top border-slate-100 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-sm text-slate-600">
                  Mostrando{" "}
                  <span className="font-semibold text-slate-800">
                    {Math.min(
                      (currentPage - 1) * itemsPerPage + 1,
                      listaProcesada.length
                    )}
                  </span>{" "}
                  –{" "}
                  <span className="font-semibold text-slate-800">
                    {Math.min(
                      currentPage * itemsPerPage,
                      listaProcesada.length
                    )}
                  </span>{" "}
                  de{" "}
                  <span className="font-semibold text-slate-800">
                    {listaProcesada.length}
                  </span>
                </div>
                <div className="inline-flex items-center gap-2">
                  <button
                    className="px-3 py-1.5 rounded-md border border-slate-200 disabled:opacity-50"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    aria-label="Primera página"
                  >
                    «
                  </button>
                  <button
                    className="px-3 py-1.5 rounded-md border border-slate-200 disabled:opacity-50"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    aria-label="Anterior"
                  >
                    ‹
                  </button>
                  <span className="text-sm px-2">
                    Página <strong>{currentPage}</strong> de{" "}
                    <strong>{totalPages}</strong>
                  </span>
                  <button
                    className="px-3 py-1.5 rounded-md border border-slate-200 disabled:opacity-50"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    aria-label="Siguiente"
                  >
                    ›
                  </button>
                  <button
                    className="px-3 py-1.5 rounded-md border border-slate-200 disabled:opacity-50"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    aria-label="Última página"
                  >
                    »
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FAB mobile */}
      <button
        onClick={() => openModal()}
        className="fixed bottom-5 right-5 md:hidden inline-flex items-center justify-center h-12 w-12 rounded-full shadow-lg bg-indigo-600 text-white hover:bg-indigo-700"
        aria-label="Agregar categoría"
      >
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11 11V5a1 1 0 1 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6z" />
        </svg>
      </button>

      {/* Modal agregar/editar */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onKeyDown={(e) => e.key === "Escape" && setModalOpen(false)}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-3 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-xl font-semibold">
                {editingId ? "Editar categoría" : "Agregar categoría"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-100"
                aria-label="Cerrar"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M6.225 4.811L4.81 6.225 10.586 12l-5.775 5.775 1.414 1.414L12 13.414l5.775 5.775 1.414-1.414L13.414 12l5.775-5.775-1.414-1.414L12 10.586 6.225 4.811z" />
                </svg>
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <div className="space-y-4 md:col-span-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nombre
                  </label>
                  <input
                    required
                    placeholder="Ej. Servicios, Accesorios…"
                    value={form.nombre}
                    onChange={(e) =>
                      setForm({ ...form, nombre: e.target.value })
                    }
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    placeholder="Breve descripción de la categoría"
                    value={form.descripcion}
                    onChange={(e) =>
                      setForm({ ...form, descripcion: e.target.value })
                    }
                    rows={4}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none resize-y"
                  />
                </div>
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="border border-slate-200 px-4 py-2.5 rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg shadow-sm"
                >
                  {editingId ? "Actualizar" : "Agregar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriasView;
