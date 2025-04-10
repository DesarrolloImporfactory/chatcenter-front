import React, { useEffect, useRef, useState } from "react";
import chatApi from "../../api/chatcenter";
import Cabecera from "../../components/chat/Cabecera";
import CrearPlantillaModal from "./CrearPlantillaModal";
import VerPlantillaModal from "./VerPlantillaModal";
import CrearPlantillaRapidaModal from "./CrearPlantillaRapidaModal";

import { jwtDecode } from "jwt-decode";
import io from "socket.io-client";

const AdministradorPlantillas = () => {
  const [currentTab, setCurrentTab] = useState("numbers");
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [plantillas, setPlantillas] = useState([]);
  const [userData, setUserData] = useState(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const [respuestasRapidas, setRespuestasRapidas] = useState([]);
  const [modalConfigOpen, setModalConfigOpen] = useState(false);
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [respuestaSeleccionada, setRespuestaSeleccionada] = useState(null);

  //Mostrar modal plantillas rapidas
  const [mostrarModalPlantillaRapida, setMostrarModalPlantillaRapida] = useState(false);

  const [opciones, setOpciones] = useState(false);
  const [etiquetasMenuOpen, setEtiquetasMenuOpen] = useState(false);

  // Estado para mostrar el modal de crear plantilla
  const [mostrarModalPlantilla, setMostrarModalPlantilla] = useState(false);

  //Manejar el estado de plantilla seleccionada
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState(null);
  const [verModal, setVerModal] = useState(false);

  const toggleCrearEtiquetaModal = () => {};
  const toggleAsginarEtiquetaModal = () => {};
  const handleOpciones = () => setOpciones((prev) => !prev);

  const cargar_socket = () => {};
  const selectedChat = null;
  const setSelectedChat = () => {};
  const tagList = [];
  const tagListAsginadas = [];
  const animateOut = false;
  const socketRef = useRef(null);

  const getCountryCode = (phone) => {
    if (phone.startsWith("+593") || phone.startsWith("09")) return "ec";
    if (phone.startsWith("+52")) return "mx";
    if (phone.startsWith("+57")) return "co";
  };

  const getTemplacecode = (template) => {
    if (template.startsWith("es") || template.startsWith("es_")) return "Español";
    if (template.startsWith("en") || template.startsWith("en_")) return "Inglés";
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
  
  // 1. Verificación de token y conexión al socket
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const decoded = jwtDecode(token);
    if (decoded.exp < Date.now() / 1000) {
      localStorage.removeItem("token");
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
          id_plataforma: userData.plataforma,
        });
        setPhoneNumbers(resp.data.data || []);
      } catch (error) {
        console.error("Error al obtener phone_numbers:", error);
      }
    };

    if (currentTab === "numbers") {
      fetchPhoneNumbers();
    }
  }, [userData, currentTab]);
  
  useEffect(() => {
    if (currentTab === "answers-fast") {
      fetchRespuestasRapidas();
    }
  }, [currentTab]);


  const fetchRespuestasRapidas = async () => {
    if (!userData) return;
    try {
      const response = await chatApi.post("/whatsapp_managment/obtenerPlantillasPlataforma", {
        id_plataforma: userData.plataforma,
      });
  
      setRespuestasRapidas(response.data || []);
    } catch (error) {
      console.error("Error al cargar respuestas rápidas", error);
    }
  };
  
  
  // ---------------------------
  // Función para cargar Plantillas
  // ---------------------------
  const fetchPlantillas = async () => {
    if (!userData) return;
    try {
      const formData = new FormData();
      formData.append("id_plataforma", userData.plataforma);
      const response = await fetch(
        "https://desarrollo.imporsuitpro.com/Pedidos/obtener_plantillas_whatsapp",
        {
          method: "POST",
          body: formData,
        }
      );
      const response_data = await response.json();
      setPlantillas(response_data.data || []);
    } catch (error) {
      console.error("Error al cargar las plantillas", error);
    }
  };

  // 3. Cargar Plantillas cuando currentTab === "templates"
  useEffect(() => {
    if (currentTab === "templates") {
      fetchPlantillas();
    }
  }, [currentTab]);

  // Tiempo de espera para que desaparezca el mensaje (4s)
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => {
        setStatusMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

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
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M12 20.5c4.694 0 8.5-3.806 8.5-8.5s-3.806-8.5-8.5-8.5-8.5 3.806-8.5 8.5 3.806 8.5 8.5 8.5z" />
                      </svg>
                    </span>
                  </div>
                  <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-gray-800 text-white text-xs rounded-md px-2 py-2 shadow-md z-50">
                    <strong>¿Quieres cambiar tu nombre para mostrar?</strong>
                    <p className="text-gray-200 text-justify">
                      El nombre para mostrar de WhatsApp Business es el nombre de tu empresa que los clientes ven en tu perfil de WhatsApp Business.
                    </p>
                    <div className="absolute left-1/2 transform -translate-x-1/2 bottom-0 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-900" />
                  </div>
                </th>
                {/* LÍMITE DE MENSAJES */}
                <th className="py-2 px-4 text-left relative group">
                      <div className="inline-flex items-center">
                        Límite de mensajes
                        <span className="ml-1 text-gray-400 hover:text-blue-500 cursor-pointer">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M12 20.5c4.694 0 8.5-3.806 8.5-8.5s-3.806-8.5-8.5-8.5-8.5 3.806-8.5 8.5 3.806 8.5 8.5 8.5z" />
                          </svg>
                        </span>
                      </div>
                      <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-gray-800 text-white text-xs rounded-md px-2 py-2 shadow-md z-50">
                        <strong>¿Qué es un límite de mensajes?</strong>
                        <p className="text-gray-200 text-justify">
                          Es el número máximo de conversaciones comerciales que puedes iniciar en un periodo de 24 horas.
                        </p>
                        <div className="absolute left-1/2 transform -translate-x-1/2 bottom-0 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-900" />
                      </div>
                </th>
                {/* ESTADO */}
                <th className="py-2 px-4 text-left relative group">
                  <div className="inline-flex items-center">
                    Estado
                    <span className="ml-1 text-gray-400 hover:text-blue-500 cursor-pointer">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M12 20.5c4.694 0 8.5-3.806 8.5-8.5s-3.806-8.5-8.5-8.5-8.5 3.806-8.5 8.5 3.806 8.5 8.5 8.5z" />
                      </svg>
                    </span>
                  </div>
                  <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-gray-800 text-white text-xs rounded-md px-2 py-2 shadow-md z-50">
                    <strong>Conectado</strong>
                    <p className="text-gray-200 text-justify">
                      El número de teléfono está asociado a esta cuenta y funciona correctamente.
                    </p>
                    <div className="absolute left-1/2 transform -translate-x-1/2 bottom-0 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-900" />
                  </div>
                </th>
                {/* CALIDAD */}
                <th className="py-2 px-4 text-left relative group">
                  <div className="inline-flex items-center">
                    Calidad
                    <span className="ml-1 text-gray-400 hover:text-blue-500 cursor-pointer">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M12 20.5c4.694 0 8.5-3.806 8.5-8.5s-3.806-8.5-8.5-8.5-8.5 3.806-8.5 8.5 3.806 8.5 8.5 8.5z" />
                      </svg>
                    </span>
                  </div>
                  <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-gray-800 text-white text-xs rounded-md px-2 py-2 shadow-md z-50">
                    <strong>Parámetros de calidad</strong>
                    <p className="text-gray-200 text-justify">
                      Se basa en la retroalimentación de los usuarios, como bloqueos o reportes, en los últimos 7 días. Puede ser verde (alta), amarillo (media) o rojo (baja).
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
                        src={`https://flagcdn.com/w40/${getCountryCode(num.display_phone_number)}.png`}
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
          <button
            onClick={() => setMostrarModalPlantilla(true)}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-500"
          >
            + Crear Plantilla
          </button>
        </div>
        <table className="min-w-full border bg-white shadow rounded-lg">
          <thead className="bg-gray-200 text-gray-700 text-sm">
            <tr>
              <th className="py-2 px-4 text-left">Nombre / Idioma</th>

              {/* CATEGORÍA */}
              <th className="py-2 px-4 text-left relative group">
                <div className="inline-flex items-center">
                  Categoría
                  <span className="ml-1 inline-block text-gray-400 hover:text-blue-500 cursor-pointer">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M12 20.5c4.694 0 8.5-3.806 8.5-8.5s-3.806-8.5-8.5-8.5-8.5 3.806-8.5 8.5 3.806 8.5 8.5 8.5z" />
                    </svg>
                  </span>
                </div>
                <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-72 bg-gray-800 text-white text-[11px] rounded-md px-2 py-2 shadow-md z-50">
                  <strong>Categoría de plantillas</strong>
                  <p className="text-gray-200 text-justify">
                    <strong>MARKETING:</strong> Mensajes promocionales o informativos.<br />
                    <strong>UTILIDAD:</strong> Confirmaciones, recordatorios u otros mensajes transaccionales.
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
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M12 20.5c4.694 0 8.5-3.806 8.5-8.5s-3.806-8.5-8.5-8.5-8.5 3.806-8.5 8.5 3.806 8.5 8.5 8.5z" />
                    </svg>
                  </span>
                </div>
                <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-72 bg-gray-800 text-white text-[11px] rounded-md px-2 py-2 shadow-md z-50">
                  <strong>Estado de aprobación</strong>
                  <p className="text-gray-200 text-justify">
                    <strong>APROBADA:</strong> Plantilla lista para usar.<br />
                    <strong>PENDIENTE:</strong> Meta está revisando la plantilla.<br />
                    <strong>RECHAZADA:</strong> No cumple con las políticas de uso.
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
              <i className="fas fa-plus mr-1"></i> Agregar
            </button>
            <button
              onClick={handleAbrirConfiguraciones}
              className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-500"
            >
              <i className="fas fa-cog mr-1"></i> Configuraciones
            </button>
          </div>
        </div>
  
        <table className="min-w-full border bg-white shadow rounded-lg">
          <thead className="bg-gray-200 text-gray-700 text-sm">
            <tr>
              <th className="py-2 px-4 text-left">Atajo</th>
              <th className="py-2 px-4 text-left">Mensaje</th>
              <th className="py-2 px-4 text-left">Principal</th>
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
                    disabled={parseInt(respuesta.principal) === 1 ? false : respuestasRapidas.some(r => parseInt(r.principal) === 1 && r.id_template !== respuesta.id_template)}
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
  // Manejo de la creación de la plantilla
  // (Llamada al API y recarga las plantillas)
  // ---------------------------
  const handleCreatePlantilla = async (payload) => {
    try {
      const resp = await chatApi.post("/whatsapp_managment/CrearPlantilla", {
        ...payload,
        id_plataforma: userData.plataforma,
      });
      if (resp.data.success) {
        setStatusMessage({
          type: "success",
          text: "Plantilla creada correctamente."
        });
        // Recargamos la lista de plantillas
        await fetchPlantillas();
        // Cerramos el modal
        setMostrarModalPlantilla(false);
      } else {
        setStatusMessage({
          type: "error",
          text: "Error al crear la plantilla."
        });
      }
    } catch (error) {
      console.error("Error en la creación:", error);
      setStatusMessage({
        type: "error",
        text: "Error al conectar con el servidor."
      });
    }
  };


const cambiarEstadoRespuesta = async(respuesta) =>{
  const estado = parseInt(respuesta.principal) === 1 ? 0 : 1;

  try {
    const resp = await chatApi.put("/whatsapp_managment/cambiarEstado",{
      id_template: respuesta.id_template,
      estado,
    });

    if (resp.data.success){
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
  } catch(err){
    console.error("Error al cambiar estado:", err);
    setStatusMessage({
      type: "error",
      text: "Error al conectar con el servidor.",
    });
  }
}


const eliminarRespuesta = async(id_template) =>{
  try{
    const resp = await chatApi.delete("/whatsapp_managment/eliminarPlantilla", {
      data: {id_template}
    });

    if (resp.data.success){
      setStatusMessage({
        type: "success",
        text: resp.data.message,
      });
      fetchRespuestasRapidas();
    } else{
      setStatusMessage({
        type: "error",
        text: resp.data.message || "Error al eliminar la plantilla"
      });
    }
  }catch(err){
    console.error("Error al eliminar plantilla:", err);
    setStatusMessage({
      type: "error",
      text: "Error al conectar con el servidor",
    });
  }
}
  

  return (
    <div className="p-0">
      {/* Cabecera de tu chat */}
      <Cabecera
        userData={userData}
        chatMessages={[]}
        opciones={opciones}
        setOpciones={setOpciones}
        handleOpciones={handleOpciones}
        selectedChat={selectedChat}
        setSelectedChat={setSelectedChat}
        animateOut={animateOut}
        toggleCrearEtiquetaModal={toggleCrearEtiquetaModal}
        setEtiquetasMenuOpen={setEtiquetasMenuOpen}
        etiquetasMenuOpen={etiquetasMenuOpen}
        toggleAsginarEtiquetaModal={toggleAsginarEtiquetaModal}
        tagListAsginadas={tagListAsginadas}
        tagList={tagList}
        cargar_socket={cargar_socket}
      />

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
          {statusMessage.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 px-5">
        <button
          className={`pb-2 ${
            currentTab === "numbers"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-blue-600"
          }`}
          onClick={() => setCurrentTab("numbers")}
        >
          Números
        </button>

        <button
          className={`pb-2 ${
            currentTab === "templates"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-blue-600"
          }`}
          onClick={() => setCurrentTab("templates")}
        >
          Plantillas
        </button>

        <button
          className={`pb-2 ${
            currentTab === "answers-fast"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-blue-600"
          }`}
          onClick={() => setCurrentTab("answers-fast")}
        >
          Respuestas rápidas
        </button>
      </div>

      <div className="p-5">
        {currentTab === "numbers" && renderNumbersTable()}
        {currentTab === "templates" && renderTemplatesTable()}
        {currentTab === "answers-fast" && renderAnswersFastTable()}
      </div>

      {mostrarModalPlantilla && (
        <CrearPlantillaModal
          onClose={() => setMostrarModalPlantilla(false)}
          onCreate={handleCreatePlantilla}
        />
      )}
      
      {mostrarModalPlantillaRapida && (
        <CrearPlantillaRapidaModal
          idPlataforma={userData.plataforma}
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
    </div>
  );
};

export default AdministradorPlantillas;
