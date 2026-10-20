import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import chatApi from "../../api/chatcenter";

/**
 * Configuración del asistente de comentarios.
 *
 * DOS COLUMNAS, Y LA DERECHA ES LA PUBLICACIÓN
 *
 * Configurar arriba y probar abajo costaba un viaje con scroll por cada
 * cambio, y cuando comprobar cuesta, se deja de comprobar. Ahora las opciones
 * quedan a la izquierda y la vista previa pegada a la derecha, dibujada como
 * la publicación de Facebook que va a ser: foto, nombre de la página, el
 * comentario del cliente y la respuesta debajo.
 *
 * Las respuestas se acumulan en el hilo a propósito. El defecto que no se ve
 * en una caja suelta es la repetición: tres respuestas seguidas que arrancan
 * igual parecen un robot, y eso sólo salta leyéndolas juntas, como las lee
 * quien entra a la publicación.
 *
 * EL MODO AVANZADO ESTÁ SIEMPRE A LA VISTA
 *
 * Y por eso hay que decir en pantalla que manda sobre las opciones: si no,
 * alguien con instrucciones propias escritas mueve los botones de arriba, no
 * pasa nada, y no entiende por qué. La tarjeta de opciones se atenúa y lo
 * avisa mientras haya texto abajo.
 *
 * Lo que NO se puede tocar son las reglas del sistema —no inventar, no pedir
 * datos personales en público, devolver sólo el texto—. Se muestran para que
 * se sepa que están. Un comentario es público y permanente: se puede cambiar
 * cómo habla el asistente, no quitarle los frenos.
 */

const ENDPOINTS = {
  asistente: "/facebook_comentarios/asistente",
  probar: "/facebook_comentarios/probar-prompt",
  productos: "/facebook_comentarios/productos",
};

/* Cubren las tres formas de responder, para que la pantalla no abra con el
   cursor parpadeando en un campo vacío. */
const EJEMPLOS = [
  "¿cuánto cuesta?",
  "¿qué incluye?",
  "¿hacen envío a Cuenca?",
  "me encanta 😍",
  "¿tienen otros modelos?",
];

/* Nombres de mentira para el hilo simulado. Que cada comentario tenga cara
   distinta es lo que hace que se lea como una publicación y no como una lista
   de pruebas. */
const CARAS = [
  { nombre: "María Salazar", color: "from-pink-500 to-purple-600" },
  { nombre: "Jorge Vaca", color: "from-cyan-600 to-teal-700" },
  { nombre: "Ana Cedeño", color: "from-orange-500 to-orange-700" },
  { nombre: "Luis Andrade", color: "from-emerald-500 to-green-700" },
  { nombre: "Carla Mite", color: "from-indigo-500 to-blue-700" },
];

const ORIGEN = {
  respuesta_rapida: {
    texto: "Respuesta rápida",
    icono: "bx-bolt-circle",
    clase: "border-violet-200 bg-violet-50 text-violet-700",
  },
  ia_con_producto: {
    texto: "Asistente",
    icono: "bx-bot",
    clase: "border-blue-200 bg-blue-50 text-blue-700",
  },
  ia_sin_producto: {
    texto: "Sin producto",
    icono: "bx-error-circle",
    clase: "border-amber-200 bg-amber-50 text-amber-700",
  },
};

/* Cada tarjeta lleva su color. Sin eso, seis bloques blancos con el mismo
   borde se leen como una lista y no como partes distintas. */
const TONOS = {
  azul: "bg-blue-50 text-blue-600 ring-blue-100",
  violeta: "bg-violet-50 text-violet-600 ring-violet-100",
  pizarra: "bg-slate-100 text-slate-600 ring-slate-200",
  ambar: "bg-amber-50 text-amber-600 ring-amber-100",
};

