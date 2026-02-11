export default function PageHeader({
  title,
  subtitle,
  icon,
  badge,
  kicker,
  actions = [],
  rightCards = [],
  tone = "dark",
}) {
  const isDark = tone === "dark";

  // ✅ NUEVO: detectar si actions viene como array o como JSX
  const actionsIsArray = Array.isArray(actions);

  return (
    <header
      className={[
        "mb-6 rounded-2xl p-6 shadow-lg relative overflow-hidden",
        isDark
          ? "bg-[#171931] text-white"
          : "bg-white text-slate-900 border border-slate-200",
      ].join(" ")}
    >
      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* LEFT */}
        <div className="min-w-0">
          {(kicker || badge?.label != null) && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs mb-3 backdrop-blur">
              <span
                className={[
                  "w-2 h-2 rounded-full",
                  badge?.variant === "success"
                    ? "bg-emerald-400"
                    : "bg-cyan-300",
                ].join(" ")}
              />
              <span className={isDark ? "bg-white/0" : ""}>
                {kicker ?? "Panel"}
              </span>

              {badge?.label != null && (
                <span
                  className={[
                    "ml-1 px-2 py-0.5 rounded-full border",
                    isDark
                      ? "bg-white/10 border-white/10 text-white/90"
                      : "bg-slate-100 border-slate-200 text-slate-700",
                  ].join(" ")}
                >
                  {badge.value} {badge.label}
                </span>
              )}
            </div>
          )}

          <div className="flex items-start gap-3">
            {icon ? (
              <div
                className={[
                  "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                  isDark
                    ? "bg-white/10 border border-white/10"
                    : "bg-slate-100",
                ].join(" ")}
              >
                {icon}
              </div>
            ) : null}

            <div className="min-w-0">
              <h1
                className={
                  isDark
                    ? "text-2xl md:text-3xl font-bold"
                    : "text-xl font-bold"
                }
              >
                {title}
              </h1>

              {subtitle ? (
                <p
                  className={
                    isDark
                      ? "opacity-90 mt-1 max-w-2xl"
                      : "text-slate-600 mt-1 max-w-2xl"
                  }
                >
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          {/* cards informativas (opcional) */}
          {rightCards.map((c, i) => (
            <div
              key={`${c.label}-${i}`}
              className={[
                "px-3 py-2 rounded-xl border backdrop-blur",
                isDark
                  ? "bg-white/10 border-white/10"
                  : "bg-slate-50 border-slate-200",
              ].join(" ")}
            >
              <div
                className={
                  isDark ? "text-xs opacity-80" : "text-xs text-slate-500"
                }
              >
                {c.label}
              </div>
              <div
                className={
                  isDark
                    ? "text-sm font-semibold"
                    : "text-sm font-semibold text-slate-900"
                }
              >
                {c.value}
              </div>
            </div>
          ))}

          {/* ✅ acciones (array o JSX) */}
          <div className="flex items-center gap-2">
            {actionsIsArray
              ? actions.map((a, idx) => {
                  if (a?.type === "divider") {
                    return (
                      <div
                        key={`div-${idx}`}
                        className={
                          isDark
                            ? "mx-1 h-6 w-px bg-white/10"
                            : "mx-1 h-6 w-px bg-slate-200"
                        }
                      />
                    );
                  }

                  return (
                    <button
                      key={a.label ?? idx}
                      type="button"
                      onClick={a.onClick}
                      disabled={a.disabled}
                      className={getBtnClassLinea(a.variant, a.size, tone)}
                      title={a.label}
                    >
                      {a.icon ? (
                        <span className="text-base">{a.icon}</span>
                      ) : null}
                      <span>{a.label}</span>
                    </button>
                  );
                })
              : // Si no es array, asumimos que es JSX (o null/undefined/string)
                actions}
          </div>
        </div>
      </div>
    </header>
  );
}

function getBtnClassLinea(variant = "primary", size = "md", tone = "dark") {
  const base =
    "inline-flex items-center gap-2 font-semibold transition focus:outline-none focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed";

  const sizes = {
    sm: "px-3 py-1.5 text-xs rounded-xl",
    md: "px-4 py-2 text-sm rounded-xl",
  };

  const isDark = tone === "dark";

  const variantsDark = {
    primary:
      "bg-white text-indigo-700 hover:bg-indigo-50 focus:ring-white/30 shadow",
    success:
      "bg-emerald-500 text-white hover:bg-emerald-600 focus:ring-emerald-200/40 shadow",
    ghost:
      "bg-white/10 text-white border border-white/10 hover:bg-white/15 focus:ring-white/20",
    danger:
      "bg-rose-500 text-white hover:bg-rose-600 focus:ring-rose-200/40 shadow",
  };

  const variantsLight = {
    primary:
      "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-200 shadow",
    success:
      "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-200 shadow",
    ghost:
      "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 focus:ring-blue-200/60",
    danger:
      "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-200 shadow",
  };

  const variants = isDark ? variantsDark : variantsLight;

  return `${base} ${sizes[size] || sizes.md} ${variants[variant] || variants.primary}`;
}
