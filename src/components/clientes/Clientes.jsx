import { useEffect, useMemo, useState, useRef } from "react";
import chatApi from "../../api/chatcenter";

/* =================== Utils =================== */
const fmtDate = (d) => {
  if (!d) return "-";
  const x = new Date(d);
  return isNaN(+x) ? "-" : x.toLocaleDateString();
};
const fmtDateTime = (d) => {
  if (!d) return "-";
  const x = new Date(d);
  return isNaN(+x) ? "-" : `${x.toLocaleDateString()} ${x.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};
const getId = (r) => r?.id ?? r?._id ?? r?.id_cliente ?? null;
const initials = (n, a) => {
  const s = `${n || ""} ${a || ""}`.trim();
  const i = s.split(/\s+/).map(p => p[0]).join("").slice(0,2).toUpperCase();
  return i || "?";
};
function safeCSV(v){ if(v==null) return ""; const s=String(v).replace(/"/g,'""'); return (/,|\n/.test(s))?`"${s}"`:s; }

/* Normaliza fila -> llaves del front */
function mapRow(row) {
  return {
    id: row.id,
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
    _raw: row,
  };
}

/* ====== UI base ====== */
function Drawer({ open, onClose, title, footer, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="text-base font-semibold">{title}</h3>
          <button className="rounded p-2 hover:bg-gray-100" onClick={onClose}><i className="bx bx-x text-xl" /></button>
        </div>
        <div className="h-[calc(100%-108px)] overflow-y-auto px-5 py-3">{children}</div>
        <div className="border-t px-5 py-3">{footer}</div>
      </div>
    </div>
  );
}
function Modal({ open, title, onClose, onSubmit, children, submitText="Aplicar", submitting=false, disabled=false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="text-base font-semibold">{title}</h3>
          <button className="rounded p-2 hover:bg-gray-100" onClick={onClose}><i className="bx bx-x text-xl"/></button>
        </div>
        <div className="px-5 py-3">{children}</div>
        <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
          <button className="rounded-md border px-3 py-1.5 text-sm" onClick={onClose}>Cancelar</button>
          <button disabled={disabled || submitting} onClick={onSubmit}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-60">
            {submitting ? "Procesando…" : submitText}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ====== Toolbar sticky + compacta (premium) ====== */
function Toolbar({
  search, setSearch, onRefresh, onImport, onExport, onNew,
  canBulk, onBulkAssignTags, onBulkRemoveTags, onBulkDelete,
  onBulkSMS, onBulkEmail, onBulkReview, density, setDensity
}) {
  const fileRef = useRef(null);
  return (
    <div className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="flex flex-col gap-2 p-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative w-full md:w-[32rem]">
            <i className="bx bx-search absolute left-3 top-2.5 text-gray-500" />
            <input
              className="w-full rounded-lg border px-9 py-2 text-sm outline-none ring-1 ring-transparent transition focus:ring-blue-200"
              placeholder="Buscar por nombre, email o teléfono…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button onClick={onRefresh} className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50">
            <i className="bx bx-refresh" /> Refrescar
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button disabled={!canBulk} onClick={onBulkAssignTags}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50">
            <i className="bx bx-purchase-tag-alt" /> Asignar etiquetas
          </button>
          <button disabled={!canBulk} onClick={onBulkRemoveTags}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50">
            <i className="bx bx-tag-x" /> Quitar etiquetas
          </button>
          <button disabled={!canBulk} onClick={onBulkSMS}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50">
            <i className="bx bx-message-detail" /> SMS
          </button>
          <button disabled={!canBulk} onClick={onBulkEmail}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50">
            <i className="bx bx-envelope" /> Email
          </button>
          <button disabled={!canBulk} onClick={onBulkReview}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50">
            <i className="bx bx-star" /> Reseña
          </button>

          <div className="hidden h-6 w-px bg-gray-200 md:block" />

          <button onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50">
            <i className="bx bx-upload" /> Importar
          </button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
          <button onClick={onExport}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50">
            <i className="bx bx-download" /> Exportar
          </button>
          <button onClick={onNew}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white shadow-sm hover:bg-blue-700">
            <i className="bx bx-plus" /> Nuevo
          </button>

          <div className="hidden h-6 w-px bg-gray-200 md:block" />

          {/* Densidad visual para ver más sin scroll */}
          <select
            className="rounded-lg border bg-white px-2 py-2 text-sm"
            value={density}
            onChange={(e)=>setDensity(e.target.value)}
            title="Densidad"
          >
            <option value="compacta">Compacta</option>
            <option value="media">Media</option>
            <option value="amplia">Amplia</option>
          </select>
        </div>
      </div>
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
          <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={v.nombre || ""} onChange={(e) => onChange({ ...v, nombre: e.target.value })}/>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700">Apellido</label>
          <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={v.apellido || ""} onChange={(e) => onChange({ ...v, apellido: e.target.value })}/>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-gray-700">Email</label>
          <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={v.email || ""} onChange={(e) => onChange({ ...v, email: e.target.value })}/>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700">Celular</label>
          <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={v.telefono || ""} onChange={(e) => onChange({ ...v, telefono: e.target.value })}/>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="text-xs font-medium text-gray-700">Estado</label>
          <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={v.estado ?? 1} onChange={(e)=>onChange({...v, estado: Number(e.target.value)})}>
            <option value={1}>Activo</option>
            <option value={0}>Inactivo</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700">Id Etiqueta</label>
          <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={v.id_etiqueta || ""} onChange={(e) => onChange({ ...v, id_etiqueta: e.target.value })}/>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700">Id Configuración</label>
          <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={v.id_configuracion || ""} onChange={(e) => onChange({ ...v, id_configuracion: e.target.value })}/>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="text-xs font-medium text-gray-700">Chat cerrado</label>
          <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={v.chat_cerrado ?? 0} onChange={(e)=>onChange({...v, chat_cerrado: Number(e.target.value)})}>
            <option value={0}>No</option>
            <option value={1}>Sí</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700">Bot OpenIA</label>
          <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={v.bot_openia ?? 1} onChange={(e)=>onChange({...v, bot_openia: Number(e.target.value)})}>
            <option value={1}>Activo</option>
            <option value={0}>Inactivo</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700">UID Cliente</label>
          <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={v.uid_cliente || ""} onChange={(e)=>onChange({...v, uid_cliente: e.target.value})}/>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-700">Imagen (URL)</label>
        <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={v.imagePath || ""} onChange={(e)=>onChange({...v, imagePath: e.target.value})}/>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-gray-700">Mensajes/día</label>
          <input type="number" className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={v.mensajes_por_dia_cliente ?? 0} onChange={(e)=>onChange({...v, mensajes_por_dia_cliente: Number(e.target.value)||0})}/>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700">Pedido confirmado</label>
          <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={v.pedido_confirmado ?? 0} onChange={(e)=>onChange({...v, pedido_confirmado: Number(e.target.value)})}>
            <option value={0}>No</option>
            <option value={1}>Sí</option>
          </select>
        </div>
      </div>
    </div>
  );
}

/* =========================== Vista principal =========================== */
export default function Clientes() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // densidad visual para ver más alto sin scroll
  const [density, setDensity] = useState("compacta"); // compacta | media | amplia
  const rowPad = density === "compacta" ? "py-2" : density === "media" ? "py-2.5" : "py-3";
  const headPad = density === "compacta" ? "py-2" : density === "media" ? "py-2.5" : "py-3";

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 25;

  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("todos");
  const [idEtiqueta, setIdEtiqueta] = useState("");
  const [orden, setOrden] = useState("recientes");

  const [selected, setSelected] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [modalTags, setModalTags] = useState({ open: false, mode: "add", value: "" });
  const [modalSMS, setModalSMS] = useState({ open: false, msg: "" });
  const [modalEmail, setModalEmail] = useState({ open: false, subject: "", body: "" });
  const [modalReview, setModalReview] = useState({ open: false, channel: "whatsapp", link: "" });

  /* ========== API existentes ========== */
  async function apiList(p=1, replace=false) {
    setLoading(true);
    try {
      const params = {
        page: p, limit: LIMIT, sort: orden,
        q: q || undefined,
        estado: estado !== "todos" ? estado : undefined,
        id_etiqueta: idEtiqueta || undefined,
      };
      const { data } = await chatApi.get("/clientes_chat_center/listar", { params });
      const rows = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
      const mapped = rows.map(mapRow);
      const total = data?.total ?? undefined;

      setItems(prev => replace ? mapped : [...prev, ...mapped]);
      setPage(p);
      setHasMore(typeof total === "number" ? (p*LIMIT < total) : (mapped.length === LIMIT));
    } catch (e) {
      console.error("LIST:", e?.response?.data || e.message);
    } finally {
      setLoading(false);
    }
  }
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
    const { data } = await chatApi.put(`/clientes_chat_center/actualizar/${id}`, payload);
    return mapRow(data?.data || data);
  }
  async function apiDelete(id) { await chatApi.delete(`/clientes_chat_center/eliminar/${id}`); }
  async function apiDeleteBulk(ids) {
    try { await chatApi.post(`/clientes_chat_center/eliminar`, { ids }); }
    catch { for (const id of ids) await apiDelete(id); }
    return true;
  }

  /* ========== Futuros (stubs) ========== */
  async function callFutureEndpoint(fn, label) {
    try { await fn(); alert(`${label} enviada ✅`); }
    catch (e) {
      const s = e?.response?.status;
      if (s === 404 || s === 501) alert(`${label}: pendiente backend`);
      else { console.error(e?.response?.data || e.message); alert(`Error en ${label}`); }
    }
  }
  const bulkAssignTags = (ids,tags)=>callFutureEndpoint(()=>chatApi.post("/clientes_chat_center/etiquetas/agregar",{ids,etiquetas:tags}),"Asignar etiquetas");
  const bulkRemoveTags = (ids,tags)=>callFutureEndpoint(()=>chatApi.post("/clientes_chat_center/etiquetas/remover",{ids,etiquetas:tags}),"Quitar etiquetas");
  const bulkSMS       = (ids,mensaje)=>callFutureEndpoint(()=>chatApi.post("/clientes_chat_center/sms/enviar",{ids,mensaje}),"Enviar SMS");
  const bulkEmail     = (ids,subject,body)=>callFutureEndpoint(()=>chatApi.post("/clientes_chat_center/email/enviar",{ids,subject,body}),"Enviar Email");
  const bulkReview    = (ids,channel,link)=>callFutureEndpoint(()=>chatApi.post("/clientes_chat_center/resenas/enviar",{ids,channel,link}),"Solicitud de reseña");

  /* ===== Efectos ===== */
  useEffect(() => { setItems([]); setPage(1); setHasMore(true); apiList(1, true); }, [q, estado, idEtiqueta, orden]);

  function onScroll(e) {
    if (loading || !hasMore) return;
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 16) apiList(page + 1);
  }

  /* ===== Selección ===== */
  const allSelected = useMemo(() => {
    const ids = items.map(getId).filter(Boolean);
    return ids.length > 0 && ids.every(id => selected.includes(id));
  }, [items, selected]);
  const toggleSelectAll = (v)=>setSelected(v ? items.map(getId).filter(Boolean) : []);
  const toggleSelect = (id)=>setSelected(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);

  /* ===== Guardar ===== */
  async function onSave() {
    try {
      if (!editing?.nombre && !editing?.telefono && !editing?.email) return alert("Ingresa al menos nombre, teléfono o email");
      const id = getId(editing);
      if (id) {
        const updated = await apiUpdate(id, editing);
        setItems(prev => prev.map(x => getId(x) === id ? updated : x));
      } else {
        const created = await apiCreate(editing);
        setItems(prev => [created, ...prev]);
      }
      setDrawerOpen(false); setEditing(null);
    } catch (e) { console.error("SAVE:", e?.response?.data || e.message); alert("No se pudo guardar"); }
  }

  /* ===== Eliminar ===== */
  async function onDeleteSelected() {
    if (!selected.length) return;
    if (!confirm(`¿Eliminar ${selected.length} cliente(s)?`)) return;
    await apiDeleteBulk(selected);
    setItems(prev => prev.filter(x => !selected.includes(getId(x))));
    setSelected([]);
  }

  /* ===== Exportar/Importar ===== */
  function exportCSV() {
    const headers = ["Nombre","Apellido","Email","Telefono","Estado","IdEtiqueta","Creado","UltActividad"];
    const csv = [headers.join(",")];
    for (const c of items) {
      csv.push([
        safeCSV(c.nombre), safeCSV(c.apellido), safeCSV(c.email), safeCSV(c.telefono),
        safeCSV(c.estado ? "1" : "0"), safeCSV(c.id_etiqueta ?? ""), safeCSV(c.createdAt || ""), safeCSV(c.ultima_actividad || "")
      ].join(","));
    }
    const blob = new Blob([csv.join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `clientes_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  }
  async function importCSV(file) {
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (!lines.length) return alert("CSV vacío");
      const [headerLine, ...rows] = lines;
      const headers = headerLine.split(",").map(h=>h.trim().toLowerCase());
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
          nombre_cliente: idx.nombre>=0? cols[idx.nombre] : "",
          apellido_cliente: idx.apellido>=0? cols[idx.apellido] : "",
          email_cliente: idx.email>=0? cols[idx.email] : "",
          celular_cliente: idx.telefono>=0? cols[idx.telefono] : "",
          estado_cliente: idx.estado>=0? Number(cols[idx.estado]||1) : 1,
          id_etiqueta: idx.id_etiqueta>=0? cols[idx.id_etiqueta] || null : null,
        };
        if (!payload.nombre_cliente && !payload.celular_cliente && !payload.email_cliente) continue;
        await chatApi.post("/clientes_chat_center/agregar", payload);
      }
      apiList(1,true); alert("Importación completada");
    } catch (e) { console.error("IMPORT:", e?.response?.data || e.message); alert("Error importando CSV"); }
  }

  /* =================== Render =================== */
  return (
    <div className="flex h-[calc(100vh-48px)] gap-3 p-3"> {/* más alto útil */}
      {/* Sidebar compacta */}
      <aside className="hidden w-64 shrink-0 rounded-xl border bg-white p-3 md:block">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">Filtros</h3>
          <button onClick={()=>{setQ('');setEstado('todos');setIdEtiqueta('');setOrden('recientes')}}
                  className="text-xs text-blue-600 hover:underline">Limpiar</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Estado</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {['todos','1','0'].map(e=>(
                <button key={e} onClick={()=>setEstado(e)}
                  className={`rounded-lg border px-2 py-1 text-xs ${estado===e?'border-blue-600 ring-2 ring-blue-200':''}`}>
                  {e==='todos'?'Todos':(e==='1'?'Activo':'Inactivo')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">Etiqueta (id)</label>
            <input className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm" value={idEtiqueta}
                   onChange={(e)=>setIdEtiqueta(e.target.value)} placeholder="ID etiqueta…" />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">Orden</label>
            <select className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm" value={orden} onChange={(e)=>setOrden(e.target.value)}>
              <option value="recientes">Más recientes</option>
              <option value="antiguos">Más antiguos</option>
              <option value="actividad_desc">Actividad (desc)</option>
              <option value="actividad_asc">Actividad (asc)</option>
            </select>
          </div>
        </div>
      </aside>

      {/* Columna principal */}
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-white">
        <Toolbar
          search={q}
          setSearch={setQ}
          onRefresh={()=>apiList(1,true)}
          onImport={importCSV}
          onExport={exportCSV}
          onNew={()=>{ setEditing({ nombre:'', apellido:'', email:'', telefono:'', estado:1, id_etiqueta:null, id_configuracion:null, chat_cerrado:0, bot_openia:1 }); setDrawerOpen(true); }}
          canBulk={selected.length>0}
          onBulkAssignTags={()=>setModalTags({ open: true, mode: "add", value: "" })}
          onBulkRemoveTags={()=>setModalTags({ open: true, mode: "remove", value: "" })}
          onBulkDelete={onDeleteSelected}
          onBulkSMS={()=>setModalSMS({ open: true, msg: "" })}
          onBulkEmail={()=>setModalEmail({ open: true, subject:"", body:"" })}
          onBulkReview={()=>setModalReview({ open: true, channel:"whatsapp", link:"" })}
          density={density}
          setDensity={setDensity}
        />

        {/* Tabla */}
        <div onScroll={onScroll} className="flex-1 overflow-auto">
          <table className="min-w-full table-fixed border-separate border-spacing-0">
            <thead className={`sticky top-0 z-20 bg-white ${headPad}`}>
              <tr className="[&>th]:border-b [&>th]:px-3">
                <th className="w-10"><input type="checkbox" checked={allSelected} onChange={(e)=>toggleSelectAll(e.target.checked)} /></th>
                <th className="w-10"></th>
                <th className="text-left text-[11px] font-semibold tracking-wide text-gray-500">CLIENTE</th>
                <th className="w-64 text-left text-[11px] font-semibold tracking-wide text-gray-500">CONTACTO</th>
                <th className="w-28 text-left text-[11px] font-semibold tracking-wide text-gray-500">ESTADO</th>
                <th className="w-36 text-left text-[11px] font-semibold tracking-wide text-gray-500">CREADO</th>
                <th className="w-40 text-left text-[11px] font-semibold tracking-wide text-gray-500">ÚLT. ACTIVIDAD</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {items.map((c, idx) => {
                const id = getId(c) ?? idx;
                const nombre = `${c.nombre || ""} ${c.apellido || ""}`.trim() || "Sin nombre";
                return (
                  <tr key={id} className={`hover:bg-gray-50 [&>td]:border-b [&>td]:px-3 ${rowPad}`}>
                    <td><input type="checkbox" checked={selected.includes(id)} onChange={()=>toggleSelect(id)} /></td>
                    <td>
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-[11px] font-semibold">{initials(c.nombre, c.apellido)}</div>
                    </td>
                    <td className="min-w-0">
                      <button className="block truncate font-medium text-blue-700 hover:underline" onClick={()=>{setEditing(c); setDrawerOpen(true);}}>
                        {nombre}
                      </button>
                    </td>
                    <td className="min-w-0">
                      <div className="truncate text-sm">{c.email || "-"}</div>
                      <div className="truncate text-xs text-gray-600">{c.telefono || "-"}</div>
                    </td>
                    <td className="text-sm">{c.estado ? "Activo" : "Inactivo"}</td>
                    <td className="text-sm">{fmtDate(c.createdAt)}</td>
                    <td className="text-sm">{fmtDateTime(c.ultima_actividad)}</td>
                    <td className="text-right">
                      <div className="relative inline-block text-left">
                        <details>
                          <summary className="list-none cursor-pointer inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-sm">
                            Acciones <i className="bx bx-chevron-down" />
                          </summary>
                          <div className="absolute right-0 z-10 mt-2 w-44 overflow-hidden rounded-lg border bg-white py-1 shadow-xl">
                            <button className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50" onClick={()=>{setEditing(c); setDrawerOpen(true);}}>Editar</button>
                            <button className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
                              onClick={async()=>{ if(!confirm('¿Eliminar este cliente?')) return; await apiDelete(id); setItems(prev=>prev.filter(x=>getId(x)!==id)); }}>
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
                <tr><td colSpan={8} className="py-12 text-center text-gray-500">No hay clientes para mostrar</td></tr>
              )}
            </tbody>
          </table>
          {loading && <div className="flex items-center justify-center py-4 text-sm text-gray-500">Cargando…</div>}
          {!hasMore && items.length > 0 && <div className="flex items-center justify-center py-4 text-xs text-gray-400">No hay más resultados</div>}
        </div>
      </section>

      {/* Drawer crear/editar */}
      <Drawer
        open={drawerOpen}
        onClose={()=>setDrawerOpen(false)}
        title={editing && getId(editing) ? "Editar cliente" : "Nuevo cliente"}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button onClick={()=>setDrawerOpen(false)} className="rounded-md border px-3 py-1.5 text-sm">Cancelar</button>
            <button onClick={async()=>{
              try{
                if (!editing?.nombre && !editing?.telefono && !editing?.email) return alert("Ingresa al menos nombre, teléfono o email");
                const id = getId(editing);
                if (id) {
                  const updated = await apiUpdate(id, editing);
                  setItems(prev => prev.map(x => getId(x) === id ? updated : x));
                } else {
                  const created = await apiCreate(editing);
                  setItems(prev => [created, ...prev]);
                }
                setDrawerOpen(false); setEditing(null);
              }catch(e){ console.error(e); alert("No se pudo guardar"); }
            }} className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
              Guardar
            </button>
          </div>
        }
      >
        <ClienteForm value={editing} onChange={setEditing} />
      </Drawer>

      {/* Modales de acciones futuras */}
      <Modal
        open={modalTags.open}
        title={(modalTags.mode === "add" ? "Asignar" : "Quitar") + " etiquetas"}
        onClose={()=>setModalTags({ open:false, mode:"add", value:"" })}
        onSubmit={async ()=>{
          const ids = selected;
          const tags = modalTags.value.split(",").map(t=>t.trim()).filter(Boolean);
          if (!tags.length) return alert("Escribe al menos una etiqueta");
          if (modalTags.mode === "add") await bulkAssignTags(ids, tags);
          else await bulkRemoveTags(ids, tags);
          setModalTags({ open:false, mode:"add", value:"" });
        }}
        submitText="Aplicar"
        disabled={!selected.length}
      >
        <p className="mb-2 text-sm text-gray-600">Escribe etiquetas separadas por coma. Afectará a {selected.length} cliente(s).</p>
        <input className="w-full rounded-md border px-3 py-2 text-sm" placeholder="vip, follow-up, lead"
               value={modalTags.value} onChange={(e)=>setModalTags(s=>({ ...s, value: e.target.value }))}/>
        <div className="mt-2 flex gap-2">
          <button className="rounded border px-2 py-1 text-xs" onClick={()=>setModalTags(s=>({ ...s, mode:"add" }))}>Asignar</button>
          <button className="rounded border px-2 py-1 text-xs" onClick={()=>setModalTags(s=>({ ...s, mode:"remove" }))}>Quitar</button>
        </div>
      </Modal>

      <Modal
        open={modalSMS.open}
        title="Enviar SMS"
        onClose={()=>setModalSMS({ open:false, msg:"" })}
        onSubmit={async ()=>{
          if (!modalSMS.msg.trim()) return alert("Escribe el mensaje");
          await bulkSMS(selected, modalSMS.msg.trim());
          setModalSMS({ open:false, msg:"" });
        }}
        submitText="Enviar"
        disabled={!selected.length}
      >
        <p className="mb-2 text-sm text-gray-600">Mensaje a {selected.length} cliente(s).</p>
        <textarea className="w-full rounded-md border px-3 py-2 text-sm" rows={5} placeholder="Tu mensaje SMS…"
                  value={modalSMS.msg} onChange={(e)=>setModalSMS({ open:true, msg:e.target.value })}/>
      </Modal>

      <Modal
        open={modalEmail.open}
        title="Enviar Email"
        onClose={()=>setModalEmail({ open:false, subject:"", body:"" })}
        onSubmit={async ()=>{
          if (!modalEmail.subject.trim()) return alert("Asunto requerido");
          if (!modalEmail.body.trim()) return alert("Cuerpo requerido");
          await bulkEmail(selected, modalEmail.subject.trim(), modalEmail.body.trim());
          setModalEmail({ open:false, subject:"", body:"" });
        }}
        submitText="Enviar"
        disabled={!selected.length}
      >
        <div className="space-y-3">
          <input className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Asunto"
                 value={modalEmail.subject} onChange={(e)=>setModalEmail(s=>({ ...s, subject: e.target.value }))}/>
          <textarea className="w-full rounded-md border px-3 py-2 text-sm" rows={8} placeholder="Contenido del email…"
                    value={modalEmail.body} onChange={(e)=>setModalEmail(s=>({ ...s, body: e.target.value }))}/>
        </div>
      </Modal>

      <Modal
        open={modalReview.open}
        title="Enviar solicitud de reseña"
        onClose={()=>setModalReview({ open:false, channel:"whatsapp", link:"" })}
        onSubmit={async ()=>{
          if (!modalReview.link.trim()) return alert("Enlace requerido");
          await bulkReview(selected, modalReview.channel, modalReview.link.trim());
          setModalReview({ open:false, channel:"whatsapp", link:"" });
        }}
        submitText="Enviar"
        disabled={!selected.length}
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-700">Canal</label>
            <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    value={modalReview.channel} onChange={(e)=>setModalReview(s=>({ ...s, channel: e.target.value }))}>
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700">Enlace de reseña</label>
            <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm" placeholder="https://g.page/r/XXXXX"
                   value={modalReview.link} onChange={(e)=>setModalReview(s=>({ ...s, link: e.target.value }))}/>
          </div>
          <p className="text-xs text-gray-500">Se enviará a {selected.length} cliente(s).</p>
        </div>
      </Modal>
    </div>
  );
}
