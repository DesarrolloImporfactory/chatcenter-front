import CopyBtn from "./CopyBtn";
import {
  semaforoStyle,
  estadoBadge,
  fmtDate,
  fmtDateTime,
  fmtMoney,
  fmtNumber,
  relativo,
} from "./helpers";

export default function UsuariosTable({
  rows,
  loading,
  total,
  totalPages,
  page,
  limit,
  orderBy,
  orderDir,
  setPage,
  setLimit,
  toggleOrden,
  abrirDetalle,
  activeFilters,
  limpiarFiltros,
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-w-0">
      <table className="w-full table-fixed text-sm">
        <colgroup>
          <col style={{ width: "22%" }} />
          <col style={{ width: "18%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "16%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "2%" }} />
        </colgroup>
        <thead className="bg-[#0B1426] text-white">
          <tr>
            <Th
              onClick={() => toggleOrden("empresa")}
              active={orderBy === "empresa"}
              dir={orderDir}
            >
              Empresa
            </Th>
            <Th
              onClick={() => toggleOrden("email")}
              active={orderBy === "email"}
              dir={orderDir}
            >
              Contacto
            </Th>
            <Th
              onClick={() => toggleOrden("estado")}
              active={orderBy === "estado"}
              dir={orderDir}
            >
              Estado
            </Th>
            <Th
              onClick={() => toggleOrden("plan")}
              active={orderBy === "plan"}
              dir={orderDir}
            >
              Plan
            </Th>
            <Th
              onClick={() => toggleOrden("fecha_renovacion")}
              active={orderBy === "fecha_renovacion"}
              dir={orderDir}
            >
              Vence
            </Th>
            <Th className="text-center">Recursos</Th>
            <Th
              onClick={() => toggleOrden("ultimo_mensaje")}
              active={orderBy === "ultimo_mensaje"}
              dir={orderDir}
            >
              Actividad
            </Th>
            <th className="px-2 py-3 text-right"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            <SkeletonRows count={8} />
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-16 text-center">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-slate-100 text-slate-400 mb-3">
                  <i className="bx bx-search-alt text-3xl" />
                </div>
                <p className="text-slate-600 font-semibold">Sin resultados</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ajusta o limpia los filtros para ver usuarios.
                </p>
                {activeFilters.length > 0 && (
                  <button
                    onClick={limpiarFiltros}
                    className="mt-3 text-xs font-semibold text-cyan-700 hover:text-cyan-800"
                  >
                    Limpiar filtros →
                  </button>
                )}
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <Row
                key={r.id_usuario}
                r={r}
                onClick={() => abrirDetalle(r.id_usuario)}
              />
            ))
          )}
        </tbody>
      </table>

      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Mostrar</span>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-2 py-1 border border-slate-300 rounded text-sm outline-none bg-white"
          >
            <option>10</option>
            <option>25</option>
            <option>50</option>
            <option>100</option>
          </select>
          <span>por página · {fmtNumber(total)} total</span>
        </div>
        <div className="flex items-center gap-1">
          <IconBtn
            onClick={() => setPage(1)}
            disabled={page <= 1}
            icon="bx-chevrons-left"
          />
          <IconBtn
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            icon="bx-chevron-left"
          />
          <span className="text-sm text-slate-600 px-3">
            Página <b>{page}</b> de <b>{totalPages}</b>
          </span>
          <IconBtn
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            icon="bx-chevron-right"
          />
          <IconBtn
            onClick={() => setPage(totalPages)}
            disabled={page >= totalPages}
            icon="bx-chevrons-right"
          />
        </div>
      </div>
    </div>
  );
}

