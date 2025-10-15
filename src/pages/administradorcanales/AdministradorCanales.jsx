import React, { useEffect, useState, useMemo } from "react";
import WhatsappSection from "../../components/canales/WhatsappSection";
import InstagramSection from "../../components/canales/InstagramSection";
import MessengerSection from "../../components/canales/MessengerSection";

function TabPill({ id, active, onClick, icon, label, accent }) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`group relative inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold transition-all ${
        active
          ? `${accent.bg} ${accent.text} shadow-[0_6px_18px_rgba(0,0,0,.12)]`
          : `bg-white text-gray-700 hover:bg-gray-50 border border-gray-200`
      }`}
      aria-current={active ? "page" : undefined}
    >
      <i className={`${icon} ${active ? "" : accent.icon}`} />
      <span>{label}</span>
      {active && (
        <span
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-1 w-10 rounded-full opacity-80"
          style={{ background: accent.dot }}
        />
      )}
    </button>
  );
}

const ACCENTS = {
  whatsapp: {
    bg: "bg-emerald-600",
    text: "text-white",
    dot: "#059669",
    icon: "text-emerald-600",
  },
  instagram: {
    bg: "bg-gradient-to-r from-pink-600 to-fuchsia-600",
    text: "text-white",
    dot: "#d946ef",
    icon: "text-fuchsia-600",
  },
  messenger: {
    bg: "bg-blue-600",
    text: "text-white",
    dot: "#2563eb",
    icon: "text-blue-600",
  },
};

function Hero() {
  return (
    <div className="mb-6 rounded-3xl bg-[#0E1025] text-white p-6 md:p-8 shadow-xl border border-white/10 relative overflow-hidden">
      {/* Glow sutil decorativo */}
      <div
        className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-20"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 50%, #3B82F6 0%, rgba(59,130,246,0) 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full blur-3xl opacity-20"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 50%, #10B981 0%, rgba(16,185,129,0) 70%)",
        }}
      />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative">
        <div>
          <h1 className="text-[28px] md:text-[36px] font-black leading-tight tracking-tight">
            Canal de Conexiones
          </h1>
          <p className="mt-2  text-white/80">
            Gestiona WhatsApp, Instagram y Messenger con métricas claras y
            acciones rápidas. Todo en un mismo lugar.
          </p>

          {/* Chips (mismo contenido) */}
          <div className="mt-4 flex gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur text-[11px]">
              Webhooks activos
            </span>
            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur text-[11px]">
              Estado en tiempo real
            </span>
            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur text-[11px]">
              OAuth seguro
            </span>
          </div>
        </div>

        {/* Línea decorativa compacta */}
        <div className="hidden md:block self-stretch w-px bg-white/10" />

        {/* “Marca” lateral sin datos nuevos */}
        <div className="md:min-w-[220px] md:text-right">
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/5 border border-white/10">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-sm font-semibold tracking-wide text-white/90">
              Consolida tus canales en segundos.
            </span>
          </div>
          <div className="mt-2 text-xs text-white/60"></div>
        </div>
      </div>
    </div>
  );
}

export default function AdministradorCanales() {
  const [tab, setTab] = useState("whatsapp");

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get("tab");
    if (t && ["whatsapp", "instagram", "messenger"].includes(t)) setTab(t);
  }, []);

  const go = (id) => {
    setTab(id);
    const sp = new URLSearchParams(window.location.search);
    sp.set("tab", id);
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}?${sp.toString()}`
    );
  };

  return (
    <div className="p-5">
      <Hero />

      <div className="flex flex-wrap gap-3 mb-6">
        <TabPill
          id="whatsapp"
          active={tab === "whatsapp"}
          onClick={go}
          icon="bx bxl-whatsapp text-lg"
          label="WhatsApp Business"
          accent={ACCENTS.whatsapp}
        />
        <TabPill
          id="instagram"
          active={tab === "instagram"}
          onClick={go}
          icon="bx bxl-instagram text-lg"
          label="Instagram"
          accent={ACCENTS.instagram}
        />
        <TabPill
          id="messenger"
          active={tab === "messenger"}
          onClick={go}
          icon="bx bxl-messenger text-lg"
          label="Messenger"
          accent={ACCENTS.messenger}
        />
      </div>

      {/* Content */}
      <div className="space-y-8">
        {tab === "whatsapp" && <WhatsappSection />}
        {tab === "instagram" && <InstagramSection />}
        {tab === "messenger" && <MessengerSection />}
      </div>
    </div>
  );
}
