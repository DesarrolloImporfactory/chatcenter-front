// src/pages/dropi/DropisPlantillas.jsx
import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

const ESTADOS_DROPI = [
  "PENDIENTE CONFIRMACION",
  "CANCELADO",
  "CARRITOS ABANDONADOS",
  "PENDIENTE",
  "GUIA GENERADA",
  "EN TRANSITO",
  "RETIRO EN AGENCIA",
  "NOVEDAD",
  "ENTREGADA",
  "DEVOLUCION",
];

const ESTADO_ICONS = {
  "PENDIENTE CONFIRMACION": { icon: "bx bx-time", color: "#f59e0b" },
  "CANCELADO":              { icon: "bx bx-x-circle", color: "#ef4444" },
  "CARRITOS ABANDONADOS":   { icon: "bx bx-cart", color: "#f97316" },
  "PENDIENTE":              { icon: "bx bx-loader", color: "#eab308" },
  "GUIA GENERADA":          { icon: "bx bx-file", color: "#6366f1" },
  "EN TRANSITO":            { icon: "bx bx-car", color: "#3b82f6" },
  "RETIRO EN AGENCIA":      { icon: "bx bx-store", color: "#8b5cf6" },
  "NOVEDAD":                { icon: "bx bx-error", color: "#ec4899" },
  "ENTREGADA":              { icon: "bx bx-check-circle", color: "#10b981" },
  "DEVOLUCION":             { icon: "bx bx-undo", color: "#6b7280" },
};

const BG_DARK = "rgb(23, 25, 49)";

