// EJEMPLO DE CÓMO ACTUALIZAR TU Login.jsx PARA QUE FUNCIONE

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "../../hooks/useAuth"; // Importar el nuevo hook
import { useLocation } from "react-router-dom";

export default function Login() {
  const { login, isLoading, error, clearError } = useAuth(); // Usar el nuevo hook
  const location = useLocation();
  const [showPwd, setShowPwd] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setError,
  } = useForm({ mode: "onTouched" });

  // Limpiar errores cuando el componente se monte
  useEffect(() => {
    clearError();
  }, [clearError]);

  // Nueva función onSubmit que usa el hook useAuth
  const onSubmit = async (data) => {
    clearError();

    const result = await login(data);

    if (result.success) {
      reset();
      // La navegación se maneja automáticamente en el hook
    } else {
      setError("root", { message: result.error });
    }
  };

  // ... resto de tu código del componente Login.jsx

  return (
    <div>
      {/* Tu JSX existente */}

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Mostrar error del hook o del formulario */}
        {(error || errors.root) && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error || errors.root?.message}
          </div>
        )}

        {/* Campos del formulario */}
        <input
          type="email"
          {...register("email", { required: "Email es requerido" })}
          placeholder="Email"
        />

        <input
          type={showPwd ? "text" : "password"}
          {...register("password", { required: "Password es requerido" })}
          placeholder="Password"
        />

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-2 px-4 rounded ${
            isLoading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600"
          } text-white`}
        >
          {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
        </button>
      </form>

      {/* Tu JSX existente */}
    </div>
  );
}

/*
PASOS PARA IMPLEMENTAR:

1. Reemplaza la función onSubmit en tu Login.jsx actual
2. Importa useAuth en lugar de usar Redux directamente
3. Actualiza el JSX para mostrar el estado de loading
4. El sistema manejará automáticamente:
   - Guardar el token en localStorage
   - Actualizar el estado de Redux
   - Mostrar notificaciones
   - Redirigir después del login exitoso
*/
