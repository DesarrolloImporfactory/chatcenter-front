import { useEffect, useMemo, useState } from "react";
import chatApi from "../../api/chatcenter";

/**
 * Tarjeta "Recibir llamadas de WhatsApp en ChatCenter". Va al lado de la
 * vista previa del perfil en administrador-whatsapp.
 *
 * El switch le pide a WhatsApp que encienda las llamadas en este número
 * (settings.calling.status). WhatsApp las entrega apagadas en todos los
 * números, por eso se enciende una vez por conexión. Si el número también
 * está en la app del celular, WhatsApp responde (#141000) y el back lo
 * traduce: acá solo se muestra el mensaje.
 */
export default function LlamadasWhatsappCard() {
  const id_configuracion = useMemo(
    () => Number(localStorage.getItem("id_configuracion")) || null,
    [],
  );
  const [estado, setEstado] = useState({
    cargando: true,
    activo: false,
    noCloudApi: false,
    error: "",
  });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!id_configuracion) return undefined;
    let vigente = true;
    chatApi
      .get("/llamadas/configuracion", { params: { id_configuracion } })
      .then(({ data }) => {
        if (!vigente) return;
        setEstado({
          cargando: false,
          activo: !!data?.data?.activo,
          noCloudApi: !!data?.data?.no_cloud_api,
          error: data?.data?.error || "",
        });
      })
      .catch((err) => {
        if (!vigente) return;
        setEstado({
          cargando: false,
          activo: false,
          noCloudApi: false,
          error:
            err?.response?.data?.message ||
            "No se pudo consultar el estado de las llamadas",
        });
      });
    return () => {
      vigente = false;
    };
  }, [id_configuracion]);

  const alternar = async () => {
    if (!id_configuracion || guardando) return;
    setGuardando(true);
    try {
      const { data } = await chatApi.post("/llamadas/configuracion", {
        id_configuracion,
        activo: !estado.activo,
      });
      setEstado({
        cargando: false,
        activo: !!data?.data?.activo,
        noCloudApi: false,
        error: "",
      });
    } catch (err) {
      const d = err?.response?.data || {};
      setEstado((e) => ({
        ...e,
        noCloudApi: !!d.no_cloud_api || Number(d.meta?.code) === 141000,
        error: d.message || "WhatsApp no permitió el cambio",
      }));
    } finally {
      setGuardando(false);
    }
  };

  const soloTelefono = estado.noCloudApi;

  return (
    <div className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100">
            <i className="bx bx-phone-call text-xl text-emerald-700" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Recibir llamadas de WhatsApp en ChatCenter
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Enciende esto y tus clientes verán el botón de llamar en tu chat
              de WhatsApp. Cuando llamen, la llamada sonará aquí en ChatCenter:
              al asesor que tiene el chat, o a todo el equipo si nadie lo
              tiene. Se contesta desde el computador con el micrófono. Las
              llamadas que hace el cliente no te cuestan nada.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={alternar}
          disabled={estado.cargando || guardando}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition disabled:opacity-50 ${
            estado.activo ? "bg-emerald-600" : "bg-slate-300"
          }`}
          role="switch"
          aria-checked={estado.activo}
          title={estado.activo ? "Apagar llamadas" : "Encender llamadas"}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
              estado.activo ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className="mt-3 text-xs">
        {estado.cargando ? (
          <span className="text-slate-400">Consultando…</span>
        ) : estado.activo ? (
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
            <i className="bx bx-check-circle" /> Encendido: las llamadas entran
            a ChatCenter
          </span>
        ) : soloTelefono ? (
          <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
            <i className="bx bx-mobile" /> Por ahora las llamadas suenan en tu
            celular
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 font-semibold text-slate-500">
            <i className="bx bx-minus-circle" /> Apagado: tus clientes no ven el
            botón de llamar
          </span>
        )}
        {estado.error ? (
          <div
            className={`mt-2 rounded-lg px-3 py-2 ${
              soloTelefono
                ? "bg-amber-50 text-amber-800"
                : "bg-rose-50 text-rose-700"
            }`}
          >
            {estado.error}
          </div>
        ) : null}
        {!estado.cargando && !estado.activo && !soloTelefono ? (
          <p className="mt-2 text-[11px] text-slate-400">
            Viene apagado porque WhatsApp lo entrega así en cada número. Si tu
            equipo no está listo para contestar, mejor déjalo apagado: el
            cliente vería el botón y nadie le atendería.
          </p>
        ) : null}
      </div>

      {id_configuracion && !estado.cargando ? (
        <AjustesLlamadas id_configuracion={id_configuracion} />
      ) : null}
    </div>
  );
}

/**
 * Llamar a los clientes de esta conexión desde otro número de la cuenta
 * (para números en la app del celular, que WhatsApp no deja llamar) y el
 * nombre con el que se presenta el mensaje de permiso.
 */
function AjustesLlamadas({ id_configuracion }) {
  const [aj, setAj] = useState(null);
  const [puente, setPuente] = useState("");
  const [nombre, setNombre] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState({ tipo: "", texto: "" });

  useEffect(() => {
    let vigente = true;
    chatApi
      .get("/llamadas/ajustes", { params: { id_configuracion } })
      .then(({ data }) => {
        if (!vigente) return;
        const d = data?.data || {};
        setAj(d);
        setPuente(d.id_configuracion_llamadas ? String(d.id_configuracion_llamadas) : "");
        setNombre(d.nombre_llamadas || "");
      })
      .catch(() => vigente && setAj(null));
    return () => {
      vigente = false;
    };
  }, [id_configuracion]);

  if (!aj) return null;

  const cambiado =
    String(aj.id_configuracion_llamadas || "") !== puente ||
    (aj.nombre_llamadas || "") !== nombre.trim();

  const guardar = async () => {
    setGuardando(true);
    setMsg({ tipo: "", texto: "" });
    try {
      const { data } = await chatApi.post("/llamadas/ajustes", {
        id_configuracion,
        id_configuracion_llamadas: puente ? Number(puente) : null,
        nombre_llamadas: nombre.trim() || null,
      });
      setAj(data?.data || aj);
      setMsg({ tipo: "ok", texto: "Guardado" });
    } catch (err) {
      setMsg({
        tipo: "error",
        texto: err?.response?.data?.message || "No se pudo guardar",
      });
    } finally {
      setGuardando(false);
    }
  };

  const porDefecto = aj.nombre_whatsapp || aj.nombre_configuracion;

  return (
    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-xs">
      <label className="block">
        <span className="font-semibold text-slate-700">
          Llamar a los clientes desde
        </span>
        <select
          value={puente}
          onChange={(e) => setPuente(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700"
        >
          <option value="">Este mismo número</option>
          {(aj.opciones || []).map((o) => (
            <option key={o.id} value={o.id}>
              {o.nombre_configuracion}
              {o.telefono ? ` · ${o.telefono}` : ""}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-[11px] text-slate-400">
          Si este número también está en la app del celular, WhatsApp no deja
          llamar desde él. Elige otra conexión tuya con las llamadas
          encendidas: el chat sigue aquí, pero el cliente verá la llamada desde
          ese otro número.
        </span>
      </label>

      <label className="block">
        <span className="font-semibold text-slate-700">
          Nombre con el que te presentas
        </span>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          maxLength={100}
          placeholder={porDefecto || "Nombre de tu negocio"}
          className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700"
        />
        <span className="mt-1 block text-[11px] text-slate-400">
          Va en el mensaje que pide permiso para llamar: «Hola, somos{" "}
          {nombre.trim() || porDefecto}…». Vacío = el nombre de WhatsApp del
          número.
        </span>
      </label>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={guardar}
          disabled={!cambiado || guardando}
          className="rounded-lg bg-slate-900 px-3 py-1.5 font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
        >
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        {msg.texto ? (
          <span className={msg.tipo === "ok" ? "text-emerald-700" : "text-rose-700"}>
            {msg.texto}
          </span>
        ) : null}
      </div>
    </div>
  );
}
