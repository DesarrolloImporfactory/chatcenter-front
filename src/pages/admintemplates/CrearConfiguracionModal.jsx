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
    window.location.href = "/planes";
  };
  const onBuyAddonClick = () => {
    window.location.href = "/planes?addon=conexion";
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
                className="space-y-4"
              >
                {limitMessage && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3 text-sm">
                    {limitMessage}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Card: Actualizar plan */}
                  <motion.div
                    variants={cardVariants}
                    className="group rounded-2xl border border-[#171931] p-6 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-[#171931] to-[#0061f2] text-white"
                    whileHover={{ y: -5 }}
                    onClick={onUpgradeClick}
                  >
                    <div className="flex items-start justify-between">
                      <h3 className="text-2xl font-semibold">
                        Actualizar plan
                      </h3>
                      <span className="inline-flex items-center rounded-full text-xs px-3 py-1 border border-white bg-white text-[#171931] font-medium">
                        Recomendado
                      </span>
                    </div>
                    <p className="mt-4 text-sm leading-6">
                      Desbloquee más conexiones y funcionalidades al elevar su
                      plan actual. Ideal si su equipo crece o necesita gestionar
                      más números.
                    </p>
                  </motion.div>

                  {/* Card: Conexión adicional */}
                  <motion.div
                    variants={cardVariants}
                    className="group rounded-2xl border border-[#171931] p-6 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-[#171931] to-[#ff8c00] text-white"
                    whileHover={{ y: -5 }}
                    onClick={onBuyAddonClick}
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="text-2xl font-semibold">
                        Comprar conexión adicional
                      </h3>
                      <div className="text-center">
                        <p className="text-3xl font-bold">$10</p>
                        <p className="text-xs">
                          Adquiera una conexión extra por
                        </p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-6">
                      Esta conexión permanecerá asociada permanentemente a su
                      cuenta, sin importar el plan que tenga contratado.
                    </p>
                  </motion.div>
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
