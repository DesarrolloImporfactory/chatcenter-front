import Select from "react-select";
import { useMemo, useState } from "react";

// ——— Utils de texto ———
const normalizeSpaces = (s = "") => String(s).replace(/\s+/g, " ").trim();

const toTitleCaseEs = (str = "") => {
  const ex = new Set([
    "de",
    "del",
    "la",
    "las",
    "el",
    "los",
    "y",
    "e",
    "o",
    "u",
    "en",
    "al",
    "a",
    "con",
    "por",
    "para",
  ]);
  const words = str.toLowerCase().split(" ");
  return words
    .map((w, i) =>
      i > 0 && ex.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)
    )
    .join(" ");
};

const formatNombreCliente = (nombre = "") => {
  const s = normalizeSpaces(nombre);
  // Si viene todo en mayúsculas y contiene letras, lo pasamos a Title Case
  const hasLetters = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(s);
  if (hasLetters && s === s.toUpperCase()) return toTitleCaseEs(s);
  return s;
};

export const Sidebar = ({
  setSearchTerm,
  setNumeroModal,
  handleSelectChat,
  acortarTexto,
  filteredChats,
  searchTerm,
  selectedChat,
  chatTemporales,
  formatFecha,
  setFiltro_chats,
  filtro_chats,
  handleFiltro_chats,
  setSearchTermEtiqueta,
  searchTermEtiqueta,
  etiquetas_api,
  selectedEtiquetas,
  setSelectedEtiquetas,
  handleChange,
  etiquetasOptions,
  selectedEstado,
  setSelectedEstado,
  selectedTransportadora,
  setSelectedTransportadora,
  setSelectedNovedad,
  selectedNovedad,
  Loading,
  validar_estadoLaar,
  validar_estadoServi,
  validar_estadoGintracom,
  validar_estadoSpeed,
  selectedTab,
  setSelectedTab,
  mensajesAcumulados,
  mensajesVisibles,
  setMensajesVisibles,
  scrollRef,
  handleScrollMensajes,
  id_plataforma_conf,
  setSelectedPedidos_confirmados,
  selectedPedidos_confirmados,
}) => {
  // —— Estilos consistentes para react-select ———————————————————————
  const selectStyles = useMemo(
    () => ({
      control: (base, state) => ({
        ...base,
        borderRadius: 12,
        borderColor: state.isFocused ? "#2563eb" : "#e5e7eb",
        boxShadow: state.isFocused
          ? "0 0 0 4px rgba(37, 99, 235, .15)"
          : "none",
        minHeight: 44,
        ":hover": { borderColor: state.isFocused ? "#2563eb" : "#cbd5e1" },
      }),
      menu: (base) => ({ ...base, borderRadius: 12, overflow: "hidden" }),
      option: (base, { isFocused, isSelected }) => ({
        ...base,
        backgroundColor: isSelected
          ? "#2563eb"
          : isFocused
          ? "#eff6ff"
          : undefined,
        color: isSelected ? "#fff" : "#0f172a",
      }),
      multiValue: (base) => ({
        ...base,
        borderRadius: 9999,
        backgroundColor: "#eef2ff",
      }),
      multiValueLabel: (base) => ({
        ...base,
        color: "#1e293b",
        fontWeight: 600,
      }),
      multiValueRemove: (base) => ({
        ...base,
        ":hover": { backgroundColor: "#dbeafe", color: "#0f172a" },
      }),
      placeholder: (base) => ({ ...base, color: "#64748b" }),
      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    }),
    []
  );

  // —— Chips de filtros activos ————————————————————————————————
  const FilterChip = ({ label, onClear }) => (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
      title="Quitar filtro"
    >
      <i className="bx bx-filter-alt text-sm" />
      {label}
      <i className="bx bx-x text-base" />
    </button>
  );

  // —— Estado/Badge de guía unificado ————————————————————————————
  const obtenerEstadoGuia = (transporte, estadoFactura, novedadInfo) => {
    let estado_guia = { color: "", estado_guia: "" };

    switch (transporte) {
      case "LAAR":
        estado_guia = validar_estadoLaar(estadoFactura);
        break;
      case "SERVIENTREGA":
        estado_guia = validar_estadoServi(estadoFactura);
        break;
      case "GINTRACOM":
        estado_guia = validar_estadoGintracom(estadoFactura);
        break;
      case "SPEED":
        estado_guia = validar_estadoSpeed(estadoFactura);
        break;
      default:
        estado_guia = { color: "", estado_guia: "" };
        break;
    }

    // Ajuste cuando hay novedad resuelta
    if (estado_guia.estado_guia === "Novedad") {
      try {
        const parsed =
          typeof novedadInfo === "string"
            ? JSON.parse(novedadInfo)
            : novedadInfo;
        if (parsed?.terminado === 1 || parsed?.solucionada === 1) {
          estado_guia = {
            estado_guia: "Novedad resuelta",
            color: "bg-yellow-500",
          };
        }
      } catch (err) {
        console.error("Error al parsear novedad_info:", err);
      }
    }

    return estado_guia;
  };

  const [channelFilter, setChannelFilter] = useState("all");

  return (
    <aside
      ref={scrollRef}
      onScroll={handleScrollMensajes}
      className={`h-[calc(100vh_-_130px)] overflow-y-auto overflow-x-hidden ${
        selectedChat ? "hidden sm:block" : "block"
      }`}
    >
      {/* Contenedor principal */}
      <div className="ml-3 mr-0 my-3 rounded-2xl border border-slate-200 bg-white shadow-sm min-h-full">
        {/* Header pegajoso con tabs + búsqueda/acciones */}
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          {/* Tabs */}
          <div className="flex items-center justify-between px-4 pt-4">
            <div className="inline-flex w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 p-1">
              <button
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  selectedTab === "abierto"
                    ? "bg-white text-slate-900 shadow"
                    : "text-slate-500 hover:text-slate-700"
                }`}
                onClick={() => setSelectedTab("abierto")}
              >
                <i className="bx bx-download mr-2 align-[-2px]" /> ABIERTO
              </button>
              <button
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  selectedTab === "resueltos"
                    ? "bg-white text-slate-900 shadow"
                    : "text-slate-500 hover:text-slate-700"
                }`}
                onClick={() => setSelectedTab("resueltos")}
              >
                <i className="bx bx-check mr-2 align-[-2px]" /> RESUELTOS
              </button>
            </div>
          </div>

          {/* Toolbar en dos filas (más respiro visual) */}
          <div className="px-4 py-3 space-y-3">
            {/* Fila 1: Búsqueda */}
            <div className="relative w-full">
              <i className="bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o número de teléfono.."
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-10 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Buscar chats"
              />
              {searchTerm?.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  title="Limpiar búsqueda"
                >
                  <i className="bx bx-x text-lg" />
                </button>
              )}
            </div>

            {/* Fila 2: Acciones (izq) + Canal (der) */}
            <div className="flex items-center gap-3 w-full">
              {/* Selector de canal (responsive, no desborda) */}
              <details className="relative ml-auto shrink-0">
                <summary
                  className="list-none inline-flex w-[199px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer select-none"
                  title="Filtrar por canal"
                  onClick={(e) => e.stopPropagation()} // evita interferencia con clicks cercanos
                >
                  {/* Ícono dinámico según canal seleccionado */}
                  {(() => {
                    if (channelFilter === "wa") {
                      return (
                        <i className="bx bxl-whatsapp text-lg text-green-600 shrink-0" />
                      );
                    }
                    if (channelFilter === "ms") {
                      return (
                        <i className="bx bxl-messenger text-lg text-blue-600 shrink-0" />
                      );
                    }
                    if (channelFilter === "ig") {
                      return (
                        <i className="bx bxl-instagram text-lg text-pink-500 shrink-0" />
                      );
                    }
                    return (
                      <i className="bx bx-layout text-lg text-slate-600 shrink-0" />
                    );
                  })()}

                  {/* Texto visible también en móvil, truncable */}
                  <span className="flex-1 min-w-0 whitespace-nowrap truncate">
                    <span className="font-bold">
                      {channelFilter === "wa"
                        ? "WhatsApp"
                        : channelFilter === "ms"
                        ? "Messenger"
                        : channelFilter === "ig"
                        ? "Instagram"
                        : "Todos los canales"}
                    </span>
                  </span>

                  {/* Chevron */}
                  <i className="bx bx-chevron-down text-lg ml-1 shrink-0" />
                </summary>

                {/* Menú con ancho fijo y sin desbordar en viewport */}
                <div className="absolute right-0 mt-2 w-[199px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg ring-1 ring-black/5 z-30">
                  <button
                    className={`flex w-full items-center gap-2 px-3 py-2 text-sm ${
                      channelFilter === "all"
                        ? "bg-slate-100 text-slate-900"
                        : "hover:bg-slate-50"
                    }`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setChannelFilter("all");
                      const d = e.currentTarget.closest("details");
                      if (d) d.open = false;
                    }}
                  >
                    <i className="bx bx-layout text-base text-slate-500" />
                    Todos los canales
                  </button>

                  <button
                    className={`flex w-full items-center gap-2 px-3 py-2 text-sm ${
                      channelFilter === "wa"
                        ? "bg-slate-100 text-slate-900"
                        : "hover:bg-slate-50"
                    }`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setChannelFilter("wa");
                      const d = e.currentTarget.closest("details");
                      if (d) d.open = false;
                    }}
                  >
                    <i className="bx bxl-whatsapp text-base text-green-600" />
                    WhatsApp
                  </button>

                  <button
                    className={`flex w-full items-center gap-2 px-3 py-2 text-sm ${
                      channelFilter === "ms"
                        ? "bg-slate-100 text-slate-900"
                        : "hover:bg-slate-50"
                    }`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setChannelFilter("ms");
                      const d = e.currentTarget.closest("details");
                      if (d) d.open = false;
                    }}
                  >
                    <i className="bx bxl-messenger text-base text-blue-600" />
                    Messenger
                  </button>

                  <button
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-sm ${
                      channelFilter === "ig"
                        ? "bg-slate-100 text-slate-900"
                        : "hover:bg-slate-50"
                    }`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setChannelFilter("ig");
                      const d = e.currentTarget.closest("details");
                      if (d) d.open = false;
                    }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <i className="bx bxl-instagram text-base text-pink-500" />
                      Instagram
                    </span>
                  </button>
                </div>
              </details>

              <button
                onClick={(e) => {
                  e.stopPropagation(); // evita que interfiera con el <details> de al lado
                  handleFiltro_chats();
                }}
                aria-pressed={!!filtro_chats}
                className={`relative inline-flex h-11 items-center rounded-xl border px-3 text-slate-700 shadow-sm transition ${
                  filtro_chats
                    ? "border-blue-200 bg-blue-50 hover:bg-blue-100"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
                title="Mostrar filtros"
                aria-controls="sidebar-filtros"
              >
                <i className="bx bx-filter-alt text-xl" />
                <span className="ml-2 hidden text-sm md:inline font-bold">
                  Filtros
                </span>
              </button>
              <button
                onClick={() => setNumeroModal(true)}
                className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-3 text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
                title="Nuevo chat"
                aria-label="Nuevo chat"
              >
                <i className="bx bx-plus text-xl" />
              </button>
            </div>
          </div>

          {/* Panel de filtros (colapsable) */}
          <div
            id="sidebar-filtros"
            className={`grid gap-3 px-4 pb-4 transition-all duration-300 ${
              filtro_chats
                ? "max-h-[600px] opacity-100"
                : "max-h-0 overflow-hidden opacity-0"
            }`}
          >
            {/* Pedidos Confirmados */}
            {id_plataforma_conf !== null && (
              <Select
                isClearable
                options={[
                  { value: "1", label: "Pedidos confirmados" },
                  { value: "0", label: "Pedidos no confirmados" },
                ]}
                value={selectedPedidos_confirmados}
                onChange={(opt) => setSelectedPedidos_confirmados(opt)}
                placeholder="Seleccione pedidos confirmados"
                className="w-full"
                classNamePrefix="react-select"
                menuPortalTarget={document.body}
                styles={selectStyles}
              />
            )}
            {/* Etiquetas */}
            <Select
              isMulti
              options={etiquetasOptions}
              value={selectedEtiquetas}
              onChange={handleChange}
              placeholder="Selecciona etiquetas"
              className="w-full"
              classNamePrefix="react-select"
              menuPortalTarget={document.body}
              styles={selectStyles}
            />

            {/* Novedad (si hay plataforma) */}
            {id_plataforma_conf !== null && (
              <Select
                isClearable
                options={[
                  { value: "gestionadas", label: "Gestionadas" },
                  { value: "no_gestionadas", label: "No gestionadas" },
                ]}
                value={selectedNovedad}
                onChange={(opt) => setSelectedNovedad(opt)}
                placeholder="Selecciona novedad"
                className="w-full"
                classNamePrefix="react-select"
                menuPortalTarget={document.body}
                styles={selectStyles}
              />
            )}

            {/* Transportadora */}
            {id_plataforma_conf !== null && (
              <Select
                isClearable
                options={[
                  { value: "LAAR", label: "Laar" },
                  { value: "SPEED", label: "Speed" },
                  { value: "SERVIENTREGA", label: "Servientrega" },
                  { value: "GINTRACOM", label: "Gintracom" },
                ]}
                value={selectedTransportadora}
                onChange={(opt) => {
                  setSelectedTransportadora(opt);
                  if (!opt) setSelectedEstado([]);
                }}
                placeholder="Selecciona transportadora"
                className="w-full"
                classNamePrefix="react-select"
                menuPortalTarget={document.body}
                styles={selectStyles}
              />
            )}

            {/* Estado (solo visible con transportadora) */}
            {selectedTransportadora && (
              <Select
                isClearable
                options={[
                  { value: "Generada", label: "Generada / Por recolectar" },
                  {
                    value: "En transito",
                    label: "En tránsito / Procesamiento / En ruta",
                  },
                  { value: "Entregada", label: "Entregada" },
                  { value: "Novedad", label: "Novedad" },
                  { value: "Devolucion", label: "Devolución" },
                ]}
                value={selectedEstado}
                onChange={(opt) => setSelectedEstado(opt)}
                placeholder="Selecciona estado"
                className="w-full"
                classNamePrefix="react-select"
                menuPortalTarget={document.body}
                styles={selectStyles}
              />
            )}

            {/* Chips de filtros activos */}
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {Array.isArray(selectedEtiquetas) &&
                selectedEtiquetas.length > 0 &&
                selectedEtiquetas.map((e) => (
                  <FilterChip
                    key={e.value}
                    label={`Etiqueta: ${e.label}`}
                    onClear={() => {
                      const next = selectedEtiquetas.filter(
                        (x) => x.value !== e.value
                      );
                      setSelectedEtiquetas(next);
                    }}
                  />
                ))}

              {selectedNovedad && (
                <FilterChip
                  label={`Novedad: ${selectedNovedad.label}`}
                  onClear={() => setSelectedNovedad(null)}
                />
              )}

              {selectedTransportadora && (
                <FilterChip
                  label={`Transp.: ${selectedTransportadora.label}`}
                  onClear={() => {
                    setSelectedTransportadora(null);
                    setSelectedEstado([]);
                  }}
                />
              )}

              {selectedEstado && selectedEstado.label && (
                <FilterChip
                  label={`Estado: ${selectedEstado.label}`}
                  onClear={() => setSelectedEstado(null)}
                />
              )}

              {Array.isArray(selectedEtiquetas) &&
                selectedEtiquetas.length +
                  (selectedNovedad ? 1 : 0) +
                  (selectedTransportadora ? 1 : 0) +
                  (selectedEstado ? 1 : 0) >
                  0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEtiquetas([]);
                      setSelectedNovedad(null);
                      setSelectedTransportadora(null);
                      setSelectedEstado([]);
                    }}
                    className="ml-auto inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    Limpiar filtros <i className="bx bx-eraser" />
                  </button>
                )}
            </div>
          </div>
        </div>

        {/* Lista de chats */}
        <ul className="divide-y divide-slate-100 flex-1">
          {(() => {
            // Filtra por canal: 'wa' | 'ms' | 'ig' | 'all'
            const list =
              channelFilter === "ms"
                ? filteredChats.filter((c) => c.source === "ms")
                : channelFilter === "wa"
                ? filteredChats.filter((c) => c.source !== "ms")
                : channelFilter === "ig"
                ? [] // sin IG aún
                : filteredChats;

            if (channelFilter === "ig") {
              return (
                <div className="flex h-64 flex-col items-center justify-center gap-2 text-slate-500">
                  <i className="bx bxl-instagram text-4xl text-pink-500/70" />
                  <p className="text-sm font-semibold">Instagram</p>
                  <p className="text-xs">¡Próximamente en este panel!</p>
                </div>
              );
            }

            if (list.length === 0) {
              return mensajesAcumulados.length === 0 ? (
                <div className="flex h-64 items-center justify-center">
                  {Loading ? (
                    <Loading />
                  ) : (
                    <div className="text-slate-500">Cargando…</div>
                  )}
                </div>
              ) : (
                <div className="flex h-64 flex-col items-center justify-center gap-2 text-slate-500">
                  <i className="bx bx-chat text-4xl" />
                  <p className="text-sm">
                    No se encontraron chats con esos filtros.
                  </p>
                </div>
              );
            }

            return list.slice(0, mensajesVisibles).map((mensaje) => {
              const { color, estado_guia } = obtenerEstadoGuia(
                mensaje.transporte,
                mensaje.estado_factura,
                mensaje.novedad_info
              );
              const seleccionado = selectedChat === mensaje;

              return (
                <li
                  key={mensaje.id}
                  onClick={() => {
                    if (!seleccionado) {
                      handleSelectChat(mensaje);
                    }
                  }}
                  className={`group relative cursor-pointer px-3 py-2 transition hover:bg-slate-50 sm:px-4 ${
                    seleccionado
                      ? "bg-slate-50 cursor-default" // cambiamos cursor para indicar que ya no se puede
                      : mensaje.pedido_confirmado === 1
                      ? "bg-green-300"
                      : "bg-white"
                  }`}
                >
                  <div className="grid grid-cols-[3rem_1fr_auto] grid-rows-[auto_auto] items-center gap-x-3">
                    {/* Avatar */}
                    <div
                      className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring-2 row-span-2 col-[1] ${
                        mensaje.mensajes_pendientes > 0
                          ? "ring-blue-500"
                          : "ring-slate-200"
                      }`}
                    >
                      <img
                        src={
                          mensaje.profile_pic_url
                            ? mensaje.profile_pic_url
                            : "https://tiendas.imporsuitpro.com/imgs/react/user.png"
                        }
                        alt="Avatar"
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>

                    {/* Nombre */}
                    <div className="min-w-0 col-[2] flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-slate-900">
                        {acortarTexto(
                          formatNombreCliente(mensaje.nombre_cliente),
                          10,
                          25
                        )}
                      </span>
                    </div>

                    {/* Lateral derecho */}
                    <div className="col-[3] row-[1] flex shrink-0 flex-col items-end gap-1">
                      {estado_guia && (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white ${
                            color || "bg-slate-400"
                          }`}
                          title={`Estado: ${estado_guia}`}
                        >
                          {estado_guia}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500">
                        {formatFecha(mensaje.mensaje_created_at)}
                      </span>
                      {mensaje.mensajes_pendientes > 0 && (
                        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1 text-[11px] font-semibold text-white">
                          {mensaje.mensajes_pendientes}
                        </span>
                      )}
                    </div>

                    {/* Teléfono + preview */}
                    <div className="col-[2/4] min-w-0 flex items-center gap-2 text-xs text-slate-500">
                      <span
                        className="whitespace-nowrap"
                        title={mensaje.celular_cliente}
                      >
                        {mensaje.source === "ms"
                          ? "Facebook"
                          : mensaje.celular_cliente}
                      </span>

                      {mensaje.source === "ms" && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                          <i className="bx bxl-messenger mr-1 text-base" />
                          Messenger
                        </span>
                      )}

                      <span className="select-none text-slate-300">•</span>

                      <span className="truncate" title={mensaje.texto_mensaje}>
                        {mensaje.texto_mensaje?.length > chatTemporales
                          ? mensaje.texto_mensaje.includes("{{") &&
                            mensaje.ruta_archivo
                            ? (() => {
                                try {
                                  const valores = JSON.parse(
                                    mensaje.ruta_archivo
                                  );
                                  const txt = mensaje.texto_mensaje.replace(
                                    /\{\{(.*?)\}\}/g,
                                    (m, key) => valores[key.trim()] || m
                                  );
                                  return `${txt.substring(0, chatTemporales)}…`;
                                } catch (e) {
                                  return `${mensaje.texto_mensaje.substring(
                                    0,
                                    chatTemporales
                                  )}…`;
                                }
                              })()
                            : `${mensaje.texto_mensaje.substring(
                                0,
                                chatTemporales
                              )}…`
                          : mensaje.texto_mensaje}
                      </span>
                    </div>
                  </div>
                </li>
              );
            });
          })()}

          {/* Loader "cargando más" respetando el filtro de canal */}
          {mensajesVisibles <
            (channelFilter === "ms"
              ? filteredChats.filter((c) => c.source === "ms").length
              : channelFilter === "wa"
              ? filteredChats.filter((c) => c.source !== "ms").length
              : channelFilter === "ig"
              ? 0
              : filteredChats.length) && (
            <div className="flex justify-center py-4">
              <span className="animate-pulse text-sm text-slate-500">
                Cargando más chats…
              </span>
            </div>
          )}
        </ul>
      </div>
    </aside>
  );
};
