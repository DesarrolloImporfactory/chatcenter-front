import React, { useEffect, useState, useCallback } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";
import HistorialCobrosStripe from "./HistorialCobrosStripe";

/**
 * Integraciones → Stripe.
 *
 * La cuenta vincula SU propia llave de Stripe y, desde ese momento, cualquier
 * asesor puede cobrar por WhatsApp desde el chat ("+" → Crear enlace de pago)
 * con el monto que acuerde con el cliente. El dinero cae directo en la cuenta
 * de Stripe del cliente de ImporChat; la plataforma no cobra comisión.
 *
 * Misma estructura, paleta, botones y diálogo de vinculación que
 * IntegracionesDropi/Aliclik. Una vinculación por configuración.
 */

const MONEDAS = [
  { v: "usd", l: "USD · Dólar" },
  { v: "mxn", l: "MXN · Peso mexicano" },
  { v: "cop", l: "COP · Peso colombiano" },
  { v: "pen", l: "PEN · Sol peruano" },
  { v: "clp", l: "CLP · Peso chileno" },
  { v: "eur", l: "EUR · Euro" },
];

const STRIPE_KEYS_URL = "https://dashboard.stripe.com/apikeys";

/* Permisos de la clave restringida, con los nombres tal como los muestra
   Stripe (en inglés) para que el usuario los encuentre sin traducir. */
const PERMISOS = [
  { recurso: "Customers", nivel: "Write" },
  { recurso: "Invoices", nivel: "Write" },
  { recurso: "Todo lo demás", nivel: "None" },
];

/* Aviso corto y sin botón: la pantalla ya muestra el estado nuevo, no hace
   falta que el usuario confirme nada. */
const toast = (title, icon = "success") =>
  Swal.fire({
    toast: true,
    position: "top-end",
    icon,
    title,
    timer: 2500,
    showConfirmButton: false,
    timerProgressBar: true,
  });

function LogoStripe({ size = "md" }) {
  const box = size === "lg" ? "h-14 w-14 text-3xl" : "h-9 w-9 text-xl";
  const word = size === "lg" ? "text-4xl" : "text-2xl";
  return (
    <div className="inline-flex items-center gap-2">
      <span
        className={`inline-flex ${box} items-center justify-center rounded-xl bg-[#635BFF] text-white font-black`}
      >
        S
      </span>
      <span className={`${word} font-extrabold text-[#0A2540] tracking-tight`}>
        stripe
      </span>
    </div>
  );
}

