import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import chatApi from "../../../api/chatcenter";
import { Z_INDEX_FIX, Toast, SwitchRow, lbl, inp } from "../EditorShared";
import {
  LIMITES_WHATSAPP,
  formatDeTipoRapida,
  validarPesoCliente,
  subirMediaCatalogo,
} from "../catalogoMediaUpload";

// ════════════════════════════════════════════════════════════════
// ModalCatalogoItem — crea/edita un item de catálogo (setup custom).
// Un solo modal para los 4 tipos. El body del form cambia por `tipo`.
//
// Props:
//   tipo                "templates_meta" | "respuestas_rapidas"
//                       | "remarketing" | "dropi_config"
//   modo                "crear" | "editar"
//   customId            id de kanban_catalogo_items (solo editar)
//   templatesDisponibles  [keys de templates_meta] para los selects
//   columnasDisponibles   [estado_db de la plantilla] para datalists
//   onClose()           cierra sin guardar
//   onSaved()           guardó ok → el padre recarga catálogo
// ════════════════════════════════════════════════════════════════

const META_TIPO = {
  templates_meta: { titulo: "Plantilla de WhatsApp (Meta)", color: "#10b981" },
  respuestas_rapidas: { titulo: "Respuesta rápida", color: "#6366f1" },
  remarketing: { titulo: "Secuencia de remarketing", color: "#ca8a04" },
  dropi_config: { titulo: "Estado de Dropi", color: "#ea580c" },
};

// ── form vacío por tipo ──
const formInicial = (tipo) => {
  if (tipo === "templates_meta")
    return {
      name: "",
      language: "es",
      category: "MARKETING",
      headerTipo: "none",
      headerTexto: "",
      headerMediaUrl: "",
      body: "",
      botones: [],
    };
  if (tipo === "respuestas_rapidas")
    return {
      atajo: "",
      mensaje: "",
      tipo_mensaje: "text",
      ruta_archivo: "",
      file_name: "",
    };
  if (tipo === "remarketing")
    return {
      estado_contacto: "",
      nombre_template: "",
      secuencia: 1,
      tiempo_espera_horas: 24,
      metodo_dentro_24h: "ia",
      prompt_ia: "",
      estado_destino: "",
    };
  // dropi_config
  return {
    estado_dropi: "",
    usar_respuesta_rapida: false,
    mensaje_rapido: "",
    nombre_template: "",
    columna_destino: "",
    activo: true,
  };
};

// ── raw data (de la BD) → form ──
const dataToForm = (tipo, d) => {
  if (!d) return formInicial(tipo);
  if (tipo === "templates_meta") {
    const comps = d.components || [];
    const header = comps.find((c) => c.type === "HEADER");
    const body = comps.find((c) => c.type === "BODY");
    const btns = comps.find((c) => c.type === "BUTTONS");
    const esMedia =
      header && ["IMAGE", "VIDEO", "DOCUMENT"].includes(header.format);
    return {
      name: d.name || "",
      language: d.language || "es",
      category: d.category || "MARKETING",
      headerTipo: header ? (esMedia ? header.format : "TEXT") : "none",
      headerTexto: header && !esMedia ? header.text || "" : "",
      headerMediaUrl: esMedia ? header?.example?.header_handle?.[0] || "" : "",
      body: body?.text || "",
      botones: (btns?.buttons || []).map((b) => ({
        type: b.type || "QUICK_REPLY",
        text: b.text || "",
        url: b.url || "",
      })),
    };
  }
  if (tipo === "respuestas_rapidas")
    return {
      atajo: d.atajo || "",
      mensaje: d.mensaje || "",
      tipo_mensaje: d.tipo_mensaje || "text",
      ruta_archivo: d.ruta_archivo || "",
      file_name: d.file_name || "",
    };
  if (tipo === "remarketing")
    return {
      estado_contacto: d.estado_contacto || "",
      nombre_template: d.nombre_template || "",
      secuencia: d.secuencia ?? 1,
      tiempo_espera_horas: d.tiempo_espera_horas ?? 24,
      metodo_dentro_24h: d.metodo_dentro_24h || "ia",
      prompt_ia: d.prompt_ia || "",
      estado_destino: d.estado_destino || "",
    };
  return {
    estado_dropi: d.estado_dropi || "",
    usar_respuesta_rapida: !!d.usar_respuesta_rapida,
    mensaje_rapido: d.mensaje_rapido || "",
    nombre_template: d.nombre_template || "",
    columna_destino: d.columna_destino || "",
    activo: d.activo == null ? true : !!d.activo,
  };
};

