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
  connectedList: "/messenger/pages/connections",
};

export default function MessengerSection() {
  const [oauthSessionId, setOauthSessionId] = useState(null);
  const [pages, setPages] = useState([]);
  const [connected, setConnected] = useState([]);
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
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (code && id_configuracion && !oauthSessionId) {
      (async () => {
        try {
          setLoading(true);
          const { data } = await chatApi.post(MS_ENDPOINTS.exchange, {
            code,
            id_configuracion,
            redirect_uri,
          });
          setOauthSessionId(data.oauth_session_id);
          setStatus({ type: "success", text: "Sesión OAuth creada." });
        } catch {
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
      const { data } = await chatApi.get(MS_ENDPOINTS.connectedList, {
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

      <ChannelCard
        brand="messenger"
        title="Messenger"
        description="Conecta tu Página de Facebook para recibir y enviar mensajes desde una única bandeja. Suscríbete a los eventos necesarios con un clic."
        tags={["OAuth", "Suscripción a Page", "Mensajería"]}
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
                Inicia sesión con Facebook para cargar tus páginas disponibles.
              </p>
            )}
          </>
        }
      />

      {pages.length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-xl">
          <SectionHeader
            title="Páginas disponibles"
            subtitle="Elige la Página que deseas conectar"
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

      <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-xl">
        <SectionHeader
          title="Conexiones registradas"
          subtitle="Páginas conectadas a Messenger para esta configuración"
        />
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left text-sm text-gray-500">
                <th className="px-3 py-2">Página</th>
                <th className="px-3 py-2">Suscripción</th>
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
                  <td className="px-3 py-3">
                    <StatusPill
                      status={c.subscribed ? "connected" : "disconnected"}
                    />
                  </td>
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
