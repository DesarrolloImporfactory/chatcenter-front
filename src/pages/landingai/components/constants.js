export const ASPECT_RATIOS = [
  {
    label: "Banner",
    value: "16:9",
    icon: "bx-landscape",
    sub: "Facebook · Web · Landing",
  },
  {
    label: "Cuadrado",
    value: "1:1",
    icon: "bx-square",
    sub: "Feed Instagram",
  },
  {
    label: "Historia",
    value: "9:16",
    icon: "bx-mobile-alt",
    sub: "Stories · Reels",
  },
];

export const BENEFITS = [
  {
    icon: "bx-time-five",
    title: "De horas a segundos",
    desc: "La IA crea las secciones de tu landing en segundos.",
  },
  {
    icon: "bx-layer",
    title: "Landing completa",
    desc: "Genera hasta 10 secciones profesionales de una sola vez.",
  },
  {
    icon: "bx-trending-up",
    title: "Listo para publicar",
    desc: "Imágenes optimizadas para tu landing page de producto.",
  },
];

export const STEPS_LIST = [
  { key: "home", label: "Template" },
  { key: "images", label: "Imágenes" },
  { key: "pricing", label: "Producto" },
  { key: "angles", label: "Ángulo" },
  { key: "generate", label: "Generar" },
  { key: "results", label: "Resultado" },
];

export const fileToDataUrl = (file) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
