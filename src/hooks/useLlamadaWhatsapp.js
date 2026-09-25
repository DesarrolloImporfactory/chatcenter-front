import { useCallback, useEffect, useRef, useState } from "react";
import chatApi from "../api/chatcenter";
import { useSocket } from "../context/SocketProvider";

/**
 * Llamadas de voz por WhatsApp — lado del asesor (fase 1: el cliente llama).
 *
 * Flujo:
 *   1. El back avisa por el socket de /presence (sala sub:<id>) con
 *      LLAMADA_ENTRANTE: trae la oferta de audio (SDP) de Meta. Suena el
 *      timbre y se muestra el panel.
 *   2. Al contestar, el navegador pide el micrófono, arma la conexión WebRTC
 *      con esa oferta (STUN público para descubrir su IP) y manda su
 *      respuesta a POST /llamadas/aceptar. El back la reenvía a Meta
 *      (pre_accept) y reclama la llamada: si otro asesor ya la tomó, llega
 *      409 y se muestra quién.
 *   3. Cuando el audio queda conectado, POST /llamadas/confirmar (accept en
 *      Meta). Si la conexión tarda, se confirma igual a los 4 s: Meta corta
 *      la llamada si no se acepta a tiempo.
 *   4. Colgar → POST /llamadas/terminar. El cierre definitivo (duración,
 *      notificación en el chat) llega por LLAMADA_TERMINADA.
 *
 * El audio va directo entre el navegador y Meta: el back solo pasa las SDP.
 */
const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];
const ESPERA_ICE_MS = 2500;
const ESPERA_CONEXION_MS = 4000;
const LIMPIAR_TRAS_MS = 5000;

const miIdSubUsuario = () => Number(localStorage.getItem("id_sub_usuario")) || null;

/** Timbre con Web Audio (sin archivo): dos tonos, 1 s sonando / 2 s de pausa. */
function crearTimbre() {
  let ctx = null;
  let intervalo = null;
  const tono = () => {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const g = ctx.createGain();
      g.gain.value = 0.06;
      g.connect(ctx.destination);
      for (const f of [440, 480]) {
        const o = ctx.createOscillator();
        o.frequency.value = f;
        o.connect(g);
        o.start();
        o.stop(ctx.currentTime + 1);
      }
    } catch {
      // Sin permiso de audio todavía: el panel visual alcanza.
    }
  };
  return {
    iniciar() {
      if (intervalo) return;
      tono();
      intervalo = setInterval(tono, 3000);
    },
    parar() {
      if (intervalo) clearInterval(intervalo);
      intervalo = null;
    },
  };
}

const esperarIce = (pc) =>
  new Promise((resolve) => {
    if (pc.iceGatheringState === "complete") return resolve();
    const t = setTimeout(resolve, ESPERA_ICE_MS);
    pc.addEventListener("icegatheringstatechange", () => {
      if (pc.iceGatheringState === "complete") {
        clearTimeout(t);
        resolve();
      }
    });
  });

