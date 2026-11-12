import { useSearchParams } from "react-router-dom";
import ConnectionDashboard from "./ConnectionDashboard";
import DashboardConexionV2 from "../dashboardConexionV2/DashboardConexionV2";

/* Ruta /conexion-dashboard (dentro de una conexión).
   · Sin ?view= → el dashboard principal (una sola página).
   · ?view=dropi|ads|mensajes → los tabs de detalle, para profundizar.
   El tab Resumen ya no existe acá: lo reemplazó el dashboard principal,
   así que ?view=resumen (enlaces viejos) también cae en él. */
const VISTAS_DETALLE = ["dropi", "ads", "mensajes"];

export default function ConexionDashboardRuta() {
  const [params] = useSearchParams();
  return VISTAS_DETALLE.includes(params.get("view")) ? (
    <ConnectionDashboard />
  ) : (
    <DashboardConexionV2 />
  );
}
