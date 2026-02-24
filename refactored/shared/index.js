/**
 * ╔════════════════════════════════════════════════════════════╗
 * ║  CAPA SHARED — Barrel export principal                    ║
 * ║                                                           ║
 * ║  Uso:                                                     ║
 * ║    import { Toast, useAuth, toSnakeCase } from "@shared"; ║
 * ╚════════════════════════════════════════════════════════════╝
 */

// Auth
export { default as authService } from "./auth/AuthService";
export { useAuth } from "./auth/useAuth";

// UI Components
export {
  Toast,
  quickToast,
  swalToast,
  confirm,
  success,
  error,
  info,
  PreviewContent,
  PillCanal,
  PillEstado,
  PillEncargado,
  getChannelKey,
} from "./ui";

// Hooks
export { useSpotlight, usePagination } from "./hooks";

// Lib / Utils
export {
  toSnakeCase,
  detectPlaceholders,
  expandirTemplate,
  normalizeSpaces,
  toTitleCaseEs,
  formatDatetimeToSQL,
  fmtMoney,
  truncate,
} from "./lib";
