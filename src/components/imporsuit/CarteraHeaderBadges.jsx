import { useEffect, useState } from "react";
import {
  CARTERA_CONFIGS_HABILITADAS,
  buscarPorCorreo,
  getDeudasUsuario,
} from "../../services/imporsuit";
import { tieneCartera } from "./useCarteraCliente";
import {
  contarVencimientos,
  estadoDeuda,
  ESTILO_DEUDA,
} from "./deudaVencimiento";

const MONEY = new Intl.NumberFormat("es-EC", {
  style: "currency",
  currency: "USD",
});

/** "12 may 2024" */
function fmtFechaCorta(s) {
  const d = new Date(s);
  return isNaN(d)
    ? ""
    : d.toLocaleDateString("es-EC", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      });
}

/** Antigüedad legible: "2 años y 3 meses" · "8 meses" · "20 días". */
function antiguedad(s) {
  const d = new Date(s);
  if (isNaN(d)) return "";
  const hoy = new Date();
  let meses =
    (hoy.getFullYear() - d.getFullYear()) * 12 + (hoy.getMonth() - d.getMonth());
  if (hoy.getDate() < d.getDate()) meses -= 1;
  if (meses <= 0) {
    const dias = Math.max(0, Math.floor((hoy - d) / 86400000));
    return `${dias} día${dias === 1 ? "" : "s"}`;
  }
  const anios = Math.floor(meses / 12);
  const resto = meses % 12;
  const txtAnios = anios > 0 ? `${anios} año${anios > 1 ? "s" : ""}` : "";
  const txtMeses = resto > 0 ? `${resto} mes${resto > 1 ? "es" : ""}` : "";
  return [txtAnios, txtMeses].filter(Boolean).join(" y ");
}

/**
 * Pills de contexto Imporsuit para la cabecera del chat: desde cuándo el
 * contacto es cliente (users.date_added) y, si tiene deudas con saldo, el
 * total pendiente. Reutiliza la cartera (buscar_cliente + deudas) y solo se
 * muestra en la(s) config(s) de VENTAS (CARTERA_CONFIGS_HABILITADAS).
 *
 * Carga silenciosa: si el correo no existe en Imporsuit o algo falla, no
 * renderiza nada (la cabecera nunca se rompe por esto).
 */
export default function CarteraHeaderBadges({ selectedChat, idConfiguracion }) {
  const habilitado = CARTERA_CONFIGS_HABILITADAS.includes(
    Number(idConfiguracion),
  );
  const correo = selectedChat?.email_cliente || "";

  // null = sin datos (no existe / error / cargando)
  const [info, setInfo] = useState(null);

  useEffect(() => {
    setInfo(null);
    if (!habilitado || !correo) return undefined;

    const ctrl = new AbortController();
    (async () => {
      try {
        const { exists, data } = await buscarPorCorreo(correo, {
          signal: ctrl.signal,
        });
        if (!exists || !data) return;

        let pendiente = 0;
        let numPendientes = 0;
        let vencidas = 0;
        let porVencer = 0;
        if (tieneCartera(data)) {
          const rows = await getDeudasUsuario(data.id_cartera, {
            signal: ctrl.signal,
          });
          for (const d of Array.isArray(rows) ? rows : []) {
            if (Number(d.estado) === 2) continue; // anuladas no cuentan
            const m = Number(d.monto_pendiente) || 0;
            if (m > 0) {
              pendiente += m;
              numPendientes += 1;
            }
          }
          // Vencidas / por vencer (≤7 días) según fecha_limite
          ({ vencidas, porVencer } = contarVencimientos(rows));
        }
        if (!ctrl.signal.aborted) {
          setInfo({
            fechaRegistro: data.fecha_registro || null,
            pendiente,
            numPendientes,
            vencidas,
            porVencer,
          });
        }
      } catch {
        // Silencioso: sin pill si Imporsuit no responde.
      }
    })();
    return () => ctrl.abort();
  }, [habilitado, correo]);

  if (!habilitado || !info) return null;

  const ant = info.fechaRegistro ? antiguedad(info.fechaRegistro) : "";

  return (
    <>
      {/* Cliente desde */}
      {info.fechaRegistro && (
        <div
          className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 shadow-sm"
          title={`Cliente de Imporsuit desde ${fmtFechaCorta(info.fechaRegistro)}${ant ? ` (${ant})` : ""}`}
        >
          <i className="bx bx-calendar-heart text-[12px] text-indigo-600" />
          <span className="text-[11px] font-semibold text-indigo-800 truncate max-w-[240px]">
            {ant
              ? `${ant} · ${fmtFechaCorta(info.fechaRegistro)}`
              : fmtFechaCorta(info.fechaRegistro)}
          </span>
          <span className="text-[9px] text-indigo-500 font-bold uppercase tracking-wider">
            Cliente
          </span>
        </div>
      )}

      {/* Deuda pendiente (color según vencimiento) */}
      {info.pendiente > 0 &&
        (() => {
          const est = estadoDeuda(info);
          const cfg = ESTILO_DEUDA[est];
          const titulo =
            est === "vencida"
              ? `${info.vencidas} deuda${info.vencidas === 1 ? "" : "s"} VENCIDA${info.vencidas === 1 ? "" : "S"} en cartera`
              : est === "por_vencer"
                ? `${info.porVencer} deuda${info.porVencer === 1 ? "" : "s"} por vencer (≤7 días) en cartera`
                : `${info.numPendientes} deuda${info.numPendientes === 1 ? "" : "s"} con saldo pendiente en cartera`;
          return (
            <div
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 shadow-sm ${cfg.badge}`}
              title={titulo}
            >
              <i className={`${cfg.icon} text-[12px]`} />
              <span className="text-[11px] font-bold">
                {MONEY.format(info.pendiente)}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider">
                {cfg.label}
              </span>
            </div>
          );
        })()}
    </>
  );
}
