import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";
import MiniCalendario from "../calendar/MiniCalendario";
import { useNavigate } from "react-router-dom";
import Cotizador from "../cotizador/Cotizador";
import { jwtDecode } from "jwt-decode";
import ChatRightPanel from "./ChatRightPanel";
import EditarContactoDrawer from "./modales/EditarContactoDrawer";
import "./css/DataUsuarioCss.css";

const PLANES_CALENDARIO = [1, 3, 4];

const DatosUsuarioModerno = ({
  opciones,
  animateOut,
  selectedChat,
  setSelectedChat,
  socketRef,
  id_configuracion,
}) => {
  // ── Acordeones ──
  const [isOpen, setIsOpen] = useState(false);
  const [isOpenNovedades, setIsOpenNovedades] = useState(false);
  const [isOpenMiniCal, setIsOpenMiniCal] = useState(false);

  // ── Cotizaciones ──
  const [isCotizacionesOpen, setIsCotizacionesOpen] = useState(false);
  const [loadingCotizaciones, setLoadingCotizaciones] = useState(false);
  const [cotizacionesData, setCotizacionesData] = useState([]);

  // ── Calendario (plan) ──
  const [canAccessCalendar, setCanAccessCalendar] = useState(null);
  const [isGoogleLinked, setIsGoogleLinked] = useState(null);
  const navigate = useNavigate();

  // ── Editar contacto ──
  const [editContactOpen, setEditContactOpen] = useState(false);

  // ── Token info ──
  const token = localStorage.getItem("token");
  const decoded = jwtDecode(token);
  const activar_cotizacion = decoded?.activar_cotizacion || 0;

  const DEFAULT_AVATAR =
    "https://imp-datas.s3.amazonaws.com/images/2026-01-05T17-03-19-944Z-user.png";

  // ── Validar plan calendario ──
  useEffect(() => {
    try {
      if (!token) return setCanAccessCalendar(false);
      const payload = JSON.parse(atob(token.split(".")[1]));
      setCanAccessCalendar(
        PLANES_CALENDARIO.includes(Number(payload?.id_plan)),
      );
    } catch {
      setCanAccessCalendar(false);
    }
  }, []);

  // ── Google vinculado? ──
  useEffect(() => {
    let cancelled = false;
    chatApi
      .get("/google/is-linked")
      .then(({ data }) => {
        if (!cancelled) setIsGoogleLinked(!!data?.linked);
      })
      .catch(() => {
        if (!cancelled) setIsGoogleLinked(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Toggle calendario ──
  const handleToggleCalendar = () => {
    if (canAccessCalendar === false) {
      Swal.fire({
        icon: "info",
        title: "Sección bloqueada",
        html: "Su plan actual no incluye <b>Calendario</b>.",
        confirmButtonText: "Ver planes",
        showCancelButton: true,
        cancelButtonText: "Cerrar",
        allowOutsideClick: false,
      }).then((r) => {
        if (r.isConfirmed) navigate("plan");
      });
      return;
    }
    setIsOpenMiniCal((prev) => !prev);
    setIsOpen(false);
    setIsOpenNovedades(false);
  };

  // ── Toggle cotizaciones ──
  const handleToggleCotizaciones = async () => {
    if (isCotizacionesOpen) {
      setIsCotizacionesOpen(false);
    } else {
      setIsCotizacionesOpen(true);
      setIsOpen(false);
      setIsOpenNovedades(false);
      setIsOpenMiniCal(false);

      setLoadingCotizaciones(true);
      try {
        const response = await chatApi.get(
          `/cotizaciones/${selectedChat?.id || selectedChat?.psid}`,
        );
        setCotizacionesData(response.data || []);
      } catch (error) {
        console.error("Error al cargar cotizaciones:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudieron cargar las cotizaciones",
          timer: 2000,
          showConfirmButton: false,
        });
        setCotizacionesData([]);
      } finally {
        setLoadingCotizaciones(false);
      }
    }
  };

  // ── Props para ChatRightPanel ──
  const chatRightPanelProps = {
    socketRef,
    id_configuracion,
    selectedChat,
    DEFAULT_AVATAR,

    // Acordeones
    isOpen,
    setIsOpen,
    isOpenNovedades,
    setIsOpenNovedades,
    isOpenMiniCal,
    setIsOpenMiniCal,

    // Calendario
    handleToggleCalendar,
    MiniCalendario,
    isGoogleLinked,

    // Cotizaciones
    activar_cotizacion,
    isCotizacionesOpen,
    handleToggleCotizaciones,
    loadingCotizaciones,
    cotizacionesData,
    Cotizador,

    // Editar contacto
    openEditContact: () => setEditContactOpen(true),
  };

  return (
    <>
      {opciones && (
        <div
          className={`relative col-span-1 h-[calc(100vh_-_130px)] overflow-y-auto custom-scrollbar text-white px-4 duration-700 transition-all bg-[#171931] ${
            animateOut ? "animate-slide-out" : "animate-slide-in"
          }`}
        >
          <ChatRightPanel {...chatRightPanelProps} />
        </div>
      )}

      <EditarContactoDrawer
        open={editContactOpen}
        onClose={() => setEditContactOpen(false)}
        selectedChat={selectedChat}
        onSaved={(updated, editing) => {
          setSelectedChat((prev) => ({
            ...prev,
            nombre_cliente: editing?.nombre ?? prev?.nombre_cliente,
            apellido_cliente: editing?.apellido ?? prev?.apellido_cliente,
            email_cliente: editing?.email ?? prev?.email_cliente,
            celular_cliente: editing?.telefono ?? prev?.celular_cliente,
          }));
        }}
      />
    </>
  );
};

export default DatosUsuarioModerno;
