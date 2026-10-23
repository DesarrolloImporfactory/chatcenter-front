import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import Select, { components } from "react-select";
import chatApi from "../../api/chatcenter";
import GuiaOpenAIModal from "./modales/OpenAiModal";
import ConsumoAsistente from "./ConsumoAsistente";

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

/* Video «Cómo generar la API Key de Claude». Mientras esté vacío, el botón de
   la fila «¿Cómo configurar?» se ve desactivado con «Muy pronto»; al pegar
   aquí el enlace de YouTube queda activo solo. */
const TUTORIAL_CLAUDE_URL = "";

/** —— Página de Asistentes —— */
const Asistentes = () => {
  const navigate = useNavigate();
  const [id_configuracion, setId_configuracion] = useState(null);

  // Key guardada, ENMASCARADA ("sk-proj-••••UVYA"): el backend ya no devuelve
  // la real. Sirve como bandera de "hay key" y como referencia visual.
  const [existeAsistente, setExisteAsistente] = useState(null);
  const [showModalApiKey, setShowModalApiKey] = useState(false);
  // Lo que se tipea en el modal. Va aparte y arranca vacío: si se precargara
  // con la máscara, "Guardar" mandaría la máscara como si fuera una key.
  const [apiKeyInput, setApiKeyInput] = useState("");

  // Proveedor con el que responde el bot: "openai" (por defecto) o "claude".
  // El mismo modal de API Key sirve para los dos: modalProveedor dice cuál
  // se está editando. La llave de Claude también llega enmascarada.
  const [proveedorIA, setProveedorIA] = useState("openai");
  const [modalProveedor, setModalProveedor] = useState("openai");
  const [existeClaude, setExisteClaude] = useState(null);
  const [claudeKeyGuardada, setClaudeKeyGuardada] = useState(false);
  const [cambiandoProveedor, setCambiandoProveedor] = useState(false);
  // Si eligió un proveedor sin llave, se abre el modal y, al guardar la llave,
  // se activa ese proveedor solo (no hay que volver a hacer clic).
  const [pendienteActivar, setPendienteActivar] = useState(null);
  /* Proveedor que el cliente está CONECTANDO (el que eligió en el paso 1),
     que no es el activo hasta que guarda la llave. El paso 2 lo sigue a él:
     antes seguía a `proveedorIA`, así que quien entraba por primera vez y
     elegía Claude veía "Generar API Key de OpenAI", y el botón de Claude
     recién aparecía cuando ya tenía la llave guardada. */
  const [proveedorPaso2, setProveedorPaso2] = useState("openai");
  const esModalClaude = modalProveedor === "claude";
  const abrirModalApiKey = (proveedor = "openai") => {
    setModalProveedor(proveedor);
    setProveedorPaso2(proveedor);
    setShowModalApiKey(true);
  };

  // Lo que el cliente necesita para decidir con cuál conectarse: modelos,
  // cuánto cuesta cada respuesta (mismas cifras que el selector de modelo de
  // Kanban → Configuración → Asistente) y qué cambia en el bot con cada uno.
  const PROVEEDORES = {
    openai: {
      nombre: "OpenAI",
      corto: "OpenAI",
      sigla: "AI",
      color: "indigo",
      keyUrl: "https://platform.openai.com/api-keys",
      billingUrl:
        "https://platform.openai.com/settings/organization/billing/overview",
      prefijo: "sk-...",
      tagline: "La opción de siempre: ChatGPT para su negocio",
      modelos: ["GPT-5 mini", "GPT-5 nano", "GPT-4o mini", "GPT-4.1", "GPT-4o"],
      costo: "≈ $0.001 a $0.03 por respuesta",
      recomendado: "GPT-5 mini: ≈ $0.004 por respuesta (unas 250 por dólar)",
      rinde: "Con $10 salen unas 2.500 respuestas con GPT-5 mini",
      // Solo lo que de verdad cambia para el cliente. Todo lo demás (fotos,
      // documentos, pedidos, remarketing, chat de prueba) lo hacen los dos.
      diferencias: [
        "Siempre necesaria: transcribe los audios del cliente y genera las imágenes de producto con IA (ajustes avanzados del producto), aunque el bot responda con Claude",
      ],
    },
    claude: {
      nombre: "Claude (Anthropic)",
      corto: "Claude",
      sigla: "C",
      color: "amber",
      keyUrl: "https://console.anthropic.com/settings/keys",
      billingUrl: "https://console.anthropic.com/settings/billing",
      prefijo: "sk-ant-...",
      tagline: "Los modelos de Anthropic, los más precisos con guiones largos",
      modelos: ["Opus 5.5", "Sonnet 5.5", "Haiku 5.5"],
      costo: "≈ $0.001 a $0.02 por respuesta",
      recomendado: "Opus 5.5: ≈ $0.02 por respuesta (unas 50 por dólar)",
      rinde: "Con $10 salen unas 500 respuestas con Opus 5.5 (o 10.000 con Haiku 5.5)",
      diferencias: [
        "Necesita también la API Key de OpenAI para dos cosas: los audios del cliente (OpenAI los pasa a texto y Claude responde) y las imágenes de producto con IA de los ajustes avanzados",
        "Los documentos de conocimiento los lee completos en cada respuesta (PDF, DOCX, XLSX, TXT); no lee escaneos ni PPTX",
      ],
    },
  };
  const proveedorModal = PROVEEDORES[modalProveedor];
  // keyGuardadaModal / keyMascaraModal se definen más abajo, después de
  // apiKeyGuardada (useState): usarlos antes rompía el render (TDZ).

  useEffect(() => {
    setApiKeyInput("");
  }, [showModalApiKey]);

  const [asistenteVentas, setAsistenteVentas] = useState(null);
  // Aviso no bloqueante del back (p. ej. organización de OpenAI sin verificar
  // para GPT-5: el bot responde con el modelo de respaldo).
  const [avisoOpenAI, setAvisoOpenAI] = useState(null);
  const [nombreBotVenta, setNombreBotVenta] = useState("");
  const [activoVenta, setActivoVenta] = useState(false);
  const [productosVenta, setProductosVenta] = useState([]);
  const [tipoVenta, setTipoVenta] = useState("productos");

  const [showModalVentas, setShowModalVentas] = useState(false);
  const [showGuiaOpenAI, setShowGuiaOpenAI] = useState(false);
  // Tabla «OpenAI y Claude, lado a lado»: null = sin tocar (abierta solo si
  // todavía no hay ninguna llave guardada); true/false = lo que eligió.
  const [verComparacion, setVerComparacion] = useState(null);
  const [productosLista, setProductosLista] = useState([]);

  useEffect(() => {
    const idc = localStorage.getItem("id_configuracion");
    if (idc) setId_configuracion(parseInt(idc));
  }, []);

  // true solo si la key existe GUARDADA en la BD (no lo que se tipea en el
  // input) — controla la visibilidad del botón "Eliminar API Key" del modal.
  const [apiKeyGuardada, setApiKeyGuardada] = useState(false);
  // Qué llave muestra/edita el modal según el proveedor elegido en él.
  const keyGuardadaModal = esModalClaude ? claudeKeyGuardada : apiKeyGuardada;
  // Qué proveedor muestran los pasos 2 y 3. Si el activo tiene llave, él; si
  // no (cuenta nueva: "openai" por defecto sin llave), el que sí tenga llave;
  // sin ninguna, el por defecto. El cliente cambia tocando la tarjeta. Va
  // después de declarar apiKeyGuardada: arriba daba "Cannot access before
  // initialization".
  useEffect(() => {
    const llaveDe = { openai: apiKeyGuardada, claude: claudeKeyGuardada };
    if (llaveDe[proveedorIA]) setProveedorPaso2(proveedorIA);
    else if (llaveDe.claude) setProveedorPaso2("claude");
    else if (llaveDe.openai) setProveedorPaso2("openai");
    else setProveedorPaso2(proveedorIA);
  }, [proveedorIA, apiKeyGuardada, claudeKeyGuardada]);
  const keyMascaraModal = esModalClaude ? existeClaude : existeAsistente;

  // A qué cuenta de OpenAI pertenece la key GUARDADA (nombre, correo,
  // organización). El saldo es por organización: sin esto el cliente recarga
  // una cuenta mientras el bot consume de otra. null = sin key o no se pudo
  // averiguar, y entonces simplemente no se muestra.
  // El back la guarda en la BD al cargar la llave y no vuelve a preguntar a
  // OpenAI hasta que cambie; "Actualizar" (refrescar=1) fuerza la consulta.
  const [cuentaOpenAI, setCuentaOpenAI] = useState(null);
  const [cuentaOpenAIAt, setCuentaOpenAIAt] = useState(null);
  const [refrescandoCuenta, setRefrescandoCuenta] = useState(false);

  const fetchCuentaOpenAI = async (refrescar = false) => {
    if (!id_configuracion) return;
    try {
      if (refrescar) setRefrescandoCuenta(true);
      const { data } = await chatApi.get("openai_assistants/openai_cuenta", {
        params: { id_configuracion, ...(refrescar ? { refrescar: 1 } : {}) },
      });
      setCuentaOpenAI(data?.cuenta || null);
      setCuentaOpenAIAt(data?.consultada_at || null);
    } catch (error) {
      console.error("No se pudo identificar la cuenta de OpenAI.", error);
      setCuentaOpenAI(null);
      setCuentaOpenAIAt(null);
    } finally {
      if (refrescar) setRefrescandoCuenta(false);
    }
  };

  // Lo mismo para Claude: Anthropic no da el correo con una llave normal,
  // pero sí el nombre de la organización y sus ids, que es donde se recarga.
  const [cuentaClaude, setCuentaClaude] = useState(null);
  const [cuentaClaudeAt, setCuentaClaudeAt] = useState(null);

  const fetchCuentaClaude = async (refrescar = false) => {
    if (!id_configuracion) return;
    try {
      if (refrescar) setRefrescandoCuenta(true);
      const { data } = await chatApi.get("openai_assistants/claude_cuenta", {
        params: { id_configuracion, ...(refrescar ? { refrescar: 1 } : {}) },
      });
      setCuentaClaude(data?.cuenta || null);
      setCuentaClaudeAt(data?.consultada_at || null);
    } catch (error) {
      console.error("No se pudo identificar la organización de Claude.", error);
      setCuentaClaude(null);
      setCuentaClaudeAt(null);
    } finally {
      if (refrescar) setRefrescandoCuenta(false);
    }
  };

  // "Consultado el 22/10/2026 · Actualizar" al pie de los recuadros de cuenta.
  const fechaConsultaCorta = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("es-EC");
  };

  const fetchAsistenteAutomatizado = async () => {
    if (!id_configuracion) return;
    try {
      const response = await chatApi.post("openai_assistants/info_asistentes", {
        id_configuracion: id_configuracion,
      });
      const data = response.data?.data || {};
      const hayKey = Boolean(String(data.api_key_openai || "").trim());
      setExisteAsistente(data.api_key_openai || null);
      setApiKeyGuardada(hayKey);
      setProveedorIA(data.proveedor_ia === "claude" ? "claude" : "openai");
      setExisteClaude(data.api_key_claude || null);
      setClaudeKeyGuardada(
        Boolean(String(data.api_key_claude || "").trim()),
      );
      setAsistenteVentas(data.ventas || null);
      setAvisoOpenAI(data.openai_aviso || null);
      // Aparte y sin await: consulta a OpenAI, no debe demorar la vista.
      if (hayKey) fetchCuentaOpenAI();
      else setCuentaOpenAI(null);
      if (String(data.api_key_claude || "").trim()) fetchCuentaClaude();
      else setCuentaClaude(null);
    } catch (error) {
      console.error("Error al cargar los asistentes.", error);
      setExisteAsistente(null);
      setApiKeyGuardada(false);
      setExisteClaude(null);
      setClaudeKeyGuardada(false);
      setAsistenteVentas(null);
      setCuentaOpenAI(null);
      setCuentaClaude(null);
    }
  };

  // Con qué proveedor responde el bot. El back exige que la llave de ese
  // proveedor esté guardada; si no, devuelve el motivo y no cambia nada.
  const cambiarProveedor = async (proveedor) => {
    if (cambiandoProveedor || proveedor === proveedorIA) return;
    const tieneLlave = proveedor === "claude" ? claudeKeyGuardada : apiKeyGuardada;
    if (!tieneLlave) {
      // Sin llave: se abre el modal y punto. Al guardarla, el proveedor se
      // activa solo (pendienteActivar). Sin toast: parecía un error antes
      // de que el cliente hubiera hecho nada.
      setPendienteActivar(proveedor);
      abrirModalApiKey(proveedor);
      return;
    }
    setCambiandoProveedor(true);
    try {
      const { data } = await chatApi.post(
        "openai_assistants/actualizar_proveedor_ia",
        { id_configuracion, proveedor },
      );
      setProveedorIA(data?.proveedor_ia === "claude" ? "claude" : "openai");
      Toast.fire({
        icon: "success",
        title: data?.message || "Proveedor actualizado",
      });
    } catch (e) {
      console.error(e);
      Toast.fire({
        icon: "error",
        title: e?.response?.data?.message || "No se pudo cambiar el proveedor",
      });
    } finally {
      setCambiandoProveedor(false);
    }
  };

  /* Solo productos de ChatCenter. La fuente "imporsuit" leía inventario_bodegas
     del ERP viejo, tabla que ya no existe. */
  const fetchProductos = async () => {
    if (!id_configuracion) return;
    try {
      const prodRes = await chatApi.post("/productos/listarProductos", {
        id_configuracion,
      });
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
    fetchProductos();
  }, [id_configuracion]);

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
  const [deletingApiKey, setDeletingApiKey] = useState(false);

  // Elimina la API Key (y suspende los asistentes con soft delete en el back).
  const eliminarApiKey = async () => {
    if (deletingApiKey || savingApiKey) return;

    const r = await Swal.fire({
      icon: "warning",
      title: "¿Eliminar API Key?",
      html: `Su asistente <b>dejará de responder</b> a los clientes hasta que
        configure una nueva llave.<br/>`,
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#171931",
      customClass: { popup: "rounded-2xl" },
    });
    if (!r.isConfirmed) return;

    setDeletingApiKey(true);
    try {
      if (esModalClaude) {
        await chatApi.post("openai_assistants/eliminar_api_key_claude", {
          id_configuracion,
        });
        setExisteClaude(null);
        setClaudeKeyGuardada(false);
      } else {
        await chatApi.post("openai_assistants/eliminar_api_key_openai", {
          id_configuracion,
        });
        setExisteAsistente(null);
        setApiKeyGuardada(false);
      }
      setShowModalApiKey(false);
      await fetchAsistenteAutomatizado();
      Toast.fire({
        icon: "success",
        title: esModalClaude
          ? "API Key de Claude eliminada; el bot vuelve a OpenAI"
          : "API Key eliminada y asistente suspendido",
      });
    } catch (e) {
      console.error(e);
      Toast.fire({
        icon: "error",
        title: e?.response?.data?.message || "No se pudo eliminar la API Key",
      });
    } finally {
      setDeletingApiKey(false);
    }
  };

  const guardarApiKey = async (apiKeyInput) => {
    if (savingApiKey) return;
    const key = String(apiKeyInput || "").trim();
    if (!key) {
      Toast.fire({
        icon: "warning",
        title: `Pegue su API Key de ${proveedorModal.nombre}`,
      });
      return;
    }
    setSavingApiKey(true);
    try {
      const response = esModalClaude
        ? await chatApi.post("openai_assistants/actualizar_api_key_claude", {
            id_configuracion: id_configuracion,
            api_key: key,
          })
        : await chatApi.post("openai_assistants/actualizar_api_key_openai", {
            id_configuracion: id_configuracion,
            api_key: key,
            tipo_configuracion: localStorage.getItem("tipo_configuracion"),
          });
      const data = response.data || {};
      if (data.status === "200") {
        setShowModalApiKey(false);
        await fetchAsistenteAutomatizado();
        Toast.fire({
          icon: "success",
          title: esModalClaude
            ? data.cuenta?.organizacion
              ? `API Key de Claude validada · ${data.cuenta.organizacion}`
              : "API Key de Claude validada y guardada"
            : data.cuenta?.email
              ? `API Key validada · cuenta ${data.cuenta.email}`
              : "API Key validada y guardada",
        });
        // Venía de elegir este proveedor sin llave: ahora sí se activa.
        if (pendienteActivar === modalProveedor && proveedorIA !== modalProveedor) {
          setPendienteActivar(null);
          try {
            const r = await chatApi.post(
              "openai_assistants/actualizar_proveedor_ia",
              { id_configuracion, proveedor: modalProveedor },
            );
            setProveedorIA(r.data?.proveedor_ia === "claude" ? "claude" : "openai");
            Toast.fire({ icon: "success", title: r.data?.message || "Proveedor activado" });
          } catch (e2) {
            Toast.fire({
              icon: "error",
              title: e2?.response?.data?.message || "La llave se guardó, pero no se pudo activar el proveedor",
            });
          }
        }
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
          `API Key inválida o sin conexión con ${proveedorModal.nombre}`,
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

  // «Hay llave» = la del proveedor con el que responde el bot. Con Claude
  // activo, la de OpenAI no cuenta para el estado del agente.
  const hasApiKey =
    proveedorIA === "claude"
      ? claudeKeyGuardada
      : Boolean(existeAsistente && String(existeAsistente).trim().length > 0);
  const proveedorActivo = PROVEEDORES[proveedorIA];
  // El paso 2 habla del proveedor que se está conectando, no del activo.
  const proveedorPaso2Info = PROVEEDORES[proveedorPaso2] || proveedorActivo;
  const llavePaso2 =
    proveedorPaso2 === "claude"
      ? claudeKeyGuardada
      : Boolean(existeAsistente && String(existeAsistente).trim().length > 0);
  const existePaso2 = proveedorPaso2 === "claude" ? existeClaude : existeAsistente;
  const mostrarComparacion =
    verComparacion ?? !(apiKeyGuardada || claudeKeyGuardada);

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


  return (
    <div className="p-5">
      {/* HERO (azul sólido, igual que los demás headers del sistema) */}
      <div className="mb-6 rounded-2xl bg-[#171931] text-white p-6 shadow-lg relative overflow-hidden">
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Asistentes AI</h1>
            <p className="opacity-90 mt-1 max-w-2xl">
              Configure la conexión con{" "}
              <span className="font-semibold">OpenAI</span> o{" "}
              <span className="font-semibold">Claude</span>, elija con cuál
              responde el bot y administre su comportamiento general.
            </p>
          </div>

          {/* Un solo botón: el del proveedor con el que responde el bot. Las
              dos cuentas se manejan en el paso 1 de la tarjeta de abajo. */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold ring-1 ${
                hasApiKey
                  ? "bg-emerald-400/15 text-emerald-200 ring-emerald-300/40"
                  : "bg-amber-400/15 text-amber-100 ring-amber-300/40"
              }`}
            >
              <i className={`bx ${hasApiKey ? "bxs-check-circle" : "bx-time-five"}`} />
              {hasApiKey
                ? `Respondiendo con ${proveedorActivo.corto}`
                : `Sin conectar · falta la API Key de ${proveedorActivo.corto}`}
            </span>
            <button
              onClick={() => abrirModalApiKey(proveedorIA)}
              className="bg-white text-indigo-700 hover:bg-indigo-50 transition px-4 py-2 rounded-xl text-sm font-semibold shadow"
            >
              {hasApiKey
                ? `Cambiar API Key de ${proveedorActivo.corto}`
                : `Conectar ${proveedorActivo.corto} ahora`}
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
        {/* Tutorial de Claude: mismo botón que el de OpenAI. Sin enlace
            todavía (TUTORIAL_CLAUDE_URL vacío) se ve desactivado, «Muy
            pronto», para que se note que ahí va el video. */}
        {TUTORIAL_CLAUDE_URL ? (
          <a
            href={TUTORIAL_CLAUDE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold
      text-indigo-700 bg-indigo-50 ring-1 ring-indigo-200
      hover:bg-indigo-100 hover:ring-indigo-300 transition-all"
          >
            <i className="bx bx-key text-sm" />
            API Key Claude
            <i className="bx bx-play-circle text-sm text-indigo-400" />
          </a>
        ) : (
          <button
            type="button"
            disabled
            title="El video tutorial de Claude está en preparación"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold
      text-slate-400 bg-slate-50 ring-1 ring-slate-200 cursor-not-allowed"
          >
            <i className="bx bx-key text-sm" />
            API Key Claude
            <i className="bx bx-play-circle text-sm" />
            <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wide">
              Muy pronto
            </span>
          </button>
        )}
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
                Conecte su asistente AI en 3 pasos
              </h3>
              <p className="text-[12.5px] text-gray-500">
                Toma menos de 2 minutos · el bot responde con OpenAI o con
                Claude (Anthropic), y puede cambiar cuando quiera. La llave de
                OpenAI hace falta siempre: transcribe los audios del cliente y
                genera las imágenes de producto con IA
              </p>
            </div>
          </div>

          {/* Aviso no bloqueante: el bot responde, pero con el modelo de
              respaldo porque la organización de OpenAI no está verificada
              para GPT-5. Solo el dueño puede arreglarlo, así que se le dice
              exactamente qué hacer y dónde. */}
          {avisoOpenAI?.codigo === "ORG_NO_VERIFICADA" && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5">
              <div className="flex items-start gap-2.5">
                <i className="bx bx-error-circle text-lg text-amber-700 mt-0.5" />
                <div className="min-w-0 text-[12.5px] leading-5 text-amber-950">
                  <div className="font-bold">
                    Su bot está respondiendo con un modelo de respaldo
                  </div>
                  <div>
                    {avisoOpenAI.msg ||
                      "Su organización de OpenAI no está verificada para GPT-5."}{" "}
                    Sus clientes sí reciben respuesta, pero no con el modelo que
                    eligió. Para volver a GPT-5 entre a OpenAI con el correo
                    dueño de su API Key{cuentaOpenAI?.email ? ` (${cuentaOpenAI.email})` : ""} y pulse{" "}
                    <span className="font-semibold">Verify Organization</span>.
                    Tarda hasta 15 minutos en activarse. No es un problema de
                    saldo ni de su plan.
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[12px]">
                    <a
                      href="https://platform.openai.com/settings/organization/general"
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-amber-800 underline hover:text-amber-900"
                    >
                      Verificar organización en OpenAI
                    </a>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const { data } = await chatApi.post(
                            "openai_assistants/openai_comprobar_gpt5",
                            { id_configuracion },
                          );
                          Toast.fire({
                            icon: data?.ok ? "success" : "warning",
                            title: data?.mensaje || (data?.ok ? "GPT-5 ya responde" : "Todavía no está verificada"),
                          });
                          if (data?.ok) setAvisoOpenAI(null);
                        } catch (e) {
                          Toast.fire({
                            icon: "error",
                            title: e?.response?.data?.message || "No se pudo comprobar con OpenAI",
                          });
                        }
                      }}
                      className="font-semibold text-amber-800 underline hover:text-amber-900"
                    >
                      Ya verifiqué, comprobar ahora
                    </button>
                    {avisoOpenAI.at && (
                      <span className="text-amber-900/70">
                        Detectado el {new Date(avisoOpenAI.at).toLocaleDateString("es-EC")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold ring-1 ${
              hasApiKey
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : "bg-amber-50 text-amber-800 ring-amber-200"
            }`}
          >
            <i className={`bx ${hasApiKey ? "bxs-check-circle" : "bx-time-five"}`} />
            {hasApiKey
              ? `Responde con ${proveedorActivo.nombre}`
              : `Falta la API Key de ${proveedorActivo.nombre}`}
          </span>
        </div>

        {/* Los 3 pasos en UNA fila. El paso 1 elige la cuenta con dos filas
            compactas (OpenAI / Claude); la comparación completa —modelos,
            costo por respuesta, diferencias— va debajo, plegable, para no
            estirar la fila ni dejar huecos en los pasos 2 y 3. Elegir una
            cuenta sin llave abre el modal y la activa al guardar. */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
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
                Elija con quién responde
              </span>
            </div>
            <p className="text-[12.5px] text-gray-500 leading-5 mb-3">
              OpenAI o Claude: las dos funcionan igual con su bot. Puede
              guardar ambas llaves y cambiar cuando quiera. Toque una tarjeta
              y los pasos 2 y 3 le muestran cómo conectarla.
            </p>
            {/* Claude sin llave de OpenAI: el bot responde texto, fotos y
                documentos, pero no escucha audios (eso lo hace OpenAI). */}
            {proveedorIA === "claude" && !apiKeyGuardada && (
              <div className="mb-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-[11.5px] text-amber-800 leading-4">
                <i className="bx bx-error align-middle" /> Falta la API Key de
                OpenAI: sin ella el bot no escucha los audios del cliente ni
                genera imágenes de producto con IA, aunque responda con Claude.
              </div>
            )}
            <div className="flex flex-col gap-2 flex-1">
              {[
                { id: "openai", llave: apiKeyGuardada },
                { id: "claude", llave: claudeKeyGuardada },
              ].map((p) => {
                const info = PROVEEDORES[p.id];
                /* "Activo" = el bot responde con él Y tiene llave. Sin llave
                   no responde nadie, así que no se marca (antes OpenAI salía
                   "Activo" en una cuenta recién creada, sin llave). */
                const activo = proveedorIA === p.id && Boolean(p.llave);
                const seleccionado = proveedorPaso2 === p.id;
                const esClaude = p.id === "claude";
                return (
                  <div
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setProveedorPaso2(p.id)}
                    onKeyDown={(e) => e.key === "Enter" && setProveedorPaso2(p.id)}
                    className={`rounded-xl border-2 bg-white px-3 py-2 flex items-center gap-2.5 transition cursor-pointer ${
                      seleccionado
                        ? "border-indigo-500 shadow-sm"
                        : "border-gray-200 hover:border-indigo-300"
                    }`}
                    title={`Ver los pasos para ${info.corto}`}
                  >
                    <span
                      className={`w-8 h-8 rounded-lg grid place-items-center text-[12px] font-extrabold shrink-0 ${
                        esClaude
                          ? "bg-amber-100 text-amber-800"
                          : "bg-indigo-100 text-indigo-700"
                      }`}
                    >
                      {info.sigla}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[13px] text-gray-900 leading-tight truncate">
                          {info.corto}
                        </span>
                        {activo && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-600 text-white shrink-0">
                            Responde el bot
                          </span>
                        )}
                      </div>
                      <div
                        className={`text-[11px] leading-4 ${
                          p.llave ? "text-emerald-700" : "text-gray-400"
                        }`}
                      >
                        <i className={`bx ${p.llave ? "bxs-check-circle" : "bx-key"}`} />{" "}
                        {p.llave ? "API Key guardada" : "Sin API Key"}
                        {p.llave && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              abrirModalApiKey(p.id);
                            }}
                            className="ml-1.5 font-semibold text-gray-500 hover:text-indigo-600 hover:underline"
                          >
                            editar
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Sin llave: "Conectar" abre el modal (aunque sea el
                        proveedor por defecto). Con llave y sin ser el activo:
                        "Usar" lo activa. Con llave y activo: nada que hacer. */}
                    {!p.llave ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (proveedorIA !== p.id) setPendienteActivar(p.id);
                          abrirModalApiKey(p.id);
                        }}
                        className="shrink-0 px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition"
                      >
                        Conectar
                      </button>
                    ) : (
                      !activo && (
                        <button
                          type="button"
                          disabled={cambiandoProveedor}
                          onClick={(e) => {
                            e.stopPropagation();
                            cambiarProveedor(p.id);
                          }}
                          className="shrink-0 px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-60"
                        >
                          Usar
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setVerComparacion(!mostrarComparacion)}
              className="mt-3 inline-flex items-center justify-center gap-1 text-[12px] font-semibold text-indigo-600 hover:text-indigo-800"
            >
              <i
                className={`bx ${mostrarComparacion ? "bx-chevron-up" : "bx-chevron-down"} text-base`}
              />
              {mostrarComparacion
                ? "Ocultar comparación"
                : "¿Cuál elegir? Comparar modelos y costos"}
            </button>
          </div>

          {/* Paso 2: la llave del proveedor que se está conectando (el que
              eligió en el paso 1). Si todavía no es el activo, se dice. */}
          <div className="relative rounded-2xl border border-gray-100 bg-gray-50/60 p-4 flex flex-col">
            <div className="flex items-center gap-2.5 mb-2">
              <span
                className={`w-7 h-7 rounded-full grid place-items-center text-[12px] font-extrabold ${
                  llavePaso2
                    ? "bg-emerald-500 text-white"
                    : "bg-[#171931] text-white"
                }`}
              >
                {llavePaso2 ? <i className="bx bx-check text-base" /> : "2"}
              </span>
              <span className="font-bold text-gray-900 text-[14px]">
                Genere y pegue su API Key de {proveedorPaso2Info.corto}
              </span>
            </div>
            <p className="text-[12.5px] text-gray-500 leading-5">
              Inicie sesión en {proveedorPaso2Info.nombre}, cree una llave
              secreta y péguela aquí: la validamos al guardar y queda cifrada.
              {proveedorPaso2 !== proveedorIA && !llavePaso2 && (
                <>
                  {" "}
                  Al guardarla, el bot pasa a responder con{" "}
                  {proveedorPaso2Info.corto}.
                </>
              )}
            </p>
            {/* Estado de la llave de ese proveedor: llena el hueco entre el
                texto y los botones con algo útil. */}
            <div
              className={`mt-2 rounded-xl border px-3 py-2 text-[11.5px] font-semibold truncate ${
                llavePaso2
                  ? "border-emerald-100 bg-emerald-50/60 text-emerald-700"
                  : "border-amber-100 bg-amber-50/60 text-amber-800"
              }`}
            >
              <i className={`bx ${llavePaso2 ? "bxs-check-circle" : "bx-key"} align-middle`} />{" "}
              {llavePaso2 ? (
                <>
                  Guardada ·{" "}
                  <span className="font-mono font-normal">{existePaso2}</span>
                </>
              ) : (
                `Todavía sin API Key de ${proveedorPaso2Info.corto}`
              )}
            </div>
            <a
              href={proveedorPaso2Info.keyUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-auto pt-3 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#171931] text-white hover:opacity-95 transition text-sm font-semibold"
            >
              <i className="bx bx-link-external" />
              Generar API Key de {proveedorPaso2Info.corto}
            </a>
            <button
              onClick={() => abrirModalApiKey(proveedorPaso2)}
              className="mt-2 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition text-sm font-semibold shadow-sm"
            >
              <i className="bx bx-plus" />
              {llavePaso2 ? "Reemplazar API Key" : "Pegar API Key aquí"}
            </button>
          </div>

          {/* Paso 3: saldo del proveedor seleccionado en el paso 1 */}
          <div className="relative rounded-2xl border border-gray-100 bg-gray-50/60 p-4 flex flex-col">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-7 h-7 rounded-full grid place-items-center text-[12px] font-extrabold bg-[#171931] text-white">
                3
              </span>
              <span className="font-bold text-gray-900 text-[14px]">
                Recargue saldo en {proveedorPaso2Info.corto}
              </span>
            </div>
            <p className="text-[12.5px] text-gray-500 leading-5">
              Sin saldo en {proveedorPaso2Info.nombre} el bot no responde
              aunque la llave sea válida.
            </p>
            {/* Cuánto rinde una recarga: la misma cifra que la comparación. */}
            <div className="mt-2 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-[11.5px] font-semibold text-indigo-800">
              <i className="bx bx-coin-stack align-middle" /> {proveedorPaso2Info.rinde}
            </div>
            <a
              href={proveedorPaso2Info.billingUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-auto pt-3 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#171931] text-white hover:opacity-95 transition text-sm font-semibold"
            >
              <i className="bx bx-link-external" />
              Ir a recargar saldo
            </a>
            <a
              href="#consumo-asistente"
              className="mt-2 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition text-sm font-semibold text-gray-800"
            >
              <i className="bx bx-line-chart" />
              Ver consumo
            </a>
          </div>
        </div>

        {/* OpenAI y Claude lado a lado: lo que el cliente necesita para
            decidir. Abierta de entrada cuando aún no hay ninguna llave; luego
            se pliega y se abre desde el paso 1. */}
        {mostrarComparacion && (
          <div className="mt-3 rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-2.5 bg-gray-50/60 border-b border-gray-100">
              <div className="text-[13px] font-bold text-gray-900">
                OpenAI y Claude, lado a lado
              </div>
              <div className="text-[11.5px] text-gray-400">
                El prompt, el catálogo y las acciones no cambian · el modelo
                exacto se elige por columna en Kanban → Configuración →
                Asistente
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] leading-4">
                <thead>
                  <tr>
                    <th className="w-28 px-4 py-2" />
                    {["openai", "claude"].map((id) => {
                      const info = PROVEEDORES[id];
                      const activo = proveedorIA === id && hasApiKey;
                      return (
                        <th key={id} className="px-4 py-2 text-left font-bold text-gray-900">
                          <span className="inline-flex items-center gap-2">
                            <span
                              className={`w-6 h-6 rounded-md grid place-items-center text-[10.5px] font-extrabold ${
                                id === "claude"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-indigo-100 text-indigo-700"
                              }`}
                            >
                              {info.sigla}
                            </span>
                            {info.nombre}
                            {activo && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-600 text-white">
                                Activo
                              </span>
                            )}
                          </span>
                          <div className="text-[11px] font-normal text-gray-500 mt-0.5">
                            {info.tagline}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 border-t border-gray-100">
                  <tr>
                    <td className="px-4 py-2 text-gray-400 font-semibold uppercase tracking-wide text-[10.5px] align-top">
                      Modelos
                    </td>
                    {["openai", "claude"].map((id) => (
                      <td key={id} className="px-4 py-2 align-top">
                        <div className="flex flex-wrap gap-1">
                          {PROVEEDORES[id].modelos.map((m) => (
                            <span
                              key={m}
                              className="px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px] font-semibold"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-gray-400 font-semibold uppercase tracking-wide text-[10.5px] align-top">
                      Costo
                    </td>
                    {["openai", "claude"].map((id) => (
                      <td key={id} className="px-4 py-2 align-top text-gray-800">
                        <span className="font-semibold">{PROVEEDORES[id].costo}</span>
                        <div className="text-gray-500">{PROVEEDORES[id].recomendado}</div>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-gray-400 font-semibold uppercase tracking-wide text-[10.5px] align-top">
                      Cobro
                    </td>
                    {["openai", "claude"].map((id) => (
                      <td key={id} className="px-4 py-2 align-top text-gray-800">
                        Pago por uso, directo en su cuenta de {PROVEEDORES[id].corto}.
                        El gasto real aparece abajo en Consumo del asistente.
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-gray-400 font-semibold uppercase tracking-wide text-[10.5px] align-top">
                      Ojo
                    </td>
                    {["openai", "claude"].map((id) => (
                      <td key={id} className="px-4 py-2 align-top text-gray-600">
                        {PROVEEDORES[id].diferencias.map((d) => (
                          <div key={d} className="flex gap-1.5">
                            <span className="text-gray-300">•</span>
                            <span>{d}</span>
                          </div>
                        ))}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Seguridad en 1 línea (antes: tarjeta entera de buenas prácticas) */}
        <p className="mt-4 flex items-start gap-2 text-[12px] text-gray-400 leading-5">
          <i className="bx bx-shield-quarter text-[15px] text-emerald-500 mt-0.5" />
          <span>
            Su API Key es privada: no la comparta por WhatsApp ni capturas. Si
            sospecha filtración, regenérela en {proveedorActivo.nombre} y
            reemplácela aquí.
          </span>
        </p>
      </div>

      {/* Tarjetas principales: las dos a la misma altura. El Estado del
          sistema reparte sus filas en el alto que le toca, así no queda
          hueco abajo en ninguna de las dos. */}
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
                    onClick={() => navigate("/configuracion_agente")}
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

        {/* Estado del sistema: solo el checklist (las llaves se editan en los
            pasos 1 y 2). Las filas se estiran para igualar la altura del
            Agente de ventas. */}
        <div className="bg-white border rounded-2xl shadow-sm hover:shadow-md transition p-5 flex flex-col">
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
          <div className="flex-1 flex flex-col">
            {/* Checklist: una fila por cuenta (la activa lleva la etiqueta
                «Responde») y una por el agente. */}
            <div className="flex-1 flex flex-col rounded-2xl border border-gray-100 divide-y divide-gray-50">
              {[
                { id: "openai", mascara: existeAsistente, titulo: "API Key OpenAI" },
                { id: "claude", mascara: existeClaude, titulo: "API Key Claude" },
              ].map((c) => {
                const activo = proveedorIA === c.id;
                // La de OpenAI falta siempre que no esté: los audios pasan
                // por ella aunque el bot responda con Claude.
                const falta = !c.mascara && (activo || c.id === "openai");
                return (
                  <div key={c.id} className="flex-1 flex items-center gap-3 px-3.5 py-2.5">
                    <i
                      className={`bx ${
                        c.mascara
                          ? "bxs-check-circle text-emerald-500"
                          : falta
                            ? "bx-time-five text-rose-400"
                            : "bx-time-five text-gray-300"
                      } text-xl shrink-0`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-gray-900">
                        {c.titulo}
                      </div>
                      <div className="text-[11.5px] text-gray-400 truncate">
                        {c.mascara ? (
                          <>
                            Configurada ·{" "}
                            <span className="font-mono">{c.mascara}</span>
                          </>
                        ) : activo ? (
                          "Sin configurar"
                        ) : c.id === "openai" ? (
                          "Sin configurar · necesaria para los audios"
                        ) : (
                          "Sin configurar (opcional)"
                        )}
                      </div>
                      {c.id === "openai" && apiKeyGuardada && cuentaOpenAI?.email && (
                        <div
                          className="mt-0.5 text-[11.5px] text-gray-500 truncate"
                          title={`${cuentaOpenAI.email} · ${cuentaOpenAI.organizacion || ""}`}
                        >
                          <i className="bx bx-user-circle align-middle text-sm text-indigo-500" />{" "}
                          <span className="font-semibold text-gray-700">
                            {cuentaOpenAI.email}
                          </span>
                          {cuentaOpenAI.organizacion && (
                            <> · {cuentaOpenAI.organizacion}</>
                          )}
                        </div>
                      )}
                      {c.id === "claude" && claudeKeyGuardada && cuentaClaude?.organizacion && (
                        <div
                          className="mt-0.5 text-[11.5px] text-gray-500 truncate"
                          title={`Organización ${cuentaClaude.organizacion}${cuentaClaude.organizacion_id ? ` · ${cuentaClaude.organizacion_id}` : ""}`}
                        >
                          <i className="bx bx-buildings align-middle text-sm text-amber-600" />{" "}
                          <span className="font-semibold text-gray-700">
                            {cuentaClaude.organizacion}
                          </span>
                        </div>
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        activo && c.mascara
                          ? "bg-indigo-100 text-indigo-700"
                          : c.mascara
                            ? "bg-emerald-100 text-emerald-700"
                            : falta
                              ? "bg-rose-100 text-rose-700"
                              : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {activo && c.mascara
                        ? "Responde"
                        : c.mascara
                          ? "OK"
                          : falta
                            ? "Pendiente"
                            : "Opcional"}
                    </span>
                  </div>
                );
              })}
              <div className="flex-1 flex items-center gap-3 px-3.5 py-2.5">
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
                      onClick={() => navigate("/configuracion_agente")}
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
          </div>
        </div>
      </div>

      {/* Consumo del asistente: respuestas con/sin IA, tokens y costo por día.
          Con las dos llaves guardadas aparece el filtro OpenAI / Claude. */}
      <ConsumoAsistente
        idConfiguracion={id_configuracion}
        proveedores={{ openai: apiKeyGuardada, claude: claudeKeyGuardada }}
      />

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
                    {keyGuardadaModal ? "Editar API Key" : "Añadir API Key"} ·{" "}
                    {proveedorModal.nombre}
                  </h5>
                  <p className="text-[12px] text-slate-500">
                    Pegue su llave de {proveedorModal.nombre}. La validamos al
                    guardar
                    {pendienteActivar === modalProveedor &&
                    proveedorIA !== modalProveedor
                      ? ` y el bot pasa a responder con ${proveedorModal.corto}.`
                      : "."}
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
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <label className="block text-[#171931] text-[13px] font-medium">
                    API Key
                  </label>
                  {/* Quien entra por "Conectar" en el paso 1 llega acá sin
                      llave: el enlace para generarla va en el mismo modal,
                      del proveedor que se está editando. */}
                  {!keyGuardadaModal && (
                    <a
                      href={proveedorModal.keyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      <i className="bx bx-link-external" />
                      ¿Aún no tiene una? Generar API Key de {proveedorModal.corto}
                    </a>
                  )}
                </div>
                <div className="relative">
                  <i className="bx bx-key absolute left-3 top-1/2 -translate-y-1/2 text-base text-slate-400" />
                  <input
                    type="text"
                    name={esModalClaude ? "claude_api_key" : "openai_api_key"}
                    autoComplete="off"
                    spellCheck={false}
                    disabled={savingApiKey}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 focus:bg-white transition-all duration-200 disabled:opacity-60"
                    placeholder={
                      keyGuardadaModal
                        ? "Pegue una llave nueva para reemplazarla"
                        : proveedorModal.prefijo
                    }
                  />
                </div>
                {keyGuardadaModal && keyMascaraModal && (
                  <p className="mt-1.5 text-[11.5px] text-slate-500">
                    Llave actual:{" "}
                    <span className="font-mono font-semibold text-slate-700">
                      {keyMascaraModal}
                    </span>{" "}
                    · guardada cifrada, no se puede volver a ver completa.
                  </p>
                )}
                <p className="mt-1.5 text-[11px] text-slate-400">
                  ¿Aún no tiene una?{" "}
                  <a
                    href={proveedorModal.keyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-indigo-600 hover:underline"
                  >
                    Genérela aquí <i className="bx bx-link-external" />
                  </a>
                </p>
              </div>

              {/* De qué cuenta de OpenAI es la key GUARDADA: el saldo es por
                  organización, así el cliente sabe dónde recargar. */}
              {!esModalClaude && apiKeyGuardada && cuentaOpenAI?.email && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5">
                  <div className="flex items-start gap-2.5">
                    <i className="bx bx-user-circle text-lg text-indigo-600 mt-0.5" />
                    <div className="min-w-0 text-[12px] leading-5 text-indigo-950">
                      <div className="font-bold">
                        Su llave guardada pertenece a esta cuenta de OpenAI
                      </div>
                      <div className="truncate">
                        {cuentaOpenAI.nombre && <>{cuentaOpenAI.nombre} · </>}
                        <span className="font-semibold">
                          {cuentaOpenAI.email}
                        </span>
                      </div>
                      <div className="truncate text-indigo-900/80">
                        Organización:{" "}
                        <span className="font-semibold">
                          {cuentaOpenAI.organizacion || "—"}
                        </span>
                        {cuentaOpenAI.proyecto && (
                          <> · Proyecto: {cuentaOpenAI.proyecto}</>
                        )}
                      </div>
                      <div className="mt-1 text-[11px] text-indigo-900/70">
                        El saldo se recarga iniciando sesión con ese correo y
                        en esa organización.
                        {fechaConsultaCorta(cuentaOpenAIAt) && (
                          <>
                            {" "}· Consultado el {fechaConsultaCorta(cuentaOpenAIAt)}
                          </>
                        )}
                        {" "}·{" "}
                        <button
                          type="button"
                          onClick={() => fetchCuentaOpenAI(true)}
                          disabled={refrescandoCuenta}
                          className="underline hover:text-indigo-700 disabled:opacity-50"
                          title="Vuelve a preguntar a OpenAI de quién es la llave guardada"
                        >
                          {refrescandoCuenta ? "Consultando…" : "Actualizar"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Lo mismo para Claude: la organización de Anthropic donde
                  vive la llave guardada (Anthropic no entrega el correo). */}
              {esModalClaude && claudeKeyGuardada && cuentaClaude?.organizacion && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5">
                  <div className="flex items-start gap-2.5">
                    <i className="bx bx-buildings text-lg text-amber-700 mt-0.5" />
                    <div className="min-w-0 text-[12px] leading-5 text-amber-950">
                      <div className="font-bold">
                        Su llave guardada pertenece a esta organización de Anthropic
                      </div>
                      <div className="truncate">
                        <span className="font-semibold">{cuentaClaude.organizacion}</span>
                      </div>
                      {cuentaClaude.organizacion_id && (
                        <div className="truncate text-amber-900/80 font-mono text-[11px]">
                          {cuentaClaude.organizacion_id}
                          {cuentaClaude.workspace_id && (
                            <> · workspace {cuentaClaude.workspace_id}</>
                          )}
                        </div>
                      )}
                      <div className="mt-1 text-[11px] text-amber-900/70">
                        El saldo se recarga en console.anthropic.com entrando a
                        esa organización (Anthropic no muestra el correo con una
                        llave normal; el nombre de la organización suele llevar
                        el del dueño).
                        {fechaConsultaCorta(cuentaClaudeAt) && (
                          <>
                            {" "}· Consultado el {fechaConsultaCorta(cuentaClaudeAt)}
                          </>
                        )}
                        {" "}·{" "}
                        <button
                          type="button"
                          onClick={() => fetchCuentaClaude(true)}
                          disabled={refrescandoCuenta}
                          className="underline hover:text-amber-800 disabled:opacity-50"
                          title="Vuelve a preguntar a Anthropic de qué organización es la llave guardada"
                        >
                          {refrescandoCuenta ? "Consultando…" : "Actualizar"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5">
                <div className="flex items-start gap-2.5">
                  <i className="bx bx-wallet text-lg text-amber-700 mt-0.5" />
                  <div className="text-[12px] leading-5 text-amber-900">
                    <span className="font-bold">Nota:</span> su cuenta de{" "}
                    {proveedorModal.nombre} debe tener{" "}
                    <span className="font-semibold">saldo</span> para que el bot
                    responda.
                    <a
                      href={proveedorModal.billingUrl}
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
                    Validando su API Key con {proveedorModal.nombre}… esto toma
                    unos segundos.
                  </p>
                </div>
              )}
            </div>

            {/* Footer: eliminar a la izquierda (solo si hay key guardada),
                acciones normales a la derecha */}
            <div className="flex items-center bg-gray-50/60 px-5 py-4 border-t border-gray-100 gap-2.5">
              {keyGuardadaModal && (
                <button
                  onClick={eliminarApiKey}
                  disabled={savingApiKey || deletingApiKey}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 bg-white text-sm text-rose-600 font-semibold hover:bg-rose-50 hover:border-rose-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Eliminar la API Key: el asistente dejará de responder"
                >
                  <i
                    className={`bx ${deletingApiKey ? "bx-loader-alt bx-spin" : "bx-trash"}`}
                  />
                  {deletingApiKey ? "Eliminando…" : "Eliminar"}
                </button>
              )}
              <div className="ml-auto flex gap-2.5">
                <button
                  onClick={() => setShowModalApiKey(false)}
                  disabled={savingApiKey || deletingApiKey}
                  className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 font-medium hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => guardarApiKey(apiKeyInput)}
                  disabled={savingApiKey || deletingApiKey}
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
