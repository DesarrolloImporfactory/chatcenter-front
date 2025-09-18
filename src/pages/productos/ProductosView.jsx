import React, { useEffect, useMemo, useRef, useState } from "react";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

const currency = new Intl.NumberFormat("es-EC", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

const badgeClase = (tipo) =>
  tipo?.toString().toLowerCase().startsWith("ser")
    ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
    : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";

const ProductosView = () => {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalImagen, setModalImagen] = useState({ abierta: false, url: "" });

  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    tipo: "",
    precio: "",
    duracion: "",
    id_categoria: "",
    imagen: null,
    video: null,
  });
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewVideo, setPreviewVideo] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const [search, setSearch] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [sort, setSort] = useState({ key: "nombre", dir: "asc" });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const dropRef = useRef(null);
  const dropVideoRef = useRef(null);

  const navigate = useNavigate();

  const fetchData = async () => {
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
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo cargar la información",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:"))
        URL.revokeObjectURL(previewUrl);
      if (previewVideo && previewVideo.startsWith("blob:"))
        URL.revokeObjectURL(previewVideo);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------- helpers -------
  const catMap = useMemo(
    () =>
      Object.fromEntries(
        (categorias || []).map((c) => [String(c.id), c.nombre])
      ),
    [categorias]
  );

  const normalizaTipo = (t) => {
    const s = String(t || "")
      .toLowerCase()
      .trim();
    if (!s) return "";
    if (s.startsWith("ser")) return "servicio";
    return "producto";
  };

  const handleSort = (key) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  };

  // ------- filtros + sort + paginación -------
  const listaProcesada = useMemo(() => {
    const q = search.trim().toLowerCase();
    let data = [...productos];

    if (q) {
      data = data.filter(
        (p) =>
          p?.nombre?.toLowerCase().includes(q) ||
          p?.descripcion?.toLowerCase().includes(q)
      );
    }

    if (filtroCategoria) {
      data = data.filter(
        (p) => String(p.id_categoria) === String(filtroCategoria)
      );
    }

    if (filtroTipo) {
      data = data.filter((p) => normalizaTipo(p.tipo) === filtroTipo);
    }

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
    Math.ceil(listaProcesada.length / itemsPerPage)
  );
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return listaProcesada.slice(start, start + itemsPerPage);
  }, [listaProcesada, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filtroCategoria, filtroTipo, itemsPerPage]);

  // ------- CRUD -------
  const handleSubmit = async (e) => {
    e.preventDefault();
    const idc = parseInt(localStorage.getItem("id_configuracion"));
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v !== null && v !== "") data.append(k, v);
    });
    if (editingId) data.append("id_producto", editingId);
    else data.append("id_configuracion", idc);

    try {
      const url = editingId
        ? "/productos/actualizarProducto"
        : "/productos/agregarProducto";

      await chatApi.post(url, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      Swal.fire({
        icon: "success",
        title: `Producto ${editingId ? "actualizado" : "agregado"}`,
        text: "La operación fue exitosa",
      });

      setModalOpen(false);
      setForm({
        nombre: "",
        descripcion: "",
        tipo: "",
        precio: "",
        duracion: "",
        id_categoria: "",
        imagen: null,
        video: null,
      });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setPreviewVideo(null);
      setEditingId(null);
      fetchData();
    } catch {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo guardar el producto",
      });
    }
  };

  const openModal = (p = null) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (p) {
      setForm({
        nombre: p.nombre || "",
        descripcion: p.descripcion || "",
        tipo: normalizaTipo(p.tipo),
        precio: p.precio ?? "",
        duracion: p.duracion ?? "",
        id_categoria: p.id_categoria ?? "",
        imagen: null, // se sube solo si cambia
        video: null,
      });
      setEditingId(p.id);
      // si tiene imagen actual, la mostramos aparte
      setPreviewUrl(p.imagen_url || null);
      setPreviewVideo(p.video_url || null);
    } else {
      setForm({
        nombre: "",
        descripcion: "",
        tipo: "",
        precio: "",
        duracion: "",
        id_categoria: "",
        imagen: null,
        video: null,
      });
      setEditingId(null);
      setPreviewUrl(null);
      setPreviewVideo(null);
    }
    setModalOpen(true);
  };

  const handleDelete = async (p) => {
    const result = await Swal.fire({
      title: "¿Eliminar producto?",
      text: p.nombre,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        await chatApi.delete("/productos/eliminarProducto", {
          data: { id_producto: p.id },
        });
        Swal.fire({
          icon: "success",
          title: "Producto eliminado",
          text: p.nombre,
          timer: 1500,
          showConfirmButton: false,
        });
        fetchData();
      } catch {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudo eliminar el producto",
        });
      }
    }
  };

  // ------- dropzone imagen -------
  const onFilePicked = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      return Swal.fire({
        icon: "error",
        title: "Archivo no válido",
        text: "Debe ser una imagen.",
      });
    }
    setForm((prev) => ({ ...prev, imagen: file }));
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    onFilePicked(file);
    dropRef.current?.classList.remove("ring-indigo-300", "bg-indigo-50/40");
  };

  const onDragOver = (e) => {
    e.preventDefault();
    dropRef.current?.classList.add("ring-indigo-300", "bg-indigo-50/40");
  };
  const onDragLeave = () => {
    dropRef.current?.classList.remove("ring-indigo-300", "bg-indigo-50/40");
  };

  // ------- dropzone video (nuevo) -------
  const MAX_VIDEO_MB = 50;

  const onVideoPicked = (file) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      return Swal.fire({
        icon: "error",
        title: "Archivo no válido",
        text: "Debe ser un video.",
      });
    }
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_VIDEO_MB) {
      return Swal.fire({
        icon: "error",
        title: "Video demasiado grande",
        text: `El tamaño máximo permitido es ${MAX_VIDEO_MB} MB.`,
      });
    }
    setForm((prev) => ({ ...prev, video: file }));
    if (previewVideo && previewVideo.startsWith("blob:"))
      URL.revokeObjectURL(previewVideo);
    const url = URL.createObjectURL(file);
    setPreviewVideo(url);
  };

  const onVideoDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    onVideoPicked(file);
    dropVideoRef.current?.classList.remove(
      "ring-indigo-300",
      "bg-indigo-50/40"
    );
  };

  const onVideoDragOver = (e) => {
    e.preventDefault();
    dropVideoRef.current?.classList.add("ring-indigo-300", "bg-indigo-50/40");
  };
  const onVideoDragLeave = () => {
    dropVideoRef.current?.classList.remove(
      "ring-indigo-300",
      "bg-indigo-50/40"
    );
  };

  // ------- UI -------
  const SortHeader = ({ k, children, align = "left" }) => (
    <th
      onClick={() => handleSort(k)}
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
      <div className="text-xs uppercase tracking-wide text-white/80">
        {label}
      </div>
      <div className="text-lg font-semibold text-white">{value}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 pt-24 px-3 md:px-6">
      {/* Card principal */}
      <div className="mx-auto w-[98%] xl:w-[97%] 2xl:w-[96%] m-3 md:m-6 bg-white rounded-2xl shadow-xl ring-1 ring-slate-200/70 flex flex-col min-h-[82vh] overflow-hidden">
        {/* Header */}
        <header className="relative isolate overflow-hidden">
          <div className="bg-[#171931] p-6 md:p-7 flex flex-col gap-5 rounded-t-2xl">
            <div className="flex items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                  Productos
                </h1>
                <p className="text-white/80 text-sm">
                  Administra tu catálogo con una experiencia más fluida y
                  elegante.
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

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <HeaderStat label="Total productos" value={productos.length} />
              <HeaderStat label="Categorías" value={categorias.length} />
              <HeaderStat label="En esta vista" value={listaProcesada.length} />
              <HeaderStat
                label="Página"
                value={`${currentPage}/${totalPages}`}
              />
            </div>
          </div>
        </header>

        {/* Controles */}
        <div className="p-6 border-b border-slate-100 bg-white">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            <div className="relative w-full lg:w-1/2">
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

            <div className="flex gap-3 w-full lg:w-auto">
              <select
                className="w-full lg:w-56 border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none"
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
              >
                <option value="">Todas las categorías</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>

              <select
                className="w-full lg:w-48 border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none"
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
              >
                <option value="">Todos los tipos</option>
                <option value="producto">Producto</option>
                <option value="servicio">Servicio</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabla / contenido */}
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
                  Ajusta los filtros o agrega tu primer producto.
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
                Agregar producto
              </button>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-auto">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr className="text-slate-600">
                      <SortHeader k="id" align="left">
                        ID
                      </SortHeader>
                      <SortHeader k="nombre" align="left">
                        Producto
                      </SortHeader>
                      <SortHeader k="precio" align="right">
                        Precio
                      </SortHeader>
                      <th className="p-3 text-left font-semibold">Tipo</th>
                      <th className="p-3 text-left font-semibold">Categoría</th>
                      <th className="p-3 text-center font-semibold">Imagen</th>
                      <th className="p-3 text-center font-semibold">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginated.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60">
                        <td className="p-3 text-slate-500">{p.id}</td>

                        {/* Producto + nombre */}
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center ring-1 ring-slate-200">
                              {p.imagen_url ? (
                                <img
                                  src={p.imagen_url}
                                  alt=""
                                  className="h-10 w-10 object-cover"
                                  crossOrigin="anonymous"
                                />
                              ) : (
                                <svg
                                  className="w-5 h-5 text-slate-400"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6zm3 10h10l-3.5-4.5-2.5 3L9 12l-2 4z" />
                                </svg>
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-slate-800">
                                {p.nombre}
                              </div>
                              {p.descripcion && (
                                <div className="text-slate-500 line-clamp-1 max-w-[420px]">
                                  {p.descripcion}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="p-3 text-right tabular-nums font-semibold text-slate-800">
                          {currency.format(Number(p.precio || 0))}
                        </td>

                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${badgeClase(
                              p.tipo
                            )}`}
                          >
                            {normalizaTipo(p.tipo) === "servicio"
                              ? "Servicio"
                              : "Producto"}
                          </span>
                        </td>

                        <td className="p-3 text-slate-700">
                          {catMap[String(p.id_categoria)] || "—"}
                        </td>

                        <td className="p-3 text-center">
                          {p.imagen_url ? (
                            <img
                              src={p.imagen_url}
                              alt=""
                              className="h-12 w-12 object-cover rounded-md cursor-zoom-in ring-1 ring-slate-200 hover:opacity-90 mx-auto"
                              onClick={() =>
                                setModalImagen({
                                  abierta: true,
                                  url: p.imagen_url,
                                })
                              }
                            />
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        <td className="p-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openModal(p)}
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
                              onClick={() => handleDelete(p)}
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
              <div className="border-t border-slate-100 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
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

      {/* FAB en mobile */}
      <button
        onClick={() => openModal()}
        className="fixed bottom-5 right-5 md:hidden inline-flex items-center justify-center h-12 w-12 rounded-full shadow-lg bg-indigo-600 text-white hover:bg-indigo-700"
        aria-label="Agregar producto"
      >
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11 11V5a1 1 0 1 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6z" />
        </svg>
      </button>

      {/* MODAL agregar/editar */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onKeyDown={(e) => e.key === "Escape" && setModalOpen(false)}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-3 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold">
                {editingId ? "Editar producto" : "Agregar producto"}
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
              className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nombre
                  </label>
                  <input
                    required
                    placeholder="Ej. Plan Premium"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none"
                    value={form.nombre}
                    onChange={(e) =>
                      setForm({ ...form, nombre: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    placeholder="Detalle del producto o servicio"
                    rows={4}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none resize-y"
                    value={form.descripcion}
                    onChange={(e) =>
                      setForm({ ...form, descripcion: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Tipo
                    </label>
                    <select
                      required
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none"
                      value={form.tipo}
                      onChange={(e) =>
                        setForm({ ...form, tipo: e.target.value })
                      }
                    >
                      <option value="">Seleccione tipo</option>
                      <option value="producto">Producto</option>
                      <option value="servicio">Servicio</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Precio
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 select-none">
                        $
                      </span>
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full pl-7 border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none"
                        value={form.precio}
                        onChange={(e) =>
                          setForm({ ...form, precio: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Render condicional */}
                {form.tipo === "servicio" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Duración
                    </label>
                    <select
                      required
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none"
                      value={form.duracion}
                      onChange={(e) =>
                        setForm({ ...form, duracion: e.target.value })
                      }
                    >
                      <option value="0">Seleccione duración en horas</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Categoría
                  </label>
                  <select
                    required
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none"
                    value={form.id_categoria}
                    onChange={(e) =>
                      setForm({ ...form, id_categoria: e.target.value })
                    }
                  >
                    <option value="">Seleccione categoría</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dropzone / preview */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                  Imagen
                </label>

                <div
                  ref={dropRef}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center transition ring-0"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-slate-500"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M19 15v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-4h2v4h10v-4h2zM12 3l5 5h-3v6h-4V8H7l5-5z" />
                      </svg>
                    </div>
                    <p className="text-sm text-slate-600">
                      Arrastra una imagen aquí o{" "}
                      <label className="text-indigo-600 font-semibold cursor-pointer hover:underline">
                        selecciona un archivo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => onFilePicked(e.target.files?.[0])}
                        />
                      </label>
                    </p>
                    <p className="text-xs text-slate-400">
                      PNG, JPG, WEBP (máx. ~5MB)
                    </p>
                  </div>
                </div>

                {previewUrl && (
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Vista previa"
                      className="w-full max-h-48 object-cover rounded-lg ring-1 ring-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (previewUrl?.startsWith("blob:"))
                          URL.revokeObjectURL(previewUrl);
                        setPreviewUrl(null);
                        setForm((prev) => ({ ...prev, imagen: null }));
                      }}
                      className="absolute top-2 right-2 bg-white/90 hover:bg-white text-slate-700 border border-slate-200 rounded-md px-2 py-1 text-xs"
                    >
                      Quitar
                    </button>
                  </div>
                )}

                {!previewUrl && editingId && (
                  <div className="text-xs text-slate-500">
                    * Si no seleccionas una imagen, se conserva la actual.
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                  Video (opcional)
                </label>

                <div
                  ref={dropVideoRef}
                  className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center transition ring-0"
                  onDrop={onVideoDrop}
                  onDragOver={onVideoDragOver}
                  onDragLeave={onVideoDragLeave}
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-slate-500"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    <p className="text-sm text-slate-600">
                      Arrastra un video aquí o{" "}
                      <label className="text-indigo-600 font-semibold cursor-pointer hover:underline">
                        selecciona un archivo
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => onVideoPicked(e.target.files?.[0])}
                        />
                      </label>
                    </p>
                    <p className="text-xs text-slate-400">
                      MP4, WEBM, etc. (máx. ~50MB)
                    </p>
                  </div>
                </div>

                {previewVideo && (
                  <div className="relative">
                    <video
                      controls
                      className="w-full max-h-48 rounded-lg ring-1 ring-slate-200"
                      src={previewVideo}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        URL.revokeObjectURL(previewVideo);
                        setPreviewVideo(null);
                        setForm((prev) => ({ ...prev, video: null }));
                      }}
                      className="absolute top-2 right-2 bg-white/90 hover:bg-white text-slate-700 border border-slate-200 rounded-md px-2 py-1 text-xs"
                    >
                      Quitar
                    </button>
                  </div>
                )}
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

      {/* MODAL visor de imagen */}
      {modalImagen.abierta && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setModalImagen({ abierta: false, url: "" })}
          onKeyDown={(e) =>
            e.key === "Escape" && setModalImagen({ abierta: false, url: "" })
          }
        >
          <img
            src={modalImagen.url}
            alt="Vista previa"
            className="max-h-[90vh] max-w-[90vw] rounded-xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};

export default ProductosView;
