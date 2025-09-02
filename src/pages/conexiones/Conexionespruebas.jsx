import React, { useEffect, useMemo, useState } from "react";
import { useCallback } from "react";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import chatApi from "../../api/chatcenter";
import botImage from "../../assets/bot.png";
import "./conexiones.css";
import CrearConfiguracionModal from "../admintemplates/CrearConfiguracionModal";
import CrearConfiguracionModalWhatsappBusiness from "../admintemplates/CrearConfiguracionModalWhatsappBusiness";

/* Helpers UI */
const HeaderStat = ({ label, value }) => (
  <div className="px-4 py-3 rounded-xl bg-white/30 backdrop-blur ring-1 ring-white/50 shadow-sm">
    <div className="text-xs uppercase tracking-wide text-white/80">{label}</div>
    <div className="text-lg font-semibold text-white">{value}</div>
  </div>
);

const pill = (classes, text) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${classes}`}>
    {text}
  </span>
);

const Conexiones = () => {
  const [configuracionAutomatizada, setConfiguracionAutomatizada] = useState(
    []
  );
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();

  const [mostrarErrorBot, setMostrarErrorBot] = useState(false);
  const [ModalConfiguracionAutomatizada, setModalConfiguracionAutomatizada] =
    useState(false);
  const [
    ModalConfiguracionWhatsappBusiness,
    setModalConfiguracionWhatsappBusiness,
  ] = useState(false);

  const [statusMessage, setStatusMessage] = useState(null);
  const [idConfiguracion, setIdConfiguracion] = useState(null);
  const [NombreConfiguracion, setNombreConfiguracion] = useState(null);
  const [telefono, setTelefono] = useState(null);

  const [loading, setLoading] = useState(true);

  // Controles de vista
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState(""); // "", "conectado", "pendiente"
  const [filtroPago, setFiltroPago] = useState(""); // "", "activo", "inactivo"

  const handleAbrirConfiguracionAutomatizada = () =>
    setModalConfiguracionAutomatizada(true);

  const handleConectarWhatsappBussines = (config) => {
    setIdConfiguracion(config.id);
    setNombreConfiguracion(config.nombre_configuracion);
    setTelefono(config.telefono);
    setModalConfiguracionWhatsappBusiness(true);
  };

  /* SDK Facebook (sin cambios de lógica) */
  useEffect(() => {
    if (!document.getElementById("facebook-jssdk")) {
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    window.fbAsyncInit = () => {
      window.FB.init({
        appId: "1211546113231811",
        autoLogAppEvents: true,
        xfbml: true,
        version: "v22.0",
      });
    };
  }, []);

  const handleConectarMetaDeveloper = () => {
    if (!window.FB) {
      setStatusMessage({
        type: "error",
        text: "El SDK de Facebook aún no está listo.",
      });
      return;
    }

    window.FB.login(
      (response) => {
        (async () => {
          const code = response?.authResponse?.code;
          if (!code) {
            setStatusMessage({
              type: "error",
              text: "No se recibió el código de autorización.",
            });
            return;
          }
          try {
            const { data } = await chatApi.post(
              "/whatsapp_managment/embeddedSignupComplete",
              {
                code,
                id_usuario: userData.id_usuario,
              }
            );
            if (data.success) {
              setStatusMessage({
                type: "success",
                text: "✅ Número conectado correctamente.",
              });
            } else {
              throw new Error(data.message || "Error inesperado.");
            }
          } catch (err) {
            const mensaje =
              err?.response?.data?.message || "Error al activar el número.";
            const linkWhatsApp = err?.response?.data?.contacto;
            setStatusMessage({
              type: "error",
              text: linkWhatsApp
                ? `${mensaje} 👉 Haz clic para contactarnos por WhatsApp`
                : mensaje,
              extra: linkWhatsApp || null,
            });
          }
        })();
      },
      {
        config_id: "2295613834169297",
        response_type: "code",
        override_default_response_type: true,
        scope: "whatsapp_business_management,whatsapp_business_messaging",
        extras: {
          featureType: "whatsapp_business_app_onboarding",
          setup: {},
          sessionInfoVersion: "3",
        },
      }
    );
  };

  const FB_FBL_CONFIG_ID_MESSENGER = "1106951720999970";

  // NUEVO: abre el flujo OAuth del backend (construye la login URL y redirige)
  const handleConectarFacebookInbox = async (config) => {
    try {
      // guardo la config para usarla al volver del callback
      localStorage.setItem("id_configuracion_fb", String(config.id));

      const { data } = await chatApi.get("/messenger/facebook/login-url", {
        params: {
          id_configuracion: config.id, // 👈 usamos id_configuracion
          redirect_uri: window.location.origin + "/conexionespruebas", //Oauth validado en meta
          config_id: FB_FBL_CONFIG_ID_MESSENGER,
        },
      });
      window.location.href = data.url; // redirige al diálogo de Facebook
    } catch (err) {
      console.error(err);
      Swal.fire(
        "Error",
        "No se pudo iniciar la conexión con Facebook.",
        "error"
      );
    }
  };

  // NUEVO: selector de página con SweetAlert (drop-down)
  const pickPageWithSwal = async (pages) => {
    // pages: [{id, name}]
    const inputOptions = pages.reduce((acc, p) => {
      acc[p.id] = `${p.name} (ID: ${p.id})`;
      return acc;
    }, {});
    const { value: pageId } = await Swal.fire({
      title: "Selecciona la página a conectar",
      input: "select",
      inputOptions,
      inputPlaceholder: "Página de Facebook",
      showCancelButton: true,
      confirmButtonText: "Conectar",
      cancelButtonText: "Cancelar",
    });
    return pageId; // puede ser undefined si canceló
  };

  // NUEVO: al volver de Facebook con ?code=..., hacemos exchange -> list pages -> connect
  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const error = params.get("error");
      if (!code || error) return;

      try {
        const id_configuracion =
          localStorage.getItem("id_configuracion_fb") ||
          localStorage.getItem("id_configuracion") || // por si ya lo usas en otros flujos
          "";

        if (!id_configuracion) {
          throw new Error("Falta id_configuracion para completar la conexión.");
        }

        // 1) Intercambia el code por token de usuario (largo) y crea la sesión OAuth
        const { data: ex } = await chatApi.post(
          "/messenger/facebook/oauth/exchange",
          {
            code,
            id_configuracion, // 👈 server ya lo usa en tu versión
            redirect_uri: window.location.origin + "/conexionespruebas",
          }
        );

        // 2) Lista páginas del usuario (usando oauth_session_id)
        const { data: pagesRes } = await chatApi.get(
          "/messenger/facebook/pages",
          { params: { oauth_session_id: ex.oauth_session_id } }
        );

        if (!pagesRes?.pages?.length) {
          throw new Error(
            "No se encontraron páginas en la cuenta de Facebook."
          );
        }

        // 3) El usuario elige la página
        const pageId = await pickPageWithSwal(pagesRes.pages);
        if (!pageId) {
          // Limpia la URL y aborta
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, "", cleanUrl);
          return;
        }

        // 4) Conecta (suscribe y guarda token en DB)
        await chatApi.post("/messenger/facebook/connect", {
          oauth_session_id: ex.oauth_session_id,
          id_configuracion,
          page_id: pageId,
        });

        Swal.fire("¡Listo!", "Página conectada y suscrita ✅", "success");

        // refresca tarjetas
        await fetchConfiguracionAutomatizada();
      } catch (e) {
        console.error(e);
        Swal.fire(
          "Error",
          e?.message || "No fue posible conectar la página",
          "error"
        );
      } finally {
        // Limpia querystring y storage temporal
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, "", cleanUrl);
        localStorage.removeItem("id_configuracion_fb");
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Data */
  const fetchConfiguracionAutomatizada = useCallback(async () => {
    if (!userData) return;
    try {
      setLoading(true);
      const response = await chatApi.post("configuraciones/listar_conexiones", {
        id_usuario: userData.id_usuario,
      });
      setConfiguracionAutomatizada(response.data.data || []);

      // resetear error SI cargó algo
      setMostrarErrorBot(false);
    } catch (error) {
      if (error.response?.status === 403) {
        Swal.fire({
          icon: "error",
          title: error.response?.data?.message,
          confirmButtonText: "OK",
        }).then(() => navigate("/planes_view"));
      } else if (error.response?.status === 402) {
        Swal.fire({
          icon: "error",
          title: error.response?.data?.message,
          confirmButtonText: "OK",
        }).then(() => navigate("/miplan"));
      } else if (error.response?.status === 400) {
        setMostrarErrorBot(true);
      } else {
        console.error("Error al cargar configuración:", error);
      }
    } finally {
      setLoading(false);
    }
  }, [userData, navigate]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return navigate("/login");

    const decoded = jwtDecode(token);
    if (decoded.exp < Date.now() / 1000) {
      localStorage.clear();
      return navigate("/login");
    }
    setUserData(decoded);
  }, [navigate]);

  useEffect(() => {
    if (userData) fetchConfiguracionAutomatizada();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData]);

  /* Derivados */
  const stats = useMemo(() => {
    const total = configuracionAutomatizada.length;
    const conectados = configuracionAutomatizada.filter(
      (c) => !!c.conectado
    ).length;
    const pagosActivos = configuracionAutomatizada.filter(
      (c) => Number(c.metodo_pago) === 1
    ).length;
    return { total, conectados, pendientes: total - conectados, pagosActivos };
  }, [configuracionAutomatizada]);

  const listaFiltrada = useMemo(() => {
    const q = search.trim().toLowerCase();
    let data = [...configuracionAutomatizada];

    if (q) {
      data = data.filter(
        (c) =>
          c?.nombre_configuracion?.toLowerCase().includes(q) ||
          c?.telefono?.toLowerCase().includes(q)
      );
    }

    if (filtroEstado) {
      const objetivo = filtroEstado === "conectado";
      data = data.filter((c) => !!c.conectado === objetivo);
    }

    if (filtroPago) {
      const objetivo = filtroPago === "activo" ? 1 : 0;
      data = data.filter((c) => Number(c.metodo_pago) === objetivo);
    }

    return data;
  }, [configuracionAutomatizada, search, filtroEstado, filtroPago]);

  /* UI */
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 pt-24 px-3 md:px-6">
      <div className="mx-auto w-[98%] xl:w-[97%] 2xl:w-[96%] m-3 md:m-6 bg-white rounded-2xl shadow-xl ring-1 ring-slate-200/70 min-h-[82vh] overflow-hidden">
        {/* Header premium */}
        <header className="relative isolate overflow-hidden">
          <div className="bg-[#171931] p-6 md:p-7 flex flex-col gap-5 rounded-t-2xl">
            <div className="flex items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                  Conexiones configuradas
                </h1>
                <p className="text-white/80 text-sm">
                  Administra tus números y canales de WhatsApp Business.
                </p>
              </div>

              {/* Mantengo tu botón con ícono y tooltip personalizados */}
              <button
                onClick={handleAbrirConfiguracionAutomatizada}
                className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 hover:bg-indigo-50 active:bg-indigo-100 rounded-lg font-semibold shadow-sm transition group relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
              >
                <i className="bx bx-plus text-2xl transition-all duration-300 group-hover:brightness-125"></i>
                <span className="tooltip">Nueva configuración</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <HeaderStat label="Total conexiones" value={stats.total} />
              <HeaderStat label="Conectados" value={stats.conectados} />
              <HeaderStat label="Pendientes" value={stats.pendientes} />
              <HeaderStat label="Pagos activos" value={stats.pagosActivos} />
            </div>
          </div>
        </header>

        {/* Barra de controles */}
        <div className="p-6 border-b border-slate-100 bg-white">
          <div className="max-w-8xl mx-auto flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            <input
              type="text"
              placeholder="Buscar por nombre o teléfono…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full lg:w-1/2 px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none"
            />

            <div className="flex gap-3 w-full lg:w-auto">
              <select
                className="w-full lg:w-56 border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <option value="">Todos los estados</option>
                <option value="conectado">Conectado</option>
                <option value="pendiente">Pendiente</option>
              </select>

              <select
                className="w-full lg:w-56 border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none"
                value={filtroPago}
                onChange={(e) => setFiltroPago(e.target.value)}
              >
                <option value="">Todos los pagos</option>
                <option value="activo">Pago activo</option>
                <option value="inactivo">Pago inactivo</option>
              </select>
            </div>
          </div>
        </div>

        {/* Toast de estado (si llega del backend) */}
        {statusMessage && (
          <div className="mx-auto mt-4 mb-0 w-[98%] max-w-7xl px-4">
            <div
              className={`rounded-lg px-4 py-3 text-sm ${
                statusMessage.type === "success"
                  ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                  : "bg-rose-50 text-rose-800 ring-1 ring-rose-200"
              }`}
            >
              {statusMessage.text}{" "}
              {statusMessage.extra && (
                <a
                  href={statusMessage.extra}
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-semibold"
                >
                  Abrir WhatsApp
                </a>
              )}
            </div>
          </div>
        )}

        {/* Contenido */}
        <div className="p-6">
          <div className="max-w-8xl mx-auto">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="h-48 rounded-xl bg-slate-100 animate-pulse"
                  />
                ))}
              </div>
            ) : mostrarErrorBot || listaFiltrada.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center mt-12">
                <img
                  src={botImage}
                  alt="Robot"
                  className="w-40 h-40 animate-bounce-slow"
                />
                <h3 className="mt-4 text-lg font-semibold text-slate-800">
                  Aún no tienes conexiones
                </h3>
                <p className="mt-1 text-slate-500 text-sm md:text-base max-w-md">
                  Crea tu primera conexión y empieza a interactuar con tus
                  clientes al instante.
                </p>
                <button
                  onClick={handleAbrirConfiguracionAutomatizada}
                  className="mt-4 inline-flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2.5 rounded-lg shadow-sm transition group relative"
                >
                  <i className="bx bx-plus text-2xl"></i>
                  <span className="tooltip">Agregar configuración</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {listaFiltrada.map((config, idx) => {
                  const conectado = !!config.conectado;
                  const pagoActivo = Number(config.metodo_pago) === 1;

                  return (
                    <div
                      key={config.id}
                      className="relative bg-white rounded-2xl shadow-md ring-1 ring-slate-200 p-5 transition hover:shadow-lg hover:-translate-y-0.5 card-hover"
                    >
                      {/* Header de card */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-base font-semibold text-slate-800 truncate">
                            {config.nombre_configuracion}
                          </h3>
                          <div className="mt-2 flex items-center gap-2">
                            {pill(
                              conectado
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                : "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
                              conectado ? "Conectado" : "Pendiente"
                            )}
                            {pill(
                              pagoActivo
                                ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
                                : "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
                              pagoActivo ? "Pago activo" : "Pago inactivo"
                            )}
                          </div>
                        </div>

                        {/* Mantengo tu estilo de íconos */}
                        <div className="shrink-0 w-10 h-10 rounded-xl bg-slate-100 ring-1 ring-slate-200 grid place-items-center">
                          <i className="bx bx-layer text-xl text-blue-600"></i>
                        </div>
                      </div>

                      {/* Teléfono */}
                      <div className="mt-4 flex items-center gap-2 text-sm text-slate-700">
                        <i className="bx bx-phone-call text-xl text-green-600 hover:sacudir"></i>
                        <span className="font-medium">{config.telefono}</span>
                      </div>

                      {/* Acciones (sección estructurada) */}
                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                        {/* Configuración */}
                        <div
                          className="relative group cursor-pointer text-gray-500 hover:text-blue-600 transition transform hover:scale-110"
                          onClick={() => {
                            localStorage.setItem("id_configuracion", config.id);
                            localStorage.setItem(
                              "id_plataforma_conf",
                              config.id_plataforma
                            );
                            localStorage.setItem(
                              "nombre_configuracion",
                              config.nombre_configuracion
                            );
                            navigate("/administrador-whatsapp");
                          }}
                          title="Ir a configuración"
                        >
                          <i className="bx bx-cog text-2xl text-blue-600"></i>
                          <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                            Ir a configuración
                          </span>
                        </div>

                        {/* Facebook Inbox (Messenger) */}
                        <div
                          className="relative group cursor-pointer text-gray-500 hover:text-blue-600 transition transform hover:scale-110"
                          onClick={() => handleConectarFacebookInbox(config)}
                          title="Conectar Facebook Inbox (Messenger)"
                        >
                          {/* usa el icono que prefieras. Si tienes boxicons: bxl-messenger / bxl-facebook */}
                          <i className="bx bxl-messenger text-2xl"></i>
                          <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                            Conectar Facebook Inbox
                          </span>
                        </div>

                        {/* Meta Developer */}
                        {!conectado ? (
                          <div
                            className="relative group cursor-pointer text-gray-500 hover:text-blue-700 transition transform hover:scale-110"
                            onClick={() => handleConectarMetaDeveloper(config)}
                            title="Conectar Bussines Manager"
                          >
                            <i className="bx bxl-meta text-2xl"></i>
                            <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                              Conectar Bussines Manager
                            </span>
                          </div>
                        ) : (
                          <div
                            className="relative group text-blue-600"
                            title="Meta Business conectado"
                          >
                            <i className="bx bxl-meta text-2xl"></i>
                            <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-blue-700 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                              Meta Business conectado
                            </span>
                          </div>
                        )}

                        {/* WhatsApp */}
                        {!conectado ? (
                          <div
                            className="relative group cursor-pointer text-gray-500 hover:text-green-700 transition transform hover:scale-110"
                            onClick={() =>
                              handleConectarWhatsappBussines(config)
                            }
                            title="Conectar WhatsApp Business"
                          >
                            <i className="bx bxl-whatsapp text-2xl"></i>
                            <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                              Conectar WhatsApp Business
                            </span>
                          </div>
                        ) : (
                          <div
                            className="relative group text-green-600"
                            title="WhatsApp vinculado"
                          >
                            <i className="bx bxl-whatsapp text-2xl"></i>
                            <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-green-700 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                              WhatsApp vinculado
                            </span>
                          </div>
                        )}

                        {/* Chat */}
                        <div
                          className="relative group cursor-pointer text-gray-500 hover:text-green-700 transition transform hover:scale-110"
                          onClick={() => {
                            localStorage.setItem("id_configuracion", config.id);
                            localStorage.setItem(
                              "id_plataforma_conf",
                              config.id_plataforma
                            );
                            localStorage.setItem(
                              "nombre_configuracion",
                              config.nombre_configuracion
                            );
                            navigate("/chat");
                          }}
                          title="Ir al chat"
                        >
                          <i className="bx bx-chat text-2xl text-green-600"></i>
                          <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                            Ir al chat
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modales */}
      {ModalConfiguracionAutomatizada && (
        <CrearConfiguracionModal
          onClose={() => setModalConfiguracionAutomatizada(false)}
          fetchConfiguraciones={fetchConfiguracionAutomatizada}
          setStatusMessage={setStatusMessage}
        />
      )}

      {ModalConfiguracionWhatsappBusiness && (
        <CrearConfiguracionModalWhatsappBusiness
          onClose={() => setModalConfiguracionWhatsappBusiness(false)}
          fetchConfiguraciones={fetchConfiguracionAutomatizada}
          setStatusMessage={setStatusMessage}
          idConfiguracion={idConfiguracion}
          nombre_configuracion={NombreConfiguracion}
          telefono={telefono}
        />
      )}
    </div>
  );
};

export default Conexiones;
