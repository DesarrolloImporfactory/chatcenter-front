// src/pages/productos2/wizard/FlujoVentaEditor.jsx
// "Embudo manual": el flujo de venta por pasos del producto.
// Cada paso encadena con el anterior: "si el cliente responde X a la pregunta
// anterior, se envía este mensaje tal cual" — copys exactos, casi sin IA.
// El array guardado puede traer una entrada especial espera:'venta_realizada'
// (el mensaje final con imagen al cerrar la venta); acá se edita aparte y el
// runtime la lee aparte — nunca cuenta como paso de la secuencia.
import React, { useEffect, useRef, useState } from "react";
import chatApi from "../../../api/chatcenter";

const ESPERAS = [
  { value: "edad", label: "una EDAD", icon: "bx-calendar", hint: "un número dentro del rango" },
  { value: "ciudad", label: "su CIUDAD", icon: "bx-map", hint: "ciudad o provincia" },
  { value: "opcion", label: "una OPCIÓN", icon: "bx-list-check", hint: "promoción, tipo de envío…" },
  { value: "libre", label: "lo que sea", icon: "bx-message-dots", hint: "cualquier respuesta" },
];

const PASO_NUEVO = {
  espera: "ciudad",
  copy: "",
  pregunta: "",
  media: [],
  casos: [],
};

const NAVY = "#171931";

const taCls =
  "w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-emerald-200 resize-y";
const inCls =
  "rounded-lg border border-slate-200 px-2.5 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-emerald-200";

