import { useRef, useState, useMemo, useEffect, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";
import "./Calendario.css";

const WEEKDAYS = ["D", "L", "Ma", "Mi", "J", "V", "S"];

// === Helpers ===
function safeJwtDecode(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// ISO con offset local (YYYY-MM-DDTHH:mm:ss-05:00)
function toLocalOffsetISO(d) {
  const pad = (n) => String(n).padStart(2, "0");
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const hh = pad(Math.floor(Math.abs(off) / 60));
  const mm = pad(Math.abs(off) % 60);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:00${sign}${hh}:${mm}`;
}
function gmtBadgeFromNow() {
  const off = -new Date().getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const a = Math.abs(off);
  const hh = String(Math.floor(a / 60)).padStart(2, "0");
  const mm = String(a % 60).padStart(2, "0");
  return `GMT ${sign}${hh}:${mm}`;
}
function colorFromId(id) {
  let x = Number(id) || 0;
  x = (x ^ 0x9e3779b9) >>> 0;
  const r = x & 0xff;
  const g = (x >> 8) & 0xff;
  const b = (x >> 16) & 0xff;
  const toHex = (n) => n.toString(16).padStart(2, "0");
  return `#${toHex(160 + (r % 80))}${toHex(120 + (g % 80))}${toHex(
    120 + (b % 80)
  )}`;
}

export default function Calendario() {
  const calendarRef = useRef(null);
  const [view, setView] = useState("timeGridWeek");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);

  // 💡 AHORA vienen del token/localStorage
  const [accountId, setAccountId] = useState(null); // id_configuracion
  const [ownerUserId, setOwnerUserId] = useState(null); // id_usuario

  // id de calendario (devuelto por /calendars/ensure)
  const [calendarId, setCalendarId] = useState(null);

  // Zona horaria del cliente (para crear/mover)
  const bookedTz =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Guayaquil";

  // Usuarios reales para asignar/filtrar
  const [usuarios, setUsuarios] = useState([]); // { id, nombre, color, checked }
  const selectedUserIds = useMemo(
    () => usuarios.filter((u) => u.checked).map((u) => u.id),
    [usuarios]
  );

  // 0) Leer token y setear accountId/ownerUserId
  useEffect(() => {
    const token = localStorage.getItem("token");
    const payload = token ? safeJwtDecode(token) : null;

    const fromTokenAccount = Number(payload?.id_configuracion) || null;
    const fromTokenOwner = Number(payload?.id_usuario) || null;

    const fromLSAccount =
      Number(localStorage.getItem("id_configuracion")) || null;
    const fromLSOwner = Number(localStorage.getItem("id_usuario")) || null;

    setAccountId(fromTokenAccount ?? fromLSAccount ?? null);
    setOwnerUserId(fromTokenOwner ?? fromLSOwner ?? null);
  }, []);

  const api = () => calendarRef.current?.getApi();
  const gotoToday = () => {
    api()?.today();
    setCurrentDate(new Date(api()?.getDate() || new Date()));
  };
  const gotoPrev = () => {
    api()?.prev();
    setCurrentDate(new Date(api()?.getDate() || new Date()));
  };
  const gotoNext = () => {
    api()?.next();
    setCurrentDate(new Date(api()?.getDate() || new Date()));
  };
  const changeView = (v) => {
    setView(v);
    api()?.changeView(v);
  };

  // 1) Asegurar/crear calendario (espera a tener accountId)
  useEffect(() => {
    if (!accountId) return; // <- guardia
    const ensureCalendar = async () => {
      try {
        const { data } = await chatApi.post("/calendars/ensure", {
          account_id: accountId,
          name: "Calendario principal",
        });
        setCalendarId(data?.calendar?.id ?? null);
      } catch (e) {
        console.error("No se pudo asegurar el calendario:", e);
        Swal.fire("Error", "No se pudo preparar el calendario.", "error");
      }
    };
    ensureCalendar();
  }, [accountId]);

  // 2) Cargar usuarios reales (espera a tener ownerUserId)
  useEffect(() => {
    if (!ownerUserId) return; // <- guardia
    const loadUsers = async () => {
      try {
        const { data } = await chatApi.post(
          "/usuarios_chat_center/listarUsuarios",
          { id_usuario: ownerUserId }
        );
        const rows = Array.isArray(data?.data) ? data.data : [];
        const mapped = rows.map((r, i) => {
          const id = r.id_sub_usuario ?? r.id_usuario; // cambia a r.id_usuario si prefieres
          const nombre = r.nombre_encargado || r.usuario || `Usuario ${i + 1}`;
          return {
            id,
            nombre,
            color: colorFromId(id),
            checked: true,
          };
        });
        setUsuarios(mapped.length ? mapped : []);
      } catch (err) {
        console.error("No se pudieron cargar usuarios reales:", err);
        setUsuarios([
          { id: 1, nombre: "Usuario", color: "#3b82f6", checked: true },
        ]);
      }
    };
    loadUsers();
  }, [ownerUserId]);

  function colorForUser(userId) {
    const u = usuarios.find((x) => x.id === Number(userId));
    return u?.color || "#3b82f6";
  }

  // ------- Modal reutilizable (crear/editar) -------
  async function openApptModal({ mode, initial, lockDateTime = false }) {
    const i = {
      title: initial?.title || "",
      status: initial?.status || "scheduled",
      date: (initial?.date || new Date()).toISOString().slice(0, 10),
      startTime:
        initial?.startTime ||
        (initial?.start
          ? new Date(initial.start).toTimeString().slice(0, 5)
          : "09:00"),
      endTime:
        initial?.endTime ||
        (initial?.end
          ? new Date(initial.end).toTimeString().slice(0, 5)
          : "09:30"),
      assigned_user_id: initial?.assigned_user_id ?? "",
      location_text: initial?.location_text || "",
      meeting_url: initial?.meeting_url || "",
      description: initial?.description || "",
      invitees: (initial?.invitees || []).map((x) => x.email).join(", "),
    };
    const disabledAttr = lockDateTime ? "disabled" : "";

    const html = `
      <div class="swal-form swal-compact">
        <div class="swal-row">
          <label>Título *</label>
          <input id="f-title" class="swal2-input" placeholder="Llamada con cliente" value="${i.title.replaceAll(
            '"',
            "&quot;"
          )}" />
        </div>

        <div class="swal-row grid2">
          <div>
            <label>Fecha *</label>
            <input id="f-date" type="date" class="swal2-input" value="${
              i.date
            }" ${disabledAttr}/>
          </div>
          <div>
            <label>Estado</label>
            <select id="f-status" class="swal2-input">
              ${["scheduled", "confirmed", "completed", "cancelled", "blocked"]
                .map(
                  (st) =>
                    `<option value="${st}" ${
                      i.status === st ? "selected" : ""
                    }>${st}</option>`
                )
                .join("")}
            </select>
          </div>
        </div>

        <div class="swal-row grid2">
          <div>
            <label>Hora inicio *</label>
            <input id="f-start" type="time" class="swal2-input" value="${
              i.startTime
            }" ${disabledAttr}/>
          </div>
          <div>
            <label>Hora fin *</label>
            <input id="f-end" type="time" class="swal2-input" value="${
              i.endTime
            }" ${disabledAttr}/>
          </div>
        </div>

        <div class="swal-row grid2">
          <div>
            <label>Asignado a</label>
            <select id="f-assigned" class="swal2-input">
              <option value="">(Sin asignar)</option>
              ${usuarios
                .map(
                  (u) =>
                    `<option value="${u.id}" ${
                      Number(i.assigned_user_id) === Number(u.id)
                        ? "selected"
                        : ""
                    }>${u.nombre}</option>`
                )
                .join("")}
            </select>
          </div>
          <div>
            <label>Ubicación</label>
            <input id="f-location" class="swal2-input" placeholder="Oficina / Dirección" value="${i.location_text.replaceAll(
              '"',
              "&quot;"
            )}" />
          </div>
        </div>

        <div class="swal-row">
          <label>URL de reunión</label>
          <input id="f-meet" class="swal2-input" placeholder="https://meet..." value="${i.meeting_url.replaceAll(
            '"',
            "&quot;"
          )}" />
        </div>

        <div class="swal-row">
          <label>Invitados (emails, separados por coma)</label>
          <input id="f-invitees" class="swal2-input" value="${i.invitees.replaceAll(
            '"',
            "&quot;"
          )}" />
        </div>

        <div class="swal-row">
          <label>Descripción</label>
          <textarea id="f-desc" class="swal2-textarea">${i.description
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")}</textarea>
        </div>
      </div>
    `;

    const { isConfirmed, value } = await Swal.fire({
      title: mode === "create" ? "Nueva cita" : "Editar cita",
      html,
      width: 520,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: mode === "create" ? "Crear" : "Guardar",
      cancelButtonText: "Cancelar",
      customClass: {
        popup: "swal2-responsive",
        confirmButton:
          "px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700",
        cancelButton:
          "px-3 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300",
      },
      preConfirm: () => {
        const get = (id) => document.getElementById(id)?.value?.trim();
        const title = get("f-title");
        const dateStr = get("f-date");
        const startStr = get("f-start");
        const endStr = get("f-end");
        const status = get("f-status") || "scheduled";
        const assigned = get("f-assigned");
        const location = get("f-location") || null;
        const meet = get("f-meet") || null;
        const desc = get("f-desc") || null;
        const inviteesRaw = get("f-invitees") || "";

        if (!title) {
          Swal.showValidationMessage("El título es obligatorio.");
          return false;
        }

        let startISO, endISO;
        if (lockDateTime) {
          startISO = toLocalOffsetISO(initial.start);
          endISO = toLocalOffsetISO(initial.end);
        } else {
          if (!dateStr || !startStr || !endStr) {
            Swal.showValidationMessage(
              "Completa fecha, hora inicio y hora fin."
            );
            return false;
          }
          const [sh, sm] = startStr.split(":").map(Number);
          const [eh, em] = endStr.split(":").map(Number);
          const s = new Date(dateStr + "T00:00:00");
          s.setHours(sh, sm, 0, 0);
          const e = new Date(dateStr + "T00:00:00");
          e.setHours(eh, em, 0, 0);
          if (e <= s) {
            Swal.showValidationMessage(
              "La hora fin debe ser mayor que la hora inicio."
            );
            return false;
          }
          startISO = toLocalOffsetISO(s);
          endISO = toLocalOffsetISO(e);
        }

        const invitees = inviteesRaw
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean)
          .map((email) => ({ email }));

        return {
          title,
          status,
          assigned_user_id: assigned ? Number(assigned) : null,
          location_text: location,
          meeting_url: meet,
          description: desc,
          start: startISO,
          end: endISO,
          booked_tz: bookedTz,
          invitees,
        };
      },
    });

    if (!isConfirmed) return null;
    return value;
  }

  // --------- Fuente de eventos ----------
  const fetchEvents = useCallback(
    (info, successCallback) => {
      if (!calendarId) {
        successCallback([]);
        return;
      }
      const params = {
        calendar_id: calendarId,
        start: info.start.toISOString(),
        end: info.end.toISOString(),
      };
      if (selectedUserIds.length) params.user_ids = selectedUserIds.join(",");

      chatApi
        .get("/appointments", { params })
        .then(({ data }) => {
          const mapped = (data?.events ?? []).map((e) => {
            const assigned =
              e?.extendedProps?.assigned_user_id ?? e?.assigned_user_id ?? null;
            return {
              ...e,
              backgroundColor: colorForUser(assigned),
              borderColor: colorForUser(assigned),
            };
          });
          successCallback(mapped);
        })
        .catch((err) => {
          console.error("appointments error:", err);
          successCallback([]);
          Swal.fire("Error", "No se pudieron cargar los eventos.", "error");
        });
    },
    [calendarId, selectedUserIds, usuarios]
  );

  // ------ Crear desde selección (fecha/hora bloqueadas) ------
  const handleSelect = async (info) => {
    if (!calendarId) return;
    const form = await openApptModal({
      mode: "create",
      initial: {
        start: info.start,
        end: info.end,
        date: info.start,
        startTime: info.start.toTimeString().slice(0, 5),
        endTime: info.end.toTimeString().slice(0, 5),
        assigned_user_id: selectedUserIds[0] ?? "",
      },
      lockDateTime: true,
    });
    if (!form) return;

    try {
      await chatApi.post("/appointments", {
        calendar_id: calendarId,
        ...form,
      });
      Swal.fire("Listo", "Cita creada.", "success");
      api()?.unselect();
      api()?.refetchEvents();
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        "No se pudo crear la cita (conflicto?).";
      Swal.fire("Error", msg, "error");
    }
  };

  // ------ + Nuevo (fecha/hora editables) ------
  const handleNewClick = async () => {
    if (!calendarId) {
      return Swal.fire(
        "Calendario",
        "Aún no está listo el calendario.",
        "info"
      );
    }
    const base = new Date(currentDate);
    base.setHours(9, 0, 0, 0);
    const base30 = new Date(base.getTime() + 30 * 60 * 1000);

    const form = await openApptModal({
      mode: "create",
      initial: {
        date: base,
        start: base,
        end: base30,
        startTime: base.toTimeString().slice(0, 5),
        endTime: base30.toTimeString().slice(0, 5),
        assigned_user_id: selectedUserIds[0] ?? "",
      },
      lockDateTime: false,
    });
    if (!form) return;

    try {
      await chatApi.post("/appointments", {
        calendar_id: calendarId,
        ...form,
      });
      Swal.fire("Listo", "Cita creada.", "success");
      api()?.refetchEvents();
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || "No se pudo crear la cita.";
      Swal.fire("Error", msg, "error");
    }
  };

  // ------ Editar evento ------
  const handleEventClick = async (clickInfo) => {
    const ev = clickInfo.event;
    const props = ev.extendedProps || {};
    const form = await openApptModal({
      mode: "edit",
      initial: {
        title: ev.title,
        status: props.status || "scheduled",
        date: ev.start,
        start: ev.start,
        end: ev.end || new Date(ev.start.getTime() + 30 * 60000),
        startTime: ev.start?.toTimeString().slice(0, 5),
        endTime: (ev.end || ev.start)?.toTimeString().slice(0, 5),
        assigned_user_id: props.assigned_user_id ?? ev.assigned_user_id ?? "",
        location_text: props.location_text || "",
        meeting_url: props.meeting_url || "",
        description: props.description || "",
      },
      lockDateTime: false,
    });
    if (!form) return;

    try {
      await chatApi.patch(`/appointments/${ev.id}`, form);
      Swal.fire("Guardado", "Cita actualizada.", "success");
      api()?.refetchEvents();
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || "No se pudo actualizar.";
      Swal.fire("Error", msg, "error");
    }
  };

  // Drag & drop / resize
  const handleEventDrop = async (changeInfo) => {
    try {
      await chatApi.patch(`/appointments/${changeInfo.event.id}`, {
        start: changeInfo.event.start.toISOString(),
        end: changeInfo.event.end?.toISOString(),
        booked_tz: bookedTz,
      });
      Swal.fire("Listo", "Cita reprogramada.", "success");
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "No se pudo reprogramar (conflicto?).", "error");
      changeInfo.revert();
    }
  };
  const handleEventResize = handleEventDrop;

  // -------- Mini-calendario --------
  const monthStart = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  );
  const monthEnd = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  );
  const startWeekDay = monthStart.getDay();
  const days = [];
  for (let i = 0; i < startWeekDay; i++) days.push(null);
  for (let d = 1; d <= monthEnd.getDate(); d++) {
    days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), d));
  }

  const onMiniClick = (d) => {
    if (!d) return;
    api()?.gotoDate(d);
    setCurrentDate(d);
    api()?.refetchEvents();
  };

  const dayHeaderContent = (arg) => {
    const dayNames = ["D", "L", "M", "Mi", "J", "V", "S"];
    const initial = dayNames[arg.date.getDay()];
    const num = arg.date.getDate();
    return {
      html: `<div class="fc-colhead"><span>${initial}</span><b>${num}</b></div>`,
    };
  };

  return (
    <div className="h-full w-full">
      {/* Tabs/Controles */}
      <div className="bg-white border-b">
        <div className="mx-auto max-w-[1400px] px-4">
          <div className="flex items-center gap-6 h-14">
            <h1 className="text-xl font-semibold">Calendarios</h1>
            <nav className="flex items-center gap-2 text-sm">
              <button className="px-3 py-1.5 rounded-md bg-blue-50 text-blue-600 font-medium">
                Vista del calendario
              </button>
              <button className="px-3 py-1.5 rounded-md hover:bg-gray-100">
                Vista de lista de Cita
              </button>
              <button className="px-3 py-1.5 rounded-md hover:bg-gray-100">
                Configuración del calendario
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="mx-auto max-w-[1400px] px-4 py-4">
        <div className="grid grid-cols-12 gap-4">
          {/* Calendario principal */}
          <div className="col-span-12 lg:col-span-9">
            <div className="bg-white rounded-md shadow-sm border">
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={gotoToday}
                    className="px-3 py-1.5 rounded border hover:bg-gray-50"
                  >
                    Hoy
                  </button>
                  <div className="flex">
                    <button
                      onClick={gotoPrev}
                      className="px-2 py-1.5 rounded-l border hover:bg-gray-50"
                      title="Anterior"
                    >
                      ‹
                    </button>
                    <button
                      onClick={gotoNext}
                      className="px-2 py-1.5 rounded-r border hover:bg-gray-50"
                      title="Siguiente"
                    >
                      ›
                    </button>
                  </div>
                  <div className="ml-3 font-medium">
                    {api()?.view?.title || ""}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                    {gmtBadgeFromNow()}
                  </span>
                  <div className="hidden md:flex items-center gap-1">
                    <button
                      onClick={() => changeView("timeGridDay")}
                      className={`px-3 py-1.5 rounded border hover:bg-gray-50 ${
                        view === "timeGridDay" ? "bg-gray-100" : ""
                      }`}
                    >
                      Día
                    </button>
                    <button
                      onClick={() => changeView("timeGridWeek")}
                      className={`px-3 py-1.5 rounded border hover:bg-gray-50 ${
                        view === "timeGridWeek" ? "bg-gray-100" : ""
                      }`}
                    >
                      Semana
                    </button>
                    <button
                      onClick={() => changeView("dayGridMonth")}
                      className={`px-3 py-1.5 rounded border hover:bg-gray-50 ${
                        view === "dayGridMonth" ? "bg-gray-100" : ""
                      }`}
                    >
                      Mes
                    </button>
                    <button
                      onClick={() => changeView("listWeek")}
                      className={`px-3 py-1.5 rounded border hover:bg-gray-50 ${
                        view === "listWeek" ? "bg-gray-100" : ""
                      }`}
                    >
                      Lista
                    </button>
                  </div>

                  <button
                    onClick={handleNewClick}
                    className="ml-2 px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                  >
                    + Nuevo
                  </button>
                </div>
              </div>

              {/* Calendario */}
              <div className="border-t relative">
                {loading && (
                  <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex items-center justify-center z-10 text-sm">
                    Cargando eventos…
                  </div>
                )}
                <FullCalendar
                  ref={calendarRef}
                  locale={esLocale}
                  plugins={[
                    dayGridPlugin,
                    timeGridPlugin,
                    listPlugin,
                    interactionPlugin,
                  ]}
                  initialView="timeGridWeek"
                  height="calc(100vh - 220px)"
                  headerToolbar={false}
                  selectable={true}
                  selectMirror={true}
                  nowIndicator={true}
                  allDaySlot={true}
                  slotMinTime="06:00:00"
                  slotMaxTime="21:00:00"
                  scrollTime="08:00:00"
                  events={fetchEvents}
                  loading={(isLoading) => setLoading(isLoading)}
                  select={handleSelect}
                  eventClick={handleEventClick}
                  editable={true}
                  eventDrop={handleEventDrop}
                  eventResize={handleEventResize}
                  eventTimeFormat={{
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  }}
                  slotLabelFormat={{
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  }}
                  dayHeaderContent={dayHeaderContent}
                  stickyHeaderDates={true}
                  datesSet={(arg) => {
                    setCurrentDate(
                      new Date(arg.start.getTime() + (arg.end - arg.start) / 2)
                    );
                  }}
                />
              </div>
            </div>
          </div>

          {/* Sidebar derecha */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-white rounded-md shadow-sm border p-3 mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium capitalize">
                  {currentDate.toLocaleString("es-EC", {
                    month: "long",
                    year: "numeric",
                  })}
                </div>
                <div className="flex">
                  <button
                    onClick={() => {
                      const d = new Date(currentDate);
                      d.setMonth(d.getMonth() - 1);
                      setCurrentDate(d);
                      api()?.gotoDate(d);
                      api()?.refetchEvents();
                    }}
                    className="px-2 py-1 rounded border hover:bg-gray-50"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => {
                      const d = new Date(currentDate);
                      d.setMonth(d.getMonth() + 1);
                      setCurrentDate(d);
                      api()?.gotoDate(d);
                      api()?.refetchEvents();
                    }}
                    className="ml-1 px-2 py-1 rounded border hover:bg-gray-50"
                  >
                    ›
                  </button>
                </div>
              </div>

              {/* Mini calendario */}
              <div className="grid grid-cols-7 text-xs text-center mb-1">
                {WEEKDAYS.map((d, i) => (
                  <div key={i} className="py-1 text-gray-500">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 text-sm">
                {days.map((d, i) => {
                  const today = new Date();
                  const isToday =
                    d && d.toDateString() === today.toDateString();
                  const isSelected =
                    d && d.toDateString() === currentDate.toDateString();

                  return (
                    <button
                      key={i}
                      onClick={() => onMiniClick(d)}
                      className={`h-9 rounded relative
                        ${
                          !d
                            ? ""
                            : isSelected
                            ? "ring-2 ring-blue-600"
                            : "hover:bg-gray-100"
                        }
                        ${!d ? "cursor-default" : "cursor-pointer"}
                      `}
                      disabled={!d}
                    >
                      {d ? d.getDate() : ""}
                      {isToday && d && (
                        <span className="absolute left:1/2 -translate-x-1/2 bottom-1 w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filtros: Usuarios */}
            <div className="bg-white rounded-md shadow-sm border p-3">
              <div className="font-medium mb-2">Usuarios</div>
              <div className="space-y-2">
                {usuarios.map((u, idx) => (
                  <label key={u.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={u.checked}
                      onChange={(e) => {
                        const next = [...usuarios];
                        next[idx] = { ...next[idx], checked: e.target.checked };
                        setUsuarios(next);
                        api()?.refetchEvents();
                      }}
                    />
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ background: u.color }}
                      />
                      {u.nombre}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
