import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";

const StatusBadge = ({ recuperado }) => {
  if (recuperado === 1) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <i className="bx bx-check-circle" /> Recuperado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
      <i className="bx bx-time-five" /> Pendiente
    </span>
  );
};

const SourceBadge = ({ source }) => {
  const map = {
    releasit_form: {
      label: "Releasit",
      color: "bg-purple-50 text-purple-700 border-purple-200",
    },
    shopify_checkout: {
      label: "Shopify",
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    custom_landing: {
      label: "Landing",
      color: "bg-blue-50 text-blue-700 border-blue-200",
    },
  };
  const cfg = map[source] || map.shopify_checkout;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${cfg.color}`}
    >
      {cfg.label}
    </span>
  );
};

// Parser seguro: si line_items/shipping_address vienen como string desde BD, los parsea
const safeJsonParse = (val, fallback = null) => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "object") return val; // ya es objeto/array
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }
  return fallback;
};

const formatFecha = (fecha) => {
  if (!fecha) return "—";
  const d = new Date(fecha);
  return d.toLocaleString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatMoney = (val, currency = "USD") => {
  const num = parseFloat(val) || 0;
  return `${currency} ${num.toFixed(2)}`;
};

const CarritosAbandonados = () => {
  const navigate = useNavigate();
  const [id_configuracion, setId_configuracion] = useState(null);

  // estado integración shopify
  const [hasShopifyConfig, setHasShopifyConfig] = useState(null); // null = checking

  // data
  const [carritos, setCarritos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  // filtros
  const [filterRecuperado, setFilterRecuperado] = useState("all"); // all | 0 | 1
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // paginación
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // detalle
  const [detalleCarrito, setDetalleCarrito] = useState(null);

  /* ============== Inicialización ============== */
  useEffect(() => {
    const idc = localStorage.getItem("id_configuracion");
    if (idc) setId_configuracion(parseInt(idc, 10));
  }, []);

  /* ============== Verificar integración ============== */
  useEffect(() => {
    if (!id_configuracion) return;
    const check = async () => {
      try {
        const res = await chatApi.get("shopify_configuraciones", {
          params: { id_configuracion },
        });
        const list = res?.data?.data ?? [];
        setHasShopifyConfig(list.length > 0);
      } catch {
        setHasShopifyConfig(false);
      }
    };
    check();
  }, [id_configuracion]);

  /* ============== Fetch estadísticas ============== */
  const fetchStats = useCallback(async () => {
    if (!id_configuracion) return;
    try {
      const res = await chatApi.get(
        "shopify_carritos_abandonados/estadisticas",
        { params: { id_configuracion } },
      );
      setStats(res?.data?.data ?? null);
    } catch (err) {
      console.error("Error stats:", err);
    }
  }, [id_configuracion]);

  /* ============== Fetch carritos ============== */
  const fetchCarritos = useCallback(async () => {
    if (!id_configuracion) return;
    setLoading(true);
    try {
      const res = await chatApi.get("shopify_carritos_abandonados", {
        params: {
          id_configuracion,
          recuperado: filterRecuperado === "all" ? undefined : filterRecuperado,
          search: search || undefined,
          page,
          limit,
        },
      });
      setCarritos(res?.data?.data ?? []);
      setTotalPages(res?.data?.pagination?.totalPages ?? 1);
      setTotal(res?.data?.pagination?.total ?? 0);
    } catch (err) {
      const msg = err?.response?.data?.message || "Error al cargar carritos";
      Swal.fire({ icon: "error", title: "Error", text: msg });
    } finally {
      setLoading(false);
    }
  }, [id_configuracion, filterRecuperado, search, page]);

  useEffect(() => {
    if (hasShopifyConfig) {
      fetchCarritos();
      fetchStats();
    }
  }, [fetchCarritos, fetchStats, hasShopifyConfig]);

  /* ============== Search con Enter ============== */
  const handleSearch = () => {
    setSearch(searchInput.trim());
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  /* ============== Cambiar filtro tab ============== */
  const handleFilterChange = (val) => {
    setFilterRecuperado(val);
    setPage(1);
  };

  /* ============== Acciones ============== */
  const handleEnviarWhatsapp = async (carrito) => {
    if (!carrito.phone_normalizado) {
      Swal.fire({
        icon: "warning",
        title: "Sin teléfono",
        text: "Este carrito no tiene un teléfono válido.",
      });
      return;
    }

    const nombre = carrito.nombre_cliente || "Hola";
    const productos = safeJsonParse(carrito.line_items, [])
      .map((p) => p.title)
      .filter(Boolean)
      .join(", ");
    const recoveryUrl = carrito.abandoned_checkout_url || "";

    const mensaje = `¡Hola ${nombre}! 👋

Vi que estabas interesado/a en ${productos || "uno de nuestros productos"} y no pudiste completar tu compra.

Tu carrito sigue disponible aquí 👇
${recoveryUrl}

¿Te ayudo con algo? 😊`;

    const url = `https://wa.me/${carrito.phone_normalizado}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");

    // Marcar como mensaje enviado
    try {
      await chatApi.patch(
        `shopify_carritos_abandonados/${carrito.id}/marcar-mensaje-enviado`,
      );
      fetchCarritos();
      fetchStats();
    } catch (err) {
      console.error("Error al marcar mensaje:", err);
    }
  };

  const handleVerCarrito = (carrito) => {
    if (carrito.abandoned_checkout_url) {
      window.open(carrito.abandoned_checkout_url, "_blank");
    }
  };

  const copiarUrl = (url) => {
    navigator.clipboard.writeText(url);
    Swal.fire({
      icon: "success",
      title: "URL copiada",
      timer: 1000,
      showConfirmButton: false,
      toast: true,
      position: "top-end",
    });
  };

  /* ============== Sin integración ============== */
  if (hasShopifyConfig === false) {
    return (
      <div className="p-5">
        <div className="rounded-2xl bg-[#171931] text-white p-6 shadow-lg">
          <h1 className="text-2xl md:text-3xl font-bold">
            Carritos abandonados
          </h1>
        </div>

        <div className="mt-6 bg-white rounded-2xl p-12 shadow-md text-center">
          <i className="bx bx-plug text-6xl text-gray-300 mb-4 inline-block" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Primero conecta tu tienda Shopify
          </h2>
          <p className="text-gray-600 mb-6">
            Necesitas configurar la integración con Shopify antes de ver los
            carritos abandonados.
          </p>
          <button
            onClick={() => navigate("/shopify")}
            className="bg-[#171931] text-white font-semibold px-6 py-3 rounded-lg hover:opacity-95 transition"
          >
            Ir a configuración de Shopify →
          </button>
        </div>
      </div>
    );
  }

  /* ============== Render ============== */
  return (
    <div className="p-5">
      {/* HERO */}
      <div className="mb-6 rounded-2xl bg-[#171931] text-white p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Carritos abandonados
            </h1>
            <p className="opacity-90 mt-1 text-sm">
              Recupera ventas que estaban casi cerradas.
            </p>
          </div>

          <button
            onClick={() => {
              fetchCarritos();
              fetchStats();
            }}
            disabled={loading}
            className="bg-white text-[#171931] hover:bg-gray-50 transition px-4 py-2 rounded-lg text-sm font-semibold shadow disabled:opacity-50 inline-flex items-center gap-2"
          >
            <i
              className={`bx bx-refresh text-lg ${loading ? "animate-spin" : ""}`}
            />
            {loading ? "Cargando..." : "Refrescar"}
          </button>
        </div>
      </div>

      {/* STATS */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-semibold">
              <i className="bx bx-cart text-lg" /> Total
            </div>
            <div className="text-2xl font-bold text-gray-800 mt-1">
              {stats.total}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {formatMoney(stats.valor_total)}
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-100">
            <div className="flex items-center gap-2 text-amber-600 text-xs uppercase font-semibold">
              <i className="bx bx-time-five text-lg" /> Pendientes
            </div>
            <div className="text-2xl font-bold text-amber-700 mt-1">
              {stats.pendientes}
            </div>
            <div className="text-xs text-amber-500 mt-1">
              {formatMoney(stats.valor_pendiente)} en juego
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-emerald-100">
            <div className="flex items-center gap-2 text-emerald-600 text-xs uppercase font-semibold">
              <i className="bx bx-check-circle text-lg" /> Recuperados
            </div>
            <div className="text-2xl font-bold text-emerald-700 mt-1">
              {stats.recuperados}
            </div>
            <div className="text-xs text-emerald-500 mt-1">
              {formatMoney(stats.valor_recuperado)}
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100">
            <div className="flex items-center gap-2 text-blue-600 text-xs uppercase font-semibold">
              <i className="bx bx-line-chart text-lg" /> Tasa
            </div>
            <div className="text-2xl font-bold text-blue-700 mt-1">
              {stats.tasa_recuperacion}%
            </div>
            <div className="text-xs text-blue-500 mt-1">de recuperación</div>
          </div>
        </div>
      )}

      {/* FILTROS */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          {/* Tabs estado */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {[
              { value: "all", label: "Todos" },
              { value: "0", label: "Pendientes" },
              { value: "1", label: "Recuperados" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleFilterChange(tab.value)}
                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition ${
                  filterRecuperado === tab.value
                    ? "bg-white text-[#171931] shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Búsqueda */}
          <div className="flex gap-2 flex-1 md:max-w-md">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Buscar por teléfono, email o nombre..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#171931]"
              />
              <i className="bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
              {searchInput && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  <i className="bx bx-x text-lg" />
                </button>
              )}
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-[#171931] text-white rounded-lg text-sm font-semibold hover:opacity-95 transition"
            >
              Buscar
            </button>
          </div>
        </div>
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading && carritos.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <i className="bx bx-loader-alt animate-spin text-4xl" />
            <p className="mt-2">Cargando carritos...</p>
          </div>
        ) : carritos.length === 0 ? (
          <div className="p-12 text-center">
            <i className="bx bx-cart text-5xl text-gray-300 mb-3 inline-block" />
            <h3 className="text-lg font-semibold text-gray-700">
              {search || filterRecuperado !== "all"
                ? "No hay resultados con esos filtros"
                : "Aún no hay carritos abandonados"}
            </h3>
            <p className="text-gray-500 text-sm mt-1">
              {search || filterRecuperado !== "all"
                ? "Intenta cambiar los filtros."
                : "Cuando un cliente abandone su carrito, aparecerá aquí."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left text-xs font-semibold text-gray-600 uppercase">
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {carritos.map((c) => {
                    const productos = safeJsonParse(c.line_items, []);
                    const primerProducto = productos[0];
                    const masProductos = productos.length - 1;

                    return (
                      <tr key={c.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#171931] to-indigo-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                              {(c.nombre_cliente?.[0] || "?").toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-gray-800 truncate flex items-center gap-2">
                                {c.nombre_cliente || "Sin nombre"}{" "}
                                {c.apellido_cliente || ""}
                                <SourceBadge source={c.source} />
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {c.phone_normalizado
                                  ? `+${c.phone_normalizado}`
                                  : c.email || "—"}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          {primerProducto ? (
                            <div>
                              <div className="text-gray-700 truncate max-w-[200px]">
                                {primerProducto.title}
                              </div>
                              {masProductos > 0 && (
                                <div className="text-xs text-gray-400">
                                  + {masProductos} más
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3 font-semibold text-gray-800">
                          {formatMoney(c.total_price, c.currency)}
                        </td>

                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {formatFecha(c.shopify_created_at || c.created_at)}
                          {c.mensaje_enviado === 1 && (
                            <div className="text-[10px] text-blue-600 mt-0.5 flex items-center gap-1">
                              <i className="bx bxl-whatsapp" /> Mensaje enviado
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <StatusBadge recuperado={c.recuperado} />
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {c.recuperado === 0 && c.phone_normalizado && (
                              <button
                                onClick={() => handleEnviarWhatsapp(c)}
                                title="Enviar WhatsApp"
                                className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                              >
                                <i className="bx bxl-whatsapp text-lg" />
                              </button>
                            )}

                            {c.abandoned_checkout_url && (
                              <button
                                onClick={() => handleVerCarrito(c)}
                                title="Abrir carrito en Shopify"
                                className="p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                              >
                                <i className="bx bx-link-external text-lg" />
                              </button>
                            )}

                            <button
                              onClick={() => setDetalleCarrito(c)}
                              title="Ver detalle"
                              className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                            >
                              <i className="bx bx-show text-lg" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <div className="text-xs text-gray-600">
                  Página {page} de {totalPages} • {total} carritos en total
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 rounded-lg bg-white border text-sm disabled:opacity-50 hover:bg-gray-100 transition"
                  >
                    ← Anterior
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 rounded-lg bg-white border text-sm disabled:opacity-50 hover:bg-gray-100 transition"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL DETALLE */}
      {detalleCarrito && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-3"
          onClick={() => setDetalleCarrito(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setDetalleCarrito(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-xl"
            >
              <i className="bx bx-x text-2xl" />            </button>

            <h2 className="text-xl font-bold text-gray-800 mb-1 flex items-center gap-2">
              Detalle del carrito
              <SourceBadge source={detalleCarrito.source} />
            </h2>
            <p className="text-xs text-gray-500 mb-4 font-mono">
              {detalleCarrito.checkout_token}
            </p>

            <div className="space-y-4">
              {/* Cliente */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">
                  Cliente
                </h3>
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <div className="font-semibold text-gray-800">
                    {detalleCarrito.nombre_cliente}{" "}
                    {detalleCarrito.apellido_cliente}
                  </div>
                  {detalleCarrito.phone_normalizado && (
                    <div className="text-gray-600 mt-1">
                      <i className="bx bx-phone align-middle mr-1" />+{detalleCarrito.phone_normalizado}
                    </div>
                  )}
                  {detalleCarrito.email && (
                    <div className="text-gray-600 mt-1">
                      <i className="bx bx-envelope align-middle mr-1" />{detalleCarrito.email}
                    </div>
                  )}
                </div>
              </div>

              {/* Productos */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">
                  Productos
                </h3>
                <div className="space-y-2">
                  {safeJsonParse(detalleCarrito.line_items, []).map(
                    (item, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center bg-gray-50 rounded-lg p-3 text-sm"
                      >
                        <div>
                          <div className="font-semibold text-gray-800">
                            {item.title}
                          </div>
                          <div className="text-xs text-gray-500">
                            Cantidad: {item.quantity} • SKU: {item.sku || "—"}
                          </div>
                        </div>
                        <div className="font-semibold text-gray-800">
                          {formatMoney(
                            parseFloat(item.price) * item.quantity,
                            detalleCarrito.currency,
                          )}
                        </div>
                      </div>
                    ),
                  )}
                </div>
                <div className="flex justify-end mt-2 text-sm font-bold text-gray-800">
                  Total:{" "}
                  {formatMoney(
                    detalleCarrito.total_price,
                    detalleCarrito.currency,
                  )}
                </div>
              </div>

              {/* Dirección */}
              {(() => {
                const addr = safeJsonParse(detalleCarrito.shipping_address);
                if (!addr) return null;
                return (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">
                      Dirección de envío
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                      {addr.address1}
                      {addr.city && `, ${addr.city}`}
                      {addr.province && `, ${addr.province}`}
                      {addr.country && ` (${addr.country})`}
                    </div>
                  </div>
                );
              })()}

              {/* Recovery URL */}
              {detalleCarrito.abandoned_checkout_url && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">
                    Recovery URL
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={detalleCarrito.abandoned_checkout_url}
                      className="flex-1 px-3 py-2 border rounded-lg bg-gray-50 text-xs font-mono"
                    />
                    <button
                      onClick={() =>
                        copiarUrl(detalleCarrito.abandoned_checkout_url)
                      }
                      className="px-3 py-2 bg-[#171931] text-white rounded-lg text-sm hover:opacity-95 transition"
                    >
                      <i className="bx bx-copy text-base" />                    </button>
                  </div>
                </div>
              )}

              {/* Acciones */}
              <div className="flex gap-2 pt-4 border-t">
                {detalleCarrito.recuperado === 0 &&
                  detalleCarrito.phone_normalizado && (
                    <button
                      onClick={() => {
                        handleEnviarWhatsapp(detalleCarrito);
                        setDetalleCarrito(null);
                      }}
                      className="flex-1 bg-emerald-600 text-white font-semibold py-2 rounded-lg hover:bg-emerald-700 transition inline-flex items-center justify-center gap-2"
                    >
                      <i className="bx bxl-whatsapp text-lg" /> Enviar WhatsApp
                    </button>
                  )}
                {detalleCarrito.abandoned_checkout_url && (
                  <button
                    onClick={() => handleVerCarrito(detalleCarrito)}
                    className="flex-1 bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition inline-flex items-center justify-center gap-2"
                  >
                    <i className="bx bx-link-external text-lg" /> Abrir carrito
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarritosAbandonados;
