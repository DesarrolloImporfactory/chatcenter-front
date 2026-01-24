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
      <div
        className="
          hidden group-hover:block absolute z-50
          top-full left-1/2 -translate-x-1/2 mt-1
          w-48 bg-black text-white text-xs rounded px-2 py-2 shadow-lg
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

  // Tipo de header (Meta)
  const [headerType, setHeaderType] = useState("TEXT"); // TEXT | IMAGE | VIDEO | DOCUMENT | LOCATION

  // Para header TEXT
  const [headerText, setHeaderText] = useState("");

  // Archivo para header media
  const [headerFile, setHeaderFile] = useState(null);

  // NUEVO: URL temporal para vista previa
  const [headerPreviewUrl, setHeaderPreviewUrl] = useState(null);

  const [bodyText, setBodyText] = useState("");
  const [footerText, setFooterText] = useState("");

  // Para placeholders/variables en HEADER (solo TEXT)
  const [headerVars, setHeaderVars] = useState([]);
  // Para placeholders/variables en BODY
  const [bodyVars, setBodyVars] = useState([]);

  // Botones
  const [buttons, setButtons] = useState([]);

  // Loader al hacer clic en "Crear"
  const [isLoading, setIsLoading] = useState(false);

  // ---------------------
  // Vista previa (Object URL) para IMAGE/VIDEO/DOCUMENT
  // ---------------------
  useEffect(() => {
    if (!headerFile) {
      setHeaderPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(headerFile);
    setHeaderPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [headerFile]);

  // ---------------------
  // DETECCIÓN PLACEHOLDERS (HEADER) SOLO SI ES TEXT
  // ---------------------
  useEffect(() => {
    if (!showHeader || headerType !== "TEXT") {
      if (headerVars.length) setHeaderVars([]);
      return;
    }
    const foundHeader = detectPlaceholders(headerText);
    if (foundHeader.length !== headerVars.length) {
      const newVars = foundHeader.map((_, idx) => headerVars[idx] || "");
      setHeaderVars(newVars);
    }
  }, [headerText, headerType, showHeader]);

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

  // Si cambia el tipo de header, limpia lo que no aplica
  useEffect(() => {
    if (!showHeader) return;

    if (headerType === "TEXT") {
      setHeaderFile(null);
    } else if (headerType === "LOCATION") {
      setHeaderText("");
      setHeaderVars([]);
      setHeaderFile(null);
    } else {
      // media
      setHeaderText("");
      setHeaderVars([]);
      // headerFile se mantiene
    }
  }, [headerType, showHeader]);

  const getAcceptForHeader = () => {
    if (headerType === "IMAGE") return "image/*";
    if (headerType === "VIDEO") return "video/*";
    if (headerType === "DOCUMENT")
      return ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,application/pdf";
    return undefined;
  };

  // Agregar nuevo botón
  const addButton = () => {
    setButtons([
      ...buttons,
      {
        type: "QUICK_REPLY",
        text: "",
        linkType: "static",
        urlBase: "",
        urlVar: "",
      },
    ]);
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
  const replacePlaceholders = (text, varValues = []) => {
    let result = text;
    varValues.forEach((example, i) => {
      const ph = `{{${i + 1}}}`;
      result = result.replace(ph, example);
    });
    return result;
  };

  const headerPreview =
    showHeader && headerType === "TEXT"
      ? replacePlaceholders(headerText, headerVars)
      : "";

  const bodyPreview = replacePlaceholders(bodyText, bodyVars);

  // Validaciones
  const areHeaderVarsFilled = headerVars.every((val) => val.trim() !== "");
  const areBodyVarsFilled = bodyVars.every((val) => val.trim() !== "");

  const headerIsValid = (() => {
    if (!showHeader) return true;

    if (headerType === "TEXT") {
      if (!headerText.trim()) return true;
      return areHeaderVarsFilled;
    }

    if (headerType === "LOCATION") {
      return true;
    }

    return Boolean(headerFile);
  })();

  const isDisabled =
    !name.trim() ||
    !bodyText.trim() ||
    !areBodyVarsFilled ||
    !headerIsValid ||
    isLoading;

  // Enviar la plantilla
  const handleCreate = async () => {
    const finalName = toSnakeCase(name);
    const components = [];

    // HEADER
    if (showHeader) {
      if (headerType === "TEXT") {
        if (headerText.trim()) {
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
      } else if (headerType === "LOCATION") {
        components.push({
          type: "HEADER",
          format: "LOCATION",
        });
      } else {
        // IMAGE / VIDEO / DOCUMENT
        components.push({
          type: "HEADER",
          format: headerType,
        });
      }
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
        text: footerText,
      });
    }

    // BUTTONS
    if (buttons.length > 0) {
      const filteredButtons = buttons
        .map((b) => {
          if (b.type === "QUICK_REPLY") {
            return {
              type: "QUICK_REPLY",
              text: b.text || "Botón sin texto",
            };
          } else if (b.type === "PHONE_NUMBER") {
            return {
              type: "PHONE_NUMBER",
              text: b.text || "Llamar",
              phone_number: b.phone_number || "+593999999999",
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
                example: [finalExample],
              };
            } else {
              return {
                type: "URL",
                text: b.text || "Ir al sitio",
                url: b.url || "https://google.com",
              };
            }
          }
        })
        .filter((btn) => btn.text.trim() !== "");

      if (filteredButtons.length > 0) {
        components.push({
          type: "BUTTONS",
          buttons: filteredButtons,
        });
      }
    }

    const payload = {
      name: finalName,
      category,
      language,
      components,
      ...(showHeader &&
      ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType) &&
      headerFile
        ? { headerFile } // el padre lo convierte a FormData (campo header_file)
        : {}),
    };

    setIsLoading(true);
    try {
      await onCreate(payload);
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  };

  // Preview header “visual”
  const renderHeaderPreview = () => {
    if (!showHeader) return null;

    if (headerType === "TEXT") {
      if (!headerPreview.trim()) return null;
      return (
        <div className="font-bold whitespace-pre-wrap break-words">
          {headerPreview}
        </div>
      );
    }

    if (headerType === "LOCATION") {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-gray-100">
            📍
          </span>
          <div>
            <div className="font-semibold">Ubicación</div>
            <div className="text-xs text-gray-500">
              Encabezado tipo LOCATION (sin archivo)
            </div>
          </div>
        </div>
      );
    }

    // Media (con preview real)
    const isPdf =
      headerFile &&
      (headerFile.type === "application/pdf" ||
        String(headerFile.name || "")
          .toLowerCase()
          .endsWith(".pdf"));

    return (
      <div className="flex flex-col gap-2 text-sm text-gray-700">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-gray-100">
            {headerType === "IMAGE"
              ? "🖼️"
              : headerType === "VIDEO"
                ? "🎬"
                : "📄"}
          </span>
          <div className="min-w-0">
            <div className="font-semibold">
              {headerType === "IMAGE"
                ? "Imagen"
                : headerType === "VIDEO"
                  ? "Video"
                  : "Documento"}
            </div>
            <div className="text-xs text-gray-500 truncate max-w-[220px]">
              {headerFile?.name ? headerFile.name : "Sin archivo seleccionado"}
            </div>
          </div>
        </div>

        {/* Vista previa */}
        {!headerFile || !headerPreviewUrl ? (
          <div className="text-xs text-gray-500">Sin vista previa.</div>
        ) : headerType === "IMAGE" ? (
          <img
            src={headerPreviewUrl}
            alt="Vista previa"
            className="w-full rounded border bg-white"
          />
        ) : headerType === "VIDEO" ? (
          <video
            src={headerPreviewUrl}
            controls
            className="w-full rounded border bg-black"
          />
        ) : isPdf ? (
          <iframe
            title="Vista previa PDF"
            src={headerPreviewUrl}
            className="w-full h-56 rounded border bg-white"
          />
        ) : (
          <div className="text-xs text-gray-500">
            Vista previa disponible solo para PDF. Para este archivo se mostrará
            únicamente el nombre.
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div
        className="
          bg-white p-6 rounded-xl shadow-lg w-full max-w-5xl relative
          max-h-[80vh] overflow-y-auto
        "
      >
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
                <div className="mt-2 border rounded p-3 bg-gray-50">
                  <label className="font-semibold block mb-2">
                    Tipo de Encabezado
                    <InfoIcon tooltipText="Seleccione TEXT para título normal. Para IMAGE/VIDEO/DOCUMENT adjunte un archivo. LOCATION no requiere archivo." />
                  </label>

                  <select
                    className="w-full border rounded px-3 py-2 bg-white"
                    value={headerType}
                    onChange={(e) => setHeaderType(e.target.value)}
                  >
                    <option value="TEXT">Texto</option>
                    <option value="IMAGE">Imagen</option>
                    <option value="VIDEO">Video</option>
                    <option value="DOCUMENT">Documento</option>
                    <option value="LOCATION">Ubicación</option>
                  </select>

                  {/* TEXT */}
                  {headerType === "TEXT" && (
                    <div className="mt-3">
                      <label className="font-semibold block mb-1">
                        Texto del Encabezado{" "}
                        <InfoIcon tooltipText="Ingrese el título. Puede usar {{1}}." />
                      </label>
                      <input
                        type="text"
                        className="w-full border rounded px-3 py-2 bg-white"
                        value={headerText}
                        onChange={(e) => setHeaderText(e.target.value)}
                        placeholder="Ej: ¡Hola {{1}}!"
                      />

                      {headerVars.length > 0 && (
                        <div className="mt-2 text-sm">
                          <p className="font-semibold">
                            Variables detectadas en el Encabezado:
                          </p>
                          {headerVars.map((val, idx) => (
                            <div
                              key={idx}
                              className="flex gap-2 items-center my-1"
                            >
                              <label className="text-gray-600 whitespace-nowrap">
                                {"{{"}
                                {idx + 1}
                                {"}}"}:
                              </label>
                              <input
                                className="border rounded px-2 py-1 flex-1 bg-white"
                                value={val}
                                onChange={(e) => {
                                  const newArr = [...headerVars];
                                  newArr[idx] = e.target.value;
                                  setHeaderVars(newArr);
                                }}
                              />
                            </div>
                          ))}
                          {!areHeaderVarsFilled && (
                            <p className="text-xs text-red-600 mt-1">
                              Debe llenar los ejemplos del encabezado.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* MEDIA */}
                  {["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType) && (
                    <div className="mt-3">
                      <label className="font-semibold block mb-1">
                        Archivo de Encabezado{" "}
                        <InfoIcon tooltipText="Este archivo se usa como ejemplo para aprobación de la plantilla en Meta." />
                      </label>
                      <input
                        type="file"
                        className="w-full border rounded px-3 py-2 bg-white"
                        accept={getAcceptForHeader()}
                        onChange={(e) =>
                          setHeaderFile(e.target.files?.[0] || null)
                        }
                      />
                      <div className="mt-1 text-xs text-gray-600">
                        {headerFile?.name
                          ? `Seleccionado: ${headerFile.name}`
                          : "No ha seleccionado archivo."}
                      </div>
                      {!headerFile && (
                        <p className="text-xs text-red-600 mt-1">
                          Para {headerType} debe adjuntar un archivo.
                        </p>
                      )}
                    </div>
                  )}

                  {/* LOCATION */}
                  {headerType === "LOCATION" && (
                    <div className="mt-3 text-sm text-gray-700">
                      <div className="flex items-start gap-2">
                        <span>📍</span>
                        <div>
                          <div className="font-semibold">
                            Encabezado de ubicación
                          </div>
                          <div className="text-xs text-gray-600">
                            No requiere archivo. La ubicación real se define
                            cuando envíe el mensaje usando esta plantilla.
                          </div>
                        </div>
                      </div>
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
                        {"{{"}
                        {idx + 1}
                        {"}}"}:
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
                  {!areBodyVarsFilled && (
                    <p className="text-xs text-red-600 mt-1">
                      Debe llenar los ejemplos del cuerpo.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mb-4">
              <label className="block font-semibold mb-1">
                Pie de página (Opcional){" "}
                <InfoIcon tooltipText="Texto breve al final del mensaje" />
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
                Botones (Opcionales){" "}
                <InfoIcon tooltipText="Crea botones para que los clientes puedan responder tu mensaje o realizar una acción." />
              </label>

              {buttons.map((btn, i) => (
                <div key={i} className="border p-2 mb-2 rounded bg-gray-50">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Botón #{i + 1}</span>
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
                      <option value="QUICK_REPLY">Personalizado</option>
                      <option value="PHONE_NUMBER">
                        Llamar al número de teléfono
                      </option>
                      <option value="URL">Ir al sitio web</option>
                    </select>

                    <input
                      className="border rounded px-2 py-1 flex-1"
                      placeholder="Texto del botón"
                      value={btn.text}
                      onChange={(e) => updateButton(i, "text", e.target.value)}
                    />
                  </div>

                  {btn.type === "QUICK_REPLY" && (
                    <p className="text-xs text-gray-400 mt-1">
                      Sin límite de botones
                    </p>
                  )}
                  {btn.type === "PHONE_NUMBER" && (
                    <p className="text-xs text-gray-400 mt-1">Máximo 1 botón</p>
                  )}
                  {btn.type === "URL" && (
                    <p className="text-xs text-gray-400 mt-1">
                      Máximo 2 botones
                    </p>
                  )}

                  {btn.type === "PHONE_NUMBER" && (
                    <div className="mt-2">
                      <label className="text-sm text-gray-600 block mb-1">
                        Número de teléfono
                      </label>
                      <input
                        className="border rounded px-2 py-1 w-full"
                        placeholder="+573001234567"
                        value={btn.phone_number || ""}
                        onChange={(e) =>
                          updateButton(i, "phone_number", e.target.value)
                        }
                      />
                    </div>
                  )}

                  {btn.type === "URL" && (
                    <div className="mt-2 border rounded p-2 bg-white">
                      <label className="text-sm font-semibold block mb-1">
                        Tipo de URL:
                      </label>
                      <select
                        className="border rounded px-2 py-1 w-full"
                        value={btn.linkType}
                        onChange={(e) =>
                          updateButton(i, "linkType", e.target.value)
                        }
                      >
                        <option value="static">Estático</option>
                        <option value="dynamic">Dinámico</option>
                      </select>

                      {btn.linkType === "static" && (
                        <div className="mt-2">
                          <label className="text-sm text-gray-600 block mb-1">
                            URL
                          </label>
                          <input
                            className="border rounded px-2 py-1 w-full"
                            placeholder="https://tusitio.com"
                            value={btn.url || ""}
                            onChange={(e) =>
                              updateButton(i, "url", e.target.value)
                            }
                          />
                        </div>
                      )}

                      {btn.linkType === "dynamic" && (
                        <div className="mt-2">
                          <label className="text-sm text-gray-600 block mb-1">
                            Base URL
                          </label>
                          <input
                            className="border rounded px-2 py-1 w-full"
                            placeholder="Ej: https://new.imporsuitpro.com/Pedidos/imprimir_guia/"
                            value={btn.urlBase || ""}
                            onChange={(e) =>
                              updateButton(i, "urlBase", e.target.value)
                            }
                          />

                          <label className="text-sm text-gray-600 block mt-2 mb-1">
                            Variable
                          </label>
                          <input
                            className="border rounded px-2 py-1 w-full"
                            placeholder="Ej: numero_guia"
                            value={btn.urlVar || ""}
                            onChange={(e) =>
                              updateButton(i, "urlVar", e.target.value)
                            }
                          />

                          <p className="text-xs text-gray-500 mt-1">
                            Ejemplo:{" "}
                            {btn.urlBase
                              ? btn.urlBase.endsWith("/")
                                ? btn.urlBase + (btn.urlVar || "valor")
                                : btn.urlBase + "/" + (btn.urlVar || "valor")
                              : "—"}
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

            <div className="border border-gray-300 rounded overflow-hidden text-sm">
              <div
                className="
                  relative w-full h-full p-3 flex flex-col gap-2
                  max-h-[400px] overflow-y-auto
                "
                style={{
                  backgroundColor: "#DAD3CC",
                  backgroundImage:
                    'url("https://imp-datas.s3.amazonaws.com/images/2026-01-05T17-28-02-060Z-fondo_chat_center.png")',
                  backgroundSize: "cover",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                  backgroundBlendMode: "overlay",
                  opacity: 0.8,
                }}
              >
                {(showHeader ||
                  bodyPreview.trim() !== "" ||
                  footerText.trim() !== "" ||
                  buttons.length > 0) && (
                  <div
                    className="
                      self-end bg-white rounded-lg shadow text-black
                      max-w-[80%] p-3 flex flex-col gap-2
                    "
                  >
                    {/* Header visual */}
                    {renderHeaderPreview()}

                    {/* Body */}
                    {bodyPreview.trim() !== "" && (
                      <div className="whitespace-pre-wrap break-words">
                        {bodyPreview}
                      </div>
                    )}

                    {/* Footer */}
                    {footerText.trim() !== "" && (
                      <div className="text-xs text-gray-500 whitespace-pre-wrap break-words">
                        {footerText}
                      </div>
                    )}

                    {/* Buttons */}
                    {buttons.length > 0 && (
                      <div className="flex flex-col mt-2">
                        {buttons.map((btn, i) => (
                          <React.Fragment key={i}>
                            <hr className="border-gray-300 my-1" />
                            <div
                              className="
                                text-blue-600 text-sm px-3 py-2 rounded
                                text-center cursor-pointer
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

            {/* Nota de validación */}
            {showHeader &&
              ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType) &&
              !headerFile && (
                <div className="mt-2 text-xs text-red-600">
                  Para este tipo de encabezado debe seleccionar un archivo.
                </div>
              )}
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
              isDisabled
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 text-white"
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
                  cx="12"
                  cy="12"
                  r="10"
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
