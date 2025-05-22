import React, { useEffect, useRef, useState } from "react";
import chatApi from "../../api/chatcenter";
import { jwtDecode } from "jwt-decode";
import io from "socket.io-client";

const CrearConfiguracionModal = ({
  onClose,
  fetchConfiguraciones, // para refrescar la tabla de configuraciones
  setStatusMessage, // para mostrar notificaciones tipo "toast"
}) => {
  // Estados locales para los inputs
  const [nombreConfiguracion, setNombreConfiguracion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [idWhatsapp, setIdWhatsapp] = useState("");
  const [idBusinessAccount, setIdBusinessAccount] = useState("");
  const [tokenApi, setTokenApi] = useState("");
  const [userData, setUserData] = useState(null);

  // Estados relacionados al socket
  const socketRef = useRef(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

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

    // Limpieza al desmontar
    return () => {
      socket.disconnect();
    };
  }, []);

  const handleAgregarConfiguracion = async () => {
    try {
      // Llamamos a chatApi.post, enviando un JSON con los campos
      const resp = await chatApi.post(
        "/whatsapp_managment/agregarConfiguracion",
        {
          nombre_configuracion: nombreConfiguracion,
          telefono: telefono,
          id_telefono: idWhatsapp,
          id_whatsapp: idBusinessAccount,
          token: tokenApi,
          id_plataforma: userData.data?.id_plataforma,
        }
      );

      // Validamos la respuesta
      if (resp.data.status === 200) {
        // Mostramos mensaje de éxito
        setStatusMessage({
          type: "success",
          text: "Configuración agregada correctamente.",
        });
        // Cerramos el modal
        onClose();
        // Refrescamos la tabla en el padre
        if (fetchConfiguraciones) {
          fetchConfiguraciones();
        }
      } else {
        // Mostramos mensaje de error
        setStatusMessage({
          type: "error",
          text: resp.data.message || "Error al agregar configuración.",
        });
      }
    } catch (error) {
      console.error("Error al agregar configuración:", error);

      // Si el servidor respondió, accede a su mensaje
      const mensajeError =
        error.response?.data?.message || "Error al conectar con el servidor.";

      setStatusMessage({
        type: "error",
        text: mensajeError,
      });
    }
  };

  return (
    // Capa oscura de fondo
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      {/* Contenedor del modal */}
      <div className="bg-white rounded-md shadow-md w-full max-w-2xl">
        {/* Encabezado */}
        <div className="flex items-center justify-between p-4 border-b">
          <h5 className="text-xl font-semibold">Agregar Configuración</h5>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-4 space-y-4">
          {/* Configuración General */}
          <div className="border rounded-md p-3">
            <h6 className="font-semibold mb-2">Configuración General</h6>
            <div className="mb-3">
              <label
                htmlFor="nombreConfiguracion"
                className="block font-medium text-sm mb-1"
              >
                Nombre Configuración
              </label>
              <input
                type="text"
                id="nombreConfiguracion"
                className="border w-full p-2 rounded"
                placeholder="Ingrese el nombre de la configuración"
                value={nombreConfiguracion}
                onChange={(e) => setNombreConfiguracion(e.target.value)}
              />
            </div>
          </div>

          {/* Configuración WhatsApp */}
          <div className="border rounded-md p-3">
            <h6 className="font-semibold mb-2">Configuración WhatsApp</h6>

            <div className="mb-3">
              <label
                htmlFor="telefono"
                className="block font-medium text-sm mb-1"
              >
                Teléfono
              </label>
              <input
                type="text"
                id="telefono"
                className="border w-full p-2 rounded"
                placeholder="Ingrese el teléfono"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="mb-3">
                <label
                  htmlFor="idWhatsapp"
                  className="block font-medium text-sm mb-1"
                >
                  ID WhatsApp
                </label>
                <input
                  type="text"
                  id="idWhatsapp"
                  className="border w-full p-2 rounded"
                  placeholder="Ingrese el ID de WhatsApp"
                  value={idWhatsapp}
                  onChange={(e) => setIdWhatsapp(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label
                  htmlFor="idBusinessAccount"
                  className="block font-medium text-sm mb-1"
                >
                  ID WhatsApp Business Account
                </label>
                <input
                  type="text"
                  id="idBusinessAccount"
                  className="border w-full p-2 rounded"
                  placeholder="Ingrese el ID de WhatsApp Business Account"
                  value={idBusinessAccount}
                  onChange={(e) => setIdBusinessAccount(e.target.value)}
                />
              </div>
            </div>

            <div className="mb-3">
              <label
                htmlFor="tokenApi"
                className="block font-medium text-sm mb-1"
              >
                Token WhatsApp API
              </label>
              <input
                type="text"
                id="tokenApi"
                className="border w-full p-2 rounded"
                placeholder="Ingrese el token de la API de WhatsApp"
                value={tokenApi}
                onChange={(e) => setTokenApi(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Footer con botones */}
        <div className="flex justify-end p-4 border-t space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cerrar
          </button>
          <button
            onClick={handleAgregarConfiguracion}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            Agregar Configuración
          </button>
        </div>
      </div>
    </div>
  );
};

export default CrearConfiguracionModal;
