import React, { useEffect, useMemo, useState } from "react";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";
import { jwtDecode } from "jwt-decode";
import "./usuarios.css";

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

const HeaderStat = ({ label, value }) => (
  <div className="px-4 py-3 rounded-xl bg-white/30 backdrop-blur ring-1 ring-white/50 shadow-sm">
    <div className="text-xs uppercase tracking-wide text-white/80">{label}</div>
    <div className="text-lg font-semibold text-white">{value}</div>
  </div>
);

const rolBadge = (rol) => {
  const r = String(rol || "").toLowerCase();
  if (r.includes("admin"))
    return "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200";
  return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
};

const UsuariosView = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    usuario: "",
    password: "",
    email: "",
    nombre_encargado: "",
    rol: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const [search, setSearch] = useState("");
  const [rolFiltro, setRolFiltro] = useState("");
  const [sort, setSort] = useState({ key: "usuario", dir: "asc" });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [showUpgradeOptions, setShowUpgradeOptions] = useState(false); // Controla la vista de opciones de upgrade
  const [limitMessage, setLimitMessage] = useState(""); // Mensaje de error si se supera el límite
  const [isClosing, setIsClosing] = useState(false);

  const fetchUsuarios = async () => {
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
      const res = await chatApi.post("/usuarios_chat_center/listarUsuarios", {
        id_usuario,
      });
      setUsuarios(res.data.data || []);
    } catch {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudieron cargar los usuarios",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const handleClose = () => {
    setIsClosing(true); // Activa la animación de cierre
    setTimeout(() => {
      setModalOpen(false); // Cierra el modal
      setForm({
        usuario: "",
        password: "",
        email: "",
        nombre_encargado: "",
        rol: "",
      }); // Limpia el formulario
      setEditingId(null); // Asegura que no esté en modo de edición
      setShowPassword(false); // Restablece el estado de la contraseña
      setShowUpgradeOptions(false); // Asegura que no se muestre la opción de upgrade
      setLimitMessage(""); // Limpia el mensaje de error
      setUserData(null); // Limpia los datos del usuario

      setIsClosing(false); // Termina la animación
    }, 300); // El tiempo de animación (ajústalo si es necesario)
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
    try {
      if (editingId) {
        await chatApi.post("/usuarios_chat_center/actualizarUsuario", {
          id_sub_usuario: editingId,
          ...payload,
        });
        Swal.fire({
          icon: "success",
          title: "Usuario actualizado",
          text: "Los datos del usuario fueron actualizados correctamente",
        });
      } else {
        await chatApi.post("/usuarios_chat_center/agregarUsuario", {
          id_usuario,
          ...payload,
        });
        Swal.fire({
          icon: "success",
          title: "Usuario creado",
          text: "El usuario fue creado correctamente",
        });
      }
      setModalOpen(false);
      setForm({
        usuario: "",
        password: "",
        email: "",
        nombre_encargado: "",
        rol: "",
      });
      setEditingId(null);
      fetchUsuarios();
    } catch (error) {
      const httpStatus = error?.response?.status;

      // Error 403 con QUOTA_EXCEEDED
      if (
        httpStatus === 403 &&
        error?.response?.data?.code === "QUOTA_EXCEEDED"
      ) {
        const backendMsg = error?.response?.data?.message;
        setLimitMessage(
          backendMsg || "Ha alcanzado el límite de conexiones de su plan."
        );
        setShowUpgradeOptions(true); // Muestra las opciones de upgrade
        return;
      }

      // Otros errores
      Swal.fire({
        icon: "error",
        title: "Error al guardar",
        text: error.response?.data?.message || "No se pudo guardar el usuario",
      });
    }
  };

  const openModal = (u = null) => {
    if (u) {
      setForm({
        usuario: u.usuario || "",
        password: "",
        email: u.email || "",
        nombre_encargado: u.nombre_encargado || "",
        rol: u.rol || "",
      });
      setEditingId(u.id_sub_usuario);
    } else {
      setForm({
        usuario: "",
        password: "",
        email: "",
        nombre_encargado: "",
        rol: "",
      });
      setEditingId(null);
    }
    setShowPassword(false);
    setModalOpen(true);
  };

  const handleDelete = async (u) => {
    const result = await Swal.fire({
      title: "¿Eliminar usuario?",
      text: u.usuario,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });
    if (result.isConfirmed) {
      try {
        await chatApi.delete("/usuarios_chat_center/eliminarSubUsuario", {
          data: { id_sub_usuario: u.id_sub_usuario },
        });
        Swal.fire({
          icon: "success",
          title: "Usuario eliminado",
          text: u.usuario,
          timer: 1500,
          showConfirmButton: false,
        });
        fetchUsuarios();
      } catch {
        Swal.fire({
          icon: "error",
          title: "Error al eliminar",
          text: "No se pudo eliminar el usuario",
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
  const rolesDisponibles = useMemo(() => {
    const set = new Set(usuarios.map((u) => u.rol).filter(Boolean));
    return Array.from(set);
  }, [usuarios]);

  const listaProcesada = useMemo(() => {
    const q = search.trim().toLowerCase();
    let data = [...usuarios];

    if (q) {
      data = data.filter(
        (u) =>
          u?.usuario?.toLowerCase().includes(q) ||
          u?.email?.toLowerCase().includes(q) ||
          u?.nombre_encargado?.toLowerCase().includes(q)
      );
    }
    if (rolFiltro) {
      data = data.filter(
        (u) => String(u.rol).toLowerCase() === rolFiltro.toLowerCase()
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
  }, [usuarios, search, rolFiltro, sort]);

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
  }, [search, rolFiltro]);

  const onUpgradeClick = () => {
    window.location.href = "/planes"; // Redirige a la página de planes
  };

  const onBuyAddonClick = () => {
    window.location.href = "/planes?addon=conexion"; // Redirige a la página de compra de conexión adicional
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 pt-24 px-3 md:px-6">
      <div className="mx-auto w-[98%] xl:w-[97%] 2xl:w-[96%] m-3 md:m-6 bg-white rounded-2xl shadow-xl ring-1 ring-slate-200/70 flex flex-col min-h-[82vh] overflow-hidden">
        {/* Header */}
        <header className="relative isolate overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 p-6 md:p-7 flex flex-col gap-5 rounded-t-2xl">
            <div className="flex items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                  Gestión de Usuarios
                </h1>
                <p className="text-white/80 text-sm">
                  Crea, edita y controla accesos del equipo.
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
                Nuevo
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <HeaderStat label="Total usuarios" value={usuarios.length} />
              <HeaderStat label="En esta vista" value={listaProcesada.length} />
              <HeaderStat
                label="Página"
                value={`${currentPage}/${totalPages}`}
              />
              <HeaderStat label="Resultados/página" value={itemsPerPage} />
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
                placeholder="Buscar por usuario, email o nombre…"
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
                value={rolFiltro}
                onChange={(e) => setRolFiltro(e.target.value)}
              >
                <option value="">Todos los roles</option>
                {rolesDisponibles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Contenido (tabla NO centrada a propósito) */}
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
                  Sin usuarios
                </h3>
                <p className="text-slate-500">
                  Crea tu primer usuario para empezar.
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
                Agregar usuario
              </button>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-auto">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr className="text-slate-600">
                      <SortHeader k="usuario" sort={sort} onSort={handleSort}>
                        Usuario
                      </SortHeader>
                      <SortHeader k="email" sort={sort} onSort={handleSort}>
                        Email
                      </SortHeader>
                      <SortHeader
                        k="nombre_encargado"
                        sort={sort}
                        onSort={handleSort}
                      >
                        Nombre
                      </SortHeader>
                      <SortHeader k="rol" sort={sort} onSort={handleSort}>
                        Rol
                      </SortHeader>
                      <th className="p-3 text-center font-semibold">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginated.map((u) => (
                      <tr
                        key={u.id_sub_usuario}
                        className="hover:bg-slate-50/60"
                      >
                        <td className="p-3 text-slate-800 font-medium">
                          {u.usuario}
                        </td>
                        <td className="p-3 text-slate-700">{u.email}</td>
                        <td className="p-3 text-slate-700">
                          {u.nombre_encargado}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${rolBadge(
                              u.rol
                            )}`}
                          >
                            {u.rol || "—"}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openModal(u)}
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
                              onClick={() => handleDelete(u)}
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

      {/* FAB mobile */}
      <button
        onClick={() => openModal()}
        className="fixed bottom-5 right-5 md:hidden inline-flex items-center justify-center h-12 w-12 rounded-full shadow-lg bg-indigo-600 text-white hover:bg-indigo-700"
        aria-label="Agregar usuario"
      >
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11 11V5a1 1 0 1 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6z" />
        </svg>
      </button>

      {/* Modal agregar/editar */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onKeyDown={(e) => e.key === "Escape" && handleClose()}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-3 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-xl font-semibold">
                {editingId ? "Editar usuario" : "Agregar usuario"}
              </h2>
              <button
                onClick={() => handleClose()}
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

            {showUpgradeOptions ? (
              <div className="space-y-4 p-6">
                {limitMessage && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3 text-sm">
                    {limitMessage}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Card: Actualizar plan */}
                  <div
                    className="group rounded-2xl border border-[#171931] p-6 shadow-lg hover:shadow-xl transition-all duration-300 bg-white cursor-pointer transform hover:scale-105"
                    onClick={onUpgradeClick}
                  >
                    <div className="flex items-start justify-between">
                      <h3 className="text-2xl font-semibold text-[#171931]">
                        Actualizar plan
                      </h3>
                      <span className="inline-flex items-center rounded-full text-xs px-3 py-1 border border-[#171931] bg-[#171931] text-white font-medium">
                        Recomendado
                      </span>
                    </div>
                    <p className="mt-4 text-sm text-gray-600 leading-6">
                      Desbloquee más conexiones y funcionalidades elevando su
                      plan actual. Ideal si su equipo crece o gestiona más
                      números.
                    </p>
                  </div>

                  {/* Card: Comprar conexión adicional */}
                  <div
                    className="group rounded-2xl border border-[#171931] p-6 shadow-lg hover:shadow-xl transition-all duration-300 bg-white cursor-pointer transform hover:scale-105"
                    onClick={onBuyAddonClick}
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="text-2xl font-semibold text-[#171931]">
                        Comprar conexión adicional
                      </h3>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-[#171931]">$10</p>
                        <p className="text-xs text-gray-600">
                          Adquiera una conexión extra por
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 text-sm text-gray-600 leading-6">
                      Esta conexión queda asociada permanentemente a su cuenta,
                      sin importar el plan que tenga contratado.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Usuario
                    </label>
                    <input
                      required
                      placeholder="usuario"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none"
                      value={form.usuario}
                      onChange={(e) =>
                        setForm({ ...form, usuario: e.target.value })
                      }
                    />
                  </div>

                  {!editingId && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Contraseña
                      </label>
                      <div className="relative">
                        <input
                          required
                          placeholder="••••••••"
                          type={showPassword ? "text" : "password"}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 pr-10 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none"
                          value={form.password}
                          onChange={(e) =>
                            setForm({ ...form, password: e.target.value })
                          }
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((s) => !s)}
                          className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                          aria-label={
                            showPassword
                              ? "Ocultar contraseña"
                              : "Mostrar contraseña"
                          }
                        >
                          {showPassword ? (
                            <svg
                              className="w-5 h-5"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" />
                            </svg>
                          ) : (
                            <svg
                              className="w-5 h-5"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M3.53 2.47 2.47 3.53 5.2 6.26C3.44 7.54 2.23 9.16 2 9.5c0 0 3 7 10 7 2.05 0 3.82-.5 5.33-1.3l2.14 2.14 1.06-1.06-17-17zM12 6c2.82 0 5.09 1.16 6.78 2.5.78.62 1.42 1.27 1.89 1.81-.29.37-1.42 1.75-3.26 2.86l-2.02-2.02A5 5 0 0 0 9.85 7.7L7.73 5.58C9.03 5.2 10.47 6 12 6z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Email
                    </label>
                    <input
                      required
                      type="email"
                      placeholder="correo@dominio.com"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Nombre encargado
                    </label>
                    <input
                      required
                      placeholder="Nombre y apellido"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none"
                      value={form.nombre_encargado}
                      onChange={(e) =>
                        setForm({ ...form, nombre_encargado: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Rol
                    </label>
                    <select
                      required
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none"
                      value={form.rol}
                      onChange={(e) =>
                        setForm({ ...form, rol: e.target.value })
                      }
                    >
                      <option value="">Seleccione rol</option>
                      <option value="administrador">Administrador</option>
                      <option value="ventas">Ventas</option>
                    </select>
                  </div>
                </div>

                <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleClose()}
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
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UsuariosView;
