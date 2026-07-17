import React, { useState } from "react";
import Swal from "sweetalert2";
import chatApi from "../../../api/chatcenter";

/* Modal para corregir SOLO el nombre y el número de una conexión que aún
   NO está vinculada a WhatsApp. Pensado para arreglar un número mal
   escrito sin tener que eliminar y recrear la conexión.
   El número se muestra completo (con código de país) para que el usuario
   corrija exactamente lo que está mal; al guardar se envía como
   solo-dígitos y el backend valida unicidad. */
export default function EditarConexionModal({
  config,
  userData,
  onClose,
  onSaved,
}) {
  const [nombre, setNombre] = useState(config?.nombre_configuracion || "");
  const [telefono, setTelefono] = useState(
    String(config?.telefono || "").replace(/\D/g, ""),
  );
  const [saving, setSaving] = useState(false);

  const handleGuardar = async () => {
    if (saving) return;

    const nombreTrim = nombre.trim();
    const telDigitos = telefono.replace(/\D/g, "");

    if (!nombreTrim || !telDigitos) {
      Swal.fire({
        icon: "warning",
        title: "Completa los campos",
        text: "El nombre y el número son obligatorios.",
        confirmButtonColor: "#1d4ed8",
        customClass: { popup: "rounded-2xl" },
      });
      return;
    }
    // Número completo con código de país (ej. 593987654321)
    if (telDigitos.length < 10) {
      Swal.fire({
        icon: "warning",
        title: "Número incompleto",
        text: "Ingresa el número completo con el código de país.",
        confirmButtonColor: "#1d4ed8",
        customClass: { popup: "rounded-2xl" },
      });
      return;
    }

    setSaving(true);
    try {
      const resp = await chatApi.post(
        "/configuraciones/editar_conexion",
        {
          id_configuracion: config.id,
          id_usuario: userData.id_usuario,
          nombre_configuracion: nombreTrim,
          telefono: telDigitos,
        },
        { silentError: true },
      );

      if (resp.data?.status === 200) {
        onSaved?.({
          ...config,
          nombre_configuracion: nombreTrim,
          telefono: telDigitos,
        });
        onClose?.();
      } else {
        Swal.fire({
          icon: "error",
          title: "No se pudo guardar",
          text: resp.data?.message || "Intenta nuevamente.",
          confirmButtonColor: "#1d4ed8",
          customClass: { popup: "rounded-2xl" },
        });
      }
    } catch (error) {
      const code = error?.response?.data?.code;
      const msg = error?.response?.data?.message;

      if (code === "TELEFONO_EN_USO") {
        Swal.fire({
          icon: "warning",
          iconColor: "#f59e0b",
          title: "Número en uso",
          text:
            msg ||
            "Este número ya está en uso por otra conexión activa. Debe eliminarse antes de poder registrarlo aquí.",
          confirmButtonColor: "#1d4ed8",
          customClass: { popup: "rounded-2xl" },
        });
        return;
      }
      if (code === "CONEXION_CONECTADA") {
        Swal.fire({
          icon: "info",
          title: "Conexión ya vinculada",
          text:
            msg ||
            "No puedes cambiar el número de una conexión ya vinculada a WhatsApp Business.",
          confirmButtonColor: "#1d4ed8",
          customClass: { popup: "rounded-2xl" },
        });
        return;
      }

      Swal.fire({
        icon: "error",
        title: "No se pudo guardar",
        text: msg || "Error al conectar con el servidor.",
        confirmButtonColor: "#1d4ed8",
        customClass: { popup: "rounded-2xl" },
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#0a1a36]/50 backdrop-blur-md p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header blanco con ícono */}
        <div className="relative bg-white border-b border-gray-100 px-6 pt-7 pb-5 text-center">
          <button
            onClick={onClose}
            className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Cerrar"
            disabled={saving}
          >
            <i className="bx bx-x text-xl" />
          </button>

          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 ring-1 ring-indigo-100 mx-auto">
            <i className="bx bx-edit-alt text-2xl text-indigo-600" />
          </span>

          <h2 className="text-lg font-bold text-gray-900 mt-3">
            Editar conexión
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Corrige el nombre o el número. Solo se puede mientras la conexión no
            esté vinculada a WhatsApp Business.
          </p>
        </div>

        {/* Cuerpo */}
        <div className="p-6">
          {/* Nombre */}
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Nombre del negocio
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Mi Tienda Online"
              className="mt-1.5 w-full px-3.5 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/25 focus:border-[#1d4ed8] focus:bg-white transition-all duration-200"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {/* Teléfono */}
          <div className="mt-4">
            <label className="text-sm font-semibold text-gray-700">
              Número de WhatsApp
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ""))}
              placeholder="593987654321"
              className="mt-1.5 w-full px-3.5 py-2.5 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/25 focus:border-[#1d4ed8] focus:bg-white transition-all duration-200"
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-xs text-gray-400 mt-1.5">
              Incluye el código de país, sin espacios ni signos (ej.{" "}
              <span className="font-mono">593</span> para Ecuador).
            </p>
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-end gap-2 pt-5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 font-medium hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 disabled:opacity-50"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1d4ed8] text-sm text-white font-semibold hover:bg-[#1e40af] shadow-sm transition-all duration-200 disabled:opacity-70"
              disabled={saving}
            >
              {saving ? (
                <>
                  <i className="bx bx-loader-alt bx-spin" />
                  Guardando
                </>
              ) : (
                "Guardar cambios"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
