import React from "react";
import { BENEFITS, STEPS_LIST } from "./constants";

const HeroSection = ({ usage, step, onShowHistory }) => {
  // ── Calcular valores efectivos (plan + promo bonus) ──
  const promoImg = Number(usage.promo_imagenes_restantes || 0);
  const promoAng = Number(usage.promo_angulos_restantes || 0);

  // Si el plan tiene límite, mostrar plan. Si no, mostrar promo como principal.
  const showPlanImages = usage.limit > 0;
  const showPlanAngles =
    usage.angles_limit !== null &&
    usage.angles_limit !== undefined &&
    usage.angles_limit > 0;

  // Mostrar badge promo independiente cuando:
  // - El plan SÍ tiene imágenes (promo es bonus extra)
  // - O el plan NO tiene imágenes pero promo SÍ (promo es el recurso principal)
  const showPromoImagesBadge = !showPlanImages && promoImg > 0;
  const showPromoAnglesBadge = !showPlanAngles && promoAng > 0;

  // Badge extra cuando plan tiene quota Y TAMBIÉN tiene promo bonus
  const showBonusImagesBadge = showPlanImages && promoImg > 0;
  const showBonusAnglesBadge = showPlanAngles && promoAng > 0;

  return (
    <div className="bg-[#0f1129] relative overflow-hidden rounded-3xl">
      <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-600/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/15 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/4" />

      <div className="relative p-6 pb-0">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">
                Powered by AI
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-none">
              Crea tu landing
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-blue-300 to-cyan-300">
                completa con IA
              </span>
            </h1>
            <p className="text-white/50 mt-3 max-w-xl text-sm leading-relaxed">
              Elige un template, sube las fotos de tu producto y la IA genera
              todas las secciones de tu landing page.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            {/* ── Badge imágenes del PLAN ── */}
            {showPlanImages && (
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold backdrop-blur-sm ${
                  usage.remaining > 0
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-300"
                }`}
              >
                <i className="bx bx-image text-sm" />
                {usage.used}/{usage.limit}
              </div>
            )}

            {/* ── Badge imágenes PROMO (cuando plan NO incluye imágenes) ── */}
            {showPromoImagesBadge && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold backdrop-blur-sm bg-violet-500/10 border-violet-500/20 text-violet-300">
                <i className="bx bx-gift text-sm" />
                {promoImg} img promo
              </div>
            )}

            {/* ── Badge bonus imágenes promo (cuando plan SÍ tiene imágenes + bonus) ── */}
            {showBonusImagesBadge && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold backdrop-blur-sm bg-violet-500/10 border-violet-500/20 text-violet-300">
                <i className="bx bx-gift text-sm" />+{promoImg} bonus
              </div>
            )}

            {/* ── Badge ángulos del PLAN ── */}
            {showPlanAngles && (
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold backdrop-blur-sm ${
                  usage.angles_remaining > 0
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-300"
                }`}
              >
                <i className="bx bx-target-lock text-sm" />
                {usage.angles_remaining > 0
                  ? `${usage.angles_remaining} ángulo${usage.angles_remaining !== 1 ? "s" : ""}`
                  : "Sin ángulos IA"}
              </div>
            )}

            {/* ── Badge ángulos PROMO (cuando plan NO incluye ángulos) ── */}
            {showPromoAnglesBadge && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold backdrop-blur-sm bg-violet-500/10 border-violet-500/20 text-violet-300">
                <i className="bx bx-gift text-sm" />
                {promoAng} ángulo{promoAng !== 1 ? "s" : ""} promo
              </div>
            )}

            {/* ── Badge bonus ángulos promo (cuando plan SÍ tiene + bonus) ── */}
            {showBonusAnglesBadge && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold backdrop-blur-sm bg-violet-500/10 border-violet-500/20 text-violet-300">
                <i className="bx bx-gift text-sm" />+{promoAng} ángulos bonus
              </div>
            )}

            {usage.plan && (
              <span className="text-[10px] text-white/30 font-medium">
                {usage.plan}
                {(showPromoImagesBadge || showPromoAnglesBadge) &&
                  " + Código Promo"}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pb-6 border-b border-white/[0.06]">
          {BENEFITS.map((b) => (
            <div key={b.title} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.08] grid place-items-center shrink-0">
                <i className={`bx ${b.icon} text-sm text-indigo-400`} />
              </div>
              <div>
                <p className="text-xs font-bold text-white/90">{b.title}</p>
                <p className="text-[11px] text-white/40 mt-0.5">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-1 py-4 overflow-x-auto scrollbar-hide">
          {STEPS_LIST.map(({ key, label }, i, arr) => {
            const ci = arr.map((x) => x.key).indexOf(step);
            const completed = i < ci;
            const current = i === ci;
            return (
              <React.Fragment key={key}>
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all duration-300 ${
                    current
                      ? "bg-white text-indigo-700 shadow-lg shadow-white/10"
                      : completed
                        ? "bg-white/15 text-white/90"
                        : "bg-white/[0.04] text-white/25 border border-white/[0.06]"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-md text-[9px] font-bold grid place-items-center transition-all ${
                      current
                        ? "bg-indigo-600 text-white"
                        : completed
                          ? "bg-emerald-500/80 text-white"
                          : "bg-white/10 text-white/30"
                    }`}
                  >
                    {completed ? (
                      <i className="bx bx-check text-[9px]" />
                    ) : (
                      i + 1
                    )}
                  </span>
                  {label}
                </div>
                {i < arr.length - 1 && (
                  <div
                    className={`h-px w-3 shrink-0 transition-all ${
                      completed ? "bg-emerald-400/40" : "bg-white/[0.06]"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
