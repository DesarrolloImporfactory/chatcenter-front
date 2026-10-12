import { useEffect, useRef, useState } from "react";
import {
  IMPORCHAT_CONFIGS_HABILITADAS,
  buscarCuenta,
} from "../../services/imporchat/cuenta.service";

/**
 * Pills de la cuenta ImporChat del contacto en la cabecera del chat, solo en
 * las conexiones de soporte y ventas (242 / 251 / 265). Pedido 12-10-2026: el
 * asesor abre el chat y, sin tocar el panel derecho, ve en qué parte del
 * embudo de recuperación está la persona (o si es un cliente a mantener), su
 * plan y estado, cuándo vence, cuántas conexiones mueve, quién lleva su caso
 * y qué fue lo último que se le registró.
 *
 * Reutiliza GET /imporchat_cartera/buscar (la misma búsqueda del panel
 * derecho, por teléfono y luego correo), que ahora devuelve `situacion`.
 * Cabe en la fila de etiquetas: son pills que hacen wrap, con el detalle en
 * el tooltip, así la cabecera no crece ni deja de ser responsive.
 *
 * Al hacer clic NO se va a /recuperacion: no todos los asesores tienen ese
 * módulo. Se abre un modal con el embudo completo (barras por importancia),
 * dónde está este cliente y qué conviene hacer, con lo que ya trajo /buscar.
 */

// Etapas del embudo, de más a menos urgente. `peso` dibuja la barra.
const ETAPAS = [
  {
    id: "pago_rebotado", prioridad: 1, peso: 100, label: "Pago rebotado",
    cls: "border-rose-200 bg-rose-50 text-rose-800", bar: "bg-rose-500",
    que: "Pagaba y la tarjeta falló: la cuenta quedó en pausa con el bot apagado.",
    hacer: "Que pague la factura pendiente (Mi plan → Pagar ahora). Nunca una suscripción nueva.",
  },
  {
    id: "cancelacion_programada", prioridad: 2, peso: 85, label: "Cancelación programada",
    cls: "border-amber-200 bg-amber-50 text-amber-800", bar: "bg-amber-500",
    que: "Pidió cancelar y sigue activo hasta que termine el periodo.",
    hacer: "Preguntar qué lo frenó y ofrecer implementación. Si se queda, quitar la cancelación desde Mi plan.",
  },
  {
    id: "vencido", prioridad: 3, peso: 70, label: "Vencido",
    cls: "border-orange-200 bg-orange-50 text-orange-800", bar: "bg-orange-500",
    que: "Su plan venció en los últimos 60 días y no renovó.",
    hacer: "Reactivar: elegir plan y pagar. Preguntar por qué no renovó.",
  },
  {
    id: "cancelado_reciente", prioridad: 4, peso: 55, label: "Cancelado (30 días)",
    cls: "border-slate-300 bg-slate-100 text-slate-700", bar: "bg-slate-500",
    que: "Canceló hace menos de 30 días. Todavía recuerda el sistema.",
    hacer: "Entender el motivo real y ofrecer volver con acompañamiento.",
  },
  {
    id: "en_prueba", prioridad: 5, peso: 40, label: "En prueba (con tarjeta)",
    cls: "border-cyan-200 bg-cyan-50 text-cyan-800", bar: "bg-cyan-500",
    que: "Tarjeta capturada y en trial: al terminar, Stripe cobra solo.",
    hacer: "Que use el sistema antes del primer cobro: bot, seguimientos, anuncios.",
  },
  {
    id: "sin_tarjeta", prioridad: 6, peso: 25, label: "Sin tarjeta (acceso manual)",
    cls: "border-violet-200 bg-violet-50 text-violet-800", bar: "bg-violet-500",
    que: "Plan activo sin tarjeta: cortesía del curso o acceso manual.",
    hacer: "Mostrar valor y que capture tarjeta o pague antes de que venza.",
  },
];
const ETAPA = Object.fromEntries(ETAPAS.map((e) => [e.id, e]));

const VERBO = {
  cancelacion_programada: "Se va",
  pago_rebotado: "Venció",
  vencido: "Venció",
  cancelado_reciente: "Canceló",
  en_prueba: "Prueba termina",
  sin_tarjeta: "Acceso termina",
};

