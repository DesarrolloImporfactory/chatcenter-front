import React, { memo, useCallback, useRef } from "react";
import { formatFecha } from "../../utils/conversationMappers";
import { MESSAGE_SOURCES } from "../../types";

const ConversationItem = memo(
  ({ conversation, isActive, onClick, onContextMenu, isLoading = false }) => {
    const clickTimeoutRef = useRef(null);
    const lastClickTimeRef = useRef(0);

    // Prevenir clicks múltiples con debounce mínimo
    const handleClick = useCallback(
      (e) => {
        e.preventDefault();
        e.stopPropagation();

        const now = Date.now();

        // Prevenir clicks muy rápidos (menos de 100ms)
        if (now - lastClickTimeRef.current < 100) {
          return;
        }

        lastClickTimeRef.current = now;

        // Limpiar timeout anterior si existe
        if (clickTimeoutRef.current) {
          clearTimeout(clickTimeoutRef.current);
        }

        // Ejecutar click inmediatamente para mejor UX
        onClick(conversation);
      },
      [conversation, onClick],
    );

    const handleContextMenu = useCallback(
      (e) => {
        if (onContextMenu) {
          onContextMenu(e, conversation);
        }
      },
      [conversation, onContextMenu],
    );
    const getSourceIcon = (source) => {
      switch (source) {
        case MESSAGE_SOURCES.WHATSAPP:
          return (
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">W</span>
            </div>
          );
        case MESSAGE_SOURCES.MESSENGER:
          return (
            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">M</span>
            </div>
          );
        case MESSAGE_SOURCES.INSTAGRAM:
          return (
            <div className="w-6 h-6 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">I</span>
            </div>
          );
        case MESSAGE_SOURCES.TIKTOK:
          return (
            <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">T</span>
            </div>
          );
        default:
          return (
            <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">?</span>
            </div>
          );
      }
    };

    const getLastMessagePreview = () => {
      if (!conversation.texto_mensaje) return "Sin mensajes";

      const text = conversation.texto_mensaje.trim();
      return text.length > 50 ? `${text.substring(0, 50)}...` : text;
    };

    return (
      <div
        className={`
        flex items-center p-3 cursor-pointer transition-all duration-150
        hover:bg-gray-50 border-l-4 relative select-none
        ${
          isActive
            ? "bg-blue-50 border-l-blue-500"
            : "border-l-transparent hover:border-l-gray-300"
        }
        ${isLoading ? "opacity-75 pointer-events-none" : ""}
      `}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {/* Avatar y estado online */}
        <div className="relative flex-shrink-0 mr-3">
          {conversation.imagePath ? (
            <img
              src={conversation.imagePath}
              alt={conversation.nombre_cliente}
              className="w-12 h-12 rounded-full object-cover"
              onError={(e) => {
                e.target.style.display = "none";
                e.target.nextSibling.style.display = "flex";
              }}
            />
          ) : null}
          <div
            className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center text-gray-700 font-semibold"
            style={{ display: conversation.imagePath ? "none" : "flex" }}
          >
            {conversation.nombre_cliente?.charAt(0)?.toUpperCase() || "?"}
          </div>

          {/* Icono de plataforma */}
          <div className="absolute -bottom-1 -right-1">
            {getSourceIcon(conversation.source)}
          </div>
        </div>

        {/* Información de la conversación */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3
              className={`
            font-medium truncate text-sm
            ${isActive ? "text-blue-900" : "text-gray-900"}
          `}
            >
              {conversation.nombre_cliente || "Cliente sin nombre"}
            </h3>
            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
              {formatFecha(conversation.mensaje_created_at)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 truncate">
              {getLastMessagePreview()}
            </p>

            {/* Contador de mensajes pendientes */}
            {conversation.mensajes_pendientes > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 ml-2 flex-shrink-0 min-w-[20px] text-center">
                {conversation.mensajes_pendientes > 99
                  ? "99+"
                  : conversation.mensajes_pendientes}
              </span>
            )}
          </div>

          {/* Etiquetas */}
          {conversation.etiquetas && conversation.etiquetas.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {conversation.etiquetas.slice(0, 2).map((etiqueta, index) => (
                <span
                  key={index}
                  className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full"
                >
                  {etiqueta}
                </span>
              ))}
              {conversation.etiquetas.length > 2 && (
                <span className="text-xs text-gray-500">
                  +{conversation.etiquetas.length - 2}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Indicadores adicionales */}
        <div className="flex flex-col items-end space-y-1 ml-2">
          {conversation.id_encargado && (
            <div
              className="w-2 h-2 bg-green-400 rounded-full"
              title="Asignado"
            ></div>
          )}
          {conversation.estado_factura === "pendiente" && (
            <div
              className="w-2 h-2 bg-yellow-400 rounded-full"
              title="Factura pendiente"
            ></div>
          )}
          {conversation.novedad_info && (
            <div
              className="w-2 h-2 bg-orange-400 rounded-full"
              title="Con novedad"
            ></div>
          )}
        </div>
      </div>
    );
  },
);

ConversationItem.displayName = "ConversationItem";

export default ConversationItem;
