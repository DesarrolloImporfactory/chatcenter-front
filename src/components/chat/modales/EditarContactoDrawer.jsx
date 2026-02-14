import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { apiUpdateClienteChatCenter } from "../../../services/clientesChatCenter.service";

const swalLoading = (title) =>
  Swal.fire({
    title,
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

const swalClose = () => Swal.close();

const swalToast = (title) =>
  Swal.fire({
    toast: true,
    position: "top-end",
    icon: "success",
    title,
    timer: 2000,
    showConfirmButton: false,
  });

const swalError = (title, text) => Swal.fire({ icon: "error", title, text });

function getIdFromChat(selectedChat) {
  return (
    selectedChat?.id_cliente ||
    selectedChat?.id_contacto ||
    selectedChat?.id ||
    null
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  type = "text",
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-[#171931]">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="
          mt-1 w-full rounded-xl
          border border-[#171931]/15
          bg-white
          px-3 py-2 text-sm text-[#171931]
          placeholder:text-[#171931]/35
          outline-none transition-all duration-200
          focus:ring-blue-600 focus:border-blue-600 
        "
      />
    </div>
  );
}

export default function EditarContactoDrawer({
  open,
  onClose,
  selectedChat,
  onSaved,
}) {
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    if (!open) return;

    setEditing({
      id_plataforma: selectedChat?.id_plataforma ?? null,
      id_configuracion: selectedChat?.id_configuracion ?? null,
      id_etiqueta: selectedChat?.id_etiqueta ?? null,
      uid_cliente: selectedChat?.uid_cliente ?? "",

      // ✅ 4 campos editables
      nombre: selectedChat?.nombre_cliente ?? selectedChat?.nombre ?? "",
      apellido: selectedChat?.apellido_cliente ?? selectedChat?.apellido ?? "",
      email: selectedChat?.email_cliente ?? "",
      telefono: selectedChat?.celular_cliente ?? selectedChat?.celular ?? "",

      // ⚙️ resto por compatibilidad
      imagePath: selectedChat?.imagePath ?? selectedChat?.image ?? "",
      mensajes_por_dia_cliente: selectedChat?.mensajes_por_dia_cliente ?? 0,
      estado: selectedChat?.estado_cliente ?? 1,
      chat_cerrado: selectedChat?.chat_cerrado ?? 0,
      bot_openia: selectedChat?.bot_openia ?? 1,
      pedido_confirmado: selectedChat?.pedido_confirmado ?? 0,
    });
  }, [open, selectedChat]);

  const onSave = async () => {
    try {
      if (!editing?.nombre && !editing?.telefono && !editing?.email) {
        await Swal.fire({
          icon: "info",
          title: "Datos incompletos",
          text: "Ingresa al menos nombre, teléfono o email",
        });
        return;
      }

      const id = getIdFromChat(selectedChat);
      if (!id) {
        await Swal.fire({
          icon: "error",
          title: "No se encontró el ID del cliente",
          text: "Revise qué campo trae selectedChat (id_cliente / id_contacto / id).",
        });
        return;
      }

      swalLoading("Actualizando contacto...");
      const updated = await apiUpdateClienteChatCenter(id, editing);
      swalClose();
      swalToast("Guardado correctamente");

      onSaved?.(updated, editing);
      onClose?.();
    } catch (e) {
      console.error("SAVE CHAT CONTACT:", e?.response?.data || e.message);
      swalClose();
      swalError("No se pudo guardar", e?.response?.data?.message || e.message);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[6px]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md overflow-hidden rounded-2xl shadow-2xl">
          {/* Header (azul) */}
          <div className="flex items-center justify-between bg-[#171931] px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                <i className="bx bx-pencil text-lg text-white" />
              </span>

              <div className="leading-tight">
                <p className="text-sm font-semibold text-white">
                  Editar contacto
                </p>
                <p className="text-[11px] text-white/75">
                  Actualice nombre, celular y email
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl p-2 hover:bg-white/10 transition"
              aria-label="Cerrar"
              title="Cerrar"
            >
              <i className="bx bx-x text-2xl text-white" />
            </button>
          </div>

          {/* Body (blanco) */}
          <div className="bg-white px-5 py-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field
                label="Nombre"
                value={editing?.nombre || ""}
                onChange={(v) => setEditing((p) => ({ ...p, nombre: v }))}
                placeholder="Nombre"
              />
              <Field
                label="Apellido"
                value={editing?.apellido || ""}
                onChange={(v) => setEditing((p) => ({ ...p, apellido: v }))}
                placeholder="Apellido"
              />
            </div>

            <Field
              label="Celular"
              value={editing?.telefono || ""}
              onChange={(v) => setEditing((p) => ({ ...p, telefono: v }))}
              placeholder="Ej: 0999999999"
              inputMode="tel"
            />

            <Field
              label="Email"
              type="email"
              value={editing?.email || ""}
              onChange={(v) => setEditing((p) => ({ ...p, email: v }))}
              placeholder="correo@dominio.com"
              inputMode="email"
            />

            {/* Preview (tarjetita elegante) */}
            <div className="rounded-xl border border-[#171931]/10 bg-white px-4 py-3 shadow-sm">
              <p className="text-[11px] font-semibold text-[#171931]/70 mb-1">
                Vista previa
              </p>
              <p className="text-sm text-[#171931] font-extrabold truncate">
                {(editing?.nombre || "—") + " " + (editing?.apellido || "")}
              </p>
              <p className="text-[12px] text-[#171931]/80 truncate">
                {editing?.telefono || "Sin celular"}
              </p>
              <p className="text-[12px] text-[#171931]/60 truncate">
                {editing?.email || "Sin email"}
              </p>
            </div>
          </div>

          {/* Footer (blanco, botones pro) */}
          <div className="bg-white px-5 py-4 border-t border-[#171931]/10 flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="
                rounded-xl px-4 py-2 text-sm font-semibold
                border border-[#171931]/20
                text-[#171931]
                hover:bg-[#171931]/5 transition
              "
            >
              Cancelar
            </button>

            <button
              onClick={onSave}
              className="
                rounded-xl px-4 py-2 text-sm font-semibold
                bg-[#171931] text-white
                hover:opacity-90 transition
              "
            >
              Guardar cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
