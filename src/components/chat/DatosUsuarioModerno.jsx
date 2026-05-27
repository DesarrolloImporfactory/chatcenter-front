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
  handleOpciones,
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
          className={`relative col-start-4 row-start-1 row-span-2 h-screen text-white bg-[#171931] flex flex-col overflow-hidden duration-700 transition-all ${
            animateOut ? "animate-slide-out" : "animate-slide-in"
          }`}
        >
          {/* ═══ Header (fijo arriba) ═══ */}
          <div className="shrink-0 backdrop-blur-md bg-[#171931]/95 z-20">
            <div className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-violet-500/[0.05] border border-violet-400/20">
                  <i className="bx bx-id-card text-violet-300 text-[16px]" />
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="text-[8px] uppercase tracking-[0.22em] text-white/35 font-semibold">
                    Panel
                  </span>
                  <h2 className="text-[12px] text-white font-bold tracking-wide uppercase">
                    Información del cliente
                  </h2>
                </div>
              </div>

              <button
                onClick={handleOpciones}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.10] border border-white/[0.06] hover:border-white/15 text-white/55 hover:text-white transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                aria-label="Cerrar panel"
                title="Cerrar panel"
              >
                <i className="bx bx-x text-[18px]" />
              </button>
            </div>

            {/* Divider con gradiente sutil */}
            <div className="h-px bg-gradient-to-r from-transparent via-white/[0.10] to-transparent" />
          </div>

          {/* ═══ Contenido scrolleable ═══ */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 pt-2">
            <ChatRightPanel {...chatRightPanelProps} />
          </div>

          {/* ═══ Footer (fijo abajo) ═══ */}
          <div className="shrink-0 border-t border-white/[0.06] px-5 py-3 bg-gradient-to-b from-transparent to-white/[0.02]">
            <div className="flex items-center justify-center gap-2 text-[10px]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
                <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-white font-semibold tracking-wide">
                ImporChat
              </span>
              <span className="text-white/25">·</span>
              <span className="text-white/70 font-medium">Conectado</span>
            </div>
          </div>
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
