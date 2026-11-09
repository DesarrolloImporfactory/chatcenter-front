import { useState, useEffect, useMemo } from "react";
import Swal from "sweetalert2";
import toast from "react-hot-toast";
import chatApi from "../../../api/chatcenter";
import SeguimientosTab from "../dashboard/seguimientos/SeguimientosTab";
import CopyBtn from "./CopyBtn";
import {
  semaforoStyle,
  estadoBadge,
  fmtDate,
  fmtDateTime,
  fmtMoney,
} from "./helpers";

export default function DrawerDetalle({
  loading,
  data,
  onClose,
  isSuperAdmin = false,
  planes = [],
  onActualizado,
}) {
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
            <DetalleTab
              data={data}
              u={u}
              stripeLink={stripeLink}
              isSuperAdmin={isSuperAdmin}
              planes={planes}
              onActualizado={onActualizado}
            />
          )}
        </div>
      </aside>
    </div>
  );
}

function DetalleTab({
  data,
  u,
  stripeLink,
  isSuperAdmin,
  planes,
  onActualizado,
}) {
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

      {isSuperAdmin && (
        <AccesoAdmin u={u} planes={planes} onActualizado={onActualizado} />
      )}

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

/* ──────────────────────────────────────────────────────────────
   Acceso permanente y complementos a mano (solo super admin).

   Lo que antes se hacía con SQL directo: permanente = 1 (plan gratuito sin
   vencimiento: el back deja pasar sin mirar Stripe ni fechas y el login no
   ofrece planes), cupos extra de conexiones y usuarios, e ImporKiller.
   Endpoints: POST admin_usuarios/acceso_permanente y admin_usuarios/complementos
   (requireSuperAdmin). Cada cambio queda anotado en la pestaña Seguimientos.
   ────────────────────────────────────────────────────────────── */

// Avanzado: el plan base de las cuentas permanentes de Imporfactory.
const PLAN_PERMANENTE_POR_DEFECTO = 4;

// Estados de Stripe en los que la suscripción todavía puede cobrar.
const SUB_VIVA = ["active", "trialing", "past_due", "unpaid", "incomplete"];

function AccesoAdmin({ u, planes, onActualizado }) {
  const permanente = Number(u.permanente) === 1;
  // Suscripción viva en Stripe: el permanente no la frena, hay que cancelarla.
  const conStripe =
    !!u.stripe_subscription_id &&
    SUB_VIVA.includes(String(u.stripe_subscription_status || "").toLowerCase());

  const [idPlan, setIdPlan] = useState("");
  const [conexiones, setConexiones] = useState(0);
  const [subusuarios, setSubusuarios] = useState(0);
  const [imporkiller, setImporkiller] = useState(false);
  const [ocupado, setOcupado] = useState(null); // "acceso" | "complementos" | "cortesia"
  // Meses gratis: Plan Comunidad (22) por defecto, que es el de Imporsuit.
  const [idPlanCortesia, setIdPlanCortesia] = useState("22");
  const [mesesCortesia, setMesesCortesia] = useState(3);

  useEffect(() => {
    setIdPlan(String(u.id_plan || PLAN_PERMANENTE_POR_DEFECTO));
    setConexiones(Number(u.conexiones_adicionales || 0));
    setSubusuarios(Number(u.subusuarios_adicionales || 0));
    setImporkiller(Number(u.imporkiller || 0) === 1);
  }, [u]);

  // Planes vendibles (sin los de prueba de Stripe), más el actual si no está.
  const planesElegibles = useMemo(() => {
    const lista = (planes || []).filter(
      (p) =>
        Number(p.activo ?? 1) === 1 && !/test/i.test(String(p.nombre_plan)),
    );
    if (
      u.id_plan &&
      !lista.some((p) => Number(p.id_plan) === Number(u.id_plan))
    ) {
      lista.push({
        id_plan: u.id_plan,
        nombre_plan: u.nombre_plan || `Plan ${u.id_plan}`,
      });
    }
    return lista;
  }, [planes, u.id_plan, u.nombre_plan]);

  const planElegido = planesElegibles.find((p) => String(p.id_plan) === idPlan);
  const nombrePlan = planElegido?.nombre_plan || `plan ${idPlan}`;
  const planCambiado = permanente && String(u.id_plan || "") !== idPlan;
  const complementosCambiados =
    conexiones !== Number(u.conexiones_adicionales || 0) ||
    subusuarios !== Number(u.subusuarios_adicionales || 0) ||
    imporkiller !== (Number(u.imporkiller || 0) === 1);

  const llamar = async (ruta, body, etiqueta) => {
    setOcupado(etiqueta);
    try {
      const { data } = await chatApi.post(ruta, {
        id_usuario: u.id_usuario,
        ...body,
      });
      // El permanente se aplica aunque Stripe falle: se avisa como error
      // para que no pase desapercibido que se le va a seguir cobrando.
      if (data?.data?.stripe_error) {
        toast.error(data.message, { duration: 9000 });
      } else {
        toast.success(data?.message || "Guardado");
      }
      onActualizado?.(data?.data?.usuario || null);
    } catch (e) {
      toast.error(e?.response?.data?.message || "No se pudo guardar");
    } finally {
      setOcupado(null);
    }
  };

  const confirmar = async ({ title, text, confirmButtonText, danger }) => {
    const r = await Swal.fire({
      title,
      text,
      icon: danger ? "warning" : "question",
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText: "Cancelar",
      confirmButtonColor: danger ? "#e11d48" : "#0B1426",
      reverseButtons: true,
    });
    return r.isConfirmed;
  };

  const activar = async () => {
    const texto = permanente
      ? `${u.empresa} seguirá siendo permanente con los cupos de ${nombrePlan}.`
      : `${u.empresa} entrará sin pagar y sin vencimiento, con los cupos de ${nombrePlan}. No se le volverán a pedir planes.`;

    // Con suscripción viva se ofrece cancelarla ahí mismo (marcada por
    // defecto): el permanente solo no frena los cobros de Stripe.
    const r = await Swal.fire({
      title: permanente ? "Cambiar el plan base" : "Dar acceso permanente",
      text: conStripe
        ? `${texto} Tiene una suscripción viva en Stripe (${u.stripe_subscription_status}).`
        : texto,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: permanente ? "Cambiar plan" : "Activar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#0B1426",
      reverseButtons: true,
      ...(conStripe
        ? {
            input: "checkbox",
            inputValue: 1,
            inputPlaceholder:
              "Cancelar también la suscripción en Stripe para que no se le cobre más",
          }
        : {}),
    });
    if (!r.isConfirmed) return;
    await llamar(
      "admin_usuarios/acceso_permanente",
      {
        activar: true,
        id_plan: Number(idPlan),
        cancelar_stripe: conStripe && Number(r.value) === 1 ? 1 : 0,
      },
      "acceso",
    );
  };

  // Cuenta que ya es permanente pero conserva una suscripción viva.
  const cancelarStripe = async () => {
    const ok = await confirmar({
      title: "Cancelar la suscripción en Stripe",
      text: `Se cancela ya la suscripción de ${u.empresa} (${u.stripe_subscription_status}) y se anulan sus facturas pendientes: no se le cobra más. Sigue siendo permanente.`,
      confirmButtonText: "Cancelar suscripción",
      danger: true,
    });
    if (!ok) return;
    await llamar(
      "admin_usuarios/acceso_permanente",
      {
        activar: true,
        id_plan: Number(u.id_plan || idPlan),
        cancelar_stripe: 1,
      },
      "acceso",
    );
  };

  const quitar = async () => {
    const ok = await confirmar({
      title: "Quitar el acceso permanente",
      text: conStripe
        ? `${u.empresa} pasará a depender de su suscripción de Stripe.`
        : `${u.empresa} quedará vencida y al entrar tendrá que elegir y pagar un plan.`,
      confirmButtonText: "Quitar acceso",
      danger: true,
    });
    if (!ok) return;
    await llamar(
      "admin_usuarios/acceso_permanente",
      { activar: false },
      "acceso",
    );
  };

  const crearCortesia = async () => {
    const plan = planesElegibles.find(
      (p) => String(p.id_plan) === idPlanCortesia,
    );
    const nombre = plan?.nombre_plan || `plan ${idPlanCortesia}`;
    const ok = await confirmar({
      title: `${mesesCortesia} mes(es) gratis de ${nombre}`,
      text:
        `Se crea en Stripe una suscripción a ${nombre} para ${u.empresa} con ${mesesCortesia} mes(es) de prueba; al terminar cobra $${plan?.precio_plan || "?"}/mes con la tarjeta guardada (sin tarjeta, ese cobro queda pendiente).` +
        (conStripe
          ? ` Su suscripción actual (${u.stripe_subscription_status}) se cancela sin prorrateo.`
          : "") +
        " Las facturas abiertas del plan viejo se anulan.",
      confirmButtonText: "Crear suscripción",
    });
    if (!ok) return;
    await llamar(
      "admin_usuarios/suscripcion_cortesia",
      { id_plan: Number(idPlanCortesia), meses: mesesCortesia },
      "cortesia",
    );
  };

  const guardarComplementos = () =>
    llamar(
      "admin_usuarios/complementos",
      {
        conexiones_adicionales: conexiones,
        subusuarios_adicionales: subusuarios,
        imporkiller: imporkiller ? 1 : 0,
      },
      "complementos",
    );

  const leerEntero = (v) => {
    const n = parseInt(v, 10);
    if (Number.isNaN(n)) return 0;
    return Math.max(0, Math.min(999, n));
  };

  return (
    <Section icon="bxs-crown" title="Acceso y complementos" accent="amber">
      <div className="space-y-3">
        <div
          className={`rounded-lg ring-1 p-3 ${
            permanente ? "ring-amber-200 bg-amber-50/40" : "ring-slate-200"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#0B1426] flex items-center gap-1.5">
                <i className="bx bxs-crown text-amber-500" /> Acceso permanente
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Plan gratuito de por vida: no pasa por Stripe, no vence y no se
                le piden planes al entrar. Los cupos salen del plan base.
              </p>
            </div>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 flex-shrink-0 ${
                permanente
                  ? "bg-amber-100 text-amber-800 ring-amber-200"
                  : "bg-slate-100 text-slate-600 ring-slate-200"
              }`}
            >
              {permanente ? "Activo" : "No"}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="flex-1 min-w-[200px]">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Plan base
              </span>
              <select
                value={idPlan}
                onChange={(e) => setIdPlan(e.target.value)}
                disabled={!!ocupado}
                className="mt-0.5 w-full rounded-lg ring-1 ring-slate-200 bg-white px-2.5 py-1.5 text-sm text-[#0B1426] focus:outline-none focus:ring-cyan-400"
              >
                {planesElegibles.map((p) => (
                  <option key={p.id_plan} value={String(p.id_plan)}>
                    {p.nombre_plan}
                    {p.max_conexiones != null
                      ? ` · ${p.max_conexiones} conex. · ${p.max_subusuarios} usuarios`
                      : ""}
                  </option>
                ))}
              </select>
            </label>

            {!permanente ? (
              <AdminBtn
                icon="bxs-crown"
                onClick={activar}
                disabled={!!ocupado}
                busy={ocupado === "acceso"}
              >
                Activar acceso permanente
              </AdminBtn>
            ) : (
              <>
                {planCambiado && (
                  <AdminBtn
                    icon="bx-save"
                    onClick={activar}
                    disabled={!!ocupado}
                    busy={ocupado === "acceso"}
                  >
                    Guardar plan
                  </AdminBtn>
                )}
                {conStripe && (
                  <AdminBtn
                    icon="bxl-stripe"
                    onClick={cancelarStripe}
                    disabled={!!ocupado}
                    busy={ocupado === "acceso"}
                    danger
                  >
                    Cancelar suscripción
                  </AdminBtn>
                )}
                <AdminBtn
                  icon="bx-x-circle"
                  onClick={quitar}
                  disabled={!!ocupado}
                  busy={ocupado === "acceso"}
                  danger
                >
                  Quitar acceso
                </AdminBtn>
              </>
            )}
          </div>

          {conStripe && (
            <p className="mt-2 text-xs text-amber-700 flex items-start gap-1">
              <i className="bx bx-error text-sm mt-px" />
              <span>
                Tiene una suscripción viva en Stripe (
                {u.stripe_subscription_status}). El permanente solo no la frena:
                {permanente
                  ? " cancélala con el botón para que no se le cobre más."
                  : " al activar se ofrece cancelarla para que no se le cobre más."}
              </span>
            </p>
          )}
        </div>

        <div className="rounded-lg ring-1 ring-slate-200 p-3">
          <div className="text-sm font-semibold text-[#0B1426] flex items-center gap-1.5">
            <i className="bx bxs-plug text-indigo-500" /> Complementos a mano
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Se fijan directo en la cuenta, sin cobro, y se suman a los cupos del
            plan base. Lo que el cliente compre por Stripe los sobreescribe.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <label>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Conexiones adicionales
              </span>
              <input
                type="number"
                min={0}
                max={999}
                value={conexiones}
                disabled={!!ocupado}
                onChange={(e) => setConexiones(leerEntero(e.target.value))}
                className="mt-0.5 w-full rounded-lg ring-1 ring-slate-200 bg-white px-2.5 py-1.5 text-sm text-[#0B1426] focus:outline-none focus:ring-cyan-400"
              />
              <span className="text-[10px] text-slate-400">
                Plan: {Number(u.max_conexiones || 0)} · total{" "}
                {Number(u.max_conexiones || 0) + conexiones}
              </span>
            </label>
            <label>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Usuarios adicionales
              </span>
              <input
                type="number"
                min={0}
                max={999}
                value={subusuarios}
                disabled={!!ocupado}
                onChange={(e) => setSubusuarios(leerEntero(e.target.value))}
                className="mt-0.5 w-full rounded-lg ring-1 ring-slate-200 bg-white px-2.5 py-1.5 text-sm text-[#0B1426] focus:outline-none focus:ring-cyan-400"
              />
              <span className="text-[10px] text-slate-400">
                Plan: {Number(u.max_subusuarios || 0)} · total{" "}
                {Number(u.max_subusuarios || 0) + subusuarios}
              </span>
            </label>
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm text-[#0B1426] cursor-pointer">
            <input
              type="checkbox"
              checked={imporkiller}
              disabled={!!ocupado}
              onChange={(e) => setImporkiller(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-400"
            />
            <span className="font-semibold">ImporKiller</span>
            <span className="text-xs text-slate-500">
              extensión de Chrome y anuncios
              {permanente ? " (una cuenta permanente ya lo tiene)" : ""}
            </span>
          </label>

          <div className="mt-3 flex justify-end">
            <AdminBtn
              icon="bx-save"
              onClick={guardarComplementos}
              disabled={!complementosCambiados || !!ocupado}
              busy={ocupado === "complementos"}
            >
              Guardar complementos
            </AdminBtn>
          </div>
        </div>

        <div className="rounded-lg ring-1 ring-slate-200 p-3">
          <div className="text-sm font-semibold text-[#0B1426] flex items-center gap-1.5">
            <i className="bx bx-gift text-emerald-500" /> Meses gratis
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Crea en Stripe una suscripción real al plan con los meses de prueba
            y cobro mensual después (Imporsuit: 3 meses). Reemplaza la
            suscripción actual si está viva y anula las facturas abiertas del
            plan viejo.
          </p>

          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="flex-1 min-w-[200px]">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Plan
              </span>
              <select
                value={idPlanCortesia}
                onChange={(e) => setIdPlanCortesia(e.target.value)}
                disabled={!!ocupado}
                className="mt-0.5 w-full rounded-lg ring-1 ring-slate-200 bg-white px-2.5 py-1.5 text-sm text-[#0B1426] focus:outline-none focus:ring-cyan-400"
              >
                {planesElegibles.map((p) => (
                  <option key={p.id_plan} value={String(p.id_plan)}>
                    {p.nombre_plan}
                    {p.precio_plan ? ` · $${p.precio_plan}/mes` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="w-24">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Meses
              </span>
              <input
                type="number"
                min={1}
                max={12}
                value={mesesCortesia}
                disabled={!!ocupado}
                onChange={(e) =>
                  setMesesCortesia(
                    Math.max(
                      1,
                      Math.min(12, parseInt(e.target.value, 10) || 1),
                    ),
                  )
                }
                className="mt-0.5 w-full rounded-lg ring-1 ring-slate-200 bg-white px-2.5 py-1.5 text-sm text-[#0B1426] focus:outline-none focus:ring-cyan-400"
              />
            </label>
            <AdminBtn
              icon="bx-gift"
              onClick={crearCortesia}
              disabled={!!ocupado}
              busy={ocupado === "cortesia"}
            >
              Crear suscripción
            </AdminBtn>
          </div>
          {permanente && (
            <p className="mt-2 text-xs text-amber-700 flex items-start gap-1">
              <i className="bx bx-error text-sm mt-px" />
              <span>
                La cuenta es permanente: no se le pedirá pago aunque la
                suscripción cobre. Quita el permanente si quieres que pague al
                terminar los meses gratis.
              </span>
            </p>
          )}
        </div>
      </div>
    </Section>
  );
}

function AdminBtn({ icon, onClick, disabled, busy, danger, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${
        danger
          ? "bg-white text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50"
          : "bg-[#0B1426] text-white hover:bg-[#162138] shadow-sm"
      }`}
    >
      <i className={`bx ${busy ? "bx-loader-alt bx-spin" : icon} text-base`} />
      {children}
    </button>
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
    amber: "text-amber-500",
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
