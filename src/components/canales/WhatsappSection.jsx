// WhatsappSection.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import chatApi from "../../api/chatcenter";
import SectionHeader from "./SectionHeader";
import StatusPill from "./StatusPill";
import ChannelCard from "./ChannelCard";
import AdministradorPlantillas2 from "../../pages/admintemplates/AdministradorPlantillas2";

export default function WhatsappSection() {
  const [init, setInit] = useState(true); // 👈 NUEVO
  const [loading, setLoading] = useState(false);
  const [statusToast, setStatusToast] = useState(null);
  const [connected, setConnected] = useState(false);
  const [hasNumbers, setHasNumbers] = useState(false);
  const [fetched, setFetched] = useState(false);

  const adminRef = useRef(null);

  const id_configuracion = useMemo(() => {
    const idc = localStorage.getItem("id_configuracion");
    return idc ? parseInt(idc) : null;
  }, []);

  // Skeleton compacto (mismo tamaño que el de IG/WA)
  const CardSkeleton = () => (
    <div className="rounded-3xl border border-gray-100 p-5 shadow-xl bg-white">
      <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-2" />
      <div className="h-4 w-80 bg-gray-100 rounded animate-pulse mb-4" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    </div>
  );

  const fetchNumbers = async () => {
    if (!id_configuracion) {
      setInit(false); // sin id, no bloquees la vista
      return;
    }
    try {
      setLoading(true);
      setFetched(false);
      const minHold = new Promise((r) => setTimeout(r, 300)); // 👈 evita flash
      const req = chatApi.post("/whatsapp_managment/ObtenerNumeros", {
        id_configuracion,
      });
      const [{ data }] = await Promise.all([req, minHold]);

      const nums = data?.data || [];
      setHasNumbers(nums.length > 0);
      setConnected(
        nums.some((n) => (n.status || "").toUpperCase() === "CONNECTED")
      );
    } catch {
      setHasNumbers(false);
      setConnected(false);
    } finally {
      setFetched(true);
      setLoading(false);
      setInit(false); // 👈 ya podemos decidir qué mostrar
    }
  };

  useEffect(() => {
    fetchNumbers();
    const onFocus = () => fetchNumbers();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [id_configuracion]);

  /* SDK Facebook e integraciones (sin cambios de lógica) */
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

  const handleConnectWhatsApp = () => {
    if (!window.FB) {
      setStatusToast({
        type: "error",
        text: "El SDK de Facebook aún no está listo.",
      });
      return;
    }
    window.FB.login(
      (response) => {
        (async () => {
          const code = response?.authResponse?.code;
          if (!code) {
            setStatusToast({
              type: "error",
              text: "No se recibió el código de autorización.",
            });
            return;
          }
          try {
            const { data } = await chatApi.post(
              "/whatsapp_managment/embeddedSignupComplete",
              { code, id_configuracion }
            );
            if (data.success) {
              setStatusToast({
                type: "success",
                text: "✅ Número conectado correctamente.",
              });
              fetchNumbers();
            } else {
              throw new Error(data.message || "Error inesperado.");
            }
          } catch (err) {
            const mensaje =
              err?.response?.data?.message || "Error al activar el número.";
            const linkWhatsApp = err?.response?.data?.contacto;
            setStatusToast({
              type: "error",
              text: linkWhatsApp
                ? `${mensaje} 👉 Haz clic para contactarnos por WhatsApp`
                : mensaje,
              extra: linkWhatsApp || null,
            });
          }
        })();
      },
      {
        config_id: "2295613834169297",
        response_type: "code",
        override_default_response_type: true,
        scope: "whatsapp_business_management,whatsapp_business_messaging",
        extras: {
          featureType: "whatsapp_business_app_onboarding",
          setup: {},
          sessionInfoVersion: "3",
        },
      }
    );
  };

  const connectEnabled = fetched && !connected;
  const connectLabel = connected ? "WhatsApp Conectado" : "Conectar WhatsApp";
  const showOnboarding = fetched && !connected;

  // 👇 Mientras decide (init), mostramos skeleton y nada más
  if (init) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {statusToast && (
        <div
          className={`px-4 py-2 rounded-xl shadow ${
            statusToast.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
              : "bg-rose-50 text-rose-800 border border-rose-100"
          }`}
        >
          {statusToast.text}{" "}
          {statusToast.extra && (
            <a
              href={statusToast.extra}
              target="_blank"
              rel="noreferrer"
              className="underline font-semibold"
            >
              Abrir WhatsApp
            </a>
          )}
        </div>
      )}

      {showOnboarding && (
        <ChannelCard
          brand="whatsapp"
          title="WhatsApp Business"
          description="Conecta tu número de WhatsApp Business (Cloud API) y gestiona plantillas, respuestas rápidas y números en una sola vista."
          tags={["Embedded Signup", "WABA", "Plantillas"]}
          status={<StatusPill status="disconnected" />}
          action={
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={handleConnectWhatsApp}
                  disabled={loading || !fetched || !connectEnabled}
                  className={`px-4 py-2 rounded-xl border ${
                    connected
                      ? "bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed"
                      : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                  } disabled:opacity-50`}
                >
                  {connectLabel}
                </button>

                <button
                  onClick={() => {
                    fetchNumbers().finally(() => {
                      adminRef.current?.scrollToNumbers?.();
                    });
                  }}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {loading ? "Cargando..." : "Listar números"}
                </button>
              </div>

              {!hasNumbers && fetched && !connected && (
                <p className="text-xs text-gray-500 mt-1">
                  Aún no hay líneas cargadas. Conéctate para obtener y
                  administrar tus números.
                </p>
              )}
            </>
          }
        />
      )}

      {connected && (
        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-xl">
          <SectionHeader
            title="Gestión de WhatsApp Business"
            subtitle="Números, plantillas, respuestas rápidas y conexiones"
          />
          <AdministradorPlantillas2 ref={adminRef} hideHeader />
        </div>
      )}
    </div>
  );
}
