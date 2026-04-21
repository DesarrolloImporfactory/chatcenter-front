// src/components/admin/AdminUsuarios.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import toast from "react-hot-toast";
import chatApi from "../../api/chatcenter";

/* ═══════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════ */
const fmtDate = (d) => {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "—";
    return dt.toLocaleDateString("es-EC", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
};

const fmtDateTime = (d) => {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    return dt.toLocaleString("es-EC", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
};

const fmtMoney = (n) => {
  if (n === null || n === undefined || n === "") return "—";
  const v = Number(n);
  if (Number.isNaN(v)) return "—";
  return `$${v.toFixed(2)}`;
};

const fmtNumber = (n) => {
  const v = Number(n) || 0;
  return v.toLocaleString("es-EC");
};

const relativo = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  const diff = Date.now() - dt.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `hace ${days}d`;
  const mos = Math.floor(days / 30);
  if (mos < 12) return `hace ${mos}mes`;
  const yrs = Math.floor(mos / 12);
  return `hace ${yrs}a`;
};

const copiarClipboard = (txt, label = "Copiado") => {
  navigator.clipboard?.writeText(txt || "");
  toast.success(label);
};

/** Botón icono para copiar — no propaga el click (para que no abra el drawer) */
function CopyBtn({ text, label = "Copiado", title = "Copiar" }) {
  const [copied, setCopied] = useState(false);
  const onClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    toast.success(label);
    setTimeout(() => setCopied(false), 1400);
  };
  if (!text) return null;
  return (
    <button
      onClick={onClick}
      title={title}
      className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-slate-100 text-slate-400 hover:text-cyan-600 transition flex-shrink-0"
    >
      <i
        className={`bx ${copied ? "bx-check text-emerald-500" : "bx-copy"} text-sm`}
      />
    </button>
  );
}

const semaforoStyle = {
  verde: {
    dot: "bg-emerald-500",
    chip: "text-emerald-700 bg-emerald-50 ring-emerald-200",
    label: "Al día",
  },
  amarillo: {
    dot: "bg-amber-500",
    chip: "text-amber-700 bg-amber-50 ring-amber-200",
    label: "Por vencer",
  },
  rojo: {
    dot: "bg-rose-500",
    chip: "text-rose-700 bg-rose-50 ring-rose-200",
    label: "Vencido",
  },
  gris: {
    dot: "bg-slate-400",
    chip: "text-slate-600 bg-slate-50 ring-slate-200",
    label: "Sin plan",
  },
};

const estadoBadge = {
  activo: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  inactivo: "bg-slate-50 text-slate-700 ring-slate-200",
  suspendido: "bg-orange-50 text-orange-700 ring-orange-200",
  vencido: "bg-rose-50 text-rose-700 ring-rose-200",
  cancelado: "bg-rose-50 text-rose-700 ring-rose-200",
  trial_usage: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  promo_usage: "bg-violet-50 text-violet-700 ring-violet-200",
};

/* Etiquetas legibles de filtros para los chips */
const FILTER_LABELS = {
  estado: "Estado",
  id_plan: "Plan",
  semaforo: "Semáforo",
  tipo_plan: "Tipo",
  stripe_status: "Stripe",
  tools_access: "Producto",
  cancel_at_period_end: "Cancel. programada",
  permanente: "Permanentes",
  con_whatsapp_activo: "Con WhatsApp",
  sin_plan: "Sin plan",
  fecha_registro_desde: "Registro desde",
  fecha_registro_hasta: "Registro hasta",
  fecha_renovacion_desde: "Renov. desde",
  fecha_renovacion_hasta: "Renov. hasta",
};

/* ═══════════════════════════════════════════════════════════════
   Componente principal
   ═══════════════════════════════════════════════════════════════ */
