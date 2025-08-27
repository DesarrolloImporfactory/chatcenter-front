import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import Select, { components } from "react-select";
import chatApi from "../../api/chatcenter";

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

  //controlar id_plataforma_conf para ocultar Logística si es null
  const [idPlataformaConf, setIdPlataformaConf] = useState(null);

  // Estado API Key / existencia
  const [existeAsistente, setExisteAsistente] = useState(null);
  const [showModalApiKey, setShowModalApiKey] = useState(false);

  // Logística
  const [asistenteLogistico, setAsistenteLogistico] = useState(null);
  const [nombreBotLog, setNombreBotLog] = useState("");
  const [assistantIdLog, setAssistantIdLog] = useState("");
  const [activoLog, setActivoLog] = useState(false);
  const [showModalLogistica, setShowModalLogistica] = useState(false);

  // Ventas
  const [asistenteVentas, setAsistenteVentas] = useState(null);
  const [nombreBotVenta, setNombreBotVenta] = useState("");
  const [assistantIdVenta, setAssistantIdVenta] = useState("");
  const [activoVenta, setActivoVenta] = useState(false);
  const [productosVenta, setProductosVenta] = useState("");
  const [showModalVentas, setShowModalVentas] = useState(false);

  // Productos (para IA ventas)
  const [productosLista, setProductosLista] = useState([]);

  useEffect(() => {
    const idc = localStorage.getItem("id_configuracion");
    if (idc) setId_configuracion(parseInt(idc));

    // lee y normaliza id_plataforma_conf
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
      setAsistenteLogistico(data.logistico || null);
      setAsistenteVentas(data.ventas || null);
    } catch (error) {
      console.error("Error al cargar los asistentes.", error);
      setExisteAsistente(null);
      setAsistenteLogistico(null);
      setAsistenteVentas(null);
    }
  };

  const fetchProductos = async () => {
    if (!id_configuracion) return;
    try {
      const prodRes = await chatApi.post("/productos/listarProductos", {
        id_configuracion: id_configuracion,
      });
      setProductosLista(prodRes.data.data || []);
    } catch (error) {
      console.error("No se pudo cargar la información de productos.", error);
    }
  };

  useEffect(() => {
    if (!id_configuracion) return;
    fetchAsistenteAutomatizado();
    fetchProductos();
  }, [id_configuracion]);

  /** Sincroniza estados visuales con datos del backend */
  useEffect(() => {
    if (asistenteLogistico) {
      setNombreBotLog(asistenteLogistico.nombre_bot || "");
      setAssistantIdLog(asistenteLogistico.assistant_id || "");
      setActivoLog(!!asistenteLogistico.activo);
    }
    if (asistenteVentas) {
      setNombreBotVenta(asistenteVentas.nombre_bot || "");
      setAssistantIdVenta(asistenteVentas.assistant_id || "");
      setActivoVenta(!!asistenteVentas.activo);
      setProductosVenta(asistenteVentas.productos || "");
    }
  }, [asistenteLogistico, asistenteVentas]);

  /** Select multi */
  const productosOptions = useMemo(
    () =>
      (productosLista || []).map((p) => ({
        value: String(p.id ?? p.id_producto),
        label: p.nombre,
      })),
    [productosLista]
  );

  const selectedProductos = useMemo(() => {
    if (!productosVenta || typeof productosVenta !== "string") return [];
    const ids = productosVenta
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    return productosOptions.filter((opt) => ids.includes(opt.value));
  }, [productosVenta, productosOptions]);

  const handleProductosChange = (selected) => {
    const ids = (selected || []).map((s) => s.value);
    setProductosVenta(ids.join(","));
  };

  /** Acciones */
  const guardarApiKey = async (apiKeyInput) => {
    try {
      const response = await chatApi.post(
        "openai_assistants/actualizar_api_key_openai",
        {
          id_configuracion: id_configuracion,
          api_key: apiKeyInput,
        }
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

  const guardarLogistica = async () => {
    try {
      await chatApi.post("openai_assistants/actualizar_ia_logisctica", {
        id_configuracion: id_configuracion,
        nombre_bot: nombreBotLog,
        assistant_id: assistantIdLog,
        activo: activoLog,
      });
      setShowModalLogistica(false);
      await fetchAsistenteAutomatizado();
    } catch (e) {
      console.error(e);
    }
  };

  const guardarVentas = async () => {
    try {
      await chatApi.post("openai_assistants/actualizar_ia_ventas", {
        id_configuracion: id_configuracion,
        nombre_bot: nombreBotVenta,
        assistant_id: assistantIdVenta,
        productos: selectedProductos.map((p) => p.value), // array string
        activo: activoVenta,
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
    estado ? "text-green-600 bg-green-100" : "text-red-600 bg-red-100";

  const iaLogisticaConectada = !!asistenteLogistico;
  const iaVentasConectada = !!asistenteVentas;

  // —— NUEVO: layout condicional para columnas —— //
  const showLogistica = idPlataformaConf !== null; // si hay valor -> se muestra
  const gridCols = showLogistica ? "md:grid-cols-2" : "md:grid-cols-1";

  return (
    <div className="p-5 mt-16">
      {/* —— HERO profesional —— */}
      <div className="mb-6 rounded-2xl bg-[#171931] text-white p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Asistentes IA</h1>
            <p className="opacity-90 mt-1">
              Centraliza y personaliza tus asistentes para ventas y logística.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur text-sm">
              API Key:{" "}
              <strong>
                {existeAsistente ? "Configurada" : "No configurada"}
              </strong>
            </span>
            <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur text-sm">
              Vinculación:{" "}
              <strong>
                {showLogistica ? "Imporsuit vinculada" : "Pendiente"}
              </strong>
            </span>
            <button
              onClick={() => setShowModalApiKey(true)}
              className="ml-2 bg-white text-indigo-700 hover:bg-indigo-50 transition px-3 py-1.5 rounded-lg text-sm font-semibold shadow"
            >
              {existeAsistente ? "Editar API Key" : "Añadir API Key"}
            </button>
          </div>
        </div>
      </div>

      {/* —— Getting Started (si NO hay vinculación) —— */}
      {!showLogistica && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-start gap-3">
            <div className="text-xl">🧭</div>
            <div>
              <h3 className="font-semibold">Completa tu vinculación</h3>
              <p className="text-sm mt-1">
                Para habilitar el asistente de Logística, vincula tu cuenta con
                Imporsuit en la sección <strong>Vinculaciones</strong>.
              </p>
              <a
                href="/vinculaciones"
                className="inline-block mt-2 text-amber-900 underline underline-offset-2 hover:text-amber-700"
              >
                Ir a Vinculaciones →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* —— Tarjetas —— */}
      <div className={`grid grid-cols-1 ${gridCols} gap-4`}>
        {/* IA Logística (CONDICIONAL) */}
        {showLogistica && (
          <div className="bg-white border rounded-lg shadow-md hover:shadow-lg p-6 relative">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <i className="bx bxs-bot text-3xl text-blue-600"></i>
                <div>
                  <h3 className="text-xl font-bold">
                    {asistenteLogistico?.nombre_bot || "IA de Logística"}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Automatiza seguimiento de pedidos y estados de envío.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModalLogistica(true)}
                className="p-2 rounded-full hover:bg-blue-50 transition"
                title={asistenteLogistico ? "Editar" : "Añadir"}
              >
                <i
                  className={`bx ${
                    asistenteLogistico ? "bx-edit" : "bx-plus"
                  } text-3xl text-blue-600`}
                ></i>
              </button>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${colorEstado(
                  iaLogisticaConectada
                )}`}
              >
                {estadoIA(iaLogisticaConectada)}
              </span>
              {assistantIdLog && (
                <span className="text-xs text-gray-500 border px-2 py-0.5 rounded">
                  ID: {assistantIdLog}
                </span>
              )}
            </div>

            <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
              <li>Consulta de guías y estados de envío.</li>
              <li>Respuestas automáticas sobre tiempos y rutas.</li>
              <li>Escalado a agente humano si es necesario.</li>
            </ul>
          </div>
        )}

        {/* IA Ventas */}
        <div className="bg-white border rounded-lg shadow-md hover:shadow-lg p-6 relative">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
              <i className="bx bxs-cart text-3xl text-green-600"></i>
              <div>
                <h3 className="text-xl font-bold">
                  {asistenteVentas?.nombre_bot || "IA de Ventas"}
                </h3>
                <p className="text-sm text-gray-500">
                  Ofertas, catálogo y atención pre/postventa automatizada.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowModalVentas(true)}
              className="p-2 rounded-full hover:bg-green-50 transition"
              title={asistenteVentas ? "Editar" : "Añadir"}
            >
              <i
                className={`bx ${
                  asistenteVentas ? "bx-edit" : "bx-plus"
                } text-3xl text-green-600`}
              ></i>
            </button>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${colorEstado(
                iaVentasConectada
              )}`}
            >
              {estadoIA(iaVentasConectada)}
            </span>
            {assistantIdVenta && (
              <span className="text-xs text-gray-500 border px-2 py-0.5 rounded">
                ID: {assistantIdVenta}
              </span>
            )}
          </div>

          <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
            <li>Recomendación de productos y respuestas a FAQs.</li>
            <li>Promociones y seguimiento de intención de compra.</li>
            <li>Sincronización con tu catálogo actual.</li>
          </ul>
        </div>
      </div>

      {/* —— Modales (SIN CAMBIOS) —— */}
      {showModalApiKey && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {existeAsistente ? "Editar API Key" : "Añadir API Key"}
            </h3>
            <input
              type="text"
              value={existeAsistente || ""}
              onChange={(e) => setExisteAsistente(e.target.value)}
              className="w-full border px-3 py-2 rounded mb-4"
              placeholder="Escriba su API Key"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModalApiKey(false)}
                className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={() => guardarApiKey(existeAsistente)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {showModalLogistica && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Configurar IA Logística
            </h3>

            <input
              type="text"
              placeholder="Nombre del Bot"
              value={nombreBotLog}
              onChange={(e) => setNombreBotLog(e.target.value)}
              className="w-full border px-3 py-2 rounded mb-3"
            />
            <input
              type="text"
              placeholder="Assistant ID"
              value={assistantIdLog}
              onChange={(e) => setAssistantIdLog(e.target.value)}
              className="w-full border px-3 py-2 rounded mb-3"
            />

            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={activoLog}
                onChange={(e) => setActivoLog(e.target.checked)}
              />
              <span>Activo</span>
            </label>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModalLogistica(false)}
                className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={guardarLogistica}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {showModalVentas && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Configurar IA Ventas</h3>

            <input
              type="text"
              placeholder="Nombre del Bot"
              value={nombreBotVenta}
              onChange={(e) => setNombreBotVenta(e.target.value)}
              className="w-full border px-3 py-2 rounded mb-3"
            />
            <input
              type="text"
              placeholder="Assistant ID"
              value={assistantIdVenta}
              onChange={(e) => setAssistantIdVenta(e.target.value)}
              className="w-full border px-3 py-2 rounded mb-3"
            />

            <Select
              isMulti
              options={productosOptions}
              value={selectedProductos}
              onChange={handleProductosChange}
              placeholder="Selecciona productos"
              className="w-full mb-3"
              classNamePrefix="react-select"
              menuPortalTarget={document.body}
              components={{
                Option,
                MultiValueContainer: ChipContainer,
                MultiValueLabel: () => null,
                MultiValueRemove: ChipRemove,
                IndicatorSeparator: null,
              }}
              theme={(t) => ({
                ...t,
                borderRadius: 14,
                colors: {
                  ...t.colors,
                  primary: "#4f46e5",
                  primary25: "#eef2ff",
                  neutral20: "#e5e7eb",
                  neutral30: "#4f46e5",
                },
              })}
              styles={{
                menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                control: (base, state) => ({
                  ...base,
                  minHeight: 54,
                  paddingLeft: 10,
                  paddingRight: 10,
                  borderRadius: 14,
                  borderColor: state.isFocused ? "#4f46e5" : "#e5e7eb",
                  boxShadow: state.isFocused
                    ? "0 0 0 6px rgba(79,70,229,.12)"
                    : "0 1px 2px rgba(0,0,0,.05)",
                  background: "linear-gradient(180deg,#ffffff,#fafafa)",
                  ":hover": { borderColor: "#4f46e5" },
                }),
                valueContainer: (base) => ({
                  ...base,
                  paddingTop: 8,
                  paddingBottom: 8,
                  gap: 6,
                  flexWrap: "wrap",
                }),
                placeholder: (base) => ({
                  ...base,
                  color: "#9ca3af",
                  fontSize: "0.95rem",
                }),
                menu: (base) => ({
                  ...base,
                  borderRadius: 16,
                  overflow: "hidden",
                  border: "1px solid #e5e7eb",
                  boxShadow:
                    "0 24px 48px -12px rgba(0,0,0,.25), 0 12px 24px -12px rgba(0,0,0,.15)",
                  marginTop: 10,
                  background: "linear-gradient(180deg,#ffffff,#fbfbfc)",
                }),
                menuList: (base) => ({
                  ...base,
                  padding: 8,
                  "::-webkit-scrollbar": { width: 8 },
                  "::-webkit-scrollbar-thumb": {
                    backgroundColor: "#e5e7eb",
                    borderRadius: 999,
                  },
                }),
                option: (base, state) => ({
                  ...base,
                  padding: "10px 14px",
                  borderRadius: 10,
                  margin: "2px 6px",
                  backgroundColor: state.isSelected
                    ? "#e0e7ff"
                    : state.isFocused
                    ? "#f3f4f6"
                    : "transparent",
                  color: "#111827",
                  cursor: "pointer",
                  transition: "background-color .15s ease, transform .05s ease",
                  transform: state.isFocused ? "translateY(-1px)" : "none",
                }),
                multiValue: (base) => ({
                  ...base,
                  background: "transparent",
                  display: "flex",
                  alignItems: "center",
                }),
                multiValueRemove: (base) => ({
                  ...base,
                  padding: 0,
                  ":hover": { backgroundColor: "transparent" },
                }),
                dropdownIndicator: (base, state) => ({
                  ...base,
                  padding: 8,
                  transform: state.selectProps.menuIsOpen
                    ? "rotate(180deg)"
                    : undefined,
                  transition: "transform .2s ease",
                }),
                clearIndicator: (base) => ({
                  ...base,
                  padding: 8,
                  ":hover": { color: "#ef4444" },
                }),
              }}
            />

            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={activoVenta}
                onChange={(e) => setActivoVenta(e.target.checked)}
              />
              <span>Activo</span>
            </label>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModalVentas(false)}
                className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={guardarVentas}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
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
