import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { registerThunk } from "../../store/slices/user.slice";
import { fetchComunidadesThunk } from "../../store/slices/comunidad.slice";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";

/* ============================================================
   Países LATAM + ES
   ============================================================ */
const PAISES = [
  { code: "+593", flag: "🇪🇨", name: "Ecuador" },
  { code: "+57", flag: "🇨🇴", name: "Colombia" },
  { code: "+51", flag: "🇵🇪", name: "Perú" },
  { code: "+52", flag: "🇲🇽", name: "México" },
  { code: "+56", flag: "🇨🇱", name: "Chile" },
  { code: "+54", flag: "🇦🇷", name: "Argentina" },
  { code: "+55", flag: "🇧🇷", name: "Brasil" },
  { code: "+58", flag: "🇻🇪", name: "Venezuela" },
  { code: "+591", flag: "🇧🇴", name: "Bolivia" },
  { code: "+595", flag: "🇵🇾", name: "Paraguay" },
  { code: "+598", flag: "🇺🇾", name: "Uruguay" },
  { code: "+507", flag: "🇵🇦", name: "Panamá" },
  { code: "+506", flag: "🇨🇷", name: "Costa Rica" },
  { code: "+34", flag: "🇪🇸", name: "España" },
  { code: "+1", flag: "🇺🇸", name: "USA" },
];

/* ============================================================
   MeshBg
   ============================================================ */
const MeshBg = () => (
  <div className="absolute inset-0 overflow-hidden">
    <div
      className="absolute inset-0"
      style={{
        background:
          "linear-gradient(135deg, #f1f5f9 0%, #f8fafc 30%, #ecfdf5 60%, #f1f5f9 100%)",
      }}
    />
    <div
      className="absolute inset-0"
      style={{
        backgroundImage:
          "linear-gradient(rgba(11,20,38,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(11,20,38,0.04) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
      }}
    />
    <div
      className="absolute w-[500px] h-[500px] rounded-full animate-[drift1_20s_ease-in-out_infinite]"
      style={{
        top: "-10%",
        left: "-5%",
        background:
          "radial-gradient(circle, rgba(16,185,129,0.12), transparent 65%)",
        filter: "blur(40px)",
      }}
    />
    <div
      className="absolute w-[600px] h-[600px] rounded-full animate-[drift2_25s_ease-in-out_infinite]"
      style={{
        bottom: "-15%",
        right: "-10%",
        background:
          "radial-gradient(circle, rgba(0,191,255,0.10), transparent 65%)",
        filter: "blur(50px)",
      }}
    />
    <div
      className="absolute w-[350px] h-[350px] rounded-full animate-[drift3_18s_ease-in-out_infinite]"
      style={{
        top: "40%",
        right: "30%",
        background:
          "radial-gradient(circle, rgba(245,158,11,0.05), transparent 65%)",
        filter: "blur(30px)",
      }}
    />
    <svg
      className="absolute top-[20%] left-[18%] w-7 h-7 text-emerald-300/20 animate-[spin_30s_linear_infinite]"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <rect x="4" y="4" width="16" height="16" rx="3" />
    </svg>
    <svg
      className="absolute bottom-[20%] right-[18%] w-5 h-5 text-cyan-300/20 animate-[spin_25s_linear_infinite_reverse]"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <circle cx="12" cy="12" r="10" />
    </svg>
    <style>{`
      @keyframes drift1 { 0%,100%{transform:translate(0,0)} 33%{transform:translate(-30px,20px)} 66%{transform:translate(20px,-15px)} }
      @keyframes drift2 { 0%,100%{transform:translate(0,0)} 33%{transform:translate(25px,-20px)} 66%{transform:translate(-15px,25px)} }
      @keyframes drift3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(15px,15px)} }
    `}</style>
  </div>
);

/* ============================================================
   Counter animado
   ============================================================ */
const Counter = ({ target, label, color, suffix = "" }) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const end = parseInt(target);
    if (isNaN(end)) {
      setVal(target);
      return;
    }
    let start = 0;
    const step = Math.max(1, Math.floor(end / 50));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setVal(end);
        clearInterval(timer);
      } else setVal(start);
    }, 30);
    return () => clearInterval(timer);
  }, [target]);
  return (
    <div className="text-center">
      <p className="text-xl font-extrabold" style={{ color }}>
        {val}
        {suffix}
      </p>
      <p className="text-[8px] text-slate-500 mt-0.5">{label}</p>
    </div>
  );
};

/* ============================================================
   EyeIcon
   ============================================================ */
