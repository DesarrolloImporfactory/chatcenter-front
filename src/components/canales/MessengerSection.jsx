import React, { useEffect, useMemo, useState } from "react";
import chatApi from "../../api/chatcenter";
import SectionHeader from "./SectionHeader";
import StatusPill from "./StatusPill";
import ChannelCard from "./ChannelCard";

const MS_ENDPOINTS = {
  loginUrl: "/messenger/facebook/login-url",
  exchange: "/messenger/facebook/oauth/exchange",
  pages: "/messenger/facebook/pages",
  connect: "/messenger/facebook/connect",
  connectedList: "/messenger/pages/connections", // devuelve datos sin tokens
};

// Skeleton compacto (mismo tamaño visual aprox. que WA/IG)
const MsCardSkeleton = () => (
  <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm p-5 max-w-xl">
    <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-3" />
    <div className="flex items-center gap-4">
      <div className="h-16 w-16 rounded-full bg-gray-200 animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
        <div className="h-3 w-1/3 bg-gray-100 rounded animate-pulse" />
      </div>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 mt-4">
      <div className="h-14 bg-gray-50 border border-gray-100 rounded-xl animate-pulse" />
      <div className="h-14 bg-gray-50 border border-gray-100 rounded-xl animate-pulse" />
    </div>
  </div>
);

// Card compacta tipo FB con la info disponible hoy (nombre + foto)
const MessengerProfileMini = ({ p }) => {
  const avatar =
    p.profile_picture_url || "https://placehold.co/200x200?text=FB";
  const isActive = String(p.status || "").toLowerCase() === "active";

  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm hover:shadow-md transition max-w-xl">
      {/* Barra superior estilo FB */}
      <div className="bg-gradient-to-r from-sky-600 to-blue-700 text-white px-4 py-3 flex items-center gap-3">
        <img
          src={avatar}
          alt="Foto de página"
          className="h-10 w-10 rounded-full object-cover border border-white/20"
          onError={(e) =>
            (e.currentTarget.src = "https://placehold.co/200x200?text=FB")
          }
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold truncate">
              {p.page_name || "Página"}
            </span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full ${
                isActive ? "bg-white/15" : "bg-white/10"
              }`}
            >
              {isActive ? "Conectado" : p.status || "—"}
            </span>
          </div>
          <div className="text-white/80 text-xs truncate">
            {p.page_username ? `@${p.page_username}` : "—"}
          </div>
        </div>
      </div>

      {/* Cabecera */}
      <div className="px-5 pt-5 pb-2">
        <div className="flex items-center gap-4">
          <img
            src={avatar}
            alt="Foto"
            className="h-20 w-20 rounded-full object-cover border-4 border-white shadow -mt-10"
            onError={(e) =>
              (e.currentTarget.src = "https://placehold.co/200x200?text=FB")
            }
          />
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {p.page_name || "Página"}
            </h3>
            {p.page_username && (
              <div className="text-sm text-gray-600 truncate">
                @{p.page_username}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info breve (si aún no hay permisos, verás “—”)
      <div className="px-5 pb-5 pt-3 space-y-3">
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">
            Acerca de
          </div>
          <div className="mt-1 text-sm text-gray-800 whitespace-pre-line">
            {p.about || "—"}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">
              Categoría
            </div>
            <div className="mt-1 text-sm text-gray-800">
              {p.category || "—"}
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">
              Seguidores
            </div>
            <div className="mt-1 text-sm text-gray-800">
              {typeof p.fan_count === "number"
                ? p.fan_count.toLocaleString()
                : "—"}
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">
              Enlace
            </div>
            <div className="mt-1 text-sm">
              {p.page_link ? (
                <a
                  href={p.page_link}
                  className="text-blue-600 hover:underline break-all"
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver página
                </a>
              ) : (
                <span className="text-gray-800">—</span>
              )}
            </div>
          </div>
        </div> */}

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        <span
          className={`px-2 py-0.5 text-[11px] rounded-full ${
            isActive
              ? "bg-emerald-100 text-emerald-700"
              : "bg-rose-100 text-rose-700"
          }`}
        >
          {isActive ? "Conectado" : p.status || "—"}
        </span>
        <span
          className={`px-2 py-0.5 text-[11px] rounded-full ${
            p.subscribed
              ? "bg-sky-100 text-sky-700"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          {p.subscribed ? "Suscripción activa" : "Sin suscripción"}
        </span>
      </div>
    </div>
    // </div>
  );
};

