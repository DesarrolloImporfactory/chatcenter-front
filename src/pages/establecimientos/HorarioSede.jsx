import { useMemo } from "react";

/* Editor del horario de atención de una sede.

   Antes era un campo de texto libre y cada cuenta escribía lo que quería
   ("lunes a viernes de 9am a 5pm", "L-V 9/17"). El bot tenía que interpretarlo
   y terminaba ofreciendo citas un domingo en un local que cierra el sábado.
   Acá se elige, no se redacta: lo que se guarda ya está en un formato que el
   sistema entiende, y el texto que ve el cliente se genera solo. */

const DIAS = [
  { i: 1, corto: "Lun", largo: "Lunes" },
  { i: 2, corto: "Mar", largo: "Martes" },
  { i: 3, corto: "Mié", largo: "Miércoles" },
  { i: 4, corto: "Jue", largo: "Jueves" },
  { i: 5, corto: "Vie", largo: "Viernes" },
  { i: 6, corto: "Sáb", largo: "Sábado" },
  { i: 0, corto: "Dom", largo: "Domingo" },
];

const ENTRE_SEMANA = [1, 2, 3, 4, 5];
const FIN_DE_SEMANA = [6, 0];

/* Las horas van en un <input type="time">, no en un <select>.
   Con 49 opciones el desplegable nativo se abría de punta a punta de la
   pantalla y tapaba el resto del formulario; su alto no se puede limitar por
   CSS. El input nativo es compacto, se escribe con el teclado y en móvil abre
   el selector del sistema. El paso de 30 minutos mantiene la idea original:
   ningún local abre a las 9:07. */
const PASO_MINUTOS = 30 * 60;

const POR_DEFECTO = { desde: "09:00", hasta: "18:00" };

export const HORARIO_VACIO = { abierto_24h: false, dias: {} };

/* Mismo resumen que arma el backend. Se repite acá para que el cliente vea
   cómo va a quedar mientras lo edita, sin tener que guardar para enterarse. */
export function resumenHorario(h) {
  if (!h) return null;
  if (h.abierto_24h) return "Abierto 24 horas, todos los días";

  const clave = (d) =>
    (h.dias?.[d] || []).map((f) => `${f.desde}-${f.hasta}`).join(" y ");

  const orden = [1, 2, 3, 4, 5, 6, 0];
  const nombre = (d) => DIAS.find((x) => x.i === d)?.largo || "";
  const grupos = [];

  for (const d of orden) {
    const k = clave(d);
    if (!k) continue;
    const ultimo = grupos[grupos.length - 1];
    const consecutivo =
      ultimo && orden.indexOf(d) === orden.indexOf(ultimo.fin) + 1;
    if (ultimo && ultimo.horas === k && consecutivo) ultimo.fin = d;
    else grupos.push({ ini: d, fin: d, horas: k });
  }

  if (!grupos.length) return null;

  return grupos
    .map((g) =>
      g.ini === g.fin
        ? `${nombre(g.ini)} ${g.horas}`
        : `${nombre(g.ini)} a ${nombre(g.fin).toLowerCase()} ${g.horas}`,
    )
    .join(" · ");
}