function Chips({ items, onChange, placeholder = "+ clave" }) {
  const [nueva, setNueva] = useState("");
  const agregar = () => {
    const v = nueva.trim().toLowerCase();
    if (!v) return;
    if (!items.includes(v)) onChange([...items, v]);
    setNueva("");
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map((c, i) => (
        <span
          key={`${c}-${i}`}
          className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 px-2 py-0.5 text-[11px] font-medium"
        >
          {c}
          <button
            type="button"
            className="hover:text-rose-600"
            onClick={() => onChange(items.filter((_, k) => k !== i))}
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
        placeholder={placeholder}
        className="w-28 rounded-md border border-dashed border-slate-300 px-2 py-0.5 text-[11px] focus:outline-none focus:border-emerald-400"
      />
    </div>
  );
}

/* Selector de qué espera el paso: botones segmentados, no un <select>. */
function SelectorEspera({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ESPERAS.map((o) => {
        const activo = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            title={o.hint}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold border transition ${
              activo
                ? "bg-[#171931] text-white border-[#171931] shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
            }`}
          >
            <i className={`bx ${o.icon}`} />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* Fotos/videos: se SUBEN aquí mismo (mismo endpoint que la multimedia del
   wizard) o se toca una de las ya subidas. Salen antes del texto. */
function MediaDelPaso({ urls, onChange, disponibles, idConfiguracion, titulo }) {
  const inputRef = useRef(null);
  const [subiendo, setSubiendo] = useState(false);

  const agregar = (u) => {
    const v = String(u || "").trim();
    if (!/^https?:\/\//i.test(v) || urls.includes(v)) return;
    onChange([...urls, v].slice(0, 4));
  };

  const subir = async (files) => {
    const lista = Array.from(files || []);
    if (!lista.length) return;
    setSubiendo(true);
    try {
      for (const file of lista) {
        const fd = new FormData();
        fd.append("archivo", file);
        fd.append("id_configuracion", String(idConfiguracion));
        const { data } = await chatApi.post("/producto-wizard/subir-media", fd, {
          headers: { "Content-Type": "multipart/form-data" },
          silentError: true,
        });
        if (data?.data?.url) agregar(data.data.url);
      }
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {titulo || "Fotos / videos que acompañan este mensaje (salen antes del texto)"}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {urls.map((u, i) => (
          <span
            key={u}
            className="relative h-12 w-12 rounded-lg overflow-hidden ring-1 ring-emerald-300 group"
            title={u}
          >
            {/\.(mp4|mov|3gp)(\?|$)/i.test(u) ? (
              <span className="flex h-full w-full items-center justify-center bg-slate-800 text-white">
                <i className="bx bx-play" />
              </span>
            ) : (
              <img src={u} alt="" className="h-full w-full object-cover" />
            )}
            <button
              type="button"
              title="Quitar"
              onClick={() => onChange(urls.filter((_, k) => k !== i))}
              className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/50 text-white"
            >
              <i className="bx bx-trash" />
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={subiendo || urls.length >= 4}
          className="h-12 w-12 rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-emerald-400 hover:text-emerald-600 flex items-center justify-center disabled:opacity-40"
          title="Subir foto o video"
        >
          <i className={`bx ${subiendo ? "bx-loader-alt bx-spin" : "bx-plus"} text-xl`} />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/mp4"
          multiple
          hidden
          onChange={(e) => subir(e.target.files)}
        />
        {disponibles.length ? (
          <>
            <span className="text-[11px] text-slate-400 ml-1">
              o toca una del producto:
            </span>
            {disponibles.map((m) => (
              <button
                key={m.url}
                type="button"
                title="Usar aquí"
                onClick={() => agregar(m.url)}
                disabled={urls.includes(m.url)}
                className="h-9 w-9 rounded-md overflow-hidden ring-1 ring-slate-200 hover:ring-emerald-400 disabled:opacity-30"
              >
                {m.tipo === "video" ? (
                  <span className="flex h-full w-full items-center justify-center bg-slate-800 text-white">
                    <i className="bx bx-play" />
                  </span>
                ) : (
                  <img src={m.url} alt="" className="h-full w-full object-cover" />
                )}
              </button>
            ))}
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function FlujoVentaEditor({
  value = [],
  onChange,
  activo = false,
  onToggleActivo,
  mediaDisponible = [],
  idConfiguracion,
  idProducto = null,
}) {
  const todos = Array.isArray(value) ? value : [];

  /* Productos de la cuenta con bot listo, para el selector "derivar a otro
     producto" del paso edad. Se cargan al necesitarse (foco en el selector o
     un paso que ya trae alterno configurado). */
  const [productosCuenta, setProductosCuenta] = useState(null);
  const cargarProductos = async () => {
    if (productosCuenta) return;
    try {
      const { data } = await chatApi.post(
        "/producto-wizard/listar",
        { id_configuracion: idConfiguracion },
        { silentError: true },
      );
      const lista = (Array.isArray(data?.data) ? data.data : []).filter(
        (pr) =>
          Number(pr.wizard_completado) === 1 &&
          Number(pr.activo) === 1 &&
          Number(pr.id) !== Number(idProducto),
      );
      setProductosCuenta(lista);
    } catch {
      setProductosCuenta([]);
    }
  };
  useEffect(() => {
    if (todos.some((p) => Number(p?.id_producto_alterno) > 0)) {
      cargarProductos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // La entrada de venta realizada se edita aparte; nunca es un "paso".
  const pasos = todos.filter((p) => p?.espera !== "venta_realizada");
  const finVenta = todos.find((p) => p?.espera === "venta_realizada") || null;

  const emitir = (nuevosPasos, nuevoFin = finVenta) =>
    onChange([...nuevosPasos, ...(nuevoFin ? [nuevoFin] : [])]);

  const actualizar = (i, patch) =>
    emitir(pasos.map((p, k) => (k === i ? { ...p, ...patch } : p)));
  const quitar = (i) => emitir(pasos.filter((_, k) => k !== i));
  const mover = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= pasos.length) return;
    const copia = [...pasos];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    emitir(copia);
  };
  const agregar = () => emitir([...pasos, { ...PASO_NUEVO }]);

  const setFin = (patch) =>
    emitir(pasos, { espera: "venta_realizada", copy: "", media: [], ...finVenta, ...patch });

  const actualizarOpcion = (i, k, patch) =>
    actualizar(i, {
      opciones: (pasos[i].opciones || []).map((o, x) =>
        x === k ? { ...o, ...patch } : o,
      ),
    });

  const actualizarCaso = (i, k, patch) =>
    actualizar(i, {
      casos: (pasos[i].casos || []).map((c, x) =>
        x === k ? { ...c, ...patch } : c,
      ),
    });

  return (
    <div className="rounded-2xl border border-slate-300 bg-white overflow-hidden shadow-sm">
      {/* Cabecera en el navy de la casa: esto es OTRO modo de vender */}
      <div
        className="px-4 py-3 flex items-start justify-between gap-3"
        style={{ background: `linear-gradient(100deg, ${NAVY}, #232647)` }}
      >
        <div className="text-white">
          <div className="text-sm font-bold flex items-center gap-2">
            <i className="bx bx-git-branch text-lg text-emerald-400" />
            Embudo manual · Flujo de venta por pasos
            <span className="rounded bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 text-[10px] font-bold tracking-wide">
              SIN IA
            </span>
          </div>
          <p className="text-[12px] text-slate-300 leading-snug mt-0.5">
            Tu guion con copys exactos: si el cliente responde la pregunta con
            la que termina tu PRIMER MENSAJE, el embudo lo lleva paso a paso
            hasta la compra.
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-white shrink-0 cursor-pointer select-none bg-white/10 rounded-lg px-2.5 py-1.5 ring-1 ring-white/20">
          <input
            type="checkbox"
            checked={Boolean(activo)}
            onChange={(e) => onToggleActivo?.(e.target.checked)}
            className="h-4 w-4 accent-emerald-500"
          />
          Usar en vivo
        </label>
      </div>

      <div className="p-4 space-y-3 bg-slate-50/60">
        <div className="flex items-start gap-1.5 rounded-lg bg-white border border-slate-200 px-2.5 py-2 text-[11.5px] text-slate-600 leading-snug">
          <i className="bx bx-info-circle mt-0.5 text-emerald-600" />
          <span>
            Es <b>independiente</b> de lo que llenaste arriba: las respuestas
            rápidas y la IA solo entran cuando el cliente <b>se desvía</b> con
            otra pregunta — la responden y <b>retoman tu embudo</b> con la
            pregunta del paso. Al terminar el último paso, la IA toma los datos
            y cierra el pedido.
          </span>
        </div>

        {pasos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-center text-xs text-slate-500">
            Sin pasos todavía. El <b>paso 1</b> espera lo que el cliente
            responda a la pregunta de tu primer mensaje (ej. la edad); cada
            paso siguiente espera la respuesta al mensaje anterior.
          </div>
        ) : null}

        <div className="space-y-3">
          {pasos.map((p, i) => {
            const esOpcion = p.espera === "opcion";
            return (
              <div
                key={i}
                className="rounded-xl border border-slate-200 bg-white p-3 space-y-2.5 shadow-sm"
              >
                <div className="flex items-start gap-2 flex-wrap">
                  <span
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full text-white text-[11px] font-bold shrink-0 mt-1"
                    style={{ background: NAVY }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-[260px]">
                    <div className="text-[12.5px] text-slate-700 mb-1.5">
                      Si a{" "}
                      <b>
                        {i === 0
                          ? "la pregunta de tu PRIMER MENSAJE"
                          : `la pregunta del paso ${i}`}
                      </b>{" "}
                      el cliente responde…
                    </div>
                    <SelectorEspera
                      value={p.espera}
                      onChange={(espera) => actualizar(i, { espera })}
                    />
                  </div>
                  <div className="flex items-center ml-auto">
                    <button
                      type="button"
                      title="Subir"
                      onClick={() => mover(i, -1)}
                      className="h-7 w-7 rounded-lg text-slate-500 hover:bg-slate-100 flex items-center justify-center"
                    >
                      <i className="bx bx-up-arrow-alt" />
                    </button>
                    <button
                      type="button"
                      title="Bajar"
                      onClick={() => mover(i, 1)}
                      className="h-7 w-7 rounded-lg text-slate-500 hover:bg-slate-100 flex items-center justify-center"
                    >
                      <i className="bx bx-down-arrow-alt" />
                    </button>
                    <button
                      type="button"
                      title="Eliminar paso"
                      onClick={() => quitar(i)}
                      className="h-7 w-7 rounded-lg text-rose-500 hover:bg-rose-50 flex items-center justify-center"
                    >
                      <i className="bx bx-trash" />
                    </button>
                  </div>
                </div>

                {p.espera === "edad" ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-[12px] text-slate-600">
                    Cuenta como “responde bien” una edad entre
                    <input
                      type="number"
                      value={p.min ?? 10}
                      onChange={(e) =>
                        actualizar(i, { min: Number(e.target.value) })
                      }
                      className={`${inCls} w-20`}
                    />
                    y
                    <input
                      type="number"
                      value={p.max ?? 22}
                      onChange={(e) =>
                        actualizar(i, { max: Number(e.target.value) })
                      }
                      className={`${inCls} w-20`}
                    />
                    años
                  </div>
                ) : null}

                {esOpcion ? (
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                      <i className="bx bx-list-check" /> Opciones — cada una con
                      su mensaje de respuesta
                    </div>
                    {(p.opciones || []).map((o, k) => (
                      <div
                        key={k}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-2 space-y-1.5"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500 shrink-0">
                            La elige escribiendo:
                          </span>
                          <div className="flex-1">
                            <Chips
                              items={Array.isArray(o.claves) ? o.claves : []}
                              onChange={(claves) =>
                                actualizarOpcion(i, k, { claves })
                              }
                              placeholder='+ ej. "domicilio"'
                            />
                          </div>
                          <button
                            type="button"
                            title="Quitar opción"
                            onClick={() =>
                              actualizar(i, {
                                opciones: (p.opciones || []).filter(
                                  (_, x) => x !== k,
                                ),
                              })
                            }
                            className="h-6 w-6 rounded text-rose-500 hover:bg-rose-50 flex items-center justify-center shrink-0"
                          >
                            <i className="bx bx-x" />
                          </button>
                        </div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          …y se le envía (tal cual):
                        </div>
                        <textarea
                          value={o.copy || ""}
                          onChange={(e) =>
                            actualizarOpcion(i, k, { copy: e.target.value })
                          }
                          rows={2}
                          placeholder={
                            String(p.copy || "").trim()
                              ? "Vacío = se envía el mensaje común del paso (abajo)"
                              : "El mensaje para esta opción"
                          }
                          className={taCls}
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        actualizar(i, {
                          opciones: [
                            ...(p.opciones || []),
                            { claves: [], copy: "" },
                          ],
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-emerald-400 hover:text-emerald-700"
                    >
                      <i className="bx bx-plus" /> Agregar opción
                    </button>

                    {/* El mensaje común vive plegado: visible solo si hace
                        falta, para que no quede un textarea vacío confundiendo */}
                    <details
                      open={Boolean(String(p.copy || "").trim())}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-2"
                    >
                      <summary className="cursor-pointer text-[11.5px] font-semibold text-slate-600 select-none">
                        Mensaje común para todas las opciones (opcional
                        {String(p.copy || "").trim() ? " · en uso" : ""})
                      </summary>
                      <textarea
                        value={p.copy || ""}
                        onChange={(e) => actualizar(i, { copy: e.target.value })}
                        rows={3}
                        placeholder="Si una opción no tiene su propio mensaje, se envía este"
                        className={`${taCls} mt-1.5`}
                      />
                    </details>
                  </div>
                ) : (
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 mb-1">
                      <i className="bx bx-send" /> …entonces se le envía (tal
                      cual):
                    </div>
                    <textarea
                      value={p.copy || ""}
                      onChange={(e) => actualizar(i, { copy: e.target.value })}
                      rows={4}
                      placeholder="Tu copy, tal cual quieres que le llegue al cliente"
                      className={taCls}
                    />
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Tip:{" "}
                      <code className="bg-slate-100 px-1 rounded">
                        {"{{respuesta}}"}
                      </code>{" "}
                      se reemplaza por lo que contestó (ej. “envíos GRATIS a
                      Quito”). Termina con la pregunta del paso siguiente.
                    </p>
                  </div>
                )}

                {p.espera === "edad" ? (
                  <div className="rounded-lg border border-sky-200 bg-sky-50/50 p-2.5 space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-sky-800">
                      Si la edad está FUERA del rango…
                    </div>
                    <textarea
                      value={p.copy_invalido || ""}
                      onChange={(e) =>
                        actualizar(i, { copy_invalido: e.target.value })
                      }
                      rows={2}
                      placeholder={
                        Number(p.id_producto_alterno) > 0
                          ? "Mensaje de presentación del otro producto (sale antes de su paquete)"
                          : "Despedida amable; el embudo se detiene. Vacío = responde la IA."
                      }
                      className={taCls}
                    />
                    <div>
                      <div className="text-[11px] font-semibold text-sky-800 mb-1">
                        …y ofrecer OTRO producto (opcional):
                      </div>
                      <select
                        value={p.id_producto_alterno || 0}
                        onFocus={cargarProductos}
                        onChange={(e) =>
                          actualizar(i, {
                            id_producto_alterno: Number(e.target.value) || 0,
                          })
                        }
                        className={`${inCls} w-full`}
                      >
                        <option value={0}>
                          — No derivar: solo el mensaje de arriba —
                        </option>
                        {(productosCuenta || []).map((pr) => (
                          <option key={pr.id} value={pr.id}>
                            {pr.nombre}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-sky-700/80 mt-1 leading-snug">
                        Se envía el mensaje de arriba como presentación + el
                        paquete del otro producto (su foto y su texto). Desde
                        ahí responden SUS respuestas rápidas y SU embudo — y si
                        su embudo también pide la edad y la que dio el cliente
                        le sirve, <b>no se la vuelve a preguntar</b>. Solo
                        aparecen productos con el bot ya activado.
                      </p>
                    </div>
                  </div>
                ) : null}

                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    Pregunta de este paso (el bot la repite si el cliente se
                    desvía)
                  </div>
                  <input
                    value={p.pregunta || ""}
                    onChange={(e) => actualizar(i, { pregunta: e.target.value })}
                    placeholder="Ej: ❓ ¿EN QUÉ CIUDAD SE ENCUENTRA? ❓"
                    className={`${inCls} w-full`}
                  />
                </div>

                <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 space-y-1.5">
                  <div className="text-[12px] text-slate-600 flex items-center gap-1.5">
                    <i className="bx bx-time-five text-slate-400 text-base" />
                    Tras recibir la respuesta del cliente,{" "}
                    <b>¿cuánto espera el bot antes de enviar este mensaje?</b>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { s: 0, l: "Al instante" },
                      { s: 5, l: "5 seg" },
                      { s: 15, l: "15 seg" },
                      { s: 45, l: "45 seg" },
                      { s: 60, l: "1 min" },
                      { s: 180, l: "3 min" },
                    ].map((o) => (
                      <button
                        key={o.s}
                        type="button"
                        onClick={() => actualizar(i, { retraso: o.s })}
                        className={`rounded-lg px-2.5 py-1 text-[11.5px] font-semibold border transition ${
                          (p.retraso ?? 0) === o.s
                            ? "bg-[#171931] text-white border-[#171931]"
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                        }`}
                      >
                        {o.l}
                      </button>
                    ))}
                    <span className="text-[11px] text-slate-400 ml-1">
                      u otro:
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={180}
                      value={p.retraso ?? 0}
                      onChange={(e) =>
                        actualizar(i, {
                          // Tope real: 3 minutos. Lo que se escriba de más se
                          // recorta aquí y otra vez en el backend.
                          retraso: Math.max(
                            0,
                            Math.min(180, Math.round(Number(e.target.value) || 0)),
                          ),
                        })
                      }
                      className={`${inCls} w-20`}
                    />
                    <span className="text-[11px] text-slate-500">seg</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Máximo 3 minutos (180 seg). Si el cliente escribe algo más
                    durante la espera, se le responde y el mensaje del paso
                    llega igual. En la vista previa no se espera.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Respuestas especiales de este paso (opcional)
                  </div>
                  {(p.casos || []).map((c, k) => (
                    <div
                      key={k}
                      className="rounded-lg border border-amber-200 bg-amber-50/60 p-2 space-y-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500 shrink-0">
                          Si su respuesta contiene:
                        </span>
                        <div className="flex-1">
                          <Chips
                            items={Array.isArray(c.contiene) ? c.contiene : []}
                            onChange={(contiene) =>
                              actualizarCaso(i, k, { contiene })
                            }
                            placeholder='+ ej. "ecuador"'
                          />
                        </div>
                        <button
                          type="button"
                          title="Quitar"
                          onClick={() =>
                            actualizar(i, {
                              casos: (p.casos || []).filter((_, x) => x !== k),
                            })
                          }
                          className="h-6 w-6 rounded text-rose-500 hover:bg-rose-50 flex items-center justify-center shrink-0"
                        >
                          <i className="bx bx-x" />
                        </button>
                      </div>
                      <textarea
                        value={c.copy || ""}
                        onChange={(e) =>
                          actualizarCaso(i, k, { copy: e.target.value })
                        }
                        rows={2}
                        placeholder='Se responde esto y se vuelve a esperar (no avanza). Ej: si dice "Ecuador", repreguntar la ciudad.'
                        className={taCls}
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      actualizar(i, {
                        casos: [...(p.casos || []), { contiene: [], copy: "" }],
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-emerald-400 hover:text-emerald-700"
                  >
                    <i className="bx bx-plus" /> Agregar respuesta especial
                  </button>
                </div>

                <MediaDelPaso
                  urls={Array.isArray(p.media) ? p.media : []}
                  onChange={(media) => actualizar(i, { media })}
                  disponibles={mediaDisponible.filter((m) => m?.url)}
                  idConfiguracion={idConfiguracion}
                />
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={agregar}
          className="inline-flex items-center gap-1.5 rounded-lg text-white px-3 py-1.5 text-xs font-semibold hover:opacity-90"
          style={{ background: NAVY }}
        >
          <i className="bx bx-plus" /> Agregar paso {pasos.length + 1}
        </button>

        {/* ── Final del embudo: mensaje de VENTA REALIZADA ── */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[13px] font-bold text-emerald-900 flex items-center gap-1.5">
                <i className="bx bx-flag-checkered" /> Venta realizada 🎉
                (mensaje final, opcional)
              </div>
              <p className="text-[11.5px] text-emerald-800/80 leading-snug">
                Cuando el bot ya tiene todos los datos y <b>cierra el pedido</b>,
                envía este mensaje con su imagen justo después del resumen —
                perfecto para el agradecimiento, el sorteo o el “envíanos tu
                foto”.
              </p>
            </div>
            {finVenta ? (
              <button
                type="button"
                title="Quitar el mensaje final"
                onClick={() => emitir(pasos, null)}
                className="h-7 w-7 rounded-lg text-rose-500 hover:bg-rose-50 flex items-center justify-center shrink-0"
              >
                <i className="bx bx-trash" />
              </button>
            ) : null}
          </div>
          <textarea
            value={finVenta?.copy || ""}
            onChange={(e) => setFin({ copy: e.target.value })}
            rows={4}
            placeholder="✨ ¡FELICIDADES! TU PEDIDO HA SIDO CONFIRMADO ✨ …"
            className={taCls}
          />
          <MediaDelPaso
            urls={Array.isArray(finVenta?.media) ? finVenta.media : []}
            onChange={(media) => setFin({ media })}
            disponibles={mediaDisponible.filter((m) => m?.url)}
            idConfiguracion={idConfiguracion}
            titulo="Imagen del mensaje final (sale antes del texto)"
          />
          <label className="flex items-start gap-2 rounded-lg bg-white border border-emerald-200 px-2.5 py-2 text-[12px] text-emerald-900 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={Number(finVenta?.ocultar_resumen) === 1}
              onChange={(e) =>
                setFin({ ocultar_resumen: e.target.checked ? 1 : 0 })
              }
              className="h-4 w-4 accent-emerald-600 mt-0.5"
            />
            <span>
              <b>No enviarle el resumen del pedido al cliente</b>: al cerrar la
              venta solo recibe este mensaje final. La orden automática a Dropi
              y el cambio de etapa se hacen igual — el resumen se procesa por
              dentro, solo deja de mostrarse en el chat.
            </span>
          </label>
        </div>

        <p className="flex items-start gap-1.5 rounded-lg bg-white border border-slate-200 px-2.5 py-2 text-[11.5px] text-slate-600 leading-snug">
          <i className="bx bx-test-tube mt-0.5 text-emerald-600" />
          <span>
            <b>Pruébalo</b> en el paso 3 (Vista previa) escribiendo como el
            cliente: verás cada copy salir “sin IA” y, al cerrar el pedido, el
            mensaje de venta realizada. Si el chat cambia de etapa en el
            kanban, el embudo se detiene solo.
          </span>
        </p>
      </div>
    </div>
  );
}
