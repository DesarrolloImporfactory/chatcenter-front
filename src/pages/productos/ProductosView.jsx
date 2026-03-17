// src/components/productos/ProductosView.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";
import Header from "../Header/pageHeader";
import { useDropi } from "../../context/DropiContext";
import ImportarProductosDropi from "./modales/ImportarProductosDropi";
import ProductoModal from "./modales/ProductoModal";

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */
const currency = new Intl.NumberFormat("es-EC", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

const normalizaTipo = (t) => {
  const s = String(t || "")
    .toLowerCase()
    .trim();
  if (!s) return "";
  return s.startsWith("ser") ? "servicio" : "producto";
};

/*
 * FIX: Verificar visibilidad.
 * Backend guarda `es_privado`. Respuestas legacy pueden traer `is_private`.
 * Esta función es la fuente de verdad para mostrar la columna de visibilidad.
 */
const esPrivado = (p) =>
  p.es_privado === 1 ||
  p.es_privado === true ||
  p.is_private === 1 ||
  p.is_private === true;

/* ─────────────────────────────────────────────────────────────
   Main
───────────────────────────────────────────────────────────── */
const ProductosView = () => {
  const navigate = useNavigate();
  const { isDropiLinked } = useDropi();

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);

  /* Modal producto */
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  /* Modal imagen zoom */
  const [modalImagen, setModalImagen] = useState({ abierta: false, url: "" });

  /* Carga masiva */
  const [isOpenMasivo, setIsOpenMasivo] = useState(false);
  const [archivoMasivo, setArchivoMasivo] = useState(null);
  const [archivoMasivoNombre, setArchivoMasivoNombre] = useState(null);

  /* Dropi */
  const [dropiModalOpen, setDropiModalOpen] = useState(false);
  const [dropiLoading, setDropiLoading] = useState(false);
  const [dropiKeywords, setDropiKeywords] = useState("");
  const [dropiStart, setDropiStart] = useState(0);
  const [dropiProducts, setDropiProducts] = useState([]);
  const dropiPageSize = 12;

  /* Filtros + paginación */
  const [search, setSearch] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [sort, setSort] = useState({ key: "nombre", dir: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  /* ── Fetch ── */
  const fetchData = async () => {
    const idc = localStorage.getItem("id_configuracion");
    if (!idc) {
      Swal.fire({ icon: "error", title: "Falta configuración" });
      ["id_configuracion", "tipo_configuracion", "id_plataforma_conf"].forEach(
        (k) => localStorage.removeItem(k),
      );
      navigate("/conexiones");
      return;
    }
    try {
      setLoading(true);
      const [prodRes, catRes] = await Promise.all([
        chatApi.post("/productos/listarProductos", {
          id_configuracion: parseInt(idc),
        }),
        chatApi.post("/categorias/listarCategorias", {
          id_configuracion: parseInt(idc),
        }),
      ]);
      setProductos(prodRes.data.data || []);
      setCategorias(catRes.data.data || []);
    } catch {
      Swal.fire({ icon: "error", title: "Error al cargar productos" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line

  /* ── catMap ── */
  const catMap = useMemo(
    () =>
      Object.fromEntries(
        (categorias || []).map((c) => [String(c.id), c.nombre]),
      ),
    [categorias],
  );

  /* ── Sort toggle ── */
  const handleSort = (key) =>
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );

  /* ── Lista filtrada y ordenada ── */
  const listaProcesada = useMemo(() => {
    const q = search.trim().toLowerCase();
    let data = [...productos];
    if (q)
      data = data.filter(
        (p) =>
          (p?.nombre || "").toLowerCase().includes(q) ||
          (p?.descripcion || "").toLowerCase().includes(q),
      );
    if (filtroCategoria)
      data = data.filter(
        (p) => String(p.id_categoria) === String(filtroCategoria),
      );
    if (filtroTipo)
      data = data.filter((p) => normalizaTipo(p.tipo) === filtroTipo);

    data.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      const va =
        sort.key === "precio"
          ? Number(a.precio || 0)
          : (a[sort.key] ?? "").toString().toLowerCase();
      const vb =
        sort.key === "precio"
          ? Number(b.precio || 0)
          : (b[sort.key] ?? "").toString().toLowerCase();
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return data;
  }, [productos, search, filtroCategoria, filtroTipo, sort]);

  const totalPages = Math.max(
    1,
    Math.ceil(listaProcesada.length / itemsPerPage),
  );
  const paginated = useMemo(() => {
    const s = (currentPage - 1) * itemsPerPage;
    return listaProcesada.slice(s, s + itemsPerPage);
  }, [listaProcesada, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filtroCategoria, filtroTipo]);

  /* ── Delete ── */
  const handleDelete = async (p) => {
    const { isConfirmed } = await Swal.fire({
      title: "¿Eliminar producto?",
      text: p.nombre,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#ef4444",
    });
    if (!isConfirmed) return;
    try {
      await chatApi.delete("/productos/eliminarProducto", {
        data: { id_producto: p.id },
      });
      Swal.fire({
        icon: "success",
        title: "Producto eliminado",
        timer: 1500,
        showConfirmButton: false,
      });
      fetchData();
    } catch {
      Swal.fire({ icon: "error", title: "No se pudo eliminar" });
    }
  };

  /* ── Carga masiva ── */
  const handleSubirMasivo = async (e) => {
    e.preventDefault();
    if (!archivoMasivo) {
      Swal.fire({ icon: "warning", title: "Selecciona un archivo Excel" });
      return;
    }
    const fd = new FormData();
    fd.append("archivoExcel", archivoMasivo);
    fd.append("id_configuracion", localStorage.getItem("id_configuracion"));
    try {
      await chatApi.post("/productos/cargaMasivaProductos", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      Swal.fire({ icon: "success", title: "Productos cargados correctamente" });
      setIsOpenMasivo(false);
      setArchivoMasivo(null);
      setArchivoMasivoNombre(null);
      fetchData();
    } catch {
      Swal.fire({ icon: "error", title: "Error al subir el archivo" });
    }
  };

  /* ── Dropi ── */
  const fetchDropiProducts = async (reset = false) => {
    setDropiLoading(true);
    try {
      const idc = Number(localStorage.getItem("id_configuracion"));
      const { data } = await chatApi.post("/productos/listarProductosDropi", {
        id_configuracion: idc,
        pageSize: dropiPageSize,
        startData: reset ? 0 : dropiStart,
        keywords: dropiKeywords,
        order_by: "id",
        order_type: "desc",
        no_count: true,
      });
      setDropiProducts(data?.data?.objects || []);
      if (reset) setDropiStart(0);
    } catch {
      Swal.fire({ icon: "error", title: "Error al listar Dropi" });
    } finally {
      setDropiLoading(false);
    }
  };

  useEffect(() => {
    if (dropiModalOpen) fetchDropiProducts(true);
  }, [dropiModalOpen]);

  const importarDropi = async (dropiId) => {
    const idc = Number(localStorage.getItem("id_configuracion"));
    const { isConfirmed } = await Swal.fire({
      title: `¿Importar producto con ID #${dropiId}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, importar",
    });
    if (!isConfirmed) return;
    try {
      const { data } = await chatApi.post("/productos/importarProductoDropi", {
        id_configuracion: idc,
        dropi_product_id: dropiId,
      });
      Swal.fire({
        icon: data?.alreadyImported ? "info" : "success",
        title: data?.alreadyImported
          ? "Ya estaba importado"
          : "Producto importado",
        timer: 1400,
        showConfirmButton: false,
      });
      setDropiModalOpen(false);
      fetchData();
    } catch {
      Swal.fire({ icon: "error", title: "Error al importar" });
    }
  };

  /* ── Sort header component ── */
  const SortTh = ({ k, children, center }) => (
    <th
      onClick={() => handleSort(k)}
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500
        cursor-pointer select-none hover:text-slate-700 transition-colors
        ${center ? "text-center" : "text-left"}`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <svg
          className={`w-3 h-3 ${sort.key === k ? "opacity-100 text-indigo-500" : "opacity-25"}`}
          viewBox="0 0 20 20"
          fill="currentColor"
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

  /* ── Header actions ── */
  const headerActions = (
    <div className="flex flex-wrap gap-2">
      {isDropiLinked === true && (
        <button
          onClick={() => {
            setDropiKeywords("");
            setDropiStart(0);
            setDropiProducts([]);
            setDropiModalOpen(true);
          }}
          className="inline-flex items-center gap-2 bg-[#eb6e1b] hover:bg-[#d3661e]
            text-white px-3.5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
        >
          <i className="bx bx-import text-base" />
          Importar Dropi
        </button>
      )}
      <button
        onClick={() => navigate("/catalogos")}
        className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20
          border border-white/20 text-white px-3.5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
      >
        <i className="bx bx-layout text-base" />
        Catálogos
      </button>
      <button
        onClick={() => setIsOpenMasivo(true)}
        className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400
          text-white px-3.5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
      >
        <i className="bx bx-upload text-base" />
        Carga masiva
      </button>
      <button
        onClick={() => {
          setEditingProduct(null);
          setModalOpen(true);
        }}
        className="inline-flex items-center gap-2 bg-white text-indigo-700 hover:bg-indigo-50
          px-3.5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
      >
        <i className="bx bx-plus text-base" />
        Agregar
      </button>
    </div>
  );

  const headerStats = [
    { label: "Total productos", value: productos.length },
    { label: "Categorías", value: categorias.length },
    { label: "Filtrados", value: listaProcesada.length },
    { label: "Página", value: `${currentPage}/${totalPages}` },
  ];

  /* ═════════════════════════════════════════
     RENDER
  ═════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-slate-50 w-full">
      <div
        className="mx-auto w-[98%] xl:w-[97%] 2xl:w-[96%] m-3 md:m-6 bg-white rounded-2xl
        ring-1 ring-slate-200 flex flex-col min-h-[82vh] overflow-hidden"
      >
        <Header
          title="Productos"
          subtitle="Administra tu catálogo de productos y servicios disponibles."
          actions={headerActions}
          stats={headerStats}
          className="bg-[#171931]"
        />

        {/* Filters */}
        <div className="px-5 py-3.5 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <i className="bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
              <input
                type="text"
                placeholder="Buscar por nombre o descripción…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg
                  focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none transition"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm
                  focus:ring-2 focus:ring-indigo-200 outline-none min-w-[150px]"
              >
                <option value="">Todas las categorías</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm
                  focus:ring-2 focus:ring-indigo-200 outline-none"
              >
                <option value="">Todos los tipos</option>
                <option value="producto">Producto</option>
                <option value="servicio">Servicio</option>
              </select>
            </div>
            <div className="ml-auto text-xs text-slate-400 hidden sm:block">
              {listaProcesada.length} resultado
              {listaProcesada.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Loading skeleton */}
          {loading && (
            <div className="p-5 space-y-2">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-14 bg-slate-100 animate-pulse rounded-xl"
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && listaProcesada.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center py-20 gap-5">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <i className="bx bx-package text-3xl text-indigo-300" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-slate-700 text-sm">
                  Sin resultados
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {search || filtroCategoria || filtroTipo
                    ? "Ajusta los filtros para ver más resultados."
                    : "Crea tu primer producto para empezar."}
                </p>
              </div>
              {!search && !filtroCategoria && !filtroTipo && (
                <button
                  onClick={() => {
                    setEditingProduct(null);
                    setModalOpen(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-5 py-2.5
                    rounded-xl font-semibold transition-colors"
                >
                  Agregar primer producto
                </button>
              )}
            </div>
          )}

          {/* Table */}
          {!loading && listaProcesada.length > 0 && (
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <SortTh k="id">#</SortTh>
                    <SortTh k="nombre">Producto</SortTh>
                    <SortTh k="precio" center>
                      Precio
                    </SortTh>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-left">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-left">
                      Categoría
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">
                      Imagen
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-left">
                      Visibilidad
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-left">
                      Stock / Dropi
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((p, idx) => {
                    const priv = esPrivado(p); // ← FIX usa es_privado + fallback is_private
                    return (
                      <tr
                        key={p.id}
                        className={`border-b border-slate-50 hover:bg-indigo-50/25 transition-colors
                          ${idx % 2 !== 0 ? "bg-slate-50/30" : ""}`}
                      >
                        {/* ID */}
                        <td className="px-4 py-3.5 text-xs text-slate-400 font-mono w-12">
                          {p.id}
                        </td>

                        {/* Producto */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 flex items-center
                              justify-center flex-shrink-0 ring-1 ring-slate-200"
                            >
                              {p.imagen_url ? (
                                <img
                                  src={p.imagen_url}
                                  alt=""
                                  className="w-9 h-9 object-cover"
                                />
                              ) : (
                                <i className="bx bx-package text-slate-300 text-lg" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-800 text-sm truncate max-w-[240px]">
                                {p.nombre}
                              </div>
                              {p.descripcion && (
                                <div className="text-xs text-slate-400 line-clamp-1 max-w-[280px] mt-0.5">
                                  {p.descripcion}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Precio */}
                        <td className="px-4 py-3.5 text-center tabular-nums font-bold text-slate-800">
                          {currency.format(Number(p.precio || 0))}
                        </td>

                        {/* Tipo */}
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${
                              normalizaTipo(p.tipo) === "servicio"
                                ? "bg-amber-50 text-amber-700 ring-amber-200"
                                : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                            }`}
                          >
                            {normalizaTipo(p.tipo) === "servicio"
                              ? "Servicio"
                              : "Producto"}
                          </span>
                        </td>

                        {/* Categoría */}
                        <td className="px-4 py-3.5 text-sm text-slate-600">
                          {catMap[String(p.id_categoria)] || "—"}
                        </td>

                        {/* Imagen zoom */}
                        <td className="px-4 py-3.5 text-center">
                          {p.imagen_url ? (
                            <img
                              src={p.imagen_url}
                              alt=""
                              onClick={() =>
                                setModalImagen({
                                  abierta: true,
                                  url: p.imagen_url,
                                })
                              }
                              className="h-10 w-10 object-cover rounded-lg ring-1 ring-slate-200
                                cursor-zoom-in hover:opacity-80 transition-opacity mx-auto"
                            />
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>

                        {/* Visibilidad — FIX: usa esPrivado() */}
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                            text-xs font-semibold ring-1 ${
                              priv
                                ? "bg-rose-50 text-rose-700 ring-rose-200"
                                : "bg-sky-50 text-sky-700 ring-sky-200"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${priv ? "bg-rose-400" : "bg-sky-400"}`}
                            />
                            {priv ? "Privado" : "Público"}
                          </span>
                        </td>

                        {/* Stock / Dropi ID */}
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col gap-1.5">
                            {p.stock != null && (
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full w-fit ${
                                  Number(p.stock) > 0
                                    ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200"
                                    : "bg-slate-100 text-slate-400 ring-1 ring-slate-200"
                                }`}
                              >
                                <i
                                  className="bx bx-box"
                                  style={{ fontSize: 10 }}
                                />
                                {Number(p.stock) > 0
                                  ? `${p.stock} uds`
                                  : "Sin stock"}
                              </span>
                            )}
                            {p.external_source === "DROPI" &&
                              p.external_id != null && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full w-fit bg-orange-50 text-orange-500 ring-1 ring-orange-200">
                                  <i
                                    className="bx bx-barcode"
                                    style={{ fontSize: 10 }}
                                  />
                                  Dropi #{p.external_id}
                                </span>
                              )}
                            {p.external_source === "INSTA_LANDING" && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full w-fit bg-indigo-50 text-indigo-500 ring-1 ring-indigo-200">
                                <i
                                  className="bx bxs-zap"
                                  style={{ fontSize: 10 }}
                                />
                                InstaLanding
                              </span>
                            )}
                            {p.stock == null && p.external_id == null && (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </div>
                        </td>

                        {/* Acciones */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setEditingProduct(p);
                                setModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg
                                border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50
                                hover:text-indigo-700 text-slate-600 font-medium transition-colors"
                            >
                              <i className="bx bx-edit-alt text-sm" />
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(p)}
                              className="inline-flex items-center text-xs px-2 py-1.5 rounded-lg
                                border border-transparent hover:border-red-200 hover:bg-red-50
                                text-slate-300 hover:text-red-500 transition-colors"
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

              {/* Pagination */}
              <div className="border-t border-slate-100 px-5 py-3.5 flex items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  Mostrando{" "}
                  <strong>
                    {Math.min(
                      (currentPage - 1) * itemsPerPage + 1,
                      listaProcesada.length,
                    )}
                  </strong>
                  –
                  <strong>
                    {Math.min(
                      currentPage * itemsPerPage,
                      listaProcesada.length,
                    )}
                  </strong>{" "}
                  de <strong>{listaProcesada.length}</strong>
                </p>
                <div className="flex items-center gap-1.5">
                  {[
                    {
                      lbl: "«",
                      action: () => setCurrentPage(1),
                      disabled: currentPage === 1,
                    },
                    {
                      lbl: "‹",
                      action: () => setCurrentPage((p) => p - 1),
                      disabled: currentPage === 1,
                    },
                    {
                      lbl: "›",
                      action: () => setCurrentPage((p) => p + 1),
                      disabled: currentPage === totalPages,
                    },
                    {
                      lbl: "»",
                      action: () => setCurrentPage(totalPages),
                      disabled: currentPage === totalPages,
                    },
                  ].map((btn, i) => (
                    <button
                      key={i}
                      onClick={btn.action}
                      disabled={btn.disabled}
                      className="w-8 h-8 rounded-lg border border-slate-200 text-sm flex items-center
                        justify-center disabled:opacity-40 hover:bg-slate-50 transition-colors"
                    >
                      {btn.lbl}
                    </button>
                  ))}
                  <span className="text-xs text-slate-500 ml-1 font-medium">
                    {currentPage}/{totalPages}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FAB mobile */}
      <button
        onClick={() => {
          setEditingProduct(null);
          setModalOpen(true);
        }}
        className="fixed bottom-5 right-5 md:hidden w-12 h-12 rounded-full bg-indigo-600
          text-white flex items-center justify-center shadow-lg hover:bg-indigo-700"
        aria-label="Agregar producto"
      >
        <i className="bx bx-plus text-2xl" />
      </button>

      {/* ══ ProductoModal — extraído a ./modales/ProductoModal.jsx ══ */}
      <ProductoModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingProduct(null);
        }}
        editingProduct={editingProduct}
        categorias={categorias}
        onSaved={fetchData}
      />

      {/* ══ Modal carga masiva ══ */}
      {isOpenMasivo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: "rgba(5,7,20,.72)",
            backdropFilter: "blur(12px)",
          }}
          onKeyDown={(e) => e.key === "Escape" && setIsOpenMasivo(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl overflow-hidden flex flex-col"
            style={{
              boxShadow: "0 24px 80px rgba(0,0,0,.5)",
              animation: "pmIn .22s ease",
            }}
          >
            {/* header */}
            <div
              className="flex items-center justify-between px-6 py-5 flex-shrink-0"
              style={{
                background:
                  "linear-gradient(135deg,#171931 0%,#1e2550 60%,#2c3a8c 100%)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background: "rgba(255,255,255,.12)",
                    border: "1px solid rgba(255,255,255,.18)",
                  }}
                >
                  <i className="bx bx-upload text-white text-lg" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-sm">
                    Carga masiva de productos
                  </h2>
                  <p className="text-indigo-300 text-xs mt-0.5">
                    Sube un archivo Excel con el formato correcto
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpenMasivo(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/12"
              >
                <i className="bx bx-x text-xl" />
              </button>
            </div>

            {/* body */}
            <div className="p-6 space-y-4 bg-white">
              <p className="text-sm text-slate-600">
                Sube un Excel siguiendo la plantilla para importar múltiples
                productos de una vez.
              </p>

              <div
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) {
                    setArchivoMasivo(f);
                    setArchivoMasivoNombre(f.name);
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center
                  hover:border-indigo-300 hover:bg-slate-50 transition-colors"
              >
                <i className="bx bx-cloud-upload text-4xl text-slate-300 mb-2 block" />
                <p className="text-sm text-slate-600">
                  Arrastra tu Excel aquí o{" "}
                  <label className="text-indigo-600 font-semibold cursor-pointer hover:underline">
                    selecciona
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setArchivoMasivo(f);
                          setArchivoMasivoNombre(f.name);
                        }
                      }}
                    />
                  </label>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  .xlsx, .xls — máx. 10 MB
                </p>
              </div>

              {archivoMasivoNombre && (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-emerald-700">
                    <i className="bx bx-check-circle text-lg" />
                    {archivoMasivoNombre}
                  </div>
                  <button
                    onClick={() => {
                      setArchivoMasivo(null);
                      setArchivoMasivoNombre(null);
                    }}
                    className="text-xs text-slate-500 hover:text-red-500 transition-colors"
                  >
                    Quitar
                  </button>
                </div>
              )}
            </div>

            {/* footer */}
            <div
              className="flex items-center justify-between px-6 py-4 flex-shrink-0"
              style={{
                background:
                  "linear-gradient(135deg,#171931 0%,#1e2550 60%,#2c3a8c 100%)",
              }}
            >
              <a
                href="https://chat.imporfactory.app/uploads/plantillas/plantilla_subida_masiva.xlsx"
                target="_blank"
                download
                className="inline-flex items-center gap-2 text-xs px-3 py-2 rounded-lg font-medium transition-colors text-white/80 hover:text-white"
                style={{ border: "1px solid rgba(255,255,255,.2)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,.1)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <i className="bx bx-cloud-download" />
                Descargar plantilla
              </a>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsOpenMasivo(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors text-white/80 hover:text-white"
                  style={{ border: "1.5px solid rgba(255,255,255,.25)" }}
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
                  onClick={handleSubirMasivo}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: "#4f46e5" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#4338ca")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#4f46e5")
                  }
                >
                  <i className="bx bx-upload" />
                  Subir archivo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ Imagen zoom modal ══ */}
      {modalImagen.abierta && (
        <div
          className="fixed inset-0 bg-black/85 flex items-center justify-center z-50"
          onClick={() => setModalImagen({ abierta: false, url: "" })}
        >
          <img
            src={modalImagen.url}
            alt="Vista previa"
            className="max-h-[90vh] max-w-[90vw] rounded-2xl shadow-2xl"
          />
        </div>
      )}

      {/* ══ Importar Dropi ══ */}
      <ImportarProductosDropi
        open={dropiModalOpen}
        onClose={() => {
          setDropiModalOpen(false);
          setDropiKeywords("");
          setDropiStart(0);
          setDropiProducts([]);
        }}
        dropiKeywords={dropiKeywords}
        setDropiKeywords={setDropiKeywords}
        onSearch={fetchDropiProducts}
        loading={dropiLoading}
        products={dropiProducts}
        onImport={importarDropi}
      />

      <style>{`
        @keyframes pmIn {
          from { opacity:0; transform:scale(.96) translateY(14px); }
          to   { opacity:1; transform:scale(1)   translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default ProductosView;
