import React, { useState } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";
import { SwitchRow, Z_INDEX_FIX } from "./EditorShared";
import ModalCatalogoItem from "./modales/ModalCatalogoItem";
import ModalTemplateCatalogo from "./modales/ModalTemplateCatalogo";

// ════════════════════════════════════════════════════════════════
// TabAutomatizacion — cada bloque: master + "+ Nuevo" + checklist.
// Items custom traen editar/eliminar; los de fábrica solo "ver".
// Para templates_meta se usa TU CrearPlantillaModal (vía wrapper):
// solo crear + eliminar (Meta no deja editar plantillas aprobadas).
// ════════════════════════════════════════════════════════════════
const AUTOMATIZACIONES = [
  {
    campo: "templates_meta",
    label: "Plantillas de WhatsApp (Meta)",
    desc: "Plantillas de mensaje que se crean en la cuenta de Meta del cliente al aplicar el tablero. Marca cuáles enviar a crear.",
    colorOn: "#10b981",
    itemNoun: "plantilla",
  },
  {
    campo: "dropi_config",
    label: "Configuración Dropi",
    desc: "Mapeo estado de Dropi → columna + plantilla. Marca qué estados aplicar. Solo tableros COD/Dropi.",
    colorOn: "#ea580c",
    itemNoun: "estado",
  },
  {
    campo: "remarketing",
    label: "Remarketing automático",
    desc: "Secuencias de seguimiento sobre la columna de contacto inicial. Marca qué secuencias crear.",
    colorOn: "#ca8a04",
    itemNoun: "secuencia",
  },
  {
    campo: "respuestas_rapidas",
    label: "Respuestas rápidas",
    desc: "Atajos de respuestas predefinidas. Marca cuáles crear para el cliente.",
    colorOn: "#6366f1",
    itemNoun: "respuesta",
  },
];

const TabAutomatizacion = ({
  setup,
  catalogo,
  onToggle,
  onToggleItem,
  onSetTodos,
  recargarCatalogo,
  columnasDisponibles = [],
}) => {
  // Modal genérico (rápidas / dropi / remarketing)
  const [modal, setModal] = useState(null); // { tipo, modo, customId } | null
  // Modal de plantilla Meta (tu CrearPlantillaModal)
  const [modalTpl, setModalTpl] = useState(false);

  const templatesDisponibles = (catalogo?.templates_meta || []).map(
    (t) => t.key,
  );

  const abrirNuevo = (tipo) => {
    if (tipo === "templates_meta") setModalTpl(true);
    else setModal({ tipo, modo: "crear", customId: null });
  };
  const abrirEditar = (tipo, customId) =>
    setModal({ tipo, modo: "editar", customId });

  const eliminarItem = async (tipo, customId, itemKey) => {
    const res = await Swal.fire({
      title: `¿Eliminar "${itemKey}"?`,
      text: "Se quita del catálogo. Las plantillas que lo tengan marcado dejarán de crearlo.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
      ...Z_INDEX_FIX,
    });
    if (!res.isConfirmed) return;
    try {
      await chatApi.post("/kanban_plantillas_admin/catalogo_item_eliminar", {
        id: customId,
      });
      recargarCatalogo?.();
    } catch {
      Swal.fire({
        icon: "error",
        title: "No se pudo eliminar",
        confirmButtonColor: "#ef4444",
        ...Z_INDEX_FIX,
      });
    }
  };

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Intro */}
      <div
        style={{
          background: "linear-gradient(135deg,#fafbff,#f1f5f9)",
          borderRadius: 14,
          border: "1px solid rgba(0,0,0,.07)",
          padding: "16px 20px",
        }}
      >
        <div style={{ fontWeight: 800, fontSize: "1rem", color: "#0f172a" }}>
          ¿Qué se configura automáticamente al aplicar esta plantilla?
        </div>
        <div style={{ fontSize: ".8rem", color: "#64748b", marginTop: 4 }}>
          Prende el bloque y elige qué ítems se mandan a crear. Usa{" "}
          <strong>“+ Nuevo”</strong> para agregar tus propios ítems. Los
          marcados <strong>custom</strong> se pueden editar/eliminar; los de{" "}
          <strong>fábrica</strong> solo verse. El cliente NO ve ni edita esto.
        </div>
      </div>

      {AUTOMATIZACIONES.map((a) => (
        <BloqueAutomatizacion
          key={a.campo}
          def={a}
          master={!!setup[a.campo]}
          items={setup[`${a.campo}_items`]}
          catalogoItems={catalogo?.[a.campo] || null}
          onToggleMaster={() => onToggle(a.campo)}
          onToggleItem={(key) => onToggleItem(a.campo, key)}
          onSetTodos={(v) => onSetTodos(a.campo, v)}
          onNuevo={() => abrirNuevo(a.campo)}
          onEditarItem={(customId) => abrirEditar(a.campo, customId)}
          onEliminarItem={(customId, itemKey) =>
            eliminarItem(a.campo, customId, itemKey)
          }
        />
      ))}

      {/* Modal genérico (rápidas / dropi / remarketing) */}
      {modal && (
        <ModalCatalogoItem
          tipo={modal.tipo}
          modo={modal.modo}
          customId={modal.customId}
          templatesDisponibles={templatesDisponibles}
          columnasDisponibles={columnasDisponibles}
          onClose={() => setModal(null)}
          onSaved={() => recargarCatalogo?.()}
        />
      )}

      {/* Modal de plantilla Meta (tu CrearPlantillaModal vía wrapper) */}
      {modalTpl && (
        <ModalTemplateCatalogo
          onClose={() => setModalTpl(false)}
          onSaved={() => {
            setModalTpl(false);
            recargarCatalogo?.();
          }}
        />
      )}
    </div>
  );
};

