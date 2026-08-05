import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import {
  crearUsuarioFull,
  getCursosDisponibles,
  getPlantillasCorreo,
  registrarVenta,
  ROLES_ASIGNABLES,
  PAQUETES,
} from "../../services/imporsuit";
import { VentaFields, useVentaForm } from "./VentaFields";
import { Field, Overlay, inputCls, btnPrimary, btnGhost } from "./ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Normaliza el teléfono del chat al formato del form (+<código><número>). */
const normalizarTelefono = (tel) => {
  const t = String(tel ?? "").trim();
  if (!t) return "+593";
  return t.startsWith("+") ? t : `+${t.replace(/\D/g, "")}`;
};

/**
 * Coerción robusta de flags de paquete. El backend los manda desde MySQL como
 * TINYINT, que PDO devuelve como STRING ("0"/"1"). `!!"0"` es `true` (string no
 * vacío), así que `!!` marcaría TODOS los checkboxes. Solo 1/"1"/true => true.
 */
const toFlag = (v) => v === true || v === 1 || v === "1";

/**
 * Crear usuario nuevo o asignar paquetes/cursos a uno existente.
 *
 * Props:
 *  - correoInicial: string
 *  - nombreInicial: string    (nombre del chat; solo pre-carga al CREAR uno nuevo)
 *  - telefonoInicial: string  (teléfono del chat; solo pre-carga al CREAR uno nuevo)
 *  - clienteExistente: object|null  (si existe, pre-carga flags para NO borrarlos)
 *  - onClose: () => void
 *  - onSaved: (resultado) => void
 */
