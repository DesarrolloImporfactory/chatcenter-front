import React, { useState, useEffect } from "react";

// Función para normalizar el nombre a minúsculas con underscores.
function toSnakeCase(str) {
  // Quita acentos/espacios y pone en snake_case
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")           // espacios => guión bajo
    .replace(/[áàä]/g, "a")
    .replace(/[éèë]/g, "e")
    .replace(/[íìï]/g, "i")
    .replace(/[óòö]/g, "o")
    .replace(/[úùü]/g, "u")
    .replace(/[^a-z0-9_]/g, "");    // elimina otros símbolos
}

// Detecta cuántos placeholders {{1}} {{2}}... hay en un texto
function detectPlaceholders(text) {
  // Busca todas las apariciones del patrón {{n}}
  const regex = /{{(\d+)}}/g;
  const matches = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push(parseInt(match[1], 10));
  }
  // Retorna array con los índices detectados; por ejemplo [1,2]
  // Ojo: Podrían repetirse, en un caso muy raro, pero en general no.
  return matches;
}

const CrearPlantillaModal = ({ onClose, onCreate }) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("MARKETING"); // Ej. "MARKETING" o "UTILITY"
  const [language, setLanguage] = useState("es_MX");
  
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

  // ---------------------
  // DETECCIÓN PLACEHOLDERS
  // ---------------------
  useEffect(() => {
    // Detecta placeholders en el Header
    const foundHeader = detectPlaceholders(headerText);
    // Actualiza array de ejemplos si varía la cantidad
    if (foundHeader.length !== headerVars.length) {
      // Reconstruye un array con el número de placeholders
      const newVars = foundHeader.map((num, idx) => {
        // Usa un valor antiguo si existía, si no, un texto genérico
        return headerVars[idx] || `Header var #${num}`;
      });
      setHeaderVars(newVars);
    }
  }, [headerText]);

  useEffect(() => {
    // Detecta placeholders en el Body
    const foundBody = detectPlaceholders(bodyText);
    if (foundBody.length !== bodyVars.length) {
      const newVars = foundBody.map((num, idx) => {
        return bodyVars[idx] || `Body var #${num}`;
      });
      setBodyVars(newVars);
    }
  }, [bodyText]);

  // ---------------------
  // MANEJO DE BOTONES
  // ---------------------
  // Cada botón tendrá shape:
  // {
  //   type: "QUICK_REPLY" | "PHONE_NUMBER" | "URL",
  //   text: "",
  //   phone_number?: "",
  //   url?: ""
  // }
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

  // ---------------------
  // VISTA PREVIA TIPO WHATSAPP
  // ---------------------
  // Reemplaza los {{n}} del texto con los valores de example
  // (para que el preview se vea con placeholders rellenos)
  const replacePlaceholders = (text, varValues=[]) => {
    // varValues es array con la posición index 0 => {{1}}, index 1 => {{2}}...
    let result = text;
    varValues.forEach((example, i) => {
      // i=0 => placeholder {{1}}
      // i=1 => placeholder {{2}}
      const ph = `{{${i+1}}}`; 
      result = result.replace(ph, example);
    });
    return result;
  };

  // textoHeaderPreview = el header con placeholders ya remplazados
  const headerPreview = showHeader
    ? replacePlaceholders(headerText, headerVars)
    : "";

  const bodyPreview = replacePlaceholders(bodyText, bodyVars);

  // ---------------------
  // ENVÍO DE LA PLANTILLA
  // ---------------------
  const handleCreate = () => {
    // Generar el name en snake case
    const finalName = toSnakeCase(name);

    // Estructurar "components" según el API
    const components = [];

    // HEADER
    if (showHeader && headerText.trim()) {
        let headerExample = {};
        if (headerVars.length > 0) {
        // CASO 1: hay placeholders => usa headerVars
        headerExample.header_text = [...headerVars];
        } else {
        // CASO 2: no hay placeholders => fallback con el headerText
        headerExample.header_text = [headerText];
        }
    
        components.push({
        type: "HEADER",
        format: "TEXT",
        text: headerText,
        example: headerExample,
        });
    }
    
    // BODY
    if (bodyText.trim()) {
        let bodyExample = {};
        if (bodyVars.length > 0) {
        // placeholders => array de arrays
        bodyExample.body_text = [[...bodyVars]];
        } else {
        // sin placeholders => meter el bodyText en un array de arrays
        bodyExample.body_text = [[bodyText]];
        }
    
        components.push({
        type: "BODY",
        text: bodyText,
        example: bodyExample,
        });
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
      // Filtra los que tengan algo en 'text'
      const filteredButtons = buttons
        .map(b => {
          // Si es QUICK_REPLY => {type: "QUICK_REPLY", text: "..."}
          // Si es PHONE_NUMBER => {type: "PHONE_NUMBER", text: "...", phone_number: "..."}
          // Si es URL => {type: "URL", text: "...", url: "..."}
          // En la Cloud API, se llaman "BUTTON_TYPE" = "QUICK_REPLY" o "PHONE_NUMBER" o "URL"
          // https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates/#interactive-buttons
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

    // Al final, construimos el payload
    const payload = {
      name: finalName,
      category,
      language,
      components
    };

    // Llamamos a la prop onCreate
    onCreate(payload);
  };

  // ---------------------
  // ESTILOS DE VALIDACIÓN BÁSICOS
  // (título y asterisco en rojo si es obligatorio)
  // ---------------------
  const LabelRequired = ({ children }) => (
    <label className="block mb-1 font-semibold">
      <span className="text-gray-700">{children}</span>
      <span className="text-red-600 ml-1">*</span>
    </label>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-5xl relative">
        {/* BOTÓN CERRAR (opcional) */}
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
              <p className="text-xs text-gray-500 mt-1">
                Sin espacios, se convertirá a <em>snake_case</em> automáticamente.
              </p>
            </div>

            {/* Categoría e Idioma */}
            <div className="flex gap-4 mb-4">
              <div className="w-1/2">
                <LabelRequired>Categoría</LabelRequired>
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
                <LabelRequired>Lenguaje</LabelRequired>
                <select 
                  className="w-full border rounded px-3 py-2" 
                  value={language} 
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="es_MX">Español (MX)</option>
                  <option value="en_US">Inglés (US)</option>
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
                   <label>
                      Texto del Encabezado (puede incluir {"{{1}}"})
                   </label>
                  <input 
                    type="text" 
                    className="w-full border rounded px-3 py-2" 
                    value={headerText} 
                    onChange={(e) => setHeaderText(e.target.value)} 
                  />
                </div>
              )}
            </div>

            {/* Body */}
            <div className="mb-4">
              <LabelRequired>Cuerpo / Body</LabelRequired>
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
              <label className="block font-semibold mb-1">Pie de página (Opcional)</label>
              <input 
                type="text" 
                className="w-full border rounded px-3 py-2"
                value={footerText} 
                onChange={(e) => setFooterText(e.target.value)} 
                placeholder="Texto breve al final del mensaje"
              />
            </div>

            {/* Botones */}
            <div className="mb-4">
              <label className="block font-semibold mb-2">Botones (Opcionales)</label>
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
                  {/* Si es PHONE_NUMBER => pide phone_number */}
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
                  {/* Si es URL => pide url */}
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
              {/* Simulación de un teléfono, minimal */}
              <div className="bg-white rounded shadow p-3 min-h-[300px] flex flex-col">
                {/* Header (si aplica) */}
                {headerPreview && (
                  <div className="mb-2 p-2 bg-green-100 text-green-800 rounded self-start">
                    {headerPreview}
                  </div>
                )}

                {/* Body */}
                <div className="flex-1 mb-2 p-2 bg-gray-100 text-black rounded self-start">
                  {bodyPreview}
                </div>

                {/* Footer (si aplica) */}
                {footerText.trim() !== "" && (
                  <div className="mt-2 text-xs text-gray-500 self-start">
                    {footerText}
                  </div>
                )}

                {/* Botones */}
                {buttons.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1 self-start">
                    {buttons.map((btn, i) => (
                      <button 
                        key={i}
                        className="bg-green-600 text-white text-sm px-3 py-1 rounded"
                        style={{alignSelf:'flex-start'}}
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
          >
            Cancelar
          </button>
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded" 
            onClick={handleCreate}
          >
            Crear
          </button>
        </div>
      </div>
    </div>
  );
};

export default CrearPlantillaModal;
