import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import io from "socket.io-client";
import { useNavigate } from "react-router-dom";
import chatApi from "../../api/chatcenter";

const ENDPOINTS = {
  posts: "/facebook_comentarios/posts",
  planos: "/facebook_comentarios/comentarios",
  resumen: "/facebook_comentarios/resumen",
  comentarios: (id) => `/facebook_comentarios/posts/${id}/comentarios`,
  sugerir: "/facebook_comentarios/sugerir",
  productos: "/facebook_comentarios/productos",
  vincularProducto: "/facebook_comentarios/vincular-producto",
  sincronizar: "/facebook_comentarios/sincronizar-publicaciones",
  iaAutomatica: "/facebook_comentarios/ia-automatica",
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
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
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

/**
 * Contador del encabezado.
 *
 * Con `onClick` deja de ser un cartel y pasa a ser la entrada al filtro que le
 * corresponde: un número que señala trabajo pendiente y no lleva a ninguna
 * parte obliga a buscar a mano lo que ya se contó.
 */
const Metrica = ({ valor, etiqueta, tono = "gris", icono, onClick, activo }) => {
  const tonos = {
    gris: "text-gray-900",
    ambar: "text-amber-600",
    azul: "text-blue-700",
    indigo: "text-indigo-700",
  };
  const Caja = onClick ? "button" : "div";
  return (
    <Caja
      onClick={onClick}
      type={onClick ? "button" : undefined}
      className={`flex-1 min-w-[7rem] text-left rounded-xl border bg-white px-4 py-3 transition ${
        activo
          ? "border-indigo-300 ring-2 ring-indigo-100"
          : "border-gray-100"
      } ${onClick ? "hover:border-gray-300 hover:shadow-sm cursor-pointer" : ""}`}
    >
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        {icono ? <i className={`bx ${icono} text-sm`} /> : null}
        {etiqueta}
      </div>
      <div className={`text-2xl font-semibold mt-0.5 ${tonos[tono]}`}>
        {valor}
      </div>
    </Caja>
  );
};

/**
 * Un comentario, sus respuestas y el redactor.
 *
 * El árbol viene ya armado del backend, así que acá sólo se pinta. Se recorre
 * en profundidad aunque hoy Facebook sólo permite un nivel de anidación: si
 * algún día lo amplía, esto no hay que tocarlo.
 */
/**
 * Quién escribió cada respuesta nuestra.
 *
 * En el hilo todas se ven iguales, y no lo son. Saber si contestó una persona,
 * si salió una respuesta rápida del producto o si la redactó la IA es lo
 * primero que hace falta cuando un cliente reclama por lo que se le dijo — y
 * también es la forma de ver, sin contar a mano, cuánto está resolviendo solo
 * el catálogo y cuánto está haciendo falta el modelo.
 *
 * null no es un hueco: significa que esa respuesta se escribió desde Facebook y
 * no desde ChatCenter. Merece su propia etiqueta.
 */
const ORIGEN_RESPUESTA = {
  persona: {
    texto: "Persona",
    icono: "bx-user",
    clase: "border-gray-200 bg-gray-50 text-gray-600",
    ayuda: "La escribió un agente desde cero",
  },
  rapida: {
    texto: "Respuesta rápida",
    icono: "bx-bolt-circle",
    clase: "border-violet-200 bg-violet-50 text-violet-700",
    ayuda: "Texto del producto, publicado tal cual. No gastó tokens.",
  },
  rapida_editada: {
    texto: "Rápida · editada",
    icono: "bx-edit-alt",
    clase: "border-violet-200 bg-white text-violet-600",
    ayuda: "Salió de una respuesta rápida y el agente la cambió",
  },
  ia: {
    texto: "IA",
    icono: "bx-bot",
    clase: "border-blue-200 bg-blue-50 text-blue-700",
    ayuda: "Borrador de la IA publicado tal cual",
  },
  ia_editada: {
    texto: "IA · editada",
    icono: "bx-edit-alt",
    clase: "border-blue-200 bg-white text-blue-600",
    ayuda: "La IA propuso y el agente lo reescribió",
  },
  // Las dos de la respuesta automática. Se distinguen de 'ia' a propósito: una
  // la leyó alguien antes de publicarse y la otra no, y eso es justo lo que hay
  // que poder ver de un vistazo al revisar qué se publicó en la página.
  ia_auto: {
    texto: "IA · sola",
    icono: "bx-bot",
    clase: "border-emerald-200 bg-emerald-50 text-emerald-700",
    ayuda: "La IA contestó sola, sin que nadie lo revisara antes",
  },
  derivada: {
    texto: "IA · y al privado",
    icono: "bx-send",
    clase: "border-indigo-200 bg-indigo-50 text-indigo-700",
    ayuda:
      "No es la primera vez que esta persona comenta: se le contestó aquí y además se le escribió por el chat privado",
  },
  facebook: {
    texto: "Desde Facebook",
    icono: "bxl-facebook-circle",
    clase: "border-gray-200 bg-white text-gray-500",
    ayuda: "Se respondió fuera de ChatCenter, así que no sabemos con qué",
  },
};

const InsigniaOrigen = ({ origen, autor }) => {
  const o = ORIGEN_RESPUESTA[origen || "facebook"];
  if (!o) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] border ${o.clase}`}
      title={autor ? `${o.ayuda} · ${autor}` : o.ayuda}
    >
      <i className={`bx ${o.icono}`} />
      {o.texto}
      {autor && origen && origen !== "facebook" ? (
        <span className="opacity-70">· {autor}</span>
      ) : null}
    </span>
  );
};

/**
 * Producto de la publicación.
 *
 * Es lo que decide qué sabe el asistente al redactar. Sin producto vinculado
 * solo puede reconocer el comentario y mandar al privado; con producto contesta
 * de verdad, y si ese producto tiene respuestas rápidas cargadas responde con
 * el texto que escribió el negocio, sin gastar tokens.
 *
 * Se vincula a mano. Se miró deducirlo del anuncio (anuncios_producto enlaza
 * anuncio → producto) y el id del anuncio no aparece dentro del id de la
 * publicación, así que automatizarlo hoy sería adivinar.
 */
/**
 * Interruptor de la respuesta automática, para esta publicación.
 *
 * Va pegado al selector de producto porque son las dos mitades de la misma
 * decisión: el producto dice QUÉ puede contestar la IA aquí, y esto dice si
 * contesta sola. Sin producto se muestra apagado y sin efecto — no es un fallo,
 * es la regla que impide que hable de algo que no conoce.
 */
const InterruptorIaPost = ({ postId, activa, hayProducto, onCambiar }) => {
  const encendida = Boolean(activa) && hayProducto;

  return (
    <div
      className={`mt-2 inline-flex items-center gap-2 pl-2.5 pr-1.5 py-1 rounded-lg border text-xs transition ${
        encendida
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-gray-200 bg-white text-gray-500"
      }`}
      title={
        !hayProducto
          ? "Vincula un producto para que la IA pueda contestar sola"
          : encendida
            ? "La IA contesta sola los comentarios de esta publicación"
            : "Los comentarios de esta publicación los respondes tú"
      }
    >
      <i className={`bx ${encendida ? "bx-bot" : "bx-user-check"}`} />
      <span>
        {!hayProducto
          ? "IA automática (falta producto)"
          : encendida
            ? "Responde sola"
            : "Respondes tú"}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={encendida}
        disabled={!hayProducto}
        onClick={() => onCambiar(postId, !activa)}
        className={`h-5 w-9 shrink-0 rounded-full p-0.5 transition disabled:opacity-40 ${
          encendida ? "bg-emerald-500" : "bg-gray-300"
        }`}
      >
        <span
          className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${
            encendida ? "translate-x-4" : ""
          }`}
        />
      </button>
    </div>
  );
};

