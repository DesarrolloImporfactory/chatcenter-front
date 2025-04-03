import React, { useEffect, useRef, useState } from "react";
import chatApi from "../../api/chatcenter";
import Cabecera from "../../components/chat/Cabecera";
// Asegúrate de instalar y usar la librería apropiada para jwtDecode.
// Aquí se ha usado "jwt-decode" como librería, revisa que coincida con tu import real.
import {jwtDecode} from "jwt-decode";
import io from "socket.io-client";

const AdministradorPlantillas = () => {
  const [currentTab, setCurrentTab] = useState("numbers");
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [plantillas, setPlantillas] = useState([]);
  const [userData, setUserData] = useState(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  const [opciones, setOpciones] = useState(false);
  const [etiquetasMenuOpen, setEtiquetasMenuOpen] = useState(false);

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

  const getCountryCode = (phone) =>{
    if (phone.startsWith("+593") || phone.startsWith("09")) return "ec";
    if (phone.startsWith("+52")) return "mx";
    if (phone.startsWith("+57")) return "co";
  }

  const getTemplacecode = (template) =>{
    if (template.startsWith("es") || template.startsWith("es_")) return "Español"
    if (template.startsWith("en") || template.startsWith("en_")) return "Inglés"
  }

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
        const resp = await chatApi.post("/whatsapp_numbers/obtener_numeros", {
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

  // 3. Cargar Plantillas (solo cuando currentTab === "templates")
  useEffect(() => {
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

    if (currentTab === "templates") {
      fetchPlantillas();
    }
  }, [userData, currentTab]);

  // Render de la tabla con los “Numbers”
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
          {/* <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-500"
            onClick={() => alert("Add Number (por implementar)")}
          >
            + Add Number
          </button> */}
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
                    {/* Ícono (información) */}
                    <span className="ml-1 inline-block text-gray-400 hover:text-blue-500 cursor-pointer">
                      {/* Puedes usar un SVG, un ícono de tu preferencia, etc. */}
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
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

                  {/* Tooltip: se muestra ARRIBA */}
                  <div
                  className="
                  hidden
                  text-[12px]
                  group-hover:block
                  absolute
                  bottom-full
                  left-1/2
                  transform
                  -translate-x-1/2
                  mb-2
                  w-80               /* MENOS ancho */
                  bg-gray-800        /* Color un poco más oscuro */
                  text-white
                  text-xs            /* Fuente más pequeña */
                  rounded-md
                  px-1             /* Menos padding horizontal */
                  py-2               /* Menos padding vertical */
                  shadow-md          /* Sombra más sutil (md en vez de xl) */
                  z-50               /* Asegúrate de que aparezca delante */
                "
                  >
                    <strong>
                      ¿Quieres cambiar tu nombre para mostrar?
                    </strong>
                    <p className="text-gray-200 text-justify">
                      El nombre para mostrar de WhatsApp Business es el nombre
                      de tu empresa que los clientes ven en tu perfil de WhatsApp
                      Business.
                    </p>
                    {/* Flecha (apuntando hacia abajo) */}
                    <div
                      className="
                        absolute
                        left-1/2
                        transform
                        -translate-x-1/2
                        bottom-0
                        w-0
                        h-0
                        border-l-8
                        border-r-8
                        border-t-8
                        border-l-transparent
                        border-r-transparent
                        border-t-gray-900
                      "
                    />
                  </div>
                </th>

                {/* LÍMITE DE MENSAJES */}
                <th className="py-2 px-4 text-left relative group">
                  <div className="inline-flex items-center">
                    Límite de mensajes
                    <span className="ml-1 inline-block text-gray-400 hover:text-blue-500 cursor-pointer">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
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

                  <div
                  className="
                    hidden
                    text-[12px]
                    group-hover:block
                    absolute
                    bottom-full
                    left-1/2
                    transform
                    -translate-x-1/2
                    mb-2
                    w-80               /* MENOS ancho */
                    bg-gray-800        /* Color un poco más oscuro */
                    text-white
                    text-xs            /* Fuente más pequeña */
                    rounded-md
                    px-1             /* Menos padding horizontal */
                    py-2               /* Menos padding vertical */
                    shadow-md          /* Sombra más sutil (md en vez de xl) */
                    z-50               /* Asegúrate de que aparezca delante */
                  "
                  >
                    <strong>
                      ¿Qué es un límite de mensajes?
                    </strong>
                    <p className="text-gray-200 text-justify">
                      El límite de mensajes es el número máximo de conversaciones
                      comerciales que puedes iniciar en un periodo de 24 horas.
                    </p>
                    <div
                      className="
                        absolute
                        left-1/2
                        transform
                        -translate-x-1/2
                        bottom-0
                        w-0
                        h-0
                        border-l-8
                        border-r-8
                        border-t-8
                        border-l-transparent
                        border-r-transparent
                        border-t-gray-900
                      "
                    />
                  </div>
                </th>

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
                        xmlns="http://www.w3.org/2000/svg"
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

                  <div
                  className="
                    hidden
                    text-[12px]
                    group-hover:block
                    absolute
                    bottom-full
                    left-1/2
                    transform
                    -translate-x-1/2
                    mb-2
                    w-80               /* MENOS ancho */
                    bg-gray-800        /* Color un poco más oscuro */
                    text-white
                    text-xs            /* Fuente más pequeña */
                    rounded-md
                    px-1             /* Menos padding horizontal */
                    py-2               /* Menos padding vertical */
                    shadow-md          /* Sombra más sutil (md en vez de xl) */
                    z-50               /* Asegúrate de que aparezca delante */
                  "
                  >
                    <strong>Conectado</strong>
                    <p className="text-gray-200 text-justify">
                    El número de teléfono está asociado a esta cuenta y funciona correctamente.
                    </p>
                    <div
                      className="
                        absolute
                        left-1/2
                        transform
                        -translate-x-1/2
                        bottom-0
                        w-0
                        h-0
                        border-l-8
                        border-r-8
                        border-t-8
                        border-l-transparent
                        border-r-transparent
                        border-t-gray-900
                      "
                    />
                  </div>
                </th>

                {/* CALIDAD */}
                <th className="py-2 px-4 text-left relative group">
                  <div className="inline-flex items-center">
                    Calidad
                    <span className="ml-1 inline-block text-gray-400 hover:text-blue-500 cursor-pointer">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
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

                  <div
                  className="
                    hidden
                    text-[12px]
                    group-hover:block
                    absolute
                    bottom-full
                    left-1/2
                    transform
                    -translate-x-1/2
                    mb-2
                    w-80               /* MENOS ancho */
                    bg-gray-800        /* Color un poco más oscuro */
                    text-white
                    text-xs            /* Fuente más pequeña */
                    rounded-md
                    px-1             /* Menos padding horizontal */
                    py-2               /* Menos padding vertical */
                    shadow-md          /* Sombra más sutil (md en vez de xl) */
                    z-50               /* Asegúrate de que aparezca delante */
                  "
                  >
                    <strong>Parametros de calidad</strong>
                    <p className="text-gray-200 text-justify">
                      La calificación de calidad se basa en la recepción de los
                      mensajes por parte de los destinatarios durante los últimos
                      siete días y se pondera por su antigüedad. Se determina a
                      partir de la retroalimentación de los usuarios, como
                      bloqueos, informes y las razones que dan al bloquear una
                      empresa.
                    </p>
                    <ul className="text-gray-200 mt-2 space-y-1">
                      <li>
                        <strong>Verde:</strong> Alta calidad
                      </li>
                      <li>
                        <strong>Amarillo:</strong> Calidad media
                      </li>
                      <li>
                        <strong>Rojo:</strong> Baja calidad
                      </li>
                    </ul>
                    <div
                      className="
                        absolute
                        left-1/2
                        transform
                        -translate-x-1/2
                        bottom-0
                        w-0
                        h-0
                        border-l-8
                        border-r-8
                        border-t-8
                        border-l-transparent
                        border-r-transparent
                        border-t-gray-900
                      "
                    />
                  </div>
                </th>

                {/* ACCIONES */}
                {/* <th className="py-2 px-4 text-left">Acciones</th> */}
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

                  {/* Nombre (verified_name) */}
                  <td className="py-2 px-4">{num.verified_name}</td>

                  {/* Límite de mensajes (ejemplo segun documentacion meta) */}
                  <td className="py-2 px-4">
                    {(() => {
                      switch(num.messaging_limit_tier) {
                        case "TIER_250":
                          return "250 Clientes / 24 H"
                        case "TIER_500":
                          return "500 Clientes / 24 H"
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
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">VERDE</span>
                    ) : num.quality_rating === "YELLOW" ? (
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">AMARILLO</span>
                    ) : num.quality_rating === "RED" ? (
                      <span className="bg-red-100 text-red-800 text-xs] px-2 py-1 rounded">ROJO</span>
                    ) : (
                      <span className="bg-gray-100 text-gray-800 text-[10px] px-2 py-1 rounded">DESCONOCIDO</span>
                    )}
                  </td>

                  {/* Acciones */}
                  {/* <td className="py-2 px-4">
                    <button
                      className="text-blue-600 hover:underline"
                      onClick={() => alert("Update profile")}
                    >
                      Actualizar Perfil
                    </button>
                  </td> */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render de la tabla de “Plantillas”
  const renderTemplatesTable = () => {
    return (
      <div className="overflow-visible bg-white p-4 rounded shadow-md relative z-0">
        <table className="min-w-full border bg-white shadow rounded-lg">

         <thead className="bg-gray-200 text-gray-700 text-sm">
            <tr>
              <th className="py-2 px-4 text-left">Nombre / Idioma</th>

              <th className="py-2 px-4 text-left relative group">
                <div className="inline-flex items-center">
                  Categoría
                  <span className="ml-1 inline-block text-gray-400 hover:text-blue-500 cursor-pointer">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 16h-1v-4h-1m1-4h.01M12 20.5c4.694 0 8.5-3.806 8.5-8.5s-3.806-8.5-8.5-8.5-8.5 3.806-8.5 8.5 3.806 8.5 8.5 8.5z"
                      />
                    </svg>
                  </span>
                  {/* Tooltip Categoría */}
                  <div
                    className="
                      hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2
                      mb-2 w-72 bg-gray-800 text-white text-[11px] rounded-md px-2 py-2 shadow-md z-50
                    "
                  >
                    <strong>Categoría de plantilla</strong>
                    <p className="text-gray-200 mt-1 text-justify">
                      <strong>MARKETING:</strong> mensajes promocionales. <br />
                      <strong>UTILIDAD:</strong> confirmaciones, recordatorios, info útil.
                    </p>
                    <div
                      className="absolute left-1/2 transform -translate-x-1/2 bottom-0 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-900"
                    />
                  </div>
                </div>
              </th>

              <th className="py-2 px-4 text-left">Mensaje</th>

              <th className="py-2 px-4 text-left relative group">
                <div className="inline-flex items-center">
                  Estado
                  <span className="ml-1 inline-block text-gray-400 hover:text-blue-500 cursor-pointer">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 16h-1v-4h-1m1-4h.01M12 20.5c4.694 0 8.5-3.806 8.5-8.5s-3.806-8.5-8.5-8.5-8.5 3.806-8.5 8.5 3.806 8.5 8.5 8.5z"
                      />
                    </svg>
                  </span>
                  {/* Tooltip Estado */}
                  <div
                    className="
                      hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2
                      mb-2 w-72 bg-gray-800 text-white text-[11px] rounded-md px-2 py-2 shadow-md z-50
                    "
                  >
                    <strong>Estado de aprobación</strong>
                    <p className="text-gray-200 mt-1 text-justify">
                      <strong>APROBADA:</strong> Plantilla aprobada. <br />
                      <strong>PENDIENTE:</strong> En revisión. <br />
                      <strong>RECHAZADA:</strong> Plantilla rechazada.
                    </p>
                    <div
                      className="absolute left-1/2 transform -translate-x-1/2 bottom-0 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-900"
                    />
                  </div>
                </div>
              </th>
            </tr>
          </thead>

          <tbody>
            {plantillas.map((plantilla, index) => (
              <tr key={index} className="border-t hover:bg-gray-50">
                <td className="py-2 px-4">
                  <div className="font-semibold">{plantilla.name}</div>
                  <div className="text-gray-500">{getTemplacecode(plantilla.language) || plantilla.language}</div>
                </td>
                
                <td className="py-2 px-4">
                  {plantilla.category === "MARKETING" ? (
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">MARKETING</span>
                  ): plantilla.category === "UTILITY" ? (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">UTILIDAD</span>
                  ): (
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">DESCONOCIDO</span>
                  )
                }
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
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">APROBADA</span>
                  ): plantilla.status === "PENDING" ? (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">PENDIENTE</span>
                  ): plantilla.status === "REJECTED" ? (
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">RECHAZADA</span>
                  ): (
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">DESCONOCIDO</span>
                  )
                }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
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
    </div>
  );
};

export default AdministradorPlantillas;
