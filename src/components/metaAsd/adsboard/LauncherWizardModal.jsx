import React, { useState, useRef, useMemo, useEffect } from "react";
import Swal from "sweetalert2";
import chatApi from "../../../api/chatcenter";

/**
 * LauncherWizardModal
 *
 * Wizard de 4 pasos para crear/editar una plantilla de campaña CTWA:
 * 1. Página y producto   2. Presupuesto y alcance
 * 3. Creativos           4. Revisar y lanzar
 *
 * Hasta 5 imágenes = hasta 5 anuncios (variaciones) dentro del mismo
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

// Meta permite hasta 50 anuncios por conjunto, pero recomienda máximo ~6
// activos para que la fase de aprendizaje no se fragmente.
const MAX_IMAGENES = 6;

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

/* ── Vista previa: publicación de feed + chat de WhatsApp ── */
const AdPreview = ({ form, paginaNombre, tituloEfectivo }) => {
  const inicial = (paginaNombre || "P").trim().charAt(0).toUpperCase();
  const imagen = form.imagenes?.[0] || null;
  const nImagenes = form.imagenes?.length || 0;
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
          <i className="bx bx-show mr-1" />
          Así se verá en Facebook
        </p>
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
          <div className="px-3 py-2.5 flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 grid place-items-center text-white text-sm font-bold">
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
          <div className="relative">
            {imagen?.url ? (
              <img
                src={imagen.url}
                alt="Creativo"
                className="w-full aspect-square object-cover"
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
                {nImagenes} variaciones
              </span>
            )}
          </div>
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
  onClose,
}) => {
  const paginas = contexto?.paginas || [];
  const productos = contexto?.productos || [];

  const [step, setStep] = useState(1);
  const [guardando, setGuardando] = useState(false);
  const [subiendoImg, setSubiendoImg] = useState(false);
  const fileRef = useRef(null);
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
        "Hola 👋 vi su anuncio y quiero más información",
      imagenes,
      estado_inicial: plantilla?.estado_inicial || "PAUSED",
    };
  });

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));
  const setGeo = (parcial) =>
    setForm((f) => ({ ...f, geo: { ...f.geo, ...parcial } }));

  const productoSel = productos.find(
    (p) => Number(p.id) === Number(form.id_producto),
  );
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
    setGeo({ lugares: [...form.geo.lugares, l] });
    setGeoQ("");
    setGeoResultados([]);
  };

  const quitarLugar = (key) =>
    setGeo({ lugares: form.geo.lugares.filter((l) => l.key !== key) });

  const togglePais = (code) => {
    setGeo({
      paises: form.geo.paises.includes(code)
        ? form.geo.paises.filter((c) => c !== code)
        : [...form.geo.paises, code],
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

  const handleImagen = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (form.imagenes.length >= MAX_IMAGENES) {
      swalWarn(`Máximo ${MAX_IMAGENES} creativos por plantilla.`);
      return;
    }
    const esVideo = String(file.type).startsWith("video/");
    setSubiendoImg(true);
    // Preview local inmediato para imágenes; el video usa la miniatura que
    // genera Meta al procesarlo.
    const previewLocal = esVideo ? null : URL.createObjectURL(file);
    try {
      const fd = new FormData();
      fd.append("archivo", file);
      fd.append("id_configuracion", id_configuracion);
      const { data } = await chatApi.post(
        "/meta_ads/launcher/subir-media",
        fd,
        {
          headers: { "Content-Type": "multipart/form-data" },
          silentError: true,
          timeout: 180000,
        },
      );
      if (data?.success) {
        const d = data.data;
        const item =
          d.tipo === "video"
            ? {
                tipo: "video",
                video_id: d.video_id,
                thumb_url: d.thumb_url || null,
                url: d.url || d.thumb_url || null,
              }
            : {
                tipo: "imagen",
                hash: d.hash,
                url: d.url || previewLocal,
              };
        setForm((f) => ({ ...f, imagenes: [...f.imagenes, item] }));
      } else {
        Swal.fire({
          icon: "error",
          title: "Meta rechazó el archivo",
          text: data?.message || "Inténtalo con otro archivo (JPG/PNG/MP4).",
          customClass: { popup: "rounded-2xl" },
        });
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "No se pudo subir el archivo",
        text: err?.response?.data?.message || "Inténtalo de nuevo.",
        customClass: { popup: "rounded-2xl" },
      });
    } finally {
      setSubiendoImg(false);
    }
  };

  const quitarImagen = (idx) =>
    setForm((f) => ({
      ...f,
      imagenes: f.imagenes.filter((_, i) => i !== idx),
    }));

  const guardar = async ({ lanzarDespues = false } = {}) => {
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

      // Guardar y lanzar de una vez
      const lanzo = await chatApi.post("/meta_ads/launcher/lanzar", {
        id_configuracion,
        id_plantilla: idGuardado,
        estado: form.estado_inicial,
      });
      if (lanzo.data?.success) {
        const nAds = lanzo.data.data.ads?.length || 1;
        await Swal.fire({
          icon: "success",
          title:
            form.estado_inicial === "ACTIVE"
              ? "¡Campaña lanzada!"
              : "Campaña creada en pausa",
          html: `Se ${nAds > 1 ? `crearon ${nAds} anuncios` : "creó 1 anuncio"} en tu cuenta.<br/>
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

  const resumenAlcance =
    form.geo.modo === "especifico"
      ? form.geo.lugares.map((l) => l.name).join(", ")
      : form.geo.paises
          .map(
            (c) => PAISES_SUGERIDOS.find((p) => p.code === c)?.label || c,
          )
          .join(", ");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-3">
      <div className="w-full max-w-6xl h-[94vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
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
                    <div className="grid grid-cols-2 gap-2">
                      {PAISES_SUGERIDOS.map((p) => {
                        const activo = form.geo.paises.includes(p.code);
                        return (
                          <button
                            key={p.code}
                            type="button"
                            onClick={() => togglePais(p.code)}
                            className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl border text-left transition ${
                              activo
                                ? "bg-indigo-600 text-white border-indigo-600 shadow"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300"
                            }`}
                          >
                            <span className="text-xl leading-none">
                              {p.flag}
                            </span>
                            <span className="flex-1 text-xs font-bold">
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
                            setGeo({ paises: [e.target.value], lugares: [] })
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
                                    className={`bx ${l.type === "region" ? "bx-map-alt text-violet-500" : "bx-map-pin text-indigo-500"}`}
                                  />
                                  {l.name}
                                  <span
                                    className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold ${
                                      l.type === "region"
                                        ? "bg-violet-50 text-violet-600"
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
                      accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
                      className="hidden"
                      onChange={handleImagen}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      {form.imagenes.map((img, idx) => (
                        <div
                          key={img.hash || img.video_id || idx}
                          className="relative rounded-xl overflow-hidden border border-slate-200 group"
                        >
                          {img.url ? (
                            <img
                              src={img.url}
                              alt={`Variación ${idx + 1}`}
                              className="w-full aspect-square object-cover"
                            />
                          ) : (
                            <div className="w-full aspect-square bg-slate-800 grid place-items-center text-white/70">
                              <i className="bx bx-video text-3xl" />
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
                            onClick={() => quitarImagen(idx)}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg bg-black/60 text-white grid place-items-center hover:bg-rose-600 transition"
                            title="Quitar creativo"
                          >
                            <i className="bx bx-trash text-xs" />
                          </button>
                        </div>
                      ))}
                      {form.imagenes.length < MAX_IMAGENES && (
                        <div
                          onClick={() =>
                            !subiendoImg && fileRef.current?.click()
                          }
                          className="rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-300 cursor-pointer transition aspect-square grid place-items-center text-slate-400"
                        >
                          {subiendoImg ? (
                            <div className="text-center">
                              <i className="bx bx-loader-alt animate-spin text-2xl" />
                              <p className="text-[9px] mt-1 font-semibold">
                                Subiendo...
                              </p>
                            </div>
                          ) : (
                            <div className="text-center">
                              <i className="bx bx-plus text-2xl" />
                              <p className="text-[9px] mt-1 font-semibold">
                                {form.imagenes.length === 0
                                  ? "Imagen o video"
                                  : "Otra variación"}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">
                      Imágenes 1080×1080 (máx 8 MB) o videos MP4 verticales
                      (máx 64 MB). Probar 3-5 ángulos distintos del producto
                      es lo que mejor funciona.
                    </p>
                  </Seccion>

                  <Seccion
                    icon="bxl-whatsapp"
                    titulo="Mensaje de entrada a WhatsApp"
                    desc="Se autocompleta al tocar el anuncio; tu bot lo recibe como primer mensaje."
                  >
                    <textarea
                      className={`${inputCls} min-h-[60px]`}
                      value={form.mensaje_bienvenida}
                      onChange={(e) =>
                        set("mensaje_bienvenida", e.target.value)
                      }
                    />
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
                    </Seccion>

                    <Seccion
                      icon="bx-play-circle"
                      titulo="¿Cómo nace la campaña?"
                    >
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          {
                            v: "PAUSED",
                            label: "En pausa",
                            desc: "La revisas antes de que gaste",
                            icon: "bx-pause-circle",
                          },
                          {
                            v: "ACTIVE",
                            label: "Activa",
                            desc: "Pasa revisión de Meta y corre",
                            icon: "bx-play-circle",
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
                  </div>
                </div>

                {/* Preview también inline en pantallas chicas */}
                <div className="lg:hidden">
                  <AdPreview
                    form={form}
                    paginaNombre={paginaNombre}
                    tituloEfectivo={tituloEfectivo}
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
                  disabled={guardando}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 ring-1 ring-indigo-200 hover:bg-indigo-100 transition disabled:opacity-60"
                >
                  <i className="bx bx-save" />
                  Guardar plantilla
                </button>
                <button
                  onClick={() => guardar({ lanzarDespues: true })}
                  disabled={guardando}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow transition disabled:opacity-60"
                >
                  {guardando ? (
                    <>
                      <i className="bx bx-loader-alt animate-spin" />
                      Procesando...
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
    </div>
  );
};

export default LauncherWizardModal;
