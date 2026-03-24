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
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function daysAgoISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ═════════════════════════════════════════════════════════════════════
// getUserInfo — Detectar rol desde localStorage
// ═════════════════════════════════════════════════════════════════════
function getUserInfo() {
  const id_usuario = Number(localStorage.getItem("id_usuario"));

  // _raw: leemos como string crudo porque localStorage.getItem retorna null
  // si la key no existe. Number(null) = 0, lo cual confundiría "no tiene"
  // con "id = 0". Por eso: si existe el string → Number(), si no → null.
  const id_sub_usuario_raw = localStorage.getItem("id_sub_usuario");
  const id_sub_usuario = id_sub_usuario_raw ? Number(id_sub_usuario_raw) : null;

  // Tu localStorage guarda "user_role", el fallback "rol" es por compatibilidad
  const rol =
    localStorage.getItem("user_role") || localStorage.getItem("rol") || null;

  const esAdmin = !id_sub_usuario || rol === "administrador";

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

  // Tiempo Real
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
          ...uniqueByName(
            users.map(
              (u) => u.nombre_encargado || u.nombre || u.name || u.usuario,
            ),
          ),
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

  // === 3) Resolver id_configuracion desde nombre de conexión ===
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

  // === 3b) Resolver id_sub_usuario desde nombre de usuario seleccionado ===
  // Cuando el admin selecciona "Belén Garcia ImporFactory" en el dropdown,
  // buscamos su id_sub_usuario (378) en _raw.usuarios para enviarlo al backend.
  // Si está en "Todos" → null → el backend no filtra por agente.
  const selectedSubUsuarioFiltro = useMemo(() => {
    if (!esAdmin) return null; // Agente no usa este filtro, el backend ya lo filtra por él
    if (!filters.user || filters.user === "Todos") return null;

    const usuarios = options._raw?.usuarios || [];
    const row = usuarios.find((u) => {
      const nombre = safeName(
        u.nombre_encargado || u.nombre || u.name || u.usuario,
      );
      return nombre.toLowerCase() === safeName(filters.user).toLowerCase();
    });
    return row?.id_sub_usuario ? Number(row.id_sub_usuario) : null;
  }, [filters.user, options._raw, esAdmin]);

  // === 4) FETCH — elige endpoint según rol ===
  const fetchSections = useCallback(
    async (sections) => {
      console.log("[RT] fetchSections llamado con:", sections);

      const isAll = sections.includes("all");
      try {
        setErrorMsg("");
        if (isAll) setLoadingData(true);

        // ── Elegir endpoint según rol ──────────────────────────────────
        const endpoint = esAdmin
          ? "/dashboard/obtener_dashboard_completo"
          : "/dashboard/obtener_dashboard_agente";

        const payload = {
          id_usuario,
          id_configuracion: selectedConfigId,
          from: filters.dateRange?.from || null,
          to: filters.dateRange?.to || null,
        };

        if (esAdmin) {
          // Admin: si seleccionó un usuario específico, enviar su id para filtrar
          // Si es "Todos" → selectedSubUsuarioFiltro es null → backend no filtra
          if (selectedSubUsuarioFiltro) {
            payload.id_sub_usuario_filtro = selectedSubUsuarioFiltro;
          }
        } else {
          // Agente: siempre envía su propio id_sub_usuario
          if (id_sub_usuario) {
            payload.id_sub_usuario = id_sub_usuario;
          }
        }

        const resp = await chatApi.post(endpoint, payload, {
          timeout: 50000,
        });
        const data = resp?.data?.data || {};

        if (isAll || sections.includes("summary")) {
          const s = data.summary || {};
          setSummary({
            chatsCreated: Number(s.chatsCreated || 0),
            chatsResolved: Number(s.chatsResolved || 0),
            withReplies: Number(s.withReplies || 0),
            noReply: Number(s.noReply || 0),
            avgFirstResponseSeconds: s.avgFirstResponseSeconds ?? null,
            avgResolutionSeconds: s.avgResolutionSeconds ?? null,
          });
        }
        if (isAll || sections.includes("pendingQueue"))
          setPendingQueue(
            Array.isArray(data.pendingQueue) ? data.pendingQueue : [],
          );

        if (isAll || sections.includes("slaToday")) {
          const sla = data.slaToday || {};
          setSlaToday({
            generalPct: Number(sla.generalPct || 0),
            metaPct: Number(sla.metaPct || 90),
            channels: Array.isArray(sla.channels) ? sla.channels : [],
            resolvedToday: Number(sla.resolvedToday || 0),
            abandoned: Number(sla.abandoned || 0),
          });
        }
        if (isAll || sections.includes("charts")) {
          const ch = data.charts || {};
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
        if (isAll || sections.includes("agentLoad"))
          setAgentLoad(Array.isArray(data.agentLoad) ? data.agentLoad : []);

        if (isAll || sections.includes("frequentTransfers"))
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

  // Tiempo real via socket
  useDashboardRealtime({
    socket,
    id_usuario,
    onRefreshSections: fetchSections,
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const headerRangeText =
    filters?.dateRange?.from && filters?.dateRange?.to
      ? `Período: ${filters.dateRange.from} al ${filters.dateRange.to}`
      : "Seleccione un rango de fechas para ver el desempeño.";

  const dashboardTitle = esAdmin
    ? "Dashboard analítico de chat center"
    : "Mi dashboard de rendimiento";

  return (
    <div className="min-h-[calc(100vh-48px)] w-full bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="mx-auto w-full max-w-[100%] px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg shadow-blue-600/30">
                <i className="bx bx-bar-chart-alt-2 text-xl text-white"></i>
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                  {dashboardTitle}
                </h1>
                <p className="mt-0.5 text-sm text-slate-600">
                  {headerRangeText}
                </p>
              </div>
            </div>
          </div>

          {!esAdmin && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
              <i className="bx bx-user text-sm"></i>
              Vista personal
            </span>
          )}
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
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">
            <i className="bx bx-loader-alt bx-spin"></i>
            <span>
              {loadingFilters ? "Cargando filtros..." : null}
              {loadingFilters && loadingData ? " | " : null}
              {loadingData ? "Cargando datos..." : null}
            </span>
          </div>
        )}

        {errorMsg ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <i className="bx bx-error-circle text-lg"></i>
            <span>{errorMsg}</span>
          </div>
        ) : null}

        {/* Stats Cards */}
        <div className="mt-6">
          <StatsCards summary={summary} />
        </div>

        {/* Cola + SLA */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PendingQueue rows={pendingQueue} />
          </div>
          <div className="lg:col-span-1">
            <SlaToday data={slaToday} />
          </div>
        </div>

        {/* Carga por asesor + Transferencias frecuentes */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <AgentLoad data={agentLoad} />
          </div>
          <div className="lg:col-span-2">
            <FrequentTransfers data={frequentTransfers} />
          </div>
        </div>

        {/* Gráficas */}
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