const Tarjeta = ({
  titulo,
  sub,
  icono,
  tono = "azul",
  accion,
  atenuada,
  children,
}) => (
  <section
    className={`rounded-2xl border border-gray-200/80 bg-white overflow-hidden transition ${
      atenuada ? "opacity-55" : ""
    }`}
    style={{
      boxShadow:
        "0 1px 2px rgba(16,24,40,.04), 0 12px 28px -18px rgba(16,24,40,.28)",
    }}
  >
    <header className="px-4 py-3.5 border-b border-gray-100 flex items-center gap-3 bg-gradient-to-b from-gray-50/80 to-transparent">
      {icono ? (
        <span
          className={`h-8 w-8 shrink-0 rounded-xl grid place-items-center ring-1 ${TONOS[tono]}`}
        >
          <i className={`bx ${icono} text-base`} />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-gray-900 tracking-tight">
          {titulo}
        </h2>
        {sub ? (
          <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{sub}</p>
        ) : null}
      </div>
      {accion}
    </header>
    <div className="p-4">{children}</div>
  </section>
);

/** Agrupa campos bajo un rótulo. Rompe la rejilla plana en bloques con tema. */
const Grupo = ({ titulo, icono, children }) => (
  <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5">
    <div className="flex items-center gap-1.5 mb-3">
      <i className={`bx ${icono} text-gray-400 text-sm`} />
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
        {titulo}
      </span>
    </div>
    <div className="grid sm:grid-cols-2 gap-4">{children}</div>
  </div>
);

const Campo = ({ etiqueta, ayuda, children, ancho }) => (
  <div className={ancho ? "sm:col-span-2" : undefined}>
    <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
      {etiqueta}
    </label>
    {children}
    {ayuda ? (
      <p className="text-[10.5px] text-gray-400 mt-1.5 leading-snug">{ayuda}</p>
    ) : null}
  </div>
);

/**
 * Control segmentado. El activo sube sobre fondo blanco en vez de pintarse de
 * azul sólido: se distingue igual y no llena la columna de bloques de color.
 */
const Par = ({ valor, onChange, opciones }) => (
  <div className="inline-flex gap-0.5 p-0.5 rounded-xl bg-gray-100 border border-gray-200/70">
    {opciones.map((o) => {
      const on = valor === o.valor;
      return (
        <button
          key={String(o.valor)}
          type="button"
          onClick={() => onChange(o.valor)}
          className={`px-3 py-1.5 rounded-[9px] text-[11.5px] transition ${
            on
              ? "bg-white text-blue-700 font-semibold shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {o.texto}
        </button>
      );
    })}
  </div>
);

const entradaBase =
  "w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs text-gray-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

/** Un eslabón de la cadena "respuesta rápida → asistente → al privado". */
const Eslabon = ({ tono, etapa, titulo, texto, icono }) => {
  const c = {
    violeta:
      "border-violet-200/80 bg-gradient-to-br from-violet-50 to-white text-violet-800",
    azul: "border-blue-200/80 bg-gradient-to-br from-blue-50 to-white text-blue-800",
    ambar:
      "border-amber-200/80 bg-gradient-to-br from-amber-50 to-white text-amber-800",
  }[tono];
  const chip = {
    violeta: "bg-violet-100 text-violet-600",
    azul: "bg-blue-100 text-blue-600",
    ambar: "bg-amber-100 text-amber-600",
  }[tono];
  return (
    <div className={`flex-1 min-w-[170px] rounded-2xl border px-3.5 py-3 ${c}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`h-6 w-6 rounded-lg grid place-items-center ${chip}`}>
          <i className={`bx ${icono} text-sm`} />
        </span>
        <span className="text-[9.5px] font-bold uppercase tracking-wider opacity-60">
          {etapa}
        </span>
      </div>
      <p className="text-[12.5px] font-semibold leading-tight">{titulo}</p>
      <p className="text-[10.5px] opacity-75 mt-1 leading-snug">{texto}</p>
    </div>
  );
};

const Flecha = () => (
  <i className="bx bx-chevron-right text-gray-300 text-2xl self-center shrink-0 hidden sm:block" />
);

export default function AsistenteComentarios() {
  const navigate = useNavigate();

  const id_configuracion = useMemo(() => {
    const v = localStorage.getItem("id_configuracion");
    return v ? Number(v) : null;
  }, []);

  const [datos, setDatos] = useState(null);
  const [opciones, setOpciones] = useState(null);
  const [avanzado, setAvanzado] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);

  // Vista previa
  const [productos, setProductos] = useState([]);
  const [idProducto, setIdProducto] = useState("");
  const [borrador, setBorrador] = useState("");
  const [probando, setProbando] = useState(false);
  const [hilo, setHilo] = useState([]);
  const [errorPrueba, setErrorPrueba] = useState(null);

  // Con instrucciones propias escritas, las opciones de arriba no se usan.
  const mandaAvanzado = Boolean(avanzado.trim());

  const producto = useMemo(
    () => productos.find((p) => String(p.id) === String(idProducto)) || null,
    [productos, idProducto],
  );

  /* El backend manda las reglas como un párrafo con guiones. Partirlo en
     viñetas evita el bloque gris ilegible que nadie lee. */
  const reglas = useMemo(() => {
    const t = datos?.reglas_del_sistema || "";
    return t
      .split(/\n(?=- )/)
      .slice(1)
      .map((s) => s.replace(/^-\s*/, "").replace(/\s+/g, " ").trim())
      .filter(Boolean);
  }, [datos]);

  const cargar = useCallback(async () => {
    if (!id_configuracion) return;
    setCargando(true);
    setError(null);
    try {
      const [ra, rp] = await Promise.all([
        chatApi.get(ENDPOINTS.asistente, { params: { id_configuracion } }),
        chatApi.get(ENDPOINTS.productos, { params: { id_configuracion } }),
      ]);
      setDatos(ra.data);
      setOpciones(ra.data.opciones);
      setAvanzado(ra.data.avanzado || "");

      const lista = rp.data.productos || [];
      setProductos(lista);
      // Preselecciona uno con respuestas rápidas: probar con un producto sin
      // nada cargado enseña el peor caso, no el normal.
      const elegido = lista.find((p) => p.tiene_respuestas) || lista[0];
      if (elegido) setIdProducto(String(elegido.id));
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "No se pudo cargar la configuración del asistente.",
      );
    } finally {
      setCargando(false);
    }
  }, [id_configuracion]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cambiar = (clave, valor) =>
    setOpciones((o) => ({ ...(o || {}), [clave]: valor }));

  const guardar = async () => {
    if (guardando) return;
    setGuardando(true);
    setError(null);
    setAviso(null);
    try {
      const { data } = await chatApi.put(ENDPOINTS.asistente, {
        id_configuracion,
        opciones,
        avanzado,
      });
      setDatos(data);
      setOpciones(data.opciones);
      setAviso("Guardado.");
      setTimeout(() => setAviso(null), 2500);
    } catch (err) {
      setError(err?.response?.data?.message || "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };

  const probar = async (texto) => {
    const t = String(texto || "").trim();
    if (probando || !t) return;
    setProbando(true);
    setErrorPrueba(null);
    try {
      // Se mandan las opciones SIN guardar: el punto es ver qué sale antes de
      // decidir, no después.
      const { data } = await chatApi.post(ENDPOINTS.probar, {
        id_configuracion,
        texto: t,
        id_producto: idProducto ? Number(idProducto) : null,
        opciones,
        avanzado,
      });
      setHilo((h) => [...h, { pregunta: t, ...data }]);
      setBorrador("");
    } catch (err) {
      setErrorPrueba(
        err?.response?.data?.message || "No se pudo probar el asistente.",
      );
    } finally {
      setProbando(false);
    }
  };

  if (!id_configuracion) {
    return (
      <div className="p-6 text-sm text-gray-500">
        No hay una configuración seleccionada.
      </div>
    );
  }

  if (cargando || !opciones) {
    return (
      <div className="p-10 flex items-center justify-center gap-2 text-sm text-gray-500">
        <i className="bx bx-loader-alt bx-spin text-lg" />
        Cargando el asistente…
      </div>
    );
  }

  const negocio = datos?.negocio || "Tu página";

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-4">
      {/* ── Cabecera ───────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden shadow-sm shrink-0">
        <div className="relative bg-gradient-to-br from-sky-600 via-blue-700 to-indigo-800 text-white px-5 py-4 flex items-center gap-3 flex-wrap">
          {/* Halo suave: quita la sensación de banda plana de color. */}
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                "radial-gradient(520px circle at 12% -30%, rgba(255,255,255,.28), transparent 60%)",
            }}
          />
          <button
            onClick={() => navigate("/comentarios")}
            className="relative h-10 w-10 rounded-full bg-white/15 grid place-items-center shrink-0 hover:bg-white/25 transition"
            aria-label="Volver a comentarios"
          >
            <i className="bx bx-arrow-back text-xl" />
          </button>
          <div className="relative min-w-0 flex-1">
            <h1 className="text-lg font-semibold leading-tight tracking-tight">
              Asistente de comentarios
            </h1>
            <p className="text-sm text-white/80">
              Redacta borradores para tus publicaciones. Nunca publica solo.
            </p>
          </div>
          <button
            onClick={guardar}
            disabled={guardando}
            className="relative inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-white text-blue-700 hover:bg-blue-50 disabled:opacity-50 transition shadow-sm"
          >
            <i
              className={`bx ${guardando ? "bx-loader-alt bx-spin" : "bx-save"} text-lg`}
            />
            {guardando ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs px-4 py-3">
          {error}
        </div>
      ) : null}
      {aviso ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs px-4 py-3">
          <i className="bx bx-check-circle mr-1" />
          {aviso}
        </div>
      ) : null}

      {/* ── La cadena: qué se intenta antes de qué ─────────────── */}
      <div className="flex gap-2 flex-wrap sm:flex-nowrap">
        <Eslabon
          tono="violeta"
          etapa="Primero"
          icono="bx-bolt-circle"
          titulo="Respuesta rápida"
          texto="Si está cargada en el producto, sale tal cual. No cuesta nada."
        />
        <Flecha />
        <Eslabon
          tono="azul"
          etapa="Si no"
          icono="bx-bot"
          titulo="El asistente"
          texto="Redacta con la ficha del producto. Aquí manda lo que configures."
        />
        <Flecha />
        <Eslabon
          tono="ambar"
          etapa="Sin producto"
          icono="bx-link"
          titulo="Al privado"
          texto="No sabe de qué se habla: reconoce el comentario e invita."
        />
      </div>

      {/* ── Dos columnas ───────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr] items-start">
        {/* ── Izquierda: lo que se configura ── */}
        <div className="flex flex-col gap-4 min-w-0">
          <Tarjeta
            titulo="Cómo quieres que hable"
            sub="Lo que decide tu negocio. No hace falta escribir instrucciones."
            icono="bx-message-rounded-detail"
            tono="azul"
            atenuada={mandaAvanzado}
            accion={
              mandaAvanzado ? (
                <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border border-amber-200 bg-amber-50 text-amber-700">
                  <i className="bx bx-info-circle" />
                  Sin efecto
                </span>
              ) : null
            }
          >
            <div className="flex flex-col gap-3">
              <Grupo titulo="Su voz" icono="bx-user-voice">
                <Campo etiqueta="Trato">
                  <Par
                    valor={opciones.trato}
                    onChange={(v) => cambiar("trato", v)}
                    opciones={[
                      { valor: "tu", texto: "De tú" },
                      { valor: "usted", texto: "De usted" },
                    ]}
                  />
                </Campo>

                <Campo
                  etiqueta="País"
                  ayuda="Para los modismos. No cambia el idioma."
                >
                  <input
                    id="asistente-pais"
                    value={opciones.pais}
                    onChange={(e) => cambiar("pais", e.target.value)}
                    maxLength={40}
                    className={entradaBase}
                  />
                </Campo>

                <Campo etiqueta="Largo de la respuesta">
                  <Par
                    valor={opciones.max_frases}
                    onChange={(v) => cambiar("max_frases", v)}
                    opciones={[
                      { valor: 1, texto: "1 frase" },
                      { valor: 2, texto: "2 frases" },
                      { valor: 3, texto: "3 frases" },
                    ]}
                  />
                </Campo>

                <Campo etiqueta="Emojis">
                  <Par
                    valor={opciones.emojis}
                    onChange={(v) => cambiar("emojis", v)}
                    opciones={[
                      { valor: "uno", texto: "Uno como mucho" },
                      { valor: "ninguno", texto: "Ninguno" },
                    ]}
                  />
                </Campo>
              </Grupo>

              <Grupo titulo="Qué puede decir en público" icono="bx-shield-quarter">
                <Campo
                  etiqueta="Precios"
                  ayuda={
                    opciones.publicar_precios
                      ? "Si lo sabe, lo dice en el comentario."
                      : "Aunque lo sepa, no lo publica: invita al privado."
                  }
                >
                  <Par
                    valor={opciones.publicar_precios ? "si" : "no"}
                    onChange={(v) => cambiar("publicar_precios", v === "si")}
                    opciones={[
                      { valor: "si", texto: "Publicar" },
                      { valor: "no", texto: "Sólo al privado" },
                    ]}
                  />
                </Campo>

                <Campo
                  etiqueta="Invitar al privado"
                  ayuda={
                    opciones.empujar_privado === "siempre"
                      ? "Cierra siempre invitando, haya respondido o no."
                      : "Sólo cuando quede algo por resolver."
                  }
                >
                  <Par
                    valor={opciones.empujar_privado}
                    onChange={(v) => cambiar("empujar_privado", v)}
                    opciones={[
                      { valor: "cuando_falte", texto: "Cuando haga falta" },
                      { valor: "siempre", texto: "Siempre" },
                    ]}
                  />
                </Campo>

                <Campo
                  etiqueta="Que siempre mencione"
                  ayuda="Ej: que somos tienda oficial."
                >
                  <textarea
                    id="asistente-mencionar"
                    value={opciones.siempre_mencionar}
                    onChange={(e) => cambiar("siempre_mencionar", e.target.value)}
                    maxLength={400}
                    rows={2}
                    placeholder="Opcional"
                    className={`${entradaBase} resize-none leading-relaxed`}
                  />
                </Campo>

                <Campo
                  etiqueta="Que nunca diga"
                  ayuda="Ej: que el producto cura enfermedades."
                >
                  <textarea
                    id="asistente-nunca"
                    value={opciones.nunca_decir}
                    onChange={(e) => cambiar("nunca_decir", e.target.value)}
                    maxLength={400}
                    rows={2}
                    placeholder="Opcional"
                    className={`${entradaBase} resize-none leading-relaxed`}
                  />
                </Campo>
              </Grupo>
            </div>
          </Tarjeta>

          {/* Modo avanzado: siempre a la vista, con su aviso. */}
          <Tarjeta
            titulo="Tus propias instrucciones"
            sub="Opcional. Si escribes aquí, reemplazan las opciones de arriba."
            icono="bx-code-alt"
            tono="ambar"
            accion={
              mandaAvanzado ? (
                <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700">
                  <i className="bx bx-check-circle" />
                  En uso
                </span>
              ) : (
                <span className="shrink-0 text-[10px] text-gray-400">Vacío</span>
              )
            }
          >
            <div className="rounded-xl border border-gray-200 overflow-hidden bg-slate-50">
              <div className="px-3 py-1.5 border-b border-gray-200 bg-white flex items-center gap-1.5">
                <span className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-300" />
                  <span className="h-2 w-2 rounded-full bg-amber-300" />
                  <span className="h-2 w-2 rounded-full bg-emerald-300" />
                </span>
                <span className="text-[10px] text-gray-400 ml-1">
                  instrucciones del asistente
                </span>
                <span className="ml-auto text-[10px] text-gray-400 tabular-nums">
                  {avanzado.length} / 4000
                </span>
              </div>
              <textarea
                id="asistente-avanzado"
                value={avanzado}
                onChange={(e) => setAvanzado(e.target.value)}
                maxLength={4000}
                rows={10}
                placeholder={datos?.vista_previa || ""}
                className="w-full px-3 py-2.5 bg-transparent text-[11.5px] font-mono text-gray-800 outline-none leading-relaxed resize-y"
              />
            </div>
            <p className="text-[10.5px] text-gray-400 mt-2 leading-snug">
              Déjalo vacío para volver a las opciones de arriba. Pruébalo aquí al
              lado antes de guardar.
            </p>
          </Tarjeta>

          <Tarjeta
            titulo="Reglas del sistema"
            sub="Se aplican siempre, también con tus propias instrucciones."
            icono="bx-lock-alt"
            tono="pizarra"
          >
            <ul className="flex flex-col gap-2">
              {reglas.map((r, i) => (
                <li key={i} className="flex gap-2.5 items-start">
                  <span className="h-4 w-4 mt-0.5 shrink-0 rounded-md bg-slate-100 text-slate-400 grid place-items-center">
                    <i className="bx bx-lock-alt text-[9px]" />
                  </span>
                  <span className="text-[11.5px] text-gray-500 leading-relaxed">
                    {r}
                  </span>
                </li>
              ))}
            </ul>
          </Tarjeta>
        </div>

        {/* ── Derecha: la publicación ── */}
        <div className="lg:sticky lg:top-4 min-w-0">
          <Tarjeta
            titulo="Así se verá"
            sub="Simulación. No se publica nada en Facebook."
            icono="bx-show"
            tono="violeta"
            accion={
              hilo.length ? (
                <button
                  onClick={() => setHilo([])}
                  className="shrink-0 text-[11px] text-gray-400 hover:text-gray-600"
                >
                  Limpiar
                </button>
              ) : null
            }
          >
            <select
              id="asistente-producto"
              value={idProducto}
              onChange={(e) => {
                setIdProducto(e.target.value);
                setHilo([]);
              }}
              className={`${entradaBase} mb-3`}
            >
              <option value="">Publicación sin producto vinculado</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.tiene_respuestas ? "⚡ " : ""}
                  {p.nombre}
                </option>
              ))}
            </select>

            {/* ── La publicación ── */}
            <div
              className="rounded-2xl border border-gray-200 overflow-hidden bg-white"
              style={{ boxShadow: "0 8px 20px -14px rgba(16,24,40,.35)" }}
            >
              <div className="px-3 py-2.5 flex gap-2.5 items-center">
                <span className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-sky-600 to-blue-700 grid place-items-center text-white text-xs font-bold ring-2 ring-white shadow-sm">
                  {negocio.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-blue-700 truncate">
                    {negocio}
                  </p>
                  <p className="text-[10.5px] text-gray-400 flex items-center gap-1">
                    hace 2 h · <i className="bx bx-globe" />
                  </p>
                </div>
              </div>

              {producto?.nombre ? (
                <p className="px-3 pb-2.5 text-xs text-gray-700 leading-relaxed">
                  {producto.nombre}
                  {producto.precio != null ? (
                    <span className="font-semibold"> — ${producto.precio}</span>
                  ) : null}
                </p>
              ) : null}

              {/* La foto del producto hace de foto de la publicación. Es lo que
                  convierte el bloque en algo que se lee como Facebook. */}
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 aspect-[4/3] max-h-56 w-full grid place-items-center overflow-hidden">
                {producto?.imagen_url ? (
                  <img
                    src={producto.imagen_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-[11px] text-gray-400 flex flex-col items-center gap-1">
                    <i className="bx bx-image text-2xl" />
                    Sin imagen
                  </span>
                )}
              </div>

              {/* Barra de reacciones: es lo que termina de leerse como Facebook. */}
              <div className="px-3 py-2 flex items-center gap-1.5 border-b border-gray-100">
                <span className="flex -space-x-1">
                  <span className="h-4 w-4 rounded-full bg-blue-600 grid place-items-center text-white text-[8px] ring-2 ring-white">
                    <i className="bx bxs-like" />
                  </span>
                  <span className="h-4 w-4 rounded-full bg-red-500 grid place-items-center text-white text-[8px] ring-2 ring-white">
                    <i className="bx bxs-heart" />
                  </span>
                </span>
                <span className="text-[10.5px] text-gray-400">
                  {hilo.length
                    ? `${hilo.length} comentario${hilo.length === 1 ? "" : "s"}`
                    : "Sin comentarios"}
                </span>
              </div>

              {/* ── El hilo ── */}
              <div className="bg-gray-50/70 px-3 py-3 space-y-3">
                {!hilo.length ? (
                  <p className="text-[11px] text-gray-400 text-center py-3 leading-relaxed">
                    Escribe un comentario abajo y mira qué respondería.
                    <br />
                    Prueba varios seguidos: así se nota si el tono se repite.
                  </p>
                ) : (
                  hilo.map((r, i) => {
                    const cara = CARAS[i % CARAS.length];
                    const o = ORIGEN[r.origen] || ORIGEN.ia_con_producto;
                    return (
                      <div key={i} className="space-y-2">
                        {/* comentario del cliente */}
                        <div className="flex gap-2">
                          <span
                            className={`h-7 w-7 shrink-0 rounded-full bg-gradient-to-br ${cara.color} grid place-items-center text-white text-[10px] font-bold`}
                          >
                            {cara.nombre.slice(0, 1)}
                          </span>
                          <div className="rounded-2xl bg-white border border-gray-200 px-3 py-1.5 min-w-0">
                            <p className="text-[11.5px] font-semibold text-gray-800">
                              {cara.nombre}
                            </p>
                            <p className="text-xs text-gray-600 leading-snug">
                              {r.pregunta}
                            </p>
                          </div>
                        </div>

                        {/* nuestra respuesta */}
                        <div className="flex gap-2 ml-6">
                          <span className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-sky-600 to-blue-700 grid place-items-center text-white text-[10px] font-bold">
                            {negocio.slice(0, 1).toUpperCase()}
                          </span>
                          <div className="flex-1 min-w-0 rounded-2xl bg-white border border-blue-200/70 px-3 py-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11.5px] font-semibold text-blue-700">
                                {negocio}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] border ${o.clase}`}
                              >
                                <i className={`bx ${o.icono}`} />
                                {o.texto}
                              </span>
                              <span className="text-[10px] text-gray-400 tabular-nums">
                                {r.ms ? `${r.ms} ms` : "sin costo"}
                              </span>
                            </div>
                            <p className="text-xs text-gray-700 leading-snug mt-0.5">
                              {r.sugerencia}
                            </p>
                            {r.nota ? (
                              <p className="text-[10.5px] text-gray-400 mt-1 leading-snug">
                                {r.nota}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        {/* El privado, si el asistente propuso seguir por ahí.
                            Se enseña acá porque es parte de lo que va a hacer:
                            configurar el prompt sin ver el privado es ver la
                            mitad. Se dibuja distinto del comentario a
                            propósito — ese lo ve todo el mundo, este no. */}
                        {r.privado ? (
                          <div className="ml-12 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/70 px-3 py-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-800">
                                <i className="bx bx-lock-alt" />
                                Mensaje privado
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-md border ${
                                  r.privado_prometido
                                    ? "border-indigo-300 bg-white text-indigo-700"
                                    : "border-gray-300 bg-white text-gray-500"
                                }`}
                              >
                                {r.privado_prometido
                                  ? "se manda: lo prometió en público"
                                  : "opcional: va desmarcado"}
                              </span>
                            </div>
                            <p className="text-xs text-indigo-950/80 leading-snug mt-1">
                              {r.privado}
                            </p>
                            <p className="text-[10.5px] text-indigo-700/70 mt-1 leading-snug">
                              Abre el chat de Messenger y, cuando el cliente
                              conteste, sigue la IA del kanban con este producto.
                            </p>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── Escribir el comentario de prueba ── */}
            <div className="mt-3">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {EJEMPLOS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => probar(e)}
                    disabled={probando}
                    className="px-2.5 py-1 rounded-lg text-[10.5px] border border-gray-200 bg-white text-gray-500 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 disabled:opacity-50 transition"
                  >
                    {e}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  id="asistente-borrador"
                  value={borrador}
                  onChange={(e) => setBorrador(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && probar(borrador)}
                  placeholder="Escribe un comentario…"
                  className={`${entradaBase} flex-1 min-w-0`}
                />
                <button
                  onClick={() => probar(borrador)}
                  disabled={probando || !borrador.trim()}
                  className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 disabled:opacity-50 transition"
                >
                  <i
                    className={`bx ${probando ? "bx-loader-alt bx-spin" : "bx-play"}`}
                  />
                  {probando ? "Probando…" : "Probar"}
                </button>
              </div>

              {errorPrueba ? (
                <div className="mt-2 rounded-xl border border-red-200 bg-red-50 text-red-700 text-[11px] px-3 py-2">
                  {errorPrueba}
                </div>
              ) : null}
            </div>
          </Tarjeta>
        </div>
      </div>
    </div>
  );
}
