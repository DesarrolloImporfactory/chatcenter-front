/**
 * Países de las altas (ISO de 2 letras), en el orden en que se muestran: los
 * del negocio primero. Espejo de `Pais::LISTA` (imporsutipro/Class/Pais.php) y
 * copia de `src/lib/paises.js` del front React de Imporsuit.
 *
 * Desde el 21-oct-2026 el país es obligatorio en toda alta: decide en qué
 * monedas se le puede cobrar al cliente (`monedasDelPais` en ./moneda.js),
 * qué evento ve y si recibe WhatsApp.
 */
export const PAISES = [
  { code: "EC", label: "Ecuador" },
  { code: "MX", label: "México" },
  { code: "CO", label: "Colombia" },
  { code: "PE", label: "Perú" },
  { code: "CL", label: "Chile" },
  { code: "AR", label: "Argentina" },
  { code: "BO", label: "Bolivia" },
  { code: "PA", label: "Panamá" },
  { code: "CR", label: "Costa Rica" },
  { code: "GT", label: "Guatemala" },
  { code: "VE", label: "Venezuela" },
  { code: "US", label: "Estados Unidos" },
  { code: "ES", label: "España" },
];
