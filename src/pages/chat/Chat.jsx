import React, { useState, useRef, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { addNumberThunk } from "../../store/slices/number.slice";
import { useNavigate, useParams } from "react-router-dom";

import { useDispatch } from "react-redux";
import { jwtDecode } from "jwt-decode";
import io from "socket.io-client";

import { format, isToday, isYesterday, isThisWeek } from "date-fns";
import { es } from "date-fns/locale"; // Importa el locale para español

import Cabecera from "../../components/chat/Cabecera";
import { Sidebar } from "../../components/chat/Sidebar";
import ChatPrincipal from "../../components/chat/ChatPrincipal";
import DatosUsuario from "../../components/chat/DatosUsuario";
import DatosUsuarioModerno from "../../components/chat/DatosUsuarioModerno";
import Modales from "../../components/chat/Modales";
import Loading from "../../components/chat/Loading";
import ScrollToBottomButton from "../../components/chat/ScrollToBottomButton";
import SwitchBot from "../../components/chat/SwitchBot";

import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";
import { useMemo } from "react";

const Chat = () => {
  const formatFecha = (fechaISO) => {
    const fecha = new Date(fechaISO);

    if (isToday(fecha)) {
      // Si es hoy, solo mostrar la hora
      return format(fecha, "HH:mm", { locale: es });
    } else if (isYesterday(fecha)) {
      // Si es ayer, mostrar "Ayer"
      return "Ayer";
    } else if (isThisWeek(fecha)) {
      // Si es esta semana, mostrar el nombre del día
      return format(fecha, "EEEE", { locale: es }); // Nombre del día (e.g., Lunes)
    } else {
      // Si es más de una semana, mostrar la fecha completa
      return format(fecha, "dd/MM/yyyy", { locale: es });
    }
  };

  const tipo_configuracion = localStorage.getItem("tipo_configuracion");

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [provincias, setProvincias] = useState(null);
  const [facturasChatSeleccionado, setFacturasChatSeleccionado] =
    useState(null);
  const [guiasChatSeleccionado, setGuiasChatSeleccionado] = useState(null);

  const [seRecibioMensaje, setSeRecibioMensaje] = useState(false);

  const [dataAdmin, setDataAdmin] = useState(null);

  const [userData, setUserData] = useState(null);

  const [id_configuracion, setId_configuracion] = useState(null);

  const [id_plataforma_conf, setId_plataforma_conf] = useState(null);

  const [id_sub_usuario_global, setId_sub_usuario_global] = useState(null);

  const [nombre_encargado_global, setNombre_encargado_global] = useState(null);

  const [rol_usuario_global, setRol_usuario_global] = useState(null);

  const [id_usuario_conf, setId_usuario_conf] = useState(null);

  const [opciones, setOpciones] = React.useState(false);

  const [mostrarAudio, setMostrarAudio] = useState(false);

  const [chatTemporales, setChatTemporales] = useState(25);

  const [animateOut, setAnimateOut] = useState(false);

  const [numeroModal, setNumeroModal] = useState(false);

  const [filtro_chats, setFiltro_chats] = useState(false);

  const [mensaje, setMensaje] = useState("");

  const [emojiOpen, setEmojiOpen] = useState(false);

  const [file, setFile] = useState(null);

  const inputRef = useRef(null); // Referencia al input de mensaje

  const emojiPickerRef = useRef(null); // Referencia al contenedor del selector de emojis

  const [grabando, setGrabando] = useState(false); // Estado para grabación

  const [audioBlob, setAudioBlob] = useState(null); // Almacena la grabación

  const mediaRecorderRef = useRef(null);

  const [isSocketConnected, setIsSocketConnected] = useState(false);

  const [mensajesAcumulados, setMensajesAcumulados] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");

  const [searchTermEtiqueta, setSearchTermEtiqueta] = useState("");

  const [selectedChat, setSelectedChat] = useState(null);

  const [chatMessages, setChatMessages] = useState([]);

  const [mensajesOrdenados, setMensajesOrdenados] = useState([]);

  const [isCommandActive, setIsCommandActive] = useState(false); // Estado para el cuadro de opciones

  const [isChatBlocked, setIsChatBlocked] = useState(false); // Estado para bloquear el chat

  const [menuSearchTerm, setMenuSearchTerm] = useState(""); // Estado para el término de búsqueda

  const [searchResults, setSearchResults] = useState([]); // Estado para almacenar los resultados de la búsqueda

  const [disableAanular, setDisableAanular] = useState(true);

  const [disableGestionar, setDisableGestionar] = useState(false);

  const [menuSearchTermNumeroCliente, setMenuSearchTermNumeroCliente] =
    useState(""); // Estado para el término de búsqueda numero Cliente

  const [searchResultsNumeroCliente, setSearchResultsNumeroCliente] = useState(
    [],
  ); // Estado para almacenar los resultados de la búsqueda numero Cliente

  const inputRefNumeroTelefono = useRef(null); // Referencia al input de mensaje numero telefono

  const [seleccionado, setSeleccionado] = useState(false); // para la condicion del buscar numero Telefono

  const [templates, setTemplates] = useState([]);

  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState("");
  const [selectedPhoneNumberNombre, setSelectedPhoneNumberNombre] =
    useState("");

  const [selectedPhoneNumberIdEncargado, setSelectedPhoneNumberIdEncargado] =
    useState("");

  const [buscarIdRecibe, setBuscarIdRecibe] = useState(null);

  const [novedades_gestionadas, setNovedades_gestionadas] = useState(null);
  const [novedades_noGestionadas, setNovedades_noGestionadas] = useState(null);

  /* calcular guia directa */
  const [monto_venta, setMonto_venta] = useState(null);
  const [costo, setCosto] = useState(null);
  const [precio_envio_directo, setPrecio_envio_directo] = useState(null);
  const [fulfillment, setFulfillment] = useState(null);
  const [total_directo, setTotal_directo] = useState(null);
  const [validar_generar, setValidar_generar] = useState(false);

  const [selectedImageId, setSelectedImageId] = useState(null);

  // Canal activo y conversación Messenger activa
  const [activeChannel, setActiveChannel] = useState("all"); //wa | ig | ms | all defaults
  const [msActiveConversationId, setMsActiveConversationId] = useState(null);
  const [msNextBeforeId, setMsNextBeforeId] = useState(null);
  const [msIsLoadingOlder, setMsIsLoadingOlder] = useState(false);

  const Toast = Swal.mixin({
    toast: true,
    position: "top-end", // Puedes cambiar a 'bottom-end', 'top-start', etc.
    showConfirmButton: false,
    timer: 3000, // Duración en ms
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener("mouseenter", Swal.stopTimer);
      toast.addEventListener("mouseleave", Swal.resumeTimer);
    },
  });

  /* abrir modal crear etiquetas */
  const [isCrearEtiquetaModalOpen, setIsCrearEtiquetaModalOpen] =
    useState(false);

  const [opcionesMenuOpen, setOpcionesMenuOpen] = useState(false);

  const [tagList, setTagList] = useState([]);

  const [pendingOpen, setPendingOpen] = useState(null);

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templatesAll, setTemplatesAll] = useState([]);
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateResults, setTemplateResults] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const [dataPlanes, setDataPlanes] = useState(null);

  const abrirModalTemplates = async () => {
    setIsTemplateModalOpen(true);
    setTemplateSearch("");

    // si ya los cargó antes, no vuelva a pedirlos
    if (templatesAll.length > 0) {
      setTemplateResults(templatesAll);
      return;
    }

    setLoadingTemplates(true);
    try {
      const resp = await chatApi.post(
        "whatsapp_managment/obtenerTemplatesWhatsapp",
        {
          id_configuracion,
          limit: 100, // o 50
        },
      );

      const list = resp.data?.data || [];
      setTemplatesAll(list);
      setTemplateResults(list);
    } catch (e) {
      console.error(e);
      setTemplatesAll([]);
      setTemplateResults([]);
    } finally {
      setLoadingTemplates(false);
    }
  };

  useEffect(() => {
    if (!isTemplateModalOpen) return;

    const t = setTimeout(() => {
      const term = templateSearch.trim().toLowerCase();

      if (!term) {
        setTemplateResults(templatesAll);
        return;
      }

      const filtered = templatesAll.filter((tpl) => {
        const name = String(tpl.name || "").toLowerCase();
        const lang = String(tpl.language || "").toLowerCase();
        // si quiere también filtrar por categoría:
        const category = String(tpl.category || "").toLowerCase();

        return (
          name.includes(term) || lang.includes(term) || category.includes(term)
        );
      });

      setTemplateResults(filtered);
    }, 250); // debounce 250ms

    return () => clearTimeout(t);
  }, [templateSearch, templatesAll, isTemplateModalOpen]);

  const cerrarModalTemplates = () => {
    setIsTemplateModalOpen(false);
    setTemplateSearch("");
  };

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);

    const ph = p.get("phone");
    const nm = p.get("name") || "";
    const idp = localStorage.getItem("id_plataforma_conf");
    const idc = localStorage.getItem("id_configuracion");

    if (!idc) {
      localStorage.removeItem("id_configuracion");
      localStorage.removeItem("tipo_configuracion");
      localStorage.removeItem("id_plataforma_conf");
      navigate("/conexiones");
      return;
    }

    const token = localStorage.getItem("token");

    if (token) {
      const decoded = jwtDecode(token);
      const usuario = decoded.id_usuario;

      setId_sub_usuario_global(decoded.id_sub_usuario);
      setRol_usuario_global(decoded.rol);
      setNombre_encargado_global(decoded.nombre_encargado);

      const validar_conexion_usuario = async (id_usuario, id_configuracion) => {
        try {
          const res = await chatApi.post(
            "configuraciones/validar_conexion_usuario",
            {
              id_usuario,
              id_configuracion,
            },
          );

          if (res.status === 200) {
            const coincidencia = res.data.coincidencia;

            if (!coincidencia) {
              await Swal.fire({
                icon: "error",
                title: "Sin permisos a la configuración",
                text: "Esta configuración no pertenece a tu usuario",
                allowOutsideClick: false,
                allowEscapeKey: false,
                allowEnterKey: true,
                confirmButtonText: "OK",
              });

              localStorage.removeItem("id_configuracion");
              localStorage.removeItem("tipo_configuracion");
              localStorage.removeItem("id_plataforma_conf");
              navigate("/conexiones");
            }
          } else {
            console.error("Error al validar conexión:", res.data);
          }
        } catch (error) {
          localStorage.removeItem("id_configuracion");
          localStorage.removeItem("tipo_configuracion");
          localStorage.removeItem("id_plataforma_conf");

          if (error.response?.status === 403) {
            Swal.fire({
              icon: "error",
              title: error.response?.data?.message,
              confirmButtonText: "OK",
            }).then(() => navigate("/planes_view"));
          } else if (error.response?.status === 402) {
            Swal.fire({
              icon: "error",
              title: error.response?.data?.message,
              confirmButtonText: "OK",
            }).then(() => navigate("/miplan"));
          } else {
            console.error("Error en la validación:", error);
            await Swal.fire({
              icon: "error",
              title: "Sin permisos a la configuración",
              text: "Esta configuración no pertenece a tu usuario",
              allowOutsideClick: false,
              allowEscapeKey: false,
              allowEnterKey: true,
              confirmButtonText: "OK",
            });
            navigate("/conexiones");
          }
        }
      };

      validar_conexion_usuario(usuario, idc);
    } else {
      localStorage.removeItem("id_configuracion");
      localStorage.removeItem("tipo_configuracion");
      localStorage.removeItem("id_plataforma_conf");
      navigate("/conexiones");
      return;
    }

    if (ph) setPendingOpen({ phone: ph, name: nm });
    if (idc) setId_configuracion(parseInt(idc));

    if (idp === "null") {
      setId_plataforma_conf(null);
    } else {
      setId_plataforma_conf(idp ? parseInt(idp) : null);
    }

    if (idp && idp !== "null") {
      const fetchData = async () => {
        try {
          const res = await chatApi.post(
            "plataformas/obtener_usuario_plataforma",
            {
              id_plataforma: idp,
            },
          );

          if (res.status === 200) {
            setId_usuario_conf(res.data.data.id_usuario);
          } else {
            console.error(
              "Error al obtener el usuario de la plataforma:",
              res.data,
            );
          }
        } catch (error) {
          console.error("Error en la consulta:", error);
        }
      };

      fetchData();
    }
  }, []);

  const getChatById = async (chatId, id_configuracion) => {
    return chatApi.get(
      `/clientes_chat_center/findFullByPhone/${encodeURIComponent(chatId)}?id_configuracion=${id_configuracion}`,
    );
  };

  // ——— Flags de carga para el gate del Sidebar ———
  const [isLoadingWA, setIsLoadingWA] = useState(true);
  const [isLoadingMS, setIsLoadingMS] = useState(true);
  const [isLoadingIG, setIsLoadingIG] = useState(true);

  // Usamos refs para no volver a poner "loading=true" después del primer batch
  const waBootstrappedRef = useRef(false);
  const msBootstrappedRef = useRef(false);
  const igBootstrappedRef = useRef(false);

  /* 2️⃣  cuando ya hay chats */
  const { chatId } = useParams();

  useEffect(() => {
    if (!chatId || !id_configuracion) return;

    // 1) ¿Ya está cargado?
    const existente = mensajesAcumulados.find(
      (c) => String(c.id_cliente_chat_center ?? c.id) === String(chatId),
    );

    if (existente) {
      handleSelectChat(existente);
      return;
    }

    // 2) Buscar en BD por ID (con su endpoint “universal”)
    (async () => {
      try {
        const { data } = await getChatById(chatId, id_configuracion);
        setMensajesAcumulados((prev) => [data.data, ...prev]);
        handleSelectChat(data.data);
      } catch (err) {
        if (err.response?.status === 404) {
          Swal.fire(
            "Sin conversación",
            "Ese chat no existe o no tiene historial.",
            "info",
          );
        } else {
          console.error(err);
        }
      }
    })();
  }, [chatId, id_configuracion]);

  const toggleCrearEtiquetaModal = () => {
    fetchTags();
    setIsCrearEtiquetaModalOpen(!isCrearEtiquetaModalOpen);
    if (opcionesMenuOpen) {
      setOpcionesMenuOpen(!opcionesMenuOpen);
    }
  };

  const handleChange = (selectedOptions) => {
    setSelectedEtiquetas(selectedOptions || []);
  };

  const fetchTags = async () => {
    try {
      const response = await chatApi.post(
        "/etiquetas_chat_center/obtenerEtiquetas",
        {
          id_configuracion: id_configuracion,
        },
      );

      const data = response.data;

      if (data.status !== "200") {
        throw new Error(data.message || "Error al obtener las etiquetas");
      }

      setTagList(data.etiquetas); // ← aquí ya asignas directamente el array de etiquetas
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  /* abrir modal asignar etiquetas */
  const [tagListAsginadas, setTagListAsginadas] = useState([]);

  const [isAsignarEtiquetaModalOpen, setIsAsignarEtiquetaModalOpen] =
    useState(false);

  const toggleAsignarEtiquetaModal = () => {
    fetchTagsAsginadas();
    setIsAsignarEtiquetaModalOpen(!isAsignarEtiquetaModalOpen);
    if (opcionesMenuOpen) {
      setOpcionesMenuOpen(!opcionesMenuOpen);
    }
  };

  const fetchTagsAsginadas = async () => {
    try {
      const response = await chatApi.post(
        "/etiquetas_asignadas/obtenerEtiquetasAsignadas",
        {
          id_cliente_chat_center: selectedChat.id,
        },
      );

      const data = response.data;

      if (data.status !== "200") {
        throw new Error(
          data.message || "Error al obtener las etiquetas asignadas",
        );
      }

      setTagListAsginadas(data.etiquetasAsignadas); // <- nombre correcto desde tu backend
    } catch (error) {
      console.error("Error fetching etiquetas asignadas:", error);
    }
  };
  /* fin abrir modal asignar etiquetas */

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
        body,
      );

      const isAssigned = result.asignado;

      setTagListAsginadas((prev) =>
        isAssigned
          ? [...prev, { id_etiqueta: idEtiqueta }]
          : prev.filter((tag) => tag.id_etiqueta !== idEtiqueta),
      );
    } catch (error) {
      console.error("Error en toggleTagAssignment:", error);
      Toast.fire({ icon: "error", title: "Error al asignar etiqueta" });
    }
  };

  /* fin modal asignar etiquetas */

  /* abrir modal transferir chats */
  const [transferirChatModalOpen, setTransferirChatModalOpen] = useState(false);
  const [lista_usuarios, setLista_usuarios] = useState([]);
  const [lista_departamentos, setLista_departamentos] = useState([]);

  const toggleTransferirChatModal = () => {
    fetchListUsuarios();
    fetchListDepartamentos();
    setTransferirChatModalOpen(!transferirChatModalOpen);

    if (opcionesMenuOpen) {
      setOpcionesMenuOpen(!opcionesMenuOpen);
    }
  };

  const fetchListUsuarios = async () => {
    try {
      const decoded = jwtDecode(token);
      const usuario = decoded.id_usuario;

      const res = await chatApi.post("usuarios_chat_center/listarUsuarios", {
        id_usuario: usuario,
      });
      setLista_usuarios(res.data.data);
    } catch (error) {
      console.error("Error fetching lista usuarios:", error);
    }
  };

  const fetchListDepartamentos = async () => {
    try {
      const decoded = jwtDecode(localStorage.getItem("token"));
      const usuario = decoded.id_usuario;

      const res = await chatApi.post(
        "departamentos_chat_center/listarDepartamentos",
        {
          id_usuario: usuario,
        },
      );
      setLista_departamentos(res.data.data);
    } catch (error) {
      console.error("Error fetching lista departamentos:", error);
    }
  };
  /* fin abrir modal transferir chats */

  /* modal de enviar archivos */
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [modal_enviarArchivos, setModal_enviarArchivos] = useState(false);
  const [tipo_modalEnviarArchivo, setTipo_modalEnviarArchivo] = useState("");

  const agregar_mensaje_enviado = async (
    texto_mensaje,
    tipo_mensaje,
    ruta_archivo,
    telefono_recibe,
    mid_mensaje,
    id_recibe,
    id_configuracion,
    telefono_configuracion,
    wamid,
    template_name,
    language_code,
    nombre_cliente = "",
    id_encargado = null,
    meta_media_id = null,
  ) => {
    try {
      const response = await chatApi.post(
        "/clientes_chat_center/agregarMensajeEnviado",
        {
          texto_mensaje,
          tipo_mensaje,
          mid_mensaje,
          id_recibe,
          ruta_archivo,
          telefono_recibe,
          id_configuracion,
          telefono_configuracion,
          responsable: nombre_encargado_global,
          id_wamid_mensaje: wamid,
          template_name,
          language_code,
          meta_media_id,
        },
      );

      const respuesta = response.data;

      const fechaMySQL = new Date()
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");

      if (respuesta.status != 200) {
        console.log("Error en la respuesta del servidor: ", respuesta);
        return;
      }

      // ======== lógica para decidir si agrega/actualiza chat en izquierda ========
      let agregar_izquierda = true;

      if (!id_encargado) {
        agregar_izquierda = scopeChats == "waiting";
      } else {
        if (
          id_encargado == id_sub_usuario_global ||
          rol_usuario_global === "administrador"
        ) {
          agregar_izquierda = scopeChats == "mine";
        } else {
          agregar_izquierda = false;
        }
      }

      if (agregar_izquierda) {
        setMensajesAcumulados((prevChats) => {
          const actualizado = prevChats.map((chat) => ({ ...chat }));
          const idChat = id_recibe;

          const index = actualizado.findIndex(
            (chat) => String(chat.id) === String(idChat),
          );

          if (index !== -1) {
            actualizado[index].mensaje_created_at = fechaMySQL;
            actualizado[index].texto_mensaje = texto_mensaje;
            actualizado[index].mensajes_pendientes =
              (actualizado[index].mensajes_pendientes || 0) + 1;
            actualizado[index].visto = 0;

            const [actualizadoChat] = actualizado.splice(index, 1);
            actualizado.unshift(actualizadoChat);
          } else {
            const nuevoChat = {
              id: idChat,
              mensaje_created_at: fechaMySQL,
              texto_mensaje,
              celular_cliente: telefono_recibe,
              mensajes_pendientes: 1,
              visto: 0,
              nombre_cliente,
              etiquetas: [{ id: null, nombre: null, color: null }],
              transporte: null,
              estado_factura: null,
              id_configuracion,
              novedad_info: {
                id_novedad: null,
                novedad: null,
                solucionada: null,
                terminado: null,
              },
            };

            actualizado.unshift(nuevoChat);
          }

          return actualizado;
        });
      }

      // ======== mensaje en derecha (chat actual) ========
      if (selectedChat && String(id_recibe) === String(selectedChat.id)) {
        setMensajesOrdenados((prevMensajes) => {
          const actualizado = prevMensajes.map((mensaje) => ({ ...mensaje }));

          const nuevoMensaje = {
            celular_recibe: id_recibe,
            created_at: fechaMySQL,
            id: `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            mid_mensaje,
            rol_mensaje: 1,
            ruta_archivo, //
            meta_media_id, //
            texto_mensaje,
            tipo_mensaje,
            visto: 1,
            responsable: nombre_encargado_global,
            id_wamid_mensaje: wamid,
          };

          actualizado.push(nuevoMensaje);
          return actualizado;
        });
      }
    } catch (error) {
      console.error("Error al guardar el mensaje:", error);
      console.error("Detalles:", error?.response?.data);
      alert("Ocurrió un error al guardar el mensaje. Inténtelo de nuevo.");
    }
  };

  // Función para obtener el icono y color según la extensión del archivo
  const getFileIcon = (fileName) => {
    const extension = fileName.split(".").pop().toLowerCase();

    switch (extension) {
      case "pdf":
        return { icon: "fas fa-file-pdf", color: "text-red-500" };
      case "doc":
      case "docx":
        return { icon: "fas fa-file-word", color: "text-blue-500" };
      case "xls":
      case "xlsx":
        return { icon: "fas fa-file-excel", color: "text-green-500" };
      case "csv":
        return { icon: "fa-solid fa-file-csv", color: "text-green-500" };
      case "ppt":
      case "pptx":
        return { icon: "fas fa-file-powerpoint", color: "text-orange-500" };
      case "txt":
        return { icon: "fas fa-file-alt", color: "text-gray-500" };
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return { icon: "fas fa-file-image", color: "text-yellow-500" };
      case "html":
      case "php":
      case "js":
      case "css":
      case "sql":
        return { icon: "fa-solid fa-file-code", color: "text-gray-500" };
      default:
        return { icon: "fas fa-file", color: "text-gray-500" };
    }
  };
  /* final modal de enviar arhivos */

  const handleMenuSearchChange = (e) => {
    setMenuSearchTerm(e.target.value);
  };

  const handleInputChange_numeroCliente = (e) => {
    setSeleccionado(false);
    setMenuSearchTermNumeroCliente(e.target.value);
  };

  // Manejar la selección del número de teléfono y activar la sección de templates
  const handleSelectPhoneNumber = async (
    phoneNumber,
    nombre_cliente,
    id_encargado,
  ) => {
    setSelectedPhoneNumber(phoneNumber); // Actualiza el número seleccionado

    setSelectedPhoneNumberNombre(nombre_cliente);
    setSelectedPhoneNumberIdEncargado(id_encargado);
    setValue("numero", phoneNumber); // Actualiza el campo "numero" en el formulario

    // Llama manualmente a la función de búsqueda con el nuevo valor
    handleInputChange_numeroCliente({
      target: { value: phoneNumber }, // Simula un evento de input
    });

    setSeleccionado(!!phoneNumber); // Indica que hay un número seleccionado

    // Llama a la API para obtener el id_recibe
    const idRecibe = await buscar_id_recibe(phoneNumber, id_configuracion);
    setBuscarIdRecibe(idRecibe); // Guarda el ID recibido en el estado
  };

  const buscar_id_recibe = async (recipientPhone, id_configuracion) => {
    try {
      const response = await chatApi.post(
        "/clientes_chat_center/buscar_id_recibe",
        {
          telefono: recipientPhone,
          id_configuracion: id_configuracion,
        },
      );

      const id_recibe = response.data?.data?.id_recibe;

      return id_recibe || null;
    } catch (error) {
      console.error("Error al buscar id_recibe:", error);
      return null;
    }
  };

  const getOrderedChats = useCallback(() => {
    const todosLosMensajes = chatMessages.flatMap((chat) => chat.mensajes);
    return todosLosMensajes.sort((a, b) => {
      const fechaA = new Date(a.created_at);
      const fechaB = new Date(b.created_at);
      return fechaA - fechaB;
    });
  }, [chatMessages]);

  const handleOptionSelect = (option) => {
    setMensaje(option); // Pon el texto seleccionado en el campo de entrada
    setIsCommandActive(false); // Cierra el cuadro de opciones
    setIsChatBlocked(false); // Desbloquea el chat

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus(); // Enfoca el input de mensaje
      }
    }, 100); // Asegurarse de que el input esté montado
  };

  const handleOptionSelectNumeroTelefono = (option) => {
    setSeleccionado(true); // Pon el texto seleccionado en el campo de entrada
    setMenuSearchTermNumeroCliente(option);

    setTimeout(() => {
      if (inputRefNumeroTelefono.current) {
        inputRefNumeroTelefono.current.focus(); // Enfoca el input de mensaje
      }
    }, 100); // Asegurarse de que el input esté montado
  };

  const endOfMessagesRef = useRef(null);

  // Función para desplazarse al final de los mensajes
  const scrollToBottom = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleOpciones = () => {
    if (opciones) {
      // Activa la animación de salida antes de ocultar el componente
      setAnimateOut(true);
      setTimeout(() => {
        setOpciones(false);
        setAnimateOut(false); // Restablece el estado de animación
      }, 300); // Coincide con la duración de la animación
    } else {
      setOpciones(true);
    }
  };

  const closeNumeroModal = () => {
    setNumeroModal(false);
    setSeleccionado(false);
  };

  const openNumeroModal = () => {
    abrirModalLimpio(); // por si algún hijo aún llama a "abrir"
  };

  const handleFiltro_chats = () => {
    setFiltro_chats(!filtro_chats);
  };

  const {
    handleSubmit,
    register,
    setValue,
    reset,
    formState: { errors },
  } = useForm();

  const handleSubmit_template = () => {};

  const handleNumeroModalForm = (data) => {
    dispatch(addNumberThunk(data));
    setNumeroModal(false);
    reset({
      numero: "",
    });
  };

  /* abrir y cerrar modal enviar archivo */
  const handleModal_enviarArchivos = (tipo) => {
    setModal_enviarArchivos(!modal_enviarArchivos);
    setTipo_modalEnviarArchivo(tipo);
    setIsMenuOpen(false);
  };
  /* fin abrir y cerrar modal enviar archivo */

  const handleEmojiClick = (emoji) => {
    const input = inputRef.current;
    const cursorPos = input.selectionStart; // Posición actual del cursor

    // Construir el nuevo mensaje con el emoji en la posición correcta
    const newText =
      mensaje.slice(0, cursorPos) + emoji.emoji + mensaje.slice(cursorPos);

    // Actualizar el estado del mensaje
    setMensaje(newText);

    // Esperar a que el estado se actualice para mover el cursor
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(
        cursorPos + emoji.emoji.length,
        cursorPos + emoji.emoji.length,
      );
    }, 0);
  };

  const handleClickOutside = (event) => {
    if (
      emojiPickerRef.current &&
      !emojiPickerRef.current.contains(event.target)
    ) {
      setEmojiOpen(false);
    }
  };

  const acortarTexto = (texto, limiteMovil, limiteDesktop) => {
    // Determina el límite basado en el tamaño de la pantalla
    const limite = window.innerWidth <= 640 ? limiteMovil : limiteDesktop;
    return texto.length > limite ? texto.substring(0, limite) + "..." : texto;
  };

  const handleSendMessage = () => {
    const text = (mensaje || "").trim();
    if (!text || !selectedChat || !socketRef.current) return;

    const nowISO = new Date().toISOString();
    const tmpId = `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const safeName = (nombre_encargado_global || "").replace(/[*_~`]/g, "");

    // ✅ Para WA usted quería el encabezado con nombre + 🎤
    const finalTextWA = `*${safeName}* 🎤:\n${text}`;

    // ✅ Para IG/MS (recomendado) NO meta ese encabezado, envíe solo texto.
    const finalTextSocial = text;

    const isWA = (selectedChat?.source || "wa") === "wa";
    const isIG = selectedChat?.source === "ig";
    const isMS = selectedChat?.source === "ms";

    const tipo = file ? "document" : "text";

    // =========================
    // ✅ 1) OPTIMISTIC UI (Derecha) - siempre
    // =========================
    const optimisticMsg = {
      id: tmpId,
      created_at: nowISO,
      texto_mensaje: isWA ? finalTextWA : finalTextSocial,
      tipo_mensaje: tipo,
      ruta_archivo: file ? file?.name || "" : null,
      rol_mensaje: 1, // 1 = nosotros
      visto: 1,
      direction: "out",
      status_unificado: "sent", // o "pending"
      responsable: nombre_encargado_global,
      // opcional:
      source: selectedChat?.source || "wa",
    };

    setMensajesOrdenados((prev) => [...prev, optimisticMsg]);
    scrollToBottomNow();

    // =========================
    // ✅ 2) Actualiza lista izquierda (preview) - siempre
    // =========================
    const updateMensajesAcumulados = ({
      chatId,
      texto_mensaje,
      tipo_mensaje,
      ruta_archivo = "{}",
      source,
    }) => {
      const fechaISO = nowISO;

      setMensajesAcumulados((prevChats) => {
        const actualizado = prevChats.map((c) => ({ ...c }));
        const index = actualizado.findIndex(
          (c) => String(c.id) === String(chatId),
        );

        if (index !== -1) {
          actualizado[index] = {
            ...actualizado[index],
            mensaje_created_at: fechaISO,
            texto_mensaje,
            tipo_mensaje,
            ruta_archivo,
            mensajes_pendientes: 0,
            visto: 1,
            source: source ?? actualizado[index].source,
          };

          const [movido] = actualizado.splice(index, 1);
          actualizado.unshift(movido);
          return actualizado;
        }

        const nuevoChat = {
          id: chatId,
          id_configuracion,
          texto_mensaje,
          tipo_mensaje,
          ruta_archivo,
          mensaje_created_at: fechaISO,
          mensajes_pendientes: 0,
          visto: 1,
          source: source ?? selectedChat?.source,
          celular_cliente: selectedChat?.celular_cliente || "",
          etiquetas: "[]",
        };

        return [nuevoChat, ...actualizado];
      });
    };

    updateMensajesAcumulados({
      chatId: selectedChat.id,
      texto_mensaje: isWA ? finalTextWA : finalTextSocial,
      tipo_mensaje: tipo,
      ruta_archivo: file
        ? JSON.stringify({
            name: file?.name || "",
            size: file?.size || 0,
            type: file?.type || "",
          })
        : "{}",
      source: selectedChat?.source || "wa",
    });

    // limpiar input
    setMensaje("");
    setFile(null);

    // =========================
    // ✅ 3) Emit unificado (WA / IG / MS)
    // =========================

    // 📌 IMPORTANTE:
    // - Para WA: mandamos to
    // - Para IG/MS: mandamos chatId + source + page_id + external_id (mínimo chatId)
    const basePayload = {
      id_configuracion,
      tipo_mensaje: tipo,
      file,
      dataAdmin,
      nombre_encargado: nombre_encargado_global,
      client_tmp_id: tmpId, // ✅ para luego reconciliar si quiere
    };

    if (isWA) {
      socketRef.current.emit("SEND_MESSAGE", {
        ...basePayload,
        mensaje: finalTextWA,
        to: selectedChat.celular_cliente,
        // opcional (por si quiere):
        chatId: selectedChat.id,
        source: "wa",
      });
      return;
    }

    // IG/MS
    socketRef.current.emit("SEND_MESSAGE", {
      ...basePayload,
      mensaje: finalTextSocial,
      chatId: selectedChat.id, // ✅ clave
      source: selectedChat.source, // 'ig' o 'ms'
      page_id: selectedChat.page_id, // ✅
      external_id: selectedChat.external_id, // ✅
      to: null, // para que quede explícito
    });
  };

  const uploadAudio = (audioBlob) => {
    const formData = new FormData();
    formData.append("audio", audioBlob, "audio.ogg");

    return chatApi
      .post("whatsapp/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then(async (response) => {
        const base64Audio = response.data.file;

        // base64 -> Blob (ogg)
        const byteCharacters = atob(base64Audio);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const blobNew = new Blob([new Uint8Array(byteNumbers)], {
          type: "audio/ogg",
        });

        // 1) Guardar en S3 vía backend
        const fdSave = new FormData();
        fdSave.append("audio", blobNew, `audio-${Date.now()}.ogg`);

        const respGuardar = await chatApi.post(
          "whatsapp/guardar_audio",
          fdSave,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );

        const fileUrl =
          respGuardar.data?.fileUrl || respGuardar.data?.data?.url || "";

        // 2) Enviar a WhatsApp via backend meta-management (NUEVO)
        const fdMeta = new FormData();
        fdMeta.append("audio", blobNew, `audio-${Date.now()}.ogg`);
        fdMeta.append("id_configuracion", id_configuracion);
        fdMeta.append("to", selectedChat.celular_cliente);

        const respMeta = await chatApi.post(
          "/whatsapp_managment/enviarAudio",
          fdMeta,
          { headers: { "Content-Type": "multipart/form-data" } },
        );

        if (!respMeta.data?.success) {
          console.error("Meta error:", respMeta.data);
          throw new Error(
            respMeta.data?.message || "No se pudo enviar audio por backend",
          );
        }

        const mediaId = respMeta.data.mediaId;
        const wamid = respMeta.data.wamid;

        agregar_mensaje_enviado(
          `Archivo guardado en: ${fileUrl}`,
          "audio",
          fileUrl,
          selectedChat.celular_cliente,
          dataAdmin.id_telefono,
          selectedChat.id,
          id_configuracion,
          dataAdmin.telefono,
          wamid,
          mediaId,
          "",
        );

        return { fileUrl, mediaId, wamid };
      });
  };

  const handleSendAudio = async (blob) => {
    if (!blob) return;

    const isOggMime = blob.type.includes("audio/ogg");
    const isCorrectExtension = blob.name ? blob.name.endsWith(".ogg") : true;

    if (!isOggMime || !isCorrectExtension) {
      alert("El archivo de audio debe ser en formato .ogg");
      return;
    }

    try {
      const { fileUrl, mediaId } = await uploadAudio(blob);
      console.log("Listo:", { fileUrl, mediaId });
      setAudioBlob(null);
    } catch (error) {
      console.error("Error en el proceso de envío de audio:", error);
      alert("No se pudo enviar el audio. Revise consola/logs.");
    }
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    const chunks = [];

    mediaRecorderRef.current.ondataavailable = (e) => {
      chunks.push(e.data);
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" });
      setAudioBlob(blob);
      handleSendAudio(blob); // Enviar el audio inmediatamente después de detener
    };

    mediaRecorderRef.current.start();
    setGrabando(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && grabando) {
      mediaRecorderRef.current.stop();
      setGrabando(false);

      // Detener y liberar el acceso al micrófono
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
    }
  };

  /* seccion de carga de mensaje */
  const chatContainerRef = useRef(null);
  const [mensajesMostrados, setMensajesMostrados] = useState(20); // Inicialmente mostrar los últimos 20 mensajes
  const [scrollOffset, setScrollOffset] = useState(0); // Para mantener la posición del scroll

  // Obtener los mensajes actuales basados en la cantidad a mostrar
  const mensajesActuales = mensajesOrdenados.slice(-mensajesMostrados);

  // Listener para detectar scroll hacia arriba
  const handleScroll = async () => {
    const chatContainer = chatContainerRef.current;
    if (!chatContainer) return;

    if (chatContainer.scrollTop === 0) {
      // 1) aún hay mensajes en memoria por mostrar
      if (
        mensajesMostrados > 0 &&
        mensajesMostrados < mensajesOrdenados.length
      ) {
        setScrollOffset(chatContainer.scrollHeight);
        setMensajesMostrados((prev) =>
          Math.min(prev + 20, mensajesOrdenados.length),
        );
        return;
      }

      // 2) pedir más al backend (paginación hacia atrás)
      if (msIsLoadingOlder) return;
      if (!msNextBeforeId) return;

      try {
        setMsIsLoadingOlder(true);
        setScrollOffset(chatContainer.scrollHeight);

        const convId = msActiveConversationId || selectedChat?.id;
        if (!convId) return;

        const { data } = await chatApi.get(url, {
          params: { limit: 50, before_id: msNextBeforeId },
        });

        const older = (data.items || []).map(mapFn); // vienen ASC
        if (older.length) {
          // prepend al buffer completo
          setChatMessages((prev) => {
            const list = prev[0]?.mensajes || [];
            const merged = [...older, ...list];
            return [{ id: convId, mensajes: merged }];
          });

          setMensajesOrdenados((prev) => [...older, ...prev]);
          setMensajesMostrados((prev) => prev + older.length);
          setMsNextBeforeId(data.next_before_id ?? null);

          // restaurar posición de scroll
          requestAnimationFrame(() => {
            const el = chatContainerRef.current;
            if (el && scrollOffset)
              el.scrollTop = el.scrollHeight - scrollOffset;
          });
        } else {
          setMsNextBeforeId(null);
        }
      } finally {
        setMsIsLoadingOlder(false);
        setScrollOffset(0);
      }
    }
  };

  const scrollToBottomNow = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = chatContainerRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    });
  };

  // Ajustar la posición del scroll después de cargar más mensajes
  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (scrollOffset && mensajesMostrados > 20) {
      const newScrollTop = chatContainer.scrollHeight - scrollOffset;
      chatContainer.scrollTop = newScrollTop;
      setScrollOffset(0); // Resetea el offset después de ajustarlo
    }
  }, [mensajesMostrados, scrollOffset]);

  // Desplázate al final al cargar mensajes por primera vez o cambiar de chat
  useEffect(() => {
    if (chatContainerRef.current && mensajesMostrados === 20) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [mensajesActuales, selectedChat]);

  /* fin seccion de carga de mensaje */

  const handleSelectChat = (chat) => {
    navigate("/chat", { replace: true });

    setChatMessages([]);
    setMensajesMostrados(20);
    setScrollOffset(0);
    setMensaje("");
    setSelectedImageId(null);
    setValidar_generar(false);
    setMonto_venta(null);
    setCosto(null);
    setPrecio_envio_directo(null);
    setFulfillment(null);
    setTotal_directo(null);

    setSelectedChat(chat);

    const src = chat?.source || "wa";
    setActiveChannel(
      src === "ms" ? "messenger" : src === "ig" ? "instagram" : "whatsapp",
    );

    // pedir facturas/guías apenas seleccionas un chat de WhatsApp
    if (
      src === "wa" &&
      id_plataforma_conf !== null &&
      socketRef.current &&
      chat.celular_cliente
    ) {
      socketRef.current.emit("GET_FACTURAS", {
        id_plataforma: id_plataforma_conf,
        telefono: chat.celular_cliente,
      });
    }

    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop =
          chatContainerRef.current.scrollHeight;
      }
    }, 200);
  };

  /* filtro */
  const [mensajesVisibles, setMensajesVisibles] = useState(10);
  const [ultimo_cursorId, setUltimo_cursorId] = useState("");
  const [etiquetas_api, setEtiquetas_api] = useState([]);
  const [selectedEtiquetas, setSelectedEtiquetas] = useState([]);
  const [selectedEstado, setSelectedEstado] = useState([]);
  const [selectedTransportadora, setSelectedTransportadora] = useState(null);
  const [selectedNovedad, setSelectedNovedad] = useState(null);
  const [selectedPedidos_confirmados, setSelectedPedidos_confirmados] =
    useState([]);
  const [selectedTab, setSelectedTab] = useState("abierto");
  const [filteredChats, setFilteredChats] = useState([]);
  const [offset, setOffset] = useState(0);
  const [cursorFecha, setCursorFecha] = useState(null);
  const [cursorId, setCursorId] = useState(null);

  // ✅ Tabs internos (solo para "abierto"): Mis chats | En espera
  const [scopeChats, setScopeChats] = useState("mine"); // "mine" | "waiting"

  const etiquetasOptions = useMemo(
    () =>
      etiquetas_api.map((e) => ({
        value: e.id_etiqueta,
        label: e.nombre_etiqueta,
      })),
    [etiquetas_api],
  );

  /* validador encargado selectedChat */

  const asignarChat = () => {
    try {
      const payload = {
        id_encargado: id_sub_usuario_global,
        id_cliente_chat_center: selectedChat.id,
        id_configuracion: selectedChat.id_configuracion,
      };

      socketRef.current.emit("ASIGNAR_ENCARGADO", payload);
    } catch (error) {
      Toast.fire({
        icon: "error",
        title: "Error inesperado al transferir el chat.",
      });
      console.error("Error al transferir chat:", error);
    }
  };

  const showAsignarChatDialog = () => {
    Swal.fire({
      title: "Este chat no tiene asesor asignado",
      text: "¿Deseas asignarte este cliente?",
      icon: "question",
      showCancelButton: false,
      showConfirmButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      html: `
      <button id="btn-asignar" class="swal2-confirm swal2-styled">Asignarme</button>
      <button id="btn-cancelar" class="swal2-cancel swal2-styled">Cancelar</button>
    `,
      didOpen: () => {
        const btnAsignar = document.getElementById("btn-asignar");
        const btnCancelar = document.getElementById("btn-cancelar");

        btnAsignar.addEventListener("click", async () => {
          await asignarChat(); // ejecutar lógica de asignación
          Swal.close(); // cerrar modal
        });

        btnCancelar.addEventListener("click", () => {
          Swal.close();
          setSelectedChat(null); // también limpiamos si cancela
        });
      },
    });
  };

  const showAsignarChatDialogAdministrador = () => {
    Swal.fire({
      title: "Este chat no tiene asesor asignado",
      text: "¿Deseas asignarte este cliente?",
      icon: "question",
      showCancelButton: true,
      showDenyButton: true, // Añadimos el botón "Asignar a alguien más"
      confirmButtonText: "Asignarme",
      cancelButtonText: "No asignarme",
      denyButtonText: "Asignar a alguien más", // El botón adicional
      allowOutsideClick: false, // Impide clic fuera del Swal
      allowEscapeKey: false, // Impide cerrar con ESC
      preConfirm: () => {
        asignarChat(); // Función para asignarse al chat
      },
      denyAction: () => {
        asignarAAlguienMas(); // Función para asignar el chat a otro usuario
      },
      willClose: () => {
        setSelectedChat(null);
      },
    });
  };

  // Función para asignar el chat a otro usuario
  const asignarAAlguienMas = () => {
    console.log("Chat asignado a otro usuario");
  };

  useEffect(() => {
    if (!selectedChat) return;

    const needsAssign = (v) => v === null || v === undefined || v === "null";

    // 🟢 WHATSAPP
    if (needsAssign(selectedChat.id_encargado)) {
      showAsignarChatDialog();
    }
  }, [selectedChat?.id, selectedChat?.source]);

  /* validador encargado selectedChat */

  useEffect(() => {
    const eliminarDuplicadosPorId = (array) =>
      array.filter(
        (item, index, self) =>
          index === self.findIndex((t) => t.id === item.id),
      );

    const sinDuplicados = eliminarDuplicadosPorId(mensajesAcumulados);
    setFilteredChats(sinDuplicados); // Actualizamos filteredChats con mensajesAcumulados
  }, [mensajesAcumulados]);

  /* fin filtro */

  useEffect(() => {
    if (!selectedChat) return;

    if (
      (selectedChat.source === "ms" || selectedChat.source === "ig") &&
      (!hasName(selectedChat) || !hasPic(selectedChat))
    ) {
      fetchStoreProfile(selectedChat, { force: true }); // force true para el seleccionado
    }
  }, [selectedChat]);

  const socketRef = useRef(null);
  //cache en memoria para no repetir llamadas
  const profileFetchInFlightRef = useRef(new Set()); // chatId en proceso
  const profileFetchedRef = useRef(new Set()); // chatId ya completado

  const hasName = (c) =>
    (c?.nombre_cliente && String(c.nombre_cliente).trim() !== "") ||
    (c?.apellido_cliente && String(c.apellido_cliente).trim() !== "");

  const hasPic = (c) => c?.imagePath && String(c.imagePath).trim() !== "";

  const patchChatProfileLocal = (chatId, patch) => {
    setMensajesAcumulados((prev) =>
      prev.map((c) =>
        String(c.id) === String(chatId) ? { ...c, ...patch } : c,
      ),
    );
    setSelectedChat((prev) =>
      prev && String(prev.id) === String(chatId) ? { ...prev, ...patch } : prev,
    );
  };

  const fetchStoreProfile = async (chat, { force = false } = {}) => {
    if (!chat || !id_configuracion) return;

    const src = (chat?.source || "").toLowerCase();
    if (src !== "ms" && src !== "ig") return;

    const chatId = chat.id;
    if (!chatId) return;

    // No repetir si ya está completo y no es force
    if (!force && hasName(chat) && hasPic(chat)) {
      profileFetchedRef.current.add(String(chatId));
      return;
    }

    // Evitar llamadas duplicadas
    const key = String(chatId);
    if (profileFetchInFlightRef.current.has(key)) return;
    profileFetchInFlightRef.current.add(key);

    try {
      const { data } = await chatApi.post("messenger/profiles/fetch-store", {
        id_configuracion,
        chatId, //
        external_id: chat.external_id, // ✅ psid/igsid
        page_id: chat.page_id,
        source: src,
        force,
      });

      if (data?.ok && data?.data) {
        patchChatProfileLocal(chatId, {
          nombre_cliente: data.data.nombre_cliente ?? chat.nombre_cliente,
          apellido_cliente: data.data.apellido_cliente ?? chat.apellido_cliente,
          imagePath: data.data.imagePath ?? chat.imagePath,
        });
        profileFetchedRef.current.add(key);
      }
    } catch (e) {
      // no molestar al usuario, solo log
      console.error("fetchStoreProfile:", e?.response?.data || e);
    } finally {
      profileFetchInFlightRef.current.delete(key);
    }
  };

  const prefetchProfilesFromChats = (data) => {
    // ✅ Prefetch liviano: solo ms/ig incompletos
    setTimeout(() => {
      const candidatos = data
        .filter((c) => c.source === "ms" || c.source === "ig")
        .filter((c) => !hasName(c) || !hasPic(c))
        .slice(0, 15);

      const runPool = async (items, concurrency = 3) => {
        const queue = [...items];
        const workers = Array.from({ length: concurrency }).map(async () => {
          while (queue.length) {
            const item = queue.shift();
            await fetchStoreProfile(item, { force: false });
          }
        });
        await Promise.all(workers);
      };

      runPool(candidatos, 3);
    }, 0);
  };

  const inputSearchRef = useRef(null);
  const handleInputChange = (e) => {
    const value = e.target.value;
    setMensaje(value);

    // Detecta si el texto es solo "/" y no hay texto previo
    if (value.length === 1 && value === "/") {
      setIsCommandActive(true);
      setIsChatBlocked(true); // Bloquea el chat

      // Enfocar directamente en el input de búsqueda del menú si está disponible
      setTimeout(() => {
        if (inputSearchRef.current) {
          inputSearchRef.current.focus();
        }
      }, 100); // Asegurarse de que el input esté montado
    } else {
      setIsCommandActive(false);
    }
  };

  const handleCloseModal = () => {
    setIsCommandActive(false);
    setIsChatBlocked(false);
    setMensaje("");
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // hacer que si se ha escrito algo en el input de mensaje el boton de enviar cambie de micrófono a enviar
    if (mensaje.length > 0) {
      setMostrarAudio(true);
    } else {
      setMostrarAudio(false);
    }
  }, [mensaje]);

  useEffect(() => {
    const token = localStorage.getItem("token"); // Leemos el token
    if (token) {
      const decoded = jwtDecode(token); // Decodificamos con jwt-decode
      //verificamos si el token ha expirado
      if (decoded.exp < Date.now() / 1000) {
        localStorage.clear(); // elimina todo
        // Si ha expirado, redirigimos al login
        window.location.href = "/login";
      }

      setUserData(decoded); // Guardamos los datos en el estado

      // Conectar al servidor de WebSockets
      const socket = io(import.meta.env.VITE_socket, {
        transports: ["websocket", "polling"],
        secure: true,
      });
      socket.on("connect", () => {
        console.log("Conectado al servidor de WebSockets");
        socketRef.current = socket;
        setIsSocketConnected(true);
      });
      socket.on("disconnect", () => {
        console.log("Desconectado del servidor de WebSockets");
        setIsSocketConnected(false);
      });
    }
  }, []);

  /* consumir api de etiquetas */
  useEffect(() => {
    const fetchEtiquetas = async () => {
      try {
        const response = await chatApi.post(
          "/etiquetas_chat_center/obtenerEtiquetas",
          {
            id_configuracion: id_configuracion,
          },
        );

        const data = response.data;

        if (data.status !== "200") {
          throw new Error(data.message || "Error al obtener las etiquetas");
        }

        setEtiquetas_api(data.etiquetas); // Actualizas el estado con el array
      } catch (error) {
        console.error("Error al cargar las etiquetas:", error);
      }
    };

    if (id_configuracion != null) {
      fetchEtiquetas();
    }
  }, [id_configuracion]);
  /* fin cosumir api de etiquetas */

  // Fuente real para backend según activeChannel
  const sourceForList = useMemo(() => {
    if (activeChannel === "instagram") return "ig";
    if (activeChannel === "messenger") return "ms";
    if (activeChannel === "whatsapp") return "wa";
    return "all"; // si su backend NO soporta "all", cambie a null
  }, [activeChannel]);

  // ===================== EMIT CENTRALIZADO GET_CHATS (PADRE) =====================
  const emitGetChats = useCallback(
    ({ reset = false, limit = 10, overrideSource = null } = {}) => {
      if (!socketRef.current || !isSocketConnected) return;
      if (!id_configuracion || !id_sub_usuario_global || !rol_usuario_global)
        return;

      // ✅ normalizar source
      // Si su backend espera null en vez de "all", cambie aquí:
      const sourceToSend =
        (overrideSource ?? sourceForList) === "all"
          ? "all"
          : (overrideSource ?? sourceForList);

      const payload = {
        limit,
        cursorFecha: reset ? null : cursorFecha,
        cursorId: reset ? null : cursorId,
        filtros: {
          searchTerm,
          selectedEtiquetas,
          selectedEstado,
          selectedTransportadora,
          selectedNovedad,
          selectedTab,
          selectedPedidos_confirmados,
          source: sourceToSend,
        },
        scopeChats,
      };

      if (reset) {
        setMensajesAcumulados([]);
        setMensajesVisibles(10);
        setCursorFecha(null);
        setCursorId(null);
        setUltimo_cursorId("");
      }

      socketRef.current.emit(
        "GET_CHATS",
        id_configuracion,
        id_sub_usuario_global,
        rol_usuario_global,
        payload,
      );
    },
    [
      isSocketConnected,
      id_configuracion,
      id_sub_usuario_global,
      rol_usuario_global,
      cursorFecha,
      cursorId,
      searchTerm,
      selectedEtiquetas,
      selectedEstado,
      selectedTransportadora,
      selectedNovedad,
      selectedTab,
      selectedPedidos_confirmados,
      scopeChats,
      sourceForList,
    ],
  );

  // ===================== HANDLER QUE RECIBE EL CLICK DEL SIDEBAR =====================
  const onChangeChannelAndFetch = useCallback(
    (channelKey) => {
      const nextActive =
        channelKey === "ig"
          ? "instagram"
          : channelKey === "ms"
            ? "messenger"
            : channelKey === "wa"
              ? "whatsapp"
              : "all";

      setActiveChannel(nextActive);

      // ✅ pedir chats inmediatamente del canal seleccionado
      emitGetChats({ reset: true, limit: 10, overrideSource: channelKey });
    },
    [emitGetChats],
  );

  useEffect(() => {
    if (isSocketConnected && userData) {
      console.time("⏱ Tiempo hasta llegada de CHATS");

      // 👉 WhatsApp: si aún no hicimos el bootstrap, estamos cargando
      if (!waBootstrappedRef.current) setIsLoadingWA(true);

      // Limpiar listeners existentes antes de registrar nuevos
      // socketRef.current.off("RECEIVED_MESSAGE");
      socketRef.current.off("DATA_FACTURA_RESPONSE");
      socketRef.current.off("DATA_NOVEDADES");

      emitGetChats({ reset: true, limit: 10 });

      socketRef.current.once("CHATS", (data) => {
        if (data.length > 0) {
          console.timeEnd("⏱ Tiempo hasta llegada de CHATS");
          setMensajesAcumulados((prev) => [...prev, ...data]); // Agregamos, no reemplazamos

          const ultimo = data[data.length - 1];
          setCursorFecha(ultimo.mensaje_created_at);
          setCursorId(ultimo.id);
        }

        // 👉 Fin del primer batch de WA
        if (!waBootstrappedRef.current) {
          waBootstrappedRef.current = true;
          setIsLoadingWA(false);
        }

        prefetchProfilesFromChats(data);
      });

      // Emitir el evento con los filtros y la paginación

      socketRef.current.emit("ADD_USER", userData);

      socketRef.current.on("USER_ADDED", (data) => {});

      socketRef.current.emit("GET_DATA_ADMIN", id_configuracion);
      socketRef.current.on("DATA_ADMIN_RESPONSE", (data) => {
        setDataAdmin(data);

        if (data.metodo_pago == 0) {
          Swal.fire({
            icon: "error",
            title: "Problema con el método de pago",
            text: "Tu cuenta de WhatsApp tiene problemas con el método de pago. Debes resolverlo en Business Manager para continuar.",
            allowOutsideClick: false,
            allowEscapeKey: false,
            allowEnterKey: true,
            confirmButtonText: "OK",
          }).then(() => {
            // localStorage.removeItem("token");
            window.location.href = "/canal-conexiones";
          });
        }
      });

      if (id_plataforma_conf !== null) {
        socketRef.current.emit("GET_PROVINCIAS", id_plataforma_conf);
        socketRef.current.on("DATA_PROVINCIAS_RESPONSE", (data) => {
          setProvincias(data);
        });
      }

      if (id_plataforma_conf !== null) {
        socketRef.current.on("DATA_FACTURA_RESPONSE", (data) => {
          setFacturasChatSeleccionado(data.facturas);
          setGuiasChatSeleccionado(data.guias);
        });

        socketRef.current.on("DATA_NOVEDADES", (data) => {
          setNovedades_gestionadas(data.gestionadas);
          setNovedades_noGestionadas(data.no_gestionadas);
        });
      }

      /* socketRef.current.on("QUITAR_MENSAJE_RESPONSE", (data) => {
        console.log(data);

        const chat_existente = mensajesAcumulados.find(
          (chat) => chat.id == data.celular_recibe,
        );
        console.log("chat_existente: " + chat_existente);
        const encargadoId = data.clientePorCelular.id_encargado;
        console.log("encargadoId: " + encargadoId);
        console.log("id_sub_usuario_global: " + id_sub_usuario_global);
        const isAdmin = rol_usuario_global === "administrador";
        console.log("isAdmin: " + isAdmin);

        if (!isAdmin && encargadoId != id_sub_usuario_global) {
          setMensajesAcumulados((c) =>
            c.filter((chat) => chat.id != data.celular_recibe),
          );
        }
      }); */
    }
  }, [isSocketConnected, userData]); //SE QUITO SELECTEDCHAT PORQUE RECARGABA A CADA RATO

  useEffect(() => {
    if (!socketRef.current) return;
    if (!isSocketConnected) return;

    socketRef.current.on("ENCARGADO_CHAT_ACTUALIZADO", (data) => {
      const msg = normalizeMsg(data, data.source);

      if (msg.id_configuracion == localStorage.getItem("id_configuracion")) {
        const encargadoId = msg?.clientePorCelular?.id_encargado;
        const isAdmin = rol_usuario_global === "administrador";

        const deboVerlo = String(encargadoId) === String(id_sub_usuario_global);

        const isIncoming =
          msg.direction === "in" ||
          msg.rol_mensaje === 0 ||
          msg.rol_mensaje === "0";

        setMensajesAcumulados((prev) => {
          // Si prev no es un array válido, retornar array vacío
          if (!Array.isArray(prev)) return [];

          // si NO debo verlo, lo quito
          if (prev.length != 0) {
            /* validamos para saber si se quita o no */

            if (scopeChats == "waiting") {
              if (!deboVerlo) {
                return prev.filter((c) => c.id != msg.celular_recibe);
              } else {
                return prev;
              }
            }

            if (!deboVerlo && !isAdmin) {
              return prev;
            }
            /* validamos para saber si se quita o no */

            const actualizado = prev.map((c) => ({ ...c }));

            const index = actualizado.findIndex(
              (c) => String(c.id) === String(msg.celular_recibe),
            );

            /* si se cumple se actualiza */
            if (index !== -1) {
              actualizado[index].mensaje_created_at = msg.created_at;
              actualizado[index].texto_mensaje = msg.texto_mensaje;
              actualizado[index].tipo_mensaje = msg.tipo_mensaje;
              actualizado[index].source =
                msg.source || actualizado[index].source;

              if (isIncoming) {
                actualizado[index].mensajes_pendientes =
                  (actualizado[index].mensajes_pendientes || 0) + 1;
                actualizado[index].visto = 0;
              }

              actualizado[index].id_encargado = encargadoId;

              // si en el payload viene el encargado (depende cómo lo mande su backend)
              if (msg.clientePorCelular.nombre_encargado)
                actualizado[index].nombre_encargado =
                  msg.clientePorCelular.nombre_encargado;

              const [moved] = actualizado.splice(index, 1);
              actualizado.unshift(moved);
              return actualizado;
            }

            /* si no se cumple crea uno nuevo */
            const nuevoChat = {
              id: msg.celular_recibe,
              id_configuracion: msg.id_configuracion,
              mensaje_created_at: msg.created_at,
              texto_mensaje: msg.texto_mensaje,
              tipo_mensaje: msg.tipo_mensaje,
              mensajes_pendientes: isIncoming ? 1 : 0,
              visto: isIncoming ? 0 : 1,
              source: msg.source,
              id_encargado: encargadoId,
              nombre_encargado: msg.clientePorCelular.nombre_encargado ?? "",
              nombre_cliente: msg.clientePorCelular?.nombre_cliente,
              celular_cliente: msg.clientePorCelular?.celular_cliente,
              etiquetas: [{ id: null, nombre: null, color: null }],
              transporte: null,
              estado_factura: null,
              novedad_info: {
                id_novedad: null,
                novedad: null,
                solucionada: null,
                terminado: null,
              },
            };

            actualizado.unshift(nuevoChat);

            return actualizado;
          }

          // Siempre retornar el array anterior si no se cumple ninguna condición
          return prev;
        });

        // si tienes chat seleccionado abierto y coincide, lo actualizas también
        if (
          selectedChat &&
          String(selectedChat.id) === String(msg.celular_recibe)
        ) {
          // opcional: cerrar chat actual o mostrar aviso
          if (Swal.isVisible()) Swal.close();
          setSelectedChat(null);
          setChatMessages([]);
        }
      }
    });
  }, [isSocketConnected, userData, scopeChats, selectedChat]);

  /* sistema de notificacion cuando se asigne correctamente */
  useEffect(() => {
    if (!socketRef.current) return;

    const onAsignarResponse = (res) => {
      if (res?.status === "success") {
        Toast.fire({ icon: "success", title: res.message });

        setSelectedChat((prev) => ({
          ...prev,
          id_encargado: id_sub_usuario_global,
        }));

        // Actualizar id_encargado en mensajesAcumulados
        const updatedMensajesAcumulados = mensajesAcumulados.map((mensaje) => {
          if (mensaje.id === selectedChat.id) {
            return {
              ...mensaje,
              id_encargado: id_sub_usuario_global, // Actualizar id_encargado
            };
          }
          return mensaje;
        });

        // Actualizar mensajesAcumulados en el estado si es necesario
        setMensajesAcumulados(updatedMensajesAcumulados);
      } else {
        Toast.fire({
          icon: "error",
          title: res?.message || "Ocurrió un problema al transferir el chat.",
        });
      }
    };

    socketRef.current.on("ASIGNAR_ENCARGADO_RESPONSE", onAsignarResponse);

    return () => {
      socketRef.current.off("ASIGNAR_ENCARGADO_RESPONSE", onAsignarResponse);
    };
  }, [isSocketConnected, selectedChat, mensajesAcumulados]);
  /* sistema de notificacion cuando se asigne correctamente */

  const scrollRef = useRef(null);
  const [cargandoChats, setCargandoChats] = useState(false);

  const handleScrollMensajes = () => {
    const div = scrollRef.current;
    if (div.scrollTop + div.clientHeight >= div.scrollHeight - 50) {
      if (ultimo_cursorId != cursorId) {
        console.log("Cargando más mensajes...");
        setCargandoChats(true);
        setMensajesVisibles((prev) => prev + 10);
      }
    }
  };

  // Usamos un useEffect para cargar los primeros mensajes (o más mensajes si es necesario)
  useEffect(() => {
    const cargarChats = async () => {
      if (socketRef.current && isSocketConnected) {
        if (ultimo_cursorId != cursorId) {
          console.log("cursorFecha: " + cursorFecha);
          console.log("cursorId: " + cursorId);
          // socketRef.current.emit(
          //   "GET_CHATS",
          //   id_configuracion,
          //   id_sub_usuario_global,
          //   rol_usuario_global,
          //   {
          //     limit: 10,
          //     cursorFecha,
          //     cursorId,
          //     filtros: {
          //       searchTerm,
          //       selectedEtiquetas,
          //       selectedEstado,
          //       selectedTransportadora,
          //       selectedNovedad,
          //       selectedTab,
          //       selectedPedidos_confirmados,
          //     },
          //     scopeChats,
          //   },
          // );

          emitGetChats({ reset: false, limit: 10 });
          setUltimo_cursorId(cursorId);

          socketRef.current.once("CHATS", (data) => {
            if (data.length > 0) {
              setMensajesAcumulados((prev) => {
                const idsPrev = new Set(prev.map((msg) => msg.id));
                const nuevos = data.filter((msg) => !idsPrev.has(msg.id));
                return [...prev, ...nuevos];
              });

              const ultimo = data[data.length - 1];
              setCursorFecha(ultimo.mensaje_created_at);
              setCursorId(ultimo.id);
            }
            setCargandoChats(false);
            prefetchProfilesFromChats(data);
          });
        }
      }
    };

    cargarChats();
  }, [mensajesVisibles]);

  useEffect(() => {
    if (!socketRef.current) return;

    const cargarChatsFiltros = async () => {
      setMensajesAcumulados([]);
      setMensajesVisibles(10);
      setCursorFecha(null);
      setCursorId(null);
      if (selectedTab == "resueltos") {
        setScopeChats("mine");
      }

      emitGetChats({ reset: true, limit: 10 });

      socketRef.current.once("CHATS", (data) => {
        if (data.length > 0) {
          setMensajesAcumulados(data);

          const ultimo = data[data.length - 1];
          setCursorFecha(ultimo.mensaje_created_at);
          setCursorId(ultimo.id);
        }
        prefetchProfilesFromChats(data);
      });
    };

    cargarChatsFiltros();
  }, [
    searchTerm,
    selectedEtiquetas,
    selectedEstado,
    selectedTransportadora,
    selectedNovedad,
    selectedTab,
    selectedPedidos_confirmados,
    scopeChats,
  ]);

  function cargar_socket() {
    setTimeout(() => {
      setSeRecibioMensaje(true);
    }, 1000); // Temporizador de 1 segundo (1000 ms)
  }

  useEffect(() => {
    if (seRecibioMensaje) {
      // Obtener los chats recientes (carga inicial con cursores nulos)
      // socketRef.current.emit(
      //   "GET_CHATS",
      //   id_configuracion,
      //   id_sub_usuario_global,
      //   rol_usuario_global,
      //   {
      //     limit: 10,
      //     cursorFecha: null, // Cargar desde el más reciente
      //     cursorId: null,
      //     filtros: {
      //       searchTerm,
      //       selectedEtiquetas,
      //       selectedEstado,
      //       selectedTransportadora,
      //       selectedNovedad,
      //       selectedTab,
      //       selectedPedidos_confirmados,
      //     },
      //     scopeChats,
      //   },
      // );

      emitGetChats({ reset: true, limit: 10 });
      socketRef.current.once("CHATS", (data) => {
        if (data.length > 0) {
          setMensajesAcumulados((prevChats) => {
            // Eliminar duplicados del nuevo data
            const nuevosIds = new Set(data.map((chat) => chat.id));

            // Filtrar chats viejos que no están siendo actualizados
            const filtrados = prevChats.filter(
              (chat) => !nuevosIds.has(chat.id),
            );

            // Unir chats filtrados con los nuevos
            const actualizados = [...filtrados, ...data];

            // Ordenar por mensaje_created_at descendente
            actualizados.sort(
              (a, b) =>
                new Date(b.mensaje_created_at) - new Date(a.mensaje_created_at),
            );

            return actualizados;
          });

          const ultimo = data[data.length - 1];
          setCursorFecha(ultimo.mensaje_created_at);
          setCursorId(ultimo.id);
        }
        prefetchProfilesFromChats(data);
      });

      // Obtener mensajes del chat seleccionado si existe
      if (selectedChat != null) {
        socketRef.current.emit("GET_CHATS_BOX", {
          chatId: selectedChat.id,
          id_configuracion: id_configuracion,
        });

        const handleChatBoxResponse = (data) => {
          console.log(
            "Mensajes actualizados tras recibir un nuevo mensaje:",
            data,
          );
          setChatMessages(data);

          const orderedMessages = getOrderedChats();
          setMensajesOrdenados(orderedMessages.slice(-20));
          setMensajesMostrados(20);

          if (chatContainerRef.current) {
            const chatContainer = chatContainerRef.current;
            const isAtBottom =
              chatContainer.scrollHeight - chatContainer.scrollTop <=
              chatContainer.clientHeight + 5;

            if (isAtBottom) {
              chatContainer.scrollTop = chatContainer.scrollHeight;
            }
          }
        };

        socketRef.current.once("CHATS_BOX_RESPONSE", handleChatBoxResponse);

        setMensajesAcumulados((prev) =>
          prev.map((chat) =>
            chat.id === selectedChat.id
              ? { ...chat, mensajes_pendientes: 0 }
              : chat,
          ),
        );
      }

      setSeRecibioMensaje(false);
    }
  }, [seRecibioMensaje, selectedChat, userData, getOrderedChats]);

  useEffect(() => {
    if (!selectedChat || !userData || !isSocketConnected) {
      setChatMessages([]);
      setMensajesOrdenados([]);
      return;
    }

    console.log("Chat seleccionado:", selectedChat);
    fetchTags();
    fetchTagsAsginadas();

    // WhatsApp / otros canales
    socketRef.current.emit("GET_CHATS_BOX", {
      chatId: selectedChat.id,
      id_configuracion,
    });

    setDataPlanes([]);

    const handleChatBoxResponse = (data) => {
      console.log("Mensajes recibidos:", data);
      setChatMessages(data);
      const orderedMessages = getOrderedChats();
      setMensajesOrdenados(orderedMessages.slice(-20));
      setMensajesMostrados(20);
      setDataPlanes(data[0].paquetes || []);
      console.log("Paquetes recibidos:", data.paquetes);
    };

    socketRef.current.on("CHATS_BOX_RESPONSE", handleChatBoxResponse);
    setMensajesAcumulados((prev) =>
      prev.map((chat) =>
        chat.id === selectedChat.id
          ? { ...chat, mensajes_pendientes: 0 }
          : chat,
      ),
    );
    return () => {
      socketRef.current.off("CHATS_BOX_RESPONSE", handleChatBoxResponse);
    };
  }, [selectedChat, userData, isSocketConnected]);

  useEffect(() => {
    if (chatMessages.length > 0) {
      const orderedMessages = getOrderedChats();
      setMensajesOrdenados(orderedMessages);
      setTimeout(() => {
        scrollToBottom();
      }, 200);
    } else {
      setMensajesOrdenados([]); // Asegúrate de limpiar mensajesOrdenados si chatMessages está vacío
    }
  }, [chatMessages]);

  // useEffect para ejecutar la búsqueda cuando cambia el término de búsqueda
  useEffect(() => {
    if (menuSearchTerm.trim().length > 0) {
      // Si hay algo en el término de búsqueda, realiza la búsqueda en el socket
      if (socketRef.current) {
        socketRef.current.emit("GET_TEMPLATES", {
          id_configuracion: id_configuracion,
          palabraClave: menuSearchTerm,
        });

        // Escuchar los resultados de la búsqueda del socket
        const handleTemplatesResponse = (data) => {
          setSearchResults(data); // Actualiza el estado con los resultados recibidos
        };

        socketRef.current.on("TEMPLATES_RESPONSE", handleTemplatesResponse);

        // Limpieza para evitar acumulación de listeners
        return () => {
          socketRef.current.off("TEMPLATES_RESPONSE", handleTemplatesResponse);
        };
      }
    } else {
      // Si el campo de búsqueda está vacío, mostrar todos los templates
      if (socketRef.current) {
        socketRef.current.emit("GET_TEMPLATES", {
          id_configuracion: id_configuracion,
          palabraClave: "", // Filtro vacío para obtener todos los templates
        });

        // Escuchar todos los templates disponibles
        const handleTemplatesResponse = (data) => {
          setSearchResults(data); // Llena el estado con todos los templates
        };

        socketRef.current.on("TEMPLATES_RESPONSE", handleTemplatesResponse);

        // Limpieza para evitar acumulación de listeners
        return () => {
          socketRef.current.off("TEMPLATES_RESPONSE", handleTemplatesResponse);
        };
      }
    }
  }, [menuSearchTerm, isSocketConnected, id_configuracion]);

  // useEffect para ejecutar la búsqueda cuando cambia el término de búsqueda telefono
  useEffect(() => {
    if (menuSearchTermNumeroCliente.length > 0) {
      // Emitir el evento al servidor
      socketRef.current.emit("GET_CELLPHONES", {
        id_configuracion: id_configuracion,
        texto: menuSearchTermNumeroCliente,
      });

      // Escuchar los resultados de la búsqueda del socket
      const handleDataResponse = (data) => {
        setSearchResultsNumeroCliente(data);
      };

      socketRef.current.on("DATA_CELLPHONE_RESPONSE", handleDataResponse);

      // Limpieza para eliminar el listener
      return () => {
        socketRef.current.off("DATA_CELLPHONE_RESPONSE", handleDataResponse);
      };
    } else {
      setSearchResultsNumeroCliente([]);
    }
  }, [menuSearchTermNumeroCliente]);

  const normalizeMsg = (m = {}, fallbackSource) => {
    const created =
      m.created_at || m.createdAt || m.timestamp || new Date().toISOString();

    const texto =
      m.texto_mensaje ?? m.text ?? m.message ?? m.body ?? m.payload ?? "";

    const tipo = m.tipo_mensaje || m.type || "text";

    const direction =
      m.direction ||
      (m.rol_mensaje === 1 ? "out" : m.rol_mensaje === 0 ? "in" : undefined);

    return {
      ...m,
      created_at: created,
      texto_mensaje: texto,
      tipo_mensaje: tipo,
      direction,
      source: m.source || fallbackSource,
    };
  };

  useEffect(() => {
    if (!isSocketConnected || !socketRef.current) return;

    const scrollIfAtBottom = () => {
      if (!chatContainerRef.current) return;
      const el = chatContainerRef.current;
      const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 5;
      if (isAtBottom) el.scrollTop = el.scrollHeight;
    };

    const onUpdateChat = (payload) => {
      const {
        id_configuracion: cfg,
        chatId, // ✅ MULTI-CANAL: debe venir SIEMPRE
        message,
        source,
        chat, // ✅ MULTI-CANAL: idealmente viene con id_encargado
        ultimoMensaje, // compat si alguna vez llega así
      } = payload || {};

      if (!chatId) return;
      if (String(cfg) !== String(id_configuracion)) return;

      const msg = normalizeMsg(ultimoMensaje ?? message, source);

      const isIncoming =
        msg.direction === "in" ||
        msg.rol_mensaje === 0 ||
        msg.rol_mensaje === "0";

      // encargado unificado
      const clienteWa = msg.clientePorCelular || null;
      const encargadoId = chat?.id_encargado ?? clienteWa?.id_encargado ?? null;

      const isAdmin = rol_usuario_global === "administrador";
      const encargadoStr =
        encargadoId == null ? "" : String(encargadoId).trim();
      const isUnassigned = !encargadoStr;
      const canSeeChat =
        isAdmin ||
        isUnassigned ||
        encargadoStr === String(id_sub_usuario_global);

      // 1) IZQUIERDA
      setMensajesAcumulados((prevChats) => {
        const actualizado = prevChats.map((c) => ({ ...c }));

        const index = actualizado.findIndex(
          (c) => String(c.id) === String(chatId),
        );

        if (index !== -1) {
          console.log("canSeeChat: " + canSeeChat);
          // ✅ si ya existe en la izquierda pero ya NO le corresponde (y no es admin) => eliminarlo
          if (!canSeeChat) {
            console.log("entro");
            actualizado.splice(index, 1);
            return actualizado;
          }

          actualizado[index].mensaje_created_at = msg.created_at;
          actualizado[index].texto_mensaje = msg.texto_mensaje;
          actualizado[index].tipo_mensaje = msg.tipo_mensaje;
          actualizado[index].source = msg.source || actualizado[index].source;

          if (isIncoming) {
            actualizado[index].mensajes_pendientes =
              (actualizado[index].mensajes_pendientes || 0) + 1;
            actualizado[index].visto = 0;
          }

          actualizado[index].id_encargado = encargadoId;

          // si en el payload viene el encargado (depende cómo lo mande su backend)
          if (clienteWa?.nombre_encargado)
            actualizado[index].nombre_encargado = clienteWa.nombre_encargado;

          const [moved] = actualizado.splice(index, 1);
          actualizado.unshift(moved);
          return actualizado;
        }

        const nuevoChat = chat
          ? {
              ...chat,
              id: chat.id ?? chatId,
              mensaje_created_at: msg.created_at,
              texto_mensaje: msg.texto_mensaje,
              tipo_mensaje: msg.tipo_mensaje,
              mensajes_pendientes: isIncoming ? 1 : 0,
              visto: isIncoming ? 0 : 1,
              source: msg.source,
              id_configuracion: cfg,
            }
          : {
              id: chatId,
              id_configuracion: cfg,
              mensaje_created_at: msg.created_at,
              texto_mensaje: msg.texto_mensaje,
              tipo_mensaje: msg.tipo_mensaje,
              mensajes_pendientes: isIncoming ? 1 : 0,
              visto: isIncoming ? 0 : 1,
              source: msg.source,
              id_encargado: encargadoId,
              nombre_encargado: clienteWa.nombre_encargado ?? "",
              nombre_cliente: clienteWa?.nombre_cliente,
              celular_cliente: clienteWa?.celular_cliente,
              etiquetas: [{ id: null, nombre: null, color: null }],
              transporte: null,
              estado_factura: null,
              novedad_info: {
                id_novedad: null,
                novedad: null,
                solucionada: null,
                terminado: null,
              },
            };

        // ✅ CONDICIÓN EXACTA DEL ANTIGUO (pero con encargado unificado)
        if (canSeeChat) {
          actualizado.unshift(nuevoChat);
        }

        return actualizado;
      });

      // if (selectedChat && String(selectedChat.id) === String(chatId)) {
      //   // opcional: cerrar chat actual o mostrar aviso
      //   if (Swal.isVisible()) Swal.close();
      //   setSelectedChat(null);
      //   setChatMessages([]);
      // }
      if (
        selectedChat &&
        String(selectedChat.id) === String(chatId) &&
        !canSeeChat
      ) {
        if (Swal.isVisible()) Swal.close();
        setSelectedChat(null);
        setChatMessages([]);
      }

      // 1.1) CURSOR (igual antiguo)
      if (!cursorFecha || !cursorId) {
        if (!cursorFecha && msg?.created_at) setCursorFecha(msg.created_at);
        if (!cursorId && msg?.id) setCursorId(msg.id);
      }

      // 2) DERECHA (igual antiguo: refresca con GET_CHATS_BOX)
      if (selectedChat && String(selectedChat.id) === String(chatId)) {
        console.log("entro 2");
        socketRef.current.emit("GET_CHATS_BOX", {
          chatId: selectedChat.id,
          id_configuracion: id_configuracion,
        });

        socketRef.current.once("CHATS_BOX_RESPONSE", (boxData) => {
          setChatMessages(boxData);

          setMensajesAcumulados((prev) =>
            prev.map((c) =>
              String(c.id) === String(selectedChat.id)
                ? { ...c, mensajes_pendientes: 0 }
                : c,
            ),
          );

          const orderedMessages = getOrderedChats();
          setMensajesOrdenados(orderedMessages.slice(-20));
          setMensajesMostrados(20);

          scrollIfAtBottom();
        });
      }
    };

    socketRef.current.on("UPDATE_CHAT", onUpdateChat);
    return () => socketRef.current.off("UPDATE_CHAT", onUpdateChat);
  }, [
    isSocketConnected,
    id_configuracion,
    selectedChat,
    rol_usuario_global,
    id_sub_usuario_global,
    cursorFecha,
    cursorId,
  ]);

  const recargarDatosFactura = () => {
    if (socketRef.current) {
      // Emitir evento para solicitar datos actualizados
      socketRef.current.emit("GET_FACTURAS", {
        id_plataforma: id_plataforma_conf, // Ajusta con la info necesaria
        telefono: selectedChat.celular_cliente,
      });

      console.log("Recargando datos de factura...");
    }
  };

  function validar_estadoLaar(estado) {
    let color = "";
    let estado_guia = "";

    if (estado == 1) {
      color = "bg-purple-500";
      estado_guia = "Generado";
    } else if (estado == 2) {
      color = "bg-purple-500";
      estado_guia = "Recolectado";
    } else if (estado == 4) {
      color = "bg-purple-500";
      estado_guia = "En bodega";
    } else if (estado == 5) {
      color = "bg-yellow-500";
      estado_guia = "En tránsito";
    } else if (estado == 6) {
      color = "bg-yellow-500";
      estado_guia = "Zona entrega";
    } else if (estado == 7) {
      color = "bg-green-500";
      estado_guia = "Entregado";
    } else if (estado == 8) {
      color = "bg-red-500";
      estado_guia = "Anulado";
    } else if (estado == 11 || estado == 12) {
      color = "bg-yellow-500";
      estado_guia = "En tránsito";
    } else if (estado == 14) {
      color = "bg-red-500";
      estado_guia = "Novedad";
    } else if (estado == 9) {
      color = "bg-red-500";
      estado_guia = "Devuelto";
    }

    return {
      color,
      estado_guia,
    };
  }

  function validar_estadoServi(estado) {
    let color = "";
    let estado_guia = "";

    if (estado == 101) {
      color = "bg-red-500";
      estado_guia = "Anulado";
    } else if (estado == 100 || estado == 102 || estado == 103) {
      color = "bg-purple-500";
      estado_guia = "Generado";
    } else if (estado == 200 || estado == 201 || estado == 202) {
      color = "bg-purple-500";
      estado_guia = "Recolectado";
    } else if (estado >= 300 && estado <= 316 && estado !== 307) {
      color = "bg-yellow-500";
      estado_guia = "En tránsito";
    } else if (estado == 317) {
      color = "bg-yellow-500";
      estado_guia = "Retirar en agencia";
    } else if (estado == 307) {
      color = "bg-yellow-500";
      estado_guia = "Zona entrega";
    } else if (estado >= 400 && estado <= 403) {
      color = "bg-green-500";
      estado_guia = "Entregado";
    } else if (estado >= 318 && estado <= 351) {
      color = "bg-red-500";
      estado_guia = "Novedad";
    } else if (estado >= 500 && estado <= 502) {
      color = "bg-red-500";
      estado_guia = "Devuelto";
    }

    return {
      color,
      estado_guia,
    };
  }

  function validar_estadoGintracom(estado) {
    let color = "";
    let estado_guia = "";

    if (estado == 1) {
      color = "bg-purple-500";
      estado_guia = "Generado";
    } else if (estado == 2) {
      color = "bg-yellow-500";
      estado_guia = "Recolectado";
    } else if (estado == 3) {
      color = "bg-yellow-500";
      estado_guia = "Recolectado";
    } else if (estado == 4) {
      color = "bg-yellow-500";
      estado_guia = "En tránsito";
    } else if (estado == 5) {
      color = "bg-yellow-500";
      estado_guia = "Zona entrega";
    } else if (estado == 6) {
      color = "bg-red-500";
      estado_guia = "Novedad";
    } else if (estado == 7) {
      color = "bg-green-500";
      estado_guia = "Entregado";
    } else if (estado == 8) {
      color = "bg-red-500";
      estado_guia = "Devolución";
    } else if (estado == 9) {
      color = "bg-red-500";
      estado_guia = "Devolución";
    } else if (estado == 10) {
      color = "bg-red-500";
      estado_guia = "Cancelada";
    } else if (estado == 12) {
      color = "bg-red-500";
      estado_guia = "Anulada";
    } else if (estado == 13) {
      color = "bg-red-500";
      estado_guia = "Devolución";
    }

    return {
      color,
      estado_guia,
    };
  }

  function validar_estadoSpeed(estado) {
    let color = "";
    let estado_guia = "";

    if (estado == 2) {
      color = "bg-purple-500";
      estado_guia = "Generado";
    } else if (estado == 3) {
      color = "bg-yellow-500";
      estado_guia = "En transito";
    } else if (estado == 7) {
      color = "bg-green-500";
      estado_guia = "Entregado";
    } else if (estado == 8) {
      color = "bg-red-500";
      estado_guia = "Anulada";
    } else if (estado == 9) {
      color = "bg-red-500";
      estado_guia = "Devuelto";
    } else if (estado == 14) {
      color = "bg-red-500";
      estado_guia = "Novedad";
    }

    return {
      color,
      estado_guia,
    };
  }

  // Función para obtener el estado y estilo dinámico
  const obtenerEstadoGuia = (transporte, estado) => {
    switch (transporte) {
      case "LAAR":
        return validar_estadoLaar(estado);
      case "SERVIENTREGA":
        return validar_estadoServi(estado);
      case "GINTRACOM":
        return validar_estadoGintracom(estado);
      case "SPEED":
        return validar_estadoSpeed(estado);
      default:
        return { color: "", estado_guia: "" }; // Estado desconocido
    }
  };

  const [guiaSeleccionada, setGuiaSeleccionada] = useState(null);
  const [provinciaCiudad, setProvinciaCiudad] = useState({
    provincia: "",
    ciudad: "",
  });

  //Manejo de seleccion de guia
  const handleGuiaSeleccionada = (guia) => {
    setGuiaSeleccionada(guia);

    let { color, estado_guia } = obtenerEstadoGuia(
      guia.transporte, // El sistema (LAAR, SERVIENTREGA, etc.)
      guia.estado_guia_sistema, // El estado numérico
    );

    if (estado_guia == "Generado" || estado_guia == "Por recolectar") {
      setDisableAanular(true);
    } else {
      setDisableAanular(false);

      if (estado_guia == "Novedad") {
        setDisableGestionar(true);
      }
    }

    // Llamar a la función para obtener provincia y ciudad
    if (guia.ciudad_cot) {
      obtenerProvinciaCiudad(guia.ciudad_cot);
    }
  };

  const obtenerProvinciaCiudad = async (id_ciudad) => {
    try {
      const { data } = await chatApi.get(
        `/chat_service/ciudadProvincia/${id_ciudad}`,
      );

      if (!data.success) {
        throw new Error("No se pudo obtener la ubicación");
      }

      //data.data => {ciudad, provincia}
      setProvinciaCiudad({
        provincia: data.data.provincia,
        ciudad: data.data.ciudad,
      });
    } catch (err) {
      setProvinciaCiudad({ provincia: "Sin datos", ciudad: "Sin datos" });
    }
  };

  const [numeroModalPreset, setNumeroModalPreset] = useState(null);

  // abrir limpio (por el botón “más”)
  const abrirModalLimpio = () => {
    // abrir siempre sin preset
    setNumeroModalPreset(null);

    // si ya está abierto, forzamos un remount para limpiar estados internos
    if (numeroModal) {
      setNumeroModal(false);
      setTimeout(() => setNumeroModal(true), 0);
    } else {
      setNumeroModal(true);
    }
  };

  return (
    <div className="sm:grid grid-cols-4">
      <div className="text-sm text-gray-700 fixed bottom-0 z-50 left-2">
        v1.4 Hecho por{" "}
        <a target="_blank" href="https://new.imporsuitpro.com">
          Imporsuit
        </a>{" "}
        con ❤️
      </div>
      {/* Cabecera */}
      <Cabecera
        userData={userData}
        id_configuracion={id_configuracion}
        chatMessages={chatMessages}
        opciones={opciones}
        setOpciones={setOpciones}
        handleOpciones={handleOpciones}
        selectedChat={selectedChat}
        setSelectedChat={setSelectedChat}
        animateOut={animateOut}
        toggleCrearEtiquetaModal={toggleCrearEtiquetaModal}
        toggleTransferirChatModal={toggleTransferirChatModal}
        setOpcionesMenuOpen={setOpcionesMenuOpen}
        opcionesMenuOpen={opcionesMenuOpen}
        toggleAsignarEtiquetaModal={toggleAsignarEtiquetaModal}
        tagListAsginadas={tagListAsginadas}
        tagList={tagList}
        cargar_socket={cargar_socket}
        SwitchBot={SwitchBot}
        setMensajesAcumulados={setMensajesAcumulados}
        id_plataforma_conf={id_plataforma_conf}
        tipo_configuracion={tipo_configuracion}
        dataPlanes={dataPlanes}
      />
      {/* Historial de chats */}
      <Sidebar
        filteredChats={filteredChats}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        setNumeroModal={setNumeroModal}
        openNumeroModal={openNumeroModal}
        handleSelectChat={handleSelectChat}
        acortarTexto={acortarTexto}
        selectedChat={selectedChat}
        chatTemporales={chatTemporales}
        formatFecha={formatFecha}
        setFiltro_chats={setFiltro_chats}
        filtro_chats={filtro_chats}
        handleFiltro_chats={handleFiltro_chats}
        setSearchTermEtiqueta={setSearchTermEtiqueta}
        searchTermEtiqueta={searchTermEtiqueta}
        etiquetas_api={etiquetas_api}
        selectedEtiquetas={selectedEtiquetas}
        setSelectedEtiquetas={setSelectedEtiquetas}
        handleChange={handleChange}
        etiquetasOptions={etiquetasOptions}
        selectedEstado={selectedEstado}
        setSelectedEstado={setSelectedEstado}
        selectedTransportadora={selectedTransportadora}
        setSelectedTransportadora={setSelectedTransportadora}
        setSelectedNovedad={setSelectedNovedad}
        selectedNovedad={selectedNovedad}
        Loading={Loading}
        validar_estadoLaar={validar_estadoLaar}
        validar_estadoServi={validar_estadoServi}
        validar_estadoGintracom={validar_estadoGintracom}
        validar_estadoSpeed={validar_estadoSpeed}
        selectedTab={selectedTab}
        setSelectedTab={setSelectedTab}
        mensajesAcumulados={mensajesAcumulados}
        mensajesVisibles={mensajesVisibles}
        setMensajesVisibles={setMensajesVisibles}
        scrollRef={scrollRef}
        handleScrollMensajes={handleScrollMensajes}
        id_plataforma_conf={id_plataforma_conf}
        selectedPedidos_confirmados={selectedPedidos_confirmados}
        setSelectedPedidos_confirmados={setSelectedPedidos_confirmados}
        isLoadingWA={isLoadingWA}
        isLoadingMS={isLoadingMS}
        isLoadingIG={isLoadingIG}
        cargandoChats={cargandoChats}
        scopeChats={scopeChats}
        setScopeChats={setScopeChats}
        onChangeChannelAndFetch={onChangeChannelAndFetch}
      />
      {/* todos los mensajes */}
      <ChatPrincipal
        mensajesOrdenados={mensajesOrdenados}
        opciones={opciones}
        endOfMessagesRef={endOfMessagesRef}
        mensaje={mensaje}
        handleInputChange={handleInputChange}
        inputRef={inputRef}
        handleSendMessage={handleSendMessage}
        grabando={grabando}
        startRecording={startRecording}
        stopRecording={stopRecording}
        file={file}
        setEmojiOpen={setEmojiOpen}
        emojiOpen={emojiOpen}
        emojiPickerRef={emojiPickerRef}
        handleEmojiClick={handleEmojiClick}
        isChatBlocked={isChatBlocked}
        isCommandActive={isCommandActive}
        formatFecha={formatFecha}
        menuSearchTerm={menuSearchTerm}
        handleMenuSearchChange={handleMenuSearchChange}
        inputSearchRef={inputSearchRef}
        searchResults={searchResults}
        handleOptionSelect={handleOptionSelect}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        handleModal_enviarArchivos={handleModal_enviarArchivos}
        getFileIcon={getFileIcon}
        selectedChat={selectedChat}
        setNumeroModal={setNumeroModal}
        handleSelectPhoneNumber={handleSelectPhoneNumber}
        setNumeroModalPreset={setNumeroModalPreset}
        chatContainerRef={chatContainerRef}
        mensajesMostrados={mensajesMostrados}
        setMensajesMostrados={setMensajesMostrados}
        scrollOffset={scrollOffset}
        setScrollOffset={setScrollOffset}
        mensajesActuales={mensajesActuales}
        handleScroll={handleScroll}
        ScrollToBottomButton={ScrollToBottomButton}
        handleCloseModal={handleCloseModal}
        dataAdmin={dataAdmin}
        setMensajesOrdenados={setMensajesOrdenados}
        isSocketConnected={isSocketConnected}
      />
      {/* Seccion de la derecha, datos de usuario, acciones */}
      {/* <DatosUsuario
        opciones={opciones}
        animateOut={animateOut}
        facturasChatSeleccionado={facturasChatSeleccionado}
        provincias={provincias}
        socketRef={socketRef}
        userData={userData}
        id_configuracion={id_configuracion}
        setFacturasChatSeleccionado={setFacturasChatSeleccionado}
        guiasChatSeleccionado={guiasChatSeleccionado}
        setGuiasChatSeleccionado={setGuiasChatSeleccionado}
        novedades_gestionadas={novedades_gestionadas}
        novedades_noGestionadas={novedades_noGestionadas}
        validar_estadoLaar={validar_estadoLaar}
        validar_estadoServi={validar_estadoServi}
        validar_estadoGintracom={validar_estadoGintracom}
        validar_estadoSpeed={validar_estadoSpeed}
        guiaSeleccionada={guiaSeleccionada}
        setGuiaSeleccionada={setGuiaSeleccionada}
        provinciaCiudad={provinciaCiudad}
        setProvinciaCiudad={setProvinciaCiudad}
        handleGuiaSeleccionada={handleGuiaSeleccionada}
        selectedChat={selectedChat}
        obtenerEstadoGuia={obtenerEstadoGuia}
        disableAanular={disableAanular}
        disableGestionar={disableGestionar}
        recargarDatosFactura={recargarDatosFactura}
        dataAdmin={dataAdmin}
        buscar_id_recibe={buscar_id_recibe}
        agregar_mensaje_enviado={agregar_mensaje_enviado}
        id_plataforma_conf={id_plataforma_conf}
        id_usuario_conf={id_usuario_conf}
        monto_venta={monto_venta}
        setMonto_venta={setMonto_venta}
        costo={costo}
        setCosto={setCosto}
        precio_envio_directo={precio_envio_directo}
        setPrecio_envio_directo={setPrecio_envio_directo}
        fulfillment={fulfillment}
        setFulfillment={setFulfillment}
        total_directo={total_directo}
        setTotal_directo={setTotal_directo}
        validar_generar={validar_generar}
        setValidar_generar={setValidar_generar}
        selectedImageId={selectedImageId}
        setSelectedImageId={setSelectedImageId}
      /> */}
      <DatosUsuarioModerno
        opciones={opciones}
        animateOut={animateOut}
        facturasChatSeleccionado={facturasChatSeleccionado}
        provincias={provincias}
        socketRef={socketRef}
        userData={userData}
        id_configuracion={id_configuracion}
        setFacturasChatSeleccionado={setFacturasChatSeleccionado}
        guiasChatSeleccionado={guiasChatSeleccionado}
        setGuiasChatSeleccionado={setGuiasChatSeleccionado}
        novedades_gestionadas={novedades_gestionadas}
        novedades_noGestionadas={novedades_noGestionadas}
        validar_estadoLaar={validar_estadoLaar}
        validar_estadoServi={validar_estadoServi}
        validar_estadoGintracom={validar_estadoGintracom}
        validar_estadoSpeed={validar_estadoSpeed}
        guiaSeleccionada={guiaSeleccionada}
        setGuiaSeleccionada={setGuiaSeleccionada}
        provinciaCiudad={provinciaCiudad}
        setProvinciaCiudad={setProvinciaCiudad}
        handleGuiaSeleccionada={handleGuiaSeleccionada}
        selectedChat={selectedChat}
        obtenerEstadoGuia={obtenerEstadoGuia}
        disableAanular={disableAanular}
        disableGestionar={disableGestionar}
        recargarDatosFactura={recargarDatosFactura}
        dataAdmin={dataAdmin}
        buscar_id_recibe={buscar_id_recibe}
        agregar_mensaje_enviado={agregar_mensaje_enviado}
        id_plataforma_conf={id_plataforma_conf}
        id_usuario_conf={id_usuario_conf}
        monto_venta={monto_venta}
        setMonto_venta={setMonto_venta}
        costo={costo}
        setCosto={setCosto}
        precio_envio_directo={precio_envio_directo}
        setPrecio_envio_directo={setPrecio_envio_directo}
        fulfillment={fulfillment}
        setFulfillment={setFulfillment}
        total_directo={total_directo}
        setTotal_directo={setTotal_directo}
        validar_generar={validar_generar}
        setValidar_generar={setValidar_generar}
        selectedImageId={selectedImageId}
        setSelectedImageId={setSelectedImageId}
      />
      {/* MODALES */}
      <Modales
        numeroModal={numeroModal}
        handleSubmit={handleSubmit}
        handleSubmit_template={handleSubmit_template}
        register={register}
        handleNumeroModal={closeNumeroModal}
        seleccionado={seleccionado}
        menuSearchTermNumeroCliente={menuSearchTermNumeroCliente}
        searchResultsNumeroCliente={searchResultsNumeroCliente}
        handleInputChange_numeroCliente={handleInputChange_numeroCliente}
        handleNumeroModalForm={handleNumeroModalForm}
        handleOptionSelectNumeroTelefono={handleOptionSelectNumeroTelefono}
        templates={templates}
        dataAdmin={dataAdmin}
        handleSelectPhoneNumber={handleSelectPhoneNumber}
        selectedPhoneNumber={selectedPhoneNumber}
        setSelectedPhoneNumber={setSelectedPhoneNumber}
        selectedPhoneNumberNombre={selectedPhoneNumberNombre}
        setSelectedPhoneNumberNombre={setSelectedPhoneNumberNombre}
        selectedPhoneNumberIdEncargado={selectedPhoneNumberIdEncargado}
        setSelectedPhoneNumberIdEncargado={setSelectedPhoneNumberIdEncargado}
        userData={userData}
        id_configuracion={id_configuracion}
        tipo_modalEnviarArchivo={tipo_modalEnviarArchivo}
        modal_enviarArchivos={modal_enviarArchivos}
        handleModal_enviarArchivos={handleModal_enviarArchivos}
        selectedChat={selectedChat}
        agregar_mensaje_enviado={agregar_mensaje_enviado}
        getFileIcon={getFileIcon}
        toggleCrearEtiquetaModal={toggleCrearEtiquetaModal}
        isCrearEtiquetaModalOpen={isCrearEtiquetaModalOpen}
        tagList={tagList}
        setTagList={setTagList}
        fetchTags={fetchTags}
        isAsignarEtiquetaModalOpen={isAsignarEtiquetaModalOpen}
        toggleAsignarEtiquetaModal={toggleAsignarEtiquetaModal}
        tagListAsginadas={tagListAsginadas}
        setTagListAsginadas={setTagListAsginadas}
        toggleTagAssignment={toggleTagAssignment}
        setNumeroModal={setNumeroModal}
        cargar_socket={cargar_socket}
        buscarIdRecibe={buscarIdRecibe}
        transferirChatModalOpen={transferirChatModalOpen}
        toggleTransferirChatModal={toggleTransferirChatModal}
        lista_usuarios={lista_usuarios}
        lista_departamentos={lista_departamentos}
        numeroModalPreset={numeroModalPreset}
        inputRefNumeroTelefono={inputRefNumeroTelefono}
        setMensajesAcumulados={setMensajesAcumulados}
        setSelectedChat={setSelectedChat}
        isTemplateModalOpen={isTemplateModalOpen}
        abrirModalTemplates={abrirModalTemplates}
        cerrarModalTemplates={cerrarModalTemplates}
        loadingTemplates={loadingTemplates}
        templateSearch={templateSearch}
        setTemplateSearch={setTemplateSearch}
        templateResults={templateResults}
      />
    </div>
  );
};

export default Chat;
