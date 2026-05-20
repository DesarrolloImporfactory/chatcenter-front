import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";
import Select from "react-select";

const SHOPIFY_LOGO_URL =
  "https://upload.wikimedia.org/wikipedia/commons/0/0e/Shopify_logo_2018.svg";

const COUNTRY_PHONE_OPTIONS = [
  { value: "593", label: "🇪🇨 Ecuador (+593)" },
  { value: "57", label: "🇨🇴 Colombia (+57)" },
  { value: "52", label: "🇲🇽 México (+52)" },
  { value: "51", label: "🇵🇪 Perú (+51)" },
  { value: "56", label: "🇨🇱 Chile (+56)" },
  { value: "54", label: "🇦🇷 Argentina (+54)" },
  { value: "591", label: "🇧🇴 Bolivia (+591)" },
  { value: "595", label: "🇵🇾 Paraguay (+595)" },
  { value: "598", label: "🇺🇾 Uruguay (+598)" },
  { value: "58", label: "🇻🇪 Venezuela (+58)" },
  { value: "507", label: "🇵🇦 Panamá (+507)" },
  { value: "506", label: "🇨🇷 Costa Rica (+506)" },
  { value: "1809", label: "🇩🇴 Rep. Dominicana (+1809)" },
  { value: "502", label: "🇬🇹 Guatemala (+502)" },
  { value: "503", label: "🇸🇻 El Salvador (+503)" },
  { value: "504", label: "🇭🇳 Honduras (+504)" },
  { value: "505", label: "🇳🇮 Nicaragua (+505)" },
  { value: "1", label: "🇺🇸 Estados Unidos (+1)" },
  { value: "34", label: "🇪🇸 España (+34)" },
];

const selectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: "0.75rem",
    borderColor: state.isFocused ? "#171931" : base.borderColor,
    boxShadow: state.isFocused ? "0 0 0 2px rgba(23,25,49,0.12)" : "none",
    minHeight: "42px",
  }),
  valueContainer: (base) => ({ ...base, padding: "2px 12px" }),
  indicatorsContainer: (base) => ({ ...base, height: "42px" }),
  menu: (base) => ({ ...base, borderRadius: "0.75rem", overflow: "hidden" }),
};

const emitShopifyLinkedChanged = (payload = {}) => {
  window.dispatchEvent(
    new CustomEvent("shopify:linked-changed", { detail: payload }),
  );
};

// URLs base de los webhooks (lo que el usuario debe pegar en Shopify)
const WEBHOOK_BASE_URL =
  "https://chat.imporfactory.app/api/v2/webhooks/shopify";

