import { useState, useEffect, useRef, useCallback } from "react";
import chatApi from "../../api/chatcenter";
import { MetricasRespuesta, TextoRespuesta } from "./asistenteMetricas";

/**
 * AsistenteCuentaTablero — Asistente de la cuenta, variante "Tablero".
 *
 * Mismo backend que FloatingSupportChat (POST asistente_cuenta/preguntar),
 * pero pide formato "tablero": el modelo responde con una conclusión corta y
 * las cifras llegan en `datos` (resultado de cada herramienta), que aquí se
 * dibujan como KPIs, barras apiladas por estado y rankings.
 */

const WA_SUPPORT_NUMBER = "593998979214";

const PERIODOS = [
  { id: "hoy", label: "Hoy" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mes" },
  { id: "30d", label: "30 días" },
];

const ATAJOS = [
  { label: "Guías por estado", pregunta: "¿Cuántas guías tengo por estado?" },
  { label: "Más vendidos", pregunta: "¿Cuáles son mis productos más vendidos?" },
  { label: "Transportadoras", pregunta: "¿Qué transportadora me entrega mejor?" },
  { label: "Ciudades", pregunta: "¿En qué ciudades vendo más?" },
  { label: "Estado exacto", pregunta: "¿Cuántas guías tengo por estado exacto de la transportadora?" },
];

/* ─── Componente ─── */
export default function AsistenteCuentaTablero({
  idConfiguracion: propIdConf,
  bottomClass,
  position = "right",
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [periodo, setPeriodo] = useState("mes");

  const bodyRef = useRef(null);
  const inputRef = useRef(null);
  const chatRef = useRef(null);

  const idConf =
    propIdConf ||
    parseInt(localStorage.getItem("id_configuracion"), 10) ||
    null;
  const nombreCuenta = localStorage.getItem("nombre_configuracion") || "";

  const isLeft = position === "left";
  const sideClass = isLeft ? "left-6" : "right-6";
  const originClass = isLeft ? "origin-bottom-left" : "origin-bottom-right";
  const fabBottom = bottomClass || "bottom-6";
  const panelBottom = bottomClass ? "bottom-40" : "bottom-24";

  useEffect(() => {
    setMessages([]);
    setInput("");
  }, [idConf]);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if (open && chatRef.current && !chatRef.current.contains(e.target)) {
        const fab = document.getElementById("support-fab");
        if (fab && fab.contains(e.target)) return;
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const enviar = useCallback(
    async (texto) => {
      const text = (texto ?? input).trim();
      if (!text || loading || !idConf) return;

      const newMessages = [...messages, { role: "user", content: text }];
      setMessages(newMessages);
      setInput("");
      setLoading(true);

      try {
        const res = await chatApi.post("asistente_cuenta/preguntar", {
          id_configuracion: idConf,
          periodo,
          formato: "tablero",
          messages: newMessages
            .filter((m) => !m.error)
            .map((m) => ({ role: m.role, content: m.content })),
        });
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: res.data?.respuesta || "",
            datos: Array.isArray(res.data?.datos) ? res.data.datos : [],
          },
        ]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            error: true,
            content:
              err.response?.data?.message ||
              "Error al consultar. Intenta nuevamente.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, messages, loading, idConf, periodo],
  );

  const reiniciar = () => {
    setMessages([]);
    setInput("");
    inputRef.current?.focus();
  };

  const irAsesor = () => {
    const contexto = messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join(". ");
    const texto = contexto
      ? `Hola, necesito ayuda con: ${contexto}`
      : "Hola, necesito ayuda con la plataforma ImporChat";
    window.open(`https://wa.me/${WA_SUPPORT_NUMBER}?text=${encodeURIComponent(texto)}`, "_blank");
  };

  if (!idConf) return null;

  const vacio = messages.length === 0;

  return (
    <>
      <button
        id="support-fab"
        onClick={() => setOpen((v) => !v)}
        className={`fixed ${fabBottom} ${sideClass} z-50 grid h-14 w-14 place-items-center rounded-full
             bg-cyan-700 text-white shadow-[0_12px_26px_rgba(14,116,144,0.4)]
             transition-all duration-200 hover:-translate-y-0.5 hover:bg-cyan-800
             focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2`}
        aria-label={open ? "Cerrar métricas de tu cuenta" : "Abrir métricas de tu cuenta"}
        aria-expanded={open}
      >
        <i className={`bx ${open ? "bx-x" : "bx-bar-chart-alt-2"} text-2xl`} />
      </button>

      <div
        ref={chatRef}
        role="dialog"
        aria-label="Métricas de tu cuenta"
        className={`fixed ${panelBottom} ${sideClass} z-50 flex w-[400px] max-w-[calc(100vw-2rem)] flex-col
               overflow-hidden rounded-[20px] bg-[#f6f8fb] text-[#102033]
               shadow-[0_28px_60px_-22px_rgba(10,22,40,0.45)] ring-1 ring-[#dfe5ec]
               transition-all duration-300 ${originClass}
               ${open ? "scale-100 opacity-100 pointer-events-auto" : "scale-90 opacity-0 pointer-events-none"}`}
        style={{ height: "min(620px, calc(100vh - 8rem))" }}
      >
        {/* Cabecera */}
        <div className="flex-shrink-0 bg-[#0a1628] px-4 pb-3 pt-3.5 text-white">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-400/15 text-cyan-300">
              <i className="bx bx-bar-chart-alt-2 text-xl" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="m-0 text-sm font-semibold leading-tight">Métricas de tu cuenta</p>
              {nombreCuenta && (
                <p className="m-0 truncate text-[12px] text-slate-400">{nombreCuenta}</p>
              )}
            </div>
            {!vacio && (
              <button
                onClick={reiniciar}
                disabled={loading}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
                title="Nueva conversación"
              >
                <i className="bx bx-refresh text-xl" />
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              title="Cerrar"
            >
              <i className="bx bx-x text-xl" />
            </button>
          </div>

          <div
            className="mt-3 grid grid-cols-4 gap-0.5 rounded-[10px] bg-white/[0.08] p-[3px]"
            role="group"
            aria-label="Periodo de las consultas"
          >
            {PERIODOS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriodo(p.id)}
                aria-pressed={periodo === p.id}
                className={`rounded-lg py-1 text-[12.5px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                  periodo === p.id
                    ? "bg-white font-semibold text-[#0a1628]"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversación */}
        <div ref={bodyRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3.5">
          {vacio && (
            <section className="grid gap-3 rounded-2xl border border-[#e3e8ee] bg-white p-4">
              <div>
                <p className="m-0 text-[17px] font-bold leading-tight text-[#0a1628]">
                  {nombreCuenta ? `Hola, ${nombreCuenta}` : "Hola"}
                </p>
                <p className="m-0 mt-1 text-[13px] leading-relaxed text-slate-500">
                  Elige un atajo o escribe tu pregunta. Uso el periodo que marcaste arriba si no nombras otro.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {ATAJOS.slice(0, 4).map((a) => (
                  <button
                    key={a.label}
                    onClick={() => enviar(a.pregunta)}
                    className="rounded-xl bg-slate-50 px-3 py-2.5 text-left text-[13px] font-medium text-[#0a1628] transition-colors hover:bg-cyan-50 hover:text-cyan-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600"
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </section>
          )}

          {messages.map((msg, i) => {
            if (msg.role === "user") {
              return (
                <div
                  key={i}
                  className="max-w-[80%] self-end break-words rounded-xl bg-cyan-700 px-3 py-2 text-[13.5px] leading-snug text-white"
                >
                  {msg.content}
                </div>
              );
            }
            if (msg.error) {
              return (
                <p key={i} className="m-0 rounded-xl bg-amber-50 px-3 py-2 text-[13px] leading-relaxed text-amber-800">
                  {msg.content}
                </p>
              );
            }
            return (
              <div key={i} className="grid gap-2.5">
                <MetricasRespuesta datos={msg.datos} />
                {msg.content && (
                  <div className="grid gap-1 px-1 text-[13.5px] leading-relaxed text-[#243446]">
                    <TextoRespuesta texto={msg.content} />
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <section className="grid gap-2.5 rounded-2xl border border-[#e3e8ee] bg-white p-3.5" aria-label="Consultando">
              <div className="h-2.5 w-32 animate-pulse rounded bg-slate-200" />
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((k) => (
                  <div key={k} className="h-12 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
              <div className="h-3 animate-pulse rounded bg-slate-100" />
            </section>
          )}
        </div>

        {/* Atajos + entrada */}
        <div className="flex-shrink-0 border-t border-[#e3e8ee] bg-white">
          {!vacio && (
            <div className="flex gap-1.5 overflow-x-auto px-3 pt-2.5 [scrollbar-width:none]">
              {ATAJOS.map((a) => (
                <button
                  key={a.label}
                  onClick={() => enviar(a.pregunta)}
                  disabled={loading}
                  className="whitespace-nowrap rounded-lg border border-[#dfe5ec] bg-white px-2.5 py-1 text-[12.5px] text-[#0a1628] transition-colors hover:border-cyan-700 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600"
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviar();
            }}
            className="flex gap-2 px-3 pb-2 pt-2.5"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              maxLength={1500}
              onChange={(e) => setInput(e.target.value)}
              placeholder="¿Qué quieres saber?"
              aria-label="Pregunta sobre tus métricas"
              className="min-w-0 flex-1 rounded-[10px] border border-[#dfe5ec] px-3 py-2 text-sm text-[#102033] placeholder-slate-400 outline-none transition-colors focus:border-cyan-700 focus:ring-0"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="rounded-[10px] bg-[#0a1628] px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#13233a] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              Preguntar
            </button>
          </form>
          <div className="flex items-center justify-between px-4 pb-2 text-[11px] text-slate-400">
            <span>Datos sincronizados de Dropi y Aliclik</span>
            <button
              type="button"
              onClick={irAsesor}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-slate-500 transition-colors hover:bg-green-50 hover:text-green-700"
            >
              <i className="bx bxl-whatsapp text-sm" />
              Asesor
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
