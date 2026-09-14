// Envío directo a la Cloud API de WhatsApp con reintento ante fallos
// transitorios de Meta.
//
// Solo se reintenta cuando Meta confirma que el mensaje NO salió por un error
// suyo: 131000 ("Something went wrong"), 1 (error desconocido) y 2 (servicio
// no disponible). El 14-09-2026 el 131000 llegó en ráfagas de pocos minutos:
// Meta lo devolvía sin siquiera descargar el link de la imagen y el mismo
// envío salía bien poco después.
//
// Los errores de red (fetch lanza) NO se reintentan: la petición pudo llegar a
// Meta y reintentarla duplicaría el mensaje al cliente.

const CODIGOS_TRANSITORIOS = new Set([1, 2, 131000]);
const ESPERAS_MS = [2000, 5000, 10000];

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Hace POST a /{phoneNumberId}/messages y devuelve el JSON de Meta tal cual
 * (con `error` si falló tras agotar los reintentos), para que el llamador
 * conserve su manejo de errores.
 */
export async function enviarWhatsAppConReintento({
  phoneNumberId,
  token,
  payload,
}) {
  const url = `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`;

  for (let intento = 0; ; intento++) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    const codigo = result?.error?.code;

    if (!CODIGOS_TRANSITORIOS.has(codigo) || intento >= ESPERAS_MS.length) {
      return result;
    }

    console.warn(
      `[WhatsApp] Meta devolvió ${codigo} al enviar ${payload?.type}; ` +
        `reintento ${intento + 1}/${ESPERAS_MS.length} en ${ESPERAS_MS[intento]} ms`,
    );
    await esperar(ESPERAS_MS[intento]);
  }
}
