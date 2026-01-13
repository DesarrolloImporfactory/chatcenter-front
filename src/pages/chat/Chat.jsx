import React, { useState, useRef, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { addNumberThunk } from "../../store/slices/number.slice";
import { useNavigate } from "react-router-dom";

import { useDispatch } from "react-redux";
import { jwtDecode } from "jwt-decode";
import io from "socket.io-client";

import { format, isToday, isYesterday, isThisWeek } from "date-fns";
import { es } from "date-fns/locale"; // Importa el locale para español

import Cabecera from "../../components/chat/Cabecera";
import { Sidebar } from "../../components/chat/Sidebar";
import ChatPrincipal from "../../components/chat/ChatPrincipal";
import DatosUsuario from "../../components/chat/DatosUsuario";
import Modales from "../../components/chat/Modales";
import Loading from "../../components/chat/Loading";
import ScrollToBottomButton from "../../components/chat/ScrollToBottomButton";
import SwitchBot from "../../components/chat/SwitchBot";

import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";
import { useMemo } from "react";

// Mapeo de conversaciones Messenger -> formato Sidebar
function mapMsConvToSidebar(row) {
  const rawFecha =
    row.last_message_at ??
    row.mensaje_created_at ??
    row.updated_at ??
    row.first_contact_at ??
    null;
  const d =
    rawFecha instanceof Date
      ? rawFecha
      : rawFecha
      ? new Date(rawFecha)
      : new Date();
  const mensaje_created_at = isNaN(+d) ? new Date() : d;

  return {
    id: row.id,
    source: "ms",
    page_id: row.page_id,
    mensaje_created_at: mensaje_created_at.toISOString(),
    texto_mensaje: row.preview ?? row.texto_mensaje ?? "",
    celular_cliente: row.psid ?? row.celular_cliente,
    mensajes_pendientes: (row.unread_count ?? row.mensajes_pendientes) || 0,
    visto: 0,
    nombre_cliente:
      row.customer_name ??
      row.nombre_cliente ??
      (row.psid ? `Facebook • ${String(row.psid).slice(-6)}` : "Facebook"),
    profile_pic_url: row.profile_pic_url || null,
    id_encargado: row.id_encargado ?? null,
    etiquetas: [],
    transporte: null,
    estado_factura: null,
    novedad_info: null,
  };
}

// Mapeo de conversaciones Instagram -> formato Sidebar
function mapIgConvToSidebar(row) {
  const rawFecha =
    row.last_message_at ??
    row.mensaje_created_at ??
    row.updated_at ??
    row.first_contact_at ??
    null;
  const d =
    rawFecha instanceof Date
      ? rawFecha
      : rawFecha
      ? new Date(rawFecha)
      : new Date();
  const mensaje_created_at = isNaN(+d) ? new Date() : d;

  return {
    id: row.id,
    source: "ig",
    page_id: row.page_id,
    mensaje_created_at: mensaje_created_at.toISOString(),
    texto_mensaje: row.preview ?? row.texto_mensaje ?? "",
    celular_cliente: row.igsid ?? row.celular_cliente,
    mensajes_pendientes: (row.unread_count ?? row.mensajes_pendientes) || 0,
    visto: 0,
    nombre_cliente:
      row.customer_name ??
      row.nombre_cliente ??
      (row.igsid ? `Instagram • ${String(row.igsid).slice(-6)}` : "Instagram"),
    profile_pic_url: row.profile_pic_url || null,
    id_encargado: row.id_encargado ?? null,
    etiquetas: [],
    transporte: null,
    estado_factura: null,
    novedad_info: null,
  };
}

// Normaliza un attachment de Messenger/Instagram a tu formato de UI (image|video|audio|document|sticker|location)
function normalizeMetaAttachmentToUI(att, fallbackText = "") {
  const t = (att?.type || att?.kind || "").toLowerCase();
  // IG/MS traen la URL dentro de payload.url muchas veces
  const payload = att?.payload || {};
  const url =
    att?.url || payload?.url || payload?.preview_url || payload?.src || null;

  if (t === "image") {
    return {
      tipo_mensaje: "image",
      ruta_archivo: url || "",
      texto_mensaje: fallbackText || "",
    };
  }

  if (t === "video") {
    return {
      tipo_mensaje: "video",
      ruta_archivo: url || "",
      texto_mensaje: fallbackText || "",
    };
  }

  if (t === "audio") {
    return {
      tipo_mensaje: "audio",
      ruta_archivo: url || "",
      texto_mensaje: fallbackText || "",
    };
  }

  // documentos genéricos (Messenger suele usar "file")
  if (t === "file" || t === "document") {
    return {
      tipo_mensaje: "document",
      ruta_archivo: JSON.stringify({
        ruta: url || "",
        nombre: att?.name || payload?.file_name || "archivo",
        size: att?.size || payload?.size || 0,
        mimeType: att?.mimeType || payload?.mime_type || "",
      }),
      texto_mensaje: fallbackText || "",
    };
  }

  if (t === "sticker") {
    return {
      tipo_mensaje: "sticker",
      ruta_archivo: url || "",
      texto_mensaje: "",
    };
  }

  if (t === "location" && (payload.latitude || payload.lat)) {
    const latitude = payload.latitude ?? payload.lat;
    const longitude =
      payload.longitude ?? payload.lng ?? payload.longitud ?? null;
    return {
      tipo_mensaje: "location",
      texto_mensaje: JSON.stringify({ latitude, longitude }),
      ruta_archivo: null,
    };
  }

  // Fallback seguro → tratar como documento
  return {
    tipo_mensaje: "document",
    ruta_archivo: JSON.stringify({
      ruta: url || "",
      nombre: att?.name || payload?.file_name || "archivo",
      size: att?.size || payload?.size || 0,
      mimeType: att?.mimeType || payload?.mime_type || "",
    }),
    texto_mensaje: fallbackText || "",
  };
}

// Reconciliador para no duplicar mensajes
function upsertMsg(list, raw) {
  const norm = (v) => (v == null ? null : String(v));

  const msg = {
    ...raw,
    id: norm(raw.id ?? raw.message_id ?? raw.mid_mensaje),
    mid: norm(raw.mid ?? raw.mid_mensaje),
    client_tmp_id: norm(raw.client_tmp_id),
  };

  const keep = (v) =>
    v !== null &&
    v !== undefined &&
    !(typeof v === "string" && v.trim() === "");

  const mergePref = (oldMsg, newMsg) => {
    const merged = { ...oldMsg, ...newMsg };

    // ► No pisar con vacío
    merged.responsable = keep(newMsg.responsable)
      ? newMsg.responsable
      : oldMsg.responsable;

    merged.texto_mensaje = keep(newMsg.texto_mensaje)
      ? newMsg.texto_mensaje
      : oldMsg.texto_mensaje;

    merged.tipo_mensaje = keep(newMsg.tipo_mensaje)
      ? newMsg.tipo_mensaje
      : oldMsg.tipo_mensaje;

    // archivos: si viene null/undefined no borres lo que ya tenías
    if (newMsg.ruta_archivo === undefined || newMsg.ruta_archivo === null) {
      merged.ruta_archivo = oldMsg.ruta_archivo;
    }

    // conservar created_at si el nuevo viene vacío
    merged.created_at = keep(newMsg.created_at)
      ? newMsg.created_at
      : oldMsg.created_at;

    // limpia el tmp al consolidar
    merged.client_tmp_id = null;

    return merged;
  };

  // A) por client_tmp_id
  if (msg.client_tmp_id) {
    const i = list.findIndex(
      (x) =>
        norm(x.client_tmp_id) === msg.client_tmp_id ||
        norm(x.id) === msg.client_tmp_id
    );
    if (i !== -1) {
      const copy = [...list];
      copy[i] = mergePref(copy[i], msg);
      return copy;
    }
  }

  // B) por mid
  if (msg.mid) {
    const j = list.findIndex(
      (x) => norm(x.mid) === msg.mid || norm(x.mid_mensaje) === msg.mid
    );
    if (j !== -1) {
      const copy = [...list];
      copy[j] = mergePref(copy[j], msg);
      return copy;
    }
  }

  // C) por id
  if (msg.id) {
    const k = list.findIndex((x) => norm(x.id) === msg.id);
    if (k !== -1) {
      const copy = [...list];
      copy[k] = mergePref(copy[k], msg);
      return copy;
    }
  }

  // D) insertar
  return [...list, msg];
}

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
    []
  ); // Estado para almacenar los resultados de la búsqueda numero Cliente

  const inputRefNumeroTelefono = useRef(null); // Referencia al input de mensaje numero telefono

  const [seleccionado, setSeleccionado] = useState(false); // para la condicion del buscar numero Telefono

  const [templates, setTemplates] = useState([]);

  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState("");

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
  const [activeChannel, setActiveChannel] = useState("whatsapp"); // 'whatsapp' | 'messenger' | 'all'
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
        }
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
            }
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
            }
          );

          if (res.status === 200) {
            setId_usuario_conf(res.data.data.id_usuario);
          } else {
            console.error(
              "Error al obtener el usuario de la plataforma:",
              res.data
            );
          }
        } catch (error) {
          console.error("Error en la consulta:", error);
        }
      };

      fetchData();
    }
  }, []);

  const getChatByPhone = async (phone, id_configuracion) => {
    return chatApi.get(
      `/clientes_chat_center/findFullByPhone_desconect/${encodeURIComponent(
        phone
      )}?id_configuracion=${id_configuracion}`
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

  async function fetchMsConversations() {
    if (!id_configuracion) return;

    // 👉 Marca "cargando" solo hasta el primer batch
    if (!msBootstrappedRef.current) setIsLoadingMS(true);

    const { data } = await chatApi.get("/messenger/conversations", {
      params: { id_configuracion, limit: 50 },
    });
    const items = (data.items || []).map(mapMsConvToSidebar);

    setMensajesAcumulados((prev) => {
      const byKey = new Map(
        prev.map((x) => [`${x.source || "wa"}:${x.id}`, x])
      );
      for (const it of items) {
        byKey.set(`ms:${it.id}`, it);
      }
      return Array.from(byKey.values()).sort(
        (a, b) =>
          new Date(b.mensaje_created_at) - new Date(a.mensaje_created_at)
      );
    });

    try {
      await chatApi.post("/messenger/profiles/refresh-missing", {
        id_configuracion,
        limit: 50,
      });

      const again = await chatApi.get("/messenger/conversations", {
        params: { id_configuracion, limit: 50 },
      });
      const againItems = (again.data.items || []).map(mapMsConvToSidebar);
      setMensajesAcumulados((prev) => {
        const byKey = new Map(
          prev.map((x) => [`${x.source || "wa"}:${x.id}`, x])
        );
        for (const it of againItems) byKey.set(`ms:${it.id}`, it);
        return Array.from(byKey.values()).sort(
          (a, b) =>
            new Date(b.mensaje_created_at) - new Date(a.mensaje_created_at)
        );
      });
    } catch (err) {
      console.warn("Profiles refresh error:", err);
    } finally {
      // 👉 Fin del primer batch de MS
      if (!msBootstrappedRef.current) {
        msBootstrappedRef.current = true;
        setIsLoadingMS(false);
      }
    }
  }

  async function fetchIgConversations() {
    if (!id_configuracion) return;

    // 👉 Marca "cargando" solo hasta el primer batch
    if (!igBootstrappedRef.current) setIsLoadingIG(true);

    const { data } = await chatApi.get("/instagram/conversations", {
      params: { id_configuracion, limit: 50 },
    });
    const items = (data.items || []).map(mapIgConvToSidebar);

    setMensajesAcumulados((prev) => {
      const byKey = new Map(
        prev.map((x) => [`${x.source || "wa"}:${x.id}`, x])
      );
      for (const it of items) byKey.set(`ig:${it.id}`, it);
      return Array.from(byKey.values()).sort(
        (a, b) =>
          new Date(b.mensaje_created_at) - new Date(a.mensaje_created_at)
      );
    });

    // 👉 Fin del primer batch de IG
    if (!igBootstrappedRef.current) {
      igBootstrappedRef.current = true;
      setIsLoadingIG(false);
    }
  }

  useEffect(() => {
    if (isSocketConnected && id_configuracion) {
      fetchMsConversations();
      fetchIgConversations();
    }
  }, [isSocketConnected, id_configuracion]);

  // Mapeo de mensajes Messenger -> formato ChatPrincipal
  function mapMsMessageToUI(m) {
    let out = {
      id: m.id,
      rol_mensaje: m.rol_mensaje, // 1 = out, 0 = in
      texto_mensaje: m.texto_mensaje || m.text || "",
      tipo_mensaje: m.tipo_mensaje || "text",
      ruta_archivo: m.ruta_archivo || null,
      mid_mensaje: m.mid_mensaje || m.mid || null,
      visto: m.visto || 0,
      created_at: m.created_at,
      responsable:
        m.rol_mensaje === 1 ? m.responsable || nombre_encargado_global : "",
    };

    // Si hay attachments crudos en el objeto del REST, normaliza el PRIMERO
    const rawAtts = Array.isArray(m.attachments) ? m.attachments : null;
    const isAttachmentFlag = m.tipo_mensaje === "attachment";

    if (isAttachmentFlag || (rawAtts && rawAtts.length > 0)) {
      const norm = normalizeMetaAttachmentToUI(
        rawAtts ? rawAtts[0] : {},
        out.texto_mensaje
      );
      out = { ...out, ...norm };
    }

    // HOTFIX: si quedó como image/video/audio y ruta_archivo vacío, intenta rescatar payload.url
    if (
      (out.tipo_mensaje === "image" ||
        out.tipo_mensaje === "video" ||
        out.tipo_mensaje === "audio") &&
      !out.ruta_archivo
    ) {
      const a0 = rawAtts?.[0];
      const rescue =
        a0?.payload?.url || a0?.payload?.preview_url || a0?.url || null;
      if (rescue) out.ruta_archivo = rescue;
    }

    return out;
  }

  // Mapeo de mensajes Instagram -> formato ChatPrincipal (incluye attachments si vienen por REST)
  function mapIgMessageToUI(m) {
    let out = {
      id: m.id,
      rol_mensaje: m.rol_mensaje, // 1 = out, 0 = in
      texto_mensaje: m.texto_mensaje || m.text || "",
      tipo_mensaje: m.tipo_mensaje || "text",
      ruta_archivo: m.ruta_archivo || null,
      mid_mensaje: m.mid_mensaje || m.mid || null,
      visto: m.visto || 0,
      created_at: m.created_at,
      responsable:
        m.rol_mensaje === 1 ? m.responsable || nombre_encargado_global : "",
    };

    const rawAtts = Array.isArray(m.attachments) ? m.attachments : null;
    const isAttachmentFlag = m.tipo_mensaje === "attachment";

    if (isAttachmentFlag || (rawAtts && rawAtts.length > 0)) {
      const norm = normalizeMetaAttachmentToUI(
        rawAtts ? rawAtts[0] : {},
        out.texto_mensaje
      );
      out = { ...out, ...norm };
    }

    if (
      (out.tipo_mensaje === "image" ||
        out.tipo_mensaje === "video" ||
        out.tipo_mensaje === "audio") &&
      !out.ruta_archivo
    ) {
      const a0 = rawAtts?.[0];
      const rescue =
        a0?.payload?.url || a0?.payload?.preview_url || a0?.url || null;
      if (rescue) out.ruta_archivo = rescue;
    }

    return out;
  }

  async function openMessengerConversation(conv) {
    setActiveChannel("messenger");
    setMsActiveConversationId(conv.id);
    setSelectedChat(conv); // Para que la UI derecha se actualice
    setMensajesMostrados(20);
    setScrollOffset(0);
    setMensaje("");

    // Únete al room para tiempo real
    socketRef.current.emit("MS_JOIN_CONV", {
      conversation_id: conv.id,
      id_configuracion,
    });

    // Carga historial por REST
    const { data } = await chatApi.get(
      `/messenger/conversations/${conv.id}/messages`,
      { params: { limit: 50 } } // sin before_id => últimos
    );
    const ordered = (data.items || []).map(mapMsMessageToUI); // ya viene ASC
    setChatMessages([{ id: conv.id, mensajes: ordered }]);
    setMensajesOrdenados(ordered);
    const initial = Math.min(20, ordered.length);
    setMensajesMostrados(initial);
    setMsNextBeforeId(data.next_before_id ?? null);
    scrollToBottomNow();
  }

  async function openInstagramConversation(conv) {
    setActiveChannel("instagram");
    setSelectedChat(conv);
    setMsActiveConversationId(null);
    setMensaje("");
    setMensajesMostrados(20);
    setScrollOffset(0);

    // únete al room IG
    actions.ig.joinConv(conv.id);

    // marca como leído (se envía IG_MARK_SEEN a tu backend)
    actions.ig.markSeen(conv.id);

    // Carga historial por REST
    const { data } = await chatApi.get(
      `/instagram/conversations/${conv.id}/messages`,
      {
        params: { limit: 50 },
      }
    );

    // backend ya entrega mapeado; si no, mapea:
    const ordered = (data.items || []).map(mapIgMessageToUI); // ASC
    setChatMessages([{ id: conv.id, mensajes: ordered }]);
    setMensajesOrdenados(ordered);
    setMensajesMostrados(Math.min(20, ordered.length));
    setMsNextBeforeId(data.next_before_id ?? null); // puedes usar mismo cursor var
    scrollToBottomNow();
  }

  /* 2️⃣  cuando ya hay chats */
  useEffect(() => {
    if (!pendingOpen || !id_configuracion) return;

    const { phone, name } = pendingOpen;

    // 2.1  ¿Ya está en los chats cargados?
    const existente = mensajesAcumulados.find(
      (c) => String(c.celular_cliente) === String(phone)
    );

    if (existente) {
      handleSelectChat(existente);
      setPendingOpen(null);
      return;
    }

    // 2.2  Búsqueda directa en BD (NO crea chat)
    (async () => {
      try {
        const { data } = await getChatByPhone(phone, id_configuracion);
        // 200 => lo encontró
        setMensajesAcumulados((prev) => [data.data, ...prev]);
        handleSelectChat(data.data);
      } catch (err) {
        if (err.response?.status === 404) {
          // 404 => no existe conversación. Decide qué hacer:
          // mostrar alerta, crearla manualmente, etc.
          Swal.fire(
            "Sin conversación",
            "Ese número aún no tiene historial de chat.",
            "info"
          );
        } else {
          console.error(err);
        }
      } finally {
        setPendingOpen(null);
      }
    })();
  }, [pendingOpen, id_configuracion]);

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
        }
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

  /* fin abrir modal crear etiquetas */

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
        }
      );

      const data = response.data;

      if (data.status !== "200") {
        throw new Error(
          data.message || "Error al obtener las etiquetas asignadas"
        );
      }

      setTagListAsginadas(data.etiquetasAsignadas); // <- nombre correcto desde tu backend
    } catch (error) {
      console.error("Error fetching etiquetas asignadas:", error);
    }
  };
  /* fin abrir modal asignar etiquetas */

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
      const decoded = jwtDecode(token);
      const usuario = decoded.id_usuario;

      const res = await chatApi.post(
        "departamentos_chat_center/listarDepartamentos",
        {
          id_usuario: usuario,
        }
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
    language_code
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
          template_name: template_name,
          language_code: language_code,
        }
      );

      let respuesta = response.data;

      const fechaMySQL = new Date()
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");

      if (respuesta.status != 200) {
        console.log("Error en la respuesta del servidor: " + respuesta);
      } else {
        /* Mensajes seccion izquierda */
        setMensajesAcumulados((prevChats) => {
          const actualizado = prevChats.map((chat) => ({ ...chat }));

          const idChat = id_recibe;

          const index = actualizado.findIndex((chat) => {
            console.log(String(chat.id) === String(idChat));
            return String(chat.id) === String(idChat);
          });

          if (index !== -1) {
            actualizado[index].mensaje_created_at = fechaMySQL;
            actualizado[index].texto_mensaje = texto_mensaje;
            actualizado[index].mensajes_pendientes =
              (actualizado[index].mensajes_pendientes || 0) + 1;
            actualizado[index].visto = 0;

            const [actualizadoChat] = actualizado.splice(index, 1);
            actualizado.unshift(actualizadoChat);
          } else {
            // Si no está, crear uno nuevo con id = celular_recibe
            const nuevoChat = {
              id: idChat,
              mensaje_created_at: fechaMySQL,
              texto_mensaje: texto_mensaje,
              celular_cliente: telefono_recibe,
              mensajes_pendientes: 1,
              visto: 0,
              nombre_cliente: "",
              etiquetas: [
                {
                  id: null,
                  nombre: null,
                  color: null,
                },
              ],
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
          }

          return actualizado;
        });
        /* Mensajes seccion izquierda */

        /* Mensajes seccion derecha */
        setMensajesOrdenados((prevMensajes) => {
          const actualizado = prevMensajes.map((mensaje) => ({ ...mensaje }));

          const nuevoMensaje = {
            celular_recibe: id_recibe,
            created_at: fechaMySQL,
            id: `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            mid_mensaje: mid_mensaje,
            rol_mensaje: 1,
            ruta_archivo: ruta_archivo,
            texto_mensaje: texto_mensaje,
            tipo_mensaje: tipo_mensaje,
            visto: 1,
            responsable: nombre_encargado_global,
          };

          actualizado.push(nuevoMensaje);

          return actualizado;
        });
        /* Mensajes seccion derecha */
      }
    } catch (error) {
      console.error("Error al guardar el mensaje:", error);
      alert("Ocurrió un error al guardar el mensaje. Inténtalo de nuevo.");
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
  const handleSelectPhoneNumber = async (phoneNumber) => {
    setSelectedPhoneNumber(phoneNumber); // Actualiza el número seleccionado
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
        }
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
        cursorPos + emoji.emoji.length
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
    if (!text || !selectedChat) return;

    if (selectedChat.source === "ms") {
      const tempId =
        "tmp-" + Date.now() + "-" + Math.random().toString(16).slice(2);

      const optimistic = {
        id: tempId,
        rol_mensaje: 1,
        texto_mensaje: text,
        tipo_mensaje: "text",
        created_at: new Date().toISOString(),
        visto: 0,
        responsable: nombre_encargado_global,
      };
      setMensajesOrdenados((prev) => [...prev, optimistic]);

      const diffHrs =
        (Date.now() - new Date(selectedChat.mensaje_created_at).getTime()) /
        36e5;

      const payload = {
        conversation_id: selectedChat.id,
        text,
        ...(diffHrs > 24
          ? { messaging_type: "MESSAGE_TAG", tag: "HUMAN_AGENT" }
          : {}),
        agent_id: id_sub_usuario_global,
        agent_name: nombre_encargado_global,
        client_tmp_id: tempId,
      };

      socketRef.current.emit("MS_SEND", payload);

      setMensaje("");
      setFile(null);
      return;
    }

    if (selectedChat.source === "ig") {
      const tempId =
        "tmp-" + Date.now() + "-" + Math.random().toString(16).slice(2);

      const optimistic = {
        id: tempId,
        client_tmp_id: tempId,
        rol_mensaje: 1,
        texto_mensaje: (mensaje || "").trim(),
        tipo_mensaje: "text",
        created_at: new Date().toISOString(),
        visto: 0,
        responsable: nombre_encargado_global,
      };
      setMensajesOrdenados((prev) => [...prev, optimistic]);

      const diffHrs =
        (Date.now() - new Date(selectedChat.mensaje_created_at).getTime()) /
        36e5;

      socketRef.current.emit("IG_SEND", {
        conversation_id: selectedChat.id,
        text: (mensaje || "").trim(),
        ...(diffHrs > 24
          ? { messaging_type: "MESSAGE_TAG", tag: "HUMAN_AGENT" }
          : {}),
        agent_id: id_sub_usuario_global,
        agent_name: nombre_encargado_global,
        client_tmp_id: tempId,
      });

      setMensaje("");
      setFile(null);
      return;
    }

    // (lo tuyo actual para WhatsApp)
    console.log("Mensaje enviado:", mensaje, file);
    setMensaje("");
    setFile(null);

    const safeName = (nombre_encargado_global || "").replace(/[*_~`]/g, ""); // quita caracteres de formato

    const encabezadoWS = `*${safeName}* 🎤:\n${text}`;

    socketRef.current.emit("SEND_MESSAGE", {
      mensaje: encabezadoWS,
      tipo_mensaje: file ? "document" : "text",
      to: selectedChat.celular_cliente,
      id_configuracion: id_configuracion,
      file,
      dataAdmin,
      nombre_encargado: nombre_encargado_global,
    });
  };

  // Enviar adjunto a Messenger vía socket
  function onSendMsAttachment({
    kind,
    url,
    name,
    mimeType,
    size,
    clientTmpId,
  }) {
    if (!selectedChat || selectedChat.source !== "ms") return;
    const conversationId = selectedChat.id;

    // ¿Han pasado más de 24h desde el último entrante?
    const refISO = selectedChat.mensaje_created_at;
    const diffHrs = refISO
      ? (Date.now() - new Date(refISO).getTime()) / 36e5
      : 0;

    // Mapear al tipo que acepta la API de Messenger
    // Messenger acepta: image | video | audio | file
    const msType =
      kind === "image"
        ? "image"
        : kind === "video"
        ? "video"
        : kind === "audio"
        ? "audio"
        : "file"; // documentos

    socketRef.current.emit("MS_SEND", {
      conversation_id: conversationId,
      attachment: {
        type: msType,
        url,
        name,
        mimeType,
        size,
      },
      ...(diffHrs > 24
        ? { messaging_type: "MESSAGE_TAG", tag: "HUMAN_AGENT" }
        : {}),
      agent_id: id_sub_usuario_global,
      agent_name: nombre_encargado_global,
      client_tmp_id: clientTmpId,
    });
  }

  function onSendIgAttachment({
    kind,
    url,
    name,
    mimeType,
    size,
    clientTmpId,
  }) {
    if (!selectedChat || selectedChat.source !== "ig") return;
    const conversationId = selectedChat.id;

    const refISO = selectedChat.mensaje_created_at;
    const diffHrs = refISO
      ? (Date.now() - new Date(refISO).getTime()) / 36e5
      : 0;

    // Graph IG usa los mismos types: image | video | file (audio también soporta 'audio')
    const type =
      kind === "image"
        ? "image"
        : kind === "video"
        ? "video"
        : kind === "audio"
        ? "audio"
        : "file";

    socketRef.current.emit("IG_SEND", {
      conversation_id: conversationId,
      attachment: { kind, url, name, mimeType, size }, // el gateway mapea kind->type
      ...(diffHrs > 24
        ? { messaging_type: "MESSAGE_TAG", tag: "HUMAN_AGENT" }
        : {}),
      agent_id: id_sub_usuario_global,
      agent_name: nombre_encargado_global,
      client_tmp_id: clientTmpId,
    });
  }

  const uploadAudio = (audioBlob) => {
    // Primero, enviamos el archivo para su conversión
    const formData = new FormData();
    formData.append("audio", audioBlob, "audio.ogg");

    // Verificar contenido del FormData
    console.log("audioBlob:", audioBlob);
    for (let pair of formData.entries()) {
      console.log("FormData contenido:", pair[0], pair[1]);
    }

    chatApi
      .post("whatsapp/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      .then((response) => {
        console.log("Respuesta completa del servidor:", response.data);
        const base64Audio = response.data.file;
        console.log("base64Audio: ");
        console.log(base64Audio);

        // Convertir el audio base64 a un Blob
        const byteCharacters = atob(base64Audio);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blobNew = new Blob([byteArray], { type: "audio/ogg" });

        console.log("blobNew: " + blobNew);

        // Crear un nuevo FormData para la segunda solicitud
        const formData2 = new FormData();
        formData2.append("audio", blobNew, "audio.ogg");

        // Enviar el audio convertido a WhatsApp usando chatApi.post
        return chatApi
          .post("whatsapp/guardar_audio", formData2, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          })
          .then(async (response) => {
            console.log("Respuesta guardar_audio completa:", response.data);

            if (response.status === 200) {
              const fileUrl =
                response.data.fileUrl ||
                response.data.data?.fileUrl ||
                response.data.url;
              console.log("Audio guardado en el servidor:", fileUrl);

              if (fileUrl) {
                await enviarAudioWhatsApp(fileUrl); // Enviar el audio a WhatsApp
                return response.data; // Retorna la URL del audio subido
              } else {
                console.error(
                  "No se recibió fileUrl en la respuesta:",
                  response.data
                );
                throw new Error("No se recibió la URL del archivo");
              }
            } else {
              console.error(
                "Error al subir el audio a WhatsApp:",
                response.data.message
              );
              throw new Error(response.data.message);
            }
          })
          .catch((error) => {
            console.error("Error en la solicitud a WhatsApp:", error);
            console.error("Detalles del error:", error.response?.data);
          });
      })
      .catch((error) => {
        console.error("Error en la solicitud de conversión de audio:", error);
        console.error("Detalles del error:", error.response?.data);
      });
  };

  // Función para enviar el audio a WhatsApp
  const enviarAudioWhatsApp = async (audioUrl) => {
    console.log("Estableciendo conexión con WhatsApp...");
    const fromPhoneNumberId = dataAdmin.id_telefono; // ID de WhatsApp
    const accessToken = dataAdmin.token; // Token de acceso
    const numeroDestino = selectedChat.celular_cliente; // Número de destino
    const apiUrl = `https://graph.facebook.com/v21.0/${fromPhoneNumberId}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: numeroDestino,
      type: "audio",
      audio: {
        link: "https://new.imporsuitpro.com/" + audioUrl, // URL completa del audio en el servidor
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
        console.error("Error al enviar el audio a WhatsApp:", result.error);
        alert(`Error: ${result.error.message}`);
        return;
      }

      console.log("Audio enviado con éxito a WhatsApp:", result);

      // Extraer el wamid del audio enviado
      const wamid = result?.messages?.[0]?.id || null;

      let id_recibe = selectedChat.id;
      let mid_mensaje = dataAdmin.id_telefono;
      let telefono_configuracion = dataAdmin.telefono;
      agregar_mensaje_enviado(
        "Archivo guardado en: " + audioUrl,
        "audio",
        audioUrl,
        numeroDestino,
        mid_mensaje,
        id_recibe,
        id_configuracion,
        telefono_configuracion,
        wamid,
        "",
        ""
      );
    } catch (error) {
      console.error("Error en la solicitud de WhatsApp:", error);
      alert("Ocurrió un error al enviar el audio. Inténtalo más tarde.");
    }
  };

  // Función que maneja la subida y el envío del audio
  const handleSendAudio = async (blob) => {
    if (blob) {
      // Validación de tipo MIME
      const isOggMime = blob.type.includes("audio/ogg");

      // Validación de extensión (si tienes un nombre de archivo)
      const isCorrectExtension = blob.name ? blob.name.endsWith(".ogg") : true;

      if (!isOggMime || !isCorrectExtension) {
        alert("El archivo de audio debe ser en formato .ogg");
        return;
      }

      console.log(
        "El archivo es un .ogg válido basado en el tipo MIME y extensión."
      );

      try {
        // Subir el audio y obtener la URL
        let urlAudio = await uploadAudio(blob);
        // Enviar el audio a WhatsApp
        /*         if (urlAudio) {
          await enviarAudioWhatsApp(urlAudio);
        }
 */
        setAudioBlob(null); // Limpia el estado del blob de audio después de enviar
      } catch (error) {
        console.error("Error en el proceso de envío de audio:", error);
      }
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
          Math.min(prev + 20, mensajesOrdenados.length)
        );
        return;
      }

      // 2) pedir más al backend (paginación hacia atrás)
      if (!msIsLoadingOlder || !msNextBeforeId) {
        if (!msNextBeforeId) return; // no hay más
      } else {
        return; // ya está cargando
      }

      try {
        setMsIsLoadingOlder(true);
        setScrollOffset(chatContainer.scrollHeight);

        const convId = msActiveConversationId || selectedChat?.id;
        if (!convId) return;

        // endpoint y mapeo según canal
        const isMs = selectedChat?.source === "ms";
        const isIg = selectedChat?.source === "ig";

        let url, mapFn;
        if (isMs) {
          url = `/messenger/conversations/${convId}/messages`;
          mapFn = mapMsMessageToUI;
        } else if (isIg) {
          url = `/instagram/conversations/${convId}/messages`;
          mapFn = mapIgMessageToUI;
        } else {
          return; // solo paginamos MS/IG aquí
        }

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

    if (chat.source === "ms") {
      openMessengerConversation(chat);
      return;
    }

    if (chat.source === "ig") {
      openInstagramConversation(chat);
      return;
    }

    // — WhatsApp (lo que ya tenías) —
    setSelectedChat(chat);
    setActiveChannel("whatsapp");

    // pedir facturas/guías apenas seleccionas un chat de WhatsApp
    if (
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
    [etiquetas_api]
  );

  /* validador encargado selectedChat */

  const asignarChat = async () => {
    try {
      const payload =
        selectedChat.source === "ms"
          ? {
              source: "ms",
              id_encargado: id_sub_usuario_global,
              id_conversation: selectedChat.id,
            }
          : selectedChat.source === "ig"
          ? {
              source: "ig",
              id_encargado: id_sub_usuario_global,
              id_conversation: selectedChat.id,
            }
          : {
              source: "wa",
              id_encargado: id_sub_usuario_global,
              id_cliente_chat_center: selectedChat.id,
              id_configuracion: selectedChat.id_configuracion,
            };

      const res = await chatApi.post(
        "departamentos_chat_center/asignar_encargado",
        payload
      );

      if (res.data.status === "success") {
        Toast.fire({ icon: "success", title: res.data.message });
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
          title: "Ocurrió un problema al transferir el chat.",
        });
      }
    } catch (error) {
      const message =
        error.response?.data?.message ||
        "Error inesperado al transferir el chat.";
      Toast.fire({ icon: "error", title: message });
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

    // 🔵 MESSENGER
    if (selectedChat.source === "ms") {
      if (!needsAssign(selectedChat.id_encargado)) return;

      (async () => {
        try {
          const { data } = await chatApi.get("/messenger/conversations", {
            params: { id_configuracion, limit: 1, id: selectedChat.id },
          });
          const owner =
            data?.item?.id_encargado ??
            data?.id_encargado ??
            data?.encargado_id ??
            null;

          setSelectedChat((prev) => ({ ...prev, id_encargado: owner }));
          if (needsAssign(owner)) showAsignarChatDialog();
        } catch {
          showAsignarChatDialog();
        }
      })();

      return;
    }

    // 🟣 INSTAGRAM
    if (selectedChat.source === "ig") {
      if (!needsAssign(selectedChat.id_encargado)) return;

      showAsignarChatDialog();
      return;
    }

    // 🟢 WHATSAPP
    if (needsAssign(selectedChat.id_encargado)) {
      showAsignarChatDialog();
    }
  }, [selectedChat?.id, selectedChat?.source]);

  /* validador encargado selectedChat */

  useEffect(() => {
    const eliminarDuplicadosPorId = (array) =>
      array.filter(
        (item, index, self) => index === self.findIndex((t) => t.id === item.id)
      );

    const sinDuplicados = eliminarDuplicadosPorId(mensajesAcumulados);
    setFilteredChats(sinDuplicados); // Actualizamos filteredChats con mensajesAcumulados
  }, [mensajesAcumulados]);

  /* fin filtro */

  const socketRef = useRef(null);
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
          }
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

  useEffect(() => {
    if (isSocketConnected && userData) {
      console.time("⏱ Tiempo hasta llegada de CHATS");

      // 👉 WhatsApp: si aún no hicimos el bootstrap, estamos cargando
      if (!waBootstrappedRef.current) setIsLoadingWA(true);

      // Limpiar listeners existentes antes de registrar nuevos
      socketRef.current.off("RECEIVED_MESSAGE");
      socketRef.current.off("DATA_FACTURA_RESPONSE");
      socketRef.current.off("DATA_NOVEDADES");

      // Emitir el evento con los filtros y la paginación
      socketRef.current.emit(
        "GET_CHATS",
        id_configuracion,
        id_sub_usuario_global,
        rol_usuario_global,
        {
          cursorFecha: null,
          cursorId: null,
          filtros: {
            searchTerm,
            selectedEtiquetas,
            selectedEstado,
            selectedTransportadora,
            selectedNovedad,
            selectedTab,
            selectedPedidos_confirmados,
          },
          scopeChats,
        }
      );

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

      socketRef.current.on("RECEIVED_MESSAGE", (data) => {
        /* console.log("XD:", JSON.stringify(data)); */

        if (id_configuracion == data.id_configuracion) {
          setMensajesAcumulados((prevChats) => {
            const actualizado = prevChats.map((chat) => ({ ...chat }));

            const idChat = data.celular_recibe;

            const index = actualizado.findIndex((chat) => {
              console.log(String(chat.id) === String(idChat));
              return String(chat.id) === String(idChat);
            });

            if (index !== -1) {
              actualizado[index].mensaje_created_at =
                data.ultimoMensaje.created_at;
              actualizado[index].texto_mensaje =
                data.ultimoMensaje.texto_mensaje;
              actualizado[index].mensajes_pendientes =
                (actualizado[index].mensajes_pendientes || 0) + 1;
              actualizado[index].visto = 0;

              const [actualizadoChat] = actualizado.splice(index, 1);
              actualizado.unshift(actualizadoChat);
            } else {
              // Si no está, crear uno nuevo con id = celular_recibe
              const nuevoChat = {
                id: idChat,
                mensaje_created_at: data.ultimoMensaje.created_at,
                texto_mensaje: data.ultimoMensaje.texto_mensaje,
                celular_cliente:
                  data.ultimoMensaje.clientePorCelular?.celular_cliente,
                mensajes_pendientes: 1,
                visto: 0,
                nombre_cliente:
                  data.ultimoMensaje.clientePorCelular?.nombre_cliente,
                id_encargado:
                  data.ultimoMensaje.clientePorCelular?.id_encargado,
                etiquetas: [
                  {
                    id: null,
                    nombre: null,
                    color: null,
                  },
                ],
                transporte: null,
                estado_factura: null,
                novedad_info: {
                  id_novedad: null,
                  novedad: null,
                  solucionada: null,
                  terminado: null,
                },
              };

              /* console.log("nuevoChat: " + JSON.stringify(nuevoChat, null, 2)); */

              if (
                data.ultimoMensaje.clientePorCelular?.id_encargado ==
                  id_sub_usuario_global ||
                rol_usuario_global == "administrador"
              ) {
                actualizado.unshift(nuevoChat);
              }
            }

            return actualizado;
          });

          // Si el cursor era null, se debe actualizar
          if (!cursorFecha || !cursorId) {
            setCursorFecha(data.ultimoMensaje.created_at);
            setCursorId(data.ultimoMensaje.id);
          }

          /* carga de la derecha */
          if (
            selectedChat &&
            String(selectedChat.id) === String(data.celular_recibe)
          ) {
            console.log("entro en la consola");

            socketRef.current.emit("GET_CHATS_BOX", {
              chatId: selectedChat.id,
              id_configuracion: id_configuracion,
            });

            socketRef.current.once("CHATS_BOX_RESPONSE", (data) => {
              console.log(
                "Mensajes actualizados tras recibir un nuevo mensaje:",
                data
              );
              setChatMessages(data);

              setMensajesAcumulados((prev) =>
                prev.map((chat) =>
                  chat.id === selectedChat.id
                    ? { ...chat, mensajes_pendientes: 0 }
                    : chat
                )
              );

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
            });
          }
        }
      });

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
    }
  }, [isSocketConnected, userData, selectedChat]);

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
          socketRef.current.emit(
            "GET_CHATS",
            id_configuracion,
            id_sub_usuario_global,
            rol_usuario_global,
            {
              limit: 10,
              cursorFecha,
              cursorId,
              filtros: {
                searchTerm,
                selectedEtiquetas,
                selectedEstado,
                selectedTransportadora,
                selectedNovedad,
                selectedTab,
                selectedPedidos_confirmados,
              },
              scopeChats,
            }
          );

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
          });
        }
      }
    };

    cargarChats();
  }, [mensajesVisibles]);

  useEffect(() => {
    const cargarChatsFiltros = async () => {
      setMensajesAcumulados([]);
      setMensajesVisibles(10);
      setCursorFecha(null);
      setCursorId(null);
      if (selectedTab == "resueltos") {
        setScopeChats("mine");
      }

      if (socketRef.current && isSocketConnected) {
        socketRef.current.emit(
          "GET_CHATS",
          id_configuracion,
          id_sub_usuario_global,
          rol_usuario_global,
          {
            limit: 10,
            cursorFecha: null,
            cursorId: null,
            filtros: {
              searchTerm,
              selectedEtiquetas,
              selectedEstado,
              selectedTransportadora,
              selectedNovedad,
              selectedTab,
              selectedPedidos_confirmados,
            },
            scopeChats,
          }
        );

        socketRef.current.once("CHATS", (data) => {
          if (data.length > 0) {
            setMensajesAcumulados(data);

            const ultimo = data[data.length - 1];
            setCursorFecha(ultimo.mensaje_created_at);
            setCursorId(ultimo.id);
          }
        });
      }
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
      socketRef.current.emit(
        "GET_CHATS",
        id_configuracion,
        id_sub_usuario_global,
        rol_usuario_global,
        {
          limit: 10,
          cursorFecha: null, // Cargar desde el más reciente
          cursorId: null,
          filtros: {
            searchTerm,
            selectedEtiquetas,
            selectedEstado,
            selectedTransportadora,
            selectedNovedad,
            selectedTab,
            selectedPedidos_confirmados,
          },
          scopeChats,
        }
      );

      socketRef.current.once("CHATS", (data) => {
        if (data.length > 0) {
          setMensajesAcumulados((prevChats) => {
            // Eliminar duplicados del nuevo data
            const nuevosIds = new Set(data.map((chat) => chat.id));

            // Filtrar chats viejos que no están siendo actualizados
            const filtrados = prevChats.filter(
              (chat) => !nuevosIds.has(chat.id)
            );

            // Unir chats filtrados con los nuevos
            const actualizados = [...filtrados, ...data];

            // Ordenar por mensaje_created_at descendente
            actualizados.sort(
              (a, b) =>
                new Date(b.mensaje_created_at) - new Date(a.mensaje_created_at)
            );

            return actualizados;
          });

          const ultimo = data[data.length - 1];
          setCursorFecha(ultimo.mensaje_created_at);
          setCursorId(ultimo.id);
        }
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
            data
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
              : chat
          )
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

    // ⚠️ Si es Messenger, NO usar GET_CHATS_BOX ni su listener
    if (selectedChat.source === "ms") {
      if (id_plataforma_conf !== null) {
        socketRef.current.emit("GET_FACTURAS", {
          id_plataforma: id_plataforma_conf,
          telefono: selectedChat.celular_cliente,
        });
      }
      return; // <- clave: no registres CHATS_BOX_RESPONSE aquí
    }

    // ⚠️ Si es Instagram, NO usar GET_CHATS_BOX ni su listener
    if (selectedChat.source === "ig") {
      if (id_plataforma_conf !== null) {
        socketRef.current.emit("GET_FACTURAS", {
          id_plataforma: id_plataforma_conf,
          telefono: selectedChat.celular_cliente,
        });
      }
      return;
    }

    // WhatsApp / otros canales
    socketRef.current.emit("GET_CHATS_BOX", {
      chatId: selectedChat.id,
      id_configuracion,
    });

    const handleChatBoxResponse = (data) => {
      console.log("Mensajes recibidos:", data);
      setChatMessages(data);
      const orderedMessages = getOrderedChats();
      setMensajesOrdenados(orderedMessages.slice(-20));
      setMensajesMostrados(20);
    };

    socketRef.current.on("CHATS_BOX_RESPONSE", handleChatBoxResponse);
    setMensajesAcumulados((prev) =>
      prev.map((chat) =>
        chat.id === selectedChat.id ? { ...chat, mensajes_pendientes: 0 } : chat
      )
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

  useEffect(() => {
    if (isSocketConnected && selectedChat) {
      // Escuchar el evento UPDATE_CHAT
      const handleUpdateChat = (data) => {
        const { chatId, message } = data;
        if (selectedChat && chatId === selectedChat.celular_cliente) {
          setMensajesOrdenados((prevMessages) => {
            const updatedMessages = [...prevMessages, message.mensajeNuevo];
            return updatedMessages.slice(-mensajesMostrados); // Mantén solo los últimos mostrados
          });

          setTimeout(() => {
            if (chatContainerRef.current) {
              chatContainerRef.current.scrollTop =
                chatContainerRef.current.scrollHeight;
            }
          }, 200);
        }
      };

      // Añadir el listener
      socketRef.current.on("UPDATE_CHAT", handleUpdateChat);

      // Cleanup: remover el listener cuando `selectedChat` cambie
      return () => {
        socketRef.current.off("UPDATE_CHAT", handleUpdateChat);
      };
    }
  }, [isSocketConnected, selectedChat, mensajesMostrados]);

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
      guia.estado_guia_sistema // El estado numérico
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
        `/chat_service/ciudadProvincia/${id_ciudad}`
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

  // Escuchar eventos de Messenger/Instagram cuando el socket esté listo
  useEffect(() => {
    if (!isSocketConnected || !socketRef.current) return;

    // --- MS: MESSAGE ---
    const onMsMessage = ({ conversation_id, message }) => {
      let mapped = {
        id: message.id,
        rol_mensaje: message.direction === "out" ? 1 : 0,
        texto_mensaje: message.text || "",
        tipo_mensaje: "text",
        ruta_archivo: null,
        mid: message.mid || null,
        visto: message.status === "read" ? 1 : 0,
        created_at: message.created_at || new Date().toISOString(),
        responsable: message.direction === "out" ? message.agent_name : "",
        client_tmp_id: message.client_tmp_id || null,
      };

      if (
        Array.isArray(message.attachments) &&
        message.attachments.length > 0
      ) {
        const norm = normalizeMetaAttachmentToUI(
          message.attachments[0],
          message.text || ""
        );
        mapped = { ...mapped, ...norm };

        // rescate por si el helper no encontró url
        if (
          (mapped.tipo_mensaje === "image" ||
            mapped.tipo_mensaje === "video" ||
            mapped.tipo_mensaje === "audio") &&
          !mapped.ruta_archivo
        ) {
          const a0 = message.attachments[0];
          mapped.ruta_archivo =
            a0?.payload?.url || a0?.payload?.preview_url || a0?.url || null;
        }
      }

      if (
        selectedChat?.source === "ms" &&
        Number(selectedChat.id) === Number(conversation_id)
      ) {
        setMensajesOrdenados((prev) => upsertMsg(prev, mapped));
        requestAnimationFrame(() => {
          const el = chatContainerRef.current;
          if (el) el.scrollTop = el.scrollHeight;
        });
      }

      setMensajesAcumulados((prev) => {
        const out = [...prev];
        const idx = out.findIndex(
          (x) => x.source === "ms" && Number(x.id) === Number(conversation_id)
        );
        if (idx !== -1) {
          const row = out[idx];
          const next = {
            ...row,
            texto_mensaje: message.text || row.texto_mensaje,
            mensaje_created_at: mapped.created_at,
            mensajes_pendientes:
              (row.mensajes_pendientes || 0) +
              (message.direction === "in" ? 1 : 0),
          };
          out.splice(idx, 1);
          out.unshift(next);
        }
        return out;
      });
    };

    // --- MS: CONV_UPSERT ---
    const onMsConvUpsert = (upd) => {
      setMensajesAcumulados((prev) => {
        const out = [...prev];
        const idx = out.findIndex(
          (x) => x.source === "ms" && Number(x.id) === Number(upd.id)
        );
        if (idx !== -1) {
          out[idx] = {
            ...out[idx],
            mensaje_created_at: upd.last_message_at,
            texto_mensaje: upd.preview ?? out[idx].texto_mensaje,
            mensajes_pendientes:
              upd.unread_count ?? out[idx].mensajes_pendientes,
          };
        } else {
          out.unshift({
            id: upd.id,
            source: "ms",
            page_id: upd.page_id,
            mensaje_created_at: upd.last_message_at,
            texto_mensaje: upd.preview ?? "",
            celular_cliente: upd.psid,
            mensajes_pendientes: upd.unread_count ?? 0,
            visto: 0,
            nombre_cliente: upd.customer_name ?? "Facebook",
            profile_pic_url: upd.profile_pic_url ?? null,
            id_encargado: upd.id_encargado ?? null,
            etiquetas: [],
            transporte: null,
            estado_factura: null,
            novedad_info: null,
          });
        }
        out.sort(
          (a, b) =>
            new Date(b.mensaje_created_at) - new Date(a.mensaje_created_at)
        );
        return out;
      });
    };

    // --- IG: MESSAGE ---
    const onIgMessage = ({ conversation_id, message }) => {
      let mapped = {
        id: message.id,
        rol_mensaje: message.direction === "out" ? 1 : 0,
        texto_mensaje: message.text || "",
        tipo_mensaje: "text",
        ruta_archivo: null,
        mid: message.mid || null,
        visto: message.status === "read" ? 1 : 0,
        created_at: message.created_at || new Date().toISOString(),
        responsable: message.direction === "out" ? message.agent_name : "",
        client_tmp_id: message.client_tmp_id || null,
      };

      if (
        Array.isArray(message.attachments) &&
        message.attachments.length > 0
      ) {
        const norm = normalizeMetaAttachmentToUI(
          message.attachments[0],
          message.text || ""
        );
        mapped = { ...mapped, ...norm };

        if (
          (mapped.tipo_mensaje === "image" ||
            mapped.tipo_mensaje === "video" ||
            mapped.tipo_mensaje === "audio") &&
          !mapped.ruta_archivo
        ) {
          const a0 = message.attachments[0];
          mapped.ruta_archivo =
            a0?.payload?.url || a0?.payload?.preview_url || a0?.url || null;
        }
      }

      if (
        selectedChat?.source === "ig" &&
        Number(selectedChat.id) === Number(conversation_id)
      ) {
        setMensajesOrdenados((prev) => {
          const merged = upsertMsg(prev, mapped);
          if (mapped.mid) {
            const midStr = String(mapped.mid);
            const hasRealWithMid = merged.some(
              (m) =>
                String(m.mid || m.mid_mensaje || "") === midStr &&
                !String(m.id).startsWith("tmp-")
            );
            if (hasRealWithMid) {
              return merged.filter(
                (m) =>
                  !(
                    String(m.id || "").startsWith("tmp-") &&
                    String(m.mid || m.mid_mensaje || "") === midStr
                  )
              );
            }
          }
          return merged;
        });
        requestAnimationFrame(() => {
          const el = chatContainerRef.current;
          if (el) el.scrollTop = el.scrollHeight;
        });
      }

      setMensajesAcumulados((prev) => {
        const out = [...prev];
        const idx = out.findIndex(
          (x) => x.source === "ig" && Number(x.id) === Number(conversation_id)
        );
        if (idx !== -1) {
          const row = out[idx];
          const next = {
            ...row,
            texto_mensaje: message.text || row.texto_mensaje,
            mensaje_created_at: mapped.created_at,
            mensajes_pendientes:
              (row.mensajes_pendientes || 0) +
              (message.direction === "in" ? 1 : 0),
          };
          out.splice(idx, 1);
          out.unshift(next);
        }
        return out;
      });
    };

    // --- IG: CONV_UPSERT (igual que ya tienes) ---
    const onIgConvUpsert = (upd) => {
      setMensajesAcumulados((prev) => {
        const out = [...prev];
        const idx = out.findIndex(
          (x) => x.source === "ig" && Number(x.id) === Number(upd.id)
        );
        if (idx !== -1) {
          out[idx] = {
            ...out[idx],
            mensaje_created_at: upd.last_message_at,
            texto_mensaje: upd.preview ?? out[idx].texto_mensaje,
            mensajes_pendientes:
              upd.unread_count ?? out[idx].mensajes_pendientes,
          };
        } else {
          out.unshift({
            id: upd.id,
            source: "ig",
            page_id: upd.page_id,
            mensaje_created_at: upd.last_message_at,
            texto_mensaje: upd.preview ?? "",
            celular_cliente: upd.igsid,
            mensajes_pendientes: upd.unread_count ?? 0,
            visto: 0,
            nombre_cliente: upd.customer_name ?? "Instagram",
            profile_pic_url: upd.profile_pic_url ?? null,
            id_encargado: upd.id_encargado ?? null,
            etiquetas: [],
            transporte: null,
            estado_factura: null,
            novedad_info: null,
          });
        }
        out.sort(
          (a, b) =>
            new Date(b.mensaje_created_at) - new Date(a.mensaje_created_at)
        );
        return out;
      });
    };

    // Registrar
    socketRef.current.on("MS_MESSAGE", onMsMessage);
    socketRef.current.on("MS_CONV_UPSERT", onMsConvUpsert);
    socketRef.current.on("IG_MESSAGE", onIgMessage);
    socketRef.current.on("IG_CONV_UPSERT", onIgConvUpsert);

    // Cleanup único
    return () => {
      socketRef.current?.off("MS_MESSAGE", onMsMessage);
      socketRef.current?.off("MS_CONV_UPSERT", onMsConvUpsert);
      socketRef.current?.off("IG_MESSAGE", onIgMessage);
      socketRef.current?.off("IG_CONV_UPSERT", onIgConvUpsert);
    };
  }, [isSocketConnected, selectedChat?.id, selectedChat?.source]);

  useEffect(() => {
    if (!isSocketConnected || !socketRef.current) return;

    const markTmpAsError = (msgText, client_tmp_id) => {
      setMensajesOrdenados((prev) => {
        const next = [...prev];
        let idx = -1;
        if (client_tmp_id) {
          idx = next.findIndex((m) => m.id === client_tmp_id);
        }
        if (idx === -1) {
          idx = [...next]
            .reverse()
            .findIndex(
              (m) => String(m.id).startsWith("tmp-") && m.rol_mensaje === 1
            );
          if (idx !== -1) idx = next.length - 1 - idx;
        }
        if (idx !== -1)
          next[idx] = { ...next[idx], error_meta: { mensaje_error: msgText } };
        return next;
      });
    };

    const onMsSendError = ({ conversation_id, error, client_tmp_id }) => {
      if (
        !(
          selectedChat?.source === "ms" &&
          Number(selectedChat.id) === Number(conversation_id)
        )
      )
        return;
      const msgText =
        error?.error?.message ||
        (typeof error === "string" ? error : "No se pudo enviar el mensaje");
      markTmpAsError(msgText, client_tmp_id);
    };

    const onIgSendError = ({ conversation_id, error, client_tmp_id }) => {
      if (
        !(
          selectedChat?.source === "ig" &&
          Number(selectedChat.id) === Number(conversation_id)
        )
      )
        return;
      const msgText =
        error?.error?.message ||
        (typeof error === "string" ? error : "No se pudo enviar el mensaje");
      markTmpAsError(msgText, client_tmp_id);
    };

    socketRef.current.on("MS_SEND_ERROR", onMsSendError);
    socketRef.current.on("IG_SEND_ERROR", onIgSendError);

    return () => {
      socketRef.current?.off("MS_SEND_ERROR", onMsSendError);
      socketRef.current?.off("IG_SEND_ERROR", onIgSendError);
    };
  }, [isSocketConnected, selectedChat?.id, selectedChat?.source]);

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

  const actions = useMemo(
    () => ({
      on: (ev, cb) => socketRef.current?.on(ev, cb),
      off: (ev, cb) => socketRef.current?.off(ev, cb),

      ig: {
        joinConv: (conversation_id) => {
          socketRef.current?.emit("IG_JOIN_CONV", {
            conversation_id,
            id_configuracion,
          });
        },
        markSeen: (conversation_id) => {
          socketRef.current?.emit("IG_MARK_SEEN", { conversation_id });
        },
        typing: (conversation_id, on) => {
          socketRef.current?.emit("IG_TYPING", { conversation_id, on });
        },
      },

      // si quieres también ms.*, wa.*, etc. los pones aquí
    }),
    [id_configuracion]
  );

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
        onSendMsAttachment={onSendMsAttachment}
        onSendIgAttachment={onSendIgAttachment}
        actions={actions}
        isSocketConnected={isSocketConnected}
      />
      {/* Opciones adicionales con animación */}
      <DatosUsuario
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
