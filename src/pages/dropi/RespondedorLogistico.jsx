import React, { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.parentNode.style.zIndex = 99999;
  },
});

/**
 * Ajustes del respondedor logístico sin IA (backend:
 * utils/respondedorLogistico.js). Cuando un chat está en una columna de
 * seguimiento del pedido SIN agente de IA, el sistema contesta solo tres
 * preguntas (número de guía, punto de retiro y tiempo de entrega) con los
 * datos reales de la orden. Esta tarjeta permite:
 *
 *  - Apagar ese respondedor por completo (las preguntas quedan al asesor).
 *  - Elegir cómo se informa el tiempo de entrega: automático (calculado con
 *    las entregas reales de la cuenta, recomendado) o un rango manual fijo.
 *
 * Es una configuración de TODA la cuenta, no de una columna: la misma
 * pregunta puede llegar con el chat en "guía generada", "en tránsito" o
 * "novedad", y la respuesta depende del pedido, no de la columna.
 *
 * La vista previa replica los textos que arma componerRespuesta() en el
 * backend para la intención "demora": si allá cambia la redacción, hay que
 * actualizarla acá o la pantalla prometerá un mensaje que ya no sale.
 */

// Las 3 preguntas que responde, con el ejemplo tal como las escribe un
// cliente real. Mostrarlas así vale más que cualquier párrafo explicativo.
const QUE_RESPONDE = [
  {
    icon: "bx bx-barcode",
    pregunta: "¿Cuál es mi número de guía?",
    respuesta: "Le envía su guía y el link para rastrear el pedido",
  },
  {
    icon: "bx bx-map",
    pregunta: "¿Dónde retiro mi pedido?",
    respuesta: "Le indica la agencia exacta donde está su paquete",
  },
  {
    icon: "bx bx-time-five",
    pregunta: "¿Cuándo me llega?",
    respuesta: "Le informa el tiempo de entrega (configurable aquí abajo)",
  },
];

// Renderiza los *negritas* de WhatsApp dentro de la vista previa.
const negritasWhatsApp = (texto) =>
  texto.split("*").map((parte, i) =>
    i % 2 === 1 ? <b key={i}>{parte}</b> : <span key={i}>{parte}</span>,
  );

