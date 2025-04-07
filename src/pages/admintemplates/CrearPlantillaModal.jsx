import React, { useState, useEffect } from "react";

function toSnakeCase(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[áàä]/g, "a")
    .replace(/[éèë]/g, "e")
    .replace(/[íìï]/g, "i")
    .replace(/[óòö]/g, "o")
    .replace(/[úùü]/g, "u")
    .replace(/[^a-z0-9_]/g, "");
}

function detectPlaceholders(text) {
  const regex = /{{(\d+)}}/g;
  const matches = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push(parseInt(match[1], 10));
  }
  return matches;
}

const InfoIcon = ({ tooltipText }) => {
  return (
    <span className="relative group inline-block text-blue-500 ml-2 cursor-pointer">
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

      <div
        className="
          hidden
          group-hover:block
          absolute
          z-50
          top-full
          left-1/2
          -translate-x-1/2
          mt-1
          w-48
          bg-black
          text-white
          text-xs
          rounded
          px-2
          py-2
          shadow-lg
        "
      >
        {tooltipText}
      </div>
    </span>
  );
};

const LabelRequired = ({ children, tooltip }) => (
  <label className="block mb-1 font-semibold">
    <span className="text-gray-700">{children}</span>
    {tooltip && <InfoIcon tooltipText={tooltip} />}
    <span className="text-red-600 ml-1">*</span>
  </label>
);

