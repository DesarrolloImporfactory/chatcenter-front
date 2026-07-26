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

const Inp = ({ className = "", ...props }) => (
  <input
    {...props}
    className={`w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none
      transition focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white ${className}`}
  />
);

const Sel = ({ children, className = "", ...props }) => (
  <select
    {...props}
    className={`w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none
      transition focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white ${className}`}
  >
    {children}
  </select>
);

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

/* ─────────────────────────────────────────────────────────────
   MAIN
───────────────────────────────────────────────────────────── */
const ProductoModal = ({
  open,
  onClose,
  editingProduct,
  categorias,
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
     activar el bot en Asistentes, en vez de preguntarlo otra vez acá. */
  const [tipoCuenta, setTipoCuenta] = useState("producto");
  useEffect(() => {
    if (!open) return;
    const idc = parseInt(localStorage.getItem("id_configuracion"));
    if (!idc) return;
    chatApi
      .post(
        "openai_assistants/info_asistentes",
        { id_configuracion: idc },
        { silentError: true },
      )
      .then(({ data }) => {
        const ofrece = data?.data?.ventas?.ofrecer;
        setTipoCuenta(ofrece === "servicios" ? "servicio" : "producto");
      })
      .catch(() => setTipoCuenta("producto"));
  }, [open]);

  /* ── Populate on open ── */
  useEffect(() => {
    setUpsellRemoved(false);
    setVideoRemoved(false);
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
      setCatalogOpen(false);
      setEsVariable(false);
      setVariaciones([]);
      setAtributosSel(["Color"]);
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

      const CAMPOS_BORRABLES = [
        "nombre_upsell",
        "descripcion_upsell",
        "precio_upsell",
        "material",
        "landing_url",
        "precio_proveedor",
      ];

      Object.entries(form).forEach(([k, v]) => {
        if (k === "tipo") {
          // Heredado de Asistentes; en productos ya guardados se respeta el
          // suyo para no cambiarle el tipo a nadie sin querer.
          data.append("tipo", v || tipoCuenta);
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
                    <Lbl>Descripción</Lbl>
                    {/* Más alto: con 4 filas tocaba arrastrar la esquina para
                        leer lo escrito, y casi nadie sabe que se puede. */}
                    <textarea
                      rows={11}
                      placeholder="Detalle del producto o servicio…"
                      value={form.descripcion}
                      onChange={(e) => {
                        const words = e.target.value.trim().split(/\s+/);
                        if (words.length <= 600)
                          setF("descripcion", e.target.value);
                      }}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none
                        resize-y transition focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      {wordCount}/600 palabras
                    </p>
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
                    <div>
                      <Lbl required>Categoría</Lbl>
                      <Sel
                        value={form.id_categoria}
                        onChange={(e) => setF("id_categoria", e.target.value)}
                      >
                        <option value="">Selecciona categoría</option>
                        {categorias.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre}
                          </option>
                        ))}
                      </Sel>
                    </div>
                  </div>

                  {/* La duración solo aplica a servicios; el tipo se hereda. */}
                  {(form.tipo || tipoCuenta) === "servicio" && (
                    <div>
                      <Lbl>Duración (horas)</Lbl>
                      <Sel
                        value={form.duracion}
                        onChange={(e) => setF("duracion", e.target.value)}
                      >
                        <option value="0">Selecciona duración</option>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>
                            {n} hora{n > 1 ? "s" : ""}
                          </option>
                        ))}
                      </Sel>
                    </div>
                  )}
                </div>
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
