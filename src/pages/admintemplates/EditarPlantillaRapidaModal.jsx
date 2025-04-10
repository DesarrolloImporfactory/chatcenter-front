import React, { useState, useEffect } from "react";
import chatApi from "../../api/chatcenter";

const EditarPlantillaRapidaModal = ({ respuesta, onClose, onSuccess, setStatusMessage }) => {
  const [atajo, setAtajo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (respuesta) {
      setAtajo(respuesta.atajo || "");
      setMensaje(respuesta.mensaje || "");
    }
  }, [respuesta]);

  const handleEditar = async () => {
    setLoading(true);
    try {
      const resp = await chatApi.put("/whatsapp_managment/editarPlantilla", {
        atajo,
        mensaje,
        id_template: respuesta.id_template,
      });

      if (resp.data.success) {
        setStatusMessage({
          type: "success",
          text: resp.data.message || "Plantilla editada correctamente.",
        });
        onSuccess(); // recarga
        onClose();   // cerrar modal
      } else {
        setStatusMessage({
          type: "error",
          text: resp.data.message || "Error al editar la plantilla.",
        });
      }
    } catch (error) {
      console.error("Error al editar plantilla rápida:", error);
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
        <h2 className="text-xl font-semibold mb-4">Editar Respuesta Rápida</h2>

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
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleEditar}
            disabled={loading}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500"
          >
            {loading ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditarPlantillaRapidaModal;
