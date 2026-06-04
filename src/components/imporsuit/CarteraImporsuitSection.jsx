import { useState } from "react";
import { CarteraClientePanel } from "./CarteraClientePanel";
import {
  CARTERA_CONFIGS_HABILITADAS,
  setCarteraCtx,
} from "../../services/imporsuit";

/**
 * Entrada a la cartera de Imporsuit desde el panel "Información del cliente".
 *
 * Muestra una barra/botón en el panel; al pulsarla abre la mini-vista en un
 * MODAL grande por fuera (centrado), que se ve mucho mejor que embebido en el
 * panel lateral. El correo del chat se pasa como valor inicial y la búsqueda
 * se dispara automáticamente al abrir.
 *
 * z-index: backdrop z-[60] / contenido z-[70]. Los formularios internos
 * (crear cliente, deuda, pago) usan z-[90]/[100], así que se abren ENCIMA.
 */
export default function CarteraImporsuitSection({
  selectedChat,
  idConfiguracion,
}) {
  const [open, setOpen] = useState(false);
  const correo = selectedChat?.email_cliente || "";
  const nombre = selectedChat?.nombre_cliente || "";
  const telefono = selectedChat?.celular_cliente || "";

  // Solo se muestra en las configuraciones habilitadas (ver constants).
  if (!CARTERA_CONFIGS_HABILITADAS.includes(Number(idConfiguracion))) {
    console.log(idConfiguracion);
    return null;
  }

  return (
    <>
      {/* Barra en el panel (tema oscuro, acorde al panel) */}
      <button
        type="button"
        onClick={() => {
          // Contexto para la auditoría (id_configuracion + correo del cliente).
          setCarteraCtx({ id_configuracion: idConfiguracion, correo });
          setOpen(true);
        }}
        className="mx-1 mb-3 mt-1 flex w-full items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.04] px-4 py-3 text-left transition hover:bg-white/[0.07]"
      >
        <span className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-400/20 bg-emerald-500/10">
            <i className="bx bx-wallet text-[16px] text-emerald-300" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-[8px] font-semibold uppercase tracking-[0.22em] text-white/35">
              Imporsuit
            </span>
            <span className="text-[12px] font-bold uppercase tracking-wide text-white">
              Cartera del cliente
            </span>
          </span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-200">
          Abrir <i className="bx bx-chevron-right text-[14px]" />
        </span>
      </button>

      {/* Modal grande por fuera */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            role="presentation"
          />
          <div
            className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 sm:items-center"
            onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          >
            <div className="w-full max-w-3xl">
              {/* key por correo: reinicia + re-busca al cambiar de cliente */}
              <CarteraClientePanel
                key={correo || "sin-correo"}
                correoInicial={correo}
                nombreInicial={nombre}
                telefonoInicial={telefono}
                onClose={() => setOpen(false)}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}
