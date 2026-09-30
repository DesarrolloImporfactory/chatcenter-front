import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import chatApi from "../api/chatcenter";

/**
 * ¿Se pinta «Seguimiento de casos» en el menú? (pedido «gestión de
 * incidencias», 2026-09-28). Lo decide el back — destinatarios de casos y
 * administradores de la cuenta — en GET /incidencias_chat_center/casos-acceso.
 *
 * Lo usan los dos menús: el del chat (Cabecera.jsx) y el de las páginas de
 * ajustes (MainLayout.jsx). Se pregunta una vez por sesión y subusuario.
 */
export default function useCasosAcceso() {
  let idSub = "";
  try {
    const token = localStorage.getItem("token");
    idSub = token ? String(jwtDecode(token)?.id_sub_usuario ?? "") : "";
  } catch (_) {
    idSub = "";
  }
  const clave = `casos_acceso_${idSub}`;

  const [acceso, setAcceso] = useState(() => {
    try {
      return sessionStorage.getItem(clave) === "1";
    } catch (_) {
      return false;
    }
  });

  useEffect(() => {
    if (!idSub) return undefined;
    try {
      const guardado = sessionStorage.getItem(clave);
      if (guardado !== null) {
        setAcceso(guardado === "1");
        return undefined;
      }
    } catch (_) {
      /* sin sessionStorage: se pregunta igual */
    }
    let vivo = true;
    chatApi
      .get("/incidencias_chat_center/casos-acceso", { silentError: true })
      .then(({ data }) => {
        const ok = !!data?.data?.acceso;
        try {
          sessionStorage.setItem(clave, ok ? "1" : "0");
        } catch (_) {
          /* no pasa nada: se vuelve a preguntar */
        }
        if (vivo) setAcceso(ok);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [idSub, clave]);

  return acceso;
}
