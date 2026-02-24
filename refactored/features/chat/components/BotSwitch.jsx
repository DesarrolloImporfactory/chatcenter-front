/**
 * ╔════════════════════════════════════════════════════════════╗
 * ║  FEATURE CHAT — BotSwitch                                 ║
 * ║                                                           ║
 * ║  MIGRACIÓN:                                               ║
 * ║  Extrae el componente de: src/components/chat/SwitchBot   ║
 * ║  Componente puro UI sin dependencias externas.            ║
 * ╚════════════════════════════════════════════════════════════╝
 */

import React from "react";

/**
 * Switch visual para activar/desactivar el bot de IA.
 *
 * @param {object}   props
 * @param {boolean}  props.botActivo - Si el bot está activo
 * @param {Function} props.onToggle  - Callback al hacer click
 */
export default function BotSwitch({ botActivo, onToggle }) {
  return (
    <div
      onClick={onToggle}
      className={`w-14 h-7 flex items-center rounded-full px-1 cursor-pointer transition-all duration-300
        ${botActivo ? "bg-emerald-500" : "bg-gray-400"}
        hover:shadow-lg`}
      role="switch"
      aria-checked={botActivo}
      aria-label={botActivo ? "Desactivar bot" : "Activar bot"}
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onToggle?.()}
    >
      <div
        className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-all duration-300 flex items-center justify-center
          ${botActivo ? "translate-x-7" : "translate-x-0"}`}
      >
        <i
          className={`bx bx-bot text-gray-600 text-[14px] transition-opacity duration-300
            ${botActivo ? "opacity-100" : "opacity-70"}`}
        />
      </div>
    </div>
  );
}
