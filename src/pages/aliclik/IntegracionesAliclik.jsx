import React, { useEffect, useState, useCallback } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";

/**
 * Pantalla de integración con Aliclik (fulfillment Perú).
 *
 * Espeja a IntegracionesDropi: mismo hero, misma paleta (#171931) y la misma
 * estructura de tarjeta + panel lateral, porque para el cliente son el mismo
 * tipo de producto — un proveedor de dropshipping que se conecta con un token.
 *
 * La diferencia real está en el segundo paso: además del token, hay que copiar
 * la URL de notificaciones y pegarla en el panel de Aliclik. Sin eso la
 * vinculación queda a medias — el sistema puede consultar pedidos, pero se
 * entera de los cambios de estado solo cada 15 minutos, por el cron. Por eso la
 * URL tiene su propio panel y no un rincón.
 */

/* El logo se guarda en el repo en vez de enlazar al de su admin: la URL que
   publican (.../static/media/logo.<hash>.svg) lleva el hash del build de su
   SPA y cambia cada vez que despliegan, así que el enlace se rompería solo. */
import aliclikLogo from "../../assets/aliclik_logo.svg";

const ALICLIK_PANEL_URL = "https://aliclik.app";

export default function IntegracionesAliclik() {
  const [id_configuracion, setIdConfiguracion] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [probando, setProbando] = useState(false);
  const [integraciones, setIntegraciones] = useState([]);

  const activa = integraciones.length ? integraciones[0] : null;
  const isLinked = !!activa;

  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState("create");
  const [storeName, setStoreName] = useState("");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    const idc = localStorage.getItem("id_configuracion");
    if (idc) setIdConfiguracion(parseInt(idc, 10));
  }, []);

  /* El panel de pedidos del chat decide qué proveedor mostrar leyendo el
     contexto de fulfillment (context/DropiProvider). Ese contexto no se entera
     solo de que se vinculó o se desvinculó Aliclik: hay que avisarle, igual
     que hace la pantalla de Dropi con su propio evento. */
  const avisarCambioVinculacion = () =>
    window.dispatchEvent(new Event('aliclik:linked-changed'));

  const fetchIntegraciones = useCallback(async () => {
    if (!id_configuracion) return;
    setLoading(true);
    try {
      const res = await chatApi.get("aliclik_integrations", {
        params: { id_configuracion },
      });
      setIntegraciones(res?.data?.data ?? []);
    } catch (error) {
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

  const openCreate = () => {
    setMode("create");
    setStoreName(localStorage.getItem("nombre_configuracion") || "");
    setToken("");
    setShowToken(false);
    setShowModal(true);
  };

  const openEdit = () => {
    setMode("edit");
    setStoreName(activa?.store_name || "");
    setToken("");
    setShowToken(false);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!storeName.trim()) {
      Swal.fire({ icon: "warning", title: "Falta el nombre de la tienda" });
      return;
    }
    if (mode === "create" && !token.trim()) {
      Swal.fire({ icon: "warning", title: "Falta el token de Aliclik" });
      return;
    }

    setSaving(true);
    try {
      if (mode === "create") {
        const res = await chatApi.post("aliclik_integrations", {
          id_configuracion,
          store_name: storeName.trim(),
          token: token.trim(),
        });
        setShowModal(false);
        await fetchIntegraciones();
        avisarCambioVinculacion();
        const urlWebhook = res?.data?.data?.webhook_url;
        Swal.fire({
          // Sin URL la vinculación quedó a medias: el token sirve para
          // consultar, pero los cambios de estado solo llegarían por el cron
          // (hasta 15 min tarde). Se dice, no se celebra igual.
          icon: urlWebhook ? "success" : "warning",
          title: urlWebhook ? "Aliclik vinculado" : "Aliclik vinculado a medias",
          html: urlWebhook
            ? `<p style="margin-bottom:8px">Falta un paso: copia tu URL de notificaciones y pégala en el panel de Aliclik.</p>
                 <code style="font-size:11px;word-break:break-all">${urlWebhook}</code>`
            : `<p style="font-size:.9rem;color:#92400e">${
                res?.data?.instrucciones ||
                "No se pudo generar la URL de notificaciones en este servidor."
              }</p>`,
          confirmButtonColor: "#171931",
        });
      } else {
        const payload = { store_name: storeName.trim() };
        if (token.trim()) payload.token = token.trim();
        await chatApi.patch(`aliclik_integrations/${activa.id}`, payload);
        setShowModal(false);
        await fetchIntegraciones();
        avisarCambioVinculacion();
        Swal.fire({
          icon: "success",
          title: "Integración actualizada",
          confirmButtonColor: "#171931",
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: errMsg(error, "No se pudo guardar la integración."),
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
      text: "Dejarás de recibir los cambios de estado de tus pedidos de Aliclik.",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#d33",
      reverseButtons: true,
    });
    if (!r.isConfirmed) return;

    setSaving(true);
    try {
      await chatApi.delete(`aliclik_integrations/${activa.id}`);
      await fetchIntegraciones();
      avisarCambioVinculacion();
      Swal.fire({
        icon: "success",
        title: "Vinculación eliminada",
        confirmButtonColor: "#171931",
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: errMsg(error, "No se pudo eliminar la integración."),
        confirmButtonColor: "#d33",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleProbar = async () => {
    setProbando(true);
    try {
      const res = await chatApi.get(`aliclik_integrations/${activa.id}/probar`);
      const d = res?.data?.data || {};
      await fetchIntegraciones();
      Swal.fire({
        icon: "success",
        title: "Conexión correcta",
        html: `<p>Aliclik respondió correctamente.</p>
               <p style="margin-top:8px"><strong>${d.total_pedidos ?? 0}</strong> pedidos visibles para esta integración.</p>`,
        confirmButtonColor: "#171931",
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "No se pudo conectar",
        text: errMsg(error, "Aliclik no respondió."),
        confirmButtonColor: "#d33",
      });
    } finally {
      setProbando(false);
    }
  };

  const handleRotar = async () => {
    const r = await Swal.fire({
      icon: "warning",
      title: "Generar una URL nueva",
      text: "La URL actual dejará de recibir eventos. Tendrás que pegar la nueva en el panel de Aliclik.",
      showCancelButton: true,
      confirmButtonText: "Generar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#d33",
      reverseButtons: true,
    });
    if (!r.isConfirmed) return;

    setSaving(true);
    try {
      await chatApi.post(`aliclik_integrations/${activa.id}/rotar-webhook`);
      await fetchIntegraciones();
      Swal.fire({
        icon: "success",
        title: "URL regenerada",
        text: "Copia la nueva y pégala en el panel de Aliclik.",
        confirmButtonColor: "#171931",
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: errMsg(error, "No se pudo regenerar."),
        confirmButtonColor: "#d33",
      });
    } finally {
      setSaving(false);
    }
  };

  const copiar = async (texto) => {
    try {
      await navigator.clipboard.writeText(texto);
      Swal.fire({
        icon: "success",
        title: "Copiado",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (_) {
      Swal.fire({ icon: "error", title: "No se pudo copiar" });
    }
  };

  const dias = activa?.token_dias_restantes;
  const tokenVencido = dias !== null && dias !== undefined && dias <= 0;
  const tokenPorVencer =
    !tokenVencido && dias !== null && dias !== undefined && dias <= 7;

  return (
    <div className="p-5">
      {/* HERO */}
      <div className="mb-6 rounded-2xl bg-[#171931] text-white p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Vende en Perú sin inventario
            </h1>
            <p className="opacity-90 mt-1">
              Conecta <strong>Aliclik</strong> para despachar contraentrega o
              con recojo en agencia y automatizar los avisos a tus clientes.
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

      {/* Guía / estado */}
      {!isLinked ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-start gap-3">
            <i className="bx bx-rocket text-2xl text-amber-600" />
            <div>
              <h3 className="font-semibold">Empieza en 3 pasos</h3>
              <ol className="list-decimal ml-5 mt-2 text-sm space-y-1">
                <li>
                  En Aliclik, entra a la configuración de tu integración y copia
                  el <strong>Token de acceso</strong>.
                </li>
                <li>
                  Haz clic en <strong>vincular ahora</strong> y pega el token con
                  el nombre de tu tienda.
                </li>
                <li>
                  Copia la <strong>URL de notificaciones</strong> que te
                  devolvemos y pégala en Aliclik, en{" "}
                  <strong>Webhook de notificaciones</strong>.
                </li>
              </ol>
            </div>
          </div>
        </div>
      ) : tokenVencido || tokenPorVencer ? (
        /* El token de Aliclik dura 30 días. Cuando caduca, su API responde 401
           y la integración deja de recibir estados sin ninguna señal visible:
           por eso el aviso reemplaza al mensaje de "todo bien". */
        <div
          className={`mb-6 rounded-xl border p-4 ${
            tokenVencido
              ? "border-red-200 bg-red-50 text-red-900"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          <div className="flex items-start gap-3">
            <i
              className={`bx ${
                tokenVencido ? "bx-error-circle" : "bx-time-five"
              } text-2xl ${tokenVencido ? "text-red-600" : "text-amber-600"}`}
            />
            <div>
              <h3 className="font-semibold">
                {tokenVencido
                  ? "El token de Aliclik expiró"
                  : `El token vence en ${dias} día${dias === 1 ? "" : "s"}`}
              </h3>
              <p className="text-sm mt-1">
                {tokenVencido
                  ? "No se están recibiendo los cambios de estado de tus pedidos. Genera un token nuevo en Aliclik y actualízalo aquí."
                  : "Cuando expire dejarás de recibir los cambios de estado. Genera uno nuevo en Aliclik antes de esa fecha."}
              </p>
              <button
                onClick={openEdit}
                className="mt-2 text-sm font-semibold underline"
              >
                Actualizar token
              </button>
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
                Aliclik está conectado. Los cambios de estado de tus pedidos
                disparan las plantillas que configures.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="overflow-visible bg-white p-6 rounded-2xl shadow-md relative z-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CARD Aliclik */}
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

            <div className="flex justify-center items-center px-6 py-8 min-h-[140px]">
              <img
                src={aliclikLogo}
                alt="Aliclik"
                className="w-full max-w-[280px] max-h-[100px] object-contain"
              />
            </div>

            <div className="p-5">
              <h3 className="text-xl font-semibold text-gray-800">
                Aliclik{" "}
                <span className="text-sm font-normal text-gray-500">· Perú</span>
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Despacha contraentrega o con recojo en agencia desde sus
                almacenes, sin comprar inventario por adelantado.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                  Dropshipping
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                  Contraentrega
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                  Recojo en agencia
                </span>
              </div>

              {isLinked && (
                <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="text-sm text-gray-700 space-y-1">
                    <div>
                      <strong>Tienda:</strong> {activa.store_name}
                    </div>
                    <div>
                      <strong>Token:</strong> ****{activa.token_last4 || "****"}
                      <span className="text-xs text-gray-400 ml-2">
                        (oculto por seguridad)
                      </span>
                    </div>
                    <div>
                      <strong>Vence:</strong>{" "}
                      {activa.token_exp_at
                        ? new Date(activa.token_exp_at).toLocaleDateString(
                            "es-PE",
                            { day: "2-digit", month: "short", year: "numeric" },
                          )
                        : "—"}
                      {dias !== null && dias !== undefined && (
                        <span className="text-xs text-gray-400 ml-1">
                          ({dias} días)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-5">
                {!isLinked ? (
                  <button
                    onClick={openCreate}
                    disabled={!id_configuracion}
                    className="w-full bg-[#171931] text-white font-semibold py-2 rounded-lg hover:opacity-95 transition disabled:opacity-50"
                  >
                    Vincular ahora
                  </button>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={handleProbar}
                      disabled={probando}
                      className="bg-gray-100 text-gray-800 font-semibold py-2 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 text-sm"
                    >
                      {probando ? "..." : "Probar"}
                    </button>
                    <button
                      onClick={openEdit}
                      disabled={saving}
                      className="bg-gray-100 text-gray-800 font-semibold py-2 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 text-sm"
                    >
                      Editar
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={saving}
                      className="bg-red-600 text-white font-semibold py-2 rounded-lg hover:bg-red-700 transition disabled:opacity-50 text-sm"
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

          {/* Panel derecho: beneficios (sin vincular) o la URL (vinculado) */}
          {!isLinked ? (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h4 className="text-lg font-semibold text-gray-900">
                ¿Por qué vincular Aliclik?
              </h4>

              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                <li className="flex gap-2">
                  <i className="bx bx-message-rounded-dots text-lg text-emerald-600 shrink-0" />
                  <span>
                    <strong>Avisos automáticos:</strong> cada cambio de estado
                    dispara la plantilla de WhatsApp que configures.
                  </span>
                </li>
                <li className="flex gap-2">
                  <i className="bx bx-columns text-lg text-indigo-500 shrink-0" />
                  <span>
                    <strong>Kanban al día:</strong> el contacto se mueve de
                    columna solo, según el estado del pedido.
                  </span>
                </li>
                <li className="flex gap-2">
                  <i className="bx bx-store text-lg text-sky-500 shrink-0" />
                  <span>
                    <strong>Sin inventario:</strong> despacho desde los almacenes
                    de Aliclik, a domicilio o por agencia.
                  </span>
                </li>
                <li className="flex gap-2">
                  <i className="bx bx-map-pin text-lg text-violet-500 shrink-0" />
                  <span>
                    <strong>Cobertura nacional:</strong> más de 500 agencias
                    para recojo en todo el Perú.
                  </span>
                </li>
              </ul>

              <button
                onClick={openCreate}
                disabled={!id_configuracion}
                className="mt-5 w-full bg-[#171931] text-white font-semibold py-2 rounded-lg hover:opacity-95 transition disabled:opacity-50"
              >
                Conectar Aliclik
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
              <h4 className="font-semibold text-indigo-900 flex items-center gap-2">
                <i className="bx bx-link-alt text-xl" />
                URL de notificaciones
              </h4>
              <p className="text-sm text-indigo-900/80 mt-1">
                Pégala en Aliclik, en <strong>Webhook de notificaciones</strong>.
                Sin esto los cambios de estado llegan con hasta 15 minutos de
                retraso.
              </p>

              {/* Sin PUBLIC_BASE_URL en el servidor no hay URL que pegar. Se
                  avisa en vez de mostrar algo incopiable: antes salía la ruta
                  relativa, el cliente la pegaba igual y no llegaba ni un
                  evento, sin ningún error visible. */}
              {activa.webhook_url ? (
                <>
                  <div className="mt-3 rounded-lg bg-white border border-indigo-200 p-3">
                    <code className="text-[11px] text-gray-800 break-all block">
                      {activa.webhook_url}
                    </code>
                  </div>

                  <button
                    onClick={() => copiar(activa.webhook_url)}
                    className="mt-3 w-full bg-[#171931] text-white font-semibold py-2 rounded-lg hover:opacity-95 transition"
                  >
                    Copiar URL
                  </button>
                </>
              ) : (
                <div className="mt-3 rounded-lg bg-amber-50 border border-amber-300 p-3">
                  <p className="text-[12px] text-amber-900 flex items-start gap-2">
                    <i className="bx bxs-error-circle text-base shrink-0 mt-px" />
                    <span>
                      {activa.webhook_url_error ||
                        "No se pudo generar la URL de notificaciones en este servidor."}
                    </span>
                  </p>
                </div>
              )}

              <div className="mt-3 flex items-center justify-between text-xs">
                <a
                  href={ALICLIK_PANEL_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-900/70 hover:text-indigo-900 underline"
                >
                  Abrir panel de Aliclik
                </a>
                <button
                  onClick={handleRotar}
                  disabled={saving}
                  className="text-indigo-900/70 hover:text-indigo-900 underline disabled:opacity-50"
                >
                  Generar una URL nueva
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                <div className="flex items-start gap-3">
                  <i className="bx bx-lock-alt text-2xl text-amber-600" />
                  <div className="text-sm">
                    <p className="font-semibold">Manténla en privado</p>
                    <p className="mt-1">
                      Esta URL es única de tu cuenta y no lleva firma: cualquiera
                      que la tenga podría simular cambios de estado en tus
                      pedidos.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a1a36]/50 backdrop-blur-md p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[92vh] flex flex-col">
            <div className="relative bg-white border-b border-gray-100 px-6 pt-7 pb-5 text-center shrink-0">
              <button
                onClick={() => setShowModal(false)}
                className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="Cerrar"
                disabled={saving}
              >
                <i className="bx bx-x text-xl" />
              </button>

              <img
                src={aliclikLogo}
                alt="Aliclik"
                className="h-9 w-auto object-contain mx-auto"
              />

              <h2 className="text-lg font-bold text-gray-900 mt-3">
                {mode === "create"
                  ? "Vincular Aliclik"
                  : "Editar vinculación"}
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                {mode === "create"
                  ? "Registra tu tienda y pega el token generado en Aliclik."
                  : "Actualiza los datos. Pega el token solo si necesitas cambiarlo."}
              </p>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de la tienda
                </label>
                <input
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Ej. IMPORFACTORY PRUEBAS"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#171931] focus:ring-2 focus:ring-[#171931]/10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Token de acceso de Aliclik
                  {mode === "edit" && (
                    <span className="font-normal text-gray-400 ml-1">
                      (déjalo vacío para no cambiarlo)
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={showToken ? "text" : "password"}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 pr-10 text-sm outline-none focus:border-[#171931] focus:ring-2 focus:ring-[#171931]/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                  >
                    <i
                      className={`bx ${showToken ? "bx-hide" : "bx-show"} text-lg`}
                    />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Lo encuentras en Aliclik, en la configuración de tu
                  integración, bajo “Token de acceso”.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 shrink-0">
              <button
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 font-semibold hover:bg-gray-200 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-[#171931] text-white font-semibold hover:opacity-95 transition disabled:opacity-50"
              >
                {saving
                  ? "Guardando..."
                  : mode === "create"
                    ? "Vincular"
                    : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
