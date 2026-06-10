import React, { useState } from "react";
import chatApi from "../../api/chatcenter";
import { motion, useReducedMotion } from "framer-motion";
import Swal from "sweetalert2";

// Toast flotante (esquina superior derecha)
const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3500,
  timerProgressBar: true,
  didOpen: (el) => {
    el.addEventListener("mouseenter", Swal.stopTimer);
    el.addEventListener("mouseleave", Swal.resumeTimer);
  },
});

const CrearConfiguracionModalWhatsappBusiness = ({
  onClose,
  fetchConfiguraciones,
  setStatusMessage,
  idConfiguracion,
  telefono,
  nombre_configuracion,
}) => {
  const [idWhatsapp, setIdWhatsapp] = useState("");
  const [idBusinessAccount, setIdBusinessAccount] = useState("");
  const [tokenApi, setTokenApi] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const reduce = useReducedMotion();

  const handleActualizarConfiguracionMeta = async () => {
    if (guardando) return;

    if (!idWhatsapp.trim() || !idBusinessAccount.trim() || !tokenApi.trim()) {
      Toast.fire({
        icon: "warning",
        title: "Completa los tres campos para continuar.",
      });
      return;
    }

    setGuardando(true);
    try {
      const resp = await chatApi.post(
        "/whatsapp_managment/actualizarConfiguracionMeta",
        {
          id_telefono: idWhatsapp,
          id_whatsapp: idBusinessAccount,
          token: tokenApi,
          id_configuracion: idConfiguracion,
          nombre_configuracion: nombre_configuracion,
          telefono: telefono,
        },
      );

      if (resp.data.status === 200) {
        setStatusMessage?.({
          type: "success",
          text: "Configuración de WhatsApp Business agregada correctamente.",
        });
        onClose?.();
        fetchConfiguraciones?.();
      } else {
        setStatusMessage?.({
          type: "error",
          text: resp.data.message || "Error al conectar con Meta.",
        });
      }
    } catch (error) {
      console.error("Error al agregar configuración Meta:", error);
      setStatusMessage?.({
        type: "error",
        text: "Error al conectar con el servidor.",
      });
    } finally {
      setGuardando(false);
    }
  };

  const handleClose = () => {
    if (guardando) return; // no cerrar a mitad de una petición
    setIsClosing(true);
    setTimeout(() => {
      onClose?.();
      setIsClosing(false);
    }, 220);
  };

  // Animación self-contained (sin CSS externo) + reduced-motion
  const overlayV = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  };
  const panelV = reduce
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.2 } },
        exit: { opacity: 0, transition: { duration: 0.15 } },
      }
    : {
        hidden: { opacity: 0, scale: 0.96, y: 12 },
        visible: {
          opacity: 1,
          scale: 1,
          y: 0,
          transition: { type: "spring", stiffness: 280, damping: 24 },
        },
        exit: { opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.18 } },
      };

  const inputCls =
    "w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/25 focus:border-[#1d4ed8] focus:bg-white transition-all duration-200 disabled:opacity-60";

  return (
    <motion.div
      variants={overlayV}
      initial="hidden"
      animate={isClosing ? "exit" : "visible"}
      className="fixed inset-0 bg-[#0a1a36]/50 backdrop-blur-md z-50 flex items-center justify-center p-4"
      onMouseDown={(e) => e.target === e.currentTarget && handleClose()}
    >
      <motion.div
        variants={panelV}
        initial="hidden"
        animate={isClosing ? "exit" : "visible"}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden ring-1 ring-black/5"
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#eff6ff] text-[#1d4ed8]">
              <i className="bx bxl-whatsapp text-xl"></i>
            </span>
            <div>
              <h5 className="text-base font-semibold text-[#171931] leading-tight">
                Conectar WhatsApp Business
              </h5>
              <p className="text-[12px] text-slate-500">
                {nombre_configuracion
                  ? `Conexión manual para ${nombre_configuracion}.`
                  : "Ingresa las credenciales de tu cuenta de Meta."}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={guardando}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Cerrar"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Cuerpo */}
        <div className="px-5 py-5 space-y-4 bg-white">
          {/* ID WhatsApp */}
          <div>
            <label className="block text-[#171931] text-[13px] font-medium mb-1.5">
              ID WhatsApp
            </label>
            <div className="relative">
              <i className="bx bx-phone absolute left-3 top-1/2 -translate-y-1/2 text-base text-slate-400"></i>
              <input
                type="text"
                disabled={guardando}
                className={inputCls}
                placeholder="Ingrese el ID de WhatsApp"
                value={idWhatsapp}
                onChange={(e) => setIdWhatsapp(e.target.value)}
              />
            </div>
          </div>

          {/* ID WhatsApp Business */}
          <div>
            <label className="block text-[#171931] text-[13px] font-medium mb-1.5">
              ID WhatsApp Business
            </label>
            <div className="relative">
              <i className="bx bx-buildings absolute left-3 top-1/2 -translate-y-1/2 text-base text-slate-400"></i>
              <input
                type="text"
                disabled={guardando}
                className={inputCls}
                placeholder="Ingrese el ID de WhatsApp Business"
                value={idBusinessAccount}
                onChange={(e) => setIdBusinessAccount(e.target.value)}
              />
            </div>
          </div>

          {/* Token API */}
          <div>
            <label className="block text-[#171931] text-[13px] font-medium mb-1.5">
              Token API
            </label>
            <div className="relative">
              <i className="bx bx-key absolute left-3 top-1/2 -translate-y-1/2 text-base text-slate-400"></i>
              <input
                type="text"
                disabled={guardando}
                className={inputCls}
                placeholder="Ingrese el token de la API"
                value={tokenApi}
                onChange={(e) => setTokenApi(e.target.value)}
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Si necesitas ayuda en este proceso, no dudes en contactar al
              equipo de Soporte.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end bg-gray-50/60 px-5 py-4 border-t border-gray-100 space-x-2.5">
          <button
            onClick={handleClose}
            disabled={guardando}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 font-medium hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cerrar
          </button>
          <button
            onClick={handleActualizarConfiguracionMeta}
            disabled={guardando}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1d4ed8] text-sm text-white font-semibold hover:bg-[#1e40af] shadow-sm transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <i
              className={`bx ${guardando ? "bx-loader-alt bx-spin" : "bx-check"}`}
            ></i>
            {guardando ? "Guardando…" : "Actualizar configuración"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CrearConfiguracionModalWhatsappBusiness;
