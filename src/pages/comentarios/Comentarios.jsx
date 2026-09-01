import React, { useCallback, useEffect, useMemo, useState } from "react";
import chatApi from "../../api/chatcenter";

const ENDPOINTS = {
  posts: "/facebook_comentarios/posts",
  resumen: "/facebook_comentarios/resumen",
  comentarios: (id) => `/facebook_comentarios/posts/${id}/comentarios`,
  responder: "/facebook_comentarios/responder",
  responderPrivado: "/facebook_comentarios/responder-privado",
};

const fechaCorta = (v) => {
  if (!v) return "";
  // El backend devuelve 'YYYY-MM-DD HH:mm:ss' (MySQL, zona -05:00). Safari no
  // parsea ese formato con espacio, así que se normaliza a ISO antes.
  const d = new Date(String(v).replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("es-EC", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const Pastilla = ({ children, tono = "gris" }) => {
  const tonos = {
    gris: "bg-gray-100 text-gray-700",
    ambar: "bg-amber-100 text-amber-800",
    azul: "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs ${tonos[tono]}`}>
      {children}
    </span>
  );
};

/**
 * Un comentario, sus respuestas y el redactor.
 *
 * El árbol viene ya armado del backend, así que acá sólo se pinta. Se recorre
 * en profundidad aunque hoy Facebook sólo permite un nivel de anidación: si
 * algún día lo amplía, esto no hay que tocarlo.
 */
const Comentario = ({ nodo, nivel = 0, onEnviar }) => {
  const [modo, setModo] = useState(null); // 'publico' | 'privado' | null
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const abrir = (m) => {
    setModo(m);
    setTexto("");
    setError(null);
  };

  const enviar = async () => {
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      await onEnviar({
        comment_id: nodo.comment_id,
        mensaje: texto,
        privado: modo === "privado",
      });
      setModo(null);
      setTexto("");
    } catch (err) {
      setError(err?.response?.data?.message || "No se pudo enviar.");
    } finally {
      setEnviando(false);
    }
  };

  // El privado sólo se ofrece una vez por comentario y nunca sobre uno propio:
  // Meta lo permite una sola vez y el segundo intento devuelve un error que el
  // usuario no puede interpretar.
  const puedePrivado = !nodo.es_de_la_pagina && !nodo.privado_enviado;

  return (
    <div className={nivel ? "ml-6 pl-4 border-l border-gray-200" : ""}>
      <div className="py-3">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span
            className={`text-sm font-semibold ${
              nodo.es_de_la_pagina ? "text-blue-700" : "text-gray-900"
            }`}
          >
            {nodo.from_nombre || "Usuario de Facebook"}
          </span>
          {nodo.es_de_la_pagina ? <Pastilla tono="azul">página</Pastilla> : null}
          {!nodo.es_de_la_pagina && nodo.respondido ? (
            <Pastilla>respondido</Pastilla>
          ) : null}
          {!nodo.es_de_la_pagina && !nodo.respondido ? (
            <Pastilla tono="ambar">sin responder</Pastilla>
          ) : null}
          {nodo.privado_enviado ? <Pastilla>privado enviado</Pastilla> : null}
          {nodo.oculto ? <Pastilla>oculto</Pastilla> : null}
          <span className="text-xs text-gray-400 ml-auto">
            {fechaCorta(nodo.comentado_at)}
          </span>
        </div>

        <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap break-words">
          {nodo.mensaje || (
            <span className="italic text-gray-400">(sin texto)</span>
          )}
        </p>

        {nodo.media_url ? (
          <a
            href={nodo.media_url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            Ver adjunto
          </a>
        ) : null}

        {nodo.privado_error ? (
          <p className="text-xs text-rose-600 mt-1">
            El mensaje privado no salió: {nodo.privado_error}
          </p>
        ) : null}

        {!nodo.es_de_la_pagina && !modo ? (
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => abrir("publico")}
              className="text-xs text-blue-600 hover:underline"
            >
              Responder
            </button>
            {puedePrivado ? (
              <button
                onClick={() => abrir("privado")}
                className="text-xs text-gray-600 hover:underline"
              >
                Responder en privado
              </button>
            ) : null}
          </div>
        ) : null}

        {modo ? (
          <div className="mt-2">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={3}
              autoFocus
              placeholder={
                modo === "privado"
                  ? "Este mensaje llega por Messenger, solo a esta persona."
                  : "Tu respuesta será pública, visible para cualquiera."
              }
              className="w-full text-sm border border-gray-200 rounded-xl p-2 focus:outline-none focus:border-blue-400"
            />
            {modo === "privado" ? (
              <p className="text-xs text-gray-500 mb-1">
                Facebook permite un solo mensaje privado por comentario. No se
                puede enviar otro después.
              </p>
            ) : null}
            {error ? (
              <p className="text-xs text-rose-600 mb-1">{error}</p>
            ) : null}
            <div className="flex gap-2">
              <button
                onClick={enviar}
                disabled={enviando || !texto.trim()}
                className="px-3 py-1.5 rounded-lg text-xs bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {enviando
                  ? "Enviando…"
                  : modo === "privado"
                    ? "Enviar privado"
                    : "Publicar respuesta"}
              </button>
              <button
                onClick={() => setModo(null)}
                disabled={enviando}
                className="px-3 py-1.5 rounded-lg text-xs border border-gray-200 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {nodo.respuestas?.map((h) => (
        <Comentario
          key={h.id_facebook_comment}
          nodo={h}
          nivel={nivel + 1}
          onEnviar={onEnviar}
        />
      ))}
    </div>
  );
};

