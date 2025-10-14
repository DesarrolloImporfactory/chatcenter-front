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
    <div className="mb-6 rounded-3xl bg-[#171931] text-white p-6 shadow-xl border border-white/10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">
            Canal de Conexiones
          </h1>
          <p className="opacity-90 mt-2 max-w-2xl">
            Administra y monitorea tus canales de mensajería con una interfaz
            limpia y poderosa. Conecta Instagram, Messenger y WhatsApp en
            minutos.
          </p>
          <div className="mt-4 flex gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur text-xs">
              Webhooks activos
            </span>
            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur text-xs">
              Estado en tiempo real
            </span>
            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur text-xs">
              OAuth seguro
            </span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
          {[
            { label: "Conectados", val: "3", sub: "canales" },
            { label: "Plantillas", val: "24", sub: "listas" },
            { label: "Respuestas", val: "12", sub: "rápidas" },
          ].map((k, i) => (
            <div
              key={i}
              className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center"
            >
              <div className="text-2xl font-extrabold">{k.val}</div>
              <div className="opacity-75 text-[12px]">{k.label}</div>
              <div className="opacity-60 text-[10px]">{k.sub}</div>
            </div>
          ))}
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
    <div className="mt-16 p-5">
      <Hero />

      <div className="flex flex-wrap gap-3 mb-6">
        <TabPill
          id="whatsapp"
          active={tab === "whatsapp"}
          onClick={go}
          icon="bx bxl-whatsapp text-lg"
          label="WhatsApp"
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
