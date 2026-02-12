import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import Select, { components } from "react-select";
import chatApi from "../../api/chatcenter";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener("mouseenter", Swal.stopTimer);
    toast.addEventListener("mouseleave", Swal.resumeTimer);
  },
});

/** —— Chips y opciones personalizados —— */
const Option = (props) => {
  const { isSelected, label } = props;
  return (
    <components.Option {...props}>
      <div className="flex items-center gap-3">
        <span
          className={`flex items-center justify-center w-5 h-5 rounded-full border transition
            ${
              isSelected
                ? "bg-gradient-to-br from-indigo-500 to-blue-500 border-indigo-500"
                : "border-gray-300"
            }`}
        >
          {isSelected && (
            <svg width="12" height="12" viewBox="0 0 20 20" fill="#fff">
              <path d="M7.629 13.233L3.9 9.505l1.414-1.414 2.315 2.315 6.06-6.06 1.414 1.414z" />
            </svg>
          )}
        </span>
        <span className="truncate">{label}</span>
      </div>
    </components.Option>
  );
};

const ChipContainer = (props) => {
  const { children, data } = props;
  return (
    <div
      className="group flex items-center gap-2 mr-2 mb-2 rounded-2xl
                 bg-white/70 backdrop-blur-sm
                 border border-slate-200
                 shadow-[0_2px_8px_rgba(0,0,0,0.06)]
                 hover:shadow-[0_6px_16px_rgba(0,0,0,0.10)]
                 transition-all px-3 py-1.5"
    >
      <span
        className="text-[12px] font-semibold tracking-wide
                   bg-gradient-to-br from-indigo-600 to-blue-600 bg-clip-text text-transparent"
      >
        {data.label}
      </span>
      {children}
    </div>
  );
};

const ChipRemove = (props) => (
  <components.MultiValueRemove {...props}>
    <div
      className="w-5 h-5 rounded-full grid place-items-center
                 text-slate-500 group-hover:text-white
                 group-hover:bg-rose-500 transition"
      aria-label="Quitar"
      title="Quitar"
    >
      ✕
    </div>
  </components.MultiValueRemove>
);

