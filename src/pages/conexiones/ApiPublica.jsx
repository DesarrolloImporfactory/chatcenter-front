import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";
import CopyBtn from "../../components/admin/dashboard/shared/CopyBtn";

/* ─────────────────────────────────────────────────────────────
   API pública: el cliente genera su llave y le pasa esta misma
   documentación al desarrollador que va a consumir los datos.
   ───────────────────────────────────────────────────────────── */

// Mismo host que el API del panel, pero bajo /api/public/v1
const BASE_PUBLICA = String(chatApi.defaults.baseURL || "")
  .replace(/\/+$/, "")
  .replace(/\/api\/v1$/, "/api/public/v1");

/* El modelo mental cuesta ("¿me mandan los datos o los pido?"): se explica
   en 3 pasos en vez de un párrafo. */
const PASOS = [
  {
    icon: "bx-key",
    titulo: "Genera una llave",
    desc: "Es la contraseña que identifica a tu sistema. Puedes tener varias y revocarlas.",
  },
  {
    icon: "bx-user-voice",
    titulo: "Dásela a tu desarrollador",
    desc: "Junto con la documentación de abajo, es todo lo que necesita para empezar.",
  },
  {
    icon: "bx-sync",
    titulo: "Su sistema consulta",
    desc: "Pide los datos cuando los necesita. Nosotros no enviamos nada por nuestra cuenta.",
  },
];

const ENDPOINTS = [
  {
    path: "/ping",
    icon: "bx-plug",
    color: "#64748b",
    titulo: "Verificar la llave",
    desc: "Confirma que la llave funciona y a qué conexión apunta. Úsalo para probar la integración.",
    rango: false,
  },
  {
    path: "/todo",
    icon: "bx-layer",
    color: "#8b5cf6",
    titulo: "Todo de una vez",
    desc: "Resumen + Dropi + Anuncios + Tablero en una sola llamada. Es lo más eficiente si vas a sincronizar cada cierto tiempo.",
    rango: true,
    destacado: true,
  },
  {
    path: "/resumen",
    icon: "bx-bar-chart-alt-2",
    color: "#6366f1",
    titulo: "Resumen del periodo",
    desc: "Ventas, facturación, ganancia, conversaciones y porcentaje de confirmación. Separado por canal.",
    rango: true,
  },
  {
    path: "/dropi",
    icon: "bx-package",
    color: "#FF6B35",
    titulo: "Operación Dropi",
    desc: "En qué estado están los pedidos, qué productos se vendieron y la serie día por día.",
    rango: true,
  },
  {
    path: "/ads",
    icon: "bxl-meta",
    color: "#3b82f6",
    titulo: "Anuncios Meta",
    desc: "Embudo publicitario y atribución anuncio → orden: gasto, ROAS, CPA y ventas por anuncio.",
    rango: true,
  },
  {
    path: "/tablero",
    icon: "bx-columns",
    color: "#059669",
    titulo: "Tablero en vivo",
    desc: "Cuántos clientes hay ahora en cada columna: contacto inicial, generar guía, asesor y las demás.",
    rango: false,
  },
];

const fmtFecha = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("es-EC", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
};

/* Bloque de código con botón de copiar */
function Snippet({ code, lang = "bash" }) {
  return (
    <div className="relative group">
      <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 pr-10 text-[12px] leading-relaxed overflow-x-auto">
        <code>{code}</code>
      </pre>
      <div className="absolute top-2 right-2 opacity-70 group-hover:opacity-100 transition">
        <CopyBtn text={code} label={`${lang} copiado`} />
      </div>
    </div>
  );
}

