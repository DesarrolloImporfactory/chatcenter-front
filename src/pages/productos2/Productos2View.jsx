// src/pages/productos2/Productos2View.jsx
// Catálogo de productos con el wizard del bot integrado. Es la vista clásica
// (misma tabla, mismos botones y modales) más una columna "Mensaje fijo" que
// dice si el producto ya tiene configurado su primer mensaje y respuestas
// rápidas. Un producto sin configurar sigue el flujo actual con IA; uno
// configurado sale con el paquete fijo.
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";
import Header from "../Header/pageHeader";
import { useDropi } from "../../context/DropiContext";
import ImportarProductosDropi from "../productos/modales/ImportarProductosDropi";
import CargaMasivaModal from "../productos/modales/CargaMasivaModal";
import ProductoModal from "../productos/modales/ProductoModal";
import ImportarDesdeEnlaceModal from "../productos/modales/ImportarDesdeEnlaceModal";
import SyncDropiSwitches from "../productos/SyncDropiSwitches";
import WizardProductoModal from "./wizard/WizardProductoModal";

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

const esPrivado = (p) =>
  p.es_privado === 1 ||
  p.es_privado === true ||
  p.is_private === 1 ||
  p.is_private === true;

const fechaCorta = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
};

const haceCuanto = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  const dias = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  if (dias < 30) return `hace ${dias} días`;
  if (dias < 365) return `hace ${Math.floor(dias / 30)} mes${dias >= 60 ? "es" : ""}`;
  return fechaCorta(v);
};

const estadoBot = (w) => {
  if (!w) return "sin";
  if (w.wizard_completado && w.activo) return "ok";
  if (w.wizard_completado && !w.activo) return "pausado";
  return "borrador";
};

