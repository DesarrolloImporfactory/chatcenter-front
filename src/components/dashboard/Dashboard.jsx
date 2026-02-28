import React, { useEffect, useMemo, useState } from "react";
import chatApi from "../../api/chatcenter";

import FiltersBar from "./FiltersBar";
import StatsCards from "./StatsCards";
import PendingQueue from "./PendingQueue";
import SlaToday from "./SlaToday";

import ChatsCreatedChart from "./ChatsCreatedChart";
import ChatsResolvedChart from "./ChartResolvedChart";
import FirstResponseChart from "./FirstResponseChart";
import ResolutionChart from "./ResolutionChart";
import ChatsByChannelChart from "./ChatsByChannelChart";
import ChatsByConnectionChart from "./ChatsByConnectionChart";

// ===== Helpers =====
function safeName(v) {
  return (v ?? "").toString().trim();
}

function uniqueByName(items) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const name = safeName(it);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

// YYYY-MM-DD de hoy (para default)
function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function Dashboard() {
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [filters, setFilters] = useState({
    department: "Todos",
    user: "Todos",
    connection: "Todas",
    tag: "Todas",
    motive: "Todos",
    dateRange: { from: todayISO(), to: todayISO() }, // ✅ se mantiene {from,to}
  });

  // options que usa FiltersBar
  const [options, setOptions] = useState({
    departments: ["Todos"],
    users: ["Todos"],
    connections: ["Todas"],
    tags: ["Todas"],
    motives: ["Todos"],
    _raw: {
      departamentos: [],
      usuarios: [],
      conexiones: [],
      etiquetas_por_configuracion: {},
    },
  });

  // ✅ Summary real (viene del backend)
  const [summary, setSummary] = useState({
    chatsCreated: 0,
    chatsResolved: 0,
    withReplies: 0,
    noReply: 0,
    avgFirstResponseSeconds: null,
    avgResolutionSeconds: null,
  });

  // ✅ Real: cola, SLA, charts
  const [pendingQueue, setPendingQueue] = useState([]);
  const [slaToday, setSlaToday] = useState({
    generalPct: 0,
    metaPct: 90,
    channels: [],
    resolvedToday: 0,
    abandoned: 0,
  });
  const [charts, setCharts] = useState({
    byChannel: [],
    byConnection: [],
    chatsCreated: [],
    chatsResolved: [],
    firstResponse: [],
    resolution: [],
  });

  // === 1) Cargar filtros desde backend (1 petición) ===
  useEffect(() => {
    const cargarFiltros = async () => {
      try {
        setLoadingFilters(true);

        const id_usuario = Number(localStorage.getItem("id_usuario"));
        const id_sub_usuario_raw = localStorage.getItem("id_sub_usuario");
        const id_sub_usuario = id_sub_usuario_raw
          ? Number(id_sub_usuario_raw)
          : null;

        const resp = await chatApi.post("/dashboard/obtener_filtros", {
          id_usuario,
          id_sub_usuario,
          incluir_etiquetas: 1,
        });

        const payload = resp?.data?.data || {};
        const deps = payload.departamentos || [];
        const users = payload.usuarios || [];
        const conns = payload.conexiones || [];
        const etiquetasPorConf = payload.etiquetas_por_configuracion || {};

        const departments = [
          "Todos",
          ...uniqueByName(
            deps.map(
              (d) => d.nombre_departamento || d.nombre || d.departamento,
            ),
          ),
        ];

        const usersOpts = [
          "Todos",
          ...uniqueByName(users.map((u) => u.nombre || u.name || u.usuario)),
        ];

        const connections = [
          "Todas",
          ...uniqueByName(conns.map((c) => c.nombre_configuracion)),
        ];

        setOptions((prev) => ({
          ...prev,
          departments,
          users: usersOpts,
          connections,
          motives: ["Todos"], // por ahora
          _raw: {
            departamentos: deps,
            usuarios: users,
            conexiones: conns,
            etiquetas_por_configuracion: etiquetasPorConf,
          },
        }));
      } catch (err) {
        console.error("Error cargando filtros dashboard:", err);
      } finally {
        setLoadingFilters(false);
      }
    };

    cargarFiltros();
  }, []);

  // === 2) Calcular TAGS según la conexión seleccionada ===
  useEffect(() => {
    const { conexiones, etiquetas_por_configuracion } = options._raw || {};
    const selectedConnName = filters.connection;

    let tags = ["Todas"];

    if (!conexiones || !etiquetas_por_configuracion) {
      setOptions((prev) => ({ ...prev, tags }));
      return;
    }

    let selectedConfigId = null;

    if (selectedConnName && selectedConnName !== "Todas") {
      const row = conexiones.find(
        (c) =>
          safeName(c.nombre_configuracion).toLowerCase() ===
          safeName(selectedConnName).toLowerCase(),
      );
      selectedConfigId = row?.id ? Number(row.id) : null;
    }

    if (selectedConfigId) {
      const tagsArr = etiquetas_por_configuracion[selectedConfigId] || [];
      tags = [
        "Todas",
        ...uniqueByName(
          tagsArr.map((t) => t.nombre_etiqueta || t.nombre || t.tag),
        ),
      ];
    } else {
      const all = Object.values(etiquetas_por_configuracion).flat();
      tags = [
        "Todas",
        ...uniqueByName(all.map((t) => t.nombre_etiqueta || t.nombre || t.tag)),
      ];
    }

    setOptions((prev) => ({ ...prev, tags }));
  }, [filters.connection, options._raw]);

  // === 3) Resolver id_configuracion según filters.connection ===
  const selectedConfigId = useMemo(() => {
    if (!filters.connection || filters.connection === "Todas") return null;

    const conns = options._raw?.conexiones || [];
    const row = conns.find(
      (c) =>
        safeName(c.nombre_configuracion).toLowerCase() ===
        safeName(filters.connection).toLowerCase(),
    );
    return row?.id ? Number(row.id) : null;
  }, [filters.connection, options._raw]);

  // === 4) Fetch ALL (summary + cola + SLA + charts) ===
  const fetchAll = async () => {
    try {
      setErrorMsg("");
      setLoadingData(true);

      const id_usuario = Number(localStorage.getItem("id_usuario"));

      const payloadBase = {
        id_usuario,
        id_configuracion: selectedConfigId, // null si "Todas"
        from: filters.dateRange?.from || null, // ✅ ya no llega vacío
        to: filters.dateRange?.to || null, // ✅ ya no llega vacío
      };

      const [respStats, respQueue, respSla, respCharts] = await Promise.all([
        chatApi.post("/dashboard/obtener_estadisticas", payloadBase),
        chatApi.post("/dashboard/obtener_cola_pendientes", payloadBase),
        chatApi.post("/dashboard/obtener_sla_hoy", payloadBase),
        chatApi.post("/dashboard/obtener_charts", payloadBase),
      ]);

      // ---- stats ----
      const s = respStats?.data?.data?.summary || {};
      setSummary({
        chatsCreated: Number(s.chatsCreated || 0),
        chatsResolved: Number(s.chatsResolved || 0),
        withReplies: Number(s.withReplies || 0),
        noReply: Number(s.noReply || 0),
        avgFirstResponseSeconds:
          s.avgFirstResponseSeconds === null ||
          s.avgFirstResponseSeconds === undefined
            ? null
            : Number(s.avgFirstResponseSeconds),
        avgResolutionSeconds:
          s.avgResolutionSeconds === null ||
          s.avgResolutionSeconds === undefined
            ? null
            : Number(s.avgResolutionSeconds),
      });

      // ---- queue ----
      const q = respQueue?.data?.data?.rows || respQueue?.data?.data || [];
      setPendingQueue(Array.isArray(q) ? q : []);

      // ---- sla ----
      const sla = respSla?.data?.data || {};
      setSlaToday({
        generalPct: Number(sla.generalPct || 0),
        metaPct: Number(sla.metaPct || 90),
        channels: Array.isArray(sla.channels) ? sla.channels : [],
        resolvedToday: Number(sla.resolvedToday || 0),
        abandoned: Number(sla.abandoned || 0),
      });

      // ---- charts ----
      const ch = respCharts?.data?.data || {};
      setCharts({
        byChannel: Array.isArray(ch.byChannel) ? ch.byChannel : [],
        byConnection: Array.isArray(ch.byConnection) ? ch.byConnection : [],
        chatsCreated: Array.isArray(ch.chatsCreated) ? ch.chatsCreated : [],
        chatsResolved: Array.isArray(ch.chatsResolved) ? ch.chatsResolved : [],
        firstResponse: Array.isArray(ch.firstResponse) ? ch.firstResponse : [],
        resolution: Array.isArray(ch.resolution) ? ch.resolution : [],
      });
    } catch (err) {
      console.error("Error cargando dashboard:", err);
      setErrorMsg("No se pudieron cargar los datos del dashboard.");
    } finally {
      setLoadingData(false);
    }
  };

  // ✅ cargar una vez al montar (hoy->hoy)
  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const headerRangeText =
    filters?.dateRange?.from && filters?.dateRange?.to
      ? `Rango activo: ${filters.dateRange.from} → ${filters.dateRange.to}`
      : "Seleccione un rango de fechas para ver el desempeño.";

  return (
    <div className="min-h-[calc(100vh-48px)] w-full bg-white text-slate-900">
      <div className="mx-auto w-full max-w-[100%] px-4 py-5">
        {/* Header SaaS (mejorado) */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                Informes del Chat Center
              </h1>
              <span className="hidden sm:inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                Analítica • SLA • Operación
              </span>
            </div>

            <p className="mt-1 text-sm text-slate-600">
              Visualice el rendimiento por fechas y filtre por conexión, usuario
              y etiquetas para detectar cuellos de botella.
            </p>

            <div className="mt-2 text-xs text-slate-500">{headerRangeText}</div>
          </div>
        </div>

        {/* Filtros */}
        <FiltersBar
          filters={filters}
          options={{
            departments: options.departments,
            users: options.users,
            connections: options.connections,
            tags: options.tags,
            motives: options.motives,
          }}
          onChange={setFilters}
          onApply={fetchAll}
        />

        {(loadingFilters || loadingData) && (
          <div className="mt-2 text-xs text-slate-500">
            {loadingFilters ? "Cargando filtros..." : null}
            {loadingFilters && loadingData ? " | " : null}
            {loadingData ? "Cargando datos..." : null}
          </div>
        )}

        {errorMsg ? (
          <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMsg}
          </div>
        ) : null}

        {/* Cards resumen (REAL) */}
        <div className="mt-5">
          <StatsCards summary={summary} />
        </div>

        {/* Cola + SLA (REAL) */}
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PendingQueue rows={pendingQueue} />
          </div>
          <div className="lg:col-span-1">
            <SlaToday data={slaToday} />
          </div>
        </div>

        {/* Gráficas (REAL) */}
        <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
          <ChatsByChannelChart data={charts.byChannel} />
          <ChatsByConnectionChart data={charts.byConnection} />

          <FirstResponseChart data={charts.firstResponse} />
          <ResolutionChart data={charts.resolution} />

          <ChatsCreatedChart data={charts.chatsCreated} />
          <ChatsResolvedChart data={charts.chatsResolved} />
        </div>
      </div>
    </div>
  );
}
