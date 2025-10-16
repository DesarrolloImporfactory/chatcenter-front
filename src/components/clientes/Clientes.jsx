// /src/pages/Clientes.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import chatApi from "../../api/chatcenter";

/* =================== Utils =================== */
const fmtDate = (d) => {
  if (!d) return "-";
  const x = new Date(d);
  return isNaN(+x) ? "-" : x.toLocaleDateString();
};
const fmtTime = (d) => {
  if (!d) return "-";
  const x = new Date(d);
  return isNaN(+x)
    ? "-"
    : x.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};
const fmtDateTime = (d) => {
  if (!d) return "-";
  const x = new Date(d);
  return isNaN(+x)
    ? "-"
    : `${x.toLocaleDateString()} ${x.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
};
const timeAgo = (d) => {
  if (!d) return "-";
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (!isFinite(s)) return "-";
  const abs = Math.abs(s);
  const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
  if (abs < 60) return rtf.format(-Math.round(s), "second");
  const m = abs / 60;
  if (m < 60) return rtf.format(-Math.round(m), "minute");
  const h = m / 60;
  if (h < 24) return rtf.format(-Math.round(h), "hour");
  const d2 = h / 24;
  if (d2 < 30) return rtf.format(-Math.round(d2), "day");
  const mo = d2 / 30;
  if (mo < 12) return rtf.format(-Math.round(mo), "month");
  const y = mo / 12;
  return rtf.format(-Math.round(y), "year");
};
// incluye id_cliente_chat_center como posible ID
const getId = (r) =>
  r?.id ?? r?.id_cliente_chat_center ?? r?._id ?? r?.id_cliente ?? null;
const initials = (n, a) => {
  const s = `${n || ""} ${a || ""}`.trim();
  const i = s
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return i || "?";
};
function safeCSV(v) {
  if (v == null) return "";
  const s = String(v).replace(/"/g, '""');
  return /,|\n/.test(s) ? `"${s}"` : s;
}

/* Normaliza fila -> llaves del front */
function mapRow(row) {
  return {
    id: row.id ?? row.id_cliente_chat_center,
    nombre: row.nombre_cliente || "",
    apellido: row.apellido_cliente || "",
    email: row.email_cliente || "",
    telefono: row.celular_cliente || "",
    createdAt: row.created_at,
    ultima_actividad: row.updated_at,
    estado: row.estado_cliente,
    id_etiqueta: row.id_etiqueta ?? null,
    id_plataforma: row.id_plataforma ?? null,
    id_configuracion: row.id_configuracion ?? null,
    chat_cerrado: row.chat_cerrado ?? 0,
    bot_openia: row.bot_openia ?? 1,
    uid_cliente: row.uid_cliente || "",
    telefono_limpio: row.telefono_limpio || "",
    mensajes_por_dia_cliente: row.mensajes_por_dia_cliente ?? 0,
    pedido_confirmado: row.pedido_confirmado ?? 0,
    imagePath: row.imagePath || "",
    etiquetas: Array.isArray(row.etiquetas) ? row.etiquetas : [], // si backend las embebe
    _raw: row,
  };
}

/* ====== UI ====== */
function Chip({ children, color }) {
  const style = color
    ? { backgroundColor: `${color}1a`, color, borderColor: `${color}33` }
    : {};
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1"
      style={style}
    >
      {children}
    </span>
  );
}
function SortButton({ label, active, dir = "asc", onClick, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`group inline-flex items-center gap-1 text-[11px] font-semibold tracking-wide ${className}`}
      title="Ordenar"
    >
      {label}
      <span
        className={`bx ${
          dir === "asc" ? "bx-chevron-up" : "bx-chevron-down"
        } text-[16px] text-gray-400 group-hover:text-gray-600 ${
          active ? "!text-gray-700" : ""
        }`}
      />
    </button>
  );
}
function ColumnsDropdown({ state, setState }) {
  return (
    <details className="relative">
      <summary
        className="list-none inline-flex cursor-pointer items-center gap-2
                   rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm
                   text-gray-900 shadow-sm hover:bg-gray-50
                   focus:outline-none focus:ring-2 focus:ring-[#171931]"
      >
        Columns <i className="bx bx-chevron-down text-gray-700" />
      </summary>

      <div
        className="absolute right-200 z-30 mt-2 w-56 rounded-lg border border-gray-200
                   bg-white p-2 shadow-xl ring-1 ring-black/5"
      >
        {Object.keys(state).map((k) => (
          <label
            key={k}
            className="flex items-center gap-2 rounded px-2 py-1.5
                       text-sm text-gray-900 hover:bg-gray-50"
          >
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-400 accent-[#171931]
                         focus:ring-2 focus:ring-[#171931] focus:ring-offset-0"
              checked={state[k]}
              onChange={() => setState((s) => ({ ...s, [k]: !s[k] }))}
            />
            <span className="capitalize">{k.replace(/_/g, " ")}</span>
          </label>
        ))}
      </div>
    </details>
  );
}
// selector simple para filtrar por etiqueta (usa catálogo)
function TagSelect({ options, value, onChange, disabled, unavailable }) {
  return (
    <select
      className="rounded-md border px-2 py-1"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      title={
        unavailable ? "Catálogo de etiquetas no disponible" : "Filtrar por etiqueta"
      }
    >
      <option value="">Etiquetas (todas)</option>
      {options.map((o) => (
        <option key={o.id_etiqueta || o.id} value={o.id_etiqueta || o.id}>
          {o.nombre_etiqueta || o.nombre}
        </option>
      ))}
    </select>
  );
}
function BaseModal({ open, title, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="text-base font-semibold">{title}</h3>
          <button className="rounded p-2 hover:bg-gray-100" onClick={onClose}>
            <i className="bx bx-x text-xl" />
          </button>
        </div>
        <div className="px-5 py-3">{children}</div>
        <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
          {footer}
        </div>
      </div>
    </div>
  );
}
function ModalTags({ open, onClose, onApply, disabled, catalogo }) {
  const [seleccion, setSeleccion] = useState([]);
  useEffect(() => {
    if (open) setSeleccion([]);
  }, [open]);
  const hayCatalogo = Array.isArray(catalogo) && catalogo.length > 0;

  return (
    <BaseModal
      open={open}
      title="Etiquetas"
      onClose={onClose}
      footer={
        <>
          <button className="rounded-md border px-3 py-1.5 text-sm" onClick={onClose}>
            Cancelar
          </button>
          <button
            disabled={disabled}
            onClick={async () => {
              if (hayCatalogo) {
                if (!seleccion.length) {
                  alert("Selecciona al menos una etiqueta");
                  return;
                }
                await onApply(seleccion);
              } else {
                alert("Catálogo no disponible para aplicar etiquetas");
                return;
              }
              onClose();
            }}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-60"
          >
            Aplicar
          </button>
        </>
      }
    >
      {hayCatalogo ? (
        <div className="max-h-72 overflow-auto rounded border p-2">
          {catalogo.map((tag) => {
            const id = tag.id_etiqueta || tag.id;
            const checked = seleccion.includes(id);
            return (
              <label
                key={id}
                className="flex items-center gap-2 rounded px-2 py-1 hover:bg-gray-50 text-sm"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={checked}
                  onChange={(e) => {
                    if (e.target.checked) setSeleccion((prev) => [...prev, id]);
                    else setSeleccion((prev) => prev.filter((x) => x !== id));
                  }}
                />
                <Chip color={tag.color_etiqueta}>
                  {tag.nombre_etiqueta || tag.nombre}
                </Chip>
              </label>
            );
          })}
          {catalogo.length === 0 && (
            <div className="p-2 text-sm text-gray-500">Sin etiquetas</div>
          )}
          <p className="mt-2 text-xs text-gray-500">
            Se alternará (asignar/quitar) la selección para los clientes seleccionados.
          </p>
        </div>
      ) : (
        <p className="text-sm text-gray-600">Catálogo de etiquetas no disponible.</p>
      )}
    </BaseModal>
  );
}

/* ====== Vista principal ====== */
export default function Clientes() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // densidad
  const [density, setDensity] = useState("compacta");
  const rowPad = density === "compacta" ? "py-2" : density === "media" ? "py-2.5" : "py-3";
  const headPad = density === "compacta" ? "py-2" : density === "media" ? "py-2.5" : "py-3";

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(undefined);

  const [pageSize, setPageSize] = useState(20);
  const LIMIT = pageSize;

  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("todos");
  const [idEtiquetaFiltro, setIdEtiquetaFiltro] = useState("");
  const [orden, setOrden] = useState("recientes");

  const [selected, setSelected] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [modalTagsOpen, setModalTagsOpen] = useState(false);
  const [modalSMS, setModalSMS] = useState({ open: false, msg: "" });
  const [modalEmail, setModalEmail] = useState({ open: false, subject: "", body: "" });
  const [modalReview, setModalReview] = useState({ open: false, channel: "whatsapp", link: "" });

  // columnas visibles
  const [cols, setCols] = useState({
    name: true,
    phone: true,
    email: true,
    created: true,
    last_activity: true,
    tags: true,
  });

  // Catálogos de etiquetas por configuración + features
  const [catalogosPorCfg, setCatalogosPorCfg] = useState({}); // { [id_config]: Etiqueta[] }
  const [idConfigForTags, setIdConfigForTags] = useState(null);
  const [features, setFeatures] = useState({
    catalogo: null,
    asignadas: null,
    toggle: null,
    sms: null,
    email: null,
    review: null,
  });

  // Mapa rápido nombre/color por id y config
  const mapasPorCfg = useMemo(() => {
    const out = new Map(); // key: cfgId -> Map(etiquetaId -> {nombre,color})
    for (const [cfg, arr] of Object.entries(catalogosPorCfg)) {
      const m = new Map();
      for (const t of arr || []) {
        const id = t.id_etiqueta ?? t.id;
        if (id != null)
          m.set(Number(id), {
            nombre: t.nombre_etiqueta ?? t.nombre,
            color: t.color_etiqueta ?? t.color,
          });
      }
      out.set(Number(cfg), m);
    }
    return out;
  }, [catalogosPorCfg]);

  /* ================== Clientes: listar + catálogos + etiquetas ================== */
  async function apiList(p = 1, replace = false) {
    setLoading(true);
    try {
      const params = {
        page: p,
        limit: LIMIT,
        sort: orden,
        q: q || undefined,
        estado: estado !== "todos" ? estado : undefined,
        id_etiqueta: idEtiquetaFiltro || undefined,
      };
      const { data } = await chatApi.get("/clientes_chat_center/listar", { params });
      const rows = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      const mapped = rows.map(mapRow);
      const tot = data?.total ?? undefined;

      // 1) detectar configuraciones presentes
      const cfgs = Array.from(
        new Set(mapped.map((r) => r.id_configuracion).filter(Boolean))
      );
      // tomar una por defecto para el selector de filtros si aplica
      if (!idConfigForTags && cfgs.length) setIdConfigForTags(cfgs[0]);

      // 2) asegurar catálogos para todas las cfgs detectadas
      await cargarCatalogosSiFaltan(cfgs);

      // 3) anexar etiquetas asignadas
      const withTags = await anexarEtiquetasAsignadas(mapped);

      setItems((prev) => (replace ? withTags : [...prev, ...withTags]));
      setPage(p);
      setHasMore(typeof tot === "number" ? p * LIMIT < tot : withTags.length === LIMIT);
      setTotal(tot);
    } catch (e) {
      console.error("LIST:", e?.response?.data || e.message);
    } finally {
      setLoading(false);
    }
  }

  async function cargarCatalogosSiFaltan(cfgs) {
    if (!cfgs?.length) return;
    const faltantes = cfgs.filter((id) => catalogosPorCfg[id] == null);
    if (!faltantes.length) return;
    try {
      const respuestas = await Promise.all(
        faltantes.map((cfgId) =>
          chatApi
            .post("/etiquetas_chat_center/obtenerEtiquetas", {
              id_configuracion: Number(cfgId),
            })
            .then((res) => ({ cfgId, res }))
            .catch((err) => ({ cfgId, err }))
        )
      );
      const nuevo = { ...catalogosPorCfg };
      let algunoOk = false;
      for (const { cfgId, res, err } of respuestas) {
        if (res?.data?.status === "200") {
          nuevo[cfgId] = Array.isArray(res.data?.etiquetas) ? res.data.etiquetas : [];
          algunoOk = true;
        } else {
          console.error("CATALOGO ETIQUETAS cfg", cfgId, err || res?.data);
          nuevo[cfgId] = [];
        }
      }
      setCatalogosPorCfg(nuevo);
      setFeatures((f) => ({ ...f, catalogo: algunoOk }));
    } catch (e) {
      console.error("CATALOGOS:", e?.response?.data || e.message);
      setFeatures((f) => ({ ...f, catalogo: false }));
    }
  }

  // Obtener etiquetas asignadas por cliente y resolver nombre/color con el catálogo de SU config
  async function anexarEtiquetasAsignadas(clientes) {
    if (!clientes?.length) return clientes;
    if (features.asignadas === false) return clientes;
    const out = [...clientes];
    try {
      await Promise.all(
        out.map(async (c, i) => {
          const id = getId(c);
          if (!id) return;
          try {
            const { data } = await chatApi.post(
              "/etiquetas_asignadas/obtenerEtiquetasAsignadas",
              { id_cliente_chat_center: id }
            );
            if (data?.status === "200") {
              const arr = Array.isArray(data?.etiquetasAsignadas)
                ? data.etiquetasAsignadas
                : [];
              const mapa = mapasPorCfg.get(Number(c.id_configuracion)) || new Map();
              const mapped = arr
                .map((e) => {
                  const idE = e.id_etiqueta ?? e.id ?? e.etiqueta_id;
                  if (idE == null) return null;
                  const info = mapa.get(Number(idE));
                  return {
                    id: Number(idE),
                    nombre: e.nombre_etiqueta ?? e.nombre ?? info?.nombre ?? `#${idE}`,
                    color: e.color_etiqueta ?? e.color ?? info?.color,
                  };
                })
                .filter(Boolean);
              out[i] = { ...c, etiquetas: mapped };
            }
          } catch (err) {
            const s = err?.response?.status;
            if (s === 404 || s === 401 || s === 500)
              setFeatures((f) => ({ ...f, asignadas: false }));
          }
        })
      );
      setFeatures((f) => ({ ...f, asignadas: true }));
    } catch (e) {
      console.warn(
        "No se pudieron anexar etiquetas asignadas:",
        e?.response?.data || e.message
      );
      setFeatures((f) => ({ ...f, asignadas: false }));
    }
    return out;
  }

  /* ========== Toggle etiquetas (asignar/quitar) ========== */
  async function toggleEtiquetasBulk(idsClientes, idsEtiquetas) {
    if (!idsClientes?.length || !idsEtiquetas?.length) return;
    // Se usa la config del primer cliente seleccionado si no hay una fija
    let cfg = idConfigForTags;
    if (!cfg) {
      const primero = items.find((x) => idsClientes.includes(getId(x)));
      cfg = primero?.id_configuracion;
    }
    if (!cfg) {
      alert("No se pudo determinar id_configuracion para etiquetas.");
      return;
    }
    try {
      for (const idC of idsClientes) {
        for (const idE of idsEtiquetas) {
          await chatApi.post("/etiquetas_chat_center/toggleAsignacionEtiqueta", {
            id_cliente_chat_center: idC,
            id_etiqueta: Number(idE),
            id_configuracion: Number(cfg),
          });
        }
      }
      setFeatures((f) => ({ ...f, toggle: true }));
      // refrescar etiquetas visibles del page actual
      const refreshed = await anexarEtiquetasAsignadas(items);
      setItems(refreshed);
      alert("Etiquetas actualizadas");
    } catch (e) {
      const s = e?.response?.status;
      if (s === 404 || s === 501) setFeatures((f) => ({ ...f, toggle: false }));
      console.error("TOGGLE TAGS:", e?.response?.data || e.message);
      alert("Error aplicando etiquetas");
    }
  }

  /* ===== Stubs (mantengo) ===== */
  async function callFutureEndpoint(fn, label, featureKey) {
    try {
      await fn();
      alert(`${label} enviada ✅`);
      if (featureKey) setFeatures((f) => ({ ...f, [featureKey]: true }));
    } catch (e) {
      const s = e?.response?.status;
      if (s === 404 || s === 501) {
        alert(`${label}: pendiente backend`);
        if (featureKey) setFeatures((f) => ({ ...f, [featureKey]: false }));
      } else {
        console.error(e?.response?.data || e.message);
        alert(`Error en ${label}`);
      }
    }
  }
  const bulkSMS = (ids, mensaje) =>
    callFutureEndpoint(
      () => chatApi.post("/clientes_chat_center/sms/enviar", { ids, mensaje }),
      "Enviar SMS",
      "sms"
    );
  const bulkEmail = (ids, subject, body) =>
    callFutureEndpoint(
      () => chatApi.post("/clientes_chat_center/email/enviar", { ids, subject, body }),
      "Enviar Email",
      "email"
    );
  const bulkReview = (ids, channel, link) =>
    callFutureEndpoint(
      () => chatApi.post("/clientes_chat_center/resenas/enviar", { ids, channel, link }),
      "Solicitud de reseña",
      "review"
    );

  /* ===== Efectos ===== */
  // Traer clientes al cambiar filtros
  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    apiList(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, estado, orden, pageSize, idEtiquetaFiltro]);

  /* Scroll infinito */
  function onScroll(e) {
    if (loading || !hasMore) return;
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 16) apiList(page + 1);
  }

  /* Selección */
  const allSelected = useMemo(() => {
    const ids = items.map(getId).filter(Boolean);
    return ids.length > 0 && ids.every((id) => selected.includes(id));
  }, [items, selected]);
  const toggleSelectAll = (v) =>
    setSelected(v ? items.map(getId).filter(Boolean) : []);
  const toggleSelect = (id) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  /* Guardar */
  async function onSave() {
    try {
      if (!editing?.nombre && !editing?.telefono && !editing?.email)
        return alert("Ingresa al menos nombre, teléfono o email");
      const id = getId(editing);
      if (id) {
        const updated = await apiUpdate(id, editing);
        setItems((prev) => prev.map((x) => (getId(x) === id ? updated : x)));
      } else {
        const created = await apiCreate(editing);
        setItems((prev) => [created, ...prev]);
      }
      setDrawerOpen(false);
      setEditing(null);
    } catch (e) {
      console.error("SAVE:", e?.response?.data || e.message);
      alert("No se pudo guardar");
    }
  }

  /* CRUD */
  async function apiCreate(c) {
    const payload = {
      id_plataforma: c.id_plataforma || null,
      id_configuracion: c.id_configuracion || null,
      id_etiqueta: c.id_etiqueta || null,
      uid_cliente: c.uid_cliente || "",
      nombre_cliente: c.nombre,
      apellido_cliente: c.apellido,
      email_cliente: c.email,
      celular_cliente: c.telefono,
      imagePath: c.imagePath || "",
      mensajes_por_dia_cliente: c.mensajes_por_dia_cliente ?? 0,
      estado_cliente: c.estado ?? 1,
      chat_cerrado: c.chat_cerrado ?? 0,
      bot_openia: c.bot_openia ?? 1,
      pedido_confirmado: c.pedido_confirmado ?? 0,
    };
    const { data } = await chatApi.post("/clientes_chat_center/agregar", payload);
    return mapRow(data?.data || data);
  }
  async function apiUpdate(id, c) {
    const payload = {
      id_plataforma: c.id_plataforma || null,
      id_configuracion: c.id_configuracion || null,
      id_etiqueta: c.id_etiqueta || null,
      uid_cliente: c.uid_cliente || "",
      nombre_cliente: c.nombre,
      apellido_cliente: c.apellido,
      email_cliente: c.email,
      celular_cliente: c.telefono,
      imagePath: c.imagePath || "",
      mensajes_por_dia_cliente: c.mensajes_por_dia_cliente ?? 0,
      estado_cliente: c.estado ?? 1,
      chat_cerrado: c.chat_cerrado ?? 0,
      bot_openia: c.bot_openia ?? 1,
      pedido_confirmado: c.pedido_confirmado ?? 0,
    };
    const { data } = await chatApi.put(
      `/clientes_chat_center/actualizar/${id}`,
      payload
    );
    return mapRow(data?.data || data);
  }
  async function apiDelete(id) {
    await chatApi.delete(`/clientes_chat_center/eliminar/${id}`);
  }
  async function apiDeleteBulk(ids) {
    try {
      await chatApi.post(`/clientes_chat_center/eliminar`, { ids });
    } catch {
      for (const id of ids) await apiDelete(id);
    }
    return true;
  }

  /* Exportar/Importar */
  function exportCSV() {
    const headers = [
      "Nombre",
      "Apellido",
      "Email",
      "Telefono",
      "Estado",
      "IdEtiqueta",
      "Creado",
      "UltActividad",
    ];
    const csv = [headers.join(",")];
    for (const c of items) {
      csv.push(
        [
          safeCSV(c.nombre),
          safeCSV(c.apellido),
          safeCSV(c.email),
          safeCSV(c.telefono),
          safeCSV(c.estado ? "1" : "0"),
          safeCSV(c.id_etiqueta ?? ""),
          safeCSV(c.createdAt || ""),
          safeCSV(c.ultima_actividad || ""),
        ].join(",")
      );
    }
    const blob = new Blob([csv.join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `clientes_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }
  async function importCSV(file) {
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (!lines.length) return alert("CSV vacío");
      const [headerLine, ...rows] = lines;
      const headers = headerLine.split(",").map((h) => h.trim().toLowerCase());
      const idx = {
        nombre: headers.indexOf("nombre"),
        apellido: headers.indexOf("apellido"),
        email: headers.indexOf("email"),
        telefono: headers.indexOf("telefono"),
        estado: headers.indexOf("estado"),
        id_etiqueta: headers.indexOf("idetiqueta"),
      };
      for (const line of rows) {
        const cols = line.split(",");
        const payload = {
          nombre_cliente: idx.nombre >= 0 ? cols[idx.nombre] : "",
          apellido_cliente: idx.apellido >= 0 ? cols[idx.apellido] : "",
          email_cliente: idx.email >= 0 ? cols[idx.email] : "",
          celular_cliente: idx.telefono >= 0 ? cols[idx.telefono] : "",
          estado_cliente: idx.estado >= 0 ? Number(cols[idx.estado] || 1) : 1,
          id_etiqueta: idx.id_etiqueta >= 0 ? cols[idx.id_etiqueta] || null : null,
        };
        if (
          !payload.nombre_cliente &&
          !payload.celular_cliente &&
          !payload.email_cliente
        )
          continue;
        await chatApi.post("/clientes_chat_center/agregar", payload);
      }
      apiList(1, true);
      alert("Importación completada");
    } catch (e) {
      console.error("IMPORT:", e?.response?.data || e.message);
      alert("Error importando CSV");
    }
  }

  /* Refs */
  const fileRef = useRef(null);

  /* =================== Render =================== */
  return (
    <div className="flex h-[calc(100vh-48px)] flex-col rounded-xl border bg-white">
      {/* ====== Top Tabs + Acciones ====== */}
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <nav className="flex items-center gap-4 text-sm">
          {["All", "This or That Tag", "Test Tag List"].map((t, i) => (
            <button
              key={t}
              className={`pb-2 ${
                i === 0
                  ? "border-b-2 border-blue-600 font-medium text-blue-700"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button className="rounded-lg border bg-white p-2 hover:bg-gray-50" title="Add">
            <i className="bx bx-plus" />
          </button>
          <button className="rounded-lg border bg-white p-2 hover:bg-gray-50" title="Filter">
            <i className="bx bx-filter-alt" />
          </button>
          <button className="rounded-lg border bg-white p-2 hover:bg-gray-50" title="Automations">
            <i className="bx bx-cog" />
          </button>
          <button
            className="rounded-lg border bg-white p-2 hover:bg-gray-50"
            title="Broadcast"
            disabled={features.sms === false && features.email === false}
          >
            <i className="bx bx-mail-send" />
          </button>
          <button
            className="rounded-lg border bg-white p-2 hover:bg-gray-50"
            title="Import"
            onClick={() => fileRef.current?.click()}
          >
            <i className="bx bx-upload" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && importCSV(e.target.files[0])}
          />
          <button
            className="rounded-lg border bg-white p-2 hover:bg-gray-50"
            title="Export"
            onClick={exportCSV}
          >
            <i className="bx bx-download" />
          </button>
          <button
            disabled={!selected.length}
            onClick={() => setModalTagsOpen(true)}
            className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            title="Etiquetas (toggle)"
          >
            Etiquetas ({selected.length || 0})
          </button>
          <button className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50">
            Settings <i className="bx bx-cog" />
          </button>
        </div>
      </div>

      {/* ====== Subtoolbar ====== */}
      <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <ColumnsDropdown state={cols} setState={setCols} />

        <div className="relative flex-1 min-w-[240px] max-w-[520px]">
          <i className="bx bx-search absolute left-3 top-2.5 text-gray-500" />
          <input
            className="w-full rounded-lg border px-9 py-2 text-sm outline-none ring-1 ring-transparent transition focus:ring-blue-200"
            placeholder="Quick search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <button className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50">
          More Filters <i className="bx bx-slider-alt" />
        </button>

        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="text-gray-600">
            Total {typeof total === "number" ? total : "—"} records | {page} of{" "}
            {typeof total === "number" ? Math.max(1, Math.ceil(total / LIMIT)) : "—"} Pages
          </span>
          <div className="flex items-center gap-1">
            <label className="text-gray-500">Page Size:</label>
            <select
              className="rounded-md border bg-white px-2 py-1 text-sm"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              {[10, 20, 25, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center">
            <button
              className="rounded-l-md border px-2 py-1 hover:bg-gray-50"
              disabled={page <= 1}
              onClick={() => apiList(page - 1, true)}
              title="Anterior"
            >
              <i className="bx bx-chevron-left" />
            </button>
            <button
              className="rounded-r-md border px-2 py-1 hover:bg-gray-50"
              disabled={!hasMore}
              onClick={() => apiList(page + 1, true)}
              title="Siguiente"
            >
              <i className="bx bx-chevron-right" />
            </button>
          </div>
        </div>
      </div>

      {/* ====== Filtros ====== */}
      <div className="flex items-center gap-2 border-b px-4 py-2 text-xs">
        <div className="flex items-center gap-2">
          {["todos", "1", "0"].map((e) => (
            <button
              key={e}
              onClick={() => setEstado(e)}
              className={`rounded-full border px-3 py-1 ${
                estado === e
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              {e === "todos" ? "Todos" : e === "1" ? "Activo" : "Inactivo"}
            </button>
          ))}
        </div>

        <div className="ml-2 flex items-center gap-2">
          <TagSelect
            // Si hay varias configs en la página, mostramos la unión de todas
            options={Array.from(
              new Map(
                Object.values(catalogosPorCfg)
                  .flat()
                  .map((t) => [t.id_etiqueta || t.id, t])
              ).values()
            )}
            value={idEtiquetaFiltro}
            onChange={setIdEtiquetaFiltro}
            disabled={features.catalogo === false}
            unavailable={features.catalogo === false}
          />

          <select
            className="rounded-md border px-2 py-1"
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            title="Orden"
          >
            <option value="recientes">Más recientes</option>
            <option value="antiguos">Más antiguos</option>
            <option value="actividad_desc">Actividad (desc)</option>
            <option value="actividad_asc">Actividad (asc)</option>
          </select>

          <select
            className="rounded-md border px-2 py-1"
            value={density}
            onChange={(e) => setDensity(e.target.value)}
            title="Densidad"
          >
            <option value="compacta">Compacta</option>
            <option value="media">Media</option>
            <option value="amplia">Amplia</option>
          </select>
          <button
            onClick={() => {
              setQ("");
              setEstado("todos");
              setIdEtiquetaFiltro("");
              setOrden("recientes");
            }}
            className="rounded-md border px-2 py-1 text-gray-600 hover:bg-gray-50"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* ====== Tabla ====== */}
      <div onScroll={onScroll} className="flex-1 overflow-auto">
        <table className="min-w-full table-fixed border-separate border-spacing-0">
          <thead className={`sticky top-0 z-20 bg-white ${headPad}`}>
            <tr className="[&>th]:border-b [&>th]:px-3">
              <th className="w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                />
              </th>

              {cols.name && (
                <th className="text-left">
                  <SortButton
                    label="Name"
                    active={/recientes|antiguos/.test(orden)}
                    dir={orden === "antiguos" ? "asc" : "desc"}
                    onClick={() =>
                      setOrden((o) => (o === "recientes" ? "antiguos" : "recientes"))
                    }
                  />
                </th>
              )}
              {cols.phone && (
                <th className="w-56 text-left">
                  <SortButton
                    label="Phone"
                    active={false}
                    onClick={() => {}}
                    className="text-gray-500"
                  />
                </th>
              )}
              {cols.email && (
                <th className="w-72 text-left">
                  <SortButton
                    label="Email"
                    active={false}
                    onClick={() => {}}
                    className="text-gray-500"
                  />
                </th>
              )}
              {cols.created && (
                <th className="w-40 text-left">
                  <SortButton
                    label="Created"
                    active={/recientes|antiguos/.test(orden)}
                    dir={orden === "antiguos" ? "asc" : "desc"}
                    onClick={() =>
                      setOrden((o) => (o === "recientes" ? "antiguos" : "recientes"))
                    }
                  />
                </th>
              )}
              {cols.last_activity && (
                <th className="w-48 text-left">
                  <SortButton
                    label="Last Activity"
                    active={/actividad_/.test(orden)}
                    dir={orden === "actividad_asc" ? "asc" : "desc"}
                    onClick={() =>
                      setOrden((o) => (o === "actividad_desc" ? "actividad_asc" : "actividad_desc"))
                    }
                  />
                </th>
              )}
              {cols.tags && <th className="w-52 text-left">Tags</th>}
              <th className="w-10" />
            </tr>
          </thead>

          <tbody>
            {items.map((c, idx) => {
              const id = getId(c) ?? idx;
              const nombre = `${c.nombre || ""} ${c.apellido || ""}`.trim() || "Sin nombre";

              // Resolver etiquetas: usa el catálogo de la config del cliente
              const mapa = mapasPorCfg.get(Number(c.id_configuracion)) || new Map();
              const etiquetasUI =
                Array.isArray(c.etiquetas) && c.etiquetas.length > 0
                  ? c.etiquetas.map((t) => {
                      const tid = Number(t.id ?? t);
                      const info = mapa.get(tid);
                      return {
                        id: tid,
                        nombre: t.nombre ?? info?.nombre ?? `#${tid}`,
                        color: t.color ?? info?.color,
                      };
                    })
                  : c.id_etiqueta
                  ? [
                      {
                        id: Number(c.id_etiqueta),
                        nombre: mapa.get(Number(c.id_etiqueta))?.nombre ?? `#${c.id_etiqueta}`,
                        color: mapa.get(Number(c.id_etiqueta))?.color,
                      },
                    ]
                  : [];

              return (
                <tr
                  key={id}
                  className={`hover:bg-gray-50 [&>td]:border-b [&>td]:px-3 ${rowPad}`}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(id)}
                      onChange={() => toggleSelect(id)}
                    />
                  </td>

                  {cols.name && (
                    <td className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-[11px] font-semibold">
                          {initials(c.nombre, c.apellido)}
                        </div>
                        <div className="min-w-0">
                          <button
                            className="block truncate font-medium text-blue-700 hover:underline"
                            onClick={() => {
                              setEditing(c);
                              setDrawerOpen(true);
                            }}
                          >
                            {nombre}
                          </button>
                          <div className="truncate text-xs text-gray-500">ID {id}</div>
                        </div>
                      </div>
                    </td>
                  )}

                  {cols.phone && (
                    <td className="min-w-0">
                      <div className="flex items-center gap-2 truncate text-sm">
                        <i className="bx bx-phone" />
                        <span className="truncate">{c.telefono || "-"}</span>
                      </div>
                    </td>
                  )}

                  {cols.email && (
                    <td className="min-w-0">
                      <div className="flex items-center gap-2 truncate text-sm">
                        <i className="bx bx-envelope" />
                        <span className="truncate">{c.email || "-"}</span>
                      </div>
                    </td>
                  )}

                  {cols.created && (
                    <td className="text-sm">
                      <div>{fmtDate(c.createdAt)}</div>
                      <div className="text-xs text-gray-500">{fmtTime(c.createdAt)}</div>
                    </td>
                  )}

                  {cols.last_activity && (
                    <td className="text-sm">
                      <div className="flex items-center gap-2">
                        <i className="bx bx-phone-call text-blue-600" />
                        <span>{timeAgo(c.ultima_actividad)}</span>
                      </div>
                      <div className="text-xs text-gray-500">{fmtDateTime(c.ultima_actividad)}</div>
                    </td>
                  )}

                  {cols.tags && (
                    <td className="min-w-0">
                      <div className="flex flex-wrap gap-1">
                        {etiquetasUI.length > 0 ? (
                          etiquetasUI.map((t, i) => (
                            <Chip key={i} color={t.color}>
                              {t.nombre}
                            </Chip>
                          ))
                        ) : (
                          <span className="text-gray-400">No hay etiquetas asignadas</span>
                        )}
                      </div>
                    </td>
                  )}

                  <td className="text-right">
                    <div className="relative inline-block text-left">
                      <details>
                        <summary className="list-none inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-1 text-sm">
                          <span>⋯</span>
                        </summary>
                        <div className="absolute right-0 z-10 mt-2 w-48 overflow-hidden rounded-lg border bg-white py-1 shadow-xl">
                          <button
                            className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                            onClick={() => {
                              setEditing(c);
                              setDrawerOpen(true);
                            }}
                          >
                            Editar
                          </button>
                          <button
                            className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                              features.toggle === false ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                            disabled={features.toggle === false}
                            onClick={() => {
                              if (!selected.includes(id)) setSelected((prev) => [...prev, id]);
                              setIdConfigForTags(c.id_configuracion || idConfigForTags);
                              setModalTagsOpen(true);
                            }}
                            title={
                              features.toggle === false
                                ? "Toggle de etiquetas no disponible"
                                : "Etiquetas"
                            }
                          >
                            Etiquetas…
                          </button>
                          <button
                            className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
                            onClick={async () => {
                              if (!confirm("¿Eliminar este cliente?")) return;
                              await apiDelete(id);
                              setItems((prev) => prev.filter((x) => getId(x) !== id));
                            }}
                          >
                            Eliminar
                          </button>
                        </div>
                      </details>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={9} className="py-12 text-center text-gray-500">
                  No hay clientes para mostrar
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {loading && (
          <div className="flex items-center justify-center py-4 text-sm text-gray-500">
            Cargando…
          </div>
        )}
        {!hasMore && items.length > 0 && (
          <div className="flex items-center justify-center py-4 text-xs text-gray-400">
            No hay más resultados
          </div>
        )}
      </div>

      {/* ===== Drawer crear/editar ===== */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <h3 className="text-base font-semibold">
                {editing && getId(editing) ? "Editar cliente" : "Nuevo cliente"}
              </h3>
              <button className="rounded p-2 hover:bg-gray-100" onClick={() => setDrawerOpen(false)}>
                <i className="bx bx-x text-xl" />
              </button>
            </div>
            <div className="h-[calc(100%-108px)] overflow-y-auto px-5 py-3">
              <ClienteForm value={editing} onChange={setEditing} />
            </div>
            <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
              <button onClick={() => setDrawerOpen(false)} className="rounded-md border px-3 py-1.5 text-sm">
                Cancelar
              </button>
              <button
                onClick={onSave}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modales ===== */}
      <ModalTags
        open={modalTagsOpen}
        onClose={() => setModalTagsOpen(false)}
        onApply={async (idsEtiquetas) => {
          if (!selected.length) return alert("Selecciona al menos un cliente");
          await toggleEtiquetasBulk(selected, idsEtiquetas.map(Number));
        }}
        disabled={!selected.length}
        // catálogo de la config por defecto si existe, sino unión de todos
        catalogo={
          idConfigForTags && catalogosPorCfg[idConfigForTags]
            ? catalogosPorCfg[idConfigForTags]
            : Array.from(
                new Map(
                  Object.values(catalogosPorCfg)
                    .flat()
                    .map((t) => [t.id_etiqueta || t.id, t])
                ).values()
              )
        }
      />

      <BaseModal
        open={modalSMS.open}
        title="Enviar SMS"
        onClose={() => setModalSMS({ open: false, msg: "" })}
        footer={
          <>
            <button
              className="rounded-md border px-3 py-1.5 text-sm"
              onClick={() => setModalSMS({ open: false, msg: "" })}
            >
              Cancelar
            </button>
            <button
              disabled={!selected.length}
              onClick={async () => {
                if (!modalSMS.msg.trim()) return alert("Escribe el mensaje");
                await bulkSMS(selected, modalSMS.msg.trim());
                setModalSMS({ open: false, msg: "" });
              }}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-60"
            >
              Enviar
            </button>
          </>
        }
      >
        <p className="mb-2 text-sm text-gray-600">Mensaje a {selected.length} cliente(s).</p>
        <textarea
          className="w-full rounded-md border px-3 py-2 text-sm"
          rows={5}
          placeholder="Tu mensaje SMS…"
          value={modalSMS.msg}
          onChange={(e) => setModalSMS({ open: true, msg: e.target.value })}
        />
      </BaseModal>

      <BaseModal
        open={modalEmail.open}
        title="Enviar Email"
        onClose={() => setModalEmail({ open: false, subject: "", body: "" })}
        footer={
          <>
            <button
              className="rounded-md border px-3 py-1.5 text-sm"
              onClick={() => setModalEmail({ open: false, subject: "", body: "" })}
            >
              Cancelar
            </button>
            <button
              disabled={!selected.length}
              onClick={async () => {
                if (!modalEmail.subject.trim()) return alert("Asunto requerido");
                if (!modalEmail.body.trim()) return alert("Cuerpo requerido");
                await bulkEmail(selected, modalEmail.subject.trim(), modalEmail.body.trim());
                setModalEmail({ open: false, subject: "", body: "" });
              }}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-60"
            >
              Enviar
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <input
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Asunto"
            value={modalEmail.subject}
            onChange={(e) => setModalEmail((s) => ({ ...s, subject: e.target.value }))}
          />
          <textarea
            className="w-full rounded-md border px-3 py-2 text-sm"
            rows={8}
            placeholder="Contenido del email…"
            value={modalEmail.body}
            onChange={(e) => setModalEmail((s) => ({ ...s, body: e.target.value }))}
          />
        </div>
      </BaseModal>

      <BaseModal
        open={modalReview.open}
        title="Enviar solicitud de reseña"
        onClose={() => setModalReview({ open: false, channel: "whatsapp", link: "" })}
        footer={
          <>
            <button
              className="rounded-md border px-3 py-1.5 text-sm"
              onClick={() => setModalReview({ open: false, channel: "whatsapp", link: "" })}
            >
              Cancelar
            </button>
            <button
              disabled={!selected.length}
              onClick={async () => {
                if (!modalReview.link.trim()) return alert("Enlace requerido");
                await bulkReview(selected, modalReview.channel, modalReview.link.trim());
                setModalReview({ open: false, channel: "whatsapp", link: "" });
              }}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-60"
            >
              Enviar
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-700">Canal</label>
            <select
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={modalReview.channel}
              onChange={(e) => setModalReview((s) => ({ ...s, channel: e.target.value }))}
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700">Enlace de reseña</label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="https://g.page/r/XXXXX"
              value={modalReview.link}
              onChange={(e) => setModalReview((s) => ({ ...s, link: e.target.value }))}
            />
          </div>
          <p className="text-xs text-gray-500">Se enviará a {selected.length} cliente(s).</p>
        </div>
      </BaseModal>
    </div>
  );
}

/* ===== Formulario ===== */
function ClienteForm({ value, onChange }) {
  const v = value || {};
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-gray-700">Nombre</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            value={v.nombre || ""}
            onChange={(e) => onChange({ ...v, nombre: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700">Apellido</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            value={v.apellido || ""}
            onChange={(e) => onChange({ ...v, apellido: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-gray-700">Email</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            value={v.email || ""}
            onChange={(e) => onChange({ ...v, email: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700">Celular</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            value={v.telefono || ""}
            onChange={(e) => onChange({ ...v, telefono: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="text-xs font-medium text-gray-700">Estado</label>
          <select
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            value={v.estado ?? 1}
            onChange={(e) => onChange({ ...v, estado: Number(e.target.value) })}
          >
            <option value={1}>Activo</option>
            <option value={0}>Inactivo</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700">Id Etiqueta</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            value={v.id_etiqueta || ""}
            onChange={(e) => onChange({ ...v, id_etiqueta: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700">Id Configuración</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            value={v.id_configuracion || ""}
            onChange={(e) => onChange({ ...v, id_configuracion: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="text-xs font-medium text-gray-700">Chat cerrado</label>
          <select
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            value={v.chat_cerrado ?? 0}
            onChange={(e) => onChange({ ...v, chat_cerrado: Number(e.target.value) })}
          >
            <option value={0}>No</option>
            <option value={1}>Sí</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700">Bot OpenIA</label>
          <select
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            value={v.bot_openia ?? 1}
            onChange={(e) => onChange({ ...v, bot_openia: Number(e.target.value) })}
          >
            <option value={1}>Activo</option>
            <option value={0}>Inactivo</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700">UID Cliente</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            value={v.uid_cliente || ""}
            onChange={(e) => onChange({ ...v, uid_cliente: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-700">Imagen (URL)</label>
        <input
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          value={v.imagePath || ""}
          onChange={(e) => onChange({ ...v, imagePath: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-gray-700">Mensajes/día</label>
          <input
            type="number"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            value={v.mensajes_por_dia_cliente ?? 0}
            onChange={(e) =>
              onChange({
                ...v,
                mensajes_por_dia_cliente: Number(e.target.value) || 0,
              })
            }
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700">Pedido confirmado</label>
          <select
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            value={v.pedido_confirmado ?? 0}
            onChange={(e) => onChange({ ...v, pedido_confirmado: Number(e.target.value) })}
          >
            <option value={0}>No</option>
            <option value={1}>Sí</option>
          </select>
        </div>
      </div>
    </div>
  );
}
