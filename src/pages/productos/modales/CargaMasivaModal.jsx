// src/components/productos/modales/CargaMasivaModal.jsx
import React, { useState, useRef } from "react";
import Swal from "sweetalert2";
import chatApi from "../../../api/chatcenter";

const PLANTILLA_URL =
  "https://imp-datas.s3.amazonaws.com/documents/2026-04-13T22-26-47-059Z-2026-04-13T22-23-27-357Z-plantilla_subida_masiva__1_.xlsx";

const COLUMNAS = [
  { col: "nombre", req: true, desc: "Nombre del producto" },
  { col: "descripcion", req: false, desc: "Descripción corta" },
  { col: "tipo", req: true, desc: '"producto" o "servicio"' },
  { col: "precio", req: true, desc: "Precio de venta (ej: 29.99)" },
  {
    col: "categoria",
    req: false,
    desc: "Se crea automáticamente si no existe",
  },
  { col: "imagen_url", req: false, desc: "URL de la imagen del producto" },
  { col: "precio_proveedor", req: false, desc: "Costo del proveedor" },
  { col: "stock", req: false, desc: "Unidades disponibles" },
  { col: "material", req: false, desc: "Anuncios/imagenes-landing" },
  { col: "es_privado", req: false, desc: '"1" = privado, "0" = público' },
  { col: "combos", req: false, desc: 'Ej: "2x50, 3x80, 4x90"' },
];

