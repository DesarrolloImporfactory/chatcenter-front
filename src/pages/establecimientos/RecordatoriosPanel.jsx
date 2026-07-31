import { useEffect } from "react";

/* Panel de recordatorios de cita.
   Va en un cajón lateral y no en la pantalla porque es configuración que se
   toca una vez: ocupando el ancho completo le robaba el espacio al listado de
   sedes, que es a lo que se entra todos los días.

   Cada anticipación elige SU propio mensaje y decide qué dato va en cada
   variable. La plantilla puede tener las variables que quiera —o ninguna—:
   quien manda es la plantilla que el cliente ya tiene aprobada, no nosotros. */

const etiquetaHora = (h) =>
  h >= 24
    ? `${h / 24} día${h >= 48 ? "s" : ""} antes`
    : `${h} hora${h > 1 ? "s" : ""} antes`;

/* Qué se espera de cada aviso. No es decoración: es lo que evita que el cliente
   elija tres plantillas con el mismo texto. */
const INTENCION = {
  48: "Confirma que la cita sigue en pie y da tiempo a reprogramar.",
  24: "Recuerda la cita del día siguiente y pide avisar si no puede venir.",
  12: "Repaso del día: hora y dirección.",
  4: "Últimos detalles antes de salir.",
  2: "Aviso corto: hora y cómo llegar.",
  1: "El empujón final: que salga ya.",
};

/* Colores del resaltado: el mismo índice pinta igual en la vista previa y en el
   selector de abajo, así el mapeo se entiende mirando, sin leer una tabla. */
const COLORES = [
  "bg-indigo-100 text-indigo-800 ring-indigo-200",
  "bg-emerald-100 text-emerald-800 ring-emerald-200",
  "bg-amber-100 text-amber-800 ring-amber-200",
  "bg-sky-100 text-sky-800 ring-sky-200",
  "bg-rose-100 text-rose-800 ring-rose-200",
  "bg-violet-100 text-violet-800 ring-violet-200",
  "bg-teal-100 text-teal-800 ring-teal-200",
];

const color = (i) => COLORES[i % COLORES.length];

const componente = (plantilla, tipo) =>
  (plantilla?.components || []).find((c) => c.type === tipo);

/* Cuántas variables usa el cuerpo. Es la cantidad exacta de datos que hay que
   mandarle a Meta: ni uno más ni uno menos, o rechaza el envío (132000). */
export const variablesDePlantilla = (plantilla) => {
  const body = componente(plantilla, "BODY");
  return new Set(
    [...String(body?.text || "").matchAll(/\{\{(\d+)\}\}/g)].map((m) => m[1]),
  ).size;
};

/* Botones URL con variable: también hay que mandarles un valor. */
const botonesConVariable = (plantilla) =>
  (componente(plantilla, "BUTTONS")?.buttons || [])
    .map((b, index) => ({ ...b, index }))
    .filter((b) => b.type === "URL" && /\{\{\d+\}\}/.test(b.url || ""));

/* Parte el texto de la plantilla y marca dónde va cada variable, para pintarlas
   con su color en la vista previa. */
const trozos = (texto, valorDe) => {
  const partes = [];
  let ultimo = 0;
  const t = String(texto || "");
  for (const m of t.matchAll(/\{\{(\d+)\}\}/g)) {
    if (m.index > ultimo) partes.push({ txt: t.slice(ultimo, m.index) });
    const i = Number(m[1]) - 1;
    partes.push({ txt: valorDe(i), var: i });
    ultimo = m.index + m[0].length;
  }
  if (ultimo < t.length) partes.push({ txt: t.slice(ultimo) });
  return partes;
};

/* Vista previa con el aspecto de un mensaje recibido en WhatsApp. Ver el texto
   final con los datos que el cliente eligió responde de un vistazo la pregunta
   que antes no tenía respuesta: "¿qué le llega exactamente al cliente?". */
