/**
 * ╔════════════════════════════════════════════════════════════╗
 * ║  CAPA SHARED — Toast & Dialogs (SweetAlert2)              ║
 * ║                                                           ║
 * ║  MIGRACIÓN:                                               ║
 * ║  Reemplaza la definición IDÉNTICA de `const Toast =       ║
 * ║  Swal.mixin(...)` que está copiada en 17+ archivos:       ║
 * ║                                                           ║
 * ║  - src/pages/chat/Chat.jsx (L176-186)                     ║
 * ║  - src/store/slices/user.slice.js (L5-15)                 ║
 * ║  - src/pages/productos/ProductosView.jsx (L9-19)          ║
 * ║  - src/pages/contactos/Estado_contactos_ventas.jsx (L8)   ║
 * ║  - src/pages/contactos/Estado_contactos_imporshop.jsx     ║
 * ║  - src/pages/contactos/Estado_contactos_imporfactory.jsx  ║
 * ║  - src/pages/asistentes/Asistentes.jsx (L6-16)            ║
 * ║  - src/hooks/useNovedadesManager.js (L43-53)              ║
 * ║  - src/components/chat/DatosUsuario.jsx (L355-365)        ║
 * ║  - src/components/chat/DatosUsuarioModerno.jsx (L120-130) ║
 * ║  - src/components/chat/GuiaGenerator.jsx (L29-35)         ║
 * ║  - src/components/chat/Modales.jsx (L387-397)             ║
 * ║  - src/components/chat/modales/EditarContactoDrawer.jsx   ║
 * ║  - src/components/clientes/Contactos.jsx (L27-36)         ║
 * ║  - src/pages/conexiones/Conexiones.jsx (L1628-1636)       ║
 * ║  - src/pages/calendario/Calendario.jsx (L1193-1200)       ║
 * ║  - public/index.html (L1171-1181)                         ║
 * ║                                                           ║
 * ║  USO DESPUÉS DE MIGRACIÓN:                                ║
 * ║    import { Toast, confirm, success, error } from         ║
 * ║      "@shared/ui/Toast";                                  ║
 * ║                                                           ║
 * ║    Toast.fire({ icon: "success", title: "Guardado" });    ║
 * ║    const { isConfirmed } = await confirm("¿Eliminar?");   ║
 * ╚════════════════════════════════════════════════════════════╝
 */

import Swal from "sweetalert2";

/**
 * Toast pre-configurado con las opciones estándar del proyecto.
 * Uso: Toast.fire({ icon: "success", title: "Listo!" })
 */
export const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener("mouseenter", Swal.stopTimer);
    toast.addEventListener("mouseleave", Swal.resumeTimer);
  },
});

/**
 * Toast rápido para operaciones copiado, actualizado, etc.
 * Usa un timer más corto.
 *
 * Reemplaza el patrón inline de Conexiones.jsx y Calendario.jsx:
 *   Swal.fire({ toast: true, timer: 1200, ... })
 */
export const quickToast = (title, icon = "success", timer = 1400) =>
  Swal.fire({
    toast: true,
    position: "top-end",
    icon,
    title,
    showConfirmButton: false,
    timer,
    timerProgressBar: true,
  });

/**
 * Toast paramétrico reutilizable.
 * Reemplaza `swalToast()` de EditarContactoDrawer y Contactos.
 */
export const swalToast = (title, icon = "success", timer = 2200) =>
  Swal.fire({
    toast: true,
    position: "top-end",
    icon,
    title,
    showConfirmButton: false,
    timer,
    timerProgressBar: true,
  });

/**
 * Diálogo de confirmación estándar.
 */
export const confirm = (title, text, opts = {}) =>
  Swal.fire({
    title,
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: opts.confirmText || "Sí, continuar",
    cancelButtonText: opts.cancelText || "Cancelar",
    confirmButtonColor: opts.confirmColor || "#3085d6",
    cancelButtonColor: opts.cancelColor || "#d33",
    ...opts,
  });

/**
 * Diálogo de éxito.
 */
export const success = (title, html) =>
  Swal.fire({ icon: "success", title, html, confirmButtonText: "OK" });

/**
 * Diálogo de error.
 */
export const error = (title, text) =>
  Swal.fire({ icon: "error", title, text });

/**
 * Diálogo de información.
 */
export const info = (title, text) =>
  Swal.fire({ icon: "info", title, text });

export default Toast;
