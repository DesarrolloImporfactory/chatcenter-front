import { useEffect, useState } from "react";
import useLlamadaWhatsapp from "../../hooks/useLlamadaWhatsapp";

/**
 * Panel flotante de llamada de WhatsApp (abajo a la derecha, en toda la app).
 *
 * Estados: timbrando (contestar / rechazar), conectando, en curso (silenciar
 * / colgar, con cronómetro), la tomó otro asesor, finalizada. Lo alimenta
 * useLlamadaWhatsapp; el audio remoto sale por el <audio> oculto.
 */
const fmt = (seg) => {
  const s = Math.max(0, Math.floor(seg));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
};

const iniciales = (nombre) => {
  const partes = String(nombre || "").trim().split(/\s+/);
  if (!partes[0]) return "?";
  return ((partes[0][0] || "") + (partes[1]?.[0] || "")).toUpperCase();
};

function Cronometro({ desde }) {
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="tabular-nums">{fmt((ahora - desde) / 1000)}</span>;
}

const MOTIVO = {
  rejected: "Llamada rechazada",
  colgada: "Llamada finalizada",
  completed: "Llamada finalizada",
  missed: "Llamada perdida",
  sin_respuesta: "Nadie contestó",
  tomada: "La tomó otro asesor",
  rechazada_cliente: "El cliente no aceptó la llamada",
  error: "No se pudo conectar",
  failed: "La llamada falló",
  finalizada: "Llamada finalizada",
};

export default function LlamadaWhatsapp() {
  const {
    llamada,
    silenciado,
    audioRef,
    contestar,
    rechazar,
    colgar,
    alternarSilencio,
    descartar,
  } = useLlamadaWhatsapp();

  if (!llamada) return <audio ref={audioRef} autoPlay className="hidden" />;

  const { fase } = llamada;
  const timbrando = fase === "timbrando";
  const llamando = fase === "llamando";
  const enCurso = fase === "en_curso";
  const borde =
    timbrando
      ? "border-emerald-300 ring-4 ring-emerald-100"
      : enCurso
        ? "border-emerald-500"
        : fase === "tomada_por_otro"
          ? "border-amber-300"
          : "border-slate-200";

  return (
    <>
      <audio ref={audioRef} autoPlay className="hidden" />
      <div
        className={`fixed bottom-24 right-4 z-[90] w-[300px] rounded-2xl border bg-white p-4 shadow-2xl ${borde}`}
        role="dialog"
        aria-live="assertive"
      >
        {/* Quién llama */}
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div
              className={`h-12 w-12 rounded-full grid place-items-center text-sm font-bold text-white bg-gradient-to-br from-emerald-500 to-emerald-700 ${
                timbrando ? "animate-pulse" : ""
              }`}
            >
              {iniciales(llamada.nombre_cliente)}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 ring-2 ring-white">
              <i className="bx bxl-whatsapp text-[11px] text-white" />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-slate-900">
              {llamada.nombre_cliente || llamada.telefono}
            </div>
            <div className="truncate text-xs text-slate-500">
              {llamada.telefono ? `+${String(llamada.telefono).replace(/^\+/, "")}` : ""}
            </div>
            <div className="mt-0.5 text-[11px] font-semibold">
              {timbrando && (
                <span className="text-emerald-700">
                  <i className="bx bx-phone-call bx-tada" /> Llamada de WhatsApp entrante
                </span>
              )}
              {llamando && (
                <span className="text-emerald-700">
                  <i className="bx bx-phone-outgoing bx-tada" /> Llamando por WhatsApp…
                </span>
              )}
              {fase === "conectando" && (
                <span className="text-slate-600">
                  <i className="bx bx-loader-alt bx-spin" /> Conectando audio…
                </span>
              )}
              {enCurso && (
                <span className="text-emerald-700">
                  <i className="bx bx-phone" /> En llamada ·{" "}
                  <Cronometro desde={llamada.inicioCurso || Date.now()} />
                </span>
              )}
              {fase === "tomada_por_otro" && (
                <span className="text-amber-700">
                  <i className="bx bx-user-check" /> La tomó{" "}
                  {llamada.tomada_por?.nombre || "otro asesor"}
                </span>
              )}
              {fase === "finalizada" && (
                <span className="text-slate-600">
                  <i className="bx bx-phone-off" />{" "}
                  {llamada.error || MOTIVO[llamada.motivo] || "Llamada finalizada"}
                  {llamada.duracion_seg ? ` · ${fmt(llamada.duracion_seg)}` : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        {llamada.error && fase !== "finalizada" ? (
          <div className="mt-2 rounded-lg bg-rose-50 px-2 py-1 text-[11px] text-rose-700">
            {llamada.error}
          </div>
        ) : null}

        {/* Acciones */}
        <div className="mt-3 flex gap-2">
          {timbrando && (
            <>
              <button
                type="button"
                onClick={contestar}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700"
              >
                <i className="bx bx-phone-call text-base" /> Contestar
              </button>
              <button
                type="button"
                onClick={rechazar}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-sm font-bold text-white hover:bg-rose-700"
                title="Rechazar"
              >
                <i className="bx bx-phone-off text-base" />
              </button>
            </>
          )}
          {(fase === "conectando" || llamando || enCurso) && (
            <>
              <button
                type="button"
                onClick={alternarSilencio}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold ${
                  silenciado
                    ? "border-amber-300 bg-amber-50 text-amber-700"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <i className={`bx ${silenciado ? "bx-microphone-off" : "bx-microphone"} text-base`} />
                {silenciado ? "Activar micro" : "Silenciar"}
              </button>
              <button
                type="button"
                onClick={colgar}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-sm font-bold text-white hover:bg-rose-700"
              >
                <i className="bx bx-phone-off text-base" /> Colgar
              </button>
            </>
          )}
          {(fase === "tomada_por_otro" || fase === "finalizada") && (
            <button
              type="button"
              onClick={descartar}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </>
  );
}
