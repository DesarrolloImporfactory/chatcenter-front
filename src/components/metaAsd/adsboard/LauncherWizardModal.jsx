import React, {
  useState,
  useRef,
  useMemo,
  useEffect,
  useCallback,
} from "react";
import Swal from "sweetalert2";
import chatApi from "../../../api/chatcenter";
import ReglasAutomaticas from "../../../pages/campanias/ReglasAutomaticas";
import MediaLightbox from "./MediaLightbox";
import { fetchVideoInfo } from "./adsMedia";

/**
 * LauncherWizardModal
 *
 * Wizard de 4 pasos para crear/editar una plantilla de campaña CTWA:
 * 1. Página y producto   2. Presupuesto y alcance
 * 3. Creativos           4. Revisar y lanzar
 *
 * Hasta 10 creativos = hasta 10 anuncios (variaciones) dentro del mismo
 * conjunto: Meta reparte el presupuesto y concentra el gasto en el creativo
 * ganador, la práctica estándar del Ads Manager.
 *
 * Regla de negocio: con producto vinculado, el TÍTULO del anuncio se fija al
 * nombre exacto del producto en Imporchat — es el referral.headline con el
 * que el bot detecta qué se vende (el backend también lo impone).
 */

const PASOS = [
  { n: 1, label: "Producto", icon: "bx-box" },
  { n: 2, label: "Alcance", icon: "bx-target-lock" },
  { n: 3, label: "Creativos", icon: "bx-image-alt" },
  { n: 4, label: "Lanzar", icon: "bx-rocket" },
];

// Meta permite hasta 50 anuncios por conjunto. Se admiten 10 creativos por
// plantilla (mismo tope que MAX_CREATIVOS en el backend); la UI recomienda
// 3-6 activos para que la fase de aprendizaje no se fragmente.
const MAX_IMAGENES = 10;
// Subidas simultáneas al seleccionar varios archivos: más rápido que una por
// una sin saturar la conexión del cliente.
const SUBIDAS_PARALELAS = 2;
// Límites del backend (multer en meta_ads.routes.js): se validan aquí antes
// de subir para avisar al instante y con el nombre del archivo.
const MAX_VIDEO_MB = 300;
const MAX_IMAGEN_MB = 8;
// A partir de este peso se sugiere comprimir (no bloquea): sube más lento y
// Meta lo recomprime igual.
const AVISO_VIDEO_MB = 60;
// Zonas incluidas/excluidas por plantilla (mismo tope que MAX_ZONAS del back;
// Meta admite 200 regiones / 250 ciudades por conjunto).
const MAX_ZONAS = 200;

const PAISES_SUGERIDOS = [
  { code: "EC", label: "Ecuador", flag: "🇪🇨" },
  { code: "CO", label: "Colombia", flag: "🇨🇴" },
  { code: "PE", label: "Perú", flag: "🇵🇪" },
  { code: "MX", label: "México", flag: "🇲🇽" },
  { code: "GT", label: "Guatemala", flag: "🇬🇹" },
  { code: "CL", label: "Chile", flag: "🇨🇱" },
  { code: "PA", label: "Panamá", flag: "🇵🇦" },
  { code: "US", label: "EE.UU.", flag: "🇺🇸" },
];

const PRESETS_EDAD = [
  { label: "Todos (18-65)", min: 18, max: 65 },
  { label: "18-34", min: 18, max: 34 },
  { label: "25-55", min: 25, max: 55 },
  { label: "35-65", min: 35, max: 65 },
];

const GENERO_LABEL = { all: "Todos", male: "Hombres", female: "Mujeres" };

const paisLabel = (code) =>
  PAISES_SUGERIDOS.find((p) => p.code === code)?.label || code;

/* Mensaje con el que el cliente final llega a WhatsApp al tocar el anuncio.
   Con producto elegido se arma solo con su nombre (el bot lo detecta de una);
   el cliente puede editarlo. */
const mensajeEntradaPorDefecto = (nombreProducto) => {
  const n = String(nombreProducto || "").trim();
  return n
    ? `Hola 👋 quiero información sobre ${n}`
    : "Hola 👋 vi su anuncio y quiero más información";
};

/* Mañana a la hora indicada, en formato del <input type="datetime-local">.
   La mayoría de las tiendas saca sus campañas a las 5:00 del día siguiente:
   es el valor premarcado en plantillas nuevas. */