export default function MessengerSection() {
  const [init, setInit] = useState(true); // controla skeleton inicial
  const [oauthSessionId, setOauthSessionId] = useState(null);
  const [pages, setPages] = useState([]); // páginas listadas durante el flujo
  const [connected, setConnected] = useState([]); // conexiones guardadas en DB
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const id_configuracion = useMemo(() => {
    const idc = localStorage.getItem("id_configuracion");
    return idc ? parseInt(idc) : null;
  }, []);

  const redirect_uri = useMemo(
    () => `${window.location.origin}/conexiones?tab=messenger`,
    []
  );

  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        if (code && id_configuracion) {
          setLoading(true);
          try {
            const { data } = await chatApi.post(MS_ENDPOINTS.exchange, {
              code,
              id_configuracion,
              redirect_uri,
            });
            setOauthSessionId(data.oauth_session_id);
            setStatus({ type: "success", text: "Sesión OAuth creada." });
          } catch {
            setStatus({
              type: "error",
              text: "Fallo al intercambiar el code.",
            });
          } finally {
            setLoading(false);
          }
        }
        await fetchConnected(); // siempre cargamos conexiones guardadas
      } finally {
        setInit(false); // listos para decidir qué mostrar
      }
    })();
  }, [id_configuracion, redirect_uri]);

  const handleStartLogin = async () => {
    if (!id_configuracion) return;
    try {
      setLoading(true);
      const { data } = await chatApi.get(MS_ENDPOINTS.loginUrl, {
        params: { id_configuracion, redirect_uri },
      });
      window.location.href = data.url;
    } catch {
      setStatus({
        type: "error",
        text: "No se pudo construir la URL de login.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleListPages = async () => {
    if (!oauthSessionId) return;
    try {
      setLoading(true);
      const { data } = await chatApi.get(MS_ENDPOINTS.pages, {
        params: { oauth_session_id: oauthSessionId },
      });
      setPages(data.pages || data.pages_with_ig || []);
      setStatus({ type: "success", text: "Páginas cargadas." });
    } catch {
      setStatus({ type: "error", text: "No se pudieron listar las páginas." });
    } finally {
      setLoading(false);
    }
  };

  const handleConnectPage = async (page_id) => {
    try {
      setLoading(true);
      await chatApi.post(MS_ENDPOINTS.connect, {
        oauth_session_id: oauthSessionId,
        id_configuracion,
        page_id,
      });
      setStatus({ type: "success", text: "Página conectada a Messenger." });
      setPages([]); // limpiamos listado
      await fetchConnected(true); // force=1 para intentar refresco en backend
    } catch (e) {
      const msg = e?.response?.data?.message || "Error al conectar la página.";
      setStatus({ type: "error", text: msg });
    } finally {
      setLoading(false);
    }
  };

  const fetchConnected = async (force = false) => {
    if (!id_configuracion) return;
    try {
      const { data } = await chatApi.get(MS_ENDPOINTS.connectedList, {
        params: { id_configuracion, force: force ? 1 : undefined },
      });
      setConnected(data.data || []);
    } catch {
      setConnected([]);
    }
  };

  // Mientras decide (init) mostramos skeleton
  if (init) {
    return (
      <div className="space-y-6">
        <MsCardSkeleton />
      </div>
    );
  }

  const isConnected = connected.length > 0;
  const first = connected[0]; // mostramos una sola card

  return (
    <div className="space-y-6">
      {status && (
        <div
          className={`px-4 py-2 rounded-xl shadow ${
            status.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
              : "bg-rose-50 text-rose-800 border border-rose-100"
          }`}
        >
          {status.text}
        </div>
      )}

      {/* Onboarding si NO hay conexión */}
      {!isConnected && (
        <ChannelCard
          brand="messenger"
          title="Messenger"
          description="Conecta tu Página de Facebook para recibir y enviar mensajes desde una única bandeja. Suscríbete a los eventos necesarios con un clic."
          tags={["OAuth", "Suscripción a Page", "Mensajería"]}
          status={<StatusPill status="disconnected" />}
          action={
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={handleStartLogin}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-white text-blue-700 border border-blue-200 hover:bg-blue-50"
                >
                  Conectar Messenger
                </button>
                <button
                  onClick={handleListPages}
                  disabled={loading || !oauthSessionId}
                  className="px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  Listar páginas
                </button>
              </div>
              {pages.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Inicia sesión con Facebook para cargar tus páginas
                  disponibles.
                </p>
              )}
            </>
          }
        />
      )}

      {/* Selector de páginas durante el flujo */}
      {pages.length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-xl">
          <SectionHeader
            title="Páginas disponibles"
            subtitle="Elige una para conectar"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pages.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl border border-gray-200 p-4 hover:shadow-lg transition"
              >
                <div className="font-semibold">{p.name}</div>
                <button
                  onClick={() => handleConnectPage(p.id)}
                  className="mt-3 w-full rounded-lg bg-blue-600 text-white py-2 hover:bg-blue-700"
                >
                  Conectar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Perfil (una sola card) cuando ya hay conexión */}
      {isConnected && (
        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-xl">
          <SectionHeader
            title="Facebook Page (Messenger)"
            subtitle="Vista e información de la cuenta vinculada"
          />
          <div className="grid gap-6 md:grid-cols-1 xl:grid-cols-1">
            <MessengerProfileMini p={first} />
          </div>
        </div>
      )}
    </div>
  );
}