const CrearPlantillaModal = ({ onClose, onCreate }) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("MARKETING");
  const [language, setLanguage] = useState("es_MX");
  
  const [showHeader, setShowHeader] = useState(true);
  const [headerText, setHeaderText] = useState("");

  const [bodyText, setBodyText] = useState("");
  const [footerText, setFooterText] = useState("");

  const [headerVars, setHeaderVars] = useState([]); 
  const [bodyVars, setBodyVars] = useState([]);  

  const [buttons, setButtons] = useState([]);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const foundHeader = detectPlaceholders(headerText);
    if (foundHeader.length !== headerVars.length) {
      const newVars = foundHeader.map((num, idx) => headerVars[idx] || "");
      setHeaderVars(newVars);
    }
  }, [headerText]);

  useEffect(() => {
    const foundBody = detectPlaceholders(bodyText);
    if (foundBody.length !== bodyVars.length) {
      const newVars = foundBody.map((num, idx) => bodyVars[idx] || "");
      setBodyVars(newVars);
    }
  }, [bodyText]);

  const addButton = () => {
    setButtons([...buttons, { type: "QUICK_REPLY", text: "" }]);
  };

  const updateButton = (index, field, value) => {
    const updated = [...buttons];
    updated[index][field] = value;
    setButtons(updated);
  };

  const removeButton = (index) => {
    const updated = [...buttons];
    updated.splice(index, 1);
    setButtons(updated);
  };

  const replacePlaceholders = (text, varValues=[]) => {
    let result = text;
    varValues.forEach((example, i) => {
      const ph = `{{${i+1}}}`;
      result = result.replace(ph, example);
    });
    return result;
  };

  const headerPreview = showHeader
    ? replacePlaceholders(headerText, headerVars)
    : "";

  const bodyPreview = replacePlaceholders(bodyText, bodyVars);

  const handleCreate = async () => {
    const finalName = toSnakeCase(name);

    const components = [];

    if (showHeader && headerText.trim()) {
      const hasHeaderPlaceholders = headerVars.length > 0;
      const headerComp = {
        type: "HEADER",
        format: "TEXT",
        text: headerText,
      };
      if (hasHeaderPlaceholders) {
        headerComp.example = {
          header_text: [...headerVars],
        };
      }
      components.push(headerComp);
    }
    
    if (bodyText.trim()) {
      const hasBodyPlaceholders = bodyVars.length > 0;
      const bodyComp = {
        type: "BODY",
        text: bodyText,
      };
      if (hasBodyPlaceholders) {
        bodyComp.example = {
          body_text: [[...bodyVars]],
        };
      }
      components.push(bodyComp);
    }

    if (footerText.trim()) {
      components.push({
        type: "FOOTER",
        text: footerText
      });
    }

    if (buttons.length > 0) {
      const filteredButtons = buttons
        .map(b => {
          if (b.type === "QUICK_REPLY") {
            return {
              type: "QUICK_REPLY",
              text: b.text || "Botón sin texto"
            };
          } else if (b.type === "PHONE_NUMBER") {
            return {
              type: "PHONE_NUMBER",
              text: b.text || "Llamar",
              phone_number: b.phone_number || "+593999999999"
            };
          } else {
            // URL
            return {
              type: "URL",
              text: b.text || "Ir al sitio",
              url: b.url || "https://google.com"
            };
          }
        })
        .filter(btn => btn.text.trim() !== "");

      if (filteredButtons.length > 0) {
        components.push({
          type: "BUTTONS",
          buttons: filteredButtons
        });
      }
    }

    const payload = {
      name: finalName,
      category,
      language,
      components
    };

    setIsLoading(true);
    try {
      await onCreate(payload);
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  };

  const areHeaderVarsFilled = headerVars.every((val) => val.trim() !== "");
  const areBodyVarsFilled = bodyVars.every((val) => val.trim() !== "");

  const isDisabled =
    !name.trim() ||
    !bodyText.trim() ||
    !areHeaderVarsFilled ||
    !areBodyVarsFilled ||
    isLoading;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      {/*
        1) Scroll general del modal si supera 80% de la pantalla
           (max-h-[80vh] overflow-y-auto)
      */}
      <div className="
        bg-white
        p-6
        rounded-xl
        shadow-lg
        w-full
        max-w-5xl
        relative
        max-h-[80vh]
        overflow-y-auto
      ">
        <button 
          onClick={onClose} 
          className="absolute top-3 right-3 text-gray-500 hover:text-black"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold mb-4">Crear Plantilla</h2>

        <div className="flex gap-6">
          {/* Columna Izquierda => Formulario */}
          <div className="flex-1">
            {/* Nombre */}
            <div className="mb-4">
              <LabelRequired>
                Nombre de la plantilla
              </LabelRequired>
              <input 
                type="text"
                className="w-full border rounded px-3 py-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: promo_summer_2023"
              />
            </div>

            {/* Categoría e Idioma */}
            <div className="flex gap-4 mb-4">
              <div className="w-1/2">
                <LabelRequired tooltip="Selecciona la categoría correctamente para que no sea rechazada.">
                  Categoría
                </LabelRequired>
                <select 
                  className="w-full border rounded px-3 py-2" 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="MARKETING">Marketing</option>
                  <option value="UTILITY">Utilidad</option>
                </select>
              </div>
              <div className="w-1/2">
                <LabelRequired tooltip="Elige el idioma en el que redactarás la plantilla.">
                  Lenguaje
                </LabelRequired>
                <select 
                  className="w-full border rounded px-3 py-2"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="es_MX">Español</option>
                  <option value="en_US">Inglés</option>
                </select>
              </div>
            </div>

            {/* Header */}
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={showHeader}
                  onChange={() => setShowHeader(!showHeader)}
                />
                <span className="font-semibold">¿Incluir encabezado?</span>
              </label>
              {showHeader && (
                <div className="mt-2">
                  <label className="font-semibold block mb-1">
                    Texto del Encabezado <InfoIcon tooltipText="Ingresa el título de la plantilla. Puedes usar {{1}}" />
                  </label>
                  <input 
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    value={headerText}
                    onChange={(e) => setHeaderText(e.target.value)}
                  />

                  {headerVars.length > 0 && (
                    <div className="mt-2 text-sm">
                      <p className="font-semibold">Variables detectadas en el Encabezado:</p>
                      {headerVars.map((val, idx) => (
                        <div key={idx} className="flex gap-2 items-center my-1">
                          <label className="text-gray-600 whitespace-nowrap">
                            {"{{"}{idx + 1}{"}}"}:
                          </label>
                          <input 
                            className="border rounded px-2 py-1 flex-1"
                            value={val}
                            onChange={(e) => {
                              const newArr = [...headerVars];
                              newArr[idx] = e.target.value;
                              setHeaderVars(newArr);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Body */}
            <div className="mb-4">
              <LabelRequired tooltip="Ingresa el cuerpo principal del mensaje.">
                Cuerpo / Body
              </LabelRequired>
              <textarea
                className="w-full border rounded px-3 py-2"
                rows={4}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="Ej: Hola {{1}}, tu pedido llega el {{2}}"
              />
              {bodyVars.length > 0 && (
                <div className="mt-2 text-sm">
                  <p className="font-semibold">Variables detectadas:</p>
                  {bodyVars.map((val, idx) => (
                    <div key={idx} className="flex gap-2 items-center my-1">
                      <label className="text-gray-600 whitespace-nowrap">
                        {"{{"}{idx + 1}{"}}"}:
                      </label>
                      <input 
                        className="border rounded px-2 py-1 flex-1"
                        value={val}
                        onChange={(e) => {
                          const newArr = [...bodyVars];
                          newArr[idx] = e.target.value;
                          setBodyVars(newArr);
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mb-4">
              <label className="block font-semibold mb-1">
                Pie de página (Opcional) <InfoIcon tooltipText="Texto breve al final del mensaje" />
              </label>
              <input 
                type="text"
                className="w-full border rounded px-3 py-2"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="Ej: Imporshop"
              />
            </div>

            {/* Botones */}
            <div className="mb-4">
              <label className="block font-semibold mb-2">
                Botones (Opcionales) <InfoIcon tooltipText="Agrega botones de Respuesta rápida, Llamada o Enlace." />
              </label>
              {buttons.map((btn, i) => (
                <div key={i} className="border p-2 mb-2 rounded bg-gray-50">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Botón #{i+1}</span>
                    <button 
                      className="text-red-600 text-sm"
                      onClick={() => removeButton(i)}
                    >
                      Eliminar
                    </button>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <select
                      className="border rounded px-2 py-1"
                      value={btn.type}
                      onChange={(e) => updateButton(i, "type", e.target.value)}
                    >
                      <option value="QUICK_REPLY">Respuesta rápida</option>
                      <option value="PHONE_NUMBER">Llamar</option>
                      <option value="URL">Enlace</option>
                    </select>
                    <input
                      className="border rounded px-2 py-1 flex-1"
                      placeholder="Texto del botón"
                      value={btn.text}
                      onChange={(e) => updateButton(i, "text", e.target.value)}
                    />
                  </div>
                  {btn.type === "PHONE_NUMBER" && (
                    <div className="mt-2">
                      <label className="text-sm text-gray-600 block mb-1">Número de teléfono</label>
                      <input
                        className="border rounded px-2 py-1 w-full"
                        placeholder="+573001234567"
                        value={btn.phone_number || ""}
                        onChange={(e) => updateButton(i, "phone_number", e.target.value)}
                      />
                    </div>
                  )}
                  {btn.type === "URL" && (
                    <div className="mt-2">
                      <label className="text-sm text-gray-600 block mb-1">Enlace (URL)</label>
                      <input
                        className="border rounded px-2 py-1 w-full"
                        placeholder="https://tusitio.com"
                        value={btn.url || ""}
                        onChange={(e) => updateButton(i, "url", e.target.value)}
                      />
                    </div>
                  )}
                </div>
              ))}
              <button 
                className="bg-gray-200 px-3 py-1 rounded text-sm" 
                onClick={addButton}
              >
                + Agregar Botón
              </button>
            </div>
          </div>
          
          {/* Columna Derecha => Vista previa estilo WhatsApp */}
          <div className="w-1/3">
            <h3 className="font-semibold mb-2">Vista Previa</h3>
            <div className="bg-gray-100 border border-gray-300 rounded p-3 text-sm">
              {/*
                2) Scroll interno en la "pantalla del teléfono"
                si su contenido pasa de 300px de alto
              */}
              <div className="
                bg-white
                rounded
                shadow
                p-3
                min-h-[300px]
                max-h-[300px]
                flex flex-col
                overflow-y-auto
                whitespace-pre-wrap
                break-words
                break-all
                w-full
              ">
                {/* Header */}
                {headerPreview && (
                  <div className="mb-2 p-2 bg-green-100 text-green-800 rounded w-full">
                    {headerPreview}
                  </div>
                )}

                {/* Body */}
                <div className="mb-2 p-2 bg-gray-100 text-black rounded w-full">
                  {bodyPreview}
                </div>

                {/* Footer */}
                {footerText.trim() !== "" && (
                  <div className="mt-2 text-xs text-gray-500 w-full">
                    {footerText}
                  </div>
                )}

                {/* Botones */}
                {buttons.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1 w-full">
                    {buttons.map((btn, i) => (
                      <button 
                        key={i}
                        className="bg-green-600 text-white text-sm px-3 py-1 rounded self-start"
                      >
                        {btn.text || "(sin texto)"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Botones Finales */}
        <div className="flex justify-end gap-3 mt-4">
          <button 
            className="px-4 py-2 bg-gray-300 rounded"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button 
            className={`px-4 py-2 rounded flex items-center justify-center gap-2 ${
              isDisabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white'
            }`}
            onClick={handleCreate}
            disabled={isDisabled}
          >
            {isLoading && (
              <svg
                className="animate-spin h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12" cy="12" r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4l2 2-2 2V4a8 8 0 11-8 8z"
                />
              </svg>
            )}
            {isLoading ? "Cargando..." : "Crear"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CrearPlantillaModal;
