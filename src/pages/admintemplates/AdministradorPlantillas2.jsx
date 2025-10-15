import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import chatApi from "../../api/chatcenter";
import CrearPlantillaModal from "./CrearPlantillaModal";
import VerPlantillaModal from "./VerPlantillaModal";
import CrearPlantillaRapidaModal from "./CrearPlantillaRapidaModal";
import EditarPlantillaRapidaModal from "./EditarPlantillaRapidaModal";
import VerPlantillaGuiasGeneradas from "./VerPlantillaGuiasGeneradas";
import VerPlantillaCalendarios from "./VerPlantillaCalendarios";
import CrearConfiguracionModal from "./CrearConfiguracionModal";
import { useNavigate } from "react-router-dom";
import log_imporsuitImage from "../../assets/logo_imporsuit.png";
import "./AdministradorPlantillas2.css";
import Swal from "sweetalert2";
import { jwtDecode } from "jwt-decode";
import io from "socket.io-client";

import SectionHeader from "../../components/canales/SectionHeader";
import { ThWithTooltip } from "../../components/canales/Tooltip";

const AdministradorPlantillas2 = forwardRef(function AdministradorPlantillas2(
  { hideHeader = false },
  ref
) {
  const [currentTab, setCurrentTab] = useState("numbers");

  // WhatsApp profile / numbers
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [numbersLoading, setNumbersLoading] = useState(true);

  // Templates / quick replies
  const [plantillas, setPlantillas] = useState([]);
  const [respuestasRapidas, setRespuestasRapidas] = useState([]);

  // Session / UI
  const [userData, setUserData] = useState(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [id_configuracion, setId_configuracion] = useState(null);
  const [id_plataforma_conf, setId_plataforma_conf] = useState(null);
  const navigate = useNavigate();

  const [configuracionAutomatizada, setConfiguracionAutomatizada] = useState(
    []
  );
  const [modalConfigOpen, setModalConfigOpen] = useState(false);
  const [modalConfigOpenCalendario, setModalConfigOpenCalendario] =
    useState(false);
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [respuestaSeleccionada, setRespuestaSeleccionada] = useState(null);
  const [ModalConfiguracionAutomatizada, setModalConfiguracionAutomatizada] =
    useState(false);

  const [mostrarModalPlantillaRapida, setMostrarModalPlantillaRapida] =
    useState(false);
  const [mostrarModalPlantilla, setMostrarModalPlantilla] = useState(false);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState(null);
  const [verModal, setVerModal] = useState(false);

  const [resultadoPlantillas, setResultadoPlantillas] = useState([]);
  const [modalResultadosAbierto, setModalResultadosAbierto] = useState(false);
  const [cargandoPlantillas, setCargandoPlantillas] = useState(false);

  const socketRef = useRef(null);

  // ancla para scroll
  const numbersAnchorRef = useRef(null);
  useImperativeHandle(ref, () => ({
    scrollToNumbers: () => {
      setCurrentTab("numbers");
      requestAnimationFrame(() => {
        numbersAnchorRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    },
  }));

  // SDK Facebook
  useEffect(() => {
    if (!document.getElementById("facebook-jssdk")) {
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
    window.fbAsyncInit = () => {
      window.FB.init({
        appId: "1211546113231811",
        autoLogAppEvents: true,
        xfbml: true,
        version: "v22.0",
      });
    };
  }, []);

  // IDs locales
  useEffect(() => {
    const idp = localStorage.getItem("id_plataforma_conf");
    const idc = localStorage.getItem("id_configuracion");
    if (idc) setId_configuracion(parseInt(idc));
    setId_plataforma_conf(idp === "null" ? null : idp ? parseInt(idp) : null);
  }, []);

  const getCountryCode = (phone) => {
    const p = phone.replace(/\s+/g, "");
    if (p.startsWith("+593") || p.startsWith("09")) return "ec";
    if (p.startsWith("+52")) return "mx";
    if (p.startsWith("+57")) return "co";
    return "us";
  };

  const getTemplacecode = (template) => {
    if (template.startsWith("es") || template.startsWith("es_"))
      return "Español";
    if (template.startsWith("en") || template.startsWith("en_"))
      return "Inglés";
    return template;
  };

  const handleVerPlantilla = (plantilla) => {
    setPlantillaSeleccionada(plantilla);
    setVerModal(true);
  };

  const handleAbrirConfiguraciones = () => setModalConfigOpen(true);
  const handleAbrirConfiguracionesCalendario = () =>
    setModalConfigOpenCalendario(true);
  const handleAbrirEditarRespuesta = (respuesta) => {
    setRespuestaSeleccionada(respuesta);
    setModalEditarOpen(true);
  };
  const handleAbrirConfiguracionAutomatizada = () =>
    setModalConfiguracionAutomatizada(true);

  // token + socket
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    const decoded = jwtDecode(token);
    if (decoded.exp < Date.now() / 1000) {
      localStorage.clear();
      window.location.href = "/login";
      return;
    }
    setUserData(decoded);

    const socket = io(import.meta.env.VITE_socket, {
      transports: ["websocket", "polling"],
      secure: true,
    });
    socket.on("connect", () => {
      socketRef.current = socket;
      setIsSocketConnected(true);
    });
    socket.on("disconnect", () => {
      setIsSocketConnected(false);
    });
  }, []);

  // === WhatsApp numbers with skeleton & min hold
  useEffect(() => {
    const fetchPhoneNumbers = async () => {
      if (!userData || id_configuracion == null) return;
      try {
        setNumbersLoading(true);
        const minHold = new Promise((r) => setTimeout(r, 400)); // evita flash
        const req = chatApi.post("/whatsapp_managment/ObtenerNumeros", {
          id_configuracion,
        });
        const [resp] = await Promise.all([req, minHold]);
        setPhoneNumbers(resp?.data?.data || []);
      } catch (error) {
        console.error("Error al obtener phone_numbers:", error);
        setPhoneNumbers([]);
      } finally {
        setNumbersLoading(false);
      }
    };
    if (currentTab === "numbers") fetchPhoneNumbers();
  }, [userData, currentTab, id_configuracion]);

  // Respuestas rápidas
  useEffect(() => {
    if (currentTab === "answers-fast") fetchRespuestasRapidas();
  }, [currentTab]);

  const fetchRespuestasRapidas = async () => {
    if (!userData || id_configuracion == null) return;
    try {
      const response = await chatApi.post(
        "/whatsapp_managment/obtenerPlantillasPlataforma",
        { id_configuracion }
      );
      setRespuestasRapidas(response.data || []);
    } catch (error) {
      console.error("Error al cargar respuestas rápidas", error);
    }
  };

  // Config automatizada / asistentes
  const fetchConfiguracionAutomatizada = async () => {
    if (!userData || id_configuracion == null) return;
    try {
      const response = await chatApi.post(
        "configuraciones/listar_configuraciones",
        { id_configuracion }
      );
      setConfiguracionAutomatizada(response.data.data || []);
    } catch (error) {
      if (error.response?.status === 403) {
        Swal.fire({
          icon: "error",
          title: error.response?.data?.message,
          text: "",
          confirmButtonText: "OK",
        }).then(() => {
          navigate("/planes_view");
        });
      } else {
        console.error("Error al cargar la configuración automatizada.", error);
        setConfiguracionAutomatizada([]);
      }
    }
  };

  useEffect(() => {
    if (currentTab === "settings") {
      fetchConfiguracionAutomatizada();
    } else if (currentTab === "asistente") {
      // fetchAsistenteAutomatizado(); // si aplica
    } else if (currentTab === "templates" && id_configuracion !== null) {
      fetchPlantillas();
    }
  }, [currentTab, id_configuracion]);

  const fetchPlantillas = async () => {
    if (!userData || id_configuracion === null) return;
    try {
      const resp = await chatApi.post(
        "/whatsapp_managment/obtenerTemplatesWhatsapp",
        { id_configuracion }
      );
      setPlantillas(resp.data.data || []);
    } catch (error) {
      console.error("Error al cargar las plantillas:", error);
      setStatusMessage({
        type: "error",
        text: "No se pudieron cargar las plantillas.",
      });
    }
  };

  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  const crearPlantillasAutomaticas = async () => {
    setCargandoPlantillas(true);
    try {
      const response = await chatApi.post(
        "/whatsapp_managment/crearPlantillasAutomaticas",
        { id_configuracion }
      );
      if (response.data.success) {
        setResultadoPlantillas(response.data.resultados || []);
        setModalResultadosAbierto(true);
        fetchPlantillas();
      } else {
        setStatusMessage({
          type: "error",
          text: "Hubo un error creando las plantillas.",
        });
      }
    } catch {
      setStatusMessage({
        type: "error",
        text: "Error al conectar con el servidor.",
      });
    } finally {
      setCargandoPlantillas(false);
    }
  };

  const translateVertical = (v) => {
    if (!v) return "—";
    const map = {
      AUTO: "Automotriz",
      BEAUTY: "Belleza y cuidado personal",
      EDU: "Educación",
      ENTERTAINMENT: "Entretenimiento",
      EVENT_PLANNING: "Organización de eventos",
      FINANCE: "Servicios financieros",
      GOVERNMENT: "Gobierno",
      GROCERY: "Supermercados y abarrotes",
      HEALTH: "Salud y bienestar",
      HOTEL: "Hoteles y alojamiento",
      NON_PROFIT: "Organización sin fines de lucro",
      PROFESSIONAL_SERVICES: "Servicios profesionales",
      RESTAURANT: "Restaurantes y comida",
      RETAIL: "Compras y ventas minoristas (Retail)",
      TRAVEL: "Viajes y turismo",
      PHARMACY: "Farmacia",
      OTHER: "Otro",
      UNDEFINED: "No especificado",
      APPAREL: "Moda y apparel",
    };
    if (map[v]) return map[v];
    return v
      .toString()
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/^\w|\s\w/g, (m) => m.toUpperCase());
  };

  // =============== VISTAS ===============

  const WaSkeleton = () => (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm">
      <div className="bg-[#075E54] px-4 py-3">
        <div className="h-6 w-40 bg-white/30 rounded animate-pulse" />
      </div>
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full bg-gray-200 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-1/3 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
        <div className="h-3 w-2/3 bg-gray-100 rounded animate-pulse" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-16 bg-gray-50 border border-gray-100 rounded-xl animate-pulse" />
          <div className="h-16 bg-gray-50 border border-gray-100 rounded-xl animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-5 w-24 bg-gray-100 rounded-full animate-pulse" />
          <div className="h-5 w-28 bg-gray-100 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );

  const renderNumbersTable = () => {
    const waConnected = !numbersLoading && phoneNumbers.length > 0;

    return (
      <div
        ref={numbersAnchorRef}
        className="mt-4 scroll-mt-24 bg-white p-0 rounded-3xl shadow-xl border border-gray-100 overflow-hidden"
      >
        <div className="px-5 pt-5">
          <SectionHeader
            title="WhatsApp Business"
            subtitle={
              waConnected
                ? "Perfil y estado de tu número vinculado"
                : "Conecta tu número de WhatsApp Business"
            }
          />
        </div>

        {/* 1) SKELETON único mientras carga */}
        {numbersLoading && (
          <div className="grid gap-6 p-5 md:max-w-xl">
            <WaSkeleton />
          </div>
        )}

        {/* 2) NO conectado → SOLO tarjeta de conectar */}
        {!numbersLoading && !waConnected && (
          <div className="p-5">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Conectar WhatsApp</h3>
                  <p className="text-sm text-gray-600">
                    Vincula tu número de WhatsApp Business para mostrar el
                    perfil y usar todas las funciones.
                  </p>
                </div>
                <button
                  onClick={() =>
                    (window.location.href = "/conexiones?tab=whatsapp")
                  }
                  className="px-4 py-2 rounded-xl bg-[#075E54] text-white hover:bg-[#0b6b60]"
                >
                  Conectar WhatsApp
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3) Conectado → perfil completo (tu UI actual) */}
        {!numbersLoading && waConnected && (
          <div className="grid gap-6 p-5 md:grid-cols-2 xl:grid-cols-3">
            {phoneNumbers.slice(0, 1).map((num, index) => {
              const p = Array.isArray(num.profile?.data)
                ? num.profile.data[0]
                : Array.isArray(num.profile)
                ? num.profile[0]
                : num.profile || null;

              const photo =
                p?.profile_picture_url ||
                "https://placehold.co/200x200?text=WA";
              const about = p?.about || "—";
              const description = p?.description || "—";

              const tierLabel = (() => {
                switch (num.messaging_limit_tier) {
                  case "TIER_250":
                    return "250 / 24 h";
                  case "TIER_500":
                    return "500 / 24 h";
                  case "TIER_1K":
                    return "1.000 / 24 h";
                  case "TIER_10K":
                    return "10.000 / 24 h";
                  case "TIER_100K":
                    return "100.000 / 24 h";
                  default:
                    return "—";
                }
              })();

              const rawNumber = num.display_phone_number || "";
              const country = getCountryCode(rawNumber);
              const isConnected =
                (num.status || "").toUpperCase() === "CONNECTED";

              return (
                <div
                  key={index}
                  className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm hover:shadow-md transition"
                >
                  <div className="bg-[#075E54] text-white px-4 py-3 flex items-center gap-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M15 18l-6-6 6-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>

                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={photo}
                        alt="Foto de perfil"
                        className="h-10 w-10 rounded-full object-cover border border-white/20"
                        onError={(e) =>
                          (e.currentTarget.src =
                            "https://placehold.co/200x200?text=WA")
                        }
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold truncate">
                            {num.verified_name || "Negocio"}
                          </span>
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full ${
                              isConnected ? "bg-white/15" : "bg-white/10"
                            }`}
                          >
                            {isConnected ? "Conectado" : num.status || "—"}
                          </span>
                        </div>
                        <div className="text-white/80 text-xs flex items-center gap-2">
                          <img
                            src={`https://flagcdn.com/w20/${country}.png`}
                            alt="bandera"
                            className="w-5 h-3 object-cover rounded-[2px]"
                          />
                          <span className="truncate">{rawNumber}</span>
                        </div>
                      </div>
                    </div>

                    <div className="ml-auto opacity-90">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <path
                          d="M12 8h.01M11 12h1v4h1"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>

                  <div className="px-5 pt-5 pb-2">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img
                          src={photo}
                          alt="Foto"
                          className="h-20 w-20 rounded-full object-cover border-4 border-white shadow -mt-10 md:-mt-10"
                          onError={(e) =>
                            (e.currentTarget.src =
                              "https://placehold.co/200x200?text=WA")
                          }
                        />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {num.verified_name || "Negocio"}
                        </h3>
                        <div className="text-sm text-gray-600">{rawNumber}</div>
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-gray-700">
                      <div className="flex items-center gap-2 text-gray-500">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M12 8v4l3 3"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                        </svg>
                        <span className="uppercase text-[11px] tracking-wide">
                          Acerca de
                        </span>
                      </div>
                      <div className="mt-1 text-gray-800">{about}</div>
                    </div>
                  </div>

                  <div className="px-5 pb-5 pt-3 space-y-3">
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">
                        Descripción
                      </div>
                      <div className="mt-1 text-sm text-gray-800 whitespace-pre-line">
                        {description}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-gray-100 bg-white p-4">
                        <div className="text-[11px] uppercase tracking-wide text-gray-500">
                          Límite de mensajes
                        </div>
                        <div className="mt-1 text-sm text-gray-800">
                          {tierLabel}
                        </div>
                      </div>
                      <div className="rounded-xl border border-gray-100 bg-white p-4">
                        <div className="text-[11px] uppercase tracking-wide text-gray-500">
                          Categoría
                        </div>
                        <div className="mt-1 text-sm text-gray-800">
                          {translateVertical(p?.vertical)}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`px-2 py-0.5 text-[11px] rounded-full ${
                          isConnected
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {isConnected ? "Conectado" : num.status || "—"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderTemplatesTable = () => (
    <div className="overflow-visible bg-white p-5 rounded-3xl shadow-xl border border-gray-100 relative z-0">
      <SectionHeader
        title="Administrador de Plantillas"
        subtitle="Crea, revisa el estado de aprobación y consulta el contenido de las plantillas asociadas a tu portafolio de Business Manager"
        right={
          <div className="flex gap-2">
            <button
              onClick={() => setMostrarModalPlantilla(true)}
              className="bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700"
            >
              + Crear Plantilla
            </button>
            <button
              onClick={crearPlantillasAutomaticas}
              className="bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 disabled:opacity-50"
              disabled={cargandoPlantillas}
            >
              {cargandoPlantillas
                ? "Creando..."
                : "Crear Plantillas Recomendadas"}
            </button>
          </div>
        }
      />
      <div className="overflow-x-auto">
        <table className="min-w-full border bg-white shadow rounded-lg">
          <thead className="bg-gray-200 text-gray-700 text-sm">
            <tr>
              <ThWithTooltip label="Nombre / Idioma" />
              <ThWithTooltip
                label="Categoría"
                tip={
                  <>
                    <strong className="block mb-1">Categorías</strong>
                    <b>MARKETING:</b> Promocionales/informativas. <br />
                    <b>UTILIDAD:</b> Confirmaciones, recordatorios,
                    transaccionales.
                  </>
                }
              />
              <ThWithTooltip label="Mensaje" />
              <ThWithTooltip
                label="Estado"
                tip={
                  <>
                    <strong className="block mb-1">Aprobación</strong>
                    <b>APROBADA:</b> lista para usar. <b>PENDIENTE:</b> en
                    revisión. <b>RECHAZADA:</b> incumple políticas.
                  </>
                }
              />
              <ThWithTooltip label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {plantillas.map((plantilla, index) => (
              <tr key={index} className="border-t hover:bg-gray-50">
                <td className="py-2 px-4">
                  <div className="font-semibold">{plantilla.name}</div>
                  <div className="text-gray-500">
                    {getTemplacecode(plantilla.language) || plantilla.language}
                  </div>
                </td>
                <td className="py-2 px-4">
                  {plantilla.category === "MARKETING" ? (
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                      MARKETING
                    </span>
                  ) : plantilla.category === "UTILITY" ? (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      UTILIDAD
                    </span>
                  ) : (
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                      DESCONOCIDO
                    </span>
                  )}
                </td>
                <td className="py-2 px-4 text-sm">
                  {plantilla.components.map((comp, i) => (
                    <div key={i} className="mb-2">
                      <strong>{comp.type}:</strong>{" "}
                      {comp.text ||
                        (comp.buttons
                          ? comp.buttons.map((b, j) => (
                              <div key={j}>• {b.text}</div>
                            ))
                          : "—")}
                    </div>
                  ))}
                </td>
                <td className="py-2 px-4">
                  {plantilla.status === "APPROVED" ? (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                      APROBADA
                    </span>
                  ) : plantilla.status === "PENDING" ? (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      PENDIENTE
                    </span>
                  ) : plantilla.status === "REJECTED" ? (
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                      RECHAZADA
                    </span>
                  ) : (
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                      DESCONOCIDO
                    </span>
                  )}
                </td>
                <td className="py-2 px-4">
                  <button
                    onClick={() => handleVerPlantilla(plantilla)}
                    className="text-blue-600 hover:text-blue-800 p-2"
                    title="Ver Plantilla"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 inline"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAnswersFastTable = () => (
    <div className="overflow-visible bg-white p-5 rounded-3xl shadow-xl border border-gray-100 relative z-0">
      <SectionHeader
        title="Respuestas rápidas"
        subtitle="Atajos para responder al instante desde el chat"
        right={
          <div className="flex gap-2">
            <button
              onClick={() => setMostrarModalPlantillaRapida(true)}
              className="bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700"
            >
              + Agregar
            </button>
            <button
              onClick={handleAbrirConfiguraciones}
              className="bg-amber-500 text-white px-4 py-2 rounded-xl hover:bg-amber-600"
            >
              Guía Generada
            </button>
            <button
              onClick={handleAbrirConfiguracionesCalendario}
              className="bg-teal-600 text-white px-4 py-2 rounded-xl hover:bg-teal-700"
            >
              Notificación Calendario
            </button>
          </div>
        }
      />
      <table className="min-w-full border bg-white shadow rounded-lg">
        <thead className="bg-gray-200 text-gray-700 text-sm">
          <tr>
            <ThWithTooltip
              label="Atajo"
              tip="Nombre de la respuesta para invocarla con “/” en el chat."
            />
            <ThWithTooltip label="Mensaje" />
            <ThWithTooltip
              label="Bienvenida"
              tip="Si está marcada, se envía a clientes que te contactan por primera vez."
            />
            <ThWithTooltip label="Acciones" />
          </tr>
        </thead>
        <tbody>
          {respuestasRapidas.map((respuesta, index) => (
            <tr key={index} className="border-t hover:bg-gray-50">
              <td className="py-2 px-4">{respuesta.atajo}</td>
              <td className="py-2 px-4">{respuesta.mensaje}</td>
              <td className="py-2 px-10">
                <input
                  type="checkbox"
                  checked={parseInt(respuesta.principal) === 1}
                  disabled={
                    parseInt(respuesta.principal) === 1
                      ? false
                      : respuestasRapidas.some(
                          (r) =>
                            parseInt(r.principal) === 1 &&
                            r.id_template !== respuesta.id_template
                        )
                  }
                  onChange={() => cambiarEstadoRespuesta(respuesta)}
                />
              </td>
              <td className="py-2 px-4 flex gap-2">
                <button
                  className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded"
                  onClick={() => handleAbrirEditarRespuesta(respuesta)}
                >
                  <i className="fa-solid fa-pencil"></i> Editar
                </button>
                <button
                  className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded"
                  onClick={() => eliminarRespuesta(respuesta.id_template)}
                >
                  <i className="fa-solid fa-trash-can"></i> Borrar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderSettingsTable = () => (
    <div className="overflow-visible bg-white p-5 rounded-3xl shadow-xl border border-gray-100 relative z-0">
      <SectionHeader
        title="Configuraciones"
        subtitle="Configuraciones y método de pago"
      />
      <table className="min-w-full border bg-white shadow rounded-lg">
        <thead className="bg-gray-200 text-gray-700 text-sm">
          <tr>
            <ThWithTooltip label="Nombre Configuración" />
            <ThWithTooltip label="Teléfono" />
            <ThWithTooltip label="Webhook URL" />
            <ThWithTooltip
              label="Método de Pago"
              tip="Si tienes inconvenientes con la API, revisa tu portafolio en Business Manager y habilítalo aquí."
            />
          </tr>
        </thead>
        <tbody>
          {configuracionAutomatizada.map((respuesta, index) => (
            <tr key={index} className="border-t hover:bg-gray-50">
              <td className="py-2 px-4">{respuesta.nombre_configuracion}</td>
              <td className="py-2 px-4">{respuesta.telefono}</td>
              <td className="py-2 px-4">{respuesta.webhook_url}</td>
              <td className="py-2 px-10">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={parseInt(respuesta.metodo_pago) === 1}
                    onChange={() => handleSwitchMetodoPago(respuesta)}
                  />
                  <div
                    className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer dark:bg-gray-700
                               peer-checked:after:translate-x-full peer-checked:after:border-white
                               after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                               after:bg-white after:border-gray-300 after:border after:rounded-full
                               after:h-5 after:w-5 after:transition-all dark:border-gray-600
                               peer-checked:bg-blue-600"
                  />
                </label>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Vinculaciones (card + modal)
  const [showModalVinculacionesImporsuit, setShowModalVinculacionesImporsuit] =
    useState(false);
  const openModalVinculacionesImporsuit = () =>
    setShowModalVinculacionesImporsuit(true);
  const closeModalVinculacionesImporsuit = () =>
    setShowModalVinculacionesImporsuit(false);
  const [usuarioImporsuit, setUsuarioImporsuit] = useState("");
  const [passwordImporsuit, setPasswordImporsuit] = useState("");
  const [cargandoImporsuit, setCargandoImporsuit] = useState(false);
  const [errorImporsuit, setErrorImporsuit] = useState("");

  const handleLoginImporsuit = async () => {
    setCargandoImporsuit(true);
    setErrorImporsuit("");
    try {
      const res = await chatApi.post("auth/validar_usuario_imporsuit", {
        usuario: usuarioImporsuit,
        password: passwordImporsuit,
        id_configuracion,
      });
      if (res.status === 200) {
        Swal.fire({
          icon: "success",
          title: "Vinculación exitosa",
          text: "Se ha vinculado correctamente con Imporsuit",
          confirmButtonColor: "#3085d6",
        });
        setShowModalVinculacionesImporsuit(false);
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        setErrorImporsuit("Credenciales inválidas");
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Usuario o contraseña incorrectos",
          confirmButtonColor: "#d33",
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Error de conexión",
          text: "No se pudo contactar con el servidor",
          confirmButtonColor: "#d33",
        });
      }
    } finally {
      setCargandoImporsuit(false);
    }
  };

  const renderVinculacionesTable = () => (
    <div className="overflow-visible bg-white p-4 rounded shadow-md relative z-0">
      <div
        onClick={() => {
          if (id_plataforma_conf === null) openModalVinculacionesImporsuit();
        }}
        className={`relative cursor-pointer max-w-56 mx-auto bg-white rounded-xl overflow-hidden shadow-lg transform transition duration-300 ${
          id_plataforma_conf === null
            ? "hover:scale-105 hover:shadow-2xl"
            : "opacity-90 cursor-default"
        }`}
      >
        <div className="absolute top-2 right-2 z-10">
          {id_plataforma_conf === null ? (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
              🔴 Desconectado
            </span>
          ) : (
            <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
              🟢 Conectado
            </span>
          )}
        </div>

        <div className="bg-[#171931] flex justify-center items-center p-4">
          <img
            src={log_imporsuitImage}
            alt="Imporsuit Logo"
            className="w-60 h-30"
          />
        </div>

        <div className="p-4 text-center">
          <h3 className="text-lg font-semibold text-gray-800">Imporsuit</h3>
        </div>
      </div>

      {showModalVinculacionesImporsuit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative animate-fade-in">
            <button
              onClick={closeModalVinculacionesImporsuit}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-xl"
            >
              ✕
            </button>
            <div className="flex justify-center mb-4">
              <img
                src={log_imporsuitImage}
                alt="Imporsuit"
                className="w-28 h-auto rounded-md"
              />
            </div>
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">
              Iniciar sesión en Imporsuit
            </h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Usuario"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={usuarioImporsuit}
                onChange={(e) => setUsuarioImporsuit(e.target.value)}
              />
              <input
                type="password"
                placeholder="Contraseña"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={passwordImporsuit}
                onChange={(e) => setPasswordImporsuit(e.target.value)}
              />
              {errorImporsuit && (
                <p className="text-red-600 text-sm text-center">
                  {errorImporsuit}
                </p>
              )}
              <button
                onClick={handleLoginImporsuit}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md transition duration-200 disabled:opacity-50"
                disabled={cargandoImporsuit}
              >
                {cargandoImporsuit ? "Verificando..." : "Iniciar sesión"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Creación / edición / switches
  const handleCreatePlantilla = async (payload) => {
    try {
      const resp = await chatApi.post("/whatsapp_managment/CrearPlantilla", {
        ...payload,
        id_configuracion,
      });
      if (resp.data.success) {
        setStatusMessage({
          type: "success",
          text: "Plantilla creada correctamente.",
        });
        await fetchPlantillas();
        setMostrarModalPlantilla(false);
      } else {
        setStatusMessage({
          type: "error",
          text: "Error al crear la plantilla.",
        });
      }
    } catch {
      setStatusMessage({
        type: "error",
        text: "Error al conectar con el servidor.",
      });
    }
  };

  const cambiarEstadoRespuesta = async (respuesta) => {
    const estado = parseInt(respuesta.principal) === 1 ? 0 : 1;
    try {
      const resp = await chatApi.put("/whatsapp_managment/cambiarEstado", {
        id_template: respuesta.id_template,
        estado,
      });
      if (resp.data.success) {
        setStatusMessage({ type: "success", text: resp.data.message });
        fetchRespuestasRapidas();
      } else {
        setStatusMessage({
          type: "error",
          text: resp.data.message || "Error al actualizar el estado.",
        });
      }
    } catch {
      setStatusMessage({
        type: "error",
        text: "Error al conectar con el servidor.",
      });
    }
  };

  const handleSwitchMetodoPago = async (configItem) => {
    const nuevoMetodoPago = parseInt(configItem.metodo_pago) === 1 ? 0 : 1;
    try {
      const resp = await chatApi.put(
        "/whatsapp_managment/actualizarMetodoPago",
        { id: configItem.id, metodo_pago: nuevoMetodoPago }
      );
      if (resp.data.success) {
        setStatusMessage({
          type: "success",
          text:
            resp.data.message || "Método de pago actualizado correctamente.",
        });
        fetchConfiguracionAutomatizada();
      } else {
        setStatusMessage({
          type: "error",
          text: resp.data.message || "Error al actualizar el método de pago.",
        });
      }
    } catch {
      setStatusMessage({
        type: "error",
        text: "Error al conectar con el servidor al cambiar método de pago.",
      });
    }
  };

  const eliminarRespuesta = async (id_template) => {
    try {
      const resp = await chatApi.delete(
        "/whatsapp_managment/eliminarPlantilla",
        { data: { id_template } }
      );
      if (resp.data.success) {
        setStatusMessage({ type: "success", text: resp.data.message });
        fetchRespuestasRapidas();
      } else {
        setStatusMessage({
          type: "error",
          text: resp.data.message || "Error al eliminar la plantilla",
        });
      }
    } catch {
      setStatusMessage({
        type: "error",
        text: "Error al conectar con el servidor",
      });
    }
  };

  const traducirErrorMeta = (error) => {
    const code = error?.error?.error_subcode;
    if (code === 2388023) {
      return "No se puede crear esta plantilla por el momento. Ya existía y fue eliminada. Intenta en 1 minuto o usa un nombre distinto.";
    }
    return (
      error?.error?.error_user_msg ||
      error?.error?.message ||
      "Ocurrió un error desconocido."
    );
  };

  const ModalResultadosPlantillas = ({ resultados, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex justify-center items-center">
      <div className="bg-white w-[90%] md:w-[600px] max-h-[90%] overflow-y-auto rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">
          Resumen de las Plantillas Creadas
        </h2>
        {resultados.map((r, idx) => (
          <div key={idx} className="mb-3 p-3 border rounded bg-gray-50">
            <div className="font-bold">{r.nombre}</div>
            <div
              className={`text-sm ${
                r.status === "success"
                  ? "text-green-600"
                  : r.status === "omitido"
                  ? "text-yellow-600"
                  : "text-red-600"
              }`}
            >
              {r.status.toUpperCase()} -{" "}
              {r.mensaje ||
                (r.error
                  ? traducirErrorMeta(r.error)
                  : "Plantilla creada exitósamente.")}
            </div>
          </div>
        ))}
        <button
          onClick={onClose}
          className="mt-4 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded"
        >
          Cerrar
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-0 mt-16">
      {!hideHeader && (
        <div className="px-5">
          <SectionHeader
            title="WhatsApp Business"
            subtitle="Gestiona números, plantillas y respuestas rápidas con el mismo estilo del Centro de Conexiones."
          />
        </div>
      )}

      {statusMessage && (
        <div
          className={`fixed top-5 right-5 z-[9999] px-4 py-2 rounded shadow ${
            statusMessage.type === "success"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          <span>{statusMessage.text}</span>
          {statusMessage.extra && (
            <a
              href={statusMessage.extra}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-2 text-blue-700 underline font-medium"
            >
              Abrir chat de soporte
            </a>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="overflow-x-auto">
        <div className="flex gap-4 border-b border-gray-200 px-5 min-w-max">
          <button
            className={`pb-2 flex items-center gap-2 transition-colors duration-200 ${
              currentTab === "numbers"
                ? "text-blue-600 border-b-2 border-blue-600 font-semibold"
                : "text-gray-600 hover:text-blue-600"
            }`}
            onClick={() => setCurrentTab("numbers")}
          >
            <i className="fas fa-address-book"></i> Perfil de WhatsApp Business
          </button>

          <button
            className={`pb-2 flex items-center gap-2 transition-colors duration-200 ${
              currentTab === "templates"
                ? "text-blue-600 border-b-2 border-blue-600 font-semibold"
                : "text-gray-600 hover:text-blue-600"
            }`}
            onClick={() => setCurrentTab("templates")}
          >
            <i className="fas fa-copy"></i> Administrador de Plantillas
          </button>

          <button
            className={`pb-2 flex items-center gap-2 transition-colors duration-200 ${
              currentTab === "answers-fast"
                ? "text-blue-600 border-b-2 border-blue-600 font-semibold"
                : "text-gray-600 hover:text-blue-600"
            }`}
            onClick={() => setCurrentTab("answers-fast")}
          >
            <i className="fas fa-bolt"></i> Respuestas rápidas
          </button>

          <button
            className={`pb-2 flex items-center gap-2 transition-colors duration-200 ${
              currentTab === "settings"
                ? "text-blue-600 border-b-2 border-blue-600 font-semibold"
                : "text-gray-600 hover:text-blue-600"
            }`}
            onClick={() => setCurrentTab("settings")}
          >
            <i className="bx bxs-plug"></i> Configuraciones
          </button>
        </div>
      </div>

      <div className="p-5">
        {currentTab === "numbers" && renderNumbersTable()}
        {currentTab === "templates" && renderTemplatesTable()}
        {currentTab === "answers-fast" && renderAnswersFastTable()}
        {currentTab === "settings" && renderSettingsTable()}
        {currentTab === "asistente" && null}
        {currentTab === "vinculaciones" && renderVinculacionesTable()}
      </div>

      {mostrarModalPlantilla && (
        <CrearPlantillaModal
          onClose={() => setMostrarModalPlantilla(false)}
          onCreate={handleCreatePlantilla}
        />
      )}

      {mostrarModalPlantillaRapida && (
        <CrearPlantillaRapidaModal
          onClose={() => setMostrarModalPlantillaRapida(false)}
          onSuccess={fetchRespuestasRapidas}
          setStatusMessage={setStatusMessage}
        />
      )}

      {verModal && (
        <VerPlantillaModal
          plantilla={plantillaSeleccionada}
          onClose={() => setVerModal(false)}
        />
      )}

      {modalEditarOpen && (
        <EditarPlantillaRapidaModal
          respuesta={respuestaSeleccionada}
          onClose={() => setModalEditarOpen(false)}
          onSuccess={fetchRespuestasRapidas}
          setStatusMessage={setStatusMessage}
        />
      )}

      {modalConfigOpen && (
        <VerPlantillaGuiasGeneradas
          respuestas={respuestasRapidas}
          onClose={() => setModalConfigOpen(false)}
          setStatusMessage={setStatusMessage}
        />
      )}

      {modalConfigOpenCalendario && (
        <VerPlantillaCalendarios
          respuestas={respuestasRapidas}
          onClose={() => setModalConfigOpenCalendario(false)}
          setStatusMessage={setStatusMessage}
        />
      )}

      {ModalConfiguracionAutomatizada && (
        <CrearConfiguracionModal
          onClose={() => setModalConfiguracionAutomatizada(false)}
          fetchConfiguraciones={fetchConfiguracionAutomatizada}
          setStatusMessage={setStatusMessage}
        />
      )}

      {modalResultadosAbierto && (
        <ModalResultadosPlantillas
          resultados={resultadoPlantillas}
          onClose={() => setModalResultadosAbierto(false)}
        />
      )}
    </div>
  );
});

export default AdministradorPlantillas2;
