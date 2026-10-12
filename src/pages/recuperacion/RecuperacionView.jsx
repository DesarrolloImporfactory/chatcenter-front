import { useNavigate } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import RecuperacionPanel from "./RecuperacionPanel";

/**
 * «Recuperación de clientes» (pedido 2026-10-12): la bandeja de los asesores
 * que dan seguimiento a los clientes de ImporChat en riesgo (pago rebotado,
 * cancelación programada, vencidos, prueba por vencer, cancelados recientes).
 *
 * Quién entra lo decide el back (GET /recuperacion/acceso): super admin,
 * gestor_clientes y los subusuarios elegidos en la pestaña Asesores. El panel
 * es el mismo que ve el super admin en /dashboard_admin?tab=recuperacion.
 * Mismo marco (PageShell) que Conexiones/Usuarios: tarjeta a ancho completo.
 */
export default function RecuperacionView() {
  const navigate = useNavigate();
  return (
    <PageShell pad>
      <RecuperacionPanel onSinPermiso={() => navigate("/chat", { replace: true })} />
    </PageShell>
  );
}
