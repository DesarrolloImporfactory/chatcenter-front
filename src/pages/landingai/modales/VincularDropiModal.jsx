import React, { useState, useEffect } from "react";
import chatApi from "../../../api/chatcenter";

const COUNTRIES = [
  { code: "EC", label: "Ecuador 🇪🇨" },
  { code: "CO", label: "Colombia 🇨🇴" },
  { code: "MX", label: "México 🇲🇽" },
  { code: "PE", label: "Perú 🇵🇪" },
  { code: "CL", label: "Chile 🇨🇱" },
  { code: "AR", label: "Argentina 🇦🇷" },
];

const STEPS_DROPI = [
  { icon: "bx-log-in-circle", text: "Inicia sesión en Dropi" },
  { icon: "bx-plug", text: 'Ve a "Mis integraciones"' },
  { icon: "bx-plus-circle", text: "Crea una nueva integración" },
  { icon: "bx-store-alt", text: 'En "Plataforma" selecciona Imporsuit' },
  { icon: "bx-copy-alt", text: "Copia el token generado y pégalo aquí" },
];

const Spin = () => (
  <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
  </svg>
);

const Row = ({ icon, label, value, mono }) => (
  <div className="flex items-center gap-3">
    <div
      className="w-7 h-7 rounded-lg grid place-items-center shrink-0"
      style={{ background: "rgba(249,115,22,0.08)" }}
    >
      <i className={`bx ${icon} text-sm`} style={{ color: "#f97316" }} />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">
        {label}
      </p>
      <p
        className={`text-sm font-semibold text-gray-700 truncate ${mono ? "font-mono" : ""}`}
      >
        {value}
      </p>
    </div>
  </div>
);

/**
 * Props:
 *   open, onClose,
 *   integration — { id, store_name, country_code, integration_key_last4 } | null
 *   onSaved — fn() tras guardar/eliminar
 *   Swal — instancia sweetalert2
 */