const ESTADO_UI = {
  activo: "text-emerald-700",
  suspendido: "text-rose-700",
  vencido: "text-orange-700",
  cancelado: "text-slate-600",
  inactivo: "text-slate-500",
};

const RESULTADO = {
  contactado_exitoso: "Conversó",
  no_contesto: "No contestó",
  numero_invalido: "Número inválido",
  programar_seguimiento: "Otro día",
  promesa_pago: "Prometió pagar",
  pago_confirmado: "Pagó",
  retenido: "Retenido",
  convertido: "Convertido",
  interesado: "Interesado",
  no_interesado: "No le interesa",
  cancelado: "Confirmó cancelar",
  sin_resultado: "Sin resultado",
  otro: "Otro",
};

// Niveles fuera del embudo: clientes que hay que cuidar, no recuperar.
const NIVEL_SANO = {
  recurrente: {
    cls: "border-emerald-200 bg-emerald-50 text-emerald-800", icon: "bx-medal",
    titulo: "Cliente a mantener",
    que: "Lleva dos o más cobros reales y su suscripción está activa. Es la base del negocio.",
    hacer: "Atención rápida y completa. Si pide algo, resolverlo hoy. Cualquier queja de este cliente es prioridad.",
  },
  pagando: {
    cls: "border-emerald-200 bg-emerald-50 text-emerald-800", icon: "bx-check-circle",
    titulo: "Pagando · primer mes",
    que: "Ya pasó su primer cobro real. El segundo mes decide si se queda.",
    hacer: "Asegurar que esté usando el bot y los seguimientos. Un cliente que usa, renueva.",
  },
  permanente: {
    cls: "border-violet-200 bg-violet-50 text-violet-800", icon: "bx-crown",
    titulo: "Cortesía permanente",
    que: "Cuenta VIP sin cobro. No entra al embudo.",
    hacer: "Atender normal; no hay nada que cobrar ni recuperar.",
  },
  activo: {
    cls: "border-sky-200 bg-sky-50 text-sky-800", icon: "bx-user-check",
    titulo: "Activo sin cobros",
    que: "Cuenta activa que todavía no ha pagado nada real.",
    hacer: "Acompañar el uso para que llegue al primer pago.",
  },
};

const fecha = (d) =>
  d ? new Date(d).toLocaleDateString("es-EC", { day: "2-digit", month: "short" }) : "";
const fechaLarga = (d) =>
  d ? new Date(d).toLocaleDateString("es-EC", { day: "2-digit", month: "long", year: "numeric" }) : "—";
const rel = (n) => {
  if (n == null) return "";
  if (n === 0) return "hoy";
  if (n === 1) return "mañana";
  if (n === -1) return "ayer";
  return n > 0 ? `en ${n} días` : `hace ${Math.abs(n)} días`;
};
const money = (n) => (n == null ? "" : `$${Number(n).toFixed(0)}`);

