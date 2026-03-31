import React, { useMemo } from "react";
import Select, { components as rsComponents } from "react-select";
import DateRangeFilter from "./DateRangeFilter";

/* ═══════════════════════════════════════════
   TagSelect — etiquetas (single select)
   ═══════════════════════════════════════════ */

export function TagSelect({
  options,
  value,
  onChange,
  disabled,
  onDelete,
  onCreateNew,
}) {
  const selectOptions = options.map((o) => ({
    value: String(o.id_etiqueta),
    label: o.nombre_etiqueta,
    color: o.color_etiqueta || "#94a3b8",
    id_etiqueta: o.id_etiqueta,
  }));

  const selectedOption =
    selectOptions.find((o) => o.value === String(value)) || null;

  const formatOptionLabel = (opt, { context }) => (
    <div className="flex items-center justify-between w-full gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="h-2.5 w-2.5 rounded-full shrink-0 ring-1 ring-black/10"
          style={{ backgroundColor: opt.color || "#94a3b8" }}
        />
        <span className="text-sm text-slate-700 truncate">{opt.label}</span>
      </div>
      {context === "menu" && onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(opt.id_etiqueta, opt.label);
          }}
          className="shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 transition"
          title={`Eliminar "${opt.label}"`}
        >
          <i className="bx bxs-trash text-sm" />
        </button>
      )}
    </div>
  );

  const MenuList = (props) => (
    <div>
      <rsComponents.MenuList {...props}>{props.children}</rsComponents.MenuList>
      {onCreateNew && (
        <div className="border-t border-slate-100 px-2 py-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCreateNew();
            }}
            className="flex items-center gap-2 w-full rounded-lg px-2 py-1.5 text-xs text-blue-600 hover:bg-blue-50 transition"
          >
            <i className="bx bx-plus text-sm" />
            Crear nueva etiqueta
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ minWidth: 180 }}>
      <Select
        options={selectOptions}
        value={selectedOption}
        onChange={(opt) => onChange(opt ? opt.value : "")}
        isClearable
        isSearchable
        isDisabled={disabled}
        placeholder="Etiquetas"
        noOptionsMessage={() => "Sin etiquetas"}
        formatOptionLabel={formatOptionLabel}
        styles={compactStyles}
        components={{ MenuList }}
        menuPortalTarget={document.body}
        menuPosition="fixed"
        menuPlacement="auto"
        maxMenuHeight={200}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════
   MultiLabelSelect — multi-select para
   Asesor, Ciclo, Estado Contacto
   ═══════════════════════════════════════════ */

export function MultiLabelSelect({
  options,
  value = [], // array de strings/ids
  onChange, // recibe array de strings/ids
  placeholder = "Todos",
  colorBadge = "#0ea5e9",
  onDelete,
  onCreateNew,
}) {
  const selectOptions = options.map((o) => ({
    value: String(o.id),
    label: o.nombre,
    id: o.id,
    color: o.color || null,
  }));

  // Convertir array de valores a array de opciones seleccionadas
  const selectedOptions = selectOptions.filter((o) =>
    (value || []).map(String).includes(o.value),
  );

  const formatOptionLabel = (opt, { context }) => (
    <div className="flex items-center justify-between w-full gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="h-2.5 w-2.5 rounded-full shrink-0 ring-1 ring-black/10"
          style={{ backgroundColor: opt.color || colorBadge }}
        />
        <span className="text-sm text-slate-700 truncate">{opt.label}</span>
      </div>
      {context === "menu" && onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(opt.id, opt.label);
          }}
          className="shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 transition"
          title={`Eliminar "${opt.label}"`}
        >
          <i className="bx bxs-trash text-sm" />
        </button>
      )}
    </div>
  );

  const MenuList = (props) => (
    <div>
      <rsComponents.MenuList {...props}>{props.children}</rsComponents.MenuList>
      {onCreateNew && (
        <div className="border-t border-slate-100 px-2 py-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCreateNew();
            }}
            className="flex items-center gap-2 w-full rounded-lg px-2 py-1.5 text-xs text-blue-600 hover:bg-blue-50 transition"
          >
            <i className="bx bx-plus text-sm" />
            Crear nuevo
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ minWidth: 160 }}>
      <Select
        options={selectOptions}
        value={selectedOptions}
        onChange={(opts) => onChange(opts ? opts.map((o) => o.value) : [])}
        isMulti
        isClearable
        isSearchable
        placeholder={placeholder}
        noOptionsMessage={() => "Sin opciones"}
        formatOptionLabel={formatOptionLabel}
        styles={compactMultiStyles}
        components={{ MenuList }}
        menuPortalTarget={document.body}
        menuPosition="fixed"
        menuPlacement="auto"
        maxMenuHeight={200}
        closeMenuOnSelect={false}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════
   Tooltip
   ═══════════════════════════════════════════ */