export default function HorarioSede({ valor, onChange }) {
  const h = valor || HORARIO_VACIO;
  const dias = h.dias || {};

  const resumen = useMemo(() => resumenHorario(h), [h]);

  const setDias = (nuevos) => onChange({ ...h, dias: nuevos });

  const abrirDia = (d) =>
    setDias({ ...dias, [d]: [{ ...POR_DEFECTO }] });

  const cerrarDia = (d) => {
    const copia = { ...dias };
    delete copia[d];
    setDias(copia);
  };

  const cambiarFranja = (d, idx, campo, valorNuevo) => {
    const franjas = [...(dias[d] || [])];
    franjas[idx] = { ...franjas[idx], [campo]: valorNuevo };
    setDias({ ...dias, [d]: franjas });
  };

  const agregarFranja = (d) =>
    setDias({
      ...dias,
      [d]: [...(dias[d] || []), { desde: "15:00", hasta: "19:00" }],
    });

  const quitarFranja = (d, idx) => {
    const franjas = (dias[d] || []).filter((_, i) => i !== idx);
    if (!franjas.length) return cerrarDia(d);
    setDias({ ...dias, [d]: franjas });
  };

  /* Atajos: la mayoría de los negocios tiene el mismo horario de lunes a
     viernes. Llenar cinco días idénticos a mano es la clase de fricción que
     hace que la gente deje el horario a medias. */
  const aplicarA = (grupo) => {
    const base = ENTRE_SEMANA.map((d) => dias[d]).find((f) => f?.length) || [
      { ...POR_DEFECTO },
    ];
    const copia = { ...dias };
    for (const d of grupo) copia[d] = base.map((f) => ({ ...f }));
    setDias(copia);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <label className="flex items-center gap-2 text-sm text-gray-800">
        <input
          type="checkbox"
          checked={!!h.abierto_24h}
          onChange={(e) => onChange({ ...h, abierto_24h: e.target.checked })}
          className="h-4 w-4 rounded border-gray-300 text-[#1d4ed8] focus:ring-[#1d4ed8]/30"
        />
        <span className="font-medium">Abierto 24 horas, todos los días</span>
      </label>
      <p className="mt-1 pl-6 text-[11px] text-gray-500">
        Para clínicas y servicios de urgencia. El asistente podrá agendar a
        cualquier hora.
      </p>

      {!h.abierto_24h && (
        <>
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
            <span className="text-[11px] text-gray-500 self-center mr-1">
              Atajos:
            </span>
            <button
              type="button"
              onClick={() => aplicarA(ENTRE_SEMANA)}
              className="rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-600 transition hover:border-gray-300 hover:bg-slate-50"
            >
              Aplicar a lunes–viernes
            </button>
            <button
              type="button"
              onClick={() => aplicarA(FIN_DE_SEMANA)}
              className="rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-600 transition hover:border-gray-300 hover:bg-slate-50"
            >
              …y al fin de semana
            </button>
            <button
              type="button"
              onClick={() => setDias({})}
              className="rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-600 transition hover:border-gray-300 hover:bg-slate-50"
            >
              Limpiar
            </button>
          </div>

          <div className="mt-2 space-y-1.5">
            {DIAS.map(({ i, corto }) => {
              const franjas = dias[i] || [];
              const abierto = franjas.length > 0;

              return (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <label className="flex w-24 shrink-0 items-center gap-2 text-[13px] text-gray-800">
                    <input
                      type="checkbox"
                      checked={abierto}
                      onChange={(e) =>
                        e.target.checked ? abrirDia(i) : cerrarDia(i)
                      }
                      className="h-4 w-4 rounded border-gray-300 text-[#1d4ed8] focus:ring-[#1d4ed8]/30"
                    />
                    <span className={abierto ? "font-medium" : "text-gray-400"}>
                      {corto}
                    </span>
                  </label>

                  {!abierto ? (
                    <span className="text-[12px] text-gray-400">Cerrado</span>
                  ) : (
                    <div className="flex flex-1 flex-wrap items-center gap-1.5">
                      {franjas.map((f, idx) => (
                        <div key={idx} className="flex items-center gap-1">
                          <input
                            type="time"
                            step={PASO_MINUTOS}
                            value={f.desde}
                            onChange={(e) =>
                              cambiarFranja(i, idx, "desde", e.target.value)
                            }
                            className="rounded-md border border-gray-300 bg-white px-1.5 py-1 text-[12px] text-gray-900 focus:border-[#1d4ed8] focus:outline-none"
                          />
                          <span className="text-[12px] text-gray-400">a</span>
                          <input
                            type="time"
                            step={PASO_MINUTOS}
                            value={f.hasta}
                            onChange={(e) =>
                              cambiarFranja(i, idx, "hasta", e.target.value)
                            }
                            className={`rounded-md border bg-white px-1.5 py-1 text-[12px] text-gray-900 focus:outline-none ${
                              f.hasta <= f.desde
                                ? "border-rose-400"
                                : "border-gray-300 focus:border-[#1d4ed8]"
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => quitarFranja(i, idx)}
                            className="rounded p-0.5 text-gray-300 transition hover:bg-slate-100 hover:text-gray-500"
                            title="Quitar esta franja"
                          >
                            <i className="bx bx-x text-base" />
                          </button>
                          {f.hasta <= f.desde && (
                            <span className="text-[11px] text-rose-600">
                              la hora de cierre debe ser mayor
                            </span>
                          )}
                        </div>
                      ))}

                      {/* Horario partido: cierran al mediodía y reabren. */}
                      {franjas.length < 2 && (
                        <button
                          type="button"
                          onClick={() => agregarFranja(i)}
                          className="rounded-md px-1.5 py-1 text-[11px] text-gray-500 transition hover:bg-slate-100 hover:text-gray-700"
                          title="Para horarios partidos (cierran al mediodía)"
                        >
                          + partido
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="mt-3 border-t border-slate-100 pt-2">
        {resumen ? (
          <p className="text-[11.5px] text-gray-600">
            Así lo verá el cliente:{" "}
            <span className="font-medium text-gray-800">{resumen}</span>
          </p>
        ) : (
          <p className="text-[11.5px] text-amber-700">
            Sin horario, el asistente no sabe qué horas ofrecer y puede agendar
            con el local cerrado.
          </p>
        )}
      </div>
    </div>
  );
}
