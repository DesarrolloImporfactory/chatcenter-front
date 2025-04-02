import React, { useEffect, useRef,useState } from "react";
import axios from "axios";
import Cabecera from "../../components/chat/Cabecera";
import {jwtDecode} from "jwt-decode";
import io from "socket.io-client";

const AdministradorPlantillas = () => {
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

  //Si no hay token, no sigue ejecutando el jwtDecode
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
  
    // Conectar socket como ya lo tenías
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
  

  useEffect(() => {
    const fetchPlantillas = async () => {
        if(userData != null){

            try {
                    const formData = new FormData();
                    formData.append("id_plataforma", userData.plataforma)
                    const response = await fetch(
                        "https://desarrollo.imporsuitpro.com/Pedidos/obtener_plantillas_whatsapp",
                        {
                            method: "POST",
                            body: formData
                        }
                    );
                    const response_data = await response.json()
                    setPlantillas(response_data.data || []);
                } catch (error) {
                    console.error("Error al cargar las plantillas", error);
                }
    }
    };
    fetchPlantillas();
  }, [userData]);

  return (
    <div className="p-0">
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

      <h1 className="text-2xl font-bold mb-4">Plantillas de WhatsApp</h1>

      <div className="overflow-x-auto">
        <table className="min-w-full border bg-white shadow rounded-lg">
          <thead className="bg-gray-200 text-gray-700 text-sm">
            <tr>
              <th className="py-2 px-4 text-left">Nombre</th>
              <th className="py-2 px-4 text-left">Categoría</th>
              <th className="py-2 px-4 text-left">Idioma</th>
              <th className="py-2 px-4 text-left">Mensaje</th>
              <th className="py-2 px-4 text-left">Estado</th>
            </tr>
          </thead>
          <tbody>
            {plantillas.map((plantilla, index) => (
              <tr key={index} className="border-t hover:bg-gray-50">
                <td className="py-2 px-4">{plantilla.name}</td>
                <td className="py-2 px-4">
                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                    {plantilla.category}
                  </span>
                </td>
                <td className="py-2 px-4">{plantilla.language}</td>
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
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                    {plantilla.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdministradorPlantillas;
