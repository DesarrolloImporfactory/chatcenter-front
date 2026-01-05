import React, { useState, useEffect } from "react";

// Función para normalizar el nombre a minúsculas con underscores.
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

// Detecta cuántos placeholders {{1}}, {{2}}... hay en un texto
function detectPlaceholders(text) {
  const regex = /{{(\d+)}}/g;
  const matches = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push(parseInt(match[1], 10));
  }
  return matches;
}

// Pequeño icono de "i" con tooltip en hover
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
      {/* Tooltip */}
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
  const [language, setLanguage] = useState("es");
  
  const [showHeader, setShowHeader] = useState(true);
  const [headerText, setHeaderText] = useState("");

  const [bodyText, setBodyText] = useState("");
  const [footerText, setFooterText] = useState("");

  // Para placeholders/variables en HEADER
  const [headerVars, setHeaderVars] = useState([]); 
  // Para placeholders/variables en BODY
  const [bodyVars, setBodyVars] = useState([]);  

  // Botones
  const [buttons, setButtons] = useState([]);

  // Loader al hacer clic en "Crear"
  const [isLoading, setIsLoading] = useState(false);

  // ---------------------
  // DETECCIÓN PLACEHOLDERS (HEADER)
  // ---------------------
  useEffect(() => {
    const foundHeader = detectPlaceholders(headerText);
    if (foundHeader.length !== headerVars.length) {
      const newVars = foundHeader.map((_, idx) => headerVars[idx] || "");
      setHeaderVars(newVars);
    }
  }, [headerText]);

  // ---------------------
  // DETECCIÓN PLACEHOLDERS (BODY)
  // ---------------------
  useEffect(() => {
    const foundBody = detectPlaceholders(bodyText);
    if (foundBody.length !== bodyVars.length) {
      const newVars = foundBody.map((_, idx) => bodyVars[idx] || "");
      setBodyVars(newVars);
    }
  }, [bodyText]);

  // Agregar nuevo botón
  const addButton = () => {
    setButtons([...buttons, { 
      type: "QUICK_REPLY", 
      text: "", 
      linkType: "static",
      urlBase: "",
      urlVar: ""
    }]);
  };

  // Actualizar botón
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

  // Reemplazar placeholders en la vista previa
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

  // Enviar la plantilla
  const handleCreate = async () => {
    const finalName = toSnakeCase(name);
    const components = [];

    // HEADER
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
    
    // BODY
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

    // FOOTER
    if (footerText.trim()) {
      components.push({
        type: "FOOTER",
        text: footerText
      });
    }

    // BUTTONS
    if (buttons.length > 0) {
      const filteredButtons = buttons
        .map((b) => {
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
            if (b.linkType === "dynamic") {
              const finalUrl = b.urlBase.endsWith("/")
                ? b.urlBase + "{{1}}"
                : b.urlBase + "/{{1}}";
              const finalExample = b.urlBase.endsWith("/")
                ? b.urlBase + b.urlVar
                : b.urlBase + "/" + b.urlVar;
              return {
                type: "URL",
                text: b.text || "Ir al sitio",
                url: finalUrl,
                example: [finalExample]
              };
            } else {
              return {
                type: "URL",
                text: b.text || "Ir al sitio",
                url: b.url || "https://google.com"
              };
            }
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

  // Validaciones
  const areHeaderVarsFilled = headerVars.every((val) => val.trim() !== "");
  const areBodyVarsFilled = bodyVars.every((val) => val.trim() !== "");
  const isDisabled =
    !name.trim() ||
    !bodyText.trim() ||
    !areHeaderVarsFilled ||
    !areBodyVarsFilled ||
    isLoading;

  // ----------------------------------
  // ARMA EL TEXTO UNIFICADO (Header + Body + Footer)
  // ----------------------------------
  let combinedText = "";
  if (headerPreview.trim() !== "") {
    combinedText += headerPreview + "\n";
  }
  if (bodyPreview.trim() !== "") {
    combinedText += bodyPreview + "\n";
  }
  if (footerText.trim() !== "") {
    combinedText += footerText + "\n";
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
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
        {/* Botón Cerrar */}
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
              <LabelRequired>Nombre de la plantilla</LabelRequired>
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
                  <option value="es">Español</option>
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
                    placeholder="Ej: ¡Hola {{1}}!"
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
                Botones (Opcionales) <InfoIcon tooltipText="Crea botones para que los clientes puedan responder tu mensaje o realizar una acción." />
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

                  {/* Selección tipo de botón */}
                  <div className="mt-2 flex gap-2">
                    <select
                      className="border rounded px-2 py-1"
                      value={btn.type}
                      onChange={(e) => updateButton(i, "type", e.target.value)}
                    >
                      <option value="QUICK_REPLY">Personalizado</option>
                      <option value="PHONE_NUMBER">Llamar al número de teléfono</option>
                      <option value="URL">Ir al sitio web</option>
                    </select>

                    <input
                      className="border rounded px-2 py-1 flex-1"
                      placeholder="Texto del botón"
                      value={btn.text}
                      onChange={(e) => updateButton(i, "text", e.target.value)}
                    />
                  </div>

                  {/* Mensaje indicando límite según tipo */}
                  {btn.type === "QUICK_REPLY" && (
                    <p className="text-xs text-gray-400 mt-1">
                      Sin límite de botones
                    </p>
                  )}
                  {btn.type === "PHONE_NUMBER" && (
                    <p className="text-xs text-gray-400 mt-1">
                      Máximo 1 botón
                    </p>
                  )}
                  {btn.type === "URL" && (
                    <p className="text-xs text-gray-400 mt-1">
                      Máximo 2 botones
                    </p>
                  )}

                  {/* PHONE_NUMBER => pide phone_number */}
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

                  {/* URL => pide linkType “estático” o “dinámico” */}
                  {btn.type === "URL" && (
                    <div className="mt-2 border rounded p-2 bg-white">
                      <label className="text-sm font-semibold block mb-1">Tipo de URL:</label>
                      <select
                        className="border rounded px-2 py-1 w-full"
                        value={btn.linkType}
                        onChange={(e) => updateButton(i, "linkType", e.target.value)}
                      >
                        <option value="static">Estático</option>
                        <option value="dynamic">Dinámico</option>
                      </select>

                      {btn.linkType === "static" && (
                        <div className="mt-2">
                          <label className="text-sm text-gray-600 block mb-1">URL</label>
                          <input
                            className="border rounded px-2 py-1 w-full"
                            placeholder="https://tusitio.com"
                            value={btn.url || ""}
                            onChange={(e) => updateButton(i, "url", e.target.value)}
                          />
                        </div>
                      )}

                      {btn.linkType === "dynamic" && (
                        <div className="mt-2">
                          <label className="text-sm text-gray-600 block mb-1">Base URL</label>
                          <input
                            className="border rounded px-2 py-1 w-full"
                            placeholder="Ej: https://new.imporsuitpro.com/Pedidos/imprimir_guia/"
                            value={btn.urlBase || ""}
                            onChange={(e) => updateButton(i, "urlBase", e.target.value)}
                          />

                          <label className="text-sm text-gray-600 block mt-2 mb-1">Variable</label>
                          <input
                            className="border rounded px-2 py-1 w-full"
                            placeholder="Ej: numero_guia"
                            value={btn.urlVar || ""}
                            onChange={(e) => updateButton(i, "urlVar", e.target.value)}
                          />

                          <p className="text-xs text-gray-500 mt-1">
                            El resultado del url al que el cliente ingresará sería: https://new.imporsuitpro.com/Pedidos/imprimir_guia/numero_guia
                          </p>
                        </div>
                      )}
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

            {/*
              Simulamos un “teléfono” con fondo + una sola burbuja.
              1) Se arma 'combinedText' con (header + body + footer).
              2) Se dibuja todo en la misma burbuja.
              3) Separador (hr) para los botones, en la misma burbuja, color verde.
            */}
            <div className="border border-gray-300 rounded overflow-hidden text-sm">
              <div
                className="
                  relative
                  w-full
                  h-full
                  p-3
                  flex
                  flex-col
                  gap-2
                  max-h-[400px]
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
                {/* UNA SOLA BURBUJA */}
                {(headerPreview.trim() !== "" || bodyPreview.trim() !== "" || footerText.trim() !== "" || buttons.length > 0) && (
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
                    "
                  >
                    {/* Encabezado en negrita, si existe */}
                    {headerPreview.trim() !== "" && (
                      <div className="font-bold whitespace-pre-wrap break-words">
                        {headerPreview}
                      </div>
                    )}

                    {/* Body normal */}
                    {bodyPreview.trim() !== "" && (
                      <div className="whitespace-pre-wrap break-words">
                        {bodyPreview}
                      </div>
                    )}

                    {/* Footer en texto pequeño y gris */}
                    {footerText.trim() !== "" && (
                      <div className="text-xs text-gray-500 whitespace-pre-wrap break-words">
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
