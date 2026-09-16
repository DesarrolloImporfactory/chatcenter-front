import React, { useEffect, useState } from "react";
import chatApi from "../../api/chatcenter";

/**
 * Pestaña "Reparto de chats" del modal de departamento.
 *
 * Responde en lenguaje llano la pregunta "¿por qué a X le llegan más chats
 * que a Y?" para que el dueño de la cuenta no tenga que pedirnos el análisis:
 * por persona, cuántos chats le tocaron por turno, cuántos tomó por su cuenta
 * y qué tan seguido estaba conectada cuando llegaban chats.
 *
 * Ojo con el lenguaje: la rueda NO premia a quien está más tiempo conectada.
 * Rota parejo entre las personas conectadas en el momento en que entra cada
 * chat; quien no está conectada simplemente no participa de ese turno.
 *
 * El tiempo conectada solo se muestra cuando ya hay datos (la tabla
 * presencia_sesiones se llena desde el deploy); una columna vacía genera más
 * preguntas de las que responde.
 */

const PERIODOS = [
  { dias: 0, label: "Hoy" },
  { dias: 7, label: "7 días" },
  { dias: 30, label: "30 días" },
  { dias: 90, label: "90 días" },
];

const n = (v) => Number(v || 0).toLocaleString("es-EC");

const pct = (parte, total) =>
  Number(total) > 0 ? Math.round((Number(parte) * 100) / Number(total)) : 0;

const tiempo = (segundos) => {
  const s = Number(segundos || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0 && m === 0) return "menos de 1 min";
  if (h === 0) return `${m} min`;
  return `${h} h ${String(m).padStart(2, "0")} min`;
};

const colorDisp = (p) => (p >= 70 ? "#059669" : p >= 40 ? "#d97706" : "#e11d48");

const Barra = ({ valor, color = "#1d4ed8" }) => (
  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
    <div
      className="h-full rounded-full transition-all"
      style={{ width: `${Math.min(100, Math.max(0, valor))}%`, background: color }}
    />
  </div>
);

