// src/views/LandingTrial.jsx
import React, { useEffect, useState } from "react";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";
import { FaArrowRight, FaCheckCircle } from "react-icons/fa";

const Feature = ({ children }) => (
  <li className="flex items-start gap-3">
    <span className="mt-[2px]">
      <FaCheckCircle className="opacity-90" />
    </span>
    <span className="text-slate-700">{children}</span>
  </li>
);

const LandingTrial = () => {
  const [eligible, setEligible] = useState(null);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);

  // lee token y user id igual que en Miplan.jsx
  const getAuth = () => {
    const token = localStorage.getItem("token");
    if (!token) return {};
    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      const id_usuario = decoded.id_usuario || decoded.id_users;
      return { token, id_usuario };
    } catch {
      return {};
    }
  };

  // mostrar aviso si el usuario vuelve con ?trial=cancel
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("trial") === "cancel") {
      Swal.fire("Cancelado", "No se completó el proceso en Stripe.", "info");
      const url = new URL(window.location.href);
      url.searchParams.delete("trial");
      window.history.replaceState({}, document.title, url.pathname);
    }
  }, []);

  // comprobar elegibilidad de la prueba gratis
  useEffect(() => {
    (async () => {
      const { token, id_usuario } = getAuth();
      if (!token || !id_usuario) {
        setEligible(false);
        setChecking(false);
        return;
      }
      try {
        const { data } = await chatApi.post(
          "/stripe_plan/trialElegibilidad",
          { id_usuario },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setEligible(Boolean(data?.elegible));
      } catch (e) {
        console.warn("trialElegibilidad:", e?.response?.data || e.message);
        setEligible(false);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  const startFreeTrial = async () => {
    const { token, id_usuario } = getAuth();
    if (!token || !id_usuario) {
      Swal.fire("Inicia sesión", "Debes iniciar sesión para continuar.", "info");
      return;
    }
    if (eligible === false) {
      Swal.fire("No disponible", "Ya usaste tu prueba gratuita.", "info");
      return;
    }
    try {
      setLoading(true);
      const base = window.location.origin;
      const payload = {
        id_usuario,
        success_url: `${base}/miplan?trial=ok`,
        cancel_url: `${base}${window.location.pathname}?trial=cancel`,
        trial_days: 365, // 12 meses (ajusta si usas exacto 365/360)
      };
      const { data } = await chatApi.post(
        "/stripe_plan/crearFreeTrial",
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data?.url) {
        window.location.href = data.url; // Stripe Checkout
      } else {
        throw new Error("No se recibió URL de Stripe.");
      }
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e.message ||
        "No se pudo iniciar la prueba gratuita.";
      Swal.fire("Error", msg, "error");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black">
      {/* HERO con gradiente al estilo MiPlan */}
      <header
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(180deg, #4b3f72 0%, #322b4f 60%, #1f1a33 100%)" }}
      >
        <div className="max-w-6xl mx-auto px-6 lg:px-10 py-16 md:py-20 text-white">
          <div className="max-w-3xl">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 ring-1 ring-emerald-400/40">
              ¡Nuevo! Prueba por 12 meses
            </span>
            <h1 className="mt-4 text-4xl md:text-5xl font-black tracking-tight">
              Centraliza tus chats con Chat Center
            </h1>
            <p className="mt-4 text-sm md:text-base text-[#e0dcf3] max-w-prose">
              Activa tu periodo de prueba de <strong>12 meses</strong>, sin compromiso.
              Cancela cuando quieras antes de la renovación.
            </p>

            <div className="mt-8 flex items-center gap-3">
              <button
                onClick={startFreeTrial}
                disabled={checking || loading || eligible === false}
                className={`
                  inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold
                  transition focus:outline-none focus:ring-2 focus:ring-[#c4bde4]/50
                  ${checking || loading || eligible === false
                    ? "bg-white/20 text-white/70 cursor-not-allowed"
                    : "bg-white text-[#171931] hover:-translate-y-[2px] hover:shadow-lg active:translate-y-0"}
                `}
              >
                {loading ? "Redirigiendo…" : "Comenzar 12 meses gratis"} <FaArrowRight />
              </button>

              {eligible === false && (
                <span className="text-xs text-red-200">Ya usaste tu prueba gratuita.</span>
              )}
            </div>

            <p className="mt-2 text-[11px] opacity-70">
              Requiere autenticación. Al finalizar el trial se realiza el cobro automático, salvo cancelación.
            </p>
          </div>
        </div>
      </header>

      {/* Bloque de beneficios rápido (mismo look & feel) */}
      <section className="max-w-6xl mx-auto px-6 lg:px-10 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="rounded-3xl p-6 border border-[#c4bde4]/40 bg-[#f5f4fb]">
            <h3 className="text-lg font-bold text-[#171931]">Lo esencial</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <Feature>1 conexión</Feature>
              <Feature>Contactos y conversaciones ilimitadas</Feature>
              <Feature>Integración con Meta</Feature>
            </ul>
          </div>
          <div className="rounded-3xl p-6 border border-[#c4bde4]/40 bg-[#f5f4fb]">
            <h3 className="text-lg font-bold text-[#171931]">Productividad</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <Feature>Plantillas, etiquetas y QR</Feature>
              <Feature>Analíticas básicas</Feature>
              <Feature>Automatizador inicial</Feature>
            </ul>
          </div>
          <div className="rounded-3xl p-6 border border-[#c4bde4]/40 bg-[#f5f4fb]">
            <h3 className="text-lg font-bold text-[#171931]">Pagos seguros</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <Feature>Stripe Checkout</Feature>
              <Feature>Portal de pagos</Feature>
              <Feature>Cancelación cuando quieras</Feature>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingTrial;
