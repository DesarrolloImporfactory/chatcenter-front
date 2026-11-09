import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";
import { esAdministrador } from "../../utils/rolActual";
import { ADDONS, comprarAddon, idUsuarioActual } from "./addons";

/**
 * /complementos — «Productos adicionales», tercera pestaña de Planes y
 * facturación. Tres tarjetas con el mismo formato (usuarios, conexiones e
 * ImporKiller): cabecera con icono, nombre y precio; un bloque de estado con
 * lo que la cuenta ya tiene (cupo del plan + adicionales, o la vista de lo
 * que pinta la extensión en Dropi para ImporKiller); lo que incluye; y el
 * botón de acción.
 *
 * Estados por cuenta:
 *  - Cuenta normal con suscripción: compra al instante (prorrateo) o 3DS.
 *  - En prueba: se otorga gratis y se cobra con el primer pago real.
 *  - Sin suscripción (sin plan / vencido): un solo aviso arriba y los botones
 *    mandan a elegir plan.
 *  - Cuenta permanente (equipo Imporfactory / cortesías): ImporKiller va
 *    incluido y los cupos los ajusta soporte; no se ofrece comprar.
 *
 * Datos: POST /stripe_plan/obtenerSuscripcionActiva (plan + adicionales +
 * n_conexiones / max_subusuarios del plan). Compra: comprarAddon(clave).
 */

const TEMAS = {
  subusuario_adicional: {
    accent: "#0284C7",
    light: "rgba(2,132,199,0.08)",
    border: "rgba(2,132,199,0.22)",
    grad: "linear-gradient(135deg, #0284C7 0%, #075985 100%)",
    icono: "bxs-user-plus",
    eyebrow: "Más asesores",
    pitch: "Más chats atendidos hoy, sin subir de plan.",
  },
  conexion_adicional: {
    accent: "#4F46E5",
    light: "rgba(79,70,229,0.08)",
    border: "rgba(79,70,229,0.22)",
    grad: "linear-gradient(135deg, #4F46E5 0%, #312E81 100%)",
    icono: "bxs-plug",
    eyebrow: "Más negocios o números",
    pitch: "Otro negocio o número, en la misma cuenta y con el mismo equipo.",
  },
  imporkiller: {
    accent: "#0891B2",
    light: "rgba(8,145,178,0.08)",
    border: "rgba(8,145,178,0.24)",
    grad: "linear-gradient(135deg, #0891B2 0%, #155E75 100%)",
    icono: "bx-radar",
    eyebrow: "Inteligencia de mercado",
    pitch: "Sabe cuánto vende cada producto de Dropi antes de pautar.",
  },
};
const VERDE = {
  accent: "#047857",
  light: "rgba(5,150,105,0.08)",
  border: "rgba(5,150,105,0.2)",
  grad: "linear-gradient(135deg, #059669 0%, #065F46 100%)",
};

const IconoTrazo = ({ d, color, className = "w-[17px] h-[17px]" }) => (
  <svg
    className={`${className} shrink-0`}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {d.map((p) => (
      <path key={p} d={p} />
    ))}
  </svg>
);
const CHECK = ["M20 6 9 17l-5-5"];

const Distintivo = ({ text, gradient }) => (
  <div
    className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 px-5 py-1.5 rounded-full text-[10px] font-extrabold uppercase text-white shadow-lg whitespace-nowrap"
    style={{ background: gradient, letterSpacing: "0.08em" }}
  >
    {text}
  </div>
);

const estadoDePlan = (plan) => {
  const estado = (plan?.estado || "").toLowerCase();
  if (!plan?.id_plan) return "sin_plan";
  if (estado.includes("trial") || estado === "promo_usage") return "prueba";
  if (estado.includes("activo")) return "activo";
  return "inactivo";
};

const swalBase = {
  confirmButtonColor: "#1d4ed8",
  customClass: { popup: "rounded-2xl" },
};