const DropisPlantillas = ({ id_configuracion }) => {
  const [showModal, setShowModal] = useState(false);
  const [plantillas, setPlantillas] = useState([]);
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(null); // estado que se está guardando
  const [totalActivos, setTotalActivos] = useState(0);

  // ── Verificar cuántos activos hay (para el badge del botón) ─
  useEffect(() => {
    if (!id_configuracion) return;
    chatApi
      .post("/dropi_plantillas/obtener", { id_configuracion })
      .then((res) => {
        if (res.data?.success) {
          const data = res.data.data;
          const activos = Object.values(data).filter((v) => v.activo).length;
          setTotalActivos(activos);
        }
      })
      .catch(() => {});
  }, [id_configuracion]);

  // ── Abrir modal ───────────────────────────────────────────
  const handleAbrir = async () => {
    setShowModal(true);
    setLoading(true);

    // Cargar plantillas y config en paralelo
    try {
      const [resPlantillas, resConfig] = await Promise.all([
        chatApi.post("whatsapp_managment/obtenerTemplatesWhatsapp", { id_configuracion }),
        chatApi.post("/dropi_plantillas/obtener", { id_configuracion }),
      ]);

      const rawPlantillas = resPlantillas.data?.data || [];
      setPlantillas(
        rawPlantillas.filter((t, i, s) => i === s.findIndex((x) => x.id === t.id))
      );

      if (resConfig.data?.success) {
        setConfig(resConfig.data.data);
        const activos = Object.values(resConfig.data.data).filter((v) => v.activo).length;
        setTotalActivos(activos);
      }
    } catch {
      Toast.fire({ icon: "error", title: "Error al cargar datos" });
    } finally {
      setLoading(false);
    }
  };

  const cerrarModal = () => setShowModal(false);

  // ── Guardar un estado ─────────────────────────────────────
  const guardarEstado = async (estado) => {
    const cfg = config[estado] || {};
    setGuardando(estado);
    try {
      await chatApi.post("/dropi_plantillas/guardar", {
        id_configuracion,
        estado_dropi: estado,
        nombre_template: cfg.nombre_template || null,
        language_code: cfg.language_code || "es",
        activo: cfg.activo ? 1 : 0,
      });
      Toast.fire({ icon: "success", title: "Guardado" });
      const activos = Object.values(config).filter((v) => v.activo).length;
      setTotalActivos(activos);
    } catch {
      Toast.fire({ icon: "error", title: "Error al guardar" });
    } finally {
      setGuardando(null);
    }
  };

  // ── Actualizar campo local ────────────────────────────────
  const updateConfig = (estado, field, value) => {
    setConfig((prev) => ({
      ...prev,
      [estado]: { ...prev[estado], [field]: value },
    }));
  };

  return (
    <>
      <style>{`
        @keyframes dp-fadeIn {
          from { opacity:0; transform:scale(.97) translateY(6px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }
        @keyframes dp-overlayIn { from{opacity:0} to{opacity:1} }
        @keyframes dp-shimmer {
          0%{background-position:-400px 0}
          100%{background-position:400px 0}
        }
        .dp-skeleton {
          background:linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);
          background-size:400px 100%;
          animation:dp-shimmer 1.4s infinite;
          border-radius:10px;
        }
        .dp-trigger-btn {
          display:inline-flex; align-items:center; gap:8px;
          padding:8px 16px; border-radius:12px;
          border:1.5px solid rgba(99,102,241,.3);
          background:rgba(99,102,241,.06);
          color:#4338ca; font-size:.82rem; font-weight:700;
          cursor:pointer; transition:all .18s; white-space:nowrap;
          font-family:inherit;
        }
        .dp-trigger-btn:hover {
          background:rgba(99,102,241,.12);
          border-color:rgba(99,102,241,.6);
          box-shadow:0 3px 12px rgba(99,102,241,.2);
          transform:translateY(-1px);
        }
        .dp-overlay {
          position:fixed; inset:0;
          background:rgba(10,10,20,.55);
          backdrop-filter:blur(4px);
          display:flex; align-items:center; justify-content:center;
          z-index:9999; padding:16px;
          animation:dp-overlayIn .2s ease;
        }
        .dp-modal {
          background:#fff;
          border-radius:18px;
          width:100%; max-width:640px;
          max-height:90vh;
          display:flex; flex-direction:column;
          box-shadow:0 32px 80px rgba(0,0,0,.22);
          animation:dp-fadeIn .25s ease;
          overflow:hidden;
        }
        .dp-header {
          background:${BG_DARK};
          padding:20px 24px;
          border-radius:18px 18px 0 0;
          flex-shrink:0;
        }
        .dp-body {
          padding:16px 24px 24px;
          overflow-y:auto;
          -webkit-overflow-scrolling:touch;
        }
        .dp-estado-card {
          border-radius:12px;
          border:1.5px solid #e5e7eb;
          background:#fafafa;
          margin-bottom:10px;
          overflow:hidden;
          transition:border-color .15s;
        }
        .dp-estado-card.activo {
          border-color:rgba(99,102,241,.3);
          background:rgba(99,102,241,.02);
        }
        .dp-estado-header {
          display:flex; align-items:center; justify-content:space-between;
          padding:11px 14px;
          cursor:pointer;
          user-select:none;
        }
        .dp-select {
          width:100%; padding:9px 12px; border-radius:10px;
          border:1.5px solid #e5e7eb; background:#fff;
          font-size:.83rem; color:#111827; outline:none;
          transition:border-color .2s;
          appearance:none;
          background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
          background-repeat:no-repeat; background-position:right 10px center;
          padding-right:32px; font-family:inherit; cursor:pointer;
        }
        .dp-select:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.1); }
        .dp-toggle {
          width:40px; height:22px; border-radius:999px;
          cursor:pointer; position:relative; transition:background .2s;
          flex-shrink:0;
        }
        .dp-toggle-knob {
          position:absolute; top:2px;
          width:18px; height:18px; border-radius:999px;
          background:#fff; box-shadow:0 2px 4px rgba(0,0,0,.2);
          transition:left .2s;
        }
        .dp-save-btn {
          display:inline-flex; align-items:center; gap:6px;
          padding:7px 14px; border-radius:9px; border:none;
          background:${BG_DARK}; color:#fff;
          font-weight:700; font-size:.78rem; cursor:pointer;
          transition:all .15s; font-family:inherit;
        }
        .dp-save-btn:hover:not(:disabled) { background:rgb(35,38,68); }
        .dp-save-btn:disabled { opacity:.5; cursor:not-allowed; }
        .dp-close-btn {
          width:28px; height:28px; border-radius:8px;
          border:1px solid rgba(255,255,255,.15);
          background:rgba(255,255,255,.08);
          color:rgba(255,255,255,.7); cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          transition:all .15s; font-family:inherit;
        }
        .dp-close-btn:hover { background:rgba(255,255,255,.18); color:#fff; }
      `}</style>

      {/* ── Botón disparador ── */}
      <button className="dp-trigger-btn" type="button" onClick={handleAbrir}>
        <i className="bx bx-package" style={{ fontSize: 15 }} />
        Plantillas Dropi
        {totalActivos > 0 && (
          <span style={{
            background: "#6366f1", color: "#fff",
            borderRadius: 999, fontSize: ".68rem",
            padding: "1px 7px", fontWeight: 700,
          }}>
            {totalActivos}
          </span>
        )}
      </button>

      {/* ── Modal ── */}
      {showModal && (
        <div
          className="dp-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) cerrarModal(); }}
        >
          <div className="dp-modal">

            {/* Header */}
            <div className="dp-header">
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{
                    width:36, height:36, borderRadius:10,
                    background:"rgba(255,255,255,.12)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                  }}>
                    <i className="bx bx-package" style={{ fontSize:20, color:"#fff" }} />
                  </div>
                  <div>
                    <div style={{ fontSize:".65rem", color:"rgba(255,255,255,.4)", fontWeight:600, textTransform:"uppercase", letterSpacing:".07em" }}>
                      Automatización
                    </div>
                    <h2 style={{ margin:0, fontSize:"1rem", fontWeight:700, color:"#fff", lineHeight:1.2 }}>
                      Plantillas por estado Dropi
                    </h2>
                  </div>
                </div>
                <button className="dp-close-btn" type="button" onClick={cerrarModal}>
                  <i className="bx bx-x" style={{ fontSize:16 }} />
                </button>
              </div>
              <p style={{ margin:"10px 0 0", fontSize:".76rem", color:"rgba(255,255,255,.5)", lineHeight:1.5 }}>
                Configura qué plantilla de WhatsApp se enviará automáticamente cuando el estado de un pedido Dropi cambie.
              </p>
            </div>

            {/* Body */}
            <div className="dp-body">
              {loading ? (
                <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:4 }}>
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="dp-skeleton" style={{ height:52 }} />
                  ))}
                </div>
              ) : (
                <>
                  <div style={{ fontSize:".75rem", color:"#94a3b8", fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", marginBottom:10, marginTop:4 }}>
                    Estados ({ESTADOS_DROPI.length})
                  </div>

                  {ESTADOS_DROPI.map((estado) => {
                    const cfg = config[estado] || { nombre_template: "", activo: 0 };
                    const meta = ESTADO_ICONS[estado] || { icon: "bx bx-circle", color: "#6b7280" };
                    const isActivo = !!cfg.activo;

                    return (
                      <div key={estado} className={`dp-estado-card ${isActivo ? "activo" : ""}`}>
                        {/* Header del estado */}
                        <div className="dp-estado-header">
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <div style={{
                              width:32, height:32, borderRadius:8,
                              background: isActivo ? `${meta.color}15` : "#f1f5f9",
                              display:"flex", alignItems:"center", justifyContent:"center",
                              flexShrink:0,
                            }}>
                              <i className={meta.icon} style={{ color: isActivo ? meta.color : "#94a3b8", fontSize:"1rem" }} />
                            </div>
                            <div>
                              <div style={{ fontWeight:700, fontSize:".83rem", color:"#0f172a" }}>
                                {estado}
                              </div>
                              {isActivo && cfg.nombre_template && (
                                <div style={{ fontSize:".7rem", color:"#6366f1", marginTop:1 }}>
                                  {cfg.nombre_template}
                                </div>
                              )}
                              {isActivo && !cfg.nombre_template && (
                                <div style={{ fontSize:".7rem", color:"#f59e0b", marginTop:1 }}>
                                  ⚠️ Sin plantilla seleccionada
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Toggle activo */}
                          <div
                            className="dp-toggle"
                            style={{ background: isActivo ? "#6366f1" : "#cbd5e1" }}
                            onClick={() => updateConfig(estado, "activo", isActivo ? 0 : 1)}
                          >
                            <div
                              className="dp-toggle-knob"
                              style={{ left: isActivo ? 20 : 2 }}
                            />
                          </div>
                        </div>

                        {/* Selector de plantilla (solo si activo) */}
                        {isActivo && (
                          <div style={{ padding:"0 14px 14px" }}>
                            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                              <select
                                className="dp-select"
                                value={cfg.nombre_template || ""}
                                onChange={(e) => updateConfig(estado, "nombre_template", e.target.value)}
                              >
                                <option value="">Selecciona una plantilla</option>
                                {plantillas.map((tpl) => (
                                  <option key={tpl.id} value={tpl.name}>
                                    {tpl.name}{tpl.status !== "APPROVED" ? " — No aprobada" : ""}
                                  </option>
                                ))}
                              </select>
                              <button
                                className="dp-save-btn"
                                disabled={guardando === estado}
                                onClick={() => guardarEstado(estado)}
                              >
                                {guardando === estado ? (
                                  <><i className="bx bx-loader-alt bx-spin" style={{ fontSize:13 }} /> Guardando</>
                                ) : (
                                  <><i className="bx bx-save" style={{ fontSize:13 }} /> Guardar</>
                                )}
                              </button>
                            </div>
                            {cfg.nombre_template && (
                              <div style={{ marginTop:6, display:"flex", alignItems:"center", gap:6 }}>
                                {plantillas.find(p => p.name === cfg.nombre_template)?.status === "APPROVED" ? (
                                  <>
                                    <span style={{ width:7, height:7, borderRadius:"50%", background:"#22c55e", flexShrink:0, display:"inline-block" }} />
                                    <span style={{ fontSize:".72rem", color:"#15803d" }}>Plantilla aprobada por Meta</span>
                                  </>
                                ) : (
                                  <>
                                    <span style={{ width:7, height:7, borderRadius:"50%", background:"#f59e0b", flexShrink:0, display:"inline-block" }} />
                                    <span style={{ fontSize:".72rem", color:"#92400e" }}>Plantilla no aprobada — no se enviará</span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Guardar al desactivar */}
                        {!isActivo && config[estado] !== undefined && (
                          <div style={{ padding:"0 14px 10px", display:"flex", justifyContent:"flex-end" }}>
                            <button
                              className="dp-save-btn"
                              disabled={guardando === estado}
                              onClick={() => guardarEstado(estado)}
                              style={{ background:"#64748b" }}
                            >
                              {guardando === estado ? (
                                <><i className="bx bx-loader-alt bx-spin" style={{ fontSize:13 }} /> Guardando</>
                              ) : (
                                <><i className="bx bx-save" style={{ fontSize:13 }} /> Guardar</>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DropisPlantillas;