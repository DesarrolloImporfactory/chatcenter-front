import ClientForm from "../clientes/modales/ClientForm";
import { useState } from "react";
import chatApi from "../../api/chatcenter";

const TablaContactos = ({
  items,
  selected,
  toggleSelect,
  allSelected,
  toggleSelectAll,
  cols,
  SortButton,
  orden,
  loading,
  hasMore,
  getId,
  initials,
  getDisplayContact,
  fmtDate,
  fmtTime,
  timeAgo,
  fmtDateTime,
  openChatById,
  closeRowMenu,
  setSelected,
  setIdConfigForTags,
  ensureCatalogAndOpen,
  Chip,
  swalToast,
  swalConfirm,
  swalClose,
  swalError,
  swalLoading,
  idConfigForTags,
  cargarOpcionesFiltroEtiquetas,
  apiDelete,
  mapRow,
  setItems,
}) => {
  // Función para manejar la edición de cliente
  const [editing, setEditing] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleEditClient = (client) => {
    setEditing(client); // Establecer el cliente que se va a editar
    setDrawerOpen(true); // Abrir el drawer
  };

  /* ======= CRUD cliente ======= */
  async function apiCreate(c) {
    const payload = {
      id_plataforma: c.id_plataforma || null,
      id_configuracion: c.id_configuracion || null,
      id_etiqueta: c.id_etiqueta || null,
      uid_cliente: c.uid_cliente || "",
      nombre_cliente: c.nombre,
      apellido_cliente: c.apellido,
      email_cliente: c.email,
      celular_cliente: c.telefono,
      imagePath: c.imagePath || "",
      mensajes_por_dia_cliente: c.mensajes_por_dia_cliente ?? 0,
      estado_cliente: c.estado ?? 1,
      chat_cerrado: c.chat_cerrado ?? 0,
      bot_openia: c.bot_openia ?? 1,
      pedido_confirmado: c.pedido_confirmado ?? 0,
    };
    const { data } = await chatApi.post(
      "/clientes_chat_center/agregar",
      payload,
    );
    return mapRow(data?.data || data);
  }
  async function apiUpdate(id, c) {
    const payload = {
      id_plataforma: c.id_plataforma || null,
      id_configuracion: c.id_configuracion || null,
      id_etiqueta: c.id_etiqueta || null,
      uid_cliente: c.uid_cliente || "",
      nombre_cliente: c.nombre,
      apellido_cliente: c.apellido,
      email_cliente: c.email,
      celular_cliente: c.telefono,
      imagePath: c.imagePath || "",
      mensajes_por_dia_cliente: c.mensajes_por_dia_cliente ?? 0,
      estado_cliente: c.estado ?? 1,
      chat_cerrado: c.chat_cerrado ?? 0,
      bot_openia: c.bot_openia ?? 1,
      pedido_confirmado: c.pedido_confirmado ?? 0,
    };
    const { data } = await chatApi.put(
      `/clientes_chat_center/actualizar/${id}`,
      payload,
    );
    return mapRow(data?.data || data);
  }

  // Función de guardar cliente (creación/actualización)
  const onSave = async () => {
    try {
      if (!editing?.nombre && !editing?.telefono && !editing?.email) {
        await swalInfo(
          "Datos incompletos",
          "Ingresa al menos nombre, teléfono o email",
        );
        return;
      }

      const id = getId(editing);
      swalLoading(id ? "Actualizando cliente..." : "Creando cliente...");

      if (id) {
        // Si el cliente existe, actualízalo
        const updated = await apiUpdate(id, editing);
        setItems((prev) => prev.map((x) => (getId(x) === id ? updated : x)));
      } else {
        // Si no existe, crea uno nuevo
        const created = await apiCreate(editing);
        setItems((prev) => [created, ...prev]);
      }

      setDrawerOpen(false); // Cierra el drawer
      setEditing(null); // Limpia el estado de edición
      swalClose();
      swalToast("Guardado correctamente");
    } catch (e) {
      console.error("SAVE:", e?.response?.data || e.message);
      swalClose();
      swalError("No se pudo guardar", e?.response?.data?.message || e.message);
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <table className="min-w-full table-fixed border-separate border-spacing-0">
        <thead>
          <tr className="[&>th]:border-b [&>th]:px-3 [&>th]:text-slate-600 text-xs">
            <th className="w-10">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-1 focus:ring-blue-500/60"
                checked={allSelected}
                onChange={(e) => toggleSelectAll(e.target.checked)}
              />
            </th>

            {cols.name && (
              <th className="text-left">
                <SortButton
                  label="Nombre"
                  active={/recientes|antiguos/.test(orden)}
                  dir={orden === "antiguos" ? "asc" : "desc"}
                  onClick={() =>
                    setOrden((o) =>
                      o === "recientes" ? "antiguos" : "recientes",
                    )
                  }
                />
              </th>
            )}
            {cols.phone && (
              <th className="w-56 text-left">
                <SortButton
                  label="Teléfono"
                  active={false}
                  onClick={() => {}}
                  className="text-slate-500"
                />
              </th>
            )}
            {cols.email && (
              <th className="w-72 text-left">
                <SortButton
                  label="Email"
                  active={false}
                  onClick={() => {}}
                  className="text-slate-500"
                />
              </th>
            )}
            {cols.created && (
              <th className="w-40 text-left">
                <SortButton
                  label="Creado"
                  active={/recientes|antiguos/.test(orden)}
                  dir={orden === "antiguos" ? "asc" : "desc"}
                  onClick={() =>
                    setOrden((o) =>
                      o === "recientes" ? "antiguos" : "recientes",
                    )
                  }
                />
              </th>
            )}
            {cols.last_activity && (
              <th className="w-48 text-left">
                <SortButton
                  label="Última actividad"
                  active={/actividad_/.test(orden)}
                  dir={orden === "actividad_asc" ? "asc" : "desc"}
                  onClick={() =>
                    setOrden((o) =>
                      o === "actividad_desc"
                        ? "actividad_asc"
                        : "actividad_desc",
                    )
                  }
                />
              </th>
            )}
            {cols.tags && <th className="w-48 text-left">Tags</th>}
            <th className="w-24 text-right">Acciones</th>
          </tr>
        </thead>

        <tbody className="[&>tr:nth-child(even)]:bg-slate-50/40 text-xs">
          {!loading && items.length === 0 && (
            <tr>
              <td colSpan={9} className="py-16">
                <div className="mx-auto max-w-md text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
                    <i className="bx bx-user-circle text-2xl text-slate-500" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-800">
                    Sin clientes
                  </h4>
                  <p className="mt-1 text-sm text-slate-500">
                    Aún no hay registros que coincidan con tu búsqueda/filtros.
                  </p>
                  <button
                    className="mt-4 rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
                    onClick={() => {
                      setEditing({}); // Limpiar los datos de edición
                      setDrawerOpen(true); // Abrir el drawer para crear un nuevo cliente
                    }}
                  >
                    Crear cliente
                  </button>
                </div>
              </td>
            </tr>
          )}

          {loading &&
            items.length === 0 &&
            Array.from({ length: 6 }).map((_, i) => (
              <tr key={`sk-${i}`}>
                <td>
                  <div className="h-4 w-4 rounded bg-slate-200 animate-pulse" />
                </td>
                <td colSpan={5}>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-200 animate-pulse" />
                    <div className="h-3 w-1/3 rounded bg-slate-200 animate-pulse" />
                  </div>
                </td>
                <td>
                  <div className="h-3 w-24 rounded bg-slate-200 animate-pulse" />
                </td>
              </tr>
            ))}

          {items.map((c, idx) => {
            const id = getId(c) ?? idx;
            const nombre =
              `${c.nombre || ""} ${c.apellido || ""}`.trim() || "Sin nombre";
            return (
              <tr
                key={id}
                className={`hover:bg-slate-50/90 [&>td]:border-b [&>td]:px-3 transition-colors`}
              >
                <td>
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-1 focus:ring-blue-500/60"
                    checked={selected.includes(id)}
                    onChange={() => toggleSelect(id)}
                  />
                </td>

                {cols.name && (
                  <td className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
                        {initials(c.nombre, c.apellido)}
                      </div>
                      <div className="min-w-0">
                        <button
                          className="block truncate font-medium text-slate-900 hover:underline"
                          onClick={() => handleEditClient(c)} // Editar cliente
                        >
                          {nombre}
                        </button>
                      </div>
                    </div>
                  </td>
                )}

                {cols.phone && (
                  <td className="min-w-0">
                    <div className="flex items-center gap-2 truncate text-sm text-slate-700">
                      <i className="bx bx-phone text-xs text-slate-400" />
                      <span className="truncate">{getDisplayContact(c)}</span>
                    </div>
                  </td>
                )}

                {cols.email && (
                  <td className="min-w-0">
                    <div className="flex items-center gap-2 truncate text-sm text-slate-700">
                      <i className="bx bx-envelope text-xs text-slate-400" />
                      <span className="truncate">{c.email || "-"}</span>
                    </div>
                  </td>
                )}

                {cols.created && (
                  <td className="text-sm text-slate-700">
                    <div>{fmtDate(c.createdAt)}</div>
                    <div className="text-[11px] text-slate-500">
                      {fmtTime(c.createdAt)}
                    </div>
                  </td>
                )}

                {cols.last_activity && (
                  <td className="text-sm text-slate-700">
                    <div className="flex items-center gap-2">
                      <i className="bx bx-time-five text-slate-500 text-xs" />
                      <span>{timeAgo(c.ultima_actividad)}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {fmtDateTime(c.ultima_actividad)}
                    </div>
                  </td>
                )}

                {cols.tags && (
                  <td className="min-w-0">
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(c.etiquetas) && c.etiquetas.length ? (
                        c.etiquetas.map((t, i) => (
                          <Chip key={i} color={t.color}>
                            {t.nombre}
                          </Chip>
                        ))
                      ) : (
                        <span className="text-slate-400 italic">
                          Sin etiquetas
                        </span>
                      )}
                    </div>
                  </td>
                )}
                <td className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {/* ✅ Acción primaria: Abrir chat (icon-only, pro) */}
                    <button
                      onClick={() => openChatById(c)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200 transition"
                      title="Abrir chat"
                      aria-label="Abrir chat"
                    >
                      <i className="bx bxs-chat text-[18px]" />
                    </button>

                    {/* ✅ Menú secundario (sin mezclar con abrir chat) */}
                    <div className="relative">
                      <details className="group">
                        <summary
                          className="list-none inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-200/60 transition"
                          title="Más acciones"
                          aria-label="Más acciones"
                        >
                          <i className="bx bx-dots-vertical-rounded text-[18px]" />
                        </summary>

                        {/* Dropdown */}
                        <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg ring-1 ring-slate-900/5">
                          <button
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                            onClick={(e) => {
                              closeRowMenu(e);
                              handleEditClient(c); // Llamada a la función de editar
                            }}
                          >
                            <i className="bx bx-edit-alt text-sm text-slate-500" />
                            Editar
                          </button>

                          <button
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                            onClick={async (e) => {
                              closeRowMenu(e);
                              if (!selected.includes(id))
                                setSelected((prev) => [...prev, id]);
                              setIdConfigForTags(
                                c.id_configuracion || idConfigForTags,
                              );
                              await ensureCatalogAndOpen("toggle");
                            }}
                            title="Etiquetas"
                          >
                            <i className="bx bxs-purchase-tag-alt text-sm text-slate-500" />
                            Etiquetas…
                          </button>

                          <div className="my-1 h-px bg-slate-100" />

                          <button
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs text-red-600 hover:bg-red-50"
                            onClick={async (e) => {
                              closeRowMenu(e);
                              const ok = await swalConfirm(
                                "Eliminar cliente",
                                "¿Seguro que deseas eliminarlo?",
                              );
                              if (!ok) return;
                              try {
                                swalLoading("Eliminando...");
                                await apiDelete(id);
                                setItems((prev) =>
                                  prev.filter((x) => getId(x) !== id),
                                );
                                swalClose();
                                swalToast("Cliente eliminado");
                                await cargarOpcionesFiltroEtiquetas();
                              } catch (err) {
                                swalClose();
                                swalError("No se pudo eliminar", err?.message);
                              }
                            }}
                          >
                            <i className="bx bxs-trash-alt text-sm" />
                            Eliminar
                          </button>
                        </div>
                      </details>
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Drawer con ClientForm */}
      {/* Drawer profesional */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div
            className="flex-1 bg-slate-900/40 backdrop-blur-[2px]"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Panel derecho */}
          <div className="relative w-[480px] max-w-full bg-white shadow-2xl flex flex-col animate-slide-in-right">
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-slate-200">
              <div>
                <h2 className="text-base font-semibold text-slate-800">
                  {editing?.id ? "Editar cliente" : "Nuevo cliente"}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Completa la información del cliente
                </p>
              </div>

              <button
                onClick={() => setDrawerOpen(false)}
                className="rounded-md p-2 hover:bg-slate-100 transition"
              >
                <i className="bx bx-x text-xl text-slate-500" />
              </button>
            </div>

            {/* Body scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <ClientForm value={editing} onChange={setEditing} />
            </div>

            {/* Footer fijo */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setDrawerOpen(false)}
                className="px-4 py-2 text-xs font-medium rounded-md border border-slate-300 bg-white hover:bg-slate-100 transition"
              >
                Cancelar
              </button>

              <button
                onClick={onSave}
                className="px-4 py-2 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && items.length > 0 && (
        <div className="flex items-center justify-center py-4 text-sm text-slate-500">
          Cargando…
        </div>
      )}

      {!hasMore && items.length > 0 && (
        <div className="flex items-center justify-center py-4 text-[11px] text-slate-400">
          No hay más resultados
        </div>
      )}
    </div>
  );
};

export default TablaContactos;
