import React, { useState, useEffect, useCallback } from "react";
import { jwtDecode } from "jwt-decode";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";

/**
 * MiPerfilView — /mi-perfil (MainLayout_conexiones)
 *
 * Información del dueño de la cuenta, el WhatsApp personal donde recibe
 * TODOS los avisos del sistema (editable aquí mismo) y la bitácora de los
 * avisos que le hemos enviado.
 *
 * Mismo lenguaje visual que Usuarios/Conexiones: tarjeta blanca + hero navy
 * con glows índigo y título con degradado.
 */

const PAISES = [
  { code: "+593", label: "Ecuador (+593)" },
  { code: "+57", label: "Colombia (+57)" },
  { code: "+51", label: "Perú (+51)" },
  { code: "+52", label: "México (+52)" },
  { code: "+56", label: "Chile (+56)" },
  { code: "+54", label: "Argentina (+54)" },
  { code: "+55", label: "Brasil (+55)" },
  { code: "+58", label: "Venezuela (+58)" },
  { code: "+591", label: "Bolivia (+591)" },
  { code: "+595", label: "Paraguay (+595)" },
  { code: "+598", label: "Uruguay (+598)" },
  { code: "+507", label: "Panamá (+507)" },
  { code: "+506", label: "Costa Rica (+506)" },
  { code: "+34", label: "España (+34)" },
  { code: "+1", label: "EE.UU. / Canadá (+1)" },
];

const EVENTO_META = {
  regla_anuncio_pausado: {
    icon: "bx-pause-circle",
    color: "bg-amber-50 text-amber-600 ring-amber-100",
    label: "Anuncio pausado",
  },
  regla_campania_pausada: {
    icon: "bx-pause-circle",
    color: "bg-rose-50 text-rose-500 ring-rose-100",
    label: "Campaña pausada",
  },
  regla_presupuesto_subido: {
    icon: "bx-trending-up",
    color: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    label: "Presupuesto escalado",
  },
};

const fmtFecha = (v, largo = false) => {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString(
      "es-EC",
      largo
        ? { day: "2-digit", month: "long", year: "numeric" }
        : {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          },
    );
  } catch {
    return String(v);
  }
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

