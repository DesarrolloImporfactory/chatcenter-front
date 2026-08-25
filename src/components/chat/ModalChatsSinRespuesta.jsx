import ReactDOM from "react-dom";
import { MINUTOS_CRITICO, formatEspera } from "../../config/alertasSinRespuesta";

/**
 * Aviso de los chats que llevan más de 30 minutos sin respuesta.
 *
 * Un solo modal con la lista, no un pop-up por chat: con varios clientes
 * esperando, N ventanas seguidas se cierran sin leerlas.
 */
export const ModalChatsSinRespuesta = ({
  chats = [],
  total = 0,
  truncado = false,
  onCerrar,
  onSelect,
}) => {
  if (!chats.length) return null;

  // El aviso solo trae los que todavía no se habían avisado; el total es
  // de toda la configuración y suele ser mayor.
  const pendientesRestantes = Math.max(0, total - chats.length);

  const contenido = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Encabezado */}
        <div className="flex items-start gap-3 border-b border-slate-100 bg-rose-50 px-4 py-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-rose-100 text-rose-600">
            <i className="bx bx-time-five text-xl" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-slate-800">
              {chats.length === 1
                ? "1 cliente sin respuesta"
                : `${chats.length} clientes sin respuesta`}
            </h2>
            <p className="text-[11px] leading-tight text-slate-500">
              Llevan más de {MINUTOS_CRITICO} minutos esperando
              {pendientesRestantes > 0
                ? `. Hay ${truncado ? `más de ${total}` : total} en total sin responder.`
                : "."}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="shrink-0 rounded-full p-1 text-slate-400 transition hover:bg-white hover:text-slate-600"
            title="Cerrar"
          >
            <i className="bx bx-x text-lg" />
          </button>
        </div>

        {/* Listado */}
        <ul className="max-h-[45vh] divide-y divide-slate-100 overflow-y-auto">
          {chats.map((chat) => (
            <li key={chat.id}>
              <button
                type="button"
                onClick={() => {
                  if (typeof onSelect === "function") onSelect(chat);
                  onCerrar();
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium text-slate-800">
                    {chat.nombre_cliente || chat.celular_cliente || "Sin nombre"}
                  </p>
                  <p className="truncate text-[10.5px] text-slate-500">
                    {chat.texto_mensaje || chat.celular_cliente || ""}
                  </p>
                  <p className="truncate text-[10px] text-slate-400">
                    {chat.nombre_encargado
                      ? `Asignado a ${chat.nombre_encargado}`
                      : "Sin asignar"}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                  {formatEspera(chat.minutos)}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="flex justify-end border-t border-slate-100 px-4 py-2.5">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-slate-700"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? ReactDOM.createPortal(contenido, document.body)
    : contenido;
};

export default ModalChatsSinRespuesta;
