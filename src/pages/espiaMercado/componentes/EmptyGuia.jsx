import { motion } from "framer-motion";
import { TOKENS, URL_EXTENSION_WEB_STORE, btnBlanco, btnOscuro, nombrePais, urlBiblioteca, useCopiar } from "../ui";

/* ═══════════════════════════════════════════════════════════════════════
   Panel vacío que ENSEÑA. Anuncios y Tiendas solo se llenan con la
   extensión de Chrome «Espía de tiendas»: si no hay nada, en vez de un
   «sin resultados» se muestran los 3 pasos para empezar, con la URL de la
   Biblioteca lista para copiar y el enlace a la carpeta de la extensión.
   ═══════════════════════════════════════════════════════════════════════ */

const PASOS = [
  {
    icon: "bxl-chrome",
    titulo: "Instala la extensión «Espía de tiendas»",
    detalle: URL_EXTENSION_WEB_STORE ? (
      <>
        Instálala desde la Chrome Web Store con un clic. Con Imporchat abierto en ese mismo Chrome, la extensión toma tu sesión sola.
        <a href={URL_EXTENSION_WEB_STORE} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-[12px] font-extrabold text-[#0B1426] shadow-[0_10px_24px_-10px_rgba(0,0,0,0.7)] hover:bg-sky-50">
          <i className="bx bxl-chrome" /> Instalar desde Chrome Web Store
        </a>
      </>
    ) : (
      <>
        Pide la extensión al equipo de Imporfactory (carpeta <code className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-sky-200">espia-tiendas</code>) y cárgala en{" "}
        <code className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-sky-200">chrome://extensions</code> con <b>Modo de desarrollador → Cargar descomprimida</b>. Con Imporchat abierto en ese mismo Chrome, la extensión toma tu sesión sola.
      </>
    ),
  },
  {
    icon: "bxl-meta",
    titulo: "Abre la Biblioteca de anuncios de Meta y busca una tienda",
    detalle: "Elige el país y escribe el dominio de la tienda (por ejemplo tiendamultimarca.com.co). Abajo aparece la barra de la extensión con sus anuncios agrupados por producto.",
  },
  {
    icon: "bx-send",
    titulo: "Pulsa «Enviar a IMPORCHAT»",
    detalle: "Lo que viste llega aquí en segundos: anuncios con días activos, copias y creativos, y la tienda con su tendencia diaria. Cada vez que vuelvas a analizarla se actualiza.",
  },
];

export default function EmptyGuia({ pais = "EC", seccion = "anuncios", compacto = false }) {
  const { copiado, copiar } = useCopiar();
  const url = urlBiblioteca(pais);
  const titulo = seccion === "tiendas" ? "Todavía no hay tiendas espiadas" : "Todavía no hay anuncios espiados";
  const sub =
    seccion === "tiendas"
      ? `Las tiendas de ${nombrePais(pais)} aparecen aquí cuando analizas sus anuncios con la extensión. Tres pasos y empiezas a ver quién pauta y cuánto.`
      : `Los anuncios de ${nombrePais(pais)} llegan desde la Biblioteca de Meta a través de la extensión de Chrome. Tres pasos y los ves aquí con días activos, copias y creativos.`;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-[26px] text-white shadow-[0_30px_80px_-30px_rgba(11,20,38,0.7)] ring-1 ring-white/10"
      style={{
        background:
          "radial-gradient(110% 80% at 0% 0%, rgba(14,165,233,0.30) 0%, rgba(11,20,38,0) 55%), radial-gradient(70% 60% at 100% 100%, rgba(37,211,102,0.16) 0%, rgba(11,20,38,0) 60%), linear-gradient(180deg, #0B1426 0%, #0a1222 100%)",
      }}
      aria-label={titulo}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.12]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
      <div className={`relative grid gap-8 ${compacto ? "p-6" : "p-7 md:grid-cols-[1fr_1.1fr] md:p-10"}`}>
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/30 bg-sky-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-sky-200">
            <i className="bx bxl-chrome text-sm" /> Extensión de Chrome · gratis para el equipo
          </div>
          <h3 className="mt-5 text-[26px] font-extrabold leading-[1.1] tracking-tight sm:text-[32px]">
            {titulo.split(" no ")[0]} no
            <span className="block bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(90deg, ${TOKENS.sky} 0%, ${TOKENS.cyan} 100%)` }}>
              {titulo.split(" no ")[1]}.
            </span>
          </h3>
          <p className="mt-4 max-w-[44ch] text-[14px] leading-6 text-slate-300">{sub}</p>

          <Ilustracion />

          <div className="mt-6 flex flex-wrap gap-2">
            <a href={url} target="_blank" rel="noreferrer" className={btnBlanco}>
              <i className="bx bx-link-external" /> Abrir la Biblioteca de anuncios
            </a>
            <button type="button" className={btnOscuro} onClick={() => copiar(url)}>
              <i className={`bx ${copiado ? "bx-check" : "bx-copy"}`} /> {copiado ? "URL copiada" : "Copiar URL"}
            </button>
          </div>
        </div>

        <div className="flex flex-col rounded-[22px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm md:p-7">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-sky-300">Cómo empezar</div>
          <ol className="relative mt-4 space-y-5">
            <span className="absolute bottom-5 left-[19px] top-5 w-px bg-gradient-to-b from-sky-400/50 via-white/10 to-transparent" aria-hidden="true" />
            {PASOS.map((p, i) => (
              <motion.li key={p.titulo} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.12 }} className="relative flex items-start gap-3.5">
                <span
                  className="relative z-10 grid h-[38px] w-[38px] shrink-0 place-items-center rounded-xl text-white ring-1 ring-white/15"
                  style={{ background: "linear-gradient(135deg, rgba(14,165,233,0.9) 0%, rgba(3,105,161,0.9) 100%)" }}
                >
                  <i className={`bx ${p.icon} text-[19px]`} />
                </span>
                <div className="min-w-0">
                  <div className="text-[14.5px] font-extrabold leading-5">
                    <span className="mr-1 text-sky-300">{i + 1}.</span>
                    {p.titulo}
                  </div>
                  <div className="mt-1 text-[12.5px] leading-5 text-slate-300/90">{p.detalle}</div>
                </div>
              </motion.li>
            ))}
          </ol>
          <p className="mt-auto pt-6 text-[12px] text-slate-400">
            <i className="bx bx-shield-quarter mr-1" style={{ color: TOKENS.verde }} />
            Solo lee información pública de la Biblioteca de Meta. No pide usuario ni clave de nada.
          </p>
        </div>
      </div>
    </motion.section>
  );
}

