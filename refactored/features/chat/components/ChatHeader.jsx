/**
 * ╔════════════════════════════════════════════════════════════╗
 * ║  FEATURE CHAT — ChatHeader (cabecera del chat activo)     ║
 * ║                                                           ║
 * ║  MIGRACIÓN:                                               ║
 * ║  Extrae la sección de cabecera de:                        ║
 * ║  - src/components/chat/ChatPrincipal.jsx (parte superior) ║
 * ║  - src/components/chat/Cabecera.jsx (1313 líneas)         ║
 * ║                                                           ║
 * ║  Este componente es SOLO UI — toda la lógica va en hooks  ║
 * ║  que se pasan como props o se importan directamente.      ║
 * ╚════════════════════════════════════════════════════════════╝
 */

import React from "react";
import BotSwitch from "./BotSwitch";

/**
 * @param {object}   props
 * @param {object}   props.chat        - Chat seleccionado
 * @param {boolean}  props.botActivo   - Estado del bot
 * @param {Function} props.onToggleBot - Callback para toggle bot
 * @param {Function} props.onBack      - Volver a lista de chats (mobile)
 * @param {Function} props.onOpenInfo  - Abrir panel de info del usuario
 * @param {Function} props.onOpenMenu  - Abrir menú de opciones
 */
export default function ChatHeader({
  chat,
  botActivo,
  onToggleBot,
  onBack,
  onOpenInfo,
  onOpenMenu,
}) {
  if (!chat) return null;

  const nombre = chat.nombre_cliente || chat.nombre || "Sin nombre";
  const telefono = chat.celular_cliente || chat.telefono || "";

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
      {/* Lado izquierdo: back + avatar + info */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Botón volver (mobile) */}
        {onBack && (
          <button
            onClick={onBack}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 transition"
            aria-label="Volver"
          >
            <i className="bx bx-arrow-back text-xl text-slate-600" />
          </button>
        )}

        {/* Avatar */}
        <button
          onClick={onOpenInfo}
          className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm hover:opacity-90 transition"
        >
          {nombre.charAt(0).toUpperCase()}
        </button>

        {/* Nombre + teléfono */}
        <div className="min-w-0" onClick={onOpenInfo} role="button" tabIndex={0}>
          <div className="text-sm font-semibold text-slate-800 truncate">
            {nombre}
          </div>
          {telefono && (
            <div className="text-xs text-slate-500 truncate">{telefono}</div>
          )}
        </div>
      </div>

      {/* Lado derecho: bot + menú */}
      <div className="flex items-center gap-2">
        <BotSwitch botActivo={botActivo} onToggle={onToggleBot} />

        {onOpenMenu && (
          <button
            onClick={onOpenMenu}
            className="p-2 rounded-lg hover:bg-slate-100 transition"
            aria-label="Opciones"
          >
            <i className="bx bx-dots-vertical-rounded text-xl text-slate-600" />
          </button>
        )}
      </div>
    </div>
  );
}
