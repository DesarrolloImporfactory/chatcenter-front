import React, { useEffect, useMemo, useState } from "react";
import chatApi from "../../api/chatcenter";
import SectionHeader from "./SectionHeader";
import StatusPill from "./StatusPill";
import ChannelCard from "./ChannelCard";

// Configuración de Facebook Login for Business ("metaInbox" en el App Dashboard).
//
// Sin este parámetro el backend cae en el login clásico y toma los permisos de
// una lista hardcodeada en el servidor, no los de esta configuración. No falla
// de forma visible: Facebook descarta en silencio los permisos que no tienen
// Advanced Access y la conexión se completa con la mitad de lo que necesita,
// así que el síntoma aparece mucho después (no se listan páginas, no llegan
// comentarios). Es el mismo id que usan Conexiones.jsx y AdminConexiones.jsx.
const FBL_CONFIG_ID = "1106951720999970";

const MS_ENDPOINTS = {
  loginUrl: "/messenger/facebook/login-url",
  exchange: "/messenger/facebook/oauth/exchange",
  pages: "/messenger/facebook/pages",
  connect: "/messenger/facebook/connect",
  connectedList: "/messenger/pages/connections", // devuelve datos sin tokens
  health: "/messenger/pages/health", // pregunta a Meta si el token sigue vivo
};