const SelectorProducto = ({
  postId,
  idProducto,
  nombreProducto,
  productos,
  cargando,
  onVincular,
}) => {
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState("");
  const [guardando, setGuardando] = useState(false);

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return productos;
    return productos.filter((p) => (p.nombre || "").toLowerCase().includes(t));
  }, [productos, q]);

  const elegir = async (id) => {
    if (guardando) return;
    setGuardando(true);
    try {
      await onVincular(postId, id);
      setAbierto(false);
      setQ("");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="relative mt-2">
      <button
        onClick={() => setAbierto((v) => !v)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition ${
          idProducto
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
        }`}
        title={
          idProducto
            ? "La IA responde con la ficha de este producto"
            : "Sin producto, la IA solo puede mandar al privado"
        }
      >
        <i className={`bx ${idProducto ? "bx-purchase-tag" : "bx-link"}`} />
        <span className="max-w-[220px] truncate">
          {idProducto
            ? nombreProducto || `Producto #${idProducto}`
            : "Vincular producto"}
        </span>
        <i className="bx bx-chevron-down opacity-60" />
      </button>

      {abierto ? (
        <div className="absolute z-20 mt-1.5 w-80 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar producto…"
              autoFocus
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-300"
            />
          </div>

          <div className="max-h-64 overflow-y-auto">
            {cargando ? (
              <div className="p-3 text-xs text-gray-500 flex items-center gap-2">
                <i className="bx bx-loader-alt bx-spin" />
                Cargando productos…
              </div>
            ) : !filtrados.length ? (
              <div className="p-3 text-xs text-gray-500">
                No hay productos que coincidan.
              </div>
            ) : (
              filtrados.map((p) => (
                <button
                  key={p.id}
                  onClick={() => elegir(p.id)}
                  disabled={guardando}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-gray-50 disabled:opacity-50 ${
                    p.id === idProducto ? "bg-emerald-50/60" : ""
                  }`}
                >
                  {p.imagen_url ? (
                    <img
                      src={p.imagen_url}
                      alt=""
                      className="h-8 w-8 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <span className="h-8 w-8 rounded-lg bg-gray-100 grid place-items-center shrink-0 text-gray-400">
                      <i className="bx bx-box" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs text-gray-800 truncate">
                      {p.nombre}
                    </span>
                    <span className="block text-[11px] text-gray-400">
                      {p.precio != null ? `${p.precio}` : "sin precio"}
                    </span>
                  </span>
                  {/* Con respuestas cargadas la sugerencia sale del texto del
                      negocio y no cuesta tokens: merece señalarse. */}
                  {p.tiene_respuestas ? (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-600 border border-violet-100 shrink-0"
                      title="Tiene respuestas rápidas cargadas"
                    >
                      <i className="bx bx-bolt-circle" />
                    </span>
                  ) : null}
                </button>
              ))
            )}
          </div>

          {idProducto ? (
            <button
              onClick={() => elegir(null)}
              disabled={guardando}
              className="w-full px-3 py-2 text-left text-xs text-red-600 border-t border-gray-100 hover:bg-red-50 disabled:opacity-50"
            >
              <i className="bx bx-unlink mr-1" />
              Quitar el producto de esta publicación
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

const Comentario = ({ nodo, nivel = 0, onEnviar, onSugerir }) => {
  const [modo, setModo] = useState(null); // 'publico' | 'privado' | null
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [sugiriendo, setSugiriendo] = useState(false);
  const [origenSugerencia, setOrigenSugerencia] = useState(null);
  /* El borrador del privado y si sale o no. Van juntos pero separados del
     texto público: el agente puede editar uno sin tocar el otro, y puede
     publicar sólo el comentario desmarcando la casilla. */
  const [privado, setPrivado] = useState("");
  const [mandarPrivado, setMandarPrivado] = useState(false);
  const [aviso, setAviso] = useState(null);

  /**
   * Pide un borrador a la IA y lo pone en el cuadro de texto.
   *
   * No publica: rellena. El agente lo lee, lo corrige si hace falta y decide.
   * Esa frontera es la que se le declaró a Meta sobre pages_manage_engagement,
   * y es lo que evita que una alucinación acabe publicada en la página de un
   * cliente.
   *
   * Si ya había algo escrito no se pisa: lo que escribió una persona pesa más
   * que lo que propone el modelo.
   */
  const sugerir = async () => {
    if (sugiriendo || !onSugerir) return;
    setSugiriendo(true);
    setError(null);
    try {
      const r = await onSugerir(nodo.comment_id);
      if (r?.sugerencia) {
        setTexto((prev) => (prev.trim() ? prev : r.sugerencia));
        setOrigenSugerencia(r);

        /* El privado sólo se ofrece si de verdad se puede mandar: Facebook
           permite uno por comentario y no sobre uno propio. Viene marcado
           cuando la respuesta pública lo promete —ahí no mandarlo es quedar
           mal— y desmarcado cuando es de cortesía. */
        if (r.privado && puedePrivado) {
          setPrivado(r.privado);
          setMandarPrivado(r.privado_prometido);
        }
      }
    } catch (err) {
      setError(
        err?.response?.data?.message || "No se pudo redactar la sugerencia.",
      );
    } finally {
      setSugiriendo(false);
    }
  };

  const abrir = (m) => {
    setModo(m);
    setTexto("");
    setError(null);
    setOrigenSugerencia(null);
    setPrivado("");
    setMandarPrivado(false);
    setAviso(null);
  };

  /**
   * De dónde salió el texto que se va a publicar.
   *
   * Pedir sugerencia y publicarla tal cual no es lo mismo que pedirla y
   * reescribirla entera: en el segundo caso la respuesta es de la persona,
   * aunque la haya arrancado el modelo. Se compara el texto final con el que
   * propuso el backend; si cambió, se marca "editada".
   *
   * Si nunca se pidió sugerencia, es 'persona' y no hay nada que comparar.
   */
  const calcularOrigen = () => {
    if (!origenSugerencia) return "persona";
    const base =
      origenSugerencia.origen === "respuesta_rapida" ? "rapida" : "ia";
    const igual =
      texto.trim() === String(origenSugerencia.sugerencia || "").trim();
    return igual ? base : `${base}_editada`;
  };

  const enviar = async () => {
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    setError(null);
    setAviso(null);
    try {
      const r = await onEnviar({
        comment_id: nodo.comment_id,
        mensaje: texto,
        privado: modo === "privado",
        // Sólo cuando el agente lo dejó marcado y hay texto. Desmarcarlo
        // publica el comentario y nada más.
        mensajePrivado:
          modo === "publico" && mandarPrivado && privado.trim()
            ? privado.trim()
            : null,
        origen: calcularOrigen(),
      });
      setModo(null);
      setTexto("");
      setOrigenSugerencia(null);
      setPrivado("");
      setMandarPrivado(false);
      // El comentario salió y el privado no. No es un error del envío, pero
      // hay que verlo: el privado no se reintenta solo.
      if (r?.avisoPrivado) setAviso(r.avisoPrivado);
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || "No se pudo enviar.",
      );
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
              <>
                <Pastilla tono="azul">página</Pastilla>
                {/* De dónde salió esta respuesta. Sin esto, la que escribió
                    una persona y la que redactó el modelo se ven idénticas. */}
                <InsigniaOrigen
                  origen={nodo.origen_respuesta}
                  autor={nodo.respondido_por_nombre}
                />
              </>
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

          {/* La respuesta pública salió y el privado no. Va fuera del cuadro
              de respuesta porque ese ya se cerró: el envío no falló. */}
          {aviso ? (
            <p className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 mt-1.5">
              <i className="bx bx-error mt-0.5 shrink-0" />
              <span className="min-w-0">{aviso}</span>
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

              {/* El privado que propuso la IA, para que salga con el mismo
                  clic. Vive acá y no en su propio flujo porque son una sola
                  decisión: si la respuesta pública dice "te escribo al
                  privado", mandar una sin la otra deja al negocio prometiendo
                  algo que nadie cumple. */}
              {modo === "publico" && privado ? (
                <div
                  className={`mt-2.5 rounded-xl border transition ${
                    mandarPrivado
                      ? "border-indigo-200 bg-indigo-50/60"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <label className="flex items-start gap-2 px-3 pt-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={mandarPrivado}
                      onChange={(e) => setMandarPrivado(e.target.checked)}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-400"
                    />
                    <span className="min-w-0">
                      <span
                        className={`text-xs font-semibold ${
                          mandarPrivado ? "text-indigo-900" : "text-gray-600"
                        }`}
                      >
                        <i className="bx bx-lock-alt mr-1" />
                        También escribirle al privado
                      </span>
                      <span className="block text-[11px] text-gray-500 mt-0.5">
                        {origenSugerencia?.privado_prometido
                          ? "La respuesta pública lo promete, así que conviene mandarlo."
                          : "La respuesta pública ya quedó completa: esto es opcional."}
                      </span>
                    </span>
                  </label>

                  <div className="px-3 pb-3 pt-2">
                    <textarea
                      value={privado}
                      onChange={(e) => setPrivado(e.target.value)}
                      rows={3}
                      disabled={!mandarPrivado}
                      className="w-full text-sm bg-white border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-100 disabled:text-gray-400 transition"
                    />
                    {mandarPrivado ? (
                      <p className="flex items-start gap-1.5 text-[11px] text-indigo-700 mt-1.5">
                        <i className="bx bx-right-arrow-circle mt-0.5 shrink-0" />
                        {origenSugerencia?.producto?.nombre
                          ? `Abre el chat con el contexto de ${origenSugerencia.producto.nombre} y, cuando responda, sigue la IA del kanban.`
                          : "Abre el chat en Messenger y, cuando responda, sigue la IA del kanban."}
                      </p>
                    ) : null}
                  </div>
                </div>
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
                      : mandarPrivado && privado.trim()
                        ? "Publicar y escribir al privado"
                        : "Publicar respuesta"}
                </button>
                {/* Sólo en la respuesta pública: el privado abre una
                    conversación y ahí escribe la persona, no el modelo. */}
                {modo === "publico" && onSugerir ? (
                  <button
                    onClick={sugerir}
                    disabled={sugiriendo || enviando}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 disabled:opacity-50 transition"
                    title={
                      texto.trim()
                        ? "Ya escribiste algo: la sugerencia no lo va a pisar"
                        : "Redacta un borrador con la IA"
                    }
                  >
                    <i
                      className={`bx ${sugiriendo ? "bx-loader-alt bx-spin" : "bx-bulb"}`}
                    />
                    {sugiriendo ? "Redactando…" : "Sugerir respuesta"}
                  </button>
                ) : null}

                {/* De dónde salió el borrador. Importa: una respuesta rápida
                    son palabras que escribió el negocio y se puede publicar
                    casi sin mirar; una de la IA hay que leerla. */}
                {origenSugerencia ? (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] border ${
                      origenSugerencia.origen === "respuesta_rapida"
                        ? "border-violet-200 bg-violet-50 text-violet-700"
                        : origenSugerencia.origen === "ia_sin_producto"
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-gray-200 bg-gray-50 text-gray-600"
                    }`}
                    title={
                      origenSugerencia.origen === "respuesta_rapida"
                        ? `Respuesta que el negocio escribió para: ${origenSugerencia.pregunta || "esta pregunta"}`
                        : origenSugerencia.origen === "ia_sin_producto"
                          ? "Esta publicación no tiene producto vinculado, así que la IA no sabe de qué habla"
                          : `IA con la ficha de ${origenSugerencia.producto?.nombre || "el producto"}`
                    }
                  >
                    <i
                      className={`bx ${
                        origenSugerencia.origen === "respuesta_rapida"
                          ? "bx-bolt-circle"
                          : origenSugerencia.origen === "ia_sin_producto"
                            ? "bx-error-circle"
                            : "bx-purchase-tag"
                      }`}
                    />
                    {origenSugerencia.origen === "respuesta_rapida"
                      ? "Respuesta del negocio"
                      : origenSugerencia.origen === "ia_sin_producto"
                        ? "Sin producto vinculado"
                        : origenSugerencia.producto?.nombre || "IA"}
                  </span>
                ) : null}

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
  const navigate = useNavigate();

  const id_configuracion = useMemo(() => {
    const v = localStorage.getItem("id_configuracion");
    return v ? Number(v) : null;
  }, []);

  const [posts, setPosts] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [soloPendientes, setSoloPendientes] = useState(false);
  // Publicaciones a las que todavía no se les dijo de qué producto hablan: la
  // IA las contesta, pero sin precios ni respuestas del wizard.
  const [sinProducto, setSinProducto] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [avisoFeed, setAvisoFeed] = useState(null);
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

  // Catálogo para vincular la publicación a un producto. Se pide una sola vez:
  // no cambia mientras dura la sesión de la bandeja.
  const [productos, setProductos] = useState([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);

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
            sin_producto: sinProducto ? 1 : 0,
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
  }, [id_configuracion, soloPendientes, sinProducto]);

  useEffect(() => {
    cargarPosts();
  }, [cargarPosts]);

  /**
   * Releer el feed de la página.
   *
   * Al abrir la bandeja el backend ya lo hace solo, pero con una frescura de
   * 10 minutos: si acabas de publicar y quieres vincularle el producto ahora,
   * este botón se salta la espera. No publica nada en Facebook.
   */
  const buscarPublicaciones = useCallback(async () => {
    if (!id_configuracion) return;
    setSincronizando(true);
    setAvisoFeed(null);
    try {
      const { data } = await chatApi.post(ENDPOINTS.sincronizar, {}, {
        params: { id_configuracion },
      });
      await cargarPosts();
      // Dos novedades posibles y pueden darse juntas: entraron publicaciones
      // nuevas y salieron las que el negocio borró de Facebook.
      const partes = [];
      if (data?.nuevas) {
        partes.push(
          `${data.nuevas} ${
            data.nuevas === 1 ? "publicación nueva" : "publicaciones nuevas"
          } en la bandeja.`,
        );
      }
      if (data?.borradas) {
        partes.push(
          data.borradas === 1
            ? "1 publicación ya no existe en Facebook y salió de la bandeja."
            : `${data.borradas} publicaciones ya no existen en Facebook y salieron de la bandeja.`,
        );
      }
      setAvisoFeed(
        data?.errores?.length
          ? { tono: "rojo", texto: data.errores.join(" · ") }
          : {
              tono: "verde",
              texto: partes.length
                ? partes.join(" ")
                : "Ya estaban todas: no hay publicaciones nuevas.",
            },
      );
    } catch (err) {
      setAvisoFeed({
        tono: "rojo",
        texto:
          err?.response?.data?.message ||
          "No se pudieron leer las publicaciones de la página.",
      });
    } finally {
      setSincronizando(false);
    }
  }, [id_configuracion, cargarPosts]);

  // El aviso es una confirmación, no un error que haya que atender: se va solo.
  useEffect(() => {
    if (!avisoFeed) return undefined;
    const t = setTimeout(() => setAvisoFeed(null), 6000);
    return () => clearTimeout(t);
  }, [avisoFeed]);

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

  /**
   * Pide el borrador al backend. No publica nada.
   *
   * Devuelve el objeto entero y no sólo el texto porque el origen importa: una
   * respuesta rápida son palabras del negocio y se puede publicar casi sin
   * mirar; una de la IA hay que leerla; y "sin producto vinculado" es un aviso
   * de que ese post todavía no está configurado.
   */
  const pedirSugerencia = async (comment_id) => {
    const { data } = await chatApi.post(ENDPOINTS.sugerir, {
      id_configuracion,
      comment_id,
    });
    if (!data?.sugerencia) return null;
    return {
      sugerencia: data.sugerencia,
      // Borrador del mensaje privado, cuando la IA propone seguir por ahí. No
      // se envía solo: es otro borrador que el agente lee y decide.
      privado: data.privado || null,
      // Lo decide el backend mirando si la respuesta pública promete el
      // privado. Si lo promete, va marcado; si es de cortesía, desmarcado.
      privado_prometido: Boolean(data.privado_prometido),
      origen: data.origen || null,
      producto: data.producto || null,
      pregunta: data.pregunta || null,
    };
  };

  const cargarProductos = useCallback(async () => {
    if (!id_configuracion) return;
    setCargandoProductos(true);
    try {
      const { data } = await chatApi.get(ENDPOINTS.productos, {
        params: { id_configuracion },
      });
      setProductos(data.productos || []);
    } catch {
      // Sin catálogo el selector queda vacío, pero la bandeja sigue sirviendo.
      setProductos([]);
    } finally {
      setCargandoProductos(false);
    }
  }, [id_configuracion]);

  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  /**
   * Vincula la publicación a un producto (o lo quita, con id null).
   *
   * Refresca las dos listas y el comentario abierto, porque el producto se
   * muestra en la cabecera del detalle y en la lista de publicaciones.
   */
  const vincularProducto = async (post_id, id_producto) => {
    await chatApi.post(ENDPOINTS.vincularProducto, {
      id_configuracion,
      post_id,
      id_producto,
    });

    const prod = id_producto
      ? productos.find((p) => p.id === id_producto) || null
      : null;

    setSeleccionado((s) =>
      s && s.post_id === post_id
        ? { ...s, id_producto, producto_nombre: prod?.nombre || null }
        : s,
    );
    setComentarioSel((c) =>
      c && c.post_id === post_id
        ? {
            ...c,
            post_id_producto: id_producto,
            post_producto_nombre: prod?.nombre || null,
          }
        : c,
    );

    cargarPosts();
    cargarPlanos();
  };

  /**
   * Encender o apagar la IA en UNA publicación.
   *
   * Se pinta antes de que conteste el servidor y se revierte si falla: es un
   * interruptor, y un interruptor que tarda medio segundo en moverse se
   * aprieta dos veces.
   */
  const cambiarIaPost = async (post_id, activa) => {
    const pintar = (v) => {
      setSeleccionado((s) =>
        s && s.post_id === post_id ? { ...s, ia_automatica: v ? 1 : 0 } : s,
      );
      setComentarioSel((c) =>
        c && c.post_id === post_id
          ? { ...c, post_ia_automatica: v ? 1 : 0 }
          : c,
      );
      setPosts((lista) =>
        lista.map((p) =>
          p.post_id === post_id ? { ...p, ia_automatica: v ? 1 : 0 } : p,
        ),
      );
    };

    pintar(activa);
    try {
      await chatApi.post(ENDPOINTS.iaAutomatica, {
        id_configuracion,
        post_id,
        activa,
      });
    } catch (err) {
      pintar(!activa);
      setAvisoFeed({
        tono: "rojo",
        texto:
          err?.response?.data?.message ||
          "No se pudo cambiar la IA de esta publicación.",
      });
    }
  };

  /**
   * Envía la respuesta. Un solo clic puede mandar las dos cosas.
   *
   * `privado` (booleano) es el modo: el agente abrió el cuadro del privado y
   * sólo quiere mandar eso. `mensajePrivado` (texto) es el otro caso: está
   * publicando una respuesta pública y además sale el privado. Son distintos y
   * conviven, porque el botón de privado suelto sigue existiendo.
   *
   * Cuando van los dos, el backend publica primero y manda el privado después:
   * si lo público dice "te escribo al privado", el comentario es la promesa y
   * el privado es cumplirla, en ese orden.
   */
  const enviarRespuesta = async ({
    comment_id,
    mensaje,
    privado,
    mensajePrivado,
    origen,
  }) => {
    const { data } = await chatApi.post(
      privado ? ENDPOINTS.responderPrivado : ENDPOINTS.responder,
      {
        id_configuracion,
        comment_id,
        mensaje,
        // El privado no lo usa: ahí la conversación sigue en el chat, y el
        // origen de cada mensaje ya se guarda por ese camino.
        ...(privado ? {} : { origen }),
        ...(!privado && mensajePrivado ? { privado: mensajePrivado } : {}),
      },
    );

    if (seleccionado) await recargarHilo(seleccionado.id_facebook_post);
    cargarPosts();
    cargarPlanos();

    /* El comentario sí se publicó y el privado no: el backend devuelve 200 a
       propósito, porque un error haría que el agente reescribiera algo que ya
       está en Facebook. Se avisa, pero no se trata como un fallo del envío. */
    if (data?.privado && data.privado.enviado === false) {
      return {
        avisoPrivado: `La respuesta se publicó, pero el mensaje privado no salió: ${data.privado.error}`,
      };
    }
    return {};
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

          {/* Configurar el asistente. Vive en su propia ruta porque tiene
              explicación y probador, y se entra a leerla tanto como a
              cambiarla. */}
          <button
            onClick={() => navigate("/comentarios/asistente")}
            title="Configurar el asistente de comentarios"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm bg-white/10 text-white border border-white/25 hover:bg-white/20 transition"
          >
            <i className="bx bx-bot text-lg" />
            <span className="hidden sm:inline">Asistente</span>
          </button>

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
            {/* Clic = ir a verlas. El número solo no sirve de nada si hay que
                buscarlas una por una. */}
            <Metrica
              valor={resumen.posts_sin_producto ?? 0}
              etiqueta="Sin producto vinculado"
              tono={resumen.posts_sin_producto ? "indigo" : "gris"}
              icono="bx-package"
              activo={vista === "publicacion" && sinProducto}
              onClick={() => {
                const prender = !(vista === "publicacion" && sinProducto);
                setVista("publicacion");
                setSinProducto(prender);
              }}
            />
            <Metrica
              valor={resumen.posts ?? posts.length}
              etiqueta="Publicaciones"
              icono="bx-list-ul"
            />
          </div>
        ) : null}

        {avisoFeed ? (
          <div
            className={`flex items-center gap-2 px-4 py-2.5 text-sm border-t ${
              avisoFeed.tono === "rojo"
                ? "bg-rose-50 border-rose-100 text-rose-800"
                : "bg-emerald-50 border-emerald-100 text-emerald-800"
            }`}
          >
            <i
              className={`bx ${
                avisoFeed.tono === "rojo" ? "bx-error-circle" : "bx-check-circle"
              } text-base shrink-0`}
            />
            <span>{avisoFeed.texto}</span>
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
              <div className="shrink-0 mb-3 flex items-center gap-2 flex-wrap">
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

                <button
                  onClick={() => setSinProducto((v) => !v)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition ${
                    sinProducto
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <i className="bx bx-package mr-1" />
                  Sin producto
                </button>

                {/* Las publicaciones entran solas al abrir la bandeja, pero con
                    10 minutos de margen. Esto es para cuando acabas de
                    publicar y la quieres configurar ya. */}
                <button
                  onClick={buscarPublicaciones}
                  disabled={sincronizando}
                  title="Volver a leer las publicaciones de tu página en Facebook"
                  className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-gray-200 bg-white text-gray-600 hover:border-gray-300 disabled:opacity-50 transition"
                >
                  <i
                    className={`bx bx-sync ${sincronizando ? "bx-spin" : ""}`}
                  />
                  {sincronizando ? "Buscando…" : "Buscar nuevas"}
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

              {/* La lista ya no son "publicaciones con comentarios" sino las
                  publicaciones de la página, así que el vacío depende del
                  filtro: con `sin_producto` puesto, vacío es buena noticia. */}
              {!cargando && !posts.length ? (
                <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
                  <div className="h-14 w-14 rounded-full bg-gray-50 border border-gray-100 grid place-items-center mx-auto mb-3">
                    <i
                      className={`bx ${
                        sinProducto
                          ? "bx-check-double text-emerald-400"
                          : "bx-news text-gray-300"
                      } text-3xl`}
                    />
                  </div>
                  {sinProducto ? (
                    <>
                      <p className="text-gray-700 font-medium">
                        Todas tienen producto vinculado.
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        El asistente puede contestar con precios y condiciones
                        en cualquiera de ellas.
                      </p>
                    </>
                  ) : soloPendientes ? (
                    <>
                      <p className="text-gray-700 font-medium">
                        Nada sin responder.
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Quita el filtro para ver todas las publicaciones.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-700 font-medium">
                        No encontramos publicaciones.
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Se leen de tu página de Facebook al abrir esta pantalla.
                        Si acabas de publicar, prueba con «Buscar nuevas».
                      </p>
                    </>
                  )}
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
                              {post.total_comentarios
                                ? `${post.total_comentarios} ${
                                    post.total_comentarios === 1
                                      ? "comentario"
                                      : "comentarios"
                                  }`
                                : "Sin comentarios"}
                            </Pastilla>
                            {post.sin_responder > 0 ? (
                              <Pastilla tono="ambar">
                                {post.sin_responder} sin responder
                              </Pastilla>
                            ) : null}
                            {/* De qué producto habla. Se ve desde la lista
                                porque es lo que hay que arreglar antes de que
                                llegue el primer comentario, no después. */}
                            {post.producto_nombre ? (
                              <Pastilla tono="verde">
                                <i className="bx bx-package" />
                                <span className="truncate max-w-[9rem]">
                                  {post.producto_nombre}
                                </span>
                              </Pastilla>
                            ) : (
                              <Pastilla tono="indigo">
                                <i className="bx bx-package" />
                                Sin producto
                              </Pastilla>
                            )}
                            {/* Solo cuando hay producto: sin él la IA no
                                contesta igual, y dos avisos para la misma
                                causa confunden. */}
                            {post.producto_nombre &&
                            Number(post.ia_automatica) !== 1 ? (
                              <Pastilla>
                                <i className="bx bx-user-check" />
                                IA apagada
                              </Pastilla>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-1.5">
                            <i
                              className={`bx ${
                                post.ultimo_comentario_at
                                  ? "bx-time-five"
                                  : "bx-calendar"
                              }`}
                            />
                            {post.ultimo_comentario_at
                              ? `Último comentario ${fechaCorta(
                                  post.ultimo_comentario_at,
                                )}`
                              : `Publicado ${fechaCorta(post.publicado_at)}`}
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

                  {/* Qué producto es. Decide qué puede contestar el asistente
                      en los comentarios de esta publicación. */}
                  <SelectorProducto
                    postId={
                      vista === "pendientes"
                        ? comentarioSel.post_id
                        : seleccionado.post_id
                    }
                    idProducto={
                      vista === "pendientes"
                        ? comentarioSel.post_id_producto
                        : seleccionado.id_producto
                    }
                    nombreProducto={
                      vista === "pendientes"
                        ? comentarioSel.post_producto_nombre
                        : seleccionado.producto_nombre
                    }
                    productos={productos}
                    cargando={cargandoProductos}
                    onVincular={vincularProducto}
                  />

                  <InterruptorIaPost
                    postId={
                      vista === "pendientes"
                        ? comentarioSel.post_id
                        : seleccionado.post_id
                    }
                    activa={
                      vista === "pendientes"
                        ? comentarioSel.post_ia_automatica
                        : seleccionado.ia_automatica
                    }
                    hayProducto={Boolean(
                      vista === "pendientes"
                        ? comentarioSel.post_id_producto
                        : seleccionado.id_producto,
                    )}
                    onCambiar={cambiarIaPost}
                  />
                </div>
              </div>

              {/* Contenido */}
              <div className="px-4 pb-2 bg-gray-50/40">
                {vista === "pendientes" ? (
                  <Comentario
                    key={comentarioSel.id_facebook_comment}
                    nodo={comentarioSel}
                    onEnviar={enviarRespuesta}
                    onSugerir={pedirSugerencia}
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
                      onSugerir={pedirSugerencia}
                    />
                  ))
                ) : (
                  /* Antes este hueco sólo salía si se habían borrado todos los
                     comentarios. Ahora es el caso normal de una publicación
                     recién hecha, así que en vez de un aviso vacío dice qué
                     conviene hacer mientras no llega nadie. */
                  <div className="py-8 px-4 text-center">
                    <i className="bx bx-message-rounded-dots text-3xl text-gray-300" />
                    <p className="text-sm text-gray-600 mt-2">
                      Todavía nadie ha comentado esta publicación.
                    </p>
                    {seleccionado && !seleccionado.id_producto ? (
                      <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 mt-3 inline-block max-w-sm">
                        <i className="bx bx-package mr-1" />
                        Vincúlale el producto ahora, arriba: así el asistente ya
                        sabe de qué habla cuando llegue el primer comentario.
                      </p>
                    ) : null}
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
