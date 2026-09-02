import React, { useState, useRef, useMemo } from "react";
import Swal from "sweetalert2";
import chatApi from "../../../api/chatcenter";

/**
 * LauncherWizardModal
 *
 * Wizard de 4 pasos para crear/editar una plantilla de campaña CTWA:
 * 1. Producto y página   2. Presupuesto y alcance
 * 3. Creativo            4. Revisar y lanzar
 */

const PASOS = [
  { n: 1, label: "Producto", icon: "bx-box" },
  { n: 2, label: "Alcance", icon: "bx-target-lock" },
  { n: 3, label: "Creativo", icon: "bx-image-alt" },
  { n: 4, label: "Lanzar", icon: "bx-rocket" },
];

const PAISES_SUGERIDOS = [
  { code: "EC", label: "Ecuador" },
  { code: "CO", label: "Colombia" },
  { code: "PE", label: "Perú" },
  { code: "MX", label: "México" },
  { code: "GT", label: "Guatemala" },
  { code: "CL", label: "Chile" },
  { code: "PA", label: "Panamá" },
  { code: "US", label: "EE.UU." },
];

const swalWarn = (text) =>
  Swal.fire({
    icon: "warning",
    title: "Falta un dato",
    text,
    confirmButtonText: "Entendido",
    customClass: { popup: "rounded-2xl" },
  });

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

  const [form, setForm] = useState(() => ({
    id: plantilla?.id || null,
    nombre: plantilla?.nombre || "",
    id_producto: plantilla?.id_producto || "",
    page_id: plantilla?.page_id || paginas[0]?.page_id || "",
    presupuesto_diario: plantilla?.presupuesto_diario || 5,
    paises: plantilla?.paises
      ? String(plantilla.paises).split(",")
      : ["EC"],
    edad_min: plantilla?.edad_min || 18,
    edad_max: plantilla?.edad_max || 65,
    genero: plantilla?.genero || "all",
    titulo: plantilla?.titulo || "",
    texto_principal: plantilla?.texto_principal || "",
    descripcion: plantilla?.descripcion || "",
    mensaje_bienvenida:
      plantilla?.mensaje_bienvenida ||
      "Hola 👋 vi su anuncio y quiero más información",
    imagen_url: plantilla?.imagen_url || null,
    imagen_hash: plantilla?.imagen_hash || null,
    estado_inicial: plantilla?.estado_inicial || "PAUSED",
  }));

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

  const productoSel = productos.find(
    (p) => Number(p.id) === Number(form.id_producto),
  );
  const paginaSel = paginas.find((p) => p.page_id === form.page_id);

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

  const irA = (n) => {
    setStep(n);
    bodyRef.current?.scrollTo?.({ top: 0 });
  };

  const validarPaso = (n) => {
    if (n === 1) {
      if (!form.nombre.trim()) {
        swalWarn("Ponle un nombre a la plantilla (ej: 'Faja lanzamiento EC').");
        return false;
      }
      if (!form.page_id) {
        swalWarn(
          "Selecciona la página de Facebook desde la que saldrá el anuncio.",
        );
        return false;
      }
    }
    if (n === 2) {
      if (!Number(form.presupuesto_diario) || Number(form.presupuesto_diario) < 1) {
        swalWarn("El presupuesto diario mínimo es 1.");
        return false;
      }
      if (!form.paises.length) {
        swalWarn("Selecciona al menos un país.");
        return false;
      }
    }
    return true;
  };

  const siguiente = () => {
    if (!validarPaso(step)) return;
    irA(step + 1);
  };

  const togglePais = (code) => {
    setForm((f) => ({
      ...f,
      paises: f.paises.includes(code)
        ? f.paises.filter((c) => c !== code)
        : [...f.paises, code],
    }));
  };

  const handleImagen = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setSubiendoImg(true);
    // Preview local inmediato; el hash llega de Meta.
    const previewLocal = URL.createObjectURL(file);
    try {
      const fd = new FormData();
      fd.append("archivo", file);
      fd.append("id_configuracion", id_configuracion);
      const { data } = await chatApi.post(
        "/meta_ads/launcher/subir-imagen",
        fd,
        {
          headers: { "Content-Type": "multipart/form-data" },
          silentError: true,
          timeout: 60000,
        },
      );
      if (data?.success) {
        setForm((f) => ({
          ...f,
          imagen_hash: data.data.imagen_hash,
          imagen_url: data.data.imagen_url || previewLocal,
        }));
      } else {
        Swal.fire({
          icon: "error",
          title: "Meta rechazó la imagen",
          text: data?.message || "Inténtalo con otra imagen (JPG/PNG).",
          customClass: { popup: "rounded-2xl" },
        });
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "No se pudo subir la imagen",
        text: err?.response?.data?.message || "Inténtalo de nuevo.",
        customClass: { popup: "rounded-2xl" },
      });
    } finally {
      setSubiendoImg(false);
    }
  };

  const guardar = async ({ lanzarDespues = false } = {}) => {
    if (!validarPaso(1) || !validarPaso(2)) return null;
    if (lanzarDespues && !form.imagen_hash) {
      swalWarn("Para lanzar necesitas la imagen del anuncio (paso 3).");
      return null;
    }
    if (lanzarDespues && !form.texto_principal.trim() && !form.titulo.trim()) {
      swalWarn("Para lanzar escribe al menos el texto o el título del anuncio.");
      return null;
    }
    setGuardando(true);
    try {
      const { data } = await chatApi.post(
        "/meta_ads/launcher/plantillas/guardar",
        {
          ...form,
          id_configuracion,
          paises: form.paises.join(","),
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
        await Swal.fire({
          icon: "success",
          title:
            form.estado_inicial === "ACTIVE"
              ? "¡Campaña lanzada!"
              : "Campaña creada en pausa",
          html: `Anuncio creado con ID <code>${lanzo.data.data.ad_id}</code>.<br/>
            <a href="${lanzo.data.data.ads_manager_url}" target="_blank" rel="noreferrer"
               style="color:#4f46e5;font-weight:600;">Verla en el Ads Manager →</a>`,
          confirmButtonText: "Listo",
          customClass: { popup: "rounded-2xl" },
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "La plantilla se guardó, pero Meta rechazó el lanzamiento",
          text: lanzo.data?.message || "Revisa la plantilla e inténtalo de nuevo.",
          customClass: { popup: "rounded-2xl" },
        });
      }
      onClose?.(true);
      return idGuardado;
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err?.response?.data?.message || "No se pudo guardar la plantilla.",
        customClass: { popup: "rounded-2xl" },
      });
      return null;
    } finally {
      setGuardando(false);
    }
  };

  const inputCls =
    "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300";
  const labelCls = "block text-[11px] font-bold text-slate-600 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-3">
      <div className="w-full max-w-3xl h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* HEADER */}
        <div className="bg-[#171931] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 grid place-items-center">
              <i className="bx bx-rocket text-lg" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold leading-tight">
                {form.id ? "Editar plantilla" : "Nueva plantilla de campaña"}
              </h2>
              <p className="text-[10px] text-white/60">
                Anuncio click-to-WhatsApp en tu cuenta{" "}
                {contexto?.ad_account_name || "publicitaria"}
              </p>
            </div>
          </div>
          <button
            onClick={() => onClose?.(false)}
            className="p-2 rounded-lg hover:bg-white/10 transition"
          >
            <i className="bx bx-x text-xl" />
          </button>
        </div>

        {/* STEPPER */}
        <div className="flex border-b border-slate-100">
          {PASOS.map((p) => (
            <button
              key={p.n}
              onClick={() => p.n < step && irA(p.n)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[11px] font-bold border-b-2 transition ${
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

        {/* BODY */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto px-5 py-5">
          {/* ── PASO 1: Producto y página ── */}
          {step === 1 && (
            <div className="space-y-4 max-w-lg mx-auto">
              <div>
                <label className={labelCls}>Nombre de la plantilla *</label>
                <input
                  className={inputCls}
                  value={form.nombre}
                  onChange={(e) => set("nombre", e.target.value)}
                  placeholder="Ej: Faja reductora · lanzamiento EC"
                  maxLength={150}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Producto que publicita (recomendado)
                </label>
                {productoSel ? (
                  <div className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2">
                    {productoSel.imagen_url ? (
                      <img
                        src={productoSel.imagen_url}
                        alt=""
                        className="w-8 h-8 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-white grid place-items-center text-indigo-300">
                        <i className="bx bx-box" />
                      </div>
                    )}
                    <span className="flex-1 text-sm font-semibold text-indigo-700 truncate">
                      {productoSel.nombre}
                    </span>
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
                      <div className="mt-1.5 max-h-44 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-50">
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
                  </>
                )}
                <p className="text-[10px] text-slate-400 mt-1">
                  Al lanzar, el anuncio queda vinculado al producto y la
                  atribución (bot + kanban) funciona desde el primer clic.
                </p>
              </div>
              <div>
                <label className={labelCls}>Página de Facebook *</label>
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
                      <p className="text-[10px] text-amber-600 mt-1 leading-relaxed">
                        Página detectada en tus anuncios existentes (el nombre
                        no es legible con tu acceso). Si Meta rechaza el
                        lanzamiento por permisos de página, asígnala
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
                      className="mt-1 text-[10px] font-semibold text-indigo-600 hover:underline"
                    >
                      ¿No está tu página? Ingresa el ID manualmente
                    </button>
                  </>
                ) : (
                  <>
                    {paginas.length === 0 && (
                      <div className="mb-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-[11px] text-amber-700 leading-relaxed">
                        Tu conexión de anuncios no puede listar tus páginas de
                        Facebook: la página no está asignada a ese acceso.
                        {contexto?.titular_token?.name ? (
                          <>
                            {" "}
                            En el Business Manager donde vive el usuario del
                            sistema{" "}
                            <strong>"{contexto.titular_token.name}"</strong> ve
                            a Usuarios del sistema → Asignar activos → Páginas,
                            elige tu página y activa{" "}
                            <strong>Crear anuncios</strong>. Con eso aparecerá
                            aquí sola.
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
                      Lo encuentras en tu página de Facebook → Configuración →
                      Transparencia de la página → ID de la página.
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
                <p className="text-[10px] text-slate-400 mt-1.5">
                  El anuncio sale a nombre de esta página. La página debe tener
                  tu número de WhatsApp vinculado en Meta.
                </p>
              </div>
            </div>
          )}

          {/* ── PASO 2: Presupuesto y alcance ── */}
          {step === 2 && (
            <div className="space-y-4 max-w-lg mx-auto">
              <div>
                <label className={labelCls}>
                  Presupuesto diario ({currency}) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  className={inputCls}
                  value={form.presupuesto_diario}
                  onChange={(e) => set("presupuesto_diario", e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Países *</label>
                <div className="flex flex-wrap gap-1.5">
                  {PAISES_SUGERIDOS.map((p) => (
                    <button
                      key={p.code}
                      type="button"
                      onClick={() => togglePais(p.code)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition ${
                        form.paises.includes(p.code)
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Edad mínima</label>
                  <input
                    type="number"
                    min="18"
                    max="65"
                    className={inputCls}
                    value={form.edad_min}
                    onChange={(e) => set("edad_min", e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Edad máxima</label>
                  <input
                    type="number"
                    min="18"
                    max="65"
                    className={inputCls}
                    value={form.edad_max}
                    onChange={(e) => set("edad_max", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Género</label>
                <div className="flex gap-1.5">
                  {[
                    { v: "all", label: "Todos" },
                    { v: "male", label: "Hombres" },
                    { v: "female", label: "Mujeres" },
                  ].map((g) => (
                    <button
                      key={g.v}
                      type="button"
                      onClick={() => set("genero", g.v)}
                      className={`px-4 py-1.5 rounded-full text-[11px] font-semibold border transition ${
                        form.genero === g.v
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── PASO 3: Creativo ── */}
          {step === 3 && (
            <div className="space-y-4 max-w-lg mx-auto">
              <div>
                <label className={labelCls}>Imagen del anuncio *</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImagen}
                />
                <div
                  onClick={() => !subiendoImg && fileRef.current?.click()}
                  className="rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-300 cursor-pointer transition overflow-hidden"
                >
                  {form.imagen_url ? (
                    <div className="relative">
                      <img
                        src={form.imagen_url}
                        alt="Creativo"
                        className="w-full max-h-56 object-cover"
                      />
                      <span className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/60 text-white text-[10px] font-semibold">
                        <i className="bx bx-refresh mr-1" />
                        Cambiar
                      </span>
                    </div>
                  ) : (
                    <div className="py-10 text-center text-slate-400">
                      {subiendoImg ? (
                        <>
                          <i className="bx bx-loader-alt animate-spin text-3xl" />
                          <p className="text-xs mt-2 font-semibold">
                            Subiendo a tu cuenta publicitaria...
                          </p>
                        </>
                      ) : (
                        <>
                          <i className="bx bx-cloud-upload text-3xl" />
                          <p className="text-xs mt-2 font-semibold">
                            Click para subir (JPG, PNG · máx 8 MB)
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className={labelCls}>Texto principal</label>
                <textarea
                  className={`${inputCls} min-h-[90px]`}
                  value={form.texto_principal}
                  onChange={(e) => set("texto_principal", e.target.value)}
                  placeholder={"🔥 Luce 2 tallas menos al instante\n✅ Envío GRATIS y pago contra entrega"}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Título</label>
                  <input
                    className={inputCls}
                    value={form.titulo}
                    onChange={(e) => set("titulo", e.target.value)}
                    placeholder="Ej: Solo por hoy con 40% OFF"
                    maxLength={255}
                  />
                </div>
                <div>
                  <label className={labelCls}>Descripción (opcional)</label>
                  <input
                    className={inputCls}
                    value={form.descripcion}
                    onChange={(e) => set("descripcion", e.target.value)}
                    placeholder="Ej: Pago contra entrega"
                    maxLength={255}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>
                  Mensaje con el que el cliente abre WhatsApp
                </label>
                <textarea
                  className={`${inputCls} min-h-[60px]`}
                  value={form.mensaje_bienvenida}
                  onChange={(e) => set("mensaje_bienvenida", e.target.value)}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Se autocompleta en el chat cuando el cliente toca el anuncio;
                  tu bot lo recibe como primer mensaje.
                </p>
              </div>
            </div>
          )}

          {/* ── PASO 4: Revisar y lanzar ── */}
          {step === 4 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Resumen */}
              <div className="space-y-2 text-xs">
                <h4 className="text-sm font-extrabold text-slate-800 mb-2">
                  Resumen
                </h4>
                {[
                  ["Plantilla", form.nombre || "—"],
                  ["Producto", productoSel?.nombre || "Sin vincular"],
                  ["Página", paginaSel?.page_name || form.page_id || "—"],
                  [
                    "Presupuesto",
                    `${Number(form.presupuesto_diario).toFixed(2)} ${currency}/día`,
                  ],
                  ["Países", form.paises.join(", ")],
                  [
                    "Público",
                    `${form.edad_min}-${form.edad_max} años · ${
                      { all: "Todos", male: "Hombres", female: "Mujeres" }[
                        form.genero
                      ]
                    }`,
                  ],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="flex justify-between gap-3 border-b border-slate-50 pb-1.5"
                  >
                    <span className="text-slate-400 font-semibold">{k}</span>
                    <span className="text-slate-700 font-bold text-right">
                      {v}
                    </span>
                  </div>
                ))}
                <div className="pt-2">
                  <label className={labelCls}>¿Cómo nace la campaña?</label>
                  <div className="flex gap-1.5">
                    {[
                      {
                        v: "PAUSED",
                        label: "En pausa (revisar primero)",
                        icon: "bx-pause-circle",
                      },
                      { v: "ACTIVE", label: "Activa", icon: "bx-play-circle" },
                    ].map((o) => (
                      <button
                        key={o.v}
                        type="button"
                        onClick={() => set("estado_inicial", o.v)}
                        className={`flex-1 px-3 py-2 rounded-xl text-[11px] font-semibold border transition ${
                          form.estado_inicial === o.v
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-slate-500 border-slate-200"
                        }`}
                      >
                        <i className={`bx ${o.icon} mr-1`} />
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Preview estilo feed */}
              <div>
                <h4 className="text-sm font-extrabold text-slate-800 mb-2">
                  Vista previa
                </h4>
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                  <div className="px-3 py-2 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 grid place-items-center">
                      <i className="bx bx-buildings text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-800">
                        {paginaSel?.page_name || "Tu página"}
                      </p>
                      <p className="text-[9px] text-slate-400">Publicidad</p>
                    </div>
                  </div>
                  {form.texto_principal && (
                    <p className="px-3 pb-2 text-[11px] text-slate-700 whitespace-pre-line">
                      {form.texto_principal}
                    </p>
                  )}
                  {form.imagen_url ? (
                    <img
                      src={form.imagen_url}
                      alt="Preview"
                      className="w-full max-h-48 object-cover"
                    />
                  ) : (
                    <div className="h-32 bg-slate-100 grid place-items-center text-slate-300">
                      <i className="bx bx-image text-3xl" />
                    </div>
                  )}
                  <div className="px-3 py-2 flex items-center justify-between bg-slate-50">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-800 truncate">
                        {form.titulo || form.nombre || "Título del anuncio"}
                      </p>
                      {form.descripcion && (
                        <p className="text-[9px] text-slate-400 truncate">
                          {form.descripcion}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 ml-2 px-2.5 py-1 rounded-lg bg-emerald-500 text-white text-[10px] font-bold">
                      <i className="bx bxl-whatsapp mr-0.5" />
                      Enviar mensaje
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-3">
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
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition"
              >
                Siguiente
                <i className="bx bx-arrow-forward" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => guardar()}
                  disabled={guardando}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 ring-1 ring-indigo-200 hover:bg-indigo-100 transition disabled:opacity-60"
                >
                  <i className="bx bx-save" />
                  Guardar plantilla
                </button>
                <button
                  onClick={() => guardar({ lanzarDespues: true })}
                  disabled={guardando}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 transition disabled:opacity-60"
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