export function Tooltip({ label, children }) {
  return (
    <div className="relative inline-flex items-center group">
      {children}
      <div className="pointer-events-none absolute top-full left-1/2 z-50 hidden -translate-x-1/2 pt-2 group-hover:block transition-all duration-150 ease-out opacity-0 translate-y-0.5 group-hover:opacity-100 group-hover:translate-y-0">
        <div className="mx-auto h-2 w-2 -mb-1 rotate-45 bg-slate-900/95 shadow" />
        <div className="rounded-md bg-slate-900/95 px-2.5 py-1 text-xs font-medium text-white shadow">
          {label}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SelectedBadge — counter de seleccionados
   ═══════════════════════════════════════════ */

function SelectedBadge({ count }) {
  if (!count) return null;
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-sm animate-[badgePop_200ms_ease-out]">
      <i className="bx bx-check-circle text-sm" />
      {count} seleccionado{count !== 1 ? "s" : ""}
      <style>{`@keyframes badgePop { from { transform: scale(0.85); opacity:0 } to { transform: scale(1); opacity:1 } }`}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════
   FilterBar — componente principal
   ═══════════════════════════════════════════ */

export default function FilterBar({
  // búsqueda
  q,
  setQ,
  // estado (activos/inactivos)
  estado,
  setEstado,
  // etiqueta (single select)
  idEtiquetaFiltro,
  setIdEtiquetaFiltro,
  opcionesFiltroEtiquetas,
  onDeleteEtiqueta,
  onCreateEtiqueta,
  // asesor (MULTI select)
  idsAsesorFiltro, // array
  setIdsAsesorFiltro, // setter array
  opcionesAsesor,
  onDeleteAsesor,
  onCreateAsesor,
  // ciclo (MULTI select)
  idsCicloFiltro, // array
  setIdsCicloFiltro, // setter array
  opcionesCiclo,
  onDeleteCiclo,
  onCreateCiclo,
  // estado contacto (MULTI select)
  idsEstadoContactoFiltro, // array
  setIdsEstadoContactoFiltro, // setter array
  opcionesEstadoContacto,
  // orden
  orden,
  setOrden,
  // selección
  selectedCount,
  // acciones etiquetas
  onAsignarTags,
  onQuitarTags,
  onCrearTag,
  // eliminar
  onDeleteSelected,
  // reset
  onReset,
  filtroFecha,
  setFiltroFecha,
}) {
  return (
    <>
      {/* ── Buscador + badge seleccionados ── */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white/70 px-4 py-3 backdrop-blur-sm">
        <div className="relative flex-1 min-w-[240px] max-w-[520px]">
          <i className="bx bx-search absolute left-3 top-2.5 text-slate-500" />
          <input
            className="w-full rounded-md border border-slate-200 bg-white px-9 py-2 text-sm text-slate-800 outline-none ring-1 ring-transparent transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200/60"
            placeholder="Buscar por nombre, apellido o teléfono…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {/* ── Badge de seleccionados (siempre visible) ── */}
        <SelectedBadge count={selectedCount} />
      </div>

      {/* ── Filtros ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/80 px-4 py-2 text-xs flex-wrap">
        {/* Estado activo/inactivo */}
        <div className="flex items-center gap-2">
          {["todos", "1", "0"].map((e) => (
            <button
              key={e}
              onClick={() => setEstado(e)}
              className={`rounded-full border px-3 py-1 transition text-xs ${
                estado === e
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              }`}
            >
              {e === "todos" ? "Todos" : e === "1" ? "Activos" : "Inactivos"}
            </button>
          ))}
        </div>

        <div className="ml-3 flex items-center gap-2 flex-wrap">
          {/* Etiqueta (single) */}
          <TagSelect
            options={opcionesFiltroEtiquetas}
            value={idEtiquetaFiltro}
            onChange={setIdEtiquetaFiltro}
            disabled={false}
            onDelete={onDeleteEtiqueta}
            onCreateNew={onCreateEtiqueta}
          />

          {/* Asesor (MULTI) */}
          <MultiLabelSelect
            options={opcionesAsesor}
            value={idsAsesorFiltro}
            onChange={setIdsAsesorFiltro}
            placeholder="Asesor"
            colorBadge="#0ea5e9"
            onDelete={onDeleteAsesor}
            onCreateNew={onCreateAsesor}
          />

          {/* Ciclo (MULTI) */}
          <MultiLabelSelect
            options={opcionesCiclo}
            value={idsCicloFiltro}
            onChange={setIdsCicloFiltro}
            placeholder="Ciclo"
            colorBadge="#10b981"
            onDelete={onDeleteCiclo}
            onCreateNew={onCreateCiclo}
          />

          {/* Estado Contacto (MULTI) */}
          <MultiLabelSelect
            options={opcionesEstadoContacto.map((o) => ({
              id: o.estado_db,
              nombre: o.nombre || o.estado_db,
              color: o.color_texto || "#94a3b8",
            }))}
            value={idsEstadoContactoFiltro}
            onChange={setIdsEstadoContactoFiltro}
            placeholder="Estado contacto"
            colorBadge="#94a3b8"
          />

          <DateRangeFilter value={filtroFecha} onChange={setFiltroFecha} />

          {/* Orden */}
          <select
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            title="Orden"
          >
            <option value="recientes">Más recientes</option>
            <option value="antiguos">Más antiguos</option>
            <option value="actividad_desc">Actividad (desc)</option>
            <option value="actividad_asc">Actividad (asc)</option>
          </select>

          {/* Reset */}
          <button
            onClick={() => {
              onReset();
              setFiltroFecha(null);
            }}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 transition"
          >
            <i className="bx bx-reset text-sm" />
            Limpiar
          </button>

          {/* Acciones de etiquetas */}
          <div className="ml-4 flex items-center gap-1">
            <Tooltip label="Asignar etiquetas a seleccionados">
              <button
                className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                onClick={onAsignarTags}
                disabled={!selectedCount}
              >
                <i className="bx bxs-purchase-tag-alt text-[16px]" />
              </button>
            </Tooltip>
            <Tooltip label="Quitar etiquetas a seleccionados">
              <button
                className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                onClick={onQuitarTags}
                disabled={!selectedCount}
              >
                <i className="bx bxs-minus-circle text-[16px]" />
              </button>
            </Tooltip>
            <Tooltip label="Crear nueva etiqueta">
              <button
                className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                onClick={onCrearTag}
              >
                <i className="bx bxs-plus-circle text-[16px]" />
              </button>
            </Tooltip>
          </div>

          {/* Eliminar */}
          <Tooltip label="Eliminar clientes seleccionados">
            <button
              disabled={!selectedCount}
              onClick={onDeleteSelected}
              className="ml-2 inline-flex items-center justify-center h-8 w-8 rounded-full border border-red-100 bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-40"
            >
              <i className="bx bxs-trash-alt text-[16px]" />
            </button>
          </Tooltip>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════
   Estilos compactos para los selects
   ═══════════════════════════════════════════ */

const compactStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 32,
    maxHeight: 34,
    borderRadius: 8,
    fontSize: 13,
    backgroundColor: "white",
    borderColor: state.isFocused ? "#3b82f6" : "#e2e8f0",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(59,130,246,.2)" : "none",
    cursor: "pointer",
    "&:hover": { borderColor: "#94a3b8" },
  }),
  valueContainer: (base) => ({ ...base, padding: "0 6px" }),
  placeholder: (base) => ({ ...base, color: "#94a3b8", fontSize: 13 }),
  singleValue: (base) => ({ ...base, color: "#334155", fontSize: 13 }),
  input: (base) => ({
    ...base,
    color: "#0f172a",
    fontSize: 13,
    margin: 0,
    padding: 0,
  }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (base) => ({
    ...base,
    padding: "0 4px",
    color: "#94a3b8",
  }),
  clearIndicator: (base) => ({
    ...base,
    padding: "0 2px",
    color: "#94a3b8",
    cursor: "pointer",
    "&:hover": { color: "#ef4444" },
  }),
  menu: (base) => ({
    ...base,
    borderRadius: 12,
    marginTop: 4,
    padding: 4,
    backgroundColor: "white",
    border: "1px solid #e2e8f0",
    boxShadow: "0 12px 28px rgba(0,0,0,.12)",
    zIndex: 50,
    minWidth: 220,
  }),
  menuList: (base) => ({ ...base, maxHeight: 220, padding: 2 }),
  option: (base, state) => ({
    ...base,
    borderRadius: 8,
    padding: "6px 8px",
    cursor: "pointer",
    backgroundColor: state.isSelected
      ? "#eff6ff"
      : state.isFocused
        ? "#f8fafc"
        : "transparent",
    "&:active": { backgroundColor: "#e2e8f0" },
  }),
  noOptionsMessage: (base) => ({ ...base, fontSize: 13, color: "#94a3b8" }),
};

const compactMultiStyles = {
  ...compactStyles,
  control: (base, state) => ({
    ...compactStyles.control(base, state),
    minHeight: 32,
    maxHeight: "none", // permitir crecer con multi-values
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: "#eff6ff",
    borderRadius: 6,
    fontSize: 11,
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: "#1e40af",
    fontSize: 11,
    padding: "1px 4px",
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: "#3b82f6",
    borderRadius: "0 6px 6px 0",
    "&:hover": { backgroundColor: "#dbeafe", color: "#1e40af" },
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "2px 6px",
    gap: 2,
    flexWrap: "wrap",
  }),
};
