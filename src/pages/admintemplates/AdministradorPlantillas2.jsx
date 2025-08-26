import React, { useEffect, useRef, useState, useMemo } from "react";
import chatApi from "../../api/chatcenter";
import CrearPlantillaModal from "./CrearPlantillaModal";
import VerPlantillaModal from "./VerPlantillaModal";
import CrearPlantillaRapidaModal from "./CrearPlantillaRapidaModal";
import EditarPlantillaRapidaModal from "./EditarPlantillaRapidaModal";
import VerPlantillaGuiasGeneradas from "./VerPlantillaGuiasGeneradas";
import CrearConfiguracionModal from "./CrearConfiguracionModal";
import { useNavigate, useLocation } from "react-router-dom";
import log_imporsuitImage from "../../assets/logo_imporsuit.png";
import "./AdministradorPlantillas2.css";
import Swal from "sweetalert2";
import Select, { components } from "react-select";
import { motion } from "framer-motion"; // opcional si quieres animación

import { jwtDecode } from "jwt-decode";
import io from "socket.io-client";

const AdministradorPlantillas2 = () => {
  const [currentTab, setCurrentTab] = useState("numbers");
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [plantillas, setPlantillas] = useState([]);
  const [userData, setUserData] = useState(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [id_configuracion, setId_configuracion] = useState(null);
  const [id_plataforma_conf, setId_plataforma_conf] = useState(null);

  const navigate = useNavigate();

  const [respuestasRapidas, setRespuestasRapidas] = useState([]);
  const [configuracionAutomatizada, setConfiguracionAutomatizada] = useState(
    []
  );
  const [modalConfigOpen, setModalConfigOpen] = useState(false);
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [respuestaSeleccionada, setRespuestaSeleccionada] = useState(null);
  const [ModalConfiguracionAutomatizada, setModalConfiguracionAutomatizada] =
    useState(false);

  //Mostrar modal plantillas rapidas
  const [mostrarModalPlantillaRapida, setMostrarModalPlantillaRapida] =
    useState(false);

  // Estado para mostrar el modal de crear plantilla
  const [mostrarModalPlantilla, setMostrarModalPlantilla] = useState(false);

  //Manejar el estado de plantilla seleccionada
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState(null);
  const [verModal, setVerModal] = useState(false);

  //Plantillas recomendadas
  const [resultadoPlantillas, setResultadoPlantillas] = useState([]);
  const [modalResultadosAbierto, setModalResultadosAbierto] = useState(false);
  const [cargandoPlantillas, setCargandoPlantillas] = useState(false);
  const socketRef = useRef(null);

  /* seccion de asistente */

  const [asistenteLogistico, setAsistenteLogistico] = useState(null);
  const [asistenteVentas, setAsistenteVentas] = useState(null);
  const [existeAsistente, setExisteAsistente] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Logística
  const [nombreBotLog, setNombreBotLog] = useState("");
  const [assistantIdLog, setAssistantIdLog] = useState("");
  const [activoLog, setActivoLog] = useState(false);
  const [showModalLogistica, setShowModalLogistica] = useState(false);

  // Ventas
  const [nombreBotVenta, setNombreBotVenta] = useState("");
  const [assistantIdVenta, setAssistantIdVenta] = useState("");
  const [activoVenta, setActivoVenta] = useState(false);
  const [productosVenta, setProductosVenta] = useState("");
  const [showModalVentas, setShowModalVentas] = useState(false);
  const [productosLista, setProductosLista] = useState([]);

  // Opción con check redondo tipo material
  /** Opción del menú con check elegante */
  const Option = (props) => {
    const { isSelected, label } = props;
    return (
      <components.Option {...props}>
        <div className="flex items-center gap-3">
          <span
            className={`flex items-center justify-center w-5 h-5 rounded-full border transition
              ${
                isSelected
                  ? "bg-gradient-to-br from-indigo-500 to-blue-500 border-indigo-500"
                  : "border-gray-300"
              }
            `}
          >
            {isSelected && (
              <svg width="12" height="12" viewBox="0 0 20 20" fill="#fff">
                <path d="M7.629 13.233L3.9 9.505l1.414-1.414 2.315 2.315 6.06-6.06 1.414 1.414z" />
              </svg>
            )}
          </span>
          <span className="truncate">{label}</span>
        </div>
      </components.Option>
    );
  };

  /** Chip premium (ocultamos el label interno y pintamos el nuestro) */
  const ChipContainer = (props) => {
    const { children, data } = props; // children ahora solo trae el botón de remove
    return (
      <div
        className="group flex items-center gap-2 mr-2 mb-2 rounded-2xl
                   bg-white/70 backdrop-blur-sm
                   border border-slate-200
                   shadow-[0_2px_8px_rgba(0,0,0,0.06)]
                   hover:shadow-[0_6px_16px_rgba(0,0,0,0.10)]
                   transition-all px-3 py-1.5"
      >
        <span
          className="text-[12px] font-semibold tracking-wide
                     bg-gradient-to-br from-indigo-600 to-blue-600 bg-clip-text text-transparent"
        >
          {data.label}
        </span>
        {children}
      </div>
    );
  };

  /** Botón de eliminar del chip más “clean” */
  const ChipRemove = (props) => (
    <components.MultiValueRemove {...props}>
      <div
        className="w-5 h-5 rounded-full grid place-items-center
                   text-slate-500 group-hover:text-white
                   group-hover:bg-rose-500 transition"
        aria-label="Quitar"
        title="Quitar"
      >
        ✕
      </div>
    </components.MultiValueRemove>
  );
  // Opciones para el select (no cambia tu data)
  // ✅ usa el campo correcto del backend
  const productosOptions = useMemo(
    () =>
      (productosLista || []).map((p) => ({
        value: String(p.id ?? p.id_producto), // prioriza 'id', cae a 'id_producto' si existiera
        label: p.nombre,
      })),
    [productosLista]
  );

  // sigue igual
  const selectedProductos = useMemo(() => {
    if (!productosVenta || typeof productosVenta !== "string") return [];
    const ids = productosVenta
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    return productosOptions.filter((opt) => ids.includes(opt.value));
  }, [productosVenta, productosOptions]);

  const handleProductosChange = (selected) => {
    const ids = (selected || []).map((s) => s.value);
    setProductosVenta(ids.join(",")); // mantienes CSV
  };

  useEffect(() => {
    const fetchProductos = async () => {
      const idc = localStorage.getItem("id_configuracion");
      if (!idc) {
        return Swal.fire({
          icon: "error",
          title: "Falta configuración",
          text: "No se encontró el ID de configuración",
        });
      }

      try {
        const prodRes = await chatApi.post("/productos/listarProductos", {
          id_configuracion: parseInt(idc),
        });
        setProductosLista(prodRes.data.data);
      } catch (error) {
        if (currentTab === "asistente") {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "No se pudo cargar la información de productos",
          });
        }
      }
    };

    if (currentTab === "asistente") {
      fetchProductos();
    }
  }, [currentTab]);

  /* seccion de asistente */

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

  useEffect(() => {
    const idp = localStorage.getItem("id_plataforma_conf");
    const idc = localStorage.getItem("id_configuracion");

    if (idc) setId_configuracion(parseInt(idc));

    // Validación para el valor 'null' en id_plataforma_conf
    if (idp === "null") {
      setId_plataforma_conf(null);
    } else {
      setId_plataforma_conf(idp ? parseInt(idp) : null);
    }
  }, []);

  const handleConnectWhatsApp = () => {
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
                id_plataforma: userData.data?.id_plataforma,
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

  const getCountryCode = (phone) => {
    if (phone.startsWith("+593") || phone.startsWith("09")) return "ec";
    if (phone.startsWith("+52")) return "mx";
    if (phone.startsWith("+57")) return "co";
  };

  const getTemplacecode = (template) => {
    if (template.startsWith("es") || template.startsWith("es_"))
      return "Español";
    if (template.startsWith("en") || template.startsWith("en_"))
      return "Inglés";
  };

  // cuando hagas clic en el ojito...
  const handleVerPlantilla = (plantilla) => {
    setPlantillaSeleccionada(plantilla);
    setVerModal(true);
  };

  const handleAbrirConfiguraciones = () => {
    setModalConfigOpen(true);
  };

  const handleAbrirEditarRespuesta = (respuesta) => {
    setRespuestaSeleccionada(respuesta);
    setModalEditarOpen(true);
  };

  const handleAbrirConfiguracionAutomatizada = () => {
    setModalConfiguracionAutomatizada(true);
  };

  // 1. Verificación de token y conexión al socket
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const decoded = jwtDecode(token);
    if (decoded.exp < Date.now() / 1000) {
      localStorage.clear(); // elimina todo
      window.location.href = "/login";
      return;
    }

    setUserData(decoded);

    // Conectar socket
    const socket = io(import.meta.env.VITE_socket, {
      transports: ["websocket", "polling"],
      secure: true,
    });

    socket.on("connect", () => {
      console.log("Conectado al servidor de WebSockets");
      socketRef.current = socket;
      setIsSocketConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("Desconectado del servidor de WebSockets");
      setIsSocketConnected(false);
    });
  }, []);

  // 2. Cargar Phone Numbers (solo cuando currentTab === "numbers")
  useEffect(() => {
    const fetchPhoneNumbers = async () => {
      if (!userData) return;
      try {
        const resp = await chatApi.post("/whatsapp_managment/ObtenerNumeros", {
          id_configuracion: id_configuracion,
        });
        setPhoneNumbers(resp.data.data || []);
      } catch (error) {
        console.error("Error al obtener phone_numbers:", error);
      }
    };

    if (currentTab === "numbers") {
      fetchPhoneNumbers();
    }
  }, [userData, currentTab, id_configuracion]);

  useEffect(() => {
    if (currentTab === "answers-fast") {
      fetchRespuestasRapidas();
    }
  }, [currentTab]);

  const fetchRespuestasRapidas = async () => {
    if (!userData) return;
    try {
      const response = await chatApi.post(
        "/whatsapp_managment/obtenerPlantillasPlataforma",
        {
          id_configuracion: id_configuracion,
        }
      );

      setRespuestasRapidas(response.data || []);
    } catch (error) {
      console.error("Error al cargar respuestas rápidas", error);
    }
  };

  const fetchConfiguracionAutomatizada = async () => {
    if (!userData) return;
    try {
      const response = await chatApi.post(
        "configuraciones/listar_configuraciones",
        {
          id_configuracion: id_configuracion,
        }
      );

      console.table(response.data);
      setConfiguracionAutomatizada(response.data.data || []);
    } catch (error) {
      if (error.response?.status === 403) {
        Swal.fire({
          icon: "error",
          title: error.response?.data?.message,
          text: "",
          allowOutsideClick: false,
          allowEscapeKey: false,
          allowEnterKey: true,
          confirmButtonText: "OK",
        }).then(() => {
          navigate("/planes_view");
        });
      } else {
        console.error("Error al cargar la configuración automatizada.", error);
        setConfiguracionAutomatizada([]);
      }
    }
  };

  const fetchAsistenteAutomatizado = async () => {
    if (!userData) return;
    try {
      const response = await chatApi.post("openai_assistants/info_asistentes", {
        id_configuracion: id_configuracion,
      });

      const data = response.data?.data || {};

      if (data.api_key_openai) {
        setExisteAsistente(data.api_key_openai);
      } else {
        setExisteAsistente(data.api_key_openai);
      }

      if (data.logistico) {
        setAsistenteLogistico(data.logistico);
      } else {
        setAsistenteLogistico(null);
      }

      if (data.ventas) {
        setAsistenteVentas(data.ventas);
      } else {
        setAsistenteVentas(null);
      }
    } catch (error) {
      console.error("Error al cargar los asistentes.", error);
      setAsistenteLogistico(null);
      setAsistenteVentas(null);
    }
  };

  useEffect(() => {
    if (asistenteLogistico) {
      setNombreBotLog(asistenteLogistico.nombre_bot || "");
      setAssistantIdLog(asistenteLogistico.assistant_id || "");
      setActivoLog(asistenteLogistico.activo);
    }

    if (asistenteVentas) {
      setNombreBotVenta(asistenteVentas.nombre_bot || "");
      setAssistantIdVenta(asistenteVentas.assistant_id || "");
      setActivoVenta(asistenteVentas.activo);
      setProductosVenta(asistenteVentas.productos || "");
    }
  }, [asistenteLogistico, asistenteVentas]);

  useEffect(() => {
    if (currentTab === "settings") {
      fetchConfiguracionAutomatizada();
    } else if (currentTab === "asistente") {
      fetchAsistenteAutomatizado();
    }
  }, [currentTab]);

  // ---------------------------
  // Función para cargar Plantillas
  // ---------------------------
  const fetchPlantillas = async () => {
    if (!userData || id_configuracion === null) return;

    try {
      const resp = await chatApi.post(
        "/whatsapp_managment/obtenerTemplatesWhatsapp",
        { id_configuracion: id_configuracion }
      );

      /*  La ruta Node devuelve el JSON crudo de Meta:
       {
         "data": [
           { id, name, language, category, status, components, … },
           …
         ],
         "paging": { … }
       }
    */
      setPlantillas(resp.data.data || []); // ← ahora viene en resp.data.data
    } catch (error) {
      console.error("Error al cargar las plantillas:", error);
      setStatusMessage({
        type: "error",
        text: "No se pudieron cargar las plantillas.",
      });
    }
  };

  // 3. Cargar Plantillas cuando currentTab === "templates"
  // Plantillas
  useEffect(() => {
    if (currentTab === "templates" && id_configuracion !== null) {
      fetchPlantillas();
    }
  }, [currentTab, id_configuracion]);

  // Tiempo de espera para que desaparezca el mensaje (4s)
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => {
        setStatusMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  const crearPlantillasAutomaticas = async () => {
    setCargandoPlantillas(true);
    try {
      const response = await chatApi.post(
        "/whatsapp_managment/crearPlantillasAutomaticas",
        {
          id_configuracion: id_configuracion,
        }
      );

      if (response.data.success) {
        setResultadoPlantillas(response.data.resultados || []);
        setModalResultadosAbierto(true);
        fetchPlantillas();
      } else {
        setStatusMessage({
          type: "error",
          text: "Hubo un error creando las plantillas.",
        });
      }
    } catch (error) {
      console.error("Error creando plantillas:", error);
      setStatusMessage({
        type: "error",
        text: "Error al conectar con el servidor.",
      });
    } finally {
      setCargandoPlantillas(false);
    }
  };

  // ---------------------------
  // Render de la tabla con “Numbers”
  // ---------------------------
  const renderNumbersTable = () => {
    return (
      <div className="mt-4 bg-white p-4 rounded shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            Números de teléfono
            <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-1 rounded">
              {phoneNumbers.length} Números
            </span>
          </h2>
          {/* Botón para agregar número (pendiente) */}
        </div>

        <div className="relative w-full overflow-visible-x-auto">
          <table className="min-w-full border bg-white shadow rounded-lg">
            <thead className="bg-gray-200 text-gray-700 text-sm">
              <tr>
                {/* NÚMEROS */}
                <th className="py-2 px-4 text-left">Números</th>
                {/* NOMBRE */}
                <th className="py-2 px-4 text-left relative group">
                  <div className="inline-flex items-center">
                    Nombre
                    <span className="ml-1 text-gray-400 hover:text-blue-500 cursor-pointer">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13 16h-1v-4h-1m1-4h.01M12 20.5c4.694 0 8.5-3.806 8.5-8.5s-3.806-8.5-8.5-8.5-8.5 3.806-8.5 8.5 3.806 8.5 8.5 8.5z"
                        />
                      </svg>
                    </span>
                  </div>
                  <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-gray-800 text-white text-xs rounded-md px-2 py-2 shadow-md z-50">
                    <strong>¿Quieres cambiar tu nombre para mostrar?</strong>
                    <p className="text-gray-200 text-justify">
                      El nombre para mostrar de WhatsApp Business es el nombre
                      de tu empresa que los clientes ven en tu perfil de
                      WhatsApp Business.
                    </p>
                    <div className="absolute left-1/2 transform -translate-x-1/2 bottom-0 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-900" />
                  </div>
                </th>
                {/* LÍMITE DE MENSAJES */}
                <th className="py-2 px-4 text-left relative group">
                  <div className="inline-flex items-center">
                    Límite de mensajes
                    <span className="ml-1 text-gray-400 hover:text-blue-500 cursor-pointer">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13 16h-1v-4h-1m1-4h.01M12 20.5c4.694 0 8.5-3.806 8.5-8.5s-3.806-8.5-8.5-8.5-8.5 3.806-8.5 8.5 3.806 8.5 8.5 8.5z"
                        />
                      </svg>
                    </span>
                  </div>
                  <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-gray-800 text-white text-xs rounded-md px-2 py-2 shadow-md z-50">
                    <strong>¿Qué es un límite de mensajes?</strong>
                    <p className="text-gray-200 text-justify">
                      Es el número máximo de conversaciones comerciales que
                      puedes iniciar en un periodo de 24 horas.
                    </p>
                    <div className="absolute left-1/2 transform -translate-x-1/2 bottom-0 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-900" />
                  </div>
                </th>
                {/* ESTADO */}
                <th className="py-2 px-4 text-left relative group">
                  <div className="inline-flex items-center">
                    Estado
                    <span className="ml-1 text-gray-400 hover:text-blue-500 cursor-pointer">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13 16h-1v-4h-1m1-4h.01M12 20.5c4.694 0 8.5-3.806 8.5-8.5s-3.806-8.5-8.5-8.5-8.5 3.806-8.5 8.5 3.806 8.5 8.5 8.5z"
                        />
                      </svg>
                    </span>
                  </div>
                  <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-gray-800 text-white text-xs rounded-md px-2 py-2 shadow-md z-50">
                    <strong>Conectado</strong>
                    <p className="text-gray-200 text-justify">
                      El número de teléfono está asociado a esta cuenta y
                      funciona correctamente.
                    </p>
                    <div className="absolute left-1/2 transform -translate-x-1/2 bottom-0 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-900" />
                  </div>
                </th>
                {/* CALIDAD */}
                <th className="py-2 px-4 text-left relative group">
                  <div className="inline-flex items-center">
                    Calidad
                    <span className="ml-1 text-gray-400 hover:text-blue-500 cursor-pointer">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13 16h-1v-4h-1m1-4h.01M12 20.5c4.694 0 8.5-3.806 8.5-8.5s-3.806-8.5-8.5-8.5-8.5 3.806-8.5 8.5 3.806 8.5 8.5 8.5z"
                        />
                      </svg>
                    </span>
                  </div>
                  <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-gray-800 text-white text-xs rounded-md px-2 py-2 shadow-md z-50">
                    <strong>Parámetros de calidad</strong>
                    <p className="text-gray-200 text-justify">
                      Se basa en la retroalimentación de los usuarios, como
                      bloqueos o reportes, en los últimos 7 días. Puede ser
                      verde (alta), amarillo (media) o rojo (baja).
                    </p>
                    <div className="absolute left-1/2 transform -translate-x-1/2 bottom-0 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-900" />
                  </div>
                </th>
              </tr>
            </thead>

            <tbody>
              {phoneNumbers.map((num, index) => (
                <tr key={index} className="border-t hover:bg-gray-50">
                  {/* Número */}
                  <td className="py-2 px-4">
                    <div className="flex items-center gap-2">
                      <img
                        src={`https://flagcdn.com/w40/${getCountryCode(
                          num.display_phone_number
                        )}.png`}
                        alt="bandera"
                        className="w-6 h-4 object-cover rounded-sm"
                      />
                      <span>{num.display_phone_number}</span>
                    </div>
                  </td>
                  {/* Nombre */}
                  <td className="py-2 px-4">{num.verified_name}</td>
                  {/* Límite de mensajes */}
                  <td className="py-2 px-4">
                    {(() => {
                      switch (num.messaging_limit_tier) {
                        case "TIER_250":
                          return "250 Clientes / 24 H";
                        case "TIER_500":
                          return "500 Clientes / 24 H";
                        case "TIER_1K":
                          return "1,000 Clientes / 24 H";
                        case "TIER_10K":
                          return "10,000 Clientes / 24 H";
                        case "TIER_100K":
                          return "100,000 Clientes / 24 H";
                        default:
                          return "Desconocido";
                      }
                    })()}
                  </td>
                  {/* Estado */}
                  <td className="py-2 px-4">
                    {num.status === "CONNECTED" ? (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                        CONECTADO
                      </span>
                    ) : (
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                        {num.status}
                      </span>
                    )}
                  </td>
                  {/* Calidad */}
                  <td className="py-2 px-4">
                    {num.quality_rating === "GREEN" ? (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                        VERDE
                      </span>
                    ) : num.quality_rating === "YELLOW" ? (
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                        AMARILLO
                      </span>
                    ) : num.quality_rating === "RED" ? (
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                        ROJO
                      </span>
                    ) : (
                      <span className="bg-gray-100 text-gray-800 text-[10px] px-2 py-1 rounded">
                        DESCONOCIDO
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ---------------------------
  // Render de la tabla de “Plantillas”
  // ---------------------------
  const renderTemplatesTable = () => {
    return (
      <div className="overflow-visible bg-white p-4 rounded shadow-md relative z-0">
        <div className="flex justify-between mb-4">
          <h2 className="text-lg font-semibold">Plantillas</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setMostrarModalPlantilla(true)}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-500"
            >
              + Crear Plantilla
            </button>
            <button
              onClick={crearPlantillasAutomaticas}
              className="bg-indigo-900 text-white px-4 py-2 rounded hover:bg-indigo-500 flex items-center justify-center min-w-[180px]"
              disabled={cargandoPlantillas}
            >
              {cargandoPlantillas ? (
                <>
                  <svg
                    className="animate-spin mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    ></path>
                  </svg>
                  Creando...
                </>
              ) : (
                "Crear Plantillas Recomendadas"
              )}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto"></div>
        <table className="min-w-full border bg-white shadow rounded-lg">
          <thead className="bg-gray-200 text-gray-700 text-sm">
            <tr>
              <th className="py-2 px-4 text-left">Nombre / Idioma</th>

              {/* CATEGORÍA */}
              <th className="py-2 px-4 text-left relative group">
                <div className="inline-flex items-center">
                  Categoría
                  <span className="ml-1 inline-block text-gray-400 hover:text-blue-500 cursor-pointer">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 16h-1v-4h-1m1-4h.01M12 20.5c4.694 0 8.5-3.806 8.5-8.5s-3.806-8.5-8.5-8.5-8.5 3.806-8.5 8.5 3.806 8.5 8.5 8.5z"
                      />
                    </svg>
                  </span>
                </div>
                <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-72 bg-gray-800 text-white text-[11px] rounded-md px-2 py-2 shadow-md z-50">
                  <strong>Categoría de plantillas</strong>
                  <p className="text-gray-200 text-justify">
                    <strong>MARKETING:</strong> Mensajes promocionales o
                    informativos.
                    <br />
                    <strong>UTILIDAD:</strong> Confirmaciones, recordatorios u
                    otros mensajes transaccionales.
                  </p>
                  <div className="absolute left-1/2 transform -translate-x-1/2 bottom-0 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-900" />
                </div>
              </th>

              <th className="py-2 px-4 text-left">Mensaje</th>

              {/* ESTADO */}
              <th className="py-2 px-4 text-left relative group">
                <div className="inline-flex items-center">
                  Estado
                  <span className="ml-1 inline-block text-gray-400 hover:text-blue-500 cursor-pointer">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 16h-1v-4h-1m1-4h.01M12 20.5c4.694 0 8.5-3.806 8.5-8.5s-3.806-8.5-8.5-8.5-8.5 3.806-8.5 8.5 3.806 8.5 8.5 8.5z"
                      />
                    </svg>
                  </span>
                </div>
                <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-72 bg-gray-800 text-white text-[11px] rounded-md px-2 py-2 shadow-md z-50">
                  <strong>Estado de aprobación</strong>
                  <p className="text-gray-200 text-justify">
                    <strong>APROBADA:</strong> Plantilla lista para usar.
                    <br />
                    <strong>PENDIENTE:</strong> Meta está revisando la
                    plantilla.
                    <br />
                    <strong>RECHAZADA:</strong> No cumple con las políticas de
                    uso.
                  </p>
                  <div className="absolute left-1/2 transform -translate-x-1/2 bottom-0 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-900" />
                </div>
              </th>

              <th className="py-2 px-4 text-left">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {plantillas.map((plantilla, index) => (
              <tr key={index} className="border-t hover:bg-gray-50">
                <td className="py-2 px-4">
                  <div className="font-semibold">{plantilla.name}</div>
                  <div className="text-gray-500">
                    {getTemplacecode(plantilla.language) || plantilla.language}
                  </div>
                </td>
                <td className="py-2 px-4">
                  {plantilla.category === "MARKETING" ? (
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                      MARKETING
                    </span>
                  ) : plantilla.category === "UTILITY" ? (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      UTILIDAD
                    </span>
                  ) : (
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                      DESCONOCIDO
                    </span>
                  )}
                </td>
                <td className="py-2 px-4 text-sm">
                  {plantilla.components.map((comp, i) => (
                    <div key={i} className="mb-2">
                      <strong>{comp.type}:</strong>{" "}
                      {comp.text ||
                        (comp.buttons
                          ? comp.buttons.map((b, j) => (
                              <div key={j}>• {b.text}</div>
                            ))
                          : "—")}
                    </div>
                  ))}
                </td>
                <td className="py-2 px-4">
                  {plantilla.status === "APPROVED" ? (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                      APROBADA
                    </span>
                  ) : plantilla.status === "PENDING" ? (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      PENDIENTE
                    </span>
                  ) : plantilla.status === "REJECTED" ? (
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                      RECHAZADA
                    </span>
                  ) : (
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                      DESCONOCIDO
                    </span>
                  )}
                </td>
                <td className="py-2 px-4">
                  {/* Ícono de ojo */}
                  <button
                    onClick={() => handleVerPlantilla(plantilla)}
                    className="text-blue-600 hover:text-blue-800 p-5"
                    title="Ver Plantilla"
                  >
                    {/* Usamos un SVG de “ojo” (por ejemplo) */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 inline"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  // ---------------------------
  // Render de la tabla de “Respuestas rápidas"
  // ---------------------------
  const renderAnswersFastTable = () => {
    return (
      <div className="overflow-visible bg-white p-4 rounded shadow-md relative z-0">
        <div className="flex justify-between mb-4">
          <h2 className="text-lg font-semibold">Respuestas rápidas</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setMostrarModalPlantillaRapida(true)}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-500"
            >
              + Agregar
            </button>
            <button
              onClick={handleAbrirConfiguraciones}
              className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-500"
            >
              <i className="bx bxs-file-doc text-"></i> Guía Generada
            </button>
          </div>
        </div>

        <table className="min-w-full border bg-white shadow rounded-lg">
          <thead className="bg-gray-200 text-gray-700 text-sm">
            <tr>
              {/* ATAJO */}
              <th className="py-2 px-4 text-left relative group">
                <div className="inline-flex items-center">
                  Atajo
                  <span className="ml-1 inline-block text-gray-400 hover:text-blue-500 cursor-pointer">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 16h-1v-4h-1m1-4h.01M12 20.5c4.694 0 8.5-3.806 8.5-8.5s-3.806-8.5-8.5-8.5-8.5 3.806-8.5 8.5 3.806 8.5 8.5 8.5z"
                      />
                    </svg>
                  </span>
                </div>
                <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 ml-14 mb-2 w-72 bg-gray-800 text-white text-[11px] rounded-md px-2 py-2 shadow-md z-50">
                  <p className="text-gray-200 text-justify">
                    Este será el nombre de tu respuesta rápida cuando desees
                    llamarla desde el chat con <strong>" / " </strong>
                  </p>
                  <div className="absolute left-1/2 transform -translate-x-1/2 bottom-0 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-900" />
                </div>
              </th>
              <th className="py-2 px-4 text-left">Mensaje</th>
              {/* Principal */}
              <th className="py-2 px-4 text-left relative group">
                <div className="inline-flex items-center">
                  Bienvenida
                  <span className="ml-1 inline-block text-gray-400 hover:text-blue-500 cursor-pointer">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 16h-1v-4h-1m1-4h.01M12 20.5c4.694 0 8.5-3.806 8.5-8.5s-3.806-8.5-8.5-8.5-8.5 3.806-8.5 8.5 3.806 8.5 8.5 8.5z"
                      />
                    </svg>
                  </span>
                </div>
                <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-72 bg-gray-800 text-white text-[11px] rounded-md px-2 py-2 shadow-md z-50">
                  <p className="text-gray-200 text-justify">
                    Al marcar como bienvenida a tu respuesta rápida, esta será
                    enviada a todos los clientes que te contacten por{" "}
                    <strong>primera vez.</strong>
                  </p>
                  <div className="absolute left-1/2 transform -translate-x-1/2 bottom-0 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-900" />
                </div>
              </th>
              <th className="py-2 px-4 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {respuestasRapidas.map((respuesta, index) => (
              <tr key={index} className="border-t hover:bg-gray-50">
                <td className="py-2 px-4">{respuesta.atajo}</td>
                <td className="py-2 px-4">{respuesta.mensaje}</td>
                <td className="py-2 px-10">
                  <input
                    type="checkbox"
                    checked={parseInt(respuesta.principal) === 1}
                    disabled={
                      parseInt(respuesta.principal) === 1
                        ? false
                        : respuestasRapidas.some(
                            (r) =>
                              parseInt(r.principal) === 1 &&
                              r.id_template !== respuesta.id_template
                          )
                    }
                    onChange={() => cambiarEstadoRespuesta(respuesta)}
                  />
                </td>
                <td className="py-2 px-4 flex gap-2">
                  <button
                    className="btn btn-sm bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded"
                    onClick={() => handleAbrirEditarRespuesta(respuesta)}
                  >
                    <i className="fa-solid fa-pencil"></i> Editar
                  </button>
                  <button
                    className="btn btn-sm bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded"
                    onClick={() => eliminarRespuesta(respuesta.id_template)}
                  >
                    <i className="fa-solid fa-trash-can"></i> Borrar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ---------------------------
  // Render de la tabla de “Configuraciones"
  // ---------------------------
  const renderSettingsTable = () => {
    return (
      <div className="overflow-visible bg-white p-4 rounded shadow-md relative z-0">
        <div className="flex justify-between mb-4">
          <h2 className="text-lg font-semibold">Conexiones </h2>
          {/* <div className="flex gap-2">
            {configuracionAutomatizada.length === 0 && (
              <>
                <button
                  onClick={() => handleAbrirConfiguracionAutomatizada(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-500"
                >
                  + Agregar configuración
                </button>

                <button
                  onClick={handleConnectWhatsApp}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-500"
                >
                  <i className="bx bxl-whatsapp"></i> Conectar WhatsApp
                </button>
              </>
            )}
          </div> */}
        </div>

        <table className="min-w-full border bg-white shadow rounded-lg">
          <thead className="bg-gray-200 text-gray-700 text-sm">
            <tr>
              {/* NOMBRE DE CONFIGURACIÓN */}
              <th className="py-2 px-4 text-left relative group">
                <div className="inline-flex items-center">
                  Nombre Configuración
                </div>
              </th>
              <th className="py-2 px-4 text-left">Teléfono</th>
              <th className="py-2 px-4 text-left">Webhook_url</th>
              <th className="py-2 px-4 text-left relative group">
                <div className="inline-flex items-center">
                  Método de Pago
                  <span className="ml-1 inline-block text-gray-400 hover:text-blue-500 cursor-pointer">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 16h-1v-4h-1m1-4h.01M12 20.5c4.694 0 8.5-3.806 8.5-8.5s-3.806-8.5-8.5-8.5-8.5 3.806-8.5 8.5 3.806 8.5 8.5 8.5z"
                      />
                    </svg>
                  </span>
                </div>
                <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-72 bg-gray-800 text-white text-[11px] rounded-md px-2 py-2 shadow-md z-50">
                  <p className="text-gray-200 text-justify">
                    Si en algún momento tienes un inconveniente con el pago de
                    la api, recuerda revisarlo dentro de tu portafolio en{" "}
                    <strong>Bussines Manager</strong> y posteriormente
                    habilitalo aquí.
                  </p>
                  <div className="absolute left-1/2 transform -translate-x-1/2 bottom-0 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-900" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {configuracionAutomatizada.map((respuesta, index) => (
              <tr key={index} className="border-t hover:bg-gray-50">
                <td className="py-2 px-4">{respuesta.nombre_configuracion}</td>
                <td className="py-2 px-4">{respuesta.telefono}</td>
                <td className="py-2 px-4">{respuesta.webhook_url}</td>
                <td className="py-2 px-10">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={parseInt(respuesta.metodo_pago) === 1}
                      onChange={() => handleSwitchMetodoPago(respuesta)}
                    />
                    <div
                      className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4
                 peer-focus:ring-blue-300 rounded-full peer dark:bg-gray-700
                 peer-checked:after:translate-x-full peer-checked:after:border-white
                 after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                 after:bg-white after:border-gray-300 after:border after:rounded-full
                 after:h-5 after:w-5 after:transition-all dark:border-gray-600
                 peer-checked:bg-blue-600"
                    />
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  /* seccion de asistente */

  const renderAsistenteTable = () => {
    const iaLogisticaConectada = !!asistenteLogistico;
    const iaVentasConectada = !!asistenteVentas;

    const estadoIA = (estado) => (estado ? "Conectado" : "Desconectado");
    const colorEstado = (estado) =>
      estado ? "text-green-600 bg-green-100" : "text-red-600 bg-red-100";

    const guardarApiKey = async (apiKeyInput) => {
      const response = await chatApi.post(
        "openai_assistants/actualizar_api_key_openai",
        {
          id_configuracion: id_configuracion,
          api_key: apiKeyInput,
        }
      );

      const data = response.data || {};

      if (data.status == "200") {
        setShowModal(false);
      }
    };

    const guardarLogistica = async () => {
      await chatApi.post("openai_assistants/actualizar_ia_logisctica", {
        id_configuracion: id_configuracion,
        nombre_bot: nombreBotLog,
        assistant_id: assistantIdLog,
        activo: activoLog,
      });
      setShowModalLogistica(false);
    };

    const guardarVentas = async () => {
      try {
        await chatApi.post("openai_assistants/actualizar_ia_ventas", {
          id_configuracion: id_configuracion,
          nombre_bot: nombreBotVenta,
          assistant_id: assistantIdVenta,
          productos: selectedProductos.map((p) => p.value), // 👈 array de strings
          activo: activoVenta,
        });
        setShowModalVentas(false);
      } catch (error) {
        console.error(error);
      }
    };

    return (
      <div className="overflow-visible bg-white p-4 rounded shadow-md relative z-0">
        <div className="flex justify-between mb-4 items-center">
          <h2 className="text-lg font-semibold">Asistente</h2>
          {existeAsistente ? (
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
              onClick={() => setShowModal(true)}
            >
              Editar API Key
            </button>
          ) : (
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
              onClick={() => setShowModal(true)}
            >
              Añadir API Key
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* IA Logística */}
          <div className="bg-white border rounded-lg shadow-md hover:shadow-lg p-6 relative">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-3">
                <i className="bx bxs-bot text-3xl text-blue-600"></i>
                <h3 className="text-xl font-bold">
                  {asistenteLogistico?.nombre_bot || "IA de Logística"}
                </h3>
              </div>
              <button
                onClick={() => setShowModalLogistica(true)}
                className="p-2 rounded-full hover:bg-blue-100 transition"
                title={asistenteLogistico ? "Editar" : "Añadir"}
              >
                <i
                  className={`bx ${
                    asistenteLogistico ? "bx-edit" : "bx-plus"
                  } text-3xl text-blue-600`}
                ></i>
              </button>
            </div>
            <p
              className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${colorEstado(
                iaLogisticaConectada
              )}`}
            >
              {estadoIA(iaLogisticaConectada)}
            </p>
          </div>

          {/* IA Ventas */}
          <div className="bg-white border rounded-lg shadow-md hover:shadow-lg p-6 relative">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-3">
                <i className="bx bxs-cart text-3xl text-green-600"></i>
                <h3 className="text-xl font-bold">
                  {asistenteVentas?.nombre_bot || "IA de Ventas"}
                </h3>
              </div>
              <button
                onClick={() => setShowModalVentas(true)}
                className="p-2 rounded-full hover:bg-green-100 transition"
                title={asistenteVentas ? "Editar" : "Añadir"}
              >
                <i
                  className={`bx ${
                    asistenteVentas ? "bx-edit" : "bx-plus"
                  } text-3xl text-green-600`}
                ></i>
              </button>
            </div>
            <p
              className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${colorEstado(
                iaVentasConectada
              )}`}
            >
              {estadoIA(iaVentasConectada)}
            </p>
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Añadir API Key</h3>
              <input
                type="text"
                value={existeAsistente}
                onChange={(e) => setExisteAsistente(e.target.value)}
                className="w-full border px-3 py-2 rounded mb-4"
                placeholder="Escribe tu API Key"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => guardarApiKey(existeAsistente)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* logistica */}
        {showModalLogistica && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">
                Configurar IA Logística
              </h3>

              <input
                type="text"
                placeholder="Nombre del Bot"
                value={nombreBotLog}
                onChange={(e) => setNombreBotLog(e.target.value)}
                className="w-full border px-3 py-2 rounded mb-3"
              />
              <input
                type="text"
                placeholder="Assistant ID"
                value={assistantIdLog}
                onChange={(e) => setAssistantIdLog(e.target.value)}
                className="w-full border px-3 py-2 rounded mb-3"
              />

              <label className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  checked={activoLog}
                  onChange={(e) => setActivoLog(e.target.checked)}
                />
                <span>Activo</span>
              </label>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowModalLogistica(false)}
                  className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarLogistica}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
        {/* logistica */}

        {/* ventas */}
        {showModalVentas && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">
                Configurar IA Ventas
              </h3>

              <input
                type="text"
                placeholder="Nombre del Bot"
                value={nombreBotVenta}
                onChange={(e) => setNombreBotVenta(e.target.value)}
                className="w-full border px-3 py-2 rounded mb-3"
              />
              <input
                type="text"
                placeholder="Assistant ID"
                value={assistantIdVenta}
                onChange={(e) => setAssistantIdVenta(e.target.value)}
                className="w-full border px-3 py-2 rounded mb-3"
              />
              {/* select multi de productos */}
              <Select
                isMulti
                options={productosOptions}
                value={selectedProductos}
                onChange={handleProductosChange}
                placeholder="Selecciona productos"
                className="w-full mb-3"
                classNamePrefix="react-select"
                menuPortalTarget={document.body}
                components={{
                  Option,
                  MultiValueContainer: ChipContainer, // chip custom
                  MultiValueLabel: () => null, // 👈 oculta el label interno (no se duplica)
                  MultiValueRemove: ChipRemove,
                  IndicatorSeparator: null,
                }}
                theme={(t) => ({
                  ...t,
                  borderRadius: 14,
                  colors: {
                    ...t.colors,
                    primary: "#4f46e5", // indigo-600
                    primary25: "#eef2ff", // indigo-100
                    neutral20: "#e5e7eb", // borde idle
                    neutral30: "#4f46e5", // borde hover
                  },
                })}
                styles={{
                  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                  control: (base, state) => ({
                    ...base,
                    minHeight: 54,
                    paddingLeft: 10,
                    paddingRight: 10,
                    borderRadius: 14,
                    borderColor: state.isFocused ? "#4f46e5" : "#e5e7eb",
                    boxShadow: state.isFocused
                      ? "0 0 0 6px rgba(79,70,229,.12)"
                      : "0 1px 2px rgba(0,0,0,.05)",
                    background: "linear-gradient(180deg,#ffffff,#fafafa)",
                    ":hover": { borderColor: "#4f46e5" },
                  }),
                  valueContainer: (base) => ({
                    ...base,
                    paddingTop: 8,
                    paddingBottom: 8,
                    gap: 6,
                    flexWrap: "wrap",
                  }),
                  placeholder: (base) => ({
                    ...base,
                    color: "#9ca3af",
                    fontSize: "0.95rem",
                  }),
                  menu: (base) => ({
                    ...base,
                    borderRadius: 16,
                    overflow: "hidden",
                    border: "1px solid #e5e7eb",
                    boxShadow:
                      "0 24px 48px -12px rgba(0,0,0,.25), 0 12px 24px -12px rgba(0,0,0,.15)",
                    marginTop: 10,
                    background: "linear-gradient(180deg,#ffffff,#fbfbfc)",
                  }),
                  menuList: (base) => ({
                    ...base,
                    padding: 8,
                    "::-webkit-scrollbar": { width: 8 },
                    "::-webkit-scrollbar-thumb": {
                      backgroundColor: "#e5e7eb",
                      borderRadius: 999,
                    },
                  }),
                  option: (base, state) => ({
                    ...base,
                    padding: "10px 14px",
                    borderRadius: 10,
                    margin: "2px 6px",
                    backgroundColor: state.isSelected
                      ? "#e0e7ff"
                      : state.isFocused
                      ? "#f3f4f6"
                      : "transparent",
                    color: "#111827",
                    cursor: "pointer",
                    transition:
                      "background-color .15s ease, transform .05s ease",
                    transform: state.isFocused ? "translateY(-1px)" : "none",
                  }),
                  multiValue: (base) => ({
                    ...base,
                    background: "transparent",
                    display: "flex",
                    alignItems: "center",
                  }),
                  multiValueRemove: (base) => ({
                    ...base,
                    padding: 0,
                    ":hover": { backgroundColor: "transparent" },
                  }),
                  dropdownIndicator: (base, state) => ({
                    ...base,
                    padding: 8,
                    transform: state.selectProps.menuIsOpen
                      ? "rotate(180deg)"
                      : undefined,
                    transition: "transform .2s ease",
                  }),
                  clearIndicator: (base) => ({
                    ...base,
                    padding: 8,
                    ":hover": { color: "#ef4444" },
                  }),
                }}
              />

              <label className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  checked={activoVenta}
                  onChange={(e) => setActivoVenta(e.target.checked)}
                />
                <span>Activo</span>
              </label>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowModalVentas(false)}
                  className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarVentas}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
        {/* ventas */}
      </div>
    );
  };

  /* seccion de asistente */

  /* seccion de vinculaciones */
  const [showModalVinculacionesImporsuit, setShowModalVinculacionesImporsuit] =
    useState(false);

  const openModalVinculacionesImporsuit = () =>
    setShowModalVinculacionesImporsuit(true);
  const closeModalVinculacionesImporsuit = () =>
    setShowModalVinculacionesImporsuit(false);

  const [usuarioImporsuit, setUsuarioImporsuit] = useState("");
  const [passwordImporsuit, setPasswordImporsuit] = useState("");
  const [cargandoImporsuit, setCargandoImporsuit] = useState(false);
  const [errorImporsuit, setErrorImporsuit] = useState("");

  const handleLoginImporsuit = async () => {
    setCargandoImporsuit(true);
    setErrorImporsuit("");

    try {
      const res = await chatApi.post("auth/validar_usuario_imporsuit", {
        usuario: usuarioImporsuit,
        password: passwordImporsuit,
        id_configuracion: id_configuracion,
      });

      if (res.status === 200) {
        Swal.fire({
          icon: "success",
          title: "Vinculación exitosa",
          text: "Se ha vinculado correctamente con Imporsuit",
          confirmButtonColor: "#3085d6",
        });
        setShowModalVinculacionesImporsuit(false);
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        setErrorImporsuit("Credenciales inválidas");
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Usuario o contraseña incorrectos",
          confirmButtonColor: "#d33",
        });
      } else {
        console.error("Error en la consulta:", error);
        Swal.fire({
          icon: "error",
          title: "Error de conexión",
          text: "No se pudo contactar con el servidor",
          confirmButtonColor: "#d33",
        });
      }
    } finally {
      setCargandoImporsuit(false);
    }
  };

  const renderVinculacionesTable = () => {
    return (
      <div className="overflow-visible bg-white p-4 rounded shadow-md relative z-0">
        {/* CARD */}
        <div
          onClick={() => {
            if (id_plataforma_conf === null) {
              openModalVinculacionesImporsuit();
            }
          }}
          className={`relative cursor-pointer max-w-56 mx-auto bg-white rounded-xl overflow-hidden shadow-lg transform transition duration-300 ${
            id_plataforma_conf === null
              ? "hover:scale-105 hover:shadow-2xl"
              : "opacity-90 cursor-default"
          }`}
        >
          {/* 🔘 Estado de vinculación */}
          <div className="absolute top-2 right-2 z-10">
            {id_plataforma_conf === null ? (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                🔴 Desconectado
              </span>
            ) : (
              <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                🟢 Conectado
              </span>
            )}
          </div>

          {/* Imagen */}
          <div className="bg-[#171931] flex justify-center items-center p-4">
            <img
              src={log_imporsuitImage}
              alt="Imporsuit Logo"
              className="w-60 h-30"
            />
          </div>

          {/* Título */}
          <div className="p-4 text-center">
            <h3 className="text-lg font-semibold text-gray-800">Imporsuit</h3>
          </div>
        </div>

        {/* MODAL */}
        {showModalVinculacionesImporsuit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative animate-fade-in">
              <button
                onClick={closeModalVinculacionesImporsuit}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-xl"
              >
                ✕
              </button>

              {/* Logo */}
              <div className="flex justify-center mb-4">
                <img
                  src={log_imporsuitImage}
                  alt="Imporsuit"
                  className="w-28 h-auto rounded-md"
                />
              </div>

              <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">
                Iniciar sesión en Imporsuit
              </h2>

              {/* Formulario */}
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Usuario"
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={usuarioImporsuit}
                  onChange={(e) => setUsuarioImporsuit(e.target.value)}
                />
                <input
                  type="password"
                  placeholder="Contraseña"
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={passwordImporsuit}
                  onChange={(e) => setPasswordImporsuit(e.target.value)}
                />

                {errorImporsuit && (
                  <p className="text-red-600 text-sm text-center">
                    {errorImporsuit}
                  </p>
                )}

                <button
                  onClick={handleLoginImporsuit}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md transition duration-200 disabled:opacity-50"
                  disabled={cargandoImporsuit}
                >
                  {cargandoImporsuit ? "Verificando..." : "Iniciar sesión"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  /* seccion de vinculaciones */

  // ---------------------------
  // Manejo de la creación de la plantilla
  // (Llamada al API y recarga las plantillas)
  // ---------------------------
  const handleCreatePlantilla = async (payload) => {
    try {
      const resp = await chatApi.post("/whatsapp_managment/CrearPlantilla", {
        ...payload,
        id_configuracion: id_configuracion,
      });
      if (resp.data.success) {
        setStatusMessage({
          type: "success",
          text: "Plantilla creada correctamente.",
        });
        // Recargamos la lista de plantillas
        await fetchPlantillas();
        // Cerramos el modal
        setMostrarModalPlantilla(false);
      } else {
        setStatusMessage({
          type: "error",
          text: "Error al crear la plantilla.",
        });
      }
    } catch (error) {
      console.error("Error en la creación:", error);
      setStatusMessage({
        type: "error",
        text: "Error al conectar con el servidor.",
      });
    }
  };

  const cambiarEstadoRespuesta = async (respuesta) => {
    const estado = parseInt(respuesta.principal) === 1 ? 0 : 1;

    try {
      const resp = await chatApi.put("/whatsapp_managment/cambiarEstado", {
        id_template: respuesta.id_template,
        estado,
      });

      if (resp.data.success) {
        setStatusMessage({
          type: "success",
          text: resp.data.message,
        });
        fetchRespuestasRapidas();
      } else {
        setStatusMessage({
          type: "error",
          text: resp.data.message || "Error al actualizar el estado.",
        });
      }
    } catch (err) {
      console.error("Error al cambiar estado:", err);
      setStatusMessage({
        type: "error",
        text: "Error al conectar con el servidor.",
      });
    }
  };

  const handleSwitchMetodoPago = async (configItem) => {
    // Si metodo_pago es 1, lo apagamos y viceversa
    const nuevoMetodoPago = parseInt(configItem.metodo_pago) === 1 ? 0 : 1;

    try {
      // Llamada al endpoint PUT
      const resp = await chatApi.put(
        "/whatsapp_managment/actualizarMetodoPago",
        {
          id: configItem.id, //
          metodo_pago: nuevoMetodoPago,
        }
      );

      if (resp.data.success) {
        // Muestra el mensaje que envía el backend (success)
        setStatusMessage({
          type: "success",
          text:
            resp.data.message || "Método de pago actualizado correctamente.",
        });

        // Vuelves a recargar la tabla de configuraciones
        fetchConfiguracionAutomatizada();
      } else {
        // Manejo de error interno de la API (pero no de conexión)
        setStatusMessage({
          type: "error",
          text: resp.data.message || "Error al actualizar el método de pago.",
        });
      }
    } catch (error) {
      console.error("Error al cambiar el método de pago:", error);
      setStatusMessage({
        type: "error",
        text: "Error al conectar con el servidor al cambiar método de pago.",
      });
    }
  };

  const eliminarRespuesta = async (id_template) => {
    try {
      const resp = await chatApi.delete(
        "/whatsapp_managment/eliminarPlantilla",
        {
          data: { id_template },
        }
      );

      if (resp.data.success) {
        setStatusMessage({
          type: "success",
          text: resp.data.message,
        });
        fetchRespuestasRapidas();
      } else {
        setStatusMessage({
          type: "error",
          text: resp.data.message || "Error al eliminar la plantilla",
        });
      }
    } catch (err) {
      console.error("Error al eliminar plantilla:", err);
      setStatusMessage({
        type: "error",
        text: "Error al conectar con el servidor",
      });
    }
  };

  const traducirErrorMeta = (error) => {
    const code = error?.error?.error_subcode;

    // Código conocido: idioma se está eliminando /plantilla
    if (code === 2388023) {
      return "No se puede crear esta plantilla por el momento. Ya existía anteriormente y fue eliminada. Intenta de nuevo en 1 minuto o usa un nombre distinto.";
    }

    // Otros errores genéricos
    return (
      error?.error?.error_user_msg ||
      error?.error?.message ||
      "Ocurrió un error desconocido."
    );
  };

  const ModalResultadosPlantillas = ({ resultados, onClose }) => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex justify-center items-center">
        <div className="bg-white w-[90%] md:w-[600px] max-h-[90%] overflow-y-auto rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">
            Resumen de las Plantillas Creadas
          </h2>
          {resultados.map((r, idx) => (
            <div key={idx} className="mb-3 p-3 border rounded bg-gray-50">
              <div className="font-bold">{r.nombre}</div>
              <div
                className={`text-sm ${
                  r.status === "success"
                    ? "text-green-600"
                    : r.status === "omitido"
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {r.status.toUpperCase()} -{" "}
                {r.mensaje ||
                  (r.error
                    ? traducirErrorMeta(r.error)
                    : "Plantilla creada exitósamente.")}
              </div>
            </div>
          ))}
          <button
            onClick={onClose}
            className="mt-4 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-0 mt-16">
      <h1 className="text-2xl font-bold mb-4 p-5">
        Administra tu Negocio de WhatsApp
      </h1>

      {/* Mensaje (toast) con z-index alto */}
      {statusMessage && (
        <div
          className={`fixed top-5 right-5 z-[9999] px-4 py-2 rounded shadow ${
            statusMessage.type === "success"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          <span>{statusMessage.text}</span>
          {statusMessage.extra && (
            <a
              href={statusMessage.extra}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-2 text-blue-700 underline font-medium"
            >
              Abrir chat de soporte
            </a>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="overflow-x-auto">
        <div className="flex gap-4 border-b border-gray-200 px-5 min-w-max">
          <button
            className={`pb-2 flex items-center gap-2 transition-colors duration-200 ${
              currentTab === "numbers"
                ? "text-blue-600 border-b-2 border-blue-600 font-semibold"
                : "text-gray-600 hover:text-blue-600"
            }`}
            onClick={() => setCurrentTab("numbers")}
          >
            <i className="fas fa-address-book"></i> Número
          </button>

          <button
            className={`pb-2 flex items-center gap-2 transition-colors duration-200 ${
              currentTab === "templates"
                ? "text-blue-600 border-b-2 border-blue-600 font-semibold"
                : "text-gray-600 hover:text-blue-600"
            }`}
            onClick={() => setCurrentTab("templates")}
          >
            <i className="fas fa-copy"></i> Plantillas
          </button>

          <button
            className={`pb-2 flex items-center gap-2 transition-colors duration-200 ${
              currentTab === "answers-fast"
                ? "text-blue-600 border-b-2 border-blue-600 font-semibold"
                : "text-gray-600 hover:text-blue-600"
            }`}
            onClick={() => setCurrentTab("answers-fast")}
          >
            <i className="fas fa-bolt"></i> Respuestas rápidas
          </button>

          {/* <button
            className={`pb-2 flex items-center gap-2 transition-colors duration-200 ${
              currentTab === "asistente"
                ? "text-blue-600 border-b-2 border-blue-600 font-semibold"
                : "text-gray-600 hover:text-blue-600"
            }`}
            onClick={() => setCurrentTab("asistente")}
          >
            <i className="fas fa-cog"></i> Asistentes
          </button> */}

          {/* <button
            className={`pb-2 flex items-center gap-2 transition-colors duration-200 ${
              currentTab === "vinculaciones"
                ? "text-blue-600 border-b-2 border-blue-600 font-semibold"
                : "text-gray-600 hover:text-blue-600"
            }`}
            onClick={() => setCurrentTab("vinculaciones")}
          >
            <i className="fa-solid fa-puzzle-piece"></i> Vinculaciones
          </button> */}

          <button
            className={`pb-2 flex items-center gap-2 transition-colors duration-200 ${
              currentTab === "settings"
                ? "text-blue-600 border-b-2 border-blue-600 font-semibold"
                : "text-gray-600 hover:text-blue-600"
            }`}
            onClick={() => setCurrentTab("settings")}
          >
            <i className="bx bxs-plug"></i> Conexiones
          </button>
        </div>
      </div>

      <div className="p-5">
        {currentTab === "numbers" && renderNumbersTable()}
        {currentTab === "templates" && renderTemplatesTable()}
        {currentTab === "answers-fast" && renderAnswersFastTable()}
        {currentTab === "settings" && renderSettingsTable()}
        {currentTab === "asistente" && renderAsistenteTable()}
        {currentTab === "vinculaciones" && renderVinculacionesTable()}
      </div>

      {mostrarModalPlantilla && (
        <CrearPlantillaModal
          onClose={() => setMostrarModalPlantilla(false)}
          onCreate={handleCreatePlantilla}
        />
      )}

      {mostrarModalPlantillaRapida && (
        <CrearPlantillaRapidaModal
          onClose={() => setMostrarModalPlantillaRapida(false)}
          onSuccess={fetchRespuestasRapidas}
          setStatusMessage={setStatusMessage}
        />
      )}

      {verModal && (
        <VerPlantillaModal
          plantilla={plantillaSeleccionada}
          onClose={() => setVerModal(false)}
        />
      )}

      {modalEditarOpen && (
        <EditarPlantillaRapidaModal
          respuesta={respuestaSeleccionada}
          onClose={() => setModalEditarOpen(false)}
          onSuccess={fetchRespuestasRapidas}
          setStatusMessage={setStatusMessage}
        />
      )}

      {modalConfigOpen && (
        <VerPlantillaGuiasGeneradas
          respuestas={respuestasRapidas}
          onClose={() => setModalConfigOpen(false)}
          setStatusMessage={setStatusMessage}
        />
      )}

      {ModalConfiguracionAutomatizada && (
        <CrearConfiguracionModal
          onClose={() => setModalConfiguracionAutomatizada(false)}
          fetchConfiguraciones={fetchConfiguracionAutomatizada}
          setStatusMessage={setStatusMessage}
        />
      )}

      {modalResultadosAbierto && (
        <ModalResultadosPlantillas
          resultados={resultadoPlantillas}
          onClose={() => setModalResultadosAbierto(false)}
        />
      )}
    </div>
  );
};

export default AdministradorPlantillas2;
