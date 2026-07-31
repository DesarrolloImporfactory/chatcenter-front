import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";
import Header from "../Header/pageHeader";

/* ─────────────────────────────────────────────────────────────
   Sedes / establecimientos

   Es el dato con el que el bot decide si alguien está dentro de cobertura y a
   qué agenda mandar la cita. Antes eso vivía como texto dentro del prompt del
   asistente, así que montar el centro número 100 obligaba a reescribir el texto
   de cada columna. Acá se edita una vez y el asistente lo lee solo.
───────────────────────────────────────────────────────────── */

const FORM_VACIO = {
  nombre: "",
  ciudad: "",
  provincia: "",
  direccion: "",
  referencia: "",
  google_maps_url: "",
  telefono: "",
  horario: "",
  id_calendario: "",
  activo: 1,
};

/* Mismo lenguaje visual que el modal de conexiones: campo con label semibold,
   input gris que se vuelve blanco al enfocar y ayuda en gris chico debajo. */
const Campo = ({ label, hint, children, required }) => (
  <div>
    <label className="text-sm font-semibold text-gray-700">
      {label}
      {required && <span className="text-rose-500 ml-0.5">*</span>}
    </label>
    <div className="mt-1.5">{children}</div>
    {hint && <p className="text-xs text-gray-400 mt-1.5">{hint}</p>}
  </div>
);

const inputCls =
  "w-full px-3.5 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/25 focus:border-[#1d4ed8] focus:bg-white transition-all duration-200";