const RepartoDepartamento = ({ id_departamento }) => {
  const [dias, setDias] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!id_departamento) return;
    let cancelado = false;
    setLoading(true);
    setError("");
    chatApi
      .get(`/departamentos_chat_center/reparto/${id_departamento}`, {
        params: { dias },
      })
      .then((res) => {
        if (!cancelado) setData(res.data?.data || null);
      })
      .catch(() => {
        if (!cancelado)
          setError("No se pudo cargar el reparto de chats. Intenta de nuevo.");
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, [id_departamento, dias]);

  const resumen = data?.resumen || {};
  const miembros = data?.miembros || [];
  const totalAsignados =
    Number(resumen.total_automaticos || 0) + Number(resumen.total_tomados || 0);
  const conRegistro = Number(resumen.repartos_con_registro || 0);
  const equipoCompleto = pct(resumen.veces_todos_disponibles, conRegistro);
  const hayTiempos = miembros.some((m) => Number(m.segundos_conectado) > 0);
  const nadie = Number(resumen.veces_nadie_disponible || 0);
  const escribieron = Number(resumen.clientes_que_escribieron || 0);
  const nuevos = Number(resumen.chats_nuevos || 0);
  const sinAsignar = Number(resumen.chats_nuevos_sin_asignar || 0);
  const periodoTxt = dias === 0 ? "hoy" : `últimos ${dias} días`;

  // Personas que sí reciben chats primero; el admin y los sin reparto, al final.
  const ordenados = [...miembros].sort(
    (a, b) => Number(b.en_rueda) - Number(a.en_rueda) || b.total - a.total,
  );

  return (
    <div className="space-y-4">
      {/* Encabezado + periodo */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#171931]">
            Reparto de chats · {periodoTxt}
          </p>
          <p className="mt-0.5 text-[12px] leading-4 text-slate-500">
            Cada chat nuevo se entrega por turno, en orden, a las personas que
            están conectadas en ese momento.
          </p>
        </div>
        <div className="inline-flex self-start rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          {PERIODOS.map((p) => (
            <button
              key={p.dias}
              type="button"
              onClick={() => setDias(p.dias)}
              className={`px-3 py-1 rounded-md text-[12px] font-semibold transition-colors ${
                dias === p.dias
                  ? "bg-white text-[#1d4ed8] shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-slate-400 text-sm">
          <i className="bx bx-loader-alt bx-spin text-xl mr-2"></i>
          Calculando reparto…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : !miembros.length ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          Este departamento aún no tiene usuarios asignados.
        </div>
      ) : totalAsignados === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          No se asignaron chats a este equipo {periodoTxt}.
        </div>
      ) : (
        <>
          {/* Resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Chats asignados al equipo
              </p>
              <p className="mt-1 text-2xl font-extrabold text-[#171931] leading-none">
                {n(totalAsignados)}
              </p>
              <p className="mt-1.5 text-[12px] leading-4 text-slate-500">
                {n(resumen.total_automaticos)} entregados por turno ·{" "}
                {n(resumen.total_tomados)} tomados desde “En espera”.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Equipo completo conectado
              </p>
              <p
                className="mt-1 text-2xl font-extrabold leading-none"
                style={{ color: conRegistro > 0 ? colorDisp(equipoCompleto) : "#171931" }}
              >
                {conRegistro > 0 ? `${equipoCompleto}%` : "—"}
              </p>
              <p className="mt-1.5 text-[12px] leading-4 text-slate-500">
                {conRegistro > 0
                  ? `De cada 100 chats entregados por turno, en ${equipoCompleto} estaban conectadas todas las personas del turno. En el resto, el chat se repartió solo entre quienes sí estaban.`
                  : "Aún no hay registro de conexión para este periodo."}
              </p>
            </div>
          </div>

          {/* Para cuadrar con "conversaciones" de otras pantallas */}
          {escribieron > 0 && (
            <p className="text-[12px] leading-5 text-slate-500 px-1">
              En este periodo escribieron <b className="text-[#171931]">{n(escribieron)}</b>{" "}
              clientes. De ellos, <b className="text-[#171931]">{n(nuevos)}</b> eran chats
              nuevos que entraron al reparto
              {sinAsignar > 0 && (
                <>
                  {" "}
                  (<b className="text-[#171931]">{n(sinAsignar)}</b> siguen sin persona
                  asignada)
                </>
              )}
              . Los demás ya tenían una persona asignada de antes y siguen con ella, por
              eso no cuentan como chats nuevos aquí.
            </p>
          )}

          {/* Una tarjeta por persona */}
          <div className="space-y-2.5">
            {ordenados.map((m) => {
              const share = pct(m.total, totalAsignados);
              const disp = pct(m.veces_disponible, conRegistro);
              const admin = m.rol === "administrador";
              return (
                <div
                  key={m.id_sub_usuario}
                  className={`rounded-xl border p-3.5 ${
                    m.en_rueda
                      ? "border-slate-200 bg-white"
                      : "border-slate-100 bg-slate-50/60"
                  }`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="font-semibold text-[#171931] truncate">
                      {m.nombre}
                      {admin && (
                        <span className="ml-2 text-[11px] font-medium text-slate-400">
                          administrador · no entra en el turno
                        </span>
                      )}
                      {!admin && !m.en_rueda && (
                        <span className="ml-2 text-[11px] font-medium text-slate-400">
                          sin reparto automático
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-slate-600">
                      <span className="text-lg font-extrabold text-[#171931]">
                        {n(m.total)}
                      </span>{" "}
                      chats · {share}% del equipo
                    </p>
                  </div>
                  <div className="mt-2">
                    <Barra valor={share} />
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px] text-slate-600">
                    <span>
                      <b className="text-[#171931]">{n(m.automaticos)}</b> le
                      tocaron por turno
                    </span>
                    <span>
                      <b className="text-[#171931]">{n(m.tomados)}</b> los tomó
                      desde “En espera”
                    </span>
                    {hayTiempos && Number(m.segundos_conectado) > 0 && (
                      <span>
                        <b className="text-[#171931]">
                          {tiempo(m.segundos_conectado)}
                        </b>{" "}
                        conectada en total
                      </span>
                    )}
                  </div>

                  {m.en_rueda && conRegistro > 0 && (
                    <div className="mt-2.5">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-slate-600">
                          Estaba conectada cuando entró un chat
                        </span>
                        <span
                          className="font-bold"
                          style={{ color: colorDisp(disp) }}
                        >
                          {disp}% de las veces
                        </span>
                      </div>
                      <div className="mt-1">
                        <Barra valor={disp} color={colorDisp(disp)} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Cómo funciona el reparto */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] leading-5 text-slate-600 space-y-1">
            <p>
              <b className="text-[#171931]">El turno es parejo.</b> Cada chat
              nuevo va a la persona conectada que lleva más tiempo sin recibir
              uno. Nadie recibe más por estar más tiempo conectada: simplemente
              participa en más turnos.
            </p>
            <p>
              <b className="text-[#171931]">Quien no está conectada no participa
              de ese turno.</b> El chat pasa a la siguiente persona conectada, y
              si no hay ninguna, queda en “En espera”.
            </p>
            <p>
              <b className="text-[#171931]">Conectada</b> significa con ImporChat
              abierto y la sesión activa. Una pestaña minimizada, el equipo
              suspendido o la sesión cerrada cuentan como desconectada, aunque
              la persona esté en su puesto.
            </p>
            <p>
              <b className="text-[#171931]">Tomados desde “En espera”</b> son
              chats que la persona abrió y se asignó por su cuenta. No pasan
              por el turno y no se descuentan de él.
            </p>
            {nadie > 0 && (
              <p>
                {n(nadie)} chats entraron sin ninguna persona del turno conectada
                y quedaron en “En espera”.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default RepartoDepartamento;
