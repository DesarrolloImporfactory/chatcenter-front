import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";
import Select from "react-select";
const DROPi_LOGO_URL =
  "https://imp-datas.s3.amazonaws.com/images/2026-01-08T16-10-19-512Z-Dropi.png";

const COUNTRY_OPTIONS = [
  { value: "CO", label: "Colombia" },
  { value: "EC", label: "Ecuador" },
  { value: "MX", label: "México" },
  { value: "PE", label: "Perú" },
  { value: "CL", label: "Chile" },
  { value: "AR", label: "Argentina" },
  { value: "BO", label: "Bolivia" },
  { value: "PY", label: "Paraguay" },
  { value: "UY", label: "Uruguay" },
  { value: "VE", label: "Venezuela" },
  { value: "PA", label: "Panamá" },
  { value: "CR", label: "Costa Rica" },
  { value: "DO", label: "República Dominicana" },
  { value: "GT", label: "Guatemala" },
  { value: "SV", label: "El Salvador" },
  { value: "HN", label: "Honduras" },
  { value: "NI", label: "Nicaragua" },
  { value: "US", label: "Estados Unidos" },
  { value: "ES", label: "España" },
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

const emitDropiLinkedChanged = (payload = {}) => {
  window.dispatchEvent(
    new CustomEvent("dropi:linked-changed", {
      detail: payload,
    }),
  );
};

const IntegracionesDropi = () => {
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
  const [storeName, setStoreName] = useState("");
  const [countryOpt, setCountryOpt] = useState(
    COUNTRY_OPTIONS.find((x) => x.value === "CO") || COUNTRY_OPTIONS[0],
  );
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);

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
      const res = await chatApi.get("dropi_integrations", {
        params: { id_configuracion },
      });
      setIntegraciones(res?.data?.data ?? []);
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "No se pudo cargar la integración.";
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
    // UX: pre-llenamos el nombre con el de la configuración (igual que al
    // instalar la plantilla del asistente) para que el cliente escriba menos.
    // Sigue siendo editable si desea otro nombre.
    setStoreName(localStorage.getItem("nombre_configuracion") || "");
    setCountryOpt(
      COUNTRY_OPTIONS.find((x) => x.value === "CO") || COUNTRY_OPTIONS[0],
    );
    setToken("");
    setShowToken(false);
    setShowModal(true);
  };

  const openEdit = () => {
    if (!activeIntegration) return;
    setMode("edit");
    setStoreName(activeIntegration.store_name ?? "");
    const cc = String(activeIntegration.country_code ?? "CO").toUpperCase();
    setCountryOpt(
      COUNTRY_OPTIONS.find((x) => x.value === cc) || COUNTRY_OPTIONS[0],
    );
    setToken(""); // por seguridad no mostramos el token guardado
    setShowToken(false);
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

    if (!String(storeName || "").trim()) {
      Swal.fire({
        icon: "warning",
        title: "Campo requerido",
        text: "Ingrese el nombre de la tienda.",
        confirmButtonColor: "#171931",
      });
      return false;
    }

    if (!countryOpt?.value) {
      Swal.fire({
        icon: "warning",
        title: "País requerido",
        text: "Seleccione un país.",
        confirmButtonColor: "#171931",
      });
      return false;
    }

    if (mode === "create" && !String(token || "").trim()) {
      Swal.fire({
        icon: "warning",
        title: "Token requerido",
        text: "Pegue el token generado en Dropi.",
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
        html: `Solo puede existir <strong>una</strong> vinculación por configuración.<br/>Si desea crear otra, elimine la actual primero.`,
        confirmButtonColor: "#171931",
      });
      return;
    }

    setSaving(true);
    try {
      if (mode === "create") {
        const payload = {
          id_configuracion,
          store_name: String(storeName).trim(),
          country_code: countryOpt.value,
          token: String(token).trim(),
        };

        const res = await chatApi.post("dropi_integrations", payload);
        if (res?.data?.isSuccess) {
          Swal.fire({
            icon: "success",
            title: "Integración creada",
            text: "Se vinculó Dropi correctamente.",
            confirmButtonColor: "#171931",
          });
          closeModal();
          await fetchIntegraciones();
          emitDropiLinkedChanged({
            id_configuracion,
            isLinked: true,
          });
        }
      } else {
        const id = activeIntegration?.id;
        if (!id) throw new Error("No se encontró el ID de la integración.");

        const payload = {
          store_name: String(storeName).trim(),
          country_code: countryOpt.value,
        };

        // token opcional (solo si lo cambian)
        if (String(token || "").trim()) payload.token = String(token).trim();

        const res = await chatApi.patch(`dropi_integrations/${id}`, payload);
        if (res?.data?.isSuccess) {
          Swal.fire({
            icon: "success",
            title: "Cambios guardados",
            text: "La integración se actualizó correctamente.",
            confirmButtonColor: "#171931",
          });
          closeModal();
          await fetchIntegraciones();
          emitDropiLinkedChanged({
            id_configuracion,
            isLinked: true,
          });
        }
      }
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "No se pudo guardar la integración.";
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
      title: "Eliminar vinculación",
      html: `Se eliminará la integración de <strong>${activeIntegration.store_name}</strong>.<br/>Luego podrá conectar otra tienda.`,
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
        `dropi_integrations/${activeIntegration.id}`,
      );
      if (res?.data?.isSuccess) {
        Swal.fire({
          icon: "success",
          title: "Vinculación eliminada",
          text: "Se eliminó correctamente.",
          confirmButtonColor: "#171931",
        });
        await fetchIntegraciones();
        emitDropiLinkedChanged({
          id_configuracion,
          isLinked: false,
        });
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

  return (
    <div className="p-5">
      {/* HERO */}
      <div className="mb-6 rounded-2xl bg-[#171931] text-white p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Bienvenido al mundo e-commerce
            </h1>
            <p className="opacity-90 mt-1">
              Conecta <strong>Dropi</strong> para gestionar tus tiendas de
              dropshipping y automatizar tu operación en minutos.
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
                Vincular ahora
              </button>
            ) : (
              <button
                onClick={openEdit}
                className="ml-2 bg-white text-[#171931] hover:bg-gray-50 transition px-3 py-1.5 rounded-lg text-sm font-semibold shadow"
              >
                Administrar integración →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Guidance */}
      {!isLinked ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-start gap-3">
            <i className="bx bx-rocket text-2xl text-amber-600" />
            <div>
              <h3 className="font-semibold">Empieza en 3 pasos</h3>
              <ol className="list-decimal ml-5 mt-2 text-sm space-y-1">
                <li>
                  Haz clic en <strong>vincular ahora</strong>.
                </li>
                <li>
                  Ingresa el <strong>nombre de tu tienda</strong> y selecciona
                  el <strong>país</strong> donde se encuentra.
                </li>
                <li>
                  Pega el <strong>Token</strong> generado en la sección de
                  <strong> Integraciones de Dropi</strong> y guarda la
                  información.
                </li>
              </ol>
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
                Dropi está conectado. Ya puede operar su tienda con una
                experiencia más rápida y automatizada.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="overflow-visible bg-white p-6 rounded-2xl shadow-md relative z-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CARD Dropi */}
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
            <div className="flex justify-center items-center px-6 py-8 min-h-[140px]">
              <img
                src={DROPi_LOGO_URL}
                alt="Dropi Logo"
                className="w-full max-w-[320px] max-h-[120px] object-contain"
              />
            </div>

            {/* Body */}
            <div className="p-5">
              <h3 className="text-xl font-semibold text-gray-800">Dropi</h3>
              <p className="text-sm text-gray-600 mt-1">
                Conecta tu tienda y gestiona pedidos de dropshipping de forma
                más organizada y escalable, sin complicaciones.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                  Dropshipping
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                  Operación más ágil
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                  Crecimiento escalable
                </span>
              </div>

              {/* Info cuando está conectado */}
              {isLinked && (
                <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="text-sm text-gray-700">
                    <div>
                      <strong>Tienda:</strong> {activeIntegration.store_name}
                    </div>
                    <div className="mt-1">
                      <strong>País:</strong> {activeIntegration.country_code}
                    </div>
                    <div className="mt-1">
                      <strong>Token:</strong>{" "}
                      {activeIntegration.integration_key_last4
                        ? `****${activeIntegration.integration_key_last4}`
                        : "****"}
                      <span className="text-xs text-gray-400 ml-2">
                        (oculto por seguridad)
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
              ¿Por qué vincular Dropi?
            </h4>

            <ul className="mt-3 space-y-2 text-sm text-gray-700">
              <li className="flex gap-2">
                <i className="bx bx-check-circle text-lg text-emerald-600 shrink-0" />
                <span>
                  <strong>Venda sin inventario:</strong> ideal para dropshipping
                  y validación rápida de productos.
                </span>
              </li>
              <li className="flex gap-2">
                <i className="bx bx-bolt-circle text-lg text-amber-500 shrink-0" />
                <span>
                  <strong>Operación más rápida:</strong> menos pasos, más
                  control, menos errores en el día a día.
                </span>
              </li>
              <li className="flex gap-2">
                <i className="bx bx-package text-lg text-indigo-500 shrink-0" />
                <span>
                  <strong>Gestión centralizada:</strong> tenga su tienda
                  conectada y su equipo alineado.
                </span>
              </li>
              <li className="flex gap-2">
                <i className="bx bx-line-chart text-lg text-sky-500 shrink-0" />
                <span>
                  <strong>Escalable:</strong> ideal para campañas y picos de
                  demanda sin saturar su operación.
                </span>
              </li>
              <li className="flex gap-2">
                <i className="bx bx-cart text-lg text-violet-500 shrink-0" />
                <span>
                  <strong>Crezca sin límites:</strong> pruebe productos
                  ganadores y rote catálogos sin comprometer capital.
                </span>
              </li>
              <li className="flex gap-2">
                <i className="bx bx-list-check text-lg text-slate-500 shrink-0" />
                <span>
                  <strong>Más orden:</strong> tener la tienda conectada reduce
                  “inventos” y mejora el flujo de trabajo del equipo.
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
                  Conectar Dropi
                </button>
              ) : (
                <button
                  onClick={openEdit}
                  className="w-full text-center bg-gray-100 text-gray-800 font-semibold py-2 rounded-lg hover:bg-gray-200 transition"
                >
                  Administrar integración
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

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <div className="flex items-start gap-3">
                <i className="bx bx-bulb text-2xl text-amber-600" />
                <div className="text-sm">
                  <p className="font-semibold">Importante</p>
                  <p className="mt-1">
                    Solo puede existir <strong>una</strong> tienda vinculada por
                    configuración. Si desea conectar otro token, elimine o edite
                    el existente.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-3">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl p-6 relative animate-fade-in">
              <button
                onClick={closeModal}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-xl"
                aria-label="Cerrar"
              >
                <i className="bx bx-x text-2xl" />              </button>

              {/* Logo */}
              <div className="flex justify-center mb-3">
                <img
                  src={DROPi_LOGO_URL}
                  alt="Dropi"
                  className="w-24 h-auto rounded-md"
                />
              </div>

              <h2 className="text-2xl font-bold text-center text-gray-800 mb-1">
                {mode === "create"
                  ? "Vincular Dropi"
                  : "Editar vinculación Dropi"}
              </h2>

              <p className="text-center text-sm text-gray-500 mb-4">
                {mode === "create"
                  ? "Registre su tienda y pegue el token generado en Dropi."
                  : "Actualice los datos. Si necesita cambiar el token, péguelo nuevamente."}
              </p>

              {/* Fila 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Nombre de tu Tienda
                  </label>
                  <input
                    type="text"
                    // name raro + autoComplete off: que Chrome NO meta aquí el
                    // correo de Google creyendo que es un formulario de login.
                    name="dropi_store_name"
                    autoComplete="off"
                    placeholder="Ej: Tienda Dropi CO"
                    className="mt-1 w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#171931]"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    País
                  </label>
                  <div className="mt-1">
                    <Select
                      value={countryOpt}
                      onChange={(opt) => setCountryOpt(opt)}
                      options={COUNTRY_OPTIONS}
                      styles={selectStyles}
                      isSearchable
                      placeholder="Seleccione un país"
                    />
                  </div>
                </div>
              </div>

              {/* Token */}
              <div className="mt-4">
                <label className="text-sm font-semibold text-gray-700">
                  Token{" "}
                  {mode === "edit" ? "(opcional si no desea cambiarlo)" : ""}
                </label>

                <div className="relative mt-1">
                  <input
                    // NO usar type="password": Chrome detectaba "login form" y
                    // auto-rellenaba correo/contraseña de Google en el modal.
                    // Se enmascara con CSS (WebkitTextSecurity) y así el
                    // gestor de contraseñas nunca toca estos campos.
                    type="text"
                    name="dropi_integration_token"
                    autoComplete="off"
                    style={{
                      WebkitTextSecurity: showToken ? "none" : "disc",
                    }}
                    placeholder={
                      mode === "edit"
                        ? "Pegue un nuevo token solo si desea cambiarlo"
                        : "Pegue aquí el token generado en Dropi"
                    }
                    className="w-full px-4 py-2 pr-12 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#171931]"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    spellCheck={false}
                  />

                  <button
                    type="button"
                    onClick={() => setShowToken((v) => !v)}
                    className="absolute inset-y-0 right-0 px-3 text-gray-600 hover:text-gray-800 flex items-center"
                    title={showToken ? "Ocultar token" : "Mostrar token"}
                    aria-label={showToken ? "Ocultar token" : "Mostrar token"}
                  >
                    <i
                      className={`bx ${
                        showToken ? "bx-hide" : "bx-show"
                      } text-xl`}
                    />
                  </button>
                </div>

                <p className="text-xs text-gray-400 mt-1">
                  Por seguridad, el token no se mostrará completo luego.
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
                      ? "Vincular"
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

export default IntegracionesDropi;
