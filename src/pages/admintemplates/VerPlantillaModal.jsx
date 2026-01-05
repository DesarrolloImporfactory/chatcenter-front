// VerPlantillaModal.jsx
import React from "react";

const VerPlantillaModal = ({ plantilla, onClose }) => {
  if (!plantilla) return null;

  // 1) Extraes la info que te interesa: components, etc.
  const { name, language, category, components } = plantilla;

  // 2) Hallas el texto de HEADER, BODY, FOOTER y los botones
  let headerText = "";
  let bodyText = "";
  let footerText = "";
  let buttons = [];

  components.forEach((comp) => {
    if (comp.type === "HEADER") {
      headerText = comp.text || "";
    } else if (comp.type === "BODY") {
      bodyText = comp.text || "";
    } else if (comp.type === "FOOTER") {
      footerText = comp.text || "";
    } else if (comp.type === "BUTTONS") {
      if (comp.buttons) {
        buttons = comp.buttons; // array con type, text, etc.
      }
    }
  });

  // 3) Vista previa
  // - Idéntico a tu “preview” de `CrearPlantillaModal`, pero sin inputs

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="
        bg-white
        p-6
        rounded-xl
        shadow-lg
        w-full
        max-w-lg
        relative
      ">
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-black"
        >
          ✕
        </button>
        <h2 className="text-xl font-bold mb-4">Vista Previa</h2>


        {/* Simulación de “chat preview” */}
        <div className="border border-gray-300 rounded overflow-hidden text-sm mb-4">
          <div
            className="
              relative
              w-full
              h-full
              p-3
              flex
              flex-col
              gap-2
              max-h-[300px]
              overflow-y-auto
            "
            style={{
              backgroundColor: "#DAD3CC",
              backgroundImage: 'url("https://imp-datas.s3.amazonaws.com/images/2026-01-05T17-28-02-060Z-fondo_chat_center.png")',
              backgroundSize: 'cover',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              backgroundBlendMode: 'overlay',
              opacity: 0.8
            }}
          >
            {(headerText || bodyText || footerText || buttons.length > 0) && (
              <div
                className="
                  self-end
                  bg-white
                  rounded-lg
                  shadow
                  text-black
                  max-w-[80%]
                  p-3
                  flex
                  flex-col
                  gap-2
                  whitespace-pre-wrap
                  break-words
                "
              >
                {/* Header en bold */}
                {headerText && (
                  <div className="font-bold">
                    {headerText}
                  </div>
                )}
                {/* Body normal */}
                {bodyText && (
                  <div>
                    {bodyText}
                  </div>
                )}
                {/* Footer chiquito y gris */}
                {footerText && (
                  <div className="text-xs text-gray-600">
                    {footerText}
                  </div>
                )}

                {/* Si existen botones => un contenedor con líneas entre cada uno */}
                {buttons.length > 0 && (
                  <div className="flex flex-col mt-2">
                    {buttons.map((btn, i) => (
                      <React.Fragment key={i}>
                        {/* Dibujamos una línea gris encima de los botones */}
                        <hr className="border-gray-300 my-1" /> 
                        <div
                          className="
                            text-blue-600
                            text-sm
                            px-3
                            py-2
                            rounded
                            text-center
                            cursor-pointer
                          "
                          title={
                            btn.type === "URL"
                              ? btn.linkType === "dynamic"
                                ? `Ejemplo: ${
                                    btn.urlBase.endsWith("/")
                                      ? btn.urlBase + btn.urlVar
                                      : btn.urlBase + "/" + btn.urlVar
                                  }`
                                : `URL: ${btn.url || "https://google.com"}`
                              : undefined
                          }
                        >
                          {btn.text || "(sin texto)"}
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            className="px-4 py-2 bg-gray-300 rounded"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerPlantillaModal;
