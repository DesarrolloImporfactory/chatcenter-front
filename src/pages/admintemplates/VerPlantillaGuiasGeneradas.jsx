import React, { useState, useEffect } from "react";
import chatApi from "../../api/chatcenter";

const VerPlantillaGuiasGeneradas = ({ idPlataforma, respuestas, onClose, setStatusMessage }) => {
  const [seleccionada, setSeleccionada] = useState(null);
  const [loading, setLoading] = useState(false);
  const [plantillasMeta, setPlantillasMeta] = useState([]);

  useEffect(() => {
    const fetchTemplatesMeta = async () => {
      try {
        const resp = await chatApi.post("/whatsapp_managment/obtenerTemplatesWhatsapp", {
          id_plataforma: idPlataforma,
        });

        if (resp.data.success) {
          setPlantillasMeta(resp.data.templates);

          // Obtener cuál es la plantilla actual en uso y marcarla como seleccionada
          const configResp = await chatApi.post("/whatsapp_managment/obtenerConfiguracion", {
            id_plataforma: idPlataforma,
          });

          if (configResp.data.success && configResp.data.config?.template_generar_guia) {
            setSeleccionada(configResp.data.config.template_generar_guia);
          }
        } else {
          setStatusMessage({
            type: "error",
            text: "No se pudieron obtener las plantillas desde Meta.",
          });
        }
      } catch (err) {
        console.error("Error al obtener templates de Meta:", err);
        setStatusMessage({
          type: "error",
          text: "Error al conectar con Meta o el servidor.",
        });
      }
    };

    fetchTemplatesMeta();
  }, [idPlataforma]);

  const handleGuardar = async () => {
    if (!seleccionada) {
      setStatusMessage({
        type: "error",
        text: "Selecciona una plantilla para continuar.",
      });
      return;
    }

    try {
      setLoading(true);
      const resp = await chatApi.put("/whatsapp_managment/editarConfiguracion", {
        id_template_whatsapp: seleccionada,
        id_plataforma: idPlataforma,
      });

      if (resp.data.success) {
        setStatusMessage({
          type: "success",
          text: resp.data.message || "Configuración actualizada correctamente.",
        });
        onClose();
      } else {
        setStatusMessage({
          type: "error",
          text: resp.data.message || "No se pudo guardar la configuración.",
        });
      }
    } catch (error) {
      console.error("Error al guardar configuración:", error);
      setStatusMessage({
        type: "error",
        text: "Error al conectar con el servidor.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[9999]">
      <div className="bg-white p-6 rounded-lg w-full max-w-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Selecciona la plantilla para generar guía</h2>

        <div className="space-y-3 max-h-64 overflow-y-auto">
          {plantillasMeta.map((r) => (
            <label
              key={r.id_template}
              className="block bg-gray-100 px-4 py-2 rounded cursor-pointer hover:bg-gray-200"
            >
              <input
                type="radio"
                name="plantilla"
                value={r.id_template}
                checked={seleccionada === r.id_template}
                onChange={() => setSeleccionada(r.id_template)}
                className="mr-2"
              />
              {r.nombre}
            </label>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500"
            onClick={handleGuardar}
            disabled={loading}
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerPlantillaGuiasGeneradas;
