// src/pages/remarketingProducto/RemarketingProductoView.jsx
// Remarketing por producto (menú Productos → Remarketing). Beta.
//
// Lista de productos con su recordatorio propio: el que llega con botones
// («⭐ Ver opiniones» / «✅ Sí, lo quiero») a quien escribió por un anuncio
// del producto y dejó de responder. Un producto con remarketing manda SOLO
// sus recordatorios (1 a 3); sin configurar, sigue el de la columna
// Contacto inicial. Misma tarjeta blanca, tabla y paginación que /productos.
//
// REMARKETING_PRODUCTO_PILOTO: cuentas que ven el ítem del menú y la vista
// mientras es beta. Vacío = todas. El backend tiene la misma lista
// (REMARKETING_PRODUCTO_PILOTO en remarketing_producto.service.js).
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";
import Header from "../Header/pageHeader";
import EditorRemarketingProducto from "./EditorRemarketingProducto";

export const REMARKETING_PRODUCTO_PILOTO = [10, 610, 822];

export const remarketingProductoHabilitado = () =>
  REMARKETING_PRODUCTO_PILOTO.length === 0 ||
  REMARKETING_PRODUCTO_PILOTO.includes(
    Number(localStorage.getItem("id_configuracion")),
  );

const currency = new Intl.NumberFormat("es-EC", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

const ITEMS_POR_PAGINA = 10;

const RemarketingProductoView = () => {
  const navigate = useNavigate();
  const idConfiguracion =
    Number(localStorage.getItem("id_configuracion")) || null;
  const habilitado = remarketingProductoHabilitado();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pagina, setPagina] = useState(1);
  const [editando, setEditando] = useState(null);

  const cargar = async ({ silencioso = false } = {}) => {
    if (!idConfiguracion) {
      navigate("/conexiones");
      return;
    }
    try {
      if (!silencioso) setLoading(true);
      const { data: r } = await chatApi.post("/remarketing-producto/listar", {
        id_configuracion: idConfiguracion,
        dias: 30,
      });
      setData(r.data || null);
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "No se pudo cargar",
        text: e?.response?.data?.message || e.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (habilitado) cargar();
  }, []); // eslint-disable-line

  const lista = useMemo(() => {
    const q = search.trim().toLowerCase();
    let l = data?.productos || [];
    if (q) l = l.filter((p) => (p.nombre || "").toLowerCase().includes(q));
    // Con remarketing primero; luego los que reciben clientes por anuncio;
    // al final el resto. Dentro de cada grupo, por nombre.
    return [...l].sort((a, b) => {
      const ga = a.estado !== "sin_configurar" ? 0 : a.anuncios > 0 ? 1 : 2;
      const gb = b.estado !== "sin_configurar" ? 0 : b.anuncios > 0 ? 1 : 2;
      if (ga !== gb) return ga - gb;
      return String(a.nombre || "").localeCompare(String(b.nombre || ""));
    });
  }, [data, search]);

  const totalPaginas = Math.max(1, Math.ceil(lista.length / ITEMS_POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = useMemo(() => {
    const s = (paginaActual - 1) * ITEMS_POR_PAGINA;
    return lista.slice(s, s + ITEMS_POR_PAGINA);
  }, [lista, paginaActual]);

  const configurados = (data?.productos || []).filter(
    (p) => p.estado !== "sin_configurar",
  ).length;

  const alternar = async (p, activo) => {
    try {
      await chatApi.post("/remarketing-producto/activar", {
        id_configuracion: idConfiguracion,
        id_producto: p.id,
        activo,
      });
      cargar({ silencioso: true });
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: e?.response?.data?.message || e.message,
      });
    }
  };

  if (!habilitado) {
    return (
      <div className="min-h-screen bg-slate-50 w-full">
        <div className="mx-auto w-[98%] xl:w-[97%] 2xl:w-[96%] m-3 md:m-6 bg-white rounded-2xl ring-1 ring-slate-200 overflow-hidden">
          <Header
            title="Remarketing por producto"
            subtitle="Esta función aún no está disponible para tu cuenta."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 w-full">
      <div
        className="mx-auto w-[98%] xl:w-[97%] 2xl:w-[96%] m-3 md:m-6 bg-white rounded-2xl
        ring-1 ring-slate-200 flex flex-col min-h-[82vh] overflow-hidden"
      >
        <Header
          title="Remarketing por producto"
          subtitle="Recordatorio con botones para quien escribió por un anuncio del producto y dejó de responder."
        />

        {/* Buscador */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <i className="bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="text"
              placeholder="Buscar producto"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagina(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg
                focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none transition"
            />
          </div>
          {data ? (
            <p className="text-xs text-slate-500">
              <strong>{configurados}</strong> de{" "}
              <strong>{data.productos.length}</strong> productos con
              remarketing propio. Los demás usan el de la columna Contacto
              inicial.
            </p>
          ) : null}
        </div>

        {data && !data.remarketing_columna_activo ? (
          <div className="mx-5 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
            La columna Contacto inicial no tiene remarketing configurado. Los
            productos con remarketing propio igual envían dentro de las 24 h,
            pero fuera de ventana no habrá plantilla de respaldo.
          </div>
        ) : null}

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm py-20">
            Cargando productos…
          </div>
        ) : lista.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-3">
              <i className="bx bx-package text-3xl text-indigo-400" />
            </div>
            <p className="text-slate-700 font-medium">No hay productos que mostrar</p>
            <p className="text-slate-400 text-sm">Prueba con otra búsqueda.</p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-left">
                    Producto
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-left">
                    Remarketing
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">
                    Recordatorios
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">
                    Enviados
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">
                    Respondieron
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-center sticky right-0 bg-slate-50 z-20 shadow-[inset_1px_0_0_#e2e8f0]">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((p, idx) => {
                  const m = p.metricas;
                  const sin = p.estado === "sin_configurar";
                  return (
                    <tr
                      key={p.id}
                      className={`group border-b border-slate-100 transition-colors hover:bg-indigo-50/40 hover:shadow-[inset_3px_0_0_#4f46e5]
                        ${idx % 2 !== 0 ? "bg-slate-50/30" : ""}`}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center flex-shrink-0 ring-1 ring-slate-200">
                            {p.imagen_url ? (
                              <img src={p.imagen_url} alt="" className="w-12 h-12 object-cover" />
                            ) : (
                              <i className="bx bx-package text-slate-300 text-xl" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-800 text-sm truncate max-w-[160px] md:max-w-[240px] xl:max-w-[360px]">
                              {p.nombre}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              {p.precio != null ? currency.format(Number(p.precio)) : "—"}
                              {p.anuncios > 0 ? "" : " · sin anuncios vinculados"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        {p.estado === "activo" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 bg-emerald-50 text-emerald-700 ring-emerald-200">
                            <i className="bx bx-check-circle" />
                            Activo
                          </span>
                        ) : p.estado === "pausado" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 bg-slate-100 text-slate-600 ring-slate-200">
                            <i className="bx bx-pause-circle" />
                            Pausado
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">No configurado</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-center tabular-nums text-slate-700">
                        {sin ? <span className="text-slate-300">—</span> : p.pasos}
                      </td>
                      <td className="px-4 py-3.5 text-center tabular-nums text-slate-700">
                        {sin ? <span className="text-slate-300">—</span> : m?.enviados || 0}
                      </td>
                      <td className="px-4 py-3.5 text-center tabular-nums text-slate-700">
                        {sin ? <span className="text-slate-300">—</span> : m?.respondieron || 0}
                      </td>

                      <td className="px-4 py-3.5 sticky right-0 bg-white group-hover:bg-[#f5f6fd] shadow-[inset_1px_0_0_#e2e8f0]">
                        <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                          <button
                            onClick={() => setEditando(p)}
                            className={`inline-flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-lg font-semibold transition-colors ${
                              sin
                                ? "bg-[#171931] text-white hover:bg-[#242a52]"
                                : "border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700"
                            }`}
                          >
                            <i className={`bx ${sin ? "bx-plus" : "bx-edit-alt"} text-sm`} />
                            {sin ? "Configurar" : "Editar"}
                          </button>
                          {p.estado === "activo" ? (
                            <button
                              onClick={() => alternar(p, false)}
                              title="Pausar: lo que esté en cola para este producto se cancela"
                              className="inline-flex items-center text-xs px-2 py-1.5 rounded-lg border border-transparent hover:border-amber-200 hover:bg-amber-50 text-slate-300 hover:text-amber-600 transition-colors"
                            >
                              <i className="bx bx-pause text-sm" />
                            </button>
                          ) : p.estado === "pausado" ? (
                            <button
                              onClick={() => alternar(p, true)}
                              title="Activar"
                              className="inline-flex items-center text-xs px-2 py-1.5 rounded-lg border border-transparent hover:border-emerald-200 hover:bg-emerald-50 text-slate-300 hover:text-emerald-600 transition-colors"
                            >
                              <i className="bx bx-play text-sm" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Paginación */}
            <div className="border-t border-slate-100 px-5 py-3.5 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Mostrando{" "}
                <strong>{Math.min((paginaActual - 1) * ITEMS_POR_PAGINA + 1, lista.length)}</strong>
                –<strong>{Math.min(paginaActual * ITEMS_POR_PAGINA, lista.length)}</strong> de{" "}
                <strong>{lista.length}</strong>
              </p>
              <div className="flex items-center gap-1.5">
                {[
                  { lbl: "«", action: () => setPagina(1), disabled: paginaActual === 1 },
                  { lbl: "‹", action: () => setPagina((p) => Math.max(1, p - 1)), disabled: paginaActual === 1 },
                  { lbl: "›", action: () => setPagina((p) => Math.min(totalPaginas, p + 1)), disabled: paginaActual === totalPaginas },
                  { lbl: "»", action: () => setPagina(totalPaginas), disabled: paginaActual === totalPaginas },
                ].map((btn, i) => (
                  <button
                    key={i}
                    onClick={btn.action}
                    disabled={btn.disabled}
                    className="w-8 h-8 rounded-lg border border-slate-200 text-sm flex items-center justify-center disabled:opacity-40 hover:bg-slate-50 transition-colors"
                  >
                    {btn.lbl}
                  </button>
                ))}
                <span className="text-xs text-slate-500 ml-1 font-medium">
                  {paginaActual}/{totalPaginas}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {editando ? (
        <EditorRemarketingProducto
          idConfiguracion={idConfiguracion}
          producto={editando}
          columnas={data?.columnas || []}
          onClose={(cambio) => {
            setEditando(null);
            if (cambio) cargar({ silencioso: true });
          }}
        />
      ) : null}
    </div>
  );
};

export default RemarketingProductoView;
