import { useState, useEffect } from "react";
import SeguimientosTab from "../dashboard/seguimientos/SeguimientosTab";
import CopyBtn from "./CopyBtn";
import {
  semaforoStyle,
  estadoBadge,
  fmtDate,
  fmtDateTime,
  fmtMoney,
} from "./helpers";

export default function DrawerDetalle({ loading, data, onClose }) {
  const [activeTab, setActiveTab] = useState("detalle");

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
      <aside className="absolute top-0 right-0 h-full w-full max-w-2xl bg-slate-50 shadow-2xl flex flex-col overflow-hidden">
        <div className="flex-shrink-0">
          <div className="bg-gradient-to-br from-[#0B1426] to-[#162138] text-white px-5 py-4 flex items-start justify-between shadow-md">
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
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${sem.dot}`}
                        />{" "}
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

          {u && (
            <div className="bg-white border-b border-slate-200 px-5">
              <div className="flex gap-1">
                <TabBtn
                  active={activeTab === "detalle"}
                  onClick={() => setActiveTab("detalle")}
                  icon="bx-id-card"
                  label="Detalle"
                />
                <TabBtn
                  active={activeTab === "seguimientos"}
                  onClick={() => setActiveTab("seguimientos")}
                  icon="bx-message-square-detail"
                  label="Seguimientos"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-10 text-center text-slate-400">
              <i className="bx bx-loader-alt bx-spin text-4xl" />
              <p className="mt-2">Cargando detalle…</p>
            </div>
          ) : !u ? (
            <div className="p-10 text-center text-slate-400">No hay datos.</div>
          ) : activeTab === "seguimientos" ? (
            <div className="p-5">
              <SeguimientosTab id_usuario={u.id_usuario} />
            </div>
          ) : (
            <DetalleTab data={data} u={u} stripeLink={stripeLink} />
          )}
        </div>
      </aside>
    </div>
  );
}

function DetalleTab({ data, u, stripeLink }) {
  return (
    <div className="p-5 space-y-4">
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
                <CopyBtn text={u.telefono_principal} label="Teléfono copiado" />
              </div>
            ) : (
              <span className="text-slate-300">—</span>
            )}
          </InfoRow>
          <InfoRow label="Registrado" value={fmtDateTime(u.fecha_registro)} />
        </InfoGrid>
      </Section>

      <Section icon="bxs-credit-card" title="Plan y pagos" accent="cyan">
        <InfoGrid>
          <InfoRow label="Plan actual" value={u.nombre_plan || "Sin plan"} />
          <InfoRow label="Precio" value={fmtMoney(u.precio_plan)} />
          <InfoRow label="Tipo" value={u.tipo_plan} />
          <InfoRow label="Permanente" value={u.permanente ? "Sí" : "No"} />
          <InfoRow label="Inicio" value={fmtDate(u.fecha_inicio)} />
          <InfoRow label="Renovación" value={fmtDate(u.fecha_renovacion)} />
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
                <CopyBtn text={u.stripe_subscription_id} label="ID copiado" />
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
                {u.pending_plan_nombre} · {fmtDate(u.pending_effective_at)}
              </span>
            </InfoRow>
          )}
        </InfoGrid>
      </Section>

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
                title="Fecha del último mensaje del cliente."
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

      <Section
        icon="bx-network-chart"
        title={`Configuraciones (${data.configuraciones.length})`}
        accent="slate"
      >
        {data.configuraciones.length === 0 ? (
          <p className="text-sm text-slate-400 italic">Sin configuraciones.</p>
        ) : (
          <div className="space-y-2">
            {data.configuraciones.map((c) => (
              <ConfigCard key={c.id} c={c} />
            ))}
          </div>
        )}
      </Section>

      <Section
        icon="bx-group"
        title={`Subusuarios (${data.subusuarios.length})`}
        accent="sky"
      >
        {data.subusuarios.length === 0 ? (
          <p className="text-sm text-slate-400 italic">Sin subusuarios.</p>
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
  );
}

function TabBtn({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition ${
        active
          ? "border-cyan-600 text-cyan-700"
          : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
      }`}
    >
      <i className={`bx ${icon} text-lg`} /> {label}
    </button>
  );
}

function Section({ icon, title, children, accent = "slate" }) {
  const cls = {
    cyan: "text-cyan-600",
    emerald: "text-emerald-600",
    violet: "text-violet-600",
    sky: "text-sky-600",
    slate: "text-slate-500",
  }[accent];
  return (
    <section className="bg-white rounded-xl ring-1 ring-slate-200 p-4 shadow-sm">
      <h3 className="text-sm font-bold text-[#0B1426] mb-3 flex items-center gap-2">
        <i className={`bx ${icon} text-lg ${cls}`} /> {title}
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
      <i className={`bx ${icon} text-base`} /> {children}
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
