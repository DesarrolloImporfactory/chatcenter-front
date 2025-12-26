import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";
import Select from "react-select";

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
  id_configuracion,
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
  toggleAsignarEtiquetaModal,
  tagListAsginadas,
  setTagListAsginadas,
  setNumeroModal,
  cargar_socket,
  buscarIdRecibe,
  transferirChatModalOpen,
  toggleTransferirChatModal,
  lista_usuarios,
  lista_departamentos,
  numeroModalPreset,
}) => {
  const [templateText, setTemplateText] = useState("");
  const [placeholders, setPlaceholders] = useState([]);
  const [placeholderValues, setPlaceholderValues] = useState({}); // Guardar los valores de cada placeholder
  const [templateName, setTemplateName] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("es");

  // Estado para el modal "Añadir número"
  const [isAddNumberModalOpen, setIsAddNumberModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState("nuevo");
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  // 🔎 query controlada para la pestaña "Buscar contacto"
  const [searchQuery, setSearchQuery] = useState("");

  const [lockPhone, setLockPhone] = useState(false);
  const [contextLabel, setContextLabel] = useState("");
  const [clienteNombreCtx, setClienteNombreCtx] = useState("");

  // 🧹 reset integral del modal de número
  const resetNumeroModalState = () => {
    setModalTab("nuevo");
    setNewContactName("");
    setNewContactPhone("");

    setTemplateName("");
    setTemplateText("");
    setPlaceholders([]);
    setPlaceholderValues({});

    setSearchQuery("");
    setLockPhone(false);
    setContextLabel("");
    setClienteNombreCtx("");

    if (inputRefNumeroTelefono?.current)
      inputRefNumeroTelefono.current.value = "";

    // deselecciona destinatario si quedó alguno
    handleSelectPhoneNumber("");
    handleInputChange_numeroCliente?.({ target: { value: "" } });
  };

  useEffect(() => {
    if (!numeroModal) return;

    // 🔄 SIEMPRE limpiar todo al abrir
    resetNumeroModalState();

    // 🔒 Si viene con preset (desde el banner +24h), volvemos a llenar
    if (numeroModalPreset?.step === "buscar" && numeroModalPreset?.phone) {
      setModalTab("buscar");
      setLockPhone(!!numeroModalPreset.lockPhone);
      setContextLabel(numeroModalPreset.contextLabel || "");
      setClienteNombreCtx(numeroModalPreset.clienteNombre || "");

      handleSelectPhoneNumber(numeroModalPreset.phone);

      setSearchQuery(numeroModalPreset.phone);
      if (inputRefNumeroTelefono?.current) {
        inputRefNumeroTelefono.current.value = numeroModalPreset.phone;
        const ev = new Event("input", { bubbles: true });
        inputRefNumeroTelefono.current.dispatchEvent(ev);
      }
    }
  }, [numeroModal, numeroModalPreset]);

  // cerrar modal con limpieza
  const onCloseNumeroModal = () => {
    resetNumeroModalState();
    handleNumeroModal();
  };

  // ✨ resaltar coincidencias en nombre/teléfono
  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const highlightMatch = (text, query) => {
    if (!query) return text;
    const parts = String(text ?? "").split(
      new RegExp(`(${escapeRegExp(query)})`, "ig")
    );
    return parts.map((p, i) =>
      p.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-100 rounded px-0.5">
          {p}
        </mark>
      ) : (
        p
      )
    );
  };

  // ✅ template listo para enviar (nombre + destinatario + placeholders completos)
  const allPlaceholdersFilled = placeholders.every(
    (ph) => (placeholderValues[ph] || "").trim().length > 0
  );
  const templateReady =
    Boolean(templateName) &&
    Boolean(selectedPhoneNumber) &&
    (placeholders.length === 0 || allPlaceholdersFilled);

  // 🔎 filtra por nombre o teléfono en cliente (fallback si el server solo busca por número)
  const filteredResults =
    (searchResultsNumeroCliente || []).filter((r) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        String(r.nombre_cliente || "")
          .toLowerCase()
          .includes(q) ||
        String(r.celular_cliente || "")
          .toLowerCase()
          .includes(q)
      );
    }) || [];

  /* diseño selects */
  /** Indicadores personalizados (usa tus Boxicons) */
  const DropdownIndicator = (props) => (
    <components.DropdownIndicator {...props}>
      <i
        className={`bx bx-chevron-down transition-transform duration-200 ${
          props.selectProps.menuIsOpen ? "rotate-180" : ""
        }`}
      />
    </components.DropdownIndicator>
  );

  const ClearIndicator = (props) => (
    <components.ClearIndicator {...props}>
      <i className="bx bx-x" />
    </components.ClearIndicator>
  );

  /** Colores + radios del tema */
  const customSelectTheme = (theme) => ({
    ...theme,
    borderRadius: 12,
    colors: {
      ...theme.colors,
      primary: "#2563eb", // azul
      primary25: "#EFF6FF", // hover opción
      primary50: "#DBEAFE", // active opción
      neutral20: "#cbd5e1", // borde
      neutral30: "#94a3b8", // borde hover
    },
  });

  /** Estilos “glass/premium” + foco accesible */
  const customSelectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: 44,
      borderRadius: 12,
      paddingLeft: 6,
      paddingRight: 6,
      backgroundColor: "rgba(255,255,255,0.9)",
      backdropFilter: "saturate(1.2) blur(6px)",
      borderColor: state.isFocused ? "#3b82f6" : "#e2e8f0",
      boxShadow: state.isFocused
        ? "0 0 0 3px rgba(59,130,246,.25)"
        : "0 1px 2px rgba(2,6,23,.06)",
      ":hover": {
        borderColor: state.isFocused ? "#3b82f6" : "#94a3b8",
      },
      cursor: "text",
    }),
    valueContainer: (base) => ({
      ...base,
      padding: "0 4px",
      gap: 6,
    }),
    placeholder: (base) => ({
      ...base,
      color: "#94a3b8",
    }),
    singleValue: (base) => ({
      ...base,
      color: "#0f172a",
      fontWeight: 500,
    }),
    input: (base) => ({
      ...base,
      color: "#0f172a",
    }),
    indicatorsContainer: (base) => ({
      ...base,
      gap: 6,
    }),
    indicatorSeparator: () => ({ display: "none" }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 9999, // por si el modal tiene overflow/oculta
    }),
    menu: (base) => ({
      ...base,
      borderRadius: 14,
      marginTop: 8,
      padding: 4,
      backgroundColor: "rgba(255,255,255,.92)",
      backdropFilter: "saturate(1.2) blur(8px)",
      border: "1px solid rgba(226,232,240,.9)",
      boxShadow: "0 20px 40px rgba(2,6,23,.12)",
    }),
    menuList: (base) => ({
      ...base,
      maxHeight: 260,
      padding: 4,
    }),
    option: (base, state) => ({
      ...base,
      borderRadius: 10,
      padding: "10px 12px",
      color: state.isDisabled
        ? "#94a3b8"
        : state.isSelected
        ? "#0b1324"
        : "#0f172a",
      backgroundColor: state.isSelected
        ? "#DBEAFE"
        : state.isFocused
        ? "#F1F5F9"
        : "transparent",
      ":active": {
        backgroundColor: state.isSelected ? "#DBEAFE" : "#E2E8F0",
      },
    }),
    noOptionsMessage: (base) => ({
      ...base,
      padding: 12,
      color: "#64748b",
    }),
  };
  /* diseño selects */

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
        const body = {
          id_configuracion: id_configuracion,
          nombre_etiqueta: tagName,
          color_etiqueta: tagColor,
        };

        const response = await chatApi.post(
          "/etiquetas_chat_center/agregarEtiqueta",
          body
        );

        Toast.fire({
          icon: "success",
          title: "Etiqueta agregada correctamente",
        });
        fetchTags();

        setTagName("");
        setTagColor("#ff0000");
      } catch (error) {
        console.error("Error creando etiqueta:", error);
        Toast.fire({ icon: "error", title: "No se pudo agregar la etiqueta" });
      }
    } else {
      alert("Por favor, ingresa un nombre para la etiqueta.");
    }
  };

  /* estilos de select de transferir chat */

  const eliminarProducto = async (id_etiqueta) => {
    try {
      await chatApi.delete(
        `/etiquetas_chat_center/eliminarEtiqueta/${id_etiqueta}`
      );
      Toast.fire({ icon: "success", title: "Etiqueta eliminada" });
      fetchTags();
    } catch (error) {
      console.error("Error eliminando etiqueta:", error);
      Toast.fire({ icon: "error", title: "No se pudo eliminar la etiqueta" });
    }
  };
  /* fin modal crear etiquetas */

  /* modal asignar etiquetas */
  const toggleTagAssignment = async (idEtiqueta, idClienteChat) => {
    try {
      const body = {
        id_cliente_chat_center: idClienteChat,
        id_etiqueta: idEtiqueta,
        id_configuracion: id_configuracion,
      };

      const { data: result } = await chatApi.post(
        "/etiquetas_chat_center/toggleAsignacionEtiqueta",
        body
      );

      const isAssigned = result.asignado;

      setTagListAsginadas((prev) =>
        isAssigned
          ? [...prev, { id_etiqueta: idEtiqueta }]
          : prev.filter((tag) => tag.id_etiqueta !== idEtiqueta)
      );
    } catch (error) {
      console.error("Error en toggleTagAssignment:", error);
      Toast.fire({ icon: "error", title: "Error al asignar etiqueta" });
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

      // Extraer wamid de la respuesta
      const wamid = result?.messages?.[0]?.id || null;

      let id_recibe = selectedChat.id;
      let mid_mensaje = dataAdmin.id_telefono;
      let telefono_configuracion = dataAdmin.telefono;
      agregar_mensaje_enviado(
        caption,
        "image",
        imageUrl,
        numeroDestino,
        mid_mensaje,
        id_recibe,
        id_configuracion,
        telefono_configuracion,
        wamid,
        "",
        ""
      );

      /* cargar socket */
      /* cargar_socket(); */
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

      // Extraer wamid de la respuesta
      const wamid = result?.messages?.[0]?.id || null;

      let id_recibe = selectedChat.id;
      let mid_mensaje = dataAdmin.id_telefono;
      let telefono_configuracion = dataAdmin.telefono;
      agregar_mensaje_enviado(
        caption,
        "document",
        JSON.stringify(documentUrl),
        numeroDestino,
        mid_mensaje,
        id_recibe,
        id_configuracion,
        telefono_configuracion,
        wamid,
        "",
        ""
      );

      /* cargar socket */
      /* cargar_socket(); */
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

      // Extraer wamid de la respuesta
      const wamid = result?.messages?.[0]?.id || null;

      let id_recibe = selectedChat.id;
      let mid_mensaje = dataAdmin.id_telefono;
      let telefono_configuracion = dataAdmin.telefono;
      agregar_mensaje_enviado(
        caption,
        "video",
        videoUrl,
        numeroDestino,
        mid_mensaje,
        id_recibe,
        id_configuracion,
        telefono_configuracion,
        wamid,
        "",
        ""
      );

      /* cargar socket */
      /* cargar_socket(); */
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
      Toast.fire({ icon: "warning", title: "Ingresa nombre y teléfono." });
      return;
    }

    try {
      const { data } = await chatApi.post(
        "/clientes_chat_center/agregarNumeroChat",
        {
          nombre: newContactName,
          telefono: newContactPhone,
          apellido: "",
          id_configuracion,
        }
      );

      if (data.status == 400) {
        Toast.fire({ icon: "error", title: "Error al añadir contacto" });
        return;
      }

      Toast.fire({ icon: "success", title: "Contacto añadido" });

      // Marca al nuevo contacto como destinatario
      handleSelectPhoneNumber(newContactPhone);

      // Cambia de pestaña: búsqueda + plantilla
      setModalTab("buscar");

      //controla el input y dispara la búsqueda del padre
      setSearchQuery(newContactPhone);
      if (inputRefNumeroTelefono?.current) {
        inputRefNumeroTelefono.current.value = newContactPhone;
        const ev = new Event("input", { bubbles: true });
        inputRefNumeroTelefono.current.dispatchEvent(ev);
      }

      // Limpia los campos del form "nuevo"
      setNewContactName("");
      setNewContactPhone("");
    } catch (error) {
      console.error("Error al añadir el contacto:", error);
      Toast.fire({ icon: "error", title: "Error al añadir el contacto" });
    }
  };

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

      // Extraer el wamid de la respuesta
      const wamid = data?.messages?.[0]?.id || null;

      /* console.log("Template enviado exitosamente:", data); */
      Toast.fire({
        icon: "success",
        title: "Mensaje enviado correctamente",
      });

      let id_recibe = buscarIdRecibe;
      let mid_mensaje = dataAdmin.id_telefono;
      let telefono_configuracion = dataAdmin.telefono;
      let ruta_archivo = generarObjetoPlaceholders(
        placeholders,
        placeholderValues
      );

      agregar_mensaje_enviado(
        templateText,
        "text",
        JSON.stringify(ruta_archivo),
        recipientPhone,
        mid_mensaje,
        id_recibe,
        id_configuracion,
        telefono_configuracion,
        wamid,
        templateName,
        selectedLanguage
      );

      /* cargar socket */
      /* cargar_socket(); */

      resetNumeroModalState();
      handleNumeroModal();
    } catch (error) {
      console.error("Error al enviar el template:", error);
      Toast.fire({
        icon: "error",
        title: "Error al enviar mensaje",
      });
    }
  };

  /* seccion de transferir chat */
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState("");
  const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState("");
  const [motivoTransferencia, setMotivoTransferencia] = useState("");

  const [listaDepartamentosUsuario, setListaDepartamentosUsuario] = useState(
    []
  );
  const [loadingDepartamentos, setLoadingDepartamentos] = useState(false);

  // cuando cambia el usuario, llamamos la API y llenamos el select de departamentos
  const handleUsuarioChange = async (opcion) => {
    const idSubUsuario = opcion ? opcion.value : "";

    setUsuarioSeleccionado(idSubUsuario);
    setDepartamentoSeleccionado("");
    setListaDepartamentosUsuario([]);

    if (!idSubUsuario) return;

    try {
      setLoadingDepartamentos(true);

      const res = await chatApi.post(
        "/departamentos_chat_center/listar_por_usuario",
        {
          id_sub_usuario: idSubUsuario,
        }
      );

      // ✅ Ajustado a su controlador: { status, data }
      const deps = res?.data?.data || [];
      setListaDepartamentosUsuario(Array.isArray(deps) ? deps : []);
    } catch (error) {
      // Si el backend devuelve AppError cuando no hay departamentos, aquí cae
      console.error("No se pudieron cargar departamentos:", error);

      // Mantener UI estable
      setListaDepartamentosUsuario([]);
    } finally {
      setLoadingDepartamentos(false);
    }
  };

  const handleTransferirChat = async () => {
    if (!usuarioSeleccionado || !departamentoSeleccionado) {
      Toast.fire({
        icon: "warning",
        title: "Debes seleccionar un usuario y un departamento.",
      });
      return;
    }

    try {
      const res = await chatApi.post(
        "departamentos_chat_center/transferirChat",
        {
          id_encargado: usuarioSeleccionado,
          id_departamento: departamentoSeleccionado,
          motivo: motivoTransferencia,
          id_cliente_chat_center: selectedChat.id,
          id_configuracion: selectedChat.id_configuracion
        }
      );

      if (res.data.status === "success") {
        Toast.fire({
          icon: "success",
          title: res.data.message, // Chat transferido correctamente
        });

        toggleTransferirChatModal();
        setUsuarioSeleccionado("");
        setDepartamentoSeleccionado("");
      } else {
        Toast.fire({
          icon: "error",
          title: "Ocurrió un problema al transferir el chat.",
        });
      }
    } catch (error) {
      const message =
        error.response?.data?.message ||
        "Error inesperado al transferir el chat.";

      Toast.fire({
        icon: "error",
        title: message,
      });

      console.error("Error al transferir chat:", error);
    }
  };

  /* fin seccion de transferir chat */

  const registeredNumero = register("numero", {
    required: "El número es obligatorio",
  });
  return (
    <>
      {numeroModal && (
        <div
          className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-nuevo-chat-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) onCloseNumeroModal();
          }} // cierra al click fuera
        >
          <div className="w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2
                id="modal-nuevo-chat-title"
                className="text-lg font-semibold text-slate-900"
              >
                {lockPhone ? "Responder con plantilla" : "Nuevo chat"}
              </h2>

              {/* Tabs (ocultas cuando lockPhone) */}
              {!lockPhone && (
                <div className="inline-flex rounded-lg bg-slate-100 border border-slate-200 p-1">
                  <button
                    type="button"
                    onClick={() => setModalTab("nuevo")}
                    className={`px-3 py-1.5 text-sm font-semibold rounded-md transition
        ${
          modalTab === "nuevo"
            ? "bg-white shadow-sm text-slate-900"
            : "text-slate-600 hover:text-slate-800"
        }`}
                  >
                    Añadir número
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTab("buscar")}
                    className={`px-3 py-1.5 text-sm font-semibold rounded-md transition
        ${
          modalTab === "buscar"
            ? "bg-white shadow-sm text-slate-900"
            : "text-slate-600 hover:text-slate-800"
        }`}
                  >
                    Buscar contacto
                  </button>
                </div>
              )}

              <button
                onClick={onCloseNumeroModal}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Cerrar"
                title="Cerrar"
              >
                <i className="bx bx-x text-2xl" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* TAB: AÑADIR NÚMERO */}
              {modalTab === "nuevo" && (
                <form className="grid gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Nombre
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm
                           focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none"
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                      placeholder="Nombre del contacto"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="numeroAdd"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Teléfono
                    </label>
                    <div className="relative">
                      <i className="bx bx-phone absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                      <input
                        type="text"
                        id="numeroAdd"
                        placeholder="Ej: 5939XXXXXXXX"
                        className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm
                             focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none"
                        value={newContactPhone}
                        onChange={(e) => setNewContactPhone(e.target.value)}
                      />
                    </div>
                  </div>
                </form>
              )}

              {/* TAB: BUSCAR CONTACTO */}
              {modalTab === "buscar" && (
                <form
                  className="space-y-3"
                  onSubmit={handleSubmit(handleNumeroModalForm)}
                >
                  {/* Tarjeta de destino (SE MANTIENE SIEMPRE) */}
                  <div className="rounded-xl border p-3 bg-gray-50 mb-2">
                    <div className="text-xs text-slate-500">
                      Enviaremos la plantilla a:
                    </div>
                    <div className="text-sm">
                      <span className="font-semibold">{clienteNombreCtx}</span>{" "}
                      <span className="text-blue-700">
                        {selectedPhoneNumber || searchQuery}
                      </span>
                    </div>
                  </div>

                  {/* SOLO si NO está bloqueado se muestra buscador + resultados */}
                  {!lockPhone && (
                    <>
                      <label
                        htmlFor="numeroBuscar"
                        className="text-sm font-medium text-slate-700"
                      >
                        Buscar por nombre o teléfono
                      </label>

                      <div className="relative">
                        <i className="bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                        <input
                          type="text"
                          id="numeroBuscar"
                          placeholder="Escribe para buscar…"
                          value={searchQuery}
                          name={registeredNumero.name}
                          onBlur={registeredNumero.onBlur}
                          ref={(el) => {
                            registeredNumero.ref(el);
                            if (inputRefNumeroTelefono)
                              inputRefNumeroTelefono.current = el;
                          }}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            handleInputChange_numeroCliente(e);
                            registeredNumero.onChange(e);
                          }}
                          className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm
                       focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none"
                        />
                      </div>

                      <div className="rounded-xl border border-slate-200 overflow-hidden">
                        <ul className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                          {filteredResults.length > 0 ? (
                            filteredResults.map((result, index) => {
                              const active =
                                selectedPhoneNumber === result.celular_cliente;
                              return (
                                <li
                                  key={index}
                                  onClick={() =>
                                    handleSelectPhoneNumber(
                                      result.celular_cliente
                                    )
                                  }
                                  className={`cursor-pointer px-3 py-2 transition ${
                                    active
                                      ? "bg-blue-50 ring-1 ring-inset ring-blue-200"
                                      : "hover:bg-slate-50"
                                  }`}
                                >
                                  <div className="text-sm">
                                    <span className="font-semibold text-slate-900">
                                      Nombre:&nbsp;
                                    </span>
                                    <span className="text-slate-700">
                                      {highlightMatch(
                                        result.nombre_cliente,
                                        searchQuery
                                      )}
                                    </span>
                                  </div>
                                  <div className="text-sm">
                                    <span className="font-semibold text-slate-900">
                                      Teléfono:&nbsp;
                                    </span>
                                    <span className="text-slate-700">
                                      {highlightMatch(
                                        result.celular_cliente,
                                        searchQuery
                                      )}
                                    </span>
                                  </div>
                                </li>
                              );
                            })
                          ) : (
                            <li className="px-3 py-3 text-sm text-slate-500">
                              No hay resultados
                            </li>
                          )}
                        </ul>
                      </div>
                    </>
                  )}
                </form>
              )}

              {/* TEMPLATE — solo si hay destinatario elegido */}
              {modalTab === "buscar" && selectedPhoneNumber && (
                <form className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                  <h4 className="font-semibold text-base text-slate-900">
                    Enviar template
                  </h4>

                  <Select
                    id="lista_templates"
                    options={templates.map((t) => ({
                      value: t.name,
                      label: t.name,
                    }))}
                    placeholder="Seleccione un template"
                    onChange={(opcion) =>
                      handleTemplateSelect({
                        target: { value: opcion ? opcion.value : "" },
                      })
                    }
                    isClearable
                    styles={customSelectStyles}
                    classNamePrefix="react-select"
                  />

                  <div>
                    <label
                      htmlFor="template_textarea"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Vista previa
                    </label>
                    <textarea
                      id="template_textarea"
                      rows="8"
                      value={templateText}
                      readOnly
                      onChange={handleTextareaChange}
                      className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-800 outline-none
                           focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>

                  {placeholders.map((ph) => (
                    <div key={ph}>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {`Valor para {{${ph}}}`}
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm text-slate-800 outline-none
                             focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        value={placeholderValues[ph] || ""}
                        onChange={(e) =>
                          handlePlaceholderChange(ph, e.target.value)
                        }
                      />
                    </div>
                  ))}

                  <div className="flex justify-between items-center">
                    {!templateReady && (
                      <p className="text-xs text-slate-500">
                        Completa todos los campos del template para enviar.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={enviarTemplate}
                      disabled={!templateReady}
                      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm focus-visible:outline-none focus-visible:ring-4
                      ${
                        templateReady
                          ? "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-200"
                          : "bg-slate-200 text-slate-500 cursor-not-allowed"
                      }`}
                    >
                      <i className="bx bx-send" />
                      Enviar template
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t bg-slate-50 flex justify-end">
              {modalTab === "nuevo" && (
                <div className="flex justify-end mr-3">
                  <button
                    type="button"
                    onClick={handleAddNewContact}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
                  >
                    <i className="bx bx-check" />
                    Crear
                  </button>
                </div>
              )}

              <button
                onClick={onCloseNumeroModal}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Cerrar
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="crear-etiqueta-titulo"
        >
          {/* Fondo: cierra al hacer clic fuera */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={toggleCrearEtiquetaModal}
            aria-hidden="true"
          />

          {/* Panel */}
          <div
            className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl
                       ring-1 ring-black/5 border border-slate-200 overflow-hidden"
            role="document"
          >
            {/* Header */}
            <div className="flex items-start justify-between p-4">
              <div>
                <h3
                  id="crear-etiqueta-titulo"
                  className="text-lg font-semibold text-slate-900"
                >
                  Agregar etiqueta
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Define un nombre y un color. Puedes eliminar desde la lista.
                </p>
              </div>
              <button
                onClick={toggleCrearEtiquetaModal}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full
                           text-slate-500 hover:text-slate-700 hover:bg-slate-100
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label="Cerrar"
                title="Cerrar"
              >
                <i className="bx bx-x text-lg"></i>
              </button>
            </div>

            {/* Formulario */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (tagName?.trim()) handleTagCreation();
              }}
            >
              <div className="px-4 pb-4 space-y-5">
                {/* Nombre */}
                <div>
                  <label
                    htmlFor="tag-name"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Nombre etiqueta
                  </label>
                  <input
                    id="tag-name"
                    type="text"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2
                               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value)}
                    placeholder="Ej. Ventas"
                  />
                  {/* Vista previa */}
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-slate-500">
                      Vista previa:
                    </span>
                    <span
                      className="inline-flex items-center gap-2 pl-2 pr-2 py-1 rounded-full
                                     border border-slate-200 bg-white"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: tagColor || "#64748b" }}
                        aria-hidden="true"
                      />
                      <span className="text-xs font-medium text-slate-700">
                        {tagName?.trim() || "Etiqueta"}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Color */}
                <div>
                  <label
                    htmlFor="tag-color"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Color etiqueta
                  </label>
                  <div className="mt-1 grid grid-cols-[auto,1fr] items-center gap-3">
                    <input
                      id="tag-color"
                      type="color"
                      className="h-10 w-12 rounded-lg border border-slate-300 cursor-pointer"
                      value={tagColor}
                      onChange={(e) => setTagColor(e.target.value)}
                    />
                    {/* Campo HEX para editar/pegar el color */}
                    <input
                      type="text"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm
                                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={tagColor}
                      onChange={(e) => setTagColor(e.target.value)}
                      placeholder="#000000"
                    />
                  </div>

                  {/* Colores rápidos (tomados de etiquetas existentes) */}
                  {tagList?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[
                        ...new Set(
                          tagList.map((t) => t.color_etiqueta).filter(Boolean)
                        ),
                      ]
                        .slice(0, 8)
                        .map((c, i) => (
                          <button
                            type="button"
                            key={i}
                            onClick={() => setTagColor(c)}
                            className="h-6 w-6 rounded-full border border-white ring-1 ring-slate-300
                                       hover:ring-blue-500 focus:outline-none focus-visible:ring-2
                                       focus-visible:ring-blue-500"
                            style={{ backgroundColor: c }}
                            aria-label={`Usar color ${c}`}
                            title={c}
                          />
                        ))}
                    </div>
                  )}
                </div>

                {/* Lista existente */}
                <div className="pt-2 border-t border-slate-200">
                  <h4 className="text-sm font-semibold text-slate-900 mb-2">
                    Lista de etiquetas
                  </h4>
                  {tagList?.length > 0 ? (
                    <ul className="max-h-48 overflow-auto space-y-2 pr-1">
                      {tagList.map((tag) => (
                        <li
                          key={tag.id_etiqueta}
                          className="flex items-center gap-3 px-2 py-2 rounded-lg border border-slate-200"
                        >
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: tag.color_etiqueta }}
                            aria-hidden="true"
                          />
                          <span
                            className="flex-1 text-sm text-slate-700 truncate"
                            title={tag.nombre_etiqueta}
                          >
                            {tag.nombre_etiqueta}
                          </span>
                          <button
                            type="button"
                            onClick={() => eliminarProducto(tag.id_etiqueta)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full
                                       text-red-600 hover:bg-red-50
                                       focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                            aria-label={`Eliminar ${tag.nombre_etiqueta}`}
                            title="Eliminar"
                          >
                            <i className="bx bxs-trash text-base"></i>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                      <i className="bx bxs-purchase-tag-alt text-base"></i>
                      <span>No hay etiquetas disponibles.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
                <button
                  type="button"
                  onClick={toggleCrearEtiquetaModal}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md
                             bg-white border border-slate-200 text-slate-700
                             hover:bg-slate-100 focus:outline-none
                             focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <i className="bx bx-x"></i>
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={!tagName?.trim()}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-white
                    ${
                      tagName?.trim()
                        ? "bg-blue-600 hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500"
                        : "bg-blue-400 cursor-not-allowed"
                    }`}
                >
                  <i className="bx bx-plus"></i>
                  Agregar etiqueta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para asignar etiqueta */}
      {isAsignarEtiquetaModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="asignar-etiquetas-titulo"
        >
          {/* Fondo */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={toggleAsignarEtiquetaModal}
            aria-hidden="true"
          />

          {/* Panel */}
          <div
            className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl
                       ring-1 ring-black/5 border border-slate-200 overflow-hidden"
            role="document"
          >
            {/* Header */}
            <div className="flex items-start justify-between p-4">
              <div>
                <h3
                  id="asignar-etiquetas-titulo"
                  className="text-lg font-semibold text-slate-900"
                >
                  Asignar etiquetas
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Haz clic para asignar o quitar.
                </p>
              </div>
              <button
                onClick={toggleAsignarEtiquetaModal}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full
                           text-slate-500 hover:text-slate-700 hover:bg-slate-100
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label="Cerrar"
                title="Cerrar"
              >
                <i className="bx bx-x text-lg"></i>
              </button>
            </div>

            {/* Lista de etiquetas */}
            <div className="px-4 pb-4 pt-2 max-h-[50vh] overflow-auto">
              {tagList?.length > 0 ? (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {tagList.map((tag) => {
                    const isAssigned = tagListAsginadas?.some(
                      (a) => a.id_etiqueta === tag.id_etiqueta
                    );
                    return (
                      <li key={tag.id_etiqueta}>
                        <button
                          onClick={() =>
                            toggleTagAssignment(
                              tag.id_etiqueta,
                              selectedChat.id
                            )
                          }
                          className={`w-full flex items-center gap-3 rounded-xl border p-2.5 text-left
                                     transition-all duration-200 focus:outline-none
                                     focus-visible:ring-2 focus-visible:ring-blue-500
                                     ${
                                       isAssigned
                                         ? "border-blue-200 bg-blue-50 hover:bg-blue-100"
                                         : "border-slate-200 bg-white hover:bg-slate-50"
                                     }`}
                          aria-pressed={isAssigned}
                        >
                          {/* Punto de color */}
                          <span
                            aria-hidden="true"
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{
                              backgroundColor: tag.color_etiqueta || "#64748b",
                            }}
                          />

                          {/* Nombre (truncado elegante) */}
                          <span
                            className={`flex-1 text-sm font-medium truncate ${
                              isAssigned ? "text-blue-900" : "text-slate-700"
                            }`}
                            title={tag.nombre_etiqueta}
                          >
                            {tag.nombre_etiqueta}
                          </span>

                          {/* Estado */}
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full
                                        ${
                                          isAssigned
                                            ? "bg-blue-600 text-white"
                                            : "bg-slate-100 text-slate-500"
                                        }`}
                            aria-hidden="true"
                          >
                            <i
                              className={`bx ${
                                isAssigned ? "bx-check" : "bx-plus"
                              } text-base`}
                            ></i>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <i className="bx bxs-purchase-tag-alt text-base"></i>
                  <span>No hay etiquetas disponibles.</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
              <button
                onClick={toggleAsignarEtiquetaModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md
                           bg-white border border-slate-200 text-slate-700
                           hover:bg-slate-100 focus:outline-none
                           focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <i className="bx bx-x"></i>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para transferir chats */}
      {transferirChatModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="transferir-chat-titulo"
          onKeyDown={(e) => e.key === "Escape" && toggleTransferirChatModal()}
        >
          {/* Fondo: cierra al click */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={toggleTransferirChatModal}
            aria-hidden="true"
          />

          {/* Panel */}
          <div
            className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl
                       ring-1 ring-black/5 border border-slate-200 overflow-hidden"
            role="document"
          >
            {/* Header */}
            <div className="flex items-start justify-between p-4">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full
                             bg-blue-50 text-blue-600"
                >
                  <i className="bx bx-transfer-alt text-xl"></i>
                </span>
                <div>
                  <h3
                    id="transferir-chat-titulo"
                    className="text-lg font-semibold text-slate-900"
                  >
                    Transferir chat
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Selecciona un usuario y, opcionalmente, un departamento.
                  </p>
                </div>
              </div>

              <button
                onClick={toggleTransferirChatModal}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full
                           text-slate-500 hover:text-slate-700 hover:bg-slate-100
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label="Cerrar"
                title="Cerrar"
              >
                <i className="bx bx-x text-lg"></i>
              </button>
            </div>

            {/* Contenido */}
            <div className="px-4 pb-4 space-y-4">
              {/* Select de usuarios con búsqueda (requerido) */}
              <div>
                <label
                  htmlFor="select-usuario-transfer"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Buscar usuario <span className="text-red-600">*</span>
                </label>

                <Select
                  inputId="select-usuario-transfer"
                  options={lista_usuarios.map((u) => ({
                    value: u.id_sub_usuario,
                    label: u.nombre_encargado,
                  }))}
                  onChange={handleUsuarioChange}
                  placeholder="Seleccione un usuario"
                  isClearable
                  className="react-select mb-2"
                  classNamePrefix="rs"
                  styles={customSelectStyles}
                  noOptionsMessage={() => "Sin resultados"}
                />

                <p className="text-xs text-slate-500">
                  {Array.isArray(lista_usuarios)
                    ? `${lista_usuarios.length} usuarios disponibles`
                    : ""}
                </p>
              </div>

              {/* Select de departamentos: se llena SOLO luego de seleccionar usuario */}
              <div>
                <label
                  htmlFor="select-departamento-transfer"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Buscar departamento
                </label>

                <Select
                  inputId="select-departamento-transfer"
                  options={listaDepartamentosUsuario.map((dep) => ({
                    value: dep.id_departamento,
                    label: dep.nombre_departamento,
                  }))}
                  onChange={(opcion) =>
                    setDepartamentoSeleccionado(opcion ? opcion.value : "")
                  }
                  placeholder={
                    !usuarioSeleccionado
                      ? "Primero seleccione un usuario"
                      : loadingDepartamentos
                      ? "Cargando departamentos..."
                      : "Seleccione un departamento"
                  }
                  isClearable
                  isDisabled={!usuarioSeleccionado || loadingDepartamentos}
                  isLoading={loadingDepartamentos}
                  className="react-select mb-2"
                  classNamePrefix="rs"
                  styles={customSelectStyles}
                  noOptionsMessage={() =>
                    !usuarioSeleccionado
                      ? "Seleccione un usuario"
                      : "Sin resultados"
                  }
                />

                <p className="text-xs text-slate-500">
                  {usuarioSeleccionado
                    ? `${listaDepartamentosUsuario.length} departamentos`
                    : ""}
                </p>
              </div>
              {/* Textarea para motivo de transferencia (opcional o requerido, como prefieras) */}
              <div>
                <label
                  htmlFor="motivo-transferencia"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Motivo de la transferencia
                </label>

                <textarea
                  id="motivo-transferencia"
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm 
               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
               bg-white"
                  rows={3}
                  placeholder="Escriba el motivo..."
                  value={motivoTransferencia}
                  onChange={(e) => setMotivoTransferencia(e.target.value)}
                ></textarea>

                <p className="text-xs text-slate-500 mt-1">
                  Este motivo será visible para el usuario que reciba el chat.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
              <button
                onClick={toggleTransferirChatModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md
                           bg-white border border-slate-200 text-slate-700
                           hover:bg-slate-100 focus:outline-none
                           focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <i className="bx bx-x"></i>
                Cancelar
              </button>
              <button
                onClick={handleTransferirChat}
                disabled={!usuarioSeleccionado}
                title={
                  !usuarioSeleccionado
                    ? "Selecciona un usuario"
                    : "Transferir chat"
                }
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-white
                  ${
                    usuarioSeleccionado
                      ? "bg-blue-600 hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500"
                      : "bg-blue-400 cursor-not-allowed"
                  }`}
              >
                <i className="bx bx-send"></i>
                Transferir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Modales;