const EstablecimientosView = () => {
  const navigate = useNavigate();

  const [sedes, setSedes] = useState([]);
  const [calendarios, setCalendarios] = useState([]);
  // { [id_establecimiento]: [{id, nombre, activo}] }
  const [profesionales, setProfesionales] = useState({});
  const [nuevoProf, setNuevoProf] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...FORM_VACIO });
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");

  const idConfiguracion = parseInt(localStorage.getItem("id_configuracion"));

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const fetchSedes = async () => {
    if (!idConfiguracion) {
      setLoading(false);
      Swal.fire({
        icon: "error",
        title: "Falta configuración",
        text: "No se encontró el ID de configuración",
      });
      navigate("/conexiones");
      return;
    }
    try {
      setLoading(true);
      const res = await chatApi.post("/establecimientos/listar", {
        id_configuracion: idConfiguracion,
        incluir_inactivos: true,
      });
      setSedes(res.data?.data || []);
    } catch {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudieron cargar las sedes",
      });
    } finally {
      setLoading(false);
    }
  };

  /* Quién atiende en cada sede. Es lo que le da capacidad a la agenda: con tres
     cargadas, el bot puede agendar tres citas a la misma hora. */
  const fetchProfesionales = async () => {
    if (!idConfiguracion) return;
    try {
      const res = await chatApi.post("/profesionales/listar", {
        id_configuracion: idConfiguracion,
        incluir_inactivos: true,
      });
      const lista = res.data?.data || [];
      const porSede = {};
      lista.forEach((p) => {
        const k = Number(p.id_establecimiento);
        if (!porSede[k]) porSede[k] = [];
        porSede[k].push(p);
      });
      setProfesionales(porSede);
    } catch {
      setProfesionales({});
    }
  };

  const agregarProfesional = async (idSede, nombre) => {
    const limpio = String(nombre || "").trim();
    if (!limpio) return;
    try {
      await chatApi.post("/profesionales/crear", {
        id_configuracion: idConfiguracion,
        id_establecimiento: idSede,
        nombre: limpio,
        orden: (profesionales[idSede]?.length || 0) + 1,
      });
      await fetchProfesionales();
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "No se pudo agregar",
        text: e?.response?.data?.message || "Inténtalo de nuevo",
      });
    }
  };

  const quitarProfesional = async (p) => {
    const r = await Swal.fire({
      icon: "warning",
      title: `¿Quitar a ${p.nombre}?`,
      text: "Sus citas ya agendadas se mantienen, pero deja de recibir nuevas.",
      showCancelButton: true,
      confirmButtonText: "Quitar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#e11d48",
    });
    if (!r.isConfirmed) return;
    try {
      const res = await chatApi.delete("/profesionales/eliminar", {
        data: { id: p.id },
      });
      await fetchProfesionales();
      const pendientes = res.data?.citas_futuras_afectadas || 0;
      if (pendientes) {
        Swal.fire({
          icon: "info",
          title: "Ojo con sus citas",
          text: `${p.nombre} tenía ${pendientes} cita(s) por delante. Hay que reasignarlas a mano.`,
        });
      }
    } catch {
      Swal.fire({ icon: "error", title: "No se pudo quitar" });
    }
  };

  /* Las agendas se listan para poder enlazar cada sede con la suya: es lo que
     hace que la cita se cree en el calendario correcto cuando hay sucursales.
     El endpoint exige account_id (= id_configuracion) y responde en `calendars`,
     no en `data`. */
  const fetchCalendarios = async () => {
    if (!idConfiguracion) return;
    try {
      const res = await chatApi.get("/calendars", {
        params: { account_id: idConfiguracion },
      });
      const lista = res.data?.calendars || [];
      setCalendarios(Array.isArray(lista) ? lista : []);
    } catch {
      setCalendarios([]);
    }
  };

  useEffect(() => {
    fetchSedes();
    fetchCalendarios();
    fetchProfesionales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Se muestra en el header: es el dato que responde de un vistazo "¿a quién
     puede atender el bot?", que es para lo que sirve esta pantalla. */
  const ciudadesCubiertas = useMemo(
    () => [
      ...new Set(
        sedes
          .filter((s) => Number(s.activo) && s.ciudad)
          .map((s) => String(s.ciudad).trim()),
      ),
    ],
    [sedes],
  );

  const filtradas = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sedes;
    return sedes.filter((s) =>
      [s.nombre, s.ciudad, s.provincia, s.direccion]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [sedes, search]);

  const abrirNueva = () => {
    setForm({ ...FORM_VACIO });
    setEditingId(null);
    setModalOpen(true);
  };

  const abrirEditar = (s) => {
    setForm({
      nombre: s.nombre || "",
      ciudad: s.ciudad || "",
      provincia: s.provincia || "",
      direccion: s.direccion || "",
      referencia: s.referencia || "",
      google_maps_url: s.google_maps_url || "",
      telefono: s.telefono || "",
      horario: s.horario || "",
      id_calendario: s.id_calendario || "",
      activo: Number(s.activo) === 0 ? 0 : 1,
    });
    setEditingId(s.id);
    setModalOpen(true);
  };

  const guardar = async () => {
    if (!form.nombre.trim() || !form.ciudad.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Faltan datos",
        text: "El nombre y la ciudad son obligatorios: son lo que usa el bot para saber si atiende ahí.",
      });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        id_configuracion: idConfiguracion,
        id_calendario: form.id_calendario || null,
      };
      if (editingId) {
        await chatApi.post("/establecimientos/actualizar", {
          ...payload,
          id: editingId,
        });
      } else {
        await chatApi.post("/establecimientos/crear", payload);
      }
      setModalOpen(false);
      await fetchSedes();
      Swal.fire({
        icon: "success",
        title: editingId ? "Sede actualizada" : "Sede creada",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "No se pudo guardar",
        text: e?.response?.data?.message || "Intenta de nuevo",
      });
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async (s) => {
    const ok = await Swal.fire({
      icon: "warning",
      title: `¿Eliminar "${s.nombre}"?`,
      html: "El bot dejará de ofrecer esta sede y de considerar su ciudad dentro de cobertura.",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
      reverseButtons: true,
    });
    if (!ok.isConfirmed) return;

    try {
      const res = await chatApi.delete("/establecimientos/eliminar", {
        data: { id: s.id },
      });
      await fetchSedes();
      const afectadas = res.data?.citas_futuras_afectadas || 0;
      Swal.fire({
        icon: afectadas ? "warning" : "success",
        title: "Sede eliminada",
        text: afectadas
          ? `Ojo: quedaron ${afectadas} cita(s) futura(s) agendadas en esta sede. Hay que reubicarlas a mano.`
          : undefined,
        timer: afectadas ? undefined : 1400,
        showConfirmButton: !!afectadas,
      });
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "No se pudo eliminar",
        text: e?.response?.data?.message || "Intenta de nuevo",
      });
    }
  };

  const nombreCalendario = (id) => {
    const c = calendarios.find((x) => String(x.id) === String(id));
    return c?.name || c?.nombre || null;
  };

  return (
    /* Mismo armazón que Productos y el resto de las vistas: tarjeta blanca
       centrada con los mismos anchos y márgenes. Antes el Header colgaba suelto
       con su propio margen y esta pantalla se veía corrida respecto a las
       demás. */
    <div className="min-h-screen bg-slate-50 w-full">
      <div
        className="mx-auto w-[98%] xl:w-[97%] 2xl:w-[96%] m-3 md:m-6 bg-white rounded-2xl
        ring-1 ring-slate-200 flex flex-col min-h-[82vh] overflow-hidden"
      >
        <Header
          icon={<i className="bx bx-buildings text-2xl" />}
          title="Sedes y sucursales"
          subtitle="Dónde atiende el negocio. El asistente usa esta lista para saber si un cliente está dentro de cobertura y en qué agenda crear su cita."
          actions={[
            {
              label: "Nueva sede",
              icon: <i className="bx bx-plus" />,
              onClick: abrirNueva,
              variant: "primary",
            },
          ]}
          rightCards={
            ciudadesCubiertas.length
              ? [
                  {
                    label: "Ciudades con cobertura",
                    value: ciudadesCubiertas.join(" · "),
                  },
                ]
              : []
          }
        />

        {/* Aviso de alcance: esta sección solo tiene sentido si el bot agenda
            citas. Un dropshipper que vende con envío no tiene sedes y llegaría
            aquí a preguntarse qué le falta configurar. */}
        <div className="mx-5 mt-5 flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
          <i className="bx bx-info-circle text-lg text-blue-500 mt-0.5 shrink-0" />
          <p className="text-[13px] text-blue-900/80">
            <strong className="font-semibold">
              Solo aplica al bot de servicios.
            </strong>{" "}
            Sirve para negocios que atienden con cita en un local — estéticas,
            clínicas, consultorios, barberías. Si tu bot vende productos con
            envío a domicilio, no necesitas configurar nada aquí.
          </p>
        </div>

        <div className="px-5 py-3.5 border-b border-slate-100">
          <div className="relative max-w-sm">
            <i className="bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputCls} pl-9`}
              placeholder="Buscar por nombre, ciudad o dirección…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="py-16 text-center text-slate-500">Cargando…</div>
          ) : !filtradas.length ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 py-14 text-center">
              <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white ring-1 ring-gray-200 mx-auto">
                <i className="bx bx-buildings text-3xl text-gray-400" />
              </span>
              <p className="mt-3 font-bold text-gray-800">
                {sedes.length ? "Sin resultados" : "Todavía no hay sedes"}
              </p>
              <p className="mx-auto mt-1.5 max-w-md text-sm text-gray-500">
                {sedes.length
                  ? "Prueba con otra búsqueda."
                  : "Mientras no cargues al menos una, el asistente no sabe en qué ciudades atienden: no puede filtrar a los clientes que están fuera de alcance ni decirles dónde queda el local."}
              </p>
              {!sedes.length && (
                <button
                  onClick={abrirNueva}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#1d4ed8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1e40af]"
                >
                  <i className="bx bx-plus text-lg" />
                  Agregar la primera sede
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filtradas.map((s) => (
                <div
                  key={s.id}
                  className={`group rounded-2xl border bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-indigo-200 ${
                    Number(s.activo)
                      ? "border-gray-200"
                      : "border-gray-200 bg-gray-50/60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${
                        Number(s.activo)
                          ? "bg-indigo-50 ring-indigo-100"
                          : "bg-gray-100 ring-gray-200"
                      }`}
                    >
                      <i
                        className={`bx bx-buildings text-2xl ${
                          Number(s.activo) ? "text-indigo-600" : "text-gray-400"
                        }`}
                      />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate font-bold text-gray-900">
                          {s.nombre}
                        </h3>
                        {!Number(s.activo) && (
                          <span className="shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                            Inactiva
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 flex items-center gap-1 text-sm text-gray-600">
                        <i className="bx bx-map-pin text-gray-400" />
                        {s.ciudad}
                        {s.provincia ? `, ${s.provincia}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 border-t border-gray-100 pt-4 text-[13px] text-gray-600">
                    <p className="flex gap-2">
                      <i className="bx bx-map text-gray-400 mt-0.5 shrink-0" />
                      <span>
                        {s.direccion || (
                          <span className="text-gray-400">Sin dirección</span>
                        )}
                      </span>
                    </p>
                    <p className="flex gap-2">
                      <i className="bx bx-map-alt text-gray-400 mt-0.5 shrink-0" />
                      <span>
                        {s.google_maps_url ? (
                          <a
                            href={s.google_maps_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#1d4ed8] hover:underline"
                          >
                            Ver ubicación en Maps
                          </a>
                        ) : (
                          <span className="text-amber-600">
                            Sin enlace de Maps — el bot enviará una búsqueda por
                            dirección
                          </span>
                        )}
                      </span>
                    </p>
                    <p className="flex gap-2">
                      <i className="bx bx-time-five text-gray-400 mt-0.5 shrink-0" />
                      <span>
                        {s.horario || (
                          <span className="text-amber-600">
                            Sin horario — el bot no sabrá qué horas ofrecer
                          </span>
                        )}
                      </span>
                    </p>
                    <p className="flex gap-2">
                      <i className="bx bx-phone text-gray-400 mt-0.5 shrink-0" />
                      <span>
                        {s.telefono || (
                          <span className="text-gray-400">Sin teléfono</span>
                        )}
                      </span>
                    </p>
                    <p className="flex gap-2">
                      <i className="bx bx-calendar text-gray-400 mt-0.5 shrink-0" />
                      <span>
                        {s.id_calendario ? (
                          nombreCalendario(s.id_calendario) ||
                          `Agenda #${s.id_calendario}`
                        ) : (
                          <span className="text-gray-400">
                            Agenda principal
                          </span>
                        )}
                      </span>
                    </p>
                  </div>

                  {/* Quién atiende. Define cuántas citas caben a la misma hora:
                    con tres cargadas el bot agenda tres simultáneas. Si al
                    negocio no le importan los nombres puede poner "Cabina 1/2/3"
                    y funciona igual como cupo. */}
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-gray-700">
                        ¿Quién atiende aquí?
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {(profesionales[s.id]?.length || 0) === 0
                          ? "1 cita a la vez"
                          : `${profesionales[s.id].length} citas a la vez`}
                      </span>
                    </div>

                    {(profesionales[s.id]?.length || 0) > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {profesionales[s.id].map((p) => (
                          <span
                            key={p.id}
                            className="inline-flex items-center gap-1 rounded-full bg-gray-100 py-1 pl-2.5 pr-1 text-[12px] text-gray-700"
                          >
                            {p.nombre}
                            <button
                              onClick={() => quitarProfesional(p)}
                              title={`Quitar a ${p.nombre}`}
                              className="rounded-full p-0.5 text-gray-400 transition-colors hover:bg-rose-100 hover:text-rose-600"
                            >
                              <i className="bx bx-x text-sm" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-2 flex gap-2">
                      <input
                        className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-1.5 text-[13px] text-gray-800 placeholder-gray-400 transition-all focus:border-[#1d4ed8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/25"
                        placeholder="Nombre o cabina"
                        value={nuevoProf[s.id] || ""}
                        onChange={(e) =>
                          setNuevoProf((p) => ({
                            ...p,
                            [s.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key !== "Enter") return;
                          agregarProfesional(s.id, nuevoProf[s.id]);
                          setNuevoProf((p) => ({ ...p, [s.id]: "" }));
                        }}
                      />
                      <button
                        onClick={() => {
                          agregarProfesional(s.id, nuevoProf[s.id]);
                          setNuevoProf((p) => ({ ...p, [s.id]: "" }));
                        }}
                        disabled={!String(nuevoProf[s.id] || "").trim()}
                        className="shrink-0 rounded-lg border border-gray-300 px-3 text-sm text-gray-600 transition-all hover:border-[#1d4ed8] hover:text-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <i className="bx bx-plus" />
                      </button>
                    </div>

                    {(profesionales[s.id]?.length || 0) === 0 && (
                      <p className="mt-1.5 text-[11px] text-gray-400">
                        Sin nadie cargado, el bot agenda una sola cita por
                        horario.
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={() => abrirEditar(s)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-100 hover:border-gray-400"
                    >
                      <i className="bx bx-edit-alt" />
                      Editar
                    </button>
                    <button
                      onClick={() => eliminar(s)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-600 transition-all hover:bg-rose-50"
                    >
                      <i className="bx bx-trash" />
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#0a1a36]/50 backdrop-blur-md p-4">
          <div className="max-h-[92vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col">
            {/* Header en UNA línea: ícono a la izquierda, texto a la derecha.
                Centrado ocupaba tres renglones para decir lo mismo y empujaba
                el formulario fuera de la vista. */}
            <div className="relative flex items-start gap-3 border-b border-gray-100 bg-white px-6 py-5 shrink-0">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 ring-1 ring-indigo-100">
                <i className="bx bx-buildings text-2xl text-indigo-600" />
              </span>

              <div className="min-w-0 flex-1 pr-6">
                <h2 className="text-base font-bold text-gray-900 leading-tight">
                  {editingId ? "Editar sede" : "Nueva sede"}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  El asistente usa estos datos para saber si un cliente está
                  dentro de cobertura y en qué agenda crear su cita.
                </p>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="Cerrar"
                disabled={saving}
              >
                <i className="bx bx-x text-xl" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5 overflow-y-auto">
              <Campo
                label="Nombre de la sede"
                required
                hint="Es el nombre con el que el asistente la menciona al agendar. Ej: Sede Norte."
              >
                <input
                  className={inputCls}
                  value={form.nombre}
                  onChange={(e) => setF("nombre", e.target.value)}
                  placeholder="Sede Norte"
                />
              </Campo>

              <div className="grid grid-cols-2 gap-3">
                <Campo
                  label="Ciudad"
                  required
                  hint="Define la cobertura: si el cliente escribe desde otra ciudad, queda fuera de alcance."
                >
                  <input
                    className={inputCls}
                    value={form.ciudad}
                    onChange={(e) => setF("ciudad", e.target.value)}
                    placeholder="Quito"
                  />
                </Campo>
                <Campo label="Provincia">
                  <input
                    className={inputCls}
                    value={form.provincia}
                    onChange={(e) => setF("provincia", e.target.value)}
                    placeholder="Pichincha"
                  />
                </Campo>
              </div>

              <Campo label="Dirección">
                <input
                  className={inputCls}
                  value={form.direccion}
                  onChange={(e) => setF("direccion", e.target.value)}
                  placeholder="Av. Amazonas y Naciones Unidas"
                />
              </Campo>

              <Campo
                label="Referencia"
                hint="Cómo llegar, en palabras del negocio."
              >
                <input
                  className={inputCls}
                  value={form.referencia}
                  onChange={(e) => setF("referencia", e.target.value)}
                  placeholder="Edificio Torre Blanca, piso 3"
                />
              </Campo>

              {/* El bot no puede leer la ubicación que manda el cliente, pero sí
                  enviarle esta: es lo que resuelve el "¿cómo llego?" antes de
                  la cita. */}
              <Campo
                label="Ubicación en Google Maps"
                hint="Ábrela en Google Maps, toca Compartir → Copiar vínculo y pega el enlace aquí. El asistente se lo envía al cliente cuando pregunte cómo llegar y al confirmarle la cita."
              >
                <div className="flex gap-2">
                  <input
                    className={inputCls}
                    value={form.google_maps_url}
                    onChange={(e) => setF("google_maps_url", e.target.value)}
                    placeholder="https://maps.app.goo.gl/..."
                  />
                  {form.google_maps_url.trim() && (
                    <a
                      href={form.google_maps_url.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Abrir el enlace para comprobar que cae donde debe"
                      className="shrink-0 px-3 flex items-center rounded-lg border border-gray-300 text-gray-500 hover:text-[#1d4ed8] hover:border-[#1d4ed8] transition-colors"
                    >
                      <i className="bx bx-link-external text-lg" />
                    </a>
                  )}
                </div>
                {!form.google_maps_url.trim() && form.direccion.trim() && (
                  <p className="text-xs text-amber-600 mt-1.5">
                    Si lo dejas vacío, el asistente arma un enlace de búsqueda
                    con la dirección. Funciona, pero cae en la calle y no en la
                    puerta del local.
                  </p>
                )}
              </Campo>

              <div className="grid grid-cols-2 gap-3">
                <Campo label="Teléfono">
                  <input
                    className={inputCls}
                    value={form.telefono}
                    onChange={(e) => setF("telefono", e.target.value)}
                    placeholder="0999999999"
                  />
                </Campo>
                <Campo label="Estado">
                  <select
                    className={inputCls}
                    value={form.activo}
                    onChange={(e) => setF("activo", Number(e.target.value))}
                  >
                    <option value={1}>Activa</option>
                    <option value={0}>Inactiva</option>
                  </select>
                </Campo>
              </div>

              <Campo
                label="Horario de atención"
                hint="El asistente no agenda fuera de este horario. Escríbelo como se lo dirías a un cliente."
              >
                <input
                  className={inputCls}
                  value={form.horario}
                  onChange={(e) => setF("horario", e.target.value)}
                  placeholder="Lunes a viernes 09:00-19:00 · Sábados 09:00-14:00"
                />
              </Campo>

              <Campo
                label="Agenda de esta sede"
                hint="Si el negocio tiene varias sucursales, cada una debe tener la suya: la cita se crea en la agenda que elijas aquí."
              >
                <select
                  className={inputCls}
                  value={form.id_calendario || ""}
                  onChange={(e) => setF("id_calendario", e.target.value)}
                >
                  <option value="">Usar la agenda principal</option>
                  {calendarios.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.nombre || `Agenda #${c.id}`}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4 shrink-0">
              <button
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 font-medium hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1d4ed8] text-sm text-white font-semibold hover:bg-[#1e40af] shadow-sm transition-all duration-200 disabled:opacity-70"
              >
                {saving ? (
                  <>
                    <i className="bx bx-loader-alt bx-spin" />
                    Guardando
                  </>
                ) : editingId ? (
                  "Guardar cambios"
                ) : (
                  "Crear sede"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EstablecimientosView;
