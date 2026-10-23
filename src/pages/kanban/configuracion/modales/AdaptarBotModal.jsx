// src/pages/kanban/configuracion/modales/AdaptarBotModal.jsx
//
// "Adaptar el bot a mi negocio": para quien no es e-commerce ni calza en una
// plantilla global. Tres momentos:
//   1) cuestionario (lo manda el back: cambiar una pregunta no pide deploy)
//   2) la IA de la cuenta devuelve "así entiendo tu negocio" + el embudo que
//      va a construir; el dueño confirma o corrige ANTES de tocar nada
//   3) se construye el tablero (reemplaza el actual) y se prueba ahí mismo.
//
// Layout: riel izquierdo oscuro con los pasos y el estado de la cuenta;
// contenido a la derecha con una sola columna de lectura (máx. 640px) y la
// botonera fija abajo. Los ejemplos van DEBAJO del campo, no como placeholder:
// dentro del input se cortaban y parecían texto ya escrito.
//
// Todo el estado nace limpio en cada apertura: quien lo monta lo renderiza
// condicionalmente.
import React, { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import chatApi from "../../../../api/chatcenter";
import ChatPruebaModal from "../ChatPruebaModal";
// Agente de IA (render 3D, fondo transparente) que preside la escena de proceso.
import agenteImg from "../../../../assets/agente-ia.png";

const BG_DARK = "#171931";

/* Vista previa de la animación: con true el modal abre directo en la pantalla
   de proceso, en bucle, con una barra para alternar entre "comprender",
   "construir" y el formulario. Sirve para revisar la escena sin llenar el
   cuestionario; en producción va en false (aprobada el 2026-10-23). */
const PREVIEW_PROCESO = false;

const FRASES_COMPRENDIENDO = [
  "Leyendo lo que nos contaste…",
  "Cruzando con tu catálogo…",
  "Entendiendo cómo cierras una venta…",
  "Separando lo que el bot debe y no debe hacer…",
  "Armando el embudo de tu negocio…",
];

const ETAPAS_CONSTRUIR = [
  { titulo: "Retirando el tablero anterior", icono: "bx bx-eraser" },
  { titulo: "Creando las etapas de tu embudo", icono: "bx bx-columns" },
  { titulo: "Escribiendo el asistente de cada etapa", icono: "bx bx-bot" },
  { titulo: "Programando los seguimientos", icono: "bx bx-time-five" },
  { titulo: "Cargando tu catálogo en el bot", icono: "bx bx-package" },
];

const ICONO_COLUMNA = {
  contacto_inicial: "bx bx-conversation",
  fuera_zona: "bx bx-map-alt",
  por_agendar: "bx bx-calendar-plus",
  cita_agendada: "bx bx-calendar-check",
  atendido: "bx bx-happy-heart-eyes",
  venta_producto: "bx bx-cart",
  venta_cerrada: "bx bx-check-circle",
  cotizacion: "bx bx-file",
  por_cerrar: "bx bx-briefcase",
  asesor: "bx bx-user-voice",
  perdidos: "bx bx-x-circle",
};

const TONO_LABEL = { cercano: "Cercano", formal: "Formal", otro: "A medida" };

/* Borrador en memoria por cuenta: si el dueño cierra el modal sin querer, al
   reabrirlo sigue donde iba. Vive solo hasta que recargue la página (no se
   persiste a propósito: cuando recarga, empieza de cero). */
const BORRADORES = new Map();

const mensajeDeError = (err, porDefecto) =>
  err?.response?.data?.message || err?.message || porDefecto;

const swalOpts = { confirmButtonColor: "#6366f1", customClass: { container: "swal-over-modal" } };

const AdaptarBotModal = ({ id_configuracion, onTableroConstruido, onClose }) => {
  const borrador = BORRADORES.get(id_configuracion) || null;
  // 1..N cuestionario · 'comprendiendo' · 'revision' · 'construyendo' · 'listo'
  const [paso, setPaso] = useState(() =>
    PREVIEW_PROCESO
      ? "comprendiendo"
      : borrador && (typeof borrador.paso === "number" || borrador.paso === "revision")
        ? borrador.paso
        : 1,
  );
  // Solo en vista previa: la pantalla de proceso corre en bucle sin llamar al back.
  const [demo, setDemo] = useState(PREVIEW_PROCESO);
  const [estado, setEstado] = useState(null);
  const [cuestionario, setCuestionario] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [respuestas, setRespuestas] = useState(() => borrador?.respuestas || {});
  const [ficha, setFicha] = useState(() => borrador?.ficha || null);
  const [plan, setPlan] = useState(() => borrador?.plan || null);

  useEffect(() => {
    if (paso === "listo") return;
    const p = typeof paso === "number" || paso === "revision" ? paso : "revision";
    BORRADORES.set(id_configuracion, { respuestas, paso: ficha ? p : typeof paso === "number" ? paso : 1, ficha, plan });
  }, [id_configuracion, respuestas, paso, ficha, plan]);
  const [ajustes, setAjustes] = useState("");
  const [resultado, setResultado] = useState(null);
  const [fraseIdx, setFraseIdx] = useState(0);
  const [etapaIdx, setEtapaIdx] = useState(0);
  const [probar, setProbar] = useState(false);
  const cuerpoRef = useRef(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [{ data: e }, { data: c }] = await Promise.all([
          chatApi.post("/kanban_plantillas/adaptar/estado", { id_configuracion }),
          chatApi.post("/kanban_plantillas/adaptar/cuestionario", { id_configuracion }),
        ]);
        if (!vivo) return;
        setEstado(e?.data || null);
        setCuestionario(c?.data?.pasos || []);
        setRespuestas((r) => ({ nombre_negocio: e?.data?.nombre_configuracion || "", ...r }));
      } catch (err) {
        if (!vivo) return;
        Swal.fire({ icon: "error", title: "No se pudo cargar", text: mensajeDeError(err, "Intenta de nuevo."), ...swalOpts });
        onClose?.();
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [id_configuracion]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (paso !== "comprendiendo") return undefined;
    setFraseIdx(0);
    const n = FRASES_COMPRENDIENDO.length;
    const t = setInterval(
      () => setFraseIdx((i) => (demo ? (i + 1) % (n + 1) : Math.min(i + 1, n - 1))),
      2600,
    );
    return () => clearInterval(t);
  }, [paso, demo]);

  useEffect(() => {
    if (paso !== "construyendo") return undefined;
    setEtapaIdx(0);
    const n = ETAPAS_CONSTRUIR.length;
    const t = setInterval(
      () => setEtapaIdx((i) => (demo ? (i + 1) % (n + 1) : Math.min(i + 1, n - 1))),
      2600,
    );
    return () => clearInterval(t);
  }, [paso, demo]);

  useEffect(() => {
    cuerpoRef.current?.scrollTo?.({ top: 0 });
  }, [paso]);

  const totalCuestionario = cuestionario.length;
  const pasoCuestionario = typeof paso === "number" ? cuestionario[paso - 1] : null;
  const sinKey = Boolean(estado && !estado.tiene_api_key);

  /* Riel: los pasos del cuestionario (del back) + revisión + construcción. */
  const rielPasos = useMemo(() => {
    const base = cuestionario.map((p, i) => ({
      key: i + 1,
      titulo: p.titulo,
      detalle: p.subtitulo,
    }));
    base.push({ key: "revision", titulo: "Revisión", detalle: "Confirmas cómo entendimos tu negocio." });
    base.push({ key: "construccion", titulo: "Construcción", detalle: "Tu tablero queda listo para probar." });
    return base;
  }, [cuestionario]);

  const rielActivo =
    typeof paso === "number" ? paso : paso === "comprendiendo" || paso === "revision" ? "revision" : "construccion";
  const rielIndice = rielPasos.findIndex((p) => p.key === rielActivo);

  const setRespuesta = (clave, valor) => setRespuestas((r) => ({ ...r, [clave]: valor }));

  /* Preguntas condicionadas (mostrar_si): solo existen cuando la respuesta
     de la que dependen coincide; si no, no se muestran ni se validan. */
  const visible = (p) => !p.mostrar_si || respuestas[p.mostrar_si.clave] === p.mostrar_si.valor;

  const faltaObligatoria = (p) => {
    const v = respuestas[p.clave];
    if (!p.obligatorio || !visible(p)) return false;
    if (Array.isArray(v)) return v.length === 0;
    return !String(v ?? "").trim();
  };

  const siguiente = async () => {
    if (!pasoCuestionario) return;
    const pendiente = pasoCuestionario.preguntas.find(faltaObligatoria);
    if (pendiente) {
      Swal.fire({ icon: "warning", title: "Falta un dato", text: pendiente.titulo, ...swalOpts });
      return;
    }
    if (paso < totalCuestionario) {
      setPaso(paso + 1);
      return;
    }
    await comprender(respuestas);
  };

  const comprender = async (resp) => {
    setPaso("comprendiendo");
    try {
      const { data } = await chatApi.post("/kanban_plantillas/adaptar/comprender", {
        id_configuracion,
        respuestas: resp,
      });
      setFicha(data?.data?.ficha || null);
      setPlan(data?.data?.plan || null);
      setAjustes("");
      setPaso("revision");
    } catch (err) {
      const code = err?.response?.data?.code;
      Swal.fire({
        icon: "error",
        title: code === "SIN_API_KEY" ? "Falta tu llave de OpenAI" : "No pudimos entender el negocio",
        text: mensajeDeError(err, "Intenta de nuevo."),
        ...swalOpts,
      });
      setPaso(ficha ? "revision" : totalCuestionario || 1);
    }
  };

  /* La corrección se suma a las reglas del dueño y la IA rehace la ficha. */
  const reentender = async () => {
    const extra = ajustes.trim();
    if (!extra) return;
    const nuevas = { ...respuestas, reglas: [respuestas.reglas, extra].filter(Boolean).join("\n") };
    setRespuestas(nuevas);
    await comprender(nuevas);
  };

  const construir = async () => {
    const actuales = Number(estado?.columnas || 0);
    const r = await Swal.fire({
      icon: "question",
      title: actuales ? "¿Reemplazar tu tablero actual?" : "¿Construimos tu tablero?",
      html: actuales
        ? `Se retiran las <b>${actuales} columnas</b> que tienes hoy (con sus prompts y seguimientos) y se instala el tablero adaptado. Tus contactos no se pierden: pasan a la etapa de entrada.`
        : "Se instalan las etapas, los asistentes y los seguimientos que acabas de revisar.",
      showCancelButton: true,
      confirmButtonText: "Sí, construir",
      cancelButtonText: "Todavía no",
      ...swalOpts,
    });
    if (!r.isConfirmed) return;

    setPaso("construyendo");
    const inicio = Date.now();
    try {
      const { data } = await chatApi.post("/kanban_plantillas/adaptar/construir", {
        id_configuracion,
        ficha,
        respuestas,
      });
      const falta = 6000 - (Date.now() - inicio);
      if (falta > 0) await new Promise((res) => setTimeout(res, falta));
      setEtapaIdx(ETAPAS_CONSTRUIR.length - 1);
      setResultado(data?.data || null);
      BORRADORES.delete(id_configuracion);
      setPaso("listo");
      onTableroConstruido?.();
    } catch (err) {
      Swal.fire({ icon: "error", title: "No se pudo construir el tablero", text: mensajeDeError(err, "Intenta de nuevo."), ...swalOpts });
      setPaso("revision");
    }
  };

  const columnaPrincipal = useMemo(() => {
    const cols = resultado?.columnas || [];
    return cols.find((c) => c.estado_db === "contacto_inicial") || cols[0] || null;
  }, [resultado]);

  const bloqueado = paso === "construyendo" || paso === "comprendiendo";
  const cerrar = () => {
    // En vista previa no hay nada corriendo: se puede cerrar siempre.
    if (!bloqueado || demo) onClose?.();
  };

  // ─────────────────────────────────────────────────────────────
  // Campos
  // ─────────────────────────────────────────────────────────────
  /* Función, no componente: definido dentro del render, un <Campo> se
     remontaría en cada tecla y el input perdería el foco. */
  const campo = (p, inner) => (
    <div className="ab-campo" key={p.clave}>
      <label className="ab-label">
        {p.titulo}
        {p.obligatorio && <span className="ab-req">obligatorio</span>}
      </label>
      {p.ayuda && <p className="ab-ayuda">{p.ayuda}</p>}
      {inner}
      {p.placeholder && (p.tipo === "texto" || p.tipo === "textarea") && (
        <p className="ab-ejemplo">
          <span>Ejemplo</span>
          {p.placeholder.replace(/^Ej:\s*/i, "")}
        </p>
      )}
    </div>
  );

  const renderPregunta = (p) => {
    const v = respuestas[p.clave];
    if (!visible(p)) return null;
    if (p.tipo === "texto") {
      return campo(
        p,
        <input
          className="ab-input"
          value={v ?? ""}
          placeholder="Escribe aquí"
          onChange={(e) => setRespuesta(p.clave, e.target.value)}
        />,
      );
    }
    if (p.tipo === "textarea") {
      return campo(
        p,
        <textarea
          className="ab-input"
          rows={p.filas || 3}
          value={v ?? ""}
          placeholder="Escribe aquí, en tus palabras"
          onChange={(e) => setRespuesta(p.clave, e.target.value)}
        />,
      );
    }
    if (p.tipo === "chips") {
      const elegida = (p.opciones || []).find((o) => o.valor === v);
      return campo(
        p,
        <>
          <div className="ab-chips">
            {(p.opciones || []).map((o) => (
              <button
                key={o.valor}
                type="button"
                onClick={() => setRespuesta(p.clave, o.valor)}
                className={`ab-chip ${v === o.valor ? "ab-chip-on" : ""}`}
              >
                {o.icono && (
                  <span className="ab-chip-ic">
                    <i className={o.icono} />
                  </span>
                )}
                <span>{o.titulo}</span>
                <span className={`ab-chip-check ${v === o.valor ? "on" : ""}`}>
                  <i className="bx bx-check" />
                </span>
              </button>
            ))}
          </div>
          {elegida?.detalle && <p className="ab-nota">{elegida.detalle}</p>}
        </>,
      );
    }
    if (p.tipo === "multi") {
      const lista = Array.isArray(v) ? v : [];
      return campo(
        p,
        <div className="grid sm:grid-cols-2 gap-2.5">
            {(p.opciones || []).map((o) => {
              const activo = lista.includes(o.valor);
              return (
                <button
                  key={o.valor}
                  type="button"
                  onClick={() =>
                    setRespuesta(p.clave, activo ? lista.filter((x) => x !== o.valor) : [...lista, o.valor])
                  }
                  className={`ab-card ${activo ? "ab-card-on" : ""}`}
                >
                  <span className="ab-card-icon">
                    <i className={o.icono || "bx bx-bolt"} />
                  </span>
                  <span className="min-w-0">
                    <span className="ab-card-t">{o.titulo}</span>
                    <span className="ab-card-d">{o.detalle}</span>
                  </span>
                  <span className={`ab-card-check ${activo ? "on" : ""}`}>
                    <i className="bx bx-check" />
                  </span>
                </button>
              );
            })}
        </div>,
      );
    }
    return null;
  };

  // ─────────────────────────────────────────────────────────────
  // Pantallas
  // ─────────────────────────────────────────────────────────────
  const renderSinKey = () => (
    <div className="ab-centro">
      <div className="ab-orb ab-orb-warn">
        <i className="bx bx-key" />
      </div>
      <h3 className="ab-h3">Primero conecta tu llave de OpenAI</h3>
      <p className="ab-p">
        Es la que el bot va a usar para entender tu negocio y para atender a tus clientes. Conéctala
        en la sección de inteligencia artificial de tu cuenta y vuelve aquí.
      </p>
      <button type="button" className="ab-btn-secondary" onClick={cerrar}>
        Entendido
      </button>
    </div>
  );

  const renderCuestionario = () => {
    if (!pasoCuestionario) return null;
    return (
      <>
        <div className="ab-encabezado">
          <span className="ab-kicker">
            Paso {paso} de {totalCuestionario}
          </span>
          <h3 className="ab-h3">{pasoCuestionario.titulo}</h3>
          <p className="ab-p">{pasoCuestionario.subtitulo}</p>
        </div>
        {paso === 1 && (
          <div className="ab-aviso">
            <i className="bx bx-time-five" />
            <span>
              Son tres pasos cortos. Al final verás cómo entendimos tu negocio{" "}
              <b>antes</b> de que se construya nada.
            </span>
          </div>
        )}
        {pasoCuestionario.preguntas.map(renderPregunta)}
      </>
    );
  };

  /* Pantalla de proceso (comprender y construir). Sin efectos de ciencia
     ficción: se muestra LO QUE se está construyendo. Mientras la IA entiende
     el negocio, a la izquierda una conversación de WhatsApp simulada se
     escribe sola con el nombre del asistente y a la derecha la ficha se va
     llenando campo por campo. Al construir, el tablero se arma columna por
     columna. Todo CSS, en bucle, sin librerías. */
  /* Pantalla de proceso ("tu negocio en marcha"), aprobada el 2026-10-23.
     Pensada para el dueño, no para el programador: a la izquierda suben
     mensajes de clientes por WhatsApp, entran al asistente y salen por la
     derecha convertidos en resultados (cita agendada, venta cerrada, duda
     resuelta). Un titular grande cuenta en palabras simples lo que está
     pasando y abajo se van encendiendo las capacidades que el bot ya tiene.
     Todo CSS; los textos salen de la cuenta y del plan. */
  const nombreBot = respuestas.nombre_asistente || ficha?.nombre_asistente || "Tu asistente";
  const nombreNeg = respuestas.nombre_negocio || ficha?.nombre_negocio || estado?.nombre_configuracion || "tu negocio";
  const objetivosSel = Array.isArray(respuestas.objetivos) && respuestas.objetivos.length
    ? respuestas.objetivos
    : ficha?.objetivos || ["agendar", "atender"];
  const agendaSel = objetivosSel.includes("agendar");
  const vendeSel = objetivosSel.includes("vender_productos");
  const cotizaSel = objetivosSel.includes("cotizar");
  const coberturaTxt =
    respuestas.cobertura_tipo === "zonas" && respuestas.cobertura
      ? respuestas.cobertura
      : ficha?.cobertura?.texto || null;

  const MENSAJES_CLIENTES = [
    ["MA", "Hola, quiero información"],
    ["JP", agendaSel ? "¿Tienen para el sábado?" : "¿Lo tienen disponible?"],
    ["LC", "¿Cuánto cuesta?"],
    ["RS", coberturaTxt ? "¿Llegan a mi zona?" : "¿Cómo funciona?"],
  ];
  const RESULTADOS_COMPRENDER = [
    { ic: "💬", t: "Duda resuelta", s: "Respondió al instante" },
    agendaSel
      ? { ic: "📅", t: "Cita agendada", s: "Sábado 18:00 · en tu agenda" }
      : vendeSel
        ? { ic: "🛒", t: "Pedido confirmado", s: "Con nombre, cantidad y entrega" }
        : { ic: "📋", t: "Cotización lista", s: "Con todo lo que necesita tu equipo" },
    { ic: "💲", t: "Precio enviado", s: "Desde tu catálogo" },
    coberturaTxt
      ? { ic: "📍", t: "Cobertura confirmada", s: coberturaTxt }
      : { ic: "🤝", t: "Pasado a tu equipo", s: "Solo cuando hace falta" },
  ];
  const RESULTADOS_CONSTRUIR = [
    agendaSel
      ? { ic: "📅", t: "Reserva creada", s: "Propuso 2 horarios libres" }
      : { ic: "🛒", t: "Venta cerrada", s: "Resumen listo para despachar" },
    { ic: "🖼️", t: "Fotos enviadas", s: "Desde tu catálogo" },
    { ic: "🔔", t: "Seguimiento automático", s: "Le escribió a las 2 horas" },
    agendaSel
      ? { ic: "🔁", t: "Cita reprogramada", s: "Sin que tú intervengas" }
      : { ic: "🤝", t: "Pasado a tu equipo", s: "Cuando pidió hablar con alguien" },
  ];

  const TITULARES_COMPRENDER = [
    ["Estamos conociendo tu negocio", `Leemos lo que nos contaste y tu catálogo para que ${nombreBot} atienda como lo harías tú.`],
    [`Enseñándole a ${nombreBot} tus ${vendeSel && !agendaSel ? "productos" : "servicios"} y precios`, "Cada ítem del catálogo queda listo para responder dudas y vender."],
    coberturaTxt ? ["Marcando hasta dónde llegas", `${nombreBot} no va a agendar a quien no puedas atender.`] : ["Aprendiendo cómo atiendes", "Qué preguntas, qué datos pides y cuándo pasas a una persona."],
    ["Dándole tu forma de hablar", `${TONO_LABEL[respuestas.tono] || "Cercano"}, claro y con tus reglas de oro.`],
    ["Optimizando cómo cierras cada venta", `Menos vueltas, más ${agendaSel ? "citas" : "pedidos"} confirmados.`],
  ];
  const TITULARES_CONSTRUIR = [
    [`Preparando a ${nombreBot} para atender 24/7`, "Se arman las etapas de tu embudo y el asistente de cada una."],
    ["Creando la etapa de entrada", "Entiende qué quiere cada persona y la pasa al lugar correcto."],
    agendaSel ? ["Armando la agenda automática", "Propone dos horarios libres y deja la cita creada."] : ["Armando el cierre de ventas", "Pide los datos justos y deja el pedido confirmado."],
    ["Programando los seguimientos", "Le escribe solo a quien dejó la conversación a medias."],
    ["Casi listo para probarlo", `En unos segundos vas a poder conversar con ${nombreBot}.`],
  ];

  const CAPAS_COMPRENDER = [
    `Conoce tus ${vendeSel && !agendaSel ? "productos" : "servicios"} y precios`,
    coberturaTxt ? "Sabe hasta dónde llegas" : "Sabe cómo funciona tu servicio",
    "Responde con tu tono",
    "Respeta tus reglas",
    "Pasa a tu equipo cuando hace falta",
  ];
  const CAPAS_CONSTRUIR = (plan?.columnas?.length
    ? plan.columnas.filter((c) => c.ia).slice(0, 4).map((c) => c.nombre)
    : ["Contacto inicial", agendaSel ? "Por reservar" : "Venta de producto", agendaSel ? "Reservado" : "Pedido confirmado"]
  ).concat(["Seguimientos", "Asesor"]).slice(0, 5);

  const renderProceso = ({ sello, titulares, mensajes, resultados, capas, idx }) => {
    const n = titulares.length;
    const i = ((idx % n) + n) % n;
    const pct = Math.min(96, Math.round(((i + 0.6) / n) * 100));
    return (
      <div className="ab-esc">
        <div className="ab-blob b1" /><div className="ab-blob b2" /><div className="ab-blob b3" />

        <div className="ab-esc-cab">
          <div className="ab-ia"><i /> {sello}</div>
          <h3 key={i}><span>{titulares[i][0]}</span></h3>
          <p key={`s${i}`}>{titulares[i][1]}</p>
        </div>

        <div className="ab-flujo">
          <div className="ab-colf">
            {mensajes.map(([av, txt], k) => (
              <div key={txt} className="ab-msg" style={{ animationDelay: `${k * 2.5}s` }}>
                <span className="ab-av">{av}</span>{txt}<span className="ab-wa" />
              </div>
            ))}
          </div>
          <div className="ab-botf">
            <div className="ab-halof" /><div className="ab-anillof" />
            <div className="ab-caraf">
              <img src={agenteImg} alt={`${nombreBot}, tu asistente de IA`} draggable="false" />
              <span className="ab-sello-ia">IA</span>
            </div>
            <span className="ab-chispaf" style={{ "--x": "-60px", "--y": "-40px" }} />
            <span className="ab-chispaf" style={{ "--x": "62px", "--y": "-30px", animationDelay: ".6s" }} />
            <span className="ab-chispaf" style={{ "--x": "-40px", "--y": "60px", animationDelay: "1.2s" }} />
            <span className="ab-chispaf" style={{ "--x": "50px", "--y": "55px", animationDelay: "1.8s" }} />
            {/* Solo el nombre, y solo cuando ya lo escribió: antes se leía
                "Tu asistente · tu asistente". */}
            {(respuestas.nombre_asistente || ficha?.nombre_asistente) && (
              <div className="ab-nombref">{nombreBot}</div>
            )}
          </div>
          <div className="ab-colf">
            {resultados.map((r, k) => (
              <div key={r.t} className="ab-res" style={{ animationDelay: `${1.2 + k * 2.5}s` }}>
                <span className="ab-resic">{r.ic}</span>
                <span><b>{r.t}</b><small>{r.s}</small></span>
              </div>
            ))}
          </div>
          <div className="ab-lineas"><i className="l" /><i className="r" /></div>
        </div>

        <div className="ab-esc-pie">
          <div className="ab-capas">
            {capas.map((c, k) => (
              <span key={c} className={`ab-capa ${k <= i ? "ok" : ""}`}><i>✓</i>{c}</span>
            ))}
          </div>
          <div className="ab-barra"><span style={{ width: `${pct}%` }} /></div>
        </div>

        {demo && (
          <div className="ab-demo">
            <b>Vista previa</b>
            <button type="button" className={paso === "comprendiendo" ? "on" : ""} onClick={() => setPaso("comprendiendo")}>Comprender</button>
            <button type="button" className={paso === "construyendo" ? "on" : ""} onClick={() => setPaso("construyendo")}>Construir</button>
            <button type="button" onClick={() => { setDemo(false); setPaso(1); }}>Ir al formulario</button>
          </div>
        )}
      </div>
    );
  };

  const renderComprendiendo = () =>
    renderProceso({
      sello: "Inteligencia artificial trabajando para ti",
      titulares: TITULARES_COMPRENDER,
      mensajes: MENSAJES_CLIENTES,
      resultados: RESULTADOS_COMPRENDER,
      capas: CAPAS_COMPRENDER,
      idx: fraseIdx,
    });

  const Lista = ({ items, icono, color }) => (
    <ul className="ab-lista">
      {items.map((t, i) => (
        <li key={i}>
          <i className={`bx ${icono}`} style={{ color }} />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );

  const renderRevision = () => {
    if (!ficha || !plan) return null;
    const conIA = plan.columnas.filter((c) => c.ia).length;
    return (
      <>
        <div className="ab-encabezado">
          <span className="ab-kicker">Revisión</span>
          <h3 className="ab-h3">Así entendimos tu negocio</h3>
          <p className="ab-p">Léelo con calma. Si algo no cuadra, corrígelo abajo antes de construir.</p>
        </div>

        <div className="ab-cita">
          <i className="bx bxs-quote-alt-left" />
          <p>{ficha.resumen_entendimiento}</p>
          <div className="ab-pills">
            <span><i className="bx bx-bot" /> {ficha.nombre_asistente}</span>
            <span><i className="bx bx-tag" /> {ficha.rubro}</span>
            {ficha.cobertura?.tiene && ficha.cobertura?.texto && (
              <span><i className="bx bx-map" /> {ficha.cobertura.texto}</span>
            )}
            <span><i className="bx bx-message-rounded-dots" /> {TONO_LABEL[ficha.tono] || "Cercano"}</span>
            <span>
              <i className="bx bx-chip" />{" "}
              {ficha.modelo && ficha.modelo !== "auto"
                ? ficha.modelo
                : plan.modelos
                  ? `${plan.modelos.decision} · ${plan.modelos.simple}`
                  : "Modelo automático"}
            </span>
          </div>
        </div>

        <div className="ab-seccion">
          <div className="ab-seccion-t">Lo que va a hacer</div>
          <Lista items={ficha.lo_que_hara} icono="bx-check-circle" color="#059669" />
        </div>
        <div className="ab-seccion">
          <div className="ab-seccion-t">Lo que no va a hacer</div>
          <Lista items={ficha.lo_que_no_hara} icono="bx-x-circle" color="#e11d48" />
        </div>

        <div className="ab-seccion">
          <div className="ab-seccion-t">
            Tu embudo <span className="ab-muted">· {plan.columnas.length} etapas, {conIA} con IA</span>
          </div>
          <div className="ab-embudo">
            {plan.columnas.map((c, i) => (
              <div key={c.estado_db} className="ab-etapa">
                <div className="ab-etapa-n">{i + 1}</div>
                <div className="ab-etapa-ico">
                  <i className={ICONO_COLUMNA[c.estado_db] || "bx bx-columns"} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="ab-etapa-t">
                    {c.nombre}
                    <span className={`ab-tag ${c.ia ? "ia" : ""}`}>{c.ia ? "IA" : "Tu equipo"}</span>
                  </div>
                  <div className="ab-etapa-d">{c.para_que}</div>
                </div>
              </div>
            ))}
          </div>
          {plan.seguimientos?.length > 0 && (
            <p className="ab-nota">
              <i className="bx bx-time-five" /> Seguimiento automático por IA en{" "}
              {plan.seguimientos
                .map((s) => {
                  const col = plan.columnas.find((c) => c.estado_db === s.estado_db);
                  return `${col?.nombre || s.estado_db} (${s.pasos.join(" y ")})`;
                })
                .join(" · ")}
              .
            </p>
          )}
        </div>

        {ficha.politicas.length > 0 && (
          <details className="ab-details">
            <summary>Reglas de oro que va a respetar ({ficha.politicas.length})</summary>
            <Lista items={ficha.politicas} icono="bx-shield-quarter" color="#6366f1" />
          </details>
        )}

        {ficha.preguntas_pendientes?.length > 0 && (
          <div className="ab-pendientes">
            <div className="ab-seccion-t">
              <i className="bx bx-bulb" /> Para que funcione mejor
            </div>
            <Lista items={ficha.preguntas_pendientes} icono="bx-right-arrow-alt" color="#b45309" />
          </div>
        )}

        <div className="ab-correccion">
          <label className="ab-label">¿Algo que entendimos mal o que falta?</label>
          <p className="ab-ayuda">Escríbelo y volvemos a armar la ficha con eso. Si todo está bien, sigue a construir.</p>
          <textarea
            className="ab-input"
            rows={2}
            placeholder="Ej: También atendemos a domicilio con un costo extra por traslado"
            value={ajustes}
            onChange={(e) => setAjustes(e.target.value)}
          />
          <button type="button" className="ab-btn-secondary mt-2" onClick={reentender} disabled={!ajustes.trim()}>
            <i className="bx bx-refresh" /> Volver a entender
          </button>
        </div>
      </>
    );
  };

  const renderConstruyendo = () =>
    renderProceso({
      sello: "Construyendo tu asistente",
      titulares: TITULARES_CONSTRUIR,
      mensajes: [
        ["AN", agendaSel ? "Buenas, quiero reservar" : "Buenas, quiero comprar"],
        ["DT", "¿Me mandan fotos?"],
        ["KV", agendaSel ? "Para mi mamá, el domingo" : "¿En cuánto me llega?"],
        ["GM", agendaSel ? "Ya no puedo el sábado" : "Quiero hablar con alguien"],
      ],
      resultados: RESULTADOS_CONSTRUIR,
      capas: CAPAS_CONSTRUIR,
      idx: etapaIdx,
    });

  const renderListo = () => {
    const cols = resultado?.columnas || [];
    return (
      <>
        <div className="ab-centro" style={{ paddingBottom: 8 }}>
          <div className="ab-orb ab-orb-ok">
            <i className="bx bx-check" />
          </div>
          <h3 className="ab-h3">{ficha?.nombre_asistente || "Tu asistente"} ya conoce tu negocio</h3>
          <p className="ab-p">
            {cols.length} etapas · {cols.filter((c) => c.activa_ia).length} con IA · {resultado?.seguimientos || 0}{" "}
            seguimientos automáticos
            {resultado?.sede && !resultado.sede.existente ? " · base y agenda creadas" : ""}
          </p>
        </div>

        <div className="ab-embudo">
          {cols.map((c, i) => (
            <div key={c.id} className="ab-etapa">
              <div className="ab-etapa-n">{i + 1}</div>
              <div className="ab-etapa-ico">
                <i className={ICONO_COLUMNA[c.estado_db] || "bx bx-columns"} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="ab-etapa-t">
                  {c.nombre}
                  <span className={`ab-tag ${c.activa_ia ? "ia" : ""}`}>{c.activa_ia ? "IA" : "Tu equipo"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="ab-aviso mt-5">
          <i className="bx bx-info-circle" />
          <span>
            Prueba una conversación aquí mismo. Para afinar el tono o sumar una regla, cada etapa tiene su
            botón <b>Personalizar prompt</b>. Puedes volver a adaptar el bot cuando tu negocio cambie.
          </span>
        </div>
      </>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // Botonera
  // ─────────────────────────────────────────────────────────────
  const renderFooter = () => {
    if (cargando || sinKey || bloqueado) return null;
    if (typeof paso === "number") {
      return (
        <>
          <button type="button" className="ab-btn-secondary" onClick={() => (paso === 1 ? cerrar() : setPaso(paso - 1))}>
            <i className="bx bx-left-arrow-alt" /> {paso === 1 ? "Cancelar" : "Atrás"}
          </button>
          <button type="button" className="ab-btn-primary" onClick={siguiente}>
            {paso < totalCuestionario ? "Siguiente" : "Entender mi negocio"}
            <i className={`bx ${paso < totalCuestionario ? "bx-right-arrow-alt" : "bxs-magic-wand"}`} />
          </button>
        </>
      );
    }
    if (paso === "revision") {
      return (
        <>
          <button type="button" className="ab-btn-secondary" onClick={() => setPaso(1)}>
            <i className="bx bx-left-arrow-alt" /> Cambiar respuestas
          </button>
          <button type="button" className="ab-btn-primary" onClick={construir}>
            Construir mi tablero <i className="bx bxs-rocket" />
          </button>
        </>
      );
    }
    if (paso === "listo") {
      return (
        <>
          <button type="button" className="ab-btn-secondary" onClick={cerrar}>
            Ver mi tablero
          </button>
          {columnaPrincipal && (
            <button type="button" className="ab-btn-primary" onClick={() => setProbar(true)}>
              <i className="bx bx-chat" /> Probar el bot ahora
            </button>
          )}
        </>
      );
    }
    return null;
  };

  return (
    <>
      <style>{`
        .ab-overlay{position:fixed;inset:0;background:rgba(15,17,41,.72);backdrop-filter:blur(6px);z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px;animation:ab-in .2s ease;}
        .ab-modal{width:100%;max-width:1040px;height:min(860px,92vh);background:#fff;border-radius:22px;overflow:hidden;display:flex;box-shadow:0 30px 80px rgba(0,0,0,.45);animation:ab-up .25s cubic-bezier(.2,.8,.2,1);font-family:'DM Sans',system-ui,sans-serif;}
        .ab-riel{width:264px;flex-shrink:0;background:linear-gradient(170deg,${BG_DARK} 0%,#1e2148 60%,#0f1129 100%);color:#fff;padding:26px 22px;display:none;flex-direction:column;position:relative;overflow:hidden;}
        .ab-riel:before{content:'';position:absolute;right:-90px;top:-90px;width:260px;height:260px;border-radius:50%;background:radial-gradient(circle,rgba(34,211,238,.28),transparent 65%);}
        @media(min-width:860px){.ab-riel{display:flex;}}
        .ab-riel-marca{display:flex;align-items:center;gap:10px;margin-bottom:28px;position:relative;}
        .ab-riel-marca i{width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;background:rgba(34,211,238,.15);border:1px solid rgba(34,211,238,.35);color:#67e8f9;font-size:19px;}
        .ab-riel-marca b{display:block;font-size:.92rem;font-weight:800;line-height:1.1;}
        .ab-riel-marca small{display:block;font-size:.64rem;color:rgba(255,255,255,.5);font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-top:2px;}
        .ab-pasos{list-style:none;margin:0;padding:0;position:relative;flex:1;}
        .ab-paso{display:flex;gap:12px;padding:0 0 22px;position:relative;}
        .ab-paso:not(:last-child):before{content:'';position:absolute;left:13px;top:28px;bottom:2px;width:2px;background:rgba(255,255,255,.1);}
        .ab-paso.done:not(:last-child):before{background:rgba(34,197,94,.6);}
        .ab-paso-n{width:28px;height:28px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:800;border:1.5px solid rgba(255,255,255,.2);color:rgba(255,255,255,.5);background:rgba(255,255,255,.05);position:relative;z-index:1;}
        .ab-paso.on .ab-paso-n{background:#22d3ee;border-color:#22d3ee;color:#0f172a;box-shadow:0 0 0 5px rgba(34,211,238,.18);}
        .ab-paso.done .ab-paso-n{background:#22c55e;border-color:#22c55e;color:#fff;}
        .ab-paso-t{font-size:.84rem;font-weight:700;color:rgba(255,255,255,.55);line-height:1.2;padding-top:5px;}
        .ab-paso.on .ab-paso-t{color:#fff;}
        .ab-paso.done .ab-paso-t{color:rgba(255,255,255,.85);}
        .ab-paso-d{font-size:.7rem;color:rgba(255,255,255,.4);margin-top:3px;line-height:1.4;display:none;}
        .ab-paso.on .ab-paso-d{display:block;}
        .ab-cuenta{border-top:1px solid rgba(255,255,255,.1);padding-top:14px;margin-top:8px;position:relative;}
        .ab-cuenta-t{font-size:.62rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:rgba(255,255,255,.4);margin-bottom:8px;}
        .ab-cuenta-i{display:flex;align-items:center;gap:8px;font-size:.74rem;color:rgba(255,255,255,.75);padding:3px 0;}
        .ab-cuenta-i i{font-size:15px;}
        .ab-cuenta-i.ok i{color:#4ade80;}
        .ab-cuenta-i.warn i{color:#fbbf24;}
        .ab-main{flex:1;min-width:0;display:flex;flex-direction:column;background:#fff;}
        .ab-top{display:flex;align-items:center;justify-content:space-between;padding:14px 22px;border-bottom:1px solid #eef0f4;}
        .ab-top-prog{font-size:.72rem;font-weight:700;color:#64748b;}
        @media(min-width:860px){.ab-top-prog{display:none;}}
        .ab-close{width:32px;height:32px;border-radius:10px;border:1px solid #e5e7eb;background:#fff;color:#64748b;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:inherit;margin-left:auto;}
        .ab-close:hover{background:#f1f5f9;color:#0f172a;}
        .ab-body{flex:1;overflow-y:auto;padding:28px 22px 32px;}
        .ab-col{max-width:640px;margin:0 auto;}
        .ab-foot{display:flex;justify-content:space-between;gap:10px;padding:14px 22px;border-top:1px solid #eef0f4;background:#fff;}
        .ab-foot:empty{display:none;}
        .ab-encabezado{margin-bottom:22px;}
        .ab-kicker{display:inline-block;font-size:.66rem;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:#6366f1;margin-bottom:6px;}
        .ab-h3{margin:0;font-size:1.3rem;font-weight:800;color:#0f172a;letter-spacing:-.01em;line-height:1.2;}
        .ab-p{margin:6px 0 0;font-size:.86rem;color:#64748b;line-height:1.55;}
        .ab-aviso{display:flex;gap:10px;align-items:flex-start;background:#f1f5f9;border-radius:12px;padding:11px 13px;font-size:.78rem;color:#334155;line-height:1.5;margin-bottom:22px;}
        .ab-aviso i{font-size:17px;color:#6366f1;margin-top:1px;flex-shrink:0;}
        .ab-campo{margin-bottom:24px;}
        .ab-label{display:flex;align-items:center;gap:8px;font-size:.9rem;font-weight:700;color:#0f172a;margin-bottom:4px;}
        .ab-req{font-size:.6rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#9a3412;background:#ffedd5;border-radius:6px;padding:2px 6px;}
        .ab-ayuda{margin:0 0 8px;font-size:.76rem;color:#64748b;line-height:1.5;}
        .ab-ejemplo{margin:7px 0 0;font-size:.74rem;color:#94a3b8;line-height:1.5;padding-left:10px;border-left:2px solid #e2e8f0;}
        .ab-ejemplo span{display:inline-block;font-size:.6rem;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:#a5b4fc;margin-right:6px;}
        .ab-nota{margin:8px 0 0;font-size:.76rem;color:#475569;line-height:1.5;}
        .ab-nota i{color:#6366f1;margin-right:4px;}
        .ab-input{width:100%;border:1.5px solid #e2e8f0;border-radius:12px;padding:11px 13px;font-size:.88rem;font-family:inherit;color:#0f172a;background:#fff;outline:none;transition:all .15s;resize:vertical;line-height:1.5;}
        .ab-input::placeholder{color:#b6c0cf;}
        .ab-input:focus{border-color:#6366f1;box-shadow:0 0 0 4px rgba(99,102,241,.12);}
        /* Grilla y no flex-wrap: con anchos distintos la primera fila quedaba
           corta y la segunda larga. Así todas las celdas miden igual y las
           filas se reparten parejas. */
        .ab-chips{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:8px;}
        /* Misma lógica visual que las tarjetas de objetivos: la elegida
           cambia borde y fondo suave y muestra el check; nunca se pinta
           entera, para que no parezca otra familia de controles. */
        .ab-chip{position:relative;display:flex;align-items:center;gap:9px;padding:10px 30px 10px 10px;border-radius:12px;border:1.5px solid #e2e8f0;background:#fff;color:#334155;font-size:.8rem;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s;text-align:left;line-height:1.25;}
        .ab-chip:hover{border-color:#a5b4fc;}
        .ab-chip-on{border-color:#6366f1;background:#f5f6ff;color:#1e1b4b;}
        .ab-chip-ic{width:30px;height:30px;border-radius:9px;background:#eef2ff;color:#4f46e5;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;}
        .ab-chip-check{position:absolute;top:50%;right:9px;transform:translateY(-50%);width:18px;height:18px;border-radius:50%;border:1.5px solid #e2e8f0;display:flex;align-items:center;justify-content:center;color:transparent;font-size:13px;}
        .ab-chip-check.on{background:#6366f1;border-color:#6366f1;color:#fff;}
        .ab-card{display:flex;gap:11px;align-items:flex-start;text-align:left;padding:13px;border-radius:14px;border:1.5px solid #e2e8f0;background:#fff;cursor:pointer;font-family:inherit;transition:all .15s;position:relative;}
        .ab-card:hover{border-color:#a5b4fc;}
        .ab-card-on{border-color:#6366f1;background:#f5f6ff;}
        .ab-card-icon{width:36px;height:36px;border-radius:10px;background:#eef2ff;color:#4f46e5;display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0;}
        .ab-card-t{display:block;font-size:.84rem;font-weight:700;color:#0f172a;line-height:1.25;padding-right:22px;}
        .ab-card-d{display:block;font-size:.72rem;color:#64748b;line-height:1.45;margin-top:3px;}
        .ab-card-check{position:absolute;top:10px;right:10px;width:20px;height:20px;border-radius:50%;border:1.5px solid #e2e8f0;display:flex;align-items:center;justify-content:center;color:transparent;font-size:14px;}
        .ab-card-check.on{background:#6366f1;border-color:#6366f1;color:#fff;}
        .ab-btn-primary{display:inline-flex;align-items:center;gap:8px;padding:11px 22px;border-radius:12px;border:none;background:linear-gradient(135deg,${BG_DARK},#2a2d50);color:#fff;font-weight:700;font-size:.875rem;cursor:pointer;transition:all .2s;font-family:inherit;box-shadow:0 6px 20px rgba(23,25,49,.3);}
        .ab-btn-primary i{font-size:18px;}
        .ab-btn-primary:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 10px 24px rgba(23,25,49,.4);}
        .ab-btn-primary:disabled{opacity:.4;cursor:not-allowed;}
        .ab-btn-secondary{display:inline-flex;align-items:center;gap:6px;padding:11px 18px;border-radius:12px;border:1.5px solid #e5e7eb;background:#fff;color:#374151;font-weight:600;font-size:.875rem;cursor:pointer;transition:all .15s;font-family:inherit;}
        .ab-btn-secondary:hover:not(:disabled){background:#f9fafb;border-color:#d1d5db;}
        .ab-btn-secondary:disabled{opacity:.45;cursor:not-allowed;}
        .ab-centro{display:flex;flex-direction:column;align-items:center;text-align:center;padding:48px 0 24px;gap:10px;}
        .ab-centro .ab-p{max-width:420px;}
        .ab-orb{width:84px;height:84px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#22d3ee);display:flex;align-items:center;justify-content:center;color:#fff;font-size:2.2rem;box-shadow:0 0 0 12px rgba(99,102,241,.1),0 0 0 26px rgba(99,102,241,.05);animation:ab-pulse 1.8s ease-in-out infinite;margin-bottom:10px;}
        .ab-orb-ok{background:linear-gradient(135deg,#22c55e,#10b981);animation:none;box-shadow:0 0 0 12px rgba(34,197,94,.12),0 0 0 26px rgba(34,197,94,.05);}
        .ab-orb-warn{background:linear-gradient(135deg,#f59e0b,#f97316);animation:none;box-shadow:0 0 0 12px rgba(245,158,11,.12);}
        .ab-cita{background:linear-gradient(135deg,${BG_DARK},#2a2d50);color:#fff;border-radius:18px;padding:22px 24px;position:relative;margin-bottom:26px;}
        .ab-cita>i{position:absolute;top:14px;left:18px;font-size:34px;color:rgba(165,180,252,.35);}
        .ab-cita p{margin:0;font-size:.98rem;line-height:1.65;padding-left:22px;}
        .ab-pills{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px;padding-left:22px;}
        .ab-pills span{display:inline-flex;align-items:center;gap:5px;padding:5px 11px;border-radius:999px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);font-size:.72rem;font-weight:700;color:#e0e7ff;}
        .ab-seccion{margin-bottom:24px;}
        .ab-seccion-t{font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#475569;margin-bottom:10px;display:flex;align-items:center;gap:6px;}
        .ab-muted{color:#94a3b8;font-weight:600;text-transform:none;letter-spacing:0;}
        .ab-lista{list-style:none;margin:0;padding:0;}
        .ab-lista li{display:flex;gap:10px;align-items:flex-start;font-size:.86rem;color:#1e293b;line-height:1.5;padding:5px 0;}
        .ab-lista li i{font-size:18px;flex-shrink:0;margin-top:1px;}
        .ab-embudo{display:flex;flex-direction:column;gap:8px;}
        .ab-etapa{display:flex;gap:12px;align-items:center;padding:11px 13px;border-radius:14px;border:1px solid #e8ebf1;background:#fff;}
        .ab-etapa-n{width:22px;height:22px;border-radius:50%;background:#f1f5f9;color:#64748b;font-size:.68rem;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .ab-etapa-ico{width:36px;height:36px;border-radius:10px;background:#eef2ff;color:#4f46e5;display:flex;align-items:center;justify-content:center;font-size:1.05rem;flex-shrink:0;}
        .ab-etapa-t{font-size:.86rem;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:8px;line-height:1.2;}
        .ab-etapa-d{font-size:.74rem;color:#64748b;line-height:1.45;margin-top:3px;}
        .ab-tag{font-size:.58rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;padding:2px 7px;border-radius:6px;background:#f1f5f9;color:#64748b;}
        .ab-tag.ia{background:#dcfce7;color:#15803d;}
        .ab-details{border:1px solid #e8ebf1;border-radius:14px;padding:12px 14px;margin-bottom:18px;}
        .ab-details summary{cursor:pointer;font-size:.84rem;font-weight:700;color:#0f172a;list-style:none;display:flex;align-items:center;justify-content:space-between;}
        .ab-details summary::-webkit-details-marker{display:none;}
        .ab-details summary:after{content:'+';font-size:1.1rem;color:#94a3b8;}
        .ab-details[open] summary:after{content:'−';}
        .ab-details[open] summary{margin-bottom:8px;}
        .ab-pendientes{background:#fffbeb;border:1px solid #fde68a;border-radius:14px;padding:13px 15px;margin-bottom:22px;}
        .ab-pendientes .ab-seccion-t{color:#92400e;}
        .ab-pendientes .ab-lista li{color:#78350f;}
        .ab-correccion{border-top:1px dashed #e2e8f0;padding-top:20px;}
        .ab-body.proceso{padding:0;}
        .ab-body.proceso .ab-col{max-width:none;height:100%;}
        .ab-main.proceso .ab-top{display:none;}
        /* Escena "tu negocio en marcha": ocupa todo el alto y reparte en tres
           filas (titular / flujo / capacidades) para que no sobre blanco. */
        .ab-esc{position:relative;height:100%;min-height:560px;overflow:hidden;background:#fbfcff;display:grid;grid-template-rows:auto minmax(230px,1fr) auto;gap:10px;padding:22px 28px 18px;}
        .ab-blob{position:absolute;border-radius:50%;filter:blur(60px);opacity:.55;pointer-events:none;animation:ab-blob 9s ease-in-out infinite;}
        .ab-blob.b1{width:360px;height:360px;background:#dfe3ff;left:-80px;top:10%;}
        .ab-blob.b2{width:320px;height:320px;background:#d6f6fb;right:-60px;top:30%;animation-delay:-3s;}
        .ab-blob.b3{width:260px;height:260px;background:#dcfbe9;left:40%;bottom:-120px;animation-delay:-6s;}
        .ab-esc-cab{position:relative;text-align:center;max-width:640px;margin:0 auto;}
        .ab-ia{display:inline-flex;align-items:center;gap:7px;font-size:.64rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#4f5ae8;background:#eef0ff;border:1px solid #d9dcff;padding:5px 11px;border-radius:999px;margin-bottom:8px;}
        .ab-ia i{width:7px;height:7px;border-radius:50%;background:#1fb46a;animation:ab-led 1.2s infinite;}
        .ab-esc-cab h3{margin:0;font-size:1.5rem;font-weight:800;letter-spacing:-.02em;line-height:1.15;color:#0f172a;min-height:1.2em;}
        .ab-esc-cab h3 span{display:inline-block;animation:ab-titulo .6s cubic-bezier(.2,.8,.2,1) both;}
        .ab-esc-cab p{margin:5px 0 0;color:#5b6b85;font-size:.84rem;animation:ab-titulo .6s .1s cubic-bezier(.2,.8,.2,1) both;}
        .ab-flujo{position:relative;display:grid;grid-template-columns:1fr 150px 1fr;align-items:center;gap:10px;min-height:0;}
        @media(max-width:760px){.ab-flujo{grid-template-columns:1fr 110px 1fr;}}
        .ab-colf{position:relative;height:100%;min-height:230px;}
        .ab-msg,.ab-res{position:absolute;left:0;right:0;top:0;margin:0 auto;width:min(100%,250px);display:flex;align-items:center;gap:9px;padding:10px 12px;border-radius:14px;background:#fff;border:1px solid #e6e9f2;box-shadow:0 10px 26px -16px rgba(15,23,42,.35);font-size:.78rem;font-weight:600;color:#0f172a;opacity:0;}
        .ab-msg{animation:ab-entra 10s cubic-bezier(.4,0,.2,1) infinite;}
        .ab-res{animation:ab-sale 10s cubic-bezier(.4,0,.2,1) infinite;}
        .ab-av{width:28px;height:28px;border-radius:50%;background:#e2e8f0;color:#475569;display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:800;flex-shrink:0;}
        .ab-wa{margin-left:auto;width:16px;height:16px;border-radius:50%;background:#25d366;flex-shrink:0;}
        .ab-resic{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:.95rem;flex-shrink:0;background:#dcfbe9;}
        .ab-res b{display:block;font-size:.78rem;}
        .ab-res small{display:block;font-size:.66rem;color:#5b6b85;font-weight:600;}
        .ab-botf{position:relative;width:168px;height:168px;margin:0 auto;}
        .ab-halof{position:absolute;inset:-10px;border-radius:50%;background:radial-gradient(circle,rgba(79,90,232,.24),rgba(25,196,220,.08) 55%,transparent 72%);animation:ab-halo 2.4s ease-in-out infinite;}
        .ab-anillof{position:absolute;inset:2px;border-radius:50%;border:2px solid rgba(79,90,232,.16);border-top-color:#4f5ae8;animation:ab-girar 2.8s linear infinite;}
        /* El agente: render 3D sobre un disco claro; levita y proyecta sombra */
        .ab-caraf{position:absolute;inset:10px;border-radius:50%;background:radial-gradient(circle at 50% 35%,#ffffff,#eef1ff 70%,#e3e8ff);box-shadow:0 22px 40px -18px rgba(79,90,232,.5),inset 0 0 0 1px rgba(79,90,232,.12);display:flex;align-items:flex-end;justify-content:center;overflow:visible;animation:ab-respira 3s ease-in-out infinite;}
        .ab-caraf img{width:150px;height:150px;object-fit:contain;margin-bottom:4px;filter:drop-shadow(0 14px 18px rgba(15,23,42,.28));user-select:none;}
        .ab-sello-ia{position:absolute;right:-2px;top:6px;font-size:.6rem;font-weight:800;letter-spacing:.08em;color:#fff;background:linear-gradient(135deg,#4f5ae8,#19c4dc);padding:3px 7px;border-radius:999px;box-shadow:0 6px 14px -6px rgba(79,90,232,.8);}
        .ab-nombref{position:absolute;left:50%;top:100%;transform:translateX(-50%);margin-top:10px;white-space:nowrap;font-size:.72rem;font-weight:800;color:#0f172a;background:#fff;border:1px solid #e6e9f2;padding:4px 10px;border-radius:999px;box-shadow:0 6px 14px -8px rgba(15,23,42,.3);max-width:200px;overflow:hidden;text-overflow:ellipsis;}
        .ab-chispaf{position:absolute;left:50%;top:50%;width:6px;height:6px;border-radius:50%;background:#19c4dc;opacity:0;animation:ab-chispa 2.5s ease-out infinite;}
        .ab-lineas{position:absolute;inset:0;pointer-events:none;}
        .ab-lineas i{position:absolute;top:50%;height:2px;width:calc(50% - 90px);background:linear-gradient(90deg,transparent,#c9d0f5 30%,#c9d0f5 70%,transparent);}
        .ab-lineas i.l{left:0;}
        .ab-lineas i.r{right:0;}
        .ab-lineas i:after{content:'';position:absolute;top:-3px;width:8px;height:8px;border-radius:50%;background:#4f5ae8;box-shadow:0 0 10px rgba(79,90,232,.8);animation:ab-viaja 2.5s linear infinite;}
        .ab-lineas i.r:after{background:#1fb46a;box-shadow:0 0 10px rgba(31,180,106,.8);animation-delay:1.2s;}
        .ab-esc-pie{position:relative;}
        .ab-capas{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;}
        .ab-capa{display:flex;align-items:center;gap:7px;font-size:.72rem;font-weight:700;color:#334155;background:#fff;border:1px solid #e6e9f2;padding:6px 11px;border-radius:999px;opacity:.45;transition:all .5s;}
        .ab-capa i{width:18px;height:18px;border-radius:50%;background:#e6e9f2;color:#fff;display:flex;align-items:center;justify-content:center;font-size:.66rem;font-style:normal;transition:all .5s;}
        .ab-capa.ok{opacity:1;border-color:#bdeed3;background:#f2fdf7;}
        .ab-capa.ok i{background:#1fb46a;}
        .ab-barra{height:6px;border-radius:999px;background:#e6e9f2;margin-top:12px;overflow:hidden;}
        .ab-barra span{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#4f5ae8,#19c4dc);transition:width 1.4s ease;}
        .ab-demo{position:absolute;right:14px;bottom:12px;display:flex;align-items:center;gap:6px;padding:5px 7px 5px 11px;border-radius:999px;background:#0f172a;color:#fff;font-size:.68rem;z-index:5;}
        .ab-demo b{color:#fbbf24;margin-right:2px;}
        .ab-demo button{padding:4px 9px;border-radius:999px;border:1px solid rgba(255,255,255,.2);background:transparent;color:#fff;font-size:.66rem;font-weight:700;cursor:pointer;font-family:inherit;}
        .ab-demo button.on{background:#22d3ee;color:#0f172a;border-color:#22d3ee;}
        @keyframes ab-blob{50%{transform:translate(20px,-18px) scale(1.08)}}
        @keyframes ab-led{50%{opacity:.35}}
        @keyframes ab-titulo{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        @keyframes ab-entra{0%{opacity:0;transform:translateY(190px) scale(.96)}8%{opacity:1;transform:translateY(150px) scale(1)}20%{opacity:1;transform:translateY(0) scale(1)}26%{opacity:0;transform:translateY(-10px) translateX(60px) scale(.6)}100%{opacity:0}}
        @keyframes ab-sale{0%{opacity:0;transform:translateY(0) translateX(-60px) scale(.6)}6%{opacity:1;transform:translateY(0) translateX(0) scale(1)}18%{opacity:1;transform:translateY(150px)}24%{opacity:0;transform:translateY(190px)}100%{opacity:0}}
        @keyframes ab-halo{50%{transform:scale(1.15);opacity:.7}}
        @keyframes ab-girar{to{transform:rotate(360deg)}}
        @keyframes ab-respira{50%{transform:translateY(-5px)}}
        @keyframes ab-chispa{0%{opacity:0;transform:translate(-50%,-50%)}10%{opacity:1}100%{opacity:0;transform:translate(calc(-50% + var(--x)),calc(-50% + var(--y)))}}
        @keyframes ab-viaja{from{left:0;opacity:0}15%{opacity:1}85%{opacity:1}to{left:100%;opacity:0}}
        @keyframes ab-aparecer{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .ab-spin{width:16px;height:16px;border-radius:50%;border:3px solid rgba(255,255,255,.35);border-top-color:#fff;animation:ab-spinr .8s linear infinite;display:inline-block;}
        .ab-fade{animation:ab-in .4s ease;}
        @keyframes ab-in{from{opacity:0}to{opacity:1}}
        @keyframes ab-up{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}
        @keyframes ab-spinr{to{transform:rotate(360deg)}}
        @keyframes ab-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
        .swal-over-modal{z-index:99999 !important;}
      `}</style>

      <div
        className="ab-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) cerrar();
        }}
      >
        <div className="ab-modal" role="dialog" aria-modal="true">
          {/* ── Riel ── */}
          <aside className="ab-riel">
            <div className="ab-riel-marca">
              <i className="bx bxs-magic-wand" />
              <div>
                <b>Adaptar el bot</b>
                <small>a tu negocio</small>
              </div>
            </div>

            <ol className="ab-pasos">
              {/* Mientras carga el cuestionario, esqueleto de 5 líneas: si
                  no, el riel mostraba 2 pasos y de golpe aparecían 5. */}
              {cargando &&
                [0, 1, 2, 3, 4].map((i) => (
                  <li key={`sk${i}`} className="ab-paso">
                    <div className="ab-paso-n" style={{ opacity: 0.35 }} />
                    <div style={{ paddingTop: 7 }}>
                      <div style={{ width: 90 + (i % 3) * 22, height: 10, borderRadius: 6, background: "rgba(255,255,255,.12)" }} />
                    </div>
                  </li>
                ))}
              {!cargando && rielPasos.map((p, i) => (
                <li key={String(p.key)} className={`ab-paso ${i < rielIndice ? "done" : i === rielIndice ? "on" : ""}`}>
                  <div className="ab-paso-n">{i < rielIndice ? <i className="bx bx-check" /> : i + 1}</div>
                  <div>
                    <div className="ab-paso-t">{p.titulo}</div>
                    <div className="ab-paso-d">{p.detalle}</div>
                  </div>
                </li>
              ))}
            </ol>

            {estado && (
              <div className="ab-cuenta">
                <div className="ab-cuenta-t">Tu cuenta</div>
                <div className={`ab-cuenta-i ${sinKey ? "warn" : "ok"}`}>
                  <i className={`bx ${sinKey ? "bxs-error-circle" : "bxs-check-circle"}`} />
                  {sinKey ? "Sin llave de OpenAI" : "Llave de IA conectada"}
                </div>
                <div className={`ab-cuenta-i ${Number(estado.productos) > 0 ? "ok" : "warn"}`}>
                  <i className={`bx ${Number(estado.productos) > 0 ? "bxs-check-circle" : "bxs-error-circle"}`} />
                  {Number(estado.productos) > 0
                    ? `${estado.productos} ${Number(estado.productos) === 1 ? "ítem" : "ítems"} en el catálogo`
                    : "Catálogo vacío"}
                </div>
                {Number(estado.columnas) > 0 && (
                  <div className="ab-cuenta-i warn">
                    <i className="bx bxs-info-circle" />
                    {estado.columnas} columnas se reemplazarán
                  </div>
                )}
              </div>
            )}
          </aside>

          {/* ── Contenido ── */}
          <div className={`ab-main ${bloqueado ? "proceso" : ""}`}>
            <div className="ab-top">
              <span className="ab-top-prog">
                {rielIndice >= 0 ? `${rielIndice + 1} / ${rielPasos.length} · ${rielPasos[rielIndice]?.titulo}` : ""}
              </span>
              {!bloqueado && (
                <button type="button" className="ab-close" onClick={cerrar} aria-label="Cerrar">
                  <i className="bx bx-x text-lg" />
                </button>
              )}
            </div>

            <div className={`ab-body ${bloqueado ? "proceso" : ""}`} ref={cuerpoRef}>
              <div className="ab-col">
                {cargando ? (
                  <div className="ab-centro">
                    <span className="ab-spin" style={{ width: 36, height: 36, borderColor: "rgba(99,102,241,.25)", borderTopColor: "#6366f1" }} />
                  </div>
                ) : sinKey ? (
                  renderSinKey()
                ) : typeof paso === "number" ? (
                  renderCuestionario()
                ) : paso === "comprendiendo" ? (
                  renderComprendiendo()
                ) : paso === "revision" ? (
                  renderRevision()
                ) : paso === "construyendo" ? (
                  renderConstruyendo()
                ) : (
                  renderListo()
                )}
              </div>
            </div>

            <div className="ab-foot">{renderFooter()}</div>
          </div>
        </div>
      </div>

      {probar && columnaPrincipal && (
        <ChatPruebaModal
          open={probar}
          onClose={() => setProbar(false)}
          columnaId={columnaPrincipal.id}
          columnaNombre={columnaPrincipal.nombre}
          columnaIcono={ICONO_COLUMNA[columnaPrincipal.estado_db] || "bx bx-columns"}
          columnaColor="#6366f1"
        />
      )}
    </>
  );
};

export default AdaptarBotModal;
