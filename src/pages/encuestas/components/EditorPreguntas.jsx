import React, { useState } from "react";
import {
  TIPOS_PREGUNTA,
  TIPOS_CON_OPCIONES,
  MAX_PREGUNTAS,
  MAX_OPCIONES,
  keyUnica,
  preguntaVacia,
  validarPreguntas,
  PLANTILLAS_PREGUNTAS,
} from "../utils/preguntasConstants";

/**
 * Editor de las preguntas de una encuesta (CRUD completo).
 *
 * Props:
 *   value          — array de preguntas (ver utils/preguntasConstants.js)
 *   onChange       — (siguiente) => void
 *   mostrarPlantillas — muestra el selector de plantillas prearmadas (default true)
 */
export default function EditorPreguntas({
  value = [],
  onChange,
  mostrarPlantillas = true,
}) {
  const preguntas = Array.isArray(value) ? value : [];
  const [expandida, setExpandida] = useState(null);
  const [verPlantillas, setVerPlantillas] = useState(false);

  const errores = validarPreguntas(preguntas);

  /* ── Mutaciones ── */

  const agregar = (tipo = "text") => {
    if (preguntas.length >= MAX_PREGUNTAS) return;
    const nueva = { ...preguntaVacia(preguntas), type: tipo };
    if (TIPOS_CON_OPCIONES.includes(tipo)) nueva.options = ["", ""];
    onChange([...preguntas, nueva]);
    setExpandida(preguntas.length);
  };

  const actualizar = (idx, patch) => {
    const next = preguntas.map((p, i) => (i === idx ? { ...p, ...patch } : p));

    // La key se re-deriva del enunciado solo mientras la pregunta es nueva.
    // Si ya está guardada en la BD se congela: las respuestas históricas
    // están indexadas por esa key y cambiarla las dejaría huérfanas.
    if (patch.label !== undefined && !next[idx]._persistida) {
      next[idx].key = keyUnica(patch.label, next, idx);
    }
    onChange(next);
  };

  const cambiarTipo = (idx, tipo) => {
    const patch = { type: tipo };
    const actual = preguntas[idx];

    if (TIPOS_CON_OPCIONES.includes(tipo)) {
      // Al pasar a un tipo con opciones, sembrar dos vacías si no tenía
      patch.options =
        actual.options?.length >= 2 ? actual.options : ["", ""];
    }
    if (!TIPOS_PREGUNTA[tipo].tienePlaceholder) patch.placeholder = "";

    actualizar(idx, patch);
  };

  const eliminar = (idx) => {
    onChange(preguntas.filter((_, i) => i !== idx));
    setExpandida(null);
  };

  const duplicar = (idx) => {
    if (preguntas.length >= MAX_PREGUNTAS) return;
    const copia = {
      ...preguntas[idx],
      label: `${preguntas[idx].label} (copia)`,
      _persistida: false, // es una pregunta nueva: su key sigue al enunciado
    };
    const next = [...preguntas];
    next.splice(idx + 1, 0, copia);
    // Re-derivar la key de la copia para que no choque
    next[idx + 1].key = keyUnica(copia.label, next, idx + 1);
    onChange(next);
    setExpandida(idx + 1);
  };

  const mover = (idx, delta) => {
    const destino = idx + delta;
    if (destino < 0 || destino >= preguntas.length) return;
    const next = [...preguntas];
    [next[idx], next[destino]] = [next[destino], next[idx]];
    onChange(next);
    setExpandida(destino);
  };

  /* ── Opciones ── */

  const actualizarOpcion = (idxP, idxO, texto) => {
    const options = [...(preguntas[idxP].options || [])];
    options[idxO] = texto;
    actualizar(idxP, { options });
  };

  const agregarOpcion = (idxP) => {
    const options = [...(preguntas[idxP].options || [])];
    if (options.length >= MAX_OPCIONES) return;
    actualizar(idxP, { options: [...options, ""] });
  };

  const eliminarOpcion = (idxP, idxO) => {
    const options = (preguntas[idxP].options || []).filter(
      (_, i) => i !== idxO,
    );
    actualizar(idxP, { options });
  };

  const aplicarPlantilla = (plantilla) => {
    // Re-derivar keys por si el usuario ya tenía preguntas propias
    onChange(
      plantilla.preguntas.map((p) => ({
        placeholder: "",
        hint: "",
        options: [],
        ...p,
      })),
    );
    setVerPlantillas(false);
    setExpandida(null);
  };

  /* ── Estilos compartidos ── */

  const inputCls =
    "w-full bg-gray-50/80 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white outline-none transition-all";
  const labelCls =
    "block text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1.5";

  /* ── Render ── */

  return (
    <div className="space-y-3">
      {/* Encabezado */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-gray-700">
            Preguntas de la encuesta
            <span className="ml-1.5 text-[10px] font-normal text-gray-400">
              {preguntas.length}/{MAX_PREGUNTAS}
            </span>
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            Esto es lo que verá el cliente al abrir el link.
          </p>
        </div>
        {mostrarPlantillas && (
          <button
            type="button"
            onClick={() => setVerPlantillas((v) => !v)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-[11px] font-semibold text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors shrink-0"
          >
            <i className="bx bx-layer mr-1" />
            Usar plantilla
          </button>
        )}
      </div>

      {/* Selector de plantillas */}
      {verPlantillas && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200">
          {PLANTILLAS_PREGUNTAS.map((pl) => (
            <button
              key={pl.id}
              type="button"
              onClick={() => aplicarPlantilla(pl)}
              className="text-left p-3 rounded-lg bg-white border border-gray-200 hover:border-blue-400 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-2 mb-1">
                <i className={`bx ${pl.icon} text-blue-500`} />
                <span className="text-xs font-bold text-gray-800">
                  {pl.nombre}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                {pl.descripcion}
              </p>
              {pl.preguntas.length > 0 && (
                <span className="inline-block mt-1.5 text-[9px] text-blue-500 font-semibold">
                  {pl.preguntas.length} preguntas
                </span>
              )}
            </button>
          ))}
          <p className="col-span-full text-[10px] text-amber-600 flex items-center gap-1 pt-1">
            <i className="bx bx-error-circle" />
            Aplicar una plantilla reemplaza las preguntas que tengas ahora.
          </p>
        </div>
      )}

      {/* Lista vacía */}
      {preguntas.length === 0 && !verPlantillas && (
        <div className="text-center py-8 rounded-xl border border-dashed border-gray-300 bg-gray-50/50">
          <i className="bx bx-list-plus text-3xl text-gray-300" />
          <p className="text-xs text-gray-400 mt-1.5">
            Todavía no hay preguntas.
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            Agrega una o parte de una plantilla.
          </p>
        </div>
      )}

      {/* Preguntas */}
      {preguntas.map((p, idx) => {
        const abierta = expandida === idx;
        const cfgTipo = TIPOS_PREGUNTA[p.type] || TIPOS_PREGUNTA.text;
        const conOpciones = TIPOS_CON_OPCIONES.includes(p.type);
        const sinLabel = !p.label?.trim();

        return (
          <div
            key={idx}
            className={`rounded-xl border bg-white transition-all ${
              abierta
                ? "border-blue-300 shadow-sm ring-1 ring-blue-100"
                : sinLabel
                  ? "border-amber-200"
                  : "border-gray-200 hover:border-gray-300"
            }`}
          >
            {/* Fila resumen */}
            <div className="flex items-center gap-2 px-3 py-2.5">
              <span className="w-6 h-6 rounded-md bg-gray-100 text-gray-500 text-[10px] font-bold flex items-center justify-center shrink-0">
                {idx + 1}
              </span>

              <button
                type="button"
                onClick={() => setExpandida(abierta ? null : idx)}
                className="flex-1 min-w-0 text-left"
              >
                <p
                  className={`text-xs font-semibold truncate ${
                    sinLabel ? "text-amber-500 italic" : "text-gray-800"
                  }`}
                >
                  {p.label?.trim() || "Pregunta sin enunciado"}
                  {p.required && (
                    <span className="text-red-400 ml-1" title="Obligatoria">
                      *
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                  <i className={`bx ${cfgTipo.icon}`} />
                  {cfgTipo.label}
                  {conOpciones && (
                    <span className="text-gray-300">
                      · {(p.options || []).filter(Boolean).length} opciones
                    </span>
                  )}
                </p>
              </button>

              {/* Acciones */}
              <div className="flex items-center gap-0.5 shrink-0">
                <IconBtn
                  icon="bx-chevron-up"
                  title="Subir"
                  disabled={idx === 0}
                  onClick={() => mover(idx, -1)}
                />
                <IconBtn
                  icon="bx-chevron-down"
                  title="Bajar"
                  disabled={idx === preguntas.length - 1}
                  onClick={() => mover(idx, 1)}
                />
                <IconBtn
                  icon="bx-copy"
                  title="Duplicar"
                  disabled={preguntas.length >= MAX_PREGUNTAS}
                  onClick={() => duplicar(idx)}
                />
                <IconBtn
                  icon="bx-trash"
                  title="Eliminar"
                  danger
                  onClick={() => eliminar(idx)}
                />
                <IconBtn
                  icon={abierta ? "bx-chevron-up" : "bx-edit-alt"}
                  title={abierta ? "Cerrar" : "Editar"}
                  onClick={() => setExpandida(abierta ? null : idx)}
                />
              </div>
            </div>

            {/* Detalle editable */}
            {abierta && (
              <div className="px-3 pb-3 pt-1 border-t border-gray-100 space-y-3">
                <div>
                  <label className={labelCls}>Enunciado de la pregunta</label>
                  <input
                    value={p.label}
                    onChange={(e) => actualizar(idx, { label: e.target.value })}
                    className={inputCls}
                    placeholder="Ej: ¿Cuál es tu presupuesto de importación?"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Tipo de respuesta</label>
                    <select
                      value={p.type}
                      onChange={(e) => cambiarTipo(idx, e.target.value)}
                      className={`${inputCls} bg-white`}
                    >
                      {Object.entries(TIPOS_PREGUNTA).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-[9px] text-gray-400 mt-1 leading-relaxed">
                      {cfgTipo.descripcion}
                    </p>
                  </div>

                  <div>
                    <label className={labelCls}>¿Es obligatoria?</label>
                    <button
                      type="button"
                      onClick={() => actualizar(idx, { required: !p.required })}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all ${
                        p.required
                          ? "bg-red-50/60 border-red-200"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <span
                        className={`relative w-9 h-5 rounded-full transition-all shrink-0 ${
                          p.required ? "bg-red-400" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                            p.required ? "translate-x-4" : ""
                          }`}
                        />
                      </span>
                      <span className="text-xs text-gray-600">
                        {p.required
                          ? "No podrá enviar sin responder"
                          : "Puede saltarla"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Opciones */}
                {conOpciones && (
                  <div>
                    <label className={labelCls}>
                      Opciones ({(p.options || []).length}/{MAX_OPCIONES})
                    </label>
                    <div className="space-y-1.5">
                      {(p.options || []).map((op, idxO) => (
                        <div key={idxO} className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-300 w-4 text-right shrink-0">
                            {idxO + 1}
                          </span>
                          <input
                            value={op}
                            onChange={(e) =>
                              actualizarOpcion(idx, idxO, e.target.value)
                            }
                            className={`${inputCls} py-1.5 text-xs`}
                            placeholder={`Opción ${idxO + 1}`}
                          />
                          <IconBtn
                            icon="bx-x"
                            title="Quitar opción"
                            danger
                            disabled={(p.options || []).length <= 2}
                            onClick={() => eliminarOpcion(idx, idxO)}
                          />
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => agregarOpcion(idx)}
                      disabled={(p.options || []).length >= MAX_OPCIONES}
                      className="mt-2 text-[11px] font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <i className="bx bx-plus" /> Agregar opción
                    </button>
                  </div>
                )}

                {/* Placeholder */}
                {cfgTipo.tienePlaceholder && (
                  <div>
                    <label className={labelCls}>
                      Texto de ejemplo dentro del campo{" "}
                      <span className="normal-case text-gray-300">
                        (opcional)
                      </span>
                    </label>
                    <input
                      value={p.placeholder || ""}
                      onChange={(e) =>
                        actualizar(idx, { placeholder: e.target.value })
                      }
                      className={inputCls}
                      placeholder="Ej: audífonos bluetooth, ropa deportiva..."
                    />
                  </div>
                )}

                {/* Hint */}
                <div>
                  <label className={labelCls}>
                    Texto de ayuda bajo la pregunta{" "}
                    <span className="normal-case text-gray-300">
                      (opcional)
                    </span>
                  </label>
                  <input
                    value={p.hint || ""}
                    onChange={(e) => actualizar(idx, { hint: e.target.value })}
                    className={inputCls}
                    placeholder="Ej: Si aún no lo tienes claro, los productos en tendencia serían lo mejor."
                  />
                </div>

                <p className="text-[9px] text-gray-300 font-mono pt-1 border-t border-gray-100">
                  Identificador: {p.key}
                </p>
              </div>
            )}
          </div>
        );
      })}

      {/* Agregar */}
      {preguntas.length < MAX_PREGUNTAS && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {["text", "textarea", "radio", "checkbox", "rating_1_5"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => agregar(t)}
              className="px-3 py-2 rounded-lg border border-dashed border-gray-300 bg-white text-[11px] font-semibold text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/40 transition-all"
            >
              <i className={`bx ${TIPOS_PREGUNTA[t].icon} mr-1`} />
              {TIPOS_PREGUNTA[t].label}
            </button>
          ))}
        </div>
      )}

      {/* Errores */}
      {errores.length > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
          <p className="text-[11px] font-bold text-amber-700 mb-1 flex items-center gap-1">
            <i className="bx bx-error-circle" />
            Revisa antes de guardar
          </p>
          <ul className="space-y-0.5">
            {errores.map((e, i) => (
              <li key={i} className="text-[10px] text-amber-700 leading-relaxed">
                • {e}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function IconBtn({ icon, title, onClick, disabled, danger }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors disabled:opacity-25 disabled:cursor-not-allowed ${
        danger
          ? "text-gray-400 hover:text-red-500 hover:bg-red-50"
          : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
      }`}
    >
      <i className={`bx ${icon} text-sm`} />
    </button>
  );
}
