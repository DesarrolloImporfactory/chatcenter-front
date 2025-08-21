import React, { forwardRef, useMemo, useState } from "react";
import { BiArrowBack } from "react-icons/bi";

/**
 * BackExpandArrow (con tamaño de texto configurable)
 * - Colapsado: círculo + flecha centrada visible SIEMPRE.
 * - Hover: se expande y revela "Volver" (mismo hover verde en texto e ícono).
 * - Sin borde: fondo transparente + sombra sutil.
 *
 * Props clave:
 *  - labelSize      : número en px para el texto (default 14)
 *  - labelClassName : clases extra para el texto (opcional)
 */
export const BackExpandArrow = forwardRef(function BackExpandArrow(
  {
    onClick,
    label = "Volver",
    diameter = 46,
    expandedWidth = 136,
    iconSize = 22,
    baseColor = "#171931",
    hoverColor = "#22C55E",
    labelSize = 14,              // ⬅️ tamaño del texto “Volver”
    labelClassName = "",         // ⬅️ clases extra para el texto
    className = "",
    iconClassName = "",
    ...props
  },
  ref
) {
  const [hovered, setHovered] = useState(false);

  // espacio disponible para el texto cuando está expandido
  const textMaxWidth = useMemo(() => {
    const padding = 14; // aire a la derecha durante el hover
    const w = expandedWidth - diameter - padding;
    return w > 0 ? w : 0;
  }, [expandedWidth, diameter]);

  return (
    <button
      type="button"
      ref={ref}
      aria-label={label}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ height: diameter, width: hovered ? expandedWidth : diameter }}
      className={[
        "group inline-flex items-center justify-center",
        "rounded-full overflow-hidden",
        "bg-transparent shadow-[0_10px_26px_-16px_rgba(23,25,49,0.35)]",
        "backdrop-blur-[2px]",
        "transition-all duration-300 ease-out",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        className,
      ].join(" ")}
      {...props}
    >
      {/* halo interno suave */}
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full pointer-events-none transition-opacity duration-300"
        style={{
          background:
            "radial-gradient(ellipse at 50% 45%, rgba(255,255,255,0.06), rgba(255,255,255,0) 60%)",
          opacity: hovered ? 0.9 : 0.6,
        }}
      />

      {/* contenido */}
      <span
        className="relative z-[1] inline-flex items-center"
        style={{ gap: hovered ? 8 : 0 }}
      >
        {/* Flecha SIEMPRE visible y centrada en colapsado */}
        <BiArrowBack
          size={iconSize}
          style={{ color: hovered ? hoverColor : baseColor }}
          className={[
            "shrink-0 transition-[color,transform,filter] duration-300 ease-out",
            hovered ? "-translate-x-[2px]" : "",
            "drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]",
            iconClassName,
          ].join(" ")}
        />

        {/* Texto “Volver” con tamaño configurable */}
        <span
          className={[
            "whitespace-nowrap transition-all duration-300",
            labelClassName,
          ].join(" ")}
          style={{
            color: hovered ? hoverColor : baseColor,
            fontSize: `${labelSize}px`,    // ⬅️ tamaño del texto
            lineHeight: 1.1,               // mantiene alineado verticalmente
            maxWidth: hovered ? `${textMaxWidth}px` : "0px",
            opacity: hovered ? 1 : 0,
            transform: hovered ? "translateX(0)" : "translateX(-6px)",
            overflow: "hidden",
            paddingRight: hovered ? 10 : 0,
          }}
        >
          {label}
        </span>
      </span>
    </button>
  );
});
