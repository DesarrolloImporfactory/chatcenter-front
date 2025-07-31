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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-md shadow-md w-full max-w-2xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h5 className="text-xl font-semibold">Conectar WhatsApp Business</h5>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="mb-3">
            <label className="block font-medium text-sm mb-1">
              ID WhatsApp
            </label>
            <input
              type="text"
              className="border w-full p-2 rounded"
              placeholder="Ingrese el ID de WhatsApp"
              value={idWhatsapp}
              onChange={(e) => setIdWhatsapp(e.target.value)}
            />
          </div>

          <div className="mb-3">
            <label className="block font-medium text-sm mb-1">
              ID WhatsApp Business
            </label>
            <input
              type="text"
              className="border w-full p-2 rounded"
              placeholder="Ingrese el ID de WhatsApp Business"
              value={idBusinessAccount}
              onChange={(e) => setIdBusinessAccount(e.target.value)}
            />
          </div>

          <div className="mb-3">
            <label className="block font-medium text-sm mb-1">Token API</label>
            <input
              type="text"
              className="border w-full p-2 rounded"
              placeholder="Ingrese el token de la API"
              value={tokenApi}
              onChange={(e) => setTokenApi(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end p-4 border-t space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cerrar
          </button>
          <button
            onClick={handleActualizarConfiguracionMeta}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            Actualizar Configuración
          </button>
        </div>
      </div>
    </div>
  );
};

export default CrearConfiguracionModalWhatsappBusiness;
