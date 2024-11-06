import { useState } from "react";
import Swal from "sweetalert2";

const Modales = ({
  numeroModal,
  handleNumeroModal,
  handleSubmit,
  handleNumeroModalForm,
  register,
  handleInputChange_numeroCliente,
  searchResultsNumeroCliente,
  handleOptionSelectNumeroTelefono,
  inputRefNumeroTelefono,
  templates,
  dataAdmin,
  seleccionado,
  handleSelectPhoneNumber,
  selectedPhoneNumber,
  userData,
  modal_enviarArchivos,
  tipo_modalEnviarArchivo,
  handleModal_enviarArchivos,
  selectedChat,
}) => {
  const [templateText, setTemplateText] = useState("");
  const [placeholders, setPlaceholders] = useState([]);
  const [placeholderValues, setPlaceholderValues] = useState({}); // Guardar los valores de cada placeholder
  const [templateName, setTemplateName] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("es");

  // Estado para el modal "Añadir número"
  const [isAddNumberModalOpen, setIsAddNumberModalOpen] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");

  /* seccion modal enviar archivo */
  const [imagenes, setImagenes] = useState([]);
  const [imagenSeleccionada, setImagenSeleccionada] = useState(null);

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    const newImages = files.map((file) => ({
      id: URL.createObjectURL(file),
      file,
      caption: "", // Para almacenar una nota debajo de cada imagen
    }));
    setImagenes((prev) => [...prev, ...newImages]);
    if (!imagenSeleccionada) setImagenSeleccionada(newImages[0]); // Selecciona la primera imagen subida como la activa
  };

  const handleCaptionChange = (value) => {
    if (imagenSeleccionada) {
      setImagenSeleccionada({ ...imagenSeleccionada, caption: value });
      setImagenes((prev) =>
        prev.map((img) =>
          img.id === imagenSeleccionada.id ? { ...img, caption: value } : img
        )
      );
    }
  };

  const selectImage = (image) => {
    setImagenSeleccionada(image);
  };

  const deleteImage = (imageId) => {
    setImagenes((prev) => prev.filter((img) => img.id !== imageId));
    if (imagenSeleccionada?.id === imageId) {
      setImagenSeleccionada(
        imagenes.length > 1 ? imagenes.find((img) => img.id !== imageId) : null
      );
    }
  };

  const enviarImagenesWhatsApp = async () => {
    for (let img of imagenes) {
      try {
        // Subir imagen al servidor
        const imageUrl = await uploadImagen(img.file);

        // Enviar imagen a WhatsApp
        if (imageUrl) {
          await enviarImagenWhatsApp(imageUrl, img.caption);
        }
      } catch (error) {
        console.error("Error al procesar la imagen:", error);
        alert("Ocurrió un error al enviar la imagen. Inténtalo más tarde.");
      }
    }
    /* alert("Todas las imágenes fueron enviadas con éxito."); */

    // Cerrar el modal y limpiar la lista de imágenes
    handleModal_enviarArchivos(""); // Cierra el modal
    setImagenes([]); // Limpia la lista de imágenes
    setImagenSeleccionada(null); // Limpia la imagen seleccionada
  };

  // Función para subir la imagen al servidor
  const uploadImagen = async (imagen) => {
    const formData = new FormData();
    formData.append("imagen", imagen); // Agrega la imagen al FormData

    try {
      const response = await fetch(
        "https://new.imporsuitpro.com/" + "Pedidos/guardar_imagen_Whatsapp",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (data.status === 500 || data.status === 400) {
        alert(`Error al subir imagen: ${data.message}`);
        return null;
      }

      return data.data; // Retorna la URL de la imagen subida
    } catch (error) {
      console.error("Error en la solicitud de subida:", error);
      alert(
        "No se pudo conectar con el servidor. Inténtalo de nuevo más tarde."
      );
      return null;
    }
  };

  // Función para enviar la imagen a través de la API de WhatsApp
  const enviarImagenWhatsApp = async (imageUrl, caption = "") => {
    const fromPhoneNumberId = dataAdmin.id_telefono;
    const accessToken = dataAdmin.token;
    const numeroDestino = selectedChat.celular_cliente;
    const apiUrl = `https://graph.facebook.com/v19.0/${fromPhoneNumberId}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      to: numeroDestino,
      type: "image",
      image: {
        link: "https://new.imporsuitpro.com/" + imageUrl,
        caption: caption,
      },
    };

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.error) {
        console.error("Error al enviar la imagen a WhatsApp:", result.error);
        alert(`Error: ${result.error.message}`);
        return;
      }

      console.log("Imagen enviada con éxito a WhatsApp:", result);
    } catch (error) {
      console.error("Error en la solicitud de WhatsApp:", error);
      alert("Ocurrió un error al enviar la imagen. Inténtalo más tarde.");
    }
  };
  /* fin seccion modal enviar archivo */

  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener("mouseenter", Swal.stopTimer);
      toast.addEventListener("mouseleave", Swal.resumeTimer);
    },
  });

  // Abrir modal de "Añadir número"
  const openAddNumberModal = () => {
    setIsAddNumberModalOpen(true);
  };

  // Cerrar modal de "Añadir número"
  const closeAddNumberModal = () => {
    setIsAddNumberModalOpen(false);
    setNewContactName("");
    setNewContactPhone("");
  };

  // Manejar la adición del nuevo número
  const handleAddNewContact = async () => {
    if (!newContactName || !newContactPhone) {
      Toast.fire({
        icon: "warning",
        title: "Por favor ingrese el nombre y el número de teléfono.",
      });
      return;
    }

    try {
      // Crear el objeto FormData y añadir los valores
      const formData = new FormData();
      formData.append("nombre", newContactName);
      formData.append("telefono", newContactPhone);
      formData.append("apellido", "");
      formData.append("id_plataforma", userData.plataforma);

      // Realizar la solicitud fetch
      const response = await fetch(
        "https://new.imporsuitpro.com/Pedidos/agregar_numero_chat",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Error al añadir el contacto: ${response.statusText}`);
      }

      const data = await response.json();

      // Mostrar mensaje de éxito con Toast
      Toast.fire({
        icon: "success",
        title: "Contacto añadido correctamente",
      });

      // Agregar el nuevo contacto a la lista de resultados de búsqueda
      handleOptionSelectNumeroTelefono({
        nombre_cliente: newContactName,
        celular_cliente: newContactPhone,
      });

      // Cerrar el modal después de agregar el contacto
      closeAddNumberModal();
    } catch (error) {
      console.error("Error al añadir el contacto:", error);
      Toast.fire({
        icon: "error",
        title: "Error al añadir el contacto",
      });
    }
  };

  // Resto del código de selección de template, placeholders, y envío...

  // Manejar la selección del template, extraer el texto, placeholders y el idioma
  const handleTemplateSelect = (event) => {
    const selectedTemplateName = event.target.value;
    setTemplateName(selectedTemplateName);

    const selectedTemplate = templates.find(
      (template) => template.name === selectedTemplateName
    );

    if (selectedTemplate) {
      const templateBodyComponent = selectedTemplate.components.find(
        (comp) => comp.type === "BODY"
      );

      if (templateBodyComponent && templateBodyComponent.text) {
        const templateText = templateBodyComponent.text;
        setTemplateText(templateText);

        // Extraer placeholders en formato {{1}}, {{2}}, etc.
        const extractedPlaceholders = [
          ...templateText.matchAll(/{{(.*?)}}/g),
        ].map((match) => match[1]);

        // Crear un estado inicial vacío para cada placeholder
        const initialPlaceholderValues = {};
        extractedPlaceholders.forEach((placeholder) => {
          initialPlaceholderValues[placeholder] = "";
        });

        setPlaceholders(extractedPlaceholders);
        setPlaceholderValues(initialPlaceholderValues); // Guardar placeholders vacíos para su edición
      } else {
        setTemplateText("Este template no tiene un cuerpo definido.");
        setPlaceholders([]);
        setPlaceholderValues({});
      }

      const templateLanguage = selectedTemplate.language || "es";
      setSelectedLanguage(templateLanguage);
    }
  };

  // Función para manejar cambios en el textarea
  const handleTextareaChange = (event) => {
    setTemplateText(event.target.value);
  };

  // Función para manejar cambios en los inputs de los placeholders
  const handlePlaceholderChange = (placeholder, value) => {
    setPlaceholderValues((prevValues) => ({
      ...prevValues,
      [placeholder]: value,
    }));
  };

  // Función para enviar el template a WhatsApp
  const enviarTemplate = async () => {
    const fromPhoneNumberId = dataAdmin.id_telefono;
    const accessToken = dataAdmin.token;
    const recipientPhone = selectedPhoneNumber;

    if (!recipientPhone) {
      alert("Debes ingresar un número de destinatario.");
      return;
    }

    // Reemplazar los placeholders en el texto del template
    let finalText = templateText;
    placeholders.forEach((placeholder) => {
      const value = placeholderValues[placeholder] || `{{${placeholder}}}`;
      finalText = finalText.replace(`{{${placeholder}}}`, value);
    });

    // Construir el cuerpo del mensaje para la API de WhatsApp
    const body = {
      messaging_product: "whatsapp",
      to: recipientPhone,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: selectedLanguage,
        },
        components: [
          {
            type: "body",
            parameters: placeholders.map((placeholder) => ({
              type: "text",
              text: placeholderValues[placeholder] || `{{${placeholder}}}`,
            })),
          },
        ],
      },
    };

    try {
      const response = await fetch(
        `https://graph.facebook.com/v19.0/${fromPhoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        throw new Error(`Error al enviar template: ${response.statusText}`);
      }

      const data = await response.json();
      /* console.log("Template enviado exitosamente:", data); */
      Toast.fire({
        icon: "success",
        title: "Mensaje enviado correctamente",
      });
    } catch (error) {
      console.error("Error al enviar el template:", error);
      Toast.fire({
        icon: "error",
        title: "Error al enviar mensaje",
      });
    }
  };

  return (
    <>
      {numeroModal && (
        <div className="fixed inset-0 z-10 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg max-h-[80%] overflow-y-auto">
            <h2 className="text-xl font-medium">Agregar número</h2>
            <form
              className="grid items-center gap-2 my-4"
              onSubmit={handleSubmit(handleNumeroModalForm)}
            >
              <input
                type="text"
                placeholder="Número de teléfono"
                id="numeroAdd"
                onInput={handleInputChange_numeroCliente}
                ref={inputRefNumeroTelefono}
                className="p-2 border rounded"
                {...register("numero", {
                  required: "El número es obligatorio",
                })}
              />

              {/* Resultados de la búsqueda de números de clientes */}
              <ul className="space-y-2 h-64 overflow-y-auto">
                <li
                  className="cursor-pointer hover:bg-gray-200 p-2 rounded"
                  onClick={openAddNumberModal}
                >
                  <div>
                    <strong>+ Añadir número</strong>
                  </div>
                </li>
                {searchResultsNumeroCliente.length > 0 ? (
                  searchResultsNumeroCliente.map((result, index) => (
                    <li
                      key={index}
                      onClick={() =>
                        handleSelectPhoneNumber(result.celular_cliente)
                      }
                      className="cursor-pointer hover:bg-gray-200 p-2 rounded"
                    >
                      <div>
                        <strong>Nombre:</strong> {result.nombre_cliente}
                      </div>
                      <div>
                        <strong>Teléfono:</strong> {result.celular_cliente}
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="text-gray-500">No hay resultados</li>
                )}
              </ul>
            </form>

            {/* Sección de template que solo se muestra si 'seleccionado' es true */}
            {seleccionado && (
              <form className="mt-4 p-4 border rounded bg-gray-50">
                <h4 className="font-semibold text-lg mb-2">
                  Seleccione un template
                </h4>
                <select
                  id="lista_templates"
                  className="w-full p-2 border rounded mb-4"
                  onChange={handleTemplateSelect}
                >
                  <option value="">Seleccione un template</option>
                  {templates.map((template, index) => (
                    <option
                      key={`${template.name}-${index}`}
                      value={template.name}
                    >
                      {template.name}
                    </option>
                  ))}
                </select>

                <textarea
                  id="template_textarea"
                  rows="8"
                  value={templateText}
                  onChange={handleTextareaChange}
                  className="w-full p-2 border rounded mb-4"
                ></textarea>

                {/* Inputs dinámicos para cada placeholder */}
                {placeholders.map((placeholder) => (
                  <div key={placeholder} className="mb-2">
                    <label className="block text-sm font-semibold mb-1">
                      {`Valor para {{${placeholder}}}`}
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded"
                      value={placeholderValues[placeholder] || ""}
                      onChange={(e) =>
                        handlePlaceholderChange(placeholder, e.target.value)
                      }
                    />
                  </div>
                ))}

                <button
                  type="button"
                  onClick={enviarTemplate}
                  className="bg-green-500 text-white px-4 py-2 rounded"
                >
                  Enviar Template
                </button>
              </form>
            )}

            <button
              onClick={handleNumeroModal}
              className="bg-red-500 text-white px-4 py-2 rounded mt-2"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Modal para añadir nuevo número */}
      {isAddNumberModalOpen && (
        <div className="fixed inset-0 z-20 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-xs w-full">
            <h3 className="text-lg font-semibold mb-4">Añadir nuevo número</h3>
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-1">Nombre</label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-1">
                Teléfono
              </label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={newContactPhone}
                onChange={(e) => setNewContactPhone(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={closeAddNumberModal}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded"
              >
                Cerrar
              </button>
              <button
                onClick={handleAddNewContact}
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                Añadir
              </button>
            </div>
          </div>
        </div>
      )}

      {modal_enviarArchivos && (
        <div className="fixed inset-0 z-10 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg max-h-[80%] w-full max-w-md overflow-y-auto">
            <h2 className="text-xl font-medium mb-4">Enviar</h2>

            {tipo_modalEnviarArchivo === "Imagen" && (
              <div>
                <h2 className="text-lg font-medium mb-2">Imágenes</h2>

                {/* Vista de la imagen seleccionada */}
                {imagenSeleccionada && (
                  <div className="flex flex-col items-center mb-4">
                    <img
                      src={imagenSeleccionada.id}
                      alt="Imagen seleccionada"
                      className="w-full h-60 object-cover rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Añade un comentario"
                      value={imagenSeleccionada.caption}
                      onChange={(e) => handleCaptionChange(e.target.value)}
                      className="w-full mt-2 p-2 border rounded text-sm"
                    />
                  </div>
                )}

                {/* Carrusel de miniaturas con scroll horizontal visible */}
                <div
                  className="flex items-center space-x-2 overflow-x-auto whitespace-nowrap mb-4 border-t pt-2"
                  style={{ maxWidth: "100%" }}
                >
                  {imagenes.map((img) => (
                    <div key={img.id} className="relative">
                      <img
                        src={img.id}
                        alt="Miniatura"
                        className={`w-16 h-16 object-cover rounded-lg cursor-pointer ${
                          img.id === imagenSeleccionada?.id
                            ? "border-2 border-blue-500"
                            : ""
                        }`}
                        onClick={() => selectImage(img)}
                      />
                      {/* Botón de eliminar en la esquina superior derecha */}
                      <button
                        onClick={() => deleteImage(img.id)}
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {/* Botón para añadir más imágenes */}
                  <label className="flex items-center justify-center w-16 h-16 border rounded-lg cursor-pointer text-blue-500">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <i className="bx bx-plus text-3xl"></i>
                  </label>
                </div>

                {/* Botón de enviar */}
                <button
                  onClick={enviarImagenesWhatsApp}
                  className="bg-blue-500 text-white px-4 py-2 rounded mt-4 w-full"
                >
                  Enviar
                </button>
              </div>
            )}

            {/* Botón para cerrar el modal */}
            <button
              onClick={() => handleModal_enviarArchivos("")}
              className="bg-red-500 text-white px-4 py-2 rounded mt-2 w-full"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Modales;