// ── form → raw data (lo que se manda al backend) ──
const formToData = (tipo, f) => {
  if (tipo === "templates_meta") {
    const components = [];
    if (f.headerTipo === "TEXT" && f.headerTexto.trim()) {
      components.push({
        type: "HEADER",
        format: "TEXT",
        text: f.headerTexto.trim(),
      });
    } else if (
      ["IMAGE", "VIDEO", "DOCUMENT"].includes(f.headerTipo) &&
      f.headerMediaUrl.trim()
    ) {
      components.push({
        type: "HEADER",
        format: f.headerTipo,
        example: { header_handle: [f.headerMediaUrl.trim()] },
      });
    }
    components.push({ type: "BODY", text: f.body });
    const botonesLimpios = (f.botones || []).filter((b) => b.text.trim());
    if (botonesLimpios.length) {
      components.push({
        type: "BUTTONS",
        buttons: botonesLimpios.map((b) =>
          b.type === "URL"
            ? { type: "URL", text: b.text.trim(), url: b.url.trim() }
            : { type: "QUICK_REPLY", text: b.text.trim() },
        ),
      });
    }
    return {
      name: f.name.trim(),
      language: f.language || "es",
      category: f.category || "MARKETING",
      components,
    };
  }
  if (tipo === "respuestas_rapidas")
    return {
      atajo: f.atajo.trim(),
      mensaje: f.mensaje,
      tipo_mensaje: f.tipo_mensaje || "text",
      ruta_archivo: f.ruta_archivo.trim() || null,
      file_name: f.file_name.trim() || null,
    };
  if (tipo === "remarketing")
    return {
      estado_contacto: f.estado_contacto.trim(),
      nombre_template: f.nombre_template.trim(),
      secuencia: Number(f.secuencia) || 1,
      tiempo_espera_horas: Number(f.tiempo_espera_horas) || 24,
      language_code: "es",
      metodo_dentro_24h: f.metodo_dentro_24h || "ia",
      prompt_ia: f.metodo_dentro_24h === "ia" ? f.prompt_ia : null,
      estado_destino: f.estado_destino.trim() || null,
    };
  return {
    estado_dropi: f.estado_dropi.trim(),
    nombre_template: f.usar_respuesta_rapida ? null : f.nombre_template.trim(),
    columna_destino: f.columna_destino.trim() || null,
    activo: f.activo ? 1 : 0,
    usar_respuesta_rapida: !!f.usar_respuesta_rapida,
    mensaje_rapido: f.usar_respuesta_rapida ? f.mensaje_rapido : null,
  };
};

