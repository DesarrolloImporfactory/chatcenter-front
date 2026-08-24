// src/pages/productos2/wizard/WizardProductoModal.jsx
// Un solo modal por producto, en 3 pasos:
//   1 · Producto      → el formulario completo del catálogo (ProductoModal
//                       incrustado): nombre, precio, combos, stock, variedades,
//                       fotos, categoría… todo se edita aquí mismo.
//   2 · Bot           → con los datos del paso 1 la IA completa todo (textos,
//                       beneficios, respuestas rápidas); aquí solo se ajusta:
//                       tipo de venta, envío y pago, media y contenido.
//   3 · Vista previa  → el teléfono con la conversación y un simulador.
// El mensaje fijo SIEMPRE lo compone el backend (preview-mensaje): es la misma
// función que usa el webhook. Si el producto no se configura o se pausa, el
// bot sigue el flujo actual con IA usando la información del catálogo.
import React, { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import chatApi from "../../../api/chatcenter";
import ProductoModal from "../../productos/modales/ProductoModal";
import WaPreview from "./WaPreview";
import MediaManager from "./MediaManager";
import RespuestasRapidasEditor from "./RespuestasRapidasEditor";

const PASOS = [
  { n: 1, label: "Producto", icon: "bx-box" },
  { n: 2, label: "Bot", icon: "bx-bot" },
  { n: 3, label: "Vista previa", icon: "bx-mobile-alt" },
];

// Opciones frecuentes para la línea de envío y pago del mensaje. "Otra" abre
// el campo libre; "Sin línea" la deja vacía (no se muestra en el mensaje).
const PRESETS_ENVIO = {
  producto: [
    "🚚 Envío gratis y pagas al recibir",
    "🚚 Envío gratis",
    "💵 Pagas al recibir",
  ],
  servicio: [
    "💳 Reserva sin costo, pagas el día de la cita",
    "📅 Agenda hoy, atención personalizada",
  ],
};

const WIZARD_VACIO = {
  tipo_venta: "fisico",
  problema_resuelve: "",
  antes_despues: "",
  beneficios: "",
  descripcion_ia: "",
  pregunta_gancho: "",
  intro_mensaje: "",
  linea_envio: "🚚 Envío gratis y pagas al recibir",
  bullets: [],
  media: [],
  respuestas_rapidas: [],
  mensaje_inicial: "",
  usar_respuestas_rapidas: 1,
  wizard_completado: 0,
  activo: 1,
};

const currency = new Intl.NumberFormat("es-EC", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});
const money = (v) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? currency.format(n) : "—";
};

/* ── piezas de UI ── */
const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13.5px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition";
const taCls = `${inputCls} min-h-[84px] resize-y leading-relaxed`;

