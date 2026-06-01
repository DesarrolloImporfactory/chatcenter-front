import { fmtNumber } from "./helpers";

export default function FiltersBar({ state, set, meta }) {
  const {
    search,
    estado,
    idPlan,
    semaforo,
    tipoPlan,
    stripeStatus,
    toolsAccess,
    cancelPeriodEnd,
    permanente,
    conWhatsapp,
    sinPlan,
    conSeguimientos,
    fechaRegDesde,
    fechaRegHasta,
    fechaRenDesde,
    fechaRenHasta,
    filtrosAvanzadosOpen,
  } = state;

  const {
    setSearch,
    setEstado,
    setIdPlan,
    setSemaforo,
    setTipoPlan,
    setStripeStatus,
    setToolsAccess,
    setCancelPeriodEnd,
    setPermanente,
    setConWhatsapp,
    setSinPlan,
    setConSeguimientos,
    setFechaRegDesde,
    setFechaRegHasta,
    setFechaRenDesde,
    setFechaRenHasta,
    setFiltrosAvanzadosOpen,
    limpiarFiltros,
  } = set;

  const { planes, total, activeFilters, hayFiltrosAvanzados } = meta;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      {/* Fila 1: Search + filtros principales */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5">
            <div className="relative">
              <i className="bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por empresa, email, teléfono o ID…"
                className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-100"
                >
                  <i className="bx bx-x text-slate-400" />
                </button>
              )}
            </div>
          </div>

          <Select
            className="md:col-span-2"
            value={semaforo}
            onChange={setSemaforo}
            options={[
              { value: "", label: "Semáforo (todos)" },
              { value: "verde", label: "Al día" },
              { value: "amarillo", label: "Por vencer" },
              { value: "rojo", label: "Vencidos" },
              { value: "gris", label: "Sin plan" },
            ]}
          />

          <Select
            className="md:col-span-2"
            value={estado}
            onChange={setEstado}
            options={[
              { value: "", label: "Estado (todos)" },
              { value: "activo", label: "Activo" },
              { value: "inactivo", label: "Inactivo" },
              { value: "suspendido", label: "Suspendido" },
              { value: "vencido", label: "Vencido" },
              { value: "cancelado", label: "Cancelado" },
              { value: "trial_usage", label: "Trial" },
              { value: "promo_usage", label: "Promo" },
            ]}
          />

          <Select
            className="md:col-span-2"
            value={idPlan}
            onChange={setIdPlan}
            options={[
              { value: "", label: "Plan (todos)" },
              ...planes.map((p) => ({
                value: String(p.id_plan),
                label: `${p.nombre_plan}${p.precio_plan ? ` — $${p.precio_plan}` : ""}`,
              })),
            ]}
          />

          <Select
            className="md:col-span-1"
            value={toolsAccess}
            onChange={setToolsAccess}
            options={[
              { value: "", label: "Producto" },
              { value: "imporchat", label: "Solo ImporChat" },
              { value: "insta_landing", label: "Solo Insta Landing" },
              { value: "both", label: "Ambos" },
            ]}
          />
        </div>

        {/* Fila 2: toggles + avanzados */}
        <div className="flex items-center flex-wrap gap-2 mt-3">
          <ToggleChip
            active={conWhatsapp}
            onClick={() => setConWhatsapp(!conWhatsapp)}
            icon="bxl-whatsapp"
            label="Con WhatsApp activo"
            color="emerald"
          />
          <ToggleChip
            active={permanente}
            onClick={() => setPermanente(!permanente)}
            icon="bx-crown"
            label="Permanentes"
            color="amber"
          />
          <ToggleChip
            active={cancelPeriodEnd}
            onClick={() => setCancelPeriodEnd(!cancelPeriodEnd)}
            icon="bx-x-circle"
            label="Cancel. programada"
            color="rose"
          />
          <ToggleChip
            active={sinPlan}
            onClick={() => setSinPlan(!sinPlan)}
            icon="bx-block"
            label="Sin plan"
            color="slate"
          />
          <ToggleChip
            active={conSeguimientos}
            onClick={() => setConSeguimientos(!conSeguimientos)}
            icon="bx-message-square-detail"
            label="Con seguimientos"
            color="cyan"
          />

          <div className="flex-1" />

          <button
            onClick={() => setFiltrosAvanzadosOpen(!filtrosAvanzadosOpen)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ring-1 transition ${
              filtrosAvanzadosOpen || hayFiltrosAvanzados
                ? "bg-[#0B1426] text-white ring-[#0B1426]"
                : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            <i className="bx bx-filter-alt text-base" />
            Filtros avanzados
            {hayFiltrosAvanzados && (
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            )}
            <i
              className={`bx bx-chevron-${filtrosAvanzadosOpen ? "up" : "down"}`}
            />
          </button>
        </div>

        {/* Fila 3: avanzados */}
        {filtrosAvanzadosOpen && (
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 md:grid-cols-6 gap-3">
            <Select
              value={tipoPlan}
              onChange={setTipoPlan}
              options={[
                { value: "", label: "Tipo (todos)" },
                { value: "mensual", label: "Mensual" },
                { value: "conversaciones", label: "Por conversaciones" },
              ]}
            />
            <Select
              value={stripeStatus}
              onChange={setStripeStatus}
              options={[
                { value: "", label: "Stripe (todos)" },
                { value: "active", label: "Active" },
                { value: "trialing", label: "Trialing" },
                { value: "past_due", label: "Past due" },
                { value: "canceled", label: "Canceled" },
                { value: "unpaid", label: "Unpaid" },
                { value: "incomplete", label: "Incomplete" },
              ]}
            />
            <DateInput
              label="Registro desde"
              value={fechaRegDesde}
              onChange={setFechaRegDesde}
            />
            <DateInput
              label="Registro hasta"
              value={fechaRegHasta}
              onChange={setFechaRegHasta}
            />
            <DateInput
              label="Renov. desde"
              value={fechaRenDesde}
              onChange={setFechaRenDesde}
            />
            <DateInput
              label="Renov. hasta"
              value={fechaRenHasta}
              onChange={setFechaRenHasta}
            />
          </div>
        )}
      </div>

      {/* Chips activos */}
      {activeFilters.length > 0 && (
        <div className="flex items-center flex-wrap gap-2 px-4 py-3 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Filtros activos:
          </span>
          {activeFilters.map((f, i) => (
            <button
              key={i}
              onClick={f.clear}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:ring-rose-200 transition"
            >
              {f.label}
              <i className="bx bx-x text-base" />
            </button>
          ))}
          <button
            onClick={limpiarFiltros}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 ml-2"
          >
            Limpiar todo
          </button>
          <div className="flex-1" />
          <div className="text-sm text-slate-500">
            <strong className="text-[#0B1426]">{fmtNumber(total)}</strong>{" "}
            resultado{total !== 1 && "s"}
          </div>
        </div>
      )}
    </div>
  );
}

function Select({ value, onChange, options, className = "" }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-500 bg-white ${className}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function DateInput({ label, value, onChange }) {
  return (
    <div className="relative">
      <label className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
        {label}
      </label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-500"
      />
    </div>
  );
}

function ToggleChip({ active, onClick, icon, label, color = "cyan" }) {
  const cls = {
    cyan: "bg-cyan-50 text-cyan-700 ring-cyan-300",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-300",
    amber: "bg-amber-50 text-amber-700 ring-amber-300",
    rose: "bg-rose-50 text-rose-700 ring-rose-300",
    slate: "bg-slate-100 text-slate-700 ring-slate-300",
  }[color];
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ring-1 transition ${
        active
          ? cls
          : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      <i className={`bx ${icon} text-base`} /> {label}
    </button>
  );
}
