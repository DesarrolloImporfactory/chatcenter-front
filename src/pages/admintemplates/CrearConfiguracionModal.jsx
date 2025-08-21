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
  const [userData, setUserData] = useState(null);

  const [isClosing, setIsClosing] = useState(false);
  const [countryCode, setCountryCode] = useState("EC");

  // Vista de upgrade si backend devuelve límite
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

  // CTA upgrade/cómprar adicional
  const onUpgradeClick = () => {
    window.location.href = "/planes_view";
  };

  const onBuyAddonClick = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        return window.Swal?.fire?.({
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
      window.Swal?.fire?.({
        icon: "error",
        title: "No se pudo iniciar el pago",
        text: e?.response?.data?.message || e.message || "Intente nuevamente.",
      });
    }
  };

  const onBuyAddonSubusuarioClick = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        return window.Swal?.fire({
          icon: "error",
          title: "Token faltante",
          text: "No se encontró token",
        });
      }
      const decoded = jwtDecode(token);
      const id_usuario = decoded.id_usuario;

      const base = window.location.origin;
      const res = await chatApi.post("/stripe_plan/crearSesionAddonSubusuario", {
        id_usuario,
      });

      if (res?.data?.url) {
        window.location.href = res.data.url; // redirige a Stripe
      } else {
        throw new Error("No se recibió la URL de Stripe.");
      }
    } catch (e) {
      window.Swal?.fire({
        icon: "error",
        title: "No se pudo iniciar el pago",
        text: e?.response?.data?.message || e.message || "Intente nuevamente.",
      });
    }
  };


  const handleAgregarConfiguracion = async () => {
    if (!nombreConfiguracion || !telefono) {
      setStatusMessage?.({
        type: "error",
        text: "Por favor, rellene todos los campos obligatorios.",
      });
      return;
    }

    const cleanNumber = cleanPhoneNumber(telefono);

    try {
      const resp = await chatApi.post("/configuraciones/agregarConfiguracion", {
        nombre_configuracion: nombreConfiguracion,
        telefono: cleanNumber,
        id_usuario: userData.id_usuario,
      });

      if (resp.data.status === 200) {
        setStatusMessage?.({
          type: "success",
          text: "Configuración agregada correctamente. Podrá conectar con Meta desde la tarjeta cuando desee.",
        });
        // refrescar lista en el padre y cerrar
        await fetchConfiguraciones?.();
        onClose?.();
      } else {
        setStatusMessage?.({
          type: "error",
          text: resp.data.message || "Error al agregar configuración.",
        });
      }
    } catch (error) {
      const httpStatus = error?.response?.status;
      // límite de plan
      if (
        httpStatus === 403 &&
        error?.response?.data?.code === "QUOTA_EXCEEDED"
      ) {
        const backendMsg = error?.response?.data?.message;
        setLimitMessage(
          backendMsg || "Ha alcanzado el límite de conexiones de su plan."
        );
        setShowUpgradeOptions(true);
        return;
      }
      if (httpStatus === 409) {
        const backendMsg = error?.response?.data?.message;
        setLimitMessage(backendMsg || "Límite del plan alcanzado.");
        setShowUpgradeOptions(true);
        return;
      }

      console.error("Error al agregar configuración:", error);
      setStatusMessage?.({
        type: "error",
        text: "Error al conectar con el servidor.",
      });
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
      onClose?.();
      setIsClosing(false);
    }, 300);
  };

  // Animaciones (puedes dejarlas)
  const containerVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.28 } },
    exit: { opacity: 0, y: 12, transition: { duration: 0.2 } },
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
              : "Agregar Configuración"}
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
                {limitMessage && (
                  <div className="rounded-xl border border-amber-300/70 bg-amber-50/90 text-amber-900 px-4 py-3 text-sm font-medium">
                    {limitMessage}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
                  {/* Card: Actualizar plan */}
                  <div
                    onClick={onUpgradeClick}
                    className="group relative cursor-pointer rounded-2xl border border-slate-200 bg-white p-6 overflow-hidden transition-colors duration-200 hover:border-[#6d28d9] focus-within:border-[#6d28d9]"
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute top-[1px] bottom-[1px] left-[1px] w-[6px] rounded-l-2xl bg-gradient-to-b from-[#8b5cf6] to-[#6d28d9]"
                    />
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#f5f3ff] text-[#6d28d9]">
                          <i class='bx bx-refresh'></i>
                        </span>
                        <h3 className="text-xl font-semibold tracking-tight text-[#171931]">
                          Actualizar plan
                        </h3>
                      </div>
                      <span className="inline-flex items-center rounded-full border border-[#6d28d9]/40 bg-[#f5f3ff] px-2.5 py-1 text-[11px] font-semibold text-[#6d28d9]">
                        Recomendado
                      </span>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-600">
                      Desbloquee más conexiones elevando su plan actual.
                    </p>
                    <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#171931]">
                      Ver planes disponibles
                      <svg
                        className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707A1 1 0 118.707 5.293l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
                      </svg>
                    </div>
                  </div>

                  {/* Card: Comprar conexión adicional */}
                  <div
                    onClick={onBuyAddonClick}
                    className="group relative cursor-pointer rounded-2xl border border-slate-200 bg-white p-6 overflow-hidden transition-colors duration-200 hover:border-[#1d4ed8] focus-within:border-[#1d4ed8]"
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute top-[1px] bottom-[1px] left-[1px] w-[6px] rounded-l-2xl bg-gradient-to-b from-[#93c5fd] to-[#1d4ed8]"
                    />
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#eff6ff] text-[#1d4ed8]">
                          <i class='bx bx-plug'></i>
                        </span>
                        <h3 className="text-xl font-semibold tracking-tight text-[#171931]">
                          Comprar conexión adicional
                        </h3>
                      </div>
                      <div className="text-right leading-none">
                        <p className="text-3xl font-extrabold text-[#171931]">
                          $10
                        </p>
                        <p className="text-[11px] text-slate-500">
                          por conexión
                        </p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-600">
                      Añada una conexión extra asociada a su cuenta.
                    </p>
                    <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#171931]">
                      Continuar con la compra
                      <svg
                        className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707A1 1 0 118.707 5.293l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
                      </svg>
                    </div>
                  </div>

                  {/* Card: Comprar subusuario adicional */}
                  <div
                    onClick={onBuyAddonSubusuarioClick}
                    className="group relative cursor-pointer rounded-2xl border border-slate-200 bg-white p-6 overflow-hidden transition-colors duration-200 hover:border-[#16a34a] focus-within:border-[#16a34a]"
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute top-[1px] bottom-[1px] left-[1px] w-[6px] rounded-l-2xl bg-gradient-to-b from-[#bbf7d0] to-[#16a34a]"
                    />
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#dcfce7] text-[#16a34a]">
                          <i class='bx bxs-user-plus'></i>
                        </span>
                        <h3 className="text-xl font-semibold tracking-tight text-[#171931]">
                          Comprar subusuario adicional
                        </h3>
                      </div>
                      <div className="text-right leading-none">
                        <p className="text-3xl font-extrabold text-[#171931]">
                          $5
                        </p>
                        <p className="text-[11px] text-slate-500">por usuario</p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-600">
                      Agrega un subusuario extra a tu cuenta para gestionar mensajes.
                    </p>
                    <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#171931]">
                      Continuar con la compra
                      <svg
                        className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707A1 1 0 118.707 5.293l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
                      </svg>
                    </div>
                  </div>

                </div>

                <div className="mt-1 border-t border-slate-200 pt-4">
                  <div className="flex items-start gap-3 text-[12px] text-slate-600">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mt-[2px] text-slate-500"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 2a10 10 0 100 20 10 10 0 000-20Zm1 15h-2v-6h2v6Zm-2-8V7h2v2h-2Z" />
                    </svg>
                    <p>
                      <span className="font-semibold text-[#171931]">
                        Aviso:
                      </span>{" "}
                      las conexiones adicionales
                      <span className="font-semibold">
                        {" "}
                        solo permanecerán activas
                      </span>{" "}
                      mientras exista un
                      <span className="font-semibold"> plan activo</span> en la
                      cuenta.
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="step-create"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {/* Crear configuración (único paso) */}
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

          {!showUpgradeOptions && (
            <button
              onClick={handleAgregarConfiguracion}
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-sm transition-all duration-200"
            >
              Guardar configuración
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CrearConfiguracionModal;
