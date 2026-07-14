// src/views/UsuariosView.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";
import { jwtDecode } from "jwt-decode";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

// Toast flotante (esquina superior derecha) — no lo tapa el blur del modal
const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3500,
  timerProgressBar: true,
  didOpen: (el) => {
    el.addEventListener("mouseenter", Swal.stopTimer);
    el.addEventListener("mouseleave", Swal.resumeTimer);
  },
});

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

// Qué puede hacer cada rol — se muestra al elegirlo en el formulario
const ROL_INFO = {
  administrador: {
    icon: "bx-crown",
    color: "text-[#1d4ed8] bg-[#eff6ff] ring-[#1d4ed8]/20",
    desc: "Control total de la cuenta: gestiona usuarios, departamentos, conexiones y planes. Ve todos los chats de sus conexiones.",
  },
  admin_limitado: {
    icon: "bx-shield-quarter",
    color: "text-violet-700 bg-violet-50 ring-violet-200",
    desc: "Supervisa la operación: ve y atiende TODOS los chats de la conexión del departamento donde fue asignado, pero no puede crear, editar ni eliminar usuarios ni conexiones.",
  },
  ventas: {
    icon: "bx-headphone",
    color: "text-emerald-700 bg-emerald-50 ring-emerald-200",
    desc: "Asesor: solo ve los chats que se le asignan (automáticamente o a mano) y los que tome de 'En espera'.",
  },
};

const ROL_LABELS = {
  administrador: "Administrador",
  admin_limitado: "Administrador limitado",
  ventas: "Ventas",
};

