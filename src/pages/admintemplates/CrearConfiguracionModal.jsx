import React, { useEffect, useState } from "react";
import chatApi from "../../api/chatcenter";
import { jwtDecode } from "jwt-decode";


const CrearConfiguracionModal = ({
  onClose,
  fetchConfiguraciones,
  setStatusMessage,
}) => {
  const [nombreConfiguracion, setNombreConfiguracion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [idWhatsapp, setIdWhatsapp] = useState("");
  const [idBusinessAccount, setIdBusinessAccount] = useState("");
  const [tokenApi, setTokenApi] = useState("");
  const [userData, setUserData] = useState(null);
  const [idConfiguracion, setIdConfiguracion] = useState(null);

  const [isClosing, setIsClosing] = useState(false); // controla animacion del modal
  const [step, setStep] = useState(1); // Paso 1 o 2
  const [countryCode, setCountryCode] = useState("EC"); // Código de país por defecto (Ecuador)

  // Lista de países
  const countries = [
    { code: "EC", flag: "🇪🇨", name: "Ecuador", phoneCode: "+593" },
    { code: "CO", flag: "🇨🇴", name: "Colombia", phoneCode: "+57" },
    { code: "MX", flag: "🇲🇽", name: "México", phoneCode: "+52" },
    { code: "AR", flag: "🇦🇷", name: "Argentina", phoneCode: "+54" },
    { code: "BR", flag: "🇧🇷", name: "Brasil", phoneCode: "+55" },
    { code: "CL", flag: "🇨🇱", name: "Chile", phoneCode: "+56" },
    { code: "CR", flag: "🇨🇷", name: "Costa Rica", phoneCode: "+506" },
    { code: "PA", flag: "🇵🇦", name: "Panamá", phoneCode: "+507" },
    { code: "PE", flag: "🇵🇪", name: "Perú", phoneCode: "+51" },
    { code: "PR", flag: "🇵🇷", name: "Puerto Rico", phoneCode: "+1" },
    { code: "VE", flag: "🇻🇪", name: "Venezuela", phoneCode: "+58" },
    { code: "US", flag: "🇺🇸", name: "Estados Unidos", phoneCode: "+1" },
  ];

  // Función para limpiar el número de teléfono
  const cleanPhoneNumber = (phone) => {
    // Elimina cualquier carácter que no sea un número
    const cleanPhone = phone.replace(/[^0-9]/g, "");

    // Elimina el primer "0" si está presente
    const phoneWithoutLeadingZero = cleanPhone.startsWith("0")
      ? cleanPhone.slice(1)
      : cleanPhone;

    // Devuelve el número con el código del país correspondiente
    return countryCode === "EC"
      ? "593" + phoneWithoutLeadingZero
      : countryCode === "CO"
      ? "57" + phoneWithoutLeadingZero
      : countryCode === "MX"
      ? "52" + phoneWithoutLeadingZero
      : countryCode === "AR"
      ? "54" + phoneWithoutLeadingZero
      : countryCode === "BR"
      ? "55" + phoneWithoutLeadingZero
      : countryCode === "CL"
      ? "56" + phoneWithoutLeadingZero
      : countryCode === "CR"
      ? "506" + phoneWithoutLeadingZero
      : countryCode === "PA"
      ? "507" + phoneWithoutLeadingZero
      : countryCode === "PE"
      ? "51" + phoneWithoutLeadingZero
      : countryCode === "PR"
      ? "1" + phoneWithoutLeadingZero
      : countryCode === "VE"
      ? "58" + phoneWithoutLeadingZero
      : countryCode === "US"
      ? "1" + phoneWithoutLeadingZero
      : phoneWithoutLeadingZero;
  };

  const handleAgregarConfiguracion = async () => {
    if (!nombreConfiguracion || !telefono) {
      setStatusMessage({
        type: "error",
        text: "Por favor, rellene todos los campos obligatorios.",
      });
      return;
    }

    // Limpiar el número de teléfono antes de enviarlo a la base de datos
    const cleanNumber = cleanPhoneNumber(telefono);

    if (step === 1) {
      try {
        const resp = await chatApi.post(
          "/whatsapp_managment/agregarConfiguracion",
          {
            nombre_configuracion: nombreConfiguracion,
            telefono: cleanNumber, // Enviar el número limpio sin el "+"
            id_usuario: userData.id_usuario,
          }
        );

        if (resp.data.status === 200) {
          setStatusMessage({
            type: "success",
            text: "Configuración agregada correctamente. Ahora puedes conectar con Meta.",
          });
          onClose();
          if (fetchConfiguraciones) fetchConfiguraciones();

          // Guardar el id_configuracion para usarlo en el paso 2
          const idConfiguracion = resp.data.id_configuracion;
          setStep(2);

          setIdConfiguracion(idConfiguracion);
        } else {
          setStatusMessage({
            type: "error",
            text: resp.data.message || "Error al agregar configuración.",
          });
        }
      } catch (error) {
        console.error("Error al agregar configuración:", error);
        setStatusMessage({
          type: "error",
          text: "Error al conectar con el servidor.",
        });
      }
    } else if (step === 2) {
      try {
        const resp = await chatApi.post(
          "/whatsapp_managment/actualizarConfiguracionMeta",
          {
            id_telefono: idWhatsapp,
            id_whatsapp: idBusinessAccount,
            token: tokenApi,
            id_configuracion: idConfiguracion, // Usar id_configuracion
          }
        );

        if (resp.data.status === 200) {
          setStatusMessage({
            type: "success",
            text: "Configuración de Meta agregada correctamente.",
          });
          onClose();
          if (fetchConfiguraciones) fetchConfiguraciones();
        } else {
          setStatusMessage({
            type: "error",
            text: resp.data.message || "Error al conectar con Meta.",
          });
        }
      } catch (error) {
        console.error("Error al agregar configuración Meta:", error);
        setStatusMessage({
          type: "error",
          text: "Error al conectar con el servidor.",
        });
      }
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const decoded = jwtDecode(token);
    if (decoded.exp < Date.now() / 1000) {
      localStorage.clear(); // elimina todo
      window.location.href = "/login";
      return;
    }

    setUserData(decoded);
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose(); // llamada original que desmonta el modal
      setIsClosing(false); // reinicia para el próximo montaje
    }, 300); // Duración igual a tu animación
  };


  return (
   <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
    <div className={`bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all duration-300 ${isClosing ? "animate-slide-out" : "animate-slide-in"}`}>
      <div className="flex items-center justify-between p-6 border-b border-gray-100">
        <h5 className="text-xl font-semibold text-gray-800">

            {step === 1 ? "Agregar Configuración" : "Conectar con Meta"}
          </h5>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="p-8 space-y-6 bg-white rounded-2xl shadow-xl border border-gray-100">
        {step === 1 ? (
          <>
            {/* Paso 1: Nombre y teléfono */}
            <div className="mb-6">
              <label className="block text-gray-900 text-sm font-medium mb-2 tracking-wide">
                Nombre Configuración
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                placeholder="Ingrese el nombre de la configuración"
                value={nombreConfiguracion}
                onChange={(e) => setNombreConfiguracion(e.target.value)}
              />
            </div>
        
            <div className="mb-6">
              <label className="block text-gray-900 text-sm font-medium mb-2 tracking-wide">
                Teléfono
              </label>
              <div className="flex gap-4">
                <select
                  className="w-1/3 px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                >
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.flag} {country.name} {country.phoneCode}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  className="w-2/3 px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                  placeholder="Número de teléfono"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                />
              </div>
            </div>
          </>
          ) : (
            <>
              {/* Paso 2: Meta Connection */}
              <div className="mb-6">
                <label className="block text-gray-900 text-sm font-medium mb-2 tracking-wide">
                  ID WhatsApp
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                  placeholder="Ingrese el ID de WhatsApp"
                  value={idWhatsapp}
                  onChange={(e) => setIdWhatsapp(e.target.value)}
                />
              </div>

              <div className="mb-6">
                <label className="block text-gray-900 text-sm font-medium mb-2 tracking-wide">
                  ID WhatsApp Business
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                  placeholder="Ingrese el ID de WhatsApp Business"
                  value={idBusinessAccount}
                  onChange={(e) => setIdBusinessAccount(e.target.value)}
                />
              </div>

              <div className="mb-6">
                <label className="block text-gray-900 text-sm font-medium mb-2 tracking-wide">
                  Token API
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                  placeholder="Ingrese el token de la API"
                  value={tokenApi}
                  onChange={(e) => setTokenApi(e.target.value)}
                />
              </div>

            </>
          )}
        </div>

        <div className="flex justify-end bg-white p-6 border-t border-gray-100 space-x-3">
          <button
            onClick={handleClose}
            className="px-5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-100 hover:border-gray-400 transition-all duration-200"
          >
            Cerrar
          </button>
          <button
            onClick={handleAgregarConfiguracion}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-sm transition-all duration-200"
          >
            {step === 1 ? "Agregar Configuración" : "Conectar con Meta"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default CrearConfiguracionModal;
