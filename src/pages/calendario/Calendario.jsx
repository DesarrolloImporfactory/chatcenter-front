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
const UNASSIGNED_COLOR = "#a78bfa"; // lila suave p/ sin asignar
const CANCELLED_COLOR = "#9ca3af"; // gris p/ canceladas

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

function normalizeMeetingHref(u) {
  const s = String(u || "").trim();
  if (!s) return null;
  if (/^(https?:|mailto:|tel:)/i.test(s)) return s;
  if (/^www\./i.test(s)) return `https://${s}`;
  if (/^[\w.-]+\.[a-z]{2,}([\/?#].*)?$/i.test(s)) return `https://${s}`;
  return s;
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

  //GoogleAuth
  const [googleLinked, setGoogleLinked] = useState(false);
  const [googleEmail, setGoogleEmail] = useState(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [includeUnassigned, setIncludeUnassigned] = useState(true);

  const syncNow = useCallback(
    async (silent = false) => {
      if (!calendarId) return;
      try {
        setSyncing(true);
        await chatApi.post("/google/sync/pull", { calendar_id: calendarId });
        api()?.refetchEvents();
        if (!silent) {
          Swal.fire(
            "Sincronizado",
            "Se importaron cambios de Google.",
            "success"
          );
        }
      } catch (e) {
        console.error(e);
        if (!silent) {
          Swal.fire("Error", "No se pudo sincronizar con Google.", "error");
        }
      } finally {
        setSyncing(false);
      }
    },
    [calendarId]
  );

  const checkGoogleStatus = useCallback(async (calId) => {
    try {
      setGoogleLoading(true);
      if (!calId) {
        setGoogleLinked(false);
        setGoogleEmail(null);
        return;
      }
      const { data } = await chatApi.get("/google/status", {
        params: { calendar_id: calId },
      });
      setGoogleLinked(!!data?.linked);
      setGoogleEmail(data?.google_email || null);
    } catch (e) {
      console.error("google/status error:", e);
      setGoogleLinked(false);
      setGoogleEmail(null);
    } finally {
      setGoogleLoading(false);
    }
  }, []);

  useEffect(() => {
    if (calendarId) checkGoogleStatus(calendarId);
  }, [calendarId, checkGoogleStatus]);

  const connectGoogle = async () => {
    try {
      if (!calendarId) {
        Swal.fire("Calendario", "Aún no está listo el calendario.", "info");
        return;
      }
      const { data } = await chatApi.get("/google/auth-url", {
        params: { calendar_id: calendarId },
      });
      const authUrl = data?.url;
      if (!authUrl) throw new Error("URL no recibida");

      const w = window.open(authUrl, "gcalOAuth", "width=520,height=680");
      if (!w) {
        window.location.href = authUrl;
        return;
      }

      const timer = setInterval(async () => {
        if (w.closed) {
          clearInterval(timer);
          // Revalidar contra el calendario actual
          const { data: st } = await chatApi.get("/google/status", {
            params: { calendar_id: calendarId },
          });
          setGoogleLinked(!!st?.linked);
          setGoogleEmail(st?.google_email || null);
          if (st?.linked) {
            await syncNow(true); // pull silencioso inmediato
            Swal.fire(
              "Listo",
              "Google Calendar vinculado y sincronizado.",
              "success"
            );
          } else {
            Swal.fire("Cancelado", "No se completó la vinculación.", "info");
          }
        }
      }, 800);
    } catch (e) {
      console.error(e);
      Swal.fire(
        "Error",
        "No se pudo iniciar la vinculación con Google.",
        "error"
      );
    }
  };

  const unlinkGoogle = async () => {
    const ok = (
      await Swal.fire({
        title: "Desvincular Google",
        text: "Se eliminarán las credenciales guardadas para este calendario.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, desvincular",
        cancelButtonText: "Cancelar",
      })
    ).isConfirmed;

    if (!ok) return;

    try {
      await chatApi.post("/google/unlink", { calendar_id: calendarId });
      setGoogleLinked(false);
      setGoogleEmail(null);
      Swal.fire("Listo", "Vinculación eliminada.", "success");
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No se pudo desvincular.", "error");
    }
  };

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

  function eventColor({ status, assigned }) {
    const st = String(status || "").toLowerCase();
    if (st === "cancelado") return CANCELLED_COLOR;
    if (assigned == null || Number.isNaN(assigned)) return UNASSIGNED_COLOR;
    return colorForUser(assigned);
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
        <label>Título de la cita <span class="req">*</span></label>
        <input id="f-title" class="swal2-input" placeholder="Llamada con cliente"
               value="${i.title.replaceAll('"', "&quot;")}" />
      </div>
      <div class="swal-row grid2">
        <div>
          <label>Fecha <span class="req">*</span></label>
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
          <label>Hora inicio <span class="req">*</span></label>
          <input id="f-start" type="time" class="swal2-input" value="${
            i.startTime
          }" ${disabledAttr}/>
        </div>
        <div>
          <label>Hora fin <span class="req">*</span></label>
          <input id="f-end" type="time" class="swal2-input" value="${
            i.endTime
          }" ${disabledAttr}/>
        </div>
      </div>
      <div class="swal-row grid2">
        <div>
          <label>Miembro del equipo</label>
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
        <div class="section-header">
          <label>URL de reunión</label>
          <div class="flex items-center gap-2">
            <button type="button" id="btn-gen-meet" class="btn-url-meet" title="Generar enlace de Google Meet">
              <span class="inline-flex items-center gap-2">
                <span id="btn-gen-meet-icon" class="inline-flex items-center justify-center w-5 h-5"></span>
                <span>Generar automáticamente</span>
              </span>
            </button>
            <button type="button" id="btn-clear-meet" class="btn-url-cancel" title="Cancelar" style="display:none;">
              <i class="bx bx-eraser"></i>
            </button>
          </div>
        </div>

        <input
          id="f-meet"
          class="swal2-input"
          placeholder="https://meet..."
          value="${i.meeting_url.replaceAll('"', "&quot;")}"
        />
        <div id="meet-hint" class="text-xs text-gray-600 mt-1" style="display:none;">
          Se generará automáticamente al guardar (Google Meet).
        </div>
        <!-- bandera oculta para indicar autogeneración -->
        <input id="f-meet-autogen" type="hidden" value="0" />
      </div>
      
      <div class="swal-row">
        <div class="section-header">
          <label>Invitados <span class="req">*</span></label>
          <button type="button" id="btn-add-invitee" class="btn-add-member" title="Agregar miembros">
            <i class="bx bx-user-plus"></i>
            <span>Añadir invitados</span>
          </button>
        </div>
        <div id="invitees-scroll">
          <div id="invitees-list" class="space-y-2 w-full"></div>
        </div>
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
      width: 780,
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

        // === Google Meet UI ===
        const DEFAULT_PLACEHOLDER = "https://meet...";
        const btnIconSlot = document.getElementById("btn-gen-meet-icon");
        if (btnIconSlot) {
          btnIconSlot.innerHTML = `
          <svg viewBox="0 0 128 128" width="20" height="20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <rect x="8" y="12" width="112" height="108" rx="16" ry="16" fill="#fff" stroke="#dadce0" stroke-width="4"/>
            <rect x="8" y="12" width="112" height="28" rx="16" ry="16" fill="#1a73e8"/>
            <rect x="28" y="4" width="16" height="24" rx="4" fill="#1a73e8"/>
            <rect x="84" y="4" width="16" height="24" rx="4" fill="#1a73e8"/>
            <rect x="20" y="48" width="88" height="28" fill="#e8f0fe"/>
            <path d="M20 88h20v20H20z" fill="#34a853"/>
            <path d="M54 88h20v20H54z" fill="#fbbc05"/>
            <path d="M88 88h20v20H88z" fill="#ea4335"/>
          </svg>
        `;
        }

        const $iMeet = document.getElementById("f-meet");
        const $hint = document.getElementById("meet-hint");
        const $btnGen = document.getElementById("btn-gen-meet");
        const $btnClr = document.getElementById("btn-clear-meet");
        const $autogen = document.getElementById("f-meet-autogen");

        function refreshMeetUI() {
          const hasVal = !!($iMeet?.value || "").trim();
          const genOn = $autogen?.value === "1";
          if ($btnClr) $btnClr.style.display = hasVal || genOn ? "" : "none";
          if ($hint) $hint.style.display = genOn ? "" : "none";
        }

        function applyAutogen(on) {
          if (!$iMeet || !$autogen) return;
          $autogen.value = on ? "1" : "0";
          if (on) {
            // sin confusiones: limpiamos el campo y lo bloqueamos
            $iMeet.value = "";
            $iMeet.placeholder = "Se generará al guardar…";
            $iMeet.setAttribute("disabled", "disabled");
            $iMeet.classList.add("is-disabled");
          } else {
            // restaurar estado manual
            $iMeet.removeAttribute("disabled");
            $iMeet.classList.remove("is-disabled");
            $iMeet.placeholder = DEFAULT_PLACEHOLDER;
          }
          refreshMeetUI();
        }

        // Click en "Generar automáticamente"
        $btnGen?.addEventListener("click", () => {
          if (!googleLinked) {
            Swal.fire(
              "Google no vinculado",
              "Conecta Google Calendar para generar un Meet.",
              "info"
            );
            return;
          }
          applyAutogen(true);
        });

        // Click en limpiar/cancelar
        $btnClr?.addEventListener("click", () => {
          applyAutogen(false);
          $iMeet.value = "";
        });

        // Si el usuario escribe a mano, cancelar autogen
        $iMeet?.addEventListener("input", () => {
          if (($iMeet.value || "").trim()) applyAutogen(false);
        });

        // Estado inicial (por si viene con valor)
        if ($iMeet && $iMeet.value.trim()) {
          applyAutogen(false);
        } else {
          $iMeet.placeholder = DEFAULT_PLACEHOLDER;
          refreshMeetUI();
        }
      },
      preConfirm: () => {
        const $ = (id) => document.getElementById(id);
        const get = (id) => $(id)?.value?.trim();

        // --- limpiar estados previos ---
        ["f-title", "f-date", "f-start", "f-end"].forEach((id) =>
          $(id)?.classList.remove("invalid")
        );
        document
          .querySelectorAll("#invitees-list .swal2-input")
          .forEach((el) => el.classList.remove("invalid"));

        const title = get("f-title");
        const dateStr = get("f-date");
        const startStr = get("f-start");
        const endStr = get("f-end");
        const status = get("f-status") || "Agendado";
        const assigned = get("f-assigned");
        const location = get("f-location") || null;
        const meetRaw = get("f-meet") || null;
        const desc = get("f-desc") || null;

        // helper para fallar con foco/estilo
        const fail = (msg, focusId) => {
          if (focusId) $(focusId)?.classList.add("invalid");
          Swal.showValidationMessage(msg);
          return false;
        };

        // ===== Validaciones requeridas =====
        if (!title) return fail("El título es obligatorio.", "f-title");

        let startISO, endISO;

        if (lockDateTime) {
          // si está bloqueado, tomamos el rango que vino del calendario
          startISO = toLocalOffsetISO(initial.start);
          endISO = toLocalOffsetISO(initial.end);
        } else {
          if (!dateStr) return fail("La fecha es obligatoria.", "f-date");
          if (!startStr)
            return fail("La hora de inicio es obligatoria.", "f-start");
          if (!endStr) return fail("La hora de fin es obligatoria.", "f-end");

          // parsear y validar rango
          const [sh, sm] = (startStr || "").split(":").map(Number);
          const [eh, em] = (endStr || "").split(":").map(Number);

          const s = new Date(dateStr + "T00:00:00");
          s.setHours(sh || 0, sm || 0, 0, 0);

          const e = new Date(dateStr + "T00:00:00");
          e.setHours(eh || 0, em || 0, 0, 0);

          if (!(s instanceof Date) || isNaN(+s))
            return fail("Fecha/hora de inicio inválida.", "f-start");
          if (!(e instanceof Date) || isNaN(+e))
            return fail("Fecha/hora de fin inválida.", "f-end");
          if (e <= s)
            return fail(
              "La hora fin debe ser mayor que la hora inicio.",
              "f-end"
            );

          startISO = toLocalOffsetISO(s);
          endISO = toLocalOffsetISO(e);
        }

        // Invitados: al menos 1 con correo válido
        const inviteeRows = Array.from(
          document.querySelectorAll("#invitees-list .invitee-row")
        );
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // tomar datos y validar
        let invitees = inviteeRows.map((r) => {
          const [nameEl, emailEl, phoneEl] = r.querySelectorAll("input");
          return {
            name: nameEl?.value?.trim() || "",
            email: emailEl?.value?.trim() || "",
            phone: phoneEl?.value?.trim() || "",
            _emailEl: emailEl,
          };
        });

        // filtrar filas sin nada (si existieran)
        invitees = invitees.filter((inv) => inv.name || inv.email || inv.phone);

        // requerimos al menos una fila con email válido
        const withEmail = invitees.filter((inv) => inv.email);
        if (withEmail.length === 0) {
          // marcar el primer campo email visible
          invitees[0]?._emailEl?.classList.add("invalid");
          return fail(
            "Agrega al menos un invitado con correo.",
            invitees[0]?._emailEl?.id
          );
        }

        // validar formato de todos los emails presentes
        for (const inv of withEmail) {
          if (!emailRegex.test(inv.email)) {
            inv._emailEl?.classList.add("invalid");
            return fail(`Correo inválido: ${inv.email}`, inv._emailEl?.id);
          }
        }

        // deduplicar por email (case-insensitive)
        const seen = new Set();
        invitees = withEmail
          .filter((inv) => {
            const key = inv.email.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .map(({ _emailEl, ...rest }) => rest); // quitar referencia interna

        const autogen =
          document.getElementById("f-meet-autogen")?.value === "1";

        // normalizar URL manual si NO hay autogen
        const meet = (() => {
          const u = (meetRaw || "").trim();
          if (!u) return null;
          if (/^(https?:|mailto:|tel:)/i.test(u)) return u;
          if (/^www\./i.test(u)) return `https://${u}`;
          if (/^[\w.-]+\.[a-z]{2,}([\/?#].*)?$/i.test(u)) return `https://${u}`;
          return u;
        })();
        // Si todo OK, devolvemos payload
        return {
          title,
          status,
          assigned_user_id: assigned ? Number(assigned) : null,
          location_text: location,
          meeting_url: autogen ? null : meet,
          description: desc,
          start: startISO,
          end: endISO,
          booked_tz: bookedTz,
          invitees,
          create_meet: autogen,
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
        include_unassigned: includeUnassigned ? 1 : 0,
      };
      if (selectedUserIds.length) params.user_ids = selectedUserIds.join(",");

      chatApi
        .get("/appointments", { params })
        .then(({ data }) => {
          const mapped = (data?.events ?? []).map((e) => {
            const assignedRaw =
              e?.extendedProps?.assigned_user_id ?? e?.assigned_user_id ?? null;
            const assigned = assignedRaw == null ? null : Number(assignedRaw);
            const status = e?.extendedProps?.status || e?.status || "";

            const bg = eventColor({ status, assigned });

            return {
              ...e,
              backgroundColor: bg,
              borderColor: bg,
              // classes para estilos extra
              classNames: [
                String(status).toLowerCase() === "cancelado"
                  ? "is-cancelled"
                  : null,
                assigned == null ? "is-unassigned" : null,
              ].filter(Boolean),
              // normaliza assigned en extendedProps (evita NaN)
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
    [calendarId, selectedUserIds, usuarios, includeUnassigned]
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
      const { data } = await chatApi.post("/appointments", {
        calendar_id: calendarId,
        created_by_user_id: ownerUserId,
        ...form,
      });

      //intenta obtener la URL devuelta por el backend
      const meetingUrl =
        data?.event?.extendedProps?.meeting_url ||
        data?.event?.meeting_url ||
        data?.meeting_url ||
        data?.extendedProps?.meeting_url ||
        null;
      //refrescar UI

      Swal.close();
      api()?.refetchEvents();
      if (tab === "list") loadListRows();

      //modal con la url y boton de copiar
      if (meetingUrl) {
        Swal.fire({
          icon: "success",
          title: "Cita creada",
          html: `
      <div class="text-left">
        <div class="mb-2 text-sm text-gray-600">Enlace de reunión</div>

        <div class="flex items-stretch gap-2">
          <div class="flex-1 px-3 py-2 rounded border bg-gray-50 break-all text-sm" id="meet-url-box">
            ${meetingUrl}
          </div>
          
          <button id="btn-copy-meet"
                  class="inline-flex items-center justify-center px-3 rounded-md border hover:bg-gray-50 text-sm">
            Copiar
          </button>
        </div>

        <div id="copy-feedback" class="mt-2 text-xs text-green-600 hidden">¡Copiado!</div>
      </div>`,
          showConfirmButton: true,
          confirmButtonText: "Listo",
          customClass: {
            confirmButton:
              "px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700",
            popup: "swal2-responsive",
          },
          didOpen: () => {
            const copyBtn = document.getElementById("btn-copy-meet");
            const fb = document.getElementById("copy-feedback");
            copyBtn?.addEventListener("click", async () => {
              try {
                await navigator.clipboard.writeText(meetingUrl);
                if (fb) {
                  fb.classList.remove("hidden");
                  setTimeout(() => fb.classList.add("hidden"), 1200);
                }
                // feedback en el propio botón
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
      console.error(err);
      const msg = err?.response?.data?.message || "No se pudo crear la cita.";
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

    const oldUrl = props.meeting_url || null;

    // 1) Hacemos el PATCH y atrapamos SOLO errores de red/backend aquí.
    let data;
    try {
      const resp = await chatApi.patch(`/appointments/${ev.id}`, {
        ...form,
        created_by_user_id: ownerUserId,
      });
      data = resp?.data || {};
    } catch (err) {
      console.error("PATCH error:", err);
      const msg = err?.response?.data?.message || "No se pudo actualizar.";
      return Swal.fire("Error", msg, "error");
    }

    // 2) Lógica de UI (si algo falla aquí, NO digamos que falló el update)
    try {
      // extraer url nueva (cubre varias formas de respuesta)
      const newUrl =
        data?.appointment?.meeting_url ||
        data?.meeting_url ||
        data?.appointment?.extendedProps?.meeting_url ||
        null;

      // reflejar cambios en el evento actual
      ev.setExtendedProp("meeting_url", newUrl || null);
      if (form.status) ev.setExtendedProp("status", form.status);
      if (form.assigned_user_id !== undefined) {
        ev.setExtendedProp("assigned_user_id", form.assigned_user_id);
      }

      // refrescos
      api()?.refetchEvents();
      if (tab === "list") loadListRows();

      // feedback:
      // - si hay nuevo link (o cambió), usamos el modal estilizado como el de crear
      // - si no, un "Guardado" simple
      if (newUrl && newUrl !== oldUrl) {
        const meetingUrl = normalizeMeetingHref(newUrl);
        Swal.fire({
          icon: "success",
          title: "Cita actualizada",
          html: `
          <div class="text-left">
            <div class="mb-2 text-sm text-gray-600">Enlace de reunión</div>

            <div class="flex items-stretch gap-2">
              <div class="flex-1 px-3 py-2 rounded border bg-gray-50 break-all text-sm" id="meet-url-box">
                ${meetingUrl}
              </div>
              
              <button id="btn-copy-meet"
                class="inline-flex items-center justify-center px-3 rounded-md border hover:bg-gray-50 text-sm">
                Copiar
              </button>
            </div>

            <div id="copy-feedback" class="mt-2 text-xs text-green-600 hidden">¡Copiado!</div>
          </div>`,
          showConfirmButton: true,
          confirmButtonText: "Listo",
          customClass: {
            confirmButton:
              "px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700",
            popup: "swal2-responsive",
          },
          didOpen: () => {
            const copyBtn = document.getElementById("btn-copy-meet");
            const fb = document.getElementById("copy-feedback");
            copyBtn?.addEventListener("click", async () => {
              try {
                await navigator.clipboard.writeText(meetingUrl);
                if (fb) {
                  fb.classList.remove("hidden");
                  setTimeout(() => fb.classList.add("hidden"), 1200);
                }
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
    } catch (uiErr) {
      console.error("UI refresh error:", uiErr);
      Swal.fire(
        "Actualizado",
        "La cita se actualizó, pero hubo un problema al refrescar la interfaz.",
        "warning"
      );
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
        if (includeUnassigned) params.include_unassigned = 1;

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
    [calendarId, selectedUserIds, currentDate, listFilter, includeUnassigned]
  );

  // Cargar lista cuando cambio a pestaña "list" o cambian filtros
  useEffect(() => {
    if (tab === "list") loadListRows();
  }, [tab, loadListRows]);

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
  // Icono simple "Google Calendar" en SVG (sin dependencias)
  const GoogleCalendarIcon = ({ className = "w-5 h-5" }) => (
    <svg
      viewBox="0 0 128 128"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {/* cuerpo */}
      <rect
        x="8"
        y="12"
        width="112"
        height="108"
        rx="16"
        ry="16"
        fill="#fff"
        stroke="#dadce0"
        strokeWidth="4"
      />
      {/* barra superior azul */}
      <rect
        x="8"
        y="12"
        width="112"
        height="28"
        rx="16"
        ry="16"
        fill="#1a73e8"
      />
      {/* anillas */}
      <rect x="28" y="4" width="16" height="24" rx="4" fill="#1a73e8" />
      <rect x="84" y="4" width="16" height="24" rx="4" fill="#1a73e8" />
      {/* franja clara */}
      <rect x="20" y="48" width="88" height="28" fill="#e8f0fe" />
      {/* 3 bloques de color abajo (Google vibes) */}
      <path d="M20 88h20v20H20z" fill="#34a853" />
      <path d="M54 88h20v20H54z" fill="#fbbc05" />
      <path d="M88 88h20v20H88z" fill="#ea4335" />
    </svg>
  );

  // Spinner minimalista para el estado de carga
  const Spinner = ({ className = "w-4 h-4" }) => (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24">
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="4"
        fill="none"
      />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );

  // ====== UI ======
  return (
    <div className="p-0">
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

                    {/* >>> AQUÍ: Google connect / unlink <<< */}
                    {googleLinked ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded bg-green-50 text-green-700">
                          Google Calendar conectado
                          {googleEmail ? ` (${googleEmail})` : ""}
                        </span>

                        <button
                          onClick={() => syncNow(false)}
                          disabled={syncing}
                          className="px-2 py-1 rounded border text-xs hover:bg-gray-50 inline-flex items-center gap-1"
                          title="Forzar importación desde Google ahora"
                        >
                          {syncing ? <Spinner /> : "⟳"} Sincronizar ahora
                        </button>

                        <button
                          onClick={unlinkGoogle}
                          disabled={googleLoading}
                          className="px-2 py-1 rounded border text-xs hover:bg-gray-50"
                          title="Quitar vinculación"
                        >
                          Desvincular
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={connectGoogle}
                        disabled={googleLoading || !calendarId}
                        className={`group inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm font-medium transition
                        ${
                          googleLoading || !calendarId
                            ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                            : "bg-white text-gray-800 border-gray-300 hover:border-blue-400 hover:shadow-sm"
                        }`}
                        title={
                          !calendarId
                            ? "Asegura primero un calendario"
                            : "Conectar con Google Calendar"
                        }
                      >
                        {googleLoading ? (
                          <Spinner />
                        ) : (
                          <GoogleCalendarIcon className="w-5 h-5" />
                        )}
                        <span>Conectar con Google Calendar</span>
                        {!googleLoading && (
                          <span className="hidden sm:inline text-[11px] px-2 py-[2px] rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                            recomendado
                          </span>
                        )}
                      </button>
                    )}

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
                      },
                      listDay: {
                        buttonText: "Día (lista)",
                      },
                    }}
                    eventDidMount={(info) => {
                      // no insertamos nada en vistas tipo lista
                      if (info.view.type.startsWith("list")) return;

                      const href = normalizeMeetingHref(
                        info.event.extendedProps.meeting_url
                      );
                      if (!href) return;

                      // evita duplicados si el evento se vuelve a renderizar
                      const titleEl = info.el.querySelector(".fc-event-title");
                      if (!titleEl) return;
                      if (titleEl.querySelector(".fc-meet-link")) return;

                      const link = document.createElement("a");
                      link.href = href;
                      link.target = "_blank";
                      link.rel = "noopener noreferrer";
                      link.className = "fc-meet-link";
                      link.title = "Abrir reunión";
                      link.textContent = "🔗";

                      // 👇 clave para NO abrir el modal de editar:
                      link.addEventListener("click", (e) => {
                        e.stopPropagation();
                      });

                      titleEl.prepend(link);
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
                <div className="mt-3 pt-3 border-t">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={includeUnassigned}
                      onChange={(e) => {
                        setIncludeUnassigned(e.target.checked);
                        api()?.refetchEvents();
                        if (tab === "list") loadListRows();
                      }}
                    />
                    <span>Incluir “Sin asignar”</span>
                  </label>
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
                        const linkHref = normalizeMeetingHref(r.meeting_url);

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