// ── validación mínima en cliente (el back valida a fondo) ──
const validar = (tipo, f) => {
  if (tipo === "templates_meta") {
    if (!f.name.trim()) return "El nombre es obligatorio";
    if (!/^[a-z0-9_]+$/.test(f.name.trim()))
      return "El nombre solo admite minúsculas, números y _";
    if (!f.body.trim()) return "El cuerpo (body) es obligatorio";
  }
  if (tipo === "respuestas_rapidas") {
    if (!f.atajo.trim()) return "El atajo es obligatorio";
    if (!f.mensaje.trim() && !f.ruta_archivo.trim())
      return "Escribe un mensaje o una URL de media";
  }
  if (tipo === "remarketing") {
    if (!f.estado_contacto.trim())
      return "El estado de contacto es obligatorio";
    if (!f.nombre_template.trim()) return "Elige la plantilla (fuera de 24h)";
    if (f.tiempo_espera_horas === "" || isNaN(Number(f.tiempo_espera_horas)))
      return "El tiempo de espera (horas) es obligatorio";
  }
  if (tipo === "dropi_config") {
    if (!f.estado_dropi.trim()) return "El estado de Dropi es obligatorio";
    if (!f.usar_respuesta_rapida && !f.nombre_template.trim())
      return "Elige una plantilla o activa 'usar respuesta rápida'";
    if (f.usar_respuesta_rapida && !f.mensaje_rapido.trim())
      return "Escribe el mensaje de la respuesta rápida";
  }
  return null;
};