function Preview({ plantilla, valorDe }) {
  const body = componente(plantilla, "BODY");
  const header = componente(plantilla, "HEADER");
  const footer = componente(plantilla, "FOOTER");
  const botones = componente(plantilla, "BUTTONS");

  return (
    <div className="rounded-xl bg-[#ECE5DD] p-3">
      <div className="max-w-[300px] rounded-lg rounded-tl-none bg-white px-3 py-2 shadow-sm">
        {header?.format === "TEXT" && header?.text && (
          <p className="mb-1 text-[12.5px] font-bold text-gray-900">
            {header.text}
          </p>
        )}

        <p className="whitespace-pre-wrap text-[12.5px] leading-[1.45] text-gray-800">
          {trozos(body?.text, valorDe).map((p, i) =>
            p.var === undefined ? (
              <span key={i}>{p.txt}</span>
            ) : (
              <span
                key={i}
                className={`rounded px-1 py-[1px] font-medium ring-1 ${color(p.var)}`}
              >
                {p.txt}
              </span>
            ),
          )}
        </p>

        {footer?.text && (
          <p className="mt-1.5 text-[11px] text-gray-400">{footer.text}</p>
        )}

        <p className="mt-1 text-right text-[10px] text-gray-400">
          9:41 <i className="bx bx-check-double text-sky-500" />
        </p>
      </div>

      {!!botones?.buttons?.length && (
        <div className="mt-1 flex max-w-[300px] flex-col gap-1">
          {botones.buttons.map((b, i) => (
            <div
              key={i}
              className="rounded-lg bg-white px-3 py-1.5 text-center text-[12px] font-medium text-sky-600 shadow-sm"
            >
              {b.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* Una tarjeta por aviso: plantilla, qué va en cada variable y cómo queda. */
function Aviso({
  hora,
  aviso,
  plantillasWa,
  variables,
  guardando,
  onCambiar,
}) {
  const nombre = aviso?.plantilla || "";
  const plantilla = plantillasWa.find((t) => t.name === nombre);
  const nVars = plantilla ? variablesDePlantilla(plantilla) : 0;
  const botones = plantilla ? botonesConVariable(plantilla) : [];

  const mapa = Array.isArray(aviso?.body) ? aviso.body : [];
  const mapaBotones = Array.isArray(aviso?.buttons) ? aviso.buttons : [];

  const datoDe = (clave) => variables.find((v) => v.key === clave);
  const ejemploDe = (i) => datoDe(mapa[i])?.ejemplo ?? `{{${i + 1}}}`;

  const cambiarPlantilla = (nuevoNombre) => {
    const nueva = plantillasWa.find((t) => t.name === nuevoNombre);
    const cuantas = nueva ? variablesDePlantilla(nueva) : 0;
    /* Al cambiar de plantilla se rearma el mapeo al tamaño nuevo, conservando
       lo que ya estaba elegido: cambiar de una de 4 a una de 2 no puede dejar
       dos parámetros de más colgando, porque Meta rechaza el envío. */
    onCambiar(hora, {
      plantilla: nuevoNombre,
      body: Array.from(
        { length: cuantas },
        (_, i) => mapa[i] || ["nombre", "servicio", "hora", "ubicacion"][i] || "nombre",
      ),
      buttons: (nueva ? botonesConVariable(nueva) : []).map((b) => ({
        index: b.index,
        variable:
          mapaBotones.find((x) => x.index === b.index)?.variable || "ubicacion",
      })),
    });
  };

  const cambiarVariable = (i, clave) => {
    const body = [...mapa];
    body[i] = clave;
    onCambiar(hora, { ...aviso, body });
  };

  const cambiarBoton = (index, clave) => {
    const buttons = mapaBotones.filter((b) => b.index !== index);
    buttons.push({ index, variable: clave });
    onCambiar(hora, { ...aviso, buttons });
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-bold text-gray-900">
          {etiquetaHora(hora)}
        </h3>
        <span className="text-right text-[11px] text-gray-400">
          {INTENCION[hora] || ""}
        </span>
      </div>

      <select
        value={nombre}
        disabled={guardando}
        onChange={(e) => cambiarPlantilla(e.target.value)}
        className="mt-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition focus:border-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/25 disabled:opacity-60"
      >
        <option value="">Sin plantilla — este aviso no se envía</option>
        {plantillasWa.map((t) => (
          <option key={t.id || t.name} value={t.name}>
            {t.name}
          </option>
        ))}
      </select>

      {!nombre && (
        <p className="mt-2 text-[11.5px] text-gray-500">
          Mientras no elijas una plantilla, este aviso queda apagado aunque la
          hora esté marcada.
        </p>
      )}

      {nombre && !plantilla && (
        <p className="mt-2 text-[11.5px] text-rose-600">
          La plantilla «{nombre}» ya no está entre las aprobadas de la cuenta.
          Elige otra o este aviso no saldrá.
        </p>
      )}

      {plantilla && (
        <>
          <div className="mt-3">
            <Preview plantilla={plantilla} valorDe={ejemploDe} />
          </div>

          {nVars === 0 && !botones.length ? (
            <p className="mt-2.5 text-[11.5px] text-gray-500">
              Esta plantilla no tiene variables: se envía tal cual, sin nada que
              completar.
            </p>
          ) : (
            <div className="mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Qué va en cada variable
              </p>

              <div className="mt-2 space-y-2">
                {Array.from({ length: nVars }, (_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span
                      className={`inline-flex h-6 w-9 shrink-0 items-center justify-center rounded-md text-[11px] font-bold ring-1 ${color(i)}`}
                    >
                      {`{{${i + 1}}}`}
                    </span>
                    <select
                      value={mapa[i] || "nombre"}
                      disabled={guardando}
                      onChange={(e) => cambiarVariable(i, e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] text-gray-900 transition focus:border-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/25 disabled:opacity-60"
                    >
                      {variables.map((v) => (
                        <option key={v.key} value={v.key}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}

                {botones.map((b) => (
                  <div key={`btn-${b.index}`} className="flex items-center gap-2">
                    <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md bg-slate-100 px-2 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                      <i className="bx bx-link-external" />
                      {b.text}
                    </span>
                    <select
                      value={
                        mapaBotones.find((x) => x.index === b.index)?.variable ||
                        "ubicacion"
                      }
                      disabled={guardando}
                      onChange={(e) => cambiarBoton(b.index, e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] text-gray-900 transition focus:border-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/25 disabled:opacity-60"
                    >
                      {variables.map((v) => (
                        <option key={v.key} value={v.key}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default function RecordatoriosPanel({
  abierto,
  onCerrar,
  opciones,
  horas,
  plantillas,
  variables,
  plantillasWa,
  guardando,
  creandoPlantillas,
  preconfigurado,
  onToggleHora,
  onCambiarAviso,
  onCrearPlantillas,
}) {
  // Cerrar con Escape: es un cajón, no una pantalla; quedarse atrapado molesta.
  useEffect(() => {
    if (!abierto) return;
    const alTecla = (e) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", alTecla);
    return () => window.removeEventListener("keydown", alTecla);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  const activas = [...horas].sort((a, b) => b - a);

  return (
    <div className="fixed inset-0 z-[70] flex">
      <div
        className="flex-1 bg-slate-900/40 backdrop-blur-[1px]"
        onClick={onCerrar}
      />

      <aside className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <header className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 ring-1 ring-amber-100">
            <i className="bx bx-alarm text-lg text-amber-600" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-gray-900">
              Recordatorios de cita
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Cuándo se le avisa al cliente y con qué mensaje. Cada aviso lleva
              el suyo: repetir el mismo texto es lo que hace que silencien el
              número.
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-slate-100 hover:text-gray-600"
            aria-label="Cerrar"
          >
            <i className="bx bx-x text-2xl" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {preconfigurado && (
            <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-[12px] text-emerald-900 ring-1 ring-emerald-100">
              <strong className="font-semibold">Ya quedó andando.</strong> Como
              esta cuenta no tenía nada configurado, dejamos activo el aviso de
              1 hora antes con «{preconfigurado}», que es el que más ausencias
              evita. Cámbialo cuando quieras.
            </p>
          )}

          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Cuándo avisar
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {opciones.map((h) => {
              const activo = horas.includes(h);
              return (
                <button
                  key={h}
                  type="button"
                  disabled={guardando}
                  onClick={() => onToggleHora(h)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition disabled:opacity-60 ${
                    activo
                      ? "border-amber-400 bg-amber-50 text-amber-800"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <i
                    className={`bx ${activo ? "bx-check-circle" : "bx-circle"} text-base`}
                  />
                  {etiquetaHora(h)}
                </button>
              );
            })}
          </div>

          {horas.length >= 4 && (
            <p className="mt-2.5 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800 ring-1 ring-amber-100">
              Con {horas.length} avisos por cita muchos clientes silencian el
              número. Tres es el techo razonable: víspera, mismo día y última
              hora.
            </p>
          )}

          <div className="mt-6 flex items-baseline justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Mensaje de cada aviso
            </p>
            <button
              type="button"
              onClick={onCrearPlantillas}
              disabled={creandoPlantillas}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1 text-[12px] font-medium text-gray-600 transition hover:border-gray-300 hover:bg-slate-50 disabled:opacity-60"
            >
              <i
                className={`bx ${creandoPlantillas ? "bx-loader-alt animate-spin" : "bx-magic-wand"} text-base`}
              />
              Crear las recomendadas
            </button>
          </div>

          {!plantillasWa.length && (
            <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-800 ring-1 ring-rose-100">
              Esta cuenta no tiene plantillas aprobadas por Meta, así que ningún
              recordatorio puede salir. Con «Crear las recomendadas» te dejamos
              tres listas para enviar a aprobación; Meta suele tardar unos
              minutos.
            </p>
          )}

          <div className="mt-2.5 space-y-4">
            {activas.map((h) => (
              <Aviso
                key={h}
                hora={h}
                aviso={plantillas[h]}
                plantillasWa={plantillasWa}
                variables={variables}
                guardando={guardando}
                onCambiar={onCambiarAviso}
              />
            ))}
          </div>
        </div>

        <footer className="border-t border-slate-100 px-5 py-3">
          <p className="text-[11px] text-gray-400">
            Los cambios se guardan solos. La hora que ve el cliente es la de la
            agenda donde se creó la cita.
          </p>
        </footer>
      </aside>
    </div>
  );
}
