// src/components/MiniCalendario.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";
import {
  makeOpenApptModal,
  normalizeMeetingHref,
} from "../../pages/calendario/Modals";

const UNASSIGNED_COLOR = "#a78bfa";
const CANCELLED_COLOR = "#9ca3af";

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
function colorFromId(id) {
  const hue = (Number(id) * 47) % 360;
  return `hsl(${hue} 70% 65%)`;
}
function eventColor({ status, assigned, usuarios }) {
  const st = String(status || "").toLowerCase();
  if (st === "cancelado") return CANCELLED_COLOR;
  if (assigned == null || Number.isNaN(assigned)) return UNASSIGNED_COLOR;
  const u = usuarios.find((x) => x.id === assigned);
  return u?.color || "#3b82f6";
}

export default function MiniCalendario() {
  const calendarRef = useRef(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  // id_configuracion/usuario desde token/localStorage
  const [accountId, setAccountId] = useState(null);
  const [ownerUserId, setOwnerUserId] = useState(null);
  const [calendarId, setCalendarId] = useState(null);

  // usuarios y google
  const [usuarios, setUsuarios] = useState([]);
  const [googleLinked, setGoogleLinked] = useState(false);

  const bookedTz =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Guayaquil";

  // 0) token -> ids
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

  // 1) asegurar calendario
  useEffect(() => {
    if (!accountId) return;
    (async () => {
      try {
        const { data } = await chatApi.post("/calendars/ensure", {
          account_id: accountId,
          name:
            localStorage.getItem("nombre_configuracion") ||
            "Calendario principal",
          created_by: ownerUserId,
        });
        setCalendarId(data?.calendar?.id ?? null);
      } catch (e) {
        console.error("ensure calendar:", e);
      }
    })();
  }, [accountId, ownerUserId]);

  // 🔄 Cuando el calendarId esté listo, forzamos a recargar los eventos
  useEffect(() => {
    if (calendarId) {
      calendarRef.current?.getApi()?.refetchEvents();
    }
  }, [calendarId]);

  // (opcional) si quieres refrescar cuando llegan los usuarios (por colores)
  useEffect(() => {
    if (calendarId) {
      calendarRef.current?.getApi()?.refetchEvents();
    }
  }, [calendarId, usuarios]);

  // 2) usuarios reales
  useEffect(() => {
    if (!ownerUserId) return;
    (async () => {
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
        setUsuarios(mapped);
      } catch (e) {
        console.error("usuarios:", e);
      }
    })();
  }, [ownerUserId]);

  // 3) estado google (solo para permitir autogenerar Meet en el modal)
  useEffect(() => {
    if (!calendarId) return;
    (async () => {
      try {
        const { data } = await chatApi.get("/google/status", {
          params: { calendar_id: calendarId },
        });
        setGoogleLinked(!!data?.linked);
      } catch {
        setGoogleLinked(false);
      }
    })();
  }, [calendarId]);

  // 4) modal compartido
  const openApptModal = useMemo(
    () => makeOpenApptModal({ usuarios, googleLinked, bookedTz }),
    [usuarios, googleLinked, bookedTz]
  );

  // 5) fetch eventos (mes visible)
  const fetchEvents = useCallback(
    (info, success) => {
      if (!calendarId) return success([]);
      chatApi
        .get("/appointments", {
          params: {
            calendar_id: calendarId,
            start: info.start.toISOString(),
            end: info.end.toISOString(),
            include_unassigned: 1,
          },
        })
        .then(({ data }) => {
          const mapped = (data?.events ?? []).map((e) => {
            const assignedRaw =
              e?.extendedProps?.assigned_user_id ?? e?.assigned_user_id ?? null;
            const assigned = assignedRaw == null ? null : Number(assignedRaw);
            const status = e?.extendedProps?.status || e?.status || "";
            const bg = eventColor({ status, assigned, usuarios });
            return {
              ...e,
              backgroundColor: bg,
              borderColor: bg,
              extendedProps: { ...e.extendedProps, assigned_user_id: assigned },
            };
          });
          success(mapped);
        })
        .catch(() => success([]));
    },
    [calendarId, usuarios]
  );

  // 6) crear desde clic en día (09:00–09:30 por defecto)
  const handleDateClick = async (arg) => {
    if (!calendarId) return;
    const d = new Date(arg.dateStr + "T09:00:00");
    const e = new Date(arg.dateStr + "T09:30:00");

    const form = await openApptModal({
      mode: "create",
      initial: {
        date: d,
        start: d,
        end: e,
        startTime: "09:00",
        endTime: "09:30",
        assigned_user_id: usuarios[0]?.id ?? "",
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
      calendarRef.current?.getApi()?.refetchEvents();
    } catch (err) {
      const msg = err?.response?.data?.message || "No se pudo crear la cita.";
      Swal.fire("Error", msg, "error");
    }
  };

  // 7) editar
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
      const { data } = await chatApi.patch(`/appointments/${ev.id}`, {
        ...form,
        created_by_user_id: ownerUserId,
      });
      // feedback con link si vino del backend
      const meetingUrl =
        data?.appointment?.meeting_url ||
        data?.meeting_url ||
        data?.appointment?.extendedProps?.meeting_url ||
        null;

      calendarRef.current?.getApi()?.refetchEvents();

      if (meetingUrl) {
        const href = normalizeMeetingHref(meetingUrl);
        Swal.fire({
          icon: "success",
          title: "Cita actualizada",
          html: `
            <div class="text-left">
              <div class="mb-2 text-sm text-gray-600">Enlace de reunión</div>
              <div class="flex items-stretch gap-2">
                <div class="flex-1 px-3 py-2 rounded border bg-gray-50 break-all text-sm" id="meet-url-box">${href}</div>
                <button id="btn-copy-meet" class="inline-flex items-center justify-center px-3 rounded-md border hover:bg-gray-50 text-sm">Copiar</button>
              </div>
              <div id="copy-feedback" class="mt-2 text-xs text-green-600 hidden">¡Copiado!</div>
            </div>`,
          confirmButtonText: "Listo",
          didOpen: () => {
            const copyBtn = document.getElementById("btn-copy-meet");
            const fb = document.getElementById("copy-feedback");
            copyBtn?.addEventListener("click", async () => {
              try {
                await navigator.clipboard.writeText(href);
                fb?.classList.remove("hidden");
                setTimeout(() => fb?.classList.add("hidden"), 1200);
                const old = copyBtn.textContent;
                copyBtn.textContent = "Copiado ✓";
                setTimeout(() => (copyBtn.textContent = old), 1200);
              } catch {}
            });
          },
        });
      } else {
        Swal.fire("Guardado", "Cita actualizada.", "success");
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "No se pudo actualizar.";
      Swal.fire("Error", msg, "error");
    }
  };

  return (
    <div className="bg-[#12172e] rounded-lg shadow-md p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white font-semibold">Calendario</h3>
        <div className="flex gap-1">
          <button
            className="px-2 py-1 rounded border border-white/10 text-white/90 hover:bg-white/10"
            onClick={() => {
              const api = calendarRef.current?.getApi();
              api?.prev();
              setCurrentDate(new Date(api?.getDate() || new Date()));
            }}
          >
            ‹
          </button>
          <button
            className="px-2 py-1 rounded border border-white/10 text-white/90 hover:bg-white/10"
            onClick={() => {
              const api = calendarRef.current?.getApi();
              api?.next();
              setCurrentDate(new Date(api?.getDate() || new Date()));
            }}
          >
            ›
          </button>
        </div>
      </div>

      <div className="rounded-md overflow-hidden bg-white">
        <FullCalendar
          key={calendarId || "pending-cal"}
          ref={calendarRef}
          locale={esLocale}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          height={380}
          headerToolbar={false}
          selectable={false}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          events={fetchEvents}
          eventTextColor="#111827"
        />
      </div>
      <p className="mt-2 text-[11px] text-white/60">
        Click en un día para crear; click en un evento para editar.
      </p>
    </div>
  );
}