const ModalCatalogoItem = ({
  tipo,
  modo = "crear",
  customId = null,
  templatesDisponibles = [],
  columnasDisponibles = [],
  onClose,
  onSaved,
}) => {
  const [form, setForm] = useState(formInicial(tipo));
  const [cargando, setCargando] = useState(modo === "editar");
  const [guardando, setGuardando] = useState(false);
  const meta = META_TIPO[tipo];
  const set = (campo, valor) => setForm((p) => ({ ...p, [campo]: valor }));

  // En editar: traer el data crudo de la fila
  useEffect(() => {
    if (modo !== "editar" || !customId) return;
    let cancelado = false;
    (async () => {
      try {
        const { data } = await chatApi.post(
          "/kanban_plantillas_admin/catalogo_item_listar",
          { tipo, incluir_inactivos: true },
        );
        if (cancelado) return;
        const fila = (data?.data || []).find((r) => r.id === customId);
        if (fila) setForm(dataToForm(tipo, fila.data));
      } catch (err) {
        Toast.fire({ icon: "error", title: "No se pudo cargar el item" });
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [modo, customId, tipo]);

  const guardar = async () => {
    const err = validar(tipo, form);
    if (err) {
      Swal.fire({
        icon: "warning",
        title: err,
        confirmButtonColor: "#f59e0b",
        ...Z_INDEX_FIX,
      });
      return;
    }
    const dataObj = formToData(tipo, form);
    setGuardando(true);
    try {
      if (modo === "editar") {
        await chatApi.post(
          "/kanban_plantillas_admin/catalogo_item_actualizar",
          {
            id: customId,
            data: dataObj,
          },
        );
      } else {
        await chatApi.post("/kanban_plantillas_admin/catalogo_item_crear", {
          tipo,
          data: dataObj,
        });
      }
      Toast.fire({ icon: "success", title: "Item guardado" });
      onSaved?.();
      onClose();
    } catch (e) {
      const msg = e?.response?.data?.message || "Error al guardar";
      Swal.fire({
        icon: "error",
        title: msg,
        confirmButtonColor: "#ef4444",
        ...Z_INDEX_FIX,
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,10,20,.6)",
        backdropFilter: "blur(3px)",
        zIndex: 9600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          width: "100%",
          maxWidth: tipo === "templates_meta" ? 860 : 560,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 30px 80px rgba(0,0,0,.4)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid rgba(0,0,0,.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: `${meta.color}0d`,
          }}
        >
          <div>
            <div
              style={{
                fontSize: ".66rem",
                fontWeight: 700,
                color: meta.color,
                textTransform: "uppercase",
                letterSpacing: ".06em",
              }}
            >
              {modo === "editar" ? "Editar" : "Nuevo"} · custom
            </div>
            <div
              style={{ fontSize: "1.02rem", fontWeight: 800, color: "#0f172a" }}
            >
              {meta.titulo}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              border: "1px solid rgba(0,0,0,.1)",
              background: "#fff",
              color: "#64748b",
              cursor: "pointer",
            }}
          >
            <i className="bx bx-x" style={{ fontSize: 20 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {cargando ? (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>
              <i
                className="bx bx-loader-alt bx-spin"
                style={{ fontSize: 28 }}
              />{" "}
              Cargando…
            </div>
          ) : tipo === "respuestas_rapidas" ? (
            <FormRapida form={form} set={set} />
          ) : tipo === "dropi_config" ? (
            <FormDropi
              form={form}
              set={set}
              templates={templatesDisponibles}
              columnas={columnasDisponibles}
            />
          ) : tipo === "remarketing" ? (
            <FormRemarketing
              form={form}
              set={set}
              templates={templatesDisponibles}
              columnas={columnasDisponibles}
            />
          ) : (
            <FormTemplate form={form} set={set} />
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid rgba(0,0,0,.07)",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <button
            onClick={onClose}
            disabled={guardando}
            style={{
              padding: "9px 16px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,.12)",
              background: "#fff",
              color: "#475569",
              fontWeight: 700,
              fontSize: ".84rem",
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando || cargando}
            style={{
              padding: "9px 18px",
              borderRadius: 10,
              border: "none",
              background: meta.color,
              color: "#fff",
              fontWeight: 800,
              fontSize: ".84rem",
              cursor: guardando ? "not-allowed" : "pointer",
              opacity: guardando ? 0.6 : 1,
            }}
          >
            {guardando ? (
              <>
                <i className="bx bx-loader-alt bx-spin" /> Guardando…
              </>
            ) : (
              <>
                <i className="bx bx-save" /> Guardar item
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// Forms por tipo
// ════════════════════════════════════════════════════════════════
const Datalist = ({ id, opciones }) => (
  <datalist id={id}>
    {opciones.map((o) => (
      <option key={o} value={o} />
    ))}
  </datalist>
);

const FormRapida = ({ form, set }) => {
  const [subiendo, setSubiendo] = useState(false);
  const [modoMedia, setModoMedia] = useState("url"); // "url" | "archivo"

  const esMedia = form.tipo_mensaje !== "text";
  const format = formatDeTipoRapida(form.tipo_mensaje);
  const lim = LIMITES_WHATSAPP[format] || LIMITES_WHATSAPP.DOCUMENT;

  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1) Chequeo de peso en cliente (antes de subir)
    const err = validarPesoCliente(file, format);
    if (err) {
      Swal.fire({
        icon: "warning",
        title: err,
        confirmButtonColor: "#f59e0b",
        ...Z_INDEX_FIX,
      });
      e.target.value = "";
      return;
    }

    // 2) Subir (el back vuelve a validar peso + MIME para respuesta rápida)
    setSubiendo(true);
    try {
      const data = await subirMediaCatalogo(file, {
        modo: "respuesta_rapida",
        format,
      });
      set("ruta_archivo", data.url);
      set("file_name", data.file_name || file.name);
      Toast.fire({ icon: "success", title: "Archivo subido" });
    } catch (e2) {
      const msg =
        e2?.response?.data?.message ||
        e2.message ||
        "Error al subir el archivo";
      Swal.fire({
        icon: "error",
        title: msg,
        confirmButtonColor: "#ef4444",
        ...Z_INDEX_FIX,
      });
    } finally {
      setSubiendo(false);
      e.target.value = "";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <label style={lbl}>Atajo (clave única)</label>
        <input
          value={form.atajo}
          onChange={(e) => set("atajo", e.target.value)}
          style={{ ...inp, fontFamily: "monospace" }}
          placeholder="/saludo"
        />
      </div>

      <div>
        <label style={lbl}>Tipo</label>
        <select
          value={form.tipo_mensaje}
          onChange={(e) => set("tipo_mensaje", e.target.value)}
          style={inp}
        >
          <option value="text">Texto</option>
          <option value="image">Imagen</option>
          <option value="video">Video</option>
          <option value="audio">Audio</option>
          <option value="document">Documento</option>
        </select>
      </div>

      <div>
        <label style={lbl}>
          Mensaje{" "}
          {esMedia && (
            <span
              style={{ fontWeight: 400, color: "#94a3b8", fontSize: ".75rem" }}
            >
              (texto que acompaña al archivo — opcional)
            </span>
          )}
        </label>
        <textarea
          value={form.mensaje}
          onChange={(e) => set("mensaje", e.target.value)}
          style={{ ...inp, minHeight: 90, resize: "vertical" }}
          placeholder="Texto de la respuesta rápida…"
        />
      </div>

      {esMedia && (
        <div
          style={{
            border: "1px solid rgba(0,0,0,.1)",
            borderRadius: 12,
            padding: 12,
            background: "#fafafa",
          }}
        >
          {/* Switch URL / Archivo */}
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {[
              { k: "url", label: "Pegar URL", ic: "bx bx-link" },
              { k: "archivo", label: "Subir archivo", ic: "bx bx-upload" },
            ].map((o) => (
              <button
                key={o.k}
                onClick={() => setModoMedia(o.k)}
                style={{
                  flex: 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "7px 10px",
                  borderRadius: 9,
                  border:
                    modoMedia === o.k
                      ? "1.5px solid #6366f1"
                      : "1px solid rgba(0,0,0,.12)",
                  background: modoMedia === o.k ? "#eef2ff" : "#fff",
                  color: modoMedia === o.k ? "#4338ca" : "#64748b",
                  fontWeight: 700,
                  fontSize: ".78rem",
                  cursor: "pointer",
                }}
              >
                <i className={o.ic} /> {o.label}
              </button>
            ))}
          </div>

          {/* Aviso de límite */}
          <div
            style={{
              fontSize: ".72rem",
              color: "#64748b",
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <i className="bx bx-info-circle" style={{ color: "#6366f1" }} />
            Límite WhatsApp para {lim.label}: <strong>{lim.maxMB}MB</strong>.
          </div>

          {modoMedia === "url" ? (
            <>
              <input
                value={form.ruta_archivo}
                onChange={(e) => set("ruta_archivo", e.target.value)}
                style={inp}
                placeholder="https://… (URL pública del archivo)"
              />
              <input
                value={form.file_name}
                onChange={(e) => set("file_name", e.target.value)}
                style={{ ...inp, marginTop: 8 }}
                placeholder="Nombre del archivo (opcional)"
              />
            </>
          ) : (
            <div>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 14px",
                  borderRadius: 9,
                  border: "1.5px dashed #6366f1",
                  background: "#fff",
                  color: "#4338ca",
                  fontWeight: 700,
                  fontSize: ".8rem",
                  cursor: subiendo ? "wait" : "pointer",
                }}
              >
                {subiendo ? (
                  <>
                    <i className="bx bx-loader-alt bx-spin" /> Subiendo…
                  </>
                ) : (
                  <>
                    <i className="bx bx-upload" /> Elegir {lim.label}
                  </>
                )}
                <input
                  type="file"
                  accept={lim.accept}
                  onChange={onPickFile}
                  disabled={subiendo}
                  style={{ display: "none" }}
                />
              </label>
            </div>
          )}

          {/* Preview de lo cargado */}
          {form.ruta_archivo && (
            <div
              style={{
                marginTop: 10,
                padding: "8px 10px",
                borderRadius: 8,
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                fontSize: ".74rem",
                color: "#15803d",
                display: "flex",
                alignItems: "center",
                gap: 7,
                wordBreak: "break-all",
              }}
            >
              <i className="bx bx-check-circle" style={{ flexShrink: 0 }} />
              <a
                href={form.ruta_archivo}
                target="_blank"
                rel="noreferrer"
                style={{ color: "#15803d", textDecoration: "underline" }}
              >
                {form.file_name || form.ruta_archivo}
              </a>
              <button
                onClick={() => {
                  set("ruta_archivo", "");
                  set("file_name", "");
                }}
                title="Quitar"
                style={{
                  marginLeft: "auto",
                  background: "none",
                  border: "none",
                  color: "#ef4444",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <i className="bx bx-x" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const FormDropi = ({ form, set, templates, columnas }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <div>
      <label style={lbl}>Estado de Dropi (clave)</label>
      <input
        value={form.estado_dropi}
        onChange={(e) => set("estado_dropi", e.target.value)}
        style={{ ...inp, fontFamily: "monospace" }}
        placeholder="GUIA_GENERADA"
      />
    </div>
    <div>
      <label style={lbl}>Mueve a columna (estado_db)</label>
      <input
        list="dl-cols-dropi"
        value={form.columna_destino}
        onChange={(e) => set("columna_destino", e.target.value)}
        style={{ ...inp, fontFamily: "monospace" }}
        placeholder="contacto_inicial"
      />
      <Datalist id="dl-cols-dropi" opciones={columnas} />
    </div>
    <SwitchRow
      label="Usar respuesta rápida en vez de plantilla Meta"
      checked={form.usar_respuesta_rapida}
      onChange={(v) => set("usar_respuesta_rapida", v)}
      desc="Si está dentro de 24h se manda texto libre; si no, igual necesita plantilla."
      colorOn="#ea580c"
    />
    {form.usar_respuesta_rapida ? (
      <div>
        <label style={lbl}>Mensaje rápido</label>
        <textarea
          value={form.mensaje_rapido}
          onChange={(e) => set("mensaje_rapido", e.target.value)}
          style={{ ...inp, minHeight: 90, resize: "vertical" }}
          placeholder="Tu pedido ya tiene guía…"
        />
      </div>
    ) : (
      <div>
        <label style={lbl}>Plantilla Meta a disparar</label>
        <input
          list="dl-tpl-dropi"
          value={form.nombre_template}
          onChange={(e) => set("nombre_template", e.target.value)}
          style={{ ...inp, fontFamily: "monospace" }}
          placeholder="nombre_de_plantilla"
        />
        <Datalist id="dl-tpl-dropi" opciones={templates} />
      </div>
    )}
    <SwitchRow
      label="Activo"
      checked={form.activo}
      onChange={(v) => set("activo", v)}
      colorOn="#16a34a"
    />
  </div>
);

const FormRemarketing = ({ form, set, templates, columnas }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <div>
      <label style={lbl}>Estado de contacto (columna donde dispara)</label>
      <input
        list="dl-cols-rmk"
        value={form.estado_contacto}
        onChange={(e) => set("estado_contacto", e.target.value)}
        style={{ ...inp, fontFamily: "monospace" }}
        placeholder="contacto_inicial"
      />
      <Datalist id="dl-cols-rmk" opciones={columnas} />
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <div>
        <label style={lbl}>N° de secuencia</label>
        <input
          type="number"
          min={1}
          value={form.secuencia}
          onChange={(e) => set("secuencia", e.target.value)}
          style={inp}
        />
      </div>
      <div>
        <label style={lbl}>Espera (horas)</label>
        <input
          type="number"
          min={0}
          step={1}
          value={form.tiempo_espera_horas}
          onChange={(e) => set("tiempo_espera_horas", e.target.value)}
          style={inp}
        />
      </div>
    </div>
    <div>
      <label style={lbl}>Plantilla fuera de 24h</label>
      <input
        list="dl-tpl-rmk"
        value={form.nombre_template}
        onChange={(e) => set("nombre_template", e.target.value)}
        style={{ ...inp, fontFamily: "monospace" }}
        placeholder="nombre_de_plantilla"
      />
      <Datalist id="dl-tpl-rmk" opciones={templates} />
    </div>
    <div>
      <label style={lbl}>Método dentro de 24h</label>
      <select
        value={form.metodo_dentro_24h}
        onChange={(e) => set("metodo_dentro_24h", e.target.value)}
        style={inp}
      >
        <option value="ia">IA redacta el mensaje</option>
        <option value="template">Solo plantilla</option>
      </select>
    </div>
    {form.metodo_dentro_24h === "ia" && (
      <div>
        <label style={lbl}>Prompt de la IA (dentro de 24h)</label>
        <textarea
          value={form.prompt_ia}
          onChange={(e) => set("prompt_ia", e.target.value)}
          style={{ ...inp, minHeight: 110, resize: "vertical" }}
          placeholder="Recuérdale amablemente al cliente que continúe…"
        />
      </div>
    )}
    <div>
      <label style={lbl}>Estado destino al enviar (opcional)</label>
      <input
        list="dl-cols-rmk2"
        value={form.estado_destino}
        onChange={(e) => set("estado_destino", e.target.value)}
        style={{ ...inp, fontFamily: "monospace" }}
        placeholder="(dejar vacío para no mover)"
      />
      <Datalist id="dl-cols-rmk2" opciones={columnas} />
    </div>
  </div>
);

const FormTemplate = ({ form, set }) => {
  const addBoton = () =>
    set("botones", [
      ...form.botones,
      { type: "QUICK_REPLY", text: "", url: "" },
    ]);
  const updBoton = (i, campo, v) =>
    set(
      "botones",
      form.botones.map((b, j) => (i === j ? { ...b, [campo]: v } : b)),
    );
  const delBoton = (i) =>
    set(
      "botones",
      form.botones.filter((_, j) => j !== i),
    );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 18 }}>
      {/* Columna form */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 100px 1fr",
            gap: 10,
          }}
        >
          <div>
            <label style={lbl}>Nombre (clave Meta)</label>
            <input
              value={form.name}
              onChange={(e) =>
                set(
                  "name",
                  e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
                )
              }
              style={{ ...inp, fontFamily: "monospace" }}
              placeholder="bienvenida_cliente"
            />
          </div>
          <div>
            <label style={lbl}>Idioma</label>
            <input
              value={form.language}
              onChange={(e) => set("language", e.target.value)}
              style={inp}
              placeholder="es"
            />
          </div>
          <div>
            <label style={lbl}>Categoría</label>
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              style={inp}
            >
              <option value="MARKETING">MARKETING</option>
              <option value="UTILITY">UTILITY</option>
              <option value="AUTHENTICATION">AUTHENTICATION</option>
            </select>
          </div>
        </div>

        <div>
          <label style={lbl}>Cabecera (header)</label>
          <select
            value={form.headerTipo}
            onChange={(e) => set("headerTipo", e.target.value)}
            style={inp}
          >
            <option value="none">Sin cabecera</option>
            <option value="TEXT">Texto</option>
            <option value="IMAGE">Imagen</option>
            <option value="VIDEO">Video</option>
            <option value="DOCUMENT">Documento</option>
          </select>
          {form.headerTipo === "TEXT" && (
            <input
              value={form.headerTexto}
              onChange={(e) => set("headerTexto", e.target.value)}
              style={{ ...inp, marginTop: 8 }}
              placeholder="Texto de la cabecera"
            />
          )}
          {["IMAGE", "VIDEO", "DOCUMENT"].includes(form.headerTipo) && (
            <input
              value={form.headerMediaUrl}
              onChange={(e) => set("headerMediaUrl", e.target.value)}
              style={{ ...inp, marginTop: 8 }}
              placeholder="URL del media (estable, no la de WhatsApp)"
            />
          )}
        </div>

        <div>
          <label style={lbl}>Cuerpo (body)</label>
          <textarea
            value={form.body}
            onChange={(e) => set("body", e.target.value)}
            style={{ ...inp, minHeight: 130, resize: "vertical" }}
            placeholder="Hola, gracias por escribirnos…"
          />
          <div style={{ fontSize: ".7rem", color: "#94a3b8", marginTop: 4 }}>
            Si usas variables tipo {"{{1}}"} Meta pedirá un ejemplo — para
            pruebas, empieza sin variables.
          </div>
        </div>

        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <label style={{ ...lbl, marginBottom: 0 }}>
              Botones (opcional)
            </label>
            <button
              onClick={addBoton}
              style={{
                fontSize: ".72rem",
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: 8,
                border: "1px solid #10b98144",
                background: "#10b9810d",
                color: "#10b981",
                cursor: "pointer",
              }}
            >
              <i className="bx bx-plus" /> Botón
            </button>
          </div>
          {form.botones.map((b, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 6,
                marginBottom: 6,
                alignItems: "center",
              }}
            >
              <select
                value={b.type}
                onChange={(e) => updBoton(i, "type", e.target.value)}
                style={{ ...inp, width: 130 }}
              >
                <option value="QUICK_REPLY">Respuesta</option>
                <option value="URL">URL</option>
              </select>
              <input
                value={b.text}
                onChange={(e) => updBoton(i, "text", e.target.value)}
                style={inp}
                placeholder="Texto"
              />
              {b.type === "URL" && (
                <input
                  value={b.url}
                  onChange={(e) => updBoton(i, "url", e.target.value)}
                  style={inp}
                  placeholder="https://…"
                />
              )}
              <button
                onClick={() => delBoton(i)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#ef4444",
                  cursor: "pointer",
                  padding: 6,
                }}
              >
                <i className="bx bx-trash" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Columna preview WhatsApp */}
      <div>
        <label style={lbl}>Vista previa</label>
        <div
          style={{
            background: "#e5ddd5",
            borderRadius: 12,
            padding: 14,
            minHeight: 200,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 10,
              padding: 10,
              boxShadow: "0 1px 2px rgba(0,0,0,.15)",
              maxWidth: 280,
            }}
          >
            {form.headerTipo === "TEXT" && form.headerTexto && (
              <div
                style={{
                  fontWeight: 700,
                  fontSize: ".82rem",
                  marginBottom: 6,
                  color: "#111",
                }}
              >
                {form.headerTexto}
              </div>
            )}
            {["IMAGE", "VIDEO", "DOCUMENT"].includes(form.headerTipo) && (
              <div
                style={{
                  background: "#f1f5f9",
                  borderRadius: 8,
                  height: 90,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#94a3b8",
                  marginBottom: 6,
                }}
              >
                <i
                  className={
                    form.headerTipo === "IMAGE"
                      ? "bx bx-image"
                      : form.headerTipo === "VIDEO"
                        ? "bx bx-video"
                        : "bx bx-file"
                  }
                  style={{ fontSize: 28 }}
                />
              </div>
            )}
            <div
              style={{
                fontSize: ".82rem",
                color: "#111",
                whiteSpace: "pre-wrap",
                lineHeight: 1.45,
              }}
            >
              {form.body || (
                <span style={{ color: "#9ca3af" }}>(cuerpo del mensaje)</span>
              )}
            </div>
            {form.botones.filter((b) => b.text.trim()).length > 0 && (
              <div
                style={{
                  borderTop: "1px solid #eee",
                  marginTop: 8,
                  paddingTop: 6,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                {form.botones
                  .filter((b) => b.text.trim())
                  .map((b, i) => (
                    <div
                      key={i}
                      style={{
                        textAlign: "center",
                        color: "#0096de",
                        fontSize: ".8rem",
                        fontWeight: 600,
                        padding: "4px 0",
                      }}
                    >
                      {b.type === "URL" && (
                        <i
                          className="bx bx-link-external"
                          style={{ marginRight: 4 }}
                        />
                      )}
                      {b.text}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalCatalogoItem;
