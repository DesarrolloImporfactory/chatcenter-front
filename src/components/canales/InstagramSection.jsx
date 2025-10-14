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

export default function InstagramSection() {
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
    () => `${window.location.origin}/conexiones?tab=instagram`,
    []
  );

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (code && id_configuracion && !oauthSessionId) {
      (async () => {
        try {
          setLoading(true);
          const { data } = await chatApi.post(IG_ENDPOINTS.exchange, {
            code,
            id_configuracion,
            redirect_uri,
          });
          setOauthSessionId(data.oauth_session_id);
          setStatus({ type: "success", text: "Sesión OAuth creada." });
        } catch (e) {
          setStatus({ type: "error", text: "Fallo al intercambiar el code." });
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [id_configuracion, oauthSessionId, redirect_uri]);

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
      fetchConnected();
    } catch (e) {
      const msg = e?.response?.data?.message || "Error al conectar la página.";
      setStatus({ type: "error", text: msg });
    } finally {
      setLoading(false);
    }
  };

  const fetchConnected = async () => {
    if (!id_configuracion) return;
    try {
      const { data } = await chatApi.get(IG_ENDPOINTS.connectedList, {
        params: { id_configuracion },
      });
      setConnected(data.data || []);
    } catch {}
  };

  useEffect(() => {
    fetchConnected();
  }, [id_configuracion]);

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

      {/* Tarjeta de conexión principal */}
      <ChannelCard
        brand="instagram"
        title="Instagram"
        description="Conecta tu Página de Facebook con una cuenta de Instagram profesional para habilitar mensajería y bandeja unificada."
        tags={["OAuth", "Webhooks IG", "Mensajería"]}
        status={
          <StatusPill
            status={connected.length > 0 ? "connected" : "disconnected"}
          />
        }
        action={
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={handleStartLogin}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-white text-fuchsia-700 border border-fuchsia-200 hover:bg-fuchsia-50"
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
                páginas vinculadas a IG.
              </p>
            )}
          </>
        }
      />

      {/* Páginas disponibles */}
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

      {/* Conexiones registradas */}
      <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-xl">
        <SectionHeader
          title="Conexiones registradas"
          subtitle="Historial de páginas conectadas a Instagram para esta configuración"
        />
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left text-sm text-gray-500">
                <th className="px-3 py-2">Página</th>
                <th className="px-3 py-2">IG</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Conectado</th>
              </tr>
            </thead>
            <tbody>
              {connected.map((c) => (
                <tr key={c.page_id} className="bg-gray-50/60">
                  <td className="px-3 py-3 rounded-l-xl font-medium">
                    {c.page_name}
                  </td>
                  <td className="px-3 py-3">@{c.ig_username}</td>
                  <td className="px-3 py-3">
                    <StatusPill
                      status={
                        c.status === "active" ? "connected" : "disconnected"
                      }
                    />
                  </td>
                  <td className="px-3 py-3 rounded-r-xl">
                    {new Date(c.connected_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {connected.length === 0 && (
                <tr>
                  <td
                    className="px-3 py-6 text-center text-gray-500"
                    colSpan={4}
                  >
                    Aún no hay conexiones guardadas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
