import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IMPORCHAT_CONFIGS_HABILITADAS,
  ETIQUETA_COINCIDENCIA,
  buscarCuenta,
  getResumenConexion,
  rangoUltimosDias,
} from "../../services/imporchat/cuenta.service";

/**
 * "Imporchat · Cuenta del cliente" en el panel derecho del chat.
 *
 * Solo para las conexiones de soporte (251/265): quien nos escribe ahí suele
 * ser un usuario del sistema, y el asesor necesita saber ANTES de responder si
 * esa persona tiene cuenta, con qué plan, cuántas conexiones y si las está
 * moviendo. Buscamos por el teléfono del chat y, si no cae, por el correo.
 *
 * Cuando no encontramos nada NO significa que no sea cliente: significa que el
 * contacto está desactualizado, y eso es justo lo que le decimos al asesor.
 */
export default function ImporchatCuentaSection({
  selectedChat,
  idConfiguracion,
}) {
  const habilitado = IMPORCHAT_CONFIGS_HABILITADAS.includes(
    Number(idConfiguracion),
  );

  const telefonoChat = selectedChat?.celular_cliente || "";
  const emailChat = selectedChat?.email_cliente || "";

  const [open, setOpen] = useState(false);

  if (!habilitado) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-1 mb-3 mt-1 flex w-full items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.04] px-4 py-3 text-left transition hover:bg-white/[0.07]"
      >
        <span className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-violet-400/20 bg-violet-500/10">
            <i className="bx bx-line-chart text-[16px] text-violet-300" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-[8px] font-semibold uppercase tracking-[0.22em] text-white/35">
              Imporchat
            </span>
            <span className="text-[12px] font-bold uppercase tracking-wide text-white">
              Cuenta del cliente
            </span>
          </span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg border border-violet-400/25 bg-violet-500/10 px-2.5 py-1 text-[11px] font-bold text-violet-200">
          Abrir <i className="bx bx-chevron-right text-[14px]" />
        </span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            role="presentation"
          />
          <div
            className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 sm:items-center"
            onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          >
            <div className="w-full max-w-3xl">
              {/* key: al cambiar de chat se reinicia y vuelve a buscar */}
              <CuentaImporchatPanel
                key={`${telefonoChat}|${emailChat}`}
                telefonoInicial={telefonoChat}
                emailInicial={emailChat}
                onClose={() => setOpen(false)}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}

/* ── Panel principal ─────────────────────────────────────────────────── */

function CuentaImporchatPanel({ telefonoInicial, emailInicial, onClose }) {
  const [telefono, setTelefono] = useState(telefonoInicial || "");
  const [email, setEmail] = useState(emailInicial || "");

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState(null);

  const abortRef = useRef(null);

  const buscar = useCallback(async (tel, mail) => {
    if (!tel && !mail) {
      setResultado(null);
      setError("Este contacto no tiene teléfono ni correo registrado.");
      return;
    }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setCargando(true);
    setError("");
    try {
      const data = await buscarCuenta(
        { telefono: tel, email: mail },
        { signal: ctrl.signal },
      );
      setResultado(data);
    } catch (e) {
      if (e.name === "CanceledError" || e.name === "AbortError") return;
      setResultado(null);
      setError(
        e?.response?.data?.message ||
          "No se pudo consultar la cuenta. Intenta de nuevo.",
      );
    } finally {
      if (abortRef.current === ctrl) setCargando(false);
    }
  }, []);

  // Búsqueda automática al abrir, con lo que ya tenemos del chat
  useEffect(() => {
    buscar(telefonoInicial || "", emailInicial || "");
    return () => abortRef.current?.abort();
  }, [buscar, telefonoInicial, emailInicial]);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1222] text-white shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-violet-400/20 bg-violet-500/10">
            <i className="bx bx-line-chart text-[18px] text-violet-300" />
          </span>
          <div className="leading-tight">
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/35">
              Imporchat
            </p>
            <p className="text-sm font-bold">Cuenta del cliente</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white/70 transition hover:bg-white/10 hover:text-white"
          title="Cerrar"
        >
          <i className="bx bx-x text-lg" />
        </button>
      </div>

      {/* Búsqueda manual */}
      <div className="grid grid-cols-1 gap-2 px-5 py-3 sm:grid-cols-[1fr_1fr_auto]">
        <input
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="Teléfono"
          className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] outline-none placeholder:text-white/30 focus:border-violet-400/40"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Correo"
          className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] outline-none placeholder:text-white/30 focus:border-violet-400/40"
        />
        <button
          type="button"
          onClick={() => buscar(telefono.trim(), email.trim())}
          disabled={cargando}
          className="rounded-lg border border-violet-400/25 bg-violet-500/15 px-4 py-2 text-[12px] font-bold text-violet-100 transition hover:bg-violet-500/25 disabled:opacity-50"
        >
          {cargando ? "Buscando…" : "Buscar"}
        </button>
      </div>

      <div className="max-h-[70vh] overflow-y-auto px-5 pb-5">
        {cargando && !resultado && (
          <p className="py-8 text-center text-[12px] text-white/40">
            Consultando la cuenta…
          </p>
        )}

        {!!error && (
          <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-[12px] text-red-200">
            {error}
          </div>
        )}

        {!cargando && !error && resultado && !resultado.encontrado && (
          <SinCuenta buscado={resultado.buscado} />
        )}

        {resultado?.encontrado && <Cuenta data={resultado} />}
      </div>
    </div>
  );
}

