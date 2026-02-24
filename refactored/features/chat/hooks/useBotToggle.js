/**
 * ╔════════════════════════════════════════════════════════════╗
 * ║  FEATURE CHAT — Hook useBotToggle                         ║
 * ║                                                           ║
 * ║  MIGRACIÓN:                                               ║
 * ║  Extrae la lógica del switch de bot que está duplicada en:║
 * ║  - src/components/chat/Cabecera.jsx                       ║
 * ║  - src/pages/chat/Chat.jsx                                ║
 * ║  - src/components/chat/SwitchBot.jsx                      ║
 * ╚════════════════════════════════════════════════════════════╝
 */

import { useState, useCallback } from "react";
import chatConversationService from "../services/chatConversationService";
import { Toast } from "../../../shared/ui/Toast";

/**
 * @param {number|string} chatId    - ID del chat
 * @param {boolean}       initial   - Estado inicial del bot
 */
export function useBotToggle(chatId, initial = true) {
  const [botActivo, setBotActivo] = useState(initial);
  const [toggling, setToggling] = useState(false);

  const toggle = useCallback(async () => {
    if (toggling || !chatId) return;
    setToggling(true);
    const newState = !botActivo;

    try {
      await chatConversationService.toggleBot(chatId, newState);
      setBotActivo(newState);
      Toast.fire({
        icon: "success",
        title: newState ? "Bot activado" : "Bot desactivado",
      });
    } catch (err) {
      Toast.fire({
        icon: "error",
        title: "Error al cambiar estado del bot",
      });
      console.error("Error toggle bot:", err);
    } finally {
      setToggling(false);
    }
  }, [chatId, botActivo, toggling]);

  // Sincronizar con cambios externos (e.g. socket)
  const sync = useCallback((newState) => setBotActivo(newState), []);

  return { botActivo, toggling, toggle, sync };
}

export default useBotToggle;