/* ─────────────────────────────────────────────────────────────
   Main
───────────────────────────────────────────────────────────── */
const Productos2View = () => {
  const navigate = useNavigate();
  const { isDropiLinked } = useDropi();

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [wizards, setWizards] = useState({}); // id_producto -> estado wizard
  const [loading, setLoading] = useState(true);
  const [iaDisponible, setIaDisponible] = useState(false);
  const [nombreNegocio, setNombreNegocio] = useState("Tu negocio");

  /* Modal producto (el clásico) */
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  /* Wizard del bot */
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardProducto, setWizardProducto] = useState(null);

  /* Importar desde enlace */
  const [importOpen, setImportOpen] = useState(false);
  const [borradorImportado, setBorradorImportado] = useState(null);

  /* Modal imagen zoom */
  const [modalImagen, setModalImagen] = useState({ abierta: false, url: "" });

  /* Carga masiva */
  const [isOpenMasivo, setIsOpenMasivo] = useState(false);

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
  const [filtroBot, setFiltroBot] = useState("");
  const [sort, setSort] = useState({ key: "nombre", dir: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  /* ── Fetch ── */
  /* silencioso: refresca los datos sin mostrar el esqueleto (las filas se
     quedan en pantalla y se actualizan). Se usa al cerrar el modal con cambios. */
  const fetchData = async ({ silencioso = false } = {}) => {
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
      if (!silencioso) setLoading(true);
      const [prodRes, catRes, wizRes] = await Promise.all([
        chatApi.post("/productos/listarProductos", {
          id_configuracion: parseInt(idc),
        }),
        chatApi.post("/categorias/listarCategorias", {
          id_configuracion: parseInt(idc),
        }),
        chatApi.post(
          "/producto-wizard/listar",
          { id_configuracion: parseInt(idc) },
          { silentError: true },
        ),
      ]);
      setProductos(prodRes.data.data || []);
      setCategorias(catRes.data.data || []);
      const mapa = {};
      for (const p of wizRes?.data?.data || []) {
        if (p.wizard) mapa[p.id] = p.wizard;
      }
      setWizards(mapa);
    } catch {
      Swal.fire({ icon: "error", title: "Error al cargar productos" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const idc = parseInt(localStorage.getItem("id_configuracion"));
    chatApi
      .post(
        "openai_assistants/info_asistentes",
        { id_configuracion: idc },
        { silentError: true },
      )
      .then(({ data }) => {
        setIaDisponible(Boolean(data?.data?.api_key_openai));
        const n = data?.data?.nombre_bot || data?.data?.ventas?.nombre_bot;
        if (n) setNombreNegocio(String(n));
      })
      .catch(() => setIaDisponible(false));
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
        : { key, dir: key === "fecha_creacion" ? "desc" : "asc" },
    );

  /* ── Lista filtrada y ordenada ── */
  const listaProcesada = useMemo(() => {
    const q = search.trim().toLowerCase();
    let data = [...productos];
    if (q)
      data = data.filter((p) => {
        const dropiId =
          p.external_source === "DROPI" && p.external_id != null
            ? String(p.external_id).toLowerCase()
            : "";
        return (
          (p?.nombre || "").toLowerCase().includes(q) ||
          (p?.descripcion || "").toLowerCase().includes(q) ||
          (dropiId && dropiId.includes(q))
        );
      });
    if (filtroCategoria)
      data = data.filter(
        (p) => String(p.id_categoria) === String(filtroCategoria),
      );
    if (filtroTipo)
      data = data.filter((p) => normalizaTipo(p.tipo) === filtroTipo);
    if (filtroBot) {
      data = data.filter((p) => {
        const e = estadoBot(wizards[p.id]);
        if (filtroBot === "ok") return e === "ok";
        if (filtroBot === "sin") return e === "sin" || e === "borrador";
        return true;
      });
    }

    data.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      let va;
      let vb;
      if (sort.key === "precio") {
        va = Number(a.precio || 0);
        vb = Number(b.precio || 0);
      } else if (sort.key === "fecha_creacion") {
        va = new Date(a.fecha_creacion || 0).getTime();
        vb = new Date(b.fecha_creacion || 0).getTime();
      } else if (sort.key === "bot") {
        const orden = { ok: 0, pausado: 1, borrador: 2, sin: 3 };
        va = orden[estadoBot(wizards[a.id])];
        vb = orden[estadoBot(wizards[b.id])];
      } else {
        va = (a[sort.key] ?? "").toString().toLowerCase();
        vb = (b[sort.key] ?? "").toString().toLowerCase();
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return data;
  }, [productos, wizards, search, filtroCategoria, filtroTipo, filtroBot, sort]);

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
  }, [search, filtroCategoria, filtroTipo, filtroBot]);

  const totalConfigurados = useMemo(
    () => productos.filter((p) => estadoBot(wizards[p.id]) === "ok").length,
    [productos, wizards],
  );

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

  /* ── Wizard ── */
  const abrirWizard = (p) => {
    setWizardProducto(p);
    setWizardOpen(true);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropiModalOpen]);

  const importarDropi = async (dropiId) => {
    const idc = Number(localStorage.getItem("id_configuracion"));
    const { isConfirmed } = await Swal.fire({
      title: `¿Importar producto con ID #${dropiId}?`,
      text: "Al terminar se abre la configuración del bot para ese producto.",
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
      await fetchData();
      // El wizard se abre solo con el producto recién importado.
      const nuevo = data?.data;
      if (nuevo?.id) abrirWizard({ id: nuevo.id, nombre: nuevo.nombre });
    } catch {
      Swal.fire({ icon: "error", title: "Error al importar" });
    }
  };

  /* ── Sort header component ── */
  const SortTh = ({ k, children, center }) => (
    <th
      onClick={() => handleSort(k)}
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500
        cursor-pointer select-none hover:text-slate-700 transition-colors whitespace-nowrap
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

  /* ── Header actions (los mismos de la vista clásica) ── */
  const headerActions = (
    <div className="flex flex-wrap md:flex-nowrap gap-2 shrink-0">
      {isDropiLinked === true && (
        <button
          onClick={() => {
            setDropiKeywords("");
            setDropiStart(0);
            setDropiProducts([]);
            setDropiModalOpen(true);
          }}
          className="inline-flex items-center gap-2 bg-[#eb6e1b] hover:bg-[#d3661e]
            text-white px-3 py-2 rounded-lg font-semibold text-sm transition-colors whitespace-nowrap"
        >
          <i className="bx bx-import text-base" />
          Importar de Dropi
        </button>
      )}
      <button
        onClick={() => setImportOpen(true)}
        className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400
          text-white px-3 py-2 rounded-lg font-semibold text-sm transition-colors whitespace-nowrap"
      >
        <i className="bx bx-link-external text-base" />
        Desde enlace
      </button>
      <button
        onClick={() => navigate("/catalogos")}
        className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20
          border border-white/20 text-white px-3 py-2 rounded-lg font-semibold text-sm transition-colors whitespace-nowrap"
      >
        <i className="bx bx-layout text-base" />
        Catálogos
      </button>
      <button
        onClick={() => setIsOpenMasivo(true)}
        className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400
          text-white px-3 py-2 rounded-lg font-semibold text-sm transition-colors whitespace-nowrap"
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
          px-3 py-2 rounded-lg font-semibold text-sm transition-colors whitespace-nowrap"
      >
        <i className="bx bx-plus text-base" />
        Agregar
      </button>
    </div>
  );

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
          subtitle="Catálogo y configuración del bot por producto."
          actions={headerActions}
        />

        {/* Filters */}
        <div className="px-5 py-3.5 border-b border-slate-100">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <i className="bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
              <input
                type="text"
                placeholder="Buscar por nombre, descripción o ID Dropi"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg
                  focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none transition"
              />
            </div>
            <div className="flex flex-wrap gap-2">
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
              <select
                value={filtroBot}
                onChange={(e) => setFiltroBot(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm
                  focus:ring-2 focus:ring-indigo-200 outline-none"
                title="Estado del mensaje fijo del bot"
              >
                <option value="">Bot: todos</option>
                <option value="ok">Bot: con mensaje fijo</option>
                <option value="sin">Bot: sin configurar</option>
              </select>
              <select
                value={`${sort.key}:${sort.dir}`}
                onChange={(e) => {
                  const [key, dir] = e.target.value.split(":");
                  setSort({ key, dir });
                }}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm
                  focus:ring-2 focus:ring-indigo-200 outline-none"
                title="Ordenar"
              >
                <option value="nombre:asc">Nombre A–Z</option>
                <option value="nombre:desc">Nombre Z–A</option>
                <option value="fecha_creacion:desc">Más recientes</option>
                <option value="fecha_creacion:asc">Más antiguos</option>
                <option value="precio:asc">Precio: menor a mayor</option>
                <option value="precio:desc">Precio: mayor a menor</option>
                <option value="bot:asc">Mensaje fijo activo primero</option>
              </select>
            </div>
            <div className="ml-auto text-xs text-slate-500 hidden sm:flex items-center gap-3 whitespace-nowrap">
              <span>
                <strong className="text-slate-700">{productos.length}</strong>{" "}
                producto{productos.length !== 1 ? "s" : ""}
              </span>
              <span className="text-slate-300">·</span>
              <span>
                <strong className="text-emerald-600">{totalConfigurados}</strong>{" "}
                con mensaje fijo
              </span>
              {listaProcesada.length !== productos.length && (
                <>
                  <span className="text-slate-300">·</span>
                  <span>{listaProcesada.length} en el filtro</span>
                </>
              )}
            </div>
          </div>
          {isDropiLinked === true && (
            <div className="mt-3">
              <SyncDropiSwitches />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
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
                  {search || filtroCategoria || filtroTipo || filtroBot
                    ? "Ajusta los filtros para ver más resultados."
                    : "Crea tu primer producto para empezar."}
                </p>
              </div>
              {!search && !filtroCategoria && !filtroTipo && !filtroBot && (
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

          {!loading && listaProcesada.length > 0 && (
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-slate-200 bg-slate-50">
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
                    <SortTh k="fecha_creacion">Creado</SortTh>
                    <SortTh k="bot">Mensaje fijo</SortTh>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((p, idx) => {
                    const priv = esPrivado(p);
                    const w = wizards[p.id];
                    const estado = estadoBot(w);
                    return (
                      <tr
                        key={p.id}
                        className={`group border-b border-slate-100 transition-colors hover:bg-indigo-50/40 hover:shadow-[inset_3px_0_0_#4f46e5]
                          ${idx % 2 !== 0 ? "bg-slate-50/30" : ""}`}
                      >
                        <td className="px-4 py-3.5 text-xs text-slate-400 font-mono w-12">
                          {p.id}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 flex items-center
                              justify-center flex-shrink-0 ring-1 ring-slate-200 cursor-zoom-in transition-transform group-hover:scale-105 group-hover:ring-indigo-300"
                              onClick={() =>
                                p.imagen_url &&
                                setModalImagen({ abierta: true, url: p.imagen_url })
                              }
                            >
                              {p.imagen_url ? (
                                <img
                                  src={p.imagen_url}
                                  alt=""
                                  className="w-12 h-12 object-cover"
                                />
                              ) : (
                                <i className="bx bx-package text-slate-300 text-xl" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-800 text-sm truncate max-w-[240px]">
                                  {p.nombre}
                                </span>
                                {Number(p.es_variable) === 1 && (
                                  <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                                    <i className="bx bx-palette text-[11px]" />
                                    {p.variaciones?.length || ""} variedades
                                  </span>
                                )}
                              </div>

                              {Number(p.es_variable) === 1 &&
                              p.variaciones?.length ? (
                                <div className="flex flex-wrap items-center gap-1 mt-1 max-w-[280px]">
                                  {p.variaciones.slice(0, 4).map((v) => (
                                    <span
                                      key={v.id}
                                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600"
                                      title={`${v.atributo}: ${v.valor}`}
                                    >
                                      {v.valor}
                                    </span>
                                  ))}
                                  {p.variaciones.length > 4 && (
                                    <span className="text-[10px] text-slate-400">
                                      +{p.variaciones.length - 4}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                p.descripcion && (
                                  <div className="text-xs text-slate-400 line-clamp-1 max-w-[280px] mt-0.5">
                                    {p.descripcion}
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-center tabular-nums">
                          <div className="font-bold text-slate-800">
                            {currency.format(Number(p.precio || 0))}
                          </div>
                          {p.precio_proveedor != null &&
                            Number(p.precio_proveedor) > 0 && (
                              <div className="text-[10.5px] text-slate-400 font-medium mt-0.5 whitespace-nowrap">
                                Costo {currency.format(Number(p.precio_proveedor))}
                                {Number(p.precio) > Number(p.precio_proveedor) ? (
                                  <span
                                    className="ml-1 inline-flex rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 px-1.5 py-px text-[10px] font-semibold"
                                    title="Margen sobre el costo"
                                  >
                                    +
                                    {Math.round(
                                      ((Number(p.precio) - Number(p.precio_proveedor)) /
                                        Number(p.precio_proveedor)) *
                                        100,
                                    )}
                                    %
                                  </span>
                                ) : null}
                              </div>
                            )}
                        </td>

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

                        <td className="px-4 py-3.5 text-sm text-slate-600">
                          {catMap[String(p.id_categoria)] || "—"}
                        </td>

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

                        <td className="px-4 py-3.5">
                          <div className="flex flex-col gap-1.5">
                            {p.stock != null && (
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full w-fit ${
                                  Number(p.stock) <= 0
                                    ? "bg-rose-50 text-rose-600 ring-1 ring-rose-200"
                                    : Number(p.stock) <= 5
                                      ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                                      : "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200"
                                }`}
                                title={
                                  Number(p.stock) <= 0
                                    ? "Sin stock: el bot no debería ofrecerlo"
                                    : Number(p.stock) <= 5
                                      ? "Quedan pocas unidades"
                                      : "En stock"
                                }
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
                                  ID Dropi #{p.external_id}
                                  <button
                                    type="button"
                                    title="Copiar ID"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(
                                        String(p.external_id),
                                      );
                                      Swal.fire({
                                        toast: true,
                                        position: "top-end",
                                        icon: "success",
                                        title: `ID ${p.external_id} copiado`,
                                        showConfirmButton: false,
                                        timer: 1200,
                                        timerProgressBar: true,
                                      });
                                    }}
                                    className="ml-0.5 inline-flex items-center justify-center h-4 w-4 rounded hover:bg-orange-200/60 transition-colors"
                                  >
                                    <i className="bx bx-copy text-[10px]" />
                                  </button>
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

                        <td
                          className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap"
                          title={fechaCorta(p.fecha_creacion)}
                        >
                          {haceCuanto(p.fecha_creacion)}
                        </td>

                        {/* Estado del bot para este producto */}
                        <td className="px-4 py-3.5">
                          {w && estado !== "sin" && (
                            <div
                              className="flex items-center gap-1 mb-1.5"
                              title="Media · Mensaje · Respuestas rápidas"
                            >
                              {[
                                w.n_imagenes + w.n_videos > 0,
                                w.tiene_mensaje,
                                w.n_respuestas_rapidas > 0,
                              ].map((ok, k) => (
                                <span
                                  key={k}
                                  className={`h-1.5 w-6 rounded-full ${
                                    ok
                                      ? estado === "ok"
                                        ? "bg-emerald-500"
                                        : "bg-slate-400"
                                      : "bg-slate-200"
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                          {estado === "ok" && (
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 bg-emerald-50 text-emerald-700 ring-emerald-200 w-fit">
                                <i className="bx bx-check-circle" />
                                Activo
                              </span>
                              <span className="text-[10.5px] text-slate-400 whitespace-nowrap">
                                {w.n_imagenes} img · {w.n_videos} video ·{" "}
                                {w.n_respuestas_rapidas} respuestas
                              </span>
                            </div>
                          )}
                          {estado === "pausado" && (
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 bg-slate-100 text-slate-600 ring-slate-200 w-fit">
                                <i className="bx bx-pause-circle" />
                                Pausado
                              </span>
                              <span className="text-[10.5px] text-slate-400">
                                Usa el flujo con IA
                              </span>
                            </div>
                          )}
                          {estado === "borrador" && (
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 bg-amber-50 text-amber-700 ring-amber-200 w-fit">
                                <i className="bx bx-edit" />
                                Borrador
                              </span>
                              <span className="text-[10.5px] text-slate-400">
                                Sin activar
                              </span>
                            </div>
                          )}
                          {estado === "sin" && (
                            <span className="text-xs text-slate-400">
                              Sin configurar
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                            <button
                              onClick={() => abrirWizard(p)}
                              title="Editar el producto y configurar el bot"
                              className={`inline-flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-lg font-semibold transition-colors ${
                                estado === "sin"
                                  ? "bg-[#171931] text-white hover:bg-[#242a52]"
                                  : "border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700"
                              }`}
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

      {/* ══ Importar desde un anuncio publicado ══ */}
      <ImportarDesdeEnlaceModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImportado={(borrador, meta) => {
          setEditingProduct(null);
          setBorradorImportado({ ...borrador, aviso: meta?.aviso || null });
          setModalOpen(true);
        }}
      />

      {/* ══ ProductoModal (el clásico) ══ */}
      <ProductoModal
        open={modalOpen}
        borradorInicial={borradorImportado}
        onClose={() => {
          setModalOpen(false);
          setEditingProduct(null);
          setBorradorImportado(null);
        }}
        editingProduct={editingProduct}
        categorias={categorias}
        onCategoriasChange={setCategorias}
        productosExistentes={productos}
        onSaved={fetchData}
      />

      {/* ══ Carga masiva ══ */}
      <CargaMasivaModal
        open={isOpenMasivo}
        onClose={() => setIsOpenMasivo(false)}
        onSuccess={fetchData}
      />

      {/* ══ Wizard del bot ══ */}
      <WizardProductoModal
        open={wizardOpen}
        idProducto={wizardProducto?.id}
        iaDisponible={iaDisponible}
        nombreNegocio={nombreNegocio}
        categorias={categorias}
        onCategoriasChange={setCategorias}
        productosExistentes={productos}
        onClose={(r) => {
          setWizardOpen(false);
          setWizardProducto(null);
          // Solo se recarga si el modal guardó algo; y sin esqueleto, para que
          // el listado no "desaparezca".
          if (r?.cambios) fetchData({ silencioso: true });
        }}
        onSaved={() => {}}
      />

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
    </div>
  );
};

export default Productos2View;
