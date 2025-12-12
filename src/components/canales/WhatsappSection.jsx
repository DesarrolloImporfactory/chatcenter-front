import React, { useEffect, useMemo, useRef, useState } from "react";
import { jwtDecode } from "jwt-decode";
import chatApi from "../../api/chatcenter";
import SectionHeader from "./SectionHeader";
import StatusPill from "./StatusPill";
import ChannelCard from "./ChannelCard";
import AdministradorPlantillas2 from "../../pages/admintemplates/AdministradorPlantillas2";

export default function WhatsappSection() {
  const [init, setInit] = useState(true);
  const [loading, setLoading] = useState(false);
  const [statusToast, setStatusToast] = useState(null);
  const [connected, setConnected] = useState(false);
  const [hasNumbers, setHasNumbers] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [config, setConfig] = useState(null);

  const adminRef = useRef(null);

  const id_configuracion = useMemo(() => {
    const idc = localStorage.getItem("id_configuracion");
    return idc ? parseInt(idc) : null;
  }, []);

  // Skeleton compacto
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

  const getUserData = () => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
      const decoded = jwtDecode(token);
      return decoded;
    } catch (e) {
      return null;
    }
  };

  const fetchConfig = async () => {
    const userData = getUserData();
    if (!userData) return;

    try {
      const response = await chatApi.post("configuraciones/listar_conexiones", {
        id_usuario: userData.id_usuario,
      });
      setConfig(response.data.data);
    } catch (err) {
      console.error("Error al obtener configuraciones", err);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  // 🔥 DEBUGGING: Ver qué contiene config
  useEffect(() => {
    if (config) {
      console.log("📋 Configuración cargada:", config);
      console.log(
        "📱 Teléfono encontrado:",
        config.telefono || config.numero || "NO ENCONTRADO"
      );
    }
  }, [config]);

  const fetchNumbers = async () => {
    if (!id_configuracion) {
      setInit(false);
      return;
    }
    try {
      setLoading(true);
      setFetched(false);
      const minHold = new Promise((r) => setTimeout(r, 300));
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
      setInit(false);
    }
  };

  useEffect(() => {
    fetchNumbers();
    const onFocus = () => fetchNumbers();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [id_configuracion]);

  /* SDK Facebook */
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

    const userData = getUserData();
    if (!userData || !config) {
      setStatusToast({
        type: "error",
        text: "Datos incompletos. No se pudo continuar con la conexión.",
      });
      return;
    }

    const telefono = config?.telefono?.trim() ;

    if (!telefono) {
      setStatusToast({
        type: "error",
        text: "El número de teléfono no está configurado. Por favor, verifica tu configuración.",
      });
      return;
    }

    // 🔥 CORRECCIÓN: Limpiar el número (remover espacios, guiones, paréntesis)
    const telefonoLimpio = telefono.replace(/[\s\-\(\)]/g, "");


    // 🔥 DEBUGGING: Ver qué se está enviando
    console.log("📞 Enviando número:", telefonoLimpio);
    console.log("🔧 Config ID:", config.id);

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
              {
                code,
                id_configuracion: config.id,
                redirect_uri: window.location.origin + "/conexiones",
                display_number_onboarding: telefonoLimpio, // 🔥 Usar número limpio
                id_usuario: userData.id_usuario,
              }
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
            console.error("❌ Error en embeddedSignupComplete:", err);
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
