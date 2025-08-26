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

  useEffect(() => {
    const idp = localStorage.getItem("id_plataforma_conf");
    const idc = localStorage.getItem("id_configuracion");

    if (idc) setId_configuracion(parseInt(idc));
    // Validación para el valor literal "null"
    if (idp === "null") {
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
          title: "Vinculación exitosa",
          text: "Se ha vinculado correctamente con Imporsuit",
          confirmButtonColor: "#3085d6",
        });
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
      <h1 className="text-2xl font-bold mb-4">Vinculaciones</h1>

      <div className="overflow-visible bg-white p-4 rounded shadow-md relative z-0">
        {/* CARD */}
        <div
          onClick={() => {
            if (id_plataforma_conf === null) {
              openModalVinculacionesImporsuit();
            }
          }}
          className={`relative cursor-pointer max-w-56 mx-auto bg-white rounded-xl overflow-hidden shadow-lg transform transition duration-300 ${
            id_plataforma_conf === null
              ? "hover:scale-105 hover:shadow-2xl"
              : "opacity-90 cursor-default"
          }`}
        >
          {/* 🔘 Estado de vinculación */}
          <div className="absolute top-2 right-2 z-10">
            {id_plataforma_conf === null ? (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                🔴 Desconectado
              </span>
            ) : (
              <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                🟢 Conectado
              </span>
            )}
          </div>

          {/* Imagen */}
          <div className="bg-[#171931] flex justify-center items-center p-4">
            <img
              src={log_imporsuitImage}
              alt="Imporsuit Logo"
              className="w-60 h-30"
            />
          </div>

          {/* Título */}
          <div className="p-4 text-center">
            <h3 className="text-lg font-semibold text-gray-800">Imporsuit</h3>
          </div>
        </div>

        {/* MODAL */}
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

              <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">
                Iniciar sesión en Imporsuit
              </h2>

              {/* Formulario */}
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Usuario"
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={usuarioImporsuit}
                  onChange={(e) => setUsuarioImporsuit(e.target.value)}
                />
                <input
                  type="password"
                  placeholder="Contraseña"
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md transition duration-200 disabled:opacity-50"
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
