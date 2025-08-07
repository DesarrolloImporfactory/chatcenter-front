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
  const hue = (Number(id) * 47) % 360; // 47 es primo → genera buena dispersión
  return `hsl(${hue} 70% 65%)`; // saturación y luminosidad fijas
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

  /* ─ 3. mini-plantilla para cada fila de invitado ─ */
  function inviteeRowTpl({ name = "", email = "", phone = "" } = {}) {
    return `
      <div class="flex gap-2 items-center invitee-row">
        <input placeholder="Nombre"  class="swal2-input flex-1" value="${name}">
        <input placeholder="Correo*" class="swal2-input flex-1" value="${email}">
        <input placeholder="Tel."    class="swal2-input flex-1" value="${phone}">
        <button type="button" class="btn-del-inv text-red-600">✕</button>
      </div>`;
  }

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
    const u = usuarios.find((x) => x.id === userId);
    return u?.color || "#3b82f6";
  }

  /*  ───────────────────────────────────────────────────────────────── *
   *  openApptModal({ mode, initial, lockDateTime })                   *
   *  ───────────────────────────────────────────────────────────────── */
  async function openApptModal({ mode, initial, lockDateTime = false }) {
    /* 1️⃣  Datos base que poblarán los campos */
    const i = {
      title: initial?.title || "",
      status: initial?.status || "Agendado",
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
      inviteesParsed: Array.isArray(initial?.invitees) ? initial.invitees : [], // ← para modo “edit”
    };
    const disabledAttr = lockDateTime ? "disabled" : "";

    /* 2️⃣  HTML del modal (contiene el contenedor #invitees-list) */
    const html = `
    <div class="swal-form swal-compact">

      <!-- Datos básicos -->
      <div class="swal-row">
        <label>Título *</label>
        <input id="f-title" class="swal2-input" placeholder="Llamada con cliente"
               value="${i.title.replaceAll('"', "&quot;")}" />
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
            ${["Agendado", "Confirmado", "Completado", "Cancelado", "Bloqueado"]
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
                    Number(i.assigned_user_id) === u.id ? "selected" : ""
                  }>${u.nombre}</option>`
              )
              .join("")}
          </select>
        </div>
        <div>
          <label>Ubicación</label>
          <input id="f-location" class="swal2-input" placeholder="Oficina / Dirección"
                 value="${i.location_text.replaceAll('"', "&quot;")}" />
        </div>
      </div>

      <div class="swal-row">
        <label>URL de reunión</label>
        <input id="f-meet" class="swal2-input" placeholder="https://meet..."
               value="${i.meeting_url.replaceAll('"', "&quot;")}" />
      </div>

      <!-- Invitados -->
      <div class="swal-row">
        <label>Invitados</label>
        <div id="invitees-list" class="space-y-2 w-full"></div>
        <button type="button" id="btn-add-invitee"
         class="btn-add-inv" title="Añadir invitado">＋</button>
      </div>

      <div class="swal-row">
        <label>Descripción</label>
        <textarea id="f-desc" class="swal2-textarea">${i.description
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")}</textarea>
      </div>

    </div>`;

    /* 3️⃣  Helpers internos */
    const inviteeRowTpl = ({ name = "", email = "", phone = "" } = {}) => `
      <div class="flex gap-2 items-center invitee-row">
        <input placeholder="Nombre"  class="swal2-input flex-1" value="${name}">
        <input placeholder="Correo*" class="swal2-input flex-1" value="${email}">
        <input placeholder="Tel."    class="swal2-input flex-1" value="${phone}">
        <button type="button" class="btn-del-inv text-red-600">✕</button>
      </div>`;

    /* 4️⃣  Llamada a SweetAlert2 */
    const { isConfirmed, value } = await Swal.fire({
      title: mode === "create" ? "Nueva cita" : "Editar cita",
      html,
      width: 440,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: mode === "create" ? "Crear" : "Guardar",
      cancelButtonText: "Cancelar",

      /* ────── aquí armamos el UI dinámico de invitados ────── */
      didOpen: () => {
        const list = document.getElementById("invitees-list");
        const btnAdd = document.getElementById("btn-add-invitee");

        // Cargar valores previos (o al menos una fila vacía)
        const rows = i.inviteesParsed.length ? i.inviteesParsed : [{}];
        rows.forEach((inv) =>
          list.insertAdjacentHTML("beforeend", inviteeRowTpl(inv))
        );

        // Añadir fila
        btnAdd.addEventListener("click", () => {
          list.insertAdjacentHTML("beforeend", inviteeRowTpl());
        });

        // Eliminar fila
        list.addEventListener("click", (e) => {
          if (e.target.matches(".btn-del-inv")) {
            e.target.closest(".invitee-row")?.remove();
            if (!list.children.length)
              list.insertAdjacentHTML("beforeend", inviteeRowTpl());
          }
        });
      },

      /* ────── validaciones y recolección de datos ────── */
      preConfirm: () => {
        const get = (id) => document.getElementById(id)?.value?.trim();

        /* === campos básicos === */
        const title = get("f-title");
        const dateStr = get("f-date");
        const startStr = get("f-start");
        const endStr = get("f-end");
        const status = get("f-status") || "Agendado";
        const assigned = get("f-assigned");
        const location = get("f-location") || null;
        const meet = get("f-meet") || null;
        const desc = get("f-desc") || null;

        if (!title) {
          Swal.showValidationMessage("El título es obligatorio.");
          return false;
        }

        /* === fecha / hora === */
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

        /* === invitados === */
        const invitees = Array.from(
          document.querySelectorAll("#invitees-list .invitee-row")
        )
          .map((r) => {
            const [nameEl, emailEl, phoneEl] = r.querySelectorAll("input");
            return {
              name: nameEl.value.trim(),
              email: emailEl.value.trim(),
              phone: phoneEl.value.trim(),
            };
          })
          .filter((inv) => inv.email); // exige al menos correo

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

      customClass: {
        popup: "swal2-responsive",
        confirmButton:
          "px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700",
        cancelButton:
          "px-3 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300",
      },
    });

    /* 5️⃣  Devolver sólo si el usuario confirmó */
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
            const assigned = Number(
              e?.extendedProps?.assigned_user_id ?? e?.assigned_user_id ?? NaN
            ); // ← lo normalizamos a Number sí o sí

            return {
              ...e,
              backgroundColor: colorForUser(assigned),
              borderColor: colorForUser(assigned),
              extendedProps: { ...e.extendedProps, assigned_user_id: assigned },
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
        created_by_user_id: ownerUserId,
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
        created_by_user_id: ownerUserId,
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
        status: props.status || "Agendado",
        date: ev.start,
        start: ev.start,
        end: ev.end || new Date(ev.start.getTime() + 30 * 60000),
        startTime: ev.start?.toTimeString().slice(0, 5),
        endTime: (ev.end || ev.start)?.toTimeString().slice(0, 5),
        assigned_user_id: props.assigned_user_id ?? ev.assigned_user_id ?? "",
        location_text: props.location_text || "",
        meeting_url: props.meeting_url || "",
        description: props.description || "",
        invitees: props.invitees || [],
      },
      lockDateTime: false,
    });
    if (!form) return;

    try {
      await chatApi.patch(`/appointments/${ev.id}`, {
        ...form,
        created_by_user_id: ownerUserId,
      });
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
        created_by_user_id: ownerUserId,
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

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  function dayHeaderContent(arg) {
    const txt = dayNames[arg.date.getDay()];
    const num = arg.date.getDate();
    return {
      html: `<div class="fc-colhead">
                   <span>${txt}</span><b>${num}</b>
                 </div>`,
    };
  }

  function renderListEvent(arg) {
    const { event, timeText } = arg;
    const color = colorForUser(event.extendedProps.assigned_user_id);
    const urlMeet = event.extendedProps.meeting_url;

    /* Invitados como texto plano  */
    const invitados = (event.extendedProps.invitees || [])
      .map((i) => i.name || i.email)
      .join(", ");

    return {
      html: `
      <div class="flex flex-col w-full gap-1">

        <!---- Fila 1 : hora + título (+ icono de reunión) ---------------------->
        <div class="flex items-center gap-3">
          <span class="inline-block h-2 w-2 rounded-full"
                style="background:${color}"></span>
          <span class="text-xs text-gray-500 w-20 shrink-0">${timeText}</span>
          <span class="flex-1 truncate font-medium">${event.title}</span>

          ${
            urlMeet
              ? `<a href="${urlMeet}" target="_blank" rel="noopener noreferrer"
                     class="shrink-0" title="Ir a la reunión">
                     🔗
                 </a>`
              : ""
          }
        </div>

        <!---- Fila 2 : descripción si existe ---------------------->
        ${
          event.extendedProps.description
            ? `<div class="text-xs text-gray-600 truncate pl-6">
                 ${event.extendedProps.description}
               </div>`
            : ""
        }

        <!---- Fila 3 : invitados si existen ---------------------->
        ${
          invitados
            ? `<div class="text-xs text-gray-500 truncate pl-6">
                 ${invitados}
               </div>`
            : ""
        }

      </div>`,
    };
  }

  /* Inserta cabecera “Hora | Evento | Invitados” en la vista lista */
  useEffect(() => {
    if (!view.startsWith("list")) return;

    const calEl = calendarRef.current?.el;
    if (!calEl) return;

    const table = calEl.querySelector(".fc-list-table");
    if (!table || table.dataset.headerInjected) return;

    table.dataset.headerInjected = "1";
    const thead = document.createElement("thead");
    thead.innerHTML = `
    <tr class="text-xs uppercase text-gray-500 bg-gray-50">
      <th class="w-20 px-3 py-1.5 text-left">Hora</th>
      <th class="px-3 py-1.5 text-left">Evento</th>
      <th class="px-3 py-1.5 text-left">Invitados</th>
    </tr>`;
    table.prepend(thead);
  }, [view, currentDate]);

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
                  /* Básico -------------------------------------------------------- */
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
                  /* Selección y edición ------------------------------------------ */
                  selectable
                  selectMirror
                  editable
                  nowIndicator
                  select={handleSelect}
                  eventClick={handleEventClick}
                  eventDrop={handleEventDrop}
                  eventResize={handleEventResize}
                  /* Horas y formato ---------------------------------------------- */
                  slotMinTime="06:00:00"
                  slotMaxTime="24:00:00"
                  scrollTime="08:00:00"
                  allDaySlot={true}
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
                  /* Datos --------------------------------------------------------- */
                  events={fetchEvents}
                  loading={setLoading}
                  /* Cabecera FECHA ------------------------------------------------ */
                  dayHeaderContent={dayHeaderContent}
                  stickyHeaderDates={true}
                  datesSet={(arg) =>
                    setCurrentDate(
                      new Date(arg.start.getTime() + (arg.end - arg.start) / 2)
                    )
                  }
                  /* Vista LISTA – dibujar cada fila ------------------------------ */
                  views={{
                    listWeek: {
                      buttonText: "Lista",
                      dayHeaderFormat: {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      }, // Jue 7 ago
                      noEventsContent: "Sin citas", // texto vacío
                    },
                    listDay: { buttonText: "Día (lista)" },
                  }}
                  eventContent={
                    view.startsWith("list") ? renderListEvent : undefined
                  }
                  /* Enlace 🔗 delante del título en vistas grid ------------------- */
                  eventDidMount={(info) => {
                    if (!info.view.type.startsWith("list")) {
                      const url = info.event.extendedProps.meeting_url;
                      if (!url) return;

                      const link = document.createElement("a");
                      link.href = url;
                      link.target = "_blank";
                      link.rel = "noopener noreferrer";
                      link.className = "fc-meet-link";
                      link.title = "Abrir reunión";
                      link.textContent = "🔗";

                      info.el.querySelector(".fc-event-title")?.prepend(link);
                    }
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
