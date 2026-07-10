import React, { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";

const BG_DARK = "rgb(23, 25, 49)";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 2200,
  timerProgressBar: true,
});

function formatDur(sec) {
  const s = Number(sec) || 0;
  if (!s) return "";
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }
  return `${m}:${String(r).padStart(2, "0")}`;
}

const TIPO_ICON = { video: "bx-play", texto: "bx-file-blank", reto: "bx-trophy" };

/* Anillo de progreso (SVG) para el hero */
function ProgressRing({ pct, size = 66, stroke = 7 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (Math.max(0, Math.min(100, pct)) / 100) * c;
  return (
    <svg width={size} height={size} className="tut-ring">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="rgba(255,255,255,.16)"
        strokeWidth={stroke}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="url(#tutRingGrad)"
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={off}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset .6s ease" }}
      />
      <defs>
        <linearGradient id="tutRingGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#818cf8" />
          <stop offset="1" stopColor="#34d399" />
        </linearGradient>
      </defs>
      <text x="50%" y="51%" className="tut-ring-txt">
        {pct}%
      </text>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════
   Panel admin (solo super admin): elige módulos + título público
   ═══════════════════════════════════════════════════════════ */
function AdminPanel({ onClose, onChanged }) {
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [edits, setEdits] = useState({}); // { id_modulo: titulo }

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await chatApi.get("/tutoriales/admin/cursos");
      const list = data?.data || [];
      setCursos(list);
      const e = {};
      list.forEach((c) =>
        c.modulos.forEach((m) => {
          if (m.habilitado) e[m.id_modulo] = m.titulo_override || "";
        }),
      );
      setEdits(e);
    } catch {
      Toast.fire({ icon: "error", title: "Error cargando cursos" });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const upsert = async (curso, mod, patch = {}) => {
    setSaving(mod.id_modulo);
    try {
      await chatApi.post("/tutoriales/admin/modulos", {
        id_curso: curso.id_curso,
        id_modulo: mod.id_modulo,
        activo: patch.activo ?? (mod.activo ? 1 : 0),
        orden: mod.orden || 0,
        titulo: patch.titulo ?? edits[mod.id_modulo] ?? mod.titulo_override,
      });
      Toast.fire({ icon: "success", title: "Guardado" });
      await load();
      onChanged?.();
    } catch {
      Toast.fire({ icon: "error", title: "No se pudo guardar" });
    } finally {
      setSaving(null);
    }
  };

  const toggle = (curso, mod) =>
    upsert(curso, mod, {
      activo: mod.habilitado ? (mod.activo ? 0 : 1) : 1,
    });

  const quitar = async (mod) => {
    setSaving(mod.id_modulo);
    try {
      await chatApi.delete(`/tutoriales/admin/modulos/${mod.id_modulo}`);
      Toast.fire({ icon: "success", title: "Quitado" });
      await load();
      onChanged?.();
    } catch {
      Toast.fire({ icon: "error", title: "No se pudo quitar" });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div
      className="tut-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="tut-admin">
        <div className="tut-admin-head">
          <div>
            <div className="tut-eyebrow light">Configuración · Super admin</div>
            <h3>¿Qué tutoriales ven tus clientes?</h3>
          </div>
          <button className="tut-close" onClick={onClose}>
            <i className="bx bx-x" />
          </button>
        </div>
        <div className="tut-admin-body">
          {loading ? (
            <div className="tut-loading">
              <div className="tut-spinner" /> Cargando cursos…
            </div>
          ) : (
            cursos.map((c) => (
              <div key={c.id_curso} className="tut-curso-block">
                <div className="tut-curso-title">
                  <i className="bx bxs-graduation" /> {c.nombre}
                  <span className="tut-badge">{c.paquete}</span>
                </div>
                {c.modulos.map((m) => {
                  const on = m.habilitado && m.activo;
                  return (
                    <div
                      key={m.id_modulo}
                      className={`tut-mod-row ${on ? "on" : ""}`}
                    >
                      <div className="tut-mod-row-top">
                        <div className="tut-mod-info">
                          <div className="tut-mod-name">{m.nombre_modulo}</div>
                          <div className="tut-mod-meta">
                            {m.total_contenidos} video
                            {m.total_contenidos !== 1 ? "s" : ""}
                            {m.habilitado && !m.activo && " · oculto"}
                          </div>
                        </div>
                        <div className="tut-mod-actions">
                          {m.habilitado && (
                            <button
                              className="tut-mini-btn danger"
                              disabled={saving === m.id_modulo}
                              onClick={() => quitar(m)}
                              title="Quitar de la lista"
                            >
                              <i className="bx bx-trash" />
                            </button>
                          )}
                          <button
                            className={`tut-toggle ${on ? "on" : ""}`}
                            disabled={saving === m.id_modulo}
                            onClick={() => toggle(c, m)}
                          >
                            <span className="tut-toggle-knob" />
                          </button>
                        </div>
                      </div>

                      {/* Título público editable (solo si está en la lista) */}
                      {m.habilitado && (
                        <div className="tut-title-edit">
                          <div className="tut-title-edit-label">
                            <i className="bx bx-purchase-tag" /> Título que ven
                            los clientes
                          </div>
                          <div className="tut-title-edit-row">
                            <input
                              className="tut-title-input"
                              value={edits[m.id_modulo] ?? ""}
                              placeholder={m.nombre_modulo}
                              onChange={(e) =>
                                setEdits((prev) => ({
                                  ...prev,
                                  [m.id_modulo]: e.target.value,
                                }))
                              }
                            />
                            <button
                              className="tut-save-title"
                              disabled={saving === m.id_modulo}
                              onClick={() =>
                                upsert(c, m, {
                                  titulo:
                                    (edits[m.id_modulo] || "").trim() || null,
                                })
                              }
                            >
                              Guardar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Vista principal de Tutoriales
   ═══════════════════════════════════════════════════════════ */
export default function TutorialesView() {
  const [modulos, setModulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModulo, setOpenModulo] = useState(null);
  const [selected, setSelected] = useState(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const iframeRef = useRef(null);

  const isSuperAdmin =
    (localStorage.getItem("user_role") || "") === "super_administrador";

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await chatApi.get("/tutoriales");
      const mods = data?.data?.modulos || [];
      setModulos(mods);
      const firstMod = mods.find((m) => m.contenidos?.length);
      if (firstMod) {
        setOpenModulo(firstMod.id_modulo);
        setSelected({
          ...firstMod.contenidos[0],
          id_modulo: firstMod.id_modulo,
        });
      } else {
        setSelected(null);
      }
    } catch {
      Toast.fire({ icon: "error", title: "Error cargando tutoriales" });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const totalGlobal = useMemo(
    () => modulos.reduce((a, m) => a + (m.total || 0), 0),
    [modulos],
  );
  const completadosGlobal = useMemo(
    () => modulos.reduce((a, m) => a + (m.completados || 0), 0),
    [modulos],
  );
  const pctGlobal = totalGlobal
    ? Math.round((completadosGlobal / totalGlobal) * 100)
    : 0;

  const flatList = useMemo(() => {
    const arr = [];
    modulos.forEach((m) =>
      (m.contenidos || []).forEach((c) =>
        arr.push({ ...c, id_modulo: m.id_modulo }),
      ),
    );
    return arr;
  }, [modulos]);

  const currentIndex = useMemo(
    () =>
      selected
        ? flatList.findIndex((c) => c.id_contenido === selected.id_contenido)
        : -1,
    [selected, flatList],
  );
  const nextContenido =
    currentIndex >= 0 && currentIndex < flatList.length - 1
      ? flatList[currentIndex + 1]
      : null;

  const goNext = () => {
    if (nextContenido) {
      setSelected(nextContenido);
      setOpenModulo(nextContenido.id_modulo);
    }
  };

  const marcar = async (item, done) => {
    try {
      await chatApi.post("/tutoriales/progreso", {
        id_contenido: item.id_contenido,
        completado: done ? 1 : 0,
      });
      setModulos((prev) =>
        prev.map((m) => {
          const contenidos = m.contenidos.map((c) =>
            c.id_contenido === item.id_contenido
              ? { ...c, completado: done }
              : c,
          );
          return {
            ...m,
            contenidos,
            completados: contenidos.filter((c) => c.completado).length,
          };
        }),
      );
      setSelected((s) =>
        s && s.id_contenido === item.id_contenido
          ? { ...s, completado: done }
          : s,
      );
    } catch {
      Toast.fire({ icon: "error", title: "No se pudo guardar el progreso" });
    }
  };

  const selectContenido = (mod, c) => {
    setSelected({ ...c, id_modulo: mod.id_modulo });
    setOpenModulo(mod.id_modulo);
  };

  // Auto-completar + auto-avanzar cuando el video termina (protocolo player.js
  // de Bunny vía postMessage). Best-effort: si no llega el evento, el check
  // manual sigue funcionando.
  useEffect(() => {
    if (!selected || selected.tipo !== "video") return;
    const onMsg = (e) => {
      let d = e.data;
      if (typeof d === "string") {
        try {
          d = JSON.parse(d);
        } catch {
          return;
        }
      }
      if (!d || d.context !== "player.js") return;
      const win = iframeRef.current?.contentWindow;
      if (d.event === "ready" && win) {
        win.postMessage(
          JSON.stringify({
            context: "player.js",
            method: "addEventListener",
            value: "ended",
            listener: "tut-ended",
          }),
          "*",
        );
      }
      if (d.event === "ended") {
        if (!selected.completado) marcar(selected, true);
        Toast.fire({
          icon: "success",
          title: nextContenido
            ? "¡Clase completada! Avanzando…"
            : "¡Completaste el módulo! 🎉",
        });
        if (nextContenido) setTimeout(() => goNext(), 1600);
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id_contenido, selected?.completado, nextContenido?.id_contenido]);

  return (
    <>
      <style>{css}</style>

      <div className="tut-wrap">
        {/* ─────────── HERO (mismo estilo que Conexiones/Usuarios) ─────────── */}
        <header className="relative isolate overflow-hidden rounded-[22px] mb-[22px] shadow-[0_20px_50px_rgba(23,25,49,.28)]">
          {/* Fondo navy de marca + capas de profundidad (fade radial) */}
          <div className="absolute inset-0 bg-[#171931]" aria-hidden />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.6]"
            style={{
              backgroundImage:
                "radial-gradient(600px circle at 0% 0%, rgba(79,70,229,0.25), transparent 45%), radial-gradient(500px circle at 100% 120%, rgba(99,102,241,0.18), transparent 40%)",
            }}
          />
          {/* Cuadrícula sutil */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />

          <div className="relative px-5 py-4 md:px-7 md:py-5 flex items-center justify-between gap-5 flex-wrap">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70 ring-1 ring-white/15">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                ImporChat · Academia
              </span>
              <h1 className="mt-2 text-xl md:text-2xl font-extrabold text-white tracking-tight leading-tight">
                Centro de{" "}
                <span className="bg-gradient-to-r from-indigo-300 to-violet-200 bg-clip-text text-transparent">
                  aprendizaje
                </span>
              </h1>
              <p className="mt-0.5 text-white/55 text-[13px] leading-snug">
                Domina la plataforma con videos guiados, paso a paso.
              </p>
              <div className="tut-hero-chips" style={{ marginTop: 12 }}>
                <span>
                  <i className="bx bx-movie-play" /> {totalGlobal} clases
                </span>
                <span>
                  <i className="bx bx-check-circle" /> {completadosGlobal}{" "}
                  completadas
                </span>
                <span className="auto">
                  <i className="bx bx-bolt-circle" /> Progreso automático
                </span>
              </div>
            </div>
            <div className="flex items-center gap-[18px] shrink-0">
              {totalGlobal > 0 && <ProgressRing pct={pctGlobal} />}
              {isSuperAdmin && (
                <button
                  className="tut-config-btn"
                  onClick={() => setAdminOpen(true)}
                >
                  <i className="bx bx-slider-alt" /> Configurar
                </button>
              )}
            </div>
          </div>
        </header>

        {loading ? (
          <div className="tut-loading big">
            <div className="tut-spinner" /> Cargando tutoriales…
          </div>
        ) : modulos.length === 0 ? (
          <div className="tut-empty card">
            <i className="bx bx-movie-play" />
            <div className="tut-empty-title">
              Aún no hay tutoriales disponibles
            </div>
            {isSuperAdmin && (
              <button
                className="tut-config-btn"
                onClick={() => setAdminOpen(true)}
              >
                <i className="bx bx-slider-alt" /> Configurar tutoriales
              </button>
            )}
          </div>
        ) : (
          <div className="tut-layout">
            {/* ─────────── PLAYER ─────────── */}
            <div className="tut-player">
              {selected ? (
                <>
                  {selected.tipo === "video" && selected.video_url ? (
                    <div className="tut-video">
                      <iframe
                        key={selected.id_contenido}
                        ref={iframeRef}
                        src={selected.video_url}
                        loading="lazy"
                        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
                        allowFullScreen
                        title={selected.titulo}
                      />
                    </div>
                  ) : selected.thumbnail ? (
                    <img className="tut-thumb" src={selected.thumbnail} alt="" />
                  ) : null}

                  <div className="tut-player-body">
                    <div className="tut-player-topline">
                      {currentIndex >= 0 && (
                        <span className="tut-clase-badge">
                          Clase {currentIndex + 1} de {flatList.length}
                        </span>
                      )}
                      {selected.completado && (
                        <span className="tut-done-badge">
                          <i className="bx bxs-check-circle" /> Completada
                        </span>
                      )}
                    </div>
                    <h2>{selected.titulo}</h2>
                    <div className="tut-player-meta">
                      {selected.duracion_segundos ? (
                        <span className="tut-chip">
                          <i className="bx bx-time-five" />{" "}
                          {formatDur(selected.duracion_segundos)}
                        </span>
                      ) : null}
                      <label
                        className={`tut-check ${selected.completado ? "done" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={!!selected.completado}
                          onChange={(e) => marcar(selected, e.target.checked)}
                        />
                        <i
                          className={`bx ${selected.completado ? "bxs-check-circle" : "bx-circle"}`}
                        />
                        <span>
                          {selected.completado
                            ? "Completada"
                            : "Marcar como completada"}
                        </span>
                      </label>
                      {nextContenido && (
                        <button className="tut-next-btn" onClick={goNext}>
                          Siguiente clase{" "}
                          <i className="bx bx-right-arrow-alt" />
                        </button>
                      )}
                    </div>
                    {selected.contenido_html ? (
                      <div
                        className="tut-html"
                        dangerouslySetInnerHTML={{
                          __html: selected.contenido_html,
                        }}
                      />
                    ) : selected.video_descripcion ? (
                      <div className="tut-desc">{selected.video_descripcion}</div>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="tut-empty">
                  <i className="bx bx-movie-play" /> Selecciona un video
                </div>
              )}
            </div>

            {/* ─────────── SIDEBAR ─────────── */}
            <div className="tut-sidebar">
              {modulos.map((m, mi) => {
                const isOpen = openModulo === m.id_modulo;
                const pct = m.total
                  ? Math.round((m.completados / m.total) * 100)
                  : 0;
                const full = m.total > 0 && m.completados === m.total;
                return (
                  <div
                    key={m.id_modulo}
                    className={`tut-mod ${isOpen ? "open" : ""} ${full ? "full" : ""}`}
                  >
                    <button
                      className="tut-mod-header"
                      onClick={() => setOpenModulo(isOpen ? null : m.id_modulo)}
                    >
                      <div className={`tut-mod-idx ${full ? "done" : ""}`}>
                        {full ? <i className="bx bx-check" /> : mi + 1}
                      </div>
                      <div className="tut-mod-head-txt">
                        <div className="tut-mod-title">{m.nombre_modulo}</div>
                        <div className="tut-mod-sub">
                          {m.completados}/{m.total} clases · {pct}%
                        </div>
                      </div>
                      <i
                        className={`bx ${isOpen ? "bx-chevron-up" : "bx-chevron-down"} tut-chev`}
                      />
                    </button>
                    <div className="tut-mod-bar">
                      <div
                        className="tut-mod-fill"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {isOpen && (
                      <div className="tut-lessons">
                        {m.contenidos.map((c, ci) => {
                          const active =
                            selected &&
                            selected.id_contenido === c.id_contenido;
                          return (
                            <button
                              key={c.id_contenido}
                              className={`tut-lesson ${active ? "active" : ""} ${c.completado ? "done" : ""}`}
                              onClick={() => selectContenido(m, c)}
                            >
                              <span className="tut-lesson-num">
                                {c.completado ? (
                                  <i className="bx bxs-check-circle" />
                                ) : active ? (
                                  <i className="bx bxs-right-arrow" />
                                ) : (
                                  ci + 1
                                )}
                              </span>
                              <span className="tut-lesson-title">
                                {c.titulo}
                              </span>
                              {c.duracion_segundos ? (
                                <span className="tut-lesson-dur">
                                  {formatDur(c.duracion_segundos)}
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {adminOpen && (
        <AdminPanel onClose={() => setAdminOpen(false)} onChanged={load} />
      )}
    </>
  );
}

const css = `
  .tut-wrap { padding: 22px 30px 48px; width: 100%; box-sizing: border-box; }
  .tut-eyebrow { font-size:.68rem; font-weight:800; text-transform:uppercase; letter-spacing:.1em; color:#6366f1; }
  .tut-eyebrow.light { color:#a5b4fc; }

  /* HERO: contenedor ahora en Tailwind (navy + cuadrícula + fades, como
     Conexiones/Usuarios); aquí solo quedan los chips y el anillo. */
  .tut-hero-chips { display:flex; gap:8px; flex-wrap:wrap; }
  .tut-hero-chips span { display:inline-flex; align-items:center; gap:6px; font-size:.74rem; font-weight:700; color:rgba(255,255,255,.85);
    background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.12); padding:5px 11px; border-radius:999px; }
  .tut-hero-chips span.auto { color:#6ee7b7; background:rgba(52,211,153,.12); border-color:rgba(52,211,153,.25); }
  .tut-hero-chips i { font-size:.95rem; }
  .tut-ring { display:block; }
  .tut-ring-txt { fill:#fff; font-size:16px; font-weight:800; text-anchor:middle; dominant-baseline:middle; }
  .tut-config-btn { display:inline-flex; align-items:center; gap:7px; padding:11px 18px; border-radius:12px; border:1px solid rgba(255,255,255,.2);
    background:rgba(255,255,255,.1); color:#fff; font-weight:700; font-size:.85rem; cursor:pointer; font-family:inherit; backdrop-filter:blur(6px); transition:all .15s; }
  .tut-config-btn:hover { background:rgba(255,255,255,.2); }

  /* LAYOUT */
  .tut-layout { display:grid; grid-template-columns: minmax(0,1fr) 400px; gap:22px; align-items:start; width:100%; }
  @media (max-width: 1100px) { .tut-layout { grid-template-columns: 1fr; } }

  /* PLAYER */
  .tut-player { background:#fff; border:1px solid #e8ebf1; border-radius:20px; overflow:hidden; box-shadow:0 12px 34px rgba(15,23,42,.08); }
  .tut-video { position:relative; width:100%; aspect-ratio:16/9; background:#000; }
  .tut-video iframe { position:absolute; inset:0; width:100%; height:100%; border:0; }
  .tut-thumb { width:100%; display:block; }
  .tut-player-body { padding:20px 24px 24px; }
  .tut-player-topline { display:flex; align-items:center; gap:8px; margin-bottom:9px; }
  .tut-clase-badge { font-size:.66rem; font-weight:800; text-transform:uppercase; letter-spacing:.06em; color:#6366f1; background:#eef2ff; padding:4px 11px; border-radius:999px; }
  .tut-done-badge { display:inline-flex; align-items:center; gap:4px; font-size:.66rem; font-weight:800; text-transform:uppercase; letter-spacing:.05em; color:#15803d; background:#f0fdf4; padding:4px 11px; border-radius:999px; }
  .tut-player-body h2 { margin:0 0 14px; font-size:1.3rem; font-weight:800; color:#0f172a; line-height:1.3; letter-spacing:-.01em; }
  .tut-player-meta { display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:16px; }
  .tut-chip { display:inline-flex; align-items:center; gap:5px; font-size:.8rem; color:#475569; font-weight:700; background:#f1f5f9; padding:7px 12px; border-radius:10px; }
  .tut-check { display:inline-flex; align-items:center; gap:8px; cursor:pointer; user-select:none; padding:7px 14px; border-radius:10px; border:1.5px solid #e2e8f0; transition:all .15s; }
  .tut-check:hover { border-color:#c7d2fe; background:#fafbff; }
  .tut-check.done { border-color:#bbf7d0; background:#f0fdf4; }
  .tut-check input { display:none; }
  .tut-check i { font-size:1.15rem; color:#cbd5e1; }
  .tut-check.done i { color:#22c55e; }
  .tut-check span { font-size:.82rem; font-weight:700; color:#334155; }
  .tut-check.done span { color:#15803d; }
  .tut-next-btn { margin-left:auto; display:inline-flex; align-items:center; gap:6px; padding:9px 17px; border-radius:11px; border:none;
    background:linear-gradient(135deg, ${BG_DARK}, #34366b); color:#fff; font-weight:700; font-size:.82rem; cursor:pointer; font-family:inherit;
    box-shadow:0 6px 16px rgba(23,25,49,.25); transition:transform .12s, box-shadow .12s; }
  .tut-next-btn:hover { transform:translateY(-1px); box-shadow:0 10px 22px rgba(23,25,49,.35); }
  .tut-next-btn i { font-size:1.15rem; }
  .tut-desc, .tut-html { font-size:.9rem; color:#475569; line-height:1.65; white-space:pre-wrap; background:#f8fafc; border:1px solid #eef2f7; border-radius:12px; padding:14px 16px; }
  .tut-html { white-space:normal; }
  .tut-html img { max-width:100%; border-radius:8px; }

  /* SIDEBAR */
  .tut-sidebar { display:flex; flex-direction:column; gap:11px; max-height:calc(100vh - 150px); overflow-y:auto; padding-right:3px; }
  .tut-sidebar::-webkit-scrollbar { width:7px; }
  .tut-sidebar::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:999px; }
  .tut-mod { background:#fff; border:1px solid #e8ebf1; border-radius:15px; overflow:hidden; transition:box-shadow .2s, border-color .2s; }
  .tut-mod.open { box-shadow:0 10px 26px rgba(99,102,241,.1); border-color:#dbe0ff; }
  .tut-mod.full { border-color:#bbf7d0; }
  .tut-mod-header { width:100%; display:flex; align-items:center; gap:12px; padding:14px 16px; background:none; border:none; cursor:pointer; font-family:inherit; text-align:left; }
  .tut-mod-idx { width:30px; height:30px; border-radius:10px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:.85rem; font-weight:800;
    background:#eef2ff; color:#4338ca; }
  .tut-mod-idx.done { background:#22c55e; color:#fff; }
  .tut-mod-idx.done i { font-size:1.1rem; }
  .tut-mod-head-txt { flex:1; min-width:0; }
  .tut-mod-title { font-size:.88rem; font-weight:800; color:#0f172a; line-height:1.25; }
  .tut-mod-sub { font-size:.72rem; color:#64748b; margin-top:2px; font-weight:600; }
  .tut-chev { color:#94a3b8; font-size:1.3rem; flex-shrink:0; }
  .tut-mod-bar { height:4px; background:#eef2f7; }
  .tut-mod-fill { height:100%; background:linear-gradient(90deg,#6366f1,#34d399); transition:width .5s ease; }
  /* Con muchas clases (p.ej. 12) en pantallas chicas las últimas quedaban
     cortadas sin forma de llegar: la lista tiene su propio scroll. */
  .tut-lessons { display:flex; flex-direction:column; padding:8px; gap:3px; max-height:min(48vh, 460px); overflow-y:auto; }
  .tut-lessons::-webkit-scrollbar { width:6px; }
  .tut-lessons::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:999px; }
  .tut-lessons::-webkit-scrollbar-track { background:transparent; }
  .tut-lesson { display:flex; align-items:center; gap:11px; padding:10px 11px; border-radius:11px; border:none; background:none; cursor:pointer; font-family:inherit; text-align:left; transition:background .15s; position:relative; }
  .tut-lesson:hover { background:#f5f7fb; }
  .tut-lesson.active { background:linear-gradient(90deg,#eef2ff,#f5f3ff); }
  .tut-lesson.active::before { content:""; position:absolute; left:0; top:8px; bottom:8px; width:3px; border-radius:999px; background:#6366f1; }
  .tut-lesson-num { width:24px; height:24px; border-radius:50%; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:.72rem; font-weight:800; background:#f1f5f9; color:#94a3b8; }
  .tut-lesson.active .tut-lesson-num { background:#6366f1; color:#fff; }
  .tut-lesson.done .tut-lesson-num { background:transparent; color:#22c55e; }
  .tut-lesson-num i { font-size:1.25rem; }
  .tut-lesson-title { flex:1; font-size:.81rem; color:#334155; font-weight:600; line-height:1.35; }
  .tut-lesson.active .tut-lesson-title { color:#3730a3; font-weight:700; }
  .tut-lesson.done .tut-lesson-title { color:#64748b; }
  .tut-lesson-dur { font-size:.7rem; color:#94a3b8; font-weight:700; flex-shrink:0; }

  /* estados */
  .tut-loading { display:flex; align-items:center; gap:10px; color:#64748b; font-weight:600; padding:20px; }
  .tut-loading.big { justify-content:center; padding:90px 0; }
  .tut-spinner { width:22px; height:22px; border-radius:50%; border:3px solid #e2e8f0; border-top-color:#6366f1; animation:tut-spin .8s linear infinite; }
  @keyframes tut-spin { to { transform:rotate(360deg); } }
  .tut-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; padding:80px 20px; color:#94a3b8; text-align:center; }
  .tut-empty.card { background:#fff; border:1px dashed #d7dce5; border-radius:18px; }
  .tut-empty i { font-size:3.2rem; }
  .tut-empty-title { font-weight:700; color:#475569; }

  /* ADMIN */
  .tut-overlay { position:fixed; inset:0; background:rgba(10,10,20,.55); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:9999; padding:16px; }
  .tut-admin { background:#fff; border-radius:20px; width:100%; max-width:640px; max-height:88vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 32px 80px rgba(0,0,0,.25); }
  .tut-admin-head { background:${BG_DARK}; padding:20px 24px; display:flex; align-items:center; justify-content:space-between; }
  .tut-admin-head h3 { margin:3px 0 0; color:#fff; font-size:1.1rem; font-weight:800; }
  .tut-close { width:32px; height:32px; border-radius:9px; border:1px solid rgba(255,255,255,.15); background:rgba(255,255,255,.08); color:rgba(255,255,255,.8); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:1.2rem; }
  .tut-close:hover { background:rgba(255,255,255,.18); color:#fff; }
  .tut-admin-body { padding:18px 24px 24px; overflow-y:auto; }
  .tut-curso-block { margin-bottom:20px; }
  .tut-curso-title { display:flex; align-items:center; gap:8px; font-size:.92rem; font-weight:800; color:#0f172a; margin-bottom:10px; }
  .tut-curso-title i { color:#6366f1; }
  .tut-badge { font-size:.6rem; font-weight:800; text-transform:uppercase; letter-spacing:.05em; color:#4338ca; background:#eef2ff; padding:2px 8px; border-radius:999px; }
  .tut-mod-row { border:1.5px solid #e5e7eb; border-radius:13px; margin-bottom:9px; overflow:hidden; transition:all .15s; }
  .tut-mod-row.on { border-color:rgba(99,102,241,.4); background:rgba(99,102,241,.03); }
  .tut-mod-row-top { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:12px 14px; }
  .tut-mod-info { min-width:0; }
  .tut-mod-name { font-size:.84rem; font-weight:700; color:#0f172a; }
  .tut-mod-meta { font-size:.7rem; color:#94a3b8; margin-top:1px; }
  .tut-mod-actions { display:flex; align-items:center; gap:9px; flex-shrink:0; }
  .tut-mini-btn { width:32px; height:32px; border-radius:9px; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:1.05rem; }
  .tut-mini-btn.danger { background:#fee2e2; color:#dc2626; }
  .tut-mini-btn.danger:hover { background:#fecaca; }
  .tut-toggle { width:44px; height:24px; border-radius:999px; border:none; background:#cbd5e1; cursor:pointer; position:relative; transition:background .2s; flex-shrink:0; }
  .tut-toggle.on { background:#6366f1; }
  .tut-toggle-knob { position:absolute; top:2px; left:2px; width:20px; height:20px; border-radius:50%; background:#fff; box-shadow:0 2px 4px rgba(0,0,0,.2); transition:left .2s; }
  .tut-toggle.on .tut-toggle-knob { left:22px; }
  .tut-title-edit { padding:0 14px 13px; }
  .tut-title-edit-label { display:flex; align-items:center; gap:5px; font-size:.66rem; font-weight:800; text-transform:uppercase; letter-spacing:.05em; color:#6366f1; margin-bottom:6px; }
  .tut-title-edit-row { display:flex; gap:8px; }
  .tut-title-input { flex:1; padding:9px 12px; border-radius:10px; border:1.5px solid #e2e8f0; font-size:.83rem; color:#0f172a; outline:none; font-family:inherit; transition:border-color .15s; }
  .tut-title-input:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.1); }
  .tut-save-title { padding:0 16px; border-radius:10px; border:none; background:${BG_DARK}; color:#fff; font-weight:700; font-size:.8rem; cursor:pointer; font-family:inherit; white-space:nowrap; }
  .tut-save-title:hover { background:rgb(35,38,68); }
  .tut-save-title:disabled { opacity:.5; cursor:not-allowed; }
`;
