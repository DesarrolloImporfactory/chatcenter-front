import React, { useEffect, useState } from "react";
import chatApi from "../../api/chatcenter";

const CrearConfiguracionModalWhatsappBusiness = ({
  onClose,
  fetchConfiguraciones,
  setStatusMessage,
  idConfiguracion,
  telefono,
  nombre_configuracion, // Recibimos el prop
}) => {
  const [idWhatsapp, setIdWhatsapp] = useState("");
  const [idBusinessAccount, setIdBusinessAccount] = useState("");
  const [tokenApi, setTokenApi] = useState("");
  const [isClosing, setIsClosing] = useState(false); // controla animacion del modal

  const handleActualizarConfiguracionMeta = async () => {
    try {
      const resp = await chatApi.post(
        "/whatsapp_managment/actualizarConfiguracionMeta",
        {
          id_telefono: idWhatsapp,
          id_whatsapp: idBusinessAccount,
          token: tokenApi,
          id_configuracion: idConfiguracion,
          nombre_configuracion: nombre_configuracion,
          telefono: telefono,
        }
      );

      if (resp.data.status === 200) {
        setStatusMessage({
          type: "success",
          text: "Configuración de WhatsApp Business agregada correctamente.",
        });
        onClose();
        if (fetchConfiguraciones) fetchConfiguraciones();
      } else {
        setStatusMessage({
          type: "error",
          text: resp.data.message || "Error al conectar con Meta.",
        });
      }
    } catch (error) {
      console.error("Error al agregar configuración Meta:", error);
      setStatusMessage({
        type: "error",
        text: "Error al conectar con el servidor.",
      });
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300); // duración igual a la animación
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div
        className={`bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all duration-300 ${
          isClosing ? "animate-slide-out" : "animate-slide-in"
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h5 className="text-xl font-semibold text-gray-800">
            Conectar WhatsApp Business
          </h5>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      
        <div className="p-8 space-y-6 bg-white">
          <div className="mb-6">
            <label className="block text-gray-900 text-sm font-medium mb-2 tracking-wide">
              ID WhatsApp
            </label>
            <input
              type="text"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
              placeholder="Ingrese el ID de WhatsApp"
              value={idWhatsapp}
              onChange={(e) => setIdWhatsapp(e.target.value)}
            />
          </div>
      
          <div className="mb-6">
            <label className="block text-gray-900 text-sm font-medium mb-2 tracking-wide">
              ID WhatsApp Business
            </label>
            <input
              type="text"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
              placeholder="Ingrese el ID de WhatsApp Business"
              value={idBusinessAccount}
              onChange={(e) => setIdBusinessAccount(e.target.value)}
            />
          </div>
      
          <div className="mb-6">
            <label className="block text-gray-900 text-sm font-medium mb-2 tracking-wide">
              Token API
            </label>
            <input
              type="text"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
              placeholder="Ingrese el token de la API"
              value={tokenApi}
              onChange={(e) => setTokenApi(e.target.value)}
            />
          </div>
        </div>
      
        <div className="flex justify-end bg-white p-6 border-t border-gray-100 space-x-3">
          <button
            onClick={handleClose}
            className="px-5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-100 hover:border-gray-400 transition-all duration-200"
          >
            Cerrar
          </button>
          <button
            onClick={handleActualizarConfiguracionMeta}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-sm transition-all duration-200"
          >
            Actualizar Configuración
          </button>
        </div>
      </div>
    </div>

  );
};

export default CrearConfiguracionModalWhatsappBusiness;
