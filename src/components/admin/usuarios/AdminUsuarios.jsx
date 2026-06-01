import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import toast from "react-hot-toast";
import chatApi from "../../../api/chatcenter";

import KpisRow from "./KpisRow";
import FiltersBar from "./FiltersBar";
import UsuariosTable from "./UsuariosTable";
import DrawerDetalle from "./DrawerDetalle";

export default function AdminUsuarios() {
  const navigate = useNavigate();

  // Data
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [kpis, setKpis] = useState(null);
  const [planes, setPlanes] = useState([]);

  // Paginación + orden
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [orderBy, setOrderBy] = useState("fecha_registro");
  const [orderDir, setOrderDir] = useState("DESC");

  // Filtros
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
  const [conSeguimientos, setConSeguimientos] = useState(false); // 👈 NUEVO
  const [porVencer7d, setPorVencer7d] = useState(false);
  const [estadoTrialOPromo, setEstadoTrialOPromo] = useState(false);
  const [nuevos30d, setNuevos30d] = useState(false);
  const [fechaRegDesde, setFechaRegDesde] = useState("");
  const [fechaRegHasta, setFechaRegHasta] = useState("");
  const [fechaRenDesde, setFechaRenDesde] = useState("");
  const [fechaRenHasta, setFechaRenHasta] = useState("");
  const [filtrosAvanzadosOpen, setFiltrosAvanzadosOpen] = useState(false);

  // Drawer
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleData, setDetalleData] = useState(null);
  const [detalleLoading, setDetalleLoading] = useState(false);

  // Export
  const [exportando, setExportando] = useState(false);

  const userRole = localStorage.getItem("user_role");
  const isSuperAdmin = userRole === "super_administrador";

  // Debounce búsqueda
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounce(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Body filtros
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
      con_seguimientos: conSeguimientos ? 1 : undefined,
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
      conSeguimientos,
      porVencer7d,
      estadoTrialOPromo,
      nuevos30d,
      fechaRegDesde,
      fechaRegHasta,
      fechaRenDesde,
      fechaRenHasta,
    ],
  );

  // Chips de filtros activos
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
        label: `Estado: ${estadoMap[estado] || estado}`,
        clear: () => setEstado(""),
      });
    if (idPlan) {
      const p = planes.find((p) => String(p.id_plan) === String(idPlan));
      chips.push({
        label: `Plan: ${p?.nombre_plan || idPlan}`,
        clear: () => setIdPlan(""),
      });
    }
    if (semaforo)
      chips.push({
        label: `Semáforo: ${semMap[semaforo]}`,
        clear: () => setSemaforo(""),
      });
    if (tipoPlan)
      chips.push({
        label: `Tipo: ${tipoMap[tipoPlan]}`,
        clear: () => setTipoPlan(""),
      });
    if (stripeStatus)
      chips.push({
        label: `Stripe: ${stripeStatus}`,
        clear: () => setStripeStatus(""),
      });
    if (toolsAccess)
      chips.push({
        label: `Producto: ${prodMap[toolsAccess]}`,
        clear: () => setToolsAccess(""),
      });
    if (cancelPeriodEnd)
      chips.push({
        label: "Cancel. programada",
        clear: () => setCancelPeriodEnd(false),
      });
    if (permanente)
      chips.push({ label: "Permanentes", clear: () => setPermanente(false) });
    if (conWhatsapp)
      chips.push({
        label: "Con WhatsApp activo",
        clear: () => setConWhatsapp(false),
      });
    if (sinPlan)
      chips.push({ label: "Sin plan", clear: () => setSinPlan(false) });
    if (conSeguimientos)
      chips.push({
        label: "Con seguimientos",
        clear: () => setConSeguimientos(false),
      });
    if (porVencer7d)
      chips.push({
        label: "Por vencer 7d",
        clear: () => setPorVencer7d(false),
      });
    if (estadoTrialOPromo)
      chips.push({
        label: "Trial + Promo",
        clear: () => setEstadoTrialOPromo(false),
      });
    if (nuevos30d)
      chips.push({ label: "Nuevos 30d", clear: () => setNuevos30d(false) });
    if (fechaRegDesde)
      chips.push({
        label: `Registro ≥ ${fechaRegDesde}`,
        clear: () => setFechaRegDesde(""),
      });
    if (fechaRegHasta)
      chips.push({
        label: `Registro ≤ ${fechaRegHasta}`,
        clear: () => setFechaRegHasta(""),
      });
    if (fechaRenDesde)
      chips.push({
        label: `Renov. ≥ ${fechaRenDesde}`,
        clear: () => setFechaRenDesde(""),
      });
    if (fechaRenHasta)
      chips.push({
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
    conSeguimientos,
    porVencer7d,
    estadoTrialOPromo,
    nuevos30d,
    fechaRegDesde,
    fechaRegHasta,
    fechaRenDesde,
    fechaRenHasta,
    planes,
  ]);

  // Fetch lista
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

  const abrirDetalle = async (id_usuario) => {
    setDetalleOpen(true);
    setDetalleLoading(true);
    setDetalleData(null);
    try {
      const { data } = await chatApi.get(
        `admin_usuarios/detalle/${id_usuario}`,
      );
      setDetalleData(data.data);
    } catch {
      toast.error("No se pudo cargar el detalle");
      setDetalleOpen(false);
    } finally {
      setDetalleLoading(false);
    }
  };

  const toggleOrden = (col) => {
    if (orderBy === col) setOrderDir((d) => (d === "ASC" ? "DESC" : "ASC"));
    else {
      setOrderBy(col);
      setOrderDir("DESC");
    }
  };

  const exportarExcel = async () => {
    setExportando(true);
    try {
      const res = await chatApi.post("admin_usuarios/exportar", filtrosBody, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `usuarios_admin_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Excel descargado");
    } catch {
      toast.error("Error al exportar");
    } finally {
      setExportando(false);
    }
  };

  const refrescar = () => {
    fetchLista();
    fetchKpisAndPlans();
    toast.success("Actualizado");
  };

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
    setConSeguimientos(false);
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

  const onKpiClick = (key) => {
    if (key === "total") {
      limpiarFiltros();
      return;
    }
    const isActive = activeKpi === key;
    setEstado("");
    setPorVencer7d(false);
    setEstadoTrialOPromo(false);
    setNuevos30d(false);
    if (isActive) return;
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
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="mt-2 text-2xl md:text-3xl font-extrabold text-[#0B1426] tracking-tight">
            Panel de Usuarios
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
          {isSuperAdmin && (
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
          )}
        </div>
      </div>

      {kpis && (
        <KpisRow kpis={kpis} onKpiClick={onKpiClick} activeKpi={activeKpi} />
      )}

      <FiltersBar
        state={{
          search,
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
          conSeguimientos,
          fechaRegDesde,
          fechaRegHasta,
          fechaRenDesde,
          fechaRenHasta,
          filtrosAvanzadosOpen,
        }}
        set={{
          setSearch,
          setEstado,
          setIdPlan,
          setSemaforo,
          setTipoPlan,
          setStripeStatus,
          setToolsAccess,
          setCancelPeriodEnd,
          setPermanente,
          setConWhatsapp,
          setSinPlan,
          setConSeguimientos,
          setFechaRegDesde,
          setFechaRegHasta,
          setFechaRenDesde,
          setFechaRenHasta,
          setFiltrosAvanzadosOpen,
          limpiarFiltros,
        }}
        meta={{ planes, total, activeFilters, hayFiltrosAvanzados }}
      />

      <UsuariosTable
        rows={rows}
        loading={loading}
        total={total}
        totalPages={totalPages}
        page={page}
        limit={limit}
        orderBy={orderBy}
        orderDir={orderDir}
        setPage={setPage}
        setLimit={setLimit}
        toggleOrden={toggleOrden}
        abrirDetalle={abrirDetalle}
        activeFilters={activeFilters}
        limpiarFiltros={limpiarFiltros}
      />

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
