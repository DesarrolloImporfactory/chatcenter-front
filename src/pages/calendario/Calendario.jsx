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
  const hue = (Number(id) * 47) % 360;
  return `hsl(${hue} 70% 65%)`;
}
function tzSuffix() {
  const off = -new Date().getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, "0");
  return `(${sign}${hh})`;
}
function fmtDateTime(d) {
  // "ago. 08, 2025, 08:00 AM (-05)"
  const str = new Date(d).toLocaleString("es-EC", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  // añade offset tipo (-05)
  const off = -new Date().getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, "0");
  return `${str} (${sign}${hh})`;
}

export default function Calendario() {
  const calendarRef = useRef(null);
  const [view, setView] = useState("timeGridWeek");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("calendar"); // 'calendar' | 'list' | 'settings'
  const [configName, setConfigName] = useState(null);

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

  // LISTA tipo CRM
  const [listLoading, setListLoading] = useState(false);
  const [listRows, setListRows] = useState([]);
  const [search, setSearch] = useState("");
  const [listFilter, setListFilter] = useState("proximas");
  const [listSort, setListSort] = useState("startAsc");

  // 0) Leer token y setear accountId/ownerUserId
  useEffect(() => {
    const token = localStorage.getItem("token");
    const payload = token ? safeJwtDecode(token) : null;

    const fromTokenAccount = Number(payload?.id_configuracion) || null;
    const fromTokenOwner = Number(payload?.id_usuario) || null;

    const fromLSAccount =
      Number(localStorage.getItem("id_configuracion")) || null;
    const fromLSOwner = Number(localStorage.getItem("id_usuario")) || null;
    const fromLSName = localStorage.getItem("nombre_configuracion") || null;

    setAccountId(fromTokenAccount ?? fromLSAccount ?? null);
    setOwnerUserId(fromTokenOwner ?? fromLSOwner ?? null);
    setConfigName(fromLSName);
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

  // 1) Asegurar/crear calendario
  useEffect(() => {
    if (!accountId) return;
    const ensureCalendar = async () => {
      try {
        const { data } = await chatApi.post("/calendars/ensure", {
          account_id: accountId,
          name: configName || "Calendario principal",
          created_by: ownerUserId,
        });
        setCalendarId(data?.calendar?.id ?? null);
      } catch (e) {
        console.error("No se pudo asegurar el calendario:", e);
        Swal.fire("Error", "No se pudo preparar el calendario.", "error");
      }
    };
    ensureCalendar();
  }, [accountId, configName, ownerUserId]);

  // 2) Cargar usuarios reales
  useEffect(() => {
    if (!ownerUserId) return;
    const loadUsers = async () => {
      try {
        const { data } = await chatApi.post(
          "/usuarios_chat_center/listarUsuarios",
          { id_usuario: ownerUserId }
        );
        const rows = Array.isArray(data?.data) ? data.data : [];
        const mapped = rows.map((r, i) => {
          const id = r.id_sub_usuario ?? r.id_usuario;
          const nombre = r.nombre_encargado || r.usuario || `Usuario ${i + 1}`;
          return { id, nombre, color: colorFromId(id), checked: true };
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

  /* ─────────────────────────────────────────────────────────────────
   *  Modal de crear/editar cita (igual que usted ya lo tenía)
   *  ───────────────────────────────────────────────────────────────*/
  async function openApptModal({ mode, initial, lockDateTime = false }) {
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
      inviteesParsed: Array.isArray(initial?.invitees) ? initial.invitees : [],
    };
    const disabledAttr = lockDateTime ? "disabled" : "";

    const html = `
    <div class="swal-form swal-compact">
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
      <div class="swal-row">
        <label>Invitados</label>
        <div id="invitees-list" class="space-y-2 w-full"></div>
        <button type="button" id="btn-add-invitee" class="btn-add-inv" title="Añadir invitado">＋</button>
      </div>
      <div class="swal-row">
        <label>Descripción</label>
        <textarea id="f-desc" class="swal2-textarea">${i.description
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")}</textarea>
      </div>
    </div>`;

    const { isConfirmed, value } = await Swal.fire({
      title: mode === "create" ? "Nueva cita" : "Editar cita",
      html,
      width: 440,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: mode === "create" ? "Crear" : "Guardar",
      cancelButtonText: "Cancelar",
      didOpen: () => {
        const list = document.getElementById("invitees-list");
        const btnAdd = document.getElementById("btn-add-invitee");
        const rows = i.inviteesParsed.length ? i.inviteesParsed : [{}];
        rows.forEach((inv) =>
          list.insertAdjacentHTML("beforeend", inviteeRowTpl(inv))
        );
        btnAdd.addEventListener("click", () =>
          list.insertAdjacentHTML("beforeend", inviteeRowTpl())
        );
        list.addEventListener("click", (e) => {
          if (e.target.matches(".btn-del-inv")) {
            e.target.closest(".invitee-row")?.remove();
            if (!list.children.length)
              list.insertAdjacentHTML("beforeend", inviteeRowTpl());
          }
        });
      },
      preConfirm: () => {
        const get = (id) => document.getElementById(id)?.value?.trim();
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
          .filter((inv) => inv.email);

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

    if (!isConfirmed) return null;
    return value;
  }

  // --------- Fuente de eventos para el calendario ----------
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
            );
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
      if (tab === "list") loadListRows(); // refresca la tabla si está abierta
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
      if (tab === "list") loadListRows();
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
      if (tab === "list") loadListRows();
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
      if (tab === "list") loadListRows();
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
    if (tab === "list") loadListRows(d);
  };

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  function dayHeaderContent(arg) {
    const txt = dayNames[arg.date.getDay()];
    const num = arg.date.getDate();
    return {
      html: `<div class="fc-colhead"><span>${txt}</span><b>${num}</b></div>`,
    };
  }

  // ====== LISTA: cargar próximas citas (1 mes por defecto) ======
  const loadListRows = useCallback(
    async (centerDate = currentDate) => {
      if (!calendarId) return;
      setListLoading(true);
      try {
        const params = { calendar_id: calendarId };

        if (selectedUserIds.length) {
          params.user_ids = selectedUserIds.join(",");
        }

        // RANGO por filtro:
        // - 'proximas'  => desde ahora (sin end) -> backend devuelve futuras
        // - 'cancelado' => SIN rango -> backend devuelve todas y filtramos por estado en front
        // - 'todos'     => SIN rango -> backend devuelve absolutamente todas
        if (listFilter === "proximas") {
          params.start = new Date().toISOString();
        }
        // 'cancelado' y 'todos' => no enviamos start/end

        const { data } = await chatApi.get("/appointments", { params });

        const rows = (data?.events ?? []).map((e) => ({
          id: e.id,
          title: e.title,
          start: e.start,
          end: e.end,
          meeting_url: e.extendedProps?.meeting_url || null,
          status: e.extendedProps?.status || "Agendado",
          invitees: e.extendedProps?.invitees || [],
          assigned_user_id:
            Number(e.extendedProps?.assigned_user_id ?? e.assigned_user_id) ||
            null,
          calendar_name: e.extendedProps?.calendar?.name || "—",
          created_at:
            e.extendedProps?.created_at || e.created_at || e.createdAt || null,
        }));

        setListRows(rows);
      } catch (e) {
        console.error(e);
        Swal.fire("Error", "No se pudo cargar la lista de citas.", "error");
      } finally {
        setListLoading(false);
      }
    },
    [calendarId, selectedUserIds, currentDate, listFilter] // <- importante: depende de listFilter
  );

  // Cargar lista cuando cambio a pestaña "list" o cambian filtros
  useEffect(() => {
    if (tab === "list") loadListRows();
  }, [tab, loadListRows]);

  // ====== Render de evento en vista LISTA de FullCalendar (por si la usa) ======
  function renderListEvent(arg) {
    const { event, timeText } = arg;
    const color = colorForUser(event.extendedProps.assigned_user_id);
    const urlMeet = event.extendedProps.meeting_url;
    const invitados = (event.extendedProps.invitees || [])
      .map((i) => i.name || i.email)
      .join(", ");
    return {
      html: `
      <div class="flex flex-col w-full gap-1">
        <div class="flex items-center gap-3">
          <span class="inline-block h-2 w-2 rounded-full" style="background:${color}"></span>
          <span class="text-xs text-gray-500 w-20 shrink-0">${timeText}</span>
          <span class="flex-1 truncate font-medium pl-8">${event.title}</span>
          ${
            urlMeet
              ? `<a href="${urlMeet}" target="_blank" rel="noopener noreferrer" class="shrink-0" title="Ir a la reunión">🔗</a>`
              : ""
          }
        </div>
        ${
          event.extendedProps.description
            ? `<div class="text-xs text-gray-600 truncate pl-8">${event.extendedProps.description}</div>`
            : ""
        }
        ${
          invitados
            ? `<div class="text-xs text-gray-500 truncate pl-6">${invitados}</div>`
            : ""
        }
      </div>`,
    };
  }

  // ====== Handlers de estado en la tabla ======
  const updateStatus = async (rowId, newStatus) => {
    try {
      await chatApi.patch(`/appointments/${rowId}`, {
        status: newStatus,
        created_by_user_id: ownerUserId,
      });
      setListRows((rows) =>
        rows.map((r) => (r.id === rowId ? { ...r, status: newStatus } : r))
      );
      Swal.fire({
        toast: true,
        timer: 1200,
        position: "top-end",
        showConfirmButton: false,
        icon: "success",
        title: "Estado actualizado",
      });
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No se pudo actualizar el estado.", "error");
    }
  };

  // ====== UI ======
  return (
    <div className="p-0 mt-16">
      {/* Título al estilo Admin */}
      <h1 className="text-2xl font-bold mb-4 p-5">
        Planifica y Controla tus Citas en un Solo Lugar
      </h1>

      {/* Tabs - MISMO estilo que AdministradorPlantillas2 */}
      <div className="overflow-x-auto">
        <div className="flex gap-4 border-b border-gray-200 px-5 min-w-max">
          <button
            className={`pb-2 flex items-center gap-2 transition-colors duration-200 ${
              tab === "calendar"
                ? "text-blue-600 border-b-2 border-blue-600 font-semibold"
                : "text-gray-600 hover:text-blue-600"
            }`}
            onClick={() => setTab("calendar")}
          >
            <i className="bx bx-calendar"></i> Calendario
          </button>

          <button
            className={`pb-2 flex items-center gap-2 transition-colors duration-200 ${
              tab === "list"
                ? "text-blue-600 border-b-2 border-blue-600 font-semibold"
                : "text-gray-600 hover:text-blue-600"
            }`}
            onClick={() => setTab("list")}
          >
            <i className="fas fa-list"></i> Lista de Citas
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="w-full px-5 py-4">
        {tab === "calendar" && (
          <div className="grid grid-cols-12 gap-4">
            {/* Calendario principal */}
            <div className="col-span-12 lg:col-span-9">
              <div className="bg-white rounded-md shadow-sm border">
                {/* Toolbar del calendario */}
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
                    selectable
                    selectMirror
                    editable
                    nowIndicator
                    select={handleSelect}
                    eventClick={handleEventClick}
                    eventDrop={handleEventDrop}
                    eventResize={handleEventResize}
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
                    events={fetchEvents}
                    loading={setLoading}
                    dayHeaderContent={dayHeaderContent}
                    stickyHeaderDates={true}
                    datesSet={(arg) =>
                      setCurrentDate(
                        new Date(
                          arg.start.getTime() + (arg.end - arg.start) / 2
                        )
                      )
                    }
                    views={{
                      listWeek: {
                        buttonText: "Lista",
                        dayHeaderFormat: {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        },
                        noEventsContent: "Sin citas",
                        eventContent: renderListEvent,
                      },
                      listDay: {
                        buttonText: "Día (lista)",
                        eventContent: renderListEvent,
                      },
                    }}
                    eventContent={renderListEvent}
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
                        className={`h-9 rounded relative ${
                          !d
                            ? ""
                            : isSelected
                            ? "ring-2 ring-blue-600"
                            : "hover:bg-gray-100"
                        } ${!d ? "cursor-default" : "cursor-pointer"}`}
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
                          next[idx] = {
                            ...next[idx],
                            checked: e.target.checked,
                          };
                          setUsuarios(next);
                          api()?.refetchEvents();
                          if (tab === "list") loadListRows();
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
        )}

        {tab === "list" && (
          <div className="bg-white rounded-md border shadow-sm">
            <div className="flex items-center justify-between px-4 py-3">
              {/* Filtros a la izquierda */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setListFilter("proximas")}
                  className={`px-3 py-1.5 rounded border text-sm flex items-center gap-1 ${
                    listFilter === "proximas"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "hover:bg-gray-50"
                  }`}
                  title="Citas futuras (no canceladas)"
                >
                  <i className="bx bx-time"></i> Próximas
                </button>
                <button
                  onClick={() => setListFilter("cancelado")}
                  className={`px-3 py-1.5 rounded border text-sm flex items-center gap-1 ${
                    listFilter === "cancelado"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "hover:bg-gray-50"
                  }`}
                  title="Solo canceladas"
                >
                  <i className="bx bx-x-circle"></i> Canceladas
                </button>
                <button
                  onClick={() => setListFilter("todos")}
                  className={`px-3 py-1.5 rounded border text-sm flex items-center gap-1 ${
                    listFilter === "todos"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "hover:bg-gray-50"
                  }`}
                  title="Todas las citas"
                >
                  <i className="bx bx-list-ul"></i> Todas
                </button>
              </div>

              {/* Orden + búsqueda a la derecha */}
              <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center gap-2">
                  <i className="bx bx-sort text-gray-600" />
                  <span className="text-xs text-gray-600">Ordenar por:</span>
                  <select
                    value={listSort}
                    onChange={(e) => setListSort(e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="createdAsc">
                      Fecha añadida - Ascendente
                    </option>
                    <option value="createdDesc">
                      Fecha añadida - Descendente
                    </option>
                    <option value="startAsc">
                      Hora de la cita - Ascendente
                    </option>
                    <option value="startDesc">
                      Hora de la cita - Descendente
                    </option>
                  </select>
                </div>

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por título"
                  className="border rounded px-3 py-1.5 text-sm w-72"
                />
              </div>
            </div>

            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-2 text-left w-10">#</th>
                    <th className="px-4 py-2 text-left">Título</th>
                    <th className="px-4 py-2 text-left">Invitados</th>
                    <th className="px-4 py-2 text-left">Estado</th>
                    <th className="px-4 py-2 text-left">Hora de la cita</th>
                    <th className="px-4 py-2 text-left">Calendario</th>
                    <th className="px-4 py-2 text-left">
                      Propietario de la cita
                    </th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {listLoading ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-6 text-center text-gray-500"
                      >
                        Cargando…
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      const now = new Date();
                      const asTime = (v) =>
                        v ? new Date(String(v).replace(" ", "T")).getTime() : 0;

                      // 1) Búsqueda
                      let rows = listRows.filter((r) =>
                        search
                          ? r.title.toLowerCase().includes(search.toLowerCase())
                          : true
                      );

                      // 2) Filtro: 'proximas' | 'cancelado' | 'todos'
                      rows = rows.filter((r) => {
                        if (listFilter === "proximas") {
                          return (
                            new Date(String(r.start).replace(" ", "T")) >=
                              now && r.status !== "Cancelado"
                          );
                        }
                        if (listFilter === "cancelado")
                          return r.status === "Cancelado";
                        return true; // todos
                      });

                      // 3) Orden: 'createdAsc' | 'createdDesc' | 'startAsc' | 'startDesc'
                      rows.sort((a, b) => {
                        if (listSort === "createdAsc")
                          return (
                            (a.created_at ? asTime(a.created_at) : a.id) -
                            (b.created_at ? asTime(b.created_at) : b.id)
                          );
                        if (listSort === "createdDesc")
                          return (
                            (b.created_at ? asTime(b.created_at) : b.id) -
                            (a.created_at ? asTime(a.created_at) : a.id)
                          );
                        if (listSort === "startDesc")
                          return asTime(b.start) - asTime(a.start);
                        // default: startAsc
                        return asTime(a.start) - asTime(b.start);
                      });

                      if (!rows.length) {
                        return (
                          <tr>
                            <td
                              colSpan={8}
                              className="px-4 py-6 text-center text-gray-500"
                            >
                              Sin resultados
                            </td>
                          </tr>
                        );
                      }

                      return rows.map((r, idx) => {
                        const owner =
                          usuarios.find((u) => u.id === r.assigned_user_id)
                            ?.nombre || "—";
                        const color = colorForUser(r.assigned_user_id);
                        const invitados =
                          r.invitees && r.invitees.length
                            ? r.invitees
                                .map((i) => i.name || i.email)
                                .join(", ")
                            : "—";

                        // Normaliza el link para que NO sea relativo (evita imporsuit.www...).
                        const linkHref = (() => {
                          const u = (r.meeting_url || "").trim();
                          if (!u) return null;
                          if (/^(https?:|mailto:|tel:)/i.test(u)) return u; // absoluto
                          if (/^www\./i.test(u)) return `https://${u}`; // www.*
                          if (/^[\w.-]+\.[a-z]{2,}([\/?#].*)?$/i.test(u))
                            // dominio.tld
                            return `https://${u}`;
                          return u; // dejar tal cual si es un código/ID
                        })();

                        return (
                          <tr key={r.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2">{idx + 1}</td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className="inline-block h-2.5 w-2.5 rounded-full"
                                  style={{ background: color }}
                                />
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{r.title}</span>
                                  {linkHref && (
                                    <a
                                      href={linkHref}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600"
                                      title="Abrir reunión"
                                    >
                                      🔗
                                    </a>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <span
                                className="truncate inline-block max-w-[320px]"
                                title={invitados}
                              >
                                {invitados}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <select
                                className="border rounded px-2 py-1 text-sm"
                                value={r.status}
                                onChange={(e) =>
                                  updateStatus(r.id, e.target.value)
                                }
                              >
                                {[
                                  "Agendado",
                                  "Confirmado",
                                  "Completado",
                                  "Cancelado",
                                  "Bloqueado",
                                ].map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              {fmtDateTime(r.start)}
                            </td>
                            <td className="px-4 py-2">{r.calendar_name}</td>
                            <td className="px-4 py-2">{owner}</td>
                            <td className="px-4 py-2 text-right">
                              <button
                                onClick={async () => {
                                  const form = await openApptModal({
                                    mode: "edit",
                                    initial: {
                                      title: r.title,
                                      status: r.status,
                                      date: new Date(r.start),
                                      start: new Date(r.start),
                                      end: r.end
                                        ? new Date(r.end)
                                        : new Date(
                                            new Date(r.start).getTime() +
                                              30 * 60000
                                          ),
                                      startTime: new Date(r.start)
                                        .toTimeString()
                                        .slice(0, 5),
                                      endTime: r.end
                                        ? new Date(r.end)
                                            .toTimeString()
                                            .slice(0, 5)
                                        : "00:00",
                                      assigned_user_id:
                                        r.assigned_user_id ?? "",
                                      location_text: "",
                                      meeting_url: r.meeting_url || "",
                                      description: "",
                                      invitees: r.invitees || [],
                                    },
                                    lockDateTime: false,
                                  });
                                  if (!form) return;
                                  try {
                                    await chatApi.patch(
                                      `/appointments/${r.id}`,
                                      {
                                        ...form,
                                        created_by_user_id: ownerUserId,
                                      }
                                    );
                                    Swal.fire(
                                      "Guardado",
                                      "Cita actualizada.",
                                      "success"
                                    );
                                    loadListRows();
                                    api()?.refetchEvents();
                                  } catch (err) {
                                    console.error(err);
                                    Swal.fire(
                                      "Error",
                                      "No se pudo actualizar.",
                                      "error"
                                    );
                                  }
                                }}
                                className="text-blue-600 hover:underline text-sm"
                              >
                                Editar
                              </button>
                            </td>
                          </tr>
                        );
                      });
                    })()
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "settings" && (
          <div className="bg-white rounded-md border p-6 text-sm text-gray-600">
            Aquí puede colocar futuras opciones de configuración del calendario.
          </div>
        )}
      </div>
    </div>
  );
}