// Aviso de reconexión.
//
// `status='active'` en la BD no garantiza que el token sirva: Meta lo invalida
// cuando el usuario cambia su contraseña o pierde el rol en la página, y hasta
// ahora nada lo detectaba — los mensajes salientes fallaban en silencio. Este
// banner es la única señal que tiene el cliente de que debe reconectar.
const AvisoReconexion = ({ paginas, onReconectar }) => {
  if (!paginas.length) return null;
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
      <div className="flex items-start gap-3">
        <span className="text-xl leading-none">⚠️</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-rose-900">
            {paginas.length === 1
              ? "Tu página de Facebook se desconectó"
              : `${paginas.length} páginas de Facebook se desconectaron`}
          </div>
          <p className="text-sm text-rose-800 mt-1">
            Facebook invalidó el acceso, así que{" "}
            <strong>no se están enviando los mensajes salientes</strong>. Los
            mensajes que te escriben sí siguen llegando. Vuelve a conectar la
            página para restablecerlo.
          </p>
          <ul className="mt-2 space-y-1">
            {paginas.map((p) => (
              <li key={p.page_id} className="text-xs text-rose-700">
                <span className="font-medium">
                  {p.page_name || p.page_id}
                </span>
                {p.token_error ? ` — ${p.token_error}` : null}
              </li>
            ))}
          </ul>
          <button
            onClick={onReconectar}
            className="mt-3 px-4 py-2 rounded-xl bg-rose-600 text-white text-sm hover:bg-rose-700"
          >
            Reconectar página
          </button>
        </div>
      </div>
    </div>
  );
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

      {/* KPI cards */}
      <div className="px-5 pb-5 pt-3 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-white p-4 text-center">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">
            Seguidores
          </div>
          <div className="mt-1 text-base font-semibold text-gray-900">
            {typeof p.followers_count === "number"
              ? p.followers_count.toLocaleString()
              : "—"}
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 text-center">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">
            Me gusta
          </div>
          <div className="mt-1 text-base font-semibold text-gray-900">
            {typeof p.fan_count === "number"
              ? p.fan_count.toLocaleString()
              : "—"}
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 text-center">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">
            Verificación
          </div>
          <div className="mt-1 text-base font-semibold text-gray-900">
            {p.verification_status || "—"}
          </div>
        </div>
      </div>

      {/* About / Description y enlaces */}
      <div className="px-5 pb-5 pt-3 space-y-3">
        {(p.about || p.description) && (
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">
              Descripción
            </div>
            <div className="mt-1 text-sm text-gray-800 whitespace-pre-line">
              {p.about || p.description}
            </div>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
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
                  {p.page_link}
                </a>
              ) : (
                "—"
              )}
            </div>
            {p.website && (
              <div className="mt-1 text-sm">
                <a
                  href={p.website}
                  className="text-blue-600 hover:underline break-all"
                  target="_blank"
                  rel="noreferrer"
                >
                  {p.website}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

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
  const [salud, setSalud] = useState([]); // diagnóstico de tokens por página

  const id_configuracion = useMemo(() => {
    const idc = localStorage.getItem("id_configuracion");
    return idc ? parseInt(idc) : null;
  }, []);

  const redirect_uri = useMemo(
    () => `${window.location.origin}/canal-conexiones?tab=messenger`,
    []
  );

  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        // El `code` se saca de la URL ANTES de usarlo, no después.
        //
        // Meta lo acepta una sola vez y expira en ~10 minutos, pero acá el
        // componente se monta y desmonta cada vez que se cambia de pestaña
        // (AdministradorCanales lo renderiza con `tab === "messenger" && ...`).
        // Mientras el code siguiera en la query, cada remontaje reintentaba el
        // intercambio con un code ya quemado y el error tapaba a la conexión
        // que sí había funcionado. Se conserva el resto de la query (`tab`)
        // porque es el redirect_uri que se le declaró a Meta.
        if (code) {
          url.searchParams.delete("code");
          url.searchParams.delete("state");
          window.history.replaceState({}, "", url.toString());
        }

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
          } catch (err) {
            // El catch vacío que había acá dejaba "Fallo al intercambiar el
            // code" como única pista, y la causa real (code ya usado por
            // recargar la página, o redirect_uri distinto) sólo se veía en el
            // servidor. Con esto queda también en la consola del navegador.
            console.error(
              "[MS_OAUTH] exchange falló:",
              err?.response?.data || err?.message || err,
            );
            setStatus({
              type: "error",
              text:
                err?.response?.data?.message ||
                "Fallo al intercambiar el code.",
            });
          } finally {
            setLoading(false);
          }
        }
        await fetchConnected(); // siempre cargamos conexiones guardadas
      } finally {
        setInit(false); // listos para decidir qué mostrar
      }
      fetchSalud(); // en segundo plano: no bloquea el render
    })();
  }, [id_configuracion, redirect_uri]);

  const handleStartLogin = async () => {
    if (!id_configuracion) return;
    try {
      setLoading(true);
      const { data } = await chatApi.get(MS_ENDPOINTS.loginUrl, {
        params: { id_configuracion, redirect_uri, config_id: FBL_CONFIG_ID },
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
    } catch (err) {
      console.error(
        "[MS_OAUTH] listar páginas falló:",
        err?.response?.data || err?.message || err,
      );
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

  // Consulta a Meta si los tokens siguen vivos. Va aparte de fetchConnected
  // porque llama a Graph y tarda: no debe bloquear el render de la card.
  const fetchSalud = async () => {
    if (!id_configuracion) return;
    try {
      const { data } = await chatApi.get(MS_ENDPOINTS.health, {
        params: { id_configuracion },
        // silentError evita el toast global del interceptor (chatcenter.js:290
        // convierte cualquier 404 en "Recurso no encontrado."). Este chequeo es
        // secundario y se dispara solo al abrir la pestaña: si el backend aún no
        // tiene la ruta desplegada —o falla— el cliente no debe ver un error
        // rojo por algo que no pidió. Simplemente no se muestra el aviso.
        silentError: true,
      });
      setSalud(data.data || []);
    } catch {
      // Si el chequeo falla no se asume nada: mejor no mostrar aviso que
      // mostrar uno falso y mandar al cliente a reconectar sin motivo.
      setSalud([]);
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

  // Solo las que Meta dio por muertas con certeza. `token_valido === null`
  // significa que el chequeo no fue concluyente (fallo transitorio de Graph):
  // ésas NO se muestran, para no pedir reconexiones innecesarias.
  const requierenReconexion = salud.filter((p) => p.token_valido === false);

  return (
    <div className="space-y-6">
      <AvisoReconexion
        paginas={requierenReconexion}
        onReconectar={handleStartLogin}
      />

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
