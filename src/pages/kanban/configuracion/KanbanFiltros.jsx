import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import chatApi from "../../../api/chatcenter";

import ModalPersonalizarVista from "./modales/ModalPersonalizarVista";

// Helpers de fecha
const hoy = () => new Date().toISOString().slice(0, 10);
const hace7 = () => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
};
const hace30 = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
};

const RANGOS = [
  { key: "hoy", label: "Hoy", corto: "Hoy", fd: hoy, fh: hoy },
  { key: "7d", label: "7 días", corto: "7d", fd: hace7, fh: hoy },
  { key: "30d", label: "30 días", corto: "30d", fd: hace30, fh: hoy },
];

const Dot = ({ color }) => (
  <span
    style={{
      width: 8,
      height: 8,
      borderRadius: 999,
      background: color,
      display: "inline-block",
      flexShrink: 0,
    }}
  />
);

/* Multiselect genérico en pill: mismo look para agentes y productos.
   items: [{id, nombre, badge?}] — badge es un texto corto opcional (ej. "ads"). */
const MultiSelectPill = ({
  icon,
  placeholder,
  plural,
  items,
  selected,
  onToggle,
  onClear,
  loading,
  footer,
  maxWidth = 190,
  className,
  compact = false,
}) => {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef(null);
  const dropRef = useRef(null);

  /* El dropdown va en position:fixed (la barra scrollea horizontal y un
     absolute quedaría recortado por el overflow del contenedor). */
  const toggleOpen = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const r = ref.current?.getBoundingClientRect();
    if (r) {
      setPos({
        top: r.bottom + 6,
        left: Math.max(8, Math.min(r.left, window.innerWidth - 286)),
      });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    // Un scroll fuera del dropdown lo cierra (con fixed no puede "seguir" al pill)
    const onScroll = (e) => {
      if (dropRef.current && dropRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  const filtrados = useMemo(() => {
    const t = term.trim().toLowerCase();
    if (!t) return items;
    return items.filter((i) =>
      String(i.nombre || "").toLowerCase().includes(t),
    );
  }, [items, term]);

  const nombreDe = (id) => {
    const it = items.find((x) => String(x.id) === String(id));
    return it ? it.nombre : `#${id}`;
  };

  const label =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? nombreDe(selected[0])
        : `${selected.length} ${plural}`;

  const activo = selected.length > 0;

  return (
    <div
      ref={ref}
      className={className}
      style={{ position: "relative", flexShrink: 0 }}
    >
      <button
        onClick={toggleOpen}
        className="kf-pillbtn"
        title={label}
        style={{
          ...pill,
          display: "inline-flex",
          alignItems: "center",
          gap: compact ? 4 : 6,
          cursor: "pointer",
          border: `1.5px solid ${activo ? "#6366f1" : "#e2e8f0"}`,
          background: activo ? "rgba(99,102,241,.06)" : "#f8fafc",
          color: activo ? "#4338ca" : "#475569",
          fontWeight: activo ? 700 : 500,
          maxWidth: compact ? undefined : maxWidth,
        }}
      >
        <i className={`bx ${icon}`} style={{ fontSize: 14, flexShrink: 0 }} />
        {compact ? (
          activo && (
            <span
              style={{
                fontSize: "0.66rem",
                fontWeight: 700,
                background: "rgba(99,102,241,.15)",
                borderRadius: 999,
                padding: "0 5px",
              }}
            >
              {selected.length}
            </span>
          )
        ) : (
          <>
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </span>
            <i
              className={`bx bx-chevron-${open ? "up" : "down"}`}
              style={{ fontSize: 14, flexShrink: 0 }}
            />
          </>
        )}
      </button>

      {open && (
        <div
          ref={dropRef}
          style={{ ...drop, top: pos.top, left: pos.left, width: 270 }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 10px",
              borderBottom: "1px solid rgba(0,0,0,.06)",
            }}
          >
            <i
              className="bx bx-search"
              style={{ color: "#94a3b8", fontSize: 14 }}
            />
            <input
              type="text"
              autoFocus
              placeholder={`Buscar ${plural}…`}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
              }}
              style={{
                border: "none",
                outline: "none",
                fontSize: ".78rem",
                width: "100%",
                background: "transparent",
                color: "#0f172a",
                fontFamily: "inherit",
              }}
            />
            {activo && (
              <button
                onClick={onClear}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#ef4444",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                Quitar
              </button>
            )}
          </div>

          <div style={{ maxHeight: 230, overflowY: "auto" }}>
            {loading && (
              <div style={dropMsg}>
                <i className="bx bx-loader-alt bx-spin" /> Cargando…
              </div>
            )}
            {!loading && filtrados.length === 0 && (
              <div style={{ ...dropMsg, fontStyle: "italic" }}>
                Sin coincidencias.
              </div>
            )}
            {!loading &&
              filtrados.map((it) => {
                const act = selected.some((x) => String(x) === String(it.id));
                return (
                  <button
                    key={it.id}
                    onClick={() => onToggle(it.id)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 10px",
                      border: "none",
                      background: act ? "rgba(99,102,241,.07)" : "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span
                      style={{
                        width: 15,
                        height: 15,
                        borderRadius: 4,
                        flexShrink: 0,
                        border: `1.5px solid ${act ? "#6366f1" : "#cbd5e1"}`,
                        background: act ? "#6366f1" : "#fff",
                        display: "grid",
                        placeItems: "center",
                        color: "#fff",
                      }}
                    >
                      {act && (
                        <i className="bx bx-check" style={{ fontSize: 12 }} />
                      )}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: "0.78rem",
                        color: "#1f2937",
                        fontWeight: act ? 700 : 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {it.nombre}
                    </span>
                    {it.badge && (
                      <span
                        title={it.badgeTitle || ""}
                        style={{
                          fontSize: "0.62rem",
                          fontWeight: 700,
                          color: "#0d9488",
                          background: "rgba(13,148,136,.08)",
                          border: "1px solid rgba(13,148,136,.25)",
                          borderRadius: 999,
                          padding: "0 6px",
                          flexShrink: 0,
                        }}
                      >
                        {it.badge}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
          {footer && (
            <div
              style={{
                padding: "6px 10px",
                borderTop: "1px solid rgba(0,0,0,.05)",
                fontSize: "0.66rem",
                color: "#94a3b8",
              }}
            >
              {footer}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* Barra de filtros compacta dentro de un cajón blanco: cada filtro es un pill
   y se aplica al instante (sin botón "Aplicar"). */
const KanbanFiltros = ({
  id_configuracion,
  onChange,
  onSearch,
  buscando = false,
  kanbanColumnas = [],
  columnasVisibles = null,
  onColumnasVisiblesChange,
  mostrarHuerfanos = true,
  onMostrarHuerfanosChange,
}) => {
  const [agentes, setAgentes] = useState([]);
  const [loadingAg, setLoadingAg] = useState(false);
  const [modalVistaOpen, setModalVistaOpen] = useState(false);

  const [productos, setProductos] = useState([]);
  const [loadingProd, setLoadingProd] = useState(false);

  /* Ancho REAL de la barra (no del viewport: abrir el menú lateral también
     angosta). Con menos espacio los pills pasan a modo ícono para seguir
     cabiendo en UNA línea sin scroll; solo en anchos de celular se apila. */
  const rootRef = useRef(null);
  const [anchoBarra, setAnchoBarra] = useState(9999);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w) setAnchoBarra(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const movil = anchoBarra < 860;
  const compacto = !movil && anchoBarra < 1330;

  // busqueda = lo que se escribe | buscado = lo aplicado
  const [busqueda, setBusqueda] = useState("");
  const [buscado, setBuscado] = useState("");

  const [local, setLocal] = useState({
    encargados: [],
    bot_openia: "",
    fecha_desde: "",
    fecha_hasta: "",
    productos: [],
  });

  const buildFiltros = (l = local) => ({
    // El backend acepta array o escalar en id_encargado
    id_encargado: l.encargados.map(Number),
    bot_openia: l.bot_openia !== "" ? Number(l.bot_openia) : null,
    fecha_desde: l.fecha_desde || null,
    fecha_hasta: l.fecha_hasta || null,
    productos: l.productos.map(Number),
  });

  /* Auto-aplicar: cada cambio dispara onChange de una vez */
  const actualizar = (patch) => {
    setLocal((p) => {
      const next = { ...p, ...patch };
      onChange(buildFiltros(next));
      return next;
    });
  };

  const ejecutarBusqueda = () => {
    const t = busqueda.trim();
    if (t === buscado) return;
    setBuscado(t);
    onSearch?.(t);
  };

  const limpiarBusqueda = () => {
    setBusqueda("");
    if (buscado !== "") {
      setBuscado("");
      onSearch?.("");
    }
  };

  const totalCols = kanbanColumnas.length;
  const visiblesCount = columnasVisibles?.size ?? totalCols;
  const todasVisibles = visiblesCount === totalCols;

  const activos = [
    local.encargados.length > 0,
    local.bot_openia !== "",
    local.fecha_desde !== "" || local.fecha_hasta !== "",
    local.productos.length > 0,
    !todasVisibles,
    !mostrarHuerfanos,
    buscado !== "",
  ].filter(Boolean).length;

  const cargarAgentes = useCallback(async () => {
    if (!id_configuracion || agentes.length) return;
    setLoadingAg(true);
    try {
      const { data } = await chatApi.post(
        "/clientes_chat_center/listar_agentes",
        { id_configuracion },
      );
      if (data?.success) setAgentes(data.data || []);
    } catch {
      /* silencioso */
    } finally {
      setLoadingAg(false);
    }
  }, [id_configuracion, agentes.length]);

  const cargarProductos = useCallback(async () => {
    if (!id_configuracion || productos.length) return;
    setLoadingProd(true);
    try {
      const { data } = await chatApi.post(
        "/clientes_chat_center/listar_productos_filtro",
        { id_configuracion },
      );
      if (data?.success) setProductos(data.data || []);
    } catch {
      /* silencioso */
    } finally {
      setLoadingProd(false);
    }
  }, [id_configuracion, productos.length]);

  useEffect(() => {
    cargarAgentes();
    cargarProductos();
  }, [cargarAgentes, cargarProductos]);

  const limpiar = () => {
    setBusqueda("");
    if (buscado !== "") {
      setBuscado("");
      onSearch?.("");
    }
    const vacio = {
      encargados: [],
      bot_openia: "",
      fecha_desde: "",
      fecha_hasta: "",
      productos: [],
    };
    setLocal(vacio);
    onChange(buildFiltros(vacio));
    if (onColumnasVisiblesChange) {
      onColumnasVisiblesChange(kanbanColumnas.map((c) => c.estado_db));
    }
    if (onMostrarHuerfanosChange) onMostrarHuerfanosChange(true);
  };

  const toggleEn = (campo) => (id) => {
    const sid = String(id);
    const lista = local[campo];
    const ya = lista.some((x) => String(x) === sid);
    actualizar({
      [campo]: ya
        ? lista.filter((x) => String(x) !== sid)
        : [...lista, id],
    });
  };

  const hayFecha = local.fecha_desde !== "" || local.fecha_hasta !== "";

  const itemsAgentes = useMemo(
    () =>
      agentes.map((a) => ({
        id: a.id,
        nombre: a.nombre + (a.rol ? ` · ${a.rol}` : ""),
      })),
    [agentes],
  );

  const itemsProductos = useMemo(
    () =>
      productos.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        badge: Number(p.veces_anuncio) > 0 ? "ads" : null,
        badgeTitle: "Con anuncios vinculados",
      })),
    [productos],
  );

  return (
    <div ref={rootRef} style={{ marginBottom: "0.9rem", position: "relative" }}>
      {/* Cajón blanco: UNA sola línea sin scroll. La barra se mide a sí misma
          y compacta sus pills (modo ícono) cuando el espacio baja; en anchos
          de celular se apila ordenado. Dropdowns en position:fixed. */}
      <div
        className={`kf-bar${movil ? " kf-movil" : ""}`}
        style={{
          background: "#fff",
          border: "1px solid rgba(15,23,42,.08)",
          borderRadius: 14,
          boxShadow: "0 2px 10px rgba(15,23,42,.05)",
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        {/* Buscador (compacto: es solo un nombre o número) */}
        <div
          className="kf-buscador"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "#f8fafc",
            borderRadius: 10,
            border: `1.5px solid ${buscado ? "#6366f1" : "#e2e8f0"}`,
            padding: "5px 8px 5px 10px",
            minWidth: 130,
            maxWidth: 240,
            flex: "1 1 150px",
          }}
        >
          <i
            className={`bx ${buscando ? "bx-loader-alt bx-spin" : "bx-search"}`}
            style={{ color: "#94a3b8", fontSize: 15, flexShrink: 0 }}
          />
          <input
            type="text"
            placeholder="Nombre o teléfono…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") ejecutarBusqueda();
              if (e.key === "Escape") limpiarBusqueda();
            }}
            style={{
              border: "none",
              outline: "none",
              fontSize: ".8rem",
              color: "#0f172a",
              background: "transparent",
              width: "100%",
              fontFamily: "inherit",
            }}
          />
          {busqueda && (
            <button
              onClick={limpiarBusqueda}
              title="Limpiar (Esc)"
              style={btnIcon}
            >
              <i className="bx bx-x" style={{ fontSize: 15 }} />
            </button>
          )}
          <button
            onClick={ejecutarBusqueda}
            disabled={buscando || busqueda.trim() === buscado}
            title="Buscar (Enter)"
            style={{
              ...btnIcon,
              color:
                buscando || busqueda.trim() === buscado ? "#cbd5e1" : "#6366f1",
            }}
          >
            <i className="bx bx-right-arrow-alt" style={{ fontSize: 17 }} />
          </button>
        </div>

        {/* Agentes (multiselect) */}
        <MultiSelectPill
          icon="bx-user"
          placeholder="Agente"
          plural="agentes"
          items={itemsAgentes}
          selected={local.encargados}
          onToggle={toggleEn("encargados")}
          onClear={() => actualizar({ encargados: [] })}
          loading={loadingAg}
          maxWidth={180}
          className="kf-stretch"
          compact={compacto}
        />

        {/* Bot: segmentado con punto de color */}
        <div
          className="kf-seg"
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: "#f8fafc",
            border: "1.5px solid #e2e8f0",
            borderRadius: 10,
            padding: 2,
            gap: 2,
            flexShrink: 0,
          }}
        >
          {[
            { v: "", label: "Bot", dot: null },
            { v: "1", label: "Activo", dot: "#22c55e" },
            { v: "0", label: "Inactivo", dot: "#ef4444" },
          ].map((op) => {
            const act = local.bot_openia === op.v;
            return (
              <button
                key={op.v}
                onClick={() => actualizar({ bot_openia: op.v })}
                title={op.dot ? `Bot ${op.label.toLowerCase()}` : "Bot: todos"}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "4px 9px",
                  borderRadius: 8,
                  border: "none",
                  background: act ? "#eef2ff" : "transparent",
                  color: act ? "#4338ca" : "#64748b",
                  fontWeight: act ? 700 : 500,
                  fontSize: "0.76rem",
                  cursor: "pointer",
                  transition: "all .12s",
                }}
              >
                {compacto ? (
                  op.dot ? (
                    <Dot color={op.dot} />
                  ) : (
                    <i className="bx bx-bot" style={{ fontSize: 14 }} />
                  )
                ) : (
                  <>
                    {op.dot && <Dot color={op.dot} />}
                    {op.label}
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Producto (multiselect) */}
        <MultiSelectPill
          icon="bx-purchase-tag-alt"
          placeholder="Producto"
          plural="productos"
          items={itemsProductos}
          selected={local.productos}
          onToggle={toggleEn("productos")}
          onClear={() => actualizar({ productos: [] })}
          loading={loadingProd}
          footer="Contactos llegados desde un anuncio de ese producto."
          maxWidth={190}
          className="kf-stretch"
          compact={compacto}
        />

        {/* Fecha: rango siempre visible + rápidos a la derecha */}
        <div
          className="kf-fecha"
          title="Fecha del último mensaje"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
            background: hayFecha ? "rgba(99,102,241,.05)" : "#f8fafc",
            border: `1.5px solid ${hayFecha ? "#6366f1" : "#e2e8f0"}`,
            borderRadius: 10,
            padding: "3px 8px",
          }}
        >
          <i
            className="bx bx-calendar"
            style={{
              fontSize: 15,
              color: hayFecha ? "#4338ca" : "#94a3b8",
              flexShrink: 0,
            }}
          />
          <input
            type="date"
            value={local.fecha_desde}
            onChange={(e) => actualizar({ fecha_desde: e.target.value })}
            style={inpFecha}
          />
          <span style={{ color: "#9ca3af", fontSize: "0.75rem" }}>→</span>
          <input
            type="date"
            value={local.fecha_hasta}
            onChange={(e) => actualizar({ fecha_hasta: e.target.value })}
            style={inpFecha}
          />
          {hayFecha && (
            <button
              onClick={() => actualizar({ fecha_desde: "", fecha_hasta: "" })}
              title="Quitar fecha"
              style={btnIcon}
            >
              <i className="bx bx-x" style={{ fontSize: 15 }} />
            </button>
          )}
        </div>

        {/* Rápidos: hoy / 7 / 30 días */}
        <div
          className="kf-seg"
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: "#f8fafc",
            border: "1.5px solid #e2e8f0",
            borderRadius: 10,
            padding: 2,
            gap: 2,
            flexShrink: 0,
          }}
        >
          {RANGOS.map((r) => {
            const act =
              local.fecha_desde === r.fd() && local.fecha_hasta === r.fh();
            return (
              <button
                key={r.key}
                onClick={() =>
                  actualizar(
                    act
                      ? { fecha_desde: "", fecha_hasta: "" }
                      : { fecha_desde: r.fd(), fecha_hasta: r.fh() },
                  )
                }
                style={{
                  padding: "4px 9px",
                  borderRadius: 8,
                  border: "none",
                  background: act ? "#eef2ff" : "transparent",
                  color: act ? "#4338ca" : "#64748b",
                  fontWeight: act ? 700 : 500,
                  fontSize: "0.76rem",
                  cursor: "pointer",
                  transition: "all .12s",
                  whiteSpace: "nowrap",
                }}
                title={`Último mensaje: ${r.label.toLowerCase()}`}
              >
                {compacto ? r.corto : r.label}
              </button>
            );
          })}
        </div>

        {/* Personalizar + Limpiar al final, empujados a la derecha */}
        <div
          className="kf-acciones"
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
            paddingLeft: 4,
          }}
        >
          {activos > 0 && (
            <button
              onClick={limpiar}
              title="Limpiar todos los filtros"
              style={{
                fontSize: "0.75rem",
                color: "#ef4444",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                padding: "4px 4px",
                whiteSpace: "nowrap",
              }}
            >
              <i className="bx bx-x" style={{ fontSize: 13 }} />{" "}
              {compacto ? `(${activos})` : `Limpiar (${activos})`}
            </button>
          )}
          <button
            onClick={() => setModalVistaOpen(true)}
            title="Personalizar columnas del tablero"
            style={{
              ...pill,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              border: `1.5px solid ${!todasVisibles || !mostrarHuerfanos ? "#6366f1" : "#e2e8f0"}`,
              background:
                !todasVisibles || !mostrarHuerfanos
                  ? "rgba(99,102,241,.06)"
                  : "#f8fafc",
              color:
                !todasVisibles || !mostrarHuerfanos ? "#4338ca" : "#475569",
              fontWeight: !todasVisibles || !mostrarHuerfanos ? 700 : 500,
            }}
          >
            <i className="bx bx-columns" style={{ fontSize: 14 }} />
            {!compacto && <span>Personalizar</span>}
            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                background:
                  !todasVisibles || !mostrarHuerfanos
                    ? "rgba(99,102,241,.15)"
                    : "rgba(100,116,139,.12)",
                borderRadius: 999,
                padding: "0 6px",
              }}
            >
              {visiblesCount}/{totalCols}
            </span>
          </button>
        </div>
      </div>

      {/* Aviso FULLTEXT: mínimo 3 letras */}
      {busqueda.trim().length > 0 &&
        busqueda.trim().length < 3 &&
        !/\d/.test(busqueda) && (
          <span
            style={{
              fontSize: "0.7rem",
              color: "#f59e0b",
              paddingLeft: 4,
              display: "inline-block",
              marginTop: 3,
            }}
          >
            <i className="bx bx-info-circle" /> Escribe al menos 3 letras
          </span>
        )}

      {/* Modo móvil (la barra mide < 860px): se apila en filas ordenadas —
          pills a lo ancho, segmentados repartidos, fechas estiradas. */}
      <style>{`
        .kf-movil .kf-buscador { flex: 1 1 100%; max-width: none !important; }
        .kf-movil .kf-stretch { flex: 1 1 45%; min-width: 140px; }
        .kf-movil .kf-pillbtn { width: 100%; max-width: none !important; }
        .kf-movil .kf-seg { flex: 1 1 100%; }
        .kf-movil .kf-seg > button { flex: 1 1 auto; justify-content: center; }
        .kf-movil .kf-fecha { flex: 1 1 100%; justify-content: space-between; }
        .kf-movil .kf-fecha input { width: auto !important; flex: 1 1 80px; }
        .kf-movil .kf-acciones { margin-left: 0 !important; width: 100%; justify-content: flex-end; }
      `}</style>

      {/* Modal personalizar vista */}
      <ModalPersonalizarVista
        open={modalVistaOpen}
        onClose={() => setModalVistaOpen(false)}
        kanbanColumnas={kanbanColumnas}
        columnasVisibles={columnasVisibles}
        onColumnasVisiblesChange={onColumnasVisiblesChange}
        mostrarHuerfanos={mostrarHuerfanos}
        onMostrarHuerfanosChange={onMostrarHuerfanosChange}
      />
    </div>
  );
};

// Estilos compartidos
const pill = {
  padding: "6px 10px",
  borderRadius: 10,
  fontSize: "0.78rem",
  outline: "none",
  fontFamily: "inherit",
  whiteSpace: "nowrap",
  flexShrink: 0,
};
const btnIcon = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "#94a3b8",
  padding: 0,
  display: "flex",
  alignItems: "center",
};
const drop = {
  position: "fixed",
  background: "#fff",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,.1)",
  boxShadow: "0 12px 32px rgba(0,0,0,.14)",
  zIndex: 1000,
  overflow: "hidden",
};
const dropMsg = {
  padding: "12px 10px",
  fontSize: "0.78rem",
  color: "#94a3b8",
};
const inpFecha = {
  padding: "3px 2px",
  borderRadius: 6,
  border: "none",
  fontSize: "0.74rem",
  outline: "none",
  background: "transparent",
  color: "#374151",
  minWidth: 0,
  width: 108,
  fontFamily: "inherit",
};

export default KanbanFiltros;
