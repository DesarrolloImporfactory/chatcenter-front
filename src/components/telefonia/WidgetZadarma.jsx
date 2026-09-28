import { useEffect, useRef } from "react";
import chatApi from "../../api/chatcenter";

/**
 * Widget WebRTC de Zadarma (teléfono en el navegador del asesor).
 *
 * Telefonía por saldo: el asesor tiene una extensión de la central de
 * Zadarma (se la asigna el back en GET /telefonia/widget) y este widget la
 * registra en su navegador. Cuando el asesor pulsa "Llamar al celular" en un
 * chat, el back le pide a Zadarma un callback: primero suena aquí, el asesor
 * contesta en el widget, y Zadarma marca al cliente.
 *
 * Los scripts son los oficiales de Zadarma (my.zadarma.com); la llave dura
 * 72 h y el back la renueva. Si la telefonía no está configurada (sin llaves
 * en el servidor) no se carga nada. El dominio de la app debe estar
 * registrado en Zadarma → Configuración → Integraciones y API → widget.
 */
const SCRIPTS = [
  "https://my.zadarma.com/webphoneWebRTCWidget/v8/js/loader-phone-lib.js?v=17",
  "https://my.zadarma.com/webphoneWebRTCWidget/v8/js/loader-phone-fn.js?v=17",
];
const RENOVAR_MS = 12 * 3600 * 1000;

function cargarScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = false;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    document.head.appendChild(s);
  });
}

export default function WidgetZadarma() {
  const iniciadoRef = useRef(false);

  useEffect(() => {
    let vigente = true;
    let timer = null;

    const iniciar = async () => {
      try {
        const { data } = await chatApi.get("/telefonia/widget");
        const d = data?.data || {};
        if (!vigente || !d.activo || !d.key || !d.sip) return;
        for (const src of SCRIPTS) await cargarScript(src);
        if (!vigente || typeof window.zadarmaWidgetFn !== "function") return;
        if (!iniciadoRef.current) {
          // (llave, login SIP, forma, idioma, mostrar, posición)
          window.zadarmaWidgetFn(d.key, d.sip, "rounded", "es", true, "{right:'20px',bottom:'150px'}");
          iniciadoRef.current = true;
          console.log("[telefonia] widget de Zadarma listo, extensión", d.extension);
        }
      } catch (err) {
        console.warn("[telefonia] widget no disponible:", err?.response?.data?.message || err.message);
      }
    };

    iniciar();
    // La llave vence a las 72 h: se vuelve a pedir cada 12 h (el back la
    // renueva cuando corresponde). El widget se reinicia con la recarga.
    timer = setInterval(iniciar, RENOVAR_MS);
    return () => {
      vigente = false;
      clearInterval(timer);
    };
  }, []);

  return null;
}