export default function Complementos() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [ocupado, setOcupado] = useState(null); // clave en proceso
  const administrador = esAdministrador();

  const cargar = useCallback(async () => {
    const id_usuario = idUsuarioActual();
    if (!id_usuario) {
      setError("Tu sesión venció. Vuelve a iniciar sesión.");
      setCargando(false);
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const { data } = await chatApi.post(
        "/stripe_plan/obtenerSuscripcionActiva",
        { id_usuario },
      );
      setPlan(data?.plan || null);
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "No se pudo cargar tu plan. Intenta de nuevo.",
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const estadoPlan = estadoDePlan(plan);
  const permanente = Number(plan?.permanente || 0) === 1;
  const conSuscripcion =
    !!plan?.stripe_subscription_id || estadoPlan === "prueba";
  // Puede comprar: administrador, con plan vivo y pasarela detrás. Las cuentas
  // permanentes no pasan por Stripe: sus cupos los pone soporte.
  const sinPasarela =
    !cargando && !permanente && (!conSuscripcion || estadoPlan === "inactivo");
  const puedeComprar =
    administrador && !cargando && !permanente && !sinPasarela;

  const cantidadDe = (a) => Number(plan?.[a.campo] || 0);
  const totalAdicionales = ADDONS.reduce(
    (s, a) => s + cantidadDe(a) * a.precio,
    0,
  );

  const irAPlanes = async (titulo, texto) => {
    const r = await Swal.fire({
      ...swalBase,
      icon: "info",
      title: titulo,
      text: texto,
      confirmButtonText: "Ver planes",
      showCancelButton: true,
      cancelButtonText: "Ahora no",
    });
    if (r.isConfirmed) navigate("/planes");
  };

  const comprar = async (addon) => {
    if (ocupado || !administrador) return;
    if (permanente) return navigate(addon.ruta);
    if (
      estadoPlan === "sin_plan" ||
      estadoPlan === "inactivo" ||
      !conSuscripcion
    ) {
      return irAPlanes(
        "Primero necesitas un plan activo",
        "Los complementos se suman a tu suscripción. Elige o renueva tu plan y vuelve aquí.",
      );
    }
    const confirmar = await Swal.fire({
      ...swalBase,
      icon: "question",
      title: addon.multiple
        ? `Agregar ${addon.nombre.toLowerCase()}`
        : `Activar ${addon.nombre}`,
      html: `<p style="margin:6px 0 0;color:#475569;font-size:14px;line-height:1.55">Se suma <b style="color:#0a1a36">$${addon.precio}/mes</b> a tu plan. Hoy se cobra solo la parte proporcional hasta tu próximo corte${
        estadoPlan === "prueba" ? " (en prueba no se cobra nada todavía)" : ""
      }.</p>`,
      confirmButtonText: addon.multiple
        ? `Agregar por $${addon.precio}/mes`
        : `Activar por $${addon.precio}/mes`,
      showCancelButton: true,
      cancelButtonText: "Cancelar",
    });
    if (!confirmar.isConfirmed) return;

    setOcupado(addon.clave);
    try {
      const data = await comprarAddon(addon.clave, 1);
      if (data.actionRequired && data.hosted_invoice_url) {
        window.location.href = data.hosted_invoice_url;
        return;
      }
      await cargar();
      const r = await Swal.fire({
        ...swalBase,
        icon: "success",
        iconColor: "#16a34a",
        title: data.ya_activo
          ? `${addon.nombre} ya estaba activo`
          : data.en_trial
            ? "¡Activado en tu prueba!"
            : addon.multiple
              ? `¡${addon.nombre} agregado!`
              : `¡${addon.nombre} activado!`,
        html: `<p style="margin:6px 0 0;color:#475569;font-size:14px;line-height:1.55">${
          data.en_trial
            ? "Lo usarás <b style='color:#0a1a36'>gratis durante tu prueba</b>. Se cobrará junto con tu plan cuando termine el período."
            : addon.multiple
              ? "Tu nuevo cupo ya está disponible."
              : "Ya está habilitado en tu cuenta. Instala la extensión desde ImporKiller."
        }</p>`,
        confirmButtonText: addon.multiple
          ? addon.rutaTexto
          : "Abrir ImporKiller",
        showCancelButton: true,
        cancelButtonText: "Quedarme aquí",
      });
      if (r.isConfirmed) navigate(addon.ruta);
    } catch (e) {
      if (e?.code === "NO_SUBSCRIPTION") {
        return irAPlanes("Primero elige un plan", e.message);
      }
      Swal.fire({
        ...swalBase,
        icon: "error",
        title: `No se pudo agregar ${addon.nombre}`,
        text: e?.message || "Intenta nuevamente.",
      });
    } finally {
      setOcupado(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70">
      <style>{`
        @keyframes ccRise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ccShimmer { 0% { background-position: -160% 0; } 100% { background-position: 260% 0; } }
        @keyframes ccPulse { 0%, 100% { box-shadow: 0 0 0 0 var(--cc-glow); } 50% { box-shadow: 0 0 0 7px transparent; } }
        @keyframes ccCount { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .cc-rise { opacity: 0; animation: ccRise .55s cubic-bezier(.22,1,.36,1) forwards; }
        .cc-pulse { animation: ccPulse 2.4s ease-in-out infinite; }
        .cc-shimmer {
          background-image: linear-gradient(100deg, transparent 20%, rgba(255,255,255,.7) 50%, transparent 80%);
          background-size: 200% 100%;
          animation: ccShimmer 2.8s ease-in-out infinite;
        }
        .cc-count { opacity: 0; animation: ccCount .5s ease-out forwards; }
        @media (prefers-reduced-motion: reduce) {
          .cc-rise, .cc-pulse, .cc-shimmer, .cc-count { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>

      <div className="px-6 sm:px-10 lg:px-14 pt-3 pb-6">
        {/* Pestañas + título + estado de la cuenta, misma fila que en Elegir plan. */}
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-start lg:gap-6">
          <div className="flex justify-center lg:justify-start">
            <div className="inline-flex p-1 rounded-xl bg-slate-100/80 border border-slate-200/70">
              <button
                onClick={() => navigate("/planes")}
                className="px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold text-slate-500 hover:text-[#0B1426] transition-colors"
              >
                Elegir plan
              </button>
              <span className="px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold bg-white text-[#0B1426] shadow-sm">
                Productos adicionales
              </span>
              <button
                onClick={() => navigate("/plan")}
                className="px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold text-slate-500 hover:text-[#0B1426] transition-colors"
              >
                Mi plan y facturación
              </button>
            </div>
          </div>

          <div className="text-center">
            <h2 className="font-extrabold text-[#0B1426] tracking-[-0.035em] leading-[1.28] pb-1 text-[clamp(1.5rem,3vw,2.4rem)] text-balance">
              Crece{" "}
              <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
                sin cambiar
              </span>{" "}
              de plan
            </h2>
            <p className="mt-2 mx-auto max-w-2xl text-[14.5px] sm:text-[15.5px] text-slate-500 leading-relaxed text-balance">
              Más asesores, más negocios conectados e inteligencia de mercado.
              Se suman a tu plan y se cobran en la misma factura.
            </p>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="inline-flex items-center gap-3 rounded-xl bg-white border border-slate-200/80 px-3.5 py-2 shadow-sm">
              <div className="leading-tight">
                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Tu plan
                </div>
                <div className="text-[12.5px] font-bold text-[#0B1426] truncate max-w-[180px]">
                  {cargando ? "Cargando…" : plan?.nombre_plan || "Sin plan"}
                  {permanente && !cargando ? (
                    <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wider text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded">
                      Permanente
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="h-7 w-px bg-slate-200" />
              <div className="leading-tight">
                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Adicionales al mes
                </div>
                <div className="text-[12.5px] font-bold text-[#0B1426] tabular-nums">
                  {cargando
                    ? "…"
                    : permanente
                      ? "Incluidos"
                      : `$${totalAdicionales}`}
                </div>
              </div>
              <button
                onClick={cargar}
                title="Refrescar"
                className="ml-1 inline-grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[#0B1426] transition-colors"
              >
                <i
                  className={`bx bx-refresh text-lg ${cargando ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <i className="bx bx-error-circle mt-0.5 text-lg" />
            <div className="flex-1">{error}</div>
            <button
              type="button"
              onClick={cargar}
              className="font-bold underline underline-offset-2"
            >
              Reintentar
            </button>
          </div>
        ) : null}

        {sinPasarela ? (
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
            <i className="bx bx-info-circle text-xl text-amber-600" />
            <p className="flex-1 leading-snug">
              <b>Tu cuenta no tiene una suscripción activa.</b> Los productos
              adicionales se suman a tu plan: elige o renueva tu plan y vuelve
              aquí para activarlos.
            </p>
            <button
              type="button"
              onClick={() => navigate("/planes")}
              className="shrink-0 rounded-xl bg-[#0B1426] px-4 py-2 text-[12.5px] font-bold text-white hover:bg-[#13244a] transition-colors"
            >
              Ver planes
            </button>
          </div>
        ) : null}

        {!administrador && !cargando ? (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[12.5px] text-slate-600">
            <i className="bx bx-lock-alt text-lg text-slate-400" />
            Solo el <b className="mx-1">administrador de la cuenta</b> puede
            activar productos adicionales. Aquí ves lo que tu cuenta ya tiene.
          </div>
        ) : null}

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3 items-stretch">
          {ADDONS.map((a, idx) => (
            <Tarjeta
              key={a.clave}
              addon={a}
              idx={idx}
              plan={plan}
              cargando={cargando}
              permanente={permanente}
              puedeComprar={puedeComprar}
              enProceso={ocupado === a.clave}
              bloqueado={!!ocupado}
              onComprar={() => comprar(a)}
              onIr={() => navigate(a.ruta)}
            />
          ))}
        </div>

        <div className="mt-8 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-[12px] leading-5 text-slate-600 md:grid-cols-3">
          <div className="flex items-start gap-2">
            <i className="bx bx-receipt mt-0.5 text-lg text-cyan-700" />
            <span>
              <b className="text-slate-800">Cómo se cobra.</b> Hoy solo la
              parte proporcional hasta tu próximo corte; después va en la misma
              factura de tu plan. En prueba se otorga gratis y se cobra con el
              primer pago real.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <i className="bx bx-shield-quarter mt-0.5 text-lg text-cyan-700" />
            <span>
              <b className="text-slate-800">Si cambias de plan.</b> Los
              complementos se conservan: no se pierden al subir ni al programar
              una bajada de plan.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <i className="bx bx-support mt-0.5 text-lg text-cyan-700" />
            <span>
              <b className="text-slate-800">Para retirar uno.</b> Escríbenos
              por el chat de soporte y lo quitamos de tu suscripción en el
              siguiente corte.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Tarjeta({
  addon: a,
  idx,
  plan,
  cargando,
  permanente,
  puedeComprar,
  enProceso,
  bloqueado,
  onComprar,
  onIr,
}) {
  const tema = TEMAS[a.clave] || TEMAS.subusuario_adicional;
  const esIK = !a.multiple;
  const incluidos = a.incluidos(plan);
  const adicionales = Number(plan?.[a.campo] || 0);
  const total = incluidos + adicionales;
  const activo = esIK ? adicionales > 0 || permanente : adicionales > 0;
  const nombrePlural = a.nombreIncluidos; // "usuarios" | "conexiones"
  // ImporKiller: si ya está, el botón abre la herramienta (ahí se descarga la
  // extensión); si no, compra. Permanente: siempre abre.
  const ctaAbre = permanente || (esIK && activo);
  const ctaDeshabilitado = ctaAbre ? false : !puedeComprar || bloqueado;
  const destacado = !cargando && (activo || esIK);
  const distintivo = cargando
    ? null
    : activo
      ? esIK
        ? permanente
          ? "Incluido en tu cuenta"
          : "Activo en tu cuenta"
        : `Ya tienes +${adicionales}`
      : esIK
        ? "Nuevo"
        : null;
  const gradDistintivo = activo ? VERDE.grad : tema.grad;
  const textoCTA = enProceso
    ? "Procesando…"
    : esIK
      ? activo
        ? "Descargar la extensión"
        : `Activar por $${a.precio}/mes`
      : adicionales > 0
        ? `Agregar uno más · $${a.precio}/mes`
        : `Agregar por $${a.precio}/mes`;
  const iconoCTA = enProceso
    ? "bx-loader-alt animate-spin"
    : ctaAbre
      ? esIK
        ? "bx-download"
        : "bx-right-arrow-alt"
      : esIK
        ? "bx-bolt-circle"
        : "bx-plus-circle";

  return (
    <div
      className="cc-rise relative"
      style={{ animationDelay: `${idx * 90}ms` }}
    >
      {distintivo ? (
        <Distintivo text={distintivo} gradient={gradDistintivo} />
      ) : null}
      <article
        className={`relative flex h-full flex-col overflow-hidden rounded-2xl bg-white transition-all duration-300 hover:-translate-y-1 ${
          destacado
            ? "shadow-xl shadow-slate-300/40 cc-pulse hover:shadow-2xl"
            : "shadow-sm hover:shadow-xl"
        }`}
        style={{
          border: destacado
            ? `2px solid ${activo ? "#059669" : tema.accent}`
            : "1px solid #e2e8f0",
          "--cc-glow": activo ? VERDE.border : tema.border,
        }}
      >
        <div
          className="relative h-1 w-full overflow-hidden"
          style={{ background: gradDistintivo }}
        >
          {destacado ? (
            <span className="cc-shimmer absolute inset-0 block" />
          ) : null}
        </div>

        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-start gap-3.5">
            <span
              className="inline-grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
              style={{
                background: tema.light,
                border: `1px solid ${tema.border}`,
                color: tema.accent,
              }}
            >
              <i className={`bx ${tema.icono} text-2xl`} />
            </span>
            <div className="min-w-0 flex-1">
              <div
                className="text-[9px] font-bold uppercase tracking-[0.12em]"
                style={{ color: tema.accent }}
              >
                {tema.eyebrow}
              </div>
              <h4 className="text-[18px] font-extrabold tracking-tight text-[#0B1426]">
                {a.nombre}
              </h4>
            </div>
            <div className="shrink-0 text-right leading-none">
              <div className="inline-flex items-baseline gap-0.5">
                <span className="text-xs text-slate-400">$</span>
                <span className="text-[30px] font-extrabold tracking-tight text-[#0B1426]">
                  {a.precio}
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                /mes {a.unidad}
              </div>
            </div>
          </div>
          <p className="mt-3 text-[13.5px] font-bold leading-snug text-[#0B1426]">
            {tema.pitch}
          </p>
          <p className="mt-1 text-[12.5px] leading-snug text-slate-500">
            {a.resumen}
          </p>

          {esIK ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Qué desbloquea
              </div>
              <ul className="mt-2 grid gap-1.5">
                {[
                  ["bx-search-alt", "Buscador de productos ganadores", true, "Incluido en tu plan · EC, MX y CO"],
                  ["bxl-chrome", "Extensión de Chrome en Dropi", activo, "Ventas estimadas 24 h, 7 d, 30 d y tendencia bajo cada producto"],
                  ["bxl-meta", "Anuncios y tiendas de Meta", activo, "Descarga masiva de creativos y radar de quién pauta cada producto"],
                ].map(([icono, texto, ok, nota]) => (
                  <li
                    key={texto}
                    className="flex items-center gap-2.5 rounded-lg bg-white px-2.5 py-2 ring-1 ring-slate-200"
                  >
                    <span
                      className="inline-grid h-7 w-7 shrink-0 place-items-center rounded-lg"
                      style={{ background: tema.light, color: tema.accent }}
                    >
                      <i className={`bx ${icono} text-[16px]`} />
                    </span>
                    <span className="min-w-0 flex-1 text-[12px] font-semibold leading-tight text-slate-700">
                      {texto}
                      <span className="block text-[10px] font-medium leading-tight text-slate-400">
                        {nota}
                      </span>
                    </span>
                    {cargando ? null : ok ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                        <IconoTrazo d={CHECK} color="#047857" className="w-3 h-3" />
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200">
                        <i className="bx bx-lock-alt text-[12px]" />
                        Bloqueado
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {!esIK ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                <span>Tu cupo de {nombrePlural}</span>
                {!cargando && adicionales > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 normal-case tracking-normal text-emerald-700 ring-1 ring-emerald-200">
                    <IconoTrazo d={CHECK} color="#047857" className="w-3 h-3" />
                    +{adicionales}
                  </span>
                ) : null}
              </div>
              {cargando ? (
                <div className="mt-2 h-8 w-40 animate-pulse rounded bg-slate-200" />
              ) : (
                <div className="mt-2 flex flex-wrap items-end gap-x-2 gap-y-1">
                  <span className="cc-count text-[30px] font-extrabold leading-none tracking-tight text-[#0B1426] tabular-nums">
                    {total}
                  </span>
                  <span className="pb-1 text-[12px] text-slate-500">
                    {nombrePlural} en total
                    <span className="text-slate-400">
                      {" "}
                      · {incluidos} del plan
                      {adicionales > 0
                        ? ` + ${adicionales} ${adicionales === 1 ? "adicional" : "adicionales"}`
                        : ""}
                    </span>
                  </span>
                </div>
              )}
              {!cargando && (
                <div className="mt-2.5 flex h-2 overflow-hidden rounded-full bg-slate-200">
                  <span
                    className="h-full transition-all duration-700"
                    style={{
                      width: `${total ? (incluidos / total) * 100 : 0}%`,
                      background: tema.accent,
                      opacity: 0.45,
                    }}
                  />
                  <span
                    className="h-full transition-all duration-700"
                    style={{
                      width: `${total ? (adicionales / total) * 100 : 0}%`,
                      background: tema.grad,
                    }}
                  />
                </div>
              )}
            </div>
          ) : null}

          <ul className={`mt-4 grid gap-1.5 ${esIK ? "hidden" : ""}`}>
            {a.detalle.map((d, i) => (
              <li
                key={d}
                className="cc-rise flex items-start gap-2 text-[12px] leading-snug text-slate-600"
                style={{ animationDelay: `${320 + i * 70}ms` }}
              >
                <span
                  className="mt-[2px] inline-grid h-4 w-4 shrink-0 place-items-center rounded-full"
                  style={{ background: tema.light }}
                >
                  <IconoTrazo
                    d={CHECK}
                    color={tema.accent}
                    className="w-[11px] h-[11px]"
                  />
                </span>
                {d}
              </li>
            ))}
          </ul>

          <div className="mt-auto pt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={ctaAbre ? onIr : onComprar}
              disabled={ctaDeshabilitado}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-extrabold text-white shadow-md transition hover:-translate-y-[1px] hover:shadow-lg disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none disabled:hover:translate-y-0"
              style={ctaDeshabilitado ? {} : { background: gradDistintivo }}
            >
              <i className={`bx ${iconoCTA} text-lg`} />
              {ctaAbre && !esIK ? a.rutaTexto : textoCTA}
            </button>
          </div>
          {!ctaAbre ? (
            <div className="mt-2 text-center">
              <button
                type="button"
                onClick={onIr}
                className="text-[11.5px] font-semibold text-slate-400 underline underline-offset-2 transition-colors hover:text-[#0B1426]"
              >
                {a.rutaTexto}
              </button>
            </div>
          ) : null}
          {permanente && !cargando && !esIK ? (
            <p className="mt-2 text-[10.5px] text-slate-400">
              Cuenta permanente: los cupos los ajusta el equipo de Imporfactory.
            </p>
          ) : null}
          {esIK && activo && !cargando ? (
            <p className="mt-2 text-[10.5px] text-slate-400">
              La extensión se descarga e instala desde ImporKiller en dos
              minutos.
            </p>
          ) : null}
        </div>
      </article>
    </div>
  );
}