const CargaMasivaModal = ({ open, onClose, onSuccess }) => {
  const [archivo, setArchivo] = useState(null);
  const [nombreArchivo, setNombreArchivo] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const fileRef = useRef(null);

  if (!open) return null;

  const reset = () => {
    setArchivo(null);
    setNombreArchivo(null);
    setResultado(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = (f) => {
    if (!f) return;
    const ext = f.name.split(".").pop().toLowerCase();
    if (!["xlsx", "xls"].includes(ext)) {
      Swal.fire({ icon: "warning", title: "Solo archivos .xlsx o .xls" });
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      Swal.fire({ icon: "warning", title: "El archivo excede 10 MB" });
      return;
    }
    setArchivo(f);
    setNombreArchivo(f.name);
    setResultado(null);
  };

  const handleSubir = async () => {
    if (!archivo) {
      Swal.fire({ icon: "warning", title: "Selecciona un archivo Excel" });
      return;
    }
    const idc = localStorage.getItem("id_configuracion");
    if (!idc) return;

    setUploading(true);
    setResultado(null);
    try {
      const fd = new FormData();
      fd.append("archivoExcel", archivo);
      fd.append("id_configuracion", idc);

      const { data } = await chatApi.post(
        "/productos/cargaMasivaProductos",
        fd,
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      setResultado(data);

      if (data.resumen?.errores === 0) {
        Swal.fire({
          icon: "success",
          title: `${data.resumen.insertados} productos importados`,
          timer: 2000,
          showConfirmButton: false,
        });
        setTimeout(() => handleClose(), 2100);
        return;
      }

      onSuccess?.();
    } catch {
      Swal.fire({ icon: "error", title: "Error al subir el archivo" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: "rgba(5,7,20,.72)",
        backdropFilter: "blur(12px)",
      }}
      onKeyDown={(e) => e.key === "Escape" && !uploading && handleClose()}
    >
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col max-h-[92vh]"
        style={{
          boxShadow: "0 24px 80px rgba(0,0,0,.5)",
          animation: "cmIn .22s ease",
        }}
      >
        {/* ── HEADER ── */}
        <div
          className="flex items-center justify-between px-6 py-5 flex-shrink-0"
          style={{
            background:
              "linear-gradient(135deg,#171931 0%,#1e2550 60%,#2c3a8c 100%)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "rgba(255,255,255,.12)",
                border: "1px solid rgba(255,255,255,.18)",
              }}
            >
              <i className="bx bx-spreadsheet text-white text-xl" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base">
                Carga masiva de productos
              </h2>
              <p className="text-indigo-300 text-xs mt-0.5">
                Importa múltiples productos desde un archivo Excel
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white/60
              hover:text-white hover:bg-white/12 transition-colors disabled:opacity-40"
          >
            <i className="bx bx-x text-xl" />
          </button>
        </div>

        {/* ── BODY ── */}
        <div className="flex-1 overflow-y-auto bg-white">
          {/* Instrucciones columnas */}
          <div className="px-6 pt-5 pb-3">
            <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <i className="bx bx-table text-indigo-500" />
              Columnas esperadas en el Excel
            </p>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-3 py-2 font-semibold text-slate-500 uppercase tracking-wider">
                      Columna
                    </th>
                    <th className="text-center px-3 py-2 font-semibold text-slate-500 uppercase tracking-wider w-20">
                      Requerido
                    </th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-500 uppercase tracking-wider">
                      Descripción
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COLUMNAS.map((c, i) => (
                    <tr
                      key={c.col}
                      className={`border-b border-slate-50 ${i % 2 ? "bg-slate-50/40" : ""}`}
                    >
                      <td className="px-3 py-1.5">
                        <code className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-semibold text-[11px]">
                          {c.col}
                        </code>
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        {c.req ? (
                          <span className="inline-block w-5 h-5 rounded-full bg-rose-100 text-rose-600 text-[10px] font-bold leading-5">
                            ✓
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-slate-500">{c.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              <i className="bx bx-info-circle text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-700 leading-relaxed">
                <strong>Categorías</strong> se crean automáticamente si no
                existen. <strong>Combos</strong> van en formato{" "}
                <code className="bg-amber-100 px-1 rounded">2x50, 3x80</code>{" "}
                (cantidad × precio). La primera fila del Excel debe ser el
                encabezado con los nombres de columna.
              </div>
            </div>
          </div>

          {/* Zona de upload */}
          <div className="px-6 pb-5">
            <div
              onDrop={(e) => {
                e.preventDefault();
                handleFile(e.dataTransfer.files?.[0]);
              }}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                transition-colors ${
                  nombreArchivo
                    ? "border-emerald-300 bg-emerald-50/50"
                    : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                }`}
            >
              {nombreArchivo ? (
                <>
                  <i className="bx bx-check-circle text-4xl text-emerald-500 mb-2 block" />
                  <p className="text-sm font-semibold text-emerald-700">
                    {nombreArchivo}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Haz clic para cambiar archivo
                  </p>
                </>
              ) : (
                <>
                  <i className="bx bx-cloud-upload text-4xl text-slate-300 mb-2 block" />
                  <p className="text-sm text-slate-600">
                    Arrastra tu Excel aquí o{" "}
                    <span className="text-indigo-600 font-semibold">
                      selecciona un archivo
                    </span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    .xlsx, .xls — máx. 10 MB
                  </p>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>

            {/* Quitar archivo */}
            {nombreArchivo && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  reset();
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="mt-2 text-xs text-slate-400 hover:text-red-500 transition-colors"
              >
                <i className="bx bx-x mr-0.5" />
                Quitar archivo
              </button>
            )}
          </div>

          {/* Resultados de la carga */}
          {resultado && (
            <div className="px-6 pb-5">
              <div
                className={`rounded-xl border px-4 py-3 ${
                  resultado.resumen?.errores > 0
                    ? "bg-amber-50 border-amber-200"
                    : "bg-emerald-50 border-emerald-200"
                }`}
              >
                <p className="text-sm font-semibold mb-1">
                  {resultado.resumen?.errores > 0 ? (
                    <span className="text-amber-700">
                      <i className="bx bx-error-circle mr-1" />
                      {resultado.resumen.insertados} insertados,{" "}
                      {resultado.resumen.errores} con error
                    </span>
                  ) : (
                    <span className="text-emerald-700">
                      <i className="bx bx-check-circle mr-1" />
                      {resultado.resumen?.insertados} productos importados
                      correctamente
                    </span>
                  )}
                </p>

                {/* Detalle errores */}
                {resultado.resultados?.some((r) => r.error) && (
                  <div className="mt-2 max-h-32 overflow-y-auto">
                    {resultado.resultados
                      .filter((r) => r.error)
                      .map((r, i) => (
                        <div
                          key={i}
                          className="text-xs text-red-600 flex items-start gap-1 mb-0.5"
                        >
                          <span className="font-mono font-semibold flex-shrink-0">
                            Fila {r.fila}:
                          </span>
                          <span>{r.error}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{
            background:
              "linear-gradient(135deg,#171931 0%,#1e2550 60%,#2c3a8c 100%)",
          }}
        >
          <a
            href={PLANTILLA_URL}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="inline-flex items-center gap-2 text-xs px-3 py-2 rounded-lg font-medium
              transition-colors text-white/80 hover:text-white hover:bg-white/10"
            style={{ border: "1px solid rgba(255,255,255,.2)" }}
          >
            <i className="bx bx-download" />
            Descargar plantilla
          </a>
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              disabled={uploading}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors
                text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-40"
              style={{ border: "1.5px solid rgba(255,255,255,.25)" }}
            >
              {resultado ? "Cerrar" : "Cancelar"}
            </button>
            {!resultado && (
              <button
                onClick={handleSubir}
                disabled={!archivo || uploading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold
                  text-white transition-colors disabled:opacity-40"
                style={{ background: uploading ? "#6366f1" : "#4f46e5" }}
              >
                {uploading ? (
                  <>
                    <i className="bx bx-loader-alt bx-spin" />
                    Procesando…
                  </>
                ) : (
                  <>
                    <i className="bx bx-upload" />
                    Subir y procesar
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes cmIn {
          from { opacity:0; transform:scale(.96) translateY(14px); }
          to   { opacity:1; transform:scale(1)   translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default CargaMasivaModal;