export default function ApiPublica() {
  const idConfiguracion = useMemo(
    () => Number(localStorage.getItem("id_configuracion")) || null,
    [],
  );

  const [keys, setKeys] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [creandoAbierto, setCreandoAbierto] = useState(false);
  // Llave recién creada: es la única vez que se puede ver completa
  const [keyNueva, setKeyNueva] = useState(null);

  const cargar = useCallback(async () => {
    if (!idConfiguracion) return setCargando(false);
    setCargando(true);
    try {
      const { data } = await chatApi.get("/api_keys", {
        params: { id_configuracion: idConfiguracion },
      });
      setKeys(data?.data || []);
    } catch (_) {
      setKeys([]);
    } finally {
      setCargando(false);
    }
  }, [idConfiguracion]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const crear = async (e) => {
    e?.preventDefault();
    const n = nombre.trim();
    if (!n) return toast.error("Ponle un nombre para identificarla");
    setCreando(true);
    try {
      const { data } = await chatApi.post("/api_keys", {
        id_configuracion: idConfiguracion,
        nombre: n,
      });
      setKeyNueva(data?.data || null);
      setNombre("");
      setCreandoAbierto(false);
      cargar();
    } finally {
      setCreando(false);
    }
  };

  const revocar = async (k) => {
    const r = await Swal.fire({
      icon: "warning",
      title: "¿Revocar esta llave?",
      html: `<b>${k.nombre}</b><br/>Quien la esté usando dejará de recibir datos de inmediato. No se puede deshacer.`,
      showCancelButton: true,
      confirmButtonText: "Sí, revocar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
    });
    if (!r.isConfirmed) return;
    await chatApi.post("/api_keys/revocar", {
      id: k.id,
      id_configuracion: idConfiguracion,
    });
    toast.success("Llave revocada");
    cargar();
  };

  const activas = keys.filter((k) => k.activo);
  const totalConsultas = keys.reduce((s, k) => s + Number(k.usos || 0), 0);

  return (
    <div className="p-5">
      {/* HERO — mismo patrón que Dropi/Shopify */}
      <div className="mb-6 rounded-2xl bg-[#171931] text-white p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Lleva tus métricas a tu propio sistema
            </h1>
            <p className="opacity-90 mt-1">
              Genera una llave y tu <strong>ERP, dashboard o página</strong>{" "}
              podrá leer las mismas métricas que ves aquí.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur text-sm">
              Llaves activas: <strong className="ml-1">{activas.length}</strong>
            </span>
            {totalConsultas > 0 && (
              <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur text-sm">
                Consultas: <strong className="ml-1">{totalConsultas}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Cómo funciona: 3 pasos ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {PASOS.map((p, i) => (
          <div
            key={p.titulo}
            className="relative bg-white rounded-xl border border-slate-200 p-4 shadow-sm"
          >
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="h-7 w-7 rounded-lg bg-slate-900 text-white text-[13px] font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <i className={`bx ${p.icon} text-xl text-slate-400`} />
            </div>
            <p className="text-sm font-semibold text-slate-800">{p.titulo}</p>
            <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">
              {p.desc}
            </p>
            {i < PASOS.length - 1 && (
              <i className="bx bx-chevron-right text-2xl text-slate-300 absolute top-1/2 -right-3 -translate-y-1/2 hidden md:block bg-[#f8fafc] rounded-full z-10" />
            )}
          </div>
        ))}
      </div>

      {/* ── Llaves ── */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
        <div className="px-4 md:px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <i className="bx bx-key text-lg text-slate-400" />
              Llaves de acceso
            </h2>
            <p className="text-[12px] text-slate-500 mt-0.5">
              Cada llave da acceso de <b>solo lectura</b> a los datos de esta
              conexión. Puedes revocarla cuando quieras.
            </p>
          </div>
          {!creandoAbierto && keys.length > 0 && (
            <button
              onClick={() => setCreandoAbierto(true)}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[13px] font-semibold px-3 py-2 transition"
            >
              <i className="bx bx-plus text-lg" />
              Nueva llave
            </button>
          )}
        </div>

        <div className="p-4 md:p-5">
          {/* Llave recién creada */}
          {keyNueva && (
            <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <i className="bx bx-check-circle text-lg text-emerald-600" />
                <p className="font-semibold text-emerald-900 text-sm">
                  Llave creada — cópiala ahora
                </p>
              </div>
              <p className="text-[12px] text-emerald-800 mb-3">
                Por seguridad no la volvemos a mostrar. Si la pierdes, revócala
                y crea otra.
              </p>
              <div className="flex items-center gap-2 bg-white border border-emerald-200 rounded-lg px-3 py-2">
                <code className="text-[12px] text-slate-800 break-all flex-1">
                  {keyNueva.api_key}
                </code>
                <CopyBtn text={keyNueva.api_key} label="Llave copiada" />
              </div>
              <button
                onClick={() => setKeyNueva(null)}
                className="mt-3 text-[12px] text-emerald-700 hover:text-emerald-900 font-medium"
              >
                Ya la guardé, ocultar
              </button>
            </div>
          )}

          {/* Crear */}
          {creandoAbierto && (
            <form
              onSubmit={crear}
              className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3"
            >
              <label className="block text-[12px] font-medium text-slate-700 mb-1.5">
                ¿Quién va a usar esta llave?
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  autoFocus
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: ERP de la tienda, Dashboard de Juan…"
                  maxLength={120}
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-800/20 focus:border-slate-400"
                />
                <button
                  type="submit"
                  disabled={creando || !idConfiguracion}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2 disabled:opacity-50 transition"
                >
                  <i
                    className={`bx ${creando ? "bx-loader-alt bx-spin" : "bx-check"} text-lg`}
                  />
                  Crear
                </button>
                {keys.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCreandoAbierto(false)}
                    className="text-[13px] text-slate-500 hover:text-slate-700 px-2"
                  >
                    Cancelar
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                El nombre es solo para que la reconozcas después.
              </p>
            </form>
          )}

          {/* Listado */}
          {cargando ? (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="h-[58px] rounded-lg bg-slate-100 animate-pulse"
                />
              ))}
            </div>
          ) : keys.length === 0 ? (
            !creandoAbierto && (
              <div className="text-center py-10 px-4">
                <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <i className="bx bx-key text-3xl text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  Aún no has creado ninguna llave
                </p>
                <p className="text-[13px] text-slate-500 mt-1 max-w-sm mx-auto">
                  Crea una y entrégasela a tu desarrollador junto con la
                  documentación de abajo.
                </p>
                <button
                  onClick={() => setCreandoAbierto(true)}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2.5 transition"
                >
                  <i className="bx bx-plus text-lg" />
                  Crear mi primera llave
                </button>
              </div>
            )
          ) : (
            <div className="space-y-2">
              {keys.map((k) => (
                <div
                  key={k.id}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition ${
                    k.activo
                      ? "border-slate-200 bg-white hover:border-slate-300"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${
                      k.activo ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                    title={k.activo ? "Activa" : "Revocada"}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p
                        className={`text-sm font-semibold truncate ${
                          k.activo ? "text-slate-800" : "text-slate-400"
                        }`}
                      >
                        {k.nombre}
                      </p>
                      <code className="text-[11px] text-slate-500 bg-slate-100 rounded px-1.5 py-[1px]">
                        {k.key_prefix}…
                      </code>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {k.activo ? (
                        Number(k.usos) > 0 ? (
                          <>
                            <b className="text-slate-700">{k.usos}</b> consultas
                            · última {fmtFecha(k.last_used_at)}
                          </>
                        ) : (
                          <span className="text-amber-600">
                            <i className="bx bx-time-five" /> Sin usar todavía —
                            tu desarrollador aún no se ha conectado
                          </span>
                        )
                      ) : (
                        `Revocada · alcanzó ${k.usos} consultas`
                      )}
                    </p>
                  </div>
                  {k.activo && (
                    <button
                      onClick={() => revocar(k)}
                      className="shrink-0 text-[12px] font-medium text-slate-500 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition"
                    >
                      Revocar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Documentación ── */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-4 md:px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <i className="bx bx-book-open text-xl text-slate-500" />
          <h2 className="font-semibold text-slate-800">
            Documentación para tu desarrollador
          </h2>
        </div>

        <div className="p-4 md:p-5 space-y-6">
          {/* Cómo autenticar */}
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-1">
              1. Autenticación
            </h3>
            <p className="text-[13px] text-slate-600 mb-2">
              Manda la llave en el encabezado de cada petición. La llave ya sabe
              de qué conexión leer, así que no hay que enviar ningún id.
            </p>
            <Snippet
              code={`curl -H "Authorization: Bearer TU_LLAVE" \\\n  "${BASE_PUBLICA}/ping"`}
            />
            <p className="text-[12px] text-slate-500 mt-2">
              <b>Nunca</b> pongas la llave en el navegador ni en una app móvil:
              es un secreto de servidor. Límite de 60 consultas por minuto.
            </p>
          </div>

          {/* Endpoints */}
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-1">
              2. Qué puedes consultar
            </h3>
            <p className="text-[13px] text-slate-600 mb-3">
              Todo se pide con <code className="text-[12px]">GET</code> y
              responde JSON. Los que aceptan rango usan{" "}
              <code className="text-[12px]">?from=2026-07-01&amp;until=2026-07-20</code>
              ; sin rango toman los últimos 30 días.
            </p>

            <div className="space-y-2">
              {ENDPOINTS.map((e) => (
                <div
                  key={e.path}
                  className={`flex items-start gap-3 rounded-lg border p-3 transition ${
                    e.destacado
                      ? "border-violet-300 bg-violet-50/60 hover:border-violet-400"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${e.color}1a` }}
                  >
                    <i
                      className={`bx ${e.icon} text-lg`}
                      style={{ color: e.color }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-[1px]">
                        GET
                      </span>
                      <code className="text-[13px] font-semibold text-slate-800">
                        {e.path}
                      </code>
                      {e.destacado && (
                        <span className="text-[10px] font-bold text-violet-700 bg-violet-100 border border-violet-200 rounded px-1.5 py-[1px]">
                          RECOMENDADO
                        </span>
                      )}
                      {e.rango && (
                        <span className="text-[10px] text-slate-500 bg-slate-100 rounded px-1.5 py-[1px]">
                          acepta rango de fechas
                        </span>
                      )}
                      <CopyBtn
                        text={`${BASE_PUBLICA}${e.path}`}
                        label="URL copiada"
                      />
                    </div>
                    <p className="text-[12px] text-slate-600 mt-1">
                      <b>{e.titulo}.</b> {e.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ejemplo */}
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-1">
              3. Ejemplo en código
            </h3>
            <Snippet
              lang="js"
              code={`const BASE = "${BASE_PUBLICA}";

const r = await fetch(\`\${BASE}/resumen?from=2026-07-01&until=2026-07-20\`, {
  headers: { Authorization: \`Bearer \${process.env.IMPORCHAT_API_KEY}\` },
});
const data = await r.json();

console.log(data.ventas.pedidos);              // 175
console.log(data.conversaciones.pct_confirmacion); // 63.9`}
            />
          </div>

          {/* Notas */}
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-2">
              4. Detalles que evitan confusiones
            </h3>
            <ul className="space-y-2 text-[13px] text-slate-600">
              <li className="flex gap-2">
                <i className="bx bx-message-dots text-slate-400 text-base mt-[2px]" />
                <span>
                  <b>Conversaciones</b> son personas que <b>escribieron</b>. Los
                  contactos que se crean solos al importar tu historial de Dropi
                  no cuentan.
                </span>
              </li>
              <li className="flex gap-2">
                <i className="bx bx-error-circle text-slate-400 text-base mt-[2px]" />
                <span>
                  Algunos porcentajes llegan en <code>null</code> cuando no hay
                  base para calcularlos. <b>Trátalos como "sin dato", no como
                  cero.</b>
                </span>
              </li>
              <li className="flex gap-2">
                <i className="bx bx-time-five text-slate-400 text-base mt-[2px]" />
                <span>
                  Guarda los resultados unos minutos de tu lado. Consultar cada
                  5–15 minutos es suficiente; no hace falta pedir datos en cada
                  pantalla que abra un usuario.
                </span>
              </li>
              <li className="flex gap-2">
                <i className="bx bx-refresh text-slate-400 text-base mt-[2px]" />
                <span>
                  Si recibes un <code>429</code> o un <code>500</code>,
                  reintenta esperando 1s, 2s, 4s. Un <code>400</code> o{" "}
                  <code>401</code> no se arregla reintentando: revisa los
                  parámetros o la llave.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
