import React, { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";

/**
 * AdminAsistenteView — /administrador-asistente (solo super admin)
 *
 * Con qué llave responde el asistente flotante («¿Cómo empiezo?» en
 * /conexiones y «Pregúntale a tu cuenta») cuando paga la plataforma: llave de
 * OpenAI y/o de Claude, cuál va primero, modelo de Claude y tope diario.
 * Antes era una variable del .env del servidor; si se quedaba sin saldo nadie
 * lo veía. Backend: /admin_asistente/* (requireSuperAdmin).
 */

const PROVEEDORES = [
  {
    id: "openai",
    nombre: "OpenAI",
    icono: "bx-bot",
    placeholder: "sk-proj-…",
    recarga: "https://platform.openai.com/settings/organization/billing/overview",
  },
  {
    id: "claude",
    nombre: "Claude (Anthropic)",
    icono: "bx-brain",
    placeholder: "sk-ant-…",
    recarga: "https://console.anthropic.com/settings/billing",
  },
];

const ERROR_LABEL = {
  SIN_SALDO: "Sin saldo",
  KEY_INVALIDA: "Llave inválida o revocada",
  RATE_LIMIT: "Límite de velocidad (pasajero)",
  ERROR: "Error del proveedor",
};

const ORIGEN_LABEL = {
  propia: "Llave del cliente",
  openai: "Plataforma · OpenAI",
  claude: "Plataforma · Claude",
  env: "Respaldo del servidor (.env)",
};

const fechaHora = (v) => {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? String(v)
    : d.toLocaleString("es-EC", { dateStyle: "short", timeStyle: "short" });
};

const HeaderStat = ({ label, value, icon, accent }) => (
  <div className="rounded-xl bg-white/[0.06] ring-1 ring-white/10 px-3.5 py-2.5 backdrop-blur">
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-white/50 font-semibold">
      <i className={`bx ${icon} ${accent}`} />
      {label}
    </div>
    <div className="mt-0.5 text-sm font-bold text-white truncate">{value}</div>
  </div>
);

const cuentaTexto = (id, cuenta) => {
  if (!cuenta) return null;
  if (id === "openai") {
    return [cuenta.email, cuenta.organizacion, cuenta.proyecto]
      .filter(Boolean)
      .join(" · ");
  }
  return cuenta.organizacion || cuenta.organizacion_id || null;
};

const AdminAsistenteView = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [nuevas, setNuevas] = useState({ openai: "", claude: "" });
  const [ocupado, setOcupado] = useState(""); // acción en curso
  const [modelo, setModelo] = useState("");
  const [modeloOpenAI, setModeloOpenAI] = useState("");
  const [tope, setTope] = useState("");

  const aplicar = useCallback((d) => {
    setData(d);
    setModelo(d.modelo_claude);
    setModeloOpenAI(d.modelo_openai);
    setTope(String(d.tope_diario));
  }, []);

  const cargar = useCallback(async () => {
    setLoading(true);
    setErrorCarga("");
    try {
      const res = await chatApi.get("/admin_asistente/config");
      if (res.data?.success) aplicar(res.data.data);
    } catch (err) {
      setErrorCarga(
        err.response?.data?.message || "No se pudo cargar la configuración.",
      );
    } finally {
      setLoading(false);
    }
  }, [aplicar]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const avisoError = (err, porDefecto) =>
    Swal.fire({
      icon: "error",
      title: "No se pudo completar",
      text: err.response?.data?.message || porDefecto,
      confirmButtonColor: "#171931",
    });

  const guardarLlave = async (id) => {
    const api_key = nuevas[id].trim();
    if (!api_key || ocupado) return;
    setOcupado(`llave-${id}`);
    try {
      const res = await chatApi.post("/admin_asistente/llave", {
        proveedor: id,
        api_key,
      });
      aplicar(res.data.data);
      setNuevas((n) => ({ ...n, [id]: "" }));
      Swal.fire({
        icon: "success",
        title: "Llave guardada",
        text: "Quedó cifrada. Usa «Probar» para confirmar que tiene saldo.",
        confirmButtonColor: "#171931",
      });
    } catch (err) {
      avisoError(err, "No se pudo guardar la llave.");
    } finally {
      setOcupado("");
    }
  };

  const quitarLlave = async (p) => {
    if (ocupado) return;
    const r = await Swal.fire({
      icon: "warning",
      title: `¿Quitar la llave de ${p.nombre}?`,
      text: "El asistente dejará de usarla de inmediato.",
      showCancelButton: true,
      confirmButtonText: "Quitar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#e11d48",
    });
    if (!r.isConfirmed) return;
    setOcupado(`quitar-${p.id}`);
    try {
      const res = await chatApi.post("/admin_asistente/eliminar_llave", {
        proveedor: p.id,
      });
      aplicar(res.data.data);
    } catch (err) {
      avisoError(err, "No se pudo quitar la llave.");
    } finally {
      setOcupado("");
    }
  };

  const probar = async (p) => {
    if (ocupado) return;
    setOcupado(`probar-${p.id}`);
    try {
      const res = await chatApi.post("/admin_asistente/probar", {
        proveedor: p.id,
      });
      if (res.data.data) aplicar(res.data.data);
      if (res.data.ok) {
        Swal.fire({
          icon: "success",
          title: "La llave responde",
          text: `${res.data.modelo} contestó en ${res.data.ms} ms.`,
          confirmButtonColor: "#171931",
        });
      } else {
        Swal.fire({
          icon: "error",
          title: ERROR_LABEL[res.data.codigo] || "La llave no respondió",
          text: res.data.mensaje,
          confirmButtonColor: "#171931",
        });
      }
    } catch (err) {
      avisoError(err, "No se pudo probar la llave.");
    } finally {
      setOcupado("");
    }
  };

  const guardarAjustes = async (cambios, clave) => {
    if (ocupado) return;
    setOcupado(clave);
    try {
      const res = await chatApi.post("/admin_asistente/guardar", {
        proveedor: data.proveedor,
        modelo_claude: modelo,
        modelo_openai: modeloOpenAI,
        tope_diario: Number(tope),
        ...cambios,
      });
      aplicar(res.data.data);
    } catch (err) {
      avisoError(err, "No se pudieron guardar los ajustes.");
    } finally {
      setOcupado("");
    }
  };

  const preguntasHoy = (data?.uso || [])
    .filter((u) => u.fecha === data.hoy && u.origen !== "propia")
    .reduce((s, u) => s + Number(u.preguntas || 0), 0);
  const nombrePrincipal =
    PROVEEDORES.find((p) => p.id === data?.proveedor)?.nombre || "—";
  const principalConLlave = Boolean(data?.[data?.proveedor]?.llave);
  const sinNingunaLlave =
    data && !data.openai.llave && !data.claude.llave && !data.respaldo_env;
  const ajustesCambiaron =
    data &&
    (modelo !== data.modelo_claude ||
      modeloOpenAI !== data.modelo_openai ||
      Number(tope) !== data.tope_diario);

  const inputCls =
    "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300";
  const labelCls = "block text-[11px] font-bold text-slate-600 mb-1.5";
  const btnSec =
    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 ring-1 ring-slate-200 hover:bg-slate-100 transition disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-3 pr-8">
      <div className="mx-auto w-[100%] m-3 md:m-6 bg-white rounded-2xl shadow-xl ring-1 ring-slate-200/70 flex flex-col min-h-[82vh] overflow-hidden">
        <header className="relative isolate overflow-hidden rounded-t-2xl">
          <div className="absolute inset-0 bg-[#171931]" aria-hidden />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.6]"
            style={{
              backgroundImage:
                "radial-gradient(600px circle at 0% 0%, rgba(79,70,229,0.25), transparent 45%), radial-gradient(500px circle at 100% 120%, rgba(99,102,241,0.18), transparent 40%)",
            }}
          />
          <div className="relative px-5 py-4 md:px-7 md:py-5 flex flex-col gap-4">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70 ring-1 ring-white/15">
                ImporChat · Asistente de ayuda
              </span>
              <h1 className="mt-2 text-xl md:text-2xl font-extrabold text-white tracking-tight leading-tight">
                Llaves del asistente flotante
              </h1>
              <p className="mt-0.5 text-white/55 text-[13px] leading-snug">
                Con qué cuenta de IA responde el asistente de ayuda a los
                clientes cuando paga la plataforma.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <HeaderStat
                label="Responde con"
                value={data ? nombrePrincipal : "…"}
                icon="bx-chip"
                accent="text-indigo-300"
              />
              <HeaderStat
                label="Preguntas hoy (plataforma)"
                value={data ? preguntasHoy : "…"}
                icon="bx-message-dots"
                accent="text-emerald-300"
              />
              <HeaderStat
                label="Tope por usuario al día"
                value={data ? data.tope_diario : "…"}
                icon="bx-shield-quarter"
                accent="text-amber-300"
              />
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-6 bg-slate-50/60 space-y-4">
          {loading && !data && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-pulse">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="h-4 w-32 bg-slate-100 rounded-full mb-3" />
                  <div className="h-24 bg-slate-100 rounded-xl" />
                </div>
              ))}
            </div>
          )}

          {errorCarga && (
            <div className="rounded-xl bg-rose-50 ring-1 ring-rose-100 px-4 py-3 text-xs text-rose-700 flex items-center justify-between gap-3">
              <span>
                <i className="bx bx-error-circle mr-1" />
                {errorCarga}
              </span>
              <button onClick={cargar} className={btnSec}>
                Reintentar
              </button>
            </div>
          )}

          {data && (
            <>
              {sinNingunaLlave && (
                <div className="rounded-xl bg-rose-50 ring-1 ring-rose-200 px-4 py-3 text-xs text-rose-700 leading-relaxed">
                  <i className="bx bx-error mr-1" />
                  <strong>No hay ninguna llave cargada.</strong> El asistente
                  de /conexiones no puede responder hasta que guardes una.
                </div>
              )}
              {!sinNingunaLlave && !principalConLlave && (
                <div className="rounded-xl bg-amber-50 ring-1 ring-amber-200 px-4 py-3 text-xs text-amber-800 leading-relaxed">
                  <i className="bx bx-info-circle mr-1" />
                  {nombrePrincipal} está marcado como principal pero no tiene
                  llave guardada aquí: el asistente está respondiendo con el
                  respaldo.
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {PROVEEDORES.map((p) => {
                  const info = data[p.id];
                  const esPrincipal = data.proveedor === p.id;
                  const cuenta = cuentaTexto(p.id, info.cuenta);
                  return (
                    <div
                      key={p.id}
                      className={`rounded-2xl border bg-white p-4 flex flex-col gap-3 ${
                        esPrincipal && info.llave
                          ? "border-indigo-300 ring-1 ring-indigo-100"
                          : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
                            <i className={`bx ${p.icono} text-xl`} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-extrabold text-slate-800 truncate">
                              {p.nombre}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {p.id === "claude"
                                ? etiquetaModelo(
                                    data.modelos_claude,
                                    data.modelo_claude,
                                  )
                                : etiquetaModelo(
                                    data.modelos_openai,
                                    data.modelo_openai,
                                  )}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ${
                            !info.llave
                              ? "bg-slate-50 text-slate-500 ring-slate-200"
                              : esPrincipal
                                ? "bg-indigo-50 text-indigo-600 ring-indigo-100"
                                : "bg-emerald-50 text-emerald-600 ring-emerald-100"
                          }`}
                        >
                          {!info.llave
                            ? "Sin llave"
                            : esPrincipal
                              ? "Principal"
                              : "Respaldo"}
                        </span>
                      </div>

                      {info.llave ? (
                        <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 px-3 py-2.5">
                          <p className="text-xs font-mono font-bold text-slate-700 break-all">
                            {info.llave}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500 break-words">
                            {cuenta
                              ? `Cuenta: ${cuenta}`
                              : "No se pudo identificar a qué cuenta pertenece."}
                          </p>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Pega una API key para que el asistente pueda
                          responder con {p.nombre}.
                        </p>
                      )}

                      {info.error && (
                        <div
                          className={`rounded-xl px-3 py-2.5 text-[11px] leading-relaxed ring-1 ${
                            info.error.codigo === "RATE_LIMIT"
                              ? "bg-amber-50 text-amber-800 ring-amber-200"
                              : "bg-rose-50 text-rose-700 ring-rose-200"
                          }`}
                        >
                          <p className="font-bold">
                            <i className="bx bx-error-circle mr-1" />
                            {ERROR_LABEL[info.error.codigo] || "Error"} ·{" "}
                            {fechaHora(info.error.at)}
                          </p>
                          <p className="mt-0.5 break-words">
                            {info.error.mensaje}
                          </p>
                          {info.error.codigo === "SIN_SALDO" && (
                            <a
                              href={p.recarga}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 inline-block font-semibold underline"
                            >
                              Recargar saldo
                            </a>
                          )}
                        </div>
                      )}

                      <div>
                        <label className={labelCls}>
                          {info.llave ? "Reemplazar llave" : "API key"}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="password"
                            autoComplete="off"
                            className={inputCls}
                            placeholder={p.placeholder}
                            value={nuevas[p.id]}
                            onChange={(e) =>
                              setNuevas((n) => ({
                                ...n,
                                [p.id]: e.target.value,
                              }))
                            }
                          />
                          <button
                            onClick={() => guardarLlave(p.id)}
                            disabled={!nuevas[p.id].trim() || Boolean(ocupado)}
                            className="shrink-0 rounded-xl bg-[#171931] px-4 text-xs font-semibold text-white hover:bg-[#23264a] transition disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {ocupado === `llave-${p.id}`
                              ? "Verificando…"
                              : "Guardar"}
                          </button>
                        </div>
                      </div>

                      {info.llave && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => probar(p)}
                            disabled={Boolean(ocupado)}
                            className={btnSec}
                          >
                            <i className="bx bx-play-circle text-sm" />
                            {ocupado === `probar-${p.id}`
                              ? "Probando…"
                              : "Probar"}
                          </button>
                          {!esPrincipal && (
                            <button
                              onClick={() =>
                                guardarAjustes(
                                  { proveedor: p.id },
                                  `principal-${p.id}`,
                                )
                              }
                              disabled={Boolean(ocupado)}
                              className={btnSec}
                            >
                              <i className="bx bx-star text-sm" />
                              Usar como principal
                            </button>
                          )}
                          <button
                            onClick={() => quitarLlave(p)}
                            disabled={Boolean(ocupado)}
                            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 ring-1 ring-rose-100 hover:bg-rose-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <i className="bx bx-trash text-sm" />
                            Quitar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-extrabold text-slate-800">Ajustes</p>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className={labelCls}>Modelo de OpenAI</label>
                    <select
                      className={inputCls}
                      value={modeloOpenAI}
                      onChange={(e) => setModeloOpenAI(e.target.value)}
                    >
                      {(data.modelos_openai || []).map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Modelo de Claude</label>
                    <select
                      className={inputCls}
                      value={modelo}
                      onChange={(e) => setModelo(e.target.value)}
                    >
                      {data.modelos_claude.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>
                      Preguntas por usuario al día (máx.{" "}
                      {data.tope_diario_max})
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={data.tope_diario_max}
                      className={inputCls}
                      value={tope}
                      onChange={(e) => setTope(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={() => guardarAjustes({}, "ajustes")}
                    disabled={!ajustesCambiaron || Boolean(ocupado)}
                    className="h-[42px] rounded-xl bg-[#171931] px-4 text-xs font-semibold text-white hover:bg-[#23264a] transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {ocupado === "ajustes" ? "Guardando…" : "Guardar ajustes"}
                  </button>
                </div>
                <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
                  Si la llave principal falla (sin saldo, inválida o caída), el
                  asistente pasa solo a la de respaldo
                  {data.respaldo_env
                    ? " y, como último recurso, a la llave OPENAI_API_KEY_SOPORTE que sigue en el servidor."
                    : "."}{" "}
                  Dentro de una conexión se usa primero la llave de OpenAI del
                  propio cliente, si tiene.
                  {data.updated_by &&
                    ` Último cambio: ${data.updated_by}, ${fechaHora(data.updated_at)}.`}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-extrabold text-slate-800">
                  Uso de los últimos 7 días
                </p>
                {data.uso.length === 0 ? (
                  <p className="mt-2 text-[11px] text-slate-500">
                    Todavía no hay preguntas registradas.
                  </p>
                ) : (
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-[10px] uppercase tracking-wide text-slate-400">
                          <th className="py-1.5 pr-3 font-semibold">Día</th>
                          <th className="py-1.5 pr-3 font-semibold">Llave</th>
                          <th className="py-1.5 pr-3 font-semibold text-right">
                            Preguntas
                          </th>
                          <th className="py-1.5 pr-3 font-semibold text-right">
                            Usuarios
                          </th>
                          <th className="py-1.5 font-semibold text-right">
                            Tokens
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.uso.map((u) => (
                          <tr
                            key={`${u.fecha}-${u.origen}`}
                            className="border-t border-slate-100 text-slate-700"
                          >
                            <td className="py-1.5 pr-3">{u.fecha}</td>
                            <td className="py-1.5 pr-3">
                              {ORIGEN_LABEL[u.origen] || u.origen}
                            </td>
                            <td className="py-1.5 pr-3 text-right tabular-nums">
                              {Number(u.preguntas).toLocaleString("es-EC")}
                            </td>
                            <td className="py-1.5 pr-3 text-right tabular-nums">
                              {Number(u.usuarios).toLocaleString("es-EC")}
                            </td>
                            <td className="py-1.5 text-right tabular-nums">
                              {Number(u.tokens).toLocaleString("es-EC")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Etiqueta del modelo guardado (no el que se está editando).
function etiquetaModelo(lista, valor) {
  return (lista || []).find((m) => m.value === valor)?.label || valor;
}

export default AdminAsistenteView;
