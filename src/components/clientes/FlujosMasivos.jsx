import React, { useState, useEffect, useCallback, useRef } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3500,
  timerProgressBar: true,
});

/* ── Helpers de plantilla ─────────────────────────────────── */

const bodyDe = (tpl) =>
  (tpl?.components || []).find((c) => String(c.type).toUpperCase() === "BODY");
const headerDe = (tpl) =>
  (tpl?.components || []).find(
    (c) => String(c.type).toUpperCase() === "HEADER",
  );

const varsBody = (tpl) => {
  const text = bodyDe(tpl)?.text || "";
  const nums = [...text.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
  return nums.length ? Math.max(...nums) : 0;
};

/* Botones de la plantilla; los "dinámicos" son URL con {{n}} (ej. tracking
   con la guía al final). El backend los llena con los valores que van
   DESPUÉS de los del body en template_parameters, en este mismo orden. */
const botonesTodos = (tpl) => {
  const comp = (tpl?.components || []).find(
    (c) => String(c.type).toUpperCase() === "BUTTONS",
  );
  return Array.isArray(comp?.buttons) ? comp.buttons : [];
};
const botonesVar = (tpl) =>
  botonesTodos(tpl).filter((b) => /\{\{\d+\}\}/.test(b?.url || ""));

/* Encabezado con IMAGEN → el flujo la llena con la FOTO DEL PRODUCTO de cada
   contacto (galería de su orden Dropi → catálogo por ID → nombre exacto). */
const tieneHeaderImagen = (tpl) =>
  String(headerDe(tpl)?.format || "").toUpperCase() === "IMAGE";

/* VIDEO/DOCUMENT no tienen foto por contacto: se manda el ARCHIVO CON QUE SE
   CREÓ la plantilla (example.header_handle), igual para todos. El backend lo
   descarga y lo re-sube (Video API / S3) al programar, porque el handle de
   Meta es efímero. */
const headerFmtDe = (tpl) =>
  String(headerDe(tpl)?.format || "").toUpperCase();
const assetDefaultDe = (tpl) =>
  headerDe(tpl)?.example?.header_handle?.[0] || null;
const tieneHeaderVideoDoc = (tpl) =>
  ["VIDEO", "DOCUMENT"].includes(headerFmtDe(tpl));

/* Soportadas: sin header, header de texto fijo, header de IMAGEN (foto del
   producto por contacto) o VIDEO/DOCUMENTO con adjunto predeterminado.
   Fuera: texto con variables, y video/documento sin archivo de ejemplo. */
const plantillaSoportada = (tpl) => {
  const h = headerDe(tpl);
  if (!h) return true;
  const fmt = String(h.format || "").toUpperCase();
  if (fmt === "IMAGE") return true;
  if (["VIDEO", "DOCUMENT"].includes(fmt)) return !!assetDefaultDe(tpl);
  if (/\{\{\d+\}\}/.test(h.text || "")) return false;
  return true;
};

const motivoNoSoportada = (tpl) => {
  const fmt = headerFmtDe(tpl);
  if (["VIDEO", "DOCUMENT"].includes(fmt))
    return "La plantilla no tiene archivo de ejemplo en el encabezado: Meta no la deja salir sin adjunto";
  return "Encabezado de texto con variables: aún no soportado en flujos";
};

const FUENTE_BADGE = {
  dropi: {
    label: "Orden Dropi",
    cls: "bg-orange-50 text-orange-700 border-orange-200",
  },
  shopify: {
    label: "Orden Shopify",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  /* Sin orden pero con anuncio rastreado: el producto (y su foto/video)
     salen del anuncio por el que entró el contacto. */
  anuncio: {
    label: "Por anuncio",
    cls: "bg-violet-50 text-violet-700 border-violet-200",
  },
  contacto: {
    label: "Solo contacto",
    cls: "bg-slate-50 text-slate-600 border-slate-200",
  },
};

/* Mismos colores por estado que el tab de mensajes programados. */
const BADGE_ESTADO = {
  enviado: "bg-emerald-50 text-emerald-700 border-emerald-200",
  error: "bg-red-50 text-red-700 border-red-200",
  procesando: "bg-blue-50 text-blue-700 border-blue-200",
  cancelado: "bg-slate-100 text-slate-500 border-slate-300 line-through",
  pendiente: "bg-amber-50 text-amber-700 border-amber-200",
};

const HORAS_SIN_RESPUESTA = [
  { value: 0, label: "Nunca respondieron" },
  { value: 12, label: "Sin responder +12 h" },
  { value: 24, label: "Sin responder +24 h" },
  { value: 48, label: "Sin responder +2 días" },
  { value: 72, label: "Sin responder +3 días" },
];

const VENTANAS = [7, 15, 30, 60, 90];

/* Zonas horarias de envío. El backend convierte con Luxon la hora local de
   la zona elegida a UTC, así que "7:00 pm México" sale a las 7 pm de CDMX
   aunque quien programa esté en Ecuador. */
const ZONAS = [
  { tz: "America/Guayaquil", label: "Ecuador" },
  { tz: "America/Bogota", label: "Colombia" },
  { tz: "America/Lima", label: "Perú" },
  { tz: "America/Mexico_City", label: "México (CDMX)" },
  { tz: "America/Guatemala", label: "Guatemala" },
  { tz: "America/Panama", label: "Panamá" },
  { tz: "America/Santiago", label: "Chile" },
  { tz: "America/Argentina/Buenos_Aires", label: "Argentina" },
  { tz: "America/New_York", label: "EE.UU. Este (Nueva York/Miami)" },
  { tz: "America/Chicago", label: "EE.UU. Centro (Chicago/Texas)" },
  { tz: "America/Denver", label: "EE.UU. Montaña (Denver)" },
  { tz: "America/Los_Angeles", label: "EE.UU. Pacífico (Los Ángeles)" },
  { tz: "Europe/Madrid", label: "España (Madrid)" },
];
const zonaDelNavegador = () => {
  try {
    const z = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return ZONAS.some((x) => x.tz === z) ? z : "America/Guayaquil";
  } catch (_) {
    return "America/Guayaquil";
  }
};

const initials = (s) =>
  String(s || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

/* ═══════════════════════════════════════════════════════════
   Tab "Flujos" de /contactos — wizard horizontal a ancho
   completo: 1 Audiencia → 2 Mensaje → 3 Lanzamiento. La
   audiencia se recalcula sola (debounce) al tocar cualquier
   filtro y el stepper de arriba lleva el resumen vivo de los
   tres pasos. Programa por el pipeline masivo de siempre
   (programar_template_masivo + parametros_por_cliente).
   ═══════════════════════════════════════════════════════════ */
export default function FlujosMasivos() {
  const id_configuracion = Number(localStorage.getItem("id_configuracion"));

  const [paso, setPaso] = useState(1);

  // ── Audiencia ──
  const [columnas, setColumnas] = useState([]);
  const [estadosSel, setEstadosSel] = useState([]);
  const [soloSinRespuesta, setSoloSinRespuesta] = useState(true);
  const [horasSinResp, setHorasSinResp] = useState(24);
  const [diasVentana, setDiasVentana] = useState(30);
  const [audiencia, setAudiencia] = useState(null);
  const [calculando, setCalculando] = useState(false);
  const reqSeq = useRef(0);

  // ── Mensaje ──
  const [templates, setTemplates] = useState([]);
  const [loadingTpl, setLoadingTpl] = useState(false);
  const [tplSel, setTplSel] = useState(null);
  const [buscaTpl, setBuscaTpl] = useState("");
  const [tplOpen, setTplOpen] = useState(false);
  const [mapeo, setMapeo] = useState([]);
  const [excluirIncompletos, setExcluirIncompletos] = useState(false);
  /* Header IMAGE o VIDEO: "producto" = la foto/video del producto de cada
     contacto (catálogo); "plantilla" = el archivo con que se creó la
     plantilla, igual para todos. Con "producto", quien no tenga cae al de
     la plantilla (si la plantilla trae adjunto de ejemplo). */
  const [mediaOrigen, setMediaOrigen] = useState("producto");
  const [previewIdx, setPreviewIdx] = useState(0);
  const tplBoxRef = useRef(null);

  // ── Lanzamiento ──
  const [fecha, setFecha] = useState("");
  const [zona, setZona] = useState(zonaDelNavegador);
  const [programando, setProgramando] = useState(false);
  /* A qué columna del kanban pasa cada contacto DESPUÉS de que su mensaje
     sale con éxito ("" = se queda donde está — el envío nunca movía de
     columna y nadie lo sabía). Lo ejecuta el cron contacto por contacto;
     los fallidos no se mueven, para poder reintentarles el flujo. */
  const [estadoDestino, setEstadoDestino] = useState("");

  // ── Resultados ──
  const [lotes, setLotes] = useState([]);
  const [loadingLotes, setLoadingLotes] = useState(false);
  /* Detalle por lote: a QUIÉN le llegó y a quién no, con el error de Meta
     por contacto — el mismo feedback del tab de mensajes programados. Al
     abrir un lote con errores se muestran solo los errores (lo que se busca
     es "¿en qué chat falló?"); "Ver todos" abre la lista completa. */
  const [loteAbierto, setLoteAbierto] = useState(null);
  const [verTodosDelLote, setVerTodosDelLote] = useState(false);

  /* ── Cargas iniciales ── */
  useEffect(() => {
    if (!id_configuracion) return;
    chatApi
      .post("/kanban_columnas/listar", { id_configuracion })
      .then(({ data }) =>
        setColumnas(Array.isArray(data?.data) ? data.data : []),
      )
      .catch(() => setColumnas([]));
  }, [id_configuracion]);

  useEffect(() => {
    if (!id_configuracion) return;
    setLoadingTpl(true);
    chatApi
      .post("/whatsapp_managment/obtenerTemplatesWhatsapp", {
        id_configuracion,
        limit: 100,
      })
      .then(({ data }) => {
        const arr = Array.isArray(data?.templates)
          ? data.templates
          : Array.isArray(data?.data)
            ? data.data
            : [];
        setTemplates(
          arr.filter(
            (t) => String(t.status || "").toUpperCase() === "APPROVED",
          ),
        );
      })
      .catch(() => setTemplates([]))
      .finally(() => setLoadingTpl(false));
  }, [id_configuracion]);

  /* ── Audiencia EN VIVO ── */
  useEffect(() => {
    if (!id_configuracion) return;
    if (!estadosSel.length) {
      setAudiencia(null);
      return;
    }
    setCalculando(true);
    const seq = ++reqSeq.current;
    const timer = setTimeout(async () => {
      try {
        const { data } = await chatApi.post(
          "/whatsapp_managment/flujos_audiencia",
          {
            id_configuracion,
            estados: estadosSel,
            dias_atras: diasVentana,
            solo_sin_respuesta: soloSinRespuesta,
            horas_sin_respuesta: horasSinResp,
            limite: 2000,
          },
        );
        if (seq !== reqSeq.current) return;
        if (data?.ok) setAudiencia(data);
        else setAudiencia(null);
        setPreviewIdx(0);
      } catch (_) {
        if (seq === reqSeq.current) setAudiencia(null);
      } finally {
        if (seq === reqSeq.current) setCalculando(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [
    id_configuracion,
    estadosSel,
    soloSinRespuesta,
    horasSinResp,
    diasVentana,
  ]);

  const fetchLotes = useCallback(async () => {
    if (!id_configuracion) return;
    setLoadingLotes(true);
    try {
      const { data } = await chatApi.get(
        "/whatsapp_managment/programados_por_config",
        { params: { id_configuracion, page: 1, limit: 10 } },
      );
      const items = Array.isArray(data?.data) ? data.data : [];
      const porLote = new Map();
      for (const it of items) {
        if (!porLote.has(it.uuid_lote)) {
          porLote.set(it.uuid_lote, {
            uuid_lote: it.uuid_lote,
            nombre_template: it.nombre_template,
            fecha_programada: it.fecha_programada,
            total: 0,
            estados: {},
            items: [],
          });
        }
        const l = porLote.get(it.uuid_lote);
        l.total += 1;
        l.items.push(it);
        const e = String(it.estado || "pendiente");
        l.estados[e] = (l.estados[e] || 0) + 1;
      }
      setLotes([...porLote.values()]);
    } catch (_) {
      setLotes([]);
    } finally {
      setLoadingLotes(false);
    }
  }, [id_configuracion]);

  useEffect(() => {
    fetchLotes();
  }, [fetchLotes]);

  useEffect(() => {
    if (!tplOpen) return;
    const fuera = (e) => {
      if (tplBoxRef.current && !tplBoxRef.current.contains(e.target))
        setTplOpen(false);
    };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [tplOpen]);

  const toggleEstado = (estado) =>
    setEstadosSel((prev) =>
      prev.includes(estado)
        ? prev.filter((e) => e !== estado)
        : [...prev, estado],
    );

  /* ── Mensaje ── */
  const elegirTpl = (tpl) => {
    setTplSel(tpl);
    setTplOpen(false);
    setBuscaTpl("");
    // Foto: lo natural es la del producto de cada orden; video: el de la
    // plantilla (pocos catálogos tienen video por producto).
    setMediaOrigen(tieneHeaderImagen(tpl) ? "producto" : "plantilla");
    const n = varsBody(tpl);
    // En flujos de retiro en agencia lo típico es {{1}} lugar y {{2}} guía;
    // en el resto, nombre/producto/total. Solo defaults: se cambian a un clic.
    const retiro = estadosSel.some((e) => /retiro/i.test(e));
    const defaults = retiro
      ? ["lugar_retiro", "numero_guia", "transportadora"]
      : ["nombre", "producto", "total"];
    const body = Array.from({ length: n }, (_, i) => ({
      tipo: "variable",
      valor: defaults[i] || "",
      esBoton: false,
      etiqueta: `{{${i + 1}}}`,
    }));
    // Botón URL dinámico: casi siempre es tracking → guía por defecto.
    const botones = botonesVar(tpl).map((b) => ({
      tipo: "variable",
      valor: "numero_guia",
      esBoton: true,
      etiqueta: b.text || "Botón URL",
    }));
    setMapeo([...body, ...botones]);
  };

  const valorPara = (contacto, m) => {
    if (!m) return "";
    if (m.tipo === "fijo") return m.valor || "";
    return contacto?.valores?.[m.valor] || "";
  };

  const requiereImagen = tplSel ? tieneHeaderImagen(tplSel) : false;

  /* VIDEO/DOCUMENT: el archivo de la plantilla para el lote; con VIDEO el
     usuario puede preferir el video del producto de cada contacto. */
  const headerVideoDoc =
    tplSel && tieneHeaderVideoDoc(tplSel)
      ? { format: headerFmtDe(tplSel), url: assetDefaultDe(tplSel) }
      : null;

  /* La imagen/video de ejemplo con que se creó la plantilla: sirve de
     "igual para todos" y de respaldo para el contacto sin foto/video. */
  const assetPlantilla = tplSel ? assetDefaultDe(tplSel) : null;

  const conVideoProducto = (audiencia?.data || []).filter(
    (c) => c.video_producto,
  ).length;
  const conFotoProducto = (audiencia?.data || []).filter(
    (c) => c.imagen_producto,
  ).length;
  const productosConVideo = audiencia?.catalogo?.productos_con_video || 0;

  /* El contacto SIN foto identificada queda fuera SOLO si no hay respaldo:
     Meta no acepta la plantilla sin imagen, y mandar la foto de OTRO
     producto es peor que no enviar. Si la plantilla trae su imagen de
     ejemplo, ese contacto la recibe y nadie queda fuera. */
  const usaFotoProducto = requiereImagen && mediaOrigen === "producto";
  const excluyeSinFoto = usaFotoProducto && !assetPlantilla;

  const contactosLote = () => {
    let todos = audiencia?.data || [];
    if (excluyeSinFoto) todos = todos.filter((c) => c.imagen_producto);
    if (!excluirIncompletos || !mapeo.length) return todos;
    return todos.filter((c) => mapeo.every((m) => valorPara(c, m)));
  };

  const sinFoto = requiereImagen
    ? (audiencia?.data || []).filter((c) => !c.imagen_producto).length
    : 0;

  const incompletos = mapeo.length
    ? (audiencia?.data || []).filter(
        (c) => !mapeo.every((m) => valorPara(c, m)),
      ).length
    : 0;

  const previewBodyPara = (contacto) => {
    let text = bodyDe(tplSel)?.text || "";
    mapeo.forEach((m, i) => {
      const v = contacto ? valorPara(contacto, m) : "";
      text = text.replaceAll(`{{${i + 1}}}`, v || `{{${i + 1}}}`);
    });
    return text;
  };

  const fuentes = { dropi: 0, shopify: 0, anuncio: 0, contacto: 0 };
  for (const c of audiencia?.data || [])
    fuentes[c.fuente] = (fuentes[c.fuente] || 0) + 1;

  const loteN = contactosLote().length;
  const mapeoListo =
    !!tplSel && !mapeo.some((m) => m.tipo === "variable" && !m.valor);
  const paso1Listo = (audiencia?.total || 0) > 0;
  const paso2Listo = paso1Listo && mapeoListo;
  const listoParaLanzar = paso2Listo && loteN > 0 && !!fecha;

  /* ── Programar ── */
  const programar = async () => {
    const lote = contactosLote();
    if (!listoParaLanzar) return;

    const ok = await Swal.fire({
      icon: "question",
      title: `¿Programar ${lote.length} envío${lote.length === 1 ? "" : "s"}?`,
      html:
        `Plantilla <b>${tplSel.name}</b> para <b>${lote.length}</b> contacto(s), ` +
        `cada uno con sus propios datos.` +
        (excluirIncompletos && incompletos
          ? `<br/><span style="color:#92400e">Se excluyen ${incompletos} sin datos completos.</span>`
          : "") +
        `<br/>Salida: <b>${fecha.replace("T", " ")}</b> (hora de ${
          ZONAS.find((z) => z.tz === zona)?.label || zona
        })` +
        (estadoDestino
          ? `<br/>Al enviarse, cada contacto pasa a <b>${
              columnas.find((c) => c.estado_db === estadoDestino)?.nombre ||
              estadoDestino
            }</b>`
          : `<br/>Los contactos se quedan en su columna actual`),
      showCancelButton: true,
      confirmButtonText: "Programar flujo",
      cancelButtonText: "Volver",
      confirmButtonColor: "#171931",
    });
    if (!ok.isConfirmed) return;

    const parametros_por_cliente = {};
    for (const c of lote) {
      parametros_por_cliente[String(c.id)] = mapeo.map((m) => valorPara(c, m));
    }

    setProgramando(true);
    try {
      const { data } = await chatApi.post(
        "/whatsapp_managment/programar_template_masivo",
        {
          id_configuracion,
          id_usuario: Number(localStorage.getItem("id_usuario")) || null,
          selected: lote.map((c) => c.id),
          nombre_template: tplSel.name,
          language_code: tplSel.language || "es",
          template_parameters: mapeo.map(() => "-"),
          parametros_por_cliente,
          /* Encabezado de IMAGEN: con "producto" va la foto de CADA contacto
             (header_media_por_cliente) y la imagen de ejemplo de la
             plantilla queda de respaldo global para quien no tenga; con
             "plantilla" solo va la de ejemplo, igual para todos. El backend
             descarga el ejemplo y lo re-sube a S3 (el handle de Meta
             caduca). */
          ...(requiereImagen
            ? {
                header_format: "IMAGE",
                ...(assetPlantilla
                  ? {
                      header_default_asset: {
                        enabled: true,
                        format: "IMAGE",
                        url: assetPlantilla,
                        source: "template_example",
                        name: "Adjunto predeterminado del template",
                      },
                    }
                  : {}),
                ...(mediaOrigen === "producto"
                  ? {
                      header_media_por_cliente: Object.fromEntries(
                        lote
                          .filter((c) => c.imagen_producto)
                          .map((c) => [String(c.id), c.imagen_producto]),
                      ),
                    }
                  : {}),
              }
            : {}),
          /* VIDEO/DOCUMENT: igual — ejemplo de la plantilla como global (vía
             Video API para video) y, con "video del producto", el de cada
             contacto que lo tenga en el catálogo. */
          ...(headerVideoDoc
            ? {
                header_format: headerVideoDoc.format,
                header_default_asset: {
                  enabled: true,
                  format: headerVideoDoc.format,
                  url: headerVideoDoc.url,
                  source: "template_example",
                  name: "Adjunto predeterminado del template",
                },
                ...(headerVideoDoc.format === "VIDEO" &&
                mediaOrigen === "producto"
                  ? {
                      header_media_por_cliente: Object.fromEntries(
                        lote
                          .filter((c) => c.video_producto)
                          .map((c) => [String(c.id), c.video_producto]),
                      ),
                    }
                  : {}),
              }
            : {}),
          fecha_programada: fecha.replace("T", " ") + ":00",
          timezone: zona,
          meta: {
            origen: "flujos_masivos",
            ...(estadoDestino ? { estado_destino: estadoDestino } : {}),
          },
        },
        // Con video, programar incluye descargar + convertir + subir.
        { timeout: 300000 },
      );
      if (data?.ok !== false) {
        Toast.fire({ icon: "success", title: "Flujo programado 🚀" });
        setTplSel(null);
        setMapeo([]);
        setFecha("");
        setEstadoDestino("");
        setPaso(1);
        fetchLotes();
      } else {
        Toast.fire({
          icon: "error",
          title: data?.msg || "No se pudo programar",
        });
      }
    } catch (e) {
      Toast.fire({
        icon: "error",
        title: e?.response?.data?.msg || "Error programando el flujo",
      });
    } finally {
      setProgramando(false);
    }
  };

  const cancelarLote = async (uuid_lote) => {
    const ok = await Swal.fire({
      icon: "warning",
      title: "¿Cancelar los envíos pendientes de este lote?",
      showCancelButton: true,
      confirmButtonText: "Sí, cancelar",
      cancelButtonText: "Volver",
      confirmButtonColor: "#e11d48",
    });
    if (!ok.isConfirmed) return;
    try {
      await chatApi.delete("/whatsapp_managment/programados_cancelar_lote", {
        data: { uuid_lote, id_configuracion },
      });
      Toast.fire({ icon: "success", title: "Lote cancelado" });
      fetchLotes();
    } catch (e) {
      Toast.fire({
        icon: "error",
        title: e?.response?.data?.msg || "No se pudo cancelar",
      });
    }
  };

  /* ── Stepper ── */
  const pasos = [
    {
      n: 1,
      titulo: "Audiencia",
      icono: "bx-group",
      listo: paso1Listo,
      resumen: paso1Listo
        ? `${audiencia.total} contacto${audiencia.total === 1 ? "" : "s"}`
        : "¿A quién le llega?",
      accesible: true,
    },
    {
      n: 2,
      titulo: "Mensaje",
      icono: "bx-message-square-detail",
      listo: paso2Listo,
      resumen: tplSel ? tplSel.name : "¿Qué se envía?",
      accesible: paso1Listo,
    },
    {
      n: 3,
      titulo: "Lanzamiento",
      icono: "bx-rocket",
      listo: listoParaLanzar,
      resumen: fecha ? fecha.replace("T", " · ") : "¿Cuándo sale?",
      accesible: paso2Listo,
    },
  ];

  const tplFiltradas = (
    buscaTpl.trim()
      ? templates.filter((t) =>
          String(t.name)
            .toLowerCase()
            .includes(buscaTpl.trim().toLowerCase()),
        )
      : templates
  ).slice(0, 200);

  const lote = contactosLote();
  const contactoPreview = lote[Math.min(previewIdx, lote.length - 1)] || null;

  /* Flujo hacia contactos en retiro en agencia: la "dirección" de la orden
     muchas veces es el DOMICILIO (Servientrega desvía a agencia sin
     actualizarla) — para eso existe la variable lugar_retiro. */
  const esFlujoRetiro = estadosSel.some((e) => /retiro/i.test(e));
  const mapeaDireccionEnRetiro =
    esFlujoRetiro && mapeo.some((m) => m.tipo === "variable" && m.valor === "direccion");

  const abrirChat = (idCliente) => {
    if (!idCliente) return;
    window.open(`/chat/${idCliente}`, "_blank", "noopener,noreferrer");
  };

  /* Cajas del encabezado multimedia del paso 2 (se usan igual con y sin
     variables de texto): qué imagen/video sale, en lenguaje del catálogo. */
  const bloqueVideoDoc = headerVideoDoc && (
    <div className="rounded-xl border border-sky-200 bg-sky-50 p-2.5 text-[11px] leading-relaxed text-sky-800">
      <div className="flex items-start gap-1.5">
        <i
          className={`bx ${headerVideoDoc.format === "VIDEO" ? "bx-video" : "bx-file"} mt-0.5`}
        />
        <span>
          <b>
            Esta plantilla lleva{" "}
            {headerVideoDoc.format === "VIDEO" ? "video" : "documento"} en el
            encabezado.
          </b>{" "}
          {headerVideoDoc.format === "DOCUMENT"
            ? "Se envía el documento con que fue creada — el mismo para todos."
            : "¿Cuál video se envía?"}
        </span>
      </div>
      {headerVideoDoc.format === "VIDEO" && (
        <div className="mt-2 flex flex-col gap-1.5 pl-5">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="media_origen"
              checked={mediaOrigen === "plantilla"}
              onChange={() => setMediaOrigen("plantilla")}
              className="h-3.5 w-3.5"
            />
            El video de la plantilla — el mismo para todos
          </label>
          <label
            className={`flex items-start gap-2 ${
              productosConVideo === 0 ? "opacity-60" : ""
            }`}
          >
            <input
              type="radio"
              name="media_origen"
              disabled={productosConVideo === 0}
              checked={mediaOrigen === "producto"}
              onChange={() => setMediaOrigen("producto")}
              className="mt-0.5 h-3.5 w-3.5"
            />
            <span>
              El video del producto de cada contacto.
              {productosConVideo === 0 ? (
                <span className="block text-sky-700/80">
                  Ningún producto de tu catálogo tiene video todavía —
                  cárgalo en tus productos para activar esta opción.
                </span>
              ) : (
                <span className="block text-sky-700/80">
                  {productosConVideo} producto
                  {productosConVideo === 1 ? "" : "s"} de tu catálogo{" "}
                  {productosConVideo === 1 ? "tiene" : "tienen"} video:{" "}
                  {conVideoProducto} contacto
                  {conVideoProducto === 1 ? "" : "s"} de este flujo{" "}
                  {conVideoProducto === 1 ? "recibiría" : "recibirían"} el de
                  su producto; los demás, el de la plantilla.
                </span>
              )}
            </span>
          </label>
        </div>
      )}
    </div>
  );

  const bloqueImagen =
    requiereImagen &&
    (assetPlantilla ? (
      <div className="rounded-xl border border-sky-200 bg-sky-50 p-2.5 text-[11px] leading-relaxed text-sky-800">
        <div className="flex items-start gap-1.5">
          <i className="bx bx-image mt-0.5" />
          <span>
            <b>Esta plantilla lleva imagen en el encabezado.</b> ¿Cuál foto
            se envía?
          </span>
        </div>
        <div className="mt-2 flex flex-col gap-1.5 pl-5">
          <label className="flex items-start gap-2">
            <input
              type="radio"
              name="media_origen"
              checked={mediaOrigen === "producto"}
              onChange={() => setMediaOrigen("producto")}
              className="mt-0.5 h-3.5 w-3.5"
            />
            <span>
              La foto del producto de cada contacto (tu catálogo; si no está,
              la de su orden).
              <span className="block text-sky-700/80">
                {conFotoProducto} de {audiencia?.total || 0} contacto
                {(audiencia?.total || 0) === 1 ? "" : "s"}{" "}
                {conFotoProducto === 1 ? "tiene" : "tienen"} foto de su
                producto identificada
                {sinFoto > 0
                  ? `; los ${sinFoto} restantes reciben la imagen de la plantilla`
                  : ""}
                .
              </span>
            </span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="media_origen"
              checked={mediaOrigen === "plantilla"}
              onChange={() => setMediaOrigen("plantilla")}
              className="h-3.5 w-3.5"
            />
            La imagen de la plantilla — la misma para todos
          </label>
        </div>
      </div>
    ) : (
      /* Sin imagen de ejemplo no hay respaldo posible: se mantiene la regla
         de siempre — foto del producto, y quien no tenga queda fuera. */
      <div className="flex items-start gap-1.5 rounded-xl border border-sky-200 bg-sky-50 p-2.5 text-[11px] leading-relaxed text-sky-800">
        <i className="bx bx-image mt-0.5" />
        <span>
          <b>
            Esta plantilla lleva la foto del producto de cada contacto
          </b>{" "}
          (la imagen de tu catálogo — por ID de Dropi o nombre — y si no
          está, la foto de la orden).
          {sinFoto > 0 && (
            <>
              {" "}
              <b className="text-amber-700">
                {sinFoto} contacto{sinFoto === 1 ? "" : "s"} sin foto
                identificada quedan fuera del flujo
              </b>{" "}
              — la plantilla no puede salir sin imagen y jamás se manda la
              foto de otro producto.
            </>
          )}
        </span>
      </div>
    ));

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* ══ Stepper horizontal con resumen vivo ══ */}
      <div className="grid grid-cols-3 gap-2">
        {pasos.map((p) => {
          const activo = paso === p.n;
          return (
            <button
              key={p.n}
              type="button"
              disabled={!p.accesible}
              onClick={() => p.accesible && setPaso(p.n)}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                activo
                  ? "border-[#171931] bg-[#171931] text-white shadow-md"
                  : p.accesible
                    ? "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base ${
                  activo
                    ? "bg-white/15"
                    : p.listo
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                {p.listo && !activo ? (
                  <i className="bx bx-check" />
                ) : (
                  <i className={`bx ${p.icono}`} />
                )}
              </span>
              <span className="min-w-0">
                <span
                  className={`block text-[10px] font-bold uppercase tracking-wide ${
                    activo ? "text-white/60" : "text-slate-400"
                  }`}
                >
                  Paso {p.n} · {p.titulo}
                </span>
                <span className="block truncate text-sm font-semibold">
                  {p.n === 1 && calculando ? (
                    <>
                      <i className="bx bx-loader-alt bx-spin" /> calculando…
                    </>
                  ) : (
                    p.resumen
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* ══ PASO 1 · AUDIENCIA ══ */}
      {paso === 1 && (
        <div className="grid items-start gap-4 lg:grid-cols-12">
          {/* Filtros */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-5">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              1. Elige columnas del kanban
            </p>
            <div className="mb-5 flex flex-wrap gap-2">
              {columnas.map((col) => (
                <button
                  key={col.estado_db || col.id}
                  type="button"
                  onClick={() => toggleEstado(col.estado_db)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    estadosSel.includes(col.estado_db)
                      ? "border-[#171931] bg-[#171931] text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {col.nombre || col.estado_db}
                </button>
              ))}
              {!columnas.length && (
                <span className="text-xs text-slate-400">
                  Cargando columnas…
                </span>
              )}
            </div>

            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              2. Filtra por respuesta
            </p>
            <div className="mb-5 flex flex-wrap items-center gap-2 text-xs">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={soloSinRespuesta}
                  onChange={(e) => setSoloSinRespuesta(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Solo los que no han respondido
              </label>
              {soloSinRespuesta && (
                <select
                  value={horasSinResp}
                  onChange={(e) => setHorasSinResp(Number(e.target.value))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                >
                  {HORAS_SIN_RESPUESTA.map((h) => (
                    <option key={h.value} value={h.value}>
                      {h.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              3. Ventana de actividad
            </p>
            <div className="flex flex-wrap gap-2">
              {VENTANAS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDiasVentana(d)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    diasVentana === d
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {d} días
                </button>
              ))}
            </div>

            <p className="mt-4 flex items-start gap-1.5 text-[11px] text-slate-400">
              <i className="bx bx-info-circle mt-0.5" />
              Los datos de cada contacto (nombre, producto, total, guía…) se
              toman solos de su orden en Dropi o Shopify — y si aún no tiene
              orden, del anuncio por el que entró. No tienes que escribir
              nada.
            </p>
          </div>

          {/* Resultado en vivo */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-7">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
              {!estadosSel.length ? (
                <span className="text-sm font-semibold text-slate-400">
                  La audiencia aparece aquí al elegir columnas
                </span>
              ) : (
                <>
                  <span className="text-2xl font-extrabold text-[#171931]">
                    {calculando ? (
                      <i className="bx bx-loader-alt bx-spin text-lg" />
                    ) : (
                      (audiencia?.total ?? 0)
                    )}
                  </span>
                  <span className="text-xs text-slate-500">
                    contacto{(audiencia?.total ?? 0) === 1 ? "" : "s"}
                  </span>
                  <div className="ml-2 flex flex-wrap gap-1.5 text-[10px] font-semibold">
                    {fuentes.dropi > 0 && (
                      <span className={`rounded-full border px-2 py-0.5 ${FUENTE_BADGE.dropi.cls}`}>
                        {fuentes.dropi} orden Dropi
                      </span>
                    )}
                    {fuentes.shopify > 0 && (
                      <span className={`rounded-full border px-2 py-0.5 ${FUENTE_BADGE.shopify.cls}`}>
                        {fuentes.shopify} orden Shopify
                      </span>
                    )}
                    {fuentes.anuncio > 0 && (
                      <span className={`rounded-full border px-2 py-0.5 ${FUENTE_BADGE.anuncio.cls}`}>
                        {fuentes.anuncio} por anuncio
                      </span>
                    )}
                    {fuentes.contacto > 0 && (
                      <span className={`rounded-full border px-2 py-0.5 ${FUENTE_BADGE.contacto.cls}`}>
                        {fuentes.contacto} solo contacto
                      </span>
                    )}
                  </div>
                  <span className="ml-auto flex items-center gap-1 text-[10px] text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    en vivo
                  </span>
                </>
              )}
            </div>

            {!estadosSel.length ? (
              <div className="flex flex-col items-center justify-center gap-2 p-12 text-center text-slate-300">
                <i className="bx bx-group text-5xl" />
                <p className="text-xs text-slate-400">
                  Toca una columna a la izquierda: el conteo y la lista se
                  actualizan solos con cada filtro.
                </p>
              </div>
            ) : (
              <div className="max-h-[420px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-2">Contacto</th>
                      <th className="px-4 py-2">Datos desde</th>
                      <th className="px-4 py-2">Producto</th>
                      <th className="px-4 py-2">Total</th>
                      {esFlujoRetiro ? (
                        <th className="px-4 py-2">Lugar de retiro</th>
                      ) : (
                        <th className="px-4 py-2">Ciudad</th>
                      )}
                      <th className="px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(audiencia?.data || []).slice(0, 200).map((c) => {
                      const b =
                        FUENTE_BADGE[c.fuente] || FUENTE_BADGE.contacto;
                      return (
                        <tr key={c.id} className="border-t border-slate-100">
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                                {initials(c.nombre)}
                              </span>
                              <div className="min-w-0">
                                <div className="truncate font-semibold text-slate-800">
                                  {c.nombre}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {c.telefono}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${b.cls}`}
                            >
                              {b.label}
                            </span>
                          </td>
                          <td className="max-w-[200px] truncate px-4 py-2 text-slate-600">
                            {c.valores?.producto || "—"}
                          </td>
                          <td className="px-4 py-2 text-slate-600">
                            {c.valores?.total ? `$${c.valores.total}` : "—"}
                          </td>
                          {esFlujoRetiro ? (
                            <td className="max-w-[220px] px-4 py-2">
                              {c.valores?.lugar_retiro ? (
                                <span
                                  className="block truncate text-slate-600"
                                  title={c.valores.lugar_retiro}
                                >
                                  {c.valores.lugar_retiro}
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          ) : (
                            <td className="px-4 py-2 text-slate-600">
                              {c.valores?.ciudad || "—"}
                            </td>
                          )}
                          <td className="px-2 py-2">
                            <button
                              type="button"
                              onClick={() => abrirChat(c.id)}
                              title="Abrir chat del cliente"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                            >
                              <i className="bx bxs-chat text-sm" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {audiencia && !audiencia.data.length && !calculando && (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Nadie cumple estos filtros. Amplía la ventana o quita el
                    filtro de respuesta.
                  </div>
                )}
                {audiencia && audiencia.data.length > 200 && (
                  <div className="border-t border-slate-100 px-4 py-2 text-center text-[11px] text-slate-400">
                    Mostrando 200 de {audiencia.data.length} — todos entran al
                    flujo.
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end border-t border-slate-100 px-5 py-3">
              <button
                type="button"
                disabled={!paso1Listo}
                onClick={() => setPaso(2)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#171931] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-40"
              >
                Continuar al mensaje
                <i className="bx bx-right-arrow-alt text-lg" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ PASO 2 · MENSAJE ══ */}
      {paso === 2 && (
        <div className="grid items-start gap-4 lg:grid-cols-12">
          {/* Plantilla + mapeo */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-6">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              1. Plantilla aprobada por Meta
            </p>
            <div ref={tplBoxRef} className="relative mb-4">
              <button
                type="button"
                onClick={() => setTplOpen((o) => !o)}
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm hover:border-slate-300"
              >
                <span className={tplSel ? "text-slate-800" : "text-slate-400"}>
                  {tplSel ? tplSel.name : "Selecciona la plantilla…"}
                </span>
                <i
                  className={`bx bx-chevron-${tplOpen ? "up" : "down"} text-slate-500`}
                />
              </button>
              {tplOpen && (
                <div className="absolute left-0 right-0 z-40 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                  <div className="border-b border-slate-100 p-2">
                    <input
                      autoFocus
                      value={buscaTpl}
                      onChange={(e) => setBuscaTpl(e.target.value)}
                      placeholder={`Buscar entre ${templates.length} plantillas…`}
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-slate-400"
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {loadingTpl && (
                      <div className="p-3 text-center text-xs text-slate-400">
                        Cargando plantillas…
                      </div>
                    )}
                    {tplFiltradas.map((t) => {
                      const soportada = plantillaSoportada(t);
                      return (
                        <button
                          key={t.id || t.name}
                          type="button"
                          disabled={!soportada}
                          onClick={() => elegirTpl(t)}
                          className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs ${
                            soportada
                              ? "text-slate-800 hover:bg-slate-50"
                              : "cursor-not-allowed text-slate-300"
                          }`}
                          title={soportada ? "" : motivoNoSoportada(t)}
                        >
                          <span className="truncate">{t.name}</span>
                          <span className="shrink-0 text-[10px] text-slate-400">
                            {varsBody(t)} var{varsBody(t) === 1 ? "" : "s"}
                            {botonesVar(t).length
                              ? ` + ${botonesVar(t).length} botón`
                              : ""}
                            {tieneHeaderImagen(t)
                              ? " · 📷 foto"
                              : headerFmtDe(t) === "VIDEO"
                                ? " · 🎬 video"
                                : headerFmtDe(t) === "DOCUMENT"
                                  ? " · 📄 doc"
                                  : ""}
                          </span>
                        </button>
                      );
                    })}
                    {!loadingTpl && !tplFiltradas.length && (
                      <div className="p-3 text-center text-xs text-slate-400">
                        Sin coincidencias
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {tplSel &&
              (mapeo.length ? (
                <>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    2. Con qué dato se llena cada variable
                  </p>
                  <div className="flex flex-col gap-2.5">
                    {mapeo.map((m, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        {m.esBoton ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded bg-sky-50 px-2 py-1 font-bold text-sky-700">
                            <i className="bx bx-link" />
                            {m.etiqueta}
                          </span>
                        ) : (
                          <code className="shrink-0 rounded bg-indigo-50 px-2 py-1 font-bold text-indigo-700">
                            {m.etiqueta}
                          </code>
                        )}
                        <select
                          value={m.tipo === "fijo" ? "__fijo__" : m.valor}
                          onChange={(e) => {
                            const v = e.target.value;
                            setMapeo((prev) =>
                              prev.map((x, idx) =>
                                idx === i
                                  ? v === "__fijo__"
                                    ? { tipo: "fijo", valor: "" }
                                    : { tipo: "variable", valor: v }
                                  : x,
                              ),
                            );
                          }}
                          className={`rounded-xl border bg-white px-2.5 py-2 ${
                            m.tipo === "variable" && !m.valor
                              ? "border-amber-300"
                              : "border-slate-200"
                          } ${m.tipo === "fijo" ? "w-40" : "flex-1"}`}
                        >
                          <option value="">— elegir dato —</option>
                          {(audiencia?.variables || []).map((v) => (
                            <option key={v.key} value={v.key}>
                              {v.key === "direccion" && esFlujoRetiro
                                ? `${v.label} — ⚠ puede ser el domicilio`
                                : v.label}
                            </option>
                          ))}
                          <option value="__fijo__">Texto fijo…</option>
                        </select>
                        {m.tipo === "fijo" && (
                          <input
                            value={m.valor}
                            onChange={(e) =>
                              setMapeo((prev) =>
                                prev.map((x, idx) =>
                                  idx === i
                                    ? { ...x, valor: e.target.value }
                                    : x,
                                ),
                              )
                            }
                            placeholder="Texto igual para todos"
                            className="flex-1 rounded-xl border border-slate-200 px-2.5 py-2"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  {bloqueImagen && <div className="mt-3">{bloqueImagen}</div>}

                  {bloqueVideoDoc && (
                    <div className="mt-3">{bloqueVideoDoc}</div>
                  )}

                  {/* Aviso SIEMPRE visible en flujos de retiro: ámbar con
                      arreglo a un clic si mapearon Dirección; informativo
                      si ya están usando Lugar de retiro. */}
                  {esFlujoRetiro &&
                    (mapeaDireccionEnRetiro ? (
                      <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800">
                        <p>
                          <i className="bx bx-error" />{" "}
                          <b>Ojo: mapeaste “Dirección” y este flujo va a
                          retiro en agencia.</b>{" "}
                          Esa dirección muchas veces es el domicilio del
                          cliente (Servientrega desvía a agencia sin
                          actualizarla) — le dirías “retira en tu propia
                          casa”.
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            setMapeo((prev) =>
                              prev.map((x) =>
                                x.tipo === "variable" &&
                                x.valor === "direccion"
                                  ? { ...x, valor: "lugar_retiro" }
                                  : x,
                              ),
                            )
                          }
                          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 font-bold text-white hover:bg-amber-700"
                        >
                          <i className="bx bx-shield-quarter" />
                          Cambiar a “Lugar de retiro (agencia)”
                        </button>
                      </div>
                    ) : (
                      <p className="mt-3 flex items-start gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-[11px] leading-relaxed text-emerald-800">
                        <i className="bx bx-check-shield mt-0.5" />
                        <span>
                          Flujo de retiro en agencia: usa{" "}
                          <b>“Lugar de retiro (agencia Servientrega)”</b> para
                          decir dónde retirar — trae la agencia real (o
                          “agencia de Servientrega en su ciudad”), nunca el
                          domicilio. En la tabla de la audiencia ves el valor
                          exacto por contacto.
                        </span>
                      </p>
                    ))}
                  {incompletos > 0 && (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600">
                      <p className="mb-1.5 font-semibold text-slate-700">
                        <i className="bx bx-info-circle text-indigo-500" /> A{" "}
                        {incompletos} contacto{incompletos === 1 ? "" : "s"}{" "}
                        le{incompletos === 1 ? "" : "s"} falta alguno de los
                        datos elegidos (ej. todavía sin guía). ¿Qué hacemos
                        con ello{incompletos === 1 ? "" : "s"}?
                      </p>
                      <label className="flex items-center gap-2 py-0.5">
                        <input
                          type="radio"
                          name="incompletos"
                          checked={excluirIncompletos}
                          onChange={() => setExcluirIncompletos(true)}
                          className="h-3.5 w-3.5 border-slate-300"
                        />
                        No enviarles nada (recomendado)
                      </label>
                      <label className="flex items-center gap-2 py-0.5">
                        <input
                          type="radio"
                          name="incompletos"
                          checked={!excluirIncompletos}
                          onChange={() => setExcluirIncompletos(false)}
                          className="h-3.5 w-3.5 border-slate-300"
                        />
                        Enviarles igual — donde falte el dato saldrá “-”
                      </label>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-slate-500">
                    Esta plantilla no tiene variables de texto
                    {requiereImagen
                      ? ": solo cambia la foto por contacto."
                      : ": se envía igual para todos."}
                  </p>
                  {bloqueVideoDoc}
                  {bloqueImagen}
                </div>
              ))}
          </div>

          {/* Vista previa navegable */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-6">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <span className="text-sm font-semibold text-slate-800">
                Así le llega a cada uno
              </span>
              {contactoPreview && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewIdx((i) => Math.max(0, i - 1))
                    }
                    disabled={previewIdx === 0}
                    className="rounded-lg border border-slate-200 px-1.5 py-0.5 hover:bg-slate-50 disabled:opacity-30"
                  >
                    <i className="bx bx-chevron-left" />
                  </button>
                  <span className="font-semibold">
                    {Math.min(previewIdx + 1, lote.length)} / {lote.length}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewIdx((i) => Math.min(lote.length - 1, i + 1))
                    }
                    disabled={previewIdx >= lote.length - 1}
                    className="rounded-lg border border-slate-200 px-1.5 py-0.5 hover:bg-slate-50 disabled:opacity-30"
                  >
                    <i className="bx bx-chevron-right" />
                  </button>
                </div>
              )}
            </div>

            <div className="bg-[#e5ddd5] p-5" style={{ minHeight: 260 }}>
              {!tplSel ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center text-slate-400">
                  <i className="bx bx-message-square-dots text-4xl text-slate-300" />
                  <p className="text-xs">
                    Elige la plantilla y aquí ves el mensaje real, contacto
                    por contacto.
                  </p>
                </div>
              ) : (
                <>
                  {contactoPreview && (
                    <div className="mb-2 flex items-center gap-2 text-[11px] text-slate-600">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[9px] font-bold text-slate-600 shadow">
                        {initials(contactoPreview.nombre)}
                      </span>
                      <b>{contactoPreview.nombre}</b> ·{" "}
                      {contactoPreview.telefono}
                      <span
                        className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${(FUENTE_BADGE[contactoPreview.fuente] || FUENTE_BADGE.contacto).cls}`}
                      >
                        {
                          (
                            FUENTE_BADGE[contactoPreview.fuente] ||
                            FUENTE_BADGE.contacto
                          ).label
                        }
                      </span>
                    </div>
                  )}
                  {/* La foto que va en el encabezado: la de ESTE contacto, o
                      la de la plantilla según lo elegido (y como respaldo
                      del que no tiene foto propia). */}
                  {requiereImagen &&
                    (() => {
                      const esDelProducto =
                        mediaOrigen === "producto" &&
                        !!contactoPreview?.imagen_producto;
                      const srcImg = esDelProducto
                        ? contactoPreview.imagen_producto
                        : assetPlantilla;
                      if (!srcImg) return null;
                      return (
                        <div className="mb-1 max-w-[85%]">
                          <img
                            key={srcImg}
                            src={srcImg}
                            alt="Imagen del encabezado"
                            className="w-full rounded-t-xl bg-white object-cover shadow"
                            style={{ maxHeight: 180 }}
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                          {mediaOrigen === "producto" && assetPlantilla && (
                            <div className="mt-0.5 text-[9px] text-slate-500">
                              {esDelProducto
                                ? "Foto del producto de este contacto"
                                : "Sin foto propia: recibe la imagen de la plantilla"}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  {/* Video/documento del encabezado. Con "video del
                      producto" se ve el de ESTE contacto (o el de la
                      plantilla si no tiene). El handle de Meta suele dejar
                      reproducir el preview; si caduca, queda el bloque. */}
                  {headerVideoDoc &&
                    (headerVideoDoc.format === "VIDEO" ? (
                      (() => {
                        const esDelProducto =
                          mediaOrigen === "producto" &&
                          !!contactoPreview?.video_producto;
                        const srcVideo = esDelProducto
                          ? contactoPreview.video_producto
                          : headerVideoDoc.url;
                        return (
                          <div className="mb-1 max-w-[85%]">
                            <video
                              key={srcVideo}
                              src={srcVideo}
                              controls
                              muted
                              className="w-full rounded-t-xl bg-black shadow"
                              style={{ maxHeight: 180 }}
                            />
                            {mediaOrigen === "producto" && (
                              <div className="mt-0.5 text-[9px] text-slate-500">
                                {esDelProducto
                                  ? "Video del producto de este contacto"
                                  : "Sin video propio: recibe el de la plantilla"}
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <div className="mb-1 flex max-w-[85%] items-center gap-2 rounded-t-xl bg-white p-3 text-xs text-slate-600 shadow">
                        <i className="bx bxs-file-pdf text-2xl text-rose-500" />
                        Documento de la plantilla
                      </div>
                    ))}
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-xl rounded-tl-none bg-white p-3 text-sm text-slate-800 shadow">
                    {previewBodyPara(contactoPreview) || "…"}
                  </div>

                  {botonesTodos(tplSel).length > 0 && (
                    <div className="mt-1 flex max-w-[85%] flex-col divide-y divide-slate-100 overflow-hidden rounded-xl bg-white shadow">
                      {(() => {
                        const mapeoBotones = mapeo.filter((m) => m.esBoton);
                        let bi = 0;
                        return botonesTodos(tplSel).map((b, i) => {
                          const esDin = /\{\{\d+\}\}/.test(b?.url || "");
                          const val = esDin
                            ? valorPara(contactoPreview, mapeoBotones[bi++])
                            : "";
                          const urlFinal = esDin
                            ? String(b.url || "").replace(
                                /\{\{\d+\}\}/,
                                val || "(sin dato)",
                              )
                            : b.url || "";
                          return (
                            <div
                              key={i}
                              className="flex flex-col items-center gap-0.5 px-3 py-2"
                            >
                              <span className="flex items-center gap-1.5 text-xs font-semibold text-sky-600">
                                <i
                                  className={`bx ${
                                    String(b.type).toUpperCase() ===
                                    "QUICK_REPLY"
                                      ? "bx-reply"
                                      : "bx-link-external"
                                  }`}
                                />
                                {b.text}
                              </span>
                              {/* La URL exacta que recibe ESTE contacto: sin
                                  esto nadie sabe qué manda el botón. */}
                              {urlFinal && (
                                <span
                                  className={`max-w-full break-all text-center text-[9px] ${
                                    esDin && !val
                                      ? "font-semibold text-amber-600"
                                      : "text-slate-400"
                                  }`}
                                  style={{
                                    fontFamily:
                                      "SF Mono, Consolas, monospace",
                                  }}
                                >
                                  {urlFinal}
                                </span>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-between border-t border-slate-100 px-5 py-3">
              <button
                type="button"
                onClick={() => setPaso(1)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                <i className="bx bx-left-arrow-alt text-lg" />
                Audiencia
              </button>
              <button
                type="button"
                disabled={!paso2Listo}
                onClick={() => setPaso(3)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#171931] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-40"
              >
                Continuar al lanzamiento
                <i className="bx bx-right-arrow-alt text-lg" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ PASO 3 · LANZAMIENTO ══ */}
      {paso === 3 && (
        <div className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-bold text-slate-800">
              Revisa y lanza
            </h3>
            <p className="text-xs text-slate-400">
              Cada contacto recibe la plantilla con SUS datos. Puedes cancelar
              los pendientes en cualquier momento desde “Últimos flujos”.
            </p>
          </div>
          <div className="flex flex-col gap-4 p-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <div className="text-2xl font-extrabold text-[#171931]">
                  {loteN}
                </div>
                <div className="text-[11px] text-slate-500">
                  destinatario{loteN === 1 ? "" : "s"}
                  {excluirIncompletos && incompletos
                    ? ` (${incompletos} excluidos)`
                    : ""}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <div className="truncate text-sm font-bold text-slate-800">
                  {tplSel?.name || "—"}
                </div>
                <div className="text-[11px] text-slate-500">
                  {mapeo.length} variable{mapeo.length === 1 ? "" : "s"}{" "}
                  automática{mapeo.length === 1 ? "" : "s"}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <input
                  type="datetime-local"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                />
                <select
                  value={zona}
                  onChange={(e) => setZona(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px]"
                  title="Zona horaria del envío"
                >
                  {ZONAS.map((z) => (
                    <option key={z.tz} value={z.tz}>
                      Hora de {z.label}
                    </option>
                  ))}
                </select>
                <div className="mt-1 text-[10px] text-slate-400">
                  Sale a esa hora local de la zona elegida
                </div>
              </div>
            </div>

            {/* El envío por sí solo NO mueve de columna — aquí se decide y
                queda dicho explícitamente, que antes nadie lo sabía. */}
            <div className="rounded-xl bg-slate-50 p-3">
              <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                <i className="bx bx-columns mr-1 text-indigo-500" />
                Después de enviarse, ¿a qué columna pasa cada contacto?
              </label>
              <select
                value={estadoDestino}
                onChange={(e) => setEstadoDestino(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"
              >
                <option value="">
                  Se quedan en su columna actual (no mover)
                </option>
                {columnas.map((col) => (
                  <option
                    key={col.estado_db || col.id}
                    value={col.estado_db}
                  >
                    Mover a “{col.nombre || col.estado_db}”
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-slate-400">
                Se mueve contacto por contacto cuando SU mensaje sale con
                éxito; los que fallen se quedan donde están.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPaso(2)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                <i className="bx bx-left-arrow-alt text-lg" />
                Mensaje
              </button>
              <button
                type="button"
                onClick={programar}
                disabled={programando || !listoParaLanzar}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg hover:opacity-95 disabled:opacity-40"
              >
                {programando ? (
                  <i className="bx bx-loader-alt bx-spin" />
                ) : (
                  <i className="bx bx-rocket" />
                )}
                Programar flujo ({loteN})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Resultados ══ */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-800">
            <i className="bx bx-bar-chart-alt-2 mr-1 text-indigo-600" />
            Últimos flujos programados
          </h3>
          <button
            type="button"
            onClick={fetchLotes}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            <i className="bx bx-refresh" /> Actualizar
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {loadingLotes && (
            <div className="p-4 text-center text-xs text-slate-400">
              Cargando…
            </div>
          )}
          {!loadingLotes && !lotes.length && (
            <div className="p-4 text-center text-xs text-slate-400">
              Aún no hay flujos programados.
            </div>
          )}
          {lotes.map((l) => {
            const pend = l.estados.pendiente || 0;
            const env = l.estados.enviado || 0;
            const err = l.estados.error || 0;
            const pct = l.total ? Math.round((env / l.total) * 100) : 0;
            const abierto = loteAbierto === l.uuid_lote;
            const soloErrores = abierto && !verTodosDelLote && err > 0;
            const detalle = soloErrores
              ? l.items.filter((it) => it.estado === "error")
              : l.items;
            return (
              <div key={l.uuid_lote}>
                <div className="flex flex-wrap items-center gap-3 px-5 py-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-slate-800">
                      {l.nombre_template}
                    </div>
                    <div className="text-slate-400">
                      {l.fecha_programada} · {l.total} destinatario
                      {l.total === 1 ? "" : "s"}
                    </div>
                    <div className="mt-1 h-1.5 w-full max-w-[240px] overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                    {env} enviados
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold text-slate-600">
                    {pend} pendientes
                  </span>
                  {err > 0 && (
                    <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 font-semibold text-rose-600">
                      {err} con error
                    </span>
                  )}
                  {pend > 0 && (
                    <button
                      type="button"
                      onClick={() => cancelarLote(l.uuid_lote)}
                      className="rounded-lg border border-rose-200 px-2.5 py-1 font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      Cancelar pendientes
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setLoteAbierto(abierto ? null : l.uuid_lote);
                      setVerTodosDelLote(false);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    <i
                      className={`bx bx-chevron-${abierto ? "up" : "down"}`}
                    />
                    {abierto ? "Ocultar" : "Ver detalle"}
                  </button>
                </div>

                {abierto && (
                  <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3">
                    {err > 0 && (
                      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold">
                        <button
                          type="button"
                          onClick={() => setVerTodosDelLote(false)}
                          className={`rounded-full border px-2.5 py-1 ${
                            soloErrores
                              ? "border-rose-300 bg-rose-50 text-rose-700"
                              : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          Solo errores ({err})
                        </button>
                        <button
                          type="button"
                          onClick={() => setVerTodosDelLote(true)}
                          className={`rounded-full border px-2.5 py-1 ${
                            !soloErrores
                              ? "border-slate-400 bg-white text-slate-700"
                              : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          Todos ({l.total})
                        </button>
                      </div>
                    )}
                    <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                      {detalle.slice(0, 200).map((it) => (
                        <div
                          key={it.id}
                          className="flex flex-wrap items-start gap-2 px-3 py-2 text-[11px]"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-slate-800">
                              {it.nombre_cliente
                                ? `${it.nombre_cliente} ${it.apellido_cliente || ""}`.trim()
                                : "Sin nombre"}
                              <span className="ml-2 font-normal text-slate-400">
                                {it.telefono}
                              </span>
                            </div>
                            {it.estado === "enviado" && it.enviado_en && (
                              <div className="text-slate-400">
                                Enviado: {it.enviado_en}
                              </div>
                            )}
                            {/* El PORQUÉ del fallo, tal como lo devolvió
                                Meta: sin esto el cliente solo ve "1 error"
                                y no sabe ni en qué chat ni la causa. */}
                            {it.estado === "error" && it.error_message && (
                              <div className="mt-0.5 whitespace-pre-wrap break-words rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-rose-700">
                                {it.error_message}
                              </div>
                            )}
                          </div>
                          <span
                            className={`rounded-full border px-2 py-0.5 font-semibold ${
                              BADGE_ESTADO[it.estado] || BADGE_ESTADO.pendiente
                            }`}
                          >
                            {String(it.estado || "pendiente").toUpperCase()}
                          </span>
                          {it.id_cliente_chat_center && (
                            <button
                              type="button"
                              onClick={() => abrirChat(it.id_cliente_chat_center)}
                              title="Abrir chat del cliente"
                              className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                            >
                              <i className="bx bxs-chat text-xs" />
                            </button>
                          )}
                        </div>
                      ))}
                      {!detalle.length && (
                        <div className="px-3 py-4 text-center text-[11px] text-slate-400">
                          Sin registros para mostrar.
                        </div>
                      )}
                      {detalle.length > 200 && (
                        <div className="px-3 py-2 text-center text-[10px] text-slate-400">
                          Mostrando 200 de {detalle.length} — el detalle
                          completo está en el tab Programados.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
