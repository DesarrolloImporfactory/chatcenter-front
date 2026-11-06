import React, { useMemo, useState } from "react";
import Swal from "sweetalert2";
import chatApi from "../../../api/chatcenter";

/* Modal para corregir el nombre y el número de una conexión.

   Conexión que nunca se vinculó: corrige un número mal escrito antes de
   conectar, sin eliminar y recrear la conexión.

   Conexión ya vinculada (ya_vinculado = 1): hasta 2026-11-06 el número
   quedaba bloqueado para siempre y la única salida era crear otra conexión,
   perdiendo la configuración del asistente. Ahora se puede cambiar cuando
   la conexión NO está conectada (si lo está, primero «Desconectar número»
   en el menú de la tarjeta: el campo sale bloqueado y el back responde 409
   NUMERO_CONECTADO), avisando antes de que los chats del número anterior y
   del nuevo van a convivir en la misma bandeja (es la misma conexión). Al
   guardar, la conexión queda pendiente de reconectar: el usuario pulsa
   Conectar en la tarjeta, y al vincular el número nuevo el backend recrea
   solo las plantillas del asistente en la WABA nueva.

   El número se muestra completo (con código de país); al guardar se envía
   como solo-dígitos y el backend valida unicidad. */
const SWAL_BASE = {
  confirmButtonColor: "#1d4ed8",
  customClass: { popup: "rounded-2xl" },
};

