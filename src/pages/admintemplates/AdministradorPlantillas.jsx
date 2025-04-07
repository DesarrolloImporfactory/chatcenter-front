import React, { useEffect, useRef, useState } from "react";
import chatApi from "../../api/chatcenter";
import Cabecera from "../../components/chat/Cabecera";
import CrearPlantillaModal from "./CrearPlantillaModal";
import VerPlantillaModal from "./VerPlantillaModal";

import { jwtDecode } from "jwt-decode";
import io from "socket.io-client";

const AdministradorPlantillas = () => {
  const [currentTab, setCurrentTab] = useState("numbers");
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [plantillas, setPlantillas] = useState([]);
  const [userData, setUserData] = useState(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

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
        const resp = await chatApi.post("/whatsapp_managment/obtener_numeros", {
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
                <th className="py-2 px-4 text-left">Números</th>
                <th className="py-2 px-4 text-left">Nombre</th>
                <th className="py-2 px-4 text-left">Límite de mensajes</th>
                <th className="py-2 px-4 text-left">Estado</th>
                <th className="py-2 px-4 text-left">Calidad</th>
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
              <th className="py-2 px-4 text-left">Categoría</th>
              <th className="py-2 px-4 text-left">Mensaje</th>
              <th className="py-2 px-4 text-left">Estado</th>
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
                    className="text-blue-600 hover:text-blue-800"
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
  // Manejo de la creación de la plantilla
  // (Llamada al API y recarga las plantillas)
  // ---------------------------
  const handleCreatePlantilla = async (payload) => {
    try {
      const resp = await chatApi.post("/whatsapp_managment/crear_plantilla", {
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
      </div>

      <div className="p-5">
        {currentTab === "numbers" && renderNumbersTable()}
        {currentTab === "templates" && renderTemplatesTable()}
      </div>

      {mostrarModalPlantilla && (
        <CrearPlantillaModal
          onClose={() => setMostrarModalPlantilla(false)}
          onCreate={handleCreatePlantilla}
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