const HORA_LANZAMIENTO_POR_DEFECTO = 5;
const manianaA = (hora) => {
  const d = new Date(Date.now() + 24 * 3600 * 1000);
  d.setHours(hora, 0, 0, 0);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(hora)}:00`;
};

const normalizarTexto = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/* Botón pequeño de herramienta (fila de carga rápida de zonas). */
const toolBtnCls = (activo) =>
  `inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold ring-1 transition ${
    activo
      ? "bg-rose-600 text-white ring-rose-600"
      : "bg-white text-slate-600 ring-slate-200 hover:ring-rose-300 hover:text-rose-700"
  }`;

/* Nombres de zonas a partir de lo que el cliente escribe, pega (Excel,
   WhatsApp, un documento) o sube (.txt/.csv). La regla visible es "una por
   renglón"; por debajo también se aceptan separadores de coma/punto y coma
   cuando todo viene en un solo renglón o la línea trae varias comas (CSV).
   Una línea con UNA sola coma se respeta entera ("Monterrey, Nuevo León"). */
const nombresDesdeTexto = (texto) => {
  const lineas = String(texto || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const out = [];
  for (const l of lineas) {
    const comas = (l.match(/[;,\t]/g) || []).length;
    const partes = comas >= 2 || (lineas.length === 1 && comas >= 1)
      ? l.split(/[;,\t]/)
      : [l];
    for (const p of partes) {
      const s = p.replace(/^["']+|["']+$/g, "").trim();
      if (s) out.push(s);
    }
  }
  return [...new Set(out)];
};

const swalWarn = (text) =>
  Swal.fire({
    icon: "warning",
    title: "Falta un dato",
    text,
    confirmButtonText: "Entendido",
    customClass: { popup: "rounded-2xl" },
  });

/* Tarjeta de sección del formulario (estilo Administrador de anuncios). */
const Seccion = ({ icon, titulo, desc, children, className = "" }) => (
  <div
    className={`rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm ${className}`}
  >
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-8 h-8 rounded-lg bg-indigo-50 ring-1 ring-indigo-100 grid place-items-center shrink-0">
        <i className={`bx ${icon} text-indigo-600`} />
      </div>
      <div>
        <p className="text-[13px] font-extrabold text-slate-800 leading-tight">
          {titulo}
        </p>
        {desc && <p className="text-[10px] text-slate-400 mt-0.5">{desc}</p>}
      </div>
    </div>
    {children}
  </div>
);

/* ── Vista previa: publicación de feed + chat de WhatsApp ──
   creativoIdx: qué variación se muestra (con varias, aparece una tira de
   miniaturas para cambiar). onVerMedia(item): abre el creativo en grande. */
export const AdPreview = ({
  form,
  paginaNombre,
  tituloEfectivo,
  creativoIdx = 0,
  onCambiarCreativo,
  onVerMedia,
}) => {
  const inicial = (paginaNombre || "P").trim().charAt(0).toUpperCase();
  const nImagenes = form.imagenes?.length || 0;
  const idx = Math.min(Math.max(0, creativoIdx), Math.max(0, nImagenes - 1));
  const imagen = form.imagenes?.[idx] || null;
  const clicable = !!(onVerMedia && imagen);
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
          <i className="bx bx-show mr-1" />
          Así se verá en Facebook
        </p>
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
          <div className="px-3 py-2.5 flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 grid place-items-center text-white text-sm font-bold">
              {inicial}
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-bold text-slate-800 truncate">
                {paginaNombre || "Tu página"}
              </p>
              <p className="text-[10px] text-slate-400">
                Publicidad · <i className="bx bx-globe" />
              </p>
            </div>
            <i className="bx bx-dots-horizontal-rounded ml-auto text-slate-400" />
          </div>
          {form.texto_principal ? (
            <p className="px-3 pb-2.5 text-[12px] text-slate-700 whitespace-pre-line leading-snug">
              {form.texto_principal}
            </p>
          ) : (
            <p className="px-3 pb-2.5 text-[12px] text-slate-300 italic">
              El texto principal de tu anuncio aparecerá aquí...
            </p>
          )}
          <div
            className={`relative ${clicable ? "cursor-zoom-in" : ""}`}
            onClick={() => clicable && onVerMedia(imagen)}
            title={clicable ? "Ver en grande" : undefined}
          >
            {imagen?.tipo === "video" && imagen?.local_url ? (
              // Video recién cargado: se muestra el archivo del cliente, no la
              // miniatura provisional (gris) que Meta da mientras lo procesa.
              <video
                src={imagen.local_url}
                muted
                playsInline
                preload="metadata"
                className="w-full aspect-square object-cover bg-slate-800"
              />
            ) : imagen?.url ? (
              <img
                src={imagen.url}
                alt="Creativo"
                className="w-full aspect-square object-cover bg-slate-800"
                onError={(e) => {
                  e.currentTarget.style.visibility = "hidden";
                }}
              />
            ) : imagen?.tipo === "video" ? (
              <div className="w-full aspect-square bg-slate-800 grid place-items-center text-white/70">
                <div className="text-center">
                  <i className="bx bx-video text-4xl" />
                  <p className="text-[10px] font-semibold mt-1">
                    Video subido
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-full aspect-square bg-slate-100 grid place-items-center text-slate-300">
                <div className="text-center">
                  <i className="bx bx-image text-4xl" />
                  <p className="text-[10px] font-semibold mt-1">
                    Tu imagen o video va aquí
                  </p>
                </div>
              </div>
            )}
            {imagen?.tipo === "video" && (
              <span className="absolute inset-0 grid place-items-center">
                <span className="w-12 h-12 rounded-full bg-black/50 grid place-items-center text-white">
                  <i className="bx bx-play text-3xl ml-0.5" />
                </span>
              </span>
            )}
            {nImagenes > 1 && (
              <span className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-black/60 text-white text-[10px] font-bold">
                <i className="bx bx-images mr-1" />
                V{idx + 1} de {nImagenes}
              </span>
            )}
            {clicable && (
              <span className="absolute bottom-2 right-2 w-7 h-7 rounded-lg bg-black/55 text-white grid place-items-center">
                <i className="bx bx-expand-alt text-sm" />
              </span>
            )}
          </div>
          {nImagenes > 1 && (
            <div className="px-3 py-2 flex gap-1.5 overflow-x-auto border-t border-slate-100">
              {form.imagenes.map((img, i) => (
                <button
                  key={img.hash || img.video_id || i}
                  type="button"
                  onClick={() => onCambiarCreativo?.(i)}
                  className={`relative w-10 h-10 shrink-0 rounded-lg overflow-hidden ring-2 transition ${
                    i === idx
                      ? "ring-indigo-500"
                      : "ring-transparent opacity-70 hover:opacity-100"
                  }`}
                  title={`Variación ${i + 1}`}
                >
                  {img.tipo === "video" && img.local_url ? (
                    <video
                      src={img.local_url}
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover bg-slate-800"
                    />
                  ) : img.url ? (
                    <img
                      src={img.url}
                      alt=""
                      className="w-full h-full object-cover bg-slate-800"
                      onError={(e) => {
                        e.currentTarget.style.visibility = "hidden";
                      }}
                    />
                  ) : (
                    <span className="w-full h-full bg-slate-800 grid place-items-center text-white/70">
                      <i className="bx bx-video text-sm" />
                    </span>
                  )}
                  {img.tipo === "video" && (
                    <span className="absolute inset-0 grid place-items-center text-white text-xs">
                      <i className="bx bx-play" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          <div className="px-3 py-2.5 flex items-center justify-between bg-slate-50 border-t border-slate-100">
            <div className="min-w-0">
              <p className="text-[9px] text-slate-400 uppercase">whatsapp</p>
              <p className="text-[12px] font-bold text-slate-800 truncate">
                {tituloEfectivo || "Título del anuncio"}
              </p>
              {form.descripcion && (
                <p className="text-[10px] text-slate-400 truncate">
                  {form.descripcion}
                </p>
              )}
            </div>
            <span className="shrink-0 ml-2 px-3 py-1.5 rounded-lg bg-[#25D366] text-white text-[11px] font-bold whitespace-nowrap">
              <i className="bx bxl-whatsapp mr-0.5" />
              Enviar mensaje
            </span>
          </div>
          <div className="px-3 py-2 flex items-center justify-around text-slate-400 text-[11px] border-t border-slate-100">
            <span>
              <i className="bx bx-like mr-1" />
              Me gusta
            </span>
            <span>
              <i className="bx bx-comment mr-1" />
              Comentar
            </span>
            <span>
              <i className="bx bx-share mr-1" />
              Compartir
            </span>
          </div>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
          <i className="bx bxl-whatsapp mr-1" />
          Al tocar el botón
        </p>
        <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
          <div className="bg-[#075E54] px-3 py-2 flex items-center gap-2">
            <i className="bx bx-arrow-back text-white/80" />
            <div className="w-6 h-6 rounded-full bg-white/20 grid place-items-center text-white text-[10px] font-bold">
              {inicial}
            </div>
            <p className="text-[11px] font-bold text-white truncate">
              {paginaNombre || "Tu negocio"}
            </p>
          </div>
          <div
            className="px-3 py-4 min-h-[70px]"
            style={{ backgroundColor: "#ECE5DD" }}
          >
            <div className="ml-auto max-w-[85%] w-fit rounded-lg rounded-tr-none bg-[#DCF8C6] px-2.5 py-1.5 shadow-sm">
              <p className="text-[11px] text-slate-800 whitespace-pre-line">
                {form.mensaje_bienvenida ||
                  "Hola 👋 vi su anuncio y quiero más información"}
              </p>
              <p className="text-[8px] text-slate-400 text-right mt-0.5">
                12:00 <i className="bx bx-check-double" />
              </p>
            </div>
          </div>
        </div>
        <p className="text-[9px] text-slate-400 mt-1.5 leading-snug">
          El cliente llega con este mensaje ya escrito y tu bot lo atiende al
          instante.
        </p>
      </div>
    </div>
  );
};

const LauncherWizardModal = ({
  id_configuracion,
  contexto,
  currency = "USD",
  plantilla = null,
  plantillas = [],
  onClose,
}) => {
  const paginas = contexto?.paginas || [];
  const productos = contexto?.productos || [];

  const [step, setStep] = useState(1);
  const [guardando, setGuardando] = useState(false);
  // Subidas en curso: se pueden elegir varios archivos a la vez; cada uno
  // muestra su progreso en la cuadrícula y al terminar pasa a form.imagenes.
  const [subidas, setSubidas] = useState([]); // [{uid,nombre,tipo,pct,local_url,error,file}]
  const subiendoImg = subidas.some((s) => !s.error);
  const fileRef = useRef(null);
  const listaFileRef = useRef(null);
  const bodyRef = useRef(null);

  const [form, setForm] = useState(() => {
    let geo = null;
    try {
      geo = plantilla?.geo_json ? JSON.parse(plantilla.geo_json) : null;
    } catch {
      geo = null;
    }
    if (!geo) {
      geo = {
        modo: "paises",
        paises: plantilla?.paises
          ? String(plantilla.paises).split(",").filter(Boolean)
          : ["EC"],
        lugares: [],
      };
    }
    // Plantillas anteriores al soporte de exclusión no traen la lista.
    if (!Array.isArray(geo.lugares)) geo.lugares = [];
    if (!Array.isArray(geo.excluir)) geo.excluir = [];
    let imagenes = [];
    try {
      const arr = plantilla?.imagenes_json
        ? JSON.parse(plantilla.imagenes_json)
        : null;
      if (Array.isArray(arr) && arr.length) imagenes = arr;
    } catch {
      imagenes = [];
    }
    if (!imagenes.length && plantilla?.imagen_hash) {
      imagenes = [
        { hash: plantilla.imagen_hash, url: plantilla.imagen_url || null },
      ];
    }
    return {
      id: plantilla?.id || null,
      nombre: plantilla?.nombre || "",
      id_producto: plantilla?.id_producto || "",
      page_id: plantilla?.page_id || paginas[0]?.page_id || "",
      presupuesto_diario: plantilla?.presupuesto_diario || 5,
      geo,
      edad_min: plantilla?.edad_min || 18,
      edad_max: plantilla?.edad_max || 65,
      genero: plantilla?.genero || "all",
      titulo: plantilla?.titulo || "",
      texto_principal: plantilla?.texto_principal || "",
      descripcion: plantilla?.descripcion || "",
      mensaje_bienvenida:
        plantilla?.mensaje_bienvenida ||
        mensajeEntradaPorDefecto(
          productos.find((p) => Number(p.id) === Number(plantilla?.id_producto))
            ?.nombre,
        ),
      imagenes,
      // Por defecto la campaña nace ACTIVA: el cliente llega aquí para
      // lanzar, no para revisar en el Ads Manager; puede cambiarlo aquí.
      estado_inicial: plantilla?.estado_inicial || "ACTIVE",
      // Programación: '' = lanzar de inmediato; 'YYYY-MM-DDTHH:mm' = el
      // conjunto arranca a esa hora (hora local de la cuenta publicitaria).
      inicio_at: (() => {
        // Plantilla nueva: premarcada "Programada" para mañana a las 5:00
        // (editable). Plantilla existente: lo que tenga guardado.
        if (!plantilla) return manianaA(HORA_LANZAMIENTO_POR_DEFECTO);
        if (!plantilla?.inicio_at) return "";
        try {
          const d = new Date(plantilla.inicio_at);
          if (Number.isNaN(d.getTime())) return "";
          const p = (n) => String(n).padStart(2, "0");
          return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
        } catch {
          return "";
        }
      })(),
    };
  });

  // Reglas de optimización: se aplican/crean en su propio modal (encima del
  // wizard) para no estirar el paso 4. El conteo de activas se muestra en el
  // paso 4 para que el cliente sepa que quedaron guardadas.
  const [reglasOpen, setReglasOpen] = useState(false);
  const [reglasActivas, setReglasActivas] = useState(null); // null = sin cargar
  const cargarReglasActivas = useCallback(async () => {
    try {
      const { data } = await chatApi.get("/meta_ads/launcher/reglas", {
        params: { id_configuracion },
        silentError: true,
      });
      const lista = data?.success ? data.data || [] : [];
      setReglasActivas(lista.filter((r) => Number(r.activa) === 1).length);
    } catch {
      setReglasActivas(null);
    }
  }, [id_configuracion]);
  useEffect(() => {
    if (step === 4 && reglasActivas === null) cargarReglasActivas();
  }, [step, reglasActivas, cargarReglasActivas]);

  // Creativo ampliado (imagen completa o video reproduciéndose) y cuál
  // variación se muestra en la vista previa.
  const [lightbox, setLightbox] = useState(null);
  const [previewIdx, setPreviewIdx] = useState(0);

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));
  const setGeo = (parcial) =>
    setForm((f) => ({ ...f, geo: { ...f.geo, ...parcial } }));

  const productoSel = productos.find(
    (p) => Number(p.id) === Number(form.id_producto),
  );

  // El mensaje de entrada sigue al producto elegido mientras el cliente no
  // lo haya escrito a mano (si lo borra del todo, vuelve a seguirlo).
  const mensajeManualRef = useRef(!!plantilla?.mensaje_bienvenida);
  useEffect(() => {
    if (mensajeManualRef.current) return;
    const porDefecto = mensajeEntradaPorDefecto(productoSel?.nombre);
    setForm((f) =>
      f.mensaje_bienvenida === porDefecto
        ? f
        : { ...f, mensaje_bienvenida: porDefecto },
    );
  }, [productoSel?.nombre]);
  const paginaSel = paginas.find((p) => p.page_id === form.page_id);
  const paginaNombre = paginaSel?.page_name || null;

  // Con producto vinculado el título del anuncio es su nombre en Imporchat:
  // es el referral.headline con el que el bot detecta el producto.
  const tituloEfectivo = productoSel ? productoSel.nombre : form.titulo;

  // Buscador de productos: con catálogos grandes el <select> es inusable.
  const [buscaProducto, setBuscaProducto] = useState("");
  const productosFiltrados = useMemo(() => {
    const q = buscaProducto.trim().toLowerCase();
    const base = q
      ? productos.filter((p) =>
          String(p.nombre || "").toLowerCase().includes(q),
        )
      : productos;
    return base.slice(0, 30);
  }, [productos, buscaProducto]);

  // Página manual: cuando el token no puede listar páginas (system user sin
  // páginas asignadas) el cliente puede pegar el ID de su fanpage.
  const [paginaManual, setPaginaManual] = useState(
    () =>
      paginas.length === 0 ||
      !!(
        plantilla?.page_id &&
        !paginas.some((p) => p.page_id === plantilla.page_id)
      ),
  );

  // Búsqueda de zonas (provincias/ciudades) con debounce contra el backend.
  const [geoQ, setGeoQ] = useState("");
  const [geoResultados, setGeoResultados] = useState([]);
  const [geoBuscando, setGeoBuscando] = useState(false);
  const paisBase = form.geo.paises[0] || "EC";

  useEffect(() => {
    const q = geoQ.trim();
    if (q.length < 2) {
      setGeoResultados([]);
      return undefined;
    }
    const timer = setTimeout(async () => {
      setGeoBuscando(true);
      try {
        const { data } = await chatApi.get("/meta_ads/launcher/geo/buscar", {
          params: { id_configuracion, q, pais: paisBase },
          silentError: true,
        });
        setGeoResultados(data?.success ? data.data || [] : []);
      } catch {
        setGeoResultados([]);
      } finally {
        setGeoBuscando(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [geoQ, paisBase, id_configuracion]);

  const agregarLugar = (l) => {
    if (form.geo.lugares.some((x) => x.key === l.key)) return;
    setGeo({
      lugares: [...form.geo.lugares, l],
      // Una zona no puede estar incluida y excluida a la vez.
      excluir: (form.geo.excluir || []).filter((x) => x.key !== l.key),
    });
    setGeoQ("");
    setGeoResultados([]);
  };

  const quitarLugar = (key) =>
    setGeo({ lugares: form.geo.lugares.filter((l) => l.key !== key) });

  // Zonas excluidas: mismo buscador que las incluidas, pero para quitar
  // provincias/ciudades del alcance ("todo el país menos Galápagos").
  // Con varios países en modo "países completos", se elige en cuál buscar.
  const [excluirQ, setExcluirQ] = useState("");
  const [excluirResultados, setExcluirResultados] = useState([]);
  const [excluirBuscando, setExcluirBuscando] = useState(false);
  const [excluirPais, setExcluirPais] = useState(paisBase);
  const paisExcluir = form.geo.paises.includes(excluirPais)
    ? excluirPais
    : paisBase;

  useEffect(() => {
    const q = excluirQ.trim();
    if (q.length < 2) {
      setExcluirResultados([]);
      return undefined;
    }
    const timer = setTimeout(async () => {
      setExcluirBuscando(true);
      try {
        const { data } = await chatApi.get("/meta_ads/launcher/geo/buscar", {
          params: { id_configuracion, q, pais: paisExcluir },
          silentError: true,
        });
        setExcluirResultados(data?.success ? data.data || [] : []);
      } catch {
        setExcluirResultados([]);
      } finally {
        setExcluirBuscando(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [excluirQ, paisExcluir, id_configuracion]);

  const agregarExcluir = (l) => {
    if (form.geo.excluir.some((x) => x.key === l.key)) return;
    if (form.geo.lugares.some((x) => x.key === l.key)) {
      swalWarn(
        `${l.name} ya está en las zonas incluidas. Quítala de ahí primero si quieres excluirla.`,
      );
      return;
    }
    setGeo({ excluir: [...form.geo.excluir, l] });
    setExcluirQ("");
    setExcluirResultados([]);
  };

  const quitarExcluir = (key) =>
    setGeo({ excluir: form.geo.excluir.filter((l) => l.key !== key) });

  /* Agrega varias zonas excluidas de golpe (lista pegada, archivo, lista
     guardada o copia de otra plantilla). Salta las ya incluidas/excluidas.
     Devuelve cuántas entraron de verdad. */
  const agregarExcluirVarias = (lista) => {
    const incluidas = new Set(form.geo.lugares.map((x) => x.key));
    const yaEstan = new Set(form.geo.excluir.map((x) => x.key));
    const nuevas = [];
    for (const l of lista || []) {
      if (!l?.key || incluidas.has(l.key) || yaEstan.has(l.key)) continue;
      yaEstan.add(l.key);
      nuevas.push({
        key: String(l.key),
        name: l.name,
        type: l.type,
        country_code: l.country_code || null,
      });
    }
    if (!nuevas.length) return 0;
    setGeo({ excluir: [...form.geo.excluir, ...nuevas].slice(0, MAX_ZONAS) });
    return nuevas.length;
  };

  // ── Carga rápida de exclusiones ──
  // México excluye decenas de zonas sin cobertura: buscarlas una por una en
  // cada plantilla nueva era lo que más demoraba. Tres atajos: pegar una
  // lista (o subir .txt/.csv) que el backend resuelve contra Meta en lote,
  // listas guardadas reutilizables, y copiar las de la última plantilla.
  const [excluirMasivoOpen, setExcluirMasivoOpen] = useState(false);
  const [excluirTexto, setExcluirTexto] = useState("");
  const [excluirResolviendo, setExcluirResolviendo] = useState(false);
  // Resultado de la búsqueda en lote, para que el cliente REVISE qué se va
  // a excluir antes de aplicarlo:
  // { encontrados: [{...zona, consulta, marcada, repetida}],
  //   ambiguas: [{consulta, opciones[], elegida}], noEncontradas: [consulta] }
  const [excluirRevision, setExcluirRevision] = useState(null);
  const [geoListas, setGeoListas] = useState([]);
  const zonasDetectadas = useMemo(
    () => nombresDesdeTexto(excluirTexto),
    [excluirTexto],
  );

  const cerrarMasivo = () => {
    setExcluirMasivoOpen(false);
    setExcluirRevision(null);
  };

  const toastZonas = (title) =>
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title,
      showConfirmButton: false,
      timer: 2500,
    });

  /* Busca la lista en Meta y deja el resultado en revisión (no excluye
     todavía): el cliente ve qué se encontró, elige entre homónimas y
     corrige lo que no apareció. */
  const resolverZonas = async (nombres) => {
    if (!nombres.length) {
      swalWarn("Escribe al menos una zona (un estado, provincia o ciudad).");
      return;
    }
    if (nombres.length > 250) {
      swalWarn("Máximo 250 zonas por lista.");
      return;
    }
    setExcluirResolviendo(true);
    try {
      const { data } = await chatApi.post(
        "/meta_ads/launcher/geo/resolver",
        { id_configuracion, pais: paisExcluir, nombres },
        { silentError: true, timeout: 120000 },
      );
      if (!data?.success) {
        throw new Error(data?.message || "No se pudo buscar la lista.");
      }
      const yaKeys = new Set(
        [...form.geo.excluir, ...form.geo.lugares].map((x) => String(x.key)),
      );
      const encontrados = (data.data.encontrados || []).map((z) => {
        const repetida = yaKeys.has(String(z.key));
        return { ...z, marcada: !repetida, repetida };
      });
      const ambiguas = [];
      const noEncontradas = [];
      for (const n of data.data.no_encontrados || []) {
        if (n.sugerencias?.length) {
          ambiguas.push({
            consulta: n.consulta,
            opciones: n.sugerencias,
            elegida: null,
          });
        } else {
          noEncontradas.push(n.consulta);
        }
      }
      setExcluirRevision({ encontrados, ambiguas, noEncontradas });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "No se pudo buscar la lista",
        text: err?.response?.data?.message || err?.message || "Inténtalo de nuevo.",
        customClass: { popup: "rounded-2xl" },
      });
    } finally {
      setExcluirResolviendo(false);
    }
  };

  const totalAplicar = excluirRevision
    ? excluirRevision.encontrados.filter((z) => z.marcada).length +
      excluirRevision.ambiguas.filter((a) => a.elegida).length
    : 0;

  const aplicarRevision = () => {
    if (!excluirRevision) return;
    const zonas = [
      ...excluirRevision.encontrados.filter((z) => z.marcada),
      ...excluirRevision.ambiguas.map((a) => a.elegida).filter(Boolean),
    ];
    const n = agregarExcluirVarias(zonas);
    cerrarMasivo();
    setExcluirTexto("");
    toastZonas(`${n} zona${n === 1 ? "" : "s"} excluida${n === 1 ? "" : "s"}`);
  };

  const marcarEncontrada = (key, marcada) =>
    setExcluirRevision((r) => ({
      ...r,
      encontrados: r.encontrados.map((z) =>
        z.key === key ? { ...z, marcada } : z,
      ),
    }));

  const elegirAmbigua = (consulta, opcion) =>
    setExcluirRevision((r) => ({
      ...r,
      ambiguas: r.ambiguas.map((a) =>
        a.consulta === consulta ? { ...a, elegida: opcion } : a,
      ),
    }));

  // "Corregir": vuelve al editor solo con los nombres que no aparecieron.
  const corregirNoEncontradas = () => {
    setExcluirTexto((excluirRevision?.noEncontradas || []).join("\n"));
    setExcluirRevision(null);
  };

  const handleArchivoZonas = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const nombres = nombresDesdeTexto(String(reader.result || ""));
      setExcluirTexto(nombres.join("\n"));
      setExcluirRevision(null);
      setExcluirMasivoOpen(true);
      if (nombres.length) resolverZonas(nombres);
    };
    reader.readAsText(file);
  };

  const cargarGeoListas = useCallback(async () => {
    try {
      const { data } = await chatApi.get("/meta_ads/launcher/geo/listas", {
        params: { id_configuracion, pais: paisExcluir },
        silentError: true,
      });
      setGeoListas(data?.success ? data.data || [] : []);
    } catch {
      setGeoListas([]);
    }
  }, [id_configuracion, paisExcluir]);

  useEffect(() => {
    if (step === 2) cargarGeoListas();
  }, [step, cargarGeoListas]);

  const aplicarGeoLista = (id) => {
    const lista = geoListas.find((l) => String(l.id) === String(id));
    if (!lista) return;
    const n = agregarExcluirVarias(lista.lugares);
    toastZonas(
      n
        ? `${n} zona${n === 1 ? "" : "s"} de «${lista.nombre}» excluida${n === 1 ? "" : "s"}`
        : `Las zonas de «${lista.nombre}» ya estaban excluidas`,
    );
  };

  const guardarComoLista = async () => {
    if (!form.geo.excluir.length) return;
    const { value: nombre } = await Swal.fire({
      title: "Guardar zonas como lista",
      text: `Se guardarán ${form.geo.excluir.length} zonas de ${paisLabel(paisExcluir)} para reutilizarlas en otras plantillas.`,
      input: "text",
      inputPlaceholder: "Ej: Zonas sin cobertura",
      inputValidator: (v) => (!String(v || "").trim() ? "Escribe un nombre" : null),
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      customClass: { popup: "rounded-2xl" },
    });
    if (!nombre) return;
    try {
      const { data } = await chatApi.post(
        "/meta_ads/launcher/geo/listas/guardar",
        {
          id_configuracion,
          nombre: String(nombre).trim(),
          pais: paisExcluir,
          lugares: form.geo.excluir,
        },
        { silentError: true },
      );
      if (!data?.success) throw new Error(data?.message);
      await cargarGeoListas();
      toastZonas(`Lista «${String(nombre).trim()}» guardada`);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "No se pudo guardar la lista",
        text: err?.response?.data?.message || err?.message || "Inténtalo de nuevo.",
        customClass: { popup: "rounded-2xl" },
      });
    }
  };

  const eliminarGeoLista = async () => {
    const propias = geoListas.filter((l) => !l.global);
    if (!propias.length) return;
    const { value: id } = await Swal.fire({
      title: "Eliminar una lista guardada",
      input: "select",
      inputOptions: Object.fromEntries(
        propias.map((l) => [l.id, `${l.nombre} (${l.lugares.length})`]),
      ),
      inputPlaceholder: "Elige la lista",
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      confirmButtonColor: "#e11d48",
      cancelButtonText: "Cancelar",
      customClass: { popup: "rounded-2xl" },
    });
    if (!id) return;
    try {
      await chatApi.post(
        "/meta_ads/launcher/geo/listas/eliminar",
        { id: Number(id), id_configuracion },
        { silentError: true },
      );
      await cargarGeoListas();
    } catch {
      /* la lista sigue visible; el usuario puede reintentar */
    }
  };

  // Última plantilla del mismo país con zonas excluidas: se ofrece copiarlas
  // con un click cuando esta plantilla aún no tiene ninguna.
  const sugerenciaExcluir = useMemo(() => {
    if (form.geo.excluir.length) return null;
    for (const p of plantillas || []) {
      if (p.id === form.id) continue;
      let g = null;
      try {
        g = p.geo_json ? JSON.parse(p.geo_json) : null;
      } catch {
        g = null;
      }
      const ex = Array.isArray(g?.excluir) ? g.excluir : [];
      if (!ex.length) continue;
      const paisesP = Array.isArray(g?.paises)
        ? g.paises
        : String(p.paises || "").split(",");
      if (!paisesP.includes(paisExcluir)) continue;
      return { nombre: p.nombre, excluir: ex };
    }
    return null;
  }, [plantillas, form.id, form.geo.excluir.length, paisExcluir]);

  const togglePais = (code) => {
    const quitando = form.geo.paises.includes(code);
    setGeo({
      paises: quitando
        ? form.geo.paises.filter((c) => c !== code)
        : [...form.geo.paises, code],
      // Al quitar un país se van también sus zonas excluidas: Meta rechaza
      // exclusiones fuera del alcance incluido.
      excluir: quitando
        ? (form.geo.excluir || []).filter(
            (l) => l.country_code && l.country_code !== code,
          )
        : form.geo.excluir || [],
    });
  };

  const irA = (n) => {
    setStep(n);
    bodyRef.current?.scrollTo?.({ top: 0 });
  };

  const validarPaso = (n) => {
    if (n === 1) {
      if (!form.page_id) {
        swalWarn(
          "Selecciona la página de Facebook desde la que saldrá el anuncio.",
        );
        return false;
      }
      if (!form.nombre.trim()) {
        swalWarn("Ponle un nombre a la plantilla (ej: 'Faja lanzamiento EC').");
        return false;
      }
    }
    if (n === 2) {
      if (
        !Number(form.presupuesto_diario) ||
        Number(form.presupuesto_diario) < 1
      ) {
        swalWarn("El presupuesto diario mínimo es 1.");
        return false;
      }
      if (form.geo.modo === "paises" && !form.geo.paises.length) {
        swalWarn("Selecciona al menos un país.");
        return false;
      }
      if (form.geo.modo === "especifico" && !form.geo.lugares.length) {
        swalWarn("Agrega al menos una provincia o ciudad.");
        return false;
      }
    }
    return true;
  };

  const siguiente = () => {
    if (!validarPaso(step)) return;
    irA(step + 1);
  };

  /* Sube UN archivo a la cuenta publicitaria y, al terminar, lo pasa de la
     cola `subidas` a form.imagenes. El progreso se pinta en su tarjeta. */
  const subirUno = async (s) => {
    const fd = new FormData();
    fd.append("archivo", s.file);
    fd.append("id_configuracion", id_configuracion);
    try {
      const { data } = await chatApi.post(
        "/meta_ads/launcher/subir-media",
        fd,
        {
          headers: { "Content-Type": "multipart/form-data" },
          silentError: true,
          // Hasta 300 MB por video en conexiones lentas: 30 min de margen.
          timeout: 1800000,
          onUploadProgress: (ev) => {
            const pct = ev.total
              ? Math.min(99, Math.round((ev.loaded * 100) / ev.total))
              : 0;
            setSubidas((arr) =>
              arr.map((x) => (x.uid === s.uid ? { ...x, pct } : x)),
            );
          },
        },
      );
      if (!data?.success) {
        throw new Error(
          data?.message || "Meta rechazó el archivo (JPG/PNG/MP4).",
        );
      }
      const d = data.data;
      // Preview local inmediato: la imagen se muestra tal cual; el video se
      // reproduce desde el ObjectURL sin esperar a que Meta lo procese (la
      // miniatura de Meta llega después).
      const item =
        d.tipo === "video"
          ? {
              tipo: "video",
              video_id: d.video_id,
              thumb_url: d.thumb_url || null,
              url: d.url || d.thumb_url || null,
              local_url: s.local_url,
            }
          : {
              tipo: "imagen",
              hash: d.hash,
              url: d.url || s.local_url,
            };
      setForm((f) =>
        f.imagenes.length >= MAX_IMAGENES
          ? f
          : { ...f, imagenes: [...f.imagenes, item] },
      );
      setSubidas((arr) => arr.filter((x) => x.uid !== s.uid));
      // Meta procesa el video en segundo plano: si la miniatura aún no
      // existía al subirlo, se vuelve a pedir unas veces hasta tenerla.
      if (item.tipo === "video" && !item.thumb_url) {
        reintentarMiniatura(item.video_id);
      }
    } catch (err) {
      // 413/504 llegan del proxy (nginx) con HTML, no con nuestro JSON: se
      // traducen a algo que el cliente entienda.
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message ||
        (status === 413
          ? "El servidor rechazó el archivo por su tamaño. Prueba con un video más liviano (exporta en 1080p con menos calidad) o avísanos para revisarlo."
          : status === 504 || status === 502
            ? "El servidor tardó demasiado en confirmar la subida. Espera un momento y vuelve a intentar; si el video ya aparece en tu cuenta de Meta, no lo vuelvas a subir."
            : err?.code === "ECONNABORTED"
              ? "Se agotó el tiempo de subida. Reintenta o usa un archivo más liviano."
              : err?.message) ||
        "No se pudo subir.";
      setSubidas((arr) =>
        arr.map((x) => (x.uid === s.uid ? { ...x, error: msg, pct: 0 } : x)),
      );
    }
  };

  /* Selección múltiple: encola todos los archivos y los sube de a
     SUBIDAS_PARALELAS. Respeta el tope de creativos de la plantilla. */
  const handleArchivos = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    const enCola = subidas.filter((s) => !s.error).length;
    const libres = MAX_IMAGENES - form.imagenes.length - enCola;
    if (libres <= 0) {
      swalWarn(`Máximo ${MAX_IMAGENES} creativos por plantilla.`);
      return;
    }
    const aceptados = files.slice(0, libres);
    if (files.length > libres) {
      swalWarn(
        `Solo caben ${libres} creativo${libres > 1 ? "s" : ""} más (máximo ${MAX_IMAGENES}); se tomaron los primeros ${libres}.`,
      );
    }
    const nuevas = aceptados.map((file) => {
      const esVideo = String(file.type).startsWith("video/");
      const mb = file.size / (1024 * 1024);
      const maxMb = esVideo ? MAX_VIDEO_MB : MAX_IMAGEN_MB;
      // El peso se valida ANTES de subir: el aviso sale al instante y con el
      // nombre del archivo, en vez de esperar a que el servidor lo rechace.
      const error =
        mb > maxMb
          ? `Pesa ${mb.toFixed(0)} MB y el máximo es ${maxMb} MB. ${
              esVideo
                ? "Exporta el video en 1080p con menos calidad o recórtalo: un anuncio de 15-30 s debería pesar 10-20 MB."
                : "Guarda la imagen en JPG con menos calidad."
            }`
          : null;
      return {
        uid: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        nombre: file.name,
        tipo: esVideo ? "video" : "imagen",
        pct: 0,
        local_url: URL.createObjectURL(file),
        error,
        pesado: esVideo && !error && mb > AVISO_VIDEO_MB,
        mb,
        file,
      };
    });
    setSubidas((arr) => [...arr, ...nuevas]);
    // Videos pesados: se suben igual, solo se avisa una vez que tardarán.
    const pesados = nuevas.filter((s) => s.pesado);
    if (pesados.length) {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "info",
        title: `${pesados.length} video${pesados.length > 1 ? "s" : ""} de más de ${AVISO_VIDEO_MB} MB`,
        text: "Se subirán completos, pero tardarán más. Si puedes, exporta en 1080p con menos calidad.",
        showConfirmButton: false,
        timer: 6000,
      });
    }
    const pendientes = nuevas.filter((s) => !s.error);
    let i = 0;
    const worker = async () => {
      while (i < pendientes.length) {
        const s = pendientes[i++];
        await subirUno(s);
      }
    };
    await Promise.all(
      Array.from(
        { length: Math.min(SUBIDAS_PARALELAS, pendientes.length) },
        worker,
      ),
    );
  };

  // "Lanzar al terminar la subida": con 8 videos el cliente no tiene que
  // quedarse mirando la barra; deja el clic dado y el lanzamiento se
  // dispara solo cuando el último archivo termina (la pestaña debe seguir
  // abierta: los archivos viven en el navegador hasta que suben).
  const [lanzarAlTerminar, setLanzarAlTerminar] = useState(false);
  useEffect(() => {
    if (!lanzarAlTerminar || subiendoImg || guardando) return;
    setLanzarAlTerminar(false);
    if (subidas.some((s) => s.error)) {
      Swal.fire({
        icon: "warning",
        title: "Algunos archivos no se cargaron",
        text: "La campaña no se lanzó. Revisa los archivos marcados en rojo en el paso 3 (reintentar o quitar) y vuelve a pulsar Guardar y lanzar.",
        confirmButtonText: "Entendido",
        customClass: { popup: "rounded-2xl" },
      });
      return;
    }
    guardar({ lanzarDespues: true });
  }, [lanzarAlTerminar, subiendoImg, guardando, subidas]);

  // Al dejar el lanzamiento en espera se guarda la plantilla de inmediato
  // (con los creativos que ya subieron) para que, si cierra la pestaña, no
  // pierda el trabajo: solo le faltarán los archivos que no alcanzaron.
  const programarLanzamiento = async () => {
    if (!validarPaso(1) || !validarPaso(2)) return;
    const { isConfirmed } = await Swal.fire({
      icon: "info",
      title: "La campaña se lanzará al finalizar la carga",
      html: `Faltan <strong>${subidas.filter((s) => !s.error).length}</strong> archivo(s) por cargar. Cuando termine el último, la campaña se creará automáticamente en tu cuenta.<br/><br/>
        <span style="color:#b91c1c;font-weight:700;">Mantén esta pestaña abierta.</span> Si la cierras, los archivos pendientes no se cargan y la campaña no se lanza; la plantilla queda guardada con lo que ya subió.`,
      showCancelButton: true,
      confirmButtonText: "Entendido, dejar en espera",
      cancelButtonText: "Volver",
      customClass: { popup: "rounded-2xl" },
    });
    if (!isConfirmed) return;
    setLanzarAlTerminar(true);
    guardar({ silencioso: true });
  };

  // Aviso nativo del navegador al intentar cerrar o recargar con cargas en
  // curso o un lanzamiento en espera.
  useEffect(() => {
    if (!subiendoImg && !lanzarAlTerminar) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [subiendoImg, lanzarAlTerminar]);

  const reintentarSubida = (uid) => {
    const s = subidas.find((x) => x.uid === uid);
    if (!s) return;
    setSubidas((arr) =>
      arr.map((x) => (x.uid === uid ? { ...x, error: null, pct: 0 } : x)),
    );
    subirUno({ ...s, error: null, pct: 0 });
  };

  const quitarSubida = (uid) =>
    setSubidas((arr) => arr.filter((x) => x.uid !== uid));

  // La miniatura real solo existe cuando Meta terminó de procesar el video
  // (status "ready"); antes devuelve un cuadro gris de relleno que hacía
  // creer que el video se había dañado. Se pide cada 8 s hasta 3 minutos;
  // mientras tanto la tarjeta muestra el propio video del cliente.
  const reintentarMiniatura = (video_id, intentos = 22) => {
    let n = 0;
    const tick = async () => {
      n += 1;
      try {
        const info = await fetchVideoInfo(id_configuracion, video_id);
        if (info?.picture && info?.status === "ready") {
          setForm((f) => ({
            ...f,
            imagenes: f.imagenes.map((img) =>
              img.tipo === "video" && img.video_id === video_id && !img.thumb_url
                ? { ...img, thumb_url: info.picture, url: info.picture }
                : img,
            ),
          }));
          return;
        }
      } catch {
        /* se reintenta */
      }
      if (n < intentos) setTimeout(tick, 8000);
    };
    setTimeout(tick, 8000);
  };

  const quitarImagen = (idx) => {
    setForm((f) => ({
      ...f,
      imagenes: f.imagenes.filter((_, i) => i !== idx),
    }));
    setPreviewIdx((i) => (i >= idx && i > 0 ? i - 1 : i));
  };

  // silencioso: guarda sin toast ni cerrar el modal (respaldo mientras las
  // cargas siguen); deja el id en el form para que el guardado final
  // actualice la misma plantilla en vez de crear otra.
  const guardar = async ({ lanzarDespues = false, silencioso = false } = {}) => {
    if (!validarPaso(1) || !validarPaso(2)) return null;
    if (lanzarDespues && !form.imagenes.length) {
      swalWarn(
        "Para lanzar necesitas al menos una imagen del anuncio (paso 3).",
      );
      return null;
    }
    if (
      lanzarDespues &&
      !form.texto_principal.trim() &&
      !String(tituloEfectivo || "").trim()
    ) {
      swalWarn(
        "Para lanzar escribe al menos el texto o el título del anuncio.",
      );
      return null;
    }
    setGuardando(true);
    try {
      const { data } = await chatApi.post(
        "/meta_ads/launcher/plantillas/guardar",
        {
          ...form,
          id_configuracion,
          geo: form.geo,
          paises: form.geo.paises.join(","),
          inicio_at: form.inicio_at || null,
          titulo: tituloEfectivo,
          imagenes: form.imagenes,
          imagen_hash:
            form.imagenes.find((i) => i.tipo !== "video")?.hash || null,
          imagen_url: form.imagenes[0]?.url || null,
          page_name: paginaSel?.page_name || null,
          id_producto: form.id_producto || null,
        },
      );
      if (!data?.success) {
        Swal.fire({
          icon: "error",
          title: "No se pudo guardar",
          text: data?.message || "Inténtalo de nuevo.",
          customClass: { popup: "rounded-2xl" },
        });
        return null;
      }
      const idGuardado = data.id || form.id;
      if (idGuardado && !form.id) {
        setForm((f) => ({ ...f, id: idGuardado }));
      }

      if (silencioso) return idGuardado;

      if (!lanzarDespues) {
        await Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "Plantilla guardada",
          showConfirmButton: false,
          timer: 2000,
        });
        onClose?.(true);
        return idGuardado;
      }

      // Guardar y lanzar de una vez. El lanzamiento crea 1 anuncio por
      // creativo y con 7-10 videos supera los 30 s del timeout global del
      // axios: va con timeout propio y su propio manejo de error — la
      // plantilla YA quedó guardada y no debe reportarse como "no se pudo
      // guardar" (eso confundía: el error salía y la campaña sí se creaba).
      let lanzo;
      try {
        lanzo = await chatApi.post(
          "/meta_ads/launcher/lanzar",
          {
            id_configuracion,
            id_plantilla: idGuardado,
            estado: form.estado_inicial,
          },
          { timeout: 300000, silentError: true },
        );
      } catch (err) {
        const seAgoto = err?.code === "ECONNABORTED";
        await Swal.fire({
          icon: seAgoto ? "info" : "error",
          title: seAgoto
            ? "La plantilla se guardó; Meta sigue procesando el lanzamiento"
            : "La plantilla se guardó, pero el lanzamiento falló",
          text: seAgoto
            ? "En un minuto revisa el centro de campañas o la bitácora: ahí aparecerá la campaña creada o el error de Meta. No vuelvas a lanzar todavía para no duplicarla."
            : err?.response?.data?.message ||
              "Inténtalo de nuevo desde el botón Lanzar de la plantilla.",
          confirmButtonText: "Entendido",
          customClass: { popup: "rounded-2xl" },
        });
        onClose?.(true);
        return idGuardado;
      }
      if (lanzo.data?.success) {
        const nAds = lanzo.data.data.ads?.length || 1;
        const wa = lanzo.data.data.whatsapp_numero;
        await Swal.fire({
          icon: "success",
          title:
            form.estado_inicial === "ACTIVE"
              ? "¡Campaña lanzada!"
              : "Campaña creada en pausa",
          html: `Se ${nAds > 1 ? `crearon ${nAds} anuncios` : "creó 1 anuncio"} en tu cuenta.${
            wa
              ? `<br/><span style="font-size:12px;color:#475569;">Los mensajes del anuncio llegarán a tu WhatsApp <strong>${wa}</strong>.</span>`
              : ""
          }<br/>
            <a href="${lanzo.data.data.ads_manager_url}" target="_blank" rel="noreferrer"
               style="color:#4f46e5;font-weight:600;">Verla en el Ads Manager →</a>`,
          confirmButtonText: "Listo",
          customClass: { popup: "rounded-2xl" },
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "La plantilla se guardó, pero Meta rechazó el lanzamiento",
          text:
            lanzo.data?.message ||
            "Revisa la plantilla e inténtalo de nuevo.",
          customClass: { popup: "rounded-2xl" },
        });
      }
      onClose?.(true);
      return idGuardado;
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          err?.response?.data?.message || "No se pudo guardar la plantilla.",
        customClass: { popup: "rounded-2xl" },
      });
      return null;
    } finally {
      setGuardando(false);
    }
  };

  const inputCls =
    "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300";
  const labelCls = "block text-[11px] font-bold text-slate-600 mb-1.5";
  const chipCls = (activo) =>
    `px-3.5 py-2 rounded-full text-[11px] font-semibold border transition ${
      activo
        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
        : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300"
    }`;

  const resumenIncluidas =
    form.geo.modo === "especifico"
      ? form.geo.lugares.map((l) => l.name).join(", ")
      : form.geo.paises
          .map(
            (c) => PAISES_SUGERIDOS.find((p) => p.code === c)?.label || c,
          )
          .join(", ");
  const resumenExcluidas = (form.geo.excluir || [])
    .map((l) => l.name)
    .join(", ");
  const resumenAlcance = resumenExcluidas
    ? `${resumenIncluidas} (excepto ${resumenExcluidas})`
    : resumenIncluidas;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-3">
      <div className="w-full max-w-7xl h-[94vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* HEADER */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#0B1426] via-[#1a1040] to-[#4f46e5] text-white px-5 py-4 flex items-center justify-between">
          <div className="absolute -top-16 -right-16 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 grid place-items-center">
              <i className="bx bx-rocket text-xl" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold leading-tight">
                {form.id ? "Editar plantilla" : "Nueva plantilla de campaña"}
              </h2>
              <p className="text-[10px] text-white/60">
                Anuncio click-to-WhatsApp en{" "}
                {contexto?.ad_account_name || "tu cuenta publicitaria"}
              </p>
            </div>
          </div>
          <button
            onClick={() => onClose?.(false)}
            className="relative p-2 rounded-lg hover:bg-white/10 transition"
          >
            <i className="bx bx-x text-xl" />
          </button>
        </div>

        {/* STEPPER */}
        <div className="flex border-b border-slate-100 bg-white">
          {PASOS.map((p) => (
            <button
              key={p.n}
              onClick={() => p.n < step && irA(p.n)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-[11px] font-bold border-b-2 transition ${
                step === p.n
                  ? "border-indigo-600 text-indigo-700"
                  : p.n < step
                    ? "border-emerald-500 text-emerald-600"
                    : "border-transparent text-slate-400"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full grid place-items-center text-[10px] ${
                  step === p.n
                    ? "bg-indigo-600 text-white"
                    : p.n < step
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                {p.n < step ? <i className="bx bx-check" /> : p.n}
              </span>
              <span className="hidden sm:inline">{p.label}</span>
            </button>
          ))}
        </div>

        {/* BODY: tarjetas de sección a la izquierda + preview viva a la derecha */}
        <div className="flex-1 flex overflow-hidden">
          <div
            ref={bodyRef}
            className="flex-1 overflow-y-auto bg-slate-50/80 px-4 sm:px-6 py-5"
          >
            {/* ── PASO 1: Página, campaña y producto ── */}
            {step === 1 && (
              <div className="min-h-full flex flex-col gap-4">
                <Seccion
                  icon="bxl-facebook-circle"
                  titulo="Página de Facebook"
                  desc="El anuncio sale a nombre de esta página; debe tener tu WhatsApp vinculado en Meta."
                >
                  {paginas.length > 0 && !paginaManual ? (
                    <>
                      <select
                        className={inputCls}
                        value={form.page_id}
                        onChange={(e) => set("page_id", e.target.value)}
                      >
                        {paginas.map((p) => (
                          <option key={p.page_id} value={p.page_id}>
                            {p.page_name}
                          </option>
                        ))}
                      </select>
                      {paginaSel?.origen === "ads_existentes" && (
                        <p className="text-[10px] text-amber-600 mt-1.5 leading-relaxed">
                          Página detectada en tus anuncios existentes (el
                          nombre no es legible con tu acceso). Si Meta rechaza
                          el lanzamiento por permisos de página, asígnala
                          {contexto?.titular_token?.name
                            ? ` al usuario del sistema "${contexto.titular_token.name}"`
                            : " a tu acceso"}{" "}
                          en el Business Manager con permiso de crear anuncios.
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setPaginaManual(true);
                          set("page_id", "");
                        }}
                        className="mt-1.5 text-[10px] font-semibold text-indigo-600 hover:underline"
                      >
                        ¿No está tu página? Ingresa el ID manualmente
                      </button>
                    </>
                  ) : (
                    <>
                      {paginas.length === 0 && (
                        <div className="mb-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-[11px] text-amber-700 leading-relaxed">
                          Tu conexión de anuncios no puede listar tus páginas
                          de Facebook: la página no está asignada a ese acceso.
                          {contexto?.titular_token?.name ? (
                            <>
                              {" "}
                              En el Business Manager donde vive el usuario del
                              sistema{" "}
                              <strong>
                                "{contexto.titular_token.name}"
                              </strong>{" "}
                              ve a Usuarios del sistema → Asignar activos →
                              Páginas, elige tu página y activa{" "}
                              <strong>Crear anuncios</strong>. Con eso
                              aparecerá aquí sola.
                            </>
                          ) : (
                            <>
                              {" "}
                              Asígnala al mismo acceso en el Business Manager
                              para que aparezca sola.
                            </>
                          )}{" "}
                          Mientras tanto puedes pegar el{" "}
                          <strong>ID de tu página</strong> aquí abajo.
                        </div>
                      )}
                      <input
                        className={inputCls}
                        value={form.page_id}
                        onChange={(e) =>
                          set("page_id", e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="ID numérico de tu página (ej: 1206812305850873)"
                        inputMode="numeric"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Lo encuentras en tu página de Facebook → Configuración
                        → Transparencia de la página → ID de la página.
                      </p>
                      {paginas.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setPaginaManual(false);
                            set("page_id", paginas[0]?.page_id || "");
                          }}
                          className="mt-1 text-[10px] font-semibold text-indigo-600 hover:underline"
                        >
                          Volver a la lista de páginas
                        </button>
                      )}
                    </>
                  )}
                </Seccion>

                <Seccion
                  icon="bx-purchase-tag"
                  titulo="Datos de la campaña"
                  desc="Cómo la vas a identificar en tu lista y en el Ads Manager."
                >
                  <input
                    className={inputCls}
                    value={form.nombre}
                    onChange={(e) => set("nombre", e.target.value)}
                    placeholder="Ej: Faja reductora · lanzamiento EC"
                    maxLength={150}
                  />
                </Seccion>

                <Seccion
                  icon="bx-box"
                  titulo="Producto de Imporchat"
                  desc="El título del anuncio se fija al nombre del producto: así tu bot detecta qué vendes desde el anuncio mismo."
                  className="flex-1"
                >
                  {productoSel ? (
                    <div className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5">
                      {productoSel.imagen_url ? (
                        <img
                          src={productoSel.imagen_url}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-white grid place-items-center text-indigo-300">
                          <i className="bx bx-box" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-indigo-700 truncate">
                          {productoSel.nombre}
                        </p>
                        <p className="text-[10px] text-indigo-400">
                          Este será el título del anuncio y el ancla del bot.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          set("id_producto", "");
                          setBuscaProducto("");
                        }}
                        className="p-1 rounded-lg text-indigo-400 hover:bg-indigo-100 transition"
                        title="Quitar producto"
                      >
                        <i className="bx bx-x text-lg" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <i className="bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          className={`${inputCls} pl-9`}
                          value={buscaProducto}
                          onChange={(e) => setBuscaProducto(e.target.value)}
                          placeholder={`Busca entre tus ${productos.length} productos...`}
                        />
                      </div>
                      {productos.length > 0 && (
                        <div className="mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-50 bg-white">
                          {productosFiltrados.length === 0 ? (
                            <p className="px-3 py-3 text-[11px] text-slate-400">
                              Sin resultados para "{buscaProducto}".
                            </p>
                          ) : (
                            productosFiltrados.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => set("id_producto", p.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-indigo-50 transition"
                              >
                                {p.imagen_url ? (
                                  <img
                                    src={p.imagen_url}
                                    alt=""
                                    className="w-7 h-7 rounded-lg object-cover"
                                  />
                                ) : (
                                  <div className="w-7 h-7 rounded-lg bg-slate-100 grid place-items-center text-slate-300">
                                    <i className="bx bx-box" />
                                  </div>
                                )}
                                <span className="text-xs font-semibold text-slate-700 truncate">
                                  {p.nombre}
                                </span>
                              </button>
                            ))
                          )}
                          {productosFiltrados.length === 30 && (
                            <p className="px-3 py-1.5 text-[10px] text-slate-400 bg-slate-50">
                              Mostrando 30 resultados — sigue escribiendo para
                              afinar.
                            </p>
                          )}
                        </div>
                      )}
                      <p className="text-[10px] text-slate-400 mt-1.5">
                        Sin producto vinculado el bot dependerá solo del texto
                        del anuncio — muy recomendado elegir uno.
                      </p>
                    </>
                  )}
                </Seccion>
              </div>
            )}

            {/* ── PASO 2: Presupuesto y alcance ── */}
            {step === 2 && (
              <div className="min-h-full grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                <div className="flex flex-col gap-4">
                  <Seccion
                    icon="bx-dollar-circle"
                    titulo="Presupuesto diario"
                    desc="Cuánto invierte Meta por día. Lo pausas cuando quieras."
                  >
                    <div className="relative mb-2.5">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">
                        $
                      </span>
                      <input
                        type="number"
                        min="1"
                        step="0.5"
                        className={`${inputCls} pl-7`}
                        value={form.presupuesto_diario}
                        onChange={(e) =>
                          set("presupuesto_diario", e.target.value)
                        }
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[3, 5, 10, 20].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => set("presupuesto_diario", v)}
                          className={chipCls(
                            Number(form.presupuesto_diario) === v,
                          )}
                        >
                          ${v}/día
                        </button>
                      ))}
                    </div>
                    {Number(form.presupuesto_diario) >= 1 && (
                      <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                        <i className="bx bx-calendar mr-1" />≈{" "}
                        <strong>
                          {(Number(form.presupuesto_diario) * 30).toFixed(0)}{" "}
                          {currency}/mes
                        </strong>{" "}
                        si la dejas corriendo. Si subes varias imágenes, Meta
                        reparte este presupuesto entre ellas.
                      </div>
                    )}
                  </Seccion>

                  <Seccion
                    icon="bx-group"
                    titulo="Público"
                    desc="Edad y género de quienes verán el anuncio."
                    className="flex-1"
                  >
                    <label className={labelCls}>Edad</label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {PRESETS_EDAD.map((pr) => (
                        <button
                          key={pr.label}
                          type="button"
                          onClick={() => {
                            set("edad_min", pr.min);
                            set("edad_max", pr.max);
                          }}
                          className={chipCls(
                            Number(form.edad_min) === pr.min &&
                              Number(form.edad_max) === pr.max,
                          )}
                        >
                          {pr.label}
                        </button>
                      ))}
                    </div>
                    <div className="rounded-xl bg-slate-50 ring-1 ring-slate-100 p-3 mb-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <input
                            type="number"
                            min="18"
                            max="65"
                            className={inputCls}
                            value={form.edad_min}
                            onChange={(e) => set("edad_min", e.target.value)}
                          />
                          <p className="text-[9px] text-slate-400 mt-0.5">
                            Mínima
                          </p>
                        </div>
                        <div>
                          <input
                            type="number"
                            min="18"
                            max="65"
                            className={inputCls}
                            value={form.edad_max}
                            onChange={(e) => set("edad_max", e.target.value)}
                          />
                          <p className="text-[9px] text-slate-400 mt-0.5">
                            Máxima
                          </p>
                        </div>
                      </div>
                    </div>
                    <label className={labelCls}>Género</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { v: "all", label: "Todos", icon: "bx-group" },
                        { v: "male", label: "Hombres", icon: "bx-male" },
                        { v: "female", label: "Mujeres", icon: "bx-female" },
                      ].map((g) => (
                        <button
                          key={g.v}
                          type="button"
                          onClick={() => set("genero", g.v)}
                          className={`py-3 rounded-xl border text-center transition ${
                            form.genero === g.v
                              ? "bg-indigo-600 text-white border-indigo-600 shadow"
                              : "bg-slate-50 text-slate-500 border-slate-200 hover:border-indigo-300"
                          }`}
                        >
                          <i className={`bx ${g.icon} text-xl block mb-0.5`} />
                          <span className="text-[10px] font-bold">
                            {g.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </Seccion>
                </div>

                <Seccion
                  icon="bx-map"
                  titulo="¿Dónde se muestra el anuncio?"
                  desc="País completo para volumen, o solo las zonas donde tu transportadora entrega bien."
                  className="h-full"
                >
                  <div className="flex gap-1.5 mb-3">
                    <button
                      type="button"
                      onClick={() => setGeo({ modo: "paises" })}
                      className={chipCls(form.geo.modo === "paises")}
                    >
                      <i className="bx bx-globe mr-1" />
                      Países completos
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setGeo({ modo: "especifico", paises: [paisBase] })
                      }
                      className={chipCls(form.geo.modo === "especifico")}
                    >
                      <i className="bx bx-map-pin mr-1" />
                      Provincias / ciudades
                    </button>
                  </div>

                  {form.geo.modo === "paises" ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {PAISES_SUGERIDOS.map((p) => {
                        const activo = form.geo.paises.includes(p.code);
                        return (
                          <button
                            key={p.code}
                            type="button"
                            onClick={() => togglePais(p.code)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition ${
                              activo
                                ? "bg-indigo-600 text-white border-indigo-600 shadow"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300"
                            }`}
                          >
                            <span className="text-lg leading-none">
                              {p.flag}
                            </span>
                            <span className="flex-1 text-[11px] font-bold truncate">
                              {p.label}
                            </span>
                            <i
                              className={`bx ${
                                activo
                                  ? "bx-check-circle text-white"
                                  : "bx-circle text-slate-300"
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <select
                          className={`${inputCls} !w-36`}
                          value={paisBase}
                          onChange={(e) =>
                            setGeo({
                              paises: [e.target.value],
                              lugares: [],
                              excluir: [],
                            })
                          }
                        >
                          {PAISES_SUGERIDOS.map((p) => (
                            <option key={p.code} value={p.code}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                        <div className="relative flex-1">
                          <i
                            className={`bx ${geoBuscando ? "bx-loader-alt animate-spin" : "bx-search"} absolute left-3 top-1/2 -translate-y-1/2 text-slate-400`}
                          />
                          <input
                            className={`${inputCls} pl-9`}
                            value={geoQ}
                            onChange={(e) => setGeoQ(e.target.value)}
                            placeholder="Busca provincia o ciudad (ej: Pichincha, Quito...)"
                          />
                        </div>
                      </div>
                      {/* Resultados en línea como chips seleccionables — sin
                          dropdown flotante que obligue a scrollear */}
                      {geoQ.trim().length >= 2 && (
                        <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                          {geoResultados.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {geoResultados.map((l) => (
                                <button
                                  key={l.key}
                                  type="button"
                                  onClick={() => agregarLugar(l)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border bg-white text-slate-600 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition"
                                >
                                  <i
                                    className={`bx ${l.type === "region" ? "bx-map-alt text-blue-500" : "bx-map-pin text-indigo-500"}`}
                                  />
                                  {l.name}
                                  <span
                                    className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold ${
                                      l.type === "region"
                                        ? "bg-blue-50 text-blue-600"
                                        : "bg-indigo-50 text-indigo-600"
                                    }`}
                                  >
                                    {l.type === "region" ? "Provincia" : "Ciudad"}
                                  </span>
                                  <i className="bx bx-plus text-indigo-400" />
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 px-1">
                              {geoBuscando
                                ? "Buscando zonas..."
                                : `Sin resultados para "${geoQ}".`}
                            </p>
                          )}
                        </div>
                      )}
                      {form.geo.lugares.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {form.geo.lugares.map((l) => (
                            <span
                              key={l.key}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-indigo-600 text-white text-[11px] font-semibold"
                            >
                              <i
                                className={`bx ${l.type === "region" ? "bx-map-alt" : "bx-map-pin"}`}
                              />
                              {l.name}
                              <button
                                type="button"
                                onClick={() => quitarLugar(l.key)}
                                className="ml-0.5 hover:text-indigo-200"
                              >
                                <i className="bx bx-x" />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400">
                          Agrega las provincias o ciudades donde entregas.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Zonas excluidas: aplica en los dos modos */}
                  <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50/40 p-3">
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div>
                        <p className="text-[11px] font-bold text-slate-700">
                          <i className="bx bx-minus-circle text-rose-500 mr-1" />
                          Zonas donde NO mostrar el anuncio
                          <span className="ml-1.5 text-[9px] font-semibold text-slate-400">
                            opcional
                          </span>
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Donde tu transportadora no llega o devuelve mucho.
                          Búscalas una por una o agrega tu lista completa de
                          una vez.
                        </p>
                      </div>
                      {form.geo.excluir.length > 0 && (
                        <span className="shrink-0 px-2 py-1 rounded-full bg-rose-600 text-white text-[9px] font-bold">
                          {form.geo.excluir.length} excluida
                          {form.geo.excluir.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {form.geo.modo === "paises" &&
                        form.geo.paises.length > 1 && (
                          <select
                            className={`${inputCls} !w-32`}
                            value={paisExcluir}
                            onChange={(e) => setExcluirPais(e.target.value)}
                          >
                            {form.geo.paises.map((c) => (
                              <option key={c} value={c}>
                                {PAISES_SUGERIDOS.find((p) => p.code === c)
                                  ?.label || c}
                              </option>
                            ))}
                          </select>
                        )}
                      <div className="relative flex-1 min-w-[200px]">
                        <i
                          className={`bx ${excluirBuscando ? "bx-loader-alt animate-spin" : "bx-search"} absolute left-3 top-1/2 -translate-y-1/2 text-slate-400`}
                        />
                        <input
                          className={`${inputCls} pl-9`}
                          value={excluirQ}
                          onChange={(e) => setExcluirQ(e.target.value)}
                          placeholder="Busca una zona (ej: Galápagos)"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setExcluirRevision(null);
                          setExcluirMasivoOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition shrink-0"
                        title="Escribe o pega tu lista completa de zonas"
                      >
                        <i className="bx bx-list-plus text-base" />
                        Agregar varias de una vez
                      </button>
                    </div>

                    {/* Atajos: listas guardadas, copiar de otra plantilla,
                        guardar las actuales */}
                    {(geoListas.length > 0 ||
                      sugerenciaExcluir ||
                      form.geo.excluir.length > 0) && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                      {geoListas.length > 0 && (
                        <select
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-200"
                          value=""
                          onChange={(e) => {
                            if (e.target.value === "__eliminar") eliminarGeoLista();
                            else if (e.target.value) aplicarGeoLista(e.target.value);
                          }}
                        >
                          <option value="">Usar lista guardada…</option>
                          {geoListas.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.nombre} ({l.lugares.length})
                              {l.global ? " · sugerida" : ""}
                            </option>
                          ))}
                          {geoListas.some((l) => !l.global) && (
                            <option value="__eliminar">Eliminar una lista…</option>
                          )}
                        </select>
                      )}
                      {form.geo.excluir.length > 0 && (
                        <button
                          type="button"
                          onClick={guardarComoLista}
                          className={toolBtnCls(false)}
                          title="Guarda estas zonas para reutilizarlas en otras plantillas"
                        >
                          <i className="bx bx-bookmark-plus" />
                          Guardar como lista
                        </button>
                      )}
                      {sugerenciaExcluir && (
                        <button
                          type="button"
                          onClick={() => {
                            const n = agregarExcluirVarias(sugerenciaExcluir.excluir);
                            toastZonas(`${n} zona${n === 1 ? "" : "s"} copiada${n === 1 ? "" : "s"}`);
                          }}
                          className={toolBtnCls(false)}
                          title={`Copiar las zonas excluidas de "${sugerenciaExcluir.nombre}"`}
                        >
                          <i className="bx bx-copy" />
                          Copiar de «{sugerenciaExcluir.nombre.slice(0, 26)}
                          {sugerenciaExcluir.nombre.length > 26 ? "…" : ""}» (
                          {sugerenciaExcluir.excluir.length})
                        </button>
                      )}
                    </div>
                    )}
                    {excluirQ.trim().length >= 2 && (
                      <div className="mt-2 rounded-xl border border-slate-200 bg-white p-2.5">
                        {excluirResultados.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {excluirResultados.map((l) => (
                              <button
                                key={l.key}
                                type="button"
                                onClick={() => agregarExcluir(l)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border bg-white text-slate-600 border-slate-200 hover:border-rose-400 hover:bg-rose-50 transition"
                              >
                                <i
                                  className={`bx ${l.type === "region" ? "bx-map-alt" : "bx-map-pin"} text-rose-400`}
                                />
                                {l.name}
                                <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-slate-100 text-slate-500">
                                  {l.type === "region" ? "Provincia" : "Ciudad"}
                                </span>
                                <i className="bx bx-minus text-rose-400" />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 px-1">
                            {excluirBuscando
                              ? "Buscando zonas..."
                              : `Sin resultados para "${excluirQ}".`}
                          </p>
                        )}
                      </div>
                    )}
                    {form.geo.excluir.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                        <button
                          type="button"
                          onClick={() => setGeo({ excluir: [] })}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white ring-1 ring-rose-200 text-rose-600 text-[11px] font-semibold hover:bg-rose-50"
                          title="Volver a incluir todas las zonas"
                        >
                          <i className="bx bx-eraser" />
                          Quitar todas ({form.geo.excluir.length})
                        </button>
                        {form.geo.excluir.map((l) => (
                          <span
                            key={l.key}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-rose-600 text-white text-[11px] font-semibold"
                          >
                            <i
                              className={`bx ${l.type === "region" ? "bx-map-alt" : "bx-map-pin"}`}
                            />
                            {l.name}
                            <button
                              type="button"
                              onClick={() => quitarExcluir(l.key)}
                              className="ml-0.5 hover:text-rose-200"
                              title="Volver a incluir"
                            >
                              <i className="bx bx-x" />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 mt-2">
                        Todavía no excluyes ninguna zona: el anuncio se mostrará
                        en todo el alcance elegido arriba.
                      </p>
                    )}
                  </div>

                  {/* Tips de alcance: llenan la columna con criterio real */}
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      [
                        "bx-globe",
                        "País completo",
                        "Máximo volumen para contra entrega: Meta busca al comprador en todo el país.",
                      ],
                      [
                        "bx-map-pin",
                        "Zonas puntuales",
                        "Apunta solo donde tu transportadora entrega rápido: menos devoluciones.",
                      ],
                      [
                        "bx-brain",
                        "Meta optimiza",
                        "Dentro de la zona elegida, el algoritmo aprende solo quién sí compra.",
                      ],
                    ].map(([icon, t, d]) => (
                      <div
                        key={t}
                        className="rounded-xl bg-slate-50 ring-1 ring-slate-100 px-3 py-2.5"
                      >
                        <p className="text-[10px] font-bold text-slate-600">
                          <i className={`bx ${icon} text-indigo-500 mr-1`} />
                          {t}
                        </p>
                        <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed">
                          {d}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Recap del alcance — siempre visible al pie de la tarjeta */}
                  <div className="mt-4 rounded-xl bg-indigo-50/70 ring-1 ring-indigo-100 px-3.5 py-3 text-[11px] text-indigo-700 leading-relaxed">
                    <i className="bx bx-map-pin mr-1" />
                    Tu anuncio se mostrará en:{" "}
                    <strong>{resumenAlcance || "— elige al menos una zona"}</strong>
                    {" · "}
                    {form.edad_min}-{form.edad_max} años ·{" "}
                    {GENERO_LABEL[form.genero]}
                  </div>
                </Seccion>
              </div>
            )}

            {/* ── PASO 3: Creativos ── */}
            {step === 3 && (
              <div className="min-h-full grid grid-cols-1 md:grid-cols-5 gap-4 items-stretch">
                <div className="md:col-span-2 flex flex-col gap-4">
                  <Seccion
                    icon="bx-images"
                    titulo={`Creativos (${form.imagenes.length}/${MAX_IMAGENES})`}
                    desc="Cada imagen o video = un anuncio. Meta reparte el presupuesto y deja corriendo el ganador."
                    className="flex-1"
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
                      className="hidden"
                      onChange={handleArchivos}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      {form.imagenes.map((img, idx) => (
                        <div
                          key={img.hash || img.video_id || idx}
                          className="relative rounded-xl overflow-hidden border border-slate-200 group cursor-zoom-in"
                          onClick={() => {
                            setPreviewIdx(idx);
                            setLightbox(img);
                          }}
                          title={
                            img.tipo === "video"
                              ? "Reproducir video"
                              : "Ver en grande"
                          }
                        >
                          {img.tipo === "video" && img.local_url ? (
                            // Video recién subido: se muestra el propio archivo
                            // del cliente (nunca la miniatura provisional de Meta).
                            <video
                              src={img.local_url}
                              muted
                              playsInline
                              preload="metadata"
                              className="w-full aspect-square object-cover bg-slate-800"
                            />
                          ) : img.url ? (
                            <img
                              src={img.url}
                              alt={`Variación ${idx + 1}`}
                              className="w-full aspect-square object-cover bg-slate-800"
                              onError={(e) => {
                                // Miniatura caducada o gris: se oculta y queda el
                                // fondo con el ícono de reproducir.
                                e.currentTarget.style.visibility = "hidden";
                              }}
                            />
                          ) : (
                            <div className="w-full aspect-square bg-slate-800 grid place-items-center text-white/70">
                              <div className="text-center">
                                <i className="bx bx-video text-2xl" />
                                <p className="text-[8px] mt-1 font-semibold">
                                  Video listo
                                </p>
                              </div>
                            </div>
                          )}
                          {img.tipo === "video" && (
                            <span className="absolute inset-0 grid place-items-center pointer-events-none">
                              <span className="w-9 h-9 rounded-full bg-black/50 grid place-items-center text-white">
                                <i className="bx bx-play text-xl ml-0.5" />
                              </span>
                            </span>
                          )}
                          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[9px] font-bold">
                            V{idx + 1}
                            {img.tipo === "video" ? " · video" : ""}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              quitarImagen(idx);
                            }}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg bg-black/60 text-white grid place-items-center hover:bg-rose-600 transition"
                            title="Quitar creativo"
                          >
                            <i className="bx bx-trash text-xs" />
                          </button>
                        </div>
                      ))}
                      {/* Subidas en curso: una tarjeta por archivo con su
                          progreso; al terminar pasa a la lista de arriba */}
                      {subidas.map((s) => (
                        <div
                          key={s.uid}
                          className={`relative rounded-xl overflow-hidden border ${
                            s.error ? "border-rose-300" : "border-slate-200"
                          } bg-slate-800`}
                          title={s.nombre}
                        >
                          {s.tipo === "video" ? (
                            <video
                              src={s.local_url}
                              muted
                              playsInline
                              preload="metadata"
                              className="w-full aspect-square object-cover opacity-50"
                            />
                          ) : (
                            <img
                              src={s.local_url}
                              alt={s.nombre}
                              className="w-full aspect-square object-cover opacity-50"
                            />
                          )}
                          <div className="absolute inset-0 grid place-items-center text-white p-2">
                            {s.error ? (
                              // Solo el aviso corto: el detalle y las acciones
                              // van en la lista bajo la cuadrícula, legibles.
                              <div className="text-center">
                                <i className="bx bx-error-circle text-2xl text-rose-300" />
                                <p className="text-[9px] mt-1 font-bold">
                                  No se subió
                                </p>
                                <button
                                  type="button"
                                  onClick={() => quitarSubida(s.uid)}
                                  className="mt-1.5 px-2.5 py-1 rounded-md bg-white/90 text-slate-800 text-[9px] font-bold"
                                >
                                  Quitar
                                </button>
                              </div>
                            ) : (
                              <div className="text-center w-full">
                                <i className="bx bx-loader-alt animate-spin text-2xl" />
                                <p className="text-[9px] mt-1 font-bold">
                                  {s.pct >= 99 ? "Meta procesa…" : `${s.pct}%`}
                                </p>
                                <div className="mt-1.5 h-1 rounded-full bg-white/20 overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-400 transition-all"
                                    style={{ width: `${Math.max(3, s.pct)}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {form.imagenes.length + subidas.length < MAX_IMAGENES && (
                        <div
                          onClick={() => fileRef.current?.click()}
                          className="rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-300 cursor-pointer transition aspect-square grid place-items-center text-slate-400"
                        >
                          <div className="text-center">
                            <i className="bx bx-plus text-2xl" />
                            <p className="text-[9px] mt-1 font-semibold">
                              {form.imagenes.length + subidas.length === 0
                                ? "Imágenes o videos"
                                : "Añadir más"}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">
                      Puedes seleccionar <strong>varios archivos a la vez</strong>{" "}
                      (se suben {SUBIDAS_PARALELAS} en paralelo). Imágenes
                      1080×1080 (máx {MAX_IMAGEN_MB} MB) o videos MP4 verticales
                      (máx {MAX_VIDEO_MB} MB; lo ideal, 10-20 MB).
                      Hasta {MAX_IMAGENES} variaciones; probar 3-6 ángulos
                      distintos del producto es lo que mejor funciona. Toca un
                      creativo para verlo en grande o reproducir el video.
                    </p>
                    {subidas.some((s) => s.error) && (
                      <div className="mt-2 rounded-xl bg-rose-50 ring-1 ring-rose-100 p-3 space-y-2">
                        <p className="text-[11px] font-bold text-rose-700">
                          <i className="bx bx-error-circle mr-1" />
                          {subidas.filter((s) => s.error).length === 1
                            ? "Un archivo no se pudo subir"
                            : `${subidas.filter((s) => s.error).length} archivos no se pudieron subir`}
                        </p>
                        {subidas
                          .filter((s) => s.error)
                          .map((s) => (
                            <div
                              key={s.uid}
                              className="flex items-start gap-2 rounded-lg bg-white ring-1 ring-rose-100 p-2.5"
                            >
                              <i
                                className={`bx ${s.tipo === "video" ? "bx-video" : "bx-image"} text-rose-400 mt-0.5`}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-bold text-slate-700 truncate">
                                  {s.nombre}
                                </p>
                                <p className="text-[10px] text-slate-500 leading-snug">
                                  {s.error}
                                </p>
                              </div>
                              <div className="flex flex-col gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => reintentarSubida(s.uid)}
                                  className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[10px] font-bold hover:bg-indigo-700"
                                >
                                  Reintentar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => quitarSubida(s.uid)}
                                  className="px-2.5 py-1 rounded-lg bg-white ring-1 ring-slate-200 text-slate-600 text-[10px] font-bold hover:bg-slate-50"
                                >
                                  Quitar
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                    {subiendoImg && (
                      <div className="mt-2 rounded-xl bg-indigo-50 ring-1 ring-indigo-100 p-3 text-[10px] text-indigo-800 leading-relaxed">
                        <p className="font-bold">
                          <i className="bx bx-loader-alt animate-spin mr-1" />
                          Subiendo {subidas.filter((s) => !s.error).length} archivo
                          {subidas.filter((s) => !s.error).length > 1 ? "s" : ""}…
                        </p>
                        <p className="mt-0.5">
                          Puedes seguir con los textos y pasar al paso 4: allí
                          podrás dejar el lanzamiento en espera y se hará solo
                          cuando termine la carga.{" "}
                          <strong>
                            Mantén esta pestaña abierta: si la cierras, la carga
                            se cancela.
                          </strong>
                        </p>
                      </div>
                    )}
                  </Seccion>
                </div>

                <div className="md:col-span-3">
                  <Seccion
                    icon="bx-text"
                    titulo="Textos del anuncio"
                    desc="Los mismos textos para todas las variaciones — la imagen es lo que compite."
                    className="h-full"
                  >
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between">
                          <label className={labelCls}>Texto principal</label>
                          <span className="text-[9px] text-slate-300">
                            {form.texto_principal.length} caracteres
                          </span>
                        </div>
                        <textarea
                          className={`${inputCls} min-h-[130px]`}
                          value={form.texto_principal}
                          onChange={(e) =>
                            set("texto_principal", e.target.value)
                          }
                          placeholder={
                            "🔥 Luce 2 tallas menos al instante\n✅ Envío GRATIS y pago contra entrega\n📦 Stock limitado"
                          }
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          Gancho en la primera línea + beneficio + urgencia.
                          Los emojis suben el CTR.
                        </p>
                      </div>
                      <div>
                        <label className={labelCls}>Título del anuncio</label>
                        {productoSel ? (
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 flex items-start gap-2">
                            <i className="bx bx-lock-alt text-emerald-600 mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-emerald-800 truncate">
                                {productoSel.nombre}
                              </p>
                              <p className="text-[10px] text-emerald-600 leading-snug mt-0.5">
                                Fijado al nombre del producto en Imporchat: el
                                bot detecta qué vendes desde el anuncio, aunque
                                el cliente borre el mensaje. Para cambiarlo,
                                cambia el producto en el paso 1.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <input
                              className={inputCls}
                              value={form.titulo}
                              onChange={(e) => set("titulo", e.target.value)}
                              placeholder="Usa el nombre EXACTO del producto"
                              maxLength={255}
                            />
                            <p className="text-[10px] text-amber-600 mt-1">
                              Sin producto vinculado, escribe aquí el nombre
                              tal como está en Imporchat para que el bot lo
                              detecte por texto.
                            </p>
                          </>
                        )}
                      </div>
                      <div>
                        <label className={labelCls}>
                          Descripción (opcional)
                        </label>
                        <input
                          className={inputCls}
                          value={form.descripcion}
                          onChange={(e) => set("descripcion", e.target.value)}
                          placeholder="Ej: Pago contra entrega"
                          maxLength={255}
                        />
                      </div>

                      {/* Mensaje de entrada: va junto a los textos (y no en
                          la columna de creativos) para que no pase
                          desapercibido: es lo primero que recibe el bot. */}
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                        <div className="flex items-center justify-between">
                          <label className={`${labelCls} !mb-0 text-emerald-800`}>
                            <i className="bx bxl-whatsapp text-emerald-600 mr-1" />
                            Mensaje de entrada a WhatsApp
                          </label>
                          <span className="text-[9px] text-emerald-600 font-semibold">
                            lo escribe el cliente al tocar el anuncio
                          </span>
                        </div>
                        <textarea
                          className={`${inputCls} min-h-[60px] mt-1.5 border-emerald-200`}
                          value={form.mensaje_bienvenida}
                          onChange={(e) => {
                            mensajeManualRef.current = !!e.target.value.trim();
                            set("mensaje_bienvenida", e.target.value);
                          }}
                          placeholder={mensajeEntradaPorDefecto(productoSel?.nombre)}
                        />
                        <p className="text-[10px] text-emerald-700/80 mt-1 leading-snug">
                          {productoSel && !mensajeManualRef.current
                            ? "Se armó solo con el nombre de tu producto; puedes cambiarlo. "
                            : ""}
                          Se autocompleta en el chat cuando el cliente toca el
                          botón. Tu bot lo recibe como primer mensaje y
                          arranca la conversación al instante.
                        </p>
                      </div>
                    </div>
                  </Seccion>
                </div>
              </div>
            )}

            {/* ── PASO 4: Revisar y lanzar ── */}
            {step === 4 && (
              <div className="min-h-full flex flex-col gap-4">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                  <Seccion
                    icon="bx-clipboard"
                    titulo="Resumen de tu campaña"
                    desc="Revisa que todo esté como lo quieres."
                    className="h-full"
                  >
                    <div className="divide-y divide-slate-50">
                      {[
                        ["bx-purchase-tag", "Plantilla", form.nombre || "—"],
                        [
                          "bx-box",
                          "Producto",
                          productoSel?.nombre || "Sin vincular",
                        ],
                        [
                          "bxl-facebook-circle",
                          "Página",
                          paginaNombre || form.page_id || "—",
                        ],
                        ["bx-heading", "Título", tituloEfectivo || "—"],
                        [
                          "bx-images",
                          "Anuncios",
                          `${form.imagenes.length || 0} ${form.imagenes.length === 1 ? "variación" : "variaciones"}`,
                        ],
                        [
                          "bx-dollar-circle",
                          "Presupuesto",
                          `${Number(form.presupuesto_diario).toFixed(2)} ${currency}/día (≈ ${(Number(form.presupuesto_diario) * 30).toFixed(0)}/mes)`,
                        ],
                        ["bx-map", "Alcance", resumenAlcance || "—"],
                        [
                          "bx-group",
                          "Público",
                          `${form.edad_min}-${form.edad_max} años · ${GENERO_LABEL[form.genero]}`,
                        ],
                        [
                          "bx-calendar-event",
                          "Inicio",
                          form.inicio_at
                            ? form.inicio_at.replace("T", " · ")
                            : "De inmediato",
                        ],
                      ].map(([icon, k, v]) => (
                        <div
                          key={k}
                          className="flex items-center gap-3 py-2.5 text-xs"
                        >
                          <i
                            className={`bx ${icon} text-indigo-500 text-base`}
                          />
                          <span className="w-24 shrink-0 text-slate-400 font-semibold">
                            {k}
                          </span>
                          <span className="text-slate-700 font-bold min-w-0">
                            {v}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Seccion>

                  <div className="flex flex-col gap-4">
                    <Seccion
                      icon="bx-layer"
                      titulo="Qué se creará en tu cuenta"
                      desc="Con un solo click, el paquete completo."
                      className="flex-1"
                    >
                      <div className="space-y-3">
                        {[
                          [
                            "bx-folder",
                            "1 campaña",
                            "objetivo Mensajes (click-to-WhatsApp)",
                          ],
                          [
                            "bx-target-lock",
                            "1 conjunto de anuncios",
                            "con tu presupuesto y segmentación",
                          ],
                          [
                            "bx-image-alt",
                            `${form.imagenes.length || 1} anuncio${form.imagenes.length > 1 ? "s" : ""}`,
                            form.imagenes.length > 1
                              ? "una variación por imagen — Meta deja corriendo la ganadora"
                              : "con tu imagen, textos y botón de WhatsApp",
                          ],
                          [
                            "bx-link",
                            "Vínculo anuncio → producto",
                            "la atribución del bot queda activa de una",
                          ],
                          [
                            "bxl-whatsapp",
                            contexto?.whatsapp?.numero
                              ? `Mensajes a ${contexto.whatsapp.numero}`
                              : "Mensajes a tu WhatsApp conectado",
                            "el número de esta cuenta va fijado en el anuncio; si Meta no lo acepta, no se crea nada",
                          ],
                        ].map(([icon, t, d]) => (
                          <div key={t} className="flex items-start gap-2.5">
                            <div className="w-6 h-6 rounded-lg bg-emerald-50 grid place-items-center shrink-0 mt-0.5">
                              <i
                                className={`bx ${icon} text-emerald-600 text-sm`}
                              />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-700">
                                {t}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {d}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setReglasOpen(true)}
                        className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 ring-1 ring-indigo-200 hover:bg-indigo-100 transition"
                      >
                        <i className="bx bx-shield-quarter" />
                        {reglasActivas > 0
                          ? "Revisar reglas de optimización"
                          : "Aplicar reglas de optimización"}
                      </button>
                      <p
                        className={`mt-2 text-[10px] text-center font-semibold ${
                          reglasActivas > 0 ? "text-emerald-600" : "text-slate-400"
                        }`}
                      >
                        {reglasActivas === null ? (
                          "Cargando tus reglas..."
                        ) : reglasActivas > 0 ? (
                          <>
                            <i className="bx bx-check-circle mr-1" />
                            {reglasActivas} regla{reglasActivas > 1 ? "s" : ""}{" "}
                            activa{reglasActivas > 1 ? "s" : ""} cuidará
                            {reglasActivas > 1 ? "n" : ""} esta campaña
                          </>
                        ) : (
                          "Sin reglas: la campaña corre libre hasta que la pauses tú"
                        )}
                      </p>
                    </Seccion>

                    <Seccion
                      icon="bx-play-circle"
                      titulo="¿Cómo nace la campaña?"
                    >
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          {
                            v: "ACTIVE",
                            label: "Activa",
                            desc: "Pasa revisión de Meta y arranca sola (recomendado)",
                            icon: "bx-play-circle",
                          },
                          {
                            v: "PAUSED",
                            label: "En pausa",
                            desc: "Se crea apagada: no gasta hasta que la enciendas tú",
                            icon: "bx-pause-circle",
                          },
                        ].map((o) => (
                          <button
                            key={o.v}
                            type="button"
                            onClick={() => set("estado_inicial", o.v)}
                            className={`px-3.5 py-3 rounded-xl text-left border transition ${
                              form.estado_inicial === o.v
                                ? "bg-indigo-600 text-white border-indigo-600 shadow"
                                : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                            }`}
                          >
                            <p className="text-xs font-bold">
                              <i className={`bx ${o.icon} mr-1`} />
                              {o.label}
                            </p>
                            <p
                              className={`text-[10px] mt-0.5 ${form.estado_inicial === o.v ? "text-indigo-100" : "text-slate-400"}`}
                            >
                              {o.desc}
                            </p>
                          </button>
                        ))}
                      </div>
                    </Seccion>

                    <Seccion
                      icon="bx-calendar-event"
                      titulo="¿Cuándo arranca?"
                    >
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => set("inicio_at", "")}
                          className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold transition ${
                            !form.inicio_at
                              ? "bg-indigo-600 text-white border-indigo-600 shadow"
                              : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                          }`}
                        >
                          <i className="bx bx-run mr-1" />
                          De inmediato
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!form.inicio_at) {
                              set(
                                "inicio_at",
                                manianaA(HORA_LANZAMIENTO_POR_DEFECTO),
                              );
                            }
                          }}
                          className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold transition ${
                            form.inicio_at
                              ? "bg-indigo-600 text-white border-indigo-600 shadow"
                              : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                          }`}
                        >
                          <i className="bx bx-time-five mr-1" />
                          Programada
                        </button>
                      </div>
                      {form.inicio_at && (
                        <>
                          <input
                            type="datetime-local"
                            className={inputCls}
                            value={form.inicio_at}
                            onChange={(e) => set("inicio_at", e.target.value)}
                          />
                          <p className="text-[10px] text-slate-400 mt-1">
                            Hora local de tu cuenta publicitaria. La campaña
                            se crea ya (y pasa la revisión de Meta), pero el
                            conjunto empieza a mostrar anuncios a esta hora.
                          </p>
                        </>
                      )}

                      {/* Qué va a pasar exactamente con la combinación
                          elegida: sin esto, "programada + en pausa" se
                          leía como si fuera a arrancar sola. */}
                      {(() => {
                        const fecha = form.inicio_at
                          ? form.inicio_at.replace("T", " a las ")
                          : null;
                        const activa = form.estado_inicial === "ACTIVE";
                        if (activa && !fecha) {
                          return (
                            <div className="mt-3 rounded-xl bg-emerald-50 ring-1 ring-emerald-200 px-3 py-2.5 text-[11px] text-emerald-800 leading-relaxed">
                              <i className="bx bx-play-circle mr-1" />
                              <strong>Arranca sola:</strong> en cuanto Meta
                              apruebe los anuncios (normalmente en minutos u
                              horas) empieza a mostrarse y a gastar.
                            </div>
                          );
                        }
                        if (activa && fecha) {
                          return (
                            <div className="mt-3 rounded-xl bg-emerald-50 ring-1 ring-emerald-200 px-3 py-2.5 text-[11px] text-emerald-800 leading-relaxed">
                              <i className="bx bx-time-five mr-1" />
                              <strong>Arranca sola el {fecha}.</strong> Se crea
                              y pasa revisión ahora, pero no muestra anuncios
                              ni gasta antes de esa hora.
                            </div>
                          );
                        }
                        if (!activa && !fecha) {
                          return (
                            <div className="mt-3 rounded-xl bg-slate-50 ring-1 ring-slate-200 px-3 py-2.5 text-[11px] text-slate-600 leading-relaxed">
                              <i className="bx bx-pause-circle mr-1" />
                              <strong>Queda en pausa, como borrador:</strong>{" "}
                              no gasta nada. La enciendes desde el historial
                              de lanzamientos o el Ads Manager cuando quieras.
                            </div>
                          );
                        }
                        return (
                          <div className="mt-3 rounded-xl bg-amber-50 ring-1 ring-amber-200 px-3 py-2.5 text-[11px] text-amber-800 leading-relaxed">
                            <i className="bx bx-error mr-1" />
                            <strong>Ojo: no arrancará sola el {fecha}.</strong>{" "}
                            Está en pausa, así que aunque tenga hora programada
                            se queda apagada hasta que la enciendas tú. Si
                            quieres que arranque sola a esa hora, elígela
                            activa.
                            <button
                              type="button"
                              onClick={() => set("estado_inicial", "ACTIVE")}
                              className="mt-2 block w-full px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-amber-500 hover:bg-amber-600 transition"
                            >
                              <i className="bx bx-play-circle mr-1" />
                              Cambiar a activa y que arranque el {fecha}
                            </button>
                          </div>
                        );
                      })()}
                    </Seccion>
                  </div>
                </div>

                {/* Preview también inline en pantallas chicas */}
                <div className="lg:hidden">
                  <AdPreview
                    form={form}
                    paginaNombre={paginaNombre}
                    tituloEfectivo={tituloEfectivo}
                    creativoIdx={previewIdx}
                    onCambiarCreativo={setPreviewIdx}
                    onVerMedia={setLightbox}
                  />
                </div>
              </div>
            )}
          </div>

          {/* PANEL DERECHO: preview viva en todos los pasos */}
          <div className="hidden lg:block w-[330px] shrink-0 border-l border-slate-100 bg-white overflow-y-auto px-4 py-5">
            <AdPreview
              form={form}
              paginaNombre={paginaNombre}
              tituloEfectivo={tituloEfectivo}
              creativoIdx={previewIdx}
              onCambiarCreativo={setPreviewIdx}
              onVerMedia={setLightbox}
            />
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-5 py-3 border-t border-slate-100 bg-white flex items-center justify-between gap-3">
          <button
            onClick={() => (step > 1 ? irA(step - 1) : onClose?.(false))}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-50 ring-1 ring-slate-200 hover:bg-slate-100 transition"
          >
            <i className="bx bx-arrow-back" />
            {step > 1 ? "Atrás" : "Cancelar"}
          </button>

          <div className="flex items-center gap-2">
            {step < 4 ? (
              <button
                onClick={siguiente}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow transition"
              >
                Siguiente
                <i className="bx bx-arrow-forward" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => guardar()}
                  disabled={guardando || subiendoImg}
                  title={
                    subiendoImg
                      ? "Espera a que terminen de subir los creativos"
                      : undefined
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 ring-1 ring-indigo-200 hover:bg-indigo-100 transition disabled:opacity-60"
                >
                  <i className="bx bx-save" />
                  Guardar plantilla
                </button>
                {subiendoImg && lanzarAlTerminar && (
                  <button
                    type="button"
                    onClick={() => setLanzarAlTerminar(false)}
                    className="text-[11px] font-semibold text-slate-400 hover:text-rose-600"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  onClick={() => {
                    if (subiendoImg) programarLanzamiento();
                    else guardar({ lanzarDespues: true });
                  }}
                  disabled={guardando || (subiendoImg && lanzarAlTerminar)}
                  title={
                    subiendoImg
                      ? "Los creativos siguen cargando: la campaña se lanzará automáticamente al finalizar"
                      : undefined
                  }
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow transition disabled:opacity-60"
                >
                  {guardando ? (
                    <>
                      <i className="bx bx-loader-alt animate-spin" />
                      Procesando...
                    </>
                  ) : subiendoImg && lanzarAlTerminar ? (
                    <>
                      <i className="bx bx-loader-alt animate-spin" />
                      Lanzamiento en espera · faltan{" "}
                      {subidas.filter((s) => !s.error).length} archivo
                      {subidas.filter((s) => !s.error).length > 1 ? "s" : ""}
                    </>
                  ) : subiendoImg ? (
                    <>
                      <i className="bx bx-rocket" />
                      Lanzar al finalizar la carga
                    </>
                  ) : (
                    <>
                      <i className="bx bx-rocket" />
                      Guardar y lanzar
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Reglas de optimización — modal sobre el wizard */}
      {/* Archivo .txt/.csv con zonas (siempre montado: lo disparan botones
          del paso 2 y del panel de carga masiva) */}
      <input
        ref={listaFileRef}
        type="file"
        accept=".txt,.csv,text/plain,text/csv"
        className="hidden"
        onChange={handleArchivoZonas}
      />

      {/* Panel de carga masiva de zonas excluidas: escribir/pegar → buscar
          en Meta → revisar → excluir. Encima del wizard (z-60). */}
      {excluirMasivoOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-3">
          <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="bg-[#171931] text-white px-5 py-3.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/30 grid place-items-center">
                  <i className="bx bx-minus-circle" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold leading-tight">
                    Agregar varias zonas para excluir
                  </h3>
                  <p className="text-[10px] text-white/60">
                    {paisLabel(paisExcluir)} · el anuncio NO se mostrará en
                    estas zonas
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={cerrarMasivo}
                className="w-8 h-8 rounded-lg hover:bg-white/10 grid place-items-center"
                title="Cerrar"
              >
                <i className="bx bx-x text-xl" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {!excluirRevision ? (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
                  <div className="md:col-span-3 flex flex-col">
                    <label className="text-xs font-bold text-slate-700 mb-1.5">
                      Escribe o pega tus zonas,{" "}
                      <span className="text-rose-600">una por renglón</span>
                    </label>
                    <textarea
                      autoFocus
                      className="flex-1 min-h-[260px] w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm text-slate-700 leading-7 focus:outline-none focus:ring-2 focus:ring-rose-300"
                      value={excluirTexto}
                      onChange={(e) => setExcluirTexto(e.target.value)}
                      placeholder={"Chiapas\nOaxaca\nGuerrero\nCancún"}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[11px] text-slate-500">
                        {zonasDetectadas.length === 0 ? (
                          "Aún no hay zonas escritas."
                        ) : (
                          <>
                            <strong className="text-slate-700">
                              {zonasDetectadas.length}
                            </strong>{" "}
                            zona{zonasDetectadas.length === 1 ? "" : "s"}{" "}
                            detectada{zonasDetectadas.length === 1 ? "" : "s"}
                          </>
                        )}
                      </p>
                      {excluirTexto && (
                        <button
                          type="button"
                          onClick={() => setExcluirTexto("")}
                          className="text-[11px] font-semibold text-slate-400 hover:text-rose-600"
                        >
                          Borrar todo
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-3">
                    <div className="rounded-xl bg-slate-50 ring-1 ring-slate-100 p-3.5">
                      <p className="text-[11px] font-bold text-slate-700 mb-2">
                        <i className="bx bx-bulb text-amber-500 mr-1" />
                        Así de fácil
                      </p>
                      <ol className="text-[11px] text-slate-600 space-y-1.5 list-decimal pl-4 leading-relaxed">
                        <li>
                          Escribe cada estado, provincia o ciudad y pulsa{" "}
                          <strong>Enter</strong> para pasar al siguiente.
                        </li>
                        <li>
                          ¿Ya tienes la lista en Excel, WhatsApp o un
                          documento? Cópiala y pégala tal cual.
                        </li>
                        <li>
                          Pulsa <strong>Buscar zonas</strong>: las ubicamos en
                          Meta y te mostramos cuáles son antes de excluirlas.
                        </li>
                      </ol>
                    </div>

                    <div className="rounded-xl ring-1 ring-slate-200 p-3.5 space-y-2">
                      <p className="text-[11px] font-bold text-slate-700">
                        Otras formas de cargarlas
                      </p>
                      <button
                        type="button"
                        onClick={() => listaFileRef.current?.click()}
                        className="w-full inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold text-slate-700 bg-white ring-1 ring-slate-200 hover:ring-rose-300 hover:text-rose-700 transition"
                      >
                        <i className="bx bx-upload text-base text-slate-400" />
                        Subir un archivo .txt o .csv
                      </button>
                      {geoListas.length > 0 && (
                        <select
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-200"
                          value=""
                          onChange={(e) => {
                            if (!e.target.value) return;
                            aplicarGeoLista(e.target.value);
                            cerrarMasivo();
                          }}
                        >
                          <option value="">Usar una lista guardada…</option>
                          {geoListas.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.nombre} ({l.lugares.length} zonas)
                              {l.global ? " · sugerida" : ""}
                            </option>
                          ))}
                        </select>
                      )}
                      {sugerenciaExcluir && (
                        <button
                          type="button"
                          onClick={() => {
                            const n = agregarExcluirVarias(sugerenciaExcluir.excluir);
                            cerrarMasivo();
                            toastZonas(`${n} zona${n === 1 ? "" : "s"} copiada${n === 1 ? "" : "s"}`);
                          }}
                          className="w-full inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold text-slate-700 bg-white ring-1 ring-slate-200 hover:ring-rose-300 hover:text-rose-700 transition text-left"
                        >
                          <i className="bx bx-copy text-base text-slate-400 shrink-0" />
                          <span className="min-w-0 truncate">
                            Copiar las {sugerenciaExcluir.excluir.length} de «
                            {sugerenciaExcluir.nombre}»
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {excluirRevision.encontrados.length > 0 && (
                    <section>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-slate-700">
                          <i className="bx bx-check-circle text-emerald-500 mr-1" />
                          Encontradas ({excluirRevision.encontrados.length})
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            const todas = excluirRevision.encontrados
                              .filter((z) => !z.repetida)
                              .every((z) => z.marcada);
                            setExcluirRevision((r) => ({
                              ...r,
                              encontrados: r.encontrados.map((z) =>
                                z.repetida ? z : { ...z, marcada: !todas },
                              ),
                            }));
                          }}
                          className="text-[11px] font-semibold text-indigo-600 hover:underline"
                        >
                          Marcar / desmarcar todas
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                        {excluirRevision.encontrados.map((z) => (
                          <label
                            key={z.key}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl ring-1 cursor-pointer transition ${
                              z.repetida
                                ? "bg-slate-50 ring-slate-100 text-slate-400"
                                : z.marcada
                                  ? "bg-rose-50 ring-rose-200"
                                  : "bg-white ring-slate-200"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="accent-rose-600"
                              disabled={z.repetida}
                              checked={z.marcada}
                              onChange={(e) => marcarEncontrada(z.key, e.target.checked)}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block text-[11px] font-bold text-slate-700 truncate">
                                {z.name}
                              </span>
                              <span className="block text-[9px] text-slate-400">
                                {z.type === "region" ? "Estado / provincia" : "Ciudad"}
                                {z.repetida ? " · ya estaba en tu lista" : ""}
                                {!z.repetida &&
                                normalizarTexto(z.consulta) !== normalizarTexto(z.name)
                                  ? ` · escribiste "${z.consulta}"`
                                  : ""}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </section>
                  )}

                  {excluirRevision.ambiguas.length > 0 && (
                    <section className="rounded-xl bg-amber-50 ring-1 ring-amber-100 p-3.5">
                      <p className="text-xs font-bold text-amber-800 mb-1">
                        <i className="bx bx-help-circle mr-1" />
                        Hay varias zonas con este nombre: elige la correcta (
                        {excluirRevision.ambiguas.length})
                      </p>
                      <p className="text-[10px] text-amber-700 mb-2.5">
                        Si no eliges ninguna, esa zona no se excluye.
                      </p>
                      <div className="space-y-2.5">
                        {excluirRevision.ambiguas.map((a) => (
                          <div key={a.consulta} className="rounded-lg bg-white ring-1 ring-amber-100 p-2.5">
                            <p className="text-[11px] font-bold text-slate-700 mb-1.5">
                              {a.consulta}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {a.opciones.map((o) => (
                                <button
                                  key={o.key}
                                  type="button"
                                  onClick={() =>
                                    elegirAmbigua(
                                      a.consulta,
                                      a.elegida?.key === o.key ? null : o,
                                    )
                                  }
                                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold ring-1 transition ${
                                    a.elegida?.key === o.key
                                      ? "bg-rose-600 text-white ring-rose-600"
                                      : "bg-white text-slate-600 ring-slate-200 hover:ring-rose-300"
                                  }`}
                                >
                                  {o.name}
                                  <span className="ml-1 opacity-70">
                                    · {o.type === "region" ? "Estado" : "Ciudad"}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {excluirRevision.noEncontradas.length > 0 && (
                    <section className="rounded-xl bg-rose-50 ring-1 ring-rose-100 p-3.5">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="text-xs font-bold text-rose-800">
                          <i className="bx bx-x-circle mr-1" />
                          No encontramos estas ({excluirRevision.noEncontradas.length})
                        </p>
                        <button
                          type="button"
                          onClick={corregirNoEncontradas}
                          className="text-[11px] font-semibold text-rose-700 hover:underline"
                        >
                          Corregir la escritura
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {excluirRevision.noEncontradas.map((n) => (
                          <span
                            key={n}
                            className="px-2.5 py-1 rounded-full bg-white ring-1 ring-rose-200 text-[11px] text-rose-700 font-semibold"
                          >
                            {n}
                          </span>
                        ))}
                      </div>
                      <p className="text-[10px] text-rose-600 mt-2">
                        Revisa que el nombre esté bien escrito y que pertenezca
                        a {paisLabel(paisExcluir)}. Puedes excluir las demás
                        ahora y buscar estas después.
                      </p>
                    </section>
                  )}
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-white flex items-center justify-between gap-3 shrink-0">
              {!excluirRevision ? (
                <>
                  <button
                    type="button"
                    onClick={cerrarMasivo}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-50 ring-1 ring-slate-200 hover:bg-slate-100 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={!zonasDetectadas.length || excluirResolviendo}
                    onClick={() => resolverZonas(zonasDetectadas)}
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow transition disabled:opacity-50"
                  >
                    {excluirResolviendo ? (
                      <>
                        <i className="bx bx-loader-alt animate-spin" />
                        Buscando en Meta…
                      </>
                    ) : (
                      <>
                        <i className="bx bx-search-alt" />
                        Buscar {zonasDetectadas.length || ""} zona
                        {zonasDetectadas.length === 1 ? "" : "s"}
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setExcluirRevision(null)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-50 ring-1 ring-slate-200 hover:bg-slate-100 transition"
                  >
                    <i className="bx bx-arrow-back" />
                    Editar la lista
                  </button>
                  <button
                    type="button"
                    disabled={!totalAplicar}
                    onClick={aplicarRevision}
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow transition disabled:opacity-50"
                  >
                    <i className="bx bx-minus-circle" />
                    Excluir {totalAplicar} zona{totalAplicar === 1 ? "" : "s"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {reglasOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-3">
          <div className="w-full max-w-5xl h-[92vh] flex flex-col rounded-2xl bg-slate-50 shadow-2xl overflow-hidden">
            <div className="bg-[#171931] text-white px-5 py-3.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/15 grid place-items-center">
                  <i className="bx bx-shield-quarter" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold leading-tight">
                    Reglas automáticas
                  </h3>
                  <p className="text-[10px] text-white/60">
                    Aplica las recomendadas o crea las tuyas
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setReglasOpen(false);
                  cargarReglasActivas();
                }}
                className="p-2 rounded-lg hover:bg-white/10 transition"
              >
                <i className="bx bx-x text-xl" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4">
              <ReglasAutomaticas id_configuracion={id_configuracion} />
            </div>
            {/* Pie: las reglas se guardan solas al agregarlas; este botón
                existe para que quede claro que ya están y volver al paso 4. */}
            <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0">
              <p className="text-[11px] text-slate-500 leading-snug">
                <i className="bx bx-check-shield text-emerald-600 mr-1" />
                Cada regla que agregas o editas queda guardada al instante y
                se aplica a todas tus campañas lanzadas desde aquí.
              </p>
              <button
                type="button"
                onClick={() => {
                  setReglasOpen(false);
                  cargarReglasActivas();
                }}
                className="shrink-0 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow transition"
              >
                <i className="bx bx-check" />
                Listo, volver a la campaña
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Creativo en grande / video reproduciéndose */}
      {lightbox && (
        <MediaLightbox
          item={lightbox}
          id_configuracion={id_configuracion}
          titulo={tituloEfectivo || form.nombre}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
};

export default LauncherWizardModal;
