import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import chatApi from "../../../../api/chatcenter";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

const TIEMPOS = [
  { value: "1", label: "1h", desc: "Rápido" },
  { value: "3", label: "3h", desc: "Caliente" },
  { value: "5", label: "5h", desc: "Recomendado" },
  { value: "10", label: "10h", desc: "Moderado" },
  { value: "20", label: "20h", desc: "Al día" },
];

const BG_DARK = "rgb(23, 25, 49)";

const SECUENCIA_VACIA = () => ({
  tiempo_espera_horas: "0",
  nombre_template: "",
  header_format: null,
  header_media_url: "",
  headerInfo: null,
  estado_destino: "",
  // ✨ NUEVO
  usar_respuesta_rapida: false,
  id_template_rapido: null,
});

const RemarketingColumna = ({
  id_configuracion,
  estado_db,
  nombreColumna,
  columnas = [],
}) => {
  const [showModal, setShowModal] = useState(false);
  const [plantillas, setPlantillas] = useState([]);
  const [respuestasRapidas, setRespuestasRapidas] = useState([]);
  const [loadingPlt, setLoadingPlt] = useState(false);
  const [loadingRR, setLoadingRR] = useState(false);
  const [loadingCfg, setLoadingCfg] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [desactivando, setDesactivando] = useState(false);
  const [configActiva, setConfigActiva] = useState(false);

  const [secuencias, setSecuencias] = useState([SECUENCIA_VACIA()]);

  // ── Check config activa al montar ──────────────────────────
  useEffect(() => {
    if (!id_configuracion || !estado_db) return;
    chatApi
      .post("openai_assistants/obtener_remarketing", {
        id_configuracion,
        estado_contacto: estado_db,
      })
      .then((res) => {
        if (res.data?.data?.length) setConfigActiva(true);
      })
      .catch(() => {});
  }, [id_configuracion, estado_db]);

  // ── Cargar plantillas Meta ─────────────────────────────────
  const fetchPlantillas = async () => {
    setLoadingPlt(true);
    try {
      const res = await chatApi.post(
        "whatsapp_managment/obtenerTemplatesWhatsapp",
        { id_configuracion },
      );
      const data = res.data?.data || [];
      setPlantillas(
        data.filter((t, i, s) => i === s.findIndex((x) => x.id === t.id)),
      );
    } catch {
      setPlantillas([]);
    } finally {
      setLoadingPlt(false);
    }
  };

  // ── ✨ NUEVO: Cargar respuestas rápidas ────────────────────
  const fetchRespuestasRapidas = async () => {
    setLoadingRR(true);
    try {
      const res = await chatApi.post(
        "whatsapp_managment/obtenerRespuestasRapidas",
        { id_configuracion },
      );
      setRespuestasRapidas(res.data?.data || []);
    } catch {
      setRespuestasRapidas([]);
    } finally {
      setLoadingRR(false);
    }
  };

  const getHeaderUrl = (template) => {
    try {
      const hc = template?.components?.find((c) => c.type === "HEADER");
      if (!hc) return null;
      const url = [
        hc?.example?.header_handle?.[0],
        hc?.example?.header_url?.[0],
        hc?.example?.url?.[0],
        hc?.url,
        template?.header_url,
      ].filter(Boolean)[0];
      return url ? String(url).replace(/&amp;/g, "&") : null;
    } catch {
      return null;
    }
  };

  const updateSec = (idx, field, value) => {
    setSecuencias((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    );
  };

  const handlePlantillaChange = (idx, nombreTemplate) => {
    const base = {
      nombre_template: nombreTemplate,
      header_format: null,
      header_media_url: "",
      headerInfo: null,
    };
    const tpl = plantillas.find((p) => p.name === nombreTemplate);
    if (tpl) {
      const hc = tpl?.components?.find((c) => c.type === "HEADER");
      const fmt = hc ? String(hc.format || "").toUpperCase() : null;
      if (fmt && ["IMAGE", "VIDEO", "DOCUMENT"].includes(fmt)) {
        const url = getHeaderUrl(tpl);
        base.header_format = fmt;
        base.header_media_url = url || "";
        base.headerInfo = url
          ? { format: fmt, url }
          : { format: fmt, url: null };
      }
    }
    setSecuencias((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, ...base } : s)),
    );
  };

  const agregarSecuencia = () => {
    if (secuencias.length < 3) setSecuencias((p) => [...p, SECUENCIA_VACIA()]);
  };
  const quitarSecuencia = (idx) => {
    if (secuencias.length > 1)
      setSecuencias((p) => p.filter((_, i) => i !== idx));
  };

  const handleAbrir = async () => {
    setShowModal(true);
    setLoadingCfg(true);
    fetchPlantillas();
    fetchRespuestasRapidas();
    try {
      const res = await chatApi.post("openai_assistants/obtener_remarketing", {
        id_configuracion,
        estado_contacto: estado_db,
      });
      const rows = res.data?.data;
      if (rows?.length) {
        setSecuencias(
          rows.map((r) => ({
            tiempo_espera_horas: String(r.tiempo_espera_horas ?? "0"),
            nombre_template: r.nombre_template ?? "",
            header_format: r.header_format || null,
            header_media_url: r.header_media_url || "",
            headerInfo: r.header_format
              ? { format: r.header_format, url: r.header_media_url || null }
              : null,
            estado_destino: r.estado_destino || "",
            usar_respuesta_rapida: !!r.usar_respuesta_rapida,
            id_template_rapido: r.id_template_rapido || null,
          })),
        );
        setConfigActiva(true);
      } else {
        setSecuencias([SECUENCIA_VACIA()]);
        setConfigActiva(false);
      }
    } catch {
      /* sin config */
    } finally {
      setLoadingCfg(false);
    }
  };

  const cerrarModal = () => setShowModal(false);

  const handleDesactivar = async () => {
    const ok = await Swal.fire({
      title: "¿Desactivar remarketing?",
      html: `Se borrará la configuración y se cancelarán los pendientes en <strong>${nombreColumna}</strong>.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, desactivar",
      cancelButtonText: "No",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: BG_DARK,
      reverseButtons: true,
      customClass: { container: "rm2-swal-top" },
    });
    if (!ok.isConfirmed) return;
    setDesactivando(true);
    try {
      await chatApi.post("openai_assistants/desactivar_remarketing", {
        id_configuracion,
        estado_contacto: estado_db,
      });
      setConfigActiva(false);
      setSecuencias([SECUENCIA_VACIA()]);
      Toast.fire({ icon: "success", title: "Remarketing desactivado" });
      cerrarModal();
    } catch {
      Toast.fire({ icon: "error", title: "Error al desactivar" });
    } finally {
      setDesactivando(false);
    }
  };

  const handleGuardar = async () => {
    for (let i = 0; i < secuencias.length; i++) {
      const s = secuencias[i];
      if (!s.nombre_template || s.tiempo_espera_horas === "0") {
        Toast.fire({
          icon: "warning",
          title: `Completa el seguimiento ${i + 1}`,
        });
        return;
      }
      // Validar: si activó RR, debe tener una seleccionada
      if (s.usar_respuesta_rapida && !s.id_template_rapido) {
        Toast.fire({
          icon: "warning",
          title: `Selecciona una respuesta rápida en el seguimiento ${i + 1}`,
        });
        return;
      }
    }

    const remarketings = secuencias.map((s, i) => {
      let hFormat = s.header_format;
      let hUrl = s.header_media_url;

      if (!hFormat || !hUrl) {
        const tpl = plantillas.find((p) => p.name === s.nombre_template);
        if (tpl) {
          const hc = tpl?.components?.find((c) => c.type === "HEADER");
          const fmt = hc ? String(hc.format || "").toUpperCase() : null;
          if (fmt && ["IMAGE", "VIDEO", "DOCUMENT"].includes(fmt)) {
            hFormat = hFormat || fmt;
            hUrl = hUrl || getHeaderUrl(tpl) || "";
          }
        }
      }

      const esUltimo = i === secuencias.length - 1;

      return {
        secuencia: i + 1,
        tiempo_espera_horas: Number(s.tiempo_espera_horas),
        nombre_template: s.nombre_template,
        language_code: "es",
        estado_destino: esUltimo ? s.estado_destino || null : null,
        header_format: hFormat || null,
        header_media_url: hUrl || null,
        header_media_name: null,
        // ✨ NUEVO
        usar_respuesta_rapida: !!s.usar_respuesta_rapida,
        id_template_rapido: s.usar_respuesta_rapida
          ? s.id_template_rapido
          : null,
      };
    });

    setGuardando(true);
    try {
      await chatApi.post("openai_assistants/configurar_remarketing", {
        id_configuracion,
        estado_contacto: estado_db,
        remarketings,
      });
      Toast.fire({
        icon: "success",
        title: configActiva
          ? "Remarketing actualizado"
          : "Remarketing activado",
      });
      setConfigActiva(true);
      cerrarModal();
    } catch {
      Toast.fire({ icon: "error", title: "Error al guardar" });
    } finally {
      setGuardando(false);
    }
  };

  const columnasDestino = columnas.filter((c) => c.estado_db !== estado_db);
  const formularioListo = secuencias.every(
    (s) =>
      s.nombre_template &&
      s.tiempo_espera_horas !== "0" &&
      (!s.usar_respuesta_rapida || s.id_template_rapido),
  );

  // Helper UI: icono por tipo de RR
  const iconoTipoRR = (tipo) => {
    const map = {
      text: "bx-message-rounded-detail",
      image: "bx-image",
      video: "bx-video",
      audio: "bx-microphone",
      document: "bx-file",
    };
    return map[tipo] || "bx-message-rounded-detail";
  };

  return (
    <>
      <style>{`
        @keyframes rm2-fadeIn { from{opacity:0;transform:scale(.97) translateY(6px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes rm2-overlayIn { from{opacity:0} to{opacity:1} }
        @keyframes rm2-pulse-dot { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.5);opacity:.5} }
        @keyframes rm2-shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .rm2-skeleton { background:linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%); background-size:400px 100%; animation:rm2-shimmer 1.4s infinite; border-radius:10px; }
        .rm2-trigger-btn { display:inline-flex; align-items:center; gap:6px; padding:5px 12px; border-radius:999px; border:1px solid rgba(99,102,241,.35); background:rgba(99,102,241,.07); color:#4338ca; font-size:.74rem; font-weight:600; cursor:pointer; transition:all .18s; white-space:nowrap; font-family:inherit; }
        .rm2-trigger-btn:hover { background:rgba(99,102,241,.15); border-color:rgba(99,102,241,.6); box-shadow:0 2px 10px rgba(99,102,241,.18); transform:translateY(-1px); }
        .rm2-dot { width:6px; height:6px; border-radius:50%; background:#22c55e; animation:rm2-pulse-dot 2s infinite; box-shadow:0 0 0 2px rgba(34,197,94,.2); }
        .rm2-overlay { position:fixed; inset:0; background:rgba(10,10,20,.6); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:9999; padding:16px; animation:rm2-overlayIn .2s ease; }
        .rm2-modal { background:#fff; border-radius:16px; width:100%; max-width:560px; max-height:92vh; display:flex; flex-direction:column; box-shadow:0 32px 80px rgba(0,0,0,.22),0 0 0 1px rgba(0,0,0,.07); animation:rm2-fadeIn .25s ease; overflow:hidden; }
        .rm2-modal-header { background:${BG_DARK}; padding:20px 24px 16px; border-radius:16px 16px 0 0; flex-shrink:0; }
        .rm2-body { padding:20px 24px 24px; overflow-y:auto; -webkit-overflow-scrolling:touch; }
        .rm2-seq-block { border:1.5px solid #e5e7eb; border-radius:14px; margin-bottom:10px; overflow:hidden; }
        .rm2-seq-header { display:flex; align-items:center; justify-content:space-between; padding:11px 14px; background:#f8fafc; border-bottom:1px solid #e5e7eb; }
        .rm2-seq-body { padding:14px; display:flex; flex-direction:column; gap:10px; }
        .rm2-seq-num { width:24px; height:24px; border-radius:50%; background:${BG_DARK}; color:#fff; display:flex; align-items:center; justify-content:center; font-size:.72rem; font-weight:700; flex-shrink:0; }
        .rm2-connector { display:flex; align-items:center; gap:8px; padding:6px 0 2px; color:#6b7280; font-size:.75rem; font-weight:600; }
        .rm2-connector::before, .rm2-connector::after { content:''; flex:1; height:1px; background:#e5e7eb; }
        .rm2-time-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:6px; }
        .rm2-time-chip { display:flex; flex-direction:column; align-items:center; padding:8px 4px; border-radius:9px; border:1.5px solid #e5e7eb; background:#f9fafb; cursor:pointer; transition:all .15s; text-align:center; }
        .rm2-time-chip:hover { border-color:rgba(23,25,49,.3); background:rgba(23,25,49,.04); }
        .rm2-time-chip.sel { border-color:${BG_DARK}; background:rgba(23,25,49,.06); box-shadow:0 0 0 3px rgba(23,25,49,.08); }
        .rm2-time-chip .tl { font-size:.78rem; font-weight:700; color:#111827; }
        .rm2-time-chip .ts { font-size:.62rem; color:#6b7280; margin-top:1px; }
        .rm2-time-chip.sel .tl { color:${BG_DARK}; }
        .rm2-select { width:100%; padding:9px 12px; border-radius:10px; border:1.5px solid #e5e7eb; background:#f9fafb; font-size:.85rem; color:#111827; outline:none; transition:border-color .2s; appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 10px center; padding-right:32px; cursor:pointer; font-family:inherit; }
        .rm2-select:focus { border-color:${BG_DARK}; box-shadow:0 0 0 3px rgba(23,25,49,.1); background-color:#fff; }
        .rm2-badge { display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:999px; font-size:.72rem; font-weight:600; }
        .rm2-badge-ok   { background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0; }
        .rm2-badge-warn { background:#fffbeb; color:#92400e; border:1px solid #fde68a; }
        .rm2-badge-info { background:rgba(99,102,241,.08); color:#4338ca; border:1px solid rgba(99,102,241,.25); }
        .rm2-add-btn { display:flex; align-items:center; justify-content:center; gap:7px; width:100%; padding:10px; border-radius:12px; border:2px dashed #d1d5db; background:transparent; color:#6b7280; font-size:.83rem; font-weight:600; cursor:pointer; transition:all .15s; font-family:inherit; margin-bottom:12px; }
        .rm2-add-btn:hover { border-color:#6366f1; color:#4338ca; background:rgba(99,102,241,.04); }
        .rm2-btn-save { display:inline-flex; align-items:center; gap:8px; padding:10px 20px; border-radius:12px; border:none; background:${BG_DARK}; color:#fff; font-weight:700; font-size:.875rem; cursor:pointer; transition:all .2s; box-shadow:0 4px 14px rgba(23,25,49,.25); font-family:inherit; }
        .rm2-btn-save:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 22px rgba(23,25,49,.35); }
        .rm2-btn-save:disabled { opacity:.5; cursor:not-allowed; transform:none; }
        .rm2-btn-cancel { padding:10px 16px; border-radius:12px; border:1.5px solid #e5e7eb; background:#fff; color:#374151; font-weight:600; font-size:.875rem; cursor:pointer; transition:all .15s; font-family:inherit; }
        .rm2-btn-cancel:hover { background:#f9fafb; }
        .rm2-close-btn { width:28px; height:28px; border-radius:8px; border:1px solid rgba(255,255,255,.15); background:rgba(255,255,255,.08); color:rgba(255,255,255,.7); cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-family:inherit; }
        .rm2-close-btn:hover { background:rgba(255,255,255,.18); color:#fff; }
        .rm2-swal-top { z-index:99999 !important; }
        .rm2-remove-btn { display:inline-flex; align-items:center; gap:4px; padding:4px 9px; border-radius:7px; border:1px solid #fecaca; background:#fff5f5; color:#dc2626; font-size:.72rem; font-weight:600; cursor:pointer; font-family:inherit; }
        .rm2-remove-btn:hover { background:#fee2e2; }
        /* ✨ NUEVO: bloque RR */
        .rm2-rr-card { border:1.5px solid #e0f2fe; background:#f0f9ff; border-radius:12px; padding:12px; }
        .rm2-rr-card.active { border-color:#0ea5e9; background:#eff6ff; box-shadow:0 0 0 3px rgba(14,165,233,.08); }
        .rm2-toggle { position:relative; display:inline-block; width:38px; height:22px; flex-shrink:0; }
        .rm2-toggle input { opacity:0; width:0; height:0; }
        .rm2-toggle-slider { position:absolute; cursor:pointer; inset:0; background:#cbd5e1; border-radius:999px; transition:all .2s; }
        .rm2-toggle-slider::before { content:''; position:absolute; height:16px; width:16px; left:3px; bottom:3px; background:#fff; border-radius:50%; transition:all .2s; box-shadow:0 1px 3px rgba(0,0,0,.2); }
        .rm2-toggle input:checked + .rm2-toggle-slider { background:#0ea5e9; }
        .rm2-toggle input:checked + .rm2-toggle-slider::before { transform:translateX(16px); }
      `}</style>

      <button className="rm2-trigger-btn" type="button" onClick={handleAbrir}>
        {configActiva && <span className="rm2-dot" />}
        <i className="bx bx-radar" style={{ fontSize: 13 }} />
        Remarketing
        {configActiva && (
          <span style={{ fontSize: ".64rem", opacity: 0.7, fontWeight: 500 }}>
            • Activo (
            {secuencias.length > 1 ? `${secuencias.length} pasos` : "1 paso"})
          </span>
        )}
      </button>

      {showModal && (
        <div
          className="rm2-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) cerrarModal();
          }}
        >
          <div className="rm2-modal">
            <div className="rm2-modal-header">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 9,
                      background: "rgba(255,255,255,.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <i
                      className="bx bx-radar"
                      style={{ fontSize: 18, color: "#fff" }}
                    />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: ".64rem",
                        color: "rgba(255,255,255,.42)",
                        fontWeight: 600,
                        letterSpacing: ".07em",
                        textTransform: "uppercase",
                      }}
                    >
                      Automatización · {nombreColumna}
                    </div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: "1rem",
                        fontWeight: 700,
                        color: "#fff",
                        lineHeight: 1.2,
                      }}
                    >
                      Remarketing en secuencia
                    </h2>
                  </div>
                </div>
                <button
                  className="rm2-close-btn"
                  type="button"
                  onClick={cerrarModal}
                >
                  <i className="bx bx-x" style={{ fontSize: 18 }} />
                </button>
              </div>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: ".75rem",
                  color: "rgba(255,255,255,.5)",
                  lineHeight: 1.5,
                }}
              >
                Hasta 3 mensajes en cadena. Si el cliente respondió en últimas
                24h, se envía la respuesta rápida (gratis); si no, la plantilla
                Meta.
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 12,
                }}
              >
                {[1, 2, 3].map((n) => (
                  <React.Fragment key={n}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background:
                          n <= secuencias.length
                            ? "rgba(255,255,255,.25)"
                            : "rgba(255,255,255,.07)",
                        border: `1.5px solid ${n <= secuencias.length ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.12)"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: ".7rem",
                        fontWeight: 700,
                        color:
                          n <= secuencias.length
                            ? "#fff"
                            : "rgba(255,255,255,.3)",
                      }}
                    >
                      {n}
                    </div>
                    {n < 3 && (
                      <div
                        style={{
                          flex: 1,
                          height: 1,
                          background:
                            n < secuencias.length
                              ? "rgba(255,255,255,.3)"
                              : "rgba(255,255,255,.1)",
                        }}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="rm2-body">
              {loadingCfg ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  <div className="rm2-skeleton" style={{ height: 200 }} />
                  <div className="rm2-skeleton" style={{ height: 200 }} />
                </div>
              ) : (
                <>
                  {secuencias.map((sec, idx) => {
                    const tplObj = plantillas.find(
                      (p) => p.name === sec.nombre_template,
                    );
                    const tiempoObj = TIEMPOS.find(
                      (t) => t.value === sec.tiempo_espera_horas,
                    );
                    const rrSel = respuestasRapidas.find(
                      (r) => r.id_template === sec.id_template_rapido,
                    );

                    return (
                      <React.Fragment key={idx}>
                        {idx > 0 && (
                          <div className="rm2-connector">
                            <i
                              className="bx bx-down-arrow-alt"
                              style={{ fontSize: 14 }}
                            />
                            si no responde, continuar con...
                          </div>
                        )}

                        <div className="rm2-seq-block">
                          <div className="rm2-seq-header">
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <div className="rm2-seq-num">{idx + 1}</div>
                              <span
                                style={{
                                  fontSize: ".83rem",
                                  fontWeight: 700,
                                  color: "#0f172a",
                                }}
                              >
                                {idx === 0
                                  ? "Primer seguimiento"
                                  : idx === 1
                                    ? "Segundo seguimiento"
                                    : "Tercer seguimiento"}
                              </span>
                              {sec.nombre_template &&
                                sec.tiempo_espera_horas !== "0" && (
                                  <span className="rm2-badge rm2-badge-ok">
                                    <i
                                      className="bx bx-check"
                                      style={{ fontSize: 11 }}
                                    />{" "}
                                    Listo
                                  </span>
                                )}
                            </div>
                            {secuencias.length > 1 && (
                              <button
                                className="rm2-remove-btn"
                                onClick={() => quitarSecuencia(idx)}
                              >
                                <i
                                  className="bx bx-trash"
                                  style={{ fontSize: 12 }}
                                />{" "}
                                Quitar
                              </button>
                            )}
                          </div>

                          <div className="rm2-seq-body">
                            {/* Tiempo */}
                            <div>
                              <div
                                style={{
                                  fontSize: ".78rem",
                                  fontWeight: 700,
                                  color: "#374151",
                                  marginBottom: 6,
                                }}
                              >
                                ⏱ Tiempo de espera
                                {tiempoObj && (
                                  <span
                                    style={{
                                      marginLeft: 6,
                                      fontWeight: 500,
                                      color: "#6b7280",
                                    }}
                                  >
                                    — {tiempoObj.label}
                                  </span>
                                )}
                              </div>
                              <div className="rm2-time-grid">
                                {TIEMPOS.map((t) => (
                                  <div
                                    key={t.value}
                                    className={`rm2-time-chip ${sec.tiempo_espera_horas === t.value ? "sel" : ""}`}
                                    onClick={() =>
                                      updateSec(
                                        idx,
                                        "tiempo_espera_horas",
                                        t.value,
                                      )
                                    }
                                  >
                                    <span className="tl">{t.label}</span>
                                    <span className="ts">{t.desc}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Plantilla Meta */}
                            <div>
                              <div
                                style={{
                                  fontSize: ".78rem",
                                  fontWeight: 700,
                                  color: "#374151",
                                  marginBottom: 6,
                                }}
                              >
                                💬 Plantilla Meta (fallback fuera de 24h)
                              </div>
                              {loadingPlt ? (
                                <div
                                  className="rm2-skeleton"
                                  style={{ height: 38 }}
                                />
                              ) : (
                                <>
                                  <select
                                    className="rm2-select"
                                    value={sec.nombre_template}
                                    onChange={(e) =>
                                      handlePlantillaChange(idx, e.target.value)
                                    }
                                  >
                                    <option value="">
                                      Selecciona una plantilla...
                                    </option>
                                    {plantillas.map((tpl) => (
                                      <option key={tpl.id} value={tpl.name}>
                                        {tpl.name}
                                      </option>
                                    ))}
                                  </select>

                                  {sec.nombre_template && (
                                    <div
                                      style={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: 5,
                                        marginTop: 6,
                                      }}
                                    >
                                      {tplObj?.status === "APPROVED" ? (
                                        <span className="rm2-badge rm2-badge-ok">
                                          <i
                                            className="bx bx-check-shield"
                                            style={{ fontSize: 11 }}
                                          />{" "}
                                          Aprobada
                                        </span>
                                      ) : tplObj ? (
                                        <span className="rm2-badge rm2-badge-warn">
                                          <i
                                            className="bx bx-time"
                                            style={{ fontSize: 11 }}
                                          />{" "}
                                          Pendiente aprobación
                                        </span>
                                      ) : null}

                                      {sec.headerInfo?.format && (
                                        <span className="rm2-badge rm2-badge-info">
                                          <i
                                            className={`bx bx-${sec.headerInfo.format === "VIDEO" ? "video" : sec.headerInfo.format === "IMAGE" ? "image" : "file"}`}
                                            style={{ fontSize: 11 }}
                                          />
                                          Header {sec.headerInfo.format}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>

                            {/* ✨ NUEVO: Respuesta rápida */}
                            <div
                              className={`rm2-rr-card ${sec.usar_respuesta_rapida ? "active" : ""}`}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                  justifyContent: "space-between",
                                }}
                              >
                                <div style={{ flex: 1 }}>
                                  <div
                                    style={{
                                      fontSize: ".82rem",
                                      fontWeight: 700,
                                      color: "#0c4a6e",
                                    }}
                                  >
                                    ⚡ Respuesta rápida (si responde en 24h)
                                  </div>
                                  <div
                                    style={{
                                      fontSize: ".7rem",
                                      color: "#475569",
                                      marginTop: 2,
                                      lineHeight: 1.4,
                                    }}
                                  >
                                    Mensaje gratis (free-form). Si pasaron más
                                    de 24h, cae a la plantilla Meta de arriba.
                                  </div>
                                </div>
                                <label className="rm2-toggle">
                                  <input
                                    type="checkbox"
                                    checked={sec.usar_respuesta_rapida}
                                    onChange={(e) =>
                                      updateSec(
                                        idx,
                                        "usar_respuesta_rapida",
                                        e.target.checked,
                                      )
                                    }
                                  />
                                  <span className="rm2-toggle-slider" />
                                </label>
                              </div>

                              {sec.usar_respuesta_rapida && (
                                <div style={{ marginTop: 10 }}>
                                  {loadingRR ? (
                                    <div
                                      className="rm2-skeleton"
                                      style={{ height: 38 }}
                                    />
                                  ) : respuestasRapidas.length === 0 ? (
                                    <div
                                      style={{
                                        fontSize: ".72rem",
                                        color: "#92400e",
                                        background: "#fffbeb",
                                        border: "1px solid #fde68a",
                                        borderRadius: 8,
                                        padding: "8px 10px",
                                      }}
                                    >
                                      No tienes respuestas rápidas creadas.
                                      Créalas desde "Respuestas rápidas" en el
                                      chat.
                                    </div>
                                  ) : (
                                    <>
                                      <select
                                        className="rm2-select"
                                        value={sec.id_template_rapido || ""}
                                        onChange={(e) =>
                                          updateSec(
                                            idx,
                                            "id_template_rapido",
                                            e.target.value
                                              ? Number(e.target.value)
                                              : null,
                                          )
                                        }
                                      >
                                        <option value="">
                                          Selecciona una respuesta rápida...
                                        </option>
                                        {respuestasRapidas.map((rr) => (
                                          <option
                                            key={rr.id_template}
                                            value={rr.id_template}
                                          >
                                            /{rr.atajo} —{" "}
                                            {(
                                              rr.tipo_mensaje || "text"
                                            ).toUpperCase()}
                                          </option>
                                        ))}
                                      </select>

                                      {rrSel && (
                                        <div
                                          style={{
                                            marginTop: 8,
                                            padding: "8px 10px",
                                            background: "#fff",
                                            border: "1px solid #e0f2fe",
                                            borderRadius: 8,
                                            fontSize: ".74rem",
                                            color: "#334155",
                                            display: "flex",
                                            gap: 8,
                                            alignItems: "flex-start",
                                          }}
                                        >
                                          <i
                                            className={`bx ${iconoTipoRR(rrSel.tipo_mensaje)}`}
                                            style={{
                                              fontSize: 16,
                                              color: "#0ea5e9",
                                              marginTop: 1,
                                            }}
                                          />
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div
                                              style={{
                                                fontWeight: 600,
                                                color: "#0c4a6e",
                                              }}
                                            >
                                              /{rrSel.atajo}
                                            </div>
                                            <div
                                              style={{
                                                marginTop: 2,
                                                color: "#475569",
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                              }}
                                            >
                                              {rrSel.mensaje ||
                                                (rrSel.file_name
                                                  ? `📎 ${rrSel.file_name}`
                                                  : "Sin texto")}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Estado destino — solo en el último */}
                            <div>
                              <div
                                style={{
                                  fontSize: ".78rem",
                                  fontWeight: 700,
                                  color: "#374151",
                                  marginBottom: 6,
                                }}
                              >
                                📂 Mover a columna al enviar
                                <span
                                  style={{
                                    fontWeight: 400,
                                    color: "#9ca3af",
                                    marginLeft: 4,
                                  }}
                                >
                                  (opcional)
                                </span>
                              </div>
                              <select
                                className="rm2-select"
                                value={sec.estado_destino}
                                onChange={(e) =>
                                  updateSec(
                                    idx,
                                    "estado_destino",
                                    e.target.value,
                                  )
                                }
                              >
                                <option value="">
                                  No mover (quedar en columna actual)
                                </option>
                                {columnasDestino.map((c) => (
                                  <option key={c.id} value={c.estado_db}>
                                    {c.nombre}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}

                  {secuencias.length < 3 && (
                    <button
                      className="rm2-add-btn"
                      type="button"
                      onClick={agregarSecuencia}
                    >
                      <i
                        className="bx bx-plus-circle"
                        style={{ fontSize: 16 }}
                      />
                      Agregar seguimiento {secuencias.length + 1} de 3
                    </button>
                  )}

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                      marginTop: 14,
                    }}
                  >
                    <div>
                      {configActiva && (
                        <button
                          type="button"
                          onClick={handleDesactivar}
                          disabled={desactivando}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "9px 14px",
                            borderRadius: 10,
                            border: "1.5px solid #fecaca",
                            background: "#fff5f5",
                            color: "#dc2626",
                            fontWeight: 600,
                            fontSize: ".82rem",
                            cursor: desactivando ? "not-allowed" : "pointer",
                            fontFamily: "inherit",
                            opacity: desactivando ? 0.5 : 1,
                          }}
                        >
                          {desactivando ? (
                            <>
                              <i
                                className="bx bx-loader-alt bx-spin"
                                style={{ fontSize: 13 }}
                              />{" "}
                              Desactivando...
                            </>
                          ) : (
                            <>
                              <i
                                className="bx bx-trash"
                                style={{ fontSize: 13 }}
                              />{" "}
                              Desactivar
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="rm2-btn-cancel"
                        type="button"
                        onClick={cerrarModal}
                      >
                        Cancelar
                      </button>
                      <button
                        className="rm2-btn-save"
                        type="button"
                        onClick={handleGuardar}
                        disabled={guardando || !formularioListo}
                      >
                        {guardando ? (
                          <>
                            <i
                              className="bx bx-loader-alt bx-spin"
                              style={{ fontSize: 14 }}
                            />{" "}
                            Guardando...
                          </>
                        ) : configActiva ? (
                          <>
                            <i
                              className="bx bx-refresh"
                              style={{ fontSize: 14 }}
                            />{" "}
                            Actualizar
                          </>
                        ) : (
                          <>
                            <i
                              className="bx bxs-zap"
                              style={{ fontSize: 14 }}
                            />{" "}
                            Activar remarketing
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RemarketingColumna;
