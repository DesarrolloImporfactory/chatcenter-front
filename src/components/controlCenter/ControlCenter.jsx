import React, { useState, useEffect, useCallback } from "react";
import Adsboard from "../metaAsd/Adsboard";
import Dropiboard from "../../pages/dropi/Dropiboard";
import Chatboard from "../../components/dashboard/Dashboard";

const TABS = [
  {
    id: "dropi",
    label: "Operación Dropi",
    shortLabel: "Dropi",
    icon: "bx-package",
    color: "#FF6B35",
    description: "Órdenes, entregas, devoluciones y profit",
    shortcut: "1",
  },
  {
    id: "ads",
    label: "Anuncios Meta",
    shortLabel: "Ads",
    icon: "bxl-meta",
    color: "#3b82f6",
    description: "Campañas, presupuestos y métricas Meta",
    shortcut: "2",
  },
  {
    id: "chatboard",
    label: "Dashboard de mensajes",
    shortLabel: "Mensajes",
    icon: "bx-message-rounded-dots",
    color: "#059669",
    description: "Conversaciones, SLA y rendimiento de agentes",
    shortcut: "3",
  },
];

/* ── Helpers de URL/localStorage para persistir el tab activo ── */
const STORAGE_KEY = "cc_active_tab";

function getInitialTab() {
  if (typeof window === "undefined") return "dropi";

  // 1) Query param ?view=
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("view");
  if (fromUrl && TABS.find((t) => t.id === fromUrl)) return fromUrl;

  // 2) localStorage
  const fromStorage = localStorage.getItem(STORAGE_KEY);
  if (fromStorage && TABS.find((t) => t.id === fromStorage)) return fromStorage;

  // 3) Default
  return "dropi";
}

function updateUrlParam(tabId) {
  const url = new URL(window.location.href);
  url.searchParams.set("view", tabId);
  window.history.replaceState({}, "", url.toString());
}

/* ══════════════════════════════════════════════════════════ */

export default function ControlCenter() {
  const [active, setActive] = useState(getInitialTab);
  const [isChanging, setIsChanging] = useState(false);

  const handleTabChange = useCallback(
    (tabId) => {
      if (tabId === active) return;
      setIsChanging(true);
      setActive(tabId);
      localStorage.setItem(STORAGE_KEY, tabId);
      updateUrlParam(tabId);
      setTimeout(() => setIsChanging(false), 150);
    },
    [active],
  );

  // Keyboard shortcuts: Cmd/Ctrl + 1/2/3
  useEffect(() => {
    const handler = (e) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
        return;
      const tab = TABS.find((t) => t.shortcut === e.key);
      if (tab) {
        e.preventDefault();
        handleTabChange(tab.id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleTabChange]);

  const activeTab = TABS.find((t) => t.id === active) || TABS[0];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ─── Header sticky con tabs ─── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Lado izquierdo — título + descripción del activo */}
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-xl grid place-items-center shrink-0 transition-colors duration-200"
                style={{ background: `${activeTab.color}15` }}
              >
                <i
                  className={`bx ${activeTab.icon} text-xl transition-colors duration-200`}
                  style={{ color: activeTab.color }}
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-slate-900 tracking-tight">
                    Centro de Control
                  </h1>
                  <span className="text-slate-300">·</span>
                  <span
                    className="text-sm font-semibold transition-colors duration-200"
                    style={{ color: activeTab.color }}
                  >
                    {activeTab.label}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  {activeTab.description}
                </p>
              </div>
            </div>

            {/* Lado derecho — tabs */}
            <nav className="flex gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
              {TABS.map((tab) => {
                const isActive = active === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`
                      relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                      ${
                        isActive
                          ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                          : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                      }
                    `}
                    title={`${tab.label} (⌘${tab.shortcut})`}
                  >
                    <i
                      className={`bx ${tab.icon} text-base`}
                      style={{ color: isActive ? tab.color : undefined }}
                    />
                    <span className="hidden sm:inline">{tab.shortLabel}</span>
                    {isActive && (
                      <span
                        className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                        style={{ background: tab.color }}
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Barra de acento del color del tab activo */}
        <div
          className="h-0.5 transition-colors duration-300"
          style={{ background: activeTab.color }}
        />
      </div>

      {/* ─── Contenido del dashboard activo ─── */}
      <div
        className={`transition-opacity duration-150 ${isChanging ? "opacity-50" : "opacity-100"}`}
      >
        {/* Mantenemos los 3 montados pero ocultos para que no pierdan su estado interno
            (rango, filtros, scroll position) al cambiar de tab.
            Si prefieres que se desmonten para liberar memoria, cambia a render condicional clásico. */}
        <div style={{ display: active === "dropi" ? "block" : "none" }}>
          <Dropiboard />
        </div>
        <div style={{ display: active === "ads" ? "block" : "none" }}>
          <Adsboard />
        </div>
        <div style={{ display: active === "chatboard" ? "block" : "none" }}>
          <Chatboard />
        </div>
      </div>
    </div>
  );
}
