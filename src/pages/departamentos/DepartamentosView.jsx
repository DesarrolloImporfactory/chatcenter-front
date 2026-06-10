import React, { useEffect, useMemo, useState } from "react";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";
import { jwtDecode } from "jwt-decode";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Select from "react-select";
import "./departamentos.css";

const SortHeader = ({ k, sort, onSort, children, align = "left" }) => (
  <th
    onClick={() => onSort(k)}
    className={`p-3 select-none cursor-pointer font-semibold ${
      align === "right" ? "text-right" : "text-left"
    }`}
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

const HeaderStat = ({ label, value, icon, accent = "text-white" }) => (
  <div className="group relative overflow-hidden rounded-xl bg-white/[0.07] ring-1 ring-white/10 backdrop-blur-xl px-3.5 py-2.5 transition-all duration-300 hover:bg-white/[0.11] hover:ring-white/20">
    <div
      aria-hidden
      className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
    />
    <div className="relative flex items-center justify-between">
      <span
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10 ${accent}`}
      >
        <i className={`${icon} text-base`} />
      </span>
      <span className="text-2xl font-extrabold tracking-tight text-white tabular-nums leading-none">
        {value}
      </span>
    </div>
    <div className="relative mt-2 text-[10px] font-medium uppercase tracking-[0.12em] text-white/55">
      {label}
    </div>
  </div>
);

// Switch reutilizable controlado por estado (NO depende de peer-checked)
const Switch = ({ checked, onClick, disabled = false, title }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/40 disabled:opacity-50 disabled:cursor-not-allowed ${
      checked ? "bg-[#1d4ed8]" : "bg-slate-300"
    }`}
  >
    <span
      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-1 ring-black/5 transition-transform duration-200 ${
        checked ? "translate-x-[22px]" : "translate-x-[2px]"
      }`}
    />
  </button>
);

const DepartamentosView = () => {
  const [departamentos, setDepartamentos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    nombre_departamento: "",
    color: "#1d4ed8",
    mensaje_saludo: "",
    id_configuracion: "",
  });
  const [editingId, setEditingId] = useState(null);

  const [search, setSearch] = useState("");
  const [rolFiltro, setRolFiltro] = useState("");
  const [sort, setSort] = useState({ key: "nombre_departamento", dir: "asc" });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [showUpgradeOptions, setShowUpgradeOptions] = useState(false);
  const [limitMessage, setLimitMessage] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const [savingDep, setSavingDep] = useState(false);

  const [usuarios, setUsuarios] = useState([]);
  const [usuariosAsignados, setUsuariosAsignados] = useState([]);
  const [conexiones, setConexiones] = useState([]);
  const [activeTab, setActiveTab] = useState("departamento");

  const reduce = useReducedMotion();

  const getAsignacion = (id) =>
    usuariosAsignados.find((x) => Number(x.id_sub_usuario) === Number(id)) ||
    null;

  const fetchDepartamentos = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return Swal.fire({
        icon: "error",
        title: "Token faltante",
        text: "No se encontró token",
      });
    }
    const decoded = jwtDecode(token);
    const id_usuario = decoded.id_usuario;

    try {
      setLoading(true);
      const res = await chatApi.post(
        "/departamentos_chat_center/listarDepartamentos",
        { id_usuario },
      );
      setDepartamentos(res.data.data || []);
    } catch {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudieron cargar los departamentos",
      });
    } finally {
      setLoading(false);
    }
  };

  const [savingToggle, setSavingToggle] = useState({});

  const toggleAutoasignacion = async (dep) => {
    const token = localStorage.getItem("token");
    const decoded = jwtDecode(token);
    const id_usuario = decoded.id_usuario;

    if (!dep?.id_configuracion) {
      return Swal.fire({
        icon: "warning",
        title: "Sin conexión asignada",
        text: "Este departamento no tiene una conexión asignada para activar la autoasignación.",
      });
    }

    const nextVal = Number(dep.permiso_round_robin) ? 0 : 1;

    // UI optimista
    setSavingToggle((p) => ({ ...p, [dep.id_departamento]: true }));
    setDepartamentos((prev) =>
      prev.map((d) =>
        d.id_departamento === dep.id_departamento
          ? { ...d, permiso_round_robin: nextVal }
          : d,
      ),
    );

    try {
      await chatApi.post(
        "/departamentos_chat_center/toggle_permiso_round_robin",
        {
          id_usuario,
          id_configuracion: dep.id_configuracion,
          permiso_round_robin: nextVal,
        },
      );
    } catch (e) {
      // Revertir si falla
      setDepartamentos((prev) =>
        prev.map((d) =>
          d.id_departamento === dep.id_departamento
            ? {
                ...d,
                permiso_round_robin: Number(dep.permiso_round_robin) ? 1 : 0,
              }
            : d,
        ),
      );

      Swal.fire({
        icon: "error",
        title: "No se pudo actualizar",
        text: e?.response?.data?.message || "Intente nuevamente.",
      });
    } finally {
      setSavingToggle((p) => ({ ...p, [dep.id_departamento]: false }));
    }
  };

  useEffect(() => {
    fetchDepartamentos();
  }, []);

  const handleClose = () => {
    if (savingDep) return;
    setIsClosing(true);
    setTimeout(() => {
      setModalOpen(false);
      setForm({
        nombre_departamento: "",
        color: "#1d4ed8",
        mensaje_saludo: "",
        id_configuracion: "",
      });
      setEditingId(null);
      setShowUpgradeOptions(false);
      setLimitMessage("");
      setIsClosing(false);
    }, 220);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (savingDep) return;

    const token = localStorage.getItem("token");
    if (!token) {
      return Swal.fire({
        icon: "error",
        title: "Token faltante",
        text: "No se encontró token",
      });
    }
    const decoded = jwtDecode(token);
    const id_usuario = decoded.id_usuario;

    const payload = { ...form };
    setSavingDep(true);
    try {
      if (editingId) {
        await chatApi.post(
          "/departamentos_chat_center/actualizarDepartamento",
          {
            id_departamento: editingId,
            ...payload,
            usuarios_asignados: usuariosAsignados,
          },
        );
        Swal.fire({
          icon: "success",
          title: "Departamento actualizado",
          text: "Los datos del departamento fueron actualizados correctamente",
          confirmButtonColor: "#1d4ed8",
          customClass: { popup: "rounded-2xl" },
        });
      } else {
        await chatApi.post("/departamentos_chat_center/agregarDepartamento", {
          id_usuario,
          ...payload,
          usuarios_asignados: usuariosAsignados,
        });
        Swal.fire({
          icon: "success",
          title: "Departamento creado",
          text: "El departamento fue creado correctamente",
          confirmButtonColor: "#1d4ed8",
          customClass: { popup: "rounded-2xl" },
        });
      }
      setModalOpen(false);
      setForm({
        nombre_departamento: "",
        color: "#1d4ed8",
        mensaje_saludo: "",
        id_configuracion: "",
      });
      setEditingId(null);
      fetchDepartamentos();
    } catch (error) {
      const httpStatus = error?.response?.status;

      if (
        httpStatus === 403 &&
        error?.response?.data?.code === "QUOTA_EXCEEDED"
      ) {
        const backendMsg = error?.response?.data?.message;
        setLimitMessage(
          backendMsg || "Has alcanzado el límite de departamentos de tu plan.",
        );
        setShowUpgradeOptions(true);
        return;
      }

      Swal.fire({
        icon: "error",
        title: "Error al guardar",
        text:
          error.response?.data?.message || "No se pudo guardar el departamento",
        confirmButtonColor: "#1d4ed8",
        customClass: { popup: "rounded-2xl" },
      });
    } finally {
      setSavingDep(false);
    }
  };

  const openModal = async (u = null) => {
    if (u) {
      setForm({
        nombre_departamento: u.nombre_departamento || "",
        color: u.color || "#1d4ed8",
        mensaje_saludo: u.mensaje_saludo || "",
        id_configuracion: u.id_configuracion || "",
      });
      setEditingId(u.id_departamento);
    } else {
      setForm({
        nombre_departamento: "",
        color: "#1d4ed8",
        mensaje_saludo: "",
        id_configuracion: "",
      });
      setEditingId(null);
    }

    const token = localStorage.getItem("token");
    const decoded = jwtDecode(token);
    const id_usuario = decoded.id_usuario;

    try {
      const res = await chatApi.post("/usuarios_chat_center/listarUsuarios", {
        id_usuario,
      });
      setUsuarios(res.data.data || []);
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
    }

    try {
      const res = await chatApi.post("/configuraciones/listar_conexiones", {
        id_usuario,
      });
      setConexiones(res.data.data || []);
    } catch (error) {
      console.error("Error al cargar las conexiones:", error);
    }

    setUsuariosAsignados(u?.usuarios_asignados || []);
    setActiveTab("departamento");
    setShowUpgradeOptions(false);
    setLimitMessage("");
    setModalOpen(true);
  };

  const conexionesOptions = (conexiones || []).map((c) => ({
    value: c.id,
    label: c.nombre_configuracion || `Conexión #${c.id}`,
  }));

  const selectedConexion =
    conexionesOptions.find(
      (opt) => String(opt.value) === String(form.id_configuracion),
    ) || null;

  // Tema de react-select alineado al azul de marca
  const selectTheme = (t) => ({
    ...t,
    colors: {
      ...t.colors,
      primary: "#1d4ed8",
      primary25: "#eff6ff",
      primary50: "#dbeafe",
    },
  });
  const selectStyles = {
    control: (base, state) => ({
      ...base,
      borderRadius: 8,
      borderColor: state.isFocused ? "#1d4ed8" : "#cbd5e1",
      boxShadow: state.isFocused ? "0 0 0 2px rgba(29,78,216,0.25)" : "none",
      minHeight: 42,
      "&:hover": { borderColor: "#1d4ed8" },
    }),
    menu: (base) => ({
      ...base,
      borderRadius: 12,
      overflow: "hidden",
      zIndex: 30,
    }),
  };

  const handleDelete = async (u) => {
    const result = await Swal.fire({
      title: "¿Eliminar departamento?",
      text: u.nombre_departamento,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      customClass: { popup: "rounded-2xl" },
    });
    if (result.isConfirmed) {
      try {
        await chatApi.delete(
          "/departamentos_chat_center/eliminarDepartamento",
          { data: { id_departamento: u.id_departamento } },
        );
        Swal.fire({
          icon: "success",
          title: "Departamento eliminado",
          text: u.nombre_departamento,
          timer: 1500,
          showConfirmButton: false,
        });
        fetchDepartamentos();
      } catch {
        Swal.fire({
          icon: "error",
          title: "Error al eliminar",
          text: "No se pudo eliminar el departamento",
          confirmButtonColor: "#1d4ed8",
          customClass: { popup: "rounded-2xl" },
        });
      }
    }
  };

  const handleSort = (key) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  };

  const listaProcesada = useMemo(() => {
    const q = search.trim().toLowerCase();
    let data = [...departamentos];

    if (q) {
      data = data.filter((d) =>
        d?.nombre_departamento?.toLowerCase().includes(q),
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
  }, [departamentos, search, sort]);

  const totalPages = Math.max(
    1,
    Math.ceil(listaProcesada.length / itemsPerPage),
  );
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return listaProcesada.slice(start, start + itemsPerPage);
  }, [listaProcesada, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, rolFiltro]);

  const onUpgradeClick = () => {
    window.location.href = "/planes";
  };
  const onBuyAddonClick = () => {
    window.location.href = "/planes?addon=conexion";
  };

  // Animaciones del modal (self-contained) + reduced-motion
  const overlayV = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  };
  const panelV = reduce
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.2 } },
        exit: { opacity: 0, transition: { duration: 0.15 } },
      }
    : {
        hidden: { opacity: 0, scale: 0.96, y: 12 },
        visible: {
          opacity: 1,
          scale: 1,
          y: 0,
          transition: { type: "spring", stiffness: 280, damping: 24 },
        },
        exit: { opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.18 } },
      };
  const containerVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.28 } },
    exit: { opacity: 0, y: 12, transition: { duration: 0.2 } },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-3 md:px-6">
      <div className="mx-auto w-[98%] xl:w-[97%] 2xl:w-[96%] m-3 md:m-6 bg-white rounded-2xl shadow-xl ring-1 ring-slate-200/70 flex flex-col min-h-[82vh] overflow-hidden">
        {/* Header — mismo estilo que Conexiones */}
        <header className="relative isolate overflow-hidden rounded-t-2xl">
          <div className="absolute inset-0 bg-[#171931]" aria-hidden />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.6]"
            style={{
              backgroundImage:
                "radial-gradient(600px circle at 0% 0%, rgba(79,70,229,0.25), transparent 45%), radial-gradient(500px circle at 100% 120%, rgba(99,102,241,0.18), transparent 40%)",
            }}
          />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />

          <div className="relative px-5 py-4 md:px-7 md:py-5 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70 ring-1 ring-white/15">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  ImporChat · Departamentos
                </span>
                <h1 className="mt-2 text-xl md:text-2xl font-extrabold text-white tracking-tight leading-tight">
                  Tus departamentos,{" "}
                  <span className="bg-gradient-to-r from-indigo-300 to-violet-200 bg-clip-text text-transparent">
                    cada chat en su lugar
                  </span>
                </h1>
                <p className="mt-0.5 text-white/55 text-[13px] leading-snug truncate">
                  Crea departamentos, asigna conexiones y enruta cada chat al
                  equipo correcto.
                </p>
              </div>

              <button
                onClick={() => openModal()}
                className="group shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-white text-[#171931] rounded-xl font-semibold text-sm shadow-lg shadow-black/20 ring-1 ring-white/40 hover:shadow-xl hover:shadow-indigo-900/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              >
                <i className="bx bx-plus text-xl text-[#4f46e5] transition-transform duration-200 group-hover:rotate-90" />
                Nuevo departamento
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              <HeaderStat
                label="Total departamentos"
                value={departamentos.length}
                icon="bx bx-buildings"
                accent="text-indigo-300"
              />
              <HeaderStat
                label="En esta vista"
                value={listaProcesada.length}
                icon="bx bx-show"
                accent="text-emerald-300"
              />
              <HeaderStat
                label="Página"
                value={`${currentPage}/${totalPages}`}
                icon="bx bx-book-open"
                accent="text-amber-300"
              />
              <HeaderStat
                label="Por página"
                value={itemsPerPage}
                icon="bx bx-list-ul"
                accent="text-sky-300"
              />
            </div>
          </div>
        </header>

        {/* Controles */}
        <div className="p-6 border-b border-slate-100 bg-white">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            <div className="relative w-full lg:w-1/2">
              <i className="bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre de departamento…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#1d4ed8]/25 focus:border-[#1d4ed8] outline-none transition-all"
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
              <div className="w-20 h-20 rounded-full bg-[#eff6ff] flex items-center justify-center">
                <i className="bx bx-buildings text-4xl text-[#1d4ed8]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">
                  Sin departamentos
                </h3>
                <p className="text-slate-500">
                  Crea tu primer departamento para empezar.
                </p>
              </div>
              <button
                onClick={() => openModal()}
                className="inline-flex items-center gap-2 bg-[#1d4ed8] text-white hover:bg-[#1e40af] px-4 py-2.5 rounded-lg shadow-sm transition"
              >
                <i className="bx bx-plus text-xl" />
                Agregar departamento
              </button>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-auto">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr className="text-slate-600">
                      <SortHeader
                        k="nombre_departamento"
                        sort={sort}
                        onSort={handleSort}
                      >
                        Nombre Departamento
                      </SortHeader>
                      <SortHeader k="color" sort={sort} onSort={handleSort}>
                        Color
                      </SortHeader>
                      <SortHeader
                        k="mensaje_saludo"
                        sort={sort}
                        onSort={handleSort}
                      >
                        Mensaje Saludo
                      </SortHeader>
                      <th className="p-3 text-center font-semibold">
                        Autoasignación
                      </th>
                      <th className="p-3 text-center font-semibold">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginated.map((d) => {
                      const activo = Number(d.permiso_round_robin) === 1;
                      const saving = !!savingToggle[d.id_departamento];
                      return (
                        <tr
                          key={d.id_departamento}
                          className="hover:bg-slate-50/60"
                        >
                          <td className="p-3 text-slate-800 font-medium">
                            {d.nombre_departamento}
                          </td>
                          <td className="p-3">
                            <div
                              className="w-6 h-6 rounded-full border border-slate-300"
                              style={{ backgroundColor: d.color }}
                              title={d.color}
                            ></div>
                          </td>
                          <td className="p-3 text-slate-700">
                            {d.mensaje_saludo}
                          </td>
                          <td className="p-3">
                            <div className="flex flex-col items-center gap-1">
                              <Switch
                                checked={activo}
                                disabled={saving}
                                onClick={() => toggleAutoasignacion(d)}
                                title={
                                  activo
                                    ? "Autoasignación activa"
                                    : "Autoasignación inactiva"
                                }
                              />
                              <span
                                className={`text-[11px] font-medium ${
                                  activo ? "text-[#1d4ed8]" : "text-slate-400"
                                }`}
                              >
                                {activo ? "Activo" : "Inactivo"}
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => openModal(d)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 hover:bg-[#eff6ff] hover:border-[#1d4ed8]/30 hover:text-[#1d4ed8] text-slate-700 transition-colors"
                                title="Editar"
                              >
                                <i className="bx bx-edit-alt text-base" />
                                Editar
                              </button>
                              <button
                                onClick={() => handleDelete(d)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                                title="Eliminar"
                              >
                                <i className="bx bx-trash text-base" />
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
                      listaProcesada.length,
                    )}
                  </span>{" "}
                  –{" "}
                  <span className="font-semibold text-slate-800">
                    {Math.min(
                      currentPage * itemsPerPage,
                      listaProcesada.length,
                    )}
                  </span>{" "}
                  de{" "}
                  <span className="font-semibold text-slate-800">
                    {listaProcesada.length}
                  </span>
                </div>
                <div className="inline-flex items-center gap-2">
                  <button
                    className="px-3 py-1.5 rounded-md border border-slate-200 disabled:opacity-50 hover:bg-slate-50"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    aria-label="Primera página"
                  >
                    «
                  </button>
                  <button
                    className="px-3 py-1.5 rounded-md border border-slate-200 disabled:opacity-50 hover:bg-slate-50"
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
                    className="px-3 py-1.5 rounded-md border border-slate-200 disabled:opacity-50 hover:bg-slate-50"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    aria-label="Siguiente"
                  >
                    ›
                  </button>
                  <button
                    className="px-3 py-1.5 rounded-md border border-slate-200 disabled:opacity-50 hover:bg-slate-50"
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
        className="fixed bottom-5 right-5 md:hidden inline-flex items-center justify-center h-12 w-12 rounded-full shadow-lg bg-[#1d4ed8] text-white hover:bg-[#1e40af]"
        aria-label="Agregar departamento"
      >
        <i className="bx bx-plus text-2xl" />
      </button>

      {/* Modal */}
      {modalOpen && (
        <motion.div
          variants={overlayV}
          initial="hidden"
          animate={isClosing ? "exit" : "visible"}
          className="fixed inset-0 bg-[#0a1a36]/50 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onMouseDown={(e) => e.target === e.currentTarget && handleClose()}
          onKeyDown={(e) => e.key === "Escape" && handleClose()}
        >
          <motion.div
            variants={panelV}
            initial="hidden"
            animate={isClosing ? "exit" : "visible"}
            className={`bg-white rounded-2xl shadow-2xl w-full overflow-hidden ring-1 ring-black/5 transition-[max-width] duration-300 ${
              showUpgradeOptions ? "max-w-md" : "max-w-3xl"
            }`}
          >
            <AnimatePresence mode="wait">
              {showUpgradeOptions ? (
                /* ====================== VISTA UPGRADE ====================== */
                <motion.div
                  key="upgrade-view"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <div className="relative bg-gradient-to-br from-[#0a1a36] via-[#102a5c] to-[#1e4fd6] px-6 pt-6 pb-7 text-center">
                    <button
                      onClick={handleClose}
                      className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                      aria-label="Cerrar"
                    >
                      <i className="fas fa-times text-sm"></i>
                    </button>

                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/20 backdrop-blur">
                      <i className="bx bx-trending-up text-2xl"></i>
                    </span>
                    <h3 className="mt-3 text-base font-bold tracking-tight text-white">
                      Tu operación está creciendo
                    </h3>
                    <p className="mx-auto mt-1 max-w-xs text-[12px] leading-4 text-white/70">
                      {limitMessage ||
                        "Has alcanzado el límite de departamentos de tu plan."}{" "}
                      Mejora tu plan para tener más capacidad y beneficios.
                    </p>
                  </div>

                  <div className="px-5 py-5 space-y-2.5">
                    {/* Mejorar plan */}
                    <button
                      type="button"
                      onClick={onUpgradeClick}
                      className="group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border-2 border-[#1d4ed8] bg-gradient-to-r from-[#eff6ff] to-white p-3.5 text-left transition-all duration-200 hover:shadow-md hover:shadow-[#1d4ed8]/15"
                    >
                      <span className="absolute right-2.5 top-2.5 inline-flex items-center rounded-full bg-[#1d4ed8] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                        Recomendado
                      </span>
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1d4ed8] text-white shadow-sm">
                        <i className="bx bx-rocket text-xl"></i>
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm font-bold text-[#171931]">
                          Mejorar mi plan
                        </span>
                        <span className="mt-0.5 block text-[12px] leading-4 text-slate-500">
                          Más departamentos y conexiones incluidas en tu plan.
                        </span>
                      </span>
                      <i className="bx bx-chevron-right text-xl text-[#1d4ed8] transition-transform group-hover:translate-x-1"></i>
                    </button>

                    {/* Conexión adicional */}
                    <button
                      type="button"
                      onClick={onBuyAddonClick}
                      className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-left transition-all duration-200 hover:border-[#171931]/40 hover:shadow-sm"
                    >
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[#171931]">
                        <i className="bx bx-plus-circle text-xl"></i>
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm font-bold text-[#171931]">
                          Comprar conexión adicional
                        </span>
                        <span className="mt-0.5 block text-[12px] leading-4 text-slate-500">
                          Se suma a tu plan de forma recurrente.
                        </span>
                      </span>
                      <span className="text-right leading-none">
                        <span className="block text-base font-extrabold text-[#171931]">
                          +$10
                        </span>
                        <span className="block text-[9px] text-slate-400">
                          /mes
                        </span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleClose}
                      className="w-full rounded-lg py-1.5 text-center text-[12px] font-medium text-slate-400 transition-colors hover:text-slate-600"
                    >
                      Ahora no
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* ====================== VISTA CREAR / EDITAR ====================== */
                <motion.div
                  key="form-view"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {/* Cabecera */}
                  <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#eff6ff] text-[#1d4ed8]">
                        <i
                          className={`bx text-xl ${
                            editingId ? "bx-edit-alt" : "bx-buildings"
                          }`}
                        ></i>
                      </span>
                      <div>
                        <h5 className="text-base font-semibold text-[#171931] leading-tight">
                          {editingId
                            ? "Editar departamento"
                            : "Agregar departamento"}
                        </h5>
                        <p className="text-[12px] text-slate-500">
                          Define el departamento y asigna a tu equipo.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleClose}
                      disabled={savingDep}
                      className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Cerrar"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="px-6 py-5">
                    {/* Tabs */}
                    <div className="flex border-b border-gray-100 mb-5">
                      <button
                        type="button"
                        className={`px-4 py-2 text-sm font-semibold transition-colors ${
                          activeTab === "departamento"
                            ? "border-b-2 border-[#1d4ed8] text-[#1d4ed8]"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                        onClick={() => setActiveTab("departamento")}
                      >
                        Departamento
                      </button>
                      <button
                        type="button"
                        className={`px-4 py-2 text-sm font-semibold transition-colors ${
                          activeTab === "usuarios"
                            ? "border-b-2 border-[#1d4ed8] text-[#1d4ed8]"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                        onClick={() => setActiveTab("usuarios")}
                      >
                        Asignar usuarios
                      </button>
                    </div>

                    {activeTab === "departamento" ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-[#171931] text-[13px] font-medium mb-1.5">
                              Nombre del departamento
                            </label>
                            <div className="relative">
                              <i className="bx bx-purchase-tag absolute left-3 top-1/2 -translate-y-1/2 text-base text-slate-400"></i>
                              <input
                                required
                                placeholder="Ej: Soporte, Ventas"
                                className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/25 focus:border-[#1d4ed8] focus:bg-white transition-all duration-200"
                                value={form.nombre_departamento}
                                onChange={(e) =>
                                  setForm({
                                    ...form,
                                    nombre_departamento: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[#171931] text-[13px] font-medium mb-1.5">
                              Color
                            </label>
                            <div className="flex items-center gap-3">
                              <input
                                required
                                type="color"
                                className="w-14 h-10 border border-gray-300 rounded-lg p-1 cursor-pointer"
                                value={form.color}
                                onChange={(e) =>
                                  setForm({ ...form, color: e.target.value })
                                }
                              />
                              <span className="text-sm text-slate-500 font-mono">
                                {form.color}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-[#171931] text-[13px] font-medium mb-1.5">
                              Conexión asignada
                            </label>
                            <Select
                              options={conexionesOptions}
                              value={selectedConexion}
                              onChange={(opt) =>
                                setForm({
                                  ...form,
                                  id_configuracion: opt ? opt.value : "",
                                })
                              }
                              placeholder="Seleccione una conexión..."
                              isSearchable
                              isClearable
                              noOptionsMessage={() => "No hay conexiones"}
                              maxMenuHeight={170}
                              theme={selectTheme}
                              styles={selectStyles}
                            />
                            <p className="mt-1.5 text-[11px] text-slate-400">
                              La autoasignación de chats requiere una conexión
                              asignada.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="max-h-[400px] overflow-y-auto border border-gray-200 rounded-lg">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 sticky top-0 z-10">
                            <tr className="text-slate-600">
                              <th className="p-3 text-left font-semibold">
                                Usuario
                              </th>
                              <th className="p-3 text-left font-semibold">
                                Nombre responsable
                              </th>
                              <th className="p-3 text-left font-semibold">
                                Correo
                              </th>
                              <th className="p-3 text-center font-semibold">
                                Asignar al departamento
                              </th>
                              <th className="p-3 text-center font-semibold">
                                Asignar chats automáticamente
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {usuarios.map((usuario) => {
                              const asignacion = getAsignacion(
                                usuario.id_sub_usuario,
                              );
                              const isChecked = !!asignacion;
                              const autoOn =
                                isChecked && asignacion.asignacion_auto === 1;
                              return (
                                <tr
                                  key={usuario.id_sub_usuario}
                                  className="hover:bg-slate-50/60"
                                >
                                  <td className="p-3 text-slate-800 font-medium">
                                    {usuario.usuario}
                                  </td>
                                  <td className="p-3 text-slate-700">
                                    {usuario.nombre_encargado}
                                  </td>
                                  <td className="p-3 text-slate-700">
                                    {usuario.email}
                                  </td>
                                  <td className="p-3 text-center">
                                    <Switch
                                      checked={isChecked}
                                      title={
                                        isChecked ? "Asignado" : "Sin asignar"
                                      }
                                      onClick={() => {
                                        setUsuariosAsignados((prev) => {
                                          const id = Number(
                                            usuario.id_sub_usuario,
                                          );
                                          const exists = prev.some(
                                            (x) =>
                                              Number(x.id_sub_usuario) === id,
                                          );
                                          if (exists) {
                                            return prev.filter(
                                              (x) =>
                                                Number(x.id_sub_usuario) !== id,
                                            );
                                          }
                                          return [
                                            ...prev,
                                            {
                                              id_sub_usuario: id,
                                              asignacion_auto: 0,
                                            },
                                          ];
                                        });
                                      }}
                                    />
                                  </td>
                                  <td className="p-3 text-center">
                                    <Switch
                                      checked={autoOn}
                                      disabled={!isChecked}
                                      title={
                                        !isChecked
                                          ? "Primero asigna el usuario"
                                          : "Autoasignar chats a este usuario"
                                      }
                                      onClick={() => {
                                        const val = autoOn ? 0 : 1;
                                        setUsuariosAsignados((prev) =>
                                          prev.map((x) =>
                                            Number(x.id_sub_usuario) ===
                                            Number(usuario.id_sub_usuario)
                                              ? { ...x, asignacion_auto: val }
                                              : x,
                                          ),
                                        );
                                      }}
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex justify-end gap-2.5 pt-5 mt-5 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={handleClose}
                        disabled={savingDep}
                        className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 font-medium hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={savingDep}
                        className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#1d4ed8] text-sm text-white font-semibold hover:bg-[#1e40af] shadow-sm transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        <i
                          className={`bx ${
                            savingDep ? "bx-loader-alt bx-spin" : "bx-check"
                          }`}
                        ></i>
                        {savingDep
                          ? "Guardando…"
                          : editingId
                            ? "Actualizar"
                            : "Agregar"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default DepartamentosView;
