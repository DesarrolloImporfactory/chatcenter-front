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
  agregar_mensaje_enviado,
  getFileIcon,
  isCrearEtiquetaModalOpen,
  toggleCrearEtiquetaModal,
  tagList,
  setTagList,
  fetchTags,
  isAsignarEtiquetaModalOpen,
  toggleAsginarEtiquetaModal,
  tagListAsginadas,
  setTagListAsginadas,
  setNumeroModal,
  cargar_socket,
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

  /* modal crear etiquetas */
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState("#ff0000"); // Color predeterminado

  const handleTagCreation = async () => {
    if (tagName) {
      try {
        // Crear un objeto FormData y agregar los datos necesarios
        const formData = new FormData();
        formData.append("id_plataforma", userData.plataforma);
        formData.append("nombre_etiqueta", tagName);
        formData.append("color_etiqueta", tagColor);

        const response = await fetch(
          "https://new.imporsuitpro.com/Pedidos/agregar_etiqueta",
          {
            method: "POST",
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error("Error al obtener las etiquetas");
        }

        const data = await response.json();
        fetchTags();
      } catch (error) {
        console.error("Error fetching tags:", error);
      }

      // Reiniciar el estado
      setTagName("");
      setTagColor("#ff0000");
      /* toggleCrearEtiquetaModal(); */
    } else {
      alert("Por favor, ingresa un nombre para la etiqueta.");
    }
  };

  const eliminarProducto = async (id_etiqueta) => {
    try {
      const response = await fetch(
        "https://new.imporsuitpro.com/Pedidos/eliminarEtiqueta/" + id_etiqueta
      );

      if (!response.ok) {
        throw new Error("Error al obtener las etiquetas");
      }

      const data = await response.json();
      fetchTags();
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  /* fin modal crear etiquetas */

  /* modal asignar etiquetas */
  const toggleTagAssignment = async (idEtiqueta, idClienteChat) => {
    try {
      // Crear un objeto FormData y agregar los datos necesarios
      const formData = new FormData();
      formData.append("id_cliente_chat_center", idClienteChat);
      formData.append("id_etiqueta", idEtiqueta);
      formData.append("id_plataforma", userData.plataforma);

      // Llamar a la API para asignar/desasignar la etiqueta
      const response = await fetch(
        "https://new.imporsuitpro.com/Pedidos/toggle_etiqueta_asignacion",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Error al asignar/desasignar la etiqueta");
      }

      const result = await response.json();

      // Verificar el estado de asignación de la etiqueta en la respuesta
      const isAssigned = result.asignado;

      // Actualizar `tagListAsginadas` en función del nuevo estado de asignación
      setTagListAsginadas((prev) => {
        if (isAssigned) {
          // Agregar la etiqueta a `tagListAsginadas` si fue asignada
          return [...prev, { id_etiqueta: idEtiqueta }];
        } else {
          // Remover la etiqueta de `tagListAsginadas` si fue desasignada
          return prev.filter((tag) => tag.id_etiqueta !== idEtiqueta);
        }
      });
    } catch (error) {
      console.error("Error en toggleTagAssignment:", error);
    }
  };

  /* fin modal asignar etiquetas */

  /* ----- enviar imagenes ---------*/
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

  const [botonDeshabilitado_img, setBotonDeshabilitado_img] = useState(false);

  const enviarImagenesWhatsApp = async () => {
    setBotonDeshabilitado_img(true); // Bloquear el botón al iniciar el proceso

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

    // Cerrar el modal y limpiar la lista de imágenes
    handleModal_enviarArchivos(""); // Cierra el modal
    setImagenes([]); // Limpia la lista de imágenes
    setImagenSeleccionada(null); // Limpia la imagen seleccionada

    setBotonDeshabilitado_img(false); // Desbloquear el botón al cerrar el modal
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

      let id_recibe = selectedChat.id;
      let mid_mensaje = dataAdmin.id_telefono;
      let id_plataforma = userData.plataforma;
      let telefono_configuracion = dataAdmin.telefono;
      agregar_mensaje_enviado(
        caption,
        "image",
        imageUrl,
        numeroDestino,
        mid_mensaje,
        id_recibe,
        id_plataforma,
        telefono_configuracion
      );

      /* cargar socket */
      cargar_socket();
    } catch (error) {
      console.error("Error en la solicitud de WhatsApp:", error);
      alert("Ocurrió un error al enviar la imagen. Inténtalo más tarde.");
    }
  };

  /* ----- fin enviar imagenes ---------*/

  /* ----- enviar documentos ---------*/
  const [documentos, setDocumentos] = useState([]);
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState(null);

  const handleDocumentUpload = (event) => {
    let MAX_FILE_SIZE_MB = 16; // Tamaño máximo de archivo en MB
    const files = Array.from(event.target.files);
    const newDocuments = files
      .filter((file) => {
        if (file.size / (1024 * 1024) > MAX_FILE_SIZE_MB) {
          Toast.fire({
            icon: "error",
            title: "El archivo excede el tamaño máximo permitido de 16 MB.",
          });
          return false;
        }
        return true;
      })
      .map((file) => ({
        id: URL.createObjectURL(file),
        file,
        name: file.name, // Nombre del documento
        size: (file.size / 1024).toFixed(2) + " KB", // Tamaño en KB
        caption: "", // Para almacenar un comentario para cada documento
      }));

    setDocumentos((prev) => [...prev, ...newDocuments]);
    if (!documentoSeleccionado && newDocuments.length > 0) {
      setDocumentoSeleccionado(newDocuments[0]); // Selecciona el primer documento como activo
    }
  };

  const handleDocumentCaptionChange = (value) => {
    if (documentoSeleccionado) {
      setDocumentoSeleccionado({ ...documentoSeleccionado, caption: value });
      setDocumentos((prev) =>
        prev.map((doc) =>
          doc.id === documentoSeleccionado.id ? { ...doc, caption: value } : doc
        )
      );
    }
  };

  const selectDocument = (document) => {
    setDocumentoSeleccionado(document);
  };

  const deleteDocument = (documentId) => {
    setDocumentos((prev) => prev.filter((doc) => doc.id !== documentId));
    if (documentoSeleccionado?.id === documentId) {
      setDocumentoSeleccionado(
        documentos.length > 1
          ? documentos.find((doc) => doc.id !== documentId)
          : null
      );
    }
  };

  const [botonDeshabilitado_doc, setBotonDeshabilitado_doc] = useState(false);

  const enviarDocumentosWhatsApp = async () => {
    setBotonDeshabilitado_doc(true); // Bloquear el botón al iniciar el proceso

    for (let doc of documentos) {
      try {
        // Subir documento al servidor
        const documentUrl = await uploadDocumento(doc.file);

        // Enviar documento a WhatsApp
        if (documentUrl) {
          await enviarDocumentoWhatsApp(documentUrl, doc.caption);
        }
      } catch (error) {
        console.error("Error al procesar el documento:", error);
        alert("Ocurrió un error al enviar el documento. Inténtalo más tarde.");
      }
    }

    // Cerrar el modal y limpiar la lista de documentos
    handleModal_enviarArchivos(""); // Cierra el modal
    setDocumentos([]); // Limpia la lista de documentos
    setDocumentoSeleccionado(null); // Limpia el documento seleccionado

    setBotonDeshabilitado_doc(false); // Desbloquear el botón al finalizar
  };

  // Función para subir el documento al servidor
  const uploadDocumento = async (documento) => {
    const formData = new FormData();
    formData.append("documento", documento);

    try {
      const response = await fetch(
        "https://new.imporsuitpro.com/Pedidos/guardar_documento_Whatsapp",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (data.status === 500 || data.status === 400) {
        alert(`Error al subir documento: ${data.message}`);
        return null;
      }

      return data.data; // Retorna la URL del documento subido
    } catch (error) {
      console.error("Error en la solicitud de subida:", error);
      alert(
        "No se pudo conectar con el servidor. Inténtalo de nuevo más tarde."
      );
      return null;
    }
  };

  // Función para enviar el documento a través de la API de WhatsApp
  const enviarDocumentoWhatsApp = async (documentUrl, caption = "") => {
    const fromPhoneNumberId = dataAdmin.id_telefono;
    const accessToken = dataAdmin.token;
    const numeroDestino = selectedChat.celular_cliente;
    const apiUrl = `https://graph.facebook.com/v19.0/${fromPhoneNumberId}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      to: numeroDestino,
      type: "document",
      document: {
        link: "https://new.imporsuitpro.com/" + documentUrl.ruta,
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
        console.error("Error al enviar el documento a WhatsApp:", result.error);
        alert(`Error: ${result.error.message}`);
        return;
      }

      console.log("Documento enviado con éxito a WhatsApp:", result);

      let id_recibe = selectedChat.id;
      let mid_mensaje = dataAdmin.id_telefono;
      let id_plataforma = userData.plataforma;
      let telefono_configuracion = dataAdmin.telefono;
      agregar_mensaje_enviado(
        caption,
        "document",
        JSON.stringify(documentUrl),
        numeroDestino,
        mid_mensaje,
        id_recibe,
        id_plataforma,
        telefono_configuracion
      );

      /* cargar socket */
      cargar_socket();
    } catch (error) {
      console.error("Error en la solicitud de WhatsApp:", error);
      alert("Ocurrió un error al enviar el documento. Inténtalo más tarde.");
    }
  };
  /* ----- fin enviar documentos ---------*/

  /* ----- enviar videos ---------*/
  // Estado para manejar los videos
  const [videos, setVideos] = useState([]);
  const [videoSeleccionado, setVideoSeleccionado] = useState(null);

  // Manejar carga de videos
  const handleVideoUpload = (event) => {
    let MAX_FILE_SIZE_MB = 16; // Tamaño máximo de archivo en MB

    const files = Array.from(event.target.files);
    const newVideos = files
      .filter((file) => {
        if (file.size / (1024 * 1024) > MAX_FILE_SIZE_MB) {
          Toast.fire({
            icon: "error",
            title: "El archivo excede el tamaño máximo permitido de 16 MB.",
          });
          return false;
        }
        return true;
      })
      .map((file) => ({
        id: URL.createObjectURL(file),
        file,
        caption: "", // Para almacenar una nota debajo de cada video
      }));

    setVideos((prev) => [...prev, ...newVideos]);
    if (!videoSeleccionado && newVideos.length > 0) {
      setVideoSeleccionado(newVideos[0]); // Selecciona el primer video como activo
    }
  };

  // Cambiar el comentario del video seleccionado
  const handleVideoCaptionChange = (value) => {
    if (videoSeleccionado) {
      setVideoSeleccionado({ ...videoSeleccionado, caption: value });
      setVideos((prev) =>
        prev.map((vid) =>
          vid.id === videoSeleccionado.id ? { ...vid, caption: value } : vid
        )
      );
    }
  };

  // Seleccionar un video específico
  const selectVideo = (video) => {
    setVideoSeleccionado(video);
  };

  // Eliminar un video específico
  const deleteVideo = (videoId) => {
    setVideos((prev) => prev.filter((vid) => vid.id !== videoId));
    if (videoSeleccionado?.id === videoId) {
      setVideoSeleccionado(
        videos.length > 1 ? videos.find((vid) => vid.id !== videoId) : null
      );
    }
  };

  // Enviar videos a WhatsApp
  const [botonDeshabilitado_vid, setBotonDeshabilitado_vid] = useState(false);

  const enviarVideosWhatsApp = async () => {
    setBotonDeshabilitado_vid(true); // Bloquear el botón al iniciar el proceso

    for (let vid of videos) {
      try {
        // Subir video al servidor
        const videoUrl = await uploadVideo(vid.file);

        // Enviar video a WhatsApp
        if (videoUrl) {
          await enviarVideoWhatsApp(videoUrl, vid.caption);
        }
      } catch (error) {
        console.error("Error al procesar el video:", error);
        alert("Ocurrió un error al enviar el video. Inténtalo más tarde.");
      }
    }

    // Cerrar el modal y limpiar la lista de videos
    handleModal_enviarArchivos(""); // Cierra el modal
    setVideos([]); // Limpia la lista de videos
    setVideoSeleccionado(null); // Limpia el video seleccionado

    setBotonDeshabilitado_vid(false); // Desbloquear el botón al finalizar
  };

  // Función para subir el video al servidor
  const uploadVideo = async (video) => {
    const formData = new FormData();
    formData.append("video", video);

    try {
      const response = await fetch(
        "https://new.imporsuitpro.com/Pedidos/guardar_video_Whatsapp",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (data.status === 500 || data.status === 400) {
        alert(`Error al subir video: ${data.message}`);
        return null;
      }

      return data.data; // Retorna la URL del video subido
    } catch (error) {
      console.error("Error en la solicitud de subida:", error);
      alert(
        "No se pudo conectar con el servidor. Inténtalo de nuevo más tarde."
      );
      return null;
    }
  };

  // Función para enviar el video a través de la API de WhatsApp
  const enviarVideoWhatsApp = async (videoUrl, caption = "") => {
    const fromPhoneNumberId = dataAdmin.id_telefono;
    const accessToken = dataAdmin.token;
    const numeroDestino = selectedChat.celular_cliente;
    const apiUrl = `https://graph.facebook.com/v19.0/${fromPhoneNumberId}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      to: numeroDestino,
      type: "video",
      video: {
        link: "https://new.imporsuitpro.com/" + videoUrl,
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
        console.error("Error al enviar el video a WhatsApp:", result.error);
        alert(`Error: ${result.error.message}`);
        return;
      }

      console.log("Video enviado con éxito a WhatsApp:", result);

      let id_recibe = selectedChat.id;
      let mid_mensaje = dataAdmin.id_telefono;
      let id_plataforma = userData.plataforma;
      let telefono_configuracion = dataAdmin.telefono;
      agregar_mensaje_enviado(
        caption,
        "video",
        videoUrl,
        numeroDestino,
        mid_mensaje,
        id_recibe,
        id_plataforma,
        telefono_configuracion
      );

      /* cargar socket */
      cargar_socket();
    } catch (error) {
      console.error("Error en la solicitud de WhatsApp:", error);
      alert("Ocurrió un error al enviar el video. Inténtalo más tarde.");
    }
  };
  /* ----- fin enviar videos ---------*/

  /* fin seccion modal enviar archivo */

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

  const generarObjetoPlaceholders = (placeholders, placeholderValues) => {
    // Crear un objeto con claves y valores
    const resultado = {};

    placeholders.forEach((placeholder) => {
      resultado[placeholder] =
        placeholderValues[placeholder] || `{{${placeholder}}}`;
    });

    return resultado;
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

      let id_recibe = selectedChat.id;
      let mid_mensaje = dataAdmin.id_telefono;
      let id_plataforma = userData.plataforma;
      let telefono_configuracion = dataAdmin.telefono;
      let ruta_archivo = generarObjetoPlaceholders(
        placeholders,
        placeholderValues
      );

      agregar_mensaje_enviado(
        templateText,
        "text",
        JSON.stringify(ruta_archivo),
        selectedChat.celular_cliente,
        mid_mensaje,
        id_recibe,
        id_plataforma,
        telefono_configuracion
      );

      /* cargar socket */
      cargar_socket();

      setNumeroModal(false);
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
          <div className="relative bg-white p-4 rounded-lg max-h-[80%] overflow-y-auto">
            {/* Botón de cierre con icono en la esquina superior derecha */}
            <button
              onClick={handleNumeroModal}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

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
              <ul className="space-y-2 max-h-64 overflow-y-auto">
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
                      className={`cursor-pointer p-2 rounded ${
                        selectedPhoneNumber === result.celular_cliente
                          ? "bg-gray-300"
                          : "hover:bg-gray-200"
                      }`}
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
                  disabled={botonDeshabilitado_img} // Deshabilitar el botón según el estado
                  className={`px-4 py-2 rounded mt-4 w-full transition-all ${
                    botonDeshabilitado_img
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-500 text-white hover:bg-blue-600"
                  }`}
                >
                  {botonDeshabilitado_img ? "Enviando..." : "Enviar"}
                </button>
              </div>
            )}

            {tipo_modalEnviarArchivo === "Documento" && (
              <div>
                <h2 className="text-lg font-medium mb-2">Documentos</h2>

                {/* Vista del documento seleccionado en grande */}
                {documentoSeleccionado && (
                  <div className="flex flex-col items-center mb-4">
                    <div className="flex flex-col items-center justify-center w-full h-40 bg-gray-100 rounded-lg">
                      <i
                        className={`${
                          getFileIcon(documentoSeleccionado.name).icon
                        } text-6xl ${
                          getFileIcon(documentoSeleccionado.name).color
                        }`}
                      ></i>
                      <p className="text-gray-700 mt-2 text-center truncate w-full px-2">
                        {documentoSeleccionado.name}
                      </p>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {documentoSeleccionado.size}
                    </p>
                    <input
                      type="text"
                      placeholder="Añade un comentario"
                      value={documentoSeleccionado.caption}
                      onChange={(e) =>
                        handleDocumentCaptionChange(e.target.value)
                      }
                      className="w-full mt-2 p-2 border rounded text-sm"
                    />
                  </div>
                )}

                {/* Carrusel de miniaturas de documentos con scroll horizontal */}
                <div
                  className="flex items-center space-x-2 overflow-x-auto whitespace-nowrap mb-4 border-t pt-2"
                  style={{ maxWidth: "100%" }}
                >
                  {documentos.map((doc) => (
                    <div
                      key={doc.id}
                      className="relative flex flex-col items-center"
                    >
                      <div
                        className={`w-16 h-16 flex items-center justify-center bg-gray-100 rounded-lg cursor-pointer ${
                          doc.id === documentoSeleccionado?.id
                            ? "border-2 border-blue-500"
                            : ""
                        }`}
                        onClick={() => selectDocument(doc)}
                      >
                        <i
                          className={`${getFileIcon(doc.name).icon} text-3xl ${
                            getFileIcon(doc.name).color
                          }`}
                        ></i>
                      </div>
                      <button
                        onClick={() => deleteDocument(doc.id)}
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {/* Botón para añadir más documentos */}
                  <label className="flex items-center justify-center w-16 h-16 border rounded-lg cursor-pointer text-blue-500">
                    <input
                      type="file"
                      accept="*/*"
                      multiple
                      onChange={handleDocumentUpload}
                      className="hidden"
                    />
                    <i className="bx bx-plus text-3xl"></i>
                  </label>
                </div>

                {/* Botón de enviar */}
                <button
                  onClick={enviarDocumentosWhatsApp}
                  disabled={botonDeshabilitado_doc} // Deshabilitar el botón según el estado
                  className={`px-4 py-2 rounded mt-4 w-full transition-all ${
                    botonDeshabilitado_doc
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-500 text-white hover:bg-blue-600"
                  }`}
                >
                  {botonDeshabilitado_doc ? "Enviando..." : "Enviar"}
                </button>
              </div>
            )}

            {tipo_modalEnviarArchivo === "Video" && (
              <div>
                <h2 className="text-lg font-medium mb-2">Videos</h2>

                {/* Vista del video seleccionado */}
                {videoSeleccionado && (
                  <div className="flex flex-col items-center mb-4">
                    <video
                      src={videoSeleccionado.id}
                      controls
                      className="w-full h-60 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Añade un comentario"
                      value={videoSeleccionado.caption}
                      onChange={(e) => handleVideoCaptionChange(e.target.value)}
                      className="w-full mt-2 p-2 border rounded text-sm"
                    />
                  </div>
                )}

                {/* Carrusel de miniaturas de videos con scroll horizontal visible */}
                <div
                  className="flex items-center space-x-2 overflow-x-auto whitespace-nowrap mb-4 border-t pt-2"
                  style={{ maxWidth: "100%" }}
                >
                  {videos.map((vid) => (
                    <div key={vid.id} className="relative">
                      <video
                        src={vid.id}
                        className={`w-16 h-16 object-cover rounded-lg cursor-pointer ${
                          vid.id === videoSeleccionado?.id
                            ? "border-2 border-blue-500"
                            : ""
                        }`}
                        onClick={() => selectVideo(vid)}
                      />
                      {/* Botón de eliminar en la esquina superior derecha */}
                      <button
                        onClick={() => deleteVideo(vid.id)}
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {/* Botón para añadir más videos */}
                  <label className="flex items-center justify-center w-16 h-16 border rounded-lg cursor-pointer text-blue-500">
                    <input
                      type="file"
                      accept="video/*"
                      multiple
                      onChange={handleVideoUpload}
                      className="hidden"
                    />
                    <i className="bx bx-plus text-3xl"></i>
                  </label>
                </div>

                {/* Botón de enviar */}
                <button
                  onClick={enviarVideosWhatsApp}
                  disabled={botonDeshabilitado_vid} // Deshabilitar el botón según el estado
                  className={`px-4 py-2 rounded mt-4 w-full transition-all ${
                    botonDeshabilitado_vid
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-500 text-white hover:bg-blue-600"
                  }`}
                >
                  {botonDeshabilitado_vid ? "Enviando..." : "Enviar"}
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

      {/* Modal para crear etiqueta */}
      {isCrearEtiquetaModalOpen && (
        <div className="fixed inset-0 z-20 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-xs w-full">
            <h3 className="text-lg font-semibold mb-4">Agregar etiqueta</h3>
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-1">
                Nombre etiqueta
              </label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                placeholder="Ingrese el nombre de la etiqueta"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-1">
                Color etiqueta
              </label>
              <input
                type="color"
                className="w-full p-2 border rounded"
                value={tagColor}
                onChange={(e) => setTagColor(e.target.value)}
              />
            </div>

            {/* Sección para la lista de etiquetas */}
            <div className="mt-4 p-4 border-t border-gray-200">
              <h4 className="text-lg font-semibold mb-2">Lista de etiquetas</h4>
              {tagList.length > 0 ? (
                <ul>
                  {tagList.map((tag, index) => (
                    <li key={index} className="flex items-center gap-2 mb-2">
                      <span
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: tag.color_etiqueta }}
                      ></span>
                      <span>{tag.nombre_etiqueta}</span>
                      <button
                        onClick={() => eliminarProducto(tag.id_etiqueta)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <i className="bx bxs-trash"></i>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No hay etiquetas disponibles.</p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={toggleCrearEtiquetaModal}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded"
              >
                Cerrar
              </button>
              <button
                onClick={handleTagCreation}
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                Agregar etiqueta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para asignar etiqueta */}
      {isAsignarEtiquetaModalOpen && (
        <div className="fixed inset-0 z-20 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-xs w-full">
            <h3 className="text-lg font-semibold mb-4">Asignar etiquetas</h3>

            {/* Sección para la lista de etiquetas */}
            <div className="mt-4 p-4 border-t border-gray-200">
              {tagList.length > 0 ? (
                <ul className="space-y-2">
                  {tagList.map((tag) => {
                    // Verificar si la etiqueta está en la lista de asignadas
                    const isAssigned = tagListAsginadas.some(
                      (assignedTag) =>
                        assignedTag.id_etiqueta === tag.id_etiqueta
                    );

                    return (
                      <li
                        key={tag.id_etiqueta}
                        onClick={() =>
                          toggleTagAssignment(tag.id_etiqueta, selectedChat.id)
                        }
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all duration-200 
                    ${
                      isAssigned
                        ? "bg-blue-100 border border-blue-300"
                        : "bg-gray-100 hover:bg-gray-200"
                    }
                  `}
                      >
                        <span
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: tag.color_etiqueta }}
                        ></span>
                        <span className="flex-1 text-gray-700 font-medium">
                          {tag.nombre_etiqueta}
                        </span>
                        {isAssigned && (
                          <i className="bx bx-check text-blue-600 text-lg"></i>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-gray-500">No hay etiquetas disponibles.</p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={toggleAsginarEtiquetaModal}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Modales;
