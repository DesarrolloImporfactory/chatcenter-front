import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import io from "socket.io-client";
import chatApi from "../../api/chatcenter";

const ENDPOINTS = {
  posts: "/facebook_comentarios/posts",
  planos: "/facebook_comentarios/comentarios",
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

/**
 * Cuánto lleva esperando, en color.
 *
 * Un comentario de venta se enfría rápido. La fecha exacta no dice nada de un
 * vistazo; "hace 6 h" en rojo sí.
 */
const espera = (iso) => {
  if (!iso) return { texto: "", tono: "gris" };
  const ms = Date.now() - new Date(String(iso).replace(" ", "T")).getTime();
  if (Number.isNaN(ms)) return { texto: "", tono: "gris" };
  const min = Math.floor(ms / 60000);
  if (min < 1) return { texto: "ahora", tono: "verde" };
  if (min < 60) return { texto: `hace ${min} min`, tono: "verde" };
  const h = Math.floor(min / 60);
  if (h < 24) return { texto: `hace ${h} h`, tono: h >= 4 ? "rojo" : "ambar" };
  const d = Math.floor(h / 24);
  return { texto: d === 1 ? "hace 1 día" : `hace ${d} días`, tono: "rojo" };
};

const COLOR_ESPERA = {
  verde: "text-emerald-600",
  ambar: "text-amber-600",
  rojo: "text-rose-600",
  gris: "text-gray-400",
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
const TAMANOS_MINIATURA = {
  // En la lista manda la densidad: cuanto más alta la fila, menos
  // publicaciones caben sin hacer scroll.
  lista: { caja: "h-20 w-20", icono: "text-3xl" },
  // En la cabecera del hilo sobra espacio y la imagen ayuda a reconocer de
  // qué publicación se está hablando.
  hilo: { caja: "h-28 w-28", icono: "text-5xl" },
};

const Miniatura = ({ post, tamano = "lista" }) => {
  const [falla, setFalla] = useState(false);
  const { caja, icono: tamIcono } =
    TAMANOS_MINIATURA[tamano] || TAMANOS_MINIATURA.lista;

  if (post.media_url && !falla) {
    return (
      <img
        src={post.media_url}
        alt=""
        loading="lazy"
        onError={() => setFalla(true)}
        className={`${caja} shrink-0 rounded-xl object-cover border border-gray-100 bg-gray-50`}
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
    <div
      className={`${caja} shrink-0 rounded-xl grid place-items-center bg-gray-50 border border-gray-100`}
    >
      <i className={`bx ${icono} ${tamIcono} text-gray-300`} />
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

  // Vista combinada: dos formas de llegar al mismo panel de detalle.
  //   pendientes  → lista plana de toda la cuenta, por antigüedad
  //   publicacion → publicaciones y su hilo, como estaba
  const [vista, setVista] = useState("pendientes");
  const [planos, setPlanos] = useState([]);
  const [cargandoPlanos, setCargandoPlanos] = useState(true);
  const [comentarioSel, setComentarioSel] = useState(null);
  const [estadoFiltro, setEstadoFiltro] = useState("pendientes");
  const [orden, setOrden] = useState("antiguos");
  const [busqueda, setBusqueda] = useState("");

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

  const cargarPlanos = useCallback(async () => {
    if (!id_configuracion) return;
    setCargandoPlanos(true);
    try {
      const { data } = await chatApi.get(ENDPOINTS.planos, {
        params: {
          id_configuracion,
          estado: estadoFiltro,
          orden,
          q: busqueda || undefined,
          limite: 100,
        },
      });
      setPlanos(data.comentarios || []);
    } catch (err) {
      console.error("[COMENTARIOS] no se pudo cargar la bandeja:", err);
      setPlanos([]);
    } finally {
      setCargandoPlanos(false);
    }
  }, [id_configuracion, estadoFiltro, orden, busqueda]);

  // El buscador escribe letra a letra: sin esta espera sería una consulta por
  // cada tecla.
  useEffect(() => {
    const t = setTimeout(cargarPlanos, busqueda ? 350 : 0);
    return () => clearTimeout(t);
  }, [cargarPlanos, busqueda]);

  /**
   * Tiempo real.
   *
   * El backend emite `COMENTARIO_ACTUALIZADO` cuando entra, se edita, se
   * oculta o se borra un comentario. Antes de esto la pantalla sólo consultaba
   * al abrirse o al pulsar "Actualizar", así que un comentario podía estar
   * minutos en la base sin que nadie lo viera.
   *
   * La señal sólo trae ids —el contenido se pide por el endpoint, que valida
   * el dueño—, así que al recibirla se relee. Y como el evento se reparte a
   * todos los navegadores conectados, hay que filtrar por cuenta: sin ese
   * filtro, la bandeja se recargaría con la actividad de otros clientes.
   */
  const recargarRef = useRef(null);
  recargarRef.current = () => {
    cargarPosts();
    cargarPlanos();
    if (seleccionado) recargarHiloRef.current?.(seleccionado.id_facebook_post);
  };
  const recargarHiloRef = useRef(null);

  useEffect(() => {
    if (!id_configuracion) return;

    const socket = io(import.meta.env.VITE_socket, {
      transports: ["websocket", "polling"],
    });

    // Una ráfaga de comentarios llegaría como una ráfaga de recargas. Se
    // agrupan: se relee una sola vez poco después del último aviso.
    let temporizador = null;
    const onComentario = (data) => {
      if (Number(data?.id_configuracion) !== Number(id_configuracion)) return;
      clearTimeout(temporizador);
      temporizador = setTimeout(() => recargarRef.current(), 600);
    };

    socket.on("COMENTARIO_ACTUALIZADO", onComentario);

    return () => {
      clearTimeout(temporizador);
      socket.off("COMENTARIO_ACTUALIZADO", onComentario);
      socket.disconnect();
    };
  }, [id_configuracion]);

  const abrirHilo = async (post) => {
    // Con dos paneles, volver a pulsar la publicación abierta no hace nada:
    // cerrarla dejaría el panel derecho vacío sin que nadie lo haya pedido.
    if (seleccionado?.id_facebook_post === post.id_facebook_post) return;
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
  /**
   * Cambio de vista conservando dónde estabas.
   *
   * Si vienes de un comentario en la lista plana y saltas a "por publicación",
   * se abre su publicación. Al revés no hay equivalente —un hilo no es un
   * comentario— así que sólo se cambia la vista.
   */
  const cambiarVista = (nueva) => {
    setVista(nueva);
    if (nueva === "publicacion" && comentarioSel) {
      const post = posts.find(
        (p) => p.id_facebook_post === comentarioSel.id_facebook_post,
      );
      if (post) abrirHilo(post);
    }
  };

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
    cargarPlanos();
  };

  // El efecto de tiempo real necesita recargar el hilo abierto, pero se define
  // antes que recargarHilo: la referencia salva el orden.
  recargarHiloRef.current = recargarHilo;

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

  // El detalle es el mismo en las dos vistas: cambia sólo cómo se llega a él.
  const hayDetalle =
    vista === "pendientes" ? !!comentarioSel : !!seleccionado;

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-4 lg:h-[calc(100vh-7rem)]">
      {/* Encabezado */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden shrink-0">
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

          {/* Interruptor de vista */}
          <div className="inline-flex rounded-xl overflow-hidden border border-white/30">
            {[
              ["pendientes", "Pendientes"],
              ["publicacion", "Por publicación"],
            ].map(([clave, texto]) => (
              <button
                key={clave}
                onClick={() => cambiarVista(clave)}
                aria-pressed={vista === clave}
                className={`px-3.5 py-2 text-sm transition ${
                  vista === clave
                    ? "bg-white text-blue-700 font-medium"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {texto}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              cargarPosts();
              cargarPlanos();
            }}
            disabled={cargando}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm bg-white/10 text-white border border-white/25 hover:bg-white/20 disabled:opacity-50 transition"
          >
            <i className={`bx bx-refresh text-base ${cargando ? "bx-spin" : ""}`} />
            Actualizar
          </button>
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
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900 shrink-0">
          <i className="bx bx-error-circle text-lg mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4">
        {/* ═══ IZQUIERDA ═══ */}
        <div
          className={`flex flex-col lg:flex-row gap-4 min-h-0 ${
            vista === "pendientes" ? "lg:flex-1" : "lg:w-[30rem] shrink-0"
          } ${hayDetalle ? "hidden lg:flex" : "flex"}`}
        >
          {vista === "pendientes" ? (
            /* ── Bandeja plana ── */
            <div className="flex-1 min-w-0 flex flex-col min-h-0">
              <div className="flex items-center gap-2 flex-wrap mb-3 shrink-0">
                {[
                  ["pendientes", "Sin responder"],
                  ["respondidos", "Respondidos"],
                  ["todos", "Todos"],
                ].map(([clave, texto]) => (
                  <button
                    key={clave}
                    onClick={() => setEstadoFiltro(clave)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition ${
                      estadoFiltro === clave
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {texto}
                  </button>
                ))}

                <select
                  id="orden-comentarios"
                  value={orden}
                  onChange={(e) => setOrden(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600"
                >
                  <option value="antiguos">Más antiguos primero</option>
                  <option value="nuevos">Más nuevos primero</option>
                </select>

                <input
                  id="buscar-comentarios"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por texto o autor…"
                  className="flex-1 min-w-[10rem] text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-400"
                />
              </div>

              <div className="flex-1 lg:overflow-y-auto space-y-2 lg:pr-1">
                {cargandoPlanos && !planos.length ? (
                  [0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-20 rounded-2xl bg-gray-100 animate-pulse"
                    />
                  ))
                ) : !planos.length ? (
                  <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
                    <div className="h-14 w-14 rounded-full bg-gray-50 border border-gray-100 grid place-items-center mx-auto mb-3">
                      <i className="bx bx-check-circle text-3xl text-gray-300" />
                    </div>
                    <p className="text-gray-700 font-medium">
                      {busqueda
                        ? "Ningún comentario coincide."
                        : estadoFiltro === "pendientes"
                          ? "No hay comentarios sin responder."
                          : "Todavía no hay comentarios."}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {busqueda ? "Prueba con otro texto." : "Todo al día."}
                    </p>
                  </div>
                ) : (
                  planos.map((c) => {
                    const activo =
                      comentarioSel?.id_facebook_comment ===
                      c.id_facebook_comment;
                    const esp = espera(c.comentado_at);
                    return (
                      <button
                        key={c.id_facebook_comment}
                        onClick={() => setComentarioSel(c)}
                        className={`w-full text-left rounded-2xl border bg-white p-3 transition ${
                          activo
                            ? "border-blue-300 ring-2 ring-blue-100"
                            : "border-gray-100 hover:border-gray-200 hover:shadow-sm"
                        }`}
                      >
                        <div className="flex gap-3">
                          <Avatar nombre={c.from_nombre} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-gray-900">
                                {c.from_nombre || "Usuario de Facebook"}
                              </span>
                              {c.respondido ? (
                                <Pastilla tono="verde">
                                  <i className="bx bx-check" />
                                  respondido
                                </Pastilla>
                              ) : (
                                <Pastilla tono="ambar">sin responder</Pastilla>
                              )}
                              {c.privado_enviado ? (
                                <Pastilla>privado enviado</Pastilla>
                              ) : null}
                              <span
                                className={`ml-auto text-xs shrink-0 ${COLOR_ESPERA[esp.tono]}`}
                              >
                                {esp.texto}
                              </span>
                            </div>

                            <p className="text-sm text-gray-800 mt-1 line-clamp-2">
                              {c.mensaje || (
                                <span className="italic text-gray-400">
                                  (sin texto)
                                </span>
                              )}
                            </p>

                            <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1.5 min-w-0">
                              <i className="bx bx-paperclip shrink-0" />
                              <span className="truncate">
                                {c.post_mensaje ||
                                  `Publicación ${c.post_id}`}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* ── Publicaciones ── */
            <aside className="flex-1 min-w-0 flex flex-col min-h-0">
              {/* El filtro vive aquí, no en el encabezado: sólo afecta a esta
                  vista. La bandeja plana tiene el suyo propio. */}
              <div className="shrink-0 mb-3">
                <button
                  onClick={() => setSoloPendientes((v) => !v)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition ${
                    soloPendientes
                      ? "bg-amber-500 border-amber-500 text-white"
                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <i className="bx bx-filter-alt mr-1" />
                  Solo con pendientes
                </button>
              </div>

              <div className="flex-1 lg:overflow-y-auto lg:pr-1">
              {cargando && !posts.length ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-24 rounded-2xl bg-gray-100 animate-pulse"
                    />
                  ))}
                </div>
              ) : null}

              {!cargando && !posts.length ? (
                <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
                  <div className="h-14 w-14 rounded-full bg-gray-50 border border-gray-100 grid place-items-center mx-auto mb-3">
                    <i className="bx bx-message-rounded-dots text-3xl text-gray-300" />
                  </div>
                  <p className="text-gray-700 font-medium">
                    Todavía no hay comentarios.
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Aparecerán aquí en cuanto alguien comente una publicación de
                    tu página.
                  </p>
                </div>
              ) : null}

              <div className="space-y-2">
                {posts.map((post) => {
                  const activo =
                    seleccionado?.id_facebook_post === post.id_facebook_post;
                  return (
                    <button
                      key={post.id_facebook_post}
                      onClick={() => abrirHilo(post)}
                      className={`w-full text-left rounded-2xl border bg-white p-3 transition ${
                        activo
                          ? "border-blue-300 ring-2 ring-blue-100 shadow-sm"
                          : "border-gray-100 hover:border-gray-200 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Miniatura post={post} />
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm line-clamp-2 ${
                              activo
                                ? "font-semibold text-blue-900"
                                : "font-medium text-gray-900"
                            }`}
                          >
                            {post.mensaje || `Publicación ${post.post_id}`}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
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
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-1.5">
                            <i className="bx bx-time-five" />
                            {fechaCorta(post.ultimo_comentario_at)}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              </div>
            </aside>
          )}
        </div>

        {/* ═══ DERECHA · el detalle, común a las dos vistas ═══ */}
        <section
          className={`flex-1 min-w-0 lg:overflow-y-auto ${
            hayDetalle ? "block" : "hidden lg:block"
          }`}
        >
          {!hayDetalle ? (
            <div className="h-full min-h-[18rem] rounded-2xl border border-dashed border-gray-200 bg-white/60 grid place-items-center text-center p-8">
              <div>
                <div className="h-14 w-14 rounded-full bg-gray-50 border border-gray-100 grid place-items-center mx-auto mb-3">
                  <i className="bx bx-conversation text-3xl text-gray-300" />
                </div>
                <p className="text-gray-700 font-medium">
                  {vista === "pendientes"
                    ? "Elige un comentario"
                    : "Elige una publicación"}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {vista === "pendientes"
                    ? "Podrás responderlo aquí mismo."
                    : "Sus comentarios aparecerán aquí."}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              {/* Cabecera del detalle */}
              <div className="border-b border-gray-100 p-4 flex items-start gap-3">
                <button
                  onClick={() => {
                    if (vista === "pendientes") setComentarioSel(null);
                    else {
                      setSeleccionado(null);
                      setHilo(null);
                    }
                  }}
                  className="lg:hidden h-9 w-9 shrink-0 rounded-xl grid place-items-center border border-gray-200 text-gray-500 hover:bg-gray-50"
                  aria-label="Volver"
                >
                  <i className="bx bx-arrow-back text-xl" />
                </button>

                <Miniatura
                  post={
                    vista === "pendientes"
                      ? {
                          media_url: comentarioSel.post_media_url,
                          tipo: comentarioSel.post_tipo,
                        }
                      : seleccionado
                  }
                  tamano="hilo"
                />

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 line-clamp-2">
                    {vista === "pendientes"
                      ? comentarioSel.post_mensaje ||
                        `Publicación ${comentarioSel.post_id}`
                      : seleccionado.mensaje ||
                        `Publicación ${seleccionado.post_id}`}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                    {vista === "publicacion" && seleccionado.tipo ? (
                      <Pastilla tono="azul">
                        {ETIQUETA_TIPO[seleccionado.tipo] || seleccionado.tipo}
                      </Pastilla>
                    ) : null}
                    {vista === "publicacion" && seleccionado.publicado_at ? (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                        <i className="bx bx-calendar" />
                        Publicado: {fechaCorta(seleccionado.publicado_at)}
                      </span>
                    ) : null}
                  </div>

                  {vista === "pendientes" ? (
                    <button
                      onClick={() => {
                        const post = posts.find(
                          (p) =>
                            p.id_facebook_post ===
                            comentarioSel.id_facebook_post,
                        );
                        if (post) {
                          setVista("publicacion");
                          abrirHilo(post);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 mt-2 text-xs text-blue-600 hover:underline"
                    >
                      <i className="bx bx-conversation" />
                      Ver el hilo completo
                    </button>
                  ) : seleccionado.permalink_url ? (
                    <a
                      href={seleccionado.permalink_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 text-xs text-blue-600 hover:underline"
                    >
                      <i className="bx bx-link-external" />
                      Ver la publicación en Facebook
                    </a>
                  ) : null}
                </div>
              </div>

              {/* Contenido */}
              <div className="px-4 pb-2 bg-gray-50/40">
                {vista === "pendientes" ? (
                  <Comentario
                    key={comentarioSel.id_facebook_comment}
                    nodo={comentarioSel}
                    onEnviar={enviarRespuesta}
                  />
                ) : cargandoHilo ? (
                  <div className="py-8 flex items-center justify-center gap-2 text-sm text-gray-500">
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
                  <div className="py-8 text-center text-sm text-gray-500">
                    Esta publicación no tiene comentarios visibles.
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
