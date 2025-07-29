import React, { useState, useEffect } from "react";
import chatApi from "../../api/chatcenter";

const CrearPlantillaRapidaModal = ({
  onClose,
  onSuccess,
  setStatusMessage,
}) => {
  const [atajo, setAtajo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);
  const [idConfigFromURL, setIdConfigFromURL] = useState(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const idc = p.get("id_configuracion");
    if (idc) setIdConfigFromURL(parseInt(idc));
  }, []);

  const handleCrear = async () => {
    if (!atajo || !mensaje || !idConfigFromURL) {
      setStatusMessage({
        type: "error",
        text: "Por favor completa todos los campos.",
      });
      return;
    }

    const body = {
      atajo,
      mensaje,
      id_configuracion: idConfigFromURL,
    };

    setLoading(true);
    try {
      const resp = await chatApi.post(
        "/whatsapp_managment/crearPlantillaRapida",
        body
      );

      if (resp.data.success) {
        setStatusMessage({
          type: "success",
          text: "Respuesta rápida creada correctamente.",
        });
        setAtajo("");
        setMensaje("");
        onSuccess();
        onClose();
      } else {
        setStatusMessage({
          type: "error",
          text: "Error al crear la respuesta rápida.",
        });
      }
    } catch (error) {
      console.error("Error al crear respuesta rápida:", error);
      setStatusMessage({
        type: "error",
        text: "Error al conectar con el servidor.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-[9999]">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-md relative">
        <h2 className="text-xl font-semibold mb-4">Crear Respuesta Rápida</h2>

        <label className="block mb-2">Atajo</label>
        <input
          type="text"
          value={atajo}
          onChange={(e) => setAtajo(e.target.value)}
          className="w-full border px-3 py-2 rounded mb-4"
        />

        <label className="block mb-2">Mensaje</label>
        <textarea
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          className="w-full border px-3 py-2 rounded mb-4"
        />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setAtajo("");
              setMensaje("");
              onClose();
            }}
            className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleCrear}
            disabled={loading}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500"
          >
            {loading ? "Creando..." : "Crear"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CrearPlantillaRapidaModal;