const IntegracionShopify = () => {
  const [id_configuracion, setId_configuracion] = useState(null);

  // data
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [integraciones, setIntegraciones] = useState([]);

  // Solo 1 por configuración
  const activeIntegration = integraciones.length ? integraciones[0] : null;
  const isLinked = !!activeIntegration;

  // modal
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState("create"); // create | edit

  // form
  const [shopDomain, setShopDomain] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [prefijoPaisOpt, setPrefijoPaisOpt] = useState(
    COUNTRY_PHONE_OPTIONS.find((x) => x.value === "593") ||
      COUNTRY_PHONE_OPTIONS[0],
  );
  const [tiempoEsperaHoras, setTiempoEsperaHoras] = useState(1);
  const [showSecret, setShowSecret] = useState(false);

  // Wizard
  const [showWizard, setShowWizard] = useState(false);

  // Input del secret dentro del wizard
  const [newSecretInput, setNewSecretInput] = useState("");

  useEffect(() => {
    const idc = localStorage.getItem("id_configuracion");
    if (idc) setId_configuracion(parseInt(idc, 10));
  }, []);

  useEffect(() => {
    if (id_configuracion) fetchIntegraciones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id_configuracion]);

  const fetchIntegraciones = async () => {
    if (!id_configuracion) return;
    setLoading(true);
    try {
      const res = await chatApi.get("shopify_configuraciones", {
        params: { id_configuracion },
      });
      setIntegraciones(res?.data?.data ?? []);
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "No se pudo cargar la configuración.";
      Swal.fire({
        icon: "error",
        title: "Error al cargar",
        text: msg,
        confirmButtonColor: "#d33",
      });
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setMode("create");
    setShopDomain("");
    setWebhookSecret("");
    setPrefijoPaisOpt(
      COUNTRY_PHONE_OPTIONS.find((x) => x.value === "593") ||
        COUNTRY_PHONE_OPTIONS[0],
    );
    setTiempoEsperaHoras(1);
    setShowModal(true);
  };

  const openEdit = () => {
    if (!activeIntegration) return;
    setMode("edit");
    setShopDomain(activeIntegration.shop_domain ?? "");
    setWebhookSecret(activeIntegration.webhook_secret ?? "");
    const pp = String(activeIntegration.prefijo_pais ?? "593");
    setPrefijoPaisOpt(
      COUNTRY_PHONE_OPTIONS.find((x) => x.value === pp) ||
        COUNTRY_PHONE_OPTIONS[0],
    );
    setTiempoEsperaHoras(activeIntegration.tiempo_espera_horas ?? 1);
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  const validateForm = () => {
    if (!id_configuracion) {
      Swal.fire({
        icon: "error",
        title: "Configuración no detectada",
        text: "No se encontró id_configuracion en su sesión.",
        confirmButtonColor: "#d33",
      });
      return false;
    }

    const sd = String(shopDomain || "")
      .trim()
      .toLowerCase();
    if (!sd) {
      Swal.fire({
        icon: "warning",
        title: "Campo requerido",
        text: "Ingrese el dominio de su tienda Shopify.",
        confirmButtonColor: "#171931",
      });
      return false;
    }

    if (!sd.endsWith(".myshopify.com")) {
      Swal.fire({
        icon: "warning",
        title: "Dominio inválido",
        html: `Debe terminar en <code>.myshopify.com</code><br/>Ejemplo: <code>mitienda.myshopify.com</code>`,
        confirmButtonColor: "#171931",
      });
      return false;
    }

    if (!webhookSecret || webhookSecret.trim().length < 16) {
      Swal.fire({
        icon: "warning",
        title: "Token de webhook requerido",
        html: `Debes pegar el token que aparece en tu Shopify en <strong>Configuración → Notificaciones → Webhooks</strong> donde dice "Tus webhooks se firmarán con token".`,
        confirmButtonColor: "#171931",
      });
      return false;
    }

    if (!prefijoPaisOpt?.value) {
      Swal.fire({
        icon: "warning",
        title: "País requerido",
        text: "Seleccione el país de su tienda.",
        confirmButtonColor: "#171931",
      });
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    if (mode === "create" && isLinked) {
      Swal.fire({
        icon: "info",
        title: "Ya existe una integración",
        text: "Solo puede existir una tienda Shopify por configuración.",
        confirmButtonColor: "#171931",
      });
      return;
    }

    setSaving(true);
    try {
      if (mode === "create") {
        const payload = {
          id_configuracion,
          shop_domain: String(shopDomain).trim().toLowerCase(),
          webhook_secret: webhookSecret.trim(),
          prefijo_pais: prefijoPaisOpt.value,
          tiempo_espera_horas: parseInt(tiempoEsperaHoras, 10) || 1,
        };

        const res = await chatApi.post("shopify_configuraciones", payload);
        if (res?.data?.isSuccess) {
          Swal.fire({
            icon: "success",
            title: "¡Tienda registrada!",
            html: "Ahora configura los webhooks en tu Shopify siguiendo la guía paso a paso.",
            confirmButtonColor: "#171931",
          });
          closeModal();
          await fetchIntegraciones();
          setShowWizard(true); // auto-abre el wizard al crear
          emitShopifyLinkedChanged({ id_configuracion, isLinked: true });
        }
      } else {
        const id = activeIntegration?.id;
        if (!id) throw new Error("No se encontró el ID de la integración.");

        const payload = {
          shop_domain: String(shopDomain).trim().toLowerCase(),
          webhook_secret: webhookSecret.trim(),
          prefijo_pais: prefijoPaisOpt.value,
          tiempo_espera_horas: parseInt(tiempoEsperaHoras, 10) || 1,
        };

        const res = await chatApi.patch(
          `shopify_configuraciones/${id}`,
          payload,
        );
        if (res?.data?.isSuccess) {
          Swal.fire({
            icon: "success",
            title: "Cambios guardados",
            confirmButtonColor: "#171931",
          });
          closeModal();
          await fetchIntegraciones();
        }
      }
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "No se pudo guardar la configuración.";
      Swal.fire({
        icon: "error",
        title: "Error",
        text: msg,
        confirmButtonColor: "#d33",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!activeIntegration?.id) return;

    const r = await Swal.fire({
      icon: "warning",
      title: "Eliminar integración",
      html: `Se eliminará la configuración de <strong>${activeIntegration.shop_domain}</strong>.<br/>Los webhooks dejarán de funcionar y deberás reconfigurarlos si vuelves a conectar.`,
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#171931",
    });

    if (!r.isConfirmed) return;

    setSaving(true);
    try {
      const res = await chatApi.delete(
        `shopify_configuraciones/${activeIntegration.id}`,
      );
      if (res?.data?.isSuccess) {
        Swal.fire({
          icon: "success",
          title: "Integración eliminada",
          confirmButtonColor: "#171931",
        });
        await fetchIntegraciones();
        emitShopifyLinkedChanged({ id_configuracion, isLinked: false });
      }
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "No se pudo eliminar la integración.";
      Swal.fire({
        icon: "error",
        title: "Error",
        text: msg,
        confirmButtonColor: "#d33",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleActualizarSecret = async () => {
    if (!activeIntegration?.id) return;
    if (!newSecretInput || newSecretInput.trim().length < 16) {
      Swal.fire({
        icon: "warning",
        title: "Token requerido",
        text: "Pega el token completo que aparece en Shopify.",
        confirmButtonColor: "#171931",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await chatApi.post(
        `shopify_configuraciones/${activeIntegration.id}/actualizar-secret`,
        { webhook_secret: newSecretInput.trim() },
      );
      if (res?.data?.isSuccess) {
        Swal.fire({
          icon: "success",
          title: "Secret actualizado",
          text: "Los webhooks ahora deberían validarse correctamente.",
          confirmButtonColor: "#171931",
        });
        setNewSecretInput("");
        await fetchIntegraciones();
      }
    } catch (error) {
      const msg =
        error?.response?.data?.message || "No se pudo actualizar el secret.";
      Swal.fire({ icon: "error", title: "Error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text, label = "Copiado") => {
    navigator.clipboard.writeText(text);
    Swal.fire({
      icon: "success",
      title: label,
      timer: 1200,
      showConfirmButton: false,
      toast: true,
      position: "top-end",
    });
  };

  return (
    <div className="p-5">
      {/* HERO */}
      <div className="mb-6 rounded-2xl bg-[#171931] text-white p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Conecta tu tienda Shopify 🛍️
            </h1>
            <p className="opacity-90 mt-1">
              Captura carritos abandonados automáticamente y recupéralos por
              WhatsApp.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur text-sm">
              Estado:{" "}
              <strong className="ml-1">
                {isLinked ? "Conectado" : "Desconectado"}
              </strong>
            </span>

            {!isLinked ? (
              <button
                onClick={openCreate}
                className="ml-2 bg-white text-[#171931] hover:bg-gray-50 transition px-3 py-1.5 rounded-lg text-sm font-semibold shadow"
              >
                Conectar tienda
              </button>
            ) : (
              <button
                onClick={() => setShowWizard((v) => !v)}
                className="ml-2 bg-white text-[#171931] hover:bg-gray-50 transition px-3 py-1.5 rounded-lg text-sm font-semibold shadow"
              >
                {showWizard ? "Ocultar guía" : "Ver guía de webhooks"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Guidance inicial */}
      {!isLinked && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-start gap-3">
            <div className="text-xl">🚀</div>
            <div>
              <h3 className="font-semibold">Empieza en 4 pasos</h3>
              <ol className="list-decimal ml-5 mt-2 text-sm space-y-1">
                <li>
                  Click en <strong>Conectar tienda</strong>.
                </li>
                <li>
                  Ingresa el <strong>dominio interno</strong> de tu tienda
                  Shopify (termina en <code>.myshopify.com</code>).
                </li>
                <li>
                  Sigue la <strong>guía paso a paso</strong> para configurar los
                  webhooks en tu admin de Shopify.
                </li>
                <li>
                  Activa <strong>Releasit COD Form → Carrito Abandonado</strong>{" "}
                  en tu tienda.
                </li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* WIZARD: instrucciones para configurar webhooks en Shopify */}
      {isLinked && showWizard && (
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-md border-l-4 border-[#171931]">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">
              📋 Guía: Configurar webhooks en tu Shopify
            </h3>
            <button
              onClick={() => setShowWizard(false)}
              className="text-gray-500 hover:text-gray-800 text-xl"
            >
              ✕
            </button>
          </div>

          <div className="space-y-5">
            {/* Paso 1 */}
            <div className="border rounded-xl p-4 bg-gray-50">
              <h4 className="font-semibold text-[#171931]">
                Paso 1 — Entra al admin de tu Shopify
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                Ve a: <strong>Configuración → Notificaciones → Webhooks</strong>
              </p>
            </div>

            {/* Paso 2 */}
            <div className="border rounded-xl p-4 bg-gray-50">
              <h4 className="font-semibold text-[#171931]">
                Paso 2 — Crea el webhook de "Creación de pedido preliminar"
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                Click en <strong>"Crear webhook"</strong> y selecciona:
              </p>
              <ul className="text-sm text-gray-700 mt-2 space-y-1 ml-4">
                <li>
                  • <strong>Evento:</strong> Creación de pedido preliminar
                </li>
                <li>
                  • <strong>Formato:</strong> JSON
                </li>
                <li>
                  • <strong>Versión:</strong> última estable (NO unstable)
                </li>
                <li className="flex items-center gap-2 flex-wrap">
                  <span>
                    • <strong>URL:</strong>
                  </span>
                  <code className="bg-white border px-2 py-1 rounded text-xs">
                    {WEBHOOK_BASE_URL}/abandoned-draft
                  </code>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `${WEBHOOK_BASE_URL}/abandoned-draft`,
                        "URL copiada",
                      )
                    }
                    className="text-xs bg-[#171931] text-white px-2 py-1 rounded hover:opacity-90"
                  >
                    📋 Copiar
                  </button>
                </li>
              </ul>
            </div>

            {/* Paso 3 */}
            <div className="border rounded-xl p-4 bg-gray-50">
              <h4 className="font-semibold text-[#171931]">
                Paso 3 — Crea el webhook de "Creación de pedido"
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                Repite el proceso, pero con:
              </p>
              <ul className="text-sm text-gray-700 mt-2 space-y-1 ml-4">
                <li>
                  • <strong>Evento:</strong> Creación de pedido
                </li>
                <li className="flex items-center gap-2 flex-wrap">
                  <span>
                    • <strong>URL:</strong>
                  </span>
                  <code className="bg-white border px-2 py-1 rounded text-xs">
                    {WEBHOOK_BASE_URL}/orders-create
                  </code>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `${WEBHOOK_BASE_URL}/orders-create`,
                        "URL copiada",
                      )
                    }
                    className="text-xs bg-[#171931] text-white px-2 py-1 rounded hover:opacity-90"
                  >
                    📋 Copiar
                  </button>
                </li>
              </ul>
            </div>

            {/* Paso 4 - Webhook secret (nuevo flujo) */}
            <div className="border rounded-xl p-4 bg-blue-50 border-blue-200">
              <h4 className="font-semibold text-[#171931]">
                Paso 4 — Copia el token de firma de Shopify y pégalo aquí
              </h4>
              <p className="text-sm text-gray-700 mt-1">
                En la misma pantalla de Shopify (Configuración → Notificaciones
                → Webhooks), arriba de la lista de webhooks vas a ver un texto
                que dice:
              </p>
              <div className="mt-2 bg-white border rounded p-3 text-sm font-mono text-gray-700">
                "Tus webhooks se firmarán con token:{" "}
                <span className="text-emerald-700">abc123def456...</span>"
              </div>
              <p className="text-sm text-gray-700 mt-2">
                <strong>Copia ese token completo</strong> y pégalo aquí abajo
                para que podamos validar que los webhooks vienen realmente de tu
                tienda:
              </p>

              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <input
                  type={showSecret ? "text" : "password"}
                  placeholder={
                    activeIntegration?.webhook_secret
                      ? "Pegar nuevo token (deja vacío si no quieres cambiar)"
                      : "Pega el token de Shopify aquí"
                  }
                  value={newSecretInput}
                  onChange={(e) => setNewSecretInput(e.target.value)}
                  className="flex-1 min-w-[200px] px-3 py-2 border rounded-lg bg-white text-sm font-mono"
                />
                <button
                  onClick={() => setShowSecret((v) => !v)}
                  className="text-sm bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded-lg"
                >
                  <i className={`bx ${showSecret ? "bx-hide" : "bx-show"}`} />
                </button>
                <button
                  onClick={handleActualizarSecret}
                  disabled={saving}
                  className="text-sm bg-[#171931] text-white px-3 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  💾 Guardar token
                </button>
              </div>

              {activeIntegration?.webhook_secret && (
                <p className="text-xs text-emerald-700 mt-2">
                  ✅ Ya tienes un token guardado. Solo pega uno nuevo si lo
                  cambiaste en Shopify.
                </p>
              )}

              <p className="text-xs text-gray-500 mt-2">
                ⚠️ Si Shopify rota su token (cosa rara, pero pasa si lo
                regeneras), vuelve a copiarlo y pegarlo aquí.
              </p>
            </div>

            {/* Paso 5 - Releasit */}
            <div className="border rounded-xl p-4 bg-emerald-50 border-emerald-200">
              <h4 className="font-semibold text-emerald-800">
                Paso 5 — Activa "Carrito abandonado" en Releasit COD Form
              </h4>
              <ol className="text-sm text-gray-700 mt-2 space-y-1 ml-4 list-decimal">
                <li>
                  En tu admin de Shopify, abre la app{" "}
                  <strong>Releasit COD Form</strong>
                </li>
                <li>
                  Ve a <strong>Impulsor de Ventas → Carrito Abandonado</strong>
                </li>
                <li>
                  Activa la opción{" "}
                  <strong>"Habilitar pagos abandonados"</strong>
                </li>
                <li>
                  ⚠️ <strong>NO actives</strong> "Guardar pedidos como pedidos
                  preliminares" en Releasit → General (rompe el flujo de Dropi)
                </li>
              </ol>
            </div>

            {/* Final */}
            <div className="rounded-xl bg-gradient-to-r from-[#171931] to-indigo-700 text-white p-4">
              <p className="text-sm">
                ✅ <strong>¡Listo!</strong> Cuando un cliente abandone el form
                de Releasit, después de 15 minutos verás el carrito en la
                sección <strong>Shopify → Carritos abandonados</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Estado conectado: mensaje verde */}
      {isLinked && !showWizard && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          <div className="flex items-start gap-3">
            <div className="text-xl">✅</div>
            <div>
              <h3 className="font-semibold">¡Tienda conectada!</h3>
              <p className="text-sm mt-1">
                Tu tienda <strong>{activeIntegration.shop_domain}</strong> está
                lista para capturar carritos abandonados.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="overflow-visible bg-white p-6 rounded-2xl shadow-md relative z-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CARD Shopify */}
          <div
            onClick={() => {
              if (!isLinked) openCreate();
            }}
            className={`relative ${
              !isLinked ? "cursor-pointer" : "cursor-default"
            } bg-white rounded-xl overflow-hidden shadow-lg transform transition duration-300 hover:shadow-2xl`}
          >
            {/* Estado */}
            <div className="absolute top-3 right-3 z-10">
              {isLinked ? (
                <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full shadow-sm">
                  🟢 Conectado
                </span>
              ) : (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full shadow-sm">
                  🔴 Desconectado
                </span>
              )}
            </div>

            {/* Cabecera */}
            <div className="flex justify-center items-center px-6 py-8 min-h-[140px] bg-gradient-to-br from-emerald-50 to-white">
              <img
                src={SHOPIFY_LOGO_URL}
                alt="Shopify Logo"
                className="w-full max-w-[280px] max-h-[100px] object-contain"
              />
            </div>

            {/* Body */}
            <div className="p-5">
              <h3 className="text-xl font-semibold text-gray-800">Shopify</h3>
              <p className="text-sm text-gray-600 mt-1">
                Captura los carritos abandonados de tu tienda y recupéralos
                automáticamente con mensajes de WhatsApp personalizados.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                  Carritos abandonados
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                  Recovery WhatsApp
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                  Releasit COD
                </span>
              </div>

              {/* Info cuando está conectado */}
              {isLinked && (
                <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="text-sm text-gray-700 space-y-1">
                    <div>
                      <strong>Tienda:</strong> {activeIntegration.shop_domain}
                    </div>
                    <div>
                      <strong>Prefijo país:</strong> +
                      {activeIntegration.prefijo_pais}
                    </div>
                    <div>
                      <strong>Tiempo de espera:</strong>{" "}
                      {activeIntegration.tiempo_espera_horas}h
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
                    Conectar tienda
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

              {!isLinked && (
                <p className="text-xs text-gray-400 mt-3">
                  * Solo se permite 1 tienda Shopify por configuración.
                </p>
              )}
            </div>
          </div>

          {/* Beneficios */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h4 className="text-lg font-semibold text-gray-900">
              ¿Por qué conectar Shopify?
            </h4>

            <ul className="mt-3 space-y-2 text-sm text-gray-700">
              <li className="flex gap-2">
                <span>🛒</span>
                <span>
                  <strong>Captura carritos abandonados:</strong> recupera ventas
                  que ya estaban casi cerradas.
                </span>
              </li>
              <li className="flex gap-2">
                <span>💬</span>
                <span>
                  <strong>WhatsApp automático:</strong> envía mensajes de
                  recuperación personalizados por templates.
                </span>
              </li>
              <li className="flex gap-2">
                <span>🔗</span>
                <span>
                  <strong>Recovery URL incluida:</strong> link directo al
                  checkout pre-llenado para que el cliente solo confirme.
                </span>
              </li>
              <li className="flex gap-2">
                <span>📊</span>
                <span>
                  <strong>Métricas claras:</strong> mide tasa de recuperación y
                  optimiza tus mensajes.
                </span>
              </li>
              <li className="flex gap-2">
                <span>🤖</span>
                <span>
                  <strong>Compatible con Releasit COD Form:</strong> funciona
                  con la app más usada para checkout COD en LATAM.
                </span>
              </li>
              <li className="flex gap-2">
                <span>🔐</span>
                <span>
                  <strong>Webhooks firmados:</strong> seguridad HMAC SHA256
                  validada en cada request.
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
                  Conectar Shopify
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setShowWizard(true)}
                    className="w-full text-center bg-[#171931] text-white font-semibold py-2 rounded-lg hover:opacity-95 transition"
                  >
                    Ver guía de webhooks
                  </button>
                  <button
                    onClick={() => setShowWizard(true)}
                    className="w-full text-center bg-amber-100 text-amber-900 font-semibold py-2 rounded-lg hover:bg-amber-200 transition"
                    disabled={saving}
                  >
                    🔄 Actualizar webhook secret
                  </button>
                </>
              )}

              <button
                onClick={fetchIntegraciones}
                className="w-full text-center bg-gray-100 text-gray-800 font-semibold py-2 rounded-lg hover:bg-gray-200 transition"
                disabled={loading || !id_configuracion}
              >
                {loading ? "Actualizando..." : "Refrescar"}
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <div className="flex items-start gap-3">
                <div className="text-xl">💡</div>
                <div className="text-sm">
                  <p className="font-semibold">Importante</p>
                  <p className="mt-1">
                    Solo puede existir <strong>una</strong> tienda Shopify por
                    configuración. Para conectar otra, elimina la actual
                    primero.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-3">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl p-6 relative animate-fade-in max-h-[90vh] overflow-y-auto">
              <button
                onClick={closeModal}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-xl"
                aria-label="Cerrar"
              >
                ✕
              </button>

              {/* Logo */}
              <div className="flex justify-center mb-3">
                <img
                  src={SHOPIFY_LOGO_URL}
                  alt="Shopify"
                  className="w-32 h-auto rounded-md"
                />
              </div>

              <h2 className="text-2xl font-bold text-center text-gray-800 mb-1">
                {mode === "create"
                  ? "Conectar Shopify"
                  : "Editar configuración Shopify"}
              </h2>

              <p className="text-center text-sm text-gray-500 mb-4">
                {mode === "create"
                  ? "Registra el dominio de tu tienda. Después te guiaremos paso a paso."
                  : "Actualiza los datos de tu integración."}
              </p>

              {/* shop_domain */}
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Dominio interno de Shopify
                </label>
                <input
                  type="text"
                  placeholder="mitienda.myshopify.com"
                  className="mt-1 w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#171931]"
                  value={shopDomain}
                  onChange={(e) => setShopDomain(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
                <p className="text-xs text-gray-500 mt-1">
                  ⚠️ NO uses tu dominio público (ej: <code>mitienda.com</code>).
                  Usa el interno que termina en <code>.myshopify.com</code>. Lo
                  encuentras en Shopify → Configuración → Detalles de la tienda.
                </p>
              </div>

              {/* webhook_secret */}
              <div className="mt-4">
                <label className="text-sm font-semibold text-gray-700">
                  Token de firma de webhooks (de Shopify)
                </label>
                <div className="relative mt-1">
                  <input
                    type={showSecret ? "text" : "password"}
                    placeholder="Pega aquí el token que muestra Shopify"
                    className="w-full px-4 py-2 pr-20 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#171931] font-mono text-sm"
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
                  >
                    {showSecret ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  En Shopify ve a{" "}
                  <strong>Configuración → Notificaciones → Webhooks</strong>.
                  Arriba de la lista de webhooks dice{" "}
                  <em>"Tus webhooks se firmarán con token: XXXX"</em>. Copia ese
                  token y pégalo aquí.
                </p>
              </div>

              {/* prefijo_pais */}
              <div className="mt-4">
                <label className="text-sm font-semibold text-gray-700">
                  País / prefijo telefónico
                </label>
                <div className="mt-1">
                  <Select
                    value={prefijoPaisOpt}
                    onChange={(opt) => setPrefijoPaisOpt(opt)}
                    options={COUNTRY_PHONE_OPTIONS}
                    styles={selectStyles}
                    isSearchable
                    placeholder="Selecciona país"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Se usa para normalizar los teléfonos de los clientes.
                </p>
              </div>

              {/* tiempo_espera_horas */}
              <div className="mt-4">
                <label className="text-sm font-semibold text-gray-700">
                  Tiempo de espera (horas)
                </label>
                <input
                  type="number"
                  min={1}
                  max={72}
                  className="mt-1 w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#171931]"
                  value={tiempoEsperaHoras}
                  onChange={(e) => setTiempoEsperaHoras(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Cuánto esperar antes de enviar el WhatsApp de recuperación
                  (próximamente).
                </p>
              </div>

              {/* Acciones */}
              <div className="flex items-center justify-end gap-2 pt-5">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200 transition"
                  disabled={saving}
                >
                  Cancelar
                </button>

                <button
                  onClick={handleSave}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#171931] text-white hover:opacity-95 transition disabled:opacity-50"
                  disabled={saving}
                >
                  {saving
                    ? "Guardando..."
                    : mode === "create"
                      ? "Conectar"
                      : "Guardar cambios"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntegracionShopify;