const rolBadge = (rol) => {
  const r = String(rol || "").toLowerCase();
  if (r.includes("admin"))
    return "bg-[#eff6ff] text-[#1d4ed8] ring-1 ring-[#1d4ed8]/20";
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
  // Contraseña actual del admin logueado — requerida para cambiar una clave
  const [passwordActual, setPasswordActual] = useState("");

  const [search, setSearch] = useState("");
  const [rolFiltro, setRolFiltro] = useState("");
  const [sort, setSort] = useState({ key: "usuario", dir: "asc" });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // id_sub_usuario del usuario logueado (para bloquear auto-edición de rol / auto-eliminación)
  const myId = useMemo(() => {
    try {
      const token = localStorage.getItem("token");
      return token ? Number(jwtDecode(token).id_sub_usuario) : null;
    } catch {
      return null;
    }
  }, []);

  const [showUpgradeOptions, setShowUpgradeOptions] = useState(false); // vista upgrade
  const [limitMessage, setLimitMessage] = useState(""); // mensaje límite
  const [isClosing, setIsClosing] = useState(false);

  // Estados de carga (anti doble clic)
  const [subuLoading, setSubuLoading] = useState(false); // comprando subusuario
  const [savingUsuario, setSavingUsuario] = useState(false); // guardando usuario

  const reduce = useReducedMotion();

  // Variantes para el switch interno de vistas (form ↔ upgrade)
  const containerVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.28 } },
    exit: { opacity: 0, y: 12, transition: { duration: 0.2 } },
  };

  // Animación del modal sin depender de CSS externo + reduced-motion
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
    if (subuLoading || savingUsuario) return; // no cerrar a mitad de una petición
    setIsClosing(true);
    setTimeout(() => {
      setModalOpen(false);
      setForm({
        usuario: "",
        password: "",
        email: "",
        nombre_encargado: "",
        rol: "",
      });
      setEditingId(null);
      setShowPassword(false);
      setPasswordActual("");
      setShowUpgradeOptions(false);
      setLimitMessage("");
      setIsClosing(false);
    }, 300);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (savingUsuario) return;

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

    if (!form.rol) {
      setSavingUsuario(false);
      return Swal.fire({
        icon: "warning",
        title: "Elige un rol",
        text: "Selecciona el rol que tendrá este usuario.",
        confirmButtonColor: "#1d4ed8",
        customClass: { popup: "rounded-2xl" },
      });
    }

    const payload = { ...form };
    setSavingUsuario(true);
    try {
      // si edito y password está vacío, no lo mando
      if (editingId && !payload.password?.trim()) {
        delete payload.password;
      }
      // cambiar clave exige confirmar la contraseña actual del admin
      if (editingId && payload.password) {
        payload.password_actual = passwordActual;
      }

      if (editingId) {
        await chatApi.post(
          "/usuarios_chat_center/actualizarUsuario",
          { id_sub_usuario: editingId, ...payload },
          { silentError: true },
        );
        Toast.fire({
          icon: "success",
          title: "Usuario actualizado correctamente.",
        });
      } else {
        await chatApi.post(
          "/usuarios_chat_center/agregarUsuario",
          { id_usuario, ...payload },
          { silentError: true },
        );
        Toast.fire({
          icon: "success",
          title: "Usuario creado correctamente.",
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
      setPasswordActual("");
      fetchUsuarios();
    } catch (error) {
      const httpStatus = error?.response?.status;
      const code = error?.response?.data?.code;
      const backendMsg = error?.response?.data?.message;

      // Límite de plan → vista upgrade
      if (
        (httpStatus === 403 && code === "QUOTA_EXCEEDED") ||
        httpStatus === 409
      ) {
        setLimitMessage(
          backendMsg || "Has alcanzado el límite de usuarios de tu plan.",
        );
        setShowUpgradeOptions(true);
        return;
      }

      Swal.fire({
        icon: "error",
        title: "Error al guardar",
        text: backendMsg || "No se pudo guardar el usuario",
        confirmButtonColor: "#1d4ed8",
        customClass: { popup: "rounded-2xl" },
      });
    } finally {
      setSavingUsuario(false);
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
    setPasswordActual("");
    setShowUpgradeOptions(false);
    setLimitMessage("");
    setModalOpen(true);
  };

  const handleDelete = async (u) => {
    if (Number(u.id_sub_usuario) === myId) {
      return Swal.fire({
        icon: "info",
        title: "No puedes eliminarte",
        text: "Por seguridad no puedes eliminar tu propio usuario. Pídele a otro administrador que lo haga.",
        confirmButtonColor: "#1d4ed8",
        customClass: { popup: "rounded-2xl" },
      });
    }
    const result = await Swal.fire({
      title: "¿Eliminar usuario?",
      text: u.usuario,
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
        await chatApi.delete("/usuarios_chat_center/eliminarSubUsuario", {
          data: { id_sub_usuario: u.id_sub_usuario },
          silentError: true,
        });
        Toast.fire({
          icon: "success",
          title: "Usuario eliminado.",
        });
        fetchUsuarios();
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Error al eliminar",
          text:
            error?.response?.data?.message || "No se pudo eliminar el usuario",
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
          u?.nombre_encargado?.toLowerCase().includes(q),
      );
    }
    if (rolFiltro) {
      data = data.filter(
        (u) => String(u.rol).toLowerCase() === rolFiltro.toLowerCase(),
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
    Math.ceil(listaProcesada.length / itemsPerPage),
  );
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return listaProcesada.slice(start, start + itemsPerPage);
  }, [listaProcesada, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, rolFiltro]);

  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const subu = qs.get("subu"); // retorno opcional de pago

    if (subu === "ok") {
      Swal.fire({
        icon: "success",
        title: "Pago exitoso",
        text: "Se añadió 1 subusuario adicional a tu cuenta.",
        confirmButtonColor: "#1d4ed8",
        customClass: { popup: "rounded-2xl" },
      });
      fetchUsuarios();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (subu === "cancel") {
      Swal.fire({
        icon: "info",
        title: "Pago cancelado",
        text: "No se realizó ningún cargo.",
        confirmButtonColor: "#1d4ed8",
        customClass: { popup: "rounded-2xl" },
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const onUpgradeClick = () => {
    if (subuLoading) return;
    window.location.href = "/planes";
  };

  // Comprar subusuario adicional — mismo endpoint genérico que conexión, cambia la clave
  const onBuyAddonSubusuarioClick = async () => {
    if (subuLoading) return;
    setSubuLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        Toast.fire({ icon: "error", title: "Sesión expirada. Inicia sesión." });
        return;
      }
      const decoded = jwtDecode(token);
      const id_usuario = decoded.id_usuario;

      const res = await chatApi.post("/stripe_plan/comprarAddon", {
        id_usuario,
        clave: "subusuario_adicional",
        cantidad: 1,
      });
      const data = res?.data || {};

      // Cobrado y aplicado al instante (o gratis en trial)
      if (data.success && !data.actionRequired) {
        await Swal.fire({
          icon: "success",
          iconColor: "#16a34a",
          title: data.en_trial
            ? "¡Activado en tu prueba!"
            : "¡Subusuario adicional activado!",
          html: `
            <p style="margin:6px 0 0;color:#475569;font-size:14px;line-height:1.55">
              ${
                data.en_trial
                  ? "Lo usarás <b style='color:#0a1a36'>gratis durante tu prueba</b>. Se cobrará junto con tu plan cuando termine el período."
                  : "Tu nuevo cupo ya está disponible.<br/>Ya puedes crear un usuario más."
              }
            </p>
          `,
          timer: 5000,
          timerProgressBar: true,
          showConfirmButton: true,
          confirmButtonText: "Crear ahora",
          confirmButtonColor: "#1d4ed8",
          allowOutsideClick: false,
          customClass: { popup: "rounded-2xl" },
        });
        setShowUpgradeOptions(false);
        fetchUsuarios();
        return;
      }

      // Requiere completar pago (3DS) → página de Stripe
      if (data.actionRequired && data.hosted_invoice_url) {
        window.location.href = data.hosted_invoice_url;
        return;
      }

      throw new Error(data.message || "No se pudo procesar el subusuario.");
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "No se pudo agregar el subusuario",
        text: e?.response?.data?.message || e.message || "Intente nuevamente.",
        confirmButtonColor: "#1d4ed8",
        customClass: { popup: "rounded-2xl" },
      });
    } finally {
      setSubuLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-3 pr-8">
      <div className="mx-auto w-[100%] m-3 md:m-6 bg-white rounded-2xl shadow-xl ring-1 ring-slate-200/70 flex flex-col min-h-[82vh] overflow-hidden">
        {/* Header — mismo estilo que Conexiones */}
        <header className="relative isolate overflow-hidden rounded-t-2xl">
          {/* Fondo navy de marca + capas de profundidad */}
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
                  ImporChat · Usuarios
                </span>
                <h1 className="mt-2 text-xl md:text-2xl font-extrabold text-white tracking-tight leading-tight">
                  Tu equipo,{" "}
                  <span className="bg-gradient-to-r from-indigo-300 to-violet-200 bg-clip-text text-transparent">
                    listo para crecer
                  </span>
                </h1>
                <p className="mt-0.5 text-white/55 text-[13px] leading-snug truncate">
                  Crea accesos, asigna roles y controla qué puede hacer cada
                  miembro.
                </p>
              </div>

              <button
                onClick={() => openModal()}
                className="group shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-white text-[#171931] rounded-xl font-semibold text-sm shadow-lg shadow-black/20 ring-1 ring-white/40 hover:shadow-xl hover:shadow-indigo-900/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              >
                <i className="bx bx-plus text-xl text-[#4f46e5] transition-transform duration-200 group-hover:rotate-90" />
                Nuevo usuario
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              <HeaderStat
                label="Total usuarios"
                value={usuarios.length}
                icon="bx bx-group"
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
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <i className="bx bx-search text-lg"></i>
              </span>
              <input
                type="text"
                placeholder="Buscar por usuario, email o nombre…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#1d4ed8]/25 focus:border-[#1d4ed8] outline-none transition-all"
              />
            </div>

            <div className="flex gap-3 w-full lg:w-auto">
              <select
                className="w-full lg:w-56 border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#1d4ed8]/25 focus:border-[#1d4ed8] outline-none transition-all"
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
                <i className="bx bx-user-x text-4xl text-[#1d4ed8]"></i>
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
                className="inline-flex items-center gap-2 bg-[#1d4ed8] text-white hover:bg-[#1e40af] px-4 py-2.5 rounded-lg shadow-sm transition"
              >
                <i className="bx bx-plus text-xl"></i>
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
                          <span className="inline-flex items-center gap-1.5">
                            {u.usuario}
                          </span>
                        </td>
                        <td className="p-3 text-slate-700">{u.email}</td>
                        <td className="p-3 text-slate-700">
                          {u.nombre_encargado}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${rolBadge(
                              u.rol,
                            )}`}
                          >
                            {u.rol || "—"}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openModal(u)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 hover:bg-[#eff6ff] hover:border-[#1d4ed8]/30 hover:text-[#1d4ed8] text-slate-700 transition-colors"
                              title="Editar"
                            >
                              <i className="bx bx-edit-alt text-base"></i>
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(u)}
                              disabled={Number(u.id_sub_usuario) === myId}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                              title={
                                Number(u.id_sub_usuario) === myId
                                  ? "No puedes eliminar tu propio usuario"
                                  : "Eliminar"
                              }
                            >
                              <i className="bx bx-trash text-base"></i>
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
        aria-label="Agregar usuario"
      >
        <i className="bx bx-plus text-2xl"></i>
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
              showUpgradeOptions ? "max-w-md" : "max-w-2xl"
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
                  {/* Cabecera con degradé azul de marca */}
                  <div className="relative bg-gradient-to-br from-[#0a1a36] via-[#102a5c] to-[#1e4fd6] px-6 pt-6 pb-7 text-center">
                    <button
                      onClick={handleClose}
                      disabled={subuLoading}
                      className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Cerrar"
                    >
                      <i className="fas fa-times text-sm"></i>
                    </button>

                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/20 backdrop-blur">
                      <i className="bx bxs-group text-2xl"></i>
                    </span>
                    <h3 className="mt-3 text-base font-bold tracking-tight text-white">
                      Tu equipo está creciendo
                    </h3>
                    <p className="mx-auto mt-1 max-w-xs text-[12px] leading-4 text-white/70">
                      {limitMessage ||
                        "Has alcanzado el límite de usuarios de tu plan."}{" "}
                      Suma un usuario en segundos o mejora tu plan para tener
                      más cupos y beneficios.
                    </p>
                  </div>

                  {/* Cuerpo compacto */}
                  <div className="px-5 py-5 space-y-2.5">
                    {/* Opción principal: Mejorar plan */}
                    <button
                      onClick={onUpgradeClick}
                      disabled={subuLoading}
                      className="group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border-2 border-[#1d4ed8] bg-gradient-to-r from-[#eff6ff] to-white p-3.5 text-left transition-all duration-200 hover:shadow-md hover:shadow-[#1d4ed8]/15 disabled:opacity-60 disabled:cursor-not-allowed"
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
                          Más usuarios incluidos y mejores beneficios en cada
                          herramienta.
                        </span>
                      </span>
                      <i className="bx bx-chevron-right text-xl text-[#1d4ed8] transition-transform group-hover:translate-x-1"></i>
                    </button>

                    {/* Opción secundaria: Subusuario adicional */}
                    <button
                      onClick={onBuyAddonSubusuarioClick}
                      disabled={subuLoading}
                      className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-left transition-all duration-200 hover:border-[#171931]/40 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-80"
                    >
                      <span
                        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                          subuLoading
                            ? "bg-[#eff6ff] text-[#1d4ed8]"
                            : "bg-slate-100 text-[#171931]"
                        }`}
                      >
                        <i
                          className={`bx text-xl ${
                            subuLoading
                              ? "bx-loader-alt bx-spin"
                              : "bxs-user-plus"
                          }`}
                        ></i>
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm font-bold text-[#171931]">
                          {subuLoading ? "Procesando…" : "Solo un usuario más"}
                        </span>
                        <span className="mt-0.5 block text-[12px] leading-4 text-slate-500">
                          {subuLoading
                            ? "Estamos activando tu cupo, un momento."
                            : "Se suma a tu plan de forma recurrente."}
                        </span>
                      </span>
                      {!subuLoading && (
                        <span className="text-right leading-none">
                          <span className="block text-base font-extrabold text-[#171931]">
                            +$5
                          </span>
                          <span className="block text-[9px] text-slate-400">
                            /mes
                          </span>
                        </span>
                      )}
                    </button>

                    {/* Nota de cobro */}
                    <p className="flex items-start gap-1.5 px-0.5 pt-0.5 text-[10px] leading-3.5 text-slate-400">
                      <i className="bx bx-info-circle text-[12px] mt-px"></i>
                      <span>
                        Ej.: un plan de $29/mes pasaría a $34/mes. El subusuario
                        adicional se mantiene activo mientras tu plan siga
                        activo.
                      </span>
                    </p>

                    {/* Salida discreta */}
                    <button
                      onClick={handleClose}
                      disabled={subuLoading}
                      className="w-full rounded-lg py-1.5 text-center text-[12px] font-medium text-slate-400 transition-colors hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
                            editingId ? "bx-edit-alt" : "bx-user-plus"
                          }`}
                        ></i>
                      </span>
                      <div>
                        <h5 className="text-base font-semibold text-[#171931] leading-tight">
                          {editingId ? "Editar usuario" : "Agregar usuario"}
                        </h5>
                        <p className="text-[12px] text-slate-500">
                          {editingId
                            ? "Actualiza los datos y permisos del usuario."
                            : "Crea un acceso para un miembro de tu equipo."}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleClose}
                      disabled={savingUsuario}
                      className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Cerrar"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>

                  {/* Formulario */}
                  <form
                    onSubmit={handleSubmit}
                    className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-5 bg-white"
                  >
                    {/* Columna izquierda */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[#171931] text-[13px] font-medium mb-1.5">
                          Usuario
                        </label>
                        <div className="relative">
                          <i className="bx bx-at absolute left-3 top-1/2 -translate-y-1/2 text-base text-slate-400"></i>
                          <input
                            required
                            disabled={savingUsuario}
                            placeholder="usuario"
                            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/25 focus:border-[#1d4ed8] focus:bg-white transition-all duration-200 disabled:opacity-60"
                            value={form.usuario}
                            onChange={(e) =>
                              setForm({ ...form, usuario: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[#171931] text-[13px] font-medium mb-1.5">
                          {editingId ? "Nueva contraseña" : "Contraseña"}
                        </label>
                        <div className="relative">
                          <i className="bx bx-lock-alt absolute left-3 top-1/2 -translate-y-1/2 text-base text-slate-400"></i>
                          <input
                            placeholder={
                              editingId
                                ? "Dejar en blanco para no cambiar"
                                : "••••••••"
                            }
                            type={showPassword ? "text" : "password"}
                            disabled={savingUsuario}
                            className="w-full pl-9 pr-10 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/25 focus:border-[#1d4ed8] focus:bg-white transition-all duration-200 disabled:opacity-60"
                            value={form.password}
                            onChange={(e) =>
                              setForm({ ...form, password: e.target.value })
                            }
                            required={!editingId}
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((s) => !s)}
                            className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            aria-label={
                              showPassword
                                ? "Ocultar contraseña"
                                : "Mostrar contraseña"
                            }
                          >
                            <i
                              className={`bx ${
                                showPassword ? "bx-hide" : "bx-show"
                              } text-lg`}
                            ></i>
                          </button>
                        </div>
                        {editingId && (
                          <p className="mt-1 text-xs text-slate-500">
                            Si no escribes nada, la contraseña no se cambia.
                          </p>
                        )}
                      </div>

                      {/* Confirmación con la contraseña actual del admin */}
                      {editingId && form.password.trim().length > 0 && (
                        <div>
                          <label className="block text-[#171931] text-[13px] font-medium mb-1.5">
                            Tu contraseña actual
                          </label>
                          <div className="relative">
                            <i className="bx bx-key absolute left-3 top-1/2 -translate-y-1/2 text-base text-slate-400"></i>
                            <input
                              required
                              type="password"
                              disabled={savingUsuario}
                              placeholder="Confirma tu contraseña"
                              className="w-full pl-9 pr-3 py-2.5 border border-amber-300 rounded-lg bg-amber-50/50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 focus:bg-white transition-all duration-200 disabled:opacity-60"
                              value={passwordActual}
                              onChange={(e) =>
                                setPasswordActual(e.target.value)
                              }
                              autoComplete="current-password"
                            />
                          </div>
                          <p className="mt-1 text-xs text-amber-600">
                            <i className="bx bx-shield-quarter align-middle" />{" "}
                            Por seguridad, para cambiar la contraseña debes
                            primero confirmar la tuya.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Columna derecha */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[#171931] text-[13px] font-medium mb-1.5">
                          Email
                        </label>
                        <div className="relative">
                          <i className="bx bx-envelope absolute left-3 top-1/2 -translate-y-1/2 text-base text-slate-400"></i>
                          <input
                            required
                            type="email"
                            disabled={savingUsuario}
                            placeholder="correo@dominio.com"
                            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/25 focus:border-[#1d4ed8] focus:bg-white transition-all duration-200 disabled:opacity-60"
                            value={form.email}
                            onChange={(e) =>
                              setForm({ ...form, email: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[#171931] text-[13px] font-medium mb-1.5">
                          Nombre encargado
                        </label>
                        <div className="relative">
                          <i className="bx bx-id-card absolute left-3 top-1/2 -translate-y-1/2 text-base text-slate-400"></i>
                          <input
                            required
                            disabled={savingUsuario}
                            placeholder="Nombre y apellido"
                            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/25 focus:border-[#1d4ed8] focus:bg-white transition-all duration-200 disabled:opacity-60"
                            value={form.nombre_encargado}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                nombre_encargado: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Rol — todas las opciones visibles con sus permisos */}
                    <div className="md:col-span-2">
                      <label className="block text-[#171931] text-[13px] font-medium mb-1.5">
                        Rol del usuario
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                        {Object.keys(ROL_INFO).map((key) => {
                          const info = ROL_INFO[key];
                          const selected = form.rol === key;
                          const locked =
                            savingUsuario || Number(editingId) === myId;
                          return (
                            <button
                              type="button"
                              key={key}
                              disabled={locked}
                              onClick={() => setForm({ ...form, rol: key })}
                              className={`relative flex flex-col gap-1.5 rounded-xl border-2 p-3 pr-7 text-left transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${
                                selected
                                  ? "border-[#1d4ed8] bg-[#eff6ff]/70 shadow-sm"
                                  : "border-gray-200 bg-white hover:border-[#1d4ed8]/40"
                              }`}
                            >
                              {selected && (
                                <i className="bx bxs-check-circle absolute right-2 top-2 text-lg text-[#1d4ed8]" />
                              )}
                              <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#171931]">
                                <span
                                  className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-1 ${info.color}`}
                                >
                                  <i className={`bx ${info.icon} text-sm`} />
                                </span>
                                {ROL_LABELS[key]}
                              </span>
                              <span className="text-[11.5px] leading-snug text-slate-500">
                                {info.desc}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {Number(editingId) === myId && (
                        <p className="mt-1.5 text-xs text-slate-500">
                          No puedes cambiar tu propio rol.
                        </p>
                      )}
                    </div>

                    {!editingId && (
                      <div className="md:col-span-2 flex gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-[12px] leading-snug text-amber-800">
                        <i className="bx bx-bulb text-base shrink-0 mt-px" />
                        <p>
                          <b>Siguiente paso:</b> para que este usuario pueda ver
                          y atender chats, asígnalo a un departamento en la
                          sección{" "}
                          <Link
                            to="/departamentos"
                            className="font-bold underline underline-offset-2 hover:text-amber-900"
                          >
                            Departamentos
                          </Link>
                          . El departamento define a qué{" "}
                          <Link
                            to="/conexiones"
                            className="font-bold underline underline-offset-2 hover:text-amber-900"
                          >
                            conexión
                          </Link>{" "}
                          tendrá acceso.
                        </p>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="md:col-span-2 flex justify-end gap-2.5 pt-1 mt-1 border-t border-gray-100 -mx-6 px-6 pt-4">
                      <button
                        type="button"
                        onClick={handleClose}
                        disabled={savingUsuario}
                        className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 font-medium hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={savingUsuario}
                        className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#1d4ed8] text-sm text-white font-semibold hover:bg-[#1e40af] shadow-sm transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        <i
                          className={`bx ${
                            savingUsuario ? "bx-loader-alt bx-spin" : "bx-check"
                          }`}
                        ></i>
                        {savingUsuario
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

export default UsuariosView;
