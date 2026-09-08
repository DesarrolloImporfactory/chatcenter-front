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
    gris: "bg-gray-50 text-gray-600 border-gray-200",
    ambar: "bg-amber-50 text-amber-700 border-amber-200",
    azul: "bg-blue-50 text-blue-700 border-blue-200",
    verde: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border whitespace-nowrap ${tonos[tono]}`}
    >
      {children}
    </span>
  );
};

/** Inicial del autor, o el logo de Facebook si el comentario es de la página. */
const Avatar = ({ nombre, esPagina }) => (
  <div
    className={`h-9 w-9 shrink-0 rounded-full grid place-items-center text-xs font-semibold ${
      esPagina
        ? "bg-gradient-to-br from-sky-600 to-blue-700 text-white"
        : "bg-gray-100 text-gray-500 border border-gray-200"
    }`}
  >
    {esPagina ? (
      <i className="bx bxl-facebook text-lg" />
    ) : (
      (nombre || "?").trim().charAt(0).toUpperCase()
    )}
  </div>
);

// Meta devuelve el tipo en attachments[0].media_type.
const ETIQUETA_TIPO = {
  photo: "Foto",
  video: "Video",
  link: "Enlace",
  album: "Álbum",
  status: "Texto",
  share: "Compartido",
  event: "Evento",
};

/**
 * Miniatura de la publicación.
 *
 * `media_url` es una URL firmada de fbcdn y caduca. Cuando eso pasa la imagen
 * da 403 y quedaría un hueco roto en la lista, así que se cae al icono. El
 * refresco de detalle (cada 24h, en el backend) renueva la URL.
 */
const Miniatura = ({ post }) => {
  const [falla, setFalla] = useState(false);

  if (post.media_url && !falla) {
    return (
      <img
        src={post.media_url}
        alt=""
        loading="lazy"
        onError={() => setFalla(true)}
        className="h-14 w-14 shrink-0 rounded-xl object-cover border border-gray-100 bg-gray-50"
      />
    );
  }

  const icono =
    post.tipo === "video"
      ? "bx-video"
      : post.tipo === "link"
        ? "bx-link-alt"
        : post.tipo === "photo"
          ? "bx-image"
          : "bx-news";

  return (
    <div className="h-14 w-14 shrink-0 rounded-xl grid place-items-center bg-gray-50 border border-gray-100">
      <i className={`bx ${icono} text-2xl text-gray-300`} />
    </div>
  );
};

/** Contador del encabezado. */
const Metrica = ({ valor, etiqueta, tono = "gris", icono }) => {
  const tonos = {
    gris: "text-gray-900",
    ambar: "text-amber-600",
    azul: "text-blue-700",
  };
  return (
    <div className="flex-1 min-w-[7rem] rounded-xl border border-gray-100 bg-white px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        {icono ? <i className={`bx ${icono} text-sm`} /> : null}
        {etiqueta}
      </div>
      <div className={`text-2xl font-semibold mt-0.5 ${tonos[tono]}`}>
        {valor}
      </div>
    </div>
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
    <div className={nivel ? "ml-5 pl-4 border-l-2 border-gray-100" : ""}>
      <div className="py-3 flex gap-3">
        <Avatar nombre={nodo.from_nombre} esPagina={nodo.es_de_la_pagina} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-sm font-semibold ${
                nodo.es_de_la_pagina ? "text-blue-700" : "text-gray-900"
              }`}
            >
              {nodo.from_nombre || "Usuario de Facebook"}
            </span>
            {nodo.es_de_la_pagina ? (
              <Pastilla tono="azul">página</Pastilla>
            ) : null}
            {!nodo.es_de_la_pagina && nodo.respondido ? (
              <Pastilla tono="verde">
                <i className="bx bx-check" />
                respondido
              </Pastilla>
            ) : null}
            {!nodo.es_de_la_pagina && !nodo.respondido ? (
              <Pastilla tono="ambar">sin responder</Pastilla>
            ) : null}
            {nodo.privado_enviado ? <Pastilla>privado enviado</Pastilla> : null}
            {nodo.oculto ? <Pastilla>oculto</Pastilla> : null}
            <span className="text-xs text-gray-400 ml-auto shrink-0">
              {fechaCorta(nodo.comentado_at)}
            </span>
          </div>

          <div
            className={`mt-1.5 rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap break-words ${
              nodo.es_de_la_pagina
                ? "bg-blue-50 text-blue-950 border border-blue-100"
                : "bg-gray-50 text-gray-800 border border-gray-100"
            }`}
          >
            {nodo.mensaje || (
              <span className="italic text-gray-400">(sin texto)</span>
            )}
          </div>

          {nodo.media_url ? (
            <a
              href={nodo.media_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 mt-1.5 text-xs text-blue-600 hover:underline"
            >
              <i className="bx bx-paperclip" />
              Ver adjunto
            </a>
          ) : null}

          {nodo.privado_error ? (
            <p className="flex items-start gap-1.5 text-xs text-rose-600 mt-1.5">
              <i className="bx bx-error-circle mt-0.5" />
              El mensaje privado no salió: {nodo.privado_error}
            </p>
          ) : null}

          {!nodo.es_de_la_pagina && !modo ? (
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => abrir("publico")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-blue-700 border border-blue-200 bg-white hover:bg-blue-50 transition"
              >
                <i className="bx bx-reply" />
                Responder
              </button>
              {puedePrivado ? (
                <button
                  onClick={() => abrir("privado")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 transition"
                >
                  <i className="bx bx-lock-alt" />
                  Responder en privado
                </button>
              ) : null}
            </div>
          ) : null}

          {modo ? (
            <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="flex items-center gap-1.5 text-xs font-medium mb-2">
                {modo === "privado" ? (
                  <>
                    <i className="bx bx-lock-alt text-gray-500" />
                    <span className="text-gray-700">
                      Respuesta privada por Messenger
                    </span>
                  </>
                ) : (
                  <>
                    <i className="bx bx-world text-blue-600" />
                    <span className="text-blue-700">Respuesta pública</span>
                  </>
                )}
              </div>

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
                className="w-full text-sm bg-white border border-gray-200 rounded-xl p-2.5 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
              />

              {modo === "privado" ? (
                <p className="flex items-start gap-1.5 text-xs text-gray-500 mt-1.5">
                  <i className="bx bx-info-circle mt-0.5 shrink-0" />
                  Facebook permite un solo mensaje privado por comentario. No se
                  puede enviar otro después.
                </p>
              ) : null}
              {error ? (
                <p className="flex items-start gap-1.5 text-xs text-rose-600 mt-1.5">
                  <i className="bx bx-error-circle mt-0.5 shrink-0" />
                  {error}
                </p>
              ) : null}

              <div className="flex gap-2 mt-2.5">
                <button
                  onClick={enviar}
                  disabled={enviando || !texto.trim()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  <i
                    className={`bx ${
                      enviando ? "bx-loader-alt bx-spin" : "bx-send"
                    }`}
                  />
                  {enviando
                    ? "Enviando…"
                    : modo === "privado"
                      ? "Enviar privado"
                      : "Publicar respuesta"}
                </button>
                <button
                  onClick={() => setModo(null)}
                  disabled={enviando}
                  className="px-3.5 py-1.5 rounded-lg text-xs border border-gray-200 bg-white hover:bg-gray-100 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : null}
        </div>
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
      console.error(
        "[COMENTARIOS] no se pudieron cargar las publicaciones:",
        err,
      );
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
      const { data } = await chatApi.get(
        ENDPOINTS.comentarios(id_facebook_post),
        { params: { id_configuracion } },
      );
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
    await chatApi.post(
      privado ? ENDPOINTS.responderPrivado : ENDPOINTS.responder,
      {
        id_configuracion,
        comment_id,
        mensaje,
      },
    );
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
      {/* Encabezado */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden mb-5">
        <div className="bg-gradient-to-r from-sky-600 to-blue-700 text-white px-5 py-4 flex items-center gap-3 flex-wrap">
          <div className="h-11 w-11 rounded-full bg-white/15 grid place-items-center shrink-0">
            <i className="bx bx-message-rounded-dots text-2xl" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold leading-tight">Comentarios</h1>
            <p className="text-sm text-white/80">
              Comentarios de las publicaciones de tus páginas de Facebook.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoloPendientes((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm border transition ${
                soloPendientes
                  ? "bg-white text-blue-700 border-white font-medium"
                  : "bg-white/10 text-white border-white/25 hover:bg-white/20"
              }`}
            >
              <i className="bx bx-filter-alt" />
              Solo pendientes
            </button>
            <button
              onClick={cargarPosts}
              disabled={cargando}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm bg-white/10 text-white border border-white/25 hover:bg-white/20 disabled:opacity-50 transition"
            >
              <i
                className={`bx bx-refresh text-base ${
                  cargando ? "bx-spin" : ""
                }`}
              />
              {cargando ? "Actualizando…" : "Actualizar"}
            </button>
          </div>
        </div>

        {resumen ? (
          <div className="flex gap-3 flex-wrap p-4 bg-gray-50/60">
            <Metrica
              valor={resumen.comentarios_pendientes}
              etiqueta="Sin responder"
              tono="ambar"
              icono="bx-time-five"
            />
            <Metrica
              valor={resumen.posts_con_pendientes}
              etiqueta="Publicaciones con pendientes"
              tono="azul"
              icono="bx-news"
            />
            <Metrica
              valor={posts.length}
              etiqueta="Publicaciones en la lista"
              icono="bx-list-ul"
            />
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900 mb-5">
          <i className="bx bx-error-circle text-lg mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {cargando && !posts.length ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : null}

      {!cargando && !posts.length ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
          <div className="h-14 w-14 rounded-full bg-gray-50 border border-gray-100 grid place-items-center mx-auto mb-3">
            <i
              className={`bx ${
                soloPendientes ? "bx-check-circle" : "bx-message-rounded-dots"
              } text-3xl text-gray-300`}
            />
          </div>
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
          const abierto =
            seleccionado?.id_facebook_post === post.id_facebook_post;
          return (
            <div
              key={post.id_facebook_post}
              className={`rounded-2xl border bg-white shadow-sm overflow-hidden transition ${
                abierto
                  ? "border-blue-200 shadow-md"
                  : "border-gray-100 hover:shadow-md"
              }`}
            >
              <button
                onClick={() => abrirHilo(post)}
                className="w-full text-left p-4 hover:bg-gray-50/70 transition"
              >
                <div className="flex items-start gap-3">
                  <Miniatura post={post} />

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2">
                      {post.mensaje || `Publicación ${post.post_id}`}
                    </p>

                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                      {post.tipo ? (
                        <Pastilla tono="azul">
                          {ETIQUETA_TIPO[post.tipo] || post.tipo}
                        </Pastilla>
                      ) : null}
                      <Pastilla>
                        {post.total_comentarios}{" "}
                        {post.total_comentarios === 1
                          ? "comentario"
                          : "comentarios"}
                      </Pastilla>
                      {post.sin_responder > 0 ? (
                        <Pastilla tono="ambar">
                          {post.sin_responder} sin responder
                        </Pastilla>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-xs text-gray-400 mt-1.5">
                      <span className="inline-flex items-center gap-1">
                        <i className="bx bx-time-five" />
                        Actividad: {fechaCorta(post.ultimo_comentario_at)}
                      </span>
                      {post.publicado_at ? (
                        <span className="inline-flex items-center gap-1">
                          <i className="bx bx-calendar" />
                          Publicado: {fechaCorta(post.publicado_at)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div
                    className={`h-9 w-9 shrink-0 rounded-xl grid place-items-center transition ${
                      abierto
                        ? "bg-blue-600 text-white"
                        : "bg-gray-50 text-gray-400 border border-gray-100"
                    }`}
                  >
                    <i
                      className={`bx bx-chevron-right text-xl transition-transform ${
                        abierto ? "rotate-90" : ""
                      }`}
                    />
                  </div>
                </div>
              </button>

              {abierto ? (
                <div className="border-t border-gray-100 px-4 pb-2 bg-gray-50/40">
                  {post.permalink_url ? (
                    <a
                      href={post.permalink_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 mt-3 text-xs text-blue-600 hover:underline"
                    >
                      <i className="bx bx-link-external" />
                      Ver la publicación en Facebook
                    </a>
                  ) : null}

                  {cargandoHilo ? (
                    <div className="py-6 flex items-center gap-2 text-sm text-gray-500">
                      <i className="bx bx-loader-alt bx-spin" />
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
