import React, { useState, useEffect } from "react";
import chatApi from "../../../api/chatcenter";

const ShopifyLogo = ({ size = 28 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 109.5 124.5"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M95.6 28.2c-.1-.6-.6-1-1.1-1-.5 0-10.3-.8-10.3-.8s-6.8-6.8-7.5-7.5c-.7-.7-2.1-.5-2.6-.3-.1 0-1.4.4-3.6 1.1-2.2-6.2-6-11.9-12.7-11.9h-.6C55.5 5.6 53.3 4 51.5 4c-15.7.1-23.2 19.6-25.5 29.6-6 1.9-10.3 3.2-10.8 3.3-3.4 1-3.5 1.1-3.9 4.4C11 43.7 0 131.5 0 131.5l75.6 13.1 40.9-10.1S95.7 28.8 95.6 28.2zM67.2 21.4l-4.7 1.4c0-2.4-.3-5.8-1.4-8.7 3.5.7 5.3 4.6 6.1 7.3zM57.9 24.3l-10 3.1c1-3.7 2.8-7.4 5.1-9.8 .8-.9 2-1.8 3.4-2.4 1.4 2.8 1.6 6.8 1.5 9.1zM51.6 8.1c1.1 0 2 .3 2.8.9-1.3.7-2.5 1.7-3.7 3-3 3.2-5.3 8.2-6.2 13-3.3 1-6.5 2-9.5 2.9C37.6 19.5 43.6 8.2 51.6 8.1z"
      fill="#95BF47"
    />
    <path
      d="M94.5 27.2c-.5 0-10.3-.8-10.3-.8s-6.8-6.8-7.5-7.5c-.3-.3-.6-.4-1-.4l-5.7 117 40.9-10.1S95.7 28.8 95.6 28.2c-.1-.6-.6-1-1.1-1z"
      fill="#5E8E3E"
    />
    <path
      d="M58.4 45.8l-4.9 14.5s-4.3-2.3-9.5-2.3c-7.7 0-8.1 4.8-8.1 6 0 6.6 17.2 9.1 17.2 24.6 0 12.2-7.7 20-18.1 20-12.5 0-18.9-7.8-18.9-7.8l3.3-11s6.5 5.6 12.1 5.6c3.6 0 5.1-2.8 5.1-4.9 0-8.6-14.1-9-14.1-23.2 0-11.9 8.6-23.5 25.9-23.5 6.7 0 10 1.9 10 1.9z"
      fill="#fff"
    />
  </svg>
);

const VincularShopifyModal = ({ open, onClose, onConnected, Swal }) => {
  const [shopDomain, setShopDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  });

  useEffect(() => {
    if (!open) return;
    setCheckingStatus(true);
    chatApi
      .get("shopify/status")
      .then((res) => setStatus(res.data || null))
      .catch(() => setStatus(null))
      .finally(() => setCheckingStatus(false));
  }, [open]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shopifyStatus = params.get("shopify_status");
    if (shopifyStatus === "success") {
      const shopName = params.get("shopify_shop") || "Tu tienda";
      Toast.fire({
        icon: "success",
        title: `Shopify conectado: ${decodeURIComponent(shopName)}`,
      });
      const url = new URL(window.location);
      url.searchParams.delete("shopify_status");
      url.searchParams.delete("shopify_shop");
      window.history.replaceState({}, "", url);
      if (onConnected) onConnected();
    } else if (shopifyStatus === "error") {
      const errorCode = params.get("shopify_error") || "unknown";
      Toast.fire({ icon: "error", title: `Error al conectar: ${errorCode}` });
      const url = new URL(window.location);
      url.searchParams.delete("shopify_status");
      url.searchParams.delete("shopify_error");
      window.history.replaceState({}, "", url);
    }
  }, []);

  const handleConnect = async () => {
    const domain = shopDomain.trim();
    if (!domain)
      return Toast.fire({
        icon: "error",
        title: "Ingresa el dominio de tu tienda",
      });
    setLoading(true);
    try {
      const res = await chatApi.post("shopify/auth", { shop_domain: domain });
      if (res.data?.auth_url) window.location.href = res.data.auth_url;
    } catch (err) {
      Toast.fire({
        icon: "error",
        title: err?.response?.data?.message || "Error al conectar",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    const { isConfirmed } = await Swal.fire({
      title: "¿Desconectar Shopify?",
      text: "Tu tienda quedará desvinculada.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Desconectar",
      cancelButtonText: "Cancelar",
    });
    if (!isConfirmed) return;
    try {
      await chatApi.delete("shopify/disconnect");
      setStatus(null);
      Toast.fire({ icon: "success", title: "Shopify desconectado" });
      if (onConnected) onConnected();
    } catch {
      Toast.fire({ icon: "error", title: "Error al desconectar" });
    }
  };

  if (!open) return null;
  const isConnected = status?.connected;
  const shopData = status?.data;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header verde Shopify ── */}
        <div
          className="relative px-6 pt-5 pb-4"
          style={{
            background: "linear-gradient(135deg, #95BF47 0%, #5E8E3E 100%)",
          }}
        >
          <div
            className="absolute -top-8 -right-8 w-32 h-32 rounded-full"
            style={{ background: "rgba(255,255,255,0.08)" }}
          />
          <div
            className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full"
            style={{ background: "rgba(255,255,255,0.05)" }}
          />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-xl grid place-items-center"
                style={{ background: "rgba(255,255,255,0.18)" }}
              >
                <ShopifyLogo size={26} />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-white">
                  {isConnected ? "Shopify conectado" : "Conectar Shopify"}
                </h3>
                <p
                  className="text-[11px]"
                  style={{ color: "rgba(255,255,255,0.75)" }}
                >
                  {isConnected
                    ? "Tu tienda está vinculada"
                    : "Envía imágenes IA a tu tienda"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg grid place-items-center transition-colors"
              style={{ background: "rgba(255,255,255,0.15)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.25)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.15)")
              }
            >
              <i className="bx bx-x text-white text-lg" />
            </button>
          </div>
        </div>

        {/* ── Body blanco ── */}
        <div className="px-6 py-5">
          {checkingStatus ? (
            <div className="flex items-center justify-center py-10">
              <div className="flex flex-col items-center gap-3">
                <svg
                  className="animate-spin w-7 h-7"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="#95BF47"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="#95BF47"
                    d="M4 12a8 8 0 018-8v8z"
                  />
                </svg>
                <span className="text-[11px] text-gray-400">
                  Verificando conexión…
                </span>
              </div>
            </div>
          ) : isConnected ? (
            <div className="space-y-4">
              <div
                className="rounded-xl p-4"
                style={{ background: "#f0f7e6", border: "1px solid #d4e8b8" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg grid place-items-center"
                    style={{ background: "rgba(149,191,71,0.2)" }}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full animate-pulse"
                      style={{ background: "#5E8E3E" }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">
                      {shopData?.shop_name || shopData?.shop_domain}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {shopData?.shop_domain}
                    </p>
                  </div>
                  <ShopifyLogo size={22} />
                </div>
                {shopData?.shop_email && (
                  <div
                    className="mt-3 pt-3"
                    style={{ borderTop: "1px solid #d4e8b8" }}
                  >
                    <div className="flex items-center gap-2">
                      <i className="bx bx-envelope text-xs text-gray-400" />
                      <span className="text-[11px] text-gray-500">
                        {shopData.shop_email}
                      </span>
                    </div>
                  </div>
                )}
                {shopData?.ultima_sincronizacion && (
                  <div className="flex items-center gap-2 mt-2">
                    <i className="bx bx-time text-xs text-gray-300" />
                    <span className="text-[10px] text-gray-400">
                      Última sync:{" "}
                      {new Date(
                        shopData.ultima_sincronizacion,
                      ).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={handleDisconnect}
                className="w-full py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#ef4444",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#fee2e2")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#fef2f2")
                }
              >
                <i className="bx bx-unlink mr-1.5" />
                Desconectar tienda
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs leading-relaxed text-gray-500">
                Conecta tu tienda Shopify para enviar las imágenes generadas con
                IA directamente a tus productos — al carrusel o a la
                descripción.
              </p>
              <div>
                <label className="text-[11px] font-bold mb-1.5 block text-gray-600">
                  Dominio de tu tienda
                </label>
                <div className="flex items-stretch">
                  <input
                    type="text"
                    value={shopDomain}
                    onChange={(e) => setShopDomain(e.target.value)}
                    placeholder="mi-tienda"
                    className="flex-1 px-3 py-2.5 rounded-l-xl text-sm text-gray-800 placeholder-gray-300 outline-none transition-colors"
                    style={{
                      background: "#f8faf5",
                      border: "1px solid #e2e8d9",
                      borderRight: "none",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#95BF47")}
                    onBlur={(e) => (e.target.style.borderColor = "#e2e8d9")}
                    onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                    disabled={loading}
                  />
                  <span
                    className="px-3 flex items-center rounded-r-xl text-[11px] font-medium shrink-0"
                    style={{
                      background: "#f0f7e6",
                      border: "1px solid #e2e8d9",
                      borderLeft: "none",
                      color: "#5E8E3E",
                    }}
                  >
                    .myshopify.com
                  </span>
                </div>
                <p className="text-[10px] mt-1.5 text-gray-300">
                  Admin de Shopify → Settings → Domains
                </p>
              </div>
              <button
                onClick={handleConnect}
                disabled={loading || !shopDomain.trim()}
                className="w-full py-3 rounded-xl text-xs font-bold text-white transition-all active:scale-[0.98] disabled:opacity-40"
                style={{
                  background: loading
                    ? "rgba(149,191,71,0.4)"
                    : "linear-gradient(135deg, #95BF47 0%, #5E8E3E 100%)",
                  boxShadow: loading
                    ? "none"
                    : "0 4px 20px rgba(149,191,71,0.25)",
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="white"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="white"
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>
                    Conectando con Shopify…
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <ShopifyLogo size={16} /> Conectar con Shopify
                  </span>
                )}
              </button>
              <div
                className="rounded-xl p-3"
                style={{ background: "#f8faf5", border: "1px solid #e8f0da" }}
              >
                <p className="text-[10px] leading-relaxed text-gray-400">
                  <i
                    className="bx bx-shield-quarter mr-1"
                    style={{ color: "#95BF47" }}
                  />
                  Serás redirigido a Shopify para autorizar. Solo pedimos
                  permisos de{" "}
                  <strong className="text-gray-500">
                    productos y archivos
                  </strong>
                  . No accedemos a pagos, clientes ni datos sensibles.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VincularShopifyModal;
