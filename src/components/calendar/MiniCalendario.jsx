import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import listPlugin from "@fullcalendar/list";
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
        .join(""),
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

/* El panel del chat entra por la agenda del día: en ese ancho el mes no se
   lee, y lo que el asesor necesita mientras habla con el cliente es saber
   qué hora ofrecerle. Semana y mes quedan a un toque para lo demás. */
const HORA_DESDE = 8; // franja por defecto; se estira si hay citas fuera
const HORA_HASTA = 19;
const DIAS_TIRA = 7;
const DUR_NUEVA_MIN = 30;

const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
const sumarDias = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  x.setHours(0, 0, 0, 0);
  return x;
};
const hhmm = (d) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

export default function MiniCalendario() {
  const calendarRef = useRef(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  // 'dia' es propio (tira + huecos); los otros dos son FullCalendar
  const [modo, setModo] = useState("dia");
  const [tituloRango, setTituloRango] = useState("");
  const [inicioTira, setInicioTira] = useState(() => sumarDias(new Date(), 0));
  const [diaSel, setDiaSel] = useState(() => sumarDias(new Date(), 0));
  const [citas, setCitas] = useState([]);
  const [cargandoCitas, setCargandoCitas] = useState(false);

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
          { id_usuario: ownerUserId },
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
    [usuarios, googleLinked, bookedTz],
  );

  // 5) fetch eventos (mes visible)
  const fetchEvents = useCallback(
    (info, success) => {
      if (!calendarId) return success([]);
      const allUserIds = usuarios.map((u) => u.id);
      const params = {
        calendar_id: calendarId,
        start: info.start.toISOString(),
        end: info.end.toISOString(),
        include_unassigned: 1,
      };
      if (allUserIds.length) params.user_ids = allUserIds.join(",");

      chatApi
        .get("/appointments", { params })
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
    [calendarId, usuarios],
  );

  /* 5.b) Citas de la tira de días (modo 'dia'). Se piden los 7 días de una
     vez: así los puntitos de la tira y la agenda del día salen del mismo
     fetch y cambiar de día no vuelve a pegarle al servidor. */
  const recargarCitas = useCallback(async () => {
    if (!calendarId) return setCitas([]);
    const desde = new Date(inicioTira);
    const hasta = sumarDias(inicioTira, DIAS_TIRA);
    const params = {
      calendar_id: calendarId,
      start: desde.toISOString(),
      end: hasta.toISOString(),
      include_unassigned: 1,
    };
    const ids = usuarios.map((u) => u.id);
    if (ids.length) params.user_ids = ids.join(",");
    setCargandoCitas(true);
    try {
      const { data } = await chatApi.get("/appointments", { params });
      setCitas(
        (data?.events ?? []).map((e) => {
          const assignedRaw =
            e?.extendedProps?.assigned_user_id ?? e?.assigned_user_id ?? null;
          const assigned = assignedRaw == null ? null : Number(assignedRaw);
          const status = e?.extendedProps?.status || e?.status || "";
          return {
            id: e.id,
            title: e.title,
            inicio: new Date(e.start),
            fin: e.end ? new Date(e.end) : new Date(e.start),
            color: eventColor({ status, assigned, usuarios }),
            status,
            extendedProps: { ...e.extendedProps, assigned_user_id: assigned },
          };
        }),
      );
    } catch {
      setCitas([]);
    } finally {
      setCargandoCitas(false);
    }
  }, [calendarId, usuarios, inicioTira]);

  useEffect(() => {
    if (modo === "dia") recargarCitas();
  }, [modo, recargarCitas]);

  // 6) crear desde clic en día (09:00–09:30 por defecto). En las vistas de
  //    lista no hay grilla donde pinchar, así que el botón "Nueva cita" llama
  //    a esto con el día que se está viendo.
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
      const { data } = await chatApi.post("/appointments", {
        calendar_id: calendarId,
        created_by_user_id: ownerUserId,
        ...form,
      });

      calendarRef.current?.getApi()?.refetchEvents();
      recargarCitas();

      //intenta obtener la URL devuelta por el backend
      const meetingUrl =
        data?.event?.extendedProps?.meeting_url ||
        data?.event?.meeting_url ||
        data?.meeting_url ||
        data?.extendedProps?.meeting_url ||
        null;

      if (meetingUrl) {
        const href = normalizeMeetingHref(meetingUrl);
        Swal.fire({
          icon: "success",
          title: "Cita creada",
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
        Swal.fire("Listo", "Cita creada.", "success");
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "No se pudo crear la cita.";
      Swal.fire("Error", msg, "error");
    }
  };

  /* 6.b) Crear en un hueco concreto de la agenda del día */
  const crearEnHueco = async (fecha, hora) => {
    if (!calendarId) return;
    const d = new Date(fecha);
    d.setHours(hora, 0, 0, 0);
    const e = new Date(d.getTime() + DUR_NUEVA_MIN * 60000);

    const form = await openApptModal({
      mode: "create",
      initial: {
        date: d,
        start: d,
        end: e,
        startTime: hhmm(d),
        endTime: hhmm(e),
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
      recargarCitas();
      calendarRef.current?.getApi()?.refetchEvents();
      Swal.fire("Listo", "Cita creada.", "success");
    } catch (err) {
      const msg = err?.response?.data?.message || "No se pudo crear la cita.";
      Swal.fire("Error", msg, "error");
    }
  };

  // 7) editar
  const editarAppt = async (ev) => {
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
      recargarCitas();
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

  // FullCalendar entrega su propio objeto; la agenda del día llama directo.
  const handleEventClick = (clickInfo) => editarAppt(clickInfo.event);

  const irA = (accion) => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    if (accion === "prev") api.prev();
    else if (accion === "next") api.next();
    else api.today();
    setCurrentDate(new Date(api.getDate()));
  };

  const cambiarModo = (v) => {
    setModo(v);
    if (v !== "dia") calendarRef.current?.getApi()?.changeView(v);
  };

  // "Nueva cita" en el día que se está viendo
  const nuevaCita = () => {
    if (modo === "dia") return handleDateClick({ dateStr: ymd(diaSel) });
    const api = calendarRef.current?.getApi();
    const base = api?.getDate() || new Date();
    handleDateClick({ dateStr: ymd(base) });
  };

  const esLista = modo === "listWeek";

  // ── Datos de la vista de día ──
  const dias = useMemo(
    () => Array.from({ length: DIAS_TIRA }, (_, i) => sumarDias(inicioTira, i)),
    [inicioTira],
  );
  const citasPorDia = useMemo(() => {
    const m = new Map();
    for (const c of citas) {
      const k = ymd(c.inicio);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(c);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.inicio - b.inicio);
    return m;
  }, [citas]);

  const citasDelDia = citasPorDia.get(ymd(diaSel)) || [];

  /* Franja horaria del día: arranca en la jornada por defecto y se estira si
     hay citas antes o después, para que nunca quede una fuera de la vista. */
  const franja = useMemo(() => {
    let desde = HORA_DESDE;
    let hasta = HORA_HASTA;
    for (const c of citasDelDia) {
      desde = Math.min(desde, c.inicio.getHours());
      const finH = c.fin.getHours() + (c.fin.getMinutes() > 0 ? 1 : 0);
      hasta = Math.max(hasta, finH);
    }
    return Array.from({ length: Math.max(1, hasta - desde) }, (_, i) => desde + i);
  }, [citasDelDia]);

  // Qué cita ocupa cada hora (la que empieza ahí, o la que viene arrastrada)
  const ocupacion = (hora) => {
    const ini = new Date(diaSel);
    ini.setHours(hora, 0, 0, 0);
    const fin = new Date(ini.getTime() + 3600000);
    const solapa = citasDelDia.find((c) => c.inicio < fin && c.fin > ini);
    if (!solapa) return null;
    return { cita: solapa, empieza: solapa.inicio >= ini && solapa.inicio < fin };
  };
  const libresDelDia = franja.filter((h) => !ocupacion(h)).length;

  const hoyYmd = ymd(new Date());

  return (
    <div className="bg-[#12172e] rounded-lg shadow-md p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="text-white font-semibold text-sm">Calendario</h3>
        <button
          type="button"
          onClick={nuevaCita}
          disabled={!calendarId}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold transition disabled:opacity-40"
        >
          <i className="bx bx-plus text-sm" />
          Nueva cita
        </button>
      </div>

      {modo === "dia" ? (
        <>
          {/* Tira de días: un toque para cambiar de día, con un punto por
              cita para ver de un vistazo qué días están cargados. */}
          <div className="flex items-center gap-1 mb-2">
            <button
              type="button"
              aria-label="Días anteriores"
              className="w-6 h-[52px] shrink-0 grid place-items-center rounded-md border border-white/10 text-white/70 hover:bg-white/10"
              onClick={() => setInicioTira((d) => sumarDias(d, -DIAS_TIRA))}
            >
              ‹
            </button>
            <div className="flex-1 grid grid-cols-7 gap-1 min-w-0">
              {dias.map((d) => {
                const k = ymd(d);
                const n = (citasPorDia.get(k) || []).length;
                const activo = k === ymd(diaSel);
                const esHoy = k === hoyYmd;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setDiaSel(d)}
                    className={`h-[52px] rounded-md flex flex-col items-center justify-center gap-0.5 transition ${
                      activo
                        ? "bg-white text-slate-900"
                        : "bg-white/[0.06] text-white/80 hover:bg-white/15"
                    }`}
                  >
                    <span className="text-[9px] uppercase font-bold tracking-wide">
                      {esHoy
                        ? "Hoy"
                        : d.toLocaleDateString("es-EC", { weekday: "short" }).slice(0, 3)}
                    </span>
                    <span className="text-[13px] font-extrabold leading-none">
                      {d.getDate()}
                    </span>
                    <span className="flex items-center gap-[2px] h-[5px]">
                      {n > 0 &&
                        Array.from({ length: Math.min(n, 3) }).map((_, i) => (
                          <span
                            key={i}
                            className={`w-[4px] h-[4px] rounded-full ${
                              activo ? "bg-indigo-500" : "bg-emerald-400"
                            }`}
                          />
                        ))}
                      {n > 3 && (
                        <span className="text-[8px] font-bold leading-none">
                          +{n - 3}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              aria-label="Días siguientes"
              className="w-6 h-[52px] shrink-0 grid place-items-center rounded-md border border-white/10 text-white/70 hover:bg-white/10"
              onClick={() => setInicioTira((d) => sumarDias(d, DIAS_TIRA))}
            >
              ›
            </button>
          </div>

          {/* Resumen del día elegido */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[11px] text-white/80 font-semibold truncate first-letter:uppercase">
              {diaSel.toLocaleDateString("es-EC", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
            <span className="text-[10px] text-white/50 shrink-0">
              {citasDelDia.length} cita{citasDelDia.length === 1 ? "" : "s"} ·{" "}
              {libresDelDia} hueco{libresDelDia === 1 ? "" : "s"}
            </span>
          </div>

          {/* Agenda: horas ocupadas y huecos para agendar en un toque */}
          <div className="rounded-md bg-white max-h-[300px] overflow-y-auto divide-y divide-slate-100">
            {cargandoCitas && !citas.length ? (
              <p className="px-3 py-6 text-center text-[12px] text-slate-400">
                Cargando agenda…
              </p>
            ) : (
              franja.map((h) => {
                const oc = ocupacion(h);
                if (oc && !oc.empieza) {
                  return (
                    <div
                      key={h}
                      className="flex items-center gap-2 px-2.5 py-2 bg-slate-50/60"
                    >
                      <span className="w-[38px] text-[11px] text-slate-400 tabular-nums shrink-0">
                        {String(h).padStart(2, "0")}:00
                      </span>
                      <span className="text-[11px] text-slate-400">
                        ocupado
                      </span>
                    </div>
                  );
                }
                if (oc) {
                  const c = oc.cita;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() =>
                        editarAppt({
                          id: c.id,
                          title: c.title,
                          start: c.inicio,
                          end: c.fin,
                          extendedProps: c.extendedProps,
                        })
                      }
                      className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-slate-50 transition"
                    >
                      <span className="w-[38px] text-[11px] font-bold text-slate-700 tabular-nums shrink-0">
                        {hhmm(c.inicio)}
                      </span>
                      <span
                        className="w-1 self-stretch rounded-full shrink-0"
                        style={{ background: c.color }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12px] font-semibold text-slate-800 truncate">
                          {c.title}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          {hhmm(c.inicio)} – {hhmm(c.fin)}
                          {c.status ? ` · ${c.status}` : ""}
                        </span>
                      </span>
                    </button>
                  );
                }
                return (
                  <button
                    key={h}
                    type="button"
                    disabled={!calendarId}
                    onClick={() => crearEnHueco(diaSel, h)}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-left group hover:bg-indigo-50/60 transition disabled:opacity-50"
                  >
                    <span className="w-[38px] text-[11px] text-slate-400 tabular-nums shrink-0">
                      {String(h).padStart(2, "0")}:00
                    </span>
                    <span className="text-[11px] text-slate-400 flex-1">
                      libre
                    </span>
                    <span className="text-[11px] font-semibold text-indigo-600 opacity-0 group-hover:opacity-100 transition shrink-0">
                      + agendar
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex gap-1.5 mt-2">
            <button
              type="button"
              onClick={() => cambiarModo("listWeek")}
              className="flex-1 px-2 py-1.5 rounded-md bg-white/[0.06] hover:bg-white/15 text-white/80 text-[11px] font-semibold transition"
            >
              Ver semana
            </button>
            <button
              type="button"
              onClick={() => cambiarModo("dayGridMonth")}
              className="flex-1 px-2 py-1.5 rounded-md bg-white/[0.06] hover:bg-white/15 text-white/80 text-[11px] font-semibold transition"
            >
              Ver mes
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Rango visible + navegación (semana / mes) */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <button
              type="button"
              onClick={() => cambiarModo("dia")}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/80 hover:text-white shrink-0"
            >
              ‹ Volver al día
            </button>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                aria-label="Anterior"
                className="w-6 h-6 grid place-items-center rounded border border-white/10 text-white/90 hover:bg-white/10"
                onClick={() => irA("prev")}
              >
                ‹
              </button>
              <button
                type="button"
                className="px-2 h-6 rounded border border-white/10 text-white/90 hover:bg-white/10 text-[11px]"
                onClick={() => irA("today")}
              >
                Hoy
              </button>
              <button
                type="button"
                aria-label="Siguiente"
                className="w-6 h-6 grid place-items-center rounded border border-white/10 text-white/90 hover:bg-white/10"
                onClick={() => irA("next")}
              >
                ›
              </button>
            </div>
          </div>
          <p className="text-[11px] text-white/70 font-medium mb-2 truncate first-letter:uppercase">
            {tituloRango}
          </p>
        </>
      )}

      {/* En lista la altura se adapta al contenido (con tope); el mes mantiene
          su grilla fija para que no se deforme. */}
      {/* Compactado para el ancho del panel del chat: FullCalendar viene con
          tipografías y paddings pensados para pantalla completa y aquí se
          desbordaban. */}
      <style>{`
        .mini-cal .fc { font-size: 12px; }
        .mini-cal .fc .fc-list-day-cushion { padding: 6px 8px; background: #f1f5f9; }
        .mini-cal .fc .fc-list-day-text { font-size: 11px; font-weight: 700; color: #334155; }
        .mini-cal .fc .fc-list-event td { padding: 7px 8px; }
        .mini-cal .fc .fc-list-event-time { white-space: nowrap; color: #475569; font-variant-numeric: tabular-nums; }
        .mini-cal .fc .fc-list-event-title { color: #0f172a; }
        .mini-cal .fc .fc-list-empty { padding: 22px 10px; background: #fff; color: #94a3b8; font-size: 12px; }
        .mini-cal .fc .fc-daygrid-day-number { font-size: 11px; padding: 2px 4px; }
        .mini-cal .fc .fc-daygrid-event { font-size: 10px; padding: 0 2px; }
        .mini-cal .fc .fc-col-header-cell-cushion { font-size: 10px; padding: 4px 2px; }
      `}</style>
      {/* El FullCalendar se monta siempre (mantiene su estado y la caché de
          eventos) pero se oculta en modo día, donde manda la agenda propia. */}
      <div
        className={`mini-cal rounded-md overflow-hidden bg-white ${
          modo === "dia" ? "hidden" : ""
        } ${esLista ? "max-h-[320px] overflow-y-auto" : ""}`}
      >
        <FullCalendar
          key={calendarId || "pending-cal"}
          ref={calendarRef}
          locale={esLocale}
          plugins={[dayGridPlugin, listPlugin, interactionPlugin]}
          initialView={modo === "dia" ? "listWeek" : modo}
          height={esLista ? "auto" : 380}
          headerToolbar={false}
          selectable={false}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          events={fetchEvents}
          datesSet={(info) => setTituloRango(info.view.title)}
          noEventsText="Sin citas para este día"
          eventTextColor="#111827"
          eventClassNames={() => ["cursor-pointer"]}
          listDayFormat={{ weekday: "long", day: "numeric", month: "long" }}
          listDaySideFormat={false}
        />
      </div>
      <p className="mt-2 text-[11px] text-white/60">
        {modo === "dia"
          ? "Toca un hueco para agendar ahí, o una cita para editarla."
          : esLista
            ? "Toca una cita para editarla, o «Nueva cita» para agendar."
            : "Click en un día para crear; click en un evento para editar."}
      </p>
    </div>
  );
}
