import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";

/* actualizacion */

const PlanesView = () => {
  const navigate = useNavigate();
  const [planes, setPlanes] = useState([]);
  const [planSeleccionado, setPlanSeleccionado] = useState(null);
  const [loading, setLoading] = useState(false);
  

  useEffect(() => {
    const obtenerPlanes = async () => {
      try {
        const res = await chatApi.get("planes/listarPlanes");
        setPlanes(res.data.data);
      } catch (error) {
        console.error("Error al obtener planes:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudieron cargar los planes."
        });
      }
    };

    obtenerPlanes();
  }, []);

  const seleccionarPlan = async () => {
    if (!planSeleccionado) return;
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const decoded = JSON.parse(atob(token.split(".")[1]));
      const id_usuario = decoded.id_usuario || decoded.id_users;
      const baseUrl = window.location.origin;

      const res = await chatApi.post(
        "stripe_plan/crearSesionPago",
        {
          id_plan: planSeleccionado,
          id_usuario: id_usuario,
          success_url: `${baseUrl}/conexiones`,
          cancel_url: `${baseUrl}/planes_view`,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.data.url) {
        localStorage.setItem("plan_activado", JSON.stringify({
          id_plan: planSeleccionado,
          nombre: planes.find(p => p.id_plan === planSeleccionado)?.nombre_plan || ''
        }));

        window.location.href = res.data.url;
      } else {
        throw new Error("No se recibió la URL de Stripe");
      }
    } catch (error) {
      console.error("Error al crear sesión de Stripe:", error);

      const mensajeError =
        error?.response?.data?.message ===
        "Ya tienes un plan activo. No puedes crear una nueva sesión de pago hasta que expire."
          ? "Ya tienes un plan activo. Espera a que expire antes de seleccionar uno nuevo."
          : "No se pudo redirigir al pago. Intenta nuevamente.";

      Swal.fire({
        icon: "error",
        title: "Error",
        text: mensajeError,
      });
    } finally {
      setLoading(false);
    }
  };

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose(); // desmonta o cierra
      setIsClosing(false); // para próxima apertura
    }, 300); // duración animación
  };


  return (
    <div className="min-h-screen bg-[#F4F5F9] flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-6xl relative">
        {/* Botón de cerrar sesión */}
        <div className="flex justify-end mb-4">
          <button
            onClick={cerrarSesion}
            className="text-sm bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md shadow transition"
          >
            Cerrar sesión
          </button>
        </div>

        <div className="py-10" />

        

        <h2 className="text-4xl font-extrabold text-center mb-10 text-[#171931]">
          Elige tu plan ideal y potencia tu empresa
        </h2>

        <div className="py-10" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {planes.map((plan) => {
            const isSelected = planSeleccionado === plan.id_plan;
            return (
              <div
                key={plan.id_plan}
                onClick={() => setPlanSeleccionado(plan.id_plan)}
                className={`relative rounded-3xl overflow-hidden transition-all duration-300 shadow-xl border-2 p-0 cursor-pointer
                  ${isSelected
                    ? "border-green-400 bg-gradient-to-br from-green-500 to-green-600"
                    : "border-[#2a2d47] bg-[#171931] hover:border-green-400"}
                `}
              >
                {/* Cinta de selección */}
                {isSelected && (
                  <div className="absolute top-0 right-0 bg-white text-green-700 font-semibold text-xs px-4 py-1 rounded-bl-2xl">
                    Seleccionado
                  </div>
                )}

                {/* Encabezado del plan */}
                <div className="px-6 py-8 text-center border-b border-white/10">
                  <h3 className="text-xl font-bold text-white mb-2">{plan.nombre_plan}</h3>
                  <p className={`text-sm leading-relaxed ${isSelected ? "text-white" : "text-gray-300"}`}>
                    {plan.descripcion_plan}
                  </p>
                </div>
              
                {/* Precio */}
                <div className="px-6 py-6 text-center">
                  <div className="text-4xl font-extrabold text-white">
                    US${parseFloat(plan.precio_plan).toFixed(2)}
                    <span className="text-base font-medium text-gray-300"> /mes</span>
                  </div>
                  {plan.ahorro && Number(plan.ahorro) > 0 && (
                    <div className="inline-block bg-yellow-400 text-[#1b1e3b] text-xs font-semibold px-3 py-1 rounded-full shadow-sm mt-2">
                      Ahorro ${plan.ahorro}
                    </div>
                  )}

                
                </div>
                
                {/* Características */}
                <div className="px-6 pb-6">
                  <ul className={`space-y-4 text-sm ${isSelected ? "text-white" : "text-gray-300"}`}>
                    <li className="flex items-center gap-2">
                      <svg width={24} height={24} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                        <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 00-3-3.87" />
                        <path d="M16 3.13a4 4 0 010 7.75" />
                      </svg>
                      {plan.max_subusuarios} subusuarios
                    </li>
                    <li className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} fill={"currentColor"} viewBox="0 0 24 24">
                        <path d="M3 4.5v5c0 .83.67 1.5 1.5 1.5h5c.83 0 1.5-.67 1.5-1.5v-5c0-.83-.67-1.5-1.5-1.5h-5C3.67 3 3 3.67 3 4.5M5 5h4v4H5zM3 19.5c0 .83.67 1.5 1.5 1.5h5c.83 0 1.5-.67 1.5-1.5v-5c0-.83-.67-1.5-1.5-1.5h-5c-.83 0-1.5.67-1.5 1.5zM5 15h4v4H5zM19.5 3h-5c-.83 0-1.5.67-1.5 1.5v5c0 .83.67 1.5 1.5 1.5h5c.83 0 1.5-.67 1.5-1.5v-5c0-.83-.67-1.5-1.5-1.5M19 9h-4V5h4zM13 13h2v2h-2zM15 15h2v2h-2zM13 17h2v2h-2zM17 17h2v2h-2zM19 19h2v2h-2zM15 19h2v2h-2zM17 13h2v2h-2zM19 15h2v2h-2z"></path>
                      </svg>
                      QR incluido
                    </li>
                    <li className="flex items-center gap-2">
                      <img
                        src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAt5JREFUSEuF1kuIHFUUBuDvCIOPEJ/oQsjCxASibkQmC1ERd8aFEVEE3Qo+8IEYiMFtlJhkIQTGgK5V0Jho9hIQRIOiRPCFMosEY3wSY4hocqzqutVdU1PdU3RTVX3vPf85//nvfzsIIuuPZPTaPEy7mgnjab353dH6uf7OvPoLOqFXzGYqwOwiuqOD6TcJl6Gan2Wc9EgYVzgNeFqEgjMti2m9mRGuWbKkhdN6cCnux+bgTIoD5HvjypooN+IZXIUPsF841RfIEMDa4LPk8iXdDwvSUzgn3CW9j1Udhn/Hbfi6S/sYoBS+Gp8EG5NTeNsIKLaInJPeJXaRH+FzYjt5NHgk2S2ckDbhWJtcAzDmLnaI3C5HE+ZxogDfLRyU5ojT5GncUFH0R6eCrXgFC3iiFVKXoosL8pWF//09ip6LtKfswW3BznY/lt7MkceC1cka/NaCtBU8lmJB5GKkdcn5CcAoxEPBmyXoYrAh+ben8pfwAl7Ejr5MD+BeYW9pZreAa/AtLsLftXKCbcnOng3cERxOcZi8cwLQeNHR5CY8Hry2tPxRsx/Ey8SiyH3Sf5r5NXB7XYvj+B4b+lZRq6ZW0a34uLPoHuJQzW+9CGeFI9ItqNV0e2/r/UWcJy+b9KCJdrbK8MJKLTdLXxSAS/CNpmlbcLCobl76tMx5FK93pHgSV7dG2lXRd1iP56tK9uACvIUHKireKfeuL+1NnsSfjWTjJ5HrpTrOD7i+X8GrxNPkP1XGbxSd1436ecR1+LVnAzWdX+I6fIVDFfcPB2tS7CbrfVHOg4bEVfiwbLDWco9L9xFHhk+hmCfrNfXa1iF+KQmdrBPq2/UVwmZpbUVVvVv34UxncU+Vo9d1FU3PVrayET9WYLtGKiru0POi2UfNUPRJ4sOjPS/qnoJdcx8w+mlond9XPjJnnI5dOXWb3z8NxxUsn9T2edLe5XjdcMPZDAIMZrdie3oA5a/Q/w1I/CAXiIl9AAAAAElFTkSuQmCC"
                        alt="Meta Icon"
                        className="w-5 h-5 brightness-0 invert opacity-80"
                      />
                      Meta habilitado
                    </li>
                  </ul>
                </div>
                
                {/* Botón */}
                <div className="px-6 pb-8 text-center">
                  <button className={`w-full py-3 font-semibold rounded-full transition-all
                    ${isSelected
                      ? "bg-white text-green-700 hover:bg-gray-100"
                      : "bg-yellow-400 text-[#1b1e3b] hover:bg-yellow-300"}
                  `}>
                    Empieza ya
                  </button>
                </div>
              </div>
            );
          })}
        </div>



        <div className="py-10" />

        {/* Botón de acción */}
        {planSeleccionado && (
          <div className="flex justify-center mt-10">
            <button
              onClick={seleccionarPlan}
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-10 rounded-full shadow-lg transition transform hover:scale-105 disabled:opacity-50"
            >
              {loading ? "Procesando..." : "Elegir este plan"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanesView;
