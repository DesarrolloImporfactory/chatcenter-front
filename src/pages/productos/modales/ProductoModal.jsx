// src/components/productos/modales/ProductoModal.jsx
import React, { useEffect, useRef, useState } from "react";
import chatApi from "../../../api/chatcenter";
import Swal from "sweetalert2";

/* ─────────────────────────────────────────────────────────────
   Defaults
───────────────────────────────────────────────────────────── */
const EMPTY_FORM = {
  nombre: "",
  descripcion: "",
  tipo: "",
  precio: "",
  duracion: "",
  sesiones_min: "",
  sesiones_max: "",
  stock: "",
  id_categoria: "",
  imagen: null,
  video: null,
  nombre_upsell: "",
  descripcion_upsell: "",
  precio_upsell: "",
  imagen_upsell: null,
  combos_producto: [
    { cantidad: "", precio: "", id_dropi: "" },
    { cantidad: "", precio: "", id_dropi: "" },
    { cantidad: "", precio: "", id_dropi: "" },
  ],
  /* campos catálogo — agrupados al final */
  es_privado: "", // "" | "0" | "1"   — FIX: nombre correcto del campo en BD
  material: "",
  landing_url: "",
  precio_proveedor: "",
};

const normalizaTipo = (t) => {
  const s = String(t || "")
    .toLowerCase()
    .trim();
  if (!s) return "";
  return s.startsWith("ser") ? "servicio" : "producto";
};

const normalizeCombos = (v) => {
  if (!v) return EMPTY_FORM.combos_producto;
  let arr = v;
  if (typeof v === "string") {
    try {
      arr = JSON.parse(v);
    } catch {
      arr = [];
    }
  }
  if (!Array.isArray(arr)) return EMPTY_FORM.combos_producto;
  const filled = [...arr];
  while (filled.length < 3)
    filled.push({ cantidad: "", precio: "", id_dropi: "" });
  return filled;
};

/* ─────────────────────────────────────────────────────────────
   Small UI atoms
───────────────────────────────────────────────────────────── */
const Lbl = ({ children, required }) => (
  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
    {children}
    {required && <span className="text-red-400 ml-0.5">*</span>}
  </label>
);

// forwardRef: el campo de "nueva categoría" necesita el ref para enfocarse solo.
const Inp = React.forwardRef(({ className = "", ...props }, ref) => (
  <input
    ref={ref}
    {...props}
    className={`w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none
      transition focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white ${className}`}
  />
));
Inp.displayName = "Inp";

const Sel = ({ children, className = "", ...props }) => (
  <select
    {...props}
    className={`w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none
      transition focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white ${className}`}
  >
    {children}
  </select>
);