const RespondedorLogistico = ({ id_configuracion }) => {
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [expandido, setExpandido] = useState(false);

  const [activo, setActivo] = useState(true);
  const [modo, setModo] = useState("auto"); // 'auto' | 'manual'
  const [diasMin, setDiasMin] = useState("");
  const [diasMax, setDiasMax] = useState("");
  const [rangoAuto, setRangoAuto] = useState(null);

  // Snapshot de lo guardado, para mostrar el botón solo cuando hay cambios.
  const [snapshot, setSnapshot] = useState(null);

  const cargar = useCallback(async () => {
    if (!id_configuracion) return;
    setLoading(true);
    try {
      const res = await chatApi.post("/dropi_plantillas/respondedor/obtener", {
        id_configuracion,
      });
      const d = res.data?.data || {};
      const esManual =
        d.demora_dias_min !== null && d.demora_dias_max !== null;
      setActivo(d.activo !== 0);
      setModo(esManual ? "manual" : "auto");
      setDiasMin(esManual ? String(d.demora_dias_min) : "");
      setDiasMax(esManual ? String(d.demora_dias_max) : "");
      setRangoAuto(d.rango_auto || null);
      setSnapshot({
        activo: d.activo !== 0,
        modo: esManual ? "manual" : "auto",
        diasMin: esManual ? String(d.demora_dias_min) : "",
        diasMax: esManual ? String(d.demora_dias_max) : "",
      });
    } catch {
      // Sin datos no se bloquea el modal: la tarjeta queda con los defaults.
      setSnapshot({ activo: true, modo: "auto", diasMin: "", diasMax: "" });
    } finally {
      setLoading(false);
    }
  }, [id_configuracion]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const hayCambios =
    snapshot &&
    (snapshot.activo !== activo ||
      snapshot.modo !== modo ||
      (modo === "manual" &&
        (snapshot.diasMin !== diasMin || snapshot.diasMax !== diasMax)));

  const guardar = async () => {
    let min = null;
    let max = null;
    if (modo === "manual") {
      min = parseInt(diasMin, 10);
      max = parseInt(diasMax, 10);
      if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1) {
        Toast.fire({
          icon: "warning",
          title: "Completa los días del rango fijo (mínimo 1)",
        });
        return;
      }
      if (max < min) {
        Toast.fire({
          icon: "warning",
          title: 'El "hasta" no puede ser menor que el "desde"',
        });
        return;
      }
    }
    setGuardando(true);
    try {
      await chatApi.post("/dropi_plantillas/respondedor/guardar", {
        id_configuracion,
        activo: activo ? 1 : 0,
        demora_dias_min: min,
        demora_dias_max: max,
      });
      setSnapshot({ activo, modo, diasMin, diasMax });
      Toast.fire({ icon: "success", title: "Guardado" });
    } catch (err) {
      Toast.fire({
        icon: "error",
        title: err?.response?.data?.message || "Error al guardar",
      });
    } finally {
      setGuardando(false);
    }
  };

  /* ── Vista previa: el mensaje EXACTO que recibiría el cliente ── */

  const minManual = parseInt(diasMin, 10);
  const maxManual = parseInt(diasMax, 10);
  const manualValido =
    Number.isInteger(minManual) &&
    Number.isInteger(maxManual) &&
    minManual >= 1 &&
    maxManual >= minManual;

  let previewTexto;
  if (modo === "manual" && manualValido) {
    const dias =
      minManual === maxManual
        ? `de *${minManual} ${minManual === 1 ? "día" : "días"}*`
        : `de *${minManual} a ${maxManual} días*`;
    previewTexto = `Tu pedido va en camino 🚚 El tiempo estimado de entrega es ${dias} desde la compra, aunque puede variar un poco según la zona.`;
  } else if (modo === "manual") {
    previewTexto = null; // faltan los días: se pide completarlos
  } else if (rangoAuto) {
    previewTexto = `Tu pedido va en camino 🚚 Los pedidos a tu ciudad normalmente llegan entre *${rangoAuto.desde} y ${rangoAuto.hasta} días* desde la compra, aunque puede variar un poco según la zona.`;
  } else {
    previewTexto = `Tu pedido va en camino 🚚 La entrega normalmente toma de *2 a 5 días hábiles* según la ciudad; a zonas alejadas puede tardar un poco más.`;
  }

  // Aviso honesto: prometer menos de lo que tardan las entregas reales trae
  // reclamos — se avisa, pero la decisión es del negocio.
  const prometeDeMas =
    modo === "manual" &&
    rangoAuto &&
    Number.isInteger(maxManual) &&
    maxManual < rangoAuto.hasta;

  /* ── Piezas de UI ── */

  const inputDias = (valor, setValor, placeholder) => (
    <input
      type="number"
      min={1}
      max={60}
      value={valor}
      placeholder={placeholder}
      onChange={(e) => setValor(e.target.value)}
      style={{
        width: 64,
        padding: "7px 8px",
        borderRadius: 8,
        border: "1.5px solid #e5e7eb",
        fontSize: ".82rem",
        color: "#111827",
        outline: "none",
        textAlign: "center",
        fontFamily: "inherit",
      }}
    />
  );

  const radioOpcion = (key, titulo, detalle, badge) => {
    const seleccionado = modo === key;
    return (
      <label
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 9,
          padding: "9px 11px",
          borderRadius: 10,
          border: seleccionado
            ? "1.5px solid rgba(99,102,241,.45)"
            : "1.5px solid #e5e7eb",
          background: seleccionado ? "rgba(99,102,241,.05)" : "#fff",
          cursor: "pointer",
          userSelect: "none",
          transition: "all .15s",
        }}
      >
        <input
          type="radio"
          name="rl-modo-demora"
          checked={seleccionado}
          onChange={() => setModo(key)}
          style={{
            width: 15,
            height: 15,
            accentColor: "#6366f1",
            cursor: "pointer",
            flexShrink: 0,
            margin: "2px 0 0",
          }}
        />
        <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <strong
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: ".78rem",
              fontWeight: 700,
              color: "#1e293b",
              lineHeight: 1.35,
            }}
          >
            {titulo}
            {badge && (
              <span
                style={{
                  padding: "1px 7px",
                  borderRadius: 999,
                  background: "#dcfce7",
                  color: "#15803d",
                  fontSize: ".6rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: ".03em",
                }}
              >
                {badge}
              </span>
            )}
          </strong>
          <em
            style={{
              fontStyle: "normal",
              fontSize: ".7rem",
              color: "#64748b",
              lineHeight: 1.45,
            }}
          >
            {detalle}
          </em>
        </span>
      </label>
    );
  };

  return (
    <div
      style={{
        borderRadius: 12,
        border: activo
          ? "1.5px solid rgba(16,185,129,.3)"
          : "1.5px solid #e5e7eb",
        background: activo ? "rgba(16,185,129,.03)" : "#fafafa",
        marginBottom: 14,
        overflow: "hidden",
        transition: "all .25s",
      }}
    >
      {/* Header de la tarjeta */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "11px 14px",
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setExpandido((v) => !v)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: activo ? "rgba(16,185,129,.12)" : "#f1f5f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <i
              className="bx bx-support"
              style={{
                fontSize: 17,
                color: activo ? "#10b981" : "#94a3b8",
              }}
            />
          </div>
          <div>
            <div
              style={{
                fontSize: ".84rem",
                fontWeight: 700,
                color: "#1e293b",
                lineHeight: 1.25,
              }}
            >
              Respuestas automáticas sobre el envío
            </div>
            <div
              style={{ fontSize: ".68rem", color: "#94a3b8", marginTop: 2 }}
            >
              Cuando el cliente pregunta por su guía, su retiro o cuándo llega,
              el sistema le contesta al instante
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {loading ? (
            <i
              className="bx bx-loader-alt bx-spin"
              style={{ fontSize: 16, color: "#94a3b8" }}
            />
          ) : (
            <div
              className="dp-toggle"
              style={{ background: activo ? "#10b981" : "#cbd5e1" }}
              onClick={(e) => {
                e.stopPropagation();
                setActivo((v) => !v);
                setExpandido(true);
              }}
            >
              <div
                className="dp-toggle-knob"
                style={{ left: activo ? 20 : 2 }}
              />
            </div>
          )}
          <i
            className={`bx bx-chevron-${expandido ? "up" : "down"}`}
            style={{ fontSize: 18, color: "#94a3b8" }}
          />
        </div>
      </div>

      {/* Cuerpo expandible */}
      {expandido && !loading && (
        <div style={{ padding: "0 14px 14px" }}>
          <div className="dp-divider" style={{ margin: "0 0 10px" }} />

          {/* Qué responde, con ejemplos reales */}
          <div className="dp-section-label" style={{ marginTop: 0 }}>
            <i className="bx bx-message-rounded-dots" />
            Qué responde por ti
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {QUE_RESPONDE.map((item) => (
              <div
                key={item.icon}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "7px 10px",
                  borderRadius: 9,
                  background: "#fff",
                  border: "1px solid #eef2f7",
                }}
              >
                <i
                  className={item.icon}
                  style={{ fontSize: 15, color: "#6366f1", flexShrink: 0 }}
                />
                <div style={{ minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: ".74rem",
                      fontWeight: 700,
                      color: "#334155",
                    }}
                  >
                    “{item.pregunta}”
                  </span>
                  <span
                    style={{
                      fontSize: ".7rem",
                      color: "#64748b",
                      marginLeft: 6,
                    }}
                  >
                    → {item.respuesta}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="dp-hint" style={{ margin: "7px 0 0" }}>
            Usa siempre los datos reales del pedido de cada cliente y solo
            actúa cuando el chat está en una etapa de seguimiento del envío sin
            asistente de IA. Cualquier otra pregunta le llega a tu equipo, como
            siempre.
          </p>

          {!activo && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                marginTop: 10,
                padding: "8px 11px",
                borderRadius: 9,
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                fontSize: ".72rem",
                color: "#64748b",
                lineHeight: 1.5,
              }}
            >
              <i
                className="bx bx-moon"
                style={{ marginTop: 1, flexShrink: 0 }}
              />
              <span>
                <b style={{ color: "#475569" }}>Apagado.</b> Estas preguntas ya
                no se responden solas: tu equipo tendrá que contestarlas una
                por una en el chat.
              </span>
            </div>
          )}

          {activo && (
            <>
              {/* Tiempo de entrega */}
              <div className="dp-section-label" style={{ marginTop: 14 }}>
                <i className="bx bx-time-five" />
                ¿Qué tiempo de entrega le decimos al cliente?
              </div>

              <div
                style={{ display: "flex", flexDirection: "column", gap: 7 }}
              >
                {radioOpcion(
                  "auto",
                  "Calculado con tus entregas reales",
                  rangoAuto
                    ? `El sistema mira cuánto tardaron tus últimas entregas y le dice eso al cliente. Con tus datos de los últimos 90 días (${rangoAuto.muestras} pedidos), hoy diría: entre ${rangoAuto.desde} y ${rangoAuto.hasta} días.`
                    : "El sistema mira cuánto tardaron tus últimas entregas y le dice eso al cliente. Aún no tienes historial suficiente, así que por ahora dice un rango general de 2 a 5 días hábiles.",
                  "Recomendado",
                )}
                {radioOpcion(
                  "manual",
                  "Un rango fijo que tú decides",
                  "Escribe los días tú mismo y el sistema siempre dirá ese rango, sin importar cuánto tarden tus entregas.",
                )}
              </div>

              {modo === "manual" && (
                <div style={{ marginTop: 9 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: ".78rem",
                      color: "#334155",
                      fontWeight: 600,
                    }}
                  >
                    Entre {inputDias(diasMin, setDiasMin, "1")} y{" "}
                    {inputDias(diasMax, setDiasMax, "2")} días desde la compra
                  </div>
                  {prometeDeMas && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 7,
                        marginTop: 8,
                        padding: "7px 10px",
                        borderRadius: 8,
                        border: "1px solid #fde68a",
                        background: "#fffbeb",
                        fontSize: ".68rem",
                        color: "#b45309",
                        lineHeight: 1.45,
                      }}
                    >
                      <i
                        className="bx bx-error"
                        style={{ marginTop: 1, flexShrink: 0 }}
                      />
                      <span>
                        Ten en cuenta: tus entregas reales están tardando hasta{" "}
                        <b>{rangoAuto.hasta} días</b>. Si prometes menos, es
                        probable que recibas reclamos de clientes que no
                        reciben a tiempo.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Vista previa del mensaje, estilo WhatsApp */}
              <div className="dp-section-label" style={{ marginTop: 14 }}>
                <i className="bx bxl-whatsapp" />
                Así le responderá cuando pregunte “¿cuándo me llega?”
              </div>
              <div
                style={{
                  borderRadius: 10,
                  overflow: "hidden",
                  border: "1px solid #d1d7db",
                  background: "#efeae2",
                  padding: "12px 12px 12px 14px",
                }}
              >
                {previewTexto ? (
                  <div
                    style={{
                      background: "#fff",
                      borderRadius: "0px 8px 8px 8px",
                      maxWidth: "94%",
                      boxShadow: "0 1px 0.5px rgba(11,20,26,.13)",
                      padding: "8px 11px",
                      fontSize: ".76rem",
                      color: "#111b21",
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {negritasWhatsApp(previewTexto)}
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: ".72rem",
                        color: "#027eb5",
                      }}
                    >
                      Puedes ver el avance en tiempo real aquí:
                      <br />
                      <span style={{ textDecoration: "underline" }}>
                        (link de rastreo real del pedido)
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: ".72rem",
                      color: "#8696a0",
                      textAlign: "center",
                      padding: "6px 0",
                    }}
                  >
                    Completa los días del rango para ver el mensaje
                  </div>
                )}
              </div>
            </>
          )}

          {hayCambios && (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 12,
              }}
            >
              <button
                className="dp-save-btn"
                type="button"
                disabled={guardando}
                onClick={guardar}
              >
                {guardando ? (
                  <i className="bx bx-loader-alt bx-spin" />
                ) : (
                  <i className="bx bx-check" />
                )}
                Guardar cambios
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RespondedorLogistico;
