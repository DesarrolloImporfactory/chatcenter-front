import React, { useCallback, useEffect, useState } from "react";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";

/* Solicitudes de cita: lo que el bot levantó y todavía no está en la agenda.
   ─────────────────────────────────────────────────────────────
   Con la acción de agendar en modo "solicitud", el bot hace todo su trabajo
   —quién es, qué quiere ver, cuándo le viene bien— pero no toca el calendario.
   Eso pasa a decidirlo una persona, y este panel es donde lo decide.

   Vive en el calendario y no en el tablero a propósito: al confirmar nace una
   cita, y quien confirma necesita ver la semana que ya tiene armada mientras
   elige la hora. El tablero avisa que hay alguien esperando; acá se resuelve.

   Si la cuenta no tiene ninguna solicitud —que es el caso de casi todas: el
   modo automático sigue siendo el default— el panel no se dibuja. */

const fmtFecha = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("es-EC", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/* Cuánto lleva esperando. En una solicitud de visita el tiempo ES el dato:
   alguien que pidió ver una casa hace tres horas y sigue sin confirmación ya
   está hablando con otra inmobiliaria. */
const desdeHace = (iso) => {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return "";
  const min = Math.floor(ms / 60000);
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
};

const SolicitudesCitas = ({ idConfiguracion, onCitaCreada }) => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [abierta, setAbierta] = useState(null); // id de la que se está confirmando
  const [form, setForm] = useState({ inicio: "", duracion: 45 });
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    if (!idConfiguracion) return;
    try {
      const { data } = await chatApi.post(
        "/citas_solicitudes/listar",
        { id_configuracion: idConfiguracion, estado: "pendiente" },
        { silentError: true },
      );
      setSolicitudes(Array.isArray(data?.data) ? data.data : []);
    } catch {
      /* Sin solicitudes o sin permiso: el panel simplemente no aparece. No se
         muestra un error porque para la mayoría de las cuentas esto no existe
         y un cartel rojo en el calendario sería ruido puro. */
      setSolicitudes([]);
    } finally {
      setCargando(false);
    }
  }, [idConfiguracion]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirConfirmacion = (s) => {
    setAbierta(s.id);
    setForm({
      // Precargado con lo que pidió la persona: casi siempre se confirma tal
      // cual, y obligar a re-tipear la fecha es lo que hace que se posterguen.
      inicio: s.inicio_sugerido_local || "",
      duracion: s.duracion_minutos || s.producto_duracion || 45,
    });
  };

  const confirmar = async (s) => {
    if (!form.inicio) {
      Swal.fire({
        icon: "warning",
        title: "Falta la fecha",
        text: "Elige el día y la hora de la visita.",
      });
      return;
    }
    setGuardando(true);
    try {
      const { data } = await chatApi.post("/citas_solicitudes/confirmar", {
        id: s.id,
        id_configuracion: idConfiguracion,
        inicio: form.inicio,
        duracion_minutos: Number(form.duracion) || 45,
      });

      const r = data?.data || {};
      setAbierta(null);
      await cargar();
      onCitaCreada?.();

      Swal.fire({
        icon: "success",
        title: "Visita agendada",
        /* Si el aviso al cliente no salió hay que decirlo acá y no enterrarlo
           en un log: la persona quedó esperando una confirmación y, si no le
           llegó, alguien tiene que escribirle. */
        text: r.aviso_enviado
          ? `${s.nombre || "El cliente"} ya recibió la confirmación por WhatsApp.`
          : `Ojo: no se le pudo avisar por WhatsApp (${r.aviso_error || "sin detalle"}). Escríbele tú.`,
        timer: r.aviso_enviado ? 2600 : undefined,
        showConfirmButton: !r.aviso_enviado,
      });
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "No se pudo agendar",
        text:
          e?.response?.data?.message ||
          "Revisa que el horario esté libre e intenta de nuevo.",
      });
    } finally {
      setGuardando(false);
    }
  };

  const descartar = async (s) => {
    const { value: motivo, isConfirmed } = await Swal.fire({
      icon: "question",
      title: "¿Descartar la solicitud?",
      text: "El contacto se queda donde está en el tablero; solo se saca de esta lista.",
      input: "text",
      inputPlaceholder: "Motivo (opcional)",
      showCancelButton: true,
      confirmButtonText: "Descartar",
      cancelButtonText: "Volver",
    });
    if (!isConfirmed) return;

    try {
      await chatApi.post("/citas_solicitudes/descartar", {
        id: s.id,
        id_configuracion: idConfiguracion,
        motivo,
      });
      await cargar();
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "No se pudo descartar",
        text: e?.response?.data?.message || "Intenta de nuevo.",
      });
    }
  };

  if (cargando || !solicitudes.length) return null;

  return (
    <div className="bg-white rounded-md shadow-sm border mb-4 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 bg-orange-50 border-b border-orange-100">
        <i className="bx bx-time-five text-orange-500 text-lg" />
        <div className="flex-1">
          <div className="font-medium text-sm text-orange-800">
            Por agendar
          </div>
          <div className="text-[11px] text-orange-600">
            {solicitudes.length === 1
              ? "1 persona espera confirmación"
              : `${solicitudes.length} personas esperan confirmación`}
          </div>
        </div>
      </div>

      <div className="divide-y max-h-[520px] overflow-y-auto">
        {solicitudes.map((s) => {
          const zona = [s.producto_sector, s.producto_ciudad]
            .filter(Boolean)
            .join(", ");
          const confirmando = abierta === s.id;

          return (
            <div key={s.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">
                    {s.nombre || s.nombre_cliente || "Sin nombre"}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {s.telefono || s.celular_cliente || "sin teléfono"}
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 whitespace-nowrap mt-0.5">
                  {desdeHace(s.created_at)}
                </span>
              </div>

              <div className="mt-2 text-xs text-gray-700">
                <div className="flex items-start gap-1.5">
                  <i className="bx bx-home-alt text-gray-400 mt-0.5" />
                  <span className="truncate">
                    {s.producto_nombre || s.servicio || "Sin ítem identificado"}
                  </span>
                </div>
                {zona && (
                  <div className="flex items-start gap-1.5 mt-0.5 text-gray-500">
                    <i className="bx bx-map text-gray-400 mt-0.5" />
                    <span className="truncate">{zona}</span>
                  </div>
                )}
                {/* Lo que la persona pidió, con sus palabras. Cuando la fecha
                    interpretada sale mal, esta línea es la que salva la cita. */}
                <div className="flex items-start gap-1.5 mt-0.5">
                  <i className="bx bx-calendar text-gray-400 mt-0.5" />
                  <span className="text-gray-600">
                    {fmtFecha(s.inicio_sugerido_local) ||
                      s.preferencia_texto ||
                      "sin preferencia"}
                  </span>
                </div>
                {s.sede_nombre && (
                  <div className="flex items-start gap-1.5 mt-0.5 text-gray-500">
                    <i className="bx bx-buildings text-gray-400 mt-0.5" />
                    <span className="truncate">{s.sede_nombre}</span>
                  </div>
                )}
              </div>

              {!confirmando ? (
                <div className="flex gap-2 mt-2.5">
                  <button
                    onClick={() => abrirConfirmacion(s)}
                    className="flex-1 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-[#1d4ed8] text-white hover:bg-[#1e40af] transition-colors"
                  >
                    Agendar
                  </button>
                  <button
                    onClick={() => descartar(s)}
                    className="text-xs px-2.5 py-1.5 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Descartar
                  </button>
                </div>
              ) : (
                <div className="mt-2.5 rounded-md border border-blue-100 bg-blue-50/50 p-2.5">
                  <label className="text-[11px] font-semibold text-gray-600">
                    Día y hora
                  </label>
                  <input
                    type="datetime-local"
                    value={form.inicio}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, inicio: e.target.value }))
                    }
                    className="w-full mt-1 px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white"
                  />

                  <label className="text-[11px] font-semibold text-gray-600 mt-2 block">
                    Duración (min)
                  </label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    value={form.duracion}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, duracion: e.target.value }))
                    }
                    className="w-full mt-1 px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white"
                  />

                  <p className="text-[10px] text-gray-500 mt-1.5 leading-snug">
                    Al confirmar se crea la cita y se le avisa por WhatsApp con
                    la hora y la dirección.
                  </p>

                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => confirmar(s)}
                      disabled={guardando}
                      className="flex-1 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                    >
                      {guardando ? "Agendando..." : "Confirmar visita"}
                    </button>
                    <button
                      onClick={() => setAbierta(null)}
                      disabled={guardando}
                      className="text-xs px-2.5 py-1.5 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SolicitudesCitas;