function Th({ children, onClick, active, dir, className = "" }) {
  return (
    <th
      onClick={onClick}
      className={`px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider ${
        onClick ? "cursor-pointer hover:bg-white/5 select-none" : ""
      } ${className}`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {active && (
          <i
            className={`bx ${dir === "ASC" ? "bx-up-arrow-alt" : "bx-down-arrow-alt"} text-sm`}
          />
        )}
      </span>
    </th>
  );
}

function Row({ r, onClick }) {
  const sem = semaforoStyle[r.semaforo] || semaforoStyle.gris;
  const estadoCls =
    estadoBadge[r.estado] || "bg-slate-50 text-slate-700 ring-slate-200";
  const hasIC = r.tools_access === "imporchat" || r.tools_access === "both";
  const hasIL = r.tools_access === "insta_landing" || r.tools_access === "both";
  const totSeg = Number(r.total_seguimientos || 0);

  return (
    <tr
      onClick={onClick}
      className="hover:bg-cyan-50/40 cursor-pointer transition group"
    >
      <td className="px-3 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`h-2.5 w-2.5 rounded-full ${sem.dot} flex-shrink-0`}
            title={sem.label}
          />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-[#0B1426] truncate flex items-center gap-1">
              <span className="truncate">{r.empresa || "—"}</span>
              {r.permanente === 1 && (
                <i
                  className="bx bxs-crown text-amber-500 text-sm flex-shrink-0"
                  title="Permanente"
                />
              )}
              {totSeg > 0 && (
                <span
                  title={`${totSeg} seguimiento${totSeg !== 1 ? "s" : ""}${r.ultimo_seguimiento ? ` · último ${fmtDate(r.ultimo_seguimiento)}` : ""}`}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200 flex-shrink-0"
                >
                  <i className="bx bx-message-square-detail" /> {totSeg}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400">ID {r.id_usuario}</div>
          </div>
        </div>
      </td>

      <td className="px-3 py-3">
        <div className="min-w-0">
          {r.email && (
            <div className="text-slate-700 text-xs flex items-center gap-1 min-w-0">
              <span className="truncate flex-1">{r.email}</span>
              <CopyBtn text={r.email} label="Email copiado" />
            </div>
          )}
          {r.telefono_principal && (
            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 min-w-0">
              <i className="bx bx-phone text-xs flex-shrink-0" />
              <span className="truncate flex-1">{r.telefono_principal}</span>
              <CopyBtn text={r.telefono_principal} label="Teléfono copiado" />
            </div>
          )}
        </div>
      </td>

      <td className="px-3 py-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${estadoCls} truncate max-w-full`}
        >
          {r.estado}
        </span>
        {r.cancel_at_period_end === 1 && (
          <div
            className="text-[10px] text-rose-600 font-semibold mt-0.5 flex items-center gap-0.5 truncate"
            title="Cancelación programada"
          >
            <i className="bx bx-x-circle flex-shrink-0" />
            <span className="truncate">Cancel. programada</span>
          </div>
        )}
      </td>

      <td className="px-3 py-3">
        {r.nombre_plan ? (
          <div className="min-w-0">
            <div className="font-semibold text-[#0B1426] text-sm truncate">
              {r.nombre_plan}
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {fmtMoney(r.precio_plan)} ·{" "}
              {r.tipo_plan === "conversaciones" ? "conv." : "mensual"}
            </div>
            <div className="flex gap-1 mt-1 flex-wrap">
              {hasIC && <ProductBadge type="ic" />}
              {hasIL && <ProductBadge type="il" />}
            </div>
          </div>
        ) : (
          <span className="text-slate-400 italic text-xs">Sin plan</span>
        )}
      </td>

      <td className="px-3 py-3">
        {r.fecha_renovacion ? (
          <div className="min-w-0">
            <div className="text-slate-700 text-xs truncate">
              {fmtDate(r.fecha_renovacion)}
            </div>
            {r.dias_hasta_vencimiento !== null && (
              <div
                className={`text-[11px] font-semibold truncate ${
                  r.dias_hasta_vencimiento < 0
                    ? "text-rose-600"
                    : r.dias_hasta_vencimiento <= 7
                      ? "text-amber-600"
                      : "text-slate-400"
                }`}
              >
                {r.dias_hasta_vencimiento < 0
                  ? `Vencido ${Math.abs(r.dias_hasta_vencimiento)}d`
                  : `${r.dias_hasta_vencimiento}d`}
              </div>
            )}
          </div>
        ) : (
          <span className="text-slate-300 text-xs">—</span>
        )}
      </td>

      <td className="px-2 py-3">
        <div className="flex items-center justify-center gap-1 flex-wrap">
          <CountPill
            n={r.total_whatsapp_activos}
            max={r.total_conexiones}
            icon="bxl-whatsapp"
            color="emerald"
            tooltip="Conexiones de WhatsApp activas"
          />
          <CountPill
            n={r.total_agentes_ia}
            max={r.max_agentes_whatsapp}
            icon="bx-bot"
            color="violet"
            tooltip="Agentes IA configurados"
          />
          <CountPill
            n={r.total_subusuarios}
            max={r.max_subusuarios}
            icon="bx-group"
            color="sky"
            tooltip="Subusuarios de la cuenta"
          />
        </div>
      </td>

      <td className="px-3 py-3 text-xs">
        <div
          className="text-slate-600 truncate"
          title={
            r.ultimo_mensaje ? fmtDateTime(r.ultimo_mensaje) : "Sin mensajes"
          }
        >
          {r.ultimo_mensaje ? (
            relativo(r.ultimo_mensaje)
          ) : (
            <span className="text-slate-300">sin mensajes</span>
          )}
        </div>
        <div
          className="text-[10px] text-slate-400 truncate"
          title={`Registrado ${fmtDate(r.fecha_registro)}`}
        >
          reg. {fmtDate(r.fecha_registro)}
        </div>
      </td>

      <td className="px-2 py-3 text-right">
        <i className="bx bx-chevron-right text-xl text-slate-300 group-hover:text-cyan-600 transition" />
      </td>
    </tr>
  );
}

function ProductBadge({ type }) {
  if (type === "ic") {
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200"
        title="Acceso a ImporChat"
      >
        <i className="bx bx-chat text-xs" /> IC
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-50 text-violet-700 ring-1 ring-violet-200"
      title="Acceso a Insta Landing"
    >
      <i className="bx bx-image-add text-xs" /> IL
    </span>
  );
}

function CountPill({ n, max, icon, color, tooltip }) {
  const value = Number(n) || 0;
  const limit = max === null || max === undefined ? null : Number(max);
  const palette =
    {
      emerald: "text-emerald-700 bg-emerald-50 ring-emerald-200",
      violet: "text-violet-700 bg-violet-50 ring-violet-200",
      sky: "text-sky-700 bg-sky-50 ring-sky-200",
    }[color] || "text-slate-700 bg-slate-50 ring-slate-200";
  const empty = value === 0;
  return (
    <span
      title={tooltip}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ring-1 ${
        empty ? "text-slate-400 bg-slate-50 ring-slate-200" : palette
      }`}
    >
      <i className={`bx ${icon} text-sm`} />
      {value}
      {limit !== null && limit > 0 ? `/${limit}` : ""}
    </span>
  );
}

function SkeletonRows({ count = 6 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          {Array.from({ length: 8 }).map((_, j) => (
            <td key={j} className="px-3 py-4">
              <div
                className="h-3 bg-slate-100 rounded"
                style={{ width: `${60 + ((j * 7) % 40)}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function IconBtn({ onClick, disabled, icon }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition"
    >
      <i className={`bx ${icon} text-lg`} />
    </button>
  );
}
