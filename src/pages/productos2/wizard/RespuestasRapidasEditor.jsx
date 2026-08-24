// src/pages/productos2/wizard/RespuestasRapidasEditor.jsx
// Editor de las respuestas quemadas del producto: pregunta, respuesta y las
// palabras clave que la identifican. Trae un probador que consulta al backend
// la misma función que usa el bot en vivo ("¿qué haría con este mensaje?").
import React, { useState } from "react";
import chatApi from "../../../api/chatcenter";

const DECISION_TXT = {
  solo_paquete:
    "Mensaje genérico (saludo / quiero info): solo sale el paquete fijo, sin IA.",
  ia_cierre: "Intención de compra: sigue la IA para tomar el pedido.",
  respuesta_rapida: "Calza con una respuesta rápida: se manda esa, sin IA.",
  ia: "No calza con ninguna rápida: sigue la IA con la ficha del producto.",
};

function ChipsClaves({ claves, onChange }) {
  const [nueva, setNueva] = useState("");
  const agregar = () => {
    const v = nueva.trim().toLowerCase();
    if (!v) return;
    if (!claves.includes(v)) onChange([...claves, v]);
    setNueva("");
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {claves.map((c, i) => (
        <span
          key={`${c}-${i}`}
          className="inline-flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 px-2 py-0.5 text-[11px] font-medium"
        >
          {c}
          <button
            type="button"
            className="hover:text-rose-600"
            onClick={() => onChange(claves.filter((_, k) => k !== i))}
            title="Quitar"
          >
            <i className="bx bx-x" />
          </button>
        </span>
      ))}
      <input
        value={nueva}
        onChange={(e) => setNueva(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            agregar();
          }
        }}
        onBlur={agregar}
        placeholder="+ clave"
        className="w-24 rounded-md border border-dashed border-slate-300 px-2 py-0.5 text-[11px] focus:outline-none focus:border-indigo-400"
      />
    </div>
  );
}

export default function RespuestasRapidasEditor({
  value = [],
  onChange,
  activas = true,
  onToggleActivas,
}) {
  const [probando, setProbando] = useState(false);
  const [mensajePrueba, setMensajePrueba] = useState("");
  const [resultado, setResultado] = useState(null);

  const actualizar = (i, patch) => {
    onChange(value.map((f, k) => (k === i ? { ...f, ...patch } : f)));
  };
  const quitar = (i) => onChange(value.filter((_, k) => k !== i));
  const agregar = () =>
    onChange([
      ...value,
      { pregunta: "", respuesta: "", claves: [], activa: 1 },
    ]);

  const probar = async () => {
    if (!mensajePrueba.trim()) return;
    setProbando(true);
    setResultado(null);
    try {
      const { data } = await chatApi.post(
        "/producto-wizard/probar-respuesta",
        { mensaje: mensajePrueba, respuestas_rapidas: value },
        { silentError: true },
      );
      setResultado(data?.data || null);
    } catch {
      setResultado({ decision: "error" });
    } finally {
      setProbando(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-800">
            Respuestas rápidas del producto
          </div>
          <p className="text-[12px] text-slate-500 leading-snug">
            Si el cliente pregunta algo que está aquí, el bot responde con el texto
            tal cual, sin gastar tokens. Las <b>claves</b> son las palabras que
            identifican cada pregunta: cuanto más específicas, menos se confunde.
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-600 shrink-0 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={Boolean(activas)}
            onChange={(e) => onToggleActivas?.(e.target.checked)}
            className="h-4 w-4 accent-indigo-600"
          />
          Usar en vivo
        </label>
      </div>

      {value.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-xs text-slate-500">
          Todavía no hay respuestas rápidas. Genéralas con “Completar con IA”
          (arriba) o agrega las tuyas.
        </div>
      ) : null}

      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
        {value.map((f, i) => (
          <div
            key={i}
            className={`rounded-xl border p-3 space-y-2 ${
              f.activa === 0
                ? "border-slate-200 bg-slate-50 opacity-70"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400 w-5">
                {i + 1}.
              </span>
              <input
                value={f.pregunta}
                onChange={(e) => actualizar(i, { pregunta: e.target.value })}
                placeholder="¿Pregunta del cliente?"
                className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <button
                type="button"
                title={f.activa === 0 ? "Activar" : "Pausar"}
                onClick={() => actualizar(i, { activa: f.activa === 0 ? 1 : 0 })}
                className={`h-7 w-7 rounded-lg text-base flex items-center justify-center ${
                  f.activa === 0
                    ? "text-slate-400 hover:text-emerald-600"
                    : "text-emerald-600 hover:bg-emerald-50"
                }`}
              >
                <i className={`bx ${f.activa === 0 ? "bx-play" : "bx-pause"}`} />
              </button>
              <button
                type="button"
                title="Eliminar"
                onClick={() => quitar(i)}
                className="h-7 w-7 rounded-lg text-rose-500 hover:bg-rose-50 flex items-center justify-center"
              >
                <i className="bx bx-trash" />
              </button>
            </div>
            <textarea
              value={f.respuesta}
              onChange={(e) => actualizar(i, { respuesta: e.target.value })}
              placeholder="Respuesta lista para enviar tal cual"
              rows={2}
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-y"
            />
            <ChipsClaves
              claves={Array.isArray(f.claves) ? f.claves : []}
              onChange={(claves) => actualizar(i, { claves })}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={agregar}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-indigo-400 hover:text-indigo-700"
      >
        <i className="bx bx-plus" /> Agregar respuesta
      </button>

      <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2">
        <div className="text-[12px] font-semibold text-slate-700">
          Prueba qué haría el bot
        </div>
        <div className="flex gap-2">
          <input
            value={mensajePrueba}
            onChange={(e) => setMensajePrueba(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && probar()}
            placeholder='Ej: "¿cuánto demora en llegar?"'
            className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <button
            type="button"
            onClick={probar}
            disabled={probando || !mensajePrueba.trim()}
            className="rounded-lg bg-[#171931] text-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            {probando ? "…" : "Probar"}
          </button>
        </div>
        {resultado ? (
          <div className="text-[12px] text-slate-700">
            <span
              className={`inline-block rounded px-1.5 py-0.5 font-mono text-[11px] mr-2 ${
                resultado.decision === "respuesta_rapida"
                  ? "bg-emerald-100 text-emerald-800"
                  : resultado.decision === "solo_paquete"
                    ? "bg-sky-100 text-sky-800"
                    : "bg-amber-100 text-amber-800"
              }`}
            >
              {resultado.decision}
            </span>
            {DECISION_TXT[resultado.decision] || "No se pudo probar."}
            {resultado.respuesta ? (
              <div className="mt-1 rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 whitespace-pre-line">
                <b>#{(resultado.indice ?? 0) + 1}</b> {resultado.respuesta.respuesta}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
