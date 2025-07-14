import { Navigate, Outlet } from "react-router-dom";

/* --- util sencillo para leer cookies --- */
const getCookie = (name) => {
  const match = document.cookie.match(
    new RegExp(
      "(?:^|; )" + name.replace(/([$?*|{}\]\\[\]\/+^])/g, "\\$1") + "=([^;]*)"
    )
  );
  return match ? decodeURIComponent(match[1]) : null;
};

const ProtectedRoutes = () => {
  let token = localStorage.getItem("token");

  /* 1️⃣  Si no hay token en localStorage, intenta con la cookie */
  if (!token || token === "undefined" || token === "") {
    const cookieToken = getCookie("chat_token");
    if (cookieToken) {
      localStorage.setItem("token", cookieToken);
      token = cookieToken;
    }
  }

  /* 2️⃣  Decide */
  return token ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoutes;
