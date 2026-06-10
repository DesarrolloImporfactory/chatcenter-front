import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Modal para personalizar un cambio de plan (downgrade) que reduce los
 * recursos disponibles. Muestra hasta DOS secciones (conexiones y
 * subusuarios); cada una aparece solo si el nuevo plan la reduce.
 *
 * Props (sin cambios respecto a la integración existente):
 *  - open, onClose, loading, planNombre, fechaEfectiva
 *  - conexiones: [{ id, nombre_configuracion, telefono, conectado }]
 *  - limiteConexiones: number  → conexiones que se podrán mantener activas (plan + complemento)
 *  - addonConexiones: number   → cuántas de ese total vienen del complemento
 *  - subusuarios: [{ id_sub_usuario, usuario, nombre_encargado, email, rol }]  (SIN el admin principal)
 *  - limiteSubusuarios: number → subusuarios (aparte del admin) que se podrán mantener activos
 *  - onConfirm: ({ conexionesSuspender:number[], subusuariosSuspender:number[] }) => void
 */

// ── Sección reutilizable ──
const SeccionRecurso = ({
  icono,
  titulo,
  descripcion,
  generoActivo, // "Activa" | "Activo"
  fraseSingular, // ej. "la conexión que seguirá activa"
  generoMantener, // "activas" | "activos"
  items, // [{ key, titulo, subtitulo, online }]
  limite,
  conservar,
  setConservar,
  loading,
}) => {
  const restante = Math.max(0, limite - conservar.length);
  const completo = conservar.length === limite;
  const sinCupo = limite === 0; // el nuevo plan no permite mantener ninguno

  const toggle = (key) => {
    if (sinCupo) return;
    setConservar((prev) => {
      if (prev.includes(key)) return prev.filter((x) => x !== key);
      if (prev.length >= limite) return prev;
      return [...prev, key];
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      {/* Encabezado */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eff6ff] text-[#1d4ed8]">
          <i className={`bx ${icono} text-xl`}></i>
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-[13px] font-bold text-[#171931]">{titulo}</h4>
            {!sinCupo && (
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${
                  completo
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-amber-50 text-amber-600"
                }`}
              >
                {completo ? (
                  <>
                    <i className="bx bx-check"></i> {conservar.length}/{limite}
                  </>
                ) : (
                  <>
                    {conservar.length}/{limite}
                  </>
                )}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] leading-[1.5] text-slate-500">
            {descripcion}
          </p>
        </div>
      </div>

      {/* Instrucción */}
      {!sinCupo && (
        <div className="px-4 pb-2">
          <span className="text-[11px] font-semibold text-slate-600">
            {limite === 1
              ? `Elige ${fraseSingular}`
              : `Elige ${limite} para mantener ${generoMantener}`}
          </span>
        </div>
      )}

      {/* Lista */}
      <div className="px-4 pb-4 space-y-2 max-h-[210px] overflow-y-auto">
        {items.map((it) => {
          const sel = conservar.includes(it.key);
          const enPausa = sinCupo || (!sel && conservar.length >= limite);
          return (
            <button
              key={it.key}
              onClick={() => toggle(it.key)}
              disabled={loading || sinCupo}
              className={`group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200 ${
                sel
                  ? "border-[#1d4ed8] bg-[#eff6ff]"
                  : enPausa
                    ? "border-slate-200 bg-slate-50"
                    : "border-slate-200 bg-white hover:border-[#1d4ed8]/40"
              } ${loading || sinCupo ? "cursor-default" : ""}`}
            >
              {!sinCupo && (
                <span
                  className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${
                    sel
                      ? "border-[#1d4ed8] bg-[#1d4ed8] text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {sel && <i className="bx bx-check text-sm"></i>}
                </span>
              )}

              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`block text-sm font-semibold truncate ${
                      enPausa ? "text-slate-400" : "text-[#171931]"
                    }`}
                  >
                    {it.titulo}
                  </span>
                  {it.online && !enPausa && (
                    <span
                      className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
                      title="Conectada"
                    ></span>
                  )}
                </span>
                <span className="block text-[11px] text-slate-400 truncate">
                  {it.subtitulo}
                </span>
              </span>

              {/* Estado claro: qué será de este ítem en el nuevo plan */}
              {sel ? (
                <span className="shrink-0 inline-flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-600">
                  <i className="bx bx-check-circle"></i> {generoActivo}
                </span>
              ) : enPausa ? (
                <span className="shrink-0 inline-flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full bg-slate-200/70 text-slate-500">
                  <i className="bx bx-pause-circle"></i> En pausa
                </span>
              ) : (
                <span className="shrink-0 text-[9px] font-medium px-2 py-1 text-slate-300">
                  Por elegir
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const ModalSeleccionConexiones = ({
  open,
  onClose,
  loading = false,
  planNombre = "",
  fechaEfectiva = null,
  conexiones = [],
  limiteConexiones = 0,
  addonConexiones = 0,
  subusuarios = [],
  limiteSubusuarios = 0,
  onConfirm,
}) => {
  const [conservarConex, setConservarConex] = useState([]);
  const [conservarSub, setConservarSub] = useState([]);

  useEffect(() => {
    if (open) {
      setConservarConex([]);
      setConservarSub([]);
    }
  }, [open, conexiones, subusuarios]);

  const necesitaConex = conexiones.length > limiteConexiones;
  const necesitaSub = subusuarios.length > limiteSubusuarios;

  const enPausaConex = Math.max(0, conexiones.length - limiteConexiones);
  const enPausaSub = Math.max(0, subusuarios.length - limiteSubusuarios);

  const extraConex = Number(addonConexiones || 0);
  const baseConex = Math.max(0, limiteConexiones - extraConex);

  const palabra = (n, sing, plur) => (n === 1 ? sing : plur);

  const fechaTexto = fechaEfectiva
    ? `el ${new Date(fechaEfectiva).toLocaleDateString("es-EC", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}`
    : "al final de tu período actual";

  const fmtTelefono = (t) => {
    const s = String(t || "");
    return s.length > 6 ? `+${s}` : s;
  };

  const itemsConex = useMemo(
    () =>
      conexiones.map((c) => ({
        key: c.id,
        titulo: c.nombre_configuracion || "Sin nombre",
        subtitulo: fmtTelefono(c.telefono),
        online: Number(c.conectado) === 1,
      })),
    [conexiones],
  );

  const itemsSub = useMemo(
    () =>
      subusuarios.map((s) => ({
        key: s.id_sub_usuario,
        titulo: s.nombre_encargado || s.usuario || "Sin nombre",
        subtitulo: `${s.email || s.usuario || ""}${s.rol ? ` · ${s.rol}` : ""}`,
        online: false,
      })),
    [subusuarios],
  );

  const okConex = !necesitaConex || conservarConex.length === limiteConexiones;
  const okSub = !necesitaSub || conservarSub.length === limiteSubusuarios;
  const puedeConfirmar =
    !loading && (necesitaConex || necesitaSub) && okConex && okSub;

  // Guía contextual cuando aún falta elegir
  const faltaConex =
    necesitaConex && limiteConexiones > 0 && !okConex
      ? limiteConexiones - conservarConex.length
      : 0;
  const faltaSub =
    necesitaSub && limiteSubusuarios > 0 && !okSub
      ? limiteSubusuarios - conservarSub.length
      : 0;
  const guia =
    faltaConex && faltaSub
      ? `Elige ${faltaConex} ${palabra(faltaConex, "conexión", "conexiones")} y ${faltaSub} ${palabra(faltaSub, "usuario", "usuarios")} para continuar`
      : faltaConex
        ? `Elige ${faltaConex} ${palabra(faltaConex, "conexión más", "conexiones más")} para continuar`
        : faltaSub
          ? `Elige ${faltaSub} ${palabra(faltaSub, "usuario más", "usuarios más")} para continuar`
          : "";

  const handleConfirm = () => {
    const conexionesSuspender = necesitaConex
      ? conexiones
          .filter((c) => !conservarConex.includes(c.id))
          .map((c) => c.id)
      : [];
    const subusuariosSuspender = necesitaSub
      ? subusuarios
          .filter((s) => !conservarSub.includes(s.id_sub_usuario))
          .map((s) => s.id_sub_usuario)
      : [];
    onConfirm?.({ conexionesSuspender, subusuariosSuspender });
  };

  if (!open) return null;

  const containerVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.28 } },
    exit: { opacity: 0, y: 12, transition: { duration: 0.2 } },
  };

  const totalEnPausa =
    (necesitaConex ? enPausaConex : 0) + (necesitaSub ? enPausaSub : 0);

  return (
    <div className="fixed inset-0 bg-[#0a1a36]/50 backdrop-blur-md z-[60] flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        <motion.div
          key="modal-susp"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Cabecera */}
          <div className="relative bg-gradient-to-br from-[#0a1a36] via-[#102a5c] to-[#1e4fd6] px-6 pt-6 pb-7 text-center shrink-0">
            <button
              onClick={onClose}
              disabled={loading}
              className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
              aria-label="Cerrar"
            >
              <i className="fas fa-times text-sm"></i>
            </button>

            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/20 backdrop-blur">
              <i className="bx bx-slider-alt text-2xl"></i>
            </span>
            <h3 className="mt-3 text-base font-bold tracking-tight text-white">
              Personaliza tu nuevo plan
            </h3>
            <p className="mx-auto mt-1.5 max-w-sm text-[12px] leading-[1.55] text-white/80">
              El <b className="text-white">{planNombre}</b> incluye menos
              beneficios que tu plan actual. Elige lo que quieres mantener
              activo y recuerda que el cambio se aplicará {fechaTexto}.
            </p>
          </div>

          {/* Cuerpo */}
          <div className="px-5 py-4 overflow-y-auto space-y-4">
            {necesitaConex && (
              <SeccionRecurso
                icono="bx-windows"
                titulo="Conexiones del Negocio"
                generoActivo="Activa"
                fraseSingular="la conexión que seguirá activa"
                generoMantener="activas"
                descripcion={
                  extraConex > 0 ? (
                    <>
                      Incluye <b>{baseConex}</b>{" "}
                      {palabra(baseConex, "conexión", "conexiones")} y tu
                      complemento suma <b>+{extraConex}</b>: podrás mantener{" "}
                      <b>{limiteConexiones}</b> activas de las{" "}
                      <b>{conexiones.length}</b> que tienes.
                    </>
                  ) : (
                    <>
                      El plan permite mantener <b>{limiteConexiones}</b>{" "}
                      {palabra(limiteConexiones, "conexión", "conexiones")}{" "}
                      activa{limiteConexiones === 1 ? "" : "s"}. Tienes{" "}
                      <b>{conexiones.length}</b>, así que <b>{enPausaConex}</b>{" "}
                      {palabra(enPausaConex, "quedará", "quedarán")} en pausa.
                    </>
                  )
                }
                items={itemsConex}
                limite={limiteConexiones}
                conservar={conservarConex}
                setConservar={setConservarConex}
                loading={loading}
              />
            )}

            {necesitaSub && (
              <SeccionRecurso
                icono="bx-group"
                titulo="Usuarios del equipo"
                generoActivo="Activo"
                fraseSingular="el usuario que seguirá activo"
                generoMantener="activos"
                descripcion={
                  <>
                    Tu usuario <b>administrador principal</b> se mantiene
                    siempre. Podrás tener <b>{limiteSubusuarios}</b> usuario
                    {limiteSubusuarios === 1 ? "" : "s"} más activo
                    {limiteSubusuarios === 1 ? "" : "s"} de los{" "}
                    <b>{subusuarios.length}</b> que ya tienes, así que{" "}
                    <b>{enPausaSub}</b>{" "}
                    {palabra(enPausaSub, "quedará", "quedarán")} en pausa.
                  </>
                }
                items={itemsSub}
                limite={limiteSubusuarios}
                conservar={conservarSub}
                setConservar={setConservarSub}
                loading={loading}
              />
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50/60 px-5 py-3.5 border-t border-gray-100 shrink-0">
            {guia && (
              <p className="mb-2 text-center text-[11px] font-medium text-amber-600">
                {guia}
              </p>
            )}
            <div className="flex justify-end gap-2.5">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 font-medium hover:bg-gray-100 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={!puedeConfirmar}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#1d4ed8] text-sm text-white font-semibold hover:bg-[#1e40af] shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <i
                  className={`bx ${loading ? "bx-loader-alt bx-spin" : "bx-check"}`}
                ></i>
                {loading ? "Aplicando…" : "Confirmar cambio de plan"}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ModalSeleccionConexiones;
