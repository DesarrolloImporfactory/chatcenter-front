import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import {
  crearUsuarioFull,
  getCursosDisponibles,
  ROLES_ASIGNABLES,
  PAQUETES,
} from "../../services/imporsuit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Normaliza el teléfono del chat al formato del form (+<código><número>). */
const normalizarTelefono = (tel) => {
  const t = String(tel ?? "").trim();
  if (!t) return "+593";
  return t.startsWith("+") ? t : `+${t.replace(/\D/g, "")}`;
};

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

  const [form, setForm] = useState(() => ({
    nombre: clienteExistente?.nombre_users ?? nombreInicial ?? "",
    correo: clienteExistente?.email_users ?? correoInicial,
    telefono: clienteExistente ? "+593" : normalizarTelefono(telefonoInicial),
    rol: clienteExistente?.id_rol ? String(clienteExistente.id_rol) : "",
    // Pre-carga de flags vigentes (clave para no sobrescribir paquetes).
    membresia_ecommerce: !!clienteExistente?.membresia_ecommerce,
    ecommerce: !!clienteExistente?.ecommerce,
    importacion: !!clienteExistente?.importacion,
    infoaduana: !!clienteExistente?.infoaduana,
    kit: !!clienteExistente?.kit,
    tiendas: !!clienteExistente?.tiendas,
    franquicias: !!clienteExistente?.franquicias,
  }));

  const [cursos, setCursos] = useState([]);
  const [cursosSel, setCursosSel] = useState(() => new Set());
  const [loadingCursos, setLoadingCursos] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!form.nombre.trim()) return toast.error("Ingresa el nombre");
    if (!EMAIL_RE.test(form.correo.trim()))
      return toast.error("Correo inválido");
    if (!form.telefono.trim()) return toast.error("Ingresa el teléfono");
    if (!form.rol) return toast.error("Selecciona un rol");

    setSubmitting(true);
    try {
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
        cursos: Array.from(cursosSel),
      });

      const existia =
        resultado?.title === "Usuario existente" ||
        /ya existe/i.test(resultado?.message ?? "");

      toast.success(
        existia
          ? "Paquetes y cursos actualizados"
          : "Usuario creado (clave: Import.1)",
      );
      onSaved?.(resultado);
      onClose?.();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "No se pudo guardar",
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
            {yaExiste ? "Asignar paquetes / cursos" : "Nuevo usuario"}
          </h3>
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            ✕
          </button>
        </header>

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
            <Field label="Rol">
              <select className={inputCls} value={form.rol} onChange={set("rol")} disabled={submitting}>
                <option value="">Seleccionar rol</option>
                {ROLES_ASIGNABLES.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </Field>
          </div>

          <section className="rounded-xl border border-gray-200 p-3">
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

          <section className="rounded-xl border border-gray-200 p-3">
            <p className="mb-2 text-sm font-semibold text-gray-700">Cursos opcionales</p>
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

          {resumen.length > 0 && (
            <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
              <strong>Paquetes:</strong> {resumen.join(" · ")}
            </p>
          )}

          <footer className="flex justify-end gap-2 border-t border-gray-100 pt-3">
            <button type="button" onClick={onClose} disabled={submitting} className={btnGhost}>Cancelar</button>
            <button type="submit" disabled={submitting} className={btnPrimary}>
              {submitting ? "Guardando…" : yaExiste ? "Guardar cambios" : "Crear usuario"}
            </button>
          </footer>
        </form>
      </div>
    </Overlay>
  );
}

/* ── helpers de UI compartidos ─────────────────────────────────────── */
const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500";
const btnPrimary =
  "rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60";
const btnGhost =
  "rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60";

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-gray-600">{label}</span>
      {children}
    </label>
  );
}

export function Overlay({ children, onClose }) {
  return (
    <>
      <div className="fixed inset-0 z-[90] bg-black/40" onClick={onClose} role="presentation" />
      <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 sm:items-center">
        {children}
      </div>
    </>
  );
}

export { inputCls, btnPrimary, btnGhost };
