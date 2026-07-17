import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";
import Select from "react-select";
import ShopifyPlantillaRecuperacion from "./ShopifyPlantillaRecuperacion";

const SHOPIFY_LOGO_URL =
  "https://upload.wikimedia.org/wikipedia/commons/0/0e/Shopify_logo_2018.svg";

const COUNTRY_PHONE_OPTIONS = [
  { value: "593", label: "Ecuador (+593)" },
  { value: "57", label: "Colombia (+57)" },
  { value: "52", label: "México (+52)" },
  { value: "51", label: "Perú (+51)" },
  { value: "56", label: "Chile (+56)" },
  { value: "54", label: "Argentina (+54)" },
  { value: "591", label: "Bolivia (+591)" },
  { value: "595", label: "Paraguay (+595)" },
  { value: "598", label: "Uruguay (+598)" },
  { value: "58", label: "Venezuela (+58)" },
  { value: "507", label: "Panamá (+507)" },
  { value: "506", label: "Costa Rica (+506)" },
  { value: "1809", label: "Rep. Dominicana (+1809)" },
  { value: "502", label: "Guatemala (+502)" },
  { value: "503", label: "El Salvador (+503)" },
  { value: "504", label: "Honduras (+504)" },
  { value: "505", label: "Nicaragua (+505)" },
  { value: "1", label: "Estados Unidos (+1)" },
  { value: "34", label: "España (+34)" },
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
  // El menú se renderiza en un portal sobre el modal (z-50): sin esto se
  // recortaba dentro del cuerpo scrolleable y generaba scroll interno.
  menuPortal: (base) => ({ ...base, zIndex: 99999 }),
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
              Conecta tu tienda Shopify
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
            <i className="bx bx-rocket text-2xl text-amber-600" />
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
        <div className="mb-6 rounded-2xl bg-white shadow-md border border-gray-100 overflow-hidden">
          {/* Header de la guía */}
          <div className="bg-gradient-to-br from-[#0a1a36] via-[#102a5c] to-[#1e4fd6] px-5 sm:px-8 py-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                <i className="bx bx-book-open text-xl text-white" />
              </span>
              <div className="min-w-0">
                <h3 className="text-base md:text-lg font-bold text-white leading-tight">
                  Configura los webhooks en tu Shopify
                </h3>
                <p className="text-xs text-white/60 mt-0.5">
                  5 pasos, una sola vez. Con esto capturamos tus carritos y
                  pedidos en tiempo real.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowWizard(false)}
              className="shrink-0 inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 ring-1 ring-white/20 text-white font-semibold px-3.5 py-2 rounded-lg transition text-sm"
            >
              <i className="bx bx-arrow-back text-lg" />
              Volver
            </button>
          </div>

          <div className="p-5 sm:p-8 space-y-4">
            {/* Paso 1 */}
            <div className="flex gap-4">
              <span className="shrink-0 w-8 h-8 rounded-full bg-[#eff6ff] text-[#1d4ed8] font-extrabold text-sm grid place-items-center">
                1
              </span>
              <div className="flex-1 pb-4 border-b border-gray-100">
                <h4 className="font-semibold text-gray-900 text-sm">
                  Entra al panel de webhooks de tu Shopify
                </h4>
                <p className="text-sm text-gray-500 mt-1">
                  En el admin de tu tienda:{" "}
                  <span className="font-medium text-gray-700">
                    Configuración
                  </span>{" "}
                  <i className="bx bx-chevron-right align-middle text-gray-400" />{" "}
                  <span className="font-medium text-gray-700">
                    Notificaciones
                  </span>{" "}
                  <i className="bx bx-chevron-right align-middle text-gray-400" />{" "}
                  <span className="font-medium text-gray-700">Webhooks</span>
                </p>
              </div>
            </div>

            {/* Paso 2 */}
            <div className="flex gap-4">
              <span className="shrink-0 w-8 h-8 rounded-full bg-[#eff6ff] text-[#1d4ed8] font-extrabold text-sm grid place-items-center">
                2
              </span>
              <div className="flex-1 pb-4 border-b border-gray-100">
                <h4 className="font-semibold text-gray-900 text-sm">
                  Crea el webhook de pedido preliminar (carritos)
                </h4>
                <p className="text-sm text-gray-500 mt-1">
                  Pulsa <span className="font-medium text-gray-700">Crear webhook</span>{" "}
                  con evento{" "}
                  <span className="font-medium text-gray-700">
                    Creación de pedido preliminar
                  </span>
                  , formato <span className="font-medium text-gray-700">JSON</span> y
                  la última versión estable.
                </p>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <code className="bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-lg text-xs text-gray-700 break-all">
                    {WEBHOOK_BASE_URL}/abandoned-draft
                  </code>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `${WEBHOOK_BASE_URL}/abandoned-draft`,
                        "URL copiada",
                      )
                    }
                    className="inline-flex items-center gap-1 text-xs font-semibold bg-[#171931] text-white px-2.5 py-1.5 rounded-lg hover:opacity-90 transition"
                  >
                    <i className="bx bx-copy" />
                    Copiar URL
                  </button>
                </div>
              </div>
            </div>

            {/* Paso 3 */}
            <div className="flex gap-4">
              <span className="shrink-0 w-8 h-8 rounded-full bg-[#eff6ff] text-[#1d4ed8] font-extrabold text-sm grid place-items-center">
                3
              </span>
              <div className="flex-1 pb-4 border-b border-gray-100">
                <h4 className="font-semibold text-gray-900 text-sm">
                  Crea el webhook de creación de pedido
                </h4>
                <p className="text-sm text-gray-500 mt-1">
                  Repite el paso anterior, ahora con el evento{" "}
                  <span className="font-medium text-gray-700">
                    Creación de pedido
                  </span>
                  .
                </p>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <code className="bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-lg text-xs text-gray-700 break-all">
                    {WEBHOOK_BASE_URL}/orders-create
                  </code>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `${WEBHOOK_BASE_URL}/orders-create`,
                        "URL copiada",
                      )
                    }
                    className="inline-flex items-center gap-1 text-xs font-semibold bg-[#171931] text-white px-2.5 py-1.5 rounded-lg hover:opacity-90 transition"
                  >
                    <i className="bx bx-copy" />
                    Copiar URL
                  </button>
                </div>
              </div>
            </div>

            {/* Paso 4 - Webhook secret */}
            <div className="flex gap-4">
              <span className="shrink-0 w-8 h-8 rounded-full bg-[#eff6ff] text-[#1d4ed8] font-extrabold text-sm grid place-items-center">
                4
              </span>
              <div className="flex-1 pb-4 border-b border-gray-100">
                <h4 className="font-semibold text-gray-900 text-sm">
                  Pega el token de firma de Shopify
                </h4>
                <p className="text-sm text-gray-500 mt-1">
                  En esa misma pantalla, arriba de la lista de webhooks, Shopify
                  muestra:{" "}
                  <span className="italic text-gray-600">
                    "Tus webhooks se firmarán con token: ..."
                  </span>
                  . Copia ese token completo y pégalo aquí — así validamos que
                  cada webhook viene realmente de tu tienda.
                </p>

                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <input
                    // NO type="password": Chrome creía que era un login y
                    // auto-rellenaba credenciales de Google. Se enmascara con CSS.
                    type="text"
                    name="shopify_webhook_secret_wizard"
                    autoComplete="off"
                    spellCheck={false}
                    style={{ WebkitTextSecurity: showSecret ? "none" : "disc" }}
                    placeholder={
                      activeIntegration?.webhook_secret
                        ? "Pegar nuevo token (deja vacío si no quieres cambiar)"
                        : "Pega el token de Shopify aquí"
                    }
                    value={newSecretInput}
                    onChange={(e) => setNewSecretInput(e.target.value)}
                    className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/25 focus:border-[#1d4ed8] focus:bg-white transition"
                  />
                  <button
                    onClick={() => setShowSecret((v) => !v)}
                    className="h-[38px] w-[38px] grid place-items-center bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-gray-500 transition"
                    title={showSecret ? "Ocultar token" : "Mostrar token"}
                  >
                    <i className={`bx ${showSecret ? "bx-hide" : "bx-show"}`} />
                  </button>
                  <button
                    onClick={handleActualizarSecret}
                    disabled={saving}
                    className="text-sm font-semibold bg-[#171931] text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition"
                  >
                    Guardar token
                  </button>
                </div>

                {activeIntegration?.webhook_secret && (
                  <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                    <i className="bx bx-check-circle" />
                    Ya tienes un token guardado. Solo pega uno nuevo si lo
                    regeneraste en Shopify.
                  </p>
                )}
              </div>
            </div>

            {/* Paso 5 - Releasit */}
            <div className="flex gap-4">
              <span className="shrink-0 w-8 h-8 rounded-full bg-[#eff6ff] text-[#1d4ed8] font-extrabold text-sm grid place-items-center">
                5
              </span>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 text-sm">
                  Activa el carrito abandonado en Releasit COD Form
                </h4>
                <ol className="text-sm text-gray-500 mt-1 space-y-1 list-decimal ml-4">
                  <li>
                    Abre la app{" "}
                    <span className="font-medium text-gray-700">
                      Releasit COD Form
                    </span>{" "}
                    en tu admin de Shopify.
                  </li>
                  <li>
                    Ve a{" "}
                    <span className="font-medium text-gray-700">
                      Impulsor de Ventas
                    </span>{" "}
                    <i className="bx bx-chevron-right align-middle text-gray-400" />{" "}
                    <span className="font-medium text-gray-700">
                      Carrito Abandonado
                    </span>{" "}
                    y activa{" "}
                    <span className="font-medium text-gray-700">
                      Habilitar pagos abandonados
                    </span>
                    .
                  </li>
                  <li>
                    <span className="font-semibold text-rose-600">
                      NO actives
                    </span>{" "}
                    "Guardar pedidos como pedidos preliminares" en Releasit{" "}
                    <i className="bx bx-chevron-right align-middle text-gray-400" />{" "}
                    General: rompe el flujo con Dropi.
                  </li>
                </ol>
              </div>
            </div>

            {/* Final */}
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
              <i className="bx bx-check-circle text-xl text-emerald-600 shrink-0" />
              <p className="text-sm text-emerald-900">
                <span className="font-semibold">Listo.</span> Cuando un cliente
                abandone el formulario de Releasit, unos 15 minutos después
                verás el carrito en{" "}
                <span className="font-medium">
                  Shopify
                  <i className="bx bx-chevron-right align-middle" />
                  Carritos abandonados
                </span>{" "}
                y se disparará la plantilla de recuperación si está activa.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Estado conectado: mensaje verde */}
      {isLinked && !showWizard && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          <div className="flex items-start gap-3">
            <i className="bx bx-check-circle text-2xl text-emerald-600" />
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

      {/* Contenido principal (solo cuando NO estamos viendo la guía) */}
      {!showWizard && (
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
                  Conectado
                </span>
              ) : (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full shadow-sm">
                  Desconectado
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
                <i className="bx bx-cart text-lg text-violet-500 shrink-0" />
                <span>
                  <strong>Captura carritos abandonados:</strong> recupera ventas
                  que ya estaban casi cerradas.
                </span>
              </li>
              <li className="flex gap-2">
                <i className="bx bx-message-rounded-dots text-lg text-emerald-600 shrink-0" />
                <span>
                  <strong>WhatsApp automático:</strong> envía mensajes de
                  recuperación personalizados por templates.
                </span>
              </li>
              <li className="flex gap-2">
                <i className="bx bx-link text-lg text-sky-500 shrink-0" />
                <span>
                  <strong>Recovery URL incluida:</strong> link directo al
                  checkout pre-llenado para que el cliente solo confirme.
                </span>
              </li>
              <li className="flex gap-2">
                <i className="bx bx-bar-chart-alt-2 text-lg text-indigo-500 shrink-0" />
                <span>
                  <strong>Métricas claras:</strong> mide tasa de recuperación y
                  optimiza tus mensajes.
                </span>
              </li>
              <li className="flex gap-2">
                <i className="bx bx-bot text-lg text-slate-600 shrink-0" />
                <span>
                  <strong>Compatible con Releasit COD Form:</strong> funciona
                  con la app más usada para checkout COD en LATAM.
                </span>
              </li>
              <li className="flex gap-2">
                <i className="bx bx-lock-alt text-lg text-amber-600 shrink-0" />
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
                  {/* Plantilla de recuperación (modal) */}
                  <div className="w-full">
                    <ShopifyPlantillaRecuperacion
                      id_configuracion={id_configuracion}
                    />
                    <p className="text-[11px] text-gray-400 mt-1.5 text-center">
                      Se envía por WhatsApp en cuanto llega cada carrito
                      abandonado de tu tienda.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowWizard(true)}
                    className="w-full inline-flex items-center justify-center gap-2 text-center bg-white border border-gray-200 text-gray-700 font-semibold py-2 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition"
                  >
                    <i className="bx bx-book-open text-lg text-gray-400" />
                    Ver guía de webhooks
                  </button>
                </>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <div className="flex items-start gap-3">
                <i className="bx bx-bulb text-2xl text-amber-600" />
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

        {/* MODAL (misma línea visual que "agregar conexión") */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a1a36]/50 backdrop-blur-md p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[92vh] flex flex-col">
              {/* Header blanco: el logo de la marca es el protagonista */}
              <div className="relative bg-white border-b border-gray-100 px-6 pt-7 pb-5 text-center shrink-0">
                <button
                  onClick={closeModal}
                  className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  aria-label="Cerrar"
                  disabled={saving}
                >
                  <i className="bx bx-x text-xl" />
                </button>

                <img
                  src={SHOPIFY_LOGO_URL}
                  alt="Shopify"
                  className="h-10 w-auto object-contain mx-auto"
                />

                <h2 className="text-lg font-bold text-gray-900 mt-3">
                  {mode === "create"
                    ? "Conectar Shopify"
                    : "Editar configuración"}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  {mode === "create"
                    ? "Registra el dominio de tu tienda. Después te guiamos paso a paso."
                    : "Actualiza los datos de tu integración."}
                </p>
              </div>

              {/* Cuerpo */}
              <div className="p-6 overflow-y-auto">
                {/* shop_domain */}
                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Dominio interno de Shopify
                  </label>
                  <input
                    type="text"
                    name="shopify_shop_domain"
                    placeholder="mitienda.myshopify.com"
                    className="mt-1.5 w-full px-3.5 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/25 focus:border-[#1d4ed8] focus:bg-white transition-all duration-200"
                    value={shopDomain}
                    onChange={(e) => setShopDomain(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <p className="text-xs text-gray-400 mt-1.5">
                    No uses tu dominio público (<code>mitienda.com</code>): usa
                    el interno que termina en <code>.myshopify.com</code>. Lo
                    encuentras en Shopify{" "}
                    <i className="bx bx-chevron-right align-middle" />
                    Configuración{" "}
                    <i className="bx bx-chevron-right align-middle" />
                    Detalles de la tienda.
                  </p>
                </div>

                {/* webhook_secret */}
                <div className="mt-4">
                  <label className="text-sm font-semibold text-gray-700">
                    Token de firma de webhooks
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      // NO type="password": Chrome detectaba "formulario de
                      // login" y auto-rellenaba correo/contraseña de Google en
                      // el modal. Se enmascara con CSS y el gestor no lo toca.
                      type="text"
                      name="shopify_webhook_secret"
                      style={{
                        WebkitTextSecurity: showSecret ? "none" : "disc",
                      }}
                      placeholder="Pega aquí el token que muestra Shopify"
                      className="w-full px-3.5 py-2.5 pr-11 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/25 focus:border-[#1d4ed8] focus:bg-white transition-all duration-200"
                      value={webhookSecret}
                      onChange={(e) => setWebhookSecret(e.target.value)}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 grid place-items-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                      title={showSecret ? "Ocultar token" : "Mostrar token"}
                    >
                      <i
                        className={`bx ${showSecret ? "bx-hide" : "bx-show"}`}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    En Shopify: Configuración{" "}
                    <i className="bx bx-chevron-right align-middle" />
                    Notificaciones{" "}
                    <i className="bx bx-chevron-right align-middle" />
                    Webhooks. Arriba de la lista dice{" "}
                    <em>"Tus webhooks se firmarán con token"</em> — copia ese
                    token completo.
                  </p>
                </div>

                {/* prefijo_pais */}
                <div className="mt-4">
                  <label className="text-sm font-semibold text-gray-700">
                    País / prefijo telefónico
                  </label>
                  <div className="mt-1.5">
                    <Select
                      value={prefijoPaisOpt}
                      onChange={(opt) => setPrefijoPaisOpt(opt)}
                      options={COUNTRY_PHONE_OPTIONS}
                      styles={selectStyles}
                      isSearchable
                      placeholder="Selecciona país"
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    Se usa para normalizar los teléfonos de tus clientes.
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
                        Guardando
                      </>
                    ) : mode === "create" ? (
                      "Conectar"
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
      )}
    </div>
  );
};

export default IntegracionShopify;
