/* Link de rastreo por transportadora (Ecuador y México). Espejo de
   socket/src/utils/trackingTransportadora.js: si se agrega una, va en ambos. */

const POR_TRANSPORTADORA = [
  // Ecuador
  {
    test: (c) => c.includes("LAAR"),
    url: (g) =>
      `https://fenixoper.laarcourier.com/Tracking/Guiacompleta.aspx?guia=${g}`,
  },
  {
    test: (c) => c.includes("GINTRACOM"),
    url: (g) => `https://ec.gintracom.site/web/site/tracking?guia=${g}`,
  },
  {
    test: (c) => c.includes("VELOCES"),
    url: (g) => `https://tracking.veloces.app/tracking-client/${g}`,
  },
  {
    test: (c) => c.includes("URBANO"),
    url: (g) =>
      `https://app.urbano.com.ec/plugin/etracking/etracking/?guia=${g}`,
  },
  {
    test: (c) => c.includes("SERVIENTREGA"),
    url: (g) => `https://www.servientrega.com.ec/Tracking/?guia=${g}&tipo=GUIA`,
  },
  // México
  {
    test: (c) => c.includes("AMPM"),
    url: (g) => `https://grupoampm.com/rastreador/?tracking-id=${g}`,
  },
  {
    test: (c) => c.includes("QUALITY"),
    url: (g) =>
      `https://wstracking.qualitypost.com.mx/portal_seguimiento?info=${g}`,
  },
  {
    test: (c) => c.includes("COORDI"),
    url: (g) =>
      `https://coordi.com/rastreo/rastreo-de-guia/detalle-de-rastreo-de-guia/?guia=${g}`,
  },
  {
    test: (c) => c.includes("TIUI"),
    url: (g) => `https://tiuiamigo.tiui.mx/rastreo/${g}`,
  },
  {
    // Afimex no acepta la guía por link: abre su rastreador vacío.
    test: (c) => c.includes("AFIMEX"),
    url: () => "https://afimex.net/rastrea-envio",
  },
];

// Adivinar por prefijo solo cuando no sabemos la transportadora.
const POR_PREFIJO = [
  { re: /^(LC|IMP|MKP)/i, comp: "LAAR" },
  { re: /^(D0|I0)/i, comp: "GINTRACOM" },
  { re: /^V/i, comp: "VELOCES" },
  { re: /^WYB/i, comp: "URBANO" },
];

export function getTrackingUrlTransportadora(shippingCompany, guide) {
  const g = String(guide || "").trim();
  if (!g) return null;
  let comp = String(shippingCompany || "").toUpperCase();
  if (!comp) comp = POR_PREFIJO.find((p) => p.re.test(g))?.comp || "";
  const t = POR_TRANSPORTADORA.find((x) => x.test(comp));
  return t ? t.url(encodeURIComponent(g)) : null;
}