export default function Comentarios() {
  const id_configuracion = useMemo(() => {
    const v = localStorage.getItem("id_configuracion");
    return v ? Number(v) : null;
  }, []);

  const [posts, setPosts] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [soloPendientes, setSoloPendientes] = useState(false);
  const [seleccionado, setSeleccionado] = useState(null);
  const [hilo, setHilo] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoHilo, setCargandoHilo] = useState(false);
  const [error, setError] = useState(null);

  const cargarPosts = useCallback(async () => {
    if (!id_configuracion) return;
    setCargando(true);
    setError(null);
    try {
      const [rp, rr] = await Promise.all([
        chatApi.get(ENDPOINTS.posts, {
          params: {
            id_configuracion,
            limite: 50,
            solo_pendientes: soloPendientes ? 1 : 0,
          },
        }),
        chatApi.get(ENDPOINTS.resumen, { params: { id_configuracion } }),
      ]);
      setPosts(rp.data.posts || []);
      setResumen(rr.data);
    } catch (err) {
      console.error("[COMENTARIOS] no se pudieron cargar las publicaciones:", err);
      setError(
        err?.response?.data?.message ||
          "No se pudieron cargar las publicaciones.",
      );
    } finally {
      setCargando(false);
    }
  }, [id_configuracion, soloPendientes]);

  useEffect(() => {
    cargarPosts();
  }, [cargarPosts]);

  const abrirHilo = async (post) => {
    // Segundo clic sobre la misma publicación la cierra.
    if (seleccionado?.id_facebook_post === post.id_facebook_post) {
      setSeleccionado(null);
      setHilo(null);
      return;
    }
    setSeleccionado(post);
    setHilo(null);
    setCargandoHilo(true);
    try {
      const { data } = await chatApi.get(
        ENDPOINTS.comentarios(post.id_facebook_post),
        { params: { id_configuracion } },
      );
      setHilo(data.comentarios || []);
    } catch (err) {
      console.error("[COMENTARIOS] no se pudo abrir el hilo:", err);
      setHilo([]);
    } finally {
      setCargandoHilo(false);
    }
  };

  const recargarHilo = useCallback(
    async (id_facebook_post) => {
      const { data } = await chatApi.get(ENDPOINTS.comentarios(id_facebook_post), {
        params: { id_configuracion },
      });
      setHilo(data.comentarios || []);
    },
    [id_configuracion],
  );

  /**
   * Envía la respuesta y recarga.
   *
   * Se recarga desde el servidor en vez de retocar el estado local porque la
   * respuesta cambia varias cosas a la vez —el padre pasa a respondido, los
   * contadores del post bajan, y la propia respuesta entra como comentario
   * nuevo— y esas reglas ya viven en el backend. Duplicarlas acá era garantía
   * de que se desincronizaran.
   *
   * El error se propaga a propósito: lo muestra el redactor, junto al
   * comentario, que es donde el usuario está mirando.
   */
  const enviarRespuesta = async ({ comment_id, mensaje, privado }) => {
    await chatApi.post(privado ? ENDPOINTS.responderPrivado : ENDPOINTS.responder, {
      id_configuracion,
      comment_id,
      mensaje,
    });
    if (seleccionado) await recargarHilo(seleccionado.id_facebook_post);
    cargarPosts();
  };

  if (!id_configuracion) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          No hay una configuración seleccionada. Elige una cuenta para ver sus
          comentarios.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Comentarios</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Comentarios de las publicaciones de tus páginas de Facebook.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoloPendientes((v) => !v)}
            className={`px-4 py-2 rounded-xl text-sm border ${
              soloPendientes
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            Solo pendientes
          </button>
          <button
            onClick={cargarPosts}
            disabled={cargando}
            className="px-4 py-2 rounded-xl text-sm bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {cargando ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
      </div>

      {resumen ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 mb-5 shadow-sm">
          <span className="text-sm text-gray-700">
            <strong className="text-amber-600">
              {resumen.comentarios_pendientes}
            </strong>{" "}
            {resumen.comentarios_pendientes === 1
              ? "comentario sin responder"
              : "comentarios sin responder"}{" "}
            en{" "}
            <strong>{resumen.posts_con_pendientes}</strong>{" "}
            {resumen.posts_con_pendientes === 1
              ? "publicación"
              : "publicaciones"}
            .
          </span>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900 mb-5">
          {error}
        </div>
      ) : null}

      {cargando && !posts.length ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-20 rounded-2xl bg-gray-100 animate-pulse"
            />
          ))}
        </div>
      ) : null}

      {!cargando && !posts.length ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <p className="text-gray-700 font-medium">
            {soloPendientes
              ? "No hay comentarios sin responder."
              : "Todavía no hay comentarios."}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {soloPendientes
              ? "Todo al día."
              : "Aparecerán aquí en cuanto alguien comente una publicación de tu página."}
          </p>
        </div>
      ) : null}

      <div className="space-y-3">
        {posts.map((post) => {
          const abierto = seleccionado?.id_facebook_post === post.id_facebook_post;
          return (
            <div
              key={post.id_facebook_post}
              className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden"
            >
              <button
                onClick={() => abrirHilo(post)}
                className="w-full text-left p-4 hover:bg-gray-50"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <i
                    className={`bx bx-chevron-right text-xl text-gray-400 transition-transform ${
                      abierto ? "rotate-90" : ""
                    }`}
                  />
                  <span className="text-sm font-medium text-gray-900 flex-1 min-w-0 truncate">
                    {post.mensaje || `Publicación ${post.post_id}`}
                  </span>
                  <Pastilla>
                    {post.total_comentarios}{" "}
                    {post.total_comentarios === 1 ? "comentario" : "comentarios"}
                  </Pastilla>
                  {post.sin_responder > 0 ? (
                    <Pastilla tono="ambar">
                      {post.sin_responder} sin responder
                    </Pastilla>
                  ) : null}
                </div>
                <div className="text-xs text-gray-400 mt-1 ml-7">
                  Última actividad: {fechaCorta(post.ultimo_comentario_at)}
                </div>
              </button>

              {abierto ? (
                <div className="border-t border-gray-100 px-4 pb-2">
                  {cargandoHilo ? (
                    <div className="py-6 text-sm text-gray-500">
                      Cargando comentarios…
                    </div>
                  ) : hilo && hilo.length ? (
                    hilo.map((c) => (
                      <Comentario
                        key={c.id_facebook_comment}
                        nodo={c}
                        onEnviar={enviarRespuesta}
                      />
                    ))
                  ) : (
                    <div className="py-6 text-sm text-gray-500">
                      Esta publicación no tiene comentarios visibles.
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
