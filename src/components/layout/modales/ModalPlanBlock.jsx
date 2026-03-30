import React from "react";

const BLOCK_CONFIG = {
  TRIAL_EXHAUSTED: {
    icon: (
      <svg
        className="w-6 h-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#0B1426"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    ),
    iconBg: "rgba(11,20,38,0.06)",
    iconBorder: "rgba(11,20,38,0.1)",
    title: "Tu prueba gratuita terminó",
    description:
      "Usaste todas tus imágenes de prueba. Suscríbete para desbloquear 120 imágenes/mes y todas las funciones.",
    showPricing: true,
    actionText: "Ver planes y suscribirme",
    cancelText: "Ahora no",
  },
  PROMO_EXHAUSTED: {
    icon: (
      <svg
        className="w-6 h-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#F59E0B"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    ),
    iconBg: "rgba(245,158,11,0.08)",
    iconBorder: "rgba(245,158,11,0.15)",
    title: "Tus recursos promocionales se agotaron",
    description:
      "Usaste todas las imágenes y ángulos de tu código promocional.",
    showPricing: false,
    actionText: "Continuar",
    cancelText: "Ahora no",
  },
  PLAN_REQUIRED: {
    icon: (
      <svg
        className="w-6 h-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#0B1426"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    iconBg: "rgba(11,20,38,0.06)",
    iconBorder: "rgba(11,20,38,0.1)",
    title: "Plan requerido",
    description:
      "No tienes un plan activo. Elige un plan para acceder a todas las herramientas del ecosistema.",
    showPricing: false,
    actionText: "Elegir un plan",
    cancelText: "Ahora no",
  },
  PLAN_EXPIRED: {
    icon: (
      <svg
        className="w-6 h-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#F59E0B"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    iconBg: "rgba(245,158,11,0.08)",
    iconBorder: "rgba(245,158,11,0.15)",
    title: "Tu plan ha vencido",
    description:
      "Tu suscripción expiró. Renueva para seguir generando contenido y atendiendo clientes.",
    showPricing: false,
    actionText: "Renovar plan",
    cancelText: "Ahora no",
  },
  PLAN_INACTIVE: {
    icon: (
      <svg
        className="w-6 h-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#EF4444"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
    iconBg: "rgba(239,68,68,0.06)",
    iconBorder: "rgba(239,68,68,0.12)",
    title: "Plan inactivo",
    description:
      "Tu plan no está activo en este momento. Reactívalo para continuar usando las herramientas.",
    showPricing: false,
    actionText: "Ver planes",
    cancelText: "Ahora no",
  },
  PLAN_UNAVAILABLE: {
    icon: (
      <svg
        className="w-6 h-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#F59E0B"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    iconBg: "rgba(245,158,11,0.08)",
    iconBorder: "rgba(245,158,11,0.15)",
    title: "Plan no disponible",
    description:
      "El plan que tenías asignado ya no está disponible. Selecciona un nuevo plan para continuar.",
    showPricing: false,
    actionText: "Seleccionar plan",
    cancelText: "Ahora no",
  },
  ACCOUNT_BLOCKED: {
    icon: (
      <svg
        className="w-6 h-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#EF4444"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    ),
    iconBg: "rgba(239,68,68,0.06)",
    iconBorder: "rgba(239,68,68,0.12)",
    title: "Cuenta suspendida",
    description:
      "Tu cuenta no tiene acceso en este momento. Contacta soporte o revisa tu método de pago.",
    showPricing: false,
    actionText: "Ver planes",
    cancelText: "Cerrar",
  },
  TOOL_ACCESS_DENIED: {
    icon: (
      <svg
        className="w-6 h-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#0B1426"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    ),
    iconBg: "rgba(11,20,38,0.06)",
    iconBorder: "rgba(11,20,38,0.1)",
    title: "Herramienta no incluida en tu plan",
    description:
      "Tu plan actual no incluye acceso a esta herramienta. Actualiza para desbloquear todo el ecosistema.",
    showPricing: false,
    actionText: "Actualizar mi plan",
    cancelText: "Volver",
    useBackendMessage: true,
  },
};

const DEFAULT_CONFIG = BLOCK_CONFIG.PLAN_REQUIRED;

const ModalPlanBlock = ({
  open,
  onClose,
  onAction,
  blockCode,
  blockMessage,
  trialInfo,
  promoInfo,
}) => {
  if (!open) return null;
  const config = BLOCK_CONFIG[blockCode] || DEFAULT_CONFIG;

  const isPromoExhausted = blockCode === "PROMO_EXHAUSTED";
  const promoRedirectUrl = promoInfo?.redirect_url || null;
  const promoDescripcion = promoInfo?.descripcion || null;
  const promoCodigo = promoInfo?.codigo || null;

  const displayDescription = isPromoExhausted
    ? promoDescripcion
      ? `Usaste todos los recursos del código "${promoCodigo}". ${promoDescripcion}`
      : config.description
    : config.useBackendMessage && blockMessage
      ? blockMessage
      : config.description;

  const displayActionText = isPromoExhausted
    ? promoRedirectUrl
      ? "Continuar"
      : "Ver planes y suscribirme"
    : config.actionText;

  const handleAction = () => {
    if (isPromoExhausted && promoRedirectUrl) {
      if (promoRedirectUrl.startsWith("http")) {
        window.open(promoRedirectUrl, "_blank");
      } else {
        onAction(promoRedirectUrl);
      }
    } else {
      onAction();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="relative rounded-2xl shadow-2xl w-full max-w-[400px] overflow-hidden bg-white border"
        style={{ borderColor: "rgba(11,20,38,0.1)" }}
      >
        <div
          className="h-1.5 w-full"
          style={{
            background: isPromoExhausted
              ? "linear-gradient(135deg, #F59E0B 0%, #F97316 100%)"
              : "linear-gradient(135deg, #0B1426 0%, #1e293b 100%)",
          }}
        />

        <div className="px-7 pt-7 pb-6">
          <div
            className="mx-auto w-14 h-14 rounded-2xl grid place-items-center mb-5"
            style={{
              background: config.iconBg,
              border: `1px solid ${config.iconBorder}`,
            }}
          >
            {config.icon}
          </div>

          <h3 className="text-center text-lg font-extrabold text-[#0B1426] tracking-tight">
            {config.title}
          </h3>

          <p className="text-center text-[13px] text-slate-500 mt-3 leading-relaxed">
            {displayDescription}
          </p>

          {isPromoExhausted && promoCodigo && (
            <div className="mt-4 flex justify-center">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold"
                style={{
                  color: "#92400E",
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.15)",
                }}
              >
                <svg
                  className="w-3 h-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                  <line x1="7" y1="7" x2="7.01" y2="7" />
                </svg>
                Código: {promoCodigo}
              </span>
            </div>
          )}

          {isPromoExhausted && (
            <div
              className="mt-4 flex items-center justify-center gap-6 py-3 rounded-xl"
              style={{
                background: "rgba(245,158,11,0.04)",
                border: "1px solid rgba(245,158,11,0.1)",
              }}
            >
              <div className="text-center">
                <span className="text-lg font-extrabold text-slate-400">0</span>
                <p className="text-[10px] text-slate-400 mt-0.5">imágenes</p>
              </div>
              <div
                className="w-px h-8"
                style={{ background: "rgba(245,158,11,0.15)" }}
              />
              <div className="text-center">
                <span className="text-lg font-extrabold text-slate-400">0</span>
                <p className="text-[10px] text-slate-400 mt-0.5">ángulos AI</p>
              </div>
            </div>
          )}

          {config.showPricing && (
            <div
              className="mt-5 flex items-center justify-center gap-6 py-3 rounded-xl"
              style={{
                background: "rgba(11,20,38,0.03)",
                border: "1px solid rgba(11,20,38,0.08)",
              }}
            >
              <div className="text-center">
                <span className="text-2xl font-extrabold text-[#0B1426]">
                  $5
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">primer mes</p>
              </div>
              <div
                className="w-px h-9"
                style={{ background: "rgba(11,20,38,0.1)" }}
              />
              <div className="text-center">
                <span className="text-2xl font-extrabold text-[#0B1426]">
                  $29
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">luego/mes</p>
              </div>
            </div>
          )}

          {blockCode === "TRIAL_EXHAUSTED" && trialInfo && (
            <div className="mt-3 text-center">
              <span
                className="inline-block text-[10px] font-semibold px-3 py-1 rounded-full"
                style={{
                  color: "#0B1426",
                  background: "rgba(11,20,38,0.05)",
                  border: "1px solid rgba(11,20,38,0.1)",
                }}
              >
                {trialInfo.used}/{trialInfo.limit} imágenes usadas
              </span>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2.5">
            <button
              onClick={handleAction}
              className="w-full rounded-xl px-4 py-3.5 text-sm font-bold text-white transition-all hover:shadow-lg hover:-translate-y-[1px] active:translate-y-0"
              style={{
                background: isPromoExhausted
                  ? "linear-gradient(135deg, #F59E0B 0%, #F97316 100%)"
                  : "linear-gradient(135deg, #0B1426 0%, #1e293b 100%)",
              }}
            >
              {displayActionText}
            </button>

            <button
              onClick={onClose}
              className="w-full rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-400 hover:bg-slate-50 transition"
            >
              {config.cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalPlanBlock;
