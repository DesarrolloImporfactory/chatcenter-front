import React, { useEffect, useState } from "react";
import chatApi from "../../api/chatcenter";
import { jwtDecode } from "jwt-decode";
import { motion, AnimatePresence } from "framer-motion";

const CrearConfiguracionModal = ({
  onClose,
  fetchConfiguraciones,
  setStatusMessage,
}) => {
  const [nombreConfiguracion, setNombreConfiguracion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [idWhatsapp, setIdWhatsapp] = useState("");
  const [idBusinessAccount, setIdBusinessAccount] = useState("");
  const [tokenApi, setTokenApi] = useState("");
  const [userData, setUserData] = useState(null);
  const [idConfiguracion, setIdConfiguracion] = useState(null);

  const [isClosing, setIsClosing] = useState(false);
  const [step, setStep] = useState(1);
  const [countryCode, setCountryCode] = useState("EC");

  // NUEVO: Vista de upgrade si backend devuelve 405
  const [showUpgradeOptions, setShowUpgradeOptions] = useState(false);
  const [limitMessage, setLimitMessage] = useState("");

  const countries = [
    { code: "EC", flag: "🇪🇨", name: "Ecuador", phoneCode: "+593" },
    { code: "CO", flag: "🇨🇴", name: "Colombia", phoneCode: "+57" },
    { code: "MX", flag: "🇲🇽", name: "México", phoneCode: "+52" },
    { code: "AR", flag: "🇦🇷", name: "Argentina", phoneCode: "+54" },
    { code: "BR", flag: "🇧🇷", name: "Brasil", phoneCode: "+55" },
    { code: "CL", flag: "🇨🇱", name: "Chile", phoneCode: "+56" },
    { code: "CR", flag: "🇨🇷", name: "Costa Rica", phoneCode: "+506" },
    { code: "PA", flag: "🇵🇦", name: "Panamá", phoneCode: "+507" },
    { code: "PE", flag: "🇵🇪", name: "Perú", phoneCode: "+51" },
    { code: "PR", flag: "🇵🇷", name: "Puerto Rico", phoneCode: "+1" },
    { code: "VE", flag: "🇻🇪", name: "Venezuela", phoneCode: "+58" },
    { code: "US", flag: "🇺🇸", name: "Estados Unidos", phoneCode: "+1" },
  ];

  const cleanPhoneNumber = (phone) => {
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const phoneWithoutLeadingZero = cleanPhone.startsWith("0")
      ? cleanPhone.slice(1)
      : cleanPhone;

    return countryCode === "EC"
      ? "593" + phoneWithoutLeadingZero
      : countryCode === "CO"
      ? "57" + phoneWithoutLeadingZero
      : countryCode === "MX"
      ? "52" + phoneWithoutLeadingZero
      : countryCode === "AR"
      ? "54" + phoneWithoutLeadingZero
      : countryCode === "BR"
      ? "55" + phoneWithoutLeadingZero
      : countryCode === "CL"
      ? "56" + phoneWithoutLeadingZero
      : countryCode === "CR"
      ? "506" + phoneWithoutLeadingZero
      : countryCode === "PA"
      ? "507" + phoneWithoutLeadingZero
      : countryCode === "PE"
      ? "51" + phoneWithoutLeadingZero
      : countryCode === "PR"
      ? "1" + phoneWithoutLeadingZero
      : countryCode === "VE"
      ? "58" + phoneWithoutLeadingZero
      : countryCode === "US"
      ? "1" + phoneWithoutLeadingZero
      : phoneWithoutLeadingZero;
  };

  // Acciones de los CTA en la vista 405 (ajuste aquí su navegación/checkout)
  const onUpgradeClick = () => {
    window.location.href = "/planes_view";
  };
  // Crea la sesión de Stripe (usa el price fijo en el backend)
  const onBuyAddonClick = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        return Swal.fire({
          icon: "error",
          title: "Token faltante",
          text: "No se encontró token",
        });
      }
      const decoded = jwtDecode(token);
      const id_usuario = decoded.id_usuario;

      const base = window.location.origin;
      const res = await chatApi.post("/stripe_plan/crearSesionAddonConexion", {
        id_usuario,
        success_url: `${base}/usuarios?addon=ok`,
        cancel_url: `${base}/usuarios?addon=cancel`,
      });

      if (res?.data?.url) {
        window.location.href = res.data.url; // Stripe Checkout
      } else {
        throw new Error("No se recibió la URL de Stripe.");
      }
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "No se pudo iniciar el pago",
        text: e?.response?.data?.message || e.message || "Intente nuevamente.",
      });
    }
  };


  
  const handleAgregarConfiguracion = async () => {
    if (!nombreConfiguracion || !telefono) {
      setStatusMessage({
        type: "error",
        text: "Por favor, rellene todos los campos obligatorios.",
      });
      return;
    }

    const cleanNumber = cleanPhoneNumber(telefono);

    if (step === 1) {
      try {
        const resp = await chatApi.post(
          "/configuraciones/agregarConfiguracion",
          {
            nombre_configuracion: nombreConfiguracion,
            telefono: cleanNumber,
            id_usuario: userData.id_usuario,
          }
        );

        if (resp.data.status === 200) {
          setStatusMessage({
            type: "success",
            text: "Configuración agregada correctamente. Ahora puede conectar con Meta.",
          });
          // Guardamos id_configuracion para el paso 2
          const idCfg = resp.data.id_configuracion;
          setIdConfiguracion(idCfg);
          setStep(2);
        } else {
          setStatusMessage({
            type: "error",
            text: resp.data.message || "Error al agregar configuración.",
          });
        }
      } catch (error) {
        const httpStatus = error?.response?.status;
        // 403 por cuota/plan
        if (
          httpStatus === 403 &&
          error?.response?.data?.code === "QUOTA_EXCEEDED"
        ) {
          const backendMsg = error?.response?.data?.message;
          setLimitMessage(
            backendMsg || "Ha alcanzado el límite de conexiones de su plan."
          );
          setShowUpgradeOptions(true); // muestra las dos cards (Actualizar plan / Conexión adicional)
          return;
        }

        // 409 si decide usar Conflict
        if (httpStatus === 409) {
          const backendMsg = error?.response?.data?.message;
          setLimitMessage(backendMsg || "Límite del plan alcanzado.");
          setShowUpgradeOptions(true);
          return;
        }

        console.error("Error al agregar configuración:", error);
        setStatusMessage({
          type: "error",
          text: "Error al conectar con el servidor.",
        });
      }
    } else if (step === 2) {
      try {
        const resp = await chatApi.post(
          "/whatsapp_managment/actualizarConfiguracionMeta",
          {
            id_telefono: idWhatsapp,
            id_whatsapp: idBusinessAccount,
            token: tokenApi,
            id_configuracion: idConfiguracion,
          }
        );

        if (resp.data.status === 200) {
          setStatusMessage({
            type: "success",
            text: "Configuración de Meta agregada correctamente.",
          });
          onClose();
          if (fetchConfiguraciones) fetchConfiguraciones();
        } else {
          setStatusMessage({
            type: "error",
            text: resp.data.message || "Error al conectar con Meta.",
          });
        }
      } catch (error) {
        console.error("Error al agregar configuración Meta:", error);
        setStatusMessage({
          type: "error",
          text: "Error al conectar con el servidor.",
        });
      }
    }
  };

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
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  // Variants para animación suave
  const containerVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.28 } },
    exit: { opacity: 0, y: 12, transition: { duration: 0.2 } },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.25 } },
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div
        className={`bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all duration-300 ${
          isClosing ? "animate-slide-out" : "animate-slide-in"
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h5 className="text-xl font-semibold text-gray-800">
            {showUpgradeOptions
              ? "Límite de conexiones"
              : step === 1
              ? "Agregar Configuración"
              : "Conectar con Meta"}
          </h5>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="p-8 space-y-6 bg-white rounded-2xl shadow-xl border border-gray-100">
          <AnimatePresence mode="wait">
            {showUpgradeOptions ? (
              <motion.div
                key="upgrade-view"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
              >
                {/* Aviso de límite */}
                {limitMessage && (
                  <div className="rounded-xl border border-amber-300/70 bg-amber-50/90 text-amber-900 px-4 py-3 text-sm font-medium">
                    {limitMessage}
                  </div>
                )}

                {/* Opciones premium (sin sombras) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
                  {/* Card: Actualizar plan (morado) */}
                  <div
                    onClick={onUpgradeClick}
                    className="
                      group relative cursor-pointer rounded-2xl
                      border border-slate-200 bg-white p-6
                      overflow-hidden
                      transition-colors duration-200
                      hover:border-[#6d28d9] focus-within:border-[#6d28d9]
                    "
                  >
                    {/* Marcador lateral (inset 1px, sin desbordes) */}
                    <span
                      aria-hidden
                      className="
                        pointer-events-none absolute top-[1px] bottom-[1px] left-[1px]
                        w-[6px] rounded-l-2xl
                        bg-gradient-to-b from-[#8b5cf6] to-[#6d28d9]
                      "
                    />

                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#f5f3ff] text-[#6d28d9]">
                          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M5 12h2.5v5H5v-5Zm5-4h2.5v9H10V8Zm5 2h2.5v7H15v-7ZM4 20h16v2H4zM21 3l-4.5 4.5-2-2L9 11l-1.5-1.5L3 14V12l4.5-4.5L9 9l5.5-5.5 2 2L21 1v2z"/></svg>
                        </span>
                        <h3 className="text-xl font-semibold tracking-tight text-[#171931]">Actualizar plan</h3>
                      </div>
                      <span className="inline-flex items-center rounded-full border border-[#6d28d9]/40 bg-[#f5f3ff] px-2.5 py-1 text-[11px] font-semibold text-[#6d28d9]">
                        Recomendado
                      </span>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-slate-600">
                      Desbloquee más conexiones y funcionalidades elevando su plan actual.
                      Ideal para equipos en crecimiento o para gestionar múltiples números.
                    </p>

                    <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#171931]">
                      Ver planes disponibles
                      <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707A1 1 0 118.707 5.293l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"/>
                      </svg>
                    </div>
                  </div>

                  {/* Card: Comprar conexión adicional (azul) */}
                  <div
                    onClick={onBuyAddonClick}
                    className="
                      group relative cursor-pointer rounded-2xl
                      border border-slate-200 bg-white p-6
                      overflow-hidden
                      transition-colors duration-200
                      hover:border-[#1d4ed8] focus-within:border-[#1d4ed8]
                    "
                  >
                    {/* Marcador lateral (inset 1px, sin desbordes) */}
                    <span
                      aria-hidden
                      className="
                        pointer-events-none absolute top-[1px] bottom-[1px] left-[1px]
                        w-[6px] rounded-l-2xl
                        bg-gradient-to-b from-[#93c5fd] to-[#1d4ed8]
                      "
                    />

                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#eff6ff] text-[#1d4ed8]">
                          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M10 13a5 5 0 010-7.07l2.83-2.83a5 5 0 117.07 7.07l-1.41 1.41-1.41-1.41 1.41-1.41a3 3 0 10-4.24-4.24L11.41 6.3A3 3 0 1015 9h2a5 5 0 11-8.54 3.54L10 13z"/></svg>
                        </span>
                        <h3 className="text-xl font-semibold tracking-tight text-[#171931]">Comprar conexión adicional</h3>
                      </div>
                      <div className="text-right leading-none">
                        <p className="text-3xl font-extrabold text-[#171931]">$10</p>
                        <p className="text-[11px] text-slate-500">por conexión</p>
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-slate-600">
                      Añada una conexión extra asociada a su cuenta, útil para picos de demanda
                      o campañas específicas.
                    </p>

                    <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#171931]">
                      Continuar con la compra
                      <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707A1 1 0 118.707 5.293l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"/>
                      </svg>
                    </div>
                  </div>
                </div>








                {/* Disclaimer empresarial */}
                <div className="mt-1 border-t border-slate-200 pt-4">
                  <div className="flex items-start gap-3 text-[12px] text-slate-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mt-[2px] text-slate-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2a10 10 0 100 20 10 10 0 000-20Zm1 15h-2v-6h2v6Zm-2-8V7h2v2h-2Z"/>
                    </svg>
                    <p>
                      <span className="font-semibold text-[#171931]">Aviso:</span> las conexiones adicionales
                      <span className="font-semibold"> solo permanecerán activas</span> mientras exista
                      un <span className="font-semibold">plan activo</span> en la cuenta.
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : step === 1 ? (
              <motion.div
                key="step-1"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {/* Paso 1: Nombre y teléfono */}
                <div className="mb-6">
                  <label className="block text-gray-900 text-sm font-medium mb-2 tracking-wide">
                    Nombre Configuración
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                    placeholder="Ingrese el nombre de la configuración"
                    value={nombreConfiguracion}
                    onChange={(e) => setNombreConfiguracion(e.target.value)}
                  />
                </div>
            
                <div className="mb-6">
                  <label className="block text-gray-900 text-sm font-medium mb-2 tracking-wide">
                    Teléfono
                  </label>
                  <div className="flex gap-4">
                    <select
                      className="w-1/3 px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                    >
                      {countries.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.flag} {country.name} {country.phoneCode}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      className="w-2/3 px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                      placeholder="Número de teléfono"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                    />
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="step-2"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {/* Paso 2: Meta Connection */}
                <div className="mb-6">
                  <label className="block text-gray-900 text-sm font-medium mb-2 tracking-wide">
                    ID WhatsApp
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                    placeholder="Ingrese el ID de WhatsApp"
                    value={idWhatsapp}
                    onChange={(e) => setIdWhatsapp(e.target.value)}
                  />
                </div>
            
                <div className="mb-6">
                  <label className="block text-gray-900 text-sm font-medium mb-2 tracking-wide">
                    ID WhatsApp Business
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                    placeholder="Ingrese el ID de WhatsApp Business"
                    value={idBusinessAccount}
                    onChange={(e) => setIdBusinessAccount(e.target.value)}
                  />
                </div>
            
                <div className="mb-6">
                  <label className="block text-gray-900 text-sm font-medium mb-2 tracking-wide">
                    Token API
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                    placeholder="Ingrese el token de la API"
                    value={tokenApi}
                    onChange={(e) => setTokenApi(e.target.value)}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>




        <div className="flex justify-end bg-white p-6 border-t border-gray-100 space-x-3">
          <button
            onClick={handleClose}
            className="px-5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-100 hover:border-gray-400 transition-all duration-200"
          >
            Cerrar
          </button>

          {/* Ocultamos el botón principal cuando se muestran las opciones de upgrade */}
          {!showUpgradeOptions && (
            <button
              onClick={handleAgregarConfiguracion}
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-sm transition-all duration-200"
            >
              {step === 1 ? "Agregar Configuración" : "Conectar con Meta"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CrearConfiguracionModal;
