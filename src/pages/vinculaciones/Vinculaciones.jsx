import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";
import log_imporsuitImage from "../../assets/logo_imporsuit.png";

const Vinculaciones = () => {
  const [showModalVinculacionesImporsuit, setShowModalVinculacionesImporsuit] =
    useState(false);

  const openModalVinculacionesImporsuit = () =>
    setShowModalVinculacionesImporsuit(true);
  const closeModalVinculacionesImporsuit = () =>
    setShowModalVinculacionesImporsuit(false);

  const [usuarioImporsuit, setUsuarioImporsuit] = useState("");
  const [passwordImporsuit, setPasswordImporsuit] = useState("");
  const [cargandoImporsuit, setCargandoImporsuit] = useState(false);
  const [errorImporsuit, setErrorImporsuit] = useState("");

  const [id_plataforma_conf, setId_plataforma_conf] = useState(null);
  const [id_configuracion, setId_configuracion] = useState(null);

  const isLinked = id_plataforma_conf !== null;

  useEffect(() => {
    const idp = localStorage.getItem("id_plataforma_conf");
    const idc = localStorage.getItem("id_configuracion");

    if (idc) setId_configuracion(parseInt(idc));
    // Normaliza "null" (string) a null real
    if (idp === "null" || idp === null) {
      setId_plataforma_conf(null);
    } else {
      setId_plataforma_conf(idp ? parseInt(idp) : null);
    }
  }, []);

  const handleLoginImporsuit = async () => {
    setCargandoImporsuit(true);
    setErrorImporsuit("");

    try {
      const res = await chatApi.post("auth/validar_usuario_imporsuit", {
        usuario: usuarioImporsuit,
        password: passwordImporsuit,
        id_configuracion: id_configuracion,
      });

      if (res.status === 200) {
        Swal.fire({
          icon: "success",
          title: "Integración exitosa",
          html: `
            <p>Se ha integrado correctamente con <strong>Imporsuit</strong>.</p>
            <p>Al integrarse con la <strong>IA de Ventas</strong>, ahora podrá elegir si desea alimentar la IA con:</p>
            <ul style="text-align: left; margin-top: 10px;">
              <li>✅ Productos de Chat Center</li>
              <li>✅ Productos de Imporsuit</li>
            </ul>
          `,
          confirmButtonColor: "#3085d6",
          confirmButtonText: "Entendido",
        });

        setId_plataforma_conf(res.data.id_plataforma);

        const id = res.data.id_plataforma ?? null;
        localStorage.setItem("id_plataforma_conf", id);
        window.dispatchEvent(
          new CustomEvent("imporsuit:linked", { detail: { id } })
        );

        setShowModalVinculacionesImporsuit(false);
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        setErrorImporsuit("Credenciales inválidas");
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Usuario o contraseña incorrectos",
          confirmButtonColor: "#d33",
        });
      } else {
        console.error("Error en la consulta:", error);
        Swal.fire({
          icon: "error",
          title: "Error de conexión",
          text: "No se pudo contactar con el servidor",
          confirmButtonColor: "#d33",
        });
      }
    } finally {
      setCargandoImporsuit(false);
    }
  };

  return (
    <div className="p-5 mt-16">
      {/* HERO profesional */}
      <div className="mb-6 rounded-2xl bg-[#171931] text-white p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Integraciones</h1>
            <p className="opacity-90 mt-1">
              Conecta Imporsuit para automatizar catálogo, pedidos y logística
              en minutos.
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
                onClick={openModalVinculacionesImporsuit}
                className="ml-2 bg-white text-[#171931] hover:bg-gray-50 transition px-3 py-1.5 rounded-lg text-sm font-semibold shadow"
              >
                Vincular ahora
              </button>
            ) : (
              <a
                href="/asistentes"
                className="ml-2 bg-white text-[#171931] hover:bg-gray-50 transition px-3 py-1.5 rounded-lg text-sm font-semibold shadow"
              >
                Ir a Asistentes →
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Mensaje de motivación / guidance */}
      {!isLinked ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-start gap-3">
            <div className="text-xl">🚀</div>
            <div>
              <h3 className="font-semibold">Empieza en 3 pasos</h3>
              <ol className="list-decimal ml-5 mt-2 text-sm space-y-1">
                <li>
                  Haz clic en <strong>Vincular ahora</strong>.
                </li>
                <li>Ingresa tus credenciales de Imporsuit.</li>
                <li>Activa tus asistentes de Ventas y Logística.</li>
              </ol>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          <div className="flex items-start gap-3">
            <div className="text-xl">✅</div>
            <div>
              <h3 className="font-semibold">¡Vinculación activa!</h3>
              <p className="text-sm mt-1">
                Tu cuenta de Imporsuit está conectada. Puedes gestionar tus
                asistentes en la sección{" "}
                <a href="/asistentes" className="underline">
                  Asistentes
                </a>{" "}
                para personalizar ventas y logística.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="overflow-visible bg-white p-6 rounded-2xl shadow-md relative z-0">
        {/* GRID: card + beneficios */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CARD Imporsuit */}
          <div
            onClick={() => {
              if (!isLinked) openModalVinculacionesImporsuit();
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

            {/* Cabecera con brand color */}
            <div className="bg-[#171931] flex justify-center items-center p-6">
              <img
                src={log_imporsuitImage}
                alt="Imporsuit Logo"
                className="w-56 h-auto"
              />
            </div>

            {/* Body */}
            <div className="p-5">
              <h3 className="text-xl font-semibold text-gray-800">Imporsuit</h3>
              <p className="text-sm text-gray-600 mt-1">
                Plataforma para vender sin inventario (dropshipping). Sincroniza
                productos, pedidos y estados de envío con tus asistentes.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                  Dropshipping
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                  Catálogo sincronizado
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                  Logística automatizada
                </span>
              </div>

              <div className="mt-5">
                {!isLinked ? (
                  <button
                    onClick={openModalVinculacionesImporsuit}
                    className="w-full bg-[#171931] text-white font-semibold py-2 rounded-lg hover:opacity-95 transition"
                  >
                    Vincular ahora
                  </button>
                ) : (
                  <a
                    href="/asistentes"
                    className="w-full inline-block text-center bg-gray-100 text-gray-800 font-semibold py-2 rounded-lg hover:bg-gray-200 transition"
                  >
                    Gestionar asistentes
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Beneficios / FAQ corto */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h4 className="text-lg font-semibold text-gray-900">
              ¿Por qué vincular Imporsuit?
            </h4>
            <ul className="mt-3 space-y-2 text-sm text-gray-700">
              <li className="flex gap-2">
                <span>✅</span>
                <span>
                  <strong>Menos fricción:</strong> publica y vende sin stock en
                  bodega.
                </span>
              </li>
              <li className="flex gap-2">
                <span>⚡</span>
                <span>
                  <strong>Atención 24/7:</strong> tus asistentes resuelven
                  dudas, recomiendan productos y dan estado de pedidos.
                </span>
              </li>
              <li className="flex gap-2">
                <span>📦</span>
                <span>
                  <strong>Logística al día:</strong> sincroniza guías y
                  notificaciones de entrega automáticamente.
                </span>
              </li>
              <li className="flex gap-2">
                <span>📈</span>
                <span>
                  <strong>Escalable:</strong> ideal para campañas y picos de
                  demanda sin crecer tu equipo.
                </span>
              </li>
              <li className="flex gap-2">
                <span>🛒</span>
                <span>
                  <strong>Catálogo ilimitado:</strong> ofrece cientos o miles de
                  productos sin preocuparte por almacenarlos ni comprarlos por
                  adelantado.
                </span>
              </li>
              <li className="flex gap-2">
                <span>🌎</span>
                <span>
                  <strong>Expansión global:</strong> conecta con proveedores
                  nacionales e internacionales y abre tu negocio a múltiples
                  mercados.
                </span>
              </li>
              <li className="flex gap-2">
                <span>💡</span>
                <span>
                  <strong>Modelo probado:</strong> el dropshipping es utilizado
                  por miles de emprendedores en el mundo para vender sin riesgos
                  y con bajo capital inicial.
                </span>
              </li>
              <li className="flex gap-2">
                <span>🔥</span>
                <span>
                  <strong>Escala sin límites:</strong> prueba productos
                  ganadores, cambia de nicho rápidamente y aprovecha tendencias
                  virales sin comprometer tu inventario.
                </span>
              </li>
            </ul>

            <div className="mt-5 grid grid-cols-1 xs:grid-cols-2 gap-3">
              {!isLinked ? (
                <>
                  <a
                    href="/asistentes"
                    className="w-full text-center bg-gray-100 text-gray-800 font-semibold py-2 rounded-lg hover:bg-gray-200 transition"
                  >
                    Ver asistentes
                  </a>
                </>
              ) : (
                <>
                  <button
                    disabled
                    className="w-full bg-gray-100 text-gray-400 font-semibold py-2 rounded-lg"
                    title="Ya conectado"
                  >
                    Imporsuit conectado
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* MODAL (sin cambios de lógica) */}
        {showModalVinculacionesImporsuit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative animate-fade-in">
              <button
                onClick={closeModalVinculacionesImporsuit}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-xl"
              >
                ✕
              </button>

              {/* Logo */}
              <div className="flex justify-center mb-4">
                <img
                  src={log_imporsuitImage}
                  alt="Imporsuit"
                  className="w-28 h-auto rounded-md"
                />
              </div>

              <h2 className="text-2xl font-bold text-center text-gray-800 mb-1">
                Iniciar sesión en Imporsuit
              </h2>
              <p className="text-center text-sm text-gray-500 mb-4">
                Conecta tu cuenta para sincronizar catálogo y pedidos.
              </p>

              {/* Formulario */}
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Usuario"
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#171931]"
                  value={usuarioImporsuit}
                  onChange={(e) => setUsuarioImporsuit(e.target.value)}
                />
                <input
                  type="password"
                  placeholder="Contraseña"
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#171931]"
                  value={passwordImporsuit}
                  onChange={(e) => setPasswordImporsuit(e.target.value)}
                />

                {errorImporsuit && (
                  <p className="text-red-600 text-sm text-center">
                    {errorImporsuit}
                  </p>
                )}

                <button
                  onClick={handleLoginImporsuit}
                  className="w-full bg-[#171931] hover:opacity-95 text-white font-semibold py-2 rounded-md transition duration-200 disabled:opacity-50"
                  disabled={cargandoImporsuit}
                >
                  {cargandoImporsuit ? "Verificando..." : "Iniciar sesión"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Vinculaciones;
