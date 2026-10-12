import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import chatApi from "../api/chatcenter";

/**
 * ¿Se pinta «Recuperación de clientes» en el menú? (pedido 2026-10-12). Lo
 * decide el back en GET /recuperacion/acceso: super_administrador,
 * gestor_clientes y los subusuarios que el super admin eligió como asesores
 * de recuperación. Misma mecánica que useCasosAcceso: se pregunta una vez
 * por sesión y subusuario.
 */
export default function useRecuperacionAcceso() {
  let idSub = "";
  try {
    const token = localStorage.getItem("token");
    idSub = token ? String(jwtDecode(token)?.id_sub_usuario ?? "") : "";
  } catch (_) {
    idSub = "";
  }
  const clave = `recuperacion_acceso_${idSub}`;

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
      .get("/recuperacion/acceso", { silentError: true })
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
