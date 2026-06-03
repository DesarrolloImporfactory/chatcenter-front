// Componentes UI compartidos por las tabs de V2
import React from "react";

export const Toggle = ({ checked, onChange, disabled, size = "md" }) => {
  const dims =
    size === "sm"
      ? { wrap: "h-5 w-9", knob: "h-4 w-4", translate: "translate-x-4" }
      : { wrap: "h-6 w-11", knob: "h-5 w-5", translate: "translate-x-5" };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex ${dims.wrap} shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? "bg-emerald-500" : "bg-gray-300"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block ${dims.knob} transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? dims.translate : "translate-x-0"
        }`}
      />
    </button>
  );
};

export const StatusBadge = ({ active, labelActive = "V2 Activo", labelInactive = "V2 Inactivo" }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
      active
        ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
        : "bg-gray-100 text-gray-600 ring-1 ring-gray-200"
    }`}
  >
    <span
      className={`h-1.5 w-1.5 rounded-full ${
        active ? "bg-emerald-500" : "bg-gray-400"
      }`}
    />
    {active ? labelActive : labelInactive}
  </span>
);

export const Card = ({ title, icon, action, children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
    {(title || action) && (
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-2">
          {icon && <i className={`${icon} text-xl text-blue-600`} />}
          {title && <h3 className="font-semibold text-gray-800">{title}</h3>}
        </div>
        {action}
      </div>
    )}
    <div className="p-5">{children}</div>
  </div>
);

export const EmptyState = ({ icon, title, description, action }) => (
  <div className="text-center py-10">
    <i className={`${icon} text-5xl text-gray-300`} />
    <p className="font-medium text-gray-700 mt-3">{title}</p>
    {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const Spinner = ({ className = "" }) => (
  <i className={`bx bx-loader-alt bx-spin ${className}`} />
);

export const Pill = ({ color = "gray", children, icon }) => {
  const map = {
    gray: "bg-gray-100 text-gray-700 ring-gray-200",
    blue: "bg-blue-100 text-blue-700 ring-blue-200",
    emerald: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    rose: "bg-rose-100 text-rose-700 ring-rose-200",
    amber: "bg-amber-100 text-amber-700 ring-amber-200",
    violet: "bg-violet-100 text-violet-700 ring-violet-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ring-1 ${
        map[color] || map.gray
      }`}
    >
      {icon && <i className={icon} />}
      {children}
    </span>
  );
};

export const Btn = ({
  children,
  variant = "primary",
  size = "md",
  icon,
  loading,
  ...rest
}) => {
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "bg-gray-100 hover:bg-gray-200 text-gray-700",
    success: "bg-emerald-600 hover:bg-emerald-700 text-white",
    danger: "bg-rose-600 hover:bg-rose-700 text-white",
    ghost: "bg-transparent hover:bg-gray-100 text-gray-700",
  };
  const sizes = {
    sm: "px-2.5 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-sm",
  };
  return (
    <button
      {...rest}
      disabled={loading || rest.disabled}
      className={`inline-flex items-center gap-1.5 font-medium rounded-lg shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${rest.className || ""}`}
    >
      {loading ? <Spinner /> : icon ? <i className={icon} /> : null}
      {children}
    </button>
  );
};