export default function IntegracionesStripe() {
  const [id_configuracion, setIdConfiguracion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [probando, setProbando] = useState(false);
  const [integraciones, setIntegraciones] = useState([]);

  const activa = integraciones.length ? integraciones[0] : null;
  const isLinked = !!activa;
  const esTest = activa?.modo === "test";

  // Pestañas: "integracion" (vincular / estado) y "cobros" (historial de
  // toda la cuenta). La de cobros solo tiene sentido con Stripe vinculado o
  // con cobros históricos.
  const [tab, setTab] = useState("integracion");
  // ¿La cuenta tiene cobros aunque hoy no esté vinculada? Así el dueño sigue
  // viendo el historial después de desvincular.
  const [hayHistorial, setHayHistorial] = useState(false);
  useEffect(() => {
    let vivo = true;
    if (!id_configuracion) return undefined;
    chatApi
      .get("enlaces_pago/historial", {
        params: { id_configuracion, limit: 1 },
        silentError: true,
      })
      .then(
        (res) => vivo && setHayHistorial((res?.data?.totales?.total || 0) > 0),
      )
      .catch(() => vivo && setHayHistorial(false));
    return () => {
      vivo = false;
    };
  }, [id_configuracion]);

  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState("create");
  const [nombre, setNombre] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [moneda, setMoneda] = useState("usd");

  useEffect(() => {
    const idc = localStorage.getItem("id_configuracion");
    if (idc) setIdConfiguracion(parseInt(idc, 10));
  }, []);

  const fetchIntegraciones = useCallback(async () => {
    if (!id_configuracion) return;
    setLoading(true);
    try {
      const res = await chatApi.get("stripe_integrations", {
        params: { id_configuracion },
      });
      setIntegraciones(res?.data?.data ?? []);
    } catch {
      setIntegraciones([]);
    } finally {
      setLoading(false);
    }
  }, [id_configuracion]);

  useEffect(() => {
    fetchIntegraciones();
  }, [fetchIntegraciones]);

  const errMsg = (error, fallback) =>
    error?.response?.data?.message || error?.response?.data?.error || fallback;

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
  };

  const openCreate = () => {
    setMode("create");
    setNombre(localStorage.getItem("nombre_configuracion") || "");
    setSecretKey("");
    setShowKey(false);
    setMoneda("usd");
    setShowModal(true);
  };

  const openEdit = () => {
    setMode("edit");
    setNombre(activa?.nombre || "");
    setSecretKey("");
    setShowKey(false);
    setMoneda(activa?.moneda_default || "usd");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (mode === "create" && !secretKey.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Pega la llave de Stripe",
        confirmButtonColor: "#171931",
      });
      return;
    }
    setSaving(true);
    try {
      if (mode === "create") {
        await chatApi.post("stripe_integrations", {
          id_configuracion,
          nombre: nombre.trim(),
          secret_key: secretKey.trim(),
          moneda_default: moneda,
        });
        setShowModal(false);
        await fetchIntegraciones();
        toast("Stripe vinculado");
      } else {
        const payload = { nombre: nombre.trim(), moneda_default: moneda };
        if (secretKey.trim()) payload.secret_key = secretKey.trim();
        await chatApi.patch(`stripe_integrations/${activa.id}`, payload);
        setShowModal(false);
        await fetchIntegraciones();
        toast("Cambios guardados");
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "No se pudo vincular",
        text: errMsg(error, "Revisa la llave e intenta de nuevo."),
        confirmButtonColor: "#d33",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const r = await Swal.fire({
      icon: "warning",
      title: "Eliminar vinculación",
      html: "Tus asesores dejarán de poder crear enlaces de pago.<br/>Los enlaces ya enviados siguen funcionando en tu Stripe.",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#171931",
    });
    if (!r.isConfirmed) return;
    setSaving(true);
    try {
      await chatApi.delete(`stripe_integrations/${activa.id}`);
      await fetchIntegraciones();
      toast("Vinculación eliminada");
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: errMsg(error, "No se pudo eliminar."),
        confirmButtonColor: "#d33",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleProbar = async () => {
    if (!activa) return;
    setProbando(true);
    try {
      const res = await chatApi.get(`stripe_integrations/${activa.id}/probar`);
      const d = res?.data?.data || {};
      if (d.ok) {
        toast(
          `Conexión correcta · ${d.modo === "test" ? "modo de pruebas" : "producción"}`,
        );
        await fetchIntegraciones();
      } else {
        Swal.fire({
          icon: "error",
          title: "La llave ya no es válida",
          text:
            d.error || "Genera una llave nueva en Stripe y actualízala aquí.",
          confirmButtonColor: "#d33",
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: errMsg(error, "No se pudo probar la conexión."),
        confirmButtonColor: "#d33",
      });
    } finally {
      setProbando(false);
    }
  };

  return (
    <div className="p-5">
      {/* HERO */}
      <div className="mb-6 rounded-2xl bg-[#171931] text-white p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Cobra por WhatsApp con tu Stripe
            </h1>
            <p className="opacity-90 mt-1">
              Conecta <strong>Stripe</strong> y tus asesores envían enlaces de
              pago desde el chat. El cliente paga con tarjeta y el dinero entra
              directo a tu cuenta.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur text-sm">
              Estado:{" "}
              <strong className="ml-1">
                {isLinked ? "Conectado" : "Desconectado"}
              </strong>
            </span>
            <button
              onClick={isLinked ? openEdit : openCreate}
              className="ml-2 bg-white text-[#171931] hover:bg-gray-50 transition px-3 py-1.5 rounded-lg text-sm font-semibold shadow"
            >
              {isLinked ? "Administrar integración →" : "Vincular ahora"}
            </button>
          </div>
        </div>
      </div>

      {/* Pestañas */}
      {(isLinked || hayHistorial || tab === "cobros") && (
        <div className="mb-6 flex gap-2">
          {[
            { k: "integracion", l: "Integración", icon: "bx-plug" },
            { k: "cobros", l: "Cobros", icon: "bx-receipt" },
          ].map((t) => (
            <button
              key={t.k}
              type="button"
              onClick={() => setTab(t.k)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                tab === t.k
                  ? "bg-[#171931] text-white shadow"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              <i className={`bx ${t.icon}`} />
              {t.l}
            </button>
          ))}
        </div>
      )}

      {tab === "cobros" ? (
        <HistorialCobrosStripe
          id_configuracion={id_configuracion}
          moneda={activa?.moneda_default || "usd"}
        />
      ) : (
        <>
          {/* Guía / estado */}
          {!isLinked ? (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <div className="flex items-start gap-3">
                <i className="bx bx-rocket text-2xl text-amber-600" />
                <div>
                  <h3 className="font-semibold">Empieza en 3 pasos</h3>
                  <ol className="list-decimal ml-5 mt-2 text-sm space-y-1">
                    <li>
                      En Stripe crea una <strong>clave restringida</strong> con
                      permisos de <strong>Customers</strong> e{" "}
                      <strong>Invoices</strong>.
                    </li>
                    <li>
                      Haz clic en <strong>Vincular ahora</strong>, pega la clave
                      y elige la moneda en la que cobras.
                    </li>
                    <li>
                      En cualquier chat de WhatsApp toca <strong>+</strong> →{" "}
                      <strong>Crear enlace de pago</strong>.
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          ) : esTest ? (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <div className="flex items-start gap-3">
                <i className="bx bx-flask text-2xl text-amber-600" />
                <div>
                  <h3 className="font-semibold">
                    Vinculado en modo de pruebas
                  </h3>
                  <p className="text-sm mt-1">
                    Los enlaces que se creen no cobran dinero real. Para cobrar
                    de verdad, edita la vinculación y pega una llave de
                    producción.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
              <div className="flex items-start gap-3">
                <i className="bx bx-check-circle text-2xl text-emerald-600" />
                <div>
                  <h3 className="font-semibold">¡Vinculación activa!</h3>
                  <p className="text-sm mt-1">
                    En cualquier chat de WhatsApp toca <strong>+</strong> →{" "}
                    <strong>Crear enlace de pago</strong>. En la pestaña{" "}
                    <strong>Historial</strong> de esa misma ventana ves si cada
                    cobro está pendiente, pagado o anulado.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Contenido principal */}
          <div className="overflow-visible bg-white p-6 rounded-2xl shadow-md relative z-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CARD Stripe */}
              <div
                onClick={() => {
                  if (!isLinked) openCreate();
                }}
                className={`relative ${
                  !isLinked ? "cursor-pointer" : "cursor-default"
                } bg-white rounded-xl overflow-hidden shadow-lg transform transition duration-300 hover:shadow-2xl`}
              >
                <div className="absolute top-3 right-3 z-10">
                  <span
                    className={`text-white text-xs px-2 py-0.5 rounded-full shadow-sm ${
                      isLinked ? "bg-green-500" : "bg-red-500"
                    }`}
                  >
                    {isLinked ? "Conectado" : "Desconectado"}
                  </span>
                </div>

                <div className="flex justify-center items-center px-6 py-8 min-h-[140px] bg-gray-50">
                  <LogoStripe size="lg" />
                </div>

                <div className="p-5">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Stripe
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Cobros con tarjeta desde el chat, con recibo para el cliente
                    y aviso cuando se paga.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                      Anticipos
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                      Saldos pendientes
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                      Pago con tarjeta
                    </span>
                  </div>

                  {isLinked && (
                    <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
                      <div className="text-sm text-gray-700">
                        <div>
                          <strong>Cuenta:</strong>{" "}
                          {activa.account_nombre || activa.nombre}
                        </div>
                        <div className="mt-1">
                          <strong>Moneda:</strong>{" "}
                          {String(activa.moneda_default || "usd").toUpperCase()}
                        </div>
                        <div className="mt-1">
                          <strong>Llave:</strong> ****{activa.key_last4}
                          <span className="text-xs text-gray-400 ml-2">
                            (oculta por seguridad)
                          </span>
                          <span
                            className={`ml-2 text-[10px] px-2 py-0.5 rounded-full ${
                              esTest
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {esTest ? "pruebas" : "producción"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-5">
                    {!isLinked ? (
                      <button
                        onClick={openCreate}
                        className="w-full bg-[#171931] text-white font-semibold py-2 rounded-lg hover:opacity-95 transition"
                      >
                        Vincular ahora
                      </button>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={openEdit}
                          className="w-full bg-gray-100 text-gray-800 font-semibold py-2 rounded-lg hover:bg-gray-200 transition"
                          disabled={saving}
                        >
                          Editar
                        </button>
                        <button
                          onClick={handleDelete}
                          className="w-full bg-red-600 text-white font-semibold py-2 rounded-lg hover:bg-red-700 transition"
                          disabled={saving}
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>

                  {!isLinked ? (
                    <p className="text-xs text-gray-400 mt-3">
                      * Solo se permite 1 vinculación por configuración.
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Beneficios */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h4 className="text-lg font-semibold text-gray-900">
                  ¿Por qué vincular Stripe?
                </h4>

                <ul className="mt-3 space-y-2 text-sm text-gray-700">
                  <li className="flex gap-2">
                    <i className="bx bx-link text-lg text-indigo-500 shrink-0" />
                    <span>
                      <strong>Cobra sin salir del chat:</strong> el asesor
                      escribe el monto y el concepto, y el enlace llega al
                      cliente como mensaje.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <i className="bx bx-credit-card text-lg text-emerald-600 shrink-0" />
                    <span>
                      <strong>El cliente paga con tarjeta:</strong> en una
                      página segura de Stripe y con recibo en PDF. Se acabaron
                      las transferencias con captura.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <i className="bx bx-bell text-lg text-amber-500 shrink-0" />
                    <span>
                      <strong>Sabes cuándo pagó:</strong> el chat avisa al
                      asesor y cada cobro queda como pendiente, pagado o
                      anulado.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <i className="bx bx-wallet text-lg text-sky-500 shrink-0" />
                    <span>
                      <strong>El dinero es tuyo:</strong> entra directo a tu
                      cuenta de Stripe, sin comisión de ImporChat.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <i className="bx bx-lock-alt text-lg text-slate-500 shrink-0" />
                    <span>
                      <strong>Seguro:</strong> tu llave se guarda cifrada y solo
                      se usa para crear y consultar los cobros.
                    </span>
                  </li>
                </ul>

                <div className="mt-5 grid grid-cols-1 gap-3">
                  {!isLinked ? (
                    <button
                      onClick={openCreate}
                      className="w-full text-center bg-[#171931] text-white font-semibold py-2 rounded-lg hover:opacity-95 transition"
                      disabled={!id_configuracion}
                    >
                      Conectar Stripe
                    </button>
                  ) : (
                    <button
                      onClick={handleProbar}
                      className="w-full text-center bg-gray-100 text-gray-800 font-semibold py-2 rounded-lg hover:bg-gray-200 transition"
                      disabled={probando}
                    >
                      {probando ? "Probando..." : "Probar conexión"}
                    </button>
                  )}

                  <button
                    onClick={fetchIntegraciones}
                    className="w-full text-center bg-gray-100 text-gray-800 font-semibold py-2 rounded-lg hover:bg-gray-200 transition"
                    disabled={loading || !id_configuracion}
                  >
                    {loading ? "Actualizando..." : "Refrescar"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Cómo obtener la llave */}
          <div className="mt-6 bg-white p-6 rounded-2xl shadow-md">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">
                  Cómo obtener tu llave en Stripe
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  Toma dos minutos. Crea una <strong>clave restringida</strong>:
                  solo puede hacer lo que esta integración necesita.
                </p>
              </div>
              <a
                href={STRIPE_KEYS_URL}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 inline-flex items-center gap-2 bg-[#171931] text-white font-semibold px-4 py-2 rounded-lg hover:opacity-95 transition text-sm"
              >
                <i className="bx bx-link-external"></i> Abrir claves de API en
                Stripe
              </a>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-5">
              <ol className="list-decimal ml-5 text-sm text-gray-700 space-y-2">
                <li>
                  Entra a Stripe y, arriba a la derecha, apaga el interruptor{" "}
                  <strong>Test mode</strong> para que la llave cobre dinero
                  real.
                </li>
                <li>
                  Ve a <strong>Developers → API keys</strong> (o usa el botón de
                  arriba).
                </li>
                <li>
                  Haz clic en <strong>Create restricted key</strong>, ponle un
                  nombre como “ImporChat cobros” y marca los permisos de la
                  tabla.
                </li>
                <li>
                  Copia la llave (empieza por <strong>rk_live_</strong>) y
                  pégala aquí con <strong>Vincular ahora</strong>. Stripe la
                  muestra una sola vez; si la pierdes, crea otra.
                </li>
              </ol>

              <div>
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold">
                          Recurso en Stripe
                        </th>
                        <th className="text-left px-3 py-2 font-semibold">
                          Permiso
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {PERMISOS.map((p) => (
                        <tr key={p.recurso} className="border-t">
                          <td className="px-3 py-2 font-semibold text-gray-800">
                            {p.recurso}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                p.nivel === "Write"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {p.nivel}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  También funciona la clave secreta completa (sk_live_), pero da
                  acceso a toda tu cuenta. La restringida es más segura.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Diálogo de vinculación (misma línea visual que Dropi) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a1a36]/50 backdrop-blur-md p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[92vh] flex flex-col">
            {/* Encabezado blanco con el logo como protagonista */}
            <div className="relative bg-white border-b border-gray-100 px-6 pt-7 pb-5 text-center shrink-0">
              <button
                onClick={closeModal}
                className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="Cerrar"
                disabled={saving}
              >
                <i className="bx bx-x text-xl" />
              </button>

              <LogoStripe />

              <h2 className="text-lg font-bold text-gray-900 mt-3">
                {mode === "create" ? "Vincular Stripe" : "Editar vinculación"}
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                {mode === "create"
                  ? "Pega la clave restringida que creaste en Stripe."
                  : "Actualiza los datos. Pega la llave solo si necesitas cambiarla."}
              </p>
            </div>

            {/* Cuerpo */}
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Nombre
                  </label>
                  <input
                    type="text"
                    // name raro + autoComplete off: que Chrome NO meta aquí el
                    // correo de Google creyendo que es un login.
                    name="stripe_integration_nombre"
                    autoComplete="off"
                    placeholder="Ej: Mi tienda"
                    className="mt-1.5 w-full px-3.5 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/25 focus:border-[#1d4ed8] focus:bg-white transition-all duration-200"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Moneda
                  </label>
                  <select
                    name="stripe_integration_moneda"
                    value={moneda}
                    onChange={(e) => setMoneda(e.target.value)}
                    className="mt-1.5 w-full px-3.5 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/25 focus:border-[#1d4ed8] focus:bg-white transition-all duration-200"
                  >
                    {MONEDAS.map((m) => (
                      <option key={m.v} value={m.v}>
                        {m.l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Llave */}
              <div className="mt-4">
                <label className="text-sm font-semibold text-gray-700">
                  Llave de Stripe{" "}
                  {mode === "edit" ? (
                    <span className="font-normal text-gray-400">
                      (opcional si no deseas cambiarla)
                    </span>
                  ) : (
                    ""
                  )}
                </label>

                <div className="relative mt-1.5">
                  <input
                    // NO usar type="password": Chrome lo toma por un login y
                    // ofrece guardar correo/contraseña. Se enmascara con CSS
                    // (WebkitTextSecurity) y el gestor de contraseñas no
                    // toca el campo.
                    type="text"
                    name="stripe_integration_key"
                    autoComplete="off"
                    style={{
                      WebkitTextSecurity: showKey ? "none" : "disc",
                    }}
                    placeholder={
                      mode === "edit"
                        ? "Pega una llave nueva solo si deseas cambiarla"
                        : "Pega aquí la llave creada en Stripe (rk_live_…)"
                    }
                    className="w-full px-3.5 py-2.5 pr-11 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/25 focus:border-[#1d4ed8] focus:bg-white transition-all duration-200"
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    spellCheck={false}
                  />

                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 grid place-items-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                    title={showKey ? "Ocultar llave" : "Mostrar llave"}
                    aria-label={showKey ? "Ocultar llave" : "Mostrar llave"}
                  >
                    <i className={`bx ${showKey ? "bx-hide" : "bx-show"}`} />
                  </button>
                </div>

                <p className="text-xs text-gray-400 mt-1.5">
                  La encuentras en Stripe{" "}
                  <i className="bx bx-chevron-right align-middle" />
                  Developers <i className="bx bx-chevron-right align-middle" />
                  API keys. La validamos antes de guardarla y luego no se
                  mostrará completa.
                </p>
              </div>

              {/* Acciones */}
              <div className="flex items-center justify-end gap-2 pt-5">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 font-medium hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 disabled:opacity-50"
                  disabled={saving}
                >
                  Cancelar
                </button>

                <button
                  onClick={handleSave}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1d4ed8] text-sm text-white font-semibold hover:bg-[#1e40af] shadow-sm transition-all duration-200 disabled:opacity-70"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <i className="bx bx-loader-alt bx-spin" />
                      Validando
                    </>
                  ) : mode === "create" ? (
                    "Vincular"
                  ) : (
                    "Guardar cambios"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