/** —— Página de Asistentes —— */
const Asistentes = () => {
  const [id_configuracion, setId_configuracion] = useState(null);
  const [idPlataformaConf, setIdPlataformaConf] = useState(null);

  // Estado API Key / existencia
  const [existeAsistente, setExisteAsistente] = useState(null);
  const [showModalApiKey, setShowModalApiKey] = useState(false);

  // Ventas
  const [asistenteVentas, setAsistenteVentas] = useState(null);
  const [nombreBotVenta, setNombreBotVenta] = useState("");
  const [activoVenta, setActivoVenta] = useState(false);
  const [productosVenta, setProductosVenta] = useState([]);
  const [tomar_productos, setTomar_productos] = useState("chat_Center");
  const [tipoVenta, setTipoVenta] = useState("productos");
  const [tiempo_remarketing, setTiempo_remarketing] = useState("0");
  const [showModalVentas, setShowModalVentas] = useState(false);

  // Productos (para IA ventas)
  const [productosLista, setProductosLista] = useState([]);

  useEffect(() => {
    const idc = localStorage.getItem("id_configuracion");
    if (idc) setId_configuracion(parseInt(idc));

    const idp = localStorage.getItem("id_plataforma_conf");
    if (idp === "null" || idp === null) {
      setIdPlataformaConf(null);
    } else {
      const parsed = Number.isNaN(parseInt(idp)) ? null : parseInt(idp);
      setIdPlataformaConf(parsed);
    }
  }, []);

  /** Carga info de asistentes y productos */
  const fetchAsistenteAutomatizado = async () => {
    if (!id_configuracion) return;
    try {
      const response = await chatApi.post("openai_assistants/info_asistentes", {
        id_configuracion: id_configuracion,
      });

      const data = response.data?.data || {};
      setExisteAsistente(data.api_key_openai || null);
      setAsistenteVentas(data.ventas || null);
    } catch (error) {
      console.error("Error al cargar los asistentes.", error);
      setExisteAsistente(null);
      setAsistenteVentas(null);
    }
  };

  useEffect(() => {
    if (asistenteVentas) {
      setNombreBotVenta(asistenteVentas.nombre_bot || "");
      setActivoVenta(!!asistenteVentas.activo);
      const productos = asistenteVentas.productos || [];
      setProductosVenta(productos);

      setTomar_productos(
        asistenteVentas.tomar_productos === "imporsuit"
          ? "imporsuit"
          : "chat_center",
      );
      setTiempo_remarketing(String(asistenteVentas.tiempo_remarketing || "0"));
    }
  }, [asistenteVentas]);

  const fetchProductos = async (fuente) => {
    if (!id_configuracion) return;

    try {
      let prodRes;

      if (fuente === "imporsuit") {
        if (!idPlataformaConf) return;
        prodRes = await chatApi.post("/productos/listarProductosImporsuit", {
          id_plataforma: idPlataformaConf,
        });
      } else {
        prodRes = await chatApi.post("/productos/listarProductos", {
          id_configuracion,
        });
      }

      setProductosLista(prodRes.data.data || []);
    } catch (error) {
      console.error("No se pudo cargar la información de productos.", error);
      setProductosLista([]);
    }
  };

  useEffect(() => {
    if (!id_configuracion) return;
    fetchAsistenteAutomatizado();
  }, [id_configuracion]);

  useEffect(() => {
    if (!id_configuracion) return;
    setProductosLista([]);
    fetchProductos(tomar_productos);
  }, [id_configuracion, tomar_productos]);

  /** Sincroniza estados visuales con datos del backend */
  useEffect(() => {
    if (asistenteVentas) {
      setNombreBotVenta(asistenteVentas.nombre_bot || "");
      setActivoVenta(!!asistenteVentas.activo);

      (function normalizeProductos() {
        try {
          const raw = asistenteVentas.productos;
          if (Array.isArray(raw)) {
            setProductosVenta(raw.map(String));
            return;
          }
          if (typeof raw === "string") {
            const t = raw.trim();
            if (t.startsWith("[")) {
              const arr = JSON.parse(t);
              setProductosVenta((Array.isArray(arr) ? arr : [arr]).map(String));
              return;
            }
            const arr = t
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
              .map(String);
            setProductosVenta(arr);
            return;
          }
          setProductosVenta([]);
        } catch {
          setProductosVenta([]);
        }
      })();

      setTomar_productos(
        asistenteVentas.tomar_productos === "imporsuit"
          ? "imporsuit"
          : "chat_center",
      );
      setTiempo_remarketing(String(asistenteVentas.tiempo_remarketing || "0"));
    }
  }, [asistenteVentas]);

  /** Select multi */
  const productosOptions = useMemo(
    () =>
      (productosLista || []).map((p) => ({
        value: String(p.id ?? p.id_producto),
        label: p.nombre,
      })),
    [productosLista],
  );

  const selectedProductos = useMemo(() => {
    if (!Array.isArray(productosVenta)) return [];
    const ids = new Set(productosVenta.map(String));
    return productosOptions.filter((opt) => ids.has(opt.value));
  }, [productosVenta, productosOptions]);

  const handleProductosChange = (selected) => {
    const ids = (selected || []).map((s) => String(s.value));
    setProductosVenta(ids);
  };

  /** Acciones */
  const guardarApiKey = async (apiKeyInput) => {
    try {
      const response = await chatApi.post(
        "openai_assistants/actualizar_api_key_openai",
        {
          id_configuracion: id_configuracion,
          api_key: apiKeyInput,
          tipo_configuracion: localStorage.getItem("tipo_configuracion"),
        },
      );
      const data = response.data || {};
      if (data.status === "200") {
        setShowModalApiKey(false);
        await fetchAsistenteAutomatizado();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const guardarVentas = async () => {
    try {
      await chatApi.post("openai_assistants/actualizar_ia_ventas", {
        id_configuracion: id_configuracion,
        nombre_bot: nombreBotVenta,
        activo: activoVenta,
        tiempo_remarketing: Number(tiempo_remarketing),
        tipo_venta: tipoVenta,
      });
      setShowModalVentas(false);
      await fetchAsistenteAutomatizado();
    } catch (error) {
      console.error(error);
    }
  };

  /** Helpers visuales */
  const estadoIA = (estado) => (estado ? "Conectado" : "Desconectado");
  const colorEstado = (estado) =>
    estado ? "text-green-700 bg-green-100" : "text-red-700 bg-red-100";

  const hasApiKey = Boolean(
    existeAsistente && String(existeAsistente).trim().length > 0,
  );

  // considere “configurado” si hay key y el asistente tiene algún dato real
  const hasVentasConfig =
    Boolean(asistenteVentas) &&
    // use el que exista en su respuesta real
    (Boolean(asistenteVentas?.id) ||
      Boolean(asistenteVentas?.nombre_bot?.trim?.()) ||
      Boolean(asistenteVentas?.activo !== undefined)); // opcional

  const iaVentasConectada = hasApiKey && hasVentasConfig;

  /* seccion apra texarea */
  const [texto, setTexto] = useState("");
  const [cargandoTexto, setCargandoTexto] = useState(false);
  const [errorTexto, setErrorTexto] = useState("");

  useEffect(() => {
    let abort = false;
    setCargandoTexto(true);
    setErrorTexto("");

    const url = `/src/assets/template_promts/${tipoVenta}.txt`;

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((t) => {
        if (!abort) setTexto(t);
      })
      .catch((e) => {
        if (!abort) {
          setErrorTexto("No se pudo cargar el texto.");
          setTexto("");
          console.error(e);
        }
      })
      .finally(() => {
        if (!abort) setCargandoTexto(false);
      });

    return () => {
      abort = true;
    };
  }, [tipoVenta]);
  /* seccion apra texarea */

  const openAIKeyUrl = "https://platform.openai.com/api-keys";
  const openAIBillingUrl = "https://platform.openai.com/settings/organization/billing/overview"

  return (
    <div className="p-5">
      {/* —— HERO profesional —— */}
      <div className="mb-6 rounded-2xl bg-[#171931] text-white p-6 shadow-lg relative overflow-hidden">
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Panel de configuración
            </div>

            <h1 className="text-2xl md:text-3xl font-bold">Asistentes IA</h1>
            <p className="opacity-90 mt-1 max-w-2xl">
              Configure la conexión con{" "}
              <span className="font-semibold">OpenAI</span> y administre su
              asistente de ventas. Esta sección controla el acceso a la IA y el
              comportamiento general del bot.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 backdrop-blur">
              <div className="text-xs opacity-80">API Key de OpenAI</div>
              <div className="text-sm font-semibold">
                {existeAsistente ? "Configurada" : "No configurada"}
              </div>
            </div>

            <button
              onClick={() => setShowModalApiKey(true)}
              className="bg-white text-indigo-700 hover:bg-indigo-50 transition px-4 py-2 rounded-xl text-sm font-semibold shadow"
            >
              {existeAsistente ? "Editar API Key" : "Añadir API Key"}
            </button>
          </div>
        </div>
      </div>

      {/* —— Sección: Guía rápida / Información —— */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Qué es */}
        <div className="bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 grid place-items-center">
              <i className="bx bx-brain text-xl text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">
                ¿Qué se configura aquí?
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Esta vista conecta su sistema con la IA para automatizar
                respuestas, recomendaciones y seguimiento de intención de
                compra.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2 text-sm text-gray-700">
            <div className="flex items-start gap-2">
              <i className="bx bx-check text-lg text-emerald-600 -mt-1" />
              <span>Conexión con OpenAI mediante API Key</span>
            </div>
            <div className="flex items-start gap-2">
              <i className="bx bx-check text-lg text-emerald-600 -mt-1" />
              <span>Activación y configuración del bot de ventas</span>
            </div>
            <div className="flex items-start gap-2">
              <i className="bx bx-check text-lg text-emerald-600 -mt-1" />
              <span>Parámetros como remarketing y tipo de venta</span>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
            <div className="flex items-start gap-2">
              <i className="bx bx-wallet text-lg mt-0.5" />
              <div>
                <div className="font-semibold">Recuerde recargar saldo</div>
                <div className="text-sm">
                  Si su cuenta de OpenAI no tiene saldo/crédito disponible, el
                  bot no podrá responder aunque la API Key esté configurada
                  correctamente.
                </div>
              </div>
            </div>
            <a
              href={openAIBillingUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#171931] text-white hover:opacity-95 transition text-sm font-semibold"
            >
              <i className="bx bx-link-external" />
              Ir a recargar saldo
            </a>
          </div>
        </div>

        {/* Cómo obtener API key */}
        <div className="bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 grid place-items-center">
              <i className="bx bx-key text-xl text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">
                Cómo generar su API Key
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Primero debe{" "}
                <span className="font-semibold">iniciar sesión</span> o{" "}
                <span className="font-semibold">registrarse</span> en OpenAI .
                Recomendado: usar su cuenta principal del negocio.
              </p>
            </div>
          </div>

          <ol className="mt-4 space-y-2 text-sm text-gray-700 list-decimal pl-5">
            <li>Abra el panel de API Keys en OpenAI.</li>
            <li>Cree una nueva llave (Create new secret key).</li>
            <li>Copie y pegue la llave en “Añadir API Key”.</li>
          </ol>

          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <a
              href={openAIKeyUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#171931] text-white hover:opacity-95 transition text-sm font-semibold"
            >
              <i className="bx bx-link-external" />
              Ir a generar API Key
            </a>

            <button
              onClick={() => setShowModalApiKey(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition text-sm font-semibold text-gray-800"
            >
              <i className="bx bx-plus" />
              Pegar API Key aquí
            </button>
          </div>
        </div>

        {/* Buenas prácticas */}
        <div className="bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 grid place-items-center">
              <i className="bx bx-shield-quarter text-xl text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Buenas prácticas</h3>
              <p className="text-sm text-gray-600 mt-1">
                Para evitar errores y riesgos de seguridad, siga estas
                recomendaciones.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3 text-sm text-gray-700">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 grid place-items-center text-xs font-bold">
                1
              </span>
              <span>No comparta su API Key por WhatsApp o capturas.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 grid place-items-center text-xs font-bold">
                2
              </span>
              <span>
                Si sospecha filtración, regenere la llave y reemplace aquí.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 grid place-items-center text-xs font-bold">
                3
              </span>
              <span>Use una cuenta de OpenAI del negocio (recomendado).</span>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
              <div className="flex items-start gap-2">
                <i className="bx bx-error-circle text-lg mt-0.5" />
                <div>
                  <div className="font-semibold">Importante</div>
                  <div className="text-sm">
                    La API Key es una credencial privada. Pegue la llave
                    completa, sin espacios.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* —— Tarjetas principales —— */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* IA Ventas (principal) */}
        <div className="lg:col-span-2 bg-white border rounded-2xl shadow-sm hover:shadow-md transition p-6 relative">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-green-50 grid place-items-center">
                <i className="bx bxs-cart text-2xl text-green-600"></i>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {asistenteVentas?.nombre_bot || "IA de Ventas"}
                </h3>
                <p className="text-sm text-gray-600 mt-0.5">
                  Ofertas, catálogo y atención pre/postventa automatizada.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${colorEstado(
                  iaVentasConectada,
                )}`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    iaVentasConectada ? "bg-emerald-600" : "bg-rose-600"
                  }`}
                />
                {estadoIA(iaVentasConectada)}
              </span>

              <button
                onClick={() => setShowModalVentas(true)}
                className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition text-sm font-semibold text-gray-800 inline-flex items-center gap-2"
                title={asistenteVentas ? "Editar" : "Añadir"}
              >
                <i
                  className={`bx ${asistenteVentas ? "bx-edit" : "bx-plus"} text-lg`}
                />
                {asistenteVentas ? "Editar" : "Configurar"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div className="text-xs text-gray-500">Tipo de venta</div>
              <div className="font-semibold text-gray-900 mt-1">
                {tipoVenta === "servicios" ? "Servicios" : "Productos"}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div className="text-xs text-gray-500">Remarketing</div>
              <div className="font-semibold text-gray-900 mt-1">
                {tiempo_remarketing === "0"
                  ? "No definido"
                  : `${tiempo_remarketing}h`}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div className="text-xs text-gray-500">Estado</div>
              <div className="font-semibold text-gray-900 mt-1">
                {activoVenta ? "Activo" : "Inactivo"}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="text-sm font-semibold text-gray-900 mb-2">
              Capacidades incluidas
            </div>
            <ul className="text-sm text-gray-700 grid grid-cols-1 md:grid-cols-2 gap-2">
              <li className="flex items-start gap-2">
                <i className="bx bx-check text-lg text-emerald-600 mt-0.5" />
                Recomendación de productos y respuestas a FAQs.
              </li>
              <li className="flex items-start gap-2">
                <i className="bx bx-check text-lg text-emerald-600 mt-0.5" />
                Promociones y seguimiento de intención de compra.
              </li>
              <li className="flex items-start gap-2">
                <i className="bx bx-check text-lg text-emerald-600 mt-0.5" />
                Adaptación del prompt según tipo de venta (productos/servicios).
              </li>
              <li className="flex items-start gap-2">
                <i className="bx bx-check text-lg text-emerald-600 mt-0.5" />
                Compatible con su catálogo actual de productos.
              </li>
            </ul>
          </div>
        </div>

        {/* Panel lateral: Estado de la conexión */}
        <div className="bg-white border rounded-2xl shadow-sm hover:shadow-md transition p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 grid place-items-center">
              <i className="bx bx-chip text-2xl text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Estado del sistema</h3>
              <p className="text-sm text-gray-600 mt-0.5">
                Verificación rápida de su configuración.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">API Key</div>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    existeAsistente
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {existeAsistente ? "OK" : "Pendiente"}
                </span>
              </div>
              <div className="text-sm font-semibold text-gray-900 mt-2 truncate">
                {existeAsistente
                  ? "Configurada (oculta por seguridad)"
                  : "Sin configurar"}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">IA Ventas</div>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    iaVentasConectada
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {iaVentasConectada ? "Lista" : "Sin configurar"}
                </span>
              </div>
              <div className="text-sm font-semibold text-gray-900 mt-2">
                {asistenteVentas?.nombre_bot || "Sin nombre"}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div className="text-xs text-gray-500">Acciones rápidas</div>
              <div className="mt-3 flex flex-col gap-2">
                <button
                  onClick={() => setShowModalApiKey(true)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition text-sm font-semibold"
                >
                  <i className="bx bx-key" />
                  {existeAsistente ? "Editar API Key" : "Añadir API Key"}
                </button>
                <a
                  href={openAIKeyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:bg-white transition text-sm font-semibold text-gray-800"
                >
                  <i className="bx bx-link-external" />
                  Abrir panel de API Keys
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* —— Modales (SIN CAMBIOS de lógica, solo se mejora estilo y textos) —— */}
      {showModalApiKey && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {existeAsistente ? "Editar API Key" : "Añadir API Key"}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Pegue su API Key de OpenAI. Si aún no la tiene, genere una
                  desde el panel oficial. Recomendación: inicie sesión o
                  regístrese con su cuenta principal del negocio.
                </p>
              </div>

              <button
                onClick={() => setShowModalApiKey(false)}
                className="w-9 h-9 rounded-xl hover:bg-gray-100 transition grid place-items-center"
                title="Cerrar"
              >
                <i className="bx bx-x text-2xl text-gray-600" />
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
              <div className="flex items-start gap-3">
                <i className="bx bx-info-circle text-xl text-indigo-600 mt-0.5" />
                <div className="text-sm text-indigo-900">
                  <div className="font-semibold">
                    Enlace para generar la llave
                  </div>
                  <div className="mt-1">
                    <a
                      href={openAIKeyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline font-semibold"
                    >
                      {openAIKeyUrl}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <i className="bx bx-wallet text-xl text-amber-700 mt-0.5" />
                <div className="text-sm text-amber-900">
                  <div className="font-semibold">
                    Importante: saldo en OpenAI
                  </div>
                  <div className="mt-1">
                    Después de crear su API Key, verifique que su cuenta de
                    OpenAI tenga saldo/crédito. Sin saldo, el asistente no
                    responderá mensajes.
                  </div>
                </div>
              </div>
            </div>

            <label className="block text-sm font-medium text-gray-700 mt-4 mb-1">
              API Key
            </label>
            <input
              type="text"
              value={existeAsistente || ""}
              onChange={(e) => setExisteAsistente(e.target.value)}
              className="w-full border px-3 py-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Pegue aquí su API Key (por ejemplo: sk-...)"
            />

            <div className="mt-4 flex flex-col sm:flex-row justify-between gap-2">
              <a
                href={openAIKeyUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition text-sm font-semibold text-gray-800"
              >
                <i className="bx bx-link-external" />
                Generar API Key
              </a>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowModalApiKey(false)}
                  className="px-4 py-2 rounded-xl bg-gray-200 text-gray-800 hover:bg-gray-300 transition font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => guardarApiKey(existeAsistente)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition font-semibold shadow"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModalVentas && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 space-y-6 border border-gray-100">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Configurar IA Ventas
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Ajuste el comportamiento del bot y el tipo de venta. No afecta
                  su lógica de pedidos, solo define cómo responderá y cuándo
                  hará remarketing.
                </p>
              </div>
              <button
                onClick={() => setShowModalVentas(false)}
                className="w-9 h-9 rounded-xl hover:bg-gray-100 transition grid place-items-center"
                title="Cerrar"
              >
                <i className="bx bx-x text-2xl text-gray-600" />
              </button>
            </div>

            {/* Layout dividido */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Columna izquierda */}
              <div className="space-y-6">
                {/* Configuración básica */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del Bot
                    </label>
                    <input
                      type="text"
                      placeholder="Nombre del Bot"
                      value={nombreBotVenta}
                      onChange={(e) => setNombreBotVenta(e.target.value)}
                      className="w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tiempo de remarketing
                    </label>
                    <select
                      value={tiempo_remarketing}
                      onChange={(e) => setTiempo_remarketing(e.target.value)}
                      className="w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="0">Seleccione una hora</option>
                      <option value="1">1 hora</option>
                      <option value="3">3 horas</option>
                      <option value="5">5 horas</option>
                      <option value="10">10 horas</option>
                      <option value="20">20 horas</option>
                    </select>
                  </div>
                </div>

                {/* Separador visual */}
                <div className="border-t pt-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={activoVenta}
                      onChange={(e) => setActivoVenta(e.target.checked)}
                      className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <span className="font-semibold text-gray-800">Activo</span>
                    <span className="text-gray-500">
                      (si está desactivado, no responderá automáticamente)
                    </span>
                  </label>
                </div>
              </div>

              {/* Columna derecha */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="text-sm font-semibold text-gray-900">
                    Parámetros del prompt
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    El prompt base se carga automáticamente según el tipo de
                    venta seleccionado (
                    <span className="font-semibold">
                      {tipoVenta === "servicios" ? "Servicios" : "Productos"}
                    </span>
                    ) y se alimenta del catálogo de productos de su cuenta.
                  </p>

                  <a
                    href="https://chatcenter.imporfactory.app/productos"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-xl
                    bg-indigo-50 border border-indigo-100 text-indigo-700
                    hover:bg-indigo-100 hover:border-indigo-200 transition
                    text-sm font-semibold"
                  >
                    <i className="bx bx-package text-lg" />
                    Ir a Productos
                    <i className="bx bx-link-external text-lg" />
                  </a>

                  <p className="text-sm text-gray-600 mt-2">
                    Puede revisarlo en la vista previa antes de guardar.
                  </p>

                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      IA para venta de:
                    </label>
                    <select
                      value={tipoVenta}
                      onChange={(e) => setTipoVenta(e.target.value)}
                      className="w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="productos">Productos</option>
                      <option value="servicios">Servicios</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowModalVentas(false)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 transition font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={guardarVentas}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow transition font-semibold"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Asistentes;