const MiPerfilView = () => {
  const [info, setInfo] = useState(null);
  const [avisos, setAvisos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ pais: "+593", numero: "" });

  let idUsuario = null;
  try {
    idUsuario = jwtDecode(localStorage.getItem("token"))?.id_usuario || null;
  } catch {
    idUsuario = null;
  }

  const fetchInfo = useCallback(async () => {
    if (!idUsuario) return;
    setLoading(true);
    try {
      const [iRes, aRes] = await Promise.all([
        chatApi.post("usuarios_chat_center/infoPropietario", {
          id_usuario: idUsuario,
        }),
        chatApi.post(
          "usuarios_chat_center/avisosEnviados",
          { id_usuario: idUsuario },
          { silentError: true },
        ),
      ]);
      if (iRes.data?.status === "success") {
        setInfo(iRes.data.data);
        setForm({
          pais: iRes.data.data.whatsapp_lead_pais || "+593",
          numero: iRes.data.data.whatsapp_lead || "",
        });
      }
      setAvisos(aRes.data?.status === "success" ? aRes.data.data || [] : []);
    } catch (err) {
      console.error("Perfil fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [idUsuario]);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  const guardarNumero = async () => {
    const digits = String(form.numero || "").replace(/\D/g, "");
    if (digits.length < 7) {
      Swal.fire({
        icon: "warning",
        title: "Número inválido",
        text: "Escribe tu número de WhatsApp (mínimo 7 dígitos).",
        customClass: { popup: "rounded-2xl" },
      });
      return;
    }
    setGuardando(true);
    try {
      const { data } = await chatApi.post(
        "usuarios_chat_center/actualizarWhatsappLead",
        {
          id_usuario: idUsuario,
          whatsapp_lead: digits,
          whatsapp_lead_pais: form.pais,
        },
      );
      if (data?.status === "success") {
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "Número actualizado",
          showConfirmButton: false,
          timer: 2000,
        });
        setEditando(false);
        fetchInfo();
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "No se pudo actualizar",
        text: err?.response?.data?.message || "Inténtalo de nuevo.",
        customClass: { popup: "rounded-2xl" },
      });
    } finally {
      setGuardando(false);
    }
  };

  const inputCls =
    "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-3 pr-8">
      <div className="mx-auto w-[100%] m-3 md:m-6 bg-white rounded-2xl shadow-xl ring-1 ring-slate-200/70 flex flex-col min-h-[82vh] overflow-hidden">
        {/* HERO — mismo estilo que Usuarios/Conexiones */}
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
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />

          <div className="relative px-5 py-4 md:px-7 md:py-5 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70 ring-1 ring-white/15">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  ImporChat · Mi Perfil
                </span>
                <h1 className="mt-2 text-xl md:text-2xl font-extrabold text-white tracking-tight leading-tight">
                  Tu cuenta,{" "}
                  <span className="bg-gradient-to-r from-indigo-300 to-violet-200 bg-clip-text text-transparent">
                    siempre al tanto
                  </span>
                </h1>
                <p className="mt-0.5 text-white/55 text-[13px] leading-snug">
                  Tus datos como dueño y el número donde te avisamos todo lo
                  importante.
                </p>
              </div>

              <div className="hidden md:grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15 text-2xl font-extrabold text-white">
                {(info?.nombre || "U").trim().charAt(0).toUpperCase()}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <HeaderStat
                label="Estado"
                value={info?.estado || "—"}
                icon="bx-badge-check"
                accent="text-emerald-300"
              />
              <HeaderStat
                label="WhatsApp de avisos"
                value={
                  info?.whatsapp_lead
                    ? `${info.whatsapp_lead_pais || ""} ${info.whatsapp_lead}`
                    : "Sin registrar"
                }
                icon="bxl-whatsapp"
                accent="text-emerald-300"
              />
              <HeaderStat
                label="Avisos recibidos"
                value={avisos.length}
                icon="bx-bell"
                accent="text-indigo-300"
              />
            </div>
          </div>
        </header>

        {/* CONTENIDO */}
        <div className="flex-1 p-4 md:p-6 bg-slate-50/60">
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-pulse">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200 bg-white p-5"
                >
                  <div className="h-4 w-40 bg-slate-100 rounded mb-4" />
                  <div className="h-3 w-full bg-slate-100 rounded mb-2" />
                  <div className="h-3 w-3/4 bg-slate-100 rounded mb-2" />
                  <div className="h-3 w-2/3 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : !info ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-8 py-14 text-center">
              <i className="bx bx-user-x text-4xl text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-600">
                No pudimos cargar tu información.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* FILA 1: dueño y whatsapp lado a lado, misma altura */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                    <i className="bx bx-id-card mr-1" />
                    Dueño de la cuenta
                  </p>
                  <div className="divide-y divide-slate-50 text-xs">
                    {[
                      ["bx-user", "Nombre", info.nombre || "—"],
                      ["bx-envelope", "Correo", info.email_propietario || "—"],
                      [
                        "bx-time-five",
                        "Cliente desde",
                        fmtFecha(info.created_at, true),
                      ],
                    ].map(([icon, k, v]) => (
                      <div key={k} className="flex items-center gap-3 py-2.5">
                        <i className={`bx ${icon} text-indigo-500 text-base`} />
                        <span className="w-24 shrink-0 text-slate-400 font-semibold">
                          {k}
                        </span>
                        <span className="text-slate-700 font-bold min-w-0 truncate">
                          {v}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-3 mb-1.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 ring-1 ring-emerald-100 grid place-items-center">
                      <i className="bx bxl-whatsapp text-emerald-600 text-lg" />
                    </div>
                    <p className="text-sm font-extrabold text-slate-800">
                      WhatsApp de avisos
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                    A este número personal te llegan los avisos del sistema
                    (reglas de campañas que pausan o escalan, y lo que vayamos
                    sumando), enviados{" "}
                    <span className="font-semibold text-slate-500">
                      desde tu propio número conectado en ImporChat
                    </span>
                    . Son solo avisos: nunca te haremos remarketing. Si
                    respondes, te atenderá tu propio asistente.
                  </p>

                  {!editando ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 ring-1 ring-slate-100 px-4 py-3">
                      <p className="text-sm font-bold text-slate-700">
                        {info.whatsapp_lead
                          ? `${info.whatsapp_lead_pais || ""} ${info.whatsapp_lead}`
                          : "Sin número registrado"}
                      </p>
                      <button
                        onClick={() => setEditando(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 ring-1 ring-indigo-200 hover:bg-indigo-100 transition"
                      >
                        <i className="bx bx-edit-alt" />
                        {info.whatsapp_lead ? "Editar" : "Agregar"}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <select
                          className={`${inputCls} !w-44`}
                          value={form.pais}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, pais: e.target.value }))
                          }
                        >
                          {PAISES.map((p) => (
                            <option key={p.code} value={p.code}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                        <input
                          className={inputCls}
                          value={form.numero}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              numero: e.target.value.replace(/\D/g, ""),
                            }))
                          }
                          placeholder="0999999999"
                          inputMode="numeric"
                          maxLength={20}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditando(false);
                            setForm({
                              pais: info.whatsapp_lead_pais || "+593",
                              numero: info.whatsapp_lead || "",
                            });
                          }}
                          className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-50 ring-1 ring-slate-200 hover:bg-slate-100 transition"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={guardarNumero}
                          disabled={guardando}
                          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-60"
                        >
                          {guardando ? (
                            <i className="bx bx-loader-alt animate-spin" />
                          ) : (
                            <i className="bx bx-save" />
                          )}
                          Guardar número
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* FILA 2: bitácora de avisos a lo ancho, con scroll interno */}
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                  <p className="text-sm font-extrabold text-slate-800">
                    <i className="bx bx-bell text-indigo-500 mr-1.5" />
                    Avisos que te hemos enviado
                  </p>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    últimos {avisos.length}
                  </span>
                </div>
                {avisos.length === 0 ? (
                  <div className="px-8 py-14 text-center">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-50 ring-1 ring-slate-100 grid place-items-center mb-4">
                      <i className="bx bx-bell-off text-2xl text-slate-300" />
                    </div>
                    <p className="text-sm font-bold text-slate-600 mb-1">
                      Todavía no te hemos enviado avisos
                    </p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                      Cuando actives las reglas automáticas de tus campañas,
                      cada acción que tomen te llegará por WhatsApp y quedará
                      registrada aquí.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50 max-h-[360px] overflow-y-auto">
                    {avisos.map((a) => {
                      const meta = EVENTO_META[a.evento] || {
                        icon: "bx-bell",
                        color: "bg-indigo-50 text-indigo-600 ring-indigo-100",
                        label: a.evento,
                      };
                      return (
                        <div
                          key={a.id}
                          className="px-5 py-3.5 flex items-start gap-3"
                        >
                          <div
                            className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ring-1 ${meta.color}`}
                          >
                            <i className={`bx ${meta.icon}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[11px] font-extrabold text-slate-700">
                                {meta.label}
                              </p>
                              <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                {fmtFecha(a.created_at)}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                              {a.resumen}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MiPerfilView;
