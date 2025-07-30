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
          setStep(2);
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
            id_configuracion: 1, // Aquí debes insertar el ID de la configuración
            id_telefono: idWhatsapp,
            id_whatsapp: idBusinessAccount,
            token: tokenApi,
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
      localStorage.removeItem("token");
      window.location.href = "/login";
      return;
    }

    setUserData(decoded);
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-md shadow-md w-full max-w-2xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h5 className="text-xl font-semibold">
            {step === 1 ? "Agregar Configuración" : "Conectar con Meta"}
          </h5>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {step === 1 ? (
            <>
              {/* Paso 1: Nombre y teléfono */}
              <div className="mb-3">
                <label className="block font-medium text-sm mb-1">
                  Nombre Configuración
                </label>
                <input
                  type="text"
                  className="border w-full p-2 rounded"
                  placeholder="Ingrese el nombre de la configuración"
                  value={nombreConfiguracion}
                  onChange={(e) => setNombreConfiguracion(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className="block font-medium text-sm mb-1">
                  Teléfono
                </label>
                <div className="flex items-center gap-2">
                  {/* Selector de país */}
                  <select
                    className="form-control w-full p-2 rounded"
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
                    className="border w-full p-2 rounded ml-2"
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
              <div className="mb-3">
                <label className="block font-medium text-sm mb-1">
                  ID WhatsApp
                </label>
                <input
                  type="text"
                  className="border w-full p-2 rounded"
                  placeholder="Ingrese el ID de WhatsApp"
                  value={idWhatsapp}
                  onChange={(e) => setIdWhatsapp(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className="block font-medium text-sm mb-1">
                  ID WhatsApp Business
                </label>
                <input
                  type="text"
                  className="border w-full p-2 rounded"
                  placeholder="Ingrese el ID de WhatsApp Business"
                  value={idBusinessAccount}
                  onChange={(e) => setIdBusinessAccount(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className="block font-medium text-sm mb-1">
                  Token API
                </label>
                <input
                  type="text"
                  className="border w-full p-2 rounded"
                  placeholder="Ingrese el token de la API"
                  value={tokenApi}
                  onChange={(e) => setTokenApi(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end p-4 border-t space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cerrar
          </button>
          <button
            onClick={handleAgregarConfiguracion}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            {step === 1 ? "Agregar Configuración" : "Conectar con Meta"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CrearConfiguracionModal;