export function CrearUsuarioForm({
  correoInicial = "",
  nombreInicial = "",
  telefonoInicial = "",
  clienteExistente = null,
  onClose,
  onSaved,
}) {
  const yaExiste = Boolean(clienteExistente?.id_users);

  /**
   * Dos modos:
   *   · paquetes — el de siempre: asignar paquetes y cursos a mano, sin cobro.
   *   · ventas   — el cliente YA PAGÓ: además crea cartera, deuda con sus
   *     cuotas y el pago de la primera, y avisa al webhook de Make.
   *
   * En modo ventas los paquetes NO se eligen: los define el producto vendido,
   * para no poder cobrar una cosa y entregar otra. Sirve igual para un cliente
   * existente (recompra): la venta se suma a su cartera.
   */
  const [modo, setModo] = useState("paquetes");
  const esVenta = modo === "ventas";
  const ventaForm = useVentaForm(esVenta);

  const [form, setForm] = useState(() => ({
    nombre: clienteExistente?.nombre_users ?? nombreInicial ?? "",
    correo: clienteExistente?.email_users ?? correoInicial,
    // Existente: su teléfono real de Imporsuit (plataformas.whatsapp). Nuevo: el del chat.
    telefono: normalizarTelefono(
      clienteExistente ? clienteExistente.telefono : telefonoInicial,
    ),
    rol: clienteExistente?.id_rol ? String(clienteExistente.id_rol) : "",
    // Pre-carga de flags vigentes (clave para no sobrescribir paquetes).
    membresia_ecommerce: toFlag(clienteExistente?.membresia_ecommerce),
    ecommerce: toFlag(clienteExistente?.ecommerce),
    importacion: toFlag(clienteExistente?.importacion),
    infoaduana: toFlag(clienteExistente?.infoaduana),
    kit: toFlag(clienteExistente?.kit),
    tiendas: toFlag(clienteExistente?.tiendas),
    franquicias: toFlag(clienteExistente?.franquicias),
    // dropsystem ya no tiene checkbox (paquete retirado del panel), pero se
    // preserva el valor vigente para no borrárselo al actualizar.
    dropsystem: toFlag(clienteExistente?.dropsystem),
    kit_importador: toFlag(clienteExistente?.kit_importador),
    motor_ventas: toFlag(clienteExistente?.motor_ventas),
  }));

  const [cursos, setCursos] = useState([]);
  // Pre-selecciona los cursos que el usuario ya tiene (ids de cursos_usuarios).
  const [cursosSel, setCursosSel] = useState(
    () => new Set((clienteExistente?.cursos ?? []).map(Number)),
  );
  const [loadingCursos, setLoadingCursos] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ── Correo de bienvenida (plantillas del constructor de Imporsuit) ──
  const [plantillas, setPlantillas] = useState([]);
  // "" = usar la sugerida por los paquetes; "0" = no enviar; "<id>" = elegida.
  const [correoElegido, setCorreoElegido] = useState(false);
  const [idPlantillaCorreo, setIdPlantillaCorreo] = useState("");

  useEffect(() => {
    let alive = true;
    getCursosDisponibles()
      .then((rows) => alive && setCursos(rows))
      .catch(() => alive && setCursos([]))
      .finally(() => alive && setLoadingCursos(false));
    return () => {
      alive = false;
    };
  }, []);

  // Si `email_plantillas` no existe todavía, el back devuelve [] y el bloque
  // de correo simplemente no se ofrece.
  useEffect(() => {
    let alive = true;
    getPlantillasCorreo()
      .then((rows) => alive && setPlantillas(rows))
      .catch(() => alive && setPlantillas([]));
    return () => {
      alive = false;
    };
  }, []);

  const set = (name) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const toggleCurso = (id) =>
    setCursosSel((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const resumen = useMemo(
    () => PAQUETES.filter((p) => form[p.key]).map((p) => p.label),
    [form],
  );

  // Plantilla sugerida por el paquete marcado — misma regla que el panel de
  // asesor (CrearUsuarioModal) y que CorreoPlantilla::sugerirPorPaquetes().
  // Rige hasta que el agente elija a mano en el select.
  const idPlantillaSugerida = useMemo(() => {
    const marcados = PAQUETES.filter((p) => form[p.key]).map((p) => p.key);
    const sugerida = plantillas.find(
      (pl) => pl.paquete && marcados.includes(pl.paquete),
    );
    return sugerida ? String(sugerida.id_plantilla) : "";
  }, [form, plantillas]);

  // "0" = no enviar. Es también el fallback cuando ningún paquete marcado
  // sugiere plantilla, para que el select nunca quede sin opción seleccionada.
  const idPlantillaActiva = correoElegido
    ? idPlantillaCorreo
    : idPlantillaSugerida || "0";

  const plantillaSeleccionada = useMemo(
    () =>
      plantillas.find((p) => String(p.id_plantilla) === idPlantillaActiva) ?? null,
    [plantillas, idPlantillaActiva],
  );

  /**
   * Alta con cobro. Una sola llamada: el back encadena
   * usuario → cartera → deuda → pago, manda el WhatsApp y dispara el webhook.
   */
  const submitVenta = async () => {
    const res = await registrarVenta({
      nombre: form.nombre.trim(),
      correo: form.correo.trim(),
      telefono: form.telefono.trim(),
      pais: ventaForm.venta.pais,
      idProducto: ventaForm.venta.idProducto,
      montoTotal: ventaForm.venta.montoTotal,
      montoPagado: ventaForm.venta.montoPagado || 0,
      cuotas: ventaForm.venta.cuotas,
      fechaCompra: ventaForm.venta.fechaCompra,
      idCloser: ventaForm.venta.idCloser,
      pasarela: ventaForm.venta.pasarela,
      referencia: ventaForm.venta.referencia,
      imagenesUrls: ventaForm.venta.imagenesUrls,
      rol: form.rol ? Number(form.rol) : 16,
      enviarWhatsapp: ventaForm.venta.enviarWhatsapp,
    });

    const d = res?.data ?? {};
    toast.success(
      d.ya_existia ? "Venta sumada a su cartera" : "Venta registrada (clave: Import.1)",
    );

    // El pago, el WhatsApp y el webhook son best-effort en el back: la venta ya
    // quedó guardada, así que un fallo se avisa sin alarmar de más — pero se
    // avisa, porque el agente cree que quedó todo hecho.
    // El back corre el vencimiento del saldo un mes para que no figure vencido
    // mañana; conviene que el agente sepa cuánto quedó debiendo.
    if (Number(d.saldo_cuota1) > 0) {
      toast(
        `Quedaron ${Number(d.saldo_cuota1).toFixed(2)} de la cuota 1: su vencimiento pasó al mes siguiente`,
        { icon: "📅", duration: 7000 },
      );
    }

    const avisos = [];
    if (!d.pago_registrado && Number(ventaForm.venta.montoPagado) > 0) {
      avisos.push(`El pago NO se registró: ${d.pago_error ?? "error desconocido"}`);
    }
    if (res?.webhook && !res.webhook.enviado) {
      avisos.push(`El webhook no se envió: ${res.webhook.error ?? "error desconocido"}`);
    }
    // La encuesta de satisfacción también es best-effort: si no salió, el
    // cliente no la va a recibir y conviene saberlo.
    if (res?.encuesta && !res.encuesta.enviado) {
      avisos.push(
        `La encuesta de satisfacción no se envió: ${res.encuesta.error ?? "error desconocido"}`,
      );
    }

    const wa = d.whatsapp;
    if (wa?.enviado && wa?.registrado_en_chat) {
      toast.success(`WhatsApp enviado (${wa.plantilla})`);
    } else if (wa?.enviado) {
      // "Meta lo aceptó" y "quedó en el hilo" fallan por separado: si el
      // segundo falla, el agente no ve el mensaje y cree que nunca salió.
      avisos.push(
        `WhatsApp aceptado por Meta pero NO quedó en el hilo de ImporChat` +
          (wa.wamid ? ` (id ${wa.wamid})` : ""),
      );
    } else if (ventaForm.venta.enviarWhatsapp && wa?.motivo) {
      const esperado = /ningún paquete/i.test(wa.motivo);
      if (esperado) toast(`Sin WhatsApp: ${wa.motivo}`, { icon: "📵", duration: 5000 });
      else avisos.push(`WhatsApp no enviado: ${wa.motivo}`);
    }

    if (avisos.length) {
      await Swal.fire({
        icon: "warning",
        title: "Venta registrada, con avisos",
        html: avisos.map((a) => `<small>${a}</small>`).join("<br/><br/>"),
      });
    }

    onSaved?.(res);
    onClose?.();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!form.nombre.trim()) return toast.error("Ingresa el nombre");
    if (!EMAIL_RE.test(form.correo.trim()))
      return toast.error("Correo inválido");
    if (!form.telefono.trim()) return toast.error("Ingresa el teléfono");
    if (!esVenta && !form.rol) return toast.error("Selecciona un rol");

    if (esVenta) {
      const errorVenta = ventaForm.validar();
      if (errorVenta) return toast.error(errorVenta);
    }

    setSubmitting(true);
    try {
      if (esVenta) {
        await submitVenta();
        return;
      }
      const resultado = await crearUsuarioFull({
        nombre: form.nombre.trim(),
        correo: form.correo.trim(),
        telefono: form.telefono.trim(),
        rol: Number(form.rol),
        membresia_ecommerce: form.membresia_ecommerce,
        ecommerce: form.ecommerce,
        importacion: form.importacion,
        infoaduana: form.infoaduana,
        kit: form.kit,
        tiendas: form.tiendas,
        franquicias: form.franquicias,
        dropsystem: form.dropsystem,
        kit_importador: form.kit_importador,
        motor_ventas: form.motor_ventas,
        cursos: Array.from(cursosSel),
        // Siempre explícito: "0" = no enviar, "<id>" = esa plantilla.
        id_plantilla: idPlantillaActiva,
      });

      const existia =
        resultado?.title === "Usuario existente" ||
        /ya existe/i.test(resultado?.message ?? "");

      toast.success(
        existia
          ? "Paquetes y cursos actualizados"
          : "Usuario creado (clave: Import.1)",
      );

      // El WhatsApp y el correo son best-effort en el back: si alguno falló, el
      // alta igual quedó guardada y hay que decirlo sin alarmar.
      //
      // OJO: "Meta lo aceptó" y "quedó en el hilo de ImporChat" son dos cosas
      // distintas que fallan por separado. Un `enviado: true` con
      // `registrado_en_chat: false` NO se puede reportar como éxito a secas: es
      // justo el caso en que el agente no ve el mensaje en el chat y cree que
      // nunca salió.
      const wa = resultado?.whatsapp;
      const mail = resultado?.correo;

      if (wa?.enviado && wa?.registrado_en_chat) {
        toast.success(`WhatsApp enviado (${wa.plantilla})`);
      } else if (wa?.enviado) {
        Swal.fire({
          icon: "warning",
          title: "WhatsApp enviado, pero no quedó en ImporChat",
          html:
            `Meta aceptó la plantilla <code>${wa.plantilla}</code> para ` +
            `<strong>${wa.telefono ?? "—"}</strong>, pero no se pudo guardar en el hilo del chat.` +
            (wa.wamid
              ? `<br/><br/>ID del mensaje:<br/><code>${wa.wamid}</code>`
              : "") +
            (wa.motivo ? `<br/><br/><small>${wa.motivo}</small>` : ""),
        });
      } else if (wa?.motivo) {
        // "Ningún paquete tiene plantilla" es un caso esperado (Infoaduana,
        // Membresía, 50 Tiendas… no disparan WhatsApp): basta un aviso suave.
        // Cualquier otro motivo es una falla real y el agente tiene que verla,
        // porque cree que el cliente ya fue contactado y no lo fue.
        const esperado = /ningún paquete/i.test(wa.motivo);
        if (esperado) {
          toast(`Sin WhatsApp: ${wa.motivo}`, { icon: "📵", duration: 5000 });
        } else {
          Swal.fire({
            icon: "error",
            title: "El WhatsApp de bienvenida NO se envió",
            html:
              `El usuario quedó guardado, pero <strong>nadie lo contactó</strong>.<br/><br/>` +
              `<small>${wa.motivo}</small>`,
          });
        }
      }

      if (mail?.enviado)
        toast.success(`Correo enviado: ${mail.nombre_plantilla}`);
      else if (mail?.motivo)
        toast(`Sin correo: ${mail.motivo}`, { icon: "✉️", duration: 6000 });

      onSaved?.(resultado);
      onClose?.();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: esVenta ? "No se pudo registrar la venta" : "No se pudo guardar",
        text: err?.message ?? "Inténtalo de nuevo.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Overlay onClose={() => !submitting && onClose?.()}>
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h3 className="text-base font-bold text-gray-800">
            {esVenta
              ? "Registrar venta"
              : yaExiste
                ? "Asignar paquetes / cursos"
                : "Nuevo usuario"}
          </h3>
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            ✕
          </button>
        </header>

        {/* Pestañas de modo. "Venta" también sirve para un cliente existente:
            una recompra se suma a la cartera que ya tiene. */}
        <div className="flex gap-1 border-b border-gray-100 px-5 pt-3">
          {[
            {
              key: "paquetes",
              label: yaExiste ? "Paquetes / cursos" : "Registro normal",
            },
            { key: "ventas", label: "Venta (ya pagó)" },
          ].map((t) => {
            const active = modo === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setModo(t.key)}
                disabled={submitting}
                className={`-mb-px rounded-t-lg border-b-2 px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${
                  active
                    ? t.key === "ventas"
                      ? "border-emerald-600 text-emerald-700"
                      : "border-blue-600 text-blue-700"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={submit} className="max-h-[80vh] space-y-4 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Nombre completo">
              <input className={inputCls} value={form.nombre} onChange={set("nombre")} disabled={submitting} />
            </Field>
            <Field label="Correo">
              <input
                type="email"
                className={inputCls}
                value={form.correo}
                onChange={set("correo")}
                disabled={submitting || yaExiste}
              />
            </Field>
            <Field label="Teléfono / WhatsApp">
              <input className={inputCls} value={form.telefono} onChange={set("telefono")} disabled={submitting} placeholder="+593999999999" />
            </Field>
            <Field label={esVenta ? "Rol (por defecto Estudiantes)" : "Rol"}>
              <select className={inputCls} value={form.rol} onChange={set("rol")} disabled={submitting}>
                <option value="">
                  {esVenta ? "Estudiantes (por defecto)" : "Seleccionar rol"}
                </option>
                {ROLES_ASIGNABLES.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </Field>
          </div>

          {esVenta && <VentaFields form={ventaForm} disabled={submitting} />}

          {/* Paquetes y cursos solo en el modo normal: en una venta los define
              el producto vendido. */}
          <section className={`rounded-xl border border-gray-200 p-3 ${esVenta ? "hidden" : ""}`}>
            <p className="mb-2 text-sm font-semibold text-gray-700">Paquetes / membresías</p>
            {yaExiste && (
              <p className="mb-2 text-[11px] text-amber-600">
                El usuario ya existe: estos flags se pre-cargaron con sus paquetes
                actuales. Lo que dejes marcado será su estado final.
              </p>
            )}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {PAQUETES.map((p) => (
                <label key={p.key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:border-blue-300">
                  <input type="checkbox" checked={!!form[p.key]} onChange={set(p.key)} disabled={submitting} className="h-4 w-4 accent-blue-600" />
                  {p.label}
                </label>
              ))}
            </div>
          </section>

          <section className={`rounded-xl border border-gray-200 p-3 ${esVenta ? "hidden" : ""}`}>
            <p className="mb-2 text-sm font-semibold text-gray-700">Cursos opcionales</p>
            {yaExiste && (
              <p className="mb-2 text-[11px] text-amber-600">
                Se pre-cargaron los cursos actuales del usuario. Lo que dejes
                marcado será su estado final: destildar un curso lo quita.
              </p>
            )}
            {loadingCursos ? (
              <p className="text-xs text-gray-400">Cargando cursos…</p>
            ) : cursos.length === 0 ? (
              <p className="text-xs text-gray-400">No hay cursos activos.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {cursos.map((c) => {
                  const id = Number(c.id_curso);
                  const active = cursosSel.has(id);
                  return (
                    <button
                      type="button"
                      key={id}
                      onClick={() => toggleCurso(id)}
                      disabled={submitting}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        active
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 text-gray-600 hover:border-blue-300"
                      }`}
                    >
                      {active ? "✓ " : ""}{c.nombre}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Bienvenida: WhatsApp automático + correo elegible.
              Solo al CREAR: a un usuario existente no se le manda el correo
              porque las plantillas incluyen credenciales y su clave no cambió. */}
          {plantillas.length > 0 && (
            <section className="rounded-xl border border-gray-200 p-3">
              <p className="mb-2 text-sm font-semibold text-gray-700">
                Mensajes de bienvenida
              </p>

              <p className="mb-3 flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">
                <span>💬</span>
                <span>
                  El <strong>WhatsApp de bienvenida</strong> se envía automáticamente
                  según el paquete más prioritario que marques (sale desde Soporte
                  Importaciones Expertos y queda en el chat).
                </span>
              </p>

              {yaExiste ? (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                  El usuario ya existe: <strong>no se envía correo</strong> de
                  bienvenida, porque incluye las credenciales de acceso y su
                  contraseña no cambia.
                </p>
              ) : (
                <>
                  <Field label="Correo de bienvenida">
                    <select
                      className={inputCls}
                      value={idPlantillaActiva}
                      onChange={(e) => {
                        setCorreoElegido(true);
                        setIdPlantillaCorreo(e.target.value);
                      }}
                      disabled={submitting}
                    >
                      <option value="0">No enviar correo</option>
                      {plantillas.map((p) => (
                        <option key={p.id_plantilla} value={String(p.id_plantilla)}>
                          {p.nombre}
                        </option>
                      ))}
                    </select>
                  </Field>

                  {plantillaSeleccionada ? (
                    <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-[11px] text-blue-700">
                      <strong>Asunto:</strong> {plantillaSeleccionada.asunto}
                      {!correoElegido && idPlantillaSugerida && (
                        <span className="block text-blue-500">
                          Sugerida por los paquetes marcados. Puedes cambiarla.
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="mt-2 text-[11px] text-gray-400">
                      {idPlantillaActiva === "0"
                        ? "No se enviará ningún correo."
                        : "Ningún paquete marcado sugiere plantilla: elige una o deja «No enviar»."}
                    </p>
                  )}
                </>
              )}
            </section>
          )}

          {!esVenta && resumen.length > 0 && (
            <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
              <strong>Paquetes:</strong> {resumen.join(" · ")}
            </p>
          )}

          <footer className="flex justify-end gap-2 border-t border-gray-100 pt-3">
            <button type="button" onClick={onClose} disabled={submitting} className={btnGhost}>Cancelar</button>
            <button
              type="submit"
              disabled={submitting}
              className={
                esVenta
                  ? "rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                  : btnPrimary
              }
            >
              {submitting
                ? esVenta
                  ? "Registrando venta…"
                  : "Guardando…"
                : esVenta
                  ? "Registrar venta"
                  : yaExiste
                    ? "Guardar cambios"
                    : "Crear usuario"}
            </button>
          </footer>
        </form>
      </div>
    </Overlay>
  );
}

/* Helpers de UI: viven en `ui.jsx` desde que `VentaFields` los necesita
   (importarlos de acá creaba un ciclo). Se re-exportan para no tocar a
   `AgregarDeudaForm` ni a `RegistrarPagoForm`, que ya los traen de este
   archivo. */
export { Field, Overlay, inputCls, btnPrimary, btnGhost } from "./ui";
