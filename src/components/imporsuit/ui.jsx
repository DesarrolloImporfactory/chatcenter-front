/**
 * Helpers de UI compartidos por los formularios de Imporsuit dentro de
 * ImporChat (crear usuario, deuda, pago, venta).
 *
 * Vivían dentro de `CrearUsuarioForm.jsx`, que los exportaba para el resto.
 * Se movieron acá cuando `VentaFields` pasó a necesitarlos: al importarlos de
 * `CrearUsuarioForm` —que a su vez importa `VentaFields`— quedaba un ciclo que
 * funciona por casualidad (los helpers solo se usan en render) y se rompería
 * en cuanto alguien los usara al evaluar el módulo.
 *
 * `CrearUsuarioForm` los sigue re-exportando para no tocar a
 * `AgregarDeudaForm` ni a `RegistrarPagoForm`.
 */

export const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500";

export const btnPrimary =
  "rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60";

export const btnGhost =
  "rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60";

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-gray-600">
        {label}
      </span>
      {children}
    </label>
  );
}

export function Overlay({ children, onClose }) {
  return (
    <>
      <div
        className="fixed inset-0 z-[90] bg-black/40"
        onClick={onClose}
        role="presentation"
      />
      <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 sm:items-center">
        {children}
      </div>
    </>
  );
}