export default function AdminUsuarios() {
  const navigate = useNavigate();

  /* ── Data ── */
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [kpis, setKpis] = useState(null);
  const [planes, setPlanes] = useState([]);

  /* ── Paginación + orden ── */
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [orderBy, setOrderBy] = useState("fecha_registro");
  const [orderDir, setOrderDir] = useState("DESC");

  /* ── Filtros ── */
  const [search, setSearch] = useState("");
  const [searchDebounce, setSearchDebounce] = useState("");
  const [estado, setEstado] = useState("");
  const [idPlan, setIdPlan] = useState("");
  const [semaforo, setSemaforo] = useState("");
  const [tipoPlan, setTipoPlan] = useState("");
  const [stripeStatus, setStripeStatus] = useState("");
  const [toolsAccess, setToolsAccess] = useState("");
  const [cancelPeriodEnd, setCancelPeriodEnd] = useState(false);
  const [permanente, setPermanente] = useState(false);
  const [conWhatsapp, setConWhatsapp] = useState(false);
  const [sinPlan, setSinPlan] = useState(false);
  const [porVencer7d, setPorVencer7d] = useState(false);
  const [estadoTrialOPromo, setEstadoTrialOPromo] = useState(false);
  const [nuevos30d, setNuevos30d] = useState(false);
  const [fechaRegDesde, setFechaRegDesde] = useState("");
  const [fechaRegHasta, setFechaRegHasta] = useState("");
  const [fechaRenDesde, setFechaRenDesde] = useState("");
  const [fechaRenHasta, setFechaRenHasta] = useState("");
  const [filtrosAvanzadosOpen, setFiltrosAvanzadosOpen] = useState(false);

  /* ── Drawer ── */
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleData, setDetalleData] = useState(null);
  const [detalleLoading, setDetalleLoading] = useState(false);

  /* ── Export ── */
  const [exportando, setExportando] = useState(false);

  /* ── Debounce búsqueda ── */
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounce(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  /* ── Body filtros ── */
  const filtrosBody = useMemo(
    () => ({
      search: searchDebounce,
      estado,
      id_plan: idPlan,
      semaforo,
      tipo_plan: tipoPlan,
      stripe_status: stripeStatus,
      tools_access: toolsAccess,
      cancel_at_period_end: cancelPeriodEnd ? 1 : undefined,
      permanente: permanente ? 1 : undefined,
      con_whatsapp_activo: conWhatsapp ? 1 : undefined,
      sin_plan: sinPlan ? 1 : undefined,
      por_vencer_7d: porVencer7d ? 1 : undefined,
      estado_trial_o_promo: estadoTrialOPromo ? 1 : undefined,
      nuevos_30d: nuevos30d ? 1 : undefined,
      fecha_registro_desde: fechaRegDesde || undefined,
      fecha_registro_hasta: fechaRegHasta || undefined,
      fecha_renovacion_desde: fechaRenDesde || undefined,
      fecha_renovacion_hasta: fechaRenHasta || undefined,
    }),
    [
      searchDebounce,
      estado,
      idPlan,
      semaforo,
      tipoPlan,
      stripeStatus,
      toolsAccess,
      cancelPeriodEnd,
      permanente,
      conWhatsapp,
      sinPlan,
      porVencer7d,
      estadoTrialOPromo,
      nuevos30d,
      fechaRegDesde,
      fechaRegHasta,
      fechaRenDesde,
      fechaRenHasta,
    ],
  );

  /* ── Chips de filtros activos ── */
  const activeFilters = useMemo(() => {
    const chips = [];
    const estadoMap = {
      activo: "Activo",
      inactivo: "Inactivo",
      suspendido: "Suspendido",
      vencido: "Vencido",
      cancelado: "Cancelado",
      trial_usage: "Trial",
      promo_usage: "Promo",
    };
    const semMap = {
      verde: "Al día",
      amarillo: "Por vencer",
      rojo: "Vencido",
      gris: "Sin plan",
    };
    const prodMap = {
      imporchat: "Solo ImporChat",
      insta_landing: "Solo Insta Landing",
      both: "Ambos",
    };
    const tipoMap = {
      mensual: "Mensual",
      conversaciones: "Por conversaciones",
    };

    if (estado)
      chips.push({
        key: "estado",
        value: estado,
        label: `Estado: ${estadoMap[estado] || estado}`,
        clear: () => setEstado(""),
      });
    if (idPlan) {
      const p = planes.find((p) => String(p.id_plan) === String(idPlan));
      chips.push({
        key: "id_plan",
        value: idPlan,
        label: `Plan: ${p?.nombre_plan || idPlan}`,
        clear: () => setIdPlan(""),
      });
    }
    if (semaforo)
      chips.push({
        key: "semaforo",
        value: semaforo,
        label: `Semáforo: ${semMap[semaforo]}`,
        clear: () => setSemaforo(""),
      });
    if (tipoPlan)
      chips.push({
        key: "tipo_plan",
        value: tipoPlan,
        label: `Tipo: ${tipoMap[tipoPlan]}`,
        clear: () => setTipoPlan(""),
      });
    if (stripeStatus)
      chips.push({
        key: "stripe_status",
        value: stripeStatus,
        label: `Stripe: ${stripeStatus}`,
        clear: () => setStripeStatus(""),
      });
    if (toolsAccess)
      chips.push({
        key: "tools_access",
        value: toolsAccess,
        label: `Producto: ${prodMap[toolsAccess]}`,
        clear: () => setToolsAccess(""),
      });
    if (cancelPeriodEnd)
      chips.push({
        key: "cancel",
        value: 1,
        label: "Cancel. programada",
        clear: () => setCancelPeriodEnd(false),
      });
    if (permanente)
      chips.push({
        key: "permanente",
        value: 1,
        label: "Permanentes",
        clear: () => setPermanente(false),
      });
    if (conWhatsapp)
      chips.push({
        key: "conWhatsapp",
        value: 1,
        label: "Con WhatsApp activo",
        clear: () => setConWhatsapp(false),
      });
    if (sinPlan)
      chips.push({
        key: "sinPlan",
        value: 1,
        label: "Sin plan",
        clear: () => setSinPlan(false),
      });
    if (porVencer7d)
      chips.push({
        key: "porVencer7d",
        value: 1,
        label: "Por vencer 7d",
        clear: () => setPorVencer7d(false),
      });
    if (estadoTrialOPromo)
      chips.push({
        key: "trialOPromo",
        value: 1,
        label: "Trial + Promo",
        clear: () => setEstadoTrialOPromo(false),
      });
    if (nuevos30d)
      chips.push({
        key: "nuevos30d",
        value: 1,
        label: "Nuevos 30d",
        clear: () => setNuevos30d(false),
      });
    if (fechaRegDesde)
      chips.push({
        key: "regDesde",
        value: fechaRegDesde,
        label: `Registro ≥ ${fechaRegDesde}`,
        clear: () => setFechaRegDesde(""),
      });
    if (fechaRegHasta)
      chips.push({
        key: "regHasta",
        value: fechaRegHasta,
        label: `Registro ≤ ${fechaRegHasta}`,
        clear: () => setFechaRegHasta(""),
      });
    if (fechaRenDesde)
      chips.push({
        key: "renDesde",
        value: fechaRenDesde,
        label: `Renov. ≥ ${fechaRenDesde}`,
        clear: () => setFechaRenDesde(""),
      });
    if (fechaRenHasta)
      chips.push({
        key: "renHasta",
        value: fechaRenHasta,
        label: `Renov. ≤ ${fechaRenHasta}`,
        clear: () => setFechaRenHasta(""),
      });
    return chips;
  }, [
    estado,
    idPlan,
    semaforo,
    tipoPlan,
    stripeStatus,
    toolsAccess,
    cancelPeriodEnd,
    permanente,
    conWhatsapp,
    sinPlan,
    porVencer7d,
    estadoTrialOPromo,
    nuevos30d,
    fechaRegDesde,
    fechaRegHasta,
    fechaRenDesde,
    fechaRenHasta,
    planes,
  ]);

  /* ── Fetch lista ── */
  const fetchLista = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await chatApi.post("admin_usuarios/listar", {
        ...filtrosBody,
        page,
        limit,
        order_by: orderBy,
        order_dir: orderDir,
      });
      setRows(data.data || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      console.error(err);
      if (err?.response?.status === 403) {
        Swal.fire({
          icon: "error",
          title: "Acceso denegado",
          text: err?.response?.data?.message || "Solo super administradores.",
        }).then(() => navigate("/chatboard"));
        return;
      }
      toast.error("Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  }, [filtrosBody, page, limit, orderBy, orderDir, navigate]);

  /* ── Fetch KPIs + planes ── */
  const fetchKpisAndPlans = useCallback(async () => {
    try {
      const [kRes, pRes] = await Promise.all([
        chatApi.get("admin_usuarios/kpis"),
        chatApi.get("planes/listarPlanes"),
      ]);
      setKpis(kRes.data?.data || null);
      setPlanes(pRes.data?.data || []);
    } catch (err) {
      console.error("Error KPIs/planes:", err);
    }
  }, []);

  useEffect(() => {
    fetchKpisAndPlans();
  }, [fetchKpisAndPlans]);
  useEffect(() => {
    fetchLista();
  }, [fetchLista]);
  useEffect(() => {
    setPage(1);
  }, [filtrosBody]);

  /* ── Drawer ── */
  const abrirDetalle = async (id_usuario) => {
    setDetalleOpen(true);
    setDetalleLoading(true);
    setDetalleData(null);
    try {
      const { data } = await chatApi.get(
        `admin_usuarios/detalle/${id_usuario}`,
      );
      setDetalleData(data.data);
    } catch (err) {
      toast.error("No se pudo cargar el detalle");
      setDetalleOpen(false);
    } finally {
      setDetalleLoading(false);
    }
  };

  /* ── Orden ── */
  const toggleOrden = (col) => {
    if (orderBy === col) {
      setOrderDir((d) => (d === "ASC" ? "DESC" : "ASC"));
    } else {
      setOrderBy(col);
      setOrderDir("DESC");
    }
  };

  /* ── Export ── */
  const exportarExcel = async () => {
    setExportando(true);
    try {
      const res = await chatApi.post("admin_usuarios/exportar", filtrosBody, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      const fecha = new Date().toISOString().split("T")[0];
      a.download = `usuarios_admin_${fecha}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Excel descargado");
    } catch (err) {
      toast.error("Error al exportar");
    } finally {
      setExportando(false);
    }
  };

  /* ── Refresh ── */
  const refrescar = () => {
    fetchLista();
    fetchKpisAndPlans();
    toast.success("Actualizado");
  };

  /* ── Limpiar filtros ── */
  const limpiarFiltros = () => {
    setSearch("");
    setEstado("");
    setIdPlan("");
    setSemaforo("");
    setTipoPlan("");
    setStripeStatus("");
    setToolsAccess("");
    setCancelPeriodEnd(false);
    setPermanente(false);
    setConWhatsapp(false);
    setSinPlan(false);
    setPorVencer7d(false);
    setEstadoTrialOPromo(false);
    setNuevos30d(false);
    setFechaRegDesde("");
    setFechaRegHasta("");
    setFechaRenDesde("");
    setFechaRenHasta("");
  };

  const hayFiltrosAvanzados =
    tipoPlan ||
    stripeStatus ||
    fechaRegDesde ||
    fechaRegHasta ||
    fechaRenDesde ||
    fechaRenHasta;

  /* ══════ Handler: click en tarjeta KPI = toggle filtro
           Las tarjetas son MUTUAMENTE EXCLUYENTES entre sí:
           solo una puede estar activa a la vez.
           Los toggles/filtros de abajo sí se pueden combinar.       ══════ */
  const onKpiClick = (key) => {
    // "Total" = reset completo (limpia TODO, incluso filtros de abajo)
    if (key === "total") {
      limpiarFiltros();
      return;
    }

    const isActive = activeKpi === key;

    // 1) Limpiar TODOS los filtros que controla cualquier KPI
    //    (estado + los 3 pseudo-filtros). Así garantizamos exclusividad.
    setEstado("");
    setPorVencer7d(false);
    setEstadoTrialOPromo(false);
    setNuevos30d(false);

    // 2) Si el KPI ya estaba activo, queda todo limpio (toggle off)
    if (isActive) return;

    // 3) Si no estaba activo, aplicar su filtro
    switch (key) {
      case "activos":
        setEstado("activo");
        break;
      case "vencidos":
        setEstado("vencido");
        break;
      case "suspendidos":
        setEstado("suspendido");
        break;
      case "por_vencer_7d":
        setPorVencer7d(true);
        break;
      case "trial_promo":
        setEstadoTrialOPromo(true);
        break;
      case "nuevos_30d":
        setNuevos30d(true);
        break;
      default:
    }
  };

  /* Qué KPI está "activo" visualmente */
  const activeKpi =
    estado === "activo"
      ? "activos"
      : estado === "vencido"
        ? "vencidos"
        : estado === "suspendido"
          ? "suspendidos"
          : porVencer7d
            ? "por_vencer_7d"
            : estadoTrialOPromo
              ? "trial_promo"
              : nuevos30d
                ? "nuevos_30d"
                : null;

  return (
    <div className="w-full min-w-0 p-4 md:p-6 space-y-4">
      {/* ═══ HEADER ═══ */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="mt-2 text-2xl md:text-3xl font-extrabold text-[#0B1426] tracking-tight">
            Panel de Usuarios{" "}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestión completa de suscripciones, pagos e implementaciones.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refrescar}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white text-slate-700 ring-1 ring-slate-200 font-semibold text-sm hover:bg-slate-50 transition"
            title="Refrescar"
          >
            <i className="bx bx-refresh text-lg" />
          </button>
          <button
            onClick={exportarExcel}
            disabled={exportando || loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0B1426] text-white font-semibold text-sm hover:bg-[#162138] disabled:opacity-50 transition shadow-sm"
          >
            <i
              className={`bx ${exportando ? "bx-loader-alt bx-spin" : "bx-export"} text-lg`}
            />
            {exportando ? "Exportando…" : "Exportar Excel"}
          </button>
        </div>
      </div>

      {/* ═══ KPIs ═══ */}
      {kpis && (
        <KpisRow kpis={kpis} onKpiClick={onKpiClick} activeKpi={activeKpi} />
      )}

      {/* ═══ FILTROS ═══ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        {/* Fila 1: Search + filtros principales */}
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search */}
            <div className="md:col-span-5">
              <div className="relative">
                <i className="bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por empresa, email, teléfono o ID…"
                  className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-100"
                  >
                    <i className="bx bx-x text-slate-400" />
                  </button>
                )}
              </div>
            </div>

            <Select
              className="md:col-span-2"
              value={semaforo}
              onChange={setSemaforo}
              placeholder="Semáforo"
              options={[
                { value: "", label: "Semáforo (todos)" },
                { value: "verde", label: "Al día", dot: "bg-emerald-500" },
                { value: "amarillo", label: "Por vencer", dot: "bg-amber-500" },
                { value: "rojo", label: "Vencidos", dot: "bg-rose-500" },
                { value: "gris", label: "Sin plan", dot: "bg-slate-400" },
              ]}
            />

            <Select
              className="md:col-span-2"
              value={estado}
              onChange={setEstado}
              options={[
                { value: "", label: "Estado (todos)" },
                { value: "activo", label: "Activo" },
                { value: "inactivo", label: "Inactivo" },
                { value: "suspendido", label: "Suspendido" },
                { value: "vencido", label: "Vencido" },
                { value: "cancelado", label: "Cancelado" },
                { value: "trial_usage", label: "Trial" },
                { value: "promo_usage", label: "Promo" },
              ]}
            />

            <Select
              className="md:col-span-2"
              value={idPlan}
              onChange={setIdPlan}
              options={[
                { value: "", label: "Plan (todos)" },
                ...planes.map((p) => ({
                  value: String(p.id_plan),
                  label: `${p.nombre_plan}${p.precio_plan ? ` — $${p.precio_plan}` : ""}`,
                })),
              ]}
            />

            <Select
              className="md:col-span-1"
              value={toolsAccess}
              onChange={setToolsAccess}
              options={[
                { value: "", label: "Producto" },
                { value: "imporchat", label: "Solo ImporChat" },
                { value: "insta_landing", label: "Solo Insta Landing" },
                { value: "both", label: "Ambos" },
              ]}
            />
          </div>

          {/* Fila 2: Toggle chips + avanzados */}
          <div className="flex items-center flex-wrap gap-2 mt-3">
            <ToggleChip
              active={conWhatsapp}
              onClick={() => setConWhatsapp((v) => !v)}
              icon="bxl-whatsapp"
              label="Con WhatsApp activo"
              color="emerald"
            />
            <ToggleChip
              active={permanente}
              onClick={() => setPermanente((v) => !v)}
              icon="bx-crown"
              label="Permanentes"
              color="amber"
            />
            <ToggleChip
              active={cancelPeriodEnd}
              onClick={() => setCancelPeriodEnd((v) => !v)}
              icon="bx-x-circle"
              label="Cancel. programada"
              color="rose"
            />
            <ToggleChip
              active={sinPlan}
              onClick={() => setSinPlan((v) => !v)}
              icon="bx-block"
              label="Sin plan"
              color="slate"
            />

            <div className="flex-1" />

            <button
              onClick={() => setFiltrosAvanzadosOpen((o) => !o)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ring-1 transition ${
                filtrosAvanzadosOpen || hayFiltrosAvanzados
                  ? "bg-[#0B1426] text-white ring-[#0B1426]"
                  : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              <i className={`bx bx-filter-alt text-base`} />
              Filtros avanzados
              {hayFiltrosAvanzados && (
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              )}
              <i
                className={`bx bx-chevron-${filtrosAvanzadosOpen ? "up" : "down"}`}
              />
            </button>
          </div>

          {/* Fila 3: Filtros avanzados (colapsable) */}
          {filtrosAvanzadosOpen && (
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 md:grid-cols-6 gap-3">
              <Select
                value={tipoPlan}
                onChange={setTipoPlan}
                options={[
                  { value: "", label: "Tipo (todos)" },
                  { value: "mensual", label: "Mensual" },
                  { value: "conversaciones", label: "Por conversaciones" },
                ]}
              />
              <Select
                value={stripeStatus}
                onChange={setStripeStatus}
                options={[
                  { value: "", label: "Stripe (todos)" },
                  { value: "active", label: "Active" },
                  { value: "trialing", label: "Trialing" },
                  { value: "past_due", label: "Past due" },
                  { value: "canceled", label: "Canceled" },
                  { value: "unpaid", label: "Unpaid" },
                  { value: "incomplete", label: "Incomplete" },
                ]}
              />
              <DateInput
                label="Registro desde"
                value={fechaRegDesde}
                onChange={setFechaRegDesde}
              />
              <DateInput
                label="Registro hasta"
                value={fechaRegHasta}
                onChange={setFechaRegHasta}
              />
              <DateInput
                label="Renov. desde"
                value={fechaRenDesde}
                onChange={setFechaRenDesde}
              />
              <DateInput
                label="Renov. hasta"
                value={fechaRenHasta}
                onChange={setFechaRenHasta}
              />
            </div>
          )}
        </div>

        {/* Fila 4: chips de filtros activos */}
        {activeFilters.length > 0 && (
          <div className="flex items-center flex-wrap gap-2 px-4 py-3 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Filtros activos:
            </span>
            {activeFilters.map((f, i) => (
              <button
                key={i}
                onClick={f.clear}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:ring-rose-200 transition"
              >
                {f.label}
                <i className="bx bx-x text-base" />
              </button>
            ))}
            <button
              onClick={limpiarFiltros}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 ml-2"
            >
              Limpiar todo
            </button>
            <div className="flex-1" />
            <div className="text-sm text-slate-500">
              <strong className="text-[#0B1426]">{fmtNumber(total)}</strong>{" "}
              resultado{total !== 1 && "s"}
            </div>
          </div>
        )}
      </div>

      {/* ═══ TABLA ═══ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-w-0">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col style={{ width: "22%" }} /> {/* Empresa */}
            <col style={{ width: "18%" }} /> {/* Contacto */}
            <col style={{ width: "10%" }} /> {/* Estado */}
            <col style={{ width: "16%" }} /> {/* Plan */}
            <col style={{ width: "10%" }} /> {/* Vence */}
            <col style={{ width: "12%" }} /> {/* Recursos */}
            <col style={{ width: "10%" }} /> {/* Actividad */}
            <col style={{ width: "2%" }} /> {/* Arrow */}
          </colgroup>
          <thead className="bg-[#0B1426] text-white">
            <tr>
              <Th
                onClick={() => toggleOrden("empresa")}
                active={orderBy === "empresa"}
                dir={orderDir}
              >
                Empresa
              </Th>
              <Th
                onClick={() => toggleOrden("email")}
                active={orderBy === "email"}
                dir={orderDir}
              >
                Contacto
              </Th>
              <Th
                onClick={() => toggleOrden("estado")}
                active={orderBy === "estado"}
                dir={orderDir}
              >
                Estado
              </Th>
              <Th
                onClick={() => toggleOrden("plan")}
                active={orderBy === "plan"}
                dir={orderDir}
              >
                Plan
              </Th>
              <Th
                onClick={() => toggleOrden("fecha_renovacion")}
                active={orderBy === "fecha_renovacion"}
                dir={orderDir}
              >
                Vence
              </Th>
              <Th className="text-center">Recursos</Th>
              <Th
                onClick={() => toggleOrden("ultimo_mensaje")}
                active={orderBy === "ultimo_mensaje"}
                dir={orderDir}
              >
                Actividad
              </Th>
              <th className="px-2 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <SkeletonRows count={8} />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-slate-100 text-slate-400 mb-3">
                    <i className="bx bx-search-alt text-3xl" />
                  </div>
                  <p className="text-slate-600 font-semibold">Sin resultados</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Ajusta o limpia los filtros para ver usuarios.
                  </p>
                  {activeFilters.length > 0 && (
                    <button
                      onClick={limpiarFiltros}
                      className="mt-3 text-xs font-semibold text-cyan-700 hover:text-cyan-800"
                    >
                      Limpiar filtros →
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <Row
                  key={r.id_usuario}
                  r={r}
                  onClick={() => abrirDetalle(r.id_usuario)}
                />
              ))
            )}
          </tbody>
        </table>

        {/* Paginación */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex-wrap gap-2">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Mostrar</span>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="px-2 py-1 border border-slate-300 rounded text-sm outline-none bg-white"
            >
              <option>10</option>
              <option>25</option>
              <option>50</option>
              <option>100</option>
            </select>
            <span>por página · {fmtNumber(total)} total</span>
          </div>
          <div className="flex items-center gap-1">
            <IconBtn
              onClick={() => setPage(1)}
              disabled={page <= 1}
              icon="bx-chevrons-left"
            />
            <IconBtn
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              icon="bx-chevron-left"
            />
            <span className="text-sm text-slate-600 px-3">
              Página <b>{page}</b> de <b>{totalPages}</b>
            </span>
            <IconBtn
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              icon="bx-chevron-right"
            />
            <IconBtn
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
              icon="bx-chevrons-right"
            />
          </div>
        </div>
      </div>

      {/* ═══ DRAWER ═══ */}
      {detalleOpen && (
        <DrawerDetalle
          loading={detalleLoading}
          data={detalleData}
          onClose={() => setDetalleOpen(false)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   KPIs
   ═══════════════════════════════════════════════════════════════ */
function KpisRow({ kpis, onKpiClick, activeKpi }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      <KpiCard
        kpiKey="total"
        color="#0B1426"
        label="Total"
        value={kpis.total_usuarios}
        icon="bx-group"
        onClick={onKpiClick}
        active={activeKpi === "total"}
      />
      <KpiCard
        kpiKey="activos"
        color="#10B981"
        label="Activos"
        value={kpis.total_activos}
        icon="bx-check-circle"
        onClick={onKpiClick}
        active={activeKpi === "activos"}
      />
      <KpiCard
        kpiKey="por_vencer_7d"
        color="#F59E0B"
        label="Por vencer 7d"
        value={kpis.por_vencer_7d}
        icon="bx-time-five"
        onClick={onKpiClick}
        active={activeKpi === "por_vencer_7d"}
        highlight={kpis.por_vencer_7d > 0 && activeKpi !== "por_vencer_7d"}
      />
      <KpiCard
        kpiKey="vencidos"
        color="#EF4444"
        label="Vencidos"
        value={kpis.total_vencidos}
        icon="bx-x-circle"
        onClick={onKpiClick}
        active={activeKpi === "vencidos"}
      />
      <KpiCard
        kpiKey="suspendidos"
        color="#F97316"
        label="Suspendidos"
        value={kpis.total_suspendidos}
        icon="bx-pause-circle"
        onClick={onKpiClick}
        active={activeKpi === "suspendidos"}
      />
      <KpiCard
        kpiKey="trial_promo"
        color="#06B6D4"
        label="Trial + Promo"
        value={Number(kpis.total_trial || 0) + Number(kpis.total_promo || 0)}
        icon="bx-gift"
        onClick={onKpiClick}
        active={activeKpi === "trial_promo"}
      />
      <KpiCard
        kpiKey="nuevos_30d"
        color="#8B5CF6"
        label="Nuevos 30d"
        value={kpis.nuevos_ultimos_30d}
        icon="bx-user-plus"
        onClick={onKpiClick}
        active={activeKpi === "nuevos_30d"}
      />
    </div>
  );
}

function KpiCard({
  kpiKey,
  label,
  value,
  color,
  icon,
  highlight,
  onClick,
  active,
}) {
  const clickable = typeof onClick === "function";
  const Tag = clickable ? "button" : "div";

  return (
    <Tag
      type={clickable ? "button" : undefined}
      onClick={clickable ? () => onClick(kpiKey) : undefined}
      className={`bg-white rounded-xl border p-3 shadow-sm transition text-left w-full ${
        active
          ? "border-transparent ring-2 shadow-md"
          : highlight
            ? "border-amber-200 ring-2 ring-amber-100"
            : "border-slate-200"
      } ${clickable ? "hover:shadow-md hover:-translate-y-0.5 cursor-pointer" : ""}`}
      style={
        active
          ? { boxShadow: `0 0 0 2px ${color}, 0 6px 16px ${color}30` }
          : undefined
      }
    >
      <div className="flex items-center gap-2.5">
        <div
          className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
          style={{
            backgroundColor: active ? color : `${color}15`,
            color: active ? "#fff" : color,
          }}
        >
          <i className={`bx ${icon} text-xl`} />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold truncate">
            {label}
          </div>
          <div
            className="text-xl font-extrabold leading-none mt-0.5"
            style={{ color: active ? color : "#0B1426" }}
          >
            {fmtNumber(value)}
          </div>
        </div>
      </div>
    </Tag>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Filters UI
   ═══════════════════════════════════════════════════════════════ */
function Select({ value, onChange, options, className = "" }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-500 bg-white ${className}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function DateInput({ label, value, onChange }) {
  return (
    <div className="relative">
      <label className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
        {label}
      </label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-500"
      />
    </div>
  );
}

function ToggleChip({ active, onClick, icon, label, color = "cyan" }) {
  const activeCls = {
    cyan: "bg-cyan-50 text-cyan-700 ring-cyan-300",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-300",
    amber: "bg-amber-50 text-amber-700 ring-amber-300",
    rose: "bg-rose-50 text-rose-700 ring-rose-300",
    slate: "bg-slate-100 text-slate-700 ring-slate-300",
  }[color];

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ring-1 transition ${
        active
          ? activeCls
          : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      <i className={`bx ${icon} text-base`} /> {label}
    </button>
  );
}

function IconBtn({ onClick, disabled, icon }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition"
    >
      <i className={`bx ${icon} text-lg`} />
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Table row
   ═══════════════════════════════════════════════════════════════ */
function Th({ children, onClick, active, dir, className = "" }) {
  return (
    <th
      onClick={onClick}
      className={`px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider ${
        onClick ? "cursor-pointer hover:bg-white/5 select-none" : ""
      } ${className}`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {active && (
          <i
            className={`bx ${dir === "ASC" ? "bx-up-arrow-alt" : "bx-down-arrow-alt"} text-sm`}
          />
        )}
      </span>
    </th>
  );
}

function Row({ r, onClick }) {
  const sem = semaforoStyle[r.semaforo] || semaforoStyle.gris;
  const estadoCls =
    estadoBadge[r.estado] || "bg-slate-50 text-slate-700 ring-slate-200";
  const hasIC = r.tools_access === "imporchat" || r.tools_access === "both";
  const hasIL = r.tools_access === "insta_landing" || r.tools_access === "both";

  return (
    <tr
      onClick={onClick}
      className="hover:bg-cyan-50/40 cursor-pointer transition group"
    >
      {/* 1. Empresa — 22% */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`h-2.5 w-2.5 rounded-full ${sem.dot} flex-shrink-0`}
            title={sem.label}
          />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-[#0B1426] truncate flex items-center gap-1">
              <span className="truncate">{r.empresa || "—"}</span>
              {r.permanente === 1 && (
                <i
                  className="bx bxs-crown text-amber-500 text-sm flex-shrink-0"
                  title="Permanente"
                />
              )}
            </div>
            <div className="text-[11px] text-slate-400">ID {r.id_usuario}</div>
          </div>
        </div>
      </td>

      {/* 2. Contacto — 18% */}
      <td className="px-3 py-3">
        <div className="min-w-0">
          {r.email && (
            <div className="text-slate-700 text-xs flex items-center gap-1 min-w-0">
              <span className="truncate flex-1">{r.email}</span>
              <CopyBtn text={r.email} label="Email copiado" />
            </div>
          )}
          {r.telefono_principal && (
            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 min-w-0">
              <i className="bx bx-phone text-xs flex-shrink-0" />
              <span className="truncate flex-1">{r.telefono_principal}</span>
              <CopyBtn text={r.telefono_principal} label="Teléfono copiado" />
            </div>
          )}
        </div>
      </td>

      {/* 3. Estado — 10% */}
      <td className="px-3 py-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${estadoCls} truncate max-w-full`}
        >
          {r.estado}
        </span>
        {r.cancel_at_period_end === 1 && (
          <div
            className="text-[10px] text-rose-600 font-semibold mt-0.5 flex items-center gap-0.5 truncate"
            title="Cancelación programada"
          >
            <i className="bx bx-x-circle flex-shrink-0" />
            <span className="truncate">Cancel. programada</span>
          </div>
        )}
      </td>

      {/* 4. Plan — 16% */}
      <td className="px-3 py-3">
        {r.nombre_plan ? (
          <div className="min-w-0">
            <div className="font-semibold text-[#0B1426] text-sm truncate">
              {r.nombre_plan}
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {fmtMoney(r.precio_plan)} ·{" "}
              {r.tipo_plan === "conversaciones" ? "conv." : "mensual"}
            </div>
            <div className="flex gap-1 mt-1 flex-wrap">
              {hasIC && <ProductBadge type="ic" />}
              {hasIL && <ProductBadge type="il" />}
            </div>
          </div>
        ) : (
          <span className="text-slate-400 italic text-xs">Sin plan</span>
        )}
      </td>

      {/* 5. Vence — 10% */}
      <td className="px-3 py-3">
        {r.fecha_renovacion ? (
          <div className="min-w-0">
            <div className="text-slate-700 text-xs truncate">
              {fmtDate(r.fecha_renovacion)}
            </div>
            {r.dias_hasta_vencimiento !== null && (
              <div
                className={`text-[11px] font-semibold truncate ${
                  r.dias_hasta_vencimiento < 0
                    ? "text-rose-600"
                    : r.dias_hasta_vencimiento <= 7
                      ? "text-amber-600"
                      : "text-slate-400"
                }`}
              >
                {r.dias_hasta_vencimiento < 0
                  ? `Vencido ${Math.abs(r.dias_hasta_vencimiento)}d`
                  : `${r.dias_hasta_vencimiento}d`}
              </div>
            )}
          </div>
        ) : (
          <span className="text-slate-300 text-xs">—</span>
        )}
      </td>

      {/* 6. Recursos (WhatsApp + IA + Subs) — 12% */}
      <td className="px-2 py-3">
        <div className="flex items-center justify-center gap-1 flex-wrap">
          <CountPill
            n={r.total_whatsapp_activos}
            max={r.total_conexiones}
            icon="bxl-whatsapp"
            color="emerald"
            tooltip="Conexiones de WhatsApp activas"
          />
          <CountPill
            n={r.total_agentes_ia}
            max={r.max_agentes_whatsapp}
            icon="bx-bot"
            color="violet"
            tooltip="Agentes IA configurados"
          />
          <CountPill
            n={r.total_subusuarios}
            max={r.max_subusuarios}
            icon="bx-group"
            color="sky"
            tooltip="Subusuarios de la cuenta"
          />
        </div>
      </td>

      {/* 7. Actividad (últ mensaje + fecha registro) — 10% */}
      <td className="px-3 py-3 text-xs">
        <div
          className="text-slate-600 truncate"
          title={
            r.ultimo_mensaje ? fmtDateTime(r.ultimo_mensaje) : "Sin mensajes"
          }
        >
          {r.ultimo_mensaje ? (
            relativo(r.ultimo_mensaje)
          ) : (
            <span className="text-slate-300">sin mensajes</span>
          )}
        </div>
        <div
          className="text-[10px] text-slate-400 truncate"
          title={`Registrado ${fmtDate(r.fecha_registro)}`}
        >
          reg. {fmtDate(r.fecha_registro)}
        </div>
      </td>

      {/* 8. Arrow — 2% */}
      <td className="px-2 py-3 text-right">
        <i className="bx bx-chevron-right text-xl text-slate-300 group-hover:text-cyan-600 transition" />
      </td>
    </tr>
  );
}

function ProductBadge({ type }) {
  if (type === "ic") {
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200"
        title="Acceso a ImporChat"
      >
        <i className="bx bx-chat text-xs" /> IC
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-50 text-violet-700 ring-1 ring-violet-200"
      title="Acceso a Insta Landing"
    >
      <i className="bx bx-image-add text-xs" /> IL
    </span>
  );
}

function CountPill({ n, max, icon, color, tooltip }) {
  const value = Number(n) || 0;
  const limit = max === null || max === undefined ? null : Number(max);
  const palette =
    {
      emerald: "text-emerald-700 bg-emerald-50 ring-emerald-200",
      violet: "text-violet-700 bg-violet-50 ring-violet-200",
      sky: "text-sky-700 bg-sky-50 ring-sky-200",
    }[color] || "text-slate-700 bg-slate-50 ring-slate-200";

  const empty = value === 0;

  return (
    <span
      title={tooltip}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ring-1 ${
        empty ? "text-slate-400 bg-slate-50 ring-slate-200" : palette
      }`}
    >
      <i className={`bx ${icon} text-sm`} />
      {value}
      {limit !== null && limit > 0 ? `/${limit}` : ""}
    </span>
  );
}

function SkeletonRows({ count = 6 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          {Array.from({ length: 8 }).map((_, j) => (
            <td key={j} className="px-3 py-4">
              <div
                className="h-3 bg-slate-100 rounded"
                style={{ width: `${60 + ((j * 7) % 40)}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Drawer de detalle
   ═══════════════════════════════════════════════════════════════ */
function DrawerDetalle({ loading, data, onClose }) {
  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const u = data?.usuario;
  const sem = u ? semaforoStyle[u.semaforo] || semaforoStyle.gris : null;
  const estadoCls = u ? estadoBadge[u.estado] || "" : "";

  const stripeLink = u?.stripe_subscription_id
    ? `https://dashboard.stripe.com/subscriptions/${u.stripe_subscription_id}`
    : null;

  return (
    <div className="fixed inset-0 z-50" role="dialog">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="absolute top-0 right-0 h-full w-full max-w-2xl bg-slate-50 shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-br from-[#0B1426] to-[#162138] text-white px-5 py-4 flex items-start justify-between z-10 shadow-md">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-cyan-300 uppercase tracking-wider">
              <i className="bx bxs-user-detail" /> Detalle del cliente
            </div>
            {u && (
              <>
                <h2 className="text-xl font-extrabold mt-1 truncate flex items-center gap-2">
                  {u.empresa}
                  {u.permanente === 1 && (
                    <i
                      className="bx bxs-crown text-amber-400 text-lg"
                      title="Permanente"
                    />
                  )}
                </h2>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-xs text-slate-300">
                    ID {u.id_usuario}
                  </span>
                  {sem && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${sem.chip}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${sem.dot}`} />{" "}
                      {sem.label}
                    </span>
                  )}
                  {u.estado && (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${estadoCls}`}
                    >
                      {u.estado}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition ml-2"
          >
            <i className="bx bx-x text-2xl" />
          </button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400">
            <i className="bx bx-loader-alt bx-spin text-4xl" />
            <p className="mt-2">Cargando detalle…</p>
          </div>
        ) : !u ? (
          <div className="p-10 text-center text-slate-400">No hay datos.</div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Acciones rápidas */}
            {stripeLink && (
              <div className="flex items-center flex-wrap gap-2">
                <ActionBtn
                  icon="bx-link-external"
                  onClick={() => window.open(stripeLink, "_blank")}
                >
                  Ver en Stripe
                </ActionBtn>
              </div>
            )}

            {/* Resumen contacto */}
            <Section icon="bx-id-card" title="Información de contacto">
              <InfoGrid>
                <InfoRow label="Empresa" value={u.empresa} />
                <InfoRow label="Email">
                  {u.email ? (
                    <div className="flex items-center gap-1.5">
                      <span className="truncate">{u.email}</span>
                      <CopyBtn text={u.email} label="Email copiado" />
                    </div>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </InfoRow>
                <InfoRow label="Teléfono">
                  {u.telefono_principal ? (
                    <div className="flex items-center gap-1.5">
                      <span>{u.telefono_principal}</span>
                      <CopyBtn
                        text={u.telefono_principal}
                        label="Teléfono copiado"
                      />
                    </div>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </InfoRow>
                <InfoRow
                  label="Registrado"
                  value={fmtDateTime(u.fecha_registro)}
                />
              </InfoGrid>
            </Section>

            {/* Plan y pagos */}
            <Section icon="bxs-credit-card" title="Plan y pagos" accent="cyan">
              <InfoGrid>
                <InfoRow
                  label="Plan actual"
                  value={u.nombre_plan || "Sin plan"}
                />
                <InfoRow label="Precio" value={fmtMoney(u.precio_plan)} />
                <InfoRow label="Tipo" value={u.tipo_plan} />
                <InfoRow
                  label="Permanente"
                  value={u.permanente ? "Sí" : "No"}
                />
                <InfoRow label="Inicio" value={fmtDate(u.fecha_inicio)} />
                <InfoRow
                  label="Renovación"
                  value={fmtDate(u.fecha_renovacion)}
                />
                {u.dias_hasta_vencimiento !== null && (
                  <InfoRow label="Días para vencer">
                    <span
                      className={`font-semibold ${
                        u.dias_hasta_vencimiento < 0
                          ? "text-rose-600"
                          : u.dias_hasta_vencimiento <= 7
                            ? "text-amber-600"
                            : "text-emerald-600"
                      }`}
                    >
                      {u.dias_hasta_vencimiento < 0
                        ? `Vencido hace ${Math.abs(u.dias_hasta_vencimiento)}d`
                        : `${u.dias_hasta_vencimiento}d`}
                    </span>
                  </InfoRow>
                )}
                <InfoRow
                  label="Stripe status"
                  value={u.stripe_subscription_status || "—"}
                />
                {u.stripe_subscription_id && (
                  <InfoRow label="Subs. ID">
                    <div className="flex items-center gap-1.5">
                      <code className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded font-mono truncate">
                        {u.stripe_subscription_id}
                      </code>
                      <CopyBtn
                        text={u.stripe_subscription_id}
                        label="ID copiado"
                      />
                    </div>
                  </InfoRow>
                )}
                <InfoRow
                  label="Cancel. programada"
                  value={u.cancel_at_period_end ? "Sí" : "No"}
                />
                {u.cancel_at && (
                  <InfoRow label="Cancel at" value={fmtDate(u.cancel_at)} />
                )}
                {u.trial_end && (
                  <InfoRow label="Trial end" value={fmtDate(u.trial_end)} />
                )}
                <InfoRow
                  label="Free trial usado"
                  value={u.free_trial_used ? "Sí" : "No"}
                />
                {u.pending_plan_nombre && (
                  <InfoRow label={`${u.pending_change} pendiente`}>
                    <span className="text-amber-700 font-semibold">
                      {u.pending_plan_nombre} ·{" "}
                      {fmtDate(u.pending_effective_at)}
                    </span>
                  </InfoRow>
                )}
              </InfoGrid>
            </Section>

            {/* Uso actual con progress bars */}
            <Section icon="bx-line-chart" title="Uso actual" accent="emerald">
              <div className="space-y-3">
                <UsageBar
                  label="Conexiones activas"
                  used={u.total_conexiones_activas}
                  max={u.max_conexiones}
                  color="emerald"
                />
                <UsageBar
                  label="WhatsApp conectados"
                  used={u.total_whatsapp_activos}
                  max={u.total_conexiones}
                  color="emerald"
                />
                <UsageBar
                  label="Agentes IA"
                  used={u.total_agentes_ia}
                  max={u.max_agentes_whatsapp}
                  color="violet"
                />
                <UsageBar
                  label="Subusuarios"
                  used={u.total_subusuarios}
                  max={u.max_subusuarios}
                  color="sky"
                />
                {u.tipo_plan === "conversaciones" && (
                  <UsageBar
                    label="Conversaciones del mes"
                    used={u.cant_conversaciones_mes}
                    max={null}
                    color="amber"
                  />
                )}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <span>Última actividad</span>
                    <span
                      className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-slate-100 text-slate-400 cursor-help"
                      title="Fecha del último mensaje enviado o recibido por el cliente a través de cualquiera de sus conexiones."
                    >
                      <i className="bx bx-info-circle text-xs" />
                    </span>
                  </div>
                  <span className="text-[#0B1426] font-semibold">
                    {u.ultimo_mensaje
                      ? fmtDateTime(u.ultimo_mensaje)
                      : "Sin mensajes registrados"}
                  </span>
                </div>
              </div>
            </Section>

            {/* Configuraciones */}
            <Section
              icon="bx-network-chart"
              title={`Configuraciones (${data.configuraciones.length})`}
              accent="slate"
            >
              {data.configuraciones.length === 0 ? (
                <p className="text-sm text-slate-400 italic">
                  Sin configuraciones.
                </p>
              ) : (
                <div className="space-y-2">
                  {data.configuraciones.map((c) => (
                    <ConfigCard key={c.id} c={c} />
                  ))}
                </div>
              )}
            </Section>

            {/* Subusuarios */}
            <Section
              icon="bx-group"
              title={`Subusuarios (${data.subusuarios.length})`}
              accent="sky"
            >
              {data.subusuarios.length === 0 ? (
                <p className="text-sm text-slate-400 italic">
                  Sin subusuarios.
                </p>
              ) : (
                <div className="space-y-2">
                  {data.subusuarios.map((s) => (
                    <div
                      key={s.id_sub_usuario}
                      className="flex items-center justify-between bg-white rounded-lg px-3 py-2 ring-1 ring-slate-200"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-[#0B1426] text-sm truncate">
                          {s.nombre_encargado}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {s.email} · {s.usuario}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 flex-shrink-0 ${
                          s.rol === "super_administrador"
                            ? "bg-cyan-50 text-cyan-700 ring-cyan-200"
                            : s.rol === "administrador"
                              ? "bg-violet-50 text-violet-700 ring-violet-200"
                              : "bg-slate-50 text-slate-700 ring-slate-200"
                        }`}
                      >
                        {s.rol}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        )}
      </aside>
    </div>
  );
}

/* ── Drawer sub-components ── */

function Section({ icon, title, children, accent = "slate" }) {
  const accentCls = {
    cyan: "text-cyan-600",
    emerald: "text-emerald-600",
    violet: "text-violet-600",
    sky: "text-sky-600",
    slate: "text-slate-500",
  }[accent];

  return (
    <section className="bg-white rounded-xl ring-1 ring-slate-200 p-4 shadow-sm">
      <h3 className="text-sm font-bold text-[#0B1426] mb-3 flex items-center gap-2">
        <i className={`bx ${icon} text-lg ${accentCls}`} />
        {title}
      </h3>
      {children}
    </section>
  );
}

function ActionBtn({ icon, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 hover:ring-cyan-300 hover:text-cyan-700 transition"
    >
      <i className={`bx ${icon} text-base`} />
      {children}
    </button>
  );
}

function InfoGrid({ children }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function InfoRow({ label, value, children }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
        {label}
      </div>
      <div className="text-sm text-[#0B1426] mt-0.5 break-words">
        {children ?? value ?? <span className="text-slate-300">—</span>}
      </div>
    </div>
  );
}

function UsageBar({ label, used, max, color = "emerald", hint }) {
  const u = Number(used) || 0;
  const m = max === null || max === undefined ? null : Number(max);
  const pct = m && m > 0 ? Math.min(100, (u / m) * 100) : null;
  const barColor = {
    emerald: "bg-emerald-500",
    violet: "bg-violet-500",
    sky: "bg-sky-500",
    amber: "bg-amber-500",
  }[color];

  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <div>
          <div className="font-semibold text-[#0B1426]">{label}</div>
          {hint && <div className="text-[10px] text-slate-400">{hint}</div>}
        </div>
        <div className="font-bold text-[#0B1426]">
          {u}
          {m !== null && m > 0 ? (
            <span className="text-slate-400 font-normal"> / {m}</span>
          ) : (
            ""
          )}
        </div>
      </div>
      {pct !== null && (
        <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} transition-all`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function ConfigCard({ c }) {
  const connected = c.whatsapp_conectado === 1;
  const suspendida = c.suspendido === 1;

  let estado, estadoCls, estadoIcon;
  if (suspendida) {
    estado = "Suspendida";
    estadoCls = "bg-rose-100 text-rose-700 ring-rose-200";
    estadoIcon = "bx-pause-circle";
  } else if (connected) {
    estado = "Conectada";
    estadoCls = "bg-emerald-100 text-emerald-700 ring-emerald-200";
    estadoIcon = "bxl-whatsapp";
  } else {
    estado = "Pendiente de configurar";
    estadoCls = "bg-amber-100 text-amber-700 ring-amber-200";
    estadoIcon = "bx-time-five";
  }

  return (
    <div
      className={`bg-white rounded-lg ring-1 p-3 ${
        suspendida
          ? "ring-rose-200 bg-rose-50/30"
          : connected
            ? "ring-emerald-200"
            : "ring-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-[#0B1426] truncate">
            {c.nombre_configuracion || `Configuración #${c.id}`}
          </div>
          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
            {c.telefono && (
              <span className="flex items-center gap-1">
                <i className="bx bx-phone text-xs" /> {c.telefono}
                <CopyBtn text={c.telefono} label="Teléfono copiado" />
              </span>
            )}
            <span className="text-slate-300">·</span>
            <span className="capitalize">{c.tipo_configuracion}</span>
            {c.pais && (
              <>
                <span className="text-slate-300">·</span>
                <span className="uppercase">{c.pais}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ring-1 ${estadoCls}`}
          >
            <i className={`bx ${estadoIcon}`} /> {estado}
          </span>
          {c.tiene_agente_ia === 1 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-700 ring-1 ring-violet-200">
              <i className="bx bx-bot" /> Agente IA
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