export default function useLlamadaWhatsapp() {
  const { socket } = useSocket() || {};
  const [llamada, setLlamada] = useState(null);
  const [silenciado, setSilenciado] = useState(false);
  const pcRef = useRef(null);
  const streamRef = useRef(null);
  const audioRef = useRef(null);
  const timbreRef = useRef(null);
  const limpiezaRef = useRef(null);
  const confirmadaRef = useRef(false);

  const limpiarMedios = useCallback(() => {
    try {
      pcRef.current?.close();
    } catch {
      /* nada */
    }
    pcRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioRef.current) audioRef.current.srcObject = null;
    timbreRef.current?.parar();
    setSilenciado(false);
    confirmadaRef.current = false;
  }, []);

  const programarLimpieza = useCallback(() => {
    clearTimeout(limpiezaRef.current);
    limpiezaRef.current = setTimeout(() => setLlamada(null), LIMPIAR_TRAS_MS);
  }, []);

  const mostrarEntrante = useCallback((p) => {
    if (!p?.call_id || !p?.sdp_offer) return;
    clearTimeout(limpiezaRef.current);
    setLlamada({ ...p, fase: "timbrando", inicioCurso: null, error: "" });
    timbreRef.current = timbreRef.current || crearTimbre();
    timbreRef.current.iniciar();
  }, []);

  /* ── Socket ── */
  useEffect(() => {
    if (!socket) return undefined;
    const onEntrante = (p) => {
      setLlamada((actual) => {
        // Si hay una llamada en curso no se pisa; la nueva quedará en el chat como perdida.
        if (actual && ["conectando", "en_curso"].includes(actual.fase)) return actual;
        return actual;
      });
      mostrarEntrante(p);
    };
    const onTomada = (p) => {
      setLlamada((actual) => {
        if (!actual || actual.call_id !== p.call_id) return actual;
        if (Number(p.tomada_por?.id_sub_usuario) === miIdSubUsuario()) return actual;
        timbreRef.current?.parar();
        programarLimpieza();
        return { ...actual, fase: "tomada_por_otro", tomada_por: p.tomada_por };
      });
    };
    const onTerminada = (p) => {
      setLlamada((actual) => {
        if (!actual || actual.call_id !== p.call_id) return actual;
        limpiarMedios();
        programarLimpieza();
        return {
          ...actual,
          fase: "finalizada",
          motivo: p.motivo || "finalizada",
          duracion_seg: p.duracion_seg ?? null,
        };
      });
    };
    /* Saliente: Meta devuelve la respuesta de audio del cliente y luego
       el estado (timbrando / aceptó / rechazó). */
    const onConectada = async (p) => {
      const pc = pcRef.current;
      if (!pc || !p?.sdp_answer) return;
      try {
        await pc.setRemoteDescription({ type: "answer", sdp: p.sdp_answer });
      } catch (e) {
        setLlamada((a) =>
          a && a.call_id === p.call_id ? { ...a, error: "No se pudo conectar el audio" } : a,
        );
      }
    };
    const onEstado = (p) => {
      setLlamada((actual) => {
        if (!actual || actual.call_id !== p.call_id) return actual;
        if (p.status === "ACCEPTED") return { ...actual, fase: "en_curso", inicioCurso: Date.now() };
        if (p.status === "REJECTED") {
          limpiarMedios();
          programarLimpieza();
          return { ...actual, fase: "finalizada", motivo: "rechazada_cliente" };
        }
        return actual;
      });
    };
    socket.on("LLAMADA_ENTRANTE", onEntrante);
    socket.on("LLAMADA_TOMADA", onTomada);
    socket.on("LLAMADA_TERMINADA", onTerminada);
    socket.on("LLAMADA_CONECTADA", onConectada);
    socket.on("LLAMADA_ESTADO", onEstado);
    return () => {
      socket.off("LLAMADA_ENTRANTE", onEntrante);
      socket.off("LLAMADA_TOMADA", onTomada);
      socket.off("LLAMADA_TERMINADA", onTerminada);
      socket.off("LLAMADA_CONECTADA", onConectada);
      socket.off("LLAMADA_ESTADO", onEstado);
    };
  }, [socket, mostrarEntrante, programarLimpieza, limpiarMedios]);

  /* ── Al abrir/recargar: ¿hay una llamada timbrando para mí? ── */
  useEffect(() => {
    let vigente = true;
    chatApi
      .get("/llamadas/activas")
      .then(({ data }) => {
        if (!vigente) return;
        const pendiente = (data?.data || []).find((c) => c.sdp_offer && !c.tomada_por);
        if (pendiente) mostrarEntrante(pendiente);
      })
      .catch(() => {});
    return () => {
      vigente = false;
    };
  }, [mostrarEntrante]);

  useEffect(() => () => limpiarMedios(), [limpiarMedios]);

  /* ── Acciones ── */
  const confirmar = useCallback(
    async (call_id) => {
      if (confirmadaRef.current) return;
      confirmadaRef.current = true;
      try {
        await chatApi.post("/llamadas/confirmar", { call_id });
        setLlamada((a) =>
          a && a.call_id === call_id ? { ...a, fase: "en_curso", inicioCurso: Date.now() } : a,
        );
      } catch (err) {
        setLlamada((a) =>
          a && a.call_id === call_id
            ? { ...a, fase: "finalizada", motivo: "error", error: err?.response?.data?.message || "No se pudo conectar" }
            : a,
        );
        limpiarMedios();
        programarLimpieza();
      }
    },
    [limpiarMedios, programarLimpieza],
  );

  const contestar = useCallback(async () => {
    const actual = llamada;
    if (!actual || actual.fase !== "timbrando") return;
    timbreRef.current?.parar();
    setLlamada((a) => ({ ...a, fase: "conectando", error: "" }));
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      pc.ontrack = (ev) => {
        if (audioRef.current) {
          audioRef.current.srcObject = ev.streams[0];
          audioRef.current.play().catch(() => {});
        }
      };
      let temporizador = null;
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          clearTimeout(temporizador);
          confirmar(actual.call_id);
        } else if (["failed", "closed"].includes(pc.connectionState)) {
          setLlamada((a) =>
            a && a.call_id === actual.call_id && a.fase !== "finalizada"
              ? { ...a, error: "Se perdió la conexión de audio" }
              : a,
          );
        }
      };
      await pc.setRemoteDescription({ type: "offer", sdp: actual.sdp_offer });
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await esperarIce(pc);
      await chatApi.post("/llamadas/aceptar", {
        call_id: actual.call_id,
        sdp_answer: pc.localDescription.sdp,
      });
      // Si el audio no conecta rápido, se acepta igual: Meta no espera.
      temporizador = setTimeout(() => confirmar(actual.call_id), ESPERA_CONEXION_MS);
    } catch (err) {
      const tomada = err?.response?.data?.tomada_por;
      limpiarMedios();
      programarLimpieza();
      setLlamada((a) =>
        a
          ? {
              ...a,
              fase: tomada ? "tomada_por_otro" : "finalizada",
              tomada_por: tomada || a.tomada_por,
              motivo: tomada ? "tomada" : "error",
              error: tomada
                ? ""
                : err?.name === "NotAllowedError"
                  ? "Debes permitir el micrófono para contestar"
                  : err?.response?.data?.message || err?.message || "No se pudo contestar",
            }
          : a,
      );
    }
  }, [llamada, confirmar, limpiarMedios, programarLimpieza]);

  const rechazar = useCallback(async () => {
    if (!llamada) return;
    const id = llamada.call_id;
    timbreRef.current?.parar();
    try {
      await chatApi.post("/llamadas/rechazar", { call_id: id });
    } catch {
      /* si ya no existe, igual se limpia */
    }
    limpiarMedios();
    setLlamada((a) => (a && a.call_id === id ? { ...a, fase: "finalizada", motivo: "rejected" } : a));
    programarLimpieza();
  }, [llamada, limpiarMedios, programarLimpieza]);

  const colgar = useCallback(async () => {
    if (!llamada) return;
    const id = llamada.call_id;
    try {
      if (id) await chatApi.post("/llamadas/terminar", { call_id: id });
    } catch {
      /* el webhook terminate cerrará igual */
    }
    limpiarMedios();
    setLlamada((a) => (a && a.call_id === id ? { ...a, fase: "finalizada", motivo: "colgada" } : a));
    programarLimpieza();
  }, [llamada, limpiarMedios, programarLimpieza]);

  /* ── Saliente: el asesor llama al cliente ──
     Lo dispara el botón de la cabecera del chat con
     window.dispatchEvent(new CustomEvent("llamada:iniciar", { detail })).
     El navegador arma la oferta de audio y el back la manda a Meta
     (action connect); la respuesta llega por LLAMADA_CONECTADA. */
  const iniciarSaliente = useCallback(
    async (detalle) => {
      if (!detalle?.id_cliente_chat_center || !detalle?.id_configuracion) return;
      if (llamada && !["finalizada", "tomada_por_otro"].includes(llamada.fase)) return;
      clearTimeout(limpiezaRef.current);
      setLlamada({
        call_id: null,
        nombre_cliente: detalle.nombre_cliente || detalle.telefono,
        telefono: detalle.telefono,
        id_cliente_chat_center: detalle.id_cliente_chat_center,
        id_configuracion: detalle.id_configuracion,
        direccion: "saliente",
        fase: "llamando",
        inicioCurso: null,
        error: "",
      });
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        pcRef.current = pc;
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        pc.ontrack = (ev) => {
          if (audioRef.current) {
            audioRef.current.srcObject = ev.streams[0];
            audioRef.current.play().catch(() => {});
          }
        };
        const offer = await pc.createOffer({ offerToReceiveAudio: true });
        await pc.setLocalDescription(offer);
        await esperarIce(pc);
        const { data } = await chatApi.post("/llamadas/llamar", {
          id_configuracion: detalle.id_configuracion,
          id_cliente_chat_center: detalle.id_cliente_chat_center,
          sdp_offer: pc.localDescription.sdp,
        });
        setLlamada((a) => (a ? { ...a, ...(data?.data || {}), fase: "llamando" } : a));
      } catch (err) {
        limpiarMedios();
        programarLimpieza();
        setLlamada((a) =>
          a
            ? {
                ...a,
                fase: "finalizada",
                motivo: "error",
                error:
                  err?.name === "NotAllowedError"
                    ? "Debes permitir el micrófono para llamar"
                    : err?.response?.data?.message || err?.message || "No se pudo llamar",
              }
            : a,
        );
      }
    },
    [llamada, limpiarMedios, programarLimpieza],
  );

  useEffect(() => {
    const h = (ev) => iniciarSaliente(ev.detail);
    window.addEventListener("llamada:iniciar", h);
    return () => window.removeEventListener("llamada:iniciar", h);
  }, [iniciarSaliente]);

  const alternarSilencio = useCallback(() => {
    const pista = streamRef.current?.getAudioTracks?.()[0];
    if (!pista) return;
    pista.enabled = !pista.enabled;
    setSilenciado(!pista.enabled);
  }, []);

  const descartar = useCallback(() => {
    clearTimeout(limpiezaRef.current);
    limpiarMedios();
    setLlamada(null);
  }, [limpiarMedios]);

  return {
    llamada,
    silenciado,
    audioRef,
    contestar,
    rechazar,
    colgar,
    alternarSilencio,
    descartar,
  };
}