function Card({
  title,
  desc,
  right,
  children,
  className = "",
  bodyClass = "p-4",
}) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white ${className}`}
    >
      {(title || desc || right) && (
        <header className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-100">
          <div className="min-w-0">
            {title ? (
              <h3 className="text-[13.5px] font-semibold text-slate-800">
                {title}
              </h3>
            ) : null}
            {desc ? (
              <p className="text-[12px] text-slate-500 leading-snug mt-0.5">
                {desc}
              </p>
            ) : null}
          </div>
          {right}
        </header>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

function Label({ children, right }) {
  return (
    <div className="flex items-center justify-between mb-1">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {children}
      </label>
      {right}
    </div>
  );
}

export default function WizardProductoModal({
  open,
  idProducto,
  onClose,
  onSaved,
  iaDisponible = false,
  nombreNegocio = "Tu negocio",
  categorias = [],
  onCategoriasChange,
  productosExistentes = [],
}) {
  const [step, setStep] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [producto, setProducto] = useState(null);
  const [combosValidos, setCombosValidos] = useState([]);
  const [mediaFija, setMediaFija] = useState([]); // foto/video del catálogo
  const [form, setForm] = useState(WIZARD_VACIO);
  const [generando, setGenerando] = useState(false);
  const [extrasIA, setExtrasIA] = useState({
    texto_antes: "",
    texto_despues: "",
  });
  const [preview, setPreview] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorCarga, setErrorCarga] = useState(null);
  const [simulacion, setSimulacion] = useState([]);
  const [simTexto, setSimTexto] = useState("");
  const [simulando, setSimulando] = useState(false);
  const [simResponseId, setSimResponseId] = useState(null); // hilo de la IA del simulador
  const [simColumna, setSimColumna] = useState(null); // { id, nombre, activa_ia } que atiende ahora
  const [huboCambios, setHuboCambios] = useState(false); // para que el listado solo recargue si hace falta
  const [envioLibre, setEnvioLibre] = useState(false); // campo libre de "envío y pago"
  const previewTimer = useRef(null);

  const idc = Number(localStorage.getItem("id_configuracion"));

  /* ── carga (producto + wizard) ── */
  const cargar = async ({ mantenerPaso = false } = {}) => {
    if (!idProducto) return;
    if (!mantenerPaso) setStep(1);
    setCargando(true);
    setErrorCarga(null);
    try {
      const { data } = await chatApi.post(
        "/producto-wizard/obtener",
        { id_configuracion: idc, id_producto: idProducto },
        { silentError: true },
      );
      const d = data?.data || {};
      setProducto(d.producto || null);
      setCombosValidos(d.combos_validos || []);
      setMediaFija(Array.isArray(d.media_fija) ? d.media_fija : []);
      const w = d.wizard || {};
      setForm({
        ...WIZARD_VACIO,
        ...w,
        bullets: Array.isArray(w.bullets) ? w.bullets : [],
        media: Array.isArray(w.media) ? w.media : [],
        respuestas_rapidas: Array.isArray(w.respuestas_rapidas)
          ? w.respuestas_rapidas
          : [],
        linea_envio:
          w.linea_envio === undefined || w.linea_envio === null
            ? WIZARD_VACIO.linea_envio
            : w.linea_envio,
      });
      setPreview(d.mensaje_sugerido || "");
    } catch (e) {
      setErrorCarga(
        e?.response?.data?.message || "No se pudo cargar el producto.",
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (!open || !idProducto) return;
    setPreview("");
    setExtrasIA({ texto_antes: "", texto_despues: "" });
    setSimulacion([]);
    setSimTexto("");
    setSimResponseId(null);
    setSimColumna(null);
    setHuboCambios(false);
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, idProducto]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setMedia = (v) =>
    setForm((f) => ({ ...f, media: typeof v === "function" ? v(f.media) : v }));

  /* ── preview compuesto por el backend ── */
  const firmaPreview = useMemo(
    () =>
      JSON.stringify([
        form.intro_mensaje,
        form.pregunta_gancho,
        form.linea_envio,
        form.tipo_venta,
        producto?.precio,
        producto?.combos_producto,
      ]),
    [
      form.intro_mensaje,
      form.pregunta_gancho,
      form.linea_envio,
      form.tipo_venta,
      producto?.precio,
      producto?.combos_producto,
    ],
  );

  useEffect(() => {
    if (!open || !idProducto || cargando) return;
    clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(async () => {
      try {
        const { data } = await chatApi.post(
          "/producto-wizard/preview-mensaje",
          {
            id_configuracion: idc,
            id_producto: idProducto,
            wizard: {
              intro_mensaje: form.intro_mensaje,
              pregunta_gancho: form.pregunta_gancho,
              linea_envio: form.linea_envio,
              tipo_venta: form.tipo_venta,
            },
          },
          { silentError: true },
        );
        setPreview(data?.data?.mensaje || "");
      } catch {
        /* el preview no es crítico */
      }
    }, 350);
    return () => clearTimeout(previewTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firmaPreview, open, idProducto, cargando]);

  /* ── generar textos (con la información del producto del paso 1) ── */
  const generarTextos = async () => {
    if (!iaDisponible) {
      Swal.fire({
        icon: "info",
        title: "Falta la API key de OpenAI",
        text: "Conéctala en Asistentes para generar con IA, o escribe el contenido manualmente aquí abajo.",
      });
      return;
    }
    setGenerando(true);
    try {
      const { data } = await chatApi.post(
        "/producto-wizard/generar-textos",
        {
          id_configuracion: idc,
          id_producto: idProducto,
          wizard: {
            tipo_venta: form.tipo_venta,
            problema_resuelve: form.problema_resuelve,
            antes_despues: form.antes_despues,
            beneficios: form.beneficios,
            linea_envio: form.linea_envio,
          },
        },
        { silentError: true, timeout: 120000 },
      );
      const g = data?.data || {};
      const nuevo = {
        ...form,
        intro_mensaje: g.intro_mensaje || form.intro_mensaje,
        descripcion_ia:
          g.descripcion || g.descripcion_ia || form.descripcion_ia,
        pregunta_gancho: g.pregunta_gancho || form.pregunta_gancho,
        bullets:
          Array.isArray(g.bullets) && g.bullets.length
            ? g.bullets
            : form.bullets,
        respuestas_rapidas:
          Array.isArray(g.respuestas_rapidas) && g.respuestas_rapidas.length
            ? g.respuestas_rapidas
            : form.respuestas_rapidas,
        mensaje_inicial: "",
      };
      setForm(nuevo);
      setExtrasIA({
        texto_antes: g.texto_antes || "",
        texto_despues: g.texto_despues || "",
      });
      // La descripción generada quedó guardada en el producto (una sola fuente):
      // se refresca la ficha sin perder lo generado (se guarda como borrador).
      if (g.descripcion_actualizada) {
        try {
          await chatApi.post(
            "/producto-wizard/guardar",
            { id_configuracion: idc, id_producto: idProducto, wizard: nuevo },
            { silentError: true },
          );
          const { data: d2 } = await chatApi.post(
            "/producto-wizard/obtener",
            { id_configuracion: idc, id_producto: idProducto },
            { silentError: true },
          );
          if (d2?.data?.producto) setProducto(d2.data.producto);
          setHuboCambios(true);
        } catch {
          /* si falla, el contenido sigue en pantalla y se guarda después */
        }
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title:
            "Contenido generado. La descripción del producto quedó actualizada.",
          showConfirmButton: false,
          timer: 2600,
          timerProgressBar: true,
        });
      }
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "No se pudo generar",
        text:
          e?.response?.data?.message ||
          "OpenAI no respondió. Revisa tu API key y el saldo en Asistentes.",
      });
    } finally {
      setGenerando(false);
    }
  };

  /* ── guardar ── */
  const guardar = async ({
    activar,
    silencioso = false,
    patch = null,
  } = {}) => {
    setGuardando(true);
    try {
      const payload = patch || {
        ...form,
        wizard_completado: activar ? 1 : form.wizard_completado,
      };
      const { data } = await chatApi.post(
        "/producto-wizard/guardar",
        { id_configuracion: idc, id_producto: idProducto, wizard: payload },
        { silentError: true },
      );
      const w = data?.data?.wizard;
      if (w) set({ ...w });
      setHuboCambios(true);
      if (!silencioso) {
        Swal.fire({
          icon: "success",
          title: activar ? "Mensaje fijo activado" : "Borrador guardado",
          text: activar
            ? "El próximo cliente que llegue desde el anuncio recibirá este paquete sin pasar por la IA."
            : "Puedes seguir editando cuando quieras. Mientras no se active, el bot usa el flujo normal.",
          timer: 2000,
          showConfirmButton: false,
        });
      }
      if (activar) onClose?.({ cambios: true });
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "No se pudo guardar",
        text: e?.response?.data?.message || e.message,
      });
    } finally {
      setGuardando(false);
    }
  };

  /* ── simulador de la vista previa ── */
  /* El simulador responde como el bot en vivo para ESTE producto: respuesta
     rápida si la pregunta calza; si no (o si quiere comprar), la IA de la
     columna inicial con la ficha del producto, en un hilo continuo. El mensaje
     fijo de arriba ya cuenta como primer turno del asistente. No envía nada
     por WhatsApp; sí consume tokens de la cuenta, como el chat de prueba. */
  const simular = async () => {
    const texto = simTexto.trim();
    if (!texto || simulando) return;
    setSimulando(true);
    setSimTexto("");
    setSimulacion((s) => [...s, { cliente: texto, pensando: true }]);
    try {
      const { data } = await chatApi.post(
        "/producto-wizard/simular",
        {
          id_configuracion: idc,
          id_producto: idProducto,
          mensaje: texto,
          mensaje_fijo: mensajeFinal,
          previous_response_id: simResponseId,
          id_columna: simColumna?.id || null,
          historial: simulacion
            .filter((t) => !t.pensando)
            .flatMap((t) => [
              t.cliente ? { rol: "cliente", texto: t.cliente } : null,
              t.bot ? { rol: "bot", texto: t.bot } : null,
            ])
            .filter(Boolean),
          wizard: {
            tipo_venta: form.tipo_venta,
            descripcion_ia: producto?.descripcion || form.descripcion_ia || "",
            bullets: form.bullets,
            respuestas_rapidas: form.respuestas_rapidas,
            usar_respuestas_rapidas: form.usar_respuestas_rapidas,
          },
        },
        { silentError: true, timeout: 150000 },
      );
      const r = data?.data || {};
      if (r.tipo === "humano") {
        setSimulacion((s) => [
          ...s.filter((t) => !t.pensando),
          {
            cliente: texto,
            nota: `La conversación está en “${r.columna}”: en vivo la atiende una persona del equipo, el bot ya no responde. Pulsa ↻ para simular de nuevo desde el inicio.`,
          },
        ]);
        return;
      }
      if (r.previous_response_id) setSimResponseId(r.previous_response_id);
      const tag = r.tipo === "rapida" ? "sin IA" : null;
      const turno = {
        cliente: texto,
        bot: r.respuesta || "(sin respuesta)",
        remitente: r.remitente || (r.tipo === "rapida" ? "Respuesta rápida" : "IA"),
        tag,
      };
      if (r.siguiente_columna) {
        const sc = r.siguiente_columna;
        setSimColumna({ id: sc.id, nombre: sc.nombre, activa_ia: sc.activa_ia });
        turno.nota = sc.activa_ia
          ? `La conversación pasa a la etapa “${sc.nombre}”${
              sc.genera_guia
                ? ": en vivo aquí se generaría la guía / orden con los datos del resumen"
                : ""
            }. Los siguientes mensajes los responde el asistente de esa etapa.`
          : `La conversación pasa a la etapa “${sc.nombre}”${
              sc.genera_guia
                ? " (en vivo aquí se generaría la guía / orden con los datos del resumen)"
                : ""
            }: la atiende una persona del equipo, el bot deja de responder.`;
      } else if (Array.isArray(r.acciones_detectadas) && r.acciones_detectadas.length) {
        turno.nota = `El asistente marcó: ${r.acciones_detectadas
          .map((a) => a.trigger || a)
          .join(", ")}.`;
      }
      if (r.cierre_bloqueado) {
        turno.nota = `El asistente intentó cerrar, pero el resumen no traía todos los datos del pedido: como en vivo, no pasa de etapa y pide lo que falta.`;
      }
      if (r.faq_omitida) {
        turno.nota = `${turno.nota ? `${turno.nota} ` : ""}Respondió la IA y no la respuesta rápida “${r.faq_omitida}” porque el mensaje traía intención de compra: en ese caso siempre sigue el asistente para avanzar el pedido.`;
      }
      setSimulacion((s) => [...s.filter((t) => !t.pensando), turno]);
    } catch (e) {
      setSimulacion((s) => [
        ...s.filter((t) => !t.pensando),
        {
          cliente: texto,
          nota:
            e?.response?.data?.message ||
            "No se pudo obtener la respuesta. Revisa la API key de OpenAI y que la cuenta tenga una columna inicial con asistente.",
        },
      ]);
    } finally {
      setSimulando(false);
    }
  };

  const cerrar = () => onClose?.({ cambios: huboCambios });

  if (!open) return null;

  const paqueteTotal = [...mediaFija, ...form.media];
  const nImg = paqueteTotal.filter((m) => m.tipo === "image").length;
  const nVid = paqueteTotal.filter((m) => m.tipo === "video").length;
  const len = (s) => String(s || "").trim().length;
  // ¿La IA (o alguien) ya llenó el contenido del bot? Si no, el paso 2 abre
  // con el botón de completar automáticamente a partir del paso 1.
  const contenidoVacio =
    !len(form.intro_mensaje) &&
    !form.bullets.filter(Boolean).length &&
    !form.respuestas_rapidas.length;
  const mensajeFinal = form.mensaje_inicial?.trim() || preview;
  const puedeActivar = Boolean(mensajeFinal) && paqueteTotal.length > 0;
  const faqsActivas = form.respuestas_rapidas.filter(
    (f) => f.activa !== 0 && f.pregunta && f.respuesta,
  ).length;
  const activoEnVivo = Boolean(form.wizard_completado) && Boolean(form.activo);

  // Selector de la línea de envío y pago: opciones de un clic + campo libre.
  const presetsEnvio =
    PRESETS_ENVIO[form.tipo_venta === "servicio" ? "servicio" : "producto"];
  const envioEsPreset =
    !len(form.linea_envio) || presetsEnvio.includes(form.linea_envio);
  const chipEnvio = (activa) =>
    `rounded-full px-3 py-1.5 text-[12px] font-medium ring-1 transition ${
      activa
        ? "bg-indigo-600 text-white ring-indigo-600"
        : "bg-white text-slate-600 ring-slate-200 hover:ring-slate-300"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-3">
      <div className="w-full max-w-6xl h-[93vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 bg-[#171931] text-white">
          <div className="min-w-0 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/10 overflow-hidden flex items-center justify-center shrink-0">
              {producto?.imagen_url ? (
                <img
                  src={producto.imagen_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <i className="bx bx-package text-xl text-white/60" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-widest text-white/60">
                Producto y bot
              </div>
              <div className="font-semibold truncate">
                {producto?.nombre || "Cargando…"}
                {producto ? (
                  <span className="ml-2 text-white/70 font-normal text-sm">
                    {money(producto.precio)}
                    {producto.external_source === "DROPI" &&
                    producto.external_id != null
                      ? ` · Dropi #${producto.external_id}`
                      : ""}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {form.wizard_completado ? (
              <button
                type="button"
                disabled={guardando}
                onClick={() =>
                  guardar({
                    silencioso: true,
                    patch: { activo: activoEnVivo ? 0 : 1 },
                  })
                }
                title={
                  activoEnVivo
                    ? "Pausar: el producto vuelve al flujo con IA"
                    : "Reactivar el mensaje fijo"
                }
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11.5px] font-semibold ring-1 transition ${
                  activoEnVivo
                    ? "bg-emerald-500/20 text-emerald-200 ring-emerald-400/40 hover:bg-emerald-500/30"
                    : "bg-white/10 text-white/80 ring-white/20 hover:bg-white/20"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${activoEnVivo ? "bg-emerald-400" : "bg-slate-400"}`}
                />
                {activoEnVivo ? "Mensaje fijo activo" : "Mensaje fijo pausado"}
                <i className={`bx ${activoEnVivo ? "bx-pause" : "bx-play"}`} />
              </button>
            ) : (
              <span className="text-[11px] bg-white/10 text-white/80 ring-1 ring-white/20 rounded-full px-2.5 py-1">
                Bot sin configurar · flujo con IA
              </span>
            )}
            <button
              type="button"
              onClick={cerrar}
              className="h-8 w-8 rounded-lg hover:bg-white/10 flex items-center justify-center"
              title="Cerrar"
            >
              <i className="bx bx-x text-2xl" />
            </button>
          </div>
        </div>

        {/* Stepper */}
        <div className="px-5 pt-3 border-b border-slate-100 bg-white">
          <div className="flex gap-1">
            {PASOS.map((p) => (
              <button
                key={p.n}
                type="button"
                onClick={() => setStep(p.n)}
                className={`flex-1 flex items-center justify-center gap-2 pb-2.5 text-[12.5px] font-medium border-b-2 transition ${
                  step === p.n
                    ? "border-indigo-600 text-indigo-700"
                    : step > p.n
                      ? "border-emerald-400 text-slate-600"
                      : "border-transparent text-slate-400"
                }`}
              >
                <span
                  className={`h-5 w-5 rounded-full text-[11px] flex items-center justify-center ${
                    step === p.n
                      ? "bg-indigo-600 text-white"
                      : step > p.n
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {step > p.n ? <i className="bx bx-check" /> : p.n}
                </span>
                <span className="hidden sm:inline">{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto bg-slate-50/60 px-5 py-4">
          {cargando ? (
            <div className="py-16 text-center text-slate-500">
              <i className="bx bx-loader-alt bx-spin text-3xl" />
              <div className="text-sm mt-2">Cargando producto…</div>
            </div>
          ) : errorCarga ? (
            <div className="py-16 text-center text-rose-600 text-sm">
              {errorCarga}
            </div>
          ) : null}

          {/* ══ Paso 1 · Producto (formulario completo del catálogo) ══ */}
          {!cargando && !errorCarga && step === 1 && producto ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
                <div className="text-[12.5px] text-slate-600">
                  Edita aquí los datos del catálogo: nombre, descripción,
                  precio, combos, stock, variedades, foto, video y categoría. Es
                  la única fuente: el bot los lee en vivo y la foto y el video
                  son las primeras piezas del paquete del primer mensaje.
                </div>
                {producto.external_source === "DROPI" ? (
                  <span className="shrink-0 inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 ring-1 ring-orange-200">
                    <i className="bx bx-barcode" /> Importado de Dropi
                  </span>
                ) : null}
              </div>
              <ProductoModal
                key={`${producto.id}-${producto.fecha_actualizacion || ""}`}
                open
                embedded
                editingProduct={producto}
                categorias={categorias}
                onCategoriasChange={onCategoriasChange}
                productosExistentes={productosExistentes}
                onSaved={() => {
                  setHuboCambios(true);
                  cargar({ mantenerPaso: true });
                }}
                onClose={() => {}}
              />
            </div>
          ) : null}

          {/* ══ Paso 2 · Bot ══ */}
          {!cargando && !errorCarga && step === 2 ? (
            <div className="space-y-4">
              {/* La IA completa todo con los datos del paso 1 */}
              <Card bodyClass="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-semibold text-slate-800 flex items-center gap-1.5">
                      <i
                        className={`bx ${contenidoVacio ? "bx-bot" : "bx-check-circle"} text-base ${contenidoVacio ? "text-indigo-600" : "text-emerald-600"}`}
                      />
                      {contenidoVacio
                        ? "La IA arma todo con los datos del producto"
                        : "Contenido listo: revísalo y ajústalo abajo"}
                    </div>
                    <p className="text-[12px] text-slate-500 leading-snug mt-0.5">
                      Con el nombre, la descripción, el precio y la categoría
                      del paso 1 se generan la descripción, el mensaje, los
                      beneficios y las respuestas rápidas. No tienes que llenar
                      nada más.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={generando}
                    onClick={async () => {
                      if (!contenidoVacio) {
                        const r = await Swal.fire({
                          icon: "question",
                          title: "¿Volver a generar?",
                          text: "Se reemplazan el mensaje, los beneficios y las respuestas rápidas actuales por una versión nueva.",
                          showCancelButton: true,
                          confirmButtonText: "Sí, generar de nuevo",
                          cancelButtonText: "Cancelar",
                          reverseButtons: true,
                        });
                        if (!r.isConfirmed) return;
                      }
                      generarTextos();
                    }}
                    className={`shrink-0 rounded-lg px-5 py-2.5 text-[13px] font-semibold inline-flex items-center gap-2 transition disabled:opacity-50 ${
                      contenidoVacio
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    }`}
                  >
                    {generando ? (
                      <>
                        <i className="bx bx-loader-alt bx-spin" /> Generando…
                      </>
                    ) : contenidoVacio ? (
                      <>
                        <i className="bx bx-magic-wand" /> Completar con IA
                      </>
                    ) : (
                      <>
                        <i className="bx bx-refresh" /> Volver a generar
                      </>
                    )}
                  </button>
                </div>
              </Card>

              <Card
                title="Cómo vende el bot este producto"
                desc="Dos ajustes: qué tipo de venta es (define la pregunta de cierre) y la línea de envío y pago que va debajo del precio."
              >
                <div className="grid lg:grid-cols-2 gap-x-6 gap-y-4 items-start">
                  <div>
                    <Label>Tipo de venta</Label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { v: "fisico", t: "Producto físico", icon: "bx-package" },
                        { v: "natural_salud", t: "Natural / salud", icon: "bx-leaf" },
                        { v: "servicio", t: "Servicio", icon: "bx-calendar-check" },
                      ].map((o) => (
                        <button
                          key={o.v}
                          type="button"
                          onClick={() => set({ tipo_venta: o.v })}
                          className={chipEnvio(form.tipo_venta === o.v)}
                        >
                          <i className={`bx ${o.icon} mr-1`} />
                          {o.t}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11.5px] text-slate-400 mt-1.5 leading-snug">
                      {form.tipo_venta === "natural_salud"
                        ? "Cierra preguntando por la molestia principal y redacta sin afirmaciones médicas."
                        : form.tipo_venta === "servicio"
                          ? "Cierra preguntando para qué fecha lo agenda. No habla de unidades ni de envío."
                          : "Cierra preguntando cuántas unidades quiere, según los combos del paso 1."}
                    </p>
                  </div>
                  <div>
                    <Label>
                      {form.tipo_venta === "servicio"
                        ? "Pago y reserva (va debajo del precio)"
                        : "Envío y pago (va debajo del precio)"}
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {presetsEnvio.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            setEnvioLibre(false);
                            set({ linea_envio: p });
                          }}
                          className={chipEnvio(
                            !envioLibre && form.linea_envio === p,
                          )}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setEnvioLibre(false);
                          set({ linea_envio: "" });
                        }}
                        className={chipEnvio(
                          !envioLibre && !len(form.linea_envio),
                        )}
                        title="El mensaje no lleva línea de envío"
                      >
                        Sin línea
                      </button>
                      <button
                        type="button"
                        onClick={() => setEnvioLibre(true)}
                        className={chipEnvio(envioLibre || !envioEsPreset)}
                      >
                        <i className="bx bx-pencil mr-1" />
                        Otra…
                      </button>
                    </div>
                    {envioLibre || !envioEsPreset ? (
                      <input
                        autoFocus
                        value={form.linea_envio ?? ""}
                        onChange={(e) => set({ linea_envio: e.target.value })}
                        className={`${inputCls} mt-2`}
                        placeholder={
                          form.tipo_venta === "servicio"
                            ? "Ej: 💳 Reserva sin costo, pagas el día de la cita"
                            : "Ej: 🚚 Envío gratis a Quito y Guayaquil"
                        }
                      />
                    ) : null}
                  </div>
                </div>
              </Card>

              <details className="group">
                <summary className="cursor-pointer list-none">
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-semibold text-slate-800">
                        ¿Qué pasa cuando un cliente escribe?
                      </div>
                      <div className="text-[12px] text-slate-500 leading-snug">
                        Cómo decide el sistema entre el mensaje fijo, una
                        respuesta rápida y el asistente con IA.
                      </div>
                    </div>
                    <i className="bx bx-chevron-down text-xl text-slate-400 shrink-0 transition group-open:rotate-180" />
                  </div>
                </summary>
                <div className="mt-2 rounded-xl border border-slate-200 bg-white overflow-hidden">
                <table className="w-full text-[12.5px]">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="text-left px-4 py-2 font-semibold">
                        Situación
                      </th>
                      <th className="text-left px-4 py-2 font-semibold">
                        Qué recibe el cliente
                      </th>
                      <th className="text-left px-4 py-2 font-semibold whitespace-nowrap">
                        Consumo de IA
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700">
                    {[
                      [
                        "Escribe por primera vez desde un anuncio de este producto",
                        "La imagen principal, las adicionales, el video y el mensaje fijo con precio y pregunta de cierre.",
                        "Ninguno",
                        true,
                      ],
                      [
                        "Hace una pregunta que está en las respuestas rápidas",
                        "La respuesta rápida, tal cual la escribiste.",
                        "Ninguno",
                        true,
                      ],
                      [
                        "Pregunta otra cosa, o dice que quiere comprar",
                        "Responde el asistente de la columna con la ficha de este producto y sigue el cierre habitual (cantidad, datos de envío).",
                        "El modelo de la columna",
                        false,
                      ],
                      [
                        "El producto no está configurado o está pausado",
                        "El flujo de siempre: el asistente presenta el producto con la información del catálogo.",
                        "El modelo de la columna",
                        false,
                      ],
                    ].map(([s, r, c, gratis], i) => (
                      <tr
                        key={i}
                        className="border-t border-slate-100 align-top"
                      >
                        <td className="px-4 py-2.5 font-medium text-slate-800">
                          {s}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">{r}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              gratis
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                            }`}
                          >
                            <i
                              className={`bx ${gratis ? "bx-bolt-circle" : "bx-coin"}`}
                            />
                            {c}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </details>
            </div>
          ) : null}

          {/* ══ Paso 2 (continuación) · Contenido editable ══ */}
          {!cargando && !errorCarga && step === 2 ? (
            <div className="space-y-4 mt-4">
              <div className="grid xl:grid-cols-12 gap-4">
                <div className="xl:col-span-7 space-y-4">
                  <Card
                    title="Textos del mensaje fijo"
                    desc="Los precios, combos y la línea de envío los agrega el sistema automáticamente."
                  >
                    <div className="space-y-3">
                      <div>
                        <Label>Apertura (1 o 2 frases)</Label>
                        <textarea
                          value={form.intro_mensaje}
                          onChange={(e) =>
                            set({ intro_mensaje: e.target.value })
                          }
                          className={taCls}
                          placeholder="Ejemplo: ¿Tu tele no es Smart? Conecta el Onn Watch TV al HDMI y convierte cualquier televisor en Smart en minutos."
                        />
                      </div>
                      <div>
                        <Label>Pregunta de cierre</Label>
                        <input
                          value={form.pregunta_gancho}
                          onChange={(e) =>
                            set({ pregunta_gancho: e.target.value })
                          }
                          className={inputCls}
                          placeholder={
                            form.tipo_venta === "natural_salud"
                              ? "Ejemplo: Para recomendarte bien, ¿cuál es tu molestia principal?"
                              : "Ejemplo: ¿Te llevas 1, 2 o 3 unidades?"
                          }
                        />
                        <p className="text-[11.5px] text-slate-400 mt-1">
                          Si queda vacía se usa la pregunta por defecto según el
                          tipo de venta y los combos.
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card
                    title="Beneficios clave"
                    desc="Cuatro frases cortas. Se usan en la ficha que lee el asistente y como texto de la imagen “Beneficios”. La descripción del producto es la del paso 1: el asistente la lee de ahí."
                  >
                    <div className="space-y-3">
                      {producto?.descripcion ? (
                        <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                          <div className="flex items-center justify-between">
                            <Label>Descripción del producto (paso 1)</Label>
                            <button
                              type="button"
                              onClick={() => setStep(1)}
                              className="text-[11px] text-indigo-600 hover:underline"
                            >
                              Editar en Producto
                            </button>
                          </div>
                          <div className="text-[12px] text-slate-600 leading-relaxed line-clamp-4 whitespace-pre-line">
                            {producto.descripcion}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[12px] text-amber-800">
                          El producto no tiene descripción. Usa “Completar con
                          IA” arriba o escríbela en el paso 1: es lo que el
                          asistente lee para responder.
                        </div>
                      )}
                      <div>
                        <Label>Beneficios clave (4)</Label>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {[0, 1, 2, 3].map((i) => (
                            <input
                              key={i}
                              value={form.bullets[i] || ""}
                              onChange={(e) => {
                                const b = [...form.bullets];
                                while (b.length < 4) b.push("");
                                b[i] = e.target.value;
                                set({ bullets: b });
                              }}
                              className={inputCls}
                              placeholder={`Beneficio ${i + 1}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>

                <div className="xl:col-span-5">
                  <Card>
                    <MediaManager
                      idProducto={idProducto}
                      fijos={mediaFija}
                      onUsarComoPrincipal={async (url) => {
                        try {
                          await chatApi.post(
                            "/producto-wizard/foto-principal",
                            {
                              id_configuracion: idc,
                              id_producto: idProducto,
                              url,
                            },
                            { silentError: true },
                          );
                          setMedia((prev) =>
                            (prev || []).filter((m) => m.url !== url),
                          );
                          const { data: d2 } = await chatApi.post(
                            "/producto-wizard/obtener",
                            { id_configuracion: idc, id_producto: idProducto },
                            { silentError: true },
                          );
                          if (d2?.data?.producto) setProducto(d2.data.producto);
                          setHuboCambios(true);
                          setMediaFija(
                            Array.isArray(d2?.data?.media_fija)
                              ? d2.data.media_fija
                              : [],
                          );
                          /* Las adicionales se recargan del servidor: la foto
                             principal anterior ya viene ahí como "Foto
                             anterior". Lo que estaba en pantalla sin guardar se
                             conserva (se une, sin duplicar). */
                          const extrasServidor = Array.isArray(d2?.data?.wizard?.media)
                            ? d2.data.wizard.media
                            : [];
                          setMedia((prev) => {
                            const vistas = new Set(extrasServidor.map((m) => m.url));
                            const pendientes = (prev || []).filter(
                              (m) => m.url !== url && !vistas.has(m.url),
                            );
                            return [...extrasServidor, ...pendientes];
                          });
                          Swal.fire({
                            toast: true,
                            position: "top-end",
                            icon: "success",
                            title: "Ahora es la foto principal del producto",
                            showConfirmButton: false,
                            timer: 2200,
                          });
                        } catch (e) {
                          Swal.fire({
                            icon: "error",
                            title: "No se pudo actualizar la foto",
                            text: e?.response?.data?.message || e.message,
                          });
                        }
                      }}
                      media={form.media}
                      onChange={setMedia}
                      bullets={form.bullets.filter(Boolean)}
                      textoAntes={extrasIA.texto_antes}
                      textoDespues={extrasIA.texto_despues}
                      iaDisponible={iaDisponible}
                      tipoVenta={form.tipo_venta}
                    />
                  </Card>
                </div>
              </div>

              <Card>
                <RespuestasRapidasEditor
                  value={form.respuestas_rapidas}
                  onChange={(v) => set({ respuestas_rapidas: v })}
                  activas={Boolean(form.usar_respuestas_rapidas)}
                  onToggleActivas={(on) =>
                    set({ usar_respuestas_rapidas: on ? 1 : 0 })
                  }
                />
              </Card>
            </div>
          ) : null}

          {/* ══ Paso 3 · Vista previa ══ */}
          {!cargando && !errorCarga && step === 3 ? (
            <div className="grid lg:grid-cols-12 gap-5">
              <div className="lg:col-span-5 lg:sticky lg:top-0 self-start">
                <div className="mx-auto w-full max-w-[300px] mb-2 flex items-start gap-2 text-[11.5px] leading-snug text-slate-500">
                  <i className="bx bx-info-circle text-[15px] text-indigo-500 mt-px shrink-0" />
                  <span>
                    Escribe abajo como si fueras el cliente: el bot responde de
                    verdad, sin enviar nada por WhatsApp.
                  </span>
                </div>
                <WaPreview
                  nombreNegocio={nombreNegocio}
                  mensajeCliente={`Hola, quiero información ${form.tipo_venta === "servicio" ? "sobre" : "del"} ${producto?.nombre || "producto"}`}
                  media={paqueteTotal}
                  mensaje={mensajeFinal}
                  extras={simulacion}
                  nota={
                    simColumna
                      ? `Etapa actual de la simulación: ${simColumna.nombre}${
                          simColumna.activa_ia ? "" : " (la atiende una persona)"
                        }`
                      : null
                  }
                >
                  <div className="flex items-center gap-2">
                    <input
                      value={simTexto}
                      onChange={(e) => setSimTexto(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && !simulando && simular()
                      }
                      placeholder={simulando ? "El bot está respondiendo…" : "Escribe como el cliente: ¿tiene garantía? · sirve para mi moto · quiero 2"}
                      className="flex-1 min-w-0 rounded-full bg-white px-3 py-1.5 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                    <button
                      type="button"
                      onClick={simular}
                      disabled={simulando || !simTexto.trim()}
                      className="h-8 w-8 rounded-full bg-[#00a884] text-white flex items-center justify-center disabled:opacity-50"
                      title="Enviar"
                    >
                      <i
                        className={`bx ${simulando ? "bx-loader-alt bx-spin" : "bxs-send"}`}
                      />
                    </button>
                    {simulacion.length ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSimulacion([]);
                          setSimResponseId(null);
                          setSimColumna(null);
                        }}
                        className="h-8 w-8 rounded-full bg-white text-slate-500 flex items-center justify-center"
                        title="Empezar la simulación de cero"
                      >
                        <i className="bx bx-refresh" />
                      </button>
                    ) : null}
                  </div>
                </WaPreview>
              </div>

              <div className="lg:col-span-7 space-y-4">
                <Card
                  title="Mensaje final"
                  desc="Se envía exactamente así. Si lo dejas vacío, se compone automáticamente con precio y combos siempre actualizados."
                  right={
                    form.mensaje_inicial?.trim() ? (
                      <button
                        type="button"
                        onClick={() => set({ mensaje_inicial: "" })}
                        className="text-[11.5px] text-indigo-600 hover:underline whitespace-nowrap"
                      >
                        Usar el automático
                      </button>
                    ) : null
                  }
                >
                  <textarea
                    value={form.mensaje_inicial}
                    onChange={(e) => set({ mensaje_inicial: e.target.value })}
                    className={`${taCls} min-h-[210px]`}
                    placeholder={preview}
                  />
                </Card>

                <Card title="Resumen antes de activar">
                  <div className="grid sm:grid-cols-2 gap-2 text-[12.5px]">
                    {[
                      {
                        ok: paqueteTotal.length > 0,
                        t: `Paquete de media: ${nImg} imagen(es), ${nVid} video`,
                      },
                      {
                        ok: Boolean(mensajeFinal),
                        t: "Mensaje fijo con precio y pregunta de cierre",
                      },
                      {
                        ok: faqsActivas > 0,
                        t: `${faqsActivas} respuesta(s) rápida(s) activas`,
                        opcional: true,
                      },
                      {
                        ok: Boolean(producto?.descripcion?.trim()),
                        t: "Descripción del producto (la lee el asistente)",
                        opcional: true,
                      },
                    ].map((it, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${
                          it.ok
                            ? "border-emerald-200 bg-emerald-50/60 text-emerald-800"
                            : it.opcional
                              ? "border-slate-200 bg-white text-slate-500"
                              : "border-amber-200 bg-amber-50/60 text-amber-800"
                        }`}
                      >
                        <i
                          className={`bx ${
                            it.ok
                              ? "bx-check-circle"
                              : it.opcional
                                ? "bx-minus-circle"
                                : "bx-error-circle"
                          } text-base mt-px`}
                        />
                        <span>
                          {it.t}
                          {!it.ok && it.opcional ? " (opcional)" : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 grid sm:grid-cols-2 gap-2 text-[12px]">
                    <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-indigo-900">
                      <b>Guardar borrador:</b> guarda todo lo que configuraste,
                      pero el bot sigue con el flujo de siempre. Puedes volver y
                      terminar después.
                    </div>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-emerald-900">
                      <b>Activar:</b> desde ese momento los clientes que lleguen
                      por el anuncio reciben este paquete y las respuestas
                      rápidas. Se puede pausar en la cabecera de esta ventana.
                    </div>
                  </div>
                  <p className="text-[11.5px] text-slate-400 mt-2">
                    Tipo de venta:{" "}
                    <b className="text-slate-600">
                      {form.tipo_venta === "natural_salud"
                        ? "natural / salud"
                        : form.tipo_venta === "servicio"
                          ? "servicio"
                          : "producto físico"}
                    </b>
                  </p>
                </Card>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-slate-100 bg-white">
          <div className="flex items-center gap-1.5">
            {PASOS.map((p) => (
              <span
                key={p.n}
                className={`h-1.5 w-8 rounded-full ${
                  step === p.n
                    ? "bg-indigo-600"
                    : step > p.n
                      ? "bg-emerald-400"
                      : "bg-slate-200"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-[13px] text-slate-600 hover:bg-slate-50"
              >
                Atrás
              </button>
            ) : (
              <button
                type="button"
                onClick={cerrar}
                className="rounded-lg border border-slate-300 px-4 py-2 text-[13px] text-slate-600 hover:bg-slate-50"
              >
                Cerrar
              </button>
            )}

            {step >= 2 ? (
              <button
                type="button"
                disabled={guardando || cargando}
                onClick={() => guardar({ activar: false })}
                className="rounded-lg border border-indigo-200 text-indigo-700 px-4 py-2 text-[13px] font-semibold hover:bg-indigo-50 disabled:opacity-50"
              >
                Guardar borrador
              </button>
            ) : null}

            {step === 1 ? (
              <button
                type="button"
                disabled={cargando || !producto}
                onClick={() => setStep(2)}
                className="rounded-lg bg-[#171931] text-white px-5 py-2 text-[13px] font-semibold disabled:opacity-50"
              >
                Configurar el bot
              </button>
            ) : null}

            {step === 2 ? (
              <button
                type="button"
                onClick={() => setStep(3)}
                className="rounded-lg bg-[#171931] text-white px-5 py-2 text-[13px] font-semibold"
              >
                Ver vista previa
              </button>
            ) : null}

            {step === 3 ? (
              <button
                type="button"
                disabled={guardando || !puedeActivar}
                onClick={() => guardar({ activar: true })}
                className="rounded-lg bg-emerald-600 text-white px-5 py-2 text-[13px] font-semibold disabled:opacity-50"
              >
                {guardando
                  ? "Guardando…"
                  : form.wizard_completado
                    ? "Guardar y mantener activo"
                    : "Activar para los clientes"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
