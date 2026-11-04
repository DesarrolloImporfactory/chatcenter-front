import React, { useState } from "react";
import PanelAgendaPublica from "./PanelAgendaPublica";

/**
 * AdminAgendaPublicaView — /administrador-agenda (solo super admin)
 *
 * Administra la agenda pública PRINCIPAL de ImporChat: la que abren
 * «Agendar implementación gratis» (modal de arranque) y «Agendar demo»
 * (/home), y /agendar sin slug. Cada cuenta configura la suya desde
 * Calendario → Agenda pública con el mismo panel.
 */

const HeaderStat = ({ label, value, icon, accent }) => (
  <div className="rounded-xl bg-white/[0.06] ring-1 ring-white/10 px-3.5 py-2.5 backdrop-blur">
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-white/50 font-semibold">
      <i className={`bx ${icon} ${accent}`} />
      {label}
    </div>
    <div className="mt-0.5 text-sm font-bold text-white truncate">{value}</div>
  </div>
);

const AdminAgendaPublicaView = () => {
  const [data, setData] = useState(null);
  const config = data?.config;
  const activos = (data?.asesores || []).filter((a) => a.en_lista === 1).length;
  const proximas = (data?.reservas || []).filter(
    (r) => new Date(r.inicio) > new Date() && ["Agendado", "Confirmado"].includes(r.status),
  ).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-[#0B1426] text-white">
        <div className="mx-auto max-w-6xl px-5 py-7 sm:px-8">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-sky-300">Super admin</div>
          <h1 className="mt-1 text-2xl font-extrabold">Agenda pública de implementación</h1>
          <p className="mt-1 max-w-2xl text-[13.5px] text-slate-300">
            Lo que abre «Agendar implementación gratis» (modal de arranque) y «Agendar demo» (/home). Las reservas caen en
            el calendario <b className="text-white">{data?.cuenta?.agenda || "…"}</b> de la cuenta{" "}
            <b className="text-white">{data?.cuenta?.nombre || "…"}</b> y se reparten entre el equipo activo.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <HeaderStat label="Estado" value={config ? (Number(config.activo) ? "Activa" : "Apagada") : "…"} icon="bx-power-off" accent={Number(config?.activo) ? "text-emerald-300" : "text-rose-300"} />
            <HeaderStat label="Atienden" value={activos} icon="bx-group" accent="text-sky-300" />
            <HeaderStat label="Reuniones próximas" value={proximas} icon="bx-calendar-event" accent="text-cyan-300" />
            <HeaderStat
              label="Recordatorio WhatsApp"
              value={data?.cuenta?.recordatorio_plantilla ? `${data.cuenta.recordatorio_horas || 1} h antes` : "Sin plantilla"}
              icon="bxl-whatsapp"
              accent={data?.cuenta?.recordatorio_plantilla ? "text-emerald-300" : "text-amber-300"}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
        <PanelAgendaPublica modo="admin" onCargado={setData} />
      </div>
    </div>
  );
};

export default AdminAgendaPublicaView;
