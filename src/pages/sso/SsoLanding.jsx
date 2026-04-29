import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { newLoginThunk } from "../../store/slices/user.slice";

/**
 * Punto de entrada del SSO desde Imporsuit (PHP).
 *
 * Imporsuit redirige a /sso#token=...&tienda=...&tipo=cursos_imporsuit
 * El fragmento (#) no se envía al servidor ni queda en logs intermedios.
 * Aquí lo leemos, lo limpiamos de la URL y disparamos newLoginThunk para
 * intercambiarlo por un token de chatcenter.
 */
export default function SsoLanding() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const ranRef = useRef(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const raw = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.search.startsWith("?")
        ? window.location.search.slice(1)
        : "";

    if (!raw) {
      navigate("/login?sso_error=missing", { replace: true });
      return;
    }

    const params = new URLSearchParams(raw);
    const token = params.get("token");
    const tienda = params.get("tienda");
    const tipo = params.get("tipo") || "cursos_imporsuit";

    window.history.replaceState(null, "", window.location.pathname);

    if (!token || !tienda) {
      navigate("/login?sso_error=invalid", { replace: true });
      return;
    }

    dispatch(newLoginThunk({ token, tienda, tipo }))
      .unwrap()
      .then((data) => {
        const estado = data?.estado_creacion;
        if (estado === "nulo") {
          navigate("/planes", { replace: true });
          return;
        }
        navigate("/selector", { replace: true });
      })
      .catch((err) => {
        const msg =
          err?.message || "No se pudo iniciar sesión desde Imporsuit";
        setError(msg);
      });
  }, [dispatch, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6">
      {error ? (
        <div className="max-w-md w-full bg-white border border-rose-200 rounded-2xl p-6 text-center shadow-sm">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-rose-100 grid place-items-center text-rose-500 text-2xl">
            !
          </div>
          <h2 className="text-lg font-bold text-slate-800">
            No se pudo abrir Chatcenter
          </h2>
          <p className="text-sm text-slate-500 mt-2">{error}</p>
          <button
            onClick={() => navigate("/login", { replace: true })}
            className="mt-5 w-full py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
          >
            Ir al inicio de sesión
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">
            Conectando con Chatcenter…
          </p>
        </div>
      )}
    </div>
  );
}
