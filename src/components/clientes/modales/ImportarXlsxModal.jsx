import React, { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";

/**
 * ImportarXlsxModal.jsx
 *
 * Flujo:
 * 1) Se abre ESTE modal (azul) con instrucciones + link plantilla + dropzone
 * 2) Usuario adjunta/arrastra archivo => se habilita botón "Importar"
 * 3) Click Importar => se cierra ESTE modal y se abre Swal PRO loader
 * 4) Se envía al backend /clientes_chat_center/importacion_masiva
 * 5) Refresca listado + etiquetas => success / error
 *
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - chatApi: axios instance
 * - apiList: (page:number, force:boolean) => Promise<void>
 * - cargarOpcionesFiltroEtiquetas: () => Promise<void>
 */
export default function ImportarXlsxModal({
  open,
  onClose,
  chatApi,
  apiList,
  cargarOpcionesFiltroEtiquetas,
}) {
  const PLANTILLA_URL =
    "https://imp-datas.s3.amazonaws.com/documents/2026-01-12T22-55-34-472Z-plantilla_import_clientes.xlsx";

  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  // Reset cada vez que se abre
  useEffect(() => {
    if (open) {
      setFile(null);
      setError("");
      setDragOver(false);
    }
  }, [open]);

  const isValidFile = useMemo(() => {
    if (!file) return false;
    const name = (file.name || "").toLowerCase();
    return name.endsWith(".xlsx") || name.endsWith(".xls");
  }, [file]);

  // ---------------------------
  // SweetAlert PRO helpers
  // ---------------------------
  function swalImportPro({
    title = "Importando contactos",
    subtitle = "Procesando archivo Excel y sincronizando etiquetas…",
    total = null,
  }) {
    const totalText = Number.isFinite(total)
      ? `<div style="margin-top:8px; font-size:13px; opacity:.9;">Total detectado: <b>${total}</b></div>`
      : "";

    Swal.fire({
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      background: "#fff",
      width: 560,
      padding: 0,
      html: `
      <div style="border-radius:18px; overflow:hidden; text-align:left; font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial;">
        
        <!-- HEADER -->
        <div style="
          background: rgb(23 25 49);
          padding: 18px;
          color: #fff;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;">
          <div style="display:flex; flex-direction:column;">
            <div style="font-weight:800; font-size:16px; letter-spacing:.2px;">${title}</div>
            <div style="font-size:12.5px; opacity:.9; margin-top:3px;">No cierre esta ventana. Esto puede tardar unos segundos.</div>
          </div>

          <div style="
            width: 42px; height: 42px;
            border-radius: 999px;
            border: 3px solid rgba(255,255,255,.25);
            border-top-color: rgba(255,255,255,.95);
            animation: spin 0.9s linear infinite;
            flex: 0 0 auto;"></div>
        </div>

        <!-- BODY -->
        <div style="padding: 18px;">
          <div style="font-size:14px; color:#111827; font-weight:700;">${subtitle}</div>
          ${totalText}

          <div style="margin-top:14px; padding:14px; border:1px solid #e5e7eb; border-radius:14px; background:#fafafa;">
            <div style="display:flex; gap:10px; align-items:flex-start;">
              <div style="font-size:18px; line-height:1;">📌</div>
              <div style="font-size:13px; color:#374151; line-height:1.45;">
                Estamos insertando/actualizando clientes, creando etiquetas faltantes y sincronizando asignaciones.<br/>
                <span style="opacity:.85;">Al finalizar, actualizaremos el listado automáticamente.</span>
              </div>
            </div>
          </div>

          <!-- mini loader barra -->
          <div style="margin-top:16px; height:10px; border-radius:999px; background:#e5e7eb; overflow:hidden;">
            <div style="
              height:100%;
              width:40%;
              background: linear-gradient(90deg, #0075FF, #00C2FF);
              border-radius:999px;
              animation: loadingBar 1.1s ease-in-out infinite;"></div>
          </div>

          <div style="margin-top:10px; font-size:12px; color:#6b7280;">
            Si su Excel tiene 3,000 contactos, el proceso puede tomar ~10–20s según carga del servidor.
          </div>
        </div>
      </div>

      <style>
        @keyframes spin { to { transform: rotate(360deg);} }
        @keyframes loadingBar {
          0% { transform: translateX(-70%); width:35%; }
          50% { transform: translateX(60%); width:55%; }
          100% { transform: translateX(170%); width:35%; }
        }
      </style>
    `,
    });
  }

  function swalImportSuccessPro(
    message = "Importación completada correctamente."
  ) {
    return Swal.fire({
      icon: "success",
      title: "Importación completada",
      text: message,
      confirmButtonText: "Entendido",
    });
  }

  function swalImportErrorPro(message = "Ocurrió un error en la importación.") {
    return Swal.fire({
      icon: "error",
      title: "No se pudo importar",
      text: message,
      confirmButtonText: "Cerrar",
    });
  }

  // ---------------------------
  // Importación (SIN pantalla extra)
  // ---------------------------
  async function importXLSX(selectedFile) {
    try {
      const id_configuracion_local = Number(
        localStorage.getItem("id_configuracion")
      );

      if (!id_configuracion_local) {
        await Swal.fire(
          "Sin configuración",
          "No se encontró id_configuracion en localStorage.",
          "info"
        );
        return;
      }

      // ✅ Modal PRO loading
      swalImportPro({
        total: null,
        subtitle: "Subiendo archivo y ejecutando importación…",
      });

      const formData = new FormData();
      formData.append("archivoExcel", selectedFile); // multer .single('archivoExcel')
      formData.append("id_configuracion", String(id_configuracion_local));
      formData.append("actualizar_cache_etiquetas", "true");

      // ✅ Endpoint
      const { data: resp } = await chatApi.post(
        "/clientes_chat_center/importacion_masiva",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      // ✅ Mantener modal mientras refresca listado
      Swal.update({
        html: `
        <div style="border-radius:18px; overflow:hidden; text-align:left; font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial;">
          <div style="background: rgb(23 25 49); padding: 18px; color:#fff; display:flex; align-items:center; justify-content:space-between; gap:12px;">
            <div>
              <div style="font-weight:900;font-size:16px;">Importación aplicada ✅</div>
              <div style="font-size:12.5px;opacity:.9;margin-top:3px;">Actualizando listado de contactos…</div>
            </div>
            <div style="width: 42px; height: 42px; border-radius: 999px; border: 3px solid rgba(255,255,255,.25); border-top-color: rgba(255,255,255,.95); animation: spin 0.9s linear infinite;"></div>
          </div>
          <div style="padding: 18px;">
            <div style="font-size:13px;color:#374151;line-height:1.5;">
              Estamos recargando contactos y etiquetas para mostrar los resultados inmediatamente.
            </div>
            <div style="margin-top:16px; height:10px; border-radius:999px; background:#e5e7eb; overflow:hidden;">
              <div style="height:100%; width:40%; background: linear-gradient(90deg, #0075FF, #00C2FF); border-radius:999px; animation: loadingBar 1.1s ease-in-out infinite;"></div>
            </div>
            <style>
              @keyframes spin { to { transform: rotate(360deg);} }
              @keyframes loadingBar {
                0% { transform: translateX(-70%); width:35%; }
                50% { transform: translateX(60%); width:55%; }
                100% { transform: translateX(170%); width:35%; }
              }
            </style>
          </div>
        </div>
      `,
        showConfirmButton: false,
      });

      await apiList(1, true);
      await cargarOpcionesFiltroEtiquetas();

      Swal.close();

      await swalImportSuccessPro(
        resp?.message || "Importación completada correctamente."
      );
    } catch (e) {
      console.error("IMPORT XLSX:", e?.response?.data || e.message);
      Swal.close();
      await swalImportErrorPro(
        e?.response?.data?.message || e?.message || "Error desconocido."
      );
    }
  }

  // ---------------------------
  // UI Dropzone
  // ---------------------------
  const pickFile = () => inputRef.current?.click();

  const onFileSelected = (f) => {
    setError("");
    if (!f) return;

    setFile(f);

    const name = (f.name || "").toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      setError("Formato inválido. Suba un archivo .xlsx o .xls.");
    }
  };

  const onInputChange = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    onFileSelected(f);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    onFileSelected(f);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = () => setDragOver(false);

  const handleImportClick = async () => {
    setError("");

    if (!file) {
      setError("Adjunte un archivo antes de continuar.");
      return;
    }
    if (!isValidFile) {
      setError("Formato inválido. Suba un archivo .xlsx o .xls.");
      return;
    }

    // Cierra el modal React y ejecuta el flujo PRO (Swal)
    onClose?.();

    // (opcional) deja respirar el DOM para evitar parpadeos
    setTimeout(() => {
      importXLSX(file);
    }, 0);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="bg-[#171931] px-5 py-4 text-white">
          <div className="text-base font-extrabold">
            Importación masiva de contactos
          </div>
          <div className="mt-1 text-xs opacity-90">
            Use únicamente la plantilla oficial y cargue el Excel en el formato
            correcto.
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Plantilla + reglas */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <div className="text-lg leading-none">📄</div>
              <div className="flex-1">
                <div className="text-sm font-extrabold text-slate-900">
                  Plantilla requerida
                </div>
                <div className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Descargue la plantilla, llénela y luego súbala aquí mismo.
                </div>

                <a
                  href={PLANTILLA_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
                >
                  Descargar plantilla de importación ⬇
                </a>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-extrabold text-slate-900">
                Reglas importantes
              </div>
              <ul className="mt-2 list-disc pl-5 space-y-1 text-xs text-slate-700">
                <li>
                  <b>Límite:</b> hasta <b>3,000 contactos por carga</b>. Si
                  tiene más, importe por lotes.
                </li>
                <li>
                  <b>Etiquetas múltiples:</b> sepárelas con <b>coma</b>. Ej:{" "}
                  <b>pendiente, potencial, clientes vip</b>
                </li>
                <li>
                  <b>Email:</b> la columna email puede ir vacía.
                </li>
                <li>
                  <b>Teléfono:</b> evite caracteres extraños; si viene con + o
                  espacios, el sistema lo normaliza.
                </li>
              </ul>

              <div className="mt-3 text-[11px] text-slate-500">
                Recomendación: evite filas vacías al final del Excel para que el
                proceso sea más rápido.
              </div>
            </div>
          </div>

          {/* Dropzone */}
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={pickFile}
            className={[
              "cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition",
              dragOver
                ? "border-blue-600 bg-blue-50"
                : "border-slate-300 bg-white",
            ].join(" ")}
          >
            <div className="text-sm font-extrabold text-slate-900">
              Adjunte o arrastre su archivo acá
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Click para seleccionar desde su computadora (.xlsx / .xls)
            </div>

            {file && (
              <div className="mt-4 text-xs text-slate-700">
                <span className="font-bold">Archivo:</span> {file.name}
              </div>
            )}

            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={onInputChange}
              className="hidden"
            />
          </div>

          {error && (
            <div className="text-xs font-semibold text-red-600">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={!file || !isValidFile}
            onClick={handleImportClick}
            className={[
              "rounded-lg px-4 py-2 text-sm font-extrabold text-white transition",
              !file || !isValidFile
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700",
            ].join(" ")}
          >
            Importar
          </button>
        </div>
      </div>
    </div>
  );
}
