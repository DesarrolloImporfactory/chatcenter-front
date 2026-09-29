/**
 * Línea de tiempo de un caso (Escalar / Oportunidad Comercial): todo lo que se
 * hizo, en orden, con qué / cuándo / quién. Pedido 2026-09-28, parte 3.
 *
 * Es un registro de auditoría (tabla incidencias_casos_eventos): solo se lee.
 * No hay forma de editar ni borrar una entrada; lo que se hizo mal se corrige
 * con una acción nueva.
 *
 * `tema`: "oscuro" en el panel derecho del chat, "claro" en Seguimiento de casos.
 */

const ACCIONES = {
  creado: { txt: "Marcó el caso", icon: "bx-flag", oscuro: "text-cyan-300", claro: "text-violet-700" },
  en_espera: { txt: "Lo puso en espera", icon: "bx-pause-circle", oscuro: "text-sky-300", claro: "text-sky-700" },
  resuelto: { txt: "Lo resolvió", icon: "bx-check-circle", oscuro: "text-emerald-300", claro: "text-emerald-700" },
};

const TEMAS = {
  oscuro: {
    linea: "border-white/10",
    punto: "bg-[#0d1a30] ring-white/15",
    meta: "text-white/35",
    texto: "text-white/70",
    aviso: "text-white/40",
  },
  claro: {
    linea: "border-slate-200",
    punto: "bg-white ring-slate-200",
    meta: "text-slate-400",
    texto: "text-slate-700",
    aviso: "text-slate-500",
  },
};

export default function LineaTiempoCaso({ eventos, tema = "oscuro" }) {
  if (!Array.isArray(eventos)) return null;
  const t = TEMAS[tema] || TEMAS.oscuro;
  const soloCreado = eventos.length <= 1;

  return (
    <div className={`border-l ${t.linea} ml-1.5 pl-3 space-y-2`}>
      {eventos.map((e) => {
        const a = ACCIONES[e.accion] || { txt: e.accion, icon: "bx-radio-circle", oscuro: "text-white/60", claro: "text-slate-600" };
        return (
          <div key={e.id} className="relative">
            <span
              className={`absolute -left-[19px] top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full ring-1 ${t.punto}`}
            >
              <i className={`bx ${a.icon} text-[10px] ${a[tema] || a.oscuro}`} />
            </span>
            <p className={`text-[10px] font-semibold ${a[tema] || a.oscuro}`}>
              {a.txt}
              <span className={`font-normal ${t.meta}`}>
                {" · "}
                {e.autor_nombre || "—"} · {fecha(e.created_at)}
              </span>
            </p>
            {e.comentario && e.accion !== "creado" && (
              <p className={`text-[10px] leading-snug whitespace-pre-wrap ${t.texto}`}>{e.comentario}</p>
            )}
          </div>
        );
      })}
      {soloCreado && (
        <p className={`text-[10px] italic ${t.aviso}`}>Recién creado: todavía nadie lo ha tocado.</p>
      )}
    </div>
  );
}

function fecha(d) {
  const x = new Date(d);
  if (Number.isNaN(+x)) return "";
  return x.toLocaleString("es-EC", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
