import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import Select, { components } from "react-select";
import chatApi from "../../api/chatcenter";
import GuiaOpenAIModal from "./modales/OpenAiModal";

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
  const navigate = useNavigate();
  const [id_configuracion, setId_configuracion] = useState(null);
  const [idPlataformaConf, setIdPlataformaConf] = useState(null);

  const [existeAsistente, setExisteAsistente] = useState(null);
  const [showModalApiKey, setShowModalApiKey] = useState(false);

  const [asistenteVentas, setAsistenteVentas] = useState(null);
  const [nombreBotVenta, setNombreBotVenta] = useState("");
  const [activoVenta, setActivoVenta] = useState(false);
  const [productosVenta, setProductosVenta] = useState([]);
  const [tomar_productos, setTomar_productos] = useState("chat_Center");
  const [tipoVenta, setTipoVenta] = useState("productos");

  const [showModalVentas, setShowModalVentas] = useState(false);
  const [showGuiaOpenAI, setShowGuiaOpenAI] = useState(false);
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

      // Sincroniza el tipo de venta guardado (antes siempre decía "Productos")
      setTipoVenta(
        asistenteVentas.ofrecer === "servicios" ? "servicios" : "productos",
      );
    }
  }, [asistenteVentas]);

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

  // Estados de guardado: el backend valida la API key contra OpenAI (tarda unos
  // segundos) — antes el cliente quedaba "en blanco" sin saber si pasó algo.
  const [savingApiKey, setSavingApiKey] = useState(false);
  const [savingVentas, setSavingVentas] = useState(false);

  const guardarApiKey = async (apiKeyInput) => {
    if (savingApiKey) return;
    const key = String(apiKeyInput || "").trim();
    if (!key) {
      Toast.fire({ icon: "warning", title: "Pegue su API Key de OpenAI" });
      return;
    }
    setSavingApiKey(true);
    try {
      const response = await chatApi.post(
        "openai_assistants/actualizar_api_key_openai",
        {
          id_configuracion: id_configuracion,
          api_key: key,
          tipo_configuracion: localStorage.getItem("tipo_configuracion"),
        },
      );
      const data = response.data || {};
      if (data.status === "200") {
        setShowModalApiKey(false);
        await fetchAsistenteAutomatizado();
        Toast.fire({
          icon: "success",
          title: "API Key validada y guardada",
        });
      } else {
        Toast.fire({
          icon: "error",
          title: data.message || "No se pudo validar la API Key",
        });
      }
    } catch (e) {
      console.error(e);
      Toast.fire({
        icon: "error",
        title:
          e?.response?.data?.message ||
          "API Key inválida o sin conexión con OpenAI",
      });
    } finally {
      setSavingApiKey(false);
    }
  };

  const guardarVentas = async () => {
    if (savingVentas) return;
    setSavingVentas(true);
    try {
      // NO inventar nombre: antes el fallback "IA de Ventas" se guardaba solo
      // aunque el cliente nunca escribió nada. Si el guardado quedó con ese
      // nombre accidental, se limpia (null) — el nombre real vive en el prompt
      // del tablero.
      const n = String(nombreBotVenta || "").trim();
      const nombreLimpio = ["ia de ventas", "agente de ventas"].includes(
        n.toLowerCase(),
      )
        ? null
        : n || null;

      await chatApi.post("openai_assistants/actualizar_ia_ventas", {
        id_configuracion: id_configuracion,
        nombre_bot: nombreLimpio,
        activo: activoVenta,
        tipo_venta: tipoVenta,
      });

      setShowModalVentas(false);
      await fetchAsistenteAutomatizado();

      Toast.fire({
        icon: "success",
        title: "Configuración guardada correctamente",
      });
    } catch (error) {
      console.error(error);
      Toast.fire({
        icon: "error",
        title: "Error guardando configuración",
      });
    } finally {
      setSavingVentas(false);
    }
  };

  const hasApiKey = Boolean(
    existeAsistente && String(existeAsistente).trim().length > 0,
  );

  const hasVentasConfig =
    Boolean(asistenteVentas) &&
    (Boolean(asistenteVentas?.id) ||
      Boolean(asistenteVentas?.nombre_bot?.trim?.()) ||
      Boolean(asistenteVentas?.activo !== undefined));

  const iaVentasConectada = hasApiKey && hasVentasConfig;

  // Estado del agente con MOTIVO claro. Antes era binario y confundía: un
  // agente bien configurado pero sin API Key salía "Desconectado" sin explicar
  // qué faltaba.
  const estadoAgente = !hasVentasConfig
    ? {
        txt: "Desconectado",
        cls: "text-red-700 bg-red-100",
        dot: "bg-rose-600",
      }
    : !hasApiKey
      ? {
          txt: "Falta API Key",
          cls: "text-amber-800 bg-amber-100",
          dot: "bg-amber-500",
        }
      : {
          txt: "Conectado",
          cls: "text-green-700 bg-green-100",
          dot: "bg-emerald-600",
        };

  // Nombre real del bot: ignora los nombres accidentales que guardó el
  // fallback antiguo ("IA de Ventas"). El nombre Se define en la sección de agentes.
  const nombreBotReal = (() => {
    const n = String(asistenteVentas?.nombre_bot || "").trim();
    return ["ia de ventas", "agente de ventas"].includes(n.toLowerCase())
      ? ""
      : n;
  })();

  // Etiqueta del agente según el tipo de venta configurado
  const etiquetaAgente =
    tipoVenta === "servicios" ? "Agente de Servicios" : "Agente de Ventas";

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

  const openAIKeyUrl = "https://platform.openai.com/api-keys";
  const openAIBillingUrl =
    "https://platform.openai.com/settings/organization/billing/overview";

  return (
    <div className="p-5">
      {/* HERO (azul sólido, igual que los demás headers del sistema) */}
      <div className="mb-6 rounded-2xl bg-[#171931] text-white p-6 shadow-lg relative overflow-hidden">
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Asistentes AI</h1>
            <p className="opacity-90 mt-1 max-w-2xl">
              Configure la conexión con{" "}
              <span className="font-semibold">OpenAI</span> y administre y el
              comportamiento general del bot.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <button
              onClick={() => setShowModalApiKey(true)}
              className="bg-white text-indigo-700 hover:bg-indigo-50 transition px-4 py-2 rounded-xl text-sm font-semibold shadow"
            >
              {existeAsistente ? "Editar API Key" : "Añadir API Key"}
            </button>
          </div>
        </div>
      </div>

      {/* Fila: Tutorial API Key (ligero, no intrusivo) */}
      <div className="flex items-center gap-2 flex-wrap -mt-3 mb-6">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-1">
          ¿Cómo configurar?
        </span>

        <button
          type="button"
          onClick={() => setShowGuiaOpenAI(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold
      text-indigo-700 bg-indigo-50 ring-1 ring-indigo-200
      hover:bg-indigo-100 hover:ring-indigo-300 transition-all"
        >
          <i className="bx bx-key text-sm" />
          API Key OpenAI
          <i className="bx bx-play-circle text-sm text-indigo-400" />
        </button>
      </div>

      {/* Puesta en marcha en 3 pasos — reemplaza las 3 tarjetas de texto que
          saturaban la vista. Mismos botones, misma zona, 70% menos ruido. */}
      <div className="bg-white border rounded-2xl shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 grid place-items-center">
              <i className="bx bx-rocket text-xl text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 leading-tight">
                Conecete su asistente AI a trabajar en 3 pasos
              </h3>
              <p className="text-[12.5px] text-gray-500">
                Toma menos de 2 minutos · solo necesita una cuenta de OpenAI
              </p>
            </div>
          </div>
          {hasApiKey && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-[12px] font-bold ring-1 ring-emerald-200">
              <i className="bx bxs-check-circle" /> API Key configurada
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
          {/* Paso 1 */}
          <div className="relative rounded-2xl border border-gray-100 bg-gray-50/60 p-4 flex flex-col">
            <div className="flex items-center gap-2.5 mb-2">
              <span
                className={`w-7 h-7 rounded-full grid place-items-center text-[12px] font-extrabold ${
                  hasApiKey
                    ? "bg-emerald-500 text-white"
                    : "bg-[#171931] text-white"
                }`}
              >
                {hasApiKey ? <i className="bx bx-check text-base" /> : "1"}
              </span>
              <span className="font-bold text-gray-900 text-[14px]">
                Genere su API Key
              </span>
            </div>
            <p className="text-[12.5px] text-gray-500 leading-5 flex-1">
              Inicie sesión en OpenAI y cree una llave secreta{" "}
              <span className="font-semibold text-gray-600">
                (Create new secret key)
              </span>
              .
            </p>
            <a
              href={openAIKeyUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#171931] text-white hover:opacity-95 transition text-sm font-semibold"
            >
              <i className="bx bx-link-external" />
              Ir a generar API Key
            </a>
          </div>

          {/* Paso 2 */}
          <div className="relative rounded-2xl border border-gray-100 bg-gray-50/60 p-4 flex flex-col">
            <div className="flex items-center gap-2.5 mb-2">
              <span
                className={`w-7 h-7 rounded-full grid place-items-center text-[12px] font-extrabold ${
                  hasApiKey
                    ? "bg-emerald-500 text-white"
                    : "bg-[#171931] text-white"
                }`}
              >
                {hasApiKey ? <i className="bx bx-check text-base" /> : "2"}
              </span>
              <span className="font-bold text-gray-900 text-[14px]">
                Péguela aquí
              </span>
            </div>
            <p className="text-[12.5px] text-gray-500 leading-5 flex-1">
              Copie la llave completa y la validamos con OpenAI automáticamente
              al guardar.
            </p>
            <button
              onClick={() => setShowModalApiKey(true)}
              className="mt-3 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition text-sm font-semibold shadow-sm"
            >
              <i className="bx bx-plus" />
              Pegar API Key aquí
            </button>
          </div>

          {/* Paso 3 */}
          <div className="relative rounded-2xl border border-gray-100 bg-gray-50/60 p-4 flex flex-col">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-7 h-7 rounded-full grid place-items-center text-[12px] font-extrabold bg-[#171931] text-white">
                3
              </span>
              <span className="font-bold text-gray-900 text-[14px]">
                Recargue saldo
              </span>
            </div>
            <p className="text-[12.5px] text-gray-500 leading-5 flex-1">
              Recuerde recargar créditos: sin saldo en OpenAI, el bot no
              responde aunque la llave sea válida.
            </p>
            <a
              href={openAIBillingUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#171931] text-white hover:opacity-95 transition text-sm font-semibold"
            >
              <i className="bx bx-link-external" />
              Ir a recargar saldo
            </a>
          </div>
        </div>

        {/* Seguridad en 1 línea (antes: tarjeta entera de buenas prácticas) */}
        <p className="mt-4 flex items-start gap-2 text-[12px] text-gray-400 leading-5">
          <i className="bx bx-shield-quarter text-[15px] text-emerald-500 mt-0.5" />
          <span>
            Su API Key es privada: no la comparta por WhatsApp ni capturas. Si
            sospecha filtración, regenérela en OpenAI y reemplácela aquí.
          </span>
        </p>
      </div>

      {/* Tarjetas principales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border rounded-2xl shadow-sm hover:shadow-md transition p-6 relative">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-green-50 grid place-items-center">
                <i className="bx bxs-cart text-2xl text-green-600"></i>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {etiquetaAgente}
                </h3>
                <p className="text-sm text-gray-600 mt-0.5">
                  Ofertas, catálogo y atención pre/postventa automatizada.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${estadoAgente.cls}`}
              >
                <span className={`w-2 h-2 rounded-full ${estadoAgente.dot}`} />
                {estadoAgente.txt}
              </span>
              <button
                onClick={() => setShowModalVentas(true)}
                className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition text-sm font-semibold text-gray-800 inline-flex items-center gap-2"
              >
                <i
                  className={`bx ${asistenteVentas ? "bx-edit" : "bx-plus"} text-lg`}
                />
                {asistenteVentas ? "Editar" : "Configurar"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 flex items-center gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                <i
                  className={`bx ${tipoVenta === "servicios" ? "bx-calendar-check" : "bx-package"} text-lg`}
                />
              </span>
              <div className="min-w-0">
                <div className="text-xs text-gray-500">Tipo de venta</div>
                <div className="font-semibold text-gray-900 truncate">
                  {tipoVenta === "servicios" ? "Servicios" : "Productos"}
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 flex items-center gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                <i className="bx bx-bot text-lg" />
              </span>
              <div className="min-w-0">
                <div className="text-xs text-gray-500">Nombre del bot</div>
                {nombreBotReal ? (
                  <div className="font-semibold text-gray-900 truncate">
                    {nombreBotReal}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate("/kanban_config")}
                    title="Definir el nombre en la vista de Agentes"
                    className="group inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    Definir en Agentes
                    <i className="bx bx-right-arrow-alt text-lg transition-transform group-hover:translate-x-0.5" />
                  </button>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 flex items-center gap-3">
              <span
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  activoVenta
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-rose-100 text-rose-500"
                }`}
              >
                <i
                  className={`bx ${activoVenta ? "bx-play-circle" : "bx-pause-circle"} text-lg`}
                />
              </span>
              <div className="min-w-0">
                <div className="text-xs text-gray-500">Estado</div>
                <div className="font-semibold text-gray-900 truncate">
                  {activoVenta ? "Activo" : "Inactivo"}
                </div>
              </div>
            </div>
          </div>

          {/* <div className="mt-5">
            <div className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">
              Capacidades incluidas
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { icon: "bx-store", txt: "Recomienda productos" },
                { icon: "bx-message-rounded-dots", txt: "Responde FAQs" },
                { icon: "bx-purchase-tag-alt", txt: "Ofrece promociones" },
                { icon: "bx-target-lock", txt: "Detecta intención de compra" },
                { icon: "bx-refresh", txt: "Prompt según tipo de venta" },
                { icon: "bx-package", txt: "Usa su catálogo" },
              ].map((c) => (
                <span
                  key={c.txt}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 ring-1 ring-slate-200 text-[12px] font-semibold text-slate-600"
                >
                  <i className={`bx ${c.icon} text-emerald-600`} />
                  {c.txt}
                </span>
              ))}
            </div>
          </div> */}

          {/* Flujo visual: rellena el espacio con algo útil en vez de blanco */}
          <div className="mt-5 rounded-2xl bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 ring-1 ring-slate-100 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">
              Así trabaja por usted, 24/7
            </div>
            <div className="flex items-stretch gap-2 flex-wrap sm:flex-nowrap">
              {[
                {
                  icon: "bx-message-dots",
                  color: "bg-sky-100 text-sky-600",
                  t: "El cliente escribe",
                  d: "WhatsApp, Messenger o Instagram",
                },
                {
                  icon: "bx-bot",
                  color: "bg-indigo-100 text-indigo-600",
                  t: "La IA responde",
                  d: "Con su catálogo y su prompt",
                },
                {
                  icon: "bx-cart-download",
                  color: "bg-emerald-100 text-emerald-600",
                  t: "Cierra la venta",
                  d: "Confirma datos y crea la orden",
                },
              ].map((s, i) => (
                <React.Fragment key={s.t}>
                  {i > 0 && (
                    <div className="hidden sm:grid place-items-center shrink-0 text-slate-300">
                      <i className="bx bx-chevron-right text-2xl" />
                    </div>
                  )}
                  <div className="flex-1 min-w-[140px] flex items-center gap-2.5 rounded-xl bg-white ring-1 ring-slate-100 px-3 py-2.5">
                    <span
                      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${s.color}`}
                    >
                      <i className={`bx ${s.icon} text-lg`} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[12.5px] font-bold text-gray-800 leading-tight">
                        {s.t}
                      </span>
                      <span className="block text-[11px] text-gray-400 truncate">
                        {s.d}
                      </span>
                    </span>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Estado del sistema (compacto para no estirar la fila) */}
        <div className="bg-white border rounded-2xl shadow-sm hover:shadow-md transition p-5 self-start">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 grid place-items-center">
              <i className="bx bx-chip text-xl text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 leading-tight">
                Estado del sistema
              </h3>
              <p className="text-[11.5px] text-gray-400">
                Verificación rápida de su configuración
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {/* Checklist compacto (antes: 2 recuadros grandes) */}
            <div className="rounded-2xl border border-gray-100 divide-y divide-gray-50">
              <div className="flex items-center gap-3 px-3.5 py-2.5">
                <i
                  className={`bx ${existeAsistente ? "bxs-check-circle text-emerald-500" : "bx-time-five text-rose-400"} text-xl shrink-0`}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-900">
                    API Key
                  </div>
                  <div className="text-[11.5px] text-gray-400 truncate">
                    {existeAsistente
                      ? "Configurada · oculta por seguridad"
                      : "Sin configurar"}
                  </div>
                </div>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${existeAsistente ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                >
                  {existeAsistente ? "OK" : "Pendiente"}
                </span>
              </div>
              <div className="flex items-center gap-3 px-3.5 py-2.5">
                <i
                  className={`bx ${iaVentasConectada ? "bxs-check-circle text-emerald-500" : "bx-time-five text-rose-400"} text-xl shrink-0`}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-900">
                    {etiquetaAgente}
                  </div>
                  {nombreBotReal ? (
                    <div className="text-[11.5px] text-gray-400 truncate">
                      {nombreBotReal}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate("/kanban_config")}
                      className="inline-flex items-center gap-0.5 text-[11.5px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      Definir nombre en Agentes
                      <i className="bx bx-right-arrow-alt text-sm" />
                    </button>
                  )}
                </div>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${iaVentasConectada ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                >
                  {iaVentasConectada ? "Lista" : "Pendiente"}
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3.5">
              <div className="text-xs text-gray-500">Acciones rápidas</div>
              <div className="mt-2.5 flex flex-col gap-2">
                <button
                  onClick={() => setShowModalApiKey(true)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#171931] text-white transition text-sm font-semibold"
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

      {/* Modal API Key (estructura tipo CrearConfiguracionModal) */}
      {showModalApiKey && (
        <div
          className="fixed inset-0 bg-[#0a1a36]/50 backdrop-blur-md flex justify-center items-center z-50 p-4"
          onMouseDown={(e) =>
            e.target === e.currentTarget &&
            !savingApiKey &&
            setShowModalApiKey(false)
          }
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <i className="bx bx-key text-xl" />
                </span>
                <div>
                  <h5 className="text-base font-semibold text-[#171931] leading-tight">
                    {existeAsistente ? "Editar API Key" : "Añadir API Key"}
                  </h5>
                  <p className="text-[12px] text-slate-500">
                    Pegue su llave de OpenAI. La validamos al guardar.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModalApiKey(false)}
                disabled={savingApiKey}
                className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40"
                aria-label="Cerrar"
              >
                <i className="bx bx-x text-2xl" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-5 space-y-4">
              <div>
                <label className="block text-[#171931] text-[13px] font-medium mb-1.5">
                  API Key
                </label>
                <div className="relative">
                  <i className="bx bx-key absolute left-3 top-1/2 -translate-y-1/2 text-base text-slate-400" />
                  <input
                    type="text"
                    name="openai_api_key"
                    autoComplete="off"
                    spellCheck={false}
                    disabled={savingApiKey}
                    value={existeAsistente || ""}
                    onChange={(e) => setExisteAsistente(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 focus:bg-white transition-all duration-200 disabled:opacity-60"
                    placeholder="sk-..."
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  ¿Aún no tiene una?{" "}
                  <a
                    href={openAIKeyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-indigo-600 hover:underline"
                  >
                    Genérela aquí <i className="bx bx-link-external" />
                  </a>
                </p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5">
                <div className="flex items-start gap-2.5">
                  <i className="bx bx-wallet text-lg text-amber-700 mt-0.5" />
                  <div className="text-[12px] leading-5 text-amber-900">
                    <span className="font-bold">Nota:</span> su cuenta de OpenAI
                    debe tener <span className="font-semibold">saldo</span> para
                    que el bot responda.
                    <a
                      href={openAIBillingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-1 font-bold text-amber-900 hover:bg-amber-200 transition"
                    >
                      <i className="bx bx-dollar-circle" /> Recargar / verificar
                      saldo
                    </a>
                  </div>
                </div>
              </div>

              {/* Feedback mientras se valida contra OpenAI */}
              {savingApiKey && (
                <div className="flex items-center gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50 px-3.5 py-3">
                  <i className="bx bx-loader-alt bx-spin text-lg text-indigo-600" />
                  <p className="text-[12px] font-semibold text-indigo-900">
                    Validando su API Key con OpenAI… esto toma unos segundos.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end bg-gray-50/60 px-5 py-4 border-t border-gray-100 space-x-2.5">
              <button
                onClick={() => setShowModalApiKey(false)}
                disabled={savingApiKey}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 font-medium hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={() => guardarApiKey(existeAsistente)}
                disabled={savingApiKey}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-sm text-white font-semibold hover:bg-indigo-700 shadow-sm transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <i
                  className={`bx ${savingApiKey ? "bx-loader-alt bx-spin" : "bx-check"}`}
                />
                {savingApiKey ? "Validando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ventas (estructura tipo CrearConfiguracionModal).
          Sin "Nombre del Bot": era solo cosmético — el nombre real del
          asistente se define al personalizar el prompt en el tablero. */}
      {showModalVentas && (
        <div
          className="fixed inset-0 bg-[#0a1a36]/50 backdrop-blur-md flex justify-center items-center z-50 p-4"
          onMouseDown={(e) =>
            e.target === e.currentTarget &&
            !savingVentas &&
            setShowModalVentas(false)
          }
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-green-600">
                  <i className="bx bxs-cart text-xl" />
                </span>
                <div>
                  <h5 className="text-base font-semibold text-[#171931] leading-tight">
                    Configurar Agente de Ventas
                  </h5>
                  <p className="text-[12px] text-slate-500">
                    Elija el tipo de venta y si el bot debe responder.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModalVentas(false)}
                disabled={savingVentas}
                className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40"
                aria-label="Cerrar"
              >
                <i className="bx bx-x text-2xl" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-5 space-y-4">
              <div>
                <label className="block text-[#171931] text-[13px] font-medium mb-1.5">
                  Agente para venta de
                </label>
                {/* Selector visual (2 tarjetas) en lugar del <select> plano */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      value: "productos",
                      label: "Productos",
                      icon: "bx-package",
                      desc: "Catálogo físico / COD",
                    },
                    {
                      value: "servicios",
                      label: "Servicios",
                      icon: "bx-calendar-check",
                      desc: "Citas y agendamiento",
                    },
                  ].map((opt) => {
                    const on = tipoVenta === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={savingVentas}
                        onClick={() => setTipoVenta(opt.value)}
                        className={`flex items-start gap-2.5 rounded-xl border-2 p-3 text-left transition-all duration-150 disabled:opacity-60 ${
                          on
                            ? "border-indigo-500 bg-indigo-50/60 shadow-sm"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <span
                          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            on
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <i className={`bx ${opt.icon} text-lg`} />
                        </span>
                        <span>
                          <span
                            className={`block text-sm font-bold ${on ? "text-indigo-900" : "text-gray-800"}`}
                          >
                            {opt.label}
                          </span>
                          <span className="block text-[11px] text-slate-500 mt-0.5">
                            {opt.desc}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  El prompt base se adapta automáticamente al tipo elegido y se
                  alimenta de su catálogo.{" "}
                  <a
                    href="https://chatcenter.imporfactory.app/productos"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-indigo-600 hover:underline"
                  >
                    Ver productos <i className="bx bx-link-external" />
                  </a>
                </p>
              </div>

              {/* Activar bot: switch (sí se usa — si está apagado, el
                  asistente no responde automáticamente) */}
              <div
                className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 transition-colors ${
                  activoVenta
                    ? "border-emerald-200 bg-emerald-50/60"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <i
                    className={`bx ${activoVenta ? "bx-bot text-emerald-600" : "bx-moon text-slate-400"} text-xl mt-0.5`}
                  />
                  <div>
                    <span className="block text-sm font-bold text-gray-800">
                      {activoVenta ? "Bot activo" : "Bot apagado"}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {activoVenta
                        ? "Responderá automáticamente a sus clientes."
                        : "No responderá hasta que lo active."}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={activoVenta}
                  disabled={savingVentas}
                  onClick={() => setActivoVenta((v) => !v)}
                  className={`relative w-12 h-[26px] rounded-full transition-colors duration-200 shrink-0 disabled:opacity-60 ${
                    activoVenta ? "bg-emerald-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`absolute top-[3px] w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${
                      activoVenta ? "left-[26px]" : "left-[3px]"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end bg-gray-50/60 px-5 py-4 border-t border-gray-100 space-x-2.5">
              <button
                onClick={() => setShowModalVentas(false)}
                disabled={savingVentas}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 font-medium hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={guardarVentas}
                disabled={savingVentas}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-sm text-white font-semibold hover:bg-indigo-700 shadow-sm transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <i
                  className={`bx ${savingVentas ? "bx-loader-alt bx-spin" : "bx-check"}`}
                />
                {savingVentas ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showGuiaOpenAI && (
        <GuiaOpenAIModal onClose={() => setShowGuiaOpenAI(false)} />
      )}
    </div>
  );
};

export default Asistentes;
