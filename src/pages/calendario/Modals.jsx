// src/calendario/modals.js
import Swal from "sweetalert2";

// helpers mínimos que ya usas en Calendario.jsx
export function toLocalOffsetISO(d) {
  const pad = (n) => String(n).padStart(2, "0");
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const hh = pad(Math.floor(Math.abs(off) / 60));
  const mm = pad(Math.abs(off) % 60);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:00${sign}${hh}:${mm}`;
}
export function normalizeMeetingHref(u) {
  const s = String(u || "").trim();
  if (!s) return null;
  if (/^(https?:|mailto:|tel:)/i.test(s)) return s;
  if (/^www\./i.test(s)) return `https://${s}`;
  if (/^[\w.-]+\.[a-z]{2,}([\/?#].*)?$/i.test(s)) return `https://${s}`;
  return s;
}

export function makeOpenApptModal({ usuarios, googleLinked, bookedTz }) {
  return async function openApptModal({ mode, initial, lockDateTime = false }) {
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
        <input id="f-meet" class="swal2-input" placeholder="https://meet..." value="${i.meeting_url.replaceAll(
          '"',
          "&quot;"
        )}"/>
        <div id="meet-hint" class="text-xs text-gray-600 mt-1" style="display:none;">Se generará automáticamente al guardar (Google Meet).</div>
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

    const inviteeRowTpl = ({ name = "", email = "", phone = "" } = {}) => `
      <div class="flex gap-2 items-center invitee-row">
        <input placeholder="Nombre"  class="swal2-input flex-1" value="${name}">
        <input placeholder="Correo*" class="swal2-input flex-1" value="${email}">
        <input placeholder="Tel."    class="swal2-input flex-1" value="${phone}">
        <button type="button" class="btn-del-inv text-red-600">✕</button>
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

        const btnIconSlot = document.getElementById("btn-gen-meet-icon");
        if (btnIconSlot) {
          btnIconSlot.innerHTML = `<svg viewBox="0 0 128 128" width="20" height="20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <rect x="8" y="12" width="112" height="108" rx="16" ry="16" fill="#fff" stroke="#dadce0" stroke-width="4"/>
            <rect x="8" y="12" width="112" height="28" rx="16" ry="16" fill="#1a73e8"/>
            <rect x="28" y="4" width="16" height="24" rx="4" fill="#1a73e8"/>
            <rect x="84" y="4" width="16" height="24" rx="4" fill="#1a73e8"/>
            <rect x="20" y="48" width="88" height="28" fill="#e8f0fe"/>
            <path d="M20 88h20v20H20z" fill="#34a853"/>
            <path d="M54 88h20v20H54z" fill="#fbbc05"/>
            <path d="M88 88h20v20H88z" fill="#ea4335"/>
          </svg>`;
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
            $iMeet.value = "";
            $iMeet.placeholder = "Se generará al guardar…";
            $iMeet.setAttribute("disabled", "disabled");
            $iMeet.classList.add("is-disabled");
          } else {
            $iMeet.removeAttribute("disabled");
            $iMeet.classList.remove("is-disabled");
            $iMeet.placeholder = "https://meet...";
          }
          refreshMeetUI();
        }
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
        $btnClr?.addEventListener("click", () => {
          applyAutogen(false);
          $iMeet.value = "";
        });
        $iMeet?.addEventListener("input", () => {
          if (($iMeet.value || "").trim()) applyAutogen(false);
        });
        if ($iMeet && $iMeet.value.trim()) {
          applyAutogen(false);
        } else {
          $iMeet.placeholder = "https://meet...";
          refreshMeetUI();
        }
      },
      preConfirm: () => {
        const $ = (id) => document.getElementById(id);
        const get = (id) => $(id)?.value?.trim();
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

        const fail = (msg, focusId) => {
          if (focusId) $(focusId)?.classList.add("invalid");
          Swal.showValidationMessage(msg);
          return false;
        };

        if (!title) return fail("El título es obligatorio.", "f-title");

        let startISO, endISO;
        if (lockDateTime) {
          startISO = toLocalOffsetISO(initial.start);
          endISO = toLocalOffsetISO(initial.end);
        } else {
          if (!dateStr) return fail("La fecha es obligatoria.", "f-date");
          if (!startStr)
            return fail("La hora de inicio es obligatoria.", "f-start");
          if (!endStr) return fail("La hora de fin es obligatoria.", "f-end");

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

        // Invitados: al menos 1 con email válido (igual que tu modal)
        const inviteeRows = Array.from(
          document.querySelectorAll("#invitees-list .invitee-row")
        );
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        let invitees = inviteeRows.map((r) => {
          const [nameEl, emailEl, phoneEl] = r.querySelectorAll("input");
          return {
            name: nameEl?.value?.trim() || "",
            email: emailEl?.value?.trim() || "",
            phone: phoneEl?.value?.trim() || "",
            _emailEl: emailEl,
          };
        });
        invitees = invitees.filter((inv) => inv.name || inv.email || inv.phone);
        const withEmail = invitees.filter((inv) => inv.email);
        if (withEmail.length === 0) {
          invitees[0]?._emailEl?.classList.add("invalid");
          return fail(
            "Agrega al menos un invitado con correo.",
            invitees[0]?._emailEl?.id
          );
        }
        for (const inv of withEmail) {
          if (!emailRegex.test(inv.email)) {
            inv._emailEl?.classList.add("invalid");
            return fail(`Correo inválido: ${inv.email}`, inv._emailEl?.id);
          }
        }
        const seen = new Set();
        invitees = withEmail
          .filter((inv) => {
            const key = inv.email.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .map(({ _emailEl, ...rest }) => rest);

        const autogen =
          document.getElementById("f-meet-autogen")?.value === "1";
        const u = (meetRaw || "").trim();
        const meet = autogen ? null : normalizeMeetingHref(u);

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
  };
}