/* ─────────────────────────────────────────────────────────────
   CategoriaField
   Select de categoría + crear una nueva SIN salir del modal. Antes había que
   irse a /categorias, crearla y volver a empezar la carga del producto; y como
   la categoría alimenta el catálogo del asistente, la gente terminaba
   guardando todo sin categoría. Usa los mismos endpoints de esa vista
   (agregarCategoria + listarCategorias).
───────────────────────────────────────────────────────────── */
/* Fila del desplegable. Fuera del render para no redefinirla en cada pasada. */
const Opcion = ({ activo, onPick, children }) => (
  <button
    type="button"
    onClick={onPick}
    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm rounded-xl transition ${
      activo
        ? "bg-[#171931] text-white"
        : "text-slate-700 hover:bg-slate-50 active:bg-slate-100"
    }`}
  >
    {children}
  </button>
);

const CategoriaField = ({
  value,
  categorias,
  onChange,
  onCategoriasChange,
}) => {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [creando, setCreando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const boxRef = useRef(null);

  useEffect(() => {
    if (creando) inputRef.current?.focus();
  }, [creando]);

  // Cerrar al hacer clic fuera o con Escape (si no se está creando).
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setAbierto(false);
        setCreando(false);
      }
    };
    const esc = (e) => {
      if (e.key === "Escape" && !creando) setAbierto(false);
    };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", esc);
    };
  }, [abierto, creando]);

  const abrir = () => {
    setNombre("");
    setError("");
    setCreando(true);
  };
  const cancelar = () => {
    setCreando(false);
    setNombre("");
    setError("");
  };

  const guardar = async () => {
    const limpio = nombre.trim();
    if (!limpio) return setError("Escribe un nombre");

    // Ya existe (sin distinguir mayúsculas/acentos): la seleccionamos en vez
    // de crear una duplicada que después ensucia el catálogo del asistente.
    const norm = (s) =>
      String(s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .trim();
    const yaExiste = categorias.find((c) => norm(c.nombre) === norm(limpio));
    if (yaExiste) {
      onChange(String(yaExiste.id));
      cancelar();
      setAbierto(false);
      return;
    }

    const idc = localStorage.getItem("id_configuracion");
    if (!idc) return setError("Falta la conexión seleccionada");

    setGuardando(true);
    setError("");
    try {
      const res = await chatApi.post("/categorias/agregarCategoria", {
        id_configuracion: parseInt(idc, 10),
        nombre: limpio,
        descripcion: "",
      });
      const creada = res?.data?.data || null;
      // Refrescamos desde el back para que la lista quede igual que en
      // /categorias, y dejamos seleccionada la recién creada.
      const lista = await chatApi.post("/categorias/listarCategorias", {
        id_configuracion: parseInt(idc, 10),
      });
      const nuevas = lista?.data?.data || [];
      onCategoriasChange?.(nuevas);
      const elegida =
        creada?.id ??
        nuevas.find((c) => norm(c.nombre) === norm(limpio))?.id ??
        "";
      if (elegida !== "") onChange(String(elegida));
      cancelar();
      setAbierto(false); // ya quedó seleccionada: no hace falta seguir eligiendo
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudo crear la categoría");
    } finally {
      setGuardando(false);
    }
  };

  const seleccionada = categorias.find((c) => String(c.id) === String(value));
  const filtradas = busqueda.trim()
    ? categorias.filter((c) =>
        String(c.nombre || "")
          .toLowerCase()
          .includes(busqueda.trim().toLowerCase()),
      )
    : categorias;

  return (
    <div ref={boxRef}>
      {/* La categoría NO es obligatoria: el backend solo exige nombre, tipo
          y precio. */}
      <Lbl>Categoría</Lbl>

      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setAbierto((o) => !o);
            setBusqueda("");
            setCreando(false);
          }}
          className={`w-full flex items-center gap-2 border rounded-xl px-3.5 py-2.5 text-sm bg-white text-left transition outline-none ${
            abierto
              ? "border-indigo-400 ring-2 ring-indigo-200"
              : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <i
            className={`bx bx-purchase-tag text-base shrink-0 ${
              seleccionada ? "text-indigo-500" : "text-slate-300"
            }`}
          />
          <span
            className={`flex-1 truncate ${
              seleccionada ? "text-slate-800 font-medium" : "text-slate-400"
            }`}
          >
            {seleccionada ? seleccionada.nombre : "Sin categoría"}
          </span>
          {seleccionada && (
            <span
              role="button"
              tabIndex={0}
              title="Quitar categoría"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onChange("");
                }
              }}
              className="shrink-0 grid place-items-center w-5 h-5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              <i className="bx bx-x text-base" />
            </span>
          )}
          <i
            className={`bx bx-chevron-down text-lg text-slate-400 shrink-0 transition-transform duration-200 ${
              abierto ? "rotate-180" : ""
            }`}
          />
        </button>

        {abierto && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-900/[0.10] overflow-hidden origin-top animate-drop-in">
            {/* Buscador solo cuando hay suficientes para que valga la pena */}
            {categorias.length > 6 && !creando && (
              <div className="p-2 border-b border-slate-100">
                <div className="relative">
                  <i className="bx bx-search absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300 text-base" />
                  <input
                    autoFocus
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar categoría…"
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-400 transition"
                  />
                </div>
              </div>
            )}

            {/* Alto tope + scroll propio: con muchas categorías el desplegable
                nativo se salía de la pantalla por arriba. */}
            {!creando && (
              <div className="max-h-[220px] overflow-y-auto p-1.5 space-y-0.5 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
                <Opcion
                  activo={!value}
                  onPick={() => {
                    onChange("");
                    setAbierto(false);
                  }}
                >
                  <i className="bx bx-minus-circle text-base shrink-0 text-slate-300" />
                  <span className="flex-1 truncate text-slate-500">
                    Sin categoría
                  </span>
                </Opcion>

                {filtradas.map((c) => (
                  <Opcion
                    key={c.id}
                    activo={String(c.id) === String(value)}
                    onPick={() => {
                      onChange(String(c.id));
                      setAbierto(false);
                      setBusqueda("");
                    }}
                  >
                    <i
                      className={`bx bx-purchase-tag text-base shrink-0 ${
                        String(c.id) === String(value)
                          ? "text-white/70"
                          : "text-slate-300"
                      }`}
                    />
                    <span className="flex-1 truncate">{c.nombre}</span>
                    {String(c.id) === String(value) && (
                      <i className="bx bx-check text-base shrink-0" />
                    )}
                  </Opcion>
                ))}

                {!filtradas.length && (
                  <div className="px-3 py-6 text-center">
                    <i className="bx bx-purchase-tag text-2xl text-slate-200" />
                    <p className="mt-1 text-[11px] text-slate-400">
                      {categorias.length
                        ? "Ninguna coincide"
                        : "Aún no tienes categorías"}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Crear sin salir del modal */}
            {creando ? (
              <div className="p-2.5 border-t border-slate-100 bg-slate-50/70">
                <div className="flex gap-2">
                  <Inp
                    ref={inputRef}
                    value={nombre}
                    maxLength={100}
                    placeholder="Nombre de la categoría"
                    className="py-2"
                    onChange={(e) => {
                      setNombre(e.target.value);
                      if (error) setError("");
                    }}
                    // Enter guarda y Escape cancela, sin enviar el formulario.
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        guardar();
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        cancelar();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={guardar}
                    disabled={guardando}
                    className="shrink-0 px-3.5 rounded-xl bg-[#171931] text-white text-sm font-semibold hover:opacity-95 transition disabled:opacity-50"
                  >
                    {guardando ? (
                      <i className="bx bx-loader-alt bx-spin text-base" />
                    ) : (
                      "Crear"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={cancelar}
                    disabled={guardando}
                    title="Cancelar"
                    className="shrink-0 w-9 rounded-xl border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition disabled:opacity-50"
                  >
                    <i className="bx bx-x text-lg" />
                  </button>
                </div>
                {error && (
                  <p className="mt-1.5 text-[11px] text-red-500">{error}</p>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={abrir}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 border-t border-slate-100 bg-slate-50/70 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition"
              >
                <i className="bx bx-plus-circle text-base" />
                Crear categoría nueva
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* section heading */
const SecHead = ({ icon, title }) => (
  <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 mb-4">
    <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#171931]">
      <i className={`bx ${icon} text-white text-sm`} />
    </div>
    <span className="text-sm font-bold text-slate-700">{title}</span>
  </div>
);

/* dropzone */
/* El área de carga ocupaba casi toda la columna y dejaba la vista previa
   pequeña abajo. Ahora es al revés: un botón chico para subir a la izquierda
   y el contenido grande al lado, que es lo que interesa mirar. Se puede
   seguir arrastrando el archivo sobre todo el bloque. */
const DropZone = ({
  dropRef,
  onDrop,
  onDragOver,
  onDragLeave,
  onPick,
  accept,
  icon,
  hint,
  preview,
  onRemove,
}) => (
  <div
    ref={dropRef}
    onDrop={onDrop}
    onDragOver={onDragOver}
    onDragLeave={onDragLeave}
    className="flex items-stretch gap-3"
  >
    <label
      className="w-[72px] shrink-0 flex flex-col items-center justify-center gap-1 rounded-xl
        border-2 border-dashed border-slate-200 cursor-pointer py-3
        hover:border-indigo-300 hover:bg-slate-50 transition-colors"
      title={hint}
    >
      <i className={`bx ${icon} text-xl text-slate-400`} />
      <span className="text-[10px] font-semibold text-indigo-600">Subir</span>
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0])}
      />
    </label>

    <div className="flex-1 min-w-0">
      {preview ? (
        <div className="relative">
          {preview}
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 bg-white/90 hover:bg-white border border-slate-200
              text-slate-600 text-xs px-2.5 py-1 rounded-lg shadow-sm transition-colors"
          >
            Quitar
          </button>
        </div>
      ) : (
        <div className="h-full min-h-[76px] rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center px-3 text-center">
          <p className="text-[11px] text-slate-400">
            o arrastra el archivo aquí
          </p>
          <p className="text-[10px] text-slate-300 mt-0.5">{hint}</p>
        </div>
      )}
    </div>
  </div>
);

/* Duraciones frecuentes. Son atajos, no la lista cerrada: cada negocio tiene
   las suyas (una consulta de 20 min, un tinte de 210) y por eso siempre queda
   disponible la opción de escribirla a mano. */
const DURACIONES_FRECUENTES = [15, 30, 45, 60, 90, 120, 150, 180];

const fmtDuracion = (min) => {
  const m = Number(min) || 0;
  if (!m) return "";
  if (m < 60) return `${m} minutos`;
  if (m % 60 === 0) return `${m / 60} hora${m > 60 ? "s" : ""}`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
};

/* ─────────────────────────────────────────────────────────────
   MAIN
───────────────────────────────────────────────────────────── */
const ProductoModal = ({
  open,
  onClose,
  editingProduct,
  categorias,
  // Avisa a la vista cuando se crea una categoría desde aquí, para que su
  // lista quede al día sin recargar todo el modal.
  onCategoriasChange,
  productosExistentes = [],
  onSaved,
}) => {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [combosOpen, setCombosOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewVideo, setPreviewVideo] = useState(null);
  const [previewUpsell, setPreviewUpsell] = useState(null);

  const dropRef = useRef(null);
  const dropVideoRef = useRef(null);
  const dropUpsellRef = useRef(null);

  const [videoRemoved, setVideoRemoved] = useState(false);
  const [upsellRemoved, setUpsellRemoved] = useState(false);
  // Quitar la imagen principal tiene que viajar como una orden explícita: el
  // backend solo toca imagen_url si le llega un archivo nuevo, así que sin esta
  // marca la imagen se veía borrada en pantalla pero seguía guardada.
  const [imagenRemoved, setImagenRemoved] = useState(false);
  // Duración escrita a mano en vez de elegida de la lista.
  const [duracionLibre, setDuracionLibre] = useState(false);

  /* ── Variedades (talla / color) ──
     Si el producto se vende en varias opciones, el bot debe preguntar cuál
     quiere el cliente antes de cerrar, y el pedido necesita el id de la
     variante para que Dropi lo acepte (si no, lo rechaza por "no es simple"). */
  const [esVariable, setEsVariable] = useState(false);
  const [variaciones, setVariaciones] = useState([]);

  /* Solo productos importados de Dropi pueden apuntar un combo a otro
     producto del proveedor (ej. "Melaxin x2" con su propio ID). */
  const esDropi = editingProduct?.external_source === "DROPI";

  /* Un solo tipo de variedad por producto: o es por color, o por talla, o por
     sabor. Combinar dos se prestaba a confusión y terminaba mezclando valores
     bajo el rótulo equivocado. */
  const ATRIBUTOS = ["Color", "Talla", "Sabor", "Modelo"];
  const [atributo, setAtributo] = useState("Color");

  const cambiarAtributo = (a) => {
    setAtributo(a);
    // Lo escrito deja de tener sentido al cambiar de tipo ("Negro" no es una
    // talla), así que se limpia en vez de quedar bajo el rótulo errado.
    setVariaciones((lista) =>
      lista.map((v) => ({ ...v, atributo: a, valor: "" })),
    );
  };

  const agregarVariacion = () =>
    setVariaciones((v) => [
      ...v,
      {
        dropi_variation_id: "",
        atributo,
        valor: "",
        stock: 0,
        precio_proveedor: "",
        precio_sugerido: "",
      },
    ]);
  const cambiarVariacion = (i, campo, valor) =>
    setVariaciones((lista) =>
      lista.map((v, idx) => (idx === i ? { ...v, [campo]: valor } : v)),
    );
  const quitarVariacion = (i) =>
    setVariaciones((lista) => lista.filter((_, idx) => idx !== i));

  const variacionCompleta = (v) => Boolean(String(v?.valor || "").trim());

  /* Tipo (producto/servicio): se hereda de lo que el cliente eligió al
     activar el bot en Asistentes, en vez de preguntarlo otra vez acá.

     Si esa configuración no existe todavía (conexión nueva, o cuenta que usa
     tablero kanban y nunca pasó por Asistentes), NO se asume "producto": se
     deduce del catálogo que ya tiene. Asumir mal aquí no es cosmético — el
     sincronizador de catálogo ignora TODOS los servicios en cuanto existe un
     solo producto, así que un ítem con el tipo equivocado deja al bot de un
     centro de estética sin catálogo. */
  const tipoSegunCatalogo = () => {
    const tipos = (productosExistentes || [])
      .map((p) => String(p?.tipo || "").toLowerCase())
      .filter(Boolean);
    if (!tipos.length) return null;
    return tipos.every((t) => t.startsWith("ser")) ? "servicio" : "producto";
  };

  /* Producto traído de Dropi: es el mismo criterio que usa el cron
     (external_source = 'dropi' + external_id). Su stock lo maneja la
     sincronización, no el usuario. */
  const esDeDropi =
    String(editingProduct?.external_source || "").toLowerCase() === "dropi" &&
    editingProduct?.external_id != null;

  const [tipoCuenta, setTipoCuenta] = useState("producto");
  /* ¿El negocio tiene OpenAI conectado? De eso depende que se ofrezca redactar
     la descripción con IA: la llamada corre con SU api key, así que sin key el
     botón no se muestra en vez de aparecer y fallar al pulsarlo. Se saca de la
     misma respuesta que ya se pedía para el tipo de cuenta, sin llamada extra. */
  const [iaDisponible, setIaDisponible] = useState(false);
  useEffect(() => {
    if (!open) return;
    const idc = parseInt(localStorage.getItem("id_configuracion"));
    if (!idc) return;
    const respaldo = () => setTipoCuenta(tipoSegunCatalogo() || "producto");
    chatApi
      .post(
        "openai_assistants/info_asistentes",
        { id_configuracion: idc },
        { silentError: true },
      )
      .then(({ data }) => {
        setIaDisponible(Boolean(data?.data?.api_key_openai));
        const ofrece = data?.data?.ventas?.ofrecer;
        if (ofrece === "servicios") setTipoCuenta("servicio");
        else if (ofrece === "productos") setTipoCuenta("producto");
        else respaldo();
      })
      .catch(() => {
        setIaDisponible(false);
        respaldo();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, productosExistentes]);

  /* Redacción automática de la descripción. `descripcionPrevia` guarda lo que
     había antes de generar para poder deshacer: reescribir sin red de seguridad
     lo que alguien acababa de tipear a mano es la forma más rápida de que no
     vuelva a tocar el botón. */
  const [generandoIA, setGenerandoIA] = useState(false);
  const [descripcionPrevia, setDescripcionPrevia] = useState(null);

  const generarDescripcionIA = async () => {
    if (!form.nombre.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Falta el nombre",
        text: "Escribe el nombre del producto para que la IA sepa de qué se trata.",
      });
      return;
    }

    const idc = parseInt(localStorage.getItem("id_configuracion"));
    if (!idc) return;

    setGenerandoIA(true);
    try {
      const fd = new FormData();
      fd.append("id_configuracion", idc);
      fd.append("nombre", form.nombre.trim());
      fd.append("tipo", form.tipo || tipoCuenta);

      const cat = categorias.find(
        (c) => String(c.id) === String(form.id_categoria),
      );
      if (cat?.nombre) fd.append("categoria", cat.nombre);
      if (form.material) fd.append("material", form.material);
      // Lo ya escrito no se descarta: se manda para que lo ordene en vez de
      // reemplazarlo por algo inventado.
      if (form.descripcion.trim())
        fd.append("borrador", form.descripcion.trim());

      /* La foto es lo que más mejora el resultado. Si es una recién elegida
         todavía no está subida a ningún lado, así que viaja el archivo; si el
         producto ya existe, basta con su URL publicada. */
      if (form.imagen) fd.append("imagen", form.imagen);
      else if (previewUrl && /^https?:\/\//i.test(previewUrl))
        fd.append("imagen_url", previewUrl);

      const { data } = await chatApi.post(
        "/productos/generarDescripcionIA",
        fd,
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      const texto = data?.data?.descripcion || "";
      if (!texto) throw new Error("Respuesta vacía");

      setDescripcionPrevia(form.descripcion);
      setF("descripcion", texto);
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "No se pudo generar",
        text:
          err?.response?.data?.message ||
          "Intenta de nuevo en unos segundos.",
      });
    } finally {
      setGenerandoIA(false);
    }
  };

  /* ── Populate on open ── */
  useEffect(() => {
    setUpsellRemoved(false);
    setVideoRemoved(false);
    // El "deshacer" de la IA es de la sesión de este producto: si no se limpia,
    // al abrir otro aparece ofreciendo restaurar la descripción del anterior.
    setDescripcionPrevia(null);
    if (!open) return;
    if (editingProduct) {
      const p = editingProduct;

      /*
       * FIX es_privado:
       * El backend guarda como `es_privado` en BD.
       * Algunos responses legacy devuelven `is_private`.
       * Probamos ambos para compatibilidad.
       */
      const privRaw = p.es_privado ?? p.is_private;
      const privVal =
        privRaw === 1 || privRaw === true
          ? "1"
          : privRaw === 0 || privRaw === false
            ? "0"
            : "";

      setForm({
        nombre: p.nombre || "",
        descripcion: p.descripcion || "",
        tipo: normalizaTipo(p.tipo),
        precio: p.precio ?? "",
        duracion: p.duracion ?? "",
        sesiones_min: p.sesiones_min ?? "",
        sesiones_max: p.sesiones_max ?? "",
        stock: p.stock ?? "",
        id_categoria: p.id_categoria ?? "",
        imagen: null,
        video: null,
        nombre_upsell: p.nombre_upsell ?? "",
        descripcion_upsell: p.descripcion_upsell ?? "",
        precio_upsell: p.precio_upsell ?? "",
        imagen_upsell: null,
        combos_producto: normalizeCombos(p.combos_producto),
        es_privado: privVal,
        material: p.material ?? "",
        landing_url: p.landing_url ?? "",
        precio_proveedor: p.precio_proveedor ?? "",
      });

      setPreviewUrl(p.imagen_url || null);
      setPreviewVideo(p.video_url || null);
      setPreviewUpsell(p.imagen_upsell_url || null);
      // Abrir otro producto no puede arrastrar el "quitar imagen" del anterior.
      setImagenRemoved(false);
      // Si la duración guardada no está entre las frecuentes, el campo se abre
      // directo en modo libre: si no, el select la mostraría vacía y guardar
      // sin tocarla la borraría.
      setDuracionLibre(
        Number(p.duracion) > 0 &&
          !DURACIONES_FRECUENTES.includes(Number(p.duracion)),
      );

      // Variedades: vienen adjuntas al listado de productos.
      setEsVariable(Number(p.es_variable) === 1);
      /* Si lo importado trae un rótulo que no está en la lista (Dropi a veces
         no manda el nombre del atributo), se cae a "Color" en vez de dejar
         ninguno marcado, que era lo que confundía. */
      const attrGuardado = String(p.variaciones?.[0]?.atributo || "").split(
        " / ",
      )[0];
      setAtributo(ATRIBUTOS.includes(attrGuardado) ? attrGuardado : "Color");
      setVariaciones(
        Array.isArray(p.variaciones) && p.variaciones.length
          ? p.variaciones.map((v) => ({
              dropi_variation_id: v.dropi_variation_id ?? "",
              atributo: v.atributo ?? "Color",
              valor: v.valor ?? "",
              stock: v.stock ?? 0,
              precio_proveedor: v.precio_proveedor ?? "",
              precio_sugerido: v.precio_sugerido ?? "",
            }))
          : [],
      );

      /* abrir acordeón catálogo si ya tiene datos */
      if (privVal !== "" || p.material || p.landing_url) setCatalogOpen(true);
    } else {
      setForm({ ...EMPTY_FORM });
      setPreviewUrl(null);
      setPreviewVideo(null);
      setPreviewUpsell(null);
      setImagenRemoved(false);
      setDuracionLibre(false);
      setCatalogOpen(false);
      setEsVariable(false);
      setVariaciones([]);
      // El estado es `atributo` (string), no el `atributosSel` (array) que
      // existía antes. La rama de editar sí se actualizó al renombrarlo; esta
      // no, y por eso "Agregar" reventaba con ReferenceError.
      setAtributo("Color");
    }
    setCombosOpen(false);
  }, [open, editingProduct]);

  const setF = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  /* ── File pickers ── */
  const makeDragHandlers = (ref) => ({
    onDragOver: (e) => {
      e.preventDefault();
      ref.current?.classList.add("border-indigo-400", "bg-indigo-50/40");
    },
    onDragLeave: () => {
      ref.current?.classList.remove("border-indigo-400", "bg-indigo-50/40");
    },
  });

  const pickImage = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setF("imagen", file);
    // Quitó una y subió otra: manda el archivo nuevo, no la orden de borrar.
    setImagenRemoved(false);
  };
  const dropImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    pickImage(e.dataTransfer.files?.[0]);
    dropRef.current?.classList.remove("border-indigo-400", "bg-indigo-50/40");
  };

  /* cambiar el límite de 50MB a 16MB */
  const pickVideo = (file) => {
    if (!file || !file.type.startsWith("video/")) return;
    if (file.size > 16 * 1024 * 1024) {
      // ← era 50MB
      Swal.fire({
        icon: "warning",
        title: "Video demasiado grande",
        text: "Máx 16 MB (límite de WhatsApp Business).",
      });
      return;
    }
    if (previewVideo?.startsWith("blob:")) URL.revokeObjectURL(previewVideo);
    setPreviewVideo(URL.createObjectURL(file));
    setVideoRemoved(false); // ← limpiar flag si sube nuevo video
    setF("video", file);
  };

  const dropVideo = (e) => {
    e.preventDefault();
    e.stopPropagation();
    pickVideo(e.dataTransfer.files?.[0]);
    dropVideoRef.current?.classList.remove(
      "border-indigo-400",
      "bg-indigo-50/40",
    );
  };

  const pickUpsell = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (previewUpsell?.startsWith("blob:")) URL.revokeObjectURL(previewUpsell);
    setPreviewUpsell(URL.createObjectURL(file));
    setF("imagen_upsell", file);
  };
  const dropUpsell = (e) => {
    e.preventDefault();
    e.stopPropagation();
    pickUpsell(e.dataTransfer.files?.[0]);
    dropUpsellRef.current?.classList.remove(
      "border-indigo-400",
      "bg-indigo-50/40",
    );
  };

  /* ── Submit ── */
  const handleSave = async () => {
    if (!form.nombre.trim()) {
      Swal.fire({ icon: "warning", title: "Ingresa el nombre del producto" });
      return;
    }
    if (!form.precio) {
      Swal.fire({ icon: "warning", title: "Ingresa el precio" });
      return;
    }
    if (esVariable && !variaciones.some(variacionCompleta)) {
      Swal.fire({
        icon: "warning",
        title: "Falta la variedad",
        text: `Marcaste que se vende en varias opciones: agrega al menos un ${atributo.toLowerCase()}.`,
      });
      return;
    }

    setSaving(true);
    try {
      const idc = parseInt(localStorage.getItem("id_configuracion"));
      const data = new FormData();

      /* Campos que SÍ se mandan aunque vayan vacíos, porque vaciarlos es una
         decisión del usuario y no "no lo tocó".
         Las sesiones entran acá: pasar un servicio de plan a sesión única deja
         los dos campos en blanco, y al no enviarlos el backend los daba por
         intactos. Se guardaba "correctamente" y el plan viejo seguía ahí.
         La descripción, por lo mismo: borrarla y guardar avisaba "Producto
         actualizado" pero el texto viejo seguía en la BD —y seguía siendo lo
         que el asistente le leía al cliente— hasta que se escribía algo encima. */
      const CAMPOS_BORRABLES = [
        "descripcion",
        "nombre_upsell",
        "descripcion_upsell",
        "precio_upsell",
        "material",
        "landing_url",
        "precio_proveedor",
        "sesiones_min",
        "sesiones_max",
      ];

      Object.entries(form).forEach(([k, v]) => {
        if (k === "tipo") {
          // Lo elige el usuario en el modal. El tipo de la cuenta solo actúa de
          // valor por defecto cuando todavía no tocó el selector.
          data.append("tipo", v || tipoCuenta);
        } else if (k === "stock") {
          // No se manda para productos de Dropi: ese stock lo escribe la
          // sincronización y mandarlo desde aquí sería pisarlo con un número
          // viejo hasta la próxima corrida del cron.
          if (esDeDropi) return;
          // Un servicio no tiene unidades: se manda 0 para no dejar un stock
          // viejo colgando si el ítem pasó de producto a servicio.
          data.append(
            "stock",
            (form.tipo || tipoCuenta) === "producto" ? v || 0 : 0,
          );
        } else if (k === "combos_producto") {
          data.append(k, JSON.stringify(v));
        } else if (v === null || v === undefined) {
          // archivos no seleccionados → no enviar
        } else if (v === "" && !CAMPOS_BORRABLES.includes(k)) {
          // campos vacíos no borrables → no enviar
        } else {
          data.append(k, v); // envía incluso "" para los borrables
        }
      });

      // Variedades: el back las reemplaza en bloque y limpia si se desmarca.
      data.append("es_variable", esVariable ? "1" : "0");
      if (esVariable) {
        data.append(
          "variaciones",
          JSON.stringify(
            variaciones
              .filter(variacionCompleta)
              .map((v) => ({ ...v, atributo })),
          ),
        );
      }

      if (imagenRemoved && !form.imagen) {
        data.append("remove_imagen", "1");
      }

      if (videoRemoved && !form.video) {
        data.append("remove_video", "1");
      }

      if (upsellRemoved && !form.imagen_upsell) {
        data.append("remove_imagen_upsell", "1");
      }

      if (editingProduct) data.append("id_producto", editingProduct.id);
      else data.append("id_configuracion", idc);

      const url = editingProduct
        ? "/productos/actualizarProducto"
        : "/productos/agregarProducto";

      await chatApi.post(url, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      Swal.fire({
        icon: "success",
        title: editingProduct ? "Producto actualizado" : "Producto agregado",
        timer: 1400,
        showConfirmButton: false,
      });
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Error al guardar",
        text: err?.response?.data?.message || "Intenta de nuevo.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const imgHandlers = makeDragHandlers(dropRef);
  const videoHandlers = makeDragHandlers(dropVideoRef);
  const upsellHandlers = makeDragHandlers(dropUpsellRef);

  const wordCount = form.descripcion.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3"
      style={{ background: "rgba(5,7,20,.72)", backdropFilter: "blur(12px)" }}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className="w-full max-w-5xl max-h-[92vh] rounded-2xl overflow-hidden flex flex-col"
        style={{
          boxShadow: "0 24px 80px rgba(0,0,0,.55)",
          animation: "pmIn .22s cubic-bezier(.34,1.4,.64,1)",
        }}
      >
        {/* ═══════════ HEADER — todo azul, sin línea blanca ═══════════ */}
        <div className="flex items-center justify-between px-6 py-5 flex-shrink-0 bg-[#171931]">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#171931]"
              style={{
                background: "rgba(255,255,255,.12)",
                border: "1px solid rgba(255,255,255,.18)",
              }}
            >
              <i
                className={`bx ${editingProduct ? "bx-edit" : "bx-plus-circle"} text-white text-xl`}
              />
            </div>
            <div>
              <h2 className="text-white font-bold text-base leading-tight">
                {editingProduct ? "Editar producto" : "Agregar producto"}
              </h2>
              <p className="text-indigo-300 text-xs mt-0.5">
                {editingProduct
                  ? `ID #${editingProduct.id} · ${editingProduct.nombre}`
                  : "Completa los campos requeridos para crear el producto"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {editingProduct && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-indigo-300 bg-white/8 px-3 py-1.5 rounded-lg border border-white/10">
                <i className="bx bx-pencil text-xs" />
                Modo edición
              </div>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors text-white/60 hover:text-white hover:bg-white/12"
            >
              <i className="bx bx-x text-xl" />
            </button>
          </div>
        </div>

        {/* ═══════════ BODY — blanco ═══════════ */}
        <div className="flex-1 overflow-y-auto bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {/* ─── COLUMNA IZQUIERDA ─── */}
            <div className="p-6 space-y-6">
              {/* Información principal */}
              <div>
                <SecHead icon="bx-info-circle" title="Información principal" />
                <div className="space-y-4">
                  <div>
                    <Lbl required>Nombre</Lbl>
                    <Inp
                      placeholder="Ej. Plan Premium, Protector de colchón…"
                      value={form.nombre}
                      onChange={(e) => setF("nombre", e.target.value)}
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      <i className="bx bx-bulb text-amber-400 align-middle mr-0.5" />
                      Recuerda colocar en tu anuncio el mismo título del
                      producto tal como lo guardas aquí, para que el bot lo
                      reconozca y responda correctamente a tus clientes.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Descripción
                      </label>

                      {/* Redactar con IA. Es el campo que más se deja vacío y
                          el que más necesita el asistente: sin descripción el
                          bot solo sabe nombre y precio, y ante cualquier
                          pregunta del cliente responde que no tiene el dato.
                          Solo aparece si el negocio tiene su OpenAI conectado,
                          porque la llamada corre con SU api key. */}
                      {iaDisponible && (
                        <button
                          type="button"
                          onClick={generarDescripcionIA}
                          disabled={generandoIA || !form.nombre.trim()}
                          title={
                            !form.nombre.trim()
                              ? "Escribe primero el nombre del producto"
                              : previewUrl
                                ? "La IA también mirará la foto del producto"
                                : "Redactar la descripción automáticamente"
                          }
                          className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold
                            text-white transition-all disabled:cursor-not-allowed disabled:opacity-45
                            enabled:hover:shadow-md enabled:hover:-translate-y-px"
                          style={{
                            background:
                              "linear-gradient(100deg,#4f46e5 0%,#7c3aed 100%)",
                          }}
                        >
                          {generandoIA ? (
                            <>
                              <i className="bx bx-loader-alt bx-spin text-sm" />
                              Redactando…
                            </>
                          ) : (
                            <>
                              <i className="bx bx-magic-wand text-sm" />
                              {form.descripcion.trim()
                                ? "Mejorar con IA"
                                : "Generar con IA"}
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Más alto: con 4 filas tocaba arrastrar la esquina para
                        leer lo escrito, y casi nadie sabe que se puede. */}
                    <textarea
                      rows={11}
                      disabled={generandoIA}
                      placeholder="Detalle del producto o servicio…"
                      value={form.descripcion}
                      onChange={(e) => {
                        const words = e.target.value.trim().split(/\s+/);
                        if (words.length <= 600)
                          setF("descripcion", e.target.value);
                      }}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none
                        resize-y transition focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400
                        disabled:bg-slate-50 disabled:text-slate-400"
                    />

                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p className="text-xs text-slate-400">
                        {wordCount}/600 palabras
                      </p>

                      {descripcionPrevia !== null && !generandoIA && (
                        <button
                          type="button"
                          onClick={() => {
                            setF("descripcion", descripcionPrevia);
                            setDescripcionPrevia(null);
                          }}
                          className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition"
                        >
                          <i className="bx bx-undo text-sm" />
                          Deshacer
                        </button>
                      )}
                    </div>

                    {iaDisponible && !form.descripcion.trim() && !generandoIA && (
                      <p className="text-xs text-slate-400 mt-1">
                        <i className="bx bx-bulb text-amber-400 align-middle mr-0.5" />
                        Escribe el nombre, sube la foto y deja que la IA arme la
                        descripción. Después puedes editarla a mano.
                      </p>
                    )}
                  </div>

                  {/* El tipo ya no se pregunta: sale de lo que se eligió al
                      activar el bot (Productos o Servicios en Asistentes).
                      Precio y categoría comparten fila: el precio no necesita
                      todo el ancho y así se ahorra un salto de línea. */}
                  <div className="grid grid-cols-[130px_1fr] gap-3">
                    <div>
                      <Lbl required>Precio</Lbl>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">
                          $
                        </span>
                        <Inp
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="pl-7"
                          value={form.precio}
                          onChange={(e) => setF("precio", e.target.value)}
                        />
                      </div>
                    </div>
                    <CategoriaField
                      value={form.id_categoria}
                      categorias={categorias}
                      onChange={(v) => setF("id_categoria", v)}
                      onCategoriasChange={onCategoriasChange}
                    />
                  </div>

                  {/* Tipo por ítem. Antes se heredaba invisible de lo elegido
                      en Asistentes y no había forma de cambiarlo: una estética
                      que además vende una plancha no podía cargarla como
                      producto. Ahora se elige aquí, y el formulario cambia
                      según lo que sea — un servicio tiene duración, un producto
                      tiene unidades. */}
                  <div>
                    <Lbl>¿Qué estás cargando?</Lbl>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {[
                        {
                          v: "servicio",
                          icon: "bx-calendar-check",
                          t: "Servicio",
                          d: "Se agenda una cita",
                        },
                        {
                          v: "producto",
                          icon: "bx-package",
                          t: "Producto",
                          d: "Se vende y se entrega",
                        },
                      ].map((o) => {
                        const activo = (form.tipo || tipoCuenta) === o.v;
                        return (
                          <button
                            key={o.v}
                            type="button"
                            onClick={() => setF("tipo", o.v)}
                            className={`flex items-start gap-2 rounded-xl border p-3 text-left transition ${
                              activo
                                ? "border-indigo-400 bg-indigo-50/60 ring-2 ring-indigo-100"
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <i
                              className={`bx ${o.icon} text-lg ${
                                activo ? "text-indigo-600" : "text-slate-400"
                              }`}
                            />
                            <span className="min-w-0">
                              <span
                                className={`block text-sm font-semibold ${
                                  activo ? "text-indigo-700" : "text-slate-700"
                                }`}
                              >
                                {o.t}
                              </span>
                              <span className="block text-[11px] text-slate-500">
                                {o.d}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Unidades: solo para productos. Un servicio no se agota.
                      Y si el producto vino de Dropi, el stock NO se edita a
                      mano: lo pisa la sincronización diaria y el dropshipper
                      terminaría peleando contra el cron sin entender por qué su
                      número vuelve a cambiar solo. */}
                  {(form.tipo || tipoCuenta) === "producto" &&
                    (esDeDropi ? (
                      <div>
                        <Lbl>Unidades disponibles</Lbl>
                        <div className="mt-1 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                          <i className="bx bx-sync text-lg text-slate-400" />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-700">
                              {Number(form.stock) || 0} unidades
                              <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200">
                                Dropi
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              Este producto viene de Dropi: el stock lo toma de
                              sus bodegas y se actualiza solo. Actívalo o
                              desactívalo con el switch <strong>Stock</strong>{" "}
                              de la pantalla de productos.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Lbl>Unidades disponibles</Lbl>
                        <Inp
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          value={form.stock}
                          onChange={(e) =>
                            setF("stock", e.target.value.replace(/\D/g, ""))
                          }
                        />
                        <p className="mt-1 text-[11px] text-slate-500">
                          El asistente lo usa como referencia para no ofrecer
                          algo agotado. Déjalo en 0 si no llevas control de
                          inventario.
                        </p>
                      </div>
                    ))}

                  {/* La duración solo aplica a servicios.
                      Va en MINUTOS y no en horas: en estética, consultorios o
                      barberías la mayoría de los servicios dura 30 o 45 min, y
                      un selector de horas enteras los dejaba fuera. Es lo que
                      usa el asistente para calcular a qué hora termina la cita.
                      No es obligatoria: si no se define, la cita se agenda con
                      una hora por defecto. */}
                  {(form.tipo || tipoCuenta) === "servicio" && (
                    <div>
                      <div className="flex items-center justify-between">
                        <Lbl>Duración</Lbl>
                        <button
                          type="button"
                          onClick={() => setDuracionLibre((v) => !v)}
                          className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 mb-1"
                        >
                          {duracionLibre
                            ? "Elegir de la lista"
                            : "Otra duración"}
                        </button>
                      </div>

                      {duracionLibre ? (
                        <>
                          <div className="relative">
                            <input
                              type="number"
                              min="5"
                              step="5"
                              inputMode="numeric"
                              placeholder="Ej: 20"
                              value={form.duracion || ""}
                              onChange={(e) =>
                                setF(
                                  "duracion",
                                  e.target.value.replace(/\D/g, ""),
                                )
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pr-20 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                            />
                            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                              minutos
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {Number(form.duracion) > 0
                              ? `Equivale a ${fmtDuracion(form.duracion)}.`
                              : "Déjalo vacío y la cita se agenda con 1 hora."}
                          </p>
                        </>
                      ) : (
                        <Sel
                          value={
                            DURACIONES_FRECUENTES.includes(
                              Number(form.duracion),
                            )
                              ? form.duracion
                              : "0"
                          }
                          onChange={(e) => setF("duracion", e.target.value)}
                        >
                          <option value="0">Sin definir (1 hora)</option>
                          {DURACIONES_FRECUENTES.map((m) => (
                            <option key={m} value={m}>
                              {fmtDuracion(m)}
                            </option>
                          ))}
                        </Sel>
                      )}
                    </div>
                  )}
                </div>

                {/* Plan de sesiones. Antes esto vivía suelto en la descripción
                    ("entre 6 y 8 sesiones") y el bot tenía que interpretarlo:
                    perseguía con "tu próxima sesión" a quien vino por algo de
                    una sola vez, y con planes variables —borrado de tatuajes,
                    que termina en 3 o en 8— insistía con un número inventado. */}
                {(form.tipo || tipoCuenta) === "servicio" && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                    <Lbl>¿Cuántas sesiones lleva este servicio?</Lbl>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-2 text-[13px] text-slate-700">
                        <input
                          type="radio"
                          checked={Number(form.sesiones_max || 1) <= 1}
                          onChange={() => {
                            setF("sesiones_min", "");
                            setF("sesiones_max", "");
                          }}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500/30"
                        />
                        Una sola sesión
                      </label>

                      <label className="flex items-center gap-2 text-[13px] text-slate-700">
                        <input
                          type="radio"
                          checked={Number(form.sesiones_max || 1) > 1}
                          onChange={() => {
                            setF("sesiones_min", form.sesiones_min || 6);
                            setF("sesiones_max", form.sesiones_max || 8);
                          }}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500/30"
                        />
                        Es un plan de varias
                      </label>
                    </div>

                    {Number(form.sesiones_max || 1) > 1 && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[13px] text-slate-700">
                        <span>De</span>
                        <input
                          type="number"
                          min="1"
                          value={form.sesiones_min || ""}
                          onChange={(e) =>
                            setF(
                              "sesiones_min",
                              e.target.value.replace(/\D/g, ""),
                            )
                          }
                          className="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-center focus:border-indigo-500 focus:outline-none"
                        />
                        <span>a</span>
                        <input
                          type="number"
                          min="1"
                          value={form.sesiones_max || ""}
                          onChange={(e) =>
                            setF(
                              "sesiones_max",
                              e.target.value.replace(/\D/g, ""),
                            )
                          }
                          className="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-center focus:border-indigo-500 focus:outline-none"
                        />
                        <span>sesiones</span>
                      </div>
                    )}

                    <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                      {Number(form.sesiones_max || 1) > 1
                        ? Number(form.sesiones_min) ===
                          Number(form.sesiones_max)
                          ? "Plan fijo: el asistente irá ofreciendo la siguiente hasta completarlo."
                          : "Plan variable: cuando la clienta pase del mínimo, el asistente le preguntará si quiere agendar la siguiente cita en vez de asumir que le faltan más."
                        : "El asistente no le hablará de próximas sesiones, ni enviará mensajes de remarketing para agendar la siguiente cita."}
                    </p>
                  </div>
                )}
              </div>

              {/* Combos acordeón */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setCombosOpen(!combosOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <i className="bx bx-package text-slate-500" />
                    <span className="text-sm font-semibold text-slate-700">
                      Combos
                    </span>
                    <span className="text-xs text-slate-400 font-normal">
                      (opcional)
                    </span>
                  </div>
                  <i
                    className={`bx bx-chevron-${combosOpen ? "up" : "down"} text-slate-400 text-lg`}
                  />
                </button>

                {combosOpen && (
                  <div className="border-t border-slate-100 p-4">
                    <div className="grid grid-cols-3 gap-3">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="border border-slate-100 rounded-xl p-3 space-y-2"
                        >
                          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                            Combo {i + 1}
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 mb-1">
                              Cantidad
                            </div>
                            <Inp
                              type="number"
                              min="1"
                              placeholder="Ej. 2"
                              value={form.combos_producto?.[i]?.cantidad || ""}
                              onChange={(e) => {
                                const u = [...form.combos_producto];
                                u[i] = { ...u[i], cantidad: e.target.value };
                                setF("combos_producto", u);
                              }}
                            />
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 mb-1">
                              Precio
                            </div>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                                $
                              </span>
                              <Inp
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="pl-6"
                                value={form.combos_producto?.[i]?.precio || ""}
                                onChange={(e) => {
                                  const u = [...form.combos_producto];
                                  u[i] = { ...u[i], precio: e.target.value };
                                  setF("combos_producto", u);
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* ID Dropi por combo: el aviso va UNA sola vez y abajo
                        la fila de IDs, alineada con cada combo. */}
                    {esDropi && (
                      <div className="mt-4">
                        <p className="text-xs text-slate-500 mb-2">
                          <i className="bx bx-bulb text-amber-400 align-middle mr-0.5" />
                          ¿Tu proveedor vende alguno de estos combos como
                          producto aparte en Dropi? Pega su ID abajo y el pedido
                          se creará con ese producto cuando el cliente solicite
                          algún combo.
                        </p>
                        <br />
                        <div className="grid grid-cols-3 gap-3">
                          {[0, 1, 2].map((i) => (
                            <div key={i}>
                              <div className="text-xs text-slate-500 mb-1">
                                ID Dropi combo {i + 1}{" "}
                                <span className="text-slate-400">
                                  (opcional)
                                </span>
                              </div>
                              <Inp
                                type="number"
                                min="1"
                                placeholder="Ej. 133245"
                                value={
                                  form.combos_producto?.[i]?.id_dropi || ""
                                }
                                onChange={(e) => {
                                  const u = [...form.combos_producto];
                                  u[i] = { ...u[i], id_dropi: e.target.value };
                                  setF("combos_producto", u);
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ═══ ACORDEÓN LÓGICA CATÁLOGOS ═══ */}
              <div
                className="rounded-xl overflow-hidden"
                style={{ border: "1.5px solid #c7d2fe" }}
              >
                <button
                  type="button"
                  onClick={() => setCatalogOpen(!catalogOpen)}
                  className="w-full flex items-center justify-between px-4 py-3.5 transition-colors"
                  style={{ background: catalogOpen ? "#eef2ff" : "#f5f7ff" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-600">
                      <i className="bx bx-book-open text-white text-sm" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-indigo-700">
                        Catálogos
                      </div>
                      <div className="text-xs text-indigo-400 mt-0.5">
                        Visibilidad · Material · Enlace externo
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {form.es_privado === "1" && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                        Privado
                      </span>
                    )}
                    {form.es_privado === "0" && (
                      <span className="text-[10px] bg-sky-100 text-sky-700 font-bold px-2 py-0.5 rounded-full border border-sky-200">
                        Público
                      </span>
                    )}
                    <i
                      className={`bx bx-chevron-${catalogOpen ? "up" : "down"} text-indigo-400 text-lg`}
                    />
                  </div>
                </button>

                {catalogOpen && (
                  <div className="border-t border-indigo-100 p-5 space-y-5 bg-white">
                    {/* Visibilidad — cards selector */}
                    <div>
                      <Lbl>Visibilidad del producto en catálogos</Lbl>
                      <div className="grid grid-cols-3 gap-2 mt-1">
                        {[
                          {
                            val: "",
                            icon: "bx-minus-circle",
                            label: "Sin definir",
                            desc: "Heredar del catálogo",
                            dotColor: "#94a3b8",
                          },
                          {
                            val: "0",
                            icon: "bx-world",
                            label: "Público",
                            desc: "Visible para todos",
                            dotColor: "#38bdf8",
                          },
                          {
                            val: "1",
                            icon: "bx-lock",
                            label: "Privado",
                            desc: "Solo con contraseña",
                            dotColor: "#f59e0b",
                          },
                        ].map((opt) => {
                          const active = form.es_privado === opt.val;
                          return (
                            <button
                              key={opt.val}
                              type="button"
                              onClick={() => setF("es_privado", opt.val)}
                              className="flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all"
                              style={{
                                borderColor: active ? "#4f46e5" : "#e2e8f0",
                                background: active ? "#eef2ff" : "#fafafa",
                              }}
                            >
                              <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center mb-1.5"
                                style={{
                                  background: active ? "#e0e7ff" : "#f1f5f9",
                                }}
                              >
                                <i
                                  className={`bx ${opt.icon} text-sm`}
                                  style={{
                                    color: active ? "#4338ca" : "#94a3b8",
                                  }}
                                />
                              </div>
                              <span
                                className="text-xs font-bold"
                                style={{
                                  color: active ? "#3730a3" : "#475569",
                                }}
                              >
                                {opt.label}
                              </span>
                              <span
                                className="text-[10px] mt-0.5 leading-tight"
                                style={{
                                  color: active ? "#6366f1" : "#94a3b8",
                                }}
                              >
                                {opt.desc}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {form.es_privado === "1" && (
                        <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                          <i className="bx bx-lock-alt text-amber-500 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-amber-700 leading-relaxed">
                            Este producto solo aparecerá en catálogos que tengan
                            contraseña configurada y solo para usuarios que la
                            ingresen correctamente.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Material */}
                    <div>
                      <Lbl>
                        Material / ficha técnica{" "}
                        <span className="normal-case font-normal text-slate-400">
                          (opcional)
                        </span>
                      </Lbl>
                      <div className="relative">
                        <i className="bx bx-link absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                        <Inp
                          className="pl-9"
                          placeholder="https://drive.google.com/..."
                          value={form.material}
                          onChange={(e) => setF("material", e.target.value)}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Enlace a ficha técnica, Drive, Dropbox u otro recurso.
                      </p>
                    </div>

                    {/* Landing URL */}
                    <div>
                      <Lbl>
                        Enlace / Landing externa{" "}
                        <span className="normal-case font-normal text-slate-400">
                          (opcional)
                        </span>
                      </Lbl>
                      <div className="relative">
                        <i className="bx bx-globe absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                        <Inp
                          className="pl-9"
                          placeholder="https://tienda.proveedor.com/producto"
                          value={form.landing_url}
                          onChange={(e) => setF("landing_url", e.target.value)}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Si el proveedor ya tiene su propia página de producto.
                      </p>
                    </div>

                    {/* Precio proveedor */}
                    <div>
                      <Lbl>
                        Precio proveedor{" "}
                        <span className="normal-case font-normal text-slate-400">
                          (costo Dropi u otro)
                        </span>
                      </Lbl>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">
                          $
                        </span>
                        <Inp
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="pl-7"
                          value={form.precio_proveedor}
                          onChange={(e) =>
                            setF("precio_proveedor", e.target.value)
                          }
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Se usa para calcular margen. Se llena automáticamente al
                        importar desde Dropi.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              {/* ═══ FIN ACORDEÓN CATÁLOGOS ═══ */}
            </div>

            {/* ─── COLUMNA DERECHA ─── */}
            <div className="p-6 space-y-6">
              {/* Imagen */}
              <div>
                <SecHead icon="bx-image-alt" title="Imagen del producto" />
                <DropZone
                  dropRef={dropRef}
                  onDrop={dropImage}
                  {...imgHandlers}
                  onPick={pickImage}
                  accept="image/*"
                  icon="bx-image-add"
                  hint="PNG, JPG, WEBP — máx. 5 MB"
                  preview={
                    previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full max-h-44 object-cover rounded-xl ring-1 ring-slate-200"
                      />
                    ) : null
                  }
                  onRemove={() => {
                    if (previewUrl?.startsWith("blob:"))
                      URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                    setF("imagen", null);
                    setImagenRemoved(true);
                  }}
                />
              </div>

              {/* Video */}
              <div>
                <SecHead icon="bx-video" title="Video del producto" />
                <DropZone
                  dropRef={dropVideoRef}
                  onDrop={dropVideo}
                  {...videoHandlers}
                  onPick={pickVideo}
                  accept="video/*"
                  icon="bx-video-plus"
                  hint="MP4, WEBM — máx. 16 MB (opcional)"
                  preview={
                    previewVideo ? (
                      <video
                        controls
                        src={previewVideo}
                        className="w-full max-h-44 rounded-xl ring-1 ring-slate-200"
                      />
                    ) : null
                  }
                  onRemove={() => {
                    if (previewVideo?.startsWith("blob:"))
                      URL.revokeObjectURL(previewVideo);
                    setPreviewVideo(null);
                    setF("video", null);
                    setVideoRemoved(true); // ← NUEVO: marcar que el usuario quitó el video
                  }}
                />
              </div>

              {/* ═══ Variedades (talla / color) ═══
                  Tabla seca: el atributo arriba y una fila por opción con su
                  código de Dropi. Sin stock (ese lo manda Dropi en vivo) y sin
                  párrafos: una línea basta para decir para qué sirve. */}
              <div>
                <SecHead icon="bx-palette" title="Variedades" />
                <p className="text-[12px] text-slate-500 -mt-1 mb-2.5">
                  Llena esto solo si tu producto se vende en varias opciones,
                  como tallas o colores.
                </p>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={esVariable}
                    onChange={(e) => {
                      setEsVariable(e.target.checked);
                      if (e.target.checked && variaciones.length === 0)
                        agregarVariacion();
                    }}
                    className="w-4 h-4 rounded accent-indigo-600"
                  />
                  <span className="text-sm text-slate-700">
                    Se vende en varias opciones
                  </span>
                </label>

                {esVariable && (
                  <div className="mt-3">
                    {/* Un solo tipo por producto: o color, o talla, o sabor. */}
                    <div className="flex flex-wrap gap-1.5">
                      {ATRIBUTOS.map((a) => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => cambiarAtributo(a)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                            atributo === a
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                          }`}
                        >
                          {a}
                        </button>
                      ))}
                    </div>

                    <div className="mt-3 rounded-xl border border-slate-200 overflow-hidden">
                      <div className="grid grid-cols-[1fr_130px_36px] gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {atributo}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          ID Dropi
                        </span>
                        <span />
                      </div>

                      {variaciones.map((v, i) => (
                        <div
                          key={i}
                          className="grid grid-cols-[1fr_130px_36px] gap-2 px-3 py-2 items-center border-b border-slate-100 last:border-b-0"
                        >
                          <Inp
                            placeholder={
                              atributo === "Talla"
                                ? "M"
                                : atributo === "Sabor"
                                  ? "Fresa"
                                  : atributo === "Modelo"
                                    ? "Pro"
                                    : "Negro"
                            }
                            value={v.valor}
                            onChange={(e) =>
                              cambiarVariacion(i, "valor", e.target.value)
                            }
                          />
                          <Inp
                            placeholder="51400"
                            value={v.dropi_variation_id}
                            onChange={(e) =>
                              cambiarVariacion(
                                i,
                                "dropi_variation_id",
                                e.target.value,
                              )
                            }
                          />
                          <button
                            type="button"
                            onClick={() => quitarVariacion(i)}
                            title="Quitar"
                            className="w-8 h-8 grid place-items-center rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition"
                          >
                            <i className="bx bx-x text-xl" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={agregarVariacion}
                      className="w-full mt-2 py-2 rounded-xl border border-dashed border-indigo-300 text-indigo-600 text-sm font-semibold hover:bg-indigo-50 transition"
                    >
                      <i className="bx bx-plus align-middle" /> Agregar
                    </button>
                  </div>
                )}
              </div>

              {/* Upsell — OCULTO. Ningún prompt lo pide (la única mención en
                  las plantillas es la regla de formato de la imagen) y el
                  bloque que lo inyectaba solo corría con
                  tipo_configuracion='ventas', que ya no existe. Se conserva el
                  marcado y el envío para no perder lo ya cargado. */}
              <div className="hidden">
                <SecHead icon="bx-trending-up" title="Upsell" />
                <div className="space-y-4">
                  <div>
                    <Lbl>Nombre del upsell</Lbl>
                    <Inp
                      placeholder="Ej. Soporte premium, Accesorio extra…"
                      value={form.nombre_upsell}
                      onChange={(e) => setF("nombre_upsell", e.target.value)}
                    />
                  </div>

                  <div>
                    <Lbl>Descripción del upsell</Lbl>
                    <textarea
                      rows={3}
                      placeholder="Beneficio adicional que ofreces…"
                      value={form.descripcion_upsell}
                      onChange={(e) =>
                        setF("descripcion_upsell", e.target.value)
                      }
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none
                        resize-none transition focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                    />
                  </div>

                  <div>
                    <Lbl>Precio del upsell</Lbl>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">
                        $
                      </span>
                      <Inp
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="pl-7"
                        value={form.precio_upsell}
                        onChange={(e) => setF("precio_upsell", e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Lbl>Imagen del upsell</Lbl>
                    <DropZone
                      dropRef={dropUpsellRef}
                      onDrop={dropUpsell}
                      {...upsellHandlers}
                      onPick={pickUpsell}
                      accept="image/*"
                      icon="bx-image-add"
                      hint="PNG, JPG, WEBP (opcional)"
                      preview={
                        previewUpsell ? (
                          <img
                            src={previewUpsell}
                            alt="Upsell preview"
                            className="w-full max-h-36 object-cover rounded-xl ring-1 ring-slate-200"
                          />
                        ) : null
                      }
                      onRemove={() => {
                        if (previewUpsell?.startsWith("blob:"))
                          URL.revokeObjectURL(previewUpsell);
                        setPreviewUpsell(null);
                        setF("imagen_upsell", null);
                        setUpsellRemoved(true); // ← agregar esto
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════ FOOTER — todo azul ═══════════ */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0 gap-4 bg-[#171931]">
          <p className="text-indigo-300 text-xs hidden sm:block truncate">
            {editingProduct
              ? "Los cambios se aplicarán inmediatamente al guardar."
              : "El producto quedará disponible para catálogos y flujos de automatización."}
          </p>

          <div className="flex gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{
                border: "1.5px solid rgba(255,255,255,.25)",
                color: "rgba(255,255,255,.8)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,.1)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white
                disabled:opacity-60 transition-all"
              style={{
                background: "#4f46e5",
                boxShadow: "0 0 0 2px rgba(99,102,241,.45)",
              }}
              onMouseEnter={(e) => {
                if (!saving) e.currentTarget.style.background = "#4338ca";
              }}
              onMouseLeave={(e) => {
                if (!saving) e.currentTarget.style.background = "#4f46e5";
              }}
            >
              {saving ? (
                <>
                  <svg
                    className="animate-spin w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Guardando…
                </>
              ) : (
                <>
                  <i className="bx bx-save text-base" />
                  {editingProduct ? "Actualizar producto" : "Agregar producto"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pmIn {
          from { opacity:0; transform:scale(.96) translateY(14px); }
          to   { opacity:1; transform:scale(1)   translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default ProductoModal;
