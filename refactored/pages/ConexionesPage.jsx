/**
 * ╔════════════════════════════════════════════════════════════╗
 * ║  PAGE — ConexionesPage                                    ║
 * ║                                                           ║
 * ║  MIGRACIÓN:                                               ║
 * ║  Reemplaza: src/pages/conexiones/Conexiones.jsx (1700+)   ║
 * ║  + src/pages/conexiones/Conexionespruebas.jsx (1700+)     ║
 * ║  + src/pages/conexiones/AdminConexiones.jsx               ║
 * ║  Ahora: ~10 líneas.                                       ║
 * ╚════════════════════════════════════════════════════════════╝
 */

import React from "react";
import { ConexionesShell } from "../features/conexiones";

export default function ConexionesPage() {
  return <ConexionesShell />;
}
