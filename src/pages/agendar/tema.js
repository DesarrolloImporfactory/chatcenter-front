/* Tema de la agenda pública (/agendar/<slug>).

   El negocio elige el color de fondo y el de acento en Calendario → Agenda
   pública → Apariencia; sin elección queda el azul oscuro y el cyan de
   ImporChat. Lo usan la página pública (para pintarse) y el panel (para la
   muestra en vivo). */

export const FONDO_INICIAL = "#060b16";
export const ACENTO_INICIAL = "#00BFFF";

export const RE_COLOR = /^#[0-9a-f]{6}$/i;
export const esColor = (v) => RE_COLOR.test(String(v || "").trim());

/* Luminancia relativa (WCAG): 0 negro … 1 blanco. */
export const luminancia = (hex) => {
  const c = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};

/* Con un fondo claro la página pasa a tinta oscura; el umbral deja los
   azules y verdes profundos del lado oscuro y los pasteles del claro. */
export const esClaro = (hex) => luminancia(hex) > 0.35;

/* Variables CSS de la página a partir de lo guardado. La página está escrita
   en clases oscuras (text-white, bg-white/10, cyan-300…) y EstilosTema las
   redirige a estas variables. */
export function temaDe({ color_fondo, color_acento } = {}) {
  const fondo = esColor(color_fondo) ? color_fondo.toLowerCase() : FONDO_INICIAL;
  const acento = esColor(color_acento) ? color_acento.toLowerCase() : ACENTO_INICIAL;
  const claro = esClaro(fondo);
  return {
    fondo,
    acento,
    claro,
    vars: {
      "--agp-fondo": fondo,
      "--agp-acento": acento,
      "--agp-sobre-acento": esClaro(acento) ? "#06111f" : "#ffffff",
      "--agp-tinta": claro ? "#0f172a" : "#ffffff",
      "--agp-sobre-tinta": claro ? "#ffffff" : "#0B1426",
      "--agp-tinta-2": claro ? "#334155" : "#cbd5e1",
      "--agp-tinta-3": claro ? "#475569" : "#94a3b8",
      "--agp-tinta-4": claro ? "#64748b" : "#64748b",
      "--agp-tinta-5": claro ? "#a3aebf" : "#475569",
      "--agp-velo": claro ? "0,0,0" : "255,255,255",
      "--agp-tarjeta": claro ? "#ffffff" : `color-mix(in srgb, ${fondo} 86%, #ffffff)`,
    },
  };
}
