import React, { useEffect, useState } from "react";
import chatApi from "../../api/chatcenter";
import { jwtDecode } from "jwt-decode";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";

// Toast flotante (esquina superior derecha) — se monta sobre el modal, no lo tapa el blur
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

  // Estados de carga (evitan doble clic / peticiones duplicadas)
  const [addonLoading, setAddonLoading] = useState(false);
  const [savingNegocio, setSavingNegocio] = useState(false);

  // Placeholder rotativo para el nombre del negocio
  const placeholdersNombre = [
    "Ej.: Power Online",
    "Ej.: Compra EC",
    "Ej.: Mega Ofertas Pro",
  ];
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % placeholdersNombre.length);
    }, 3000);
    return () => clearInterval(id);
  }, []);

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

  // ───────── Preview / validación del teléfono ─────────
  const telDigitos = (telefono || "").replace(/\D/g, "");
  const telNacional = telDigitos.startsWith("0")
    ? telDigitos.slice(1)
    : telDigitos;
  const telValido = telNacional.length >= 7;
  const numeroCanonico = telNacional ? "+" + cleanPhoneNumber(telefono) : "";
  const puedeGuardar = nombreConfiguracion.trim() && telValido;

  // CTA upgrade
  const onUpgradeClick = () => {
    if (addonLoading) return;
    window.location.href = "/planes";
  };

  // CTA comprar conexión adicional (addon)
  const onBuyAddonClick = async (cantidad = 1) => {
    if (addonLoading) return; // guard anti doble clic
    setAddonLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        Toast.fire({ icon: "error", title: "Sesión expirada. Inicia sesión." });
        return;
      }
      const decoded = jwtDecode(token);
      const id_usuario = decoded.id_usuario;

      const res = await chatApi.post("/stripe_plan/comprarAddon", {
        id_usuario,
        clave: "conexion_adicional",
        cantidad,
      });
      const data = res?.data || {};

      // Cobrado y aplicado al instante
      if (data.success && !data.actionRequired) {
        await Swal.fire({
          icon: "success",
          iconColor: "#16a34a",
          title: data.en_trial
            ? "¡Activada en tu prueba!"
            : "¡Conexión adicional activada!",
          html: `
            <p style="margin:6px 0 0;color:#475569;font-size:14px;line-height:1.55">
              ${
                data.en_trial
                  ? "La usarás <b style='color:#0a1a36'>gratis durante tu prueba</b>. Se cobrará junto con tu plan cuando termine el período."
                  : "Tu nueva conexión ya está disponible.<br/>Ya puedes crear tu negocio."
              }
            </p>
          `,
          timer: 5000,
          timerProgressBar: true,
          showConfirmButton: true,
          confirmButtonText: "Crear ahora",
          confirmButtonColor: "#1d4ed8",
          allowOutsideClick: false,
          customClass: { popup: "rounded-2xl" },
        });
        setShowUpgradeOptions(false);
        return;
      }

      // Requiere completar pago (3DS) → página de Stripe
      if (data.actionRequired && data.hosted_invoice_url) {
        window.location.href = data.hosted_invoice_url;
        return;
      }

      throw new Error(data.message || "No se pudo procesar la conexión.");
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "No se pudo agregar la conexión",
        text: e?.response?.data?.message || e.message || "Intente nuevamente.",
        confirmButtonColor: "#1d4ed8",
        customClass: { popup: "rounded-2xl" },
      });
    } finally {
      setAddonLoading(false);
    }
  };

  const handleAgregarConfiguracion = async () => {
    if (savingNegocio) return;

    const soloDigitos = (telefono || "").replace(/[^0-9]/g, "");
    const nacional = soloDigitos.startsWith("0")
      ? soloDigitos.slice(1)
      : soloDigitos;

    if (!nombreConfiguracion.trim() || !nacional) {
      Toast.fire({
        icon: "warning",
        title: "Completa el nombre y el teléfono.",
      });
      return;
    }

    // Evita guardar solo con el código de país
    if (nacional.length < 7) {
      Toast.fire({
        icon: "warning",
        title: "Ingresa un número válido.",
      });
      return;
    }

    const cleanNumber = "+" + cleanPhoneNumber(telefono);

    setSavingNegocio(true);
    try {
      const resp = await chatApi.post(
        "/configuraciones/agregarConfiguracion",
        {
          nombre_configuracion: nombreConfiguracion,
          telefono: cleanNumber,
          id_usuario: userData.id_usuario,
        },
        { silentError: true },
      );

      if (resp.data.status === 200) {
        setStatusMessage?.({
          type: "success",
          text: "Negocio agregado correctamente. Podrá conectar con Meta desde la tarjeta cuando desee.",
        });
        await fetchConfiguraciones?.();
        onClose?.();
      } else {
        Toast.fire({
          icon: "error",
          title: resp.data.message || "Error al agregar el negocio.",
        });
      }
    } catch (error) {
      // CARD_CAPTURE_REQUIRED y los plan-block ya abren su propio modal global
      // en el interceptor. Si disparamos un Toast aquí, SweetAlert2 lo reemplaza
      // y el usuario nunca ve "Registrar tarjeta".
      if (
        error?._handledByInterceptor ||
        error?.response?.data?.code === "CARD_CAPTURE_REQUIRED"
      ) {
        return;
      }

      const httpStatus = error?.response?.status;
      const backendMsg = error?.response?.data?.message;

      if (
        httpStatus === 403 &&
        error?.response?.data?.code === "QUOTA_EXCEEDED"
      ) {
        setLimitMessage(
          backendMsg || "Ha alcanzado el límite de conexiones de su plan.",
        );
        setShowUpgradeOptions(true);
        return;
      }
      if (httpStatus === 409) {
        setLimitMessage(backendMsg || "Límite del plan alcanzado.");
        setShowUpgradeOptions(true);
        return;
      }

      console.error("Error al agregar configuración:", error);

      if (error?.response) {
        Toast.fire({
          icon: "error",
          title: backendMsg || "No se pudo agregar el negocio.",
        });
      } else {
        Toast.fire({
          icon: "error",
          title: "Error al conectar con el servidor.",
        });
      }
    } finally {
      setSavingNegocio(false);
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
    if (addonLoading || savingNegocio) return; // no cerrar a mitad de una petición
    setIsClosing(true);
    setTimeout(() => {
      onClose?.();
      setIsClosing(false);
    }, 300);
  };

  // Animaciones
  const containerVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.28 } },
    exit: { opacity: 0, y: 12, transition: { duration: 0.2 } },
  };

  return (
    <div className="fixed inset-0 bg-[#0a1a36]/50 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all duration-300 ${
          isClosing ? "animate-slide-out" : "animate-slide-in"
        }`}
      >
        <AnimatePresence mode="wait">
          {showUpgradeOptions ? (
            /* ====================== VISTA UPGRADE ====================== */
            <motion.div
              key="upgrade-view"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* Cabecera con degradé azul de marca */}
              <div className="relative bg-gradient-to-br from-[#0a1a36] via-[#102a5c] to-[#1e4fd6] px-6 pt-6 pb-7 text-center">
                <button
                  onClick={handleClose}
                  disabled={addonLoading}
                  className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Cerrar"
                >
                  <i className="fas fa-times text-sm"></i>
                </button>

                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/20 backdrop-blur">
                  <i className="bx bx-trending-up text-2xl"></i>
                </span>
                <h3 className="mt-3 text-base font-bold tracking-tight text-white">
                  Tu operación está creciendo
                </h3>
                <p className="mx-auto mt-1 max-w-xs text-[12px] leading-4 text-white/70">
                  Has alcanzado el límite de conexiones disponibles en tu plan.
                  Agrega una nueva conexión en segundos o actualiza tu plan para
                  acceder a más capacidad y beneficios.
                </p>
              </div>

              {/* Cuerpo compacto */}
              <div className="px-5 py-5 space-y-2.5">
                {/* Opción principal: Actualizar plan */}
                <button
                  onClick={onUpgradeClick}
                  disabled={addonLoading}
                  className="group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border-2 border-[#1d4ed8] bg-gradient-to-r from-[#eff6ff] to-white p-3.5 text-left transition-all duration-200 hover:shadow-md hover:shadow-[#1d4ed8]/15 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="absolute right-2.5 top-2.5 inline-flex items-center rounded-full bg-[#1d4ed8] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                    Recomendado
                  </span>
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1d4ed8] text-white shadow-sm">
                    <i className="bx bx-rocket text-xl"></i>
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-bold text-[#171931]">
                      Mejorar mi plan
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-4 text-slate-500">
                      Más conexiones incluidas y mejores beneficios por cada
                      herramienta.
                    </span>
                  </span>
                  <i className="bx bx-chevron-right text-xl text-[#1d4ed8] transition-transform group-hover:translate-x-1"></i>
                </button>

                {/* Opción secundaria: Conexión adicional */}
                <button
                  onClick={() => onBuyAddonClick(1)}
                  disabled={addonLoading}
                  className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-left transition-all duration-200 hover:border-[#171931]/40 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-80"
                >
                  <span
                    className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      addonLoading
                        ? "bg-[#eff6ff] text-[#1d4ed8]"
                        : "bg-slate-100 text-[#171931]"
                    }`}
                  >
                    <i
                      className={`bx text-xl ${
                        addonLoading
                          ? "bx-loader-alt bx-spin"
                          : "bx-plus-circle"
                      }`}
                    ></i>
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-bold text-[#171931]">
                      {addonLoading ? "Procesando…" : "Solo una conexión más"}
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-4 text-slate-500">
                      {addonLoading
                        ? "Estamos activando tu conexión, un momento."
                        : "Se suma a tu plan de forma recurrente."}
                    </span>
                  </span>
                  {!addonLoading && (
                    <span className="text-right leading-none">
                      <span className="block text-base font-extrabold text-[#171931]">
                        +$10
                      </span>
                      <span className="block text-[9px] text-slate-400">
                        /mes
                      </span>
                    </span>
                  )}
                </button>

                {/* Nota de cobro */}
                <p className="flex items-start gap-1.5 px-0.5 pt-0.5 text-[10px] leading-3.5 text-slate-400">
                  <i className="bx bx-info-circle text-[12px] mt-px"></i>
                  <span>
                    Ej.: un plan de $29/mes pasaría a $39/mes. La conexión
                    adicional se mantiene activa mientras tu plan siga activo.
                  </span>
                </p>

                {/* Salida discreta */}
                <button
                  onClick={handleClose}
                  disabled={addonLoading}
                  className="w-full rounded-lg py-1.5 text-center text-[12px] font-medium text-slate-400 transition-colors hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Ahora no
                </button>
              </div>
            </motion.div>
          ) : (
            /* ====================== VISTA CREAR (compacta) ====================== */
            <motion.div
              key="step-create"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#eff6ff] text-[#1d4ed8]">
                    <i className="bx bx-store-alt text-xl"></i>
                  </span>
                  <div>
                    <h5 className="text-base font-semibold text-[#171931] leading-tight">
                      Agregar negocio
                    </h5>
                    <p className="text-[12px] text-slate-500">
                      Conéctalo a WhatsApp y vende en piloto automático con IA.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  disabled={savingNegocio || !puedeGuardar}
                  className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="px-5 py-5 space-y-4 bg-white">
                {/* Nombre del negocio */}
                <div>
                  <label className="block text-[#171931] text-[13px] font-medium mb-1.5">
                    Nombre del negocio
                  </label>
                  <div className="relative">
                    <i className="bx bx-purchase-tag absolute left-3 top-1/2 -translate-y-1/2 text-base text-slate-400"></i>
                    <input
                      type="text"
                      disabled={savingNegocio}
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/25 focus:border-[#1d4ed8] focus:bg-white transition-all duration-200 disabled:opacity-60"
                      placeholder={placeholdersNombre[placeholderIndex]}
                      value={nombreConfiguracion}
                      onChange={(e) => setNombreConfiguracion(e.target.value)}
                    />
                  </div>
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block text-[#171931] text-[13px] font-medium mb-1.5">
                    Teléfono
                  </label>
                  <div className="flex gap-2">
                    <select
                      disabled={savingNegocio}
                      className="w-1/3 px-2 py-2.5 border border-gray-300 rounded-lg bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/25 focus:border-[#1d4ed8] transition-all duration-200 disabled:opacity-60"
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                    >
                      {countries.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.flag} {country.phoneCode}
                        </option>
                      ))}
                    </select>
                    <div className="relative w-2/3">
                      <i className="bx bx-phone absolute left-3 top-1/2 -translate-y-1/2 text-base text-slate-400"></i>
                      <input
                        type="text"
                        inputMode="numeric"
                        disabled={savingNegocio}
                        className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/25 focus:border-[#1d4ed8] focus:bg-white transition-all duration-200 disabled:opacity-60"
                        placeholder="Número sin código de país"
                        value={telefono}
                        onChange={(e) =>
                          setTelefono(e.target.value.replace(/\D/g, ""))
                        }
                      />
                    </div>
                  </div>

                  {/* Aviso informativo: muestra el número canónico final */}
                  {telNacional.length > 0 ? (
                    <p className="mt-1.5 flex items-center gap-1 text-[12px] text-slate-500">
                      <i className="bx bx-info-circle"></i>
                      Se guardará como:&nbsp;
                      <span className="font-semibold text-[#171931]">
                        {numeroCanonico}
                      </span>
                    </p>
                  ) : (
                    <p className="mt-1.5 flex items-center gap-1 text-[12px] text-slate-500">
                      <i className="bx bx-info-circle"></i>
                      Elige el país y escribe el número sin el código de país.
                    </p>
                  )}

                  {/* Aviso en rojo: número incompleto */}
                  {telNacional.length > 0 && !telValido && (
                    <p className="mt-1 flex items-center gap-1 text-[12px] font-medium text-rose-600">
                      <i className="bx bx-error-circle"></i>
                      El número está incompleto.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end bg-gray-50/60 px-5 py-4 border-t border-gray-100 space-x-2.5">
                <button
                  onClick={handleClose}
                  disabled={savingNegocio}
                  className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 font-medium hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cerrar
                </button>
                <button
                  onClick={handleAgregarConfiguracion}
                  disabled={savingNegocio || !puedeGuardar}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1d4ed8] text-sm text-white font-semibold hover:bg-[#1e40af] shadow-sm transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <i
                    className={`bx ${
                      savingNegocio ? "bx-loader-alt bx-spin" : "bx-check"
                    }`}
                  ></i>
                  {savingNegocio ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CrearConfiguracionModal;
