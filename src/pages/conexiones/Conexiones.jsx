import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { useLocation, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import chatApi from "../../api/chatcenter";
import botImage from "../../assets/bot.png";
import "./conexiones.css";
import CrearConfiguracionModal from "../admintemplates/CrearConfiguracionModal";
import CrearConfiguracionModalWhatsappBusiness from "../admintemplates/CrearConfiguracionModalWhatsappBusiness";

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

  const handleAbrirConfiguracionAutomatizada = () => {
    setModalConfiguracionAutomatizada(true);
  };

  const handleConectarWhatsappBussines = (config) => {
    setIdConfiguracion(config.id);
    setNombreConfiguracion(config.nombre_configuracion);
    setTelefono(config.telefono);
    setModalConfiguracionWhatsappBusiness(true);
  };

  //Cargamos el SDK de Facebook una sola vez
  useEffect(() => {
    if (!document.getElementById("facebook-jssdk")) {
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.aync = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    // Cuando el script cargue, Facebook invocará window.fbAsyncInit
    window.fbAsyncInit = () => {
      window.FB.init({
        appId: "1211546113231811", // <--- tu App ID real
        autoLogAppEvents: true,
        xfbml: true,
        version: "v22.0", // O la versión que quieras
      });
    };
  });

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
        // callback síncrono ↓
        (async () => {
          const code = response?.authResponse?.code;
          console.log("CODE FRESCO:", code);
          // return;

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
              setCurrentTab("numbers");
            } else {
              throw new Error(data.message || "Error inesperado.");
            }
          } catch (err) {
            console.error(err);

            const mensaje =
              err?.response?.data?.message || "Error al activar el número.";
            const linkWhatsApp = err?.response?.data?.contacto;

            setStatusMessage({
              type: "error",
              text: linkWhatsApp
                ? `${mensaje} 👉 Haz clic aquí para contactarnos por WhatsApp: `
                : mensaje,
              extra: linkWhatsApp ? linkWhatsApp : null,
            });
          }
        })(); // ← IIFE asíncrona
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

  // 1. Definir fetchConfiguracionAutomatizada fuera del useEffect
  const fetchConfiguracionAutomatizada = async () => {
    if (!userData) return;

    try {
      const response = await chatApi.post("configuraciones/listar_conexiones", {
        id_usuario: userData.id_usuario,
      });
      setConfiguracionAutomatizada(response.data.data || []);
    } catch (error) {
      if (error.response?.status === 403) {
        Swal.fire({
          icon: "error",
          title: error.response?.data?.message,
          confirmButtonText: "OK",
        }).then(() => navigate("/planes_view"));
      } else if (error.response?.status === 400) {
        setMostrarErrorBot(true);
      } else {
        console.error("Error al cargar configuración:", error);
      }
    }
  };

  // 2. Llamar fetchConfiguracionAutomatizada cuando el componente se monta
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return navigate("/login");

    const decoded = jwtDecode(token);
    if (decoded.exp < Date.now() / 1000) {
      localStorage.removeItem("token");
      return navigate("/login");
    }

    setUserData(decoded);

    // Mostrar mensaje si hay un plan activado
    const planActivadoData = localStorage.getItem("plan_activado");
    if (planActivadoData) {
      const plan = JSON.parse(planActivadoData);
      Swal.fire({
        icon: "success",
        title: "¡Plan activado!",
        text: `El plan "${plan.nombre}" se activó correctamente.`,
        confirmButtonText: "Aceptar",
      });
      localStorage.removeItem("plan_activado");
    }
  }, []);

  // 3. Llamar a fetchConfiguracionAutomatizada cuando el usuario esté disponible
  useEffect(() => {
    if (userData) {
      fetchConfiguracionAutomatizada();
    }
  }, [userData]);

  // 4. Lógica para Conectar con Meta Developer

  return (
    <div className="relative p-6 min-h-screen bg-gray-50 pt-[5%]">
      <h2 className="text-2xl font-bold mb-6 text-center">
        Conexiones Configuradas
      </h2>

      <div className="flex justify-end pb-6">
        <button
          onClick={() => handleAbrirConfiguracionAutomatizada(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-green-600 to-emerald-500 text-white rounded-xl shadow-xl transition-all duration-300 ease-in-out transform group hover:scale-[1.03] hover:shadow-2xl hover:brightness-110 relative backdrop-blur-sm"
        >
          <i className="bx bx-cog text-2xl transition-all duration-300 group-hover:brightness-150 group-hover:drop-shadow-[0_0_6px_#ffffff80]"></i>
          {/* Tooltip */}
          <span className="tooltip">Agregar configuración</span>
        </button>
      </div>

      {mostrarErrorBot ? (
        <div className="flex flex-col items-center justify-center text-center mt-12">
          <img
            src={botImage}
            alt="Robot"
            className="w-40 h-40 animate-bounce-slow"
          />
          <p className="mt-4 text-gray-500 text-sm md:text-base max-w-md">
            ¡Ups! Aún no tienes ninguna conexión configurada. <br />
            Crea tu primera conexión y empieza a interactuar con tus clientes al
            instante 🚀
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {configuracionAutomatizada.map((config, idx) => (
            <div
              key={idx}
              className=" relative bg-white border border-gray-800 rounded-xl shadow-lg p-6 max-w-sm w-full transition-all duration-300 hover:bg-white hover:shadow-xl hover:scale-105 card-hover"
            >
              {/* Título */}
              <div className="flex items-center gap-3 mb-4">
                <i className="bx bx-layer text-2xl text-blue-600 group-hover:text-blue-400 transition-all duration-300 hover:scale-110"></i>
                <h3 className="text-lg font-semibold text-gray-500 tracking-wide">
                  {config.nombre_configuracion}
                </h3>
              </div>

              {/* Teléfono */}
              <div className="flex items-center gap-2 text-base text-gray-700 mb-4">
                <i className="bx bx-phone-call text-xl text-green-600 group-hover:text-green-400 transition-all duration-300 hover:scale-110 hover:sacudir"></i>
                <span>{config.telefono}</span>
              </div>

              {/* Método de pago */}
              <div className="mb-4">
                <span
                  className={`text-sm font-semibold px-4 py-1 rounded-full ${
                    config.metodo_pago === 1
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  Método de pago:{" "}
                  {config.metodo_pago === 1 ? "Activo" : "Inactivo"}
                </span>
              </div>

              {/* Iconos persistentes con tooltip individual */}
              <div className="flex flex-wrap justify-center gap-2 mb-2">
                {/* Configuración */}
                <div
                  className="relative group cursor-pointer text-gray-500 hover:text-blue-600 transition-all duration-300 transform hover:scale-110"
                  onClick={() => {
                    localStorage.setItem("id_configuracion", config.id);
                    localStorage.setItem(
                      "id_plataforma_conf",
                      config.id_plataforma
                    );

                    navigate("/administrador-whatsapp");
                  }}
                >
                  <i className="bx bx-cog text-xl sm:text-2xl text-blue-600"></i>
                  <span className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                    Ir a configuración
                  </span>
                </div>

                {/* Meta Developer */}
                {!config.conectado ? (
                  <div
                    className="relative group cursor-pointer text-gray-500 hover:text-blue-700 transition transform hover:scale-110"
                    onClick={() => handleConectarMetaDeveloper(config)}
                  >
                    <i className="bx bxl-meta text-xl sm:text-2xl"></i>
                    <span className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                      Conectar Meta Developer
                    </span>
                  </div>
                ) : (
                  <div className="relative group text-blue-600">
                    <i className="bx bxl-meta text-xl sm:text-2xl"></i>
                    <span className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-blue-700 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                      Meta Business conectado
                    </span>
                  </div>
                )}

                {/* WhatsApp */}
                {!config.conectado ? (
                  <div
                    className="relative group cursor-pointer text-gray-500 hover:text-green-700 transition transform hover:scale-110"
                    onClick={() => handleConectarWhatsappBussines(config)}
                  >
                    <i className="bx bxl-whatsapp text-xl sm:text-2xl"></i>
                    <span className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                      Conectar WhatsApp Business
                    </span>
                  </div>
                ) : (
                  <div className="relative group text-green-600">
                    <i className="bx bxl-whatsapp text-xl sm:text-2xl"></i>
                    <span className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-green-700 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
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

                    navigate("/chat");
                  }}
                >
                  <i className="bx bx-chat text-xl sm:text-2xl text-green-600 group-hover:text-green-400"></i>
                  <span className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                    Ir al chat
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