function Pill({ cls, icon, children, title, onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 shadow-sm max-w-full ${cls} ${
        onClick ? "hover:shadow transition cursor-pointer" : ""
      }`}
    >
      {icon && <i className={`bx ${icon} text-[12px] shrink-0`} />}
      <span className="text-[11px] font-semibold truncate max-w-[260px]">{children}</span>
    </Tag>
  );
}

export default function ImporchatHeaderBadges({ selectedChat, idConfiguracion }) {
  const habilitado = IMPORCHAT_CONFIGS_HABILITADAS.includes(Number(idConfiguracion));
  const telefono = selectedChat?.celular_cliente || "";
  const email = selectedChat?.email_cliente || "";
  const [estado, setEstado] = useState({ cargando: false, data: null, clave: "" });
  const [modal, setModal] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!habilitado) return undefined;
    const clave = `${telefono}|${email}`;
    setModal(false);
    if (!telefono && !email) {
      setEstado({ cargando: false, data: null, clave });
      return undefined;
    }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setEstado((s) => ({ ...s, cargando: true, clave }));
    buscarCuenta({ telefono, email }, { signal: ctrl.signal })
      .then((data) => {
        if (!ctrl.signal.aborted) setEstado({ cargando: false, data, clave });
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setEstado({ cargando: false, data: null, clave });
      });
    return () => ctrl.abort();
  }, [habilitado, telefono, email]);

  if (!habilitado || !selectedChat) return null;

  if (estado.cargando && !estado.data) {
    return (
      <Pill cls="border-slate-200 bg-white text-slate-400 animate-pulse" icon="bx-loader-alt bx-spin">
        Buscando cuenta ImporChat…
      </Pill>
    );
  }
  const d = estado.data;
  if (!d) return null;
  if (!d.encontrado) {
    return (
      <Pill
        cls="border-slate-200 bg-white text-slate-500"
        icon="bx-user-x"
        title="No hay una cuenta de ImporChat con este teléfono ni este correo. Puede ser que el contacto tenga otro número registrado: revísalo en el panel derecho."
      >
        Sin cuenta ImporChat con este número
      </Pill>
    );
  }

  const s = d.situacion || {};
  const u = d.usuario || {};
  const enRiesgo = s.nivel === "riesgo";
  const etapa = enRiesgo ? ETAPA[s.cohorte] : null;
  const sano = !enRiesgo ? NIVEL_SANO[s.nivel] : null;
  const abrir = () => setModal(true);
  const pills = [];

  // 1) Nivel / situación en el embudo (clic: modal explicativo)
  if (etapa) {
    pills.push(
      <Pill key="nivel" cls={etapa.cls} icon="bx-error-circle" title={`${etapa.que} Prioridad ${etapa.prioridad} de 6. Clic para ver el embudo completo.`} onClick={abrir}>
        {etapa.label} · prioridad {etapa.prioridad}
      </Pill>,
    );
  } else if (sano) {
    pills.push(
      <Pill key="nivel" cls={sano.cls} icon={sano.icon} title={`${sano.que} Clic para ver el detalle.`} onClick={abrir}>
        {sano.titulo}
        {s.nivel === "recurrente" && ` · ${s.pagos_reales} pagos`}
      </Pill>,
    );
  } else if (s.nivel) {
    pills.push(
      <Pill key="nivel" cls="border-slate-300 bg-slate-100 text-slate-700" icon="bx-user" title="Estado de la cuenta en ImporChat. Clic para ver el detalle." onClick={abrir}>
        Cuenta {s.nivel}
      </Pill>,
    );
  }

  // 2) Plan + estado
  pills.push(
    <Pill
      key="plan"
      cls="border-slate-200 bg-white text-slate-700"
      icon="bx-package"
      title={`Plan ${s.plan || u.nombre_plan || "sin plan"}${s.precio_plan != null ? ` · ${money(s.precio_plan)}/mes` : ""}. Estado de la cuenta: ${s.estado || u.estado || "—"}${s.stripe_status ? ` · Stripe: ${s.stripe_status}` : " · sin Stripe"}.`}
    >
      {s.plan || u.nombre_plan || "Sin plan"}
      {s.precio_plan != null && <span className="text-slate-400 font-normal"> · {money(s.precio_plan)}</span>}
      <span className={`ml-1 ${ESTADO_UI[s.estado] || "text-slate-500"}`}>· {s.estado || u.estado || "—"}</span>
    </Pill>,
  );

  // 3) Fecha clave
  if (s.fecha_clave) {
    const urgente = enRiesgo && s.dias != null && s.dias <= 3;
    pills.push(
      <Pill
        key="fecha"
        cls={urgente ? "border-rose-200 bg-rose-50 text-rose-800" : "border-slate-200 bg-white text-slate-600"}
        icon="bx-calendar"
        title={enRiesgo ? `${VERBO[s.cohorte] || "Vence"} el ${fecha(s.fecha_clave)}` : `Renueva el ${fecha(s.fecha_clave)}`}
      >
        {enRiesgo ? VERBO[s.cohorte] || "Vence" : "Renueva"} {rel(s.dias)}
        {s.cancel_at_period_end && !enRiesgo && " · cancelación programada"}
      </Pill>,
    );
  }

  // 4) Conexiones
  pills.push(
    <Pill
      key="cx"
      cls="border-slate-200 bg-white text-slate-600"
      icon="bx-plug"
      title={`${s.conexiones_activas ?? 0} conexiones activas${s.conexiones_suspendidas ? ` y ${s.conexiones_suspendidas} suspendidas` : ""} en su cuenta de ImporChat.`}
    >
      {s.conexiones_activas ?? 0} conexión{(s.conexiones_activas ?? 0) === 1 ? "" : "es"}
      {s.conexiones_suspendidas > 0 && <span className="text-rose-600"> · {s.conexiones_suspendidas} susp.</span>}
    </Pill>,
  );

  // 5) Caso y último seguimiento
  if (s.caso) {
    pills.push(
      <Pill
        key="caso"
        cls={s.caso.asignado_a_nombre ? "border-cyan-200 bg-cyan-50 text-cyan-800" : "border-amber-200 bg-amber-50 text-amber-800"}
        icon="bx-briefcase"
        title={s.caso.asignado_a_nombre ? `Caso de recuperación abierto, lo lleva ${s.caso.asignado_a_nombre}.` : "Caso de recuperación abierto y sin asesor asignado."}
        onClick={abrir}
      >
        {s.caso.asignado_a_nombre ? `Caso: ${s.caso.asignado_a_nombre}` : "Caso sin asesor"}
      </Pill>,
    );
  }
  if (s.ultimo_seguimiento) {
    const g = s.ultimo_seguimiento;
    pills.push(
      <Pill
        key="seg"
        cls="border-slate-200 bg-white text-slate-600"
        icon="bx-history"
        title={`Último seguimiento: ${RESULTADO[g.resultado] || g.resultado || g.tipo} el ${fecha(g.fecha)} por ${g.por || "—"}${g.asunto ? ` · ${g.asunto}` : ""}. ${g.total} en total.${g.proximo_contacto ? ` Próximo contacto: ${fecha(g.proximo_contacto)}.` : ""}`}
      >
        {RESULTADO[g.resultado] || g.resultado || g.tipo} · {fecha(g.fecha)}
        {g.proximo_contacto && <span className="text-slate-400 font-normal"> · próx. {fecha(g.proximo_contacto)}</span>}
      </Pill>,
    );
  } else if (enRiesgo) {
    pills.push(
      <Pill key="seg" cls="border-amber-200 bg-amber-50 text-amber-800" icon="bx-phone-off" title="Nadie le ha registrado un seguimiento todavía.">
        Sin seguimiento
      </Pill>,
    );
  }

  return (
    <>
      {pills}
      {modal && (
        <ModalEmbudo s={s} u={u} etapa={etapa} sano={sano} nombre={selectedChat?.nombre_cliente} onClose={() => setModal(false)} />
      )}
    </>
  );
}

/* ── Modal: el embudo completo, dónde está este cliente y qué hacer ── */
function ModalEmbudo({ s, u, etapa, sano, nombre, onClose }) {
  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const g = s.ultimo_seguimiento;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} role="presentation" />
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        {/* Cabecera */}
        <div className={`px-5 py-4 border-b flex items-start justify-between gap-3 ${etapa ? etapa.cls : sano ? sano.cls : "bg-slate-50 border-slate-200"}`}>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider opacity-70">Cuenta ImporChat · {u.nombre || nombre || `#${u.id_usuario}`}</div>
            <h3 className="text-lg font-extrabold leading-tight mt-0.5">
              {etapa ? `${etapa.label} · prioridad ${etapa.prioridad} de 6` : sano ? sano.titulo : `Cuenta ${s.nivel || "—"}`}
            </h3>
            <p className="text-xs mt-1 opacity-90">{etapa ? etapa.que : sano ? sano.que : "Sin información del embudo para esta cuenta."}</p>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-lg p-1.5 hover:bg-black/10" title="Cerrar">
            <i className="bx bx-x text-2xl" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Qué hacer */}
          <div className="rounded-xl bg-slate-900 text-white p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/60">Qué conviene hacer</div>
            <p className="text-sm font-semibold mt-1">{etapa ? etapa.hacer : sano ? sano.hacer : "Atender normal."}</p>
          </div>

          {/* Embudo: barras por importancia */}
          <div>
            <div className="flex items-baseline justify-between">
              <div className="text-sm font-bold text-slate-800">El embudo de recuperación, de más a menos urgente</div>
              <span className="text-[11px] text-slate-500">la barra más larga = atender primero</span>
            </div>
            <ul className="mt-3 space-y-2">
              {ETAPAS.map((e) => {
                const aqui = etapa?.id === e.id;
                return (
                  <li key={e.id} className={`rounded-lg p-2.5 ring-1 ${aqui ? "ring-2 ring-slate-900 bg-slate-50" : "ring-slate-100"}`}>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="h-5 w-5 shrink-0 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center">{e.prioridad}</span>
                      <span className="font-bold text-slate-800">{e.label}</span>
                      {aqui && (
                        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-slate-900 text-white px-2 py-0.5 text-[10px] font-bold">
                          <i className="bx bx-map-pin" /> Este cliente está aquí
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 h-2.5 rounded bg-slate-100 overflow-hidden">
                      <div className={`h-2.5 rounded ${e.bar} ${aqui ? "" : "opacity-50"}`} style={{ width: `${e.peso}%` }} />
                    </div>
                    <p className={`mt-1 text-[11px] leading-snug ${aqui ? "text-slate-700" : "text-slate-500"}`}>{e.que}</p>
                  </li>
                );
              })}
            </ul>
            {!etapa && (
              <p className="mt-3 text-xs text-slate-600 rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                <b>Este cliente no está en el embudo.</b> {sano ? sano.que : "Su cuenta no cumple ninguna condición de riesgo."} Lo que toca es cuidarlo, no recuperarlo.
              </p>
            )}
          </div>

          {/* Datos de la cuenta */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <Dato label="Plan">{s.plan || u.nombre_plan || "Sin plan"}{s.precio_plan != null ? ` · ${money(s.precio_plan)}/mes` : ""}</Dato>
            <Dato label="Estado de la cuenta"><span className={ESTADO_UI[s.estado] || ""}>{s.estado || u.estado || "—"}</span>{s.stripe_status ? ` · Stripe ${s.stripe_status}` : " · sin Stripe"}</Dato>
            <Dato label={etapa ? VERBO[etapa.id] || "Fecha clave" : "Renueva"}>{s.fecha_clave ? `${fechaLarga(s.fecha_clave)} (${rel(s.dias)})` : "—"}</Dato>
            <Dato label="Cobros reales">{s.pagos_reales ?? 0}{s.ultimo_pago ? ` · último ${fecha(s.ultimo_pago)}` : ""}</Dato>
            <Dato label="Conexiones">{s.conexiones_activas ?? 0} activas{s.conexiones_suspendidas ? ` · ${s.conexiones_suspendidas} suspendidas` : ""}</Dato>
            <Dato label="Cliente desde">{fechaLarga(s.registrado_en || u.registrado_en)}</Dato>
            <Dato label="Caso de recuperación">
              {s.caso ? (s.caso.asignado_a_nombre ? `Lo lleva ${s.caso.asignado_a_nombre}` : "Abierto, sin asesor") : "Sin caso abierto"}
            </Dato>
            <Dato label="Último seguimiento" span>
              {g ? `${RESULTADO[g.resultado] || g.resultado || g.tipo} · ${fecha(g.fecha)} · ${g.por || "—"}${g.asunto ? ` · ${g.asunto}` : ""}${g.proximo_contacto ? ` · próximo ${fecha(g.proximo_contacto)}` : ""}` : "Nadie le ha registrado un seguimiento"}
            </Dato>
          </div>
          <p className="text-[11px] text-slate-400">
            Los seguimientos y el embudo los administra el equipo de recuperación. Si este cliente necesita gestión comercial, avísale a quien lleve su caso.
          </p>
        </div>
      </div>
    </div>
  );
}

function Dato({ label, children, span }) {
  return (
    <div className={span ? "col-span-2 sm:col-span-3" : ""}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-slate-800 mt-0.5">{children}</div>
    </div>
  );
}