const EyeIcon = ({ show }) => (
  <svg
    className="w-[18px] h-[18px]"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    {show ? (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    ) : (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    )}
  </svg>
);

/* ============================================================
   Combobox de comunidades — solo selección (sin crear)
   ============================================================ */
const ComunidadCombobox = ({ value, onChange }) => {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [lista, setLista] = useState([]);
  const wrapRef = useRef(null);

  useEffect(() => {
    dispatch(fetchComunidadesThunk(""))
      .unwrap()
      .then(setLista)
      .catch(() => setLista([]));
  }, [dispatch]);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtradas = useMemo(() => {
    if (!query.trim()) return lista;
    const q = query.toLowerCase().trim();
    return lista.filter((c) => c.nombre.toLowerCase().includes(q));
  }, [lista, query]);

  const handleSelect = (com) => {
    onChange({ id_comunidad: com.id_comunidad, nombre: com.nombre });
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-2 pl-10 pr-10 py-3 rounded-xl text-sm bg-white text-left border-2 transition-all ${open ? "border-emerald-600 shadow-[0_0_0_3px_rgba(16,185,129,0.08)]" : "border-slate-200/80"}`}
      >
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87" />
            <path d="M16 3.13a4 4 0 010 7.75" />
          </svg>
        </div>
        <span className={value?.nombre ? "text-[#0B1426]" : "text-slate-400"}>
          {value?.nombre || "Seleccionar comunidad..."}
        </span>
        <svg
          className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute z-30 mt-1.5 w-full rounded-xl bg-white border border-slate-200 shadow-xl overflow-hidden"
          >
            <div className="p-2 border-b border-slate-100 bg-slate-50">
              <div className="relative">
                <svg
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar comunidad..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white rounded-md border border-slate-200 outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="max-h-[200px] overflow-y-auto">
              {filtradas.length === 0 && (
                <p className="px-3 py-4 text-xs text-slate-400 text-center">
                  No encontramos esa comunidad
                </p>
              )}

              {filtradas.map((c) => (
                <button
                  key={c.id_comunidad}
                  type="button"
                  onClick={() => handleSelect(c)}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 transition flex items-center justify-between ${value?.id_comunidad === c.id_comunidad ? "bg-emerald-50/60" : ""}`}
                >
                  <span className="text-[#0B1426]">{c.nombre}</span>
                  {value?.id_comunidad === c.id_comunidad && (
                    <svg
                      className="w-3.5 h-3.5 text-emerald-600"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}

              {value?.id_comunidad && (
                <button
                  type="button"
                  onClick={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-[10px] border-t border-slate-100 hover:bg-rose-50 text-rose-500 transition"
                >
                  Quitar selección
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ============================================================
   PaisSelect con portal + buscador
   ============================================================ */
const PaisSelect = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 260 });
  const btnRef = useRef(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const updateCoords = () => {
      const rect = btnRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = 260;
      const desiredLeft = rect.left;
      const maxLeft = window.innerWidth - width - 8;
      setCoords({
        top: rect.bottom + 4,
        left: Math.min(desiredLeft, Math.max(8, maxLeft)),
        width,
      });
    };
    updateCoords();

    setTimeout(() => inputRef.current?.focus(), 60);

    const handleClickOutside = (e) => {
      if (
        !btnRef.current?.contains(e.target) &&
        !dropdownRef.current?.contains(e.target)
      ) {
        setOpen(false);
        setQuery("");
      }
    };
    const handleKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", updateCoords);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", updateCoords);
    };
  }, [open]);

  const sel = PAISES.find((p) => p.code === value) || PAISES[0];

  const q = query.toLowerCase().trim();
  const qDigits = q.replace(/[^\d]/g, "");
  const filtered = !q
    ? PAISES
    : PAISES.filter((p) => {
        const matchName = p.name.toLowerCase().includes(q);
        const matchCodeText = p.code.toLowerCase().includes(q);
        const matchCodeDigits = qDigits && p.code.includes(qDigits);
        return matchName || matchCodeText || matchCodeDigits;
      });

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-50 transition text-xs"
      >
        <span className="text-base leading-none">{sel.flag}</span>
        <span className="font-medium text-[#0B1426]">{sel.code}</span>
        <svg
          className="w-3 h-3 text-slate-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open &&
        createPortal(
          <AnimatePresence>
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              className="fixed bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
              style={{
                top: coords.top,
                left: coords.left,
                width: coords.width,
                zIndex: 100000,
              }}
            >
              {/* Buscador */}
              <div className="p-2 border-b border-slate-100 bg-slate-50">
                <div className="relative">
                  <svg
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar país..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white rounded-md border border-slate-200 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Lista */}
              <ul className="max-h-[260px] overflow-y-auto">
                {filtered.length === 0 ? (
                  <li className="px-3 py-4 text-xs text-slate-400 text-center">
                    No encontramos ese país
                  </li>
                ) : (
                  filtered.map((p) => (
                    <li key={p.code}>
                      <button
                        type="button"
                        onClick={() => {
                          onChange(p.code);
                          setOpen(false);
                          setQuery("");
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-emerald-50 text-left transition ${
                          value === p.code ? "bg-emerald-50/70" : ""
                        }`}
                      >
                        <span className="text-base">{p.flag}</span>
                        <span className="text-[#0B1426] flex-1">{p.name}</span>
                        <span className="text-slate-500 font-mono">
                          {p.code}
                        </span>
                        {value === p.code && (
                          <svg
                            className="w-3.5 h-3.5 text-emerald-600"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </motion.div>
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
};

/* ============================================================
   COMPONENTE PRINCIPAL
   ============================================================ */
export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);

  const [comunidad, setComunidad] = useState(null);
  const [waPais, setWaPais] = useState("+593");

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();
  const acepta = watch("acepta", false);

  const onSubmit = (data) => {
    const waDigits = (data.whatsapp_lead || "").replace(/\D/g, "");

    const payload = {
      email: data.email,
      nombre_encargado: data.nombre_encargado,
      password: data.password,
      whatsapp_lead: waDigits,
      whatsapp_lead_pais: waPais,
      ...(comunidad?.id_comunidad && {
        id_comunidad: comunidad.id_comunidad,
      }),
    };

    dispatch(registerThunk(payload))
      .unwrap()
      .then(() => {
        reset();
        setComunidad(null);
        navigate("/login");
      });
  };

  const inputCls = (err) =>
    `w-full pl-10 pr-4 py-3 rounded-xl text-sm bg-white text-[#0B1426] placeholder-slate-400 outline-none border-2 transition-all focus:border-emerald-600 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.08)] ${err ? "border-rose-400" : "border-slate-200/80"}`;
  const inputClsPwd = (err) =>
    `w-full pl-10 pr-12 py-3 rounded-xl text-sm bg-white text-[#0B1426] placeholder-slate-400 outline-none border-2 transition-all focus:border-emerald-600 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.08)] ${err ? "border-rose-400" : "border-slate-200/80"}`;

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-14">
      <MeshBg />

      <div className="grid gap-8 lg:gap-12 md:grid-cols-[1.1fr_1fr] items-center w-full max-w-[1100px] z-10">
        {/* PANEL IZQUIERDO */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="hidden md:flex flex-col"
        >
          <div
            className="rounded-3xl p-8 shadow-2xl relative overflow-hidden"
            style={{
              background:
                "linear-gradient(145deg, #0B1426 0%, #0d3330 50%, #132743 100%)",
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.04]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />
            <div
              className="absolute top-0 left-0 w-[250px] h-[250px] pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle, rgba(16,185,129,0.15), transparent 60%)",
              }}
            />
            <div
              className="absolute bottom-0 right-0 w-[200px] h-[200px] pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle, rgba(0,191,255,0.12), transparent 60%)",
              }}
            />

            <div className="relative">
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider mb-5"
                style={{
                  color: "#10B981",
                  background: "rgba(16,185,129,0.1)",
                  border: "1px solid rgba(16,185,129,0.15)",
                }}
              >
                <svg
                  className="w-3 h-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                30 segundos
              </div>

              <h1 className="text-2xl lg:text-[32px] font-extrabold text-white leading-tight tracking-[-0.02em]">
                Cree su cuenta y acceda al{" "}
                <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                  ecosistema completo
                </span>
              </h1>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                Solo necesita su nombre, email y contraseña. Nada más.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  className="rounded-xl p-3.5 cursor-default"
                  style={{
                    background: "rgba(0,191,255,0.06)",
                    border: "1px solid rgba(0,191,255,0.12)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className="w-7 h-7 rounded-lg grid place-items-center"
                      style={{ background: "rgba(0,191,255,0.12)" }}
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#00BFFF"
                        strokeWidth="1.8"
                      >
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-white">
                      ImporChat
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-400">
                    Agente AI de ventas por WhatsApp
                  </p>
                  <span
                    className="inline-block mt-2 text-[8px] px-2 py-0.5 rounded-full font-bold"
                    style={{
                      color: "#00BFFF",
                      background: "rgba(0,191,255,0.08)",
                    }}
                  >
                    7 dias gratis
                  </span>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  className="rounded-xl p-3.5 cursor-default"
                  style={{
                    background: "rgba(16,185,129,0.06)",
                    border: "1px solid rgba(16,185,129,0.12)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className="w-7 h-7 rounded-lg grid place-items-center"
                      style={{ background: "rgba(16,185,129,0.12)" }}
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="1.8"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="3" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M21 15l-5-5L5 21" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-white">
                      Insta Landing
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-400">
                    Banners y landings en segundos
                  </p>
                  <span
                    className="inline-block mt-2 text-[8px] px-2 py-0.5 rounded-full font-bold"
                    style={{
                      color: "#10B981",
                      background: "rgba(16,185,129,0.08)",
                    }}
                  >
                    10 imagenes gratis
                  </span>
                </motion.div>
              </div>

              <div className="mt-5 space-y-2">
                {[
                  { t: "Prueba gratuita sin compromiso", c: "#10B981" },
                  { t: "Primer mes a $5 en cualquier plan", c: "#00BFFF" },
                  { t: "Cancele cuando quiera desde el portal", c: "#F59E0B" },
                ].map((b, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.15 }}
                    className="flex items-center gap-2.5"
                  >
                    <svg
                      className="w-4 h-4 shrink-0"
                      viewBox="0 0 20 20"
                      fill="none"
                    >
                      <circle
                        cx="10"
                        cy="10"
                        r="10"
                        fill={b.c}
                        opacity="0.12"
                      />
                      <path
                        d="M6.5 10.5l2.5 2.5 5-5"
                        stroke={b.c}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="text-[12px] text-slate-300">{b.t}</span>
                  </motion.div>
                ))}
              </div>

              <div
                className="mt-5 flex items-center justify-between rounded-xl px-4 py-3"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <Counter
                  target="24"
                  suffix="/7"
                  label="Activo"
                  color="#00BFFF"
                />
                <Counter
                  target="120"
                  suffix="+"
                  label="Banners/mes"
                  color="#10B981"
                />
                <Counter target="10" label="Secciones" color="#8B5CF6" />
                <Counter
                  target="5"
                  suffix="$"
                  label="Primer mes"
                  color="#F59E0B"
                />
              </div>
            </div>
          </div>
        </motion.section>

        {/* FORM */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="w-full max-w-[420px] mx-auto"
        >
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="rounded-3xl p-6 sm:p-8 bg-white/70 backdrop-blur-2xl shadow-[0_8px_40px_rgba(11,20,38,0.08)] border border-white/80 ring-1 ring-slate-200/30"
          >
            {/* Nombre completo */}
            <div className="mb-3">
              <label
                htmlFor="nombre_encargado"
                className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wider"
              >
                Nombre completo
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <input
                  id="nombre_encargado"
                  type="text"
                  placeholder="Fernando Castro"
                  {...register("nombre_encargado", {
                    required: "Requerido",
                    minLength: { value: 3, message: "Mínimo 3 caracteres" },
                  })}
                  className={inputCls(errors.nombre_encargado)}
                  autoComplete="name"
                  autoFocus
                />
              </div>
              {errors.nombre_encargado && (
                <p className="text-rose-500 text-xs mt-1">
                  {errors.nombre_encargado.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="mb-3">
              <label
                htmlFor="email"
                className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wider"
              >
                Email
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22 6 12 13 2 6" />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  placeholder="nombre@empresa.com"
                  {...register("email", {
                    required: "Requerido",
                    pattern: {
                      value: /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/,
                      message: "Formato inválido",
                    },
                  })}
                  className={inputCls(errors.email)}
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <p className="text-rose-500 text-xs mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* WhatsApp — obligatorio con framing pro */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="whatsapp_lead"
                  className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider"
                >
                  WhatsApp Personal
                </label>
                <span className="text-[9px] text-emerald-600 italic font-medium">
                  Para notificar alertas de tu cuenta
                </span>
              </div>
              <div
                className={`flex items-stretch gap-1 rounded-xl border-2 transition-all bg-white pr-4 focus-within:border-emerald-600 focus-within:shadow-[0_0_0_3px_rgba(16,185,129,0.08)] ${errors.whatsapp_lead ? "border-rose-400" : "border-slate-200/80"}`}
              >
                <div className="flex items-center pl-3 border-r border-slate-100">
                  <svg
                    className="w-4 h-4 mr-1.5"
                    viewBox="0 0 24 24"
                    fill="#10B981"
                  >
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                  </svg>
                  <PaisSelect value={waPais} onChange={setWaPais} />
                </div>
                <input
                  id="whatsapp_lead"
                  type="tel"
                  placeholder="99 123 4567"
                  {...register("whatsapp_lead", {
                    required: "Necesitamos tu WhatsApp para alertas",
                    pattern: {
                      value: /^[\d\s\-()]{7,20}$/,
                      message: "Número inválido",
                    },
                    validate: (v) => {
                      const digits = (v || "").replace(/\D/g, "");
                      return digits.length >= 7 || "Mínimo 7 dígitos";
                    },
                  })}
                  className="flex-1 py-3 px-3 text-sm bg-transparent text-[#0B1426] placeholder-slate-400 outline-none"
                  autoComplete="tel"
                />
              </div>

              {errors.whatsapp_lead && (
                <p className="text-rose-500 text-xs mt-1">
                  {errors.whatsapp_lead.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="mb-3">
              <label
                htmlFor="password"
                className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wider"
              >
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </div>
                <input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  {...register("password", {
                    required: "Requerida",
                    minLength: { value: 6, message: "Mínimo 6 caracteres" },
                  })}
                  className={inputClsPwd(errors.password)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((p) => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  <EyeIcon show={showPwd} />
                </button>
              </div>
              {errors.password && (
                <p className="text-rose-500 text-xs mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirmar contraseña */}
            <div className="mb-4">
              <label
                htmlFor="password2"
                className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wider"
              >
                Confirmar contraseña
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </div>
                <input
                  id="password2"
                  type={showPwd ? "text" : "password"}
                  placeholder="••••••••"
                  {...register("password2", {
                    validate: (v) => v === watch("password") || "No coinciden",
                  })}
                  className={inputClsPwd(errors.password2)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((p) => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  <EyeIcon show={showPwd} />
                </button>
              </div>
              {errors.password2 && (
                <p className="text-rose-500 text-xs mt-1">
                  {errors.password2.message}
                </p>
              )}
            </div>

            {/* Comunidad — opcional */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  ¿Vienes de alguna comunidad?
                </label>
                <span className="text-[9px] text-slate-400 italic">
                  Opcional
                </span>
              </div>
              <ComunidadCombobox value={comunidad} onChange={setComunidad} />
            </div>

            {/* Terms */}
            <div className="mb-5">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  {...register("acepta", { required: "Debe aceptar" })}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 accent-emerald-600"
                />
                <span className="text-[10px] text-slate-500 leading-relaxed">
                  Acepto las{" "}
                  <a
                    href="/condiciones-servicio"
                    className="underline text-slate-600 hover:text-[#0B1426]"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Condiciones
                  </a>{" "}
                  y la{" "}
                  <a
                    href="/politica-privacidad"
                    className="underline text-slate-600 hover:text-[#0B1426]"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Privacidad
                  </a>
                </span>
              </label>
              {errors.acepta && (
                <p className="text-rose-500 text-xs mt-1">
                  {errors.acepta.message}
                </p>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={!acepta || isSubmitting}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 shadow-lg hover:shadow-xl"
              style={{
                background: "linear-gradient(135deg, #10B981, #059669)",
              }}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="w-4 h-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray="32"
                      strokeLinecap="round"
                    />
                  </svg>
                  Creando cuenta...
                </span>
              ) : (
                "Crear cuenta gratis"
              )}
            </motion.button>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[10px] text-slate-400 font-medium">o</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <button
              type="button"
              onClick={() => navigate("/login")}
              className="w-full py-3 rounded-xl text-sm font-semibold text-[#0B1426] bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all"
            >
              Ya tengo cuenta — Iniciar sesión
            </button>

            <div className="flex items-center justify-center gap-1.5 mt-4 text-[10px] text-slate-400">
              <svg
                className="w-3 h-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              Protegido con encriptación SSL
            </div>
          </form>
        </motion.div>
      </div>

      <footer className="absolute bottom-3 inset-x-0 text-center text-[10px] text-slate-400">
        <span>Imporfactory © {new Date().getFullYear()}</span>
        <span className="mx-2">·</span>
        <a
          href="/condiciones-servicio"
          className="hover:text-slate-600 transition"
        >
          Condiciones
        </a>
        <span className="mx-1">·</span>
        <a
          href="/politica-privacidad"
          className="hover:text-slate-600 transition"
        >
          Privacidad
        </a>
      </footer>
    </div>
  );
}