/* ── Sin coincidencia ────────────────────────────────────────────────── */

function SinCuenta({ buscado }) {
  return (
    <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-4">
      <p className="flex items-center gap-2 text-[13px] font-bold text-amber-200">
        <i className="bx bx-search-alt text-base" />
        No encontramos una cuenta Imporchat
      </p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-amber-100/80">
        Ni el teléfono ni el correo de este contacto coinciden con un usuario
        del sistema. Puede ser que escriba desde otro número o que el contacto
        esté desactualizado: pídele el correo con el que se registró y
        actualízalo en la ficha del cliente.
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-amber-100/70">
        <span className="rounded-md border border-amber-400/20 bg-amber-500/10 px-2 py-1">
          Teléfono: {buscado?.telefono || "—"}
        </span>
        <span className="rounded-md border border-amber-400/20 bg-amber-500/10 px-2 py-1">
          Correo: {buscado?.email || "—"}
        </span>
      </div>
    </div>
  );
}

/* ── Cuenta encontrada ───────────────────────────────────────────────── */

const fmtFecha = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es");
};

function Cuenta({ data }) {
  const { usuario, conexiones = [], coincidencia, detalle } = data;
  const [conexionSel, setConexionSel] = useState(
    conexiones.find((c) => !c.suspendido)?.id_configuracion ??
      conexiones[0]?.id_configuracion ??
      null,
  );

  const estadoColor =
    usuario.estado === "activo"
      ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
      : "border-amber-400/25 bg-amber-500/10 text-amber-200";

  return (
    <div className="space-y-3">
      {/* Ficha */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-bold">
              {usuario.nombre || "Sin nombre"}
            </p>
            <p className="truncate text-[11px] text-white/50">
              {usuario.email || "Sin correo"}
            </p>
          </div>
          <span
            className={`rounded-md border px-2 py-1 text-[10px] font-bold uppercase ${estadoColor}`}
          >
            {usuario.estado || "—"}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Dato
            label="Plan"
            valor={
              usuario.nombre_plan ||
              (usuario.id_plan ? `Plan #${usuario.id_plan}` : "Sin plan")
            }
            titulo={
              usuario.nombre_plan && usuario.precio_plan != null
                ? `${usuario.nombre_plan} · $${Number(usuario.precio_plan)}`
                : undefined
            }
          />
          <Dato label="Tipo" valor={usuario.tipo_plan || "—"} />
          <Dato label="WhatsApp registro" valor={usuario.whatsapp_lead || "—"} />
          <Dato label="Renovación" valor={fmtFecha(usuario.fecha_renovacion)} />
        </div>

        <p className="mt-2.5 flex items-center gap-1.5 text-[10px] text-white/40">
          <i className="bx bx-check-circle text-xs text-violet-300" />
          {ETIQUETA_COINCIDENCIA[coincidencia] || "Coincidencia encontrada"}
          {detalle ? ` · ${detalle}` : ""}
        </p>
      </div>

      {/* Conexiones */}
      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
          Conexiones ({conexiones.length})
        </p>
        {conexiones.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[12px] text-white/50">
            La cuenta existe pero todavía no tiene ninguna conexión creada.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {conexiones.map((c) => {
              const activa = c.id_configuracion === conexionSel;
              return (
                <button
                  key={c.id_configuracion}
                  type="button"
                  onClick={() => setConexionSel(c.id_configuracion)}
                  className={`rounded-lg border px-3 py-2 text-left transition ${
                    activa
                      ? "border-violet-400/40 bg-violet-500/15"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <span className="block text-[11px] font-bold">
                    {c.nombre || `Conexión ${c.id_configuracion}`}
                  </span>
                  <span className="block text-[10px] text-white/45">
                    {c.telefono || "sin número"}
                    {c.suspendido ? " · suspendida" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {conexionSel && <ResumenConexion idConfiguracion={conexionSel} />}
    </div>
  );
}

function Dato({ label, valor, titulo }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1.5">
      <p className="text-[9px] uppercase tracking-wide text-white/35">{label}</p>
      <p
        className="truncate text-[11px] font-semibold text-white/90"
        title={titulo || (typeof valor === "string" ? valor : undefined)}
      >
        {valor}
      </p>
    </div>
  );
}

/* ── KPIs de una conexión ────────────────────────────────────────────── */

const RANGOS = [
  { dias: 7, label: "7 días" },
  { dias: 30, label: "30 días" },
  { dias: 90, label: "90 días" },
];

const num = (n) => Number(n || 0).toLocaleString("es");
const money = (n) =>
  `$${Number(n || 0).toLocaleString("es", { minimumFractionDigits: 2 })}`;

function ResumenConexion({ idConfiguracion }) {
  const [dias, setDias] = useState(30);
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const rango = useMemo(() => rangoUltimosDias(dias), [dias]);

  useEffect(() => {
    const ctrl = new AbortController();
    setCargando(true);
    setError("");
    getResumenConexion(
      { id_configuracion: idConfiguracion, ...rango },
      { signal: ctrl.signal },
    )
      .then(setData)
      .catch((e) => {
        if (e.name === "CanceledError" || e.name === "AbortError") return;
        setError(
          e?.response?.data?.message || "No se pudieron leer las métricas.",
        );
        setData(null);
      })
      .finally(() => setCargando(false));
    return () => ctrl.abort();
  }, [idConfiguracion, rango]);

  const v = data?.ventas;
  const c = data?.conversaciones;
  const sinActividad =
    data && !v?.pedidos && !c?.total && !c?.mensajes_recibidos;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
          Actividad de la conexión
        </p>
        <div className="flex gap-1">
          {RANGOS.map((r) => (
            <button
              key={r.dias}
              type="button"
              onClick={() => setDias(r.dias)}
              className={`rounded-md px-2 py-1 text-[10px] font-bold transition ${
                dias === r.dias
                  ? "bg-violet-500/20 text-violet-100"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {cargando && (
        <p className="py-4 text-center text-[12px] text-white/40">
          Cargando métricas…
        </p>
      )}

      {!!error && !cargando && (
        <p className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
          {error}
        </p>
      )}

      {data && !cargando && !error && (
        <>
          {sinActividad && (
            <p className="mb-2.5 rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100/90">
              Sin movimiento en este periodo: ni conversaciones ni pedidos. El
              cliente tiene la conexión creada pero no la está usando.
            </p>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Kpi label="Pedidos" valor={num(v?.pedidos)} />
            <Kpi label="Facturado" valor={money(v?.facturado)} />
            <Kpi label="Entregadas" valor={num(v?.entregadas)} />
            <Kpi
              label="Tasa entrega"
              valor={`${Number(v?.tasa_entrega_pct || 0)}%`}
            />
            <Kpi label="Conversaciones" valor={num(c?.total)} />
            <Kpi label="Mensajes" valor={num(c?.mensajes_recibidos)} />
            <Kpi label="Con pedido" valor={num(c?.con_pedido)} />
            <Kpi
              label="Confirmación"
              valor={
                c?.pct_confirmacion == null
                  ? "—"
                  : `${Number(c.pct_confirmacion)}%`
              }
            />
          </div>

          <div className="mt-2.5 flex flex-wrap gap-1.5 text-[10px]">
            <Chip
              on={data?.integraciones?.meta_ads?.conectado}
              label="Meta Ads"
            />
            <Chip on={data?.integraciones?.shopify_webhook} label="Shopify" />
            <Chip
              on={data?.integraciones?.anuncios_ctwa_activos}
              label="Anuncios CTWA"
            />
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ label, valor }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.04] px-2.5 py-2">
      <p className="text-[9px] uppercase tracking-wide text-white/35">{label}</p>
      <p className="text-[13px] font-bold text-white">{valor}</p>
    </div>
  );
}

function Chip({ on, label }) {
  return (
    <span
      className={`rounded-md border px-2 py-1 font-semibold ${
        on
          ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
          : "border-white/10 bg-white/[0.03] text-white/35"
      }`}
    >
      {on ? "✓" : "○"} {label}
    </span>
  );
}