const VincularDropiModal = ({ open, onClose, integration, onSaved, Swal }) => {
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  });

  const [step, setStep] = useState("view"); // "view" | "form"
  const [form, setForm] = useState({
    store_name: "",
    country_code: "EC",
    integration_key: "",
  });
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(integration ? "view" : "form");
      setForm({ store_name: "", country_code: "EC", integration_key: "" });
      setShowToken(false);
    }
  }, [open, integration]);

  if (!open) return null;

  const handleSave = async () => {
    if (!form.store_name.trim())
      return Toast.fire({
        icon: "error",
        title: "Ingresa el nombre de tu tienda",
      });
    if (!form.integration_key.trim())
      return Toast.fire({ icon: "error", title: "Ingresa el token de Dropi" });
    setSaving(true);
    try {
      await chatApi.post("dropi_integrations/my-integration", {
        store_name: form.store_name.trim(),
        country_code: form.country_code,
        integration_key: form.integration_key.trim(),
      });
      Toast.fire({
        icon: "success",
        title: "¡Dropi vinculado correctamente! ✓",
      });
      onSaved();
      onClose();
    } catch (err) {
      Toast.fire({
        icon: "error",
        title: err?.response?.data?.message || "No se pudo vincular",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    const result = await Swal.fire({
      title: "¿Desvincular Dropi?",
      text: "Perderás acceso a importar productos desde esta integración.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Sí, desvincular",
      cancelButtonText: "Cancelar",
    });
    if (!result.isConfirmed) return;
    setRemoving(true);
    try {
      await chatApi.delete(
        `dropi_integrations/my-integration/${integration.id}`,
      );
      Toast.fire({ icon: "success", title: "Integración desvinculada" });
      onSaved();
      onClose();
    } catch (err) {
      Toast.fire({
        icon: "error",
        title: err?.response?.data?.message || "Error al desvincular",
      });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,17,41,0.6)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: "white",
          boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
          maxHeight: "90vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header naranja ── */}
        <div
          className="relative px-5 py-5 shrink-0"
          style={{
            background:
              "linear-gradient(135deg, #0f1129 0%, #1c1208 60%, #2d1200 100%)",
          }}
        >
          {/* glow naranja */}
          <div
            className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(249,115,22,0.22) 0%, transparent 70%)",
              transform: "translate(30%, -30%)",
            }}
          />

          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl grid place-items-center shrink-0"
                style={{
                  background: "rgba(249,115,22,0.15)",
                  border: "1px solid rgba(249,115,22,0.35)",
                }}
              >
                <i
                  className="bx bx-link text-lg"
                  style={{ color: "#fb923c" }}
                />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white leading-tight">
                  {integration ? "Integración Dropi activa" : "Vincular Dropi"}
                </h2>
                <p
                  className="text-[11px] mt-0.5"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                >
                  {integration
                    ? `Tienda: ${integration.store_name} · ${integration.country_code}`
                    : "Importa productos directamente desde tu catálogo Dropi"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg grid place-items-center shrink-0 transition"
              style={{ color: "rgba(255,255,255,0.5)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <i className="bx bx-x text-lg" />
            </button>
          </div>

          {/* Badge conectado — verde */}
          {integration && (
            <div
              className="relative inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full text-[10px] font-bold"
              style={{
                background: "rgba(34,197,94,0.15)",
                border: "1px solid rgba(34,197,94,0.3)",
                color: "#86efac",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Conectado · Token ****{integration.integration_key_last4}
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto flex-1">
          {/* ════ VIEW: tiene integración ════ */}
          {step === "view" && integration && (
            <div className="p-5 space-y-4">
              <div
                className="rounded-xl p-4 space-y-3"
                style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
              >
                <Row
                  icon="bx-store-alt"
                  label="Tienda"
                  value={integration.store_name}
                />
                <Row
                  icon="bx-globe"
                  label="País"
                  value={
                    COUNTRIES.find((c) => c.code === integration.country_code)
                      ?.label || integration.country_code
                  }
                />
                <Row
                  icon="bx-key"
                  label="Token"
                  value={`****${integration.integration_key_last4}`}
                  mono
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleRemove}
                  disabled={removing}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                  style={{ border: "1px solid #fecaca", color: "#ef4444" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#fef2f2")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  {removing ? <Spin /> : <i className="bx bx-unlink text-sm" />}
                  Desvincular
                </button>
                <button
                  onClick={() => {
                    setForm({
                      store_name: integration.store_name,
                      country_code: integration.country_code,
                      integration_key: "",
                    });
                    setStep("form");
                  }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition inline-flex items-center justify-center gap-1.5"
                  style={{
                    background: "linear-gradient(135deg, #f97316, #ea580c)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.filter = "brightness(1.1)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.filter = "brightness(1)")
                  }
                >
                  <i className="bx bx-refresh text-sm" /> Actualizar token
                </button>
              </div>
            </div>
          )}

          {/* ════ FORM: vincular o actualizar ════ */}
          {step === "form" && (
            <div className="p-5 space-y-5">
              {/* Guía pasos */}
              <div
                className="rounded-xl p-4"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(249,115,22,0.04), rgba(234,88,12,0.04))",
                  border: "1px solid rgba(249,115,22,0.15)",
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <i
                    className="bx bx-info-circle text-sm"
                    style={{ color: "#f97316" }}
                  />
                  <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">
                    ¿Cómo obtener tu token?
                  </p>
                </div>
                <div className="space-y-2.5">
                  {STEPS_DROPI.map((s, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div
                        className="w-5 h-5 rounded-full grid place-items-center shrink-0 mt-0.5 text-[10px] font-black"
                        style={{
                          background: "rgba(249,115,22,0.12)",
                          color: "#ea580c",
                        }}
                      >
                        {i + 1}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <i
                          className={`bx ${s.icon} text-sm`}
                          style={{ color: "#94a3b8" }}
                        />
                        <span className="text-[11px] text-gray-500">
                          {s.text}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <a
                  href="https://dropi.ec/inicio-de-sesion/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 text-[11px] font-bold transition"
                  style={{ color: "#f97316" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#ea580c")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "#f97316")
                  }
                >
                  <i className="bx bx-link-external text-xs" /> Ir a Dropi
                </a>
              </div>

              {/* Campos */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">
                    Nombre de tu tienda *
                  </label>
                  <input
                    type="text"
                    value={form.store_name}
                    onChange={(e) =>
                      setForm({ ...form, store_name: e.target.value })
                    }
                    placeholder="Ej: Mi tienda Ecuador"
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition"
                    style={{
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#f97316")}
                    onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">
                    País *
                  </label>
                  <select
                    value={form.country_code}
                    onChange={(e) =>
                      setForm({ ...form, country_code: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                    style={{
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                    }}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">
                    Token de integración Dropi *
                  </label>
                  <div className="relative">
                    <input
                      type={showToken ? "text" : "password"}
                      value={form.integration_key}
                      onChange={(e) =>
                        setForm({ ...form, integration_key: e.target.value })
                      }
                      placeholder="Pega aquí el token de Dropi"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl text-sm outline-none transition font-mono"
                      style={{
                        border: "1px solid #e2e8f0",
                        background: "#f8fafc",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#f97316")}
                      onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                    >
                      <i
                        className={`bx ${showToken ? "bx-hide" : "bx-show"} text-base`}
                      />
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5 ml-0.5">
                    Tu token se cifra de forma segura. Nunca se muestra
                    completo.
                  </p>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => (integration ? setStep("view") : onClose())}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition hover:bg-gray-50 disabled:opacity-50"
                  style={{ border: "1px solid #e2e8f0", color: "#64748b" }}
                >
                  {integration ? "Cancelar" : "Atrás"}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition active:scale-[0.97] disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  style={{
                    background: "linear-gradient(135deg, #f97316, #ea580c)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.filter = "brightness(1.08)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.filter = "brightness(1)")
                  }
                >
                  {saving ? <Spin /> : <i className="bx bx-link text-sm" />}
                  {integration ? "Actualizar" : "Vincular Dropi"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VincularDropiModal;
