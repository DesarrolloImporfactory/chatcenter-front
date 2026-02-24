/**
 * ╔════════════════════════════════════════════════════════════╗
 * ║  FEATURE CHAT — Barrel export principal                   ║
 * ║                                                           ║
 * ║  Uso:                                                     ║
 * ║    import { ChatShell, useMessages } from                 ║
 * ║      "@features/chat";                                    ║
 * ╚════════════════════════════════════════════════════════════╝
 */

// Components
export {
  ChatShell,
  ChatHeader,
  MessageList,
  MessageInput,
  BotSwitch,
} from "./components";

// Hooks
export { useMessages, useBotToggle, useTemplateModal } from "./hooks";

// Services
export {
  chatMessageService,
  chatConversationService,
} from "./services";

// Modals
export { default as TemplateModal } from "./modals/TemplateModal";