export default function EditarConexionModal({
  config,
  userData,
  onClose,
  onSaved,
}) {
  const telefonoOriginal = String(config?.telefono || "").replace(/\D/g, "");
  const [nombre, setNombre] = useState(config?.nombre_configuracion || "");
  const [telefono, setTelefono] = useState(telefonoOriginal);
  const [acepto, setAcepto] = useState(false);
  const [saving, setSaving] = useState(false);

  const yaVinculado =
    Number(config?.ya_vinculado) === 1 ||
    Boolean(
      String(config?.id_telefono || "").trim() &&
        String(config?.id_whatsapp || "").trim(),
    );
  const totalChats = Number(config?.total_chats) || 0;
  // Conectada ahora mismo con Meta: el número no se toca hasta desconectarla.
  const conectada =
    String(config?.status_whatsapp || "").toUpperCase() === "CONNECTED";
  const cambiaNumero = useMemo(
    () => telefono.replace(/\D/g, "") !== telefonoOriginal,
    [telefono, telefonoOriginal],
  );
  // Solo cuando de verdad hay historial que se va a mezclar.
  const pideConfirmacion = yaVinculado && cambiaNumero;

  const guardar = async (confirmarMezcla) => {
    const nombreTrim = nombre.trim();
    const telDigitos = telefono.replace(/\D/g, "");

    const resp = await chatApi.post(
      "/configuraciones/editar_conexion",
      {
        id_configuracion: config.id,
        id_usuario: userData.id_usuario,
        nombre_configuracion: nombreTrim,
        telefono: telDigitos,
        confirmar_mezcla: confirmarMezcla,
      },
      { silentError: true },
    );

    if (resp.data?.status !== 200) {
      Swal.fire({
        ...SWAL_BASE,
        icon: "error",
        title: "No se pudo guardar",
        text: resp.data?.message || "Intenta nuevamente.",
      });
      return;
    }

    const data = resp.data?.data || {};
    onSaved?.({
      ...config,
      ...data,
      id: config.id,
      nombre_configuracion: nombreTrim,
      telefono: telDigitos,
    });
    onClose?.();

    if (data.requiere_reconexion) {
      Swal.fire({
        ...SWAL_BASE,
        icon: "success",
        title: "Número actualizado",
        html:
          `<div style="font-size:14px;line-height:1.55;text-align:left">` +
          `<p>El número de <b>${nombreTrim}</b> ahora es <b>${telDigitos}</b>.</p>` +
          `<p style="margin-top:8px">Falta un paso: pulsa <b>Conectar</b> en la tarjeta de la conexión para vincular el número nuevo con Meta.</p>` +
          `<p style="margin-top:8px;color:#475569">Si esta conexión ya tenía su asistente configurado, al conectar se vuelven a crear solas las plantillas de WhatsApp en el número nuevo. Meta suele aprobarlas en minutos.</p>` +
          `</div>`,
        confirmButtonText: "Entendido",
      });
    }
  };

  const handleGuardar = async () => {
    if (saving) return;

    const nombreTrim = nombre.trim();
    const telDigitos = telefono.replace(/\D/g, "");

    if (!nombreTrim || !telDigitos) {
      Swal.fire({
        ...SWAL_BASE,
        icon: "warning",
        title: "Completa los campos",
        text: "El nombre y el número son obligatorios.",
      });
      return;
    }
    // Número completo con código de país (ej. 593987654321)
    if (telDigitos.length < 10) {
      Swal.fire({
        ...SWAL_BASE,
        icon: "warning",
        title: "Número incompleto",
        text: "Ingresa el número completo con el código de país.",
      });
      return;
    }
    if (pideConfirmacion && !acepto) {
      Swal.fire({
        ...SWAL_BASE,
        icon: "info",
        title: "Confirma el cambio de número",
        text: "Marca la casilla para confirmar que entiendes que los chats del número anterior y del nuevo se verán juntos.",
      });
      return;
    }

    setSaving(true);
    try {
      await guardar(pideConfirmacion && acepto);
    } catch (error) {
      const code = error?.response?.data?.code;
      const msg = error?.response?.data?.message;

      if (code === "TELEFONO_EN_USO") {
        Swal.fire({
          ...SWAL_BASE,
          icon: "warning",
          iconColor: "#f59e0b",
          title: "Número en uso",
          text:
            msg ||
            "Este número ya está en uso por otra conexión activa. Debe eliminarse antes de poder registrarlo aquí.",
        });
        return;
      }
      if (code === "CONFIRMAR_MEZCLA") {
        /* El backend no recibió la confirmación (p. ej. la tarjeta no traía
           ya_vinculado). Se pregunta aquí mismo y se reintenta. */
        const n = Number(error?.response?.data?.total_chats) || totalChats;
        const r = await Swal.fire({
          ...SWAL_BASE,
          icon: "warning",
          iconColor: "#f59e0b",
          title: "Esta conexión ya tiene conversaciones",
          html:
            `<div style="font-size:14px;line-height:1.55;text-align:left">` +
            `<p>${msg || "Si cambias el número, los chats nuevos llegarán a esta misma bandeja y se verán junto a los anteriores."}</p>` +
            (n
              ? `<p style="margin-top:8px;color:#475569">Conversaciones actuales: <b>${n.toLocaleString("es")}</b>.</p>`
              : "") +
            `</div>`,
          showCancelButton: true,
          confirmButtonText: "Sí, cambiar el número",
          cancelButtonText: "Cancelar",
        });
        if (r.isConfirmed) {
          try {
            await guardar(true);
          } catch (e2) {
            Swal.fire({
              ...SWAL_BASE,
              icon: "error",
              title: "No se pudo guardar",
              text:
                e2?.response?.data?.message ||
                "Error al conectar con el servidor.",
            });
          }
        }
        return;
      }
      if (code === "NUMERO_CONECTADO" || code === "CONEXION_CONECTADA") {
        Swal.fire({
          ...SWAL_BASE,
          icon: "info",
          title: "Primero desconecta el número",
          text:
            msg ||
            "Esta conexión está conectada con WhatsApp. Usa «Desconectar número» en el menú de la conexión y después cámbialo.",
        });
        return;
      }

      Swal.fire({
        ...SWAL_BASE,
        icon: "error",
        title: "No se pudo guardar",
        text: msg || "Error al conectar con el servidor.",
      });
    } finally {
      setSaving(false);
    }
  };

  const guardarBloqueado = saving || (pideConfirmacion && !acepto);

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
            {conectada
              ? "Cambia el nombre de la conexión. Para cambiar el número, primero desconéctalo desde el menú de la conexión."
              : yaVinculado
                ? "Cambia el nombre o el número. Si cambias el número tendrás que volver a conectarlo con Meta; la configuración de tu asistente se conserva."
                : "Corrige el nombre o el número antes de conectar la conexión con WhatsApp Business."}
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
              disabled={conectada}
              className="mt-1.5 w-full px-3.5 py-2.5 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/25 focus:border-[#1d4ed8] focus:bg-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              autoComplete="off"
              spellCheck={false}
            />
            {conectada ? (
              <p className="text-xs text-gray-500 mt-1.5 flex items-start gap-1.5">
                <i className="bx bx-lock-alt text-sm text-gray-400 shrink-0 mt-px" />
                <span>
                  Este número está conectado con WhatsApp. Para cambiarlo,
                  usa <b>Desconectar número</b> en el menú de la conexión y
                  vuelve aquí.
                </span>
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-1.5">
                Incluye el código de país, sin espacios ni signos (ej.{" "}
                <span className="font-mono">593</span> para Ecuador).
              </p>
            )}
          </div>

          {/* Aviso de mezcla: solo si ya hubo chats y el número cambia */}
          {pideConfirmacion && (
            <div className="mt-4 rounded-xl bg-amber-50 ring-1 ring-amber-200 p-3.5">
              <div className="flex items-start gap-2.5">
                <i className="bx bx-info-circle text-lg text-amber-600 shrink-0 mt-px" />
                <div className="text-[12.5px] leading-relaxed text-amber-900">
                  <p className="font-semibold">
                    Esta conexión ya tiene conversaciones
                    {totalChats > 0 && (
                      <>
                        {" "}
                        ({totalChats.toLocaleString("es")})
                      </>
                    )}
                    .
                  </p>
                  <p className="mt-1">
                    Al cambiar el número, los chats que lleguen al número
                    nuevo se verán en esta misma bandeja, junto a los del
                    número anterior. No se borra nada: la configuración de tu
                    asistente se conserva.
                  </p>
                  <p className="mt-1">
                    Después de guardar, pulsa <b>Conectar</b> en la tarjeta
                    para vincular el número nuevo con Meta. Las plantillas del
                    asistente se vuelven a crear solas.
                  </p>
                </div>
              </div>
              <label className="mt-3 flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={acepto}
                  onChange={(e) => setAcepto(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-[12.5px] text-amber-900">
                  Entiendo que los chats del número anterior y del nuevo se
                  verán juntos en esta conexión.
                </span>
              </label>
            </div>
          )}

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
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1d4ed8] text-sm text-white font-semibold hover:bg-[#1e40af] shadow-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={guardarBloqueado}
            >
              {saving ? (
                <>
                  <i className="bx bx-loader-alt bx-spin" />
                  Guardando
                </>
              ) : pideConfirmacion ? (
                "Cambiar número"
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