// ── Un bloque ──
const BloqueAutomatizacion = ({
  def,
  master,
  items,
  catalogoItems,
  onToggleMaster,
  onToggleItem,
  onSetTodos,
  onNuevo,
  onEditarItem,
  onEliminarItem,
}) => {
  const [expandido, setExpandido] = useState({});

  const total = catalogoItems?.length || 0;
  const seleccionadas = items === null ? total : items.length;
  const estaSeleccionado = (key) =>
    items === null ? true : items.includes(key);
  const toggleExpand = (key) => setExpandido((p) => ({ ...p, [key]: !p[key] }));

  // Meta no permite editar plantillas aprobadas → sin lápiz en templates.
  const permiteEditar = def.campo !== "templates_meta";

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        border: `1px solid ${master ? def.colorOn + "44" : "rgba(0,0,0,.07)"}`,
        boxShadow: "0 2px 12px rgba(0,0,0,.05)",
        overflow: "hidden",
      }}
    >
      {/* Master + Nuevo */}
      <div
        style={{
          padding: 16,
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <div style={{ flex: 1 }}>
          <SwitchRow
            label={def.label}
            desc={def.desc}
            checked={master}
            onChange={onToggleMaster}
            colorOn={def.colorOn}
          />
        </div>
        <button
          onClick={onNuevo}
          title={`Nuevo ${def.itemNoun} custom`}
          style={{
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "7px 12px",
            borderRadius: 9,
            border: `1px solid ${def.colorOn}44`,
            background: `${def.colorOn}0d`,
            color: def.colorOn,
            fontWeight: 700,
            fontSize: ".76rem",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <i className="bx bx-plus" /> Nuevo
        </button>
      </div>

      {/* Checklist */}
      {master &&
        (catalogoItems ? (
          <div style={{ borderTop: "1px solid rgba(0,0,0,.06)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 16px",
                background: "#f8fafc",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <span
                style={{
                  fontSize: ".74rem",
                  fontWeight: 700,
                  color: "#475569",
                }}
              >
                {seleccionadas} de {total} {def.itemNoun}
                {seleccionadas === 1 ? "" : "s"} seleccionada
                {seleccionadas === 1 ? "" : "s"}
                {items === null && (
                  <span style={{ color: "#94a3b8", fontWeight: 500 }}>
                    {" "}
                    · todas
                  </span>
                )}
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => onSetTodos(true)}
                  style={miniBtn(def.colorOn)}
                >
                  Todas
                </button>
                <button
                  onClick={() => onSetTodos(false)}
                  style={miniBtn("#94a3b8")}
                >
                  Ninguna
                </button>
              </div>
            </div>

            <div style={{ maxHeight: 460, overflowY: "auto" }}>
              {catalogoItems.map((it) => {
                const on = estaSeleccionado(it.key);
                const abierto = !!expandido[it.key];
                return (
                  <div
                    key={it.key}
                    style={{ borderTop: "1px solid rgba(0,0,0,.04)" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        background: on ? `${def.colorOn}06` : "transparent",
                      }}
                    >
                      <label
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          padding: "10px 12px 10px 16px",
                          cursor: "pointer",
                          minWidth: 0,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => onToggleItem(it.key)}
                          style={{
                            marginTop: 3,
                            accentColor: def.colorOn,
                            width: 16,
                            height: 16,
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 700,
                                fontSize: ".82rem",
                                color: "#0f172a",
                                fontFamily: "monospace",
                              }}
                            >
                              {it.key}
                            </span>
                            {it.custom ? (
                              <span
                                style={{
                                  fontSize: ".58rem",
                                  fontWeight: 800,
                                  background: `${def.colorOn}1a`,
                                  color: def.colorOn,
                                  padding: "1px 6px",
                                  borderRadius: 999,
                                  textTransform: "uppercase",
                                  letterSpacing: ".04em",
                                }}
                              >
                                custom
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: ".58rem",
                                  fontWeight: 700,
                                  background: "#f1f5f9",
                                  color: "#94a3b8",
                                  padding: "1px 6px",
                                  borderRadius: 999,
                                  textTransform: "uppercase",
                                  letterSpacing: ".04em",
                                }}
                              >
                                fábrica
                              </span>
                            )}
                            {it.categoria && <Badge text={it.categoria} />}
                            {it.formato_header &&
                              it.formato_header !== "TEXT" && (
                                <Badge text={it.formato_header} />
                              )}
                            {it.tipo && it.tipo !== "text" && (
                              <Badge text={it.tipo} />
                            )}
                            {it.tiempo_espera_horas != null && (
                              <Badge
                                text={`espera ${it.tiempo_espera_horas}h`}
                              />
                            )}
                            {it.columna_destino && (
                              <Badge text={`→ ${it.columna_destino}`} />
                            )}
                          </div>
                          {it.preview && (
                            <div
                              style={{
                                fontSize: ".72rem",
                                color: "#64748b",
                                marginTop: 2,
                                lineHeight: 1.4,
                              }}
                            >
                              {it.preview}
                            </div>
                          )}
                        </div>
                      </label>

                      <div
                        style={{
                          display: "flex",
                          gap: 4,
                          margin: "8px 12px 0 4px",
                          flexShrink: 0,
                        }}
                      >
                        {it.custom && permiteEditar && (
                          <button
                            onClick={() => onEditarItem(it.custom_id)}
                            title="Editar"
                            style={iconBtn(def.colorOn)}
                          >
                            <i className="bx bx-pencil" />
                          </button>
                        )}
                        {it.custom && (
                          <button
                            onClick={() => onEliminarItem(it.custom_id, it.key)}
                            title="Eliminar"
                            style={iconBtn("#ef4444")}
                          >
                            <i className="bx bx-trash" />
                          </button>
                        )}
                        <button
                          onClick={() => toggleExpand(it.key)}
                          title={abierto ? "Ocultar" : "Ver contenido"}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "4px 9px",
                            borderRadius: 8,
                            border: `1px solid ${def.colorOn}33`,
                            background: abierto ? `${def.colorOn}12` : "#fff",
                            color: def.colorOn,
                            fontSize: ".68rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <i
                            className={
                              abierto
                                ? "bx bx-chevron-up"
                                : "bx bx-chevron-down"
                            }
                          />{" "}
                          ver
                        </button>
                      </div>
                    </div>

                    {abierto && (
                      <div style={{ padding: "0 16px 14px 42px" }}>
                        <ItemDetalle
                          item={it}
                          tipo={def.campo}
                          color={def.colorOn}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: "10px 16px",
              borderTop: "1px solid rgba(0,0,0,.06)",
              fontSize: ".74rem",
              color: "#94a3b8",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <i className="bx bx-loader-alt bx-spin" /> Cargando ítems…
          </div>
        ))}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// ItemDetalle
// ════════════════════════════════════════════════════════════════
const ItemDetalle = ({ item, tipo, color }) => {
  if (tipo === "templates_meta") return <DetalleTemplate item={item} />;
  if (tipo === "respuestas_rapidas") return <DetalleRapida item={item} />;
  if (tipo === "remarketing")
    return <DetalleRemarketing item={item} color={color} />;
  if (tipo === "dropi_config") return <DetalleDropi item={item} />;
  return null;
};

const sustituirEjemplo = (texto, ejemplo) => {
  if (!texto) return texto;
  if (!Array.isArray(ejemplo) || !ejemplo.length) return texto;
  return texto.replace(/\{\{(\d+)\}\}/g, (m, n) => ejemplo[Number(n) - 1] ?? m);
};

const DetalleTemplate = ({ item }) => (
  <DetalleCard>
    <FilaMeta>
      <Etiqueta>Categoría</Etiqueta>
      <Badge text={item.categoria} />
      <Etiqueta>Idioma</Etiqueta>
      <Badge text={item.language} />
    </FilaMeta>
    {item.formato_header && (
      <Campo titulo="Cabecera (header)">
        {item.formato_header === "TEXT" ? (
          <Texto>{item.header_texto || "(texto)"}</Texto>
        ) : (
          <div style={{ fontSize: ".76rem", color: "#334155" }}>
            <Badge text={item.formato_header} />{" "}
            {item.header_media_url ? (
              <a
                href={item.header_media_url}
                target="_blank"
                rel="noreferrer"
                style={{ color: "#2563eb", wordBreak: "break-all" }}
              >
                {item.header_media_url}
              </a>
            ) : (
              "(sin media)"
            )}
          </div>
        )}
      </Campo>
    )}
    <Campo titulo="Cuerpo (body)">
      <Texto>{item.body || "(vacío)"}</Texto>
    </Campo>
    {item.body_ejemplo && (
      <Campo titulo="Vista enviada (variables reemplazadas con el ejemplo)">
        <Texto>{sustituirEjemplo(item.body, item.body_ejemplo)}</Texto>
      </Campo>
    )}
    {item.botones?.length > 0 && (
      <Campo titulo="Botones">
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {item.botones.map((b, i) => (
            <div
              key={i}
              style={{
                fontSize: ".74rem",
                color: "#334155",
                display: "flex",
                gap: 6,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <Badge text={b.tipo} />
              <strong>{b.texto}</strong>
              {(b.ejemplo || b.url) && (
                <span style={{ color: "#64748b", wordBreak: "break-all" }}>
                  → {b.ejemplo || b.url}
                </span>
              )}
            </div>
          ))}
        </div>
      </Campo>
    )}
  </DetalleCard>
);

const DetalleRapida = ({ item }) => (
  <DetalleCard>
    <FilaMeta>
      <Etiqueta>Tipo</Etiqueta>
      <Badge text={item.tipo} />
      {item.media_url && (
        <a
          href={item.media_url}
          target="_blank"
          rel="noreferrer"
          style={{
            color: "#2563eb",
            fontSize: ".74rem",
            wordBreak: "break-all",
          }}
        >
          {item.file_name || item.media_url}
        </a>
      )}
    </FilaMeta>
    <Campo titulo="Mensaje">
      <Texto>{item.mensaje || "(vacío)"}</Texto>
    </Campo>
  </DetalleCard>
);

const DetalleRemarketing = ({ item }) => (
  <DetalleCard>
    <div
      style={{
        background: "#fffbeb",
        border: "1px solid #fde68a",
        borderRadius: 10,
        padding: "10px 12px",
        fontSize: ".74rem",
        color: "#854d0e",
        lineHeight: 1.55,
        marginBottom: 10,
      }}
    >
      <strong>Cómo funciona esta secuencia:</strong>
      <div style={{ marginTop: 4 }}>
        ⏱ Se dispara <strong>{item.tiempo_espera_horas}h</strong> después de que
        el cliente cae en <code>{item.estado_contacto}</code> sin responder.
      </div>
      <div style={{ marginTop: 4 }}>
        🟢 <strong>Dentro</strong> de 24h → la IA redacta con el prompt de
        abajo.
      </div>
      <div style={{ marginTop: 4 }}>
        🔴 <strong>Fuera</strong> de 24h → se envía la plantilla{" "}
        <strong>{item.template_fuera_24h}</strong>.
      </div>
      {item.estado_destino && (
        <div style={{ marginTop: 4 }}>
          📍 Al enviarse, pasa a <code>{item.estado_destino}</code>.
        </div>
      )}
    </div>
    {item.template_fuera_24h_body && (
      <Campo titulo={`Plantilla fuera de 24h · ${item.template_fuera_24h}`}>
        <Texto>{item.template_fuera_24h_body}</Texto>
      </Campo>
    )}
    <Campo titulo="Prompt de la IA (dentro de 24h)">
      <Texto mono>{item.prompt_ia || "(sin prompt)"}</Texto>
    </Campo>
  </DetalleCard>
);

const DetalleDropi = ({ item }) => (
  <DetalleCard>
    <FilaMeta>
      <Etiqueta>Estado Dropi</Etiqueta>
      <Badge text={item.key} />
      {item.columna_destino && (
        <>
          <Etiqueta>Mueve a</Etiqueta>
          <Badge text={item.columna_destino} />
        </>
      )}
    </FilaMeta>
    <FilaMeta>
      <Etiqueta>Dispara plantilla</Etiqueta>
      <Badge text={item.template} />
      <Etiqueta>Modo</Etiqueta>
      <Badge
        text={
          item.usar_respuesta_rapida ? "respuesta rápida" : "plantilla Meta"
        }
      />
    </FilaMeta>
    {item.usar_respuesta_rapida && item.mensaje_rapido ? (
      <Campo titulo="Mensaje (respuesta rápida)">
        <Texto>{item.mensaje_rapido}</Texto>
      </Campo>
    ) : (
      item.template_body && (
        <Campo titulo={`Cuerpo de la plantilla · ${item.template}`}>
          <Texto>{item.template_body}</Texto>
        </Campo>
      )
    )}
    {item.parametros && (
      <Campo titulo="Parámetros enviados">
        <Texto mono>{JSON.stringify(item.parametros, null, 2)}</Texto>
      </Campo>
    )}
  </DetalleCard>
);

// ── Primitivos ──
const DetalleCard = ({ children }) => (
  <div
    style={{
      background: "#f8fafc",
      border: "1px solid rgba(0,0,0,.07)",
      borderRadius: 10,
      padding: 12,
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}
  >
    {children}
  </div>
);
const Campo = ({ titulo, children }) => (
  <div>
    <div
      style={{
        fontSize: ".66rem",
        fontWeight: 800,
        color: "#94a3b8",
        textTransform: "uppercase",
        letterSpacing: ".05em",
        marginBottom: 4,
      }}
    >
      {titulo}
    </div>
    {children}
  </div>
);
const FilaMeta = ({ children }) => (
  <div
    style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}
  >
    {children}
  </div>
);
const Etiqueta = ({ children }) => (
  <span style={{ fontSize: ".7rem", fontWeight: 700, color: "#64748b" }}>
    {children}:
  </span>
);
const Texto = ({ children, mono }) => (
  <div
    style={{
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      fontSize: ".76rem",
      lineHeight: 1.5,
      color: "#1e293b",
      background: "#fff",
      border: "1px solid rgba(0,0,0,.06)",
      borderRadius: 8,
      padding: "8px 10px",
      fontFamily: mono
        ? "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
        : "inherit",
      maxHeight: 320,
      overflowY: "auto",
    }}
  >
    {children}
  </div>
);
const Badge = ({ text }) => (
  <span
    style={{
      fontSize: ".62rem",
      fontWeight: 700,
      background: "#eef2ff",
      color: "#4338ca",
      padding: "1px 6px",
      borderRadius: 999,
    }}
  >
    {text}
  </span>
);
const miniBtn = (color) => ({
  fontSize: ".68rem",
  fontWeight: 700,
  padding: "3px 9px",
  borderRadius: 7,
  border: `1px solid ${color}55`,
  background: `${color}10`,
  color,
  cursor: "pointer",
});
const iconBtn = (color) => ({
  width: 28,
  height: 28,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 8,
  border: `1px solid ${color}33`,
  background: "#fff",
  color,
  cursor: "pointer",
  fontSize: ".9rem",
});

export default TabAutomatizacion;
