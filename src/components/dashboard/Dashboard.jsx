import React, { useEffect, useMemo, useState, useCallback } from "react";

import chatApi from "../../api/chatcenter";

import FiltersBar from "./FiltersBar";
import StatsCards from "./StatsCards";
import PendingQueue from "./PendingQueue";
import SlaToday from "./SlaToday";
import AgentLoad from "./AgentLoad";
import FrequentTransfers from "./FrequentTransfers";

import ChatsCreatedChart from "./ChatsCreatedChart";
import ChatsResolvedChart from "./ChatsResolvedChart";
import FirstResponseChart from "./FirstResponseChart";
import ResolutionChart from "./ResolutionChart";
import ChatsByChannelChart from "./ChatsByChannelChart";
import ChatsByConnectionChart from "./ChatsByConnectionChart";
import { useDashboardRealtime } from "../../hooks/useDashboardRealTime";
import { useSocket } from "../../context/SocketProvider";

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

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysAgoISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getUserInfo() {
  const id_usuario = Number(localStorage.getItem("id_usuario"));
  const id_sub_usuario_raw = localStorage.getItem("id_sub_usuario");
  const id_sub_usuario = id_sub_usuario_raw ? Number(id_sub_usuario_raw) : null;
  const rol =
    localStorage.getItem("user_role") || localStorage.getItem("rol") || null;
  const esAdmin =
    !id_sub_usuario || rol === "administrador" || rol === "admin_limitado";
  return { id_usuario, id_sub_usuario, rol, esAdmin };
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
    dateRange: { from: daysAgoISO(3), to: todayISO() },
  });

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

  const [summary, setSummary] = useState({
    chatsCreated: 0,
    chatsResolved: 0,
    withReplies: 0,
    noReply: 0,
    avgFirstResponseSeconds: null,
    avgResolutionSeconds: null,
  });
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
  const [agentLoad, setAgentLoad] = useState([]);
  const [frequentTransfers, setFrequentTransfers] = useState([]);

  const { socket } = useSocket();
  const { id_usuario, id_sub_usuario, esAdmin } = getUserInfo();

  // === 1) Cargar filtros ===
  useEffect(() => {
    const cargarFiltros = async () => {
      try {
        setLoadingFilters(true);
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

        setOptions((prev) => ({
          ...prev,
          departments: [
            "Todos",
            ...uniqueByName(
              deps.map(
                (d) => d.nombre_departamento || d.nombre || d.departamento,
              ),
            ),
          ],
          users: [
            "Todos",
            ...uniqueByName(
              users.map(
                (u) => u.nombre_encargado || u.nombre || u.name || u.usuario,
              ),
            ),
          ],
          connections: [
            "Todas",
            ...uniqueByName(conns.map((c) => c.nombre_configuracion)),
          ],
          motives: ["Todos"],
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

  // === 2) Tags según conexión ===
  useEffect(() => {
    const { conexiones, etiquetas_por_configuracion } = options._raw || {};
    let tags = ["Todas"];
    if (!conexiones || !etiquetas_por_configuracion) {
      setOptions((prev) => ({ ...prev, tags }));
      return;
    }
    let selCfgId = null;
    if (filters.connection && filters.connection !== "Todas") {
      const row = conexiones.find(
        (c) =>
          safeName(c.nombre_configuracion).toLowerCase() ===
          safeName(filters.connection).toLowerCase(),
      );
      selCfgId = row?.id ? Number(row.id) : null;
    }
    if (selCfgId) {
      const tagsArr = etiquetas_por_configuracion[selCfgId] || [];
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

  // === 3) Resolver filtros ===
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

  const selectedSubUsuarioFiltro = useMemo(() => {
    if (!esAdmin || !filters.user || filters.user === "Todos") return null;
    const usuarios = options._raw?.usuarios || [];
    const row = usuarios.find((u) => {
      const nombre = safeName(
        u.nombre_encargado || u.nombre || u.name || u.usuario,
      );
      return nombre.toLowerCase() === safeName(filters.user).toLowerCase();
    });
    return row?.id_sub_usuario ? Number(row.id_sub_usuario) : null;
  }, [filters.user, options._raw, esAdmin]);

  // === 4) FETCH SELECTIVO ===
  const fetchSections = useCallback(
    async (sections) => {
      const isAll = sections.includes("all");
      try {
        setErrorMsg("");
        if (isAll) setLoadingData(true);

        const endpoint = esAdmin
          ? "/dashboard/obtener_dashboard_completo"
          : "/dashboard/obtener_dashboard_agente";

        const payload = {
          id_usuario,
          id_configuracion: selectedConfigId,
          from: filters.dateRange?.from || null,
          to: filters.dateRange?.to || null,
          sections: isAll ? "all" : sections,
        };

        if (esAdmin && selectedSubUsuarioFiltro) {
          payload.id_sub_usuario_filtro = selectedSubUsuarioFiltro;
        }
        if (!esAdmin && id_sub_usuario) {
          payload.id_sub_usuario = id_sub_usuario;
        }

        const resp = await chatApi.post(endpoint, payload, { timeout: 50000 });
        const data = resp?.data?.data || {};

        if (data.summary !== undefined) {
          const s = data.summary;
          setSummary({
            chatsCreated: Number(s.chatsCreated || 0),
            chatsResolved: Number(s.chatsResolved || 0),
            withReplies: Number(s.withReplies || 0),
            noReply: Number(s.noReply || 0),
            avgFirstResponseSeconds: s.avgFirstResponseSeconds ?? null,
            avgResolutionSeconds: s.avgResolutionSeconds ?? null,
          });
        }
        if (data.pendingQueue !== undefined)
          setPendingQueue(
            Array.isArray(data.pendingQueue) ? data.pendingQueue : [],
          );
        if (data.slaToday !== undefined) {
          const sla = data.slaToday;
          setSlaToday({
            generalPct: Number(sla.generalPct || 0),
            metaPct: Number(sla.metaPct || 90),
            channels: Array.isArray(sla.channels) ? sla.channels : [],
            resolvedToday: Number(sla.resolvedToday || 0),
            abandoned: Number(sla.abandoned || 0),
          });
        }
        if (data.charts !== undefined) {
          const ch = data.charts;
          setCharts({
            byChannel: Array.isArray(ch.byChannel) ? ch.byChannel : [],
            byConnection: Array.isArray(ch.byConnection) ? ch.byConnection : [],
            chatsCreated: Array.isArray(ch.chatsCreated) ? ch.chatsCreated : [],
            chatsResolved: Array.isArray(ch.chatsResolved)
              ? ch.chatsResolved
              : [],
            firstResponse: Array.isArray(ch.firstResponse)
              ? ch.firstResponse
              : [],
            resolution: Array.isArray(ch.resolution) ? ch.resolution : [],
          });
        }
        if (data.agentLoad !== undefined)
          setAgentLoad(Array.isArray(data.agentLoad) ? data.agentLoad : []);
        if (data.frequentTransfers !== undefined)
          setFrequentTransfers(
            Array.isArray(data.frequentTransfers) ? data.frequentTransfers : [],
          );
      } catch (err) {
        console.error("Error cargando dashboard:", err);
        if (isAll)
          setErrorMsg("No se pudieron cargar los datos del dashboard.");
      } finally {
        if (isAll) setLoadingData(false);
      }
    },
    [
      selectedConfigId,
      selectedSubUsuarioFiltro,
      filters.dateRange,
      esAdmin,
      id_sub_usuario,
      id_usuario,
    ],
  );

  const fetchAll = useCallback(() => fetchSections(["all"]), [fetchSections]);

  // === 5) DELTAS OPTIMISTAS ===
  const handleDeltas = useCallback((deltas) => {
    if (!deltas || typeof deltas !== "object") return;

    setSummary((prev) => {
      const updated = { ...prev };
      if (typeof deltas.chatsCreated === "number")
        updated.chatsCreated = prev.chatsCreated + deltas.chatsCreated;
      if (typeof deltas.chatsResolved === "number")
        updated.chatsResolved = prev.chatsResolved + deltas.chatsResolved;
      if (typeof deltas.withReplies === "number")
        updated.withReplies = prev.withReplies + deltas.withReplies;
      if (typeof deltas.noReply === "number")
        updated.noReply = prev.noReply + deltas.noReply;
      return updated;
    });
  }, []);

  // === 6) Socket real-time ===
  useDashboardRealtime({
    socket,
    id_usuario,
    onRefreshSections: fetchSections,
    onApplyDeltas: handleDeltas,
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const headerRangeText =
    filters?.dateRange?.from && filters?.dateRange?.to
      ? `Período: ${filters.dateRange.from} al ${filters.dateRange.to}`
      : "Seleccione un rango de fechas para ver el desempeño.";

  const dashboardTitle = esAdmin
    ? "Dashboard analítico de mensajes"
    : "Mi dashboard de rendimiento";

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-slate-50">
      {/* HEADER PREMIUM — fuera del padding, full-width, sin rounded */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0B1426] via-[#0a2518] to-[#059669] text-white px-6 py-5">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/10 rounded-full blur-2xl" />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/15 grid place-items-center">
              <i className="bx bx-message-rounded-dots text-xl text-white" />
            </div>
            <div className="h-8 w-px bg-white/30" />
            <div>
              <h1 className="text-xl font-extrabold tracking-tight leading-tight">
                {dashboardTitle}
              </h1>
              <p className="text-[11px] text-white/70 mt-0.5">
                {headerRangeText}
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {!esAdmin && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 px-3 py-1 text-xs font-medium text-white">
                <i className="bx bx-user text-sm" /> Vista personal
              </span>
            )}
            <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-1.5">
              <i className="bx bxl-whatsapp text-sm text-emerald-300" />
              <i className="bx bxl-messenger text-sm text-blue-300" />
              <i className="bx bxl-instagram text-sm text-pink-300" />
              <span className="text-[11px] text-white/80 font-medium ml-1">
                Omnicanal
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-5">
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
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">
            <i className="bx bx-loader-alt bx-spin"></i>
            <span>
              {loadingFilters ? "Cargando filtros..." : null}
              {loadingFilters && loadingData ? " | " : null}
              {loadingData ? "Cargando datos..." : null}
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <i className="bx bx-error-circle text-lg"></i>
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="mt-6">
          <StatsCards summary={summary} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PendingQueue rows={pendingQueue} />
          </div>
          <div className="lg:col-span-1">
            <SlaToday data={slaToday} />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <AgentLoad data={agentLoad} />
          </div>
          <div className="lg:col-span-2">
            <FrequentTransfers data={frequentTransfers} />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
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
