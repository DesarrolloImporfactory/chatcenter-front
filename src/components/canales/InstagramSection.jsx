import React, { useEffect, useMemo, useState } from "react";
import chatApi from "../../api/chatcenter";
import SectionHeader from "./SectionHeader";
import StatusPill from "./StatusPill";
import ChannelCard from "./ChannelCard";

const IG_ENDPOINTS = {
  loginUrl: "/instagram/facebook/login-url",
  exchange: "/instagram/facebook/oauth/exchange",
  pages: "/instagram/facebook/pages",
  connect: "/instagram/facebook/connect",
  connectedList: "/instagram/connections",
};

const InstagramSkeleton = () => (
  <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm">
    <div className="bg-gradient-to-r from-pink-600 to-fuchsia-600 px-4 py-3">
      <div className="h-6 w-40 bg-white/30 rounded animate-pulse" />
    </div>
    <div className="p-5 space-y-3">
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 rounded-full bg-gray-200 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-1/3 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
      <div className="h-3 w-2/3 bg-gray-100 rounded animate-pulse" />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="h-16 bg-gray-50 border border-gray-100 rounded-xl animate-pulse" />
        <div className="h-16 bg-gray-50 border border-gray-100 rounded-xl animate-pulse" />
        <div className="h-16 bg-gray-50 border border-gray-100 rounded-xl animate-pulse" />
      </div>
    </div>
  </div>
);

const InstagramProfileCard = ({ c }) => {
  const photo = c.profile_picture_url || "https://placehold.co/200x200?text=IG";
  const isActive = String(c.status || "").toLowerCase() === "active";
  const displayName = c.ig_full_name || c.page_name || "—";

  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm hover:shadow-md transition">
      <div className="bg-gradient-to-r from-pink-600 to-fuchsia-600 text-white px-4 py-3 flex items-center gap-3">
        <img
          src={photo}
          alt="Foto de perfil IG"
          className="h-10 w-10 rounded-full object-cover border border-white/20"
          onError={(e) =>
            (e.currentTarget.src = "https://placehold.co/200x200?text=IG")
          }
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold truncate">
              @{c.ig_username || "—"}
            </span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full ${
                isActive ? "bg-white/15" : "bg-white/10"
              }`}
            >
              {isActive ? "Conectado" : c.status || "—"}
            </span>
          </div>
          <div className="text-white/80 text-xs truncate">{displayName}</div>
        </div>
      </div>

      <div className="px-5 pt-5 pb-2">
        <div className="flex items-center gap-4">
          <img
            src={photo}
            alt="Foto"
            className="h-20 w-20 rounded-full object-cover border-4 border-white shadow -mt-10"
            onError={(e) =>
              (e.currentTarget.src = "https://placehold.co/200x200?text=IG")
            }
          />
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              @{c.ig_username || "—"}
            </h3>
            <div className="text-sm text-gray-600 truncate">{displayName}</div>
          </div>
        </div>

        {c.biography && (
          <div className="mt-3 text-sm text-gray-700">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">
              Descripción
            </div>
            <div className="mt-1 whitespace-pre-line">{c.biography}</div>
          </div>
        )}
      </div>

      <div className="px-5 pb-5 pt-3 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-white p-4 text-center">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">
            Publicaciones
          </div>
          <div className="mt-1 text-base font-semibold text-gray-900">
            {c.media_count ?? "—"}
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 text-center">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">
            Seguidores
          </div>
          <div className="mt-1 text-base font-semibold text-gray-900">
            {c.followers_count ?? "—"}
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 text-center">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">
            Seguidos
          </div>
          <div className="mt-1 text-base font-semibold text-gray-900">
            {c.follows_count ?? "—"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function InstagramSection() {
  const [init, setInit] = useState(true);
  const [oauthSessionId, setOauthSessionId] = useState(null);
  const [pagesWithIG, setPagesWithIG] = useState([]);
  const [connected, setConnected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const id_configuracion = useMemo(() => {
    const idc = localStorage.getItem("id_configuracion");
    return idc ? parseInt(idc) : null;
  }, []);

  const redirect_uri = useMemo(
    () => `${window.location.origin}/canal-conexiones?tab=instagram`,
    []
  );

  const fetchConnected = async () => {
    if (!id_configuracion) return;
    try {
      const { data } = await chatApi.get(IG_ENDPOINTS.connectedList, {
        params: { id_configuracion },
      });
      setConnected(data.data || []);
    } catch {
      setConnected([]);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code && id_configuracion) {
          setLoading(true);
          try {
            const { data } = await chatApi.post(IG_ENDPOINTS.exchange, {
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

        await fetchConnected();
      } finally {
        setInit(false);
      }
    })();
  }, [id_configuracion, redirect_uri]);

  const handleStartLogin = async () => {
    if (!id_configuracion) return;
    try {
      setLoading(true);
      const { data } = await chatApi.get(IG_ENDPOINTS.loginUrl, {
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
      const { data } = await chatApi.get(IG_ENDPOINTS.pages, {
        params: { oauth_session_id: oauthSessionId },
      });
      setPagesWithIG(data.pages_with_ig || []);
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
      await chatApi.post(IG_ENDPOINTS.connect, {
        oauth_session_id: oauthSessionId,
        id_configuracion,
        page_id,
      });
      setStatus({ type: "success", text: "Página conectada a Instagram." });
      setPagesWithIG([]);
      await fetchConnected();
    } catch (e) {
      const msg = e?.response?.data?.message || "Error al conectar la página.";
      setStatus({ type: "error", text: msg });
    } finally {
      setLoading(false);
    }
  };

  const isConnected = connected.length > 0;

  if (init) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 p-5 md:max-w-xl">
          <InstagramSkeleton />
        </div>
      </div>
    );
  }

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

      {!isConnected && (
        <>
          <ChannelCard
            brand="instagram"
            title="Instagram"
            description="Conecta tu Página de Facebook con tu cuenta de Instagram profesional para habilitar la mensajería."
            tags={["OAuth", "Webhooks IG", "Mensajería"]}
            status={<StatusPill status="disconnected" />}
            action={
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={handleStartLogin}
                    disabled={loading}
                    className="px-4 py-2 rounded-xl bg-white text-fuchsia-700 border border-fuchsia-200 hover:bg-fuchsia-50 disabled:opacity-50"
                  >
                    Conectar Instagram
                  </button>
                  <button
                    onClick={handleListPages}
                    disabled={loading || !oauthSessionId}
                    className="px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
                  >
                    Listar páginas
                  </button>
                </div>
                {pagesWithIG.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Primero realiza el login para obtener permisos y listar tus
                    páginas con IG vinculado.
                  </p>
                )}
              </>
            }
          />

          {pagesWithIG.length > 0 && (
            <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-xl">
              <SectionHeader
                title="Páginas con Instagram vinculado"
                subtitle="Selecciona cuál conectar a esta configuración"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pagesWithIG.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-2xl border border-gray-200 p-4 hover:shadow-lg transition"
                  >
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-sm text-gray-600">
                      @{p.connected_instagram_account?.username}
                    </div>
                    <button
                      onClick={() => handleConnectPage(p.id)}
                      className="mt-3 w-full rounded-lg bg-fuchsia-600 text-white py-2 hover:bg-fuchsia-700"
                    >
                      Conectar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {isConnected && (
        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-xl">
          <SectionHeader
            title="Perfil de Instagram"
            subtitle="Vista e información de la cuenta vinculada"
          />
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 mt-2">
            {connected.map((c) => (
              <InstagramProfileCard key={c.page_id} c={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