/* Biblioteca → extensión → Imporchat, con una luz que recorre la línea. */
function Ilustracion() {
  const nodos = [
    { icon: "bxl-meta", color: TOKENS.sky, label: "Biblioteca" },
    { icon: "bxl-chrome", color: TOKENS.cyan, label: "Extensión" },
    { icon: "bx-radar", color: TOKENS.verde, label: "Imporchat" },
  ];
  return (
    <div className="relative mt-7 flex items-start justify-between px-1">
      <div className="absolute left-7 right-7 top-7 h-px bg-white/15" />
      <motion.div
        className="absolute top-7 h-[3px] w-20 -translate-y-1/2 rounded-full"
        style={{ background: `linear-gradient(90deg, transparent, ${TOKENS.sky}, ${TOKENS.verde}, transparent)`, filter: "blur(0.5px)" }}
        animate={{ left: ["6%", "80%"], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.4 }}
      />
      {nodos.map((n, i) => (
        <div key={n.icon} className="relative z-10 flex flex-col items-center gap-2">
          <motion.div
            className="grid h-14 w-14 place-items-center rounded-2xl border border-white/15 bg-[#0f1b33]"
            animate={{
              boxShadow: ["0 0 0 0 rgba(0,0,0,0)", `0 0 0 8px ${n.color}22, 0 0 32px ${n.color}66`, "0 0 0 0 rgba(0,0,0,0)"],
              borderColor: ["rgba(255,255,255,0.15)", n.color, "rgba(255,255,255,0.15)"],
            }}
            transition={{ duration: 3, repeat: Infinity, delay: 0.3 + i * 0.95, ease: "easeInOut" }}
          >
            <i className={`bx ${n.icon} text-[28px]`} style={{ color: n.color }} />
          </motion.div>
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{n.label}</span>
        </div>
      ))}
    </div>
  );
}
